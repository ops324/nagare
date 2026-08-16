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

const LINES = CSS.split('\n');

/** その行が属するセレクタ（直前の `{` を持つ行）を遡って探す。
    複数行の linear-gradient() を挟むと宣言はセレクタから 20 行近く離れるので、
    遡り幅は広めに取る（`{` を含む行は事実上セレクタ／アットルールの開きだけ）。
    `.x { … }` の**一行規則**は自分の行にセレクタがあるので先に見る
    （遡ると直前の別規則を拾い、検査がすり抜ける）。 */
function selectorOf(i: number): string {
  const self = LINES[i].indexOf('{');
  if (self >= 0) return LINES[i].slice(0, self).trim();
  for (let j = i - 1; j >= 0 && j > i - 40; j--) {
    if (LINES[j].includes('{')) return LINES[j].replace('{', '').trim();
  }
  return '(不明)';
}

/** `@media (...) {` 等の**アットルール本体**を波括弧の対応で切り出す（入れ子可） */
function atRuleBody(header: string): string {
  const at = CSS.indexOf(header);
  expect(at, `アットルールが見つからない: ${header}`).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    else if (CSS[i] === '}' && --depth === 0) return CSS.slice(open + 1, i);
  }
  throw new Error(`閉じ括弧が見つからない: ${header}`);
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

describe('prefers-reduced-motion の担保', () => {
  const at = () => {
    const i = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(i, 'reduced-motion ブロックが無い').toBeGreaterThanOrEqual(0);
    // ネストした宣言ブロックを跨ぐので、次のトップレベル閉じ括弧まで取る
    return CSS.slice(i, CSS.indexOf('\n}', i));
  };

  it('アニメーションと transition の両方を止める', () => {
    const b = at();
    expect(b).toContain('animation-duration: 0.001ms !important');
    // transition を止め忘れると、ナビの活性ピルなどが reduced-motion でも動く
    expect(b, 'transition が止まっていない').toContain('transition-duration: 0.001ms !important');
  });

  it('疑似要素にも効かせている', () => {
    const b = at();
    expect(b).toContain('*::before');
    expect(b).toContain('*::after');
  });
});

/**
 * 硝子は「読み手と本文のあいだに割り込む層」＋ひとことカードだけに許す素材で、
 * 面の既定は紙のまま（design.md）。散文で「限定的に使う」と書いても守れないので、
 * **許可した面の一覧そのもの**をここで固定する。増やすときはこの配列を編集する
 * ＝ PR の差分に必ず現れる、という運用にする。
 */
/**
 * 硝子を許した面。
 *
 * PR #50 では「硝子は読み手と本文のあいだに割り込む層のもの、紙は本文そのもの」として
 * クローム3層＋ひとことの4面に限っていたが、**PR-E で本文の面（`.card` と
 * `.lucky-action`）も硝子にした**。材料の法は design.md 側で書き換えてある。
 *
 * 面が増えたぶん「許可した面にしか無い」検査の締める力は落ちる。ただし対になっている
 * 「許可した面はすべて実際に硝子」「非対応ブラウザ向けの不透明退避がある」の2本は
 * 価値がそのまま残るので維持する（退避の漏れは可読性の事故に直結する）。
 */
const GLASS_SURFACES = [
  '.appbar',
  '.navbar-inner',
  '.appbar-toast',
  '.hitokoto',
  '.card',
  '.lucky-action',
];

