import { describe, it, expect } from 'vitest';
import { Body, EclipticLongitude } from 'astronomy-engine';
import { jstNoon, norm360, angleDelta } from '../time';
import { planetReturns, majorTransits, tenchusatsuYears, nextHelioReturn } from '../transits';

const helioLon = (body: Body, t: Date) => norm360(EclipticLongitude(body, t));

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

// 本番の computeMacroFlow は majorTransits(birth, now, …) と「部分弧」で呼ぶ。
// このとき平均周期の見積もりは中心差で最大 ~190日(土星)ずれるため、
// かつての est±45日 の二分探索は根を挟めず「est+45日」を黙って返していた。
describe('回帰の解の精度（部分弧・after=now）', () => {
  const after = jstNoon(2026, 7, 31);
  const BODIES: [string, Body][] = [
    ['Saturn', Body.Saturn],
    ['Jupiter', Body.Jupiter],
  ];

  it('返された時刻で黄経が出生時に戻っている（残差 < 0.01°）', () => {
    // これが本命のガード。数値を固定しないので流派・暦の更新で腐らない。
    // 修正前の最悪残差は 11.156°。
    for (const [name, body] of BODIES) {
      for (let y = 1950; y <= 2000; y += 5) {
        const natal = helioLon(body, jstNoon(y, 5, 15));
        const t = nextHelioReturn(body, natal, after);
        const resid = Math.abs(angleDelta(natal, helioLon(body, t)));
        expect(resid, `${name} ${y}`).toBeLessThan(0.01);
      }
    }
  });

  it('回帰は必ず after より後', () => {
    for (const [name, body] of BODIES) {
      for (let y = 1950; y <= 2000; y += 5) {
        const natal = helioLon(body, jstNoon(y, 5, 15));
        expect(nextHelioReturn(body, natal, after).getTime(), `${name} ${y}`).toBeGreaterThan(
          after.getTime(),
        );
      }
    }
  });

  it('連続する回帰の間隔は公転周期 ±10%', () => {
    for (const [body, period] of [
      [Body.Saturn, 10759.22],
      [Body.Jupiter, 4332.59],
    ] as const) {
      const rs = planetReturns(body, jstNoon(1990, 1, 1), after, 3);
      expect(rs).toHaveLength(3);
      for (let i = 1; i < rs.length; i++) {
        // planetReturns は year しか返さないので、間隔は年差で見る
        const gap = rs[i].year - rs[i - 1].year;
        expect(gap).toBeGreaterThanOrEqual(Math.floor((period / 365.25) * 0.9));
        expect(gap).toBeLessThanOrEqual(Math.ceil((period / 365.25) * 1.1));
      }
    }
  });

  it('1980-05-15生のサターンリターンは 2039（修正前は暦年ごと誤って 2040）', () => {
    const t = majorTransits(jstNoon(1980, 5, 15), after, 2045).filter(
      (e) => e.body === 'Saturn',
    )[0];
    expect(t.year).toBe(2039);
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
