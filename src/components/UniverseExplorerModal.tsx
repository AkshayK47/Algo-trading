import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Layers, 
  TrendingUp, 
  ExternalLink, 
  Filter, 
  Zap, 
  CheckCircle2, 
  Code2, 
  DownloadCloud,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ALL_INDIAN_STOCKS_UNIVERSE, 
  NIFTY_100_STOCKS, 
  NIFTY_MIDCAP_150_STOCKS, 
  ALL_SECTORS,
  evaluateAnyStock 
} from '../stockUniverse';
import { StockInfo, QuantitativeSignal } from '../types';

interface UniverseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndAnalyze: (signal: QuantitativeSignal) => void;
}

export const UniverseExplorerModal: React.FC<UniverseExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectAndAnalyze,
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'LARGE' | 'MID'>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null);

  const filteredStocks = useMemo(() => {
    return ALL_INDIAN_STOCKS_UNIVERSE.filter((stock) => {
      // Category filter
      if (activeCategory === 'LARGE' && !stock.category.includes('Large-Cap')) return false;
      if (activeCategory === 'MID' && !stock.category.includes('Mid-Cap')) return false;

      // Sector filter
      if (selectedSector !== 'ALL' && stock.sector !== selectedSector) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTicker = stock.ticker.toLowerCase().includes(q);
        const matchesName = stock.name.toLowerCase().includes(q);
        const matchesSector = stock.sector.toLowerCase().includes(q);
        if (!matchesTicker && !matchesName && !matchesSector) return false;
      }

      return true;
    });
  }, [activeCategory, selectedSector, searchQuery]);

  if (!isOpen) return null;

  const handleQuickAnalyze = (stock: StockInfo) => {
    setAnalyzingTicker(stock.ticker);
    setTimeout(() => {
      const { signal } = evaluateAnyStock(stock.ticker, stock);
      onSelectAndAnalyze(signal);
      setAnalyzingTicker(null);
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111113] border border-[#23232A] rounded-xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1E1E24] flex items-center justify-between bg-[#141418]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#4A90E2]/15 border border-[#4A90E2]/30 flex items-center justify-center text-[#4A90E2]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Comprehensive Stock Universe Master
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#4A90E2]/20 text-[#4A90E2] font-semibold border border-[#4A90E2]/30">
                  {ALL_INDIAN_STOCKS_UNIVERSE.length} Official Equities
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Full Nifty 100 (100 Large-Caps) & Nifty Midcap 150 (150 Mid-Caps) constituent directory
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#1E1E24] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner: How Python & Upstox Ingests All Stocks */}
        <div className="px-5 py-3 bg-[#16161C] border-b border-[#1E1E24] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-300">
          <div className="flex items-center space-x-2">
            <DownloadCloud className="w-4 h-4 text-[#4A90E2] shrink-0" />
            <span>
              <strong>Automated Live Universe Pipeline:</strong> In Python, <code className="text-[#4A90E2] font-mono">data_fetcher.py</code> downloads the official real-time CSV directly from NSE Indices or Upstox's <code className="text-[#4A90E2] font-mono">complete.csv.gz</code> master!
            </span>
          </div>
          <div className="flex items-center space-x-3 shrink-0 text-zinc-400">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>100 Large-Caps</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>150 Mid-Caps</span>
            </span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 border-b border-[#1E1E24] bg-[#111113] flex flex-wrap gap-3 items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 bg-[#16161A] p-1 rounded-lg border border-[#23232A]">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeCategory === 'ALL'
                  ? 'bg-[#4A90E2] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({ALL_INDIAN_STOCKS_UNIVERSE.length})
            </button>
            <button
              onClick={() => setActiveCategory('LARGE')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeCategory === 'LARGE'
                  ? 'bg-[#4A90E2] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Nifty 100 ({NIFTY_100_STOCKS.length})
            </button>
            <button
              onClick={() => setActiveCategory('MID')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeCategory === 'MID'
                  ? 'bg-[#4A90E2] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Nifty Midcap 150 ({NIFTY_MIDCAP_150_STOCKS.length})
            </button>
          </div>

          {/* Sector & Search Filters */}
          <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
            <div className="relative">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="bg-[#16161A] border border-[#23232A] rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#4A90E2]"
              >
                <option value="ALL">All Sectors ({ALL_SECTORS.length})</option>
                {ALL_SECTORS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16161A] border border-[#23232A] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#4A90E2]"
              />
            </div>
          </div>
        </div>

        {/* Stock Universe Grid / Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredStocks.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-xs">
              No equities found matching "{searchQuery}". Try a different ticker or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredStocks.map((stock) => {
                const isLarge = stock.category.includes('Large-Cap');
                const isAnalyzing = analyzingTicker === stock.ticker;

                return (
                  <div
                    key={stock.ticker}
                    className="bg-[#141418] hover:bg-[#18181F] border border-[#1E1E24] hover:border-[#4A90E2]/40 rounded-lg p-3 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-white group-hover:text-[#4A90E2] transition">
                            {stock.ticker}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isLarge
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {isLarge ? 'Nifty 100' : 'Midcap 150'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-zinc-200">
                          ₹{stock.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-300 font-medium truncate mb-1">
                        {stock.name}
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500">
                        <span className="truncate">{stock.sector}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#1E1E24] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[140px]">
                        {stock.instrumentKey}
                      </span>
                      <button
                        onClick={() => handleQuickAnalyze(stock)}
                        disabled={isAnalyzing}
                        className="px-2.5 py-1 bg-[#1C1C24] hover:bg-[#4A90E2] text-zinc-300 hover:text-white rounded text-xs font-medium transition flex items-center space-x-1 group/btn"
                      >
                        {isAnalyzing ? (
                          <span className="animate-spin text-xs">⏳ Scanning...</span>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 text-amber-400 group-hover/btn:text-white" />
                            <span>Quick Quant Scan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1E1E24] bg-[#141418] flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing <strong className="text-white">{filteredStocks.length}</strong> of{' '}
            <strong className="text-white">{ALL_INDIAN_STOCKS_UNIVERSE.length}</strong> active equities
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E1E24] hover:bg-[#282830] text-zinc-200 rounded-md text-xs font-medium transition"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
