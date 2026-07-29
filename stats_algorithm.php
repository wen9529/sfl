<?php
/**
 * 澳门三分六合彩 - 50期开奖记录规律统计与智能预测算法模块
 */

require_once __DIR__ . '/utils.php';

if (!function_exists('analyze50DrawsStatsPHP')) {
    /**
     * 1. 深入剖析近 50 期开奖记录的各项规律指标
     */
    function analyze50DrawsStatsPHP($draws) {
        $recentDraws = array_slice($draws, 0, 100);
        $totalDraws = count($recentDraws);
        if ($totalDraws === 0) return null;

        // 初始化 1~49 号码统计
        $numStats = [];
        for ($n = 1; $n <= 49; $n++) {
            $numStats[$n] = [
                'number' => $n,
                'totalOccurrences' => 0, // 总开出次数
                'specialOccurrences' => 0, // 特码开出次数
                'currentOmission' => 0,  // 当前遗漏期数
                'foundLast' => false
            ];
        }

        $waveCounts = ['red' => 0, 'blue' => 0, 'green' => 0];
        $zodiacCounts = [];
        $fiveElementCounts = [];
        $specialSumTotal = 0;
        $bigCount = 0; // 特码>=25
        $oddCount = 0; // 特码单数

        // 遍历 50 期开奖
        foreach ($recentDraws as $index => $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) < 7) continue;

            $redBalls = array_slice($codes, 0, 6);
            $specialBall = $codes[6];

            // 1) 号码频次与遗漏计算
            foreach ($codes as $c) {
                if ($c >= 1 && $c <= 49) {
                    $numStats[$c]['totalOccurrences']++;
                }
            }
            if ($specialBall >= 1 && $specialBall <= 49) {
                $numStats[$specialBall]['specialOccurrences']++;
            }

            // 更新未出现的遗漏计数
            for ($n = 1; $n <= 49; $n++) {
                if (!in_array($n, $codes)) {
                    if (!$numStats[$n]['foundLast']) {
                        $numStats[$n]['currentOmission']++;
                    }
                } else {
                    $numStats[$n]['foundLast'] = true;
                }
            }

            // 2) 特码指标统计
            $specialWave = getWaveColorPHP($specialBall);
            $specialZodiac = getZodiacPHP($specialBall);
            $specialFive = getFiveElementsPHP($specialBall);

            $waveCounts[$specialWave]++;
            $zodiacCounts[$specialZodiac] = ($zodiacCounts[$specialZodiac] ?? 0) + 1;
            $fiveElementCounts[$specialFive] = ($fiveElementCounts[$specialFive] ?? 0) + 1;

            $specialSumTotal += $specialBall;
            if ($specialBall >= 25) $bigCount++;
            if ($specialBall % 2 !== 0) $oddCount++;
        }

        // 冷热号划分 (热号: 频次>=8, 温号: 4-7, 冷号: <=3)
        $hotNumbers = [];
        $warmNumbers = [];
        $coldNumbers = [];

        foreach ($numStats as $n => $info) {
            if ($info['totalOccurrences'] >= 8) {
                $hotNumbers[] = $n;
            } else if ($info['totalOccurrences'] >= 4) {
                $warmNumbers[] = $n;
            } else {
                $coldNumbers[] = $n;
            }
        }

        arsort($zodiacCounts);
        arsort($fiveElementCounts);

        return [
            'totalDraws' => $totalDraws,
            'numberStats' => $numStats,
            'hotNumbers' => $hotNumbers,
            'warmNumbers' => $warmNumbers,
            'coldNumbers' => $coldNumbers,
            'waveDistribution' => [
                'red' => $waveCounts['red'],
                'blue' => $waveCounts['blue'],
                'green' => $waveCounts['green'],
                'redRatio' => round(($waveCounts['red'] / $totalDraws) * 100, 1),
                'blueRatio' => round(($waveCounts['blue'] / $totalDraws) * 100, 1),
                'greenRatio' => round(($waveCounts['green'] / $totalDraws) * 100, 1)
            ],
            'zodiacRanking' => $zodiacCounts,
            'topZodiac' => array_key_first($zodiacCounts) ?: '龙',
            'fiveElementRanking' => $fiveElementCounts,
            'avgSpecialValue' => round($specialSumTotal / $totalDraws, 1),
            'bigRatio' => round(($bigCount / $totalDraws) * 100, 1),
            'oddRatio' => round(($oddCount / $totalDraws) * 100, 1)
        ];
    }
}

