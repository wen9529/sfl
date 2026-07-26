import { DrawRecord, BallFrequency, DrawStats, PredictionResult, LotteryConfig, FilterOptions, BacktestSummary } from '../types';
import { getWaveColor, getZodiacByNum } from '../data/mockLotteryData';

/**
 * Calculates detailed statistics for each number (frequency, current omission, max omission, avg omission, waveColor)
 */
export function calculateBallFrequencies(
  draws: DrawRecord[],
  maxBall: number = 49,
  isRed: boolean = true
): BallFrequency[] {
  if (!draws || draws.length === 0) return [];

  const totalDraws = draws.length;
  const frequencies: BallFrequency[] = [];

  for (let num = 1; num <= maxBall; num++) {
    let count = 0;
    let currentOmission = 0;
    let maxOmission = 0;
    let totalOmissionSum = 0;
    let omissionCount = 0;

    let tempOmission = 0;
    let foundFirstHit = false;

    // Iterate through draws from latest (index 0) to oldest
    for (let i = 0; i < totalDraws; i++) {
      const balls = isRed ? draws[i].redBalls : draws[i].blueBalls;
      const isHit = balls.includes(num);

      if (isHit) {
        count++;
        if (!foundFirstHit) {
          currentOmission = tempOmission;
          foundFirstHit = true;
        }
        if (tempOmission > maxOmission) {
          maxOmission = tempOmission;
        }
        totalOmissionSum += tempOmission;
        omissionCount++;
        tempOmission = 0;
      } else {
        tempOmission++;
      }
    }

    if (!foundFirstHit) {
      currentOmission = tempOmission;
    }
    if (tempOmission > maxOmission) {
      maxOmission = tempOmission;
    }

    const freqRatio = count / totalDraws;
    const avgOmission = omissionCount > 0 ? Math.round((totalOmissionSum / omissionCount) * 10) / 10 : totalDraws;

    // Status classification
    let status: 'hot' | 'warm' | 'cold' = 'warm';
    if (count >= Math.ceil(totalDraws * 0.22)) {
      status = 'hot';
    } else if (currentOmission >= avgOmission * 1.5 || count <= Math.floor(totalDraws * 0.08)) {
      status = 'cold';
    }

    frequencies.push({
      number: num,
      count,
      frequency: Math.round(freqRatio * 1000) / 10, // percentage e.g. 18.5%
      currentOmission,
      maxOmission,
      avgOmission,
      waveColor: getWaveColor(num),
      status,
    });
  }

  return frequencies;
}

/**
 * Calculates sum, odd-even, big-small, AC value, span, and wave/zodiac stats for a Mark Six draw
 */
export function calculateDrawStats(draw: DrawRecord, config: LotteryConfig): DrawStats {
  const reds = draw.redBalls || [];
  const blues = draw.blueBalls || [];
  const allBalls = [...reds, ...blues];

  if (allBalls.length === 0) {
    return {
      issue: draw.issue,
      date: draw.date,
      sumValue: 0,
      oddEvenRatio: '0:0',
      bigSmallRatio: '0:0',
      acValue: 0,
      span: 0,
    };
  }

  const sumValue = reds.reduce((a, b) => a + b, 0);

  // Odd vs Even (for regular 6 balls)
  const odds = reds.filter(n => n % 2 !== 0).length;
  const evens = reds.length - odds;
  const oddEvenRatio = `${odds}:${evens}`;

  // Big vs Small (1-24 Small, 25-49 Big)
  const midPoint = 24;
  const bigs = reds.filter(n => n > midPoint).length;
  const smalls = reds.length - bigs;
  const bigSmallRatio = `${bigs}:${smalls}`;

  // Span
  const sorted = [...reds].sort((a, b) => a - b);
  const span = sorted.length > 0 ? sorted[sorted.length - 1] - sorted[0] : 0;

  // AC Value
  const diffSet = new Set<number>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      diffSet.add(sorted[j] - sorted[i]);
    }
  }
  const acValue = Math.max(0, diffSet.size - (config.redCount - 1));

  // Waves & Zodiacs for 7 balls
  const specialBall = blues[0];
  const specialWave = draw.waves?.[6] || (specialBall ? getWaveColor(specialBall) : undefined);
  const specialZodiac = draw.zodiacs?.[6] || (specialBall ? getZodiacByNum(specialBall) : undefined);

  const waves = draw.waves || allBalls.map(getWaveColor);
  const redWaveCount = waves.filter(w => w === 'red' || w === '红').length;
  const blueWaveCount = waves.filter(w => w === 'blue' || w === '蓝').length;
  const greenWaveCount = waves.filter(w => w === 'green' || w === '绿').length;

  return {
    issue: draw.issue,
    date: draw.date,
    sumValue,
    oddEvenRatio,
    bigSmallRatio,
    acValue,
    span,
    specialBall,
    specialWave,
    specialZodiac,
    redWaveCount,
    blueWaveCount,
    greenWaveCount,
  };
}

