# Phase 0 Survey Handoff Report — Explorer 2 (`r2g3_survey_2`)

**Core Summary:** The Stickman codebase currently has **5 playable characters** (`kuro`, `raijin`, `kagura`, `zero`, `aether`) and **14 skins** (not 12: Aether was added post-Round-1 with 2 skins). `Player.ts` routes poses via `getCurrentPose()` + `stepSkeletonBlend()`, where `parry` has a dedicated pose/timer (`parryTimer` / `parryFlashTimer`) while **`land` is completely missing** as a pose/state (touchdown only applies `scaleX`/`scaleY` squash-and-stretch); additionally, Round 1's M3 VFX wiring is complete for the original 12 skins, while Aether has partial fallbacks and existing unit/E2E tests currently fail on `4 vs 5` / `12 vs 14` counts plus a Tier 4 mock-canvas OOM.

---

## 1. Observation

### 1.1 Character Roster & Skin Inventory (5 Characters, 14 Skins)
Verified in `src/game/characters.ts` (`CHARACTER_ORDER` at line 86, `CHARACTER_ROSTER` lines 88–349, `CHARACTER_SKINS` lines 361–710), `src/game/types.ts` (lines 5–33), and `src/game/skinVfx.ts` (lines 46–458):

| Character (`CharacterId`) | Name / Archetype | Base Weapon -> Awakened Weapon (`characters.ts`) | Special `[U]` / Kanji / Jump | Skins (`CHARACTER_SKINS` & `SKIN_VFX_PROFILES`) | Visual Motifs & Special Accessories (`StickmanRenderer.ts`, `characters.ts`) |
|---|---|---|---|---|---|
| `kuro` | **KURO** · Hắc Kiếm Sĩ (Cân bằng · Phản đòn) | `katana` -> `blood_greatsword` (skin overrides: `seraph_blade`/`seraph_greatsword`, `void_blade`/`void_greatsword`) | `cryo_wall` / `断` / `maxJumps: 2` | **3**: `default`, `radiant_seraph`, `void_walker` | `hasSheath: true` (waist scabbard `StickmanRenderer.ts:1297-1338`), Iaido horizontal quick-draw + Zantetsu cross-cut; `radiant_seraph` has 6-winged halo + `seraph_helm`; `void_walker` has void tendrils + `void_helm`; Awakened: 3 orbiting phantom blades (`2669-2720`), demon horns (`3059-3088`). Motifs: `iaido_ink`, `seraph_feathers`, `void_rift`. |
| `raijin` | **RAIJIN** · Lôi Thương (Tốc độ · Xuyên phá) | `volt_spear` -> `thunder_halberd` | `thunder_blink` / `雷` / `maxJumps: 2` | **3**: `default`, `storm_shogun`, `cyber_valkyrie` | `hasSheath: false`; long-reach spear/halberd, `volt_visor` / `shogun_crest` / `cyber_visor` (`1636-1823`); `storm_shogun` 5-drum/7-drum Raijin Taiko ring; `cyber_valkyrie` mech energy wings + hex ring; Awakened: plasma hair spikes (`3089-3158`). Motifs: `volt_arc`, `shogun_drums`, `cyber_glitch`. |
| `kagura` | **KAGURA** · Hỏa Diệm Đao (Sát thương · Trâu bò) | `flame_nodachi` -> `solar_greatblade` | `magma_eruption` / `炎` / `maxJumps: 2` | **3**: `default`, `solar_phoenix`, `frost_empress` | `hasSheath: true`; heavy two-handed Nodachi/greatblade, `flame_band` / `phoenix_crown` / `oni_horns` (`1641-1871`); `solar_phoenix` sun disc + 3-tier flame wings; `frost_empress` glacial crystal wings + 2 frostfire orbs (`2361-2437`); Awakened: flame/crystal wings + spine glow (`2810-2926`, `3159-3235`). Motifs: `flame_lick`, `phoenix_plume`, `frostfire_crystal`. |
| `zero` | **ZERO** · Ảnh Sát Thủ (Combo · Nhảy 3 bước) | `twin_daggers` -> `void_sabers` | `phantom_barrage` / `影` / **`maxJumps: 3`** | **3**: `default`, `blood_moon`, `astral_phantom` | `hasSheath: false`; off-hand dagger/saber rendered on `joints.handL` (`1363-1384`); `phantom_eyes` / `kitsune_mask` / `astral_hood` (`1661-1932`); `blood_moon` crimson crescent sigil; `astral_phantom` dual constellation rings (`2438-2479`); Awakened: shadow wings + 4 orbiting kunai/stars (`2927-2994`) + eye-stream (`3236-3295`). Motifs: `shadow_wisps`, `blood_crescent`, `astral_constellation`. |
| `aether` | **AETHER** · Đại Pháp Sư · VIP (Pháp Sư · Cận Chiến) | `arcane_hands` -> `prismatic_hands` | `arcane_barrage` / `宙` / **`maxJumps: 3`** | **2**: `default`, `prismatic_archon` (VIP · Cầu Vồng Tinh Tú) | `hasSheath: false`; **zero stick/blade** — spinning glowing magic circles + core orb on BOTH `handR` (`3976-4014`) and `handL` (`1385-1412`), `prismatic_archon` adds rainbow aurora wings + double spinning halo (`1952-1985`). **Gap:** `characters.ts:314,691` sets `headGear: 'astral_halo'`, which is missing from `CharacterDefinition['headGear']` (`characters.ts:46-58`), `StickmanRenderOptions['headGear']` (`StickmanRenderer.ts:161-173`), and `renderHeroHeadGear()` (`1625-1934`). Motifs: `arcane_sigil`, `prismatic_nova`. |