describe('硝子（限定素材）', () => {
  it('backdrop-filter は許可した面にしか無い（全面ガラス化の防止）', () => {
    const offenders: string[] = [];
    LINES.forEach((line, i) => {
      if (!/^\s*backdrop-filter\s*:/.test(line)) return;
      // `none` は硝子を**外す**宣言なので、広がりの検査の対象ではない
      // （`.chip` のように `.card` を継いだ面が段として硝子を脱ぐために要る）。
      if (/^\s*backdrop-filter\s*:\s*none\s*;?\s*$/.test(line)) return;
      const selector = selectorOf(i);
      if (!GLASS_SURFACES.some((s) => selector.includes(s))) {
        offenders.push(`${selector} → ${line.trim()}`);
      }
    });
    expect(
      offenders,
      `硝子が許可外の面へ広がっている:\n${offenders.join('\n')}\n` +
        '意図的に増やすなら GLASS_SURFACES と design.md を同時に直すこと',
    ).toEqual([]);
  });

  it('許可した面はすべて実際に硝子になっている（一覧の腐敗防止）', () => {
    for (const s of GLASS_SURFACES) {
      const used = LINES.some(
        (l, i) => /^\s*backdrop-filter\s*:/.test(l) && selectorOf(i).includes(s),
      );
      expect(used, `${s} が GLASS_SURFACES にあるのに backdrop-filter を持たない`).toBe(true);
    }
  });

  it('-webkit-backdrop-filter を宣言として手書きしない', () => {
    // 標準プロパティを先・-webkit- を後に書くと Lightning CSS は標準側を落とす。
    // その結果 unprefixed しか解さない Firefox で「ぼかし無しの半透明」になる。
    // 前置はビルドに任せるのが正しく、手書きは事故の再発そのもの。
    const offenders = LINES.map((l, i) => [l, i] as const)
      .filter(([l]) => /^\s*-webkit-backdrop-filter\s*:/.test(l))
      .map(([l, i]) => `${i + 1}行目: ${l.trim()}`);
    expect(
      offenders,
      `-webkit-backdrop-filter は手で書かない（ビルドが前置する）:\n${offenders.join('\n')}`,
    ).toEqual([]);
    // ただし @supports の**条件**側は Safari 17 以前を拾うため両方必要
    expect(CSS, '@supports の条件から -webkit- が消えると Safari 17 以前で退避が誤発火する').toContain(
      '(-webkit-backdrop-filter: blur(1px))',
    );
  });

  it('backdrop-filter 非対応ブラウザ向けに不透明の退避がある（可読性の担保）', () => {
    const at = CSS.indexOf('@supports not (');
    expect(at, '硝子の退避ブロックが無い').toBeGreaterThanOrEqual(0);
    const body = atRuleBody('@supports not (');
    for (const s of GLASS_SURFACES) {
      expect(body, `${s} の退避が無い（半透明のまま本文が下を走る）`).toContain(s);
    }
    // 退避先は必ず不透明。透過を含むトークンへ逃がしたら意味がない
    expect(body).toMatch(/--glass-solid-hi|--lucky-wash/);
  });

  /**
   * **退避は「存在」ではなく「勝つこと」が要る。**
   *
   * 退避の規則も硝子面の規則も詳細度は 0,1,0 で同点。同点なら後に書いたほうが勝つので、
   * 退避がファイルの途中にあると、それより下で定義された硝子面には一切効かない。
   * PR-E の初版が実際にこれで、`.lucky-action`（当時 2048 行）の退避が
   * `@supports not`（2018 行）より後ろにあったため**死んでいた**。
   * 非対応ブラウザで本文が流れ線と星の上を素通しで走る、という退避が防ぐはずの事故そのもの。
   *
   * 上の「退避がある」検査は本文に文字列が含まれるかしか見ないので、これを素通しした。
   */
  it('退避ブロックは最後の硝子面より後にある（同点なら後勝ちなので位置が仕様）', () => {
    const at = CSS.indexOf('@supports not (');
    const late: string[] = [];
    LINES.forEach((line, i) => {
      if (!/^\s*backdrop-filter\s*:/.test(line)) return;
      if (/^\s*backdrop-filter\s*:\s*none\s*;?\s*$/.test(line)) return;
      // その宣言がファイル先頭から何文字目か
      const offset = LINES.slice(0, i).reduce((n, l) => n + l.length + 1, 0);
      if (offset > at) late.push(`${selectorOf(i)}（${i + 1} 行目）`);
    });
    expect(
      late,
      `退避ブロックより後で硝子になっている面がある:\n${late.join('\n')}\n` +
        '退避は同じ詳細度なので、後ろにある面には効かない。ブロックをファイル末尾へ移すこと',
    ).toEqual([]);
  });

  /** 退避の中では `.card` を先に置く。`.hitokoto` と `.chip` は `class="card …"` なので、
   *  `.card` が後ろにあると段の区別（面を持つ／持たない）を上書きしてしまう。 */
  it('退避の中で .card は .hitokoto / .chip より前にある', () => {
    const body = atRuleBody('@supports not (');
    const card = body.indexOf('.card');
    for (const s of ['.hitokoto', '.chip']) {
      const i = body.indexOf(s);
      expect(i, `${s} の退避が無い`).toBeGreaterThanOrEqual(0);
      expect(card, `退避の中で .card が ${s} より後ろにある（段の区別を潰す）`).toBeLessThan(i);
    }
  });

  it('硝子トークンが夜と昼の両方で定義されている（片方だけだと地の明暗で破綻する）', () => {
    for (const t of ['--glass-blur', '--glass-sat', '--glass-edge', '--glass-rim', '--glass-cast']) {
      expect(CSS, `${t} が無い`).toContain(`${t}:`);
    }
    // 空の明暗をまたぐと「縁が拾う光」と「落ち影」は反転する必要がある
    const light = block('[data-sky="day"],');
    for (const t of ['--glass-edge', '--glass-cast', '--glass-sat']) {
      expect(light, `明るい地で ${t} が上書きされていない`).toContain(`${t}:`);
    }
  });
});

