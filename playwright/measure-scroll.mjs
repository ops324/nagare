/**
 * スクロールのなめらかさを測る（PR-E の E-6）。
 *
 * 本文の面を硝子にすると `backdrop-filter` が20面前後に増え、
 * 110個の星の瞬きと流れ線のマスクと同居する。合成の負荷が上がるので
 * 「たぶん大丈夫」で通さず、フレーム間隔を実測する。
 *
 * 測り方：rAF のたびに時刻を記録しながら等速でスクロールし、
 * フレーム間隔の分布を見る。60Hz なら 16.7ms が理想。
 * **reduced-motion は使わない**（本番の重い側＝星が瞬く状態で測る）。
 *
 * 使い方: node playwright/measure-scroll.mjs   （先に next start -p 3100）
 */
import { chromium } from '@playwright/test';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3100}`;
const PROFILE = JSON.stringify({ date: '1990-05-14', time: '09:30', gender: 'female' });
// 夜＝星がいちばん濃く（--stars 1）、硝子の効果もいちばん出る条件
const NIGHT = '2026-08-16T23:00:00+09:00';

async function measure(page, label) {
  const frames = await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const times = [];
    const max = document.documentElement.scrollHeight - innerHeight;
    let y = 0;
    await new Promise((resolve) => {
      const step = () => {
        times.push(performance.now());
        y += 14;
        window.scrollTo(0, Math.min(y, max));
        if (y < max && times.length < 240) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    return times;
  });

  const deltas = frames.slice(1).map((t, i) => t - frames[i]);
  deltas.sort((a, b) => a - b);
  const at = (p) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))];
  const long = deltas.filter((d) => d > 33).length; // 2フレーム落ち以上
  return {
    label,
    frames: deltas.length,
    median: +at(0.5).toFixed(1),
    p95: +at(0.95).toFixed(1),
    max: +deltas[deltas.length - 1].toFixed(1),
    dropped: long,
    droppedPct: +((long / deltas.length) * 100).toFixed(1),
  };
}

/** 開発機（Mac）の速さで測ると何でも 60fps に見える。
 *  低速な端末を模すため CPU を絞った側も必ず測る。 */
const THROTTLES = [1, 4];

async function run() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const rows = [];
  for (const throttle of THROTTLES)
  for (const [tabIndex, tab] of [[0, 'today'], [2, 'birth'], [4, 'jiten']]) {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      timezoneId: 'Asia/Tokyo',
      locale: 'ja-JP',
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    if (throttle > 1) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    }
    await page.clock.setFixedTime(new Date(NIGHT));
    await page.addInitScript((p) => localStorage.setItem('nagare.profile.v1', p), PROFILE);
    await page.goto(BASE);
    await page.locator('html[data-sky="night"]').waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    if (tabIndex > 0) await page.locator('.navbar-item').nth(tabIndex).click();
    await page.waitForTimeout(600);

    const surfaces = await page.evaluate(
      () =>
        [...document.querySelectorAll('*')].filter(
          (e) => getComputedStyle(e).backdropFilter !== 'none',
        ).length,
    );
    const r = await measure(page, tab);
    rows.push({ ...r, surfaces, throttle });
    await ctx.close();
  }
  await browser.close();

  console.log('\nCPU  タブ    硝子面  frames  中央値   p95     最大   2フレーム落ち');
  for (const r of rows) {
    console.log(
      `${(r.throttle + 'x').padEnd(4)} ${r.label.padEnd(7)} ${String(r.surfaces).padStart(4)}  ${String(r.frames).padStart(6)}  ` +
        `${String(r.median).padStart(5)}ms ${String(r.p95).padStart(6)}ms ${String(r.max).padStart(6)}ms  ` +
        `${r.dropped}回 (${r.droppedPct}%)`,
    );
  }
}

run();
