<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 技術仕様書（改修前に必読）

コードを変更する前に **[`docs/SPEC.md`](docs/SPEC.md)** を読むこと。特に「§4 依存関係・影響範囲」「§5 不変条件（検証済み基準値）」「§12 改修時チェックリスト」。
占術ロジックは参照値テスト（`npm test`・160件）で不変条件を固定している。基盤（`lib/time.ts` `lib/koyomi.ts` `lib/astro.ts` `lib/profile.ts` `lib/flow.ts`）ほど広く波及するため、変更時は影響先を必ず再検証する。実装を変えたら `docs/SPEC.md` も更新すること。
