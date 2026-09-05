"""
Database schema and transaction management for NSE Alpha Quant.
Manages local SQLite database transactions, suggestions table, and historical tracking.
"""

import sqlite3
import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = "nse_alpha_quant.db"


def get_db_connection(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """
    Creates and returns a connection to the SQLite database with row factory.
    """
    try:
        conn = sqlite3.connect(db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        logger.error(f"Error connecting to SQLite database at {db_path}: {e}")
        raise


def init_db(db_path: str = DEFAULT_DB_PATH) -> bool:
    """
    Initializes the SQLite database with the required `suggestions` table
    matching the quantitative advisory specifications.
    """
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date TEXT NOT NULL,
        ticker TEXT NOT NULL,
        market_cap_category TEXT NOT NULL,
        entry_price REAL NOT NULL,
        expected_return_pct REAL NOT NULL,
        backtest_win_rate REAL NOT NULL,
        technical_justification TEXT NOT NULL,
        captured_close_price REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(create_table_sql)
            # Create index for fast symbol and date lookups
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_suggestions_ticker ON suggestions(ticker);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_suggestions_date ON suggestions(run_date);")
            conn.commit()
            logger.info(f"Database initialized successfully at {db_path}")
            return True
    except sqlite3.Error as e:
        logger.error(f"Database initialization failed: {e}")
        return False


def save_suggestion(
    db_path: str,
    run_date: str,
    ticker: str,
    market_cap_category: str,
    entry_price: float,
    expected_return_pct: float,
    backtest_win_rate: float,
    technical_justification: str,
    captured_close_price: float
) -> Optional[int]:
    """
    Safely inserts an approved stock recommendation into the SQLite database.
    Prevents duplicate entries for the same ticker on the same run_date.
    """
    check_sql = "SELECT id FROM suggestions WHERE ticker = ? AND run_date = ? LIMIT 1"
    insert_sql = """
    INSERT INTO suggestions (
        run_date, ticker, market_cap_category, entry_price,
        expected_return_pct, backtest_win_rate, technical_justification, captured_close_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(check_sql, (ticker, run_date))
            existing = cursor.fetchone()
            if existing:
                logger.info(f"Recommendation for {ticker} on {run_date} already exists (ID: {existing['id']}).")
                return existing['id']

            cursor.execute(
                insert_sql,
                (
                    run_date,
                    ticker.upper(),
                    market_cap_category,
                    float(entry_price),
                    float(expected_return_pct),
                    float(backtest_win_rate),
                    technical_justification,
                    float(captured_close_price),
                )
            )
            conn.commit()
            inserted_id = cursor.lastrowid
            logger.info(f"Successfully recorded suggestion {ticker} (ID: {inserted_id}) into {db_path}")
            return inserted_id
    except sqlite3.Error as e:
        logger.error(f"Failed to save suggestion for {ticker}: {e}")
        return None


def get_all_suggestions(db_path: str = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """
    Fetches all recorded suggestions ordered by most recent run date and ID.
    """
    query = """
    SELECT 
        id, run_date, ticker, market_cap_category,
        entry_price, expected_return_pct, backtest_win_rate,
        technical_justification, captured_close_price
    FROM suggestions
    ORDER BY id DESC;
    """
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except sqlite3.Error as e:
        logger.error(f"Failed to fetch suggestions from {db_path}: {e}")
        return []


def delete_suggestion(db_path: str, suggestion_id: int) -> bool:
    """
    Deletes a suggestion by ID.
    """
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM suggestions WHERE id = ?", (suggestion_id,))
            conn.commit()
            return cursor.rowcount > 0
    except sqlite3.Error as e:
        logger.error(f"Failed to delete suggestion {suggestion_id}: {e}")
        return False


def seed_sample_data(db_path: str = DEFAULT_DB_PATH) -> None:
    """
    Seeds initial realistic Indian market stock picks if the table is empty.
    Provides immediate historical performance demonstration out-of-the-box.
    """
    existing = get_all_suggestions(db_path)
    if existing:
        return

    sample_picks = [
        {
            "run_date": "2024-05-15",
            "ticker": "RELIANCE",
            "market_cap_category": "Large-Cap (Nifty 100)",
            "entry_price": 2840.50,
            "expected_return_pct": 18.5,
            "backtest_win_rate": 68.4,
            "technical_justification": "50/200 EMA Golden Cross with Supertrend Bullish confirmation and Volume surge",
            "captured_close_price": 2855.00
        },
        {
            "run_date": "2024-06-03",
            "ticker": "POLYCAB",
            "market_cap_category": "Mid-Cap (Nifty Midcap 150)",
            "entry_price": 6420.00,
            "expected_return_pct": 24.0,
            "backtest_win_rate": 72.0,
            "technical_justification": "Symmetrical Triangle Breakout with Volume Expansion (+210% 20d SMA)",
            "captured_close_price": 6450.00
        },
        {
            "run_date": "2024-07-10",
            "ticker": "TRENT",
            "market_cap_category": "Large-Cap (Nifty 100)",
            "entry_price": 5320.00,
            "expected_return_pct": 28.5,
            "backtest_win_rate": 75.6,
            "technical_justification": "Adaptive Hybrid Breakout from 8-week Keltner Squeeze with ADX > 30",
            "captured_close_price": 5360.00
        },
        {
            "run_date": "2024-08-01",
            "ticker": "PERSISTENT",
            "market_cap_category": "Mid-Cap (Nifty Midcap 150)",
            "entry_price": 4510.00,
            "expected_return_pct": 19.8,
            "backtest_win_rate": 64.2,
            "technical_justification": "Bullish MACD Zero-Line Divergence with 20 EMA pullback retest",
            "captured_close_price": 4530.00
        },
        {
            "run_date": "2024-08-20",
            "ticker": "ICICIBANK",
            "market_cap_category": "Large-Cap (Nifty 100)",
            "entry_price": 1180.00,
            "expected_return_pct": 15.2,
            "backtest_win_rate": 66.8,
            "technical_justification": "Double Bottom structural breakout with RSI rebound above 52",
            "captured_close_price": 1192.50
        }
    ]

    for pick in sample_picks:
        save_suggestion(
            db_path=db_path,
            run_date=pick["run_date"],
            ticker=pick["ticker"],
            market_cap_category=pick["market_cap_category"],
            entry_price=pick["entry_price"],
            expected_return_pct=pick["expected_return_pct"],
            backtest_win_rate=pick["backtest_win_rate"],
            technical_justification=pick["technical_justification"],
            captured_close_price=pick["captured_close_price"]
        )
    logger.info(f"Seeded {len(sample_picks)} sample historical stock picks into {db_path}")
