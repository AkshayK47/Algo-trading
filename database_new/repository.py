"""
Repository pattern for database operations
Provides clean abstraction over database access
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import List, Optional
from datetime import datetime
import logging

from database_new.models import SuggestionModel
from models.suggestion import Suggestion, SuggestionCreate
from exceptions import DatabaseError, ValidationError

logger = logging.getLogger(__name__)


class SuggestionRepository:
    """Repository for Suggestion entity operations"""
    
    def __init__(self, session: Session):
        self._session = session
    
    def save(self, suggestion: SuggestionCreate) -> Optional[int]:
        """
        Save a new suggestion to the database with duplicate prevention
        
        Args:
            suggestion: Validated suggestion data
            
        Returns:
            ID of the saved suggestion, or existing ID if duplicate
            
        Raises:
            DatabaseError: If database operation fails
            ValidationError: If data validation fails
        """
        try:
            # Check for existing suggestion (within same transaction)
            existing = self.find_by_ticker_and_date(
                suggestion.ticker,
                suggestion.run_date
            )
            
            if existing:
                logger.info(
                    f"Suggestion for {suggestion.ticker} on {suggestion.run_date} "
                    f"already exists (ID: {existing.id})"
                )
                return existing.id
            
            # Calculate default stop loss if not provided
            stop_loss = suggestion.stop_loss
            if stop_loss is None or stop_loss <= 0:
                stop_loss = round(suggestion.entry_price * 0.945, 2)
            
            # Create new suggestion
            db_suggestion = SuggestionModel(
                run_date=suggestion.run_date,
                ticker=suggestion.ticker.upper(),
                market_cap_category=suggestion.market_cap_category,
                entry_price=suggestion.entry_price,
                expected_return_pct=suggestion.expected_return_pct,
                backtest_win_rate=suggestion.backtest_win_rate,
                technical_justification=suggestion.technical_justification,
                captured_close_price=suggestion.captured_close_price,
                stop_loss=stop_loss,
            )
            
            self._session.add(db_suggestion)
            self._session.flush()  # Get the ID without committing
            
            logger.info(
                f"Successfully saved suggestion {suggestion.ticker} "
                f"(ID: {db_suggestion.id}) with Stop Loss ₹{stop_loss}"
            )
            
            return db_suggestion.id
            
        except IntegrityError as e:
            # Handle race condition - another process inserted the same record
            self._session.rollback()
            logger.warning(f"Duplicate suggestion detected: {e}")
            existing = self.find_by_ticker_and_date(
                suggestion.ticker,
                suggestion.run_date
            )
            return existing.id if existing else None
            
        except SQLAlchemyError as e:
            self._session.rollback()
            logger.error(f"Database error saving suggestion: {e}")
            raise DatabaseError(
                f"Failed to save suggestion for {suggestion.ticker}",
                details={'error': str(e)}
            )
    
    def find_by_id(self, suggestion_id: int) -> Optional[Suggestion]:
        """Find suggestion by ID"""
        try:
            db_suggestion = self._session.query(SuggestionModel).filter(
                SuggestionModel.id == suggestion_id
            ).first()
            
            if db_suggestion:
                return Suggestion.from_orm(db_suggestion)
            return None
            
        except SQLAlchemyError as e:
            logger.error(f"Error finding suggestion by ID {suggestion_id}: {e}")
            raise DatabaseError(
                f"Failed to find suggestion {suggestion_id}",
                details={'error': str(e)}
            )
    
    def find_by_ticker_and_date(
        self,
        ticker: str,
        run_date: str
    ) -> Optional[Suggestion]:
        """Find suggestion by ticker and run date"""
        try:
            db_suggestion = self._session.query(SuggestionModel).filter(
                SuggestionModel.ticker == ticker.upper(),
                SuggestionModel.run_date == run_date
            ).first()
            
            if db_suggestion:
                return Suggestion.from_orm(db_suggestion)
            return None
            
        except SQLAlchemyError as e:
            logger.error(f"Error finding suggestion for {ticker} on {run_date}: {e}")
            raise DatabaseError(
                f"Failed to find suggestion for {ticker}",
                details={'error': str(e)}
            )
    
    def find_all(self, limit: Optional[int] = None) -> List[Suggestion]:
        """
        Find all suggestions ordered by most recent
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of suggestions
        """
        try:
            query = self._session.query(SuggestionModel).order_by(
                SuggestionModel.id.desc()
            )
            
            if limit:
                query = query.limit(limit)
            
            db_suggestions = query.all()
            return [Suggestion.from_orm(s) for s in db_suggestions]
            
        except SQLAlchemyError as e:
            logger.error(f"Error fetching all suggestions: {e}")
            raise DatabaseError(
                "Failed to fetch suggestions",
                details={'error': str(e)}
            )
    
    def find_by_ticker(self, ticker: str) -> List[Suggestion]:
        """Find all suggestions for a specific ticker"""
        try:
            db_suggestions = self._session.query(SuggestionModel).filter(
                SuggestionModel.ticker == ticker.upper()
            ).order_by(SuggestionModel.run_date.desc()).all()
            
            return [Suggestion.from_orm(s) for s in db_suggestions]
            
        except SQLAlchemyError as e:
            logger.error(f"Error finding suggestions for {ticker}: {e}")
            raise DatabaseError(
                f"Failed to find suggestions for {ticker}",
                details={'error': str(e)}
            )
    
    def delete(self, suggestion_id: int) -> bool:
        """
        Delete a suggestion by ID
        
        Args:
            suggestion_id: ID of suggestion to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            result = self._session.query(SuggestionModel).filter(
                SuggestionModel.id == suggestion_id
            ).delete()
            
            self._session.flush()
            
            if result > 0:
                logger.info(f"Deleted suggestion {suggestion_id}")
                return True
            else:
                logger.warning(f"Suggestion {suggestion_id} not found for deletion")
                return False
                
        except SQLAlchemyError as e:
            self._session.rollback()
            logger.error(f"Error deleting suggestion {suggestion_id}: {e}")
            raise DatabaseError(
                f"Failed to delete suggestion {suggestion_id}",
                details={'error': str(e)}
            )
    
    def count(self) -> int:
        """Count total number of suggestions"""
        try:
            return self._session.query(SuggestionModel).count()
        except SQLAlchemyError as e:
            logger.error(f"Error counting suggestions: {e}")
            raise DatabaseError(
                "Failed to count suggestions",
                details={'error': str(e)}
            )
