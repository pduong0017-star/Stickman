# Survey Explorer 3 Handoff — R4 Scholar 4-Hit Poses, Multi-Layer Trails & R4/R5 Boundaries

**Core Summary:** `poses/` (`src/game/poses/`) only resolves the 8 basic locomotion/stance poses (`BasicPoseName`) and does **not** receive `skinId`, whereas all attack poses (`attack_1..3`, `nodachi_overhead_slam`, etc.) live in `src/game/StickmanRenderer.ts` (`computeStickmanSkeleton`) and are selected per-skin via `getComboMoveForCharacter(..., skinId)` in `src/game/animation.ts`. Currently `mactien` (including `xuan_feng_sage`) reuses heavy/lunging poses (`attack_1` kick, `attack_2` katana hunch, `attack_3` uppercut, `nodachi_overhead_slam`) and a 2-layer `xuan_feng_brush` ribbon in `src/game/renderer/trails.ts` lacking 3-layer ink-wash/jade-teal/white-flash depth, 4-point star glints, and `renderSlashMotifOrnament` richness compared to `chrono_sovereign`.

---

## 1. Observation

### 1.1 Path Discovery & Grep Results (`chrono_sovereign | xuan_feng_sage | mactien`)
- **Path correction**: `src/game/renderer/poses/` and `src/game/renderer/animation.ts` do **not** exist (`grep_search` returned `does not exist`). Actual locations:
  - `src/game/poses/` (`types.ts`, `index.ts`, `mactienPoses.ts`, `chronoPoses.ts`, `poseMath.ts`, etc.)
  - `src/game/animation.ts`
  - `src/game/StickmanRenderer.ts` (contains `computeStickmanSkeleton`, all attack/special pose definitions, `motionArc` rendering, and `renderStickman`)
  - `src/game/renderer/types.ts` (contains `StickPoseName`, `SlashTrailStyle`, `SlashTrail`, `Afterimage`, `StickmanRenderOptions`)
  - `src/game/renderer/trails.ts`
  - `src/game/Player.ts`
  - `src/game/types.ts`

