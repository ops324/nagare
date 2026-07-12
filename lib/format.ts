/** 表示用フォーマット（和暦・曜日・度数など） */

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function weekdayJa(weekday: number): string {
  return WEEKDAYS[weekday];
}

interface Era {
  name: string;
  startY: number;
  startM: number;
  startD: number;
}
// 新しい順
const ERAS: Era[] = [
  { name: '令和', startY: 2019, startM: 5, startD: 1 },
  { name: '平成', startY: 1989, startM: 1, startD: 8 },
  { name: '昭和', startY: 1926, startM: 12, startD: 25 },
  { name: '大正', startY: 1912, startM: 7, startD: 30 },
  { name: '明治', startY: 1868, startM: 1, startD: 25 },
];

/** 西暦(年月日) → 和暦 { era, year }（元年は 1） */
export function wareki(year: number, month: number, day: number): { era: string; year: number } | null {
  for (const e of ERAS) {
    const afterStart =
      year > e.startY ||
      (year === e.startY && (month > e.startM || (month === e.startM && day >= e.startD)));
    if (afterStart) return { era: e.name, year: year - e.startY + 1 };
  }
  return null;
}

export function warekiLabel(year: number, month: number, day: number): string {
  const w = wareki(year, month, day);
  if (!w) return `${year}年`;
  return `${w.era}${w.year === 1 ? '元' : w.year}年`;
}

/** 0..1 を % に */
export function pct(v: number): number {
  return Math.round(v * 100);
}

/** バイオリズムの符号ラベル */
export function signMark(v: number): string {
  if (v > 0.05) return '＋';
  if (v < -0.05) return '−';
  return '±';
}
