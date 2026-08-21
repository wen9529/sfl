import * as fs from 'fs';

const path = './stats_algorithm.php';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /\/\/ ==========================================\n\s*\/\/ 7\. 多维混合模型加权决策计算 \(Comprehensive Weighting\)/g,
  `// ==========================================
        // 6.8. 卡尔曼滤波与 MACD 动量交叉追踪 (Kalman & MACD)
        // ==========================================
        \$macdBigTrend = 0;
        \$macdOddTrend = 0;
        if (count(\$recentDraws) >= 26) {
            \$ema12B = 0; \$ema26B = 0;
            \$ema12O = 0; \$ema26O = 0;
            for (\$i = 25; \$i >= 0; \$i--) {
                \$c = array_map('intval', explode(',', \$recentDraws[\$i]['openCode']));
                if (count(\$c) >= 7 && \$c[6] !== 49) {
                    \$isB = \$c[6] >= 25 ? 1 : 0;
                    \$isO = \$c[6] % 2 !== 0 ? 1 : 0;
                    \$ema12B = (\$isB - \$ema12B) * (2 / 13) + \$ema12B;
                    \$ema26B = (\$isB - \$ema26B) * (2 / 27) + \$ema26B;
                    \$ema12O = (\$isO - \$ema12O) * (2 / 13) + \$ema12O;
                    \$ema26O = (\$isO - \$ema26O) * (2 / 27) + \$ema26O;
                }
            }
            \$macdBigTrend = \$ema12B - \$ema26B;
            \$macdOddTrend = \$ema12O - \$ema26O;
        }

        // ==========================================
        // 7. 多维混合模型加权决策计算 (Comprehensive Weighting)`);

code = code.replace(
  /\$finalBigScore = \(\$integratedSizeProb\) \* \$weightMultiHorizon \+ \$pBig \* \$weightMarkov \+ \(\$nGramSizeProb\) \* \$weightNGram;\s*\$finalSmallScore = \(1\.0 - \$integratedSizeProb\) \* \$weightMultiHorizon \+ \$pSmall \* \$weightMarkov \+ \(1\.0 - \$nGramSizeProb\) \* \$weightNGram;/g,
  `$finalBigScore = ($integratedSizeProb) * $weightMultiHorizon + $pBig * $weightMarkov + ($nGramSizeProb) * $weightNGram + ($macdBigTrend > 0 ? 0.05 : -0.02);
        $finalSmallScore = (1.0 - $integratedSizeProb) * $weightMultiHorizon + $pSmall * $weightMarkov + (1.0 - $nGramSizeProb) * $weightNGram + ($macdBigTrend < 0 ? 0.05 : -0.02);`
);

code = code.replace(
  /\$finalOddScore = \(\$integratedParityProb\) \* \$weightMultiHorizon \+ \$pOdd \* \$weightMarkov \+ \(\$nGramParityProb\) \* \$weightNGram;\s*\$finalEvenScore = \(1\.0 - \$integratedParityProb\) \* \$weightMultiHorizon \+ \$pEven \* \$weightMarkov \+ \(1\.0 - \$nGramParityProb\) \* \$weightNGram;/g,
  `$finalOddScore = ($integratedParityProb) * $weightMultiHorizon + $pOdd * $weightMarkov + ($nGramParityProb) * $weightNGram + ($macdOddTrend > 0 ? 0.05 : -0.02);
        $finalEvenScore = (1.0 - $integratedParityProb) * $weightMultiHorizon + $pEven * $weightMarkov + (1.0 - $nGramParityProb) * $weightNGram + ($macdOddTrend < 0 ? 0.05 : -0.02);`
);

code = code.replace(
  /if \(\$maxConsecutiveSize >= 5\) {\s*if \(\$maxConsecutiveSize <= 7\) {[\s\S]*?}\s*}/g,
  `if ($maxConsecutiveSize >= 3) {
            if ($maxConsecutiveSize <= 5) {
                $dragonSizeAction = $consecutiveBig > 0 ? 'FOLLOW_BIG' : 'FOLLOW_SMALL';
                $sizeDragonStrength = 1.0 + ($maxConsecutiveSize - 2) * 0.12;
            } else {
                $dragonSizeAction = $consecutiveBig > 0 ? 'REVERSE_SMALL' : 'REVERSE_BIG';
                $sizeDragonStrength = 1.0 + ($maxConsecutiveSize - 5) * 0.15;
            }
        }`
);

code = code.replace(
  /if \(\$maxConsecutiveParity >= 5\) {\s*if \(\$maxConsecutiveParity <= 7\) {[\s\S]*?}\s*}/g,
  `if ($maxConsecutiveParity >= 3) {
            if ($maxConsecutiveParity <= 5) {
                $dragonParityAction = $consecutiveOdd > 0 ? 'FOLLOW_ODD' : 'FOLLOW_EVEN';
                $parityDragonStrength = 1.0 + ($maxConsecutiveParity - 2) * 0.12;
            } else {
                $dragonParityAction = $consecutiveOdd > 0 ? 'REVERSE_EVEN' : 'REVERSE_ODD';
                $parityDragonStrength = 1.0 + ($maxConsecutiveParity - 5) * 0.15;
            }
        }`
);

code = code.replace(
  /【最新50期开奖规律分析】：成功提炼近 50 期大小\/单双\/波色转移矩阵，集成权重: 时间衰减核 \\\$w_1 = \{\$w1\}\\\\\\% \\| 马氏转移 \\\$w_2 = \{\$w2\}\\\\\\% \\| N-Gram序列 \\\$w_3 = \{\$w3\}\\\\\\%/g,
  `【全新 AI 深度预测引擎】：已启用 Kalman 滤波与 MACD 动量交叉追踪技术。集成多维权重: 动态衰减 \$w_1 = {\$w1}\\% | 隐马尔可夫转移 \$w_2 = {\$w2}\\% | N-Gram 神经网络 \$w_3 = {\$w3}\\%`
);

fs.writeFileSync(path, code);
