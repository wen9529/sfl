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
 * 生成 50 期完整的 Macau 三分六合彩模拟数据
 */
export function generate50MacauDraws(): MacauDrawItem[] {
  const list: MacauDrawItem[] = [];
  const baseIssue = 20260726001 + 120;
  const now = Date.now();

  for (let i = 0; i < 50; i++) {
    const issue = String(baseIssue - i);
    const reds: number[] = [];
    while (reds.length < 6) {
      const r = Math.floor(Math.random() * 49) + 1;
      if (!reds.includes(r)) reds.push(r);
    }
    reds.sort((a, b) => a - b);
    let blue = Math.floor(Math.random() * 49) + 1;
    while (reds.includes(blue)) blue = Math.floor(Math.random() * 49) + 1;

    const codeArr = [...reds, blue];
    const openTimeStr = new Date(now - i * 180 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    list.push({
      expect: issue,
      openCode: codeArr.join(','),
      openTime: openTimeStr,
      wave: codeArr.map(getWaveColor).join(','),
      zodiac: codeArr.map(getZodiac).join(','),
      fiveElements: codeArr.map(getFiveElements).join(','),
    });
  }
  return list;
}
