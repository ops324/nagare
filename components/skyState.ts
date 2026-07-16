/**
 * 空の状態（実時刻 → dawn | day | dusk | night）
 * 「星霜」デザインの昼夜軸。東京基準の太陽高度から空の4状態を判定し、
 * html[data-sky] で全トークンが切り替わる。アプリはJST固定のため基準点は東京。
 * lib/ には触れず astronomy-engine を直接使う（UI層専用ヘルパー）。
 */
import { Body, Equator, Horizon, Observer } from 'astronomy-engine';

export type SkyKey = 'dawn' | 'day' | 'dusk' | 'night';

const TOKYO = new Observer(35.6812, 139.7671, 40);

/** 太陽高度（度）。市民薄明の -6° と +6° を境に4状態へ。 */
export function sunAltitude(date: Date): number {
  const eq = Equator(Body.Sun, date, TOKYO, true, true);
  return Horizon(date, TOKYO, eq.ra, eq.dec, 'normal').altitude;
}

/**
 * 実時刻 → 空の状態。
 * `:root[data-theme]` の上書き（dark→night / light→day）は呼び出し側
 * （SkyField と layout の no-FOUC スクリプト）で解決する。
 */
export function skyStateOf(date: Date): SkyKey {
  const alt = sunAltitude(date);
  if (alt < -6) return 'night';
  if (alt >= 6) return 'day';
  // 薄明帯：JST 正午より前なら夜明け、後なら夕暮れ
  const jstHour = (date.getUTCHours() + 9) % 24;
  return jstHour < 12 ? 'dawn' : 'dusk';
}

/** 星の見え方（SkyField の濃度係数）。CSS 側の --stars と一致させる。 */
export const SKY_STARS: Record<SkyKey, number> = {
  night: 1,
  dusk: 0.55,
  dawn: 0.3,
  day: 0,
};
