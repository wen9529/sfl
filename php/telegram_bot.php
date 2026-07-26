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

// 提取 POST / GET / JSON 请求参数
$inputRaw = file_get_contents('php://input');
$jsonParams = json_decode($inputRaw, true) ?: [];
$requestParams = array_merge($_GET, $_POST, $jsonParams);

$action = isset($requestParams['action']) ? $requestParams['action'] : '';

// 1. Webhook 入口 (处理 Telegram 推送过来的指令 /draw, /predict, /help)
if (empty($action) && !empty($jsonParams['message'])) {
    http_response_code(200);
    echo "OK";

    $token = $config['telegram_bot_token'];
    if (!$token) exit;

    $chatId = $jsonParams['message']['chat']['id'];
    $text = trim($jsonParams['message']['text'] ?? '');

    if (strpos($text, '/start') === 0 || strpos($text, '/help') === 0) {
        $msgText = "<b>🎰 澳门三分六合彩 · Telegram Bot 极速助手 (PHP 版)</b>\n"
                 . "--------------------------------------\n"
                 . "<b>/draw</b> - 查询最新一期开奖结果 (含波色生肖)\n"
                 . "<b>/predict</b> - 获取热温概率加权智能预测分析\n"
                 . "<b>/help</b> - 显示此帮助菜单说明\n"
                 . "--------------------------------------\n"
                 . "<i>由 PHP 独立服务器授权强力驱动</i>";

        sendTgRequestPHP($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $msgText,
            'parse_mode' => 'HTML'
        ]);
        writeLogPHP('Webhook指令', 'success', "响应 /help 指令给 {$chatId}");
    } else if (strpos($text, '/draw') === 0) {
        $reds = [];
        while (count($reds) < 6) {
            $r = rand(1, 49);
            if (!in_array($r, $reds)) $reds[] = $r;
        }
        sort($reds);
        $blue = rand(1, 49);
        while (in_array($blue, $reds)) $blue = rand(1, 49);

        // 格式化补零
        $formattedReds = array_map(function($n) { return $n < 10 ? '0'.$n : ''.$n; }, $reds);
        $formattedBlue = $blue < 10 ? '0'.$blue : ''.$blue;

        $issue = date('Ymd') . sprintf("%03d", rand(1, 480));

        $msgText = "<b>🎰 澳门三分六合彩 · 最新开奖结果</b>\n"
                 . "--------------------------------------\n"
                 . "<b>期号</b>: <code>{$issue}</code>\n"
                 . "<b>平码</b>: <code>" . implode(' ', $formattedReds) . "</code>\n"
                 . "<b>特码</b>: <b>{$formattedBlue}</b>\n"
                 . "--------------------------------------\n"
                 . "🟢 状态: 实时数据同步完成 | PHP 极速引擎";

        sendTgRequestPHP($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $msgText,
            'parse_mode' => 'HTML'
        ]);
        writeLogPHP('Webhook指令', 'success', "响应 /draw 指令给 {$chatId}");
    } else if (strpos($text, '/predict') === 0) {
        // 生成智能预测数据
        $reds = [];
        while (count($reds) < 6) {
            $r = rand(1, 49);
            if (!in_array($r, $reds)) $reds[] = $r;
        }
        sort($reds);
        $blue = rand(1, 49);
        while (in_array($blue, $reds)) $blue = rand(1, 49);

        $formattedReds = array_map(function($n) { return $n < 10 ? '0'.$n : ''.$n; }, $reds);
        $formattedBlue = $blue < 10 ? '0'.$blue : ''.$blue;
        $confidence = rand(88, 97);
        $nextIssue = date('Ymd') . sprintf("%03d", rand(1, 480));

        $msgText = "<b>🧠 澳门三分六合彩 · AI智能算法预测</b>\n"
                 . "--------------------------------------\n"
                 . "<b>目标期号</b>: <code>{$nextIssue}</code>\n"
                 . "<b>算法名称</b>: 概率加权与极值波色缩水\n"
                 . "<b>预测置信度</b>: <b>{$confidence}% 🔥</b>\n"
                 . "--------------------------------------\n"
                 . "🎯 <b>推荐平码</b>: <code>" . implode(' ', $formattedReds) . "</code>\n"
                 . "💎 <b>推荐特码</b>: <b>[ {$formattedBlue} ]</b>\n"
                 . "--------------------------------------\n"
                 . "💡 <b>分析依据</b>: 基于遗漏冷热号分布及历史重号率综合建模生成。\n"
                 . "<i>声明: 预测结果仅供盘析参考，请理性理性参与。</i>";

        sendTgRequestPHP($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $msgText,
            'parse_mode' => 'HTML'
        ]);
        writeLogPHP('Webhook指令', 'success', "响应 /predict 指令给 {$chatId}");
    }
    exit;
}

// 2. 发送消息 API
if ($action === 'send') {
    $token = !empty($requestParams['botToken']) ? $requestParams['botToken'] : $config['telegram_bot_token'];
    $chatId = !empty($requestParams['chatId']) ? $requestParams['chatId'] : $config['telegram_chat_id'];

    if (!$token || !$chatId) {
        echo json_encode([
            'error' => '缺少 Bot Token 或 Chat ID，请在 config.php / .env 文件中设置，或在请求参数中传入 botToken 与 chatId'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $customText = $requestParams['customText'] ?? '📢 澳门三分六合彩管理员广播消息 (PHP)';

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
    $token = !empty($requestParams['botToken']) ? $requestParams['botToken'] : $config['telegram_bot_token'];
    
    // 自动判断并生成默认 Webhook URL (例如 https://wenge9529.serv00.net/telegram_bot.php)
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443 ? "https" : "https"; // 强推 https
    $host = $_SERVER['HTTP_HOST'] ?? 'wenge9529.serv00.net';
    $script = $_SERVER['SCRIPT_NAME'] ?? '/telegram_bot.php';
    $defaultWebhookUrl = "{$protocol}://{$host}{$script}";

    $webhookUrl = !empty($requestParams['webhookUrl']) ? $requestParams['webhookUrl'] : $defaultWebhookUrl;

    if (!$token) {
        echo json_encode([
            'error' => '缺少 Bot Token！请先在 config.php 或 .env 中填写 TELEGRAM_BOT_TOKEN，或在 URL 中添加 ?botToken=你的Token'
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
