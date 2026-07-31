import { describe, it, expect } from 'vitest';
import { jstNoon, jstToInstant } from '../time';
import { daiun, daiunIndexAt, monthsSinceBirth } from '../daiun';
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

// 「何期目か」の判定は、年に丸めた2つの値を比べていた:
//   ① ageStart が立運の端数（0/4/8ヶ月）を捨てていた
//   ② UI の currentAge が満年齢ではなく「暦年の差」だった
// 独立した2つの丸めが同じ不等式の両側に入るため誤差が足し算になり、
// 12月生まれ・立運に端数ありの人で最大1年3ヶ月ほど強調が先走っていた。
describe('大運の現在期（年に丸めず月で比べる）', () => {
  it('立運の端数は各期の開始にも乗る', () => {
    const d = daiun(jstNoon(1994, 7, 5), '男', false); // 立運 0年8ヶ月
    expect(d.startMonths).toBe(8);
    expect(d.periods.slice(0, 3).map((p) => [p.ageStart, p.ageStartMonths])).toEqual([
      [0, 8],
      [10, 8],
      [20, 8],
    ]);
  });

  it('monthsSinceBirth は暦年の差ではなく満年齢（誕生日前は1つ小さい）', () => {
    const birth = jstNoon(1994, 7, 5);
    expect(monthsSinceBirth(birth, jstNoon(2004, 1, 1))).toBe(113); // 9歳5ヶ月（暦年の差は10）
    expect(monthsSinceBirth(birth, jstNoon(2004, 7, 4))).toBe(119); // 誕生日の前日＝9歳11ヶ月
    expect(monthsSinceBirth(birth, jstNoon(2004, 7, 5))).toBe(120); // 誕生日当日＝10歳0ヶ月
  });

  it('1994-07-05男（立運0年8ヶ月）の第2期は 10歳8ヶ月から（修正前は暦年2004の元日から光っていた）', () => {
    const birth = jstNoon(1994, 7, 5);
    const d = daiun(birth, '男', false);
    // 修正前はここで既に第2期（index 1）を光らせていた。実際はまだ9歳5ヶ月。
    expect(daiunIndexAt(d, birth, jstNoon(2004, 1, 1))).toBe(0);
    expect(daiunIndexAt(d, birth, jstNoon(2005, 3, 4))).toBe(0); // 10歳7ヶ月：まだ第1期
    expect(daiunIndexAt(d, birth, jstNoon(2005, 3, 5))).toBe(1); // 10歳8ヶ月ちょうどで第2期へ
    expect(daiunIndexAt(d, birth, jstNoon(2015, 3, 5))).toBe(2); // 20歳8ヶ月
  });

  it('立運に達する前は -1（どのセルも光らせない）', () => {
    const birth = jstNoon(1994, 7, 5);
    const d = daiun(birth, '男', false);
    expect(daiunIndexAt(d, birth, jstNoon(1994, 7, 5))).toBe(-1); // 生まれた日
    expect(daiunIndexAt(d, birth, jstNoon(1995, 3, 4))).toBe(-1); // 立運の前日
    expect(daiunIndexAt(d, birth, jstNoon(1995, 3, 5))).toBe(0); // 立運 0歳8ヶ月ちょうど
  });

  it('12月生まれ・立運に端数ありでも先走らない', () => {
    const birth = jstNoon(2000, 12, 20); // 立運 5年4ヶ月
    const d = daiun(birth, '男', false);
    expect([d.startYears, d.startMonths]).toEqual([5, 4]);
    // 修正前は暦年の差が15になる2015-01-01から第2期を光らせていた（実際は14歳0ヶ月）
    expect(daiunIndexAt(d, birth, jstNoon(2015, 1, 1))).toBe(0);
    expect(daiunIndexAt(d, birth, jstNoon(2016, 4, 19))).toBe(0); // 15歳3ヶ月
    expect(daiunIndexAt(d, birth, jstNoon(2016, 4, 20))).toBe(1); // 15歳4ヶ月
  });

  it('期の範囲は隙間なく連続する（境界で必ず1つだけ選ばれる）', () => {
    const birth = jstNoon(1985, 12, 28);
    const d = daiun(birth, '女', false);
    let prev = -1;
    for (let mo = 0; mo <= 100 * 12; mo += 1) {
      const now = jstToInstant(1985 + Math.floor((11 + mo) / 12), ((11 + mo) % 12) + 1, 28, 12, 0);
      const idx = daiunIndexAt(d, birth, now);
      expect(idx).toBeGreaterThanOrEqual(prev); // 単調に進むだけ（戻らない・飛ばない）
      if (idx > prev) expect(idx - prev).toBe(1);
      prev = idx;
    }
    expect(prev).toBe(d.periods.length - 1); // 最後は最終期に落ち着く
  });
});
