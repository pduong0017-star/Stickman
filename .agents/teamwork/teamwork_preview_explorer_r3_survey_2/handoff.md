# Survey Explorer 2 Handoff — Monsters, Elites, 12 Bosses, Arena Contrast & Rendering Safety

**Core Summary**: All 8 normal enemies, Elite variants, and 12 Bosses currently render through `renderStickman()` using a small shared pool of basic vector outfits (`BossStyleOutfit`) and weapons—leaving 3 normal mobs with `none`, 2 mobs borrowing boss outfits, Bosses 9–12 borrowing Bosses 2/4/7/8 outfits, and Elites distinguished only by a gold puddle + `★` text. Across all 12 dark-themed stages (`skyTop` relative luminance `0.002–0.008`), switching characters/enemies to an Ink-Wash black–white–vermilion palette introduces 6 specific contrast traps (especially near-black ink on dark arenas and vermilion fighters against crimson arenas), while `shadowBlur` is absent (`0` occurrences) and `save()`/`restore()` is balanced on all executed paths except minor state/perf hotspots documented below.

---

## 1. Observation

### 1.1 Complete Inventory of Normal Enemies (8 Archetypes)
Defined in `src/game/types.ts:155-164` (`RegularEnemyType = Exclude<EnemyType, BossId>` at `src/game/stages.ts:12`) and instantiated in `src/game/Enemy.ts:87-171`, rendered via `Enemy.render()` (`src/game/Enemy.ts:947-1106`):

| ID (`EnemyType`) | Label | HP / Spd / Dmg | `bodyColor` / `glowColor` | Weapon (`renderer/weapons.ts`) | `bossOutfit` (`renderer/gear.ts`) | `darkAura` & Visuals (`Enemy.ts:999-1033`) | Poses (`Enemy.ts:918-945`) |
|---|---|---|---|---|---|---|---|
| `meta_melee` | `META` | 150 / 315 / 22 | `#ffffff` / `#94a3b8` | `dagger` (24px white blade) | `'none'` | `'none'`, lw 9.2, headR 11.6 | `idle`, `run`, `attack_2`, `hurt`, `ko` |
| `deepseek_gunner` | `DEEPSEEK` | 135 / 260 / 25 | `#e2e8f0` / `#38bdf8` | `pistol` (dark slate gun) | `'none'` | `'none'`, dashed red aim line (`windup`), lw 9.2 | `idle`, `run`, `gun_aim`, `hurt`, `ko` |
| `swarm_blade` | `SWARM` | 120 / 375 / 24 | `#f1f5f9` / `#a855f7` | `sword` (44px white blade) | `'none'` | `'none'`, lw 9.2 | `idle`, `run`, `attack_2`, `hurt`, `ko` |
| `shield_guard` | `AEGIS` | 200 / 265 / 28 | `#cbd5e1` / `#38bdf8` | `shield_sword` + front oval shield (`#d6c38d`, `StickmanRenderer.ts:1151-1167`) | `'aegis_mob'` (dark visor + `#38bdf8` slit, `gear.ts:1880-1885`) | `'none'`, lw 9.2 | `idle`, `run`, `shield_guard`, `shield_charge`, `hurt`, `ko` |
| `cyber_ninja` | `PHANTOM` | 160 / 410 / 28 | `#94a3b8` / `#f43f5e` | `twin_daggers` (main + offhand `StickmanRenderer.ts:1066-1087`) | `'ninja_mob'` (`#dc2626` headband+tail + `#facc15` eye, `gear.ts:1886-1897`) | `'none'`, lw 9.2 | `idle`, `run`, `dagger_reverse_slice`, `hurt`, `ko` |
| `heavy_brute` | `TITAN` | 300 / 235 / 38 | `#fed7aa` / `#f97316` | `solar_greatblade` (130px greatblade, `weapons.ts:551-608`) | `'brute_mob'` (`#1c1917` jawplate + `#fb923c` visor, `gear.ts:1898-1904`) | `'none'`, **lw 11.4, headR 13.2** | `idle`, `run`, `nodachi_overhead_slam`, `nodachi_earth_splitter`, `hurt`, `ko` |
| `frost_mage` | `ARCANIST` | 145 / 245 / 26 | `#bae6fd` / `#22d3ee` | `neon_orb` (pulsing `#d946ef` orb, `weapons.ts:806-820`) | **Reuses `'glacius'`** (ice crown + pauldron, `gear.ts:1797-1824`) | `'cyan'` puddle, lw 9.2 | `idle`, `run`, `float_cast`, `hurt`, `ko` |
| `berserker_reaper` | `REAPER` | 185 / 395 / 30 | `#fecdd3` / `#f43f5e` | `reaper_scythe` (`#a855f7` blade, `weapons.ts:883-914`) | **Reuses `'nyx'`** (violet hood + `#f43f5e` eye, `gear.ts:1853-1873`) | `'none'`, lw 9.2 | `idle`, `run`, `iai_draw_slash`, `spin_slash`, `hurt`, `ko` |

