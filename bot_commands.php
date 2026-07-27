<?php
/**
 * Telegram Bot - 指令与按钮响应处理器模块
 */

require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

if (!function_exists('handleTelegramBotCommandPHP')) {
    /**
     * 处理 Telegram 消息、菜单与 Inline Button Callback Query
     */
    function handleTelegramBotCommandPHP($update, $token) {
        $chatId = null;
        $text = '';
        $messageId = null;
        $userMessageId = null;
        $isCallback = false;
        $callbackQueryId = null;

        if (!empty($update['callback_query'])) {
            $isCallback = true;
            $cb = $update['callback_query'];
            $callbackQueryId = $cb['id'];
            $chatId = $cb['message']['chat']['id'] ?? null;
            $messageId = $cb['message']['message_id'] ?? null;
            $text = trim($cb['data'] ?? '');

            // 映射 Callback Data 到指令文本
            if ($text === 'cmd_draw') $text = '/draw';
            else if ($text === 'cmd_predict') $text = '/predict';
            else if ($text === 'cmd_stats') $text = '/stats';
            else if (strpos($text, 'cmd_history') === 0) {
                if (preg_match('/page_(\d+)/', $text, $matches)) {
                    $page = intval($matches[1]);
                    $text = "/history {$page}";
                } else {
                    $text = '/history 1';
                }
            }
            else if ($text === 'cmd_help') $text = '/help';

            // 响应 callback 消除按钮加载动画
            sendTgRequestPHP($token, 'answerCallbackQuery', [
                'callback_query_id' => $callbackQueryId
            ]);
        } else if (!empty($update['message'])) {
            $msg = $update['message'];
            $chatId = $msg['chat']['id'] ?? null;
            $userMessageId = $msg['message_id'] ?? null;
            $text = trim($msg['text'] ?? '');

            // 映射键盘菜单点击文本
            if (strpos($text, '最新开奖') !== false) $text = '/draw';
            else if (strpos($text, '智能预测') !== false) $text = '/predict';
            else if (strpos($text, '盈亏统计') !== false || strpos($text, '盈亏') !== false) $text = '/stats';
            else if (strpos($text, '历史记录') !== false) $text = '/history 1';
            else if (strpos($text, '帮助') !== false) $text = '/help';
        }

        if (!$chatId) return;

        // 通用 Reply Keyboard 菜单
        $replyKeyboard = [
            'keyboard' => [
                [['text' => '🎰 最新开奖'], ['text' => '📜 历史记录']],
                [['text' => '🧠 智能预测'], ['text' => '📊 盈亏统计']]
            ],
            'resize_keyboard' => true,
            'one_time_keyboard' => false
        ];

        // 统一发送/编辑辅助函数 (新帖子覆盖旧帖子，避免刷屏)
        $deliverMessage = function($msgText, $inlineButtons) use ($token, $chatId, $messageId, $userMessageId, $isCallback, $replyKeyboard, &$text) {
            if ($isCallback && $messageId) {
                // 编辑/覆盖旧帖子内容
                $res = sendTgRequestPHP($token, 'editMessageText', [
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'text' => $msgText,
                    'parse_mode' => 'HTML',
                    'reply_markup' => ['inline_keyboard' => $inlineButtons]
                ]);

                if (!($res['ok'] ?? false)) {
                    sendTgRequestPHP($token, 'sendMessage', [
                        'chat_id' => $chatId,
                        'text' => $msgText,
                        'parse_mode' => 'HTML',
                        'reply_markup' => ['inline_keyboard' => $inlineButtons]
                    ]);
                }
            } else {
                // 这是用户发送的文本指令 (非回调)
                // 1. 尝试删除用户的原始指令消息 (保持界面整洁)
                if ($userMessageId) {
                    sendTgRequestPHP($token, 'deleteMessage', [
                        'chat_id' => $chatId,
                        'message_id' => $userMessageId
                    ]);
                }

                // 2. 尝试删除 Bot 之前发送的对应卡片 (确保屏幕只保留一个活动卡片)
                $stateFile = __DIR__ . '/telegram_user_states.json';
                $userStates = file_exists($stateFile) ? (json_decode(file_get_contents($stateFile), true) ?: []) : [];
                
                $lastMsgId = $userStates[$chatId]['last_bot_msg_id'] ?? null;
                if ($lastMsgId) {
                    sendTgRequestPHP($token, 'deleteMessage', [
                        'chat_id' => $chatId,
                        'message_id' => $lastMsgId
                    ]);
                }

                // 发送新消息并携带内联按钮与底部键盘菜单
                $res = sendTgRequestPHP($token, 'sendMessage', [
                    'chat_id' => $chatId,
                    'text' => $msgText,
                    'parse_mode' => 'HTML',
                    'reply_markup' => ['inline_keyboard' => $inlineButtons]
                ]);

                if (isset($res['result']['message_id'])) {
                    $userStates[$chatId]['last_bot_msg_id'] = $res['result']['message_id'];
                    file_put_contents($stateFile, json_encode($userStates, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                }

                // 仅在 /start 或 /help 时才发送配置底部菜单的提示
                if (strpos($text, '/start') === 0 || strpos($text, '/help') === 0) {
                    sendTgRequestPHP($token, 'sendMessage', [
                        'chat_id' => $chatId,
                        'text' => '📱 底部常驻菜单已配置，可随时点击切换：',
                        'reply_markup' => $replyKeyboard
                    ]);
                }
            }
        };

        // 1. /start 或 /help 指令
        if (strpos($text, '/start') === 0 || strpos($text, '/help') === 0) {
            $msgText = "<b>🎰 澳门三分六合彩 · Telegram Bot 极速助手</b>\n"
                     . "--------------------------------------\n"
                     . "<b>🎰 最新开奖</b> - 查询最新一期开奖结果 (含生肖波色)\n"
                     . "<b>📜 历史记录</b> - 翻页查看 50 期开奖历史\n"
                     . "<b>🧠 智能预测</b> - 50期规律概率加权 AI 智能预测\n"
                     . "<b>📊 盈亏统计</b> - 每日预测下注动态累计盈亏报表\n"
                     . "<b>❓ 帮助菜单</b> - 显示功能与使用说明\n"
                     . "--------------------------------------\n"
                     . "<i>💡 提示: 点击下方【键盘菜单】即可切换功能，帖子内按钮提供翻页与刷新支持。</i>";

            $inlineButtons = [
                [['text' => '🔄 刷新使用说明', 'callback_data' => 'cmd_help']]
            ];

            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /help 给 {$chatId}");
            return;
        }

        // 2. /draw 开奖查询
        if (strpos($text, '/draw') === 0) {
            $draws = getLatestDrawsPHP();
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
                         . "🟢 状态: 实时数据同步完成 | 刷新时间: " . date('H:i:s');
            } else {
                $msgText = "⚠️ 暂时未能获取到最新开奖结果，请稍后重试。";
            }

            $inlineButtons = [
                [['text' => '🔄 刷新最新开奖', 'callback_data' => 'cmd_draw']]
            ];

            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /draw 给 {$chatId}");
            return;
        }

        // 3. /history 历史记录翻页查询
        if (strpos($text, '/history') === 0) {
            $parts = explode(' ', $text);
            $page = isset($parts[1]) && is_numeric($parts[1]) ? intval($parts[1]) : 1;
            $pageSize = 5;

            $draws = getLatestDrawsPHP();
            $totalItems = count($draws) ?: 50;
            $totalPages = max(1, intval(ceil($totalItems / $pageSize)));

            if ($page < 1) $page = 1;
            if ($page > $totalPages) $page = $totalPages;

            $startIndex = ($page - 1) * $pageSize;
            $endIndex = min($totalItems, $startIndex + $pageSize);
            $lines = [];

            for ($i = $startIndex; $i < $endIndex; $i++) {
                $item = $draws[$i];
                $codes = explode(',', $item['openCode']);
                if (count($codes) < 7) continue;

                $reds = array_slice($codes, 0, 6);
                $special = intval($codes[6]);

                $fmtReds = array_map(function($n) { return (int)$n < 10 ? '0'.(int)$n : ''.$n; }, $reds);
                $fmtSpecial = $special < 10 ? '0'.$special : ''.$special;
                $zodiac = getZodiacPHP($special);
                $waveEmoji = getWaveColorTextPHP($special);

                $waveMap = ['red' => '红波', 'blue' => '蓝波', 'green' => '绿波'];
                $waveColorEn = getWaveColorPHP($special);
                $waveTextOnly = isset($waveMap[$waveColorEn]) ? $waveMap[$waveColorEn] : '红波';

                $str = "<b>第 {$item['expect']} 期</b> (" . substr($item['openTime'], 11, 8) . ")\n"
                     . "平码: <code>" . implode(' ', $fmtReds) . "</code> | 特码: <b>{$fmtSpecial}</b> ({$zodiac}/{$waveEmoji})";

                $historyContext = array_slice($draws, $i + 1);
                if (count($historyContext) >= 50) {
                    $prediction = generatePredictFrom50DrawsPHP($historyContext);
                    $actualBig = $special == 49 ? '和' : ($special >= 25 ? '大' : '小');
                    $actualOdd = $special == 49 ? '和' : ($special % 2 !== 0 ? '单' : '双');
                    
                    $sizeHit = $special == 49 ? '🔄' : ($prediction['sizePred'] === $actualBig ? '✅' : '❌');
                    $parityHit = $special == 49 ? '🔄' : ($prediction['parityPred'] === $actualOdd ? '✅' : '❌');
                    $colorHit = $prediction['colorPred'] === $waveTextOnly ? '✅' : '❌';
                    
                    $str .= "\n🤖 <b>预测核对:</b> 大小 {$sizeHit} | 单双 {$parityHit} | 波色 {$colorHit}";
                }
                
                $lines[] = $str;
            }

            $msgText = "<b>📜 澳门三分六合彩 · 开奖历史记录 (第 {$page}/{$totalPages} 页)</b>\n"
                     . "--------------------------------------\n"
                     . implode("\n\n", $lines) . "\n"
                     . "--------------------------------------\n"
                     . "刷新时间: " . date('H:i:s');

            $pageButtons = [];
            if ($page > 1) {
                $pageButtons[] = ['text' => "◀️ 上一页 (" . ($page - 1) . "/{$totalPages})", 'callback_data' => "cmd_history_page_" . ($page - 1)];
            }
            if ($page < $totalPages) {
                $pageButtons[] = ['text' => "▶️ 下一页 (" . ($page + 1) . "/{$totalPages})", 'callback_data' => "cmd_history_page_" . ($page + 1)];
            }

            $inlineButtons = [];
            if (!empty($pageButtons)) {
                $inlineButtons[] = $pageButtons;
            }
            $inlineButtons[] = [['text' => "🔄 刷新本页 ({$page}/{$totalPages})", 'callback_data' => "cmd_history_page_{$page}"]];

            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /history page {$page} 给 {$chatId}");
            return;
        }

        // 4. /predict 智能预测
        if (strpos($text, '/predict') === 0) {
            $draws = getLatestDrawsPHP();
            $prediction = generatePredictFrom50DrawsPHP($draws);

            $msgText = "<b>🧠 澳门三分六合彩 · 50期规律智能预测</b>\n"
                     . "--------------------------------------\n"
                     . "<b>目标期号</b>: <code>{$prediction['targetIssue']}</code>\n"
                     . "<b>精算模型</b>: {$prediction['algorithmName']}\n"
                     . "<b>预测置信度</b>: <b>{$prediction['confidence']}% 🔥</b>\n"
                     . "--------------------------------------\n"
                     . "📏 <b>大小预测</b>: <b>【 {$prediction['sizePred']} 】</b> (赔率 1.95)\n"
                     . "🎲 <b>单双预测</b>: <b>【 {$prediction['parityPred']} 】</b> (赔率 1.95)\n"
                     . "🎨 <b>波色预测</b>: <b>【 {$prediction['colorPred']} 】</b> (赔率 {$prediction['colorOdds']})\n"
                     . "--------------------------------------\n"
                     . "💡 <b>规律依据</b>:\n"
                     . "<i>{$prediction['rationale']}</i>\n"
                     . "--------------------------------------\n"
                     . "<i>说明: 基于多日历史数据回溯，实时预测下注结算。特码49退本金。开出49时大小单双退本金。生成时间: " . date('H:i:s') . "</i>";

            $inlineButtons = [
                [['text' => '🔄 重新精算推演', 'callback_data' => 'cmd_predict']]
            ];

            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /predict 给 {$chatId}");
            return;
        }

                // 5. /stats 或 /profit 或 /pnl 近7天盈亏统计报表
        if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {
            $draws = getLatestDrawsPHP();
            $weeklyData = getWeeklyProfitAndLossPHP($draws);
            
            $msgText = "<b>📊 澳门三分六合彩 · 近 7 天盈亏统计报表</b>\n"
                     . "--------------------------------------\n"
                     . "📅 <b>最近一周每日盈亏明细统计</b>:\n";
            
            $totalWeekBet = 0;
            $totalWeekProfit = 0;

            foreach ($weeklyData as $day) {
                $net = $day['netProfit'];
                $sign = $net >= 0 ? "+" : "";
                $emoji = $net >= 0 ? "📈" : "📉";
                $msgText .= "• <b>{$day['displayDate']}</b>: 下注 <code>{$day['totalBet']}U</code> | 净盈亏 <b>{$sign}{$net}U {$emoji}</b> (共 {$day['rounds']} 期)\n";
                $totalWeekBet += $day['totalBet'];
                $totalWeekProfit += $net;
            }

            $totalSign = $totalWeekProfit >= 0 ? "+" : "";
            $msgText .= "--------------------------------------\n"
                     . "💰 <b>7天总投入</b>: <code>" . number_format($totalWeekBet) . " USDT</code>\n"
                     . "🏆 <b>7天总净盈亏</b>: <b>{$totalSign}" . number_format($totalWeekProfit, 2) . " USDT " . ($totalWeekProfit >= 0 ? "🚀" : "💧") . "</b>\n"
                     . "--------------------------------------\n"
                     . "📢 <b>官方频道</b>: " . (getenv("TELEGRAM_CHANNEL_URL") ?: "") . "\n"
                     . "💡 <i>说明：基于最近7天多日历史开奖记录与回溯精算。更新时间: " . date('H:i:s') . "</i>";

            $inlineButtons = [
                [['text' => '🔄 刷新盈亏统计', 'callback_data' => 'cmd_stats']]
            ];
            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /stats 给 {$chatId}");
            return;
        }
    }
}

