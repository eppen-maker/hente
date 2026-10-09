"""Megler-adaptere: IBKR paper (TWS/IB Gateway) og tydelig merket LOKAL SIMULERING."""
from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from .config import PAPER_PORTS, Config


@dataclass
class OrderResult:
    broker_id: str
    status: str
    filled: float
    avg_price: float | None


@dataclass
class Exec:
    exec_id: str
    ref: str
    symbol: str
    side: str  # BUY/SELL
    qty: float
    price: float
    ts: str
    commission: float = 0.0


class PaperOnlyError(RuntimeError):
    pass


class Broker:
    mode = "?"
    label = "?"
    data_note = ""

    def connect(self): ...
    def close(self): ...
    def bars(self, symbol: str, n: int = 40) -> list[dict]: raise NotImplementedError
    def last_price(self, symbol: str) -> float: raise NotImplementedError
    def positions(self) -> dict[str, tuple[float, float]]: raise NotImplementedError
    def account(self) -> dict: raise NotImplementedError
    def open_order_symbols(self) -> dict[str, list[str]]: raise NotImplementedError
    def place_limit(self, symbol, side, qty, limit, ref) -> str: raise NotImplementedError
    def wait(self, broker_id: str, timeout_s: int) -> OrderResult: raise NotImplementedError
    def cancel(self, broker_id: str): raise NotImplementedError
    def executions(self) -> list[Exec]: raise NotImplementedError
    def round_price(self, symbol, price) -> float: return round(price, 2)


# ---------------------------------------------------------------- IBKR
class IBKRBroker(Broker):
    mode = "IBKR_PAPER"

    def __init__(self, cfg: Config):
        if cfg.ib_port not in PAPER_PORTS:
            raise PaperOnlyError(f"Port {cfg.ib_port} er ikke paper. Avbryter.")
        self.cfg = cfg
        self.ib = None
        self.account_id = ""
        self._contracts = {}
        self._rules = {}
        self._trades = {}
        self.data_note = "ukjent"

    def connect(self):
        from ib_async import IB

        self.ib = IB()
        self.ib.connect(self.cfg.ib_host, self.cfg.ib_port, clientId=self.cfg.ib_client_id, timeout=20)
        accts = self.ib.managedAccounts()
        if not accts or any(not a.upper().startswith("DU") for a in accts):
            self.ib.disconnect()
            raise PaperOnlyError(f"Tilkoblet konto(er) {accts} er ikke paper (DU...). Avbryter, ingen ordre sendt.")
        self.account_id = self.cfg.ib_account or accts[0]
        if self.account_id not in accts:
            raise PaperOnlyError(f"IB_ACCOUNT {self.account_id} finnes ikke i {accts}.")
        self.ib.reqMarketDataType(3)  # sanntid hvis abonnement, ellers forsinket (15–20 min)
        self.label = f"IBKR PAPER {self.account_id}"

    def close(self):
        if self.ib and self.ib.isConnected():
            self.ib.disconnect()

    def contract(self, symbol):
        if symbol not in self._contracts:
            from ib_async import Stock

            c = Stock(symbol, "SMART", self.cfg.currency, primaryExchange=self.cfg.ib_primary_exchange)
            q = self.ib.qualifyContracts(c)
            if not q:
                raise ValueError(f"Fant ikke kontrakt {symbol} på {self.cfg.ib_primary_exchange}/{self.cfg.currency}")
            self._contracts[symbol] = q[0]
        return self._contracts[symbol]

    def bars(self, symbol, n=40):
        bars = self.ib.reqHistoricalData(self.contract(symbol), endDateTime="", durationStr="3 D",
                                         barSizeSetting="15 mins", whatToShow="TRADES", useRTH=True, formatDate=2)
        return [{"t": str(b.date), "o": b.open, "h": b.high, "l": b.low, "c": b.close, "v": float(b.volume)} for b in bars][-n:]

    def last_price(self, symbol):
        t = self.ib.reqMktData(self.contract(symbol), "", False, False)
        for _ in range(8):
            self.ib.sleep(0.5)
            p = t.last if _ok(t.last) else t.marketPrice()
            if _ok(p):
                break
        self.ib.cancelMktData(self.contract(symbol))
        self.data_note = {1: "sanntid", 2: "frosset", 3: "forsinket 15–20 min", 4: "forsinket frosset"}.get(t.marketDataType, "?")
        if _ok(p):
            return float(p)
        b = self.bars(symbol, 1)
        if not b:
            raise ValueError(f"Ingen pris for {symbol}")
        self.data_note = "siste 15-min bar"
        return float(b[-1]["c"])

    def round_price(self, symbol, price):
        c = self.contract(symbol)
        inc = 0.01
        try:
            if symbol not in self._rules:
                d = self.ib.reqContractDetails(c)[0]
                rid = int(str(d.marketRuleIds).split(",")[0])
                self._rules[symbol] = sorted(self.ib.reqMarketRule(rid), key=lambda r: r.lowEdge)
            for r in self._rules[symbol]:
                if price >= r.lowEdge:
                    inc = r.increment
        except Exception:
            pass
        return round(round(price / inc) * inc, 6)

    def positions(self):
        return {p.contract.symbol: (float(p.position), float(p.avgCost))
                for p in self.ib.positions(self.account_id) if p.position}

    def account(self):
        vals = {v.tag: v for v in self.ib.accountSummary(self.account_id)}
        g = lambda k: float(vals[k].value) if k in vals else math.nan
        return {"net_liq": g("NetLiquidation"), "cash": g("TotalCashValue"),
                "currency": vals["NetLiquidation"].currency if "NetLiquidation" in vals else "?"}

    def open_order_symbols(self):
        out = {}
        for t in self.ib.openTrades():
            out.setdefault(t.contract.symbol, []).append(t.order.orderRef)
        return out

    def place_limit(self, symbol, side, qty, limit, ref):
        from ib_async import LimitOrder

        o = LimitOrder(side, qty, limit, orderRef=ref, tif="DAY", account=self.account_id, outsideRth=False)
        tr = self.ib.placeOrder(self.contract(symbol), o)
        bid = str(tr.order.orderId)
        self._trades[bid] = tr
        return bid

    def wait(self, broker_id, timeout_s):
        tr = self._trades[broker_id]
        end = time.time() + timeout_s
        while time.time() < end and not tr.isDone():
            self.ib.sleep(1)
        s = tr.orderStatus
        return OrderResult(broker_id, s.status, float(s.filled), float(s.avgFillPrice) if s.filled else None)

    def cancel(self, broker_id):
        tr = self._trades.get(broker_id)
        if tr and not tr.isDone():
            self.ib.cancelOrder(tr.order)
            self.ib.sleep(2)

    def executions(self):
        out = []
        for f in self.ib.reqExecutions():
            e = f.execution
            out.append(Exec(e.execId, e.orderRef or "", f.contract.symbol, "BUY" if e.side == "BOT" else "SELL",
                            float(e.shares), float(e.price), e.time.astimezone(timezone.utc).isoformat(timespec="seconds"),
                            float(getattr(f.commissionReport, "commission", 0) or 0)))
        return out


