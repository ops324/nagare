import { describe, expect, it } from 'vitest';
import { flowPath, swayOf, type PathArgs } from '@/components/FlowLine';

/**
 * 流れ線の**中心パス**の構造テスト。
 *
 * 描画そのもの（輪郭の起こし・マスク・箔足）は SVG の実測 API に依存するので
 * ここでは触らない。代わりに「どこを通るか」だけを純関数として切り出し、
 * docs/SPEC.md §7 の不変条件（振幅の px クランプ・決定論・退避）を固定する。
 *
 * 占術ロジック（lib/）には一切触れない。
 */

const base: PathArgs = { w: 375, h: 2400, startY: 0, amp: 0.45, seed: 2 };

/** パスの節（各ベジエの終点）の [x, y] を取り出す */
function nodes(d: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const m = /M\s*([\d.-]+)\s+([\d.-]+)/.exec(d);
  if (m) out.push([parseFloat(m[1]), parseFloat(m[2])]);
  for (const c of d.matchAll(/C[^C]*?,\s*[\d.-]+\s+[\d.-]+,\s*([\d.-]+)\s+([\d.-]+)/g)) {
    out.push([parseFloat(c[1]), parseFloat(c[2])]);
  }
  return out;
}

describe('振幅の px クランプ（SPEC §7 の不変条件）', () => {
  it('割合で決まる — モバイル幅では頭打ちにかからない', () => {
    // 375 × (0.13 + 0.17 × 0.45) = 77.4 …… 上限 190 には遠い
    expect(swayOf(375, 0.45)).toBeCloseTo(375 * (0.13 + 0.17 * 0.45), 6);
    expect(swayOf(375, 1)).toBeCloseTo(375 * 0.3, 6);
    expect(swayOf(375, 1)).toBeLessThan(190);
  });

  it('広い列では 190px で頭打ちになる（レールや右の「空」へはみ出さない）', () => {
    expect(swayOf(1040, 1)).toBe(190);
    expect(swayOf(1920, 1)).toBe(190);
  });

  it('amp は 0..1 に丸める（スコアが範囲外でも暴れない）', () => {
    expect(swayOf(375, -3)).toBeCloseTo(375 * 0.13, 6);
    expect(swayOf(375, 9)).toBeCloseTo(375 * 0.3, 6);
  });
});

describe('描かない条件（現行の見えを保つ）', () => {
  it('列が狭すぎる／短すぎるときは空文字（＝線を出さない）', () => {
    expect(flowPath({ ...base, w: 60 })).toBe('');
    expect(flowPath({ ...base, h: 300 })).toBe('');
    // 開始位置が下がると実効の高さも縮む
    expect(flowPath({ ...base, h: 800, startY: 500 })).toBe('');
  });
});

describe('決定論（同じ入力なら毎回同じ形）', () => {
  it('高さ刻みの経路が二度とも一致する', () => {
    expect(flowPath(base)).toBe(flowPath({ ...base }));
  });

  it('骨格に沿う経路も二度とも一致する', () => {
    const gaps = [420, 900, 1500, 2050];
    expect(flowPath({ ...base, gaps })).toBe(flowPath({ ...base, gaps }));
  });

  it('seed が変われば形も変わる（タブごとに別の川になる）', () => {
    expect(flowPath({ ...base, seed: 3 })).not.toBe(flowPath(base));
  });
});

describe('骨格に沿う経路（章と章のあいだで列を渡る）', () => {
  const gaps = [420, 900, 1500, 2050];

  it('節が2つ以上取れたら、その Y で列を渡る', () => {
    const ys = nodes(flowPath({ ...base, gaps })).map((n) => n[1]);
    // 渡る位置は必ず与えた余白の上にある（末尾の 1 本は中央へ収める区間）
    for (const g of gaps) expect(ys).toContain(g);
    expect(ys[ys.length - 1]).toBe(base.h);
  });

  it('節が足りなければ従来の高さ刻みへ退避する', () => {
    // 1 本だけ・端に寄りすぎ・startY より上 …… いずれも渡りには使えない
    expect(flowPath({ ...base, gaps: [900] })).toBe(flowPath(base));
    expect(flowPath({ ...base, gaps: [10, 2395] })).toBe(flowPath(base));
    expect(flowPath({ ...base, gaps: [] })).toBe(flowPath(base));
  });

  it('近すぎる節では渡らない（蛇行がジグザグに落ちない）', () => {
    // 40px 刻みの余白を大量に渡すと、間引かれて数本だけが渡りに使われる
    const dense = Array.from({ length: 40 }, (_, i) => 200 + i * 40);
    const ys = nodes(flowPath({ ...base, gaps: dense })).map((n) => n[1]);
    const crossings = ys.filter((y) => dense.includes(y));
    expect(crossings.length).toBeGreaterThanOrEqual(2);
    expect(crossings.length).toBeLessThanOrEqual(6);
    for (let i = 1; i < crossings.length; i++) {
      expect(crossings[i] - crossings[i - 1]).toBeGreaterThanOrEqual(336); // (2400-0) × 0.14
    }
  });

  it('渡る位置は左右交互で、振幅の頭打ちを超えない', () => {
    const ns = nodes(flowPath({ ...base, gaps }));
    const mid = base.w * 0.5;
    const sides = ns.slice(1, -1).map((n) => Math.sign(n[0] - mid));
    for (let i = 1; i < sides.length; i++) expect(sides[i]).not.toBe(sides[i - 1]);
    for (const n of ns) {
      expect(Math.abs(n[0] - mid)).toBeLessThanOrEqual(swayOf(base.w, base.amp) + 0.1);
    }
  });
});

describe('起点（ワードマークの直下から降ろす）', () => {
  const gaps = [420, 900, 1500, 2050];

  it('startX を渡すと最初の点だけが動く', () => {
    const withMark = nodes(flowPath({ ...base, gaps, startX: 44 }));
    const without = nodes(flowPath({ ...base, gaps }));
    expect(withMark[0]).toEqual([44, 0]);
    expect(without[0]).toEqual([base.w * 0.5, 0]);
    // 2点目以降は一致する＝起点の x だけを移す（y は現行のまま）
    expect(withMark.slice(1)).toEqual(without.slice(1));
  });

  it('startX が取れなくても（null）現行どおり列の中央から始まる', () => {
    expect(flowPath({ ...base, gaps, startX: null })).toBe(flowPath({ ...base, gaps }));
  });

  it('今日タブのように startY が下がっても、起点はその高さから始まる', () => {
    const ns = nodes(flowPath({ ...base, startY: 300, gaps, startX: 44 }));
    expect(ns[0]).toEqual([44, 300]);
  });
});
