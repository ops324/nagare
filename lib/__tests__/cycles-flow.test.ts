import { describe, it, expect } from 'vitest';
import { jstNoon } from '../time';
import { kazoedoshi, yakudoshi, biorhythm } from '../cycles';
import { buildProfile } from '../profile';
import { computeTodayFlow, computeMacroFlow } from '../flow';

describe('数え年・厄年', () => {
  it('2000-05-01 生まれの 2026 の数え年は 27', () => {
    expect(kazoedoshi(jstNoon(2000, 5, 1), 2026)).toBe(27);
  });

  it('男性・数え42（1985生）は大厄', () => {
    expect(yakudoshi(jstNoon(1985, 5, 1), '男', 2026).kind).toBe('大厄');
  });
  it('男性・数え41（1986生）は前厄、数え43（1984生）は後厄', () => {
    expect(yakudoshi(jstNoon(1986, 5, 1), '男', 2026).kind).toBe('前厄');
    expect(yakudoshi(jstNoon(1984, 5, 1), '男', 2026).kind).toBe('後厄');
  });
  it('女性・数え33（1994生）は大厄', () => {
    expect(yakudoshi(jstNoon(1994, 5, 1), '女', 2026).kind).toBe('大厄');
  });
});

describe('バイオリズム', () => {
  it('誕生日当日は 3 リズムとも 0', () => {
    const b = jstNoon(2000, 5, 1);
    const r = biorhythm(b, b);
    expect(Math.abs(r.physical)).toBeLessThan(1e-9);
    expect(Math.abs(r.emotional)).toBeLessThan(1e-9);
    expect(Math.abs(r.intellectual)).toBeLessThan(1e-9);
  });
  it('値は -1..1 の範囲', () => {
    const r = biorhythm(jstNoon(1990, 3, 3), jstNoon(2026, 7, 13));
    for (const v of [r.physical, r.emotional, r.intellectual]) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('profile', () => {
  it('1995-06-01 女性 → 五黄土星・双子座・乙亥年', () => {
    const p = buildProfile({ date: '1995-06-01', gender: '女' });
    expect(p.honmei.name).toBe('五黄土星');
    expect(p.sun.sign.name).toBe('双子座');
    expect(p.yearKanshi.name).toBe('乙亥');
  });
});

describe('今日の流れ', () => {
  const profile = buildProfile({ date: '1990-03-03', gender: '男' });
  const flow = computeTodayFlow(profile, jstNoon(2026, 3, 5));

  it('スコアは 0..100、ラベルあり', () => {
    expect(flow.score).toBeGreaterThanOrEqual(0);
    expect(flow.score).toBeLessThanOrEqual(100);
    expect(flow.label.length).toBeGreaterThan(0);
  });
  it('2026-03-05 は六曜=大安、選日に天赦日を含む', () => {
    expect(flow.data.rokuyo.name).toBe('大安');
    expect(flow.data.senjitsu.map((s) => s.name)).toContain('天赦日');
  });
  it('ハイライトが 1 件以上', () => {
    expect(flow.highlights.length).toBeGreaterThan(0);
  });
});

describe('大きな流れ', () => {
  it('一白水星(1999生)は 2026 が八方塞がり、タイムラインは 10 年分', () => {
    const p = buildProfile({ date: '1999-06-01', gender: '女' });
    const macro = computeMacroFlow(p, jstNoon(2026, 7, 13));
    expect(macro.current.happouFusagari).toBe(true);
    expect(macro.nextHappou).toBe(2026);
    expect(macro.timeline).toHaveLength(10);
    expect(macro.timeline.find((t) => t.isNow)?.year).toBe(2026);
    expect(macro.theme.length).toBeGreaterThan(0);
  });
});
