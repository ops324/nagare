import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ZODIAC } from '../lib/constants';

/**
 * 星座記号がカラー絵文字に戻らないようにする。
 *
 * U+2648〜U+2653（♈〜♓）は **Emoji_Presentation=Yes** で、`font-family` に明朝を
 * 指定していてもカラー絵文字フォントで描かれる。生成りの地に紫のタイルが乗り、
 * アプリで唯一の高彩度・非パレット色になっていた（PR-B で `ZodiacGlyph` に置換）。
 * 惑星記号（☿♀♂♃♄）や ★ ✦ は単色で出るので対象外——実測で確かめてある。
 *
 * 散文の「生の記号を書かない」は守れないが、この検査は守れる。
 */

const ZODIAC_CODEPOINTS = /[♈-♓]/;
const ROOT = join(__dirname, '..');

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const RENDERED = [...tsxFiles(join(ROOT, 'components')), ...tsxFiles(join(ROOT, 'app'))];

/** 注釈は描かれないので外す（`caution-terms.test.ts` と同じ扱い）。
 *  これが無いと「なぜ置き換えたか」を説明した注釈自身が引っかかる。 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const rel = (f: string) => f.slice(ROOT.length + 1);

describe('星座記号', () => {
  it('描画される .tsx に生の ♈〜♓ を書かない', () => {
    expect(RENDERED.filter((f) => ZODIAC_CODEPOINTS.test(code(f))).map(rel)).toEqual([]);
  });

  it('`ZODIAC[].symbol` を描画に使わない（使うと絵文字が戻る）', () => {
    expect(RENDERED.filter((f) => /\.sign\.symbol|\bz\.symbol\b/.test(code(f))).map(rel)).toEqual([]);
  });

  it('12星座すべてに字形がある（欠けると何も描かれない）', () => {
    const src = readFileSync(join(ROOT, 'components/ZodiacGlyph.tsx'), 'utf8');
    const missing = ZODIAC.map((z) => z.name).filter((name) => !new RegExp(`\\n\\s*${name}:`).test(src));
    expect(missing).toEqual([]);
  });
});
