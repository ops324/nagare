import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import {
  nextSolarEclipse,
  nextLunarEclipse,
  nextSupermoon,
  moonDistanceKm,
  searchMoonLongitude,
  voidOfCourse,
} from '../seiyo';
import { moonLongitude } from '../astro';

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
});
