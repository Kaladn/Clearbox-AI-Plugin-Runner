# Market Oracle — 6-1-6 Financial Cognitive Substrate
# Clearbox AI Studio Plugin — Hybrid (bridge-mountable + standalone)
# See CONTRACT.md for full boundary contract and API surface

from .market_oracle import MarketOraclePlugin
from .api import ROUTES

__all__ = ["MarketOraclePlugin", "ROUTES"]
