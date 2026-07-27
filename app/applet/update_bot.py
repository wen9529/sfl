with open("bot_commands.php", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update keyboard button and message mapping
code = code.replace("📊 实时盈亏报表", "📊 盈亏统计")
code = code.replace("430期盈亏", "盈亏统计")

# 2. Update stats block
old_stats_block = """        // 5. /stats 或 /profit 或 /pnl 动态累计盈亏报表
        if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {
            $draws = getLatestDrawsPHP();
            $pnl = calculateProfitAndLossPHP($draws);
            $titleText = '<b>📊 澳门三分六合彩 · 实时预测下注回测盈亏报表</b>';
            $statusText = '';
            if (!$pnl['isCompleted']) {
                $titleText = '<b>📊 澳门三分六合彩 · 今日实时累计盈亏报表</b>';
                $statusText = "<b>当前进度</b>: 已实时预测下注 <code>{$pnl['predictedRounds']}</code> 期 (今日已开出第 {$pnl['dayDrawNum']} 期，基于多日历史数据精算)";
            } else {
                $titleText = '<b>📊 澳门三分六合彩 · 今日全天 480 期盈亏结算报表</b>';
                $statusText = "<b>当前进度</b>: <code>今日全天 480 期预测结算完毕 ✅</code>";
            }
            $netProfitSign = $pnl['netProfit'] >= 0 ? "+" : "";
            $roiSign = $pnl['roi'] >= 0 ? "+" : "";
            $msgText = "{$titleText}\\n"
                     . "--------------------------------------\\n"
                     . "{$statusText}\\n"
                     . "<b>累计总下注</b>: <code>" . number_format($pnl['totalBet']) . " USDT</code> (3 USDT/期)\\n"
                     . "<b>累计总派彩</b>: <code>" . number_format($pnl['totalPayout'], 2) . " USDT</code>\\n"
                     . "<b>累计净盈亏</b>: <b>{$netProfitSign}" . number_format($pnl['netProfit'], 2) . " USDT " . ($pnl['netProfit'] >= 0 ? "📈" : "📉") . "</b>\\n"
                     . "<b>投资回报率</b>: <b>{$roiSign}{$pnl['roi']}% " . ($pnl['roi'] >= 0 ? "🔥" : "💧") . " (ROI)</b>\\n"
                     . "--------------------------------------\\n"
                     . "📏 <b>大小命中率</b>: <code>{$pnl['sizeHitRate']}%</code> (赔率 1.95)\\n"
                     . "🎲 <b>单双命中率</b>: <code>{$pnl['parityHitRate']}%</code> (赔率 1.95)\\n"
                     . "🎨 <b>波色命中率</b>: <code>{$pnl['colorHitRate']}%</code> (红2.75 / 蓝绿2.98)\\n"
                     . "🎯 <b>三项全中(大满贯)</b>: <b>{$pnl['allThreeHits']} 期 🔥</b>\\n"
                     . "🏆 <b>历史最长连红</b>: <b>{$pnl['maxStreak']} 连红 🔥</b>\\n"
                     . "--------------------------------------\\n"
                     . "📢 <b>官方频道</b>: " . (getenv("TELEGRAM_CHANNEL_URL") ?: "") . "\\n"
                     . "💡 <i>说明：每天480期，利用多日历史数据回溯精算，实时开奖实时智能预测下注与真实回测结算。特码49退本金。更新时间: " . date('H:i:s') . "</i>";
            $inlineButtons = [
                [['text' => '🔄 刷新盈亏结算', 'callback_data' => 'cmd_stats']]
            ];
            $deliverMessage($msgText, $inlineButtons);
            writeLogPHP('Webhook指令', 'success', "响应 /stats 给 {$chatId}");
            return;
        }"""

new_stats_block = """        // 5. /stats 或 /profit 或 /pnl 近7天盈亏统计报表
        if (strpos($text, '/stats') === 0 || strpos($text, '/profit') === 0 || strpos($text, '/pnl') === 0) {
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

if old_stats_block in code:
    code = code.replace(old_stats_block, new_stats_block)
    with open("bot_commands.php", "w", encoding="utf-8") as f:
        f.write(code)
    print("BOT COMMANDS UPDATED SUCCESSFULLY")
else:
    print("OLD STATS BLOCK NOT FOUND")
