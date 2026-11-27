# M1 Handoff Report — Shared Pose Foundation & Integration (`worker_m1_foundation`)

**Status:** Complete (Hard Handoff)  
**Milestone:** M1 — Shared Pose Foundation & Integration

---

## 1. Observation

### 1.1 Files Created & Modified (Strict Exclusive Write Ownership)
1. **`src/game/poses/types.ts`** (new):
   - Exports `BasicPoseName` (`'idle' | 'run' | 'brake_skid' | 'jump' | 'fall' | 'land' | 'dash' | 'parry'`), `PoseContext`, `PoseDraft`, `CharacterPoseModule`, and `SprintStyleConfig`.
2. **`src/game/poses/poseMath.ts`** (new):
   - Defines `TORSO_LEN = 34`, `HEAD_OFFSET = 13`, `THIGH_LEN = 26`, `SHIN_LEN = 26`, `UPPER_ARM_LEN = 19`, `FOREARM_LEN = 19`, `LEG_MIN_REACH = 8`, `LEG_MAX_REACH = 51.4`, `ARM_MIN_REACH = 4`, `ARM_MAX_REACH = 37.4`.
   - Implements `clampToReach(root, target, minDist, maxDist)`, `solveSafeTwoBoneIK(root, target, len1, len2, bendDir)`, `resolveElbowBendDir(shoulder, hand, torsoLean, override?)`, `buildSkeletonFromDraft(draft)`, `computeAnimeSprintStride(walkPhase, cfg)`, `computeLandingCurve(t, duration)`, and `sanitizeFinite`/`sanitizeVec2`.
3. **`src/game/poses/index.ts`** (new):
   - Exports `BASIC_POSE_NAMES`, `isBasicPoseName`, `getCharacterPoseModule(characterId?)`, and `computeBasicCharacterSkeleton(pose, t, walkPhase, characterId?, extra?)` routing `'kuro'`, `'raijin'`, `'kagura'`, `'zero'`, and `'aether'`.
4. **Initial Character Pose Scaffolds** (new):
   - `src/game/poses/kuroPoses.ts` (Iaido swordsman baseline)
   - `src/game/poses/raijinPoses.ts` (Lightning spearman baseline)
   - `src/game/poses/kaguraPoses.ts` (Heavy flame Nodachi baseline)
   - `src/game/poses/zeroPoses.ts` (Twin-dagger shinobi baseline)
   - `src/game/poses/aetherPoses.ts` (VIP arcane battle mage baseline)
5. **`src/game/animation.ts`** (modified):
   - `blendSkeleton(prev, target, alpha)` (lines 48–103): interpolates anchor joints (`hip`, `spineMid`, `neck`, `head`, `shoulderL/R`, `footL/R`, `handL/R`, `weaponAngle`), re-clamps feet/hands to `[8, 51.4]` / `[4, 37.4]`, resolves elbows via `resolveElbowBendDir`, and re-solves knees/elbows via `solveSafeTwoBoneIK`.
   - `lerpAngle` & `lerpVec2` (lines 32–49): guarded against `NaN`/`Infinity`.
   - `computeRunStrideKinematics(walkPhase)` (lines 118–120): delegates to `computeAnimeSprintStride(walkPhase)`.
6. **`src/game/characters.ts`** (modified):
   - Line 59: added `'astral_halo'` to `CharacterDefinition['headGear']` union.
7. **`src/game/StickmanRenderer.ts`** (modified):
   - Line 14: added `'land'` to `StickPoseName`.
   - Lines 180–184: added `'astral_halo'` to `StickmanRenderOptions['headGear']`, plus optional `characterId?: CharacterId; vx?: number; vy?: number; awakened?: boolean;`.
   - Lines 225–235: extended `computeStickmanSkeleton(pose, t, walkPhase, characterId?, extra?)` (preserving 3-arg compatibility for `Enemy.ts`, `Boss.ts`, `rules.test.ts`), routing all 8 `BasicPoseName` values through `computeBasicCharacterSkeleton(...)` and routing legacy attack/special poses through `buildSkeletonFromDraft(...)` (lines 940–950).
   - Lines 1025–1031: `renderStickman` passes `opts.characterId` and `{ vx, vy, awakened }` to `computeStickmanSkeleton`.
   - Lines 1301–1332: when `opts.pose === 'parry'` and `opts.weapon === 'arcane_hands' || opts.weapon === 'prismatic_hands'` (`!isMono`), renders Aether's forward glowing arcane mandala barrier (`save()/restore()`, no `shadowBlur`).
   - Lines 1853–1886: implemented `'astral_halo'` celestial halo + orbiting starlight nodes + arcane eye in `renderHeroHeadGear`.
