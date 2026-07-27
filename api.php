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

// 路由 4: 实时日志诊断与调试 API
if ($action === 'logs') {
    $logFile = $config['log_file'] ?? __DIR__ . '/telegram_logs.json';
    $logs = [];
    if (file_exists($logFile)) {
        $logs = json_decode(file_get_contents($logFile), true) ?: [];
    }
    echo json_encode([
        'success' => true,
        'logs' => $logs
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 路由 5: 手动强制测试推送诊断 API
if ($action === 'test_push') {
    $token = $config['telegram_bot_token'] ?? '';
    $chatId = $config['telegram_chat_id'] ?? '';

    if (!$token || !$chatId) {
        echo json_encode([
            'success' => false,
            'error' => '未配置 Telegram Token 或 Chat ID，请检查 config.php 或环境变量'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $draws = getLatestDrawsPHP(true); // 强制获取最新数据
    if (empty($draws)) {
        echo json_encode([
            'success' => false,
            'error' => '未能获取到任何开奖记录，请检查网络或开奖数据源'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $latestIssue = $draws[0]['expect'] ?? '';
    $msgText = generateAutomatedPushReportPHP($draws);

    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'chat_id' => $chatId,
        'text' => $msgText,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $resData = json_decode($res, true);
    $isSuccess = ($httpCode === 200 && isset($resData['ok']) && $resData['ok'] === true);

    if ($isSuccess) {
        $lastFile = __DIR__ . '/last_pushed_issue.txt';
        file_put_contents($lastFile, $latestIssue);
        writeLogPHP('手动测试推送', 'success', "成功手动推送开奖推演报告 [第 {$latestIssue} 期] 到频道", $msgText);
        echo json_encode([
            'success' => true,
            'message' => "手动测试推送成功！已成功向频道 {$chatId} 发送第 {$latestIssue} 期数据报告。",
            'http_code' => $httpCode,
            'telegram_response' => $resData
        ], JSON_UNESCAPED_UNICODE);
    } else {
        $errDesc = isset($resData['description']) ? $resData['description'] : ($curlError ?: '网络超时或Telegram接口无响应');
        writeLogPHP('手动测试推送', 'error', "手动测试推送失败 [第 {$latestIssue} 期]", "HTTP: {$httpCode} | Error: {$errDesc}");
        echo json_encode([
            'success' => false,
            'error' => $errDesc,
            'http_code' => $httpCode,
            'curl_error' => $curlError,
            'telegram_response' => $resData
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

echo json_encode(['error' => '未知 Action'], JSON_UNESCAPED_UNICODE);
