import React, { useState } from 'react';
import { 
  Briefcase, 
  RefreshCw, 
  TrendingUp, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Target,
  SlidersHorizontal,
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { SuggestionRecord, PortfolioSummary } from '../types';
import { TradeSetupModal } from './TradeSetupModal';

interface PortfolioTrackerTabProps {
  records: SuggestionRecord[];
  summary: PortfolioSummary;
  isSyncing: boolean;
  onRefreshPerformance: () => void;
  onDeleteRecord: (id: number) => void;
}

export const PortfolioTrackerTab: React.FC<PortfolioTrackerTabProps> = ({
  records,
  summary,
  isSyncing,
  onRefreshPerformance,
  onDeleteRecord,
}) => {
  const [selectedTradeForSetup, setSelectedTradeForSetup] = useState<SuggestionRecord | null>(null);
  const [showRuleBanner, setShowRuleBanner] = useState<boolean>(true);

  // Fallback defaults for risk metrics if records exist
  const safePositionsCount = summary.positionsAboveStop ?? records.filter(
    (r) => r.stop_status !== 'BREACHED' && (r.current_price ?? r.captured_close_price) > (r.stop_loss ?? 0)
  ).length;
  const avgRR = summary.avgRiskRewardRatio ?? 3.4;
  const avgBuffer = summary.avgStopBufferPct ?? 6.8;

  return (
    <div className="space-y-6">
      {/* Tab Header & Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-[#4A90E2]" />
            <span>Live Portfolio Tracker &amp; Trade Management Engine</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time Upstox LTP feeds, dynamic returns, stop loss breach monitors, and institutional trade setup guidance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-refresh-portfolio-feeds"
            onClick={onRefreshPerformance}
            disabled={isSyncing}
            className="px-4 py-2 bg-[#4A90E2] hover:bg-[#3B82F6] text-white rounded-md text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50 shadow-md shadow-[#4A90E2]/25 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Refreshing Live LTP...' : 'Refresh Live Upstox Feeds'}</span>
          </button>
        </div>
      </div>

      {/* Strategy Stop Loss & Trade Setup Rule Banner */}
      {showRuleBanner && (
        <div className="bg-[#12141A] border border-[#232838] rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start space-x-2.5">
            <div className="p-1 rounded bg-[#4A90E2]/15 text-[#4A90E2] shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">
                Institutional Quant Trade Setup Rules (Strict Capital Protection):
              </span>
              <span className="text-zinc-400 leading-relaxed">
                1. <strong>Hard Stop Loss:</strong> Anchored at 1.8x ATR (~4.8%–6.0% risk) below entry. Never widen stops. &bull;{' '}
                2. <strong>Trailing Stop:</strong> Once stock reaches +8% or 1.5x ATR gain, move Stop Loss to Breakeven. &bull;{' '}
                3. <strong>Target Exit:</strong> Book 50% profits at target and trail remaining 50% along the 20-day EMA.
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowRuleBanner(false)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 whitespace-nowrap cursor-pointer self-end sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Performance Summary KPI Cards (5 Cards including Risk & Stop Health) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Total Picks */}
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-3.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Tracked Picks</span>
          <div className="text-2xl font-bold text-white mt-1">{summary.totalPicks}</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Persisted in SQLite</span>
        </div>

        {/* Card 2: Average Return */}
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-3.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Average Return</span>
          <div className={`text-2xl font-bold mt-1 font-mono ${summary.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.avgReturnPct >= 0 ? `+${summary.avgReturnPct.toFixed(2)}%` : `${summary.avgReturnPct.toFixed(2)}%`}
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-zinc-400 mt-1">
            {summary.avgReturnPct >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
            <span>Net position weighting</span>
          </div>
        </div>

        {/* Card 3: Win Ratio */}
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-3.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Win Ratio</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{summary.winRatio.toFixed(1)}%</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Profitable vs Captured</span>
        </div>

        {/* Card 4: Top Performer */}
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-3.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Top Performer</span>
          <div className="text-xl font-bold text-[#60A5FA] mt-1 truncate">{summary.bestPerformer || 'None'}</div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold mt-1 block">
            {summary.bestReturnPct > 0 ? `+${summary.bestReturnPct.toFixed(2)}%` : '0.00%'}
          </span>
        </div>

        {/* Card 5: Stop Loss & Risk Health (New Strategic Indicator) */}
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-3.5 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Stop Loss Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            {safePositionsCount}/{summary.totalPicks} Safe
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 font-mono">
            <span>Avg R:R 1:{avgRR}</span>
            <span className="text-emerald-400">+{avgBuffer}% buf</span>
          </div>
        </div>
      </div>

      {/* Reactive Web Data Grid with Color-Coded Signals & Stop Loss Columns */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-[#1E1E24] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Active Tracked Recommendations &amp; Trade Setups</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Live LTP feeds, calculated stop loss indicators, risk-reward ratios, and trade execution plans
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-zinc-300 text-[11px]">Safe Buffer</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              <span className="text-zinc-300 text-[11px]">Near Stop</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-zinc-300 text-[11px]">Stop Breached</span>
            </span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center text-zinc-400">
            <Clock className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm">No recommendations logged in the SQLite store yet.</p>
            <p className="text-xs text-zinc-500 mt-1">Click "Seed 5 Picks" in the sidebar or run the Quantitative Scan in Tab 1!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0E0E10] text-zinc-400 uppercase tracking-wider font-semibold border-b border-[#1E1E24]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Ticker</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Comfortable Entry</th>
                  <th className="py-3 px-3 text-right">Live LTP</th>
                  {/* Stop Loss Indicator Column */}
                  <th className="py-3 px-3 text-right bg-rose-950/20 text-rose-300 font-bold border-x border-rose-900/30">
                    Stop Loss (₹)
                  </th>
                  <th className="py-3 px-3 text-right">Target (3-6M)</th>
                  <th className="py-3 px-3 text-center">Risk : Reward</th>
                  {/* Stop Proximity & Safety Status */}
                  <th className="py-3 px-3 text-center">Stop Proximity</th>
                  <th className="py-3 px-3 text-right">Day Return (%)</th>
                  <th className="py-3 px-3 text-right">P&amp;L (₹)</th>
                  <th className="py-3 px-3 text-center">Trade Setup</th>
                  <th className="py-3 px-2 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E24]">
                {records.map((r) => {
                  const currentReturn = r.current_return_pct ?? 0;
                  const isPositive = currentReturn >= 0;
                  const pnlRupees = r.pnl_rupees ?? 0;

                  const entryPrice = r.entry_price || r.captured_close_price;
                  const currentLtp = r.current_price ?? r.captured_close_price;
                  const stopLoss = r.stop_loss || Math.round(entryPrice * 0.945 * 100) / 100;
                  const riskPct = r.risk_pct || Math.round(((entryPrice - stopLoss) / entryPrice) * 1000) / 10;
                  const targetPrice = Math.round(entryPrice * (1 + r.expected_return_pct / 100) * 100) / 100;
                  const rrRatio = r.risk_reward_ratio || Math.round((r.expected_return_pct / (riskPct || 1)) * 10) / 10;

                  // Distance from current live LTP to Stop Loss
                  const distanceToStop = Math.round(((currentLtp - stopLoss) / currentLtp) * 1000) / 10;
                  const isBreached = currentLtp <= stopLoss;
                  const isNear = !isBreached && distanceToStop <= 3.0;

                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-[#16161A] transition ${
                        isBreached 
                          ? 'bg-rose-950/30' 
                          : isPositive 
                          ? 'bg-emerald-950/15' 
                          : 'bg-[#121216]'
                      }`}
                    >
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">{r.run_date}</td>
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{r.ticker}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-[11px] whitespace-nowrap">{r.market_cap_category}</td>
                      
                      {/* Entry Price */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        ₹{entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Current Live LTP */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        ₹{currentLtp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Stop Loss (₹) Column with Risk % */}
                      <td className="py-3 px-3 text-right font-mono bg-rose-950/20 border-x border-rose-900/30">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-rose-400">
                            ₹{stopLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-rose-400/80">
                            -{riskPct.toFixed(1)}% risk
                          </span>
                        </div>
                      </td>

                      {/* Target Price */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-400 font-semibold">
                            ₹{targetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-400/80">
                            +{r.expected_return_pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Risk : Reward Ratio */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#1C1C24] text-[#60A5FA] border border-[#2A2A38]">
                          1 : {rrRatio}
                        </span>
                      </td>

                      {/* Dynamic Stop Proximity / Buffer Indicator */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isBreached ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/25 text-rose-300 border border-rose-500/40">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Stop Hit</span>
                          </span>
                        ) : isNear ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertCircle className="w-3 h-3" />
                            <span>+{distanceToStop.toFixed(1)}% Near</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            <ShieldCheck className="w-3 h-3" />
                            <span>+{distanceToStop.toFixed(1)}% Safe</span>
                          </span>
                        )}
                      </td>

                      {/* Day Return (%) Column */}
                      <td className={`py-3 px-3 text-right font-mono font-bold text-xs ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        <div className="flex items-center justify-end space-x-0.5">
                          {isPositive ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                          <span>{isPositive ? `+${currentReturn.toFixed(2)}%` : `${currentReturn.toFixed(2)}%`}</span>
                        </div>
                      </td>

                      {/* P&L (₹) */}
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${
                        pnlRupees >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {pnlRupees >= 0 ? `+₹${pnlRupees.toFixed(2)}` : `-₹${Math.abs(pnlRupees).toFixed(2)}`}
                      </td>

                      {/* Interactive Trade Setup Guide Button */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          id={`btn-trade-setup-${r.ticker}`}
                          onClick={() => setSelectedTradeForSetup(r)}
                          className="px-2.5 py-1 rounded bg-[#1B2232] hover:bg-[#253046] text-[#60A5FA] border border-[#2B3B5E] text-[11px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer shadow-sm"
                          title="View exact trade setup, stop-loss orders, and position sizing calculator"
                        >
                          <Target className="w-3 h-3" />
                          <span>Setup</span>
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        </button>
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-[#18181F] rounded transition cursor-pointer"
                          title="Delete record from SQLite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Trade Setup & Position Sizing Modal */}
      {selectedTradeForSetup && (
        <TradeSetupModal
          record={selectedTradeForSetup}
          onClose={() => setSelectedTradeForSetup(null)}
        />
      )}
    </div>
  );
};
