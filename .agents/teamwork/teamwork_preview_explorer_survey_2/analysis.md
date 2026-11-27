# Phase 0 Survey — Combat, Attack & VFX Architecture Analysis

**Core Finding:** The game runs a fixed-substep (`1/120s`) 2D Canvas engine (`Game` → `Player` → `StickmanRenderer` + `ParticleSystem` + `Entities`) with 4 fighters × 3 skins = **12 distinct character-skin pairs** (9 `SkinId` values). While character body armor, headgear, back attachments, and `slashColors` already exist per skin in `src/game/characters.ts` and `src/game/StickmanRenderer.ts`, **attack VFX are only partially skin-aware**: `SlashTrail` rendering ignores `skinId` (hardcoding `#fde047` on `heavy_cleave` and `#ffffff` cores), normal/awakened/link-art/detonation attack particles hardcode base-character colors in `Player.ts` and `Game.ts`, and `Projectile` / `MagmaPillar` / `UltimateCutscene` only special-case Kuro's two skins (`radiant_seraph`, `void_walker`), leaving the other 6 non-default skins sharing base-character attack VFX.

---

## 1. Core Game Loop, Rendering Architecture, Timing & Entity Lifecycle

### 1.1 Game Loop & Frame Timing
- **Host Mount (`src/App.tsx:115-157`)**: Mounts a single `<canvas data-testid="game-canvas">` and instantiates `new Game(canvas, onHudUpdate)` once in `useEffect`. URL params `?char=`, `?skin=`, `?stage=`, `?touch=1`, `?autostart=1` are supported (`App.tsx:126-151`).
- **Canvas & DPR (`src/game/Game.ts:170-244`)**: Acquires `CanvasRenderingContext2D` (`Game.ts:171`), observes resize via `ResizeObserver`, and caps DPR at `Math.min(window.devicePixelRatio || 1, 1.5)` (`Game.ts:219`) to keep mobile GPU fill-rate stable.
- **RAF Loop (`src/game/Game.ts:757-771`)**: `startLoop()` schedules `window.requestAnimationFrame(tick)`. Each frame:
  - `rawDt = (now - this.lastTimestamp) / 1000`
  - `dt = Math.min(Math.max(rawDt, 0.001), 0.05)` (`Game.ts:763`) — clamps delta to `[1ms, 50ms]`.
  - Calls `this.update(dt)` then `this.render()`.
- **Update & Simulation Substepping (`src/game/Game.ts:773-858`)**:
  - In `'title'` state (`774-780`): updates `bg`, `player.updateIdleOnTitle(dt, particles)`, `particles.update(dt)`, `camera.update(dt, viewW, viewH)`.
  - In `'playing'` state (`782-856`):
    - **Real-time visual tick** (`787-792`): `bg.update`, `particles.update`, `camera.update`, `comboPulse`, `awakenPromptTimer`, and `impactFrameTimer` always advance by real `dt`, even during hitstop or boss intro.
    - **Freeze states**: `pendingOutcome` (`795-804`), `cutscene.active` (`807-812`), `bossIntroTimer` (`815-828`), and `blessingChoices` (`831-834`) return early before combat simulation.
    - **Fixed substepping (`SIM_STEP = 1 / 120`, `837-858`)**: breaks `dt` into `<= 1/120s` chunks. If `hitstopTimer > 0`, decrements `hitstopTimer` and skips `simulateStep` (`841-844`), freezing physics/animations on heavy hits while particles/camera still animate.
  - **Witch Time Time-Dilation (`src/game/Game.ts:900-901`)**: `worldDt = this.witchTimeTimer > 0 ? dt * 0.24 : dt`. Player, player projectiles, `chair`, and `lootOrbs` run at `100% dt`; enemies, bosses, enemy projectiles, `magicCircles`, `stageHazards`, and `pendingSpawns` run at `24% worldDt`.

