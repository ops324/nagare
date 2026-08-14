'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { skyStateOf, type SkyKey } from './skyState';
import { MoonGlyph } from './MoonGlyph';

/**
 * 星図（今日の空）— 全タブの背後に敷く背景レイヤー。
 * 実際の月相・逆行惑星を夜空に描き、html[data-sky] を実時刻で更新する。
 * 装飾専用（aria-hidden・pointer-events なし）。星の配置は決定論的。
 */

const PLANET_GLYPH: Record<string, string> = {
  水星: '☿',
  金星: '♀',
  火星: '♂',
  木星: '♃',
  土星: '♄',
};

/** 乱数（seed 固定・描画のたびに星が動かないように） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number; // %
  y: number; // %
  r: number; // px
  bright: boolean;
  delay: number; // s
  dur: number; // s
}

/** モバイルの星数。**この 72 個は先頭から一切動かさない**（下記 STARS の性質） */
const BASE_STARS = 72;

/**
 * 星の配置は決定論的（seed 固定）。mulberry32 は逐次生成なので、
 * 長さを 72→160 に伸ばしても**先頭 72 個の値は完全に同一**になる。
 * よって `slice(0, count)` するだけで、モバイルは現行とピクセル一致のまま
 * 広い画面だけ密度を足せる（SPEC §7「決定論的配置」も保たれる）。
 */
const STARS: Star[] = (() => {
  const rnd = mulberry32(20260716);
  return Array.from({ length: 160 }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    r: 0.6 + rnd() * 1.1,
    bright: rnd() > 0.72,
    delay: rnd() * 4,
    dur: 2.6 + rnd() * 2.8,
  }));
})();

/** 画面幅に応じた星数。SSR と初回描画は必ず BASE_STARS（ハイドレーション不一致回避） */
function useStarCount(): number {
  const [count, setCount] = useState(BASE_STARS);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const ultra = window.matchMedia('(min-width: 1440px)');
    const apply = () => setCount(ultra.matches ? 160 : wide.matches ? 110 : BASE_STARS);
    apply();
    wide.addEventListener('change', apply);
    ultra.addEventListener('change', apply);
    return () => {
      wide.removeEventListener('change', apply);
      ultra.removeEventListener('change', apply);
    };
  }, []);
  return count;
}

/** data-theme の上書き（dark→夜 / light→昼）を織り込んだ現在の空 */
function resolveSky(now: Date): SkyKey {
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark') return 'night';
  if (theme === 'light') return 'day';
  return skyStateOf(now);
}

export function SkyField({
  moonPhaseAngle,
  retrogrades = [],
}: {
  /** 未指定なら月は描かない（プロフィール未登録の画面など） */
  moonPhaseAngle?: number;
  retrogrades?: { name: string }[];
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const starCount = useStarCount();

  // 実時刻 → html[data-sky]（分単位で再評価・タブ復帰時も）
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-sky', resolveSky(new Date()));
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    document.addEventListener('visibilitychange', apply);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', apply);
    };
  }, []);

  /**
   * 視差 — 星はゆっくり、スクロールと逆へ（transform のみ・reduced-motion で無効）。
   *
   * **動かせるのは「逃げ」の分だけ**。星図は視野の上下へ 6% ずつしか伸びていない
   * （`.skyfield-drift` の inset: -6%）ので、`scrollY * 0.05` のように送った量へ
   * 直に比例させると、少し下るだけで逃げを使い切り、**下端に星の無い帯**が残る。
   * 実測：デスクトップ 1280×720 の今日タブ（全高 3045px）で末尾 73px が空。
   * モバイルの暦タブのように本文が長いほど広がる（3〜4倍）。
   *
   * 直し方は倍率を下げることではなく、**尺度をページの進度へ移すこと**。
   * 進度 0→1 に逃げ 0→max を配分すれば、本文がどれだけ長くても端は空かず、
   * 短いタブでは視差がゆっくりになる（＝本文が短い日は空も静か、で理屈も合う）。
   *
   * 進度の分母（送れる総量）は本文の高さで変わるので、タブの切替や折返しの
   * 変化を ResizeObserver で拾って測り直す。毎フレームは読まない
   * （送りのたびにレイアウトを起こすのは、この製品で最も避けたい負荷）。
   */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = innerRef.current;
    if (!el) return;

    let max = 0; // 逃げの実寸（px）
    let range = 0; // 送れる総量（px）
    const measure = () => {
      max = window.innerHeight * 0.06;
      range = document.documentElement.scrollHeight - window.innerHeight;
      apply();
    };

    let raf = 0;
    const apply = () => {
      const prog = range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 0;
      el.style.transform = `translateY(${(-max * prog).toFixed(2)}px)`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    // observe した時点で一度発火するので、初回計測もここを通る
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const retro = useMemo(
    () => retrogrades.filter((r) => PLANET_GLYPH[r.name]).slice(0, 3),
    [retrogrades],
  );

  return (
    <div className="skyfield" aria-hidden="true">
      <div ref={innerRef} className="skyfield-drift">
        <svg className="sf-stars">
          {STARS.slice(0, starCount).map((s, i) => (
            <circle
              key={i}
              className="sf-star"
              cx={`${s.x}%`}
              cy={`${s.y}%`}
              r={s.r}
              fill={s.bright ? 'var(--star-bright)' : 'var(--star-dim)'}
              style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
            />
          ))}
        </svg>
        {moonPhaseAngle !== undefined && (
          <div className="sf-moon">
            <MoonGlyph phaseAngle={moonPhaseAngle} size={54} />
          </div>
        )}
        {retro.map((r, i) => (
          <span
            key={r.name}
            className="sf-retro"
            style={{ left: `${9 + i * 13}%`, top: `${20 + i * 11}%`, animationDelay: `${i * 3}s` }}
          >
            {PLANET_GLYPH[r.name]}
            <small>{r.name}逆行</small>
          </span>
        ))}
      </div>
    </div>
  );
}
