import { toJstParts } from '@/lib/time';
import { warekiLabel, weekdayJa } from '@/lib/format';

export function AppHeader({ now, sub }: { now: Date; sub?: string }) {
  const p = toJstParts(now);
  return (
    <header className="appbar">
      <div className="appbar-mark">
        流<span>れ</span>
      </div>
      <div className="appbar-date">
        <div>
          {warekiLabel(p.year, p.month, p.day)}
          <b>
            {' '}
            {p.month}月{p.day}日
          </b>
          （{weekdayJa(p.weekday)}）
        </div>
        {sub && <div style={{ color: 'var(--text-faint)' }}>{sub}</div>}
      </div>
    </header>
  );
}
