# Handoff Report — Survey Explorer 2 (R2 Character/Gear/Weapon & R3 3-Phase Ultimate Cutscene)

**Core Summary:** Compared against `chrono_sovereign`'s multi-layered gear, segmented astrolabe weapon, and 3-phase dark cutscene, `xuan_feng_sage` currently renders a flat rectangular/trapezoid white torso, single unlayered Enso ring, 2D un-sorted bamboo slips, basic ferrule/tassel brush, missing ground/motion-arc hooks in `StickmanRenderer.ts`, and an opaque white-paper scroll cutscene (`renderXuanFengSageScroll`) with a hand-drawn paper-doll stickman instead of a 3-phase `#070d12` dark ink-night cutscene with full `renderStickman` character rendering. Static checks confirm **0** `ctx.shadowBlur` usages across `src/` and **0** `performance.now()` usages in `src/game/renderer/` and `src/game/UltimateCutscene.ts`.

---

## 1. Observation

### 1.1 Static Invariant Checks
- `grep_search` for `ctx.shadowBlur` in `/storage/emulated/0/Antigravity/Stickman/src`: **0 matches**.
- `grep_search` for `shadowBlur` in `src/`: only 11 comment lines explicitly noting `no shadowBlur` (e.g., `Game.ts:4162`, `UltimateCutscene.ts:2381,2398,2948,3081,3117`, `gear.ts:656,4943`, `trails.ts:2832`, `weapons.ts:824,980`).
- `grep_search` for `performance.now` in `src/game/renderer/` and `src/game/UltimateCutscene.ts`: **0 matches** in both.

### 1.2 Skin Metadata & Palettes (`characters.ts`, `skinVfx.ts`, `inkStyle.ts`)
| File | `chrono_sovereign` Reference | `xuan_feng_sage` / `mactien` Current |
|---|---|---|
| `src/game/characters.ts` | `1102–1142` (`CHARACTER_SKINS.chrono[1]`): `rarity: 'mythic'`, `bodyColor: '#1c1917'`, `awakenedBodyColor: '#78350f'`, `glowColor: '#f59e0b'`, `accentColor: '#38bdf8'`, `scarfPrimary: '#b45309'`, `scarfHighlight: '#fef08a'`, `weapon: 'chrono_hand'`, `awakenedWeapon: 'chrono_twin_hands'`, `headGear: 'chrono_gear'`, `ultimateKanji: '刻'`, `awakeningBannerText: 'BÀNH TRƯỚNG: THÁP ĐỒNG HỒ CỔ ĐẠI!'` | `522–573` (`CHARACTER_ROSTER.mactien`) & `1153–1193` (`CHARACTER_SKINS.mactien[1]`): `rarity: 'mythic'`, `bodyColor: '#f8fafc'`, `awakenedBodyColor: '#f0fdfa'`, `glowColor: '#5eead4'`, `accentColor: '#fda4af'`, `scarfPrimary: '#f8fafc'`, `scarfHighlight: '#5eead4'`, `auraStyle: 'cyan'`, `awakenedAuraStyle: 'cyan'`, `weapon: 'ink_brush'`, `awakenedWeapon: 'golden_ink_brush'`, `headGear: 'jade_hairpin'`, `ultimateKanji: '春'`. No pale-gold trim color defined; `awakeningBannerText` is `'THỨC TỈNH: NGUYỆT BẠCH THANH PHONG!'`. |
| `src/game/skinVfx.ts` | `635–662` (`'chrono:chrono_sovereign'`): `motif: 'chrono_sovereign'`, `slashPrimary: '#f59e0b'`, `slashSecondary: '#38bdf8'`, `cutscenePrimary: '#f59e0b'`, `cutsceneSecondary: '#38bdf8'`, `cutsceneAccent: '#120b03'` | `691–718` (`'mactien:xuan_feng_sage'`): `motif: 'xuan_feng_calligraphy'`, `slashPrimary: '#5eead4'`, `slashSecondary: '#1e293b'`, `afterimageColor: '#f8fafc'`, `particlePrimary: '#fda4af'`, `particleSecondary: '#5eead4'`, `cutscenePrimary: '#5eead4'`, `cutsceneSecondary: '#fda4af'`, `cutsceneAccent: '#1e293b'` |
| `src/game/renderer/inkStyle.ts` | `410–421` (`'chrono:chrono_sovereign'`) & `AWAKENED_BASE_OVERRIDES` line `470` (`baseFill: '#78350f', shadowFill: '#1c1917', rimColor: '#38bdf8'`) | `434–445` (`'mactien:xuan_feng_sage'`) & `AWAKENED_BASE_OVERRIDES` line `472` (`baseFill: '#f0fdfa', shadowFill: '#99f6e4', rimColor: '#ffffff'`). Note: `shadowFill: '#cbd5e1'` (non-awakened) / `'#99f6e4'` (awakened) with `baseFill: '#f8fafc'` / `'#f0fdfa'`. |

