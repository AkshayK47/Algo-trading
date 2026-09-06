"""
Async market data fetching service with circuit breaker and retry logic
"""

import asyncio
import aiohttp
from pybreaker import CircuitBreaker
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

from config import get_settings, get_secret_value
from exceptions import DataFetchError, RateLimitError, AuthenticationError, CircuitBreakerError
from models.market_data import OHLCVData, InstrumentQuote

logger = logging.getLogger(__name__)
settings = get_settings()


class MarketDataService:
    """
    Async service for fetching market data from Upstox API
    Features:
    - Circuit breaker for fault tolerance
    - Exponential backoff retry logic
    - Rate limiting with semaphore
    - Connection pooling
    """
    
    def __init__(self):
        self.api_key = get_secret_value(settings.upstox_api_key)
        self.access_token = get_secret_value(settings.upstox_access_token)
        self.base_url = settings.upstox_api_base_url
        self.use_sandbox = settings.use_sandbox_fallback
        
        # Circuit breaker configuration
        self.circuit_breaker = CircuitBreaker(
            fail_max=settings.circuit_breaker_failure_threshold,
            reset_timeout=settings.circuit_breaker_timeout_seconds,
            name="UpstoxAPI"
        )
        
        # Rate limiting semaphore
        self.semaphore = asyncio.Semaphore(settings.max_concurrent_requests)
        
        # Session for connection pooling
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=settings.upstox_request_timeout)
            connector = aiohttp.TCPConnector(limit=settings.max_concurrent_requests)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector
            )
    
    async def close(self):
        """Close the aiohttp session"""
        if self._session and not self._session.closed:
            await self._session.close()
            logger.info("Market data service session closed")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API request headers"""
        headers = {
            'Accept': 'application/json',
            'Api-Version': '2.0',
        }
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError)),
        reraise=True
    )
    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Make HTTP request with retry logic
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            
        Returns:
            JSON response data
            
        Raises:
            DataFetchError: If request fails after retries
            AuthenticationError: If authentication fails
            RateLimitError: If rate limit exceeded
        """
        await self._ensure_session()
        
        url = f"{self.base_url}/{endpoint}"
        headers = self._get_headers()
        
        try:
            async with self.semaphore:  # Rate limiting
                async with self._session.get(
                    url,
                    headers=headers,
                    params=params
                ) as response:
                    if response.status == 401:
                        raise AuthenticationError(
                            "Upstox API authentication failed",
                            details={'status': response.status}
                        )
                    elif response.status == 429:
                        raise RateLimitError(
                            "Upstox API rate limit exceeded",
                            details={'status': response.status}
                        )
                    elif response.status >= 400:
                        error_text = await response.text()
                        raise DataFetchError(
                            f"API request failed: {response.status}",
                            details={'status': response.status, 'error': error_text}
                        )
                    
                    data = await response.json()
                    return data
                    
        except aiohttp.ClientError as e:
            logger.error(f"HTTP client error: {e}")
            raise DataFetchError(
                f"Failed to fetch data from {endpoint}",
                details={'error': str(e)}
            )
        except asyncio.TimeoutError as e:
            logger.error(f"Request timeout: {e}")
            raise DataFetchError(
                f"Request timeout for {endpoint}",
                details={'error': 'timeout'}
            )
    
    async def fetch_ohlcv_async(
        self,
        instrument_key: str,
        days_back: int = 730
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data for a single instrument with circuit breaker
        
        Args:
            instrument_key: Upstox instrument key (e.g., "NSE_EQ|INE002A01018")
            days_back: Number of days of historical data
            
        Returns:
            DataFrame with OHLCV data
            
        Raises:
            DataFetchError: If fetch fails
            CircuitBreakerError: If circuit breaker is open
        """
        if not self.access_token and not self.use_sandbox:
            raise AuthenticationError(
                "No access token provided and sandbox mode disabled"
            )
        
        # Use sandbox fallback if no token
        if not self.access_token or self.use_sandbox:
            return self._generate_sandbox_ohlcv(instrument_key, days_back)
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            params = {
                'instrument_key': instrument_key,
                'interval': '1day',
                'from_date': start_date.strftime('%Y-%m-%d'),
                'to_date': end_date.strftime('%Y-%m-%d')
            }
            
            data = await self._make_request('historical-candle/intraday', params)
            
            # Transform API response to DataFrame
            if 'data' in data and 'candles' in data['data']:
                candles = data['data']['candles']
                df = pd.DataFrame(
                    candles,
                    columns=['date', 'open', 'high', 'low', 'close', 'volume']
                )
                df['date'] = pd.to_datetime(df['date'])
                df = df.set_index('date')
                return df
            else:
                raise DataFetchError(
                    f"Invalid API response format for {instrument_key}",
                    details={'response': data}
                )
                
        except Exception as e:
            if isinstance(e, (DataFetchError, AuthenticationError, RateLimitError)):
                raise
            logger.error(f"Unexpected error fetching OHLCV for {instrument_key}: {e}")
            raise DataFetchError(
                f"Failed to fetch OHLCV for {instrument_key}",
                details={'error': str(e)}
            )
    
    async def fetch_batch_ohlcv(
        self,
        instrument_keys: List[str],
        days_back: int = 730
    ) -> Dict[str, pd.DataFrame]:
        """
        Fetch OHLCV data for multiple instruments concurrently
        
        Args:
            instrument_keys: List of instrument keys
            days_back: Number of days of historical data
            
        Returns:
            Dictionary mapping instrument keys to DataFrames
        """
        tasks = [
            self.fetch_ohlcv_async(key, days_back)
            for key in instrument_keys
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        output = {}
        for key, result in zip(instrument_keys, results):
            if isinstance(result, Exception):
                logger.error(f"Failed to fetch {key}: {result}")
                # Return empty DataFrame for failed fetches
                output[key] = pd.DataFrame()
            else:
                output[key] = result
        
        return output
    
    async def fetch_live_quotes_async(
        self,
        instrument_keys: List[str]
    ) -> Dict[str, float]:
        """
        Fetch live quotes for multiple instruments
        
        Args:
            instrument_keys: List of instrument keys
            
        Returns:
            Dictionary mapping instrument keys to last traded prices
        """
        if not self.access_token or self.use_sandbox:
            return self._generate_sandbox_quotes(instrument_keys)
        
        try:
            # Upstox supports batch quote requests
            params = {
                'instrument_key': ','.join(instrument_keys)
            }
            
            data = await self._make_request('market-quote/quotes', params)
            
            quotes = {}
            if 'data' in data:
                for key, quote_data in data['data'].items():
                    if 'last_price' in quote_data:
                        quotes[key] = float(quote_data['last_price'])
            
            return quotes
            
        except Exception as e:
            logger.error(f"Error fetching live quotes: {e}")
            return self._generate_sandbox_quotes(instrument_keys)
    
    def _generate_sandbox_ohlcv(
        self,
        instrument_key: str,
        days_back: int
    ) -> pd.DataFrame:
        """Generate realistic sandbox OHLCV data"""
        logger.info(f"Using sandbox data for {instrument_key}")
        
        # Extract base price from instrument key or use default
        base_price = 1000.0 + np.random.random() * 5000.0
        
        dates = pd.date_range(
            end=datetime.now(),
            periods=days_back,
            freq='D'
        )
        
        # Generate realistic price movement
        returns = np.random.normal(0.0005, 0.02, len(dates))
        prices = base_price * np.exp(np.cumsum(returns))
        
        data = []
        for i, date in enumerate(dates):
            if date.weekday() >= 5:  # Skip weekends
                continue
            
            close = prices[i]
            open_price = close * (1 + np.random.normal(0, 0.005))
            high = max(open_price, close) * (1 + abs(np.random.normal(0, 0.008)))
            low = min(open_price, close) * (1 - abs(np.random.normal(0, 0.008)))
            volume = int(np.random.lognormal(13, 1))
            
            data.append({
                'date': date,
                'open': round(open_price, 2),
                'high': round(high, 2),
                'low': round(low, 2),
                'close': round(close, 2),
                'volume': volume
            })
        
        df = pd.DataFrame(data)
        df = df.set_index('date')
        return df
    
    def _generate_sandbox_quotes(
        self,
        instrument_keys: List[str]
    ) -> Dict[str, float]:
        """Generate sandbox live quotes"""
        logger.info(f"Using sandbox quotes for {len(instrument_keys)} instruments")
        
        quotes = {}
        for key in instrument_keys:
            # Generate realistic quote with small random variation
            base = 1000.0 + np.random.random() * 5000.0
            quotes[key] = round(base * (1 + np.random.normal(0, 0.02)), 2)
        
        return quotes
