"""
Data ingestion and Upstox API v2 wrapper module.
Fetches historical OHLCV data (Daily, trailing 2-3 years) and live/LTP quotes
for NSE Large-Cap (Nifty 100), Mid-Cap (Nifty Midcap 150), and baseline indices.
Includes resilient fallback/sandbox simulation for offline and preview testing.
"""

import os
import time
import math
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import requests
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Upstox API v2 Base URL
UPSTOX_API_BASE_URL = "https://api.upstox.com/v2"

# Curated Indian Equities Universe with NSE symbol & Upstox Instrument Keys
INDIAN_STOCKS_UNIVERSE = {
    "LARGE_CAP": [
        {"ticker": "RELIANCE", "name": "Reliance Industries Ltd", "instrument_key": "NSE_EQ|INE002A01018", "base_price": 2980.0},
        {"ticker": "TCS", "name": "Tata Consultancy Services Ltd", "instrument_key": "NSE_EQ|INE467B01029", "base_price": 4250.0},
        {"ticker": "HDFCBANK", "name": "HDFC Bank Ltd", "instrument_key": "NSE_EQ|INE040A01034", "base_price": 1640.0},
        {"ticker": "ICICIBANK", "name": "ICICI Bank Ltd", "instrument_key": "NSE_EQ|INE090A01021", "base_price": 1210.0},
        {"ticker": "INFY", "name": "Infosys Ltd", "instrument_key": "NSE_EQ|INE009A01021", "base_price": 1890.0},
        {"ticker": "BHARTIARTL", "name": "Bharti Airtel Ltd", "instrument_key": "NSE_EQ|INE397D01024", "base_price": 1540.0},
        {"ticker": "ITC", "name": "ITC Ltd", "instrument_key": "NSE_EQ|INE154A01025", "base_price": 505.0},
        {"ticker": "SBIN", "name": "State Bank of India", "instrument_key": "NSE_EQ|INE062A01020", "base_price": 815.0},
        {"ticker": "LT", "name": "Larsen & Toubro Ltd", "instrument_key": "NSE_EQ|INE018A01030", "base_price": 3650.0},
        {"ticker": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "instrument_key": "NSE_EQ|INE030A01027", "base_price": 2720.0},
        {"ticker": "TATAMOTORS", "name": "Tata Motors Ltd", "instrument_key": "NSE_EQ|INE155A01022", "base_price": 1020.0},
        {"ticker": "SUNPHARMA", "name": "Sun Pharmaceutical Ind Ltd", "instrument_key": "NSE_EQ|INE044A01036", "base_price": 1820.0},
    ],
    "MID_CAP": [
        {"ticker": "POLYCAB", "name": "Polycab India Ltd", "instrument_key": "NSE_EQ|INE455K01017", "base_price": 6850.0},
        {"ticker": "TRENT", "name": "Trent Ltd", "instrument_key": "NSE_EQ|INE849A01020", "base_price": 6950.0},
        {"ticker": "PERSISTENT", "name": "Persistent Systems Ltd", "instrument_key": "NSE_EQ|INE262H01013", "base_price": 5120.0},
        {"ticker": "COFORGE", "name": "Coforge Ltd", "instrument_key": "NSE_EQ|INE591G01017", "base_price": 6650.0},
        {"ticker": "DIXON", "name": "Dixon Technologies India Ltd", "instrument_key": "NSE_EQ|INE935N01020", "base_price": 12800.0},
        {"ticker": "ASTRAL", "name": "Astral Ltd", "instrument_key": "NSE_EQ|INE006I01046", "base_price": 1940.0},
        {"ticker": "SUPREMEIND", "name": "Supreme Industries Ltd", "instrument_key": "NSE_EQ|INE195A01028", "base_price": 5420.0},
        {"ticker": "FEDERALBNK", "name": "The Federal Bank Ltd", "instrument_key": "NSE_EQ|INE171A01029", "base_price": 195.0},
        {"ticker": "KPITTECH", "name": "KPIT Technologies Ltd", "instrument_key": "NSE_EQ|INE048G01026", "base_price": 1720.0},
        {"ticker": "TATAELXSI", "name": "Tata Elxsi Ltd", "instrument_key": "NSE_EQ|INE670A01012", "base_price": 7520.0},
    ]
}

