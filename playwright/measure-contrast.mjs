/**
 * 面の上の本文の**実効コントラスト**を測る（PR-E の関門）。
 *
 * 不透明な面なら文字色と地の色から計算できるが、半透明にすると**背後によって変わる**。
 * このアプリの背後には金の流れ線と星があり、そこが最悪ケースになる。
 * 目視では判らないので、実際に描かれたピクセルを読む。
 *
 * ■ measurement の作り方（2回失敗して辿り着いた形）
 *
 * ✗ 第1案：文字の行矩形の中で「前景色から遠いピクセル」を地とみなす
 *   → グリフのアンチエイリアス縁（前景と地の中間色）が地として残り、
 *     不透明な改修前ですら全件未達と出た。
 * ✗ 第2案：面の矩形から文字の矩形を引いた領域を地とする
 *   → 面の中の**別の要素**（金のバッジ・今日の色のタグ）の塗りを拾い、
 *     そこに乗っていない文字と突き合わせてしまう。改修前で 18/36 未達と出た。
 * ✗ 第3案：2枚撮る（通常／`-webkit-text-fill-color: transparent` で文字だけ消す）。
 *   地は2枚目の**文字の矩形の位置**から読む。
 *   → 文字の矩形の中には文字以外も入る（今日の色の丸印・星座記号の SVG・
 *     吉日バッジ）。それらの塗りを「地」として拾ってしまい、改修前で 40/204 未達。
 * ✓ 第4案：**2枚の差分がグリフそのものの位置**になる。
 *   文字以外は2枚で同一なので差分に出ない＝丸印も SVG もバッジも自動的に外れる。
 *   その位置の地を2枚目から読む。推定も閾値も要らない。
 *
 * **計測器は必ず改修前で校正すること。** 不透明な面で未達が出るなら測り方が誤っている。
 *
 * ■ 再現性の限界（実測して確かめた）
 * - **地を持つ面（硝子のカード）は安定する。** 同じ値が何度でも出る
 * - **面を持たない段（`.chip`）は実行ごとに 5〜10 件で揺れる。** 1〜2px の星が
 *   グリフの下に来るかどうかという確率事象で、rAF を2回挟んで送りを固定しても残る。
 *   ここの件数を「増えた／減った」で判断してはいけない。**面の変更の可否は
 *   硝子面の行だけで判断する**（`.chip` は別途対処すべき既存の課題）
 *
 * ■ サーバーは必ず自分で建てたものに向けること
 * 別 worktree や別セッションが同じポートを掴んでいると、**別ビルドを測って
 * 気づかない**。`PORT=3199 node playwright/measure-contrast.mjs` のように
 * 空いているポートを明示するのが安全。
 *
 * 使い方: PORT=3199 node playwright/measure-contrast.mjs   （先に next start -p 3199）
 */
