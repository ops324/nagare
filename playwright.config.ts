import { defineConfig } from '@playwright/test';

/**
 * 見た目の基準画像（visual regression）。
 *
 * このリポジトリには DOM/描画テストが1件も無く、`__tests__/design-tokens.test.ts` は
 * `globals.css` を**テキストとして**読んでいるだけ＝意匠の改修は実質ノーガードだった。
 * docs/SPEC.md §12.5 に手順が散文で書かれていたので、それをそのままツールにしたもの。
 *
 * 設計上の決めごと：
 * - `channel: 'chrome'` … 実機の Chrome を使うのでブラウザバイナリを追加DLしない（SPEC 記載）
 * - `reducedMotion: 'reduce'` … 空のクロスフェード・星の瞬き・流れ線のマスク・
 *   スコアのカウントアップがすべて確定値になる。**これが無いと全件ちらつく**
 * - `timezoneId` / `locale` … `lib/format.ts` の Intl 出力を機械に依存させない
 * - `deviceScaleFactor: 1` ＋ `scale: 'css'` … Retina かどうかで基準画像が割れないように
 * - `workers: 1` … dev サーバーは1つ。並列にしても速くならず、差分だけが不安定になる
 *
 * **CI には入れない。** 基準画像はプラットフォーム依存で、macOS ローカルと Linux CI では
 * フォントラスタライズが必ずずれる。ローカルで撮って PR に貼るためのもの。
 *
 * ■ 何を守れて、何を守れないか（実測して確かめた）
 * - **守れる**：余白・寸法・組版のずれ。`--sp-md` を 12px→13px にしただけで落ちる
 * - **守れない**：ごく小さな色の変更。`--hairline` を 55%→62% にしても通ってしまう
 *   （4規則ぶんの 1px 線が 3/255 だけ動く＝差分ピクセル数が許容量に届かない）
 *
 * つまり**色トークンの値は基準画像では守れない**。そちらは
 * `__tests__/design-tokens.test.ts` が `globals.css` をテキストとして読んで
 * 直接固定する担当（`--fs-score` を凍結しているのと同じやり方）。
 * 「画像＝組版と構図」「テキスト検査＝トークンの値」の二段構えで、片方だけでは穴が開く。
 */
/** 既定 3100。**兄弟 worktree や別セッションが同じポートを使うと衝突する**ので、
 *  `PORT=3199 npm run test:visual` のように差し替えられるようにしてある
 *  （`reuseExistingServer: false` なので、塞がっていれば黙って誤らず起動時に失敗する）。 */
const PORT = Number(process.env.PORT ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './playwright',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  // 1テストで最大5枚撮る。デスクトップの fullPage は 1440×4000 近くになるので、
  // dev サーバーを併走させたまま回すと既定値では撮影待ちがタイムアウトする（実測）。
  timeout: 180_000,
  expect: {
    // 2フレーム連続で同一になるまで待つ既定の待ち時間は 5s。大きい fullPage には足りない
    // （`toHaveScreenshot` の中ではなく `expect` 直下に置く）。
    timeout: 30_000,
    toHaveScreenshot: {
      // 既定の threshold は 0.2。「和紙と金箔」は髪の毛線・極浅いグラデ・低彩度の
      // 階調差でできていて、検出したい変化そのものが 1px あたりの色差としては小さいので
      // 締めてある。
      threshold: 0.01,
      // 文字のアンチエイリアスは同じ機械でも数ピクセル揺れるので 0 にはしない。
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      scale: 'css',
    },
  },
  use: {
    baseURL: BASE,
    channel: 'chrome',
    // Playwright 1.62 で `reducedMotion` は `use` 直下から `contextOptions` 配下へ移った
    // （`colorScheme` などは直下のまま）。直下に書くと型エラーになる。
    contextOptions: { reducedMotion: 'reduce' },
    colorScheme: 'light',
    timezoneId: 'Asia/Tokyo',
    locale: 'ja-JP',
    deviceScaleFactor: 1,
  },
  webServer: {
    // dev ではなく本番ビルドで撮る（Turbopack の stale CSS を踏まないため・SPEC §12.5）
    command: `npm run build && npx next start -p ${PORT}`,
    url: BASE,
    // **再利用しない。** `reuseExistingServer: true` だと、他の worktree や別セッションが
    // 同じポートを掴んでいるとき **黙ってそちらを撮る**。実際、別 worktree の main の
    // サーバーが 3100 に居座り、意匠を変えたのにテストが通ってしまう状況が起きた。
    // これは vitest が古い worktree を収集していたのと**同じ種類の事故**で、
    // どちらも「緑」が何も保証しなくなる。毎回ビルドし直す 40 秒はその保険料。
    // ポートが塞がっていれば Playwright は起動時にはっきり失敗する＝黙って誤らない。
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