*(Note: `Enemy.ts:539` also checks `this.type === 'hollow'`, an obsolete ID absent from `EnemyType` in `src/game/types.ts:155-164`.)*

### 1.2 Elite Variants & Modifiers
Observed in `src/game/Enemy.ts`:
- **Guard**: `this.isElite = isElite && !type.startsWith('boss_')` (`Enemy.ts:91`).
- **Stat Multipliers (`Enemy.ts:161-166`)**: `maxHp * 1.75`, `damage * 1.35`, `scoreValue * 1.75`, `speed * 1.15`.
- **Combat Modifiers**:
  - Super armor against non-heavy hits when `stunTimer <= 0` (`Enemy.ts:268-270`, `kbResist = 0.6` vs `0.85` when staggered/heavy-hit).
  - `frost_mage` Elite fires 2 orbs (`offsets = [-24, 24]`) instead of 1 (`Enemy.ts:798`).
- **Current Rendering (`Enemy.ts:1023-1104`)**:
  - `glowColor = '#facc15'`, `lineWidth = isBrute ? 11.4 : 10.0` (only +0.8px over normal 9.2), `darkAura = 'gold'` (7 tendrils at feet).
  - Overhead HP bar widens `44 → 52px`, turns `#f59e0b`, and draws `★ ${this.label}` in `#fde047` (`Enemy.ts:1089-1104`).
  - **Gap**: Zero distinct silhouette cues (no elite horns, pauldrons, cape/banner, weapon sheen, or named affixes/modifiers).

### 1.3 Complete Inventory of All 12 Bosses
Defined in `src/game/rules.ts:19-155` (`BOSS_ROSTER`, `BOSS_ORDER`), spawned in `src/game/stages.ts:257-622` (`CAMPAIGN_STAGES`), and implemented in `src/game/Boss.ts:9-1735`:

