# Sub-Orchestrator Dispatch — E2E Testing Track (R3 Ink-Wash Verification)

- **Scope**: Milestone `E2E` (`R3-F7`) per `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` & `/storage/emulated/0/Antigravity/Stickman/TEST_INFRA.md`
- **Exclusive Write Ownership**:
  - `TEST_INFRA.md`
  - `TEST_READY.md`
  - `tests/e2e/*` (including `tests/e2e/helpers/mockCanvas.ts`, `tests/e2e/helpers/testHarness.ts`, `tests/e2e/r3_inkwash.e2e.test.ts`, `tests/e2e/render-r3-sheet.py`, `tests/e2e/run-e2e.mjs`)
  - Render outputs strictly inside `.agents/teamwork/e2e_renders/r3/` (with `.nomedia`)
- **Forbidden Edits**: Do NOT modify any file under `src/`.
- **Mandatory Reads**:
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
  - `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
  - `/storage/emulated/0/Antigravity/Stickman/TEST_INFRA.md`
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_3/handoff.md`
- **Acceptance Criteria for E2E**:
  1. `mockCanvas.ts` supports `arcTo`, `transform`, `fill(rule?)` cleanly without throwing, and tracks `saveCount`, `restoreCount`, `getSaveDepth()`, `shadowBlurUsed`, `nanDetected`, `commands.length`, `uniqueColors`.
  2. `testHarness.ts` exposes `ALL_6_CHARACTERS` (including `'valkyrie'`) and `ALL_18_SKINS`.
  3. `tests/e2e/r3_inkwash.e2e.test.ts` tests:
     - Static zero-`shadowBlur` scan across `src/**/*.ts*`
     - All 6 characters × Normal & Awakened × all 18 skins across key poses (`save/restore === 0`, `shadowBlurUsed === false`, `nanDetected === false`, `commands.length > 0`)
     - All 8 Enemy types × Normal & Elite (`save/restore === 0`, `shadowBlurUsed === false`, zero NaN, normal vs elite trace distinction)
     - All 12 Bosses × Phase 1 & Phase 2 (`save/restore === 0`, `shadowBlurUsed === false`, zero NaN, P1 vs P2 distinction)
     - All 12 Stage backdrops (`PeriodicTableBG` normal & awakened, `save/restore === 0`, zero NaN)
     - Trace export mode (`--render-r3` / `R3_RENDER_DIR`) for Pillow contact-sheet rasterization.
  4. `tests/e2e/render-r3-sheet.py` rasterizes 4 inspectable PNG contact sheets in `.agents/teamwork/e2e_renders/r3/` (`.nomedia` isolated): `r3_6chars_normal_vs_awakened.png`, `r3_18_skins_sheet.png`, `r3_8_enemies_normal_vs_elite.png`, `r3_12_bosses_p1_vs_p2.png`, plus `r3_metrics.json` (blank check, contrast spread, MAE).
  5. Update `run-e2e.mjs` to support `--r3` / `--render-r3`, and update `TEST_INFRA.md` & `TEST_READY.md` once complete. Note: verify your test suite executes cleanly against current baseline `src/` (recording any expected pre-M1/M2/M3 gaps clearly if run before M1-M3 finish, or verifying baseline pass on static/harness checks).
