'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import type { BirthProfile } from '@/lib/types';
import { buildProfile } from '@/lib/profile';
import { computeTodayFlow, computeMacroFlow, buildTurningPoints } from '@/lib/flow';
import { meishiki } from '@/lib/shichu';
import { houi } from '@/lib/houi';
import { honmeishuku, todayShuku } from '@/lib/sukuyo';
import { nijuhasshuku } from '@/lib/koyomi';
import { daiun, daiunIndexAt, type Daiun } from '@/lib/daiun';
import { honmeiNumberForYear, risshunYear } from '@/lib/kyusei';
import { pct, jstMonthDay, jstYmd, jstYearMonth } from '@/lib/format';
import { toJstParts } from '@/lib/time';
import { AppHeader } from './AppHeader';
import { NavBar, type NavKey } from './NavBar';
import { Hitokoto } from './Hitokoto';
import { LuckyActions } from './LuckyActions';
import { luckyColorOf } from './lucky';
import { sekkiColorOf } from './sekki';
import { SkyField } from './SkyField';
import { FlowLine } from './FlowLine';
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
import { SHUKU_TRAIT, CAUTION_COPY, YAKUDOSHI_KIND_LABEL } from '@/lib/copy';

type Tab = NavKey;

const TAB_ORDER: Tab[] = ['today', 'macro', 'birth', 'calendar', 'jiten'];

/**
 * 中央列を広げるタブ。表がち・一覧がちの4タブは横に余裕があると読みやすい。
 * 今日タブだけは全幅で単列を保つ — ゲージ→ひとこと→開運アクションの
 * 読みのリズムがプロダクトそのもので、多列化すると流れ線の物語が切れる。
 */
const WIDE_TABS = new Set<Tab>(['macro', 'birth', 'calendar', 'jiten']);

/** 横に払ってタブを移すと判定する最小の距離。誤爆と取りこぼしの境目 */
const SWIPE_MIN = 56;
/** 払いの制限時間。これを超える指の移動は「払い」ではなく「なぞり」 */
const SWIPE_MAX_MS = 700;
/**
 * 送りの中で横へ流れる面。ここから始まった指の動きは帯自身の送りなので、
 * タブの移動として横取りしてはいけない（大運を右へ送ったら暦へ飛ぶ、を防ぐ）。
 */
const SWIPE_EXEMPT = '.daiun-scroll, .timeline-scroll, input, select, textarea, [contenteditable]';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function eclipseWhen(instant: Date, now: Date): string {
  return toJstParts(instant).year === toJstParts(now).year ? jstMonthDay(instant) : jstYmd(instant);
}

