# Module 2 Explorer Handoff — Soft Brush Trails, Seals & Afterimages (`xuan_feng_sage`)

**Core Summary:** All Module 2 visual systems (`xuan_feng_brush` trails, graceful swing arcs, translucent white-jade mist afterimages, and jade-teal `静` petal-ring seals/breeze bursts) map cleanly onto `src/game/renderer/types.ts`, `src/game/renderer/trails.ts`, `src/game/animation.ts`, `src/game/Player.ts`, and `src/game/Game.ts` (with `Entities.ts` confirmed to contain no `mactien` seals or afterimage classes). Every proposed change is strictly VFX-only and leaves all hitboxes, damage, cooldowns, and combat logic untouched.

---

## 1. Observation

### Exact File Paths Located
- `src/game/renderer/trails.ts`
- `src/game/renderer/types.ts` (shared renderer types: `SlashTrailStyle`, `SlashTrail`, `Afterimage`)
- `src/game/animation.ts`
- `src/game/Entities.ts`
- `src/game/Player.ts`
- `src/game/Game.ts`
- Supporting read-only references inspected: `src/game/skinVfx.ts`, `src/game/types.ts`, `src/game/renderer/inkStyle.ts`, `src/game/ParticleSystem.ts`, `src/game/StickmanRenderer.ts`, `src/game/poses/mactienPoses.ts`, `src/game/poses/index.ts`, `src/game/poses/types.ts`, `src/game/Enemy.ts`, `src/game/rules.test.ts`.

### Direct Code Observations

1. **Module 1 Dependency Check (`types.ts`, `skinVfx.ts`, `inkStyle.ts`)**
   - `grep_search` for `xuan_feng` in `src/` returned `No results found`. `xuan_feng_sage` is not yet registered in `SkinId` (`src/game/types.ts:11-26`) or `SKIN_VFX_PROFILES` (`src/game/skinVfx.ts:663-690`, currently only `'mactien:default'`).
   - `src/game/skinVfx.ts:17-44` defines `SkinVfxProfile` with `motif: SlashVfxMotif`, `afterimageColor`, `swingParticleKind`, `finisherParticleKind`, etc. It does **not** store `SlashTrailStyle`.
   - `src/game/renderer/types.ts:110-121` defines `SlashTrailStyle` ending at `'chrono_sovereign_slash' | 'ink_brush_stroke'`.
   - `src/game/renderer/inkStyle.ts:16-18` exports `finiteOr` and `colorWithAlpha`; `src/game/ParticleSystem.ts:466-495` & `1000-1018` already supports `particles.emitPetals(x, y, count, color, spread, scale)` and renders `'petal'` particles with `#090b10` hairline and zero `shadowBlur`.

2. **Slash Trails & Swing Aura (`src/game/renderer/trails.ts`, `src/game/renderer/types.ts`, `src/game/Player.ts`)**
   - `SlashTrail` (`src/game/renderer/types.ts:123-142`) already carries `style?: SlashTrailStyle`, `skinId?: SkinId`, `characterId?: CharacterId`, `rimColor?: string`, `secondaryColor?: string`, `motif?: SlashVfxMotif`, `seed?: number`.
   - `trails.ts:62-87` (`inferCharacterForSkin`) maps skin IDs to characters (`void_shatterer` -> `'mirage'`, `chrono_sovereign` -> `'chrono'`); `'xuan_feng_sage'` is not listed yet.
   - `trails.ts:1120-1138` (`resolveSlashMotif`) checks `s.motif`, `s.characterId`, `s.skinId`, then falls back to `s.style` (`if (s.style === 'ink_brush_stroke') return 'ink_calligraphy';`).
   - `trails.ts:2487-2623` renders `style === 'ink_brush_stroke'`:
     - Lines `2489-2493`: checks `isGoldenInk = s.outerColor === '#f59e0b' || s.outerColor === '#fde047'` and `isSealFinisher = s.secondaryColor === '#ef4444'`.
     - Lines `2501-2550`: draws crescent polygon with `#12151c` / `#78350f` core and `#2dd4bf` / `#fde047` outer halo.
     - Lines `2554-2575`: draws 5 ink droplets along swing tangent.
     - Lines `2578-2621`: if `isSealFinisher`, draws dashed `#ef4444` rotating ring + `#ef4444`/`#fde047` `'静'` glyph.
   - `trails.ts:292-380` (`renderAttackSwingAura`): uses `opts.skinId` & `opts.vfxMotif`; non-mirror motifs draw a heavy `lineWidth: 6.6` `#090b10` ring + 3 dark blobs + `lineWidth: 5` shock ring.
   - `Player.ts:2231-2281` emits `SlashTrail`:
     - Lines `2235-2242`: `chrono` overrides `trailStyle` to `'chrono_sovereign_slash'` when `this.skinId === 'chrono_sovereign'`.
     - Lines `2243-2260`: `mactien` **hardcodes** `trailOuter = this.awakened ? '#f59e0b' : '#2dd4bf'` and `trailSecondary = isMacTienSealHit ? '#ef4444' : ...`, ignoring `this.skinId`!
     - Line `2277`: already passes `skinId: this.skinId`.

