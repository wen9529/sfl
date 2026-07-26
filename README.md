# 🎰 彩票开奖预测与数理分析系统 (Lottery Prediction & Analytics Engine)

![Version](https://img.shields.io/badge/version-2.5%20Pro-rose)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-green)
![Serv00 Compatible](https://img.shields.io/badge/deployment-Serv00%20FreeBSD-indigo)

一套基于 **React + TypeScript + Express + Tailwind CSS** 构建的专业级彩票历史数据分析、多维走势图表、热冷号与极值遗漏矩阵、多模型数理预测（马尔可夫链、蒙特卡洛模拟、胆拖过滤）以及 **Gemini 2.5 AI 大模型** 智能深度盘析系统。专为 Serv00 FreeBSD 虚拟主机与 Cloud Run / Node.js 生产环境深度优化。

---

## 🌟 核心功能特色

### 1. 📊 多维走势图表与遗漏矩阵
- **五大彩种支持**：福利彩票双色球 (SSQ)、体育彩票大乐透 (DLT)、福彩 3D、排列三 (PL3)、快乐 8 (KL8)。
- **折线图与柱状图**：和值波动曲线、推荐均衡区间、振幅跨度、AC 复杂度以及历史出号频次柱状图（Recharts 驱动）。
- **冷热遗漏分布矩阵**：实时统计当前遗漏期数、历史最大遗漏与平均遗漏，高亮长周期突破拐点号。

### 2. 🤖 Gemini AI 大模型专家盘析
- 集成 Google **Gemini 2.5 Flash** 算法模型，结合近 10 期开奖形态、奇偶比、大小比与和值偏向，一键生成结构化专家分析报告。

### 3. ⚡ 5 大数理预测模型
- **热温概率加权算法**：结合出号频次分布进行权重加权抽样。
- **极值遗漏回补算法**：捕获突破历史平均遗漏的潜在拐点号码。
- **马尔可夫状态转移矩阵**：计算上一期中奖号码对本期号位的条件转移概率。
- **蒙特卡洛万次模拟算法**：3,000+ 次独立随机收敛抽样，提取高重合度组合。
- **聪明缩水与自定义过滤**：支持指定和值区间、奇偶比例限制、排除连号与胆码锁定。

### 4. 🛡️ 历史策略模拟回测器
- 支持将预测号或自定义选号组合放入历史样本（如近 30/50 期）中执行买入测试，计算综合中奖率、返奖倍数与分等中奖明细。

### 5. 🛠️ Serv00 一键部署集成
- 内置针对 **Serv00 FreeBSD 虚拟主机** 的一键部署脚本生成器（`deploy-serv00.sh`）与 Devil CLI 自动化环境配置。

---

## 🚀 本地开发与运行

### 1. 克隆仓库与安装依赖
```bash
git clone https://github.com/your-username/lottery-predict-app.git
cd lottery-predict-app
npm install
```

### 2. 配置环境变量
在项目根目录创建 `.env` 文件：
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY="你的_GEMINI_API_KEY"
```

### 3. 启动开发服务器
```bash
npm run dev
```
访问 http://localhost:3000 即可使用。

---

## 🌐 部署至 Serv00 FreeBSD 主机

本项目完全兼容 Serv00 FreeBSD 虚拟主机环境。

### 方法一：使用自动化部署脚本（推荐）
1. SSH 登录 Serv00 服务器：
```bash
ssh username@panelX.serv00.com
```

2. 克隆你的 GitHub 仓库并运行内置的部署脚本：
```bash
git clone https://github.com/your-username/lottery-predict-app.git
cd lottery-predict-app
chmod +x deploy-serv00.sh
./deploy-serv00.sh lottery.yourdomain.serv00.net 25432 node20
```

### 方法二：Serv00 手动命令步骤
```bash
# 1. 开启 Serv00 域名 Node.js 支持
devil www options lottery.yourdomain.serv00.net nodejs /usr/local/bin/node20

# 2. 开放 TCP 端口
devil port add tcp 25432

# 3. 编译并使用 PM2 启动
npm install
npm run build
pm2 start dist/server.cjs --name "lottery-app"
```

---

## 📁 项目目录结构

```
├── deploy-serv00.sh          # Serv00 自动化部署 Shell 脚本
├── server.ts                 # Express + Vite 兼顾后端与 API 服务
├── src/
│   ├── components/           # UI 组件库
│   │   ├── Header.tsx        # 顶部导航与彩种切换
│   │   ├── OverviewStats.tsx # 最新开奖速览与指标看板
│   │   ├── TrendCharts.tsx   # Recharts 走势图表
│   │   ├── OmissionTable.tsx # 遗漏矩阵与冷热数据表
│   │   ├── PredictionPanel.tsx # 5 大算法预测引擎
│   │   ├── GeminiAIAdvisor.tsx # Gemini AI 大模型分析
│   │   ├── BacktestTool.tsx  # 策略回测器
│   │   ├── Serv00DeploymentModal.tsx # Serv00 部署指引
│   │   └── RecordManager.tsx # 历史数据录入与 JSON 导出
│   ├── data/
│   │   └── mockLotteryData.ts # 彩种参数与历史开奖基准数据
│   ├── utils/
│   │   └── lotteryAlgorithms.ts # 核心数理统计与预测模型
│   ├── types.ts              # TypeScript 类型定义
│   └── App.tsx               # 主应用入口
├── package.json              # 项目依赖与构建脚本
└── vite.config.ts            # Vite 构建配置
```

---

## ⚠️ 理性购彩提示与免责声明

彩票开奖结果属于独立的随机概率事件。本软件所包含的热冷号分析、遗漏统计、马尔可夫链模型及 Gemini AI 盘析均属于概率数理建模与学术娱乐研究，不构成任何投注中奖承诺或投资建议。请理性对待彩票，切勿沉迷。
