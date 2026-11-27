# Test Infrastructure — Stickman Skin Attack VFX, Pose Overhaul & R3 Ink-Wash

## 1. Environment & Platform Constraints (Android ARM64)
- **Workspace Location**: `/storage/emulated/0/Antigravity/Stickman`
  - Android shared storage (`/storage/emulated/0`) is mounted `noexec` and sits outside bionic linker `permitted_paths`, and `node_modules/.bin` symlinks are not usable directly.
- **TypeScript Test Runner (`tsx` + `$TMPDIR/esbuild_bin`)**:
  - `node_modules/tsx/node_modules/@esbuild/android-arm64/bin/esbuild` is copied to `$TMPDIR/esbuild_bin` (or `/data/user/0/com.agy/cache/esbuild_bin`) with `chmod 0o755` and invoked via `ESBUILD_BINARY_PATH`.
  - `tests/e2e/run-e2e.mjs` automates this bootstrap transparently before spawning `node node_modules/tsx/dist/cli.mjs --test`.
- **Vite Production Build & Unit Tests (`/data/user/0/com.agy/files/stickman-build`)**:
  - The workspace `node_modules/typescript@7.0.2` (`tsgo`) lacks `@typescript/typescript-android-arm64`, and Vite native binaries (`rolldown`, `lightningcss`, `esbuild`) cannot execute from `noexec` `/storage/emulated/0`.
  - Production build (`vite build`) and `src/game/rules.test.ts` execute in the mirror directory `/data/user/0/com.agy/files/stickman-build`.
- **Headless Visual Rendering (`MockCanvas` + `Pillow 13.0.0`)**:
  - No headless Chromium or Playwright binary exists on Android.
  - `tests/e2e/helpers/mockCanvas.ts` records full screen-space tessellated `CanvasRenderingContext2D` draw traces (`DrawCommand[]`, including `arcTo`, `transform`, `fill(fillRule?)`, `lineJoin`, `lineDash`, `drawImage`, `clipCalls`), and Python **Pillow 13.0.0** rasterizers (`render-skins.py`, `render-poses.py`, `render-r3-sheet.py`) render PNG contact sheets with `#RGB`/`#RRGGBB`/`#RRGGBBAA`/`rgb`/`rgba`/`hsl`/`hsla` color parsing and `ImageChops.add` additive `'lighter'` blending.
- **Android MediaStore Isolation (`.nomedia`)**:
  - Every generated PNG and JSON trace MUST stay inside `.agents/teamwork/e2e_renders/` (including `poses/` and `r3/`), guarded with `.nomedia` so Android Gallery never indexes test artifacts.

---

## 2. Quick-Start Commands

```bash
# Run R3 Ink-Wash headless suite + 4 Pillow contact sheets (recommended R3 gate)
node tests/e2e/run-e2e.mjs --r3 --render-r3

# Run R3 suite without regenerating PNGs
node tests/e2e/run-e2e.mjs --r3

# Run all E2E tiers + Pose suite + R3 suite sequentially (136 E2E tests total)
node tests/e2e/run-e2e.mjs --tier=all

# Run existing unit tests (17/17) + all E2E tiers + Pose + R3
node tests/e2e/run-e2e.mjs --with-unit --tier=all

# Run an individual tier or the 5x7 Pose suite
node tests/e2e/run-e2e.mjs --tier=1
node tests/e2e/run-e2e.mjs --tier=2
node tests/e2e/run-e2e.mjs --tier=3
node tests/e2e/run-e2e.mjs --tier=4
node tests/e2e/run-e2e.mjs --pose --render-poses

# Force 12-skin PNG visual rasterization + pixel distinctiveness audit
node tests/e2e/run-e2e.mjs --tier=4 --render-visuals --out-dir=.agents/teamwork/e2e_renders

# Verbose TAP/spec output
node tests/e2e/run-e2e.mjs --with-unit --tier=all --verbose

# Sync src/ to mirror & run unit tests + Vite production build (M1–M4 gate)
SRC="/storage/emulated/0/Antigravity/Stickman"
BUILD="/data/user/0/com.agy/files/stickman-build"
rm -rf "$BUILD/src" "$BUILD/dist"
cp -r "$SRC/src" "$BUILD/src"
[ -d "$SRC/public" ] && cp -r "$SRC/public" "$BUILD/public"
cp "$SRC/index.html" "$SRC/package.json" "$SRC/tsconfig.json" "$SRC/vite.config.ts" "$BUILD/"
(cd "$BUILD" && ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import "$BUILD/node_modules/tsx/dist/loader.mjs" src/game/rules.test.ts && node node_modules/vite/bin/vite.js build)
```

