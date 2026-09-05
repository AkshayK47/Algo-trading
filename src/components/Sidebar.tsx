import React from 'react';
import { 
  Database, 
  KeyRound, 
  Sliders, 
  ShieldCheck, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Monitor
} from 'lucide-react';
import { SectorMultiSelect } from './SectorMultiSelect';

interface SidebarProps {
  dbPath: string;
  setDbPath: (path: string) => void;
  upstoxApiKey: string;
  setUpstoxApiKey: (key: string) => void;
  upstoxAccessToken: string;
  setUpstoxAccessToken: (token: string) => void;
  sandboxMode: boolean;
  setSandboxMode: (enabled: boolean) => void;
  universeChoice: string;
  setUniverseChoice: (universe: string) => void;
  selectedSectors: string[];
  setSelectedSectors: (sectors: string[]) => void;
  minConviction: number;
  setMinConviction: (val: number) => void;
  onSeedDatabase: () => void;
  onResetDatabase: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  dbPath,
  setDbPath,
  upstoxApiKey,
  setUpstoxApiKey,
  upstoxAccessToken,
  setUpstoxAccessToken,
  sandboxMode,
  setSandboxMode,
  universeChoice,
  setUniverseChoice,
  selectedSectors,
  setSelectedSectors,
  minConviction,
  setMinConviction,
  onSeedDatabase,
  onResetDatabase,
}) => {
  const isLive = Boolean(upstoxAccessToken && upstoxAccessToken.length > 20 && !sandboxMode);

  return (
    <aside 
      id="app-sidebar" 
      className="w-80 bg-[#111113] border-r border-[#1E1E24] flex flex-col h-screen overflow-y-auto text-zinc-300 p-5 shrink-0 select-none"
    >
      {/* Brand Header */}
      <div className="flex items-center space-x-3 pb-5 border-b border-[#1E1E24]">
        <div className="w-10 h-10 rounded-lg bg-[#4A90E2]/15 border border-[#4A90E2]/30 flex items-center justify-center text-[#4A90E2]">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-tight">NSE Alpha Quant</h1>
          <p className="text-xs text-zinc-400 font-medium">Algorithmic Advisory Terminal</p>
        </div>
      </div>

      <div className="space-y-6 pt-5 flex-1">
        {/* Section 1: SQLite Settings */}
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            <Database className="w-4 h-4 text-[#4A90E2]" />
            <span>Local SQLite Database</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Database File Path</label>
            <input
              id="sqlite-db-path-input"
              type="text"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              className="w-full bg-[#16161A] border border-[#23232A] rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-[#4A90E2] font-mono"
              placeholder="nse_alpha_quant.db"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              id="btn-seed-sample-db"
              onClick={onSeedDatabase}
              className="px-2.5 py-1.5 bg-[#18181D] hover:bg-[#202026] text-[#4A90E2] border border-[#23232A] hover:border-[#4A90E2]/40 rounded text-xs font-medium transition flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Seed 5 Picks</span>
            </button>
            <button
              id="btn-reset-db"
              onClick={onResetDatabase}
              className="px-2.5 py-1.5 bg-[#18181D] hover:bg-[#202026] text-zinc-400 hover:text-rose-400 border border-[#23232A] hover:border-rose-500/40 rounded text-xs font-medium transition"
            >
              Reset Records
            </button>
          </div>
        </div>

        {/* Section 2: Upstox Credentials */}
        <div className="pt-2 border-t border-[#1E1E24]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Upstox API v2 Feeds</span>
            </div>
            {isLive ? (
              <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Live</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                <span>Sandbox</span>
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">API Key (Client ID)</label>
              <input
                id="upstox-api-key-input"
                type="password"
                value={upstoxApiKey}
                onChange={(e) => setUpstoxApiKey(e.target.value)}
                placeholder="Enter Upstox API Key"
                className="w-full bg-[#16161A] border border-[#23232A] rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-[#4A90E2] font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Daily Bearer Access Token</label>
              <input
                id="upstox-token-input"
                type="password"
                value={upstoxAccessToken}
                onChange={(e) => setUpstoxAccessToken(e.target.value)}
                placeholder="Enter daily OAuth Access Token"
                className="w-full bg-[#16161A] border border-[#23232A] rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-[#4A90E2] font-mono"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-1">
              <span className="text-xs text-zinc-300">Fallback Sandbox Simulation</span>
              <input
                id="toggle-sandbox-mode"
                type="checkbox"
                checked={sandboxMode}
                onChange={(e) => setSandboxMode(e.target.checked)}
                className="w-4 h-4 accent-[#4A90E2] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Quantitative Scan Settings */}
        <div className="pt-2 border-t border-[#1E1E24]">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            <Sliders className="w-4 h-4 text-[#4A90E2]" />
            <span>Scanning Filters</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Target Universe</label>
              <select
                id="select-stock-universe"
                value={universeChoice}
                onChange={(e) => setUniverseChoice(e.target.value)}
                className="w-full bg-[#16161A] border border-[#23232A] rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-[#4A90E2]"
              >
                <option value="ALL">All Indian Equities (Nifty 100 + 150)</option>
                <option value="LARGE">Large-Cap Only (Nifty 100)</option>
                <option value="MID">Mid-Cap Only (Nifty Midcap 150)</option>
              </select>
            </div>

            {/* Multi-Select Sector Dropdown */}
            <SectorMultiSelect
              selectedSectors={selectedSectors}
              onChange={setSelectedSectors}
              universeChoice={universeChoice}
            />

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-zinc-400">Min Conviction Score</span>
                <span className="font-bold text-[#4A90E2] font-mono">{minConviction}/100</span>
              </div>
              <input
                id="slider-min-conviction"
                type="range"
                min="50"
                max="90"
                step="5"
                value={minConviction}
                onChange={(e) => setMinConviction(Number(e.target.value))}
                className="w-full accent-[#4A90E2] cursor-pointer"
              />
            </div>
          </div>

          {/* Sanity Filter Barrier Guarantee */}
          <div className="mt-4 p-3 bg-[#16161A]/80 border border-[#23232A] rounded-md text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Mandatory Sanity Filter</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Trailing 12M Backtest constraint: Rejects any setup with <strong>Max Drawdown &gt; 15%</strong> or <strong>Win Rate &lt; 55%</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Windows Local Runtime Tag */}
      <div className="pt-4 border-t border-[#1E1E24] flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center space-x-1.5">
          <Monitor className="w-3.5 h-3.5 text-zinc-400" />
          <span>Windows Local Port: 8501</span>
        </div>
        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/20">Active</span>
      </div>
    </aside>
  );
};