- **Exact grep hits**:
  - `src/game/poses/`:
    - `src/game/poses/index.ts:7,25`: `import { mactienPoses } from './mactienPoses';`, `mactien: mactienPoses,`
    - `src/game/poses/mactienPoses.ts:9`: `export const mactienPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {`
    - Zero occurrences of `chrono_sovereign` or `xuan_feng_sage` in `src/game/poses/`.
  - `src/game/types.ts`:
    - Line 7: `export type CharacterId = 'kuro' | 'raijin' | 'kagura' | 'zero' | 'aether' | 'valkyrie' | 'mirage' | 'chrono' | 'mactien';`
    - Lines 26–27: `| 'chrono_sovereign' | 'xuan_feng_sage';` (`SkinId`)
    - Lines 51–53: `| 'chrono_sovereign' | 'ink_calligraphy' | 'xuan_feng_calligraphy';` (`SlashVfxMotif`)
  - `src/game/animation.ts`:
    - Line 170: `case 'mactien':` in `getUltimateStyleId` (`'spring_scroll'`)
    - Lines 343, 363–364: `chrono_sovereign` & `mactien` / `xuan_feng_sage` in `getAwakenedVisualProfile`
    - Lines 569–590: `dash_slash` for `mactien` (`isXuanFeng = skinId === 'xuan_feng_sage'`)
    - Lines 679–687: `parry_counter` (`chrono_sovereign_slash` vs `mactien` / `isXuanFeng`)
    - Lines 950–1021: `air` combo (`chrono_sovereign_slash` vs `mactien` / `isXuanFeng`)
    - Lines 1082–1170: `mactien` 4-hit ground combo (`mactienTable`, `isXuanFeng`)
    - Lines 1287–1289: `chrono` Hit 6 (`chrono_sovereign_slash`)
  - `src/game/renderer/trails.ts`:
    - Line 19: `const isXuanFeng = a.skinId === 'xuan_feng_sage';` (`renderAfterimages`)
    - Lines 135–136, 144: `inferCharacterForSkin` (`chrono_sovereign` -> `'chrono'`, `xuan_feng_sage` -> `'mactien'`)
    - Line 379: `const isXuanFeng = opts.skinId === 'xuan_feng_sage' || motif === 'xuan_feng_calligraphy';` (`renderAttackSwingAura`)
    - Line 1079: `case 'chrono_sovereign':` in `renderAttackSwingAura`
    - Line 1254: `if (s.style === 'chrono_sovereign_slash') return 'chrono_sovereign';` in `resolveSlashMotif`
    - Line 2130: `case 'chrono_sovereign':` in `renderSlashMotifOrnament`
    - Lines 2282–2290: `chrono_clockwork_slash` / `chrono_sovereign_slash` in `renderSlashTrails`
    - Line 2610: `(s.skinId === 'xuan_feng_sage' || motif === 'xuan_feng_calligraphy')` in `renderSlashTrails`
  - `src/game/Player.ts`:
    - Lines 650–675: `activateAwakening` (`mactien` / `xuan_feng_sage` at 663–668)
    - Lines 954–1008: Dash burst + 5 initial afterimages (`isXuanFengDash` at 954)
    - Lines 1132–1135, 1161–1164: Continuous dash & attack afterimages (`this.skinId === 'xuan_feng_sage'`)
    - Line 1641: `triggerSignatureSkill` (`ink_seal`, `this.skinId === 'xuan_feng_sage'`)
    - Lines 2146–2165: Skill-Link Art (`mactien`, forces `step = 4`, `this.skinId === 'xuan_feng_sage'` at 2153)
    - Line 2203: Ground 4-hit combo modulo (`if (this.character.id === 'mactien') { this.comboStep = (this.comboStep % 4) + 1; ... }`)
    - Lines 2307–2314: `startAttack` `slashTrails` style selection (`chrono_sovereign` & `isMacTien` / `isXuanFeng`)
    - Lines 2580, 2605–2636: Basic-attack skin VFX (`chrono_sovereign` at 2580; `mactien` / `xuan_feng_sage` at 2605–2620)
    - Lines 2696, 2724–2743: Awakened melee effects (`chrono_sovereign` at 2696; `mactien` / `xuan_feng_sage` at 2724–2743)

### 1.2 Pose Architecture (`src/game/poses/`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`)
- **Basic poses (`src/game/poses/`)**:
  - `src/game/poses/types.ts:3-20`:
    ```ts
    export type BasicPoseName = 'idle' | 'run' | 'brake_skid' | 'jump' | 'fall' | 'land' | 'dash' | 'parry';
    export interface PoseContext {
      pose: BasicPoseName;
      t: number;
      walkPhase: number;
      vx?: number;
      vy?: number;
      awakened?: boolean;
    }
    ```
    **Does NOT include `skinId`.**
  - `src/game/poses/index.ts:50-67`:
    `computeBasicCharacterSkeleton(pose: BasicPoseName, t: number, walkPhase: number, characterId?: CharacterId, extra?: { vx?: number; vy?: number; awakened?: boolean }): SkeletonJoints`
    Looks up `POSE_MODULES[characterId]` (`mactien: mactienPoses`, `chrono: chronoPoses`), passes `PoseContext` without `skinId`, and calls `buildSkeletonFromDraft(mod(ctx))` (`src/game/poses/poseMath.ts:147`).
  - `src/game/poses/mactienPoses.ts:9-147`: Handles only the 8 `BasicPoseName` cases (`idle` has upright `torsoLean: 0.03 + poiseSway`, `run` leans `0.22`, `dash` leans `0.42`).

