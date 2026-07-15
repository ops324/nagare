import type { TodayFlow } from '@/lib/flow';
import { ACTION_COPY } from '@/lib/copy';
import { jstHm } from '@/lib/format';

interface Pick {
  key: string;
  emoji: string;
  basis: string; // 根拠チップ
  title: string;
  note: string;
}

const SENJITSU_ACTIONS: { key: string; emoji: string }[] = [
  { key: 'tensha', emoji: '✨' },
  { key: 'ichiryu', emoji: '🌱' },
  { key: 'tora', emoji: '👛' },
  { key: 'tsuchinotomi', emoji: '🐍' },
  { key: 'mi', emoji: '🐍' },
  { key: 'kinoene', emoji: '🌿' },
];

/** 今日のシグナルから開運アクションを優先度順に最大3件選ぶ（朗報ファースト） */
function pickActions(today: TodayFlow): Pick[] {
  const out: Pick[] = [];
  const add = (key: string, emoji: string, basis: string, end?: string) => {
    const c = ACTION_COPY[key];
    if (!c) return;
    const title = end ? c.title.replace('{end}', end) : c.title;
    if (out.some((p) => p.title === title)) return; // 巳/己巳の重複など
    out.push({ key, emoji, basis, title, note: c.note });
  };

  const senjitsu = today.data.senjitsu;
  for (const sa of SENJITSU_ACTIONS) {
    const hit = senjitsu.find((s) => s.key === sa.key && s.tone === 'good');
    if (hit) add(sa.key, sa.emoji, hit.name);
  }

  const m = today.data.moon;
  if (m.phaseIndex === 0) add('newmoon', '🌑', '新月');
  if (m.phaseIndex === 4) add('fullmoon', '🌕', '満月');
  if (today.data.rokuyo.index === 0) add('taian', '⛩️', '大安');
  if (m.phaseIndex !== 0 && m.phaseIndex !== 4) {
    if (m.waxing) add('waxing', '🌔', '満ちる月');
    else add('waning', '🌘', '欠ける月');
  }
  if (today.data.voidOfCourse.isVoid) {
    add('void', '🍵', '月のボイドタイム', jstHm(today.data.voidOfCourse.signChange));
  }
  const b = today.data.biorhythm;
  if ((b.physical + b.emotional + b.intellectual) / 3 < -0.3) add('biolow', '🛁', 'バイオリズム');
  if (today.data.mercuryRetrograde) add('retro', '✉️', '水星逆行');
  add('base', '🧹', '今日の整え');

  return out.slice(0, 3);
}

export function LuckyActions({ today }: { today: TodayFlow }) {
  const picks = pickActions(today);
  return (
    <div className="cards">
      {picks.map((a, i) => (
        <article
          key={a.key}
          className={`lucky-action rise${i === 0 ? ' lucky-first' : ''}`}
          style={{ animationDelay: `${i * 55}ms` }}
        >
          <span className="lucky-ico" aria-hidden>
            {a.emoji}
          </span>
          <div className="lucky-body">
            <h3 className="lucky-title">{a.title}</h3>
            <p className="flowcard-desc">{a.note}</p>
            <span className="lucky-chip">{a.basis}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