### 1.3 Character Renderer Entry (`src/game/StickmanRenderer.ts` & `src/game/Player.ts`)
- `Player.render(ctx: CanvasRenderingContext2D, silhouetteMode = false)` (`src/game/Player.ts:2931–3050`) invokes `renderStickman(ctx, ...)` at lines `3008–3043` passing `vx: safeVx`, `vy: safeVy`, `awakened: this.awakened`, `awakenedForm: this.awakened ? this.character.id : null`, `skinId: this.skinId`, `headGear: this.character.headGear`, `weapon: this.awakened ? this.character.awakenedWeapon : this.character.weapon`.
- `renderStickman(ctx: CanvasRenderingContext2D, opts: StickmanRenderOptions): SkeletonJoints` (`src/game/StickmanRenderer.ts:935–1508`) renders in strict back-to-front order:
  1. `renderDarkInkAura(...)` (`967–981`, definition `1604–1830+`)
  2. `renderCelScarf(...)` (`984–991`)
  3. `joints.motionArc` (`1021–1121`)
  4. `renderAttackSwingAura(...)` (`1124–1132`)
  5. `renderSkinBackAttachment(...)` (`1177–1186`) & `renderAwakenedBackForm(...)` (`1189–1191`)
  6. Limbs/torso/head ink outline + fill via `strokeSkeletonLimbs(...)` (`1239–1268`)
  7. `renderSkinBodyArmor(...)` (`1284–1295`)
  8. `renderHeroHeadGear(...)` (`1298–1308`) & `renderAwakenedHeadForm(...)` (`1311–1313`)
  9. `renderWeapon(...)` (`1321–1331`)
  10. Front limbs (`1334`) & neck collar (`1337–1360`) & offhand weapon (`1363–1463`).
- **`chrono_sovereign` vs `xuan_feng_sage` in `StickmanRenderer.ts`**:
  - `joints.motionArc` (`1077–1104`): `chrono_sovereign` renders a gilded/azure clock arc with radial dial ticks; `mactien` / `xuan_feng_sage` has no branch and falls through to generic white arcs (`1105–1117`).
  - `renderDarkInkAura` (`1628–1764`): `chrono_sovereign` is registered in `skinMap` (`1642`) and `defaultCharMap` (`1650`) and draws a perspective Roman clock-dial ground aura with rotating ticks, hands, and ascending diamonds (`1706–1764`). `mactien` and `xuan_feng_sage` are **completely absent** from `skinMap`, `defaultCharMap`, and the ground-aura branches, falling back to generic `rimMap['cyan']`.
- Modular skin registry (`src/game/renderer/skins/registry.ts:6–12`) is currently empty (`MODULAR_SKINS = {}`), so all skins execute the branches in `gear.ts`.

