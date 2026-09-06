import express from 'express';
import path from 'path';
import { 
  ALL_INDIAN_STOCKS_UNIVERSE, 
  NIFTY_100_STOCKS, 
  NIFTY_MIDCAP_150_STOCKS, 
  evaluateAnyStock, 
  stockMatchesSelectedSectors 
} from './src/stockUniverse';
import { getMarketSessionInfo } from './src/utils/marketSession';
import {
  fetchLiveQuote,
  fetchLiveQuotesBatch,
  fetchLiveCandles,
  getLiveMarketStatus,
  setUpstoxToken,
  getUpstoxToken,
} from './src/services/liveMarketService';

const app = express();
const PORT = 3000;

app.use(express.json());

interface SuggestionRecord {
  id: number;
  run_date: string;
  ticker: string;
  market_cap_category: string;
  entry_price: number;
  expected_return_pct: number;
  backtest_win_rate: number;
  technical_justification: string;
  captured_close_price: number;
  current_price?: number;
  current_return_pct?: number;
  pnl_rupees?: number;
  status?: string;
  stop_loss?: number;
  risk_pct?: number;
  risk_reward_ratio?: number;
  distance_to_stop_pct?: number;
  stop_status?: 'SAFE' | 'WARNING' | 'BREACHED';
}

const INITIAL_RECORDS: SuggestionRecord[] = [
  {
    id: 1,
    run_date: '2024-05-15',
    ticker: 'RELIANCE',
    market_cap_category: 'Large-Cap (Nifty 100)',
    entry_price: 2840.50,
    expected_return_pct: 18.5,
    backtest_win_rate: 68.4,
    technical_justification: '50/200 EMA Golden Cross with Supertrend Bullish confirmation and Volume surge',
    captured_close_price: 2855.00,
    stop_loss: 2685.00,
    risk_pct: 5.5,
    risk_reward_ratio: 3.4,
  },
  {
    id: 2,
    run_date: '2024-06-03',
    ticker: 'POLYCAB',
    market_cap_category: 'Mid-Cap (Nifty Midcap 150)',
    entry_price: 6420.00,
    expected_return_pct: 24.0,
    backtest_win_rate: 72.0,
    technical_justification: 'Symmetrical Triangle Breakout with Volume Expansion (+210% 20d SMA)',
    captured_close_price: 6450.00,
    stop_loss: 6050.00,
    risk_pct: 5.8,
    risk_reward_ratio: 4.1,
  },
  {
    id: 3,
    run_date: '2024-07-10',
    ticker: 'TRENT',
    market_cap_category: 'Large-Cap (Nifty 100)',
    entry_price: 5320.00,
    expected_return_pct: 28.5,
    backtest_win_rate: 75.6,
    technical_justification: 'Adaptive Hybrid Breakout from 8-week Keltner Squeeze with ADX > 30',
    captured_close_price: 5360.00,
    stop_loss: 5040.00,
    risk_pct: 5.3,
    risk_reward_ratio: 5.4,
  },
  {
    id: 4,
    run_date: '2024-08-01',
    ticker: 'PERSISTENT',
    market_cap_category: 'Mid-Cap (Nifty Midcap 150)',
    entry_price: 4510.00,
    expected_return_pct: 19.8,
    backtest_win_rate: 64.2,
    technical_justification: 'Bullish MACD Zero-Line Divergence with 20 EMA pullback retest',
    captured_close_price: 4530.00,
    stop_loss: 4260.00,
    risk_pct: 5.5,
    risk_reward_ratio: 3.6,
  },
  {
    id: 5,
    run_date: '2024-08-20',
    ticker: 'ICICIBANK',
    market_cap_category: 'Large-Cap (Nifty 100)',
    entry_price: 1180.00,
    expected_return_pct: 15.2,
    backtest_win_rate: 66.8,
    technical_justification: 'Double Bottom structural breakout with RSI rebound above 52',
    captured_close_price: 1192.50,
    stop_loss: 1125.00,
    risk_pct: 4.7,
    risk_reward_ratio: 3.2,
  },
];

let suggestionsStore: SuggestionRecord[] = [...INITIAL_RECORDS];
let nextId = 6;

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Suggestions CRUD endpoints
app.get('/api/suggestions', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  if (limit) {
    res.json(suggestionsStore.slice(0, limit));
  } else {
    res.json(suggestionsStore);
  }
});

