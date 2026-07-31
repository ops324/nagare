import { describe, it, expect } from 'vitest';
import { jstNoon, jstToInstant } from '../time';
import { daiun } from '../daiun';
import { meishiki } from '../shichu';

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

// 月柱は setsugetsuBranchAt（節入りの瞬間）、立運は nextSetsuDate/prevSetsuDate（同じく瞬間）。
// かつて月柱だけが JST 23:59 基準だったため、節入り日の節入り時刻より前に生まれた人は
// 「新しい節月」なのに「次の節入りまで0日」になり、立運が10年ずれていた。
describe('節入り日生まれの立運（月柱と同じ境界で切る）', () => {
  const days = (d: ReturnType<typeof daiun>) => d.startYears * 3 + d.startMonths / 4;

  it('啓蟄2026 = 3/5 22:58 JST：直前は寅月・順行0年0ヶ月、直後は卯月・順行10年4ヶ月', () => {
    const before = jstToInstant(2026, 3, 5, 10, 0);
    const after = jstToInstant(2026, 3, 5, 23, 30);
    // 2026 は丙午年＝陽干なので男が順行
    expect(meishiki(before, true).month.name).toBe('庚寅');
    expect(daiun(before, '男', true)).toMatchObject({ forward: true, startYears: 0, startMonths: 0 });
    expect(meishiki(after, true).month.name).toBe('辛卯');
    expect(daiun(after, '男', true)).toMatchObject({ forward: true, startYears: 10, startMonths: 4 });
  });

  it('清明2026 = 4/5 03:39 JST：直前は卯月・順行0年、直後は辰月・順行10年', () => {
    const before = jstToInstant(2026, 4, 5, 1, 0);
    const after = jstToInstant(2026, 4, 5, 12, 0);
    expect(meishiki(before, true).month.name).toBe('辛卯');
    expect(daiun(before, '男', true).startYears).toBe(0);
    expect(meishiki(after, true).month.name).toBe('壬辰');
    expect(daiun(after, '男', true).startYears).toBe(10);
  });

  /**
   * 数値を固定しない本命のガード。
   *
   * 順行の日数（生日→次の節入り）と逆行の日数（前の節入り→生日）の和は、
   * その人の属する節月の長さそのもの。したがって **同じ月柱を持つ2人は必ず同じ和になる**。
   * 月柱と立運の基準がずれているとこれが破れる — 修正前は 3/5 10:00 と 3/5 23:30 が
   * どちらも「卯月」なのに和が 29 と 31 で食い違っていた（＝立運が10年ずれる原因）。
   */
  it('同じ月柱なら 順行日数 + 逆行日数 が一致する', () => {
    const total = (t: Date) => {
      const a = daiun(t, '男', true);
      const b = daiun(t, '女', true);
      return days(a) + days(b);
    };
    const byMonth = new Map<string, { label: string; sum: number }[]>();
    for (const [y, mo, d, h] of [
      [2026, 3, 4, 12], [2026, 3, 5, 10], [2026, 3, 5, 22], // 寅月（啓蟄 22:58 の前）
      [2026, 3, 5, 23], [2026, 3, 6, 12], [2026, 4, 5, 1], // 卯月（清明 03:39 の前まで）
      [2026, 4, 5, 12], [2026, 4, 20, 12], // 辰月
      [1994, 7, 5, 12], [1994, 7, 20, 12], // 午月
    ] as const) {
      const t = jstToInstant(y, mo, d, h, 0);
      const key = meishiki(t, true).month.name;
      const label = `${y}-${mo}-${d} ${h}:00`;
      byMonth.set(key, [...(byMonth.get(key) ?? []), { label, sum: total(t) }]);
    }
    for (const [month, rows] of byMonth) {
      const uniq = [...new Set(rows.map((r) => r.sum))];
      expect(uniq, `${month}月: ${rows.map((r) => `${r.label}=${r.sum}d`).join(' / ')}`).toHaveLength(1);
      expect(uniq[0]).toBeGreaterThanOrEqual(28); // 節月は約29〜32日
      expect(uniq[0]).toBeLessThanOrEqual(32);
    }
  });
});
