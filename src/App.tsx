/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LotteryKind, DrawRecord, PredictionResult } from './types';
import { LOTTERY_CONFIGS, INITIAL_MOCK_DATA, parseMacauApiResponse } from './data/mockLotteryData';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { TrendCharts } from './components/TrendCharts';
import { OmissionTable } from './components/OmissionTable';
import { PredictionPanel } from './components/PredictionPanel';
import { GeminiAIAdvisor } from './components/GeminiAIAdvisor';
import { BacktestTool } from './components/BacktestTool';
import { Serv00DeploymentModal } from './components/Serv00DeploymentModal';
import { RecordManager } from './components/RecordManager';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [selectedLottery, setSelectedLottery] = useState<LotteryKind>('macaujc3');
  const [allDraws, setAllDraws] = useState<Record<LotteryKind, DrawRecord[]>>(() => {
    try {
      const saved = localStorage.getItem('lottery_draw_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_MOCK_DATA;
  });

  const [activeTab, setActiveTab] = useState<'analytics' | 'prediction' | 'backtest' | 'aiReport'>('analytics');
  const [isServ00Open, setIsServ00Open] = useState<boolean>(false);
  const [isRecordManagerOpen, setIsRecordManagerOpen] = useState<boolean>(false);
  const [backtestPrediction, setBacktestPrediction] = useState<PredictionResult | null>(null);
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
          setAllDraws(prev => ({
            ...prev,
            macaujc3: parsed,
          }));
        }
      }
    } catch (err) {
      console.warn('Live API sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Fetch live API once on mount
  useEffect(() => {
    syncLiveMacauData();
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

  const handleAddRecord = (record: DrawRecord) => {
    setAllDraws((prev) => ({
      ...prev,
      [selectedLottery]: [record, ...(prev[selectedLottery] || [])],
    }));
  };

  const handleDeleteRecord = (issue: string) => {
    setAllDraws((prev) => ({
      ...prev,
      [selectedLottery]: (prev[selectedLottery] || []).filter((d) => d.issue !== issue),
    }));
  };

  const handleResetToDefault = () => {
    setAllDraws((prev) => ({
      ...prev,
      [selectedLottery]: INITIAL_MOCK_DATA[selectedLottery],
    }));
  };

  const handleSendToBacktest = (pred: PredictionResult) => {
    setBacktestPrediction(pred);
    setActiveTab('backtest');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-rose-500 selection:text-white flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <Header
          selectedLottery={selectedLottery}
          onSelectLottery={(kind) => setSelectedLottery(kind)}
          onOpenServ00Modal={() => setIsServ00Open(true)}
          onOpenRecordManager={() => setIsRecordManagerOpen(true)}
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
              <TrendCharts draws={currentDraws} config={currentConfig} />
              <OmissionTable draws={currentDraws} config={currentConfig} />
            </div>
          )}

          {activeTab === 'prediction' && (
            <div className="animate-fade-in">
              <PredictionPanel
                draws={currentDraws}
                config={currentConfig}
                onSendToBacktest={handleSendToBacktest}
              />
            </div>
          )}

          {activeTab === 'aiReport' && (
            <div className="animate-fade-in">
              <GeminiAIAdvisor draws={currentDraws} config={currentConfig} />
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="animate-fade-in">
              <BacktestTool
                draws={currentDraws}
                config={currentConfig}
                initialPrediction={backtestPrediction}
              />
            </div>
          )}
        </main>
      </div>

      {/* Footer Disclaimer & Copyright */}
      <footer className="bg-slate-900/80 border-t border-slate-800/80 py-8 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-slate-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>彩票有风险·投注需谨慎</span>
            </div>
            <p className="text-slate-500 max-w-2xl">
              澳门三分六合彩每3分钟开奖一次。本软件数据引自 macaumarksix.com 实时接口。算法与 AI 盘析仅供数理研究，不构成任何投注中奖承诺。
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-500 shrink-0">
            <button
              onClick={() => setIsServ00Open(true)}
              className="hover:text-indigo-400 transition-all underline decoration-indigo-500/40"
            >
              Serv00 部署助手
            </button>
            <span>•</span>
            <span>https://history.macaumarksix.com/history/macaujc3</span>
          </div>
        </div>
      </footer>

      {/* Serv00 Deployment Assistant Modal */}
      <Serv00DeploymentModal
        isOpen={isServ00Open}
        onClose={() => setIsServ00Open(false)}
      />

      {/* Draw Record Manager Modal */}
      <RecordManager
        isOpen={isRecordManagerOpen}
        onClose={() => setIsRecordManagerOpen(false)}
        draws={currentDraws}
        config={currentConfig}
        onAddRecord={handleAddRecord}
        onDeleteRecord={handleDeleteRecord}
        onResetToDefault={handleResetToDefault}
      />
    </div>
  );
}

