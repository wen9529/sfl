with open("bot_commands.php", "r", encoding="utf-8") as f:
    code = f.read()

start_marker = "if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {"

new_block = """if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {
            $draws = getLatestDrawsPHP();
            $weeklyData = getWeeklyProfitAndLossPHP($draws);
            
            $msgText = "<b>📊 澳门三分六合彩 · 近 7 天盈亏统计报表</b>\\n"
                     . "--------------------------------------\\n"
                     . "📅 <b>最近一周每日盈亏明细统计</b>:\\n";
            
            $totalWeekBet = 0;
            $totalWeekProfit = 0;

            foreach ($weeklyData as $day) {
                $net = $day['netProfit'];
                $sign = $net >= 0 ? "+" : "";
                $emoji = $net >= 0 ? "📈" : "📉";
                $msgText .= "• <b>{$day['displayDate']}</b>: 下注 <code>{$day['totalBet']}U</code> | 净盈亏 <b>{$sign}{$net}U {$emoji}</b> (共 {$day['rounds']} 期)\\n";
                $totalWeekBet += $day['totalBet'];
                $totalWeekProfit += $net;
            }

            $totalSign = $totalWeekProfit >= 0 ? "+" : "";
            $msgText .= "--------------------------------------\\n"
                     . "💰 <b>7天总投入</b>: <code>" . number_format($totalWeekBet) . " USDT</code>\\n"
                     . "🏆 <b>7天总净盈亏</b>: <b>{$totalSign}" . number_format($totalWeekProfit, 2) . " USDT " . ($totalWeekProfit >= 0 ? "🚀" : "💧") . "</b>\\n"
                     . "--------------------------------------\\n"
                     . "📢 <b>官方频道</b>: " . (getenv("TELEGRAM_CHANNEL_URL") ?: "") . "\\n"
                     . "💡 <i>说明：基于最近7天多日历史开奖记录与回溯精算。更新时间: " . date('H:i:s') . "</i>";

            $inlineButtons = [
                [['text' => '🔄 刷新盈亏统计', 'callback_data' => 'cmd_stats']]
            ];
            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /stats 给 {$chatId}");
            return;
        }"""

start_pos = code.find(start_marker)
if start_pos != -1:
    end_pos = code.find("writeLogPHP('Webhook指令', 'success', \"响应 /stats 给", start_pos)
    end_brace = code.find("}", end_pos) + 1
    code = code[:start_pos] + new_block + code[end_brace:]
    with open("bot_commands.php", "w", encoding="utf-8") as f:
        f.write(code)
    print("BOT COMMANDS STATS HANDLER UPDATED")
else:
    print("START MARKER NOT FOUND")