### 1.2 Rendering Pipeline (`src/game/Game.ts:2031-2291`)
| Pass | Space | Function / Layer | File:Lines |
|---|---|---|---|
| 1 | Screen | `bg.renderScreenBackdrop(...)` (sky, landmarks, god-rays, motes, flash) | `Game.ts:2041-2047` |
| 2A | World (`camera.applyTransform`) | `bg.renderWorld` (or monochrome silhouette BG during Ultimate phase) | `Game.ts:2050-2071` |
| 2A | World | `stageHazards` → `magicCircles` → `chair` → `iceWalls` → `magmaPillars` → `lootOrbs` → `enemies` → `player.render` → `projectiles` → `particles.render` | `Game.ts:2074-2119` |
| 2B | World (`lighter` blend) | Additive radial point-light halos around Player (`r=88/145`), Active Boss (`r=125`), and Projectiles (`r=max(32, radius*2.2)`) | `Game.ts:2122-2175` |
| 2B-2 | Screen | Witch Time cyan-violet vignette | `Game.ts:2180-2196` |
| 2C | Screen (`lighter` blend) | Peripheral anime speed lines during `dashTimer > 0`, `awakened`, or `witchTimeTimer > 0` | `Game.ts:2199-2225` |
| 3 | Screen | Sakuga Impact Frame (dark/white flash + 18 radial burst lines) | `Game.ts:2228-2250` |
| 3B/4 | Screen | Edge vignette + low-HP (`<= 30%`) pulsing crimson vignette | `Game.ts:2253-2283` |
| 5 | Screen | `cutscene.renderScreen(ctx, viewW, viewH)` | `Game.ts:2286-2288` |

### 1.3 Entity Lifecycle & Cleanup
- **Game Reset Points**: `enterTitleState()` (`Game.ts:423-458`) and `startMode()` (`Game.ts:460-551`) clear `particles.clear()`, reset `enemies = []`, `activeBoss = null`, `iceWalls = []`, `magmaPillars = []`, `projectiles = []`, `magicCircles = []`, `stageHazards = []`, `lootOrbs = []`, `pendingSpawns = []`, `cutscene.active = false`, and call `player.reset()`.
- **Per-frame Pruning (reverse loop `.splice(i, 1)`)**:
  - `lootOrbs`: `orb.update()` sets `active = false` on pickup or `age > 9.0` (`Entities.ts:1098-1104`, pruned `Game.ts:974-976`).
  - `magmaPillars`: `active = false` when `timer >= delay + 0.44` (`Entities.ts:977-979`, pruned `Game.ts:1121-1123`).
  - `iceWalls`: `active = false` on `shatter()` (`hp <= 0`, `life >= maxLife` [8.5s standing / 1.1-1.25s launched], or arena bounds) (`Entities.ts:182-214`, pruned `Game.ts:1170-1172`).
  - `stageHazards`: `active = false` when `timer >= telegraphTime + activeDuration` (`Entities.ts:1220-1222`, pruned `Game.ts:1302-1304`).
  - `magicCircles`: `active = false` when `timer >= telegraphTime + 0.42` (`Entities.ts:885-887`, pruned `Game.ts:1324-1326`).
  - `projectiles`: `active = false` on `life >= maxLife`, arena bounds, or non-piercing hit (`Entities.ts:546-554`, pruned `Game.ts:1334-1337`).
  - `enemies`: `!enemy.alive` after KO timer `0.82s` (`Enemy.ts:50`, pruned `Game.ts:1468-1481`).
  - `Player.afterimages` & `Player.slashTrails`: pruned in `Player.update` via reverse `.splice(i, 1)` when `life >= maxLife` (`Player.ts:475-486`).

---

## 2. Attack Moves, Combos, Skills, Slash Arcs, Hitboxes & Damage Triggers

### 2.1 Input Buffering & Attack Priority (`src/game/InputHandler.ts`, `src/game/Player.ts`)
- `InputHandler` buffers presses for `0.22s` (`InputHandler.ts:70, 85`) and decays timers in `input.update(dt)` (`138-145`).
- In `Player.update` (`658-692`), attack input is allowed when `hurtTimer <= 0 && awakenPoseTimer <= 0` AND either `attackTimer <= 0`, `attackElapsed >= attackDuration * currentMove.cancelRatio`, or `dashTimer > 0 && dashTimer < 0.12` (dash-cancel).
- **Soft Target Assist (`Player.ts:1269-1272`, `Game.ts:993-1006`)**: if no horizontal direction is held, faces nearest alive enemy within `300px` X and `170px` Y.
- **Attack Context Resolution Priority (`Player.ts:1275-1383`)**:
  1. **Skill-Link Art** (`skillLinkTimer > 0`): consumes `skillLinkTimer`, sets `activeAttackIsLinkArt = true` and `activeAttackDetonates = true`.
  2. **Parry Counter** (`parryCounterWindow > 0`): `context = 'parry_counter'`, sets `activeAttackDetonates = true`.
  3. **Iaido Dash-Slash** (`dashTimer > 0 || dashGraceTimer > 0`): `context = 'dash_slash'`, sets `activeAttackMarkStacks = 1`, `activeAttackDetonates = true`.
  4. **3-Hit Air Combo** (`!onGround`): `context = 'air'`, cycles `airComboStep` `1 → 2 → 3` (step 3 sets `activeAttackDetonates = true`, forces downward dive/slam).
  5. **6-Hit Ground Combo**: `context = 'ground'`, cycles `comboStep` `1 → 6` (`comboResetTimer = 0.92s`; steps 3 & 4 set `activeAttackMarkStacks = 1`; step 6 sets `activeAttackDetonates = true`).

