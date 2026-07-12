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

describe('日柱の一致（Phase 1 の日干支と整合）', () => {
  it('1987-06-10 は庚寅', () => {
    expect(dayKanshi(jstToInstant(1987, 6, 10, 12, 0)).name).toBe('庚寅');
  });
});
