/**
 * サイト全体で共有するメタ情報（OGP・正規URL用）。
 * 占術ロジックには一切関与しない純粋な定数。
 */

/**
 * 絶対URLの基点。OGP は相対パスを許さない（クローラは絶対URLしか解決しない）ため、
 * `metadataBase` に食わせて Next に絶対化させる。
 * 本番ドメインを変えるときは環境変数 `NEXT_PUBLIC_SITE_URL` で上書きする。
 *
 * **既定値は本番エイリアス**（`nagare-eta.vercel.app`）。Vercel が発行する
 * `nagare-<hash>-<team>.vercel.app` 形式のデプロイURLを既定にしてはいけない：
 *  - デプロイを消すと **410** になり、OGP画像・canonical・sitemap がまとめて死ぬ
 *  - プロジェクト名つきURLは Deployment Protection の対象で、クローラが SSO へ飛ばされる
 * 末尾スラッシュは付けない（`new URL()` の基点・`__tests__/site-url.test.ts` が固定）。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nagare-eta.vercel.app';

export const SITE_NAME = '流れ';

export const SITE_TITLE = '流れ — 天体・暦・命術で今の流れを読む';

/**
 * OGP カード画像（`public/og.png`）。アプリアイコンを和紙の地に据えた 1200×630。
 * 生成は `scripts/make-og.mjs`（docs/SPEC.md §2）。
 */
export const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: '流れ — 金の環と星の海のアイコン',
} as const;
