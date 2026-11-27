# Survey Explorer 3 Handoff — Build Mirror, Tests, Static/Headless & Visual Pipeline (R3)

**Summary**: `/data/user/0/com.agy/files/stickman-build/src` is currently in sync with `/storage/emulated/0/Antigravity/Stickman/src`, `rules.test.ts` passes **17/17**, `vite build` succeeds in **1.80s**, and `src/` already has **0 `shadowBlur` occurrences**. However, `tsc --noEmit` cannot execute on-device (`typescript@7.0.2` lacks `@typescript/typescript-android-arm64`), `tests/e2e/` currently passes **115/121** with **6 pre-existing failures**, and the headless/visual pipeline currently lacks coverage for **Valkyrie + 4 newer skins (18 total), Awakened states, all 8 Enemy types (Normal/Elite), and all 12 Bosses (Phase 1 & Phase 2)**.

---

## 1. Observation

### 1.1 Environment, Mirror & Build Baseline
- **`/data/user/0/com.agy/cache/esbuild_bin`**: Present and executable (`-rwxr-xr-x`, `11,534,582` bytes).
- **`/data/user/0/com.agy/files/stickman-build`**: Active mirror directory containing `src/`, `public/`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `node_modules/`, and `dist/`.
  - `diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src` exited with code `0` (zero differences).
  - Note: an older secondary mirror also exists at `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` (mtime `Nov 26 01:00`); `/data/user/0/com.agy/files/stickman-build` is the current mirror referenced in `ORIGINAL_REQUEST.md:79`.
- **Unit Tests (`src/game/rules.test.ts`)**:
  - Command in `/data/user/0/com.agy/files/stickman-build`:
    `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts`
  - Result: **17/17 passed, 0 failed** (`2259ms`).
- **Vite Production Build (`vite.config.ts`, `vite@8.3.8`)**:
  - Command in `/data/user/0/com.agy/files/stickman-build`: `node node_modules/vite/bin/vite.js build`
  - Result: **Exit 0**, `1693 modules transformed`, built `dist/assets/index-WRx7wZKa.js` (`725.54 kB`) and `dist/assets/index-C7dPc_2y.css` (`42.27 kB`) in **1.80s**. Copies `src/assets` to `dist/src/assets` via `copy-unbundled-src-assets` (`vite.config.ts:16-29`).
- **TypeScript Compiler (`tsc --noEmit`)**:
  - Workspace `package.json:33` specifies `"typescript": "^7.0.2"` (native `tsgo`).
  - Running `node node_modules/typescript/bin/tsc --noEmit` in `/data/user/0/com.agy/files/stickman-build` **fails with exit 1**:
    `Error: Unable to resolve @typescript/typescript-android-arm64. Either your platform is unsupported, or you are missing the package on disk.` (`node_modules/typescript/lib/getExePath.js:53`).
  - `find /data/user/0/com.agy -maxdepth 5 -name "tsc.js"` confirmed no pure-JS `typescript@5.x` installation exists on disk (despite `TEST_INFRA.md:11` mentioning `typescript@5.8.3`).

