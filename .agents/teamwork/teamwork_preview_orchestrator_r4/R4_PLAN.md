# Round 4 Plan: Mirage ("Ảnh Kính Hư Không") Comprehensive Overhaul

> Authoritative R4 scope, feature inventory, milestones, interface contracts, and exclusive file ownership derived from `ORIGINAL_REQUEST.md` (`Follow-up — 2026-11-26T11:13:35Z`) and Phase 0 Survey Reports (`survey_1`, `survey_2`, `survey_3`).

## Architecture
- **Engine**: React 19 + Vite 8 + TypeScript + HTML5 Canvas 2D fixed-substep (`SIM_STEP = 1/120s`).
- **R1 — Glass/Mirror Combat Choreography & VFX**:
  - Replace Mirage's Kuro-fallback moveset with a dedicated Mirage glass/mirror combo table in `animation.ts` (`ground` 1–6, `air` 1–3, `dash_slash`, `parry_counter`) using non-sword trail styles (`'mirror_fracture'`, `'void_prism_fracture'`).
  - Eliminate all circular/katana `slashArc` sword trails, curved `emitSlashBeam` sword smears, and circular `joints.motionArc` strokes for Mirage; replace with sharp spatial fractures, polygonal mirror shard volleys, prismatic reflection flashes, and glass-shatter impact sparks.
  - Complete `'mirage:default'` and `'mirage:void_shatterer'` profiles in `skinVfx.ts` and add `'mirage'` branches in `synergy.ts` and `Player.ts` Skill-Link.
- **R2 — Mythic Skin `Ma Kính (void_shatterer)` Ink-Wash Redesign**:
  - Add `'mirage:default'` and `'mirage:void_shatterer'` to `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES` in `inkStyle.ts`, and `case 'mirage':` to `getAwakenedVisualProfile` in `animation.ts`.
  - Structurally differentiate `mirage:void_shatterer` from `mirage:default` in `gear.ts` and `weapons.ts`: obsidian shattered Demon-Mirror mask & horned prism crown (`renderHeroHeadGear`), tattered void-cloak with faceted prism pauldrons & chest rift (`getArmorSpec` + `renderSkinBodyArmor`), multi-ring floating mirror-shard halo & winged obsidian/crimson-cyan mirror blades (`renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`), and skin-branched beveled ink-wash weapons (`mirror_shards`, `void_prism_scythe`) using `safeTime` (zero `performance.now()`).
  - Add Mirage/Void Shatterer ink-wash crystal ground aura in `StickmanRenderer.ts` (`renderDarkInkAura`) and suppress circular `motionArc` for Mirage.
- **R3 — Exclusive Domain Expansion (`mirage:void_shatterer` only)**:
  - `Game.ts` tracks `domainTimer` (12.5s), activated **exclusively** when `characterId === 'mirage' && skinId === 'void_shatterer'` triggers Awakening (`[O]`) or completes/impacts Rage Ultimate (`[I]`). `mirage:default` and all other characters NEVER trigger Domain Expansion.
  - `PeriodicTableBG.update(dt, awakened, domainActive = false)` smoothly interpolates `domainBlend` (`0..1`), transforming the arena into **Ma Kính Hư Không Giới** (polygonal fractured sky, floating black-red-cyan mirror monoliths, shattered reflective floor, floating glass shards, suppressing the chemical periodic table), then smoothly reverting to `stageTheme` on expiration.
  - During Domain Expansion, active `MirrorRift`s are empowered (expanded reflection radius, higher shatter/pulse damage, inter-rift void-mirror beams damaging and marking enemies).
- **R4 — Active `MirrorRift` (`[U]`) Interactions**:
  - **Attack (`[J]`) Shatter**: Hitting an active `MirrorRift` with a melee hitbox (`lastHitboxId` dedup) shatters the rift into piercing `'mirror_shard'` projectiles aimed at the nearest alive enemy (plus radial burst AoE) and emits `'PHÁ KÍNH BÃO MẢNH!'` callout.
  - **Dash (`Dash`) Mirror Warp**: Dashing through an active `MirrorRift` (`warpCooldown <= 0`) warps Mirage behind the nearest alive enemy (or to another active `MirrorRift`), spawns glass-shatter afterimages + shards, refunds brief dash/special cooldown, and emits `'DỊCH CHUYỂN GƯƠNG!'` callout.
