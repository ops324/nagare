import { dayKanshi } from '@/lib/koyomi';

/** 今日の色（五行ラッキーカラー）。方式は PROVENANCE.luckyColor 参照。 */
export type LuckyKey = 'moku' | 'ka' | 'do' | 'kin' | 'sui';

export interface LuckyColor {
  key: LuckyKey;
  gogyo: string; // 木火土金水
  colorName: string; // 日本の伝統色名
}

const GOGYO_COLORS: LuckyColor[] = [
  { key: 'moku', gogyo: '木', colorName: '萌黄' },
  { key: 'ka', gogyo: '火', colorName: '紅' },
  { key: 'do', gogyo: '土', colorName: '琥珀' },
  { key: 'kin', gogyo: '金', colorName: '金箔' },
  { key: 'sui', gogyo: '水', colorName: '浅葱' },
];

/** 日干（甲乙=木・丙丁=火・戊己=土・庚辛=金・壬癸=水）→ 今日の色 */
export function luckyColorOf(now: Date): LuckyColor {
  return GOGYO_COLORS[Math.floor(dayKanshi(now).stem / 2)];
}

export const LUCKY_COLORS = GOGYO_COLORS;
