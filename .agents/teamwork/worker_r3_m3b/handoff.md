# Worker M3B Handoff — Arena Contrast Separation, PeriodicTableBG & Game Render Sync

**Status**: Complete (`HEADLESS_M3B_PASS`, `rules.test.ts` 17/17, `vite build` exit 0, `R3-STATIC-01` & `R3-STAGE-01` pass, zero `shadowBlur`, mirror synced).

---

## 1. Observation

### 1.1 Files Modified (Exclusive M3B Write Ownership)
1. **`src/game/stages.ts`**:
   - Extended `StageThemePalette` (`lines 45–63`) with `mistColor: string`, `mistAlpha: number`, and `horizonRimColor: string`.
   - Populated balanced neutral/sumi-ash mist and high-contrast horizon rim tokens across all 12 `STAGE_THEME_PALETTES` entries (`lines 65–294`), specifically counteracting dark-on-dark and same-hue camouflage on `crimson_dojo` (`#cbd5e1`, `0.27`), `shadow_sanctum` (`#cbd5e1`, `0.28`), `blood_shrine` (`#e2e8f0`, `0.29`), `chaos_abyss` (`#e2e8f0`, `0.29`), `mirage_oasis` (`#cbd5e1`, `0.24`), `cryo_citadel` (`#94a3b8`, `0.23`), and `sovereign_throne` (`#cbd5e1`, `0.25`).
   - Preserved `CAMPAIGN_STAGES`, `BLESSING_POOL`, `computeBlessingModifiers`, `rollBlessingChoices`, `buildActiveBlessingBadges`, and `generateEndlessWave` untouched.
2. **`src/game/PeriodicTableBG.ts`**:
   - Imported `colorWithAlpha` and `finiteOr` from `./renderer/inkStyle` (`line 3`) and added finite guards on `triggerCrimsonFlash`, `update`, `renderScreenBackdrop`, `renderWorld`, and `renderPeriodicTable`.
   - Replaced all 11 fragile `${color}XX` hex-suffix concatenations (previously at lines 171, 172, 185, 499, 520, 547, 575, 576, 588, 602, 721) with `colorWithAlpha(...)`.
   - Added a defensive string check for `bossAccent` in `renderWorld` (`lines 515–518`) so non-string callers (such as `R3-STAGE-01` passing boolean `awakened`) safely fall back to `pal.spotlightColor`.
   - Eliminated 42 per-mote `ctx.save()/translate()/rotate()/ctx.restore()` calls in `crimson_dojo` sakura petals by passing rotation directly into `ctx.ellipse(mx, my, m.r * 2.1, m.r * 0.9, rot, 0, Math.PI * 2)` (`lines 222–225`).
   - Added `renderCombatMistBand(...)` (`lines 652–708`, invoked before floor/horizon in `renderWorld` at `line 576`) drawing a horizontal sumi-paper mist gradient (`y = GROUND_Y - 215` to `GROUND_Y`) and two subtle sumi-e mist ribbons via `quadraticCurveTo`, plus upgraded **4D. Crisp Ink-Wash Ground Horizon Rim Stroke** (`lines 637–647`) with a sumi anchor shadow, `pal.horizonRimColor` rim, and upper chalk hairline.
   - Added `getStaticTablePlate()` (`lines 798–835`) caching the 112 static non-featured Periodic Table cells into an offscreen `HTMLCanvasElement` when `typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined'`, blitting via a single `ctx.drawImage(...)` once settled (`tableDropTimer >= 0.82`) and drawing only the 6 pulsing featured cells on top — with clean direct-draw fallback in headless/Node environments (and skipping per-cell `save/restore` when `Math.abs(tilt) <= 0.005`). Softened backdrop cell/tether alpha (`0.48` regular, `0.78` featured, `0.38` tethers) so foreground ink-wash fighters stay razor-sharp.
   - Static `ctx.save()` / `ctx.restore()` count: `save=17, restore=17` (all blocks guarded by `try { ... } finally { ctx.restore(); }`).
3. **`src/game/Game.ts`**:
   - Imported `colorWithAlpha` and `finiteOr` from `./renderer/inkStyle` (`line 67`).
   - Updated section **2B. World-Space Dynamic Additive Point Lighting** (`lines 2725–2781`) to replace `${themeColor}${...}`, `${bCol}2c`, and `${proj.color}38` with `colorWithAlpha(...)`, guard coordinates with `finiteOr(...)`, wrap `ctx.save()`/`ctx.restore()` in `try/finally` (`save=6, restore=6`), and restrain additive point blooms (player radius `128/78` & alpha `0.14/0.08`, boss radius `112` & alpha `0.12`, projectile radius `Math.max(26, r * 1.85)` & barrage-attenuated alpha `0.06–0.14`).
   - Zero changes to combat hitboxes, collision, wave logic, damage formulas, or `syncHudThrottled`.

### 1.2 Verification Outputs (Observed Verbatim)
- **Static audits (`src/`)**:
  - `SHADOWBLUR_FILES: []` (0 occurrences of `shadowBlur` in `src/`).
  - `HEX_CONCAT_CHECK src/game/PeriodicTableBG.ts: []`, `HEX_CONCAT_CHECK src/game/Game.ts: []`.
  - `SAVE_RESTORE src/game/PeriodicTableBG.ts: save=17, restore=17`, `SAVE_RESTORE src/game/Game.ts: save=6, restore=6`.
- **Mirror sync (`fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock`)**:
  - `MIRROR_DIFF_EXIT: 0` (`diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src`).
