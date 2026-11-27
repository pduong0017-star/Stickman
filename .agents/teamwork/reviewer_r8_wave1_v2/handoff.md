# Review Handoff Report — R8 Wave 1 v2 (`reviewer_r8_wave1_v2`)

**Type:** Hard Handoff (Read-Only Verification Complete)  
**Verdicts:**
- **M1 (R1 Full-Screen Domain):** **APPROVE**
- **M2 (R2 High-Density Character, Gear, Weapon & Aura):** **APPROVE** *(1 Minor finding — `vx` sign inversion when `facing === -1`)*
- **M3 (R3 3-Phase Dark Cutscene & Palette Alignment):** **APPROVE** *(1 Minor note — top-left banner box width `248px`)*

---

## 1. Observation

### 1.1 `chrono_sovereign` Benchmark Grep
Ran `grep -rn --exclude="stages.ts" --exclude="BotBrain.ts" --exclude="solo1v1.ts" --exclude="AudioEngine.ts" "chrono_sovereign" src/game`:
- Verified benchmark call sites across `src/game/types.ts` (`26, 51`), `src/game/characters.ts` (`1103`), `src/game/skinVfx.ts` (`635-639`), `src/game/renderer/inkStyle.ts` (`410, 470`), `src/game/renderer/types.ts` (`120`), `src/game/renderer/gear.ts` (`48, 385, 2555, 3334, 3532, 5411, 6239`), `src/game/renderer/weapons.ts` (`292, 556`), `src/game/StickmanRenderer.ts` (`1079, 1661, 1727, 1731`), `src/game/Game.ts` (`258, 1513, 1568, 1590, 4292`), `src/game/PeriodicTableBG.ts` (via `chronoDomainBlend`), `src/components/GameHUD.tsx` (`368-412`), `src/game/UltimateCutscene.ts` (`1810`), and `src/game/animation.ts` / `src/game/Entities.ts` / `src/game/Player.ts` / `src/game/renderer/trails.ts`.
- Confirmed `xuan_feng_sage` Wave 1 (M1–M3) mirrors `chrono_sovereign` across every Wave 1 architectural touchpoint (`types.ts`, `GameHUD.tsx`, `PeriodicTableBG.ts`, `Game.ts`, `renderer/types.ts`, `gear.ts`, `weapons.ts`, `StickmanRenderer.ts`, `UltimateCutscene.ts`, `skinVfx.ts`, `characters.ts`, `inkStyle.ts`).

### 1.2 M1 Verification (R1 Full-Screen Domain)
- `src/game/types.ts:5`: `export type DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng';`
- `src/components/GameHUD.tsx:364-422`: `hud-domain-badge` branches on `hud.domainKind === 'xuan_feng'` with `bg-[#071112]/95`, border `#5eead4`, jade/gold box-shadow, title `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU` (`#f0fdfa` + `#5eead4`), and timer in `#fde68a`.
- `src/game/PeriodicTableBG.ts`:
  - Lines `113, 130-155, 162-233`: `xuanFengDomainBlend` added, included in `resetDomain()`, `getDomainBlend()` (`Math.max(...)`), `getXuanFengDomainBlend()`, and `update()` exponential blending + `domainKind` resolution.
  - Lines `360-375`: `renderScreenBackdrop` dispatches `renderXuanFengDomainScreenBackdrop` and tints `crimsonFlash` with `#5eead4` when `xuanFengDomainBlend > 0.35`.
  - Lines `783-1095`: `renderXuanFengDomainScreenBackdrop` renders `#050c0f -> #0c1b1e -> #112220` ink-night sky, jade/pale-gold halo, distant mountain silhouette, swirling ink-wash clouds, flanking astrolabe rings, Giant Ink-Wash Sun-Moon & Classic Scripture Wheel (3 counter-rotating concentric rings: 24 light rays + dashed gold rim `+0.055t`, 12 calligraphy glyphs `春・風・靜・禮・義・仁・智・信・文・雅・清・和` `-0.09t`, tapered 28-segment Enso brush stroke + Sun-Moon core + cinnabar seal `+0.14t`), and rising jade/pale-gold/peach-petal motes.
  - Lines `1525-1527, 2061-2455`: `renderWorld` dispatches `renderXuanFengDomainWorld`, rendering slow-parallax literary halos, 7 symmetrical anchors (`[-90, 210, 520, 840, 1160, 1480, 1790]` alternating Jade Scholar Pillars and Vertical Hanging Calligraphy Scrolls `春風化雨` / `文雅清和` / `一氣浩然` with cinnabar seals), swaying upper bamboo branches & leaf clusters, edge barrier gates, `renderCombatMistBand`, reflective floor + 3D perspective floor ring at `GROUND_Y + 62` (3 concentric ellipses `[220, 440, 690]`, 12 rotating radials, 12 Earthly Branches `子..亥` + ticks in `#5eead4`/`#fde68a`), player floor pool, and 18 parallax petals/leaves/motes.
