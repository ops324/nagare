/**
 * 九星気学：本命星・年運（回座）・八方塞がり
 *
 * 年の区切りは立春。本命星番号は 11 − 生年の数字根（>9 は −9）で求める。
 * （1994=六白, 1995=五黄, 2000=九紫, 2025=二黒 で検証済み）
 */
import { SearchSunLongitude } from 'astronomy-engine';
import { kyusei, type Kyusei } from './constants';
import { jstToInstant, jstJdn, toJstParts } from './time';

/** 数字根 (1-9) */
function digitalRoot(y: number): number {
  return 1 + ((y - 1) % 9);
}

/** 立春基準の年 Y の本命星番号(1-9) */
export function honmeiNumberForYear(year: number): number {
  let n = 11 - digitalRoot(year);
  if (n > 9) n -= 9;
  return n;
}

/** その西暦年の立春インスタント（JST） */
export function risshunInstant(year: number): Date {
  const t = SearchSunLongitude(315, jstToInstant(year, 1, 20, 0, 0), 40);
  return t!.date;
}

/** 生年月日が属する「立春基準の年」 */
export function risshunYear(birthDate: Date): number {
  const p = toJstParts(birthDate);
  const risshun = risshunInstant(p.year);
  return jstJdn(birthDate) < jstJdn(risshun) ? p.year - 1 : p.year;
}

/** 生年月日 → 本命星 */
export function honmeisei(birthDate: Date): Kyusei {
  return kyusei(honmeiNumberForYear(risshunYear(birthDate)));
}

// ─── 洛書（後天定位盤）：base星 → 宮・方位 ───
interface Palace {
  base: number;
  palace: string;
  direction: string;
}
const PALACES: Palace[] = [
  { base: 1, palace: '坎宮', direction: '北' },
  { base: 2, palace: '坤宮', direction: '南西' },
  { base: 3, palace: '震宮', direction: '東' },
  { base: 4, palace: '巽宮', direction: '南東' },
  { base: 5, palace: '中宮', direction: '中央' },
  { base: 6, palace: '乾宮', direction: '北西' },
  { base: 7, palace: '兌宮', direction: '西' },
  { base: 8, palace: '艮宮', direction: '北東' },
  { base: 9, palace: '離宮', direction: '南' },
];

// 回座（base宮）ごとの運気テーマ
const NENUN_THEME: Record<number, { phase: string; theme: string; note: string; tone: 'good' | 'caution' | 'neutral' }> = {
  5: { phase: '八方塞がり', theme: '停滞・充電', note: '新しい挑戦や大きな移動は控えめに。足元を固め、力を蓄える一年。', tone: 'caution' },
  1: { phase: '冬・雌伏の時', theme: '内省・準備', note: '表立った動きより、静かに整え備える時期。健康と睡眠を大切に。', tone: 'caution' },
  2: { phase: '準備・地固め', theme: '着実・育成', note: '派手さより堅実さ。地道な努力がのちの実りにつながる年。', tone: 'neutral' },
  3: { phase: '発展の始まり', theme: '始動・挑戦', note: '物事が動き出す芽吹きの年。新しいことを始めるのに向く。', tone: 'good' },
  4: { phase: '好調・拡大', theme: '信用・ご縁', note: '人間関係と信用が広がる。良いご縁・整った縁に恵まれやすい。', tone: 'good' },
  6: { phase: '完成・多忙', theme: '責任・充実', note: '忙しくも充実する年。目上の引き立てを得やすい。無理は禁物。', tone: 'good' },
  7: { phase: '収穫・悦び', theme: '金運・楽しみ', note: '実りと楽しみの年。一方で口の災い・散財には気をつけたい。', tone: 'good' },
  8: { phase: '転換・変化', theme: '改革・整理', note: '変化と方向転換の年。古いものを整理し、次へ切り替える好機。', tone: 'neutral' },
  9: { phase: '頂点・栄光', theme: '名誉・注目', note: '華やかで注目される年。見栄や別れごとには少し注意を。', tone: 'caution' },
};

export interface Nenun {
  year: number;
  chuguuNumber: number; // その年の中宮星
  honmeiNumber: number;
  base: number; // 本命星が回座する定位宮の base
  palace: string;
  direction: string;
  phase: string;
  theme: string;
  note: string;
  tone: 'good' | 'caution' | 'neutral';
  happouFusagari: boolean; // 八方塞がり
}

function mod9to1(n: number): number {
  return ((n - 1) % 9 + 9) % 9 + 1;
}

/** 本命星番号 h の人にとって、立春基準の年 year の運気（回座） */
export function nenun(honmeiNumber: number, year: number): Nenun {
  const c = honmeiNumberForYear(year); // 中宮星
  // 本命星 h が回座する定位宮の base:  b = ((h-1) - (c-5)) mod 9 + 1
  const base = mod9to1(honmeiNumber - (c - 5));
  const palace = PALACES.find((p) => p.base === base)!;
  const theme = NENUN_THEME[base];
  return {
    year,
    chuguuNumber: c,
    honmeiNumber,
    base,
    palace: palace.palace,
    direction: palace.direction,
    phase: theme.phase,
    theme: theme.theme,
    note: theme.note,
    tone: theme.tone,
    happouFusagari: base === 5,
  };
}

/** 生年月日から、指定年(西暦)の運気を返す（立春を跨ぐ手前は前年扱い） */
export function nenunForBirth(birthDate: Date, gregorianYear: number): Nenun {
  const h = honmeiNumberForYear(risshunYear(birthDate));
  return nenun(h, gregorianYear);
}