/**
 * ボタンは「和紙と金箔」の中で最後まで Material 3 のままだった場所で、
 * 放っておくと元へ戻る（filled / outlined / text / segmented / icon の5型と、
 * hover で地を 8% 洗う**ステートレイヤー**）。
 * design.md「触れると静かに応える — 浮き上がりと発光は使わず、縁と罫だけが
 * 反応する」を、散文ではなく破ると落ちる形にして固定する。
 */
const BUTTONS = ['.cta', '.reset', '.disclose', '.seg-btn', '.cal-nav', '.appbar-share', '.navbar-item'];

describe('ボタンの語彙（縁と罫だけが反応する）', () => {
  it('M3 のステートレイヤー（地を 8% 洗う）がどこにも無い', () => {
    const offenders = LINES.map((l, i) => [l, i] as const)
      .filter(([l]) => /color-mix\(in srgb, var\(--(on-surface|primary)\) 8%/.test(l))
      .map(([l, i]) => `${i + 1}行目: ${selectorOf(i)} → ${l.trim()}`);
    expect(
      offenders,
      `hover で地を洗うのは M3 の語彙。縁と罫で応えること:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('ボタンの :hover は地を塗らない', () => {
    const offenders: string[] = [];
    LINES.forEach((line, i) => {
      if (!/background(-color|-image)?\s*:/.test(line)) return;
      const selector = selectorOf(i);
      if (!selector.includes(':hover')) return;
      if (BUTTONS.some((b) => selector.includes(b))) {
        offenders.push(`${selector} → ${line.trim()}`);
      }
    });
    expect(offenders, `ボタンの hover が地を塗っている:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('伸縮（scale）で押した感じを出さない — 紙は縮まず沈む', () => {
    const offenders: string[] = [];
    LINES.forEach((line, i) => {
      if (!/transform:\s*scale\(/.test(line)) return;
      const selector = selectorOf(i);
      if (selector.includes(':active')) offenders.push(`${selector} → ${line.trim()}`);
    });
    expect(offenders, `押下は translateY で表す（伸縮はゴムの語彙）:\n${offenders.join('\n')}`).toEqual(
      [],
    );
  });
});

/**
 * 箔の上を渡る反射は「発光ではなく箔」（design.md §祝祭）の語彙だが、
 * 面という面が光り出したら意味を失う。**使ってよい面の一覧**を固定する。
 */
const SHIMMER_SURFACES = ['.hitokoto-shimmer::after', '.cta:hover:not(:disabled)::after'];

describe('反射（shimmer）は限定', () => {
  it('shimmer を呼ぶのは許可した面だけ', () => {
    const offenders: string[] = [];
    LINES.forEach((line, i) => {
      if (!/animation:\s*shimmer\b/.test(line)) return;
      const selector = selectorOf(i);
      if (!SHIMMER_SURFACES.some((s) => selector.includes(s))) {
        offenders.push(`${selector} → ${line.trim()}`);
      }
    });
    expect(
      offenders,
      `反射が許可外の面へ広がっている:\n${offenders.join('\n')}\n` +
        '増やすなら SHIMMER_SURFACES と design.md を同時に直すこと',
    ).toEqual([]);
  });

  it('許可した面はすべて実際に反射を持つ（一覧の腐敗防止）', () => {
    for (const s of SHIMMER_SURFACES) {
      const used = LINES.some(
        (l, i) => /animation:\s*shimmer\b/.test(l) && selectorOf(i).includes(s),
      );
      expect(used, `${s} が SHIMMER_SURFACES にあるのに shimmer を持たない`).toBe(true);
    }
  });
});

describe('スクロール連動のリビール', () => {
  it('animation-timeline は reduced-motion の外（no-preference）にしか無い', () => {
    // タイムライン駆動の animation は、全域のキルスイッチ（animation-duration: 0.001ms）
    // では終端へ飛ばず**進度0の姿＝透明で固まりうる**。規則ごと出さないのが唯一安全。
    const uses = LINES.map((l, i) => [l, i] as const).filter(([l]) =>
      /^\s*animation-timeline\s*:/.test(l),
    );
    expect(uses.length, 'animation-timeline の使用が見つからない').toBeGreaterThan(0);

    const guarded = atRuleBody('@media (prefers-reduced-motion: no-preference)');
    for (const [line, i] of uses) {
      expect(
        guarded,
        `${i + 1}行目の animation-timeline が no-preference の外にある: ${line.trim()}`,
      ).toContain(line.trim());
    }
  });

  it('view() を使う規則は @supports で囲ってある（未対応ブラウザでは「何も起きない」）', () => {
    const guarded = atRuleBody('@media (prefers-reduced-motion: no-preference)');
    expect(guarded, 'view() が機能クエリで囲われていない').toContain(
      '@supports (animation-timeline: view())',
    );
  });

  it('リビールは .rise（マウント時の立ち上がり）と二重掛けにならない', () => {
    // 面のクラスをリビール対象にするなら必ず :not(.rise) を伴う。
    // クラス名を直書きせず「面らしいセレクタ」を拾うので、面の呼び名が変わっても効く。
    const guarded = atRuleBody('@media (prefers-reduced-motion: no-preference)');
    const surfaces = (guarded.match(/^\s*\.(card|flowcard|chip)[\w-]*[^,{\n]*/gm) ?? []).map((s) =>
      s.trim(),
    );
    expect(surfaces.length, 'リビール対象に面のセレクタが見つからない').toBeGreaterThan(0);
    for (const s of surfaces) {
      expect(s, `${s} が :not(.rise) を伴っていない（マウント時の立ち上がりと二重に掛かる）`).toContain(
        ':not(.rise)',
      );
    }
  });
});

describe('デスクトップ（三ゾーン「柱・流れ・空」）', () => {
  it('ブレークポイントが3段そろっている', () => {
    // 1024=柱＋流れの二ゾーン / 1280=空を開いて三ゾーン / 1440=レールに余白を足す
    for (const bp of [1024, 1280, 1440]) {
      expect(CSS, `@media (min-width: ${bp}px) が無い`).toContain(`@media (min-width: ${bp}px)`);
    }
  });

  it('レール幅はモバイルで 0・デスクトップで 88px', () => {
    expect(CSS).toContain('--rail-w: 0px');
    expect(CSS).toContain('--rail-w: 88px');
  });

  it('右の「空」は 1280px 未満では出さない（64〜128px の“詰まり”を避ける）', () => {
    // 既定は display:none。1280 ブロックの中だけで block に戻す。
    expect(CSS).toMatch(/\.skyzone\s*\{\s*display:\s*none/);
    const at = CSS.indexOf('@media (min-width: 1280px)');
    expect(at).toBeGreaterThanOrEqual(0);
    const block = CSS.slice(at, CSS.indexOf('@media (min-width: 1440px)'));
    expect(block, '1280 ブロックで .skyzone が block に戻っていない').toContain('display: block');
  });
});
