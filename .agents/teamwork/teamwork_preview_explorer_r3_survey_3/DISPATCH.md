# Survey Explorer 3 Dispatch — Build Mirror, Tests, Static/Headless & Visual Pipeline

Read `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`), `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`, and `/storage/emulated/0/Antigravity/Stickman/TEST_INFRA.md`.

Your working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_3`
Project root: `/storage/emulated/0/Antigravity/Stickman`
Mirror build directory: `/data/user/0/com.agy/files/stickman-build`

Explore (read-only on `src/` — do NOT edit source code):
1. `src/game/rules.test.ts`, `package.json`, `tsconfig.json`, `vite.config.ts`
2. All files in `tests/e2e/` (`run-e2e.mjs`, `helpers/mockCanvas.ts`, `*.e2e.test.ts`, `render-*.py`)
3. Inspect `/data/user/0/com.agy/files/stickman-build` and `/data/user/0/com.agy/cache/esbuild_bin` to verify the exact mirror sync, unit test, Vite build, and headless Canvas2D/Pillow visual rendering setup.
4. Run baseline read-only checks (sync check or baseline test run in `/data/user/0/com.agy/files/stickman-build`) if needed without modifying `src/`.

Write a detailed report `handoff.md` in your working directory covering:
- Exact baseline status of `/data/user/0/com.agy/files/stickman-build`, `rules.test.ts` (17/17?), `vite build`, and `tests/e2e/`.
- Existing `shadowBlur` occurrences across `src/game/` (grep audit!).
- How `mockCanvas.ts` and Pillow rasterizers work, and what gaps exist for testing all 6 playable characters (including `valkyrie`), skins, normal/elite enemies, and 12 bosses (Phase 1 & Phase 2), plus `save/restore === 0` and zero-NaN headless checks.
- Concrete recommendations for R3 verification & E2E/Visual testing track.
