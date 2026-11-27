# TEST_READY — E2E Test Suite & Visual Verification Ready

## Status
- **E2E Suite**: READY (`136` E2E tests: `110` VFX tests across Tiers 1–4 + `11` R2 5×7 Pose tests + `15` R3 Ink-Wash & Visual tests, plus `17` unit tests = `153` total tests).
- **R3 Track (`R3-F7`) Syntax & Harness Verification**:
  - `node --check tests/e2e/run-e2e.mjs` — PASS (exit 0)
  - `python3 -m py_compile tests/e2e/render-r3-sheet.py` — PASS (exit 0)
  - `python3 -m py_compile tests/e2e/render-poses.py` — PASS (exit 0)
  - `python3 -m py_compile tests/e2e/render-skins.py` — PASS (exit 0)
  - `node tests/e2e/run-e2e.mjs --r3 --render-r3` — Executed end-to-end with zero harness, mock-canvas, or Pillow crashes; generated all 4 PNG contact sheets + `r3_metrics.json` in `.agents/teamwork/e2e_renders/r3/` (`.nomedia`-isolated).

## Files Delivered / Updated (R3-F7)
- `TEST_INFRA.md` — Platform constraints, R3 `--r3 --render-r3` commands, 136-test coverage matrix, and R3 contrast/MAE thresholds.
- `TEST_READY.md` — This readiness & verification status summary.
- `tests/e2e/run-e2e.mjs` — Added `--r3` and `--render-r3` flags, `.agents/teamwork/e2e_renders/r3/.nomedia` provisioning, and `R3_SUITE` integration into `--tier=all`.
- `tests/e2e/helpers/mockCanvas.ts` — Added `arcTo()`, `transform()`, `fill(fillRule?)`, `drawImage()`, `clipCalls`, finite checks on `setLineDash`/`roundRect`/`clearRect`, and `lineJoin`/`lineDash` serialization.
- `tests/e2e/helpers/testHarness.ts` — Added `ALL_6_CHARACTERS`, `ALL_18_SKINS`, `ALL_18_MOTIFS`, `ALL_8_ENEMY_TYPES`, `ALL_12_BOSS_IDS`, `ALL_12_STAGE_THEMES`, `createTestEnemy`, `createTestBoss`, `createTestBackdrop`, and 4 R3 contact-sheet trace builders (`buildR3SixCharsNormalVsAwakenedPayload`, `buildR3EighteenSkinsPayload`, `buildR3EightEnemiesPayload`, `buildR3TwelveBossesPayload`).
- `tests/e2e/r3_inkwash.e2e.test.ts` — 15 tests covering static `shadowBlur === 0` & per-frame pattern audits, `inkStyle.ts` & `enemyVisuals.ts` contracts, 6 chars (Normal/Awakened) × 18 skins × live `Player.render()`, 8 enemies (Normal/Elite), 12 bosses (P1/P2), 12 stage backdrops, and Pillow 4-sheet verification.
- `tests/e2e/render-r3-sheet.py` — Pillow `13.0.0` 4-sheet rasterizer & contrast/MAE verifier (`r3_6chars_normal_vs_awakened.png`, `r3_18_skins_sheet.png`, `r3_8_enemies_normal_vs_elite.png`, `r3_12_bosses_p1_vs_p2.png`, `r3_metrics.json`).
- `tests/e2e/tier1_features.e2e.test.ts` — Aligned stale `T1-F1-01/02/04/05/06` assertions from 14 → 18 skins/motifs.
- `tests/e2e/tier2_boundaries.e2e.test.ts` — Aligned stale `T2-F9-04` `TitleScreen` SSR assertion to check `Tiến độ` `8/12` and `Toàn MH` toggle.

