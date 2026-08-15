<?php
/**
 * 澳门三分六合彩 · Telegram Bot Webhook 主入口 (模块化架构)
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', 0);
date_default_timezone_set('Asia/Shanghai');

// 开启输出缓冲，确保无意外字符污染 JSON
ob_start();

// 引入模块
try {
    $config = require __DIR__ . '/config.php';
    require_once __DIR__ . '/utils.php';
    require_once __DIR__ . '/lottery_engine.php';
    require_once __DIR__ . '/stats_algorithm.php';
    require_once __DIR__ . '/bot_commands.php';
} catch (\Throwable $e) {
    ob_end_clean();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'init_error' => $e->getMessage()]);
    exit;
}

// 提取 POST / GET / JSON 请求参数
$inputRaw = file_get_contents('php://input');
$jsonParams = json_decode($inputRaw, true) ?: [];
$requestParams = array_merge($_GET, $_POST, $jsonParams);

$action = isset($requestParams['action']) ? $requestParams['action'] : '';

// 1. Webhook 入口 (处理 Telegram 推送过来的消息与按钮 Callback)
if (empty($action) && (!empty($jsonParams['message']) || !empty($jsonParams['callback_query']))) {
    $token = !empty($config['telegram_bot_token']) ? $config['telegram_bot_token'] : '8902856799:AAHTYxIWSpohEBtQkn9Ii4DJcIjo6uIfgbg';

    try {
        // 记录收到 Webhook 的日志
        $sender = $jsonParams['message']['from']['username'] ?? $jsonParams['message']['from']['id'] ?? ($jsonParams['callback_query']['from']['id'] ?? 'unknown');
        $cmdText = $jsonParams['message']['text'] ?? ($jsonParams['callback_query']['data'] ?? '');
        writeLogPHP('Webhook收到请求', 'info', "收到来自 {$sender} 的请求: {$cmdText}");

        // 同步调用 Bot 指令与按钮处理模块，完成 Telegram Webhook Direct Response 响应
        handleTelegramBotCommandPHP($jsonParams, $token);
    } catch (\Throwable $e) {
        writeLogPHP('Webhook执行异常', 'error', $e->getMessage(), $e->getTraceAsString());
    }

    ob_end_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

ob_end_clean();
header('Content-Type: application/json; charset=utf-8');

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
    $token = !empty($requestParams['botToken']) ? $requestParams['botToken'] : (!empty($requestParams['bot_token']) ? $requestParams['bot_token'] : ($config['telegram_bot_token'] ?? ''));
    
    // 自动判断并生成默认 Webhook URL
    $protocol = "https";
    $host = $_SERVER['HTTP_HOST'] ?? 'wenge9529.serv00.net';
    $script = $_SERVER['SCRIPT_NAME'] ?? '/telegram_bot.php';
    $defaultWebhookUrl = "{$protocol}://{$host}{$script}";

    $webhookUrl = !empty($requestParams['webhookUrl']) ? $requestParams['webhookUrl'] : $defaultWebhookUrl;

    if (!$token) {
        echo json_encode([
            'success' => false,
            'error' => '缺少 Bot Token！请先在 config.php 或 .env 中填写 TELEGRAM_BOT_TOKEN，或在请求参数中传入 botToken',
            'attemptedWebhookUrl' => $webhookUrl
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $res = sendTgRequestPHP($token, 'setWebhook', [
        'url' => $webhookUrl,
        'drop_pending_updates' => true
    ]);

    // 自动向 Telegram 注册菜单指令列表
    sendTgRequestPHP($token, 'setMyCommands', [
        'commands' => [
            ['command' => 'start', 'description' => '启动助手并开启底部快捷键盘菜单'],
            ['command' => 'draw', 'description' => '查询最新一期开奖结果与生肖波色'],
            ['command' => 'predict', 'description' => '50期规律AI智能推演预测推荐'],
            ['command' => 'history', 'description' => '翻页查看历史开奖与推演命中'],
            ['command' => 'stats', 'description' => '每日下注累计盈亏与准确率报表'],
            ['command' => 'bind', 'description' => '绑定当前群组/私聊为定时推送目标'],
            ['command' => 'help', 'description' => '查看详细使用说明与指令指南']
        ]
    ]);

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
        $httpCode = $res['http_code'] ?? 0;
        $directSetUrl = "https://api.telegram.org/bot{$token}/setWebhook?url=" . urlencode($webhookUrl) . "&drop_pending_updates=true";
        $directInfoUrl = "https://api.telegram.org/bot{$token}/getWebhookInfo";
        
        writeLogPHP('Webhook', 'error', "Webhook 绑定失败: {$err}", "HTTP: {$httpCode} | URL: {$webhookUrl}");
        echo json_encode([
            'success' => false,
            'error' => $err,
            'http_code' => $httpCode,
            'attemptedWebhookUrl' => $webhookUrl,
            'directManualBindUrl' => $directSetUrl,
            'checkWebhookInfoUrl' => $directInfoUrl,
            'solution' => [
                '1. 若提示 401 Unauthorized，说明 Bot Token 错误或已过期失效，请检查 config.php',
                '2. 若由于服务器网络波动，可直接在电脑浏览器中访问上方 directManualBindUrl 链接一键直连绑定',
                '3. Webhook 地址必须为公网可访问的 HTTPS 协议地址'
            ],
            'result' => $res
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
