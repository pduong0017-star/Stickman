# Dispatch — reviewer_r8_wave2
Task: Independent verification & adversarial review of M4 & M5 (plus full M1–M5 integration, tsc --noEmit, static invariants, and excluded-files check).

## 2026-11-27T08:27:26Z
You are `reviewer_r8_wave2` (`teamwork_preview_reviewer`).
Your working directory is: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/reviewer_r8_wave2`
Your parent orchestrator conversation ID is: `c811623b-be34-4c19-919f-c5b6447f28cd`.

EXCLUDED FILES (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.

Task (READ-ONLY verification of M4 & M5 + full M1–M5 integration):
1. Verify M4 (R4) across `src/game/poses/chronoPoses.ts`, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/renderer/trails.ts`.
2. Verify M5 (R5) across `src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts`.
3. Run `tsc --noEmit` from `/data/user/0/com.agy/files/stickman-build` and verify 0 errors in `src/`.
4. Verify static invariants (`0` `ctx.shadowBlur` in `src/`, `0` `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`, balanced `ctx.save()`/`ctx.restore()`, and none of the excluded files modified via `git status`).
