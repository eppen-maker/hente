import unittest
from datetime import date, datetime, timedelta, timezone

from backtest import backtest, max_drawdown, visible_news

def bars(prices):
    start = datetime(2026, 1, 1, 5, tzinfo=timezone.utc)
    return [{"t": (start + timedelta(days=i)).isoformat(), "o": p, "h": p, "l": p, "c": p, "v": 1}
            for i, p in enumerate(prices)]

class BacktestTests(unittest.TestCase):
    def test_no_lookahead(self):
        seen = []
        data = bars([100 + i for i in range(60)])
        def spy(ctx, key):
            seen.append((key, ctx["recent_daily_bars"][-1]["t"]))
            return {"action": "HOLD"}
        backtest("X", data, [], spy)
        for (key, last), bar in zip(seen, data[50:]):
            self.assertLess(last, bar["t"])

    def test_news_cutoff(self):
        news = [{"created_at": "2026-03-02T14:29:00Z"},   # 09:29 NY -> visible
                {"created_at": "2026-03-02T14:31:00Z"},   # after open -> hidden
                {"created_at": "2026-02-20T12:00:00Z"}]   # too old -> hidden
        self.assertEqual(visible_news(news, date(2026, 3, 2)), news[:1])

    def test_buy_caps_slippage_and_fees(self):
        r = backtest("X", bars([100] * 52), [], lambda c, k: {"action": "BUY"},
                     slippage_bps=10, fee_per_share=1)
        # $500 cap / 100.10 -> 4 shares per day, two days; never above 10% of equity.
        self.assertEqual(r["strategy"]["end_qty"], 8)
        self.assertLess(r["strategy"]["return"], 0)
        self.assertAlmostEqual(r["buy_and_hold"]["return"], (10000 - 99 * 100.1 + 99 * 100) / 10000 - 1)

    def test_never_short(self):
        r = backtest("X", bars([100] * 55), [], lambda c, k: {"action": "SELL"})
        self.assertEqual(r["strategy"]["trades"], 0)
        self.assertEqual(r["strategy"]["end_qty"], 0)

    def test_drawdown(self):
        self.assertAlmostEqual(max_drawdown([100, 120, 90, 130]), -0.25)

if __name__ == "__main__":
    unittest.main()
