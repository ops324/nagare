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
  it('甲子の日(2026-12-16)は星数1＝土星人、立春年2026(午年)で＋', () => {
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

describe('六星占術：±の年境界は立春（1/1〜立春前は前年扱い）', () => {
  // 立春の両側で ± が切り替わること。1990年の立春は 2/4。
  // 2/3 と 2/4 はどちらも天王星人（星数36/37）なので、動くのは ± だけ。
  it('1990-02-03（立春前）は立春年1989（己巳＝陰支）で天王星人−', () => {
    const u = unmeisei(jstNoon(1990, 2, 3));
    expect(u.seijin).toBe('天王星人');
    expect(u.plus).toBe(false);
    expect(u.label).toBe('天王星人−');
  });
  it('1990-02-04（立春当日）は立春年1990（庚午＝陽支）で天王星人＋', () => {
    const u = unmeisei(jstNoon(1990, 2, 4));
    expect(u.seijin).toBe('天王星人');
    expect(u.plus).toBe(true);
    expect(u.label).toBe('天王星人＋');
  });
  it('1990-02-05（立春後）も天王星人＋のまま', () => {
    expect(unmeisei(jstNoon(1990, 2, 5)).label).toBe('天王星人＋');
  });

  // 暦年基準だと ± が反転してしまう実例（大殺界が1年ずれる原因）
  it('1985-01-20 は立春年1984（甲子＝陽支）で水星人＋（暦年基準では誤って−）', () => {
    const u = unmeisei(jstNoon(1985, 1, 20));
    expect(u.seisu).toBe(56);
    expect(u.seijin).toBe('水星人');
    expect(u.plus).toBe(true);
  });
  it('2000-01-10 は立春年1999（己卯＝陰支）で土星人−（暦年基準では誤って＋）', () => {
    const u = unmeisei(jstNoon(2000, 1, 10));
    expect(u.seijin).toBe('土星人');
    expect(u.plus).toBe(false);
  });

  // 非退行：立春後生まれは暦年＝立春年なので従来どおり
  it('立春後生まれ（8月・12月・3月）は暦年基準と同じ結果', () => {
    expect(unmeisei(jstNoon(1985, 8, 15)).label).toBe('火星人−');
    expect(unmeisei(jstNoon(2026, 12, 16)).plus).toBe(true);
    expect(unmeisei(jstNoon(2000, 3, 3)).plus).toBe(true);
  });
});
