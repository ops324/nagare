'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * 流れ線 — 「星霜」の背骨。タブの全高を一本の金の線が節気色→金→節気色の
 * グラデで緩やかに蛇行しながら降りる。二層構成（design.md「和紙と金箔」）：
 *   fl-halo … 太めの輪郭を強くぼかした暈（かさ）。常に全長見えていて流路を予感させる
 *   fl-line … 可変幅の細い塗り。スクロールで下へ置かれてゆく
 *
 * **均一な stroke-width をやめ、可変幅の塗りにしている**のが要点。均一ストロークは
 * 「SVG のデフォルト」という機械臭そのもので、ここを直すと質が変わる。幅は書の
 * 入り・抜きに沿い、同じ mulberry32 シードによる低周波のゆらぎを乗せて
 * 「手で継いだ痕」を出す（決定論的なので描画は毎回同一）。
 *
 * 鋭い艶（specular）は置かない。最大 2.6px では潰れて安っぽくなるため、
 * 金属感はグラデ内の明るい帯だけで出す。
 *
 * 親（.shell = position:relative／デスクトップは .column）の全面に敷く装飾レイヤー。
 * 今日タブではフローメーターの下から始まり、ゲージに被らない。
 * amp（0..1・今日のスコア等）が蛇行の振幅を決める。reduced-motion では常に全描画。
 */

/** 暈の最大幅。ぼかして淡く敷くので線より太い */
const HALO_W = 6.2;
/** 金線の最大幅。細く、上品に */
const LINE_W = 2.6;
/** 輪郭のサンプル数。リサイズ時のみ走るので毎フレームの負荷にはならない */
const SAMPLES = 150;

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

/** 幅の包絡線 — 書の入り・抜き。上は素早く太り、下は長く抜ける */
function taper(t: number): number {
  const a = Math.min(t / 0.13, 1);
  const b = Math.min((1 - t) / 0.3, 1);
  return Math.pow(a, 0.65) * Math.pow(b, 1.15);
}

/** 低周波のゆらぎ＝箔を手で継いだ痕。同じ seed なら毎回同一の形になる */
function makeWobble(seed: number): (t: number) => number {
  const rnd = mulberry32(seed);
  const knots = Array.from({ length: 9 }, () => 0.7 + rnd() * 0.58);
  return (t) => {
    const x = t * (knots.length - 1);
    const i = Math.floor(x);
    const f = x - i;
    const a = knots[Math.min(i, knots.length - 1)];
    const b = knots[Math.min(i + 1, knots.length - 1)];
    const s = (1 - Math.cos(f * Math.PI)) / 2; // コサイン補間（角を作らない）
    return a + (b - a) * s;
  };
}

/**
 * 中心パスを実測し、幅関数に沿って左右へオフセットした閉じたポリゴンを作る。
 * SVG の stroke-width は経路上で変えられないので、塗りの形として描く。
 */
function ribbonPolygon(
  pathEl: SVGPathElement,
  wMax: number,
  wobble: (t: number) => number,
): string {
  const total = pathEl.getTotalLength();
  if (!total) return '';
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const at = t * total;
    const p = pathEl.getPointAtLength(at);
    const p0 = pathEl.getPointAtLength(Math.max(at - 1.5, 0));
    const p1 = pathEl.getPointAtLength(Math.min(at + 1.5, total));
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; // 法線
    const ny = dx / len;
    const w = (wMax * taper(t) * wobble(t)) / 2;
    left.push(`${(p.x + nx * w).toFixed(2)} ${(p.y + ny * w).toFixed(2)}`);
    right.push(`${(p.x - nx * w).toFixed(2)} ${(p.y - ny * w).toFixed(2)}`);
  }
  right.reverse();
  return `M${left.join('L')}L${right.join('L')}Z`;
}

