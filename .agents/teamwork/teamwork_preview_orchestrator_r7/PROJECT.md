# Project: Xuan Feng Sage (`xuan_feng_sage`) Round 7 Visual & Domain Overhaul

## Architecture
Round 7 upgrades Mythic skin `mactien:xuan_feng_sage` (`Xuân Phong Văn Thánh · 春風 · Nhất Khí Hạo Nhiên`) to match `chrono:chrono_sovereign`'s geometric density, multi-layer depth, full-screen Domain architecture, 3-phase dark Ultimate Cutscene, refined upright scholar combat poses, and Awakened skill transformations.

Two-wave dependency architecture guarantees **zero concurrent file overlap**:
- **Wave 1 (Parallel)**:
  - **M1 (R1)**: Full-Screen Domain `"LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU"` (`types.ts`, `GameHUD.tsx`, `PeriodicTableBG.ts`, `Game.ts` Domain lifecycle/triggers)
  - **M2 (R2)**: High-Density Back-Gear (`Thiên Địa Văn Luân`), Multi-Layer Scholar Outfit, Ngọc Tiêu Tiên Bút Weapon & Underfoot Aura (`gear.ts`, `weapons.ts`, `StickmanRenderer.ts`, `renderer/types.ts` `Afterimage` fields)
  - **M3 (R3)**: High-Contrast 3-Phase `#070d12` Dark Ultimate Cutscene (`UltimateCutscene.ts`, `skinVfx.ts`, `characters.ts`, `renderer/inkStyle.ts`)
- **Wave 2 (Parallel, after Wave 1 Gates pass)**:
  - **M4 (R4)**: Refined Scholar 4-Hit Upright Basic-Attack Poses & 3-Layer Trails (`renderer/types.ts` `StickPoseName`, `StickmanRenderer.ts`, `animation.ts`, `renderer/trails.ts`)
  - **M5 (R5)**: Distinct Awakened Skill Transformations (`Entities.ts`, `Player.ts`, `Game.ts` Awakened `inkSeals` + Hanzi hit flashes)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Full-Screen Domain `XUÂN PHONG VĂN MIẾU` | `DomainKind` `'xuan_feng'`, HUD banner `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU`, 3D perspective floor ring, Giant Ink-Wash Sun-Moon & Scripture Wheel (`春・風・靜・禮・義・仁・智・信...`), symmetrical Jade Scholar Pillars / Hanging Scrolls, bamboo & petals parallax, Awaken + Ultimate triggers | M1 | ORIGINAL_REQUEST §R1 / Survey 1 |
| 2 | R2: High-Density Back-Gear, Outfit & Weapon | 3-Layer `Thiên Địa Văn Luân` (Enso + 8-tick octagonal scripture ring + 3D elliptical depth-sorted orbiting Jade Bamboo Slips/Seals in normal & awakened); multi-layer scholar robe with split front/back coattails, collar, jade pendant, flowing sleeves, jade-teal eye glint; Ngọc Tiêu Tiên Bút with pale-gold joints, rotating ferrule energy ring, velocity-driven multi-segment silk tassel; `xuan_feng_sage` underfoot aura | M2 | ORIGINAL_REQUEST §R2 / Survey 2 |
| 3 | R3: 3-Phase Dark Ultimate Cutscene | Deep `#070d12` ink-night 3-phase cutscene: Phase 1 (0–45%) 3 giant counter-rotating Literary Wheels + vortex; Phase 2 (45–70%) radial ink/jade speedlines + perspective shattered bamboo slips/pages; Phase 3 (70–100%) full-detail `renderStickman` on left + Cinnabar-Red/Jade-Teal Seal Frame slamming `春` on right + screen shake & Impact Frame flash | M3 | ORIGINAL_REQUEST §R3 / Survey 2 |
| 4 | R4: Scholar 4-Hit Poses & 3-Layer Trails | Upright, composed 4-hit scholar combo poses (wrist flick, upward calligraphic sweep, telekinetic brush-tip point, open-palm seal push; one hand behind back or chest seal) + `motionArc` polish; 3-layer `xuan_feng_brush` trails (outer ink wash -> inner jade-teal glow -> sharp white brush-tip flash) + 4-point star glints + petals/ink droplets + `renderSlashMotifOrnament` + white-robed petal-dissolving afterimages | M4 | ORIGINAL_REQUEST §R4 / Survey 3 |
| 5 | R5: Awakened Skill Transformations | Moonlight White – Jade Teal – Pale Gold palette; Awakened Basic Attacks (`Ngự Bút Thiên Hành`) summoning 2–3 ranged diagonal calligraphy brush blades / Jade Bamboo Slips + glowing Hanzi hit flashes; Awakened `[U]` (`Văn Thánh Trấn Thiên Trận`) 3-tier Formation Ring + 4 orbiting sub-seals overhead + raining bamboo slips/spring wind + finishing razor-sharp ink cross-slash; Hit 3 darting slips & Hit 4 seal ring triggers; Awakened Dash petal/mist dissolution | M5 | ORIGINAL_REQUEST §R5 / Survey 1 & 3 |

