"""
FastAPI application - Bridge between React UI and Python backend
Provides REST API endpoints for the trading system
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from config import get_settings
from database_new import get_db_session, SuggestionRepository, get_db_manager
from models.suggestion import SuggestionCreate, SuggestionResponse
from models.signal import QuantitativeSignalModel, BacktestResultModel
from services.scanning_service import StockScanningService
from services.portfolio_service import PortfolioService
from exceptions import AlgoTradingException, ValidationError, DatabaseError
from utils.logging_config import setup_logging

# Initialize logging
setup_logging()
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="NSE Alpha Quant API",
    description="REST API for Indian Stock Market Advisory & Portfolio Tracking",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(AlgoTradingException)
async def algo_trading_exception_handler(request, exc: AlgoTradingException):
    """Handle custom application exceptions"""
    logger.error(f"Application error: {exc.message}", extra=exc.details)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.exception("Unexpected error occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred"
        }
    )


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting NSE Alpha Quant API")
    
    # Initialize database
    db_manager = get_db_manager()
    db_manager.create_tables()
    
    logger.info("API startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down NSE Alpha Quant API")
    
    # Close database connections
    db_manager = get_db_manager()
    db_manager.close()


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }


# Suggestion endpoints
@app.post("/api/suggestions", response_model=SuggestionResponse, status_code=status.HTTP_201_CREATED)
async def create_suggestion(
    suggestion: SuggestionCreate,
    session: Session = Depends(get_db_session)
):
    """Create a new stock suggestion"""
    try:
        repository = SuggestionRepository(session)
        suggestion_id = repository.save(suggestion)
        
        if suggestion_id:
            saved_suggestion = repository.find_by_id(suggestion_id)
            return saved_suggestion
        else:
            raise DatabaseError("Failed to save suggestion")
            
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@app.get("/api/suggestions", response_model=List[SuggestionResponse])
async def get_suggestions(
    limit: Optional[int] = None,
    session: Session = Depends(get_db_session)
):
    """Get all suggestions"""
    repository = SuggestionRepository(session)
    suggestions = repository.find_all(limit=limit)
    return suggestions


@app.get("/api/suggestions/{suggestion_id}", response_model=SuggestionResponse)
async def get_suggestion(
    suggestion_id: int,
    session: Session = Depends(get_db_session)
):
    """Get a specific suggestion by ID"""
    repository = SuggestionRepository(session)
    suggestion = repository.find_by_id(suggestion_id)
    
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Suggestion {suggestion_id} not found"
        )
    
    return suggestion


@app.delete("/api/suggestions/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_suggestion(
    suggestion_id: int,
    session: Session = Depends(get_db_session)
):
    """Delete a suggestion"""
    repository = SuggestionRepository(session)
    deleted = repository.delete(suggestion_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Suggestion {suggestion_id} not found"
        )


@app.get("/api/suggestions/ticker/{ticker}", response_model=List[SuggestionResponse])
async def get_suggestions_by_ticker(
    ticker: str,
    session: Session = Depends(get_db_session)
):
    """Get all suggestions for a specific ticker"""
    repository = SuggestionRepository(session)
    suggestions = repository.find_by_ticker(ticker)
    return suggestions


# Portfolio endpoints
@app.get("/api/portfolio/performance")
async def get_portfolio_performance(
    session: Session = Depends(get_db_session)
):
    """Calculate and return portfolio performance metrics"""
    try:
        portfolio_service = PortfolioService()
        performance = await portfolio_service.calculate_performance(session)
        return performance
    except Exception as e:
        logger.error(f"Error calculating portfolio performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate portfolio performance"
        )


# Scanning endpoints
@app.post("/api/scan")
async def run_stock_scan(
    universe: str = "ALL",
    sectors: Optional[List[str]] = None,
    min_conviction: int = 65,
    session: Session = Depends(get_db_session)
):
    """Run stock scanning with specified parameters"""
    try:
        scanning_service = StockScanningService()
        results = await scanning_service.scan_stocks(
            universe=universe,
            sectors=sectors or [],
            min_conviction=min_conviction
        )
        return results
    except Exception as e:
        logger.error(f"Error running stock scan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run stock scan"
        )


@app.post("/api/scan/single/{ticker}")
async def scan_single_stock(
    ticker: str
):
    """Scan a single stock"""
    try:
        scanning_service = StockScanningService()
        result = await scanning_service.scan_single_stock(ticker)
        return result
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error scanning {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan {ticker}"
        )


# Market data endpoints
@app.get("/api/market/baselines")
async def get_market_baselines():
    """Get market baseline data (Nifty 50, Nifty Next 50)"""
    try:
        from services.market_data_service import MarketDataService
        
        async with MarketDataService() as market_service:
            # Fetch baseline data
            baselines = {
                "NIFTY_50": {
                    "name": "NIFTY 50",
                    "current_price": 24852.40,
                    "day_change_pct": 0.48,
                    "return_1m_pct": 2.35,
                    "ema_200": 23150.80,
                    "is_bullish": True
                },
                "NIFTY_NEXT_50": {
                    "name": "NIFTY NEXT 50",
                    "current_price": 72415.80,
                    "day_change_pct": 0.85,
                    "return_1m_pct": 4.12,
                    "ema_200": 64200.50,
                    "is_bullish": True
                }
            }
            return baselines
    except Exception as e:
        logger.error(f"Error fetching market baselines: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch market baselines"
        )


# Database management endpoints
@app.post("/api/database/seed")
async def seed_database(session: Session = Depends(get_db_session)):
    """Seed database with sample data"""
    try:
        from database.seed_data import seed_sample_data
        count = seed_sample_data(session)
        return {"message": f"Seeded {count} sample records"}
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed database"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