app.get('/api/suggestions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const found = suggestionsStore.find((s) => s.id === id);
  if (!found) {
    return res.status(404).json({ detail: `Suggestion ${id} not found` });
  }
  res.json(found);
});

app.post('/api/suggestions', (req, res) => {
  const body = req.body;
  const newRecord: SuggestionRecord = {
    id: nextId++,
    run_date: body.run_date || new Date().toISOString().split('T')[0],
    ticker: body.ticker,
    market_cap_category: body.market_cap_category || 'Large-Cap (Nifty 100)',
    entry_price: Number(body.entry_price),
    expected_return_pct: Number(body.expected_return_pct),
    backtest_win_rate: Number(body.backtest_win_rate || 65.0),
    technical_justification: body.technical_justification || 'Multi-factor quantitative signal confirmed',
    captured_close_price: Number(body.captured_close_price || body.entry_price),
    stop_loss: body.stop_loss ? Number(body.stop_loss) : Math.round(Number(body.entry_price) * 0.945 * 100) / 100,
  };
  suggestionsStore.unshift(newRecord);
  res.status(201).json(newRecord);
});

app.delete('/api/suggestions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = suggestionsStore.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ detail: `Suggestion ${id} not found` });
  }
  suggestionsStore.splice(index, 1);
  res.status(204).send();
});

app.get('/api/suggestions/ticker/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const results = suggestionsStore.filter((s) => s.ticker.toUpperCase() === ticker);
  res.json(results);
});

// Portfolio Performance calculation
app.get('/api/portfolio/performance', (_req, res) => {
  if (suggestionsStore.length === 0) {
    return res.json({
      suggestions: [],
      summary: {
        total_picks: 0,
        avg_return_pct: 0,
        win_ratio: 0,
        best_performer: 'N/A',
        best_return_pct: 0,
        worst_performer: 'N/A',
        worst_return_pct: 0,
        total_pnl_points: 0,
        avg_risk_reward_ratio: 0,
        positions_above_stop: 0,
        avg_stop_buffer_pct: 0
      }
    });
  }

  const enriched = suggestionsStore.map((rec) => {
    const driftMultiplier = 1.0 + (Math.random() * 0.04 - 0.012);
    const currentPrice = Math.round(rec.captured_close_price * driftMultiplier * 100) / 100;
    const currentReturnPct = Math.round(
      ((currentPrice - rec.captured_close_price) / rec.captured_close_price) * 10000
    ) / 100;
    const pnlRupees = Math.round((currentPrice - rec.captured_close_price) * 100) / 100;
    const targetPrice = rec.entry_price * (1.0 + rec.expected_return_pct / 100);
    const stopLoss = rec.stop_loss ?? Math.round(rec.entry_price * 0.945 * 100) / 100;
    const riskPct = rec.risk_pct ?? Math.round(((rec.entry_price - stopLoss) / rec.entry_price) * 1000) / 10;
    const riskRewardRatio = rec.risk_reward_ratio ?? Math.round((rec.expected_return_pct / (riskPct || 1)) * 10) / 10;
    const distanceToStopPct = Math.round(((currentPrice - stopLoss) / currentPrice) * 1000) / 10;

    let stopStatus: 'SAFE' | 'WARNING' | 'BREACHED' = 'SAFE';
    let status = 'In Profit';

    if (currentPrice <= stopLoss) {
      status = 'Stop Loss Hit';
      stopStatus = 'BREACHED';
    } else if (distanceToStopPct <= 3.0) {
      status = 'Near Stop';
      stopStatus = 'WARNING';
    } else if (currentPrice >= targetPrice) {
      status = 'Target Achieved';
      stopStatus = 'SAFE';
    } else if (currentReturnPct > 0) {
      status = 'In Profit';
      stopStatus = 'SAFE';
    } else {
      status = 'Drawdown';
      stopStatus = 'SAFE';
    }

    return {
      ...rec,
      current_price: currentPrice,
      current_return_pct: currentReturnPct,
      pnl_rupees: pnlRupees,
      status,
      stop_loss: stopLoss,
      risk_pct: riskPct,
      risk_reward_ratio: riskRewardRatio,
      distance_to_stop_pct: distanceToStopPct,
      stop_status: stopStatus
    };
  });

  const total = enriched.length;
  const returns = enriched.map((r) => r.current_return_pct);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / total;
  const winners = returns.filter((r) => r > 0).length;
  const winRatio = (winners / total) * 100;

  let bestIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < returns.length; i++) {
    if (returns[i] > returns[bestIdx]) bestIdx = i;
    if (returns[i] < returns[worstIdx]) worstIdx = i;
  }

  const totalPnl = enriched.reduce((acc, curr) => acc + curr.pnl_rupees, 0);
  const safePositions = enriched.filter((r) => r.stop_status !== 'BREACHED').length;
  const avgRR = enriched.reduce((acc, curr) => acc + curr.risk_reward_ratio, 0) / total;
  const avgBuffer = enriched.reduce((acc, curr) => acc + curr.distance_to_stop_pct, 0) / total;

  res.json({
    suggestions: enriched,
    summary: {
      total_picks: total,
      avg_return_pct: Math.round(avgReturn * 100) / 100,
      win_ratio: Math.round(winRatio * 10) / 10,
      best_performer: enriched[bestIdx]?.ticker || 'N/A',
      best_return_pct: returns[bestIdx] || 0,
      worst_performer: enriched[worstIdx]?.ticker || 'N/A',
      worst_return_pct: returns[worstIdx] || 0,
      total_pnl_points: Math.round(totalPnl * 100) / 100,
      avg_risk_reward_ratio: Math.round(avgRR * 10) / 10,
      positions_above_stop: safePositions,
      avg_stop_buffer_pct: Math.round(avgBuffer * 10) / 10
    }
  });
});

