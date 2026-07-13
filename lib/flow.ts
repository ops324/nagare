/**
 * 流れ統合エンジン
 *  - computeTodayFlow: 今日の天体・暦・個人周期を束ねた「今日の流れ」
 *  - computeMacroFlow: 九星9年サイクル等から「大きな流れ（人生周期）」
 */
import type { FlowItem } from './types';
import type { Kyusei } from './constants';
import { toJstParts } from './time';
import {
  moonState,
  tide,
  planetRetrogrades,
  isMercuryRetrograde,
  mercuryRetrogradeEnd,
  sunSign,
  type MoonState,
  type RetrogradeInfo,
  type SignResult,
} from './astro';
import { jstMonthDay, jstHm } from './format';
import {
  rokuyo,
  senjitsu,
  solarTermAround,
  type RokuyoResult,
  type Senjitsu,
  type SolarTermOccurrence,
} from './koyomi';
import {
  voidOfCourse,
  nextSolarEclipse,
  nextLunarEclipse,
  nextSupermoon,
  type VoidOfCourse,
  type EclipseInfo,
  type SupermoonInfo,
} from './seiyo';
import { biorhythm, biorhythmSeries, yakudoshi, type Biorhythm, type YakudoshiResult } from './cycles';
import { honmeiNumberForYear, risshunYear, risshunInstant, nenun, type Nenun } from './kyusei';
import { majorTransits, tenchusatsuYears, type TransitEvent, type TenchusatsuYear } from './transits';
import { unmeisei, runkiForYear, daisakkaiYears, type Unmeisei, type Runki } from './rokusei';
import { kyusei } from './constants';
import type { Profile } from './profile';

// ─────────────────────────── 今日の流れ ───────────────────────────

export interface TodayFlow {
  now: Date;
  score: number; // 0-100 総合フロー
  label: string;
  summary: string;
  highlights: FlowItem[];
  cautions: FlowItem[];
  data: {
    moon: MoonState;
    tide: { name: string; note: string };
    term: { current: SolarTermOccurrence | null; next: SolarTermOccurrence | null };
    rokuyo: RokuyoResult;
    senjitsu: Senjitsu[];
    retrogrades: RetrogradeInfo[];
    mercuryRetrograde: boolean;
    todaySunSign: SignResult;
    biorhythm: Biorhythm;
    biorhythmSeries: ReturnType<typeof biorhythmSeries>;
    yakudoshi: YakudoshiResult;
    voidOfCourse: VoidOfCourse;
    nextSolarEclipse: EclipseInfo;
    nextLunarEclipse: EclipseInfo;
    supermoon: SupermoonInfo;
  };
}

function scoreToLabel(score: number): string {
  if (score >= 78) return 'とても良い流れ';
  if (score >= 62) return '追い風の流れ';
  if (score >= 46) return '穏やかな流れ';
  if (score >= 32) return '慎重に進む流れ';
  return '静かに整える流れ';
}