- `src/game/Game.ts`:
  - Lines `261-270`: `isXuanFengDomainOwner()` and `'xuan_feng'` in `getDomainOwnerKind()`.
  - Lines `444-453, 488-497, 656-664, 729-733`: Clean resets in `setCharacter`, `setSkin`, `enterTitleState`, `startMode` (`domainTimer = 0`, `activeDomainKind = 'none'`, `mactienDomainBlend = 0`, `this.bg.resetDomain()`).
  - Lines `1136-1142, 3889-3899`: `mactienDomainBlend` and `renderMacTienDomainBackdrop` explicitly gated off when `this.skinId === 'xuan_feng_sage'`.
  - Lines `1879-1889, 3580-3583, 3845-3848`: Awaken activates `domainDuration` (`12.5s`) + `'BÀNH TRƯỚNG LÃNH ĐỊA · XUÂN PHONG VĂN MIẾU!'`; Ultimate `onKanjiImpact` sets `isOverdrive ? 12.5 : 10.0` and `onComplete` ensures `Math.max(this.domainTimer, 10.0)`.

### 1.3 M2 Verification (R2 High-Density Character, Gear, Weapon & Aura)
- `src/game/renderer/types.ts`:
  - Lines `154-155`: `Afterimage` includes `awakened?: boolean; characterId?: CharacterId;`.
  - Lines `196, 198-199`: `StickmanRenderOptions` includes `'jade_hairpin'`, `vx?: number; vy?: number;`.
- `src/game/renderer/gear.ts`:
  - Lines `51-53`: `inferCharacterFromSkin` maps `xuan_feng_sage` -> `'mactien'`.
  - Lines `530-655`: `jade_hairpin` for `xuan_feng_sage` renders sharp jade-teal eye glint (`drawInkEyeSlit`), ink-wash topknot, Moonlight-White/Jade-Teal `Ngọc Quan` diadem with pale-gold clasp, translucent white-jade hairpin with pale-gold collars & jade finial, 5-petal peach blossom ornament, and swaying 2-strand silk ribbon + cinnabar bead.
  - Lines `1540-1768, 2646-2832`: 3-Layer Heaven-Earth Literary Wheel in `renderSkinBackAttachment` + `renderSkinFrontAttachment`:
    - Layer 1: Thick-thin Enso brush ring (12 tapered segments + ink-wash bleed + jade/pale-gold filaments + dry-brush wisps).
    - Layer 2: Counter-rotating octagonal/scripture ring with 8 engraved ticks & pale-gold diamond finials.
    - Layer 3: `renderXuanFengOrbitSlipsPass` orbits 6 items (4 beveled Jade Bamboo Slips + 2 Small Talisman Seals) on a tilted 3D ellipse, depth-sorted (`items.sort((a, b) => a.depth - b.depth)`) and split across `'back'` (`depth < 0`) and `'front'` (`depth >= 0`) passes, plus drifting petals.
  - Lines `3370-3381, 3729-4029, 4343-4508, 4543, 4598-4613`: `xuan_feng_robe` eliminates flat white trapezoid blocks: sculpted Bezier torso with ink-wash cel-shading fold, inner V-neck under-robe, crossed `Giao Lĩnh` lapels with peach-blossom embroidery, separate 2-layer back coattails + jade sash ribbons, separate left/right front apron coattails swaying with `kneeL`/`kneeR` stride, wide flowing `drawScholarSleeve` on both arms reactive to `armDx` and velocity, high scholar collar, single sculpted jade-teal waist sash (`Ngọc Đái`, skipping generic Obi rectangle at line `4543`) with pale-gold clasp, cinnabar seal tag, and hanging jade bi-disc pendant (`Ngọc Bội`) with 2-strand tassel.
  - Lines `5596-5740, 6342-6398`: Awakened Back & Head forms transition to Moonlight White (`#f0fdfa`) – Jade Teal (`#5eead4`) – Pale Gold (`#fde68a`) with 12 radial rays, twin celestial silk streamers, 6 falling peach blossom petals, crescent crown halo + 3 floating motes + optic wisp, and zero harsh yellow (`#facc15`/`#eab308`/`#fde047`).
