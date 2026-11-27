# Phase 0 Survey 3 Handoff — Build Pipeline, Test Suite & Visual Render Pipeline

**Summary**: The baseline test suite runs end-to-end on Android ARM64 via `tests/e2e/run-e2e.mjs` (`122/127` passing, `5` failing exclusively because `aether` + 2 skins were added after the 4-character/12-skin assertions). Production `vite build` succeeds in `/data/.../scratch/stickman-build` (`7.45s`), but `tsc --noEmit` currently fails with 2 pre-existing errors on `'astral_halo'` in `src/game/characters.ts`, and `dist/` is slightly behind `src/game/{Boss,Enemy,Player}.ts`. Extending `mockCanvas.ts`, `testHarness.ts`, and Pillow `render-skins.py` (or adding a sibling `render-poses.py`) cleanly supports programmatic skeleton kinematics verification and 5×7 pose-sheet PNG rendering for all 5 fighters (`kuro`, `raijin`, `kagura`, `zero`, `aether`).

---

## 1. Observation

### 1.1 Baseline Test Suite Execution (`node tests/e2e/run-e2e.mjs --with-unit --tier=all`)
Executed on Node `v26.13.1`, Pillow `13.0.0`, `esbuild` bootstrapped automatically to `/data/user/0/com.agy/cache/esbuild_bin`:

| Suite | File | Result | Pass / Total | Fail | Duration |
|---|---|---|---|---|---|
| Unit | `src/game/rules.test.ts` | FAIL | `15 / 17` | 2 | `5,053ms` |
| Tier 1 (Features) | `tests/e2e/tier1_features.e2e.test.ts` | FAIL | `43 / 46` | 3 | `9,214ms` |
| Tier 2 (Boundaries) | `tests/e2e/tier2_boundaries.e2e.test.ts` | PASS | `46 / 46` | 0 | `10,060ms` |
| Tier 3 (Pairwise) | `tests/e2e/tier3_pairwise.e2e.test.ts` | PASS | `12 / 12` | 0 | `13,981ms` |
| Tier 4 (Workloads) | `tests/e2e/tier4_workloads.e2e.test.ts` | PASS | `6 / 6` | 0 | `236,735ms` |
| **TOTAL** | | **FAIL (exit 1)** | **`122 / 127`** | **5** | **`~275s`** |

Exact baseline failures observed verbatim:
1. `src/game/rules.test.ts:139` (`playable character roster defines 4 distinct fighters with unique skills and kanji`) — failed at line `140`: `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 5 !== 4` (`CHARACTER_ORDER` in `src/game/characters.ts:86` is `['kuro', 'raijin', 'kagura', 'zero', 'aether']`).
2. `src/game/rules.test.ts:272` (`elemental mark detonations, Overdrive Ultimates, and cooldown refunds scale cleanly across all fighters`) — failed at line `291`: `AssertionError [ERR_ASSERTION]: Every fighter has a distinct elemental detonation callout: 5 !== 4` (`ELEMENTAL_MARK_SPECS` in `src/game/synergy.ts:16-77` has 5 entries including `aether`).
3. `tests/e2e/tier1_features.e2e.test.ts:42` (`T1-F1-01`) — failed at line `45`: `14 !== 12` (`skinVfx.ts` defines 14 profiles: 12 original + `aether:default`, `aether:prismatic_archon` at `src/game/skinVfx.ts:383-438`).
4. `tests/e2e/tier1_features.e2e.test.ts:51` (`T1-F1-02`) — failed at line `60`: `14 !== 12`.
5. `tests/e2e/tier1_features.e2e.test.ts:124` (`T1-F1-06`) — failed at line `128`: `14 !== 12` (`types.ts:19-33` now defines 14 `SlashVfxMotif` values including `'arcane_sigil'` and `'prismatic_nova'`).

