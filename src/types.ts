export type LotteryKind = 'ssq' | 'dlt' | 'fc3d' | 'pl3' | 'kl8';

export interface LotteryConfig {
  id: LotteryKind;
  name: string;
  shortName: string;
  description: string;
  redCount: number;      // e.g., 6 for SSQ
  redMax: number;        // e.g., 33 for SSQ
  blueCount: number;     // e.g., 1 for SSQ
  blueMax: number;       // e.g., 16 for SSQ
  drawDays: string;      // e.g., "二、四、日"
  rules: {
    sumRange: [number, number];
    recommendedOddEvenRatio: string;
  };
}

export interface DrawRecord {
  issue: string;         // e.g. "2026088"
  date: string;          // e.g. "2026-07-20"
  redBalls: number[];
  blueBalls: number[];
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
  status: 'hot' | 'warm' | 'cold';
}

export interface DrawStats {
  issue: string;
  date: string;
  sumValue: number;
  oddEvenRatio: string; // e.g. "4:2"
  bigSmallRatio: string; // e.g. "3:3"
  acValue: number;
  span: number; // max red - min red
}

export interface PredictionResult {
  id: string;
  algorithm: 'frequency' | 'omission' | 'markov' | 'montecarlo' | 'ai' | 'custom';
  algorithmName: string;
  redBalls: number[];
  blueBalls: number[];
  confidenceScore: number; // 0 - 100
  rationale: string;
  tags: string[];
  createdAt: string;
}

export interface BacktestSummary {
  totalDrawsTested: number;
  totalTickets: number;
  winsLevel1: number;
  winsLevel2: number;
  winsLevel3: number;
  winsLevel4Plus: number;
  winRatePercent: number;
  totalCost: number;
  totalPrize: number;
  netReturnRatio: number;
}

export interface FilterOptions {
  minSum: number;
  maxSum: number;
  oddCount: number | null; // e.g., 3 means 3 odd, 3 even
  bigCount: number | null; // threshold defined as > max/2
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
