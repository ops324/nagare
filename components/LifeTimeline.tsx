import type { TimelineYear } from '@/lib/flow';

const STEP = 96;
const PAD = 54;
const MID = 78;
const OFFSET = { good: -26, neutral: 0, caution: 22 } as const;

export function LifeTimeline({ timeline }: { timeline: TimelineYear[] }) {
  const n = timeline.length;
  const W = PAD * 2 + (n - 1) * STEP;
  const H = 168;
  const pts = timeline.map((t, i) => ({
    x: PAD + i * STEP,
    y: MID + OFFSET[t.tone],
    t,
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cx} ${pts[i - 1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }

  return (
    <div className="timeline-scroll">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="人生周期のタイムライン">
        <defs>
          <linearGradient id="tl-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold-600)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="var(--gold-400)" />
            <stop offset="100%" stopColor="var(--gold-300)" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* 流れの帯 */}
        <path d={d} fill="none" stroke="url(#tl-grad)" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />

        {pts.map(({ x, y, t }) => {
          const color =
            t.tone === 'good' ? 'var(--good)' : t.tone === 'caution' ? 'var(--caution)' : 'var(--silver)';
          return (
            <g key={t.year}>
              {/* 年ラベル基準線への細い連結 */}
              <line x1={x} y1={y} x2={x} y2={H - 30} stroke="var(--border-hair)" strokeWidth="1" />
              {/* フェーズ名 */}
              <text
                x={x}
                y={y - (t.tone === 'caution' ? -20 : 16)}
                textAnchor="middle"
                fontSize="10.5"
                fill={color}
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}
              >
                {t.phase}
              </text>
              {/* ノード */}
              {t.isNow ? (
                <>
                  <circle cx={x} cy={y} r="11" fill="none" stroke="var(--gold-300)" strokeWidth="1.4" opacity="0.6">
                    <animate attributeName="r" values="9;15;9" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="3.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="6.5" fill="#fffaf0" stroke="var(--gold-500)" strokeWidth="1.5" />
                </>
              ) : (
                <circle
                  cx={x}
                  cy={y}
                  r={t.isHappou ? 6 : 4.5}
                  fill={t.isHappou ? 'var(--ink-900)' : color}
                  stroke={t.isHappou ? 'var(--gold-400)' : 'none'}
                  strokeWidth="2"
                />
              )}
              {/* 厄年マーク */}
              {t.yakudoshiKind && (
                <text x={x + 9} y={y - 7} fontSize="9" fill="var(--caution)">
                  ⚠
                </text>
              )}
              {/* 天中殺マーク */}
              {t.isTenchusatsu && (
                <text x={x - 15} y={y - 7} fontSize="9" fill="var(--caution)" opacity="0.85">
                  殺
                </text>
              )}
              {/* 年 */}
              <text
                x={x}
                y={H - 14}
                textAnchor="middle"
                fontSize="12.5"
                fill={t.isNow ? 'var(--accent-soft)' : 'var(--text-dim)'}
                style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
              >
                {t.year}
              </text>
              {t.yakudoshiKind && (
                <text x={x} y={H - 2} textAnchor="middle" fontSize="8.5" fill="var(--caution)">
                  {t.yakudoshiKind}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
