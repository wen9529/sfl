#!/usr/bin/env bash
# ====================================================================
# 澳门三分六合彩 - Serv00 服务器重启 / 进程崩溃自动保活防护脚本 (Keep-Alive Guard)
# 作用: 当 Serv00 虚机重启或杀死 Node/PM2 后台进程时，Cron 自动复活 Bot 与 Web 服务
# ====================================================================

# 获取当前脚本所在目录
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR" || exit 1

LOG_FILE="$APP_DIR/keepalive.log"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# 1. 检查 Node.js PM2 模式
if [ -f "dist/server.cjs" ]; then
  PM2_BIN="./node_modules/.bin/pm2"
  
  if [ -x "$PM2_BIN" ]; then
    # 检查 lottery-app 进程状态
    IS_RUNNING=$("$PM2_BIN" pid lottery-app 2>/dev/null || echo "")
    
    if [ -z "$IS_RUNNING" ] || [ "$IS_RUNNING" = "0" ]; then
      echo "[$TIMESTAMP] ⚠️ 检测到 Serv00 已重启或 PM2 进程离线，正在重新启动 lottery-app..." >> "$LOG_FILE"
      
      # 获取预设端口或默认端口
      PORT="${PORT:-25432}"
      PORT=$PORT "$PM2_BIN" start dist/server.cjs --name "lottery-app" >> "$LOG_FILE" 2>&1
      "$PM2_BIN" save >> "$LOG_FILE" 2>&1
      
      # 尝试自动触发 Webhook 重新绑定
      sleep 2
      curl -s "http://127.0.0.1:$PORT/api/telegram/set-webhook" > /dev/null 2>&1 || true
      
      echo "[$TIMESTAMP] ✅ lottery-app 已成功复活运行在端口 $PORT！" >> "$LOG_FILE"
    else
      # 进程健康运行中，保持日志简洁，只保留最后 200 行
      if [ -f "$LOG_FILE" ] && [ $(wc -l < "$LOG_FILE") -gt 500 ]; then
        tail -n 100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
      fi
    fi
  fi
fi

# 2. PHP Cron 定时开奖检测与推送 (双重保障，即使 Node 暂停也能正常推送开奖)
if [ -f "cron.php" ]; then
  # 使用 php 执行开奖检测
  /usr/local/bin/php cron.php >> "$LOG_FILE" 2>&1 || php cron.php >> "$LOG_FILE" 2>&1 || true
fi

exit 0
