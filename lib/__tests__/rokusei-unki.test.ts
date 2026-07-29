import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import { runkiIndex, RUNKI_CYCLE, unmeisei, unmeiseiRunki, daisakkaiYears } from '../rokusei';

// 2026年（午年）の 6sei.net 公式ランキング全12星人±
// seijinIndex: 0=土,1=金,2=火,3=天王,4=木,5=水
const OFFICIAL_2026: [number, boolean, string][] = [
  [0, true, '再会'], [0, false, '乱気'],
  [1, true, '安定'], [1, false, '財成'],
  [2, true, '停止'], [2, false, '陰影'],
  [3, true, '種子'], [3, false, '減退'],
  [4, true, '立花'], [4, false, '緑生'],
  [5, true, '達成'], [5, false, '健弱'],
];
const YEAR_BRANCH_2026 = (2026 - 4) % 12; // 午=6

describe('六星占術の運気（6sei.net公式・2026年全12星人±と一致）', () => {
  it.each(OFFICIAL_2026)('星人%i %s → %s', (seijinIndex, plus, name) => {
    expect(RUNKI_CYCLE[runkiIndex(seijinIndex, plus, YEAR_BRANCH_2026)]).toBe(name);
  });

  it('2026年の大殺界は火星人+(停止)・火星人−(陰影)・天王星人−(減退)', () => {
    const daisakkai = OFFICIAL_2026.filter(
      ([i, p]) => runkiIndex(i, p, YEAR_BRANCH_2026) >= 9,
    ).map(([i, p]) => `${['土', '金', '火', '天王', '木', '水'][i]}星人${p ? '+' : '−'}`);
    expect(daisakkai.sort()).toEqual(['火星人+', '火星人−', '天王星人−'].sort());
  });
});

describe('生年月日からの運気・大殺界', () => {
  it('1985-08-15（火星人−）の2026は陰影＝大殺界', () => {
    const r = unmeiseiRunki(jstNoon(1985, 8, 15), 2026);
    expect(r.name).toBe('陰影');
    expect(r.daisakkai).toBe(true);
    expect(r.provenance.source).toContain('6sei.net');
  });

  it('火星人−の大殺界は 2026陰影・2027停止・2028減退', () => {
    expect(unmeiseiRunki(jstNoon(1985, 8, 15), 2027).name).toBe('停止');
    expect(unmeiseiRunki(jstNoon(1985, 8, 15), 2028).name).toBe('減退');
    const ys = daisakkaiYears(jstNoon(1985, 8, 15), 2026, 3);
    expect(ys.map((y) => y.year)).toEqual([2026, 2027, 2028]);
  });

  it('星人判定は既存 unmeisei と整合（火星人−）', () => {
    expect(unmeisei(jstNoon(1985, 8, 15)).label).toBe('火星人−');
  });
});

describe('立春前生まれの大殺界が1年ずれない（±の年境界＝立春）', () => {
  // ± は運気のオフセットを1変える（＋は空亡第1支+2 / −は+3）ため、
  // 暦年基準だと立春前生まれの運気サイクルが丸ごと1年ずれ、大殺界の3年もずれる。
  const b = jstNoon(1985, 1, 20); // 立春年1984（甲子＝陽支）→ 水星人＋

  it('1985-01-20（水星人＋）の大殺界は 2031陰影・2032停止・2033減退', () => {
    expect(unmeisei(b).label).toBe('水星人＋');
    const ys = daisakkaiYears(b, 2026, 3);
    expect(ys).toEqual([
      { year: 2031, name: '陰影' },
      { year: 2032, name: '停止' },
      { year: 2033, name: '減退' },
    ]);
  });

  it('大殺界の翌年(2034)は減退のままにならない＝終わっている', () => {
    expect(unmeiseiRunki(b, 2033).daisakkai).toBe(true);
    expect(unmeiseiRunki(b, 2034).daisakkai).toBe(false);
    expect(unmeiseiRunki(b, 2034).name).toBe('種子');
  });

  it('立春当日生まれ(1990-02-04＝天王星人＋)の大殺界は 2035〜2037', () => {
    const ys = daisakkaiYears(jstNoon(1990, 2, 4), 2026, 3);
    expect(ys.map((y) => y.year)).toEqual([2035, 2036, 2037]);
  });
});
