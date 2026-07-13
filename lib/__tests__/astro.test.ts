import { describe, it, expect } from 'vitest';
import { jstNoon, toJstParts, addDays } from '../time';
import { sunSign, moonState, isMercuryRetrograde, planetRetrogrades, mercuryRetrogradeEnd } from '../astro';

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
  it('水星は2026年に逆行日と順行日の両方をもつ（地心計算の妥当性）', () => {
    let retro = 0;
    for (let doy = 0; doy < 365; doy += 1) {
      const d = new Date(jstNoon(2026, 1, 1).getTime() + doy * 86400000);
      if (isMercuryRetrograde(d)) retro++;
    }
    // 水星の逆行は年に約3回×3週間 ≒ 60日前後
    expect(retro).toBeGreaterThan(40);
    expect(retro).toBeLessThan(90);
  });
});

describe('逆行の終了日（留）', () => {
  it('2026 夏の水星逆行は 2026-07-24 ごろ順行に戻る', () => {
    const now = jstNoon(2026, 7, 12); // 逆行のさなか
    expect(isMercuryRetrograde(now)).toBe(true);
    const end = mercuryRetrogradeEnd(now);
    const p = toJstParts(end);
    expect(p.year).toBe(2026);
    expect(p.month).toBe(7);
    expect(p.day).toBe(24); // 天体暦の順行転換（2026-07-23〜24）と一致
    expect(end.getTime()).toBeGreaterThan(now.getTime());
  });

  it('留の前日は逆行・翌日は順行（境界の自己整合）', () => {
    const end = mercuryRetrogradeEnd(jstNoon(2026, 7, 12));
    expect(isMercuryRetrograde(addDays(end, -1))).toBe(true);
    expect(isMercuryRetrograde(addDays(end, 1))).toBe(false);
  });

  it('planetRetrogrades は逆行中に endsAt(Date)、順行は null', () => {
    const now = jstNoon(2026, 7, 12);
    const list = planetRetrogrades(now);
    for (const r of list) {
      if (r.retrograde) {
        expect(r.endsAt).toBeInstanceOf(Date);
        expect(r.endsAt!.getTime()).toBeGreaterThan(now.getTime());
      } else {
        expect(r.endsAt).toBeNull();
      }
    }
    expect(list.find((r) => r.name === '水星')?.retrograde).toBe(true);
  });
});
