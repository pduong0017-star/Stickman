# Handoff Report — `explorer_r5_survey_2` (CHRONO Ink-Wash Rendering & R5 Compliance Survey)

**Summary:** CHRONO (`characterId: 'chrono'`, skins `'default'` and `'chrono_sovereign'`) currently has only stub/draft rendering across the entire Ink-Wash pipeline (`inkStyle.ts`, `gear.ts`, `weapons.ts`, `trails.ts`, `StickmanRenderer.ts`, `UltimateCutscene.ts`, `TitleScreen.tsx`) and contains a critical `ReferenceError: ctx is not defined` crash in `Game.ts:1938-1951` where `temporalEchoes` drawing was accidentally placed inside `Game.update()`. Static safety across `src/` is clean on `shadowBlur` (`0` occurrences) and `performance.now()` in `renderer/` (`0` occurrences), while `UltimateCutscene.ts` retains 3 `${hex}XX` concatenations and several unguarded `ctx.save()` calls.

---

## 1. Observation

### 1.1 `src/game/renderer/types.ts` & `src/game/renderer/inkStyle.ts`
- **`src/game/renderer/types.ts`**:
  - `StickmanRenderOptions['headGear']` (lines 172–188) includes `'chrono_gear'` (line 188).
  - `StickmanRenderOptions['weapon']` (lines 193–225) includes `'chrono_hand'` (line 213) and `'chrono_twin_hands'` (line 214).
  - `SlashTrailStyle` (lines 110–118) defines `'arc' | 'iaido_line' | 'spear_thrust' | 'spear_flurry' | 'heavy_cleave' | 'twin_x' | 'mirror_fracture' | 'void_prism_fracture'` — no Chrono-specific `SlashTrailStyle` exists.
- **`src/game/renderer/inkStyle.ts`**:
  - `SKIN_INK_PALETTES` (lines 157–398) contains 20 entries (`kuro` × 4, `raijin` × 3, `kagura` × 3, `zero` × 3, `aether` × 2, `valkyrie` × 3, `mirage` × 2). **Neither `'chrono:default'` nor `'chrono:chrono_sovereign'` exists.**
  - `AWAKENED_BASE_OVERRIDES` (lines 400–421) contains the same 20 entries. **Neither `'chrono:default'` nor `'chrono:chrono_sovereign'` exists.**
  - `getSkinInkPalette` (lines 447–466) looks up `SKIN_INK_PALETTES[key] ?? SKIN_INK_PALETTES[\`${characterId}:default\`] ?? SKIN_INK_PALETTES['kuro:default']`. Because both Chrono keys are missing, Chrono falls back to `'kuro:default'` (`#7c5cff` purple body, `#ef4444` red accent, `#2563eb` blue cloth).
  - `colorWithAlpha` (lines 128–136) and `finiteOr` (lines 16–18) safely handle `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb()`, `rgba()`, `hsl()`, and non-finite numbers.

### 1.2 `src/game/renderer/gear.ts`
- **`inferCharacterFromSkin`** (`gear.ts:25-48`): Maps up to `if (skinId === 'void_shatterer') return 'mirage';` (lines 44–45). **`chrono_sovereign` is NOT mapped**, so omitting `characterId` falls back to `'kuro'`.
- **`renderHeroHeadGear`** (`gear.ts:371-391`):
  - `if (gear === 'chrono_gear')` is a 20-line stub: translates to `(head.x - 10, head.y - 6)`, strokes a single `#2dd4bf` circle (`r = 12`) + 8 radial ticks.
  - No `skinId === 'chrono_sovereign'` branch, no sumi-e `#0b0c10` ink outline, no visor/diadem/crown, and inner `ctx.save()`/`ctx.restore()` (lines 376, 391) is not wrapped in `try/finally`.
  - Contrast with `mirage` `prism_crown` (`gear.ts:392-550`): `void_shatterer` renders a multi-layered asymmetric obsidian demon-mirror faceplate, jaw shadow plate, cyan-silver brow rim, crimson/cyan crack seams, `drawInkEyeSlit`, asymmetrical `drawInkHorn` pair, and hovering diamond shard; `mirage:default` renders a half-visor + 3 floating beveled prism shards.
