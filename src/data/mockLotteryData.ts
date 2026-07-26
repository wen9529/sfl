import { LotteryConfig, LotteryKind, DrawRecord } from '../types';

export const LOTTERY_CONFIGS: Record<LotteryKind, LotteryConfig> = {
  ssq: {
    id: 'ssq',
    name: '中国福利彩票·双色球',
    shortName: '双色球',
    description: '红球33选6 + 蓝球16选1，每周二、四、日开奖',
    redCount: 6,
    redMax: 33,
    blueCount: 1,
    blueMax: 16,
    drawDays: '每周二、四、日 21:15',
    rules: {
      sumRange: [60, 140],
      recommendedOddEvenRatio: '3:3 或 4:2',
    },
  },
  dlt: {
    id: 'dlt',
    name: '中国体育彩票·超级大乐透',
    shortName: '大乐透',
    description: '前区35选5 + 后区12选2，每周一、三、六开奖',
    redCount: 5,
    redMax: 35,
    blueCount: 2,
    blueMax: 12,
    drawDays: '每周一、三、六 21:25',
    rules: {
      sumRange: [50, 130],
      recommendedOddEvenRatio: '3:2 或 2:3',
    },
  },
  fc3d: {
    id: 'fc3d',
    name: '中国福利彩票·3D',
    shortName: '福彩3D',
    description: '百位、十位、个位各从0-9中选择1个数字，每日开奖',
    redCount: 3,
    redMax: 9, // Numbers 0 to 9
    blueCount: 0,
    blueMax: 0,
    drawDays: '每天 21:15',
    rules: {
      sumRange: [9, 18],
      recommendedOddEvenRatio: '2:1 或 1:2',
    },
  },
  pl3: {
    id: 'pl3',
    name: '中国体育彩票·排列三',
    shortName: '排列三',
    description: '从000-999中选择1个3位数，每日开奖',
    redCount: 3,
    redMax: 9,
    blueCount: 0,
    blueMax: 0,
    drawDays: '每天 21:25',
    rules: {
      sumRange: [9, 18],
      recommendedOddEvenRatio: '2:1 或 1:2',
    },
  },
  kl8: {
    id: 'kl8',
    name: '中国福利彩票·快乐8',
    shortName: '快乐8',
    description: '80选20，玩法多样，返奖率高，每日开奖',
    redCount: 20,
    redMax: 80,
    blueCount: 0,
    blueMax: 0,
    drawDays: '每天 21:30',
    rules: {
      sumRange: [700, 900],
      recommendedOddEvenRatio: '10:10',
    },
  },
};

// Helper to generate pseudorandom realistic draw history if needed
function generateSeedDrawsSSQ(): DrawRecord[] {
  const records: DrawRecord[] = [];
  const baseYear = 2026;
  const startIssue = 88;

  // Realistically distributed numbers for 30 issues
  const presetSSQ = [
    { reds: [2, 7, 12, 19, 24, 31], blue: [8] },
    { reds: [5, 11, 14, 22, 28, 33], blue: [15] },
    { reds: [1, 9, 16, 20, 25, 30], blue: [3] },
    { reds: [6, 10, 15, 18, 27, 32], blue: [12] },
    { reds: [3, 8, 13, 21, 26, 29], blue: [6] },
    { reds: [4, 12, 17, 23, 28, 31], blue: [10] },
    { reds: [7, 14, 19, 24, 27, 33], blue: [1] },
    { reds: [2, 6, 11, 18, 22, 29], blue: [14] },
    { reds: [9, 15, 20, 25, 30, 32], blue: [7] },
    { reds: [1, 5, 13, 16, 21, 28], blue: [11] },
    { reds: [8, 10, 17, 23, 26, 31], blue: [2] },
    { reds: [3, 7, 12, 19, 24, 30], blue: [9] },
    { reds: [4, 11, 15, 22, 27, 33], blue: [16] },
    { reds: [6, 14, 18, 20, 28, 32], blue: [5] },
    { reds: [2, 9, 13, 21, 25, 29], blue: [13] },
    { reds: [5, 10, 16, 23, 26, 31], blue: [4] },
    { reds: [1, 8, 12, 17, 24, 30], blue: [8] },
    { reds: [7, 11, 15, 19, 27, 33], blue: [15] },
    { reds: [3, 6, 14, 22, 28, 32], blue: [1] },
    { reds: [9, 13, 18, 20, 25, 29], blue: [10] },
    { reds: [4, 10, 17, 21, 26, 31], blue: [6] },
    { reds: [2, 8, 12, 16, 23, 28], blue: [12] },
    { reds: [5, 11, 15, 19, 24, 30], blue: [3] },
    { reds: [7, 9, 14, 22, 27, 33], blue: [14] },
    { reds: [1, 6, 13, 18, 25, 32], blue: [9] },
    { reds: [3, 10, 16, 20, 26, 29], blue: [16] },
    { reds: [8, 12, 17, 21, 28, 31], blue: [7] },
    { reds: [4, 7, 15, 23, 27, 30], blue: [2] },
    { reds: [2, 11, 14, 19, 24, 33], blue: [11] },
    { reds: [6, 9, 18, 22, 26, 32], blue: [5] },
  ];

  presetSSQ.forEach((item, index) => {
    const issueNum = startIssue - index;
    const issueStr = `${baseYear}${issueNum.toString().padStart(3, '0')}`;
    const date = new Date(2026, 6, 20 - index * 2).toISOString().split('T')[0];
    records.push({
      issue: issueStr,
      date,
      redBalls: item.reds,
      blueBalls: item.blue,
      sales: `${(38000 + (index * 123) % 2000).toLocaleString()}万元`,
      poolMoney: `${(210000 + (index * 4321) % 50000).toLocaleString()}万元`,
    });
  });

  return records;
}

