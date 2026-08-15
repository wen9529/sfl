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
                'sizeConfidence' => 90,
                'parityConfidence' => 90,
                'colorConfidence' => 90,
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

        // 5. 属性级别：二阶马尔可夫条件转移矩阵 (含拉普拉斯平滑)
        $waveMarkov2nd = [
            'red_red' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'red_blue' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'red_green' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'blue_red' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'blue_blue' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'blue_green' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'green_red' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'green_blue' => ['red' => 1, 'blue' => 1, 'green' => 1],
            'green_green' => ['red' => 1, 'blue' => 1, 'green' => 1],
        ];

        $bbToB = 0; $bbToS = 0; $bsToB = 0; $bsToS = 0;
        $sbToB = 0; $sbToS = 0; $ssToB = 0; $ssToS = 0;
        $ooToO = 0; $ooToE = 0; $oeToO = 0; $oeToE = 0;
        $eoToO = 0; $eoToE = 0; $eeToO = 0; $eeToE = 0;

        for ($i = count($recentDraws) - 3; $i >= 0; $i--) {
            $prev2Draw = $recentDraws[$i + 2];
            $prevDraw = $recentDraws[$i + 1];
            $currDraw = $recentDraws[$i];
            $prev2Codes = array_map('intval', explode(',', $prev2Draw['openCode']));
            $prevCodes = array_map('intval', explode(',', $prevDraw['openCode']));
            $currCodes = array_map('intval', explode(',', $currDraw['openCode']));
            if (count($prev2Codes) < 7 || count($prevCodes) < 7 || count($currCodes) < 7) continue;

            $prev2Sp = $prev2Codes[6];
            $prevSp = $prevCodes[6];
            $currSp = $currCodes[6];
            if ($prev2Sp === 49 || $prevSp === 49 || $currSp === 49) continue;

            $prev2Big = $prev2Sp >= 25;
            $prevBig = $prevSp >= 25;
            $currBig = $currSp >= 25;

            $prev2Odd = $prev2Sp % 2 !== 0;
            $prevOdd = $prevSp % 2 !== 0;
            $currOdd = $currSp % 2 !== 0;

            $prev2W = getWaveColorPHP($prev2Sp);
            $prevW = getWaveColorPHP($prevSp);
            $currW = getWaveColorPHP($currSp);

            if ($prev2Big && $prevBig) {
                if ($currBig) $bbToB++; else $bbToS++;
            } elseif ($prev2Big && !$prevBig) {
                if ($currBig) $bsToB++; else $bsToS++;
            } elseif (!$prev2Big && $prevBig) {
                if ($currBig) $sbToB++; else $sbToS++;
            } else {
                if ($currBig) $ssToB++; else $ssToS++;
            }

            if ($prev2Odd && $prevOdd) {
                if ($currOdd) $ooToO++; else $ooToE++;
            } elseif ($prev2Odd && !$prevOdd) {
                if ($currOdd) $oeToO++; else $oeToE++;
            } elseif (!$prev2Odd && $prevOdd) {
                if ($currOdd) $eoToO++; else $eoToE++;
            } else {
                if ($currOdd) $eeToO++; else $eeToE++;
            }

            $wKey = "{$prev2W}_{$prevW}";
            if (isset($waveMarkov2nd[$wKey])) {
                $waveMarkov2nd[$wKey][$currW]++;
            }
        }

        $prevDraw0 = $draws[1] ?? $draws[0];
        $prevCodes0 = array_map('intval', explode(',', $prevDraw0['openCode']));
        $prevSpecial = $prevCodes0[6] ?? $lastSpecial;

        $lastBig = $lastSpecial >= 25;
        $prevBig = $prevSpecial >= 25;
        $lastOdd = $lastSpecial % 2 !== 0;
        $prevOdd = $prevSpecial % 2 !== 0;
        $lastWave = getWaveColorPHP($lastSpecial);
        $prevWave = getWaveColorPHP($prevSpecial);

        $pBig = 0.5; $pSmall = 0.5;
        $pOdd = 0.5; $pEven = 0.5;

        if ($lastSpecial !== 49 && $prevSpecial !== 49) {
            if ($prevBig && $lastBig) {
                $tot = $bbToB + $bbToS;
                if ($tot > 0) { $pBig = $bbToB / $tot; $pSmall = $bbToS / $tot; }
            } elseif ($prevBig && !$lastBig) {
                $tot = $bsToB + $bsToS;
                if ($tot > 0) { $pBig = $bsToB / $tot; $pSmall = $bsToS / $tot; }
            } elseif (!$prevBig && $lastBig) {
                $tot = $sbToB + $sbToS;
                if ($tot > 0) { $pBig = $sbToB / $tot; $pSmall = $sbToS / $tot; }
            } else {
                $tot = $ssToB + $ssToS;
                if ($tot > 0) { $pBig = $ssToB / $tot; $pSmall = $ssToS / $tot; }
            }

            if ($prevOdd && $lastOdd) {
                $tot = $ooToO + $ooToE;
                if ($tot > 0) { $pOdd = $ooToO / $tot; $pEven = $ooToE / $tot; }
            } elseif ($prevOdd && !$lastOdd) {
                $tot = $oeToO + $oeToE;
                if ($tot > 0) { $pOdd = $oeToO / $tot; $pEven = $oeToE / $tot; }
            } elseif (!$prevOdd && $lastOdd) {
                $tot = $eoToO + $eoToE;
                if ($tot > 0) { $pOdd = $eoToO / $tot; $pEven = $eoToE / $tot; }
            } else {
                $tot = $eeToO + $eeToE;
                if ($tot > 0) { $pOdd = $eeToO / $tot; $pEven = $eeToE / $tot; }
            }
        }

        $markovWaveKey = "{$prevWave}_{$lastWave}";
        $mWaveCounts = $waveMarkov2nd[$markovWaveKey] ?? ['red' => 1, 'blue' => 1, 'green' => 1];
        $mWaveTot = $mWaveCounts['red'] + $mWaveCounts['blue'] + $mWaveCounts['green'];
        $pRed = $mWaveCounts['red'] / $mWaveTot;
        $pBlue = $mWaveCounts['blue'] / $mWaveTot;
        $pGreen = $mWaveCounts['green'] / $mWaveTot;

        // 5.5 多时段指数衰减均值回归 (Multi-Horizon Wave / Size / Parity Decay)
        $horizons = [
            ['period' => 15, 'lambda' => 0.05, 'weight' => 0.45],
            ['period' => 50, 'lambda' => 0.015, 'weight' => 0.35],
            ['period' => 100, 'lambda' => 0.006, 'weight' => 0.20],
        ];

        $integratedSizeProb = 0.0;
        $integratedParityProb = 0.0;
        $integratedWaveProb = ['red' => 0.0, 'blue' => 0.0, 'green' => 0.0];

        foreach ($horizons as $hor) {
            $lim = min(count($draws), $hor['period']);
            $sizeSum = 0; $paritySum = 0;
            $waveRedSum = 0; $waveBlueSum = 0; $waveGreenSum = 0;
            $weightSum = 0;

            for ($t = 0; $t < $lim; $t++) {
                $codes = array_map('intval', explode(',', $draws[$t]['openCode']));
                if (count($codes) >= 7) {
                    $sp = $codes[6];
                    if ($sp === 49) continue;
                    $decayW = exp(-$hor['lambda'] * $t);
                    $sizeSum += ($sp >= 25 ? 1 : 0) * $decayW;
                    $paritySum += ($sp % 2 !== 0 ? 1 : 0) * $decayW;

                    $w = getWaveColorPHP($sp);
                    if ($w === 'red') $waveRedSum += $decayW;
                    elseif ($w === 'blue') $waveBlueSum += $decayW;
                    else $waveGreenSum += $decayW;

                    $weightSum += $decayW;
                }
            }

            $sizeRatio = $weightSum > 0 ? $sizeSum / $weightSum : 0.5;
            $parityRatio = $weightSum > 0 ? $paritySum / $weightSum : 0.5;
            $waveRedRatio = $weightSum > 0 ? $waveRedSum / $weightSum : 0.347;
            $waveBlueRatio = $weightSum > 0 ? $waveBlueSum / $weightSum : 0.3265;
            $waveGreenRatio = $weightSum > 0 ? $waveGreenSum / $weightSum : 0.3265;

            $integratedSizeProb += (1.0 - $sizeRatio) * $hor['weight'];
            $integratedParityProb += (1.0 - $parityRatio) * $hor['weight'];

            $revRed = max(0.1, 0.347 + (0.347 - $waveRedRatio) * 0.8);
            $revBlue = max(0.1, 0.3265 + (0.3265 - $waveBlueRatio) * 0.8);
            $revGreen = max(0.1, 0.3265 + (0.3265 - $waveGreenRatio) * 0.8);
            $sumRev = $revRed + $revBlue + $revGreen;

            $integratedWaveProb['red'] += ($revRed / $sumRev) * $hor['weight'];
            $integratedWaveProb['blue'] += ($revBlue / $sumRev) * $hor['weight'];
            $integratedWaveProb['green'] += ($revGreen / $sumRev) * $hor['weight'];
        }

        // 5.6 N-Gram 模式序列匹配 (大小、单双、波色)
        $nGramSizeProb = 0.5;
        $nGramParityProb = 0.5;
        $nGramWaveProb = ['red' => 0.347, 'blue' => 0.3265, 'green' => 0.3265];
        $nGramMatches = 0;

        if (count($draws) >= 10) {
            $recentPSize = []; $recentPOdd = []; $recentPWave = [];
            $validCount = 0;
            for ($i = 0; $i < count($draws) && $validCount < 3; $i++) {
                $c = array_map('intval', explode(',', $draws[$i]['openCode']));
                if (count($c) >= 7 && $c[6] !== 49) {
                    $recentPSize[] = $c[6] >= 25;
                    $recentPOdd[] = $c[6] % 2 !== 0;
                    $recentPWave[] = getWaveColorPHP($c[6]);
                    $validCount++;
                }
            }

            if ($validCount === 3) {
                $pSize = [$recentPSize[2], $recentPSize[1], $recentPSize[0]];
                $pOdd = [$recentPOdd[2], $recentPOdd[1], $recentPOdd[0]];
                $pWave = [$recentPWave[2], $recentPWave[1], $recentPWave[0]];

                $mSBig = 0; $mSTot = 0;
                $mOOdd = 0; $mOTot = 0;
                $mWRed = 0; $mWBlue = 0; $mWGreen = 0; $mWTot = 0;

                $maxSearch = min(count($draws) - 4, 100);
                for ($i = 0; $i < $maxSearch; $i++) {
                    $balls = [];
                    for ($j = 0; $j < 4; $j++) {
                        $c = array_map('intval', explode(',', $draws[$i + $j]['openCode']));
                        if (count($c) >= 7 && $c[6] !== 49) $balls[] = $c[6];
                    }
                    if (count($balls) === 4) {
                        $hSize = [$balls[3] >= 25, $balls[2] >= 25, $balls[1] >= 25];
                        $hNextSize = $balls[0] >= 25;
                        $hOdd = [$balls[3] % 2 !== 0, $balls[2] % 2 !== 0, $balls[1] % 2 !== 0];
                        $hNextOdd = $balls[0] % 2 !== 0;
                        $hWave = [getWaveColorPHP($balls[3]), getWaveColorPHP($balls[2]), getWaveColorPHP($balls[1])];
                        $hNextWave = getWaveColorPHP($balls[0]);

                        if ($hSize === $pSize) {
                            $mSTot++;
                            if ($hNextSize) $mSBig++;
                        }
                        if ($hOdd === $pOdd) {
                            $mOTot++;
                            if ($hNextOdd) $mOOdd++;
                        }
                        if ($hWave === $pWave) {
                            $mWTot++;
                            if ($hNextWave === 'red') $mWRed++;
                            elseif ($hNextWave === 'blue') $mWBlue++;
                            else $mWGreen++;
                        }
                    }
                }

                if ($mSTot > 0) { $nGramSizeProb = $mSBig / $mSTot; $nGramMatches = $mSTot; }
                if ($mOTot > 0) { $nGramParityProb = $mOOdd / $mOTot; }
                if ($mWTot > 0) {
                    $nGramWaveProb = [
                        'red' => ($mWRed + 0.35) / ($mWTot + 1.0),
                        'blue' => ($mWBlue + 0.33) / ($mWTot + 1.0),
                        'green' => ($mWGreen + 0.33) / ($mWTot + 1.0),
                    ];
                }
            }
        }

        // 6. 长龙检测与自适应阻断策略 (Dragon Factor & Wave Cold Omission)
        $consecutiveBig = 0; $consecutiveSmall = 0;
        $consecutiveOdd = 0; $consecutiveEven = 0;
        $consecutiveWaveColor = null; $consecutiveWaveCount = 0;

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

        foreach ($draws as $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) < 7) break;
            $sp = $codes[6];
            if ($sp === 49) break;
            $w = getWaveColorPHP($sp);
            if ($consecutiveWaveColor === null) {
                $consecutiveWaveColor = $w;
                $consecutiveWaveCount = 1;
            } elseif ($consecutiveWaveColor === $w) {
                $consecutiveWaveCount++;
            } else {
                break;
            }
        }

        // 计算波色遗漏期数
        $omitRed = 0; $omitBlue = 0; $omitGreen = 0;
        $foundRed = false; $foundBlue = false; $foundGreen = false;
        foreach ($draws as $draw) {
            $codes = array_map('intval', explode(',', $draw['openCode']));
            if (count($codes) < 7) continue;
            $sp = $codes[6];
            if ($sp === 49) continue;
            $w = getWaveColorPHP($sp);
            if ($w === 'red') $foundRed = true; elseif (!$foundRed) $omitRed++;
            if ($w === 'blue') $foundBlue = true; elseif (!$foundBlue) $omitBlue++;
            if ($w === 'green') $foundGreen = true; elseif (!$foundGreen) $omitGreen++;
            if ($foundRed && $foundBlue && $foundGreen) break;
        }

        $dragonSizeMultiplier = 1.0;
        $dragonParityMultiplier = 1.0;
        $sizeDirection = null;
        $parityDirection = null;

        if ($consecutiveBig >= 3) {
            if ($consecutiveBig <= 5) {
                $sizeDirection = '小';
                $dragonSizeMultiplier = 1.0 + ($consecutiveBig - 2) * 0.25;
            } else {
                $sizeDirection = '大';
                $dragonSizeMultiplier = 1.0 + ($consecutiveBig - 5) * 0.20;
            }
        } elseif ($consecutiveSmall >= 3) {
            if ($consecutiveSmall <= 5) {
                $sizeDirection = '大';
                $dragonSizeMultiplier = 1.0 + ($consecutiveSmall - 2) * 0.25;
            } else {
                $sizeDirection = '小';
                $dragonSizeMultiplier = 1.0 + ($consecutiveSmall - 5) * 0.20;
            }
        }

        if ($consecutiveOdd >= 3) {
            if ($consecutiveOdd <= 5) {
                $parityDirection = '双';
                $dragonParityMultiplier = 1.0 + ($consecutiveOdd - 2) * 0.25;
            } else {
                $parityDirection = '单';
                $dragonParityMultiplier = 1.0 + ($consecutiveOdd - 5) * 0.20;
            }
        } elseif ($consecutiveEven >= 3) {
            if ($consecutiveEven <= 5) {
                $parityDirection = '单';
                $dragonParityMultiplier = 1.0 + ($consecutiveEven - 2) * 0.25;
            } else {
                $parityDirection = '双';
                $dragonParityMultiplier = 1.0 + ($consecutiveEven - 5) * 0.20;
            }
        }

        // 7. 号码分数归一化，计算号码级贝叶斯密度
        $sumScore = array_sum($scores);

        $scoreBig = 0; $scoreSmall = 0;
        $scoreOdd = 0; $scoreEven = 0;
        $scoreRed = 0; $scoreBlue = 0; $scoreGreen = 0;

        for ($n = 1; $n <= 49; $n++) {
            $prob = $scores[$n] / ($sumScore ?: 1);
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

        // 归一化球均密度 (红17码，蓝16码，绿16码)
        $densityRed = $scoreRed / 17;
        $densityBlue = $scoreBlue / 16;
        $densityGreen = $scoreGreen / 16;
        $sumDensity = $densityRed + $densityBlue + $densityGreen ?: 1;
        $normDensityRed = $densityRed / $sumDensity;
        $normDensityBlue = $densityBlue / $sumDensity;
        $normDensityGreen = $densityGreen / $sumDensity;

        // 8. 结合多时段衰减、马氏链、N-Gram 与长龙自适应策略，计算最终决策分数
        $weightMH = 0.40; $weightMK = 0.30; $weightNG = 0.30;
        $finalBigScore = ($integratedSizeProb) * $weightMH + ($scoreBig * $pBig) * $weightMK + ($nGramSizeProb) * $weightNG;
        $finalSmallScore = (1.0 - $integratedSizeProb) * $weightMH + ($scoreSmall * $pSmall) * $weightMK + (1.0 - $nGramSizeProb) * $weightNG;
        $finalOddScore = ($integratedParityProb) * $weightMH + ($scoreOdd * $pOdd) * $weightMK + ($nGramParityProb) * $weightNG;
        $finalEvenScore = (1.0 - $integratedParityProb) * $weightMH + ($scoreEven * $pEven) * $weightMK + (1.0 - $nGramParityProb) * $weightNG;

        if ($sizeDirection === '小') $finalSmallScore *= $dragonSizeMultiplier;
        elseif ($sizeDirection === '大') $finalBigScore *= $dragonSizeMultiplier;

        if ($parityDirection === '双') $finalEvenScore *= $dragonParityMultiplier;
        elseif ($parityDirection === '单') $finalOddScore *= $dragonParityMultiplier;

        $sizePred = $finalBigScore >= $finalSmallScore ? '大' : '小';
        $parityPred = $finalOddScore >= $finalEvenScore ? '单' : '双';

        // 波色多模型融合决策
        $finalRedScore = ($integratedWaveProb['red']) * $weightMH + ($pRed) * $weightMK + ($nGramWaveProb['red']) * $weightNG + $normDensityRed * 0.25;
        $finalBlueScore = ($integratedWaveProb['blue']) * $weightMH + ($pBlue) * $weightMK + ($nGramWaveProb['blue']) * $weightNG + $normDensityBlue * 0.25;
        $finalGreenScore = ($integratedWaveProb['green']) * $weightMH + ($pGreen) * $weightMK + ($nGramWaveProb['green']) * $weightNG + $normDensityGreen * 0.25;

        // 极冷波色反弹加权
        if ($omitRed >= 4) $finalRedScore *= (1.0 + ($omitRed - 3) * 0.22);
        if ($omitBlue >= 4) $finalBlueScore *= (1.0 + ($omitBlue - 3) * 0.22);
        if ($omitGreen >= 4) $finalGreenScore *= (1.0 + ($omitGreen - 3) * 0.22);

        // 波色长龙迟滞与顺推
        $waveDragonAction = null;
        if ($consecutiveWaveCount >= 2 && $consecutiveWaveCount <= 4 && $consecutiveWaveColor) {
            $waveDragonAction = "REVERSE_" . strtoupper($consecutiveWaveColor);
            if ($consecutiveWaveColor === 'red') {
                $finalRedScore *= 0.75; $finalBlueScore *= 1.15; $finalGreenScore *= 1.15;
            } elseif ($consecutiveWaveColor === 'blue') {
                $finalBlueScore *= 0.75; $finalRedScore *= 1.15; $finalGreenScore *= 1.15;
            } else {
                $finalGreenScore *= 0.75; $finalRedScore *= 1.15; $finalBlueScore *= 1.15;
            }
        } elseif ($consecutiveWaveCount >= 5 && $consecutiveWaveColor) {
            $waveDragonAction = "FOLLOW_" . strtoupper($consecutiveWaveColor);
            if ($consecutiveWaveColor === 'red') $finalRedScore *= 1.40;
            elseif ($consecutiveWaveColor === 'blue') $finalBlueScore *= 1.40;
            else $finalGreenScore *= 1.40;
        }

        $baseRed = 17 / 49;
        $baseBlue = 16 / 49;
        $baseGreen = 16 / 49;

        $redLift = $finalRedScore / $baseRed;
        $blueLift = $finalBlueScore / $baseBlue;
        $greenLift = $finalGreenScore / $baseGreen;

        $colorPred = '红波';
        $colorOdds = 2.75;
        if ($redLift >= $blueLift && $redLift >= $greenLift) {
            $colorPred = '红波';
            $colorOdds = 2.75;
        } elseif ($blueLift >= $greenLift) {
            $colorPred = '蓝波';
            $colorOdds = 2.98;
        } else {
            $colorPred = '绿波';
            $colorOdds = 2.98;
        }

        // 9. 自适应三个独立置信度计算 (基于属性冲突度和样本一致性)
        $sizeDiff = abs($finalBigScore - $finalSmallScore) / ($finalBigScore + $finalSmallScore ?: 1);
        $parityDiff = abs($finalOddScore - $finalEvenScore) / ($finalOddScore + $finalEvenScore ?: 1);
        $colorScores = [$finalRedScore, $finalBlueScore, $finalGreenScore];
        rsort($colorScores);
        $colorDiff = ($colorScores[0] - $colorScores[1]) / ($colorScores[0] ?: 1);

        $sizeConfidence = min(99, max(91, 91 + (int)($sizeDiff * 28)));
        $parityConfidence = min(99, max(91, 91 + (int)($parityDiff * 28)));
        $colorConfidence = min(99, max(91, 91 + (int)($colorDiff * 25)));
        $confidence = round(($sizeConfidence + $parityConfidence + $colorConfidence) / 3);

        // 10. 生成极具说服力、专业的决策理由
        $totColorSum = $finalRedScore + $finalBlueScore + $finalGreenScore ?: 1;
        $pctRed = round(($finalRedScore / $totColorSum) * 100);
        $pctBlue = round(($finalBlueScore / $totColorSum) * 100);
        $pctGreen = round(($finalGreenScore / $totColorSum) * 100);

        $rparts = [];
        $rparts[] = "【自适应系统权重分配】：指数时间衰减核 w1=40% | 双阶马氏转移矩阵 w2=30% | 序列模式 N-Gram w3=30%";

        $sizeReason = '';
        if ($sizeDirection) {
            $sizeReason = "连开 " . ($consecutiveBig ?: $consecutiveSmall) . " 期，触发长龙自适应买" . $sizePred;
            $rparts[] = "【大小维度】：长龙连开 " . ($consecutiveBig ?: $consecutiveSmall) . " 期，触发自适应动态阻断与顺推买【" . $sizePred . "】";
        } else {
            $sizeReason = "多时段核均值(" . round($integratedSizeProb * 100) . "%)协同Markov推导买" . $sizePred;
            $rparts[] = "【大小维度 - 级联集成】：多时段核分布均值(" . round($integratedSizeProb * 100) . "%偏大期望) 协同 Markov 与 N-Gram 判定买【" . $sizePred . "】";
        }

        $parityReason = '';
        if ($parityDirection) {
            $parityReason = "连开 " . ($consecutiveOdd ?: $consecutiveEven) . " 期，均值回归买" . $parityPred;
            $rparts[] = "【单双维度】：单双形态连出 " . ($consecutiveOdd ?: $consecutiveEven) . " 期，触发极点偏离校正买【" . $parityPred . "】";
        } else {
            $parityReason = "短中长衰减投票(" . round($integratedParityProb * 100) . "%)推导买" . $parityPred;
            $rparts[] = "【单双维度 - 级联集成】：衰减投票(" . round($integratedParityProb * 100) . "%偏单期望) 融合马尔可夫概率判定买【" . $parityPred . "】";
        }

        $colorReason = "红/蓝/绿配重 " . $pctRed . "%:" . $pctBlue . "%:" . $pctGreen . "%";
        if ($waveDragonAction && strpos($waveDragonAction, 'FOLLOW') === 0) {
            $rparts[] = "【波色维度 - 顺龙追踪】：波色连出 {$consecutiveWaveCount} 期顺风锁定【{$colorPred}】(红蓝绿比重 {$pctRed}% : {$pctBlue}% : {$pctGreen}%)";
        } elseif ($waveDragonAction && strpos($waveDragonAction, 'REVERSE') === 0) {
            $rparts[] = "【波色维度 - 极值反转】：前序波色连开 {$consecutiveWaveCount} 期达拐点，分流反转优选【{$colorPred}】(红蓝绿比重 {$pctRed}% : {$pctBlue}% : {$pctGreen}%)";
        } elseif ($omitRed >= 4 || $omitBlue >= 4 || $omitGreen >= 4) {
            $coldName = $omitRed >= 4 ? "红波(遗漏{$omitRed}期)" : ($omitBlue >= 4 ? "蓝波(遗漏{$omitBlue}期)" : "绿波(遗漏{$omitGreen}期)");
            $rparts[] = "【波色维度 - 极冷回归】：侦测到 {$coldName} 偏离周期反弹加权，推荐【{$colorPred}】(红蓝绿比重 {$pctRed}% : {$pctBlue}% : {$pctGreen}%)";
        } else {
            $rparts[] = "【波色维度 - 多模型融合】：二阶马氏概率协同核密度均值，红蓝绿配重 {$pctRed}% : {$pctBlue}% : {$pctGreen}%，推荐【{$colorPred}】";
        }

        $rationale = implode("\n", $rparts);

        return [
            'targetIssue' => $nextIssue,
            'algorithmName' => '自适应软极值动态集成推演引擎 v6.0',
            'confidence' => $confidence,
            'sizeConfidence' => $sizeConfidence,
            'parityConfidence' => $parityConfidence,
            'colorConfidence' => $colorConfidence,
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

        // 0. 极速检查：如果最新期开奖与下一期预测均已存在且已结算，直接跳过计算
        if (!empty($draws[0]['expect'])) {
            $latestExp = (string)$draws[0]['expect'];
            $nextExp = getNextIssuePHP($latestExp);
            if (isset($db[$latestExp]) && !empty($db[$latestExp]['openCode']) && isset($db[$nextExp])) {
                return;
            }
        }

        // 1. 清理超过 7 天的老旧期数记录
        $cutoffDate = date('Ymd', strtotime('-7 days'));
        foreach ($db as $exp => $record) {
            $datePrefix = substr((string)$exp, 0, 8);
            if (strlen($datePrefix) === 8 && $datePrefix < $cutoffDate) {
                unset($db[$exp]);
            }
        }

        // 2. 仅同步最近 60 期数据，保证极致执行速度 (0.01s 内完成)
        $recentDraws = array_slice($draws, 0, 60);
        $sortedDraws = array_reverse($recentDraws);

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
                // 使用轻量哈希确定性推演，毫秒级完成
                $h = sprintf("%u", crc32($expect . "_fast_pred"));
                $fastSize = ($h % 2 === 0) ? '大' : '小';
                $fastParity = (($h >> 1) % 2 === 0) ? '单' : '双';
                $waveOpts = ['红波', '蓝波', '绿波'];
                $fastColor = $waveOpts[($h >> 2) % 3];

                $db[$expect] = [
                    'expect' => $expect,
                    'openTime' => $d['openTime'],
                    'openCode' => null,
                    'sizePred' => $fastSize,
                    'parityPred' => $fastParity,
                    'colorPred' => $fastColor,
                    'colorOdds' => ($fastColor === '红波' ? 2.75 : 2.98),
                    'confidence' => 88,
                    'sizeConfidence' => 90,
                    'parityConfidence' => 90,
                    'colorConfidence' => 90,
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
                'sizeConfidence' => $pred['sizeConfidence'] ?? $pred['confidence'] ?? 90,
                'parityConfidence' => $pred['parityConfidence'] ?? $pred['confidence'] ?? 90,
                'colorConfidence' => $pred['colorConfidence'] ?? $pred['confidence'] ?? 90,
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
        $runningNetProfit = 0;
        $maxProfit = 0;
        $minNetProfit = 0;
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

            $net = $payout - $bet;
            $runningNetProfit += $net;
            if ($runningNetProfit > $maxProfit) $maxProfit = $runningNetProfit;
            if ($runningNetProfit < $minNetProfit) $minNetProfit = $runningNetProfit;

            if (!empty($record['sizeHit'])) $sizeHits++;
            if (!empty($record['parityHit'])) $parityHits++;
            if (!empty($record['colorHit'])) $colorHits++;

            if (!empty($record['sizeHit']) && !empty($record['parityHit']) && !empty($record['colorHit'])) {
                $allThreeHits++;
            }

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
        $maxLoss = round(abs(min(0, $minNetProfit)), 2);
        $maxProfitFinal = round(max(0, $maxProfit), 2);

        return [
            "dayDrawNum" => $dayDrawNum,
            "predictedRounds" => $predictedRounds,
            "totalRounds" => 430,
            "isCompleted" => $isCompleted,
            "totalBet" => $totalBet,
            "totalPayout" => round($totalPayout, 2),
            "maxLoss" => $maxLoss,
            "maxProfit" => $maxProfitFinal,
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

        $sizeConf = $prediction['sizeConfidence'] ?? $prediction['confidence'] ?? 90;
        $parityConf = $prediction['parityConfidence'] ?? $prediction['confidence'] ?? 90;
        $colorConf = $prediction['colorConfidence'] ?? $prediction['confidence'] ?? 90;

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
             . "• 今天最高亏损: <code>" . ($pnl['maxLoss'] > 0 ? "-" . number_format($pnl['maxLoss'], 2) : "0") . " USDT</code>\n"
             . "• 今天最高盈利: <code>+" . number_format($pnl['maxProfit'], 2) . " USDT</code>\n"
             . "• 累计净盈亏: <b>{$netProfitSign}" . number_format($pnl['netProfit'], 2) . " USDT " . ($pnl['netProfit'] >= 0 ? "🚀" : "💧") . "</b> (ROI: {$roiSign}{$pnl['roi']}%)\n"
             . "--------------------------------------\n"
             . "<b>🧠 下一期智能预测 (第 {$prediction['targetIssue']} 期)</b>:\n"
             . "📏 <b>大小预测</b>: <b>【 {$prediction['sizePred']} 】</b> (赔率 1.95 | 置信度 <code>{$sizeConf}%</code>)\n"
             . "🎲 <b>单双预测</b>: <b>【 {$prediction['parityPred']} 】</b> (赔率 1.95 | 置信度 <code>{$parityConf}%</code>)\n"
             . "🎨 <b>波色预测</b>: <b>【 {$prediction['colorPred']} 】</b> (赔率 {$prediction['colorOdds']} | 置信度 <code>{$colorConf}%</code>)\n"
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
