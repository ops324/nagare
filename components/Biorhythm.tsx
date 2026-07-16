interface Pt {
  offset: number;
  physical: number;
  emotional: number;
  intellectual: number;
}

const LINES = [
  { key: 'physical', label: 'からだ', color: 'var(--primary)' },
  { key: 'emotional', label: 'こころ', color: 'var(--caution)' },
  { key: 'intellectual', label: '知性', color: 'var(--silver)' },
] as const;

export function Biorhythm({ series }: { series: Pt[] }) {
  const W = 340;
  const H = 150;
  const padX = 14;
  const padY = 16;
  const offsets = series.map((s) => s.offset);
  const minO = Math.min(...offsets);
  const maxO = Math.max(...offsets);
  const x = (o: number) => padX + ((o - minO) / (maxO - minO)) * (W - padX * 2);
  const y = (v: number) => H / 2 - v * (H / 2 - padY);

  const smooth = (key: 'physical' | 'emotional' | 'intellectual') => {
    const pts = series.map((s) => ({ x: x(s.offset), y: y(s[key]) }));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cx.toFixed(1)} ${pts[i - 1].y.toFixed(1)} ${cx.toFixed(1)} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    return d;
  };

  const today = series.find((s) => s.offset === 0)!;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="バイオリズム">
        {/* 基準線 */}
        <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="var(--border-hair)" strokeWidth="1" />
        {/* 今日の縦線 */}
        <line x1={x(0)} y1={padY - 6} x2={x(0)} y2={H - padY + 6} stroke="var(--gold-500)" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
        <text x={x(0)} y={12} textAnchor="middle" fontSize="9" fill="var(--accent)" style={{ letterSpacing: '0.02em' }}>
          今日
        </text>
        {LINES.map((l) => (
          <path key={l.key} d={smooth(l.key)} fill="none" stroke={l.color} strokeWidth="2" strokeLinecap="round" opacity="0.92" />
        ))}
        {LINES.map((l) => (
          <circle key={l.key} cx={x(0)} cy={y(today[l.key])} r="3.4" fill={l.color} stroke="var(--surface-container-low)" strokeWidth="1" />
        ))}
      </svg>
      <div className="bio-legend">
        {LINES.map((l) => {
          const v = today[l.key];
          return (
            <span key={l.key} className="bio-leg">
              <i style={{ background: l.color }} />
              {l.label}
              <b style={{ color: v >= 0 ? 'var(--good)' : 'var(--caution)' }}>
                {v >= 0 ? '＋' : '−'}
                {Math.abs(Math.round(v * 100))}
              </b>
            </span>
          );
        })}
      </div>
    </div>
  );
}
