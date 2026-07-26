import React, { useState } from 'react';
import { X, Server, Copy, Check, Terminal, Shield, BookOpen, ExternalLink, Download } from 'lucide-react';
import { Serv00DeployConfig } from '../types';

interface Serv00DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Serv00DeploymentModal: React.FC<Serv00DeploymentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<Serv00DeployConfig>({
    domain: 'lottery.yourusername.serv00.net',
    port: 25432,
    nodeVersion: 'node20',
    appDir: 'lottery-predict-app',
    geminiKey: 'AIzaSy...',
  });

  const [activeTab, setActiveTab] = useState<'script' | 'manual' | 'php'>('script');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Auto-generate the automated deploy-serv00.sh script based on inputs
  const generatedScript = `#!/usr/bin/env bash
# =======================================================
# 彩票开奖预测与数据分析系统 - Serv00 自动化部署脚本
# 适用平台: Serv00 FreeBSD 虚拟主机
# =======================================================

set -e

DOMAIN="${config.domain}"
PORT="${config.port}"
NODE_BIN="/usr/local/bin/${config.nodeVersion}"
APP_DIR="$HOME/domains/$DOMAIN/public_nodejs"

echo "🚀 1/5 正在准备 Serv00 运行环境与端口号..."
# 开启 Devil 虚拟主机 Node.js 扩展支持
devil www options $DOMAIN nodejs $NODE_BIN || true
devil port add tcp $PORT || true

echo "📦 2/5 正在创建应用代码目录..."
mkdir -p $APP_DIR
cd $APP_DIR

echo "📥 3/5 正在写入 .env 环境变量配置文件..."
cat << 'EOF' > .env
NODE_ENV=production
PORT=$PORT
GEMINI_API_KEY="${config.geminiKey}"
EOF

echo "🛠️ 4/5 正在安装依赖并编译生成生产代码..."
npm install
npm run build

echo "⚡ 5/5 使用本地 PM2 启动后台持久化进程..."
npm install pm2 --save-dev || true
./node_modules/.bin/pm2 stop lottery-app || true
PORT=$PORT ./node_modules/.bin/pm2 start dist/server.cjs --name "lottery-app"
./node_modules/.bin/pm2 save || true

echo "✅ 部署完成！请在 Serv00 面板添加 Web业 反向代理端口: $PORT"
echo "🌐 访问地址: http://$DOMAIN"
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-white">
        {/* Top Title Bar */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Serv00 主机部署与配置指引助手
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  FreeBSD 架构专用
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                支持在 Serv00 免费 Hosting 主机上一键部署本彩票预测与 AI 盘析系统
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Form Configuration Inputs */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Serv00 绑定域名</label>
              <input
                type="text"
                value={config.domain}
                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Devil 分配端口</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Node.js 版本</label>
              <select
                value={config.nodeVersion}
                onChange={(e) => setConfig({ ...config, nodeVersion: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="node20">Node.js v20 (推荐)</option>
                <option value="node22">Node.js v22</option>
                <option value="node18">Node.js v18</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">GEMINI_API_KEY</label>
              <input
                type="password"
                value={config.geminiKey}
                onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
                placeholder="留空即使用环境默认"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setActiveTab('script')}
              className={`pb-2 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === 'script'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              1. 自动化一键部署 Shell 脚本
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-2 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === 'manual'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              2. Serv00 手动 Node 命令教程
            </button>

            <button
              onClick={() => setActiveTab('php')}
              className={`pb-2 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === 'php'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4 text-emerald-400" />
              3. Serv00 纯 PHP 极速版 (无需 Node)
            </button>
          </div>

          {/* Tab Content 1: Auto Script */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>直接在 Serv00 SSH 终端运行以下生成脚本即可完成完整部署：</span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      已复制脚本
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      复制 Shell 脚本
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-indigo-300 overflow-x-auto selection:bg-indigo-900 selection:text-white">
                {generatedScript}
              </pre>
            </div>
          )}

          {/* Tab Content 2: Manual Tutorial */}
          {activeTab === 'manual' && (
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    1
                  </span>
                  开放应用端口 (Devil CLI)
                </h4>
                <p className="text-slate-400">
                  通过 SSH 登录 Serv00 服务器后，使用 Devil 命令行工具注册 TCP 监听端口：
                </p>
                <code className="block bg-slate-900 p-2 rounded text-emerald-400 font-mono">
                  devil port add tcp {config.port}
                </code>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    2
                  </span>
                  设置 Node.js 运行环境类型
                </h4>
                <p className="text-slate-400">
                  配置 Serv00 域名站点类型为 Node.js 动态服务：
                </p>
                <code className="block bg-slate-900 p-2 rounded text-emerald-400 font-mono">
                  devil www options {config.domain} nodejs /usr/local/bin/{config.nodeVersion}
                </code>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    3
                  </span>
                  拉取代码并打包编译
                </h4>
                <code className="block bg-slate-900 p-2 rounded text-emerald-400 font-mono">
                  git clone &lt;your-repo-url&gt; && cd lottery-predict-app && npm install && npm run build
                </code>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    4
                  </span>
                  使用 PM2 后台持久化启动服务
                </h4>
                <code className="block bg-slate-900 p-2 rounded text-emerald-400 font-mono">
                  pm2 start dist/server.cjs --name "lottery-app"
                </code>
              </div>
            </div>
          )}

          {/* Tab Content 3: Pure PHP Version */}
          {activeTab === 'php' && (
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-200">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  ⚡ Serv00 纯 PHP 独立部署模式
                </h4>
                <p className="text-xs text-slate-300">
                  如果您不想在 Serv00 运行 Node.js 进程，可以直接使用项目根目录下 <code>php/</code> 文件夹中的全套原生 PHP 脚本！只需将文件上传至虚拟主机的 <code>public_html</code> 目录即可即刻运行。
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h5 className="font-bold text-indigo-300">📁 PHP 核心脚本文件列表：</h5>
                <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                  <li><code>php/config.php</code> - Bot Token、Chat ID 与全盘参数配置</li>
                  <li><code>php/index.php</code> - Web 前端控制面板 & 最新开奖显示</li>
                  <li><code>php/api.php</code> - macaumarksix 实时数据代理与预测算法 API</li>
                  <li><code>php/telegram_bot.php</code> - Telegram Webhook 接收与消息发送控制器</li>
                  <li><code>php/cron.php</code> - Serv00 3分钟定时开奖自动广播脚本</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h5 className="font-bold text-indigo-300">⏰ 配置 Serv00 每 3 分钟 Cron 自动开奖播报：</h5>
                <p className="text-slate-400 text-xs">
                  在 Serv00 管理面板 → Cron jobs 添加如下定时命令：
                </p>
                <code className="block bg-slate-900 p-2 rounded text-amber-300 font-mono">
                  {'*/3 * * * * /usr/local/bin/php ~/domains/' + config.domain + '/public_html/cron.php > /dev/null 2>&1'}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Serv00 特别说明：内存限制 512MB，推荐使用 PM2 管理进程。</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
