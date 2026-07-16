'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * 流れ線 — 「星霜」の背骨。タブの全高を一本の線が節気色→金→節気色の
 * グラデで蛇行しながら降り、スクロールに合わせて描かれる。
 * 親（.shell = position:relative）の全面に敷く装飾レイヤー。
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
  const gradId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // 親の寸法を追う
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 蛇行パス（決定論的・振幅は amp で伸縮）
  const d = useMemo(() => {
    const { w, h } = size;
    if (w < 80 || h < 300) return '';
    const rnd = mulberry32(seed * 7919 + 11);
    const step = 260;
    const sway = w * (0.16 + 0.2 * Math.min(Math.max(amp, 0), 1));
    let dir = rnd() > 0.5 ? 1 : -1;
    let x = w * 0.5;
    let path = `M ${x.toFixed(1)} 0`;
    for (let y = step; y < h + step; y += step) {
      const yy = Math.min(y, h);
      const nx = w * 0.5 + dir * sway * (0.55 + rnd() * 0.45);
      path += ` C ${x.toFixed(1)} ${(yy - step / 2).toFixed(1)}, ${nx.toFixed(1)} ${(yy - step / 2).toFixed(1)}, ${nx.toFixed(1)} ${yy.toFixed(1)}`;
      x = nx;
      dir = -dir;
    }
    return path;
  }, [size, amp, seed]);

  // スクロールで描く（stroke-dashoffset・rAF・reduced-motion は全描画）
  useEffect(() => {
    const path = pathRef.current;
    const wrap = wrapRef.current;
    if (!path || !wrap || !d) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      path.style.strokeDashoffset = '0';
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const p = Math.min(Math.max((window.innerHeight - rect.top) / rect.height, 0), 1);
      path.style.strokeDashoffset = `${len * (1 - p)}`;
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
              <stop offset="0" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.55 }} />
              <stop offset="0.5" style={{ stopColor: 'var(--gold-400)', stopOpacity: 0.6 }} />
              <stop offset="1" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.45 }} />
            </linearGradient>
          </defs>
          <path ref={pathRef} d={d} stroke={`url(#${gradId})`} strokeWidth={2} />
        </svg>
      )}
    </div>
  );
}
