<?php
/**
 * 澳门三分六合彩 定时任务 (PHP Cron Script)
 * 可在 Serv00 / cPanel / Linux Crontab 中配置每 1 分钟执行一次:
 * * * * * php /path/to/php/cron.php > /dev/null 2>&1
 */

error_reporting(E_ALL);
date_default_timezone_set('Asia/Shanghai');

require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

$config = require __DIR__ . '/config.php';

$token = $config['telegram_bot_token'];
$chatId = $config['telegram_chat_id'];

if (!$token || !$chatId) {
    echo "未配置 Telegram Token 或 Chat ID，定时开奖播报跳过。\n";
    exit;
}

// 获得最新50期记录
$draws = getLatestDrawsPHP();
if (empty($draws)) {
    echo "未能获取到开奖记录。\n";
    exit;
}

$latestIssue = $draws[0]['expect'] ?? '';
$lastFile = __DIR__ . '/last_pushed_issue.txt';
$lastPushedIssue = file_exists($lastFile) ? trim(file_get_contents($lastFile)) : '';

// 检查期号是否更新，如果是旧的开奖记录则不运行预测与推送
if ($latestIssue === $lastPushedIssue) {
    echo "期号 [第 {$latestIssue} 期] 未更新变动，跳过预测与推送。\n";
    exit;
}

// 记录新期号
file_put_contents($lastFile, $latestIssue);

// 生成复合推演帖子并发送
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

echo "Cron 自动推送成功 (HTTP {$httpCode})，执行时间: " . date('Y-m-d H:i:s') . "\n";
