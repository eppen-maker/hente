"""Alpaca-adapter testet mot en falsk REST-server (samme URL-er og JSON-felt som Alpaca v2)."""
import json
from datetime import datetime, timezone

import pytest

import eu_trader.__main__ as m
from eu_trader.analyst import ClaudeAnalyst, StubAnalyst
from eu_trader.brokers import ALPACA_PAPER_URL, AlpacaBroker, PaperOnlyError
from eu_trader.config import Config
from eu_trader.engine import Engine
from eu_trader.journal import Journal
from eu_trader.market_calendar import MarketCalendar

US_OPEN = datetime(2026, 10, 7, 15, 0, tzinfo=timezone.utc)  # 11:00 New York


class FakeAlpaca:
    def __init__(self, acct="PA3TEST", price=42.0, is_open=True):
        self.acct, self.price, self.cash, self.pos, self.orders, self.is_open = acct, price, 100_000.0, {}, {}, is_open
        self.calls = []

    def __call__(self, method, url, headers, body=None, timeout=20):
        assert headers["APCA-API-KEY-ID"] and headers["APCA-API-SECRET-KEY"]
        self.calls.append((method, url))
        path = url.split("?")[0]
        if url.startswith(ALPACA_PAPER_URL):
            path = path[len(ALPACA_PAPER_URL):]
            if path == "/v2/account":
                eq = self.cash + sum(q * self.price for q, _ in self.pos.values())
                return {"account_number": self.acct, "equity": str(eq), "cash": str(self.cash), "currency": "USD"}
            if path == "/v2/clock":
                return {"is_open": self.is_open}
            if path == "/v2/positions":
                return [{"symbol": s, "qty": str(q), "avg_entry_price": str(c)} for s, (q, c) in self.pos.items() if q]
            if path == "/v2/orders" and method == "GET":
                closed = "status=closed" in url
                return [o for o in self.orders.values() if (o["status"] in ("filled", "canceled")) == closed]
            if path == "/v2/orders" and method == "POST":
                if any(o["client_order_id"] == body["client_order_id"] for o in self.orders.values()):
                    raise RuntimeError("HTTP 422 client_order_id must be unique")
                qty, sym = float(body["qty"]), body["symbol"]
                q, c = self.pos.get(sym, (0.0, 0.0))
                if body["side"] == "buy":
                    self.pos[sym] = (q + qty, (q * c + qty * self.price) / (q + qty))
                    self.cash -= qty * self.price
                else:
                    self.pos[sym] = (q - qty, c)
                    self.cash += qty * self.price
                oid = f"id{len(self.orders) + 1}"
                self.orders[oid] = {"id": oid, "client_order_id": body["client_order_id"], "symbol": sym,
                                    "side": body["side"], "status": "filled", "filled_qty": str(qty),
                                    "filled_avg_price": str(self.price), "filled_at": "2026-10-07T15:00:01Z"}
                return self.orders[oid]
            if path.startswith("/v2/orders/"):
                return self.orders[path.rsplit("/", 1)[1]]
        if "/trades/latest" in url:
            return {"trade": {"p": self.price}}
        if "/bars" in url:
            return {"bars": [{"t": i, "o": self.price, "h": self.price, "l": self.price, "c": self.price, "v": 100} for i in range(30)]}
        raise AssertionError(f"uventet kall {method} {url}")


def mk(tmp_path, **kw):
    cfg = Config()
    cfg.broker, cfg.db_path, cfg.symbols, cfg.calendar, cfg.cooldown_min = "alpaca", tmp_path / "a.db", ["EQNR"], "XNYS", 0
    cfg.alpaca_key = cfg.alpaca_secret = "x"
    fake = FakeAlpaca(**kw)
    return cfg, AlpacaBroker(cfg, http=fake), fake


def test_alpaca_refuses_non_paper(tmp_path):
    _, b, _ = mk(tmp_path, acct="9XY123")
    with pytest.raises(PaperOnlyError):
        b.connect()


def test_alpaca_only_paper_url(tmp_path):
    _, b, fake = mk(tmp_path)
    b.connect()
    b.account()
    assert all(u.startswith(("https://paper-api.alpaca.markets", "https://data.alpaca.markets")) for _, u in fake.calls)


def test_alpaca_cycle_buy_sell_and_dedup(tmp_path):
    cfg, b, fake = mk(tmp_path)
    b.connect()
    j = Journal(cfg.db_path, "ALPACA_PAPER")
    eng = Engine(cfg, b, StubAnalyst({"action": "BUY", "size_fraction": 1, "confidence": 0.9, "reason": "x"}), j, MarketCalendar("XNYS"))
    r = eng.cycle(US_OPEN)["results"][0]
    assert r["order"] == "Filled" and r["confirmed_fill_qty"] == 119  # 5000/42
    assert eng.cycle(US_OPEN)["results"][0]["order"] == "SKIPPED_DUPLICATE"
    fake.price = 44.0
    eng.a = StubAnalyst({"action": "SELL", "size_fraction": 1, "confidence": 0.9, "reason": "y"})
    r = eng.cycle(datetime(2026, 10, 7, 15, 15, tzinfo=timezone.utc))["results"][0]
    assert r["order"] == "Filled" and "EQNR" not in b.positions()
    assert eng.pnl({})[0] == pytest.approx(119 * 2)


def test_alpaca_clock_overrides_calendar(tmp_path):
    cfg, b, _ = mk(tmp_path, is_open=False)
    b.connect()
    eng = Engine(cfg, b, StubAnalyst(), Journal(cfg.db_path, "ALPACA_PAPER"), MarketCalendar("XNYS"))
    assert eng.cycle(US_OPEN)["status"] == "closed"


def test_alpaca_e2e(tmp_path, monkeypatch):
    cfg, b, _ = mk(tmp_path)
    monkeypatch.setattr(m, "make_broker", lambda c, jj: b)
    monkeypatch.setattr(m.time, "sleep", lambda s: None)
    monkeypatch.setattr(MarketCalendar, "is_open", lambda self, now: True)
    rep = m.cmd_e2e(cfg, "EQNR", 1, False, analyst=StubAnalyst({"action": "HOLD", "size_fraction": 0, "confidence": 0.5, "reason": "s"}))
    assert rep["bestått"], rep
    assert rep["modus"] == "ALPACA_PAPER"


def test_claude_http_request_shape():
    seen = {}

    def fake(method, url, headers, body=None, timeout=20):
        seen.update(method=method, url=url, headers=headers, body=body)
        return {"content": [{"type": "thinking", "thinking": "..."},
                            {"type": "text", "text": '{"action":"BUY","size_fraction":0.5,"confidence":0.7,"reason":"ok"}'}]}

    d = ClaudeAnalyst("k" * 30, "claude-sonnet-5-5", http=fake).decide({"symbol": "EQNR"})
    assert d["action"] == "BUY" and d["size_fraction"] == 0.5
    assert seen["url"] == "https://api.anthropic.com/v1/messages" and seen["headers"]["anthropic-version"] == "2023-06-01"
    assert seen["body"]["model"] == "claude-sonnet-5-5" and json.loads(seen["body"]["messages"][0]["content"])["symbol"] == "EQNR"
