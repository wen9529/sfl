import React from 'react';
import { Calendar, DollarSign, Award, Flame, RefreshCw } from 'lucide-react';
import { DrawRecord, LotteryConfig } from '../types';
import { calculateDrawStats } from '../utils/lotteryAlgorithms';

interface OverviewStatsProps {
  config: LotteryConfig;
  latestDraw: DrawRecord | undefined;
  totalDrawsCount: number;
  onRefreshData?: () => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  config,
  latestDraw,
  totalDrawsCount,
  onRefreshData,
}) => {
  if (!latestDraw) return null;

  const stats = calculateDrawStats(latestDraw, config);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white my-4 relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
        {/* Left Info Column */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30">
              {config.name}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              第 {latestDraw.issue} 期 ({latestDraw.date})
            </span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              已载入 {totalDrawsCount} 期历史
            </span>
          </div>

          {/* Balls Container */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {latestDraw.redBalls.map((num, idx) => (
              <div
                key={`red-${idx}`}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-red-700 via-rose-600 to-rose-400 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-lg shadow-rose-900/40 border border-rose-300/30 transform hover:scale-105 transition-all"
              >
                {num < 10 && config.redMax > 9 ? `0${num}` : num}
              </div>
            ))}

            {latestDraw.blueBalls.length > 0 && (
              <div className="h-6 w-px bg-slate-700 mx-1" />
            )}

            {latestDraw.blueBalls.map((num, idx) => (
              <div
                key={`blue-${idx}`}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-lg shadow-indigo-900/40 border border-sky-300/30 transform hover:scale-105 transition-all"
              >
                {num < 10 ? `0${num}` : num}
              </div>
            ))}

            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="ml-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
                title="重新加载/刷新历史数据"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Stats Quick Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              和值 / 跨度
            </div>
            <div className="text-base font-bold text-amber-300">
              {stats.sumValue} <span className="text-xs font-normal text-slate-400">/ 跨度 {stats.span}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 mb-1">奇偶比 / 大小比</div>
            <div className="text-base font-bold text-slate-200">
              {stats.oddEvenRatio} <span className="text-xs font-normal text-slate-400">({stats.bigSmallRatio})</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 mb-1">AC值</div>
            <div className="text-base font-bold text-purple-300">
              {stats.acValue} <span className="text-xs font-normal text-slate-400">复杂度</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              奖池资金
            </div>
            <div className="text-sm font-bold text-emerald-400 truncate">
              {latestDraw.poolMoney || '21.5亿元'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
