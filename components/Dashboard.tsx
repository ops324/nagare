'use client';

import { useMemo, useState } from 'react';
import type { BirthProfile } from '@/lib/types';
import { buildProfile } from '@/lib/profile';
import { computeTodayFlow, computeMacroFlow, type MacroFlow } from '@/lib/flow';
import { meishiki } from '@/lib/shichu';
import { houi } from '@/lib/houi';
import { honmeishuku } from '@/lib/sukuyo';
import { nijuhasshuku } from '@/lib/koyomi';
import { unmeisei } from '@/lib/rokusei';
import { daiun, type Daiun } from '@/lib/daiun';
import { honmeiNumberForYear, risshunYear } from '@/lib/kyusei';
import { pct, jstMonthDay, jstYmd, jstYearMonth } from '@/lib/format';
import { toJstParts } from '@/lib/time';
import { AppHeader } from './AppHeader';
import { Starfield } from './Starfield';
import { FlowMeter } from './FlowMeter';
import { MoonGlyph } from './MoonGlyph';
import { FlowCard } from './FlowCard';
import { LifeTimeline } from './LifeTimeline';
import { Biorhythm } from './Biorhythm';
import { Meishiki } from './Meishiki';
import { KyuseiBan } from './KyuseiBan';
import { CalendarMonth } from './CalendarMonth';
import { Aisho } from './Aisho';
import { Jiten } from './Jiten';
import { SHUKU_TRAIT, RUNKI_DESC, CAUTION_COPY } from '@/lib/copy';

type Tab = 'today' | 'macro' | 'birth' | 'calendar' | 'jiten';
const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'macro', label: '大きな流れ' },
  { key: 'birth', label: '生まれ' },
  { key: 'calendar', label: '暦' },
  { key: 'jiten', label: '事典' },
];

function eclipseWhen(instant: Date, now: Date): string {
  return toJstParts(instant).year === toJstParts(now).year ? jstMonthDay(instant) : jstYmd(instant);
}