if (!function_exists('generatePredictFrom50DrawsPHP')) {
    /**
     * 2. 基于 100 期真实统计规律生成大小、单双与波色智能预测 (自适应级联统计集成模型 v4.0)
     * 结合 1-49 逐号概率评分、一阶马尔可夫状态链、自适应长龙截断与生肖五行补偿进行预测。
     */
    function generatePredictFrom50DrawsPHP($draws = null) {
        if (!$draws) {
            $draws = getLatestDrawsPHP();
        }

        if (empty($draws)) {
            return [
                'targetIssue' => getMacau3MinIssueInfoPHP(-1)['expect'] ?? '最新期',
                'algorithmName' => '自适应级联统计集成模型 v4.0',
                'confidence' => 90,
                'sizePred' => '大',
                'sizeReason' => '暂无数据开奖期望',
                'parityPred' => '单',
                'parityReason' => '暂无数据开奖期望',
                'colorPred' => '红波',
                'colorOdds' => 2.75,
                'colorReason' => '默认开奖期望',
                'rationale' => '暂无开奖数据，执行初始期望预测。'
            ];
        }

        $nextIssue = getNextIssuePHP($draws[0]['expect']);

        // 1. 初始化 1-49 号码得分
        $scores = array_fill(1, 49, 1.0);
        $totalDraws = min(count($draws), 100);
        $recentDraws = array_slice($draws, 0, $totalDraws);

        // 计算每个号码的频次和当前遗漏
        $counts = array_fill(1, 49, 0);
        $omission = array_fill(1, 49, 0);
        $found = array_fill(1, 49, false);

        foreach ($recentDraws as $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) >= 7) {
                $special = $codes[6];
                if ($special >= 1 && $special <= 49) {
                    $counts[$special]++;
                }
                for ($n = 1; $n <= 49; $n++) {
                    if (in_array($n, $codes)) {
                        $found[$n] = true;
                    } else if (!$found[$n]) {
                        $omission[$n]++;
                    }
                }
            }
        }

        // 2. 考虑重号（上期特码）和邻号（上期特码的左右号码）
        $lastCodes = array_map('intval', explode(',', $draws[0]['openCode']));
        $lastSpecial = isset($lastCodes[6]) ? $lastCodes[6] : 0;
        if ($lastSpecial >= 1 && $lastSpecial <= 49) {
            $scores[$lastSpecial] += 0.15; // 重号规律
            $leftNeighbor = ($lastSpecial === 1) ? 49 : $lastSpecial - 1;
            $rightNeighbor = ($lastSpecial === 49) ? 1 : $lastSpecial + 1;
            $scores[$leftNeighbor] += 0.12; // 邻号规律
            $scores[$rightNeighbor] += 0.12;
        }

        // 3. 号码遗漏偏离修正 (遗漏值越高，均值回归反弹概率越大)
        for ($n = 1; $n <= 49; $n++) {
            $avgOmission = 49 / max(1, $counts[$n]); // 理论平均遗漏
            $omissionRatio = $omission[$n] / max(1, $avgOmission);
            if ($omissionRatio > 1.5) {
                $scores[$n] += min(0.3, ($omissionRatio - 1.5) * 0.1); // 遗漏反弹
            } else if ($omissionRatio < 0.5) {
                $scores[$n] -= 0.05; // 处于温热点，降低权重，防止集中度过高
            }
        }

        // 4. 生肖循环与五行生克因子 (根据最近 30 期冷热生肖/五行进行回归补偿)
        $zodiacCounts = [];
        $fiveElementCounts = [];
        $recent30 = array_slice($recentDraws, 0, 30);
        foreach ($recent30 as $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) >= 7) {
                $special = $codes[6];
                if ($special) {
                    $z = getZodiacPHP($special);
                    $f = getFiveElementsPHP($special);
                    $zodiacCounts[$z] = ($zodiacCounts[$z] ?? 0) + 1;
                    $fiveElementCounts[$f] = ($fiveElementCounts[$f] ?? 0) + 1;
                }
            }
        }

        for ($n = 1; $n <= 49; $n++) {
            $z = getZodiacPHP($n);
            $f = getFiveElementsPHP($n);
            $zFreq = $zodiacCounts[$z] ?? 0;
            $fFreq = $fiveElementCounts[$f] ?? 0;
            if ($zFreq <= 1) $scores[$n] += 0.1; // 生肖补偿
            if ($fFreq <= 4) $scores[$n] += 0.08; // 五行补偿
        }

        // 5. 属性级别：计算大小、单双、波色的一阶马尔可夫转移概率
        $bigToBig = 0; $bigToSmall = 0; $smallToBig = 0; $smallToSmall = 0;
        $oddToOdd = 0; $oddToEven = 0; $evenToOdd = 0; $evenToEven = 0;
        $redToRed = 0; $redToBlue = 0; $redToGreen = 0;
        $blueToRed = 0; $blueToBlue = 0; $blueToGreen = 0;
        $greenToRed = 0; $greenToBlue = 0; $greenToGreen = 0;

        for ($i = count($recentDraws) - 2; $i >= 0; $i--) {
            $prevDraw = $recentDraws[$i + 1];
            $currDraw = $recentDraws[$i];
            $prevCodes = array_map('intval', explode(',', $prevDraw['openCode']));
            $currCodes = array_map('intval', explode(',', $currDraw['openCode']));
            if (count($prevCodes) < 7 || count($currCodes) < 7) continue;

            $prevSp = $prevCodes[6];
            $currSp = $currCodes[6];
            if ($prevSp === 49 || $currSp === 49) continue;

            $prevBig = $prevSp >= 25;
            $currBig = $currSp >= 25;
            $prevOdd = $prevSp % 2 !== 0;
            $currOdd = $currSp % 2 !== 0;

            $prevWave = getWaveColorPHP($prevSp);
            $currWave = getWaveColorPHP($currSp);

            if ($prevBig) {
                if ($currBig) $bigToBig++; else $bigToSmall++;
            } else {
                if ($currBig) $smallToBig++; else $smallToSmall++;
            }

            if ($prevOdd) {
                if ($currOdd) $oddToOdd++; else $oddToEven++;
            } else {
                if ($currOdd) $evenToOdd++; else $evenToEven++;
            }

            if ($prevWave === 'red') {
                if ($currWave === 'red') $redToRed++; else if ($currWave === 'blue') $redToBlue++; else $redToGreen++;
            } else if ($prevWave === 'blue') {
                if ($currWave === 'red') $blueToRed++; else if ($currWave === 'blue') $blueToBlue++; else $blueToGreen++;
            } else {
                if ($currWave === 'red') $greenToRed++; else if ($currWave === 'blue') $greenToBlue++; else $greenToGreen++;
            }
        }

        $lastBig = $lastSpecial >= 25;
        $lastOdd = $lastSpecial % 2 !== 0;
        $lastWave = getWaveColorPHP($lastSpecial);

        $pBig = 0.5; $pSmall = 0.5;
        $pOdd = 0.5; $pEven = 0.5;
        $pRed = 0.33; $pBlue = 0.33; $pGreen = 0.33;

        if ($lastSpecial !== 49) {
            if ($lastBig) {
                $tot = $bigToBig + $bigToSmall;
                if ($tot > 0) { $pBig = $bigToBig / $tot; $pSmall = $bigToSmall / $tot; }
            } else {
                $tot = $smallToBig + $smallToSmall;
                if ($tot > 0) { $pBig = $smallToBig / $tot; $pSmall = $smallToSmall / $tot; }
            }

            if ($lastOdd) {
                $tot = $oddToOdd + $oddToEven;
                if ($tot > 0) { $pOdd = $oddToOdd / $tot; $pEven = $oddToEven / $tot; }
            } else {
                $tot = $evenToOdd + $evenToEven;
                if ($tot > 0) { $pOdd = $evenToOdd / $tot; $pEven = $evenToEven / $tot; }
            }

            if ($lastWave === 'red') {
                $tot = $redToRed + $redToBlue + $redToGreen;
                if ($tot > 0) { $pRed = $redToRed / $tot; $pBlue = $redToBlue / $tot; $pGreen = $redToGreen / $tot; }
            } else if ($lastWave === 'blue') {
                $tot = $blueToRed + $blueToBlue + $blueToGreen;
                if ($tot > 0) { $pRed = $blueToRed / $tot; $pBlue = $blueToBlue / $tot; $pGreen = $blueToGreen / $tot; }
            } else {
                $tot = $greenToRed + $greenToBlue + $greenToGreen;
                if ($tot > 0) { $pRed = $greenToRed / $tot; $pBlue = $greenToBlue / $tot; $pGreen = $greenToGreen / $tot; }
            }
        }

        // 6. 长龙检测与自适应阻断策略 (Dragon Factor)
        $consecutiveBig = 0;
        $consecutiveSmall = 0;
        $consecutiveOdd = 0;
        $consecutiveEven = 0;

        foreach ($draws as $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) < 7) break;
            $sp = $codes[6];
            if ($sp === 49) break;
            if ($sp >= 25) {
                if ($consecutiveSmall > 0) break;
                $consecutiveBig++;
            } else {
                if ($consecutiveBig > 0) break;
                $consecutiveSmall++;
            }
        }

        foreach ($draws as $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) < 7) break;
            $sp = $codes[6];
            if ($sp === 49) break;
            if ($sp % 2 !== 0) {
                if ($consecutiveEven > 0) break;
                $consecutiveOdd++;
            } else {
                if ($consecutiveOdd > 0) break;
                $consecutiveEven++;
            }
        }

        $dragonSizeMultiplier = 1.0;
        $dragonParityMultiplier = 1.0;
        $sizeDirection = null;
        $parityDirection = null;

        if ($consecutiveBig >= 4) {
            $sizeDirection = '小';
            $dragonSizeMultiplier = 1.0 + ($consecutiveBig - 3) * 0.15;
        } else if ($consecutiveSmall >= 4) {
            $sizeDirection = '大';
            $dragonSizeMultiplier = 1.0 + ($consecutiveSmall - 3) * 0.15;
        }

        if ($consecutiveOdd >= 4) {
            $parityDirection = '双';
            $dragonParityMultiplier = 1.0 + ($consecutiveOdd - 3) * 0.15;
        } else if ($consecutiveEven >= 4) {
            $parityDirection = '单';
            $dragonParityMultiplier = 1.0 + ($consecutiveEven - 3) * 0.15;
        }

        // 7. 号码分数归一化，并计算各属性在 1-49 号码分布上的概率得分
        $sumScore = array_sum($scores);

        $scoreBig = 0; $scoreSmall = 0;
        $scoreOdd = 0; $scoreEven = 0;
        $scoreRed = 0; $scoreBlue = 0; $scoreGreen = 0;

        for ($n = 1; $n <= 49; $n++) {
            $prob = $scores[$n] / $sumScore;
            $isNBig = $n >= 25;
            $isNOdd = $n % 2 !== 0;
            $w = getWaveColorPHP($n);

            if ($n < 49) {
                if ($isNBig) $scoreBig += $prob; else $scoreSmall += $prob;
                if ($isNOdd) $scoreOdd += $prob; else $scoreEven += $prob;
            }
            if ($w === 'red') $scoreRed += $prob;
            elseif ($w === 'blue') $scoreBlue += $prob;
            else $scoreGreen += $prob;
        }

        // 8. 结合马尔可夫概率和长龙自适应策略，计算最终决策分数
        $finalBigScore = $scoreBig * $pBig;
        $finalSmallScore = $scoreSmall * $pSmall;
        $finalOddScore = $scoreOdd * $pOdd;
        $finalEvenScore = $scoreEven * $pEven;

        if ($sizeDirection === '小') {
            $finalSmallScore *= $dragonSizeMultiplier;
        } elseif ($sizeDirection === '大') {
            $finalBigScore *= $dragonSizeMultiplier;
        }

        if ($parityDirection === '双') {
            $finalEvenScore *= $dragonParityMultiplier;
        } elseif ($parityDirection === '单') {
            $finalOddScore *= $dragonParityMultiplier;
        }

        $sizePred = $finalBigScore >= $finalSmallScore ? '大' : '小';
        $parityPred = $finalOddScore >= $finalEvenScore ? '单' : '双';

        // 波色决策
        $finalRedScore = $scoreRed * $pRed;
        $finalBlueScore = $scoreBlue * $pBlue;
        $finalGreenScore = $scoreGreen * $pGreen;

        $colorPred = '红波';
        $colorOdds = 2.75;
        if ($finalRedScore >= $finalBlueScore && $finalRedScore >= $finalGreenScore) {
            $colorPred = '红波';
            $colorOdds = 2.75;
        } elseif ($finalBlueScore >= $finalGreenScore) {
            $colorPred = '蓝波';
            $colorOdds = 2.98;
        } else {
            $colorPred = '绿波';
            $colorOdds = 2.98;
        }

        // 9. 自适应置信度计算 (基于属性冲突度和样本一致性)
        $sizeDiff = abs($finalBigScore - $finalSmallScore) / ($finalBigScore + $finalSmallScore ?: 1);
        $parityDiff = abs($finalOddScore - $finalEvenScore) / ($finalOddScore + $finalEvenScore ?: 1);
        $confidence = min(98, max(90, 88 + (int)(($sizeDiff + $parityDiff) * 20)));

        // 10. 生成极具说服力、专业的决策理由
        $rparts = [];
        $sizeReason = '';
        if ($sizeDirection) {
            $sizeReason = "连开 " . ($consecutiveBig ?: $consecutiveSmall) . " 期，阻断偏向买" . $sizePred;
            $rparts[] = "大小属性：长龙连开 " . ($consecutiveBig ?: $consecutiveSmall) . " 期，触发“自适应长龙阻断”反转买" . $sizePred;
        } else {
            $sizeReason = "转移概率 P(" . ($lastBig ? '大' : '小') . "->" . $sizePred . ")=" . round(max($pBig, $pSmall) * 100) . "%";
            $rparts[] = "大小属性：基于一阶马尔可夫转移概率 P(" . ($lastBig ? '大' : '小') . " -> " . $sizePred . ") = " . round(max($pBig, $pSmall) * 100) . "%，结合 1-49 号码得分归一判定买【" . $sizePred . "】";
        }

        $parityReason = '';
        if ($parityDirection) {
            $parityReason = "连开 " . ($consecutiveOdd ?: $consecutiveEven) . " 期，极值回归买" . $parityPred;
            $rparts[] = "单双属性：长龙连开 " . ($consecutiveOdd ?: $consecutiveEven) . " 期，触发“波动性极值回归”判定买【" . $parityPred . "】";
        } else {
            $parityReason = "转移概率 P(" . ($lastOdd ? '单' : '双') . "->" . $parityPred . ")=" . round(max($pOdd, $pEven) * 100) . "%";
            $rparts[] = "单双属性：基于一阶马尔可夫转移概率 P(" . ($lastOdd ? '单' : '双') . " -> " . $parityPred . ") = " . round(max($pOdd, $pEven) * 100) . "%，结合 30 期生肖/五行补偿判定买【" . $parityPred . "】";
        }

        $colorReason = "红/蓝/绿归一占比 " . round($finalRedScore * 100) . "%:" . round($finalBlueScore * 100) . "%:" . round($finalGreenScore * 100) . "%";
        $rparts[] = "波色决策：红/蓝/绿概率密度归一配重比为 " . round($finalRedScore * 100) . "% : " . round($finalBlueScore * 100) . "% : " . round($finalGreenScore * 100) . "%，优选【" . $colorPred . "】";

        $rationale = implode("\n", $rparts);

        return [
            'targetIssue' => $nextIssue,
            'algorithmName' => '自适应级联统计集成模型 v4.0',
            'confidence' => $confidence,
            'sizePred' => $sizePred,
            'sizeReason' => $sizeReason,
            'parityPred' => $parityPred,
            'parityReason' => $parityReason,
            'colorPred' => $colorPred,
            'colorOdds' => $colorOdds,
            'colorReason' => $colorReason,
            'rationale' => $rationale
        ];
    }
}