8. **`src/game/Player.ts`** (modified):
   - Lines 141–143, 281–283: added `landTimer`, `landDuration`, and `prevPose` fields (reset in `reset()`).
   - Lines 549, 640, 679, 701, 864–872, 924, 1001–1010, 1147, 1668: decrements `landTimer`, triggers `landTimer` on touchdown (`!this.onGround && (this.vy > 160 || this.kaguraAirDivePending || this.airSlamPendingImpact)`, `0.15s` normal / `0.22s` heavy slam), cancels immediately on `parry`, `dash`, `jump`, `startAttack`, `triggerSignatureSkill`, `standUpFromChair`, and `moveAxis !== 0` once `landTimer < landDuration - 0.06`.
   - Lines 703–704, 931–932, 1009–1010: softened jump/dash/land `scaleX`/`scaleY` to `0.94..1.07`.
   - Lines 870–872, 1113–1135: resets `poseTime = 0` on pose transitions (`pose !== this.prevPose`), aligns `walkPhase = 0.15` when starting run from standstill (`|vx| < 40` / `idle -> run`), and passes `this.character.id` + `{ vx, vy, awakened }` into `computeStickmanSkeleton`.
   - Line 2086: returns `'land'` in `getCurrentPose()` when `this.landTimer > 0`.
   - Lines 2167–2170: passes `characterId`, `vx`, `vy`, `awakened` into `renderStickman`.
9. **`src/game/rules.test.ts`** (modified):
   - Lines 139–140, 155–156, 291–292: aligned roster/kanji/special/callout/linkArt counts from `4` to `5`.