- **Total skins:** **14** (`CHARACTER_SKINS` entries and `SKIN_VFX_PROFILES` in `src/game/skinVfx.ts:46-439`). `PROJECT.md` (lines 7, 19, 73) and `tests/e2e/tier1_features.e2e.test.ts` (lines 42-61, 124-132) still reference **12** skins.
- **UI surfaces:** `src/components/TitleScreen.tsx` already renders a 5-column character grid (`grid-cols-5`, line 413) with a VIP SVG portrait for `aether` (lines 224-268) and skin dots (`484-531`). `src/components/Modals.tsx` `PauseModal` still uses `grid-cols-4` (`Modals.tsx:88`) while mapping all 5 `CHARACTER_ORDER` entries.

---

### 1.2 `Player.ts` State Machine, Physics & Renderer Pipeline
- **Simulation Tick:** `Game.ts` (`startLoop` lines 785-804, `update` lines 870-891) clamps frame `dt` to `[0.001, 0.05]` and steps `simulateStep(step)` in fixed substeps of `Game.SIM_STEP = 1 / 120` (frozen during `hitstopTimer > 0`, `cutscene.active`, `bossIntroTimer > 0`, `blessingChoices`).
- **Pose Resolution (`Player.getCurrentPose()` at `Player.ts:2028-2049`):** Strict priority order:
  1. `hp <= 0` → `'ko'`
  2. `sittingOnChair` → `'chair_idle'` (stood up via `standUpFromChair()` on any input at `579-587`, setting `chairKickTimer = 0.25`, `vy = -260`, `onGround = false`)
  3. `chairKickTimer > 0` → `'chair_kick'`
  4. `awakenPoseTimer > 0` → `'awaken_pose'` (duration `0.56s` at `379`)
  5. `hurtTimer > 0` → `'hurt'` (duration `0.22s`, `invulnTimer = 0.35s` at `474-475`)
  6. `parryTimer > 0 || parryFlashTimer > 0.1` → `'parry'` (`parryTimer = character.parryWindow + bonusParryWindow`, `parryFlashTimer = 0.24s` at `628-630`, so pose holds for `max(parryWindow, 0.14s)`)
  7. `cryoPunchTimer > 0` → `'cryo_punch'` (`0.22-0.25s`)
  8. `cryoCastTimer > 0` → `'cryo_cast'` (`0.22-0.26s`)
  9. `dashTimer > 0` → `'dash'` (`0.16s` at `686`)
  10. `attackTimer > 0 && currentMove` → `this.currentMove.pose`
  11. `danceTimer > 0` → `'victory_dance'`
  12. `!this.onGround` → `airFlipTimer > 0 ? 'double_jump_flip' : (vy < 0 ? 'jump' : 'fall')`
  13. `brakeTimer > 0` → `'brake_skid'` (`0.1s` when reversing/stopping on ground at `|vx| > 290/310`, lines `855-875`)
  14. `Math.abs(vx) > 35` → `'run'`
  15. fallback → `'idle'`
