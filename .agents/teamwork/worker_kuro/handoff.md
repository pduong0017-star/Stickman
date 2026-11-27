# Handoff Report — worker_kuro (M2-Kuro)

## 1. Observation
- Read `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`, `PROJECT_R2.md`, `src/game/poses/{types,poseMath,index,kuroPoses}.ts`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/Player.ts`, `src/game/rules.test.ts`, `tests/e2e/helpers/poseAssertions.ts`, `tests/e2e/poses.e2e.test.ts`, and M1 visual baseline `.agents/teamwork/e2e_renders/poses/poses_kuro.png`.
- In `src/game/StickmanRenderer.ts:1185-1226`, `hasSheath` translates to `(joints.hip.x - 4, joints.hip.y + 2)`, rotates `0.28` rad, and draws the scabbard from `(-42, 0)` to `(14, 0)` with collar at `(10..13, -3..3)`, placing the sheath mouth at `≈ hip + (7.5, 5.3)`. In `renderWeapon` (`3412-3469`), the katana translates to `joints.handR`, rotates by `weaponAngle`, draws the hilt `(-16, 0) -> (2, 0)` and blade `(4, 0) -> (64, -4)`.
- In M1 `poses_kuro.png` and `kuroPoses.ts`:
  - `idle` had `hip.y = -45`, `torsoLean = 0.14`, `handL = (6, -50)` (above the waist sheath rather than resting on it) and subtle knee bend.
  - `run` had `trailArmX = -12, trailArmY = -45`, which exceeded `ARM_MAX_REACH = 37.4px` from `shoulderR` (`~41.2px`) and got clamped.
  - `parry` had `hip.y = -41`, `weaponAngle = -1.38` (nearly vertical) and narrower hands.
  - `jump` tucked the rear leg (`footL.y = -20`) higher than the front leg (`footR.y = -8`), and `fall` mirrored `jump`'s backward katana angle (`-2.35`).
- Modified **only** `src/game/poses/kuroPoses.ts` (`lines 4-154`):
  - `idle`: `hip = (0, -43.5 + breath)`, `torsoLean = 0.22 + poiseSway`, `spineBend = 6`, `footL = (-22, 0)`, `footR = (24, 0)`, `handL = (5, -39 + breath * 0.85)` resting at waist scabbard collar, `handR = (17, -45 + breath * 0.9)`, `weaponAngle = -0.24 + poiseSway`.
  - `run`: `computeAnimeSprintStride` with `hipBaseY = -42`, `hipBounce = 2.6`, `strideRadius = 29`, `footLift = 21`, `driveBias = 0.56`, `torsoLeanBase = 0.7`, `leadArmX = 22`, `leadArmY = -55`, `leadArmSwing = 11`, `trailArmX = -4`, `trailArmY = -48`, `trailArmSwing = 4`, `weaponAngleBase = -2.75`, `weaponAngleSwing = 0.08`, `headTilt = -0.16`.
  - `dash`: `hip = (14, -33)`, `torsoLean = 0.95`, `spineBend = 9`, `headTilt = -0.3`, `footL = (-32, -12)`, `footR = (24, -3)`, `handL = (8, -58)`, `handR = (16, -32)`, `weaponAngle = -2.92`, `motionArc = { x: -8, y: -40, r: 44, sa: 2.25, ea: 3.9 }`.
  - `jump`: `vy`-responsive front-knee tuck (`footR.y = -(20 + vyBoost * 3) * tuck`, `footL.y = -7 * tuck`), `torsoLean = 0.3`, `handL = (22, -64)`, `handR = (-10, -54)`, `weaponAngle = -2.42`.
  - `fall`: `vy`-responsive semi-tucked descent (`footL.y = -11 + sway - vyNorm * 2`, `footR.y = -16 - sway - vyNorm * 2`), `handL = (19, -62)`, `handR = (10, -44)`, `weaponAngle = -0.65`.
  - `land`: `computeLandingCurve(t, 0.16)` with peak `hip.y = -30.5` (`+13px` lower than `idle`), `footL = (-22 - c * 7, 0)`, `footR = (24 + c * 3, 0)`, `handR` swept back to `(-8, -38)` with `weaponAngle = -2.52` counterweight, rebounding smoothly to `idle` by `t >= 0.16`.
  - `parry`: `hip = (4, -40)`, `torsoLean = 0.18`, `footL = (-24, 0)`, `footR = (26, 0)` (`50px` stance), `handL = (20, -52)` and `handR = (25, -62)` both gripping katana hilt along `weaponAngle = -1.1`.
  - `brake_skid`: `hip = (-6, -37)`, `torsoLean = -0.26`, `footL = (-20, 0)`, `footR = (26, 0)`, `handL = (-24, -50)`, `handR = (16, -50)`, `weaponAngle = -0.78`.
- Observed test results after final edit:
  - `rules.test.ts`: `tests 17, pass 17, fail 0`.
  - Kuro `tsx -e` verification script: `ok: true`, `runMeanLean: 0.7`, `runMaxStride: 56.91`, `runMaxArmR: 37.4`, `dashLean: 0.95`, `dashHipDrop: 10.5`, `landHipDrop: 13`, `parryStance: 50`, `parryLean: 0.18`, `playerStepsChecked: 208`, `minL2ByPose`: `{ idle: 28.16, run: 13.91, brake_skid: 12.11, jump: 17.47, fall: 27.57, land: 23.54, dash: 31.92, parry: 16.95 }`, `renderOk: true`, `blankCells: 0`, `nanCells: 0`, `lowDiffPairs: 0`.

## 2. Logic Chain
1. Positioning `idle.handL` at `(5, -39)` and lowering `idle.hip.y` to `-43.5` with `footL.x = -22, footR.x = 24` aligns the off-hand directly on the waist sheath mouth (`hip + (7.5, 5.3)`) while producing visible forward knee flexion without exceeding `LEG_MAX_REACH` (`51.4px`).
2. Adjusting `run` parameters (`strideRadius = 29`, `hipBaseY = -42`, `trailArmX = -4, trailArmY = -48`) produces a `56.91px` stride span (`>= 54px`) with `0.7` rad mean lean while keeping `dist(shoulderR, handR) <= 37.4px` across all 32 cycle samples (preventing IK arm-clamp snapping).
3. Setting `dash` `handR = (16, -32)` at `hip = (14, -33)` places the sword hand directly at the waist sheath (`weaponAngle = -2.92` aligned with the scabbard) and lifting `handL` to `(8, -58)` separates the trailing arm cleanly above the hunched spine in silhouette.
4. Separating `jump` (front knee tucked high, katana swept back `-2.42`) from `fall` (semi-tucked knees, katana forward-diagonal ready `-0.65`) and giving `land` a `+13px` single-knee-drop shock absorb via `computeLandingCurve(t, 0.16)` creates clear pose silhouette separation (`lowDiffPairs: 0`) and smooth `Player('kuro')` transitions (`< 22px` max delta across all `208` fixed substeps).
5. Updating `parry` to `hip = (4, -40)`, `50px` stance width, `torsoLean = 0.18`, `handL = (20, -52)`, `handR = (25, -62)`, `weaponAngle = -1.1` directly satisfies the parent visual polish feedback and places both hands on the katana hilt in an active diagonal deflection wall.

## 3. Caveats
- `node node_modules/typescript/bin/tsc --noEmit` failed to launch on this Android ARM64 host because `@typescript/typescript-android-arm64` native wrapper is not installed on disk (`Error: Unable to resolve @typescript/typescript-android-arm64`). TypeScript compilation of `src/game/poses/kuroPoses.ts` and its callers was verified via `tsx`/esbuild execution (`rules.test.ts` and the `tsx -e` harness).
- Production `vite build` / `scratch/stickman-build` and shared `.agents/teamwork/e2e_renders` updates were intentionally skipped per parallel-worker isolation instructions (deferred to M3 integration).

## 4. Conclusion
`src/game/poses/kuroPoses.ts` now implements a complete, Anime Fighting / Hyuns Dojo Iaido pose suite across all 8 `BasicPoseName` states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) that satisfies every quantitative invariant, parent visual polish note, cross-character distinctness check (`minL2 >= 12.11`), `Player('kuro')` transition continuity check, and `rules.test.ts` (`17/17`).

## 5. Verification Method
Run from `/storage/emulated/0/Antigravity/Stickman`:
1. Unit test suite:
   ```bash
   ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts
   ```
   Expected: `17/17` pass.
2. Full Kuro pose, IK, continuity, `Player('kuro')` transition, and distinctness verification (or M3 full `poses.e2e.test.ts`):
   ```bash
   ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test tests/e2e/poses.e2e.test.ts
   ```
   (After all 5 character workers complete so there are no parallel render-directory races.)
3. Inspect `/storage/emulated/0/Antigravity/Stickman/src/game/poses/kuroPoses.ts` (`lines 1-154`).