- **Attack poses & Skeleton resolution (`src/game/StickmanRenderer.ts`, `src/game/renderer/types.ts`)**:
  - `src/game/renderer/types.ts:3-58`: `StickPoseName` union enumerates all basic + attack/special poses (`attack_1..4`, `nodachi_overhead_slam`, `dash_slash`, `parry_counter`, `air_attack`, `air_attack_2`, `air_slam`, etc.).
  - `src/game/StickmanRenderer.ts:61-784`:
    `export function computeStickmanSkeleton(pose: StickPoseName, t: number, walkPhase: number, characterId?: CharacterId, extra?: { vx?: number; vy?: number; awakened?: boolean }): SkeletonJoints`
    - Lines 70–72: If `isBasicPoseName(pose)`, delegates to `computeBasicCharacterSkeleton(pose, safeT, safeWalk, characterId, extra)`.
    - Lines 87–771: `switch (pose)` resolves all attack/special poses globally **without `characterId` or `skinId` branching**.
    - Callers of `computeStickmanSkeleton`: `Player.ts:1489`, `StickmanRenderer.ts:949`, `Enemy.ts:777`, `rules.test.ts:192-193`. Neither `Player.ts:1489` nor `StickmanRenderer.ts:949` passes `skinId`.
  - `src/game/StickmanRenderer.ts:1020-1121`: `joints.motionArc` rendering inside `renderStickman(ctx, opts)` **already branches on `opts.characterId` and `opts.skinId`** for `'mirage'` (`1030-1076`, `void_shatterer`) and `'chrono'` (`1077-1105`, `chrono_sovereign`), while `'mactien'` falls through to the generic gray arc at `1105-1117`.

- **Why `mactien` / `xuan_feng_sage` basic attacks currently feel heavy/lunging (`src/game/animation.ts:1082-1170` & `StickmanRenderer.ts`)**:
  - `getComboMoveForCharacter(characterId: CharacterId, step: number, context: AttackContext, skinId: SkinId = 'default'): ComboMoveSpec` (`animation.ts:469-474`) already receives `skinId`, and for `mactien` (`1082-1170`) uses the **exact same `pose` and kinematics** for both `default` and `xuan_feng_sage` (only changing `trailStyle` and `slashArcs` angles):
    1. Hit 1 (`1088-1107`): `pose: 'attack_1'` (`StickmanRenderer.ts:130-144` — "Dynamic Spinning High Kick", `torsoLean = -0.1 - kickExt * 0.32`, `footRTarget` kicks high).
    2. Hit 2 (`1108-1127`): `pose: 'attack_2'` (`StickmanRenderer.ts:146-160` — "Wide Sweeping Horizontal Katana Slash", `hip.y = -43`, `torsoLean = 0.22 + snap * 0.34`, `spineBend = 10`).
    3. Hit 3 (`1128-1147`): `pose: 'attack_3'` (`StickmanRenderer.ts:162-176` — "Acrobat Rising Uppercut Launcher Slash", `hip.y` jumps `-16 * snap`, `torsoLean = 0.2 - snap * 0.42`, `spineBend = -8`).
    4. Hit 4 (`1148-1168`): `pose: 'nodachi_overhead_slam'` (`StickmanRenderer.ts:636-650` — "Kagura colossal two-handed overhead execution slam", `torsoLean = -0.24 + snap * 0.92`, `spineBend = 14`, both hands gripping overhead and slamming down!).
    5. `dash_slash` (`569-590`): `pose: 'dash_slash'` (`StickmanRenderer.ts:320-334`, `hip.y = -36`, `torsoLean = 0.86`, `spineBend = 12`).
    6. `parry_counter` (`686-707`): `pose: 'parry_counter'` (`StickmanRenderer.ts:335-350`, `torsoLean = 0.5`, `spineBend = 10`).
    7. `air` 1..3 (`957-1021`): `air_attack` (`torsoLean: 0.38`), `air_attack_2` (`torsoLean: -0.32`), `air_slam` (`torsoLean: 0.64`, `spineBend: 14`).

