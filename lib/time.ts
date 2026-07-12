/**
 * 時刻・日付ユーティリティ
 *
 * 暦注・命術はすべて日本標準時（JST = UTC+9, サマータイム無し）の「暦日」で判定する。
 * astronomy-engine は UTC(JS Date のインスタント)で計算するため、
 * ここで「インスタント ⇄ JST暦日」の変換を一手に引き受ける。
 */

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface JstParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0=日 .. 6=土
}

/** インスタント(Date) → JSTの暦要素 */
export function toJstParts(instant: Date): JstParts {
  const t = new Date(instant.getTime() + JST_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

/** JSTの暦時刻 → インスタント(Date) */
export function jstToInstant(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS);
}

/** JST暦日の正午(12:00)のインスタント。暦日判定の代表点として使う。 */
export function jstNoon(year: number, month: number, day: number): Date {
  return jstToInstant(year, month, day, 12, 0);
}

export function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 86400000);
}

export function addHours(instant: Date, hours: number): Date {
  return new Date(instant.getTime() + hours * 3600000);
}

/**
 * ユリウス通日(整数)。プロレプティック・グレゴリオ暦の暦日から算出。
 * 干支・六曜など「日数の周期」を数えるための単調増加する日番号として用いる。
 */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** インスタントが属するJST暦日のユリウス通日 */
export function jstJdn(instant: Date): number {
  const p = toJstParts(instant);
  return julianDayNumber(p.year, p.month, p.day);
}

/** 2つのインスタントの「JST暦日」差(日数, b - a) */
export function jstDayDiff(a: Date, b: Date): number {
  return jstJdn(b) - jstJdn(a);
}

/** 角度を 0..360 に正規化 */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 2角度の符号付き最小差 (b - a) を -180..180 で返す */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
