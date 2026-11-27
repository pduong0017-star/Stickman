# Handoff Report — `explorer_r5_survey_3` (R5 Chrono Overhaul Survey)

**Summary**: Chrono's current draft is critically broken at runtime (`ReferenceError: ctx is not defined` in `Game.simulateStep`, `TypeError: this.activateDomainExpansion is not a function` on Ultimate), hijacks Mirage's **Ma Kính Hư Không Giới** domain (`isVoidShattererDomainOwner`), fails to freeze Bosses/Projectiles/MagicCircles/Hazards during Time Stop, lacks TemporalEcho Stickman rendering & history, lacks Time Stop arena filter & accumulated damage detonation, and has incomplete `skinVfx.ts`/`inkStyle.ts`/`animation.ts`/`TitleScreen.tsx` definitions. Test-wise, `rules.test.ts` (17/17) and `--r3` (15/15) pass; `--r4` passes 12/12 under `NODE_OPTIONS="--max-old-space-size=2048"` (OOMs at default 1120 MB heap); `--tier=1` fails 3/46 (`T1-F1-01/02/06`) due to hardcoded 18-skin count and missing `chrono:default.profileId`.

---

## 1. Observation

### 1.1 `PeriodicTableBG.ts` & `stages.ts` (Domain Expansion & Mirage Coupling)
- `src/game/PeriodicTableBG.ts:108-157`:
  - `PeriodicTableBG` has only one `private domainBlend = 0;` (`:111`), `resetDomain()` (`:127-129`), `getDomainBlend()` (`:131-133`), and `update(dt: number, awakened: boolean, domainActive = false): void` (`:140-157`).
  - `renderScreenBackdrop` (`:163-290`) blends out the normal biome sky using `normalFade = Math.max(0, 1 - d)` (`:212`) and calls `this.renderDomainScreenBackdrop(ctx, safeW, safeH, d)` (`:276-278`) when `d > 0.02`. Line `:284` tints crimsonFlash to `#f43f5e` when `d > 0.35`.
  - `renderWorld` (`:690-855`) blends out stage pillars/table/floor using `stageAlpha = Math.max(0, 1 - d)` (`:704`) and calls `this.renderDomainWorld(ctx, px, py, d)` (`:849-851`) when `d > 0.02`.
  - Both `renderDomainScreenBackdrop` (`:297-450`) and `renderDomainWorld` (`:863-1155`) render **only** Mirage's Ma Kính Hư Không Giới (void cracks, `#f43f5e`/`#38bdf8` monoliths, shattered reflective floor, floating glass shards). There is no Ancient Clock Tower (`Tháp Đồng Hồ Cổ Đại`) domain anywhere.
- `src/game/stages.ts:65-294`:
  - `STAGE_THEME_PALETTES` defines all 12 campaign `StageThemeId` biomes (`genesis_lab` through `chaos_abyss`). `PeriodicTableBG` preserves `this.stageTheme` untouched (`R4-R3-01` asserts `internals.bg.getStageTheme() === initialTheme`).

### 1.2 Chrono Hijacking Mirage & Broken Runtime Calls in `Game.ts`
- `src/game/Game.ts:170-172`:
  ```ts
  private isVoidShattererDomainOwner(): boolean {
    return (this.characterId === 'mirage' && this.skinId === 'void_shatterer') || (this.characterId === 'chrono' && this.skinId === 'chrono_sovereign');
  }
  ```
  - Because `isVoidShattererDomainOwner()` returns `true` for `chrono:chrono_sovereign`:
    - `Game.ts:950, 953`: drives `this.bg.update(dt, this.player.awakened, domainActive)` into Mirage's Ma Kính Hư Không Giới.
    - `Game.ts:1481-1491`: Awakening (`[O]`) on `chrono:chrono_sovereign` emits `'BÀNH TRƯỚNG LÃNH ĐỊA · MA KÍNH HƯ KHÔNG GIỚI!'` in `#f43f5e`.
    - `Game.ts:1660, 1664, 1672, 1739, 2912, 3244`: runs Mirage's `domainEmpowered` / inter-rift beam checks for Chrono too.
    - `Game.ts:3479, 3583, 3652`: sets `HudSnapshot.domainActive = true` with no domain kind discriminator.