### 1.4 Gear, Back Aura & Outfit (`src/game/renderer/gear.ts`)
- Helper `inferCharacterFromSkin(skinId?, characterId?)` (`26–55`): maps `'chrono_sovereign'` (`48`) -> `'chrono'` and `'xuan_feng_sage'` (`51`) -> `'mactien'`.
- **`renderHeroHeadGear(ctx, joints, headR, gear, time, skinId?, characterId?)`** (`358–1501`):
  - `chrono_sovereign` (`385–468`): 2 curved `drawInkHorn` crests, angular obsidian-bronze visor, `drawInkEyeSlit(ctx, hx, hy, '#f59e0b', '#38bdf8', 1.05)` (`442`), `drawInkRing` crown + floating faceted diamond.
  - `xuan_feng_sage` (`531–618`): Topknot bun + white band, 1 diagonal white-jade hairpin with finial dot, 1 flower dot, 1 short quadratic ribbon (`gemX -> gemX - 6.5`), 1 red bead. **Missing:** sharp jade-teal eye glint (`drawInkEyeSlit` is never called in non-awakened state; awakened `renderAwakenedHeadForm` lines `5611–5642` only draws a thin crescent `arc` and a thin wavy line `hx+3 -> hx-22`).
- **`renderSkinBackAttachment(ctx, joints, skinId, awakened, time, characterId?)`** (`1503+`):
  - `chrono_sovereign` (`2286–2376`): Multi-layered halo (`outerR = 40 * scale`), 12 Roman ticks & gear teeth, counter-rotating inner astrolabe ring (`drawInkRing`, `2333`), 2 giant floating beveled clock hands (`2346–2375`).
  - `xuan_feng_sage` (`2377–2485`):
    - **Single ring only (`2383–2419`)**: Draws only 1 open `ctx.arc` Enso (`ensoR = awakened ? 35 : 27`). Missing Layer 2 octagonal/scripture ring with 8 counter-rotating engraved ticks.
    - **Flat 2D bamboo slips (`2421–2460`)**: Draws 4 plain `ctx.rect(-2.8, -7.2, 5.6, 14.4)` rectangles on a 2D orbit without 3D elliptical perspective scaling/foreshortening or front/back depth sorting (all rendered in back-layer before body).
- **`renderAwakenedBackForm(ctx, joints, form, time, skinId?)`** (`3983–5013`):
  - `chrono_sovereign` (`4752–4860`): Twin celestial rings (`r=56, 40`), 12 Roman spokes, twin 3-tier mechanical pendulum wings, 6 orbiting diamonds.
  - `xuan_feng_sage` (`4937–5008`): Only 2 flat translucent circles (`r=46, 34`), 1 single Enso `arc` (`r=38`), and 5 falling petals — lacks the 3-Layer Heaven-Earth Literary Wheel (`Thiên Địa Văn Luân`) and orbiting jade bamboo slips/seals.
- **`getArmorSpec` (`2987–3034`) & `renderSkinBodyArmor(ctx, joints, skinId, awakened, time, characterId?, vx?, vy?)`** (`3051–3981`):
  - `chrono_sovereign` (`sovereign_clockplate`, `2987–2998`, `3184–3285`, `3676–3710`, `3917–3938`): Multi-layer billowing coat-tails (`3189–3217`), high clocktower collar (`3219–3241`), notched cogwheel pauldrons on `shoulderL`/`shoulderR` (`3243–3285`), contoured tapered breastplate (`3678–3710`), animated chest clock dial (`3917–3938`), obi sash (`3885–3890`).
  - `xuan_feng_sage` (`xuan_feng_robe`, `3023–3034`, `3382–3479`, `3793–3850`, `3939–3953`):
    - **Flat white trapezoid torso (`3799–3806`)**: `ctx.moveTo(-9.5, -13); ctx.lineTo(9.5, -13); ctx.lineTo(8.5, 13.5); ctx.lineTo(-8.5, 13.5);` — literally a flat white trapezoid block.
    - **Overlapping double waist rectangles (`3844–3845` + `3886–3890`)**: Draws `fillRect(-7.8, 4.6, 15.6, 3.0)` then generic obi `fillRect(-7.2, 8.5, 14.4, 4.2)` on top, with **no hanging jade pendant**.
    - **Single merged lower robe hem (`3382–3478`)**: Only one back-trailing polygon + shadow layer; **no separate front & back coattails** swaying independently.
    - **Missing scholar collar, shoulder accents, and wide flowing sleeves**: `xuan_feng_robe` bypasses the `else` pauldron block (`3480`), draws nothing on `neck` or `shoulderL/elbowL/handL` / `shoulderR/elbowR/handR`, so arms remain bare thin sticks instead of wide flowing scholar sleeves.

