# Handoff Report — `explorer_r8_wave2` (Wave 2 Blueprint: M4 & M5)

**Core Summary:** Wave 1 (`M1` Domain `xuan_feng`, `M2` Gear/Weapons & `StickmanRenderer` underfoot aura, `M3` 3-Phase Dark Cutscene) is already on disk and compiles cleanly; the only `src/` TypeScript errors are 15 pre-existing errors in `src/game/poses/chronoPoses.ts:87-171`. Wave 2 (`M4` & `M5`) partitions cleanly with **zero file overlap** across `{poses/chronoPoses.ts, renderer/types.ts, StickmanRenderer.ts, animation.ts, renderer/trails.ts}` (M4) and `{Entities.ts, Player.ts, Game.ts}` (M5).

---

## 1. Observation

### 1.1 `chrono_sovereign` Reference Map (Target Files)
Exact matches verified via `grep_search`:
- `src/game/StickmanRenderer.ts`:
  - `1079` (`renderStickman` `motionArc` block: `const isSov = opts.skinId === 'chrono_sovereign';` — outer arc + rim arc + 5 radial dial ticks)
  - `1661` (`renderDarkInkAura` `skinMap`: `chrono_sovereign: { rim: '#f59e0b', puddle: 'rgba(245, 158, 11, 0.38)', core: '#120b03' }`)
  - `1727, 1731` (perspective Roman clock dial underfoot aura)
- `src/game/animation.ts`:
  - `343` (`getAwakenedVisualProfile` `chrono_sovereign`)
  - `679, 681` (`parry_counter` dual `slashArcs`)
  - `950, 952` (`air_slam` `chrono_sovereign_slash`)
  - `1287, 1289` (`chrono` Hit 6 `chrono_sovereign_slash`)
- `src/game/renderer/trails.ts`:
  - `135` (`inferCharacterForSkin`)
  - `1079` (`renderAttackSwingAura` `case 'chrono_sovereign':` — dual cogwheels, 12 gilded ticks, twin clock hands + `drawFourPointStar`, 4 Roman numerals)
  - `1254` (`resolveSlashMotif`)
  - `2130` (`renderSlashMotifOrnament` `case 'chrono_sovereign':` — 8 notches, dual counter-rotating cogwheels, 4 numerals, twin rays + 2 `drawFourPointStar` flares)
  - `2282, 2287-2290` (`renderSlashTrails` 3-mode Chrono trail geometry + `renderSlashMotifOrnament` call at `2603`)
- `src/game/Player.ts`:
  - `2307-2310` (`startAttack` trail style selection)
  - `2580` (basic attack sparks/shards/shockwave)
  - `2696` (awakened melee sparks/shockwave/afterimage)
- `src/game/Entities.ts`:
  - `2522, 2524, 2591` (`TemporalEcho` constructor & `render()`)
- `src/game/Game.ts`:
  - `258` (`isChronoDomainOwner`), `1513` (`detonateTimeStopDamage`), `1568, 1590` (`executeTemporalEchoStrike`), `4292` (Time Stop overlay)

### 1.2 Current Disk State of Wave 1 & Type-Check (`tsc --noEmit`)
Executed `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` from `/data/user/0/com.agy/files/stickman-build` (exit code 2):
- **0 errors** in all Wave 1 files (`PeriodicTableBG.ts`, `Game.ts`, `GameHUD.tsx`, `UltimateCutscene.ts`, `gear.ts`, `weapons.ts`, `StickmanRenderer.ts`, `types.ts`).
- `StickmanRenderer.ts:1662, 1856-1940` already has `xuan_feng_sage` in `skinMap` and a custom perspective Enso + 12-tick + 5-petal/diamond underfoot aura.
- **15 pre-existing errors in `src/game/poses/chronoPoses.ts`** (plus 9 in `tests/`, which are excluded):
  - Lines `87-88`: reads `k.counterSwing` and `k.hipBounce` from `AnimeSprintResult` (`src/game/poses/poseMath.ts:266-275`), which only returns `{ hip, torsoLean, spineBend, footL, footR, handL, handR, weaponAngle }`.
  - Lines `157-171`: calls `computeLandingCurve(t, { hipStandY: -47.6, hipCrouchY: -33.5 })` and reads `lc.hipY`, `lc.crouch`, whereas `computeLandingCurve(t: number, duration = 0.15): number` (`src/game/poses/poseMath.ts:412`) accepts a `number` duration and returns a `number` in `[0, 1]`.