- `src/game/Game.ts:2889-2891` (inside `activateScarletSheath` `onKanjiImpact` for `ch.id === 'chrono'`):
  ```ts
  if (this.skinId === 'chrono_sovereign') {
    this.activateDomainExpansion(isOverdrive ? 10.5 : 8.0);
  }
  ```
  - `grep_search` across `src/` confirms `activateDomainExpansion` is **not defined anywhere** on `Game` or any class — throws `TypeError: this.activateDomainExpansion is not a function`.
- `src/game/Game.ts:1938-1951` (inside `simulateStep()` under `if (this.player.activeHitbox)`):
  ```ts
  for (const echo of this.temporalEchoes) {
    ctx.save();
    ...
    ctx.restore();
  }
  ```
  - `ctx` does **not** exist in `simulateStep()`! Throws `ReferenceError: ctx is not defined` whenever any player attacks while `this.temporalEchoes.length > 0`.
  - Moreover, `this.temporalEchoes` is **never referenced** inside `Game.render()` (`Game.ts:3157-3473`).

### 1.3 Time Stop (`timeStopTimer`), Freeze Scope, Accumulated Damage & Visual Filter
- `src/game/Game.ts:1641-1657`:
  - `this.timeStopTimer -= worldDt;` ticks down by `worldDt` (which is `0.24 * dt` if `witchTimeTimer > 0`), rather than `dt`.
  - On expiry (`<= 0`), it only deals flat `enemy.isBoss() ? 95 : 140` damage (`:1652`) — it does **not** accumulate or detonate damage from Chrono's hits during Time Stop.
