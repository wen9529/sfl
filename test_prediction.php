<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

$draws = getLatestDrawsPHP();
echo "Total draws: " . count($draws) . "\n";

$targetIndex = 0; // The latest draw that has completed
if (count($draws) > $targetIndex + 50) {
    $historicalContext = array_slice($draws, $targetIndex + 1); // everything before this draw
    $prediction = generatePredictFrom50DrawsPHP($historicalContext);
    
    $actualDraw = $draws[$targetIndex];
    $codes = explode(',', $actualDraw['openCode']);
    $special = intval($codes[6]);
    $actualBig = $special >= 25 ? '大' : '小';
    if ($special == 49) $actualBig = '和';
    
    echo "Issue: " . $actualDraw['expect'] . "\n";
    echo "Actual Special: " . $special . "\n";
    echo "Predicted Size: " . $prediction['sizePred'] . " | Actual Size: " . $actualBig . "\n";
}