---

## 3. Test Tiers & Coverage Mapping (136 E2E Tests + 17 Unit)

| Tier | File | Count | Coverage Mapping |
|------|------|-------|------------------|
| Unit (preserved) | `src/game/rules.test.ts` | 17 | Core combat math, scarf Verlet, character roster, camera scale, synergy, stages |
| Tier 1 (Features) | `tests/e2e/tier1_features.e2e.test.ts` | 46 | `F1` (6, aligned to 18 skins/motifs), `F2`–`F9` (5 each) |
| Tier 2 (Boundaries) | `tests/e2e/tier2_boundaries.e2e.test.ts` | 46 | Boundary/edge cases across `F1`–`F9` (`T2-F9-04` aligned to tabbed TitleScreen SSR) |
| Tier 3 (Pairwise) | `tests/e2e/tier3_pairwise.e2e.test.ts` | 12 | Cross-feature pairwise combos |
| Tier 4 (Workloads) | `tests/e2e/tier4_workloads.e2e.test.ts` | 6 | 60-attack spam cleanup, 12-skin combat cycling, 12-skin Pillow PNG + MAE, R3 hitbox invariance, 36-switch title stress, multi-mode cleanup |
| Pose (R2 5×7) | `tests/e2e/poses.e2e.test.ts` | 11 | `P1`–`P5` programmatic joint/IK/COG/transition/distinctness assertions across 5 characters × 7 poses + `POSE-VISUAL-01` Pillow 5×7 contact sheet |
| R3 Ink-Wash & Visuals | `tests/e2e/r3_inkwash.e2e.test.ts` | 15 | Static `shadowBlur===0` & per-frame gradient/alpha audits, `inkStyle.ts` & `enemyVisuals.ts` contracts, 6 chars (Normal/Awakened) × 18 skins × live `Player.render()`, 8 mobs (Normal/Elite), 12 bosses (P1/P2), 12 stages, and 4-sheet Pillow visual audit |
| **Total E2E** | `tests/e2e/*.e2e.test.ts` | **136** | **110 VFX + 11 Pose + 15 R3 Ink-Wash E2E** |

---

## 4. Mock Canvas2D + Pillow Visual Render Architecture & Inspection Guide

1. **DOM & Window Shims (`tests/e2e/helpers/mockCanvas.ts`)**:
   - Provides `window` (`localStorage`, `requestAnimationFrame`/`cancelAnimationFrame` queue, `setInterval`/`clearInterval`, `addEventListener`, `visualViewport`), `document`, and `HTMLElement` in Node.js without touching read-only `globalThis.navigator`.
2. **Screen-Space Tessellating `RecordingContext2D`**:
   - Maintains full affine transformation matrix `[a, b, c, d, e, f]` stack across `save()` / `restore()`.
   - Tessellates `moveTo`, `lineTo`, `quadraticCurveTo`, `bezierCurveTo`, `arc`, `arcTo`, `ellipse`, `rect`, and `roundRect` into flat screen-space `DrawCommand[]` records; supports `transform()`, `fill(fillRule?)`, `lineJoin`, `lineDash`, `drawImage()`, and `clipCalls`.
   - Records `save/restore` balance, `shadowBlurUsed`, `nanDetected`, `uniqueColors`, `opCounts`, and `compositeOps`.
