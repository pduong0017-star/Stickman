# Handoff Report — Survey Explorer 1 (R1 Domain & R5 Awakened Skill Transformations)

**Mission:** Investigate the Domain system (R1: `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU`) and Awakened Skill Transformations (R5: `Ngự Bút Thiên Hành`, `Văn Thánh Trấn Thiên Trận`, Awakened Dash) by referencing `chrono_sovereign` first across `src/` and comparing against current `mactien` / `xuan_feng_sage` implementations.  
**Core Finding:** `chrono_sovereign`'s full-screen Domain (`Tháp Đồng Hồ Cổ Đại`) is built across 4 synchronized layers (`types.ts` `DomainKind`, `Game.ts` lifecycle/triggers, `PeriodicTableBG.ts` screen sky + world 3D floor/pillars/cogs, and `GameHUD.tsx` left-corner banner), whereas `xuan_feng_sage` currently uses only an awakened-only faint screen overlay (`Game.ts:renderMacTienDomainBackdrop`), has no HUD banner or world-space 3D architecture, and has zero Awakened differentiation on its `[U]` seal render (`inkSeals`), basic-attack projectiles/Hanzi impact flashes, ground aura, or dash afterimage silhouettes.

---

## 1. Observation

### 1.1 `chrono_sovereign` Reference Map (`grep -n "chrono_sovereign"` across `src/`)
Exact matches across `src/` (excluding excluded files):
- `src/game/Game.ts`: lines `258` (`isChronoDomainOwner`), `1499` (`detonateTimeStopDamage`), `1554, 1576` (`executeTemporalEchoStrike`), `4261` (Time Stop overlay).
- `src/game/PeriodicTableBG.ts`: `chronoDomainBlend` / `renderChronoDomainScreenBackdrop` / `renderChronoDomainWorld` (`4, 112-113, 131-148, 159-200, 326-328, 335, 577-739, 1164-1166, 1479-1691`).
- `src/game/Entities.ts`: lines `2522, 2524, 2591` (`TemporalEcho` constructor & `render()`).
- `src/game/Player.ts`: lines `2307-2310` (`chrono_sovereign_slash` trail style), `2580` (hit sparks/shards/shockwave), `2696` (awakened melee sparks/shockwave/afterimage).
- `src/game/StickmanRenderer.ts`: lines `1078` (swing aura ticks), `1642` (`skinMap` ground puddle), `1707, 1711` (perspective Roman clock dial underfoot aura).
- `src/game/UltimateCutscene.ts`: line `1796`.
- `src/game/animation.ts`: lines `343` (`getAwakenedVisualProfile`), `679, 681, 950, 952, 1287, 1289`.
- `src/game/characters.ts`: line `1103`.
- `src/game/skinVfx.ts`: lines `635-662`.
- `src/game/renderer/gear.ts`: lines `48, 385-386, 2286-2376, 2987, 3185, 4752, 5508`.
- `src/game/renderer/inkStyle.ts`: lines `410, 470`.
- `src/game/renderer/trails.ts`: lines `135, 1079, 1254, 2130, 2282-2290`.
- `src/game/renderer/types.ts`: line `120`.
- `src/game/renderer/weapons.ts`: lines `292, 552`.

---

### 1.2 Full-Screen Domain Architecture (`chrono_sovereign` vs. `mactien`/`xuan_feng_sage`)

#### A. Types & HUD Banner
- **`src/game/types.ts:5`**:
  `export type DomainKind = 'none' | 'mirage' | 'chrono';`
- **`src/game/types.ts:319-321`** (`HudSnapshot`):
  `domainActive?: boolean; domainKind?: DomainKind; domainTimeLeft?: number;`
- **`src/App.tsx:80-82`**:
  Initial HUD state sets `domainActive: false, domainKind: 'none', domainTimeLeft: 0`.
- **`src/components/GameHUD.tsx:363-401`**:
  Renders left-corner banner `data-testid="hud-domain-badge"` whenever `hud.domainActive` is true:
  - Currently binary (`hud.domainKind === 'chrono' ? ... : ...`), displaying `'LÃNH ĐỊA: THÁP ĐỒNG HỒ CỔ ĐẠI'` (`borderColor: '#f59e0b'`, `text-amber-300`, timer `text-teal-300`) vs `'LÃNH ĐỊA: MA KÍNH HƯ KHÔNG'` (`borderColor: '#f43f5e'`, `text-rose-300`, timer `text-sky-300`).

