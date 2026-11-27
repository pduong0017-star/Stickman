# Phase 0 Survey Report (R1 & R4): Mirage Combat, Attack VFX/Trails & `MirrorRift` `[U]`

**Summary:** Mirage (`mirage`) currently has NO dedicated `getComboMoveForCharacter` moveset, NO `getAwakenedVisualProfile` entry, NO `renderSlashMotifOrnament` / `renderAttackSwingAura` cases for `'mirror_shatter'` / `'void_prism'`, and NO `mirage` Skill-Link / cooldown-refund branches—causing all Mirage ground/air/dash-slash/parry-counter attacks to fall through to Kuro's katana choreography and emit sword-style `SlashTrail`s (`'iaido_line'` & `'arc'`). Meanwhile, `MirrorRift` (`[U]`, Awakening, Ultimate) currently only reflects enemy projectiles and pulses AoE damage—neither `[J]` melee attacks nor `Dash` interact with `mirrorRifts`.

---

## 1. Observation

### 1.1 Mirage Definitions (`types.ts`, `characters.ts`, `skinVfx.ts`, `animation.ts`, `poses/index.ts`, `synergy.ts`)
- **`src/game/types.ts`**:
  - Line `5`: `CharacterId` includes `'mirage'`.
  - Line `23`: `SkinId` includes `'void_shatterer'`.
  - Lines `44–45`: `SlashVfxMotif` includes `'mirror_shatter'` and `'void_prism'`.
  - Lines `61–70`: `ProjectileTheme` is `'default' | 'seraph' | 'void' | 'shogun' | 'cyber' | 'phoenix' | 'frostfire' | 'blood_moon' | 'astral'` (does NOT contain `'void_walker'`).
- **`src/game/characters.ts`**:
  - Line `95`: `CHARACTER_ORDER = ['kuro', 'raijin', 'kagura', 'zero', 'aether', 'valkyrie', 'mirage']`.
  - Lines `410–460`: `CHARACTER_ROSTER.mirage`:
    - `weapon: 'mirror_shards'`, `awakenedWeapon: 'void_prism_scythe'`, `hasSheath: false`, `headGear: 'prism_crown'`.
    - `maxHp: 180`, `moveSpeed: 505`, `awakenedSpeed: 595`, `damageMultiplier: 1.12`, `attackSpeedMultiplier: 0.84`, `reachBonus: 26`, `maxJumps: 3`, `dashCooldown: 0.36`, `parryWindow: 0.36`, `specialCooldown: 2.6`, `specialKind: 'mirror_fracture'`.
    - `ultimateKanji: '鏡'`, `awakeningBannerText: 'THỨC TỈNH: HƯ KHÔNG KÍNH GIỚI!'`, `slashColors: ['#e2e8f0', '#a855f7']`.
  - Lines `941–979`: `CHARACTER_SKINS.mirage` defines `'default'` (`Ảnh Kính`, `classic`, `overrides: {}`) and `'void_shatterer'` (`Ma Kính`, `mythic`), which overrides colors/strings/skills (`bodyColor: '#09090b'`, `awakenedBodyColor: '#3b0764'`, `glowColor: '#f43f5e'`, `accentColor: '#38bdf8'`, `scarfPrimary: '#be123c'`, `scarfHighlight: '#f0abfc'`, `awakeningBannerText: 'THỨC TỈNH: MA KÍNH HƯ KHÔNG!'`, `slashColors: ['#38bdf8', '#f43f5e']`) but does **not** override `weapon`, `awakenedWeapon`, `headGear`, `hasSheath`, or `auraStyle`.
- **`src/game/skinVfx.ts`**:
  - Lines `551–574`: `'mirage:default'` has `motif: 'mirror_shatter'`, `swingParticleKind: 'shard'`, `finisherParticleKind: 'shard'`, `projectileTheme: 'void_walker'` (not in `ProjectileTheme` union), and **omits** `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary` defined in `SkinVfxProfile` (`lines 17–44`).
  - Lines `575–598`: `'mirage:void_shatterer'` has `motif: 'void_prism'`, `swingParticleKind: 'shard'`, `finisherParticleKind: 'shard'`, `projectileTheme: 'blood_moon'`, and likewise **omits** `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`.
