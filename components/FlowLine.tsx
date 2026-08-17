'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * 流れ線 — 「星霜」の背骨。タブの全高を一本の金の線が節気色→金→節気色の
 * グラデで緩やかに蛇行しながら降りる。二層構成（design.md「和紙と金箔」）：
 *   fl-halo … 太めの輪郭を強くぼかした暈（かさ）。常に全長見えていて流路を予感させる
 *   fl-line … 可変幅の細い塗り。スクロールで下へ置かれてゆく
 *
 * **均一な stroke-width をやめ、可変幅の塗りにしている**のが要点。均一ストロークは
 * 「SVG のデフォルト」という機械臭そのもので、ここを直すと質が変わる。幅は書の
 * 入り・抜きに沿い、同じ mulberry32 シードによる低周波のゆらぎを乗せて
 * 「手で継いだ痕」を出す（決定論的なので描画は毎回同一）。
 *
 * 鋭い艶（specular）は置かない。最大 2.6px では潰れて安っぽくなるため、
 * 金属感はグラデ内の明るい帯だけで出す。
 *
 * 親（.shell = position:relative／デスクトップは .column）の全面に敷く装飾レイヤー。
 * 今日タブではフローメーターの下から始まり、ゲージに被らない。
 * amp（0..1・今日のスコア等）が蛇行の振幅を決める。reduced-motion では常に全描画。
 *
 * ── PR #55 で直したこと ────────────────────────────────────────
 * ① **先端が画面の外に固定されていた。** 進度 `(innerHeight - top) / height` は
 *    「画面の下端がリボンのどこに当たるか」を返す式なので、そこへマスクを合わせると
 *    先端は定義上いつも画面の下端に来る。実測でも 4 つの送り位置すべてで画面上 812px
 *    ＝下端ちょうどだった。つまり**二層の仕掛けが一度も上演されていなかった** ——
 *    金が置かれる瞬間も、暈だけが先行する予感も、誰も見ていない。先端を窓の
 *    `FRONT` の位置まで引き上げる（末尾では全長へ戻す）。
 * ② **矩形マスクの下端は水平の切り口。** ①で窓の中へ来た途端に露出するので、
 *    マスクをグラデにして最後の `TIP_MIN` px を暈へ溶かす＝書でいう**抜き**。
 * ③ **送りの速さが形に出ない。** 速く送れば穂先は細く長く抜け、止まれば墨が溜まる。
 * ④ **金が「塗り」に見える。** 箔は正方形を継ぐので継ぎ目（箔足）が見える。
 *    艶の段として重ね、暈は墨の重いところで余分に滲ませる。
 * ⑤ **蛇行が本文を知らなかった。** 節を容器の高さで刻んでいたので、章題を横切るか
 *    どうかが偶然だった。**章と章のあいだの余白で列を渡る**（`flowPath` の gaps 経路）。
 * ⑥ **起点が列の中央＝意味が無い。** ワードマークの金の「れ」の直下から降ろす。
 */

/** 暈の最大幅。ぼかして淡く敷くので線より太い */
const HALO_W = 6.2;
/** 金線の最大幅。細く、上品に */
const LINE_W = 2.6;
/** 輪郭のサンプル数。リサイズ時のみ走るので毎フレームの負荷にはならない */
const SAMPLES = 150;

/**
 * 先端を窓のどこに置くか。**1 は「画面の下端」＝旧実装で、誰にも見えない位置**。
 * 0.76 だと下の 24% が暈だけの区間になり、そこが「これから金が置かれる道」になる。
 * 下部ナビ（118px ＋ セーフエリア）より上に来ることが条件で、
 * 812px の画面なら引き上げ量は 195px ＝ ナビの上に十分余裕がある。
 */
const FRONT = 0.76;
/** 抜きの長さ（px）。止まっているときの値 */
const TIP_MIN = 140;
/** 送りが最速のときに抜きへ足す長さ（px） */
const TIP_GAIN = 130;
/** 箔一枚ぶん（px）。継ぎ目はこの間隔で入る */
const LEAF_SHEET = 210;
/** 暈のゆらぎ追従を線より強める指数＝墨の多いところで余計に滲む（比例より速く広がる） */
const BLEED_POW = 2.6;