function generateSeedDrawsDLT(): DrawRecord[] {
  const records: DrawRecord[] = [];
  const baseYear = 2026;
  const startIssue = 88;

  const presetDLT = [
    { reds: [3, 11, 18, 25, 32], blue: [4, 9] },
    { reds: [1, 8, 15, 22, 34], blue: [2, 11] },
    { reds: [6, 12, 19, 27, 30], blue: [5, 8] },
    { reds: [2, 9, 14, 23, 31], blue: [1, 10] },
    { reds: [7, 10, 17, 26, 35], blue: [3, 12] },
    { reds: [4, 13, 20, 24, 29], blue: [6, 7] },
    { reds: [5, 11, 16, 28, 33], blue: [4, 9] },
    { reds: [8, 15, 21, 25, 30], blue: [2, 8] },
    { reds: [2, 7, 12, 18, 34], blue: [1, 11] },
    { reds: [9, 14, 22, 27, 31], blue: [5, 10] },
    { reds: [3, 10, 19, 26, 32], blue: [3, 6] },
    { reds: [6, 13, 17, 23, 35], blue: [7, 12] },
    { reds: [1, 8, 16, 24, 28], blue: [4, 8] },
    { reds: [5, 12, 20, 29, 33], blue: [2, 9] },
    { reds: [4, 11, 15, 21, 30], blue: [1, 11] },
  ];

  presetDLT.forEach((item, index) => {
    const issueNum = startIssue - index;
    const issueStr = `${baseYear}${issueNum.toString().padStart(3, '0')}`;
    const date = new Date(2026, 6, 20 - index * 2).toISOString().split('T')[0];
    records.push({
      issue: issueStr,
      date,
      redBalls: item.reds,
      blueBalls: item.blue,
      sales: `${(29000 + (index * 231) % 1500).toLocaleString()}万元`,
      poolMoney: `${(110000 + (index * 3211) % 30000).toLocaleString()}万元`,
    });
  });

  return records;
}

function generateSeedDrawsFC3D(): DrawRecord[] {
  const records: DrawRecord[] = [];
  const baseYear = 2026;
  const startIssue = 188;

  const preset3D = [
    [3, 8, 2], [7, 1, 9], [0, 5, 4], [8, 8, 3], [2, 6, 1],
    [9, 4, 7], [5, 3, 0], [1, 7, 6], [8, 2, 9], [4, 0, 5],
    [6, 9, 3], [2, 1, 8], [7, 5, 4], [3, 3, 0], [9, 8, 1],
  ];

  preset3D.forEach((reds, index) => {
    const issueNum = startIssue - index;
    const issueStr = `${baseYear}${issueNum.toString().padStart(3, '0')}`;
    const date = new Date(2026, 6, 20 - index).toISOString().split('T')[0];
    records.push({
      issue: issueStr,
      date,
      redBalls: reds,
      blueBalls: [],
      sales: `${(4500 + (index * 88) % 500).toLocaleString()}万元`,
    });
  });

  return records;
}

function generateSeedDrawsPL3(): DrawRecord[] {
  const records: DrawRecord[] = [];
  const baseYear = 2026;
  const startIssue = 188;

  const presetPL3 = [
    [6, 2, 9], [1, 5, 8], [4, 0, 3], [7, 7, 2], [9, 3, 5],
    [0, 8, 1], [3, 4, 6], [8, 1, 7], [2, 9, 0], [5, 6, 4],
  ];

  presetPL3.forEach((reds, index) => {
    const issueNum = startIssue - index;
    const issueStr = `${baseYear}${issueNum.toString().padStart(3, '0')}`;
    const date = new Date(2026, 6, 20 - index).toISOString().split('T')[0];
    records.push({
      issue: issueStr,
      date,
      redBalls: reds,
      blueBalls: [],
      sales: `${(3200 + (index * 77) % 400).toLocaleString()}万元`,
    });
  });

  return records;
}

function generateSeedDrawsKL8(): DrawRecord[] {
  const records: DrawRecord[] = [];
  const baseYear = 2026;
  const startIssue = 188;

  for (let i = 0; i < 10; i++) {
    const issueNum = startIssue - i;
    const issueStr = `${baseYear}${issueNum.toString().padStart(3, '0')}`;
    const date = new Date(2026, 6, 20 - i).toISOString().split('T')[0];
    // Pick 20 unique random sorted numbers between 1 and 80
    const nums: number[] = [];
    while (nums.length < 20) {
      const n = Math.floor(Math.random() * 80) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    nums.sort((a, b) => a - b);
    records.push({
      issue: issueStr,
      date,
      redBalls: nums,
      blueBalls: [],
      sales: `${(8900 + (i * 120) % 800).toLocaleString()}万元`,
    });
  }

  return records;
}

export const INITIAL_MOCK_DATA: Record<LotteryKind, DrawRecord[]> = {
  ssq: generateSeedDrawsSSQ(),
  dlt: generateSeedDrawsDLT(),
  fc3d: generateSeedDrawsFC3D(),
  pl3: generateSeedDrawsPL3(),
  kl8: generateSeedDrawsKL8(),
};
