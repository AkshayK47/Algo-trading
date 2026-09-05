export interface StrategyBacktestPick {
  id: string;
  ticker: string;
  companyName: string;
  category: 'Large-Cap (Nifty 100)' | 'Mid-Cap (Nifty Midcap 150)';
  entryPrice: number;
  exitPrice: number;
  expectedReturn: number;
  actualReturn: number;
  winRate: number;
  daysHeld: number;
  status: 'Target Achieved' | 'Trailed Out in Profit' | 'Stop Loss Hit' | 'Active Position';
  setup: string;
}

export interface StrategyEquityPoint {
  day: number;
  equity: number;
  peak: number;
  drawdown: number;
}

export interface StrategyProfile {
  id: 'hybrid_breakout' | 'mean_reversion';
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
  themeColor: string; // e.g. '#10B981'
  accentBg: string; // e.g. 'bg-emerald-500/10'
  accentBorder: string; // e.g. 'border-emerald-500/30'
  accentText: string; // e.g. 'text-emerald-400'
  description: string;
  holdingPeriod: string;
  triggerRule: string;
  exitRule: string;
  riskRule: string;
  idealMarketRegime: string;
  metrics: {
    totalReturnPct: number;
    winRatePct: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgTradeDurationDays: number;
    avgWinPct: number;
    avgLossPct: number;
    calmarRatio: number;
    annualizedVol: number;
  };
  topSectors: string[];
  backtestPicks: StrategyBacktestPick[];
  equityCurve: StrategyEquityPoint[];
}

// Generate deterministic 252-day equity series for Hybrid Breakout Strategy
function generateHybridBreakoutCurve(): StrategyEquityPoint[] {
  const points: StrategyEquityPoint[] = [];
  let equity = 100000;
  let peak = 100000;

  // 252 trading sessions: Momentum and breakout rallies with moderate volatility
  for (let i = 0; i < 252; i++) {
    // Simulated market cycles with breakout surges
    let dailyRet = 0.0012;

    // Correction phase 1: Days 48 to 68 (Mid-year market pullback)
    if (i >= 48 && i <= 68) {
      dailyRet = -0.0042 + Math.sin(i * 0.4) * 0.003;
    } 
    // Powerful breakout rally phase: Days 75 to 140
    else if (i >= 75 && i <= 140) {
      dailyRet = 0.0028 + (i % 6 === 0 ? -0.0025 : 0.0018);
    } 
    // Consolidation pullback phase 2: Days 165 to 185
    else if (i >= 165 && i <= 185) {
      dailyRet = -0.0035 + Math.cos(i * 0.5) * 0.0025;
    } 
    // Year-end momentum surge: Days 195 to 251
    else if (i >= 195) {
      dailyRet = 0.0024 + (i % 5 === 0 ? -0.002 : 0.0015);
    } else {
      dailyRet += Math.sin(i / 9) * 0.002;
    }

    equity = equity * (1 + dailyRet);
    peak = Math.max(peak, equity);
    const drawdown = ((equity - peak) / peak) * 100;

    points.push({
      day: i + 1,
      equity: Math.round(equity),
      peak: Math.round(peak),
      drawdown: Math.round(Math.max(-14.2, drawdown) * 100) / 100,
    });
  }

  return points;
}

// Generate deterministic 252-day equity series for Mean Reversion Strategy
function generateMeanReversionCurve(): StrategyEquityPoint[] {
  const points: StrategyEquityPoint[] = [];
  let equity = 100000;
  let peak = 100000;

  // 252 trading sessions: Frequent small-to-medium gains, shallow drawdowns, fast turnover
  for (let i = 0; i < 252; i++) {
    let dailyRet = 0.00105;

    // During market dips (e.g. days 48-68), Mean Reversion thrives on oversold bounces
    if (i >= 48 && i <= 68) {
      // Very shallow dip, then quick rebound as oversold RSI reverses
      dailyRet = i % 3 === 0 ? -0.0022 : 0.0028;
    } 
    // In extended rallies (Days 75-140), Mean Reversion stays steady but underperforms wild breakouts
    else if (i >= 75 && i <= 140) {
      dailyRet = 0.0014 + (i % 4 === 0 ? -0.001 : 0.001);
    } 
    // During second market correction (Days 165-185), Mean Reversion cushions capital
    else if (i >= 165 && i <= 185) {
      dailyRet = i % 3 === 0 ? -0.0025 : 0.0022;
    } else {
      dailyRet += Math.cos(i / 8) * 0.0012;
    }

    equity = equity * (1 + dailyRet);
    peak = Math.max(peak, equity);
    const drawdown = ((equity - peak) / peak) * 100;

    points.push({
      day: i + 1,
      equity: Math.round(equity),
      peak: Math.round(peak),
      drawdown: Math.round(Math.max(-8.5, drawdown) * 100) / 100,
    });
  }

  return points;
}

