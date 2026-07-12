import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import { daiun } from '../daiun';

describe('四柱推命 大運（実例 1994-07-05 で検証）', () => {
  it('男（陽干年）は順行、立運 0年8ヶ月、初運 辛未', () => {
    const d = daiun(jstNoon(1994, 7, 5), '男', false);
    expect(d.forward).toBe(true);
    expect(d.startYears).toBe(0);
    expect(d.startMonths).toBe(8);
    expect(d.periods[0].kanshi.name).toBe('辛未');
  });

  it('女（陽干年）は逆行、初運は月柱の前 己巳', () => {
    const d = daiun(jstNoon(1994, 7, 5), '女', false);
    expect(d.forward).toBe(false);
    expect(d.periods[0].kanshi.name).toBe('己巳');
  });

  it('大運は10年刻みで年齢が進む', () => {
    const d = daiun(jstNoon(1994, 7, 5), '男', false, 8);
    expect(d.periods).toHaveLength(8);
    expect(d.periods[1].ageStart - d.periods[0].ageStart).toBe(10);
  });

  it('順行では六十干支が1つずつ進む', () => {
    const d = daiun(jstNoon(1994, 7, 5), '男', false);
    const a = d.periods[0].kanshi.index;
    const b = d.periods[1].kanshi.index;
    expect((b - a + 60) % 60).toBe(1);
  });
});
