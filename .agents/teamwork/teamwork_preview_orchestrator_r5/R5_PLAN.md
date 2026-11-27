# Round 5 Plan: CHRONO ("Kiếm Sĩ Thời Gian") Comprehensive Overhaul

> Authoritative R5 scope, feature inventory, milestones, interface contracts, and exclusive file ownership derived from `ORIGINAL_REQUEST.md` (`Follow-up — 2026-11-26T15:21:21Z`) and Phase 0 Survey Reports (`explorer_r5_survey_1`, `explorer_r5_survey_2`, `explorer_r5_survey_3`).

## Architecture
- **Engine**: React 19 + Vite 8 + TypeScript + HTML5 Canvas 2D fixed-substep (`SIM_STEP = 1/120s`).
- **R1 — Ink-Wash Aesthetics & 2 Completely Distinct Skins (`default` vs `chrono_sovereign`)**:
  - Complete `CHARACTER_ROSTER.chrono` (`synergyHint`) and `CHARACTER_SKINS.chrono` (`chrono_sovereign` distinct codename/overrides) in `characters.ts`.
  - Complete `SKIN_VFX_PROFILES['chrono:default']` & `'chrono:chrono_sovereign'` in `skinVfx.ts` (`profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`, valid `SkinParticleAccentKind` `'spark'|'star'|'shard'`—no invalid `'rune'`, distinct `projectileTheme`).
  - Add dedicated `chrono` combat choreography (`ground` 1–6 with >=5 distinct poses & `0.35 < cancelRatio < 0.7`, `air` 1–3 with `air_3.unblockable`, `dash_slash`, `parry_counter`), `getAwakenedVisualProfile('chrono', skinId)`, and `computeSynergyCooldownRefund('chrono', ...)` so Chrono never falls back to Kuro.
  - Add `'chrono:default'` and `'chrono:chrono_sovereign'` to `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES` in `inkStyle.ts`.
  - Structurally differentiate `chrono:default` (clockmaker ink-wash coat, teal-bronze monocle/clock halo, beveled `chrono_hand` sabre) from Mythic `chrono:chrono_sovereign` (sovereign astrolabe crown & split gold-azure visor, imperial clocktower mantle & pauldrons, giant rotating antique gear/Roman halo back attachment, ornate `chrono_twin_hands` + offhand astrolabe/hand, awakened multi-ring clockwork wings & crown) in `gear.ts`, `weapons.ts`, and `StickmanRenderer.ts`.
  - Add Chrono trail styles (`'chrono_clockwork_slash' | 'chrono_sovereign_slash'`) and `chrono_clockwork` / `chrono_sovereign` motif & swing aura cases in `trails.ts` (Roman numerals `XII/III/VI/IX`, spinning gears, clock rays).
  - Add dedicated `'chrono'` SVG portrait in `TitleScreen.tsx` (`CharacterPortraitSvg`).
- **R2 — `[U]` `TemporalEcho` Full Stickman Skeleton & 0.4s Delayed Follow-Up**:
  - Create `export class TemporalEcho` in `Entities.ts` storing pose/skeleton replay state (`x`, `y`, `facing`, `pose`, `poseTime`, `walkPhase`, `skinId`, `awakened`, `strikeQueue`) and rendering a complete translucent teal-bronze Stickman via `renderStickman` with a rotating miniature Roman clock aura underfoot.
  - Record Chrono's rolling pose/position/facing history (`0.4s` buffer) and melee attack events in `Player.ts` / `Game.ts`, replaying attacks accurately `0.4s` later (applying `chrono` Temporal Marks, emitting clockwork trails, and contributing to Time Stop accumulated damage).
  - Remove the runtime-crashing `ctx.save()` block inside `Game.simulateStep()` (`Game.ts:1938-1951`) and render all `TemporalEcho`s properly in `Game.render()`.
- **R3 — `[I]` Global Time Stop (`3.5s` / `4.2s` Awakened) & Accumulated Damage Detonation**:
  - Upgrade `UltimateCutscene.renderTimeStop` with concentric counter-rotating gears, 12 Roman numerals (`I`–`XII`), beveled hands reversing, `chrono_sovereign` gold-azure tower framing, `colorWithAlpha` (replacing `${hex}XX`), and `try/finally` around `ctx.save()`.
  - Fix `Game.ts` Time Stop trigger: move outside `for (const enemy of this.enemies)` loop, remove nonexistent `this.activateDomainExpansion()`, tick `timeStopTimer` on `dt`, freeze Bosses (`Boss.updateBoss`), regular `Enemy`, enemy `Projectile`s (skipping frozen projectile hits), `MagicCircle`s, `StageHazard`s, and pending spawns.
  - Accumulate damage dealt by Chrono (and `TemporalEcho`) during `timeStopTimer > 0` in `timeStopStoredDamage` and detonate all stored damage simultaneously on expiry with Time-Shatter shockwaves and `'VỠ THỜI GIAN!'` callout.
  - Render a screen-space Time Stop arena filter (teal/ancient-gold wash + Roman clock dial overlay) in `Game.render()`.
