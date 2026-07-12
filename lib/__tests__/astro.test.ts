import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import { sunSign, moonState, isMercuryRetrograde, planetRetrogrades } from '../astro';

describe('太陽星座（トロピカル）', () => {
  it.each([
    [1990, 8, 15, '獅子座'],
    [2000, 3, 25, '牡羊座'],
    [1995, 6, 1, '双子座'],
    [1988, 11, 10, '蠍座'],
  ])('%i-%i-%i → %s', (y, m, day, sign) => {
    expect(sunSign(jstNoon(y, m, day)).sign.name).toBe(sign);
  });

  it('2026-07-13 の太陽星座は蟹座', () => {
    expect(sunSign(jstNoon(2026, 7, 13)).sign.name).toBe('蟹座');
  });
});

describe('月の状態', () => {
  const m = moonState(jstNoon(2026, 7, 13));
  it('輝面比は 0..1', () => {
    expect(m.illumination).toBeGreaterThanOrEqual(0);
    expect(m.illumination).toBeLessThanOrEqual(1);
  });
  it('月齢は 0..30', () => {
    expect(m.age).toBeGreaterThanOrEqual(0);
    expect(m.age).toBeLessThanOrEqual(30);
  });
  it('月相 index は 0..7', () => {
    expect(m.phaseIndex).toBeGreaterThanOrEqual(0);
    expect(m.phaseIndex).toBeLessThanOrEqual(7);
  });
});

describe('惑星の逆行', () => {
  it('水星逆行判定は boolean を返す', () => {
    expect(typeof isMercuryRetrograde(jstNoon(2026, 7, 13))).toBe('boolean');
  });
  it('主要5惑星の状態が並ぶ', () => {
    expect(planetRetrogrades(jstNoon(2026, 7, 13))).toHaveLength(5);
  });
});
