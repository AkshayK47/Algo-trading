"""
Database migration script to upgrade from old schema to new schema
"""

import sqlite3
import logging
from datetime import datetime
from pathlib import Path

from database_new import get_db_manager, SuggestionModel
from database.models import Base
from config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


def migrate_old_database():
    """
    Migrate data from old database.py schema to new SQLAlchemy schema
    """
    old_db_path = "nse_alpha_quant.db"
    backup_db_path = f"nse_alpha_quant_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    # Check if old database exists
    if not Path(old_db_path).exists():
        logger.info("No old database found, creating new database")
        db_manager = get_db_manager()
        db_manager.create_tables()
        return
    
    logger.info(f"Found old database: {old_db_path}")
    
    # Create backup
    logger.info(f"Creating backup: {backup_db_path}")
    import shutil
    shutil.copy2(old_db_path, backup_db_path)
    
    # Connect to old database
    old_conn = sqlite3.connect(old_db_path)
    old_conn.row_factory = sqlite3.Row
    old_cursor = old_conn.cursor()
    
    try:
        # Check if old table exists
        old_cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='suggestions'"
        )
        if not old_cursor.fetchone():
            logger.info("Old suggestions table not found, creating new database")
            db_manager = get_db_manager()
            db_manager.create_tables()
            return
        
        # Fetch all old records
        old_cursor.execute("SELECT * FROM suggestions")
        old_records = old_cursor.fetchall()
        
        logger.info(f"Found {len(old_records)} records in old database")
        
        if len(old_records) == 0:
            logger.info("No records to migrate")
            db_manager = get_db_manager()
            db_manager.create_tables()
            return
        
        # Initialize new database
        db_manager = get_db_manager()
        db_manager.create_tables()
        
        # Migrate records
        migrated_count = 0
        with db_manager.get_session() as session:
            for record in old_records:
                try:
                    # Map old schema to new schema
                    new_record = SuggestionModel(
                        id=record['id'],
                        run_date=record['run_date'],
                        ticker=record['ticker'],
                        market_cap_category=record['market_cap_category'],
                        entry_price=record['entry_price'],
                        expected_return_pct=record['expected_return_pct'],
                        backtest_win_rate=record['backtest_win_rate'],
                        technical_justification=record['technical_justification'],
                        captured_close_price=record['captured_close_price'],
                        stop_loss=record.get('stop_loss'),
                        created_at=datetime.fromisoformat(record['created_at']) if 'created_at' in record.keys() else datetime.utcnow()
                    )
                    
                    session.add(new_record)
                    migrated_count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating record {record['id']}: {e}")
            
            session.commit()
        
        logger.info(f"Successfully migrated {migrated_count} records")
        logger.info(f"Backup saved to: {backup_db_path}")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        old_conn.close()


if __name__ == "__main__":
    logger.info("Starting database migration...")
    migrate_old_database()
    logger.info("Migration complete!")