### 1.3 Current Disk State of M4 Target Files
- `src/game/poses/types.ts:13-20` & `src/game/poses/index.ts:50-67`: `PoseContext` handles only the 8 `BasicPoseName` locomotion poses (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) and has no `skinId`. `mactienPoses.ts:9-147` already keeps `idle` upright (`torsoLean: 0.03 + poiseSway`).
- `src/game/renderer/types.ts`:
  - `StickPoseName` (`3-58`) has no scholar-specific attack poses yet.
  - `SlashTrailStyle` (`110-122`) already includes `'xuan_feng_brush'`.
  - `Afterimage` (`145-156`) **already includes** `awakened?: boolean; characterId?: CharacterId;`.
- `src/game/StickmanRenderer.ts`:
  - `computeStickmanSkeleton` (`62-785`) resolves all attack poses globally without `skinId` branching.
  - `renderStickman` `motionArc` (`1022-1122`) has custom branches for `mirage` (`1031-1077`) and `chrono` (`1078-1105`); `mactien` / `xuan_feng_sage` falls through to generic gray arc (`1106-1118`).
- `src/game/animation.ts`:
  - `getComboMoveForCharacter` for `mactien` (`1082-1170`) sets `trailStyle: 'xuan_feng_brush'` when `isXuanFeng = skinId === 'xuan_feng_sage'`, **but** still assigns heavy/lunging poses: Hit 1 `attack_1` (high kick), Hit 2 `attack_2` (hunched katana slash, `spineBend = 10`), Hit 3 `attack_3` (uppercut), Hit 4 `nodachi_overhead_slam` (`torsoLean = -0.24 + snap * 0.92`, `spineBend = 14`).
  - `getAwakenedVisualProfile` (`364-373`) has `xuan_feng_sage` using `motif: 'storm_god'` (from `AwakenedVisualProfile['motif']` union at `180`).
- `src/game/renderer/trails.ts`:
  - `renderAfterimages` (`19, 26-80`): checks `isXuanFeng = a.skinId === 'xuan_feng_sage'`, renders bare `strokeSkeletonLimbs` + 3 mist ellipses; ignores `a.awakened`, has no scholar robe silhouette and no dissolving peach blossom petals.
  - `renderAttackSwingAura` (`379, 413-460` & `1178-1188` `case 'xuan_feng_calligraphy':`): draws 1 open Enso arc + 2 petals and 2 sparse quadratic lines; far sparser than `chrono_sovereign` (`1079-1177`).
  - `renderSlashMotifOrnament` (`1284-2251`): has **no** `case 'xuan_feng_calligraphy':`.
  - `renderSlashTrails` (`2607-2793`): draws **2 ribbon passes** (`#f8fafc`/`#5eead4` then `#1e293b` core), 3 alternating petals/leaves, and `"静"` ring if `isSealFinisher`. Missing ordered 3-layer ink-wash -> jade-teal glow -> white brush-tip flash structure, `drawFourPointStar` (`148-168`) glints, ink droplets, and `renderSlashMotifOrnament`.

### 1.4 Current Disk State of M5 Target Files
- `src/game/Entities.ts`:
  - `ProjectileKind` (`499-509`): `'bullet' | 'spear' | 'laser' | 'orb' | 'sword_wave' | 'kunai' | 'volt_lance' | 'fire_wave' | 'void_crescent' | 'mirror_shard'`. No jade bamboo-slip / brush-blade or seal-ring kind yet.
  - `Projectile.render` (`578-1335`): no `bamboo_blade` / `jade_seal_wave` rendering.
