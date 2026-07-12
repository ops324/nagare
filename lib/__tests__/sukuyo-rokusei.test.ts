import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import { honmeishuku, shukuOf, SHUKU27 } from '../sukuyo';
import { unmeisei } from '../rokusei';

describe('宿曜：本命宿（旧暦＋朔日宿方式）', () => {
  it('27宿がそろう', () => {
    expect(SHUKU27).toHaveLength(27);
  });
  it('1986-10-19（旧暦9月16日）は畢宿', () => {
    expect(honmeishuku(jstNoon(1986, 10, 19)).name).toBe('畢');
  });
  it('旧暦の朔日は朔日宿：2026-02-17（旧暦1月1日）は室宿', () => {
    expect(shukuOf(jstNoon(2026, 2, 17)).name).toBe('室');
  });
});

describe('六星占術：運命星（星人±）', () => {
  it('1985-08-15 は火星人−（星数23）', () => {
    const u = unmeisei(jstNoon(1985, 8, 15));
    expect(u.seisu).toBe(23);
    expect(u.seijin).toBe('火星人');
    expect(u.label).toBe('火星人−');
  });
  it('甲子の日(2026-12-16)は星数1＝土星人、暦年2026(午年)で＋', () => {
    const u = unmeisei(jstNoon(2026, 12, 16));
    expect(u.seisu).toBe(1);
    expect(u.seijin).toBe('土星人');
    expect(u.plus).toBe(true);
  });
  it('星数は 1〜60 の範囲', () => {
    const u = unmeisei(jstNoon(2000, 3, 3));
    expect(u.seisu).toBeGreaterThanOrEqual(1);
    expect(u.seisu).toBeLessThanOrEqual(60);
  });
});
