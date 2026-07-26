import React, { useState } from 'react';
import { DrawRecord, LotteryConfig } from '../types';
import { calculateBallFrequencies } from '../utils/lotteryAlgorithms';
import { getWaveColor, getZodiacByNum, getWaveLabel } from '../data/mockLotteryData';
import { Grid, Eye, ArrowUpDown } from 'lucide-react';

interface OmissionTableProps {
  draws: DrawRecord[];
  config: LotteryConfig;
}

export const OmissionTable: React.FC<OmissionTableProps> = ({ draws, config }) => {
  const [ballType, setBallType] = useState<'red' | 'blue'>('red');
  const [sortKey, setSortKey] = useState<'number' | 'count' | 'currentOmission' | 'avgOmission'>('currentOmission');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const maxBall = 49;
  const isRed = ballType === 'red';

  const frequencies = calculateBallFrequencies(draws, maxBall, isRed);

  // Sorting
  const sortedFreqs = [...frequencies].sort((a, b) => {
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'number') return (a.number - b.number) * factor;
    if (sortKey === 'count') return (a.count - b.count) * factor;
    if (sortKey === 'currentOmission') return (a.currentOmission - b.currentOmission) * factor;
    if (sortKey === 'avgOmission') return (a.avgOmission - b.avgOmission) * factor;
    return 0;
  });

  const handleSort = (key: 'number' | 'count' | 'currentOmission' | 'avgOmission') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const recentDraws = draws.slice(0, 12);

  const getWaveBadge = (num: number) => {
    const wave = getWaveColor(num);
    if (wave === 'red') return <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">红波</span>;
    if (wave === 'blue') return <span className="px-1.5 py-0.5 text-[10px] rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">蓝波</span>;
    return <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">绿波</span>;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white my-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">三分六合彩 1-49球波色生肖遗漏分布矩阵</h2>
            <p className="text-xs text-slate-400">实时统计49个球的当前遗漏、历史最大遗漏与生肖波色属性</p>
          </div>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setBallType('red')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              ballType === 'red' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            平码 (1-49)
          </button>
          <button
            onClick={() => setBallType('blue')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              ballType === 'blue' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            特码 (1-49)
          </button>
        </div>
      </div>

      {/* Grid Matrix Visualizer (Latest 12 Draws) */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-rose-400" />
          近12期{isRed ? '平码' : '特码'}分布轨迹:
        </div>

        <div className="min-w-[800px]">
          {/* Matrix Rows */}
          {recentDraws.map((d) => {
            const hitBalls = isRed ? d.redBalls : d.blueBalls;
            return (
              <div
                key={d.issue}
                className="flex items-center gap-1 py-1 border-b border-slate-800/40 hover:bg-slate-800/30 transition-all"
              >
                <div className="w-24 text-xs text-slate-300 font-mono font-semibold">{d.issue.slice(-4)}期</div>
                {Array.from({ length: 49 }, (_, i) => {
                  const num = i + 1;
                  const isHit = hitBalls.includes(num);
                  const wave = getWaveColor(num);
                  const bgClass =
                    wave === 'red'
                      ? 'bg-rose-600'
                      : wave === 'blue'
                      ? 'bg-sky-600'
                      : 'bg-emerald-600';
                  return (
                    <div
                      key={num}
                      className="flex-1 min-w-[18px] flex items-center justify-center"
                    >
                      {isHit ? (
                        <span
                          className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white shadow ${bgClass}`}
                          title={`${num}号 (${getZodiacByNum(num)}·${getWaveLabel(wave)})`}
                        >
                          {num}
                        </span>
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Omission Stats Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-950/60">
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort('number')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  号码/生肖/波色 <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">冷热状态</th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort('count')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  历史出号次数 <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort('currentOmission')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  当前遗漏期数 <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort('avgOmission')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  平均遗漏期数 <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">历史最大遗漏</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sortedFreqs.map((item) => (
              <tr key={item.number} className="hover:bg-slate-800/40 transition-all">
                <td className="py-2 px-3 font-bold font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white">
                      {item.number < 10 ? `0${item.number}` : item.number}
                    </span>
                    <span className="text-slate-300 font-sans">{getZodiacByNum(item.number)}</span>
                    {getWaveBadge(item.number)}
                  </div>
                </td>
                <td className="py-2 px-3">
                  {item.status === 'hot' && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                      🔥 极热码
                    </span>
                  )}
                  {item.status === 'warm' && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ⚖️ 温码
                    </span>
                  )}
                  {item.status === 'cold' && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      ❄️ 深度冷码
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 font-mono font-medium text-slate-200">
                  {item.count} 次 <span className="text-slate-500">({item.frequency}%)</span>
                </td>
                <td className="py-2 px-3 font-mono font-bold">
                  <span
                    className={
                      item.currentOmission >= item.avgOmission * 1.5
                        ? 'text-rose-400 animate-pulse'
                        : 'text-slate-200'
                    }
                  >
                    {item.currentOmission} 期
                  </span>
                </td>
                <td className="py-2 px-3 font-mono text-slate-400">{item.avgOmission} 期</td>
                <td className="py-2 px-3 font-mono text-slate-500">{item.maxOmission} 期</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

