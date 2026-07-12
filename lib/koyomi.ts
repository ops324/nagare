/**
 * 暦注（こよみ）：二十四節気・干支・旧暦・六曜・選日
 *
 * 天体位置は astronomy-engine（sunLongitude 経由）で精密に求め、
 * 判定はすべて JST 暦日で行う。日干支の基準は 2026-01-01(JST)=乙亥(index11)。
 * （2026-03-05=戊寅 と 63日差=+3 で整合、複数の万年暦と一致を確認済み）
 */
import { SearchSunLongitude, SearchMoonPhase } from 'astronomy-engine';
import { sunLongitude } from './astro';
import {
  ROKUYO,
  JIKKAN,
  JUNISHI,
  JIKKAN_YOMI,
  JUNISHI_YOMI,
  JUNISHI_ANIMAL,
  kanshiName,
  kanshiYomi,
} from './constants';
import {
  addDays,
  jstNoon,
  jstToInstant,
  toJstParts,
  jstJdn,
  jstDayDiff,
  julianDayNumber,
  norm360,
} from './time';

// ─────────────────────────── 二十四節気 ───────────────────────────

export interface SolarTerm {
  longitude: number; // 太陽黄経(度)
  name: string;
  yomi: string;
  kind: '節' | '中'; // 節気 / 中気
}

// 黄経(度) → 節気。0=春分 から 15°刻み。
const TERMS_BY_LON: Record<number, SolarTerm> = {
  0: { longitude: 0, name: '春分', yomi: 'しゅんぶん', kind: '中' },
  15: { longitude: 15, name: '清明', yomi: 'せいめい', kind: '節' },
  30: { longitude: 30, name: '穀雨', yomi: 'こくう', kind: '中' },
  45: { longitude: 45, name: '立夏', yomi: 'りっか', kind: '節' },
  60: { longitude: 60, name: '小満', yomi: 'しょうまん', kind: '中' },
  75: { longitude: 75, name: '芒種', yomi: 'ぼうしゅ', kind: '節' },
  90: { longitude: 90, name: '夏至', yomi: 'げし', kind: '中' },
  105: { longitude: 105, name: '小暑', yomi: 'しょうしょ', kind: '節' },
  120: { longitude: 120, name: '大暑', yomi: 'たいしょ', kind: '中' },
  135: { longitude: 135, name: '立秋', yomi: 'りっしゅう', kind: '節' },
  150: { longitude: 150, name: '処暑', yomi: 'しょしょ', kind: '中' },
  165: { longitude: 165, name: '白露', yomi: 'はくろ', kind: '節' },
  180: { longitude: 180, name: '秋分', yomi: 'しゅうぶん', kind: '中' },
  195: { longitude: 195, name: '寒露', yomi: 'かんろ', kind: '節' },
  210: { longitude: 210, name: '霜降', yomi: 'そうこう', kind: '中' },
  225: { longitude: 225, name: '立冬', yomi: 'りっとう', kind: '節' },
  240: { longitude: 240, name: '小雪', yomi: 'しょうせつ', kind: '中' },
  255: { longitude: 255, name: '大雪', yomi: 'たいせつ', kind: '節' },
  270: { longitude: 270, name: '冬至', yomi: 'とうじ', kind: '中' },
  285: { longitude: 285, name: '小寒', yomi: 'しょうかん', kind: '節' },
  300: { longitude: 300, name: '大寒', yomi: 'だいかん', kind: '中' },
  315: { longitude: 315, name: '立春', yomi: 'りっしゅん', kind: '節' },
  330: { longitude: 330, name: '雨水', yomi: 'うすい', kind: '中' },
  345: { longitude: 345, name: '啓蟄', yomi: 'けいちつ', kind: '節' },
};

export interface SolarTermOccurrence extends SolarTerm {
  instant: Date;
  /** JST の暦日 */
  jst: { year: number; month: number; day: number };
}

function occ(longitude: number, instant: Date): SolarTermOccurrence {
  const p = toJstParts(instant);
  return { ...TERMS_BY_LON[longitude], instant, jst: { year: p.year, month: p.month, day: p.day } };
}

/** 指定した西暦年(JST)に含まれる二十四節気をすべて時系列で返す */
export function solarTermsInYear(year: number): SolarTermOccurrence[] {
  const res: SolarTermOccurrence[] = [];
  let cursor = jstNoon(year, 1, 1);
  const end = jstToInstant(year + 1, 1, 1, 0, 0);
  for (let i = 0; i < 26; i++) {
    const lon = sunLongitude(cursor);
    const nextMult = norm360((Math.floor(lon / 15) + 1) * 15);
    const t = SearchSunLongitude(nextMult, cursor, 40);
    if (!t || t.date.getTime() >= end.getTime()) break;
    res.push(occ(nextMult, t.date));
    cursor = addDays(t.date, 1);
  }
  return res;
}