import { chromium } from '@playwright/test';
import { PNG } from './png.mjs';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3100}`;
const PROFILE = JSON.stringify({ date: '1990-05-14', time: '09:30', gender: 'female' });

const SKIES = {
  night: '2026-08-16T23:00:00+09:00',
  dusk: '2026-08-16T18:30:00+09:00',
  day: '2026-08-16T12:00:00+09:00',
  dawn: '2026-08-16T05:00:00+09:00',
};

const TABS = [
  [0, 'today'],
  [1, 'macro'],
  [2, 'birth'],
];

const srgb = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/** WCAG 1.4.3：24px 以上、または 18.66px 以上かつ 700 以上は「大きい文字」で 3:1 */
const needed = (size, weight) => (size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5);

async function collect(page) {
  return page.evaluate(() => {
    const out = [];
    for (const surface of document.querySelectorAll('.card, .lucky-action')) {
      const sr = surface.getBoundingClientRect();
      if (sr.bottom < 0 || sr.top > innerHeight) continue;
      const cls = surface.className.split(' ').slice(0, 2).join('.');
      for (const el of surface.querySelectorAll('*')) {
        const text = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join('');
        if (!text) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 8) continue;
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const cs = getComputedStyle(el);
        out.push({
          surface: cls,
          text: text.slice(0, 8),
          color: cs.color,
          size: parseFloat(cs.fontSize),
          weight: parseInt(cs.fontWeight, 10) || 400,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        });
      }
    }
    return out;
  });
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const results = [];

  for (const [sky, when] of Object.entries(SKIES)) {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      reducedMotion: 'reduce',
      timezoneId: 'Asia/Tokyo',
      locale: 'ja-JP',
      deviceScaleFactor: 1,
      colorScheme: 'light',
    });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(when));
    await page.addInitScript((p) => localStorage.setItem('nagare.profile.v1', p), PROFILE);
    await page.goto(BASE);
    await page.locator(`html[data-sky="${sky}"]`).waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);

    for (const [index, tab] of TABS) {
      if (index > 0) await page.locator('.navbar-item').nth(index).click();
      // スクロール駆動（視差・流れ線のマスク）は rAF スロットリングされるので、
      // 送りを先頭へ固定してから rAF を2回挟む（SPEC §12.5）。これが無いと
      // 星の位置が数 px ぶれ、面を持たない `.chip` の最悪値が実行ごとに変わる。
      await page.evaluate(
        () =>
          new Promise((r) => {
            window.scrollTo(0, 0);
            requestAnimationFrame(() => requestAnimationFrame(r));
          }),
      );
      await page.waitForTimeout(400);

      const items = await collect(page);

      const shot = PNG.decode(await page.screenshot());
      // 2枚目：文字だけ消す（SVG の currentColor は残す）。
      // 差分＝グリフの位置。文字以外は2枚で同一なので差分に出ない。
      await page.addStyleTag({
        content: '*{-webkit-text-fill-color:transparent!important;text-shadow:none!important}',
      });
      await page.waitForTimeout(120);
      const bg = PNG.decode(await page.screenshot());
      await page.evaluate(() =>
        document.querySelectorAll('style').forEach((s) => {
          if (s.textContent.includes('-webkit-text-fill-color:transparent')) s.remove();
        }),
      );

      for (const it of items) {
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(it.color);
        if (!m) continue;
        const fgL = lum(+m[1], +m[2], +m[3]);
        const x0 = Math.max(0, Math.round(it.rect.x));
        const y0 = Math.max(0, Math.round(it.rect.y));
        const x1 = Math.min(bg.width, Math.round(it.rect.x + it.rect.w));
        const y1 = Math.min(bg.height, Math.round(it.rect.y + it.rect.h));
        let worst = Infinity;
        let worstPx = null;
        let n = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * bg.width + x) * 4;
            // グリフが乗っていた位置だけを見る（2枚が違う＝そこに文字があった）
            const moved =
              Math.abs(shot.data[i] - bg.data[i]) +
              Math.abs(shot.data[i + 1] - bg.data[i + 1]) +
              Math.abs(shot.data[i + 2] - bg.data[i + 2]);
            if (moved < 24) continue;
            const px = [bg.data[i], bg.data[i + 1], bg.data[i + 2]];
            const r = ratio(fgL, lum(...px));
            n++;
            if (r < worst) {
              worst = r;
              worstPx = px;
            }
          }
        }
        if (n < 12) continue; // グリフがほとんど写っていない＝測る対象がない
        results.push({
          sky, tab, surface: it.surface, text: it.text,
          size: it.size, need: needed(it.size, it.weight),
          fg: `rgb(${m[1]},${m[2]},${m[3]})`,
          bg: `rgb(${worstPx.join(',')})`,
          ratio: +worst.toFixed(2),
        });
      }
    }
    await ctx.close();
  }
  await browser.close();

  results.sort((a, b) => a.ratio / a.need - b.ratio / b.need);
  const fail = results.filter((r) => r.ratio < r.need);
  console.log(`\n測定 ${results.length} 件 ／ AA 未達 ${fail.length} 件\n`);
  console.log('空     タブ   面                  文字        字   要求   実効  最悪の地');
  for (const r of results.slice(0, 16)) {
    console.log(
      `${r.ratio < r.need ? '★' : ' '}${r.sky.padEnd(5)} ${r.tab.padEnd(6)} ${r.surface.padEnd(18)} ` +
        `${r.text.padEnd(9)} ${String(Math.round(r.size)).padStart(2)}px ${String(r.need).padStart(4)} ` +
        `${String(r.ratio).padStart(6)}  ${r.bg}`,
    );
  }
  if (fail.length) process.exitCode = 1;
}

run();