### 1.3 Trails, Swing Aura & Ornaments (`src/game/renderer/trails.ts`)
- **4-point star helper**: `drawFourPointStar(ctx, cx, cy, outerR, innerR)` exists at `trails.ts:148-168`.
- **How `chrono_sovereign` renders trails & aura**:
  - `renderAttackSwingAura` (`trails.ts:351-1205`, `case 'chrono_sovereign':` at `1079-1177`): draws outer dark ring + lighter azure/gold ring, 12 gilded time ticks, 2 counter-rotating `drawClockCogwheel` medallions (`12` & `8` teeth), twin clock-hand rays tipped with `drawFourPointStar(5.5, 1.6)`, and 4 Roman numerals (`XII`, `III`, `VI`, `IX`).
  - `renderSlashTrails` (`trails.ts:2282-2605`): handles `chrono_clockwork_slash` and `chrono_sovereign_slash` across 3 geometric modes (`|rawSpan| < 0.65` boomerang throw, `|rawSpan| > 5.0` full-dial snap detonation, else orbital ring sweep), then calls `renderSlashMotifOrnament(ctx, s, chronoMotif, t, inv, chronoArcAnchor, facing)` (`2603`).
  - `renderSlashMotifOrnament` (`trails.ts:2130-2246`, `case 'chrono_sovereign':`): renders 8 time ticks along the sweep, dual counter-rotating cogwheels at midpoint + 1 at start, 4 Roman numerals, twin crossed rays at tip, and 2 `drawFourPointStar` flares (`tip` `10px`, `mid` `7.2px`).
- **How `xuan_feng_sage` (`xuan_feng_brush`) currently renders trails & aura**:
  - `renderAttackSwingAura`:
    - `379, 413-460`: Draws an open Enso arc (`#1e293b`, `#5eead4`, `#f8fafc`) + 2 `#fda4af` petals instead of the default shock ring.
    - `1178-1188`: `case 'xuan_feng_calligraphy':` only draws 2 thin quadratic curves (`#f8fafc`), very sparse compared to `chrono_sovereign`.
  - `renderSlashTrails` (`2607-2793`):
    - Currently **2 ribbon passes** (`Pass 1`: lighter `#5eead4` glow + `#f8fafc` fill / `#5eead4` stroke; `Pass 2`: `#1e293b` dark ink core ribbon + `#f8fafc` outer line). Does **not** follow R4's ordered 3-layer ink-wash → inner jade-teal glow → sharp white brush-tip flash structure.
    - `2690-2732`: Draws 3 alternating `#fda4af` petals and `#5eead4` bamboo leaves along the arc.
    - `2734-2791`: If `isSealFinisher` (`s.secondaryColor === '#fda4af' || '#ef4444'`), draws dashed `#2dd4bf`/`#5eead4` circle + 4 petals + `"静"` kanji.
    - **Missing vs R4**: No `drawFourPointStar` 4-point star glints, no falling ink droplets, and `renderSlashTrails` never calls `renderSlashMotifOrnament` (`renderSlashMotifOrnament` at `1284-2251` has **no** `case 'xuan_feng_calligraphy':` or `case 'ink_calligraphy':`).
  - `renderAfterimages` (`trails.ts:7-118`): `isXuanFeng = a.skinId === 'xuan_feng_sage'` (`19, 26-80`) draws translucent `#f8fafc` / `#5eead4` rim ink-mist silhouettes and `#ccfbf1` wisps (no petals in `renderAfterimages` itself).

### 1.4 `Player.ts` Triggers: Combo 1..4, Dash Echoes & Basic Attacks
- **Dash & Dash Echoes (`Player.ts:934-1058`, `1118-1141`)**:
  - Initial dash (`954-988`): `isXuanFengDash = this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage'`. Emits 2 `SlashBeam`s + 3 petals (`958-961`), pushes 5 `afterimages` (`976-987`) with `ghostPalette = ['#f8fafc', '#e2e8f0', '#ccfbf1', '#5eead4', '#f1f5f9']` and `skinId: this.skinId`, plus `ink_splatter` & white sparks (`997-1007`).
  - Dash tick (`1118-1141`): Every `0.028s` pushes an `afterimage` (`color: this.awakened ? '#ccfbf1' : '#f8fafc'`, `skinId: this.skinId`). Note: `pushAfterimage` (`254-259`) automatically attaches `skinId: this.skinId` if omitted.
  - Stride afterimages (`1340-1350`) and attack `afterimages` (`1149-1171`, `2415-2426`) also push to `this.afterimages`.
