import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { generate50MacauDraws, getLatestDraws, MacauDrawItem } from "./src/server/lotteryEngine";
import { analyze50Draws, generate50DrawsPrediction, calculateProfitAndLoss, getWeeklyProfitAndLoss, generateAutomatedPushReport } from "./src/server/statsAlgorithm";
import { processTelegramMessage } from "./src/server/telegramBot";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // 内存缓存开奖记录 (保留最新3天，约1440期)
  let currentDraws: MacauDrawItem[] = await getLatestDraws();
  
  // 记录上一期已推送/已处理的开奖期号 (从文件读取或初始化)
  const lastPushedFile = path.join(process.cwd(), "last_pushed_issue.txt");
  let lastPushedIssue = "";
  if (fs.existsSync(lastPushedFile)) {
    try {
      lastPushedIssue = fs.readFileSync(lastPushedFile, "utf8").trim();
    } catch (e) {
      console.error("读取 last_pushed_issue.txt 失败:", e);
    }
  }

  // Telegram Bot 配置状态 (支持持久化到 telegram_config.json)
  const configPath = path.join(process.cwd(), "telegram_config.json");
  let telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "8902856799:AAGo7TyPEfp9bWRYidb_dbpUQJxjU7gkm3s",
    chatId: process.env.TELEGRAM_CHAT_ID || "-1004476090475",
    adminId: process.env.TELEGRAM_ADMIN_ID || "6147494498",
    autoPushEnabled: true,
    parseMode: "HTML",
  };
  if (fs.existsSync(configPath)) {
    try {
      const savedCfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
      telegramConfig = { ...telegramConfig, ...savedCfg };
    } catch (e) {
      console.error("读取 telegram_config.json 失败:", e);
    }
  }

  // Telegram Long Polling 与 Webhook 双模自愈守护引擎
  const offsetFile = path.join(process.cwd(), "telegram_offset.txt");
  let pollingOffset = 0;
  if (fs.existsSync(offsetFile)) {
    try {
      const savedOffset = parseInt(fs.readFileSync(offsetFile, "utf8").trim(), 10);
      if (!isNaN(savedOffset) && savedOffset > 0) {
        pollingOffset = savedOffset;
      }
    } catch (e) {}
  }

  let lastPollingHeartbeat = Date.now();
  let currentPollSessionId = 0;
  let activeAbortController: AbortController | null = null;
  let isPollingLoopRunning = false;
  let activeBotMode: "polling" | "webhook" = "polling";
  let pollingConsecutive409Count = 0;

  async function startTelegramPolling(forceRestart = false) {
    const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    if (!forceRestart) {
      try {
        const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
          signal: AbortSignal.timeout(5000),
        });
        const infoData = await infoRes.json();
        if (infoData.ok && infoData.result?.url) {
          activeBotMode = "webhook";
          console.log(`[Telegram] 检测到当前存在活跃 24/7 Webhook: ${infoData.result.url}，跳过本地轮询以保护生产环境。`);
          writeTelegramLog("模式检测", "success", `检测到活跃 24/7 Webhook: ${infoData.result.url}`, "保持 Webhook 模式运行，避免抢占冲突");
          return;
        }
      } catch (e) {}
    }

    if (activeBotMode === "webhook" && !forceRestart) {
      console.log("[Telegram] 当前处于 Webhook 直连模式，无需启动 Long Polling 轮询。");
      return;
    }

    // 中断上一个活跃轮询会话的 HTTP 连接
    if (activeAbortController) {
      try {
        activeAbortController.abort();
      } catch (e) {}
    }

    // 等待旧循环安全退出（最多等待 500ms）
    let waitCount = 0;
    while (isPollingLoopRunning && waitCount < 5) {
      await new Promise((r) => setTimeout(r, 100));
      waitCount++;
    }

    activeAbortController = new AbortController();
    currentPollSessionId++;
    const thisSessionId = currentPollSessionId;
    activeBotMode = "polling";
    isPollingLoopRunning = true;
    lastPollingHeartbeat = Date.now();

    console.log(`[Telegram Polling] 启动守护轮询 (Session #${thisSessionId}, Offset: ${pollingOffset})...`);
    writeTelegramLog("Polling启动", "success", `启动 Telegram 守护轮询 (Session #${thisSessionId})`, `初始 Offset: ${pollingOffset}`);

    const pollLoop = async () => {
      while (thisSessionId === currentPollSessionId) {
        lastPollingHeartbeat = Date.now();
        try {
          const currentToken = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
          if (!currentToken) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }

          // 单次请求设置 25 秒超时 (Telegram API timeout 为 15 秒)
          const timeoutSignal = AbortSignal.timeout(25000);

          const allowedUpdatesParam = encodeURIComponent(
            JSON.stringify(["message", "edited_message", "channel_post", "edited_channel_post", "callback_query"])
          );

          const res = await fetch(
            `https://api.telegram.org/bot${currentToken}/getUpdates?offset=${pollingOffset}&timeout=15&allowed_updates=${allowedUpdatesParam}`,
            { signal: timeoutSignal }
          );

          if (thisSessionId !== currentPollSessionId) break;

          const data = await res.json();
          lastPollingHeartbeat = Date.now();

          if (data.ok && Array.isArray(data.result)) {
            pollingConsecutive409Count = 0;
            for (const update of data.result) {
              if (thisSessionId !== currentPollSessionId) break;
              pollingOffset = Math.max(pollingOffset, update.update_id + 1);
              try {
                fs.writeFileSync(offsetFile, String(pollingOffset), "utf8");
              } catch (e) {}

              try {
                writeTelegramLog("Polling收到消息", "success", `收到更新 ID: ${update.update_id}`, JSON.stringify(update, null, 2));
                await processTelegramMessage(currentToken, update, currentDraws);
              } catch (err: any) {
                console.error("[Telegram Polling] 处理消息出错:", err);
                writeTelegramLog("Polling处理异常", "error", `处理消息出错: ${err.message}`, err.stack || "");
              }
            }
          } else if (data.error_code === 409) {
            const desc = data.description || "";
            // 如果提示 Webhook 激活冲突，自动清除冲突的 Webhook，保持轮询无缝运行
            if (desc.includes("webhook is active")) {
              console.warn("[Telegram Polling] 检测到 24/7 Webhook 正在运行，切换至 Webhook 模式，停止本地轮询...");
              writeTelegramLog("模式切换", "success", "检测到已绑定 24/7 生产 Webhook，本地自动转入 Webhook 模式", desc);
              activeBotMode = "webhook";
              isPollingLoopRunning = false;
              break;
            } else {
              pollingConsecutive409Count++;
              const backoffSec = Math.min(6, 2 + pollingConsecutive409Count);
              console.warn(`[Telegram Polling] 检测到 409 实例冲突 (${desc})，等待 ${backoffSec} 秒冷却重试...`);
              await new Promise((r) => setTimeout(r, backoffSec * 1000));
            }
          } else {
            // 其他 API 返回，停顿 1 秒后继续
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (e: any) {
          if (thisSessionId !== currentPollSessionId) break;
          // 网络抖动、超时或瞬态中断：坚决不退出循环，更新心跳并 1 秒后自动继续！
          lastPollingHeartbeat = Date.now();
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      isPollingLoopRunning = false;
    };

    pollLoop();
  }

  // 智能自适应模式检测：启动时检查是否存在活跃 Webhook，若存在则进入 Webhook 守护模式，绝不随意清除生产 Webhook
  async function detectAndInitTelegramMode() {
    const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        signal: AbortSignal.timeout(5000),
      });
      const infoData = await infoRes.json();
      if (infoData.ok && infoData.result?.url) {
        activeBotMode = "webhook";
        console.log(`[Telegram] 检测到活跃 24/7 Webhook (${infoData.result.url})，保持 Webhook 模式，不抢占生产环境。`);
        writeTelegramLog("模式检测", "success", `检测到活跃 24/7 Webhook: ${infoData.result.url}`, "保持生产 Webhook 模式运行");
        return;
      }
    } catch (e) {}

    activeBotMode = "polling";
    startTelegramPolling();
  }

  detectAndInitTelegramMode();

  // Watchdog 看门狗：每 10 秒巡检一次，仅在 polling 轮询模式下检测并无缝自愈（Webhook 模式无需轮询）
  setInterval(async () => {
    const now = Date.now();
    const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (token && activeBotMode === "polling" && (!isPollingLoopRunning || now - lastPollingHeartbeat > 35000)) {
      console.warn(`[Telegram Watchdog] 检测到 Polling 停滞或心跳超时 (${Math.round((now - lastPollingHeartbeat) / 1000)}s)，自动唤醒自愈重启...`);
      writeTelegramLog("看门狗自动自愈", "error", "检测到 Polling 停滞或心跳超时，自动重启监听进程", `无心跳时间: ${Math.round((now - lastPollingHeartbeat) / 1000)}秒`);
      startTelegramPolling(true);
    }
  }, 10000);

  // Keep-Alive 心跳：每 20 秒自检一次，保持 Node.js 事件循环活跃并防止空闲休眠
  setInterval(() => {
    fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(3000) }).catch(() => {});
  }, 20000);

  // 每 1 分钟自动拉取最新开奖记录，检查期号是否有更新，仅在新期号产生时才预测并推送
  setInterval(async () => {
    const freshDraws = await getLatestDraws();
    if (!freshDraws || freshDraws.length === 0) return;

    const latestIssue = freshDraws[0].expect;

    // 如果获取到的仍是旧的开奖记录，且上一次推送已成功，不运行预测与推送
    if (latestIssue === lastPushedIssue) {
      return;
    }

    // 发现新的开奖期号！更新全局缓存
    const map = new Map(currentDraws.map(d => [d.expect, d]));
    freshDraws.forEach(d => map.set(d.expect, d));
    currentDraws = Array.from(map.values()).sort((a, b) => b.expect.localeCompare(a.expect)).slice(0, 1440);

    // 如果未配置 Telegram 自动推送，则直接标记该期为已处理
    if (!telegramConfig.autoPushEnabled || !telegramConfig.botToken || !telegramConfig.chatId) {
      lastPushedIssue = latestIssue;
      try {
        fs.writeFileSync(lastPushedFile, latestIssue, "utf8");
      } catch (e) {
        console.error("写入 last_pushed_issue.txt 失败:", e);
      }
      return;
    }

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
        lastPushedIssue = latestIssue; // 只有在真正成功推送后，才标记该期已处理
        try {
          fs.writeFileSync(lastPushedFile, latestIssue, "utf8");
        } catch (e) {
          console.error("写入 last_pushed_issue.txt 失败:", e);
        }
        console.log(`[自动推送成功] 检测到新开奖 [第 ${latestIssue} 期]，已推送到 ${telegramConfig.chatId}`);
      } else {
        console.warn(`[自动推送重试] HTML发送失败 (${tgData.description})，使用纯文本降级重发...`);
        const plainText = reportText.replace(/<[^>]*>/g, '');
        const plainRes = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramConfig.chatId,
            text: plainText,
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const plainData = await plainRes.json();
        if (plainData.ok) {
          lastPushedIssue = latestIssue;
          try { fs.writeFileSync(lastPushedFile, latestIssue, "utf8"); } catch (e) {}
          console.log(`[自动推送成功 - 降级纯文本] 检测到新开奖 [第 ${latestIssue} 期] 已推送到群组`);
        } else {
          console.error(`[自动推送失败] 检测到新开奖 [第 ${latestIssue} 期]，Telegram 报错:`, tgData.description);
        }
      }
    } catch (err: any) {
      console.error(`[自动推送异常] 检测到新开奖 [第 ${latestIssue} 期]，但网络超时或发生错误:`, err.message);
    }
  }, 60000); // 1分钟 (60000ms)


  // 辅助写入 Telegram 调试日志
  const writeTelegramLog = (type: string, status: "success" | "error", message: string, detail: string) => {
    try {
      const logFile = path.join(process.cwd(), "telegram_logs.json");
      let logs: any[] = [];
      if (fs.existsSync(logFile)) {
        try {
          logs = JSON.parse(fs.readFileSync(logFile, "utf8")) || [];
        } catch (e) {}
      }
      const logItem = {
        id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        type,
        status,
        message,
        detail,
      };
      logs.unshift(logItem);
      if (logs.length > 100) logs = logs.slice(0, 100);
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf8");
    } catch (e) {
      console.error("写入 telegram_logs.json 失败:", e);
    }
  };

  // API 4.9: 健康保活探针
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      activeBotMode,
      isPollingLoopRunning,
      pollingOffset,
      lastHeartbeat: new Date(lastPollingHeartbeat).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      drawsCount: currentDraws.length,
      lastPushedIssue,
      uptime: Math.round(process.uptime()),
    });
  });

  // API 5: Telegram Webhook 路由处理 (接收用户消息与按钮交互)
  app.post("/api/telegram/webhook", async (req, res) => {
    res.status(200).send("OK");
    try {
      const update = req.body;
      if (!update) return;

      const msg = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
      if (!msg && !update.callback_query) return;

      const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      // 收到 Webhook 证实当前处于 Webhook 模式，停止冲突轮询
      if (activeBotMode !== "webhook") {
        activeBotMode = "webhook";
        if (activeAbortController) {
          try { activeAbortController.abort(); } catch (e) {}
        }
      }

      const chatOrUserId = msg?.chat?.id || update?.callback_query?.message?.chat?.id || "未知";
      const userText = msg?.text || msg?.caption || update?.callback_query?.data || "点击按钮";
      
      writeTelegramLog("Webhook收到消息", "success", `收到来自 [${chatOrUserId}] 的指令: ${userText}`, JSON.stringify(update, null, 2));

      await processTelegramMessage(token, update, currentDraws);
    } catch (e: any) {
      console.error("Webhook error:", e);
      writeTelegramLog("Webhook处理异常", "error", `处理 Webhook 指令出错: ${e.message}`, e.stack || "");
    }
  });

  // API 5.1: Telegram 绑定 Webhook API
  app.post("/api/telegram/set-webhook", async (req, res) => {
    try {
      const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        return res.status(400).json({ success: false, error: "未配置 TELEGRAM_BOT_TOKEN" });
      }

      let webhookUrl = req.body?.webhookUrl;
      if (!webhookUrl) {
        const host = req.get("host") || "localhost:3000";
        const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
        webhookUrl = `${protocol}://${host}/api/telegram/webhook`;
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, drop_pending_updates: false }),
        signal: AbortSignal.timeout(8000),
      });

      const tgData = await tgRes.json();
      if (tgData.ok) {
        activeBotMode = "webhook";
        if (activeAbortController) {
          try { activeAbortController.abort(); } catch (e) {}
        }
        writeTelegramLog("绑定Webhook", "success", `成功绑定 Webhook 到: ${webhookUrl}`, JSON.stringify(tgData, null, 2));
        return res.json({
          success: true,
          message: `Webhook 绑定成功！已切换至 Webhook 极速直连模式: ${webhookUrl}`,
          webhookUrl,
          telegramResponse: tgData,
          mode: "webhook",
        });
      } else {
        writeTelegramLog("绑定Webhook", "error", `绑定 Webhook 失败: ${tgData.description}`, JSON.stringify(tgData, null, 2));
        return res.json({
          success: false,
          error: tgData.description || "Telegram API 绑定报错",
          webhookUrl,
          telegramResponse: tgData,
        });
      }
    } catch (err: any) {
      writeTelegramLog("绑定Webhook异常", "error", "绑定 Webhook 时发生网络或超时异常", err.message);
      return res.status(500).json({ success: false, error: "网络请求异常: " + err.message });
    }
  });

  // API 5.2: Telegram 查询当前 Webhook 绑定状态 API
  app.get("/api/telegram/webhook-info", async (req, res) => {
    try {
      const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        return res.status(400).json({ success: false, error: "未配置 TELEGRAM_BOT_TOKEN" });
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        signal: AbortSignal.timeout(8000),
      });
      const tgData = await tgRes.json();

      if (tgData.ok) {
        const isWebhookActive = !!tgData.result?.url;
        return res.json({
          success: true,
          result: tgData.result,
          activeBotMode,
          isWebhookActive,
          pollingActive: activeBotMode === "polling" && isPollingLoopRunning && (Date.now() - lastPollingHeartbeat) < 75000,
        });
      } else {
        return res.status(400).json({ success: false, error: tgData.description || "获取 Webhook 状态失败" });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 5.3: Telegram 删除 Webhook 并切换至 Long Polling
  app.post("/api/telegram/delete-webhook", async (req, res) => {
    try {
      const token = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        return res.status(400).json({ success: false, error: "未配置 TELEGRAM_BOT_TOKEN" });
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
      });
      const tgData = await tgRes.json();

      if (tgData.ok) {
        activeBotMode = "polling";
        writeTelegramLog("清除Webhook", "success", "成功清除 Webhook，已转入 Long Polling 实时轮询模式", JSON.stringify(tgData, null, 2));
        startTelegramPolling(true);
        return res.json({ 
          success: true, 
          message: "Webhook 已清除，已自动启动实时 Long Polling 守护轮询！", 
          telegramResponse: tgData,
          mode: "polling"
        });
      } else {
        return res.status(400).json({ success: false, error: tgData.description || "清除 Webhook 失败" });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 6: 50期统计与预测 API
  app.get("/api/lottery/stats", (req, res) => {
    const stats = analyze50Draws(currentDraws);
    const pnl = calculateProfitAndLoss(currentDraws);
    const weekly = getWeeklyProfitAndLoss(currentDraws);
    const prediction = generate50DrawsPrediction(currentDraws);

    res.json({
      success: true,
      stats,
      pnl,
      weekly,
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

  // API 10: Telegram 诊断配置与日志查询接口
  app.get("/api/telegram/status", (req, res) => {
    const logFile = path.join(process.cwd(), "telegram_logs.json");
    let logs: any[] = [];
    if (fs.existsSync(logFile)) {
      try {
        logs = JSON.parse(fs.readFileSync(logFile, "utf8")) || [];
      } catch (e) {
        console.error("读取 log_file 失败:", e);
      }
    }

    const token = telegramConfig.botToken || "";
    const maskedToken = token.length > 10 
      ? token.substring(0, 10) + "..." + token.substring(token.length - 5)
      : "未配置";

    res.json({
      success: true,
      config: {
        botToken: maskedToken,
        chatId: telegramConfig.chatId,
        adminId: telegramConfig.adminId,
        autoPushEnabled: telegramConfig.autoPushEnabled,
      },
      lastPushedIssue,
      activeBotMode,
      pollingStatus: {
        lastHeartbeat: new Date(lastPollingHeartbeat).toLocaleTimeString("zh-CN"),
        aliveSecondsAgo: Math.round((Date.now() - lastPollingHeartbeat) / 1000),
        sessionId: currentPollSessionId,
        activeBotMode,
        isRunning: isPollingLoopRunning,
        pollingOffset,
      },
      logs: logs.slice(0, 30), // 返回最近30条记录
    });
  });

  // API 10.1: 更新 Telegram 配置并持久化
  app.post("/api/telegram/config", (req, res) => {
    try {
      const { botToken, chatId, adminId, autoPushEnabled } = req.body;
      if (botToken !== undefined && typeof botToken === "string" && botToken.trim()) {
        telegramConfig.botToken = botToken.trim();
      }
      if (chatId !== undefined && typeof chatId === "string") {
        telegramConfig.chatId = chatId.trim();
      }
      if (adminId !== undefined && typeof adminId === "string") {
        telegramConfig.adminId = adminId.trim();
      }
      if (autoPushEnabled !== undefined) {
        telegramConfig.autoPushEnabled = !!autoPushEnabled;
      }

      fs.writeFileSync(configPath, JSON.stringify(telegramConfig, null, 2), "utf8");
      if (activeBotMode === "polling") {
        startTelegramPolling(true);
      }

      res.json({
        success: true,
        message: "配置已保存并已自动应用！",
        config: {
          botToken: telegramConfig.botToken.length > 10 ? telegramConfig.botToken.substring(0, 10) + "..." : "未配置",
          chatId: telegramConfig.chatId,
          adminId: telegramConfig.adminId,
          autoPushEnabled: telegramConfig.autoPushEnabled,
        },
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // API 10.2: 手动强制重启 Polling 监听守护进程
  app.post("/api/telegram/restart-polling", async (req, res) => {
    activeBotMode = "polling";
    await startTelegramPolling(true);
    res.json({
      success: true,
      message: "已成功发送重启指令，Telegram 守护进程已重新拉起！",
      sessionId: currentPollSessionId,
      activeBotMode,
    });
  });

  // API 11: Telegram 手动强制测试推送诊断接口
  app.post("/api/telegram/test-push", async (req, res) => {
    try {
      const token = telegramConfig.botToken;
      const chatId = telegramConfig.chatId;

      if (!token || !chatId) {
        return res.status(400).json({
          success: false,
          error: "未配置 Telegram Bot Token 或 Chat ID！请检查配置。",
        });
      }

      if (currentDraws.length === 0) {
        return res.status(500).json({
          success: false,
          error: "系统缓存没有可用的开奖记录，无法生成预测推送报表。",
        });
      }

      const latestIssue = currentDraws[0].expect;
      const reportText = generateAutomatedPushReport(currentDraws);

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reportText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const httpCode = tgRes.status;
      const tgData = await tgRes.json();

      const logFile = path.join(process.cwd(), "telegram_logs.json");
      let logs: any[] = [];
      if (fs.existsSync(logFile)) {
        try {
          logs = JSON.parse(fs.readFileSync(logFile, "utf8")) || [];
        } catch (e) {}
      }

      const logId = "log_" + Date.now();
      const logItem = {
        id: logId,
        time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        type: "手动测试推送",
        status: tgData.ok ? "success" : "error",
        message: tgData.ok 
          ? `手动测试推送成功 [第 ${latestIssue} 期] 到频道`
          : `手动测试推送失败 [第 ${latestIssue} 期]，错误代码 ${httpCode}`,
        detail: tgData.ok ? reportText : `HTTP: ${httpCode} | Description: ${tgData.description}`,
      };

      logs.unshift(logItem);
      if (logs.length > 100) logs = logs.slice(0, 100);
      try {
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf8");
      } catch (e) {}

      if (tgData.ok) {
        lastPushedIssue = latestIssue;
        try {
          fs.writeFileSync(lastPushedFile, latestIssue, "utf8");
        } catch (e) {}

        return res.json({
          success: true,
          message: `测试推送成功！已向频道 ${chatId} 发送第 ${latestIssue} 期预测报表。`,
          telegramResponse: tgData,
          reportText,
        });
      } else {
        return res.json({
          success: false,
          error: tgData.description || `Telegram API 报错: Code ${httpCode}`,
          telegramResponse: tgData,
          reportText,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "网络请求异常: " + err.message,
      });
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
