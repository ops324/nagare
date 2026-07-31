import { describe, it, expect } from 'vitest';
import { jstNoon, toJstParts } from '../time';
import { kazoedoshi, yakudoshi, upcomingYakudoshi, biorhythm } from '../cycles';
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

// 厄年は男女で年が異なる（男 25/42/61・女 19/33/37/61）。
// 未回答を男性表へ倒すと、女性には偽陰性・男性でない人には偽陽性を断言することになる。
describe('性別未回答の厄年は判定を保留する', () => {
  it('男女で答えが割れる実例（数え19と数え25）', () => {
    // 数え19 は女性だけが本厄
    expect(yakudoshi(jstNoon(2008, 5, 1), '女', 2026).kind).toBe('本厄');
    expect(yakudoshi(jstNoon(2008, 5, 1), '男', 2026).kind).toBeNull();
    // 数え25 は男性だけが本厄
    expect(yakudoshi(jstNoon(2002, 5, 1), '男', 2026).kind).toBe('本厄');
    expect(yakudoshi(jstNoon(2002, 5, 1), '女', 2026).kind).toBeNull();
  });

  it('未回答なら kind=null・genderKnown=false・数え年は返す', () => {
    for (const [birth, kazoe] of [
      ['2008-05-01', 19], // 修正前は「今年は節目の年ではありません」と断言（偽陰性）
      ['2002-05-01', 25], // 修正前は男性表で「本厄」（偽陽性）
    ] as const) {
      const r = yakudoshi(jstNoon(...(birth.split('-').map(Number) as [number, number, number])), '未回答', 2026);
      expect(r).toMatchObject({ kazoe, kind: null, isYakudoshi: false, genderKnown: false });
      expect(r.note).not.toBe('今年は節目の年ではありません。');
    }
  });

  it('性別ありなら genderKnown=true', () => {
    expect(yakudoshi(jstNoon(2008, 5, 1), '女', 2026).genderKnown).toBe(true);
  });

  it('未回答でも今日タブと大きな流れは一致し、年表・次の転機に厄年が出ない', () => {
    const p = buildProfile({ date: '2002-05-01' }); // gender 未指定 → '未回答'
    const now = jstNoon(2026, 7, 13);
    const macro = computeMacroFlow(p, now);
    expect(macro.currentYakudoshi.genderKnown).toBe(false);
    expect(macro.currentYakudoshi).toEqual(computeTodayFlow(p, now).data.yakudoshi); // §5 のタブ間一致
    expect(macro.nextYakudoshi).toBeNull(); // 「次の転機」に厄年が出ない
    for (const t of macro.timeline) expect(t.yakudoshiKind).toBeNull();
  });

  it('upcomingYakudoshi は性別未回答なら空', () => {
    expect(upcomingYakudoshi(jstNoon(2002, 5, 1), '未回答', 2026)).toEqual([]);
    expect(upcomingYakudoshi(jstNoon(2002, 5, 1), '男', 2026).length).toBeGreaterThan(0);
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

  it('currentPhasePeriod は立春(2月)始まり・約1年・start<now<end', () => {
    const p = buildProfile({ date: '1999-06-01', gender: '女' });
    const now = jstNoon(2026, 7, 13);
    const macro = computeMacroFlow(p, now);
    const { start, end } = macro.currentPhasePeriod;
    expect(toJstParts(start).month).toBe(2); // 立春は2月
    expect(toJstParts(start).year).toBe(2026);
    expect(toJstParts(end).year).toBe(2027);
    expect(start.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime()).toBeLessThan(end.getTime());
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThan(370);
  });
});

describe('厄年の年基準（元日）と九星の年基準（立春）の食い違い', () => {
  // 立春2026 = 2026-02-04(JST) なので、1/15 は九星では 2025年・厄年では 2026年。
  const now = jstNoon(2026, 1, 15);

  it('1985生・男：今日タブと大きな流れが同じ厄年（大厄）を出す', () => {
    const p = buildProfile({ date: '1985-05-01', gender: '男' });
    const macro = computeMacroFlow(p, now);
    expect(macro.currentYear).toBe(2025); // 立春基準
    expect(macro.gregorianYear).toBe(2026); // 元日基準
    expect(macro.currentYakudoshi.kind).toBe('大厄');
    expect(macro.currentYakudoshi).toEqual(computeTodayFlow(p, now).data.yakudoshi);
  });

  it('1985生・男：今年が厄年なら「次の転機」は翌年以降（今を次として出さない）', () => {
    const p = buildProfile({ date: '1985-05-01', gender: '男' });
    const macro = computeMacroFlow(p, now);
    expect(macro.nextYakudoshi?.year).toBe(2027);
    expect(macro.nextYakudoshi?.kind).toBe('後厄');
  });

  it('1985生・男：「今」ノードは立春年2025、暦年の今は2026ノード', () => {
    const p = buildProfile({ date: '1985-05-01', gender: '男' });
    const macro = computeMacroFlow(p, now);
    const y2025 = macro.timeline.find((t) => t.year === 2025)!;
    const y2026 = macro.timeline.find((t) => t.year === 2026)!;
    expect(y2025.isNow).toBe(true);
    expect(y2025.isCurrentGregorian).toBe(false);
    expect(y2025.yakudoshiKind).toBe('前厄');
    expect(y2026.isNow).toBe(false);
    expect(y2026.isCurrentGregorian).toBe(true);
    expect(y2026.yakudoshiKind).toBe('大厄');
  });

  it('1984生・男：「今」ノードに⚠大厄が乗っても、今年の厄年は後厄で今日タブと一致', () => {
    const p = buildProfile({ date: '1984-05-01', gender: '男' });
    const macro = computeMacroFlow(p, now);
    expect(macro.currentYakudoshi.kind).toBe('後厄');
    expect(macro.currentYakudoshi).toEqual(computeTodayFlow(p, now).data.yakudoshi);
    expect(macro.timeline.find((t) => t.isNow)?.yakudoshiKind).toBe('大厄'); // 2025年の厄年
  });

  it('立春後（7/13）は両基準が一致し、全ノードで isNow === isCurrentGregorian', () => {
    const p = buildProfile({ date: '1985-05-01', gender: '男' });
    const macro = computeMacroFlow(p, jstNoon(2026, 7, 13));
    expect(macro.currentYear).toBe(macro.gregorianYear);
    for (const t of macro.timeline) expect(t.isCurrentGregorian).toBe(t.isNow);
  });
});
