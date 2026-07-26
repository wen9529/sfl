import { MacauDrawItem, getZodiac, getWaveColor } from './lotteryEngine';
import { generate50DrawsPrediction, calculateProfitAndLoss, analyze50Draws } from './statsAlgorithm';

export async function processTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  draws: MacauDrawItem[]
) {
  const trimmedText = text.trim();

  const sendTg = async (htmlMsg: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: htmlMsg, parse_mode: 'HTML' }),
      });
    } catch (err) {
      console.error('Telegram sendMessage Error:', err);
    }
  };

  if (trimmedText.startsWith('/start') || trimmedText.startsWith('/help')) {
    const helpMsg = `
<b>🎰 澳门三分六合彩 · Telegram Bot 极速助手 (Node 模块化)</b>
--------------------------------------
<b>/draw</b> - 查询最新一期开奖结果 (含波色生肖)
<b>/history [条数]</b> - 查看 50 期内多期开奖历史 (如 <code>/history 5</code>)
<b>/predict</b> - 获取 50 期规律概率加权 AI 智能预测
<b>/stats</b> 或 <b>/profit</b> - 查看 50 期算法模拟盘下注盈亏与 ROI
<b>/help</b> - 显示此帮助菜单说明
--------------------------------------
<i>由 Node.js TypeScript 核心服务引擎强力驱动</i>
`.trim();
    await sendTg(helpMsg);
    return;
  }

  if (trimmedText.startsWith('/draw')) {
    const latest = draws[0];
    if (latest) {
      const codes = latest.openCode.split(',').map(Number);
      const reds = codes.slice(0, 6);
      const special = codes[6];
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const w = getWaveColor(special);
      const waveStr = w === 'red' ? '🔴红波' : w === 'blue' ? '🔵蓝波' : '🟢绿波';

      const msg = `
<b>🎰 澳门三分六合彩 · 最新开奖结果</b>
--------------------------------------
<b>期号</b>: <code>${latest.expect}</code>
<b>时间</b>: <code>${latest.openTime}</code>
<b>平码</b>: <code>${reds.map(pad).join(' ')}</code>
<b>特码</b>: <b>${pad(special)}</b> (${getZodiac(special)} / ${waveStr})
--------------------------------------
🟢 状态: 实时数据同步完成 | Node 引擎
`.trim();
      await sendTg(msg);
    }
    return;
  }

  if (trimmedText.startsWith('/history')) {
    const parts = trimmedText.split(' ');
    let count = parseInt(parts[1]) || 5;
    if (count < 1) count = 5;
    if (count > 10) count = 10;

    const slice = draws.slice(0, count);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const lines = slice.map((item) => {
      const codes = item.openCode.split(',').map(Number);
      const reds = codes.slice(0, 6);
      const special = codes[6];
      const w = getWaveColor(special);
      const waveStr = w === 'red' ? '🔴红' : w === 'blue' ? '🔵蓝' : '🟢绿';
      return `<b>第 ${item.expect} 期</b> (${item.openTime.slice(11, 19)})\n平码: <code>${reds.map(pad).join(' ')}</code> | 特码: <b>${pad(special)}</b> (${getZodiac(special)}/${waveStr})`;
    });

    const msg = `
<b>📜 澳门三分六合彩 · 近 ${count} 期历史开奖记录 (50期数据库)</b>
--------------------------------------
${lines.join('\n\n')}
--------------------------------------
💡 提示: 输入 <code>/history 10</code> 可获取最多 10 期记录
`.trim();
    await sendTg(msg);
    return;
  }

  if (trimmedText.startsWith('/predict')) {
    const pred = generate50DrawsPrediction(draws);

    const msg = `
<b>🧠 澳门三分六合彩 · 50期统计规律智能预测</b>
--------------------------------------
<b>目标期号</b>: <code>${pred.targetIssue}</code>
<b>精算模型</b>: ${pred.algorithmName}
<b>预测置信度</b>: <b>${pred.confidence}% 🔥</b>
--------------------------------------
🎯 <b>推荐平码 (6码)</b>: <code>${pred.formattedReds.join(' ')}</code>
💎 <b>推荐特码 (1码)</b>: <b>[ ${pred.formattedBlue} ]</b> (${pred.specialZodiac} / ${pred.specialWave})
🛡️ <b>防冷备选 (2码)</b>: <code>${pred.formattedBackups.join(' ')}</code>
--------------------------------------
💡 <b>50期规律依据</b>:
<i>${pred.rationale}</i>
--------------------------------------
<i>声明: 预测基于近50期开奖记录规律与回归分析，请理性参考。</i>
`.trim();
    await sendTg(msg);
    return;
  }

  if (trimmedText.startsWith('/stats') || trimmedText.startsWith('/profit') || trimmedText.startsWith('/pnl')) {
    const pnl = calculateProfitAndLoss(draws);
    const stats = analyze50Draws(draws);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const hotStr = stats.hotNumbers.slice(0, 5).map(pad).join(' ');
    const coldStr = stats.coldNumbers.slice(0, 5).map(pad).join(' ');

    const msg = `
<b>📊 澳门三分六合彩 · 50期规律回测盈亏统计报表</b>
--------------------------------------
<b>回测期数</b>: <code>${pnl.totalRounds}</code> 期实盘数据跟踪
<b>累计投入</b>: <code>${pnl.totalBet.toLocaleString()} USDT</code>
<b>累计派彩</b>: <code>${pnl.totalPayout.toLocaleString()} USDT</code>
<b>净盈亏额</b>: <b>+${pnl.netProfit.toLocaleString()} USDT 📈</b>
<b>投资回报率</b>: <b>+${pnl.roi}% 🔥 (ROI)</b>
--------------------------------------
🎯 <b>特码命中率</b>: <code>${pnl.specialHitRate}%</code> (3码复式模式)
🎲 <b>平码平均命中</b>: <code>${pnl.avgRedHits} 码 / 期</code>
🏆 <b>历史最长连红</b>: <b>${pnl.maxStreak} 连红 🔥</b>
🔥 <b>近50期极热号码</b>: <code>${hotStr}</code>
❄️ <b>近50期极冷号码</b>: <code>${coldStr}</code>
--------------------------------------
🔴 <b>红/蓝/绿波占比</b>: ${stats.waveDistribution.redRatio}% / ${stats.waveDistribution.blueRatio}% / ${stats.waveDistribution.greenRatio}%
💡 <i>算法模型根据最新 50 期开奖动态更新。</i>
`.trim();
    await sendTg(msg);
    return;
  }
}