- **R4 — Exclusive Ancient Clock Tower Domain (`chrono:chrono_sovereign` only)**:
  - Strictly separate `isVoidShattererDomainOwner()` (`mirage:void_shatterer` only) from `isChronoDomainOwner()` (`chrono:chrono_sovereign` only). `chrono:default` NEVER changes the map.
  - Extend `PeriodicTableBG.ts` with `DomainKind = 'none' | 'mirage' | 'chrono'`, separate `mirageDomainBlend` & `chronoDomainBlend`, backward-compatible `update(dt, awakened, domainActive, domainKind?)`, and **Tháp Đồng Hồ Cổ Đại** (`renderChronoDomainScreenBackdrop` + `renderChronoDomainWorld`: giant rotating gears, sky Roman clock dial, ancient clocktower pillars, golden time-dust motes, smooth reversion to `stageTheme`).
  - Extend `HudSnapshot` with `domainKind`, `timeStopActive`, `timeStopTimeLeft`; branch `GameHUD.tsx` badges cleanly.
- **R5 — Android Canvas 2D Safety, Verification & Build**:
  - Zero `ctx.shadowBlur` in `src/`.
  - Zero `performance.now()` in `src/game/renderer/`.
  - Balanced `ctx.save()` / `ctx.restore() === 0` (`try/finally` on all new/updated canvas blocks) and zero `${hex}XX` in `src/game/`.
  - Sync `src/` -> `/data/user/0/com.agy/files/stickman-build/src`, run `rules.test.ts` (17/17), `r4_mirage.e2e.test.ts` (12/12), new `r5_chrono.e2e.test.ts`, `--r3`, `--tier=1`, `--tier=2`, and `vite build` (exit 0), syncing `dist/`.

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| R5-F1 | Chrono Types, Roster, SkinVfx, Synergy & Dedicated Moveset | `DomainKind` & `HudSnapshot` in `types.ts`; `synergyHint` & `chrono_sovereign` overrides in `characters.ts`; complete `skinVfx.ts` profiles (valid particle kinds); `synergy.ts` `'chrono'` refund; dedicated `animation.ts` Chrono moveset & awakened profile; Chrono `SlashTrailStyle` & clockwork trails/motifs in `trails.ts`. | M1A | survey_1, survey_2 |
| R5-F2 | Chrono Ink-Wash Palettes, Mythic `chrono_sovereign` Gear, Weapons, Renderer & Portrait | `inkStyle.ts` `'chrono:default'` & `'chrono:chrono_sovereign'` palettes; `gear.ts` distinct `chrono_sovereign` crown/visor/mantle/back-gears & awakened forms; `weapons.ts` skin-branched `chrono_hand`/`chrono_twin_hands` + `renderOffhandChronoHand`; `StickmanRenderer.ts` Chrono aura & offhand; `TitleScreen.tsx` Chrono SVG portrait. | M1B | survey_1, survey_2 |
| R5-F3 | `TemporalEcho` Entity, Ancient Clocktower BG, `renderTimeStop` Cutscene, HUD & Boss Guard | `Entities.ts` `TemporalEcho` class (`renderStickman` teal-bronze afterimage + underfoot clock aura); `PeriodicTableBG.ts` Tháp Đồng Hồ Cổ Đại (`chronoDomainBlend`) separated from Mirage; `UltimateCutscene.ts` upgraded Roman clock `renderTimeStop` & `colorWithAlpha` fixes; `GameHUD.tsx` & `App.tsx` badges; `Boss.ts` freeze guard for `dt <= 0`. | M2A | survey_2, survey_3 |
| R5-F4 | Player Pose/Attack Recording, `Game.ts` TimeStop/Domain/Echo Wiring & Bug Fixes | `Player.ts` pose/attack history buffer, Chrono Skill-Link & swing flair; `Game.ts` delete `ctx.save()` crash in `simulateStep`, fix `activateDomainExpansion` crash & post-loop TimeStop trigger, freeze Boss/Enemy/Projectiles/Hazards/MagicCircles/Spawns, accumulate & detonate TimeStop damage, TimeStop arena filter, render/replay `TemporalEcho`s, separate Mirage vs Chrono domains. | M2B | survey_1, survey_2, survey_3 |
| R5-F5 | R5 Chrono E2E Test Suite & Harness Fixes | `tests/e2e/r5_chrono.e2e.test.ts` verifying R1–R5; `tests/e2e/run-e2e.mjs` `--r5` + `NODE_OPTIONS` 2048MB heap guard; `tests/e2e/helpers/testHarness.ts` Chrono helpers; `tests/e2e/tier1_features.e2e.test.ts` 22-skin alignment. | E2E | survey_3 |
| R5-F6 | Mirror Sync, Vite Production Build, Full Test Run & Gate Audit | Sync to `/data/user/0/com.agy/files/stickman-build`, `rules.test.ts` 17/17, `r4_mirage.e2e.test.ts` 12/12, `r5_chrono.e2e.test.ts` 100%, `vite build` exit 0, sync `dist/`, Reviewers + Challengers + Forensic Auditor. | M2B / Gate | survey_1, survey_2, survey_3 |

