import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * デザイントークンの構造テスト。
 *
 * SPEC §12.6 は「デザイントークンを変えたら同期を確認する」と散文で警告しているが、
 * 散文はCIで守れない。ここでは `app/globals.css` をテキストとして読み、
 * 空4状態・節気24色・五行5色の取りこぼしと、金／曜日／文字下限の作法を機械的に固定する。
 *
 * 占術ロジック（lib/）には一切触れない。壊れたら「バグの合図」なのは §5 と同じ。
 */

const CSS = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');

/** セレクタ直後の宣言ブロック本文を取り出す（ネストは使っていない前提） */
function block(selector: string): string {
  const at = CSS.indexOf(selector);
  expect(at, `セレクタが見つからない: ${selector}`).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf('{', at);
  const close = CSS.indexOf('}', open);
  return CSS.slice(open + 1, close);
}

const SEKKI_KEYS = [
  'risshun', 'usui', 'keichitsu', 'shunbun', 'seimei', 'kokuu',
  'rikka', 'shouman', 'boushu', 'geshi', 'shousho', 'taisho',
  'risshuu', 'shosho', 'hakuro', 'shuubun', 'kanro', 'soukou',
  'rittou', 'shousetsu', 'taisetsu', 'touji', 'shoukan', 'daikan',
];

const LUCKY_KEYS = ['moku', 'ka', 'do', 'kin', 'sui'];

describe('節気の彩（24組）', () => {
  it('二十四節気がすべて定義されている', () => {
    expect(SEKKI_KEYS).toHaveLength(24);
    for (const key of SEKKI_KEYS) {
      expect(CSS, `[data-sekki="${key}"] が無い`).toContain(`[data-sekki="${key}"]`);
    }
  });

  it('各節気が --sekki-l と --sekki-d の両方を持つ（片方だけだと地の明暗で色が消える）', () => {
    for (const key of SEKKI_KEYS) {
      const b = block(`[data-sekki="${key}"]`);
      expect(b, `${key} に --sekki-l が無い`).toContain('--sekki-l:');
      expect(b, `${key} に --sekki-d が無い`).toContain('--sekki-d:');
    }
  });

  it('定義されている節気ブロックは24個ちょうど（重複・余剰が無い）', () => {
    const found = CSS.match(/\[data-sekki="[a-z]+"\]/g) ?? [];
    expect(new Set(found).size).toBe(24);
  });
});

describe('今日の色（五行5色）', () => {
  it('各五行が6変数すべてを持つ', () => {
    const required = [
      '--lucky-l:', '--lucky-d:',
      '--lucky-container-l:', '--on-lucky-container-l:',
      '--lucky-container-d:', '--on-lucky-container-d:',
    ];
    for (const key of LUCKY_KEYS) {
      const b = block(`[data-lucky="${key}"]`);
      for (const v of required) {
        expect(b, `${key} に ${v} が無い`).toContain(v);
      }
    }
  });
});

describe('空の4状態の同期（SPEC §12.6）', () => {
  // 夜=:root / 宵=dusk差分 / 昼・暁=共通ブロック + 暁差分。
  // 操作色は「明るい地では暗い側へ振る」必要があるため、明暗の境をまたぐ
  // ブロックでは必ず上書きされていなければならない。
  const GROUPS: Array<[string, string]> = [
    [':root {', '夜（既定）'],
    ['[data-sky="day"],', '昼・暁の共通ブロック'],
  ];

  it('--primary が明暗それぞれのブロックで定義されている', () => {
    for (const [selector, label] of GROUPS) {
      expect(block(selector), `${label} に --primary が無い`).toContain('--primary:');
    }
  });

  it('--accent-soft が明暗それぞれで定義されている（生成り地では gold-500 側へ振る）', () => {
    expect(block(':root {')).toContain('--accent-soft:');
    // 明るい地の --accent-soft は昼・暁ブロックの内側にある
    const light = block('[data-sky="day"],');
    expect(light, '明るい地で --accent-soft が上書きされていない').toContain('--accent-soft:');
    expect(light, '生成り地の accent-soft は gold-300 では 4.2:1 で AA 未達').toContain(
      '--accent-soft: var(--gold-500)',
    );
  });

  it('4状態すべてのセレクタが存在する', () => {
    expect(CSS).toContain(':root[data-sky="dusk"]');
    expect(CSS).toContain(':root[data-sky="dawn"]');
    expect(CSS).toContain('[data-sky="day"]');
    // 夜は :root が既定
    expect(CSS).toContain('color-scheme: dark');
  });
});