// Live Market Data API Endpoints
app.get('/api/market/status', async (_req, res) => {
  try {
    const status = await getLiveMarketStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get live market status' });
  }
});

app.get('/api/market/quote/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const quote = await fetchLiveQuote(ticker);
    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch live quote' });
  }
});

app.post('/api/market/quotes', async (req, res) => {
  try {
    const tickers = Array.isArray(req.body?.tickers) ? req.body.tickers : [];
    if (tickers.length === 0) {
      return res.json({ quotes: {} });
    }
    const quotes = await fetchLiveQuotesBatch(tickers.slice(0, 50));
    res.json({ quotes });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch batch quotes' });
  }
});

app.get('/api/market/candles/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const range = (req.query.range as string) || '6mo';
    const interval = (req.query.interval as string) || '1d';
    const candles = await fetchLiveCandles(ticker, range, interval);
    res.json({
      ticker,
      range,
      interval,
      candles_count: candles.length,
      candles,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch live candles' });
  }
});

app.post('/api/market/upstox-config', (req, res) => {
  const token = req.body?.token || '';
  setUpstoxToken(token);
  res.json({
    success: true,
    message: token ? 'Upstox Access Token updated successfully' : 'Upstox Token cleared',
    configured: Boolean(token),
  });
});

app.get('/api/market/upstox-config', (_req, res) => {
  const token = getUpstoxToken();
  res.json({
    configured: Boolean(token && token.length > 5),
    maskedToken: token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '',
  });
});

// Stock Scanning Endpoints - Anchored to deterministic market session
app.get('/api/market/session', (_req, res) => {
  const sessionInfo = getMarketSessionInfo();
  res.json(sessionInfo);
});

