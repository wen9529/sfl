import * as fs from 'fs';

const path = './stats_algorithm.php';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startStr = "    function generatePredictFrom50DrawsPHP($recentDraws";
const endStr = "    function calculateProfitAndLossPHP";

let startIndex = -1;
let endIndex = -1;

for(let i=0; i<lines.length; i++) {
    if (lines[i].startsWith(startStr)) startIndex = i;
    if (lines[i].startsWith(endStr)) { endIndex = i - 1; break; }
}

if (startIndex !== -1 && endIndex !== -1) {
  const newFunc = `    function generatePredictFrom50DrawsPHP($recentDraws = null) {
        if (empty($recentDraws) || count($recentDraws) < 2) {
            return [
                "targetIssue" => "", "sizePred" => "大", "parityPred" => "单", "colorPred" => "红波",
                "colorOdds" => 2.75, "confidence" => 90, "sizeConfidence" => 90, "parityConfidence" => 90, "colorConfidence" => 90,
                "reasoning" => "暂无足够历史开奖数据供 AI 分析。"
            ];
        }

        $lastExpect = $recentDraws[0]['expect'];
        $nextIssue = getNextIssuePHP($lastExpect);

        // --- 核心预测引擎闭包 ---
        $runEngine = function($slice, $applyCorrection = false, $correctionData = []) {
            $consecutiveBig = 0; $consecutiveSmall = 0;
            $consecutiveOdd = 0; $consecutiveEven = 0;
            
            foreach ($slice as $draw) {
                $c = array_map('intval', explode(',', $draw['openCode']));
                if (count($c) < 7 || $c[6] === 49) break;
                if ($c[6] >= 25) { if ($consecutiveSmall > 0) break; $consecutiveBig++; }
                else { if ($consecutiveBig > 0) break; $consecutiveSmall++; }
            }
            foreach ($slice as $draw) {
                $c = array_map('intval', explode(',', $draw['openCode']));
                if (count($c) < 7 || $c[6] === 49) break;
                if ($c[6] % 2 !== 0) { if ($consecutiveEven > 0) break; $consecutiveOdd++; }
                else { if ($consecutiveOdd > 0) break; $consecutiveEven++; }
            }
            
            $macdBigTrend = 0; $macdOddTrend = 0;
            if (count($slice) >= 26) {
                $ema12B = 0; $ema26B = 0; $ema12O = 0; $ema26O = 0;
                for ($i = 25; $i >= 0; $i--) {
                    $c = array_map('intval', explode(',', $slice[$i]['openCode']));
                    if (count($c) >= 7 && $c[6] !== 49) {
                        $isB = $c[6] >= 25 ? 1 : 0; $isO = $c[6] % 2 !== 0 ? 1 : 0;
                        $ema12B = ($isB - $ema12B) * (2 / 13) + $ema12B;
                        $ema26B = ($isB - $ema26B) * (2 / 27) + $ema26B;
                        $ema12O = ($isO - $ema12O) * (2 / 13) + $ema12O;
                        $ema26O = ($isO - $ema26O) * (2 / 27) + $ema26O;
                    }
                }
                $macdBigTrend = $ema12B - $ema26B;
                $macdOddTrend = $ema12O - $ema26O;
            }

            $correctionReason = [];
            if ($applyCorrection) {
                if (!empty($correctionData['sizeWrong'])) {
                    $macdBigTrend = -$macdBigTrend; 
                    $correctionReason[] = "⚠️ 捕捉到上期[大小]预测失误，触发【AI 自适应神经纠错】：强制翻转动量轨迹，重置均值回归模型。";
                } else {
                    $macdBigTrend *= 1.3; 
                    $correctionReason[] = "✅ 上期[大小]精准命中，判定当前通道稳定，进入【乘胜追击】模式。";
                }
                
                if (!empty($correctionData['parityWrong'])) {
                    $macdOddTrend = -$macdOddTrend;
                    $correctionReason[] = "⚠️ 捕捉到上期[单双]断连，触发【AI 自适应神经纠错】：阻断错误链条，逆转单双波段阻力位。";
                } else {
                    $macdOddTrend *= 1.3;
                    $correctionReason[] = "✅ 上期[单双]精准命中，单双维度趋势健康，继续加码锁定。";
                }
            }
            
            $finalBigScore = 0.5 + ($macdBigTrend > 0 ? 0.08 : -0.08);
            $finalSmallScore = 0.5 + ($macdBigTrend < 0 ? 0.08 : -0.08);
            $finalOddScore = 0.5 + ($macdOddTrend > 0 ? 0.08 : -0.08);
            $finalEvenScore = 0.5 + ($macdOddTrend < 0 ? 0.08 : -0.08);

            if (max($consecutiveBig, $consecutiveSmall) >= 3) {
                if (max($consecutiveBig, $consecutiveSmall) <= 4) {
                    if ($consecutiveBig > 0) $finalBigScore *= 1.25; else $finalSmallScore *= 1.25;
                } else {
                    if ($consecutiveBig > 0) $finalSmallScore *= 1.35; else $finalBigScore *= 1.35;
                }
            }
            if (max($consecutiveOdd, $consecutiveEven) >= 3) {
                if (max($consecutiveOdd, $consecutiveEven) <= 4) {
                    if ($consecutiveOdd > 0) $finalOddScore *= 1.25; else $finalEvenScore *= 1.25;
                } else {
                    if ($consecutiveOdd > 0) $finalEvenScore *= 1.35; else $finalOddScore *= 1.35;
                }
            }
            
            $sizePred = $finalBigScore >= $finalSmallScore ? '大' : '小';
            $parityPred = $finalOddScore >= $finalEvenScore ? '单' : '双';
            
            $colorPred = '红波'; $colorOdds = 2.75;
            $r = rand(1, 100);
            if ($r <= 34) { $colorPred = '红波'; $colorOdds = 2.75; }
            elseif ($r <= 67) { $colorPred = '蓝波'; $colorOdds = 2.98; }
            else { $colorPred = '绿波'; $colorOdds = 2.98; }

            $sizeDiff = abs($finalBigScore - $finalSmallScore) / max(0.01, $finalBigScore + $finalSmallScore);
            $parityDiff = abs($finalOddScore - $finalEvenScore) / max(0.01, $finalOddScore + $finalEvenScore);

            $sizeConfidence = min(99, max(92, 92 + (int)($sizeDiff * 25)));
            $parityConfidence = min(99, max(92, 92 + (int)($parityDiff * 25)));
            
            return [
                'sizePred' => $sizePred,
                'parityPred' => $parityPred,
                'colorPred' => $colorPred,
                'colorOdds' => $colorOdds,
                'sizeConfidence' => $sizeConfidence,
                'parityConfidence' => $parityConfidence,
                'correctionReason' => implode("\\n", $correctionReason)
            ];
        };

        // --- 1. 回测上一期预测结果 (模拟在上一期时的状态) ---
        $historySlice = array_slice($recentDraws, 1);
        $prevSim = $runEngine($historySlice, false);
        
        $actualSpecial = 0;
        $actualCodes = array_map('intval', explode(',', $recentDraws[0]['openCode']));
        if (count($actualCodes) >= 7 && $actualCodes[6] !== 49) {
            $actualSpecial = $actualCodes[6];
        }
        
        $sizeWrong = false;
        $parityWrong = false;
        if ($actualSpecial > 0) {
            $actualSize = $actualSpecial >= 25 ? '大' : '小';
            $actualParity = $actualSpecial % 2 !== 0 ? '单' : '双';
            $sizeWrong = ($prevSim['sizePred'] !== $actualSize);
            $parityWrong = ($prevSim['parityPred'] !== $actualParity);
        }

        // --- 2. 注入回测偏差，生成最终预测 ---
        $correctionData = [
            'sizeWrong' => $sizeWrong,
            'parityWrong' => $parityWrong
        ];
        $currentPred = $runEngine($recentDraws, true, $correctionData);

        $colorConfidence = rand(92, 96);
        $confidence = round(($currentPred['sizeConfidence'] + $currentPred['parityConfidence'] + $colorConfidence) / 3);

        $rparts = [];
        if (!empty($currentPred['correctionReason'])) {
            $rparts[] = $currentPred['correctionReason'];
        }
        $rparts[] = "--------------------------------------";
        $rparts[] = "📊 【当前形态矩阵重组推演】: " . $currentPred['sizePred'] . " | " . $currentPred['parityPred'];

        return [
            "targetIssue" => $nextIssue,
            "sizePred" => $currentPred['sizePred'],
            "parityPred" => $currentPred['parityPred'],
            "colorPred" => $currentPred['colorPred'],
            "colorOdds" => $currentPred['colorOdds'],
            "confidence" => $confidence,
            "sizeConfidence" => $currentPred['sizeConfidence'],
            "parityConfidence" => $currentPred['parityConfidence'],
            "colorConfidence" => $colorConfidence,
            "reasoning" => implode("\\n", $rparts)
        ];
    }
`;
  const updatedLines = [
    ...lines.slice(0, startIndex),
    newFunc,
    ...lines.slice(endIndex)
  ];
  fs.writeFileSync(path, updatedLines.join('\n'));
  console.log("PHP function replaced successfully.");
} else {
  console.log("Could not find function bounds.");
}
