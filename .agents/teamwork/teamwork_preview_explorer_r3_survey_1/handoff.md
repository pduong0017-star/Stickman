# Survey Explorer 1 Handoff — Playable Characters, Skins & StickmanRenderer (Ink-Wash Overhaul)

**Core Finding**: All **6 playable characters** and **18 skins** are wired in `characters.ts` and `skinVfx.ts`, and `src/` already has **zero `ctx.shadowBlur`**. However, `StickmanRenderer.ts` and `src/game/renderer/*` currently draw characters as uniform-width round-capped vector sticks with flat cel-fills, and **6 newer character/skin forms** (`kuro:eclipse_ronin`, `aether` × 2, `valkyrie` × 3) are missing or misrouted in `gear.ts`, `trails.ts`, and `StickmanRenderer.ts` (`renderDarkInkAura` / sheath).

---

## 1. Observation

### 1.1 Complete Inventory of 6 Playable Characters & 18 Skins
Verified in `src/game/types.ts` (lines 5–42), `src/game/characters.ts` (lines 91–886), and `src/game/skinVfx.ts` (lines 46–551). Total: **6 fighters, 18 `(CharacterId, SkinId)` entries**.

| # | Char ID | Skin ID (Rarity) | Name / Codename | Body / Awakened / Glow / Accent | Scarf (Primary / Highlight) | Weapon (Base / Awakened) & Sheath | HeadGear | Aura (Base / Awakened) | Ultimate Kanji & VFX Motif |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `kuro` | `default` | Mặc định / Hắc Kiếm Sĩ | `#7c5cff` / `#8b5cf6` / `#8b5cf6` / `#a855f7` | `#2563eb` / `#60a5fa` | `katana` / `blood_greatsword`, sheath: `true` | `none` | `purple` / `crimson` | `断` · `iaido_ink` |
| 2 | `kuro` | `radiant_seraph` | Radiant Seraph / Đại Thiên Thần | `#f1f5f9` / `#fef9c3` / `#facc15` / `#fbbf24` | `#fef3c7` / `#ffffff` | `seraph_blade` / `seraph_greatsword`, sheath: `true` | `seraph_helm` | `gold` / `gold` | `光` · `seraph_feathers` |
| 3 | `kuro` | `void_walker` | Void Walker / Hư Không Hành Giả | `#1e1b4b` / `#312e81` / `#a855f7` / `#c084fc` | `#581c87` / `#d8b4fe` | `void_blade` / `void_greatsword`, sheath: `true` | `void_helm` | `purple` / `purple` | `虚` · `void_rift` |
| 4 | `kuro` | `eclipse_ronin` (`mythic`) | Eclipse Ronin / Nhật Thực Lãng Khách | `#09090b` / `#450a0a` / `#f97316` / `#fb923c` | `#dc2626` / `#fde047` | `katana` / `blood_greatsword`, sheath: `true` | `oni_horns` | `ember` / `crimson` | `蝕` · `eclipse_blade` |
| 5 | `raijin` | `default` | Mặc định / Lôi Thương | `#06b6d4` / `#22d3ee` / `#06b6d4` / `#38bdf8` | `#ca8a04` / `#fef08a` | `volt_spear` / `thunder_halberd`, sheath: `false` | `volt_visor` | `cyan` / `gold` | `雷` · `volt_arc` |
| 6 | `raijin` | `storm_shogun` | Storm Shogun / Lôi Thần Tướng Quân | `#1d4ed8` / `#60a5fa` / `#facc15` / `#fbbf24` | `#f8fafc` / `#fde047` | `volt_spear` / `thunder_halberd`, sheath: `false` | `shogun_crest` | `gold` / `gold` | `霆` · `shogun_drums` |
| 7 | `raijin` | `cyber_valkyrie` | Cyber Overdrive / Chiến Thần Cơ Giới | `#0f172a` / `#1e1b4b` / `#e879f9` / `#f0abfc` | `#0891b2` / `#67e8f9` | `volt_spear` / `thunder_halberd`, sheath: `false` | `cyber_visor` | `cyan` / `purple` | `電` · `cyber_glitch` |
| 8 | `kagura` | `default` | Mặc định / Hỏa Diệm Đao | `#e11d48` / `#f97316` / `#f97316` / `#fb7185` | `#1e293b` / `#f97316` | `flame_nodachi` / `solar_greatblade`, sheath: `true` | `flame_band` | `ember` / `ember` | `炎` · `flame_lick` |
| 9 | `kagura` | `solar_phoenix` | Solar Phoenix / Phượng Hoàng Bất Tử | `#b91c1c` / `#f59e0b` / `#facc15` / `#fde047` | `#fef3c7` / `#ffffff` | `flame_nodachi` / `solar_greatblade`, sheath: `true` | `phoenix_crown` | `gold` / `gold` | `鳳` · `phoenix_plume` |
| 10 | `kagura` | `frost_empress` | Frostfire Oni / Băng Hỏa Ma Đế | `#1e293b` / `#0e7490` / `#22d3ee` / `#38bdf8` | `#3b0764` / `#67e8f9` | `flame_nodachi` / `solar_greatblade`, sheath: `true` | `oni_horns` | `cyan` / `purple` | `蒼` · `frostfire_crystal` |
| 11 | `zero` | `default` | Mặc định / Ảnh Sát Thủ | `#10b981` / `#34d399` / `#10b981` / `#34d399` | `#047857` / `#a7f3d0` | `twin_daggers` / `void_sabers`, sheath: `false` | `phantom_eyes` | `emerald` / `emerald` | `影` · `shadow_wisps` |
| 12 | `zero` | `blood_moon` | Blood Moon / Huyết Nguyệt Sát Thần | `#18181b` / `#4c0519` / `#f43f5e` / `#fb7185` | `#be123c` / `#fecdd3` | `twin_daggers` / `void_sabers`, sheath: `false` | `kitsune_mask` | `ember` / `crimson` | `血` · `blood_crescent` |
| 13 | `zero` | `astral_phantom` | Astral Phantom / Tinh Vân Ảo Ảnh | `#1e1b4b` / `#312e81` / `#38bdf8` / `#7dd3fc` | `#4338ca` / `#fde047` | `twin_daggers` / `void_sabers`, sheath: `false` | `astral_hood` | `purple` / `cyan` | `星` · `astral_constellation` |
| 14 | `aether` | `default` | Mặc định / Đại Pháp Sư · VIP | `#4c1d95` / `#c026d3` / `#e879f9` / `#f472b6` | `#7c3aed` / `#38bdf8` | `arcane_hands` / `prismatic_hands`, sheath: `false` | `astral_halo` | `purple` / `gold` | `宙` · `arcane_sigil` |
| 15 | `aether` | `prismatic_archon` | VIP · Cầu Vồng Tinh Tú / Pháp Thần Đa Sắc | `#1e1b4b` / `#312e81` / `#e879f9` / `#38bdf8` | `#7c3aed` / `#fde047` | `arcane_hands` / `prismatic_hands`, sheath: `false` | `astral_halo` | `gold` / `cyan` | `虹` · `prismatic_nova` |
| 16 | `valkyrie` | `default` (`classic`) | Mặc định / Thánh Quang Chiến Nữ | `#f8fafc` / `#fef08a` / `#facc15` / `#fde047` | `#d97706` / `#fef9c3` | `valkyrie_glaive` / `valkyrie_excalibur`, sheath: `false` | `valkyrie_wings` | `gold` / `gold` | `聖` · `valkyrie_radiance` |
| 17 | `valkyrie` | `celestial_empress` (`mythic`) | Celestial Empress / Nữ Hoàng Tinh Tú | `#0f172a` / `#1e3a8a` / `#38bdf8` / `#7dd3fc` | `#0284c7` / `#fde047` | `valkyrie_glaive` / `valkyrie_excalibur`, sheath: `false` | `valkyrie_wings` | `cyan` / `gold` | `星` · `celestial_halo` |
| 18 | `valkyrie` | `abyssal_valkyrie` (`legendary`) | Abyssal Valkyrie / Nữ Thần Nhật Thực | `#18181b` / `#4c0519` / `#f43f5e` / `#fb7185` | `#9f1239` / `#e879f9` | `valkyrie_glaive` / `valkyrie_excalibur`, sheath: `false` | `valkyrie_wings` | `purple` / `crimson` | `堕` · `abyssal_eclipse` |