- **Missing `land` State/Pose:** Searching `src/` for `'land'` returned **0 matches**. On ground touchdown (`Player.ts:993-1054`), when `!this.onGround && (this.vy > 220 || this.kaguraAirDivePending)`, `Player.ts` only sets `scaleX`/`scaleY` (`1.22/0.78`, or `1.36/0.66` on air slam), spawns smoke, sets `y = GROUND_Y`, `vy = 0`, `onGround = true`, `airFlipTimer = 0`. There is no `landTimer` or `'land'` entry in `StickPoseName` (`StickmanRenderer.ts:6-60`).
- **Joint Blending & Renderer Handoff:**
  - `Player.stepSkeletonBlend(dt)` (`Player.ts:1107-1123`) calls `computeStickmanSkeleton(pose, this.poseTime, this.walkPhase)` (`StickmanRenderer.ts:241`) and blends `this.blendedJoints` via `blendSkeleton(prev, target, 1 - Math.exp(-rate * dt))` (`animation.ts:47-71`), with `rate = 30` when `attackTimer > 0 || dashTimer > 0 || parryTimer > 0 || airFlipTimer > 0` and `rate = 19` otherwise.
  - Note: `computeStickmanSkeleton()` does **NOT** receive `characterId` or `weapon` — all 5 characters currently share identical `idle`, `run` (`computeRunStrideKinematics` in `animation.ts:98-131`), `dash`, `jump`, `fall`, `parry`, `brake_skid`, `double_jump_flip` joint coordinates!
  - `Player.render()` (`Player.ts:2109-2140`) passes `jointsOverride: this.blendedJoints ?? undefined` plus `pose`, `poseTime`, `walkPhase`, `scaleX`, `scaleY`, `weapon`, `headGear`, `skinId`, `awakenedForm`, and skin VFX options to `renderStickman()`.
  - `Enemy.ts` (`380-389`) and `Boss.ts` (`1059`) also call `computeStickmanSkeleton(this.getPose(), ...)` and `blendSkeleton(...)` for shared poses (`idle`, `run`, `hurt`, `ko`, `attack_2`, `nodachi_overhead_slam`, `nodachi_earth_splitter`, `dagger_reverse_slice`).

---

### 1.3 R3 Compatibility Invariants (Must Not Break)
1. **Hitboxes (`ActiveMeleeHitbox`, `Player.ts:88-103, 1057-1089, 1913-1980`):**
   - Active window: `elapsed >= duration * 0.12 && elapsed <= duration * 0.74`.
   - Reach: `baseReach = (awakened ? 114 : 94) + character.reachBonus + (isLinkArt ? 36 : 0)`, scaled by `move.reachScale ?? 1`.
   - Center & size: `surroundHit ? offset=0, width=reach*1.65 : offset=reach*0.56, width=reach`; `height = ((awakened || isLinkArt) ? 112 : 96) * (move.heightScale ?? 1)`; `y = player.y - 50`.
   - Collision check (`Game.ts:1266-1268`): `Math.abs(enemy.x - hb.x) < hb.width * 0.5 + 24 && Math.abs(enemy.y - 48 - hb.y) < hb.height * 0.5 + 42`.
2. **Player Hurtbox (`Game.ts:1519-1520, 1726-1728`):**
   - Melee hit on player: `Math.abs(player.x - hit.x) <= hit.width * 0.5 + 24 && Math.abs(player.y - 48 - hit.y) <= hit.height * 0.5 + 42`.
   - Enemy projectile hit on player: `Math.abs(proj.x - player.x) < proj.radius + 32 && Math.abs(proj.y - (player.y - 52)) < proj.radius + 44`.
   - Notice hitboxes and hurtboxes are derived from `(player.x, player.y)`, `facing`, and `ComboMoveSpec` — **never** from `blendedJoints` or `StickmanRenderer`! (However, any `land` state/timer must NOT block attacks, dashes, jumps, or movement cancels — `startAttack`, dash, and jump checks at `Player.ts:654-807, 897-902` must remain responsive!)