- **R5 — Android Canvas 2D Compliance & Verification**:
  - Zero `ctx.shadowBlur` anywhere in `src/`.
  - Every `ctx.save()` paired in `try { ... } finally { ctx.restore(); }` (`save/restore === 0` net delta), zero `NaN`/`Infinity`, zero `performance.now()` in `renderer/`.
  - Sync `src/` -> `/data/user/0/com.agy/files/stickman-build/src`, pass `rules.test.ts` (17/17), `run-e2e.mjs --r3` (15/15), new `run-e2e.mjs --r4` suite, and `vite build` (exit 0).

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| R4-F1 | Mirage Glass/Mirror Moveset, Awakened Profile, VFX & Synergy | Dedicated `mirage` combo table (`ground` 1–6, `air` 1–3, `dash_slash`, `parry_counter`), `getAwakenedVisualProfile('mirage')`, complete `skinVfx.ts` entries, `synergy.ts` refund. | M1A | survey_1, survey_2 |
| R4-F2 | Polygonal Mirror Trails & Fracture Ornaments | Add `'mirror_fracture' \| 'void_prism_fracture'` to `SlashTrailStyle`; implement `mirror_shatter` / `void_prism` motifs & spatial-fracture rendering in `trails.ts` (zero sword arcs). | M1A | survey_1 |
| R4-F3 | Mirage Ink-Wash Palettes & Mythic `void_shatterer` Geometry | `inkStyle.ts` Mirage palettes; `gear.ts` distinct `void_shatterer` Demon-Mirror mask, cloak/pauldrons, floating mirror-shard halo/ring & awakened forms; `weapons.ts` skin-branched `mirror_shards` & `void_prism_scythe` (`safeTime`); `StickmanRenderer.ts` Mirage aura & non-arc motion. | M1B | survey_2 |
| R4-F4 | Ma Kính Hư Không Giới Domain Background & HUD | `PeriodicTableBG.ts` `domainBlend` + fractured sky, obsidian-red-cyan monoliths, shattered reflective floor, floating shards, smooth reversion; `HudSnapshot` + `GameHUD.tsx` indicator; `UltimateCutscene.ts` `colorWithAlpha` fix. | M2A | survey_3 |
| R4-F5 | `MirrorRift` Empowerment & Piercing `'mirror_shard'` Projectile | Extend `MirrorRift` (`lastHitboxId`, `warpCooldown`, `domainEmpowered`, enhanced visuals) and add `'mirror_shard'` projectile kind & renderer in `Entities.ts`. | M2A | survey_1, survey_3 |
| R4-F6 | Mirage Attack VFX, Domain Trigger & Active `MirrorRift` `[J]`/`Dash` Gameplay | Wire Mirage glass/shard combat VFX & Skill-Link in `Player.ts`; wire `void_shatterer`-only Domain timer, inter-rift mirror beams, `[J]` rift shatter, `Dash` Mirror Warp, `proj.reflected = true`, and lifecycle cleanup in `Game.ts`. | M2B | survey_1, survey_3 |
| R4-F7 | Automated R4 E2E & Headless Render Verification Suite | Create `tests/e2e/r4_mirage.e2e.test.ts` + wire `--r4` in `tests/e2e/run-e2e.mjs` + helpers in `testHarness.ts` covering R1, R2, R3, R4, R5 (`save/restore === 0`, zero `NaN`, zero `shadowBlur`). | E2E | survey_3 |
| R4-F8 | Final Integrated Build, Mirror Sync, Test Run & Forensic Audit | Sync `src/` & `tests/` to `/data/user/0/com.agy/files/stickman-build`, pass `rules.test.ts` 17/17, `--r3` 15/15, `--r4`, `vite build`, static zero-`shadowBlur`, and Forensic Audit. | M3 | survey_2, survey_3 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M1A | Mirage Moveset, VFX Profiles & Mirror Trails | `animation.ts`, `skinVfx.ts`, `synergy.ts`, `renderer/types.ts`, `renderer/trails.ts` (R4-F1, R4-F2) | none | PLANNED |
| M1B | Mythic `void_shatterer` Skin, Gear, Weapons & Renderer | `renderer/inkStyle.ts`, `renderer/gear.ts`, `renderer/weapons.ts`, `StickmanRenderer.ts` (R4-F3) | none | PLANNED |
| M2A | Domain Expansion Arena BG, HUD & `MirrorRift` Entity | `PeriodicTableBG.ts`, `Entities.ts`, `types.ts`, `App.tsx`, `GameHUD.tsx`, `UltimateCutscene.ts` (R4-F4, R4-F5) | none | PLANNED |
| E2E | R4 Automated E2E & Headless Verification Suite | `tests/e2e/r4_mirage.e2e.test.ts`, `tests/e2e/run-e2e.mjs`, `tests/e2e/helpers/testHarness.ts`, `TEST_READY.md` (R4-F7) | none | PLANNED |
| M2B | Mirage Combat VFX, Domain Trigger & Rift Interactions | `Player.ts`, `Game.ts` (R4-F6) | M1A, M1B, M2A | PLANNED |
| M3 | Final Integration, Mirror Sync, Vite Build & Gate | Mirror sync + `rules.test.ts` + `--r3` + `--r4` + `vite build` + Reviewer/Challenger/Forensic Auditor (R4-F8) | M1A, M1B, M2A, E2E, M2B | PLANNED |

## Interface Contracts

