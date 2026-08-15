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

// 加载 .env 变量 (寻找当前目录、上级目录，以及更上一级目录)
$envPaths = [
    __DIR__ . '/.env',
    dirname(__DIR__) . '/.env',
    dirname(dirname(__DIR__)) . '/.env'
];

foreach ($envPaths as $envPath) {
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
        break; // 找到并加载后退出循环
    }
}

return [
    // Telegram Bot 配置
    'telegram_bot_token' => $_ENV['TELEGRAM_BOT_TOKEN'] ?? getenv('TELEGRAM_BOT_TOKEN') ?: '',
    'telegram_chat_id'   => $_ENV['TELEGRAM_CHAT_ID'] ?? getenv('TELEGRAM_CHAT_ID') ?: '',
    'telegram_admin_id'  => $_ENV['TELEGRAM_ADMIN_ID'] ?? getenv('TELEGRAM_ADMIN_ID') ?: '',
    'telegram_api_base'  => $_ENV['TELEGRAM_API_BASE'] ?? getenv('TELEGRAM_API_BASE') ?: 'https://api.telegram.org',
    
    // Gemini API Key
    'gemini_api_key'     => $_ENV['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY') ?: '',
    
    // 数据接口配置
    'api_data_source'    => 'https://history.macaumarksix.com/history/macaujc3',
    'cache_file'         => __DIR__ . '/cache_draws.json',
    'log_file'           => __DIR__ . '/telegram_logs.json',
];
