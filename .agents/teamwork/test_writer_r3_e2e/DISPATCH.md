# Test Writer Dispatch — R3 E2E & Visual Verification Suite

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/TEST_INFRA.md`
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_3/handoff.md`
5. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_1/handoff.md`
6. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_2/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/test_writer_r3_e2e`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **EXCLUSIVE Write Ownership**:
  - `TEST_INFRA.md`
  - `TEST_READY.md`
  - `tests/e2e/*` (`helpers/mockCanvas.ts`, `helpers/testHarness.ts`, `r3_inkwash.e2e.test.ts`, `render-r3-sheet.py`, `run-e2e.mjs`)
  - `.agents/teamwork/e2e_renders/r3/` (MUST include `.nomedia`)
- **FORBIDDEN**: Do NOT modify ANY file under `src/`.

## Detailed Requirements
1. **`tests/e2e/helpers/mockCanvas.ts`**:
   - Add `arcTo`, `transform`, and `fill(fillRule?)` support so standard Canvas2D paths never throw in headless tests; keep `saveCount`, `restoreCount`, `getSaveDepth()`, `shadowBlurUsed`, `nanDetected`, `nanEvents`, `uniqueColors`, `opCounts`, `commands`.
   - Serialize `lineJoin` and `lineDash` cleanly if helpful, and ensure `NaN`/`Infinity` detection covers all drawing/transform methods (`arcTo`, `transform`, `quadraticCurveTo`, `bezierCurveTo`, `arc`, `ellipse`, `moveTo`, `lineTo`, `rect`, `roundRect`, `translate`, `rotate`, `scale`).
2. **`tests/e2e/helpers/testHarness.ts`**:
   - Export `ALL_6_CHARACTERS` (`['kuro', 'raijin', 'kagura', 'zero', 'aether', 'valkyrie']`) and `ALL_18_SKINS` (all 18 `(characterId, skinId)` pairs matching `src/game/characters.ts`).
   - Add helpers to instantiate all 8 `EnemyType`s (Normal & `isElite=true`), all 12 `BOSS_ORDER` Bosses (`phase=1` & `phase=2`), and `PeriodicTableBG` across all 12 `StageThemeId`s.
3. **`tests/e2e/r3_inkwash.e2e.test.ts`**:
   - **Static Check**: Scan all `src/**/*.ts*` to assert **0 occurrences** of `shadowBlur` and zero dangerous per-frame patterns.
   - **6 Playable Characters × Normal & Awakened × 18 Skins**: Render across key poses (`idle`, `run`, `attack_2`, `parry`, `awaken_pose`), both `awakened: false` and `awakened: true` (`awakenedForm: charId`), and live `Player.render()` calls. Assert `saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, `nanDetected === false`, `commands.length > 0`, and distinct draw traces across Normal vs Awakened and across skins.
   - **8 Enemy Types × Normal & Elite**: Render all 8 normal enemy types (`meta_melee`, `deepseek_gunner`, `swarm_blade`, `shield_guard`, `cyber_ninja`, `heavy_brute`, `frost_mage`, `berserker_reaper`) as Normal (`isElite=false`) and Elite (`isElite=true`). Assert `save/restore === 0`, `shadowBlurUsed === false`, `nanDetected === false`, and distinct Normal vs Elite traces.
   - **12 Bosses × Phase 1 & Phase 2**: Render all 12 bosses (`BOSS_ORDER`) at Phase 1 (`phase=1`) and Phase 2 (`phase=2`, `hp <= 50%`). Assert `save/restore === 0`, `shadowBlurUsed === false`, `nanDetected === false`, distinct P1 vs P2 traces, and distinct traces across all 12 bosses.
   - **12 Stage Backdrops**: Render `PeriodicTableBG.renderScreenBackdrop` + `renderWorld` across all 12 `StageThemeId`s (normal & awakened). Assert `save/restore === 0`, `shadowBlurUsed === false`, `nanDetected === false`.
   - **Trace Export Mode (`R3_RENDER_DIR` env var)**: When set, export JSON draw traces for Pillow rasterization (`6chars_normal_vs_awakened.json`, `18_skins.json`, `8_enemies_normal_vs_elite.json`, `12_bosses_p1_vs_p2.json`).
4. **`tests/e2e/render-r3-sheet.py`**:
   - Consume exported JSON traces and render 4 crisp contact-sheet PNGs into `.agents/teamwork/e2e_renders/r3/` (creating `.nomedia` first!):
     1. `r3_6chars_normal_vs_awakened.png` (6 cols × 2 rows over dark arena floor `#0b0e16`)
     2. `r3_18_skins_sheet.png` (6 cols × 3 rows)
     3. `r3_8_enemies_normal_vs_elite.png` (8 cols × 2 rows)
     4. `r3_12_bosses_p1_vs_p2.png` (6 cols × 4 rows, pairing P1 & P2 per boss)
   - Write `r3_metrics.json` checking `blank_cells === []`, `nan_cells === []`, `shadow_blur_cells === []`, `unbalanced_save_restore === []`, luminance contrast spread (ink dark + rim/accent contrast), and pairwise MAE (`Normal vs Awakened`, `Normal vs Elite`, `P1 vs P2`, and across all 12 bosses).
5. **`tests/e2e/run-e2e.mjs`**, **`TEST_INFRA.md`**, **`TEST_READY.md`**:
   - Update `run-e2e.mjs` to support `--r3` and `--render-r3` (and run `r3_inkwash.e2e.test.ts` cleanly!).
   - Also check the 4 stale E2E assertions noted in Survey 3 (`T1-F1-01/02/06` expecting 14 instead of 18, `T2-F9-04` hidden stage tab) ONLY if needed for clean `--tier=all` execution — document clearly! (Do NOT touch `src/`!)
   - Update `TEST_INFRA.md` and `TEST_READY.md` with exact R3 commands and coverage summary.

## Verification Before Reporting Done
- Run `node tests/e2e/run-e2e.mjs --r3 --render-r3` on the current codebase to verify your test harness & Pillow rasterizer execute end-to-end without crashes or script bugs (note clearly in `handoff.md` which assertions already pass on baseline vs which expect M1/M2/M3 graphics upgrades).
- Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/test_writer_r3_e2e/handoff.md` and message parent `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.
