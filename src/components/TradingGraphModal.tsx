import React from 'react';
import { X, Activity } from 'lucide-react';
import { TradingViewStrategyChart } from './TradingViewStrategyChart';
import { Candle } from '../types';

interface TradingGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export const TradingGraphModal: React.FC<TradingGraphModalProps> = ({
  isOpen,
  onClose,
  ticker,
  companyName,
  category,
  closePrice,
  entryPrice,
  targetPrice,
  stopLoss,
  riskRewardRatio,
  expectedReturnPct,
  technicalJustification,
  rsi14,
  macdHist,
  candles,
  strategyType,
  winRate,
  maxDrawdown,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div 
        id="trading-graph-modal"
        className="relative w-full max-w-5xl bg-[#0D0D11] border border-[#262633] rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <TradingViewStrategyChart
          ticker={ticker}
          companyName={companyName}
          category={category}
          closePrice={closePrice}
          entryPrice={entryPrice}
          targetPrice={targetPrice}
          stopLoss={stopLoss}
          riskRewardRatio={riskRewardRatio}
          expectedReturnPct={expectedReturnPct}
          technicalJustification={technicalJustification}
          rsi14={rsi14}
          macdHist={macdHist}
          candles={candles}
          strategyType={strategyType}
          winRate={winRate}
          maxDrawdown={maxDrawdown}
          height={500}
          showControls={true}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
