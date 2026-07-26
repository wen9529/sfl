import { MacauDrawItem, getZodiac, getWaveColor } from './lotteryEngine';
import { generate50DrawsPrediction, calculateProfitAndLoss, analyze50Draws } from './statsAlgorithm';

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
    else if (text === 'cmd_history') text = '/history 5';
    else if (text === 'cmd_help') text = '/help';

    // Acknowledge callback query
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId }),
      });
    } catch (e) {
      // Ignore
    }
  } else if (update?.message) {
    const msg = update.message;
    chatId = msg.chat?.id;
    text = (msg.text || '').trim();

    if (text.includes('最新开奖')) text = '/draw';
    else if (text.includes('智能预测')) text = '/predict';
    else if (text.includes('430期盈亏') || text.includes('盈亏')) text = '/stats';
    else if (text.includes('历史记录')) text = '/history 5';
    else if (text.includes('帮助')) text = '/help';
  } else if (typeof update === 'string') {
    // Direct text fallback
    text = update.trim();
  }

  if (!chatId) return;

  const replyKeyboard = {
    keyboard: [
      [{ text: '🎰 最新开奖' }, { text: '📜 历史记录' }],
      [{ text: '🧠 智能预测' }, { text: '📊 430期盈亏' }],
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
        });
        const editJson = await editRes.json();
        if (editJson.ok) return;
      }

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMsg,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: inlineButtons },
        }),
      });

      if (!isCallback) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '📱 底部常驻菜单已配置，可随时点击切换：',
            reply_markup: replyKeyboard,
          }),
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
<b>🎰 最新开奖</b> - 查询最新一期开奖结果
<b>📜 历史记录</b> - 查看近 5 期开奖历史
<b>🧠 智能预测</b> - 50期统计规律 AI 智能预测
<b>📊 430期盈亏</b> - 每日 430 期预测下注回测报表
<b>❓ 帮助菜单</b> - 显示使用功能说明
--------------------------------------
<i>💡 提示: 您可以直接点击下方【键盘菜单】或【帖子按钮】进行无缝切换，新内容将直接覆盖更新旧帖子！</i>
`.trim();

    const inlineButtons = [
      [{ text: '🎰 最新开奖', callback_data: 'cmd_draw' }, { text: '🧠 智能预测', callback_data: 'cmd_predict' }],
      [{ text: '📊 430期盈亏', callback_data: 'cmd_stats' }, { text: '📜 5期历史', callback_data: 'cmd_history' }],
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
        [{ text: '🔄 刷新数据', callback_data: 'cmd_draw' }, { text: '🧠 智能预测', callback_data: 'cmd_predict' }],
        [{ text: '📊 430期盈亏', callback_data: 'cmd_stats' }, { text: '📜 5期历史', callback_data: 'cmd_history' }],
      ];

      await deliverMessage(msg, inlineButtons);
    }
    return;
  }

  if (text.startsWith('/history')) {
    const parts = text.split(' ');
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
<b>📜 澳门三分六合彩 · 近 ${count} 期历史开奖记录</b>
--------------------------------------
${lines.join('\n\n')}
--------------------------------------
刷新时间: ${new Date().toLocaleTimeString('zh-CN')}
`.trim();

    const inlineButtons = [
      [{ text: '🔄 刷新历史', callback_data: 'cmd_history' }, { text: '🧠 智能预测', callback_data: 'cmd_predict' }],
      [{ text: '📊 430期盈亏', callback_data: 'cmd_stats' }, { text: '🎰 最新开奖', callback_data: 'cmd_draw' }],
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
<b>预测置信度</b>: <b>${pred.confidence}% 🔥</b>
--------------------------------------
📏 <b>大小预测</b>: <b>【 ${pred.sizePred} 】</b> (赔率 1.95)
🎲 <b>单双预测</b>: <b>【 ${pred.parityPred} 】</b> (赔率 1.95)
🎨 <b>波色预测</b>: <b>【 ${pred.colorPred} 】</b> (赔率 ${pred.colorOdds})
--------------------------------------
💡 <b>规律依据</b>:
<i>${pred.rationale}</i>
--------------------------------------
<i>说明: 前50期为数据积累，后430期预测结算。开出49时大小单双退本金。生成时间: ${new Date().toLocaleTimeString('zh-CN')}</i>
`.trim();

    const inlineButtons = [
      [{ text: '🔄 刷新预测', callback_data: 'cmd_predict' }, { text: '📊 430期盈亏', callback_data: 'cmd_stats' }],
      [{ text: '🎰 最新开奖', callback_data: 'cmd_draw' }, { text: '❓ 帮助菜单', callback_data: 'cmd_help' }],
    ];

    await deliverMessage(msg, inlineButtons);
    return;
  }

  if (text.startsWith('/stats') || text.startsWith('/profit') || text.startsWith('/pnl')) {
    const pnl = calculateProfitAndLoss(draws);

    const msg = `
<b>📊 澳门三分六合彩 · 430期预测下注回测盈亏报表</b>
--------------------------------------
<b>累计预测期数</b>: <code>430</code> 期实盘数据跟踪 (日开480期-前50期积累)
<b>累计总下注</b>: <code>${pnl.totalBet.toLocaleString()} USDT</code> (300/期)
<b>累计总派彩</b>: <code>${pnl.totalPayout.toLocaleString()} USDT</code>
<b>累计净盈亏</b>: <b>+${pnl.netProfit.toLocaleString()} USDT 📈</b>
<b>投资回报率</b>: <b>+${pnl.roi}% 🔥 (ROI)</b>
--------------------------------------
📏 <b>大小命中率</b>: <code>${pnl.sizeHitRate}%</code> (赔率 1.95)
🎲 <b>单双命中率</b>: <code>${pnl.parityHitRate}%</code> (赔率 1.95)
🎨 <b>波色命中率</b>: <code>${pnl.colorHitRate}%</code> (红2.75 / 蓝绿2.98)
🎯 <b>三项全中(大满贯)</b>: <b>${pnl.allThreeHits} 期 🔥</b>
🏆 <b>历史最长连红</b>: <b>${pnl.maxStreak} 连红 🔥</b>
--------------------------------------
💡 <i>说明：每天480期，前50期积累为开奖基准，后430期下注结算。特码49退本金。更新时间: ${new Date().toLocaleTimeString('zh-CN')}</i>
`.trim();

    const inlineButtons = [
      [{ text: '🔄 刷新报表', callback_data: 'cmd_stats' }, { text: '🧠 智能预测', callback_data: 'cmd_predict' }],
      [{ text: '🎰 最新开奖', callback_data: 'cmd_draw' }, { text: '📜 5期历史', callback_data: 'cmd_history' }],
    ];

    await deliverMessage(msg, inlineButtons);
    return;
  }
}
