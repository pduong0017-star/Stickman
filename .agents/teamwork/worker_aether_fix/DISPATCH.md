## 2026-11-25T18:12:29Z

You are `worker_aether_fix` (Integration Fix + Full Build & Test Sync Worker).

IDENTITY & WORKSPACE:
- Role: Fix & Integration Build Worker (`teamwork_preview_worker`)
- Working Directory (metadata/reports ONLY): `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_aether_fix`
- Project Root: `/storage/emulated/0/Antigravity/Stickman`
- Parent Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST READS:
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_aether/handoff.md`
- `src/game/poses/aetherPoses.ts`, `src/game/poses/poseMath.ts`, `tests/e2e/poses.e2e.test.ts`

EXCLUSIVE WRITE OWNERSHIP:
- `src/game/poses/aetherPoses.ts` (fix `POSE-P4-03` `aether jump->jump step=86: joint elbowL jumped 31.66px` — do NOT alter `poses.e2e.test.ts` or lower thresholds!)
- `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` & `/storage/emulated/0/Antigravity/Stickman/dist/` (rebuild & sync production bundle)
- `.agents/teamwork/e2e_renders/poses/*` (via running `node tests/e2e/run-e2e.mjs --pose --render-poses`)

OBJECTIVES:
1. Diagnose why `POSE-P4-03 aether jump->jump step=86: joint elbowL jumped 31.66px` fails (likely `handL` in `aetherPoses.ts` `jump` crossing `resolveElbowBendDir`'s `localX < -2 && localY < -2` threshold during `tuck` or `blendSkeleton`, flipping `elbowL` between `+1` and `-1`!). Fix `aetherPoses.ts` cleanly (e.g., keep `jump.handL` on a consistent side of `shoulderL` or set explicit `elbowBendL` matching the natural arc so `elbowL` never flips/snaps while preserving Aether's airborne martial-mage silhouette and all P1–P5 invariants!).
2. Run `node tests/e2e/run-e2e.mjs --pose --render-poses` and confirm **11/11 PASS** (exit 0) and fresh `all_5_chars_poses_grid.png` + `pose_metrics.json` (`ok: true`, `blank_cells: []`, `nan_cells: []`, `low_diff_pairs: []`).
3. Run the FULL test suite: `node tests/e2e/run-e2e.mjs --with-unit --tier=all` and confirm **100% PASS** (exit 0 across `rules.test.ts` + Tiers 1–4 + `poses.e2e.test.ts`!).
4. Sync `/storage/emulated/0/Antigravity/Stickman/src` into `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/src` (and check `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`), run:
   - `node node_modules/typescript/bin/tsc --noEmit` (must exit `0` with 0 errors)
   - `node node_modules/vite/bin/vite.js build` (must exit `0`)
   - Copy `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/dist` cleanly to `/storage/emulated/0/Antigravity/Stickman/dist` and verify matching asset hashes!

OUTPUT:
- Update `progress.md` in your working directory.
- Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_aether_fix/handoff.md` with exact commands, pass/fail counts, `tsc`/`vite build`/`dist/` hashes, and `pose_metrics.json` summary.
- Send completion message to `cb9506f4-9088-4284-adc1-d9197e1f15f9` via `send_message`.
