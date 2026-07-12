/**
 * 実際の月相を描く SVG グリフ。
 * phaseAngle: 0=新月, 90=上弦, 180=満月, 270=下弦
 */
export function MoonGlyph({ phaseAngle, size = 96 }: { phaseAngle: number; size?: number }) {
  const r = 100;
  const theta = (phaseAngle * Math.PI) / 180;
  const cos = Math.cos(theta);
  const rx = Math.abs(cos) * r;
  const waxing = phaseAngle < 180;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = cos > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const lit = `M 0 ${-r} A ${r} ${r} 0 0 ${outerSweep} 0 ${r} A ${rx.toFixed(2)} ${r} 0 0 ${innerSweep} 0 ${-r} Z`;
  const uid = `moon-${Math.round(phaseAngle)}`;

  return (
    <svg viewBox="-108 -108 216 216" width={size} height={size} role="img" aria-label="月相">
      <defs>
        <radialGradient id={`${uid}-lit`} cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="62%" stopColor="#f0e6cf" />
          <stop offset="100%" stopColor="#cdb894" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* かすかな暈（ハロ） */}
      <circle r={r + 5} fill="var(--gold-500)" opacity="0.08" />
      {/* 影の側 */}
      <circle r={r} fill="#111737" stroke="var(--border-hair)" strokeWidth="1" />
      {/* 明るい側 */}
      {phaseAngle > 1 && phaseAngle < 359 && (
        <path d={lit} fill={`url(#${uid}-lit)`} filter={`url(#${uid}-glow)`} />
      )}
      {/* 縁の細い線 */}
      <circle r={r} fill="none" stroke="var(--gold-400)" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}
