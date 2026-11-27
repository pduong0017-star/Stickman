# Phase 0 Survey Report — R3 & R5: Arena, Awakening, Domain Expansion, MirrorRift & Verification (`mirage:void_shatterer`)

**Summary**: No Domain Expansion / background override state currently exists; `PeriodicTableBG` already uses an exponential `awakeningBlend` (`0..1`) on top of `stageTheme` (`StageThemeId`), making a parallel `domainBlend` + `Game`-managed `domainTimer` exclusive to `mirage:void_shatterer` straightforward without mutating the underlying stage. `MirrorRift`s currently only reflect projectiles and pulse AoE damage in `Game.ts`, with clean hook points for Domain empowerment, inter-rift beams, `[J]` shatter hits, and `Dash` Mirror Warp; baseline `rules.test.ts` (17/17) and `run-e2e.mjs --r3` (15/15) pass in the current environment.

---

## 1. Observation

### 1.1 Arena Background & Rendering Pipeline (`PeriodicTableBG.ts`, `stages.ts`, `Game.ts`)
- **`src/game/Game.ts:91`**: `private readonly bg = new PeriodicTableBG();`
- **`src/game/Game.ts:902-907` & `915`**:
  - Title state calls `this.bg.update(dt, false)`.
  - Playing state calls `this.bg.update(dt, this.player.awakened)`.
- **`src/game/Game.ts:2710-2744` (`render`)**:
  - `const vfx = getSkinVfxProfile(this.characterId, this.skinId);`
  - `const themeColor = this.player.awakened ? vfx.impactRingColor : vfx.swingAuraColor;`
  - Screen-space backdrop: `this.bg.renderScreenBackdrop(ctx, this.viewW, this.viewH, this.player.awakened, themeColor);` (`Game.ts:2714-2720`).
  - World-space arena (skipped during cutscene `monoArena`): `this.bg.renderWorld(ctx, this.player.x, this.player.y, this.activeBoss?.accentColor ?? null, themeColor);` (`Game.ts:2737-2743`).
- **`src/game/PeriodicTableBG.ts:108-267` (`update`, `renderScreenBackdrop`)**:
  - State fields (`lines 109-116`): `time`, `awakeningBlend` (exponentially smoothed via `this.awakeningBlend += (target - this.awakeningBlend) * (1 - Math.exp(-5.0 * dt))` at `line 143`), `tableDropTimer`, `wasAwakened`, `crimsonFlash`, `stageTheme: StageThemeId = 'genesis_lab'`, `staticTableCanvas`.
  - `renderScreenBackdrop` (`lines 151-267`): draws sky vertical gradient (dark `#0d0c14 -> #1b1522 -> #0c0b10` when `awakeningBlend > 0.12`, else `pal.skyTop/Mid/Bottom` from `STAGE_THEME_PALETTES[this.stageTheme]`), calls `renderSkyLandmark` (`lines 269-505`, 12 biome cases), radial spotlight, 3 slanted `lighter` god-rays, 42 `AMBIENT_MOTES`, and `crimsonFlash` overlay.
- **`src/game/PeriodicTableBG.ts:507-985` (`renderWorld`, `renderPeriodicTable`)**:
  - Draws `renderBiomePillars` (`lines 530-537`), 68px wall grid (`lines 540-553`), `renderPeriodicTable` when `this.awakeningBlend > 0.02` (`lines 556-558`), edge barrier gates (`lines 561-574`), `renderCombatMistBand` (`line 577`), stage floor plane `floorGrad` (`lines 580-591`), 3D perspective floor grid (`lines 594-613`), dynamic player floor light pool (`lines 616-640`), and ink-wash horizon rim (`lines 643-651`).
  - Uses `colorWithAlpha` and `finiteOr` from `./renderer/inkStyle`, zero `shadowBlur`, and `try { ... } finally { ctx.restore(); }` blocks.
- **`src/game/stages.ts:65-294`**: Defines `STAGE_THEME_PALETTES` for 12 `StageThemeId`s (note `mirage_oasis` at `lines 256-274` is Stage 11's desert/hourglass biome, unrelated to Mirage's Domain Expansion).
- **No Domain Expansion state exists** anywhere in `PeriodicTableBG.ts`, `Game.ts`, `Player.ts`, `stages.ts`, `types.ts`, or React components.