| # | ID & Name / Title | Stage (`theme` / `hazard`) | Max HP | `bodyColor` / `accent` | Weapon & Shield/Cape | `bossOutfit` | Phase 1 vs Phase 2 (`hp <= 50%`, `Boss.ts:235-249`, `speed*1.22`, `dmg*1.15`, `cdScale 0.94→0.72`) |
|---|---|---|---|---|---|---|---|
| 1 | `boss_haiku` — **HAIKU** (`VANGUARD · KẺ CẦM KHIÊN`) | 01 `genesis_lab` (`none`) | 580 | `#8f7fa6` / `#38bdf8` | `shield_sword` + round shield (`shieldActive=true`), no cape | `'haiku'` (dark visor rect) | **P1**: Shield guard + charge (`vx=720`). **P2**: Alternates Shield Charge (`vx=820`) & Leap Slam (`vy=-660`), `'crimson'` darkAura + `#38bdf8` ground ellipse. |
| 2 | `boss_astra` — **ASTRA** (`LANCER · THƯƠNG THỦ BÃO CÁT`) | 02 `solar_observatory` (`none`) | 680 | `#f3e5ab` / `#fbbf24` | `spear`, no cape | `'astra'` (bandit mask + `#93c5fd` tunic line) | **P1**: Spear thrust (`vx=560`) + 1 thrown spear. **P2**: Thrust (`vx=640`) + 3-way spear volley (`vy=-95,0,75`), `'crimson'` darkAura. |
| 3 | `boss_glacius` — **GLACIUS** (`WARDEN · LÃNH CHÚA BĂNG HÀ`) | 03 `cryo_citadel` (`icicle_drop`) | 780 | `#bae6fd` / `#22d3ee` | `frost_halberd`, cape `#0284c7` | `'glacius'` (ice crown + pauldron) | **P1**: 2 modes (halberd lunge cleave; 3-way frost spear fan). **P2**: 3 modes (spear fan also spawns `MagicCircle`; Glacial Sky Leap Slam spawns 2 `MagicCircle`s at `±160`), `'cyan'` darkAura. |
| 4 | `boss_opus` — **OPUS** (`LEADER · KIẾM SĨ HỒNG LIÊN`) | 04 `crimson_dojo` (`none`) | 890 | `#64748b` / `#ef4444` | `laser_blade`, cape `#dc2626` | `'opus'` (yellow triangle eye) | **P1**: 3-slash flurry (`laser_slash`). **P2**: 4-slash flurry + `#ef4444` laser projectile on 4th slash, `'crimson'` darkAura. |
| 5 | `boss_vulcan` — **VULCAN** (`FORGE TITAN · CHIẾN THẦN DUNG NHAM`) | 05 `magma_foundry` (`lava_geyser`) | 1020 | `#fdba74` / `#f97316` | `titan_hammer`, no cape, **Titan scale (`lw 12.2, headR 14.4`)** | `'vulcan'` (horned helm + chest core) | **P1**: Hammer smash + leap slam spawning 2 pairs of `MagmaPillar`+`MagicCircle`. **P2**: Smash spawns `MagicCircle` under player; leap slam spawns 3 pairs, `'ember'` darkAura. |
| 6 | `boss_sol` — **SOL** (`SNIPER · XẠ THỦ QUỸ ĐẠO`) | 06 `cyber_spire` (`orbital_laser`) | 870 | `#f8fafc` / `#fb923c` | `sniper_rifle`, black cloak (`#181a20` via `bossOutfit==='sol'`) | `'sol'` (cyan visor) | **P1**: Cyan lock-on telegraph + 1 sniper laser bolt. **P2**: Dual rapid sniper bolts (`yOffset = 0, -18`), `'crimson'` darkAura. |
| 7 | `boss_nyx` — **NYX** (`REAPER · TỬ THẦN HƯ KHÔNG`) | 07 `shadow_sanctum` (`void_rift`) | 1120 | `#c4b5fd` / `#a855f7` | `reaper_scythe`, cape `#3b0764` | `'nyx'` (pointed hood + crimson eye) | **P1**: Shadow-blink behind player + 1 scythe sweep or 2 `#a855f7` orbs. **P2**: 2-hit scythe flurry, 3 orbs, `'purple'` darkAura. |
| 8 | `boss_fable` — **FABLE** (`FINAL ENTITY · THỰC THỂ TỐI THƯỢNG`) | 08 `sovereign_throne` (`orbital_laser`) | 1420 | `#84cc16` / `#22c55e` | `neon_orb`, no cape, **levitates**, skate arcs (`StickmanRenderer.ts:845`), triggers Awakening <=72% HP | `'fable'` (white oval eyes only) | **P1**: 2 `MagicCircle`s or 2 orbs (`spd=620`). **P2**: 3 `MagicCircle`s or 4 faster orbs (`spd=680`), `'crimson'` darkAura + `#c084fc` embers. |
| 9 | `boss_raiden` — **RAIDEN** (`MECHA SHOGUN · TƯỚNG QUÂN LÔI CƠ`) | 09 `mecha_citadel` (`plasma_mine`) | 1560 | `#7dd3fc` / `#38bdf8` | `thunder_halberd`, cape `#0284c7` | **Reuses `'astra'`** | **P1**: Thunder lunge, 3-way spear fan, sky thunder dive (spawns 2 `#38bdf8` orbs). **P2**: 4-way spear fan, `'cyan'` darkAura. |
| 10 | `boss_akaza` — **AKAZA** (`CRIMSON ONI · QUỶ VƯƠNG HUYẾT NGUYỆT`) | 10 `blood_shrine` (`cursed_fang`) | 1700 | `#fda4af` / `#f43f5e` | `blood_greatsword`, cape `#dc2626` | **Reuses `'opus'`** | **P1**: 2-hit flurry, meteor dive (2 `#f43f5e` lasers), 2 lasers + `MagicCircle`. **P2**: 3-hit flurry, dive also spawns 2 `MagicCircle`s, 3 lasers + `MagicCircle`, `'crimson'` darkAura. |
| 11 | `boss_kronos` — **KRONOS** (`TIME REAPER · KẺ NGHỊCH ĐẢO THỜI GIAN`) | 11 `mirage_oasis` (`void_rift`) | 1840 | `#fef08a` / `#eab308` | `void_sabers` (dual blades), cape `#ca8a04` | **Reuses `'nyx'`** | **P1**: Paradox blink + 2-hit flurry, 3 `#eab308` spears + 1 `MagicCircle`. **P2**: 3-hit flurry, 4 spears + 2 `MagicCircle`s, `'gold'` darkAura. |
| 12 | `boss_omega` — **OMEGA** (`CHAOS SOVEREIGN · THẦN HỦY DIỆT KHỞI NGUYÊN`) | 12 `chaos_abyss` (`meteor_rain`) | 2100 | `#fdba74` / `#f97316` | `solar_greatblade`, cape `#ea580c`, **Titan scale**, **levitates**, triggers Awakening <=72% HP | **Reuses `'fable'`** | **P1**: Low-altitude swoop cleave, 3 `MagmaPillar`+`MagicCircle`, 3-way orb barrage. **P2**: 5 `MagmaPillar`+`MagicCircle`, 4-way orbs (`spd=770`), `'ember'` darkAura + `#e879f9` embers. |

