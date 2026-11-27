# Handoff Report — Worker M1 (R1: Full-Screen Domain "LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU")

## 1. Observation

### 1.1 Reference Inspection (`chrono_sovereign`)
Before editing, `chrono_sovereign` / `chronoDomainBlend` / `renderChronoDomain` was inspected across `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, and `src/game/Game.ts`:
- `src/game/types.ts:5`: `DomainKind` previously held `'none' | 'mirage' | 'chrono'`.
- `src/components/GameHUD.tsx:363-401`: `hud-domain-badge` rendered binary styling (`'chrono'` vs `'mirage'`).
- `src/game/PeriodicTableBG.ts:111-203, 322-345, 577-739, 1158-1169, 1479-1691`: `chronoDomainBlend` drives `renderChronoDomainScreenBackdrop` (sky gradient, glow, flanking sky gears, giant Roman clockface, rising motes) and `renderChronoDomainWorld` (parallax background gears, 7 symmetrical pillars, edge barrier gates, `renderCombatMistBand`, reflective floor + 3D perspective elliptical floor dial at `GROUND_Y + 62`, player floor pool, horizon rim strokes, floating motes).
- `src/game/Game.ts`: `isChronoDomainOwner()` + `getDomainOwnerKind()` (`257-265`), reset hooks in `setCharacter` (`444-450`), `setSkin` (`485-491`), `enterTitleState` (`656-663`), `startMode` (`728-731`), and activations on `onRequestAwaken` (`12.5s`), Ultimate `onKanjiImpact` (`12.5s` overdrive / `10.0s` normal), and Ultimate `onComplete` (`Math.max(domainTimer, 10.0)`).

### 1.2 Changes Applied Across the 4 Owned Files
1. **`src/game/types.ts:5`**:
   - Extended `DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng'`.
2. **`src/components/GameHUD.tsx:363-416`**:
   - Added `'xuan_feng'` branch to `data-testid="hud-domain-badge"` with deep ink-jade background `bg-[#071112]/95`, border `#5eead4`, jade/gold box-shadow, title `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU` (`#f0fdfa` + `#5eead4`), and timer `#fde68a`.
3. **`src/game/PeriodicTableBG.ts`**:
   - Lines `113, 131, 137, 144-146, 177-218`: Added `xuanFengDomainBlend`, `resetDomain()` reset, `getDomainBlend()` max inclusion, `getXuanFengDomainBlend()`, and smooth exponential blending + `domainKind` resolution for `'xuan_feng'`.
   - Lines `360-375`: Dispatched `renderXuanFengDomainScreenBackdrop` when `xuanFengDomainBlend > 0.02`, and added `#5eead4` tint for `crimsonFlash` when `xuanFengDomainBlend > 0.35`.
   - Lines `777-1097`: Implemented `renderXuanFengDomainScreenBackdrop(ctx, viewW, viewH, blend)` featuring deep ink-night sky (`#050c0f` -> `#0c1b1e` -> `#112220`), jade/pale-gold atmospheric halo, distant misty mountain silhouette, swirling ink-wash clouds, flanking counter-rotating literary astrolabe rings, Giant Ink-Wash Sun-Moon & Classic Scripture Wheel (outer fine light rays & dashed gold rim; counter-rotating middle ring with 12 calligraphy glyphs `春・風・靜・禮・義・仁・智・信・文・雅・清・和`; inner thick-thin tapered Enso brush stroke with Sun-Moon core & cinnabar seal), and rising jade/pale-gold/peach-petal motes.
   - Lines `1524-1527`: Dispatched `renderXuanFengDomainWorld` in `renderWorld` when `xuanFengDomainBlend > 0.02`.
   - Lines `2054-2457`: Implemented `renderXuanFengDomainWorld(ctx, playerX, playerY, blend)` featuring slow-parallax background literary halos, 7 symmetrical architectural anchors (`[-90, 210, 520, 840, 1160, 1480, 1790]` alternating carved Jade Scholar Pillars and Vertical Hanging Calligraphy Scrolls `春風化雨` / `文雅清和` / `一氣浩然` with cinnabar seal stamps), upper-edge swaying bamboo branches & leaf clusters, jade-gold edge barrier gates, `renderCombatMistBand(ctx, '#071112', 0.25, '#5eead4')`, reflective ink-jade floor plane, 3D perspective Heaven-Earth formation ring at `GROUND_Y + 62` (3 concentric elliptical rings `[220, 440, 690]`, 12 slowly rotating radial lines, 12 Earthly Branches `子..亥` & tick marks in `#5eead4`/`#fde68a`), player floor light pool, horizon rim strokes, and 18 depth-parallax drifting peach blossom petals, bamboo leaves, and pale-gold/moonlight motes (dimmed near player `< 110px`).
