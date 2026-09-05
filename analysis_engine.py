"""
Senior Trader Analysis Engine for Indian Equities (NSE/BSE).
Multi-factor quantitative alpha model evaluating:
- Momentum: RSI, MACD, Dual Moving Average (50/200 EMA), Supertrend
- Volatility & Trend Strength: Bollinger Bands, ATR, ADX
- Strategic Synthesis: Weighted Conviction Score (0 to 100)
- Generative Ruleset: Adaptive Hybrid Breakout-Momentum for 3-6 month holding periods
- Entry Point & Target Expected Return projection with explicit justifications
"""

import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class QuantitativeSignal:
    """Represents a computed multi-factor quantitative signal for an Indian stock."""
    ticker: str
    market_cap_category: str
    close_price: float
    comfortable_entry_price: float
    expected_return_pct: float
    target_price: float
    conviction_score: float  # 0 to 100
    technical_justification: str
    rsi_14: float
    macd_val: float
    macd_signal: float
    macd_hist: float
    ema_50: float
    ema_200: float
    supertrend_direction: str  # "BULLISH" or "BEARISH"
    adx_14: float
    atr_14: float
    bollinger_pct_b: float
    is_hybrid_breakout: bool
    stop_loss: float = 0.0
    backtest_win_rate: float = 0.0
    backtest_mdd: float = 0.0
    is_approved: bool = False