export function Dashboard({ birth, onReset }: { birth: BirthProfile; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>('today');
  /** 直前の移動の向き。本文の現れる向きを、ナビの線が席を移る向きに揃えるためだけに使う */
  const [dir, setDir] = useState<'next' | 'prev' | null>(null);
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
  const meinichi = useMemo(() => todayShuku(now, shuku).isMeinichi, [now, shuku]);
  const lucky = useMemo(() => luckyColorOf(now), [now]);
  const nijuu = useMemo(() => nijuhasshuku(now), [now]);
  const daiunData = useMemo(() => daiun(profile.birthInstant, profile.gender, profile.hasTime), [profile]);
  // 「何期目か」は年に丸めず月で比べる（lib 側の純関数）。
  // 暦年の差を満年齢と取り違えると、強調が最大1年3ヶ月ほど先走る。
  const daiunIndex = useMemo(
    () => daiunIndexAt(daiunData, profile.birthInstant, now),
    [daiunData, profile, now],
  );

  const m = today.data.moon;
  const sub = `${today.data.term.current?.name ?? ''}・${today.data.rokuyo.name}`;
  const retroNow = today.data.retrogrades.filter((r) => r.retrograde);

  // 祝祭：吉日バッジ（常時）と天赦日バースト（日1回・reduced-motion では出さない）
  const feteName = useMemo(() => {
    const sj = today.data.senjitsu;
    return (sj.find((s) => s.key === 'tensha') ?? sj.find((s) => s.key === 'ichiryu'))?.name;
  }, [today]);
  const isTensha = useMemo(() => today.data.senjitsu.some((s) => s.key === 'tensha'), [today]);
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (!isTensha) return;
    try {
      const key = `${jstYmd(now)}:tensha`;
      if (localStorage.getItem('nagare.fete.v1') === key) return;
      localStorage.setItem('nagare.fete.v1', key);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 日次ガード通過時のみ一度だけ祝祭を起動する意図的なゲート
        setBurst(true);
      }
    } catch {
      /* localStorage 不可なら演出なし */
    }
  }, [isTensha, now]);

  /**
   * タブの移動。**移動の種類で送りかたを変える**のがここの要点。
   *
   * - 別のタブへ：内容が丸ごと入れ替わるので先頭へ**跳ぶ**。ここを滑らせると、
   *   すでに消えた本文の上を延々と昇ることになる（滑らかさが遅さに化ける）。
   *   代わりに、移った向きを本文の現れる向きへ渡して繋がりを作る。
   * - いま居るタブをもう一度：内容は変わらないので先頭へ**送る**。
   *   タブバーをもう一度叩いて上へ戻るのは、この形のアプリの共通の作法で、
   *   長い暦や事典を読み下したあとに効く。
   *
   * reduced-motion のときは CSS の `scroll-behavior: auto !important` が
   * 効かない（JS で behavior を明示すると JS 側が勝つ）ので、ここで自分で分ける。
   */
  const switchTab = useCallback(
    (key: Tab) => {
      if (key === tab) {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      setDir(TAB_ORDER.indexOf(key) > TAB_ORDER.indexOf(tab) ? 'next' : 'prev');
      setTab(key);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [tab],
  );

  /** 隣のタブへ。端では動かない（環状にしない＝5席が一枚の紙に並ぶ隠喩を保つ） */
  const stepTab = useCallback(
    (delta: 1 | -1) => {
      const next = TAB_ORDER.indexOf(tab) + delta;
      if (next < 0 || next >= TAB_ORDER.length) return false;
      switchTab(TAB_ORDER[next]);
      return true;
    },
    [tab, switchTab],
  );

  /**
   * 横に払ってタブを移す。5席が一枚の横長の紙に並ぶ、という遷移の向きの隠喩を
   * そのまま指の操作にする（下部ナビへ親指を往復させずに隣を見られる）。
   *
   * 縦の送りを一切邪魔しないための決め事が三つ：
   *   ① 最初の一動きで軸を決め、縦だと判れば以後そのタッチには関与しない
   *   ② preventDefault しない（passive のまま）。横へのページ送りは
   *      body の overflow-x: clip で元々起きないので、奪うものが無い
   *   ③ 帯（大運・年表）と入力欄から始まった動きは、その面自身のものとして渡す
   */
  const swipe = useRef<{ x: number; y: number; t: number; axis: '?' | 'x' | 'y' } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      swipe.current = null;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target?.closest(SWIPE_EXEMPT)) {
      swipe.current = null;
      return;
    }
    const t = e.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY, t: e.timeStamp, axis: '?' };
  };

  const onTouchMove = (e: TouchEvent) => {
    const s = swipe.current;
    if (!s || s.axis === 'y') return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.axis === '?' && Math.hypot(dx, dy) > 12) {
      // 斜めは縦に倒す。このアプリの主たる操作は縦の送りなので、疑わしきは縦。
      s.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.axis !== 'x') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) < SWIPE_MIN || e.timeStamp - s.t > SWIPE_MAX_MS) return;
    stepTab(dx < 0 ? 1 : -1); // 左へ払う＝次の席が入ってくる
  };

  // キーボードでのタブ移動（1〜5 と ←→）。入力中は奪わない。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;

      const num = Number(e.key);
      if (num >= 1 && num <= TAB_ORDER.length) {
        e.preventDefault();
        switchTab(TAB_ORDER[num - 1]);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (stepTab(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [switchTab, stepTab]);

  // 今日の色（五行）をテーマに反映
  useEffect(() => {
    document.documentElement.setAttribute('data-lucky', lucky.key);
  }, [lucky.key]);

  // 節気の彩（星霜）をテーマに反映
  const sekki = useMemo(() => sekkiColorOf(today.data.term.current?.name), [today]);
  useEffect(() => {
    document.documentElement.setAttribute('data-sekki', sekki.key);
  }, [sekki.key]);

  return (
    <>
      <SkyField moonPhaseAngle={m.phaseAngle} retrogrades={retroNow} />
      <AppHeader now={now} sub={sub} />
      <main
        className="shell"
        data-wide={WIDE_TABS.has(tab) ? '' : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          swipe.current = null;
        }}
      >
        {/* key でタブごとに貼り替え、CSS アニメーションで淡く立ち上げる
            （これまではハードカットだった）。data-dir は移った向きで、本文が
            現れる向きをナビの線が席を移る向きに揃えるために渡す。
            reduced-motion は全域のキルスイッチが止める。 */}
        <div className="column tab-enter" data-dir={dir ?? undefined} key={tab}>
        <FlowLine key={tab} amp={tab === 'today' ? today.score / 100 : 0.45} seed={1 + TAB_ORDER.indexOf(tab)} />
        {tab === 'today' && (
          <section aria-label="今日の流れ">
            <FlowMeter
              score={today.score}
              label={today.label}
              summary={today.summary}
              burst={burst}
              taian={today.data.rokuyo.index === 0}
              feteName={feteName}
            />

            <Hitokoto now={now} today={today} meinichi={meinichi} lucky={lucky} shimmer={burst} />

            <div className="section-head">
              <span className="eyebrow eyebrow-lucky">今日の開運アクション</span>
              <hr className="hair" />
            </div>
            <LuckyActions today={today} />

            <SectionHead label="今日の兆し" />
            <div className="cards">
              {today.highlights.map((it, i) => (
                <FlowCard key={`h${i}`} item={it} index={i} />
              ))}
            </div>

            <SectionHead label="月と潮" />
            <div className="card moonrow rise">
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
              <span><i className="ring" />{CAUTION_COPY.happou.title}</span>
              <span><i className="lozenge" />{CAUTION_COPY.tenchusatsu.title}</span>
              <span style={{ color: 'var(--caution)' }}>{CAUTION_COPY.yakudoshi.title}（年の下に表示）</span>
            </div>
            {macro.currentYakudoshi.isYakudoshi && (
              <p className="soft-note">
                ※ 今年（{macro.gregorianYear}年）は
                {YAKUDOSHI_KIND_LABEL[macro.currentYakudoshi.kind!] ?? CAUTION_COPY.yakudoshi.title}（数え
                {macro.currentYakudoshi.kazoe}歳）。節目の年は数え年＝元日区切りで、流れの「今」（立春区切り）とは年の変わり目が異なります。
              </p>
            )}
            {/* 大運の「性別を入れると運の向きが定まります」と同じ作法。
                厄年は男女で年が異なるので、未回答のまま片方の表で断言しない。 */}
            {!macro.currentYakudoshi.genderKnown && (
              <p className="soft-note">
                ※ {CAUTION_COPY.yakudoshi.title}は男女で年が異なります。性別を入れると年表に表示されます。
              </p>
            )}

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
            <BirthChips profile={profile} tenchusatsu={meishikiData.tenchusatsu.branchLabel} />

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

            <SectionHead label="大運（四柱推命・10年区切り）" />
            <DaiunList data={daiunData} currentIndex={daiunIndex} genderKnown={daiunData.genderKnown} />

            <SectionHead label={`九星の吉方位（${houiData.year}年）`} />
            <KyuseiBan houi={houiData} />
          </section>
        )}

        {tab === 'calendar' && (
          <section aria-label="暦">
            {today.data.term.current && (
              <div className="card" style={{ marginTop: 4, padding: '12px 14px' }}>
                <div className="eyebrow">いまの二十四節気</div>
                <div className="nenun-meta" style={{ marginTop: 4 }}>
                  {today.data.term.current.name}（{today.data.term.current.yomi}）
                  {jstMonthDay(today.data.term.current.instant)}
                  {today.data.term.next && <> 〜 {jstMonthDay(today.data.term.next.instant)}</>}ごろ
                </div>
              </div>
            )}

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
            <p className="soft-note">六曜・二十四節気・開運日（天赦日・一粒万倍日・甲子・寅の日・巳の日）を月ごとに。</p>
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
        </div>

        {/* 右の「空」— デスクトップでのみ現れる。密度ではなく余白が意匠なので、
            ここには今日を一目で掴む最小限だけを置き、あとは空けておく。
            値はすべて既に計算済みのものを読むだけ（占術値には非関与）。 */}
        <aside className="skyzone" aria-label="今日の要約">
          <div className="skyzone-inner">
            <MoonGlyph phaseAngle={m.phaseAngle} size={64} />
            <p className="skyzone-score numeral">{today.score}</p>
            <p className="skyzone-label">{today.label}</p>
            <hr className="hair" />
            <dl className="skyzone-meta">
              <div>
                <dt>節気</dt>
                <dd>{today.data.term.current?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>六曜</dt>
                <dd>{today.data.rokuyo.name}</dd>
              </div>
              <div>
                <dt>宿</dt>
                <dd>{nijuu.name}</dd>
              </div>
              <div>
                <dt>今日の色</dt>
                <dd>{lucky.colorName}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </main>
      <NavBar active={tab} onChange={switchTab} />
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
        <div className="chip-label">{CAUTION_COPY.tenchusatsu.title}</div>
        <div className="chip-value">{tenchusatsu}</div>
        <div className="chip-sub">四柱推命</div>
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
  currentIndex,
  genderKnown,
}: {
  data: Daiun;
  /** 今いる期（0始まり）。まだ立運に達していなければ -1 で、どのセルも光らない */
  currentIndex: number;
  genderKnown: boolean;
}) {
  return (
    <>
      <div className="daiun-scroll">
        {data.periods.map((p, i) => (
          <div key={i} className="daiun-cell" data-cur={i === currentIndex}>
            {/* 立運に端数があると各期も端数から始まる。年だけ出すと下の「立運◯歳◯ヶ月から」と食い違う */}
            <div className="daiun-age">
              {p.ageStart}歳{p.ageStartMonths > 0 ? `${p.ageStartMonths}ヶ月` : ''}〜
            </div>
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
    <article className="flowcard" data-tone={tone}>
      {/* FlowCard と同じ律動：年を眉に置き、見出し・説明と続く */}
      <span className="flowcard-sys numeral">{year}</span>
      <h3 className="flowcard-title">{title}</h3>
      <p className="flowcard-desc">{note}</p>
    </article>
  );
}