## Milestones & Waves

| Wave | Agent / Milestone | Scope (Exclusive Ownership) | Dependencies |
|------|-------------------|-----------------------------|--------------|
| Wave 1 | `worker_r5_m1a` (**M1A**) | `src/game/types.ts`, `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/synergy.ts`, `src/game/animation.ts`, `src/game/renderer/types.ts`, `src/game/renderer/trails.ts` | none |
| Wave 1 | `worker_r5_m1b` (**M1B**) | `src/game/renderer/inkStyle.ts`, `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`, `src/game/StickmanRenderer.ts`, `src/components/TitleScreen.tsx` | none |
| Wave 1 | `test_writer_r5_e2e` (**E2E**) | `tests/e2e/r5_chrono.e2e.test.ts`, `tests/e2e/run-e2e.mjs`, `tests/e2e/helpers/testHarness.ts`, `tests/e2e/tier1_features.e2e.test.ts` | none (uses R5_PLAN contracts) |
| Wave 2a | `worker_r5_m2a` (**M2A**) | `src/game/Entities.ts`, `src/game/PeriodicTableBG.ts`, `src/game/UltimateCutscene.ts`, `src/components/GameHUD.tsx`, `src/App.tsx`, `src/game/Boss.ts` | M1A, M1B |
| Wave 2b | `worker_r5_m2b` (**M2B**) | `src/game/Player.ts`, `src/game/Game.ts` + Mirror Sync + `vite build` + Unit/E2E test execution | M1A, M1B, M2A, E2E |
| Wave 3 | **Gate** (`reviewer_r5_1`, `reviewer_r5_2`, `challenger_r5_1`, `challenger_r5_2`, `auditor_r5_1`) | Independent code review, adversarial empirical tests, forensic integrity audit | Wave 2b |

## Interface Contracts

### 1. `src/game/types.ts` & `src/game/renderer/types.ts` (M1A owns)
- `src/game/types.ts`:
  - `export type DomainKind = 'none' | 'mirage' | 'chrono';`
  - Extend `HudSnapshot` with optional fields:
    - `domainActive?: boolean;`
    - `domainKind?: DomainKind;`
    - `domainTimeLeft?: number;`
    - `timeStopActive?: boolean;`
    - `timeStopTimeLeft?: number;`
- `src/game/renderer/types.ts`:
  - Extend `SlashTrailStyle`: add `'chrono_clockwork_slash' | 'chrono_sovereign_slash'`.

### 2. `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/synergy.ts`, `src/game/animation.ts` (M1A owns)
- `CHARACTER_ROSTER.chrono.skills.synergyHint`: non-empty Vietnamese string.
- `SKIN_VFX_PROFILES['chrono:default']` & `'chrono:chrono_sovereign'`:
  - Must populate `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`.
  - Must use valid `SkinParticleAccentKind` (`'spark'`, `'star'`, `'shard'`) — NO `'rune'`.
- `computeSynergyCooldownRefund('chrono', detonatedCount)`: dedicated Chrono refund curve.
- `getAwakenedVisualProfile('chrono', skinId)`: dedicated profiles for `'default'` and `'chrono_sovereign'` (NOT Kuro fallback).
- `getComboMoveForCharacter('chrono', step, context)`:
  - `ground` 1–6: `>= 5` distinct poses, `0.35 < cancelRatio < 0.7`, Chrono trailStyle (`'chrono_clockwork_slash'` / `'chrono_sovereign_slash'`).
  - `air` 1–3: `air_3.unblockable === true`.
  - `dash_slash`: `lungeSpeed >= 500`, `afterimages: true`.
  - `parry_counter`: `unblockable: true`.

