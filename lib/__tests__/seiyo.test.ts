import { describe, it, expect } from 'vitest';
import { Body } from 'astronomy-engine';
import { jstNoon, addDays, norm360, angleDelta } from '../time';
import {
  nextSolarEclipse,
  nextLunarEclipse,
  nextSupermoon,
  moonDistanceKm,
  searchMoonLongitude,
  voidOfCourse,
} from '../seiyo';
import { moonLongitude, geoEclipticLongitude } from '../astro';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const ud = (dt: Date) => ({ m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });

describe('日食・月食（2026 の実際の食と一致）', () => {
  it('2026 最初の日食は 2/17 金環日食', () => {
    const e = nextSolarEclipse(utc(2026, 1, 1));
    expect(ud(e.instant)).toEqual({ m: 2, d: 17 });
    expect(e.label).toBe('金環日食');
  });
  it('2026 最初の月食は 3/3 皆既月食', () => {
    const e = nextLunarEclipse(utc(2026, 1, 1));
    expect(ud(e.instant)).toEqual({ m: 3, d: 3 });
    expect(e.label).toBe('皆既月食');
  });
  it('6/1 以降の日食は 8/12 皆既日食', () => {
    const e = nextSolarEclipse(utc(2026, 6, 1));
    expect(ud(e.instant)).toEqual({ m: 8, d: 12 });
    expect(e.label).toBe('皆既日食');
  });
  it('6/1 以降の月食は 8/28 部分月食', () => {
    const e = nextLunarEclipse(utc(2026, 6, 1));
    expect(ud(e.instant)).toEqual({ m: 8, d: 28 });
    expect(e.label).toBe('部分月食');
  });
});

describe('月の距離・スーパームーン', () => {
  it('月の地心距離は 356000〜407000 km の範囲', () => {
    const km = moonDistanceKm(jstNoon(2026, 7, 13));
    expect(km).toBeGreaterThan(356000);
    expect(km).toBeLessThan(407000);
  });
  it('次の満月とスーパームーン判定を返す', () => {
    const s = nextSupermoon(jstNoon(2026, 7, 13));
    expect(s.fullMoon).toBeInstanceOf(Date);
    expect(typeof s.isSupermoon).toBe('boolean');
    expect(s.isSupermoon).toBe(s.distanceKm <= 360000);
  });
});

describe('月の黄経探索', () => {
  it('境界に達した時刻で月黄経が目標に一致', () => {
    const target = 120;
    const t = searchMoonLongitude(target, jstNoon(2026, 7, 13));
    const diff = Math.abs(((moonLongitude(t) - target + 540) % 360) - 180);
    expect(diff).toBeLessThan(0.2);
  });
});

describe('ボイドタイム', () => {
  const v = voidOfCourse(jstNoon(2026, 7, 13));
  it('星座移動は現在時刻より後、約2.6日以内', () => {
    const now = jstNoon(2026, 7, 13).getTime();
    expect(v.signChange.getTime()).toBeGreaterThan(now);
    expect(v.signChange.getTime()).toBeLessThan(now + 2.6 * 86400000);
  });
  it('現在星座・次星座は有効な星座名', () => {
    const signs = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
    expect(signs).toContain(v.currentSign);
    expect(signs).toContain(v.nextSign);
  });
  it('ボイド開始があれば星座移動より前、isVoid は boolean', () => {
    expect(typeof v.isVoid).toBe('boolean');
    if (v.voidStart) expect(v.voidStart.getTime()).toBeLessThanOrEqual(v.signChange.getTime());
  });

  it('2026-07-13 のボイド開始は 7/14 09:43Z（アスペクト集合の修正で動かないこと）', () => {
    expect(v.voidStart.getTime()).toBeCloseTo(Date.parse('2026-07-14T09:43:29Z'), -5);
  });
});

// 有向離角 norm360(月 − 天体) と突き合わせるため、六分=60/300・矩=90/270・三分=120/240 の
// 両方を列挙しないと星座内の最後のアスペクトを取り逃す。
// 修正前は 2026年の60日サンプル中20日で voidStart が最大26.9時間早く、
// うち一定数は voidStart が null になり isVoid が黙って false に落ちていた。
describe('ボイドタイム：アスペクト集合と入宮クランプ', () => {
  const VOC_BODIES = [Body.Sun, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
  const sweep = Array.from({ length: 60 }, (_, d) => voidOfCourse(addDays(jstNoon(2026, 1, 2), d * 6)));

  it('2026-07-08 のボイド開始は 7/8 18:41Z（修正前は 25.4時間早い 7/7 17:14Z）', () => {
    const w = voidOfCourse(jstNoon(2026, 7, 8));
    expect(w.voidStart.getTime()).toBeCloseTo(Date.parse('2026-07-08T18:41:33Z'), -5);
    expect(w.signChange.getTime()).toBeCloseTo(Date.parse('2026-07-08T20:30:37Z'), -5);
  });

  it('voidStart が null にならない（60日掃引）', () => {
    for (const w of sweep) expect(w.voidStart).toBeInstanceOf(Date);
  });

  it('voidStart は必ず入宮以降・星座移動より前（60日掃引）', () => {
    for (const w of sweep) {
      expect(w.voidStart.getTime()).toBeGreaterThanOrEqual(w.signIngress.getTime() - 1000);
      expect(w.voidStart.getTime()).toBeLessThanOrEqual(w.signChange.getTime());
      expect(w.signIngress.getTime()).toBeLessThan(w.signChange.getTime());
    }
  });

  // 数値を固定しない本命のガード：voidStart の時刻に本当にアスペクトが立っているか。
  // 240/270/300 を落とすと、ここで拾えない時刻が voidStart になる。
  it('voidStart の時刻には実際に主要アスペクトが立っている（入宮フォールバックを除く）', () => {
    for (const w of sweep) {
      if (Math.abs(w.voidStart.getTime() - w.signIngress.getTime()) < 1000) continue; // 星座内にアスペクト無し
      const ml = moonLongitude(w.voidStart);
      let best = Infinity;
      for (const body of VOC_BODIES) {
        const sep = Math.abs(angleDelta(0, norm360(ml - geoEclipticLongitude(body, w.voidStart))));
        for (const a of [0, 60, 90, 120, 180]) best = Math.min(best, Math.abs(sep - a));
      }
      expect(best, `no aspect at ${w.voidStart.toISOString()}`).toBeLessThan(0.05);
    }
  });

  it('星座内にアスペクトが無ければ入宮時刻から（2026-01-06）', () => {
    const w = voidOfCourse(jstNoon(2026, 1, 6));
    expect(w.voidStart.getTime()).toBe(w.signIngress.getTime());
    expect(w.signIngress.getTime()).toBeCloseTo(Date.parse('2026-01-04T13:43:20Z'), -5);
  });
});
