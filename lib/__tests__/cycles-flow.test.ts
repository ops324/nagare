import { describe, it, expect } from 'vitest';
import { jstNoon, toJstParts } from '../time';
import { kazoedoshi, yakudoshi, biorhythm } from '../cycles';
import { buildProfile } from '../profile';
import { computeTodayFlow, computeMacroFlow, buildTurningPoints } from '../flow';
import { CAUTION_COPY } from '../copy';

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

// 「次の転機」なので今年は出さない。元の関数（nextHappou・tenchusatsuYears）は
// 今年を含む仕様のままにし、集約側で除外する。
describe('「次の転機」に今年を出さない', () => {
  const now = jstNoon(2026, 7, 13);

  it('すでに大殺界なら nextDaisakkai は次の「組」の頭（1985-08-15男は2038年の陰影）', () => {
    const p = buildProfile({ date: '1985-08-15', gender: '男' });
    const macro = computeMacroFlow(p, now);
    expect(macro.currentRunki.name).toBe('陰影');
    expect(macro.currentRunki.daisakkai).toBe(true);
    // 修正前は今年 2026 を「次の大殺界」として出していた。+1 だと今いる組の2年目 2027 になる。
    expect(macro.nextDaisakkai).toEqual({ year: 2038, name: '陰影' });
  });

  it('どの転機も今年（立春年）ではない', () => {
    for (const birth of ['1985-08-15', '1999-06-01', '1987-06-10']) {
      const macro = computeMacroFlow(buildProfile({ date: birth, gender: '男' }), now);
      for (const t of buildTurningPoints(macro)) {
        expect(t.year, `${birth}: ${t.title}`).not.toBe(macro.currentYear);
      }
    }
  });

  it('八方塞がりが今年でも nextHappou は今年のまま（テーマ用）／転機一覧には出さない', () => {
    const p = buildProfile({ date: '1999-06-01', gender: '女' });
    const macro = computeMacroFlow(p, now);
    expect(macro.nextHappou).toBe(2026); // 元の値は変えない
    expect(macro.current.happouFusagari).toBe(true);
    expect(buildTurningPoints(macro).find((t) => t.title === CAUTION_COPY.happou.title)).toBeUndefined();
  });

  it('年天中殺が今年でも一覧は今年を含み、転機は翌年から', () => {
    const p = buildProfile({ date: '1987-06-10', gender: '男' });
    const macro = computeMacroFlow(p, now);
    expect(macro.tenchusatsuYears[0].year).toBe(2026); // 巡り一覧は今年を含むのが正しい
    const item = buildTurningPoints(macro).find((t) => t.title.startsWith(CAUTION_COPY.tenchusatsu.title));
    expect(item?.year).toBe(2027);
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
