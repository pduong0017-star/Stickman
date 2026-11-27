# Handoff Report — Module 1: Data, Gear & Weapon (`teamwork_preview_explorer_r6_m1`)

**Core Summary:** All 5 Module 1 files (`src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/renderer/inkStyle.ts`, `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`) use parallel `skinId`-keyed lookups and `if (skinId === ...)` branches modeled cleanly by `chrono_sovereign` and `void_shatterer`. Adding `xuan_feng_sage` also requires updating shared union types in `src/game/types.ts` (`SkinId`, `SlashVfxMotif`) and `src/game/renderer/types.ts` (`SlashTrailStyle`), plus coordinating secondary awakened/aura hooks in `animation.ts` and `StickmanRenderer.ts`.

---

## 1. Observation

### 1.1 Exact File Paths
- `characters.ts`: `/storage/emulated/0/Antigravity/Stickman/src/game/characters.ts`
- `skinVfx.ts`: `/storage/emulated/0/Antigravity/Stickman/src/game/skinVfx.ts`
- `inkStyle.ts`: `/storage/emulated/0/Antigravity/Stickman/src/game/renderer/inkStyle.ts`
- `gear.ts`: `/storage/emulated/0/Antigravity/Stickman/src/game/renderer/gear.ts`
- `weapons.ts`: `/storage/emulated/0/Antigravity/Stickman/src/game/renderer/weapons.ts`
- Shared type dependencies:
  - `/storage/emulated/0/Antigravity/Stickman/src/game/types.ts`
  - `/storage/emulated/0/Antigravity/Stickman/src/game/renderer/types.ts`

### 1.2 Shared Types (`src/game/types.ts` & `src/game/renderer/types.ts`)
- `src/game/types.ts:9`: `export type SkinRarity = 'classic' | 'epic' | 'legendary' | 'mythic';`
- `src/game/types.ts:11-26`:
  ```ts
  export type SkinId =
    | 'default'
    ...
    | 'void_shatterer'
    | 'chrono_sovereign';
  ```
- `src/game/types.ts:28-51`:
  ```ts
  export type SlashVfxMotif =
    ...
    | 'void_prism'
    | 'chrono_clockwork'
    | 'chrono_sovereign'
    | 'ink_calligraphy';
  ```
- `src/game/types.ts:53-63`: `SkinParticleAccentKind` already includes `'petal'` and `'ink_splatter'`.
- `src/game/renderer/types.ts:110-121`:
  ```ts
  export type SlashTrailStyle =
    ...
    | 'chrono_clockwork_slash'
    | 'chrono_sovereign_slash'
    | 'ink_brush_stroke';
  ```

### 1.3 `src/game/characters.ts`
- `src/game/characters.ts:1`: imports `CharacterId, CharacterSkillMeta, SkinId, SkinRarity` from `./types`.
- `src/game/characters.ts:3-27`: `CharacterWeaponKind` includes `'ink_brush'` (line 14); `CharacterAwakenedWeaponKind` includes `'golden_ink_brush'` (line 27).
- `src/game/characters.ts:40-101`: `CharacterDefinition` defines `auraStyle: 'purple' | 'cyan' | 'ember' | 'emerald' | 'gold'` (line 53), `awakenedAuraStyle: 'crimson' | 'gold' | 'ember' | 'emerald' | 'purple' | 'cyan'` (line 54), `headGear` including `'jade_hairpin'` (line 75), `slashColors: [string, string]` (line 100), and `skills: CharacterSkillMeta` (line 89).
- `src/game/characters.ts:522-573`: `CHARACTER_ROSTER.mactien` defines:
  - `bodyColor: '#1a1d24'`, `awakenedBodyColor: '#78350f'`, `glowColor: '#2dd4bf'`, `accentColor: '#ef4444'`, `scarfPrimary: '#1a1d24'`, `scarfHighlight: '#f4f1ea'`
  - `auraStyle: 'cyan'`, `awakenedAuraStyle: 'gold'`, `weapon: 'ink_brush'`, `awakenedWeapon: 'golden_ink_brush'`, `hasSheath: false`, `headGear: 'jade_hairpin'`
  - `ultimatePrimaryColor: '#f59e0b'`, `ultimateSecondaryColor: '#2dd4bf'`, `awakeningWaveColor: '#f59e0b'`, `slashColors: ['#2dd4bf', '#f59e0b']`
