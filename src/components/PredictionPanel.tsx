import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Zap,
  Layers,
  Sliders,
  Copy,
  Check,
  Bookmark,
  Share2,
  RefreshCw,
  Flame,
  HelpCircle,
  PlayCircle,
} from 'lucide-react';
import {
  DrawRecord,
  LotteryConfig,
  PredictionResult,
  FilterOptions,
} from '../types';
import {
  predictFrequencyWeighted,
  predictOmissionRecovery,
  predictMarkovChain,
  predictMonteCarlo,
  predictCustomFiltered,
} from '../utils/lotteryAlgorithms';
import { getWaveColor, getZodiacByNum, getWaveLabel } from '../data/mockLotteryData';

interface PredictionPanelProps {
  draws: DrawRecord[];
  config: LotteryConfig;
  onSendToBacktest: (prediction: PredictionResult) => void;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  draws,
  config,
  onSendToBacktest,
}) => {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Custom filter options
  const [filters, setFilters] = useState<FilterOptions>({
    minSum: config.rules.sumRange[0],
    maxSum: config.rules.sumRange[1],
    oddCount: null,
    bigCount: null,
    mustIncludeReds: [],
    mustExcludeReds: [],
    allowConsecutive: true,
  });

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // fallback if canvas blocked
    }
  };

  const handleGenerateAll = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const p1 = predictFrequencyWeighted(draws, config);
      const p2 = predictOmissionRecovery(draws, config);
      const p3 = predictMarkovChain(draws, config);
      const p4 = predictMonteCarlo(draws, config);
      const p5 = predictCustomFiltered(draws, config, filters);

      setPredictions([p1, p2, p3, p4, p5]);
      setIsGenerating(false);
      triggerConfetti();
    }, 400);
  };

  const handleCopyNumbers = (pred: PredictionResult) => {
    const fullStr = `[${config.shortName}预测 - ${pred.algorithmName}] 大小: ${pred.sizePred} (1.95) | 单双: ${pred.parityPred} (1.95) | 波色: ${pred.colorPred} (${pred.colorOdds})`;

    navigator.clipboard.writeText(fullStr);
    setCopiedId(pred.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSave = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavedIds(next);
  };

  return (
    <div className="space-y-6 my-4">
      {/* Control Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                智能多模型量化预测引擎
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              结合频次权重、遗漏拐点、马尔可夫链转移概率与蒙特卡洛万次模拟，全方位提供数理缩水与极佳杀号推荐。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  矩阵算力演练中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  一键并发演算五大模型
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Filters Accordion / Settings */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-400 font-medium mb-1 block">
              和值范围 (和值: {filters.minSum} - {filters.maxSum})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={filters.minSum}
                onChange={e => setFilters({ ...filters, minSum: Number(e.target.value) })}
                className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-center"
              />
              <span className="text-slate-500">至</span>
              <input
                type="number"
                value={filters.maxSum}
                onChange={e => setFilters({ ...filters, maxSum: Number(e.target.value) })}
                className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium mb-1 block">奇号个数限制</label>
            <select
              value={filters.oddCount === null ? 'all' : filters.oddCount}
              onChange={e =>
                setFilters({
                  ...filters,
                  oddCount: e.target.value === 'all' ? null : Number(e.target.value),
                })
              }
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
            >
              <option value="all">不限 (系统自适应)</option>
              <option value="2">2奇 (奇偶比 2:4 或 2:3)</option>
              <option value="3">3奇 (奇偶比 3:3 或 3:2)</option>
              <option value="4">4奇 (奇偶比 4:2 或 4:1)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium mb-1 block">三连号过滤规则</label>
            <button
              onClick={() => setFilters({ ...filters, allowConsecutive: !filters.allowConsecutive })}
              className={`w-full px-3 py-1.5 rounded border font-medium text-left transition-all ${
                !filters.allowConsecutive
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              {!filters.allowConsecutive ? '🚫 已开启: 排除三连号 (如12,13,14)' : '✅ 允许任意连号'}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Predictions List */}
      {predictions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-bounce" />
          <p className="text-base font-semibold text-slate-200">点击上方按钮，开启算法概率演算</p>
          <p className="text-xs text-slate-500 mt-1">
            系统将针对【{config.name}】历史期数，并行运行5大数理模型生成预测单。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {predictions.map((pred) => {
            const isSaved = savedIds.has(pred.id);
            const isCopied = copiedId === pred.id;

            return (
              <div
                key={pred.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl text-white flex flex-col justify-between transition-all transform hover:-translate-y-1"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <h3 className="font-bold text-sm text-slate-100">{pred.algorithmName}</h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        置信度 {pred.confidenceScore}%
                      </span>
                    </div>
                  </div>

                  {/* Size, Parity, Wave Display */}
                  <div className="my-5 grid grid-cols-3 gap-2 text-center bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex flex-col items-center justify-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 mb-0.5">大小预测</span>
                      <span className="text-xl font-black text-amber-400">【 {pred.sizePred} 】</span>
                      <span className="text-[10px] text-emerald-400 mt-0.5 font-mono">赔率 {pred.sizeOdds}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 mb-0.5">单双预测</span>
                      <span className="text-xl font-black text-rose-400">【 {pred.parityPred} 】</span>
                      <span className="text-[10px] text-emerald-400 mt-0.5 font-mono">赔率 {pred.parityOdds}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 mb-0.5">波色预测</span>
                      <span className={`text-xl font-black ${pred.colorPred === '红波' ? 'text-red-400' : pred.colorPred === '蓝波' ? 'text-sky-400' : 'text-emerald-400'}`}>
                        【 {pred.colorPred} 】
                      </span>
                      <span className="text-[10px] text-emerald-400 mt-0.5 font-mono">赔率 {pred.colorOdds}</span>
                    </div>
                  </div>

                  {/* Rationale & Tags */}
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 leading-relaxed mb-3">
                    {pred.rationale}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {pred.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                  <button
                    onClick={() => handleCopyNumbers(pred)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        复制方案
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onSendToBacktest(pred)}
                    className="py-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium flex items-center gap-1 transition-all"
                    title="送入历史回测器验证收益率"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                    回测
                  </button>

                  <button
                    onClick={() => toggleSave(pred.id)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isSaved
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title={isSaved ? '已收藏' : '收藏此号码组'}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
