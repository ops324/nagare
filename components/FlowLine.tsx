'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * 流れ線 — 「星霜」の背骨。タブの全高を一本の光の川が節気色→金→節気色の
 * グラデで緩やかに蛇行しながら降りる。3層構成：
 *   fl-glow   … ぼかした淡い川筋（常に全描画・流路の予感）
 *   fl-ribbon … 帯（スクロールで描かれる）
 *   fl-core   … 輝く芯（スクロールで描かれる）
 * 親（.shell = position:relative）の全面に敷く装飾レイヤー。
 * 今日タブではフローメーターの下から始まり、ゲージに被らない。
 * amp（0..1・今日のスコア等）が蛇行の振幅を決める。reduced-motion では常に全描画。
 */

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

export function FlowLine({ amp = 0.5, seed = 1 }: { amp?: number; seed?: number }) {
  const uid = useId();
  const gradId = `${uid}g`;
  const blurId = `${uid}b`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<SVGPathElement>(null);
  const coreRef = useRef<SVGPathElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, startY: 0 });

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
    const sway = w * (0.13 + 0.17 * Math.min(Math.max(amp, 0), 1));
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

  // スクロールで帯と芯を描く（stroke-dashoffset・rAF・reduced-motion は全描画）
  useEffect(() => {
    const wrap = wrapRef.current;
    const paths = [ribbonRef.current, coreRef.current].filter(
      (p): p is SVGPathElement => p !== null,
    );
    if (!wrap || paths.length === 0 || !d) return;
    const len = paths[0].getTotalLength();
    for (const p of paths) p.style.strokeDasharray = `${len}`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const p of paths) p.style.strokeDashoffset = '0';
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const prog = Math.min(Math.max((window.innerHeight - rect.top) / rect.height, 0), 1);
      const offset = `${len * (1 - prog)}`;
      for (const p of paths) p.style.strokeDashoffset = offset;
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
  }, [d]);

  return (
    <div ref={wrapRef} className="flowline" aria-hidden="true">
      {d && (
        <svg>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--sekki)', stopOpacity: 0 }} />
              <stop offset="0.07" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.55 }} />
              <stop offset="0.5" style={{ stopColor: 'var(--gold-400)', stopOpacity: 0.65 }} />
              <stop offset="0.93" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.5 }} />
              <stop offset="1" style={{ stopColor: 'var(--sekki)', stopOpacity: 0 }} />
            </linearGradient>
            <filter id={blurId} x="-80%" y="-8%" width="260%" height="116%">
              <feGaussianBlur stdDeviation="5.5" />
            </filter>
          </defs>
          <path className="fl-glow" d={d} stroke={`url(#${gradId})`} filter={`url(#${blurId})`} />
          <path ref={ribbonRef} className="fl-ribbon" d={d} stroke={`url(#${gradId})`} />
          <path ref={coreRef} className="fl-core" d={d} stroke={`url(#${gradId})`} />
        </svg>
      )}
    </div>
  );
}
