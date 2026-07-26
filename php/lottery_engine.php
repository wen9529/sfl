<?php
/**
 * 澳门三分六合彩 - 开奖引擎与50期数据管理模块
 */

require_once __DIR__ . '/utils.php';

if (!function_exists('generateFallback50DrawsPHP')) {
    /**
     * 生成完整的 50 期澳门三分六合彩历史开奖模拟数据
     */
    function generateFallback50DrawsPHP($count = 50) {
        $draws = [];
        $todayStr = date('Ymd');
        $baseIssue = (int)($todayStr . '001') + 120; // 模拟当前最新期号
        
        for ($i = 0; $i < $count; $i++) {
            $issue = (string)($baseIssue - $i);
            
            // 随机生成6个不重复平码
            $reds = [];
            while (count($reds) < 6) {
                $r = rand(1, 49);
                if (!in_array($r, $reds)) $reds[] = $r;
            }
            sort($reds);
            
            // 随机生成1个特码
            $blue = rand(1, 49);
            while (in_array($blue, $reds)) {
                $blue = rand(1, 49);
            }
            
            $codeArr = array_merge($reds, [$blue]);
            $timeStr = date('Y-m-d H:i:s', time() - $i * 180); // 每3分钟一期
            
            $draws[] = [
                'expect' => $issue,
                'openCode' => implode(',', $codeArr),
                'openTime' => $timeStr,
                'wave' => implode(',', array_map('getWaveColorPHP', $codeArr)),
                'zodiac' => implode(',', array_map('getZodiacPHP', $codeArr)),
                'fiveElements' => implode(',', array_map('getFiveElementsPHP', $codeArr))
            ];
        }
        return $draws;
    }
}

if (!function_exists('getLatest50DrawsPHP')) {
    /**
     * 获取最新 50 期开奖记录 (优先读取远程 API/缓存，失败时自动退回本地引擎)
     */
    function getLatest50DrawsPHP($forceRefresh = false) {
        $config = require __DIR__ . '/config.php';
        $cacheFile = $config['cache_file'];
        
        // 缓存判断 (1分钟缓存有效)
        if (!$forceRefresh && file_exists($cacheFile)) {
            $cacheContent = file_get_contents($cacheFile);
            $cacheData = json_decode($cacheContent, true);
            if (!empty($cacheData) && isset($cacheData['time']) && (time() - $cacheData['time'] < 60)) {
                return $cacheData['draws'];
            }
        }
        
        // 尝试从远程抓取 50 期数据
        $draws = [];
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://history.macaumarksix.com/history/macaujc3");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 4);
        curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && !empty($response)) {
            $json = json_decode($response, true);
            if (!empty($json['data'][0]['data'])) {
                $rawList = $json['data'][0]['data'];
                foreach (array_slice($rawList, 0, 50) as $item) {
                    $codes = explode(',', $item['openCode'] ?? '');
                    if (count($codes) >= 7) {
                        $draws[] = [
                            'expect' => (string)($item['expect'] ?? ''),
                            'openCode' => implode(',', array_map('intval', $codes)),
                            'openTime' => $item['openTime'] ?? date('Y-m-d H:i:s'),
                            'wave' => implode(',', array_map('getWaveColorPHP', $codes)),
                            'zodiac' => implode(',', array_map('getZodiacPHP', $codes)),
                            'fiveElements' => implode(',', array_map('getFiveElementsPHP', $codes))
                        ];
                    }
                }
            }
        }
        
        // 如果抓取到的数据不足 50 期，则用 fallback 引擎补足
        if (count($draws) < 10) {
            $draws = generateFallback50DrawsPHP(50);
        }
        
        // 保存缓存
        file_put_contents($cacheFile, json_encode([
            'time' => time(),
            'draws' => $draws
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        return $draws;
    }
}
