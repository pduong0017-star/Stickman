# Scope: Xuân Phong Văn Thánh (`xuan_feng_sage`) — `mactien` Mythic Skin

## Architecture & Module Partition (Zero File Overlap)
Standalone `mythic`-tier skin **"Xuân Phong Văn Thánh"** (`xuan_feng_sage`, subtitle: `春風 · Nhất Khí Hạo Nhiên`) for character `mactien` in Scarlet Sheath (`Stickman`), strictly isolated via `skinId === 'xuan_feng_sage'` branches with zero changes to combat logic, hitboxes, damage, or cooldowns.

| Module | Owner | Exclusive Files | Status |
|---|---|---|---|
| M1: Data, Gear & Weapon (R1) | `worker_r6_m1` | `src/game/types.ts`, `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/renderer/inkStyle.ts`, `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts` | DONE |
| M2: Soft Brush Trails, Seals & Afterimages (R2) | `worker_r6_m2` | `src/game/renderer/types.ts`, `src/game/renderer/trails.ts`, `src/game/animation.ts`, `src/game/Player.ts`, `src/game/Game.ts` (`Entities.ts` confirmed clean, no edits) | DONE |
| M3: Cinematic Ultimate Cutscene (R3) | `worker_r6_m3` | `src/game/UltimateCutscene.ts` | DONE |

## Feature Inventory
| # | Feature | Description | Module | Source |
|---|---|---|---|---|
| 1 | Skin & Palette Registration | Register `xuan_feng_sage` (`mythic`, White Robe `#f8fafc`, Jade Teal `#5eead4`/`#2dd4bf`, Ink Wash `#1e293b`, Peach Blossom `#fda4af`, subtle cinnabar) in `characters.ts`, `skinVfx.ts`, `inkStyle.ts` (incl. `AWAKENED_BASE_OVERRIDES`) | M1 | R1.1 |
| 2 | Scholar Robe, Enso Ring & Awaken Gear | Multi-layered flowing white scholar robe with jade trim & velocity/wind sway; open Zen Enso ink-wash moon ring slowly rotating behind back + 3–4 drifting bamboo slips/scripture pages & peach petals; Moonlight White – Jade Teal awaken form (`gear.ts`) | M1 | R1.2 |
| 3 | Ngọc Tiêu Tiên Bút Weapon | Translucent white jade brush shaft, soft flowing jade silk tassel, white bristles tipped with glowing jade-teal ink (normal & awakened, no harsh gold) (`weapons.ts`) | M1 | R1.3 |
| 4 | Soft Brush Trails & Swing Angles | `xuan_feng_brush` 2-layer white-jade/dark-ink tapered silk ribbon + 2–3 petals/bamboo leaves (`trails.ts`); graceful lifted `slashArcs` & `getAwakenedVisualProfile` (`animation.ts`) | M2 | R2.1 |
| 5 | Seals & Ink-Mist Afterimages | Translucent white-jade dissipating ink-mist dash afterimage (`trails.ts`, `Player.ts`); fine-lined jade-teal `静` calligraphy ring with rotating petals bursting into spring breeze + petals (`Player.ts`, `Game.ts`) | M2 | R2.2 |
| 6 | Cinematic Ultimate Cutscene | Dedicated `xuan_feng_sage` branch in `UltimateCutscene.ts`: unfurling ink-wash scroll, misty morning mountains, corner bamboo/peach branches, white-robed `mactien` flicking sleeve & sweeping Jade Brush into Enso circle + spring wind/petals/calligraphy (NO tube/rope dragon), large `"春"` with layered jade glow + corner red seal stamp | M3 | R3 |

## Interface Contracts
- **`SkinId`** (`src/game/types.ts`, owned by M1): add `'xuan_feng_sage'`.
- **`SlashVfxMotif`** (`src/game/types.ts`, owned by M1): add `'xuan_feng_calligraphy'`.
- **`SlashTrailStyle`** (`src/game/renderer/types.ts`, owned by M2): add `'xuan_feng_brush'`.
- **`Afterimage`** (`src/game/renderer/types.ts`, owned by M2): add optional `skinId?: SkinId`.
- **Weapon IDs** (`src/game/characters.ts`, owned by M1): keep `weapon: 'ink_brush'`, `awakenedWeapon: 'golden_ink_brush'` so `trails.ts:85` continues matching `'mactien'`; `weapons.ts` branches on `skinId === 'xuan_feng_sage'`.
- **`getComboMoveForCharacter`** (`src/game/animation.ts`, owned by M2): add optional 4th arg `skinId: SkinId = 'default'` (backwards-compatible with 3-arg callers).
- **Cutscene Skin Dispatch** (`UltimateCutscene.ts`, owned by M3): `Game.ts:3750` already passes `skinId: this.skinId` into `CutsceneTheme`; M3 branches via `this.theme.skinId === 'xuan_feng_sage'` before the default `mactien` branch.

## Excluded Files (DO NOT READ OR MODIFY)
`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`.