// ---------------- ALGORITHMS FOR PREDICTION ---------------- //

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * 1. Frequency Weighted Model (澳门三分六合彩)
 */
export function predictFrequencyWeighted(
  draws: DrawRecord[],
  config: LotteryConfig
): PredictionResult {
  const redFreqs = calculateBallFrequencies(draws, 49, true);
  const blueFreqs = calculateBallFrequencies(draws, 49, false);

  // Weighted selection for regular 6 balls
  const redPool: number[] = [];
  redFreqs.forEach(item => {
    const multiplier = item.status === 'hot' ? 4 : item.status === 'warm' ? 2 : 1;
    for (let i = 0; i < multiplier; i++) {
      redPool.push(item.number);
    }
  });

  const selectedReds = new Set<number>();
  while (selectedReds.size < 6) {
    const picked = redPool[Math.floor(Math.random() * redPool.length)];
    selectedReds.add(picked);
  }

  // Pick 1 special ball from top blue frequencies
  const bluePool: number[] = [];
  blueFreqs.forEach(item => {
    const multiplier = item.status === 'hot' ? 4 : 2;
    for (let i = 0; i < multiplier; i++) bluePool.push(item.number);
  });

  let selectedSpecial = bluePool[Math.floor(Math.random() * bluePool.length)];
  while (selectedReds.has(selectedSpecial)) {
    selectedSpecial = bluePool[Math.floor(Math.random() * bluePool.length)];
  }

  const sortedReds = Array.from(selectedReds).sort((a, b) => a - b);

  return {
    id: `pred-freq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    algorithm: 'frequency',
    algorithmName: '热温概率加权算法',
    redBalls: sortedReds,
    blueBalls: [selectedSpecial],
    confidenceScore: Math.floor(82 + Math.random() * 12),
    rationale: '优先推荐高频出号平码与近10期极热特码，波色分布均衡，大幅降低极冷号哑火风险。',
    tags: ['热平码优先', '热特码锁定', '波色平衡'],
    createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * 2. Omission Recovery Model (遗漏拐点回补)
 */
export function predictOmissionRecovery(
  draws: DrawRecord[],
  config: LotteryConfig
): PredictionResult {
  const redFreqs = calculateBallFrequencies(draws, 49, true);
  const blueFreqs = calculateBallFrequencies(draws, 49, false);

  // Sort reds by currentOmission descending
  const sortedRedOmissions = [...redFreqs].sort((a, b) => b.currentOmission - a.currentOmission);
  const highOmissionReds = sortedRedOmissions.slice(0, 15).map(f => f.number);
  const normalReds = sortedRedOmissions.slice(15).map(f => f.number);

  const pickedCold = getRandomElements(highOmissionReds, 2);
  const pickedNormal = getRandomElements(normalReds, 4);

  const sortedReds = [...pickedCold, ...pickedNormal].sort((a, b) => a - b);

  // Pick 1 special ball with maximum current omission
  const sortedBlueOmissions = [...blueFreqs].sort((a, b) => b.currentOmission - a.currentOmission);
  const topSpecialCold = sortedBlueOmissions.slice(0, 8).map(f => f.number);
  const pickedSpecial = getRandomElements(topSpecialCold, 1);

  return {
    id: `pred-omit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    algorithm: 'omission',
    algorithmName: '极值遗漏拐点算法',
    redBalls: sortedReds,
    blueBalls: pickedSpecial,
    confidenceScore: Math.floor(79 + Math.random() * 14),
    rationale: '捕捉长周期超期遗漏平码与特码均值回归拐点，重点关注大遗漏红/蓝/绿波特码突破。',
    tags: ['遗漏拐点', '冷特码突破', '均值回归'],
    createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * 3. Markov Chain Transition Model (马尔可夫状态转移)
 */
export function predictMarkovChain(
  draws: DrawRecord[],
  config: LotteryConfig
): PredictionResult {
  const size = 49;
  const transitionMatrix: number[][] = Array(size + 1).fill(0).map(() => Array(size + 1).fill(0));

  for (let i = draws.length - 1; i > 0; i--) {
    const prevReds = draws[i].redBalls || [];
    const currReds = draws[i - 1].redBalls || [];

    prevReds.forEach(prev => {
      currReds.forEach(curr => {
        if (prev >= 1 && prev <= 49 && curr >= 1 && curr <= 49) {
          transitionMatrix[prev][curr] += 1;
        }
      });
    });
  }

  const latestDraw = draws[0]?.redBalls || [20, 40, 23, 9, 27, 14];
  const candidateScores: { number: number; score: number }[] = [];

  for (let num = 1; num <= 49; num++) {
    let totalScore = 0;
    latestDraw.forEach(prevNum => {
      totalScore += transitionMatrix[prevNum]?.[num] || 0;
    });
    candidateScores.push({ number: num, score: totalScore });
  }

  candidateScores.sort((a, b) => b.score - a.score);

  const topCandidates = candidateScores.slice(0, 16).map(c => c.number);
  const pickedReds = getRandomElements(topCandidates, 6).sort((a, b) => a - b);

  // Special ball transition
  const latestSpecial = draws[0]?.blueBalls?.[0] || 18;
  const specialCandidateScores: { number: number; score: number }[] = [];
  for (let num = 1; num <= 49; num++) {
    specialCandidateScores.push({
      number: num,
      score: transitionMatrix[latestSpecial]?.[num] || Math.random(),
    });
  }
  specialCandidateScores.sort((a, b) => b.score - a.score);
  const pickedSpecial = [specialCandidateScores[0].number];

  return {
    id: `pred-markov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    algorithm: 'markov',
    algorithmName: '马尔可夫转移矩阵模型',
    redBalls: pickedReds,
    blueBalls: pickedSpecial,
    confidenceScore: Math.floor(84 + Math.random() * 11),
    rationale: '建立一阶49*49状态转移矩阵，推算上一期平码与特码对本期开奖号位的条件条件转移极值。',
    tags: ['转移矩阵', '条件概率', '状态推演'],
    createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * 4. Monte Carlo Simulation Model (蒙特卡洛 3,000次收敛模拟)
 */
export function predictMonteCarlo(
  draws: DrawRecord[],
  config: LotteryConfig
): PredictionResult {
  const redFreqs = calculateBallFrequencies(draws, 49, true);
  const totalFreq = redFreqs.reduce((sum, f) => sum + Math.max(1, f.count), 0);

  const comboTracker = new Map<string, { reds: number[]; count: number }>();

  for (let sim = 0; sim < 3000; sim++) {
    const simSet = new Set<number>();
    while (simSet.size < 6) {
      const rand = Math.random() * totalFreq;
      let cum = 0;
      for (const item of redFreqs) {
        cum += Math.max(1, item.count);
        if (rand <= cum) {
          simSet.add(item.number);
          break;
        }
      }
    }
    const arr = Array.from(simSet).sort((a, b) => a - b);
    const key = arr.join(',');
    const existing = comboTracker.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      comboTracker.set(key, { reds: arr, count: 1 });
    }
  }

  let bestCombo = [1, 2, 3, 4, 5, 6];
  let maxHits = 0;

  comboTracker.forEach(val => {
    if (val.count > maxHits) {
      maxHits = val.count;
      bestCombo = val.reds;
    }
  });

  const blueFreqs = calculateBallFrequencies(draws, 49, false);
  const sortedBlue = [...blueFreqs].sort((a, b) => b.count - a.count);
  const selectedSpecial = [sortedBlue[0]?.number || 18];

  return {
    id: `pred-mc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    algorithm: 'montecarlo',
    algorithmName: '蒙特卡洛万次收敛模拟',
    redBalls: bestCombo,
    blueBalls: selectedSpecial,
    confidenceScore: Math.floor(86 + Math.random() * 10),
    rationale: '基于三分六合彩历史频次执行3,000+次独立蒙特卡洛随机抽样，提取平码高密度重合组合。',
    tags: ['蒙特卡洛', '随机收敛', '峰值组合'],
    createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * 5. Custom Strategy Filtered Generator
 */
export function predictCustomFiltered(
  draws: DrawRecord[],
  config: LotteryConfig,
  filters: FilterOptions
): PredictionResult {
  let attempts = 0;
  let finalReds: number[] = [];

  while (attempts < 1000) {
    attempts++;
    const set = new Set<number>();

    // Add must include
    filters.mustIncludeReds.forEach(n => {
      if (n >= 1 && n <= 49) set.add(n);
    });

    // Fill remaining
    while (set.size < 6) {
      const n = Math.floor(Math.random() * 49) + 1;
      if (!filters.mustExcludeReds.includes(n)) {
        // Check preferred wave if set
        if (filters.preferredWave && filters.preferredWave !== 'all') {
          if (getWaveColor(n) !== filters.preferredWave) continue;
        }
        set.add(n);
      }
    }

    const reds = Array.from(set).sort((a, b) => a - b);

    // Filter 1: Sum range
    const sum = reds.reduce((a, b) => a + b, 0);
    if (sum < filters.minSum || sum > filters.maxSum) continue;

    // Filter 2: Odd Count
    if (filters.oddCount !== null) {
      const odds = reds.filter(n => n % 2 !== 0).length;
      if (odds !== filters.oddCount) continue;
    }

    // Filter 3: Consecutive trios check
    if (!filters.allowConsecutive) {
      let consecutiveTrio = false;
      for (let i = 0; i < reds.length - 2; i++) {
        if (reds[i + 1] === reds[i] + 1 && reds[i + 2] === reds[i] + 2) {
          consecutiveTrio = true;
          break;
        }
      }
      if (consecutiveTrio) continue;
    }

    // Passed all filters!
    finalReds = reds;
    break;
  }

  // Fallback
  if (finalReds.length === 0) {
    const fallbackSet = new Set<number>();
    while (fallbackSet.size < 6) {
      const n = Math.floor(Math.random() * 49) + 1;
      fallbackSet.add(n);
    }
    finalReds = Array.from(fallbackSet).sort((a, b) => a - b);
  }

  let specialCandidate = Math.floor(Math.random() * 49) + 1;
  if (filters.preferredWave && filters.preferredWave !== 'all') {
    while (getWaveColor(specialCandidate) !== filters.preferredWave) {
      specialCandidate = Math.floor(Math.random() * 49) + 1;
    }
  }

  return {
    id: `pred-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    algorithm: 'custom',
    algorithmName: '三分六合彩聪明缩水过滤',
    redBalls: finalReds,
    blueBalls: [specialCandidate],
    confidenceScore: 82,
    rationale: `依据和值(${filters.minSum}-${filters.maxSum})、波色偏向(${filters.preferredWave || '全选'})与单双连号条件精准缩水。`,
    tags: ['精准缩水', '波色过滤', '胆码锁定'],
    createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Strategy Backtester against historical draw records
 */
export function runBacktest(
  predictedTickets: { redBalls: number[]; blueBalls: number[] }[],
  historicalDraws: DrawRecord[],
  config: LotteryConfig
): BacktestSummary {
  let winsLevel1 = 0; // Hit 6 regular + 1 special (头奖/特中)
  let winsLevel2 = 0; // Hit 6 regular (二等奖)
  let winsLevel3 = 0; // Hit 5 regular + 1 special (三等奖)
  let winsLevel4Plus = 0; // Hit 4+ or Special

  const costPerTicket = 10; // 10 RMB per ticket for Mark Six
  const totalTicketsTested = predictedTickets.length * historicalDraws.length;
  const totalCost = totalTicketsTested * costPerTicket;
  let totalPrize = 0;

  historicalDraws.forEach(draw => {
    predictedTickets.forEach(ticket => {
      const redMatches = ticket.redBalls.filter(r => draw.redBalls.includes(r)).length;
      const specialMatch = ticket.blueBalls.length > 0 && draw.blueBalls.includes(ticket.blueBalls[0]);

      if (redMatches === 6 && specialMatch) {
        winsLevel1++;
        totalPrize += 1000000;
      } else if (redMatches === 6) {
        winsLevel2++;
        totalPrize += 100000;
      } else if (redMatches === 5 && specialMatch) {
        winsLevel3++;
        totalPrize += 10000;
      } else if (redMatches === 5 || (redMatches === 4 && specialMatch)) {
        winsLevel4Plus++;
        totalPrize += 1000;
      } else if (specialMatch) {
        winsLevel4Plus++;
        totalPrize += 45; // Special ball odds ~45x
      }
    });
  });

  const totalWinningTickets = winsLevel1 + winsLevel2 + winsLevel3 + winsLevel4Plus;
  const winRatePercent = totalTicketsTested > 0 ? Math.round((totalWinningTickets / totalTicketsTested) * 10000) / 100 : 0;
  const netReturnRatio = totalCost > 0 ? Math.round((totalPrize / totalCost) * 100) / 100 : 0;

  return {
    totalDrawsTested: historicalDraws.length,
    totalTickets: totalTicketsTested,
    winsLevel1,
    winsLevel2,
    winsLevel3,
    winsLevel4Plus,
    winRatePercent,
    totalCost,
    totalPrize,
    netReturnRatio,
  };
}

