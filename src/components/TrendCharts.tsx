import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import { DrawRecord, LotteryConfig } from '../types';
import { calculateBallFrequencies, calculateDrawStats } from '../utils/lotteryAlgorithms';
import { TrendingUp, BarChart3, PieChart as PieIcon, Flame } from 'lucide-react';

interface TrendChartsProps {
  draws: DrawRecord[];
  config: LotteryConfig;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ draws, config }) => {
  const [sampleCount, setSampleCount] = useState<number>(30);
  const [chartType, setChartType] = useState<'sum' | 'freq' | 'oddEven'>('sum');

  const sliceDraws = draws.slice(0, sampleCount).reverse(); // Reverse so older -> newer left to right

  // Prepare sum trend data
  const sumData = sliceDraws.map(d => {
    const stats = calculateDrawStats(d, config);
    return {
      issue: d.issue.slice(-3) + '期',
      fullIssue: d.issue,
      sumValue: stats.sumValue,
      span: stats.span,
      acValue: stats.acValue,
      oddEven: stats.oddEvenRatio,
    };
  });

  // Prepare frequency data
  const redFreqs = calculateBallFrequencies(draws.slice(0, sampleCount), config.redMax, true);
  const blueFreqs = config.blueCount > 0 ? calculateBallFrequencies(draws.slice(0, sampleCount), config.blueMax, false) : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white my-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">历史多维走势分析图表</h2>
            <p className="text-xs text-slate-400">基于近 {sampleCount} 期开奖数据的动态可视化分析</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chart Type Selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setChartType('sum')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                chartType === 'sum' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              和值走势
            </button>
            <button
              onClick={() => setChartType('freq')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                chartType === 'freq' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              热冷频次
            </button>
            <button
              onClick={() => setChartType('oddEven')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                chartType === 'oddEven' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              跨度与AC值
            </button>
          </div>

          {/* Sample Size Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs text-slate-400">
            <span className="px-1 text-slate-500">样本:</span>
            {[15, 30, 50].map((count) => (
              <button
                key={count}
                onClick={() => setSampleCount(count)}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  sampleCount === count ? 'bg-slate-800 text-rose-400 font-bold' : 'hover:text-white'
                }`}
              >
                {count}期
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Display Area */}
      <div className="pt-6 h-80 w-full">
        {chartType === 'sum' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sumData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="issue" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine y={config.rules.sumRange[0]} label="推荐区间下限" stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={config.rules.sumRange[1]} label="推荐区间上限" stroke="#ef4444" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="sumValue"
                name="和值"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ fill: '#f43f5e', r: 4 }}
                activeDot={{ r: 7, stroke: '#fda4af', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'freq' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={redFreqs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="number" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any, item: any) => [
                  `${value} 次 (占比 ${item.payload.frequency}%, 当前遗漏 ${item.payload.currentOmission}期)`,
                  '出现次数',
                ]}
              />
              <Bar dataKey="count" name="开出次数" radius={[4, 4, 0, 0]}>
                {redFreqs.map((entry, index) => {
                  const wave = entry.waveColor as string || 'red';
                  const fill =
                    wave === 'red' || wave.includes('红')
                      ? '#ef4444'
                      : wave === 'blue' || wave.includes('蓝')
                      ? '#3b82f6'
                      : '#10b981';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'oddEven' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sumData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="issue" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="span"
                name="振幅跨度"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ fill: '#38bdf8', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="acValue"
                name="AC复杂度"
                stroke="#c084fc"
                strokeWidth={2}
                dot={{ fill: '#c084fc', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend Note */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            热码 (≥25%频次)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            温码 (正常均衡)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            冷码 (高遗漏)
          </span>
        </div>
        <div className="text-slate-500">
          推荐和值均衡范围：{config.rules.sumRange[0]} ~ {config.rules.sumRange[1]}
        </div>
      </div>
    </div>
  );
};
