/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LotteryKind, DrawRecord } from './types';
import { LOTTERY_CONFIGS, INITIAL_MOCK_DATA, parseMacauApiResponse } from './data/mockLotteryData';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { DrawHistoryList } from './components/DrawHistoryList';
import { PredictionPanel } from './components/PredictionPanel';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const selectedLottery: LotteryKind = 'macaujc3';
  const [allDraws, setAllDraws] = useState<Record<LotteryKind, DrawRecord[]>>(() => {
    try {
      const saved = localStorage.getItem('lottery_draw_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const latestIssue = parsed?.macaujc3?.[0]?.issue || '';
        if (latestIssue.startsWith('2025') || latestIssue.endsWith('121')) {
          localStorage.removeItem('lottery_draw_data');
          return INITIAL_MOCK_DATA;
        }
        return parsed;
      }
    } catch (e) {
      // fallback
    }
    return INITIAL_MOCK_DATA;
  });

  const [activeTab, setActiveTab] = useState<'analytics' | 'prediction'>('analytics');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync with live macaumarksix.com API via backend proxy
  const syncLiveMacauData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/history/macaujc3');
      if (res.ok) {
        const json = await res.json();
        const parsed = parseMacauApiResponse(json);
        if (parsed.length > 0) {
          setAllDraws(prev => {
            const existing = (prev.macaujc3 || []) as DrawRecord[];
            const newParsed = (parsed || []) as DrawRecord[];
            // Merge existing and new, overriding existing with new if same issue
            const map = new Map(existing.map(d => [d.issue, d]));
            newParsed.forEach(d => map.set(d.issue, d));
            const merged = Array.from(map.values()).sort((a, b) => b.issue.localeCompare(a.issue));
            
            // Keep up to 3 days of draws (3 * 480 = 1440)
            return {
              ...prev,
              macaujc3: merged.slice(0, 1440),
            };
          });
        }
      }
    } catch (err) {
      console.warn('Live API sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Fetch live API on mount and auto refresh every 30s
  useEffect(() => {
    syncLiveMacauData();
    const timer = setInterval(syncLiveMacauData, 30000);
    return () => clearInterval(timer);
  }, [syncLiveMacauData]);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lottery_draw_data', JSON.stringify(allDraws));
    } catch (e) {
      // ignore
    }
  }, [allDraws]);

  const currentConfig = LOTTERY_CONFIGS[selectedLottery] || LOTTERY_CONFIGS.macaujc3;
  const currentDraws = allDraws[selectedLottery] || [];
  const latestDraw = currentDraws[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-rose-500 selection:text-white flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <Header
          onSyncLiveApi={syncLiveMacauData}
          isSyncing={isSyncing}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {/* Latest Issue Overview Stats Banner */}
          <OverviewStats
            config={currentConfig}
            latestDraw={latestDraw}
            totalDrawsCount={currentDraws.length}
            onRefreshData={syncLiveMacauData}
          />

          {/* View Tab Switcher Render */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <DrawHistoryList draws={currentDraws} />
            </div>
          )}

          {activeTab === 'prediction' && (
            <div className="animate-fade-in">
              <PredictionPanel
                draws={currentDraws}
                config={currentConfig}
              />
            </div>
          )}
        </main>
      </div>

      {/* Footer Disclaimer & Copyright */}
      <footer className="bg-slate-900/80 border-t border-slate-800/80 py-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-slate-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>彩票数据研究·理性参考</span>
            </div>
            <p className="text-slate-500 max-w-2xl">
              澳门三分六合彩实时开奖记录与数理演算法推演，数据仅供娱乐分析参考。
            </p>
          </div>
          <div className="text-slate-500 text-xs">
            © 澳门三分六合彩 实时开奖与智能预测系统
          </div>
        </div>
      </footer>
    </div>
  );
}