### 1. `src/game/renderer/types.ts` (M1A owns)
- Extend `SlashTrailStyle`:
  ```ts
  export type SlashTrailStyle =
    | 'arc'
    | 'heavy_cleave'
    | 'spear_thrust'
    | 'spear_flurry'
    | 'twin_x'
    | 'iaido_line'
    | 'mirror_fracture'
    | 'void_prism_fracture';
  ```

### 2. `src/game/animation.ts` & `src/game/skinVfx.ts` (M1A owns)
- `getComboMoveForCharacter('mirage', step, context)`:
  - `ground` steps `1..6`: `>= 5` distinct pose names, `0.35 < cancelRatio < 0.7`, `trailStyle: 'mirror_fracture'` (or `'void_prism_fracture'`), all `slashArcs[].style` MUST be `'mirror_fracture'` or `'void_prism_fracture'` (never `'arc'` or `'iaido_line'`).
  - `air` steps `1..3`: `air_3.unblockable === true`, `trailStyle: 'mirror_fracture'`.
  - `dash_slash`: `lungeSpeed >= 500`, `afterimages: true`, `trailStyle: 'mirror_fracture'`.
  - `parry_counter`: `unblockable: true`, `trailStyle: 'mirror_fracture'`.
- `getAwakenedVisualProfile('mirage', skinId)`:
  - Dedicated profiles for `'default'` (`formTitle: 'ẢNH KÍNH HƯ KHÔNG'`, `scarfPrimary: '#6366f1'`, `scarfHighlight: '#f1f5f9'`, `transformationCallout: 'THỨC TỈNH: HƯ KHÔNG KÍNH GIỚI!'`) and `'void_shatterer'` (`formTitle: 'MA KÍNH HƯ KHÔNG'`, `scarfPrimary: '#be123c'`, `scarfHighlight: '#38bdf8'`, `transformationCallout: 'THỨC TỈNH: MA KÍNH HƯ KHÔNG!'`).
- `SKIN_VFX_PROFILES['mirage:default']` & `'mirage:void_shatterer'`:
  - Include `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`, and valid `projectileTheme` (`'void'` for `default`, `'blood_moon'` for `void_shatterer`).

### 3. `src/game/PeriodicTableBG.ts` (M2A owns)
- `update(dt: number, awakened: boolean, domainActive?: boolean): void` (optional 3rd arg, defaults to `false`).
- `resetDomain(): void` — resets `domainBlend = 0`.
- `getDomainBlend(): number` — returns current `domainBlend` in `[0, 1]` for verification/tests.
- `renderScreenBackdrop` & `renderWorld` render Ma Kính Hư Không Giới proportionally when `domainBlend > 0.02`, preserving `this.stageTheme` untouched.

### 4. `src/game/Entities.ts` (M2A owns)
- Add `'mirror_shard'` to `ProjectileKind`.
- `MirrorRift` additions:
  - `lastHitboxId: number = -1;`
  - `warpCooldown: number = 0;`
  - `domainEmpowered: boolean = false;`
  - `getEffectiveRadius(): number` (`this.domainEmpowered ? this.radius * 1.45 : this.radius`)
  - `getDamageMultiplier(): number` (`this.domainEmpowered ? 1.55 : 1.0`)

### 5. `src/game/types.ts` (M2A owns)
- Extend `HudSnapshot` with optional fields:
  - `domainActive?: boolean;`
  - `domainTimeLeft?: number;`

### 6. `src/game/Player.ts` & `src/game/Game.ts` (M2B owns)
- `PlayerUpdateParams`: add optional `mirrorRifts?: MirrorRift[];` and `onMirrorRiftDashWarp?: (rift: MirrorRift) => void;` (optional so `testHarness.ts` callers remain 100% compatible).
- `Game` exposes/maintains `domainTimer` (activated exclusively for `characterId === 'mirage' && skinId === 'void_shatterer'` on Awakening or Rage Ultimate).

## Exclusive File Ownership Matrix
- **M1A**: `src/game/animation.ts`, `src/game/skinVfx.ts`, `src/game/synergy.ts`, `src/game/renderer/types.ts`, `src/game/renderer/trails.ts`
- **M1B**: `src/game/renderer/inkStyle.ts`, `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`, `src/game/StickmanRenderer.ts`
- **M2A**: `src/game/PeriodicTableBG.ts`, `src/game/Entities.ts`, `src/game/types.ts`, `src/App.tsx`, `src/components/GameHUD.tsx`, `src/game/UltimateCutscene.ts`
- **E2E**: `tests/e2e/r4_mirage.e2e.test.ts`, `tests/e2e/run-e2e.mjs`, `tests/e2e/helpers/testHarness.ts`, `.agents/teamwork/teamwork_preview_orchestrator_r4/R4_TEST_READY.md` (or `TEST_READY.md` update)
- **M2B**: `src/game/Player.ts`, `src/game/Game.ts`
- **Invariants (DO NOT MODIFY)**: `src/game/rules.ts`, `src/game/rules.test.ts`, `src/game/poses/*`