- **`renderSkinBackAttachment`** (`gear.ts:1214-2119`):
  - **Zero** branch for `skinId === 'chrono_sovereign'` or `charId === 'chrono'`.
  - `chrono:default` falls into `else if (skinId === 'default')` -> `else` (`gear.ts:2101-2114`), drawing a generic swaying back ribbon.
  - Contrast with `mirage:void_shatterer` (`gear.ts:1898-1991`, 94 lines: fractured double dimensional halo + 4 hovering winged obsidian/crimson-cyan mirror blades) and `mirage:default` (`gear.ts:2016-2070`: octagonal prism ring + 4 orbiting diamond shards).
- **`getArmorSpec` & `renderSkinBodyArmor`** (`gear.ts:2133-2800`):
  - `ArmorSpec['style']` (`gear.ts:2130`): `'haori' | 'plate' | 'tabard' | 'vest' | 'mirror_haori' | 'void_cloak'`.
  - `getArmorSpec` (`gear.ts:2140-2382`) has **no `'chrono:default'` or `'chrono:chrono_sovereign'` cases**; both fall into `default:` (`'valkyrie:default'` white/gold plate at lines 2369–2381).
- **`renderAwakenedBackForm`** (`gear.ts:2803-3575`):
  - **No `else if (form === 'chrono')` branch exists.** Awakened Chrono renders nothing here. (Compare `form === 'mirage'` at lines 3375–3571 with separate `void_shatterer` vs `default` wings/mandala/shards.)
- **`renderAwakenedHeadForm`** (`gear.ts:3577-4073`):
  - **No `else if (form === 'chrono')` branch exists.** Awakened Chrono renders nothing here. (Compare `form === 'mirage'` at lines 3965–4069.)

### 1.3 `src/game/renderer/weapons.ts`
- **`chrono_hand` / `chrono_twin_hands`** (`weapons.ts:379-417`):
  - 38 lines total. Draws an `arc(0,0,8)` hilt ring, a 4-vertex `#0f172a` polygon (`x = -14..62/72`), and for `chrono_twin_hands` a single 2px `#38bdf8` stroke `(0,0) -> (-28,-9)`.
  - Ignores `skinId` (`chrono_sovereign` looks identical to `default`), ignores `safeTime` (no rotating gear teeth/clock ticks), ignores `accentOverride`, and does not use `drawBeveledBlade` or sumi-e ink contours on the blade.
  - Contrast with `mirror_shards` (`weapons.ts:418-568`, 150 lines) and `void_prism_scythe` (`weapons.ts:569-784`, 215 lines), which cleanly branch on `skinId === 'void_shatterer'` vs `default` and animate with `safeTime`.
  - No `performance.now()` calls anywhere in `weapons.ts` (`safeTime = finiteOr(time, 0)` at line 291).

### 1.4 `src/game/renderer/trails.ts`
- **`inferCharacterForSkin`** (`trails.ts:62-84`): Does **not** map `'chrono_sovereign'` or `'chrono_hand'`/`'chrono_twin_hands'` to `'chrono'` (returns `'kuro'`).
- **`renderAttackSwingAura`** (`trails.ts:179-791`): `switch (motif)` (lines 276–787) has **no `case 'chrono_clockwork':` and no `case 'chrono_sovereign':`**. Both hit `case 'iaido_ink': default:` (lines 775–786, two plain horizontal lines).
- **`renderSlashMotifOrnament`** (`trails.ts:866-1630`): `switch (motif)` (lines 881–1626) has **no `case 'chrono_clockwork':` and no `case 'chrono_sovereign':`**. Zero Roman numerals, zero spinning gears, zero clock rays/ticks are drawn.
- **`resolveSlashMotif`** (`trails.ts:825-840`): Correctly resolves `'chrono_clockwork'` / `'chrono_sovereign'` (from `src/game/skinVfx.ts:607-654`) when `s.characterId === 'chrono'` is present, but if `s.characterId` is omitted with `skinId: 'chrono_sovereign'`, `inferCharacterForSkin` misroutes to `'kuro'`.
- **`renderSlashTrails`** (`trails.ts:1635-2175`): `Player.ts:2023` emits `style: arc.style ?? move.trailStyle ?? (this.character.id === 'mirage' ? 'mirror_fracture' : 'arc')`. Because Chrono uses default `'arc'` / `'iaido_line'` / etc. and `renderSlashMotifOrnament` lacks `chrono_*` cases, trails have zero Chrono visual identity.

