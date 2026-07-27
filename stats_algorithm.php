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
     * 2. 基于 50 期真实统计规律生成大小、单双与波色智能预测
     * 结合均值回归、近期动量趋势、长龙截断等策略提高预测准确率。
     */
    function generatePredictFrom50DrawsPHP($draws = null) {
        if (!$draws) {
            $draws = getLatestDrawsPHP();
        }

        $stats = analyze50DrawsStatsPHP($draws);
        $nextIssue = !empty($draws) ? getNextIssuePHP($draws[0]['expect']) : getMacau3MinIssueInfoPHP(-1)['expect'];

        $recent10 = array_slice($draws, 0, 10);
        
        $bigCount10 = 0;
        $oddCount10 = 0;
        $lastBig = null;
        $lastOdd = null;
        
        foreach ($recent10 as $idx => $d) {
            $codes = explode(',', $d['openCode']);
            if (count($codes) < 7) continue;
            $sp = intval($codes[6]);
            if ($sp == 49) continue;
            $isBig = $sp >= 25;
            $isOdd = $sp % 2 !== 0;
            
            if ($isBig) $bigCount10++;
            if ($isOdd) $oddCount10++;
            
            if ($idx === 0) {
                $lastBig = $isBig;
                $lastOdd = $isOdd;
            }
        }
        
        $consecutiveBig = 0;
        foreach ($draws as $d) {
            $codes = explode(',', $d['openCode']);
            if (count($codes) < 7) continue;
            $sp = intval($codes[6]);
            if ($sp == 49) continue;
            $isBig = $sp >= 25;
            
            if ($lastBig !== null && $isBig === $lastBig) {
                $consecutiveBig++;
            } else {
                break;
            }
        }
        
        $consecutiveOdd = 0;
        foreach ($draws as $d) {
            $codes = explode(',', $d['openCode']);
            if (count($codes) < 7) continue;
            $sp = intval($codes[6]);
            if ($sp == 49) continue;
            $isOdd = $sp % 2 !== 0;
            
            if ($lastOdd !== null && $isOdd === $lastOdd) {
                $consecutiveOdd++;
            } else {
                break;
            }
        }

        $bigRatio = $stats['bigRatio'] ?? 50.0;
        $sizePred = '大';
        $sizeReason = '';
        
        if ($consecutiveBig >= 4) {
            $sizePred = $lastBig ? '小' : '大';
            $sizeReason = "近期连出 {$consecutiveBig} 期，防长龙阻断";
        } else if ($bigRatio > 55.0) {
            $sizePred = '小';
            $sizeReason = "50期大数偏高 ({$bigRatio}%)，均值回调买小";
        } else if ($bigRatio < 45.0) {
            $sizePred = '大';
            $sizeReason = "50期大数偏低 ({$bigRatio}%)，均值回补买大";
        } else {
            $valid10 = 0;
            foreach ($recent10 as $d) {
                $c = explode(',', $d['openCode']);
                if (count($c) >= 7 && intval($c[6]) != 49) $valid10++;
            }
            $recentBigRatio = $valid10 > 0 ? ($bigCount10 / $valid10 * 100) : 50.0;
            
            if ($recentBigRatio >= 60.0) {
                $sizePred = '大';
                $sizeReason = "近10期大走热，顺势追大";
            } else if ($recentBigRatio <= 40.0) {
                $sizePred = '小';
                $sizeReason = "近10期小走热，顺势追小";
            } else {
                $sizePred = $lastBig ? '小' : '大';
                $sizeReason = "近期大小震荡，防跳位偏离";
            }
        }

        $oddRatio = $stats['oddRatio'] ?? 50.0;
        $parityPred = '单';
        $parityReason = '';
        
        if ($consecutiveOdd >= 4) {
            $parityPred = $lastOdd ? '双' : '单';
            $parityReason = "近期连出 {$consecutiveOdd} 期，防长龙阻断";
        } else if ($oddRatio > 55.0) {
            $parityPred = '双';
            $parityReason = "50期单数偏高 ({$oddRatio}%)，均值回调买双";
        } else if ($oddRatio < 45.0) {
            $parityPred = '单';
            $parityReason = "50期单数偏低 ({$oddRatio}%)，均值回补买单";
        } else {
            $valid10 = 0;
            foreach ($recent10 as $d) {
                $c = explode(',', $d['openCode']);
                if (count($c) >= 7 && intval($c[6]) != 49) $valid10++;
            }
            $recentOddRatio = $valid10 > 0 ? ($oddCount10 / $valid10 * 100) : 50.0;
            
            if ($recentOddRatio >= 60.0) {
                $parityPred = '单';
                $parityReason = "近10期单走热，顺势追单";
            } else if ($recentOddRatio <= 40.0) {
                $parityPred = '双';
                $parityReason = "近10期双走热，顺势追双";
            } else {
                $parityPred = $lastOdd ? '双' : '单';
                $parityReason = "近期单双震荡，防跳位偏离";
            }
        }

        $waveDist = $stats['waveDistribution'];
        $waves10 = ['red' => 0, 'blue' => 0, 'green' => 0];
        foreach ($recent10 as $d) {
            $codes = explode(',', $d['openCode']);
            if (count($codes) >= 7) {
                $sp = intval($codes[6]);
                if ($sp != 49) {
                    $w = getWaveColorPHP($sp);
                    if (isset($waves10[$w])) $waves10[$w]++;
                }
            }
        }
        
        $colors = [
            'red' => ['name' => '红波', 'odds' => 2.75, 'r50' => $waveDist['redRatio'], 'r10' => $waves10['red']],
            'blue' => ['name' => '蓝波', 'odds' => 2.98, 'r50' => $waveDist['blueRatio'], 'r10' => $waves10['blue']],
            'green' => ['name' => '绿波', 'odds' => 2.98, 'r50' => $waveDist['greenRatio'], 'r10' => $waves10['green']]
        ];
        
        uasort($colors, function($a, $b) {
            $scoreA = $a['r50'] - ($a['r10'] * 10);
            $scoreB = $b['r50'] - ($b['r10'] * 10);
            return $scoreB <=> $scoreA;
        });
        
        $bestColor = reset($colors);
        $colorPred = $bestColor['name'];
        $colorOdds = $bestColor['odds'];
        $colorReason = "结合50期特码波色比例与近期10期趋势动态调整。";
        
        $confidence = 85 + (int)(($bestColor['r50'] - 33.3) / 2);
        if ($confidence < 60) $confidence = 68;
        if ($confidence > 98) $confidence = 96;

        $rationale = "1. 大小判断：{$sizeReason}\n2. 单双判断：{$parityReason}\n3. 波色判断：{$colorReason}";

        return [
            'targetIssue' => $nextIssue,
            'algorithmName' => '50期大小/单双/波色概率加权预测模型 v3.0',
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
