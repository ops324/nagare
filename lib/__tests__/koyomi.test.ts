import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import {
  solarTermsInYear,
  solarTermAround,
  dayKanshi,
  kyureki,
  rokuyo,
  senjitsu,
} from '../koyomi';

const d = (y: number, m: number, day: number) => jstNoon(y, m, day);
const names = (arr: { name: string }[]) => arr.map((x) => x.name);

describe('二十四節気 (2026, 国立天文台ベースの公表値と一致)', () => {
  const terms = solarTermsInYear(2026);
  const find = (name: string) => terms.find((t) => t.name === name)!;

  it('24 個そろう', () => {
    expect(terms).toHaveLength(24);
  });

  it.each([
    ['小寒', 1, 5],
    ['大寒', 1, 20],
    ['立春', 2, 4],
    ['雨水', 2, 19],
    ['啓蟄', 3, 5],
    ['春分', 3, 20],
    ['清明', 4, 5],
    ['立夏', 5, 5],
    ['夏至', 6, 21],
    ['小暑', 7, 7],
    ['立秋', 8, 7],
    ['秋分', 9, 23],
    ['立冬', 11, 7],
    ['冬至', 12, 22],
  ])('%s = 2026/%i/%i', (name, m, day) => {
    expect(find(name).jst).toMatchObject({ month: m, day });
  });

  it('2026-07-13 の節気は「小暑」、次は「大暑」', () => {
    const a = solarTermAround(d(2026, 7, 13));
    expect(a.current?.name).toBe('小暑');
    expect(a.next?.name).toBe('大暑');
  });
});

describe('日干支 (2026-01-01 = 乙亥 を基準に検証)', () => {
  it.each([
    [1, 1, '乙亥'],
    [3, 5, '戊寅'],
    [7, 19, '甲午'],
    [12, 16, '甲子'],
  ])('2026/%i/%i = %s', (m, day, name) => {
    expect(dayKanshi(d(2026, m, day)).name).toBe(name);
  });
});

describe('旧暦', () => {
  it('2026-01-01 → 旧暦 2025/11/13', () => {
    expect(kyureki(d(2026, 1, 1))).toMatchObject({ year: 2025, month: 11, day: 13, isLeap: false });
  });
  it('2026-02-17 → 旧暦 2026/1/1（旧正月）', () => {
    expect(kyureki(d(2026, 2, 17))).toMatchObject({ year: 2026, month: 1, day: 1, isLeap: false });
  });
});

describe('六曜 ((旧暦月+日) mod 6, 大安カレンダーと一致)', () => {
  it.each([
    [1, 1, '大安'],
    [2, 4, '仏滅'],
    [2, 17, '先勝'],
    [3, 5, '大安'],
  ])('2026/%i/%i = %s', (m, day, name) => {
    expect(rokuyo(d(2026, m, day)).name).toBe(name);
  });
});

describe('選日', () => {
  it('2026-03-05 は 天赦日・一粒万倍日・寅の日', () => {
    const s = names(senjitsu(d(2026, 3, 5)));
    expect(s).toEqual(expect.arrayContaining(['天赦日', '一粒万倍日', '寅の日']));
  });

  it.each([
    [3, 5],
    [5, 4],
    [5, 20],
    [7, 19],
    [10, 1],
    [12, 16],
  ])('2026/%i/%i は天赦日', (m, day) => {
    expect(names(senjitsu(d(2026, m, day)))).toContain('天赦日');
  });

  it('2026-12-16 は 甲子の日・天赦日・一粒万倍日が重なる', () => {
    const s = names(senjitsu(d(2026, 12, 16)));
    expect(s).toEqual(expect.arrayContaining(['甲子の日', '天赦日', '一粒万倍日']));
  });

  it.each([
    [7, 22], // 丁酉（未月＝午酉）
    [8, 13], // 己未（申月＝子未）
  ])('2026/%i/%i は一粒万倍日', (m, day) => {
    expect(names(senjitsu(d(2026, m, day)))).toContain('一粒万倍日');
  });

  it('2026-01-03（丁丑）は選日なし', () => {
    expect(senjitsu(d(2026, 1, 3))).toHaveLength(0);
  });
});
