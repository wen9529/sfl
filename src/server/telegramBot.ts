import { MacauDrawItem, getZodiac, getWaveColor, getLatestDraws } from './lotteryEngine';
import { generate50DrawsPrediction, calculateProfitAndLoss, getWeeklyProfitAndLoss } from './statsAlgorithm';

export async function processTelegramMessage(
  token: string,
  update: any,
  draws: MacauDrawItem[]
) {
  let chatId: string | number | null = null;
  let text = '';
  let messageId: number | null = null;
  let isCallback = false;
  let callbackQueryId: string | null = null;

  if (update?.callback_query) {
    isCallback = true;
    const cb = update.callback_query;
    callbackQueryId = cb.id;
    chatId = cb.message?.chat?.id;
    messageId = cb.message?.message_id;
    text = (cb.data || '').trim();

    if (text === 'cmd_draw') text = '/draw';
    else if (text === 'cmd_predict') text = '/predict';
    else if (text === 'cmd_stats') text = '/stats';
    else if (text.startsWith('cmd_history')) {
      const pageMatch = text.match(/page_(\d+)/);
      const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;
      text = `/history ${page}`;
    } else if (text === 'cmd_help') text = '/help';

    // Acknowledge callback query immediately with feedback
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: '已处理请求 ✅',
        }),
        signal: AbortSignal.timeout(4000),
      });
    } catch (e) {
      // Ignore
    }
  } else {
    const msg = update?.message || update?.channel_post || update?.edited_message || update?.edited_channel_post;
    if (msg) {
      chatId = msg.chat?.id;
      text = (msg.text || msg.caption || '').trim();

      // 清理掉 @bot_username (例如 /draw@macau_bot -> /draw)
      if (text.startsWith('/')) {
        text = text.replace(/@\w+/g, '');
      }

      if (text.includes('最新开奖') || text === '开奖' || text === '1') text = '/draw';
      else if (text.includes('智能预测') || text.includes('预测') || text === '推演' || text === '2') text = '/predict';
      else if (text.includes('480期盈亏') || text.includes('430期盈亏') || text.includes('盈亏') || text.includes('战报') || text === '3') text = '/stats';
      else if (text.includes('历史记录') || text.includes('历史') || text === '4') text = '/history 1';
      else if (text.includes('帮助') || text === '菜单' || text === 'help') text = '/help';
    } else if (typeof update === 'string') {
      text = update.trim();
    }
  }

  if (!chatId) return;

  // 确保开奖数据存在，若空则动态兜底拉取
  let activeDraws = draws;
  if (!activeDraws || activeDraws.length === 0) {
    try {
      activeDraws = await getLatestDraws();
    } catch (e) {
      activeDraws = [];
    }
  }

  const replyKeyboard = {
    keyboard: [
      [{ text: '🎰 最新开奖' }, { text: '📜 历史记录' }],
      [{ text: '🧠 智能预测' }, { text: '📊 480期盈亏' }],
      [{ text: '❓ 帮助菜单' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };

  const deliverMessage = async (htmlMsg: string, inlineButtons: any[]) => {
    try {
      if (isCallback && messageId) {
        const editRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: htmlMsg,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: inlineButtons },
          }),
          signal: AbortSignal.timeout(8000),
        });
        const editJson = await editRes.json();
        // 如果成功或者内容相同未变更，直接结束，避免刷屏发送新消息
        if (editJson.ok) return;
        if (editJson.description && editJson.description.includes('message is not modified')) {
          return;
        }
      }

      const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMsg,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: inlineButtons },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const sendJson = await sendRes.json();

      // 如果 HTML 解析失败，自动纯文本降级重发，确保用户百分之百能收到回复
      if (!sendJson.ok && sendJson.description && sendJson.description.includes("can't parse entities")) {
        const plainText = htmlMsg.replace(/<[^>]*>/g, '');
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText,
            reply_markup: { inline_keyboard: inlineButtons },
          }),
          signal: AbortSignal.timeout(8000),
        });
      }

      if (!isCallback) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '📱 底部常驻菜单已就绪，可随时点击切换：',
            reply_markup: replyKeyboard,
          }),
          signal: AbortSignal.timeout(8000),
        });
      }
    } catch (err) {
      console.error('Telegram deliverMessage Error:', err);
    }
  };

  if (text.startsWith('/start') || text.startsWith('/help')) {
    const helpMsg = `
<b>🎰 澳门三分六合彩 · Telegram Bot 极速助手</b>
--------------------------------------
<b>🎰 最新开奖</b> - 查询最新一期开奖结果 (含生肖波色)
<b>📜 历史记录</b> - 翻页查看 50 期开奖历史
<b>🧠 智能预测</b> - 50期规律概率加权 AI 智能预测
<b>📊 480期盈亏</b> - 每日预测下注动态累计盈亏报表
<b>❓ 帮助菜单</b> - 显示功能与使用说明
--------------------------------------
<i>💡 提示: 点击下方【键盘菜单】即可切换功能，帖子内按钮提供翻页与刷新支持。</i>
`.trim();

    const inlineButtons = [
      [{ text: '🔄 刷新使用说明', callback_data: 'cmd_help' }],
    ];

    await deliverMessage(helpMsg, inlineButtons);
    return;
  }

  if (text.startsWith('/draw')) {
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
🟢 状态: 实时数据同步完成 | 刷新时间: ${new Date().toLocaleTimeString('zh-CN')}
`.trim();

      const inlineButtons = [
        [{ text: '🔄 刷新最新开奖', callback_data: 'cmd_draw' }],
      ];

      await deliverMessage(msg, inlineButtons);
    }
    return;
  }

  if (text.startsWith('/history')) {
    const parts = text.split(' ');
    let page = parseInt(parts[1], 10) || 1;
    const pageSize = 5;
    const totalItems = draws.length || 50;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const startIndex = (page - 1) * pageSize;
    const slice = draws.slice(startIndex, startIndex + pageSize);
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
<b>📜 澳门三分六合彩 · 开奖历史记录 (第 ${page}/${totalPages} 页)</b>
--------------------------------------
${lines.join('\n\n')}
--------------------------------------
刷新时间: ${new Date().toLocaleTimeString('zh-CN')}
`.trim();

    const pageButtons: any[] = [];
    if (page > 1) {
      pageButtons.push({ text: `◀️ 上一页 (${page - 1}/${totalPages})`, callback_data: `cmd_history_page_${page - 1}` });
    }
    if (page < totalPages) {
      pageButtons.push({ text: `▶️ 下一页 (${page + 1}/${totalPages})`, callback_data: `cmd_history_page_${page + 1}` });
    }

    const inlineButtons = [
      ...(pageButtons.length > 0 ? [pageButtons] : []),
      [{ text: `🔄 刷新本页 (${page}/${totalPages})`, callback_data: `cmd_history_page_${page}` }],
    ];

    await deliverMessage(msg, inlineButtons);
    return;
  }

  if (text.startsWith('/predict')) {
    const pred = generate50DrawsPrediction(draws);

    const msg = `
<b>🧠 澳门三分六合彩 · 50期规律智能预测</b>
--------------------------------------
<b>目标期号</b>: <code>${pred.targetIssue}</code>
<b>精算模型</b>: ${pred.algorithmName}
--------------------------------------
📏 <b>大小预测</b>: <b>【 ${pred.sizePred} 】</b> (赔率 1.95 | 置信度 <code>${pred.sizeConfidence}%</code>)
🎲 <b>单双预测</b>: <b>【 ${pred.parityPred} 】</b> (赔率 1.95 | 置信度 <code>${pred.parityConfidence}%</code>)
🎨 <b>波色预测</b>: <b>【 ${pred.colorPred} 】</b> (赔率 ${pred.colorOdds} | 置信度 <code>${pred.colorConfidence}%</code>)
--------------------------------------
💡 <b>规律依据</b>:
<i>${pred.rationale}</i>
--------------------------------------
<i>说明: 澳门三分彩每日480期，每期3U全天候智能推演结算。特码49和局退本金。生成时间: ${new Date().toLocaleTimeString('zh-CN')}</i>
`.trim();

    const inlineButtons = [
      [{ text: '🔄 重新精算推演', callback_data: 'cmd_predict' }],
    ];

    await deliverMessage(msg, inlineButtons);
    return;
  }

  if (text.startsWith('/stats') || text.startsWith('/profit') || text.startsWith('/pnl') || text.includes('盈亏') || text.includes('每周')) {
    const weeklyData = getWeeklyProfitAndLoss(draws);
    const pnl = calculateProfitAndLoss(draws);

    const dailyLines = weeklyData.dailyList.map(item => {
      const profitSign = item.netProfit >= 0 ? `+${item.netProfit.toFixed(2)}` : `${item.netProfit.toFixed(2)}`;
      const roiSign = item.roi >= 0 ? `+${item.roi.toFixed(2)}%` : `${item.roi.toFixed(2)}%`;
      const flag = item.netProfit >= 0 ? '📈' : '📉';
      const isTodayTag = item.isToday ? ' <b>[今日进行中]</b>' : '';
      return `• <b>${item.displayDate}</b>${isTodayTag}\n  投入: <code>${item.totalBet}U</code> | 派彩: <code>${item.totalPayout.toFixed(2)}U</code>\n  净盈亏: <b>${profitSign} USDT ${flag}</b> (ROI: <code>${roiSign}</code> | ${item.rounds}期)`;
    }).join('\n\n');

    const totalNetSign = weeklyData.totalNetProfit >= 0 ? `+${weeklyData.totalNetProfit.toFixed(2)}` : `${weeklyData.totalNetProfit.toFixed(2)}`;
    const totalRoiSign = weeklyData.totalRoi >= 0 ? `+${weeklyData.totalRoi.toFixed(2)}%` : `${weeklyData.totalRoi.toFixed(2)}%`;
    const todayNetSign = pnl.netProfit >= 0 ? `+${pnl.netProfit.toFixed(2)}` : `${pnl.netProfit.toFixed(2)}`;
    const todayRoiSign = pnl.roi >= 0 ? `+${pnl.roi.toFixed(2)}%` : `${pnl.roi.toFixed(2)}%`;

    const msg = `
<b>📊 澳门三分六合彩 · 每周每日盈亏明细统计报表</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>近 7 天每日盈亏明细看板</b>:

${dailyLines}

━━━━━━━━━━━━━━━━━━━━
💰 <b>7天总累计投入</b>: <code>${weeklyData.totalBet.toLocaleString()} USDT</code>
🎁 <b>7天总累计派彩</b>: <code>${weeklyData.totalPayout.toFixed(2)} USDT</code>
🏆 <b>7天总净盈亏</b>: <b>${totalNetSign} USDT 🚀</b> (周均回报率: <b>${totalRoiSign}</b>)
━━━━━━━━━━━━━━━━━━━━
🎯 <b>今日实时核心战报 (第 ${pnl.predictedRounds}/480 期)</b>:
• 今日投入: <code>${pnl.totalBet} USDT</code> | 累计派彩: <code>${pnl.totalPayout.toFixed(2)} USDT</code>
• 今日净盈亏: <b>${todayNetSign} USDT ${pnl.netProfit >= 0 ? '🚀' : '💧'}</b> (ROI: <b>${todayRoiSign}</b>)
• 特码大小胜率: <code>${pnl.sizeHitRate}%</code> | 单双胜率: <code>${pnl.parityHitRate}%</code> | 波色胜率: <code>${pnl.colorHitRate}%</code>
• 大满贯期数: <b>${pnl.allThreeHits} 期 🔥</b> | 最长连红: <b>${pnl.maxStreak} 连红 🔥</b>
• 今日最大回撤: <code>${pnl.maxLoss > 0 ? `-${pnl.maxLoss.toFixed(2)}` : '0.00'} USDT</code> | 最高盈利: <code>+${pnl.maxProfit.toFixed(2)} USDT</code>
━━━━━━━━━━━━━━━━━━━━
📢 <b>官方预测频道</b>: ${process.env.TELEGRAM_CHANNEL_URL || "@sanfencc66"}
💡 <i>规则：每天480期全天候下注结算(3U/期)。特码49退本金。更新时间: ${new Date().toLocaleTimeString('zh-CN')}</i>
`.trim();

    const inlineButtons = [
      [{ text: '🔄 刷新每周每日盈亏', callback_data: 'cmd_stats' }],
    ];

    await deliverMessage(msg, inlineButtons);
    return;
  }

  const safeText = (text || '快捷交互').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 默认兜底响应: 无论用户输入任何文本或未知指令，均友好回复交互菜单
  const defaultHelpMsg = `
<b>🎰 澳门三分六合彩 · Telegram Bot 极速助手</b>
--------------------------------------
收到消息/指令: <code>${safeText}</code>
请使用下方【键盘菜单】或选择常用功能：

🎰 <b>/draw</b> - 查询最新开奖结果
📜 <b>/history</b> - 查看 50 期历史开奖
🧠 <b>/predict</b> - 50 期规律智能预测
📊 <b>/stats</b> - 480 期盈亏统计报表
❓ <b>/help</b> - 帮助与使用菜单
--------------------------------------
<i>💡 提示: 实时算法推演引擎已就绪，点击快捷按钮即可查看。</i>
`.trim();

  const defaultButtons = [
    [{ text: '🎰 最新开奖结果', callback_data: 'cmd_draw' }],
    [{ text: '🧠 50期智能预测', callback_data: 'cmd_predict' }],
    [{ text: '📊 盈亏统计报表', callback_data: 'cmd_stats' }],
  ];

  await deliverMessage(defaultHelpMsg, defaultButtons);
}
