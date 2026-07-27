import React, { useState } from 'react';
import { DrawRecord } from '../types';
import { Clock, History } from 'lucide-react';

interface DrawHistoryListProps {
  draws: DrawRecord[];
}

export const DrawHistoryList: React.FC<DrawHistoryListProps> = ({ draws }) => {
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const totalPages = Math.ceil(draws.length / pageSize);
  const currentDraws = draws.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-white my-4 overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">历史开奖记录</h2>
          <p className="text-xs text-slate-400">保留最新3天历史数据 ({draws.length}期)</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-slate-400">
            <tr>
              <th className="py-3 px-4 font-medium border-b border-slate-800">期号</th>
              <th className="py-3 px-4 font-medium border-b border-slate-800">开奖时间</th>
              <th className="py-3 px-4 font-medium border-b border-slate-800">平码</th>
              <th className="py-3 px-4 font-medium border-b border-slate-800 text-center">特码</th>
              <th className="py-3 px-4 font-medium border-b border-slate-800">生肖 / 波色 / 五行</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {currentDraws.map((draw) => (
              <tr key={draw.issue} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono text-slate-300 font-semibold">{draw.issue}</td>
                <td className="py-3 px-4 text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {draw.date}
                </td>
                <td className="py-3 px-4 font-mono">
                  <div className="flex gap-1.5">
                    {draw.redBalls.map((b, i) => (
                      <span key={i} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold shadow-sm">
                        {b < 10 ? `0${b}` : b}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex justify-center">
                    {draw.blueBalls.map((b, i) => {
                      // Note: We use redBalls array to get all balls, but wait, usually blueBalls is the special ball in some configs. 
                      // In Macau, redBalls are 6, blueBalls is 1 (the 7th).
                      return (
                        <span key={i} className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-600 border border-rose-500 text-white font-bold shadow-md shadow-rose-900/20">
                          {b < 10 ? `0${b}` : b}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    {draw.rawZodiac && (
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {draw.rawZodiac.split(',').pop() || '-'}
                      </span>
                    )}
                    {draw.rawWave && (
                      <span className={`px-2 py-0.5 text-xs rounded border ${
                        draw.rawWave.split(',').pop() === 'red' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : draw.rawWave.split(',').pop() === 'blue'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {draw.rawWave.split(',').pop() === 'red' ? '红波' : draw.rawWave.split(',').pop() === 'blue' ? '蓝波' : '绿波'}
                      </span>
                    )}
                    {draw.rawFiveElements && (
                      <span className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {draw.rawFiveElements.split(',').pop() || '-'}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {currentDraws.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  暂无开奖记录数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
          >
            上一页
          </button>
          <span className="text-sm text-slate-400">第 {page} / {totalPages} 页</span>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};
