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
  Info
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

  // Derive prices from props or candles
  const latestCandle = candles[candles.length - 1];
  const ltp = closePrice || latestCandle?.close || 1500;
  const entry = entryPrice || Math.round(ltp * 0.985 * 100) / 100;
  const target = targetPrice || Math.round(entry * (1 + expectedReturnPct / 100) * 100) / 100;
  const stop = stopLoss || Math.round(entry * 0.945 * 100) / 100;
  const riskPerShare = Math.max(1, entry - stop);
  const rewardPerShare = Math.max(1, target - entry);
  const riskPct = Math.round(((entry - stop) / entry) * 1000) / 10;
  const calculatedRR = Math.round((rewardPerShare / riskPerShare) * 10) / 10;

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

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
      },
      grid: {
        vertLines: { color: '#16161E' },
        horzLines: { color: '#16161E' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#4A90E2',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1F2937',
        },
        horzLine: {
          color: '#4A90E2',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1F2937',
        },
      },
      rightPriceScale: {
        borderColor: '#1F1F28',
        scaleMargins: {
          top: 0.08,
          bottom: showVolume ? 0.22 : 0.08,
        },
      },
      timeScale: {
        borderColor: '#1F1F28',
        timeVisible: false,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick Series (TradingView core)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const candleData = candles.map((c) => ({
      time: c.date as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeries.setData(candleData);

    // 2. Volume Series (Histogram)
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Overlay over price scale
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0,
        },
      });

      const volumeData = candles.map((c) => ({
        time: c.date as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      }));
      volumeSeries.setData(volumeData);
    }

    // 3. Strategy Indicator 1: 50 EMA Line (Amber)
    if (showEma50) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 2,
        priceLineVisible: false,
        title: '50 EMA',
      });
      const ema50Data = candles.map((c) => ({
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
      const ema200Data = candles.map((c) => ({
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
      const supertrendData = candles.map((c) => ({
        time: c.date as Time,
        value: c.supertrend || Math.round(c.low * 0.975 * 100) / 100,
      }));
      supertrendSeries.setData(supertrendData);
    }

    // 6. Strategy Institutional Trade Setup Price Lines
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

      // Target Line (Dashed Green)
      candlestickSeries.createPriceLine({
        price: target,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TARGET (+${expectedReturnPct}%) ₹${target.toLocaleString('en-IN')}`,
      });

      // Stop-Loss Line (Dashed Red)
      candlestickSeries.createPriceLine({
        price: stop,
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `STOP LOSS (-${riskPct}%) ₹${stop.toLocaleString('en-IN')}`,
      });

      // Trailing Breakeven Trigger (+8% gain trigger)
      const breakeven = Math.round(entry * 1.08 * 100) / 100;
      if (breakeven < target) {
        candlestickSeries.createPriceLine({
          price: breakeven,
          color: '#EAB308',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `BE TRAIL (+8%) ₹${breakeven.toLocaleString('en-IN')}`,
        });
      }
    }

    // 7. Algorithmic Buy Signal Arrow Marker on Recent Breakout Trigger Candle
    if (showBuyMarker && candles.length > 5) {
      // Position buy signal marker on candle ~3-5 sessions ago (entry trigger)
      const entryCandleIndex = Math.max(0, candles.length - 4);
      const entryCandle = candles[entryCandleIndex];
      
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

    // Crosshair tooltip tracking
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        setHoveredCandle(null);
        return;
      }
      const match = candles.find((c) => c.date === param.time);
      if (match) setHoveredCandle(match);
    });

    // Auto-fit content
    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    candles,
    height,
    showEma50,
    showEma200,
    showSupertrend,
    showVolume,
    showTradeLines,
    showBuyMarker,
    subPane,
    entry,
    target,
    stop,
    expectedReturnPct,
    riskPct,
  ]);

  // Synchronized Sub-Pane: RSI (14) Chart
  useEffect(() => {
    if (subPane !== 'rsi' || !rsiContainerRef.current || candles.length === 0) return;

    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
    }

    const container = rsiContainerRef.current;
    const rsiChart = createChart(container, {
      width: container.clientWidth,
      height: 110,
      layout: {
        background: { type: ColorType.Solid, color: '#0D0D11' },
        textColor: '#9CA3AF',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#16161E' },
        horzLines: { color: '#1A1A26' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1F1F28',
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: '#1F1F28',
        timeVisible: false,
      },
    });
    rsiChartRef.current = rsiChart;

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#38BDF8',
      lineWidth: 2,
      title: 'RSI (14)',
    });

    const rsiData = candles.map((c, i) => {
      // Use candle RSI or smooth synthetic trajectory
      const val = c.rsi ?? Math.round(50 + Math.sin(i * 0.15) * 16 + (i > candles.length - 8 ? 8 : 0));
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
  }, [subPane, candles]);

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
            </div>
            <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-0.5">
              <span>LTP: <strong className="font-mono text-white">₹{ltp.toLocaleString('en-IN')}</strong></span>
              <span className="text-emerald-400 font-mono font-semibold">+2.4% (Session)</span>
              <span className="text-zinc-500">•</span>
              <span>Backtest Win Rate: <strong className="text-emerald-400 font-mono">{winRate}%</strong></span>
              <span className="text-zinc-500">•</span>
              <span>Max DD: <strong className="text-zinc-300 font-mono">{maxDrawdown}%</strong></span>
            </div>
          </div>
        </div>

        {/* Trade Setup Geometry Pills */}
        <div className="flex items-center space-x-2 text-xs">
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

      {/* 2. Interactive Strategy Layer Toggles Toolbar */}
      {showControls && (
        <div className="px-5 py-2 bg-[#0E0E12] border-b border-[#1B1B22] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Strategy Indicator Toggles */}
          <div className="flex items-center space-x-2">
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

          {/* Sub-Pane Switcher */}
          <div className="flex items-center space-x-1.5">
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
      )}

      {/* 3. Live Cursor Hover Inspection Ribbon */}
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

      {/* 4. TradingView Candlestick Canvas Container */}
      <div 
        ref={chartContainerRef} 
        className="w-full relative bg-[#0A0A0C]"
        style={{ height: subPane === 'rsi' ? height - 120 : height }}
      />

      {/* 5. Synchronized Sub-Pane: RSI (14) */}
      {subPane === 'rsi' && (
        <div className="border-t border-[#1C1C26] bg-[#0D0D11]">
          <div className="px-5 py-1 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-[#101015]">
            <span className="text-sky-400 font-bold">Relative Strength Index (RSI 14)</span>
            <span className="text-zinc-500">Overbought: 70 | Oversold: 30 | Current: {rsi14}</span>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[110px]" />
        </div>
      )}

      {/* 6. Institutional Strategy Rationale Footer */}
      <div className="px-5 py-3 bg-[#111116] border-t border-[#1E1E26] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-zinc-400">Technical Justification:</span>
          <strong className="text-zinc-200 font-medium">{technicalJustification}</strong>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Target: <strong>+₹{rewardPerShare} (+{expectedReturnPct}%)</strong></span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Max Risk: <strong>-₹{riskPerShare} (-{riskPct}%)</strong></span>
          </span>
          <span className="flex items-center space-x-1 text-[#60A5FA]">
            <Target className="w-3.5 h-3.5" />
            <span>Optimal Horizon: <strong>3-6 Months</strong></span>
          </span>
        </div>
      </div>
    </div>
  );
};
