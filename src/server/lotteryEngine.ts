export interface MacauDrawItem {
  expect: string;
  openCode: string;
  openTime: string;
  wave: string;
  zodiac: string;
  fiveElements?: string;
}

export function getWaveColor(num: number): 'red' | 'blue' | 'green' {
  const reds = [1, 2, 7, 8, 9, 12, 13, 18, 19, 23, 24, 28, 29, 30, 34, 35, 37, 40, 41, 45, 48];
  const blues = [3, 4, 10, 14, 15, 20, 25, 26, 31, 36, 42];
  if (reds.includes(num)) return 'red';
  if (blues.includes(num)) return 'blue';
  return 'green';
}

export function getZodiac(num: number): string {
  const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
  return zodiacs[(num - 1) % 12];
}

export function getFiveElements(num: number): string {
  const gold = [4, 5, 11, 12, 13, 26, 27, 34, 35, 42, 43];
  const wood = [8, 9, 16, 17, 24, 25, 38, 39, 46, 47];
  const water = [1, 14, 15, 22, 23, 30, 31, 44, 45];
  const fire = [2, 3, 10, 18, 19, 32, 33, 40, 41, 48, 49];
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

function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 生成 50 期完整的 Macau 三分六合彩模拟数据 (使用期号 Seed 保证同一期号数据完全一致)
 */
export function generate50MacauDraws(): MacauDrawItem[] {
  const list: MacauDrawItem[] = [];

  for (let i = 0; i < 50; i++) {
    const info = getMacau3MinIssueInfo(i);
    const issue = info.expect;

    const reds: number[] = [];
    let step = 0;
    while (reds.length < 6) {
      const hash = stringToHash(`${issue}_red_${step}`);
      const r = (hash % 49) + 1;
      if (!reds.includes(r)) reds.push(r);
      step++;
    }
    reds.sort((a, b) => a - b);

    let blueStep = 0;
    let blueHash = stringToHash(`${issue}_blue_${blueStep}`);
    let blue = (blueHash % 49) + 1;
    while (reds.includes(blue)) {
      blueStep++;
      blueHash = stringToHash(`${issue}_blue_${blueStep}`);
      blue = (blueHash % 49) + 1;
    }

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

/**
 * 优先抓取 https://history.macaumarksix.com/history/macaujc3 官方50期开奖记录
 * 若抓取失败或异常，则降级使用 generate50MacauDraws 模拟生成
 */
export async function getLatestDraws(): Promise<MacauDrawItem[]> {
  try {
    const response = await fetch("https://history.macaumarksix.com/history/macaujc3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 1, pageSize: 480 }),
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const json: any = await response.json();
      let rawList: any[] = [];
      if (Array.isArray(json?.data?.records)) {
        rawList = json.data.records;
      } else if (Array.isArray(json?.data)) {
        if (Array.isArray(json.data[0]?.data)) {
          rawList = json.data[0].data;
        } else if (Array.isArray(json.data[0]?.records)) {
          rawList = json.data[0].records;
        } else {
          rawList = json.data;
        }
      } else if (Array.isArray(json?.records)) {
        rawList = json.records;
      }

      if (Array.isArray(rawList) && rawList.length > 0) {
        const draws: MacauDrawItem[] = [];
        for (const item of rawList.slice(0, 480)) {
          const rawCodes = String(item.openCode || "").split(",");
          if (rawCodes.length >= 7) {
            const numCodes = rawCodes.map((c) => parseInt(c, 10)).filter((n) => !isNaN(n));
            if (numCodes.length >= 7) {
              const formattedCodes = numCodes.slice(0, 7).map((n) => String(n).padStart(2, "0")).join(",");
              draws.push({
                expect: String(item.expect || ""),
                openCode: formattedCodes,
                openTime: item.openTime || new Date().toISOString(),
                wave: item.wave || numCodes.slice(0, 7).map(getWaveColor).join(","),
                zodiac: item.zodiac || numCodes.slice(0, 7).map(getZodiac).join(","),
                fiveElements: numCodes.slice(0, 7).map(getFiveElements).join(","),
              });
            }
          }
        }
        if (draws.length >= 10) {
          return draws;
        }
      }
    }
  } catch (err) {
    console.warn("抓取官方 MacauJC3 接口失败或超时，切回 fallback 算法:", err);
  }

  return generate50MacauDraws();
}
