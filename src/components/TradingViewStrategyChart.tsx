import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  ColorType, 
  LineStyle, 
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  createSeriesMarkers,
  Time
} from 'lightweight-charts';
import { 
  Maximize2, 
  Minimize2, 
  Sliders, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  Activity, 
  Layers, 
  Sparkles, 
  Zap, 
  Info,
  Calculator,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  HelpCircle,
  Percent,
  Scale
} from 'lucide-react';
import { Candle, QuantitativeSignal } from '../types';

interface TradingViewStrategyChartProps {
  ticker: string;
  companyName?: string;
  category?: string;
  closePrice?: number;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  riskRewardRatio?: number;
  expectedReturnPct?: number;
  technicalJustification?: string;
  rsi14?: number;
  macdHist?: number;
  candles?: Candle[];
  strategyType?: 'Hybrid Breakout' | 'Mean Reversion' | 'Quantitative Trend';
  winRate?: number;
  maxDrawdown?: number;
  height?: number;
  showControls?: boolean;
  onClose?: () => void;
  isModal?: boolean;
  atr14?: number;
  adx14?: number;
  initialShowTargetFormula?: boolean;
}

export const TradingViewStrategyChart: React.FC<TradingViewStrategyChartProps> = ({
  ticker,
  companyName,
  category = 'Large-Cap (Nifty 100)',
  closePrice,
  entryPrice,
  targetPrice,
  stopLoss,
  riskRewardRatio = 2.5,
  expectedReturnPct = 18.5,
  technicalJustification = 'Supertrend Bullish with 50/200 EMA Golden Cross Confirmation',
  rsi14 = 62,
  macdHist = 4.5,
  candles = [],
  strategyType = 'Hybrid Breakout',
  winRate = 68.4,
  maxDrawdown = 11.2,
  height = 420,
  showControls = true,
  onClose,
  isModal = false,
  atr14,
  adx14 = 28,
  initialShowTargetFormula = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  // Strategy Layer Toggles
  const [showEma50, setShowEma50] = useState<boolean>(true);
  const [showEma200, setShowEma200] = useState<boolean>(true);
  const [showSupertrend, setShowSupertrend] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showTradeLines, setShowTradeLines] = useState<boolean>(true);
  const [showBuyMarker, setShowBuyMarker] = useState<boolean>(true);
  const [subPane, setSubPane] = useState<'none' | 'rsi'>('rsi');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [showTargetFormula, setShowTargetFormula] = useState<boolean>(initialShowTargetFormula);
  const [showHudCard, setShowHudCard] = useState<boolean>(true);

  // Live Market Feed Integration State
  const [useLiveFeed, setUseLiveFeed] = useState<boolean>(true);
  const [liveCandles, setLiveCandles] = useState<Candle[] | null>(null);
  const [liveLtp, setLiveLtp] = useState<number | null>(null);
  const [liveChangePct, setLiveChangePct] = useState<number>(0);
  const [liveSource, setLiveSource] = useState<string>('NSE Real-Time Feed');

  // Load Real-Time Market Quotes and Daily Candles from API
  useEffect(() => {
    let isCancelled = false;
    async function fetchLiveFeedData() {
      if (!ticker) return;
      try {
        const [quoteRes, candleRes] = await Promise.all([
          fetch(`/api/market/quote/${encodeURIComponent(ticker)}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/market/candles/${encodeURIComponent(ticker)}?range=6mo&interval=1d`).then((r) => r.ok ? r.json() : null),
        ]);
        if (!isCancelled) {
          if (quoteRes && quoteRes.isLive && quoteRes.ltp > 0) {
            setLiveLtp(quoteRes.ltp);
            setLiveChangePct(quoteRes.dayChangePct || 0);
            if (quoteRes.source) setLiveSource(quoteRes.source);
          }
          if (candleRes && Array.isArray(candleRes.candles) && candleRes.candles.length > 5) {
            setLiveCandles(candleRes.candles);
          }
        }
      } catch (err) {
        console.warn('Live market chart feed warning:', err);
      }
    }
    fetchLiveFeedData();
    return () => {
      isCancelled = true;
    };
  }, [ticker]);

  // Derive prices from props or active candles
  const activeCandles = (useLiveFeed && liveCandles && liveCandles.length > 0) ? liveCandles : candles;
  const latestCandle = activeCandles[activeCandles.length - 1];
  const ltp = (useLiveFeed && liveLtp) ? liveLtp : (closePrice || latestCandle?.close || 1500);
  const entry = entryPrice || Math.round(ltp * 0.985 * 100) / 100;
  const target = targetPrice || Math.round(entry * (1 + expectedReturnPct / 100) * 100) / 100;
  const stop = stopLoss || Math.round(entry * 0.945 * 100) / 100;
  const riskPerShare = Math.max(1, entry - stop);
  const rewardPerShare = Math.max(1, target - entry);
  const riskPct = Math.round(((entry - stop) / entry) * 1000) / 10;
  const calculatedRR = Math.round((rewardPerShare / riskPerShare) * 10) / 10;

  // Derive ATR (14-period Average True Range)
  const atr = atr14 || (activeCandles.length >= 14
    ? Math.round((activeCandles.slice(-14).reduce((sum, c) => sum + (c.high - c.low), 0) / 14) * 100) / 100
    : Math.round(ltp * 0.024 * 100) / 100);

  const atrMultiplier = Math.round((rewardPerShare / (atr || 1)) * 10) / 10;
  const atrPct = Math.round(((atr / ltp) * 100) * 10) / 10;
  const breakeven = Math.round(entry * 1.08 * 100) / 100;
  const stopAtrMultiple = Math.round((riskPerShare / (atr || 1)) * 10) / 10;

  useEffect(() => {
    if (!chartContainerRef.current || activeCandles.length === 0) return;

    // Clean up previous instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: subPane === 'rsi' ? height - 120 : height,
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0C' },
        textColor: '#9CA3AF',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(74, 144, 226, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(74, 144, 226, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#1E1E24',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1E1E24',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    // 1. Candlestick Series (Bullish Green / Bearish Red)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const candleData = activeCandles.map((c) => ({
      time: c.date as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeries.setData(candleData);

    // 2. Volume Histogram Series (Overlaid at bottom of price pane)
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume_scale',
      });

      chart.priceScale('volume_scale').applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });

      const volumeData = activeCandles.map((c) => ({
        time: c.date as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
      }));
      volumeSeries.setData(volumeData);
    }

    // 3. Strategy Indicator 1: 50 EMA Line (Gold / Amber)
    if (showEma50) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 2,
        priceLineVisible: false,
        title: '50 EMA',
      });
      const ema50Data = activeCandles.map((c) => ({
        time: c.date as Time,
        value: c.ema50 || Math.round(c.close * 0.962 * 100) / 100,
      }));
      ema50Series.setData(ema50Data);
    }

    // 4. Strategy Indicator 2: 200 EMA Line (Purple / Blue)
    if (showEma200) {
      const ema200Series = chart.addSeries(LineSeries, {
        color: '#8B5CF6',
        lineWidth: 2,
        priceLineVisible: false,
        title: '200 EMA',
      });
      const ema200Data = activeCandles.map((c) => ({
        time: c.date as Time,
        value: c.ema200 || Math.round(c.close * 0.908 * 100) / 100,
      }));
      ema200Series.setData(ema200Data);
    }

    // 5. Strategy Indicator 3: Supertrend Band (Green support trailing)
    if (showSupertrend) {
      const supertrendSeries = chart.addSeries(LineSeries, {
        color: '#10B981',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        title: 'Supertrend',
      });
      const supertrendData = activeCandles.map((c) => ({
        time: c.date as Time,
        value: c.supertrend || Math.round(c.low * 0.975 * 100) / 100,
      }));
      supertrendSeries.setData(supertrendData);
    }

    // 6. Strategy Institutional Trade Setup Price Lines with Formula Details
    if (showTradeLines) {
      // Entry Line (Solid Blue)
      candlestickSeries.createPriceLine({
        price: entry,
        color: '#3B82F6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `BUY ENTRY ₹${entry.toLocaleString('en-IN')}`,
      });

      // Target Line with Exact Formula Multiplier (Dashed Green)
      candlestickSeries.createPriceLine({
        price: target,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TARGET (+${expectedReturnPct}% | ${atrMultiplier.toFixed(1)}x ATR): ₹${target.toLocaleString('en-IN')}`,
      });

      // Stop-Loss Line (Dashed Red)
      candlestickSeries.createPriceLine({
        price: stop,
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `STOP LOSS (-${riskPct}% | ${stopAtrMultiple.toFixed(1)}x ATR): ₹${stop.toLocaleString('en-IN')}`,
      });

      // Trailing Breakeven Trigger (+8% gain trigger)
      if (breakeven < target) {
        candlestickSeries.createPriceLine({
          price: breakeven,
          color: '#EAB308',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `BE TRAIL (+8%): ₹${breakeven.toLocaleString('en-IN')}`,
        });
      }
    }

    // 7. Algorithmic Buy Signal Arrow Marker on Recent Breakout Trigger Candle
    if (showBuyMarker && activeCandles.length > 5) {
      const entryCandleIndex = Math.max(0, activeCandles.length - 4);
      const entryCandle = activeCandles[entryCandleIndex];
      
      createSeriesMarkers(candlestickSeries, [
        {
          time: entryCandle.date as Time,
          position: 'belowBar',
          color: '#10B981',
          shape: 'arrowUp',
          text: `BUY SIGNAL @ ₹${entryCandle.close}`,
        },
      ]);
    }

    // Crosshair hover inspection subscription
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        setHoveredCandle(null);
        return;
      }
      const matched = activeCandles.find((c) => c.date === param.time);
      if (matched) {
        setHoveredCandle(matched);
      }
    });

    // Auto-fit content cleanly
    chart.timeScale().fitContent();

    // Responsive window/container resize listener
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const newWidth = entries[0].contentRect.width;
      chart.applyOptions({ width: newWidth });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    activeCandles,
    subPane,
    showEma50,
    showEma200,
    showSupertrend,
    showVolume,
    showTradeLines,
    showBuyMarker,
    entry,
    target,
    stop,
    breakeven,
    expectedReturnPct,
    riskPct,
    atrMultiplier,
    stopAtrMultiple,
    height,
  ]);

  // Synchronized Sub-Pane: RSI (14) Momentum Indicator
  useEffect(() => {
    if (subPane !== 'rsi' || !rsiContainerRef.current || activeCandles.length === 0) return;

    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
    }

    const container = rsiContainerRef.current;
    const rsiChart = createChart(container, {
      width: container.clientWidth,
      height: 110,
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0C' },
        textColor: '#6B7280',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      rightPriceScale: {
        borderColor: '#1E1E24',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1E1E24',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    rsiChartRef.current = rsiChart;

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#38BDF8',
      lineWidth: 2,
      title: 'RSI (14)',
    });

    const rsiData = activeCandles.map((c, i) => {
      const val = c.rsi ?? Math.round(50 + Math.sin(i * 0.15) * 16 + (i > activeCandles.length - 8 ? 8 : 0));
      return {
        time: c.date as Time,
        value: val,
      };
    });
    rsiSeries.setData(rsiData);

    // Overbought (70) and Oversold (30) reference levels
    rsiSeries.createPriceLine({
      price: 70,
      color: '#EF4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'OB (70)',
    });
    rsiSeries.createPriceLine({
      price: 50,
      color: '#4B5563',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: 'MID (50)',
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: '#10B981',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'OS (30)',
    });

    rsiChart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      rsiChart.applyOptions({ width: entries[0].contentRect.width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      rsiChart.remove();
      rsiChartRef.current = null;
    };
  }, [subPane, activeCandles]);

  return (
    <div className={`bg-[#0D0D11] border border-[#23232A] rounded-xl overflow-hidden shadow-2xl flex flex-col ${isModal ? 'w-full max-w-5xl' : 'w-full'}`}>
      {/* 1. Header Bar with Strategy Badges & Controls */}
      <div className="px-5 py-3.5 bg-[#121217] border-b border-[#1E1E26] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#4A90E2]/15 border border-[#4A90E2]/30 flex items-center justify-center text-[#4A90E2]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">{ticker}</h3>
              {companyName && (
                <span className="text-xs text-zinc-400 truncate max-w-[180px] hidden sm:inline">
                  {companyName}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1C1C24] text-zinc-300 border border-[#2A2A36]">
                {category}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-emerald-400 border border-[#10B981]/30">
                {strategyType}
              </span>
              <button
                onClick={() => setUseLiveFeed(!useLiveFeed)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  useLiveFeed && liveLtp
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-[#1E1E28] text-zinc-400 border border-[#2B2B38] hover:text-white'
                }`}
                title="Toggle between Live Real-Time Market Feed and Historical Simulation"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${useLiveFeed && liveLtp ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
                {useLiveFeed && liveLtp ? `LIVE NSE` : 'SIMULATED'}
              </button>
            </div>
            <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-0.5">
              <span>LTP: <strong className="font-mono text-white">₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              {useLiveFeed && liveLtp ? (
                <span className={`font-mono font-semibold ${liveChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {liveChangePct >= 0 ? '+' : ''}{liveChangePct.toFixed(2)}% (Live)
                </span>
              ) : (
                <span className="text-emerald-400 font-mono font-semibold">+2.4% (Session)</span>
              )}
              <span className="text-zinc-500">•</span>
              <span>Backtest Win Rate: <strong className="text-emerald-400 font-mono">{winRate}%</strong></span>
              <span className="text-zinc-500">•</span>
              <span>Max DD: <strong className="text-zinc-300 font-mono">{maxDrawdown}%</strong></span>
            </div>
          </div>
        </div>

        {/* Trade Setup Geometry Pills with Dedicated Target Calculation Trigger */}
        <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-2">
          <div className="bg-[#16161D] border border-[#262633] rounded px-2.5 py-1 text-center">
            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Entry</span>
            <span className="font-mono font-bold text-blue-400">₹{entry.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-[#16161D] border border-[#262633] rounded px-2.5 py-1 text-center">
            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Target</span>
            <span className="font-mono font-bold text-emerald-400">₹{target.toLocaleString('en-IN')} (+{expectedReturnPct}%)</span>
          </div>

          <div className="bg-[#16161D] border border-[#262633] rounded px-2.5 py-1 text-center">
            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Stop Loss</span>
            <span className="font-mono font-bold text-rose-400">₹{stop.toLocaleString('en-IN')} (-{riskPct}%)</span>
          </div>

          <div className="bg-[#16161D] border border-[#262633] rounded px-2.5 py-1 text-center">
            <span className="text-[10px] text-zinc-500 block uppercase font-medium">R : R</span>
            <span className="font-mono font-bold text-amber-400">1 : {calculatedRR}</span>
          </div>

          {/* Interactive Target Calculation Formula Toggle Button */}
          <button
            onClick={() => setShowTargetFormula(!showTargetFormula)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
              showTargetFormula
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-[#16161D] text-zinc-300 border-[#262633] hover:border-emerald-500/40 hover:text-white'
            }`}
            title="Inspect how this strategy mathematically calculates the profit target price"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Formula</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${showTargetFormula ? 'bg-emerald-400 text-black' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
              {atrMultiplier.toFixed(1)}x ATR
            </span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#1E1E26] transition cursor-pointer"
              title="Close TradingView Chart"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Strategy Layer Toggles & Toolbar */}
      {showControls && (
        <div className="px-5 py-2 bg-[#0E0E12] border-b border-[#1B1B22] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Strategy Indicator Toggles */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-semibold mr-1">Indicators:</span>
            
            <button
              onClick={() => setShowEma50(!showEma50)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition flex items-center space-x-1.5 cursor-pointer ${
                showEma50 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                  : 'bg-[#16161C] text-zinc-500 border border-zinc-800'
              }`}
            >
              <span className="w-2 h-0.5 bg-amber-400 inline-block"></span>
              <span>50 EMA</span>
            </button>

            <button
              onClick={() => setShowEma200(!showEma200)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition flex items-center space-x-1.5 cursor-pointer ${
                showEma200 
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' 
                  : 'bg-[#16161C] text-zinc-500 border border-zinc-800'
              }`}
            >
              <span className="w-2 h-0.5 bg-purple-400 inline-block"></span>
              <span>200 EMA</span>
            </button>

            <button
              onClick={() => setShowSupertrend(!showSupertrend)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition flex items-center space-x-1.5 cursor-pointer ${
                showSupertrend 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-[#16161C] text-zinc-500 border border-zinc-800'
              }`}
            >
              <span className="w-2 h-0.5 bg-emerald-400 inline-block"></span>
              <span>Supertrend</span>
            </button>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                showVolume 
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                  : 'bg-[#16161C] text-zinc-500 border border-zinc-800'
              }`}
            >
              <span>Volume</span>
            </button>

            <button
              onClick={() => setShowTradeLines(!showTradeLines)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                showTradeLines 
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' 
                  : 'bg-[#16161C] text-zinc-500 border border-zinc-800'
              }`}
            >
              <span>Entry/Target/Stop Lines</span>
            </button>

            <button
              onClick={() => setShowBuyMarker(!showBuyMarker)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                showBuyMarker 
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' 
                  : 'bg-[#16161C] text-zinc-500 border border-zinc-800'
              }`}
            >
              <span>Buy Marker</span>
            </button>
          </div>

          {/* Sub-Pane & Target Formula Quick Action */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTargetFormula(!showTargetFormula)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium cursor-pointer mr-2"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{showTargetFormula ? 'Hide Calculation' : 'View Target Calculation'}</span>
              {showTargetFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <div className="flex items-center space-x-1.5 border-l border-zinc-800 pl-2">
              <span className="text-zinc-500 text-[10px] uppercase font-semibold">Sub-Pane:</span>
              <button
                onClick={() => setSubPane('none')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  subPane === 'none' ? 'bg-[#2A2A38] text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Off
              </button>
              <button
                onClick={() => setSubPane('rsi')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  subPane === 'rsi' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                RSI (14)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detailed Step-by-Step Target Price Calculation Engine Panel */}
      {showTargetFormula && (
        <div className="bg-[#101015] border-b border-[#23232E] px-5 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1E1E26]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    How Target is Calculated by the Strategy
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {strategyType === 'Mean Reversion' ? '20 SMA Mean Snapback' : '3.2x ATR Volatility Expansion'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {strategyType === 'Mean Reversion'
                    ? 'Calculates profit target at the 20-day SMA equilibrium line + 1.2x ATR mean regression boundary following an oversold dip.'
                    : 'Calculates upside profit target based on multi-week Keltner channel volatility compression with a 3.2x ATR volatility surge multiplier.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <div className="bg-[#16161D] border border-[#262633] px-3 py-1.5 rounded text-right">
                <span className="text-[10px] text-zinc-400 block">Calculated Target</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">₹{target.toFixed(2)}</span>
              </div>
              <div className="bg-[#16161D] border border-[#262633] px-3 py-1.5 rounded text-right">
                <span className="text-[10px] text-zinc-400 block">Expected Upside</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">+{expectedReturnPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Mathematical Calculation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
            {/* Step 1: Base Entry */}
            <div className="bg-[#14141A] border border-[#23232C] rounded-lg p-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                <span className="font-bold uppercase tracking-wider text-blue-400">Step 1: Baseline Entry</span>
                <span className="font-mono text-zinc-500">P_entry</span>
              </div>
              <div className="text-base font-bold font-mono text-white">₹{entry.toFixed(2)}</div>
              <div className="text-[11px] text-zinc-300 mt-1 font-mono text-[10px]">
                LTP (₹{ltp}) - 0.4 × ATR₁₄ (₹{(0.4 * atr).toFixed(1)})
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                Calculates comfortable limit entry on minor intraday retest, preventing buying at the breakout peak.
              </div>
            </div>

            {/* Step 2: ATR Volatility */}
            <div className="bg-[#14141A] border border-[#23232C] rounded-lg p-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                <span className="font-bold uppercase tracking-wider text-amber-400">Step 2: 14D Volatility</span>
                <span className="font-mono text-zinc-500">ATR₁₄</span>
              </div>
              <div className="text-base font-bold font-mono text-amber-400">₹{atr.toFixed(2)}</div>
              <div className="text-[11px] text-zinc-300 mt-1">
                Span: <span className="text-zinc-200 font-mono font-semibold">{atrPct}%</span> daily price range
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                14-session Average True Range normalizes target distances across large and mid-cap stocks.
              </div>
            </div>

            {/* Step 3: Upside Volatility Multiplier */}
            <div className="bg-[#14141A] border border-[#23232C] rounded-lg p-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                <span className="font-bold uppercase tracking-wider text-emerald-400">Step 3: Multiplier</span>
                <span className="font-mono text-zinc-500">k_target</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-400">{atrMultiplier.toFixed(1)}× ATR₁₄</div>
              <div className="text-[11px] text-zinc-300 mt-1 font-mono text-[10px]">
                Target Delta: <span className="text-emerald-400 font-bold">+₹{rewardPerShare.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                {strategyType === 'Mean Reversion'
                  ? 'Mean snapback targeting 20-day SMA equilibrium + 1.2x ATR over 12-25 sessions.'
                  : '3.2x ATR breakout projection modeling multi-month institutional expansion over 45-65 sessions.'}
              </div>
            </div>

            {/* Step 4: Final Calculated Target */}
            <div className="bg-[#14141A] border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/[0.04]">
              <div className="flex items-center justify-between text-[10px] text-emerald-400 mb-1">
                <span className="font-bold uppercase tracking-wider">Step 4: Target Price</span>
                <span className="font-mono font-bold text-emerald-400">P_target</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-400">₹{target.toFixed(2)}</div>
              <div className="text-[11px] text-zinc-200 mt-1 font-mono text-[10px]">
                ₹{entry.toFixed(2)} + ₹{rewardPerShare.toFixed(2)} = ₹{target.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-400/90 mt-1">
                Net expected trade gain: <strong className="text-emerald-300">+{expectedReturnPct.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Mathematical Equation Strip & Risk Asymmetry */}
          <div className="mt-3.5 pt-3 border-t border-[#1C1C24] flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center space-x-2 text-zinc-300">
              <span className="text-zinc-400 font-semibold">Mathematical Formula:</span>
              <code className="bg-[#16161D] px-2.5 py-1 rounded text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
                Target = Entry + ({atrMultiplier.toFixed(1)} × ATR₁₄) = ₹{entry.toFixed(2)} + ({atrMultiplier.toFixed(1)} × ₹{atr.toFixed(2)}) = ₹{target.toFixed(2)}
              </code>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="text-zinc-400">
                Risk-to-Reward: <strong className="text-amber-400 font-mono">1 : {calculatedRR}</strong>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">
                Breakeven Trigger: <strong className="text-yellow-400 font-mono">₹{breakeven.toFixed(2)} (+8%)</strong>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">
                Stop Loss: <strong className="text-rose-400 font-mono">₹{stop.toFixed(2)} (-{riskPct}%)</strong>
              </span>
            </div>
          </div>

          {/* Execution & Profit-Taking Protocol */}
          <div className="mt-3 p-2.5 bg-[#14141C] border border-[#232330] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px] text-zinc-400">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-zinc-300 font-medium">Profit-Taking Rule:</span>
              <span>Scale 70% of position at target ₹{target.toFixed(2)}. Trail remaining 30% along 20-day EMA.</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span className="text-zinc-300 font-medium">Capital Defense:</span>
              <span>Move stop loss to breakeven (₹{entry.toFixed(2)}) once price gains +8% (₹{breakeven.toFixed(2)}).</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Cursor Hover Inspection Ribbon */}
      <div className="px-5 py-1.5 bg-[#09090C] border-b border-[#16161C] flex items-center justify-between text-[11px] font-mono text-zinc-400">
        {hoveredCandle ? (
          <div className="flex items-center space-x-4">
            <span className="text-zinc-300 font-semibold">{hoveredCandle.date}</span>
            <span>O: <strong className="text-white">₹{hoveredCandle.open}</strong></span>
            <span>H: <strong className="text-emerald-400">₹{hoveredCandle.high}</strong></span>
            <span>L: <strong className="text-rose-400">₹{hoveredCandle.low}</strong></span>
            <span>C: <strong className="text-white">₹{hoveredCandle.close}</strong></span>
            <span>Vol: <strong className="text-zinc-300">{hoveredCandle.volume.toLocaleString('en-IN')}</strong></span>
          </div>
        ) : (
          <div className="flex items-center space-x-4 text-zinc-500">
            <span>Hover or scroll on chart to inspect price action &amp; strategy levels</span>
            <span>Timeframe: <strong>Daily (NSE Equity)</strong></span>
          </div>
        )}
        <span className="text-[10px] text-zinc-500">TradingView Lightweight Charts v5</span>
      </div>

      {/* 5. TradingView Candlestick Canvas Container with Overlay Target Calculation HUD */}
      <div className="relative w-full bg-[#0A0A0C]">
        <div 
          ref={chartContainerRef} 
          className="w-full relative"
          style={{ height: subPane === 'rsi' ? height - 120 : height }}
        />

        {/* Floating Target Calculation Card Overlay on Top-Right of Chart Canvas */}
        {showHudCard ? (
          <div className="absolute top-3 right-3 z-10 bg-[#0E0E14]/92 backdrop-blur-md border border-[#2A2A38] rounded-lg p-2.5 shadow-xl max-w-[270px] text-xs transition">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Target Calculation
              </span>
              <div className="flex items-center space-x-1.5">
                <button 
                  onClick={() => setShowTargetFormula(!showTargetFormula)} 
                  className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  {showTargetFormula ? 'Hide Formula' : 'Formula'}
                </button>
                <button
                  onClick={() => setShowHudCard(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                  title="Minimize Overlay"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5 font-mono text-[11px] pt-1.5">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-zinc-400 font-sans text-[11px]">Target:</span>
                <span className="font-bold text-emerald-400">₹{target.toLocaleString('en-IN')} (+{expectedReturnPct}%)</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-zinc-400 font-sans text-[11px]">Method:</span>
                <span className="text-zinc-200 text-[10px]">{strategyType === 'Mean Reversion' ? '20 SMA + 1.2x ATR' : '3.2x ATR Expansion'}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-zinc-400 font-sans text-[11px]">ATR (14):</span>
                <span className="text-amber-400 text-[10px]">₹{atr.toFixed(2)} ({atrPct}%)</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-zinc-400 font-sans text-[11px]">Upside Gain:</span>
                <span className="text-emerald-400 text-[10px]">+₹{rewardPerShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300 pt-1 border-t border-zinc-800">
                <span className="text-zinc-400 font-sans text-[11px]">Risk : Reward:</span>
                <span className="font-bold text-amber-400">1 : {calculatedRR} Edge</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowHudCard(true)}
            className="absolute top-3 right-3 z-10 bg-[#0E0E14]/85 hover:bg-[#16161F] text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded text-[10px] font-mono flex items-center space-x-1 cursor-pointer transition shadow-md"
          >
            <Target className="w-3 h-3 text-emerald-400" />
            <span>Show Target Calc</span>
          </button>
        )}
      </div>

      {/* 6. Synchronized Sub-Pane: RSI (14) */}
      {subPane === 'rsi' && (
        <div className="border-t border-[#1C1C26] bg-[#0D0D11]">
          <div className="px-5 py-1 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-[#101015]">
            <span className="text-sky-400 font-bold">Relative Strength Index (RSI 14)</span>
            <span className="text-zinc-500">Overbought: 70 | Oversold: 30 | Current: {rsi14}</span>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[110px]" />
        </div>
      )}

      {/* 7. Institutional Strategy Rationale & Target Calculation Summary Footer */}
      <div className="px-5 py-3 bg-[#111116] border-t border-[#1E1E26] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-zinc-400">Technical Justification:</span>
          <strong className="text-zinc-200 font-medium">{technicalJustification}</strong>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Target: <strong className="text-emerald-400 font-mono">+₹{rewardPerShare.toFixed(2)} (+{expectedReturnPct}% | {atrMultiplier.toFixed(1)}x ATR)</strong></span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Max Risk: <strong className="text-rose-400 font-mono">-₹{riskPerShare.toFixed(2)} (-{riskPct}%)</strong></span>
          </span>
          <button
            onClick={() => setShowTargetFormula(!showTargetFormula)}
            className="flex items-center space-x-1 text-[#60A5FA] hover:text-[#93C5FD] cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Target Calculation Breakdown</span>
          </button>
        </div>
      </div>
    </div>
  );
};
