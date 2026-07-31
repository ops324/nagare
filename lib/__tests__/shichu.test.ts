import { describe, it, expect } from 'vitest';
import { jstToInstant } from '../time';
import { meishiki, tenchusatsuOf, hourBranchOf } from '../shichu';
import { dayKanshi } from '../koyomi';

describe('四柱推命 命式（実例 1987-06-10 01:00 で全4柱を検証）', () => {
  const m = meishiki(jstToInstant(1987, 6, 10, 1, 0), true);
  it('年柱 丁卯', () => expect(m.year.name).toBe('丁卯'));
  it('月柱 丙午（五虎遁）', () => expect(m.month.name).toBe('丙午'));
  it('日柱 庚寅', () => expect(m.day.name).toBe('庚寅'));
  it('時柱 丁丑（五鼠遁）', () => expect(m.hour?.name).toBe('丁丑'));
  it('日主は庚', () => expect(m.dayMaster).toBe('庚'));
  it('天中殺は午未（庚寅＝甲申旬）', () => expect(m.tenchusatsu.name).toBe('午未天中殺'));
});

describe('命式（時刻なし）', () => {
  const m = meishiki(jstToInstant(1990, 5, 20, 12, 0), false);
  it('年柱 庚午', () => expect(m.year.name).toBe('庚午'));
  it('月柱 辛巳（庚年・巳月）', () => expect(m.month.name).toBe('辛巳'));
  it('時柱は null', () => expect(m.hour).toBeNull());
});

describe('空亡（天中殺）', () => {
  it.each([
    [0, '戌亥天中殺'], // 甲子旬
    [10, '申酉天中殺'], // 甲戌旬
    [26, '午未天中殺'], // 甲申旬（庚寅）
    [59, '子丑天中殺'], // 甲寅旬（癸亥）
  ])('index %i → %s', (i, name) => {
    expect(tenchusatsuOf(i).name).toBe(name);
  });
});

describe('時支', () => {
  it.each([
    [23, 0], // 子
    [0, 0], // 子
    [1, 1], // 丑
    [11, 6], // 午
    [12, 6], // 午
    [22, 11], // 亥
  ])('%i時 → 支index %i', (h, b) => {
    expect(hourBranchOf(h)).toBe(b);
  });
});

// 年干（risshunYear）と月支（setsugetsuBranchAt）は同じ粒度＝節入りの瞬間で切る。
// 片方だけ暦日基準にすると、五虎遁が両基準を混ぜてどちらの流派にも存在しない月柱を作る。
describe('年柱と月柱は同じ境界（節入りの瞬間）で切る', () => {
  it('立春2026 = 2/4 05:01 JST の直前は 乙巳年・己丑月（前年・前の節月で整合）', () => {
    const m = meishiki(jstToInstant(2026, 2, 4, 3, 0), true);
    expect(m.year.name).toBe('乙巳'); // 2025年
    expect(m.month.name).toBe('己丑'); // 乙年の丑月（五虎遁：乙→戊寅起、丑は11番目）
  });

  it('立春の直後は 丙午年・庚寅月', () => {
    const m = meishiki(jstToInstant(2026, 2, 4, 12, 0), true);
    expect(m.year.name).toBe('丙午'); // 2026年
    expect(m.month.name).toBe('庚寅'); // 丙年の寅月
  });

  it('立春2000 = 2/4 21:40 JST の直前は 己卯年・丁丑月', () => {
    const m = meishiki(jstToInstant(2000, 2, 4, 10, 0), true);
    expect(m.year.name).toBe('己卯'); // 1999年
    expect(m.month.name).toBe('丁丑');
  });

  it('啓蟄2026 = 3/5 22:58 JST：同じ 3/5 でも 10:00 は寅月・23:30 は卯月', () => {
    expect(meishiki(jstToInstant(2026, 3, 5, 10, 0), true).month.name).toBe('庚寅');
    expect(meishiki(jstToInstant(2026, 3, 5, 23, 30), true).month.name).toBe('辛卯');
  });
});

describe('日柱の一致（Phase 1 の日干支と整合）', () => {
  it('1987-06-10 は庚寅', () => {
    expect(dayKanshi(jstToInstant(1987, 6, 10, 12, 0)).name).toBe('庚寅');
  });
});