- **`src/game/poses/index.ts`**:
  - Line `21`: `mirage: zeroPoses` maps all 8 basic poses (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) to `src/game/poses/zeroPoses.ts`.
  - `src/game/poses/zeroPoses.ts:153`: `dash` sets `motionArc: { x: -6, y: -36, r: 42, sa: 2.25, ea: 3.85 }`.
- **`src/game/animation.ts`**:
  - Lines `164–165`: `getUltimateStyleId` returns `'mirror_shatter'` for `'mirage'`.
  - Lines `182–360`: `getAwakenedVisualProfile(characterId, skinId)` handles `'raijin'`, `'kagura'`, `'zero'`, `'valkyrie'`, and `case 'kuro': default:`. **No `case 'mirage':` exists** — Mirage falls through to Kuro (`formTitle: 'HUYẾT KIẾM MA VƯƠNG'`, `scarfPrimary: '#b91c1c'`, `scarfHighlight: '#fca5a5'`, `transformationCallout: 'THỨC TỈNH: HUYẾT KIẾM!'`).
  - Lines `400–1155`: `getComboMoveForCharacter(characterId, step, context)` only branches for `'raijin'`, `'zero'`, and `'kagura'`. **Mirage falls through to Kuro in all 4 contexts**:
    - `dash_slash` (lines `461–476`): `pose: 'dash_slash'`, `trailStyle: 'iaido_line'`, `slashArcs: [{ sa: -0.1, ea: 0.1, radiusScale: 1.38, yOffset: -48, style: 'iaido_line' }]`.
    - `parry_counter` (lines `515–532`): `pose: 'parry_counter'`, `trailStyle: 'arc'`, 2 `slashArcs`.
    - `air` 1–3 (lines `646–696`): `air_attack`, `air_attack_2`, `air_slam`, `trailStyle: 'arc'`, 1 `slashArc` each.
    - `ground` 1–6 (lines `1053–1154`): `kuroTable` (`iai_draw_slash` with `iaido_line`, `attack_1` with `arc`, `attack_2` with `arc`, `rising_dragon_slash` with `arc`, `flurry_slash` with 2 `arc`s, `katana_zantetsu_cut` with `iaido_line` and `zantetsuBurst: true`).
- **`src/game/synergy.ts`**:
  - Lines `89–100`: `ELEMENTAL_MARK_SPECS.mirage` exists (`kanji: '鏡'`, `markName: 'KÍNH ẤN'`, `detonateCallout: 'VỠ KÍNH HƯ KHÔNG!'`, `linkArtName: 'KÍNH GIỚI ĐOẠN KHÔNG'`, `linkShortLabel: 'KÍNH ẤN'`).
  - Lines `140–176`: `computeSynergyCooldownRefund(id, detonatedCount)` only checks `'raijin'`, `'zero'`, `'kagura'`, falling through to Kuro's default (`specialRefund: 0.55 + ...`, `dashRefund: 0.48`, `rageBonus: 6 * count`).

