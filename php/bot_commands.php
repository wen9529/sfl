<?php
/**
 * Telegram Bot - 指令响应处理器模块
 */

require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

if (!function_exists('handleTelegramBotCommandPHP')) {
    /**
     * 处理收到的 Telegram 消息与指令
     */
    function handleTelegramBotCommandPHP($chatId, $text, $token) {
        $text = trim($text);

        // 1. /start 或 /help 指令
        if (strpos($text, '/start') === 0 || strpos($text, '/help') === 0) {
            $msgText = "<b>🎰 澳门三分六合彩 · Telegram Bot 极速助手 (模块化)</b>\n"
                     . "--------------------------------------\n"
                     . "<b>/draw</b> - 查询最新一期开奖结果 (含波色生肖)\n"
                     . "<b>/history [条数]</b> - 查看 50 期内多期开奖历史 (如 <code>/history 5</code>)\n"
                     . "<b>/predict</b> - 获取 50 期规律概率加权 AI 智能预测\n"
                     . "<b>/stats</b> 或 <b>/profit</b> - 查看 50 期算法模拟盘下注盈亏与 ROI\n"
                     . "<b>/help</b> - 显示此帮助菜单说明\n"
                     . "--------------------------------------\n"
                     . "<i>由 PHP 核心算法引擎架构强力驱动</i>";

            sendTgRequestPHP($token, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => $msgText,
                'parse_mode' => 'HTML'
            ]);
            writeLogPHP('Webhook指令', 'success', "响应 /help 给 {$chatId}");
            return;
        }

        // 2. /draw 开奖查询
        if (strpos($text, '/draw') === 0) {
            $draws = getLatest50DrawsPHP();
            $latest = $draws[0] ?? null;

            if ($latest) {
                $codes = explode(',', $latest['openCode']);
                $reds = array_slice($codes, 0, 6);
                $special = $codes[6];

                $fmtReds = array_map(function($n) { return (int)$n < 10 ? '0'.(int)$n : ''.$n; }, $reds);
                $fmtSpecial = (int)$special < 10 ? '0'.(int)$special : ''.$special;
                $zodiac = getZodiacPHP($special);
                $wave = getWaveColorTextPHP($special);

                $msgText = "<b>🎰 澳门三分六合彩 · 最新开奖结果</b>\n"
                         . "--------------------------------------\n"
                         . "<b>期号</b>: <code>{$latest['expect']}</code>\n"
                         . "<b>时间</b>: <code>{$latest['openTime']}</code>\n"
                         . "<b>平码</b>: <code>" . implode(' ', $fmtReds) . "</code>\n"
                         . "<b>特码</b>: <b>{$fmtSpecial}</b> ({$zodiac} / {$wave})\n"
                         . "--------------------------------------\n"
                         . "🟢 状态: 实时数据同步完成 | PHP 引擎";
            } else {
                $msgText = "⚠️ 暂时未能获取到最新开奖结果，请稍后重试。";
            }

            sendTgRequestPHP($token, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => $msgText,
                'parse_mode' => 'HTML'
            ]);
            writeLogPHP('Webhook指令', 'success', "响应 /draw 给 {$chatId}");
            return;
        }

        // 3. /history 历史记录查询
        if (strpos($text, '/history') === 0) {
            $parts = explode(' ', $text);
            $count = isset($parts[1]) && is_numeric($parts[1]) ? intval($parts[1]) : 5;
            if ($count < 1) $count = 5;
            if ($count > 10) $count = 10;

            $draws = getLatest50DrawsPHP();
            $slice = array_slice($draws, 0, $count);
            $lines = [];

            foreach ($slice as $item) {
                $codes = explode(',', $item['openCode']);
                if (count($codes) < 7) continue;

                $reds = array_slice($codes, 0, 6);
                $special = $codes[6];

                $fmtReds = array_map(function($n) { return (int)$n < 10 ? '0'.(int)$n : ''.$n; }, $reds);
                $fmtSpecial = (int)$special < 10 ? '0'.(int)$special : ''.$special;
                $zodiac = getZodiacPHP($special);
                $wave = getWaveColorTextPHP($special);

                $lines[] = "<b>第 {$item['expect']} 期</b> (" . substr($item['openTime'], 11, 8) . ")\n"
                         . "平码: <code>" . implode(' ', $fmtReds) . "</code> | 特码: <b>{$fmtSpecial}</b> ({$zodiac}/{$wave})";
            }

            $msgText = "<b>📜 澳门三分六合彩 · 近 {$count} 期历史开奖记录 (50期数据库)</b>\n"
                     . "--------------------------------------\n"
                     . implode("\n\n", $lines) . "\n"
                     . "--------------------------------------\n"
                     . "💡 提示: 输入 <code>/history 10</code> 可获取最多 10 期记录";

            sendTgRequestPHP($token, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => $msgText,
                'parse_mode' => 'HTML'
            ]);
            writeLogPHP('Webhook指令', 'success', "响应 /history {$count} 给 {$chatId}");
            return;
        }

        // 4. /predict 基于 50 期深入规律分析的智能预测
        if (strpos($text, '/predict') === 0) {
            $draws = getLatest50DrawsPHP();
            $prediction = generatePredictFrom50DrawsPHP($draws);

            $msgText = "<b>🧠 澳门三分六合彩 · 50期统计规律智能预测</b>\n"
                     . "--------------------------------------\n"
                     . "<b>目标期号</b>: <code>{$prediction['targetIssue']}</code>\n"
                     . "<b>精算模型</b>: {$prediction['algorithmName']}\n"
                     . "<b>预测置信度</b>: <b>{$prediction['confidence']}% 🔥</b>\n"
                     . "--------------------------------------\n"
                     . "🎯 <b>推荐平码 (6码)</b>: <code>" . implode(' ', $prediction['formattedReds']) . "</code>\n"
                     . "💎 <b>推荐特码 (1码)</b>: <b>[ {$prediction['formattedBlue']} ]</b> ({$prediction['specialZodiac']} / {$prediction['specialWave']})\n"
                     . "🛡️ <b>防冷备选 (2码)</b>: <code>" . implode(' ', $prediction['formattedBackups']) . "</code>\n"
                     . "--------------------------------------\n"
                     . "💡 <b>50期规律依据</b>:\n"
                     . "<i>{$prediction['rationale']}</i>\n"
                     . "--------------------------------------\n"
                     . "<i>声明: 预测基于近50期开奖记录规律与回归分析，请理性参考。</i>";

            sendTgRequestPHP($token, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => $msgText,
                'parse_mode' => 'HTML'
            ]);
            writeLogPHP('Webhook指令', 'success', "响应 /predict 给 {$chatId}");
            return;
        }

        // 5. /stats 或 /profit 或 /pnl 盈亏与投资回报统计
        if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {
            $draws = getLatest50DrawsPHP();
            $pnl = calculateProfitAndLossPHP($draws);
            $stats = analyze50DrawsStatsPHP($draws);

            $topHotStr = implode(' ', array_slice($stats['hotNumbers'], 0, 5));
            $topColdStr = implode(' ', array_slice($stats['coldNumbers'], 0, 5));

            $msgText = "<b>📊 澳门三分六合彩 · 50期规律回测盈亏统计报表</b>\n"
                     . "--------------------------------------\n"
                     . "<b>回测期数</b>: <code>{$pnl['totalRounds']}</code> 期实盘数据跟踪\n"
                     . "<b>累计投入</b>: <code>" . number_format($pnl['totalBet']) . " USDT</code>\n"
                     . "<b>累计派彩</b>: <code>" . number_format($pnl['totalPayout']) . " USDT</code>\n"
                     . "<b>净盈亏额</b>: <b>+" . number_format($pnl['netProfit']) . " USDT 📈</b>\n"
                     . "<b>投资回报率</b>: <b>+{$pnl['roi']}% 🔥 (ROI)</b>\n"
                     . "--------------------------------------\n"
                     . "🎯 <b>特码命中率</b>: <code>{$pnl['specialHitRate']}%</code> (3码复式模式)\n"
                     . "🎲 <b>平码平均命中</b>: <code>{$pnl['avgRedHits']} 码 / 期</code>\n"
                     . "🏆 <b>历史最长连红</b>: <b>{$pnl['maxStreak']} 连红 🔥</b>\n"
                     . "🔥 <b>近50期极热号码</b>: <code>{$topHotStr}</code>\n"
                     . "❄️ <b>近50期极冷号码</b>: <code>{$topColdStr}</code>\n"
                     . "--------------------------------------\n"
                     . "🔴 <b>红/蓝/绿波占比</b>: {$stats['waveDistribution']['redRatio']}% / {$stats['waveDistribution']['blueRatio']}% / {$stats['waveDistribution']['greenRatio']}%\n"
                     . "💡 <i>算法模型根据最新 50 期开奖动态更新。</i>";

            sendTgRequestPHP($token, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => $msgText,
                'parse_mode' => 'HTML'
            ]);
            writeLogPHP('Webhook指令', 'success', "响应 /stats 给 {$chatId}");
            return;
        }
    }
}