- **Combo 1..4 & Basic Attack Trigger (`Player.ts:1061-1097`, `2011-2790`)**:
  - `update` (`1085-1096`) calls `startAttack(...)`.
  - `mactien` Link Art (`2146-2165`): Sets `context = 'ground'`, `step = 4`, `this.comboStep = 4`, emits shockwaves/petals/ink_splatter, calls `onDetonateAllMarks('mactien', ...)`.
  - `mactien` Ground Combo (`2203-2207`): Cycles `this.comboStep = (this.comboStep % 4) + 1`, sets `activeAttackMarkStacks = 1` on steps 2 & 3, `activeAttackDetonates = true` on step 4.
  - Air Combo (`2196-2200`): Cycles `this.airComboStep` 1..3.
  - Move lookup (`2216`): `const move = getComboMoveForCharacter(this.character.id, step, context, this.skinId);`
  - Trail spawning (`2299-2365`): Iterates `move.slashArcs`, forces `trailStyle = 'xuan_feng_brush'` when `isXuanFeng` (`2315-2317`), sets `isMacTienSealHit = isMacTien && ((context === 'ground' && step === 4) || move.heavy || isSkillLink)` (`2318-2320`), sets `outerColor` (`#99f6e4` awakened / `#5eead4` base), `secondaryColor` (`#fda4af` on seal hit, `#5eead4` otherwise), scales radius by `1.24` when awakened (`2341-2342`), and calls `this.pushSlashTrail(...)` with `skinId: this.skinId`, `characterId: this.character.id`, `motif: vfx.motif`.
  - Non-awakened basic-attack flair (`2605-2637`): For `xuan_feng_sage` (`2606-2620`), emits 2–4 petals, 2–5 `ink_splatter`, and on Hit 4 / heavy emits a `#5eead4` shockwave + `'静'` floating text. (Does **not** currently spawn 2 jade bamboo slips on Hit 3 or a rotating seal ring entity on Hit 4.)
  - Awakened melee effects (`2724-2743`): For `mactien` + `xuan_feng_sage`, currently only emits 3 petals + 6 `#5eead4` sparks (and shockwave + 1 afterimage on Hit 4 / heavy) — does **not** yet spawn ranged floating brush blades / bamboo slips (R5).
  - Signature Skill `[U]` (`1623-1668`): Pushes `this.pendingInkSeals.push({ x, y: GROUND_Y, damage, awakened: this.awakened, skinId: this.skinId })`, consumed in `Game.ts:2042-2209`.
  - Hitbox (`spawnCurrentHitbox`, `2792-2859`): Uses `move.reachScale`, `move.heightScale`, `move.knockX/Y`, `move.heavy`, `move.unblockable`, `move.surroundHit`.

---

## 2. Logic Chain

1. **Why `poses/` has no `skinId` branching and why `mactien` attacks feel heavy**:
   - `src/game/poses/` only models the 8 `BasicPoseName` locomotion states (`poses/types.ts:3-11`). Attack poses (`attack_1..3`, `nodachi_overhead_slam`, etc.) are computed in `src/game/StickmanRenderer.ts:87-771`.
   - `getComboMoveForCharacter` (`animation.ts:1082-1170`) already branches on `skinId === 'xuan_feng_sage'` for `trailStyle` and `slashArcs`, **but** still assigns the heavy default poses (`attack_1` high kick, `attack_2` hunched katana slash, `attack_3` uppercut, `nodachi_overhead_slam` two-handed slam).
   - Therefore, changing `xuan_feng_sage`'s 4-hit basic-attack poses (R4) requires adding upright scholar pose definitions in `StickmanRenderer.ts` (and `StickPoseName` in `renderer/types.ts`), then selecting them in `animation.ts:1082-1170` when `isXuanFeng` is true. Optionally, if basic poses (`idle`/`run`/`dash`) or shared poses also need `skinId` awareness, `skinId?: SkinId` can be added to `PoseContext` (`poses/types.ts:13`), `computeBasicCharacterSkeleton` (`poses/index.ts:55`), and `computeStickmanSkeleton` (`StickmanRenderer.ts:66`), passed from `Player.ts:1489` and `StickmanRenderer.ts:949`.

