# Handoff Report — worker_kagura (M2-Kagura)

**Handoff Type**: Hard  
**Target File Modified (Exclusive Ownership)**: `/storage/emulated/0/Antigravity/Stickman/src/game/poses/kaguraPoses.ts`

---

## 1. Observation

1. **Weapon & Renderer Geometry (`src/game/StickmanRenderer.ts`)**:
   - `renderWeapon` (`lines 3412-3422`, `3790-3902`) translates to `joints.handR` and rotates by `joints.weaponAngle`. For `flame_nodachi` (`lines 3810-3842`) and `solar_greatblade` (`lines 3876-3901`), the hilt extends from `-18` (or `-20`) to `+4` along local `-x` behind `handR`, and the blade extends forward `+6..+82` (or `+9..+130`).
   - `hasSheath: true` renders a waist scabbard anchored at `(joints.hip.x - 4, joints.hip.y + 2)` (`lines 1185-1194`).
2. **IK & Reach Clamping (`src/game/poses/poseMath.ts`)**:
   - `buildSkeletonFromDraft` (`lines 147-264`) rotates shoulders `(±4, +5)` around `neck` by `torsoLean`, clamps `footL/R` to `[8, 51.4]` from `hip`, clamps `handL/R` to `[4, 37.4]` from rotated `shoulderL/R`, and resolves elbows via `resolveElbowBendDir` (`lines 112-138`).
   - `computeAnimeSprintStride` (`lines 331-398`) drives `run` with `clampGroundFoot` (`lines 277-293`), keeping `foot.y === 0` during the grounded drive phase and lifting to `-footLift` during recovery.
3. **Final Implementation (`src/game/poses/kaguraPoses.ts:1-139`)**:
   - `idle` (`lines 14-25`): `hip: { x: -1, y: -42 + breath }`, `torsoLean: 0.18`, `footL: { x: -23, y: 0 }`, `footR: { x: 24, y: 0 }` (47px stance), `handL: { x: 19.5, y: -52 + breath }`, `handR: { x: 13, y: -61 + breath }`, `weaponAngle: -2.22`.
   - `run` (`lines 27-51`): `computeAnimeSprintStride` with `hipBaseX: 4.5`, `hipBaseY: -41.5`, `hipBounce: 2.6`, `strideRadius: 28.5`, `footLift: 17.5`, `driveBias: 0.58`, `torsoLeanBase: 0.62`, `torsoLeanBob: 0.03`, `leadArmX: 19`, `leadArmY: -51`, `leadArmSwing: 11`, `trailArmX: 0`, `trailArmY: -38`, `trailArmSwing: 3.5`, `weaponAngleBase: -2.72`, `weaponAngleSwing: 0.06`, `headTilt: -0.16`.
   - `brake_skid` (`lines 53-64`): `hip: { x: -6, y: -35 }`, `torsoLean: -0.26`, `footL: { x: -17, y: 0 }`, `footR: { x: 28, y: 0 }`, `handL: { x: 5, y: -49 }`, `handR: { x: 18, y: -44 }`, `weaponAngle: 0.36`.
   - `jump` (`lines 66-79`): `hip: { x: 1, y: -46 - tuck * 3.5 }`, `torsoLean: 0.26`, `footL: { x: -17, y: -19 * tuck }`, `footR: { x: 18, y: -11 * tuck }`, `handL: { x: 15, y: -62 }`, `handR: { x: 6, y: -68 }`, `weaponAngle: -2.38`.
   - `fall` (`lines 81-94`): `hip: { x: 2, y: -44 }`, `torsoLean: 0.32`, `footL: { x: -21, y: -9 + sway }`, `footR: { x: 21, y: -14 - sway }`, `handL: { x: 24, y: -57 }`, `handR: { x: 18, y: -66 }`, `weaponAngle: -1.98`.
   - `land` (`lines 96-109`): `computeLandingCurve(t, 0.16)` driving `hip: { x: -1 + c * 2, y: -42 + c * 14.5 }`, `torsoLean: 0.18 + c * 0.34`, `footL: { x: -23 - c * 6, y: 0 }`, `footR: { x: 24 + c * 6, y: 0 }`, `handL: { x: 19.5 + c * 3.5, y: -52 + c * 13 }`, `handR: { x: 13 + c * 3, y: -61 + c * 18 }`, `weaponAngle: -2.22 + c * 0.42`.
   - `dash` (`lines 111-123`): `hip: { x: 13, y: -32 }`, `torsoLean: 0.88`, `footL: { x: -31, y: -6 }`, `footR: { x: 24, y: -1 }`, `handL: { x: 24, y: -41 }`, `handR: { x: 5, y: -39 }`, `weaponAngle: -2.86`, `motionArc: { x: -8, y: -38, r: 48, sa: 2.2, ea: 3.9 }`.
   - `parry` (`lines 125-136`): `hip: { x: 0, y: -37 }`, `torsoLean: 0.16`, `footL: { x: -29, y: 0 }`, `footR: { x: 27, y: 0 }` (56px stance), `handL: { x: 21.5, y: -49 }`, `handR: { x: 24, y: -65 }`, `weaponAngle: -1.48`.
