/** 総合フロー・メーター（270°アークゲージ） */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function FlowMeter({
  score,
  label,
  summary,
}: {
  score: number;
  label: string;
  summary?: string;
}) {
  const START = -135;
  const RANGE = 270;
  const f = Math.max(0, Math.min(100, score)) / 100;
  const track = arc(100, 100, 84, START, START + RANGE);
  const value = arc(100, 100, 84, START, START + RANGE * f);
  const cap = polar(100, 100, 84, START + RANGE * f);

  return (
    <div className="flowmeter">
      <svg viewBox="0 0 200 200" className="flowmeter-svg" role="img" aria-label={`今日の流れ ${score}点 ${label}`}>
        <defs>
          <linearGradient id="fm-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold-600)" />
            <stop offset="45%" stopColor="var(--gold-400)" />
            <stop offset="100%" stopColor="var(--gold-100)" />
          </linearGradient>
        </defs>
        {/* 目盛り */}
        {Array.from({ length: 28 }).map((_, i) => {
          const a = START + (RANGE / 27) * i;
          const p1 = polar(100, 100, 94, a);
          const p2 = polar(100, 100, 99, a);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--border-strong)"
              strokeWidth={i % 9 === 0 ? 1.6 : 0.7}
              opacity={i % 9 === 0 ? 0.8 : 0.4}
            />
          );
        })}
        <path d={track} fill="none" stroke="var(--surface-container-highest)" strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        <path
          d={value}
          fill="none"
          stroke="url(#fm-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          className="flowmeter-value"
        />
        <circle cx={cap.x} cy={cap.y} r="5.5" fill="var(--gold-100)" />
      </svg>
      <div className="flowmeter-center">
        <div className="numeral flowmeter-score">{score}</div>
        <div className="flowmeter-label font-display">{label}</div>
        {summary && <div className="flowmeter-summary">{summary}</div>}
      </div>
    </div>
  );
}