### 2.2 Complete Moveset & Slash Arc Inventory (`src/game/animation.ts:247-1002`)
All moves return a `ComboMoveSpec` (`animation.ts:209-236`) from `getComboMoveForCharacter(characterId, step, context)`. Note that `step` & `context` depend ONLY on `characterId` (not `skinId`), preserving identical frame data, reach, and damage across skins (R3).

| Fighter | Context | Moves / Poses | HitCount | TrailStyle(s) | Special Mechanics |
|---|---|---|---|---|---|
| **KURO** (Katana) | Ground 1–6 | `iai_draw_slash`, `attack_1` (kick), `attack_2`, `rising_dragon_slash`, `flurry_slash`, `katana_zantetsu_cut` | 1,1,1,1,2,1 | `iaido_line` (1,6), `arc` (2–5) | Step 6 `zantetsuBurst: true`, `unblockable` |
| **KURO** | Air 1–3 | `air_attack`, `air_attack_2`, `air_slam` | 1,1,1 | `arc` | Step 3 `airSlamPendingImpact` + `unblockable` |
| **KURO** | Dash / Parry | `dash_slash` / `parry_counter` | 1 / 1 | `iaido_line` / `arc` (2 arcs) | Parry counter `unblockable` |
| **RAIJIN** (Volt Spear) | Ground 1–6 | `spear_thrust`, `spear_jab_low`, `spear_flurry_thrust`, `vault_spear_slam`, `spear_sky_drill`, `spear_dragon_pierce` | 1,2,3,1,1,1 | `spear_thrust` (1,2,5,6), `spear_flurry` (3), `arc` (4) | Step 6 fires `volt_lance` (unawakened) + `unblockable`; long `reachScale` (1.38–1.82) |
| **RAIJIN** | Air 1–3 | `spear_thrust`, `spear_flurry_thrust`, `spear_air_dive` | 1,2,1 | `spear_thrust`, `spear_flurry`, `spear_thrust` | Step 3 diagonal dive (`vx = facing * 420`, `vy = 760`) |
| **RAIJIN** | Dash / Parry | `spear_dragon_pierce` / `spear_dragon_pierce` | 1 / 1 | `spear_thrust` | `reachScale` 1.6 / 1.65 |
| **KAGURA** (Flame Nodachi) | Ground 1–6 | `nodachi_drag_cleave`, `nodachi_overhead_slam`, `nodachi_tornado_spin`, `attack_2`, `rising_dragon_slash`, `nodachi_earth_splitter` | 1,1,2,1,1,1 | `heavy_cleave` (all 6) | `earthSlam` on 2,6; `surroundHit` on 3; step 6 spawns `MagmaPillar` |
| **KAGURA** | Air 1–3 | `air_attack`, `air_attack_2`, `nodachi_earth_splitter` | 1,1,1 | `heavy_cleave` | Step 3 `earthSlam`, `unblockable` |
| **KAGURA** | Dash / Parry | `nodachi_drag_cleave` / `nodachi_overhead_slam` | 1 / 1 | `heavy_cleave` | `earthSlam: true` |
| **ZERO** (Twin Daggers) | Ground 1–6 | `shadow_blink_cut`, `dagger_reverse_slice`, `dagger_buzzsaw_flip`, `dagger_phantom_blitz`, `air_attack_2`, `cross_x_slash` | 2,1,2,3,1,2 | `twin_x` (1,2,4,6), `arc` (3,5) | Step 3 `surroundHit`; steps 4,6 fire `kunai` (unawakened); step 6 `passThrough` |
| **ZERO** | Air 1–3 | `dagger_buzzsaw_flip`, `cross_x_slash`, `air_slam` | 2,2,1 | `arc`, `twin_x`, `twin_x` | Step 1 `surroundHit` |
| **ZERO** | Dash / Parry | `shadow_blink_cut` / `cross_x_slash` | 2 / 2 | `twin_x` | Both `passThrough: true` |