3. **Combo Moves, Swing Angles & Awakened Profile (`src/game/animation.ts`, `src/game/poses/mactienPoses.ts`, `src/game/StickmanRenderer.ts`)**
   - `animation.ts:363-372` (`getAwakenedVisualProfile`): `case 'mactien':` has **no** `skinId` branch; always returns `'KIM MẶC TIÊN BÚT'`, `#78350f` / `#fde047` / `#f59e0b`.
   - `animation.ts:458-462` (`getComboMoveForCharacter(characterId, step, context)`): does **not** accept `skinId` yet.
   - `mactien` entries in `getComboMoveForCharacter`:
     - `dash_slash` (`animation.ts:557-575`): `trailStyle: 'ink_brush_stroke'`, `slashArcs: [{ sa: -1.15, ea: 0.95, radiusScale: 1.44, yOffset: -52, style: 'ink_brush_stroke' }]`
     - `parry_counter` (`animation.ts:671-689`): `trailStyle: 'ink_brush_stroke'`, `slashArcs: [{ sa: -1.85, ea: 1.15, radiusScale: 1.46, yOffset: -54, style: 'ink_brush_stroke' }]`
     - `air` (`animation.ts:939-995`): `air_attack` (`sa: -1.45, ea: 1.05`), `air_attack_2` (`sa: 1.65, ea: -1.25`), `air_slam` (`sa: -2.25, ea: 1.25`)
     - `ground` (`animation.ts:1056-1134`): `mactienTable` steps 1–4 (`attack_1` `sa: -0.95, ea: 0.95`, `attack_2` `sa: -2.2, ea: 0.75`, `attack_3` `sa: 1.45, ea: -1.4`, `nodachi_overhead_slam` `sa: -2.05, ea: 1.25`).
   - `Player.ts:2146` calls `getComboMoveForCharacter(this.character.id, step, context)`; `Enemy.ts:1119-1125` and `rules.test.ts:203-217` also call it with 3 arguments.
   - Basic pose `weaponAngle` (`idle`, `run`, `dash`, `parry`, etc.) is in `src/game/poses/mactienPoses.ts:9-147` (`PoseContext` in `src/game/poses/types.ts:13-20` has no `skinId` yet). Attack skeleton `weaponAngle` (`attack_1..3`, `nodachi_overhead_slam`, `dash_slash`, `parry_counter`, `air_attack*`) is in `StickmanRenderer.ts:61-412` (`computeStickmanSkeleton`, `extra` has `{ vx, vy, awakened }` but no `skinId` yet).

4. **Dash Afterimages (`src/game/renderer/types.ts`, `src/game/renderer/trails.ts`, `src/game/Player.ts`)**
   - `Afterimage` (`src/game/renderer/types.ts:144-152`) has `{ x, y, facing, joints, life, maxLife, color }` — **no `skinId` field**.
   - `renderAfterimages` (`trails.ts:7-60`) unconditionally draws a dark `#0b0c10` outline (`lineWidth: 10.6`, `alpha: fade * 0.34`, lines `26-27`) and dark `#0b0c10` ink droplets (`lines 46-50`), plus `baseColor` body (`lines 31-41`).
   - `Player.ts` pushes afterimages at:
     - Dash start 5-ghost burst (`Player.ts:952-971`): uses `[vfx.afterimageColor, vfx.slashPrimary, vfx.slashSecondary, vfx.swingAuraColor, vfx.impactRingColor]` (and lines `948-951` emit a hardcoded `#38bdf8` slashBeam).
     - Dash tick (`Player.ts:1091-1103`).
     - Attack-move tick (`Player.ts:1111-1125`).
     - Heavy finisher (`Player.ts:2331-2341`).
     - Awakened `mactien` hit (`Player.ts:2627-2637`): **hardcodes** `color: '#f59e0b'`!