4. **`src/game/Game.ts`**:
   - Lines `261-271`: Added `isXuanFengDomainOwner()` (`characterId === 'mactien' && skinId === 'xuan_feng_sage'`) and `'xuan_feng'` return in `getDomainOwnerKind()`.
   - Lines `451-453, 491-493, 659, 730`: Reset `mactienDomainBlend = 0` on `setCharacter`/`setSkin` (when not default `mactien`), `enterTitleState`, and `startMode` alongside existing `domainTimer = 0`, `activeDomainKind = 'none'`, and `this.bg.resetDomain()`.
   - Lines `1136-1142` and `3885-3895`: Gated `mactienDomainBlend` and `renderMacTienDomainBackdrop` to `this.characterId === 'mactien' && this.skinId !== 'xuan_feng_sage' && this.player.awakened` so `xuan_feng_sage` uses `PeriodicTableBG`'s full-screen Domain without stacking with `mactien:default`'s overlay.
   - Lines `1879-1888`: Activated `xuan_feng` Domain (`12.5s`) on `onRequestAwaken` with floating text `'BÀNH TRƯỚNG LÃNH ĐỊA · XUÂN PHONG VĂN MIẾU!'`.
   - Lines `3580-3582` and `3845-3847`: Activated `xuan_feng` Domain on Ultimate `onKanjiImpact` (`12.5s` overdrive / `10.0s` normal) and `onComplete` (`Math.max(this.domainTimer, 10.0)`).

### 1.3 Verification Results
- `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` (from `/data/user/0/com.agy/files/stickman-build`): exited with 24 errors in 4 unrelated/pre-existing files (`src/game/poses/chronoPoses.ts` [15], `tests/e2e/helpers/testHarness.ts` [6], `tests/e2e/r3_inkwash.e2e.test.ts` [2], `tests/e2e/tier1_features.e2e.test.ts` [1]); **0 errors** in `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, `src/game/Game.ts`, or `src/App.tsx`.
- Static `ctx.save()` / `ctx.restore()` balance check:
  - `src/game/PeriodicTableBG.ts`: `saves: 44, restores: 44, balanced: true, shadowBlurAssigns: 0`
  - `src/game/Game.ts`: `saves: 17, restores: 17, balanced: true, shadowBlurAssigns: 0`
- `grep_search` for `shadowBlur` across `src/`: 0 assignments (only comments noting no `shadowBlur`).
- `grep_search` for `performance.now` in `src/game/renderer/` and `src/game/PeriodicTableBG.ts`: 0 matches.

## 2. Logic Chain
1. Extending `DomainKind` (`src/game/types.ts:5`) and wiring `isXuanFengDomainOwner()` / `getDomainOwnerKind()` (`src/game/Game.ts:261-271`) integrates `mactien:xuan_feng_sage` into the same centralized `domainTimer` / `activeDomainKind` / `PeriodicTableBG` pipeline used by `mirage:void_shatterer` and `chrono:chrono_sovereign`.
2. Gating `mactienDomainBlend` (`Game.ts:1136-1142, 3885-3895`) ensures `mactien:default` keeps its subtle sumi-e awakening backdrop while `xuan_feng_sage` cleanly hands full-screen sky and world rendering over to `PeriodicTableBG` without visual stacking.
3. Because `PeriodicTableBG.getDomainBlend()` (`PeriodicTableBG.ts:137`) includes `xuanFengDomainBlend`, normal stage skies, biome pillars, wall grids, and periodic tables automatically fade out as `xuanFengDomainBlend` approaches `1`, and smoothly restore when `domainTimer` expires or `resetDomain()` is invoked on character/skin/title/mode resets.
4. `GameHUD.tsx:363-416` explicitly branches on `hud.domainKind === 'xuan_feng'`, preventing fallback to Mirage's `LÃNH ĐỊA: MA KÍNH HƯ KHÔNG` styling.

## 3. Caveats
- Excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) were neither read nor modified, and E2E / browser tests were not run per dispatch instructions.
- `tsc --noEmit` currently reports 24 pre-existing errors in `src/game/poses/chronoPoses.ts` and `tests/e2e/*` (untouched by Worker M1); all 4 files owned by Worker M1 compile with 0 TypeScript errors.
- Runtime visual verification in a live browser was not executed by this worker.

## 4. Conclusion
R1 Full-Screen Domain (`LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU`) is completely implemented for `mactien:xuan_feng_sage` across `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, and `src/game/Game.ts`, matching `chrono_sovereign`'s architectural depth, lifecycle triggers, reset hygiene, and Canvas 2D invariants (`0` `shadowBlur`, `0` `performance.now()` in `PeriodicTableBG.ts`, balanced `save/restore`).

## 5. Verification Method
1. Run TypeScript check from `/data/user/0/com.agy/files/stickman-build`:
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
   Verify zero errors in `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, and `src/game/Game.ts`.
2. Run static Canvas 2D invariant checks from `/data/user/0/com.agy/files/stickman-build`:
   ```bash
   node -e "const fs=require('fs'); for (const f of ['src/game/PeriodicTableBG.ts','src/game/Game.ts']) { const s=fs.readFileSync(f,'utf8'); console.log(f, (s.match(/ctx\.save\(/g)||[]).length, (s.match(/ctx\.restore\(/g)||[]).length, (s.match(/shadowBlur\s*=/g)||[]).length); }"
   ```
   Verify equal `save`/`restore` counts (`44/44` and `17/17`) and `0` `shadowBlur =` assignments.
3. Invalidation condition: if `mactien:xuan_feng_sage` displays Mirage's HUD text, stacks `renderMacTienDomainBackdrop`, fails to restore the stage after `domainTimer` expires or on character/skin switch, or emits TypeScript errors in the 4 owned files, the Domain integration is defective.
