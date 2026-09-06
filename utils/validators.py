"""
Input validation utilities with security-first approach
"""

import re
from typing import Optional
from datetime import datetime
from exceptions import ValidationError


class InputValidator:
    """Centralized input validation with security checks"""
    
    TICKER_PATTERN = re.compile(r'^[A-Z]{2,10}$')
    DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    
    @staticmethod
    def validate_ticker(ticker: str) -> str:
        """
        Validate and sanitize ticker symbol
        
        Args:
            ticker: Raw ticker input
            
        Returns:
            Sanitized uppercase ticker
            
        Raises:
            ValidationError: If ticker format is invalid
        """
        if not ticker:
            raise ValidationError("Ticker cannot be empty")
        
        # Remove whitespace and convert to uppercase
        ticker = ticker.strip().upper()
        
        # Check length
        if len(ticker) < 2 or len(ticker) > 10:
            raise ValidationError(
                f"Ticker length must be 2-10 characters, got {len(ticker)}"
            )
        
        # Check format
        if not InputValidator.TICKER_PATTERN.match(ticker):
            raise ValidationError(
                f"Invalid ticker format: {ticker}. Must contain only uppercase letters."
            )
        
        return ticker
    
    @staticmethod
    def validate_price(price: float, field_name: str = "price") -> float:
        """
        Validate price value
        
        Args:
            price: Price value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Validated price
            
        Raises:
            ValidationError: If price is invalid
        """
        if not isinstance(price, (int, float)):
            raise ValidationError(f"{field_name} must be a number")
        
        if price <= 0:
            raise ValidationError(f"{field_name} must be positive, got {price}")
        
        if price > 10_000_000:
            raise ValidationError(
                f"{field_name} exceeds maximum allowed value of 10,000,000"
            )
        
        return float(price)
    
    @staticmethod
    def validate_percentage(
        percentage: float,
        field_name: str = "percentage",
        min_val: float = -100,
        max_val: float = 1000
    ) -> float:
        """
        Validate percentage value
        
        Args:
            percentage: Percentage value to validate
            field_name: Name of the field for error messages
            min_val: Minimum allowed value
            max_val: Maximum allowed value
            
        Returns:
            Validated percentage
            
        Raises:
            ValidationError: If percentage is invalid
        """
        if not isinstance(percentage, (int, float)):
            raise ValidationError(f"{field_name} must be a number")
        
        if percentage < min_val or percentage > max_val:
            raise ValidationError(
                f"{field_name} must be between {min_val} and {max_val}, got {percentage}"
            )
        
        return float(percentage)
    
    @staticmethod
    def validate_date(date_str: str) -> str:
        """
        Validate date string format
        
        Args:
            date_str: Date string in YYYY-MM-DD format
            
        Returns:
            Validated date string
            
        Raises:
            ValidationError: If date format is invalid
        """
        if not date_str:
            raise ValidationError("Date cannot be empty")
        
        date_str = date_str.strip()
        
        # Check format
        if not InputValidator.DATE_PATTERN.match(date_str):
            raise ValidationError(
                f"Invalid date format: {date_str}. Expected YYYY-MM-DD"
            )
        
        # Validate actual date
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError as e:
            raise ValidationError(f"Invalid date: {e}")
        
        # Check not in future
        if date_obj > datetime.now():
            raise ValidationError(f"Date cannot be in the future: {date_str}")
        
        return date_str
    
    @staticmethod
    def validate_instrument_key(instrument_key: str) -> str:
        """
        Validate Upstox instrument key format
        
        Args:
            instrument_key: Instrument key (e.g., "NSE_EQ|INE002A01018")
            
        Returns:
            Validated instrument key
            
        Raises:
            ValidationError: If format is invalid
        """
        if not instrument_key:
            raise ValidationError("Instrument key cannot be empty")
        
        instrument_key = instrument_key.strip()
        
        # Basic format check
        if '|' not in instrument_key:
            raise ValidationError(
                f"Invalid instrument key format: {instrument_key}. Expected 'EXCHANGE|ISIN'"
            )
        
        parts = instrument_key.split('|')
        if len(parts) != 2:
            raise ValidationError(
                f"Invalid instrument key format: {instrument_key}"
            )
        
        exchange, isin = parts
        
        # Validate exchange
        valid_exchanges = ['NSE_EQ', 'BSE_EQ', 'NSE_FO', 'BSE_FO', 'MCX_FO']
        if exchange not in valid_exchanges:
            raise ValidationError(
                f"Invalid exchange: {exchange}. Must be one of {valid_exchanges}"
            )
        
        # Validate ISIN format (basic check)
        if not re.match(r'^[A-Z]{2}[A-Z0-9]{9}[0-9]$', isin):
            raise ValidationError(f"Invalid ISIN format: {isin}")
        
        return instrument_key
    
    @staticmethod
    def sanitize_string(
        input_str: str,
        max_length: int = 500,
        allow_special_chars: bool = False
    ) -> str:
        """
        Sanitize string input to prevent injection attacks
        
        Args:
            input_str: Raw string input
            max_length: Maximum allowed length
            allow_special_chars: Whether to allow special characters
            
        Returns:
            Sanitized string
            
        Raises:
            ValidationError: If input is invalid
        """
        if not input_str:
            return ""
        
        # Strip whitespace
        sanitized = input_str.strip()
        
        # Check length
        if len(sanitized) > max_length:
            raise ValidationError(
                f"String exceeds maximum length of {max_length} characters"
            )
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # If special chars not allowed, keep only alphanumeric and basic punctuation
        if not allow_special_chars:
            sanitized = re.sub(r'[^a-zA-Z0-9\s\.,\-\(\)%:/]', '', sanitized)
        
        return sanitized
