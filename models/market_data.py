"""
Pydantic models for market data structures
"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import List


class OHLCVData(BaseModel):
    """Validated OHLCV candlestick data"""
    date: datetime
    open: float = Field(..., gt=0)
    high: float = Field(..., gt=0)
    low: float = Field(..., gt=0)
    close: float = Field(..., gt=0)
    volume: int = Field(..., ge=0)
    
    @field_validator('high')
    @classmethod
    def validate_high(cls, v, info):
        if 'open' in info.data and 'low' in info.data and 'close' in info.data:
            if v < max(info.data['open'], info.data['low'], info.data['close']):
                raise ValueError('High must be >= open, low, and close')
        return v
    
    @field_validator('low')
    @classmethod
    def validate_low(cls, v, info):
        if 'open' in info.data and 'close' in info.data:
            if v > min(info.data['open'], info.data['close']):
                raise ValueError('Low must be <= open and close')
        return v
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MarketBaseline(BaseModel):
    """Validated market baseline/index data"""
    name: str = Field(..., min_length=1, max_length=100)
    ticker: str = Field(..., min_length=1, max_length=50)
    current_price: float = Field(..., gt=0)
    day_change_pct: float = Field(..., ge=-100, le=100)
    return_1m_pct: float = Field(..., ge=-100, le=1000)
    ema_200: float = Field(..., gt=0)
    is_bullish: bool
    
    class Config:
        str_strip_whitespace = True


class InstrumentQuote(BaseModel):
    """Validated live quote data from API"""
    instrument_key: str = Field(..., min_length=1)
    last_price: float = Field(..., gt=0)
    volume: int = Field(..., ge=0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