#### B. Domain State & Triggers in `src/game/Game.ts`
- **State fields (`Game.ts:191-193`)**:
  - `private domainTimer = 0;`
  - `private readonly domainDuration = 12.5;`
  - `private activeDomainKind: DomainKind = 'none';`
- **Owner helpers (`Game.ts:253-265`)**:
  - `private isVoidShattererDomainOwner(): boolean` (`mirage` + `void_shatterer`)
  - `private isChronoDomainOwner(): boolean` (`chrono` + `chrono_sovereign`)
  - `private getDomainOwnerKind(): DomainKind` — currently returns `'mirage' | 'chrono' | 'none'`.
- **Reset hooks (`Game.ts:439-445, 480-486, 645-652, 717-720`)**:
  Clear `domainTimer = 0`, `activeDomainKind = 'none'`, and call `this.bg.resetDomain()` on `setCharacter`, `setSkin`, `returnToTitle`, and `startMode`.
- **Per-frame update (`Game.ts:1107-1128`)**:
  - Ticks `this.domainTimer = Math.max(0, this.domainTimer - dt)` when `!this.cutscene.active && !this.blessingChoices && this.bossIntroTimer <= 0 && !this.pendingOutcome`; resets `this.activeDomainKind = 'none'` when `<= 0`.
  - Resolves `resolvedDomainKind` and calls `this.bg.update(dt, this.player.awakened && !isMacTienAwakened, domainActive, resolvedDomainKind)`.
- **`chrono_sovereign` Activation Points**:
  1. Awaken (`onRequestAwaken`, `Game.ts:1855-1865`): sets `this.domainTimer = this.domainDuration` (`12.5`), `this.activeDomainKind = 'chrono'`, emits `'BÀNH TRƯỚNG LÃNH ĐỊA · THÁP ĐỒNG HỒ CỔ ĐẠI!'` (`#f59e0b`).
  2. Ultimate `onKanjiImpact` (`Game.ts:3553-3556`, and again in `chrono` branch `3671-3674`): sets `this.domainTimer = isOverdrive ? 12.5 : 10.0`, `this.activeDomainKind = 'chrono'`.
  3. Ultimate `onComplete` (`Game.ts:3815-3818`): sets `this.domainTimer = Math.max(this.domainTimer, 10.0)`, `this.activeDomainKind = 'chrono'`.
- **HUD sync (`Game.ts:4448-4452, 4458-4472, 4569-4641`)**:
  `resolveHudDomainKind()` computes `domainKind`; `syncHudThrottled()` includes `${domainKind}:${Math.ceil(this.domainTimer * 2)}` in fingerprint; `emitHudSnapshot()` outputs `domainActive`, `domainKind`, `domainTimeLeft`.
- **What `mactien` / `xuan_feng_sage` currently has (`Game.ts:127-128, 1123-1128, 1839-1841, 3859-3869, 4669-4792`)**:
  - `mactien` is **not** part of `DomainKind` or `PeriodicTableBG`.
  - Uses `mactienDomainBlend` (`127`) and `mactienDomainTime` (`128`), triggered **only** by `isMacTienAwakened = this.characterId === 'mactien' && this.player.awakened` (`1123`, **not** triggered on Ultimate!).
  - Suppresses `PeriodicTableBG` awakened mode (`this.player.awakened && !isMacTienAwakened` at `1128` and `3864`), leaving the normal stage background active underneath.
  - `renderMacTienDomainBackdrop(ctx, viewW, viewH)` (`4669-4792`) draws only:
    1. A subtle radial mist vignette (`rgba(248,250,252,0.09)` → `rgba(15,23,42,0.38)` for `xuan_feng_sage`).
    2. 4 slow-drifting faint calligraphy glyphs (`['静', '墨', '竹', '春']`) with dashed rotating circle behind indices `0, 2`.
    3. 10 falling ellipses/leaves (`#fda4af` / `#5eead4`).
  - Has **no** 3D perspective floor ring, **no** central Sun-Moon/Scripture Wheel backdrop, **no** side pillars/hanging scrolls, and **no** HUD domain banner.