- `src/game/renderer/weapons.ts:813-1098`:
  - `ink_brush` / `golden_ink_brush` for `skinId === 'xuan_feng_sage'` renders 3-segment white-jade shaft with pale-gold (`#fde68a`) metallic joints + jade inlays, ornate ferrule + rotating energy ring (`safeTime * (isAwakenedBrush ? 4.2 : 2.8)`) with 4 rotating motes, 4-segment velocity-driven jade silk tassel (`tPts` using `safeVx, safeVy`), and glowing white-core bristles with jade-teal edge + 3 drifting motes.
- `src/game/StickmanRenderer.ts`:
  - Passes `opts.vx ?? 0, opts.vy ?? 0` to `renderSkinBackAttachment` (`1186-1187`), `renderSkinBodyArmor` (`1295-1296`), `renderSkinFrontAttachment` (`1327-1328`), and `renderWeapon` (`1347-1348`).
  - `skinMap.xuan_feng_sage` (`1662`): `{ rim: '#5eead4', puddle: 'rgba(94, 234, 212, 0.30)', core: '#0f172a' }`.
  - Bespoke `xuan_feng_sage` underfoot aura in `renderDarkInkAura` (`1856-1940`): outer pale-gold + jade-teal scripture ring, rotating perspective Zen Enso brush stroke, 12 counter-rotating Confucian ticks, 5 ascending peach blossom petals & jade-gold calligraphy sparks.
- **No missing R2 structural details.** All requested R2 elements are present.

### 1.4 M3 Verification (R3 3-Phase Dark Cutscene & Palette Alignment)
- `src/game/UltimateCutscene.ts`:
  - `renderScreen` (`187-188`) dispatches `xuan_feng_sage` to `renderXuanFengSageCutscene` (`2481-3279`).
  - `#070d12` deep ink-night backdrop across all 3 phases:
    - Phase 1 (`0–45%`, `0..1.215s`): 3 giant concentric counter-rotating Literary Wheels (`+0.55t`, `-0.95t`, `+1.7t`) with 12 calligraphy chars (`春・風・靜・禮・義・仁・智・信・文・道・清・雅`), 24 ticks, 28-segment tapered Enso stroke, `文` core, 10 inward ink ribbons, 28 spiraling petals/sparks.
    - Phase 2 (`45–70%`, `1.215..1.89s`): 28 radial speedlines, 12 jagged cracks, 16 perspective-projected (`persp = 1 / depthZ`) shattered bamboo slips & torn scripture pages flying toward the camera.
    - Phase 3 (`70–100%`, `1.89..2.70s`): decaying canvas screen shake, real `renderStickman` (`3072-3101`) on left using `getCharacterDef('mactien', 'xuan_feng_sage')` & `getSkinVfxProfile('mactien', 'xuan_feng_sage')` (`awakened: true`, `weapon: def.awakenedWeapon`, `headGear: def.headGear`, animated `ScarfNode[]`), Cinnabar-Red (`#dc2626`/`#991b1b`) & Jade-Teal (`#5eead4`) Seal Frame with Pale-Gold (`#fde68a`) filigree stamping `春` on right, plus Impact Frame flash at `p < 0.14` (`p < 0.045` inverted burst + `0.045..0.14` decaying jade flash).
  - `isSilhouettePhase()` (`97-99`: `1.215 <= t < 1.89`), `isWhiteFlashPhase()` (`108-110`: `1.89 <= t < 2.02`), and `update()` (`138-165`: Phase 2 shatter beat at `1.215s`, pre-climax at `1.86s`, `kanjiDropTime = 1.89s`) align cleanly with Phase 2 and Phase 3 transitions.
