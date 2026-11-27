# Phase 0 Survey 2 (R2 & R5 Rendering) — Handoff Report

**Summary:** Mirage was added as Character 7 after the R3 Ink-Wash overhaul, so nearly every R3 rendering registry (`inkStyle.ts`, `gear.ts`, `weapons.ts`, `animation.ts`, `trails.ts`) lacks Mirage entries and silently falls back to `kuro:default`, `valkyrie:default`, or no-op paths. Consequently, `mirage:void_shatterer` currently renders identically in geometry to `mirage:default` (only color overrides differ), while `src/` currently has `0` `shadowBlur` calls and balanced `save/restore` counts (with minor `try/finally` and `performance.now()` risks).

---

## 1. Observation

### 1.1 Configuration (`characters.ts`, `types.ts`, `inkStyle.ts`, `renderer/types.ts`, `skinVfx.ts`)
- **`src/game/types.ts`**:
  - Line 5: `CharacterId` includes `'mirage'`.
  - Lines 10, 23: `SkinId` includes `'default'` and `'void_shatterer'`.
  - Lines 44–45: `SlashVfxMotif` includes `'mirror_shatter' | 'void_prism'`.
  - Lines 61–70: `ProjectileTheme` is `'default' | 'seraph' | 'void' | 'shogun' | 'cyber' | 'phoenix' | 'frostfire' | 'blood_moon' | 'astral'` (does **not** include `'void_walker'`).
- **`src/game/characters.ts`**:
  - Lines 410–460 (`CHARACTER_ROSTER.mirage`): Configures `mirage` (`default`) with `bodyColor: '#1e1b4b'`, `awakenedBodyColor: '#312e81'`, `glowColor: '#c084fc'`, `accentColor: '#e2e8f0'`, `scarfPrimary: '#6366f1'`, `scarfHighlight: '#f1f5f9'`, `auraStyle: 'purple'`, `awakenedAuraStyle: 'purple'`, `weapon: 'mirror_shards'`, `awakenedWeapon: 'void_prism_scythe'`, `hasSheath: false`, `headGear: 'prism_crown'`.
  - Lines 941–979 (`CHARACTER_SKINS.mirage`): Defines `'default'` (`Ảnh Kính`, `classic`, `overrides: {}`) and `'void_shatterer'` (`Ma Kính`, `mythic`, lines 951–978). `void_shatterer.overrides` (lines 956–977) overrides only colors (`bodyColor: '#09090b'`, `awakenedBodyColor: '#3b0764'`, `glowColor: '#f43f5e'`, `accentColor: '#38bdf8'`, `scarfPrimary: '#be123c'`, `scarfHighlight: '#f0abfc'`, ultimate/awakening/slash colors) and `skills` strings. It does **not** override `weapon`, `awakenedWeapon`, `headGear`, or any structural geometry identifier.
- **`src/game/renderer/inkStyle.ts`**:
  - Lines 157–374 (`SKIN_INK_PALETTES`): Contains 18 entries for `kuro`, `raijin`, `kagura`, `zero`, `aether`, `valkyrie`. **Zero entries for `mirage`**.
  - Lines 376–395 (`AWAKENED_BASE_OVERRIDES`): **Zero entries for `mirage`**.
  - Lines 421–439 (`getSkinInkPalette`): Missing `mirage:*` keys fall back to `SKIN_INK_PALETTES['kuro:default']` (lines 423–425: `baseFill: '#7c5cff'`, `shadowFill: '#3b247a'`, `rimColor: '#e2e8f0'`, `accentColor: '#ef4444'`, `clothPrimary: '#2563eb'`, `clothHighlight: '#93c5fd'`, `glowCore: '#a855f7'`), and `awakened` returns `base` unchanged.
- **`src/game/renderer/types.ts`**:
  - Line 185: `headGear` includes `'prism_crown'`.
  - Lines 208–209: `weapon` includes `'mirror_shards' | 'void_prism_scythe'`.
- **`src/game/skinVfx.ts`**:
  - Lines 17–44 (`SkinVfxProfile`): Declares required properties `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`.
  - Lines 551–598 (`'mirage:default'` and `'mirage:void_shatterer'`): Both entries **omit** `swingAuraSecondary`, `auraTendrilPrimary`, and `auraTendrilSecondary`.
  - Line 568: `'mirage:default'` sets `projectileTheme: 'void_walker'` (not in `ProjectileTheme` union in `types.ts`).