- `src/game/characters.ts:576-585`: `CharacterSkinDefinition` has `{ id: SkinId; name: string; subtitle: string; badgeColor: string; rarity?: SkinRarity; overrides: Partial<Omit<CharacterDefinition, 'id' | 'skills'>> & { skills?: Partial<CharacterSkillMeta>; }; }`.
- `src/game/characters.ts:1064-1142`: `void_shatterer` (lines 1064-1091) and `chrono_sovereign` (lines 1103-1141) both use `rarity: 'mythic'` and override palette colors, `auraStyle`/`awakenedAuraStyle`, `ultimatePrimaryColor`/`ultimateSecondaryColor`/`ultimateBannerTitle`, `awakeningBannerText`/`awakeningWaveColor`, `slashColors`, and `skills` labels.
- `src/game/characters.ts:1144-1153`: `CHARACTER_SKINS.mactien` currently contains only `{ id: 'default', name: 'Thư Sinh Áo Vải', subtitle: 'Thủy Mặc · Ngọc Bích · Chu Sa', badgeColor: '#2dd4bf', rarity: 'classic', overrides: {} }`.
- `src/game/characters.ts:1168-1184`: `getCharacterDef(id, skinId)` merges `skin.overrides` onto `CHARACTER_ROSTER[id]`.

