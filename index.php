<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>澳门三分六合彩 · 独立 PHP 盘析与 Telegram 管理面板</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background-color: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <!-- Header -->
    <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    澳门
                </div>
                <div>
                    <h1 class="text-base font-bold text-slate-100 flex items-center gap-2">
                        澳门三分六合彩 <span class="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">PHP 服务器版</span>
                    </h1>
                    <p class="text-xs text-slate-400">Serv00 / Apache / Nginx 极速 PHP 轻量架构</p>
                </div>
            </div>

            <div class="flex items-center gap-2 text-xs">
                <a href="telegram_bot.php" target="_blank" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1">
                    <i class="fab font-bold fa-telegram"></i> TG 机器人接口
                </a>
                <a href="api.php?action=history" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1">
                    <i class="fas fa-code"></i> REST API
                </a>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-6 flex-1 space-y-6 w-full">

        <!-- PHP Server Banner -->
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h2 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <i class="fab fa-php text-indigo-400 text-2xl"></i> PHP 架构运行状态正常
                </h2>
                <p class="text-xs text-slate-400 mt-1">
                    服务端 PHP <?php echo phpversion(); ?> | 当前服务器时间: <?php echo date('Y-m-d H:i:s'); ?> | 支持 cURL / JSON / Cron
                </p>
            </div>

            <div class="flex items-center gap-3">
                <button onclick="location.reload()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-1.5">
                    <i class="fas fa-sync-alt"></i> 刷新数据
                </button>
            </div>
        </div>

        <!-- Latest Draw Card -->
        <?php
            $config = require __DIR__ . '/config.php';
            $reds = [rand(1,49), rand(1,49), rand(1,49), rand(1,49), rand(1,49), rand(1,49)];
            sort($reds);
            $blue = rand(1,49);
            $issue = date('Ymd') . rand(100, 999);
        ?>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div>
                    <span class="text-xs font-bold text-rose-400 uppercase tracking-wider">LATEST DRAW RESULT</span>
                    <h3 class="text-lg font-bold text-slate-100">最新第 <?php echo $issue; ?> 期开奖结果</h3>
                </div>
                <span class="text-xs text-slate-400">开奖间隔: 3分钟/期</span>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 py-4">
                <?php foreach ($reds as $r): ?>
                    <div class="flex flex-col items-center gap-1">
                        <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 text-white font-black text-lg flex items-center justify-center shadow-lg border border-rose-300/30">
                            <?php echo $r < 10 ? '0'.$r : $r; ?>
                        </div>
                        <span class="text-[10px] text-slate-400">平码</span>
                    </div>
                <?php endforeach; ?>

                <div class="text-amber-400 font-extrabold text-xl px-2">+</div>

                <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-xl border-2 ring-2 ring-amber-400/40">
                        <?php echo $blue < 10 ? '0'.$blue : $blue; ?>
                    </div>
                    <span class="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1 rounded border border-amber-500/30">特码</span>
                </div>
            </div>
        </div>

        <!-- Telegram Bot Settings Section -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div class="flex items-center gap-2 text-sky-400 font-bold text-base border-b border-slate-800 pb-3">
                <i class="fab fa-telegram text-xl"></i> Telegram Bot 参数配置 (PHP)
            </div>

            <form action="telegram_bot.php?action=send" method="POST" class="space-y-4 text-xs">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-300 font-semibold mb-1">Bot Token</label>
                        <input type="password" name="botToken" value="<?php echo htmlspecialchars($config['telegram_bot_token']); ?>" placeholder="输入从 @BotFather 获取的 Token" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-300 font-semibold mb-1">Target Chat ID</label>
                        <input type="text" name="chatId" value="<?php echo htmlspecialchars($config['telegram_chat_id']); ?>" placeholder="如 @channel_name 或 -100xxx" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono">
                    </div>
                </div>

                <div>
                    <label class="block text-slate-300 font-semibold mb-1">自定义广播消息</label>
                    <textarea name="customText" rows="3" placeholder="输入广播文案..." class="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"><b>🎰 澳门三分六合彩 (PHP测试)</b>&#10;最新开奖已被系统推送。</textarea>
                </div>

                <div class="flex items-center justify-between">
                    <span class="text-slate-400">提示: 可将 <code>cron.php</code> 添加到 Serv00 的 Cron Jobs，每3分钟自动发送</span>
                    <button type="submit" class="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2">
                        <i class="fas fa-paper-plane"></i> 发送 Telegram 广播
                    </button>
                </div>
            </form>
        </div>

    </main>

    <footer class="bg-slate-950 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        澳门三分六合彩 PHP 独立部署版 &copy; <?php echo date('Y'); ?> | 适用于 Serv00 / Apache / Nginx / cPanel
    </footer>

</body>
</html>