### 2.3 Slash Trail Generation (`src/game/Player.ts:1461-1481`)
- `baseRadius = (this.awakened ? 112 : 78) + this.character.reachBonus * 0.55`
- `[normalCol, heavyCol] = this.character.slashColors`
- `outerColor = this.awakened || move.heavy ? heavyCol : normalCol`
- Pushes one `SlashTrail` per `arc` in `move.slashArcs`:
  - `x`: `this.x + this.facing * (22 + i * 7)`, `y`: `this.y + arc.yOffset`
  - `radius`: `baseRadius * arc.radiusScale`
  - `maxLife`: `(this.awakened ? 0.25 : 0.2) + i * 0.03`
  - `outerColor`: `i === 0 ? outerColor : '#f8fafc'`, `coreColor`: `'#ffffff'`
  - `thickness`: `(this.awakened ? 21 : this.character.id === 'kagura' ? 19 : 15) - i * 3`
  - `style`: `arc.style ?? move.trailStyle ?? 'arc'`

### 2.4 Hitbox Window, Collision & Damage Triggers
1. **Melee Hitbox Window (`Player.ts:939-971`, `1620-1673`)**:
   - Active between `12%` and `74%` of `attackDuration`.
   - Multi-hit moves divide `[0.12*D, 0.74*D]` into `hitCount` intervals, spawning a fresh `ActiveMeleeHitbox` (with a new `id` and empty `hitIds: Set<number>`) at each sub-hit boundary (`951-957`). Between sub-hits, `activeHitbox.x` and `.y` track the player (`958-961`).
   - `width = surround ? reach * 1.65 : reach` where `reach = ((awakened ? 136 : 96) + reachBonus + (isLinkArt ? 36 : 0)) * reachScale`.
   - `height = (awakened || isLinkArt ? 124 : 96) * heightScale`.
   - **Collision Check (`Game.ts:1176-1244`)**: AABB overlap `Math.abs(enemy.x - hb.x) < hb.width * 0.5 + 24 && Math.abs(enemy.y - 48 - hb.y) < hb.height * 0.5 + 42`. Checks `isAttackBlockedByShield` (`rules.ts:199-209`), applies `scalePlayerDamage` (`Game.ts:860-866`), `enemy.takeDamage`, `applyBossPostureHit`, `applyElementalMark`, `detonateElementalMarks`, `triggerImpactFrame`, `hitstopTimer`, `camera.addShake`.
2. **Signature Skills `[U]` (`Player.ts:1007-1246`)**:
   - `cryo_wall` (Kuro): spawns/launches `IceWall` (`Game.ts:1127-1173` handles crush damage), chills enemies within `175px` (`Game.ts:1057-1065`), Awakened launches 2 `sword_wave` projectiles.
   - `thunder_blink` (Raijin): instant blink + `onThunderBlinkHit` (`Game.ts:1032-1056`) damages/stuns/marks all enemies in `[minX-42, maxX+42]`.
   - `magma_eruption` (Kagura): spawns 3 (or 5 awakened) `MagmaPillar`s, or triggers `kaguraAirDivePending` landing eruption (`Player.ts:895-907`). `Game.ts:1092-1124` checks `Math.abs(enemy.x - mp.x) < 66 && enemy.y > GROUND_Y - 195`.
   - `phantom_barrage` (Zero): backstep leap + 5 (or 7 awakened + `void_crescent`) `kunai` projectiles.
3. **Skill-Link Arts (`Player.ts:1277-1359`)**: `[U]` or Perfect Parry/Dodge opens `skillLinkTimer` (`0.9s–1.25s`); pressing `[J]` triggers character Link Art + `onDetonateAllMarks` (`Game.ts:1717-1815`).
4. **Dash `[L / Shift]` (`Player.ts:564-655`)**: Zero with `skillLinkTimer > 0` warps behind target (`onSkillLinkWarp`); Kuro dashing through standing `IceWall` overcharge-launches it; Awakened Raijin deals `26` damage along dash path.
5. **Parry `[K]` (`Player.ts:532-547`, `Game.ts:1406-1414, 1606-1610, 1645-1707`)**: reflects enemy projectiles (`computeReflectedProjectile`) or staggers/breaks melee attackers, adds 3 mark stacks, optionally fires `sword_wave` with `counter_mastery` blessing.
6. **Ultimate `[I]` (`Game.ts:1848-2015`)**: starts `UltimateCutscene` (`2.7s`), triggers `onKanjiImpact` at `t >= 2.18s` dealing `9999` to mobs or `computeOverdriveUltimateDamage` to Boss, plus character aftermath.
7. **Awakening `[O]` (`Player.ts:283-361`, `Game.ts:1008-1030`)**: 22s buff (`awakened = true`), refreshes `[U]` and `[L]`, opens `skillLinkTimer = 1.25`, marks enemies within `260px`.