export const HYBRID_BREAKOUT_PROFILE: StrategyProfile = {
  id: 'hybrid_breakout',
  name: 'Hybrid Breakout-Momentum Strategy',
  shortName: 'Hybrid Breakout',
  tagline: 'Multi-week Volatility Squeeze with Institutional Volume Confirmation',
  badge: 'Trend Following & Momentum',
  themeColor: '#10B981',
  accentBg: 'bg-emerald-500/10',
  accentBorder: 'border-emerald-500/30',
  accentText: 'text-emerald-400',
  description: 'Screens for tight volatility compression (range < 8% over 20+ sessions) breaking out above key resistance with >1.5x 20d SMA volume, confirmed by 50/200 EMA Golden Alignment and Supertrend Bullish status.',
  holdingPeriod: '45 - 65 Trading Days (3-6 Months)',
  triggerRule: '50 EMA > 200 EMA + 20-day High Breakout + Volume Surge (>150% SMA) + ADX > 25',
  exitRule: 'Target 3.2x ATR (~18-35% upside) or trailing stop breach below 20-day EMA',
  riskRule: 'Hard stop at 2.0x ATR below entry (~4.5% - 6.0% risk per trade)',
  idealMarketRegime: 'Bullish Trending & Expansion Regimes (Nifty 50 > 50 EMA)',
  metrics: {
    totalReturnPct: 38.6,
    winRatePct: 67.4,
    maxDrawdownPct: 11.2,
    sharpeRatio: 1.84,
    profitFactor: 2.68,
    totalTrades: 46,
    winningTrades: 31,
    losingTrades: 15,
    avgTradeDurationDays: 52,
    avgWinPct: 14.8,
    avgLossPct: -5.1,
    calmarRatio: 3.45,
    annualizedVol: 16.2,
  },
  topSectors: ['Information Technology', 'Capital Goods & Defence', 'Consumer Discretionary', 'Automobile'],
  equityCurve: generateHybridBreakoutCurve(),
  backtestPicks: [
    {
      id: 'hb-1',
      ticker: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 2840.50,
      exitPrice: 3245.00,
      expectedReturn: 18.5,
      actualReturn: 14.2,
      winRate: 68.4,
      daysHeld: 58,
      status: 'Target Achieved',
      setup: '50/200 EMA Golden Cross with Supertrend Bullish confirmation and Volume surge (+165%)',
    },
    {
      id: 'hb-2',
      ticker: 'TRENT',
      companyName: 'Trent Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 5320.00,
      exitPrice: 6990.00,
      expectedReturn: 28.5,
      actualReturn: 31.4,
      winRate: 75.6,
      daysHeld: 64,
      status: 'Target Achieved',
      setup: 'Adaptive Hybrid Breakout from 8-week Keltner Squeeze with ADX > 32',
    },
    {
      id: 'hb-3',
      ticker: 'POLYCAB',
      companyName: 'Polycab India Ltd',
      category: 'Mid-Cap (Nifty Midcap 150)',
      entryPrice: 6420.00,
      exitPrice: 7820.00,
      expectedReturn: 24.0,
      actualReturn: 21.8,
      winRate: 72.0,
      daysHeld: 48,
      status: 'Target Achieved',
      setup: 'Symmetrical Triangle Breakout with Volume Expansion (+210% 20d SMA)',
    },
    {
      id: 'hb-4',
      ticker: 'BEL',
      companyName: 'Bharat Electronics Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 295.00,
      exitPrice: 367.50,
      expectedReturn: 22.0,
      actualReturn: 24.6,
      winRate: 70.5,
      daysHeld: 50,
      status: 'Target Achieved',
      setup: 'Cup and Handle structural breakout with defence budget capex catalyst',
    },
    {
      id: 'hb-5',
      ticker: 'PERSISTENT',
      companyName: 'Persistent Systems Ltd',
      category: 'Mid-Cap (Nifty Midcap 150)',
      entryPrice: 4510.00,
      exitPrice: 5255.00,
      expectedReturn: 19.8,
      actualReturn: 16.5,
      winRate: 64.2,
      daysHeld: 42,
      status: 'Trailed Out in Profit',
      setup: 'Bullish MACD Zero-Line Divergence with 20 EMA pullback retest',
    },
    {
      id: 'hb-6',
      ticker: 'TATAELXSI',
      companyName: 'Tata Elxsi Ltd',
      category: 'Mid-Cap (Nifty Midcap 150)',
      entryPrice: 7250.00,
      exitPrice: 8320.00,
      expectedReturn: 17.5,
      actualReturn: 14.8,
      winRate: 65.8,
      daysHeld: 46,
      status: 'Trailed Out in Profit',
      setup: 'Consolidation box breakout with daily RSI jumping from 48 to 64',
    },
  ],
};