INDEX_BASELINES = {
    "NIFTY_50": {"ticker": "NIFTY 50", "instrument_key": "NSE_INDEX|Nifty 50", "base_value": 24850.0},
    "NIFTY_NEXT_50": {"ticker": "NIFTY NEXT 50", "instrument_key": "NSE_INDEX|Nifty Next 50", "base_value": 72400.0}
}


class UpstoxDataFetcher:
    """
    Production-ready data fetcher for Indian markets with Upstox API v2 support
    and high-fidelity realistic market data synthesis fallback.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        use_sandbox_fallback: bool = True
    ):
        self.api_key = api_key or os.getenv("UPSTOX_API_KEY", "")
        self.access_token = access_token or os.getenv("UPSTOX_ACCESS_TOKEN", "")
        self.use_sandbox_fallback = use_sandbox_fallback
        self.session = requests.Session()
        if self.access_token:
            self.session.headers.update({
                "Accept": "application/json",
                "Authorization": f"Bearer {self.access_token}"
            })

    def is_live_configured(self) -> bool:
        """Checks if authentic Upstox API token is configured."""
        return bool(self.access_token and len(self.access_token.strip()) > 20)

    def fetch_historical_ohlcv(
        self,
        instrument_key: str,
        interval: str = "day",
        days_back: int = 730
    ) -> pd.DataFrame:
        """
        Fetches historical OHLCV data for an instrument (trailing 2-3 years, daily timeframe).
        Returns a clean pandas DataFrame with DatetimeIndex and standard OHLCV columns.
        """
        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

        if self.is_live_configured():
            try:
                url = f"{UPSTOX_API_BASE_URL}/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}"
                response = self.session.get(url, timeout=12.0)
                if response.status_code == 200:
                    data = response.json()
                    candles = data.get("data", {}).get("candles", [])
                    if candles:
                        df = pd.DataFrame(
                            candles,
                            columns=["timestamp", "open", "high", "low", "close", "volume", "open_interest"]
                        )
                        df["timestamp"] = pd.to_datetime(df["timestamp"])
                        df.set_index("timestamp", inplace=True)
                        df.sort_index(ascending=True, inplace=True)
                        df = df[["open", "high", "low", "close", "volume"]].astype(float)
                        return df
                else:
                    logger.warning(
                        f"Upstox API returned {response.status_code} for {instrument_key}. "
                        f"Falling back to high-fidelity market data generator."
                    )
            except Exception as e:
                logger.error(f"Error fetching historical data from Upstox for {instrument_key}: {e}")

        # Fallback to realistic quantitative market simulation for continuous dashboard operation
        return self._generate_synthetic_ohlcv(instrument_key, days_back=days_back)

    def fetch_market_baselines(self) -> Dict[str, Dict[str, Any]]:
        """
        Fetches directional market baseline trends for Nifty 50 and Nifty Next 50.
        Returns trend direction, 1M return, 3M return, 200 EMA status, and regime.
        """
        baselines = {}
        for key, info in INDEX_BASELINES.items():
            df = self.fetch_historical_ohlcv(info["instrument_key"], days_back=365)
            if not df.empty:
                current_price = df["close"].iloc[-1]
                prev_close = df["close"].iloc[-2]
                day_change_pct = ((current_price - prev_close) / prev_close) * 100

                ema_50 = df["close"].ewm(span=50, adjust=False).mean().iloc[-1]
                ema_200 = df["close"].ewm(span=200, adjust=False).mean().iloc[-1]

                return_1m = ((current_price - df["close"].iloc[-22]) / df["close"].iloc[-22]) * 100 if len(df) >= 22 else 0.0
                return_3m = ((current_price - df["close"].iloc[-65]) / df["close"].iloc[-65]) * 100 if len(df) >= 65 else 0.0

                regime = "Strong Bullish" if current_price > ema_50 > ema_200 else (
                    "Mild Bullish" if current_price > ema_50 else (
                        "Neutral Consolidation" if current_price > ema_200 else "Bearish Under Pressure"
                    )
                )

                baselines[key] = {
                    "name": info["ticker"],
                    "current_price": round(current_price, 2),
                    "day_change_pct": round(day_change_pct, 2),
                    "return_1m_pct": round(return_1m, 2),
                    "return_3m_pct": round(return_3m, 2),
                    "ema_50": round(ema_50, 2),
                    "ema_200": round(ema_200, 2),
                    "regime": regime,
                    "is_bullish": current_price > ema_200
                }
        return baselines

    def fetch_live_quotes(self, instrument_keys: List[str]) -> Dict[str, float]:
        """
        Queries the latest live/LTP market price for multiple symbols.
        Used by the Live Portfolio Tracker for dynamic profit/loss calculation.
        """
        ltp_map: Dict[str, float] = {}

        if self.is_live_configured() and instrument_keys:
            try:
                # Upstox supports comma-separated instrument_key query params
                keys_param = ",".join(instrument_keys)
                url = f"{UPSTOX_API_BASE_URL}/market-quote/ltp?instrument_key={keys_param}"
                response = self.session.get(url, timeout=8.0)
                if response.status_code == 200:
                    data = response.json()
                    quote_data = data.get("data", {})
                    for key, val in quote_data.items():
                        ltp_map[key] = float(val.get("last_price", 0.0))
                    return ltp_map
            except Exception as e:
                logger.error(f"Failed to fetch live quotes from Upstox: {e}")

        # Realistic LTP simulation for tracked stocks
        for key in instrument_keys:
            # Match base price from universe or fallback
            base = 1000.0
            for cat in ["LARGE_CAP", "MID_CAP"]:
                for stock in INDIAN_STOCKS_UNIVERSE[cat]:
                    if stock["instrument_key"] == key or stock["ticker"] in key:
                        base = stock["base_price"]
                        break
            # Add small random intraday variation (-1.5% to +2.5%)
            jitter = 1.0 + (random.uniform(-0.015, 0.025))
            ltp_map[key] = round(base * jitter, 2)

        return ltp_map

    def _generate_synthetic_ohlcv(self, instrument_key: str, days_back: int = 730) -> pd.DataFrame:
        """
        Generates realistic 2-year daily OHLCV series for Indian stocks with realistic
        trends, cyclicality, volatility, and volume patterns based on seed parameters.
        """
        # Seed consistently by instrument key
        seed_val = abs(hash(instrument_key)) % (2**32)
        np.random.seed(seed_val)
        random.seed(seed_val)

        # Determine starting base price
        base_price = 1500.0
        for cat in ["LARGE_CAP", "MID_CAP"]:
            for stock in INDIAN_STOCKS_UNIVERSE[cat]:
                if stock["instrument_key"] == instrument_key or stock["ticker"] in instrument_key:
                    base_price = stock["base_price"]
                    break
        if "Nifty 50" in instrument_key:
            base_price = 24850.0
        elif "Nifty Next 50" in instrument_key:
            base_price = 72400.0

        num_days = max(days_back, 300)
        end_date = datetime.now()
        dates = [end_date - timedelta(days=i) for i in range(num_days)]
        # Filter business days
        business_dates = [d for d in dates if d.weekday() < 5]
        business_dates.reverse()

        n = len(business_dates)
        # Structural drift with regimes (bullish bias with corrections)
        drift = 0.0006  # Annualized ~15% upward drift typical of Indian equities
        volatility = 0.016

        returns = np.random.normal(drift, volatility, n)
        # Introduce trend regimes
        regime_cycle = np.sin(np.linspace(0, 4 * np.pi, n)) * 0.006
        returns += regime_cycle

        # Calculate closing prices
        price_multipliers = np.exp(returns)
        # Normalize so that last price ends close to current base_price
        cum_ret = np.cumprod(price_multipliers)
        prices = (cum_ret / cum_ret[-1]) * base_price

        closes = prices
        highs = closes * (1 + np.abs(np.random.normal(0.008, 0.005, n)))
        lows = closes * (1 - np.abs(np.random.normal(0.008, 0.005, n)))
        opens = np.roll(closes, 1)
        opens[0] = closes[0] * 0.995

        # Volume modeling with lognormal distribution and spikes on breakout days
        base_vol = 1_500_000 if base_price < 2000 else 450_000
        volumes = np.random.lognormal(mean=np.log(base_vol), sigma=0.45, size=n)

        # Boost volume on days with large positive moves
        vol_boost = np.where(returns > 0.015, 2.2, 1.0)
        volumes = volumes * vol_boost

        df = pd.DataFrame({
            "open": np.round(opens, 2),
            "high": np.round(highs, 2),
            "low": np.round(lows, 2),
            "close": np.round(closes, 2),
            "volume": np.round(volumes, 0)
        }, index=pd.to_datetime(business_dates))

        return df
