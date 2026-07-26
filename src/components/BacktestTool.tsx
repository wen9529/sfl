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
    initialPrediction ? initialPrediction.redBalls.join(' ') : '20 40 23 09 27 14'
  );
  const [customBlues, setCustomBlues] = useState<string>(
    initialPrediction ? initialPrediction.blueBalls.join(' ') : '18'
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
      <div className="mt-5 bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">430期算法模型下注回测规程</h3>
          <p className="text-xs text-slate-400 mt-1">
            下注规则：每期对【大小】(1.95)、【单双】(1.95)、【波色】(红2.75/蓝绿2.98) 各投注 1 USDT (单期 3 USDT)。开 49 时大小单双退本金。前 50 期积累为算法基准，后 430 期预测结算。
          </p>
        </div>
        <button
          onClick={handleRunBacktest}
          disabled={isSimulating}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              回测运算中...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              开启430期盈亏回测
            </>
          )}
        </button>
      </div>

      {/* Summary Results */}
      {summary ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">回测总期数</div>
              <div className="text-lg font-bold text-slate-200 font-mono">
                {summary.totalRounds} 期
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">累计总下注</div>
              <div className="text-lg font-bold text-slate-300 font-mono">
                ${summary.totalBet.toLocaleString()} USDT
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">累计总派彩</div>
              <div className="text-lg font-bold text-amber-400 font-mono">
                ${summary.totalPayout.toLocaleString()} USDT
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">净盈亏 (ROI)</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                +${summary.netProfit.toLocaleString()} ({summary.roi}%)
              </div>
            </div>
          </div>

          {/* Winning Breakdown List */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <span>430 期形态命中与连红详情</span>
              <span className="text-slate-400 font-normal">
                最长连红: <strong className="text-cyan-400">{summary.maxStreak} 连红 🔥</strong>
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                📏 大小命中率: <strong className="text-amber-400 ml-1">{summary.sizeHitRate}%</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🎲 单双命中率: <strong className="text-amber-300 ml-1">{summary.parityHitRate}%</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🎨 波色命中率: <strong className="text-emerald-400 ml-1">{summary.colorHitRate}%</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                🎯 三项全中(大满贯): <strong className="text-cyan-400 ml-1">{summary.allThreeHits} 期</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center py-8 text-slate-500 text-xs">
          点击“开启50期盈亏回测”，验证预测算法在最新50期开奖中的模拟下注收益率。
        </div>
      )}
    </div>
  );
};
