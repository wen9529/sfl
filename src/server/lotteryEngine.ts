export interface MacauDrawItem {
  expect: string;
  openCode: string;
  openTime: string;
  wave: string;
  zodiac: string;
  fiveElements?: string;
}

export function getWaveColor(num: number): 'red' | 'blue' | 'green' {
  const reds = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
  const blues = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
  if (reds.includes(num)) return 'red';
  if (blues.includes(num)) return 'blue';
  return 'green';
}

export function getZodiac(num: number): string {
  const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
  return zodiacs[(num - 1) % 12];
}

export function getFiveElements(num: number): string {
  const gold = [1, 2, 15, 16, 23, 24, 31, 32, 45, 46];
  const wood = [5, 6, 13, 14, 27, 28, 35, 36, 43, 44];
  const water = [3, 4, 11, 12, 19, 20, 33, 34, 41, 42, 49];
  const fire = [7, 8, 21, 22, 29, 30, 37, 38, 47, 48];
  if (gold.includes(num)) return '金';
  if (wood.includes(num)) return '木';
  if (water.includes(num)) return '水';
  if (fire.includes(num)) return '火';
  return '土';
}

/**
 * 根据北京时间 (UTC+8) 精确计算澳门三分六合彩期号与开奖时间
 * 北京时间 00:00:00 开始第一期 (001)，每 3 分钟一期，每天共 480 期
 */
export function getMacau3MinIssueInfo(offsetDraws = 0): { expect: string; openTime: string } {
  const now = new Date();
  const bjOffset = 8 * 60 * 60 * 1000;
  const bjDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + bjOffset);

  const hours = bjDate.getHours();
  const minutes = bjDate.getMinutes();
  const totalMinutesToday = hours * 60 + minutes;

  const latestCompletedIndexToday = Math.floor(totalMinutesToday / 3);

  let targetIndexToday = latestCompletedIndexToday - offsetDraws;

  const targetDate = new Date(bjDate);

  while (targetIndexToday <= 0) {
    targetDate.setDate(targetDate.getDate() - 1);
    targetIndexToday += 480;
  }

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const issueNumStr = String(targetIndexToday).padStart(3, '0');
  const expect = `${dateStr}${issueNumStr}`;

  const openTimeDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  openTimeDate.setMinutes(targetIndexToday * 3);

  const oY = openTimeDate.getFullYear();
  const oM = String(openTimeDate.getMonth() + 1).padStart(2, '0');
  const oD = String(openTimeDate.getDate()).padStart(2, '0');
  const oH = String(openTimeDate.getHours()).padStart(2, '0');
  const oMin = String(openTimeDate.getMinutes()).padStart(2, '0');
  const openTimeStr = `${oY}-${oM}-${oD} ${oH}:${oMin}:00`;

  return { expect, openTime: openTimeStr };
}

/**
 * 生成 50 期完整的 Macau 三分六合彩模拟数据
 */
export function generate50MacauDraws(): MacauDrawItem[] {
  const list: MacauDrawItem[] = [];

  for (let i = 0; i < 50; i++) {
    const info = getMacau3MinIssueInfo(i);
    const reds: number[] = [];
    while (reds.length < 6) {
      const r = Math.floor(Math.random() * 49) + 1;
      if (!reds.includes(r)) reds.push(r);
    }
    reds.sort((a, b) => a - b);
    let blue = Math.floor(Math.random() * 49) + 1;
    while (reds.includes(blue)) blue = Math.floor(Math.random() * 49) + 1;

    const codeArr = [...reds, blue];

    list.push({
      expect: info.expect,
      openCode: codeArr.join(','),
      openTime: info.openTime,
      wave: codeArr.map(getWaveColor).join(','),
      zodiac: codeArr.map(getZodiac).join(','),
      fiveElements: codeArr.map(getFiveElements).join(','),
    });
  }
  return list;
}