#### C. `PeriodicTableBG.ts` Domain Renderer (`src/game/PeriodicTableBG.ts`)
- **Fields & Blending (`111-203`)**:
  - `private mirageDomainBlend = 0; private chronoDomainBlend = 0; private domainKind: DomainKind = 'none';`
  - `resetDomain()` (`129-133`), `getDomainBlend()` (`135-137` — `Math.max(...)` of domain blends), `update(dt, awakened, domainActive: boolean | DomainKind = false, domainKind?: DomainKind)` (`156-203`, uses `blendRate = 1 - Math.exp(-5.0 * dt)`).
  - Note how normal stage elements fade out automatically via `d = this.getDomainBlend()` (`223, 258, 1013-1023, 1056-1057`): when `d >= 0.98`, normal sky, biome pillars, wall grid, periodic table, and normal floor are skipped!
- **Screen-Space Backdrop (`renderChronoDomainScreenBackdrop`, `577-739`, invoked at `326-328`)**:
  - Sky gradient (`#04090c` → `#0f161b` → `#1a1206`) + radial glow (`#f59e0b` / `#2dd4bf`).
  - Helper `drawClockGear(ctx, cx, cy, outerR, innerR, teeth, rot, strokeCol, fillCol, spokeCount = 6)` (`507-570`).
  - Flanking counter-rotating sky gears at `cx ± baseR * 1.48` (`609-632`).
  - Giant central clockface at `(viewW * 0.5, viewH * 0.34)` with `baseR = Math.min(viewW, viewH) * 0.24`: outer gear (`baseR * 1.24`), 2 concentric rings (`0.94`, `0.68`), 12 radial ticks, cardinal numerals (`XII`, `III`, `VI`, `IX`), sweeping hour/minute hands (`635-713`).
  - 55 `AMBIENT_MOTES` rising with `globalCompositeOperation = 'lighter'` (`716-735`).
- **World-Space Arena (`renderChronoDomainWorld`, `1479-1691`, invoked at `1164-1166`)**:
  - 1. 3 giant slow-turning background clockwork gears (`parallaxSlow = (px - ARENA_WIDTH * 0.5) * 0.1`) (`1494-1513`).
  - 2. Symmetrical architectural pillars (`pillarXs = [-90, 210, 520, 840, 1160, 1480, 1790]`, `parallax = (px - ARENA_WIDTH * 0.5) * 0.18`, dark body, brass/teal ribs, pointed arch cutouts, pedestals) (`1515-1565`) + edge barrier gates at `x = 26` and `ARENA_WIDTH - 26` (`1567-1589`).
  - 3. `this.renderCombatMistBand(ctx, '#0f172a', 0.24, '#f59e0b')` (`1592`, defined `1693-1758`).
  - 4. Floor plane + **3D Perspective Floor Ring** (`centerDialX = ARENA_WIDTH * 0.5`, `GROUND_Y + 62`): 4 concentric elliptical rings (`dialRadii = [190, 340, 520, 740]`, `ry = rad * 0.22`) + 12 rotating radial lines (`1602-1624`) + player floor light pool (`1627-1641`) + horizon rim strokes (`1643-1651`).
  - 5. 16 floating world-space motes & miniature cogs (`1654-1687`, alpha reduced to `0.32` near player `< 110px`).

---

### 1.3 Floating VFX Fragments & Awakened Skill Transformations (`R5`)

#### A. Floating VFX Fragments & Underfoot Aura (`chrono_sovereign` vs `xuan_feng_sage`)
1. **Back-Gear (`src/game/renderer/gear.ts`)**:
   - `chrono_sovereign` (`2286-2376`): multi-ring rotating cogwheel halo + 12 teeth + counter-rotating azure inner astrolabe ring + 2 giant beveled clock hands.
   - `xuan_feng_sage` (`2377-2440+`): single Enso ring + 4 bamboo slips/petals (covered by Module 2 / R2).
2. **Ground Aura Underfoot (`src/game/StickmanRenderer.ts:1628-1765`)**:
   - `chrono_sovereign` has an explicit `skinMap` entry (`1642`: `{ rim: '#f59e0b', puddle: 'rgba(245, 158, 11, 0.38)', core: '#120b03' }`) AND a dedicated perspective clock dial underfoot (`1706-1764`: outer elliptical bezel, 12 rotating ticks, twin sweeping hands, 5 ascending diamond time-dust sparks).
   - `xuan_feng_sage` has **no** entry in `skinMap` (`1628-1643`) and **no** custom branch (`1706-2020`), falling back to generic `mode = 'cyan'` (`#06b6d4`) + 7 black ink-flame tendrils (`1997-2020`).
