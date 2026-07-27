/**
 * PWA / iOS 用アイコンを `app/icon.png` から生成する。
 *
 *   node scripts/make-icons.mjs
 *
 * 出力は成果物としてリポジトリに含める（ビルド時には走らない）。
 * アイコンの絵柄を差し替えたときだけ再生成すること。
 * sharp は next の依存として入っている。
 *
 * 寸法は `app/manifest.ts` の `icons[].sizes` と
 * `app/layout.tsx` の `icons.apple`（iOS の標準 180px）に対応する。
 * 片方を変えたらもう片方も必ず合わせること。
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'app/icon.png');

const TARGETS = [
  { out: 'public/icon-192.png', size: 192 },        // manifest 192x192
  { out: 'public/icon-512.png', size: 512 },        // manifest 512x512
  { out: 'public/apple-touch-icon.png', size: 180 }, // iOS ホーム画面
];

for (const { out, size } of TARGETS) {
  await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, out));
  console.log(`${out}  ${size}x${size}`);
}
