/**
 * API Service - Connects React UI to Python FastAPI Backend
 * Replaces mock data with real API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Health check
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string; version: string }> {
  return apiFetch('/health');
}

/**
 * Fetch all suggestions from database
 */
export async function fetchSuggestions(): Promise<any[]> {
  return apiFetch('/suggestions');
}

/**
 * Fetch a single suggestion by ID
 */
export async function fetchSuggestion(id: number): Promise<any> {
  return apiFetch(`/suggestions/${id}`);
}

/**
 * Create a new suggestion
 */
export async function createSuggestion(suggestion: {
  run_date: string;
  ticker: string;
  market_cap_category: string;
  entry_price: number;
  expected_return_pct: number;
  backtest_win_rate: number;
  technical_justification: string;
  captured_close_price: number;
  stop_loss?: number;
}): Promise<any> {
  return apiFetch('/suggestions', {
    method: 'POST',
    body: JSON.stringify(suggestion),
  });
}

/**
 * Delete a suggestion
 */
export async function deleteSuggestion(id: number): Promise<void> {
  return apiFetch(`/suggestions/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch suggestions for a specific ticker
 */
export async function fetchSuggestionsByTicker(ticker: string): Promise<any[]> {
  return apiFetch(`/suggestions/ticker/${ticker}`);
}

/**
 * Calculate portfolio performance with live quotes
 */
export async function getPortfolioPerformance(): Promise<{
  suggestions: any[];
  summary: {
    total_picks: number;
    avg_return_pct: number;
    win_ratio: number;
    best_performer: string;
    best_return_pct: number;
    worst_performer: string;
    worst_return_pct: number;
    total_pnl_points: number;
    avg_risk_reward_ratio: number;
    positions_above_stop: number;
    avg_stop_buffer_pct: number;
  };
}> {
  return apiFetch('/portfolio/performance');
}

/**
 * Scan a single stock
 */
export async function scanSingleStock(ticker: string): Promise<{
  ticker: string;
  approved: boolean;
  signal?: any;
  backtest?: any;
  reason?: string;
}> {
  return apiFetch(`/scan/single/${ticker}`, {
    method: 'POST',
  });
}

/**
 * Run bulk stock scan
 */
export async function runStockScan(params: {
  universe?: string;
  sectors?: string[];
  min_conviction?: number;
  use_live_market?: boolean;
}): Promise<{
  approved: any[];
  rejected: any[];
  errors: any[];
  total_scanned: number;
  timestamp: number;
}> {
  return apiFetch('/scan', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Fetch market baselines (Nifty 50, Nifty Next 50)
 */
export async function fetchMarketBaselines(): Promise<{
  NIFTY_50: {
    name: string;
    current_price: number;
    day_change_pct: number;
    return_1m_pct: number;
    ema_200: number;
    is_bullish: boolean;
  };
  NIFTY_NEXT_50: {
    name: string;
    current_price: number;
    day_change_pct: number;
    return_1m_pct: number;
    ema_200: number;
    is_bullish: boolean;
  };
}> {
  return apiFetch('/market/baselines');
}

/**
 * Seed database with sample data
 */
export async function seedDatabase(): Promise<{ message: string }> {
  return apiFetch('/database/seed', {
    method: 'POST',
  });
}

/**
 * WebSocket connection for real-time updates (future enhancement)
 */
export function connectWebSocket(onMessage: (data: any) => void): WebSocket {
  const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api', '/ws');
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };

  return ws;
}

/**
 * Export all API functions
 */
export default {
  checkHealth,
  fetchSuggestions,
  fetchSuggestion,
  createSuggestion,
  deleteSuggestion,
  fetchSuggestionsByTicker,
  getPortfolioPerformance,
  scanSingleStock,
  runStockScan,
  fetchMarketBaselines,
  seedDatabase,
  connectWebSocket,
};
