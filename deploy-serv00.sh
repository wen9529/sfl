#!/usr/bin/env bash
# ====================================================================
# 澳门三分六合彩预测与数据分析系统 - Serv00 自动化部署脚本
# 支持 PHP 原生环境 / Node.js PM2 双部署模式
# 含 Serv00 虚机重启/进程清理防崩溃自动保活 (Keep-Alive Guard)
# ====================================================================

set -e

DOMAIN="${1:-wenge9529.serv00.net}"
MODE="${2:-node}" # 默认推荐 node，亦支持 'php'

chmod +x keepalive.sh 2>/dev/null || true

echo "======================================================"
echo "🚀 开始在 Serv00 上部署彩票预测与 Telegram Bot 系统..."
echo "域名: $DOMAIN | 部署模式: $MODE"
echo "======================================================"

if [ "$MODE" = "php" ]; then
  echo "🐘 [PHP 模式] 正在为 PHP 环境部署项目文件..."
  
  if [ ! -f config.php ]; then
    echo "⚠️ 未找到 config.php，请检查配置..."
  fi

  echo "🔗 正在尝试自动绑定 Telegram Webhook..."
  curl -s "https://$DOMAIN/telegram_bot.php?action=set_webhook" || true

  # 自动为 PHP 模式写入 Crontab
  CURRENT_DIR="$(pwd)"
  CRON_JOB="* * * * * cd $CURRENT_DIR && php cron.php > /dev/null 2>&1"
  (crontab -l 2>/dev/null | grep -v "cron.php"; echo "$CRON_JOB") | crontab - || true

  echo "======================================================"
  echo "🎉 PHP 模式部署就绪！"
  echo "1. 请确保 Serv00 管理面板中 $DOMAIN 的 Web 类型设为 PHP"
  echo "2. Telegram Webhook 绑定地址: https://$DOMAIN/telegram_bot.php?action=set_webhook"
  echo "3. 已自动添加 Crontab 任务，每 1 分钟自动触发 cron.php 推送"
  echo "======================================================"

else
  PORT="${3:-25432}"
  NODE_VERSION="${4:-node20}"

  echo "🔧 1/4 配置 Serv00 域名 Node.js 环境..."
  devil www options $DOMAIN nodejs /usr/local/bin/$NODE_VERSION || true
  devil port add tcp $PORT || true

  echo "📦 2/4 安装项目依赖并编译..."
  npm install
  npm run build

  echo "⚡ 3/4 启动 PM2 进程..."
  npm install pm2 --save-dev || true
  ./node_modules/.bin/pm2 stop lottery-app || true
  PORT=$PORT ./node_modules/.bin/pm2 start dist/server.cjs --name "lottery-app"
  ./node_modules/.bin/pm2 save || true

  echo "🛡️ 4/4 配置 Serv00 防崩溃保活 Guard 定时任务 (Cron Keep-Alive)..."
  CURRENT_DIR="$(pwd)"
  KEEPALIVE_CRON="*/2 * * * * cd $CURRENT_DIR && PORT=$PORT ./keepalive.sh > /dev/null 2>&1"
  (crontab -l 2>/dev/null | grep -v "keepalive.sh"; echo "$KEEPALIVE_CRON") | crontab - || true

  echo "======================================================"
  echo "🎉 Node.js 模式部署完成！"
  echo "1. 请确保 Serv00 面板反向代理代理至端口 $PORT"
  echo "2. 已自动注入 keepalive.sh 保活 Cron 任务 (每 2 分钟检测一次)"
  echo "3. 重要: 请登录 Serv00 控制面板 (panel.serv00.com):"
  echo "   前往 [Usługi dodatkowe / Additional services] -> [Uruchamianie własnych programów / Run background processes]"
  echo "   将状态切换为 [Włączone / Enabled]，防止 Serv00 24小时强行杀死进程！"
  echo "======================================================"
fi

