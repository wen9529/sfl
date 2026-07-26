import React, { useState } from 'react';
import { X, Plus, Trash2, Download, Upload, Calendar, Database, Check } from 'lucide-react';
import { DrawRecord, LotteryConfig } from '../types';

interface RecordManagerProps {
  isOpen: boolean;
  onClose: () => void;
  draws: DrawRecord[];
  config: LotteryConfig;
  onAddRecord: (record: DrawRecord) => void;
  onDeleteRecord: (issue: string) => void;
  onResetToDefault: () => void;
}

export const RecordManager: React.FC<RecordManagerProps> = ({
  isOpen,
  onClose,
  draws,
  config,
  onAddRecord,
  onDeleteRecord,
  onResetToDefault,
}) => {
  const [newIssue, setNewIssue] = useState<string>('2026089');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [redStr, setRedStr] = useState<string>('');
  const [blueStr, setBlueStr] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const reds = redStr
      .split(/[\s,]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));

    const blues = blueStr
      .split(/[\s,]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));

    if (reds.length !== config.redCount) {
      setError(`红球/前区个数要求为 ${config.redCount} 个，当前输入了 ${reds.length} 个`);
      return;
    }

    if (config.blueCount > 0 && blues.length !== config.blueCount) {
      setError(`蓝球/后区个数要求为 ${config.blueCount} 个，当前输入了 ${blues.length} 个`);
      return;
    }

    const newRecord: DrawRecord = {
      issue: newIssue,
      date: newDate,
      redBalls: reds.sort((a, b) => a - b),
      blueBalls: blues.sort((a, b) => a - b),
      sales: '39,000万元',
      poolMoney: '21.8亿元',
    };

    onAddRecord(newRecord);
    setRedStr('');
    setBlueStr('');
    setNewIssue((prev) => (parseInt(prev, 10) + 1).toString());
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(draws, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${config.id}_draw_history.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-white">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">【{config.name}】历史数据中心</h3>
              <p className="text-xs text-slate-400">目前共收录 {draws.length} 期完整开奖数据</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Add New Form */}
          <form onSubmit={handleAdd} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <Plus className="w-4 h-4 text-rose-400" />
              新增最新期开奖记录
            </h4>

            {error && <div className="text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">{error}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">期号</label>
                <input
                  type="text"
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">开奖日期</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">平码 6个号 (如: 20 40 23 09 27 14)</label>
                <input
                  type="text"
                  value={redStr}
                  onChange={(e) => setRedStr(e.target.value)}
                  placeholder="如: 20,40,23,09,27,14"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">特码 1个号 (如: 18)</label>
                <input
                  type="text"
                  value={blueStr}
                  onChange={(e) => setBlueStr(e.target.value)}
                  placeholder="如: 18"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all"
            >
              录入期数开奖数据
            </button>
          </form>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              导出 JSON 数据库
            </button>

            <button
              onClick={onResetToDefault}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg transition-all"
            >
              重置恢复默认样本
            </button>
          </div>

          {/* List Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-3">期号</th>
                  <th className="py-2.5 px-3">日期</th>
                  <th className="py-2.5 px-3">开奖号码</th>
                  <th className="py-2.5 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {draws.map((d) => (
                  <tr key={d.issue} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono font-bold text-slate-200">{d.issue}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{d.date}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        {d.redBalls.map((r, i) => (
                          <span key={i} className="text-rose-400 font-bold font-mono">
                            {r < 10 && config.redMax > 9 ? `0${r}` : r}{' '}
                          </span>
                        ))}
                        {d.blueBalls.length > 0 && <span className="text-slate-600">|</span>}
                        {d.blueBalls.map((b, i) => (
                          <span key={i} className="text-indigo-400 font-bold font-mono">
                            {b < 10 ? `0${b}` : b}{' '}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onDeleteRecord(d.issue)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