- **Unit tests (`src/game/rules.test.ts`)**: `RULES_EXIT: 0` — `tests 17`, `pass 17`, `fail 0` (`1788.77ms`).
- **Vite production build (`node node_modules/vite/bin/vite.js build`)**: `VITE_EXIT: 0` — `1695 modules transformed`, `dist/index.html (1.76 kB)`, `dist/assets/index-DVgzHGJ9.css (41.49 kB)`, `dist/assets/index-Dom0-L5A.js (769.07 kB)` in `1.62s`.
- **R3 Static & Stage Tests (`tests/e2e/r3_inkwash.e2e.test.ts`)**: `R3_STAGE_EXIT: 0` — `R3-STATIC-01` PASS (`160.29ms`), `R3-STAGE-01` PASS (`516.64ms`).
- **Headless Mock-Canvas2D Verification (12 stages × Normal/Awakened + offscreen cache + `Game.render()` loop)**:
  - `{"themes":12,"totalStageRenders":72,"cachedFillTextPerFrame":6,"status":"HEADLESS_M3B_PASS"}`
  - Verified all 12 `StageThemeId`s across Normal, Awakened drop-in (`t = 0.25s`), Awakened settled (`t = 1.17s`), `#ef4444` and `hsl(295, 85%, 62%)` theme colors, `NaN`/`Infinity` resilience, simulated `HTMLCanvasElement` offscreen plate path (`6` `fillText` calls/frame instead of `118`), and full `Game` rAF loop in Normal & Awakened modes with active `hsl(...)` projectile (`saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, `nanDetected === false`).

---

## 2. Logic Chain

1. Adding explicit `mistColor`, `mistAlpha`, and `horizonRimColor` tokens to `StageThemePalette` in `src/game/stages.ts` decouples combat-lane contrast tuning per biome without touching stage progression, wave spawns, or `BOSS_ROSTER` invariants (`rules.test.ts` 17/17 pass).
2. Rendering the mid-ground sumi-paper mist band (`GROUND_Y - 215` to `GROUND_Y`) and upgraded horizon seam in `PeriodicTableBG.renderWorld()` immediately prior to characters/enemies creates a controlled neutral luminance buffer (`mistAlpha: 0.20–0.29`) behind fighter silhouettes, preventing `#0b0c10` ink outlines and vermilion/gold/cyan accents from disappearing into ultra-dark (`L = 0.002–0.029`) or same-hue arenas (`blood_shrine`, `crimson_dojo`, `shadow_sanctum`, `chaos_abyss`, `mirage_oasis`, `cryo_citadel`, `sovereign_throne`).
3. Caching the 112 static Periodic Table cells into `staticTableCanvas` behind a `typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined'` guard cuts `fillText` calls per frame from `118` to `6` on Android/browser while cleanly falling back to direct drawing in Node `MockCanvasElement`, and removing `crimson_dojo` per-mote `save/restore` eliminates 42 state pushes per frame.
4. Replacing all `${color}XX` hex concatenations with `colorWithAlpha()` in `PeriodicTableBG.ts` and `Game.ts` prevents `DOMException`/invalid CSS stops when callers pass `hsl(...)` (such as Aether) or `#RGB`, while restraining additive point blooms in `Game.ts` prevents ink linework washout during multi-entity combat.

---

## 3. Caveats

- `tsc --noEmit` was not executed directly because `typescript@7.0.2` in `/data/user/0/com.agy/files/stickman-build` lacks `@typescript/typescript-android-arm64` (per `PROJECT.md`); bundling and type/syntax resolution were verified via `vite build` (exit 0) and `tsx`/`esbuild`.
- During the initial sync check, `Entities.ts` differed briefly in `PROJECT/src` vs `BUILD/src` due to concurrent M3A work; the final `fcntl.flock`-guarded sync and verification run confirmed `MIRROR_DIFF_EXIT: 0` across all of `src/`.
- Full R3 contact-sheet PNG visual inspection (`R3-VISUAL-01`) and cross-milestone integration belong to M4.

---

## 4. Conclusion

Milestone M3B is complete and verified. `src/game/stages.ts`, `src/game/PeriodicTableBG.ts`, and `src/game/Game.ts` now provide mid-ground ink-wash arena contrast separation across all 12 biomes, a crisp horizon rim, softened/cached Awakening Periodic Table rendering (`118 → 6` `fillText`/frame on Android/browser with headless fallback), batched `crimson_dojo` petals, restrained additive blooms, and safe `colorWithAlpha` / finite coordinate handling — with zero `shadowBlur`, balanced `save/restore`, zero `NaN`, 17/17 `rules.test.ts` passing, and a clean Vite production build synced to `/data/user/0/com.agy/files/stickman-build/src`.

---

## 5. Verification Method

Run from `/data/user/0/com.agy/files/stickman-build` under `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock` after verifying `diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src`:
1. Static `shadowBlur` and hex-concat check across `src/`:
   ```bash
   python3 -c "import pathlib; bad=[str(p) for p in pathlib.Path('/storage/emulated/0/Antigravity/Stickman/src').rglob('*.ts*') if 'shadowBlur' in p.read_text()]; assert not bad"
   ```
2. Unit tests (17/17):
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
3. Vite production build (exit 0):
   ```bash
   node node_modules/vite/bin/vite.js build
   ```
4. R3 static & 12-stage mock-Canvas2D test (`R3-STATIC-01` & `R3-STAGE-01`):
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs --test-name-pattern 'R3-STATIC-01|R3-STAGE-01' /storage/emulated/0/Antigravity/Stickman/tests/e2e/r3_inkwash.e2e.test.ts
   ```
5. **Invalidation conditions**: Any further changes to `src/game/PeriodicTableBG.ts`, `src/game/stages.ts`, or `src/game/Game.ts` require re-syncing `src/` to `/data/user/0/com.agy/files/stickman-build/src` and re-running steps 1–4.