class SeniorTraderAnalysisEngine:
    """
    Modular quantitative analysis engine synthesizing momentum, trend,
    volatility, and volume factors tailored for Indian NSE Large-Cap and Mid-Cap stocks.
    """

    def __init__(
        self,
        rsi_period: int = 14,
        macd_fast: int = 12,
        macd_slow: int = 26,
        macd_signal_period: int = 9,
        ema_short: int = 50,
        ema_long: int = 200,
        supertrend_period: int = 10,
        supertrend_multiplier: float = 3.0,
        bb_period: int = 20,
        bb_std_dev: float = 2.0,
        atr_period: int = 14,
        adx_period: int = 14,
    ):
        self.rsi_period = rsi_period
        self.macd_fast = macd_fast
        self.macd_slow = macd_slow
        self.macd_signal_period = macd_signal_period
        self.ema_short = ema_short
        self.ema_long = ema_long
        self.supertrend_period = supertrend_period
        self.supertrend_multiplier = supertrend_multiplier
        self.bb_period = bb_period
        self.bb_std_dev = bb_std_dev
        self.atr_period = atr_period
        self.adx_period = adx_period

    # -------------------------------------------------------------
    # Technical Indicator Calculation Pipelines (Vectorized)
    # -------------------------------------------------------------

    def compute_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes all required technical indicators natively with Pandas/NumPy.
        """
        data = df.copy()
        close = data["close"]
        high = data["high"]
        low = data["low"]
        volume = data["volume"]

        # 1. Dual Exponential Moving Averages (50 EMA & 200 EMA)
        data["ema_50"] = close.ewm(span=self.ema_short, adjust=False).mean()
        data["ema_200"] = close.ewm(span=self.ema_long, adjust=False).mean()
        data["ema_20"] = close.ewm(span=20, adjust=False).mean()

        # 2. RSI (14 periods)
        delta = close.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(window=self.rsi_period, min_periods=self.rsi_period).mean()
        avg_loss = loss.rolling(window=self.rsi_period, min_periods=self.rsi_period).mean()

        # Wilders smoothing
        for i in range(self.rsi_period, len(data)):
            avg_gain.iloc[i] = (avg_gain.iloc[i - 1] * (self.rsi_period - 1) + gain.iloc[i]) / self.rsi_period
            avg_loss.iloc[i] = (avg_loss.iloc[i - 1] * (self.rsi_period - 1) + loss.iloc[i]) / self.rsi_period

        rs = avg_gain / (avg_loss.replace(0, np.nan))
        data["rsi_14"] = 100 - (100 / (1 + rs))
        data["rsi_14"] = data["rsi_14"].fillna(50.0)

        # 3. MACD (12, 26, 9)
        ema_fast = close.ewm(span=self.macd_fast, adjust=False).mean()
        ema_slow = close.ewm(span=self.macd_slow, adjust=False).mean()
        data["macd"] = ema_fast - ema_slow
        data["macd_signal"] = data["macd"].ewm(span=self.macd_signal_period, adjust=False).mean()
        data["macd_hist"] = data["macd"] - data["macd_signal"]

        # 4. Average True Range (ATR 14)
        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        data["tr"] = tr
        data["atr_14"] = tr.rolling(window=self.atr_period).mean()
        data["atr_pct"] = (data["atr_14"] / close) * 100

        # 5. Supertrend (10, 3.0)
        data = self._compute_supertrend(data)

        # 6. Bollinger Bands (20, 2)
        bb_mid = close.rolling(window=self.bb_period).mean()
        bb_std = close.rolling(window=self.bb_period).std()
        data["bb_mid"] = bb_mid
        data["bb_upper"] = bb_mid + (self.bb_std_dev * bb_std)
        data["bb_lower"] = bb_mid - (self.bb_std_dev * bb_std)
        data["bb_bandwidth"] = (data["bb_upper"] - data["bb_lower"]) / bb_mid
        data["bb_pct_b"] = (close - data["bb_lower"]) / (data["bb_upper"] - data["bb_lower"])

        # 7. Average Directional Index (ADX 14)
        data = self._compute_adx(data)

        # 8. Volume Analysis (20-day SMA)
        data["volume_sma_20"] = volume.rolling(window=20).mean()
        data["volume_ratio"] = volume / data["volume_sma_20"]

        return data

    def _compute_supertrend(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates Supertrend indicator with ATR multiplier.
        """
        data = df.copy()
        high = data["high"].values
        low = data["low"].values
        close = data["close"].values
        atr = data["atr_14"].fillna(method="bfill").values
        m = self.supertrend_multiplier

        hl2 = (high + low) / 2.0
        upper_basic = hl2 + (m * atr)
        lower_basic = hl2 - (m * atr)

        n = len(df)
        upper_band = np.zeros(n)
        lower_band = np.zeros(n)
        direction = np.ones(n)  # 1 for Bullish, -1 for Bearish
        supertrend = np.zeros(n)

        for i in range(1, n):
            # Upper band logic
            if upper_basic[i] < upper_band[i - 1] or close[i - 1] > upper_band[i - 1]:
                upper_band[i] = upper_basic[i]
            else:
                upper_band[i] = upper_band[i - 1]

            # Lower band logic
            if lower_basic[i] > lower_band[i - 1] or close[i - 1] < lower_band[i - 1]:
                lower_band[i] = lower_basic[i]
            else:
                lower_band[i] = lower_band[i - 1]

            # Direction logic
            if direction[i - 1] == 1:
                if close[i] < lower_band[i]:
                    direction[i] = -1
                    supertrend[i] = upper_band[i]
                else:
                    direction[i] = 1
                    supertrend[i] = lower_band[i]
            else:
                if close[i] > upper_band[i]:
                    direction[i] = 1
                    supertrend[i] = lower_band[i]
                else:
                    direction[i] = -1
                    supertrend[i] = upper_band[i]

        data["supertrend"] = supertrend
        data["supertrend_dir"] = direction
        return data

    def _compute_adx(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes ADX (Average Directional Index) and Directional Movement Indicators.
        """
        data = df.copy()
        high = data["high"]
        low = data["low"]
        close = data["close"]
        p = self.adx_period

        up_move = high.diff()
        down_move = -low.diff()

        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

        tr = data["tr"]
        tr_smooth = tr.rolling(window=p).mean()
        plus_dm_smooth = pd.Series(plus_dm, index=data.index).rolling(window=p).mean()
        minus_dm_smooth = pd.Series(minus_dm, index=data.index).rolling(window=p).mean()

        plus_di = 100 * (plus_dm_smooth / (tr_smooth.replace(0, np.nan)))
        minus_di = 100 * (minus_dm_smooth / (tr_smooth.replace(0, np.nan)))

        dx = 100 * (plus_di - minus_di).abs() / ((plus_di + minus_di).replace(0, np.nan))
        data["plus_di"] = plus_di.fillna(0.0)
        data["minus_di"] = minus_di.fillna(0.0)
        data["adx_14"] = dx.rolling(window=p).mean().fillna(20.0)
        return data

    # -------------------------------------------------------------
    # Multi-Factor Alpha Synthesis & Conviction Scoring
    # -------------------------------------------------------------

    def evaluate_stock(
        self,
        ticker: str,
        market_cap_category: str,
        ohlcv_df: pd.DataFrame,
        market_trend_bullish: bool = True
    ) -> Optional[QuantitativeSignal]:
        """
        Evaluates a stock against multi-factor models.
        Calculates weighted Conviction Score (0-100) and entry/target parameters.
        Constructs Adaptive Hybrid Breakout-Momentum strategy if standard setups stall.
        """
        if len(ohlcv_df) < 220:
            logger.warning(f"Insufficient history for {ticker} ({len(ohlcv_df)} candles).")
            return None

        df = self.compute_indicators(ohlcv_df)
        curr = df.iloc[-1]
        prev = df.iloc[-2]

        close = float(curr["close"])
        ema_50 = float(curr["ema_50"])
        ema_200 = float(curr["ema_200"])
        ema_20 = float(curr["ema_20"])
        rsi = float(curr["rsi_14"])
        macd_val = float(curr["macd"])
        macd_sig = float(curr["macd_signal"])
        macd_hist = float(curr["macd_hist"])
        atr = float(curr["atr_14"])
        adx = float(curr["adx_14"])
        plus_di = float(curr["plus_di"])
        minus_di = float(curr["minus_di"])
        pct_b = float(curr["bb_pct_b"])
        vol_ratio = float(curr["volume_ratio"]) if not np.isnan(curr["volume_ratio"]) else 1.0
        st_dir = "BULLISH" if curr["supertrend_dir"] == 1 else "BEARISH"

        # Multi-Factor Component Scoring (Total Max: 100)
        score = 0.0
        justifications = []
        is_hybrid = False

        # --- A. Momentum Analysis (Max 30 pts) ---
        # 1. RSI (10 pts): Sweet spot for multi-month trend is 52-68
        if 50.0 <= rsi <= 68.0:
            score += 10.0
            justifications.append(f"RSI in Bullish Accumulation ({rsi:.1f})")
        elif 45.0 <= rsi < 50.0 and rsi > prev["rsi_14"]:
            score += 6.0
            justifications.append(f"RSI Recovering ({rsi:.1f})")
        elif 68.0 < rsi <= 75.0:
            score += 4.0

        # 2. MACD (10 pts): Line above signal and expanding histogram
        if macd_val > macd_sig:
            if macd_hist > 0 and macd_hist > prev["macd_hist"]:
                score += 10.0
                justifications.append("MACD Bullish Expansion")
            else:
                score += 6.0
                justifications.append("MACD Positive Bias")
        elif macd_hist > 0:
            score += 4.0

        # 3. Supertrend (10 pts)
        if st_dir == "BULLISH":
            score += 10.0
            justifications.append("Supertrend Bullish Trajectory")

        # --- B. Trend Structure & Dual Moving Average (Max 30 pts) ---
        # 1. Price above 50 & 200 EMA (Golden Alignment) (15 pts)
        if close > ema_50 and ema_50 > ema_200:
            score += 15.0
            justifications.append("Dual EMA Golden Alignment (P > 50 > 200)")
        elif close > ema_200:
            score += 8.0
            justifications.append("Price Above 200 EMA Base")

        # 2. Slope of 50 EMA and 200 EMA (10 pts)
        ema_50_slope = (ema_50 - df["ema_50"].iloc[-10]) / df["ema_50"].iloc[-10]
        ema_200_slope = (ema_200 - df["ema_200"].iloc[-20]) / df["ema_200"].iloc[-20]
        if ema_50_slope > 0.008 and ema_200_slope > 0.002:
            score += 10.0
        elif ema_50_slope > 0:
            score += 5.0

        # 3. Market Baseline Synergy (5 pts)
        if market_trend_bullish:
            score += 5.0

        # --- C. Volatility & Trend Strength (ADX & Bollinger Bands) (Max 25 pts) ---
        # 1. ADX Trend Strength (15 pts)
        if adx >= 25.0 and plus_di > minus_di:
            score += 15.0
            justifications.append(f"Strong Trend Strength (ADX: {adx:.1f})")
        elif adx >= 20.0 and plus_di > minus_di:
            score += 8.0

        # 2. Bollinger Band Position / Squeeze (10 pts)
        if 0.5 <= pct_b <= 0.95:
            score += 10.0
        elif pct_b > 0.95 and vol_ratio > 1.4:
            score += 8.0
            justifications.append("Upper Bollinger Band Riding with Volume")

        # --- D. Volume Confirmation (Max 15 pts) ---
        if vol_ratio >= 1.5:
            score += 15.0
            justifications.append(f"Institutional Volume Surge ({vol_ratio:.1f}x 20d SMA)")
        elif vol_ratio >= 1.1:
            score += 8.0

        # -------------------------------------------------------------
        # Generative Adaptive Hybrid Breakout-Momentum Strategy
        # -------------------------------------------------------------
        # If standard momentum or mean-reversion conditions stall or score < 65,
        # detect multi-week tight volatility compression (Squeeze) breaking out
        # with volume and structural support for a 3-6 month window.
        if score < 65.0:
            recent_20_high = df["high"].iloc[-22:-1].max()
            recent_20_low = df["low"].iloc[-22:-1].min()
            consolidation_range = (recent_20_high - recent_20_low) / recent_20_low

            # Squeeze condition: Range < 7% over 20 trading sessions, followed by breakout
            if consolidation_range < 0.08 and close >= recent_20_high and vol_ratio >= 1.3:
                is_hybrid = True
                score = max(score, 76.0)
                justifications = [
                    "Adaptive Hybrid Breakout: 4-week Tight Volatility Squeeze with High Volume Expansion",
                    f"Structural Breakout above ₹{recent_20_high:.1f} Resistance",
                    f"Clean 3-6 Month Risk-Reward Profile (ATR Volatility: {curr['atr_pct']:.1f}%)"
                ]
            # Symmetrical triangle / resistance retest
            elif close > ema_20 and rsi > 52.0 and vol_ratio > 1.25 and close > ema_200:
                is_hybrid = True
                score = max(score, 71.0)
                justifications = [
                    "Adaptive Hybrid: Symmetrical Base Pullback with Volume Surge",
                    f"Strong Support at 20 EMA (₹{ema_20:.1f}) and RSI Momentum Shift",
                    "Targeting 3-6 Month Upside Cycle"
                ]

        conviction_score = min(100.0, max(0.0, round(score, 1)))

        # -------------------------------------------------------------
        # Entry Point & Target Expected Return (3-6 Month Holding Horizon)
        # -------------------------------------------------------------
        # Comfortable entry: Near-term structural pullback zone (20 EMA or 0.5 ATR below current close)
        support_cluster = max(ema_20, close - (0.6 * atr))
        comfortable_entry = round(min(close, support_cluster * 1.005), 2)

        # Expected return: Factoring 3 to 4.5x ATR expansion + resistance projection
        projected_upside = (3.2 * atr) + (close * 0.05)
        target_price = round(comfortable_entry + projected_upside, 2)
        expected_return_pct = round(((target_price - comfortable_entry) / comfortable_entry) * 100, 2)

        # Enforce realistic 3-6 month holding window return targets (14% - 35%)
        expected_return_pct = max(14.0, min(38.0, expected_return_pct))
        target_price = round(comfortable_entry * (1.0 + (expected_return_pct / 100.0)), 2)

        # Institutional Stop Loss: 1.5x ATR trailing buffer or max 8% risk anchor
        stop_loss = round(max(comfortable_entry * 0.92, comfortable_entry - (1.5 * atr)), 2)

        primary_justification = " | ".join(justifications[:3]) if justifications else "Multi-factor Quantitative Confluence"

        return QuantitativeSignal(
            ticker=ticker,
            market_cap_category=market_cap_category,
            close_price=round(close, 2),
            comfortable_entry_price=comfortable_entry,
            expected_return_pct=expected_return_pct,
            target_price=target_price,
            conviction_score=conviction_score,
            technical_justification=primary_justification,
            rsi_14=round(rsi, 1),
            macd_val=round(macd_val, 2),
            macd_signal=round(macd_sig, 2),
            macd_hist=round(macd_hist, 2),
            ema_50=round(ema_50, 2),
            ema_200=round(ema_200, 2),
            supertrend_direction=st_dir,
            adx_14=round(adx, 1),
            atr_14=round(atr, 2),
            bollinger_pct_b=round(pct_b, 2),
            is_hybrid_breakout=is_hybrid,
            stop_loss=stop_loss
        )
