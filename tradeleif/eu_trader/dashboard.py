"""Lokalt dashboard (kun 127.0.0.1): beholdning, ordre, fyllinger, beslutninger, gevinst/tap, feil."""
from __future__ import annotations

import html
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .journal import realized_pnl

CSS = """body{font:14px system-ui;margin:16px;background:#fafafa;color:#222}h1{font-size:20px}h2{font-size:16px;margin-top:24px}
table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left}
.banner{padding:8px 12px;font-weight:700;border-radius:6px}.sim{background:#ffe08a}.ibkr{background:#bfe3ff}
.pos{color:#0a7d2c}.neg{color:#b00020}.kpi{display:inline-block;margin-right:24px}"""


def _table(rows, cols):
    if not rows:
        return "<p><i>ingen</i></p>"
    h = "".join(f"<th>{c}</th>" for c in cols)
    b = "".join("<tr>" + "".join(f"<td>{html.escape(str(r.get(c, '')))}</td>" for c in cols) + "</tr>" for r in rows)
    return f"<table><tr>{h}</tr>{b}</table>"


def render(db_path) -> str:
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    q = lambda s, a=(): [dict(r) for r in db.execute(s, a)]
    snap = q("SELECT * FROM snapshots ORDER BY ts DESC LIMIT 1")
    mode = snap[0]["mode"] if snap else (q("SELECT mode FROM runs ORDER BY ts DESC LIMIT 1") or [{"mode": "?"}])[0]["mode"]
    banner = ("<div class='banner sim'>LOKAL SIMULERING – ikke megler, vises ikke hos Alpaca/IBKR</div>"
              if mode == "LOKAL_SIMULERING" else f"<div class='banner ibkr'>{html.escape(mode)} – simulerte penger</div>")
    fills = q("SELECT * FROM fills WHERE mode=? ORDER BY ts", (mode,))
    realized, _ = realized_pnl(fills)
    kpi = ""
    pos_rows = []
    if snap:
        s = snap[0]
        first = q("SELECT net_liq FROM snapshots WHERE mode=? AND substr(ts,1,10)=? ORDER BY ts LIMIT 1", (mode, s["ts"][:10]))
        day = s["net_liq"] - first[0]["net_liq"] if first else 0
        cls = lambda v: "pos" if v >= 0 else "neg"
        kpi = (f"<div class='kpi'>Netto verdi: <b>{s['net_liq']:,.2f}</b></div><div class='kpi'>Kontanter: {s['cash']:,.2f}</div>"
               f"<div class='kpi'>I dag: <b class='{cls(day)}'>{day:+,.2f}</b></div>"
               f"<div class='kpi'>Realisert (bot): <b class='{cls(realized)}'>{realized:+,.2f}</b></div>"
               f"<div class='kpi'>Urealisert: <b class='{cls(s['unrealized'])}'>{s['unrealized']:+,.2f}</b></div>"
               f"<div class='kpi'>Oppdatert: {s['ts']}</div>")
        for sym, (qty, cost, px) in json.loads(s["positions"]).items():
            px = px or cost
            pos_rows.append({"symbol": sym, "antall": qty, "snittkost": round(cost, 2), "pris": round(px, 2),
                             "verdi": round(qty * px, 2), "urealisert": round((px - cost) * qty, 2)})
    body = (f"<h1>EU Trader</h1>{banner}<p>{kpi}</p>"
            f"<h2>Beholdning</h2>{_table(pos_rows, ['symbol','antall','snittkost','pris','verdi','urealisert'])}"
            f"<h2>Ordre</h2>{_table(q('SELECT * FROM orders WHERE mode=? ORDER BY ts DESC LIMIT 50',(mode,)), ['ts','symbol','side','qty','limit_price','status','filled','avg_price','ref'])}"
            f"<h2>Fyllinger</h2>{_table(fills[::-1][:50], ['ts','symbol','side','qty','price','commission','exec_id'])}"
            f"<h2>Beslutninger</h2>{_table(q('SELECT * FROM decisions WHERE mode=? ORDER BY ts DESC LIMIT 60',(mode,)), ['ts','symbol','action','confidence','price','risk_result','reason'])}"
            f"<h2>Feil</h2>{_table(q('SELECT * FROM errors ORDER BY ts DESC LIMIT 30'), ['ts','mode','where_','message'])}"
            f"<h2>Kjøringer</h2>{_table(q('SELECT * FROM runs ORDER BY ts DESC LIMIT 20'), ['ts','mode','kind','result'])}")
    return f"<!doctype html><meta charset=utf-8><meta http-equiv=refresh content=30><title>EU Trader</title><style>{CSS}</style>{body}"


def serve(db_path, port):
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            try:
                data = render(db_path).encode()
                self.send_response(200)
            except Exception as e:
                data = f"Feil: {html.escape(repr(e))}".encode()
                self.send_response(500)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *a):
            pass

    print(f"Dashboard: http://127.0.0.1:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
