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
            else if (strpos($text, '430期盈亏') !== false || strpos($text, '盈亏') !== false) $text = '/stats';
            else if (strpos($text, '历史记录') !== false) $text = '/history 1';
            else if (strpos($text, '帮助') !== false) $text = '/help';
        }

        if (!$chatId) return;

        // 通用 Reply Keyboard 菜单
        $replyKeyboard = [
            'keyboard' => [
                [['text' => '🎰 最新开奖'], ['text' => '📜 历史记录']],
                [['text' => '🧠 智能预测'], ['text' => '📊 430期盈亏']],
                [['text' => '❓ 帮助菜单']]
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
                     . "<b>📊 430期盈亏</b> - 每日预测下注动态累计盈亏报表\n"
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
            $slice = array_slice($draws, $startIndex, $pageSize);
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
                     . "<i>说明: 前50期为数据积累，后430期预测结算。开出49时大小单双退本金。生成时间: " . date('H:i:s') . "</i>";

            $inlineButtons = [
                [['text' => '🔄 重新精算推演', 'callback_data' => 'cmd_predict']]
            ];

            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /predict 给 {$chatId}");
            return;
        }

        // 5. /stats 或 /profit 或 /pnl 动态累计盈亏报表
        if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {
            $draws = getLatestDrawsPHP();
            $pnl = calculateProfitAndLossPHP($draws);

            $titleText = '<b>📊 澳门三分六合彩 · 430期预测下注回测盈亏报表</b>';
            $statusText = '';

            if ($pnl['predictedRounds'] === 0) {
                $statusText = "⏳ <b>今日进度</b>: 算法数据积累中 (已完成 <b>{$pnl['dayDrawNum']}/50</b> 期基准开奖)，第 51 期开奖开启智能预测下注结算。";
            } else if (!$pnl['isCompleted']) {
                $titleText = '<b>📊 澳门三分六合彩 · 今日实时累计盈亏报表</b>';
                $statusText = "<b>当前进度</b>: 已累计预测下注 <code>{$pnl['predictedRounds']}</code> 期 (已开出第 {$pnl['dayDrawNum']} 期，目标 430 期)";
            } else {
                $titleText = '<b>📊 澳门三分六合彩 · 全天 430 期盈亏结算报表</b>';
                $statusText = "<b>当前进度</b>: <code>今日 430 期预测结算完毕 ✅</code>";
            }

            $msgText = "{$titleText}\n"
                     . "--------------------------------------\n"
                     . "{$statusText}\n"
                     . "<b>累计总下注</b>: <code>" . number_format($pnl['totalBet']) . " USDT</code> (3 USDT/期)\n"
                     . "<b>累计总派彩</b>: <code>" . number_format($pnl['totalPayout']) . " USDT</code>\n"
                     . "<b>累计净盈亏</b>: <b>+" . number_format($pnl['netProfit']) . " USDT 📈</b>\n"
                     . "<b>投资回报率</b>: <b>+{$pnl['roi']}% 🔥 (ROI)</b>\n"
                     . "--------------------------------------\n"
                     . "📏 <b>大小命中率</b>: <code>{$pnl['sizeHitRate']}%</code> (赔率 1.95)\n"
                     . "🎲 <b>单双命中率</b>: <code>{$pnl['parityHitRate']}%</code> (赔率 1.95)\n"
                     . "🎨 <b>波色命中率</b>: <code>{$pnl['colorHitRate']}%</code> (红2.75 / 蓝绿2.98)\n"
                     . "🎯 <b>三项全中(大满贯)</b>: <b>{$pnl['allThreeHits']} 期 🔥</b>\n"
                     . "🏆 <b>历史最长连红</b>: <b>{$pnl['maxStreak']} 连红 🔥</b>\n"
                     . "--------------------------------------\n"
                     . "📢 <b>官方频道</b>: " . (getenv("TELEGRAM_CHANNEL_URL") ?: "") . "\n"
                     . "💡 <i>说明：每天480期，前50期积累为开奖基准，后430期下注结算。特码49退本金。更新时间: " . date('H:i:s') . "</i>";

            $inlineButtons = [
                [['text' => '🔄 刷新盈亏结算', 'callback_data' => 'cmd_stats']]
            ];

            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /stats 给 {$chatId}");
            return;
        }
    }
}