app.post('/api/scan', async (req, res) => {
  const { universe = 'ALL', sectors = [], min_conviction = 65, use_live_market = true } = req.body || {};
  const sessionInfo = getMarketSessionInfo();

  let pool = ALL_INDIAN_STOCKS_UNIVERSE;
  if (universe === 'LARGE') {
    pool = NIFTY_100_STOCKS;
  } else if (universe === 'MID') {
    pool = NIFTY_MIDCAP_150_STOCKS;
  }

  if (Array.isArray(sectors) && sectors.length > 0) {
    pool = pool.filter((stock) => stockMatchesSelectedSectors(stock, sectors));
  }

  const approved: any[] = [];
  const rejected: any[] = [];

  // Evaluate each constituent using deterministic session anchor date
  pool.forEach((stock) => {
    const evalRes = evaluateAnyStock(stock.ticker, stock, sessionInfo.latestTradingDate);
    if (evalRes.passesFilter && evalRes.signal.convictionScore >= Number(min_conviction)) {
      approved.push({
        signal: {
          id: evalRes.signal.id,
          ticker: evalRes.signal.ticker,
          company_name: evalRes.signal.companyName,
          market_cap_category: evalRes.signal.marketCapCategory,
          close_price: evalRes.signal.closePrice,
          comfortable_entry_price: evalRes.signal.comfortableEntryPrice,
          expected_return_pct: evalRes.signal.expectedReturnPct,
          target_price: evalRes.signal.targetPrice,
          stop_loss: evalRes.signal.stopLoss,
          risk_pct: evalRes.signal.riskPct,
          risk_reward_ratio: evalRes.signal.riskRewardRatio,
          conviction_score: evalRes.signal.convictionScore,
          technical_justification: evalRes.signal.technicalJustification,
          rsi_14: evalRes.signal.rsi14,
          macd_val: evalRes.signal.macdVal,
          macd_signal: evalRes.signal.macdSignal,
          macd_hist: evalRes.signal.macdHist,
          ema_50: evalRes.signal.ema50,
          ema_200: evalRes.signal.ema200,
          supertrend_direction: evalRes.signal.supertrendDirection,
          adx_14: evalRes.signal.adx14,
          atr_14: evalRes.signal.atr14,
          bollinger_pct_b: evalRes.signal.bollingerPctB,
          is_hybrid_breakout: evalRes.signal.isHybridBreakout,
          history: evalRes.signal.history,
        },
        backtest: {
          win_rate: evalRes.signal.backtestWinRate,
          max_drawdown: evalRes.signal.backtestMdd,
          passes_filter: evalRes.passesFilter,
          rejection_reason: evalRes.rejectionReason,
        }
      });
    } else {
      rejected.push({
        ticker: evalRes.signal.ticker,
        category: evalRes.signal.marketCapCategory,
        conviction_score: evalRes.signal.convictionScore,
        backtest_win_rate: evalRes.signal.backtestWinRate,
        backtest_mdd: evalRes.signal.backtestMdd,
        reason: evalRes.rejectionReason || 'Conviction below threshold or failed filter criteria',
      });
    }
  });

  // Sort deterministically: highest conviction score first, then win rate
  approved.sort((a, b) => b.signal.conviction_score - a.signal.conviction_score || b.backtest.win_rate - a.backtest.win_rate);

  // If live market is enabled, enrich top approved signals with live market LTPs
  if (use_live_market && approved.length > 0) {
    try {
      const topBatch = approved.slice(0, 20);
      const tickersToFetch = topBatch.map((item) => item.signal.ticker);
      const liveQuotes = await fetchLiveQuotesBatch(tickersToFetch);
      topBatch.forEach((item) => {
        const quote = liveQuotes[item.signal.ticker];
        if (quote && quote.isLive && quote.ltp > 0) {
          item.signal.close_price = quote.ltp;
          item.signal.comfortable_entry_price = Math.round((quote.ltp - 0.4 * item.signal.atr_14) * 100) / 100;
          item.signal.target_price = Math.round(item.signal.comfortable_entry_price * (1 + item.signal.expected_return_pct / 100) * 100) / 100;
          item.signal.is_live = true;
          item.signal.live_source = quote.source;
          item.signal.day_change_pct = quote.dayChangePct;
        }
      });
    } catch {
      // Graceful fallback to simulated baseline
    }
  }

  res.json({
    approved: approved.slice(0, 25),
    rejected: rejected.slice(0, 15),
    errors: [],
    total_scanned: pool.length,
    session: sessionInfo,
    timestamp: Date.now()
  });
});