2. **Why `trails.ts` lacks `chrono_sovereign`-grade multi-layer depth for `xuan_feng_sage`**:
   - `chrono_sovereign` achieves high visual density via three coordinated places in `trails.ts`: (a) `renderAttackSwingAura` `case 'chrono_sovereign':` (`1079-1177`), (b) `renderSlashTrails` 3-mode geometry (`2282-2605`), and (c) `renderSlashMotifOrnament` `case 'chrono_sovereign':` (`2130-2246`) using `drawFourPointStar` (`148-168`).
   - By contrast, `xuan_feng_brush` (`2607-2793`) has only 2 ribbon passes, sparse `renderAttackSwingAura` (`413-460`, `1178-1188`), no `renderSlashMotifOrnament` branch, no 4-point star glints, and no ink droplets. Upgrading `xuan_feng_brush` to 3 layers (outer ink wash `#1e293b` → inner jade-teal glow `#5eead4`/`#2dd4bf` → razor-sharp `#ffffff`/`#f8fafc` brush-tip flash) + `drawFourPointStar` glints + falling petals/ink droplets + `motionArc` ink/petal polish in `StickmanRenderer.ts:1021-1121` directly fulfills R4's trail requirements.

3. **How R4 and R5 can maintain clean file ownership / interfaces**:
   - **R4 (Poses & Multi-Layer Trails)** cleanly owns:
     - `src/game/renderer/types.ts` (new scholar `StickPoseName` literals)
     - `src/game/poses/` (if `PoseContext.skinId` or `mactienPoses` basic-pose refinement is needed)
     - `src/game/StickmanRenderer.ts` (`computeStickmanSkeleton` scholar 4-hit poses + `motionArc` `xuan_feng_sage` styling)
     - `src/game/animation.ts` (`getComboMoveForCharacter` `mactien` / `xuan_feng_sage` pose names, arc radii/angles, durations — keeping damage/hitbox parity or tuning safely)
     - `src/game/renderer/trails.ts` (`xuan_feng_brush` 3-layer ribbon, `drawFourPointStar` glints, petals + ink droplets, `renderAttackSwingAura` & `renderSlashMotifOrnament` `case 'xuan_feng_calligraphy':`). Note: `renderAfterimages` (`trails.ts:19, 26-80`) can also be enhanced with drifting petals, or R5 can emit petals on dash in `Player.ts`.
   - **R5 (Awakened Skill Transformations)** cleanly owns:
     - `src/game/Entities.ts` (bamboo-slip / floating brush-blade `Projectile` kind(s), `InkSeal` data/rendering upgrades if defined there, Hanzi impact effects)
     - `src/game/Game.ts` (`inkSeals` 3-tier `Văn Thánh Trấn Thiên Trận` update/render + cross-slash finish)
     - `src/game/Player.ts` Awakened blocks: `activateAwakening` (`650-675`), `ink_seal` (`1641-1653`), Awakened basic attack (`2724-2743` — spawning ranged brush blades/slips), and Awakened dash afterimages/petals (`954-1008`, `1124-1141`).
   - **Single coordination point between R4 and R5**:
     - In `Player.ts`, R4's Hit 3 ("2 jade bamboo slips darting forward") and Hit 4 ("rotating jade-teal seal ring") live in the **non-awakened / base** `startAttack` block (`2605-2620`) or `trails.ts`, whereas R5's Awakened basic-attack blades live in `if (this.awakened)` (`2724-2743`).
     - If R4 Hit 3 wants visual-only bamboo slips (particles/trail ornaments in `trails.ts` or `particles` in `Player.ts:2606-2620`), R4 does not need to touch `Entities.ts` at all. If R4 Hit 3 uses `Projectile` in `Entities.ts`, R5 should define the `Projectile` kind/interface in `Entities.ts` first (or own all `Player.ts` projectile spawning) so `Player.ts` and `Entities.ts` never suffer conflicting edits.

---

## 3. Caveats

