/**
 * 天体計算（astronomy-engine ラッパ）
 * 太陽星座・月相・月齢・惑星の逆行など。すべて視黄経(of-date)ベース。
 */
import {
  Body,
  SunPosition,
  EclipticGeoMoon,
  GeoVector,
  Ecliptic,
  MoonPhase,
  SearchMoonPhase,
  Illumination,
} from 'astronomy-engine';
import { ZODIAC, MOON_PHASES, type ZodiacSign } from './constants';
import { addDays, addHours, norm360, angleDelta } from './time';

/** 太陽の視黄経(度, of-date) */
export function sunLongitude(date: Date): number {
  return norm360(SunPosition(date).elon);
}

/** 月の視黄経(度, of-date) */
export function moonLongitude(date: Date): number {
  return norm360(EclipticGeoMoon(date).lon);
}

/** ある黄経が入る星座 index(0=牡羊座) */
export function signIndexOfLongitude(lon: number): number {
  return Math.floor(norm360(lon) / 30);
}

export interface SignResult {
  index: number;
  sign: ZodiacSign;
  /** 星座内の度数 0..30 */
  degreeInSign: number;
  /** 星座の境界(±1.2°)に近いか＝カスプ注意 */
  cusp: boolean;
}

/** 指定時刻の太陽星座。生時不明なら date は JST 正午を渡す想定。 */
export function sunSign(date: Date): SignResult {
  const lon = sunLongitude(date);
  const index = signIndexOfLongitude(lon);
  const degreeInSign = lon - index * 30;
  const cusp = degreeInSign < 1.2 || degreeInSign > 28.8;
  return { index, sign: ZODIAC[index], degreeInSign, cusp };
}

export interface MoonState {
  /** 月相角 0..360 (0=新月,90=上弦,180=満月,270=下弦) */
  phaseAngle: number;
  /** 月相名 index(0=新月..7) と名称 */
  phaseIndex: number;
  phaseName: string;
  phaseSymbol: string;
  /** 月齢（前回の新月からの経過日数） */
  age: number;
  /** 輝面比 0..1 */
  illumination: number;
  /** 月の星座 */
  sign: ZodiacSign;
  /** 満ちていく途中か */
  waxing: boolean;
}

/** now 以前の直近の新月インスタント */
export function previousNewMoon(now: Date): Date {
  let nm = SearchMoonPhase(0, addDays(now, -45), 46);
  let prev = nm;
  while (nm && nm.date.getTime() <= now.getTime()) {
    prev = nm;
    nm = SearchMoonPhase(0, addDays(nm.date, 1), 40);
  }
  return (prev ?? nm)!.date;
}

/** now 以降の最初の指定月相 (target: 0=新月,180=満月 等) */
export function nextMoonPhase(target: number, now: Date): Date | null {
  const t = SearchMoonPhase(target, now, 40);
  return t ? t.date : null;
}

export function moonState(now: Date): MoonState {
  const phaseAngle = norm360(MoonPhase(now));
  // 8区分：22.5°刻みで丸める
  const phaseIndex = Math.floor(norm360(phaseAngle + 22.5) / 45) % 8;
  const illum = Illumination(Body.Moon, now).phase_fraction;
  const age = (now.getTime() - previousNewMoon(now).getTime()) / 86400000;
  const lon = moonLongitude(now);
  return {
    phaseAngle,
    phaseIndex,
    phaseName: MOON_PHASES[phaseIndex].name,
    phaseSymbol: MOON_PHASES[phaseIndex].symbol,
    age,
    illumination: illum,
    sign: ZODIAC[signIndexOfLongitude(lon)],
    waxing: phaseAngle < 180,
  };
}

/** 潮汐の目安（新月・満月=大潮／上弦・下弦=小潮） */
export function tide(now: Date): { name: string; note: string } {
  const a = norm360(MoonPhase(now));
  // 新月(0)・満月(180)付近=大潮、上弦(90)・下弦(270)付近=小潮
  const distToSyzygy = Math.min(a, Math.abs(180 - a), 360 - a);
  if (distToSyzygy < 30) return { name: '大潮', note: '満ち引きが大きい時期' };
  if (distToSyzygy > 60) return { name: '小潮', note: '満ち引きが穏やかな時期' };
  return { name: '中潮', note: '大潮と小潮の中間' };
}

const PLANETS: { body: Body; name: string; emoji: string }[] = [
  { body: Body.Mercury, name: '水星', emoji: '☿' },
  { body: Body.Venus, name: '金星', emoji: '♀' },
  { body: Body.Mars, name: '火星', emoji: '♂' },
  { body: Body.Jupiter, name: '木星', emoji: '♃' },
  { body: Body.Saturn, name: '土星', emoji: '♄' },
];

/**
 * 天体の地心・視黄経(度, of-date)。
 * ※ astronomy-engine の EclipticLongitude は「日心」黄経のため逆行・アスペクトには使えない。
 *   GeoVector(地心)→Ecliptic(その日の真黄道) で地心の視黄経を得る。
 */
export function geoEclipticLongitude(body: Body, date: Date): number {
  return norm360(Ecliptic(GeoVector(body, date, true)).elon);
}

/** ある惑星が now 時点で逆行しているか（地心の視黄経が減少していれば逆行） */
export function isRetrograde(body: Body, now: Date): boolean {
  const l1 = geoEclipticLongitude(body, addHours(now, -12));
  const l2 = geoEclipticLongitude(body, addHours(now, 12));
  return angleDelta(l1, l2) < 0;
}

export interface RetrogradeInfo {
  name: string;
  emoji: string;
  retrograde: boolean;
}

/** 主要5惑星の順行/逆行状態 */
export function planetRetrogrades(now: Date): RetrogradeInfo[] {
  return PLANETS.map((p) => ({
    name: p.name,
    emoji: p.emoji,
    retrograde: isRetrograde(p.body, now),
  }));
}

/** 水星逆行中か（ヘッドライン用） */
export function isMercuryRetrograde(now: Date): boolean {
  return isRetrograde(Body.Mercury, now);
}
