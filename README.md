# 流れ（Nagare）

[![CI](https://github.com/ops324/nagare/actions/workflows/ci.yml/badge.svg)](https://github.com/ops324/nagare/actions/workflows/ci.yml)

天体・暦・命術で「今の流れ」を読む Web アプリ。生年月日（時刻・性別は任意）だけで、**今日の流れ**と**大きな流れ（人生周期）**の2軸を提示します。

- 本番: https://nagare-qvqna749u-flowmateops-5002s-projects.vercel.app （Vercel・main→自動デプロイ）
- スタック: Next.js 16 / React 19 / TypeScript / Tailwind v4 / `astronomy-engine` / Vitest
- 5タブ: 今日 ・ 大きな流れ ・ 生まれ ・ 暦 ・ 事典

## ⚠️ 改修する前に

**[`docs/SPEC.md`](docs/SPEC.md) を必ず読んでください。** 特に:

- **§4 依存関係・影響範囲マップ** — どのファイルを変えると何に波及するか
- **§5 不変条件（検証済み基準値）** — テストが固定している値。変わったらバグの合図
- **§12 改修時チェックリスト** — 影響確認 → ブランチ → テスト追加 → 全緑 → 実機 → provenance版 → PR

占術ロジックは**参照値テスト（160件）で不変条件を固定**しています。基盤（`lib/time.ts` `lib/koyomi.ts` `lib/astro.ts` `lib/profile.ts` `lib/flow.ts`）ほど広く波及するため、変更時は影響先を必ず再検証してください。実装を変えたら `docs/SPEC.md` も更新すること。

## 開発

```bash
npm install
npm run dev          # 開発サーバ（http://localhost:3000）
npm test             # 参照値テスト（Vitest・160件）
npx tsc --noEmit     # 型チェック
npx eslint .         # Lint
npm run build        # 本番ビルド（静的プリレンダー）
```

### 自動チェック（多層防御）

- **pre-push フック**（`.githooks/pre-push`）: push 前に `npm test` を実行。壊れていたら push を止める。`npm install` で自動有効化（緊急時は `git push --no-verify`）。
- **GitHub Actions CI**（`.github/workflows/ci.yml`）: push/PR ごとに test → tsc → eslint → build を実行。
- **ブランチ保護**: CI が緑でないと `main` にマージ不可。

→ ドキュメントで導き（CLAUDE.md→AGENTS.md→SPEC）、テストとCIで強制する二段構え。

## 構成

- `lib/` — ドメイン計算（純TS・UI非依存・テスト対象）。占術ごとにモジュール化。
- `app/` `components/` — UI（5タブのダッシュボード・自作SVG図）。
- `lib/__tests__/` — 参照値テスト（公開値・実例と照合）。
- `docs/SPEC.md` — 技術仕様書（改修時の影響範囲・不変条件・規約）。

占術の方式・出典・版は `lib/provenance.ts` に集約し、流派の差し替えを局所化しています。

---
娯楽・参考としてお楽しみください。