5. **`静` Seals, `Entities.ts`, `Player.ts` & `Game.ts` `mactien` VFX Blocks**
   - `Entities.ts`: Contains `TemporalEcho` (`Entities.ts:2448-2675`, Chrono `[U]` echo with `skinId`), `MirrorRift` (`2226`), `ValkyrieBoomerang` (`2107`), `MagmaPillar` (`1435`), `MagicCircle` (`1347`), `Projectile` (`527`), `IceWall` (`117`). **`Entities.ts` contains ZERO `mactien` seal or afterimage classes.**
   - `mactien` `静` seals live in `Player.ts` + `Game.ts`:
     - `Player.ts:161-166`: `pendingInkSeals: { x, y, damage, awakened }[]` (**no `skinId`**). Pushed at `Player.ts:655-660` (Awakening) and `Player.ts:1586-1591` (`[U]` `ink_seal`).
     - `Player.ts:1594-1604` (`[U]` cast VFX): hardcodes `#f59e0b`/`#2dd4bf` shockwave, `'ink_splatter'` in `#f59e0b`/`#ef4444`, and `'#ef4444'` text.
     - `Player.ts:661-664` (Awakening VFX): hardcodes `#f59e0b`, `#ef4444`, `#fde047`, `'ink_splatter'`.
     - `Player.ts:2084-2095` (Skill Link VFX): hardcodes `#ef4444`, `#f59e0b`, `'ink_splatter'`.
     - `Player.ts:2520-2535` (Hit VFX): hardcodes `#f59e0b`/`#2dd4bf` `'ink_splatter'` and `#ef4444` shockwave + `'静'` text.
     - `Player.ts:2622-2639` (Awakened melee VFX): hardcodes `#fde047` sparks, `#f59e0b` shockwave & afterimage.
     - `Game.ts:117-125`: `inkSeals: { x, y, radius, damage, awakened, life, maxLife }[]` (**no `skinId`**).
     - `Game.ts:2041-2096` (seal spawn + stamp): hardcodes `#ef4444` / `#f59e0b` / `#2dd4bf` shockwaves, `'ink_splatter'`, and `applyElementalMark` tint.
     - `Game.ts:2098-2157` (seal tick + detonation): lines `2101-2110` & `2136-2154` are combat logic (root/pull, `burstDmg`, `takeDamage`, `registerPlayerHit`); lines `2115-2132` & `2148-2151` are VFX (hardcoded `#ef4444`/`#f59e0b` shockwaves, 20 `#1a1d24`/`#f59e0b` `ink_splatter`s, `'#ef4444'` text).
     - `Game.ts:3466-3471` (Ult per-enemy VFX): hardcodes `#f59e0b` / `#2dd4bf` / `#1a1d24`.
     - `Game.ts:3647-3669` (Ult activation VFX + `inkSeals.push`): hardcodes `#f59e0b` / `#2dd4bf` / `#fde047` and `'KIM MẶC'` text.
     - `Game.ts:3931-4018` (`inkSeals` render): renders dark ground ellipse (`3943`), thick `lineWidth: 4.2` `#12151c` dashed ring (`3952`), `#ef4444` / `#fde047` inner ring + `'静'` glyph (`3971-4015`).
     - `Game.ts:4502-4593` (`renderMacTienDomainBackdrop`): renders dark vignette (`4522-4525`), `#fde047` glyphs + `#ef4444` rings (`4529-4560`), and 10 golden `#fde047`/`#f59e0b` bamboo leaves (`4563-4589`) without checking `this.skinId`.

---

## 2. Logic Chain

