"""
SQLAlchemy ORM models for database tables
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Index, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class SuggestionModel(Base):
    """SQLAlchemy model for suggestions table"""
    __tablename__ = 'suggestions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_date = Column(String(10), nullable=False, index=True)
    ticker = Column(String(10), nullable=False, index=True)
    market_cap_category = Column(String(100), nullable=False)
    entry_price = Column(Float, nullable=False)
    expected_return_pct = Column(Float, nullable=False)
    backtest_win_rate = Column(Float, nullable=False)
    technical_justification = Column(String(500), nullable=False)
    captured_close_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Composite unique constraint to prevent duplicates
    __table_args__ = (
        UniqueConstraint('ticker', 'run_date', name='uq_ticker_run_date'),
        Index('idx_ticker_date', 'ticker', 'run_date'),
        Index('idx_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Suggestion(id={self.id}, ticker={self.ticker}, run_date={self.run_date})>"