3. **Movement Speeds, Dash, Jump & Gravity (`characters.ts`, `rules.ts`, `Player.ts`):**
   - `moveSpeed` / `awakenedSpeed`: `kuro` `445/520`, `raijin` `515/595`, `kagura` `415/490`, `zero` `495/585`, `aether` `475/560`.
   - Ground accel `4200` (air `2900`), turnaround `2.4x`, ground decel `18` (air `3.2`), zero threshold `< 10` (`Player.ts:861-878`).
   - `walkPhase += Math.abs(x - prevX) * 0.042` (`Player.ts:977`).
   - Dash (`Player.ts:686-692`): `dashTimer = 0.16`, `dashGraceTimer = 0.3`, `invulnTimer >= 0.24`, speed `moveSpeed * 2.15` (`* 1.15` awakened), `vy = 0`. Dash-cancel to dash-slash at `dashTimer < 0.12` (`766`).
   - Jump & Gravity (`rules.ts:4,6`, `Player.ts:883-975`): `GROUND_Y = 560`, `GRAVITY = 2150`, `coyoteTimer = 0.1`, first jump `vy = -765`, air jump `vy = -705` (`airFlipTimer = 0.32`), variable jump cut (`vy *= 0.55^(dt*16)` when jump released & `vy < -280`), gravity scales (`2.2` airSlam, `0.28` air attack, `0.62` apex hold `|vy|<130`, `1.32` falling `vy>0`, terminal `1350`).
4. **Parry Frames & Windows (`rules.ts:5,177-179`, `characters.ts`, `Player.ts:349-351,622-637`):**
   - `parryWindow` (`0.21..0.28`s per char) + `bonusParryWindow`; `parryCooldownMax = 0.52` (reduced to `0.08` on perfect parry at `Game.ts:1784`); `parryFlashTimer = 0.24`; `parryCounterWindow = 0.72` on perfect parry (`Player.ts:315`).
   - `isParrying()` checked at `Game.ts:1522` (reflect projectile via `computeReflectedProjectile`) and `Game.ts:1730` (melee parry).
   - `parry` input clears `attackTimer = 0`, `activeHitbox = null`, and scales `vx *= 0.25` (`Player.ts:631-635`).
5. **Skin Switching & Enemy/Boss AI:**
   - `Game.setCharacter` (`297-331`) / `Game.setSkin` (`333-366`) normalize skin, call `Player.setCharacter` (clearing `slashTrails` and `afterimages`), and call `emitHudSnapshot()`. `syncHudThrottled` (`Game.ts:2477`) includes `this.skinId`.
   - `R3` invariant: `ActiveMeleeHitbox` stats, `attackDuration`, movement physics, and enemy/boss HP/posture outcomes MUST stay identical across skins of the same character (`T1-F6-05`, `T4-04`).
   - `Enemy.ts` (`applyElementalMark` lines 178-196) and `Boss.ts` (`1059`) share `computeStickmanSkeleton` / `blendSkeleton` / `renderStickman` (`StickmanRenderer.ts`). Changing shared pose names (`idle`, `run`, `hurt`, `ko`) in `computeStickmanSkeleton` affects enemies & bosses unless character-specific pose overrides are gated or compatible!

---

### 1.4 Round 1 M3/M4 Completeness & Current Test/Build Baseline
1. **Round 1 M1–M3 Status:**
   - **Complete for the 12 original skins:** `skinVfx.ts`, `ParticleSystem.ts` (`MAX_PARTICLES = 720`), `StickmanRenderer.ts` (`SlashTrail`, `renderAttackSwingAura`, `renderDarkInkAura`), `UltimateCutscene.ts`, `Player.ts` (caps `MAX_SLASH_TRAILS = 24`, `MAX_AFTERIMAGES = 24`, `tickAndPruneVfx`, `getActiveVfxCounts`, `updateIdleOnTitle`, `setCharacter`/`reset` cleanup), `Entities.ts` (`ProjectileConfig.theme`, `MagmaPillar.theme`, `IceWall.theme`), and `Game.ts` (`skinId` in `syncHudThrottled`, all `getSkinVfxProfile` hooks) are all wired and passing in E2E Tiers 1–3!