### 1.5 Weapon (`src/game/renderer/weapons.ts`)
- `renderWeapon(ctx, joints, weapon, time, whiteFlash, skinId?, accentOverride?)` (`449+`):
  - `chrono_sovereign` (`556–688`) + `renderOffhandChronoHand` (`279–447`): High-density Celestial Astrolabe (`outerR = 22/26`) with rotating meridian ring, 8 swept blade fins, tilted elliptical orbit band, counter-rotating inner gear ring (`632–659`), sun-moon core jewel + moving clock hands.
  - `xuan_feng_sage` (`809–968`, inside `case 'ink_brush': case 'golden_ink_brush':`):
    - **Shaft (`863–901`)**: Single rounded stroke (`-14` to `shaftLen - 10`) with 4 plain 1.5px teal ticks (`[-2, 16, 34, 52]`) — **missing pale-gold metallic segmented joints/collars**.
    - **Ferrule (`903–913`)**: Plain `rect(shaftLen - 11, -4.3, 9, 8.6)` with a red stripe — **missing rotating energy ring around the ferrule**.
    - **Tassel (`833–852`)**: Short 1-curve `quadraticCurveTo` from `-14` to `-31` driven only by `Math.sin(safeTime * 6.4)` — **not velocity-driven and lacks multi-segment silk flow** (note `renderWeapon` signature does not currently receive `vx/vy` or motion velocity, only `joints` and `time`).
    - **Bristle tip (`915–966`)**: White bristle with `#2dd4bf`/`#5eead4` tip and `#ffffff`/`#ccfbf1` core + 2 small dots (`d=0..1`).

### 1.6 Ultimate Cutscene (`src/game/UltimateCutscene.ts` & `src/game/Game.ts`)
- `UltimateCutscene.duration = 2.7` (`UltimateCutscene.ts:49`).
- `UltimateCutscene.update(dt, audio, camera)` (`105–157`):
  - Climax beat at `t >= 1.86` (`131–143`), `kanjiDropped` + `camera.addShake(0.95, 0, 1)` + `onKanjiImpact()` at `t >= 2.18` (`146–151`).
  - `isSilhouettePhase()` (`93–99`): `1.55 <= t < 1.92` for non-`scarlet_sheath`.
  - `isWhiteFlashPhase()` (`101–103`): `1.85 <= t < 2.18`.
  - `renderScreen(ctx, viewW, viewH)` (`159–206`): dispatches `chrono` -> `renderTimeStop` (`171–172`), `xuan_feng_sage` -> `renderXuanFengSageScroll` (`173–174`), `mactien` -> `renderSpringScroll` (`175–176`). Note: `Game.ts:4441–4443` calls `cutscene.renderScreen(...)` as the final top-most full-screen layer.
- **`chrono_sovereign` Reference — `renderTimeStop(ctx, viewW, viewH)` (`1790–2055`)**:
  - **Phase 1 (`t < 1.55`, dark midnight backdrop)**: Radial gradient (`#1e1405 -> #0d0903 -> #030407`), 12 celestial rays, outer gold-azure ring, 3 counter-rotating `drawCutsceneGear` wheels (`1861–1890`), dial ring + 60 ticks + 12 Roman numerals (`XII..XI`) + 3 beveled reversing clock hands + pivot jewel (`1892–1987`).
  - **Phase 2 (`1.55 <= t < 2.18`, shatter transition)**: Dark `#120b03` fill, 14 radial temporal fracture cracks, 12 flying shattered clockface wedge shards, freeze flash wash (`1991–2051`).
  - **Phase 3 (`t >= 2.18`)**: Calls `renderKanjiStamp(ctx, safeW, safeH, primary)` (`923–971`), placing a framed square Kanji stamp with `#0b0c10` border and ink splatters on the right (`viewW * 0.64, viewH * 0.48`).
  - Note: `UltimateCutscene.ts` does **not** currently import `renderStickman` (`grep` confirmed 0 occurrences).