### 1.2 Existing E2E Suite Baseline (`tests/e2e/run-e2e.mjs --tier=all`)
- Total: **115/121 passed, 6 failed** across 5 suites:
  - **Tier 1 (`tests/e2e/tier1_features.e2e.test.ts`)**: `42/46` passed (`6761ms`). Failures:
    1. `T1-F1-01` (`:43-50`): `listAllSkinVfxProfiles().length` expected `14`, got `18`.
    2. `T1-F1-02` (`:52-62`): `ids.size` expected `14`, got `18`.
    3. `T1-F1-06` (`:125-133`): `seen.size` expected `14`, got `18`.
    4. `T1-F6-02` (`:770-803`): `kuro:void_walker afterimageColor` expected `#c084fc`, got `#a855f7` because `Player.ts:744` uses `ghostPalette = ['#a855f7', '#38bdf8', vfx.afterimageColor, '#818cf8', '#22d3ee']` where index `0` is hardcoded `#a855f7`.
  - **Tier 2 (`tests/e2e/tier2_boundaries.e2e.test.ts`)**: `45/46` passed (`5842ms`). Failure:
    5. `T2-F9-04` (`:840-861`): `assert.ok(html.includes('✓'))` failed because `TitleScreen.tsx:709-752` renders stage clearance badges (`✓ XONG`) only when `tab === 'stage'`, whereas default SSR state renders the fighter/skin tab.
  - **Tier 3 (`tests/e2e/tier3_pairwise.e2e.test.ts`)**: `12/12` passed (`9506ms`).
  - **Tier 4 (`tests/e2e/tier4_workloads.e2e.test.ts`)**: `6/6` passed (`146,773ms`), and regenerated `.agents/teamwork/e2e_renders/skin_01_*.png`..`skin_12_*.png`, `all_12_skins_grid.png`, `render_metrics.json`.
  - **Pose (`tests/e2e/poses.e2e.test.ts`)**: `10/11` passed (`12,947ms`), and regenerated `.agents/teamwork/e2e_renders/poses/all_5_chars_poses_grid.png`, `poses_*.png`, `pose_metrics.json`. Failure:
    6. `POSE-P4-03` (`:255-316`): `kuro run->dash step=53: joint elbowL jumped 33.84px (must be < 22)` (`poseAssertions.ts:178`).

### 1.3 Static Audit of `shadowBlur`, `ctx.save`, and `ctx.restore` in `src/`
- **`shadowBlur` across all of `/storage/emulated/0/Antigravity/Stickman/src`**: **0 occurrences** (verified via `grep_search` for `shadowBlur` and Python regex scan across all `.ts`/`.tsx` files).
- **`ctx.save()` / `ctx.restore()` static call-site counts in `src/`**:

| File | `ctx.save()` | `ctx.restore()` | `shadowBlur` | Notes |
|---|---:|---:|---:|---|
| `src/game/Boss.ts` | 4 | 4 | 0 | Balanced 1:1 |
| `src/game/Enemy.ts` | 5 | 5 | 0 | Balanced 1:1 |
| `src/game/Entities.ts` | 33 | 35 | 0 | Extra restores are early-return branches (verified via line audit) |
| `src/game/Game.ts` | 6 | 6 | 0 | Balanced 1:1 |
| `src/game/ParticleSystem.ts` | 17 | 17 | 0 | Balanced 1:1 |
| `src/game/PeriodicTableBG.ts` | 17 | 17 | 0 | Balanced 1:1 |
| `src/game/Player.ts` | 2 | 2 | 0 | Balanced 1:1 |
| `src/game/StickmanRenderer.ts` | 15 | 15 | 0 | Balanced 1:1 |
| `src/game/UltimateCutscene.ts` | 29 | 29 | 0 | Balanced 1:1 |
| `src/game/renderer/gear.ts` | 40 | 40 | 0 | Balanced 1:1 |
| `src/game/renderer/trails.ts` | 18 | 23 | 0 | Early-return `ctx.restore(); continue;` per trail style (`:268`, `:683`, `:792`, `:835`, `:895`, `:909`, `:972`) |
| `src/game/renderer/weapons.ts` | 3 | 4 | 0 | Early-return `if (whiteFlash) { ... ctx.restore(); return; }` at `:23-24` |

