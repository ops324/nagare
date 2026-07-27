/**
 * OGP カード画像 `public/og.png`（1200×630）を `app/icon.png` から生成する。
 *
 *   node scripts/make-og.mjs
 *
 * 出力は成果物としてリポジトリに含める（ビルド時には走らない）。
 * アイコンや文言を変えたときだけ再生成すること。
 * sharp は next の依存として入っており、明朝は端末の Hiragino Mincho ProN で描く
 * （macOS 前提。他環境では serif にフォールバックし字面が変わる）。
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'app/icon.png');
const OUT = path.join(ROOT, 'public/og.png');

const W = 1200, H = 630;
const ICON = 470, R = 104;              // iOS 相当の角丸
const ICON_X = 96, ICON_Y = (H - ICON) / 2;
const TX = 640;                          // テキスト左端

const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#fdfaf1"/>
      <stop offset="1" stop-color="#f6f0e0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#paper)"/>
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none"
        stroke="#8d742c" stroke-opacity="0.28" stroke-width="1.5"/>
</svg>`;

const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}">
  <rect width="${ICON}" height="${ICON}" rx="${R}" ry="${R}" fill="#fff"/>
</svg>`;

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${ICON_X}" y="${ICON_Y}" width="${ICON}" height="${ICON}" rx="${R}" ry="${R}"
        fill="none" stroke="#8d742c" stroke-opacity="0.35" stroke-width="1.5"/>
  <g font-family="Hiragino Mincho ProN, Yu Mincho, serif">
    <text x="${TX}" y="286" font-size="124" font-weight="600" fill="#2b2620" letter-spacing="14">流れ</text>
    <text x="${TX}" y="354" font-size="29" font-weight="500" fill="#5d4b03" letter-spacing="3">天体・暦・命術で今の流れを読む</text>
  </g>
  <line x1="${TX}" y1="392" x2="${TX + 132}" y2="392" stroke="#8d742c" stroke-opacity="0.75" stroke-width="2"/>
  <text x="${TX}" y="444" font-family="Hiragino Sans, sans-serif" font-size="23" fill="#6b6255" letter-spacing="1.5">生年月日ひとつで、今日の流れがひらく</text>
</svg>`;

const icon = await sharp(SRC)
  .resize(ICON, ICON)
  .composite([{ input: Buffer.from(mask), blend: 'dest-in' }])
  .png()
  .toBuffer();

await sharp(Buffer.from(bg))
  .composite([
    { input: icon, left: Math.round(ICON_X), top: Math.round(ICON_Y) },
    { input: Buffer.from(text), left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(OUT);