export function Dashboard({ birth, onReset }: { birth: BirthProfile; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>('today');
  const [now] = useState(() => new Date());

  const profile = useMemo(() => buildProfile(birth), [birth]);
  const today = useMemo(() => computeTodayFlow(profile, now), [profile, now]);
  const macro = useMemo(() => computeMacroFlow(profile, now), [profile, now]);
  const meishikiData = useMemo(() => meishiki(profile.birthInstant, profile.hasTime), [profile]);
  const houiData = useMemo(
    () => houi(honmeiNumberForYear(profile.risshunYear), risshunYear(now)),
    [profile, now],
  );
  const shuku = useMemo(() => honmeishuku(profile.birthInstant), [profile]);
  const nijuu = useMemo(() => nijuhasshuku(now), [now]);
  const rokusei = useMemo(() => unmeisei(profile.birthInstant), [profile]);
  const daiunData = useMemo(() => daiun(profile.birthInstant, profile.gender, profile.hasTime), [profile]);
  const currentAge = toJstParts(now).year - toJstParts(profile.birthInstant).year;

  const m = today.data.moon;
  const sub = `${today.data.term.current?.name ?? ''}・${today.data.rokuyo.name}`;
  const retroNow = today.data.retrogrades.filter((r) => r.retrograde);

  return (
    <>
      <Starfield />
      <AppHeader now={now} sub={sub} />
      <main className="shell">
        <div className="tabs tabs-scroll" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              className="tab"
              role="tab"
              data-active={tab === t.key}
              onClick={(e) => {
                setTab(t.key);
                e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'today' && (
          <section aria-label="今日の流れ">
            <FlowMeter score={today.score} label={today.label} summary={today.summary} />

            {today.data.term.current && (
              <div className="card" style={{ marginTop: 14, padding: '12px 14px' }}>
                <div className="eyebrow">いまの二十四節気</div>
                <div className="nenun-meta" style={{ marginTop: 4 }}>
                  {today.data.term.current.name}（{today.data.term.current.yomi}）
                  {jstMonthDay(today.data.term.current.instant)}
                  {today.data.term.next && <> 〜 {jstMonthDay(today.data.term.next.instant)}</>}ごろ
                </div>
              </div>
            )}

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

            <SectionHead label="あなたの生まれ" />
            <BirthChips profile={profile} tenchusatsu={meishikiData.tenchusatsu.name} />

            <SectionHead label="今日の兆し" />
            <div className="cards">
              {today.highlights.map((it, i) => (
                <FlowCard key={`h${i}`} item={it} index={i} />
              ))}
            </div>

            <SectionHead label="バイオリズム" />
            <div className="card" style={{ padding: '14px 12px 10px' }}>
              <Biorhythm series={today.data.biorhythmSeries} />
            </div>

            <SectionHead label="天体の便り" />
            <div className="cards">
              <FlowCard
                item={{
                  system: '天体',
                  title: `次の日食：${today.data.nextSolarEclipse.label}`,
                  description: `${eclipseWhen(today.data.nextSolarEclipse.instant, now)}ごろ。空の節目は、心の区切りにも。`,
                  tone: 'neutral',
                  severity: 'low',
                  emoji: '🌑',
                }}
              />
              <FlowCard
                item={{
                  system: '天体',
                  title: `次の月食：${today.data.nextLunarEclipse.label}`,
                  description: `${eclipseWhen(today.data.nextLunarEclipse.instant, now)}ごろ。満ちた月が翳る、手放しの時。`,
                  tone: 'neutral',
                  severity: 'low',
                  emoji: '🌕',
                }}
              />
              <FlowCard
                item={{
                  system: '天体',
                  title: retroNow.length ? `逆行中：${retroNow.map((r) => r.name).join('・')}` : 'すべての惑星が順行中',
                  description: retroNow.length
                    ? `${retroNow.map((r) => `${r.name}は${jstMonthDay(r.endsAt!)}ごろまで`).join('、')}。見直し・再開・立ち止まりのテーマ。急がず確かめながら。`
                    : '天体は素直に前へ。動き出しに向く流れです。',
                  tone: retroNow.length ? 'caution' : 'good',
                  severity: 'low',
                  emoji: '☿',
                }}
              />
            </div>

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
        )}

        {tab === 'macro' && (
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
              <div className="nenun-meta" style={{ marginTop: 8 }}>
                この運気の期間　{jstYearMonth(macro.currentPhasePeriod.start)} 〜 {jstYearMonth(macro.currentPhasePeriod.end)}ごろ
              </div>
            </div>

            <SectionHead label="人生周期のタイムライン" />
            <LifeTimeline timeline={macro.timeline} />
            <div className="tl-legend">
              <span><i style={{ background: 'var(--good)' }} />上り調子</span>
              <span><i style={{ background: 'var(--silver)' }} />準備・転換</span>
              <span><i style={{ background: 'var(--caution)' }} />慎重に</span>
              <span><i className="ring" />八方塞がり</span>
              <span><i className="ring-caution" />大殺界</span>
              <span>⚠ 厄年</span>
              <span style={{ color: 'var(--caution)' }}>殺 天中殺</span>
            </div>

            <SectionHead label="次の転機" />
            <div className="cards">
              {buildTurningPoints(macro).map((t) => (
                <TurningPoint key={`${t.year}-${t.title}`} year={t.year} tone={t.tone} title={t.title} note={t.note} />
              ))}
            </div>
          </section>
        )}

        {tab === 'birth' && (
          <section aria-label="あなたの生まれ">
            <SectionHead label="生まれのしるし" />
            <BirthChips profile={profile} tenchusatsu={meishikiData.tenchusatsu.name} />

            <SectionHead label="四柱推命の命式" />
            <Meishiki meishiki={meishikiData} />
            {!profile.hasTime && (
              <p className="soft-note">※ 出生時刻を入れると時柱まで出ます（「生年月日を変更」から追加できます）。</p>
            )}

            <SectionHead label="宿曜占星術（本命宿）" />
            <div className="card sukuyo-card">
              <div className="twin-label">本命宿</div>
              <div className="sukuyo-honmei font-display">{shuku.full}</div>
              <div className="twin-sub">{shuku.yomi}しゅく</div>
              <p className="flowcard-desc" style={{ marginTop: 8 }}>{SHUKU_TRAIT[shuku.name]}</p>
            </div>

            <SectionHead label="相性（三九の秘法）" />
            <Aisho myHonmei={shuku.name} />

            <SectionHead label="六星占術" />
            <div className="card" style={{ padding: 16 }}>
              <div className="rokusei-top">
                <div>
                  <div className="chip-label">運命星</div>
                  <div className="rokusei-name font-display">{rokusei.label}</div>
                  <div className="chip-sub">星数 {rokusei.seisu}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="chip-label">今年の運気</div>
                  <div
                    className="rokusei-runki font-display"
                    data-sakkai={macro.currentRunki.daisakkai ? 'dai' : macro.currentRunki.chusakkai || macro.currentRunki.shosakkai ? 'chu' : ''}
                  >
                    {macro.currentRunki.name}
                  </div>
                  {macro.currentRunki.daisakkai && <div className="rokusei-badge">大殺界</div>}
                  {macro.currentRunki.chusakkai && <div className="rokusei-badge chu">中殺界</div>}
                  {macro.currentRunki.shosakkai && <div className="rokusei-badge chu">小殺界</div>}
                </div>
              </div>
              <p className="flowcard-desc" style={{ marginTop: 10 }}>{RUNKI_DESC[macro.currentRunki.name]}</p>
            </div>

            <SectionHead label="大運（四柱推命・10年区切り）" />
            <DaiunList data={daiunData} currentAge={currentAge} genderKnown={daiunData.genderKnown} />

            <SectionHead label={`九星の吉方位（${houiData.year}年）`} />
            <KyuseiBan houi={houiData} />
          </section>
        )}

        {tab === 'calendar' && (
          <section aria-label="暦">
            <SectionHead label="今日の二十八宿" />
            <div className="card sukuyo-card">
              <div className="sukuyo-honmei font-display">{nijuu.full}</div>
              <div className="twin-sub">{nijuu.yomi}しゅく</div>
              <p className="flowcard-desc" style={{ marginTop: 6 }}>
                暦の上で今日、月が宿る宿。日々の吉凶の目安に。
              </p>
            </div>

            <SectionHead label="暦カレンダー" />
            <CalendarMonth now={now} />
            <p className="soft-note">六曜・二十四節気・開運日（天赦日／一粒万倍日／甲子）を月ごとに。</p>
          </section>
        )}

        {tab === 'jiten' && <Jiten />}

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

function BirthChips({
  profile,
  tenchusatsu,
}: {
  profile: ReturnType<typeof buildProfile>;
  tenchusatsu: string;
}) {
  return (
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
      <div className="card chip">
        <div className="chip-label">天中殺</div>
        <div className="chip-value">{tenchusatsu.replace('天中殺', '')}</div>
        <div className="chip-sub">天中殺</div>
      </div>
    </div>
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

function DaiunList({
  data,
  currentAge,
  genderKnown,
}: {
  data: Daiun;
  currentAge: number;
  genderKnown: boolean;
}) {
  const curIdx = data.periods.findIndex((p, i) => {
    const next = data.periods[i + 1];
    return currentAge >= p.ageStart && (!next || currentAge < next.ageStart);
  });
  return (
    <>
      <div className="daiun-scroll">
        {data.periods.map((p, i) => (
          <div key={i} className="daiun-cell" data-cur={i === curIdx}>
            <div className="daiun-age">{p.ageStart}歳〜</div>
            <div className="daiun-kanshi font-display">{p.kanshi.name}</div>
            <div className="daiun-yomi">{p.kanshi.yomi}</div>
          </div>
        ))}
      </div>
      <p className="soft-note">
        立運 {data.startYears}歳{data.startMonths > 0 ? `${data.startMonths}ヶ月` : ''}から・
        {data.forward ? '順行' : '逆行'}。
        {!genderKnown && '（性別を入れると運の向きが定まります）'}
      </p>
    </>
  );
}

type TurningItem = { year: number; title: string; note: string; tone: 'good' | 'caution' | 'neutral' };

/** 「次の転機」を各種占術から集約し、年の昇順に並べて返す（同年は挿入順を維持） */
function buildTurningPoints(macro: MacroFlow): TurningItem[] {
  const items: TurningItem[] = [];
  if (macro.nextTransit) {
    items.push({
      year: macro.nextTransit.year,
      tone: 'good',
      title: `${macro.nextTransit.label}（${macro.nextTransit.age}歳ごろ）`,
      note: '人生の大きな節目。これまでを見直し、次のステージへ舵を切る時期。',
    });
  }
  if (macro.nextHappou) {
    items.push({ year: macro.nextHappou, tone: 'caution', title: '八方塞がり', note: CAUTION_COPY.happou.note });
  }
  if (macro.nextDaisakkai) {
    items.push({ year: macro.nextDaisakkai.year, tone: 'caution', title: `大殺界（${macro.nextDaisakkai.name}）`, note: CAUTION_COPY.daisakkai.note });
  }
  if (macro.tenchusatsuYears[0]) {
    items.push({ year: macro.tenchusatsuYears[0].year, tone: 'caution', title: `天中殺（${macro.tenchusatsuYears[0].branchName}年）`, note: CAUTION_COPY.tenchusatsu.note });
  }
  if (macro.nextYakudoshi) {
    items.push({ year: macro.nextYakudoshi.year, tone: 'caution', title: `${macro.nextYakudoshi.kind}（数え${macro.nextYakudoshi.kazoe}）`, note: '心身の変化に気を配り、無理のない選択を。' });
  }
  if (macro.nextPeak && macro.nextPeak > macro.currentYear) {
    items.push({ year: macro.nextPeak, tone: 'good', title: '運気の頂点（離宮）', note: '華やかで注目を集める年。存分に前へ。見栄・別れには少し注意。' });
  }
  return items.sort((a, b) => a.year - b.year);
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
