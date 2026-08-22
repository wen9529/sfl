<?php
/**
 * 澳门三分六合彩 · Telegram Bot Webhook 主入口 (模块化架构)
 */

date_default_timezone_set('Asia/Shanghai');
header('Content-Type: application/json; charset=utf-8');

// 引入模块
$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';
require_once __DIR__ . '/bot_commands.php';

// 提取 POST / GET / JSON 请求参数
$inputRaw = file_get_contents('php://input');
$jsonParams = json_decode($inputRaw, true) ?: [];
$requestParams = array_merge($_GET, $_POST, $jsonParams);

// 记录收到的 Webhook 请求日志，便于随时排查
if (!empty($inputRaw)) {
    file_put_contents(__DIR__ . '/bot_debug.log', "[" . date('Y-m-d H:i:s') . "] " . $inputRaw . "\n", FILE_APPEND);
}

$action = isset($requestParams['action']) ? $requestParams['action'] : '';

// 1. Webhook 入口 (处理 Telegram 推送过来的消息与按钮 Callback)
if (!empty($jsonParams['message']) || !empty($jsonParams['callback_query']) || !empty($jsonParams['edited_message'])) {
    $token = $config['telegram_bot_token'] ?? '8902856799:AAGo7TyPEfp9bWRYidb_dbpUQJxjU7gkm3s';
    if (!$token) {
        http_response_code(200);
        echo "OK";
        exit;
    }

    try {
        // 调用 Bot 指令与按钮处理模块
        handleTelegramBotCommandPHP($jsonParams, $token);
    } catch (Throwable $e) {
        file_put_contents(__DIR__ . '/bot_debug.log', "[" . date('Y-m-d H:i:s') . "] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    }

    http_response_code(200);
    echo "OK";
    exit;
}

// 2. 发送广播消息 API
if ($action === 'send') {
    $token = !empty($requestParams['botToken']) ? $requestParams['botToken'] : $config['telegram_bot_token'];
    $chatId = !empty($requestParams['chatId']) ? $requestParams['chatId'] : $config['telegram_chat_id'];

    if (!$token || !$chatId) {
        echo json_encode([
            'error' => '缺少 Bot Token 或 Chat ID，请在 config.php / .env 文件中设置，或在请求参数中传入 botToken 与 chatId'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $customText = $requestParams['customText'] ?? '📢 澳门三分六合彩管理员广播消息 (PHP 模块化驱动)';

    $res = sendTgRequestPHP($token, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $customText,
        'parse_mode' => 'HTML'
    ]);

    if ($res['ok'] ?? false) {
        writeLogPHP('主动发送', 'success', "已向 {$chatId} 发送消息", $customText);
        echo json_encode(['success' => true, 'result' => $res], JSON_UNESCAPED_UNICODE);
    } else {
        $err = $res['description'] ?? '发送失败';
        writeLogPHP('主动发送', 'error', "向 {$chatId} 发送失败", $err);
        echo json_encode(['error' => $err], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// 3. 绑定 Webhook API
if ($action === 'set_webhook') {
    $token = !empty($requestParams['botToken']) ? $requestParams['botToken'] : $config['telegram_bot_token'];
    
    // 自动判断并生成默认 Webhook URL
    $protocol = "https";
    $host = $_SERVER['HTTP_HOST'] ?? 'wenge9529.serv00.net';
    $script = '/telegram_bot.php'; // 强制绑定到 telegram_bot.php，避免 shared hosting 附加 public_html 等目录
    $defaultWebhookUrl = "{$protocol}://{$host}{$script}";

    $webhookUrl = !empty($requestParams['webhookUrl']) ? $requestParams['webhookUrl'] : $defaultWebhookUrl;

    if (!$token) {
        echo json_encode([
            'error' => '缺少 Bot Token！请先在 config.php 或 .env 中填写 TELEGRAM_BOT_TOKEN'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $res = sendTgRequestPHP($token, 'setWebhook', ['url' => $webhookUrl]);

    if ($res['ok'] ?? false) {
        writeLogPHP('Webhook', 'success', "已成功绑定 Webhook: {$webhookUrl}");
        echo json_encode([
            'success' => true,
            'message' => 'Webhook 绑定成功！',
            'webhookUrl' => $webhookUrl,
            'result' => $res
        ], JSON_UNESCAPED_UNICODE);
    } else {
        $err = $res['description'] ?? '绑定失败';
        writeLogPHP('Webhook', 'error', "Webhook 绑定失败", $err);
        echo json_encode([
            'error' => $err,
            'attemptedWebhookUrl' => $webhookUrl
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// 4. 查询统计数据 API
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

// 5. 健康检查
echo json_encode([
    'status' => 'online',
    'service' => '澳门三分六合彩 Telegram Bot (PHP 模块化独立运行环境)',
    'time' => date('Y-m-d H:i:s'),
    'hasBotToken' => !empty($config['telegram_bot_token']),
    'hasChatId' => !empty($config['telegram_chat_id'])
], JSON_UNESCAPED_UNICODE);
