"""Risikogrenser. Returnerer godkjent antall (int) eller 0 + grunn."""
from __future__ import annotations

import math
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
        if s.position_qty <= 0:
            return 0, "ingen beholdning å selge"
        qty = math.floor(s.position_qty * max(d["size_fraction"], 0.0))
        return min(max(qty, 1), int(s.position_qty)), "OK"  # salg reduserer risiko: ikke begrenset av ordreverdi
    # BUY
    if s.day_pnl <= -cfg.daily_loss_limit:
        return 0, f"dagens tap {s.day_pnl:.0f} over grense, kun salg tillatt"
    if s.minutes_to_close < cfg.no_new_buys_before_close_min:
        return 0, "for nær stenging for nye kjøp"
    room_pos = cfg.max_position_value - s.position_qty * s.price
    room_tot = cfg.max_total_exposure - s.exposure
    budget = min(cfg.max_order_value * d["size_fraction"], room_pos, room_tot, s.cash * 0.95 if s.cash > 0 else cfg.max_order_value)
    qty = math.floor(budget / s.price)
    if qty < 1:
        return 0, "ingen plass innen risikogrensene"
    return qty, "OK"