2. **Post-Round-1 `aether` Regressions / Incomplete Pieces:**
   - `src/game/rules.test.ts` (executed via `tsx`): **15/17 passed, 2 failed** (`rules.test.ts:140` expects 4 chars, actual 5; `rules.test.ts:291` expects 4 callouts, actual 5).
   - `src/game/animation.ts`: `getUltimateStyleId('aether')` falls back to `'scarlet_sheath'` (`147-150`); `getAwakenedVisualProfile('aether')` falls back to Kuro's `blood_monarch` (`264-296`); `getComboMoveForCharacter('aether', ...)` falls back to Kuro's `kuroTable` (`992-1092`).
   - `src/game/synergy.ts:116-152`: `computeSynergyCooldownRefund` has no `aether` branch (falls back to `kuro`).
   - `src/game/Player.ts:1584` (Link Art) and `Game.ts:1921` (`detonateElementalMarks`) have no `aether` branch (fall back to `kuro`).
   - `src/game/StickmanRenderer.ts`: `inferCharacterForSkin` (`4270-4283`) doesn't map `prismatic_archon` / `arcane_hands` / `prismatic_hands` to `'aether'`; `renderHeroHeadGear` (`1625-1934`) lacks `'astral_halo'`; `renderAwakenedBackForm` (`2658-2996`) and `renderAwakenedHeadForm` (`3001-3298`) have no `form === 'aether'` branch; `renderAttackSwingAura` (`4320-4517`) and `renderSlashMotifOrnament` (`4582-4933`) lack `arcane_sigil` and `prismatic_nova` cases.
3. **E2E Suite Baseline (`node tests/e2e/run-e2e.mjs --tier=all`):**
   - **Tier 1 (`tier1_features.e2e.test.ts`)**: **43/46 passed, 3 failed** (`T1-F1-01`, `T1-F1-02`, `T1-F1-06` hardcode `12` skins/motifs vs actual `14`).
   - **Tier 2 (`tier2_boundaries.e2e.test.ts`)**: **46/46 passed**.
   - **Tier 3 (`tier3_pairwise.e2e.test.ts`)**: **12/12 passed**.
   - **Tier 4 (`tier4_workloads.e2e.test.ts`)**: **0/1 failed (JS Heap Out of Memory ~1024MB)** during `T4-01` full-game 930-frame loop because `RecordingContext2D` retains unbounded draw commands across frames without `resetTrace()`.

---

## 2. Logic Chain
1. **Why character-specific basic movement poses won't break R3 if isolated cleanly:** Combat hitboxes (`ActiveMeleeHitbox`), hurtboxes, movement velocities, dash timers, gravity, and parry windows are computed exclusively in `Player.ts` / `Game.ts` / `rules.ts` from `(x, y)`, `facing`, `ComboMoveSpec`, and timers — never from skeleton joint coordinates (`StickmanRenderer.ts:241-1068`). Therefore, passing optional character/context parameters into `computeStickmanSkeleton()` (or character-specific pose builders) and adding a brief non-blocking `land` pose/timer will preserve 100% of R3 gameplay invariants, provided: (a) `Enemy.ts`/`Boss.ts` calls to `computeStickmanSkeleton()` continue getting clean generic poses when no player character ID is passed, and (b) `land` pose/timer is purely visual and immediately cancelable by movement, attack, dash, jump, or parry.
2. **Why `aether` needs explicit handling in the pose/movement overhaul:** Unlike the 4 weapon-wielding characters, Aether uses `arcane_hands` / `prismatic_hands` (dual hand-mounted magic circles with zero stick/sword) and currently falls through to Kuro's `katana` idle/run/parry/combo poses and `iaido_ink` aura. Giving Aether dedicated unarmed caster/martial-mage poses (especially `parry` raising magic circle barriers instead of holding an invisible sword at `weaponAngle = -1.42`, and `run`/`dash`/`land` hand-arc positions) is essential for Requirement R1.
3. **Why tests currently fail before any new edits:** `aether` was added after Round 1's M1-M3/E2E tests were written (`rules.test.ts` and `tier1_features.e2e.test.ts` assert 4 chars / 12 skins), and `tier4_workloads.e2e.test.ts` accumulates `RecordingContext2D` command traces over 930 frames in `T4-01`.

---