3. **Pillow 13.0.0 Skin Rasterizer (`tests/e2e/render-skins.py`)**:
   - Consumes `DrawCommand[]` JSON traces for the 12 `(CharacterId, SkinId)` pairs at `720×480`.
   - Outputs `skin_01_*.png`..`skin_12_*.png`, `all_12_skins_grid.png` (`4×3`), and `render_metrics.json`.
4. **Pillow 13.0.0 5×7 Pose Sheet Rasterizer (`tests/e2e/render-poses.py`)**:
   - Consumes `DrawCommand[]` JSON traces for all `5 × 7 = 35` `(CharacterId, BasicPoseName)` cells at `320×260` (ground baseline at `floorY = 205`).
   - Outputs under `.agents/teamwork/e2e_renders/poses/` (`.nomedia`-isolated).
5. **Pillow 13.0.0 R3 Ink-Wash 4-Sheet Rasterizer (`tests/e2e/render-r3-sheet.py`)**:
   - Consumes `6chars_normal_vs_awakened.json`, `18_skins.json`, `8_enemies_normal_vs_elite.json`, and `12_bosses_p1_vs_p2.json` exported via `R3_RENDER_DIR`.
   - Outputs under `.agents/teamwork/e2e_renders/r3/` (`.nomedia`-isolated):
     - `r3_6chars_normal_vs_awakened.png` (6 cols × 2 rows over `#0b0e16` arena floor)
     - `r3_18_skins_sheet.png` (6 cols × 3 rows)
     - `r3_8_enemies_normal_vs_elite.png` (8 cols × 2 rows)
     - `r3_12_bosses_p1_vs_p2.png` (6 cols × 4 rows pairing P1 & P2 per boss)
     - `r3_metrics.json` (`blank_cells`, `nan_cells`, `shadow_blur_cells`, `unbalanced_save_restore`, `low_contrast_cells`, `low_mae_pairs`, and per-cell luminance spread + pairwise MAE).

---

## 5. Acceptance Thresholds & Zero-Exception Policy
- **Registry Uniqueness (`R1`)**: All 18 `(CharacterId, SkinId)` `SkinVfxProfile` entries and `SlashVfxMotif`s form a 1-to-1 bijection with zero collisions.
- **R3 Ink-Wash Static & Canvas Safety**:
  - `0` occurrences of `shadowBlur` in `src/**/*.ts*`.
  - `0` per-frame `create*Gradient` calls in `StickmanRenderer.ts` / `src/game/renderer/*.ts`, `0` dead `destination-out` in `gear.ts`, and `0` fragile `${color}XX` concatenations in `PeriodicTableBG.ts` / `Entities.ts` / `Game.ts`.
  - `saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, `nanDetected === false`, and no `ctx.font`/`ctx.textAlign` state leaks across all 6 characters, 18 skins, 8 enemies (Normal/Elite), 12 bosses (P1/P2), and 12 stage backdrops.
- **R3 Visual Contrast & Distinction (`r3_metrics.json`)**:
  - `blank_cells === []` (`non_bg_ratio > 0.020`), `nan_cells === []`, `shadow_blur_cells === []`, `unbalanced_save_restore === []`.
  - Entity foreground luminance spread `p95 - p10 >= 110.0`, `dark_ink_ratio >= 0.03`, and `bright_contrast_ratio >= 0.03`.
  - Pairwise `MAE > 1.2` for Normal vs Awakened (all 6 chars), Normal vs Elite (all 8 enemies), Phase 1 vs Phase 2 (all 12 bosses), across all 12 bosses, and across all 18 skins.
- **Pose Kinematics & Joint Sanity (`R2-F8`)**:
  - **P1–P5**: `0` `NaN`/`Infinity` across all 14 joints, `run` lean `>= 0.48` rad, `dash` lean `>= 0.72` rad, `land`/`dash`/`parry` COG drops, clamped IK bounds, and `< 22px` substep deltas.
- **Lifecycle & Gameplay Invariance (`R2` / `R3`)**: `ParticleSystem` pool `720`, `slashTrails`/`afterimages` `<= 24` returning to `0`, and identical combat hitboxes/maxHp across upgrades.
