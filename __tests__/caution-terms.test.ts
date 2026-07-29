import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 注意期間の呼び名の構造テスト。
 *
 * 「大殺界」「天中殺」「八方塞がり」等の流派の原語は、事典タブでだけ出す。
 * 通常の画面は lib/copy.ts の CAUTION_COPY（title / short）を参照する。
 * これは散文の方針では守れないので、ファイルを走査して機械的に固定する。
 *
 * 占術ロジック（判定・スコア・年の境界）には一切触れない。ここで壊れるのは
 * 「言い換えの経路を通さずに原語を直接書いた」という合図だけ。
 */

const ROOT = process.cwd();

/** 流派の原語。画面に直接書いてはいけない語 */
const RAW_TERMS = ['大殺界', '中殺界', '小殺界', '天中殺', '八方塞がり', '厄年'];

/** 原語を出してよい唯一の場所 */
const ALLOWED = ['components/Jiten.tsx'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** JSX のテキスト・文字列リテラルだけを見たいので、行コメント／ブロックコメントは落とす */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('注意期間の呼び名', () => {
  const files = [...walk(join(ROOT, 'components')), ...walk(join(ROOT, 'app'))];

  it('走査対象のファイルが見つかる', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(RAW_TERMS)('「%s」は事典タブ以外の画面に直接書かれていない', (term) => {
    const hits = files
      .map((f) => ({ rel: relative(ROOT, f), src: stripComments(readFileSync(f, 'utf8')) }))
      .filter(({ rel }) => !ALLOWED.includes(rel))
      .filter(({ src }) => src.includes(term))
      .map(({ rel }) => rel);

    expect(
      hits,
      `${term} が直接書かれている。lib/copy.ts の CAUTION_COPY を参照すること`,
    ).toEqual([]);
  });

  it('事典タブは原語を出す（対応表として引けること）', () => {
    const src = readFileSync(join(ROOT, 'components', 'Jiten.tsx'), 'utf8');
    expect(src).toContain('c.term');
  });
});