- **`xuan_feng_sage` Current — `renderXuanFengSageScroll(ctx, viewW, viewH)` (`2466–3183`)**:
  - **Washed-out white background (`2490–2520`)**: Draws an opaque bright Xuan-paper scroll (`#e2e8f0 -> #f8fafc -> #f1f5f9`) across `scrollHalfW = safeW * 0.485` for the **entire** `0..2.7s` duration, violating the deep ink-night (`#070d12`) requirement and hiding the game world.
  - **Crude paper-doll stickman (`2761–2932`)**: Hand-draws a quadratic robe blob (`2798–2808`), plain circle head `ctx.arc(0, -54, 10.5)` (`2845`), dot bun (`2851`), single-line hairpin (`2858`), triangle sleeve (`2832–2838`), and crude brush (`2867–2928`) instead of using `renderStickman`.
  - **No 3-phase structure (`0%–45%`, `45%–70%`, `70%–100%`)**: Plays one continuous scroll-unfurl (`progress 0..1`) with no Phase 1 Literary Wheel Convergence (`0%–45%`), no Phase 2 radial ink/silk speedline + shattered bamboo-slip space shatter (`45%–70%`), and no Phase 3 dark-ground full-detail `renderStickman` on left + Cinnabar-Red/Jade-Teal Seal Frame slamming `春` on right + screen shake & Impact Frame flash (`70%–100%`). Also note the corner seal at `3175` stamps `'靜'` instead of `'春'`.

---

## 2. Logic Chain

1. **Why `xuan_feng_sage` looks flat in-game (R2)**:
   - Observation 1.4 shows `renderSkinBodyArmor` draws a simple 4-vertex trapezoid (`-9.5..9.5`, `-13..13.5`) with zero collar, zero sleeves on arm joints, zero shoulder detail, and overlapping waist `fillRect`s, plus a single back-trailing hem instead of split front/back coattails.
   - Observation 1.4 also shows `renderSkinBackAttachment` & `renderAwakenedBackForm` only draw 1 Enso `arc` and 4 flat 2D `rect` slips (no middle octagonal/8-tick ring, no 3D elliptical depth-sorted slip orbit), and `renderHeroHeadGear` omits `drawInkEyeSlit` in non-awakened state.
   - Observation 1.3 shows `StickmanRenderer.ts` omits `mactien`/`xuan_feng_sage` from both `renderDarkInkAura` (ground aura) and `joints.motionArc`.
   - Observation 1.5 shows `weapons.ts` omits pale-gold joints, a rotating ferrule energy ring, and a multi-segment velocity-driven tassel (note `renderWeapon` lacks `vx/vy` unless passed or inferred from `poseTime`/optional params).
   - Therefore, R2 requires upgrading `gear.ts` (3-layer Heaven-Earth Literary Wheel + depth-sorted 3D elliptical bamboo slips/seals in both normal and awakened back layers, multi-piece scholar robe with separate front/back coattails + collar + hanging jade pendant + flowing sleeves + non-awakened eye glint), `weapons.ts` (pale-gold metallic joints, rotating ferrule ring, flowing multi-segment silk tassel), and adding `xuan_feng_sage` hooks in `StickmanRenderer.ts` (`renderDarkInkAura` & `motionArc`).