### 1.4 Current `mockCanvas.ts`, `testHarness.ts`, and Pillow Rasterizer Architecture
- **`tests/e2e/helpers/mockCanvas.ts`**:
  - `RecordingContext2D` tracks affine transform stack `[a,b,c,d,e,f]` across `save()`/`restore()`, tessellates `moveTo`, `lineTo`, `quadraticCurveTo` (12 steps), `bezierCurveTo` (16 steps), `arc`, `ellipse`, `rect`, `roundRect` (delegates to `rect`, ignoring radii) into screen-space `DrawCommand[]`, and records `TraceMetrics`: `saveCount`, `restoreCount`, `maxSaveDepth`, `unbalancedSaveRestore`, `shadowBlurUsed`, `maxShadowBlur`, `nanDetected`, `nanEvents`, `uniqueColors`, `opCounts`, `compositeOps`.
  - **`mockCanvas.ts` unsupported / stubbed Canvas2D APIs**:
    - `clip()` is a **no-op stub** (`:424-426`).
    - `arcTo()`, `transform()`, `drawImage()`, `createPattern()`, `filter`, `fill(fillRule)` (`'evenodd'`) are **not implemented** (calling them in new R3 renderers will throw in headless tests!).
    - `lineJoin` and `setLineDash` are stored in `CtxState` (`:97,103,262,388`) but **not serialized** into `DrawCommand` (`:18-32`), and `stroke()` does not check `shadowBlur` or dash patterns.
  - `installDomShims()` provides `window`, `document`, `HTMLElement`, `localStorage`, and `requestAnimationFrame` queue without touching read-only `globalThis.navigator`.
- **`tests/e2e/render-skins.py` & `tests/e2e/render-poses.py`**:
  - Both use Pillow 13.0.0 with `parse_css_color()` (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `rgb`, `rgba`), `ImageChops.add` premultiplied `'lighter'` compositing, and `compute_mae()` / `compute_non_bg_ratio()`.
  - **Pillow gradient & stroke approximations**:
    - Linear gradients (`draw_gradient_fill`, `:175-183`) are flattened to a single solid color sampled at `t = 0.55`. Radial gradients draw 10 concentric ellipses.
    - `render-skins.py:309` rejects anything other than `len(skins) == 12`.
    - `render-poses.py:318` rejects anything other than `len(characters) == 5 and len(poses) == 7`.
- **Entity & Roster Coverage in `src/` vs `tests/e2e/`**:
  - **Playable Characters (`src/game/characters.ts:91, 419-886`)**: **6 fighters × 18 total skins** (`kuro` 4, `raijin` 3, `kagura` 3, `zero` 3, `aether` 2, `valkyrie` 3), all 18 present in `src/game/skinVfx.ts:46-551`. `testHarness.ts` only covers `ALL_5_CHARACTERS` (missing `valkyrie`), `ALL_12_SKINS`, and `ALL_14_SKINS` (missing `kuro:eclipse_ronin` and all 3 `valkyrie` skins). Note also `trails.ts:18-32` (`inferCharacterForSkin`) has not been updated for `eclipse_ronin`, `prismatic_archon`, or `valkyrie` skins.
  - **Enemies (`src/game/types.ts:155-164`, `src/game/Enemy.ts:982-1033`)**: **8 types** (`meta_melee`, `deepseek_gunner`, `swarm_blade`, `shield_guard`, `cyber_ninja`, `heavy_brute`, `frost_mage`, `berserker_reaper`) × normal & `isElite=true`. **Zero** visual/headless render tests exist for `Enemy.render()`.
  - **Bosses (`src/game/rules.ts:19-155`, `src/game/Boss.ts:1607-1735`)**: **12 bosses** (`boss_haiku`, `boss_astra`, `boss_glacius`, `boss_opus`, `boss_vulcan`, `boss_sol`, `boss_nyx`, `boss_fable`, `boss_raiden`, `boss_akaza`, `boss_kronos`, `boss_omega`) × Phase 1 (`phase = 1`) & Phase 2 (`phase = 2`). **Zero** visual/headless render tests exist for `Boss.render()`.

---

## 2. Logic Chain

