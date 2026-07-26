import React, { useState } from 'react';
import { Cpu, Sparkles, Send, Copy, Check, AlertCircle, RefreshCw, BookOpen, Bot } from 'lucide-react';
import { DrawRecord, LotteryConfig } from '../types';

interface GeminiAIAdvisorProps {
  draws: DrawRecord[];
  config: LotteryConfig;
}

export const GeminiAIAdvisor: React.FC<GeminiAIAdvisorProps> = ({ draws, config }) => {
  const [focusNotes, setFocusNotes] = useState<string>('');
  const [reportText, setReportText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const presetPrompts = [
    '侧重分析三分六合彩近10期特码的波色（红/蓝/绿）与生肖轮转趋势',
    '重点盘析平码6个号的和值分布、五行与大小奇偶比例平衡性',
    '结合冷热号码遗漏矩阵，推荐下一期的特码与极佳缩水组合',
  ];

  const handleGenerateAIReport = async (overridePrompt?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    const finalPrompt = overridePrompt || focusNotes;

    try {
      const latestDraw = draws[0];
      const historySample = draws.slice(0, 10);

      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryName: config.name,
          drawHistory: historySample,
          latestDraw,
          focusNotes: finalPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '解析服务器未响应');
      }

      setReportText(data.report);
    } catch (err: any) {
      console.error('AI Report fetch error:', err);
      setErrorMsg(err.message || '生成分析失败，请确认是否已配置 GEMINI_API_KEY。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white my-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/40">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Gemini AI 彩票大模型深度盘析</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              基于近10期开奖形态、结构分布与高维概率理论，生成专家级研判报告
            </p>
          </div>
        </div>

        <button
          onClick={() => handleGenerateAIReport()}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              AI 大模型思考解析中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              生成深度研判报告
            </>
          )}
        </button>
      </div>

      {/* Input Notes & Presets */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          快捷关注维度（点击直接研判）：
        </div>

        <div className="flex flex-wrap gap-2">
          {presetPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setFocusNotes(p);
                handleGenerateAIReport(p);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 hover:border-slate-700 transition-all text-left"
            >
              💡 {p}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={focusNotes}
            onChange={(e) => setFocusNotes(e.target.value)}
            placeholder="自定义偏好关注（如：重点研判红球三区号码走势与二连号等）"
            className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
          />
          <button
            onClick={() => handleGenerateAIReport()}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            发送
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">生成报告失败</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Output Content Area */}
      <div className="mt-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 relative min-h-[220px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-xs font-medium animate-pulse">
              Gemini AI 正在构建结构化概率逻辑模型，解析【{config.name}】数据...
            </p>
          </div>
        ) : reportText ? (
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs text-slate-400">
              <span>分析对象：{config.name} 近10期开奖记录</span>
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-medium transition-all"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    已复制报告
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    复制全文报告
                  </>
                )}
              </button>
            </div>

            <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 space-y-3 leading-relaxed whitespace-pre-wrap font-sans">
              {reportText}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2 text-center">
            <Cpu className="w-10 h-10 text-slate-700" />
            <p className="text-xs font-medium text-slate-400">尚未生成分析报告</p>
            <p className="text-[11px] text-slate-600">
              点击上方按钮，即刻召唤 Gemini AI 进行全方位走势盘析
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