### 1.5 `src/game/StickmanRenderer.ts` & `TemporalEcho` (R2)
- **`StickmanRenderer.ts`**:
  - `motionArc` (`StickmanRenderer.ts:1020-1092`): Only `'mirage'` overrides the generic `rgba(226, 232, 240, 0.34)` circular arc.
  - Offhand rendering (`StickmanRenderer.ts:1331-1459`): Handles `twin_daggers`/`void_sabers` (`renderOffhandDagger`), `mirror_shards`/`void_prism_scythe` (`renderOffhandMirrorShards`), `arcane_hands`/`prismatic_hands`, and `shield_sword`. **No offhand clock-hand or chrono gear** for `chrono_twin_hands` (or `chrono_hand`).
  - `renderDarkInkAura` (`StickmanRenderer.ts:1560-1920`):
    - `skinMap` (lines 1584–1598) has no `'chrono_sovereign'` entry.
    - `defaultCharMap` (lines 1599–1605) has no `'chrono'` entry.
    - Ground aura geometry (lines 1660–1916) has no `chrono` / `chrono_sovereign` clockwork dial branch; falls into generic 7-tendril `else` (lines 1891–1915).
  - `renderStickman` (`StickmanRenderer.ts:934-1464`) already supports `jointsOverride?: SkeletonJoints`, `bodyColor`, `glowColor`, `inkRimColor`, `characterId`, `skinId`, `weapon`, `headGear`, `awakened`, `darkAura`, `pose`, `poseTime`, `walkPhase`.
- **`TemporalEcho` in `Game.ts` & `Player.ts` (Critical Bugs)**:
  - `Player.ts:128, 513-520, 1457-1464`: `pendingTemporalEcho` only records `{ x, y, facing, damage, primaryColor, secondaryColor }` on Awakening (`[O]`) and Special (`[U]`). No pose, skeleton joints, or attack history is captured.
  - `Game.ts:107`: `temporalEchoes` array lacks `pose`, `poseTime`, `walkPhase`, `joints`, `skinId`, `awakened`, or an action-history queue for the `0.4s` delayed replay.
  - **`Game.ts:1938-1951` (CRASH BUG)**: Inside `Game.update()` -> `if (this.player.activeHitbox)` (line 1923), lines 1938–1951 run:
    ```ts
    for (const echo of this.temporalEchoes) {
      ctx.save(); ... ctx.arc(echo.x, echo.y - 52, 16, 0, Math.PI * 2); ... ctx.restore();
    }
    ```
    `ctx` is **not in scope** in `update()`, causing `ReferenceError: ctx is not defined` whenever Chrono attacks with an active echo! Moreover, `Game.render()` (`Game.ts:3159-3473`) **never renders `this.temporalEchoes` at all**.
  - `Game.ts:1609-1640`: `echo.strikeTimer` resets to `0.4` repeatedly for `4.2s` without tracking Chrono's recorded pose/attack snapshots, and `emitSlashBeam` is the only slash visual.

### 1.6 `src/game/UltimateCutscene.ts` (`renderTimeStop`), TimeStop & Domain Expansion (R3 & R4)
- **`UltimateCutscene.ts:1645-1705` (`renderTimeStop`)**:
  - Phase 1 (`t < 1.55`, lines 1654–1695): Minimal — 1 bare `arc`, 12 plain radial ticks, 2 single-line hands. No Roman numerals (`I`–`XII`), no counter-rotating gear teeth, no sumi-e ink contrast, no `colorWithAlpha` usage, and no `try/finally` around `ctx.save()`/`ctx.restore()` (lines 1659, 1664).
  - Phase 2 (`t < 2.18`, lines 1696–1701): Single flat `rgba(...)` fillRect, no shattered clock-face climax.