1. **Mirror & Build Readiness**: Because `diff -rq` between `/storage/emulated/0/Antigravity/Stickman/src` and `/data/user/0/com.agy/files/stickman-build/src` returned 0, and both `rules.test.ts` (17/17) and `vite build` (exit 0) succeed in the mirror, the mirror workflow is healthy — except `tsc --noEmit` is broken on-device because `typescript@7.0.2` (`tsgo`) lacks `@typescript/typescript-android-arm64`. Therefore, syntax/bundling checks must rely on `vite build` + `tsx`/`esbuild` (plus optional pure-JS TypeScript if installed into mirror `node_modules`, or static AST/import checks).
2. **Baseline E2E Failures Are Pre-Existing Drift, Not R3 Regressions**: Since `T1-F1-01/02/06` expect `14` while `skinVfx.ts` already exports `18`, `T1-F6-02` expects `afterimageColor` at index 0 while `Player.ts:744` puts `#a855f7` at index 0, `T2-F9-04` checks `✓` on a hidden tab, and `POSE-P4-03` measures a `33.84px` `elbowL` delta on `kuro run->dash`, Workers modifying `src/` for R3 graphics will hit these 6 pre-existing failures unless either E2E Track updates the stale VFX tests or R3 specifically separates regression vs pre-existing failures.
3. **MockCanvas Safety Constraint for R3 Ink-Wash Drawing**: Because `RecordingContext2D` lacks `arcTo`, `transform`, `drawImage`, and `fill('evenodd')`, and stubs `clip()` as a no-op, any R3 Ink-Wash rendering code using tapered polygons, `quadraticCurveTo`/`bezierCurveTo` brush strokes, `arc`, `ellipse`, multi-pass cel/ink outlines, and `globalCompositeOperation = 'lighter'` will execute and rasterize faithfully in both browser Canvas2D and `mockCanvas.ts` + Pillow, whereas using `arcTo`, `transform`, or `clip()`-dependent masking would either crash headless tests or render incorrectly in Pillow PNGs.
4. **R3 Verification Gaps**: Existing visual/headless tests check only 12 skins (non-awakened) and 5×7 basic poses. They do not exercise `valkyrie`, the 4 additional skins (`18` total), Awakened forms for any of the 6 characters, any of the 8 Enemy types (normal or elite), or any of the 12 Bosses (P1 or P2), nor do they render against actual dark ink-wash/stage floor backdrops (`PeriodicTableBG`) to validate R2/R3 contrast & readability.

---

## 3. Caveats

- Did not inspect the full body of `src/game/PeriodicTableBG.ts` or `src/game/UltimateCutscene.ts` line-by-line (only audited `shadowBlur` = 0 and `save`/`restore` counts = 17/17 and 29/29).
- Did not inspect `src/game/poses/kuroPoses.ts` to determine the exact skeletal cause of the `33.84px` `elbowL` jump in `POSE-P4-03`.
- Runtime 60fps performance on physical Android WebView cannot be measured directly in Node.js; headless `MockCanvasElement` measures draw-call counts (`commands.length`), `shadowBlurUsed === false`, and `save/restore` balance as proxy performance/compliance gates.

---

## 4. Conclusion

### 4.1 New Headless & Visual Verification Scripts/Tests Needed for R3
1. **Static Audit Script (`tests/e2e/check-r3-static.mjs` or test in `r3_inkwash.e2e.test.ts`)**:
   - Scan all `src/**/*.ts*` for `shadowBlur` (must equal `0` occurrences across `src/`).
   - Scan `src/game/renderer/` and `src/game/{StickmanRenderer,Boss,Enemy,Entities,ParticleSystem}.ts` to verify no unsupported `MockCanvas` calls (`arcTo`, `drawImage`, etc.) sneak in.
