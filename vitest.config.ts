import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * tsconfig の `paths`（`@/*` → `./*`）を vitest にも教えるだけの設定。
 * これが無いと `app/` や `components/` のモジュールをテストから import できない
 * （占術ロジックの `lib/__tests__/*` は相対 import なので従来どおり影響なし）。
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
});
