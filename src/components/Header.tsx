import React from 'react';
import { Sparkles, Server, BarChart2, ShieldAlert, Cpu, Radio, RefreshCw, Bot } from 'lucide-react';
import { LotteryKind } from '../types';

interface HeaderProps {
  selectedLottery: LotteryKind;
  onSelectLottery: (kind: LotteryKind) => void;
  onOpenServ00Modal: () => void;
  onOpenRecordManager: () => void;
  onOpenTelegramModal?: () => void;
  onSyncLiveApi?: () => void;
  isSyncing?: boolean;
  activeTab: 'analytics' | 'prediction' | 'backtest' | 'aiReport';
  setActiveTab: (tab: 'analytics' | 'prediction' | 'backtest' | 'aiReport') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenServ00Modal,
  onOpenRecordManager,
  onOpenTelegramModal,
  onSyncLiveApi,
  isSyncing,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-900/30">
              <Radio className="w-5 h-5 animate-pulse text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  澳门三分六合彩 · 极速实时盘析与预测
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  接口实时连接
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                数据源: history.macaumarksix.com/history/macaujc3 (每3分钟开奖)
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {onSyncLiveApi && (
              <button
                onClick={onSyncLiveApi}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
                title="一键从 macaumarksix.com 获取最新开奖"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? '同步中...' : '同步实时开奖'}</span>
              </button>
            )}

            <button
              onClick={onOpenRecordManager}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">开奖数据管理</span>
            </button>

            {onOpenTelegramModal && (
              <button
                onClick={onOpenTelegramModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-950/80 hover:bg-sky-900/80 text-sky-300 border border-sky-500/30 transition-all shadow-sm"
                title="Telegram 机器人管理员中心与推送"
              >
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">TG 管理员</span>
              </button>
            )}

            <button
              onClick={onOpenServ00Modal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
              title="Serv00 服务器部署助手"
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Serv00 部署</span>
            </button>
          </div>
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
            走势与波色遗漏
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
            三分六合彩智能预测
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
            Gemini AI 盘析
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