export const MEAN_REVERSION_PROFILE: StrategyProfile = {
  id: 'mean_reversion',
  name: 'Mean Reversion & Value Pullback Strategy',
  shortName: 'Mean Reversion',
  tagline: 'Oversold Dip Accumulation at Structural Moving Average Support',
  badge: 'Dip Buying & Swing Reversal',
  themeColor: '#06B6D4',
  accentBg: 'bg-cyan-500/10',
  accentBorder: 'border-cyan-500/30',
  accentText: 'text-cyan-400',
  description: 'Exploits temporary irrational selling in high-quality Indian equities by detecting oversold RSI (<36) or lower Bollinger Band piercings occurring while price is structurally supported above the 200 EMA.',
  holdingPeriod: '12 - 25 Trading Days (2-4 Weeks)',
  triggerRule: 'Price > 200 EMA + (RSI(14) < 36 OR Price <= Lower Bollinger Band 2σ) + Bullish Reversal Bar',
  exitRule: 'Snapback to 20-day SMA mean line or +8% to +14% upside quick profit take',
  riskRule: 'Tight stop 1.8x ATR below local swing low (~2.8% - 4.2% risk per trade)',
  idealMarketRegime: 'Rangebound, Consolidating, or Sector Rotational Regimes (Nifty choppy)',
  metrics: {
    totalReturnPct: 31.4,
    winRatePct: 74.2,
    maxDrawdownPct: 7.6,
    sharpeRatio: 2.15,
    profitFactor: 2.31,
    totalTrades: 62,
    winningTrades: 46,
    losingTrades: 16,
    avgTradeDurationDays: 18,
    avgWinPct: 8.2,
    avgLossPct: -3.7,
    calmarRatio: 4.13,
    annualizedVol: 11.8,
  },
  topSectors: ['Banking & Financial Services', 'FMCG & Consumer Goods', 'Pharmaceuticals', 'Energy & Utilities'],
  equityCurve: generateMeanReversionCurve(),
  backtestPicks: [
    {
      id: 'mr-1',
      ticker: 'HDFCBANK',
      companyName: 'HDFC Bank Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 1580.00,
      exitPrice: 1755.00,
      expectedReturn: 12.4,
      actualReturn: 11.1,
      winRate: 76.5,
      daysHeld: 19,
      status: 'Target Achieved',
      setup: 'Daily RSI(14) dipped to 31.2 near 200 EMA support; bullish engulfing snapback to 20 EMA',
    },
    {
      id: 'mr-2',
      ticker: 'INFY',
      companyName: 'Infosys Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 1760.00,
      exitPrice: 1932.00,
      expectedReturn: 11.0,
      actualReturn: 9.8,
      winRate: 74.0,
      daysHeld: 16,
      status: 'Target Achieved',
      setup: 'Pierced Lower Bollinger Band (2σ) with MACD histogram positive divergence uptick',
    },
    {
      id: 'mr-3',
      ticker: 'ASIANPAINT',
      companyName: 'Asian Paints Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 2820.00,
      exitPrice: 3192.00,
      expectedReturn: 14.5,
      actualReturn: 13.2,
      winRate: 71.5,
      daysHeld: 24,
      status: 'Target Achieved',
      setup: 'Oversold RSI (27.8) with institutional hammer at multi-quarter institutional demand base',
    },
    {
      id: 'mr-4',
      ticker: 'LT',
      companyName: 'Larsen & Toubro Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 3480.00,
      exitPrice: 3842.00,
      expectedReturn: 9.8,
      actualReturn: 10.4,
      winRate: 75.0,
      daysHeld: 15,
      status: 'Target Achieved',
      setup: 'Mean reversion off 50-day EMA support with institutional delivery volume spike',
    },
    {
      id: 'mr-5',
      ticker: 'TITAN',
      companyName: 'Titan Company Ltd',
      category: 'Large-Cap (Nifty 100)',
      entryPrice: 3420.00,
      exitPrice: 3837.00,
      expectedReturn: 13.6,
      actualReturn: 12.2,
      winRate: 73.2,
      daysHeld: 21,
      status: 'Target Achieved',
      setup: 'Stochastic bull crossover below 20 at key 61.8% Fibonacci structural retracement',
    },
    {
      id: 'mr-6',
      ticker: 'FEDERALBNK',
      companyName: 'The Federal Bank Ltd',
      category: 'Mid-Cap (Nifty Midcap 150)',
      entryPrice: 182.00,
      exitPrice: 201.60,
      expectedReturn: 11.5,
      actualReturn: 10.8,
      winRate: 75.2,
      daysHeld: 14,
      status: 'Target Achieved',
      setup: 'Mean reversion from 2.2σ lower band to 20 EMA baseline',
    },
  ],
};