### 1.2 Every Place Sword-Style `slashArc` / Generic Blade Trails Are Spawned or Drawn for Mirage
1. **`src/game/animation.ts:461–476, 515–532, 646–696, 1053–1154`**: Provides Kuro's `slashArcs` (`style: 'iaido_line'` or default `'arc'`) and `trailStyle` for every Mirage attack (`ground` 1–6, `air` 1–3, `dash_slash`, `parry_counter`).
2. **`src/game/Player.ts:1895–1919` (`startAttack`)**: `if (this.character.id !== 'aether')` iterates `move.slashArcs` and calls `this.pushSlashTrail(...)` with `style: arc.style ?? move.trailStyle ?? 'arc'` and `motif: vfx.motif`. Mirage is not excluded or routed to a glass/mirror trail style.
3. **`src/game/Player.ts:1952–2056` (`startAttack`)**: No `else if (this.character.id === 'mirage')` branch exists for signature weapon-class swing particles/effects (unlike `kuro`, `aether`, `raijin`, `kagura`, `zero`).
4. **`src/game/Player.ts:1927–1929`, `1777–1785`, `1793`, `770–771`, `421–422` & `src/game/Game.ts:1604–1607`, `1844`**: Calls `particles.emitSlashBeam(...)`, which `ParticleSystem.ts:760–796` renders as a curved sword smear (`quadraticCurveTo` blade beam). Note also `Player.ts:1777–1786`: when Mirage triggers Skill-Link (`skillLinkTimer > 0` + `[J]`), there is no `mirage` branch, so it enters the `else` (Kuro Link Art) branch and calls `onDetonateAllMarks('kuro', ...)` instead of `'mirage'`.
5. **`src/game/renderer/trails.ts`**:
   - `renderSlashTrails` (lines `1314–1692`): Only handles `style === 'spear_thrust' | 'spear_flurry' | 'twin_x' | 'iaido_line'` and falls through to curved sword smear wedges (`ctx.arc`, lines `1596–1688`) for `'arc'` / `'heavy_cleave'`. Every Mirage `SlashTrail` draws either Kuro's `iaido_line` katana thrust + tsuba star glint (`lines 1522–1594`) or a wide curved sword fan wedge (`lines 1596–1688`).
   - `renderSlashMotifOrnament` (lines `662–1309`): Switch statement handles 18 motifs (`iaido_ink`..`abyssal_eclipse`) and has **NO cases for `'mirror_shatter'` or `'void_prism'`**.
   - `renderAttackSwingAura` (lines `106–589`): Switch statement on `motif` (lines `167–585`) has **NO cases for `'mirror_shatter'` or `'void_prism'`**, falling into `case 'iaido_ink': default:` (`lines 573–584`), which draws horizontal katana slash lines around Mirage's torso.
   - `inferCharacterForSkin` (lines `62–82`): Does not recognize `'void_shatterer'`, `'mirror_shards'`, or `'void_prism_scythe'`, falling back to `'kuro'` whenever `characterId` is omitted.
6. **`src/game/StickmanRenderer.ts:1016–1035` + attack poses (lines `125–408`) + `src/game/poses/zeroPoses.ts:153`**: Whenever `joints.motionArc && !isMono` is truthy, `StickmanRenderer` draws two circular `ctx.arc(...)` speed-arc lines (`rgba(226, 232, 240, 0.34)` / `rgba(255, 255, 255, 0.22)`) on every attack pose and on `dash`.
7. **`src/game/Player.ts:520–522`**: Awakening callout reads `this.skinId === 'default' ? profile.transformationCallout : this.character.awakeningBannerText`; because `getAwakenedVisualProfile('mirage')` falls through to Kuro, `mirage:default` emits `'THỨC TỈNH: HUYẾT KIẾM!'`.

### 1.3 `MirrorRift` (`[U]`), `[J]` Attacks, `Dash`, Enemy Targeting & Callouts
- **`src/game/Entities.ts:2146–2250` (`MirrorRift`)**:
  - Properties: `x`, `y`, `radius` (`165` awakened / `130` normal), `damage`, `awakened`, `primaryColor`, `secondaryColor`, `life = 0`, `maxLife = 3.8`, `active = true`, `pulseTimer = 0.2`, `finalBurstReady = false`.
  - `update(dt)`: Advances `life`, pulses every `0.45s` (awakened) or `0.58s` (normal), sets `active = false` and `finalBurstReady = true` when `life >= maxLife`.
  - `render(ctx)`: Draws a vertical diamond mirror frame (`h = 92/74`, `w = 32/24`), internal fracture lines, and `6/4` orbiting diamond shards. Balanced `save`/`restore`, zero `shadowBlur`.
- **`src/game/Player.ts` & `src/game/Game.ts` Lifecycle**:
  - Queue: `Player.pendingMirrorRifts` (`Player.ts:128–135`), pushed from:
    - `[U]` (`kind === 'mirror_fracture'`, `Player.ts:1377–1400`): 1 rift at `clamp(this.x + this.facing * 125, 75, ARENA_WIDTH - 75)`, `y = this.y - 58`, `damage = Math.round((this.awakened ? 28 : 20) * this.character.damageMultiplier)`, sets `skillLinkTimer = 1.25`, emits `'CỔNG GƯƠNG HƯ KHÔNG!'`.
    - Awakening (`Player.ts:496–515`): 2 parallel rifts at `this.x ± 120`, `y = this.y - 56`, `damage = 24`, `awakened: true`.
    - Ultimate (`Game.ts:2457–2479`): pushes 1 `MirrorRift` directly into `this.mirrorRifts` at `clamp(this.player.x + this.player.facing * 95, 80, ARENA_WIDTH - 80)`, `y = this.player.y - 60`, `damage = isOverdrive ? 36 : 26`, `awakened: true`, `maxLife = 4.8`.
  - Update (`Game.ts:1342–1389`): Flushes `pendingMirrorRifts`, calls `rift.update(worldDt)`, reflects enemy projectiles within `Math.hypot(proj.x - rift.x, proj.y - rift.y) < rift.radius * 0.55`, and on pulse/`finalBurstReady` damages enemies within `rift.radius` + applies 1 stack of `'mirage'` mark + calls `registerPlayerHit`.
  - **Lifecycle Gap**: `Game.enterTitleState()` (`Game.ts:461–488`) and `Game.startMode()` (`Game.ts:508–554`) clear `iceWalls`, `magmaPillars`, `projectiles`, etc., but do **not** clear `this.mirrorRifts = []` (or `this.valkyrieBoomerangs = []`).
  - Render (`Game.ts:2792–2794`): Rendered inside `if (!monoArena)` after `this.player.render` and `this.projectiles`.
