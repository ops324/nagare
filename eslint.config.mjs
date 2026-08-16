import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 作業用 worktree はリポジトリの複製。lint すると他ブランチのコードまで
    // 検査してしまい、この repo とは無関係のエラーで真っ赤になる
    // （実測：兄弟 worktree が1つあるだけで 178 errors / 3750 warnings）。
    // vitest.config.ts の exclude・.gitignore と三点セットで塞ぐ。
    ".claude/**",
  ]),
]);

export default eslintConfig;
