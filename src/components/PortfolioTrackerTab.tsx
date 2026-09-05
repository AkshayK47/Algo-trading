import React from 'react';
import { 
  Briefcase, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { SuggestionRecord, PortfolioSummary } from '../types';

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
  return (
    <div className="space-y-6">
      {/* Tab Header & Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-[#4A90E2]" />
            <span>Live Portfolio Tracker &amp; Dynamic Performance Engine</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Queries recorded picks from SQLite, queries real-time LTP from Upstox API v2, and computes <code className="text-[#60A5FA] bg-[#16161A] border border-[#23232A] px-1.5 py-0.5 rounded font-mono">Current Day Return (%) = ((Current Price - Captured Close) / Captured Close) * 100</code>
          </p>
        </div>

        <button
          id="btn-refresh-portfolio-feeds"
          onClick={onRefreshPerformance}
          disabled={isSyncing}
          className="px-4 py-2 bg-[#4A90E2] hover:bg-[#3B82F6] text-white rounded-md text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50 shadow-md shadow-[#4A90E2]/25 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Executing calculate_portfolio_performance()...' : 'Refresh Live Upstox Feeds'}</span>
        </button>
      </div>

      {/* Active Performance Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Tracked Picks</span>
          <div className="text-2xl font-bold text-white mt-1">{summary.totalPicks}</div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Persisted in SQLite database</span>
        </div>

        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Average Portfolio Return</span>
          <div className={`text-2xl font-bold mt-1 font-mono ${summary.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.avgReturnPct >= 0 ? `+${summary.avgReturnPct.toFixed(2)}%` : `${summary.avgReturnPct.toFixed(2)}%`}
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-zinc-400 mt-1">
            {summary.avgReturnPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
            <span>Net position weighting</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Win Ratio (% Profitable)</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{summary.winRatio.toFixed(1)}%</div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Based on Current vs Captured Close</span>
        </div>

        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Performer</span>
          <div className="text-2xl font-bold text-[#60A5FA] mt-1">{summary.bestPerformer || 'None'}</div>
          <span className="text-[11px] text-emerald-400 font-mono font-bold mt-1 block">
            {summary.bestReturnPct > 0 ? `+${summary.bestReturnPct.toFixed(2)}%` : '0.00%'}
          </span>
        </div>
      </div>

      {/* Reactive Web Data Grid with Color-Coded Signals */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-[#1E1E24] flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Active Tracked Recommendations Table</h3>
            <p className="text-xs text-zinc-400">Color-coded profit/loss signals updated on every market tick</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-zinc-300">Profit (+)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-zinc-300">Drawdown (-)</span>
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
                  <th className="py-3 px-4">Logged Date</th>
                  <th className="py-3 px-4">Ticker</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Entry Price</th>
                  <th className="py-3 px-4 text-right">Captured Close</th>
                  <th className="py-3 px-4 text-right">Current Live LTP</th>
                  <th className="py-3 px-4 text-right">Current Return (%)</th>
                  <th className="py-3 px-4 text-right">P&amp;L (₹)</th>
                  <th className="py-3 px-4 text-right">Target (3-6M)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E24]">
                {records.map((r) => {
                  const currentReturn = r.current_return_pct ?? 0;
                  const isPositive = currentReturn >= 0;
                  const pnlRupees = r.pnl_rupees ?? 0;

                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-[#16161A] transition ${
                        isPositive ? 'bg-emerald-950/15' : 'bg-rose-950/15'
                      }`}
                    >
                      <td className="py-3 px-4 text-zinc-400 font-mono">{r.run_date}</td>
                      <td className="py-3 px-4 font-bold text-white">{r.ticker}</td>
                      <td className="py-3 px-4 text-zinc-400">{r.market_cap_category}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-300">
                        ₹{r.entry_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">
                        ₹{r.captured_close_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ₹{(r.current_price ?? r.captured_close_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      {/* Color-Coded Dynamic Return Column */}
                      <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        <div className="flex items-center justify-end space-x-1">
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                          <span>{isPositive ? `+${currentReturn.toFixed(2)}%` : `${currentReturn.toFixed(2)}%`}</span>
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold ${
                        pnlRupees >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {pnlRupees >= 0 ? `+₹${pnlRupees.toFixed(2)}` : `-₹${Math.abs(pnlRupees).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#60A5FA]">
                        +{r.expected_return_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'Target Achieved' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : isPositive 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {r.status || (isPositive ? 'In Profit' : 'Drawdown')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
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
    </div>
  );
};