### 1.2 Rendering, Gear, Weapons, Poses & Player Wiring
- **`src/game/Player.ts`**:
  - Line 2200: `this.awakened ? vfx.swingAuraSecondary : vfx.swingAuraColor` passes `undefined` when Mirage is awakened.
  - Line 2287: `ctx.strokeStyle = vfx.swingAuraSecondary` assigns `undefined` during Skill-Link ring render for Mirage.
  - Lines 2338–2373: Calls `renderStickman(ctx, ...)` with `characterId: 'mirage'`, `skinId: this.skinId`, `headGear: 'prism_crown'`, `weapon: awakened ? 'void_prism_scythe' : 'mirror_shards'`, `darkAura: 'purple'`, `awakenedForm: awakened ? 'mirage' : null`, `auraRimColor: vfx.auraTendrilPrimary` (`undefined`), `auraPuddleColor: vfx.auraTendrilSecondary` (`undefined`).
  - Line 521 + `animation.ts:182-360`: `getAwakenedVisualProfile('mirage', skinId)` hits `default:` (`case 'kuro'`, lines 315–358), returning `scarfPrimary: '#b91c1c'`, `scarfHighlight: '#fca5a5'`, `transformationCallout: 'THỨC TỈNH: HUYẾT KIẾM!'`. So awakened `mirage:default` renders with Kuro's crimson scarf and crimson callout!
- **`src/game/poses/index.ts`**:
  - Line 21: `mirage: zeroPoses` (`src/game/poses/zeroPoses.ts`). Mirage shares Zero's twin-dagger shinobi poses for all 8 basic poses (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`).
- **`src/game/animation.ts`**:
  - Lines 400–1155 (`getComboMoveForCharacter`): No `mirage` branch; falls through to `kuroTable` (`iai_draw_slash`, `attack_1`, `attack_2`, `rising_dragon_slash`, `flurry_slash`, `katana_zantetsu_cut`, `dash_slash`, `parry_counter`, `air_attack`, `air_attack_2`, `air_slam`).
- **`src/game/StickmanRenderer.ts`**:
  - Lines 953–959: Calls `getSkinInkPalette('mirage', skinId, isAwakened, opts.bodyColor, opts.glowColor)` -> receives `kuro:default` `shadowFill` (`#3b247a`), `rimColor` (`#e2e8f0`), `inkOutline` (`#0b0c10`).
  - Lines 1490–1776 (`renderDarkInkAura`): `skinMap` (lines 1514–1527) has no `'void_shatterer'`, `defaultCharMap` (lines 1528–1533) has no `'mirage'`, and skin-specific branches (lines 1587–1772) have no Mirage/Void Shatterer case — falls through to generic 7 ink tendrils (`else`, lines 1747–1772) with `rimMap['purple']` fallback (`#7c3aed`) because `auraRimColor`/`auraPuddleColor` are `undefined`.
