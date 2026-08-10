#!/usr/bin/env bash
# ====================================================================
# 澳门三分六合彩预测与数据分析系统 - Serv00 自动化部署脚本
# 支持 PHP 原生环境 / Node.js PM2 双部署模式
# ====================================================================

set -e

DOMAIN="${1:-wenge9529.serv00.net}"
MODE="${2:-php}" # 支持 'php' 或 'node'

echo "======================================================"
echo "🚀 开始在 Serv00 上部署彩票预测与 Telegram Bot 系统..."
echo "域名: $DOMAIN | 部署模式: $MODE"
echo "======================================================"

if [ "$MODE" = "php" ]; then
  echo "🐘 [PHP 模式] 正在为 PHP 环境部署项目文件..."
  
  # 检查 php 目录下的配置文件
  if [ ! -f php/config.php ]; then
    echo "⚠️ 未找到 php/config.php，正在尝试应用默认模板..."
  fi

  echo "🔗 正在尝试自动绑定 Telegram Webhook..."
  curl -s "https://$DOMAIN/telegram_bot.php?action=set_webhook" || true

  echo "======================================================"
  echo "🎉 PHP 模式部署就绪！"
  echo "1. 请确保 Serv00 管理面板中 $DOMAIN 的 Web 类型设为 PHP"
  echo "2. Telegram Webhook 绑定地址为: https://$DOMAIN/telegram_bot.php?action=set_webhook"
  echo "3. 浏览器访问地址: https://$DOMAIN/telegram_bot.php"
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

  echo "======================================================"
  echo "🎉 Node.js 模式部署完成！"
  echo "请确保 Serv00 面板反向代理代理至端口 $PORT"
  echo "======================================================"
fi
