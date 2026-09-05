import React, { useState } from 'react';
import { 
  TrendingUp, 
  Play, 
  Save, 
  Download, 
  ShieldAlert, 
  CheckCircle, 
  ChevronRight, 
  Activity, 
  Layers,
  Sparkles,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import { MarketBaseline, QuantitativeSignal } from '../types';

interface MarketAnalyticsTabProps {
  baselines: Record<string, MarketBaseline>;
  signals: QuantitativeSignal[];
  rejectedSignals: { ticker: string; category: string; convictionScore: number; backtestWinRate: number; backtestMdd: number; rejectionReason: string }[];
  isScanning: boolean;
  scanStep: string;
  onRunScan: () => void;
  onSaveToDatabase: (signals: QuantitativeSignal[]) => void;
  onExportCsv: (signals: QuantitativeSignal[]) => void;
}

export const MarketAnalyticsTab: React.FC<MarketAnalyticsTabProps> = ({
  baselines,
  signals,
  rejectedSignals,
  isScanning,
  scanStep,
  onRunScan,
  onSaveToDatabase,
  onExportCsv,
}) => {
  const [selectedStockId, setSelectedStockId] = useState<string>(signals[0]?.id || '1');
  const [showRejections, setShowRejections] = useState<boolean>(false);

  const selectedStock = signals.find((s) => s.id === selectedStockId) || signals[0];
  const n50 = baselines.NIFTY_50;
  const nn50 = baselines.NIFTY_NEXT_50;

  return (
    <div className="space-y-6">
      {/* 1. Market Directional Trend Baselines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Directional Market Trend Baselines</span>
            </h2>
            <p className="text-xs text-zinc-400">Institutional benchmark trend alignment and volatility regimes</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Regime: Favorable Expansion</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nifty 50 Card */}
          <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nifty 50 (Large-Cap)</span>
                <div className="text-2xl font-bold text-white mt-1">₹{n50?.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">
                +{n50?.dayChangePct}%
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#1E1E24] flex justify-between text-xs text-zinc-400">
              <span>1M Return: <strong className="text-emerald-400">+{n50?.return1mPct}%</strong></span>
              <span>200 EMA: <strong className="text-zinc-300 font-mono">₹{n50?.ema200.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* Nifty Next 50 Card */}
          <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nifty Next 50 (Mid-Cap)</span>
                <div className="text-2xl font-bold text-white mt-1">₹{nn50?.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">
                +{nn50?.dayChangePct}%
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#1E1E24] flex justify-between text-xs text-zinc-400">
              <span>1M Return: <strong className="text-emerald-400">+{nn50?.return1mPct}%</strong></span>
              <span>200 EMA: <strong className="text-zinc-300 font-mono">₹{nn50?.ema200.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* Senior Quantitative Regime Card */}
          <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Multi-Factor Alpha Regime</span>
              <div className="text-sm font-semibold text-[#60A5FA] mt-1 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#4A90E2]" />
                <span>Adaptive Breakout-Momentum Active</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">3-to-6-month holding window optimized with ATR volatility trailing stops.</p>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-2">
              Sanity Filter: MDD ≤ 15% | Win Rate ≥ 55%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Screener Execution Control Bar */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            id="btn-run-quantitative-scan"
            onClick={onRunScan}
            disabled={isScanning}
            className="w-full md:w-auto px-5 py-2.5 bg-[#4A90E2] hover:bg-[#3B82F6] text-white rounded-md text-sm font-bold shadow-lg shadow-[#4A90E2]/25 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isScanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning Equities...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Daily Quantitative Scan</span>
              </>
            )}
          </button>

          {isScanning && (
            <div className="text-xs text-emerald-400 font-mono animate-pulse">
              {scanStep}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <button
            id="btn-save-all-suggestions"
            onClick={() => onSaveToDatabase(signals)}
            className="px-3.5 py-2 bg-[#16161A] hover:bg-[#1E1E24] text-zinc-200 border border-[#23232A] rounded-md text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>Save Approved to SQLite</span>
          </button>
          <button
            id="btn-export-predictions-csv"
            onClick={() => onExportCsv(signals)}
            className="px-3.5 py-2 bg-[#16161A] hover:bg-[#1E1E24] text-zinc-200 border border-[#23232A] rounded-md text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#4A90E2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Approved Predictions Table */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-[#1E1E24] flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Top Stock Predictions (3-to-6 Month Holding Horizon)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Only candidates meeting composite Conviction Score and strictly passing trailing 12-month backtests (Win Rate &ge; 55%, MDD &le; 15%)
            </p>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/20">
            {signals.length} Approved Recommendations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0E0E10] text-zinc-400 uppercase tracking-wider font-semibold border-b border-[#1E1E24]">
                <th className="py-3 px-4">Ticker</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Close Price</th>
                <th className="py-3 px-4 text-right">Comfortable Entry</th>
                <th className="py-3 px-4 text-right">Target Expected Return</th>
                <th className="py-3 px-4 text-center">Conviction</th>
                <th className="py-3 px-4 text-center">12M Win Rate</th>
                <th className="py-3 px-4 text-center">12M Max DD</th>
                <th className="py-3 px-4">Structural Justification</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E24]">
              {signals.map((sig) => {
                const isSelected = selectedStock?.id === sig.id;
                return (
                  <tr
                    key={sig.id}
                    onClick={() => setSelectedStockId(sig.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-[#181820] text-white border-l-2 border-l-[#4A90E2]' : 'hover:bg-[#16161A] text-zinc-300'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white flex items-center space-x-1.5">
                      <span>{sig.ticker}</span>
                      {sig.isHybridBreakout && (
                        <span className="text-[10px] bg-[#4A90E2]/20 text-[#60A5FA] px-1.5 py-0.5 rounded font-mono font-medium">Hybrid</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{sig.marketCapCategory}</td>
                    <td className="py-3 px-4 text-right font-mono">₹{sig.closePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono text-[#60A5FA] font-bold">
                      ₹{sig.comfortableEntryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      +{sig.expectedReturnPct.toFixed(1)}%
                      <span className="block text-[10px] text-zinc-400 font-normal">Target: ₹{sig.targetPrice.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded bg-[#16161A] border border-[#23232A] text-[#60A5FA] font-bold font-mono">
                        {sig.convictionScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-400">
                      {sig.backtestWinRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-400">
                      {sig.backtestMdd.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-zinc-300 font-sans" title={sig.technicalJustification}>
                      {sig.technicalJustification}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStockId(sig.id);
                        }}
                        className="px-2 py-1 bg-[#16161A] hover:bg-[#202026] text-zinc-300 border border-[#23232A] rounded text-[11px] font-medium transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Deep Dive Technical Visualizer for Selected Stock */}
      {selectedStock && (
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-5 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-[#1E1E24] gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{selectedStock.ticker}</h3>
                <span className="text-xs px-2 py-0.5 bg-[#16161A] text-zinc-300 rounded border border-[#23232A]">
                  {selectedStock.companyName}
                </span>
                <span className="text-xs px-2 py-0.5 bg-[#4A90E2]/15 text-[#60A5FA] rounded border border-[#4A90E2]/25 font-semibold">
                  {selectedStock.marketCapCategory}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Structural Justification: <strong className="text-zinc-200">{selectedStock.technicalJustification}</strong>
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[11px] text-zinc-400 uppercase block">Comfortable Entry</span>
                <span className="text-base font-bold font-mono text-[#60A5FA]">₹{selectedStock.comfortableEntryPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-zinc-400 uppercase block">Expected Target</span>
                <span className="text-base font-bold font-mono text-emerald-400">₹{selectedStock.targetPrice.toLocaleString('en-IN')} (+{selectedStock.expectedReturnPct}%)</span>
              </div>
            </div>
          </div>

          {/* Technical Factor Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 my-4">
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">RSI (14)</span>
              <span className="text-sm font-bold font-mono text-zinc-200">{selectedStock.rsi14}</span>
            </div>
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">MACD Hist</span>
              <span className="text-sm font-bold font-mono text-emerald-400">+{selectedStock.macdHist}</span>
            </div>
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">50 EMA</span>
              <span className="text-sm font-bold font-mono text-amber-400">₹{selectedStock.ema50.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">200 EMA</span>
              <span className="text-sm font-bold font-mono text-purple-400">₹{selectedStock.ema200.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Supertrend</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{selectedStock.supertrendDirection}</span>
            </div>
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">ADX (14)</span>
              <span className="text-sm font-bold font-mono text-[#60A5FA]">{selectedStock.adx14}</span>
            </div>
            <div className="bg-[#16161A] border border-[#23232A] rounded p-2.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">ATR Volatility</span>
              <span className="text-sm font-bold font-mono text-zinc-300">₹{selectedStock.atr14}</span>
            </div>
          </div>

          {/* Interactive Candlestick Chart with Overlays */}
          <div className="mt-4 bg-[#0A0A0B] p-4 rounded-lg border border-[#1E1E24]">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1"><span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> <span>50 EMA</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span> <span>200 EMA</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> <span>Supertrend (10, 3)</span></span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Daily Timeframe (Trailing ~90 Sessions)</span>
            </div>

            {/* SVG Candlestick Render */}
            <div className="w-full h-64 overflow-hidden relative">
              <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                {/* Background grid */}
                <line x1="0" y1="60" x2="800" y2="60" stroke="#1E1E24" strokeDasharray="3,3" />
                <line x1="0" y1="120" x2="800" y2="120" stroke="#1E1E24" strokeDasharray="3,3" />
                <line x1="0" y1="180" x2="800" y2="180" stroke="#1E1E24" strokeDasharray="3,3" />

                {/* Candlesticks */}
                {selectedStock.history && selectedStock.history.length > 0 && (() => {
                  const history = selectedStock.history.slice(-50);
                  const minPrice = Math.min(...history.map(c => c.low)) * 0.98;
                  const maxPrice = Math.max(...history.map(c => c.high)) * 1.02;
                  const range = maxPrice - minPrice || 1;
                  const stepX = 800 / history.length;

                  return (
                    <g>
                      {/* Price candles */}
                      {history.map((c, i) => {
                        const x = i * stepX + stepX / 2;
                        const isGreen = c.close >= c.open;
                        const yHigh = 220 - ((c.high - minPrice) / range) * 200;
                        const yLow = 220 - ((c.low - minPrice) / range) * 200;
                        const yOpen = 220 - ((c.open - minPrice) / range) * 200;
                        const yClose = 220 - ((c.close - minPrice) / range) * 200;
                        const bodyY = Math.min(yOpen, yClose);
                        const bodyHeight = Math.max(Math.abs(yOpen - yClose), 2);
                        const color = isGreen ? '#10B981' : '#EF4444';

                        return (
                          <g key={i}>
                            {/* Wick */}
                            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                            {/* Candle Body */}
                            <rect
                              x={x - stepX * 0.35}
                              y={bodyY}
                              width={stepX * 0.7}
                              height={bodyHeight}
                              fill={color}
                            />
                          </g>
                        );
                      })}

                      {/* 50 EMA Line */}
                      <polyline
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        points={history.map((c, i) => {
                          const x = i * stepX + stepX / 2;
                          const y = 220 - (((c.ema50 || c.close * 0.96) - minPrice) / range) * 200;
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {/* 200 EMA Line */}
                      <polyline
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="2"
                        points={history.map((c, i) => {
                          const x = i * stepX + stepX / 2;
                          const y = 220 - (((c.ema200 || c.close * 0.91) - minPrice) / range) * 200;
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {/* Supertrend Dots */}
                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        points={history.map((c, i) => {
                          const x = i * stepX + stepX / 2;
                          const y = 220 - (((c.supertrend || c.low * 0.97) - minPrice) / range) * 200;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sanity Filter Rejections Section */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
        <button
          onClick={() => setShowRejections(!showRejections)}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Candidates Inspected &amp; Rejected by Sanity Filter ({rejectedSignals.length})</span>
          </div>
          <ChevronRight className={`w-4 h-4 transform transition-transform ${showRejections ? 'rotate-90' : ''}`} />
        </button>

        {showRejections && (
          <div className="mt-3 pt-3 border-t border-[#1E1E24]">
            <p className="text-xs text-zinc-400 mb-3">
              These candidate setups passed initial technical criteria but were strictly discarded by the Vectorized Backtester due to Maximum Drawdown exceeding 15% or historical Win Rate falling below 55%.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-400 border-b border-[#1E1E24]">
                    <th className="py-2 px-3">Ticker</th>
                    <th className="py-2 px-3">Universe</th>
                    <th className="py-2 px-3 text-center">Score</th>
                    <th className="py-2 px-3 text-center">12M Win Rate</th>
                    <th className="py-2 px-3 text-center">12M Max DD</th>
                    <th className="py-2 px-3">Rejection Cause</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1E24]">
                  {rejectedSignals.map((rej, idx) => (
                    <tr key={idx} className="text-zinc-400">
                      <td className="py-2 px-3 font-bold text-zinc-300">{rej.ticker}</td>
                      <td className="py-2 px-3">{rej.category}</td>
                      <td className="py-2 px-3 text-center font-mono">{rej.convictionScore}</td>
                      <td className="py-2 px-3 text-center font-mono text-rose-400">{rej.backtestWinRate}%</td>
                      <td className="py-2 px-3 text-center font-mono text-rose-400">{rej.backtestMdd}%</td>
                      <td className="py-2 px-3 text-zinc-400">{rej.rejectionReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
