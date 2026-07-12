/**
 * 生年月日プロフィール → 個人の固定情報（太陽星座・本命星・干支）
 */
import type { BirthProfile, Gender } from './types';
import { jstToInstant } from './time';
import { sunSign, type SignResult } from './astro';
import { honmeisei, risshunYear } from './kyusei';
import { yearKanshi, dayKanshi, type Kanshi } from './koyomi';
import type { Kyusei } from './constants';

export interface Profile {
  birth: BirthProfile;
  birthInstant: Date;
  /** 出生時刻が入力されているか（星座カスプ・命式精度の注記に使う） */
  hasTime: boolean;
  gender: Gender;
  sun: SignResult;
  honmei: Kyusei;
  risshunYear: number;
  /** 生まれ年の干支（立春基準） */
  yearKanshi: Kanshi;
  /** 生まれた日の干支（日柱） */
  dayKanshi: Kanshi;
}

/** BirthProfile → 出生インスタント（JST）。時刻が無ければ正午を代表点にする。 */
export function birthToInstant(birth: BirthProfile): Date {
  const [y, m, d] = birth.date.split('-').map(Number);
  let hh = 12;
  let mm = 0;
  if (birth.time) {
    const [a, b] = birth.time.split(':').map(Number);
    if (Number.isFinite(a)) hh = a;
    if (Number.isFinite(b)) mm = b;
  }
  return jstToInstant(y, m, d, hh, mm);
}

export function buildProfile(birth: BirthProfile): Profile {
  const birthInstant = birthToInstant(birth);
  const ry = risshunYear(birthInstant);
  return {
    birth,
    birthInstant,
    hasTime: Boolean(birth.time),
    gender: birth.gender ?? '未回答',
    sun: sunSign(birthInstant),
    honmei: honmeisei(birthInstant),
    risshunYear: ry,
    yearKanshi: yearKanshi(ry),
    dayKanshi: dayKanshi(birthInstant),
  };
}
