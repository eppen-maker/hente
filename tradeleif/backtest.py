"""Daily replay/backtest for bot.py. No look-ahead: the decision for day D sees
only bars closed before D and news published before D's open; it fills at D's
open with slippage and fees. Compared against buy-and-hold on the same days."""
import argparse
import json
import os
import sqlite3
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from bot import DATA, ROOT, analyse, request, size, stamp

NY = ZoneInfo("America/New_York")

def ny_day(bar):
    return stamp(bar["t"]).astimezone(NY).date()

def visible_news(news, day):
    """News created strictly before the regular-session open of `day`."""
    cutoff = datetime.combine(day, time(9, 30), NY)
    return [n for n in news
            if cutoff - timedelta(days=3) <= stamp(n["created_at"]) < cutoff]

def context_for(symbol, history, news, qty):
    closes = [float(b["c"]) for b in history]
    return {"symbol": symbol, "feed": "IEX daily bars (replay)",
            "sma20": sum(closes[-20:]) / 20, "sma50": sum(closes[-50:]) / 50,
            "recent_daily_bars": history[-20:],
            "positions": [{"symbol": symbol, "qty": str(qty)}] if qty else [],
            "news": [{k: n.get(k) for k in ("headline", "summary", "created_at", "url")}
                     for n in news[:5]]}

def sma_strategy(ctx):
    if ctx["sma20"] > ctx["sma50"]:
        return {"action": "BUY", "reason": "SMA20 > SMA50"}
    if ctx["sma20"] < ctx["sma50"]:
        return {"action": "SELL", "reason": "SMA20 < SMA50"}
    return {"action": "HOLD", "reason": "flat"}

class ClaudeStrategy:
    """Cached by (symbol, day) so re-runs cost nothing; hard cap on new calls."""
    def __init__(self, max_calls, path=ROOT / "backtest_cache.sqlite"):
        self.left = max_calls
        self.db = sqlite3.connect(path)
        self.db.execute("CREATE TABLE IF NOT EXISTS decisions "
                        "(key TEXT PRIMARY KEY, decision TEXT)")

    def __call__(self, ctx, key):
        row = self.db.execute("SELECT decision FROM decisions WHERE key=?", (key,)).fetchone()
        if row:
            return json.loads(row[0])
        if self.left <= 0:
            raise RuntimeError("API call budget exhausted; raise --max-calls")
        self.left -= 1
        decision = analyse(ctx)
        self.db.execute("INSERT INTO decisions VALUES (?, ?)", (key, json.dumps(decision)))
        self.db.commit()
        return decision

def max_drawdown(curve):
    peak, worst = curve[0], 0.0
    for v in curve:
        peak = max(peak, v)
        worst = min(worst, v / peak - 1)
    return worst

def backtest(symbol, bars, news, decide, cash=10000.0, slippage_bps=5.0,
             fee_per_share=0.0, min_fee=0.0, lookback=50):
    bars = sorted(bars, key=lambda b: b["t"])
    if len(bars) <= lookback:
        raise ValueError(f"Need more than {lookback} bars")
    start_cash, qty, trades, curve = cash, 0, [], []
    slip = slippage_bps / 10000
    for i in range(lookback, len(bars)):
        bar, day = bars[i], ny_day(bars[i])
        ctx = context_for(symbol, bars[:i], visible_news(news, day), qty)
        d = decide(ctx, f"{symbol}:{day}")
        action = d["action"]
        if action in ("BUY", "SELL"):
            price = float(bar["o"]) * (1 + slip if action == "BUY" else 1 - slip)
            equity = cash + qty * float(bars[i - 1]["c"])
            exposure = qty * float(bars[i - 1]["c"])
            n = size(action, round(price, 2), equity, cash, exposure, exposure, qty)
            fee = max(min_fee, n * fee_per_share) if n else 0
            if action == "BUY" and n * price + fee > cash:
                n = 0
            if n:
                cash += (-n * price if action == "BUY" else n * price) - fee
                qty += n if action == "BUY" else -n
                trades.append({"day": str(day), "side": action, "qty": n,
                               "price": round(price, 4), "fee": round(fee, 2),
                               "reason": d.get("reason", "")})
        curve.append(cash + qty * float(bar["c"]))
    first, last = float(bars[lookback]["o"]) * (1 + slip), float(bars[-1]["c"])
    bh_qty = int(start_cash // first)
    bh_curve = [start_cash - bh_qty * first + bh_qty * float(b["c"]) for b in bars[lookback:]]
    return {"symbol": symbol, "days": len(curve),
            "from": str(ny_day(bars[lookback])), "to": str(ny_day(bars[-1])),
            "strategy": {"return": curve[-1] / start_cash - 1,
                         "max_drawdown": max_drawdown(curve), "trades": len(trades),
                         "final_equity": curve[-1], "end_qty": qty},
            "buy_and_hold": {"return": bh_curve[-1] / start_cash - 1,
                             "max_drawdown": max_drawdown(bh_curve),
                             "final_equity": bh_curve[-1]},
            "trade_log": trades}

def fetch(symbol, start, end):
    headers = {"APCA-API-KEY-ID": os.environ["ALPACA_PAPER_KEY"],
               "APCA-API-SECRET-KEY": os.environ["ALPACA_PAPER_SECRET"]}
    def pages(path, params, key):
        out = []
        while True:
            page = request(DATA, path, headers, params=params)
            items = page.get(key, [])
            out.extend(items.get(symbol, []) if isinstance(items, dict) else items)
            if not page.get("next_page_token"):
                return out
            params["page_token"] = page["next_page_token"]
    bars = pages("/v2/stocks/bars", {"symbols": symbol, "timeframe": "1Day", "feed": "iex",
                 "adjustment": "all", "start": start, "end": end, "limit": 1000}, "bars")
    news = pages("/v1beta1/news", {"symbols": symbol, "start": start, "end": end,
                 "limit": 50, "sort": "asc"}, "news")
    return bars, news

def main():
    p = argparse.ArgumentParser(description="Replay/backtest (no orders sent).")
    p.add_argument("symbol")
    p.add_argument("--start", required=True, help="YYYY-MM-DD (first 50 bars are warm-up)")
    p.add_argument("--end", required=True)
    p.add_argument("--strategy", choices=["sma", "claude"], default="sma")
    p.add_argument("--max-calls", type=int, default=50, help="New Claude API calls allowed")
    p.add_argument("--data", type=Path, help='Offline JSON {"bars": [...], "news": [...]}')
    p.add_argument("--cash", type=float, default=10000)
    p.add_argument("--slippage-bps", type=float, default=5)
    p.add_argument("--fee-per-share", type=float, default=0)
    p.add_argument("--min-fee", type=float, default=0)
    p.add_argument("--trades", action="store_true", help="Include trade log")
    a = p.parse_args()
    symbol = a.symbol.upper()
    if a.data:
        raw = json.loads(a.data.read_text())
        bars, news = raw["bars"], raw.get("news", [])
    else:
        bars, news = fetch(symbol, a.start, a.end)
    decide = (ClaudeStrategy(a.max_calls) if a.strategy == "claude"
              else lambda ctx, key: sma_strategy(ctx))
    r = backtest(symbol, bars, news, decide, a.cash, a.slippage_bps, a.fee_per_share, a.min_fee)
    if not a.trades:
        r.pop("trade_log")
    print(json.dumps(r, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Stopped: {type(exc).__name__}: {exc}")
        raise SystemExit(1)
