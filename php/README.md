# 澳门三分六合彩 & Telegram Bot - PHP 独立部署包

本目录包含完整的 **PHP 原生版本**，可直接上传并运行于任何支持 PHP 7.4+ / PHP 8.x 的服务器（如 **Serv00**、宝塔面板、cPanel、Apache、Nginx 等）。

---

## 📁 文件结构说明

| 文件名 | 作用描述 |
| :--- | :--- |
| `config.php` | 基础配置文件，读取 `.env` 环境变量或自定义 Bot Token、Chat ID |
| `index.php` | PHP 极速 Web 管理面板，显示最新 3分钟六合彩开奖与发送 Telegram 广播 |
| `api.php` | REST API 接口（代理 `macaumarksix.com` 接口与提供概率加权预测算法） |
| `telegram_bot.php` | Telegram Bot 核心控制器（处理 Webhook 指令如 `/draw`, `/predict` 及消息发送） |
| `cron.php` | Serv00 / Linux Crontab 定时开奖自动广播脚本 |

---

## 🚀 Serv00 部署步骤

1. **上传文件**
   - 将 `php/` 目录下的所有文件上传到 Serv00 的 `public_html` 目录中（例如 `~/domains/your-domain.com/public_html/`）。

2. **配置环境变量 (.env 或 config.php)**
   - 在 `config.php` 中填入您的 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。
   - 或者在同级目录下新建 `.env` 文件：
     ```env
     TELEGRAM_BOT_TOKEN=7123456789:AAFg...
     TELEGRAM_CHAT_ID=@your_channel
     ```

3. **设置 Telegram Webhook**
   - 在浏览器中访问：`https://your-domain.com/telegram_bot.php?action=set_webhook` 传入您的 URL，或在管理界面点击“绑定 Webhook”。

4. **配置 Serv00 每 3 分钟自动开奖广播 Cron**
   - 进入 Serv00 Panel -> **Cron jobs**，添加 Cron 任务：
     ```bash
     */3 * * * * /usr/local/bin/php ~/domains/your-domain.com/public_html/cron.php > /dev/null 2>&1
     ```

---

## 💬 Bot 互动指令
- `/draw` - 查询最新一期开奖结果 (包含平码、特码波色及生肖)
- `/history [条数]` - 查询多期开奖历史记录 (例如 `/history 5` 或 `/history 10`)
- `/predict` - 获取热温概率加权预测方案
- `/stats` 或 `/profit` - 查看 AI 算法模拟盘下注盈亏统计报表与 ROI 回报率
- `/help` - 显示指令菜单说明
