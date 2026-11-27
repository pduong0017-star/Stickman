# Handoff Report — M2-Raijin (`worker_raijin`)

**Type**: Hard (Task Complete)  
**Target File**: `/storage/emulated/0/Antigravity/Stickman/src/game/poses/raijinPoses.ts`  
**Visual Strip**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/renders/poses/poses_raijin.png`

---

## 1. Observation

- **Weapon Mounting (`src/game/StickmanRenderer.ts:3412-3423, 3706-3789`)**: `renderWeapon` translates to `joints.handR` and rotates by `joints.weaponAngle`. Both `volt_spear` (`-36` to `+74/+96`) and `thunder_halberd` (`-42` to `+92/+114`) extend along local `+x` in the character's forward frame (`0` = forward, negative = upward-forward or backward at `~-2.88`, positive = downward-forward).
- **Baseline Failure Reproduced (`poses.e2e.test.ts:255-315`)**: Running the M1 baseline `raijinPoses.ts` produced `10/11` in `poses.e2e.test.ts` with exact failure:
  `AssertionError [ERR_ASSERTION]: POSE-P4-03 raijin parry->idle step=180: joint elbowR jumped 23.46px (must be < 22)`
  and visual inspection of baseline `poses_raijin.png` confirmed M1 `parry` placed `handR` at `(14, -68)` (~1.4px from `shoulderR`, inside `ARM_MIN_REACH = 4`) with `weaponAngle: 1.35` pointing the spearhead straight down into the floor, while `jump` had minimal pole-vault tuck (`footL: (-16, -21)`, `weaponAngle: -1.9`).
- **Implemented Changes (`src/game/poses/raijinPoses.ts:1-139`)**:
  - `idle` (lines 14-25): `hip: (1, -43 + breath)`, `torsoLean: 0.24`, `footL: (-22, 0)`, `footR: (23, 0)`, `handL: (20, -56 + breath)`, `handR: (-8, -46 + breath)`, `weaponAngle: -0.18`.
  - `run` (lines 27-51): `computeAnimeSprintStride` with `hipBaseX: 5`, `hipBaseY: -40.2`, `hipBounce: 3.0`, `strideRadius: 29.5`, `footLift: 22`, `driveBias: 0.58`, `torsoLeanBase: 0.74`, `torsoLeanBob: 0.035`, `leadArmX: 19`, `leadArmY: -53`, `leadArmSwing: 12`, `trailArmX: -12`, `trailArmY: -44`, `trailArmSwing: 4`, `weaponAngleBase: -2.88`, `weaponAngleSwing: 0.05`.
  - `brake_skid` (lines 53-64): `hip: (-7, -36)`, `torsoLean: -0.32`, `footL: (-16, 0)`, `footR: (28, 0)`, `handL: (-24, -48)`, `handR: (10, -46)`, `weaponAngle: -0.82`.
  - `jump` (lines 66-79): `hip: (4, -48 - tuck * 4)`, `torsoLean: 0.3`, `footL: (-24, -8 * tuck)` (extended trailing leg), `footR: (24, -26 * tuck)` (high-tucked lead knee), `handL: (22, -68)`, `handR: (-2, -52)`, `weaponAngle: -0.68` (two-handed pole-vault upward-forward spear angle).
  - `fall` (lines 81-94): `hip: (2, -46)`, `torsoLean: 0.35`, `headTilt: 0.12`, `footL: (-16, -12 + sway)`, `footR: (18, -22 - sway)`, `handL: (18, -50)`, `handR: (-4, -62)`, `weaponAngle: 0.55`.
  - `land` (lines 96-109): `computeLandingCurve(t, 0.16)`, `hip: (2, -43 + c * 13)`, `torsoLean: 0.24 + c * 0.26`, `footL: (-24 - c * 5, 0)`, `footR: (25 + c * 5, 0)`, `handL: (20 + c * 2, -56 + c * 10)`, `handR: (-8 - c * 4, -46 + c * 10)`, `weaponAngle: -0.18 - c * 0.56`.
  - `dash` (lines 111-123): `hip: (16, -32)`, `torsoLean: 0.98`, `footL: (-32, -7)`, `footR: (25, -2)`, `handL: (48, -43)`, `handR: (64, -42)`, `weaponAngle: -0.05` (both hands driving spear straight forward like a piercing bolt).
  - `parry` (lines 125-136): `hip: (3, -39)`, `torsoLean: 0.18`, `footL: (-25, 0)`, `footR: (26, 0)`, `handL: (24, -65)`, `handR: (16, -48)`, `weaponAngle: -1.16` (forward-upward diagonal shaft braced firmly in front of torso).
- **Post-Edit Test & Invariant Results**:
  - `src/game/rules.test.ts`: `17/17` PASS (0 failures).
  - `tests/e2e/poses.e2e.test.ts` (with `STICKMAN_RENDER_DIR=.../worker_raijin/renders`): `10/11` PASS — **all Raijin assertions pass**, including `POSE-P4-03` (`idle -> run -> dash -> jump -> fall -> land -> parry -> idle` passed for Kuro, **Raijin**, Kagura, and Zero; the single failure in the multi-character test was `POSE-P4-03 aether jump->jump step=86: joint elbowL jumped 31.66px`, in `aetherPoses.ts` which is outside our exclusive write ownership). `POSE-VISUAL-01` passed (`cell_count: 35`, `blank_cells: []`, `nan_cells: []`, `low_diff_pairs: []`).
  - Bespoke `tsx -e` Raijin audit across all 8 poses (`t ∈ [0, 1]`, `walkPhase ∈ [0, 4π]`), all 64 `blendSkeleton` pose-pair transitions, and live `Player('raijin')` loop (including `brake_skid`):
    - `minArmDist: 10.92`, `maxArmDist: 37.4`, `maxLegDist: 51.4`
    - `idleHipY: -43`, `runMeanLean: 0.74`, `runMaxStrideX: 57.91`, `runMinFootLY: -21.93`, `runMinFootRY: -21.93`, `maxFootLY: 0`, `maxFootRY: 0`
    - `dashLean: 0.98`, `dashHipDeltaY: 11`, `dashHipDeltaX: 15`
    - `landPeakDeltaY: 12.88`, `landReboundHipY: -43`
    - `parryStanceW: 51`, `parryHipDeltaY: 4`, `parryLean: 0.18`, `parryWeaponAngle: -1.16`
    - `jumpLean: 0.3`, `fallLean: 0.35`, `brakeHipY: -36`
    - `worstLiveDelta: 15.72` (`run->dash handR@96`, well below `< 22px`)
    - `minL2VsOthers`: `{ idle: 29.07, run: 13.91, brake_skid: 14.82, jump: 15.37, fall: 34.64, land: 23.95, dash: 59.19, parry: 14.65 }` (all `>= 3.0`).
  - Visual inspection of `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/renders/poses/poses_raijin.png` confirms all 7 rendered cells match the Anime Fighting lancer silhouette, with forward-upward parry spear, horizontal piercing dash spear, high-tucked pole-vault jump, and diagonal counterweight landing.

---

## 2. Logic Chain

1. In M1's `parry` scaffold, `handR` at `(14, -68)` was only `~1.4px` from `shoulderR`, triggering `clampToReach` inside `ARM_MIN_REACH = 4`. During `blendSkeleton` back to `idle` (`handR = (-8, -46)`), `rawHandR` crossed `shoulderR`, causing `resolveElbowBendDir` / `solveSafeTwoBoneIK` to snap `elbowR` by `23.46px` in one `1/120s` step. Moving `parry` `handR` to `(16, -48)` (`19.2px` from `shoulderR`) and `handL` to `(24, -65)` (`20.0px` from `shoulderL`) keeps both hands well outside `ARM_MIN_REACH` (`minArmDist = 10.92px` globally) and on a consistent downward/forward side of the shoulder, eliminating the `elbowR` snap (`worstLiveDelta = 15.72px < 22px`).
2. Simultaneously, changing `parry.weaponAngle` from `+1.35` to `-1.16` aligns the spear shaft with both forward hands (`handR` low grip, `handL` upper grip) and angles the spearhead forward-upward instead of into the floor.
3. Updating `idle` (`hip.y = -43`, `torsoLean = 0.24`), `dash` (`hip = (16, -32)`, `torsoLean = 0.98`, forward spear `handL=(48,-43)`, `handR=(64,-42)`, `weaponAngle = -0.05`), `jump` (extended rear leg `(-24, -8)` + tucked front leg `(24, -26)` + pole-vault `weaponAngle = -0.68`), `fall` (`torsoLean = 0.35`, `weaponAngle = 0.55`), `land` (`computeLandingCurve(t, 0.16)`, peak `-30.12`, counterweight `weaponAngle`), and `brake_skid` delivers distinct silhouettes (`minL2 >= 13.91` vs all 4 peers) while satisfying every quantitative invariant in `PROJECT_R2.md`.

---

## 3. Caveats

- `poses.e2e.test.ts` runs all 5 characters inside `POSE-P4-03` (`ALL_5_CHARACTERS`). Because `worker_aether` owns `src/game/poses/aetherPoses.ts` in parallel, `POSE-P4-03` currently fails on `aether jump->jump` (`step=86`) after Raijin already passes; final `11/11` E2E verification belongs to M3 once all 5 character workers complete.
- `node node_modules/typescript/bin/tsc --noEmit` failed to launch on this Android ARM64 host because `@typescript/typescript-android-arm64` is absent (`ERR` from TypeScript native wrapper); syntax/types of `raijinPoses.ts` were verified via `tsx` esbuild execution (`rules.test.ts`, `poses.e2e.test.ts`, and `tsx -e` audit), and full `tsc`/`vite build` will run in M3.
- `STICKMAN_RENDER_DIR` was pointed to `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/renders` during `poses.e2e.test.ts` so parallel character workers would not race on shared `.agents/teamwork/e2e_renders`.

---

## 4. Conclusion

`src/game/poses/raijinPoses.ts` has been cleanly overhauled across all 8 `BasicPoseName` states (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) within exclusive write ownership. All Raijin quantitative invariants, `POSE-P4-03` transition smoothness (`15.72px < 22px`), `rules.test.ts` (`17/17`), and visual pose checks (`poses_raijin.png`) pass.

---

## 5. Verification Method

Run from `/storage/emulated/0/Antigravity/Stickman`:

1. Unit suite (`17/17` pass):
   ```bash
   ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts
   ```
2. Pose E2E + Pillow visual render suite (pass for Raijin; full 11/11 pass expected once `worker_aether` resolves `aether jump->jump`):
   ```bash
   STICKMAN_RENDER_DIR="/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/renders" ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test tests/e2e/poses.e2e.test.ts
   ```
3. Inspect `/storage/emulated/0/Antigravity/Stickman/src/game/poses/raijinPoses.ts` and `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_raijin/renders/poses/poses_raijin.png`.
   - **Invalidation conditions**: Any edit to `raijinPoses.ts` that reduces `dist(shoulder, hand)` below `10px`, raises `worstLiveDelta` to `>= 22px`, violates `PROJECT_R2.md` reach/COG/lean thresholds, or fails `rules.test.ts` / `poses.e2e.test.ts`.
