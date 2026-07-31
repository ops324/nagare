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

/**
 * after より後で、body の日心黄経が natalLon に戻る最初の時刻。
 *
 * ※ ここが日心でなければならない理由（§11 の「逆行は必ず地心黄経で」を適用しないこと）：
 *   地心黄経は逆行するため回帰の交差が1周につき3回になり（三重通過）、解が一意に定まらない。
 *   日心黄経は単調増加なので根がちょうど1つで、下の補正・二分探索が成立する。
 *   §11 は逆行判定とアスペクトの話であり、この関数には当たらない。
 *
 * 平均周期による見積もり est は、after が出生時（advance≒360＝ちょうど1周）なら厳密だが、
 * 部分弧（majorTransits が after=now で呼ぶ経路）では中心差により最大 ~190日(土星)ずれる。
 * かつて est±45日 を二分探索していたため根を挟めず「est+45日」を黙って返していた。
 * 黄経の残差から時間へ戻す不動点補正で寄せてから、狭い二分探索で仕上げる。
 */
export function nextHelioReturn(body: Body, natalLon: number, after: Date): Date {
  const period = PERIOD_DAYS[body]!;
  const cur = helioLon(body, after);
  let advance = norm360(natalLon - cur);
  if (advance < 1e-6) advance = 360; // 出生直後などの自明解を避け、次の1周へ

  for (let attempt = 0; attempt < 2; attempt++) {
    let t = after.getTime() + (advance / 360) * period * 86400000;
    // 残りの黄経差を平均角速度で時間へ換算して寄せる（日心黄経は単調なので収束する）
    for (let i = 0; i < 6; i++) {
      t += (angleDelta(helioLon(body, new Date(t)), natalLon) / 360) * period * 86400000;
    }
    // 仕上げの二分探索。補正で既に秒未満まで寄っているので窓は暴走防止のガードレール。
    let lo = t - 10 * 86400000;
    let hi = t + 10 * 86400000;
    for (let i = 0; i < 52; i++) {
      const mid = (lo + hi) / 2;
      if (angleDelta(natalLon, helioLon(body, new Date(mid))) < 0) lo = mid;
      else hi = mid;
    }
    // after ちょうどが解になった場合だけ、次の1周へ送ってやり直す
    if (hi > after.getTime()) return new Date(hi);
    advance += 360;
  }
  return new Date(after.getTime() + (advance / 360) * period * 86400000);
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
