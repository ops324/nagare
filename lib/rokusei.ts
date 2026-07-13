/**
 * 六星占術：運命星（星人±）
 *
 * 星数 = 日干支番号(1-60)。1-10土星人／11-20金星人／21-30火星人／
 * 31-40天王星人／41-50木星人／51-60水星人。±は生まれ暦年の十二支の陰陽。
 * 実例 1985-08-15（星数23＝火星人, 乙丑年＝陰支）→「火星人マイナス」で検証。
 *
 * 運気（種子〜減退）と大殺界（陰影・停止・減退）は 6sei.net 公式（細木数子・かおり）準拠。
 * 星人＝日柱の空亡ペア（土=戌亥,金=申酉,火=午未,天王=辰巳,木=寅卯,水=子丑）。
 * 運気は年支のオフセットで算出し、2026年の公式全12星人±表と一致することを検証済み。
 */
import { dayKanshiIndex } from './koyomi';
import { toJstParts } from './time';
import { PROVENANCE, type Provenance } from './provenance';

const SEIJIN = ['土星人', '金星人', '火星人', '天王星人', '木星人', '水星人'];

export interface Unmeisei {
  seisu: number; // 星数 1-60
  seijin: string; // 例: 火星人
  plus: boolean; // true=＋(陽支), false=−(陰支)
  sign: '＋' | '−';
  label: string; // 例: 火星人−
}

/** 生年月日 → 運命星（星人±） */
export function unmeisei(birthInstant: Date): Unmeisei {
  const seisu = dayKanshiIndex(birthInstant) + 1; // 1-60（干支番号）
  const seijin = SEIJIN[Math.floor((seisu - 1) / 10)];
  // ±は「生まれた暦年」の十二支の陰陽（陽支=子寅辰午申戌=偶数index / 陰支=奇数index）
  const gregYear = toJstParts(birthInstant).year;
  const branch = mod(gregYear - 4, 12); // 暦年の年支（甲子年=4AD）
  const plus = branch % 2 === 0;
  const sign = plus ? '＋' : '−';
  return { seisu, seijin, plus, sign, label: `${seijin}${sign}` };
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// ─────────────── 運気（12運気）と大殺界 ───────────────
export const RUNKI_CYCLE = [
  '種子', '緑生', '立花', '健弱', '達成', '乱気',
  '再会', '財成', '安定', '陰影', '停止', '減退',
] as const;
const DAISAKKAI = new Set([9, 10, 11]); // 陰影・停止・減退
const CHUSAKKAI = 5; // 乱気
const SHOSAKKAI = 3; // 健弱

/** 星人 index(0=土..5=水) → 空亡の第1支の支番号（土10,金8,火6,天王4,木2,水0） */
function b1OfSeijin(seijinIndex: number): number {
  return 10 - 2 * seijinIndex;
}

/** 星人±・年支 → 運気 index(0=種子..11=減退) */
export function runkiIndex(seijinIndex: number, plus: boolean, yearBranch: number): number {
  const b1 = b1OfSeijin(seijinIndex);
  const off = plus ? mod(b1 + 2, 12) : mod(b1 + 3, 12);
  return mod(yearBranch - off, 12);
}

export interface Runki {
  index: number;
  name: string;
  daisakkai: boolean; // 大殺界（陰影・停止・減退）
  chusakkai: boolean; // 中殺界（乱気）
  shosakkai: boolean; // 小殺界（健弱）
  provenance: Provenance;
}

function makeRunki(idx: number): Runki {
  return {
    index: idx,
    name: RUNKI_CYCLE[idx],
    daisakkai: DAISAKKAI.has(idx),
    chusakkai: idx === CHUSAKKAI,
    shosakkai: idx === SHOSAKKAI,
    provenance: PROVENANCE.rokusei,
  };
}

/** 運命星 u の、立春基準の年 year における運気 */
export function runkiForYear(u: Unmeisei, year: number): Runki {
  const seijinIndex = SEIJIN.indexOf(u.seijin);
  const yearBranch = mod(year - 4, 12); // 立春基準の年支（甲子年=4AD）
  return makeRunki(runkiIndex(seijinIndex, u.plus, yearBranch));
}

/** 生年月日 → 指定年の運気 */
export function unmeiseiRunki(birthInstant: Date, year: number): Runki {
  return runkiForYear(unmeisei(birthInstant), year);
}

/** fromYear 以降で大殺界（陰影・停止・減退）に当たる年を count 件（連続する3年を1組として返す） */
export function daisakkaiYears(
  birthInstant: Date,
  fromYear: number,
  count = 6,
): { year: number; name: string }[] {
  const u = unmeisei(birthInstant);
  const out: { year: number; name: string }[] = [];
  for (let y = fromYear; y < fromYear + 40 && out.length < count; y++) {
    const r = runkiForYear(u, y);
    if (r.daisakkai) out.push({ year: y, name: r.name });
  }
  return out;
}
