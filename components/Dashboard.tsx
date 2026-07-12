'use client';

import { useMemo, useState } from 'react';
import type { BirthProfile } from '@/lib/types';
import { buildProfile } from '@/lib/profile';
import { computeTodayFlow, computeMacroFlow } from '@/lib/flow';
import { pct } from '@/lib/format';
import { AppHeader } from './AppHeader';
import { Starfield } from './Starfield';
import { FlowMeter } from './FlowMeter';
import { MoonGlyph } from './MoonGlyph';
import { FlowCard } from './FlowCard';
import { LifeTimeline } from './LifeTimeline';
import { Biorhythm } from './Biorhythm';

type Tab = 'today' | 'macro';

export function Dashboard({ birth, onReset }: { birth: BirthProfile; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>('today');
  const [now] = useState(() => new Date());

  const profile = useMemo(() => buildProfile(birth), [birth]);
  const today = useMemo(() => computeTodayFlow(profile, now), [profile, now]);
  const macro = useMemo(() => computeMacroFlow(profile, now), [profile, now]);

  const m = today.data.moon;
  const sub = `${today.data.term.current?.name ?? ''}・${today.data.rokuyo.name}`;

  return (
    <>
      <Starfield />
      <AppHeader now={now} sub={sub} />
      <main className="shell">
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" data-active={tab === 'today'} onClick={() => setTab('today')}>
            今日の流れ
          </button>
          <button className="tab" role="tab" data-active={tab === 'macro'} onClick={() => setTab('macro')}>
            大きな流れ
          </button>
        </div>

        {tab === 'today' ? (
          <section aria-label="今日の流れ">
            <FlowMeter score={today.score} label={today.label} summary={today.summary} />

            {/* 月 */}
            <div className="card moonrow rise" style={{ marginTop: 18 }}>
              <div className="moon-float">
                <MoonGlyph phaseAngle={m.phaseAngle} size={88} />
              </div>
              <div className="moonrow-body">
                <div className="eyebrow">MOON ・ 月</div>
                <div className="font-display" style={{ fontSize: '1.2rem', marginTop: 2 }}>
                  {m.phaseName}・{m.sign.name}
                </div>
                <p className="flowcard-desc" style={{ marginTop: 6 }}>
                  輝面 約{pct(m.illumination)}％／月齢 {m.age.toFixed(1)}。
                  {m.waxing ? '満ちてゆく時。増やす・始めることに追い風。' : '欠けてゆく時。手放す・整えることに向く。'}
                  　潮は{today.data.tide.name}。
                </p>
              </div>
            </div>

            {/* あなたの生まれ */}
            <SectionHead label="あなたの生まれ" />
            <div className="chips">
              <div className="card chip">
                <div className="chip-label">星座</div>
                <div className="chip-value">
                  {profile.sun.sign.symbol} {profile.sun.sign.name}
                </div>
                <div className="chip-sub">{profile.sun.sign.element}のエレメント{profile.sun.cusp ? '・境目' : ''}</div>
              </div>
              <div className="card chip">
                <div className="chip-label">本命星</div>
                <div className="chip-value">{profile.honmei.name}</div>
                <div className="chip-sub">九星気学</div>
              </div>
              <div className="card chip">
                <div className="chip-label">干支</div>
                <div className="chip-value">{profile.yearKanshi.name}</div>
                <div className="chip-sub">{profile.yearKanshi.animal}年</div>
              </div>
            </div>

            {/* 今日の兆し */}
            <SectionHead label="今日の兆し" />
            <div className="cards">
              {today.highlights.map((it, i) => (
                <FlowCard key={`h${i}`} item={it} index={i} />
              ))}
            </div>

            {/* バイオリズム */}
            <SectionHead label="バイオリズム" />
            <div className="card" style={{ padding: '14px 12px 10px' }}>
              <Biorhythm series={today.data.biorhythmSeries} />
            </div>

            {/* 気をつけたいこと */}
            {today.cautions.length > 0 && (
              <>
                <SectionHead label="気をつけたいこと" />
                <div className="cards">
                  {today.cautions.map((it, i) => (
                    <FlowCard key={`c${i}`} item={it} index={i} />
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          <section aria-label="大きな流れ">
            <div className="card theme-card rise">
              <div className="eyebrow">今の数年テーマ</div>
              <p className="theme-text font-display">{macro.theme}</p>
            </div>

            <div className="card nenun-card rise" data-tone={macro.current.tone}>
              <div className="eyebrow">今年の運気（{macro.currentYear}年）</div>
              <div className="nenun-phase font-display">{macro.current.phase}</div>
              <div className="nenun-meta">
                {macro.current.palace}・{macro.current.direction}　／　{macro.current.theme}
              </div>
              <p className="flowcard-desc" style={{ marginTop: 8 }}>
                {macro.current.note}
              </p>
            </div>

            <SectionHead label="人生周期のタイムライン" />
            <LifeTimeline timeline={macro.timeline} />
            <div className="tl-legend">
              <span>
                <i style={{ background: 'var(--good)' }} />上り調子
              </span>
              <span>
                <i style={{ background: 'var(--silver)' }} />準備・転換
              </span>
              <span>
                <i style={{ background: 'var(--caution)' }} />慎重に
              </span>
              <span>
                <i className="ring" />八方塞がり
              </span>
              <span>⚠ 厄年</span>
            </div>

            <SectionHead label="次の転機" />
            <div className="cards">
              {macro.nextHappou && (
                <TurningPoint year={macro.nextHappou} tone="caution" title="八方塞がり" note="足元を固め、力を蓄える一年。大きな移動や新規は控えめに。" />
              )}
              {macro.nextYakudoshi && (
                <TurningPoint
                  year={macro.nextYakudoshi.year}
                  tone="caution"
                  title={`${macro.nextYakudoshi.kind}（数え${macro.nextYakudoshi.kazoe}）`}
                  note="心身の変化に気を配り、無理のない選択を。"
                />
              )}
              {macro.nextPeak && macro.nextPeak > macro.currentYear && (
                <TurningPoint year={macro.nextPeak} tone="good" title="運気の頂点（離宮）" note="華やかで注目を集める年。存分に前へ。見栄・別れには少し注意。" />
              )}
            </div>
          </section>
        )}

        <div className="hair" style={{ margin: '40px 0 18px' }} />
        <div className="footer">
          <button className="reset" onClick={onReset}>
            生年月日を変更
          </button>
          <p>娯楽・参考としてお楽しみください。</p>
        </div>
      </main>
    </>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{label}</span>
      <hr className="hair" />
    </div>
  );
}

function TurningPoint({
  year,
  title,
  note,
  tone,
}: {
  year: number;
  title: string;
  note: string;
  tone: 'good' | 'caution' | 'neutral';
}) {
  return (
    <article className="card flowcard" data-tone={tone}>
      <div className="flowcard-emoji numeral" style={{ fontSize: '1rem', color: 'var(--accent-soft)' }}>
        {year}
      </div>
      <div className="flowcard-body">
        <h3 className="flowcard-title">{title}</h3>
        <p className="flowcard-desc">{note}</p>
      </div>
    </article>
  );
}