- **`src/game/renderer/gear.ts`**:
  - Lines 25–45 (`inferCharacterFromSkin`): Does not map `'void_shatterer'` -> `'mirage'` (works only if `characterId` is explicitly passed).
  - Lines 368–385 (`renderHeroHeadGear`, `gear === 'prism_crown'`): Draws 3 floating diamond polygons (`ox of [-10, 0, 10]`) at `head.y - 17`. Hardcodes `#e2e8f0`, `#c084fc`, `#0a0814`; completely ignores `skinId` and `characterId`; has no mask, no eye slit, no cel shading/rim highlight.
  - Lines 1046–1802 (`renderSkinBackAttachment`):
    - No `if (skinId === 'void_shatterer')` branch; when `skinId === 'void_shatterer'`, `skinId !== 'default'` skips the `default` branch too, so **nothing is drawn behind `void_shatterer`'s back**.
    - When `skinId === 'default'`, `inferCharacterFromSkin` returns `'mirage'`, which falls into the generic `else` at lines 1784–1797 (a single curved stroke ribbon colored with `pal.accentColor` = Kuro's `#ef4444`!).
  - Lines 1816–2042 (`getArmorSpec` called by `renderSkinBodyArmor` at line 2061): Has **zero** cases for `'mirage:default'` or `'mirage:void_shatterer'`. Both hit `default:` (lines 2029–2040), which is **`valkyrie:default`** (`plate: '#f8fafc'`, `shadow: '#94a3b8'`, `trim: '#facc15'`, `pauldron: '#d97706'`, `sash: '#d97706'`, `style: 'plate'`).
  - Lines 2250–2826 (`renderAwakenedBackForm`): Handles `kuro`, `raijin`, `kagura`, `zero`, `aether`, `valkyrie`. **No `form === 'mirage'` branch** — renders nothing.
  - Lines 2828–3220 (`renderAwakenedHeadForm`): Handles `kuro`, `raijin`, `kagura`, `zero`, `aether`, `valkyrie`. **No `form === 'mirage'` branch** — renders nothing.
- **`src/game/renderer/weapons.ts`**:
  - Lines 246–270 (`case 'mirror_shards'`): Draws 3 small orbiting diamonds around `handR`. Ignores `skinId` and `accentOverride`; hardcodes `#e2e8f0`, `#c084fc`, `#0a0814`; uses `performance.now() * 0.0055` (line 248) instead of `safeTime`; lacks bevel shading, sumi-ink rim highlight, and off-hand (`handL`) rendering.
  - Lines 271–297 (`case 'void_prism_scythe'`): Draws a simple 2-stroke shaft (`#0a0814`, `#c084fc`) and single curved blade (`#e2e8f0` fill, `#a855f7` stroke). Ignores `skinId` and `accentOverride`; lacks `drawBeveledBlade`, energy aura, or `void_shatterer` structural distinction.
- **`src/game/renderer/trails.ts`**:
  - `renderAttackSwingAura` (lines 167–585) and `renderSlashMotifOrnament` (lines 677–1305) have **no `case 'mirror_shatter'` and no `case 'void_prism'`**.
- **`src/components/TitleScreen.tsx`**:
  - Lines 29–376 (`CharacterPortraitSvg`): No `id === 'mirage'` branch; Mirage's lobby card renders `zero`'s SVG portrait (line 328).

### 1.3 Static R5 Audit (`shadowBlur`, `save/restore`, `performance.now`, gradients)
- **`shadowBlur` across `src/`**: `0` matches (`grep_search` + Python walk across all `.ts`/`.tsx` files in `src/`).
- **`save()` / `restore()` counts across `src/game/`**:
  - `Boss.ts`: 4/4, `Enemy.ts`: 7/7, `Entities.ts`: 34/34, `Game.ts`: 6/6, `ParticleSystem.ts`: 17/17, `PeriodicTableBG.ts`: 17/17, `Player.ts`: 2/2, `StickmanRenderer.ts`: 13/13, `UltimateCutscene.ts`: 32/32, `renderer/gear.ts`: 51/51, `renderer/trails.ts`: 28/28, `renderer/weapons.ts`: 5/5.
- **`ctx.save()` without `try { ... } finally { ctx.restore(); }`**:
  - `src/game/renderer/weapons.ts`: lines 253 (`mirror_shards`), 407, 1016.
  - `src/game/Entities.ts`: line 2203 (`MirrorRift.render`) and 28 other `ctx.save()` sites.
  - `src/game/PeriodicTableBG.ts`: line 448 (`mirage_oasis`) and 6 other sites.
  - `src/game/UltimateCutscene.ts`: lines 1534, 1578, 1588 (`renderMirrorShatter`) and 26 other sites.
- **Fragile hex-suffix concatenation & non-deterministic time**:
  - `src/game/renderer/weapons.ts:248`: `performance.now() * 0.0055` inside `mirror_shards` (bypasses `safeTime`).
  - `src/game/UltimateCutscene.ts:1591`: `` i % 3 === 0 ? `${primary}99` : `${secondary}88` `` (fails if color is `rgb(...)` instead of `#RRGGBB`).
- **Per-frame `create*Gradient`**: `0` occurrences in `StickmanRenderer.ts` and `src/game/renderer/*`.

---

## 2. Logic Chain

1. **Why `void_shatterer` looks like just a recolor**:
   - In `characters.ts:956-977`, `void_shatterer` only overrides hex colors and skill text, leaving `headGear: 'prism_crown'`, `weapon: 'mirror_shards'`, `awakenedWeapon: 'void_prism_scythe'`, and `hasSheath: false` identical to `default`.
   - In `gear.ts` (`renderHeroHeadGear`, `getArmorSpec`, `renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`), `weapons.ts` (`mirror_shards`, `void_prism_scythe`), `inkStyle.ts` (`SKIN_INK_PALETTES`, `AWAKENED_BASE_OVERRIDES`), and `animation.ts` (`getAwakenedVisualProfile`), **no skin-specific or character-specific Mirage rendering branches exist**.
   - Therefore, every structural piece drawn on top of the stickman limbs is either hardcoded identical (`prism_crown`, `mirror_shards`, `void_prism_scythe`), falls back to another character's gear (`valkyrie:default` golden-white breastplate in `getArmorSpec`, `kuro:default` palette in `inkStyle.ts`, `kuro:default` crimson scarf in `getAwakenedVisualProfile`), or draws nothing (`renderSkinBackAttachment` for `void_shatterer`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`).
2. **Structural Gaps Against R2 (Ink-Wash / Unique Silhouette / Gear / Halo / Weapons)**:
   - **G1 — Missing `inkStyle.ts` Palettes**: Need `'mirage:default'` (sumi-ink `#0b0c10`, indigo/silver/violet contrast) and `'mirage:void_shatterer'` (deep obsidian `#07040d`, crimson-rose `#f43f5e`, cyan-prism `#38bdf8`, high-contrast white/silver ink rim) in both `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES`.
   - **G2 — Missing/Shared Headgear & Mask (`gear.ts:renderHeroHeadGear`)**: `prism_crown` currently draws 3 flat diamonds with no mask, no ink-wash eyes, and no distinction between `default` (sleek silver-violet prism diadem + half-visor/eye slit) and `void_shatterer` (distinct jagged obsidian Demon-Mirror / Shattered Oni-Glass Mask with asymmetric cracked faceplate, crimson-cyan prism horns/halo crown, and glowing split optic slit).
   - **G3 — Broken Body Armor & Cloak Fallback (`gear.ts:getArmorSpec`, `renderSkinBodyArmor`, `StickmanRenderer.ts`)**: Both Mirage skins currently wear `valkyrie:default`'s gold-white plate! Need dedicated Mirage armor/garment styles (e.g., `mirage:default` sleek silver-indigo astral haori/vest vs `mirage:void_shatterer` high-collared obsidian-crimson shattered-mirror cloak/pauldrons/tattered coat-tails with faceted prism shoulder blades and chest rift core).
   - **G4 — Missing Back Floating Mirror-Shard Halo/Ring & Awakened Forms (`gear.ts:renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`)**:
     - `mirage:default` currently gets a 1-stroke fallback ribbon; `mirage:void_shatterer` gets **nothing**.
     - Awakened Mirage (`awakenedForm === 'mirage'`) gets **nothing** in `renderAwakenedBackForm` and `renderAwakenedHeadForm`, and gets Kuro's red scarf from `animation.ts:getAwakenedVisualProfile`.
     - R2 requires a floating mirror-shard halo/ring behind the back (orbiting beveled ink-wash mirror shards around a fractured ring — and an escalated multi-ring / shattered dimensional crest + winged mirror-blade array for `void_shatterer` normal & awakened).
   - **G5 — Weapons (`weapons.ts` & `StickmanRenderer.ts`)**:
     - `mirror_shards` ignores `skinId`, hardcodes `#e2e8f0`/`#c084fc`, uses `performance.now()`, and has no off-hand (`handL`) shard presence. Needs ink-wash beveled crystal facets, `safeTime` animation, skin-differentiated geometry/colors (e.g., `void_shatterer` razor crimson-cyan void-mirror daggers/orbitals on both hands, or distinct `void_shatterer` weapon variant), and `whiteFlash` support.
     - `void_prism_scythe` ignores `skinId`, lacks ink-wash bevel/aura/polearm pommel detail, and looks identical on `default` vs `void_shatterer` (needs distinct mythic dual-crescent / fractured-mirror halberd-scythe silhouette for `void_shatterer`).
   - **G6 — `skinVfx.ts` & `renderDarkInkAura` Completeness**: Fill missing `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary` on both Mirage entries, fix invalid `projectileTheme: 'void_walker'`, and add `'mirage'`/`'void_shatterer'` ink-wash glass-shard ground aura in `StickmanRenderer.ts:renderDarkInkAura`.
   - **G7 — Minor Secondary Visual Gaps**: `poses/index.ts` shares `zeroPoses` (acceptable if skeleton invariants are kept, or optional Mirage pose); `TitleScreen.tsx:CharacterPortraitSvg` falls back to `zero` SVG for Mirage.
3. **R5 Compliance**: Engine is clean on `shadowBlur` (`0`) and per-frame gradients in `renderer/` (`0`), but adding new Mirage gear/weapons/domain rendering must preserve `0` `shadowBlur`, wrap every `ctx.save()` in `try { ... } finally { ctx.restore(); }`, use `finiteOr`/`safeTime` (never `performance.now()`), and use `colorWithAlpha()` instead of `${color}XX`.

---

## 3. Caveats

- `tests/e2e/r3_inkwash.e2e.test.ts` and `tests/e2e/helpers/testHarness.ts` were built for the original 6 characters (`ALL_6_CHARACTERS`, `ALL_18_SKINS`, `ALL_18_MOTIFS`); Mirage and `void_shatterer` are not yet covered by those headless `save/restore === 0` & no-NaN checks.
- `tsc --noEmit` was not executed in this survey (per `PROJECT.md:96`, Android `typescript@7.0.2` lacks native arm64 binary; `vite build` + `tsx` are used instead).
- R1 (slash trails/combo moves), R3 (Domain Expansion map transformation), and R4 (`MirrorRift` interaction) were only touched where they overlap R2/R5 (`animation.ts`, `trails.ts`, `Entities.ts`, `PeriodicTableBG.ts`, `UltimateCutscene.ts`); full gameplay/domain details are covered by Survey Explorers 1 & 3.

---

## 4. Conclusion

To satisfy **R2** and **R5** for Mirage (`default` and Mythic `void_shatterer`), implementation must:
1. Add `'mirage:default'` and `'mirage:void_shatterer'` to `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES` in `src/game/renderer/inkStyle.ts`.
2. Add dedicated `case 'mirage':` in `src/game/animation.ts:getAwakenedVisualProfile` (normal & `void_shatterer`) so awakened Mirage keeps Mirage/Void Shatterer scarf colors and callouts instead of Kuro's red.
3. Complete `SKIN_VFX_PROFILES['mirage:default']` and `'mirage:void_shatterer'` in `src/game/skinVfx.ts` (`swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`, valid `projectileTheme`).
4. Overhaul `src/game/renderer/gear.ts`:
   - Update `inferCharacterFromSkin` for `'void_shatterer'`.
   - Upgrade `renderHeroHeadGear` (`'prism_crown'`) to branch on `skinId` and render distinct ink-wash headgear + mask (`void_shatterer`: shattered demon-mirror mask, horned/faceted prism crown, split glowing eye slit).
   - Add `'mirage:default'` and `'mirage:void_shatterer'` to `getArmorSpec` + bespoke cloak/coat-tail/faceted-pauldron rendering in `renderSkinBodyArmor` (eliminating `valkyrie:default` fallback).
   - Add `mirage` (`default` and `void_shatterer`) to `renderSkinBackAttachment`, `renderAwakenedBackForm`, and `renderAwakenedHeadForm` with floating ink-wash mirror-shard halo/ring behind the back (and escalated Void Shatterer winged shard-ring/awakened crown).
5. Upgrade `src/game/renderer/weapons.ts` (`mirror_shards`, `void_prism_scythe`, plus optional `StickmanRenderer.ts` off-hand `handL` mirror shards & `renderDarkInkAura` `void_shatterer` crystal puddle) to branch on `skinId`, use `drawBeveledBlade`/ink outlines, and replace `performance.now()` (line 248) with `safeTime` inside `try/finally`.
6. Keep R5 invariants across all new/modified renderers: `0` `ctx.shadowBlur`, `try { ... } finally { ctx.restore(); }` on every `ctx.save()`, `finiteOr()` guards, `colorWithAlpha()`, and zero per-frame gradient allocations inside `StickmanRenderer`/`renderer/*`.

---

## 5. Verification Method

1. **Static R5 & Type/Build Checks** (run in `/data/user/0/com.agy/files/stickman-build` after syncing `src/`):
   - Zero `shadowBlur`: `grep -rn "shadowBlur" src/` returns empty.
   - Zero `performance.now()` in `src/game/renderer/`: `grep -rn "performance.now" src/game/renderer/` returns empty.
   - `save`/`restore` parity and `try/finally` coverage in `src/game/`.
   - Unit tests (17/17):
     ```bash
     ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
     ```
   - Production Vite build:
     ```bash
     node node_modules/vite/bin/vite.js build
     ```
2. **Headless Canvas Render Verification** (via `MockCanvasElement` in `tests/e2e/helpers/mockCanvas.ts`):
   - Call `renderStickman` for `characterId: 'mirage'` with `skinId: 'default'` and `skinId: 'void_shatterer'`, in both `awakened: false` and `awakened: true` (plus key poses `idle`, `run`, `attack_1..6`, `parry`, `awaken_pose`).
   - Assert: `ctx.saveCount === ctx.restoreCount` (`save/restore` net delta `=== 0`), zero `NaN`/`Infinity` coordinates in draw trace, and distinct serialized draw call signatures between `mirage:default` and `mirage:void_shatterer` (invalidated if both produce identical geometry/path counts).
   - Verify `getSkinInkPalette('mirage', 'default')` and `getSkinInkPalette('mirage', 'void_shatterer')` do not equal `getSkinInkPalette('kuro', 'default')`.
