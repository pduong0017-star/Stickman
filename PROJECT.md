# Project: Scarlet Sheath — R3 Ink-Wash / Thủy Mặc Graphics Overhaul

*(Previous milestones R1 Skin Attack VFX & R2 Anime Fighting Pose Overhaul are completed/archived in git & `.agents/teamwork/`. This document tracks the active R3 full-team graphics overhaul from `ORIGINAL_REQUEST.md` Follow-up `2026-11-26T09:54:29Z`.)*

## Architecture
- **Engine**: React 19 + Vite 8 + Tailwind CSS v4 + TypeScript + HTML5 Canvas 2D fixed-substep (`SIM_STEP = 1/120s`) action game.
- **Deterministic Simulation & Skeleton Invariance (R3 Compliance)**:
  - All combat hitboxes, frame timings, damage formulas, AI state machines, `SkeletonJoints` bone lengths (`TORSO_LEN=34`, `THIGH_LEN=26`, `SHIN_LEN=26`, `UPPER_ARM_LEN=19`, `FOREARM_LEN=19`), `src/game/poses/*`, `poseMath.ts`, `ComboMoveSpec` (`animation.ts`), and `src/game/rules.ts` MUST remain untouched.
- **Japanese Ink-Wash / Thủy Mặc Rendering Layer**:
  - **Shared Ink-Wash Primitives (`src/game/renderer/inkStyle.ts`)**: Variable-width calligraphic brush limbs/torso (`drawInkBrushLimb`, `drawInkBrushTorso`, `drawInkHead`), cel-shading + sumi-e shadow passes, high-contrast directional rim-light, safe `colorWithAlpha(color, alpha)` helper (replacing fragile `${hex}33` concatenation), finite-number sanitizers, and 18-entry `SkinInkPalette` registry.
  - **Playable Roster Parity (6 Characters, 18 Skins)**: Full ink-wash armor/haori/obi, flowing quadratic swallowtail scarves, headgear, awakened wings/auras, glowing metallic/ink weapons, and all 18 slash trail motifs (`kuro` × 4, `raijin` × 3, `kagura` × 3, `zero` × 3, `aether` × 2, `valkyrie` × 3).
  - **Monsters, Elites & 12 Bosses (`src/game/enemyVisuals.ts` + `gear.ts` + `weapons.ts`)**: Distinct ink-wash outfits & silhouettes for all 8 normal mob archetypes, structural Elite rank ornaments (horns, pauldrons, rank crest/aura), and all 12 Bosses (including dedicated outfits for Bosses 9–12 `raiden`, `akaza`, `kronos`, `omega` and Phase 1 → Phase 2 enraged visual escalation), plus theme-matched projectile colors in `Entities.ts`.
  - **Arena Contrast & Android Canvas 2D Safety**:
    - **ZERO `ctx.shadowBlur`** anywhere in `src/`.
    - **Balanced `ctx.save()` / `ctx.restore()`** (= 0 net delta per frame), zero `NaN`/`Infinity`, zero per-frame `create*Gradient` inside character/enemy loops.
    - Mid-ground atmospheric sumi-mist contrast band in `PeriodicTableBG.ts` + toned/cached Awakening grid so ink-wash `#0b0c10` / `#f8fafc` / vermilion silhouettes remain crisp across all 12 dark arenas.

