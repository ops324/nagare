/**
 * 四柱推命：命式（年・月・日・時柱）と空亡（天中殺）
 *
 * 年柱は立春基準、月柱は節入り＋五虎遁、日柱は日干支、時柱は五鼠遁。
 * 実例（1987-06-10 01:00 → 丁卯・丙午・庚寅・丁丑）で全4柱を検証済み。
 * ※ 経度・均時差の補正は行わない（JSTの時計時刻を使用）。子刻の日跨ぎも正子基準。
 */
import {
  yearKanshi,
  dayKanshi,
  dayKanshiIndex,
  setsugetsuBranch,
  kanshiFromIndex,
  kanshiIndexFromStemBranch,
  type Kanshi,
} from './koyomi';
import { risshunYear } from './kyusei';
import { JUNISHI } from './constants';
import { toJstParts } from './time';

/** 五虎遁：年干 → 寅月の月干。月支の順(寅=0..)に応じて加算。 */
function monthStem(yearStem: number, monthBranch: number): number {
  const toraStem = (2 + 2 * (yearStem % 5)) % 10; // 甲己→丙, 乙庚→戊, 丙辛→庚, 丁壬→壬, 戊癸→甲
  const order = ((monthBranch - 2) % 12 + 12) % 12; // 寅=0, 卯=1, ...
  return (toraStem + order) % 10;
}

/** 時刻(0-23) → 時支 index（子=23:00-00:59） */
export function hourBranchOf(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

/** 五鼠遁：日干 → 子刻の時干。時支を加算。 */
function hourStem(dayStem: number, hourBranch: number): number {
  const neStem = (2 * (dayStem % 5)) % 10; // 甲己→甲, 乙庚→丙, 丙辛→戊, 丁壬→庚, 戊癸→壬
  return (neStem + hourBranch) % 10;
}

export interface Tenchusatsu {
  branches: [number, number];
  name: string; // 例: 午未天中殺
}

/** 日柱の干支 index → 空亡（天中殺） */
export function tenchusatsuOf(dayIndex: number): Tenchusatsu {
  const jun = Math.floor(((dayIndex % 60) + 60) % 60 / 10); // 旬 0-5
  const first = (((10 - 2 * jun) % 12) + 12) % 12;
  const second = (first + 1) % 12;
  return { branches: [first, second], name: `${JUNISHI[first]}${JUNISHI[second]}天中殺` };
}

export interface Meishiki {
  year: Kanshi;
  month: Kanshi;
  day: Kanshi;
  hour: Kanshi | null; // 出生時刻が無ければ null
  dayMaster: string; // 日主（日干）
  tenchusatsu: Tenchusatsu;
}

/** 生年月日時 → 命式 */
export function meishiki(birthInstant: Date, hasTime: boolean): Meishiki {
  const year = yearKanshi(risshunYear(birthInstant));
  const monthBranch = setsugetsuBranch(birthInstant);
  const mStem = monthStem(year.stem, monthBranch);
  const month = kanshiFromIndex(kanshiIndexFromStemBranch(mStem, monthBranch));
  const day = dayKanshi(birthInstant);

  let hour: Kanshi | null = null;
  if (hasTime) {
    const h = toJstParts(birthInstant).hour;
    const hb = hourBranchOf(h);
    const hs = hourStem(day.stem, hb);
    hour = kanshiFromIndex(kanshiIndexFromStemBranch(hs, hb));
  }

  return {
    year,
    month,
    day,
    hour,
    dayMaster: day.stemName,
    tenchusatsu: tenchusatsuOf(dayKanshiIndex(birthInstant)),
  };
}