**Key Boss Rendering Observation**:
- `Boss.render()` (`Boss.ts:1607-1734`) draws: (1) Sol's cyan lock-on sight line, (2) Phase 2 additive elliptical floor ring (`Boss.ts:1625-1635`), (3) parry windup circle glint (`Boss.ts:1638-1647`), (4) `renderStickman(...)`, and (5) `STUNNED` / `PHÁ GIÁP (x1.32 DMG)` text.
- Bosses 9–12 (`raiden`, `akaza`, `kronos`, `omega`) have **zero unique `bossOutfit`s** (`Boss.ts:1673-1676`), and `haiku`/`opus`/`fable` outfits are minimal single-shape masks/eyes (`gear.ts:1766-1880`).
- **Critical Projectile Color Bug/Inconsistency (`Entities.ts:1130-1166`)**: Enemy/Boss `spear` (`Entities.ts:1140`) hardcodes `#7dd3fc` (ignoring `this.color` `#fbbf24` / `#eab308` from Astra & Kronos!) and `orb` (`Entities.ts:1150-1166`) hardcodes `#d946ef` (ignoring `#22d3ee` / `#a855f7` / `#38bdf8` / `#f97316` from Frost Mage, Nyx, Raiden, Omega!).

### 1.4 Stage Backgrounds & Arena Contrast Analysis
All 12 stages (`STAGE_THEME_PALETTES` in `src/game/stages.ts:62-255`) are rendered by `PeriodicTableBG` (`src/game/PeriodicTableBG.ts:137-772`) plus `Game.render()` (`src/game/Game.ts:2629-2894`):
- **Measured Relative Luminance (`0.2126*R + 0.7152*G + 0.0722*B`) of all 12 Arenas**:
  - `skyTop` ranges `0.002` (`chaos_abyss` `#09030f`) to `0.008` (`genesis_lab` `#101624`, `cryo_citadel` `#081726`).
  - `skyMid` ranges `0.007` (`chaos_abyss` `#24082b`) to `0.026` (`cryo_citadel` `#102e4a`).
  - `floorTop` ranges `0.008` (`blood_shrine`, `chaos_abyss`) to `0.029` (`cryo_citadel` `#16324a`).
  - All 12 stages are **very dark** (`L < 0.03`), plus `Game.ts:2856-2869` applies a dark edge vignette (`rgba(4,6,12,0.42)`), and `PeriodicTableBG.ts:146-149` shifts the sky even darker (`#0d0c14` / `#1b1522` / `#0c0b10`) during Awakening.

**Identified Contrast & Readability Traps for Ink-Wash (`#0b0c10` black – `#f8fafc` white – `#dc2626`/`#ef4444` vermilion)**:
1. **Trap 1 — Sumi-Ink (`#0b0c10`) & Dark-Robed Fighters/Enemies Disappearing into Dark Stages**:
   - `shadow_sanctum` (`L=0.003–0.011`), `chaos_abyss` (`0.002–0.013`), `blood_shrine` (`0.003–0.010`), `crimson_dojo` (`0.004–0.012`), `cyber_spire` (`0.004–0.012`).
   - Dark ink outlines (`#0b0c10`), dark-bodied fighters (`eclipse_ronin` `#09090b`, `void_walker` `#1e1b4b`, `aether` `#4c1d95`, `boss_opus` `#64748b`, `boss_haiku` `#8f7fa6`), and black ink-wash cloaks/armor lose exterior silhouette contrast against near-black skies, pillars (`rgba(..., 0.68–0.78)`), and obsidian floors unless framed by a **crisp light rim/wash halo** or a **subtle misty sumi-e horizon band** behind the combat lane (`y = 360..560`).
