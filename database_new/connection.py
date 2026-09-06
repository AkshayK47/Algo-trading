"""
Database connection management with connection pooling
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator
import logging

from config import get_settings
from database_new.models import Base

logger = logging.getLogger(__name__)
settings = get_settings()


class DatabaseManager:
    """Manages database connections and sessions"""
    
    def __init__(self):
        self._engine = None
        self._session_factory = None
        self._initialize()
    
    def _initialize(self):
        """Initialize database engine and session factory"""
        try:
            # Create engine with connection pooling
            self._engine = create_engine(
                settings.database_url,
                poolclass=QueuePool,
                pool_size=settings.database_pool_size,
                max_overflow=settings.database_max_overflow,
                pool_timeout=settings.database_pool_timeout,
                pool_recycle=settings.database_pool_recycle,
                echo=settings.debug,
                connect_args={'check_same_thread': False} if 'sqlite' in settings.database_url else {}
            )
            
            # Enable foreign keys for SQLite
            if 'sqlite' in settings.database_url:
                @event.listens_for(self._engine, "connect")
                def set_sqlite_pragma(dbapi_conn, connection_record):
                    cursor = dbapi_conn.cursor()
                    cursor.execute("PRAGMA foreign_keys=ON")
                    cursor.execute("PRAGMA journal_mode=WAL")
                    cursor.close()
            
            # Create session factory
            self._session_factory = sessionmaker(
                bind=self._engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False
            )
            
            logger.info(f"Database initialized: {settings.database_url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def create_tables(self):
        """Create all tables in the database"""
        try:
            Base.metadata.create_all(bind=self._engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise
    
    def drop_tables(self):
        """Drop all tables (use with caution!)"""
        try:
            Base.metadata.drop_all(bind=self._engine)
            logger.warning("All database tables dropped")
        except Exception as e:
            logger.error(f"Failed to drop tables: {e}")
            raise
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """
        Context manager for database sessions with automatic cleanup
        
        Usage:
            with db_manager.get_session() as session:
                # Use session here
                pass
        """
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {e}")
            raise
        finally:
            session.close()
    
    def get_engine(self):
        """Get the database engine"""
        return self._engine
    
    def close(self):
        """Close all database connections"""
        if self._engine:
            self._engine.dispose()
            logger.info("Database connections closed")


# Global database manager instance
_db_manager = None


def get_db_manager() -> DatabaseManager:
    """Get or create the global database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


def get_db_session() -> Generator[Session, None, None]:
    """
    Dependency injection function for FastAPI/Flask
    
    Usage in FastAPI:
        @app.get("/suggestions")
        def get_suggestions(session: Session = Depends(get_db_session)):
            ...
    """
    db_manager = get_db_manager()
    with db_manager.get_session() as session:
        yield session
