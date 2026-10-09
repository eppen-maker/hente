"""CLI:  python -m eu_trader {check|once|run|dashboard|e2e}"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone

from .analyst import ClaudeAnalyst, ClaudeCodeAnalyst, FallbackAnalyst, RuleAnalyst
from .brokers import make_broker
from .config import Config
from .engine import Engine
from .journal import Journal
from .market_calendar import MarketCalendar, next_slot


def build(cfg: Config, need_analyst=True):
    errs = cfg.validate()
    if errs:
        sys.exit("Konfigurasjonsfeil:\n- " + "\n- ".join(errs))
    mode = {"alpaca": "ALPACA_PAPER", "ibkr": "IBKR_PAPER"}.get(cfg.broker, "LOKAL_SIMULERING")
    j = Journal(cfg.db_path, mode)
    b = make_broker(cfg, j)
    a = make_analyst(cfg, j) if need_analyst else None
    return j, b, a, MarketCalendar(cfg.calendar)


def make_analyst(cfg, j=None):
    if cfg.analyst == "rules":
        return RuleAnalyst()
    if cfg.analyst == "api":
        return ClaudeAnalyst(cfg.anthropic_key, cfg.model)
    return FallbackAnalyst(ClaudeCodeAnalyst(cfg.claude_code_model), RuleAnalyst(), j.error if j else None)


def cmd_check(cfg):
    j, b, a, cal = build(cfg, need_analyst=False)
    now = datetime.now(timezone.utc)
    print("Modus      :", j.mode)
    print("Kalender   :", cal.status_text(now))
    try:
        b.connect()
        print("Megler     :", b.label)
        print("Konto      :", b.account())
        p = b.last_price(cfg.symbols[0])
        print(f"Pris {cfg.symbols[0]:5s}:", p, f"({b.data_note})")
    except Exception as e:
        print("Megler FEIL:", repr(e))
    finally:
        b.close()
    try:
        print("Analyse    :", make_analyst(cfg).verify_model())
    except Exception as e:
        print("Analyse FEIL:", repr(e))


def cmd_once(cfg, force):
    j, b, a, cal = build(cfg)
    b.connect()
    try:
        print(json.dumps(Engine(cfg, b, a, j, cal).cycle(force=force), indent=2, ensure_ascii=False, default=str))
    finally:
        b.close()


def cmd_run(cfg):
    j, b, a, cal = build(cfg)
    print(f"Starter {j.mode}. Intervall {cfg.interval_min} min. Ctrl+C stopper.")
    connected = False
    while True:
        now = datetime.now(timezone.utc)
        try:
            if cal.is_open(now):
                if not connected:
                    b.connect()
                    connected = True
                r = Engine(cfg, b, a, j, cal).cycle(now)
                print(now.strftime("%H:%M:%S"), json.dumps(r, ensure_ascii=False, default=str)[:600])
                wake = next_slot(datetime.now(timezone.utc), cfg.interval_min)
            else:
                if connected:
                    b.close()
                    connected = False
                wake = min(cal.next_open(now).replace(second=20), next_slot(now, 60))
                print(now.strftime("%H:%M:%S"), "HOLD:", cal.status_text(now))
        except KeyboardInterrupt:
            raise
        except Exception as e:
            j.error("run", repr(e))
            print("FEIL:", repr(e))
            try:
                b.close()
            except Exception:
                pass
            connected = False
            wake = next_slot(datetime.now(timezone.utc), cfg.interval_min)
        time.sleep(max(5, (wake - datetime.now(timezone.utc)).total_seconds()))


def cmd_e2e(cfg, symbol, qty, allow_closed, analyst=None):
    """Hele kjeden: data → analyse → simulert ordre → bekreftet fylling → beholdning (kjøp, så salg tilbake)."""
    j, b, a, cal = build(cfg, need_analyst=analyst is None)
    a = analyst or a
    eng = Engine(cfg, b, a, j, cal)
    steps, now = [], datetime.now(timezone.utc)
    ok = lambda name, passed, info="": steps.append({"steg": name, "ok": bool(passed), "info": info}) or passed
    tag = now.strftime("%Y%m%d%H%M%S")
    try:
        ok("kalender", cal.is_open(now) or allow_closed, cal.status_text(now))
        if not steps[-1]["ok"]:
            raise RuntimeError("Børsen er stengt. Paper-ordre fylles bare i åpningstid.")
        b.connect()
        ok("megler/paper", True, b.label)
        price = b.last_price(symbol)
        bars = b.bars(symbol, 40)
        ok("markedsdata", price > 0 and len(bars) > 0, f"pris {price} ({b.data_note}), {len(bars)} barer")
        c = {"symbol": symbol, "last_price": price, "bars_15m": bars, "position_qty": 0, "e2e_test": True}
        d = a.decide_many({symbol: c})[symbol] if hasattr(a, "decide_many") else a.decide(c)
        ok("analyse", d["action"] in ("BUY", "SELL", "HOLD") and not d["reason"].startswith("[REGLER"), f"{d['action']} {d['confidence']:.2f}: {d['reason'][:120]}")
        before = b.positions().get(symbol, (0, 0))[0]
        r = eng.execute(symbol, "BUY", qty, price, f"ET-E2E-{tag}-{symbol}-BUY", note="e2e-test")
        ok("kjøpsordre sendt", r.get("order") not in (None, "SKIPPED_DUPLICATE"), r)
        ok("kjøp fylt og bekreftet", r.get("order") == "Filled" and r.get("confirmed_fill_qty") == qty, r)
        time.sleep(2)
        mid = b.positions().get(symbol, (0, 0))[0]
        ok("beholdning økt", abs(mid - before - qty) < 1e-9, f"{before} → {mid}")
        r2 = eng.execute(symbol, "SELL", qty, b.last_price(symbol), f"ET-E2E-{tag}-{symbol}-SELL", note="e2e-test")
        ok("salg fylt og bekreftet", r2.get("order") == "Filled" and r2.get("confirmed_fill_qty") == qty, r2)
        time.sleep(2)
        after = b.positions().get(symbol, (0, 0))[0]
        ok("beholdning tilbake", abs(after - before) < 1e-9, f"{mid} → {after}")
        eng.snapshot({symbol: price})
    except Exception as e:
        ok("avbrutt", False, repr(e))
        j.error("e2e", repr(e))
    finally:
        b.close()
    passed = all(s["ok"] for s in steps)
    rep = {"modus": j.mode, "megler": b.label, "symbol": symbol, "bestått": passed, "steg": steps}
    j.run("e2e", rep)
    print(json.dumps(rep, indent=2, ensure_ascii=False, default=str))
    return rep


def cmd_status(cfg):
    """Kort tekstoversikt i terminalen (for Claude Code / PowerShell)."""
    import sqlite3

    from .journal import realized_pnl

    if not cfg.db_path.exists():
        print("Ingen data ennå. Start boten med: python -m eu_trader run")
        return
    db = sqlite3.connect(cfg.db_path)
    db.row_factory = sqlite3.Row
    q = lambda sql, a=(): [dict(r) for r in db.execute(sql, a)]
    snap = q("SELECT * FROM snapshots ORDER BY ts DESC LIMIT 1")
    if snap:
        s = snap[0]
        first = q("SELECT net_liq FROM snapshots WHERE mode=? AND substr(ts,1,10)=? ORDER BY ts LIMIT 1", (s["mode"], s["ts"][:10]))
        realized, _ = realized_pnl(q("SELECT * FROM fills WHERE mode=? ORDER BY ts", (s["mode"],)))
        print(f"{s['mode']}  oppdatert {s['ts']}")
        print(f"Netto {s['net_liq']:,.2f} | kontanter {s['cash']:,.2f} | i dag {s['net_liq'] - first[0]['net_liq']:+,.2f} | "
              f"realisert {realized:+,.2f} | urealisert {s['unrealized']:+,.2f}")
        pos = json.loads(s["positions"])
        print("\nBeholdning:" if pos else "\nBeholdning: ingen")
        for sym, (qty, cost, px) in pos.items():
            px = px or cost
            print(f"  {sym:6} {qty:>6.0f} stk  snitt {cost:>9.2f}  kurs {px:>9.2f}  P/L {(px - cost) * qty:+10.2f}")
    print("\nSiste ordre:")
    for o in q("SELECT * FROM orders ORDER BY ts DESC LIMIT 8"):
        print(f"  {o['ts'][11:16]} {o['symbol']:6} {o['side']:4} {o['qty']:>5.0f} @ {o['limit_price']:<9} {o['status']:<10} fylt {o['filled'] or 0:.0f}")
    print("\nSiste beslutninger:")
    for d in q("SELECT * FROM decisions ORDER BY ts DESC LIMIT 6"):
        print(f"  {d['ts'][11:16]} {d['symbol']:6} {d['action']:4} {d['confidence']:.2f}  {d['reason'][:70]}")
    errs = q("SELECT * FROM errors ORDER BY ts DESC LIMIT 3")
    if errs:
        print("\nSiste feil:")
        for e in errs:
            print(f"  {e['ts'][11:16]} {e['where_']}: {e['message'][:90]}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="eu_trader")
    sp = p.add_subparsers(dest="cmd", required=True)
    sp.add_parser("check")
    o = sp.add_parser("once")
    o.add_argument("--force", action="store_true", help="kjør selv om børsen er stengt (analyse; IBKR fyller ikke)")
    sp.add_parser("run")
    sp.add_parser("dashboard")
    sp.add_parser("status")
    e = sp.add_parser("e2e")
    e.add_argument("--symbol", default=None)
    e.add_argument("--qty", type=int, default=1)
    e.add_argument("--allow-closed", action="store_true", help="kun lokal simulering")
    args = p.parse_args(argv)
    cfg = Config()
    if args.cmd == "check":
        cmd_check(cfg)
    elif args.cmd == "once":
        cmd_once(cfg, args.force)
    elif args.cmd == "run":
        cmd_run(cfg)
    elif args.cmd == "dashboard":
        from .dashboard import serve

        Journal(cfg.db_path, "init")
        serve(cfg.db_path, cfg.dashboard_port)
    elif args.cmd == "status":
        cmd_status(cfg)
    elif args.cmd == "e2e":
        if args.allow_closed and cfg.broker != "localsim":
            sys.exit("--allow-closed er kun for lokal simulering.")
        cmd_e2e(cfg, args.symbol or cfg.symbols[0], args.qty, args.allow_closed)


if __name__ == "__main__":
    main()