2. **Trap 2 — Vermilion Fighters & Bosses Camouflaged on Crimson Arenas**:
   - `crimson_dojo` (Stage 04, `#36101d` sky, `#ef4444` spotlight, red torii trim, giant red Blood Moon `rgba(220,38,38,0.48)`, `#fda4af` petals) and `blood_shrine` (Stage 10, `#360916` sky, giant `#e11d48` alpha 0.72 Blood Moon right behind `y ≈ 0.28*viewH`, `#f43f5e` spotlight, `cursed_fang` crimson spikes).
   - **Boss Akaza** (`#fda4af` + `#dc2626` cape + `#f43f5e` accent) fights in `blood_shrine`, **Boss Opus** (`#dc2626` cape + `#ef4444` blade) fights in `crimson_dojo`, and vermilion-accented heroes (`kagura` `#e11d48`, `eclipse_ronin` `#b91c1c`, `blood_moon` `#e11d48`) + `PeriodicTableBG.triggerCrimsonFlash()` all share the exact red hue band.
3. **Trap 3 — Gold/Amber & Ice/Cyan Same-Hue Collisions**:
   - **Boss Kronos** (`#fef08a` body, `#ca8a04` cape, `#eab308` accent) fights on Stage 11 `mirage_oasis` (`#eab308` spotlight, `#fef08a` motes, gold hourglass landmark).
   - **Boss Glacius** (`#bae6fd` body, `#0284c7` cape, `#22d3ee` accent) fights on Stage 03 `cryo_citadel` (`#22d3ee` spotlight, `#e0f2fe` snow, cyan ice spires).
   - **Boss Fable** (`#84cc16` body, `#22c55e` accent) fights on Stage 08 `sovereign_throne` (`#22c55e` spotlight, `#86efac` motes).
4. **Trap 4 — Bright Cutscene / WhiteFlash / Silhouette Mode (`Game.ts:2650-2660`, `StickmanRenderer.ts:960`)**:
   - During `whiteFlash`, `StickmanRenderer.ts:960` skips the `#0b0c10` ink outline (`if (!opts.whiteFlash)`), while `UltimateCutscene` can overlay bright translucent gold/white washes (`radiant_seraph` phase 4 `rgba(254,249,195,0.55)`, `valkyrie` `rgba(250,204,21,0.52)`). Also `Enemy.ts:1044` skips weapon rendering only when `opts.silhouette` is true, whereas `Boss.ts`/`Enemy.ts` pass `isMono = silhouetteMode || whiteFlash` which suppresses headgear/outfits/marks.
