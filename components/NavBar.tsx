import type { ReactNode } from 'react';

export type NavKey = 'today' | 'macro' | 'birth' | 'calendar' | 'jiten';

/* Material Symbols（outlined）風の自作アイコン */
const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ITEMS: { key: NavKey; label: string; icon: ReactNode }[] = [
  {
    key: 'today',
    label: '今日',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
      </svg>
    ),
  },
  {
    key: 'macro',
    label: '大きな流れ',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M3 15.5c2.5-5 5-5 7.5 0s5 5 7.5 0" />
        <path d="M3 9c2.5-4 5-4 7.5 0s5 4 7.5 0" opacity="0.45" />
      </svg>
    ),
  },
  {
    key: 'birth',
    label: '生まれ',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c1.2-4 4-5.5 7-5.5s5.8 1.5 7 5.5" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: '暦',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="4" y="5" width="16" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4M4 10.5h16" />
        <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'jiten',
    label: '事典',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M12 6.2v13" />
        <path d="M12 6.2C10.4 4.8 7.9 4.1 4.5 4.4v12.8c3.4-.3 5.9.4 7.5 1.8 1.6-1.4 4.1-2.1 7.5-1.8V4.4c-3.4-.3-5.9.4-7.5 1.8z" />
      </svg>
    ),
  },
];

export function NavBar({ active, onChange }: { active: NavKey; onChange: (key: NavKey) => void }) {
  return (
    <nav className="navbar" aria-label="メインナビゲーション">
      <div className="navbar-inner">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            type="button"
            className="navbar-item"
            aria-current={active === it.key ? 'page' : undefined}
            onClick={() => onChange(it.key)}
          >
            <span className="navbar-ind" aria-hidden>
              {it.icon}
            </span>
            <span className="navbar-label">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
