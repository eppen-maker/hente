import sqlite3
import unittest
from datetime import datetime, timedelta, timezone
from bot import plan, reserve, validate_quote

class RiskTests(unittest.TestCase):
    def setUp(self):
        self.q = {"bp": 99.9, "ap": 100, "t": datetime.now(timezone.utc).isoformat()}
        self.a = {"status": "ACTIVE", "equity": "10000", "last_equity": "10000", "cash": "10000"}

    def test_buy_cap(self):
        self.assertEqual(plan("BUY", self.q, self.a, [], "AAPL")["qty"], "5")

    def test_no_short_or_leverage(self):
        self.assertIsNone(plan("SELL", self.q, self.a, [], "AAPL"))
        self.a["cash"] = "0"
        self.assertIsNone(plan("BUY", self.q, self.a, [], "AAPL"))

    def test_stale_and_future(self):
        for seconds in (-120, 120):
            self.q["t"] = (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat()
            with self.assertRaises(ValueError):
                validate_quote(self.q, datetime.now(timezone.utc))

    def test_loss_and_spread(self):
        self.a["equity"] = "9700"
        with self.assertRaises(ValueError):
            plan("BUY", self.q, self.a, [], "AAPL")
        self.q["ap"] = 110
        with self.assertRaises(ValueError):
            validate_quote(self.q, datetime.now(timezone.utc))

    def test_position_and_gross_caps(self):
        p = [{"symbol": "AAPL", "qty": "10", "market_value": "1000"}]
        self.assertIsNone(plan("BUY", self.q, self.a, p, "AAPL"))
        p = [{"symbol": "OTHER", "qty": "50", "market_value": "5000"}]
        self.assertIsNone(plan("BUY", self.q, self.a, p, "AAPL"))

    def test_reservation_persists_and_daily_cap(self):
        db = sqlite3.connect(":memory:")
        db.execute("CREATE TABLE orders(day TEXT, symbol TEXT, client_id TEXT, status TEXT, PRIMARY KEY(day,symbol))")
        reserve(db, "2026-10-07", "AAPL", "a")
        with self.assertRaises(sqlite3.IntegrityError):
            reserve(db, "2026-10-07", "AAPL", "a")
        reserve(db, "2026-10-07", "MSFT", "b")
        reserve(db, "2026-10-07", "OTHER", "c")
        with self.assertRaises(ValueError):
            reserve(db, "2026-10-07", "FOURTH", "d")

if __name__ == "__main__":
    unittest.main()