## Feature Inventory
Every feature discovered in Phase 0 Survey (from `ORIGINAL_REQUEST.md` Follow-up `2026-11-26T09:54:29Z` and Survey Explorers 1–3) is assigned to a milestone below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| R3-F1 | Ink-Wash Brush Primitives & 18-Skin Ink Palette | Create `src/game/renderer/inkStyle.ts` with 18 `SkinInkPalette` entries, tapered calligraphic brush limbs/torso/head, sumi-e shading, rim-light helpers, finite guards, and `colorWithAlpha()`. | M1 | survey_1, survey_2 |
| R3-F2 | StickmanRenderer & Weapon Ink-Wash Core | Upgrade `StickmanRenderer.ts` (brush limbs, cel+sumi shadows, rim-light, quadratic swallowtail scarf, skin-aware waist sheath, 18-skin `renderDarkInkAura`, finite input guards) and `renderer/weapons.ts` (all playable + boss/mob weapons with ink outlines & glowing rims, export `renderOffhandDagger`), plus `renderer/types.ts` contracts. | M1 | survey_1, survey_2 |
| R3-F3 | 6-Char / 18-Skin Gear, Awakening Forms & 18 Trail Motifs | Upgrade `renderer/gear.ts` (ink-wash armor/haori/obi for all 6 chars & 18 skins, skin-aware `oni_horns`/`valkyrie_wings`/`astral_halo`, add `eclipse_ronin`, `aether`, `valkyrie` back & awakened forms, remove per-frame gradients & dead `destination-out`) and `renderer/trails.ts` (fix `opts.characterId` routing, add 6 missing motifs, ink-wash trail taper). | M2 | survey_1 |
| R3-F4 | 8 Normal Mob Outfits, Elite Ornaments & 12 Boss Outfits (P1/P2) | Implement dedicated `EnemyOutfitId` visuals in `renderer/gear.ts` for all 8 mobs, Elite rank horns/pauldrons/aura/banner, and all 12 Bosses (dedicated `raiden`, `akaza`, `kronos`, `omega` + enriched `haiku`..`fable` + Phase 2 enrage flares). | M2 | survey_2 |
| R3-F5 | EnemyVisuals Registry, Enemy/Boss Wiring & Projectile Parity | Create `src/game/enemyVisuals.ts`, wire into `Enemy.ts` (fix Elite text `save/restore` leak & HP ratio clamp) and `Boss.ts` (Phase 1 vs Phase 2 visual escalation & `p` clamp), and fix `Entities.ts` `spear`/`orb` hardcoded colors + safe alpha helper. | M3 | survey_2 |
| R3-F6 | Arena Contrast Separation & Android BG Optimization | Add mid-ground ink-wash mist separation band & horizon rim in `PeriodicTableBG.ts`, tone/cache Awakening periodic table (`118` `fillText` optimization with mock-Canvas fallback), and eliminate fragile `${hex}33` concatenation in `PeriodicTableBG.ts`, `Game.ts`, `stages.ts`. | M3 | survey_2 |
| R3-F7 | R3 Headless Verification & Pillow Visual Contact-Sheet Suite | Add `tests/e2e/r3_inkwash.e2e.test.ts` + `tests/e2e/render-r3-sheet.py` (`.nomedia` under `.agents/teamwork/e2e_renders/r3/`) covering 6 chars (Normal/Awakened) × 18 skins, 8 mobs (Normal/Elite), 12 Bosses (P1/P2), 12 stages, static zero-`shadowBlur`, `save/restore === 0`, zero NaN, and contrast/MAE metrics; update `testHarness.ts` / `mockCanvas.ts`. | E2E | survey_3 |
| R3-F8 | Integrated Build, Unit Tests, Visual Inspection & Tier 5 Hardening | Sync `src` → `/data/user/0/com.agy/files/stickman-build/src`, pass `rules.test.ts` (17/17), `vite build`, full R3 & E2E suites, inspect rendered PNG contact sheets, and run Tier 5 adversarial hardening. | M4 | survey_3, ORIGINAL_REQUEST |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| E2E | R3 E2E & Visual Test Suite | `tests/e2e/r3_inkwash.e2e.test.ts`, `tests/e2e/render-r3-sheet.py`, `mockCanvas.ts`/`testHarness.ts` updates, `TEST_INFRA.md` & `TEST_READY.md` (R3-F7) | none | DONE (`test_writer_r3_e2e`, `TEST_READY.md` published) |
| M1 | Ink-Wash Core, Brush Primitives & Weapons | `src/game/renderer/inkStyle.ts`, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/renderer/weapons.ts` (R3-F1, R3-F2) | none | DONE (`worker_r3_m1`) |
| M2 | 18-Skin Gear, Awakening, Motifs & Mob/Boss Outfits | `src/game/renderer/gear.ts`, `src/game/renderer/trails.ts`, `src/game/Player.ts` (R3-F3, R3-F4) | M1 | DONE (`worker_r3_m2a`, `worker_r3_m2b`) |
| M3 | Enemy/Boss Visuals, Projectiles & Arena Contrast | `src/game/enemyVisuals.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`, `src/game/PeriodicTableBG.ts`, `src/game/stages.ts`, `src/game/Game.ts` (R3-F5, R3-F6) | M1 | DONE (`worker_r3_m3a`, `worker_r3_m3b`) |
| M4 | Final Verification (Streamlined per User Update) | Wire `StickmanRenderer.ts`→`gear.ts`, sync mirror + `dist/`, `rules.test.ts` 17/17, `vite build`, zero `shadowBlur`, programmatic `save/restore === 0` & no-NaN checks, Forensic Audit (Pillow visual skipped per user) | M1, M2, M3 | DONE (`worker_r3_m4_wiring`, `reviewer_r3_final` APPROVE, `auditor_r3_final` CLEAN) |

## Interface Contracts

### `src/game/renderer/types.ts` (M1 owns)
- Expand `EnemyOutfitId`:
  ```ts
  export type EnemyOutfitId =
    | 'none'
    | 'meta_mob' | 'gunner_mob' | 'swarm_mob' | 'aegis_mob'
    | 'ninja_mob' | 'brute_mob' | 'arcanist_mob' | 'reaper_mob'
    | 'haiku' | 'astra' | 'glacius' | 'opus' | 'vulcan' | 'sol'
    | 'nyx' | 'fable' | 'raiden' | 'akaza' | 'kronos' | 'omega';
  export type BossStyleOutfit = EnemyOutfitId;
  ```
- Extend `StickmanRenderOptions` with optional backward-compatible fields:
  - `inkRimColor?: string;`
  - `inkAccent?: string;`
  - `entityTier?: 'hero' | 'mob' | 'elite' | 'boss';`
  - `enragePhase?: 1 | 2;`
  - `inkWash?: boolean;`

### `src/game/renderer/inkStyle.ts` (M1 owns)
- `export interface SkinInkPalette { inkOutline: string; baseFill: string; shadowFill: string; rimColor: string; accentColor: string; clothPrimary: string; clothHighlight: string; metalLight: string; metalDark: string; glowCore: string; }`
- `export function getSkinInkPalette(characterId?: CharacterId, skinId?: SkinId, awakened?: boolean, fallbackBody?: string, fallbackGlow?: string): SkinInkPalette`
- `export function colorWithAlpha(color: string, alpha: number): string` (handles `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(...)`, `rgba(...)`, `hsl(...)` safely)
- `export function finiteOr(value: number | undefined, fallback: number): number`
- `export function drawInkBrushLimb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, wStart: number, wEnd: number, fillStyle: string, shadowStyle?: string, rimStyle?: string): void`
- `export function drawInkBrushTorso(...)` / `drawInkHead(...)`

### `src/game/enemyVisuals.ts` (M3 owns, consumes `EnemyOutfitId` from M1)
- `export interface EnemyVisualProfile { id: EnemyType; outfit: EnemyOutfitId; bodyColor: string; inkOutlineColor: string; rimColor: string; accentColor: string; vermilionAccent: string; capeColor?: string; lineWidth: number; headRadius: number; phase2BodyColor?: string; phase2RimColor?: string; phase2AuraMode?: 'purple' | 'crimson' | 'cyan' | 'gold' | 'ember' | 'emerald'; }`
- `export function getEnemyVisualProfile(type: EnemyType, isElite?: boolean, phase?: 1 | 2): EnemyVisualProfile`

## Code Layout (Strict Exclusive Write Ownership)
- **M1**: `src/game/renderer/inkStyle.ts`, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/renderer/weapons.ts`
- **M2**: `src/game/renderer/gear.ts`, `src/game/renderer/trails.ts`, `src/game/Player.ts` (minimal render-param sanitization only)
- **M3**: `src/game/enemyVisuals.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`, `src/game/PeriodicTableBG.ts`, `src/game/stages.ts`, `src/game/Game.ts`
- **E2E**: `TEST_INFRA.md`, `TEST_READY.md`, `tests/e2e/*` (no `src/` edits)
- **Untouched invariants**: `src/game/poses/*`, `src/game/animation.ts`, `src/game/rules.ts`, `src/game/rules.test.ts`, `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/types.ts`

## Environment Execution Notes (Android)
- **Mirror Build & Test Directory**: `/data/user/0/com.agy/files/stickman-build`
- **Sync command**:
  ```bash
  rm -rf /data/user/0/com.agy/files/stickman-build/src /data/user/0/com.agy/files/stickman-build/dist
  cp -r /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src
  ```
- **Unit tests (17/17)**:
  ```bash
  ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
  ```
- **Vite build**:
  ```bash
  node node_modules/vite/bin/vite.js build
  ```
- **Note on `tsc`**: `typescript@7.0.2` in `stickman-build` lacks `@typescript/typescript-android-arm64`; verify compilation/bundling via `vite build` + `tsx`/`esbuild` + static checks.
- **Visual artifacts**: Always save inside `.agents/teamwork/e2e_renders/` with `.nomedia` present.
