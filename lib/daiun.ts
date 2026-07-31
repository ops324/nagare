/**
 * 四柱推命：大運（10年区切りの運の流れ）と立運
 *
 * 順行/逆行は「年干の陰陽×性別」（陽男・陰女＝順行／陰男・陽女＝逆行）。
 * 立運数：順行は生日→次の節入りまでの日数÷3、逆行は前の節入り→生日÷3。余りは×4ヶ月。
 * 大運は月柱の隣の干支から±に六十干支を進める。
 * 実例 1994-07-05 男（順行, 次の節入り=小暑7/7＝2日）→ 立運0年8ヶ月・初運 辛未 で検証。
 */
import { SearchSunLongitude } from 'astronomy-engine';
import { sunLongitude } from './astro';
import { meishiki } from './shichu';
import { kanshiFromIndex, type Kanshi } from './koyomi';
import { addDays, jstDayDiff, norm360, toJstParts } from './time';
import type { Gender } from './types';

function nextSetsuDate(birth: Date): Date {
  const cur = sunLongitude(birth);
  const k = Math.floor((cur - 15) / 30);
  const target = norm360((k + 1) * 30 + 15);
  return SearchSunLongitude(target, birth, 45)!.date;
}
function prevSetsuDate(birth: Date): Date {
  const cur = sunLongitude(birth);
  const k = Math.floor((cur - 15) / 30);
  const target = norm360(k * 30 + 15);
  return SearchSunLongitude(target, addDays(birth, -45), 46)!.date;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export interface DaiunPeriod {
  /** その大運が始まる満年齢（年の部分） */
  ageStart: number;
  /** 同・月の部分（0/4/8）。立運の端数がそのまま各期に乗る */
  ageStartMonths: number;
  kanshi: Kanshi;
}

export interface Daiun {
  forward: boolean; // 順行
  genderKnown: boolean;
  startYears: number; // 立運（年）
  startMonths: number; // 立運（月）
  periods: DaiunPeriod[];
}

/** 生年月日時・性別 → 大運 */
export function daiun(birthInstant: Date, gender: Gender, hasTime: boolean, count = 8): Daiun {
  const m = meishiki(birthInstant, hasTime);
  const yearStemYang = m.year.stem % 2 === 0; // 甲丙戊庚壬=陽(偶数)
  const genderKnown = gender === '男' || gender === '女';
  // 性別未回答なら向きは定まらないが、ここでは値を出して genderKnown で注記する
  // （UI が「性別を入れると運の向きが定まります」を添える）。
  // 一方 cycles.yakudoshi は未回答なら判定そのものを保留する — 厄年は男女で年が異なり、
  // 「厄払いに行く」という現実の行動に接続するため、誤った断言の害が大きい。
  // この非対称は意図的（docs/SPEC.md §6・§8）。
  const male = gender === '男';
  const forward = (yearStemYang && male) || (!yearStemYang && !male);

  const days = forward
    ? jstDayDiff(birthInstant, nextSetsuDate(birthInstant))
    : jstDayDiff(prevSetsuDate(birthInstant), birthInstant);
  const startYears = Math.floor(days / 3);
  const startMonths = (days % 3) * 4;

  const periods: DaiunPeriod[] = [];
  for (let i = 1; i <= count; i++) {
    const idx = mod(m.month.index + (forward ? i : -i), 60);
    periods.push({
      ageStart: startYears + (i - 1) * 10,
      ageStartMonths: startMonths, // 立運の端数は各期に等しく乗る（10年ごとの平行移動なので）
      kanshi: kanshiFromIndex(idx),
    });
  }

  return { forward, genderKnown, startYears, startMonths, periods };
}

/**
 * 生まれてから now までの満月数（満年齢を月で表したもの）。
 * ※ 暦年の差（`now.year − birth.year`）ではない。誕生日前は1つ小さくなる。
 */
export function monthsSinceBirth(birthInstant: Date, now: Date): number {
  const b = toJstParts(birthInstant);
  const n = toJstParts(now);
  const months = (n.year - b.year) * 12 + (n.month - b.month);
  return n.day < b.day ? months - 1 : months;
}

/**
 * now 時点で何期目の大運にいるか（0始まり）。まだ立運に達していなければ -1。
 *
 * 年に丸めて比べてはならない。`ageStart` の月（0/4/8）と、暦年の差を満年齢と
 * 取り違える丸めが重なると、強調表示が最大1年3ヶ月ほど先走る（実測・PR #47）。
 * 両方を月に揃えて比べる。
 */
export function daiunIndexAt(d: Daiun, birthInstant: Date, now: Date): number {
  const elapsed = monthsSinceBirth(birthInstant, now);
  let index = -1;
  for (const [i, p] of d.periods.entries()) {
    if (elapsed < p.ageStart * 12 + p.ageStartMonths) break;
    index = i;
  }
  return index;
}
