"""
Custom exception hierarchy for the application
Provides clear error categorization and handling
"""


class AlgoTradingException(Exception):
    """Base exception for all application errors"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(AlgoTradingException):
    """Raised when input validation fails"""
    pass


class DataFetchError(AlgoTradingException):
    """Raised when external API calls fail"""
    pass


class BacktestError(AlgoTradingException):
    """Raised when backtest execution fails"""
    pass


class DatabaseError(AlgoTradingException):
    """Raised when database operations fail"""
    pass


class ConfigurationError(AlgoTradingException):
    """Raised when configuration is invalid"""
    pass


class AuthenticationError(AlgoTradingException):
    """Raised when API authentication fails"""
    pass


class RateLimitError(AlgoTradingException):
    """Raised when API rate limits are exceeded"""
    pass


class CircuitBreakerError(AlgoTradingException):
    """Raised when circuit breaker is open"""
    pass


class InsufficientDataError(AlgoTradingException):
    """Raised when insufficient historical data is available"""
    pass
