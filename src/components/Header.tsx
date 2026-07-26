import React from 'react';
import { Sparkles, Server, BarChart2, ShieldAlert, Cpu } from 'lucide-react';
import { LotteryKind } from '../types';
import { LOTTERY_CONFIGS } from '../data/mockLotteryData';

interface HeaderProps {
  selectedLottery: LotteryKind;
  onSelectLottery: (kind: LotteryKind) => void;
  onOpenServ00Modal: () => void;
  onOpenRecordManager: () => void;
  activeTab: 'analytics' | 'prediction' | 'backtest' | 'aiReport';
  setActiveTab: (tab: 'analytics' | 'prediction' | 'backtest' | 'aiReport') => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedLottery,
  onSelectLottery,
  onOpenServ00Modal,
  onOpenRecordManager,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-900/30">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  彩票开奖预测与数理分析系统
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.5 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                马尔可夫链 · 蒙特卡洛模拟 · 遗漏回补 · Gemini AI 智能盘析
              </p>
            </div>
          </div>

          {/* Lottery Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {(Object.keys(LOTTERY_CONFIGS) as LotteryKind[]).map((kind) => {
              const cfg = LOTTERY_CONFIGS[kind];
              const isSelected = selectedLottery === kind;
              return (
                <button
                  key={kind}
                  onClick={() => onSelectLottery(kind)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cfg.shortName}
                </button>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenServ00Modal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
              title="Serv00 服务器一键部署与配置文件生成"
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Serv00 部署</span>
            </button>

            <button
              onClick={onOpenRecordManager}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">数据管理</span>
            </button>
          </div>
        </div>

        {/* Mobile Lottery Selection Bar */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar gap-2">
          {(Object.keys(LOTTERY_CONFIGS) as LotteryKind[]).map((kind) => {
            const cfg = LOTTERY_CONFIGS[kind];
            const isSelected = selectedLottery === kind;
            return (
              <button
                key={kind}
                onClick={() => onSelectLottery(kind)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  isSelected
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {cfg.shortName}
              </button>
            );
          })}
        </div>

        {/* Primary View Navigation Tabs */}
        <div className="flex border-t border-slate-800/60 gap-1 overflow-x-auto pt-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            走势与遗漏统计
          </button>
          <button
            onClick={() => setActiveTab('prediction')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'prediction'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            智能多算法预测
          </button>
          <button
            onClick={() => setActiveTab('aiReport')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'aiReport'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            Gemini AI 智能盘析
          </button>
          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'backtest'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            历史策略回测器
          </button>
        </div>
      </div>
    </header>
  );
};
