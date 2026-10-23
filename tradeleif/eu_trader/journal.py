"""SQLite-journal: beslutninger, ordre, fyllinger, feil, snapshots. Grunnlag for dashboard og dedup."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS decisions(id INTEGER PRIMARY KEY, ts TEXT, mode TEXT, symbol TEXT, action TEXT,
  confidence REAL, price REAL, reason TEXT, risk_result TEXT, raw TEXT);
CREATE TABLE IF NOT EXISTS orders(ref TEXT PRIMARY KEY, ts TEXT, mode TEXT, symbol TEXT, side TEXT, qty REAL,
  limit_price REAL, broker_id TEXT, status TEXT, filled REAL DEFAULT 0, avg_price REAL, updated TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS fills(exec_id TEXT PRIMARY KEY, ts TEXT, mode TEXT, ref TEXT, symbol TEXT, side TEXT,
  qty REAL, price REAL, commission REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS errors(id INTEGER PRIMARY KEY, ts TEXT, mode TEXT, where_ TEXT, message TEXT);
CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY, ts TEXT, mode TEXT, net_liq REAL, cash REAL,
  positions TEXT, realized REAL, unrealized REAL);
CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY, ts TEXT, mode TEXT, kind TEXT, result TEXT);
"""

FINAL = {"Filled", "Cancelled", "ApiCancelled", "Inactive", "Rejected"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Journal:
    def __init__(self, path: Path, mode: str):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, timeout=30)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self.mode = mode  # "IBKR_PAPER" | "LOKAL_SIMULERING"

    def _x(self, sql, args=()):
        cur = self.db.execute(sql, args)
        self.db.commit()
        return cur

    # --- skriving
    def decision(self, symbol, action, confidence, price, reason, risk_result, raw):
        self._x("INSERT INTO decisions(ts,mode,symbol,action,confidence,price,reason,risk_result,raw) VALUES(?,?,?,?,?,?,?,?,?)",
                (now_iso(), self.mode, symbol, action, confidence, price, reason, risk_result, json.dumps(raw)[:4000]))

    def order_new(self, ref, symbol, side, qty, limit_price, note=""):
        """Returnerer False hvis ref finnes (dobbeltordre-vern på DB-nivå)."""
        try:
            self._x("INSERT INTO orders(ref,ts,mode,symbol,side,qty,limit_price,status,updated,note) VALUES(?,?,?,?,?,?,?,?,?,?)",
                    (ref, now_iso(), self.mode, symbol, side, qty, limit_price, "PendingSubmit", now_iso(), note))
            return True
        except sqlite3.IntegrityError:
            return False

    def order_update(self, ref, status, filled=None, avg_price=None, broker_id=None):
        self._x("UPDATE orders SET status=?, filled=COALESCE(?,filled), avg_price=COALESCE(?,avg_price), "
                "broker_id=COALESCE(?,broker_id), updated=? WHERE ref=?",
                (status, filled, avg_price, broker_id, now_iso(), ref))

    def fill(self, exec_id, ref, symbol, side, qty, price, ts=None, commission=0.0):
        self._x("INSERT INTO fills(exec_id,ts,mode,ref,symbol,side,qty,price,commission) VALUES(?,?,?,?,?,?,?,?,?) "
                "ON CONFLICT(exec_id) DO UPDATE SET qty=excluded.qty, price=excluded.price, ts=excluded.ts",
                (exec_id, ts or now_iso(), self.mode, ref, symbol, side, qty, price, commission))

    def error(self, where, message):
        self._x("INSERT INTO errors(ts,mode,where_,message) VALUES(?,?,?,?)", (now_iso(), self.mode, where, str(message)[:2000]))

    def snapshot(self, net_liq, cash, positions, realized, unrealized):
        self._x("INSERT INTO snapshots(ts,mode,net_liq,cash,positions,realized,unrealized) VALUES(?,?,?,?,?,?,?)",
                (now_iso(), self.mode, net_liq, cash, json.dumps(positions), realized, unrealized))

    def run(self, kind, result):
        self._x("INSERT INTO runs(ts,mode,kind,result) VALUES(?,?,?,?)", (now_iso(), self.mode, kind, json.dumps(result)[:4000]))

    # --- lesing
    def order(self, ref):
        r = self.db.execute("SELECT * FROM orders WHERE ref=?", (ref,)).fetchone()
        return dict(r) if r else None

    def open_orders(self):
        q = f"SELECT * FROM orders WHERE mode=? AND status NOT IN ({','.join('?' * len(FINAL))})"
        return [dict(r) for r in self.db.execute(q, (self.mode, *FINAL))]

    def orders_today(self, day: str, symbol: str | None = None):
        q = "SELECT * FROM orders WHERE mode=? AND substr(ts,1,10)=?"
        a = [self.mode, day]
        if symbol:
            q += " AND symbol=?"
            a.append(symbol)
        return [dict(r) for r in self.db.execute(q, a)]

    def last_order_ts(self, symbol):
        r = self.db.execute("SELECT max(ts) t FROM orders WHERE mode=? AND symbol=? AND status!='Rejected'",
                            (self.mode, symbol)).fetchone()
        return r["t"] if r else None

    def fills_all(self):
        return [dict(r) for r in self.db.execute("SELECT * FROM fills WHERE mode=? ORDER BY ts", (self.mode,))]

    def first_snapshot_of_day(self, day):
        r = self.db.execute("SELECT * FROM snapshots WHERE mode=? AND substr(ts,1,10)=? ORDER BY ts LIMIT 1",
                            (self.mode, day)).fetchone()
        return dict(r) if r else None

    def recent(self, table, limit=50):
        order = "ts DESC"
        return [dict(r) for r in self.db.execute(f"SELECT * FROM {table} ORDER BY {order} LIMIT ?", (limit,))]


def realized_pnl(fills: list[dict]) -> tuple[float, dict]:
    """Gjennomsnittskost-metode. Returnerer (realisert, {symbol: (qty, avg_cost)})."""
    book: dict[str, list[float]] = {}
    realized = 0.0
    for f in fills:
        q, c = book.get(f["symbol"], [0.0, 0.0])
        if f["side"] == "BUY":
            c = (q * c + f["qty"] * f["price"]) / (q + f["qty"]) if q + f["qty"] else 0.0
            q += f["qty"]
        else:
            realized += (f["price"] - c) * f["qty"]
            q -= f["qty"]
        realized -= f.get("commission") or 0.0
        book[f["symbol"]] = [q, c]
    return realized, {k: tuple(v) for k, v in book.items() if abs(v[0]) > 1e-9}
