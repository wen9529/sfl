import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Terminal,
  Server,
  Settings,
  HelpCircle,
  FileText,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Globe,
  Bot
} from 'lucide-react';

interface LogItem {
  id: string;
  time: string;
  type: string;
  status: 'success' | 'error';
  message: string;
  detail: string;
}

interface BotConfig {
  botToken: string;
  chatId: string;
  adminId: string;
  autoPushEnabled: boolean;
}

interface WebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
}

export const TelegramPanel: React.FC = () => {
  const [config, setConfig] = useState<BotConfig>({
    botToken: '读取中...',
    chatId: '读取中...',
    adminId: '读取中...',
    autoPushEnabled: true,
  });
  const [lastPushedIssue, setLastPushedIssue] = useState<string>('读取中...');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    telegramResponse?: any;
    reportText?: string;
  } | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Webhook Binding state
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isBindingWebhook, setIsBindingWebhook] = useState<boolean>(false);
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [webhookResult, setWebhookResult] = useState<{
    success: boolean;
    message: string;
    directManualBindUrl?: string;
    checkWebhookInfoUrl?: string;
    attemptedWebhookUrl?: string;
    solution?: string[];
  } | null>(null);

  // Fetch status and logs
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      let res = await fetch('/api/telegram/status');
      if (!res.ok) {
        res = await fetch('/api.php?action=logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
          setConfig({
            botToken: '已配置 (PHP后端隐藏密钥)',
            chatId: '请检查 php/config.php',
            adminId: '请检查 php/config.php',
            autoPushEnabled: true,
          });
          setLastPushedIssue('见 last_pushed_issue.txt');
          return;
        }
        throw new Error('API request failed');
      }

      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setLastPushedIssue(data.lastPushedIssue || '无记录');
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load Telegram status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebhookInfo = async () => {
    try {
      let res = await fetch('/api/telegram/webhook-info');
      if (!res.ok) {
        res = await fetch('/api.php?action=webhook_info');
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          setWebhookInfo(data.result);
        }
      }
    } catch (e) {
      console.error('Failed to fetch webhook info:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchWebhookInfo();
    const interval = setInterval(() => {
      fetchStatus();
      fetchWebhookInfo();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Bind Webhook
  const handleSetWebhook = async (urlToSet?: string) => {
    setIsBindingWebhook(true);
    setWebhookResult(null);
    try {
      const targetUrl = urlToSet || customWebhookUrl;
      let res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: targetUrl }),
      });
      if (!res.ok && res.status !== 400) {
        const query = targetUrl ? `&webhookUrl=${encodeURIComponent(targetUrl)}` : '';
        res = await fetch(`/telegram_bot.php?action=set_webhook${query}`);
      }
      const data = await res.json();
      if (data.success) {
        setWebhookResult({
          success: true,
          message: data.message || `Webhook 绑定成功！当前绑定地址：${data.webhookUrl || targetUrl || '默认地址'}`,
        });
        fetchWebhookInfo();
        fetchStatus();
      } else {
        setWebhookResult({
          success: false,
          message: data.error || 'Webhook 绑定失败',
          directManualBindUrl: data.directManualBindUrl,
          checkWebhookInfoUrl: data.checkWebhookInfoUrl,
          attemptedWebhookUrl: data.attemptedWebhookUrl || targetUrl,
          solution: data.solution,
        });
      }
    } catch (err: any) {
      setWebhookResult({
        success: false,
        message: '绑定 Webhook 时发生网络异常：' + err.message,
      });
    } finally {
      setIsBindingWebhook(false);
    }
  };

  // Trigger manual test push
  const handleTestPush = async () => {
    if (isPushing) return;
    setIsPushing(true);
    setTestResult(null);

    try {
      // First try Node.js endpoint, if fails try PHP endpoint
      let res = await fetch('/api/telegram/test-push', { method: 'POST' });
      if (!res.ok && res.status !== 400 && res.status !== 500) {
        // Fallback to PHP test push endpoint
        res = await fetch('/api.php?action=test_push');
      }

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error || '推送返回状态异常',
        telegramResponse: data.telegramResponse || data.telegram_response,
        reportText: data.reportText || data.report_text,
      });

      // Reload logs on completion
      fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: '连接服务器测试接口超时或异常：' + err.message,
      });
    } finally {
      setIsPushing(false);
    }
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Telegram Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Settings className="w-5 h-5 text-rose-500" />
              <h2 className="font-bold text-base text-slate-100">Telegram 自动推送核心配置</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">机器人密钥 (Bot Token)</span>
                <code className="text-rose-400 font-mono block break-all text-[11px]">
                  {config.botToken}
                </code>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">频道 ID / 对话 ID (Chat ID)</span>
                <code className="text-emerald-400 font-mono block break-all text-[11px]">
                  {config.chatId}
                </code>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">上一期成功推送期号</span>
                <span className="text-amber-400 font-bold block font-mono text-sm">
                  第 {lastPushedIssue} 期
                </span>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">自动触发机制</span>
                <span className="text-slate-200 block">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2" />
                  每 60 秒轮询开奖接口，若出现新期号即刻预测并推送
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 text-slate-400 text-xs bg-slate-950/30 p-3 rounded-lg border border-slate-800/50 flex gap-2 items-start">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>如何运行：</b> 双端架构下，Node 进程在后台常驻轮询推送。若您在 Serv00 等不支持后台 Node 的 PHP 空间，
              可使用 Cron 定时任务每分钟访问 <code>cron.php</code>。双端共享状态文件，自动避免重复推送。
            </p>
          </div>
        </div>

        {/* Diagnostic Command Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Server className="w-5 h-5 text-rose-500" />
              <h2 className="font-bold text-base text-slate-100">推送通道诊断与测试</h2>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              由于 Telegram 机器人限制，如果<b>频道 ID</b>配置错误、或<b>机器人未被添加为频道管理员</b>，
              或者被限制了发言发帖权限，推送将会被 Telegram 强制拒绝。
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleTestPush}
              disabled={isPushing}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 hover:opacity-90 disabled:opacity-50 text-white shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
              {isPushing ? '正在生成算法并推送中...' : '🚀 发送即时测试推送'}
            </button>

            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
              手动同步状态与日志
            </button>
          </div>
        </div>
      </div>

      {/* Test Push Details Response */}
      {testResult && (
        <div className={`p-5 rounded-2xl border ${testResult.success ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100' : 'bg-red-950/20 border-red-500/30 text-red-100'} animate-fade-in`}>
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-sm">
                {testResult.success ? '手动推送测试成功 ✅' : '手动推送测试失败 ❌'}
              </h3>
              <p className="text-xs opacity-90">{testResult.message}</p>

              {testResult.telegramResponse && (
                <div className="mt-3">
                  <span className="text-[10px] text-slate-400 block font-mono mb-1">Telegram 服务器返回原始数据：</span>
                  <pre className="text-[10px] font-mono bg-slate-950/90 p-3 rounded-lg border border-slate-800 overflow-x-auto text-slate-300">
                    {JSON.stringify(testResult.telegramResponse, null, 2)}
                  </pre>
                </div>
              )}

              {!testResult.success && (
                <div className="mt-3 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-red-300 space-y-1">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>排查建议：</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90 text-[11px]">
                    <li>请确保机器人已成功加入到目标频道中。</li>
                    <li>请确保机器人在频道中被赋予了<b>“发布消息 (Post Messages)”</b>管理员权限。</li>
                    <li>请确认您的 <code>Chat ID</code> 填写完整无误（频道ID通常为 <code>-100</code> 开头）。</li>
                    <li>海外虚拟主机（如 Serv00）可能因网络超时导致推送失败，可多次尝试。</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Webhook Configuration & Diagnostics (Fix Bot Non-Responsive issue) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-base text-slate-100">
              Telegram Webhook 指令与按钮绑定
              <span className="text-xs text-sky-400 font-normal ml-2 font-mono">【解决 Bot 无反应问题】</span>
            </h2>
          </div>
          <button
            onClick={() => handleSetWebhook()}
            disabled={isBindingWebhook}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <LinkIcon className={`w-3.5 h-3.5 ${isBindingWebhook ? 'animate-spin' : ''}`} />
            {isBindingWebhook ? '正在绑定 Webhook...' : '🔗 一键绑定当前应用 Webhook'}
          </button>
        </div>

        {/* Explain why channel push works but bot messages don't respond */}
        <div className="bg-sky-950/30 border border-sky-800/40 p-4 rounded-xl text-xs space-y-2 text-sky-200">
          <div className="flex items-center gap-2 font-bold text-sky-400">
            <Bot className="w-4 h-4" />
            <span>为什么频道能正常推送，但对 Bot 发送指令/点击按钮无反应？</span>
          </div>
          <p className="leading-relaxed opacity-90 text-[11px]">
            • <b>频道发帖</b> 属于【主动推送】（服务器主动请求 Telegram 接口，只要配置 Token 与 Chat ID 即可运行）。
            <br />
            • <b>Bot 菜单与指令</b> 属于【被动回调】（用户发送 <code>/draw</code> 或点击按钮时，Telegram 需要向服务器的 <b>Webhook 地址</b> 发送 HTTP POST 回调）。
            <br />
            • 若更换了部署环境或尚未绑定 Webhook，Telegram 无法把用户消息发回程序，就会出现 Bot 处于静默“无反应”状态。点击右上角<b>【一键绑定当前应用 Webhook】</b>即可恢复！
          </p>
        </div>

        {/* Webhook Details Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-medium">当前 Telegram 记录的 Webhook 地址</span>
            <code className="text-sky-300 font-mono block break-all text-[11px]">
              {webhookInfo?.url ? webhookInfo.url : '未绑定 / Telegram 尚未建立 Webhook 回调'}
            </code>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-medium">Telegram 待处理消息积压队列 (Pending)</span>
            <span className={`font-mono text-sm font-bold block ${webhookInfo?.pending_update_count && webhookInfo.pending_update_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {webhookInfo?.pending_update_count !== undefined ? `${webhookInfo.pending_update_count} 条` : '查询中...'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-medium">最近一次 Webhook 错误状态</span>
            <span className={`block font-mono text-[11px] ${webhookInfo?.last_error_message ? 'text-red-400' : 'text-slate-400'}`}>
              {webhookInfo?.last_error_message ? `${webhookInfo.last_error_message}` : '🟢 无错误 (正常)'}
            </span>
          </div>
        </div>

        {/* Custom Webhook URL input & bind button */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="url"
            value={customWebhookUrl}
            onChange={(e) => setCustomWebhookUrl(e.target.value)}
            placeholder="自定义地址 (留空代表绑定当前应用)，例如: https://wenge9529.serv00.net/telegram_bot.php"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
          />
          <button
            onClick={() => handleSetWebhook()}
            disabled={isBindingWebhook}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 whitespace-nowrap transition-all cursor-pointer"
          >
            绑定所填 Webhook 地址
          </button>
        </div>

        {webhookResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-3 ${webhookResult.success ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-red-950/30 border-red-500/30 text-red-300'}`}>
            <div className="flex items-start gap-2">
              {webhookResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
              <div className="flex-1 space-y-1">
                <span className="font-semibold">{webhookResult.message}</span>
                {webhookResult.attemptedWebhookUrl && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    尝试绑定的回调地址：{webhookResult.attemptedWebhookUrl}
                  </p>
                )}
              </div>
            </div>

            {!webhookResult.success && webhookResult.directManualBindUrl && (
              <div className="mt-2 pt-2 border-t border-red-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-semibold text-slate-200 text-xs">🚀 备用方案：浏览器直接绑定 (无需经过服务器)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  如果服务器因网络策略无法直接连接 Telegram API，点击下方按钮将在新窗口通过浏览器直连 Telegram 完成绑定：
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={webhookResult.directManualBindUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-all"
                  >
                    🔗 在新标签页中一键直连绑定 Webhook
                  </a>
                  {webhookResult.checkWebhookInfoUrl && (
                    <a
                      href={webhookResult.checkWebhookInfoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 border border-slate-700 transition-all"
                    >
                      🔍 检查当前 Webhook 状态
                    </a>
                  )}
                </div>
              </div>
            )}

            {!webhookResult.success && webhookResult.solution && (
              <div className="mt-2 pt-2 border-t border-red-500/20 text-[11px] text-slate-400 space-y-1">
                <span className="text-slate-300 font-medium block">排查建议：</span>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {webhookResult.solution.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Real-time Push Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-base text-slate-100">
              运行调试日志
              <span className="text-xs text-slate-500 font-normal ml-2">存储于 telegram_logs.json</span>
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            实时更新
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            暂未产生任何推送或运行日志记录
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isSuccess = log.status === 'success';

              return (
                <div
                  key={log.id}
                  className="bg-slate-950/40 border border-slate-800/80 rounded-xl overflow-hidden transition-all"
                >
                  {/* Log Header Row */}
                  <div
                    onClick={() => toggleLogExpand(log.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                        isSuccess
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {isSuccess ? '成功' : '失败'}
                      </span>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200">
                          {log.message}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          类型: {log.type} | 时间: {log.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 self-end sm:self-auto">
                      <span className="text-[10px] font-mono hover:text-rose-400 transition-colors">
                        {isExpanded ? '折叠详情' : '展开日志'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Detail View */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 border-t border-slate-900/80 bg-slate-950/60 p-3.5">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">日志详细数据/报表：</span>
                      <pre className="text-[11px] font-mono bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 text-slate-300 whitespace-pre-wrap break-all max-h-96 overflow-y-auto leading-relaxed">
                        {log.detail}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