- Incomplete entity freeze during `this.timeStopTimer > 0`:
  - `Game.ts:2360` (regular enemies): `dt: this.timeStopTimer > 0 ? 0 : worldDt` — freezes `Enemy.update()` (`Enemy.ts:354-441`).
  - `Game.ts:2341` (Bosses): `enemy.updateBoss({ dt: worldDt, ... })` — **Bosses are NOT frozen!** (`Boss.ts:177-437` checks `dt` directly; passing `0` freezes Boss motion/timers/attacks cleanly, though `Boss.ts:237` phase-2 check & `:227` Fable check should also be guarded if `dt === 0` or `timeStopActive` so Boss doesn't enrage mid-freeze).
  - `Game.ts:2189` (Projectiles): `proj.update(proj.fromPlayer ? dt : worldDt)` — **Enemy projectiles are NOT frozen** and still collide/damage player at `:2304-2326`!
  - `Game.ts:2167` (MagicCircles): `mc.update(worldDt, this.particles)` — **MagicCircles are NOT frozen!**
  - `Game.ts:2107-2121` (StageHazards): `hz.update(worldDt, this.particles)` and `void_rift` pull use `worldDt` — **StageHazards are NOT frozen!**
  - `Game.ts:1343, 1360, 1375` (`pendingSpawns`, `hazardSpawnTimer`, `crystalSpawnTimer`) also tick with `worldDt`.
- `Game.ts:3361-3378`: `render()` renders a screen tint for `this.witchTimeTimer > 0`, but has **no screen-space Time Stop filter** for `this.timeStopTimer > 0`.

### 1.4 TemporalEcho (`[U]`), HUD/App/TitleScreen & Missing Chrono Visual/Registry Definitions
- `src/game/Player.ts:128-135, 513-520, 1457-1464` & `Game.ts:107, 1599-1640`:
  - `temporalEchoes` only stores `{ x, y, facing, damage, primaryColor, secondaryColor, life, maxLife, strikeTimer }` — no `pose`, `poseTime`, `walkPhase`, or `0.4s` pose/action history buffer, and is never drawn with `renderStickman`.
- `src/game/types.ts:310-311`, `src/App.tsx:69-70`, `src/components/GameHUD.tsx:194-213`:
  - `HudSnapshot` only has `domainActive?: boolean` and `domainTimeLeft?: number`.
  - `GameHUD.tsx:195-213` unconditionally renders `'LÃNH ĐỊA: MA KÍNH HƯ KHÔNG'` with `#f43f5e` border whenever `hud.domainActive` is true. No Time Stop HUD indicator exists.
- `src/components/TitleScreen.tsx:29-376`:
  - `CharacterPortraitSvg` only branches for `kuro`, `raijin`, `kagura`, `aether`, `valkyrie`, falling through to `zero`'s twin-dagger hood SVG (`:328-375`) for `chrono` (and `mirage`).
- `src/game/skinVfx.ts:607-654`:
  - `'chrono:default'` and `'chrono:chrono_sovereign'` are missing `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, and `auraTendrilSecondary`!
  - Both set `finisherParticleKind: 'rune'` (and `chrono_sovereign` sets `swingParticleKind: 'rune'`), which is **not** a member of `SkinParticleAccentKind` (`src/game/types.ts:50-60`).
- `src/game/renderer/inkStyle.ts:374-420`:
  - Missing `'chrono:default'` and `'chrono:chrono_sovereign'` in both `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES`.
- `src/game/animation.ts:185-384, 828-955`:
  - `getAwakenedVisualProfile` has no `case 'chrono':` (falls back to Kuro `'HUYẾT KIẾM MA VƯƠNG'`).
  - `getComboMoveForCharacter` has no `chrono` combo table (falls back to Kuro katana moves).
- `src/game/synergy.ts:152-196`:
  - `computeSynergyCooldownRefund` has no `'chrono'` branch (falls back to Kuro).
- `src/game/renderer/trails.ts:62-84`:
  - `inferCharacterForSkin` does not map `'chrono_sovereign'`, `'chrono_hand'`, or `'chrono_twin_hands'` to `'chrono'`.
- `src/game/UltimateCutscene.ts:163-200, 1645-1705`:
  - `renderScreen` uses `ctx.save()`/`ctx.restore()` without `try/finally`.
  - `renderTimeStop` draws only 1 spinning arc, 12 tick lines, and 2 straight clock-hand lines (no Roman numerals, gear teeth, or fracture climax).

### 1.5 E2E / Unit Tests & Mirror Build Directory (`/data/user/0/com.agy/files/stickman-build`)
- **Command results observed directly**:
  - `rules.test.ts` in `/data/user/0/com.agy/files/stickman-build`: **17/17 PASS** (`CHARACTER_ORDER.length === 8` already enforced at `src/game/rules.test.ts:140`).
  - `node node_modules/vite/bin/vite.js build` in `stickman-build`: **exit 0** in 9.48s (`dist/assets/index-PSVIab-_.js` 872.27 kB).
  - `node tests/e2e/run-e2e.mjs --r3`: **15/15 PASS** (uses `ALL_6_CHARACTERS` and `ALL_18_SKINS` in `testHarness.ts`).
  - `node tests/e2e/run-e2e.mjs --tier=1`: **43/46 PASS, 3 FAIL**:
    - `T1-F1-01` (`tier1_features.e2e.test.ts:46`): `22 !== 18` (`listAllSkinVfxProfiles()` returns 22 entries vs expected 18).
    - `T1-F1-02` (`tier1_features.e2e.test.ts:57`): `undefined !== 'chrono:default'` (`chrono:default.profileId` missing).
    - `T1-F1-06` (`tier1_features.e2e.test.ts:129`): `22 !== 18` (22 motifs vs expected 18).
  - `tests/e2e/tier2_boundaries.e2e.test.ts:69-93` (`T2-F1-05`): checks `listAllSkinVfxProfiles()` against `validKinds` (`spark..shard`) — will fail on Chrono's `'rune'`.
  - `node tests/e2e/run-e2e.mjs --r4`: **FAILED with V8 Heap OOM** (`FATAL ERROR: Ineffective mark-compacts near heap limit` — Node default `heap_size_limit` on this device is `1120 MB`).
  - `NODE_OPTIONS="--max-old-space-size=2048" node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec tests/e2e/r4_mirage.e2e.test.ts`: **12/12 PASS** (237.5s total; `R4-R3-01` 75.4s, `R4-R3-03` 109.2s).
- **Root cause of `--r4` OOM**:
  - `tests/e2e/helpers/mockCanvas.ts:738-856` (`RecordingContext2D`) pushes every tessellated `DrawCommand` into `this.commands[]` with no cap.
  - `r4_mirage.e2e.test.ts:481, 504, 535, 570` runs `85–355` frames per `createHeadlessGame()` test without calling `session.ctx.resetTrace()` mid-loop, retaining >200k `DrawCommand` objects (~1 GB) across `PeriodicTableBG.renderDomainWorld()` (75 glass tiles + monoliths + shards per frame).
- **Mirror build status (`/data/user/0/com.agy/files/stickman-build`)**:
  - `diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src` returned 0 diffs (`src/` is synced).
  - Project root `dist/` is stale (`Nov 26 19:32`, `index-BBUQT81k.js` / `index-BN_fpzIR.js`), while `stickman-build/dist/` has the latest build (`Nov 26 22:12`, `index-PSVIab-_.js`).

---

## 2. Logic Chain

1. **Why Chrono & Mirage collide**: `Game.ts:171` merged `chrono:chrono_sovereign` into `isVoidShattererDomainOwner()`, and `PeriodicTableBG.ts:111` has only a scalar `domainBlend` rendering Mirage's Void Mirror domain. Therefore, separating them requires adding a `DomainKind = 'none' | 'mirage' | 'chrono'` (or dual `mirageDomainBlend` / `chronoDomainBlend` in `PeriodicTableBG`), while keeping `PeriodicTableBG.update(dt, awakened, domainActive)` backward-compatible (`true` -> `'mirage'`) so `r4_mirage.e2e.test.ts:770-801` and `R4-R3-01..03` remain 100% green.
2. **Why `TemporalEcho` crashes immediately**: `Game.ts:1938-1951` puts `ctx.save()` inside `simulateStep()`, which has no `ctx` parameter, crashing on the first melee swing after `[U]`. Moving echo rendering into `Game.render()` using `renderStickman` + pose history resolves the crash and fulfills R2.
3. **Why Time Stop feels broken**: `Game.ts:2341`, `:2189`, `:2167`, `:2121` pass `worldDt` instead of `0` when `timeStopTimer > 0`, letting Bosses, bullets, magic circles, and hazards keep moving. Gating enemy-side updates on `this.timeStopTimer > 0 ? 0 : worldDt` (plus skipping enemy-projectile player collision while frozen, or freezing projectiles cleanly), ticking `timeStopTimer` in `dt`, accumulating hit damage per enemy in a `Map<number, number>`, and adding a screen-space clockwork filter in `Game.render()` fulfills R3.
4. **Why `--tier=1` fails 3/46**: `chrono` entries in `skinVfx.ts` are missing `profileId` (`T1-F1-02`), and `listAllSkinVfxProfiles()` returns all 22 entries while `tier1_features.e2e.test.ts:46, 129` asserts exact length `18` (`T1-F1-01`, `T1-F1-06`). Updating `tier1_features.e2e.test.ts` (or exposing `listCore18SkinVfxProfiles` / updating the assertions to include all roster skins, per orchestrator decision) and fixing `skinVfx.ts` (replacing `'rune'` with valid `'star'`/`'spark'` and adding `profileId`, `swingAuraSecondary`, `auraTendrilPrimary/Secondary`) fixes both Tier 1 and `T2-F1-05`.
5. **Why `--r4` OOMs unless given 2048MB**: Android Node defaults to `1120 MB` V8 heap. Setting `NODE_OPTIONS` `--max-old-space-size=2048` in `tests/e2e/run-e2e.mjs` (and calling `session.ctx.resetTrace()` periodically in multi-second `r5_chrono.e2e.test.ts` loops before asserting the final render window) prevents OOM without altering `RecordingContext2D` semantics for visual tests.

---

## 3. Caveats

- `tests/e2e/tier2_boundaries.e2e.test.ts`, `tier3_pairwise.e2e.test.ts`, `tier4_workloads.e2e.test.ts`, and `poses.e2e.test.ts` were inspected by source reading and grep rather than all being executed end-to-end (`--r3`, `--tier=1`, `--r4`, `rules.test.ts`, and `vite build` were executed directly).
- Chrono's weapon/headgear visual fidelity (`gear.ts:371-392`, `weapons.ts:379-417`) and `animation.ts` combo table were only spot-checked for symbols/fallbacks, as `explorer_r5_survey_1`/`2` cover character art, poses, and combat VFX in depth.
- For `T1-F1-01` / `T1-F1-06` (`22 !== 18`): this was an existing R4 drift (`20 !== 18`) now at `22 !== 18`. Confirm in the R5 plan whether `tier1_features.e2e.test.ts` should be updated to match the expanded roster (`ALL_22_SKINS` / `>= 18`) or `listAllSkinVfxProfiles()` should remain unchanged.

---

## 4. Conclusion (Actionable Recommendations & Contracts)

### 4.1 Mirage Separation & Ancient Clock Tower Domain Contract
- **`src/game/types.ts`**:
  - Add `export type DomainKind = 'none' | 'mirage' | 'chrono';`
  - Extend `HudSnapshot`:
    - `domainActive?: boolean;`
    - `domainKind?: DomainKind;`
    - `domainTimeLeft?: number;`
    - `timeStopActive?: boolean;`
    - `timeStopTimeLeft?: number;`
- **`src/game/PeriodicTableBG.ts`**:
  - Track `private mirageDomainBlend = 0;` and `private chronoDomainBlend = 0;` (plus `private domainKind: DomainKind = 'none'`).
  - Keep backward-compatible signature:
    `public update(dt: number, awakened: boolean, domainActive: boolean | DomainKind = false, domainKind?: DomainKind): void`
    - When `domainActive === true` and `domainKind` is omitted, target `mirageDomainBlend -> 1` (`R4-R5-02` & `r4_mirage.e2e.test.ts` stay 100% compatible).
    - When `domainActive === 'chrono'` or `domainKind === 'chrono'`, target `chronoDomainBlend -> 1` and `mirageDomainBlend -> 0`.
    - When `domainActive === false` or `'none'`, decay both blends toward `0`.
  - `getDomainBlend(): number` returns `Math.max(this.mirageDomainBlend, this.chronoDomainBlend)`. Add `getMirageDomainBlend(): number`, `getChronoDomainBlend(): number`, and `getDomainKind(): DomainKind`.
  - `resetDomain(): void` resets `mirageDomainBlend = 0`, `chronoDomainBlend = 0`, `domainKind = 'none'`.
  - Render **Tháp Đồng Hồ Cổ Đại** (`renderChronoDomainScreenBackdrop` + `renderChronoDomainWorld`) when `chronoDomainBlend > 0.02`: rotating giant bronze/gold clockwork gears, glowing sky Roman clock dial, ancient bronze-stone clock tower pillars, reflective brass/teal floor dial, floating golden time-dust motes — zero `shadowBlur`, `save/restore === 0`.
- **`src/game/Game.ts`**:
  - Fix `isVoidShattererDomainOwner()` to **strictly** `this.characterId === 'mirage' && this.skinId === 'void_shatterer'`.
  - Add `isChronoDomainOwner()`: `this.characterId === 'chrono' && this.skinId === 'chrono_sovereign'`.
  - Replace non-existent `this.activateDomainExpansion(...)` at `Game.ts:2890` with setting `this.domainTimer = isOverdrive ? 12.5 : 10.0; this.activeDomainKind = 'chrono';` (and set `'chrono'` on `chrono:chrono_sovereign` Awakening `[O]`, `'mirage'` on `mirage:void_shatterer` Awakening/Ultimate, `'none'` on character/skin switch when not matching owner or on reset).
- **`src/components/GameHUD.tsx` & `src/App.tsx`**:
  - Branch `data-testid="hud-domain-badge"` on `hud.domainKind === 'chrono'` to show `'LÃNH ĐỊA: THÁP ĐỒNG HỒ CỔ ĐẠI'` (`#f59e0b` / `#2dd4bf`), preserving `'LÃNH ĐỊA: MA KÍNH HƯ KHÔNG'` for Mirage.
  - Add `data-testid="hud-timestop-badge"` when `hud.timeStopActive` is true (`'NGƯNG ĐỌNG THỜI GIAN'`).
- **`src/components/TitleScreen.tsx`**:
  - Add dedicated `if (id === 'chrono')` SVG portrait in `CharacterPortraitSvg` (`:29-376`).

### 4.2 Time Stop (`[I]`) & TemporalEcho (`[U]`) Fixes
- **`Game.ts` Time Stop (`timeStopTimer`)**:
  - Tick `this.timeStopTimer` using `dt` (not `worldDt`).
  - Pass `this.timeStopTimer > 0 ? 0 : worldDt` to `Boss.updateBoss` (`:2341`), `Enemy.update` (`:2360`), enemy `Projectile.update` (`:2189`), `MagicCircle.update` (`:2167`), `StageHazard.update` (`:2121`), `void_rift` pull (`:2110-2118`), and spawn/hazard timers (`:1343, 1360, 1375`). Guard `Boss.ts:227, 237` when `dt <= 0` and skip enemy projectile damage checks while `this.timeStopTimer > 0`.
  - Add `private timeStopStoredDamage = new Map<number, number>();` cleared on `enterTitleState()`/`startMode()`/`timeStopTimer` start. Accumulate damage from Chrono's melee/echo/projectile hits during `timeStopTimer > 0`, and on expiry detonate all stored damage (+ base temporal fracture burst) simultaneously on alive enemies with shockwave + shatter particles + text.
  - Add screen-space Time Stop filter in `Game.render()` when `this.timeStopTimer > 0 && !this.cutscene.active` (teal/ancient-gold translucent wash + faint concentric Roman clock ring overlay, `save/restore` balanced, zero `shadowBlur`).
- **`Game.ts` TemporalEcho (`[U]`)**:
  - **Delete** `ctx.save()...ctx.restore()` from `simulateStep()` (`Game.ts:1938-1951`) immediately!
  - Record a ring buffer of Chrono's recent frames (`x`, `y`, `facing`, `pose`, `poseTime`, `walkPhase`, `attackStep`, `attackProgress`) and drive each `TemporalEcho` (`0.4s` delayed replay) both in `simulateStep()` (hit detection + Chrono mark application + accumulated Time Stop damage if active) and in `Game.render()` (`renderStickman` ghost in teal/gold + small Roman clock circle under feet).

### 4.3 `tests/e2e/r5_chrono.e2e.test.ts` & `run-e2e.mjs` Design
- **`tests/e2e/run-e2e.mjs`**:
  - Add `R5_SUITE = { label: 'R5 — Chrono Overhaul', file: 'tests/e2e/r5_chrono.e2e.test.ts' }`, `--r5` CLI option, and include `R5_SUITE` in default `--tier=all`.
  - Inject `--max-old-space-size=2048` into `NODE_OPTIONS` in `runSuite()` (`:175-179`) if not already present so `--r4` and `--r5` never hit the 1120 MB Android Node heap OOM.
- **`tests/e2e/helpers/testHarness.ts`**:
  - Add `ALL_8_CHARACTERS`, `CHRONO_SKINS`, `ALL_22_SKINS`, `ALL_22_MOTIFS` (additive exports, preserving `ALL_6_CHARACTERS` / `ALL_18_SKINS` / `ALL_20_SKINS` for R3/R4 tests).
- **`tests/e2e/r5_chrono.e2e.test.ts` test plan**:
  1. `R5-R1-01`: `SKIN_VFX_PROFILES['chrono:default']` & `'chrono:chrono_sovereign'` completeness (`profileId`, valid `SkinParticleAccentKind`, valid `ProjectileTheme`, distinct motifs/colors) + `getAwakenedVisualProfile('chrono', skinId)` non-fallback.
  2. `R5-R1-02`: `getSkinInkPalette('chrono', ...)` & `renderStickman` structural geometry distinctness (`extractGeometryMetrics`) between `chrono:default` and `chrono:chrono_sovereign` (normal, awakened, attacking).
  3. `R5-R1-03`: `TitleScreen` SSR renders Chrono SVG portrait & skins cleanly; `chrono` combo moveset & trails render without fallback.
  4. `R5-R2-01`: `[U]` `TemporalEcho` records real pose/skeleton data, renders via `Game.render()` without `ReferenceError`, and deals delayed (`0.4s`) follow-up slash damage to an enemy.
  5. `R5-R3-01`: `[I]` `UltimateCutscene` `renderTimeStop` renders cleanly (`save/restore === 0`, zero `NaN`), sets `timeStopTimer > 0` (`3.5s` normal / `4.2s` awakened), freezes both regular `Enemy` AND `Boss` AND enemy `Projectile`s, renders Time Stop arena filter, and detonates accumulated hit damage upon expiry.
  6. `R5-R4-01`: `chrono:chrono_sovereign` Awakening `[O]` and Ultimate `[I]` activate Chrono's **Tháp Đồng Hồ Cổ Đại** domain (`getChronoDomainBlend() > 0.5`, `getMirageDomainBlend() === 0`, `hud.domainKind === 'chrono'`), preserve `stageTheme`, and decay back near `0` on expiry (calling `ctx.resetTrace()` periodically in long loops).
  7. `R5-R4-02`: `chrono:default` NEVER activates Domain Expansion (`getDomainBlend() === 0`), and Mirage `void_shatterer` still activates `'mirage'` domain cleanly (`getMirageDomainBlend() > 0.5`, `getChronoDomainBlend() === 0`).
  8. `R5-R5-01`: Static scan (`0` `shadowBlur` in `src/`, `0` `performance.now()` in `src/game/renderer/`) + `PeriodicTableBG` headless transitions (`none` -> `chrono` -> `none`, `none` -> `mirage` -> `none`).

---

## 5. Verification Method

1. **Unit tests & Vite build (in mirror `/data/user/0/com.agy/files/stickman-build` after syncing `src/`)**:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   node node_modules/vite/bin/vite.js build
   ```
   Expected: `17/17` pass, `vite build` exits `0`. Also copy updated `dist/` back to `/storage/emulated/0/Antigravity/Stickman/dist`.
2. **E2E Regression + New R5 Suite**:
   ```bash
   node tests/e2e/run-e2e.mjs --r3
   node tests/e2e/run-e2e.mjs --r4
   node tests/e2e/run-e2e.mjs --r5
   node tests/e2e/run-e2e.mjs --tier=1
   node tests/e2e/run-e2e.mjs --tier=2
   ```
   Expected: `--r3` 15/15, `--r4` 12/12 (with 2048 MB heap in `run-e2e.mjs`), `--r5` 100% pass, `--tier=1` 46/46, `--tier=2` 46/46.
3. **Invalidation conditions**:
   - Any `shadowBlur` occurrence in `src/`, any `performance.now()` in `src/game/renderer/`, any `NaN` or unbalanced `save/restore` in `MockCanvas` traces, any regression in `r4_mirage.e2e.test.ts`, or `chrono:default` triggering `domainBlend > 0` invalidates completion.
