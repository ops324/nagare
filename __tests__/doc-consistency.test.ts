import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 文書に書かれたテスト件数が、文書どうしで食い違わないようにする。
 *
 * この数字は2回ずれている。
 *  - README「222件」対 AGENTS/SPEC「465件」… しかも 465 は
 *    古い worktree を二重に収集していた偽の数字だった（PR #56 で解消）
 *  - 直後に全文書「235件」対 実際「240件」… #57 と #59 でテストを足したのに
 *    件数を直し忘れた（この検査を足した回）
 *
 * 数字そのものに意味があるのではなく、**合っていないこと自体が兆候**になる。
 * 465 のときは「増えたから充実した」に見えて、実は半分が古いコードを見ていた。
 *
 * ■ この検査の限界
 * 文書**どうし**の一致しか見ない。実際の suite と合っているかは見ない
 * （vitest は自分の総件数を実行中のテストへ渡さない）。
 * テストを足したら文書の数字も直す、という運用は依然として人が担う。
 * それでも「4ファイルのうち1つだけ直し忘れる」形のずれはここで止まる。
 */

const ROOT = join(__dirname, '..');
const DOCS = ['AGENTS.md', 'README.md', 'docs/SPEC.md', 'design.md'];

/** 「〜件」のうち、テスト件数として書かれているものだけを拾う。
 *  **同じ行に別の「件」があるので、行単位で拾ってはいけない**
 *  （SPEC §0 の「5件の欠陥を修正」「5件のうち4件は」を巻き込んで誤検出した）。
 *  `npm test` `Vitest` `参照値テスト` の**直後**に来るものだけを見る。 */
const COUNT = /(?:npm test`?|Vitest|参照値テスト)[^\n]{0,10}?(\d+)\s*件/g;

function testCounts(src: string): number[] {
  return [...src.matchAll(COUNT)].map((m) => Number(m[1]));
}

describe('文書の整合', () => {
  it('テスト件数が全文書で一致している', () => {
    const found = DOCS.flatMap((f) => testCounts(readFileSync(join(ROOT, f), 'utf8')).map((n) => ({ f, n })));
    expect(found.length, 'どの文書にもテスト件数が書かれていない').toBeGreaterThan(0);
    const uniq = [...new Set(found.map((x) => x.n))];
    expect(
      uniq,
      `文書ごとに違う件数が書かれている:\n${found.map((x) => `  ${x.f}: ${x.n}件`).join('\n')}`,
    ).toHaveLength(1);
  });
});
