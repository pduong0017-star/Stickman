# BRIEFING — 2026-11-25T18:06:55Z

## Mission
Overhaul Zero's 8 basic movement/stance poses (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) in `src/game/poses/zeroPoses.ts` to deliver an unmistakable Anime Fighting / Hyuns Dojo twin-dagger shinobi-assassin silhouette while passing all quantitative, continuity, and visual invariants.

## 🔒 My Identity
- Archetype: Character Pose Specialist (`teamwork_preview_worker`)
- Roles: implementer, qa, specialist
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_zero`
- Original parent: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Milestone: M2-Zero

## 🔒 Key Constraints
- Exclusive write ownership: `src/game/poses/zeroPoses.ts` ONLY (plus metadata/reports inside `worker_zero/`).
- DO NOT touch `/data/.../scratch/stickman-build` or any other source/test files.
- Off-hand `handL` dagger renders at `weaponAngle + 0.55`; front-hand `handR` dagger renders at `weaponAngle` (need to verify exact `renderWeapon` anchor).
- Must pass `rules.test.ts` (17/17) and all Zero invariants (`NaN`-free, reach bounds `<=51.5`/`<=37.5`, `run` lean `>=0.48` & stride `>=50px`, `dash` lean `>=0.72` & `hip.y >= idle.hip.y+6`, `land` `hip.y >= idle.hip.y+7`, `parry` stance `>=40px` & `hip.y >= idle.hip.y+2`, forward knees, elbow continuity, distinctness).
- Incorporate parent visual polish notes: clean dagger placement (no chest/neck/face clipping in `jump`, `fall`, `run`), tight X-scissor `parry` guard (`hip.y ≈ -35..-37`), deep shinobi `run` (`~0.80` rad) with wide explosive stride.

## Current Parent
- Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Updated: `2026-11-25T18:10:20Z`

## Task Summary
- **What to build**: Complete Anime Fighting shinobi-assassin pose set in `src/game/poses/zeroPoses.ts`.
- **Success criteria**: Visually iconic twin-dagger shinobi poses with zero dagger-to-face/torso clipping, all invariants passing, `rules.test.ts` 17/17 passing.
- **Interface contracts**: `PROJECT_R2.md` § Interface Contracts (`src/game/poses/types.ts`, `src/game/poses/poseMath.ts`).
- **Code layout**: `PROJECT_R2.md` § Code Layout (`src/game/poses/zeroPoses.ts` ONLY).

## Key Decisions Made
- Placed `idle` at `hip = (2, -40 + breath)`, `torsoLean = 0.35`, wide agile stance (`-22..+23`), `handL` behind torso guard and `handR` poised low-forward with reverse-grip `weaponAngle = 2.68` so both blades point cleanly away from head/neck.
- Tuned `run` via `computeAnimeSprintStride` (`hipBaseY = -39.0`, `torsoLeanBase = 0.82`, `strideRadius = 30.5`, `footLift = 23`, `driveBias = 0.62`, `leadArmX = -2`, `trailArmX = 1`, `weaponAngleBase = -2.85`) keeping both hands behind torso and within `36.5px <= 37.4px` of rotated shoulders.
- Placed both hands behind core in `jump` (`handL=(-14,-62), handR=(-8,-53), weaponAngle=-2.85`) and `fall` (`handL=(-15,-59), handR=(-10,-50), weaponAngle=-2.75`), completely eliminating M1 dagger-to-face/neck clipping.
- Positioned `handL = (20, -66)` ABOVE `handR = (21, -50)` with `weaponAngle = -1.12` in `parry` (`hip = (3, -36)`, stance `49px`) so the `weaponAngle + 0.55` off-hand and `weaponAngle` front-hand blades intersect cleanly at `(32.7, -74.1)` in front of the head (`12.2, -82.2`).
- Lowered `dash` (`hip = (16, -30)`, `torsoLean = 1.02`) and `land` (`computeLandingCurve(t, 0.16)`, peak `hip.y = -30`) to `+10px` below `idle.hip.y`.

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_zero/DISPATCH.md` — Worker dispatch record
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_zero/BRIEFING.md` — Persistent working memory
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_zero/progress.md` — Liveness heartbeat
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_zero/handoff.md` — Final 5-component handoff report
- `/storage/emulated/0/Antigravity/Stickman/src/game/poses/zeroPoses.ts` — Overhauled Zero pose module

## Change Tracker
- **Files modified**: `src/game/poses/zeroPoses.ts` — Overhauled all 8 `BasicPoseName` poses for Zero.
- **Build status**: `rules.test.ts` 17/17 pass; Zero invariant & live `Player('zero')` verification script passed 100%.
- **Pending issues**: None (M3 handles full E2E/Visual/Vite build after all 5 character workers complete).

## Quality Status
- **Build/test result**: `rules.test.ts` 17/17 pass; `tsx -e` Zero suite 100% pass.
- **Lint status**: Clean TypeScript syntax, zero `NaN`/clamp violations.
- **Tests added/modified**: None (read-only on test files per exclusive ownership).

## Loaded Skills
- None (methodology from `PROJECT_R2.md` & `poseMath.ts`).