- **Player `[J]` Attack & `Dash` Mechanics (Interaction Hooks)**:
  - `Dash` (`Player.ts:719–847`): Consumes `'dash'`, sets `dashTimer = 0.16`, `dashGraceTimer = 0.3`, `dashCooldown = this.dashCooldownMax`, `invulnTimer >= 0.24`, `vx = facing * moveSpeed * 3.3 * (awakened ? 1.15 : 1)`. Already demonstrates entity-interaction pattern by iterating `iceWalls` (`lines 820–839`) on dash-through and calling `params.onSkillLinkWarp('zero')` (`lines 728–748`). Currently has **zero** interaction with `mirrorRifts`.
  - `[J]` Attack (`Player.ts:849–885`, `1669–2189`; `Game.ts:1545–1694`):
    - `Player.update` spawns `this.activeHitbox` (`ActiveMeleeHitbox` with `id`, `x`, `y`, `width`, `height`, `damage`, `knockX`, `knockY`, `heavy`, `unblockable`, `hitIds: Set<number>`) during `elapsed in [activeStart, activeEnd]` (`Player.ts:1183–1216`).
    - `Player.startAttack` already receives `iceWalls` and checks proximity (`lines 2098–2119`) to launch them; `Game.ts:1545–1694` checks `this.player.activeHitbox` against `this.soulCrystals` (using `c.lastHitboxId === hb.id` to hit once per hitbox) and `this.enemies` (using `hb.hitIds.has(enemy.id)`). Currently neither `Player` nor `Game` checks `activeHitbox` against `mirrorRifts`.
  - Enemy Targeting & Projectiles:
    - Nearest enemy lookup pattern exists in `Game.ts:1215–1228` (`findAttackTarget`) and `Game.ts:1315–1335` (`onSkillLinkWarp`: loops `this.enemies` where `enemy.alive && !enemy.dying`).
    - `Game.ts:1800–1867` handles player projectiles (`fromPlayer === true`): `proj.kind !== 'sword_wave' && proj.kind !== 'volt_lance' && proj.kind !== 'fire_wave' && proj.kind !== 'void_crescent'` deactivates on first enemy hit (`proj.active = false; break;`); piercing projectiles use `proj.hitEnemyIds.has(enemy.id)` to hit each enemy once. `Entities.ts:498–507` defines `ProjectileKind` (`'bullet' | 'spear' | 'laser' | 'orb' | 'sword_wave' | 'kunai' | 'volt_lance' | 'fire_wave' | 'void_crescent'`).
  - Callout / Floating Text:
    - `ParticleSystem.emitText(x, y, text, color, size)` (`ParticleSystem.ts:346–365`, rendered at `974–988` with `#090b10` outline + `color` fill, `maxLife = 0.85s`, `vy = -85`). Used across `Player.ts` and `Game.ts` (e.g. `'ẢNH BỘ!'` at `Player.ts:743`, `'CỔNG GƯƠNG HƯ KHÔNG!'` at `Player.ts:1398`, `spec.detonateCallout` at `Game.ts:2348`).