---

## 3. Existing Visual Effects Systems, Blend Modes, Pools & Cleanup

### 3.1 `ParticleSystem` (`src/game/ParticleSystem.ts:1-676`)
- **Pooling**: Pre-allocated array of `MAX_PARTICLES = 500` (`ParticleSystem.ts:37-84`) with round-robin `cursor` overwrite when saturated. **Zero GC allocation** during combat; `clear()` resets all `active = false`.
- **Supported Kinds (`ParticleKind`, lines 3-15)**:
  - Additive (`globalCompositeOperation = 'lighter'`): `'spark'` (velocity-streaked glowing line + white core), `'ring'` (3-layer expanding shockwave), `'lightning'` (4-segment jagged bolt + white core), `'ember'` (rotated diamond + halo + white center).
  - Normal (`source-over`): `'smoke'` (soft circle), `'cartoon_smoke'` (cel-shaded puffy cloud with `#0e1116` ink outline), `'ice'` (rotated crystal shard with white stroke), `'crack'` (5-branch floor crack), `'slash_beam'` (tapered anime cut smear with `#090b10` ink rim + color + white core), `'chain_arc'` (jagged energy tether between `(x1,y1)` and `(x2,y2)`), `'text'` (pop-scaling italic callout).
  - **Dead/Unused Kind**: `'ink_splatter'` is declared in `ParticleKind` (`line 12`) but has **no emitter method and no render branch** in `ParticleSystem.ts`.
- **Lifecycle**: `update(dt)` increments `life += dt`; `life >= maxLife` sets `active = false`.

### 3.2 `SlashTrail` & `Afterimage` (`Player.ts`, `StickmanRenderer.ts`)
- **`Player.slashTrails` (`Player.ts:144, 481-486`)**: Unpooled `SlashTrail[]` array (typically 1–4 items alive simultaneously; each lives `0.20s–0.28s`). Rendered in `renderSlashTrails` (`StickmanRenderer.ts:3486-3690`) with `globalCompositeOperation = 'lighter'`:
  - `'spear_thrust'`: Mach ellipse ring + electric lance cone + white needle core.
  - `'spear_flurry'`: 5-needle fan (`[-0.28, -0.14, 0, 0.14, 0.26]`).
  - `'twin_x'`: dual intersecting X-scissor crescents (`-0.52`, `+0.52`).
  - `'iaido_line'`: horizontal horizon-severing thread + 4-point tsuba glint star.
  - `'arc'` / `'heavy_cleave'`: animated head/tail arc smear with outer bloom, translucent fan wedge, sharp outer edge, and white core. **Bug/limitation**: `heavy_cleave` hardcodes `#fde047` on line 3675 regardless of `skinId` (e.g., `frost_empress` uses cyan/violet!).
- **`Player.afterimages` (`Player.ts:143, 475-480`)**: Unpooled `Afterimage[]` storing skeleton joint snapshots (`maxLife` `0.19s–0.48s`). Rendered via `renderAfterimages` (`StickmanRenderer.ts:3471-3481`) with `alpha = (1 - life/maxLife) * 0.38`.

### 3.3 Character, Skin & Aura Rendering (`StickmanRenderer.ts`)
- **`renderDarkInkAura` (`1374-1423`)**: Ground shadow puddle + 7 animated ink-flame tendrils; supports 6 modes (`purple`, `crimson`, `cyan`, `gold`, `ember`, `emerald`) wired via `character.auraStyle` / `awakenedAuraStyle`.
- **`renderSkinBackAttachment` (`1772-2156`)**: Already draws bespoke idle/combat back visuals for **all 8 non-default skins**:
  - `radiant_seraph` (6-wing angelic feathers + awakened halo wheel + waist feathers)
  - `void_walker` (tendrils + 3 orbiting void shards + awakened singularity & nebula cloak)
  - `storm_shogun` (5-drum Raijin thunder halo)
  - `cyber_valkyrie` (3-tier holographic magenta/cyan mech wings)
  - `solar_phoenix` (3-tier phoenix flame wings + sun disc)
  - `frost_empress` (3 glacial crystal wings + 2 frostfire orbs)
  - `blood_moon` (glowing crimson crescent moon sigil)
  - `astral_phantom` (dual tilted cyan/gold constellation rings)
