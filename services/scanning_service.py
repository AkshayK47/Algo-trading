"""
Stock scanning service with business logic orchestration
"""

import asyncio
from typing import List, Dict, Any, Optional
import logging

from services.market_data_service import MarketDataService
from analysis_engine import SeniorTraderAnalysisEngine
from backtester import VectorizedBacktester
from utils.validators import InputValidator
from exceptions import ValidationError, DataFetchError
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StockScanningService:
    """Orchestrates stock scanning operations"""
    
    def __init__(self):
        self.market_service = MarketDataService()
        self.analysis_engine = SeniorTraderAnalysisEngine(
            rsi_period=settings.rsi_period,
            macd_fast=settings.macd_fast,
            macd_slow=settings.macd_slow,
            macd_signal_period=settings.macd_signal_period,
            ema_short=settings.ema_short,
            ema_long=settings.ema_long,
            supertrend_period=settings.supertrend_period,
            supertrend_multiplier=settings.supertrend_multiplier,
            bb_period=settings.bb_period,
            bb_std_dev=settings.bb_std_dev,
            atr_period=settings.atr_period,
            adx_period=settings.adx_period
        )
        self.backtester = VectorizedBacktester(
            lookback_days=settings.backtest_lookback_days,
            min_win_rate=settings.backtest_min_win_rate,
            max_allowed_mdd=settings.backtest_max_drawdown,
            atr_stop_multiplier=settings.backtest_atr_stop_multiplier,
            holding_period_days=settings.backtest_holding_period_days
        )
    
    async def scan_single_stock(
        self,
        ticker: str,
        market_trend_bullish: bool = True
    ) -> Dict[str, Any]:
        """
        Scan a single stock through the complete pipeline
        
        Args:
            ticker: Stock ticker symbol
            market_trend_bullish: Whether market is in bullish trend
            
        Returns:
            Dictionary with signal and backtest results
        """
        # Validate ticker
        try:
            ticker = InputValidator.validate_ticker(ticker)
        except ValidationError as e:
            logger.error(f"Invalid ticker: {e}")
            raise
        
        logger.info(f"Scanning {ticker}")
        
        try:
            # Fetch OHLCV data
            async with self.market_service as service:
                instrument_key = f"NSE_EQ|{ticker}"
                ohlcv_df = await service.fetch_ohlcv_async(
                    instrument_key,
                    days_back=730
                )
            
            if ohlcv_df.empty:
                raise DataFetchError(f"No data available for {ticker}")
            
            # Run analysis
            signal = self.analysis_engine.evaluate_stock(
                ticker=ticker,
                market_cap_category="Large-Cap (Nifty 100)",
                ohlcv_df=ohlcv_df,
                market_trend_bullish=market_trend_bullish
            )
            
            if not signal:
                return {
                    "ticker": ticker,
                    "approved": False,
                    "reason": "Failed to generate signal"
                }
            
            # Run backtest
            df_indicators = self.analysis_engine.compute_indicators(ohlcv_df)
            backtest_result = self.backtester.run_backtest(ticker, df_indicators)
            
            # Update signal with backtest results
            signal.backtest_win_rate = backtest_result.win_rate
            signal.backtest_mdd = backtest_result.max_drawdown
            signal.is_approved = backtest_result.passes_filter
            
            return {
                "ticker": ticker,
                "approved": backtest_result.passes_filter,
                "signal": {
                    "ticker": signal.ticker,
                    "close_price": signal.close_price,
                    "comfortable_entry_price": signal.comfortable_entry_price,
                    "expected_return_pct": signal.expected_return_pct,
                    "target_price": signal.target_price,
                    "stop_loss": signal.stop_loss,
                    "conviction_score": signal.conviction_score,
                    "technical_justification": signal.technical_justification,
                    "rsi_14": signal.rsi_14,
                    "macd_hist": signal.macd_hist,
                    "ema_50": signal.ema_50,
                    "ema_200": signal.ema_200,
                    "supertrend_direction": signal.supertrend_direction,
                    "adx_14": signal.adx_14,
                    "atr_14": signal.atr_14,
                    "is_hybrid_breakout": signal.is_hybrid_breakout
                },
                "backtest": {
                    "win_rate": backtest_result.win_rate,
                    "max_drawdown": backtest_result.max_drawdown,
                    "total_trades": backtest_result.total_trades,
                    "cumulative_return": backtest_result.cumulative_return,
                    "profit_factor": backtest_result.profit_factor,
                    "passes_filter": backtest_result.passes_filter,
                    "rejection_reason": backtest_result.rejection_reason
                }
            }
            
        except Exception as e:
            logger.error(f"Error scanning {ticker}: {e}")
            raise
    
    async def scan_stocks(
        self,
        universe: str = "ALL",
        sectors: List[str] = None,
        min_conviction: int = 65
    ) -> Dict[str, Any]:
        """
        Scan multiple stocks based on universe and filters
        
        Args:
            universe: Stock universe (ALL, LARGE, MID)
            sectors: List of sector filters
            min_conviction: Minimum conviction score threshold
            
        Returns:
            Dictionary with approved and rejected signals
        """
        logger.info(f"Starting stock scan: universe={universe}, sectors={sectors}, min_conviction={min_conviction}")
        
        # Get stock list based on universe
        from data_fetcher import INDIAN_STOCKS_UNIVERSE
        
        if universe == "LARGE":
            stock_pool = INDIAN_STOCKS_UNIVERSE["LARGE_CAP"]
        elif universe == "MID":
            stock_pool = INDIAN_STOCKS_UNIVERSE["MID_CAP"]
        else:
            stock_pool = INDIAN_STOCKS_UNIVERSE["LARGE_CAP"] + INDIAN_STOCKS_UNIVERSE["MID_CAP"]
        
        # Apply sector filter if specified
        if sectors:
            stock_pool = [
                s for s in stock_pool
                if s.get("sector", "") in sectors
            ]
        
        # Limit scan size for performance
        stock_pool = stock_pool[:50]
        
        approved = []
        rejected = []
        errors = []
        
        # Scan stocks concurrently
        tasks = [
            self.scan_single_stock(stock["ticker"])
            for stock in stock_pool
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for stock, result in zip(stock_pool, results):
            if isinstance(result, Exception):
                logger.error(f"Error scanning {stock['ticker']}: {result}")
                errors.append({
                    "ticker": stock["ticker"],
                    "error": str(result)
                })
                continue
            
            if result["approved"] and result["signal"]["conviction_score"] >= min_conviction:
                approved.append(result)
            else:
                rejected.append({
                    "ticker": result["ticker"],
                    "conviction_score": result["signal"]["conviction_score"] if "signal" in result else 0,
                    "reason": result.get("reason", "Failed sanity filter")
                })
        
        logger.info(f"Scan complete: {len(approved)} approved, {len(rejected)} rejected, {len(errors)} errors")
        
        return {
            "approved": approved,
            "rejected": rejected,
            "errors": errors,
            "total_scanned": len(stock_pool),
            "timestamp": asyncio.get_event_loop().time()
        }
