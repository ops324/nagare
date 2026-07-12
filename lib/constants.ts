/**
 * 占術・暦の名称テーブル（純データ）
 */

// ─── 十干・十二支・干支 ───
export const JIKKAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const JIKKAN_YOMI = [
  'きのえ', 'きのと', 'ひのえ', 'ひのと', 'つちのえ',
  'つちのと', 'かのえ', 'かのと', 'みずのえ', 'みずのと',
] as const;

export const JUNISHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const JUNISHI_YOMI = [
  'ね', 'うし', 'とら', 'う', 'たつ', 'み',
  'うま', 'ひつじ', 'さる', 'とり', 'いぬ', 'い',
] as const;
export const JUNISHI_ANIMAL = [
  'ねずみ', '牛', '虎', 'うさぎ', '龍', '蛇',
  '馬', '羊', '猿', '鶏', '犬', '猪',
] as const;

/** 干支番号(0-59, 0=甲子) → 表記 */
export function kanshiName(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return JIKKAN[i % 10] + JUNISHI[i % 12];
}
export function kanshiYomi(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return `${JIKKAN_YOMI[i % 10]}${JUNISHI_YOMI[i % 12]}`;
}

// ─── 西洋12星座（トロピカル） ───
export interface ZodiacSign {
  name: string;
  yomi: string;
  symbol: string;
  element: '火' | '地' | '風' | '水';
}
export const ZODIAC: ZodiacSign[] = [
  { name: '牡羊座', yomi: 'おひつじ', symbol: '♈', element: '火' },
  { name: '牡牛座', yomi: 'おうし', symbol: '♉', element: '地' },
  { name: '双子座', yomi: 'ふたご', symbol: '♊', element: '風' },
  { name: '蟹座', yomi: 'かに', symbol: '♋', element: '水' },
  { name: '獅子座', yomi: 'しし', symbol: '♌', element: '火' },
  { name: '乙女座', yomi: 'おとめ', symbol: '♍', element: '地' },
  { name: '天秤座', yomi: 'てんびん', symbol: '♎', element: '風' },
  { name: '蠍座', yomi: 'さそり', symbol: '♏', element: '水' },
  { name: '射手座', yomi: 'いて', symbol: '♐', element: '火' },
  { name: '山羊座', yomi: 'やぎ', symbol: '♑', element: '地' },
  { name: '水瓶座', yomi: 'みずがめ', symbol: '♒', element: '風' },
  { name: '魚座', yomi: 'うお', symbol: '♓', element: '水' },
];

// ─── 月相（8区分） ───
export const MOON_PHASES = [
  { name: '新月', yomi: 'しんげつ', symbol: '🌑' },
  { name: '三日月', yomi: 'みかづき', symbol: '🌒' },
  { name: '上弦の月', yomi: 'じょうげん', symbol: '🌓' },
  { name: '十三夜月', yomi: 'じゅうさんや', symbol: '🌔' },
  { name: '満月', yomi: 'まんげつ', symbol: '🌕' },
  { name: '十六夜', yomi: 'いざよい', symbol: '🌖' },
  { name: '下弦の月', yomi: 'かげん', symbol: '🌗' },
  { name: '有明月', yomi: 'ありあけ', symbol: '🌘' },
] as const;

// ─── 六曜 ───
// r = (旧暦月 + 旧暦日) mod 6
export const ROKUYO = [
  { name: '大安', yomi: 'たいあん', tone: 'good' as const, note: '万事に良い最良の日' },
  { name: '赤口', yomi: 'しゃっこう', tone: 'bad' as const, note: '正午前後のみ吉、他は凶' },
  { name: '先勝', yomi: 'せんしょう', tone: 'mixed' as const, note: '午前が吉、急ぐこと吉' },
  { name: '友引', yomi: 'ともびき', tone: 'mixed' as const, note: '朝夕は吉、正午は凶。祝事は吉' },
  { name: '先負', yomi: 'せんぶ', tone: 'mixed' as const, note: '午後が吉、控えめに過ごす' },
  { name: '仏滅', yomi: 'ぶつめつ', tone: 'bad' as const, note: '万事に慎む日、新規は避ける' },
];

// ─── 九星 ───
export interface Kyusei {
  num: number; // 1-9
  name: string;
  yomi: string;
  element: '水' | '土' | '木' | '金' | '火';
}
export const KYUSEI: Kyusei[] = [
  { num: 1, name: '一白水星', yomi: 'いっぱくすいせい', element: '水' },
  { num: 2, name: '二黒土星', yomi: 'じこくどせい', element: '土' },
  { num: 3, name: '三碧木星', yomi: 'さんぺきもくせい', element: '木' },
  { num: 4, name: '四緑木星', yomi: 'しろくもくせい', element: '木' },
  { num: 5, name: '五黄土星', yomi: 'ごおうどせい', element: '土' },
  { num: 6, name: '六白金星', yomi: 'ろっぱくきんせい', element: '金' },
  { num: 7, name: '七赤金星', yomi: 'しちせききんせい', element: '金' },
  { num: 8, name: '八白土星', yomi: 'はっぱくどせい', element: '土' },
  { num: 9, name: '九紫火星', yomi: 'きゅうしかせい', element: '火' },
];
export function kyusei(num: number): Kyusei {
  return KYUSEI[(((num - 1) % 9) + 9) % 9];
}
