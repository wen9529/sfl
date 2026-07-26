export type LotteryKind = 'macaujc3';

export interface LotteryConfig {
  id: LotteryKind;
  name: string;
  shortName: string;
  description: string;
  redCount: number;      // 6 for regular balls (平码1-6)
  redMax: number;        // 49
  blueCount: number;     // 1 for special ball (特码)
  blueMax: number;       // 49
  drawDays: string;      // "每 3 分钟开奖"
  rules: {
    sumRange: [number, number];
    recommendedOddEvenRatio: string;
  };
}

export interface DrawRecord {
  issue: string;         // e.g. "20250504348"
  date: string;          // e.g. "2025-05-04 17:21:00"
  redBalls: number[];    // 平码1~6 [20, 40, 23, 9, 27, 14]
  blueBalls: number[];   // 特码 [18]
  waves?: string[];      // ["blue", "red", "red", "blue", "green", "blue", "red"]
  zodiacs?: string[];    // ["狗", "虎", "羊", "雞", "兔", "龍", "鼠"]
  rawOpenCode?: string;  // "20,40,23,09,27,14,18"
  sales?: string;
  poolMoney?: string;
}

export interface BallFrequency {
  number: number;
  count: number;
  frequency: number; // 0 to 1
  currentOmission: number;
  maxOmission: number;
  avgOmission: number;
  waveColor: 'red' | 'blue' | 'green';
  status: 'hot' | 'warm' | 'cold';
}

export interface DrawStats {
  issue: string;
  date: string;
  sumValue: number;
  oddEvenRatio: string; // e.g. "4:2"
  bigSmallRatio: string; // e.g. "3:3"
  acValue: number;
  span: number; // max - min
  specialBall?: number;
  specialWave?: string;
  specialZodiac?: string;
  redWaveCount?: number;
  blueWaveCount?: number;
  greenWaveCount?: number;
}

export interface PredictionResult {
  id: string;
  algorithm: 'frequency' | 'omission' | 'markov' | 'montecarlo' | 'ai' | 'custom';
  algorithmName: string;
  sizePred: '大' | '小';
  parityPred: '单' | '双';
  colorPred: '红波' | '蓝波' | '绿波';
  sizeOdds: number;
  parityOdds: number;
  colorOdds: number;
  confidenceScore: number; // 0 - 100
  rationale: string;
  tags: string[];
  createdAt: string;
  // Optional Legacy fields for ball displays
  redBalls?: number[];
  blueBalls?: number[];
}

export interface BacktestSummary {
  totalDrawsTested: number;
  totalRounds: number;
  totalBet: number;
  totalPayout: number;
  netProfit: number;
  roi: number;
  sizeHitRate: number;
  parityHitRate: number;
  colorHitRate: number;
  allThreeHits: number;
  maxStreak: number;
}

export interface FilterOptions {
  minSum: number;
  maxSum: number;
  oddCount: number | null; // e.g., 3 means 3 odd, 3 even
  bigCount: number | null; // threshold defined as > max/2
  preferredWave?: 'all' | 'red' | 'blue' | 'green';
  mustIncludeReds: number[];
  mustExcludeReds: number[];
  allowConsecutive: boolean;
}

export interface Serv00DeployConfig {
  domain: string;
  port: number;
  nodeVersion: string;
  appDir: string;
  geminiKey: string;
}