def _ok(x):
    return x is not None and not (isinstance(x, float) and math.isnan(x)) and x > 0


# ---------------------------------------------------------------- LOKAL SIMULERING
class LocalSimBroker(Broker):
    """LOKAL SIMULERING. Ingen megler er involvert. Vises IKKE på Alpaca eller IBKR."""
    mode = "LOKAL_SIMULERING"
    label = "LOKAL SIMULERING (ikke megler)"

    def __init__(self, cfg: Config, journal, price_source=None):
        self.cfg = cfg
        self.j = journal
        self.src = price_source or YahooPrices(cfg.yahoo_suffix)
        self.data_note = "Yahoo, forsinket"
        self.j.db.executescript("CREATE TABLE IF NOT EXISTS sim_state(k TEXT PRIMARY KEY, v TEXT);")
        if self._get("cash") is None:
            self._set("cash", cfg.sim_start_cash)
            self._set("pos", {})
            self._set("seq", 0)
            self._set("execs", [])

    def _get(self, k):
        r = self.j.db.execute("SELECT v FROM sim_state WHERE k=?", (k,)).fetchone()
        return json.loads(r[0]) if r else None

    def _set(self, k, v):
        self.j.db.execute("INSERT OR REPLACE INTO sim_state(k,v) VALUES(?,?)", (k, json.dumps(v)))
        self.j.db.commit()

    def bars(self, symbol, n=40):
        return self.src.bars(symbol)[-n:]

    def last_price(self, symbol):
        return float(self.src.last(symbol))

    def positions(self):
        return {k: tuple(v) for k, v in self._get("pos").items() if v[0]}

    def account(self):
        pos = self.positions()
        mv = sum(q * self.last_price(s) for s, (q, _) in pos.items())
        cash = self._get("cash")
        return {"net_liq": cash + mv, "cash": cash, "currency": self.cfg.currency}

    def open_order_symbols(self):
        return {}  # simulator fyller eller avviser umiddelbart

    def place_limit(self, symbol, side, qty, limit, ref):
        seq = self._get("seq") + 1
        self._set("seq", seq)
        px = self.last_price(symbol)
        pos, cash = self._get("pos"), self._get("cash")
        q, c = pos.get(symbol, [0.0, 0.0])
        status = "Rejected"
        if side == "BUY" and limit >= px and cash >= qty * px:
            pos[symbol] = [q + qty, (q * c + qty * px) / (q + qty)]
            cash -= qty * px
            status = "Filled"
        elif side == "SELL" and limit <= px and q >= qty:
            pos[symbol] = [q - qty, c]
            cash += qty * px
            status = "Filled"
        if status == "Filled":
            self._set("pos", pos)
            self._set("cash", cash)
            ex = self._get("execs")
            ex.append([f"SIM-{seq}", ref, symbol, side, qty, px, datetime.now(timezone.utc).isoformat(timespec="seconds")])
            self._set("execs", ex)
        self._set(f"order-{seq}", [status, qty if status == "Filled" else 0, px if status == "Filled" else None])
        return f"SIM-{seq}"

    def wait(self, broker_id, timeout_s):
        st, f, p = self._get(f"order-{broker_id.split('-')[1]}")
        return OrderResult(broker_id, st, f, p)

    def cancel(self, broker_id):
        pass

    def executions(self):
        return [Exec(*e) for e in self._get("execs")]


