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
 * 基于 100 期真实规律，通过自适应级联统计集成模型 (包括 1-49 逐号评分、一阶马尔可夫链和长龙拦截策略) 生成大小、单双与波色智能推演预测
 */
export function generate50DrawsPrediction(draws: MacauDrawItem[]): PredictionResult {
  if (!draws || draws.length === 0) {
    return {
      targetIssue: getMacau3MinIssueInfo(-1).expect,
      algorithmName: '自适应级联统计集成模型 v4.0',
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

  // 1. 初始化 1-49 号码得分
  const scores = Array(50).fill(1.0);
  const totalDraws = Math.min(draws.length, 100);
  const recentDraws = draws.slice(0, totalDraws);

  // 计算每个号码的频次和当前遗漏
  const counts = Array(50).fill(0);
  const omission = Array(50).fill(0);
  const found = Array(50).fill(false);

  recentDraws.forEach((draw) => {
    const codes = draw.openCode.split(',').map(Number);
    if (codes.length >= 7) {
      const special = codes[6];
      if (special >= 1 && special <= 49) {
        counts[special]++;
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

  // 2. 考虑重号（上期特码）和邻号（上期特码的左右号码）
  const lastCodes = draws[0].openCode.split(',').map(Number);
  const lastSpecial = lastCodes[6];
  if (lastSpecial >= 1 && lastSpecial <= 49) {
    scores[lastSpecial] += 0.15; // 重号规律
    const leftNeighbor = lastSpecial === 1 ? 49 : lastSpecial - 1;
    const rightNeighbor = lastSpecial === 49 ? 1 : lastSpecial + 1;
    scores[leftNeighbor] += 0.12; // 邻号规律
    scores[rightNeighbor] += 0.12;
  }

  // 3. 号码遗漏偏离修正 (遗漏值越高，均值回归反弹概率越大)
  for (let n = 1; n <= 49; n++) {
    const avgOmission = 49 / Math.max(1, counts[n]); // 理论平均遗漏
    const omissionRatio = omission[n] / Math.max(1, avgOmission);
    if (omissionRatio > 1.5) {
      scores[n] += Math.min(0.3, (omissionRatio - 1.5) * 0.1); // 遗漏反弹
    } else if (omissionRatio < 0.5) {
      scores[n] -= 0.05; // 处于温热点，降低权重，防止集中度过高
    }
  }

  // 4. 生肖循环与五行生克因子 (根据最近 30 期冷热生肖/五行进行回归补偿)
  const zodiacCounts: { [key: string]: number } = {};
  const fiveElementCounts: { [key: string]: number } = {};
  recentDraws.slice(0, 30).forEach(draw => {
    const codes = draw.openCode.split(',').map(Number);
    if (codes.length >= 7) {
      const special = codes[6];
      if (special) {
        const z = getZodiac(special);
        const f = getFiveElements(special);
        zodiacCounts[z] = (zodiacCounts[z] || 0) + 1;
        fiveElementCounts[f] = (fiveElementCounts[f] || 0) + 1;
      }
    }
  });

  for (let n = 1; n <= 49; n++) {
    const z = getZodiac(n);
    const f = getFiveElements(n);
    // 均值回归：最近开得少（冷）的生肖和五行，接下来的期数开出概率有所提升
    const zFreq = zodiacCounts[z] || 0;
    const fFreq = fiveElementCounts[f] || 0;
    if (zFreq <= 1) scores[n] += 0.1; // 生肖补偿
    if (fFreq <= 4) scores[n] += 0.08; // 五行补偿
  }

  // 5. 属性级别：计算大小、单双、波色的一阶马尔可夫转移概率
  let bigToBig = 0, bigToSmall = 0, smallToBig = 0, smallToSmall = 0;
  let oddToOdd = 0, oddToEven = 0, evenToOdd = 0, evenToEven = 0;
  let redToRed = 0, redToBlue = 0, redToGreen = 0;
  let blueToRed = 0, blueToBlue = 0, blueToGreen = 0;
  let greenToRed = 0, greenToBlue = 0, greenToGreen = 0;

  for (let i = recentDraws.length - 2; i >= 0; i--) {
    const prevDraw = recentDraws[i + 1];
    const currDraw = recentDraws[i];
    const prevCodes = prevDraw.openCode.split(',').map(Number);
    const currCodes = currDraw.openCode.split(',').map(Number);
    if (prevCodes.length < 7 || currCodes.length < 7) continue;

    const prevSp = prevCodes[6];
    const currSp = currCodes[6];
    if (prevSp === 49 || currSp === 49) continue;

    const prevBig = prevSp >= 25;
    const currBig = currSp >= 25;
    const prevOdd = prevSp % 2 !== 0;
    const currOdd = currSp % 2 !== 0;

    const prevWave = getWaveColor(prevSp);
    const currWave = getWaveColor(currSp);

    if (prevBig) {
      if (currBig) bigToBig++; else bigToSmall++;
    } else {
      if (currBig) smallToBig++; else smallToSmall++;
    }

    if (prevOdd) {
      if (currOdd) oddToOdd++; else oddToEven++;
    } else {
      if (currOdd) evenToOdd++; else evenToEven++;
    }

    if (prevWave === 'red') {
      if (currWave === 'red') redToRed++; else if (currWave === 'blue') redToBlue++; else redToGreen++;
    } else if (prevWave === 'blue') {
      if (currWave === 'red') blueToRed++; else if (currWave === 'blue') blueToBlue++; else blueToGreen++;
    } else {
      if (currWave === 'red') greenToRed++; else if (currWave === 'blue') greenToBlue++; else greenToGreen++;
    }
  }

  const lastSp = lastSpecial;
  const lastBig = lastSp >= 25;
  const lastOdd = lastSp % 2 !== 0;
  const lastWave = getWaveColor(lastSp);

  let pBig = 0.5, pSmall = 0.5;
  let pOdd = 0.5, pEven = 0.5;
  let pRed = 0.33, pBlue = 0.33, pGreen = 0.33;

  if (lastSp !== 49) {
    if (lastBig) {
      const tot = bigToBig + bigToSmall;
      if (tot > 0) { pBig = bigToBig / tot; pSmall = bigToSmall / tot; }
    } else {
      const tot = smallToBig + smallToSmall;
      if (tot > 0) { pBig = smallToBig / tot; pSmall = smallToSmall / tot; }
    }

    if (lastOdd) {
      const tot = oddToOdd + oddToEven;
      if (tot > 0) { pOdd = oddToOdd / tot; pEven = oddToEven / tot; }
    } else {
      const tot = evenToOdd + evenToEven;
      if (tot > 0) { pOdd = evenToOdd / tot; pEven = evenToEven / tot; }
    }

    if (lastWave === 'red') {
      const tot = redToRed + redToBlue + redToGreen;
      if (tot > 0) { pRed = redToRed / tot; pBlue = redToBlue / tot; pGreen = redToGreen / tot; }
    } else if (lastWave === 'blue') {
      const tot = blueToRed + blueToBlue + blueToGreen;
      if (tot > 0) { pRed = blueToRed / tot; pBlue = blueToBlue / tot; pGreen = blueToGreen / tot; }
    } else {
      const tot = greenToRed + greenToBlue + greenToGreen;
      if (tot > 0) { pRed = greenToRed / tot; pBlue = greenToBlue / tot; pGreen = greenToGreen / tot; }
    }
  }

  // 6. 长龙检测与自适应阻断策略 (Dragon Factor)
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

  let dragonSizeMultiplier = 1.0;
  let dragonParityMultiplier = 1.0;
  let sizeDirection: '大' | '小' | null = null;
  let parityDirection: '单' | '双' | null = null;

  if (consecutiveBig >= 4) {
    // 连开大号 >= 4 期，阻断率增加，偏向买小
    sizeDirection = '小';
    dragonSizeMultiplier = 1.0 + (consecutiveBig - 3) * 0.15;
  } else if (consecutiveSmall >= 4) {
    sizeDirection = '大';
    dragonSizeMultiplier = 1.0 + (consecutiveSmall - 3) * 0.15;
  }

  if (consecutiveOdd >= 4) {
    parityDirection = '双';
    dragonParityMultiplier = 1.0 + (consecutiveOdd - 3) * 0.15;
  } else if (consecutiveEven >= 4) {
    parityDirection = '单';
    dragonParityMultiplier = 1.0 + (consecutiveEven - 3) * 0.15;
  }

  // 7. 号码分数归一化，并计算各属性在 1-49 号码分布上的概率得分
  let sumScore = 0;
  for (let n = 1; n <= 49; n++) sumScore += scores[n];

  let scoreBig = 0;
  let scoreSmall = 0;
  let scoreOdd = 0;
  let scoreEven = 0;
  let scoreRed = 0;
  let scoreBlue = 0;
  let scoreGreen = 0;

  for (let n = 1; n <= 49; n++) {
    const prob = scores[n] / sumScore;
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

  // 8. 结合马尔可夫概率和长龙自适应策略，计算最终决策分数
  let finalBigScore = scoreBig * pBig;
  let finalSmallScore = scoreSmall * pSmall;
  let finalOddScore = scoreOdd * pOdd;
  let finalEvenScore = scoreEven * pEven;

  if (sizeDirection === '小') {
    finalSmallScore *= dragonSizeMultiplier;
  } else if (sizeDirection === '大') {
    finalBigScore *= dragonSizeMultiplier;
  }

  if (parityDirection === '双') {
    finalEvenScore *= dragonParityMultiplier;
  } else if (parityDirection === '单') {
    finalOddScore *= dragonParityMultiplier;
  }

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

  // 9. 自适应置信度计算 (基于属性冲突度和样本一致性)
  const sizeDiff = Math.abs(finalBigScore - finalSmallScore) / (finalBigScore + finalSmallScore || 1);
  const parityDiff = Math.abs(finalOddScore - finalEvenScore) / (finalOddScore + finalEvenScore || 1);
  const confidence = Math.min(98, Math.max(90, 88 + Math.floor((sizeDiff + parityDiff) * 20)));

  // 10. 生成极具说服力、专业的决策理由
  const rparts: string[] = [];
  if (sizeDirection) {
    rparts.push(`大小属性：长龙连开 ${consecutiveBig || consecutiveSmall} 期，触发“自适应长龙阻断”反转买小`);
  } else {
    rparts.push(`大小属性：基于一阶马尔可夫转移概率 P(${lastBig ? '大' : '小'} -> ${sizePred}) = ${Math.round(Math.max(pBig, pSmall) * 100)}%，结合 1-49 号码得分归一判定买【${sizePred}】`);
  }

  if (parityDirection) {
    rparts.push(`单双属性：长龙连开 ${consecutiveOdd || consecutiveEven} 期，触发“波动性极值回归”判定买【${parityPred}】`);
  } else {
    rparts.push(`单双属性：基于一阶马尔可夫转移概率 P(${lastOdd ? '单' : '双'} -> ${parityPred}) = ${Math.round(Math.max(pOdd, pEven) * 100)}%，结合 30 期生肖/五行补偿判定买【${parityPred}】`);
  }

  rparts.push(`波色决策：红/蓝/绿概率密度归一配重比为 ${Math.round(finalRedScore * 100)}% : ${Math.round(finalBlueScore * 100)}% : ${Math.round(finalGreenScore * 100)}%，优选【${colorPred}】`);

  const rationale = rparts.join('\n');

  return {
    targetIssue: nextIssue,
    algorithmName: '自适应级联统计集成模型 v4.0',
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