- **`renderSkinBodyArmor` (`2161-2325`)** & **`renderHeroHeadGear` (`1456-1765`)**: Skin-specific armor & headgear for all 8 skins.
- **`renderAwakenedBackForm` (`2332-2510`)** & **`renderAwakenedHeadForm` (`2515-2668`)**: Only `kuro` branches on `skinId` (`radiant_seraph`, `void_walker`); `raijin`, `kagura`, `zero` do NOT adapt awakened crown/back-form colors to their skins.
- **`renderWeapon` (`2827-3469`)** & off-hand (`1327-1349`): Only `kuro` has skin-specific `weapon`/`awakenedWeapon` entries (`seraph_blade`/`seraph_greatsword`, `void_blade`/`void_greatsword`). `raijin`, `kagura`, `zero` skins use base weapons (`volt_spear`, `flame_nodachi`, `twin_daggers`), though Zero's off-hand blade checks `skinId` at `1338-1345`.
- **Ambient Aura Particles (`Player.ts:1675-1703`)**: Emits `smoke` every `0.085s` (`0.045s` awakened), `embers` when awakened, and `lightning` on chair / awakened / `raijin`. Uses `glowColor` / `awakeningWaveColor` / `accentColor`.

### 3.4 Current Skin Coverage Gap Matrix (All 12 Character-Skin Pairs)

| Character | SkinId | `slashColors` in `characters.ts` | `SlashTrail` Motif | Normal/Awakened Attack Particles | Dash / Parry / Mark Detonation VFX | `[U]` Skill / Entity VFX | Ultimate Cutscene |
|---|---|---|---|---|---|---|---|
| **Kuro** | `default` | `#38bdf8`, `#ef4444` | Generic `iaido_line` / `arc` | Sparks + Zantetsu beam (`Player.ts:1487-1497`) | Generic + Ice (`Game.ts:1151,1777`) | IceWall `'ice'` + `#ef4444` wave | `renderScarletSheath` |
| **Kuro** | `radiant_seraph` | `#fde047`, `#f59e0b` | **Same generic** `iaido_line`/`arc` | **Same** sparks/beam (`Player.ts:1487-1497`) | Dash custom (`618`); Detonation **hardcoded Ice/Red** (`Game.ts:1777`) | IceWall `'seraph'` + `#facc15` `sword_wave` | `renderRadiantSeraphUltimate` |
| **Kuro** | `void_walker` | `#a855f7`, `#e879f9` | **Same generic** `iaido_line`/`arc` | **Same** sparks/beam (`Player.ts:1487-1497`) | Dash custom (`622`); Detonation **hardcoded Ice/Red** (`Game.ts:1777`) | IceWall `'void'` + `#a855f7` `sword_wave` | `renderVoidWalkerUltimate` |
| **Raijin** | `default` | `#22d3ee`, `#facc15` | Generic `spear_thrust`/`flurry` | Hardcoded `#facc15`/`#38bdf8`/`#fef08a` | Hardcoded `#facc15`/`#22d3ee` | Hardcoded `#fef08a`/`#22d3ee` | `renderVoltJudgment` |
| **Raijin** | `storm_shogun` | `#60a5fa`, `#fde047` | **Same** + hardcoded `#ffffff` core | **Hardcoded base colors** (`1502,1515,1571`) | **Hardcoded base colors** (`1322,1759`) | **Hardcoded base colors** (`1114-1150`) | **Base `renderVoltJudgment`** |
| **Raijin** | `cyber_valkyrie` | `#22d3ee`, `#e879f9` | **Same** + hardcoded `#ffffff` core | **Hardcoded base colors** (`1502,1515,1571`) | **Hardcoded base colors** (`1322,1759`) | **Hardcoded base colors** (`1114-1150`) | **Base `renderVoltJudgment`** |
| **Kagura** | `default` | `#fb923c`, `#facc15` | `heavy_cleave` (`#fde047` rim) | Hardcoded `#fb923c`/`#f97316`/`#fde047` | Hardcoded `#f97316`/`#fde047` | `MagmaPillar` orange fire | `renderSolarInferno` |
| **Kagura** | `solar_phoenix` | `#fde047`, `#f97316` | **Same** `heavy_cleave` | **Hardcoded base colors** (`1522-1531`) | **Hardcoded base colors** (`1340,1765`) | **Base `MagmaPillar` fire** | **Base `renderSolarInferno`** |
| **Kagura** | `frost_empress` | `#38bdf8`, `#c084fc` | **Hardcoded `#fde047` rim!** (`3675`) | **Hardcoded `#fb923c`/`#f97316`** (`1522-1531`) | **Hardcoded `#f97316`/`#fde047`** (`1340,1765`) | **Base orange `MagmaPillar`!** | **Base orange `renderSolarInferno`!** |
| **Zero** | `default` | `#34d399`, `#a7f3d0` | Generic `twin_x`/`arc` | Hardcoded `#34d399`/`#10b981` | Hardcoded `#34d399`/`#10b981` | Hardcoded `#10b981`/`#34d399` kunai | `renderPhantomEclipse` |
| **Zero** | `blood_moon` | `#f43f5e`, `#fecdd3` | **Same** `twin_x`/`arc` | **Hardcoded emerald `#34d399`/`#10b981`!** (`1535,1550,1588`) | **Hardcoded emerald!** (`584,1300,1314,1772`) | **Hardcoded emerald kunai!** (`1219,1235`) | **Base emerald `renderPhantomEclipse`!** |
| **Zero** | `astral_phantom` | `#38bdf8`, `#c084fc` | **Same** `twin_x`/`arc` | **Hardcoded emerald `#34d399`/`#10b981`!** (`1535,1550,1588`) | **Hardcoded emerald!** (`584,1300,1314,1772`) | **Hardcoded emerald kunai!** (`1219,1235`) | **Base emerald `renderPhantomEclipse`!** |