### 1.2 Awakening, Rage Ultimate & HUD/UI (`Player.ts`, `Game.ts`, `UltimateCutscene.ts`, `animation.ts`, `characters.ts`, `skinVfx.ts`, `App.tsx`, `GameHUD.tsx`, `TouchControls.tsx`)
- **Mirage Identity & Skin Metadata**:
  - `src/game/types.ts:5, 23`: `CharacterId` includes `'mirage'`; `SkinId` includes `'void_shatterer'`.
  - `src/game/characters.ts:410-460`: `mirage` (`Ảnh Kính Hư Không`), `specialKind: 'mirror_fracture'`, `ultimateKanji: '鏡'`, `awakeningBannerText: 'THỨC TỈNH: HƯ KHÔNG KÍNH GIỚI!'`.
  - `src/game/characters.ts:941-979`: Mirage skins are `'default'` (`Ảnh Kính`) and `'void_shatterer'` (`Ma Kính`, `rarity: 'mythic'`, `ultimatePrimaryColor: '#f43f5e'`, `ultimateSecondaryColor: '#38bdf8'`, `ultimateKanji: '碎'`, `awakenName: 'MA KÍNH'`, `awakeningBannerText: 'THỨC TỈNH: MA KÍNH HƯ KHÔNG!'`).
  - `src/game/skinVfx.ts:551-598`: `'mirage:default'` (`motif: 'mirror_shatter'`, `#e2e8f0` / `#a855f7`) and `'mirage:void_shatterer'` (`motif: 'void_prism'`, `#38bdf8` / `#f43f5e`).
