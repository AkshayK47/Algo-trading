import React from 'react';
import { TradingViewStrategyChart } from './TradingViewStrategyChart';
import { Candle, QuantitativeSignal } from '../types';

interface TradingGraphModalProps {
  isOpen?: boolean;
  onClose: () => void;
  stock?: QuantitativeSignal;
  ticker?: string;
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
  atr14?: number;
  initialShowTargetFormula?: boolean;
}

export const TradingGraphModal: React.FC<TradingGraphModalProps> = ({
  isOpen = true,
  onClose,
  stock,
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
  strategyType = 'Hybrid Breakout',
  winRate,
  maxDrawdown,
  atr14,
  initialShowTargetFormula = false,
}) => {
  if (!isOpen) return null;

  const resolvedTicker = ticker || stock?.ticker || 'NIFTY';
  const resolvedCompanyName = companyName || stock?.companyName;
  const resolvedCategory = category || stock?.marketCapCategory;
  const resolvedClosePrice = closePrice ?? stock?.closePrice;
  const resolvedEntryPrice = entryPrice ?? stock?.comfortableEntryPrice;
  const resolvedTargetPrice = targetPrice ?? stock?.targetPrice;
  const resolvedStopLoss = stopLoss ?? stock?.stopLoss;
  const resolvedRiskReward = riskRewardRatio ?? stock?.riskRewardRatio;
  const resolvedExpectedReturn = expectedReturnPct ?? stock?.expectedReturnPct;
  const resolvedTechJust = technicalJustification || stock?.technicalJustification;
  const resolvedRsi14 = rsi14 ?? stock?.rsi14;
  const resolvedMacdHist = macdHist ?? stock?.macdHist;
  const resolvedCandles = candles || stock?.history || [];
  const resolvedWinRate = winRate ?? stock?.backtestWinRate;
  const resolvedMaxDrawdown = maxDrawdown ?? stock?.backtestMdd;
  const resolvedAtr14 = atr14 ?? stock?.atr14;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div 
        id="trading-graph-modal"
        className="relative w-full max-w-5xl bg-[#0D0D11] border border-[#262633] rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <TradingViewStrategyChart
          ticker={resolvedTicker}
          companyName={resolvedCompanyName}
          category={resolvedCategory}
          closePrice={resolvedClosePrice}
          entryPrice={resolvedEntryPrice}
          targetPrice={resolvedTargetPrice}
          stopLoss={resolvedStopLoss}
          riskRewardRatio={resolvedRiskReward}
          expectedReturnPct={resolvedExpectedReturn}
          technicalJustification={resolvedTechJust}
          rsi14={resolvedRsi14}
          macdHist={resolvedMacdHist}
          candles={resolvedCandles}
          strategyType={strategyType}
          winRate={resolvedWinRate}
          maxDrawdown={resolvedMaxDrawdown}
          atr14={resolvedAtr14}
          initialShowTargetFormula={initialShowTargetFormula}
          height={500}
          showControls={true}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