- `src/game/Player.ts`:
  - `pushAfterimage` (`254-259`): attaches `skinId` if missing, **not** `awakened` or `characterId`. Dash start (`977`), dash ticks (`1124`), attack afterimages (`1153`), and awakened melee afterimage (`2732`) do not populate `awakened`/`characterId`.
  - `triggerSignatureSkill` `'ink_seal'` (`1641-1653`): pushes `pendingInkSeals` with `awakened: this.awakened, skinId: this.skinId`, emits identical `'TĨNH TỰ ẤN · 静!'` text regardless of `this.awakened`.
  - `startAttack` basic-attack `mactien` / `xuan_feng_sage` (`2606-2620`): emits 2-4 petals + 2-5 `ink_splatter` (and `'静'` + shockwave on Hit 4). Does **not** dart 2 jade bamboo slips on Hit 3 or a rotating seal ring entity on Hit 4.
  - `startAttack` awakened melee (`2724-2743`): emits 3 petals + 6 `#5eead4` sparks (and shockwave + 1 afterimage on Hit 4/heavy). Does **not** summon 2–3 floating calligraphy brush blades / Jade Bamboo Slips slashing diagonally from range (`Ngự Bút Thiên Hành`).
  - `spawnCurrentHitbox` (`2803`): no `xuan_feng_sage` awakened reach bonus.
- `src/game/Game.ts`:
  - `inkSeals` (`117-126`, update `2066-2233`, render `4037-4137`): `isXuanFengSeal` (`4049-4137`) ignores `seal.awakened` completely (1 outer ring, 1 inner ring, `'静'`). Update (`2148-2161`) does not rain jade bamboo slips / spring wind during the `1.1s` pin, and detonation (`2166-2182`) emits 2 near-horizontal `emitSlashBeam`s without a razor-sharp ink cross-slash (`emitCrossSlash`).
  - Melee hit (`2570-2588`) & projectile hit (`2845-2860`): no glowing Hanzi calligraphy flash on impact for `xuan_feng_sage`.

---

## 2. Logic Chain

1. **Why M4 and M5 can have strict 0-file overlap:**
   - All upright scholar pose geometry (`StickPoseName`, `computeStickmanSkeleton`, `motionArc`) and combo pose mapping (`getComboMoveForCharacter`) live in `renderer/types.ts`, `StickmanRenderer.ts`, and `animation.ts`.
   - All trail/aura/afterimage *rendering* lives in `renderer/trails.ts`, which already accepts `SlashTrail` (with `style: 'xuan_feng_brush'`, `startAngle`, `endAngle`, `secondaryColor`, `skinId`) and `Afterimage` (which **already** has `awakened?: boolean` and `characterId?: CharacterId` in `renderer/types.ts:154-155`).
   - All projectile definitions, ranged bamboo-slip spawning, Hit 3/4 projectile emissions, `Afterimage` flag population, `[U]` `Văn Thánh Trấn Thiên Trận` logic/rendering, and Hanzi hit flashes live in `Entities.ts`, `Player.ts`, and `Game.ts`.
   - Note on Hit 3 ("2 jade bamboo slips darting forward") & Hit 4 ("rotating jade-teal seal ring pushback"): `trails.ts` renders the brush-stroke visual ornaments (ink ripples, seal ring ornament, star glints, petals/droplets) on the slash arc itself, while `Player.ts` + `Entities.ts` + `Game.ts` (M5) spawn the actual darting jade bamboo-slip projectiles on Hit 3 and rotating seal ring pushback / shockwave on Hit 4 so they physically travel and interact with enemies cleanly without M4 touching `Player.ts`.
2. **Why `chronoPoses.ts` belongs in M4:**
   - M4 owns `src/game/poses/` (if needed) and `StickmanRenderer.ts`/`animation.ts`. Fixing `chronoPoses.ts:87-88, 157-171` inside M4 ensures `tsc --noEmit` reaches 0 `src/` errors without touching M5 files.

