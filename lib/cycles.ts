/**
 * 運気サイクル：厄年・バイオリズム
 * （大殺界／天中殺は Phase 2 で追加）
 */
import type { Gender } from './types';
import { toJstParts, jstJdn } from './time';

// ─────────────────────────── 厄年 ───────────────────────────
// 数え年（元日基準）で判定。本厄を中心に前厄・後厄。
const HONYAKU_MALE = [25, 42, 61];
const HONYAKU_FEMALE = [19, 33, 37, 61];
const TAIYAKU_MALE = [42];
const TAIYAKU_FEMALE = [33];

export type YakudoshiKind = '前厄' | '本厄' | '後厄' | '大厄' | null;

export interface YakudoshiResult {
  kazoe: number; // 数え年
  kind: YakudoshiKind;
  isYakudoshi: boolean;
  note: string;
}

function honyakuList(gender: Gender): number[] {
  return gender === '女' ? HONYAKU_FEMALE : HONYAKU_MALE;
}
function taiyakuList(gender: Gender): number[] {
  return gender === '女' ? TAIYAKU_FEMALE : TAIYAKU_MALE;
}

/** 生年 → 指定西暦年における数え年 */
export function kazoedoshi(birthDate: Date, gregorianYear: number): number {
  return gregorianYear - toJstParts(birthDate).year + 1;
}

/** 指定西暦年の厄年判定 */
export function yakudoshi(birthDate: Date, gender: Gender, gregorianYear: number): YakudoshiResult {
  const kazoe = kazoedoshi(birthDate, gregorianYear);
  const honyaku = honyakuList(gender);
  const taiyaku = taiyakuList(gender);
  let kind: YakudoshiKind = null;
  if (honyaku.includes(kazoe)) kind = taiyaku.includes(kazoe) ? '大厄' : '本厄';
  else if (honyaku.includes(kazoe + 1)) kind = '前厄';
  else if (honyaku.includes(kazoe - 1)) kind = '後厄';

  const notes: Record<string, string> = {
    前厄: '本厄の前ぶれの年。無理をせず、慎重に過ごすとよい時期。',
    本厄: '人生の節目とされる年。健康や環境の変化に気を配りたい。',
    大厄: '厄年の中でも特に大きな節目。心身のケアと現状維持を大切に。',
    後厄: '厄が薄れていく年。油断せず穏やかに過ごすとよい。',
  };
  return {
    kazoe,
    kind,
    isYakudoshi: kind !== null,
    note: kind ? notes[kind] : '厄年ではありません。',
  };
}

/** fromYear 以降の直近の厄年（前厄・本厄・後厄）を count 件 */
export function upcomingYakudoshi(
  birthDate: Date,
  gender: Gender,
  fromYear: number,
  count = 6,
): { year: number; kazoe: number; kind: YakudoshiKind }[] {
  const out: { year: number; kazoe: number; kind: YakudoshiKind }[] = [];
  for (let y = fromYear; y < fromYear + 90 && out.length < count; y++) {
    const r = yakudoshi(birthDate, gender, y);
    if (r.isYakudoshi) out.push({ year: y, kazoe: r.kazoe, kind: r.kind });
  }
  return out;
}

// ─────────────────────────── バイオリズム ───────────────────────────
const PERIODS = { physical: 23, emotional: 28, intellectual: 33 } as const;

export interface Biorhythm {
  physical: number; // -1..1
  emotional: number;
  intellectual: number;
  days: number; // 誕生からの経過日数
}

function birthInstantToDays(birthDate: Date, now: Date): number {
  return jstJdn(now) - jstJdn(birthDate);
}

export function biorhythm(birthDate: Date, now: Date): Biorhythm {
  const days = birthInstantToDays(birthDate, now);
  return {
    physical: Math.sin((2 * Math.PI * days) / PERIODS.physical),
    emotional: Math.sin((2 * Math.PI * days) / PERIODS.emotional),
    intellectual: Math.sin((2 * Math.PI * days) / PERIODS.intellectual),
    days,
  };
}

/** now を中心に ±range 日のバイオリズム系列（グラフ用） */
export function biorhythmSeries(
  birthDate: Date,
  now: Date,
  before = 3,
  after = 10,
): { offset: number; physical: number; emotional: number; intellectual: number }[] {
  const base = jstJdn(now) - jstJdn(birthDate);
  const out = [];
  for (let d = -before; d <= after; d++) {
    const days = base + d;
    out.push({
      offset: d,
      physical: Math.sin((2 * Math.PI * days) / PERIODS.physical),
      emotional: Math.sin((2 * Math.PI * days) / PERIODS.emotional),
      intellectual: Math.sin((2 * Math.PI * days) / PERIODS.intellectual),
    });
  }
  return out;
}