## 3. Caveats
- Did not inspect `src/game/StickmanRenderer.ts` attack pose branches lines `3300-3960` (weapon rendering for non-`aether` weapons) or `src/game/Boss.ts` lines `251-1205` (boss attack patterns), because Explorer 1 is surveying `StickmanRenderer.ts` internals in parallel and those weapon/boss internals are outside `Player.ts` state machine & basic movement scope.
- Did not execute `vite build` in `/data` scratch during this read-only Phase 0 survey (noted `PROJECT.md` Android `noexec` build procedure; will be needed in verification milestones).
- `tsconfig.json` / `tsc --noEmit` environment note from `PROJECT.md:122`: `typescript@7.0.2` (`tsgo`) lacks `@typescript/typescript-android-arm64` on this device.

---

## 4. Conclusion
1. **Roster & Scope:** All pose, movement, and automated test updates MUST cover **5 characters** (`kuro`, `raijin`, `kagura`, `zero`, `aether`) and **14 skins** (not 12).
2. **`Player.ts` & `StickmanRenderer.ts` Architecture:**
   - Add a dedicated `'land'` `StickPoseName` and non-blocking `landTimer` in `Player.ts` (triggered on touchdown when `!this.onGround && (this.vy > 220 || this.kaguraAirDivePending)`), prioritized below `attack`/`dash`/`parry`/`brake_skid` or immediately cleared on any action/run input so responsiveness and R3 timing are 100% untouched.
   - Extend `computeStickmanSkeleton(pose, t, walkPhase, characterId?)` (or pass `characterId` from `Player.stepSkeletonBlend` and `Player.render`, keeping default/undefined behavior safe for `Enemy.ts`/`Boss.ts`) so each of the 5 characters gets distinct anime-fighting `idle`, `run`, `dash`, `jump`, `fall`, `land`, and `parry` kinematics—while preserving `computeRunStrideKinematics` IK safety (dist < 52px leg reach, no `NaN`/`Infinity`).
   - Preserve `parry` pose trigger (`parryTimer > 0 || parryFlashTimer > 0.1`) and tailor Aether's `parry` hands/magic-circle barrier so Aether blocks with arcane circles rather than an invisible sword.
3. **Aether & Test Suite Cleanups Needed Alongside Overhaul:**
   - Fix `CharacterDefinition['headGear']` / `StickmanRenderOptions['headGear']` (`'astral_halo'`), `Modals.tsx:88` (`grid-cols-5`), and Aether's fallback paths (`animation.ts`, `synergy.ts`, `StickmanRenderer.ts`, `Game.ts`) as scoped by the orchestrator.
   - Update `rules.test.ts` (5 chars) and `tests/e2e/` (14 skins + `ctx.resetTrace()` or trace capping in `T4-01`), plus add the new R1/R2 pose & joint programmatic + visual checks for all 5 characters across `idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`.

---

## 5. Verification Method
To independently verify every observation in this report:
1. **Roster & Skin Count (5 chars, 14 skins):** Inspect `src/game/characters.ts:86,361-710` and `src/game/skinVfx.ts:46-439`.
2. **State Machine & Missing `land` Pose:** Inspect `src/game/Player.ts:993-1054,1107-1123,2028-2049` and `src/game/StickmanRenderer.ts:6-60,241-1068`.
3. **R3 Invariants:** Inspect `src/game/Player.ts:349-355,622-637,683-699,851-975,1913-1980` and `src/game/Game.ts:870-891,1266-1268,1519-1522,1725-1743`.
4. **Baseline Test Reproduction:**
   - Unit tests:
     `mkdir -p "$TMPDIR" && cp node_modules/tsx/node_modules/@esbuild/android-arm64/bin/esbuild "$TMPDIR/esbuild_bin" && chmod +x "$TMPDIR/esbuild_bin" && ESBUILD_BINARY_PATH="$TMPDIR/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts`
     (Expected current output: 15/17 pass; 2 fail on `5 !== 4` at `rules.test.ts:140,291`).
   - E2E suite:
     `node tests/e2e/run-e2e.mjs --tier=all`
     (Expected current output: Tier 1 `43/46` [3 fail `14 !== 12`], Tier 2 `46/46`, Tier 3 `12/12`, Tier 4 `0/1` OOM in `T4-01`).
   - **Invalidation conditions:** Any subsequent edit to `characters.ts`, `Player.ts`, `StickmanRenderer.ts`, `rules.test.ts`, or `tests/e2e/*` invalidates these baseline counts and requires re-running the commands above.