---

## 3. Caveats

1. **Excluded files untouched:** `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts` were not read or inspected. Note `tsc --noEmit` still reports 9 pre-existing errors in `tests/e2e/` because `tests/` is excluded.
2. **No `Player.ts` edits by M4:** M4 distinguishes Hit 1 / Hit 2 / Hit 3 / Hit 4 in `trails.ts` using `s.startAngle`, `s.endAngle`, and `isSealFinisher` (`s.secondaryColor === '#fda4af'`) already set by `animation.ts:1104-1164` and `Player.ts:2318-2360`—so M4 never needs to touch `Player.ts`.
3. **Color discipline:** Keep `xuan_feng_sage` strictly within Moonlight White (`#f8fafc`), Jade Teal (`#5eead4` / `#2dd4bf`), Ink Wash (`#1e293b` / `#0f172a`), Peach Blossom (`#fda4af`), and Pale Gold (`#fde68a`) — never harsh yellow (`#facc15` / `#eab308`) or aggressive scarlet (`#ef4444`).
4. **Coordinate/joint safety:** All new poses in `StickmanRenderer.ts` pass through `buildSkeletonFromDraft(...)`, guaranteeing finite coordinates and clamped limb reach.

---

## 4. Conclusion — Exact Non-Overlapping Implementation Blueprint

### File Ownership Matrix (Zero Overlap)
| Module | Exclusive Owned Files |
|---|---|
| **M4 (R4)** | `src/game/poses/chronoPoses.ts`, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/renderer/trails.ts` |
| **M5 (R5)** | `src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts` |

### M4 Implementation Plan
1. **`src/game/poses/chronoPoses.ts`** (compile fix):
   - Lines `87-88`: compute `const armSwing = -Math.cos(walkPhase); const hipBounce = Math.abs(Math.sin(walkPhase)) * 1.6;` instead of `k.counterSwing` / `k.hipBounce`.
   - Lines `157-171`: use `const crouch = computeLandingCurve(t); const hipY = -47.6 + crouch * 14.1;` and replace `lc.crouch` / `lc.hipY` with `crouch` / `hipY`.
2. **`src/game/renderer/types.ts`**:
   - Add `'scholar_flick_1' | 'scholar_flick_2' | 'scholar_point_3' | 'scholar_palm_4' | 'scholar_dash_slash' | 'scholar_parry_counter'` to `StickPoseName`.
3. **`src/game/StickmanRenderer.ts`**:
   - In `computeStickmanSkeleton`, implement the upright scholar poses (all with `torsoLean` in `[-0.04, 0.14]`, `spineBend` in `[-1.5, 2]`, never lunging/hunching):
     - `scholar_flick_1`: `handL` poised behind back (`{ x: -17, y: -46 }`), `handR` flicks horizontally (`{ x: 6..30, y: -58 }`), smooth horizontal `motionArc`.
     - `scholar_flick_2`: `handL` chest seal (`{ x: 9, y: -62 }`), `handR` flicks wrist upward (`{ x: 14..26, y: -52..-78 }`), rising `motionArc`.
     - `scholar_point_3`: `handL` behind back (`{ x: -18, y: -46 }`), `handR` extends brush-tip forward (`{ x: 14 + snap * 20, y: -62 }`), `weaponAngle: -0.06`, focused forward `motionArc`.
     - `scholar_palm_4`: `handL` chest seal (`{ x: 8, y: -62 }`), `handR` open-palm push forward (`{ x: 12 + snap * 22, y: -58 }`), brush resting behind shoulder (`weaponAngle: -2.05`), wide outward `motionArc`.
     - `scholar_dash_slash` & `scholar_parry_counter`: upright poised glide/counter instead of heavy `0.86` hunch.
   - In `renderStickman` `motionArc` (`1022-1122`), add `else if (opts.characterId === 'mactien' && opts.skinId === 'xuan_feng_sage')` rendering an ink-wash + jade-teal double silk arc, 2 petal flecks, and a small 4-point star glint.
4. **`src/game/animation.ts`**:
   - In `getComboMoveForCharacter` for `mactien` (`1082-1170`), when `isXuanFeng`, assign `scholar_flick_1`, `scholar_flick_2`, `scholar_point_3`, `scholar_palm_4` for Hits 1–4 (and `scholar_dash_slash` at `572`, `scholar_parry_counter` at `689`). Keep `baseDamage`, `duration`, `cancelRatio`, `heavy`, `unblockable`, `knockX`, `knockY` intact.
5. **`src/game/renderer/trails.ts`**:
   - **3-layer `xuan_feng_brush` in `renderSlashTrails` (`2607-2793`)**:
     - Layer 1 (outer): Ink-wash bleed silk ribbon (`#1e293b` / `#0f172a`, alpha `0.36 * inv`).
     - Layer 2 (inner glow): White-jade silk body (`#f8fafc` / `#ccfbf1`) + `lighter` jade-teal glow (`#2dd4bf` / `#5eead4`, plus `#fde68a` shimmer if awakened `#99f6e4`).
     - Layer 3 (brush-tip flash): Razor-sharp `#ffffff` tip filament over the leading half (`u >= 0.45`) + bright tip flare.
     - Add `drawFourPointStar` glints at apex & midpoint, drifting peach blossom petals (`#fda4af`) + ink droplets (`#1e293b` / `#5eead4`), and call `renderSlashMotifOrnament` with `xuan_feng_calligraphy`.
   - **`renderSlashMotifOrnament` (`case 'xuan_feng_calligraphy':`) & `renderAttackSwingAura` (`413-460`, `1178-1188`)**:
     - Enrich with concentric ink ripples (when point-flick `rawSpan < 0`), trailing silk wisps, 4-point star glints, and rotating petals + pale-gold hair-line arcs.
   - **`renderAfterimages` (`26-80`)**:
     - For `isXuanFeng`, render a translucent white-robed scholar silhouette (flowing sleeve & skirt/robe hem polygons over `strokeSkeletonLimbs` in `#f8fafc` with `#5eead4` rim) dissolving into mist ellipses + 3–4 peach blossom petals (`#fda4af`), heightened with moonlight-jade glow & extra petals when `a.awakened` is true.