### 1.2 Build & TypeScript Pipeline (`/data/.../scratch/stickman-build` & `dist/`)
- **Workspace config**:
  - `package.json:6-12`: `"build": "vite build"`, `"lint": "tsc --noEmit"`, `vite@^8.3.0`, `typescript@^7.0.2` (`tsgo` in workspace `node_modules` lacks `@typescript/typescript-android-arm64` and `/storage/emulated/0` is mounted `noexec`).
  - `vite.config.ts:1-45`: Uses `@vitejs/plugin-react`, `@tailwindcss/vite`, `@` alias to `.`, and `copy-unbundled-src-assets` plugin (`vite.config.ts:15-29`) copying `src/assets` to `dist/src/assets` in `closeBundle`. Note: uses `__dirname` at line 22, emitting a Vite 8 configLoader deprecation warning (non-fatal).
  - `tsconfig.json:1-28`: `target: ES2022`, `moduleResolution: bundler`, `noEmit: true`, `allowImportingTsExtensions: true`, `exclude: ["dist"]`.
- **Scratch build directory**: `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` has `typescript@5.8.3` (`node node_modules/typescript/bin/tsc`) and `vite@8.3.8` (`node node_modules/vite/bin/vite.js`).
- **Typecheck result (`tsc --noEmit` in `stickman-build`)**: Exited with **code 2** (`2` errors in `src/game/characters.ts`):
  - `src/game/characters.ts:314:5`: `error TS2820: Type '"astral_halo"' is not assignable to type '"none" | "volt_visor" | ... | "astral_hood"'.`
  - `src/game/characters.ts:691:9`: same `TS2820` error for `aether:prismatic_archon`.
  - Confirmed in `src/game/characters.ts:46-58` and `src/game/StickmanRenderer.ts:161-173,1625-1934`: `'astral_halo'` is missing from both `headGear` type unions AND has no `else if (gear === 'astral_halo')` branch in `renderHeroHeadGear`.
- **Vite build result (`node node_modules/vite/bin/vite.js build` in `stickman-build`)**: Exited with **code 0** in `7.45s` (`1682` modules transformed: `dist/index.html` 1.76 kB, `dist/assets/index-Bso0tzXZ.css` 42.95 kB, `dist/assets/index-CY_UkIDE.js` 654.19 kB).
- **`dist/` sync state**:
  - `Stickman/dist/index.html` and `stickman-build/dist/index.html` have identical timestamp (`Nov 26 00:25`) and MD5 (`05f079b3079b89e89fddff1ce818cdde`), with matching asset hashes (`index-Bso0tzXZ.css`, `index-CY_UkIDE.js`).
  - However, `diff -u --brief Stickman/src stickman-build/src` shows **3 modified files** (`Boss.ts`, `Enemy.ts`, `Player.ts`). E.g., `Stickman/src/game/Player.ts` (mtime `00:25:40`) has `invulnTimer = 0.35` (`Player.ts:475`) and `basicStepScale = 0.68 / 0.8` (`Player.ts:1930-1931`), whereas `stickman-build/src/game/Player.ts` (mtime `00:25:04`) has `0.55` and `0.8 / 0.9`. Thus `Stickman/dist/` is **stale** relative to `Stickman/src/`.

### 1.3 Existing Test Harness & Visual Render Pipeline Inspection
- `tests/e2e/run-e2e.mjs`:
  - Supports `--tier=1|2|3|4|all`, `--with-unit`, `--render-visuals`, `--out-dir=<path>`, `--verbose`.
  - Copies `esbuild` to `$TMPDIR/esbuild_bin` (`chmod 0o755`) and runs `node node_modules/tsx/dist/cli.mjs --test <file>` (`run-e2e.mjs:75-146`).
  - Creates `opts.outDir` and `.nomedia` automatically (`run-e2e.mjs:172-176`).
- `tests/e2e/helpers/mockCanvas.ts`:
  - `RecordingContext2D` (`mockCanvas.ts:140-786`) tracks affine matrix stack across `save/restore`, tessellates `moveTo/lineTo/quadraticCurveTo/bezierCurveTo/arc/ellipse/rect/roundRect` into screen-space `DrawCommand[]`, flags any non-finite numbers via `checkFinite` (`nanDetected`, `nanEvents`), enforces `shadowBlur === 0`, and builds `getTraceSignature()`.
  - `installDomShims` (`mockCanvas.ts:838-928`) mocks `window`, `document`, `HTMLElement`, `localStorage`, and `requestAnimationFrame` without touching read-only `globalThis.navigator`.