/**
 * 照り — 箔は拡散した空の鏡なので、**見る位置が変われば光る場所も変わる**。
 * グラデ内の明るい帯（`--gold-100` @ 0.63）はページ空間に固定されていて、
 * 金属なのに動いても光り方が変わらなかった。帯の中心を送りに**遅れて**追随させる。
 *
 * 数値は主CTAの箔押しで決めた作法をそのまま使う（design.md「反射は広く弱く」）。
 * **帯幅は画面の 40%・濃さ 0.13。祝祭（.hitokoto-shimmer の 20% / 0.30）より
 * 必ず広く弱く保つこと** —— 線は常に画面にあり、祝祭は年に数度の合図なので、
 * ここが同じ強さだと祝祭の側が意味を失う。design-tokens.test.ts が両方を固定する。
 */
export const SHEEN_ALPHA = 0.13;
/** 帯幅（画面高に対する割合）。細い帯は縁が立って**スキャン線**に見える */
export const SHEEN_SPAN = 0.4;
/** 追随の遅れ。1 に近いほど遅れる＝鏡が動きに置いていかれる感じになる */
const SHEEN_LAG = 0.86;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 幅の包絡線 — 書の入り・抜き。上は素早く太り、下は長く抜ける */
function taper(t: number): number {
  const a = Math.min(t / 0.13, 1);
  const b = Math.min((1 - t) / 0.3, 1);
  return Math.pow(a, 0.65) * Math.pow(b, 1.15);
}

/** 低周波のゆらぎ＝箔を手で継いだ痕。同じ seed なら毎回同一の形になる */
function makeWobble(seed: number): (t: number) => number {
  const rnd = mulberry32(seed);
  const knots = Array.from({ length: 9 }, () => 0.7 + rnd() * 0.58);
  return (t) => {
    const x = t * (knots.length - 1);
    const i = Math.floor(x);
    const f = x - i;
    const a = knots[Math.min(i, knots.length - 1)];
    const b = knots[Math.min(i + 1, knots.length - 1)];
    const s = (1 - Math.cos(f * Math.PI)) / 2; // コサイン補間（角を作らない）
    return a + (b - a) * s;
  };
}

/**
 * 蛇行の振幅。**割合だけで決めると広い列（[data-wide] の 1040px 列など）で
 * ±300px を超えて暴れ、レールや右の「空」へはみ出す**ので px で頭打ちにする。
 * 上限 190px は 780px 列の実効最大（234）より内側だが、モバイル（375px 幅 →
 * 最大 112px）には一切かからない。docs/SPEC.md §7 の不変条件。
 */
export function swayOf(w: number, amp: number): number {
  return Math.min(w * (0.13 + 0.17 * Math.min(Math.max(amp, 0), 1)), 190);
}

export interface PathArgs {
  w: number;
  h: number;
  startY: number;
  amp: number;
  seed: number;
  /** 章と章のあいだの余白の Y（案六）。2 本以上通れば骨格に沿う経路になる */
  gaps?: number[];
  /** 起点の x（案六・七）。null なら列の中央 */
  startX?: number | null;
}

/** ベジエを一区間ぶん継ぐ（縦に流れるので制御点は中点の高さに置く） */
function seg(x: number, y: number, nx: number, ny: number): string {
  const my = ((y + ny) / 2).toFixed(1);
  return ` C ${x.toFixed(1)} ${my}, ${nx.toFixed(1)} ${my}, ${nx.toFixed(1)} ${ny.toFixed(1)}`;
}

/** 従来の蛇行 — 容器の高さだけで刻む。章題が取れないときの退避 */
function pathByStep(a: PathArgs): string {
  const { w, h, startY, seed } = a;
  const span = h - startY;
  const rnd = mulberry32(seed * 7919 + 11);
  const step = Math.max(400, Math.min(580, span / 6));
  const sway = swayOf(w, a.amp);
  let dir = rnd() > 0.5 ? 1 : -1;
  let x = a.startX ?? w * 0.5;
  let prevY = startY;
  let d = `M ${x.toFixed(1)} ${startY.toFixed(1)}`;
  for (let y = startY + step; y < h + step; y += step) {
    const yy = Math.min(y, h);
    const ease = Math.min((yy - startY) / (step * 1.6), 1); // 出だしは振幅を抑える
    const nx = w * 0.5 + dir * sway * ease * (0.62 + rnd() * 0.38);
    d += seg(x, prevY, nx, yy);
    x = nx;
    prevY = yy;
    dir = -dir;
  }
  return d;
}