### M5 Implementation Plan
1. **`src/game/Entities.ts`**:
   - Add `'bamboo_blade' | 'jade_seal_wave'` to `ProjectileKind` (`499-509`).
   - Add `Projectile.render` branches (`578-1335`) for:
     - `'bamboo_blade'`: beveled jade bamboo slip / floating calligraphy brush blade (`#0f172a` ink outline, `#5eead4`/`#2dd4bf` jade body, `#f8fafc` highlight ridge, `#fde68a` engraved rune stroke, soft ink/jade wake; 0 `shadowBlur`, balanced `save/restore`).
     - `'jade_seal_wave'`: rotating jade-teal calligraphy seal ring (`#2dd4bf`, `#f8fafc`, `#fde68a` ticks, `'静'`) expanding/gliding forward for Hit 4 pushback.
2. **`src/game/Player.ts`**:
   - **`pushAfterimage` (`254-259`)**: always populate `awakened: item.awakened ?? this.awakened` and `characterId: item.characterId ?? this.character.id` (also set explicitly at `977, 1124, 1153, 2732`).
   - **Awakened Dash (`954-1007, 1122-1141`)**: when `isXuanFengDash && this.awakened`, emit extra dissolving petals (`#fda4af`), `#5eead4` ink mist, and `#fde68a` stars.
   - **Hit 3 & Hit 4 (`2606-2620`)**:
     - On Hit 3 (`context === 'ground' && step === 3 && !this.awakened`): emit ink-ripple shockwaves + spawn **2 darting `'bamboo_blade'` projectiles** forward (`[-0.06, 0.06]` spread, `vx: this.facing * 920`, `maxLife: 0.34`, `damage: 10`).
     - On Hit 4 (`context === 'ground' && step === 4`): emit rotating jade-teal seal pushback (`emitShockwave` `#2dd4bf` + `#fde68a` + `'jade_seal_wave'` short-range pushback ring).
   - **Awakened Basic Attacks (`Ngự Bút Thiên Hành`, `2725-2743` & `2803`)**:
     - When `this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage' && this.awakened`: summon **2–3 floating calligraphy brush blades / Jade Bamboo Slips** (`Projectile` `kind: 'bamboo_blade'`) from elevated behind/above (`y - 110..-132`) slashing diagonally downward across range (`vx: this.facing * 820..980, vy: 220..360`, `maxLife: 0.42`, `damage: 12..16`), plus `+24` reach bonus in `spawnCurrentHitbox` (`2803`).
   - **Awakened `[U]` (`1641-1653`)**: emit `'VĂN THÁNH TRẤN THIÊN TRẬN!'` in `#fde68a` when `this.awakened`.
