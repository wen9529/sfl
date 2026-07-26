import React from 'react';
import { Calendar, Flame, RefreshCw, Layers, Award } from 'lucide-react';
import { DrawRecord, LotteryConfig } from '../types';
import { calculateDrawStats } from '../utils/lotteryAlgorithms';
import { getWaveColor, getZodiacByNum, getWaveLabel } from '../data/mockLotteryData';

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

  const renderBallBg = (waveStr?: string, num?: number) => {
    const wave = waveStr || (num ? getWaveColor(num) : 'red');
    if (wave === 'red' || wave === '红') {
      return 'bg-gradient-to-tr from-red-700 via-rose-600 to-rose-400 text-white shadow-rose-900/40 border-rose-300/40';
    }
    if (wave === 'blue' || wave === '蓝') {
      return 'bg-gradient-to-tr from-blue-700 via-sky-600 to-indigo-400 text-white shadow-blue-900/40 border-sky-300/40';
    }
    return 'bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-400 text-white shadow-emerald-900/40 border-emerald-300/40';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white my-4 relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
        {/* Left Info Column */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30">
              澳门三分六合彩 (Macaujc3)
            </span>
            <span className="text-xs text-slate-300 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              第 <strong className="text-amber-300">{latestDraw.issue}</strong> 期 ({latestDraw.date})
            </span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              已载入 {totalDrawsCount} 期历史
            </span>
          </div>

          {/* Balls Container */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
            {/* 6 Regular Balls */}
            {latestDraw.redBalls.map((num, idx) => {
              const wave = latestDraw.waves?.[idx];
              const zodiac = latestDraw.zodiacs?.[idx] || getZodiacByNum(num);
              return (
                <div key={`red-${idx}`} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full font-bold text-base sm:text-lg flex items-center justify-center shadow-lg border transform hover:scale-105 transition-all ${renderBallBg(wave, num)}`}
                  >
                    {num < 10 ? `0${num}` : num}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {zodiac}·{getWaveLabel(wave || getWaveColor(num))[0]}
                  </span>
                </div>
              );
            })}

            {/* Special Ball Separator */}
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-xs font-bold text-amber-400">+</span>
              <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-wider">特码</span>
            </div>

            {/* Special Ball */}
            {latestDraw.blueBalls.map((num, idx) => {
              const wave = latestDraw.waves?.[6] || getWaveColor(num);
              const zodiac = latestDraw.zodiacs?.[6] || getZodiacByNum(num);
              return (
                <div key={`special-${idx}`} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full font-extrabold text-lg sm:text-xl flex items-center justify-center shadow-xl border-2 ring-2 ring-amber-400/40 transform hover:scale-110 transition-all ${renderBallBg(wave, num)}`}
                  >
                    {num < 10 ? `0${num}` : num}
                  </div>
                  <span className="text-[11px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {zodiac}·{getWaveLabel(wave || getWaveColor(num))}
                  </span>
                </div>
              );
            })}

            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="ml-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
                title="同步更新澳门三分六合彩历史数据"
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
              平码和值
            </div>
            <div className="text-base font-bold text-amber-300">
              {stats.sumValue} <span className="text-xs font-normal text-slate-400">(跨度 {stats.span})</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 mb-1">平码奇偶 / 大小</div>
            <div className="text-base font-bold text-slate-200">
              {stats.oddEvenRatio} <span className="text-xs font-normal text-slate-400">({stats.bigSmallRatio})</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              波色分布(红/蓝/绿)
            </div>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <span className="text-rose-400">{stats.redWaveCount || 0}红</span>
              <span>:</span>
              <span className="text-sky-400">{stats.blueWaveCount || 0}蓝</span>
              <span>:</span>
              <span className="text-emerald-400">{stats.greenWaveCount || 0}绿</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              最新特码
            </div>
            <div className="text-base font-bold text-amber-300">
              {stats.specialBall ? (stats.specialBall < 10 ? `0${stats.specialBall}` : stats.specialBall) : '--'}
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({stats.specialZodiac || ''})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