- Palette alignment: `skinVfx.ts:691-718`, `characters.ts:1154-1193`, `inkStyle.ts:434-445,472` consistently use `#070d12` / `#f8fafc` / `#f0fdfa` / `#5eead4` / `#2dd4bf` / `#fde68a` / `#fef08a` / `#fda4af`, with **0** harsh yellow (`#facc15`/`#eab308`/`#fde047`) matches across any `xuan_feng_sage` block.

### 1.5 TypeScript Check (`tsc --noEmit`)
Executed from `/data/user/0/com.agy/files/stickman-build`:
```
node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
```
Exit code `2` with **24 pre-existing errors in 4 untouched files** and **0 errors in any M1/M2/M3 files**:
- `src/game/poses/chronoPoses.ts` (**15 errors**):
  - `87:33`, `87:62`, `88:34`, `88:63` — `TS2339: Property 'counterSwing' / 'hipBounce' does not exist on type 'AnimeSprintResult'`
  - `157:41` — `TS2345: Argument of type '{ hipStandY: number; hipCrouchY: number; }' is not assignable to parameter of type 'number'`
  - `161:33`, `162:35`, `163:35`, `163:53`, `164:34`, `164:52`, `168:29`, `169:29`, `170:30`, `171:29` — `TS2339: Property 'hipY' / 'crouch' does not exist on type 'number'`
- `tests/e2e/helpers/testHarness.ts` (**6 errors**):
  - `436:9`, `898:9`, `999:9` — `TS2739` missing `mirage, chrono, mactien` in `Record<CharacterId, StickPoseName>`
  - `476:9`, `1008:9` — `TS2739` missing `mirage, chrono, mactien` in `Record<CharacterId, SlashTrailStyle>`
  - `882:5` — `TS2554: Expected 7-8 arguments, but got 6` (`stepVerletScarf`)
- `tests/e2e/r3_inkwash.e2e.test.ts` (**2 errors**):
  - `260:33` — `TS2554: Expected 7-8 arguments, but got 6` (`stepVerletScarf`)
  - `702:83` — `TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string'`
- `tests/e2e/tier1_features.e2e.test.ts` (**1 error**):
  - `133:24` — `TS2345: Argument of type ... "chrono_sovereign" ... is not assignable`

### 1.6 Canvas 2D Invariant Checks
- `shadowBlur` code hits across `src/` (excluding excluded files): **0** (`shadowAssign = 0` on all 12 M1/M2/M3 files).
- `performance.now()` hits in `src/game/renderer/`, `src/game/UltimateCutscene.ts`, and `src/game/PeriodicTableBG.ts`: **0**.
- `ctx.save()` / `ctx.restore()` counts (all balanced `=== 0` diff):
  - `src/game/PeriodicTableBG.ts`: `44 / 44`
  - `src/game/Game.ts`: `17 / 17`
  - `src/game/renderer/gear.ts`: `84 / 84`
  - `src/game/renderer/weapons.ts`: `22 / 22`
  - `src/game/StickmanRenderer.ts`: `15 / 15`
  - `src/game/UltimateCutscene.ts`: `62 / 62` (`renderXuanFengSageCutscene`: `16 / 16`)
  - Remaining 6 files (`types.ts`, `GameHUD.tsx`, `renderer/types.ts`, `skinVfx.ts`, `characters.ts`, `inkStyle.ts`): `0 / 0`.

---

## 2. Findings & Adversarial Stress-Test

### [Minor] Signed `vx` not multiplied by `facing` in `StickmanRenderer.ts` local space (M2)
- **Where:** `src/game/StickmanRenderer.ts:1186, 1295, 1327, 1347` feeding `src/game/renderer/weapons.ts:849-852`, `src/game/renderer/gear.ts:1663`, `src/game/renderer/gear.ts:4345`.
- **What:** `StickmanRenderer.ts:997` applies `ctx.scale(facing * safeScaleX, safeScaleY)` before rendering back attachments, body armor, front attachments, and weapons. However, `opts.vx ?? 0` is passed in world space without multiplying by `facing`. When `facing === -1` and running left (`vx = -400`), `localVx` in `weapons.ts:849` flips sign so `dragX` becomes `+14.4` (pulling the tassel *forward* toward the ferrule) instead of `-14.4` (trailing *behind* the pommel), and `lagX` (`gear.ts:1663`) and `pendSwing` (`gear.ts:4345`) similarly shift forward instead of lagging backward. (`gear.ts:3680, 3731, 3764` use `Math.abs(vx)` and are unaffected.)
- **Suggestion:** Pass `(opts.vx ?? 0) * facing` (or normalize `facingVx = vx * facing`) when invoking `renderSkinBackAttachment`, `renderSkinBodyArmor`, `renderSkinFrontAttachment`, and `renderWeapon` from `StickmanRenderer.ts`.

