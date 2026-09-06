"""
Secure Configuration Management System
Centralizes all application settings with validation and type safety
"""

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    """Application configuration with secure defaults and validation"""
    
    # Application Metadata
    app_name: str = "NSE Alpha Quant"
    app_version: str = "2.0.0"
    environment: str = Field(default="production", env='ENVIRONMENT')
    debug: bool = Field(default=False, env='DEBUG')
    
    # API Configuration
    upstox_api_key: Optional[SecretStr] = Field(None, env='UPSTOX_API_KEY')
    upstox_access_token: Optional[SecretStr] = Field(None, env='UPSTOX_ACCESS_TOKEN')
    upstox_api_base_url: str = "https://api.upstox.com/v2"
    upstox_request_timeout: int = 30
    
    # Database Configuration
    database_url: str = Field("sqlite:///nse_alpha_quant.db", env='DATABASE_URL')
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_pool_timeout: int = 30
    database_pool_recycle: int = 3600
    
    # Backtest Configuration
    backtest_lookback_days: int = 252
    backtest_min_win_rate: float = 55.0
    backtest_max_drawdown: float = 15.0
    backtest_atr_stop_multiplier: float = 2.0
    backtest_holding_period_days: int = 65
    
    # Analysis Engine Configuration
    rsi_period: int = 14
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal_period: int = 9
    ema_short: int = 50
    ema_long: int = 200
    supertrend_period: int = 10
    supertrend_multiplier: float = 3.0
    bb_period: int = 20
    bb_std_dev: float = 2.0
    atr_period: int = 14
    adx_period: int = 14
    
    # Rate Limiting & Concurrency
    api_rate_limit_per_minute: int = 60
    max_concurrent_requests: int = 10
    request_retry_attempts: int = 3
    request_retry_min_wait: int = 2
    request_retry_max_wait: int = 10
    
    # Circuit Breaker Configuration
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_timeout_seconds: int = 60
    circuit_breaker_expected_exception: tuple = (Exception,)
    
    # Security Configuration
    allowed_ticker_pattern: str = r'^[A-Z]{2,10}$'
    max_ticker_length: int = 10
    min_ticker_length: int = 2
    max_price_value: float = 10_000_000.0
    min_price_value: float = 0.01
    
    # Logging Configuration
    log_level: str = Field(default="INFO", env='LOG_LEVEL')
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_file: Optional[str] = Field(None, env='LOG_FILE')
    
    # Cache Configuration
    cache_ttl_seconds: int = 300
    cache_max_size: int = 1000
    
    # Sandbox Mode
    use_sandbox_fallback: bool = Field(default=True, env='USE_SANDBOX_FALLBACK')
    
    # API Server Configuration (for React UI integration)
    api_host: str = Field(default="0.0.0.0", env='API_HOST')
    api_port: int = Field(default=8000, env='API_PORT')
    api_cors_origins: list = Field(
        default=["http://localhost:3000", "http://localhost:8501"],
        env='API_CORS_ORIGINS'
    )
    
    @field_validator('backtest_min_win_rate')
    @classmethod
    def validate_win_rate(cls, v):
        if not 0 <= v <= 100:
            raise ValueError('Win rate must be between 0 and 100')
        return v
    
    @field_validator('backtest_max_drawdown')
    @classmethod
    def validate_drawdown(cls, v):
        if not 0 <= v <= 100:
            raise ValueError('Max drawdown must be between 0 and 100')
        return v
    
    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Log level must be one of {valid_levels}')
        return v.upper()
    
    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Returns cached settings instance.
    Use this function to access settings throughout the application.
    """
    return Settings()


# Convenience function to get secret values safely
def get_secret_value(secret: Optional[SecretStr]) -> Optional[str]:
    """Safely extract secret string value"""
    if secret is None:
        return None
    return secret.get_secret_value()
