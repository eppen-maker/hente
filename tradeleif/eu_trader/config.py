"""Konfigurasjon fra miljøvariabler (.env støttes). Ingen hemmeligheter i kode."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(".env.eu")  # innstillinger for denne boten
    load_dotenv(".env")     # fallback: gjenbruker Alpaca-nøkler fra eksisterende bot (overstyrer ikke)
except ImportError:  # pragma: no cover
    pass

PAPER_PORTS = {7497, 4002}  # TWS paper / IB Gateway paper


def _f(name: str, default: float) -> float:
    return float(os.getenv(name, default))


def _i(name: str, default: int) -> int:
    return int(os.getenv(name, default))


@dataclass
class Config:
    broker: str = field(default_factory=lambda: os.getenv("BROKER", "alpaca").lower())  # alpaca | ibkr | localsim
    # Alpaca (kun paper). Leser begge vanlige navnevarianter.
    alpaca_key: str = field(default_factory=lambda: os.getenv("APCA_API_KEY_ID") or os.getenv("ALPACA_PAPER_KEY") or os.getenv("ALPACA_API_KEY", ""))
    alpaca_secret: str = field(default_factory=lambda: os.getenv("APCA_API_SECRET_KEY") or os.getenv("ALPACA_PAPER_SECRET") or os.getenv("ALPACA_SECRET_KEY", ""))
    alpaca_feed: str = field(default_factory=lambda: os.getenv("ALPACA_FEED", "iex"))
    # IBKR
    ib_host: str = field(default_factory=lambda: os.getenv("IB_HOST", "127.0.0.1"))
    ib_port: int = field(default_factory=lambda: _i("IB_PORT", 4002))
    ib_client_id: int = field(default_factory=lambda: _i("IB_CLIENT_ID", 17))
    ib_account: str = field(default_factory=lambda: os.getenv("IB_ACCOUNT", ""))
    ib_primary_exchange: str = field(default_factory=lambda: os.getenv("IB_PRIMARY_EXCHANGE", "IBIS"))
    currency: str = field(default_factory=lambda: os.getenv("CURRENCY", "EUR"))
    # Marked
    calendar: str = field(default_factory=lambda: os.getenv("EXCHANGE_CALENDAR", "XETR"))
    symbols: list[str] = field(
        default_factory=lambda: [s.strip().upper() for s in os.getenv("SYMBOLS", "SAP,SIE,ALV,DTE,BAS,MBG").split(",") if s.strip()]
    )
    yahoo_suffix: str = field(default_factory=lambda: os.getenv("YAHOO_SUFFIX", ".DE"))  # kun lokal simulering
    interval_min: int = field(default_factory=lambda: _i("INTERVAL_MIN", 15))
    # Claude
    analyst: str = field(default_factory=lambda: os.getenv("ANALYST", "claude_code").lower())  # claude_code | api | rules
    claude_code_model: str = field(default_factory=lambda: os.getenv("CLAUDE_CODE_MODEL", "sonnet"))
    anthropic_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    model: str = field(default_factory=lambda: os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5"))
    # Risiko
    max_position_value: float = field(default_factory=lambda: _f("MAX_POSITION_VALUE", 10_000))
    max_total_exposure: float = field(default_factory=lambda: _f("MAX_TOTAL_EXPOSURE", 50_000))
    max_order_value: float = field(default_factory=lambda: _f("MAX_ORDER_VALUE", 5_000))
    max_orders_per_symbol_day: int = field(default_factory=lambda: _i("MAX_ORDERS_PER_SYMBOL_DAY", 4))
    max_orders_day: int = field(default_factory=lambda: _i("MAX_ORDERS_DAY", 20))
    daily_loss_limit: float = field(default_factory=lambda: _f("DAILY_LOSS_LIMIT", 1_500))
    cooldown_min: int = field(default_factory=lambda: _i("COOLDOWN_MIN", 30))
    min_confidence: float = field(default_factory=lambda: _f("MIN_CONFIDENCE", 0.6))
    no_new_buys_before_close_min: int = field(default_factory=lambda: _i("NO_NEW_BUYS_BEFORE_CLOSE_MIN", 20))
    limit_slippage: float = field(default_factory=lambda: _f("LIMIT_SLIPPAGE", 0.003))
    fill_timeout_s: int = field(default_factory=lambda: _i("FILL_TIMEOUT_S", 60))
    # Lagring / dashboard
    db_path: Path = field(default_factory=lambda: Path(os.getenv("DB_PATH", "data/eu_trader.db")))
    dashboard_port: int = field(default_factory=lambda: _i("DASHBOARD_PORT", 8765))
    sim_start_cash: float = field(default_factory=lambda: _f("SIM_START_CASH", 100_000))

    def validate(self) -> list[str]:
        errs = []
        if self.broker not in ("alpaca", "ibkr", "localsim"):
            errs.append("BROKER må være 'alpaca', 'ibkr' eller 'localsim'.")
        if self.broker == "alpaca" and not (self.alpaca_key and self.alpaca_secret):
            errs.append("Alpaca-nøkler mangler (APCA_API_KEY_ID / APCA_API_SECRET_KEY). Kjør setup_eu.ps1.")
        if self.broker == "ibkr" and self.ib_port not in PAPER_PORTS:
            errs.append(f"IB_PORT={self.ib_port} er ikke en paper-port {sorted(PAPER_PORTS)}. Livehandel er blokkert.")
        if self.ib_account and not self.ib_account.upper().startswith("DU"):
            errs.append("IB_ACCOUNT må være en paper-konto (starter med DU).")
        if not self.symbols:
            errs.append("SYMBOLS er tom.")
        return errs
