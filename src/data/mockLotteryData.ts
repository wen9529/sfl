import { LotteryConfig, LotteryKind, DrawRecord } from '../types';

export const RED_WAVE_NUMS = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
export const BLUE_WAVE_NUMS = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
export const GREEN_WAVE_NUMS = [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49];

export function getWaveColor(num: number): 'red' | 'blue' | 'green' {
  if (RED_WAVE_NUMS.includes(num)) return 'red';
  if (BLUE_WAVE_NUMS.includes(num)) return 'blue';
  return 'green';
}

export function getWaveLabel(colorStr: string): string {
  if (colorStr === 'red' || colorStr === '红') return '红波';
  if (colorStr === 'blue' || colorStr === '蓝') return '蓝波';
  if (colorStr === 'green' || colorStr === '绿') return '绿波';
  return '未知';
}

export const ZODIACS = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"];

export function getZodiacByNum(num: number): string {
  if (num < 1 || num > 49) return "未知";
  return ZODIACS[(num - 1) % 12];
}

export const LOTTERY_CONFIGS: Record<LotteryKind, LotteryConfig> = {
  macaujc3: {
    id: 'macaujc3',
    name: '澳门三分六合彩',
    shortName: '三分六合彩',
    description: '1-49号平码6位 + 1位特别号码，支持波色红蓝绿与十二生肖极速盘析，每3分钟开奖',
    redCount: 6,
    redMax: 49,
    blueCount: 1,
    blueMax: 49,
    drawDays: '每 3 分钟开奖',
    rules: {
      sumRange: [120, 210],
      recommendedOddEvenRatio: '3:3 或 4:2',
    },
  },
};

/**
 * Parses API response from https://history.macaumarksix.com/history/macaujc3
 */
export function parseMacauApiResponse(json: any): DrawRecord[] {
  if (!json || !json.data || !Array.isArray(json.data) || json.data.length === 0) {
    return [];
  }
  const innerData = json.data[0]?.data;
  if (!Array.isArray(innerData)) return [];

  return innerData.map((item: any) => {
    const rawCodes = (item.openCode || '').split(',').map((s: string) => parseInt(s.trim(), 10) || 0);
    const redBalls = rawCodes.slice(0, 6);
    const blueBalls = rawCodes.length >= 7 ? [rawCodes[6]] : [];

    const rawWaves = (item.wave || '').split(',').map((w: string) => w.trim());
    const rawZodiacs = (item.zodiac || '').split(',').map((z: string) => z.trim());

    const waves = rawWaves.length === 7 ? rawWaves : rawCodes.map(getWaveColor);
    const zodiacs = rawZodiacs.length === 7 ? rawZodiacs : rawCodes.map(getZodiacByNum);

    return {
      issue: String(item.expect || ''),
      date: item.openTime || new Date().toISOString().replace('T', ' ').slice(0, 19),
      redBalls,
      blueBalls,
      waves,
      zodiacs,
      rawOpenCode: item.openCode,
      sales: '澳门金沙/永利/新葡京专场',
      poolMoney: '实时滚动彩池',
    };
  });
}

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

// Initial default seed draws based on user's exact sample
function generateSeedDrawsMacauJC3(): DrawRecord[] {
  const presetCodes = [
    { code: "20,40,23,09,27,14,18", wave: "blue,red,red,blue,green,blue,red", zodiac: "狗,虎,羊,雞,兔,龍,鼠" },
    { code: "05,18,33,41,12,29,08", wave: "green,red,green,blue,red,red,red", zodiac: "馬,鼠,兔,猴,狗,虎,牛" },
    { code: "11,26,02,39,47,15,22", wave: "green,blue,red,green,blue,blue,green", zodiac: "龍,羊,豬,雞,鼠,蛇,虎" },
    { code: "07,19,30,44,16,28,35", wave: "red,red,red,green,green,green,red", zodiac: "兔,狗,牛,馬,猴,羊,豬" },
    { code: "01,14,23,37,42,10,03", wave: "red,blue,red,blue,blue,blue,blue", zodiac: "虎,蛇,羊,狗,牛,龍,鼠" },
    { code: "06,17,25,32,48,21,13", wave: "green,green,blue,blue,blue,green,red", zodiac: "兔,馬,猴,狗,虎,牛,羊" },
    { code: "04,13,22,36,45,29,18", wave: "blue,red,green,blue,red,red,red", zodiac: "牛,虎,龍,羊,狗,鼠,雞" },
    { code: "08,20,31,40,15,27,09", wave: "red,blue,blue,red,blue,green,blue", zodiac: "虎,兔,馬,猴,狗,鼠,羊" },
    { code: "03,12,24,38,49,16,26", wave: "blue,red,red,green,green,green,blue", zodiac: "牛,龍,羊,狗,鼠,虎,蛇" },
    { code: "09,21,34,43,19,30,07", wave: "blue,green,red,green,red,red,red", zodiac: "鼠,虎,馬,猴,狗,牛,兔" },
  ];

  const records: DrawRecord[] = [];

  for (let i = 0; i < 25; i++) {
    const p = presetCodes[i % presetCodes.length];
    const info = getMacau3MinIssueInfo(i);

    const rawCodes = p.code.split(',').map(n => parseInt(n, 10));
    const redBalls = rawCodes.slice(0, 6);
    const blueBalls = [rawCodes[6]];
    const waves = p.wave.split(',');
    const zodiacs = p.zodiac.split(',');

    records.push({
      issue: info.expect,
      date: info.openTime,
      redBalls,
      blueBalls,
      waves,
      zodiacs,
      rawOpenCode: p.code,
      sales: '澳门三大场地实时滚投',
      poolMoney: '彩池动态注入中',
    });
  }

  return records;
}

export const INITIAL_MOCK_DATA: Record<LotteryKind, DrawRecord[]> = {
  macaujc3: generateSeedDrawsMacauJC3(),
};