3. **`TemporalEcho` (`src/game/Entities.ts:2458-2676`, `Game.ts:1552-1624, 1979-2032, 3935-3942`)**:
   - `chrono` has `TemporalEcho` class (`Entities.ts:2493-2676`) rendering a rotating Roman/clockwork aura underfoot (`2600-2647`) + full `renderStickman` afterimage (`2650-2671`), plus `echoSlashTrails` (`Game.ts:132, 1564, 3939`) rendered via `renderSlashTrails`.

#### B. Awakened Basic Attacks (`Player.ts` & `Game.ts` & `Entities.ts`)
- **Current `chrono_sovereign` (`Player.ts:2305-2312, 2579-2604, 2695-2723`)**:
  - Forces `chrono_sovereign_slash` trail style; emits gold (`#fde047`) sparks + azure (`#38bdf8`) shards + amber shockwaves + afterimage on heavy/step 3/step 6/Link Art.
- **Current `xuan_feng_sage` (`Player.ts:2313-2365, 2605-2620, 2724-2743, 2792-2859`)**:
  - Trails use `'xuan_feng_brush'` (`2316`) with `trailRadiusScale = isMacTien && this.awakened ? arc.radiusScale * 1.24 : arc.radiusScale` (`2341-2342`).
  - On attack start (`2606-2620`): emits `2–4` petals (`#fda4af`) + `2–5` `ink_splatter` (`#5eead4`); on step 4 or heavy only, emits shockwave + text `'静'`.
  - On Awakened (`2725-2743`): emits `3` petals + `6` `#5eead4` sparks at `this.x + this.facing * 76`; on heavy/step 4/Link Art emits shockwave + 1 afterimage.
  - **Gaps for R5 (`Ngự Bút Thiên Hành`)**:
    1. Does **not** summon 2–3 floating calligraphy brush blades / Jade Bamboo Slips slashing diagonally from range on each awakened basic attack.
    2. `spawnCurrentHitbox` (`Player.ts:2792-2859`) has no `xuan_feng_sage` awakened reach/blade-rain extension (`baseReach = (this.awakened ? 114 : 94) + reachBonus`).
    3. `Game.ts:2501-2659` (player melee hit) and `2769-2849` (player projectile hit) have **no** `xuan_feng_sage` / `mactien` glowing Hanzi character impact flash (`emitText` with calligraphic Hanzi or custom impact flash).
    4. `Entities.ts:499-510` (`ProjectileKind`) has `'mirror_shard'`, `'sword_wave'`, `'kunai'`, `'volt_lance'`, `'fire_wave'`, `'void_crescent'`, etc., but no bamboo slip / brush-blade projectile kind (`bamboo_slip` / `brush_blade`) yet.
    5. `skinVfx.ts:691-718` and `animation.ts:363-373` have no pale gold (`#fef08a` / `#fde68a`) accent in `xuan_feng_sage` Awakened palette (`animation.ts:367` also reuses `motif: 'storm_god'`).

#### C. Awakened Skill `[U]` — `Tĩnh Tự Ấn` vs. R5 `Văn Thánh Trấn Thiên Trận`
- **Spawn (`Player.ts:1623-1668`)**:
  - `pendingInkSeals.push({ x: sealX, y: GROUND_Y, damage: sealDmg, awakened: this.awakened, skinId: this.skinId })` (`1632-1638`).
  - Also spawned on Awaken (`Player.ts:656-662`) and Ultimate (`Game.ts:3711-3720`).
  - Emits `#5eead4` shockwave + `10` petals + `6` ink_splatter + `'TĨNH TỰ ẤN · 静!'` (`1641-1653`, identical text/VFX whether `this.awakened` is true or false).
- **Update & Detonation (`Game.ts:117-126, 2041-2209`)**:
  - `inkSeals` entries track `{ x, y, radius, damage, awakened, life, maxLife: 1.1, skinId }`.
  - Roots/pulls enemies inside `radius` (`132` when awakened, `108` normal) for `1.1s` (`2124-2136`), then detonates (`2138-2209`) with `emitShockwave`, 2 horizontal `emitSlashBeam`, `16` petals, `6` ink splatters, `'PHÁ TĨNH ẤN · 静!'`.
