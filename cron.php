<?php
/**
 * 澳门三分六合彩 定时任务 (PHP Cron Script)
 * 可在 Serv00 / cPanel / Linux Crontab 中配置每 1 分钟执行一次:
 * * * * * /usr/local/bin/php83 /path/to/cron.php > /dev/null 2>&1
 */
error_reporting(E_ALL);
date_default_timezone_set('Asia/Shanghai');

// === 新增：CLI 运行环境检测与日志 ===
if (php_sapi_name() === 'cli') {
    file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Cron triggered.\n", FILE_APPEND);
    if (!function_exists('curl_init')) {
        file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Error: curl extension is missing in CLI!\n", FILE_APPEND);
    }
}

require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

$config = require __DIR__ . '/config.php';
$token = $config['telegram_bot_token'];
$chatId = $config['telegram_chat_id'];

if (!$token || !$chatId) {
    echo "未配置 Telegram Token 或 Chat ID，定时开奖播报跳过。\n";
    if (php_sapi_name() === 'cli') file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Missing token/chatId.\n", FILE_APPEND);
    exit;
}

// 检查是否强制运行推送
$isForce = (php_sapi_name() === 'cli' && isset($argv) && in_array('--force', $argv)) || isset($_GET['force']);

// 获得最新50期记录 (如果强制运行，则强制刷新缓存)
$draws = getLatestDrawsPHP($isForce);

if (empty($draws)) {
    echo "未能获取到开奖记录。\n";
    if (php_sapi_name() === 'cli') file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Failed to fetch draws.\n", FILE_APPEND);
    exit;
}

// === 重点修复：持久化预测并结算历史记录 ===
if (function_exists('updatePredictionsDBPHP')) {
    updatePredictionsDBPHP($draws);
}

$latestIssue = $draws[0]['expect'] ?? '';
$lastFile = __DIR__ . '/last_pushed_issue.txt';
$lastPushedIssue = file_exists($lastFile) ? trim(file_get_contents($lastFile)) : '';

// 检查期号是否更新，如果是旧的开奖记录则不运行预测与推送 (在非强制模式下)
if (!$isForce && $latestIssue === $lastPushedIssue) {
    echo "期号 [第 {$latestIssue} 期] 已于之前推送成功，跳过本次预测与推送。\n";
    if (php_sapi_name() === 'cli') file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Skipped issue {$latestIssue}, already pushed.\n", FILE_APPEND);
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
    
    if (php_sapi_name() === 'cli') file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Success pushed {$latestIssue}.\n", FILE_APPEND);
    echo "Cron 自动推送成功 (HTTP 200)，已记录最新期号 [{$latestIssue}]，执行时间: " . date('Y-m-d H:i:s') . "\n";
} else {
    $errDesc = isset($resData['description']) ? $resData['description'] : '网络超时、CURL报错或Telegram接口无响应';
    
    // 写入失败日志，以便在管理面板中查看详细原因
    writeLogPHP('定时推送', 'error', "推送失败 [第 {$latestIssue} 期]", "HTTP Code: {$httpCode} | Response: {$res} | Error: {$errDesc}");
    
    if (php_sapi_name() === 'cli') file_put_contents(__DIR__ . '/cron_debug.log', "[" . date('Y-m-d H:i:s') . "] Failed to push {$latestIssue}: {$errDesc}\n", FILE_APPEND);
    echo "Cron 自动推送失败 (HTTP {$httpCode})！\n";
    echo "错误原因: {$errDesc}\n";
    echo "提示: 因为本次推送未成功，系统没有更新 last_pushed_issue.txt，将在下一次 Cron 触发时自动重试发送。\n";
}
