import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      service: "Lottery Prediction & Analytics Engine",
    });
  });

  // API Route: Gemini AI Lottery Pattern Analysis
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "未配置 GEMINI_API_KEY 环境变量，请在 AI Studio 设置面板中补充密钥。",
        });
      }

      const { lotteryName, drawHistory, latestDraw, focusNotes } = req.body;

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
你是一位精通概率论、数理统计与彩票数据分析的专业量化分析师。
请针对【${lotteryName || '双色球'}】近期的开奖历史数据进行客观、严谨的结构化盘析。

近期开奖示例数据（近10期）：
${JSON.stringify(drawHistory?.slice(0, 10) || [], null, 2)}

最新一期开奖结果：
${JSON.stringify(latestDraw || {}, null, 2)}

用户附加关注焦点：${focusNotes || '无特殊指定，全面客观分析'}

请按以下格式输出结构化分析报告（Markdown格式）：

### 一、 近期形态与分布特征
- **和值走势**：分析近期和值波动区间（如高位、低位或均衡）
- **奇偶比与大小比**：统计红球/前区的奇偶与大小分布偏向
- **热冷码分布**：列举近期极热码与长周期遗漏冷码

### 二、 极值与遗漏预警
- **遗漏拐点号**：识别达到或突破历史平均遗漏的潜在回补号码
- **连号与重号形态**：分析近期重号率与连号（如双连号、三连号）的走势倾向

### 三、 AI数理推荐关注区间（仅供娱乐与数理研究参考）
- **重点关注区间**：如红球/前区分段推荐范围（如一区、二区、三区重点）
- **推荐蓝球/后区**：给出2-3个高概率关注号
- **参考推荐组合（3组）**：给出3组结构均衡的精选号码组合

### 四、 理性购彩风险提示
- 提醒彩票开奖为独立随机事件，任何算法与预测均为概率统计参考，请理性娱乐，切勿沉迷。
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const analysisText = response.text || "无法生成分析报告，请稍后再试。";

      return res.json({
        success: true,
        report: analysisText,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Gemini analysis error:", err);
      return res.status(500).json({
        error: "AI盘析生成失败：" + (err.message || "未知错误"),
      });
    }
  });

  // Vite middleware for development
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
    console.log(`彩票预测系统服务已在端口 ${PORT} 启动 (http://localhost:${PORT})`);
  });
}

startServer();