export function computeTodayFlow(profile: Profile, now: Date): TodayFlow {
  const moon = moonState(now);
  const td = tide(now);
  const term = solarTermAround(now);
  const roku = rokuyo(now);
  const senj = senjitsu(now);
  const retro = planetRetrogrades(now);
  const mercuryRetro = isMercuryRetrograde(now);
  const todaySun = sunSign(now);
  const voc = voidOfCourse(now);
  const solarEclipse = nextSolarEclipse(now);
  const lunarEclipse = nextLunarEclipse(now);
  const supermoon = nextSupermoon(now);
  const bio = biorhythm(profile.birthInstant, now);
  const bioSeries = biorhythmSeries(profile.birthInstant, now);
  const gregYear = toJstParts(now).year;
  const yaku = yakudoshi(profile.birthInstant, profile.gender, gregYear);
  const nen = nenun(honmeiNumberForYear(profile.risshunYear), risshunYear(now));

  const highlights: FlowItem[] = [];
  const cautions: FlowItem[] = [];
  let score = 50;

  // ── 暦：六曜 ──
  {
    const tone = roku.tone === 'good' ? 'good' : roku.tone === 'bad' ? 'caution' : 'neutral';
    (tone === 'caution' ? cautions : highlights).push({
      system: '暦',
      title: `六曜：${roku.name}`,
      description: roku.note,
      tone,
      severity: roku.tone === 'good' || roku.tone === 'bad' ? 'medium' : 'low',
      emoji: '📖',
    });
    score += roku.index === 0 ? 8 : roku.index === 5 ? -8 : roku.index === 1 ? -4 : 2;
  }

  // ── 暦：選日（吉日） ──
  for (const s of senj) {
    highlights.push({
      system: '暦',
      title: s.name,
      description: s.note,
      tone: 'good',
      severity: s.key === 'tensha' ? 'high' : s.key === 'ichiryu' ? 'medium' : 'low',
      emoji: '🌱',
    });
    score += s.key === 'tensha' ? 10 : s.key === 'ichiryu' ? 6 : 4;
  }

  // ── 暦：二十四節気 ──
  if (term.current) {
    const nextStr = term.next
      ? `　次は${term.next.jst.month}/${term.next.jst.day}「${term.next.name}」`
      : '';
    highlights.push({
      system: '暦',
      title: `${term.current.name}（${term.current.yomi}）`,
      description: `いまは二十四節気の「${term.current.name}」の頃。${nextStr}`,
      tone: 'neutral',
      severity: 'low',
      emoji: '🍃',
    });
  }

  // ── 天体：月相（表示は専用のヒーロー行。ここではスコアのみ） ──
  score += moon.waxing ? 4 : 0;
  if (moon.phaseIndex === 0) score += 3; // 新月：始まり

  // ── 天体：水星逆行 ──
  if (mercuryRetro) {
    cautions.push({
      system: '天体',
      title: '水星逆行中',
      description: `連絡・契約・移動で行き違いが起きやすい時期。${jstMonthDay(mercuryRetrogradeEnd(now))}ごろまで。確認をていねいに、新規より見直しを。`,
      tone: 'caution',
      severity: 'medium',
      emoji: '☿',
    });
    score -= 8;
  }

  // ── 天体：ボイドタイム ──
  if (voc.isVoid) {
    cautions.push({
      system: '天体',
      title: 'ボイドタイム',
      description: `月が${voc.currentSign}を離れる${jstMonthDay(voc.signChange)} ${jstHm(voc.signChange)}ごろまでは、新しい決断や契約は結果が定まりにくい時間帯。ひと息ついて過ごすと吉。`,
      tone: 'caution',
      severity: 'low',
      emoji: '🌙',
    });
    score -= 3;
  }

  // ── 天体：スーパームーン ──
  if (supermoon.isSupermoon) {
    highlights.push({
      system: '天体',
      title: 'まもなくスーパームーン',
      description: `${jstMonthDay(supermoon.fullMoon)}ごろの満月は地球に近く、いつもより大きく見えます。感情やエネルギーが高まりやすい時期。`,
      tone: 'good',
      severity: 'low',
      emoji: '🌕',
    });
  }

  // ── 個人：バイオリズム ──
  {
    const avg = (bio.physical + bio.emotional + bio.intellectual) / 3;
    const parts = [
      `からだ${bio.physical >= 0 ? '＋' : '−'}`,
      `こころ${bio.emotional >= 0 ? '＋' : '−'}`,
      `知性${bio.intellectual >= 0 ? '＋' : '−'}`,
    ].join('・');
    (avg >= 0 ? highlights : cautions).push({
      system: '運気',
      title: `バイオリズム：${parts}`,
      description:
        avg >= 0
          ? '全体に調子の乗りやすい日。行動を起こすなら追い風です。'
          : '低めの日は無理をせず、休息と充電を優先すると整います。',
      tone: avg >= 0 ? 'good' : 'caution',
      severity: 'low',
      emoji: '📈',
    });
    score += avg * 15;
  }

  // ── 個人：厄年 ──
  if (yaku.isYakudoshi) {
    cautions.push({
      system: '運気',
      title: `${yaku.kind}（数え${yaku.kazoe}歳）`,
      description: yaku.note,
      tone: 'caution',
      severity: yaku.kind === '本厄' || yaku.kind === '大厄' ? 'medium' : 'low',
      emoji: '⚠️',
    });
    score += yaku.kind === '大厄' || yaku.kind === '本厄' ? -6 : -3;
  }

  // ── 個人：八方塞がり（年運） ──
  if (nen.happouFusagari) {
    cautions.push({
      system: '九星',
      title: '八方塞がり（今年）',
      description: nen.note,
      tone: 'caution',
      severity: 'medium',
      emoji: '🧭',
    });
    score -= 6;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const summaryBits: string[] = [`六曜は${roku.name}`, `${moon.phaseName}`];
  if (senj.length) summaryBits.push(senj.map((s) => s.name).join('・'));
  if (mercuryRetro) summaryBits.push('水星逆行');
  const summary = summaryBits.join(' / ');

  const bySeverity = (a: FlowItem, b: FlowItem) =>
    ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity];

  return {
    now,
    score,
    label: scoreToLabel(score),
    summary,
    highlights: highlights.sort(bySeverity),
    cautions: cautions.sort(bySeverity),
    data: {
      moon,
      tide: td,
      term,
      rokuyo: roku,
      senjitsu: senj,
      retrogrades: retro,
      mercuryRetrograde: mercuryRetro,
      todaySunSign: todaySun,
      biorhythm: bio,
      biorhythmSeries: bioSeries,
      yakudoshi: yaku,
      voidOfCourse: voc,
      nextSolarEclipse: solarEclipse,
      nextLunarEclipse: lunarEclipse,
      supermoon,
    },
  };
}

