import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Layers,
  Calendar,
  RefreshCw,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Percent
} from 'lucide-react';
import { ProfitAndLossReport, WeeklyProfitAndLossResult } from '../server/statsAlgorithm';

interface ProfitLossData {
  pnl: ProfitAndLossReport;
  weekly: WeeklyProfitAndLossResult;
  drawsCount: number;
}

export const ProfitLossPanel: React.FC = () => {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/lottery/stats');
      if (!res.ok) throw new Error('拉取盈亏统计失败');
      const json = await res.json();
      if (json.success && json.pnl && json.weekly) {
        setData({
          pnl: json.pnl,
          weekly: json.weekly,
          drawsCount: json.drawsCount || 0,
        });
        setError(null);
        setLastUpdated(new Date().toLocaleTimeString('zh-CN'));
      } else {
        throw new Error('返回的盈亏数据格式异常');
      }
    } catch (err: any) {
      setError(err.message || '网络连接超时');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // 自动每 20 秒轮询一次最新盈亏统计
    const timer = setInterval(() => fetchStats(false), 20000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 my-4 shadow-xl">
        <RefreshCw className="w-10 h-10 text-rose-500 animate-spin mx-auto mb-4" />
        <p className="text-base font-semibold text-slate-200">正在核算 480 期预测下注盈亏数据看板...</p>
        <p className="text-xs text-slate-500 mt-1">精密对齐每期大小、单双、波色及和局退本结算</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center text-rose-400 my-4 shadow-xl">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
        <h3 className="text-base font-bold text-slate-100">盈亏看板加载异常</h3>
        <p className="text-xs text-rose-400/80 mt-1 mb-4">{error}</p>
        <button
          onClick={() => fetchStats(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
        >
          重新核算重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { pnl, weekly } = data;
  const isProfit = pnl.netProfit >= 0;
  const isWeeklyProfit = weekly.totalNetProfit >= 0;

  return (
    <div className="space-y-6 my-4 animate-fade-in text-white">
      {/* Top Banner & Refresh */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md shadow-rose-900/40">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                480 期量化盈亏与近 7 天统计看板
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  真实回测 100% 审计
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              全天 480 期开奖：从第 001 期至第 480 期全天候量化预测与结算 (3U/期)。特码 49 和局退本金。
              {lastUpdated && <span className="ml-2 text-slate-500">更新时间: {lastUpdated}</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? '正在重新核算...' : '一键刷新盈亏数据'}</span>
            </button>
          </div>
        </div>

        {/* 4 Core Stats Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800/80">
          {/* Card 1: Today Net Profit */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>今日累计净盈亏</span>
              {isProfit ? (
                <span className="flex items-center text-emerald-400 font-semibold gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> 盈利
                </span>
              ) : (
                <span className="flex items-center text-rose-400 font-semibold gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" /> 浮亏
                </span>
              )}
            </div>
            <div className={`text-2xl font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit ? `+${pnl.netProfit.toFixed(2)}` : pnl.netProfit.toFixed(2)}
              <span className="text-xs font-bold text-slate-400 ml-1">USDT</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>回报率 (ROI)</span>
              <span className={`font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pnl.roi >= 0 ? `+${pnl.roi.toFixed(2)}%` : `${pnl.roi.toFixed(2)}%`}
              </span>
            </div>
          </div>

          {/* Card 2: Today Total Bet & Payout */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>今日投入 / 累计派彩</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-slate-100">
              {pnl.totalPayout.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ {pnl.totalBet}U</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>每期固定投入</span>
              <span className="text-slate-300 font-mono">3 USDT / 期</span>
            </div>
          </div>

          {/* Card 3: Today Progress */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>今日结算进度</span>
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-black text-amber-300">
              {pnl.predictedRounds} <span className="text-xs font-normal text-slate-400">/ 480 期</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>全天开出期数</span>
              <span className="text-slate-300 font-mono">{pnl.dayDrawNum} / 480 期</span>
            </div>
          </div>

          {/* Card 4: Drawdown & Peak */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>盘中极值 (盈亏振幅)</span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="flex items-baseline justify-between pt-0.5">
              <div>
                <span className="text-[10px] text-slate-400 block">最高浮盈</span>
                <span className="text-sm font-bold text-emerald-400">+{pnl.maxProfit.toFixed(2)}U</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">最大回撤</span>
                <span className="text-sm font-bold text-rose-400">
                  {pnl.maxLoss > 0 ? `-${pnl.maxLoss.toFixed(2)}` : '0.00'}U
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Win Rates & Streaks Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">特码大小胜率</span>
              <span className="font-mono font-bold text-amber-400">{pnl.sizeHitRate}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pnl.sizeHitRate)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">特码单双胜率</span>
              <span className="font-mono font-bold text-rose-400">{pnl.parityHitRate}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pnl.parityHitRate)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">特码波色胜率</span>
              <span className="font-mono font-bold text-sky-400">{pnl.colorHitRate}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pnl.colorHitRate * 2.5)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 flex items-center justify-between px-4">
            <div>
              <span className="text-[10px] text-slate-400 block">最长连红</span>
              <span className="text-base font-extrabold text-amber-300 flex items-center gap-1">
                {pnl.maxStreak} 连红 <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">三项大满贯</span>
              <span className="text-base font-extrabold text-emerald-400 flex items-center gap-1">
                {pnl.allThreeHits} 期 <Award className="w-4 h-4 text-emerald-400" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Weekly Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">近 7 天每日盈亏明细看板</h3>
              <p className="text-xs text-slate-400">每日 480 期全天候下注结算闭环与周回报率统一核对</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">7天总净盈亏:</span>
            <span className={`font-mono font-bold ${isWeeklyProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isWeeklyProfit ? `+${weekly.totalNetProfit.toFixed(2)}` : weekly.totalNetProfit.toFixed(2)} USDT
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">周均ROI:</span>
            <span className={`font-mono font-bold ${isWeeklyProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {weekly.totalRoi >= 0 ? `+${weekly.totalRoi.toFixed(2)}%` : `${weekly.totalRoi.toFixed(2)}%`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-400 text-xs">
              <tr>
                <th className="py-3 px-4 font-medium border-b border-slate-800">日期 / 星期</th>
                <th className="py-3 px-4 font-medium border-b border-slate-800 text-center">状态</th>
                <th className="py-3 px-4 font-medium border-b border-slate-800 text-center">结算期数</th>
                <th className="py-3 px-4 font-medium border-b border-slate-800 text-right">总投入 (USDT)</th>
                <th className="py-3 px-4 font-medium border-b border-slate-800 text-right">总派彩 (USDT)</th>
                <th className="py-3 px-4 font-medium border-b border-slate-800 text-right">净盈亏 (USDT)</th>
                <th className="py-3 px-4 font-medium border-b border-slate-800 text-right">投资回报率 (ROI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {weekly.dailyList.map((day) => {
                const dayProfit = day.netProfit >= 0;
                return (
                  <tr
                    key={day.date}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      day.isToday ? 'bg-rose-500/[0.03] font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{day.displayDate}</span>
                        {day.isToday && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            今日进行中
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {day.isToday ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          结算中 ({day.rounds}/480)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          已结清
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {day.rounds} 期
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {day.totalBet.toLocaleString()} U
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200 font-semibold">
                      {day.totalPayout.toFixed(2)} U
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={dayProfit ? 'text-emerald-400' : 'text-rose-400'}>
                        {dayProfit ? `+${day.netProfit.toFixed(2)}` : day.netProfit.toFixed(2)} U
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          dayProfit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {day.roi >= 0 ? `+${day.roi.toFixed(2)}%` : `${day.roi.toFixed(2)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer Total Summary Row */}
            <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-800 text-xs text-slate-200">
              <tr>
                <td className="py-3.5 px-4" colSpan={2}>
                  近 7 天合计与周均表现
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-amber-300">
                  {weekly.dailyList.reduce((acc, d) => acc + d.rounds, 0)} 期
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                  {weekly.totalBet.toLocaleString()} USDT
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-100 font-extrabold">
                  {weekly.totalPayout.toFixed(2)} USDT
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                  <span className={isWeeklyProfit ? 'text-emerald-400' : 'text-rose-400'}>
                    {isWeeklyProfit ? `+${weekly.totalNetProfit.toFixed(2)}` : weekly.totalNetProfit.toFixed(2)} USDT
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-black ${
                      isWeeklyProfit
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {weekly.totalRoi >= 0 ? `+${weekly.totalRoi.toFixed(2)}%` : `${weekly.totalRoi.toFixed(2)}%`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rules Explanatory Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-300 mb-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>澳门三分六合彩 · 全天480期量化预测与结算数理规则说明</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed">
          <div className="space-y-1">
            <span className="text-slate-300 font-semibold block">1. 每天480期完整运行周期</span>
            <p>
              澳门三分彩每天从北京时间 00:00:00 开出第 001 期，每 3 分钟一期，全天共 480 期开奖。系统自动拉取官方最新开奖并秒级回测核算。
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-300 font-semibold block">2. 全天候480期预测下注结算</span>
            <p>
              依托跨天连续历史数据，每天从第 001 期至第 480 期实行全天候智能预测与回测结算 (3U/期)，全天满盘总投入 1440 USDT。
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-300 font-semibold block">3. 赔率与特码49和局退本</span>
            <p>
              每期下注 3U (大小 1U、单双 1U、波色 1U)。特码为 49 时，大小和单双和局全额退还本金共 2U；波色中绿波全额派彩 2.98U，保证盈亏统计 100% 严谨。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