---

## 4. Exact Integration Hooks & Architectural Risks

### 4.1 Recommended Integration Hooks (Zero Combat Regression)
1. **Declarative Skin Attack VFX Profile Registry** (e.g. in `src/game/characters.ts` or a dedicated `src/game/skinVfx.ts` module keyed by `${characterId}:${skinId}` or `getSkinVfxProfile(characterId, skinId)`):
   - Ensures **100% programmatic 1-to-1 distinctness** across all 12 `(CharacterId, SkinId)` pairs (note: `'default'` is shared by 4 characters, so keying by `(characterId, skinId)` guarantees all 12 combinations are distinct and testable!).
   - Defines per-skin:
     - `slashPrimary`, `slashSecondary`, `slashCore`, `slashRim` (replacing hardcoded `#fde047` in `heavy_cleave` and `#f8fafc` secondary arcs)
     - `trailMotif`: unique geometric style/overlay per skin (e.g., feather flecks for `radiant_seraph`, void reality tears/shards for `void_walker`, electric/gold arcs + sakura/ink for `storm_shogun`, neon hex/glitch scanlines for `cyber_valkyrie`, phoenix feather plumes for `solar_phoenix`, frost crystals + violet flame for `frost_empress`, crimson crescent + blood petals for `blood_moon`, twinkling constellation stars/orbit trails for `astral_phantom`, plus distinct base motifs for the 4 `'default'` skins)
     - `swingAura` / `swingBurst` config (particles emitted on swing start, heavy/finisher impact, dash, parry, mark detonation, and ambient aura)
     - `projectilePalette` & `pillarTheme` (`kunai`, `volt_lance`, `fire_wave`, `void_crescent`, `sword_wave`, `MagmaPillar`)
     - `afterimageColor` / `afterimageStyle`
2. **Extend `SlashTrail` (`StickmanRenderer.ts:108-121`) & `renderSlashTrails` (`3486-3690`)**:
   - Add optional `skinId?: SkinId`, `characterId?: CharacterId`, `rimColor?: string`, `vfxMotif?: ...`, `seed?: number` to `SlashTrail`.
   - `Player.startAttack` (`Player.ts:1465-1481`) populates these purely visual fields without touching `ComboMoveSpec` timing, `ActiveMeleeHitbox`, or physics.
3. **Extend `ParticleSystem` (`ParticleSystem.ts`)**:
   - Keep `MAX_PARTICLES` bounded & pre-allocated (consider bumping `500` → `650–750` if adding skin swing accents, or add 2–3 lightweight pooled `ParticleKind`s like `'feather'`, `'petal'`, `'star'`, `'shard'`—or implement `'ink_splatter'`—within the same pre-allocated pool so `update(dt)` guarantees `active` returns to `0` after `maxLife`).
   - Also expose a read-only `getActiveCount(): number` helper (helpful for automated leak/stability testing!).