1. Because `Entities.ts` contains no `mactien` seals or dash echoes (observed in `Entities.ts` class scan + `Game.ts:117-125, 3931-4018`), seal rendering/burst customization belongs in `Player.ts` + `Game.ts` (via `skinId?: SkinId` on `pendingInkSeals` and `inkSeals`), while dash afterimages belong in `renderer/types.ts` + `trails.ts` + `Player.ts` (via `skinId?: SkinId` on `Afterimage`). `Entities.ts` requires **zero changes**.
2. Because `Player.ts:2247-2258`, `Player.ts:2624-2635`, `Game.ts:2063-2151`, `Game.ts:3651-3669`, `Game.ts:3935-4015`, and `Game.ts:4502-4593` currently hardcode harsh amber/gold (`#f59e0b`, `#fde047`) and red (`#ef4444`) whenever `character.id === 'mactien'`, simply registering a `SkinVfxProfile` in Module 1 would still leave trails, awakened hits, dash beams, seals, and domain leaves looking harsh gold/red unless those `mactien` VFX blocks branch on `skinId === 'xuan_feng_sage'`.
3. Because `trails.ts:2487` (`ink_brush_stroke`) and `trails.ts:7-60` (`renderAfterimages`) draw heavy `#12151c`/`#0b0c10` ink shapes, adding `'xuan_feng_brush'` to `SlashTrailStyle` and `skinId?: SkinId` to `Afterimage` allows `trails.ts` to render the lighter 2-layer white-jade-black ink-wash silk ribbon + 2–3 petals/bamboo leaves and the dissipating white-jade ink-mist afterimage cleanly, without affecting `mactien:default` or other characters.
4. Because `Enemy.ts:1119-1125` and `rules.test.ts:203-217` call `getComboMoveForCharacter` with 3 args, adding `skinId: SkinId = 'default'` as an optional 4th parameter in `animation.ts:458` (and passing `this.skinId` at `Player.ts:2146`) lets `mactien` use `'xuan_feng_brush'` and slightly lighter/higher `slashArcs` angles (`sa`, `ea`, `yOffset`) while keeping every combat property (`duration`, `cancelRatio`, `baseDamage`, `lungeSpeed`, `knockX`, `knockY`, `heavy`, `unblockable`, `reachScale`) 100% identical.

---

## 3. Caveats

1. **Module 1 Dependency**: `SkinId` in `src/game/types.ts` does not yet include `'xuan_feng_sage'`. Module 2 code referencing `'xuan_feng_sage'` will only type-check after Module 1 adds `'xuan_feng_sage'` to `SkinId` (in `src/game/types.ts`). To avoid coupling to Module 1's `motif` naming, Module 2 branches on `skinId === 'xuan_feng_sage'` and `style === 'xuan_feng_brush'`.
2. **Skeleton `weaponAngle` vs Arc Swing Angles**: `animation.ts` defines combo `slashArcs` (`sa`, `ea`, `yOffset`), whereas skeletal `weaponAngle` lives in `StickmanRenderer.ts:130-412` (attack poses) and `src/game/poses/mactienPoses.ts` (basic stances). If skeletal brush-holding angle tweaking is also desired beyond `animation.ts` `slashArcs`, an optional `skinId?: SkinId` can be threaded into `computeStickmanSkeleton` (`StickmanRenderer.ts:66, 952`, `Player.ts:1447`) and `mactienPoses.ts` — marked explicitly as optional below.
3. **Bot/Mirror Opponents (`Enemy.ts`)**: `Enemy.ts:1023, 1119-1125` mirrors player combos using `getComboMoveForCharacter` (3-arg call) and `heroSlashTrails` (`skinId: this.heroSkinId`). Because `skinId = 'default'` is optional and `Player.ts:2235-2260` / `trails.ts` also check `s.skinId === 'xuan_feng_sage'`, `Enemy.ts` stays untouched and backwards-compatible.

---

## 4. Conclusion — Concrete Implementation Plan for Module 2 Worker