export function FlowLine({ amp = 0.5, seed = 1 }: { amp?: number; seed?: number }) {
  const uid = useId();
  const gradId = `${uid}g`;
  const blurId = `${uid}b`;
  const maskId = `${uid}m`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<SVGPathElement>(null);
  const maskRef = useRef<SVGRectElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, startY: 0 });
  const [shapes, setShapes] = useState<{ halo: string; line: string } | null>(null);

  // 親の寸法と、フローメーター（あれば）の下端を追う
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const fm = el.parentElement?.querySelector('.flowmeter');
      let startY = 0;
      if (fm) {
        startY = Math.max(0, fm.getBoundingClientRect().bottom - rect.top + 20);
      }
      setSize({ w: el.clientWidth, h: el.clientHeight, startY });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // 蛇行パス（決定論的・広い間隔で優雅に。振幅は amp で伸縮し、始まりは静かに）
  const d = useMemo(() => {
    const { w, h, startY } = size;
    const span = h - startY;
    if (w < 80 || span < 420) return '';
    const rnd = mulberry32(seed * 7919 + 11);
    const step = Math.max(400, Math.min(580, span / 6));
    // 振幅を割合だけで決めると、広い列（[data-wide] の 1040px 列など）で
    // ±300px を超えて暴れ、レールや右の「空」へはみ出す。px で頭打ちにする。
    // 上限 190px は現行の実効最大（780px 列 × 0.30 = 234）より内側だが、
    // モバイル（375px 幅 → 最大 112px）には一切かからないので現行の見えは不変。
    const sway = Math.min(w * (0.13 + 0.17 * Math.min(Math.max(amp, 0), 1)), 190);
    let dir = rnd() > 0.5 ? 1 : -1;
    let x = w * 0.5;
    let prevY = startY;
    let path = `M ${x.toFixed(1)} ${startY.toFixed(1)}`;
    for (let y = startY + step; y < h + step; y += step) {
      const yy = Math.min(y, h);
      const ease = Math.min((yy - startY) / (step * 1.6), 1); // 出だしは振幅を抑える
      const nx = w * 0.5 + dir * sway * ease * (0.62 + rnd() * 0.38);
      const my = ((prevY + yy) / 2).toFixed(1);
      path += ` C ${x.toFixed(1)} ${my}, ${nx.toFixed(1)} ${my}, ${nx.toFixed(1)} ${yy.toFixed(1)}`;
      x = nx;
      prevY = yy;
      dir = -dir;
    }
    return path;
  }, [size, amp, seed]);

  // 中心パスが DOM に載ってから輪郭を起こす（getTotalLength はレイアウトを要する）
  useLayoutEffect(() => {
    const base = baseRef.current;
    if (!base || !d) {
      setShapes(null);
      return;
    }
    const wobble = makeWobble(seed * 104729 + 7);
    const halo = ribbonPolygon(base, HALO_W, wobble);
    const line = ribbonPolygon(base, LINE_W, wobble);
    setShapes(halo && line ? { halo, line } : null);
  }, [d, seed]);

  // スクロールで金線が置かれてゆく（下へ伸びるマスク・rAF・reduced-motion は全描画）
  useEffect(() => {
    const wrap = wrapRef.current;
    const rect = maskRef.current;
    if (!wrap || !rect || !shapes) return;
    const full = size.h;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rect.setAttribute('height', String(full));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const prog = Math.min(Math.max((window.innerHeight - r.top) / r.height, 0), 1);
      rect.setAttribute('height', String(full * prog));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [shapes, size.h]);

  return (
    <div ref={wrapRef} className="flowline" aria-hidden="true">
      {d && (
        <svg>
          <defs>
            {/* CSS 変数は <stop> の属性形式では解決されないので style で書く */}
            <linearGradient
              id={gradId}
              x1="0"
              y1={size.startY}
              x2="0"
              y2={size.h}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" style={{ stopColor: 'var(--sekki)', stopOpacity: 0 }} />
              <stop offset="0.07" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.45 }} />
              <stop offset="0.28" style={{ stopColor: 'var(--gold-500)', stopOpacity: 0.78 }} />
              <stop offset="0.5" style={{ stopColor: 'var(--gold-300)', stopOpacity: 0.88 }} />
              <stop offset="0.63" style={{ stopColor: 'var(--gold-100)', stopOpacity: 0.92 }} />
              <stop offset="0.8" style={{ stopColor: 'var(--gold-400)', stopOpacity: 0.74 }} />
              <stop offset="0.94" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.42 }} />
              <stop offset="1" style={{ stopColor: 'var(--sekki)', stopOpacity: 0 }} />
            </linearGradient>
            <filter id={blurId} x="-60%" y="-6%" width="220%" height="112%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <mask id={maskId}>
              <rect ref={maskRef} x="0" y="0" width={size.w} height="0" fill="#fff" />
            </mask>
          </defs>
          {/* 計測用の中心線。描画はしない */}
          <path ref={baseRef} className="fl-base" d={d} fill="none" stroke="none" />
          {shapes && (
            <>
              {/* 暈 — 常に全長。金が置かれる前から流路を予感させる */}
              <path
                className="fl-halo"
                d={shapes.halo}
                fill={`url(#${gradId})`}
                filter={`url(#${blurId})`}
              />
              {/* 金線 — スクロールで置かれてゆく */}
              <g mask={`url(#${maskId})`}>
                <path className="fl-line" d={shapes.line} fill={`url(#${gradId})`} />
              </g>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
