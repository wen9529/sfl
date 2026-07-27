import React from 'react';
import { Sparkles, BarChart2, Radio, RefreshCw, Send } from 'lucide-react';

interface HeaderProps {
  onSyncLiveApi?: () => void;
  isSyncing?: boolean;
  activeTab: 'analytics' | 'prediction' | 'telegram';
  setActiveTab: (tab: 'analytics' | 'prediction' | 'telegram') => void;
}

export const Header: React.FC<HeaderProps> = ({
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
                  澳门三分六合彩 · 实时开奖与智能预测
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  实时开奖同步中
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                每 3 分钟自动拉取最新开奖，精准算法演算下期预测
              </p>
            </div>
          </div>

          {/* Right Action Button */}
          <div className="flex items-center gap-2">
            {onSyncLiveApi && (
              <button
                onClick={onSyncLiveApi}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
                title="刷新最新开奖记录"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? '同步中...' : '刷新开奖记录'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary View Navigation Tabs */}
        <div className="flex border-t border-slate-800/60 gap-2 overflow-x-auto pt-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            历史开奖记录
          </button>
          <button
            onClick={() => setActiveTab('prediction')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'prediction'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            下一期智能推演预测
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4 text-rose-400" />
            Telegram 自动推送诊断
          </button>
        </div>
      </div>
    </header>
  );
};


