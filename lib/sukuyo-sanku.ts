/**
 * 宿曜・三九の秘法（相性）
 *
 * 本命宿(27宿)どうしの位置差から関係を判定。
 * 27宿を昴起点の並びに置き、位置差 d=(相手−自分+27)%27:
 *   d=0命 / d=9業 / d=18胎、それ以外は各9宿グループ内 index 1..8 に 栄衰安危成壊友親。
 *   近中遠は「本命宿からの最小円距離」の小さい順。
 * 公開実例（本命宿=昴: 栄={畢近,女中,軫遠}, 親={胃近,張中,箕遠}）と一致することを検証済み。
 * ※標準宿曜経準拠。各関係の解説文は将来、小峰有美子氏体系で差替（provenance参照）。
 */
import { SHUKU27 } from './sukuyo';
import { PROVENANCE, type Provenance } from './provenance';
import { SANKU_DESC } from './copy';

const NAMES = SHUKU27.map((s) => s.name);
// グループ内 index 1..8 の関係名
const SEQ = ['', '栄', '衰', '安', '危', '成', '壊', '友', '親'];
// 関係→対（ペア）名
const PAIR: Record<string, string> = {
  栄: '栄親', 親: '栄親',
  衰: '友衰', 友: '友衰',
  安: '安壊', 壊: '安壊',
  危: '成危', 成: '成危',
};
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export interface SankuResult {
  d: number; // 位置差 0-26
  category: string; // 命/業/胎/栄/衰/安/危/成/壊/友/親
  pair: string; // 命/業胎/栄親/友衰/安壊/成危
  distance: '近' | '中' | '遠' | null;
  label: string; // 例: 近距離の栄親 / 命
  note: string;
  provenance: Provenance;
}

/** 自分の本命宿名・相手の本命宿名 → 三九の関係 */
export function sanku(honmeiName: string, otherName: string): SankuResult {
  const hp = NAMES.indexOf(honmeiName);
  const op = NAMES.indexOf(otherName);
  const d = mod(op - hp, 27);

  let category: string;
  let distance: '近' | '中' | '遠' | null = null;

  if (d === 0) category = '命';
  else if (d === 9) category = '業';
  else if (d === 18) category = '胎';
  else {
    const p = ((d - 1) % 9) + 1; // グループ内 index 1..8
    category = SEQ[p];
    // 近中遠：同カテゴリ3位置の最小円距離を昇順に並べ、この d の順位で決定
    const members = [p, p + 9, p + 18];
    const cds = members.map((m) => Math.min(m, 27 - m));
    const sorted = [...cds].sort((a, b) => a - b);
    const rank = sorted.indexOf(Math.min(d, 27 - d));
    distance = (['近', '中', '遠'] as const)[rank];
  }

  const pair = PAIR[category] ?? category;
  const label = distance ? `${distance}距離の${pair}` : category;
  const note = SANKU_DESC[pair] ?? '';
  return { d, category, pair, distance, label, note, provenance: PROVENANCE.sukuyoSanku };
}
