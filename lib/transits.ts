/**
 * 大きな流れ v2：外惑星のトランジット（回帰）と天中殺の巡り
 *
 * サターンリターン(約29.5年)・ジュピターリターン(約11.86年)等は、
 * 「天体が出生時と同じ位置に戻る」年。ここでは日心黄経の回帰で年単位に求める
 * （地心の三重会合の中心とほぼ一致し、年表示に十分）。
 */
import { Body, EclipticLongitude } from 'astronomy-engine';
import { norm360, angleDelta, toJstParts } from './time';
import { yearKanshi, dayKanshiIndex } from './koyomi';
import { tenchusatsuOf } from './shichu';
import { JUNISHI } from './constants';

const PERIOD_DAYS: Partial<Record<Body, number>> = {
  [Body.Jupiter]: 4332.59,
  [Body.Saturn]: 10759.22,
  [Body.Uranus]: 30688.5,
  [Body.Neptune]: 60182,
};

function helioLon(body: Body, t: Date): number {
  return norm360(EclipticLongitude(body, t));
}

/** after より後で、body の日心黄経が natalLon に戻る最初の時刻 */
export function nextHelioReturn(body: Body, natalLon: number, after: Date): Date {
  const period = PERIOD_DAYS[body]!;
  const cur = helioLon(body, after);
  let advance = norm360(natalLon - cur);
  if (advance < 1e-6) advance = 360; // 出生直後などの自明解を避け、次の1周へ
  const est = after.getTime() + (advance / 360) * period * 86400000;
  let lo = est - 45 * 86400000;
  let hi = est + 45 * 86400000;
  for (let i = 0; i < 52; i++) {
    const mid = (lo + hi) / 2;
    // 日心黄経は単調増加。natalLon を境に angleDelta が負→正へ。
    if (angleDelta(natalLon, helioLon(body, new Date(mid))) < 0) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

export interface TransitEvent {
  year: number;
  age: number; // 満年齢の概算
  label: string;
  body: string;
}

const RETURN_LABEL: Record<string, string> = {
  Saturn: 'サターンリターン',
  Jupiter: 'ジュピターリターン',
};

/** birth の body の回帰を、fromDate 以降で count 回 */
export function planetReturns(
  body: Body,
  birthInstant: Date,
  fromDate: Date,
  count: number,
): TransitEvent[] {
  const natal = helioLon(body, birthInstant);
  const out: TransitEvent[] = [];
  let cursor = fromDate;
  for (let i = 0; i < count; i++) {
    const t = nextHelioReturn(body, natal, cursor);
    const year = toJstParts(t).year;
    const age = year - toJstParts(birthInstant).year;
    out.push({ year, age, label: RETURN_LABEL[body] ?? '回帰', body });
    cursor = new Date(t.getTime() + 86400000);
  }
  return out;
}

/** 主要な外惑星トランジット（サターン／ジュピターリターン）を fromDate 以降 toYear まで */
export function majorTransits(birthInstant: Date, fromDate: Date, toYear: number): TransitEvent[] {
  const events: TransitEvent[] = [];
  for (const body of [Body.Saturn, Body.Jupiter]) {
    for (const e of planetReturns(body, birthInstant, fromDate, 4)) {
      if (e.year <= toYear) events.push(e);
    }
  }
  return events.sort((a, b) => a.year - b.year);
}

// ─────────────── 年天中殺の巡り ───────────────
export interface TenchusatsuYear {
  year: number;
  branchName: string;
}

/** その人の天中殺（日柱の空亡2支）に当たる年を fromYear 以降 count 件 */
export function tenchusatsuYears(birthInstant: Date, fromYear: number, count: number): TenchusatsuYear[] {
  const tc = tenchusatsuOf(dayKanshiIndex(birthInstant));
  const set = new Set(tc.branches);
  const out: TenchusatsuYear[] = [];
  for (let y = fromYear; y < fromYear + 40 && out.length < count; y++) {
    const b = yearKanshi(y).branch;
    if (set.has(b)) out.push({ year: y, branchName: JUNISHI[b] });
  }
  return out;
}