### [Minor] Top-left Ultimate banner box width tight for `bannerTitle` (M3)
- **Where:** `src/game/UltimateCutscene.ts:207-216` and `src/game/characters.ts:1175`.
- **What:** `bannerTitle: 'XUÂN PHONG VĂN THÁNH · 春'` (25 characters) is drawn at `x = 28` in a fixed `248px` (`16..264`) rectangle with `italic 800 17px "Barlow Condensed"`. Depending on system font metrics, the trailing `春` may sit very close to or slightly touch the right border (`x = 264`).
- **Suggestion:** Dynamically size `Math.max(248, ctx.measureText(this.theme.bannerTitle).width + 32)` or widen the banner box slightly if observed clipping in browser.

---

## 3. Logic Chain

1. Benchmarking `chrono_sovereign` across `src/game` confirms M1, M2, and M3 replicate `chrono_sovereign`'s exact architectural touchpoints (dedicated `DomainKind`, `PeriodicTableBG` screen + world renderers, `Game.ts` lifecycle resets & triggers, 3-layer depth-sorted back-gear + sculpted non-trapezoid outfit + multi-segment velocity-driven weapon + underfoot aura, and 3-phase `#070d12` dark cutscene with real `renderStickman` and synchronized `update()` beats).
2. All M1, M2, and M3 files compile with 0 TypeScript errors (`tsc --noEmit` errors are confined exclusively to 4 pre-existing untouched files) and satisfy 100% of static Canvas 2D invariants (`0` `shadowBlur`, `0` `performance.now()`, balanced `ctx.save()`/`ctx.restore()`), with zero harsh yellow (`#facc15`/`#eab308`/`#fde047`) in any `xuan_feng_sage` color definition.
3. The two findings identified (`facing * vx` sign inside `StickmanRenderer.ts` local space and `248px` banner width) are minor directional/cosmetic items that do not block Wave 2 or break invariants.

---

## 4. Caveats

- Excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) were neither read nor modified, and E2E tests were not run per dispatch instructions.
- Live browser visual verification was not run in this read-only review pass.

---

## 5. Conclusion

- **M1 (R1 Full-Screen Domain):** **APPROVE** — Complete, matches `chrono_sovereign` architecture and density, resets cleanly, gates off `mactienDomainBlend`, 0 TS errors, all invariants pass.
- **M2 (R2 High-Density Character, Gear, Weapon & Aura):** **APPROVE** — All R2 structural/visual details implemented cleanly with 0 missing components; recommend applying Minor fix `(opts.vx ?? 0) * facing` in `StickmanRenderer.ts` during Wave 2/final polish so tassel/pendant/orbit lag trails backward identically when facing left.
- **M3 (R3 3-Phase Dark Cutscene & Palette Alignment):** **APPROVE** — High-contrast `#070d12` 3-phase cutscene with real `renderStickman`, `春` Seal slam, `1.89s` beat alignment, unified Moonlight-Jade-PaleGold palette, 0 TS errors, all invariants pass.

---

## 6. Verification Method

1. TypeScript check from `/data/user/0/com.agy/files/stickman-build`:
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
   Confirm 24 errors only in `src/game/poses/chronoPoses.ts` (15), `tests/e2e/helpers/testHarness.ts` (6), `tests/e2e/r3_inkwash.e2e.test.ts` (2), `tests/e2e/tier1_features.e2e.test.ts` (1), and 0 errors in M1/M2/M3 files.
2. Static Canvas 2D invariant check across `src/`:
   - `shadowBlur` assignments: `0`
   - `performance.now()` in `src/game/renderer/`, `src/game/UltimateCutscene.ts`, `src/game/PeriodicTableBG.ts`: `0`
   - `ctx.save()` / `ctx.restore()` balanced in all 12 M1/M2/M3 files.
3. Invalidation condition: if any M1/M2/M3 file introduces a TS error, `shadowBlur`, `performance.now()`, unbalanced `save/restore`, or misses an R1–R3 visual component, the corresponding module approval is invalidated.
