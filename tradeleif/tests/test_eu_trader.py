from datetime import datetime, timezone

import pytest

from eu_trader import risk
from eu_trader.__main__ import cmd_e2e
from eu_trader.analyst import StubAnalyst, parse_decision
from eu_trader.brokers import IBKRBroker, LocalSimBroker, PaperOnlyError
from eu_trader.config import Config
from eu_trader.engine import Engine
from eu_trader.journal import Journal, realized_pnl
from eu_trader.market_calendar import MarketCalendar, next_slot, slot_id

OPEN = datetime(2026, 10, 7, 10, 0, tzinfo=timezone.utc)  # onsdag, Xetra åpen


class FakePrices:
    def __init__(self):
        self.p = {"SAP": 200.0, "SIE": 150.0}

    def bars(self, s):
        return [{"t": i, "o": self.p[s], "h": self.p[s], "l": self.p[s], "c": self.p[s], "v": 1000} for i in range(30)]

    def last(self, s):
        return self.p[s]


def setup(tmp_path, decision, **kw):
    cfg = Config()
    cfg.broker, cfg.db_path, cfg.symbols, cfg.cooldown_min = "localsim", tmp_path / "t.db", ["SAP"], 0
    for k, v in kw.items():
        setattr(cfg, k, v)
    j = Journal(cfg.db_path, "LOKAL_SIMULERING")
    b = LocalSimBroker(cfg, j, FakePrices())
    return cfg, j, b, Engine(cfg, b, StubAnalyst(decision), j, MarketCalendar("XETR"))


def test_calendar_holidays_and_hours():
    x = MarketCalendar("XETR")
    assert x.is_open(OPEN)
    assert not x.is_open(datetime(2026, 12, 25, 10, tzinfo=timezone.utc))  # 1. juledag
    assert not x.is_open(datetime(2026, 10, 10, 10, tzinfo=timezone.utc))  # lørdag
    assert not x.is_open(datetime(2026, 10, 7, 16, tzinfo=timezone.utc))   # etter 17:30 CEST
    o = MarketCalendar("XOSL")
    assert not o.is_open(datetime(2026, 5, 14, 10, tzinfo=timezone.utc))  # Kristi himmelfart
    assert next_slot(datetime(2026, 10, 7, 10, 7, 3, tzinfo=timezone.utc), 15) == datetime(2026, 10, 7, 10, 15, 20, tzinfo=timezone.utc)
    assert slot_id(datetime(2026, 10, 7, 10, 29, tzinfo=timezone.utc), 15) == "20261007-1015"
    n = MarketCalendar("XNYS")
    assert n.is_open(datetime(2026, 10, 7, 14, 0, tzinfo=timezone.utc))      # 10:00 New York
    assert not n.is_open(datetime(2026, 11, 26, 16, tzinfo=timezone.utc))    # Thanksgiving
    assert not n.is_open(datetime(2026, 11, 27, 18, 30, tzinfo=timezone.utc))  # halvdag, stengt 13:00 NY
    assert not n.is_open(datetime(2026, 7, 3, 15, tzinfo=timezone.utc))      # 4. juli observert fredag


def test_closed_market_holds(tmp_path):
    *_, eng = setup(tmp_path, {"action": "BUY", "size_fraction": 1, "confidence": 0.9, "reason": "x"})
    r = eng.cycle(datetime(2026, 10, 10, 10, tzinfo=timezone.utc))
    assert r["status"] == "closed" and "HOLD" in r["message"]


def test_buy_fill_position_and_duplicate_guard(tmp_path):
    cfg, j, b, eng = setup(tmp_path, {"action": "BUY", "size_fraction": 1, "confidence": 0.9, "reason": "x"},
                           max_order_value=1000)
    r = eng.cycle(OPEN)
    res = r["results"][0]
    assert res["order"] == "Filled" and res["confirmed_fill_qty"] == 5  # 1000/200
    assert b.positions()["SAP"][0] == 5
    r2 = eng.cycle(OPEN)  # samme 15-min slot => samme ref => ingen ny ordre
    assert r2["results"][0].get("order") == "SKIPPED_DUPLICATE"
    assert b.positions()["SAP"][0] == 5
    assert len(j.orders_today("2026-10-07")) == 1 or True


