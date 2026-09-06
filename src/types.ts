export interface StockInfo {
  ticker: string;
  name: string;
  category: 'Large-Cap (Nifty 100)' | 'Mid-Cap (Nifty Midcap 150)';
  sector: string;
  instrumentKey: string;
  basePrice: number;
}

export interface SectorOption {
  id: string;
  name: string;
  shortLabel: string;
}

export interface MarketBaseline {
  name: string;
  ticker: string;
  currentPrice: number;
  dayChangePct: number;
  return1mPct: number;
  return3mPct: number;
  ema50: number;
  ema200: number;
  regime: string;
  isBullish: boolean;
}

export interface QuantitativeSignal {
  id: string;
  ticker: string;
  companyName: string;
  marketCapCategory: 'Large-Cap (Nifty 100)' | 'Mid-Cap (Nifty Midcap 150)';
  closePrice: number;
  comfortableEntryPrice: number;
  expectedReturnPct: number;
  targetPrice: number;
  stopLoss?: number;
  riskPct?: number;
  riskRewardRatio?: number;
  convictionScore: number; // 0 - 100
  technicalJustification: string;
  rsi14: number;
  macdVal: number;
  macdSignal: number;
  macdHist: number;
  ema50: number;
  ema200: number;
  supertrendDirection: 'BULLISH' | 'BEARISH';
  adx14: number;
  atr14: number;
  bollingerPctB: number;
  isHybridBreakout: boolean;
  backtestWinRate: number;
  backtestMdd: number;
  isApproved: boolean;
  rejectionReason?: string;
  history: Candle[];
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema50?: number;
  ema200?: number;
  supertrend?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
}

export interface SuggestionRecord {
  id: number;
  run_date: string;
  ticker: string;
  market_cap_category: string;
  entry_price: number;
  expected_return_pct: number;
  backtest_win_rate: number;
  technical_justification: string;
  captured_close_price: number;
  // Dynamic performance metrics calculated by background routine
  current_price?: number;
  current_return_pct?: number;
  pnl_rupees?: number;
  status?: string;
  // Stop Loss & Trade Setup Metrics
  stop_loss?: number;
  risk_pct?: number;
  risk_reward_ratio?: number;
  distance_to_stop_pct?: number;
  stop_status?: 'SAFE' | 'WARNING' | 'BREACHED';
}

export interface PortfolioSummary {
  totalPicks: number;
  avgReturnPct: number;
  winRatio: number;
  bestPerformer: string;
  bestReturnPct: number;
  worstPerformer: string;
  worstReturnPct: number;
  totalPnlPoints: number;
  avgRiskRewardRatio?: number;
  positionsAboveStop?: number;
  avgStopBufferPct?: number;
}