- **`Game.ts` TimeStop (`timeStopTimer`)**:
  - `Game.ts:2885-2899`: Sets `timeStopTimer = isOverdrive ? 4.2 : 3.5`. Note indentation at lines 2885–2900 is inside `for (const enemy of this.enemies)` (lines 2854–2940), so it re-executes per enemy and displays `'NGƯNG ĐỌNG TOÀN CẦU · 3.5s!'` even when `isOverdrive` gives `4.2s`! (If `this.enemies` is empty, `timeStopTimer` doesn't even trigger!)
  - `Game.ts:2360`: Freezes regular `Enemy` (`dt: this.timeStopTimer > 0 ? 0 : worldDt`), **but** `Game.ts:2341` calls `enemy.updateBoss({ dt: worldDt, ... })` (Bosses are NOT frozen!), and `Game.ts:2189` calls `proj.update(proj.fromPlayer ? dt : worldDt)` (enemy projectiles are NOT frozen!).
  - `Game.ts:1641-1657`: Deals flat `95`/`140` damage on expiry instead of accumulating damage dealt by Chrono during `timeStopTimer > 0` for simultaneous Time-Shatter detonation.
  - `Game.render()` (`Game.ts:3361-3407`): Has screen tint for `witchTimeTimer > 0`, **nothing** for `timeStopTimer > 0`.
- **Domain Expansion Collision (`Game.ts` & `PeriodicTableBG.ts`)**:
  - `Game.ts:170-172`: `isVoidShattererDomainOwner()` returns `(this.characterId === 'mirage' && this.skinId === 'void_shatterer') || (this.characterId === 'chrono' && this.skinId === 'chrono_sovereign')`. Thus `chrono:chrono_sovereign` triggers Mirage's `Ma Kính Hư Không Giới` text (`Game.ts:1487`), Mirage's `PeriodicTableBG` domain (`PeriodicTableBG.ts:297, 863`), and Mirage's rift-beam logic (`Game.ts:3244`). No **Tháp Đồng Hồ Cổ Đại** domain exists yet.
- **`src/components/TitleScreen.tsx` (`CharacterPortraitSvg`, lines 29–376)**:
  - Handles `kuro`, `raijin`, `kagura`, `aether`, `valkyrie`, and falls through to `zero` for both `mirage` and `chrono`. Chrono has no dedicated SVG portrait.

### 1.7 Static Safety Audit Across ALL `src/` (R5)
- **`shadowBlur` across `src/`**: **0 occurrences** (verified via `grep_search`).
- **`performance.now()` across `src/`**: **1 occurrence total** at `src/game/Game.ts:917` (`this.lastTimestamp = performance.now()`). **0 occurrences in `src/game/renderer/`**.
- **`ctx.save()` / `ctx.restore()` counts across `src/`**: Net delta **0** in every file:
  - `Boss.ts` (4/4), `Enemy.ts` (7/7), `Entities.ts` (36/36), `Game.ts` (8/8), `ParticleSystem.ts` (17/17), `PeriodicTableBG.ts` (24/24), `Player.ts` (2/2), `StickmanRenderer.ts` (14/14), `UltimateCutscene.ts` (34/34), `renderer/gear.ts` (63/63), `renderer/trails.ts` (29/29), `renderer/weapons.ts` (9/9).
  - **Structural risks found**:
    1. `Game.ts:1939-1950`: `ctx.save()`/`ctx.restore()` inside `update()` where `ctx` is undefined.
    2. `UltimateCutscene.ts` (34 `ctx.save()` calls, including `renderTimeStop:1659,1664`), `PeriodicTableBG.ts` (7 `ctx.save()` calls in `renderHeroProp`/`renderBackdrop`), `Game.ts` (6 `ctx.save()` calls), and `gear.ts:376` (`chrono_gear`) do not wrap `ctx.save()` in `try { ... } finally { ctx.restore(); }`. (`ParticleSystem.ts` restores before `continue` in all 16 sub-branches; `Entities.ts:326,406` are inside an outer `try/finally` at lines 231–494.)
- **Fragile `${hex}XX` alpha concatenations across `src/`**:
  - **Canvas 2D (`src/game/`)**: **3 occurrences**, all in `src/game/UltimateCutscene.ts`:
    - Line 1414: `ctx.fillStyle = tier === 0 ? \`${primary}66\` : \`${secondary}44\`;`
    - Line 1461: `pillarGrad.addColorStop(0.25, \`${primary}99\`);`
    - Line 1463: `pillarGrad.addColorStop(0.75, \`${secondary}99\`);`
    (All 3 are in `renderValkyrieAscension`; `colorWithAlpha` is already imported at `UltimateCutscene.ts:6`.)
  - **React/SVG UI (`src/components/`)**: 26 occurrences in CSS/SVG attributes (`TitleScreen.tsx`: 17, `TouchControls.tsx`: 7, `GameHUD.tsx`: 2) — not Canvas 2D, included for completeness.

---

## 2. Logic Chain

1. From Obs 1.1 (`inkStyle.ts:157-466`), `getSkinInkPalette` has no `'chrono:*'` keys, so every Ink-Wash pass (`StickmanRenderer.ts`, `gear.ts`, `trails.ts`) renders Chrono with Kuro's purple/red default palette instead of Chrono's teal-bronze (`default`) or sovereign gold-azure (`chrono_sovereign`) ink palette.
2. From Obs 1.2–1.4 (`gear.ts`, `weapons.ts`, `trails.ts`), Chrono lacks skin-branched gear/back/awakened forms, lacks `chrono_sovereign` weapon & offhand distinction, and lacks `chrono_clockwork`/`chrono_sovereign` motif handlers in `trails.ts`. Additionally `inferCharacterFromSkin` (`gear.ts:25-48`) and `inferCharacterForSkin` (`trails.ts:62-84`) omit `chrono_sovereign`, causing cross-file fallback bugs whenever `characterId` is omitted.
3. From Obs 1.5 (`Game.ts:1938-1951`, `Player.ts:513,1457`), `TemporalEcho` currently crashes with `ReferenceError: ctx is not defined` inside `Game.update()` when attacking, never renders in `Game.render()`, and has no pose/skeleton snapshot data to render via `renderStickman` or execute accurate `0.4s`-delayed echo strikes.
4. From Obs 1.6 (`UltimateCutscene.ts:1645-1705`, `Game.ts:170-172, 2189, 2341, 2885-2900`), `renderTimeStop` is visually sparse, `timeStopTimer` fails to freeze Bosses/enemy projectiles or accumulate damage, only executes inside the `for (enemy)` loop, and `chrono_sovereign` hijacks Mirage's domain via `isVoidShattererDomainOwner()`.
5. From Obs 1.7, Android Canvas 2D compliance (`0` `shadowBlur`, `0` `performance.now()` in `renderer/`, `0` net `save/restore` delta) holds today, except for the `Game.ts:1938-1951` `ctx` bug and 3 `${hex}XX` strings in `UltimateCutscene.ts`.

---

## 3. Caveats

- Read-only survey: did not run `vite build` or `node --test` (no source files were modified).
- `src/game/poses/index.ts:22` maps `chrono: kuroPoses` for basic movement poses (`idle`, `run`, `dash`, etc.) — `PROJECT.md:8` marks `src/game/poses/*` as untouched invariants unless Chrono-specific poses are explicitly scoped separately; our scope covered the Ink-Wash rendering pipeline and R1–R5 compliance.
- `TitleScreen.tsx` SVG portraits use `${color}XX` in JSX SVG/CSS props; only Canvas 2D files (`UltimateCutscene.ts`) pose `addColorStop`/Canvas alpha parsing risks if non-6-digit hex is passed.

---

## 4. Conclusion & Recommended Architecture / Contracts

### Recommended Implementation Contracts (R1–R5)
1. **`src/game/renderer/inkStyle.ts`**:
   - Add `'chrono:default'` (sumi outline `#081214`, teal-obsidian body `#0f766e`, deep teal shadow `#042f2e`, pale aqua rim `#99f6e4`, bronze-gold accent `#f59e0b`, cloth `#115e59`/`#fde047`, metal `#fef08a`/`#78350f`, glow `#2dd4bf`) and `'chrono:chrono_sovereign'` (outline `#0a0704`, sovereign bronze-obsidian `#1c1917`, shadow `#090705`, starlight gold rim `#fef08a`, azure-gold accent `#38bdf8`/`#f59e0b`, cloth `#b45309`/`#fef08a`, metal `#fef9c3`/`#92400e`, glow `#f59e0b`) to `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES`.
2. **`src/game/renderer/types.ts` & `src/game/renderer/gear.ts`**:
   - Update `inferCharacterFromSkin` (`gear.ts:44-47`) with `if (skinId === 'chrono_sovereign') return 'chrono';`.
   - Upgrade `renderHeroHeadGear` (`chrono_gear`): branch structurally on `skinId === 'chrono_sovereign'` (gilded sovereign astrolabe crown + split gold/azure chrono-visor + sumi-ink contour, wrapped in `try/finally`) vs `default` (ink-outlined bronze-teal clockwork monocle/halo gear).
   - Add `'chrono:default'` (armored clockmaker haori/trench with brass/teal sash) & `'chrono:chrono_sovereign'` (imperial sovereign clocktower mantle/plate) to `getArmorSpec` & `renderSkinBodyArmor` (consider new `ArmorSpec['style']` `'chrono_coat'` / `'sovereign_clockplate'`).
   - Add `chrono` (`default` & `chrono_sovereign`) branches to `renderSkinBackAttachment`, `renderAwakenedBackForm` (giant rotating segmented clockwork halo + Roman numeral ring + floating brass/azure clock hands & pendulum wings), and `renderAwakenedHeadForm`.
3. **`src/game/renderer/weapons.ts` & `src/game/StickmanRenderer.ts`**:
   - Upgrade `chrono_hand` & `chrono_twin_hands` (`weapons.ts:379-417`): branch on `skinId === 'chrono_sovereign'` (ornate Roman astrolabe crossguard, sun-moon pendulum counterweight, beveled obsidian-gold clock-hand blade via `drawBeveledBlade`, rotating `safeTime` gear ring) vs `default` (ink-washed teal-bronze clock-hand sabre + rotating gear tsuba).
   - Export `renderOffhandChronoHand(...)` in `weapons.ts` and invoke from `StickmanRenderer.ts:1331+` when `opts.weapon === 'chrono_twin_hands'` (or `chrono_hand` offhand astrolabe dial on `handL`).
   - Add `'chrono'` and `'chrono_sovereign'` to `renderDarkInkAura` (`skinMap`, `defaultCharMap`, and a clock-dial + Roman tick ground aura branch).
4. **`src/game/renderer/trails.ts` & `src/game/renderer/types.ts`**:
   - Add `if (skinId === 'chrono_sovereign') return 'chrono';` and `if (weapon === 'chrono_hand' || weapon === 'chrono_twin_hands') return 'chrono';` to `inferCharacterForSkin` (`trails.ts:62-84`).
   - Add optional `'chrono_clock_slash'` / `'chrono_sovereign_slash'` to `SlashTrailStyle` (or style + motif routing) and implement full `case 'chrono_clockwork':` & `case 'chrono_sovereign':` in both `renderAttackSwingAura` (spinning gear rings, 12 clock ticks, reversing hands) and `renderSlashMotifOrnament` (Roman numeral glyphs `XII/III/VI/IX`, spinning brass/teal/gold cogwheels, clock-ray needles along the slash anchor).
5. **`TemporalEcho` Skeleton Rendering (R2)**:
   - Remove the crashing `Game.ts:1938-1951` block from `update()` immediately.
   - Store pose/action snapshots in `Game` / `TemporalEcho` (`{ x, y, facing, pose, poseTime, walkPhase, joints, damage, primaryColor, secondaryColor, life, maxLife, strikeTimer, strikeQueue }`) recording Chrono's attacks/positions over a `0.4s` delay buffer.
   - In `Game.render()` (world-space, `!monoArena`), render each echo with a small rotating clock dial at `(echo.x, echo.y)` and call `renderStickman(ctx, { x: echo.x, y: echo.y, facing: echo.facing, pose: echo.pose, poseTime: echo.poseTime, walkPhase: echo.walkPhase, jointsOverride: echo.joints, bodyColor: ..., glowColor: ..., inkRimColor: ..., characterId: 'chrono', skinId: this.skinId, headGear: 'chrono_gear', weapon: ..., awakened: this.player.awakened, darkAura: 'none' })` inside a `ctx.save(); try { ctx.globalAlpha = ...; } finally { ctx.restore(); }` ghost pass.
6. **`UltimateCutscene.ts`, `Game.ts`, `PeriodicTableBG.ts`, `TitleScreen.tsx` (R3, R4, R5)**:
   - Upgrade `UltimateCutscene.renderTimeStop` with concentric counter-rotating gears, 12 Roman numerals (`I`–`XII`), beveled clock hands snapping backward, `chrono_sovereign` gold-azure tower framing, `colorWithAlpha`, and `try/finally` around all `ctx.save()`. Replace the 3 `${primary/secondary}XX` strings at lines `1414, 1461, 1463` with `colorWithAlpha(...)`.
   - Fix `Game.ts:2885-2900` (move Chrono TimeStop trigger outside `for (enemy)` loop), freeze Bosses (`dt: this.timeStopTimer > 0 ? 0 : worldDt` at `Game.ts:2341`) and enemy projectiles (`proj.fromPlayer ? dt : (this.timeStopTimer > 0 ? 0 : worldDt)` at `Game.ts:2189`), track accumulated hit damage during `timeStopTimer > 0` to detonate on expiry, and render a screen-space TimeStop clock/teal-gold filter in `Game.render()`.
   - Split `isVoidShattererDomainOwner()` (`Game.ts:170`) from a dedicated `isChronoSovereignDomainOwner()` (`characterId === 'chrono' && skinId === 'chrono_sovereign'`) and add a separate `'chrono_tower'` domain mode to `PeriodicTableBG.ts` (giant mechanical gears, glowing Roman clockface sky, floating bronze dust, clocktower pillars).
   - Add `if (id === 'chrono')` SVG portrait in `TitleScreen.tsx` `CharacterPortraitSvg`.

---

## 5. Verification Method

1. **Static Safety Checks (run from `/storage/emulated/0/Antigravity/Stickman` or mirror `/data/user/0/com.agy/files/stickman-build`)**:
   - Verify `0` `shadowBlur` in `src/`: `grep -rn "shadowBlur" src/` -> 0 matches.
   - Verify `0` `performance.now` in `src/game/renderer/`: `grep -rn "performance\.now" src/game/renderer/` -> 0 matches.
   - Verify `0` `${...}XX` in `src/game/`: `grep -rnE '\$\{[^}]+\}[0-9a-fA-F]{2}' src/game/` -> 0 matches.
   - Verify `ctx.save()` / `ctx.restore()` balance = `0` per file.
2. **Unit & E2E Tests (run inside `/data/user/0/com.agy/files/stickman-build` after syncing `src/`)**:
   - `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts` (17/17 pass).
   - `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs tests/e2e/r4_mirage.e2e.test.ts` (12/12 pass, no regression).
   - New `tests/e2e/r5_chrono.e2e.test.ts`: headless `MockCanvasElement` render for `chrono:default` & `chrono:chrono_sovereign` (normal/awakened, trails, `TemporalEcho` attack without `ReferenceError`, `renderTimeStop` cutscene, domain isolation, `save/restore === 0`, no `NaN`).
3. **Production Build**:
   - `node node_modules/vite/bin/vite.js build` in `/data/user/0/com.agy/files/stickman-build` -> exit 0.
4. **Invalidation Conditions**:
   - Any `ReferenceError` when Chrono attacks with an active `TemporalEcho`, any `ctx.save() - ctx.restore() !== 0` on `renderStickman`/`renderTimeStop`/`PeriodicTableBG`, or `chrono:default` matching `chrono:chrono_sovereign` draw traces invalidates the fix.
