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
