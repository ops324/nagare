/**
 * 宿曜占星術：本命宿（27宿）と今日の宿
 *
 * 伝統的な旧暦ベースの方式：各旧暦月の朔日宿から、旧暦の日数分だけ27宿を進める。
 * 実例 1986-10-19（旧暦9月16日, 朔日宿=氐）→ 氐(13)+15=28→mod27=1→畢宿 で検証。
 * ※27宿・旧暦表方式を採用（起点は昴宿）。相性の詳細（三九の秘法）は今後、設計者の方式で。
 */
import { kyureki } from './koyomi';

// 27宿（昴起点の循環順）
export interface Shuku {
  name: string; // 例: 昴
  full: string; // 例: 昴宿
  yomi: string; // 例: ぼう
}
const NAMES = ['昴', '畢', '觜', '参', '井', '鬼', '柳', '星', '張', '翼', '軫', '角', '亢', '氐', '房', '心', '尾', '箕', '斗', '女', '虚', '危', '室', '壁', '奎', '婁', '胃'];
const YOMI = ['ぼう', 'ひつ', 'し', 'しん', 'せい', 'き', 'りゅう', 'せい', 'ちょう', 'よく', 'しん', 'かく', 'こう', 'てい', 'ぼう', 'しん', 'び', 'き', 'と', 'じょ', 'きょ', 'き', 'しつ', 'へき', 'けい', 'ろう', 'い'];
export const SHUKU27: Shuku[] = NAMES.map((name, i) => ({ name, full: `${name}宿`, yomi: YOMI[i] }));

// 旧暦月(1-12) → 朔日(1日)の宿名
const SAKUJITSU: Record<number, string> = {
  1: '室', 2: '奎', 3: '胃', 4: '畢', 5: '参', 6: '鬼',
  7: '張', 8: '角', 9: '氐', 10: '心', 11: '斗', 12: '虚',
};

function indexOfShuku(name: string): number {
  return NAMES.indexOf(name);
}

/** ある日の宿（旧暦の朔日宿から日数分進める） */
export function shukuOf(instant: Date): Shuku {
  const k = kyureki(instant);
  const sakuIndex = indexOfShuku(SAKUJITSU[k.month]);
  const idx = (((sakuIndex + (k.day - 1)) % 27) + 27) % 27;
  return SHUKU27[idx];
}

/** 生年月日 → 本命宿 */
export function honmeishuku(birthInstant: Date): Shuku {
  return shukuOf(birthInstant);
}

/** 今日の宿（本命宿と同じ日なら「命の日」） */
export function todayShuku(now: Date, honmei: Shuku): { shuku: Shuku; isMeinichi: boolean } {
  const s = shukuOf(now);
  return { shuku: s, isMeinichi: s.name === honmei.name };
}
