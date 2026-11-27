# Handoff Report — `explorer_r5_survey_1` (Phase 0 Survey: Chrono Core Kit, Skills, Entities, Title & Rules)

**Core Summary:** CHRONO (`chrono`, 8th fighter) currently exists as a broken/incomplete draft: `Game.ts` contains runtime-crashing/unimplemented code (`ctx.save()` inside `simulateStep()`'s `update` path at `Game.ts:1938-1951`, nonexistent `this.activateDomainExpansion()` at `Game.ts:2890`), `chrono` falls back to `kuro` for all combo moves, awakened visual profile, and Skill-Link arts (`animation.ts`, `Player.ts`, `synergy.ts`), `chrono:chrono_sovereign` hijacks Mirage's `void_shatterer` Domain Expansion (`Game.ts:170-172, 1481-1491`), `TemporalEcho` has no Stickman skeleton or history replay, `Time Stop` fails to freeze Bosses/enemy projectiles or accumulate damage, `skinVfx.ts` uses an invalid `'rune'` particle kind and omits required fields, and `TitleScreen.tsx` renders Zero's portrait for Chrono.

---

## 1. Observation

### 1.1 `src/game/types.ts`, `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/synergy.ts`
- **`src/game/types.ts`**:
  - Line `5`: `CharacterId` includes `'chrono'`.
  - Line `24`: `SkinId` includes `'chrono_sovereign'`.
  - Lines `47-48`: `SlashVfxMotif` includes `'chrono_clockwork' | 'chrono_sovereign'`.
  - Lines `50-60`: `SkinParticleAccentKind` is `'spark' | 'ember' | 'ice' | 'lightning' | 'smoke' | 'feather' | 'petal' | 'star' | 'shard' | 'ink_splatter'`. **There is NO `'rune'` value.**
  - Lines `133-145`: `CharacterSkillMeta` requires `synergyHint: string;` (line `138`).
  - Lines `310-311`: `HudSnapshot` has `domainActive?: boolean;` and `domainTimeLeft?: number;`, with no field distinguishing Mirage vs. Chrono domains.
- **`src/game/characters.ts`**:
  - Lines `13, 25, 35, 71`: Defines `'chrono_hand'`, `'chrono_twin_hands'`, `'temporal_echo'`, `'chrono_gear'`.
  - Line `99`: `CHARACTER_ORDER = ['kuro', 'raijin', 'kagura', 'zero', 'aether', 'valkyrie', 'mirage', 'chrono']`.
  - Lines `465-515`: `CHARACTER_ROSTER.chrono` is defined (`weapon: 'chrono_hand'`, `awakenedWeapon: 'chrono_twin_hands'`, `headGear: 'chrono_gear'`, `specialKind: 'temporal_echo'`, `ultimateKanji: '時'`).
    - **Bug/Gap at lines `494-505` (`skills`)**: Missing `synergyHint: string;` (violates `CharacterSkillMeta` in `types.ts:138`).
  - Lines `1035-1073`: `CHARACTER_SKINS.chrono` defines `'default'` (`Đồng Hồ Sư`, `rarity: 'classic'`) and `'chrono_sovereign'` (`Thần Thời Gian`, `rarity: 'mythic'`).
    - **Gap at lines `1050-1071` (`chrono_sovereign.overrides`)**: Only overrides color strings, `ultimate*`, `awakening*`, `slashColors`, and `skills` — does NOT override `codename` (stays `'Kiếm Sĩ Thời Gian'`), `headGear`, `weapon`, `awakenedWeapon`, or `synergyHint`.
- **`src/game/skinVfx.ts`**:
  - Lines `17-44`: `SkinVfxProfile` requires `profileId: string`, `swingAuraSecondary: string`, `auraTendrilPrimary: string`, `auraTendrilSecondary: string`.
  - Lines `607-654`: `'chrono:default'` and `'chrono:chrono_sovereign'` **BOTH omit** `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, and `auraTendrilSecondary`! (For comparison, every other skin including `'mirage:default'` and `'mirage:void_shatterer'` at lines `551-606` populates all four.)
  - Lines `620, 643, 644`: `'chrono:default'` sets `finisherParticleKind: 'rune'` and `'chrono:chrono_sovereign'` sets `swingParticleKind: 'rune'`, `finisherParticleKind: 'rune'`. `'rune'` is NOT in `SkinParticleAccentKind` (`types.ts:50-60`) and NOT handled in `emitSkinAccentParticle` (`Player.ts:42-87`, falls into `default: spark`).
  - Lines `624, 648`: `projectileTheme` is `'cyber'` / `'seraph'` (no Chrono theme if Chrono fires temporal projectiles).
- **`src/game/synergy.ts`**:
  - Lines `101-112`: `ELEMENTAL_MARK_SPECS.chrono` is defined (`kanji: '時'`, `markName: 'THỜI ẤN'`, `detonateCallout: 'BÙNG NỔ THỜI GIAN!'`, `linkArtName: 'NHỊP ĐỒNG HỒ TRẢM'`, `linkShortLabel: 'THỜI ẤN'`, `primaryColor: '#2dd4bf'`, `secondaryColor: '#f59e0b'`, `baseDetonateDamage: 39`, `maxStacks: 3`).
  - Lines `152-196`: `computeSynergyCooldownRefund(id, detonatedCount)` only checks `'raijin'`, `'zero'`, `'kagura'`, `'mirage'` and falls back to `// kuro` for `'chrono'` (and `'aether'`/`'valkyrie'`).

### 1.2 `src/game/animation.ts` & `src/game/poses/index.ts`
- **`src/game/animation.ts`**:
  - Line `167-168`: `getUltimateStyleId('chrono')` returns `'time_stop'`.
  - Lines `185-384`: `getAwakenedVisualProfile(characterId, skinId)` has **NO `case 'chrono':`**. Calling `getAwakenedVisualProfile('chrono', ...)` falls through `case 'kuro': default:` (lines `339-382`), returning `'HUYẾT KIẾM MA VƯƠNG'`, `motif: 'blood_monarch'`, `scarfPrimary: '#b91c1c'`, `upgradedSpecialName: 'BĂNG HUYẾT'`, `transformationCallout: 'THỨC TỈNH: HUYẾT KIẾM!'`.
  - Lines `424-1406`: `getComboMoveForCharacter(characterId, step, context)` has **NO `'chrono'` branch** in:
    - `dash_slash` (lines `429-520`) → falls back to Kuro Iaido Dash-Slash (`pose: 'dash_slash'`, `trailStyle: 'iaido_line'`).
    - `parry_counter` (lines `522-597`) → falls back to Kuro (`pose: 'parry_counter'`, `trailStyle: 'arc'`).
    - `air` (lines `600-821`) → falls back to Kuro (`air_attack`, `air_attack_2`, `air_slam`, `trailStyle: 'arc'`).
    - `ground` (lines `826-1406`) → falls back to Kuro `kuroTable` (`iai_draw_slash`, `katana_zantetsu_cut`, `zantetsuBurst: true`, `trailStyle: 'iaido_line'`).
- **`src/game/poses/index.ts`**:
  - Line `22`: `POSE_MODULES.chrono` maps to `kuroPoses` (basic poses `idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`).
- **Cross-check on `src/game/renderer/`** (directly observed via grep/view):
  - `src/game/renderer/inkStyle.ts` has **0 matches** for `chrono` (`SKIN_INK_PALETTES` missing `'chrono:default'` and `'chrono:chrono_sovereign'`).
  - `src/game/renderer/trails.ts` has **0 matches** for `chrono` (`SlashTrailStyle` in `renderer/types.ts` has no clockwork trail style).
  - `src/game/StickmanRenderer.ts` has **0 matches** for `chrono` (no Chrono/Sovereign aura or awakened form handling).
  - `src/game/renderer/gear.ts:371-391` (`chrono_gear`) draws only a plain teal circle + 8 ticks with no `skinId === 'chrono_sovereign'` geometry/crown/back-gears; `weapons.ts:379-416` (`chrono_hand` / `chrono_twin_hands`) has no `skinId` structural branch.

### 1.3 `src/game/Entities.ts`
- Grepping `Temporal|TimeStop|Chrono|MirrorRift` in `Entities.ts` returns **only `MirrorRift`** (line `2225`).
- There is **NO `TemporalEcho` class**, no Chrono projectile kind in `ProjectileKind` (lines `498-508`), and no `TemporalEcho` snapshot/history/render implementation in `Entities.ts`.

### 1.4 `src/game/Player.ts` & `src/game/Game.ts`
- **`src/game/Player.ts`**:
  - Lines `128-135`: `pendingTemporalEcho: { x: number; y: number; facing: 1 | -1; damage: number; primaryColor: string; secondaryColor: string; } | null = null;` — holds only scalar spawn coordinates and colors, no pose/joints/combo history.
  - Lines `509-524` (`triggerAwakening`): For `'chrono'`, resets `dashCooldown = 0`, `cryoCooldown = 0`, sets `invulnTimer = 1.4`, spawns one `pendingTemporalEcho`, shockwaves, sparks.
    - Note line `549-550`: `callout = this.skinId === 'default' ? profile.transformationCallout : this.character.awakeningBannerText`. For `default` skin, because `getAwakenedVisualProfile('chrono')` falls back to `kuro`, it displays **`'THỨC TỈNH: HUYẾT KIẾM!'`**!
  - Lines `1449-1470` (`activateSpecial`, `kind === 'temporal_echo'`): Sets `cryoCooldown`, `cryoCastTimer = 0.2`, `skillLinkTimer = 1.25`, pushes `pendingTemporalEcho` (single static struct), emits one shockwave & `'PHÂN THÂN QUÁ KHỨ!'`.
  - Lines `1872-1895` (`startAttack` Skill-Link branch): **NO `chrono` branch!** Falls through to `else` (lines `1885-1894`), executing Kuro's `HUYẾT ẢNH TRẢM` and calling `onDetonateAllMarks('kuro', ...)` instead of `'chrono'`!
  - Lines `2008-2032` (`startAttack` trail emission): Falls back to `arc` (`line 2023`).
  - Lines `2070-2211` (`startAttack` character flair): **NO `chrono` branch!**
  - Lines `2214-2271` (Awakened Melee Effects): **NO `chrono` branch!**
  - Lines `2540` (`renderStickman` call): `awakenedForm: this.awakened ? this.character.id : null` passes `'chrono'`.
  - **Gap for `[U]` TemporalEcho recording**: `Player` does not record a rolling frame history of `{ x, y, facing, pose, poseTime, walkPhase, weapon, skinId, awakened, attackTrigger }` or emit strike events for `TemporalEcho` to replay `0.4s` later.
- **`src/game/Game.ts`**:
  - **CRITICAL BUG #1 (`Game.ts:1938-1951`)**: Inside `simulateStep(dt)` → `if (this.player.activeHitbox)` (NOT `render()`!):
    ```ts
    for (const echo of this.temporalEchoes) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ...
      ctx.arc(echo.x, echo.y - 52, 16, 0, Math.PI * 2);
      ...
      ctx.restore();
    }
    ```
    `ctx` is **undeclared** in `simulateStep()`! Running Chrono and attacking while an echo exists throws `ReferenceError: ctx is not defined` (and fails `tsc`). Even if `ctx` existed, it's in the simulation hitbox check instead of `render()`, and draws a crude stick-circle + line instead of a Stickman!
  - **CRITICAL BUG #2 (`Game.ts:2890`)**: Inside `activateScarletSheath()` → `onKanjiImpact` → `else if (ch.id === 'chrono')`:
    ```ts
    if (this.skinId === 'chrono_sovereign') {
      this.activateDomainExpansion(isOverdrive ? 10.5 : 8.0);
    }
    ```
    `this.activateDomainExpansion` **does NOT exist** anywhere in `Game.ts` (confirmed via `grep_search`)! Calling Ultimate `[I]` with `chrono:chrono_sovereign` crashes at runtime!
  - **CRITICAL BUG #3 (`Game.ts:2854-2943`, specifically `2885-2899`)**: The `else if (ch.id === 'chrono')` block is placed **inside** `for (const enemy of this.enemies)` (lines `2854-2943`), so it executes N times (once per enemy) and executes **0 times** if all enemies were already cleared or in empty training transitions! Contrast with the per-character aftermath block at lines `2957-3113` which is outside the loop. Also line `2896` hardcodes `'NGƯNG ĐỌNG TOÀN CẦU · 3.5s!'` even when `isOverdrive` sets `4.2s`.
  - **CRITICAL BUG #4 — Domain Overlap with Mirage (`Game.ts:170-172, 338, 369, 950, 1481-1491, 1660, 2945, 3122, 3244, 3479, 3583`)**:
    - `isVoidShattererDomainOwner()` (lines `170-172`) returns `(mirage && void_shatterer) || (chrono && chrono_sovereign)`.
    - On Awakening `[O]` (`Game.ts:1481-1491`), `chrono:chrono_sovereign` prints `'BÀNH TRƯỚNG LÃNH ĐỊA · MA KÍNH HƯ KHÔNG GIỚI!'` (Mirage's text!).
    - `PeriodicTableBG.update(dt, this.player.awakened, domainActive)` (`Game.ts:953`, `PeriodicTableBG.ts:140`) only accepts `domainActive: boolean` and renders **Ma Kính Hư Không Giới** — there is NO Chrono Clocktower Domain visual at all!
    - `GameHUD.tsx:195-213` renders `'LÃNH ĐỊA: MA KÍNH HƯ KHÔNG'` whenever `hud.domainActive` is true.
  - **CRITICAL BUG #5 — `TemporalEcho` Behavior (`Game.ts:107, 1599-1640`)**:
    - `temporalEchoes` is an inline untyped object array, never rendered in `render()` (`Game.ts:3236-3296`).
    - In `simulateStep()` (`Game.ts:1609-1640`), it does NOT record Chrono's position/pose/attacks or replay them `0.4s` later — it just ticks a blind `0.4s` timer, teleports near `this.player.x - facing * 28`, and fires `emitSlashBeam` even if Chrono stood completely idle!
  - **CRITICAL BUG #6 — `Time Stop` Behavior (`Game.ts:1641-1657, 2189, 2339-2360, 3361-3378`)**:
    - `Game.ts:2339-2357`: `Boss.updateBoss({ dt: worldDt, ... })` does **NOT** freeze Bosses during `timeStopTimer > 0` (only non-bosses at line `2360` receive `dt: this.timeStopTimer > 0 ? 0 : worldDt`).
    - `Game.ts:2189`: `proj.update(proj.fromPlayer ? dt : worldDt)` does **NOT** freeze enemy projectiles during `timeStopTimer > 0`!
    - `Game.ts:1642`: `this.timeStopTimer -= worldDt;` (coupled to `worldDt` instead of `dt`, and `stageHazards` / `magicCircles` at lines `2121`, `2167` still tick `worldDt` during Time Stop).
    - `Game.ts:1645-1655`: When `timeStopTimer` expires, it deals flat `95`/`140` damage instead of tracking & detonating **accumulated damage dealt by Chrono during Time Stop** (R3: *"mọi đòn đánh của Chrono trong thời gian đóng băng được tích dồn và phát nổ đồng loạt với hiệu ứng vỡ thời gian khi hết giờ"*).
    - `Game.ts:render()` (`3157-3473`): No Time Stop visual overlay (clock dial + teal/ancient-gold time-freeze filter over the arena).

### 1.5 `src/components/TitleScreen.tsx`
- Lines `29-376`: `CharacterPortraitSvg` handles `'kuro'`, `'raijin'`, `'kagura'`, `'aether'`, `'valkyrie'`, and falls through to `// zero` (lines `328-375`).
  - **Gap**: Neither `'chrono'` nor `'mirage'` has a dedicated SVG branch — Chrono's portrait card currently renders **Zero's assassin hood & twin daggers**.
- Lines `623-663`: Lists all `CHARACTER_ORDER` entries (`id === 'chrono'` gets `'NEW'` badge at line `627`).
- Lines `668-706`: Skin carousel uses `getSkinsForCharacter('chrono')` (`default` "Đồng Hồ Sư", `chrono_sovereign` "Thần Thời Gian") and `getSkinVfxProfile('chrono', skin.id)`.

### 1.6 `src/game/rules.ts` & `src/game/rules.test.ts`
- **`src/game/rules.ts`**: Pure game-math constants/functions; mentions `CHRONO MIRAGE` only as Boss 11 Kronos's faction (`line 122`). Zero roster count coupling.
- **`src/game/rules.test.ts`**:
  - Line `140`: `assert.equal(CHARACTER_ORDER.length, 8);` — expects 8 characters (Chrono is already the 8th!).
  - Lines `144-158`: Checks `kanjiSet.size === 8`, `specialSet.size === 8`, `def.skills.specialName.length > 0`, `def.skills.ultimateName.length > 0`.
  - Lines `200-220`: Checks all 8 characters have `>= 5` distinct poses in `ground` 1–6, `0.35 < cancelRatio < 0.7`, `air_3.unblockable === true`, `dash_slash.lungeSpeed >= 500`, `dash_slash.afterimages === true`, `parry_counter.unblockable === true`.
  - Lines `250-270`: Checks `getUltimateStyleId`, `getAwakenedVisualProfile`, `getComboMoveForCharacter(..., 1, 'ground')` (`>= 4` distinct values across roster).
  - Lines `272-301`: Checks `ELEMENTAL_MARK_SPECS[id]`, `computeDetonationDamage`, `computeSynergyCooldownRefund` for all 8 characters.
  - **Verified test run**: `rules.test.ts` currently passes **17/17** (note: `rules.test.ts` does NOT test `skinVfx.ts`, `Game.ts`, `Player.ts`, `TitleScreen.tsx`, or that `chrono` differs from `kuro`).
  - **Note on `tsc`**: Running `node .../typescript/bin/tsc --noEmit` in this Android Termux/AGY container failed because `@typescript/typescript-android-arm64` native TS7 binary is not installed in `stickman-build/node_modules`. Production bundling via `vite build` / `esbuild` is used instead.

---

## 2. Logic Chain

1. From Obs 1.1–1.2, Chrono's metadata (`types.ts`, `characters.ts`, `synergy.ts`) was added to pass `rules.test.ts` (`CHARACTER_ORDER.length === 8`), while `skinVfx.ts` (`'rune'` invalid kind, missing 4 required properties), `characters.ts` (`missing synergyHint`), `synergy.ts` (`computeSynergyCooldownRefund` fallback to Kuro), and `animation.ts` (missing `chrono` cases in `getAwakenedVisualProfile` and `getComboMoveForCharacter`) were left incomplete or falling back to Kuro.
2. From Obs 1.4 (`Player.ts` & `Game.ts`), the previous draft attempted to wire Chrono's `[U]` TemporalEcho, `[I]` Time Stop, and `chrono_sovereign` Domain Expansion directly into `Game.ts`, resulting in:
   - Uncompilable/crashing code (`ctx.save()` in `simulateStep()` at `Game.ts:1938-1951`, nonexistent `this.activateDomainExpansion()` at `Game.ts:2890`, loop-repeated `[I]` trigger at `Game.ts:2885-2899`).
   - Functional failures against R2/R3/R4 (`TemporalEcho` doesn't record pose/attacks or render a Stickman; `Time Stop` doesn't freeze Bosses/enemy bullets, doesn't accumulate/detonate Chrono's damage, and has no visual overlay; `chrono_sovereign` hijacks Mirage's `isVoidShattererDomainOwner()` and renders Ma Kính Hư Không Giới + Mirage's text).
3. From Obs 1.5, `TitleScreen.tsx` was never updated with a `'chrono'` portrait SVG, leaving Chrono showing Zero's portrait.
4. From Obs 1.6, `rules.ts` and `rules.test.ts` already expect 8 characters and should remain untouched as invariants while we fix Chrono's implementation and add R5 Chrono E2E tests (`tests/e2e/r5_chrono.e2e.test.ts`).

---

## 3. Caveats

- Deep inspection of `src/game/renderer/*` (`inkStyle.ts`, `gear.ts`, `weapons.ts`, `trails.ts`, `StickmanRenderer.ts`), `Boss.ts`, `Enemy.ts`, and `PeriodicTableBG.ts` internals was outside `survey_1`'s primary file list (only targeted greps/views were performed for cross-referencing). Survey 2/3 explorers should cover those in full.
- `tsc --noEmit` could not execute because `@typescript/typescript-android-arm64` is absent in `/data/user/0/com.agy/files/stickman-build/node_modules`; `vite build` / `tsx` / `esbuild` are the working checks on this device.

---

## 4. Conclusion & Recommended Interface Contracts

### Required Fixes Against R1–R5
1. **`src/game/types.ts` & `src/game/characters.ts` & `src/game/skinVfx.ts` & `src/game/synergy.ts` (R1, R5)**:
   - Either add `'rune'` to `SkinParticleAccentKind` (`types.ts:50-60`) and implement clockwork/rune particle emission in `ParticleSystem.ts` + `emitSkinAccentParticle` (`Player.ts:42-87`), OR map Chrono to valid `SkinParticleAccentKind` (`'spark'`/`'star'`/`'shard'`). Adding `'chrono_rune'` / `'rune'` cleanly if desired must update `emitSkinAccentParticle`.
   - Add `synergyHint` to `CHARACTER_ROSTER.chrono.skills` (`characters.ts:494-505`) and distinct overrides (`codename`, `synergyHint`, `gear`/style identity) to `CHARACTER_SKINS.chrono[1]` (`chrono_sovereign`).
   - Complete `SKIN_VFX_PROFILES['chrono:default']` and `'chrono:chrono_sovereign'` (`skinVfx.ts:607-654`) with `profileId`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`.
   - Add explicit `if (id === 'chrono')` branch in `computeSynergyCooldownRefund` (`synergy.ts:152-196`).
2. **`src/game/animation.ts` (R1, R2)**:
   - Add `case 'chrono':` in `getAwakenedVisualProfile(characterId, skinId)` for `'default'` and `'chrono_sovereign'`.
   - Add dedicated `if (characterId === 'chrono')` choreographies in `getComboMoveForCharacter` (`ground` 1–6 with `>= 5` distinct poses & `0.35 < cancelRatio < 0.7`, `air` 1–3 with `air_3.unblockable === true`, `dash_slash` with `lungeSpeed >= 500` & `afterimages: true`, `parry_counter` with `unblockable: true`) using dedicated Chrono clockwork trail style(s) (NOT Kuro's `iaido_line` / `katana_zantetsu_cut`).
3. **`src/game/Entities.ts` (R2)**:
   - Create `export class TemporalEcho` with:
     - `x`, `y`, `facing`, `pose: StickPoseName`, `poseTime`, `walkPhase`, `weapon`, `awakened`, `skinId`, `primaryColor`, `secondaryColor`, `life`, `maxLife`, `delay = 0.4`, `active`.
     - Recorded action queue / strike snapshots (`{ triggerAt, x, y, facing, pose, poseTime, attackProgress, damage, reach, heavy, trailSpec }`) so each attack Chrono performs during the echo window (or the recorded history buffer) is replayed faithfully `0.4s` later!
     - `render(ctx: CanvasRenderingContext2D)` rendering a translucent teal/gold Stickman (`renderStickman` with `silhouette` / tinted body + glowing clock dial underfoot) with balanced `ctx.save()/restore()` and zero `shadowBlur`.
4. **`src/game/Player.ts` & `src/game/Game.ts` (R2, R3, R4, R5)**:
   - **TemporalEcho (`[U]`)**:
     - Remove the broken `ctx.save()` block at `Game.ts:1938-1951`.
     - Record Chrono's pose/position/attack snapshots (`0.4s` ring buffer or scheduled delayed strike packets from `Player` -> `Game`) and render `TemporalEcho` in `Game.render()`.
     - Add `chrono` branches in `Player.startAttack()` (Skill-Link `NHỊP ĐỒNG HỒ TRẢM` calling `onDetonateAllMarks('chrono', ...)`, clockwork swing VFX, Awakened melee perks).
   - **Time Stop (`[I]`)**:
     - Fix `Game.ts:2885-2899`: move Chrono's `timeStopTimer` (`isOverdrive ? 4.2 : 3.5`), domain activation, and callout **outside** `for (const enemy of this.enemies)` (into the post-loop character aftermath block). Remove the nonexistent `this.activateDomainExpansion(...)` call.
     - Freeze **both** regular enemies (`Game.ts:2360`) **and Bosses** (`Game.ts:2339-2357`: pass `dt: this.timeStopTimer > 0 ? 0 : worldDt`), **enemy projectiles** (`Game.ts:2189`: pass `dt: proj.fromPlayer ? dt : (this.timeStopTimer > 0 ? 0 : worldDt)`), and enemy hazards/magic circles (`Game.ts:2121, 2167`) while `this.timeStopTimer > 0`. Decrement `this.timeStopTimer -= dt;` (real time).
     - Track `timeStopAccumulatedDamage: Map<number, number>` (or per-enemy accumulated damage dealt by Chrono & TemporalEchoes during `timeStopTimer > 0`) and detonate all accumulated damage (plus base temporal shatter bonus) with shatter VFX when `timeStopTimer` reaches `0`.
     - Render a world/screen Time Stop visual filter in `Game.render()` when `this.timeStopTimer > 0` (teal/antique-gold inverted/clock-dial overlay, zero `shadowBlur`).
   - **Domain Separation (R4)**:
     - Replace `isVoidShattererDomainOwner()` with explicit domain kind resolution:
       - `export type DomainKind = 'mirage_void' | 'chrono_clocktower';`
       - `getActiveDomainKind(): DomainKind | null` (`'mirage_void'` ONLY for `mirage:void_shatterer`; `'chrono_clocktower'` ONLY for `chrono:chrono_sovereign`).
     - Update `PeriodicTableBG.update(dt, awakened, domainActive, domainKind?)` (backward-compatible 4th arg defaulting to `'mirage_void'`) so `r4_mirage.e2e.test.ts` remains 100% compatible while `chrono:chrono_sovereign` renders **Tháp Đồng Hồ Cổ Đại** (`chrono_clocktower`).
     - Extend `HudSnapshot` (`types.ts:310-311`) with optional `domainKind?: 'mirage_void' | 'chrono_clocktower' | null;` so `GameHUD.tsx:195-213` displays `'LÃNH ĐỊA: THÁP ĐỒNG HỒ CỔ ĐẠI'` (amber/teal) for Chrono and `'LÃNH ĐỊA: MA KÍNH HƯ KHÔNG'` (rose/sky) for Mirage.
5. **`src/components/TitleScreen.tsx` (R1)**:
   - Add dedicated SVG portraits in `CharacterPortraitSvg` for `id === 'chrono'` (clockface halo, Roman numerals, clock-hand blade, teal/gold line-art) — and optionally `id === 'mirage'` if not yet covered.

---

## 5. Verification Method

1. **Unit tests (already verified baseline 17/17 pass)**:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
2. **Direct inspection targets** (all claims above verified via `view_file` / `grep_search`):
   - `src/game/Game.ts:170-172, 1481-1491, 1598-1657, 1938-1951, 2189, 2339-2360, 2854-2948`
   - `src/game/Player.ts:509-524, 1449-1470, 1872-1895, 2008-2271`
   - `src/game/animation.ts:185-384, 424-1406`
   - `src/game/skinVfx.ts:607-654` & `src/game/types.ts:50-60`
   - `src/game/characters.ts:465-515, 1035-1073` & `src/game/synergy.ts:101-196`
   - `src/components/TitleScreen.tsx:29-376` & `src/components/GameHUD.tsx:195-213`
3. **Invalidation conditions**: Any refactor that renames `MirrorRift`, `PeriodicTableBG.update(dt, awakened, domainActive)`, or `HudSnapshot.domainActive` in a breaking way will break `tests/e2e/r4_mirage.e2e.test.ts` (12/12). Keep optional parameters / backward-compatible defaults.