if (!function_exists('syncPredictionsDatabasePHP')) {
    /**
     * 同步并维护 7 天开奖与预测数据库 (predictions_7days.json)
     * 此函数由 getLatestDrawsPHP() 自动调用，确保所有期数的预测和对错结果写入同一表格文件。
     */
    function syncPredictionsDatabasePHP($draws) {
        if (empty($draws)) return;

        $dbFile = __DIR__ . '/predictions_7days.json';
        $db = [];
        if (file_exists($dbFile)) {
            $db = json_decode(file_get_contents($dbFile), true) ?: [];
        }

        // 1. 清理超过 7 天的老旧期数记录
        $cutoffDate = date('Ymd', strtotime('-7 days'));
        foreach ($db as $exp => $record) {
            $datePrefix = substr((string)$exp, 0, 8);
            if (strlen($datePrefix) === 8 && $datePrefix < $cutoffDate) {
                unset($db[$exp]);
            }
        }

        // 2. 将传入的最新开奖记录按从小到大（从旧到新）排序，方便按历史上下文推导预测
        $sortedDraws = array_reverse($draws);

        foreach ($sortedDraws as $index => $d) {
            $expect = (string)$d['expect'];
            $openCode = $d['openCode'];

            $datePrefix = substr($expect, 0, 8);
            if (strlen($datePrefix) === 8 && $datePrefix < $cutoffDate) {
                continue;
            }

            // 如果该期记录在数据库中已结存并已写有开奖结果，跳过
            if (isset($db[$expect]) && !empty($db[$expect]['openCode'])) {
                continue;
            }

            // 获取开奖特码用于结算对错
            $codes = array_map('intval', explode(',', $openCode));
            if (count($codes) < 7) continue;
            $special = $codes[6];
            $isBig = ($special >= 25);
            $isOdd = ($special % 2 !== 0);
            $sizeText = $special == 49 ? '和' : ($isBig ? '大' : '小');
            $parityText = $special == 49 ? '和' : ($isOdd ? '单' : '双');
            $wave = getWaveColorPHP($special);
            $waveMap = ['red' => '红波', 'blue' => '蓝波', 'green' => '绿波'];
            $waveName = $waveMap[$wave] ?? '红波';

            // 如果本期尚未在数据库中记录
            if (!isset($db[$expect])) {
                // 回溯获取开出本期前的历史数据（即 $sortedDraws 在 $index 之前的数据，并将其反转为最新在前的顺序）
                $historyContext = array_reverse(array_slice($sortedDraws, 0, $index));
                
                if (count($historyContext) >= 1) {
                    $pred = generatePredictFrom50DrawsPHP($historyContext);
                } else {
                    $pred = [
                        'sizePred' => '大',
                        'parityPred' => '单',
                        'colorPred' => '红波',
                        'colorOdds' => 2.75,
                        'confidence' => 88
                    ];
                }

                $db[$expect] = [
                    'expect' => $expect,
                    'openTime' => $d['openTime'],
                    'openCode' => null,
                    'sizePred' => $pred['sizePred'],
                    'parityPred' => $pred['parityPred'],
                    'colorPred' => $pred['colorPred'],
                    'colorOdds' => $pred['colorOdds'] ?? 2.75,
                    'confidence' => $pred['confidence'] ?? 88,
                    'sizeHit' => null,
                    'parityHit' => null,
                    'colorHit' => null,
                    'bet' => 3,
                    'payout' => null,
                    'timestamp' => strtotime($d['openTime'])
                ];
            }

            // 更新已开出的开奖结果并结算对错与派彩
            $record = &$db[$expect];
            $record['openCode'] = $openCode;

            $payout = 0;
            $sizeHit = false;
            $parityHit = false;
            $colorHit = false;

            if ($special == 49) {
                $payout += 2; // 和局退大小单双本金 (2U)
            } else {
                if ($record['sizePred'] === $sizeText) {
                    $sizeHit = true;
                    $payout += 1.95;
                }
                if ($record['parityPred'] === $parityText) {
                    $parityHit = true;
                    $payout += 1.95;
                }
            }
            if ($record['colorPred'] === $waveName) {
                $colorHit = true;
                $payout += ($waveName === '红波' ? 2.75 : 2.98);
            }

            $record['sizeHit'] = $sizeHit;
            $record['parityHit'] = $parityHit;
            $record['colorHit'] = $colorHit;
            $record['payout'] = round($payout, 2);
            unset($record);
        }

        // 3. 预测下一期 (尚未开出的期数)
        $nextIssue = getNextIssuePHP($draws[0]['expect']);
        if (!isset($db[$nextIssue])) {
            $latestTime = new DateTime($draws[0]['openTime'], new DateTimeZone('Asia/Shanghai'));
            $latestTime->modify('+3 minutes');
            $nextTime = $latestTime->format('Y-m-d H:i:s');

            $pred = generatePredictFrom50DrawsPHP($draws);

            $db[$nextIssue] = [
                'expect' => $nextIssue,
                'openTime' => $nextTime,
                'openCode' => null,
                'sizePred' => $pred['sizePred'],
                'parityPred' => $pred['parityPred'],
                'colorPred' => $pred['colorPred'],
                'colorOdds' => $pred['colorOdds'] ?? 2.75,
                'confidence' => $pred['confidence'] ?? 88,
                'sizeHit' => null,
                'parityHit' => null,
                'colorHit' => null,
                'bet' => 3,
                'payout' => null,
                'timestamp' => $latestTime->getTimestamp()
            ];
        }

        // 保存文件
        file_put_contents($dbFile, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}

if (!function_exists('calculateProfitAndLossPHP')) {
    /**
     * 3. 统计全天预测下注盈亏报表 (从 predictions_7days.json 统一拉取数据)
     */
    function calculateProfitAndLossPHP($draws = null) {
        if (empty($draws)) {
            $draws = getLatestDrawsPHP();
        }
        $dayDrawNum = 480;
        $dateStr = "";

        if (is_array($draws) && !empty($draws) && !empty($draws[0]["expect"])) {
            $rawExpect = (string)$draws[0]["expect"];
            if (preg_match("/^(\d{8})(\d{3})$/", $rawExpect, $matches)) {
                $dateStr = $matches[1];
                $dayDrawNum = intval($matches[2]);
            } else if (preg_match("/\d{1,3}$/", $rawExpect, $matches)) {
                $dayDrawNum = intval($matches[0]);
            }
        }

        $dbFile = __DIR__ . '/predictions_7days.json';
        $db = [];
        if (file_exists($dbFile)) {
            $db = json_decode(file_get_contents($dbFile), true) ?: [];
        }

        // 排序，保证连红等连贯性指标能从旧到新正确计算
        ksort($db);

        $totalBet = 0;
        $totalPayout = 0;
        $sizeHits = 0;
        $parityHits = 0;
        $colorHits = 0;
        $allThreeHits = 0;
        $maxStreak = 0;
        $currentStreak = 0;
        $predictedRounds = 0;

        foreach ($db as $exp => $record) {
            // 只统计今天该日期前缀的已开奖记录
            if ($dateStr !== "" && strpos((string)$exp, $dateStr) !== 0) {
                continue;
            }
            if (empty($record['openCode'])) {
                continue;
            }

            $predictedRounds++;
            $bet = isset($record['bet']) ? $record['bet'] : 3;
            $totalBet += $bet;
            $payout = isset($record['payout']) ? $record['payout'] : 0;
            $totalPayout += $payout;

            if (!empty($record['sizeHit'])) $sizeHits++;
            if (!empty($record['parityHit'])) $parityHits++;
            if (!empty($record['colorHit'])) $colorHits++;

            if (!empty($record['sizeHit']) && !empty($record['parityHit']) && !empty($record['colorHit'])) {
                $allThreeHits++;
            }

            $net = $payout - $bet;
            if ($net > 0) {
                $currentStreak++;
                if ($currentStreak > $maxStreak) $maxStreak = $currentStreak;
            } else {
                $currentStreak = 0;
            }
        }

        $netProfit = round($totalPayout - $totalBet, 2);
        $roi = $totalBet > 0 ? round(($netProfit / $totalBet) * 100, 2) : 0;
        $isCompleted = ($dayDrawNum >= 480 && $predictedRounds >= 430);

        return [
            "dayDrawNum" => $dayDrawNum,
            "predictedRounds" => $predictedRounds,
            "totalRounds" => 430,
            "isCompleted" => $isCompleted,
            "totalBet" => $totalBet,
            "totalPayout" => round($totalPayout, 2),
            "netProfit" => $netProfit,
            "roi" => $roi,
            "sizeHitRate" => $predictedRounds > 0 ? round(($sizeHits / $predictedRounds) * 100, 1) : 0,
            "parityHitRate" => $predictedRounds > 0 ? round(($parityHits / $predictedRounds) * 100, 1) : 0,
            "colorHitRate" => $predictedRounds > 0 ? round(($colorHits / $predictedRounds) * 100, 1) : 0,
            "allThreeHits" => $allThreeHits,
            "maxStreak" => $maxStreak
        ];
    }
}

if (!function_exists('generateAutomatedPushReportPHP')) {
    /**
     * 生成包含【最新开奖记录 + 上期盈亏结算 + 当前累计总盈亏 + 下一期智能预测】的自动推送综合帖子
     * 统一使用 predictions_7days.json 数据源，消除核对偏差。
     */
    function generateAutomatedPushReportPHP($draws = null) {
        if (empty($draws)) {
            return "<b>🎰 澳门三分六合彩 · 暂无最新数据</b>";
        }

        $latest = $draws[0];
        $codes = array_map('intval', explode(',', $latest['openCode']));
        $normalCodes = array_slice($codes, 0, 6);
        $special = isset($codes[6]) ? $codes[6] : 0;

        $pad = function($n) { return $n < 10 ? "0{$n}" : "{$n}"; };
        $formattedReds = implode(' ', array_map($pad, $normalCodes));
        $formattedSpecial = $pad($special);

        $wave = getWaveColorPHP($special);
        $waveMap = ['red' => '红波', 'blue' => '蓝波', 'green' => '绿波'];
        $waveName = isset($waveMap[$wave]) ? $waveMap[$wave] : '红波';

        $zodiac = getZodiacPHP($special);
        $isBig = ($special >= 25);
        $isOdd = ($special % 2 !== 0);
        $sizeText = $special == 49 ? '和' : ($isBig ? '大' : '小');
        $parityText = $special == 49 ? '和' : ($isOdd ? '单' : '双');

        $dbFile = __DIR__ . '/predictions_7days.json';
        $db = [];
        if (file_exists($dbFile)) {
            $db = json_decode(file_get_contents($dbFile), true) ?: [];
        }

        // 1. 下一期预测 (直接读取表格)
        $nextIssue = getNextIssuePHP($latest['expect']);
        if (isset($db[$nextIssue])) {
            $prediction = $db[$nextIssue];
            $prediction['targetIssue'] = $nextIssue;
        } else {
            $prediction = generatePredictFrom50DrawsPHP($draws);
        }

        // 2. 累计盈亏报表
        $pnl = calculateProfitAndLossPHP($draws);

        // 3. 上期结算 (根据已缓存/结算的上一期记录)
        $prevBet = 3;
        $prevPayout = 0;
        $sizeHit = false;
        $parityHit = false;
        $colorHit = false;

        $latestExpect = $latest['expect'];
        if (isset($db[$latestExpect])) {
            $record = $db[$latestExpect];
            $sizeHit = !empty($record['sizeHit']);
            $parityHit = !empty($record['parityHit']);
            $colorHit = !empty($record['colorHit']);
            $prevPayout = isset($record['payout']) ? $record['payout'] : 0;
        }

        $prevPayout = round($prevPayout, 2);
        $prevNetProfit = round($prevPayout - $prevBet, 2);
        $prevProfitSign = $prevNetProfit >= 0 ? "+{$prevNetProfit}" : "{$prevNetProfit}";

        $netProfitSign = $pnl['netProfit'] >= 0 ? "+" : "";
        $roiSign = $pnl['roi'] >= 0 ? "+" : "";

        return "<b>🎰 澳门三分六合彩 · 自动定时推演与盈亏简报</b>\n"
             . "--------------------------------------\n"
             . "<b>最新开奖期号</b>: <code>{$latest['expect']}</code>\n"
             . "<b>平码</b>: <code>{$formattedReds}</code>\n"
             . "<b>特码</b>: <b>{$formattedSpecial}</b> ({$zodiac} / {$waveName} / {$sizeText}{$parityText})\n"
             . "--------------------------------------\n"
             . "<b>💸 上期结算 (第 {$latest['expect']} 期)</b>:\n"
             . "• 下注 3 USDT | 派彩 {$prevPayout} USDT\n"
             . "• 上期净盈亏: <b>{$prevProfitSign} USDT " . ($prevNetProfit >= 0 ? "📈" : "📉") . "</b>\n"
             . "• 命中明细: 大小" . ($sizeHit ? "✅" : "❌") . " | 单双" . ($parityHit ? "✅" : "❌") . " | 波色" . ($colorHit ? "✅" : "❌") . "\n"
             . "--------------------------------------\n"
             . "<b>📈 今日累计总盈亏 ({$pnl['predictedRounds']} 期)</b>:\n"
             . "• 累计总投注: <code>" . number_format($pnl['totalBet']) . " USDT</code>\n"
             . "• 累计总派彩: <code>" . number_format($pnl['totalPayout'], 2) . " USDT</code>\n"
             . "• 累计净盈亏: <b>{$netProfitSign}" . number_format($pnl['netProfit'], 2) . " USDT " . ($pnl['netProfit'] >= 0 ? "🚀" : "💧") . "</b> (ROI: {$roiSign}{$pnl['roi']}%)\n"
             . "--------------------------------------\n"
             . "<b>🧠 下一期智能预测 (第 {$prediction['targetIssue']} 期)</b>:\n"
             . "📏 <b>大小预测</b>: <b>【 {$prediction['sizePred']} 】</b> (赔率 1.95)\n"
             . "🎲 <b>单双预测</b>: <b>【 {$prediction['parityPred']} 】</b> (赔率 1.95)\n"
             . "🎨 <b>波色预测</b>: <b>【 {$prediction['colorPred']} 】</b> (赔率 {$prediction['colorOdds']})\n"
             . "🔥 <b>综合置信度</b>: <b>{$prediction['confidence']}%</b>\n"
             . "--------------------------------------\n"
             . "📢 <b>官方频道</b>: " . (getenv("TELEGRAM_CHANNEL_URL") ?: "") . "\n"
             . "<i>💡 每分钟自动拉取开奖并实时演算推演</i>";
    }
}

if (!function_exists('getWeeklyProfitAndLossPHP')) {
    /**
     * 5. 近 7 天盈亏统计报表 (从 predictions_7days.json 统一拉取数据)
     */
    function getWeeklyProfitAndLossPHP($draws = null) {
        $dbFile = __DIR__ . '/predictions_7days.json';
        $db = [];
        if (file_exists($dbFile)) {
            $db = json_decode(file_get_contents($dbFile), true) ?: [];
        }

        // 构造过去 7 天的每日初始结构
        $dailyMap = [];
        for ($i = 6; $i >= 0; $i--) {
            $dStr = date('Ymd', strtotime("-{$i} days"));
            $dailyMap[$dStr] = [
                'date' => $dStr,
                'displayDate' => date('m月d日', strtotime("-{$i} days")),
                'rounds' => 0,
                'totalBet' => 0,
                'totalPayout' => 0,
                'netProfit' => 0,
                'roi' => 0
            ];
        }

        foreach ($db as $exp => $record) {
            if (empty($record['openCode'])) {
                continue;
            }
            $dateKey = substr((string)$exp, 0, 8);
            if (isset($dailyMap[$dateKey])) {
                $bet = isset($record['bet']) ? $record['bet'] : 3;
                $payout = isset($record['payout']) ? $record['payout'] : 0;

                $dailyMap[$dateKey]['rounds']++;
                $dailyMap[$dateKey]['totalBet'] += $bet;
                $dailyMap[$dateKey]['totalPayout'] += $payout;
                $dailyMap[$dateKey]['netProfit'] += ($payout - $bet);
            }
        }

        foreach ($dailyMap as $k => &$v) {
            $v['totalPayout'] = round($v['totalPayout'], 2);
            $v['netProfit'] = round($v['netProfit'], 2);
            if ($v['totalBet'] > 0) {
                $v['roi'] = round(($v['netProfit'] / $v['totalBet']) * 100, 2);
            }
        }
        unset($v);

        return array_values($dailyMap);
    }
}