- **Rendering (`Game.ts:4006-4185`)**:
  - `isXuanFengSeal` (`4018-4105`) ignores `seal.awakened` completely: draws 1 ground ellipse, 1 outer dashed jade-teal ring with 6 petals, 1 inner dashed ring with 8 ticks, and `'静'`.
  - **Gaps for R5 (`Văn Thánh Trấn Thiên Trận`)**:
    - No 3-tier Formation Ring when `seal.awakened` is true.
    - No 4 orbiting sub-seals overhead around main `'靜'` / `'禮'` character.
    - No raining jade bamboo slips / swirling spring wind during the `1.1s` active phase (`2124-2137`).
    - No finishing razor-sharp ink cross-slash (`emitCrossSlash` / dual diagonal beams + pale gold accent) at detonation (`2141-2158`).

#### D. Awakened Dash (`Player.ts:954-995, 1121-1141`, `src/game/renderer/trails.ts:7-81`)
- **Dash trigger (`Player.ts:954-995`)**:
  - `isXuanFengDash` emits 2 beams (`#f8fafc`, `#5eead4`), `3` petals (`#fda4af`), and 5 afterimages (`ghostPalette = ['#f8fafc', '#e2e8f0', '#ccfbf1', '#5eead4', '#f1f5f9']`) — identical in normal and Awakened state.
  - Continuous dash afterimages (`Player.ts:1121-1141`) change only `color` (`'#ccfbf1'` vs `'#f8fafc'`); no petal/mist burst during dash ticks.
- **Afterimage rendering (`src/game/renderer/trails.ts:7-118`)**:
  - `Afterimage` (`renderer/types.ts`) passes `skinId`, not `awakened` or `characterId`.
  - `isXuanFeng` branch (`trails.ts:26-80`) calls `strokeSkeletonLimbs(...)` (bare stickman limbs, not white-robed silhouettes!) + 3 ellipses, and renders **no** dissolving peach blossom petals.

---

### 1.4 Technical Invariant Check (`ctx.shadowBlur` & `performance.now()`)
- **`shadowBlur`**: `grep_search` across `src/` found **0** code usages (`shadowBlur =`). All 11 matches in `Game.ts`, `UltimateCutscene.ts`, `gear.ts`, `trails.ts`, and `weapons.ts` are comments explicitly noting `no shadowBlur`.
- **`performance.now`**: `grep_search` across `src/` found **1** match: `src/game/Game.ts:1077` (`this.lastTimestamp = performance.now();` for frame timing). **0** occurrences in `src/game/renderer/` or `src/game/UltimateCutscene.ts`.

---

## 2. Logic Chain

1. **Why `xuan_feng_sage` currently lacks a true Domain (R1):**
   `Game.ts:getDomainOwnerKind()` (`261-265`) and `DomainKind` (`types.ts:5`) only recognize `'mirage'` and `'chrono'`. Because `mactien` was implemented earlier via an awakened-only `mactienDomainBlend` overlay (`Game.ts:1123-1128, 4669-4792`) that leaves `PeriodicTableBG` on the normal stage and never fires on Ultimate (`3518-3530, 3707-3744, 3810-3819`), `xuan_feng_sage` never swaps the stage sky/floor/pillars and never triggers `GameHUD.tsx:364-401`. Extending `DomainKind` with `'xuan_feng'` (or `'mactien'`), registering `xuan_feng_sage` in `getDomainOwnerKind()` + Ultimate/Awaken triggers in `Game.ts`, and adding `renderXuanFengDomainScreenBackdrop` + `renderXuanFengDomainWorld` in `PeriodicTableBG.ts` (modeled 1:1 on `renderChronoDomainScreenBackdrop` / `renderChronoDomainWorld`) + a branch in `GameHUD.tsx:368-396` matches Chrono's architecture cleanly and prevents overlap with `mactien:default`.

2. **Why `xuan_feng_sage` Awakened Skills currently feel identical to base form (R5):**
   - `inkSeals` (`Game.ts:2054-2208, 4018-4105`) passes `awakened: this.awakened` into `inkSeals`, yet the `isXuanFengSeal` render branch (`4018-4105`) never reads `seal.awakened`, and `inkSeals` update (`2124-2137`) spawns no periodic bamboo slips or spring wind while active.
   - Basic attacks (`Player.ts:2298-2366, 2724-2743`) only emit small stationary sparks/petals around `this.x + this.facing * 76` instead of spawning ranged diagonal brush-blade / jade bamboo-slip projectiles (`Projectile` or custom world entity like `TemporalEcho`/`echoSlashTrails`) and flashing Hanzi characters on hit (`Game.ts:2555-2568, 2826-2834`).
   - `StickmanRenderer.ts:1628-1765` has no `xuan_feng_sage` entry in `skinMap` or underfoot aura, causing Awakened `xuan_feng_sage` to render generic cyan/black ink tendrils (`1997-2020`).
   - `trails.ts:26-80` renders `renderAfterimages` with `strokeSkeletonLimbs` and lacks `awakened` state or scholar robe/petal dissipation.

