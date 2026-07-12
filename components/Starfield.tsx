/** 背景のかすかな星（決定論的配置＝ハイドレーション不一致なし） */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Starfield({ count = 74 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    x: rnd(i + 1) * 100,
    y: rnd(i + 7) * 100,
    r: 0.4 + rnd(i + 13) * 1.5,
    delay: rnd(i + 19) * 6,
    dur: 3 + rnd(i + 23) * 5,
    op: 0.25 + rnd(i + 29) * 0.55,
    gold: rnd(i + 31) > 0.82,
  }));
  return (
    <svg
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r * 0.12}
          fill={s.gold ? 'var(--gold-300)' : '#dfe7f5'}
          opacity={s.op}
          style={{ animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite` }}
        />
      ))}
    </svg>
  );
}
