"""Én syklus: avstem → data → Claude → risiko → dedup → ordre → fyllkontroll → snapshot."""
from __future__ import annotations

from datetime import datetime, timezone

from . import risk
from .brokers import Broker
from .config import Config
from .journal import FINAL, Journal, realized_pnl
from .market_calendar import MarketCalendar, slot_id


class Engine:
    def __init__(self, cfg: Config, broker: Broker, analyst, journal: Journal, cal: MarketCalendar):
        self.cfg, self.b, self.a, self.j, self.cal = cfg, broker, analyst, journal, cal

    # ---------- avstemming mot megler (fyllinger og ordrestatus)
    def reconcile(self):
        for e in self.b.executions():
            if e.ref.startswith("ET-"):
                self.j.fill(e.exec_id, e.ref, e.symbol, e.side, e.qty, e.price, e.ts, e.commission)
        fills = self.j.fills_all()
        open_refs = {r for refs in self.b.open_order_symbols().values() for r in refs}
        for o in self.j.open_orders():
            got = sum(f["qty"] for f in fills if f["ref"] == o["ref"])
            if got >= o["qty"] - 1e-9:
                self.j.order_update(o["ref"], "Filled", got)
            elif o["ref"] not in open_refs and (o["status"] != "PendingSubmit" or
                                                (datetime.now(timezone.utc) - datetime.fromisoformat(o["ts"])).total_seconds() > 120):
                self.j.order_update(o["ref"], "Cancelled" if got == 0 else "PartiallyFilledCancelled", got)

    def pnl(self, prices: dict[str, float]):
        realized, book = realized_pnl(self.j.fills_all())
        unreal = sum((prices.get(s, c) - c) * q for s, (q, c) in book.items())
        return realized, unreal

    def snapshot(self, prices):
        acct = self.b.account()
        pos = self.b.positions()
        realized, unreal = self.pnl(prices)
        self.j.snapshot(acct["net_liq"], acct["cash"], {s: [q, c, prices.get(s)] for s, (q, c) in pos.items()}, realized, unreal)
        return acct, pos

    # ---------- hovedsyklus
    def cycle(self, now: datetime | None = None, force: bool = False) -> dict:
        now = now or datetime.now(timezone.utc)
        open_ = self.cal.is_open(now)
        if open_ and hasattr(self.b, "market_open"):
            try:
                open_ = self.b.market_open()  # fanger ekstraordinære stengninger
            except Exception as e:
                self.j.error("clock", repr(e))
        if not force and not open_:
            msg = f"HOLD: {self.cal.status_text(now)}"
            self.j.run("cycle", {"result": msg})
            return {"status": "closed", "message": msg}
        day = now.strftime("%Y-%m-%d")
        slot = slot_id(now, self.cfg.interval_min)
        self.reconcile()
        acct = self.b.account()
        positions = self.b.positions()
        broker_open = self.b.open_order_symbols()
        first = self.j.first_snapshot_of_day(day)
        day_pnl = acct["net_liq"] - first["net_liq"] if first else 0.0
        prices, out, ctxs = {}, [], {}
        # 1) data for alle aksjer
        for sym in self.cfg.symbols:
            try:
                price = self.b.last_price(sym)
                prices[sym] = price
                ctxs[sym] = {
                    "symbol": sym, "exchange": self.cfg.calendar, "currency": self.cfg.currency, "time_utc": now.isoformat(),
                    "minutes_to_close": round(self.cal.minutes_to_close(now)), "data": self.b.data_note,
                    "last_price": price, "bars_15m": self.b.bars(sym, 40), "position_qty": positions.get(sym, (0, 0))[0],
                    "avg_cost": positions.get(sym, (0, 0))[1], "day_pnl": round(day_pnl, 2),
                    "limits": {"max_order_value": self.cfg.max_order_value, "max_position_value": self.cfg.max_position_value},
                }
                for key, fn in (("daily_bars_30d", "daily_bars"), ("news_3d", "news")):
                    if hasattr(self.b, fn):
                        try:
                            ctxs[sym][key] = getattr(self.b, fn)(sym)
                        except Exception as e:
                            self.j.error(f"{fn}:{sym}", repr(e))
            except Exception as e:
                self.j.error(f"data:{sym}", repr(e))
                out.append({"symbol": sym, "error": repr(e)})
        # 2) analyse: ett samlet kall hvis analytikeren støtter det
        try:
            if hasattr(self.a, "decide_many"):
                decisions = self.a.decide_many(ctxs)
            else:
                decisions = {s: self.a.decide(c) for s, c in ctxs.items()}
        except Exception as e:
            self.j.error("analyse", repr(e))
            decisions = {}
        # 3) risiko + ordre
        for sym, ctx in ctxs.items():
            try:
                price = prices[sym]
                d = decisions.get(sym) or {"action": "HOLD", "size_fraction": 0, "confidence": 0, "reason": "ingen analyse", "raw": ""}
                qty_held = positions.get(sym, (0, 0))[0]
                exposure = sum(abs(q) * prices.get(s, c) for s, (q, c) in positions.items())
                last = self.j.last_order_ts(sym)
                mins = (now - datetime.fromisoformat(last)).total_seconds() / 60 if last else None
                rs = risk.RiskState(now, self.cal.minutes_to_close(now), price, qty_held, exposure, acct["cash"],
                                    len(self.j.orders_today(day, sym)), len(self.j.orders_today(day)), mins, day_pnl,
                                    bool(broker_open.get(sym)) or any(o["symbol"] == sym for o in self.j.open_orders()))
                qty, why = risk.check(self.cfg, d, rs)
                self.j.decision(sym, d["action"], d["confidence"], price, d["reason"], f"{qty} ({why})", d)
                res = {"symbol": sym, "action": d["action"], "qty": qty, "risk": why, "kilde": d.get("source", "")}
                if qty > 0:
                    res.update(self.execute(sym, d["action"], qty, price, f"ET-{slot}-{sym}-{d['action']}"))
                    positions, acct = self.b.positions(), self.b.account()  # oppdater eksponering etter handel
                out.append(res)
            except Exception as e:  # én aksje skal ikke stoppe resten
                self.j.error(f"cycle:{sym}", repr(e))
                out.append({"symbol": sym, "error": repr(e)})
        self.reconcile()
        self.snapshot(prices)
        self.j.run("cycle", out)
        return {"status": "ran", "slot": slot, "results": out}

    def execute(self, sym, side, qty, price, ref, note=""):
        """Plasser marketable limit-ordre med unik ref, vent på fylling, verifiser mot eksekveringer."""
        if self.j.order(ref):
            return {"order": "SKIPPED_DUPLICATE", "ref": ref}
        lim = price * (1 + self.cfg.limit_slippage) if side == "BUY" else price * (1 - self.cfg.limit_slippage)
        lim = self.b.round_price(sym, lim)
        if not self.j.order_new(ref, sym, side, qty, lim, note):
            return {"order": "SKIPPED_DUPLICATE", "ref": ref}
        try:
            bid = self.b.place_limit(sym, side, qty, lim, ref)
            self.j.order_update(ref, "Submitted", broker_id=bid)
            r = self.b.wait(bid, self.cfg.fill_timeout_s)
            if r.status not in FINAL:
                self.b.cancel(bid)
                r = self.b.wait(bid, 10)
            self.j.order_update(ref, r.status, r.filled, r.avg_price)
            self.reconcile()
            confirmed = sum(f["qty"] for f in self.j.fills_all() if f["ref"] == ref)
            return {"order": r.status, "ref": ref, "filled": r.filled, "avg_price": r.avg_price,
                    "confirmed_fill_qty": confirmed, "limit": lim}
        except Exception as e:
            self.j.order_update(ref, "Error")
            self.j.error(f"execute:{ref}", repr(e))
            raise