---

## 3. Caveats

- Excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) were **not** read or modified per mandatory instructions.
- `gear.ts`, `weapons.ts`, and `UltimateCutscene.ts` were only grep-checked / spot-checked for `chrono_sovereign`, `shadowBlur`, and `performance.now()` because other explorers cover R2, R3, and R4.
- Adding a new value to `DomainKind` in `src/game/types.ts:5` may affect exhaustive checks or tests elsewhere in the codebase (e.g., `GameHUD.tsx`, `PeriodicTableBG.ts`, `Game.ts`) — implementers should check TypeScript compilation (`tsc --noEmit`) after updating `DomainKind`.
- `mactien:default` also uses `mactienDomainBlend` (`Game.ts:1123-1128, 4669-4792`) when awakened; keep `mactienDomainBlend` conditional on `this.skinId !== 'xuan_feng_sage'` (or disable when `xuan_feng_sage` full-screen Domain is active) so the two overlays do not stack awkwardly.

---

## 4. Conclusion & Implementation Blueprint for R1 & R5

### R1 — Full-Screen Domain: `"LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU"`
1. **`src/game/types.ts:5`**: Extend `DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng'`.
2. **`src/components/GameHUD.tsx:363-401`**: Add `hud.domainKind === 'xuan_feng'` styling (Moonlight White / Deep Ink background `#071112`, border `#5eead4`, title `'LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU'`, text `#f0fdfa` / `#5eead4`, timer `#fde68a`).
3. **`src/game/Game.ts`**:
   - Add `isXuanFengDomainOwner(): boolean` (`this.characterId === 'mactien' && this.skinId === 'xuan_feng_sage'`) and include in `getDomainOwnerKind()` (`261-265`).
   - Activate `domainTimer = this.domainDuration` (`12.5`) & `activeDomainKind = 'xuan_feng'` in `onRequestAwaken` (`1855+`), Ultimate `onKanjiImpact` (`3553+` & `3721+`), and Ultimate `onComplete` (`3815+`).
   - Gate `mactienDomainBlend` (`1123`) to `this.characterId === 'mactien' && this.skinId !== 'xuan_feng_sage' && this.player.awakened` so `PeriodicTableBG` owns `xuan_feng_sage`'s Domain cleanly.
4. **`src/game/PeriodicTableBG.ts`**:
   - Add `private xuanFengDomainBlend = 0;`, update in `resetDomain()`, `getDomainBlend()`, `update()`, `renderScreenBackdrop()`, and `renderWorld()`.
   - Implement `renderXuanFengDomainScreenBackdrop(ctx, viewW, viewH, blend)` (mirroring `577-739`): deep ink-night-jade gradient (`#060d10` → `#0c1b1e` → `#132624`), **Central Backdrop** (Giant Ink-Wash Sun-Moon & Classic Scripture Wheel: 3 counter-rotating rings — inner thick-thin Enso stroke, middle ring with 12 calligraphy characters `春・風・靜・禮・義・仁・智・信・文・雅・清・和`, outer fine light rays & ink-wash clouds), and rising jade/pale-gold/petal motes.
   - Implement `renderXuanFengDomainWorld(ctx, px, py, blend)` (mirroring `1479-1691`): **Symmetrical Side Architecture** (2+ Jade Scholar Pillars / Vertical Hanging Scrolls with ink-wash calligraphy, bamboo branches, and depth-parallax peach blossom petals), combat mist band, and **3D Perspective Floor Ring** (`GROUND_Y + 62`, 3 concentric elliptical Heaven-Earth formation rings, 12 Earthly Branches tick marks, rotating radial lines in `#5eead4` + `#fde68a`).