## How to Run
```bash
# R3 Ink-Wash suite + 4 Pillow contact sheets
node tests/e2e/run-e2e.mjs --r3 --render-r3

# Full suite (17 unit + 110 VFX E2E + 11 Pose E2E + 15 R3 Ink-Wash E2E)
node tests/e2e/run-e2e.mjs --with-unit --tier=all

# Individual suites
node tests/e2e/run-e2e.mjs --tier=1
node tests/e2e/run-e2e.mjs --tier=2
node tests/e2e/run-e2e.mjs --tier=3
node tests/e2e/run-e2e.mjs --tier=4 --render-visuals --out-dir=.agents/teamwork/e2e_renders
node tests/e2e/run-e2e.mjs --pose --render-poses
```

## Latest Verification Results (Current Codebase: M1 landed, M2 & M3 pending)
- **R3 Suite (`node tests/e2e/run-e2e.mjs --r3 --render-r3`)**: `8/15` PASS, `7` expected pre-M2/M3 failures:
  - **PASS (8/15)**: `R3-STATIC-01` (0 `shadowBlur`), `R3-CONTRACT-01` (`inkStyle.ts` verified!), `R3-HERO-01` (6 chars Normal vs Awakened), `R3-HERO-02` (18 skins), `R3-HERO-03` (18 skins live `Player.render()`), `R3-HERO-04` (`NaN`/`Infinity` resilience), `R3-HERO-05` (18 slash motifs), `R3-BOSS-01` (12 bosses P1/P2 traces).
  - **FAIL awaiting M2/M3 (7/15)**:
    1. `R3-STATIC-02`: `src/game/renderer/gear.ts` per-frame `create*Gradient` (M2 scope).
    2. `R3-CONTRACT-02`: `src/game/enemyVisuals.ts` not yet created (M3 scope).
    3. `R3-ENEMY-01`: `Enemy.ts:1099-1102` leaks `ctx.font` / `ctx.textAlign` on Elite label (M3 scope).
    4. `R3-ENEMY-02`: `Enemy.ts:1097` divides `hp / maxHp` without guarding `maxHp <= 0` -> `-Infinity` (M3 scope).
    5. `R3-BOSS-02`: `Boss.ts:1613` unclamped `p = 1 - attackTimer / 0.64` -> `rgba(..., 1.171875)` (M3 scope).
    6. `R3-STAGE-01`: `PeriodicTableBG.ts:171` `${spotCol}33` concatenation breaks `hsl(...)` colors (M3 scope).
    7. `R3-VISUAL-01`: All 12 bosses have `phase1 vs phase2` `MAE <= 1.2` (`0.45..0.77`) because Phase 2 currently only adds a thin foot puddle (M2/M3 scope).
- **Tier 1 (`node tests/e2e/run-e2e.mjs --tier=1`)**: `45/46` PASS (`T1-F1-01..06` now pass; pre-existing `T1-F6-02` `Player.ts:744` `ghostPalette[0]` `#a855f7` vs `#c084fc` remains in `src/`).
- **Tier 2 (`node tests/e2e/run-e2e.mjs --tier=2`)**: `46/46` PASS (`T2-F9-04` fixed).

## Visual Artifacts (MediaStore-Isolated via `.nomedia`)
- `.agents/teamwork/e2e_renders/r3/.nomedia`
- `.agents/teamwork/e2e_renders/r3/r3_6chars_normal_vs_awakened.png` (`6×2`, `2040×600`)
- `.agents/teamwork/e2e_renders/r3/r3_18_skins_sheet.png` (`6×3`, `2040×840`)
- `.agents/teamwork/e2e_renders/r3/r3_8_enemies_normal_vs_elite.png` (`8×2`, `2560×560`)
- `.agents/teamwork/e2e_renders/r3/r3_12_bosses_p1_vs_p2.png` (`6×4`, `2040×1240`)
- `.agents/teamwork/e2e_renders/r3/r3_metrics.json` (`blank_cells: []`, `nan_cells: []`, `shadow_blur_cells: []`, `unbalanced_save_restore: []`, `low_contrast_cells: []`; awaiting M2/M3 Boss P1/P2 visual escalation for `MAE > 1.2`).
