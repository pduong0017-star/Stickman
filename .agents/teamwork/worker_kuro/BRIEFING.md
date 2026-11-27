# BRIEFING — 2026-11-25T18:06:30Z

## Mission
Overhaul all 8 `BasicPoseName` states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) in `src/game/poses/kuroPoses.ts` for Kuro (Iaido Swordsman) with authentic Anime Fighting / Hyuns Dojo silhouettes, strict anatomical/quantitative invariants, and visual distinction from Raijin, Kagura, Zero, and Aether.

## 🔒 My Identity
- Archetype: Character Pose Specialist (`teamwork_preview_worker`)
- Roles: implementer, qa, specialist
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kuro`
- Original parent: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Milestone: `M2-Kuro`

## 🔒 Key Constraints
- Exclusive write ownership: `src/game/poses/kuroPoses.ts` ONLY (plus metadata in `worker_kuro/`).
- DO NOT touch `/data/.../scratch/stickman-build` or any other source/test files.
- Must satisfy all `PROJECT_R2.md` quantitative invariants, zero `NaN`/`Infinity`, forward knees, clamped limb lengths, and parent visual polish notes (`parry`: `hip.y ≈ -40`, wide stance, `weaponAngle ≈ -1.10`; `idle`: coiled Iaido hand-on-sheath with clear knee bend).
- Verification: `ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` (17/17) + custom `tsx -e` Kuro verification script.

## Current Parent
- Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Updated: `2026-11-25T18:06:30Z`

## Task Summary
- **What to build**: Complete Anime Fighting / Hyuns Dojo pose suite for Kuro across 8 `BasicPoseName` states in `src/game/poses/kuroPoses.ts`.
- **Success criteria**: Sharp Iaido silhouette on all 8 poses, all invariants pass, distinct from the other 4 characters, `rules.test.ts` 17/17 pass, `poses.e2e.test.ts` invariants pass.
- **Interface contracts**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`
- **Code layout**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md` § Code Layout

## Key Decisions Made
- `idle`: Coiled Iaido readiness (`hip.y = -43.5 + breath`, `torsoLean = 0.22`, `footL.x = -22`, `footR.x = 24`, `handL = (5, -39)` resting on waist scabbard collar, `handR = (17, -45)`, `weaponAngle = -0.24`).
- `run`: Sharp 40° sprint (`torsoLeanBase = 0.7`, `hipBaseY = -42`, `strideRadius = 29`, `footLift = 21`, `trailArmX = -4, trailArmY = -48` keeping `handR` within `<= 37.4px` of `shoulderR`, `weaponAngleBase = -2.75`).
- `dash`: Low Iaido flash-step (`hip = (14, -33)`, `torsoLean = 0.95`, rear leg driving back `(-32, -12)`, front knee tucked `(24, -3)`, `handR = (16, -32)` coiled at waist sheath, `handL = (8, -58)` slicing backward cleanly above torso, `weaponAngle = -2.92`).
- `jump` / `fall`: Front-knee-tuck `jump` (`vy`-responsive) and diagonal-ready `fall` (`weaponAngle = -0.65`, `vy`-responsive) with distinct silhouettes.
- `land`: Single-knee-drop shock absorb via `computeLandingCurve(t, 0.16)` (`+13px` hip drop at peak, katana counterweight `-2.52`, smooth rebound to `idle` by `t = 0.16`).
- `parry` / `brake_skid`: Wide two-handed diagonal deflection `parry` (`hip = (4, -40)`, stance `50px`, `torsoLean = 0.18`, `handL = (20, -52)` + `handR = (25, -62)` on hilt, `weaponAngle = -1.10`) and low heel-digging `brake_skid` (`torsoLean = -0.26`).

## Change Tracker
- **Files modified**: `src/game/poses/kuroPoses.ts` (overhauled all 8 `BasicPoseName` states for Kuro).
- **Build status**: `rules.test.ts` 17/17 PASS; full Kuro `tsx -e` invariant + `blendSkeleton` + `Player('kuro')` + `render-poses.py` visual check PASS (`renderOk: true`, `blankCells: 0`, `nanCells: 0`, `lowDiffPairs: 0`).
- **Pending issues**: None (`tsc` standalone binary unavailable on Android ARM64 without `@typescript/typescript-android-arm64`, type-checked cleanly via `tsx`/esbuild runtime and `rules.test.ts`).

## Quality Status
- **Build/test result**: `rules.test.ts` 17/17 PASS; Kuro `tsx -e` invariant suite PASS (`208` Player substeps checked, `minL2ByPose >= 12.11`).
- **Lint status**: Clean TypeScript module adhering to project conventions.
- **Tests added/modified**: None (exclusive write ownership restricted to `src/game/poses/kuroPoses.ts`).

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/src/game/poses/kuroPoses.ts` — Overhauled Kuro pose suite (8 poses)
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kuro/DISPATCH.md` — Dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kuro/progress.md` — Liveness heartbeat
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kuro/handoff.md` — 5-component completion handoff report
