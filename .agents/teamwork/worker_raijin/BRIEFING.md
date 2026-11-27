# BRIEFING — 2026-11-25T18:11:00Z

## Mission
Overhaul Raijin (Lightning Spearman) movement & stance poses (`src/game/poses/raijinPoses.ts`) across all 8 `BasicPoseName` states in Anime Fighting / Hyuns Dojo style, passing all `rules.test.ts`, `poses.e2e.test.ts` (including `POSE-P4-03`), and visual quality standards.

## 🔒 My Identity
- Archetype: Character Pose Specialist (`teamwork_preview_worker`)
- Roles: implementer, qa, specialist
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin`
- Original parent: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Milestone: `M2-Raijin`

## 🔒 Key Constraints
- Exclusive write ownership: `src/game/poses/raijinPoses.ts` ONLY (do NOT touch any other source/test files or `scratch/stickman-build`).
- All implementations must be genuine; no hardcoded test outputs or dummy logic.
- Must satisfy all quantitative invariants in `PROJECT_R2.md` and `poses.e2e.test.ts` across all 8 `BasicPoseName` states (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`), including `POSE-P4-03` (`maxJointDelta < 22px` across transitions, `dist(shoulder, hand) >= 10px` and `<= 37.4px`).
- Parry spear angle must point forward-upward diagonal (`weaponAngle ≈ -1.05` to `-1.25`), NOT into the floor; jump must feature dynamic pole-vault / dragoon tuck.
- Write metadata/reports only inside `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin`.

## Current Parent
- Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Updated: `2026-11-25T18:11:00Z`

## Task Summary
- **What to build**: Full Anime Fighting / Hyuns Dojo lancer pose suite in `src/game/poses/raijinPoses.ts`.
- **Success criteria**: `rules.test.ts` passes `17/17`, `poses.e2e.test.ts` passes 100% for Raijin (including `POSE-P4-03` and `POSE-VISUAL-01`), and bespoke verification confirms all Raijin quantitative invariants & distinctness.
- **Interface contracts**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`
- **Code layout**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`

## Key Decisions Made
- Inspected `StickmanRenderer.ts` `renderWeapon` (`volt_spear` / `thunder_halberd`): weapon origin is `handR`, shaft extends from `-36` to `+74/+96` along `+x` rotated by `weaponAngle`. `0` = forward, negative = upward-forward (or backward around `-2.88`), positive = downward-forward.
- Fixed `parry` transition snap (`elbowR` jumped `23.46px` in M1 scaffold because `handR=(14,-68)` was `1.4px` from `shoulderR`) by placing `handR=(16,-48)` (`~19.2px` from `shoulderR`) and `handL=(24,-65)` (`~20.0px` from `shoulderL`) bracing a forward-upward diagonal shaft (`weaponAngle=-1.16`).
- Overhauled all 8 poses (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) for authentic lancer silhouette, ground reach, and smooth transitions (`worstLiveDelta = 15.72px < 22px`).

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/DISPATCH.md` — Assignment & constraints
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/progress.md` — Liveness & step progress
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/handoff.md` — Final 5-component handoff report
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/renders/poses/poses_raijin.png` — Visual verification strip for Raijin

## Change Tracker
- **Files modified**: `src/game/poses/raijinPoses.ts` — Complete Anime Fighting / Hyuns Dojo lancer overhaul across all 8 `BasicPoseName` states.
- **Build status**: `rules.test.ts` `17/17` PASS; `poses.e2e.test.ts` `10/11` PASS (all Raijin checks including `POSE-P4-03` & `POSE-VISUAL-01` PASS; sole remaining failure is `aether` owned by `worker_aether`); bespoke `tsx -e` Raijin invariant script PASS.
- **Pending issues**: None for `raijinPoses.ts` (`tsc --noEmit` skipped in Termux/Android sandbox due to missing `@typescript/typescript-android-arm64` native binary; orchestrator/M3 runs full `vite build` in `scratch/stickman-build`).

## Quality Status
- **Build/test result**: `rules.test.ts` 17/17 PASS; Raijin `poses.e2e.test.ts` PASS (`worstLiveDelta = 15.72px < 22px`); `POSE-VISUAL-01` PASS.
- **Lint status**: Clean TypeScript syntax verified via `tsx` esbuild transpilation; no unused imports or non-finite values.
- **Tests added/modified**: None (read-only on test files per exclusive write ownership).

## Loaded Skills
- None (methodology derived directly from `PROJECT_R2.md`, `poseMath.ts`, `StickmanRenderer.ts`, and `poses.e2e.test.ts`).