/** now が属する節気と、次の節気 */
export function solarTermAround(now: Date): {
  current: SolarTermOccurrence | null;
  next: SolarTermOccurrence | null;
} {
  const lon = sunLongitude(now);
  const nextMult = norm360((Math.floor(lon / 15) + 1) * 15);
  const curMult = norm360(Math.floor(lon / 15) * 15);
  const nextT = SearchSunLongitude(nextMult, now, 40);
  const curT = SearchSunLongitude(curMult, addDays(now, -40), 45);
  return {
    current: curT ? occ(curMult, curT.date) : null,
    next: nextT ? occ(nextMult, nextT.date) : null,
  };
}

// ─────────────────────────── 節月（地支） ───────────────────────────

/** 太陽黄経 → 節月の地支 index（子=0）。立春(315)＝寅月。 */
export function setsugetsuBranchOfLongitude(lon: number): number {
  return (2 + Math.floor(norm360(lon - 315) / 30)) % 12;
}

/**
 * ある暦日の節月の地支 index。
 * 節入り日はその日全体を新しい節月とするため、JST 23:59 の太陽黄経で判定する。
 */
export function setsugetsuBranch(instant: Date): number {
  const p = toJstParts(instant);
  const eod = jstToInstant(p.year, p.month, p.day, 23, 59);
  return setsugetsuBranchOfLongitude(sunLongitude(eod));
}

// ─────────────────────────── 干支 ───────────────────────────

const DAY_KANSHI_REF_JDN = julianDayNumber(2026, 1, 1);
const DAY_KANSHI_REF_INDEX = 11; // 乙亥

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** 日干支 index(0=甲子) */
export function dayKanshiIndex(instant: Date): number {
  return mod(jstJdn(instant) - DAY_KANSHI_REF_JDN + DAY_KANSHI_REF_INDEX, 60);
}

export interface Kanshi {
  index: number; // 0-59
  name: string; // 例: 甲子
  yomi: string;
  stem: number; // 0-9 (十干)
  branch: number; // 0-11 (十二支)
  stemName: string;
  branchName: string;
  animal: string;
}

function kanshiOf(index: number): Kanshi {
  const i = mod(index, 60);
  return {
    index: i,
    name: kanshiName(i),
    yomi: kanshiYomi(i),
    stem: i % 10,
    branch: i % 12,
    stemName: JIKKAN[i % 10],
    branchName: JUNISHI[i % 12],
    animal: JUNISHI_ANIMAL[i % 12],
  };
}

export function dayKanshi(instant: Date): Kanshi {
  return kanshiOf(dayKanshiIndex(instant));
}

/** 干支 index(0-59) → Kanshi */
export function kanshiFromIndex(index: number): Kanshi {
  return kanshiOf(index);
}

/** 十干 index と 十二支 index から 干支 index(0-59) を求める（無効な組は -1） */
export function kanshiIndexFromStemBranch(stem: number, branch: number): number {
  for (let n = 0; n < 60; n++) if (n % 10 === stem && n % 12 === branch) return n;
  return -1;
}

/** 年干支 index。立春基準の年 Y を渡すこと（甲子年=4 AD） */
export function yearKanshiIndex(year: number): number {
  return mod(year - 4, 60);
}
export function yearKanshi(year: number): Kanshi {
  return kanshiOf(yearKanshiIndex(year));
}

// ─────────────────────────── 旧暦（太陰太陽暦） ───────────────────────────

function newMoonOnOrBefore(t: Date): Date {
  // 旧暦の朔日は「朔の瞬間を含む JST 暦日」を1日目とするため、瞬間ではなく暦日で比較する。
  const targetJdn = jstJdn(t);
  let nm = SearchMoonPhase(0, addDays(t, -40), 42);
  let prev = nm;
  while (nm && jstJdn(nm.date) <= targetJdn) {
    prev = nm;
    nm = SearchMoonPhase(0, addDays(nm.date, 1), 40);
  }
  return prev!.date;
}

function newMoonAfter(t: Date): Date {
  const nm = SearchMoonPhase(0, addDays(t, 1), 45);
  return nm!.date;
}

/** 中気(黄経の30°倍)が [a, b) の間にあるか */
function chukiInInterval(a: Date, b: Date): number | null {
  const la = sunLongitude(a);
  const target = norm360(Math.ceil(la / 30 - 1e-9) * 30);
  const t = SearchSunLongitude(target, a, 40);
  if (t && t.date.getTime() < b.getTime()) return target;
  return null;
}

/** 中気の黄経 → 旧暦の月番号(1-12)。冬至(270)を含む月＝11月。 */
function monthOfChuki(lon: number): number {
  const mo = (lon / 30 + 2) % 12;
  return mo === 0 ? 12 : mo;
}

function lunarMonthInfo(m1: Date, depth = 0): { month: number; isLeap: boolean } {
  const nextNM = newMoonAfter(m1);
  const chuki = chukiInInterval(m1, nextNM);
  if (chuki !== null) {
    return { month: monthOfChuki(chuki), isLeap: false };
  }
  // 中気を含まない月＝閏月。前月の番号を継ぐ。
  if (depth > 2) return { month: 1, isLeap: true }; // 安全弁（通常到達しない）
  const prev = lunarMonthInfo(newMoonOnOrBefore(addDays(m1, -1)), depth + 1);
  return { month: prev.month, isLeap: true };
}