3. **`src/game/Game.ts`**:
   - **Hanzi Impact Flashes (`2570-2588` & `2845-2871`)**:
     - On melee hit & `'bamboo_blade'`/`'jade_seal_wave'` projectile hit when `this.characterId === 'mactien' && this.skinId === 'xuan_feng_sage'`: flash small glowing Hanzi glyphs (`['春', '風', '文', '雅', '靜', '禮']`) via `this.particles.emitText` (`#f0fdfa` / `#5eead4` / `#fde68a`), apply `'mactien'` mark for `'bamboo_blade'`, emit diagonal jade slash beam + petals, and allow `'bamboo_blade'` / `'jade_seal_wave'` to pierce (`2862-2868`).
   - **Awakened `[U]` — `Văn Thánh Trấn Thiên Trận` (`117-126, 2066-2233, 4049-4137`)**:
     - Update (`2148-2182`): during `1.1s` active phase when `isXuanFengSeal && seal.awakened`, rain jade bamboo slips (`bamboo_blade` projectiles angled steeply downward into the seal + diagonal `emitSlashBeam`) and swirling spring wind (`emitPetals`, `emitInkSplatter('#5eead4')`). At detonation, finish with razor-sharp ink cross-slash (`emitCrossSlash` `#1e293b` + `#5eead4`, `emitSlashBeam` `#fde68a`, `emitText(..., 'VĂN THÁNH TRẤN THIÊN TRẬN!', '#fde68a', 25)`).
     - Render (`4049-4137`): when `seal.awakened`, draw a **giant 3-tier Formation Ring** (pale-gold outer + Confucian ticks, ink/white Enso middle, octagonal inner ring), **4 orbiting sub-seals** (`'禮', '義', '仁', '智'`) around overhead `'靜'`/`'禮'`, plus petals and 4-point star glints.

---

## 5. Verification Method

Run from `/data/user/0/com.agy/files/stickman-build` after M4 & M5 complete:
1. **TypeScript Check**:
   `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`
   *(Expect 0 errors across all `src/` files, including `chronoPoses.ts`.)*
2. **Unit Tests**:
   `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts`
3. **Static Invariants** (from `/storage/emulated/0/Antigravity/Stickman`):
   - `grep -rn "shadowBlur\s*=" src/` -> 0 matches.
   - `grep -rn "performance\.now" src/game/renderer/ src/game/UltimateCutscene.ts` -> 0 matches.
   - Verify balanced `ctx.save()` / `ctx.restore()` (`try ... finally`) in every modified render function.
4. **Production Build & Sync**:
   `node node_modules/vite/bin/vite.js build && cp -r dist/. "/storage/emulated/0/Antigravity/Stickman/dist/"`
5. **Invalidation Conditions**: Any overlap between M4 and M5 file lists, any `shadowBlur` assignment, or any residual `chronoPoses.ts` TS error invalidates Wave 2 readiness.
