import React, { useState } from 'react';
import { ShieldAlert, PlayCircle, Award, DollarSign, TrendingUp, RefreshCw, Layers } from 'lucide-react';
import { DrawRecord, LotteryConfig, PredictionResult, BacktestSummary } from '../types';
import { runBacktest } from '../utils/lotteryAlgorithms';

interface BacktestToolProps {
  draws: DrawRecord[];
  config: LotteryConfig;
  initialPrediction?: PredictionResult | null;
}

export const BacktestTool: React.FC<BacktestToolProps> = ({ draws, config, initialPrediction }) => {
  const [customReds, setCustomReds] = useState<string>(
    initialPrediction ? initialPrediction.redBalls.join(' ') : '02 07 12 19 24 31'
  );
  const [customBlues, setCustomBlues] = useState<string>(
    initialPrediction ? initialPrediction.blueBalls.join(' ') : '08'
  );

  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleRunBacktest = () => {
    setIsSimulating(true);
    setTimeout(() => {
      // Parse inputs
      const reds = customReds
        .split(/[\s,]+/)
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n));

      const blues = customBlues
        .split(/[\s,]+/)
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n));

      const tickets = [{ redBalls: reds, blueBalls: blues }];
      const result = runBacktest(tickets, draws, config);

      setSummary(result);
      setIsSimulating(false);
    }, 300);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white my-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">历史策略回测模拟器</h2>
            <p className="text-xs text-slate-400">
              输入任意选号方案，在【{config.name}】最近 {draws.length} 期开奖数据中执行模拟买入与中奖率回测
            </p>
          </div>
        </div>

        <button
          onClick={handleRunBacktest}
          disabled={isSimulating}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              全历史回测运算中...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              立即开启回测演算
            </>
          )}
        </button>
      </div>

      {/* Input Ticket Area */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-semibold text-rose-400 mb-1.5 block">
            红球/前区号码 ({config.redCount}个，以空格分隔)：
          </label>
          <input
            type="text"
            value={customReds}
            onChange={(e) => setCustomReds(e.target.value)}
            placeholder="如: 02 07 12 19 24 31"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
          />
        </div>

        {config.blueCount > 0 && (
          <div>
            <label className="text-xs font-semibold text-indigo-400 mb-1.5 block">
              蓝球/后区号码 ({config.blueCount}个，以空格分隔)：
            </label>
            <input
              type="text"
              value={customBlues}
              onChange={(e) => setCustomBlues(e.target.value)}
              placeholder="如: 08 15"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Summary Results */}
      {summary ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">测试期数</div>
              <div className="text-lg font-bold text-slate-200 font-mono">
                {summary.totalDrawsTested} 期
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">综合中奖率</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {summary.winRatePercent}%
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">总投注成本</div>
              <div className="text-lg font-bold text-slate-300 font-mono">
                ¥{summary.totalCost}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">中奖总奖金</div>
              <div className="text-lg font-bold text-amber-400 font-mono">
                ¥{summary.totalPrize.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Winning Breakdown List */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <span>奖等分项分布详情</span>
              <span className="text-slate-400 font-normal">
                返奖倍数: <strong className="text-cyan-400">{summary.netReturnRatio}x</strong>
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🥇 一等奖: <strong className="text-amber-400 ml-1">{summary.winsLevel1} 次</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🥈 二等奖: <strong className="text-amber-300 ml-1">{summary.winsLevel2} 次</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🥉 三等奖: <strong className="text-emerald-400 ml-1">{summary.winsLevel3} 次</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🎗️ 小奖/末等奖: <strong className="text-cyan-400 ml-1">{summary.winsLevel4Plus} 次</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center py-8 text-slate-500 text-xs">
          点击“立即开启回测演算”，验证选号组合在历史开奖中的实际命中绩效。
        </div>
      )}
    </div>
  );
};
