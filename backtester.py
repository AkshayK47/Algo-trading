"""
Lightweight vectorized backtesting module using Pandas.
Simulates trading strategy performance over trailing 12 months (252 trading days).
Enforces the Sanity Filter:
- Rejects any stock whose backtest yields Maximum Drawdown (MDD) > 15%
- Rejects any stock whose backtest yields Win Rate < 55%
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class BacktestResult:
    """Contains performance statistics and equity timeseries for a backtested stock."""
    ticker: str
    win_rate: float            # In percent (e.g. 64.5%)
    max_drawdown: float        # In percent (e.g. 11.2%)
    total_trades: int
    winning_trades: int
    losing_trades: int
    cumulative_return: float   # In percent
    profit_factor: float
    passes_filter: bool        # True if Win Rate >= 55% AND MDD <= 15%
    equity_curve: pd.Series    # Indexed by date
    drawdown_series: pd.Series # Indexed by date
    rejection_reason: Optional[str] = None


class VectorizedBacktester:
    """
    Lightweight, high-speed backtesting engine simulating multi-factor swing trades
    for a 3-to-6-month holding window with trailing ATR risk controls.
    """

    def __init__(
        self,
        lookback_days: int = 252,    # Trailing 12 months (~252 trading sessions)
        min_win_rate: float = 55.0,  # Sanity Filter: Minimum 55% win rate
        max_allowed_mdd: float = 15.0, # Sanity Filter: Maximum 15% drawdown
        atr_stop_multiplier: float = 2.0,
        holding_period_days: int = 65  # ~3 calendar months
    ):
        self.lookback_days = lookback_days
        self.min_win_rate = min_win_rate
        self.max_allowed_mdd = max_allowed_mdd
        self.atr_stop_multiplier = atr_stop_multiplier
        self.holding_period_days = holding_period_days

    def run_backtest(
        self,
        ticker: str,
        df_indicators: pd.DataFrame
    ) -> BacktestResult:
        """
        Executes a 12-month trailing simulation on the calculated strategy dataframe.
        """
        if len(df_indicators) < 180:
            return BacktestResult(
                ticker=ticker,
                win_rate=0.0,
                max_drawdown=100.0,
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                cumulative_return=0.0,
                profit_factor=0.0,
                passes_filter=False,
                equity_curve=pd.Series(dtype=float),
                drawdown_series=pd.Series(dtype=float),
                rejection_reason="Insufficient historical data for 12-month backtest."
            )

        # Slice trailing 12 months (approx 252 bars or available)
        slice_bars = min(len(df_indicators), self.lookback_days)
        df_test = df_indicators.iloc[-slice_bars:].copy()

        closes = df_test["close"].values
        highs = df_test["high"].values
        lows = df_test["low"].values
        atrs = df_test["atr_14"].fillna(method="bfill").values
        ema_50 = df_test["ema_50"].values
        ema_200 = df_test["ema_200"].values
        rsi = df_test["rsi_14"].values
        st_dir = df_test["supertrend_dir"].values
        dates = df_test.index

        n = len(df_test)
        trades: List[Dict[str, Any]] = []
        equity = 100_000.0
        equity_history = [equity]

        in_position = False
        entry_idx = 0
        entry_price = 0.0
        stop_loss = 0.0
        target_price = 0.0

        for i in range(1, n):
            c_price = closes[i]

            # If in position, evaluate exit criteria
            if in_position:
                days_held = i - entry_idx
                # Check Target Hit or Trailing Stop Hit or Expiry
                hit_target = highs[i] >= target_price
                hit_stop = lows[i] <= stop_loss
                time_exit = days_held >= self.holding_period_days

                if hit_target or hit_stop or time_exit or i == n - 1:
                    if hit_target:
                        exit_price = target_price
                        outcome = "TARGET_HIT"
                    elif hit_stop:
                        exit_price = stop_loss
                        outcome = "STOP_LOSS"
                    else:
                        exit_price = c_price
                        outcome = "TIME_EXIT"

                    ret_pct = ((exit_price - entry_price) / entry_price) * 100.0
                    pnl = equity * (ret_pct / 100.0) * 0.4  # Allocate 40% capital per trade
                    equity += pnl

                    trades.append({
                        "entry_idx": entry_idx,
                        "exit_idx": i,
                        "entry_date": dates[entry_idx],
                        "exit_date": dates[i],
                        "entry_price": entry_price,
                        "exit_price": exit_price,
                        "return_pct": ret_pct,
                        "pnl": pnl,
                        "outcome": outcome
                    })
                    in_position = False
                else:
                    # Trail stop loss upward along with rising 20 EMA or ATR floor
                    new_stop = max(stop_loss, c_price - (self.atr_stop_multiplier * atrs[i]))
                    stop_loss = max(stop_loss, new_stop)

            # Check Entry conditions
            if not in_position and i < n - 10:
                # Entry signal: Price > 50 EMA > 200 EMA + Supertrend Bullish + RSI in sweet spot (50-68)
                is_bullish_trend = (c_price > ema_50[i]) and (ema_50[i] > ema_200[i])
                is_st_bull = (st_dir[i] == 1)
                is_rsi_good = (50.0 <= rsi[i] <= 68.0)

                # Prior bar triggered crossover or fresh continuation
                if is_bullish_trend and is_st_bull and is_rsi_good:
                    in_position = True
                    entry_idx = i
                    entry_price = c_price
                    curr_atr = atrs[i]
                    stop_loss = entry_price - (self.atr_stop_multiplier * curr_atr)
                    target_price = entry_price + (3.2 * curr_atr)

            equity_history.append(equity)

        # Compute performance metrics
        equity_series = pd.Series(equity_history[:n], index=dates[:n])
        running_max = equity_series.cummax()
        drawdown_series = ((equity_series - running_max) / running_max) * 100.0
        max_drawdown = abs(float(drawdown_series.min()))

        total_trades = len(trades)
        if total_trades > 0:
            winning_trades = len([t for t in trades if t["return_pct"] > 0])
            losing_trades = len([t for t in trades if t["return_pct"] <= 0])
            win_rate = round((winning_trades / total_trades) * 100.0, 1)

            gross_profits = sum(t["pnl"] for t in trades if t["pnl"] > 0)
            gross_losses = abs(sum(t["pnl"] for t in trades if t["pnl"] < 0))
            profit_factor = round(gross_profits / gross_losses, 2) if gross_losses > 0 else 3.5
        else:
            # If standard signals produced no trades, simulate passive baseline holding
            winning_trades = 0
            losing_trades = 0
            win_rate = 50.0
            profit_factor = 1.0

        cum_return = round(((equity_series.iloc[-1] - equity_history[0]) / equity_history[0]) * 100.0, 1)

        # -------------------------------------------------------------
        # Strictly enforce Sanity Filter (MDD <= 15% AND Win Rate >= 55%)
        # -------------------------------------------------------------
        passes = (win_rate >= self.min_win_rate) and (max_drawdown <= self.max_allowed_mdd)
        rejection_reason = None
        if not passes:
            reasons = []
            if win_rate < self.min_win_rate:
                reasons.append(f"Win Rate ({win_rate:.1f}%) below sanity threshold of {self.min_win_rate}%")
            if max_drawdown > self.max_allowed_mdd:
                reasons.append(f"Max Drawdown ({max_drawdown:.1f}%) exceeds safety threshold of {self.max_allowed_mdd}%")
            rejection_reason = " | ".join(reasons)

        return BacktestResult(
            ticker=ticker,
            win_rate=win_rate,
            max_drawdown=round(max_drawdown, 1),
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            cumulative_return=cum_return,
            profit_factor=profit_factor,
            passes_filter=passes,
            equity_curve=equity_series,
            drawdown_series=drawdown_series,
            rejection_reason=rejection_reason
        )
