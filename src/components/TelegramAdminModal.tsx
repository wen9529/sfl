import React, { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Zap,
  RefreshCw,
  Radio,
  FileText,
  ShieldCheck,
  Code
} from 'lucide-react';
import { DrawRecord, PredictionResult } from '../types';

interface TelegramAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestDraw?: DrawRecord;
  currentPrediction?: PredictionResult | null;
  latestAiReport?: string;
}

export const TelegramAdminModal: React.FC<TelegramAdminModalProps> = ({
  isOpen,
  onClose,
  latestDraw,
  currentPrediction,
  latestAiReport,
}) => {
  const [botToken, setBotToken] = useState<string>('');
  const [chatId, setChatId] = useState<string>('');
  const [adminId, setAdminId] = useState<string>('');
  const [autoPushEnabled, setAutoPushEnabled] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'config' | 'push' | 'webhook' | 'logs'>('config');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [botInfo, setBotInfo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [customMsgText, setCustomMsgText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch Telegram Config on open
  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/telegram/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setBotToken(data.config.botToken || '');
          setChatId(data.config.chatId || '');
          setAdminId(data.config.adminId || '');
          setAutoPushEnabled(Boolean(data.config.autoPushEnabled));
        }
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to load telegram config:', err);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          chatId,
          adminId,
          autoPushEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Telegram 参数配置保存成功！' });
        fetchConfig();
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || '网络连接失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBot = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/test-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken }),
      });
      const data = await res.json();
      if (res.ok && data.botInfo) {
        setBotInfo(data.botInfo);
        setStatusMsg({ type: 'success', text: `Bot 验证成功！名称: @${data.botInfo.username} (${data.botInfo.first_name})` });
      } else {
        throw new Error(data.error || 'Bot Token 验证错误');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || '验证失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTelegram = async (messageType: 'test' | 'latest_draw' | 'prediction' | 'ai_report' | 'custom') => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          chatId,
          messageType,
          customText: customMsgText,
          drawData: latestDraw,
          predictionData: currentPrediction,
          aiReportText: latestAiReport,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Telegram 消息推送成功！(Msg ID: ${data.message_id})` });
        fetchConfig();
      } else {
        throw new Error(data.error || '发送失败');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || '发送失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetWebhook = async () => {
    const currentDomain = window.location.origin;
    const webhookUrl = `${currentDomain}/api/telegram/webhook`;

    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          webhookUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `已成功绑定 Webhook 至: ${webhookUrl}` });
        fetchConfig();
      } else {
        throw new Error(data.error || '绑定失败');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Webhook 绑定失败' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${currentOrigin}/api/telegram/webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white shadow-lg shadow-sky-900/30">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Telegram 管理员机器人与推文推送中心
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Bot API v7.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                实时推送开奖通告、AI盘析及 Telegram 群组/频道机器人互动
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2 text-xs font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            1. Bot 密钥配置
          </button>
          <button
            onClick={() => setActiveTab('push')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'push'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            2. 一键实时推送
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'webhook'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4 text-emerald-400" />
            3. Webhook 与指令
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-purple-400" />
            4. 推送历史日志
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl text-sky-200 space-y-1">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  如何创建 Telegram 管理员 Bot？
                </div>
                <p className="text-slate-300 leading-relaxed">
                  1. 在 Telegram 中搜索 <strong>@BotFather</strong>，发送命令 <code>/newbot</code> 创建机器人，获取 Bot Token。<br />
                  2. 将您的机器人拉入目标频道或群组，并赋予发帖权限。<br />
                  3. 填写下面的 Bot Token 和 Target Chat ID（如 <code>@macau3_lottery</code> 或频道数字ID）。
                </p>
              </div>

              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Telegram Bot Token <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="例如: 7123456789:AAFg... (可从 @BotFather 获取)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    也可在 Secrets 环境变量中配置 <code>TELEGRAM_BOT_TOKEN</code>。
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Target Chat ID / 频道 ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="例如: @macau_marksix 或 -1001987654321 或个人数字ID"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    推送目标频道用户名、群组 ID 或管理员个人 Chat ID。
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    管理员个人 Telegram User ID (选填)
                  </label>
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="例如: 123456789"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-200 block">自动实时开奖广播模式</span>
                    <span className="text-slate-400">当同步到新开奖数据时，自动向 Telegram 频道推送新卡片</span>
                  </div>
                  <button
                    onClick={() => setAutoPushEnabled(!autoPushEnabled)}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      autoPushEnabled ? 'bg-sky-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all ${
                        autoPushEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bot Info Card if verified */}
              {botInfo && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-sm">{botInfo.first_name} (@{botInfo.username})</div>
                      <div className="text-[11px] text-emerald-400/80">Bot ID: {botInfo.id} | 允许加入群组</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
                    认证成功
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleTestBot}
                  disabled={isLoading || !botToken}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 font-semibold transition-all disabled:opacity-50"
                >
                  测试 Bot 身份 (getMe)
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-sky-900/30 transition-all disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : '保存配置参数'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ONE-CLICK PUSH */}
          {activeTab === 'push' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Send Test Msg */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-sky-400" />
                      1. 发送测试连通消息
                    </div>
                    <p className="text-slate-400 mt-1">
                      测试 Bot 是否成功加入 Chat ID 频道并具有发帖权限。
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendTelegram('test')}
                    disabled={isLoading || !botToken || !chatId}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    立即推送连通测试
                  </button>
                </div>

                {/* Send Latest Draw */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-amber-400" />
                      2. 一键推送最新开奖通报
                    </div>
                    <p className="text-slate-400 mt-1">
                      包含最新开奖期号 <strong>{latestDraw?.issue}</strong>、平码、特码生肖及波色。
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendTelegram('latest_draw')}
                    disabled={isLoading || !latestDraw || !botToken || !chatId}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    推送最新开奖结果
                  </button>
                </div>

                {/* Send Prediction */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      3. 一键推送智能预测缩水方案
                    </div>
                    <p className="text-slate-400 mt-1">
                      推货当前页面的推荐平码与特码，附带置信度与缩水逻辑。
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendTelegram('prediction')}
                    disabled={isLoading || !currentPrediction || !botToken || !chatId}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    推送智能预测卡片
                  </button>
                </div>

                {/* Send AI Report */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-400" />
                      4. 一键推送 Gemini AI 盘析推文
                    </div>
                    <p className="text-slate-400 mt-1">
                      将上一次生成的 Gemini 2.5 深度分析文案推送到 Telegram 频道。
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendTelegram('ai_report')}
                    disabled={isLoading || !latestAiReport || !botToken || !chatId}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {latestAiReport ? '推送 AI 深度盘析' : '请先在AI标签生成分析'}
                  </button>
                </div>
              </div>

              {/* Custom Message Sender */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-slate-200 text-sm flex items-center justify-between">
                  <span>📢 发送自定义 Telegram 广播消息 (支持 HTML 标签)</span>
                  <span className="text-[11px] text-slate-500">HTML 语法: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;</span>
                </div>
                <textarea
                  value={customMsgText}
                  onChange={(e) => setCustomMsgText(e.target.value)}
                  rows={4}
                  placeholder="请输入广播文案... 例如: <b>澳门三分六合彩公告</b>: 本期特码波色走势偏向红波，请各位彩友注意关注。"
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSendTelegram('custom')}
                    disabled={isLoading || !customMsgText.trim() || !botToken || !chatId}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    发送自定义广播
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOK & BOT COMMANDS */}
          {activeTab === 'webhook' && (
            <div className="space-y-5">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-slate-200 text-sm">
                  🔗 Webhook 自动化回调监听
                </div>
                <p className="text-slate-400">
                  绑定 Webhook 后，用户在 Telegram 对 Bot 发送指令 (如 <code>/draw</code>, <code>/predict</code>, <code>/help</code>) 时，系统会自动实时回复开奖与盘析结果。
                </p>

                <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-mono text-sky-400 truncate flex-1">{webhookUrl}</span>
                  <button
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 border border-slate-700 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSetWebhook}
                    disabled={isLoading || !botToken}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    一键自动绑定 Webhook 至 Telegram
                  </button>
                </div>
              </div>

              {/* Bot Commands Guide */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-400" />
                  Bot 支持的自动响应命令
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <code className="text-amber-300 font-bold">/draw</code>
                      <span className="text-slate-400 ml-2">查最新一期开奖结果 (含波色生肖)</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">全员可用</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <code className="text-emerald-300 font-bold">/predict</code>
                      <span className="text-slate-400 ml-2">触发热温概率加权预测</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">全员可用</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <code className="text-purple-300 font-bold">/ai</code>
                      <span className="text-slate-400 ml-2">获取 Gemini AI 深度盘析文案</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">全员可用</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <code className="text-sky-300 font-bold">/start 或 /help</code>
                      <span className="text-slate-400 ml-2">显示菜单指导卡片</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">全员可用</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">近 30 条推送与交互日志：</span>
                <button
                  onClick={fetchConfig}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  刷新日志
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  暂无推送日志，请尝试发送测试消息。
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">时间</th>
                        <th className="py-2.5 px-3">类型</th>
                        <th className="py-2.5 px-3">状态</th>
                        <th className="py-2.5 px-3">详情说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-400">{log.time}</td>
                          <td className="py-2 px-3 text-sky-300 font-sans">{log.type}</td>
                          <td className="py-2 px-3">
                            {log.status === 'success' ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-sans">
                                成功
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-sans">
                                失败
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-sans">
                            {log.message}
                            {log.errorDetail && (
                              <div className="text-rose-400 text-[10px] font-mono mt-0.5">{log.errorDetail}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>澳门三分六合彩 Telegram Bot 管理系统</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
