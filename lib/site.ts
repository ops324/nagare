/**
 * サイト全体で共有するメタ情報（OGP・正規URL用）。
 * 占術ロジックには一切関与しない純粋な定数。
 */

/**
 * 絶対URLの基点。OGP は相対パスを許さない（クローラは絶対URLしか解決しない）ため、
 * `metadataBase` に食わせて Next に絶対化させる。
 * 本番ドメインを変えるときは環境変数 `NEXT_PUBLIC_SITE_URL` で上書きする。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://nagare-qvqna749u-flowmateops-5002s-projects.vercel.app';

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
