"""
Database seeding with sample data
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from database.models import SuggestionModel
from models.suggestion import SuggestionCreate
from database.repository import SuggestionRepository

logger = logging.getLogger(__name__)


def seed_sample_data(session: Session) -> int:
    """
    Seed database with sample historical stock picks
    
    Args:
        session: Database session
        
    Returns:
        Number of records seeded
    """
    repository = SuggestionRepository(session)
    
    # Check if data already exists
    existing_count = repository.count()
    if existing_count > 0:
        logger.info(f"Database already contains {existing_count} records, skipping seed")
        return 0
    
    sample_picks = [
        {
            "run_date": "2024-05-15",
            "ticker": "RELIANCE",
            "market_cap_category": "Large-Cap (Nifty 100)",
            "entry_price": 2840.50,
            "expected_return_pct": 18.5,
            "backtest_win_rate": 68.4,
            "technical_justification": "50/200 EMA Golden Cross with Supertrend Bullish confirmation and Volume surge",
            "captured_close_price": 2855.00,
            "stop_loss": 2685.00
        },
        {
            "run_date": "2024-06-03",
            "ticker": "POLYCAB",
            "market_cap_category": "Mid-Cap (Nifty Midcap 150)",
            "entry_price": 6420.00,
            "expected_return_pct": 24.0,
            "backtest_win_rate": 72.0,
            "technical_justification": "Symmetrical Triangle Breakout with Volume Expansion (+210% 20d SMA)",
            "captured_close_price": 6450.00,
            "stop_loss": 6050.00
        },
        {
            "run_date": "2024-07-10",
            "ticker": "TRENT",
            "market_cap_category": "Large-Cap (Nifty 100)",
            "entry_price": 5320.00,
            "expected_return_pct": 28.5,
            "backtest_win_rate": 75.6,
            "technical_justification": "Adaptive Hybrid Breakout from 8-week Keltner Squeeze with ADX > 30",
            "captured_close_price": 5360.00,
            "stop_loss": 5040.00
        },
        {
            "run_date": "2024-08-01",
            "ticker": "PERSISTENT",
            "market_cap_category": "Mid-Cap (Nifty Midcap 150)",
            "entry_price": 4510.00,
            "expected_return_pct": 19.8,
            "backtest_win_rate": 64.2,
            "technical_justification": "Bullish MACD Zero-Line Divergence with 20 EMA pullback retest",
            "captured_close_price": 4530.00,
            "stop_loss": 4260.00
        },
        {
            "run_date": "2024-08-20",
            "ticker": "ICICIBANK",
            "market_cap_category": "Large-Cap (Nifty 100)",
            "entry_price": 1180.00,
            "expected_return_pct": 15.2,
            "backtest_win_rate": 66.8,
            "technical_justification": "Double Bottom structural breakout with RSI rebound above 52",
            "captured_close_price": 1192.50,
            "stop_loss": 1125.00
        }
    ]
    
    count = 0
    for pick_data in sample_picks:
        try:
            suggestion = SuggestionCreate(**pick_data)
            suggestion_id = repository.save(suggestion)
            if suggestion_id:
                count += 1
        except Exception as e:
            logger.error(f"Error seeding {pick_data['ticker']}: {e}")
    
    session.commit()
    logger.info(f"Seeded {count} sample historical stock picks")
    return count
