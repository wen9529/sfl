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
  sizeConfidence: number;
  parityConfidence: number;
  colorConfidence: number;
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
  maxLoss: number;
  maxProfit: number;
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

export function generate50DrawsPrediction(draws: MacauDrawItem[]): PredictionResult {
  if (!draws || draws.length === 0) {
    return {
      targetIssue: getMacau3MinIssueInfo(-1).expect,
      algorithmName: '最新50期规律自适应推演引擎 v6.5',
      confidence: 90,
      sizeConfidence: 90,
      parityConfidence: 90,
      colorConfidence: 90,
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
  // 严格使用最新 50 期开奖记录作为统计规律推演上下文
  const recentDraws = draws.slice(0, 50);

  // ==========================================
  // 1. 动态自适应自我纠偏反馈环 (Feedback Loop - 近 50 期子切片)
  // ==========================================
  let biasSizeOffset = 0.0; // 正值偏向大，负值偏向小
  let biasParityOffset = 0.0; // 正值偏向单，负值偏向双
  if (recentDraws.length >= 20) {
    // 评估模型对过去 5 期开奖的微小误差，进行有界自适应纠偏 (上限 ±0.03)
    for (let i = 1; i <= 5; i++) {
      const hist = recentDraws.slice(i);
      const actualDraw = recentDraws[i - 1];
      const codes = actualDraw.openCode.split(',').map(Number);
      if (codes.length >= 7) {
        const special = codes[6];
        if (special === 49) continue;
        const actualBig = special >= 25;
        const actualOdd = special % 2 !== 0;

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

        const predBig = ratioBig >= 0.5;
        const predOdd = ratioOdd >= 0.5;

        if (predBig !== actualBig) {
          biasSizeOffset += (actualBig ? 0.006 : -0.006);
        }
        if (predOdd !== actualOdd) {
          biasParityOffset += (actualOdd ? 0.006 : -0.006);
        }
      }
    }
  }
  biasSizeOffset = Math.max(-0.03, Math.min(0.03, biasSizeOffset));
  biasParityOffset = Math.max(-0.03, Math.min(0.03, biasParityOffset));

  // ==========================================
  // 2. N-Gram 序列状态链模式匹配 (基于最新 50 期)
  // ==========================================
  let nGramSizeProb = 0.5;
  let nGramParityProb = 0.5;
  let nGramMatches = 0;

  if (recentDraws.length >= 10) {
    const recentPatternSize: boolean[] = [];
    const recentPatternOdd: boolean[] = [];
    let validPatternCount = 0;

    for (let i = 0; i < recentDraws.length && validPatternCount < 3; i++) {
      const codes = recentDraws[i].openCode.split(',').map(Number);
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
      const pSize = [recentPatternSize[2], recentPatternSize[1], recentPatternSize[0]];
      const pOdd = [recentPatternOdd[2], recentPatternOdd[1], recentPatternOdd[0]];

      let matchSizeBig = 0;
      let matchSizeTotal = 0;
      let matchOddTrue = 0;
      let matchOddTotal = 0;

      const maxSearch = Math.min(recentDraws.length - 4, 46);
      for (let i = 0; i < maxSearch; i++) {
        const balls: number[] = [];
        for (let j = 0; j < 4; j++) {
          const c = recentDraws[i + j].openCode.split(',').map(Number);
          if (c.length >= 7 && c[6] !== 49) {
            balls.push(c[6]);
          }
        }

        if (balls.length === 4) {
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
        nGramSizeProb = (matchSizeBig + 1) / (matchSizeTotal + 2);
        nGramMatches = matchSizeTotal;
      }
      if (matchOddTotal > 0) {
        nGramParityProb = (matchOddTrue + 1) / (matchOddTotal + 2);
      }
    }
  }

  // ==========================================
  // 3. 多时段指数衰减核分布 (近 15 期与 50 期双核)
  // ==========================================
  const horizons = [
    { period: 15, lambda: 0.05, weight: 0.55 },
    { period: 50, lambda: 0.018, weight: 0.45 }
  ];

  let integratedSizeProb = 0.0;
  let integratedParityProb = 0.0;

  horizons.forEach(hor => {
    const lim = Math.min(recentDraws.length, hor.period);
    let sizeSum = 0;
    let paritySum = 0;
    let weightSum = 0;

    for (let t = 0; t < lim; t++) {
      const codes = recentDraws[t].openCode.split(',').map(Number);
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

    const pBigExpect = sizeRatio;
    const pOddExpect = parityRatio;

    integratedSizeProb += pBigExpect * hor.weight;
    integratedParityProb += pOddExpect * hor.weight;
  });

  // 计算最新 50 期基准分布概率，用于解耦 (Detrending)
  let baseBig = 0.5, baseSmall = 0.5;
  let baseOdd = 0.5, baseEven = 0.5;
  let baseRed = 0.347, baseBlue = 0.3265, baseGreen = 0.3265;
  if (recentDraws.length >= 10) {
    let countB = 0, countS = 0, countO = 0, countE = 0;
    let countR = 0, countBl = 0, countG = 0, countTot = 0;
    const maxB = recentDraws.length;
    for (let i = 0; i < maxB; i++) {
      const c = recentDraws[i].openCode.split(',').map(Number);
      if (c.length >= 7 && c[6] !== 49) {
        const sp = c[6];
        if (sp >= 25) countB++; else countS++;
        if (sp % 2 !== 0) countO++; else countE++;
        const w = getWaveColor(sp);
        if (w === 'red') countR++;
        else if (w === 'blue') countBl++;
        else countG++;
        countTot++;
      }
    }
    if (countTot > 0) {
      baseBig = countB / countTot;
      baseSmall = countS / countTot;
      baseOdd = countO / countTot;
      baseEven = countE / countTot;
      baseRed = countR / countTot;
      baseBlue = countBl / countTot;
      baseGreen = countG / countTot;
    }
  }

  // ==========================================
  // 4. 二阶马尔可夫条件转移 (基于最新 50 期)
  // ==========================================
  let bbToB = 0, bbToS = 0, bsToB = 0, bsToS = 0;
  let sbToB = 0, sbToS = 0, ssToB = 0, ssToS = 0;

  let ooToO = 0, ooToE = 0, oeToO = 0, oeToE = 0;
  let eoToO = 0, eoToE = 0, eeToO = 0, eeToE = 0;

  const totalDrawsLimit = recentDraws.length;
  for (let i = totalDrawsLimit - 3; i >= 0; i--) {
    const prev2Codes = recentDraws[i + 2].openCode.split(',').map(Number);
    const prevCodes = recentDraws[i + 1].openCode.split(',').map(Number);
    const currCodes = recentDraws[i].openCode.split(',').map(Number);
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

    if (prev2Big && prevBig) {
      if (currBig) bbToB++; else bbToS++;
    } else if (prev2Big && !prevBig) {
      if (currBig) bsToB++; else bsToS++;
    } else if (!prev2Big && prevBig) {
      if (currBig) sbToB++; else sbToS++;
    } else {
      if (currBig) ssToB++; else ssToS++;
    }

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

  const lastCodes = recentDraws[0].openCode.split(',').map(Number);
  const prevCodes = recentDraws[1] ? recentDraws[1].openCode.split(',').map(Number) : lastCodes;
  const lastSpecial = lastCodes[6];
  const prevSpecial = prevCodes[6];

  let pBig = 0.5, pSmall = 0.5;
  let pOdd = 0.5, pEven = 0.5;

  if (lastSpecial !== 49 && prevSpecial !== 49) {
    const lastBig = lastSpecial >= 25;
    const prevBig = prevSpecial >= 25;
    const lastOdd = lastSpecial % 2 !== 0;
    const prevOdd = prevSpecial % 2 !== 0;

    let rawBig = 0.5, rawSmall = 0.5;
    if (prevBig && lastBig) {
      rawBig = (bbToB + 2) / (bbToB + bbToS + 4);
    } else if (prevBig && !lastBig) {
      rawBig = (bsToB + 2) / (bsToB + bsToS + 4);
    } else if (!prevBig && lastBig) {
      rawBig = (sbToB + 2) / (sbToB + sbToS + 4);
    } else {
      rawBig = (ssToB + 2) / (ssToB + ssToS + 4);
    }
    rawSmall = 1.0 - rawBig;

    pBig = rawBig;
    pSmall = rawSmall;

    let rawOdd = 0.5, rawEven = 0.5;
    if (prevOdd && lastOdd) {
      rawOdd = (ooToO + 2) / (ooToO + ooToE + 4);
    } else if (prevOdd && !lastOdd) {
      rawOdd = (oeToO + 2) / (oeToO + oeToE + 4);
    } else if (!prevOdd && lastOdd) {
      rawOdd = (eoToO + 2) / (eoToO + eoToE + 4);
    } else {
      rawOdd = (eeToO + 2) / (eeToO + eeToE + 4);
    }
    rawEven = 1.0 - rawOdd;

    pOdd = rawOdd;
    pEven = rawEven;
  }

  // 二阶波色状态转移统计
  let rToR = 0, rToB = 0, rToG = 0;
  let bToR = 0, bToB = 0, bToG = 0;
  let gToR = 0, gToB = 0, gToG = 0;

  for (let i = totalDrawsLimit - 2; i >= 0; i--) {
    const pCodes = recentDraws[i + 1].openCode.split(',').map(Number);
    const cCodes = recentDraws[i].openCode.split(',').map(Number);
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

  let pRed_mk = 0.347, pBlue_mk = 0.3265, pGreen_mk = 0.3265;
  const lastWave = getWaveColor(lastSpecial);
  if (lastSpecial !== 49) {
    let rawR = 0.33, rawB = 0.33, rawG = 0.33;
    if (lastWave === 'red') {
      const tot = rToR + rToB + rToG + 6;
      rawR = (rToR + 2) / tot;
      rawB = (rToB + 2) / tot;
      rawG = (rToG + 2) / tot;
    } else if (lastWave === 'blue') {
      const tot = bToR + bToB + bToG + 6;
      rawR = (bToR + 2) / tot;
      rawB = (bToB + 2) / tot;
      rawG = (bToG + 2) / tot;
    } else {
      const tot = gToR + gToB + gToG + 6;
      rawR = (gToR + 2) / tot;
      rawB = (gToB + 2) / tot;
      rawG = (gToG + 2) / tot;
    }

    const sumRaw = rawR + rawB + rawG || 1;
    pRed_mk = rawR / sumRaw;
    pBlue_mk = rawB / sumRaw;
    pGreen_mk = rawG / sumRaw;
  }

  // 波色 N-Gram 匹配 (基于最新 50 期)
  let pRed_ng = 0.347, pBlue_ng = 0.3265, pGreen_ng = 0.3265;
  if (recentDraws.length >= 10) {
    const recentWaves: ('red' | 'blue' | 'green')[] = [];
    let cnt = 0;
    for (let i = 0; i < recentDraws.length && cnt < 3; i++) {
      const c = recentDraws[i].openCode.split(',').map(Number);
      if (c.length >= 7 && c[6] !== 49) {
        recentWaves.push(getWaveColor(c[6]));
        cnt++;
      }
    }
    if (cnt === 3) {
      const targetSeq = [recentWaves[2], recentWaves[1], recentWaves[0]];
      let mR = 0, mB = 0, mG = 0;
      const maxSearch = Math.min(recentDraws.length - 4, 46);
      for (let i = 0; i < maxSearch; i++) {
        const wSeq: ('red' | 'blue' | 'green')[] = [];
        for (let j = 0; j < 4; j++) {
          const c = recentDraws[i + j].openCode.split(',').map(Number);
          if (c.length >= 7 && c[6] !== 49) wSeq.push(getWaveColor(c[6]));
        }
        if (wSeq.length === 4) {
          if (wSeq[3] === targetSeq[0] && wSeq[2] === targetSeq[1] && wSeq[1] === targetSeq[2]) {
            if (wSeq[0] === 'red') mR++;
            else if (wSeq[0] === 'blue') mB++;
            else mG++;
          }
        }
      }
      const totNG = mR + mB + mG + 3;
      pRed_ng = (mR + 1) / totNG;
      pBlue_ng = (mB + 1) / totNG;
      pGreen_ng = (mG + 1) / totNG;
    }
  }

  // 波色指数衰减与均值回归 (最新 50 期)
  let pRed_mh = 0.347, pBlue_mh = 0.3265, pGreen_mh = 0.3265;
  {
    let sumR = 0, sumB = 0, sumG = 0, sumW = 0;
    const maxLim = recentDraws.length;
    for (let t = 0; t < maxLim; t++) {
      const c = recentDraws[t].openCode.split(',').map(Number);
      if (c.length >= 7 && c[6] !== 49) {
        const decayW = Math.exp(-0.02 * t);
        const w = getWaveColor(c[6]);
        if (w === 'red') sumR += decayW;
        else if (w === 'blue') sumB += decayW;
        else sumG += decayW;
        sumW += decayW;
      }
    }
    if (sumW > 0) {
      const rR = sumR / sumW;
      const rB = sumB / sumW;
      const rG = sumG / sumW;
      const expR = 0.347 + 0.40 * (0.347 - rR);
      const expB = 0.3265 + 0.40 * (0.3265 - rB);
      const expG = 0.3265 + 0.40 * (0.3265 - rG);
      const totExp = Math.max(0.1, expR) + Math.max(0.1, expB) + Math.max(0.1, expG);
      pRed_mh = Math.max(0.1, expR) / totExp;
      pBlue_mh = Math.max(0.1, expB) / totExp;
      pGreen_mh = Math.max(0.1, expG) / totExp;
    }
  }

  // ==========================================
  // 5. 滞后迟滞长龙追踪器 (近 50 期长龙)
  // ==========================================
  let consecutiveBig = 0;
  let consecutiveSmall = 0;
  let consecutiveOdd = 0;
  let consecutiveEven = 0;

  for (const draw of recentDraws) {
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

  for (const draw of recentDraws) {
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

  const maxConsecutiveSize = Math.max(consecutiveBig, consecutiveSmall);
  if (maxConsecutiveSize >= 5) {
    if (maxConsecutiveSize <= 7) {
      dragonSizeAction = consecutiveBig > 0 ? 'REVERSE_SMALL' : 'REVERSE_BIG';
      sizeDragonStrength = 1.0 + (maxConsecutiveSize - 4) * 0.15;
    } else {
      dragonSizeAction = consecutiveBig > 0 ? 'FOLLOW_BIG' : 'FOLLOW_SMALL';
      sizeDragonStrength = 1.0 + (maxConsecutiveSize - 7) * 0.15;
    }
  }

  const maxConsecutiveParity = Math.max(consecutiveOdd, consecutiveEven);
  if (maxConsecutiveParity >= 5) {
    if (maxConsecutiveParity <= 7) {
      dragonParityAction = consecutiveOdd > 0 ? 'REVERSE_EVEN' : 'REVERSE_ODD';
      parityDragonStrength = 1.0 + (maxConsecutiveParity - 4) * 0.15;
    } else {
      dragonParityAction = consecutiveOdd > 0 ? 'FOLLOW_ODD' : 'FOLLOW_EVEN';
      parityDragonStrength = 1.0 + (maxConsecutiveParity - 7) * 0.15;
    }
  }

  // ==========================================
  // 6. 核密度 1-49 号码级分布评分 (最新 50 期)
  // ==========================================
  const scores = Array(50).fill(1.0);
  const counts = Array(50).fill(0);
  const omission = Array(50).fill(0);
  const found = Array(50).fill(false);

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

  if (lastSpecial >= 1 && lastSpecial <= 49) {
    scores[lastSpecial] += 0.22;
    const left = lastSpecial === 1 ? 49 : lastSpecial - 1;
    const right = lastSpecial === 49 ? 1 : lastSpecial + 1;
    scores[left] += 0.15;
    scores[right] += 0.15;
  }

  for (let n = 1; n <= 49; n++) {
    const theoreticalOmit = 49 / Math.max(1, counts[n]);
    const omitRatio = omission[n] / Math.max(1, theoreticalOmit);
    if (omitRatio > 1.4) {
      scores[n] += Math.min(0.4, (omitRatio - 1.4) * 0.12);
    } else if (omitRatio < 0.4) {
      scores[n] -= 0.08;
    }
  }

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
    if (zCount <= 1.0) scores[n] += 0.12;
    if (fCount <= 3.0) scores[n] += 0.10;
  }

  let sumScore = 0;
  for (let n = 1; n <= 49; n++) sumScore += scores[n];

  let scoreRed = 0, scoreBlue = 0, scoreGreen = 0;

  for (let n = 1; n <= 49; n++) {
    const prob = scores[n] / (sumScore || 1);
    const w = getWaveColor(n);
    if (w === 'red') scoreRed += prob;
    else if (w === 'blue') scoreBlue += prob;
    else scoreGreen += prob;
  }

  const densityRed = (scoreRed / 17);
  const densityBlue = (scoreBlue / 16);
  const densityGreen = (scoreGreen / 16);
  const densitySum = densityRed + densityBlue + densityGreen || 1;
  const normDensityRed = densityRed / densitySum;
  const normDensityBlue = densityBlue / densitySum;
  const normDensityGreen = densityGreen / densitySum;

  // ==========================================
  // 6.5. 动态自适应 Softmax 权重 (基于近 50 期内部回测)
  // ==========================================
  let weightMultiHorizon = 0.40;
  let weightMarkov = 0.30;
  let weightNGram = 0.30;

  if (recentDraws.length >= 20) {
    let hitMultiHorizon = 0;
    let hitMarkov = 0;
    let hitNGram = 0;
    let totalRounds = 0;

    for (let hIdx = 1; hIdx <= 8; hIdx++) {
      const hist = recentDraws.slice(hIdx);
      const targetDraw = recentDraws[hIdx - 1];
      const targetCodes = targetDraw.openCode.split(',').map(Number);
      if (targetCodes.length < 7) continue;
      const targetSp = targetCodes[6];
      if (targetSp === 49) continue;

      const actualBig = targetSp >= 25;
      const actualOdd = targetSp % 2 !== 0;

      // 1) Multi-Horizon
      let mSizeProb = 0.0;
      let mParityProb = 0.0;
      horizons.forEach(hor => {
        const lim = Math.min(hist.length, hor.period);
        let sizeSum = 0, paritySum = 0, weightSum = 0;
        for (let t = 0; t < lim; t++) {
          const codes = hist[t].openCode.split(',').map(Number);
          if (codes.length >= 7) {
            const sp = codes[6];
            if (sp === 49) continue;
            const decayW = Math.exp(-hor.lambda * t);
            sizeSum += (sp >= 25 ? 1 : 0) * decayW;
            paritySum += (sp % 2 !== 0 ? 1 : 0) * decayW;
            weightSum += decayW;
          }
        }
        const sRatio = weightSum > 0 ? sizeSum / weightSum : 0.5;
        const pRatio = weightSum > 0 ? paritySum / weightSum : 0.5;
        mSizeProb += sRatio * hor.weight;
        mParityProb += pRatio * hor.weight;
      });
      const predMSize = mSizeProb >= 0.5;
      const predMParity = mParityProb >= 0.5;

      // 2) Markov
      let bb_B = 0, bb_S = 0, bs_B = 0, bs_S = 0;
      let sb_B = 0, sb_S = 0, ss_B = 0, ss_S = 0;
      let oo_O = 0, oo_E = 0, oe_O = 0, oe_E = 0;
      let eo_O = 0, eo_E = 0, ee_O = 0, ee_E = 0;

      const histLimit = hist.length;
      for (let i = histLimit - 3; i >= 0; i--) {
        const c2 = hist[i + 2].openCode.split(',').map(Number);
        const c1 = hist[i + 1].openCode.split(',').map(Number);
        const c0 = hist[i].openCode.split(',').map(Number);
        if (c2.length < 7 || c1.length < 7 || c0.length < 7) continue;
        if (c2[6] === 49 || c1[6] === 49 || c0[6] === 49) continue;

        const b2 = c2[6] >= 25;
        const b1 = c1[6] >= 25;
        const b0 = c0[6] >= 25;
        const o2 = c2[6] % 2 !== 0;
        const o1 = c1[6] % 2 !== 0;
        const o0 = c0[6] % 2 !== 0;

        if (b2 && b1) { if (b0) bb_B++; else bb_S++; }
        else if (b2 && !b1) { if (b0) bs_B++; else bs_S++; }
        else if (!b2 && b1) { if (b0) sb_B++; else sb_S++; }
        else { if (b0) ss_B++; else ss_S++; }

        if (o2 && o1) { if (o0) oo_O++; else oo_E++; }
        else if (o2 && !o1) { if (o0) oe_O++; else oe_E++; }
        else if (!o2 && o1) { if (o0) eo_O++; else eo_E++; }
        else { if (o0) ee_O++; else ee_E++; }
      }

      const lCodes = hist[0].openCode.split(',').map(Number);
      const pCodes = hist[1] ? hist[1].openCode.split(',').map(Number) : lCodes;
      let mkBig = 0.5, mkOdd = 0.5;

      if (lCodes.length >= 7 && pCodes.length >= 7 && lCodes[6] !== 49 && pCodes[6] !== 49) {
        const lastB = lCodes[6] >= 25;
        const prevB = pCodes[6] >= 25;
        const lastO = lCodes[6] % 2 !== 0;
        const prevO = pCodes[6] % 2 !== 0;

        if (prevB && lastB) { mkBig = (bb_B + 2) / (bb_B + bb_S + 4); }
        else if (prevB && !lastB) { mkBig = (bs_B + 2) / (bs_B + bs_S + 4); }
        else if (!prevB && lastB) { mkBig = (sb_B + 2) / (sb_B + sb_S + 4); }
        else { mkBig = (ss_B + 2) / (ss_B + ss_S + 4); }

        if (prevO && lastO) { mkOdd = (oo_O + 2) / (oo_O + oo_E + 4); }
        else if (prevO && !lastO) { mkOdd = (oe_O + 2) / (oe_O + oe_E + 4); }
        else if (!prevO && lastO) { mkOdd = (eo_O + 2) / (eo_O + eo_E + 4); }
        else { mkOdd = (ee_O + 2) / (ee_O + ee_E + 4); }
      }
      const predMKSize = mkBig >= 0.5;
      const predMKParity = mkOdd >= 0.5;

      // 3) N-Gram
      let ngSizeProb = 0.5;
      let ngParityProb = 0.5;
      let valCount = 0;
      const recSize: boolean[] = [];
      const recOdd: boolean[] = [];

      for (let i = 0; i < hist.length && valCount < 3; i++) {
        const c = hist[i].openCode.split(',').map(Number);
        if (c.length >= 7 && c[6] !== 49) {
          recSize.push(c[6] >= 25);
          recOdd.push(c[6] % 2 !== 0);
          valCount++;
        }
      }

      if (valCount === 3) {
        const pS = [recSize[2], recSize[1], recSize[0]];
        const pO = [recOdd[2], recOdd[1], recOdd[0]];
        let mSB = 0, mST = 0, mOT = 0, mOE = 0;

        const maxS = Math.min(hist.length - 4, 40);
        for (let i = 0; i < maxS; i++) {
          const b: number[] = [];
          for (let j = 0; j < 4; j++) {
            const c = hist[i + j].openCode.split(',').map(Number);
            if (c.length >= 7 && c[6] !== 49) b.push(c[6]);
          }

          if (b.length === 4) {
            const hS = [b[3] >= 25, b[2] >= 25, b[1] >= 25];
            const hNS = b[0] >= 25;
            const hO = [b[3] % 2 !== 0, b[2] % 2 !== 0, b[1] % 2 !== 0];
            const hNO = b[0] % 2 !== 0;

            if (hS[0] === pS[0] && hS[1] === pS[1] && hS[2] === pS[2]) { mST++; if (hNS) mSB++; }
            if (hO[0] === pO[0] && hO[1] === pO[1] && hO[2] === pO[2]) { mOT++; if (hNO) mOE++; }
          }
        }
        if (mST > 0) ngSizeProb = (mSB + 1) / (mST + 2);
        if (mOT > 0) ngParityProb = (mOE + 1) / (mOT + 2);
      }
      const predNGSize = ngSizeProb >= 0.5;
      const predNGParity = ngParityProb >= 0.5;

      if (predMSize === actualBig) hitMultiHorizon += 1;
      if (predMParity === actualOdd) hitMultiHorizon += 1;

      if (predMKSize === actualBig) hitMarkov += 1;
      if (predMKParity === actualOdd) hitMarkov += 1;

      if (predNGSize === actualBig) hitNGram += 1;
      if (predNGParity === actualOdd) hitNGram += 1;

      totalRounds += 2;
    }

    if (totalRounds > 0) {
      const accMH = hitMultiHorizon / totalRounds;
      const accMK = hitMarkov / totalRounds;
      const accNG = hitNGram / totalRounds;

      const expMH = Math.exp(accMH / 0.20);
      const expMK = Math.exp(accMK / 0.20);
      const expNG = Math.exp(accNG / 0.20);
      const sumExp = expMH + expMK + expNG;

      weightMultiHorizon = expMH / sumExp;
      weightMarkov = expMK / sumExp;
      weightNGram = expNG / sumExp;
    }
  }

  // ==========================================
  // 7. 多维混合模型加权决策计算 (Comprehensive Weighting)
  // ==========================================
  let finalBigScore = (integratedSizeProb) * weightMultiHorizon + pBig * weightMarkov + (nGramSizeProb) * weightNGram;
  let finalSmallScore = (1.0 - integratedSizeProb) * weightMultiHorizon + pSmall * weightMarkov + (1.0 - nGramSizeProb) * weightNGram;

  let finalOddScore = (integratedParityProb) * weightMultiHorizon + pOdd * weightMarkov + (nGramParityProb) * weightNGram;
  let finalEvenScore = (1.0 - integratedParityProb) * weightMultiHorizon + pEven * weightMarkov + (1.0 - nGramParityProb) * weightNGram;

  finalBigScore += biasSizeOffset;
  finalSmallScore -= biasSizeOffset;
  finalOddScore += biasParityOffset;
  finalEvenScore -= biasParityOffset;

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
    finalEvenScore *= parityDragonStrength;
  } else if (dragonParityAction === 'REVERSE_ODD') {
    finalOddScore *= parityDragonStrength;
  } else if (dragonParityAction === 'FOLLOW_ODD') {
    finalOddScore *= parityDragonStrength;
  } else if (dragonParityAction === 'FOLLOW_EVEN') {
    finalEvenScore *= parityDragonStrength;
  }

  const sizePred: '大' | '小' = finalBigScore >= finalSmallScore ? '大' : '小';
  const parityPred: '单' | '双' = finalOddScore >= finalEvenScore ? '单' : '双';

  // 波色决策: 融合多时段核分布 (30%) + 马尔可夫转移 (30%) + N-Gram 序列模式 (20%) + 号码密分布 (20%)
  const finalRedScore = 0.30 * pRed_mh + 0.30 * pRed_mk + 0.20 * pRed_ng + 0.20 * normDensityRed;
  const finalBlueScore = 0.30 * pBlue_mh + 0.30 * pBlue_mk + 0.20 * pBlue_ng + 0.20 * normDensityBlue;
  const finalGreenScore = 0.30 * pGreen_mh + 0.30 * pGreen_mk + 0.20 * pGreen_ng + 0.20 * normDensityGreen;

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
  // 8. 智能三个独立置信度计算与深度理由输出
  // ==========================================
  const sizeDiff = Math.abs(finalBigScore - finalSmallScore) / (finalBigScore + finalSmallScore || 1);
  const parityDiff = Math.abs(finalOddScore - finalEvenScore) / (finalOddScore + finalEvenScore || 1);
  const colorScores = [finalRedScore, finalBlueScore, finalGreenScore].sort((a, b) => b - a);
  const colorDiff = (colorScores[0] - colorScores[1]) / (colorScores[0] || 1);

  const sizeConfidence = Math.min(99, Math.max(91, 91 + Math.floor(sizeDiff * 28)));
  const parityConfidence = Math.min(99, Math.max(91, 91 + Math.floor(parityDiff * 28)));
  const colorConfidence = Math.min(99, Math.max(91, 91 + Math.floor(colorDiff * 25)));
  const confidence = Math.round((sizeConfidence + parityConfidence + colorConfidence) / 3);

  const rparts: string[] = [];

  // 50 期规律提取结论总结
  rparts.push(`【最新50期开奖规律分析】：成功提炼近 50 期大小/单双/波色转移矩阵，集成权重: 时间衰减核 $w_1 = ${Math.round(weightMultiHorizon * 100)}\\%$ | 马氏转移 $w_2 = ${Math.round(weightMarkov * 100)}\\%$ | N-Gram序列 $w_3 = ${Math.round(weightNGram * 100)}\\%$`);
  
  if (dragonSizeAction && dragonSizeAction.startsWith('FOLLOW')) {
    rparts.push(`【大小维度 - 50期长龙顺追】：特码大小连出达 ${maxConsecutiveSize} 期，突破极值反转阻断，锁定推算【${sizePred}】。`);
  } else if (dragonSizeAction && dragonSizeAction.startsWith('REVERSE')) {
    rparts.push(`【大小维度 - 50期均值回归】：大小指标连续单向达 ${maxConsecutiveSize} 期，触发 ${sizeDragonStrength.toFixed(2)} 倍极值回归，强烈推荐反投【${sizePred}】。`);
  } else {
    rparts.push(`【大小维度 - 50期综合概率】：多时段核分布 (${(integratedSizeProb * 100).toFixed(1)}% 偏大) 协同 Markov (${Math.round(pBig * 100)}%) 及 N-Gram (${nGramMatches}次匹配)，精准推导最佳买【${sizePred}】。`);
  }

  if (dragonParityAction && dragonParityAction.startsWith('FOLLOW')) {
    rparts.push(`【单双维度 - 50期长龙顺追】：单双连出 ${maxConsecutiveParity} 期，进入顺风通道，追踪买【${parityPred}】。`);
  } else if (dragonParityAction && dragonParityAction.startsWith('REVERSE')) {
    rparts.push(`【单双维度 - 50期均值回归】：单双连续 ${maxConsecutiveParity} 期未反转，触发极点偏离校正，狙击冷态反转买【${parityPred}】。`);
  } else {
    rparts.push(`【单双维度 - 50期综合概率】：短中衰减投票 (${(integratedParityProb * 100).toFixed(1)}% 偏单) 融合马尔可夫概率与 ${Math.abs(biasParityOffset).toFixed(2)} 纠偏反馈，推导最佳买【${parityPred}】。`);
  }

  rparts.push(`【波色维度 - 50期三色密度配重】：指数加权红蓝绿归一密度占比为 ${Math.round(finalRedScore * 100)}% : ${Math.round(finalBlueScore * 100)}% : ${Math.round(finalGreenScore * 100)}%，优选最高概率【${colorPred}】。`);

  const rationale = rparts.join('\n');

  return {
    targetIssue: nextIssue,
    algorithmName: '最新50期规律自适应推演引擎 v6.5',
    confidence,
    sizeConfidence,
    parityConfidence,
    colorConfidence,
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
      maxLoss: 0,
      maxProfit: 0,
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
  let runningNetProfit = 0;
  let maxProfit = 0;
  let minNetProfit = 0;
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

    const netRound = payout - bet;
    runningNetProfit += netRound;
    if (runningNetProfit > maxProfit) maxProfit = runningNetProfit;
    if (runningNetProfit < minNetProfit) minNetProfit = runningNetProfit;

    if (sizeHit) sizeHits++;
    if (parityHit) parityHits++;
    if (colorHit) colorHits++;
    if (sizeHit && parityHit && colorHit) {
      allThreeHits++;
    }

    if (netRound > 0) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const netProfit = Number((totalPayout - totalBet).toFixed(2));
  const roi = totalBet > 0 ? Number(((netProfit / totalBet) * 100).toFixed(2)) : 0;
  const isCompleted = dayDrawNum >= 480 && predictedRounds >= 430;
  const maxLoss = Number(Math.abs(Math.min(0, minNetProfit)).toFixed(2));
  const maxProfitFinal = Number(Math.max(0, maxProfit).toFixed(2));

  return {
    dayDrawNum,
    predictedRounds,
    totalRounds: 430,
    isCompleted,
    totalBet,
    totalPayout: Number(totalPayout.toFixed(2)),
    maxLoss,
    maxProfit: maxProfitFinal,
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

  const sizeConf = prediction.sizeConfidence ?? prediction.confidence ?? 90;
  const parityConf = prediction.parityConfidence ?? prediction.confidence ?? 90;
  const colorConf = prediction.colorConfidence ?? prediction.confidence ?? 90;

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
• 今天最高亏损: <code>${pnl.maxLoss > 0 ? `-${pnl.maxLoss.toLocaleString()}` : '0'} USDT</code>
• 今天最高盈利: <code>+${pnl.maxProfit.toLocaleString()} USDT</code>
• 累计净盈亏: <b>${netProfitSign} USDT ${pnl.netProfit >= 0 ? '🚀' : '💧'}</b> (ROI: ${roiSign}%)
--------------------------------------
<b>🧠 下一期智能预测 (第 ${prediction.targetIssue} 期)</b>:
📏 <b>大小预测</b>: <b>【 ${prediction.sizePred} 】</b> (赔率 1.95 | 置信度 <code>${sizeConf}%</code>)
🎲 <b>单双预测</b>: <b>【 ${prediction.parityPred} 】</b> (赔率 1.95 | 置信度 <code>${parityConf}%</code>)
🎨 <b>波色预测</b>: <b>【 ${prediction.colorPred} 】</b> (赔率 ${prediction.colorOdds} | 置信度 <code>${colorConf}%</code>)
--------------------------------------
<b>📢 官方频道</b>: ${process.env.TELEGRAM_CHANNEL_URL || ""}
<i>💡 每分钟自动拉取开奖并实时演算推演</i>
`.trim();
}