# ---------------------------------------------------------------- ALPACA PAPER (ren REST, ingen pandas/DLL)
_ALPACA_STATUS = {"filled": "Filled", "canceled": "Cancelled", "expired": "Cancelled", "rejected": "Rejected",
                  "done_for_day": "Cancelled", "partially_filled": "PartiallyFilled"}
ALPACA_PAPER_URL = "https://paper-api.alpaca.markets"  # hardkodet: live-URL brukes aldri
ALPACA_DATA_URL = "https://data.alpaca.markets"


def http_json(method, url, headers, body=None, timeout=20):
    import urllib.error
    import urllib.request

    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={**headers, "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {method} {url.split('?')[0]}: {e.read().decode(errors='replace')[:300]}") from None


class AlpacaBroker(Broker):
    """Alpaca PAPER (US-børser). Kun paper-URL + krav om kontonummer PA..."""
    mode = "ALPACA_PAPER"

    def __init__(self, cfg: Config, http=None):
        self.cfg = cfg
        self.http = http or http_json
        self.h = {"APCA-API-KEY-ID": cfg.alpaca_key, "APCA-API-SECRET-KEY": cfg.alpaca_secret}
        self.data_note = f"Alpaca {cfg.alpaca_feed.upper()}"
        self.label = "ALPACA PAPER"

    def _t(self, method, path, body=None):
        return self.http(method, ALPACA_PAPER_URL + path, self.h, body)

    def _d(self, path):
        return self.http("GET", ALPACA_DATA_URL + path, self.h)

    def connect(self):
        num = str(self._t("GET", "/v2/account")["account_number"])
        if not num.upper().startswith("PA"):
            raise PaperOnlyError(f"Alpaca-konto {num} ser ikke ut som paper (PA...). Avbryter.")
        self.label = f"ALPACA PAPER {num}"

    def market_open(self):
        return bool(self._t("GET", "/v2/clock")["is_open"])

    def bars(self, symbol, n=40):
        from datetime import timedelta
        from urllib.parse import quote

        start = (datetime.now(timezone.utc) - timedelta(days=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
        r = self._d(f"/v2/stocks/{quote(symbol)}/bars?timeframe=15Min&start={start}&limit=1000&feed={self.cfg.alpaca_feed}")
        rows = r.get("bars") or []
        return [{"t": b["t"], "o": b["o"], "h": b["h"], "l": b["l"], "c": b["c"], "v": float(b["v"])} for b in rows][-n:]

    def daily_bars(self, symbol, n=30):
        from datetime import timedelta
        from urllib.parse import quote

        start = (datetime.now(timezone.utc) - timedelta(days=n * 2)).strftime("%Y-%m-%d")
        r = self._d(f"/v2/stocks/{quote(symbol)}/bars?timeframe=1Day&start={start}&limit=1000&adjustment=all&feed={self.cfg.alpaca_feed}")
        return [{"d": b["t"][:10], "c": b["c"], "v": float(b["v"])} for b in (r.get("bars") or [])][-n:]

    def news(self, symbol, n=8):
        from datetime import timedelta
        from urllib.parse import quote

        start = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
        r = self._d(f"/v1beta1/news?symbols={quote(symbol)}&start={start}&limit={n}&sort=desc")
        return [{"t": a.get("created_at"), "headline": a.get("headline"), "summary": (a.get("summary") or "")[:300]}
                for a in (r.get("news") or [])]

    def last_price(self, symbol):
        from urllib.parse import quote

        r = self._d(f"/v2/stocks/{quote(symbol)}/trades/latest?feed={self.cfg.alpaca_feed}")
        return float(r["trade"]["p"])

    def round_price(self, symbol, price):
        return round(price, 2 if price >= 1 else 4)

    def positions(self):
        return {p["symbol"]: (float(p["qty"]), float(p["avg_entry_price"])) for p in self._t("GET", "/v2/positions") if float(p["qty"])}

    def account(self):
        a = self._t("GET", "/v2/account")
        return {"net_liq": float(a["equity"]), "cash": float(a["cash"]), "currency": a.get("currency", "USD")}

    def _orders(self, status):
        after = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")
        return self._t("GET", f"/v2/orders?status={status}&after={after}&limit=500&direction=asc")

    def open_order_symbols(self):
        out = {}
        for o in self._orders("open"):
            out.setdefault(o["symbol"], []).append(o["client_order_id"])
        return out

    def place_limit(self, symbol, side, qty, limit, ref):
        o = self._t("POST", "/v2/orders", {"symbol": symbol, "qty": str(qty), "side": side.lower(), "type": "limit",
                                           "time_in_force": "day", "limit_price": str(limit), "client_order_id": ref[:48]})
        return str(o["id"])

    def _status(self, broker_id):
        o = self._t("GET", f"/v2/orders/{broker_id}")
        filled = float(o.get("filled_qty") or 0)
        avg = o.get("filled_avg_price")
        return OrderResult(broker_id, _ALPACA_STATUS.get(o["status"], "Submitted"), filled, float(avg) if avg else None)

    def wait(self, broker_id, timeout_s):
        end = time.time() + timeout_s
        r = self._status(broker_id)
        while time.time() < end and r.status not in ("Filled", "Cancelled", "Rejected"):
            time.sleep(1)
            r = self._status(broker_id)
        return r

    def cancel(self, broker_id):
        try:
            self._t("DELETE", f"/v2/orders/{broker_id}")
            time.sleep(2)
        except Exception:
            pass

    def executions(self):
        """Én samlet fylling per ordre (filled_qty + filled_avg_price), oppdateres ved delfylling."""
        out = []
        for o in self._orders("closed") + self._orders("open"):
            q = float(o.get("filled_qty") or 0)
            if q > 0 and o.get("filled_avg_price"):
                ts = o.get("filled_at") or o.get("updated_at") or datetime.now(timezone.utc).isoformat()
                out.append(Exec(str(o["id"]), o.get("client_order_id") or "", o["symbol"], o["side"].upper(), q,
                                float(o["filled_avg_price"]), str(ts)[:19] + "+00:00"))
        return out


class YahooPrices:
    """Prisdata for lokal simulering (yfinance, forsinket). Ikke brukt mot IBKR."""

    def __init__(self, suffix):
        self.suffix = suffix

    def bars(self, symbol):
        import yfinance as yf

        df = yf.Ticker(symbol + self.suffix).history(period="5d", interval="15m")
        return [{"t": str(i), "o": r.Open, "h": r.High, "l": r.Low, "c": r.Close, "v": float(r.Volume)} for i, r in df.iterrows()]

    def last(self, symbol):
        b = self.bars(symbol)
        if not b:
            raise ValueError(f"Ingen Yahoo-data for {symbol}{self.suffix}")
        return b[-1]["c"]


def make_broker(cfg: Config, journal) -> Broker:
    if cfg.broker == "alpaca":
        return AlpacaBroker(cfg)
    if cfg.broker == "ibkr":
        return IBKRBroker(cfg)
    return LocalSimBroker(cfg, journal)
