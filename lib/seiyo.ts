/**
 * 西洋占星術の拡張：日食・月食、ボイドタイム、スーパームーン
 * すべて astronomy-engine による精密計算。
 */
import {
  Body,
  EclipseKind,
  SearchLunarEclipse,
  SearchGlobalSolarEclipse,
  SearchMoonPhase,
  EclipticGeoMoon,
} from 'astronomy-engine';
import { ZODIAC } from './constants';
import { signIndexOfLongitude, geoEclipticLongitude } from './astro';
import { norm360, angleDelta } from './time';

const AU_KM = 149597870.7;

const SOLAR_KIND: Record<string, string> = {
  total: '皆既日食',
  annular: '金環日食',
  partial: '部分日食',
  penumbral: '部分日食',
};
const LUNAR_KIND: Record<string, string> = {
  total: '皆既月食',
  partial: '部分月食',
  penumbral: '半影月食',
};

export interface EclipseInfo {
  instant: Date;
  kind: EclipseKind;
  label: string; // 日本語
}

/** now 以降の最初の日食 */
export function nextSolarEclipse(now: Date): EclipseInfo {
  const e = SearchGlobalSolarEclipse(now);
  return { instant: e.peak.date, kind: e.kind, label: SOLAR_KIND[e.kind] ?? '日食' };
}

/** now 以降の最初の月食 */
export function nextLunarEclipse(now: Date): EclipseInfo {
  const e = SearchLunarEclipse(now);
  return { instant: e.peak.date, kind: e.kind, label: LUNAR_KIND[e.kind] ?? '月食' };
}

// ─────────────── スーパームーン ───────────────
export interface SupermoonInfo {
  fullMoon: Date;
  distanceKm: number;
  isSupermoon: boolean;
}

/** 月の地心距離(km) */
export function moonDistanceKm(date: Date): number {
  return EclipticGeoMoon(date).dist * AU_KM;
}

/** now 以降の次の満月と、それがスーパームーンか（近地点寄り≒36万km以内） */
export function nextSupermoon(now: Date): SupermoonInfo {
  const fm = SearchMoonPhase(180, now, 40)!.date;
  const distanceKm = moonDistanceKm(fm);
  return { fullMoon: fm, distanceKm, isSupermoon: distanceKm <= 360000 };
}

// ─────────────── ボイドタイム（月のボイド・オブ・コース） ───────────────
// アスペクトは「有向離角 norm360(月黄経 − 天体黄経)」（0..360）と突き合わせるため、
// 同じアスペクトが2つの値に立つ（六分=60/300・矩=90/270・三分=120/240）。
// 240/270/300 を落とすと星座内の最後のアスペクトを取り逃し、ボイドが実際より早く始まる。
// ※ 無向の |angleDelta| へ変えてはならない — 合(0)と衝(180)が符号交差でなくV字の極小になり、
//   下の符号反転による検出ループが成立しなくなる。
const ASPECTS = [0, 60, 90, 120, 180, 240, 270, 300];
const VOC_BODIES: Body[] = [Body.Sun, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];

function moonLon(t: Date): number {
  return norm360(EclipticGeoMoon(t).lon);
}

/** 月の黄経が target(度) に達する時刻を start から探索（月の黄経は単調増加） */
export function searchMoonLongitude(target: number, start: Date): Date {
  const l0 = moonLon(start);
  const adv = norm360(target - l0); // start から target までの前進量(0-360)
  let lo = start.getTime();
  let hi = start.getTime() + 4 * 86400000;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    const covered = norm360(moonLon(new Date(mid)) - l0);
    if (covered < adv) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

/**
 * 月が現在の星座に入った時刻（入宮）。signChange から遡って求める。
 * 月黄経は単調増加なので、signChange からの後退量 norm360(境界黄経 − 月黄経) は
 * 時刻を遡るほど単調に増え、それが 30° に達した点が入宮。
 */
function signIngress(signChange: Date, nextBoundary: number): Date {
  const back = (t: number) => norm360(nextBoundary - moonLon(new Date(t)));
  let lo = signChange.getTime() - 3.2 * 86400000; // 1星座は最長でも約2.6日なので必ず前の星座
  let hi = signChange.getTime();
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (back(mid) > 30) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

export interface VoidOfCourse {
  isVoid: boolean;
  /** ボイド開始＝星座内で最後に結んだアスペクトの時刻。星座内に1つも無ければ入宮時刻 */
  voidStart: Date;
  /** 月が現在の星座に入った時刻 */
  signIngress: Date;
  signChange: Date; // 次に星座を移る時刻＝ボイド終了
  currentSign: string;
  nextSign: string;
}

/** 現在のボイドタイム状態（月が次に星座を移るまで、他天体と主要アスペクトを結ばない時間帯） */
export function voidOfCourse(now: Date): VoidOfCourse {
  const L = moonLon(now);
  const curIdx = signIndexOfLongitude(L);
  const nextBoundary = norm360((curIdx + 1) * 30);
  const signChange = searchMoonLongitude(nextBoundary, now);
  const ingress = signIngress(signChange, nextBoundary);

  // 入宮から星座を移るまで（最大~2.6日）を細かくサンプルし、最後のアスペクトを求める。
  // 窓は入宮でクランプする（signChange − 2.7日 固定にすると、月が速い時期に
  // 前の星座で結んだアスペクトを voidStart として拾ってしまう）。
  const windowStart = ingress;
  const stepMs = 12 * 60 * 1000;
  const times: number[] = [];
  for (let t = windowStart.getTime(); t <= signChange.getTime(); t += stepMs) times.push(t);
  const mlons = times.map((t) => moonLon(new Date(t)));

  let lastAspect: number | null = null;
  for (const body of VOC_BODIES) {
    const plons = times.map((t) => geoEclipticLongitude(body, new Date(t)));
    for (const a of ASPECTS) {
      for (let i = 1; i < times.length; i++) {
        const g0 = angleDelta(a, norm360(mlons[i - 1] - plons[i - 1]));
        const g1 = angleDelta(a, norm360(mlons[i] - plons[i]));
        if (g0 === 0 || (g0 < 0) !== (g1 < 0)) {
          if (Math.abs(g1 - g0) > 90) continue; // ラップの誤検出を除外
          const frac = g0 === g1 ? 0 : g0 / (g0 - g1);
          const ct = times[i - 1] + frac * (times[i] - times[i - 1]);
          if (ct <= signChange.getTime() && (lastAspect === null || ct > lastAspect)) lastAspect = ct;
        }
      }
    }
  }

  // 星座内に1つもアスペクトが無ければ、入宮の瞬間からずっとボイド（古典的な扱い）。
  // ここを null のままにすると isVoid が黙って false に落ち、ボイドが一度も出ない日が生まれる。
  const voidStart = lastAspect !== null ? new Date(lastAspect) : ingress;
  const isVoid = now.getTime() >= voidStart.getTime() && now.getTime() < signChange.getTime();
  return {
    isVoid,
    voidStart,
    signIngress: ingress,
    signChange,
    currentSign: ZODIAC[curIdx].name,
    nextSign: ZODIAC[(curIdx + 1) % 12].name,
  };
}