// ─────────────────────────── 大きな流れ（人生周期） ───────────────────────────

export interface TimelineYear {
  year: number;
  phase: string;
  theme: string;
  note: string;
  tone: 'good' | 'caution' | 'neutral';
  isNow: boolean;
  isHappou: boolean;
  yakudoshiKind: string | null;
  isTenchusatsu: boolean;
  isDaisakkai: boolean; // 六星占術の大殺界
}

export interface MacroFlow {
  now: Date;
  currentYear: number; // 九星の立春基準年
  honmei: Kyusei;
  current: Nenun;
  currentPhasePeriod: { start: Date; end: Date }; // 今年の運気の期間（立春〜次の立春）
  theme: string;
  timeline: TimelineYear[];
  nextHappou: number | null;
  nextPeak: number | null; // 次の「頂点」の年（離宮）
  nextYakudoshi: { year: number; kazoe: number; kind: string } | null;
  transits: TransitEvent[]; // 外惑星の回帰（サターン/ジュピターリターン）
  nextTransit: TransitEvent | null;
  tenchusatsuYears: TenchusatsuYear[]; // 年天中殺の巡り
  rokusei: Unmeisei; // 六星占術の運命星（星人±）
  currentRunki: Runki; // 今年の運気
  nextDaisakkai: { year: number; name: string } | null; // 次の大殺界年
}

export function computeMacroFlow(profile: Profile, now: Date): MacroFlow {
  const h = honmeiNumberForYear(profile.risshunYear);
  const nineYear = risshunYear(now);
  const current = nenun(h, nineYear);
  // 今年の運気（九星年運）の期間：立春(nineYear) 〜 次の立春(nineYear+1)
  const currentPhasePeriod = { start: risshunInstant(nineYear), end: risshunInstant(nineYear + 1) };

  const tcSet = new Set(tenchusatsuYears(profile.birthInstant, nineYear - 1, 8).map((t) => t.year));
  const rokusei = unmeisei(profile.birthInstant);
  const timeline: TimelineYear[] = [];
  let nextHappou: number | null = null;
  let nextPeak: number | null = null;
  for (let y = nineYear - 1; y <= nineYear + 8; y++) {
    const n = nenun(h, y);
    const yaku = yakudoshi(profile.birthInstant, profile.gender, y);
    if (n.happouFusagari && nextHappou === null && y >= nineYear) nextHappou = y;
    if (n.base === 9 && nextPeak === null && y >= nineYear) nextPeak = y;
    timeline.push({
      year: y,
      phase: n.phase,
      theme: n.theme,
      note: n.note,
      tone: n.tone,
      isNow: y === nineYear,
      isHappou: n.happouFusagari,
      yakudoshiKind: yaku.isYakudoshi ? yaku.kind : null,
      isTenchusatsu: tcSet.has(y),
      isDaisakkai: runkiForYear(rokusei, y).daisakkai,
    });
  }

  const transits = majorTransits(profile.birthInstant, now, nineYear + 8);
  const nextTransit = transits[0] ?? null;
  const upcomingTenchusatsu = tenchusatsuYears(profile.birthInstant, nineYear, 4);
  const currentRunki = runkiForYear(rokusei, nineYear);
  const nextDaisakkai = daisakkaiYears(profile.birthInstant, nineYear, 1)[0] ?? null;

  let nextYakudoshi: { year: number; kazoe: number; kind: string } | null = null;
  for (let y = toJstParts(now).year; y < toJstParts(now).year + 90; y++) {
    const r = yakudoshi(profile.birthInstant, profile.gender, y);
    if (r.isYakudoshi && r.kind) {
      nextYakudoshi = { year: y, kazoe: r.kazoe, kind: r.kind };
      break;
    }
  }

  // 今の数年テーマ（一文）
  const honmei = kyusei(h);
  let theme = `${honmei.name}のあなたは、いま「${current.phase}」の局面。${current.note}`;
  if (nextHappou && nextHappou !== nineYear) {
    theme += `　${nextHappou}年ごろに一度、足元を固める時期が巡ってきます。`;
  } else if (nextPeak && nextPeak > nineYear) {
    theme += `　${nextPeak}年ごろに運気の頂点が巡ってきます。`;
  }

  return {
    now,
    currentYear: nineYear,
    honmei,
    current,
    currentPhasePeriod,
    theme,
    timeline,
    nextHappou,
    nextPeak,
    nextYakudoshi,
    transits,
    nextTransit,
    tenchusatsuYears: upcomingTenchusatsu,
    rokusei,
    currentRunki,
    nextDaisakkai,
  };
}