### 1.4 Dependencies, Contracts & Test Invariants
- **`src/game/rules.test.ts`** (17 tests):
  - `lines 139–160`: Asserts `CHARACTER_ORDER.length === 7`, 7 unique `ultimateKanji`, 7 unique `specialKind`.
  - `lines 199–221`: For every `id` in `CHARACTER_ORDER`:
    - `ground` steps `1..6`: **requires `poses.size >= 5`** (at least 5 distinct pose names) and `0.35 < move.cancelRatio < 0.7`.
    - `air` step `3`: `pose.length > 0`, `unblockable === true`.
    - `dash_slash` step `1`: `lungeSpeed >= 500`, `afterimages === true`.
    - `parry_counter` step `1`: `pose.length > 0`, `unblockable === true`.
  - `lines 250–270`: Tests `getUltimateStyleId(id)` and `getAwakenedVisualProfile(id)` for all 7 characters (`formTitle.length > 0`, `transformationCallout.length > 0`).
  - `lines 272–301`: Tests `ELEMENTAL_MARK_SPECS`, `computeDetonationDamage`, `computeSynergyCooldownRefund(id, 2)` (`specialRefund > 0 && dashRefund > 0 && rageBonus > 0`), and 7 distinct `detonateCallout` / `linkArtName`.
- **`tests/e2e/helpers/testHarness.ts` (`lines 153–180`) & `tests/e2e/r3_inkwash.e2e.test.ts` (`line 445`)**:
  - `SkinVfxProfileContract` expects `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary` on every entry in `SKIN_VFX_PROFILES`, and valid `ProjectileTheme`.
- **Android Canvas 2D & Build Constraints (`PROJECT.md`, `ORIGINAL_REQUEST.md`)**:
  - Zero `ctx.shadowBlur` anywhere in `src/` (currently 0 occurrences verified via `grep_search`).
  - Balanced `ctx.save()` / `ctx.restore()` (= 0 net delta), no `NaN`/`Infinity`.
  - Source must be synced to `/data/user/0/com.agy/files/stickman-build/src` for `rules.test.ts` and `vite build`.

---

## 2. Logic Chain
1. **Why Mirage currently shows sword trails**: `getComboMoveForCharacter` (`animation.ts:400–1155`) lacks a `'mirage'` branch, returning Kuro's katana `ComboMoveSpec` (`trailStyle: 'iaido_line'` / `'arc'`, sword `slashArcs`) -> `Player.startAttack` (`Player.ts:1895–1919`) pushes `SlashTrail`s for every non-`aether` character -> `renderSlashTrails` (`trails.ts:1314–1692`) draws curved blade smear wedges or iaido katana lines, while `renderSlashMotifOrnament` (`trails.ts:662–1309`) and `renderAttackSwingAura` (`trails.ts:106–589`) lack `'mirror_shatter'`/`'void_prism'` cases, and `StickmanRenderer.ts:1016–1035` draws `joints.motionArc` circular sword arcs.
2. **Why Mirage's Awakening & Skill-Link show Kuro text/behavior**: `getAwakenedVisualProfile` (`animation.ts:182–360`) has no `case 'mirage'`, falling through to Kuro (`'THỨC TỈNH: HUYẾT KIẾM!'`), and `Player.ts:1777–1786` + `synergy.ts:140–176` lack `'mirage'` branches, causing Mirage's Skill-Link to trigger Kuro's Link Art and call `onDetonateAllMarks('kuro', ...)`.
3. **Where R4 `MirrorRift` interactions plug in cleanly**: `MirrorRift` instances live in `Game.mirrorRifts` (`Game.ts:105, 1342–1389`), updated alongside `this.player` and `this.enemies`. `Player.update` already passes callbacks/entity arrays (`iceWalls`, `onSkillLinkWarp`, etc.) between `Player` and `Game`, and `Game.ts:1545–1558` already resolves `this.player.activeHitbox` against non-enemy arena entities (`soulCrystals` via `lastHitboxId`). Thus:
   - `[J]` hitting a `MirrorRift` can be resolved cleanly in `Game.ts` via `this.player.activeHitbox` (with a `lastHitboxId` guard on `MirrorRift`, mirroring `SoulCrystal`) to shatter the rift into piercing prism shards aimed at the nearest alive enemy (or AoE glass explosion) + emit a callout via `particles.emitText(...)`.
   - `Dash` through a `MirrorRift` can be resolved either via a `PlayerUpdateParams` callback (mirroring `onSkillLinkWarp` in `Player.ts:728–748`) or in `Game.ts` when `dashTimer` starts/is active, warping the player behind the nearest enemy or to another `MirrorRift`, emitting shatter afterimages/shards, refunding cooldowns, and calling `particles.emitText(...)`.