### 1.4 `src/game/skinVfx.ts`
- `src/game/skinVfx.ts:17-44`: `SkinVfxProfile` fields: `profileId`, `characterId`, `skinId`, `motif`, `slashPrimary`, `slashSecondary`, `slashRim`, `slashCore`, `swingAuraColor`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`, `afterimageColor`, `particlePrimary`, `particleSecondary`, `swingParticleKind`, `finisherParticleKind`, `impactRingColor`, `hitTextColor`, `detonationColor`, `projectileTheme`, `pillarTheme`, `iceWallTheme`, `cutscenePrimary`, `cutsceneSecondary`, `cutsceneAccent`.
- `src/game/skinVfx.ts:579-606` (`'mirage:void_shatterer'`) and `635-662` (`'chrono:chrono_sovereign'`): mythic skins register a keyed entry in `SKIN_VFX_PROFILES` and a dedicated `motif`.
- `src/game/skinVfx.ts:663-690`: `'mactien:default'` uses `motif: 'ink_calligraphy'`, `swingParticleKind: 'ink_splatter'`, `finisherParticleKind: 'petal'`, `projectileTheme: 'default'`, `pillarTheme: 'fire'`, `iceWallTheme: 'ice'`.
- `src/game/skinVfx.ts:697-706`: `getSkinVfxProfile(characterId, skinId)` looks up `${characterId}:${skinId}`, falling back to `${characterId}:default`.

### 1.5 `src/game/renderer/inkStyle.ts`
- `src/game/renderer/inkStyle.ts:3-14`: `SkinInkPalette` fields: `inkOutline`, `baseFill`, `shadowFill`, `rimColor`, `accentColor`, `clothPrimary`, `clothHighlight`, `metalLight`, `metalDark`, `glowCore`.
- `src/game/renderer/inkStyle.ts:386-397` (`'mirage:void_shatterer'`), `410-421` (`'chrono:chrono_sovereign'`), `422-433` (`'mactien:default'`): entries in `SKIN_INK_PALETTES`.
- `src/game/renderer/inkStyle.ts:436-460`: `AWAKENED_BASE_OVERRIDES` maps `${characterId}:${skinId}` to `{ baseFill, shadowFill, rimColor }`. Currently `'mactien:default'` (line 459) is `{ baseFill: '#292118', shadowFill: '#0f0c08', rimColor: '#fde047' }`.
- `src/game/renderer/inkStyle.ts:462-505`: `getSkinInkPalette` looks up `SKIN_INK_PALETTES[key]` and when `awakened` is true overrides `baseFill`, `shadowFill`, `rimColor` from `AWAKENED_BASE_OVERRIDES[key] ?? AWAKENED_BASE_OVERRIDES[\`${characterId}:default\`]`.

### 1.6 `src/game/renderer/gear.ts`
- Time & safety helpers (`src/game/renderer/gear.ts:11-24`): `safePt`, `safeHeadRadius`, `safeClock(time)` — all animation uses the passed `time: number` parameter, never `performance.now()`.
- `inferCharacterFromSkin(skinId, characterId)` (`src/game/renderer/gear.ts:26-52`): maps mythic `skinId`s (`void_shatterer` -> `'mirage'`, `chrono_sovereign` -> `'chrono'`) when `characterId` is omitted; currently has no mapping for `xuan_feng_sage`.
- `drawInkRing(ctx, cx, cy, rx, ry, rot, outline, strokeColor, lineW)` (`src/game/renderer/gear.ts:324-353`): draws a **closed** `ctx.ellipse(..., 0, Math.PI * 2)`.
- `renderHeroHeadGear(ctx, joints, headR, gear, time, skinId, characterId)` (`src/game/renderer/gear.ts:355-589`):
  - Uses `ctx.save(); try { ... } finally { ctx.restore(); }` pattern.
  - `chrono_gear` (line 380-465) and `prism_crown` (line 589+) branch directly on `skinId === 'chrono_sovereign'` / `skinId === 'void_shatterer'`.
  - `gear === 'jade_hairpin'` (lines 527-588) has no `skinId` branch yet; renders dark `#1a1d24` topknot, `#f4f1ea` ribbon, `#2dd4bf` pin, `#ef4444` tassel.
- `renderSkinBackAttachment(ctx, joints, skinId, awakened, time, characterId)` (`src/game/renderer/gear.ts:1411-2526`):
  - `void_shatterer` (line 2100) and `chrono_sovereign` (line 2194) are top-level `else if (skinId === ...)` branches.
  - `charId === 'mactien'` (lines 2416-2477) currently sits **inside** `else if (skinId === 'default')` (line 2285), drawing a closed `drawInkRing`, 3 bamboo leaves, and 3 ink droplets (gold when `awakened`).
- `ArmorSpec` & `getArmorSpec(charId, skinId, awakened, pal)` (`src/game/renderer/gear.ts:2528-2835`):
  - `case 'mirage:void_shatterer'` (line 2761), `case 'chrono:chrono_sovereign'` (line 2785), `case 'mactien:default'` (line 2809, `style: 'scholar_robe'`).
  - No `case 'mactien:xuan_feng_sage'` exists; without one, `getArmorSpec` falls through to `default:` (`style: 'plate'`, lines 2822-2833).
- `renderSkinBodyArmor(ctx, joints, skinId, awakened, time, characterId, vx = 0, vy = 0)` (`src/game/renderer/gear.ts:2837-3597`):
  - `spec.style === 'scholar_robe'` renders flowing lower robe hem reacting to `vx`/`vy` (lines 3117-3167) and torso V-collar/lapels/waist sash/cinnabar stamp (lines 3440-3482).
  - Note: lines 3517-3521 also draw a bottom Obi `ctx.fillRect(-7.2, 8.5, 14.4, 4.2)` using `spec.sash` after the torso `if/else`.
- `renderAwakenedBackForm(ctx, joints, form, time, skinId)` (`src/game/renderer/gear.ts:3599-4556`) & `renderAwakenedHeadForm(ctx, joints, headR, form, time, skinId)` (`src/game/renderer/gear.ts:4558-5157`):
  - Both are called by `StickmanRenderer.ts:1190,1312` whenever `opts.awakenedForm` is truthy (`this.awakened ? this.character.id : null` from `Player.ts:2910`).
  - Both currently end at `else if (form === 'chrono')`; neither has a `form === 'mactien'` branch yet.

### 1.7 `src/game/renderer/weapons.ts`
- `renderWeapon(ctx, joints, weapon, time, whiteFlash, skinId, accentOverride)` (`src/game/renderer/weapons.ts:449+`):
  - Translates/rotates to `handR` and `joints.weaponAngle` inside `ctx.save(); try { ... } finally { ctx.restore(); }`.
  - Uses `safeTime = finiteOr(time, 0)` (line 461).
  - `chrono_hand` (line 552), `mirror_shards` (line 931), and `void_prism_scythe` (line 1082) branch via `skinId === 'chrono_sovereign'` / `skinId === 'void_shatterer'`.
  - `case 'ink_brush': case 'golden_ink_brush':` (lines 809-929): currently switches only on `const isGolden = weapon === 'golden_ink_brush'`, using `#b45309`/`#fde047`/`#f59e0b` when golden, `#0f766e`/`#2dd4bf`/`#1a1d24` when normal, and dripping droplets + `#ef4444` vermilion tassel/collar.

### 1.8 Cross-Module Integration Points Observed
- `src/game/renderer/trails.ts:76-85`: `inferCharacterForSkin` maps `void_shatterer`/`chrono_sovereign` and checks `if (weapon === 'ink_brush' || weapon === 'golden_ink_brush') return 'mactien';`.
- `src/game/renderer/trails.ts:1121-1136`: `resolveSlashMotif` checks `s.motif`, then `getSkinVfxProfile(...)`, then `s.style === 'ink_brush_stroke'`.
- `src/game/Player.ts:2235-2260, 2520-2535, 2622-2639`: currently hardcodes `#f59e0b` / `#2dd4bf` / `#ef4444` / `'ink_splatter'` for `this.character.id === 'mactien'` (Module 2 target).
- `src/game/Player.ts:2875-2919`: passes `vfx.swingAuraColor`, `vfx.swingAuraSecondary`, `vfx.motif`, `vfx.auraTendrilPrimary`, `vfx.auraTendrilSecondary`, `skinId`, `characterId`, `awakened`, `awakenedForm`, `weapon`, `headGear` to `renderStickman`, and calls `getAwakenedVisualProfile(this.character.id, this.skinId)` (`src/game/animation.ts:188,363`).
- `src/game/StickmanRenderer.ts:1628-1663`: `skinMap` provides `{ rim, puddle, core }` for ground aura (`auraRimColor` and `auraPuddleColor` override `rim` and `puddle`, while `core` falls back to `#0b0c10` if `skinId` is not in `skinMap`).
- `src/game/UltimateCutscene.ts` (Module 3): receives/uses `skinId` & `SkinVfxProfile` (`cutscenePrimary`, `cutsceneSecondary`, `cutsceneAccent`).

---

## 2. Logic Chain

1. **Skin Registration & Inheritance (`types.ts` + `characters.ts`)**: Because `SkinId` in `src/game/types.ts` gates `CharacterSkinDefinition.id`, `SkinVfxProfile.skinId`, and all renderer `skinId` parameters, adding `'xuan_feng_sage'` to `SkinId` is the prerequisite for type-checking across all 3 modules. Adding `xuan_feng_sage` to `CHARACTER_SKINS.mactien` with `rarity: 'mythic'` lets `getCharacterDef('mactien', 'xuan_feng_sage')` automatically supply the refined palette (`#f8fafc`, `#5eead4`/`#2dd4bf`, `#1e293b`, `#fda4af`) to UI/HUD/Player/Cutscene without touching combat stats.
2. **Preserving Weapon ID Compatibility (`characters.ts` + `weapons.ts` + `trails.ts`)**: `trails.ts:85` and `Player.ts` recognize `mactien`'s weapon via `'ink_brush'` / `'golden_ink_brush'`. Keeping `weapon: 'ink_brush'` and `awakenedWeapon: 'golden_ink_brush'` on `xuan_feng_sage` (mirroring `chrono_sovereign` keeping `'chrono_hand'` / `'chrono_twin_hands'`) avoids breaking trail/pose weapon detection, while branching on `skinId === 'xuan_feng_sage'` inside `weapons.ts` lines 809-929 cleanly replaces both normal and awakened brush visuals with **Ngọc Tiêu Tiên Bút** (no harsh gold in awakened mode).
3. **VFX & Palette Isolation (`skinVfx.ts` + `inkStyle.ts`)**: Because `getSkinInkPalette` falls back to `AWAKENED_BASE_OVERRIDES['mactien:default']` (which has harsh `#fde047` rim) unless `'mactien:xuan_feng_sage'` has its own entry in BOTH `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES`, defining both entries prevents harsh yellow bleed in awakened stickman limbs/rims. Similarly, registering `'mactien:xuan_feng_sage'` in `SKIN_VFX_PROFILES` with a dedicated `motif: 'xuan_feng_calligraphy'` (added to `SlashVfxMotif` in `src/game/types.ts`) decouples `trails.ts`, `Player.ts`, and `UltimateCutscene.ts` from `mactien:default`'s `#f59e0b`/`#ef4444` colors.
4. **Gear & Awaken Visuals (`gear.ts`)**:
   - `inferCharacterFromSkin` must map `'xuan_feng_sage' -> 'mactien'` so calls omitting `characterId` resolve correctly.
   - `renderSkinBackAttachment` only runs `charId === 'mactien'` inside `skinId === 'default'`, so `xuan_feng_sage` needs a dedicated top-level `else if (skinId === 'xuan_feng_sage')` branch for the unclosed Zen Enso brush-stroke moon ring (cannot use closed `drawInkRing`, must draw a tapered/variable-width arc < `2π` with a gap) rotating very slowly (`t * 0.25`–`0.35`) plus 3–4 drifting bamboo slips / scripture pages and `#fda4af` peach blossom petals.
   - `getArmorSpec` must add `case 'mactien:xuan_feng_sage':` returning a dedicated `'xuan_feng_robe'` style (or branching inside `'scholar_robe'`) so `renderSkinBodyArmor` renders a multi-layered flowing white (`#f8fafc`) scholar robe with jade teal (`#5eead4`/`#2dd4bf`) trim, soft ink-wash (`#1e293b`) depth/outline, subtle cinnabar waist stamp, and gentle wind/velocity sway (`vx`, `vy`) — and keeps Moonlight White + Jade Teal when `awakened === true`.
   - `renderHeroHeadGear` (`jade_hairpin`) needs a `skinId === 'xuan_feng_sage'` branch for a refined white-jade scholar crown/hairpin with peach-blossom & jade-silk ribbon accents.
   - `renderAwakenedBackForm` and `renderAwakenedHeadForm` currently have no `form === 'mactien'` branch; adding `else if (form === 'mactien')` with `if (skinId === 'xuan_feng_sage')` delivers the Moonlight White – Jade Teal awakened aura, glowing Enso ring enhancement, and falling spring petals.

---

## 3. Caveats

1. **Shared Union Files Outside Module 1's 5 Files**:
   - `src/game/types.ts` owns `SkinId` and `SlashVfxMotif`.
   - `src/game/renderer/types.ts` owns `SlashTrailStyle` (needed by Module 2 for `'xuan_feng_brush'`).
   - Orchestrator must assign `src/game/types.ts` (and optionally `src/game/renderer/types.ts`) either to Module 1 first or as a pre-step contract lock so Modules 1, 2, and 3 compile cleanly with zero file conflicts.
2. **Cross-Module Awaken & Ground Aura Hooks**:
   - `src/game/animation.ts:363-372` (`getAwakenedVisualProfile` for `case 'mactien'`) currently returns `scarfPrimary: '#78350f'`, `scarfHighlight: '#fde047'`, `auraAccent: '#f59e0b'`, `formTitle: 'KIM MẶC TIÊN BÚT'` regardless of `skinId`. Because `Player.ts:2900-2901` uses `awakenedProfile.scarfPrimary` / `scarfHighlight` for the neck scarf collar, Module 2 (which owns `animation.ts`) MUST add `if (skinId === 'xuan_feng_sage')` inside `getAwakenedVisualProfile` (`case 'mactien'`) returning Moonlight White (`#f8fafc`) / Jade Teal (`#5eead4`) instead of brown/gold!
   - `src/game/StickmanRenderer.ts:1628-1663`: `skinMap` controls the ground puddle `coreColor` (`core` defaults to `#0b0c10` if absent, while `rim` and `puddle` come from `skinVfx.ts`'s `auraTendrilPrimary` / `auraTendrilSecondary`). Also `StickmanRenderer.ts:1021-1117` (`motionArc`) has character branches for `mirage` and `chrono`. Not in Module 1's 5-file scope; note for orchestrator if a white-jade puddle core or custom ground aura/motionArc is desired.
3. **`getArmorSpec` Bottom Obi Sash (`gear.ts:3517-3521`)**:
   - After the torso `if (spec.style === ...)` chain in `renderSkinBodyArmor`, lines 3517-3521 unconditionally draw a rectangle `ctx.fillRect(-7.2, 8.5, 14.4, 4.2)` using `spec.sash` and `spec.outline`. Module 1 Worker should ensure `spec.sash` on `'mactien:xuan_feng_sage'` is a refined Jade Teal / soft ink-wash (`#2dd4bf` or `#1e293b`) rather than bright `#ef4444` red, or guard/layer it cleanly so it harmonizes with the white robe and subtle cinnabar stamp.
4. **Canvas 2D & MockCanvas Safety**:
   - Every new render path must avoid `ctx.shadowBlur` and `performance.now()`, wrap transforms/styles in `ctx.save(); try { ... } finally { ctx.restore(); }`, and use only `safePt`/`safeClock`/`finiteOr` guarded coordinates.

---

## 4. Conclusion

### 4.1 Locked Interface Contracts (for Modules 1, 2, and 3)
| Contract Symbol | File | Exact Value / Signature | Consumers |
|---|---|---|---|
| `SkinId` member | `src/game/types.ts` | `'xuan_feng_sage'` | `characters.ts`, `skinVfx.ts`, `inkStyle.ts`, `gear.ts`, `weapons.ts`, `trails.ts`, `animation.ts`, `Entities.ts`, `Player.ts`, `Game.ts`, `UltimateCutscene.ts` |
| `SlashVfxMotif` member | `src/game/types.ts` | `'xuan_feng_calligraphy'` | `skinVfx.ts` (`SKIN_VFX_PROFILES['mactien:xuan_feng_sage'].motif`), `trails.ts` (`renderSlashMotifOrnament` / `renderSwingAura`), `Player.ts` |
| `SlashTrailStyle` member | `src/game/renderer/types.ts` | `'xuan_feng_brush'` | `animation.ts` / `Player.ts` (when `skinId === 'xuan_feng_sage'`), `trails.ts` (`renderSlashTrails`) |
| Weapon IDs (unchanged) | `src/game/characters.ts` | `weapon: 'ink_brush'`, `awakenedWeapon: 'golden_ink_brush'` | `weapons.ts` branches on `skinId === 'xuan_feng_sage'`; `trails.ts:85` continues matching `'mactien'` |
| Skin VFX Key | `src/game/skinVfx.ts` | `'mactien:xuan_feng_sage'` | `getSkinVfxProfile('mactien', 'xuan_feng_sage')` in `Player.ts`, `Game.ts`, `trails.ts`, `UltimateCutscene.ts` |
| Ink Palette Key | `src/game/renderer/inkStyle.ts` | `'mactien:xuan_feng_sage'` in `SKIN_INK_PALETTES` & `AWAKENED_BASE_OVERRIDES` | `getSkinInkPalette('mactien', 'xuan_feng_sage', awakened)` in `StickmanRenderer.ts` & `gear.ts` |

### 4.2 Concrete Implementation Plan for Module 1 Worker (R1)

**Pre-step (Shared Types — confirm ownership with Orchestrator):**
- `src/game/types.ts`:
  - Add `| 'xuan_feng_sage'` to `SkinId` (after `'chrono_sovereign'`, line 26).
  - Add `| 'xuan_feng_calligraphy'` to `SlashVfxMotif` (after `'ink_calligraphy'`, line 51).
- `src/game/renderer/types.ts`:
  - Add `| 'xuan_feng_brush'` to `SlashTrailStyle` (after `'ink_brush_stroke'`, line 121) for Module 2.

**Step 1 — `src/game/characters.ts`:**
- Under `CHARACTER_SKINS.mactien` (after line 1152), add `xuan_feng_sage`:
  - `id: 'xuan_feng_sage'`, `rarity: 'mythic'`
  - `name: 'Xuân Phong Văn Thánh'`, `subtitle: '春風 · Nhất Khí Hạo Nhiên'`, `badgeColor: '#5eead4'`
  - `overrides`:
    - `codename: 'Xuân Phong Văn Thánh'`
    - `bodyColor: '#f8fafc'` (White Robe), `awakenedBodyColor: '#f0fdfa'` (Moonlight White — NO harsh gold)
    - `glowColor: '#5eead4'`, `accentColor: '#fda4af'` (Peach Blossom)
    - `scarfPrimary: '#f8fafc'`, `scarfHighlight: '#5eead4'`
    - `auraStyle: 'cyan'`, `awakenedAuraStyle: 'cyan'` (NO `'gold'`)
    - `weapon: 'ink_brush'`, `awakenedWeapon: 'golden_ink_brush'`, `headGear: 'jade_hairpin'`
    - `ultimateKanji: '春'`, `ultimatePrimaryColor: '#5eead4'`, `ultimateSecondaryColor: '#fda4af'`, `ultimateBannerTitle: 'XUÂN PHONG VĂN THÁNH · 春'`
    - `awakeningBannerText: 'THỨC TỈNH: NGUYỆT BẠCH THANH PHONG!'`, `awakeningWaveColor: '#5eead4'`
    - `slashColors: ['#5eead4', '#fda4af']`
    - `skills`: refined names/descriptions matching Xuân Phong Văn Thánh (e.g. `basicName: 'NGỌC TIÊU TIÊN BÚT'`, `awakenName: 'NGUYỆT BẠCH THANH PHONG'`, `specialName: 'THANH PHONG TĨNH ẤN'`, `specialActiveName: 'XUÂN HOA PHONG ẤN'`, `ultimateFullName: 'XUÂN PHONG HỌA QUYỂN'`).

**Step 2 — `src/game/skinVfx.ts`:**
- Add `'mactien:xuan_feng_sage'` to `SKIN_VFX_PROFILES` (after `'mactien:default'` at line 690):
  - `profileId: 'mactien:xuan_feng_sage'`, `characterId: 'mactien'`, `skinId: 'xuan_feng_sage'`, `motif: 'xuan_feng_calligraphy'`
  - `slashPrimary: '#5eead4'`, `slashSecondary: '#1e293b'` (ink wash), `slashRim: '#f8fafc'`, `slashCore: '#ffffff'`
  - `swingAuraColor: '#5eead4'`, `swingAuraSecondary: '#fda4af'`
  - `auraTendrilPrimary: '#2dd4bf'`, `auraTendrilSecondary: 'rgba(94, 234, 212, 0.30)'`
  - `afterimageColor: '#f8fafc'` (translucent white-jade ink mist)
  - `particlePrimary: '#fda4af'` (peach blossom), `particleSecondary: '#5eead4'` (jade teal)
  - `swingParticleKind: 'petal'`, `finisherParticleKind: 'petal'`
  - `impactRingColor: '#2dd4bf'`, `hitTextColor: '#f0fdfa'`, `detonationColor: '#fda4af'`
  - `projectileTheme: 'default'`, `pillarTheme: 'fire'`, `iceWallTheme: 'ice'`
  - `cutscenePrimary: '#5eead4'`, `cutsceneSecondary: '#fda4af'`, `cutsceneAccent: '#1e293b'`

**Step 3 — `src/game/renderer/inkStyle.ts`:**
- Add `'mactien:xuan_feng_sage'` to `SKIN_INK_PALETTES` (after line 433):
  - `inkOutline: '#1e293b'` (soft deep ink wash, not harsh `#090b10` or yellow), `baseFill: '#f8fafc'`, `shadowFill: '#cbd5e1'`, `rimColor: '#5eead4'`, `accentColor: '#fda4af'`, `clothPrimary: '#f8fafc'`, `clothHighlight: '#5eead4'`, `metalLight: '#f0fdfa'`, `metalDark: '#0f766e'`, `glowCore: '#2dd4bf'`.
- Add `'mactien:xuan_feng_sage'` to `AWAKENED_BASE_OVERRIDES` (after line 459):
  - `{ baseFill: '#f0fdfa', shadowFill: '#99f6e4', rimColor: '#ffffff' }` (Moonlight White – Jade Teal, NO `#fde047`).

**Step 4 — `src/game/renderer/gear.ts`:**
1. `inferCharacterFromSkin` (line 50): add `if (skinId === 'xuan_feng_sage') return 'mactien';`.
2. `renderHeroHeadGear` (`gear === 'jade_hairpin'`, lines 527-588): add `if (skinId === 'xuan_feng_sage')` branch:
   - Refined scholar topknot (`#1e293b`) bound with crisp white silk band (`#f8fafc`) and tiny jade ornament (`#5eead4`).
   - Translucent white-jade hairpin (`#f8fafc` shaft with `#5eead4` glow finial + `#fda4af` peach-blossom petal ornament + flowing jade-teal silk ribbon `#2dd4bf` and tiny muted cinnabar bead `#e11d48`).
3. `renderSkinBackAttachment` (top-level `else if (skinId === 'xuan_feng_sage')` before `else if (skinId === 'default')` at line 2285):
   - **Unclosed Zen Enso moon ring** behind the back (`cx - 3`, `cy - 8`, radius ~26 normal / ~34 awakened): draw an **open arc** (e.g. `0.25` to `Math.PI * 1.82`, NOT closed `2π`) with tapered ink-wash brush stroke (`#1e293b` outer wash + `#f8fafc` / `#5eead4` moonlight-jade rim, slowly rotating via `t * 0.28`). Do NOT call closed `drawInkRing`.
   - **3–4 floating bamboo slips / scripture pages** (`#f8fafc` paper slips / pale bamboo with `#1e293b` mini brush lines and tiny `#e11d48` cinnabar seal dot) drifting gently on slow Lissajous orbits (`Math.sin(t * 1.1 + i)`).
   - **3–4 drifting peach blossom petals** (`#fda4af` with `#fbcfe8` inner tint, soft rotation) floating around the scholar.
4. `ArmorSpec` & `getArmorSpec` (lines 2546, 2809): add `| 'xuan_feng_robe'` (or reuse `'scholar_robe'` with `skinId` branch) and `case 'mactien:xuan_feng_sage':`:
   - `plate: awakened ? '#f0fdfa' : '#f8fafc'`, `shadow: awakened ? '#99f6e4' : '#e2e8f0'`, `outline: '#1e293b'`, `trim: '#5eead4'`, `core: '#2dd4bf'`, `pauldron: '#f8fafc'`, `sash: awakened ? '#5eead4' : '#2dd4bf'`, `spiked: false`.
5. `renderSkinBodyArmor` (`spec.style === 'xuan_feng_robe'`):
   - **Multi-layered flowing white scholar robe**: 2–3 layered outer/inner coat-tails & wide flowing sleeves reacting smoothly to `vx`, `vy`, and gentle wind (`Math.sin(t * 4.2)`), white Xuan-silk `#f8fafc` base, soft ink-wash `#1e293b` contour, `#cbd5e1` inner fold shadow, `#5eead4`/`#2dd4bf` jade trim border, and a delicate `#fda4af` blossom stitch / muted cinnabar `#e11d48` scholar seal at the waist sash.
   - In `awakened === true`, intensify the `#f8fafc`/`#5eead4` moonlight-jade hem shimmer (NO gold).
6. `renderAwakenedBackForm` (add `else if (form === 'mactien')` around line 4552):
   - When `skinId === 'xuan_feng_sage'`: draw soothing **Moonlight White – Jade Teal** aura halo behind the Enso ring (expanded layered alpha ellipses/open brush arcs in `#f8fafc` & `#5eead4` — flat alpha, NO `shadowBlur`) + 5 gently falling spring peach blossom petals (`#fda4af`, `#fbcfe8`) drifting downward around the character.
7. `renderAwakenedHeadForm` (add `else if (form === 'mactien')` around line 5153):
   - When `skinId === 'xuan_feng_sage'`: draw a subtle elevated moonlight-jade open crescent halo above the hairpin + gentle `#5eead4` jade-white optic wisp (clean, serene, no harsh spikes/gold).

**Step 5 — `src/game/renderer/weapons.ts`:**
- Inside `case 'ink_brush': case 'golden_ink_brush':` (lines 809-929), add early branch `if (skinId === 'xuan_feng_sage') { ... break; }`:
  - **Ngọc Tiêu Tiên Bút**:
    - Translucent white-jade brush shaft (`#f8fafc` / `#f0fdfa` core with `#1e293b` refined outline, `#5eead4` jade-teal inner glow vein & delicate jade nodes, and subtle `#ccfbf1` translucency highlight).
    - Soft flowing **jade silk tassel** (`#5eead4` / `#2dd4bf`, optionally with a tiny `#fda4af` blossom knot) swaying smoothly at the pommel via `safeTime`.
    - Refined white-jade ferrule collar with a small muted cinnabar ring (`#e11d48`).
    - **White brush bristles** (`#f8fafc` with `#cbd5e1` ink-wash shading) tipped with softly glowing **jade-teal ink** (`#5eead4` / `#2dd4bf`), plus 2 gentle glowing jade-teal/petal motes in normal state and enhanced Moonlight White – Jade Teal luminescence when `weapon === 'golden_ink_brush'` (awakened) — NO gold!

---

## 5. Verification Method

Run from `/data/user/0/com.agy/files/stickman-build` after Module 1 Worker completes (and after Modules 2 & 3 merge):
1. **TypeScript type-check (zero errors):**
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
2. **Production build (exit 0):**
   ```bash
   node node_modules/vite/bin/vite.js build
   ```
3. **Mandatory Invariants Check:**
   - `grep -rn "shadowBlur" src/` → must return `0` matches.
   - `grep -rn "performance\.now" src/game/renderer/` → must return `0` matches.
   - Inspect every modified function in `gear.ts` and `weapons.ts` to verify strictly balanced `ctx.save()` / `ctx.restore()` (using `try { ... } finally { ctx.restore(); }` and avoiding early `return` outside `try` without `restore`).
4. **Scope Guardrail Check:**
   - Verify `git status` / `git diff --name-only` shows zero modifications to `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`.
5. **Invalidation Conditions:**
   - If Module 2 decides on a different `SlashTrailStyle` or `SlashVfxMotif` string than `'xuan_feng_brush'` / `'xuan_feng_calligraphy'`, `src/game/types.ts`, `src/game/renderer/types.ts`, and `src/game/skinVfx.ts` must be updated in lockstep.