2. **Headless Canvas2D Stress & Invariance Suite (`tests/e2e/r3_inkwash.e2e.test.ts`)**:
   - **6 Playable Characters × Normal & Awakened × All 18 Skins**: Call `renderStickman` across key poses (`idle`, `run`, `attack_2`, `parry`, `awaken_pose`) with both `awakenedForm: null` and `awakenedForm: charId`, `awakened: true`, plus live `Player.render()` via `createTestPlayer(charId, skinId)`. Assert `assertDrawTraceValid(ctx.metrics)` (`saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, `nanDetected === false`) and `commands.length > 0`.
   - **8 Enemy Types × Normal & Elite**: Instantiate all 8 `EnemyType`s (`meta_melee`, `deepseek_gunner`, `swarm_blade`, `shield_guard`, `cyber_ninja`, `heavy_brute`, `frost_mage`, `berserker_reaper`) with `isElite = false` and `isElite = true`, across `idle`, `windup` (telegraph rings/laser sights), `active`, `hurt`, and `silhouetteMode`/`whiteFlash`. Assert `save/restore === 0`, `shadowBlurUsed === false`, zero NaN/exceptions, and distinct draw traces between normal vs elite (`assertDistinctSignatures`).
   - **12 Bosses × Phase 1 & Phase 2**: Instantiate all 12 `BOSS_ORDER` bosses with `phase = 1` and `phase = 2` across `idle`, `windup`, `active`, `staggered`, and `silhouetteMode`/`whiteFlash`. Assert `save/restore === 0`, `shadowBlurUsed === false`, zero NaN/exceptions, and distinct draw traces between P1 vs P2 and across all 12 bosses.
   - **Update `testHarness.ts`**: Add `ALL_6_CHARACTERS` (including `'valkyrie'`) and `ALL_18_SKINS` (adding `kuro:eclipse_ronin` and the 3 `valkyrie` skins).
3. **Pillow Visual Contact-Sheet Rasterizer (`tests/e2e/render-r3-sheet.py`, outputting to `.agents/teamwork/e2e_renders/r3/` with `.nomedia`)**:
   - Extend/generalize Pillow rasterizer (keeping `render-skins.py` & `render-poses.py` intact or generalizing `--count` if updating `render-skins.py`) to render 4 inspectable contact sheets:
     1. **`r3_6chars_normal_vs_awakened.png`** (`6 cols × 2 rows`, or `18 skins` sheet `6 × 3`): Normal vs Awakened state for all 6 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`, `valkyrie`).
     2. **`r3_18_skins_sheet.png`** (`6 × 3` grid): All 18 skins in active combat silhouette + weapons + ink-wash armor/scarves.
     3. **`r3_8_enemies_normal_vs_elite.png`** (`8 cols × 2 rows`): All 8 enemies Normal vs Elite side-by-side.
     4. **`r3_12_bosses_p1_vs_p2.png`** (`6 cols × 4 rows`, pairing P1 & P2 per boss): All 12 bosses Phase 1 vs Phase 2 Enrage.
   - **Automated Visual Contrast & Quality Metrics (`r3_metrics.json`)**:
     - `blank_cells === []` (`non_bg_ratio > 0.025` per character/boss/enemy cell).
     - `nan_cells === []` and `shadow_blur_cells === []` and `unbalanced_save_restore === []`.
     - **Ink-Wash Contrast Rubric check**: Assert presence of dark ink tones (low-luma pixels `< 45` on bright rim/backdrop) AND high-contrast highlight/crimson/skin-accent pixels (top-95th-percentile vs 10th-percentile luminance spread `>= 110`, plus minimum bright-pixel ratio against dark arena floor `#090b10`..`#0e131e` so dark ink silhouettes don't disappear into dark backgrounds — i.e., bright rim-light/white/accent pixels must outline dark ink fills!).
     - **Pairwise Distinction**: `MAE > 1.2` between Normal vs Awakened per fighter, Normal vs Elite per enemy, P1 vs P2 per boss, and across all 12 bosses.
   - **Manual Visual Inspection**: Inspect all 4 contact-sheet PNGs via `view_file` against the Visual Quality Rubric (ink-wash brushstroke taper, cel-shading contrast, armor/cloak/headgear/wing/weapon detail, rim-light legibility on dark arena floor).
4. **MockCanvas Upgrade (optional helper hardening in `tests/e2e/helpers/mockCanvas.ts`)**:
   - Add `arcTo` and `transform` support (and `fillRule` arg tolerance on `fill(rule?)`) so standard Canvas2D brush/ink polygons never crash headless tests if used; log a warning/metric if `clip()` is invoked since Pillow does not clip.

### 4.2 Recommended Verification Workflow & Commands

#### For Workers (Per-Milestone Gate)
1. **Static `shadowBlur` & `save/restore` check** on `/storage/emulated/0/Antigravity/Stickman/src`:
   ```bash
   python3 -c "import pathlib; bad=[str(p) for p in pathlib.Path('src').rglob('*.ts*') if 'shadowBlur' in p.read_text()]; print('shadowBlur files:', bad); assert not bad"
   ```
2. **Sync `src/` to `/data` mirror & run unit tests + Vite production build**:
   ```bash
   SRC="/storage/emulated/0/Antigravity/Stickman"
   BUILD="/data/user/0/com.agy/files/stickman-build"
   rm -rf "$BUILD/src" "$BUILD/dist"
   cp -r "$SRC/src" "$BUILD/src"
   cp "$SRC/index.html" "$SRC/package.json" "$SRC/tsconfig.json" "$SRC/vite.config.ts" "$BUILD/"
   cd "$BUILD" && ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   cd "$BUILD" && node node_modules/vite/bin/vite.js build
   ```
3. **Run targeted headless render trace test** (once created in `tests/e2e/r3_inkwash.e2e.test.ts`):
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node node_modules/tsx/dist/cli.mjs --test tests/e2e/r3_inkwash.e2e.test.ts
   ```

#### For Reviewers & Challengers
1. **Verify mirror parity** (`diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src`) — ensure zero drift before accepting build/test evidence.
2. **Verify zero `shadowBlur` & balanced `save/restore`** both statically (`grep`) and dynamically (`RecordingContext2D.metrics`: `shadowBlurUsed === false`, `saveCount === restoreCount`, `nanDetected === false`).
3. **Inspect rendered contact-sheet PNGs directly with `view_file`** under `.agents/teamwork/e2e_renders/r3/` — check for: (a) clean black-white-crimson/skin-color ink-wash contrast on dark floor, (b) readable silhouette & rim-light separation, (c) zero detached limbs, inverted knees, or orphaned arcs, (d) clear visual escalation from Normal→Awakened, Normal→Elite, and Boss P1→P2.
4. **Watch out for the `tsc` gap**: `typescript@7.0.2` in `stickman-build` errors on missing `@typescript/typescript-android-arm64`; if strict typechecking beyond Vite/esbuild is desired, either install pure-JS `typescript@5.8.3` into `/data/user/0/com.agy/files/stickman-build` or note the platform limitation explicitly.

#### For E2E Testing Track
1. Add `tests/e2e/r3_inkwash.e2e.test.ts` + `tests/e2e/render-r3-sheet.py` (with `.nomedia` isolation in `.agents/teamwork/e2e_renders/r3/`).
2. Update `tests/e2e/helpers/testHarness.ts` (`ALL_6_CHARACTERS`, `ALL_18_SKINS`, `ALL_18_MOTIFS`) and fix/align the 6 pre-existing drifted assertions (`tier1_features.e2e.test.ts` 14→18 and `Player.ts:744` palette expectation, `tier2_boundaries.e2e.test.ts` `TitleScreen` stage-tab check, `poses.e2e.test.ts` `kuro` `run->dash` blend) if in scope.
3. Run full sequential gate:
   ```bash
   node tests/e2e/run-e2e.mjs --with-unit --tier=all --render-visuals --render-poses
   ```

---

## 5. Verification Method

All observations in this report can be independently re-verified via:
1. Mirror sync check: `diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src` (expected exit `0`).
2. Unit tests: `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts` in `/data/user/0/com.agy/files/stickman-build` (expected `17/17` pass).
3. Vite build: `node node_modules/vite/bin/vite.js build` in `/data/user/0/com.agy/files/stickman-build` (expected exit `0`).
4. TypeScript check: `node node_modules/typescript/bin/tsc --noEmit` in `/data/user/0/com.agy/files/stickman-build` (expected exit `1` due to missing `@typescript/typescript-android-arm64`).
5. Static audit: `grep_search` for `shadowBlur` in `/storage/emulated/0/Antigravity/Stickman/src` (expected `0` matches).
6. E2E baseline: `node tests/e2e/run-e2e.mjs --tier=all` in `/storage/emulated/0/Antigravity/Stickman` (expected `115/121` pass, `6` pre-existing failures listed in Section 1.2).
7. **Invalidation conditions**: Any subsequent edits to `src/` without re-syncing `/data/user/0/com.agy/files/stickman-build/src`, or installation of `typescript@5.x` in `stickman-build`, will change the baseline metrics above.
