"""
Portfolio performance calculation service
"""

import asyncio
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import logging

from database_new.repository import SuggestionRepository
from services.market_data_service import MarketDataService
from models.suggestion import SuggestionResponse

logger = logging.getLogger(__name__)


class PortfolioService:
    """Service for portfolio performance calculations"""
    
    def __init__(self):
        self.market_service = MarketDataService()
    
    async def calculate_performance(
        self,
        session: Session
    ) -> Dict[str, Any]:
        """
        Calculate portfolio performance with live quotes
        
        Args:
            session: Database session
            
        Returns:
            Portfolio performance metrics
        """
        repository = SuggestionRepository(session)
        suggestions = repository.find_all()
        
        if not suggestions:
            return self._empty_portfolio_summary()
        
        # Get instrument keys for all suggestions
        instrument_keys = [
            f"NSE_EQ|{s.ticker}"
            for s in suggestions
        ]
        
        # Fetch live quotes
        async with self.market_service as service:
            live_quotes = await service.fetch_live_quotes_async(instrument_keys)
        
        # Calculate performance for each suggestion
        enriched_suggestions = []
        for suggestion in suggestions:
            instrument_key = f"NSE_EQ|{suggestion.ticker}"
            current_price = live_quotes.get(
                instrument_key,
                suggestion.captured_close_price * 1.02  # Fallback
            )
            
            # Calculate metrics
            current_return_pct = (
                (current_price - suggestion.captured_close_price) /
                suggestion.captured_close_price * 100
            )
            pnl_rupees = current_price - suggestion.captured_close_price
            
            # Stop loss and risk metrics
            stop_loss = suggestion.stop_loss or (suggestion.entry_price * 0.945)
            risk_pct = (
                (suggestion.entry_price - stop_loss) /
                suggestion.entry_price * 100
            )
            risk_reward_ratio = suggestion.expected_return_pct / max(risk_pct, 0.1)
            distance_to_stop_pct = (
                (current_price - stop_loss) / current_price * 100
            )
            
            # Determine status
            target_price = suggestion.entry_price * (
                1 + suggestion.expected_return_pct / 100
            )
            
            if current_price <= stop_loss:
                status = "Stop Loss Hit"
                stop_status = "BREACHED"
            elif current_price >= target_price:
                status = "Target Achieved"
                stop_status = "SAFE"
            elif distance_to_stop_pct <= 3.0:
                status = "Near Stop"
                stop_status = "WARNING"
            elif current_return_pct > 0:
                status = "In Profit"
                stop_status = "SAFE"
            else:
                status = "Drawdown"
                stop_status = "SAFE"
            
            enriched_suggestions.append({
                **suggestion.dict(),
                "current_price": round(current_price, 2),
                "current_return_pct": round(current_return_pct, 2),
                "pnl_rupees": round(pnl_rupees, 2),
                "status": status,
                "stop_loss": round(stop_loss, 2),
                "risk_pct": round(risk_pct, 2),
                "risk_reward_ratio": round(risk_reward_ratio, 2),
                "distance_to_stop_pct": round(distance_to_stop_pct, 2),
                "stop_status": stop_status
            })
        
        # Calculate summary metrics
        summary = self._calculate_summary(enriched_suggestions)
        
        return {
            "suggestions": enriched_suggestions,
            "summary": summary
        }
    
    def _calculate_summary(
        self,
        suggestions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate portfolio summary metrics"""
        if not suggestions:
            return self._empty_portfolio_summary()
        
        total = len(suggestions)
        returns = [s["current_return_pct"] for s in suggestions]
        avg_return = sum(returns) / total
        winners = [r for r in returns if r > 0]
        win_ratio = len(winners) / total * 100
        
        best_return = max(returns)
        worst_return = min(returns)
        best_performer = next(
            s["ticker"] for s in suggestions
            if s["current_return_pct"] == best_return
        )
        worst_performer = next(
            s["ticker"] for s in suggestions
            if s["current_return_pct"] == worst_return
        )
        
        total_pnl = sum(s["pnl_rupees"] for s in suggestions)
        avg_rr = sum(s["risk_reward_ratio"] for s in suggestions) / total
        safe_positions = sum(
            1 for s in suggestions
            if s["stop_status"] != "BREACHED"
        )
        avg_buffer = sum(
            s["distance_to_stop_pct"] for s in suggestions
        ) / total
        
        return {
            "total_picks": total,
            "avg_return_pct": round(avg_return, 2),
            "win_ratio": round(win_ratio, 1),
            "best_performer": best_performer,
            "best_return_pct": round(best_return, 2),
            "worst_performer": worst_performer,
            "worst_return_pct": round(worst_return, 2),
            "total_pnl_points": round(total_pnl, 2),
            "avg_risk_reward_ratio": round(avg_rr, 1),
            "positions_above_stop": safe_positions,
            "avg_stop_buffer_pct": round(avg_buffer, 1)
        }
    
    def _empty_portfolio_summary(self) -> Dict[str, Any]:
        """Return empty portfolio summary"""
        return {
            "suggestions": [],
            "summary": {
                "total_picks": 0,
                "avg_return_pct": 0,
                "win_ratio": 0,
                "best_performer": "N/A",
                "best_return_pct": 0,
                "worst_performer": "N/A",
                "worst_return_pct": 0,
                "total_pnl_points": 0,
                "avg_risk_reward_ratio": 0,
                "positions_above_stop": 0,
                "avg_stop_buffer_pct": 0
            }
        }