/**
 * 章と章のあいだの余白で列を渡る（案六）。
 * 本文やカードの上では端へ寄って添い、**渡るのは余白の位置だけ**になる。
 * これで「線が章題を横切る」——実測で最悪 1.82:1 だった当たり——が構造的に消える。
 * 本文との交差は 375px では逃げ場が無いので残り、隈取り（PR #55）が引き続き担保する。
 */
function pathByGaps(a: PathArgs, cross: number[]): string {
  const { w, h, startY, seed } = a;
  const sway = swayOf(w, a.amp);
  const rnd = mulberry32(seed * 7919 + 11);
  let dir = rnd() > 0.5 ? 1 : -1;
  let x = a.startX ?? w * 0.5;
  let prevY = startY;
  let d = `M ${x.toFixed(1)} ${startY.toFixed(1)}`;
  for (const gy of cross) {
    const ease = Math.min((gy - startY) / ((h - startY) * 0.22), 1);
    const nx = w * 0.5 + dir * sway * ease * (0.62 + rnd() * 0.38);
    d += seg(x, prevY, nx, gy);
    x = nx;
    prevY = gy;
    dir = -dir;
  }
  // 末尾は列の中央へ収める（下端は taper で抜けるので、そこは静かに閉じる）
  d += seg(x, prevY, w * 0.5, h);
  return d;
}

/** 渡ってよい節を間引く。近すぎる余白で毎回渡ると蛇行ではなくジグザグになる */
function crossingsOf(gaps: number[], h: number, startY: number): number[] {
  const minRun = Math.max(360, (h - startY) * 0.14);
  const out: number[] = [];
  let last = -Infinity;
  for (const g of gaps) {
    if (g <= startY + 80 || g >= h - 80) continue;
    if (g - last < minRun) continue;
    last = g;
    out.push(g);
  }
  return out;
}

/**
 * 中心パス。**節が 2 つ以上取れれば本文の骨格に沿い、取れなければ従来の刻み**へ戻す。
 * 決定論的（節の位置は測定値、向きは seed）なので、同じ入力なら毎回同じ形になる。
 */
export function flowPath(a: PathArgs): string {
  const span = a.h - a.startY;
  if (a.w < 80 || span < 420) return '';
  const cross = crossingsOf(a.gaps ?? [], a.h, a.startY);
  return cross.length >= 2 ? pathByGaps(a, cross) : pathByStep(a);
}

/**
 * 中心パスを実測し、幅関数に沿って左右へオフセットした閉じたポリゴンを作る。
 * SVG の stroke-width は経路上で変えられないので、塗りの形として描く。
 * bleedPow > 1 は「太いところが余分に広がる」＝和紙の吸い込み（案四）。
 */
function ribbonPolygon(
  pathEl: SVGPathElement,
  wMax: number,
  wobble: (t: number) => number,
  bleedPow = 1,
): string {
  const total = pathEl.getTotalLength();
  if (!total) return '';
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const at = t * total;
    const p = pathEl.getPointAtLength(at);
    const p0 = pathEl.getPointAtLength(Math.max(at - 1.5, 0));
    const p1 = pathEl.getPointAtLength(Math.min(at + 1.5, total));
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; // 法線
    const ny = dx / len;
    const wob = bleedPow === 1 ? wobble(t) : Math.pow(wobble(t), bleedPow);
    const w = (wMax * taper(t) * wob) / 2;
    left.push(`${(p.x + nx * w).toFixed(2)} ${(p.y + ny * w).toFixed(2)}`);
    right.push(`${(p.x - nx * w).toFixed(2)} ${(p.y - ny * w).toFixed(2)}`);
  }
  right.reverse();
  return `M${left.join('L')}L${right.join('L')}Z`;
}

const smoothstep = (k: number) => k * k * (3 - 2 * k);

/**
 * 文書内での左端。**`getBoundingClientRect` は使えない** ——
 * タブを移ると `.column` に送りの `transform`（±26px・PR #54）が掛かり、
 * 変形した祖先は絶対配置の包含ブロックになるので、線の矩形だけが横へずれる。
 * ワードマークはその外側にあるため、矩形どうしの差を取ると起点が 26px 狂う
 * （実測：5タブ中4つで外れていた）。`offsetLeft` は**レイアウトの値**で
 * 変形の影響を受けないので、こちらを積んで比べる。
 */
