import { expect, test, type Page } from '@playwright/test';

/**
 * 意匠の基準画像。
 *
 * ■ 空の4状態をどう固定するか
 * `data-theme="dark"/"light"` を立てる手もあるが、`addInitScript` が走る時点では
 * `document.documentElement` がまだ無く、`layout.tsx` の no-FOUC スクリプトより先に
 * 属性を立てられない。そこで **時刻そのものを固定して実際の太陽高度で判定させる**。
 * 本番と同じコードパス（`components/skyState.ts`）を通るぶん、こちらのほうが正しい。
 *
 * 下の4つの瞬間は「no-FOUC スクリプトの時刻バンドによる仮決め」と
 * 「SkyField の太陽高度による精密判定」が**一致する**ように選んである
 * （境界に寄せると起動直後に data-sky が一度書き換わり、撮影が不安定になる）。
 * 2026-08-16 JST・東京での実測値：
 *   05:00 → 高度 -0.26°（暁） / 12:00 → +67.83°（昼）
 *   18:30 → 約 -0.4°（宵）   / 23:00 → -39.20°（夜）
 * すべて同じ JST 暦日なので、節気・六曜・干支・命式は4状態で共通になる。
 */
const SKIES = {
  night: '2026-08-16T23:00:00+09:00',
  dusk: '2026-08-16T18:30:00+09:00',
  day: '2026-08-16T12:00:00+09:00',
  dawn: '2026-08-16T05:00:00+09:00',
} as const;
type Sky = keyof typeof SKIES;

/** プレビューは本番と別オリジンで localStorage が引き継がれない（PR #50 の反省）。
 *  入れないと `/` は入口画面を返し、ダッシュボードの改修が一切写らない。 */
const PROFILE = JSON.stringify({ date: '1990-05-14', time: '09:30', gender: 'female' });

const TABS = [
  { key: 'today', label: '今日' },
  { key: 'macro', label: '大きな流れ' },
  { key: 'birth', label: '生まれ' },
  { key: 'calendar', label: '暦' },
  { key: 'jiten', label: '事典' },
] as const;

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
} as const;
type Vp = keyof typeof VIEWPORTS;

async function boot(page: Page, sky: Sky, vp: Vp, opts: { profile: boolean; path?: string }) {
  await page.setViewportSize(VIEWPORTS[vp]);
  // clock は goto より前に。setFixedTime は Date だけを止めてタイマーは生かすので
  // React のスケジューラを壊さない（clock.install() は壊す）。
  await page.clock.setFixedTime(new Date(SKIES[sky]));
  if (opts.profile) {
    await page.addInitScript((p: string) => {
      localStorage.setItem('nagare.profile.v1', p);
    }, PROFILE);
  }
  await page.goto(opts.path ?? '/');

  // SkyField がマウント後に太陽高度で上書きするので、そこまで待つ
  await expect(page.locator(`html[data-sky="${sky}"]`)).toBeAttached();
  // 明朝とゴシックが載る前に撮ると全文字がずれる
  await page.evaluate(() => document.fonts.ready);
}

/** スコアは rAF 1フレームで最終値になる（reduced-motion で duration=0）。
 *  aria-label が持つ確定値と表示が一致するまで待つ＝カウントアップの取りこぼしを防ぐ。 */
async function settleScore(page: Page) {
  const gauge = page.locator('.flowmeter-svg');
  const label = (await gauge.getAttribute('aria-label')) ?? '';
  const score = /(\d+)\s*点/.exec(label)?.[1];
  if (score) await expect(page.locator('.flowmeter-score')).toHaveText(score);
}

/** タブの到達判定は `aria-current` で見る。
 *  `section[aria-label]` は 事典 タブだけ持っていない（`<Jiten />` を直接描画している）ので、
 *  5タブすべてに効く唯一の共通印がこれ。ナビの活性ピルもこの属性を測っている。 */
async function openTab(page: Page, index: number) {
  const item = page.locator('.navbar-item').nth(index);
  if (index > 0) await item.click();
  await expect(item).toHaveAttribute('aria-current', 'page');
}

/* ── 本体：5タブ × {夜, 昼} × {375, 1440} ─────────────────────────── */
for (const sky of ['night', 'day'] as const) {
  for (const vp of ['mobile', 'desktop'] as const) {
    test(`dashboard ${sky} ${vp}`, async ({ page }) => {
      await boot(page, sky, vp, { profile: true });
      for (const [i, tab] of TABS.entries()) {
        await openTab(page, i);
        if (tab.key === 'today') await settleScore(page);
        await expect(page).toHaveScreenshot(`${tab.key}-${sky}-${vp}.png`, { fullPage: true });
      }
    });
  }
}

/* ── 暁と宵は差分ブロックなので「今日」だけで押さえる ───────────────── */
for (const sky of ['dawn', 'dusk'] as const) {
  test(`today ${sky} mobile`, async ({ page }) => {
    await boot(page, sky, 'mobile', { profile: true });
    await openTab(page, 0);
    await settleScore(page);
    await expect(page).toHaveScreenshot(`today-${sky}-mobile.png`, { fullPage: true });
  });
}

/* ── 冒頭1画面だけは viewport で撮る。
      `.skyfield` は position:fixed なので fullPage には viewport 分しか写らず、
      星の見え方（--stars の4段）を見るならこちらが正しい。 ───────────── */
for (const sky of Object.keys(SKIES) as Sky[]) {
  test(`hero ${sky} mobile`, async ({ page }) => {
    await boot(page, sky, 'mobile', { profile: true });
    await openTab(page, 0);
    await settleScore(page);
    await expect(page).toHaveScreenshot(`hero-${sky}-mobile.png`);
  });
}

/* ── 入口体験（未登録の訪問者が最初に見る画面） ───────────────────── */
for (const sky of ['night', 'day'] as const) {
  for (const vp of ['mobile', 'desktop'] as const) {
    test(`welcome ${sky} ${vp}`, async ({ page }) => {
      await boot(page, sky, vp, { profile: false, path: '/welcome' });
      await expect(page).toHaveScreenshot(`welcome-${sky}-${vp}.png`, { fullPage: true });
    });
  }
}