### 3. `src/game/renderer/inkStyle.ts`, `gear.ts`, `weapons.ts`, `StickmanRenderer.ts` (M1B owns)
- `SKIN_INK_PALETTES['chrono:default']`, `SKIN_INK_PALETTES['chrono:chrono_sovereign']`, and corresponding `AWAKENED_BASE_OVERRIDES`.
- `gear.ts`: `inferCharacterFromSkin('chrono_sovereign') === 'chrono'`; distinct geometry in `renderHeroHeadGear('chrono_gear', ...)`, `getArmorSpec`/`renderSkinBodyArmor`, `renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`.
- `weapons.ts`: `chrono_hand` & `chrono_twin_hands` branched on `skinId === 'chrono_sovereign'` using `safeTime` (zero `performance.now()`); export `renderOffhandChronoHand(...)` called by `StickmanRenderer.ts`.
- `StickmanRenderer.ts`: `renderDarkInkAura` Chrono/Sovereign Roman clock dial ground aura.

### 4. `src/game/Entities.ts` — `TemporalEcho` (M2A owns)
- `export interface TemporalPoseSnapshot { time: number; x: number; y: number; facing: 1 | -1; pose: StickPoseName; poseTime: number; walkPhase: number; }`
- `export interface TemporalEchoStrike { triggerTime: number; x: number; y: number; facing: 1 | -1; pose: StickPoseName; poseTime: number; damage: number; reach: number; heavy: boolean; trailColor: string; trailAccent: string; }`
- `export class TemporalEcho`:
  - Properties: `x`, `y`, `facing: 1 | -1`, `pose: StickPoseName`, `poseTime`, `walkPhase`, `skinId: SkinId`, `awakened: boolean`, `primaryColor`, `secondaryColor`, `age: number`, `life: number`, `maxLife: number`, `delay: number` (`0.4`), `pendingStrikes: TemporalEchoStrike[]`, `active: boolean`.
  - `queueStrike(strike: TemporalEchoStrike): void`
  - `update(dt: number, sample?: TemporalPoseSnapshot): TemporalEchoStrike[]` (returns strikes whose `triggerTime <= this.age` / elapsed delay `>= 0.4s`)
  - `render(ctx: CanvasRenderingContext2D): void` — renders miniature underfoot clock aura + full translucent Stickman (`renderStickman`) with `try/finally`, zero `shadowBlur`.

### 5. `src/game/PeriodicTableBG.ts` — Domain Separation (M2A owns)
- Backward-compatible signature:
  `public update(dt: number, awakened: boolean, domainActive: boolean | DomainKind = false, domainKind?: DomainKind): void`
  - `domainActive === true` (without `domainKind`) -> `'mirage'` (preserves `r4_mirage.e2e.test.ts` 100%).
  - `domainActive === 'chrono'` or `domainKind === 'chrono'` -> `'chrono'`.
  - `false` / `'none'` -> decays both blends toward `0`.
- `getDomainBlend(): number` -> `Math.max(this.mirageDomainBlend, this.chronoDomainBlend)`.
- `getMirageDomainBlend(): number`, `getChronoDomainBlend(): number`, `getDomainKind(): DomainKind`, `resetDomain(): void`.
- Renders **Tháp Đồng Hồ Cổ Đại** when `chronoDomainBlend > 0.02`; **Ma Kính Hư Không Giới** when `mirageDomainBlend > 0.02`; preserves `stageTheme` untouched.

### 6. `src/game/Player.ts` & `src/game/Game.ts` (M2B owns)
- `Player`: records rolling `TemporalPoseSnapshot` ring buffer (`~0.8s`), emits `TemporalEchoStrike` events on melee swings (`delay = 0.4s`), implements `chrono` Skill-Link (`NHỊP ĐỒNG HỒ TRẢM` + `onDetonateAllMarks('chrono', ...)`), clockwork swing flair, and Awakened melee perks.
- `Game`:
  - `isVoidShattererDomainOwner()` strictly `mirage:void_shatterer`; `isChronoDomainOwner()` strictly `chrono:chrono_sovereign`.
  - Exposes `temporalEchoes: TemporalEcho[]`, `timeStopTimer: number`, `activeDomainKind: DomainKind`, `timeStopStoredDamage` (internal/inspectable via `getTestInternals()` if helpful for tests).
  - Time Stop (`3.5s` / `4.2s` Awakened): freezes Bosses, Enemies, enemy Projectiles, MagicCircles, StageHazards, Spawns; accumulates hit damage; detonates on expiry; renders Time Stop arena filter in `Game.render()`.

## Invariants (DO NOT MODIFY)
- `src/game/rules.ts`, `src/game/rules.test.ts`, `src/game/poses/*` (unless explicitly required — do NOT touch!).
- Do NOT regress `tests/e2e/r4_mirage.e2e.test.ts` (must remain 12/12 PASS).
