import { describe, it, expect } from 'vitest';
import { jstNoon, jstToInstant, toJstParts } from '../time';
import { unmeisei } from '../rokusei';
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

// 境界は立春の「瞬間」。立春が正午過ぎに起きる年はその日の大半が前年に属するため、
// 暦日で切ると本命星・年柱・六星の± が丸ごと1年ずれる。
describe('立春の境界は暦日ではなく瞬間', () => {
  it('立春2000 = 2/4 21:40 JST：同じ 2/4 でも 10:00 は1999年・23:00 は2000年', () => {
    const before = jstToInstant(2000, 2, 4, 10, 0);
    const after = jstToInstant(2000, 2, 4, 23, 0);
    expect(risshunYear(before)).toBe(1999);
    expect(risshunYear(after)).toBe(2000);
  });

  it('本命星も六星の±も、立春の瞬間で切り替わる', () => {
    const before = jstToInstant(2000, 2, 4, 10, 0);
    const after = jstToInstant(2000, 2, 4, 23, 0);
    expect(honmeisei(before).name).toBe('一白水星'); // 1999年生まれ
    expect(honmeisei(after).name).toBe('九紫火星'); // 2000年生まれ
    expect(unmeisei(before).label).toBe('火星人−'); // 己卯＝陰支
    expect(unmeisei(after).label).toBe('火星人＋'); // 庚辰＝陽支
  });

  it('立春2025 = 2/3 23:10 JST：2/3 正午は前年(2024)扱い', () => {
    expect(risshunYear(jstToInstant(2025, 2, 3, 12, 0))).toBe(2024);
  });

  it('立春2026 = 2/4 05:01 JST：2/4 03:00 は2025年・12:00 は2026年', () => {
    expect(risshunYear(jstToInstant(2026, 2, 4, 3, 0))).toBe(2025);
    expect(risshunYear(jstToInstant(2026, 2, 4, 12, 0))).toBe(2026);
  });

  it('立春1990 = 2/4 11:13 JST：正午を代表点にする時刻無しの生まれは従来どおり1990年', () => {
    // §5 の「1990-02-04 = 天王星人＋」を守る（既存の参照値は jstNoon 基準）
    expect(risshunYear(jstNoon(1990, 2, 4))).toBe(1990);
    expect(risshunYear(jstToInstant(1990, 2, 4, 9, 0))).toBe(1989);
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