---

## 3. Caveats
- `PeriodicTableBG.ts`, `UltimateCutscene.ts` (other characters), and `renderer/gear.ts` (full `mirage` outfit/aura implementation for R2/R3) were out of scope for Survey Explorer 1 (covered by Survey Explorer 2) and were only spot-checked for `mirage`/`void_shatterer`/`shadowBlur` references.
- `tsc --noEmit` was not executed (per `PROJECT.md:96`, `typescript@7.0.2` in `stickman-build` lacks `@typescript/typescript-android-arm64`; build/type verification uses `vite build` + `tsx`).

---

## 4. Conclusion
1. **R1 Implementation Targets**:
   - Add a dedicated `'mirage'` moveset in `src/game/animation.ts` (`getComboMoveForCharacter` for `ground` 1–6, `air` 1–3, `dash_slash`, `parry_counter` — ensuring `>= 5` distinct ground poses and `cancelRatio` in `(0.35, 0.7)` per `rules.test.ts`), plus `case 'mirage':` in `getAwakenedVisualProfile` (`default` & `void_shatterer`).
   - Add `'mirror_fracture'` / `'prism_shatter'` (or similar non-sword `SlashTrailStyle` + `renderSlashMotifOrnament` + `renderAttackSwingAura` cases for `'mirror_shatter'` and `'void_prism'`) in `src/game/renderer/types.ts` and `src/game/renderer/trails.ts`, update `inferCharacterForSkin` for `'void_shatterer'` / `'mirror_shards'` / `'void_prism_scythe'`, and suppress/replace circular `joints.motionArc` and `emitSlashBeam` sword smears when `characterId === 'mirage'` (`StickmanRenderer.ts`, `Player.ts`, `Game.ts`).
   - Fix `mirage` Skill-Link in `Player.ts:1777` (call `onDetonateAllMarks('mirage', ...)` with shard/prism burst instead of Kuro's `emitSlashBeam`), add `'mirage'` in `synergy.ts:computeSynergyCooldownRefund`, and complete missing `SkinVfxProfile` fields & valid `projectileTheme` in `src/game/skinVfx.ts:551–598`.
2. **R4 Implementation Targets**:
   - Extend `MirrorRift` (`src/game/Entities.ts:2146–2250`) with `lastHitboxId` / `shattered` / `warpTriggered` or shatter helpers, and support a piercing glass-shard `ProjectileKind` (or piercing behavior in `Game.ts:1857–1865`).
   - Wire `[J]` melee hit vs `this.mirrorRifts` in `Game.ts` (shatter rift into homing/targeted piercing shards toward nearest alive enemy + AoE burst + callout) and `Dash` through `MirrorRift` (Mirror Warp behind nearest enemy or paired `MirrorRift`, shard afterimages, short cooldown refund, callout).
   - Clear `this.mirrorRifts = []` in `Game.enterTitleState()` and `Game.startMode()`.

---

## 5. Verification Method
- **Static & Unit Checks** (run in `/data/user/0/com.agy/files/stickman-build` after syncing `src`):
  - `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts` (confirm all 17/17 tests remain passing, especially `getComboMoveForCharacter` and `getAwakenedVisualProfile`).
  - `node node_modules/vite/bin/vite.js build` (confirm clean production bundle).
  - Static grep for `shadowBlur` in `src/` (must be 0 matches).
- **Files to Inspect**:
  - `src/game/animation.ts` (`182–360`, `400–1155`)
  - `src/game/Player.ts` (`496–524`, `719–847`, `1377–1400`, `1669–2189`)
  - `src/game/renderer/trails.ts` (`62–82`, `106–589`, `662–1692`)
  - `src/game/StickmanRenderer.ts` (`1016–1035`)
  - `src/game/Entities.ts` (`498–558`, `2146–2250`)
  - `src/game/Game.ts` (`461–554`, `1342–1389`, `1545–1694`, `1800–1867`, `2457–2479`)
  - `src/game/skinVfx.ts` (`551–598`), `src/game/synergy.ts` (`140–176`)
- **Invalidation Conditions**: Any refactor changing `CHARACTER_ORDER`, `ComboMoveSpec` pose counts `< 5`, `cancelRatio` outside `(0.35, 0.7)`, or introducing `ctx.shadowBlur` / unbalanced `save`/`restore` invalidates existing invariants.