- `tests/e2e/helpers/testHarness.ts`:
  - `ALL_12_SKINS` (`testHarness.ts:34-47`) only covers the first 4 characters (12 skins); does NOT include `aether:default` or `aether:prismatic_archon`.
  - `buildSkinVisualSnapshot` (`testHarness.ts:288-454`) hardcodes `poseByChar` and `trailStyleByChar` for `kuro`, `raijin`, `kagura`, `zero` (missing `aether`, though `Record<CharacterId, ...>` was typed before `aether` or bypassed via tsx).
  - `createTestPlayer` (`testHarness.ts:192-271`) and `createHeadlessGame` (`testHarness.ts:141-190`) cleanly step `Player` and `Game` deterministically frame-by-frame.
- `tests/e2e/helpers/assertions.ts`:
  - Exports `assertValidCssHexColor`, `assertDrawTraceValid`, `assertDistinctSignatures`, `assertUniqueTuples`.
- `tests/e2e/render-skins.py`:
  - Pillow `13.0.0` rasterizer with CSS color parser, gradient stops, and `'lighter'` additive blending (`ImageChops.add`).
  - Hardcoded to `len(skins) != 12` (`render-skins.py:309`), `4×3` grid (`render-skins.py:350`), and `all_12_skins_grid.png` (`render-skins.py:355`).
  - Existing renders in `.agents/teamwork/e2e_renders/` (including `.nomedia`, `all_12_skins_grid.png`, `render_metrics.json` with `ok: true`, `pairwise_mae_min: 2.6677`) were freshly regenerated during `T4-03` in our baseline run!

### 1.4 Current Pose & Skeleton Architecture Gaps (Relevant to Testing Plan)
- `StickPoseName` (`src/game/StickmanRenderer.ts:6-60`) currently lists `idle`, `run`, `brake_skid`, `jump`, `double_jump_flip`, `fall`, `dash`, `parry`, etc., **but has NO `'land'` pose**.
- `Player.ts:993-1054` applies squash-and-stretch (`scaleX = 1.22`, `scaleY = 0.78`) on touchdown, and `Player.getCurrentPose()` (`Player.ts:2028-2049`) immediately returns `'run'` or `'idle'` when `onGround === true`.
- `computeStickmanSkeleton(pose, t, walkPhase)` (`StickmanRenderer.ts:241-1068`) does **not** accept `characterId` (or character archetype), so all 5 fighters share identical `idle`, `run`, `dash`, `jump`, `fall`, and `parry` skeleton geometry.
- `solveTwoBoneIK(root, target, len1, len2, bendDir)` (`StickmanRenderer.ts:216-236`) uses fixed segment lengths: thigh `26` + shin `26` with `bendDir = -1` (knees), upper arm `19` + forearm `19` with `bendDir = 1` (elbows), torso length `34`, head offset `13` (`StickmanRenderer.ts:1028-1048`).
- In `src/game/animation.ts:139-151, 163-298, 338-1093`, `getUltimateStyleId`, `getAwakenedVisualProfile`, and `getComboMoveForCharacter` fall back to `kuro` when passed `'aether'` (no `'aether'` case yet, though `rules.test.ts:139-160` and `250-270` only passed because `getCharacterDef` / `getAwakenedVisualProfile` / `getComboMoveForCharacter` fell back or were tested on 4/5).

---

## 2. Logic Chain