### Scope & Combat-Logic Boundary
- **Files to modify (zero overlap with Module 1 & Module 3)**:
  1. `src/game/renderer/types.ts`
  2. `src/game/renderer/trails.ts`
  3. `src/game/animation.ts`
  4. `src/game/Player.ts` (only `mactien` VFX/trail/afterimage/seal-metadata lines)
  5. `src/game/Game.ts` (only `inkSeals` `skinId` + render/burst VFX + `renderMacTienDomainBackdrop` + `mactien` ult VFX)
  - *Optional (only if skeletal `weaponAngle` tweak desired beyond `slashArcs`)*: `src/game/poses/types.ts`, `src/game/poses/mactienPoses.ts`, `src/game/poses/index.ts`, `src/game/StickmanRenderer.ts`.
  - **`src/game/Entities.ts`**: **No edits needed** (confirmed no `mactien` seals or afterimage classes reside here).

- **Strictly Untouched (Combat Logic)**:
  - `Player.ts`: `executeMeleeStrike` hitbox geometry/damage (`2190-2319`, `2660-2735`), `triggerSignatureSkill` cooldowns/damage (`1579-1591`), `triggerAwakening` invuln/cooldowns (`651-653`).
  - `Game.ts`: `inkSeals` target lock, radius, damage, root/pull physics (`2042-2062`, `2075-2086`, `2099-2114`, `2136-2147`, `2152-2156`).
  - `animation.ts`: `duration`, `cancelRatio`, `baseDamage`, `lungeSpeed`, `knockX`, `knockY`, `heavy`, `unblockable`, `afterimages`, `reachScale`, `heightScale`.

### Step-by-Step File Changes

#### A. `src/game/renderer/types.ts` (Types only)
1. **Lines `110-121` (`SlashTrailStyle`)**: Add `| 'xuan_feng_brush'`.
2. **Lines `144-152` (`Afterimage`)**: Add optional `skinId?: SkinId;`.

#### B. `src/game/renderer/trails.ts` (VFX-only; NO `shadowBlur`, NO `performance.now()`, balanced `save/restore`)
1. **Line `76-78` (`inferCharacterForSkin`)**: Add `if (skinId === 'xuan_feng_sage') return 'mactien';`.
2. **Lines `7-60` (`renderAfterimages`)**:
   - At line `18`, read `const isXuanFeng = a.skinId === 'xuan_feng_sage';`.
   - When `isXuanFeng`:
     - Skip dark `#0b0c10` outer stroke (`lines 26-27`) and dark `#0b0c10` splatter circles (`lines 46-50`).
     - Draw soft expanding white-jade mist outer silhouette: `ctx.globalAlpha = fade * 0.22; strokeSkeletonLimbs(ctx, a.joints, 11.2 + (1 - fade) * 4.5, 13.0, '#f8fafc');`
     - Draw translucent white-jade inner figure: `ctx.globalAlpha = fade * 0.42; strokeSkeletonLimbs(ctx, a.joints, 7.8, 10.2, a.color || '#f1f5f9', false, false, colorWithAlpha('#1e293b', 0.16), colorWithAlpha('#5eead4', 0.48));`
     - Draw 3 dissipating white-jade / celadon mist wisps (`#f8fafc`, `#ccfbf1`) drifting backward (`sx - 14 - (1 - fade) * 18`) using `ctx.ellipse(...)`.
3. **Lines `292-380` (`renderAttackSwingAura`)**:
   - When `opts.skinId === 'xuan_feng_sage'`: replace heavy `lineWidth: 6.6` `#090b10` ring + 3 black blobs with a lighter open jade-teal Enso brush arc (`lineWidth: 2.6`, `colorWithAlpha('#5eead4', env * 0.55)`) + 2 tiny `#fda4af` petal flecks.
4. **Line `1136` (`resolveSlashMotif`)**:
   - Add `if (s.style === 'xuan_feng_brush') return 'ink_calligraphy';`.