1. **Excluded files not inspected**: Per instructions, `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, and `AudioEngine.ts` were **not** read or modified.
2. **Untested `Entities.ts` InkSeal internals**: Only `Projectile` kinds (`503-527, 590-1329`) were checked in `Entities.ts`; `InkSeal` rendering in `Game.ts` (around lines 4011+) was not read in full since `InkSeal` transformation belongs to R5.
3. **Rule compliance check on `poses/`**: Remember `rules.test.ts` tests `computeStickmanSkeleton('idle' | 'dash' | ...)` for finite joint coordinates and height invariants (`hip.y` lower in `dash`/`land` than `idle`). Any new scholar attack poses added to `StickmanRenderer.ts` must pass `buildSkeletonFromDraft` so all joints remain finite (no `NaN`/`Infinity`) and anatomically clamped.

---

## 4. Conclusion

1. **Pose Engine**: `src/game/poses/` handles only `BasicPoseName` (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) and has no `skinId` parameter. Attack poses live in `src/game/StickmanRenderer.ts` (`computeStickmanSkeleton`, lines 61–784) and are assigned in `src/game/animation.ts` (`getComboMoveForCharacter`, lines 469–1875). For `mactien` (`1082–1170`), `xuan_feng_sage` currently inherits heavy/hunched poses (`attack_1`, `attack_2`, `attack_3`, `nodachi_overhead_slam`).
   - **Recommended R4 approach**: Add 4 upright scholar `StickPoseName` values in `src/game/renderer/types.ts` + `StickmanRenderer.ts` (upright torso, one hand behind back or chest seal, other hand wrist-flicking / telekinetically guiding the brush), select them for `skinId === 'xuan_feng_sage'` in `animation.ts:1082–1170` (plus `dash_slash`/`parry_counter` if desired), and add `xuan_feng_sage` `motionArc` ink/petal styling in `StickmanRenderer.ts:1021–1121`. Optionally thread `skinId?: SkinId` into `PoseContext` & `computeStickmanSkeleton`'s `extra` parameter (`Player.ts:1489`, `StickmanRenderer.ts:949`) if basic poses also branch on `skinId`.
2. **Multi-Layer Trails (`src/game/renderer/trails.ts`)**: Upgrade `xuan_feng_brush` (`2607–2793`) from 2 ribbon passes to 3 explicit layers (outer ink wash → inner jade-teal glow → sharp white flash at brush tip), add `drawFourPointStar` (`148–168`) glints and falling petals + ink droplets, and populate `renderSlashMotifOrnament` `case 'xuan_feng_calligraphy':` (`1284–2251`) plus enrich `renderAttackSwingAura` (`413–460`, `1178–1188`) to match `chrono_sovereign`'s layering depth (`1079–1177`, `2130–2246`).
3. **Clean R4 vs R5 Partition**:
   - **R4**: `src/game/renderer/types.ts`, `src/game/poses/*` (if needed), `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/renderer/trails.ts` (and optionally non-awakened Hit 1–4 visual triggers in `Player.ts:2299–2365, 2605–2620`, or keep `Player.ts` owned solely by R5 if Hit 3 bamboo slips are purely trail/particle VFX in `trails.ts` or coordinated after `Entities.ts` defines the bamboo-slip projectile).
   - **R5**: `src/game/Player.ts` (Awakened skills/dashes/basic attacks at `650–675`, `954–1008`, `1124–1141`, `1641–1653`, `2724–2743`), `src/game/Entities.ts`, `src/game/Game.ts`.

---

## 5. Verification Method

1. **Verify line references & symbol signatures**:
   - Inspect `src/game/poses/types.ts:3-20`, `src/game/poses/index.ts:50-67`, `src/game/StickmanRenderer.ts:61-784,935-1132`, `src/game/animation.ts:469-707,957-1170`, `src/game/renderer/trails.ts:7-168,351-460,1079-1258,2130-2793`, and `src/game/Player.ts:650-675,954-1171,1480-1508,1623-1668,2146-2365,2605-2743`.
2. **Post-implementation checks (for implementers from `/data/user/0/com.agy/files/stickman-build`)**:
   - Type-check: `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`
   - Unit tests: `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts`
   - Invariant checks:
     - `grep -rn "shadowBlur" src/` returns 0 matches.
     - `grep -rn "performance\.now" src/game/renderer/ src/game/UltimateCutscene.ts` returns 0 matches.
     - Every modified render function balances `ctx.save()` / `ctx.restore()` (try/finally).
3. **Invalidation conditions**: Any refactor moving `computeStickmanSkeleton` out of `StickmanRenderer.ts` or renaming `mactien` / `xuan_feng_sage` in `types.ts` would invalidate the exact line numbers cited above.
