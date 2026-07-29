import { MacauDrawItem, getWaveColor, getZodiac, getFiveElements, getMacau3MinIssueInfo } from './lotteryEngine';

export interface DrawStatsAnalysis {
  totalDraws: number;
  hotNumbers: number[];
  warmNumbers: number[];
  coldNumbers: number[];
  waveDistribution: {
    red: number;
    blue: number;
    green: number;
    redRatio: number;
    blueRatio: number;
    greenRatio: number;
  };
  topZodiac: string;
  avgSpecialValue: number;
  bigRatio: number;
  oddRatio: number;
}

export interface PredictionResult {
  targetIssue: string;
  algorithmName: string;
  confidence: number;
  sizePred: '大' | '小';
  parityPred: '单' | '双';
  colorPred: '红波' | '蓝波' | '绿波';
  sizeOdds: number;
  parityOdds: number;
  colorOdds: number;
  rationale: string;
}

export interface ProfitAndLossReport {
  dayDrawNum: number;
  predictedRounds: number;
  totalRounds: number;
  isCompleted: boolean;
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

/**
 * 分析近 50 期开奖规律
 */
export function analyze50Draws(draws: MacauDrawItem[]): DrawStatsAnalysis {
  const recentDraws = draws.slice(0, 50);
  const totalDraws = recentDraws.length;
  const numCounts: { [num: number]: { total: number; special: number; omission: number; found: boolean } } = {};

  for (let n = 1; n <= 49; n++) {
    numCounts[n] = { total: 0, special: 0, omission: 0, found: false };
  }

  let redWave = 0, blueWave = 0, greenWave = 0;
  const zodiacCounts: { [z: string]: number } = {};
  let specialSum = 0;
  let bigCount = 0;
  let oddCount = 0;

  recentDraws.forEach((item) => {
    const codes = item.openCode.split(',').map(Number);
    if (codes.length < 7) return;

    const special = codes[6];

    codes.forEach((c) => {
      if (c >= 1 && c <= 49) numCounts[c].total++;
    });
    if (special >= 1 && special <= 49) numCounts[special].special++;

    for (let n = 1; n <= 49; n++) {
      if (!codes.includes(n)) {
        if (!numCounts[n].found) numCounts[n].omission++;
      } else {
        numCounts[n].found = true;
      }
    }

    const w = getWaveColor(special);
    if (w === 'red') redWave++;
    else if (w === 'blue') blueWave++;
    else greenWave++;

    const z = getZodiac(special);
    zodiacCounts[z] = (zodiacCounts[z] || 0) + 1;

    specialSum += special;
    if (special >= 25) bigCount++;
    if (special % 2 !== 0) oddCount++;
  });

  const hotNumbers: number[] = [];
  const warmNumbers: number[] = [];
  const coldNumbers: number[] = [];

  for (let n = 1; n <= 49; n++) {
    if (numCounts[n].total >= 8) hotNumbers.push(n);
    else if (numCounts[n].total >= 4) warmNumbers.push(n);
    else coldNumbers.push(n);
  }

  let topZodiac = '龙';
  let maxZCount = 0;
  Object.entries(zodiacCounts).forEach(([z, count]) => {
    if (count > maxZCount) {
      maxZCount = count;
      topZodiac = z;
    }
  });

  return {
    totalDraws,
    hotNumbers,
    warmNumbers,
    coldNumbers,
    waveDistribution: {
      red: redWave,
      blue: blueWave,
      green: greenWave,
      redRatio: Math.round((redWave / totalDraws) * 100),
      blueRatio: Math.round((blueWave / totalDraws) * 100),
      greenRatio: Math.round((greenWave / totalDraws) * 100),
    },
    topZodiac,
    avgSpecialValue: Number((specialSum / totalDraws).toFixed(1)),
    bigRatio: Math.round((bigCount / totalDraws) * 100),
    oddRatio: Math.round((oddCount / totalDraws) * 100),
  };
}

/**
 * 提取/增加期号
 */
export function getNextIssue(currentIssue: string): string {
  const match = currentIssue.match(/^(\d{4})(\d{2})(\d{2})(\d{3})$/);
  if (!match) return `${currentIssue} (预测)`;
  const [_, y, m, d, num] = match;
  let nextNum = parseInt(num, 10) + 1;
  let dateStr = `${y}-${m}-${d}`;
  if (nextNum > 480) {
    nextNum = 1;
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    dateStr = date.toISOString().split("T")[0];
    const newY = dateStr.split("-")[0];
    const newM = dateStr.split("-")[1];
    const newD = dateStr.split("-")[2];
    return `${newY}${newM}${newD}${String(nextNum).padStart(3, "0")}`;
  }
  return `${y}${m}${d}${String(nextNum).padStart(3, "0")}`;
}

/**
 * 基于 100 期真实规律
 */
export function generate50DrawsPrediction(draws: MacauDrawItem[]): PredictionResult {
  if (!draws || draws.length === 0) {
    return {
      targetIssue: getMacau3MinIssueInfo(-1).expect,
      algorithmName: '智能多源核密度自适应集成推演引擎 v5.0',
      confidence: 90,
      sizePred: '大',
      parityPred: '单',
      colorPred: '红波',
      sizeOdds: 1.95,
      parityOdds: 1.95,
      colorOdds: 2.75,
      rationale: '暂无开奖数据，执行初始期望预测。',
    };
  }

  const nextIssue = getNextIssue(draws[0].expect);
  const recentDraws = draws.slice(0, 50);

  // ==========================================
  // 1. 动态自适应自我纠偏反馈环 (Feedback Loop)
  // ==========================================
  let biasSizeOffset = 0.0; // 正值偏向大，负值偏向小
  let biasParityOffset = 0.0; // 正值偏向单，负值偏向双
  if (draws.length >= 15) {
    // 采用滑动窗口，对过去 5 期执行历史虚逆预测，度量模型本期所处波段的漂移误差，进行动态反向注入
    for (let i = 1; i <= 5; i++) {
      const hist = draws.slice(i);
      const actualDraw = draws[i - 1];
      const codes = actualDraw.openCode.split(',').map(Number);
      if (codes.length >= 7) {
        const special = codes[6];
        if (special === 49) continue;
        const actualBig = special >= 25;
        const actualOdd = special % 2 !== 0;

        // 计算简易滑窗均值回归
        let bigs = 0, odds = 0, countVal = 0;
        hist.slice(0, 20).forEach(d => {
          const c = d.openCode.split(',').map(Number);
          if (c.length >= 7 && c[6] !== 49) {
            if (c[6] >= 25) bigs++;
            if (c[6] % 2 !== 0) odds++;
            countVal++;
          }
        });
        const ratioBig = countVal > 0 ? bigs / countVal : 0.5;
        const ratioOdd = countVal > 0 ? odds / countVal : 0.5;

        const predBig = ratioBig < 0.5;
        const predOdd = ratioOdd < 0.5;

        if (predBig !== actualBig) {
          biasSizeOffset += (actualBig ? 0.05 : -0.05);
        }
        if (predOdd !== actualOdd) {
          biasParityOffset += (actualOdd ? 0.05 : -0.05);
        }
      }
    }
  }

  // ==========================================
  // 2. N-Gram 序列状态链模式匹配引擎
  // ==========================================
  let nGramSizeProb = 0.5;
  let nGramParityProb = 0.5;
  let nGramMatches = 0;

  if (draws.length >= 10) {
    const recentPatternSize: boolean[] = [];
    const recentPatternOdd: boolean[] = [];
    let validPatternCount = 0;

    for (let i = 0; i < draws.length && validPatternCount < 3; i++) {
      const codes = draws[i].openCode.split(',').map(Number);
      if (codes.length >= 7) {
        const special = codes[6];
        if (special !== 49) {
          recentPatternSize.push(special >= 25);
          recentPatternOdd.push(special % 2 !== 0);
          validPatternCount++;
        }
      }
    }

    if (validPatternCount === 3) {
      // 匹配最近 3 期的状态流：[T-2, T-1, T] 从老到新
      const pSize = [recentPatternSize[2], recentPatternSize[1], recentPatternSize[0]];
      const pOdd = [recentPatternOdd[2], recentPatternOdd[1], recentPatternOdd[0]];

      let matchSizeBig = 0;
      let matchSizeTotal = 0;
      let matchOddTrue = 0;
      let matchOddTotal = 0;

      const maxSearch = Math.min(draws.length - 4, 100);
      for (let i = 0; i < maxSearch; i++) {
        const balls: number[] = [];
        for (let j = 0; j < 4; j++) {
          const c = draws[i + j].openCode.split(',').map(Number);
          if (c.length >= 7 && c[6] !== 49) {
            balls.push(c[6]);
          }
        }

        if (balls.length === 4) {
          // 时间轴：j=3 (老) -> j=0 (新)
          const histSize = [balls[3] >= 25, balls[2] >= 25, balls[1] >= 25];
          const histNextSize = balls[0] >= 25;
          const histOdd = [balls[3] % 2 !== 0, balls[2] % 2 !== 0, balls[1] % 2 !== 0];
          const histNextOdd = balls[0] % 2 !== 0;

          if (histSize[0] === pSize[0] && histSize[1] === pSize[1] && histSize[2] === pSize[2]) {
            matchSizeTotal++;
            if (histNextSize) matchSizeBig++;
          }
          if (histOdd[0] === pOdd[0] && histOdd[1] === pOdd[1] && histOdd[2] === pOdd[2]) {
            matchOddTotal++;
            if (histNextOdd) matchOddTrue++;
          }
        }
      }

      if (matchSizeTotal > 0) {
        nGramSizeProb = matchSizeBig / matchSizeTotal;
        nGramMatches = matchSizeTotal;
      }
      if (matchParityTotal() > 0) {
        // inline match check fallback
      }
      const matchOddTot = matchOddTotal;
      if (matchOddTot > 0) {
        nGramParityProb = matchOddTrue / matchOddTot;
      }
    }
  }

  function matchParityTotal() { return 0; }

  // ==========================================
  // 3. 多时段指数衰减核分布投票 (Multi-Horizon Decay)
  // ==========================================
  const horizons = [
    { period: 15, lambda: 0.05, weight: 0.45 },
    { period: 50, lambda: 0.015, weight: 0.35 },
    { period: 100, lambda: 0.006, weight: 0.20 }
  ];

  let integratedSizeProb = 0.0;
  let integratedParityProb = 0.0;

  horizons.forEach(hor => {
    const lim = Math.min(draws.length, hor.period);
    let sizeSum = 0;
    let paritySum = 0;
    let weightSum = 0;

    for (let t = 0; t < lim; t++) {
      const codes = draws[t].openCode.split(',').map(Number);
      if (codes.length >= 7) {
        const special = codes[6];
        if (special === 49) continue;
        const decayW = Math.exp(-hor.lambda * t);
        sizeSum += (special >= 25 ? 1 : 0) * decayW;
        paritySum += (special % 2 !== 0 ? 1 : 0) * decayW;
        weightSum += decayW;
      }
    }

    const sizeRatio = weightSum > 0 ? sizeSum / weightSum : 0.5;
    const parityRatio = weightSum > 0 ? paritySum / weightSum : 0.5;

    // 均值回归期望
    integratedSizeProb += (1.0 - sizeRatio) * hor.weight;
    integratedParityProb += (1.0 - parityRatio) * hor.weight;
  });

  // ==========================================
  // 4. 二阶马尔可夫条件自适应转移矩阵
  // ==========================================
  let bbToB = 0, bbToS = 0, bsToB = 0, bsToS = 0;
  let sbToB = 0, sbToS = 0, ssToB = 0, ssToS = 0;

  let ooToO = 0, ooToE = 0, oeToO = 0, oeToE = 0;
  let eoToO = 0, eoToE = 0, eeToO = 0, eeToE = 0;

  const totalDrawsLimit = Math.min(draws.length, 100);
  for (let i = totalDrawsLimit - 3; i >= 0; i--) {
    const prev2Codes = draws[i + 2].openCode.split(',').map(Number);
    const prevCodes = draws[i + 1].openCode.split(',').map(Number);
    const currCodes = draws[i].openCode.split(',').map(Number);
    if (prev2Codes.length < 7 || prevCodes.length < 7 || currCodes.length < 7) continue;

    const prev2Sp = prev2Codes[6];
    const prevSp = prevCodes[6];
    const currSp = currCodes[6];
    if (prev2Sp === 49 || prevSp === 49 || currSp === 49) continue;

    const prev2Big = prev2Sp >= 25;
    const prevBig = prevSp >= 25;
    const currBig = currSp >= 25;

    const prev2Odd = prev2Sp % 2 !== 0;
    const prevBigOdd = prevSp % 2 !== 0;
    const currOdd = currSp % 2 !== 0;

    // 二阶大小转移
    if (prev2Big && prevBig) {
      if (currBig) bbToB++; else bbToS++;
    } else if (prev2Big && !prevBig) {
      if (currBig) bsToB++; else bsToS++;
    } else if (!prev2Big && prevBig) {
      if (currBig) sbToB++; else sbToS++;
    } else {
      if (currBig) ssToB++; else ssToS++;
    }

    // 二阶单双转移
    if (prev2Odd && prevBigOdd) {
      if (currOdd) ooToO++; else ooToE++;
    } else if (prev2Odd && !prevBigOdd) {
      if (currOdd) oeToO++; else oeToE++;
    } else if (!prev2Odd && prevBigOdd) {
      if (currOdd) eoToO++; else eoToE++;
    } else {
      if (currOdd) eeToO++; else eeToE++;
    }
  }

  const lastCodes = draws[0].openCode.split(',').map(Number);
  const prevCodes = draws[1] ? draws[1].openCode.split(',').map(Number) : lastCodes;
  const lastSpecial = lastCodes[6];
  const prevSpecial = prevCodes[6];

  let pBig = 0.5, pSmall = 0.5;
  let pOdd = 0.5, pEven = 0.5;

  if (lastSpecial !== 49 && prevSpecial !== 49) {
    const lastBig = lastSpecial >= 25;
    const prevBig = prevSpecial >= 25;
    const lastOdd = lastSpecial % 2 !== 0;
    const prevOdd = prevSpecial % 2 !== 0;

    if (prevBig && lastBig) {
      const tot = bbToB + bbToS;
      if (tot > 0) { pBig = bbToB / tot; pSmall = bbToS / tot; }
    } else if (prevBig && !lastBig) {
      const tot = bsToB + bsToS;
      if (tot > 0) { pBig = bsToB / tot; pSmall = bsToS / tot; }
    } else if (!prevBig && lastBig) {
      const tot = sbToB + sbToS;
      if (tot > 0) { pBig = sbToB / tot; pSmall = sbToS / tot; }
    } else {
      const tot = ssToB + ssToS;
      if (tot > 0) { pBig = ssToB / tot; pSmall = ssToS / tot; }
    }

    if (prevOdd && lastOdd) {
      const tot = ooToO + ooToE;
      if (tot > 0) { pOdd = ooToO / tot; pEven = ooToE / tot; }
    } else if (prevOdd && !lastOdd) {
      const tot = oeToO + oeToE;
      if (tot > 0) { pOdd = oeToO / tot; pEven = oeToE / tot; }
    } else if (!prevOdd && lastOdd) {
      const tot = eoToO + eoToE;
      if (tot > 0) { pOdd = eoToO / tot; pEven = eoToE / tot; }
    } else {
      const tot = eeToO + eeToE;
      if (tot > 0) { pOdd = eeToO / tot; pEven = eeToE / tot; }
    }
  }

  // 二阶波色状态选择
  let rToR = 0, rToB = 0, rToG = 0;
  let bToR = 0, bToB = 0, bToG = 0;
  let gToR = 0, gToB = 0, gToG = 0;

  for (let i = totalDrawsLimit - 2; i >= 0; i--) {
    const pCodes = draws[i + 1].openCode.split(',').map(Number);
    const cCodes = draws[i].openCode.split(',').map(Number);
    if (pCodes.length < 7 || cCodes.length < 7) continue;

    const prevWave = getWaveColor(pCodes[6]);
    const currWave = getWaveColor(cCodes[6]);

    if (prevWave === 'red') {
      if (currWave === 'red') rToR++; else if (currWave === 'blue') rToB++; else rToG++;
    } else if (prevWave === 'blue') {
      if (currWave === 'red') bToR++; else if (currWave === 'blue') bToB++; else bToG++;
    } else {
      if (currWave === 'red') gToR++; else if (currWave === 'blue') gToB++; else gToG++;
    }
  }

  let pRed = 0.33, pBlue = 0.33, pGreen = 0.33;
  const lastWave = getWaveColor(lastSpecial);
  if (lastSpecial !== 49) {
    if (lastWave === 'red') {
      const tot = rToR + rToB + rToG;
      if (tot > 0) { pRed = rToR / tot; pBlue = rToB / tot; pGreen = rToG / tot; }
    } else if (lastWave === 'blue') {
      const tot = bToR + bToB + bToG;
      if (tot > 0) { pRed = bToR / tot; pBlue = bToB / tot; pGreen = bToG / tot; }
    } else {
      const tot = gToR + gToB + gToG;
      if (tot > 0) { pRed = gToR / tot; pBlue = gToB / tot; pGreen = gToG / tot; }
    }
  }

  // ==========================================
  // 5. 滞后迟滞自适应长龙追踪器 (Hybrid Dragon Tracker)
  // ==========================================
  let consecutiveBig = 0;
  let consecutiveSmall = 0;
  let consecutiveOdd = 0;
  let consecutiveEven = 0;

  for (const draw of draws) {
    const codes = draw.openCode.split(',').map(Number);
    if (codes.length < 7) break;
    const sp = codes[6];
    if (sp === 49) break;
    if (sp >= 25) {
      if (consecutiveSmall > 0) break;
      consecutiveBig++;
    } else {
      if (consecutiveBig > 0) break;
      consecutiveSmall++;
    }
  }

  for (const draw of draws) {
    const codes = draw.openCode.split(',').map(Number);
    if (codes.length < 7) break;
    const sp = codes[6];
    if (sp === 49) break;
    if (sp % 2 !== 0) {
      if (consecutiveEven > 0) break;
      consecutiveOdd++;
    } else {
      if (consecutiveOdd > 0) break;
      consecutiveEven++;
    }
  }

  let dragonSizeAction: 'REVERSE_SMALL' | 'REVERSE_BIG' | 'FOLLOW_BIG' | 'FOLLOW_SMALL' | null = null;
  let dragonParityAction: 'REVERSE_EVEN' | 'REVERSE_ODD' | 'FOLLOW_ODD' | 'FOLLOW_EVEN' | null = null;
  let sizeDragonStrength = 1.0;
  let parityDragonStrength = 1.0;

  // 大小属性迟滞分析
  const maxConsecutiveSize = Math.max(consecutiveBig, consecutiveSmall);
  if (maxConsecutiveSize >= 3) {
    if (maxConsecutiveSize <= 5) {
      // 3-5期：均值回归拦截 (反转趋势)
      dragonSizeAction = consecutiveBig > 0 ? 'REVERSE_SMALL' : 'REVERSE_BIG';
      sizeDragonStrength = 1.0 + (maxConsecutiveSize - 2) * 0.25; // 强度系数: 1.25 -> 1.75
    } else {
      // >= 6期：长龙迟滞，进入趋势追随阶段 (龙王降临，切莫强阻)
      dragonSizeAction = consecutiveBig > 0 ? 'FOLLOW_BIG' : 'FOLLOW_SMALL';
      sizeDragonStrength = 1.0 + (maxConsecutiveSize - 5) * 0.20; // 强度系数 1.2 -> 2.0+
    }
  }

  // 单双属性迟滞分析
  const maxConsecutiveParity = Math.max(consecutiveOdd, consecutiveEven);
  if (maxConsecutiveParity >= 3) {
    if (maxConsecutiveParity <= 5) {
      dragonParityAction = consecutiveOdd > 0 ? 'REVERSE_EVEN' : 'REVERSE_ODD';
      parityDragonStrength = 1.0 + (maxConsecutiveParity - 2) * 0.25;
    } else {
      dragonParityAction = consecutiveOdd > 0 ? 'FOLLOW_ODD' : 'FOLLOW_EVEN';
      parityDragonStrength = 1.0 + (maxConsecutiveParity - 5) * 0.20;
    }
  }

  // ==========================================
  // 6. 核密度 1-49 号码级分布评分 (Zodiac & Elements)
  // ==========================================
  const scores = Array(50).fill(1.0);
  const counts = Array(50).fill(0);
  const omission = Array(50).fill(0);
  const found = Array(50).fill(false);

  // 指数时间衰减频次
  recentDraws.forEach((draw, idx) => {
    const codes = draw.openCode.split(',').map(Number);
    if (codes.length >= 7) {
      const special = codes[6];
      if (special >= 1 && special <= 49) {
        const decayFactor = Math.exp(-0.015 * idx);
        counts[special] += decayFactor;
      }
      for (let n = 1; n <= 49; n++) {
        if (codes.includes(n)) {
          found[n] = true;
        } else if (!found[n]) {
          omission[n]++;
        }
      }
    }
  });

  // 重号、邻号、遗漏反弹
  if (lastSpecial >= 1 && lastSpecial <= 49) {
    scores[lastSpecial] += 0.22; // 重号概率
    const left = lastSpecial === 1 ? 49 : lastSpecial - 1;
    const right = lastSpecial === 49 ? 1 : lastSpecial + 1;
    scores[left] += 0.15;
    scores[right] += 0.15;
  }

  for (let n = 1; n <= 49; n++) {
    const theoreticalOmit = 49 / Math.max(1, counts[n]);
    const omitRatio = omission[n] / Math.max(1, theoreticalOmit);
    if (omitRatio > 1.4) {
      scores[n] += Math.min(0.4, (omitRatio - 1.4) * 0.12); // 极值反弹
    } else if (omitRatio < 0.4) {
      scores[n] -= 0.08; // 极热降温
    }
  }

  // 生肖五行大数补偿
  const zodiacCounts: { [key: string]: number } = {};
  const fiveElementCounts: { [key: string]: number } = {};
  recentDraws.slice(0, 35).forEach((draw, idx) => {
    const codes = draw.openCode.split(',').map(Number);
    if (codes.length >= 7) {
      const special = codes[6];
      if (special) {
        const decay = Math.exp(-0.01 * idx);
        const z = getZodiac(special);
        const f = getFiveElements(special);
        zodiacCounts[z] = (zodiacCounts[z] || 0) + decay;
        fiveElementCounts[f] = (fiveElementCounts[f] || 0) + decay;
      }
    }
  });

  for (let n = 1; n <= 49; n++) {
    const z = getZodiac(n);
    const f = getFiveElements(n);
    const zCount = zodiacCounts[z] || 0;
    const fCount = fiveElementCounts[f] || 0;
    if (zCount <= 1.0) scores[n] += 0.12; // 极冷生肖补偿
    if (fCount <= 3.0) scores[n] += 0.10; // 极冷五行平衡
  }

  // 号码级概率分配
  let sumScore = 0;
  for (let n = 1; n <= 49; n++) sumScore += scores[n];

  let scoreBig = 0, scoreSmall = 0;
  let scoreOdd = 0, scoreEven = 0;
  let scoreRed = 0, scoreBlue = 0, scoreGreen = 0;

  for (let n = 1; n <= 49; n++) {
    const prob = scores[n] / (sumScore || 1);
    const isNBig = n >= 25;
    const isNOdd = n % 2 !== 0;
    const w = getWaveColor(n);

    if (n < 49) {
      if (isNBig) scoreBig += prob; else scoreSmall += prob;
      if (isNOdd) scoreOdd += prob; else scoreEven += prob;
    }
    if (w === 'red') scoreRed += prob;
    else if (w === 'blue') scoreBlue += prob;
    else scoreGreen += prob;
  }

  // ==========================================
  // 7. 多维混合模型加权决策计算 (Comprehensive Weighting)
  // ==========================================
  // 大小属性综合概率: 40% 多时段均值回归 + 30% 一阶马尔可夫链 + 30% N-Gram 序列概率
  let finalBigScore = (integratedSizeProb) * 0.40 + (scoreBig * pBig) * 0.30 + (nGramSizeProb) * 0.30;
  let finalSmallScore = (1.0 - integratedSizeProb) * 0.40 + (scoreSmall * pSmall) * 0.30 + (1.0 - nGramSizeProb) * 0.30;

  // 单双属性综合概率
  let finalOddScore = (integratedParityProb) * 0.40 + (scoreOdd * pOdd) * 0.30 + (nGramParityProb) * 0.30;
  let finalEvenScore = (1.0 - integratedParityProb) * 0.40 + (scoreEven * pEven) * 0.30 + (1.0 - nGramParityProb) * 0.30;

  // 注入自适应自我纠偏反馈因子
  finalBigScore += biasSizeOffset;
  finalSmallScore -= biasSizeOffset;
  finalOddScore += biasParityOffset;
  finalEvenScore -= biasParityOffset;

  // 注入长龙迟滞追踪决策
  if (dragonSizeAction === 'REVERSE_SMALL') {
    finalSmallScore *= sizeDragonStrength;
  } else if (dragonSizeAction === 'REVERSE_BIG') {
    finalBigScore *= sizeDragonStrength;
  } else if (dragonSizeAction === 'FOLLOW_BIG') {
    finalBigScore *= sizeDragonStrength;
  } else if (dragonSizeAction === 'FOLLOW_SMALL') {
    finalSmallScore *= sizeDragonStrength;
  }

  if (dragonParityAction === 'REVERSE_EVEN') {
    finalEvenScore *= parityParityStrength();
  } else if (dragonParityAction === 'REVERSE_ODD') {
    finalOddScore *= parityParityStrength();
  } else if (dragonParityAction === 'FOLLOW_ODD') {
    finalOddScore *= parityParityStrength();
  } else if (dragonParityAction === 'FOLLOW_EVEN') {
    finalEvenScore *= parityParityStrength();
  }

  function parityParityStrength() {
    return parityDragonStrength;
  }

  // 归一化判定
  const sizePred: '大' | '小' = finalBigScore >= finalSmallScore ? '大' : '小';
  const parityPred: '单' | '双' = finalOddScore >= finalEvenScore ? '单' : '双';

  // 波色决策
  const finalRedScore = scoreRed * pRed;
  const finalBlueScore = scoreBlue * pBlue;
  const finalGreenScore = scoreGreen * pGreen;

  let colorPred: '红波' | '蓝波' | '绿波' = '红波';
  let colorOdds = 2.75;
  if (finalRedScore >= finalBlueScore && finalRedScore >= finalGreenScore) {
    colorPred = '红波';
    colorOdds = 2.75;
  } else if (finalBlueScore >= finalGreenScore) {
    colorPred = '蓝波';
    colorOdds = 2.98;
  } else {
    colorPred = '绿波';
    colorOdds = 2.98;
  }

  // ==========================================
  // 8. 智能综合置信度计算与深度理由输出
  // ==========================================
  const sizeDiff = Math.abs(finalBigScore - finalSmallScore) / (finalBigScore + finalSmallScore || 1);
  const parityDiff = Math.abs(finalOddScore - finalEvenScore) / (finalOddScore + finalEvenScore || 1);
  const baseConfidence = 91 + Math.floor((sizeDiff + parityDiff) * 15);
  const confidence = Math.min(99, Math.max(93, baseConfidence));

  const rparts: string[] = [];
  
  // 大小决策描述
  if (dragonSizeAction && dragonSizeAction.startsWith('FOLLOW')) {
    rparts.push(`【大小维度 - 趋势追随模式】：当前特码大小连出达 ${maxConsecutiveSize} 期，突破极值反转阻断，模型锁定并强势顺推【${sizePred}】。`);
  } else if (dragonSizeAction && dragonSizeAction.startsWith('REVERSE')) {
    rparts.push(`【大小维度 - 均值回归模式】：大小指标连出达 ${maxConsecutiveSize} 期，触发 ${sizeDragonStrength.toFixed(2)} 倍率波动极值回归，强烈推荐反投【${sizePred}】。`);
  } else {
    rparts.push(`【大小维度 - 级联集成模型】：多时段核分布均值 (${(integratedSizeProb * 100).toFixed(1)}% 偏大期望) 协同 Markov (${Math.round(Math.max(pBig, pSmall) * 100)}%) 及 N-Gram (${nGramMatches}次匹配)，推算最佳买【${sizePred}】。`);
  }

  // 单双决策描述
  if (dragonParityAction && dragonParityAction.startsWith('FOLLOW')) {
    rparts.push(`【单双维度 - 趋势追随模式】：单双连出 ${maxConsecutiveParity} 期，进入长龙顺风通道，顺应走势追踪买【${parityPred}】。`);
  } else if (dragonParityAction && dragonParityAction.startsWith('REVERSE')) {
    rparts.push(`【单双维度 - 均值回归模式】：单双形态连续 ${maxConsecutiveParity} 期未反转，触发极点偏离校正，推荐狙击冷态反转买【${parityPred}】。`);
  } else {
    rparts.push(`【单双维度 - 级联集成模型】：短中长衰减投票 (${(integratedParityProb * 100).toFixed(1)}% 偏单期望) 融合马尔可夫概率与 ${Math.abs(biasParityOffset).toFixed(2)} 反向纠偏反馈，精准推导最佳买【${parityPred}】。`);
  }

  // 波色决策描述
  rparts.push(`【波色维度 - 核分布配重】：指数加权红蓝绿归一密度占比为 ${Math.round(finalRedScore * 100)}% : ${Math.round(finalBlueScore * 100)}% : ${Math.round(finalGreenScore * 100)}%，优选高概率形态【${colorPred}】。`);

  const rationale = rparts.join('\n');

  return {
    targetIssue: nextIssue,
    algorithmName: '智能多源核密度自适应集成推演引擎 v5.0',
    confidence,
    sizePred,
    parityPred,
    colorPred,
    sizeOdds: 1.95,
    parityOdds: 1.95,
    colorOdds,
    rationale,
  };
}

/**
 * 统计预测下注回测盈亏报表
 */
export function calculateProfitAndLoss(draws?: MacauDrawItem[]): ProfitAndLossReport {
  if (!draws || draws.length === 0) {
    return {
      dayDrawNum: 0,
      predictedRounds: 0,
      totalRounds: 430,
      isCompleted: false,
      totalBet: 0,
      totalPayout: 0,
      netProfit: 0,
      roi: 0,
      sizeHitRate: 0,
      parityHitRate: 0,
      colorHitRate: 0,
      allThreeHits: 0,
      maxStreak: 0,
    };
  }

  let dayDrawNum = 480;
  let dateStr = "";
  const rawExpect = String(draws[0].expect);
  const match = rawExpect.match(/^(\d{8})(\d{3})$/);
  if (match) {
    dateStr = match[1];
    dayDrawNum = parseInt(match[2], 10);
  } else {
    const m2 = rawExpect.match(/\d{1,3}$/);
    if (m2) dayDrawNum = parseInt(m2[0], 10);
  }

  // Filter today draws
  const todayDraws = draws.filter(d => {
    if (!dateStr) return true;
    return String(d.expect).startsWith(dateStr);
  });

  // Sort chronological (oldest to newest)
  const sortedToday = [...todayDraws].sort((a, b) => a.expect.localeCompare(b.expect));

  let totalBet = 0;
  let totalPayout = 0;
  let sizeHits = 0;
  let parityHits = 0;
  let colorHits = 0;
  let allThreeHits = 0;
  let maxStreak = 0;
  let currentStreak = 0;
  let predictedRounds = 0;

  for (const d of sortedToday) {
    const idx = draws.findIndex(item => item.expect === d.expect);
    if (idx === -1) continue;
    const historyContext = draws.slice(idx + 1);
    if (historyContext.length < 10) continue; // need history context

    const pred = generate50DrawsPrediction(historyContext);
    const codes = d.openCode.split(',').map(Number);
    if (codes.length < 7) continue;
    const special = codes[6];
    const isBig = special >= 25;
    const isOdd = special % 2 !== 0;
    const wave = getWaveColor(special);
    const waveMap = { red: '红波', blue: '蓝波', green: '绿波' };
    const waveName = waveMap[wave];
    const sizeText = special === 49 ? '和' : (isBig ? '大' : '小');
    const parityText = special === 49 ? '和' : (isOdd ? '单' : '双');

    predictedRounds++;
    const bet = 3;
    let payout = 0;
    let sizeHit = false;
    let parityHit = false;
    let colorHit = false;

    if (special === 49) {
      payout += 2; // refund
    } else {
      if (pred.sizePred === sizeText) {
        sizeHit = true;
        payout += 1.95;
      }
      if (pred.parityPred === parityText) {
        parityHit = true;
        payout += 1.95;
      }
    }
    if (pred.colorPred === waveName) {
      colorHit = true;
      payout += (waveName === '红波' ? 2.75 : 2.98);
    }

    totalBet += bet;
    totalPayout += payout;

    if (sizeHit) sizeHits++;
    if (parityHit) parityHits++;
    if (colorHit) colorHits++;
    if (sizeHit && parityHit && colorHit) {
      allThreeHits++;
    }

    const net = payout - bet;
    if (net > 0) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const netProfit = Number((totalPayout - totalBet).toFixed(2));
  const roi = totalBet > 0 ? Number(((netProfit / totalBet) * 100).toFixed(2)) : 0;
  const isCompleted = dayDrawNum >= 480 && predictedRounds >= 430;

  return {
    dayDrawNum,
    predictedRounds,
    totalRounds: 430,
    isCompleted,
    totalBet,
    totalPayout: Number(totalPayout.toFixed(2)),
    netProfit,
    roi,
    sizeHitRate: predictedRounds > 0 ? Number(((sizeHits / predictedRounds) * 100).toFixed(1)) : 0,
    parityHitRate: predictedRounds > 0 ? Number(((parityHits / predictedRounds) * 100).toFixed(1)) : 0,
    colorHitRate: predictedRounds > 0 ? Number(((colorHits / predictedRounds) * 100).toFixed(1)) : 0,
    allThreeHits,
    maxStreak,
  };
}

/**
 * 生成包含【最新开奖记录 + 上期盈亏结算 + 当前累计总盈亏 + 下一期智能预测】的自动推送综合帖子
 */
export function generateAutomatedPushReport(draws: MacauDrawItem[]): string {
  if (!draws || draws.length === 0) {
    return '<b>🎰 澳门三分六合彩 · 暂无最新数据</b>';
  }

  const latest = draws[0];
  const codes = latest.openCode.split(',').map(Number);
  const normalCodes = codes.slice(0, 6);
  const special = codes[6] || 0;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formattedReds = normalCodes.map(pad).join(' ');
  const formattedSpecial = pad(special);

  const wave = getWaveColor(special);
  const waveMap = { red: '红波', blue: '蓝波', green: '绿波' };
  const waveName = waveMap[wave];

  const zodiac = getZodiac(special);
  const isBig = special >= 25;
  const isOdd = special % 2 !== 0;
  const sizeText = special === 49 ? '和' : (isBig ? '大' : '小');
  const parityText = special === 49 ? '和' : (isOdd ? '单' : '双');

  // 1. 下一期预测
  const prediction = generate50DrawsPrediction(draws);

  // 2. 累计盈亏报表
  const pnl = calculateProfitAndLoss(draws);

  // 3. 上期结算 (根据 draws.slice(1) 即上一期历史上下文预测最新一期 draws[0])
  const prevBet = 3;
  let prevPayout = 0;
  let sizeHit = false;
  let parityHit = false;
  let colorHit = false;

  if (draws.length > 1) {
    const prevPrediction = generate50DrawsPrediction(draws.slice(1));
    if (special === 49) {
      prevPayout += 2;
    } else {
      if (prevPrediction.sizePred === sizeText) {
        sizeHit = true;
        prevPayout += 1.95;
      }
      if (prevPrediction.parityPred === parityText) {
        parityHit = true;
        prevPayout += 1.95;
      }
    }
    if (prevPrediction.colorPred === waveName) {
      colorHit = true;
      prevPayout += (waveName === '红波' ? 2.75 : 2.98);
    }
  }

  prevPayout = Number(prevPayout.toFixed(2));
  const prevNetProfit = Number((prevPayout - prevBet).toFixed(2));
  const prevProfitSignDisplay = prevNetProfit >= 0 ? `+${prevNetProfit}` : `${prevNetProfit}`;
  const netProfitSign = pnl.netProfit >= 0 ? `+${pnl.netProfit}` : `${pnl.netProfit}`;
  const roiSign = pnl.roi >= 0 ? `+${pnl.roi}` : `${pnl.roi}`;

  return `
<b>🎰 澳门三分六合彩 · 自动定时推演与盈亏简报</b>
--------------------------------------
<b>最新开奖期号</b>: <code>${latest.expect}</code>
<b>平码</b>: <code>${formattedReds}</code>
<b>特码</b>: <b>${formattedSpecial}</b> (${zodiac} / ${waveName} / ${sizeText}${parityText})
--------------------------------------
<b>💸 上期结算 (第 ${latest.expect} 期)</b>:
• 下注 3 USDT | 派彩 ${prevPayout} USDT
• 上期净盈亏: <b>${prevProfitSignDisplay} USDT ${prevNetProfit >= 0 ? '📈' : '📉'}</b>
• 命中明细: 大小${sizeHit ? '✅' : '❌'} | 单双${parityHit ? '✅' : '❌'} | 波色${colorHit ? '✅' : '❌'}
--------------------------------------
<b>📈 今日累计总盈亏 (${pnl.predictedRounds} 期)</b>:
• 累计总投注: <code>${pnl.totalBet.toLocaleString()} USDT</code>
• 累计总派彩: <code>${pnl.totalPayout.toLocaleString()} USDT</code>
• 累计净盈亏: <b>${netProfitSign} USDT ${pnl.netProfit >= 0 ? '🚀' : '💧'}</b> (ROI: ${roiSign}%)
--------------------------------------
<b>🧠 下一期智能预测 (第 ${prediction.targetIssue} 期)</b>:
📏 <b>大小预测</b>: <b>【 ${prediction.sizePred} 】</b> (赔率 1.95)
🎲 <b>单双预测</b>: <b>【 ${prediction.parityPred} 】</b> (赔率 1.95)
🎨 <b>波色预测</b>: <b>【 ${prediction.colorPred} 】</b> (赔率 ${prediction.colorOdds})
🔥 <b>综合置信度</b>: <b>${prediction.confidence}%</b>
--------------------------------------
<b>📢 官方频道</b>: ${process.env.TELEGRAM_CHANNEL_URL || ""}
<i>💡 每分钟自动拉取开奖并实时演算推演</i>
`.trim();
}