describe('曜日色は操作色から独立（暦の慣習・SPEC §7）', () => {
  it('--weekday-sat / --weekday-sun が --primary や --caution を参照しない', () => {
    const lines = CSS.split('\n').filter((l) => /--weekday-(sat|sun)\s*:/.test(l));
    expect(lines.length, '曜日色の定義が見つからない').toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line, `曜日色が操作色を参照している: ${line.trim()}`).not.toMatch(
        /var\(--(primary|caution|accent)\)/,
      );
    }
  });
});

describe('@property 登録トークン', () => {
  it('--bg-hi / --bg-lo は <color> 構文で登録されている（空のクロスフェードの前提）', () => {
    for (const name of ['--bg-hi', '--bg-lo']) {
      const at = CSS.indexOf(`@property ${name}`);
      expect(at, `@property ${name} が無い`).toBeGreaterThanOrEqual(0);
      const body = CSS.slice(at, CSS.indexOf('}', at));
      expect(body, `${name} の syntax が <color> でない`).toContain('syntax: "<color>"');
    }
  });

  it('--stars は <number> で登録されている', () => {
    const at = CSS.indexOf('@property --stars');
    const body = CSS.slice(at, CSS.indexOf('}', at));
    expect(body).toContain('syntax: "<number>"');
  });
});

describe('タイポグラフィの下限（SPEC §7 = 11px）', () => {
  // 10px の例外は2系統だけ。これ以外に 11px 未満を増やさない。
  //  ①暦セル内（SPEC §7 が明記する例外。7列×6段に日付・六曜・節気・選日印を収めるため）
  //  ②星図の逆行ラベル（背景装飾で、読ませる情報ではない）
  const ALLOWED_MICRO = ['.cal-', '.mk-', '.sf-retro small'];

  it('11px 未満の font-size は許可リストの箇所にしか無い', () => {
    const lines = CSS.split('\n');
    const offenders: string[] = [];

    lines.forEach((line, i) => {
      const m = line.match(/font-size:\s*([\d.]+)(px|rem)/);
      if (!m) return;
      const px = m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
      if (px >= 11) return;

      // 直前の非空行を遡ってセレクタを探す
      let selector = '';
      for (let j = i - 1; j >= 0 && j > i - 12; j--) {
        if (lines[j].includes('{')) {
          selector = lines[j].replace('{', '').trim();
          break;
        }
      }
      if (!ALLOWED_MICRO.some((a) => selector.includes(a))) {
        offenders.push(`${selector || '(不明)'} → ${m[0]}`);
      }
    });

    expect(offenders, `11px 未満が許可リスト外にある:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('スケールトークンの土台', () => {
  it('余白スケールが11段そろっている', () => {
    for (const step of ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']) {
      expect(CSS, `--sp-${step} が無い`).toContain(`--sp-${step}:`);
    }
  });

  it('文字スケールと行間・字送りが定義されている', () => {
    for (const t of [
      '--fs-micro', '--fs-caption', '--fs-body-s', '--fs-body', '--fs-body-l',
      '--fs-title', '--fs-headline', '--fs-display', '--fs-hero', '--fs-score',
      '--lh-tight', '--lh-snug', '--lh-body', '--lh-loose',
      '--tr-tight', '--tr-wide', '--tr-wider', '--tr-widest',
    ]) {
      expect(CSS, `${t} が無い`).toContain(`${t}:`);
    }
  });

  it('ヴェール・髪の毛線・ぼかし・レイアウト幅が定義されている', () => {
    for (const t of [
      '--veil-card', '--veil-filled', '--veil-chrome', '--veil-nav', '--veil-toast',
      '--hairline', '--hairline-soft', '--hairline-strong',
      '--blur-sm', '--blur-md', '--blur-lg', '--blur-xl',
      '--shell-max', '--column-max', '--column-max-wide', '--rail-w', '--appbar-max', '--nav-h',
    ]) {
      expect(CSS, `${t} が無い`).toContain(`${t}:`);
    }
  });

  it('--fs-score は現行値のまま（金の聖域は据え置く）', () => {
    expect(CSS).toContain('--fs-score: clamp(3.4rem, 15vw, 4.2rem)');
  });
});
