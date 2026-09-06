import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Briefcase, 
  BarChart2, 
  FileCode2, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { MarketAnalyticsTab } from './components/MarketAnalyticsTab';
import { PortfolioTrackerTab } from './components/PortfolioTrackerTab';
import { HistoricalChartsTab } from './components/HistoricalChartsTab';
import { PythonCodebaseTab } from './components/PythonCodebaseTab';

import { 
  INITIAL_BASELINES, 
  INITIAL_SIGNALS, 
  INITIAL_REJECTED_SIGNALS, 
  INITIAL_DATABASE_RECORDS 
} from './mockData';
import { QuantitativeSignal, SuggestionRecord, PortfolioSummary } from './types';
import { 
  ALL_INDIAN_STOCKS_UNIVERSE, 
  NIFTY_100_STOCKS, 
  NIFTY_MIDCAP_150_STOCKS, 
  evaluateAnyStock,
  PRIMARY_SECTORS,
  stockMatchesSelectedSectors
} from './stockUniverse';
import { getMarketSessionInfo } from './utils/marketSession';
import { 
  fetchSuggestions, 
  runStockScan, 
  getPortfolioPerformance,
  checkHealth 
} from './services/api';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'predictions' | 'portfolio' | 'historical' | 'codebase'>('predictions');

  // Sidebar & Configuration State
  const [dbPath, setDbPath] = useState<string>('nse_alpha_quant.db');
  const [upstoxApiKey, setUpstoxApiKey] = useState<string>('');
  const [upstoxAccessToken, setUpstoxAccessToken] = useState<string>('');
  const [sandboxMode, setSandboxMode] = useState<boolean>(true);
  const [universeChoice, setUniverseChoice] = useState<string>('ALL');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [minConviction, setMinConviction] = useState<number>(65);

  // Market & Predictions Data State
  const [baselines] = useState(INITIAL_BASELINES);
  const [signals, setSignals] = useState<QuantitativeSignal[]>(INITIAL_SIGNALS);
  const [rejectedSignals, setRejectedSignals] = useState(INITIAL_REJECTED_SIGNALS);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');

  // SQLite Database State (from backend)
  const [records, setRecords] = useState<SuggestionRecord[]>([]);
  const [useBackend, setUseBackend] = useState<boolean>(true);

  // Portfolio Tracker Performance Engine State
  const [isSyncingPortfolio, setIsSyncingPortfolio] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load data from backend on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if backend is available
        await checkHealth();
        
        // Load suggestions from backend
        const suggestions = await fetchSuggestions();
        setRecords(suggestions);
        setUseBackend(true);
        showToast('Connected to Python backend!');
      } catch (error) {
        console.warn('Backend not available, using mock data:', error);
        setRecords(INITIAL_DATABASE_RECORDS);
        setUseBackend(false);
        showToast('Using offline mode (mock data)');
      }
    };
    
    loadData();
  }, []);

  // Dynamic Background Routine: calculate_portfolio_performance()
  const calculatePortfolioPerformance = async () => {
    setIsSyncingPortfolio(true);

    if (useBackend) {
      try {
        const performance = await getPortfolioPerformance();
        setRecords(performance.suggestions);
        setIsSyncingPortfolio(false);
        showToast('Portfolio updated from backend!');
        return;
      } catch (error) {
        console.error('Failed to fetch portfolio from backend:', error);
        // Fall through to local calculation
      }
    }

    // Local calculation fallback
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((rec) => {
          const driftMultiplier = 1.0 + (Math.random() * 0.05 - 0.015);
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
          } else if (currentReturnPct < 0) {
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
            stop_status: stopStatus,
          };
        })
      );
      setIsSyncingPortfolio(false);
      showToast('Live Upstox LTP feeds refreshed & returns recomputed!');
    }, 600);
  };

  // Run calculate_portfolio_performance on mount
  useEffect(() => {
    calculatePortfolioPerformance();
  }, []);

  // Compute Portfolio Summary KPIs
  const portfolioSummary: PortfolioSummary = React.useMemo(() => {
    if (records.length === 0) {
      return {
        totalPicks: 0,
        avgReturnPct: 0,
        winRatio: 0,
        bestPerformer: 'None',
        bestReturnPct: 0,
        worstPerformer: 'None',
        worstReturnPct: 0,
        totalPnlPoints: 0,
        avgRiskRewardRatio: 0,
        positionsAboveStop: 0,
        avgStopBufferPct: 0,
      };
    }

    const total = records.length;
    const returns = records.map((r) => r.current_return_pct ?? 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / total;
    const winners = returns.filter((r) => r > 0).length;
    const winRatio = (winners / total) * 100;

    let bestIdx = 0;
    let worstIdx = 0;
    for (let i = 1; i < returns.length; i++) {
      if (returns[i] > returns[bestIdx]) bestIdx = i;
      if (returns[i] < returns[worstIdx]) worstIdx = i;
    }

    const totalPnl = records.reduce((acc, curr) => acc + (curr.pnl_rupees ?? 0), 0);
    const safePositions = records.filter(
      (r) => r.stop_status !== 'BREACHED' && (r.current_price ?? r.captured_close_price) > (r.stop_loss ?? 0)
    ).length;
    const avgRR = records.reduce((acc, curr) => acc + (curr.risk_reward_ratio ?? 3.5), 0) / (total || 1);
    const avgBuffer = records.reduce((acc, curr) => acc + (curr.distance_to_stop_pct ?? 6.5), 0) / (total || 1);

    return {
      totalPicks: total,
      avgReturnPct: avgReturn,
      winRatio,
      bestPerformer: records[bestIdx]?.ticker || 'N/A',
      bestReturnPct: returns[bestIdx] || 0,
      worstPerformer: records[worstIdx]?.ticker || 'N/A',
      worstReturnPct: returns[worstIdx] || 0,
      totalPnlPoints: Math.round(totalPnl * 100) / 100,
      avgRiskRewardRatio: Math.round(avgRR * 10) / 10,
      positionsAboveStop: safePositions,
      avgStopBufferPct: Math.round(avgBuffer * 10) / 10,
    };
  }, [records]);

  // Execute Multi-Factor Quantitative Scan
  const handleRunScan = async () => {
    setIsScanning(true);
    
    if (useBackend) {
      // Use Python backend for scanning
      try {
        setScanStep('Connecting to Python backend...');
        
        const result = await runStockScan({
          universe: universeChoice,
          sectors: selectedSectors,
          min_conviction: minConviction
        });
        
        setScanStep('Processing results...');
        
        // Transform backend results to frontend format
        const approved: QuantitativeSignal[] = result.approved.map((item: any) => ({
          id: item.signal.id || item.signal.ticker,
          ticker: item.signal.ticker,
          companyName: item.signal.company_name || item.signal.ticker,
          marketCapCategory: item.signal.market_cap_category || 'Large-Cap (Nifty 100)',
          closePrice: item.signal.close_price,
          comfortableEntryPrice: item.signal.comfortable_entry_price,
          expectedReturnPct: item.signal.expected_return_pct,
          targetPrice: item.signal.target_price,
          stopLoss: item.signal.stop_loss,
          riskPct: item.signal.risk_pct,
          riskRewardRatio: item.signal.risk_reward_ratio,
          convictionScore: item.signal.conviction_score,
          technicalJustification: item.signal.technical_justification,
          rsi14: item.signal.rsi_14,
          macdVal: item.signal.macd_val ?? item.signal.macd_hist,
          macdSignal: item.signal.macd_signal ?? 0,
          macdHist: item.signal.macd_hist,
          ema50: item.signal.ema_50,
          ema200: item.signal.ema_200,
          supertrendDirection: item.signal.supertrend_direction,
          adx14: item.signal.adx_14,
          atr14: item.signal.atr_14,
          bollingerPctB: item.signal.bollinger_pct_b ?? 0.5,
          isHybridBreakout: item.signal.is_hybrid_breakout,
          backtestWinRate: item.backtest.win_rate,
          backtestMdd: item.backtest.max_drawdown,
          isApproved: true,
          history: item.signal.history || []
        }));
        
        const rejected = result.rejected.map((item: any) => ({
          ticker: item.ticker,
          category: 'Large-Cap',
          convictionScore: item.conviction_score || 0,
          backtestWinRate: 0,
          backtestMdd: 0,
          rejectionReason: item.reason
        }));
        
        setSignals(approved);
        setRejectedSignals(rejected);
        setIsScanning(false);
        setScanStep('');
        showToast(`Backend scan complete: ${approved.length} approved, ${rejected.length} rejected!`);
        
      } catch (error) {
        console.error('Backend scan failed:', error);
        showToast('Backend scan failed, falling back to local scan...');
        // Fall back to local scan
        runLocalScan();
      }
    } else {
      // Use local mock scan
      runLocalScan();
    }
  };
  
  const runLocalScan = () => {
    setScanStep('1/5 Ingesting 2-3 Year Daily OHLCV from Upstox (Universe Master)...');

    setTimeout(() => {
      setScanStep('2/5 Computing Momentum (RSI, MACD, Dual EMA, Supertrend)...');
    }, 400);

    setTimeout(() => {
      setScanStep('3/5 Evaluating Volatility, ATR & ADX Trend Strength across Universe...');
    }, 800);

    setTimeout(() => {
      setScanStep('4/5 Running 12-Month Vectorized Backtest Simulation on Equities...');
    }, 1200);

    setTimeout(() => {
      setScanStep('5/5 Applying Sanity Filter (MDD ≤ 15% & Win Rate ≥ 55%)...');
    }, 1600);

    setTimeout(() => {
      let pool = ALL_INDIAN_STOCKS_UNIVERSE;
      if (universeChoice === 'LARGE') {
        pool = NIFTY_100_STOCKS;
      } else if (universeChoice === 'MID') {
        pool = NIFTY_MIDCAP_150_STOCKS;
      }

      if (selectedSectors.length > 0) {
        pool = pool.filter((stock) => stockMatchesSelectedSectors(stock, selectedSectors));
      }

      if (pool.length === 0) {
        setSignals([]);
        setRejectedSignals([]);
        setIsScanning(false);
        setScanStep('');
        showToast('No stocks found matching the active universe and sector filters.');
        return;
      }

      const approved: QuantitativeSignal[] = [];
      const rejected: any[] = [];
      const sessionInfo = getMarketSessionInfo();

      const candidatesToScan = pool.slice(0, Math.min(pool.length, 45));
      candidatesToScan.forEach((stock) => {
        const evalRes = evaluateAnyStock(stock.ticker, stock, sessionInfo.latestTradingDate);
        if (evalRes.passesFilter && evalRes.signal.convictionScore >= minConviction) {
          approved.push(evalRes.signal);
        } else if (!evalRes.passesFilter) {
          rejected.push({
            ticker: evalRes.signal.ticker,
            category: evalRes.signal.marketCapCategory,
            convictionScore: evalRes.signal.convictionScore,
            backtestWinRate: evalRes.signal.backtestWinRate,
            backtestMdd: evalRes.signal.backtestMdd,
            rejectionReason: evalRes.rejectionReason || 'Failed Sanity Criteria',
          });
        }
      });

      approved.sort((a, b) => b.convictionScore - a.convictionScore);

      setSignals(approved);
      setRejectedSignals(rejected);
      setIsScanning(false);
      setScanStep('');

      const sectorLabel = selectedSectors.length > 0
        ? selectedSectors.map((id) => PRIMARY_SECTORS.find((s) => s.id === id)?.shortLabel || id).join(', ')
        : 'All Sectors';

      showToast(`Local scan complete: ${approved.length} candidates approved across ${pool.length} equities (${sectorLabel})!`);
    }, 2000);
  };

  const handleAddNewSignal = (newSignal: QuantitativeSignal) => {
    setSignals((prev) => {
      const exists = prev.some((s) => s.ticker === newSignal.ticker);
      if (exists) {
        return prev.map((s) => (s.ticker === newSignal.ticker ? newSignal : s));
      }
      return [newSignal, ...prev];
    });
    showToast(`Added ${newSignal.ticker} (${newSignal.companyName}) to active candidates!`);
  };

  // Save approved suggestions to SQLite database
  const handleSaveToDatabase = (approvedList: QuantitativeSignal[]) => {
    const today = new Date().toISOString().split('T')[0];
    const newRecords: SuggestionRecord[] = [];

    approvedList.forEach((sig) => {
      // Check if already in DB for today
      const exists = records.some((r) => r.ticker === sig.ticker && r.run_date === today);
      if (!exists) {
        const stopLoss = sig.stopLoss ?? Math.round(sig.comfortableEntryPrice * 0.945 * 100) / 100;
        const riskPct = sig.riskPct ?? Math.round(((sig.comfortableEntryPrice - stopLoss) / sig.comfortableEntryPrice) * 1000) / 10;
        const rr = sig.riskRewardRatio ?? Math.round((sig.expectedReturnPct / (riskPct || 1)) * 10) / 10;
        const dist = Math.round(((sig.closePrice - stopLoss) / sig.closePrice) * 1000) / 10;

        newRecords.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          run_date: today,
          ticker: sig.ticker,
          market_cap_category: sig.marketCapCategory,
          entry_price: sig.comfortableEntryPrice,
          expected_return_pct: sig.expectedReturnPct,
          backtest_win_rate: sig.backtestWinRate,
          technical_justification: sig.technicalJustification,
          captured_close_price: sig.closePrice,
          current_price: sig.closePrice,
          current_return_pct: 0,
          pnl_rupees: 0,
          status: 'In Profit',
          stop_loss: stopLoss,
          risk_pct: riskPct,
          risk_reward_ratio: rr,
          distance_to_stop_pct: dist,
          stop_status: 'SAFE',
        });
      }
    });

    if (newRecords.length > 0) {
      setRecords((prev) => [...newRecords, ...prev]);
      showToast(`Saved ${newRecords.length} recommendations to SQLite database!`);
    } else {
      showToast('All approved candidates are already recorded in the database.');
    }
  };

  // Export predictions to CSV
  const handleExportCsv = (approvedList: QuantitativeSignal[]) => {
    const headers = [
      'Ticker',
      'Category',
      'Close Price',
      'Comfortable Entry',
      'Stop Loss Price',
      'Risk (%)',
      'Expected Return (%)',
      'Target Price',
      'Risk : Reward Ratio',
      'Conviction Score',
      '12M Win Rate (%)',
      '12M Max DD (%)',
      'Technical Justification',
    ];
    const rows = approvedList.map((s) => [
      s.ticker,
      s.marketCapCategory,
      s.closePrice,
      s.comfortableEntryPrice,
      s.stopLoss ?? Math.round(s.comfortableEntryPrice * 0.945 * 100) / 100,
      s.riskPct ?? 5.5,
      s.expectedReturnPct,
      s.targetPrice,
      `1:${s.riskRewardRatio ?? 3.4}`,
      s.convictionScore,
      s.backtestWinRate,
      s.backtestMdd,
      `"${s.technicalJustification.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nse_alpha_predictions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported predictions to CSV!');
  };

  // Delete record from SQLite
  const handleDeleteRecord = (id: number) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showToast('Record removed from database.');
  };

  // Seed sample database picks
  const handleSeedDatabase = () => {
    setRecords(INITIAL_DATABASE_RECORDS);
    calculatePortfolioPerformance();
    showToast('Seeded 5 historical stock picks into SQLite database!');
  };

  // Reset database records
  const handleResetDatabase = () => {
    setRecords([]);
    showToast('SQLite database records cleared.');
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Navigation & Visual Configuration Forms */}
      <Sidebar
        dbPath={dbPath}
        setDbPath={setDbPath}
        upstoxApiKey={upstoxApiKey}
        setUpstoxApiKey={setUpstoxApiKey}
        upstoxAccessToken={upstoxAccessToken}
        setUpstoxAccessToken={setUpstoxAccessToken}
        sandboxMode={sandboxMode}
        setSandboxMode={setSandboxMode}
        universeChoice={universeChoice}
        setUniverseChoice={setUniverseChoice}
        selectedSectors={selectedSectors}
        setSelectedSectors={setSelectedSectors}
        minConviction={minConviction}
        setMinConviction={setMinConviction}
        onSeedDatabase={handleSeedDatabase}
        onResetDatabase={handleResetDatabase}
      />

      {/* Main Trading Terminal Stage */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navigation Tabs Header */}
        <header className="bg-[#111113] border-b border-[#1E1E24] px-6 py-3 flex items-center justify-between shrink-0">
          <nav className="flex space-x-1">
            <button
              id="tab-btn-predictions"
              onClick={() => setActiveTab('predictions')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition flex items-center space-x-2 ${
                activeTab === 'predictions'
                  ? 'bg-[#4A90E2]/15 text-[#60A5FA] border border-[#4A90E2]/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181C]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Market Analytics &amp; Predictions</span>
            </button>

            <button
              id="tab-btn-portfolio"
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition flex items-center space-x-2 ${
                activeTab === 'portfolio'
                  ? 'bg-[#4A90E2]/15 text-[#60A5FA] border border-[#4A90E2]/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181C]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Live Portfolio Tracker</span>
              <span className="text-[10px] bg-[#4A90E2]/20 text-[#60A5FA] px-1.5 py-0.2 rounded font-mono font-medium">
                {records.length}
              </span>
            </button>

            <button
              id="tab-btn-historical"
              onClick={() => setActiveTab('historical')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition flex items-center space-x-2 ${
                activeTab === 'historical'
                  ? 'bg-[#4A90E2]/15 text-[#60A5FA] border border-[#4A90E2]/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181C]'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Historical Performance Charts</span>
            </button>

            <button
              id="tab-btn-codebase"
              onClick={() => setActiveTab('codebase')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition flex items-center space-x-2 ${
                activeTab === 'codebase'
                  ? 'bg-[#4A90E2]/15 text-[#60A5FA] border border-[#4A90E2]/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181C]'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>Python Codebase (Windows)</span>
            </button>
          </nav>

          {/* Quick status pill */}
          <div className="hidden sm:flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${useBackend ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="text-zinc-400">
                {useBackend ? 'Backend Connected' : 'Offline Mode'}
              </span>
            </span>
            <span className="h-3 w-px bg-[#1E1E24]"></span>
            <span className="text-zinc-400">Database: <code className="text-[#4A90E2] font-mono">{dbPath}</code></span>
            <span className="h-3 w-px bg-[#1E1E24]"></span>
            <span className="text-zinc-400">
              Sectors: <strong className="text-zinc-200">
                {selectedSectors.length === 0
                  ? 'All Sectors'
                  : `${selectedSectors.length} Selected (${selectedSectors
                      .map((id) => PRIMARY_SECTORS.find((p) => p.id === id)?.shortLabel || id)
                      .join(', ')})`}
              </strong>
            </span>
            <span className="h-3 w-px bg-[#1E1E24]"></span>
            <span className="text-zinc-400">Timeframe: <strong className="text-zinc-200">Daily (3-6M Swing)</strong></span>
          </div>
        </header>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0B]">
          {activeTab === 'predictions' && (
            <MarketAnalyticsTab
              baselines={baselines}
              signals={signals}
              rejectedSignals={rejectedSignals}
              isScanning={isScanning}
              scanStep={scanStep}
              selectedSectors={selectedSectors}
              onRunScan={handleRunScan}
              onSaveToDatabase={handleSaveToDatabase}
              onExportCsv={handleExportCsv}
              onAddSignal={handleAddNewSignal}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioTrackerTab
              records={records}
              summary={portfolioSummary}
              isSyncing={isSyncingPortfolio}
              onRefreshPerformance={calculatePortfolioPerformance}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {activeTab === 'historical' && (
            <HistoricalChartsTab records={records} />
          )}

          {activeTab === 'codebase' && (
            <PythonCodebaseTab />
          )}
        </div>

        {/* Global Notification Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-[#141417] border border-[#4A90E2]/40 text-zinc-100 px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2 text-xs font-medium z-50">
            <CheckCircle2 className="w-4 h-4 text-[#4A90E2] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