2. **Why `xuan_feng_sage`'s Ultimate Cutscene fails R3**:
   - Observation 1.6 shows `renderXuanFengSageScroll` renders an opaque white paper scroll for `0..2.7s` and draws a custom circle-and-blob character inside `UltimateCutscene.ts`.
   - Observation 1.3 & 1.6 show `renderStickman` (`StickmanRenderer.ts:935`) is a pure stateless Canvas2D export (`renderStickman(ctx, opts)`), and `getCharacterDef('mactien', 'xuan_feng_sage')` (`characters.ts:1209`) provides full character render options.
   - Furthermore, `UltimateCutscene.ts:146–151` triggers `kanjiDropped` at `t = 2.18` (`80.7%` of `2.7s`), whereas R3 defines Phase 3 as `70%–100%` (`1.89s–2.70s`), and `renderXuanFengSageScroll` has no Impact Frame flash or Phase 2 space shatter.
   - Therefore, R3 requires replacing `renderXuanFengSageScroll` with a 3-phase `#070d12` ink-night sequence: Phase 1 (`0%–45%`, `0..1.215s`) 3 concentric Literary Wheels + inward ink/petal vortex; Phase 2 (`45%–70%`, `1.215..1.89s`) radial ink/jade speedlines + shattered bamboo slips/scripture pages flying toward camera; Phase 3 (`70%–100%`, `1.89..2.70s`) real `renderStickman` (`mactien:xuan_feng_sage`, `awakened: true`) on the left in radiant aura + vibrant Cinnabar-Red/Jade-Teal Seal Frame slamming `春` on the right + Impact Frame flash & camera shake (aligning `update()` shake/impact trigger for `xuan_feng_sage` at `t >= 1.89` / `progress >= 0.70` if needed).

---

## 3. Caveats