### R5 — Distinct Awakened Skill Transformations (`xuan_feng_sage`)
1. **Palette & Underfoot Aura**:
   - Update `skinVfx.ts:691-718` and `animation.ts:364-373` (`xuan_feng_sage`) with pale-gold highlight (`#fde68a` / `#fef08a`, strictly no harsh yellow `#facc15`/`#eab308`) alongside Moonlight White (`#f8fafc`) and Jade Teal (`#5eead4` / `#2dd4bf`).
   - Add `xuan_feng_sage` to `StickmanRenderer.ts:1628-1643` `skinMap` and add a bespoke underfoot calligraphy/Enso/petal aura branch around `1765` (avoiding generic black tentacles).
2. **Awakened Basic Attacks (`Ngự Bút Thiên Hành`)**:
   - In `Player.ts:2725-2743` (and/or `2298+`) when `this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage' && this.awakened`: summon 2–3 ranged diagonal calligraphy brush blades / Jade Bamboo Slips (`Projectile` with new `ProjectileKind` `'bamboo_blade'` in `Entities.ts:499` rendered as beveled jade bamboo slips + brush-ink wake, or dedicated slash entities in `Game.ts`) with wider reach/rain trajectories.
   - In `Game.ts:2555-2568` & `2826-2834`: flash glowing Hanzi calligraphy characters (`'春'`, `'風'`, `'文'`, `'雅'`, `'靜'`) on hit (`particles.emitText` in `#f0fdfa` / `#5eead4` / `#fde68a`).
3. **Awakened `[U]` Skill (`Văn Thánh Trấn Thiên Trận`)**:
   - In `Game.ts:2124-2209`: when `seal.skinId === 'xuan_feng_sage' && seal.awakened`, periodically emit raining jade bamboo slips / swirling spring wind (`emitPetals` + diagonal `emitSlashBeam` / `ink_splatter`) during `1.1s` root, and finish on detonation with `emitCrossSlash` + `emitText(..., 'VĂN THÁNH TRẤN THIÊN TRẬN!', '#fde68a', 25)`.
   - In `Game.ts:4018-4105`: branch on `seal.awakened` to render a **3-tier Formation Ring**, **4 orbiting sub-seals overhead** (`'禮'`, `'義'`, `'仁'`, `'智'` or `'文'`), and central `'靜'` / `'禮'` calligraphy in Moonlight White + Jade Teal + Pale Gold.
4. **Awakened Dash (`Player.ts:954-995, 1121-1141`, `trails.ts:26-80`)**:
   - Extend `Afterimage` (`renderer/types.ts`) with optional `awakened?: boolean; characterId?: CharacterId;` (populated in `Player.ts:977, 1124, 1153, 2732`).
   - In `trails.ts:26-80`, when `isXuanFeng && a.awakened`, render a flowing translucent white-robed scholar silhouette (wide sleeves + robe skirt flare + jade-teal rim, dissolving into fading ink mist ellipses and peach blossom petals `#fda4af`).

---

## 5. Verification Method

1. **Static Invariant Checks** (from `/storage/emulated/0/Antigravity/Stickman`):
   - `grep -rn "shadowBlur" src/` → verify only comments appear (0 assignments `shadowBlur =`).
   - `grep -rn "performance.now" src/game/renderer/ src/game/UltimateCutscene.ts` → verify 0 matches.
2. **Type-Check** (from `/data/user/0/com.agy/files/stickman-build`, after syncing/editing):
   - `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` → expect 0 errors across `types.ts`, `PeriodicTableBG.ts`, `Game.ts`, `Player.ts`, `Entities.ts`, `StickmanRenderer.ts`, `trails.ts`, `GameHUD.tsx`.
3. **Canvas Render `save/restore` Balance & Domain Lifecycle Inspection**:
   - Verify every new `ctx.save()` in `PeriodicTableBG.ts`, `Game.ts`, `StickmanRenderer.ts`, `trails.ts`, and `Entities.ts` is paired with `try { ... } finally { ctx.restore(); }`.
   - Verify `Game.ts` resets `domainTimer = 0`, `activeDomainKind = 'none'`, and calls `bg.resetDomain()` on `setCharacter`, `setSkin`, `returnToTitle`, and `startMode`.
   - Invalidation condition: if any Domain blend remains `> 0` after switching away from `xuan_feng_sage` or after `domainTimer` expires, or if `GameHUD` displays `MA KÍNH HƯ KHÔNG` instead of `XUÂN PHONG VĂN MIẾU`, the `DomainKind` wiring in `Game.ts` / `PeriodicTableBG.ts` / `GameHUD.tsx` is incomplete.
