import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { generate50MacauDraws, getLatestDraws, MacauDrawItem } from "./src/server/lotteryEngine";
import { analyze50Draws, generate50DrawsPrediction, calculateProfitAndLoss, generateAutomatedPushReport } from "./src/server/statsAlgorithm";
import { processTelegramMessage } from "./src/server/telegramBot";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // 内存缓存开奖记录 (保留最新3天，约1440期)
  let currentDraws: MacauDrawItem[] = await getLatestDraws();
  // 记录上一期已推送/已处理的开奖期号
  let lastPushedIssue = currentDraws.length > 0 ? currentDraws[0].expect : "";

  // Telegram Bot 配置状态
  let telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
    adminId: process.env.TELEGRAM_ADMIN_ID || "",
    autoPushEnabled: true,
    parseMode: "HTML",
  };

  // 每 1 分钟自动拉取最新开奖记录，检查期号是否有更新，仅在新期号产生时才预测并推送
  setInterval(async () => {
    const freshDraws = await getLatestDraws();
    if (!freshDraws || freshDraws.length === 0) return;

    const latestIssue = freshDraws[0].expect;

    // 如果获取到的仍是旧的开奖记录，不运行预测，不进行推送
    if (latestIssue === lastPushedIssue) {
      return;
    }

    // 发现新的开奖期号！更新全局缓存与已推送期号
    const map = new Map(currentDraws.map(d => [d.expect, d]));
    freshDraws.forEach(d => map.set(d.expect, d));
    currentDraws = Array.from(map.values()).sort((a, b) => b.expect.localeCompare(a.expect)).slice(0, 1440);
    lastPushedIssue = latestIssue;

    if (telegramConfig.autoPushEnabled && telegramConfig.botToken && telegramConfig.chatId) {
      try {
        const reportText = generateAutomatedPushReport(currentDraws);
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
          console.log("新期自动推送", "success", `检测到新开奖 [第 ${latestIssue} 期]，自动完成下一期预测并推送到 ${telegramConfig.chatId}`);
        } else {
          console.log("新期自动推送", "error", `检测到新开奖 [第 ${latestIssue} 期]，推送失败`, tgData.description);
        }
      } catch (err: any) {
        console.log("新期自动推送", "error", `检测到新开奖 [第 ${latestIssue} 期]，推送网络异常`, err.message);
      }
    }
  }, 60000); // 1分钟 (60000ms)


  // API 5: Telegram Webhook 路由处理
  app.post("/api/telegram/webhook", async (req, res) => {
    res.status(200).send("OK");
    try {
      const update = req.body;
      if (!update || (!update.message && !update.callback_query)) return;

      const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      await processTelegramMessage(token, update, currentDraws);
    } catch (e) {
      console.error("Webhook error:", e);
    }
  });

  // API 6: 50期统计与预测 API
  app.get("/api/lottery/stats", (req, res) => {
    const stats = analyze50Draws(currentDraws);
    const pnl = calculateProfitAndLoss(currentDraws);
    const prediction = generate50DrawsPrediction(currentDraws);

    res.json({
      success: true,
      stats,
      pnl,
      prediction,
      drawsCount: currentDraws.length,
    });
  });

  // API 7: 智能预测 API
  app.get("/api/predict", (req, res) => {
    const pred = generate50DrawsPrediction(currentDraws);
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
          data: currentDraws,
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

近 50 期热号统计: ${JSON.stringify(analyze50Draws(currentDraws).hotNumbers)}
最新一期: ${JSON.stringify(currentDraws[0])}

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
