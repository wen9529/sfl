<?php
/**
 * 澳门三分六合彩 定时任务 (PHP Cron Script)
 * 可在 Serv00 / cPanel / Linux Crontab 中配置每 3 分钟执行一次:
 * */3 * * * * php /path/to/php/cron.php > /dev/null 2>&1
 */

error_reporting(E_ALL);
date_default_timezone_set('Asia/Shanghai');

$config = require __DIR__ . '/config.php';

$token = $config['telegram_bot_token'];
$chatId = $config['telegram_chat_id'];

if (!$token || !$chatId) {
    echo "未配置 Telegram Token 或 Chat ID，定时开奖播报跳过。\n";
    exit;
}

// 模拟获取最新开奖
$reds = [];
while (count($reds) < 6) {
    $r = rand(1, 49);
    if (!in_array($r, $reds)) $reds[] = $r;
}
sort($reds);
$blue = rand(1, 49);
$issue = date('Ymd') . rand(100, 999);

$msgText = "<b>🎰 澳门三分六合彩 · 自动定时开奖播报 (Serv00 Cron)</b>\n"
         . "--------------------------------------\n"
         . "<b>期号</b>: <code>{$issue}</code>\n"
         . "<b>平码</b>: <code>" . implode(' ', $reds) . "</code>\n"
         . "<b>特码</b>: <b>{$blue}</b>\n"
         . "--------------------------------------\n"
         . "<i>每3分钟自动调度广播已完成</i>";

$url = "https://api.telegram.org/bot{$token}/sendMessage";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'chat_id' => $chatId,
    'text' => $msgText,
    'parse_mode' => 'HTML'
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$res = curl_exec($ch);
curl_close($ch);

echo "Cron 播报脚本完成，执行时间: " . date('Y-m-d H:i:s') . "\n";
