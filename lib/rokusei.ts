/**
 * 六星占術：運命星（星人±）
 *
 * 星数 = 日干支番号(1-60)。1-10土星人／11-20金星人／21-30火星人／
 * 31-40天王星人／41-50木星人／51-60水星人。±は生まれ暦年の十二支の陰陽。
 * 実例 1985-08-15（星数23＝火星人, 乙丑年＝陰支）→「火星人マイナス」で検証。
 * ※大殺界の年（陰影・停止・減退）は運気アンカーの確定後に追加予定。
 */
import { dayKanshiIndex } from './koyomi';
import { toJstParts } from './time';

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