### 1.2 Observed Verification Outputs
- **Unit tests (`rules.test.ts`)**: `ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` → **exit 0, `17/17` passed, `0` failed** (`4040ms`).
- **Scratch TypeScript & Production Build**:
  - `node node_modules/typescript/bin/tsc --noEmit` (in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build`) → **exit 0 (`0` errors)** (`astral_halo` `TS2820` resolved).
  - `node node_modules/vite/bin/vite.js build` → **exit 0**, `1690 modules transformed`, built in `2.99s` (`dist/assets/index-BWwvnpNX.js 667.55 kB`).
- **Programmatic M1 Invariant Verification (`tsx -e "..."`)**: → **exit 0, `ALL_M1_INVARIANTS_VERIFIED_OK`**:
  - Verified all 5 characters × 8 basic poses × 8 time/phase samples: finite coordinates, `dist(hip, footL/R) <= 51.5`, `dist(shoulderL/R, handL/R) <= 37.5`, forward knees, `run` mean lean `>= 0.48` & `maxStride >= 50` & alternating lift `< -14` & ground plant `=== 0`, `dash` lean `>= 0.72` & `dash.hip.y >= idle.hip.y + 6` & `dash.hip.x > idle.hip.x`, `land` peak `>= idle.hip.y + 7` & rebound to idle, `parry` stance `>= 40px` & `parry.hip.y >= idle.hip.y + 2` & `torsoLean >= 0.05`, preserved bone lengths (`26px` thigh/shin, `19px` upper/forearm) across `blendSkeleton`, `NaN`/`Infinity` sanitization, `resolveElbowBendDir` behind-above `-1` vs front `+1`, live `Player` touchdown `'land'` entry + softened scale + immediate attack cancel, pairwise distinct skeletons across all 5 characters, and Aether `parry` + `'astral_halo'` `RecordingContext2D` trace (`nanDetected: false`, `saveCount === restoreCount`, `shadowBlurUsed: false`).
- **E2E Regression Checks**:
  - `node tests/e2e/run-e2e.mjs --with-unit --tier=3` → **exit 0, `29/29` passed** (`Unit 17/17`, `Tier 3 12/12`).
  - `node tests/e2e/run-e2e.mjs --tier=2` → **exit 0, `46/46` passed**.

---

## 2. Logic Chain
1. Centralizing bone constants, reach clamping (`[8, 51.4]` legs, `[4, 37.4]` arms), `solveSafeTwoBoneIK`, `resolveElbowBendDir`, torso-rotated shoulders, perpendicular `spineMid`, and `buildSkeletonFromDraft` in `src/game/poses/poseMath.ts` prevents stretched limbs, upward elbow inversions, and `NaN` propagation across both basic poses and legacy attack poses.
2. Interpolating primary anchors and re-clamping/re-solving knees & elbows in `blendSkeleton()` preserves exact bone lengths throughout transitions (e.g., `idle <-> dash`, `fall -> land -> parry`) while keeping `hip` linear interpolation compatible with `rules.test.ts:192-196`.
3. Routing the 8 `BasicPoseName` poses through `src/game/poses/index.ts` and isolating each fighter in `src/game/poses/<char>Poses.ts` guarantees zero file conflicts for the 5 M2 character specialists while keeping 3-arg `computeStickmanSkeleton(pose, t, walkPhase)` calls in `Enemy.ts`, `Boss.ts`, and `rules.test.ts` intact.
4. Adding a non-blocking `landTimer` in `Player.ts` (prioritized below combat/dash/parry/brake and immediately cleared on actions or post-60ms movement) delivers distinct landing compression + softened `scaleX`/`scaleY` (`0.94..1.07`) without altering R3 hitboxes, speeds, or cancel timing.

---

## 3. Caveats
- The 5 `src/game/poses/*Poses.ts` files are clean, invariant-compliant **initial M1 baseline scaffolds**; M2 character specialists will refine each character's artistic silhouette and expressive motion details.
- `tests/e2e/*` was not modified (per exclusive write ownership); `tier1_features.e2e.test.ts` still expects 12 skins until the E2E milestone updates it, and `Stickman/dist/` final sync is owned by M3.
- In `src/game/poses/kaguraPoses.ts`, `computeLandingCurve(t, 0.16)` completes its rebound at `t = 0.16s` (at `t = 0.15s` it is within `1.9px` of `idle.hip.y`).

---

## 4. Conclusion
Milestone **M1 — Shared Pose Foundation & Integration** is complete and verified. All shared pose math, IK clamping, transition blending, `'land'` state machine, `'astral_halo'` + Aether parry barrier, `4 -> 5` unit test alignment, initial 5-character scaffolds, TypeScript typecheck (`0` errors), and Vite build (`0` errors) pass cleanly, unblocking the 5 parallel M2 character pose milestones.

---

## 5. Verification Method
1. Run unit tests:
   ```bash
   ESBUILD_BINARY_PATH="/data/user/0/com.agy/cache/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts
   ```
   Expected: `17/17` passing, exit code `0`.
2. Sync `src/` to `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/src` and run:
   ```bash
   node node_modules/typescript/bin/tsc --noEmit && node node_modules/vite/bin/vite.js build
   ```
   Expected: exit code `0`, `0` TypeScript errors, Vite production bundle succeeds.
3. Run E2E regression tiers:
   ```bash
   node tests/e2e/run-e2e.mjs --tier=2
   node tests/e2e/run-e2e.mjs --tier=3
   ```
   Expected: Tier 2 `46/46` passing, Tier 3 `12/12` passing.
4. **Invalidation conditions:** Any subsequent edit to `src/game/poses/*`, `src/game/animation.ts`, `src/game/StickmanRenderer.ts`, `src/game/Player.ts`, `src/game/characters.ts`, or `src/game/rules.test.ts` requires re-running steps 1–3.
