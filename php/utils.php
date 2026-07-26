<?php
/**
 * 澳门三分六合彩 - 通用工具函数模块
 */

if (!function_exists('getWaveColorPHP')) {
    // 获取号码波色
    function getWaveColorPHP($num) {
        $reds = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
        $blues = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
        if (in_array((int)$num, $reds)) return 'red';
        if (in_array((int)$num, $blues)) return 'blue';
        return 'green';
    }
}

if (!function_exists('getWaveColorTextPHP')) {
    // 获取波色中文描述
    function getWaveColorTextPHP($num) {
        $color = getWaveColorPHP($num);
        if ($color === 'red') return '🔴红波';
        if ($color === 'blue') return '🔵蓝波';
        return '🟢绿波';
    }
}

if (!function_exists('getZodiacPHP')) {
    // 获取号码生肖 (2026年马年基准)
    function getZodiacPHP($num) {
        $zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
        return $zodiacs[((int)$num - 1) % 12];
    }
}

if (!function_exists('getFiveElementsPHP')) {
    // 获取号码五行
    function getFiveElementsPHP($num) {
        $num = (int)$num;
        $gold = [1, 2, 15, 16, 23, 24, 31, 32, 45, 46];
        $wood = [5, 6, 13, 14, 27, 28, 35, 36, 43, 44];
        $water = [3, 4, 11, 12, 19, 20, 33, 34, 41, 42, 49];
        $fire = [7, 8, 21, 22, 29, 30, 37, 38, 47, 48];
        if (in_array($num, $gold)) return '金';
        if (in_array($num, $wood)) return '木';
        if (in_array($num, $water)) return '水';
        if (in_array($num, $fire)) return '火';
        return '土';
    }
}

if (!function_exists('writeLogPHP')) {
    // 写日志
    function writeLogPHP($type, $status, $msg, $detail = null) {
        $config = require __DIR__ . '/config.php';
        $logFile = $config['log_file'];
        $logs = [];
        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?: [];
        }
        array_unshift($logs, [
            'id' => uniqid('log_'),
            'time' => date('Y-m-d H:i:s'),
            'type' => $type,
            'status' => $status,
            'message' => $msg,
            'detail' => $detail
        ]);
        if (count($logs) > 100) $logs = array_slice($logs, 0, 100);
        file_put_contents($logFile, json_encode($logs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}

if (!function_exists('sendTgRequestPHP')) {
    // 发送 Telegram API 请求
    function sendTgRequestPHP($token, $method, $data) {
        $url = "https://api.telegram.org/bot{$token}/{$method}";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $result = curl_exec($ch);
        curl_close($ch);
        return json_decode($result, true) ?: [];
    }
}
