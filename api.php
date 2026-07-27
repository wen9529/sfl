<?php
/**
 * 澳门三分六合彩 - PHP REST API 模块化服务接口
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

$action = isset($_GET['action']) ? $_GET['action'] : 'history';

// 路由 1: 获取最新 50 期历史开奖数据
if ($action === 'history') {
    $draws = getLatestDrawsPHP();
    echo json_encode([
        'result' => true,
        'message' => '操作成功 (PHP 模块化数据源)',
        'code' => 200,
        'data' => [
            [
                'code' => 'S00000',
                'msg' => '处理成功',
                'name' => '三分六合彩',
                'success' => true,
                'data' => $draws
            ]
        ],
        'timestamp' => time() * 1000
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 路由 2: 基于 50 期开奖记录规律的智能预测算法 API
if ($action === 'predict') {
    $draws = getLatestDrawsPHP();
    $pred = generatePredictFrom50DrawsPHP($draws);

    echo json_encode([
        'success' => true,
        'prediction' => [
            'targetIssue' => $pred['targetIssue'],
            'algorithmName' => $pred['algorithmName'],
            'confidenceScore' => $pred['confidence'],
            'redBalls' => $pred['recommendedReds'],
            'blueBalls' => [$pred['specialCandidate']],
            'backupSpecials' => $pred['backupSpecials'],
            'specialZodiac' => $pred['specialZodiac'],
            'specialWave' => $pred['specialWave'],
            'rationale' => $pred['rationale']
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 路由 3: 50期规律深入统计与盈亏(ROI) API
if ($action === 'stats' || $action === 'pnl') {
    $draws = getLatestDrawsPHP();
    $stats = analyze50DrawsStatsPHP($draws);
    $pnl = calculateProfitAndLossPHP($draws);

    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'pnl' => $pnl
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['error' => '未知 Action'], JSON_UNESCAPED_UNICODE);
