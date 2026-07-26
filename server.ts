import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { generate50MacauDraws, MacauDrawItem } from "./src/server/lotteryEngine";
import { analyze50Draws, generate50DrawsPrediction, calculateProfitAndLoss, generateAutomatedPushReport } from "./src/server/statsAlgorithm";
import { processTelegramMessage } from "./src/server/telegramBot";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // 内存缓存 50 期开奖记录
  let current50Draws: MacauDrawItem[] = generate50MacauDraws();

  // Telegram Bot 配置状态
  let telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "8902856799:AAGh69-F_ht5nvd_roAWfkmOxh8xJqzxEXk",
    chatId: process.env.TELEGRAM_CHAT_ID || "@sanfencc66",
    adminId: process.env.TELEGRAM_ADMIN_ID || "7634524866",
    autoPushEnabled: true,
    parseMode: "HTML",
  };

  const telegramLogs: Array<{
    id: string;
    time: string;
    type: string;
    status: "success" | "error";
    message: string;
    errorDetail?: string;
  }> = [];

  const addTelegramLog = (type: string, status: "success" | "error", message: string, errorDetail?: string) => {
    telegramLogs.unshift({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      type,
      status,
      message,
      errorDetail,
    });
    if (telegramLogs.length > 50) telegramLogs.pop();
  };

  // 每 1 分钟自动拉取最新开奖记录 + 自动预测下一期 + 自动推送包含[最新开奖+上期结算+累计总盈亏+下一期预测]的复合帖子
  setInterval(async () => {
    current50Draws = generate50MacauDraws();

    if (telegramConfig.autoPushEnabled && telegramConfig.botToken && telegramConfig.chatId) {
      try {
        const reportText = generateAutomatedPushReport(current50Draws);
        const tgRes = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramConfig.chatId,
            text: reportText,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const tgData = await tgRes.json();
        if (tgData.ok) {
          addTelegramLog("每分钟自动推送", "success", `定时推送到 ${telegramConfig.chatId} 成功 (最新开奖+下期预测+盈亏)`);
        } else {
          addTelegramLog("每分钟自动推送", "error", "定时推送失败", tgData.description);
        }
      } catch (err: any) {
        addTelegramLog("每分钟自动推送", "error", "定时推送网络异常", err.message);
      }
    }
  }, 60000); // 1分钟 (60000ms)


  // API 1: 获取 Telegram 配置与日志
  app.get("/api/telegram/config", (req, res) => {
    res.json({
      success: true,
      config: telegramConfig,
      logs: telegramLogs.slice(0, 30),
      hasEnvToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      hasEnvChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    });
  });

  // API 2: 保存 Telegram 配置
  app.post("/api/telegram/config", (req, res) => {
    const { botToken, chatId, adminId, autoPushEnabled } = req.body;
    if (botToken !== undefined) telegramConfig.botToken = botToken.trim();
    if (chatId !== undefined) telegramConfig.chatId = chatId.trim();
    if (adminId !== undefined) telegramConfig.adminId = adminId.trim();
    if (autoPushEnabled !== undefined) telegramConfig.autoPushEnabled = Boolean(autoPushEnabled);

    addTelegramLog("系统设置", "success", "更新 Telegram 配置成功");
    return res.json({ success: true, message: "配置保存成功", config: telegramConfig });
  });

  // API 3: 测试 Bot Token
  app.post("/api/telegram/test-bot", async (req, res) => {
    const token = req.body.botToken || telegramConfig.botToken;
    if (!token) return res.status(400).json({ error: "请输入 Telegram Bot Token" });

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(8000),
      });
      const tgData = await tgRes.json();
      if (tgData.ok) {
        addTelegramLog("Bot测试", "success", `Bot 验证成功: @${tgData.result.username}`);
        return res.json({ success: true, botInfo: tgData.result });
      }
      throw new Error(tgData.description || "Telegram 返回错误");
    } catch (err: any) {
      addTelegramLog("Bot测试", "error", "Bot 验证失败", err.message);
      return res.status(400).json({ error: "验证失败: " + err.message });
    }
  });

  // API 4: 主动发送 Telegram 消息
  app.post("/api/telegram/send", async (req, res) => {
    const token = req.body.botToken || telegramConfig.botToken;
    const targetChatId = req.body.chatId || telegramConfig.chatId;

    if (!token || !targetChatId) {
      return res.status(400).json({ error: "缺少 Bot Token 或 Chat ID" });
    }

    const { messageType, customText } = req.body;
    let formattedText = customText || "📢 澳门三分六合彩管理员广播消息";

    if (messageType === "test") {
      formattedText = `
<b>🤖 澳门三分六合彩 · Telegram 管理员连通性测试</b>
--------------------------------------
<b>服务器时间</b>: ${new Date().toLocaleString("zh-CN")}
<b>推送渠道</b>: ${targetChatId}
<b>接口状态</b>: 🟢 正常通畅
`.trim();
    } else if (messageType === "auto_combined") {
      formattedText = generateAutomatedPushReport(current50Draws);
    } else if (messageType === "prediction") {
      const pred = generate50DrawsPrediction(current50Draws);
      formattedText = `
<b>🧠 澳门三分六合彩 · 50期规律智能预测</b>
--------------------------------------
<b>目标期号</b>: <code>${pred.targetIssue}</code>
<b>算法</b>: ${pred.algorithmName}
<b>置信度</b>: <b>${pred.confidence}% 🔥</b>
--------------------------------------
📏 <b>大小预测</b>: <b>【 ${pred.sizePred} 】</b> (赔率 1.95)
🎲 <b>单双预测</b>: <b>【 ${pred.parityPred} 】</b> (赔率 1.95)
🎨 <b>波色预测</b>: <b>【 ${pred.colorPred} 】</b> (赔率 ${pred.colorOdds})
--------------------------------------
💡 <b>规律依据</b>: ${pred.rationale}
`.trim();
    }

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: formattedText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const tgData = await tgRes.json();
      if (tgData.ok) {
        addTelegramLog(messageType || "主动推送", "success", `发送至 ${targetChatId} 成功`);
        return res.json({ success: true, message_id: tgData.result.message_id });
      }
      throw new Error(tgData.description || "发送失败");
    } catch (err: any) {
      addTelegramLog(messageType || "主动推送", "error", "发送失败", err.message);
      return res.status(500).json({ error: "发送失败: " + err.message });
    }
  });

  // API 5: Telegram Webhook 路由处理
  app.post("/api/telegram/webhook", async (req, res) => {
    res.status(200).send("OK");
    try {
      const update = req.body;
      if (!update || (!update.message && !update.callback_query)) return;

      const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      await processTelegramMessage(token, update, current50Draws);
    } catch (e) {
      console.error("Webhook error:", e);
    }
  });

  // API 6: 50期统计与预测 API
  app.get("/api/lottery/stats", (req, res) => {
    const stats = analyze50Draws(current50Draws);
    const pnl = calculateProfitAndLoss(current50Draws);
    const prediction = generate50DrawsPrediction(current50Draws);

    res.json({
      success: true,
      stats,
      pnl,
      prediction,
      drawsCount: current50Draws.length,
    });
  });

  // API 7: 智能预测 API
  app.get("/api/predict", (req, res) => {
    const pred = generate50DrawsPrediction(current50Draws);
    res.json({ success: true, prediction: pred });
  });

  // API 8: 历史记录 API
  app.get("/api/history/macaujc3", (req, res) => {
    res.json({
      result: true,
      message: "操作成功 (50期模块化数据源)",
      code: 200,
      data: [
        {
          code: "S00000",
          msg: "处理成功",
          name: "三分六合彩",
          success: true,
          data: current50Draws,
        },
      ],
      timestamp: Date.now(),
    });
  });

  // API 9: Gemini AI 分析
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "未配置 GEMINI_API_KEY" });
      }

      const { focusNotes } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
你是一位精通概率论与澳门三分六合彩 (Macau Mark Six) 的专业量化分析师。
请针对近 50 期开奖记录进行深度结构化分析，分析关注点：${focusNotes || "无"}。

近 50 期热号统计: ${JSON.stringify(analyze50Draws(current50Draws).hotNumbers)}
最新一期: ${JSON.stringify(current50Draws[0])}

请格式化输出简明分析，并给出下期关注号码组合。
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return res.json({
        success: true,
        report: response.text || "生成报告失败",
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: "AI分析失败: " + err.message });
    }
  });

  // Vite 开发环境 / 生产环境静态文件支持
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`澳门三分六合彩模块化引擎已在端口 ${PORT} 启动`);
  });
}

startServer();
