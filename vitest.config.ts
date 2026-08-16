import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * tsconfig の `paths`（`@/*` → `./*`）を vitest にも教えるだけの設定。
 * これが無いと `app/` や `components/` のモジュールをテストから import できない
 * （占術ロジックの `lib/__tests__/*` は相対 import なので従来どおり影響なし）。
 *
 * `exclude` は **リポジトリの複製を収集させない**ための防波堤。
 * `.claude/worktrees/` に作業用の git worktree が残ると、そこにも同じ
 * `lib/__tests__/` と `__tests__/` が丸ごと存在するため、vitest が両方を拾って
 * **全テストが二重に走る**。しかも複製側は古いチェックアウトを検証しているので、
 * 「全件グリーン」の半分が何も保証していない状態になる（実際にそうなっていた：
 * 見かけ 32 files / 465 tests・実数 16 files / 235 tests）。
 * pre-push フックと CI がこの数を根拠にしているので、ここで塞ぐ。
 *
 * `configDefaults.exclude` を展開してから足すこと。置き換えると node_modules や
 * dist の除外まで消える。
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    exclude: [...configDefaults.exclude, '**/.claude/**', '**/playwright/**'],
  },
});
