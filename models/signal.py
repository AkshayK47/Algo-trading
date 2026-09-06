"""
Pydantic models for Quantitative Signals and Backtest Results
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
import re


class QuantitativeSignalModel(BaseModel):
    """Validated model for quantitative trading signals"""
    ticker: str = Field(..., min_length=2, max_length=10)
    market_cap_category: str
    close_price: float = Field(..., gt=0)
    comfortable_entry_price: float = Field(..., gt=0)
    expected_return_pct: float = Field(..., ge=-100, le=1000)
    target_price: float = Field(..., gt=0)
    conviction_score: float = Field(..., ge=0, le=100)
    technical_justification: str = Field(..., min_length=10, max_length=500)
    
    # Technical Indicators
    rsi_14: float = Field(..., ge=0, le=100)
    macd_val: float
    macd_signal: float
    macd_hist: float
    ema_50: float = Field(..., gt=0)
    ema_200: float = Field(..., gt=0)
    supertrend_direction: Literal['BULLISH', 'BEARISH']
    adx_14: float = Field(..., ge=0, le=100)
    atr_14: float = Field(..., gt=0)
    bollinger_pct_b: float = Field(..., ge=0, le=1)
    is_hybrid_breakout: bool
    
    # Risk Management
    stop_loss: float = Field(..., gt=0)
    
    # Backtest Results
    backtest_win_rate: float = Field(..., ge=0, le=100)
    backtest_mdd: float = Field(..., ge=0, le=100)
    is_approved: bool
    
    @field_validator('ticker')
    @classmethod
    def validate_ticker(cls, v):
        if not re.match(r'^[A-Z]{2,10}$', v):
            raise ValueError('Invalid ticker format')
        return v.upper()
    
    @field_validator('stop_loss')
    @classmethod
    def validate_stop_loss(cls, v, info):
        if 'comfortable_entry_price' in info.data:
            if v >= info.data['comfortable_entry_price']:
                raise ValueError('Stop loss must be below entry price')
        return v
    
    @field_validator('target_price')
    @classmethod
    def validate_target_price(cls, v, info):
        if 'comfortable_entry_price' in info.data:
            if v <= info.data['comfortable_entry_price']:
                raise ValueError('Target price must be above entry price')
        return v
    
    class Config:
        str_strip_whitespace = True


class BacktestResultModel(BaseModel):
    """Validated model for backtest results"""
    ticker: str = Field(..., min_length=2, max_length=10)
    win_rate: float = Field(..., ge=0, le=100)
    max_drawdown: float = Field(..., ge=0, le=100)
    total_trades: int = Field(..., ge=0)
    winning_trades: int = Field(..., ge=0)
    losing_trades: int = Field(..., ge=0)
    cumulative_return: float
    profit_factor: float = Field(..., ge=0)
    passes_filter: bool
    rejection_reason: Optional[str] = None
    
    @field_validator('ticker')
    @classmethod
    def validate_ticker(cls, v):
        if not re.match(r'^[A-Z]{2,10}$', v):
            raise ValueError('Invalid ticker format')
        return v.upper()
    
    @field_validator('losing_trades')
    @classmethod
    def validate_trade_counts(cls, v, info):
        if 'winning_trades' in info.data and 'total_trades' in info.data:
            if info.data['winning_trades'] + v != info.data['total_trades']:
                raise ValueError('Winning + losing trades must equal total trades')
        return v
    
    class Config:
        str_strip_whitespace = True
