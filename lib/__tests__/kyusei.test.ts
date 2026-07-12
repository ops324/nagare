import { describe, it, expect } from 'vitest';
import { jstNoon, toJstParts } from '../time';
import {
  honmeiNumberForYear,
  honmeisei,
  risshunInstant,
  risshunYear,
  nenun,
} from '../kyusei';

describe('本命星番号 (立春基準・公表の早見表と一致)', () => {
  it.each([
    [1994, 6], // 六白金星
    [1995, 5], // 五黄土星
    [2000, 9], // 九紫火星
    [2025, 2], // 二黒土星
    [2026, 1], // 一白水星
    [1990, 1],
    [1991, 9],
  ])('%i年 → %i', (year, num) => {
    expect(honmeiNumberForYear(year)).toBe(num);
  });
});

describe('立春の境界', () => {
  it('2026 の立春は 2/4', () => {
    const p = toJstParts(risshunInstant(2026));
    expect({ month: p.month, day: p.day }).toEqual({ month: 2, day: 4 });
  });

  it('1995-01-15 生まれは立春前 → 前年(1994)扱いで六白金星', () => {
    const b = jstNoon(1995, 1, 15);
    expect(risshunYear(b)).toBe(1994);
    expect(honmeisei(b).name).toBe('六白金星');
  });

  it('1995-06-01 生まれは五黄土星', () => {
    expect(honmeisei(jstNoon(1995, 6, 1)).name).toBe('五黄土星');
  });
});

describe('年運（回座）と八方塞がり', () => {
  it('2025年の中宮星は二黒(2)、2026年は一白(1)', () => {
    expect(nenun(5, 2025).chuguuNumber).toBe(2);
    expect(nenun(5, 2026).chuguuNumber).toBe(1);
  });

  it('本命星＝中宮星の年は八方塞がり（本命星が中宮に回座）', () => {
    const n = nenun(1, 2026); // 一白の人・2026(中宮一白)
    expect(n.happouFusagari).toBe(true);
    expect(n.palace).toBe('中宮');
    expect(nenun(2, 2026).happouFusagari).toBe(false);
  });
});