5. **Line `2487` (insert `if (style === 'xuan_feng_brush' || (style === 'ink_brush_stroke' && s.skinId === 'xuan_feng_sage'))` right before `if (style === 'ink_brush_stroke')`)**:
   - **2-layer white-jade-black ink-wash silk ribbon**:
     - Compute `rawSpan`, `sweep`, `curStart`, `curEnd` as in `2494-2497`, with finer `maxHalfW = Math.max(3, thickness * 0.62 * inv)` and sharper tip pinch `taper = Math.pow(Math.sin(u * Math.PI), 0.96)` (0 width at `u=0` and `u=1` for razor-sharp tapered tips).
     - Build outer silk polygon (`outerPts`, `innerPts`) and inner ink-wash core polygon (`coreOutPts`, `coreInPts` at `0.48 * hw`).
     - Pass 1 (Soft Jade-White Silk Ribbon): `globalCompositeOperation = 'lighter'`, fill outer ribbon with `colorWithAlpha('#5eead4', inv * 0.28)`, then `'source-over'` fill outer ribbon with `colorWithAlpha('#f8fafc', inv * 0.68)` and fine stroke `colorWithAlpha('#5eead4', inv * 0.82)` (`lineWidth: Math.max(1.0, 1.6 * inv)`).
     - Pass 2 (Slender Dark Ink-Wash Core Ribbon): fill inner ribbon with `colorWithAlpha('#1e293b', inv * 0.78)` + delicate `#f8fafc` leading highlight filament (`lineWidth: Math.max(0.9, 1.5 * inv)`).
   - **2–3 small peach blossom petals / bamboo leaves along trail** (low draw count, deterministic from `seed` & `t`):
     - Loop `for (let p = 0; p < 3; p++)`: compute `u = 0.24 + p * 0.27`, offset outward along tangent (`t * 16`).
     - For `p % 2 === 0`: draw a small peach blossom petal (`#fda4af` teardrop with `#1e293b` 0.7px hairline).
     - For `p % 2 === 1`: draw a slender jade bamboo leaf (`#5eead4` pointed leaf).
   - **Finisher `'静'` seal ornament** when `s.secondaryColor === '#fda4af' || s.secondaryColor === '#ef4444'`:
     - Fine-lined `#2dd4bf` / `#5eead4` double calligraphy circle (`lineWidth: 1.5` & `1.0`) + 4 tiny `#fda4af` rotating petals on the ring + crisp `#1e293b` outlined `'静'` filled in `#f8fafc` with `#fda4af` inner accent.

#### C. `src/game/animation.ts` (Visual profile + optional `skinId` swing angle refinement)
1. **Lines `363-372` (`getAwakenedVisualProfile`, `case 'mactien':`)**:
   - Add `if (skinId === 'xuan_feng_sage')` returning:
     - `formTitle: 'XUÂN PHONG VĂN THÁNH'`, `motif: 'storm_god'` (or `'solar_phoenix'`—any existing union value), `scarfPrimary: '#f8fafc'`, `scarfHighlight: '#5eead4'`, `upgradedSpecialName: 'XUÂN PHONG · TĨNH ẤN'`, `auraAccent: '#5eead4'`, `transformationCallout: 'THỨC TỈNH: XUÂN PHONG · BẠCH NGỌC!'`.
2. **Lines `458-462` (`getComboMoveForCharacter`)**:
   - Add optional 4th parameter `skinId: SkinId = 'default'`.
   - For `characterId === 'mactien' && skinId === 'xuan_feng_sage'` (at `557-575` `dash_slash`, `671-689` `parry_counter`, `939-995` `air`, `1056-1134` `ground`):
     - Copy/branch only `trailStyle: 'xuan_feng_brush'` and lighter, slightly lifted `slashArcs` (`sa`/`ea`/`yOffset` elevated by ~4px and slightly narrower/cleaner wrist flicks, `style: 'xuan_feng_brush'`). **Do NOT alter any damage, duration, cancelRatio, lungeSpeed, knockX/Y, heavy, unblockable, or reachScale.**
   - *(Optional skeletal `weaponAngle` refinement)*: If also refining brush-holding pose angles in `StickmanRenderer.ts` / `poses/mactienPoses.ts`, add `skinId?: SkinId` to `computeStickmanSkeleton(..., extra)` (`StickmanRenderer.ts:66, 952`) and `PoseContext` (`poses/types.ts:20`), passing `skinId: opts.skinId` / `this.skinId` (`Player.ts:1447`), and gently lift `weaponAngle` in `mactienPoses.ts` and `attack_1..3` / `nodachi_overhead_slam` when `characterId === 'mactien' && skinId === 'xuan_feng_sage'`.

