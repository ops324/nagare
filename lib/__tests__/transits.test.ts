import { describe, it, expect } from 'vitest';
import { Body } from 'astronomy-engine';
import { jstNoon } from '../time';
import { planetReturns, majorTransits, tenchusatsuYears } from '../transits';

describe('外惑星の回帰', () => {
  const birth = jstNoon(1990, 1, 1);

  it('第1サターンリターンは約29〜30歳', () => {
    const r = planetReturns(Body.Saturn, birth, birth, 1)[0];
    expect(r.age).toBeGreaterThanOrEqual(28);
    expect(r.age).toBeLessThanOrEqual(31);
    expect(r.label).toBe('サターンリターン');
  });

  it('第1ジュピターリターンは約11〜12歳', () => {
    const r = planetReturns(Body.Jupiter, birth, birth, 1)[0];
    expect(r.age).toBeGreaterThanOrEqual(11);
    expect(r.age).toBeLessThanOrEqual(13);
  });

  it('サターンリターンは約29.5年間隔で続く', () => {
    const rs = planetReturns(Body.Saturn, birth, birth, 3);
    expect(rs).toHaveLength(3);
    expect(rs[1].age - rs[0].age).toBeGreaterThanOrEqual(28);
    expect(rs[1].age - rs[0].age).toBeLessThanOrEqual(31);
    expect(rs[2].age).toBeGreaterThan(rs[1].age);
  });

  it('majorTransits は年順で範囲内', () => {
    const t = majorTransits(birth, jstNoon(2020, 1, 1), 2040);
    expect(t.length).toBeGreaterThan(0);
    for (let i = 1; i < t.length; i++) expect(t[i].year).toBeGreaterThanOrEqual(t[i - 1].year);
    for (const e of t) expect(e.year).toBeLessThanOrEqual(2040);
  });
});

describe('年天中殺の巡り', () => {
  it('1987-06-10生（庚寅＝午未天中殺）は 2026午・2027未・2038午・2039未', () => {
    const ys = tenchusatsuYears(jstNoon(1987, 6, 10), 2026, 4);
    expect(ys.map((y) => y.year)).toEqual([2026, 2027, 2038, 2039]);
    expect(ys[0].branchName).toBe('午');
    expect(ys[1].branchName).toBe('未');
  });
});