- **Excluded files untouched**: Per dispatch constraints, `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, and `AudioEngine.ts` were NOT read or inspected.
- **`vx`/`vy` availability in `renderWeapon` & `renderSkinBackAttachment`**:
  - `StickmanRenderer.ts:1178` calls `renderSkinBackAttachment(ctx, joints, opts.skinId ?? 'default', isAwakened, safePoseTime, opts.characterId)` (does not pass `vx`/`vy`), and `StickmanRenderer.ts:1322` calls `renderWeapon(ctx, joints, opts.weapon, safePoseTime, Boolean(opts.whiteFlash), opts.skinId, opts.inkAccent)` (does not pass `vx`/`vy`). Adding optional `vx = 0, vy = 0` parameters (mirroring `renderSkinBodyArmor` at `gear.ts:3058-3059`) or passing `opts.vx, opts.vy` from `StickmanRenderer.ts` enables true velocity-driven weapon tassels without breaking existing callers.
- **3D Back/Front Z-sorting for Bamboo Slips**:
  - `renderSkinBackAttachment` (`StickmanRenderer.ts:1178`) runs **before** torso/head/armor (`1268–1313`). If Layer 3 orbiting jade bamboo slips/seals need true in-front-of-body vs behind-body occlusion (`sin(ang) > 0` in front, `sin(ang) < 0` behind), either back-half slips render in `renderSkinBackAttachment` and front-half slips render after `renderSkinBodyArmor`/`renderHeroHeadGear` (or in `renderHeroHeadGear`/front hook), OR depth-sorted relative to the Enso/Middle Wheel behind the back.
- **`UltimateCutscene.ts` Phase 3 impact beat (`t = 1.89` vs `t = 2.18`)**:
  - `UltimateCutscene.ts:146` triggers `kanjiDropped` + `camera.addShake(0.95, 0, 1)` + `onKanjiImpact()` at `t >= 2.18`. If `xuan_feng_sage` Phase 3 starts at `70%` (`1.89s`), `update()` (`131–151`) should be checked so the heavy seal-slam shake aligns with `1.89s` (or `sheathClicked` at `1.86s` + `kanjiDropped` at `1.89s`/`2.18s`).

---

## 4. Conclusion

Implementer agents for **R2** and **R3** should target the following exact locations:

1. **R2 — `src/game/renderer/gear.ts`**:
   - **`renderHeroHeadGear` (`531–618`)**: Add sharp jade-teal eye glint (`drawInkEyeSlit` style) and refined jade hairpin detail; also upgrade `renderAwakenedHeadForm` (`5611–5642`) with luminous jade-teal eye glint + moonlight crescent crown.
   - **`renderSkinBackAttachment` (`2377–2485`) & `renderAwakenedBackForm` (`4937–5008`)**: Replace the single Enso arc + 2D rects with the **3-Layer Heaven-Earth Literary Wheel (`Thiên Địa Văn Luân`)** (Layer 1 thick-thin Enso brush ring with ink-wash bleed; Layer 2 octagonal/scripture ring with 8 counter-rotating engraved ticks; Layer 3 4–6 Jade Bamboo Slips / Small Seals orbiting on a 3D elliptical path with front/back depth sorting). Apply full 3-layer wheel + moonlight-jade glow + petals in `renderAwakenedBackForm` too.
   - **`renderSkinBodyArmor` (`3382–3479`, `3793–3850`, `3885–3890`)**: Replace flat trapezoid torso (`3799–3806`) with multi-layered contoured scholar robe, add high scholar collar around `neck`, separate front & back swaying coattails at `hip`, non-overlapping jade-teal waist sash with hanging jade pendant (`Ngọc Bội`), and wide flowing scholar sleeves anchored to `shoulderL/elbowL/handL` and `shoulderR/elbowR/handR` reactive to attack/pose direction.
2. **R2 — `src/game/renderer/weapons.ts` & `src/game/StickmanRenderer.ts`**:
   - **`renderWeapon` `xuan_feng_sage` (`811–968`)**: Add pale-gold metallic joints along the jade shaft, a rotating energy ring around the ferrule (`shaftLen - 11`), a multi-segment velocity-driven flowing silk tassel (pass optional `vx, vy` from `StickmanRenderer.ts:1322`), and high-contrast white-core / jade-teal brush tip.
   - **`StickmanRenderer.ts`**: Add `mactien` / `xuan_feng_sage` entries to `renderDarkInkAura` (`1628–1765`, elliptical ink/jade ground aura with petals/calligraphy ticks) and `joints.motionArc` (`1077–1117`).
3. **R3 — `src/game/UltimateCutscene.ts`**:
   - Replace `renderXuanFengSageScroll` (`2466–3183`) with a **3-phase `#070d12` dark ink-night cutscene** matching `renderTimeStop`'s dramatic contrast:
     - **Phase 1 (`0%–45%`, `0..1.215s`)**: `#070d12` backdrop, 3 giant concentric counter-rotating Literary Wheels (calligraphy chars + Enso + jade-teal/pale-gold rims) scaling up at center + inward vortex of ink ribbons and petals.
     - **Phase 2 (`45%–70%`, `1.215..1.89s`)**: Radial ink streaks & jade-teal silk speedlines bursting outward from center + perspective shattered bamboo slips / scripture pages flying toward camera.
     - **Phase 3 (`70%–100%`, `1.89..2.70s`)**: Import and call real `renderStickman` (`StickmanRenderer.ts:935`) + `getCharacterDef('mactien', 'xuan_feng_sage')` (`characters.ts:1209`) on the left inside a radiant Moonlight-Jade aura (zero crude stickman); slam down a vibrant Cinnabar-Red / Jade-Teal Seal Frame stamping massive razor-sharp `春` on the right; include screen shake + Impact Frame flash.
   - Update `skinVfx.ts:715–717` (`cutsceneAccent: '#070d12'`) and `characters.ts:1159–1192` if pale-gold (`#fde68a`) accent alignment is desired.

---

## 5. Verification Method

1. **Static Invariants** (run in `/storage/emulated/0/Antigravity/Stickman`):
   - Confirm 0 occurrences of `ctx.shadowBlur` across `src/`.
   - Confirm 0 occurrences of `performance.now(` in `src/game/renderer/` and `src/game/UltimateCutscene.ts`.
   - Confirm balanced `ctx.save()` / `ctx.restore()` (using `try { ... } finally { ctx.restore(); }`) in every modified render function in `gear.ts`, `weapons.ts`, `StickmanRenderer.ts`, and `UltimateCutscene.ts`.
2. **Type-Check & Build** (run in `/data/user/0/com.agy/files/stickman-build`):
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   node node_modules/vite/bin/vite.js build && cp -r dist/. "/storage/emulated/0/Antigravity/Stickman/dist/"
   ```
3. **Invalidation Conditions**:
   - Any non-zero `tsc` error, any `ctx.shadowBlur` in `src/`, any `performance.now()` in `src/game/renderer/` or `UltimateCutscene.ts`, any imbalanced `ctx.save()`/`ctx.restore()`, or any edit to excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) invalidates completion.