## Milestones
| # | Name | Scope (Exclusive File Ownership) | Dependencies | Status |
|---|------|----------------------------------|--------------|--------|
| M1 | Domain: Xuân Phong Văn Miếu | `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, `src/game/Game.ts` (Domain triggers/lifecycle) | none | PLANNED |
| M2 | Gear, Outfit, Weapon & Underfoot Aura | `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`, `src/game/StickmanRenderer.ts` (`vx/vy` pass-through + `renderDarkInkAura`), `src/game/renderer/types.ts` (`Afterimage.awakened` & `characterId`) | none | PLANNED |
| M3 | 3-Phase Dark Ultimate Cutscene | `src/game/UltimateCutscene.ts`, `src/game/skinVfx.ts`, `src/game/characters.ts`, `src/game/renderer/inkStyle.ts` | none | PLANNED |
| M4 | Scholar 4-Hit Poses & 3-Layer Trails | `src/game/renderer/types.ts` (scholar `StickPoseName`), `src/game/StickmanRenderer.ts` (4 scholar attack poses + `motionArc`), `src/game/animation.ts`, `src/game/renderer/trails.ts` | M2 | PLANNED |
| M5 | Awakened Skill Transformations | `src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts` (Awakened `inkSeals` + Hanzi hit flashes) | M1, M2, M3 | PLANNED |

## Interface Contracts
### `DomainKind` (`src/game/types.ts` ↔ `Game.ts`, `PeriodicTableBG.ts`, `GameHUD.tsx`)
- `export type DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng';`
- `Game.ts` sets `activeDomainKind = 'xuan_feng'` on `xuan_feng_sage` Awaken (`12.5s`) and Ultimate (`10.0s` / `12.5s` overdrive); gates `mactienDomainBlend` off when `skinId === 'xuan_feng_sage'` so `PeriodicTableBG` owns the full-screen Domain exclusively.
- `GameHUD.tsx` displays `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU` when `hud.domainKind === 'xuan_feng'`.

### `StickmanRenderer` ↔ `gear.ts`, `weapons.ts`, `UltimateCutscene.ts`
- `renderWeapon(ctx, joints, weapon, time, whiteFlash, skinId?, accentOverride?, vx = 0, vy = 0)` — optional trailing `vx, vy` preserves full backward compatibility for all callers while enabling velocity-driven tassel physics.
- `renderSkinBackAttachment(ctx, joints, skinId, awakened, time, characterId?, vx = 0, vy = 0)` — optional trailing `vx, vy` + `renderStickman` calls front-layer slip/pendant hook or depth-sorted layers inside `gear.ts`.
- `UltimateCutscene.ts` imports `renderStickman` (`StickmanRenderer.ts`) and `getCharacterDef` (`characters.ts`) directly with existing `StickmanRenderOptions`.

### `Afterimage` (`src/game/renderer/types.ts` ↔ `Player.ts`, `trails.ts`)
- M2 adds optional `awakened?: boolean; characterId?: CharacterId;` to `Afterimage` in `src/game/renderer/types.ts`.
- M5 (`Player.ts`) populates `awakened: this.awakened, characterId: this.character.id` in dash/attack afterimages.
- M4 (`trails.ts`) reads `a.awakened` in `renderAfterimages` to dissolve `xuan_feng_sage` into white-robed silhouettes + peach blossom petals + ink mist.

### `ProjectileKind` (`src/game/Entities.ts` ↔ `Player.ts`, `Game.ts`)
- M5 adds `'bamboo_blade'` (or `'jade_slip'`) to `ProjectileKind` in `src/game/Entities.ts` and spawns them from `Player.ts` on Awakened basic attacks (`Ngự Bút Thiên Hành`) and Hit 3 (`2` darting jade bamboo slips), plus Hanzi impact flashes in `Game.ts`.

## Code Layout & Guardrails
- Source root: `/storage/emulated/0/Antigravity/Stickman/src/`
- Build/check directory: `/data/user/0/com.agy/files/stickman-build` (`tsc --noEmit`)
- Excluded files (NEVER read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Technical invariants:
  - Zero `ctx.shadowBlur` anywhere in `src/`.
  - Zero `performance.now()` anywhere in `src/game/renderer/` and `UltimateCutscene.ts`.
  - Strictly balanced `ctx.save()` / `ctx.restore()` (via `try { ... } finally { ctx.restore(); }`) in every render function.
