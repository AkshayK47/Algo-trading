import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  ExternalLink, 
  Key, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  Wifi, 
  X 
} from 'lucide-react';
import { LiveMarketStatus, LiveQuote } from '../types';
import { 
  fetchLiveQuoteFromApi, 
  fetchMarketStatusFromApi, 
  saveUpstoxTokenToApi 
} from '../services/marketApi';

interface LiveMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteSelected?: (quote: LiveQuote) => void;
}

export const LiveMarketModal: React.FC<LiveMarketModalProps> = ({
  isOpen,
  onClose,
  onQuoteSelected,
}) => {
  const [status, setStatus] = useState<LiveMarketStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [searchTicker, setSearchTicker] = useState('BANKINDIA');
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<LiveQuote | null>(null);
  const [upstoxTokenInput, setUpstoxTokenInput] = useState('');
  const [tokenSaveMsg, setTokenSaveMsg] = useState<string | null>(null);
  const [isSavingToken, setIsSavingToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      handleSearch('BANKINDIA');
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    const s = await fetchMarketStatusFromApi();
    setStatus(s);
    setIsLoadingStatus(false);
  };

  const handleSearch = async (tickerToSearch?: string) => {
    const t = (tickerToSearch || searchTicker).trim().toUpperCase();
    if (!t) return;
    setIsFetchingQuote(true);
    const q = await fetchLiveQuoteFromApi(t);
    setCurrentQuote(q);
    setIsFetchingQuote(false);
    if (q && onQuoteSelected) {
      onQuoteSelected(q);
    }
  };

  const handleSaveToken = async () => {
    setIsSavingToken(true);
    setTokenSaveMsg(null);
    const success = await saveUpstoxTokenToApi(upstoxTokenInput.trim());
    if (success) {
      setTokenSaveMsg('Upstox Access Token updated. Live quotes will route through Upstox v2.');
      loadStatus();
    } else {
      setTokenSaveMsg('Failed to update Upstox configuration.');
    }
    setIsSavingToken(false);
  };

  if (!isOpen) return null;

  const quickTickers = ['BANKINDIA', 'RELIANCE', 'TRENT', 'POLYCAB', 'HDFCBANK', 'TATASTEEL'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F0F14] border border-[#232330] rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E28] bg-[#14141C]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Live Market API Integration
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME NSE
                </span>
              </h3>
              <p className="text-xs text-[#8E8EA0]">
                Connected directly to Live Indian Equities price feeds & order book
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E8EA0] hover:text-white p-1.5 rounded-lg hover:bg-[#1E1E2A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#14141C] border border-[#232330] rounded-xl">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#8E8EA0] uppercase tracking-wider">
                Feed Status
              </span>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{status?.connected ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#8E8EA0] uppercase tracking-wider">
                Active Provider
              </span>
              <div className="text-sm font-semibold text-white truncate">
                {status?.provider || 'Direct NSE Real-Time Feed'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#8E8EA0] uppercase tracking-wider">
                Ping Latency
              </span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>{status ? `${status.latencyMs} ms` : '--'}</span>
              </div>
            </div>
          </div>

          {/* Live Quote Inspector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0B2] flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                Live Quote Inspector
              </label>
              <div className="flex gap-1.5">
                {quickTickers.map((ticker) => (
                  <button
                    key={ticker}
                    onClick={() => {
                      setSearchTicker(ticker);
                      handleSearch(ticker);
                    }}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                      searchTicker === ticker
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#1A1A24] text-[#8E8EA0] hover:text-white border border-[#262633]'
                    }`}
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter NSE Ticker (e.g. BANKINDIA, RELIANCE, TRENT)..."
                  className="w-full px-3.5 py-2 bg-[#161620] border border-[#2A2A38] rounded-xl text-white font-mono text-sm placeholder-[#666] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={isFetchingQuote}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isFetchingQuote ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                Fetch Live LTP
              </button>
            </div>

            {/* Current Quote Display */}
            {currentQuote && (
              <div className="p-4 bg-[#14141E] border border-emerald-500/25 rounded-xl space-y-4 animate-in fade-in duration-150">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono text-white">
                        {currentQuote.ticker}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1F1F2C] text-[#8E8EA0] font-mono">
                        {currentQuote.symbol}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                        {currentQuote.source}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#717182] mt-0.5">
                      Last Updated:{' '}
                      {new Date(currentQuote.timestamp).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}{' '}
                      IST
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      ₹{currentQuote.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div
                      className={`text-xs font-mono font-medium ${
                        currentQuote.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentQuote.dayChange >= 0 ? '+' : ''}
                      {currentQuote.dayChange.toFixed(2)} (
                      {currentQuote.dayChangePct >= 0 ? '+' : ''}
                      {currentQuote.dayChangePct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#232332] text-xs">
                  <div className="bg-[#181824] p-2 rounded-lg">
                    <span className="text-[#8E8EA0] block text-[10px] uppercase">Open</span>
                    <span className="font-mono text-white font-semibold">₹{currentQuote.open.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#181824] p-2 rounded-lg">
                    <span className="text-[#8E8EA0] block text-[10px] uppercase">Day High</span>
                    <span className="font-mono text-emerald-400 font-semibold">₹{currentQuote.high.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#181824] p-2 rounded-lg">
                    <span className="text-[#8E8EA0] block text-[10px] uppercase">Day Low</span>
                    <span className="font-mono text-rose-400 font-semibold">₹{currentQuote.low.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#181824] p-2 rounded-lg">
                    <span className="text-[#8E8EA0] block text-[10px] uppercase">Volume</span>
                    <span className="font-mono text-white font-semibold">
                      {currentQuote.volume.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {currentQuote.fiftyTwoWeekHigh && (
                  <div className="flex items-center justify-between text-[11px] text-[#8E8EA0] bg-[#12121A] px-3 py-1.5 rounded-lg">
                    <span>
                      52W Low: <strong className="text-white font-mono">₹{currentQuote.fiftyTwoWeekLow?.toFixed(2)}</strong>
                    </span>
                    <span>
                      52W High: <strong className="text-white font-mono">₹{currentQuote.fiftyTwoWeekHigh?.toFixed(2)}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upstox Broker Integration Option */}
          <div className="p-4 bg-[#14141C] border border-[#232330] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Key className="w-4 h-4 text-amber-400" />
                Upstox API v2 Authentication (Optional Direct Broker Connection)
              </div>
              <span className="text-[11px] text-[#8E8EA0]">
                {status?.upstoxConfigured ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Token Active
                  </span>
                ) : (
                  'Default: Direct NSE Cloud Feed'
                )}
              </span>
            </div>
            <p className="text-xs text-[#8E8EA0]">
              The app automatically fetches live market data directly. If you have an active Upstox Trading Account, you can enter your daily Upstox Access Token below to route orders and tick feeds directly through your broker.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={upstoxTokenInput}
                onChange={(e) => setUpstoxTokenInput(e.target.value)}
                placeholder="Paste your Upstox Access Token (Bearer)..."
                className="flex-1 px-3.5 py-1.5 bg-[#181822] border border-[#2B2B38] rounded-lg text-white font-mono text-xs placeholder-[#555] focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleSaveToken}
                disabled={isSavingToken}
                className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium rounded-lg transition-colors"
              >
                {isSavingToken ? 'Saving...' : 'Save Token'}
              </button>
            </div>

            {tokenSaveMsg && (
              <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                {tokenSaveMsg}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E1E28] bg-[#121218]">
          <span className="text-[11px] text-[#717182] flex items-center gap-1">
            Exchange: National Stock Exchange (NSE India) &bull; Equities Segment (EQ)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#20202C] hover:bg-[#282838] text-white text-xs font-medium rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