- **Awakening Flow**:
  - `src/game/Player.ts:144-146`: `awakened = false`, `awakenTimer = 0`, `awakenDuration = 12.5`.
  - `src/game/Player.ts:616-626`: While `awakened`, `awakenTimer` counts down in non-training mode (`this.awakenTimer -= dt; if (this.awakenTimer <= 0) { this.awakened = false; this.awakenTimer = 0; }`); in `trainingMode`, `awakenTimer` stays pinned to `awakenDuration`.
  - `src/game/Player.ts:673-675`: Pressing `[O]` (`'awaken'`) calls `params.onRequestAwaken()`.
  - `src/game/Game.ts:1230-1254`: `onRequestAwaken` calls `this.player.triggerAwakening(...)`, triggers `bg.triggerCrimsonFlash(0.95)`, BGM intensity 2, impact frame, and marks/lifts enemies within `260px`.
  - `src/game/Player.ts:496-515`: Mirage-specific `triggerAwakening` grants `invulnTimer = 1.6`, spawns 2 parallel `MirrorRift`s at `clamp(x ± 120, 75, ARENA_WIDTH - 75)`, emits `ChainArc`, shockwave, and `'shard'` particles.
  - **Gap found in `src/game/animation.ts:182-360`**: `getAwakenedVisualProfile(characterId, skinId)` has no `case 'mirage':` and falls through to `default` (Kuro's `HUYẾT KIẾM MA VƯƠNG` / `BĂNG HUYẾT`). `Game.ts:3083-3086` applies `awakenedProfile` only when `this.skinId === 'default'`, so `mirage:default` displays Kuro's `HUYẾT KIẾM MA VƯƠNG` codename/skill in HUD (`Game.ts:3087-3105`) and `Player.ts:520-522`.
- **Rage Ultimate Flow**:
  - `src/game/Player.ts:669-672`: When `rage >= maxRage` (`100`) and `[I]` (`'ultimate'`) is pressed, calls `params.onRequestUltimate()` -> `Game.activateScarletSheath()` (`Game.ts:2410-2689`).
  - `src/game/UltimateCutscene.ts:167-168, 1519-1600`: Calls `renderMirrorShatter()`, which already checks `const isVoidSkin = this.theme.skinId === 'void_shatterer'` (`line 1523`) with `#f43f5e` / `#38bdf8`.
  - `src/game/Game.ts:2457-2479`: Inside `onKanjiImpact`, for `ch.id === 'mirage'`, resets `dashCooldown = 0` & `cryoCooldown = 0`, pushes 1 `MirrorRift` (`maxLife = 4.8`, `awakened = true`) at `clamp(this.player.x + this.player.facing * 95, 80, ARENA_WIDTH - 80)`, emits shockwave, `'shard'` particles, and text `'VẠN KÍNH HƯ KHÔNG · PHÁ GIỚI!'` (if `isOverdrive`) or `'VẠN KÍNH PHÁ HƯ KHÔNG!'`.
  - `src/game/Game.ts:2673-2675`: `onComplete` callback fires when cutscene finishes (`this.cutscene.active` becomes `false` at `UltimateCutscene.ts:153-154`).
- **Lifecycle Reset Gap (`Game.ts:461-610`)**:
  - Neither `enterTitleState()` (`Game.ts:466-496`) nor `startMode()` (`Game.ts:516-554`) clears `this.mirrorRifts` (unlike `iceWalls`, `magmaPillars`, `projectiles`, `magicCircles`, etc.) or any future Domain Expansion state.
- **UI / HUD (`types.ts`, `App.tsx`, `GameHUD.tsx`, `TouchControls.tsx`)**:
  - `HudSnapshot` (`src/game/types.ts:262-307`) and `INITIAL_HUD` (`src/App.tsx:12-69`) expose `awakened`, `cooldowns.awakenTimeLeft`, `cooldowns.awakenDuration`, `arenaBuffText`, `waveBountyText`, `cutsceneActive`, etc. There is no Domain Expansion field in `HudSnapshot` yet.
  - `src/components/GameHUD.tsx` renders `arenaBuffText` (`lines 197-201`), `awakenPrompt` (`lines 510-516`), and hides HUD during `hud.cutsceneActive` (`lines 49-51`). `src/components/TouchControls.tsx:196-225` displays Awakening `[O]` button state.

### 1.3 `MirrorRift` Mechanics & Interaction Points (`Entities.ts`, `Game.ts`, `Player.ts`)
- **`src/game/Entities.ts:2146-2250` (`MirrorRift`)**:
  - Fields: `x`, `y`, `radius` (`awakened ? 165 : 130`), `damage`, `awakened`, `primaryColor`, `secondaryColor`, `life = 0`, `maxLife` (default `3.8`), `active = true`, `pulseTimer = 0.2`, `finalBurstReady = false`.
  - `update(dt)`: advances `life`, ticks `pulseTimer` (`0.45` awakened / `0.58` normal), sets `active = false` and `finalBurstReady = true` when `life >= maxLife`.
  - `render(ctx)`: draws dark obsidian diamond (`rgba(10, 6, 24, 0.82)` + `primaryColor` border), inner facet lines (`secondaryColor`), and `4` or `6` orbiting shards (`lighter` blend), with balanced `ctx.save()` / `ctx.restore()` and no `shadowBlur`.
- **`src/game/Game.ts:1342-1389` (Rift update & projectile reflection)**:
  - Drains `this.player.pendingMirrorRifts` (`Player.ts:128-135`, populated in `Player.triggerAwakening` at `line 502` and `Player.triggerSignatureSkill` `'mirror_fracture'` at `line 1386`).
  - Reflects enemy projectiles (`!proj.fromPlayer && proj.active`) within `rift.radius * 0.55` (`line 1354`): flips `proj.fromPlayer = true`, `proj.vx = -proj.vx * 1.45`, `proj.vy = -proj.vy * 1.1`, `proj.damage = Math.max(proj.damage * 2, 32)`, `proj.color = rift.primaryColor`. Note `proj.reflected` is not currently set to `true` here (cf. `Game.ts:1813` posture bonus).
  - On `shouldPulse || rift.finalBurstReady` (`lines 1364-1385`): AoE damages enemies within `rift.radius` (`dmg` or `2.0 * dmg` on collapse), applies `'mirage'` elemental mark, and calls `registerPlayerHit`.
- **`src/game/Game.ts:2792-2794`**: Renders each active `MirrorRift` in world space (`!monoArena`) after projectiles and before `valkyrieBoomerangs` and `particles.render`. No inter-rift beams or Domain Empowerment modifiers exist yet.
- **Melees & Dash Hooks (`Game.ts:1545-1558`, `Player.ts:720-847, 2097-2119`)**:
  - `Game.ts:1552-1558` checks `this.player.activeHitbox` against `this.soulCrystals` via AABB overlap and `c.lastHitboxId === hb.id` deduplication — the exact pattern needed for `[J]` hitting a `MirrorRift`.
  - `Player.ts:820-839` implements Kuro's dash-through `iceWalls` check inside `Player.update`; `Player.update` (`lines 565-584`) currently does NOT take `mirrorRifts` as a param. Note `tests/e2e/helpers/testHarness.ts:317-335` calls `player.update({...})` directly, so any new parameter on `Player.update` must be optional.

### 1.4 Test & Build Infrastructure (`package.json`, `TEST_INFRA.md`, `TEST_READY.md`, `rules.test.ts`, `tests/e2e/*`, `stickman-build`)
- **Android Build & Test Mirror (`/data/user/0/com.agy/files/stickman-build`)**:
  - `/storage/emulated/0` is mounted `noexec`; Vite native binaries (`rolldown`, `lightningcss`, `esbuild`) and `tsx`/`esbuild` execute from `/data/user/0/com.agy/files/stickman-build` and `/data/user/0/com.agy/cache/esbuild_bin` (`-rwxr-xr-x`, verified present).
  - `diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src` returned exit 0 (currently synced).
  - **`npm run lint` (`tsc --noEmit`)**: `typescript@7.0.2` (`tsgo`) lacks `@typescript/typescript-android-arm64` (`TEST_INFRA.md:10`, `PROJECT.md:96`); type/bundle verification relies on `vite build` + `tsx`/`esbuild`.
  - **Exact Unit Test Command** (verified live: **17/17 PASS**):
    ```bash
    ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
    ```
    (run with `cwd = /data/user/0/com.agy/files/stickman-build` after syncing `src/`).
  - **Exact Production Build Command**:
    ```bash
    node node_modules/vite/bin/vite.js build
    ```
    (run with `cwd = /data/user/0/com.agy/files/stickman-build` after syncing `src/`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`).
- **E2E Runner & Harnesses (`tests/e2e/`)**:
  - `tests/e2e/run-e2e.mjs`: Auto-bootstraps `esbuild_bin` to `$TMPDIR` or `/data/user/0/com.agy/cache/esbuild_bin`, creates `.nomedia` in `.agents/teamwork/e2e_renders/{,poses,r3}`, and runs `node node_modules/tsx/dist/cli.mjs --test <file>`.
    - Supports `--with-unit`, `--tier=1|2|3|4|all`, `--pose`, `--r3`, `--render-visuals`, `--render-poses`, `--render-r3`, `--verbose`.
    - Verified live: `node tests/e2e/run-e2e.mjs --r3` passed **15/15** in 20.3s.
  - `tests/e2e/helpers/mockCanvas.ts`:
    - `RecordingContext2D`: full affine matrix stack across `save()`/`restore()`, tessellates paths into `DrawCommand[]`, tracks `saveCount`, `restoreCount`, `getSaveDepth()`, `shadowBlurUsed`, `nanDetected`, `nanEvents`, `uniqueColors`, `opCounts`, `compositeOps`, `getTraceSignature()`.
    - `installDomShims(...)`: mocks `window`, `document`, `HTMLElement`, `localStorage`, `requestAnimationFrame` queue (`flushAnimationFrames`), without touching read-only `globalThis.navigator`.
  - `tests/e2e/helpers/testHarness.ts`:
    - Provides `createHeadlessGame(...)` (full `Game` loop with `stepFrames` & `tapAction`), `createTestPlayer(charId, skinId)`, `createTestEnemy`, `createTestBoss`, `createTestBackdrop(theme, { awakened })`.
  - **Important Test Drift Discovered (`mirage` added post-R3)**:
    - `testHarness.ts:39, 73, 115` still define `ALL_6_CHARACTERS`, `ALL_18_SKINS`, `ALL_18_MOTIFS` (excluding `mirage`, `mirage:default`, `mirage:void_shatterer`).
    - `tests/e2e/tier1_features.e2e.test.ts:43-62` (`T1-F1-01`, `T1-F1-02`) explicitly assert `profiles.length === 18` and `ids.size === 18`, whereas `src/game/skinVfx.ts` now defines **20** profiles (18 + 2 Mirage skins). Thus running `--tier=1` currently fails `T1-F1-01`/`T1-F1-02` unless updated or accounted for.
    - `src/game/renderer/` currently has **0** occurrences of `mirage` (`grep_search` confirmed).

---

## 2. Logic Chain

1. **Why Domain Expansion should be a dedicated `domainBlend` / `domainActive` state rather than mutating `stageTheme` or relying solely on `awakened`**:
   - Observation (`PeriodicTableBG.ts:118-145, 556-558`, `Game.ts:915, 2714-2743`): `PeriodicTableBG` stores `stageTheme` for the stage's native biome and interpolates `awakeningBlend` exponentially (`1 - Math.exp(-5 * dt)`). Meanwhile, `awakened` only becomes true on `[O]` (`12.5s`), whereas R3 requires Domain Expansion for `mirage:void_shatterer` **"khi kích hoạt Thức Tỉnh hoặc sau Tuyệt kỹ Nộ"** (even if Rage Ultimate `[I]` is cast while unawakened!) and requires reverting smoothly to the original map when the timer expires.
   - Inference: Tracking `domainTimer` in `Game.ts` (activated on `mirage:void_shatterer` Awakening and on Rage Ultimate `onKanjiImpact`/`onComplete`) and passing `(dt, this.player.awakened, domainActive)` to `bg.update(...)` lets `PeriodicTableBG` smoothly animate `domainBlend` (`0 -> 1` on entry, `1 -> 0` on exit) and crossfade sky/landmarks/pillars/floor/periodic-table suppression into "Ma Kính Hư Không Giới", then seamlessly restore `this.stageTheme` when `domainActive` becomes `false`.
2. **Why `MirrorRift` empowerment and `[J]` / `Dash` interactions belong primarily in `Game.ts` + `Entities.ts` (with optional hooks in `Player.ts`)**:
   - Observation (`Game.ts:1342-1389, 1552-1558`, `testHarness.ts:317-335`): `Game.ts` owns `this.mirrorRifts`, `this.enemies`, `this.projectiles`, and `this.player.activeHitbox` resolution. `Player.update` does not currently receive `mirrorRifts`, and `testHarness.ts` calls `player.update` without `mirrorRifts`.
   - Inference: Handling `[J]` shatter collision in `Game.ts`'s `activeHitbox` loop (mirroring `soulCrystals` with `lastHitboxId`), checking `Dash`-through `MirrorRift` in `Game.ts` (or via an optional `mirrorRifts?: MirrorRift[]` / callback on `Player.update`), and passing `domainActive` into `MirrorRift` update/render cleanly empowers rifts (range, shatter damage, inter-rift void beams) without breaking any existing `createTestPlayer` callers.
3. **Why `enterTitleState()` and `startMode()` must clear `mirrorRifts` and `domainTimer`**:
   - Observation (`Game.ts:466-496, 516-554`): `this.mirrorRifts` is currently omitted from the entity array resets in both methods.
   - Inference: Returning to Title or restarting a run while rifts or Domain Expansion are active would otherwise leak rifts/domain visuals into the next run or title screen.

---

## 3. Caveats

- Only `rules.test.ts` (17/17) and `run-e2e.mjs --r3` (15/15) were executed live during this survey; `tier1`–`tier4` and `vite build` were not executed (note `T1-F1-01/02` in `tier1_features.e2e.test.ts` are observed by inspection to expect `18` profiles while `skinVfx.ts` has `20`).
- `StickmanRenderer.ts` and `src/game/renderer/*` internals (R1/R2 visual rendering of Mirage & `void_shatterer`) were not deeply inspected here because they belong to Survey Explorers 1 & 2.
- `tsc --noEmit` cannot run natively on Android ARM64 (`typescript@7.0.2` lacks `@typescript/typescript-android-arm64`), so TypeScript syntax/imports must be checked via `vite build` and `tsx`/`esbuild`.

---

## 4. Conclusion & Recommended Integration Contracts

1. **Arena Background & Domain Expansion (`PeriodicTableBG.ts`, `Game.ts`)**:
   - Add `domainBlend` (`0..1`) to `PeriodicTableBG` driven by `bg.update(dt, awakened, domainActive)` (default `domainActive = false` for backward compatibility with `createTestBackdrop`).
   - Exclusively when `this.characterId === 'mirage' && this.skinId === 'void_shatterer'`, `Game.ts` activates `domainTimer` on Awakening (`onRequestAwaken`, syncing/matching `awakenDuration` or refreshing) and after Rage Ultimate (`activateScarletSheath` -> `onKanjiImpact` / `onComplete`). Skin `mirage:default` and all other characters NEVER set `domainActive = true`.
   - When `domainBlend > 0.02`, `PeriodicTableBG` suppresses the chemical Periodic Table (or fades it to 0) and renders **Ma Kính Hư Không Giới** (polygonal shattered sky fractures, floating obsidian-crimson-cyan mirror monoliths, fractured reflective floor plane + floating glass shards) using only `colorWithAlpha`, `finiteOr`, balanced `save/restore`, and **zero `shadowBlur`**. When `domainTimer` expires, `domainBlend` smoothly decays back to `0`, restoring `this.stageTheme` unchanged.
   - Reset `this.mirrorRifts = []`, `domainTimer = 0`, and `bg.resetDomain?.()` in both `Game.enterTitleState()` and `Game.startMode()`.
   - Also add `case 'mirage':` to `getAwakenedVisualProfile()` in `src/game/animation.ts` so `mirage:default` stops displaying Kuro's `HUYẾT KIẾM MA VƯƠNG` title/callout.
   - Optional HUD indicator: add optional `domainActive?: boolean; domainTimeLeft?: number;` to `HudSnapshot` (`types.ts`) and `INITIAL_HUD` (`App.tsx`) if displaying a Domain timer badge in `GameHUD.tsx`.
2. **`MirrorRift` Empowerment & Interactions (`Entities.ts`, `Game.ts`, `Player.ts`)**:
   - Extend `MirrorRift` with optional `lastHitboxId` / `warpCooldown` / `empowers`/`domain` awareness (e.g., `setDomainEmpowered(active)` or parameter to `update`/`render`) so during Domain Expansion: reflection radius increases, shatter pulse/burst damage scales up, and `Game.ts` renders + simulates **mirror beams** linking active `MirrorRift` pairs (dealing beam tick damage + applying `'mirage'` marks).
   - In `Game.ts` `activeHitbox` loop: detect `[J]` hits on active `MirrorRift`s (via `lastHitboxId` dedup), shattering the rift into piercing homing/directed glass-shard projectiles toward the nearest enemy + AoE shatter burst + callout text.
   - In `Game.ts` (or optional `onMirrorDashWarp` / `mirrorRifts?: MirrorRift[]` on `Player.update`): when Mirage `Dash`es through an active `MirrorRift`, trigger **Mirror Warp** (teleport behind nearest enemy or to another active `MirrorRift`, leave glass-shatter afterimages, refund partial `dashCooldown` / `cryoCooldown`, and emit callout text).
   - Set `proj.reflected = true` when a `MirrorRift` reflects an enemy projectile in `Game.ts:1355`.
3. **Verification Plan**:
   - Sync `src/` -> `/data/user/0/com.agy/files/stickman-build/src` and run:
     - `rules.test.ts` (17/17+)
     - `node node_modules/vite/bin/vite.js build` (exit 0)
     - Static zero-`shadowBlur` check across `src/`
     - `node tests/e2e/run-e2e.mjs --r3` (15/15+)
     - New dedicated Mirage / Domain Expansion / MirrorRift / `save/restore === 0` / zero-NaN E2E test file (or suite in `tests/e2e/`) verifying all 4 acceptance criteria in `ORIGINAL_REQUEST.md` Follow-up `2026-11-26T11:13:35Z`.

---

## 5. Verification Method

To independently verify all claims in this survey:
1. Inspect files cited above: `src/game/PeriodicTableBG.ts`, `src/game/stages.ts`, `src/game/Game.ts`, `src/game/Player.ts`, `src/game/Entities.ts`, `src/game/UltimateCutscene.ts`, `src/game/animation.ts`, `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/types.ts`, `src/App.tsx`, `src/components/GameHUD.tsx`, `src/components/TouchControls.tsx`, `tests/e2e/run-e2e.mjs`, `tests/e2e/helpers/mockCanvas.ts`, `tests/e2e/helpers/testHarness.ts`, `tests/e2e/r3_inkwash.e2e.test.ts`, `tests/e2e/tier1_features.e2e.test.ts`.
2. Run baseline unit tests in the mirror directory:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
   (Verified: 17/17 pass.)
3. Run baseline R3 suite in workspace:
   ```bash
   node tests/e2e/run-e2e.mjs --r3
   ```
   (Verified: 15/15 pass.)
4. Invalidation conditions: Any edit to `src/` before syncing `/data/user/0/com.agy/files/stickman-build/src`, or changes to `PeriodicTableBG.update` / `Player.update` required-parameter signatures that break `testHarness.ts`.