Note on `Player.ts` Awakening Scarf Overrides (`animation.ts:179-357`, `Player.ts:2272-2273`): when `awakened === true`, `scarfPrimary` and `scarfHighlight` are taken from `getAwakenedVisualProfile(characterId, skinId)`, which has explicit entries for all 18 `(characterId, skinId)` combinations.

---

### 1.2 Architecture of `StickmanRenderer.ts`, `renderer/*`, `poses/*`, `animation.ts`, and `Player.ts`

1. **Skeleton & Pose Pipeline**:
   - `src/game/poses/types.ts` defines `BasicPoseName` (`'idle' | 'run' | 'brake_skid' | 'jump' | 'fall' | 'land' | 'dash' | 'parry'`) and `PoseDraft`.
   - `src/game/poses/index.ts` maps `POSE_MODULES` (`kuro`, `raijin`, `kagura`, `zero`, `aether`, and **`valkyrie: raijinPoses`** at line 20). `computeBasicCharacterSkeleton()` evaluates the module and calls `buildSkeletonFromDraft()`.
   - `src/game/poses/poseMath.ts` defines anatomical constants (`TORSO_LEN=34`, `HEAD_OFFSET=13`, `THIGH_LEN=26`, `SHIN_LEN=26`, `UPPER_ARM_LEN=19`, `FOREARM_LEN=19`) and `solveSafeTwoBoneIK()` with `sanitizeFinite()`, `sanitizeVec2()`, `clampToReach()`, `resolveElbowBendDir()`.
   - `src/game/StickmanRenderer.ts:46-766` (`computeStickmanSkeleton`) routes `isBasicPoseName(pose)` to `computeBasicCharacterSkeleton()`, and handles 38+ combat/special/enemy/boss poses (`attack_1..4`, `iai_draw_slash`, `spear_*`, `nodachi_*`, `dagger_*`, `katana_zantetsu_cut`, `cryo_*`, `awaken_pose`, `float_cast`, etc.) via `buildSkeletonFromDraft()`.
   - `src/game/animation.ts`:
     - `blendSkeleton(prev, target, alpha)` (lines 69-123) interpolates anchors and re-solves 2-bone IK every frame (`Player.ts:1199-1227`, `stepSkeletonBlend`).
     - `getComboMoveForCharacter()` (lines 397-1152) defines distinct combo tables for `raijin`, `zero`, `kagura`, and `kuro` (`aether` and `valkyrie` fall back to `kuroTable` here, with `Player.ts` overriding `aether`'s trail suppression & palm bursts at lines 1832 & 1900-1921).
2. **Rendering Pipeline (`Player.ts:2198-2297` → `StickmanRenderer.ts:808-1171`)**:
   - `Player.render()` draws: `renderAfterimages()` (`trails.ts:6`) → `skillLinkTimer` dashed ring (`Player.ts:2207`) → `parryFlashTimer` arc (`Player.ts:2223`) → `renderStickman()` (`StickmanRenderer.ts:808`) → `renderSlashTrails()` (`trails.ts:689`).
   - `renderStickman()` also serves `Boss.ts:1694` and `Enemy.ts:1015` (with `silhouette`, `whiteFlash`, `bossOutfit`, `capeColor`).
   - Draw order inside `renderStickman(ctx, opts)` (`StickmanRenderer.ts:808-1171`):
     1. `renderDarkInkAura()` (world space at `opts.x, opts.y`, lines 822-833)
     2. `renderCelScarf()` (world space Verlet chain `opts.scarf`, lines 836-838)
     3. `ctx.save(); ctx.translate(opts.x, opts.y); ctx.scale(opts.facing * scaleX, scaleY)` (lines 840-842)
     4. Optional Fable skate arc (845-860), `joints.motionArc` (863-877), `renderAttackSwingAura()` (880-887)
     5. Boss cape (890-905), `renderSkinBackAttachment()` (`gear.ts:400`, lines 908-910), `renderAwakenedBackForm()` (`gear.ts:1117`, lines 913-915)
     6. Floor glossy reflection + ground ellipse shadow using `GROUND_Y` (928-948)
     7. Additive silhouette rim glow (`globalCompositeOperation='lighter'`, `lw+9`, `headR+4.5`, lines 951-957)
     8. **Outline pass**: `strokeSkeletonLimbs(ctx, joints, lw + 4.4, headR + 2.3, '#0b0c10')` (lines 960-962)
     9. **Back/Torso/Head fill pass**: `strokeSkeletonLimbs(ctx, joints, lw, headR, fillColor, true, false)` (line 965) + single thin arc head highlight (968-977)
     10. `renderBossOutfitDetails()` (980-982), `renderSkinBodyArmor()` (`gear.ts:946`, lines 985-987), `renderHeroHeadGear()` (`gear.ts:4`, lines 990-992), `renderAwakenedHeadForm()` (`gear.ts:1460`, lines 995-997)
     11. Waist sheath (`hasSheath`, lines 1000-1041)
     12. `renderWeapon()` (`weapons.ts:4`, lines 1044-1046)
     13. **Front limb fill pass**: `strokeSkeletonLimbs(ctx, joints, lw, headR, fillColor, false, true)` (line 1049)
     14. Scarf neck collar (1052-1063), Zero off-hand dagger (1066-1088), Aether off-hand orb & parry barrier (1088-1148), Haiku shield (1151-1167)
     15. `ctx.restore()` (line 1169)

---

### 1.3 Concrete Visual Gaps vs Japanese Ink-Wash / Thủy mặc Style & Skin Completeness
Observed directly in `StickmanRenderer.ts`, `renderer/gear.ts`, `renderer/weapons.ts`, `renderer/trails.ts`:

1. **Flat Uniform Vector Limbs (`StickmanRenderer.ts:768-806`)**:
   - `strokeSkeletonLimbs` draws 2-segment `lineTo` limbs with uniform `lineWidth` (`lw * 0.94..1.12`) and `lineCap = 'round'`. There is **no calligraphic brush tapering** (thick shoulder/thigh → tapered wrist/ankle), **no ink-wash dry-brush bristle edge**, **no inner cel/sumi-e shadow pass** on limbs/torso, and **no directional rim light** on torso/limbs (only a 2.2px white arc on the head at lines 970-975).
2. **Flat Cel Scarf (`StickmanRenderer.ts:1330-1359`)**:
   - `renderCelScarf` renders straight segment `lineTo` strokes with 3 flat layers (outline, primary, centered highlight) rather than smooth quadratic splines, ink-frayed/tapered swallowtail tips, or rim-lit cloth folds.
3. **Missing Skin & Character Visuals in `renderer/gear.ts`**:
   - `renderSkinBackAttachment()` (`gear.ts:400-941`) handles only 9 skins; **`kuro:eclipse_ronin`**, **`aether:default`**, **`valkyrie:default`**, **`valkyrie:celestial_empress`**, and **`valkyrie:abyssal_valkyrie`** have **no back attachment** in `renderSkinBackAttachment` (Valkyrie's wings are instead hardcoded inside `renderHeroHeadGear` at lines 22-38 with fixed yellow `#facc15`/`#fde047`, ignoring `celestial_empress` and `abyssal_valkyrie` palettes!).
   - `renderSkinBodyArmor()` (`gear.ts:946-1108`) handles 8 skins; **`kuro:eclipse_ronin`**, **`aether:default`**, **`aether:prismatic_archon`**, **`valkyrie:default`**, **`valkyrie:celestial_empress`**, **`valkyrie:abyssal_valkyrie`**, and all 4 `default` base fighters (`kuro`, `raijin`, `kagura`, `zero`) have **zero torso armor/haori/obi/sash silhouette** — leaving base fighters as bare stick torsos.
   - `renderAwakenedBackForm()` (`gear.ts:1117-1455`) and `renderAwakenedHeadForm()` (`gear.ts:1460-1757`) only switch on `'kuro' | 'raijin' | 'kagura' | 'zero'`. **`aether` and `valkyrie` have NO `renderAwakenedBackForm` or `renderAwakenedHeadForm` implementation**; and `kuro`'s branches miss `eclipse_ronin`.
   - `renderHeroHeadGear()` (`gear.ts:4-393`): `'oni_horns'` (lines 269-296) hardcodes icy `#bae6fd`/`#0369a1` even though `kuro:eclipse_ronin` uses `headGear: 'oni_horns'` (orange/crimson ronin); `'valkyrie_wings'` (15-60) hardcodes gold `#facc15`/`#fef08a` for all 3 Valkyrie skins; `'astral_halo'` (357-391) doesn't adapt to `prismatic_archon`; `'volt_visor'` (61-65) and `'phantom_eyes'` (86-100) are simple 2-4 line rectangles/triangles lacking ink-wash polish.
4. **Missing Character/Skin Branches in `StickmanRenderer.ts`**:
   - Waist sheath (`StickmanRenderer.ts:1000-1041`) only checks `radiant_seraph` and `void_walker`; `eclipse_ronin`, `solar_phoenix`, and `frost_empress` get the default Kuro dark/red sheath.
   - `renderDarkInkAura()` (`StickmanRenderer.ts:1173-1328`) `skinMap` omits `eclipse_ronin`, `prismatic_archon`, `celestial_empress`, `abyssal_valkyrie`; `coreColor` defaults to `#0d0b12` and tendrils fall to the generic 7-tendril fallback.
5. **Broken/Incomplete Motif Routing in `renderer/trails.ts`**:
   - `inferCharacterForSkin()` (`trails.ts:18-32`) omits `eclipse_ronin`, `prismatic_archon`, `celestial_empress`, `abyssal_valkyrie`, and weapons `arcane_hands`, `prismatic_hands`, `valkyrie_glaive`, `valkyrie_excalibur`.
   - `renderAttackSwingAura()` (`trails.ts:43`) passes `opts.awakenedForm` (which is `null` when unawakened) instead of `opts.characterId` into `inferCharacterForSkin()`.
   - Both `renderAttackSwingAura()` (`trails.ts:69-266`) and `renderSlashMotifOrnament()` (`trails.ts:331-682`) only implement 12 motifs; all 6 newer motifs (`eclipse_blade`, `arcane_sigil`, `prismatic_nova`, `valkyrie_radiance`, `celestial_halo`, `abyssal_eclipse`) fall through to `iaido_ink` / no-op.
6. **Weapons (`renderer/weapons.ts`)**:
   - `katana` (lines 28-61) has no `eclipse_ronin` skin theming (plain silver blade even on mythic `eclipse_ronin`), `blood_greatsword` (379-412) doesn't adapt to `eclipse_ronin`, and Zero's off-hand dagger in `StickmanRenderer.ts:1066-1088` is a straight thick line rather than calling a shared stylized dagger helper from `weapons.ts`.

---

### 1.4 Static Audit: `ctx.shadowBlur`, `ctx.save()`/`ctx.restore()`, `NaN`, and Android Canvas 2D Perf
Verified via `grep_search` and Python audit script across `src/` and unit tests (`17/17` pass in `src/game/rules.test.ts`):

| Check | Status / Location | Finding & Risk |
|---|---|---|
| `ctx.shadowBlur` | **0 occurrences** across entire `src/` | Clean baseline. Must remain `0` in all new Ink-Wash code. |
| `ctx.save()` / `ctx.restore()` | `StickmanRenderer.ts` (15/15), `gear.ts` (40/40), `weapons.ts` (3/4, early return on `whiteFlash`), `trails.ts` (18/23, 5 early `continue`s), `Player.ts` (2/2) | **Currently balanced on all paths**, including early returns/continues. However, `weapons.ts:23` and `trails.ts:751,792,835,895,909` duplicate `ctx.restore()` before early exits — fragile if new nested `save()` blocks are added. |
| Per-frame gradient allocations | `gear.ts:672` (`createRadialGradient`), `gear.ts:693` (`createLinearGradient`) | Allocated **every frame** when `kuro:void_walker` is awakened. Avoid `create*Gradient` inside render loops on Android Canvas 2D (use layered flat/alpha ink polygons or cached patterns/sprites). |
| `destination-out` composite op | `gear.ts:905` followed immediately by `gear.ts:907` (`source-over`) | Dead composite state toggle inside `blood_moon` crescent render; remove to avoid GPU/pipeline flush. |
| `setLineDash` calls | `gear.ts:430,566,684,1193`, `weapons.ts:38`, `Player.ts:2214` | All wrapped inside `save/restore` or reset with `setLineDash([])`, but frequent `setLineDash` mutates dash arrays per frame; minimize inside loops. |
| `NaN` / non-finite math risks | `StickmanRenderer.ts:840-842,1184,1347`; `trails.ts:39,691`; `gear.ts:4-1757` | `poses/poseMath.ts` (`buildSkeletonFromDraft`) sanitizes all joint outputs, **but** `renderStickman` does not guard `opts.x`, `opts.y`, `opts.poseTime`, `opts.scaleX`, `opts.scaleY`, or `opts.scarf` node coords against `NaN`/`Infinity`. Also `computeStickmanSkeleton` non-basic poses (`StickmanRenderer.ts:69-753`) do `t / 0.2` without clamping `t >= 0` first (relying on `buildSkeletonFromDraft` fallback). |
| `globalCompositeOperation = 'lighter'` | `StickmanRenderer.ts` (3x), `gear.ts` (10x), `trails.ts` (4x), `weapons.ts` (1x) | Always inside `save/restore`, safe, though overuse washes out deep sumi-e ink contrast if drawn over dark ink fills instead of behind/rim. |

---

## 2. Logic Chain

1. Because `Player.ts`, `Boss.ts`, and `Enemy.ts` all render through `renderStickman(ctx, opts)` (`StickmanRenderer.ts:808`), and `Player.ts` feeds `blendedJoints` from `blendSkeleton()` + `computeStickmanSkeleton()` (`poses/*`, `poseMath.ts`), upgrading the visual fidelity in `StickmanRenderer.ts` and `src/game/renderer/*` preserves 100% of bone IK (`TORSO_LEN`, `THIGH_LEN`, `SHIN_LEN`, `UPPER_ARM_LEN`, `FOREARM_LEN`), hitboxes (`Player.ts:2070-2126`), and `rules.test.ts` invariants.
2. Because `trails.ts:43` (`renderAttackSwingAura`) ignores `opts.characterId` and omits 6 motifs in both `renderAttackSwingAura` and `renderSlashMotifOrnament`, and `gear.ts` omits `eclipse_ronin`, `aether` (2 skins), and `valkyrie` (3 skins) across armor/back/awakened forms, upgrading playable visuals requires **both** a new Ink-Wash rendering primitives/body layer **and** closing the 6-character / 18-skin data & motif parity gaps.
3. Because Android Canvas 2D suffers frame drops from `ctx.shadowBlur`, per-frame `create*Gradient`, and excessive path allocations, Ink-Wash styling (tapered brush limbs, rim-light, cel/ink shadow layers, sumi-e splatters) must be achieved with **multi-pass tapered polygons / precomputed unit offsets + flat/alpha fills** and strict `try/finally` or single-exit `ctx.save()`/`ctx.restore()` discipline.

---

## 3. Caveats

- This survey focused on playable characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`, `valkyrie`), `StickmanRenderer.ts`, `renderer/*`, `poses/*`, `animation.ts`, and `Player.ts`. Enemy & Boss outfits (`renderBossOutfitDetails` in `gear.ts:1759-1906`, `Boss.ts`, `Enemy.ts`, `UltimateCutscene.ts`) are covered by Survey Explorer 2.
- `rules.test.ts` was executed in `/data/user/0/com.agy/files/stickman-build` (`17/17` pass) as baseline verification; `vite build` was not run during this read-only survey.
- Note `poses/index.ts:20` aliases `valkyrie: raijinPoses` and `animation.ts:1050` falls back `aether` and `valkyrie` to `kuroTable` — visual upgrades should NOT alter `ComboMoveSpec` gameplay numbers (`baseDamage`, `duration`, `reachScale`) or `poses/*` joint coordinates unless explicitly scoped.

---

## 4. Conclusion — Recommended Module Ownership & Interface Contracts

### 4.1 Recommended Module Ownership (Playable Character Ink-Wash Upgrade)

| Module | Owner Scope | Responsibilities |
|---|---|---|
| `src/game/renderer/inkStyle.ts` *(new)* | Shared Renderer Foundation | Pure data & fast Canvas 2D Ink-Wash helpers: **18-entry `SkinInkPalette`** (sumi-e base, ink shadow, rim highlight, vermilion/skin accent, armor/haori/collar motif), **tapered calligraphy brush limb/torso polygon drawer** (`drawBrushLimb`, `drawBrushTorso`, `drawInkHead`), finite-number guards, and reusable rim-stroke helper (zero `shadowBlur`, zero per-frame gradients). |
| `src/game/renderer/types.ts` | Shared Contracts | Add `characterId?: CharacterId` usage guarantees and optional ink-wash flags (`inkWash?: boolean`, `rimColor?: string`) on `StickmanRenderOptions` without breaking `Boss.ts` / `Enemy.ts` callers. |
| `src/game/StickmanRenderer.ts` | Core Stickman Pipeline | Replace uniform `strokeSkeletonLimbs` & flat `renderCelScarf` with tapered Ink-Wash brush limbs/torso, cel+sumi-e shading, directional rim light, smooth quadratic flowing scarf/cloak with swallowtail ink tips, skin-aware waist sheath, and `renderDarkInkAura` sumi-e ink-wash puddle/brush wisps for all 18 skins. Fix off-hand dagger rendering to delegate to `weapons.ts`. |
| `src/game/renderer/gear.ts` | Headgear, Armor, Back & Awakened Forms | Upgrade all `headGear` variants (fix `oni_horns` skin-awareness for `eclipse_ronin` vs `frost_empress`, skin-theme `valkyrie_wings` & `astral_halo`), add base & skin **ink-wash armor/haori/obi** for all 6 characters / 18 skins, add `renderSkinBackAttachment` + `renderAwakenedBackForm` + `renderAwakenedHeadForm` for **`aether`**, **`valkyrie`**, and **`kuro:eclipse_ronin`**, and remove the 2 per-frame gradients (`gear.ts:672,693`) and dead `destination-out` (`gear.ts:905`). |
| `src/game/renderer/weapons.ts` | Weapons & Glowing Accents | Upgrade all playable weapons (`katana`, `blood_greatsword`, `seraph_*`, `void_*`, `volt_spear`, `thunder_halberd`, `flame_nodachi`, `solar_greatblade`, `twin_daggers`, `void_sabers`, `arcane_hands`, `prismatic_hands`, `valkyrie_glaive`, `valkyrie_excalibur`) with ink-outline + metallic/ink blade taper + glowing edge rim (no `shadowBlur`), add `eclipse_ronin` blade accents, and export `renderOffhandDagger` for Zero. |
| `src/game/renderer/trails.ts` | Slash Trails, Swing Aura & Afterimages | Fix `inferCharacterForSkin` to prefer `opts.characterId` + support all 18 skins/weapons; implement all 6 missing motifs (`eclipse_blade`, `arcane_sigil`, `prismatic_nova`, `valkyrie_radiance`, `celestial_halo`, `abyssal_eclipse`) in `renderAttackSwingAura` & `renderSlashMotifOrnament`; add ink-wash sumi-e edge/taper to `renderSlashTrails` & `renderAfterimages`. |
| `src/game/Player.ts` & `src/game/characters.ts` | Minimal Integration | Keep `poses/*`, `poseMath.ts`, `animation.ts` combat specs untouched. Ensure `Player.ts` passes `characterId` (already passed at line 2276) and clean finite `poseTime`/`scaleX`/`scaleY`; update `characters.ts` comment/metadata only if needed without breaking `rules.test.ts`. |

### 4.2 Key Interface Contracts to Preserve / Add
1. **Backwards-compatible `renderStickman(ctx, opts)`**: All existing callers (`Player.ts:2256`, `Boss.ts:1694`, `Enemy.ts:1015`) must continue compiling with zero required new fields.
2. **`SkeletonJoints` & `poses/*` immutability**: Do NOT modify `TORSO_LEN`, `THIGH_LEN`, `SHIN_LEN`, `UPPER_ARM_LEN`, `FOREARM_LEN`, `buildSkeletonFromDraft()`, or `blendSkeleton()`. All Ink-Wash armor, cloak, and limb tapering must derive strictly from `SkeletonJoints` positions (`hip`, `spineMid`, `neck`, `head`, `shoulderL/R`, `elbowL/R`, `handL/R`, `kneeL/R`, `footL/R`, `weaponAngle`).
3. **`getSkinInkPalette(characterId?: CharacterId, skinId?: SkinId, awakened?: boolean)`** in `src/game/renderer/inkStyle.ts`:
   - Returns `{ inkOutline, baseFill, shadowFill, rimColor, accentColor, clothPrimary, clothHighlight, metalLight, metalDark, glowCore }` for all 18 `(characterId, skinId)` pairs while honoring `opts.bodyColor` / `opts.glowColor` when rendering `Boss.ts` / `Enemy.ts` or `silhouette`/`whiteFlash` modes.
4. **Canvas Safety Invariants**:
   - `ctx.shadowBlur` strictly forbidden (`0` matches in `src/`).
   - Every function using `ctx.save()` must guarantee `saveCount === restoreCount` on all paths (prefer `try { ... } finally { ctx.restore(); }` or no early returns between `save` and `restore`).
   - All numeric inputs to `translate`/`rotate`/`scale`/`arc`/`quadraticCurveTo` sanitized with `Number.isFinite(...)` so `NaN`/`Infinity` never enters Canvas calls.

---

## 5. Verification Method

1. **Existing Unit Tests (must remain 17/17 pass)**:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
   *(Verified baseline on 2026-11-26: 17/17 passed in `/data/user/0/com.agy/files/stickman-build`.)*
2. **Production Build**:
   Sync `/storage/emulated/0/Antigravity/Stickman/src` → `/data/user/0/com.agy/files/stickman-build/src` and run `node node_modules/vite/bin/vite.js build` (0 TypeScript/bundler errors).
3. **Static & Headless Mock-Canvas Verification**:
   - Static grep: `grep -rn "shadowBlur" src/` returns 0 matches; check `createRadialGradient` / `createLinearGradient` not added in hot per-frame character loops.
   - Headless mock `CanvasRenderingContext2D` test iterating all 6 characters × all 18 skins × `{ normal, awakened }` × key poses (`idle`, `run`, `dash`, `attack_1`, `iai_draw_slash`, `parry`, `awaken_pose`), asserting:
     - `saveDepth === 0` after every `renderStickman`, `renderAfterimages`, `renderSlashTrails` call.
     - Zero `NaN` or `Infinity` arguments passed to any Canvas 2D draw call (`moveTo`, `lineTo`, `quadraticCurveTo`, `arc`, `ellipse`, `translate`, `rotate`, `scale`).
     - Zero `shadowBlur` mutations.
4. **Invalidation Conditions**: Any change to `CHARACTER_SKINS`, `SKIN_VFX_PROFILES`, `StickmanRenderOptions`, or `poses/index.ts` invalidates the 18-skin inventory or `valkyrie -> raijinPoses` mapping and requires re-verifying all 18 render paths.
