"""
Pydantic models for Suggestion entity with comprehensive validation
"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
import re


class SuggestionBase(BaseModel):
    """Base suggestion model with common fields"""
    ticker: str = Field(..., min_length=2, max_length=10)
    market_cap_category: str = Field(..., min_length=1, max_length=100)
    entry_price: float = Field(..., gt=0, lt=1_000_000)
    expected_return_pct: float = Field(..., ge=-100, le=1000)
    backtest_win_rate: float = Field(..., ge=0, le=100)
    technical_justification: str = Field(..., min_length=10, max_length=500)
    captured_close_price: float = Field(..., gt=0, lt=1_000_000)
    stop_loss: Optional[float] = Field(None, gt=0, lt=1_000_000)
    
    @field_validator('ticker')
    @classmethod
    def validate_ticker(cls, v):
        """Validate ticker format - uppercase alphanumeric only"""
        if not re.match(r'^[A-Z]{2,10}$', v):
            raise ValueError('Ticker must be 2-10 uppercase letters')
        return v.upper()
    
    @field_validator('market_cap_category')
    @classmethod
    def validate_category(cls, v):
        """Validate market cap category"""
        valid_categories = [
            'Large-Cap (Nifty 100)',
            'Mid-Cap (Nifty Midcap 150)',
            'Small-Cap',
        ]
        if v not in valid_categories:
            raise ValueError(f'Category must be one of {valid_categories}')
        return v
    
    @field_validator('stop_loss')
    @classmethod
    def validate_stop_loss(cls, v, info):
        """Ensure stop loss is below entry price"""
        if v is not None and 'entry_price' in info.data:
            if v >= info.data['entry_price']:
                raise ValueError('Stop loss must be below entry price')
        return v
    
    class Config:
        str_strip_whitespace = True


class SuggestionCreate(SuggestionBase):
    """Model for creating new suggestions"""
    run_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    
    @field_validator('run_date')
    @classmethod
    def validate_date_format(cls, v):
        """Validate date is in correct format and not in future"""
        try:
            date_obj = datetime.strptime(v, '%Y-%m-%d')
            if date_obj > datetime.now():
                raise ValueError('Run date cannot be in the future')
        except ValueError as e:
            raise ValueError(f'Invalid date format: {e}')
        return v


class Suggestion(SuggestionBase):
    """Full suggestion model with database fields"""
    id: int
    run_date: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class SuggestionResponse(Suggestion):
    """Response model with computed fields"""
    current_price: Optional[float] = None
    current_return_pct: Optional[float] = None
    pnl_rupees: Optional[float] = None
    status: Optional[str] = None
    risk_pct: Optional[float] = None
    risk_reward_ratio: Optional[float] = None
    distance_to_stop_pct: Optional[float] = None
    stop_status: Optional[str] = None
    
    @field_validator('stop_status')
    @classmethod
    def validate_stop_status(cls, v):
        """Validate stop status values"""
        if v is not None and v not in ['SAFE', 'WARNING', 'BREACHED']:
            raise ValueError('Stop status must be SAFE, WARNING, or BREACHED')
        return v
