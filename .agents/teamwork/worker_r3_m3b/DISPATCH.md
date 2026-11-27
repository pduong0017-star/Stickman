# Worker Dispatch — M3B: Arena Contrast Separation, PeriodicTableBG & Game Render Sync

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1/handoff.md`
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_2/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m3b`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **EXCLUSIVE Write Ownership (ONLY edit these files)**:
  - `src/game/PeriodicTableBG.ts`
  - `src/game/stages.ts`
  - `src/game/Game.ts` (rendering/contrast/color-alpha safety ONLY — do NOT modify combat hitboxes, collision, wave logic, damage formulas, or `syncHudThrottled`!)
- **FORBIDDEN**: Do NOT modify ANY other file in `src/` or `tests/`.

## Detailed Scope & Design Requirements
Address the 5 Arena Contrast Traps & Android Perf Hotspots identified by Survey Explorer 2:
1. **`src/game/PeriodicTableBG.ts`**:
   - **Ink-Wash Mid-Ground Contrast Separation Band**: In `renderWorld()` before characters/enemies render, draw a subtle, atmospheric horizontal sumi-paper mist / ink-wash haze band behind the combat lane (`y ≈ GROUND_Y - 210` to `GROUND_Y`) plus a crisp ground horizon rim stroke so `#0b0c10` ink outlines, `#f8fafc` highlights, and vermilion accents stay razor-sharp on ALL 12 dark arenas (`L = 0.002–0.029`), especially `shadow_sanctum`, `chaos_abyss`, `blood_shrine`, `crimson_dojo`, `mirage_oasis`, `cryo_citadel`, and `sovereign_throne`.
   - **Awakening Periodic Table Readability & Android Optimization**:
     - Soften `renderPeriodicTable()` backdrop alpha slightly during combat so the 118 element cells don't visually compete with foreground ink-wash fighters.
     - Cache the static 118-cell periodic table plate into an offscreen `<canvas>` when `typeof document !== 'undefined'` and `typeof HTMLCanvasElement !== 'undefined'` (with clean direct-draw fallback when running in Node/headless `MockCanvas`!), cutting 118 `fillText` calls/frame on Android!
     - Batch/reduce `crimson_dojo` per-mote `save/restore` calls (`PeriodicTableBG.ts:215-223`) if safe without breaking visuals.
   - **Eliminate fragile `${color}33` hex concatenation** (`PeriodicTableBG.ts:171,172,185,499,520,547,575,576,588,602,721`): replace with `colorWithAlpha` from `src/game/renderer/inkStyle.ts`.
   - Keep zero `ctx.shadowBlur` and strict `ctx.save()`/`ctx.restore()` balance.
2. **`src/game/stages.ts`**:
   - Tune/ensure every `STAGE_THEME_PALETTES` entry includes balanced ink-wash mist/horizon contrast tokens (preserving all stage IDs, bosses, wave configs, and `rules.test.ts` expectations!).
3. **`src/game/Game.ts`**:
   - Replace fragile `${color}33` hex concatenation (`Game.ts:2739,2757,2770`) with `colorWithAlpha` from `inkStyle.ts`.
   - Ensure additive screen-space point blooms (`Game.ts:2725-2777`) stay restrained enough not to wash out ink-wash character linework during fast multi-entity combat.
   - Zero `ctx.shadowBlur`, balanced `ctx.save()`/`ctx.restore()`, zero changes to hitboxes/collision/controls/HUD snapshot.

## Concurrency-Safe Mirror Sync & Verification
Serialize access to `/data/user/0/com.agy/files/stickman-build` with Python `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock`, sync `src/` into `$BUILD/src`, run `rules.test.ts` (17/17) and `node node_modules/vite/bin/vite.js build`, verify static `shadowBlur === 0`, and run a headless mock-Canvas2D test invoking `PeriodicTableBG.renderScreenBackdrop` + `renderWorld` across all 12 `StageThemeId`s in both normal and awakened modes asserting `save/restore === 0`, `shadowBlurUsed === false`, zero `NaN`/exceptions.
Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m3b/handoff.md` and message `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.