5. **Trap 5 — Awakening Periodic Table + Additive Bloom Clutter**:
   - When `awakeningBlend > 0.02`, `PeriodicTableBG.renderPeriodicTable()` (`PeriodicTableBG.ts:683-771`) draws 118 element rectangles (`originY = GROUND_Y - 372 = 188`, spanning right behind fighters' upper bodies/heads!) plus 6 jagged white/colored lightning tethers (`globalCompositeOperation = 'lighter'`) to `(playerX, playerY - 58)`. Combined with `Game.ts:2725-2777` additive point blooms and `PeriodicTableBG.ts:178-230` additive god-rays + motes, high-speed combat can visually wash out crisp ink-wash linework.

### 1.5 Audit of `ctx.shadowBlur`, `ctx.save()`/`ctx.restore()`, NaN & Performance Pitfalls
1. **`ctx.shadowBlur` / shadow properties**: **0 occurrences** across the entire `src/` tree (verified via `grep_search` and Python regex scan across all `.ts` files).
2. **`ctx.save()` / `ctx.restore()` Balance**:
   - Static counts (`ctx.save(` vs `ctx.restore(`): `Boss.ts` (4/4), `Enemy.ts` (5/5), `Game.ts` (6/6), `ParticleSystem.ts` (17/17), `PeriodicTableBG.ts` (17/17), `Player.ts` (2/2), `StickmanRenderer.ts` (15/15), `UltimateCutscene.ts` (29/29), `renderer/gear.ts` (40/40).
   - `Entities.ts` (33/35), `renderer/trails.ts` (18/23), `renderer/weapons.ts` (3/4) have negative static diffs solely due to early `return;` / `continue;` branches that each explicitly call `ctx.restore()` before exiting. All executed code paths are currently balanced (= 0).
3. **Canvas State Leak in `Enemy.ts` (`Enemy.ts:1098-1103`)**:
   - When rendering the Elite `★ ${this.label}` badge, `ctx.font` and `ctx.textAlign = 'center'` are mutated outside any `ctx.save()`/`ctx.restore()`.
4. **Potential `NaN` / Fragile Color / Math Pitfalls**:
   - **Hex-suffix concatenation (`${color}33`, `${color}1e`, etc.)**: Used in `PeriodicTableBG.ts:171, 172, 185, 499, 520, 547, 575, 576, 588, 602, 721`, `Game.ts:2739, 2757, 2770`, `Entities.ts:1490, 1647, 1881, 1889`, `UltimateCutscene.ts:1409, 1456, 1458`. Assumes every color string is `#RRGGBB`; passing `#RGB`, `rgb(...)`, or `hsl(...)` (like Aether's rainbow `hsl(...)`) throws `DOMException` or silently breaks gradients.
   - **`Boss.ts:1613`**: `const p = 1 - this.attackTimer / 0.64;` does not clamp `p` to `[0, 1]` and divides by `0.64` even when `cdScale` shortened `attackTimer` (e.g., Phase 2 `0.64 * 0.72`).
   - **`Enemy.ts:1097`**: `bw * (this.hp / this.maxHp)` does not clamp `[0, 1]` or guard `maxHp <= 0`.
   - **Skeleton Math (`poses/poseMath.ts`, `animation.ts`)**: `sanitizeFinite`, `sanitizeVec2`, `clampToReach`, and `solveSafeTwoBoneIK` already guard against `NaN`/`Infinity` and zero-distance IK singularities. Any new custom enemy/boss limb accessories drawn in `StickmanRenderer` / `gear.ts` must avoid unguarded `Math.sqrt` of negative numbers or division by zero (`Math.hypot(dx, dy) || 1`).
5. **Android Canvas 2D Performance Hotspots**:
   - **`PeriodicTableBG.renderPeriodicTable()` (`PeriodicTableBG.ts:683-771`)**: While Awakened, executes `118 × (save + translate + fillRect + strokeRect + fillText + restore)` **every single frame**. On Android Canvas 2D, 118 `fillText` calls/frame is expensive.
   - **Per-frame Gradient Allocations**: `Game.ts:2731-2776` allocates `createRadialGradient` per player, boss, and **every active projectile** every frame; `PeriodicTableBG.ts:145, 163, 184, 531, 567` allocates 6+ gradients per frame; `Game.ts:2786, 2857, 2874` allocates 3 more screen gradients per frame.
   - **Per-mote `save`/`restore` in `crimson_dojo` (`PeriodicTableBG.ts:215-223`)**: 42 `save/translate/rotate/restore` calls per frame for petals.

---

## 2. Logic Chain

1. **Why Monsters & Bosses Lack Visual Identity Today**: Because `Enemy.render()` (`Enemy.ts:999-1033`) and `Boss.render()` (`Boss.ts:1664-1710`) delegate all character drawing to `renderStickman()` with a flat `BossStyleOutfit` union (`renderer/types.ts:60-72`), `darkAura` foot puddle, and basic geometric `weapons.ts` primitives, 3 mobs have `outfit='none'`, 2 mobs borrow boss outfits, 4 endgame bosses (9–12) borrow earlier bosses' outfits, and Elites have no structural gear/aura modifiers.
2. **Why Ink-Wash Styling Risks Breaking Readability on Existing Arenas**: All 12 stages in `stages.ts:62-255` were built as neon-on-dark-obsidian arenas (`L = 0.002–0.029`). Directly applying sumi-ink black (`#0b0c10`), chalk white (`#f8fafc`), and vermilion (`#dc2626`/`#ef4444`) characters/enemies onto near-black stages (`shadow_sanctum`, `chaos_abyss`, `blood_shrine`) or crimson/gold/cyan-matched stages (`blood_shrine` vs Akaza, `crimson_dojo` vs Opus/Kagura, `mirage_oasis` vs Kronos, `cryo_citadel` vs Glacius) causes edge loss unless every entity carries a **value-separated ink-wash outline + inner rim-light** AND the stage renderer introduces **controlled atmospheric separation** (e.g., mid-ground mist wash / reduced additive clutter).
3. **Why Combat & Hitboxes Stay Safe Under Strict Boundaries**: In `Game.ts:1492-1535`, `Game.ts:1746-1760`, `Enemy.ts:641-651`, and `Boss.ts:304-313, 481-490, ...`, hitboxes, shield-facing (`isAttackBlockedByShield`), projectile collision radii, posture damage, and elemental marks depend strictly on `(x, y, facing, width, height, radius)` and `isShieldActive()` — **never** on `renderStickman`, `bossOutfit`, `weapon`, or `PeriodicTableBG`. Keeping visual metadata strictly decoupled from simulation fields guarantees zero gameplay regression.

---

## 3. Caveats

- **Read-only static & script audit**: No `vite build` or headless Canvas execution was run in this survey (this explorer is read-only). `save`/`restore` runtime verification via mock Canvas 2D remains for the test/implementation phase.
- **Playable character (`Player.ts` / `poses/*.ts`) details**: Only inspected where they intersect `StickmanRenderer`, `characters.ts`, `Game.ts`, and `rules.test.ts`; Survey Explorer 1 covers the 6 playable fighters and skin details in depth.
- **`PeriodicTableBG` user-expectation note**: `PeriodicTableBG` is a signature Awakening visual tested visually in prior milestones; contrast tuning should soften/back-layer it (e.g., lower opacity or offscreen-cached plate) rather than removing Awakening identity.

---

## 4. Conclusion & Recommended Module Boundaries / Interface Contracts

To upgrade normal enemies, Elites, all 12 Bosses, and arena contrast to **Ink-Wash / Sumi-e Wuxia** quality while passing `rules.test.ts` (17/17), `vite build`, zero `shadowBlur`, and `save/restore === 0`:

### 4.1 Recommended Module Boundaries (Ownership & Clean Separation)
1. **New Pure-Data Visual Registry: `src/game/enemyVisuals.ts`** (read-only lookup, zero simulation/physics logic):
   - Maps all 8 `RegularEnemyType`s + Elite visual profiles + all 12 `BossId`s (including Phase 1 vs Phase 2 enrage overrides) to declarative ink-wash palettes, silhouette/armor/mask/horn/cape specs, aura styles, and projectile colors.
2. **Modular Renderer Sub-modules under `src/game/renderer/`**:
   - `src/game/renderer/inkWash.ts`: Shared Android-safe Canvas 2D ink-wash helpers (zero `shadowBlur`!): tapered brush-stroke paths (`strokeBrushLimb` / variable-width calligraphic arcs), sumi-e ink splatter rings, high-contrast rim-light pass, and safe `hexToRgba(color, alpha)` utility (eliminating fragile `${hex}aa` string concatenation).
   - `src/game/renderer/enemyGear.ts` (or expanding `renderer/gear.ts` cleanly): Dedicated `BossStyleOutfit` entries for **all 8 mobs** (`meta_mob`, `gunner_mob`, `swarm_mob`, `aegis_mob`, `ninja_mob`, `brute_mob`, `arcanist_mob`, `reaper_mob`), **Elite rank ornaments** (crimson/gold ink-flame horns, shoulder pauldrons, rank banner/halo), and **all 12 distinct Bosses** (adding dedicated `raiden`, `akaza`, `kronos`, `omega` plus enriching `haiku`, `astra`, `opus`, `fable`).
   - `src/game/renderer/weapons.ts`: Upgrade mob/boss weapons (`shield_sword` with patterned ink-wash tower/kite shield, `frost_halberd`, `titan_hammer`, `reaper_scythe`, `thunder_halberd`, `blood_greatsword`, `void_sabers`, `solar_greatblade`, `sniper_rifle`, `neon_orb`) with ink-wash outlines, cel shading, and Phase 2 glow cores.
3. **Entity Integration (`src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`)**:
   - `Enemy.render()` and `Boss.render()` consume `enemyVisuals.ts` and pass explicit visual options (`enemyRank: 'normal' | 'elite' | 'boss'`, `bossPhase?: 1 | 2`, `rimColor`, `inkAccent`) to `renderStickman()`, keeping **all AI timers, `EnemyAttackHit` boxes, `maxHp`, `speed`, `damage`, `isShieldActive()`, and `takeDamage()` untouched**.
   - Fix `Enemy.ts:1098-1103` (`ctx.save()`/`ctx.restore()` around Elite badge text) and `Boss.ts:1613` (`clamp(p, 0, 1)`).
   - Update `Entities.ts:1130-1166` so `spear` and `orb` projectiles honor `this.color` / `this.rimColor` (making Astra/Glacius/Raiden/Kronos/Nyx/Omega projectiles visually distinct).
4. **Arena Contrast & Performance (`src/game/PeriodicTableBG.ts`, `src/game/stages.ts`, `src/game/Game.ts`)**:
   - Add an **Ink-Wash Contrast Separation Band** in `PeriodicTableBG.renderWorld()` right before characters render: a subtle horizontal atmospheric mist / sumi-paper haze wash (`y ≈ GROUND_Y - 190` to `GROUND_Y`) plus a crisp ground horizon rim so `#0b0c10` ink outlines, white highlights, and vermilion accents pop cleanly on all 12 stages (especially `blood_shrine`, `crimson_dojo`, `shadow_sanctum`, `chaos_abyss`, `mirage_oasis`, `sovereign_throne`).
   - Tone down `PeriodicTableBG.renderPeriodicTable()` opacity slightly during combat and cache/batch static cell fills/strokes (or use an offscreen `<canvas>` cache when `document` is available, with direct fallback in headless mock Canvas) to cut 118 `fillText` calls/frame on Android.
   - Keep `Game.ts` hitboxes, collision, and `syncHudThrottled` untouched.

### 4.2 Proposed Interface Contracts
```ts
// src/game/renderer/types.ts (additions, backward-compatible optional fields)
export type EnemyOutfitId =
  | 'none'
  | 'meta_mob' | 'gunner_mob' | 'swarm_mob' | 'aegis_mob'
  | 'ninja_mob' | 'brute_mob' | 'arcanist_mob' | 'reaper_mob'
  | 'haiku' | 'astra' | 'glacius' | 'opus' | 'vulcan' | 'sol'
  | 'nyx' | 'fable' | 'raiden' | 'akaza' | 'kronos' | 'omega';

// Preserve BossStyleOutfit alias so existing callers compile unchanged:
export type BossStyleOutfit = EnemyOutfitId;

// Additions to StickmanRenderOptions:
//   inkRimColor?: string;       // High-contrast chalk/vermilion/gold outer rim-light for dark arenas
//   entityTier?: 'hero' | 'mob' | 'elite' | 'boss';
//   enragePhase?: 1 | 2;        // Boss Phase 2 visual escalation (glowing eyes, cracked ink aura, weapon flare)
```

```ts
// src/game/enemyVisuals.ts
export interface EnemyVisualProfile {
  id: EnemyType;
  outfit: EnemyOutfitId;
  bodyColor: string;
  inkOutlineColor: string;
  rimColor: string;           // Prevents dark-on-dark or same-hue arena camouflage
  accentColor: string;
  vermilionAccent: string;
  capeColor?: string;
  lineWidth: number;
  headRadius: number;
  phase2BodyColor?: string;   // Optional Boss Phase 2 shift
  phase2RimColor?: string;
  phase2AuraMode?: 'purple' | 'crimson' | 'cyan' | 'gold' | 'ember' | 'emerald';
}

export function getEnemyVisualProfile(type: EnemyType, isElite?: boolean, phase?: 1 | 2): EnemyVisualProfile;
```

---

## 5. Verification Method

After any implementation using this survey, verify independently via:
1. **Static checks** (from `/data/user/0/com.agy/files/stickman-build` after syncing `src/`):
   - Grep `shadowBlur` across `src/` → must return `0` matches.
   - Check `Enemy.ts`, `Boss.ts`, `PeriodicTableBG.ts`, `Entities.ts`, `renderer/*.ts` for balanced `ctx.save()` / `ctx.restore()`.
2. **Unit tests (`17/17`)**:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
3. **Production Vite Build**:
   ```bash
   node node_modules/vite/bin/vite.js build
   ```
4. **Headless Mock-Canvas 2D Render Smoke Test**:
   - Instantiate all 8 normal enemies, Elite variants, and all 12 Bosses (both `phase = 1` and `phase = 2`), plus `PeriodicTableBG.renderScreenBackdrop` & `renderWorld` across all 12 `StageThemeId`s (both `awakened = false` and `awakened = true`).
   - Instrument mock `ctx` to assert: `saveCount === restoreCount` after every render call, `shadowBlur === 0`, zero `NaN`/`Infinity` coordinates passed to `moveTo`/`lineTo`/`arc`/`ellipse`/`fillRect`/`strokeRect`, and zero thrown exceptions.
5. **Invalidation Conditions**:
   - Any modification to `Enemy` / `Boss` hitbox dimensions, `isShieldActive()`, `maxHp`/`damage`/`speed`, or `BOSS_ROSTER` / `CAMPAIGN_STAGES` metadata would invalidate the gameplay-preservation guarantee.