#### D. `src/game/Player.ts` (VFX-only branches for `this.skinId === 'xuan_feng_sage'`)
1. **Lines `161-166` (`pendingInkSeals`)**: Add `skinId?: SkinId;`.
2. **Lines `649-666` (Awakening VFX for `mactien`)**:
   - Keep `651-653`, `658` combat logic untouched; add `skinId: this.skinId` to `pendingInkSeals.push` (`655`).
   - Branch `if (this.skinId === 'xuan_feng_sage')`: emit `#5eead4` & `#f8fafc` shockwaves, `particles.emitPetals(this.x, this.y - 54, 16, '#fda4af', 180, 0.9)` + light `#5eead4` ink mist (`ink_splatter`, count 8), instead of `#f59e0b`/`#ef4444`/`#fde047`.
3. **Lines `945-999` (Dash start burst)**:
   - When `this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage'`:
     - Replace harsh `#38bdf8` slashBeam (`950`) with a soft `#f8fafc`/`#5eead4` mist sweep + 2–3 petals (`particles.emitPetals(..., 3, '#fda4af', 110, 0.75)`).
     - Use white-jade ghost palette `['#f8fafc', '#e2e8f0', '#ccfbf1', '#5eead4', '#f1f5f9']` and pass `skinId: this.skinId` on all `pushAfterimage` calls (`961`, `1094`, `1115`, `2332`, `2628`).
4. **Lines `1586-1605` (`[U]` `ink_seal` cast)**:
   - Keep `1579-1591` combat logic untouched; add `skinId: this.skinId` to `pendingInkSeals.push` (`1586`).
   - Branch `const isXuanFeng = this.skinId === 'xuan_feng_sage'`: shockwave `'#5eead4'`, emit `'petal'` (`10`, `'#fda4af'`) + `'ink_splatter'` (`6`, `'#5eead4'`), text `'TĨNH TỰ ẤN · 静!'` in `'#5eead4'`.
5. **Lines `2084-2095` (Skill Link VFX)** & **Line `2146`**:
   - Pass `this.skinId` as 4th arg at `2146`: `getComboMoveForCharacter(this.character.id, step, context, this.skinId)`.
   - At `2089-2095`, when `this.skinId === 'xuan_feng_sage'`: shockwaves `'#5eead4'` & `'#fda4af'`, text in `'#5eead4'`, emit `'petal'` (`10`, `'#fda4af'`) + `'ink_splatter'` (`6`, `'#5eead4'`). Keep `onDetonateAllMarks(...)` untouched.
6. **Lines `2231-2281` (Trail spawning)**:
   - When `isMacTien && this.skinId === 'xuan_feng_sage'`:
     - `trailStyle = 'xuan_feng_brush'`
     - `trailOuter = this.awakened ? '#99f6e4' : '#5eead4'`
     - `trailSecondary = isMacTienSealHit ? '#fda4af' : '#5eead4'`
     - `thickness`: slightly finer `(this.awakened ? 17 : 13) - i * 2.5`
7. **Lines `2520-2535` (Normal strike VFX)** & **Lines `2622-2639` (Awakened strike VFX)**:
   - When `this.skinId === 'xuan_feng_sage'`:
     - `2520-2535`: emit 2–3 `'petal'` (`'#fda4af'`) + small `#5eead4` mist instead of heavy ink splatters; hit 4 shockwave in `'#5eead4'`/`'#fda4af'`, `'静'` text in `'#5eead4'`.
     - `2622-2639`: replace `#fde047` sparks, `#f59e0b` shockwave, and `#f59e0b` afterimage with `#5eead4`/`#f8fafc` shockwave, 3 `'petal'` (`'#fda4af'`), and white-jade afterimage (`color: '#f8fafc'`, `skinId: this.skinId`).

#### E. `src/game/Game.ts` (VFX-only branches for `inkSeals`, Ult VFX, and Domain Backdrop)
1. **Lines `117-125` (`inkSeals`)**: Add `skinId?: SkinId;`.
2. **Lines `2054-2093` (Seal spawn & stamp)**:
   - Pass `skinId: req.skinId ?? this.skinId` at `2054`.
   - When `isXuanFeng = (req.skinId ?? this.skinId) === 'xuan_feng_sage'`:
     - Shockwaves (`2063-2064`): `'#5eead4'` and `'#fda4af'`.
     - Particles (`2065-2073`): `this.particles.emitPetals(targetX, GROUND_Y - 42, 10, '#fda4af', 130, 0.85)` + 6 `'#5eead4'` `'ink_splatter'`.
     - `applyElementalMark` tint (`2088-2090`): `{ primary: '#5eead4', secondary: '#fda4af' }`.
