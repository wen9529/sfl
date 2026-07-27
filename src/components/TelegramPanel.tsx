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
  ChevronUp
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

  // Fetch status and logs
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      // Prioritize Node API, fallback to PHP API
      let res = await fetch('/api/telegram/status');
      if (!res.ok) {
        // Fallback to PHP endpoint
        res = await fetch('/api.php?action=logs');
        if (res.ok) {
          const data = await res.json();
          // Map PHP config structures
          setLogs(data.logs || []);
          // Config will be displayed as fallback
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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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
