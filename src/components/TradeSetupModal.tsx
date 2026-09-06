import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Target, 
  TrendingUp, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  Zap
} from 'lucide-react';
import { SuggestionRecord } from '../types';

interface TradeSetupModalProps {
  record: SuggestionRecord | null;
  onClose: () => void;
}

export const TradeSetupModal: React.FC<TradeSetupModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  // Position Sizing Calculator state
  const [tradingCapital, setTradingCapital] = useState<number>(100000);
  const [riskTolerancePct, setRiskTolerancePct] = useState<number>(1.5); // Default 1.5% risk per trade

  const entryPrice = record.entry_price || record.captured_close_price;
  const stopLossPrice = record.stop_loss || Math.round(entryPrice * 0.945 * 100) / 100;
  const targetPrice = Math.round(entryPrice * (1 + record.expected_return_pct / 100) * 100) / 100;
  const currentLtp = record.current_price || record.captured_close_price;

  // Rupee risk & reward per share
  const riskPerShare = Math.max(0.5, entryPrice - stopLossPrice);
  const riskPct = record.risk_pct || Math.round((riskPerShare / entryPrice) * 1000) / 10;
  const rewardPerShare = Math.max(1, targetPrice - entryPrice);
  const rewardPct = record.expected_return_pct;
  const riskRewardRatio = record.risk_reward_ratio || Math.round((rewardPct / (riskPct || 1)) * 10) / 10;

  // Dynamic Position Sizing Math
  const maxRiskRupees = (tradingCapital * riskTolerancePct) / 100;
  const recommendedQuantity = Math.max(1, Math.floor(maxRiskRupees / riskPerShare));
  const totalInvestmentRupees = recommendedQuantity * entryPrice;
  const capitalUtilizationPct = Math.round((totalInvestmentRupees / (tradingCapital || 1)) * 1000) / 10;
  const potentialProfitRupees = Math.round(recommendedQuantity * rewardPerShare);
  const maxLossRupees = Math.round(recommendedQuantity * riskPerShare);

  // Trailing stop trigger (breakeven rule at +8% or 1.5x ATR gain)
  const breakevenTriggerPrice = Math.round(entryPrice * 1.08 * 100) / 100;

  // Distance from current LTP to Stop Loss
  const distanceToStopPct = Math.round(((currentLtp - stopLossPrice) / currentLtp) * 1000) / 10;
  const isStopBreached = currentLtp <= stopLossPrice;
  const isNearStop = !isStopBreached && distanceToStopPct <= 3.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="trade-setup-modal-container"
        className="relative w-full max-w-3xl bg-[#0F0F12] border border-[#23232A] rounded-xl shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E24] bg-[#141418]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#4A90E2]/15 text-[#4A90E2]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">{record.ticker}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1C1C24] text-zinc-300 border border-[#2A2A36]">
                  {record.market_cap_category}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Win Rate: {record.backtest_win_rate}%
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Institutional Trade Setup Blueprint &amp; Dynamic Position Sizing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#1E1E24] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Key Trade Parameters Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Entry Price */}
            <div className="bg-[#141418] border border-[#1E1E24] rounded-lg p-3">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Comfortable Entry</span>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                ₹{entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-zinc-500">Signal price anchor</span>
            </div>

            {/* Stop Loss (Crucial Indicator) */}
            <div className="bg-[#141418] border border-rose-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Stop Loss (Hard)</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                ₹{stopLossPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-rose-400/80 font-mono">
                Risk: -{riskPct.toFixed(1)}% (-₹{riskPerShare.toFixed(2)}/sh)
              </span>
            </div>

            {/* Target Price */}
            <div className="bg-[#141418] border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Target (3-6M)</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                ₹{targetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono">
                Gain: +{rewardPct.toFixed(1)}% (+₹{rewardPerShare.toFixed(2)}/sh)
              </span>
            </div>

            {/* Asymmetric Risk:Reward */}
            <div className="bg-[#141418] border border-[#1E1E24] rounded-lg p-3">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Risk : Reward</span>
              <div className="text-lg font-bold font-mono text-[#60A5FA] mt-0.5">
                1 : {riskRewardRatio}
              </div>
              <span className="text-[10px] text-zinc-400">Asymmetric Edge</span>
            </div>
          </div>

          {/* Live Stop Loss Proximity Status Bar */}
          <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
            isStopBreached
              ? 'bg-rose-950/25 border-rose-500/40 text-rose-300'
              : isNearStop
              ? 'bg-amber-950/25 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center space-x-2.5">
              {isStopBreached ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : isNearStop ? (
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isStopBreached ? 'Stop Loss Breached! Exit Trade' : isNearStop ? 'Caution: Near Stop Loss Zone' : 'Stop Loss Protected: Safe Trade Buffer'}
                </span>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Live LTP is <span className="font-mono font-bold">₹{currentLtp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  {isStopBreached ? ` (dropped below ₹${stopLossPrice})` : ` (${distanceToStopPct >= 0 ? `+${distanceToStopPct.toFixed(1)}%` : `${distanceToStopPct.toFixed(1)}%`} cushion above Stop Loss)`}
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
              isStopBreached 
                ? 'bg-rose-500/30 text-rose-200' 
                : isNearStop 
                ? 'bg-amber-500/30 text-amber-200' 
                : 'bg-emerald-500/25 text-emerald-200'
            }`}>
              {isStopBreached ? 'EXIT NOW' : `${distanceToStopPct > 0 ? `+${distanceToStopPct}%` : `${distanceToStopPct}%`} BUFFER`}
            </span>
          </div>

          {/* Interactive Position Sizing & Capital Allocation Calculator */}
          <div className="bg-[#141418] border border-[#1E1E24] rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E24] pb-3">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-[#4A90E2]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Quant Position Sizing Calculator (Strict Risk Budgeting)
                </h4>
              </div>
              <span className="text-[10px] text-zinc-400">Institutional 1-2% Fixed Fractional Risk Model</span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-300 font-medium block mb-1">
                  Your Total Trading Capital (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-zinc-500">₹</span>
                  <input
                    type="number"
                    value={tradingCapital}
                    onChange={(e) => setTradingCapital(Math.max(5000, Number(e.target.value) || 0))}
                    className="w-full bg-[#0D0D10] border border-[#2A2A34] rounded-md pl-7 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#4A90E2]"
                    step="10000"
                    min="5000"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-medium block mb-1">
                  Account Risk Tolerance per Trade (% of Capital)
                </label>
                <div className="flex space-x-2">
                  {[1.0, 1.5, 2.0, 3.0].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setRiskTolerancePct(pct)}
                      className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition cursor-pointer ${
                        riskTolerancePct === pct
                          ? 'bg-[#4A90E2] text-white shadow'
                          : 'bg-[#1C1C24] text-zinc-400 hover:text-white border border-[#2A2A36]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sizing Results Output Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded bg-[#0E0E12] border border-[#1E1E24]">
                <span className="text-[10px] font-medium text-zinc-500 uppercase block">Recommended Quantity</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {recommendedQuantity} <span className="text-xs font-normal text-zinc-400">shares</span>
                </div>
                <span className="text-[10px] text-zinc-500">Based on risk budget</span>
              </div>

              <div className="p-2.5 rounded bg-[#0E0E12] border border-[#1E1E24]">
                <span className="text-[10px] font-medium text-zinc-500 uppercase block">Capital To Allocate</span>
                <div className="text-base font-bold font-mono text-[#60A5FA] mt-0.5">
                  ₹{totalInvestmentRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[10px] text-zinc-500">{capitalUtilizationPct}% of your capital</span>
              </div>

              <div className="p-2.5 rounded bg-[#0E0E12] border border-rose-950/30">
                <span className="text-[10px] font-medium text-rose-400 uppercase block">Max Loss if Stop Hit</span>
                <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                  -₹{maxLossRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[10px] text-rose-400/80">Strictly capped at {riskTolerancePct}%</span>
              </div>

              <div className="p-2.5 rounded bg-[#0E0E12] border border-emerald-950/30">
                <span className="text-[10px] font-medium text-emerald-400 uppercase block">Projected Profit at Target</span>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  +₹{potentialProfitRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[10px] text-emerald-400/80">+{rewardPct.toFixed(1)}% on position</span>
              </div>
            </div>
          </div>

          {/* Institutional Strategy Order Execution Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>How To Place This Trade in Your Broker (Upstox / Zerodha / Groww)</span>
            </h4>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#141418] border border-[#1E1E24]">
                <div className="w-5 h-5 rounded-full bg-[#4A90E2]/20 text-[#4A90E2] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Entry Order (Comfortable Entry Zone)</span>
                    <span className="text-xs font-mono font-bold text-zinc-300">₹{entryPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Place a <strong>LIMIT BUY</strong> order for <strong>{recommendedQuantity} shares</strong> at or near ₹{entryPrice.toFixed(2)}. Avoid chasing the stock if it trades more than 1.5% above entry.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#141418] border border-rose-500/20">
                <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400">Hard Stop Loss Order (Mandatory GTT)</span>
                    <span className="text-xs font-mono font-bold text-rose-400">₹{stopLossPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Immediately create a <strong>GTT (Good-Till-Triggered) Stop-Loss</strong> order at <strong>₹{stopLossPrice.toFixed(2)}</strong>. This is derived from 1.8x ATR below the entry pivot. <em>Rule: Never widen or cancel your stop loss.</em>
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#141418] border border-amber-500/20">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Trailing Stop Rule (Breakeven Lock)</span>
                    <span className="text-xs font-mono font-bold text-amber-400">Trigger at ₹{breakevenTriggerPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    When the stock price rallies +8% to <strong>₹{breakevenTriggerPrice.toFixed(2)}</strong>, modify your GTT Stop Loss up to your <strong>Entry Price (₹{entryPrice.toFixed(2)})</strong>. The trade becomes 100% risk-free.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#141418] border border-emerald-500/20">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">Profit Target &amp; Exit Management</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">Target ₹{targetPrice.toFixed(2)} (+{rewardPct}%)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Upon reaching Target Price of <strong>₹{targetPrice.toFixed(2)}</strong>, book 50% profit (sell {Math.max(1, Math.floor(recommendedQuantity / 2))} shares). Trail the remaining 50% shares with a trailing stop along the 20-day Exponential Moving Average.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Justification */}
          <div className="p-3 bg-[#0C0C0F] border border-[#1E1E24] rounded-lg">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">
              Quant Technical Thesis
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {record.technical_justification}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#1E1E24] bg-[#141418]">
          <span className="text-[11px] text-zinc-500">
            Computed by NSE Alpha Quant Dynamic Performance Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F1F26] hover:bg-[#2A2A34] text-white rounded text-xs font-bold transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