3. **Lines `2112-2155` (Seal detonation — VFX only!)**:
   - Keep `burstDmg`, `takeDamage`, `registerPlayerHit`, `splice` **100% untouched**.
   - When `seal.skinId === 'xuan_feng_sage'`:
     - Shockwaves (`2115-2122`): `'#5eead4'` (`seal.radius * 1.6`) and `'#f8fafc'` (`seal.radius * 1.25`).
     - Spring breeze ribbons: 2 horizontal `this.particles.emitSlashBeam(...)` in `'#5eead4'` and `'#f8fafc'`.
     - Petals burst: `this.particles.emitPetals(seal.x, GROUND_Y - 46, 16, '#fda4af', 220, 0.95)` + 6 `'#5eead4'` `'ink_splatter'`.
     - Text (`2132`): `'PHÁ TĨNH ẤN · 静!'` in `'#5eead4'`.
     - `applyElementalMark` tint (`2148-2151`): `{ primary: '#5eead4', secondary: '#fda4af' }`.
4. **Lines `3466-3471` & `3647-3669` (Ult hit & cast VFX for `mactien`)**:
   - At `3651`, pass `skinId: this.skinId` to `inkSeals.push`.
   - When `this.skinId === 'xuan_feng_sage'`: replace `#f59e0b`/`#fde047`/`#1a1d24` with `#5eead4`/`#f8fafc` + `emitPetals(..., '#fda4af')` and text `'XUÂN PHONG VĂN THÁNH · 春!'` in `'#5eead4'`.
5. **Lines `3931-4018` (`inkSeals` render)**:
   - Branch `if (seal.skinId === 'xuan_feng_sage')` inside the loop:
     - Soft white-jade ground mist ellipse (`rgba(248, 250, 252, ...)`).
     - Fine-lined jade-teal outer formation ring (`#2dd4bf`, `lineWidth: 2.0`, dashed) + delicate inner white-jade ring (`#f8fafc` / `#5eead4`, `lineWidth: 1.4`).
     - **6 gently rotating peach blossom petals** (`#fda4af` with `#1e293b` 0.7px hairline) orbiting the outer ring perimeter (`rot = seal.life * 1.2 + k * Math.PI / 3`).
     - Soft jade halo (`rgba(94, 234, 212, ...)`) behind crisp `'静'` glyph (outline `#1e293b`, fill `#f8fafc` / `#5eead4`).
     - Always `ctx.setLineDash([])` in `finally` before `ctx.restore()`.
6. **Lines `4502-4593` (`renderMacTienDomainBackdrop`)**:
   - Branch `const isXuanFeng = this.skinId === 'xuan_feng_sage';`:
     - Use moonlight-white -> serene slate-teal gradient, `#5eead4`/`#f8fafc` faint glyphs & rings, and alternating peach blossom petals (`rgba(253, 164, 175, ...)`) + jade bamboo leaves (`rgba(94, 234, 212, ...)`) instead of golden `#fde047`/`#f59e0b` leaves.

---

## 5. Verification Method

After Module 1 and Module 2 changes are applied, the Worker / Integrator should verify from `/data/user/0/com.agy/files/stickman-build`:
1. **TypeScript Type-Check (zero errors)**:
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
2. **Unit Tests (`rules.test.ts`, verifying no combo/skeleton regressions)**:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
3. **Invariant & Scope Grep Checks**:
   - Confirm `0` occurrences of `shadowBlur` in `src/`.
   - Confirm `0` occurrences of `performance.now` in `src/game/renderer/`.
   - Confirm `git diff --stat` (or modified file list) touches none of the excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`) and alters no damage/hitbox/cooldown values.
   - Manually inspect `ctx.save()` / `ctx.restore()` and `ctx.setLineDash([])` pairing in `trails.ts` and `Game.ts`.
4. **Invalidation Conditions**:
   - If Module 1 uses a different `SkinId` string than `'xuan_feng_sage'`, all `=== 'xuan_feng_sage'` checks in Module 2 must match Module 1's exact `SkinId`.