export interface Kyureki {
  year: number;
  month: number; // 1-12
  day: number; // 1-30
  isLeap: boolean; // 閏月
}

/** 旧暦（太陰太陽暦）に変換 */
export function kyureki(instant: Date): Kyureki {
  const p = toJstParts(instant);
  const noon = jstNoon(p.year, p.month, p.day);
  const m1 = newMoonOnOrBefore(noon);
  const day = jstDayDiff(m1, noon) + 1;
  const info = lunarMonthInfo(m1);
  let lyear = p.year;
  if (info.month >= 11 && p.month <= 3) lyear = p.year - 1;
  else if (info.month <= 2 && p.month >= 11) lyear = p.year + 1;
  return { year: lyear, month: info.month, day, isLeap: info.isLeap };
}

// ─────────────────────────── 六曜 ───────────────────────────

export interface RokuyoResult {
  index: number; // 0-5
  name: string;
  yomi: string;
  tone: 'good' | 'bad' | 'mixed';
  note: string;
  kyureki: Kyureki;
}

/** 六曜 = (旧暦月 + 旧暦日) mod 6 */
export function rokuyo(instant: Date): RokuyoResult {
  const k = kyureki(instant);
  const r = (k.month + k.day) % 6;
  return { index: r, ...ROKUYO[r], kyureki: k };
}

// ─────────────────────────── 選日（吉日・特異日） ───────────────────────────

// 節月の地支 index → 一粒万倍日となる日の地支 index
const ICHIRYU_TABLE: Record<number, number[]> = {
  0: [0, 11], // 子月: 子・亥
  1: [0, 3], // 丑月: 子・卯
  2: [1, 6], // 寅月: 丑・午
  3: [2, 9], // 卯月: 寅・酉
  4: [0, 3], // 辰月: 子・卯
  5: [3, 4], // 巳月: 卯・辰
  6: [5, 6], // 午月: 巳・午
  7: [6, 9], // 未月: 午・酉
  8: [0, 7], // 申月: 子・未
  9: [3, 8], // 酉月: 卯・申
  10: [6, 9], // 戌月: 午・酉
  11: [9, 10], // 亥月: 酉・戌
};

/** 天赦日の対象干支 index（季節ごと）。立春/立夏/立秋/立冬で季節を分ける。 */
function tenshaTargetIndex(lon: number): number {
  const l = norm360(lon);
  if (l >= 315 || l < 45) return 14; // 春: 戊寅
  if (l < 135) return 30; // 夏: 甲午
  if (l < 225) return 44; // 秋: 戊申
  return 0; // 冬: 甲子
}

export interface Senjitsu {
  key: string;
  name: string;
  yomi: string;
  tone: 'good' | 'bad';
  note: string;
}

/** その暦日に該当する選日（吉日・特異日）の一覧 */
export function senjitsu(instant: Date): Senjitsu[] {
  const k = dayKanshi(instant);
  const setsu = setsugetsuBranch(instant);
  const p = toJstParts(instant);
  const eod = jstToInstant(p.year, p.month, p.day, 23, 59);
  const lon = sunLongitude(eod);
  const out: Senjitsu[] = [];

  if (ICHIRYU_TABLE[setsu].includes(k.branch)) {
    out.push({
      key: 'ichiryu',
      name: '一粒万倍日',
      yomi: 'いちりゅうまんばいび',
      tone: 'good',
      note: '一粒の籾が万倍に実る。何かを始めるのに良い日。',
    });
  }
  if (k.index === tenshaTargetIndex(lon)) {
    out.push({
      key: 'tensha',
      name: '天赦日',
      yomi: 'てんしゃにち',
      tone: 'good',
      note: '暦の上で最上の吉日。天がすべてを赦すとされる。',
    });
  }
  if (k.index === 0) {
    out.push({ key: 'kinoene', name: '甲子の日', yomi: 'きのえねのひ', tone: 'good', note: '六十干支の始まり。物事を始めるのに吉。' });
  }
  if (k.index === 5) {
    out.push({ key: 'tsuchinotomi', name: '己巳の日', yomi: 'つちのとみのひ', tone: 'good', note: '弁財天の縁日。金運・財運に縁のある日。' });
  }
  if (k.branch === 2) {
    out.push({ key: 'tora', name: '寅の日', yomi: 'とらのひ', tone: 'good', note: '「千里を行って千里を帰る」。旅立ち・金運に吉。' });
  }
  if (k.branch === 5) {
    out.push({ key: 'mi', name: '巳の日', yomi: 'みのひ', tone: 'good', note: '弁財天に通じる日。金運・芸事に吉。' });
  }
  return out;
}

export { JIKKAN, JUNISHI, JIKKAN_YOMI, JUNISHI_YOMI };