1. **Why 5 baseline tests fail**: `aether` (`aether:default`, `aether:prismatic_archon`) was added to `CHARACTER_ORDER` (`characters.ts:86`), `ELEMENTAL_MARK_SPECS` (`synergy.ts:65-76`), and `SKIN_VFX_PROFILES` (`skinVfx.ts:383-438`), increasing character count from `4 → 5` and skin/motif count from `12 → 14`. Existing assertions in `rules.test.ts:140,291` and `tier1_features.e2e.test.ts:45,60,128` still hardcode `4` and `12`.
2. **Why `tsc --noEmit` fails while `tsx` tests and `vite build` succeed**: `esbuild`/`rolldown` strip TypeScript types without typechecking. Pure-JS `tsc@5.8.3` in `scratch/stickman-build` performs full typechecking and catches `'astral_halo'` missing from `CharacterDefinition['headGear']`. (Also, adding `aether` to `Record<CharacterId, ...>` in `testHarness.ts:349,386` is needed if `tests/e2e` is ever typechecked; currently `tsconfig.json` includes `tests/` unless excluded, wait—`tsconfig.json` has no `include` so it includes `tests/` too! Wait: `tsc --noEmit` in `scratch/stickman-build` only saw `src/` because `tests/` wasn't copied into `scratch/stickman-build`!).
3. **Why `dist/` must be rebuilt after edits**: `scratch/stickman-build/src` diverged from `Stickman/src` on `Boss.ts`, `Enemy.ts`, `Player.ts` right after the `00:25` build, so `Stickman/dist/` does not yet contain the latest `src/` edits.
4. **How to verify the 5-character pose overhaul**:
   - Because `computeStickmanSkeleton` returns pure numeric `SkeletonJoints` (`14 × Vec2` + `weaponAngle`) and `renderStickman` emits tessellated `DrawCommand[]` into `RecordingContext2D`, we can verify kinematics **deterministically in Node** (milliseconds per test) AND rasterize visual pose sheets **via Pillow 13.0.0** without needing Chromium.
   - However, `Player.getCurrentPose()` and `computeStickmanSkeleton()` will need a `'land'` pose and a `characterId` parameter (or character-specific pose dispatch) implemented by the feature agents before character-distinct pose tests and `'land'` tests can pass.

---

## 3. Caveats

- **Read-only scope**: No source files, `rules.test.ts`, `tests/e2e/*`, or `dist/` were modified during this survey.
- **Typechecking `tests/e2e/`**: In `scratch/stickman-build`, only `src/`, `public/`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts` were copied (matching `TEST_INFRA.md:44-47`), so `tsc --noEmit` did not typecheck `tests/e2e/` (where `testHarness.ts:349,386` also has `Record<CharacterId, ...>` missing `aether`!).
- **Runtime of Tier 4**: `tier4_workloads.e2e.test.ts` takes ~237s on Android ARM64 primarily due to `T4-01` + `T4-02` stepping thousands of full `Game.render()` frames through `RecordingContext2D` tessellation. New pose tests should be placed in a dedicated fast suite (or Tier 1/2/separate `--pose` script) so rapid iteration during per-character development takes `< 10s`.
- **Existing 5 baseline failures**: Decide with the orchestrator whether Phase 1+ should update those 5 assertions (`4 → 5` characters, `12 → 14` skins/motifs) or keep `T4-03` scoped to 12/14 skins; `ALL_12_SKINS` in `testHarness.ts` and `render-skins.py` (`len(skins) != 12`) are tightly coupled to the 12-skin grid right now.

---

## 4. Conclusion & Concrete Plan for Pose/Joint Testing + Visual Pose Sheets

### 4.1 Build & Baseline Remediation Prerequisites
1. **Fix `astral_halo` type/render gap** (or verify who owns it): Add `'astral_halo'` to `CharacterDefinition['headGear']` (`src/game/characters.ts:46-58`), `StickmanRenderOptions['headGear']` (`src/game/StickmanRenderer.ts:161-173`), and implement its halo branch in `renderHeroHeadGear` (`StickmanRenderer.ts:1625+`), OR align `aether` to an existing `headGear`.
2. **Sync `scratch/stickman-build/src` and rebuild `dist/`**: At final gate, re-copy `src/` per `TEST_INFRA.md:42-48`, verify `tsc --noEmit` exits `0`, run `vite build`, and copy `scratch/stickman-build/dist` back to `Stickman/dist`.
3. **Baseline 5-failure alignment**: Update `rules.test.ts:140,291` (`4 → 5`, plus `aether` coverage in `rules.test.ts:250-270` if appropriate) and `tier1_features.e2e.test.ts` (`12 → 14` or filter/include `aether` profiles consistently with `testHarness.ts`).

### 4.2 Programmatic Pose & Joint Test Plan (`tests/e2e/poses.e2e.test.ts` + `tests/e2e/helpers/poseAssertions.ts`)
Keep `mockCanvas.ts` and `testHarness.ts` clean while adding a dedicated pose verification helper and test suite covering all **5 characters** (`['kuro', 'raijin', 'kagura', 'zero', 'aether']`) across all **7 basic states** (`['idle', 'run', 'dash', 'jump', 'fall', 'land', 'parry']`):

1. **Test Harness Extension (`tests/e2e/helpers/testHarness.ts`)**:
   - Add `ALL_5_CHARACTERS: CharacterId[] = ['kuro', 'raijin', 'kagura', 'zero', 'aether']` and `BASIC_POSES = ['idle', 'run', 'dash', 'jump', 'fall', 'land', 'parry'] as const`.
   - Add `sampleCharacterPoseSkeleton(characterId, pose, t, walkPhase)`: calls `computeStickmanSkeleton(pose, t, walkPhase, characterId)` (once the overhaul adds optional `characterId` to `computeStickmanSkeleton`, with graceful fallback if omitted during transition).
   - Add `drivePlayerToPoseState(characterId, targetPose)`: uses `createTestPlayer(characterId, 'default')` with real `Player.update()` inputs (`left/right` held for `run`, `dash` tap for `dash`, `jump` tap + upward `vy < 0` for `jump`, apex/falling `vy > 0` for `fall`, touchdown frame for `land`, `parry` tap for `parry`) to verify **`Player.getCurrentPose()`**, **`blendedJoints`**, and **`render()`** in live simulation (not only isolated `computeStickmanSkeleton`!).
   - Add `buildPoseSheetPayload(width = 320, height = 260)`: renders all `5 × 7 = 35` `(characterId, pose)` cells using `renderStickman()` onto `MockCanvasElement(320, 260)` (plus optional joint-node / floor-line trace check) for Pillow rasterization.

2. **Programmatic Joint & Kinematics Assertions (`tests/e2e/helpers/poseAssertions.ts`)**:
   - **P1 — Zero `NaN` / `Infinity` in Joints & Draw Trace**:
     - Verify `Number.isFinite(pt.x) && Number.isFinite(pt.y)` for all 14 joints (`hip`, `spineMid`, `neck`, `head`, `shoulderL/R`, `elbowL/R`, `handL/R`, `kneeL/R`, `footL/R`) and `Number.isFinite(weaponAngle)` across multi-frame sweeps (`t ∈ [0, 1.0]`, `walkPhase ∈ [0, 2π)` in 16 steps).
     - Assert `assertDrawTraceValid(ctx.metrics)` (`nanDetected === false`, `saveCount === restoreCount`, `shadowBlurUsed === false`).
   - **P2 — Torso Lean & Run Stride Width**:
     - Compute torso lean angle from joints: `torsoLeanRad = Math.atan2(j.neck.x - j.hip.x, j.hip.y - j.neck.y)` (positive = leaning forward when facing `+1`, since `y` is negative-upwards).
     - Assert `run` peak/average forward lean `torsoLeanRad >= 0.22` rad (~12.6°, well above upright `0.10`), and `dash` forward lean `torsoLeanRad >= 0.55` rad (~31.5°, note `aether` mage glide-dash or others may tune exact minimum per archetype—validate >= `0.45`–`0.55` rad).
     - Compute run stride width across 16 phases `walkPhase ∈ [0, 2π)`: `maxStrideX = max(Math.abs(j.footR.x - j.footL.x))`. Assert `maxStrideX >= 36` px (current `computeSprintFoot` reaches ~46px; prevents short "rón rén" stepping where `maxStrideX < 25`px). Also verify alternating foot lift (`min(footL.y) < -10` and `min(footR.y) < -10` and ground contact `max(foot.y) >= -2`).
   - **P3 — Lowered Center of Gravity (`land` and `dash` vs `idle`)**:
     - Because floor is `y = 0` and upward is negative `y`, higher numeric `hip.y` (smaller `|hip.y|`) means lower center of gravity.
     - Assert `land.hip.y > idle.hip.y + 4` (i.e. hip drops by at least 4–6px in `land` crouch vs `idle` standing hip) and `dash.hip.y > idle.hip.y + 4` (low aerodynamic dash). Also check `head.y` drops in `land` and `dash` vs `idle`.
   - **P4 — Joint Angle & IK Segment Sanity (No Inverted Elbows/Knees)**:
     - Verify bone segment lengths stay bounded (`dist(hip, knee) <= 26.5`, `dist(knee, foot) <= 26.5`, `dist(shoulder, elbow) <= 19.5`, `dist(elbow, hand) <= 19.5`, `dist(hip, neck) <= 35`).
     - Verify anatomical bend direction (2D cross product `cross(B - A, C - B)`):
       - For legs (`hip -> knee -> foot`, facing `+1`): knee must bend **forward** (`cross_z` sign consistent with `bendDir = -1` in screen coords, i.e., `knee.x >= (hip.x + foot.x) * 0.5 - 3` for normal grounded/running poses, never hyper-extending backward like a flamingo/ostrich knee!).
       - For arms (`shoulder -> elbow -> hand`, facing `+1`): elbow must bend **backward/downward** naturally (consistent with `bendDir = 1`, no sudden sign flip across consecutive frames of a continuous state like `run` or `idle`).
       - Verify **frame-to-frame transition continuity**: stepping `Player` through `idle -> run -> dash -> jump -> fall -> land -> parry -> idle` via `stepSkeletonBlend`, check max per-frame joint delta (`maxJointDelta < 22px` at `60fps`) and zero sudden knee/elbow flip inversions.
   - **P5 — Character Pose Distinctness**:
     - Across the 5 fighters (`kuro`, `raijin`, `kagura`, `zero`, `aether`), verify their `idle`, `run`, `dash`, `jump`, `fall`, `land`, and `parry` skeletons/signatures are not identical copies (`assertDistinctSignatures` or joint-vector L2 distance > threshold between distinct archetypes).

### 4.3 Visual PNG Pose Sheet Rendering Plan (`tests/e2e/render-poses.py` or `render-skins.py --mode=poses`)
1. **Why a dedicated script or `--mode=poses` flag**: `render-skins.py` currently enforces `len(skins) == 12` (`render-skins.py:309`) for `T4-03`. To avoid breaking `T4-03`, either:
   - **Option A (Recommended)**: Add `tests/e2e/render-poses.py` reusing `parse_css_color`, `composite_layer`, `rasterize_commands`, `build_stage_backdrop` from `render-skins.py`, OR
   - **Option B**: Add `--mode=poses` to `render-skins.py` + `run-e2e.mjs --render-poses`.
2. **Output Layout (`.nomedia`-isolated)**:
   - Directory: `.agents/teamwork/e2e_renders/poses/` (with `.nomedia` file created before writing any PNG).
   - Individual character strips or cells: `pose_<char>_<state>.png` (or 1 strip per character `poses_<char>.png` of `7 × 320×260` = `2240×260`) AND a unified **5×7 contact sheet** `.agents/teamwork/e2e_renders/poses/all_5_chars_poses_grid.png` (`2240×1300` or `5 rows × 7 cols`: rows = `KURO, RAIJIN, KAGURA, ZERO, AETHER`; cols = `idle, run, dash, jump, fall, land, parry`).
   - Companion `pose_metrics.json`: reports `blank_cells`, `nan_cells`, per-cell `non_bg_ratio`, and intra-character pose-to-pose `MAE > 1.0` (ensuring `land` vs `idle`, `dash` vs `run`, `jump` vs `fall` are visually distinct for every fighter).
   - Visually inspect `all_5_chars_poses_grid.png` and per-character strips directly with `view_file`.

---

## 5. Verification Method

Run the following independent checks to verify every observation in this report:
1. **Baseline Test Suite**:
   ```bash
   node tests/e2e/run-e2e.mjs --with-unit --tier=all
   ```
   Expected current baseline: `122/127` passing (`rules.test.ts` `15/17`, `tier1` `43/46`, `tier2` `46/46`, `tier3` `12/12`, `tier4` `6/6`), exit code `1`.
2. **TypeScript Typecheck (in scratch)**:
   ```bash
   node node_modules/typescript/bin/tsc --noEmit
   ```
   (Run in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build`) — currently exits `2` with `TS2820` at `src/game/characters.ts:314` and `691`.
3. **Vite Production Build (in scratch)**:
   ```bash
   node node_modules/vite/bin/vite.js build
   ```
   (Run in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build`) — exits `0` (`dist/assets/index-CY_UkIDE.js`).
4. **Source-to-Scratch Diff**:
   ```bash
   diff -u --brief /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/src
   ```
   Shows `Boss.ts`, `Enemy.ts`, `Player.ts` differ.
5. **Invalidation Conditions**: Any subsequent edit to `src/game/characters.ts`, `src/game/StickmanRenderer.ts`, `src/game/Player.ts`, `src/game/rules.test.ts`, or `tests/e2e/*` invalidates the baseline counts above and requires re-running steps 1–3.