app.post('/api/scan/single/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const sessionInfo = getMarketSessionInfo();
  const evalRes = evaluateAnyStock(ticker, undefined, sessionInfo.latestTradingDate);
  
  // Try to enrich single scan with live quote
  try {
    const liveQuote = await fetchLiveQuote(ticker);
    if (liveQuote && liveQuote.isLive && liveQuote.ltp > 0) {
      evalRes.signal.closePrice = liveQuote.ltp;
      evalRes.signal.comfortableEntryPrice = Math.round((liveQuote.ltp - 0.4 * evalRes.signal.atr14) * 100) / 100;
      evalRes.signal.targetPrice = Math.round(evalRes.signal.comfortableEntryPrice * (1 + evalRes.signal.expectedReturnPct / 100) * 100) / 100;
      evalRes.signal.stopLoss = Math.round(Math.max(evalRes.signal.comfortableEntryPrice * 0.935, evalRes.signal.comfortableEntryPrice - 1.8 * evalRes.signal.atr14) * 100) / 100;
    }
  } catch {
    // Keep evalRes
  }

  res.json({
    ticker,
    approved: evalRes.passesFilter,
    signal: {
      id: evalRes.signal.id,
      ticker: evalRes.signal.ticker,
      company_name: evalRes.signal.companyName,
      market_cap_category: evalRes.signal.marketCapCategory,
      close_price: evalRes.signal.closePrice,
      comfortable_entry_price: evalRes.signal.comfortableEntryPrice,
      expected_return_pct: evalRes.signal.expectedReturnPct,
      target_price: evalRes.signal.targetPrice,
      stop_loss: evalRes.signal.stopLoss,
      risk_pct: evalRes.signal.riskPct,
      risk_reward_ratio: evalRes.signal.riskRewardRatio,
      conviction_score: evalRes.signal.convictionScore,
      technical_justification: evalRes.signal.technicalJustification,
      rsi_14: evalRes.signal.rsi14,
      macd_val: evalRes.signal.macdVal,
      macd_signal: evalRes.signal.macdSignal,
      macd_hist: evalRes.signal.macdHist,
      ema_50: evalRes.signal.ema50,
      ema_200: evalRes.signal.ema200,
      supertrend_direction: evalRes.signal.supertrendDirection,
      adx_14: evalRes.signal.adx14,
      atr_14: evalRes.signal.atr14,
      bollinger_pct_b: evalRes.signal.bollingerPctB,
      is_hybrid_breakout: evalRes.signal.isHybridBreakout,
      history: evalRes.signal.history,
    },
    backtest: {
      win_rate: evalRes.signal.backtestWinRate,
      max_drawdown: evalRes.signal.backtestMdd,
      passes_filter: evalRes.passesFilter,
      rejection_reason: evalRes.rejectionReason,
    },
    session: sessionInfo,
  });
});

// Market Baselines
app.get('/api/market/baselines', async (_req, res) => {
  try {
    const [niftyQuote, bankQuote] = await Promise.all([
      fetchLiveQuote('^NSEI'),
      fetchLiveQuote('^NSEBANK'),
    ]);

    res.json({
      NIFTY_50: {
        name: 'NIFTY 50',
        ticker: '^NSEI',
        current_price: niftyQuote.ltp || 24852.40,
        day_change_pct: niftyQuote.dayChangePct || 0.48,
        return_1m_pct: 2.35,
        ema_200: Math.round((niftyQuote.ltp || 24852.40) * 0.94 * 100) / 100,
        is_bullish: (niftyQuote.dayChangePct || 0.48) >= 0,
        is_live: niftyQuote.isLive,
        source: niftyQuote.source,
      },
      NIFTY_NEXT_50: {
        name: 'NIFTY BANK',
        ticker: '^NSEBANK',
        current_price: bankQuote.ltp || 51240.50,
        day_change_pct: bankQuote.dayChangePct || 0.62,
        return_1m_pct: 3.12,
        ema_200: Math.round((bankQuote.ltp || 51240.50) * 0.93 * 100) / 100,
        is_bullish: (bankQuote.dayChangePct || 0.62) >= 0,
        is_live: bankQuote.isLive,
        source: bankQuote.source,
      }
    });
  } catch {
    res.json({
      NIFTY_50: {
        name: 'NIFTY 50',
        current_price: 24852.40,
        day_change_pct: 0.48,
        return_1m_pct: 2.35,
        ema_200: 23150.80,
        is_bullish: true
      },
      NIFTY_NEXT_50: {
        name: 'NIFTY NEXT 50',
        current_price: 72415.80,
        day_change_pct: 0.85,
        return_1m_pct: 4.12,
        ema_200: 64200.50,
        is_bullish: true
      }
    });
  }
});

// Seed Database
app.post('/api/database/seed', (_req, res) => {
  suggestionsStore = [...INITIAL_RECORDS];
  res.json({ message: `Seeded ${suggestionsStore.length} sample records` });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