4. **Replace Hardcoded Color Strings in `Player.ts`, `Game.ts`, `Entities.ts`, `UltimateCutscene.ts`**:
   - `Player.ts`: lines `584-586` (Zero Shadow-Warp), `618-652` (Dash), `1114-1244` (Signature Skills), `1287-1365` (Link Arts & Parry Counter), `1484-1592` (Normal & Awakened melee flair), `1675-1703` (Ambient aura).
   - `Game.ts`: lines `1048-1063` (Thunder blink / Cryo chill), `1115` (Magma pillar hit text), `1150-1163` (Ice wall crush), `1662-1688` (Parry wave & Perfect Parry), `1758-1790` (Elemental Mark Detonation).
   - `Entities.ts`: `Projectile` (`565-785`, remove fragile `this.color === '#facc15'` matching; pass explicit `theme` or `skinId`/`rimColor`), `MagmaPillar` (`945-1038`, support `'frostfire'` / `'phoenix'` themes analogous to `IceWall.theme`).
   - `UltimateCutscene.ts`: pass `skinId` handling into `renderVoltJudgment`, `renderSolarInferno`, `renderPhantomEclipse` (or theme colors from `CutsceneTheme`) so all 8 non-default skins match their visual identity during Ultimates too.
5. **Skin Switching Cleanup Hook (`Game.ts:322-345`, `Player.ts:151-162`)**:
   - When `setSkin` or `setCharacter` is called, clear transient `this.slashTrails = []` / `this.afterimages = []` (or let their `<0.3s` life expire) and ensure no stale references remain.

### 4.2 Key Risks & Mitigations
1. **Risk: Pool Saturation / Starvation in `ParticleSystem` (R2)**:
   - `MAX_PARTICLES = 500` uses round-robin overwrite (`ParticleSystem.ts:73-84`). If skin attack VFX emit too many long-lived particles (`crack` lives `2.6s`, `cartoon_smoke` up to `1.8s`), spamming 50+ swings could overwrite active hit sparks or text callouts.
   - **Mitigation**: Keep skin swing accent particles short-lived (`0.18s–0.38s`), cap per-swing emission (3–8 accent particles), and optionally raise `MAX_PARTICLES` moderately (e.g. `640`) while keeping strict fixed-size pooling.
2. **Risk: Unbounded `slashTrails` / `afterimages` Arrays or Memory Leaks (R2)**:
   - Currently `Player.slashTrails` and `Player.afterimages` are plain arrays spliced on expiry. If `Player.update` isn't ticking (e.g., paused, cutscene, title), nothing cleans them if emitted on title (`Game.ts:315-343` only uses `particles`, not `slashTrails`). Also during `updateIdleOnTitle`, `slashTrails`/`afterimages` are NOT ticked!
   - **Mitigation**: Either pool `SlashTrail` / `Afterimage` or cap max length (e.g. 24/20) and tick/clear them on `setCharacter`/`setSkin`/`enterTitleState`.
3. **Risk: Canvas State Leakage (`globalCompositeOperation`, `globalAlpha`, `shadowBlur`) (R1/R2/R3)**:
   - `renderSlashTrails` and `ParticleSystem.render` use `globalCompositeOperation = 'lighter'`. Missing `ctx.save()`/`ctx.restore()` or heavy `ctx.shadowBlur` per particle causes massive mobile GPU slowdown (especially at `dpr = 1.5` on Android WebView).
   - **Mitigation**: Always wrap additive passes in `ctx.save()` / `ctx.restore()`; NEVER use `ctx.shadowBlur` in per-particle or per-trail loops (existing code uses layered strokes/gradients instead, which is much faster).
4. **Risk: Combat Timing, Hitbox, or Control Regression (R3)**:
   - Modifying `ComboMoveSpec` (`duration`, `cancelRatio`, `reachScale`, `hitCount`), `ActiveMeleeHitbox` bounds, or `InputHandler` buffers would alter frame data and break `rules.test.ts` or gameplay feel.
   - **Mitigation**: Keep all `ComboMoveSpec` gameplay fields untouched; attach skin VFX purely to visual metadata and rendering paths.
5. **Risk: Project Environment / Tooling Quirks**:
   - Project lives on `/storage/emulated/0/Antigravity/Stickman` where `node_modules/.bin` symlinks do not exist and `typescript@7.0.2` (`tsc`) throws `Unable to resolve @typescript/typescript-android-arm64`.
   - **Mitigation**: Run tests via `node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` and verify builds via `node node_modules/vite/bin/vite.js build` (plus `esbuild` type-checking if needed).

---

## 5. Verification Plan Notes
- Existing unit tests in `src/game/rules.test.ts` (17 tests) currently pass via `node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts`.
- New tests can directly import the skin VFX registry + `ParticleSystem` + `Player` (headless, without Canvas DOM) to verify:
  1. All 12 `(CharacterId, SkinId)` pairs map to unique VFX configs (0 duplicates).
  2. `ParticleSystem` active count returns to `0` after `>= 50` simulated swings + `update(dt)` advance, and `Player.slashTrails` / `Player.afterimages` empty to `0`.