function layoutLeft(node: HTMLElement | null): number {
  let x = 0;
  while (node) {
    x += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return x;
}

export function FlowLine({ amp = 0.5, seed = 1 }: { amp?: number; seed?: number }) {
  const uid = useId();
  const gradId = `${uid}g`;
  const blurId = `${uid}b`;
  const maskId = `${uid}m`;
  const revId = `${uid}r`;
  const leafId = `${uid}l`;
  const sheenId = `${uid}s`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<SVGPathElement>(null);
  const maskRef = useRef<SVGRectElement>(null);
  const tipARef = useRef<SVGStopElement>(null);
  const tipBRef = useRef<SVGStopElement>(null);
  const sheenRef = useRef<SVGStopElement[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0, startY: 0 });
  /** 章と章のあいだの余白（案六）と、ワードマークの x（案七） */
  const [anatomy, setAnatomy] = useState<{ gaps: number[]; startX: number | null }>({
    gaps: [],
    startX: null,
  });
  const [shapes, setShapes] = useState<{ halo: string; line: string } | null>(null);

  // 親の寸法・フローメーター（あれば）の下端・章題の位置・ワードマークの x を追う。
  // すべて ResizeObserver の一回で測る（送り中には一切測らない）。
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const fm = el.parentElement?.querySelector('.flowmeter');
      let startY = 0;
      if (fm) {
        startY = Math.max(0, fm.getBoundingClientRect().bottom - rect.top + 20);
      }
      // 章題の上の余白（--sp-3xl = 40px）の中ほど＝線が列を渡ってよい場所
      const gaps = [...(el.parentElement?.querySelectorAll('.section-head') ?? [])].map(
        (h) => h.getBoundingClientRect().top - rect.top - 20,
      );
      // 起点はワードマークの金の「れ」の直下。取れなければ列の中央へ退避する
      const mark = document.querySelector<HTMLElement>('.appbar-mark span');
      const startX = mark
        ? layoutLeft(mark) + mark.offsetWidth / 2 - layoutLeft(el)
        : null;
      setSize({ w: el.clientWidth, h: el.clientHeight, startY });
      setAnatomy({ gaps, startX });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const d = useMemo(
    () =>
      flowPath({
        w: size.w,
        h: size.h,
        startY: size.startY,
        amp,
        seed,
        gaps: anatomy.gaps,
        startX: anatomy.startX,
      }),
    [size, amp, seed, anatomy],
  );

  /**
   * 箔足 — 一枚ぶんずつ艶が変わり、継ぎ目に髪一本の明るい線が入る。
   * 2.6px の線に「横切る継ぎ目」を描いても見えないので、読ませるのは**艶の段**のほう。
   * 静的なので送り中の再計算はゼロ。
   */
  const leafStops = useMemo(() => {
    if (size.h < 1) return [];
    const rnd = mulberry32(seed * 31337 + 5);
    const out: { o: number; a: number }[] = [];
    for (let y = 0; y <= size.h; y += LEAF_SHEET) {
      const a = 0.02 + rnd() * 0.075;
      out.push({ o: Math.max(0, (y - 1) / size.h), a: 0.015 });
      out.push({ o: Math.min(1, (y + 1) / size.h), a: 0.2 });
      out.push({ o: Math.min(1, (y + LEAF_SHEET * 0.5) / size.h), a });
    }
    return out;
  }, [size.h, seed]);

  // 中心パスが DOM に載ってから輪郭を起こす（getTotalLength はレイアウトを要する）
  useLayoutEffect(() => {
    const base = baseRef.current;
    if (!base || !d) {
      setShapes(null);
      return;
    }
    const wobble = makeWobble(seed * 104729 + 7);
    const halo = ribbonPolygon(base, HALO_W, wobble, BLEED_POW);
    const line = ribbonPolygon(base, LINE_W, wobble);
    setShapes(halo && line ? { halo, line } : null);
  }, [d, seed]);

  /**
   * スクロールで金線が置かれてゆく。
   * 先端は**窓の中**（FRONT）に置き、末尾で全長へ戻す。先端は矩形で切らず、
   * グラデのマスクで暈へ溶かす。送りの速さは指数平滑した値ひとつで穂先へ渡す。
   * reduced-motion では全描画（＝マスクは不透明・抜きも無し）。
   */
  useEffect(() => {
    const wrap = wrapRef.current;
    const rect = maskRef.current;
    if (!wrap || !rect || !shapes) return;
    const full = size.h;

    /** 照りの帯を置く。c はリボン座標での中心 */
    const putSheen = (c: number) => {
      const half = (window.innerHeight * SHEEN_SPAN) / 2;
      const stops = sheenRef.current;
      stops[0]?.setAttribute('offset', Math.max(0, Math.min(1, (c - half) / full)).toFixed(4));
      stops[1]?.setAttribute('offset', Math.max(0, Math.min(1, c / full)).toFixed(4));
      stops[2]?.setAttribute('offset', Math.max(0, Math.min(1, (c + half) / full)).toFixed(4));
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rect.setAttribute('fill', '#fff');
      rect.setAttribute('height', String(full));
      putSheen(full * 0.5); // 中央に固定＝現行と同じ「動かない明るい帯」
      return;
    }
    rect.setAttribute('fill', `url(#${revId})`);

    let raf = 0;
    let lastH = -1;
    let lastTip = '';
    let vel = 0;
    let prevScroll = window.scrollY;
    let prevT = performance.now();
    let raw = 0;
    let ratio = 0;
    let measured = false;
    let sheen = -1; // 照りの帯の中心（リボン座標・送りに遅れて追う）

    const tick = () => {
      raf = 0;
      const now = performance.now();
      const moved = Math.abs(window.scrollY - prevScroll);
      const dt = Math.max(1, now - prevT);
      prevScroll = window.scrollY;
      prevT = now;
      // 2.2px/ms でほぼ最大。跳ね返りは使わない（design.md）ので単純な指数平滑で減衰させる
      vel += (Math.min(1, moved / dt / 2.2) - vel) * 0.28;
      if (vel < 0.002) vel = 0;

      // レイアウト読みは**送りが起きたときだけ**。止まったあとの減衰では読み直さない
      if (moved > 0 || !measured) {
        const r = wrap.getBoundingClientRect();
        raw = window.innerHeight - r.top; // 画面の下端がリボンのどこに当たるか
        ratio = Math.min(Math.max(raw / r.height, 0), 1);
        measured = true;
      }

      // 先端を窓の中へ引き上げる。末尾（進度 0.88 以降）では全長へ戻す ——
      // 戻さないと最後まで送っても線が引き上げぶん届かないまま終わる
      const back = ratio > 0.88 ? smoothstep((ratio - 0.88) / 0.12) : 0;
      const lift = window.innerHeight * (1 - FRONT) * (1 - back);
      const y = Math.min(full, Math.max(0, raw - lift));

      // 1px 未満の差では書かない。マスクの高さを変えると金線の帯（全高 3000px 級）が
      // 丸ごとラスタライズし直されるので、書換1回ぶんの重さが送りの滑らかさに直に出る。
      const h = Math.round(y);
      if (h !== lastH) {
        lastH = h;
        rect.setAttribute('height', String(h));
      }

      // 抜き — 速く送るほど長く細く伸び、止まると穂先に墨が溜まる（＝抜けきらない）
      const tip = TIP_MIN + TIP_GAIN * vel;
      const f = h >= full ? 1 : Math.max(0, 1 - tip / Math.max(h, 1));
      const key = `${f.toFixed(3)}/${vel.toFixed(2)}`;
      if (key !== lastTip) {
        lastTip = key;
        tipARef.current?.setAttribute('offset', f.toFixed(4));
        tipBRef.current?.setAttribute('offset', (f + (1 - f) * 0.62).toFixed(4));
        tipBRef.current?.setAttribute('stop-opacity', (0.55 + 0.3 * (1 - vel)).toFixed(3));
      }

      // 照り — 帯の中心は「いま見ている高さ」（画面の中央）を**遅れて**追う。
      // 遅れがあることで、鏡が動きに置いていかれる＝金属が光を拾い直す感じになる。
      const want = raw - window.innerHeight * 0.5;
      sheen = sheen < 0 ? want : sheen + (want - sheen) * (1 - SHEEN_LAG);
      putSheen(sheen);

      // 止まるまで自走して速さを減衰させる。vel が 0 になればループは自然に終わる。
      // 照りが目標へ追いつくまでも回す（送りが止まったあと 帯だけが遅れて到着する）
      if (vel > 0 || Math.abs(want - sheen) > 1) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measured = false;
      onScroll();
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [shapes, size.h, revId]);

  return (
    <div ref={wrapRef} className="flowline" aria-hidden="true">
      {d && (
        <svg>
          <defs>
            {/* CSS 変数は <stop> の属性形式では解決されないので style で書く */}
            <linearGradient
              id={gradId}
              x1="0"
              y1={size.startY}
              x2="0"
              y2={size.h}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" style={{ stopColor: 'var(--sekki)', stopOpacity: 0 }} />
              <stop offset="0.07" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.45 }} />
              <stop offset="0.28" style={{ stopColor: 'var(--gold-500)', stopOpacity: 0.78 }} />
              <stop offset="0.5" style={{ stopColor: 'var(--gold-300)', stopOpacity: 0.88 }} />
              <stop offset="0.63" style={{ stopColor: 'var(--gold-100)', stopOpacity: 0.92 }} />
              <stop offset="0.8" style={{ stopColor: 'var(--gold-400)', stopOpacity: 0.74 }} />
              <stop offset="0.94" style={{ stopColor: 'var(--sekki)', stopOpacity: 0.42 }} />
              <stop offset="1" style={{ stopColor: 'var(--sekki)', stopOpacity: 0 }} />
            </linearGradient>
            {/* 箔足 — 一枚ごとの艶と、継ぎ目の細い明線 */}
            <linearGradient
              id={leafId}
              x1="0"
              y1="0"
              x2="0"
              y2={size.h}
              gradientUnits="userSpaceOnUse"
            >
              {leafStops.map((s, i) => (
                <stop
                  key={i}
                  offset={s.o}
                  style={{ stopColor: 'var(--gold-100)', stopOpacity: s.a }}
                />
              ))}
            </linearGradient>
            {/* 照り — 送りに遅れて追随する明るい帯。offset は送りごとに書き換える */}
            {/* userSpaceOnUse ＝ offset がリボンの座標そのものになる。
                objectBoundingBox にすると輪郭の外接矩形が基準になり、
                蛇行の幅ぶん縦の対応がずれる（帯の位置が計算と合わなくなる）。 */}
            <linearGradient
              id={sheenId}
              x1="0"
              y1="0"
              x2="0"
              y2={size.h}
              gradientUnits="userSpaceOnUse"
            >
              {[0, SHEEN_ALPHA, 0].map((a, i) => (
                <stop
                  key={i}
                  ref={(n) => {
                    if (n) sheenRef.current[i] = n;
                  }}
                  offset={0.3 + i * 0.2}
                  style={{ stopColor: 'var(--gold-100)', stopOpacity: a }}
                />
              ))}
            </linearGradient>
            {/* 抜き — マスクの下端を切らずに溶かす。offset は送りごとに書き換える */}
            <linearGradient id={revId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="1" />
              <stop ref={tipARef} offset="0.82" stopColor="#fff" stopOpacity="1" />
              <stop ref={tipBRef} offset="0.93" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <filter id={blurId} x="-60%" y="-6%" width="220%" height="112%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <mask id={maskId}>
              <rect ref={maskRef} x="0" y="0" width={size.w} height="0" fill="#fff" />
            </mask>
          </defs>
          {/* 計測用の中心線。描画はしない */}
          <path ref={baseRef} className="fl-base" d={d} fill="none" stroke="none" />
          {shapes && (
            <>
              {/* 暈 — 常に全長。金が置かれる前から流路を予感させる */}
              <path
                className="fl-halo"
                d={shapes.halo}
                fill={`url(#${gradId})`}
                filter={`url(#${blurId})`}
              />
              {/* 金線 — スクロールで置かれてゆく */}
              <g mask={`url(#${maskId})`}>
                <path className="fl-line" d={shapes.line} fill={`url(#${gradId})`} />
                <path className="fl-leaf" d={shapes.line} fill={`url(#${leafId})`} />
                <path className="fl-sheen" d={shapes.line} fill={`url(#${sheenId})`} />
              </g>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