4. **Measured Test & Verification Outputs**:
   - `src/game/rules.test.ts`: `17/17` tests passed (`duration_ms 14569.37`, exit code 0).
   - Programmatic `tsx -e` check across all 8 poses (`t` sweep + `walkPhase ∈ [0, 4π]`):
     - `idle`: `hip=(-1, -42)`, `lean=0.18`, `footSpan=47`, `weaponAngle=-2.22`, `minL2VsOthers=28.16`
     - `run`: `meanLean=0.62`, `maxStrideX=55.95`, `minFootLY=-17.44`, `minFootRY=-17.44`, `maxFootLY=0`, `maxFootRY=0`, `minL2VsOthers=16.17`
     - `dash`: `hip=(13, -32)`, `lean=0.88`, `dropVsIdle=10`, `minL2VsOthers=30.67`
     - `land`: `peakHipY=-27.63`, `dropVsIdle=14.37`, `reboundHipY=-42`, `minL2VsOthers=30.96`
     - `parry`: `hip=(0, -37)`, `lean=0.16`, `footSpan=56`, `weaponAngle=-1.48`, `minL2VsOthers=16.95`
     - `brake_skid`: `hip=(-6, -35)`, `lean=-0.26`, `weaponAngle=0.36`, `minL2VsOthers=43.75`
     - `jump`: `hip=(1, -49.06)`, `lean=0.26`, `weaponAngle=-2.38`, `minL2VsOthers=34.07`
     - `fall`: `hip=(2, -44)`, `lean=0.32`, `weaponAngle=-1.98`, `minL2VsOthers=27.57`
   - Isolated visual render check via `tests/e2e/render-poses.py` (`$HOME/.gemini/tmp/kagura_check`, cleaned up after inspection): `cell_count: 35`, `blank_cells: []`, `nan_cells: []`, `low_diff_pairs: []`, Kagura `intra_char_mae.min_mae: 4.5619` (`poses_kagura.png` inspected visually).

---

## 2. Logic Chain

1. Because `renderWeapon` anchors the Nodachi at `handR` with the hilt extending `-18px` backward along `weaponAngle`, placing `handL` along `handR - (11..15) * (cos(weaponAngle), sin(weaponAngle))` in `idle`, `land`, `parry`, and `brake_skid` creates a genuine two-handed greatblade grip without arm-reach clamping distortion.
2. In `run`, `torsoLean = 0.62` places `shoulderR` forward around `x ≈ 24.5, y ≈ -63.5`; setting `trailArmX: 0, trailArmY: -38` keeps `dist(shoulderR, handR)` within `ARM_MAX_REACH` (`37.4`) while `localY > 0` across the entire sprint cycle, guaranteeing smooth `elbowBendDir = 1` without elbow inversion or abrupt snaps.
3. Setting `idle.hip.y = -42`, `dash.hip.y = -32` (`+10px` drop), `parry.hip.y = -37` (`+5px` drop, `56px` stance width, `torsoLean = 0.16`), and `land.hip.y = -42 + c * 14.5` (`+14.37px` peak drop at `t=0.04` with `59px` stance and seamless return to `idle` at `t=0.16`) satisfies both all `PROJECT_R2.md` quantitative thresholds and the M1 baseline visual polish feedback.
4. Raising `parry` stance width to `56px` and `handR` to `(24, -65)` with `handL` at `(21.5, -49)` eliminated the earlier `9.30` L2 proximity to Zero's parry scaffold, raising Kagura's minimum cross-character L2 distance across all 8 poses to `16.17–43.75px`.

---

## 3. Caveats

- `tsc --noEmit` did not run in this environment because `node_modules/typescript/lib/getExePath.js` looks for `@typescript/typescript-android-arm64` (native-preview binary missing in this Termux/Android workspace) and `/data/.../scratch/stickman-build` was intentionally untouched per dispatch rules to avoid parallel worker races.
- TypeScript compilation and runtime behavior of `src/game/poses/kaguraPoses.ts` were verified through `tsx` (`esbuild`), `rules.test.ts`, and `render-poses.py`. Full `tsc --noEmit`, `vite build`, and `dist/` sync remain scoped to M3.
- `tests/e2e/poses.e2e.test.ts` was not run directly against `DEFAULT_RENDER_DIR` to avoid concurrent file writes into `tests/e2e/renders/poses/` while peer character workers are running; instead, every assertion in `poseAssertions.ts` and `render-poses.py` was verified in isolation.

---

## 4. Conclusion

`src/game/poses/kaguraPoses.ts` is complete and verified. Kagura now delivers a distinct, grounded Heavy Flame Nodachi Powerhouse movement & stance suite across all 8 `BasicPoseName` states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) with zero `NaN`/`Infinity`, bounded IK limbs, non-inverted knees, continuous elbows, smooth `blendSkeleton` & `Player('kagura')` transitions, and clear silhouette separation from Kuro, Raijin, Zero, and Aether.

---

## 5. Verification Method

1. Run unit tests:
   ```bash
   ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts
   ```
   Expected: `17/17` pass, exit code `0`.
2. Run programmatic pose & transition suite (once peer workers finish, or directly for `kagura`):
   ```bash
   ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test tests/e2e/poses.e2e.test.ts
   ```
   Expected: All `POSE-P1`..`POSE-P5` and `POSE-VISUAL-01` checks pass with `0` blank/low-diff cells.
3. Inspect `/storage/emulated/0/Antigravity/Stickman/src/game/poses/kaguraPoses.ts` (`lines 1-139`) to confirm exclusive write scope and exact pose parameters.
4. **Invalidation conditions**: Any modification to `poseMath.ts` reach constants (`LEG_MAX_REACH`, `ARM_MAX_REACH`), `StickmanRenderer.ts` bone lengths/weapon hand offsets, or other character pose files reducing `skeletonL2Distance < 3.0` requires re-running steps 1–2.
