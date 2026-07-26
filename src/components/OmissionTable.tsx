import React, { useState } from 'react';
import { DrawRecord, LotteryConfig } from '../types';
import { calculateBallFrequencies } from '../utils/lotteryAlgorithms';
import { Grid, Eye, AlertCircle, ArrowUpDown } from 'lucide-react';

interface OmissionTableProps {
  draws: DrawRecord[];
  config: LotteryConfig;
}

export const OmissionTable: React.FC<OmissionTableProps> = ({ draws, config }) => {
  const [ballType, setBallType] = useState<'red' | 'blue'>('red');
  const [sortKey, setSortKey] = useState<'number' | 'count' | 'currentOmission' | 'avgOmission'>('currentOmission');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const maxBall = ballType === 'red' ? config.redMax : config.blueMax;
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white my-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">冷热码与冷热遗漏分布矩阵</h2>
            <p className="text-xs text-slate-400">统计当前遗漏、历史最大遗漏与平均遗漏指标</p>
          </div>
        </div>

        {config.blueCount > 0 && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setBallType('red')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                ballType === 'red' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              红球/前区 ({config.redMax}个)
            </button>
            <button
              onClick={() => setBallType('blue')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                ballType === 'blue' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              蓝球/后区 ({config.blueMax}个)
            </button>
          </div>
        )}
      </div>

      {/* Grid Matrix Visualizer (Latest 12 Draws) */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-rose-400" />
          近12期{isRed ? '红球' : '蓝球'}分布轨迹矩阵:
        </div>

        <div className="min-w-[640px]">
          {/* Header row with ball numbers */}
          <div className="flex items-center gap-1 mb-1">
            <div className="w-20 text-xs text-slate-500 font-mono">期号</div>
            {Array.from({ length: maxBall }, (_, i) => {
              const num = maxBall === 9 ? i : i + 1;
              return (
                <div
                  key={num}
                  className="flex-1 min-w-[22px] text-center text-[10px] font-mono text-slate-400 font-bold"
                >
                  {num < 10 && maxBall > 9 ? `0${num}` : num}
                </div>
              );
            })}
          </div>

          {/* Matrix Rows */}
          {recentDraws.map((d) => {
            const hitBalls = isRed ? d.redBalls : d.blueBalls;
            return (
              <div
                key={d.issue}
                className="flex items-center gap-1 py-1 border-b border-slate-800/40 hover:bg-slate-800/30 transition-all"
              >
                <div className="w-20 text-xs text-slate-400 font-mono">{d.issue.slice(-3)}期</div>
                {Array.from({ length: maxBall }, (_, i) => {
                  const num = maxBall === 9 ? i : i + 1;
                  const isHit = hitBalls.includes(num);
                  return (
                    <div
                      key={num}
                      className="flex-1 min-w-[22px] flex items-center justify-center"
                    >
                      {isHit ? (
                        <span
                          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow ${
                            isRed
                              ? 'bg-rose-600 shadow-rose-900/40'
                              : 'bg-indigo-600 shadow-indigo-900/40'
                          }`}
                        >
                          {num}
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
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
                  号码 <ArrowUpDown className="w-3 h-3" />
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
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      isRed ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {item.number < 10 && maxBall > 9 ? `0${item.number}` : item.number}
                  </span>
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
