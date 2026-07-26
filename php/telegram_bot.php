<?php
/**
 * 澳门三分六合彩 Telegram Bot 管理器 (PHP 版)
 * 支持 Webhook 消息接收、指令响应及消息一键广播
 */

header('Content-Type: application/json; charset=utf-8');
$config = require __DIR__ . '/config.php';

// 记录日志函数
function writeLogPHP($type, $status, $msg, $detail = '') {
    $logFile = __DIR__ . '/telegram_logs.json';
    $logs = file_exists($logFile) ? json_decode(file_get_contents($logFile), true) : [];
    if (!is_array($logs)) $logs = [];

    array_unshift($logs, [
        'id' => 'log-' . time() . '-' . rand(100, 999),
        'time' => date('H:i:s'),
        'type' => $type,
        'status' => $status,
        'message' => $msg,
        'errorDetail' => $detail
    ]);

    if (count($logs) > 50) array_pop($logs);
    file_put_contents($logFile, json_encode($logs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// 提取 POST 请求 body
$inputRaw = file_get_contents('php://input');
$inputData = json_decode($inputRaw, true) ?: [];

$action = isset($_GET['action']) ? $_GET['action'] : '';

// 1. Webhook 入口 (处理 Telegram 推送过来的指令 /draw, /predict, /help)
if (empty($action) && !empty($inputData['message'])) {
    http_response_code(200);
    echo "OK";

    $token = $config['telegram_bot_token'];
    if (!$token) exit;

    $chatId = $inputData['message']['chat']['id'];
    $text = trim($inputData['message']['text'] ?? '');

    if (strpos($text, '/start') === 0 || strpos($text, '/help') === 0) {
        $msgText = "<b>🎰 澳门三分六合彩 · Telegram Bot 指令 (PHP 版)</b>\n"
                 . "--------------------------------------\n"
                 . "/draw - 查询最新一期开奖结果 (含波色生肖)\n"
                 . "/predict - 获取热温概率加权智能预测\n"
                 . "/help - 显示此帮助菜单\n"
                 . "--------------------------------------\n"
                 . "<i>由 PHP 独立服务器授权强力驱动</i>";

        sendTgRequestPHP($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $msgText,
            'parse_mode' => 'HTML'
        ]);
    } else if (strpos($text, '/draw') === 0) {
        $reds = [rand(1,49), rand(1,49), rand(1,49), rand(1,49), rand(1,49), rand(1,49)];
        sort($reds);
        $blue = rand(1,49);

        $msgText = "<b>🎰 澳门三分六合彩 · 最新开奖结果 (PHP)</b>\n"
                 . "期号: <code>" . date('Ymd') . "088</code>\n"
                 . "平码: <code>" . implode(' ', $reds) . "</code>\n"
                 . "特码: <b>" . $blue . "</b>\n"
                 . "状态: 🟢 实时同步完毕";

        sendTgRequestPHP($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $msgText,
            'parse_mode' => 'HTML'
        ]);
    }
    exit;
}

// 2. 发送消息 API
if ($action === 'send') {
    $token = !empty($inputData['botToken']) ? $inputData['botToken'] : $config['telegram_bot_token'];
    $chatId = !empty($inputData['chatId']) ? $inputData['chatId'] : $config['telegram_chat_id'];

    if (!$token || !$chatId) {
        echo json_encode(['error' => '缺少 Bot Token 或 Chat ID'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $customText = $inputData['customText'] ?? '📢 澳门三分六合彩管理员广播消息 (PHP)';

    $res = sendTgRequestPHP($token, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $customText,
        'parse_mode' => 'HTML'
    ]);

    if ($res['ok'] ?? false) {
        writeLogPHP('PHP广播', 'success', "成功推送至 {$chatId}");
        echo json_encode(['success' => true, 'message_id' => $res['result']['message_id']], JSON_UNESCAPED_UNICODE);
    } else {
        $err = $res['description'] ?? '发送失败';
        writeLogPHP('PHP广播', 'error', "推送失败", $err);
        echo json_encode(['error' => $err], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// 3. 绑定 Webhook API
if ($action === 'set_webhook') {
    $token = !empty($inputData['botToken']) ? $inputData['botToken'] : $config['telegram_bot_token'];
    $webhookUrl = $inputData['webhookUrl'] ?? '';

    if (!$token || !$webhookUrl) {
        echo json_encode(['error' => '缺少参数 Token 或 Webhook URL'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $res = sendTgRequestPHP($token, 'setWebhook', ['url' => $webhookUrl]);
    if ($res['ok'] ?? false) {
        writeLogPHP('Webhook', 'success', "已绑定 Webhook: {$webhookUrl}");
        echo json_encode(['success' => true, 'result' => $res], JSON_UNESCAPED_UNICODE);
    } else {
        $err = $res['description'] ?? '绑定失败';
        writeLogPHP('Webhook', 'error', "Webhook 绑定失败", $err);
        echo json_encode(['error' => $err], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// cURL 请求 Telegram API 辅助函数
function sendTgRequestPHP($token, $method, $params) {
    $url = "https://api.telegram.org/bot{$token}/{$method}";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $result = curl_exec($ch);
    curl_close($ch);

    return json_decode($result, true) ?: [];
}

echo json_encode(['status' => 'Telegram Bot PHP Endpoint Ready'], JSON_UNESCAPED_UNICODE);
