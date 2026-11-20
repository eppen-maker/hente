"""Risikogrenser. Returnerer godkjent antall (int) eller 0 + grunn."""
from __future__ import annotations

import math
import os
from dataclasses import dataclass
from datetime import datetime

from .config import Config


@dataclass
class RiskState:
    now: datetime
    minutes_to_close: float
    price: float
    position_qty: float
    exposure: float          # sum markedsverdi alle posisjoner
    cash: float
    orders_today_symbol: int
    orders_today_total: int
    minutes_since_last_order: float | None
    day_pnl: float           # net_liq nå - net_liq ved dagens første snapshot
    has_open_order: bool
    avg_cost: float = 0.0
    minutes_since_buy: float | None = None
    minutes_since_sell: float | None = None


def check(cfg: Config, d: dict, s: RiskState) -> tuple[int, str]:
    a = d["action"]
    if a == "HOLD":
        return 0, "HOLD"
    if d["confidence"] < cfg.min_confidence:
        return 0, f"lav sikkerhet {d['confidence']:.2f} < {cfg.min_confidence}"
    if s.has_open_order:
        return 0, "åpen ordre finnes allerede for symbolet"
    if s.orders_today_total >= cfg.max_orders_day:
        return 0, "maks ordre i dag nådd"
    if s.orders_today_symbol >= cfg.max_orders_per_symbol_day:
        return 0, "maks ordre for symbolet i dag nådd"
    if cfg.cooldown_min > 0 and s.minutes_since_last_order is not None and s.minutes_since_last_order < cfg.cooldown_min:
        return 0, f"cooldown ({s.minutes_since_last_order:.0f} < {cfg.cooldown_min} min)"
    if s.price <= 0:
        return 0, "ugyldig pris"
    if a == "SELL":
        if s.position_qty > 0 and s.avg_cost > 0 and s.minutes_since_buy is not None:
            move = s.price / s.avg_cost - 1
            hold_min = float(os.getenv("MIN_HOLD_MIN", "0") or 0)
            stop, take = _f("STOP_LOSS_PCT"), _f("TAKE_PROFIT_PCT")
            exit_ok = (stop and move <= -stop) or (take and move >= take)
            if hold_min and s.minutes_since_buy < hold_min and not exit_ok:
                return 0, f"min. holdetid ({s.minutes_since_buy:.0f} < {hold_min:.0f} min, {move:+.1%})"
        if s.position_qty > 0:
            qty = math.floor(s.position_qty * max(d["size_fraction"], 0.0))
            return min(max(qty, 1), int(s.position_qty)), "OK"  # salg reduserer risiko: ikke begrenset av ordreverdi
        if not cfg.allow_short:
            return 0, "ingen beholdning å selge"
        # SHORT: åpne/øke kort posisjon innen samme verdigrenser som kjøp
        room_pos = cfg.max_position_value - abs(s.position_qty) * s.price
        room_tot = cfg.max_total_exposure - s.exposure
        qty = math.floor(min(cfg.max_order_value * d["size_fraction"], room_pos, room_tot) / s.price)
        return (qty, "OK (short)") if qty >= 1 else (0, "ingen plass for short innen grensene")
    # BUY
    if s.position_qty < 0:  # dekk inn short
        qty = math.floor(abs(s.position_qty) * max(d["size_fraction"], 0.0))
        return min(max(qty, 1), int(abs(s.position_qty))), "OK (dekker short)"
    if s.day_pnl <= -cfg.daily_loss_limit:
        return 0, f"dagens tap {s.day_pnl:.0f} over grense, kun salg tillatt"
    if s.minutes_to_close < cfg.no_new_buys_before_close_min:
        return 0, "for nær stenging for nye kjøp"
    rebuy = float(os.getenv("REBUY_COOLDOWN_MIN", "0") or 0)
    if rebuy and s.minutes_since_sell is not None and s.minutes_since_sell < rebuy:
        return 0, f"nylig solgt ({s.minutes_since_sell:.0f} < {rebuy:.0f} min)"
    room_pos = cfg.max_position_value - s.position_qty * s.price
    room_tot = cfg.max_total_exposure - s.exposure
    cap = min(cfg.max_order_value, s.cash * 0.95) if s.cash > 0 else cfg.max_order_value
    budget = min(cap * d["size_fraction"], room_pos, room_tot)  # size_fraction er andel av det som faktisk kan brukes
    qty = math.floor(budget / s.price)
    if qty < 1:
        return 0, "ingen plass innen risikogrensene"
    min_value = float(os.getenv("MIN_ORDER_VALUE", "0") or 0)
    if qty * s.price < min_value:
        return 0, f"ordre {qty * s.price:.0f} under minste ordreverdi {min_value:.0f} (kurtasje spiser gevinsten)"
    return qty, "OK"


def _f(name):
    return float(os.getenv(name, "0") or 0)


def forced_exit(price: float, avg_cost: float, qty: float) -> str | None:
    """Automatisk stop-loss / take-profit uavhengig av analysen."""
    if qty <= 0 or avg_cost <= 0:
        return None
    move = price / avg_cost - 1
    if _f("STOP_LOSS_PCT") and move <= -_f("STOP_LOSS_PCT"):
        return f"stop-loss {move:+.1%}"
    if _f("TAKE_PROFIT_PCT") and move >= _f("TAKE_PROFIT_PCT"):
        return f"take-profit {move:+.1%}"
    return None
