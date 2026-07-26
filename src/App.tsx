/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LotteryKind, DrawRecord, PredictionResult } from './types';
import { LOTTERY_CONFIGS, INITIAL_MOCK_DATA } from './data/mockLotteryData';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { TrendCharts } from './components/TrendCharts';
import { OmissionTable } from './components/OmissionTable';
import { PredictionPanel } from './components/PredictionPanel';
import { GeminiAIAdvisor } from './components/GeminiAIAdvisor';
import { BacktestTool } from './components/BacktestTool';
import { Serv00DeploymentModal } from './components/Serv00DeploymentModal';
import { RecordManager } from './components/RecordManager';
import { ShieldAlert, Sparkles, HeartHandshake } from 'lucide-react';

export default function App() {
  const [selectedLottery, setSelectedLottery] = useState<LotteryKind>('ssq');
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

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lottery_draw_data', JSON.stringify(allDraws));
    } catch (e) {
      // ignore
    }
  }, [allDraws]);

  const currentConfig = LOTTERY_CONFIGS[selectedLottery];
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
          onSelectLottery={(kind) => {
            setSelectedLottery(kind);
          }}
          onOpenServ00Modal={() => setIsServ00Open(true)}
          onOpenRecordManager={() => setIsRecordManagerOpen(true)}
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
            onRefreshData={() => setIsRecordManagerOpen(true)}
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
              彩票开奖结果为独立随机事件。本软件所包含的热冷号分析、遗漏统计、马尔可夫链模型及 Gemini AI 盘析均属于概率数理建模与学术娱乐研究，不构成任何投注中奖承诺。
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-500 shrink-0">
            <button
              onClick={() => setIsServ00Open(true)}
              className="hover:text-indigo-400 transition-all underline decoration-indigo-500/40"
            >
              Serv00 部署指南
            </button>
            <span>•</span>
            <span>Google AI Studio Powered</span>
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
