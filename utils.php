<?php
/**
 * 澳门三分六合彩 - 通用工具函数模块
 */

if (!function_exists('getWaveColorPHP')) {
    // 获取号码波色 (六合彩标准49码波色：红波17码、蓝波16码、绿波16码)
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
        $gold = [4, 5, 11, 12, 13, 26, 27, 34, 35, 42, 43];
        $wood = [8, 9, 16, 17, 24, 25, 38, 39, 46, 47];
        $water = [1, 14, 15, 22, 23, 30, 31, 44, 45];
        $fire = [2, 3, 10, 18, 19, 32, 33, 40, 41, 48, 49];
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
    // 发送 Telegram API 请求 (增强网络稳定性与详细错误捕捉)
    function sendTgRequestPHP($token, $method, $data) {
        $url = "https://api.telegram.org/bot{$token}/{$method}";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        // 关键：强制使用 IPv4 解析，避免 Serv00 等主机 IPv6 路由超时
        if (defined('CURLOPT_IPRESOLVE') && defined('CURL_IPRESOLVE_V4')) {
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        }
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'MacauLotteryBot/1.0');
        
        $result = curl_exec($ch);
        $curlErr = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($result, true);
        if (is_array($decoded)) {
            $decoded['http_code'] = $httpCode;
            if ($curlErr) $decoded['curl_error'] = $curlErr;
            return $decoded;
        }

        return [
            'ok' => false,
            'http_code' => $httpCode,
            'description' => !empty($curlErr) ? "cURL网络错误: {$curlErr} (HTTP {$httpCode})" : "Telegram API 无响应 (HTTP {$httpCode})",
            'curl_error' => $curlErr,
            'raw' => $result
        ];
    }
}

if (!function_exists('getNextIssuePHP')) {
    // 提取/增加期号
    function getNextIssuePHP($currentIssue) {
        if (preg_match('/^(\d{4})(\d{2})(\d{2})(\d{3})$/', $currentIssue, $matches)) {
            $y = $matches[1];
            $m = $matches[2];
            $d = $matches[3];
            $num = (int)$matches[4];
            
            $nextNum = $num + 1;
            $dateStr = "{$y}-{$m}-{$d}";
            
            if ($nextNum > 480) {
                $nextNum = 1;
                $date = new DateTime($dateStr);
                $date->modify('+1 day');
                $newY = $date->format('Y');
                $newM = $date->format('m');
                $newD = $date->format('d');
                return $newY . $newM . $newD . str_pad((string)$nextNum, 3, '0', STR_PAD_LEFT);
            }
            
            return $y . $m . $d . str_pad((string)$nextNum, 3, '0', STR_PAD_LEFT);
        }
        return $currentIssue . ' (预测)';
    }
}
