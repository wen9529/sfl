<?php
$file = 'stats_algorithm.php';
$code = file_get_contents($file);

$newFunc = <<<'EOD'
if (!function_exists('updatePredictionsDBPHP')) {
    function updatePredictionsDBPHP($draws) {
        if (empty($draws)) return;
        $dbFile = __DIR__ . '/predictions_7days.json';
        $db = [];
        if (file_exists($dbFile)) {
            $db = json_decode(file_get_contents($dbFile), true) ?: [];
        }

        $latestExpect = $draws[0]['expect'];
        $nextIssue = getNextIssuePHP($latestExpect);

        // 1. 回填历史开奖并结算
        foreach ($draws as $draw) {
            $exp = $draw['expect'];
            if (!isset($db[$exp])) {
                // 如果库里没有，尝试回溯生成当时的预测，以保证数据完整性 (冷启动或漏期时)
                $idx = array_search($draw, $draws);
                $slice = array_slice($draws, $idx + 1); // 当时的上下文
                if (count($slice) >= 2) {
                    $pred = generatePredictFrom50DrawsPHP($slice);
                    $db[$exp] = [
                        'targetIssue' => $exp,
                        'sizePred' => $pred['sizePred'],
                        'parityPred' => $pred['parityPred'],
                        'colorPred' => $pred['colorPred'],
                        'colorOdds' => $pred['colorOdds'],
                        'confidence' => $pred['confidence'] ?? 90,
                        'sizeConfidence' => $pred['sizeConfidence'] ?? 90,
                        'parityConfidence' => $pred['parityConfidence'] ?? 90,
                        'colorConfidence' => $pred['colorConfidence'] ?? 90,
                        'reasoning' => $pred['reasoning'] ?? '',
                        'bet' => 3,
                        'openCode' => ''
                    ];
                }
            }
            
            if (isset($db[$exp]) && empty($db[$exp]['openCode'])) {
                $db[$exp]['openCode'] = $draw['openCode'];
                
                $codes = array_map('intval', explode(',', $draw['openCode']));
                if (count($codes) >= 7 && $codes[6] !== 49) {
                    $special = $codes[6];
                    $actualSize = $special >= 25 ? '大' : '小';
                    $actualParity = $special % 2 !== 0 ? '单' : '双';
                    $actualWave = getWaveColorPHP($special);
                    
                    $waveMap = ['red' => '红波', 'blue' => '蓝波', 'green' => '绿波'];
                    $actualColor = $waveMap[$actualWave] ?? '红波';

                    $sizeHit = ($db[$exp]['sizePred'] === $actualSize);
                    $parityHit = ($db[$exp]['parityPred'] === $actualParity);
                    $colorHit = ($db[$exp]['colorPred'] === $actualColor);

                    $db[$exp]['sizeHit'] = $sizeHit;
                    $db[$exp]['parityHit'] = $parityHit;
                    $db[$exp]['colorHit'] = $colorHit;

                    $payout = 0;
                    if ($sizeHit) $payout += 1.95;
                    if ($parityHit) $payout += 1.95;
                    if ($colorHit) $payout += floatval($db[$exp]['colorOdds'] ?? 2.75);

                    $db[$exp]['payout'] = round($payout, 2);
                } else if (isset($codes[6]) && $codes[6] === 49) {
                    $db[$exp]['sizeHit'] = true;
                    $db[$exp]['parityHit'] = true;
                    $db[$exp]['colorHit'] = false;
                    $db[$exp]['payout'] = 2.0; 
                }
            }
        }

        // 2. 生成下一期预测并保存
        if (!isset($db[$nextIssue])) {
            $prediction = generatePredictFrom50DrawsPHP($draws);
            $db[$nextIssue] = [
                'targetIssue' => $nextIssue,
                'sizePred' => $prediction['sizePred'],
                'parityPred' => $prediction['parityPred'],
                'colorPred' => $prediction['colorPred'],
                'colorOdds' => $prediction['colorOdds'],
                'confidence' => $prediction['confidence'],
                'sizeConfidence' => $prediction['sizeConfidence'],
                'parityConfidence' => $prediction['parityConfidence'],
                'colorConfidence' => $prediction['colorConfidence'],
                'reasoning' => $prediction['reasoning'],
                'bet' => 3,
                'openCode' => '',
            ];
        }

        // 清理旧数据，保留最近1000条
        ksort($db);
        if (count($db) > 1500) {
            $db = array_slice($db, -1000, null, true);
        }

        file_put_contents($dbFile, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}
EOD;

if (strpos($code, 'updatePredictionsDBPHP') === false) {
    file_put_contents($file, $code . "\n" . $newFunc . "\n");
    echo "Added updatePredictionsDBPHP.\n";
} else {
    echo "updatePredictionsDBPHP already exists.\n";
}
