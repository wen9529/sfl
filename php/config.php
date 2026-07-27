<?php
/**
 * 澳门三分六合彩 & Telegram Bot 配置文件 (PHP 版)
 * 支持读取 .env 文件或在此处配置
 */

// 开启错误提示 (调试完成后可关闭)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 时区设置
date_default_timezone_set('Asia/Shanghai');

// 加载 .env 变量 (如果存在)
$envPath = dirname(__DIR__) . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $val = trim($value, " \t\n\r\0\x0B\"'");
            $_ENV[trim($name)] = $val;
            putenv(trim($name) . '=' . $val);
        }
    }
}

return [
    // Telegram Bot 配置
    'telegram_bot_token' => getenv('TELEGRAM_BOT_TOKEN') ?: '',
    'telegram_chat_id'   => getenv('TELEGRAM_CHAT_ID') ?: '',
    'telegram_admin_id'  => getenv('TELEGRAM_ADMIN_ID') ?: '',
    
    // Gemini API Key
    'gemini_api_key'     => getenv('GEMINI_API_KEY') ?: '',
    
    // 数据接口配置
    'api_data_source'    => 'https://history.macaumarksix.com/history/macaujc3',
    'cache_file'         => __DIR__ . '/cache_draws.json',
    'log_file'           => __DIR__ . '/telegram_logs.json',
];
