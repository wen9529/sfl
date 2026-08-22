<?php
/**
 * 澳门三分六合彩 定时任务 (PHP Cron Script)
 * 支持以下 3 种触发方式:
 * 1. Serv00 Cron 命令行: /usr/local/bin/php83 /usr/home/USERNAME/domains/DOMAIN/public_html/cron.php > /dev/null 2>&1
 * 2. Serv00 Cron URL 触发: curl -s https://DOMAIN/cron.php > /dev/null 2>&1
 * 3. 免费第三方监控 (如 cron-job.org / UptimeRobot): 每 1~3 分钟 GET 请求 https://DOMAIN/cron.php
 */
error_reporting(E_ALL);
date_default_timezone_set('Asia/Shanghai');

// 环境记录
$isCli = (php_sapi_name() === 'cli');
$triggerType = $isCli ? 'CLI' : 'WEB (' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ')';

file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] [{$triggerType}] Cron triggered.\n", FILE_APPEND);

if (!function_exists('curl_init')) {
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Error: curl extension is missing!\n", FILE_APPEND);
}

require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

$config = require __DIR__ . '/config.php';
$token = $config['telegram_bot_token'];
$chatId = $config['telegram_chat_id'];

if (!$token || !$chatId) {
    $errMsg = "未配置 Telegram Token 或 Chat ID，定时开奖播报跳过。";
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] {$errMsg}\n", FILE_APPEND);
    if (!$isCli) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $errMsg], JSON_UNESCAPED_UNICODE);
    } else {
        echo "{$errMsg}\n";
    }
    exit;
}

// 检查是否强制运行推送
$isForce = ($isCli && isset($argv) && in_array('--force', $argv)) || isset($_GET['force']);

// 获得最新50期记录 (如果强制运行，则强制刷新缓存)
$draws = getLatestDrawsPHP($isForce);

if (empty($draws)) {
    $errMsg = "未能获取到开奖记录。";
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] {$errMsg}\n", FILE_APPEND);
    if (!$isCli) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $errMsg], JSON_UNESCAPED_UNICODE);
    } else {
        echo "{$errMsg}\n";
    }
    exit;
}

// === 持久化预测并结算历史记录 ===
if (function_exists('updatePredictionsDBPHP')) {
    updatePredictionsDBPHP($draws);
}

$latestIssue = $draws[0]['expect'] ?? '';
$lastFile = __DIR__ . '/last_pushed_issue.txt';
$lastPushedIssue = file_exists($lastFile) ? trim(file_get_contents($lastFile)) : '';

// 检查期号是否更新，如果是旧的开奖记录则不运行预测与推送 (在非强制模式下)
if (!$isForce && $latestIssue === $lastPushedIssue) {
    $skipMsg = "期号 [第 {$latestIssue} 期] 已于之前推送成功，跳过本次重复推送。";
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Skipped issue {$latestIssue}, already pushed.\n", FILE_APPEND);
    if (!$isCli) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'status' => 'skipped',
            'latestIssue' => $latestIssue,
            'message' => $skipMsg,
            'time' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo "{$skipMsg}\n";
    }
    exit;
}

// 生成复合推演帖子
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
curl_close($ch);

$resData = json_decode($res, true);
$isSuccess = ($httpCode === 200 && isset($resData['ok']) && $resData['ok'] === true);

if ($isSuccess) {
    // 只有推送成功时，才更新 last_pushed_issue.txt，防止因临时网络故障导致漏推
    file_put_contents($lastFile, $latestIssue);
    
    // 写入成功日志
    writeLogPHP('定时推送', 'success', "成功推送开奖推演报告 [第 {$latestIssue} 期] 到频道", $msgText);
    
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Success pushed {$latestIssue}.\n", FILE_APPEND);
    
    $succMsg = "Cron 自动推送成功 (HTTP 200)，已记录最新期号 [{$latestIssue}]";
    if (!$isCli) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'status' => 'pushed',
            'latestIssue' => $latestIssue,
            'message' => $succMsg,
            'time' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo "{$succMsg}，执行时间: " . date('Y-m-d H:i:s') . "\n";
    }
} else {
    $errDesc = isset($resData['description']) ? $resData['description'] : '网络超时、CURL报错或Telegram接口无响应';
    
    // 写入失败日志，以便在管理面板中查看详细原因
    writeLogPHP('定时推送', 'error', "推送失败 [第 {$latestIssue} 期]", "HTTP Code: {$httpCode} | Response: {$res} | Error: {$errDesc}");
    
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Failed to push {$latestIssue}: {$errDesc}\n", FILE_APPEND);
    
    if (!$isCli) {
        header('Content-Type: application/json; charset=utf-8', true, 500);
        echo json_encode([
            'success' => false,
            'status' => 'error',
            'httpCode' => $httpCode,
            'error' => $errDesc,
            'time' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo "Cron 自动推送失败 (HTTP {$httpCode})！\n";
        echo "错误原因: {$errDesc}\n";
        echo "提示: 因为本次推送未成功，系统没有更新 last_pushed_issue.txt，将在下一次 Cron 触发时自动重试发送。\n";
    }
}