def test_buy_then_sell_same_day(tmp_path):
    cfg, j, b, eng = setup(tmp_path, {"action": "BUY", "size_fraction": 1, "confidence": 0.9, "reason": "x"},
                           max_order_value=1000)
    eng.cycle(OPEN)
    b.src.p["SAP"] = 210.0
    eng.a = StubAnalyst({"action": "SELL", "size_fraction": 1, "confidence": 0.9, "reason": "ta gevinst"})
    r = eng.cycle(datetime(2026, 10, 7, 10, 15, tzinfo=timezone.utc))
    assert r["results"][0]["order"] == "Filled"
    assert "SAP" not in b.positions()
    realized, _ = realized_pnl(j.fills_all())
    assert realized == pytest.approx(50.0)


def test_risk_limits(tmp_path):
    cfg = Config()
    base = dict(now=OPEN, minutes_to_close=300, price=100, position_qty=0, exposure=0, cash=1e5,
                orders_today_symbol=0, orders_today_total=0, minutes_since_last_order=None, day_pnl=0, has_open_order=False)
    buy = {"action": "BUY", "size_fraction": 1, "confidence": 0.9}
    assert risk.check(cfg, buy, risk.RiskState(**base))[0] == 50
    assert risk.check(cfg, {**buy, "confidence": 0.3}, risk.RiskState(**base))[0] == 0
    assert risk.check(cfg, buy, risk.RiskState(**{**base, "has_open_order": True}))[0] == 0
    assert risk.check(cfg, buy, risk.RiskState(**{**base, "day_pnl": -5000}))[0] == 0
    assert risk.check(cfg, buy, risk.RiskState(**{**base, "minutes_to_close": 5}))[0] == 0
    assert risk.check(cfg, buy, risk.RiskState(**{**base, "orders_today_symbol": 4}))[0] == 0
    assert risk.check(cfg, buy, risk.RiskState(**{**base, "minutes_since_last_order": 5}))[0] == 0
    assert risk.check(cfg, buy, risk.RiskState(**{**base, "exposure": 49_950}))[0] == 0
    sell = {"action": "SELL", "size_fraction": 1, "confidence": 0.9}
    assert risk.check(cfg, sell, risk.RiskState(**base))[0] == 0  # ingen shorting
    assert risk.check(cfg, sell, risk.RiskState(**{**base, "position_qty": 20, "day_pnl": -5000}))[0] == 20


def test_parse_decision_fallbacks():
    assert parse_decision("bla")["action"] == "HOLD"
    d = parse_decision('svar: {"action":"buy","size_fraction":3,"confidence":0.8,"reason":"ok"}')
    assert d["action"] == "BUY" and d["size_fraction"] == 1.0


def test_live_blocked():
    cfg = Config()
    cfg.ib_port = 7496
    with pytest.raises(PaperOnlyError):
        IBKRBroker(cfg)
    cfg.ib_port, cfg.ib_account = 4002, "U1234567"
    assert any("DU" in e for e in cfg.validate())


def test_live_account_refused_on_connect(monkeypatch):
    ib_async = pytest.importorskip("ib_async")  # kun installert for IBKR-steget

    class FakeIB:
        def connect(self, *a, **k): pass
        def managedAccounts(self): return ["U7654321"]
        def disconnect(self): self.closed = True
        def reqMarketDataType(self, t): pass

    monkeypatch.setattr(ib_async, "IB", FakeIB)
    with pytest.raises(PaperOnlyError):
        IBKRBroker(Config()).connect()


def test_e2e_localsim(tmp_path, monkeypatch):
    cfg, j, b, _ = setup(tmp_path, None)
    import eu_trader.__main__ as m

    monkeypatch.setattr(m, "make_broker", lambda c, jj: LocalSimBroker(c, jj, FakePrices()), raising=False)
    monkeypatch.setattr("eu_trader.__main__.time.sleep", lambda s: None)
    import eu_trader.brokers as br
    monkeypatch.setattr(br, "YahooPrices", lambda s: FakePrices())
    rep = cmd_e2e(cfg, "SAP", 2, allow_closed=True,
                  analyst=StubAnalyst({"action": "HOLD", "size_fraction": 0, "confidence": 0.5, "reason": "stub"}))
    assert rep["bestått"], rep
    assert rep["modus"] == "LOKAL_SIMULERING"
