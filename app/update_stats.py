with open("stats_algorithm.php", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("$recentDraws = array_slice($draws, 0, 50);", "$recentDraws = array_slice($draws, 0, 100);")

weekly_func = """
if (!function_exists('getWeeklyProfitAndLossPHP')) {
    function getWeeklyProfitAndLossPHP($draws = null) {
        if (empty($draws)) {
            $draws = getLatestDrawsPHP();
        }
        $recordsFile = __DIR__ . "/real_bets_records.json";
        $records = [];
        if (file_exists($recordsFile)) {
            $dec = json_decode(file_get_contents($recordsFile), true);
            if (is_array($dec)) $records = $dec;
        }

        $dailyMap = [];
        for ($i = 6; $i >= 0; $i--) {
            $dStr = date('Ymd', strtotime("-{$i} days"));
            $dailyMap[$dStr] = [
                'date' => $dStr,
                'displayDate' => date('m月d日', strtotime("-{$i} days")),
                'rounds' => 0,
                'totalBet' => 0,
                'totalPayout' => 0,
                'netProfit' => 0,
                'roi' => 0
            ];
        }

        foreach ($records as $r) {
            $exp = (string)($r["expect"] ?? "");
            if (strlen($exp) >= 8) {
                $dateKey = substr($exp, 0, 8);
                if (isset($dailyMap[$dateKey])) {
                    $dailyMap[$dateKey]['rounds']++;
                    $bet = $r["bet"] ?? 3;
                    $payout = $r["payout"] ?? 0;
                    $dailyMap[$dateKey]['totalBet'] += $bet;
                    $dailyMap[$dateKey]['totalPayout'] += $payout;
                    $dailyMap[$dateKey]['netProfit'] += ($payout - $bet);
                }
            }
        }

        foreach ($dailyMap as $k => &$v) {
            $v['totalPayout'] = round($v['totalPayout'], 2);
            $v['netProfit'] = round($v['netProfit'], 2);
            if ($v['totalBet'] > 0) {
                $v['roi'] = round(($v['netProfit'] / $v['totalBet']) * 100, 2);
            }
        }
        unset($v);

        return array_values($dailyMap);
    }
}
"""

if "getWeeklyProfitAndLossPHP" not in code:
    code = code + "\n" + weekly_func

with open("stats_algorithm.php", "w", encoding="utf-8") as f:
    f.write(code)

print("STATS ALGORITHM UPDATED SUCCESSFULLY")
