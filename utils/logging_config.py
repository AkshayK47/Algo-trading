"""
Structured logging configuration with security-aware redaction
"""

import logging
import sys
from typing import Any, Dict
from pythonjsonlogger import jsonlogger
from config import get_settings

settings = get_settings()


class SecurityRedactingFormatter(jsonlogger.JsonFormatter):
    """JSON formatter that redacts sensitive information"""
    
    SENSITIVE_KEYS = {
        'password', 'token', 'api_key', 'secret', 'authorization',
        'access_token', 'refresh_token', 'api_secret', 'private_key'
    }
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]):
        """Add fields to log record with sensitive data redaction"""
        super().add_fields(log_record, record, message_dict)
        
        # Redact sensitive fields
        for key in list(log_record.keys()):
            if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                log_record[key] = '***REDACTED***'
        
        # Add correlation ID if available
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id
        
        # Add request ID if available
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id


def setup_logging():
    """Configure application-wide logging"""
    
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler with JSON formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.log_level))
    
    formatter = SecurityRedactingFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        rename_fields={'levelname': 'level', 'asctime': 'timestamp'}
    )
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler if configured
    if settings.log_file:
        file_handler = logging.FileHandler(settings.log_file)
        file_handler.setLevel(getattr(logging, settings.log_level))
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Set third-party library log levels
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('aiohttp').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    
    logging.info(f"Logging configured at {settings.log_level} level")


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name"""
    return logging.getLogger(name)
