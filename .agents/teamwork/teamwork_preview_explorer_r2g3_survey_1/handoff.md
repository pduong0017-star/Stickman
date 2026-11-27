# Phase 0 Survey Handoff — Pose, Skeleton, IK, Transitions & Renderer Architecture (`r2g3_survey_1`)

**Core Summary:** All 5 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`) currently share a single `characterId`-agnostic `computeStickmanSkeleton(pose, t, walkPhase)` function where `land` does not exist at all, `idle`/`run`/`parry` use upright torsos and narrow/stiff stances ("rón rén"), `dash`/`run` arm & leg targets exceed anatomical reach (`70.5px` vs `38px` arm max) without end-effector clamping, and `blendSkeleton` interpolates intermediate joints linearly in Cartesian space. Introducing a shared `src/game/poses/poseMath.ts` + 5 isolated `src/game/poses/<char>Poses.ts` modules enables parallel, zero-conflict overhaul of all 5 characters while preserving all existing simulation, hitbox, and test contracts.

---

## 1. Observation

### 1.1 `src/` File Inventory (29 files)
- Root `src/`: `App.tsx`, `index.css`, `main.tsx`
- `src/components/`: `GameHUD.tsx`, `Modals.tsx`, `TitleScreen.tsx`, `TouchControls.tsx`
- `src/game/`:
  - Core pose/animation/render: `StickmanRenderer.ts` (5226 lines), `animation.ts` (1106 lines), `types.ts` (276 lines), `characters.ts` (752 lines)
  - Actors & loop: `Player.ts` (2148 lines), `Enemy.ts` (817 lines), `Boss.ts` (1205 lines), `Game.ts` (2634 lines)
  - Combat/VFX/other: `AudioEngine.ts`, `Camera.ts`, `Entities.ts`, `InputHandler.ts`, `ParticleSystem.ts`, `PeriodicTableBG.ts`, `UltimateCutscene.ts`, `rules.ts`, `rules.test.ts`, `skinVfx.ts`, `stages.ts`, `synergy.ts`

### 1.2 Skeleton Joint Model & Coordinate Conventions (`src/game/StickmanRenderer.ts`)
- **Transform & Axes** (`StickmanRenderer.ts:1137-1139`):
  - `renderStickman` applies `ctx.translate(opts.x, opts.y)` then `ctx.scale(opts.facing * (opts.scaleX ?? 1), opts.scaleY ?? 1)`.
  - `(0, 0)` is the ground contact baseline (`GROUND_Y = 580` when grounded).
  - **Y-axis**: Negative `y` is **upward**; `y = 0` is floor level.
  - **X-axis**: Positive `x` is **forward** (direction of `facing`); negative `x` is **backward**.
  - **Angles**: `0` rad = straight forward (`+x`); `-Math.PI / 2` = straight up (`-y`); `+Math.PI / 2` = straight down (`+y`); `±Math.PI` = straight backward (`-x`).
- **`SkeletonJoints` Interface** (`StickmanRenderer.ts:76-99`):
  - `hip: Vec2`, `spineMid: Vec2`, `neck: Vec2`, `head: Vec2`
  - `shoulderL: Vec2`, `elbowL: Vec2`, `handL: Vec2` (drawn in back pass `drawBackOnly=true`, lines 1084-1088)
  - `shoulderR: Vec2`, `elbowR: Vec2`, `handR: Vec2` (drawn in front pass `drawFrontOnly=true`, lines 1102-1107)
  - `kneeL: Vec2`, `footL: Vec2` (back leg, lines 1086)
  - `kneeR: Vec2`, `footR: Vec2` (front leg, lines 1104)
  - `weaponAngle: number` (radians in facing-flipped local space)
  - `motionArc?: { x: number; y: number; r: number; sa: number; ea: number }`
- **FK Torso/Head & 2-Bone IK Solver** (`StickmanRenderer.ts:216-236, 1028-1067`):
  - `torsoLen = 34`: `neck = { x: hip.x + Math.sin(torsoLean) * 34, y: hip.y - Math.cos(torsoLean) * 34 }`
  - `spineMid = { x: (hip.x + neck.x) * 0.5 + spineBend, y: (hip.y + neck.y) * 0.5 }` (note: `spineBend` is raw horizontal `+x` offset, not perpendicular to torso).
  - `head = { x: neck.x + Math.sin(torsoLean) * 13, y: neck.y - Math.cos(torsoLean) * 13 }` (`headRadius = 12.8` in `Player.ts:2121`).
  - `shoulderL = { x: neck.x - 4, y: neck.y + 5 }`, `shoulderR = { x: neck.x + 4, y: neck.y + 5 }` (fixed screen-axis offset, unrotated by `torsoLean`).
  - `solveTwoBoneIK(root, target, len1, len2, bendDir)`:
    - Legs: `len1 = 26, len2 = 26` (max reach = `52`), `bendDir = -1` for both `kneeL` and `kneeR` (`1045-1046`).
    - Arms: `len1 = 19, len2 = 19` (max reach = `38`), `bendDir = 1` for both `elbowL` and `elbowR` (`1047-1048`).
    - `dist = Math.max(0.01, Math.min(len1 + len2 - 0.01, Math.hypot(dx, dy)))` (`225`).
    - **Crucial observation**: `footL/footR/handL/handR` returned at lines `1057, 1060, 1062, 1064` are the **unclamped** `footLTarget` / `handLTarget` values, NOT projected onto `dist <= len1 + len2`.
- **Weapon & Accessory Attachment** (`StickmanRenderer.ts:1297-1431, 3457-4050`):
  - Primary weapon (`renderWeapon`, `3466-3467`): `ctx.translate(joints.handR.x, joints.handR.y); ctx.rotate(joints.weaponAngle);`.
  - Off-hand weapon for Zero (`twin_daggers` / `void_sabers`, `1363-1384`): translates to `joints.handL` and rotates by `joints.weaponAngle + 0.55`.
  - Aether off-hand orb (`arcane_hands` / `prismatic_hands`, `1385-1412`): spinning circle + 4-point star at `joints.handL` (and same at `joints.handR` in `3976-4014`).
  - Waist sheath (`1297-1338`): placed at `(joints.hip.x - 4, joints.hip.y + 2)` rotated `0.28` rad.
  - Render order (`1137-1434`): `darkAura` -> `scarf` -> `motionArc` -> `attackSwingAura` -> `cape` / `skinBackAttachment` / `awakenedBackForm` -> ground reflection & shadow -> black ink outline pass (`lw + 4.4`) -> back limbs + torso + head (`drawBackOnly`) -> outfit/armor/headgear/sheath -> primary weapon -> front limbs (`drawFrontOnly`) -> collar/off-hand weapon/shield.

### 1.3 Current Basic Poses (Shared Across All 5 Characters!)
`Player.ts:1108-1109` calls `computeStickmanSkeleton(pose, this.poseTime, this.walkPhase)` with **no character ID**. `StickmanRenderer.ts:241-245` does not accept `characterId`.

| State | Source Location | Exact Values | Observed Issues |
|---|---|---|---|
| `idle` | `StickmanRenderer.ts:284-294` | `hip=(0, -48+breath)`, `torsoLean=0.1` (5.7°), `spineBend=3`, `footL=(-17,0)`, `footR=(18,0)`, `handL=(10,-56+b)`, `handR=(24,-52+b)`, `weaponAngle=-0.45` | Nearly vertical torso, narrow stance (35px), leg distances `50.9px` & `51.3px` (almost straight locked knees out of 52px max), generic arms regardless of weapon/character. |
| `run` | `animation.ts:84-131` & `StickmanRenderer.ts:295-307` | `hip=(3, -44 - |sin(p)|*2.2)`, `torsoLean=0.34+sin(2p)*0.025` (19.5°), `foot=3+cos(p)*23`, lift `y=-sin(p)^0.85*17` (when `sin>0`), `handL=(10+arm*15, -50..)` `handR=(-14-arm*5, -46+...)`, `weaponAngle=-2.65-arm*0.07` | Upright jog lean (19.5°), symmetric cosine foot x (`-20..+26`, ±23px amplitude), high hip (`-44..-46.2`), tiny bounce (`2.2px`). `handR` at `(-19,-46)` is `44.9px` from `shoulderR(18.3,-71)` (>38px arm max -> forearm stretches!). `Player.ts:2047` triggers `'run'` whenever `|vx|>35` while `walkPhase += dx * 0.042` crawls at low `vx`. |
| `dash` | `StickmanRenderer.ts:360-371` | `hip=(14, -37)`, `torsoLean=0.82` (47°), `spineBend=11`, `footL=(-36,-9)`, `footR=(20,-3)`, `handL=(-28,-50)`, `handR=(-26,-40)`, `weaponAngle=-2.95` | `footL` dist = `57.3px` (>52px leg max). `neck=(38.9,-60.2)` -> `shoulderL=(34.9,-55.2)` -> `handL` dist = **`63.1px`** (166% of 38px arm max); `shoulderR=(42.9,-55.2)` -> `handR` dist = **`70.5px`** (185% of 38px max -> forearm stretches to 51.5px!). Front foot tucked straight down (`34.5px`) under chest. |
| `jump` | `StickmanRenderer.ts:320-331` | `tuck=min(1, t/0.16)`, `hip=(2, -50-3*tuck)`, `torsoLean=0.22`, `footL=(-14,-18*tuck)`, `footR=(18,-7*tuck)`, `handL=(12,-56)`, `handR=(-16,-50)` | At `t=0`, feet are on `y=0` with `hip=-50` (standing straight); at `t>=0.16`, `footR` dist = `48.7px` (nearly straight leg), stiff static upper body. |
| `fall` | `StickmanRenderer.ts:349-359` | `hip=(2, -49)`, `torsoLean=0.16`, `footL=(-16,-8)`, `footR=(14,-18)`, `handL=(14,-54)`, `handR=(-14,-48)` | Completely static (ignores `t` and `vy`), upright `0.16` rad lean, stiff limbs. |
| `land` | **MISSING** (`StickmanRenderer.ts:6-60`, `Player.ts:993-1054, 2028-2049`) | No `'land'` pose exists. `Player.ts:995-996` only sets `scaleX=1.22, scaleY=0.78` (or `1.36 / 0.66` on slam) and returns `'idle'` or `'run'`. | Whole-canvas `scaleY` squashes circular head into a flat oval and thins horizontal lines without bending knees or dropping hip (`hip.y` stays `-48`). |
| `parry` | `StickmanRenderer.ts:656-667` | `hip=(2, -44)`, `torsoLean=-0.06` (-3.4° back), `footL=(-22,0)`, `footR=(24,0)`, `handL=(16,-60)`, `handR=(24,-68)`, `weaponAngle=-1.42` | Leans slightly backward, legs nearly locked (`50.1px` / `49.2px` out of 52px), static for all 5 fighters (even Aether who has no blade!). |
| `brake_skid` | `StickmanRenderer.ts:308-319` | `hip=(-6, -40)`, `torsoLean=-0.34`, `footL=(-14,0)`, `footR=(28,0)` | `footR` dist = `52.49px` (>52px leg max). |

### 1.4 Transitions & State Machine (`Player.ts:579-1123, 2028-2049`, `animation.ts:47-71`)
- `Player.stepSkeletonBlend(dt)` (`1107-1123`) computes `target = computeStickmanSkeleton(pose, this.poseTime, this.walkPhase)` and EMA-blends `this.blendedJoints = blendSkeleton(this.blendedJoints, target, 1 - Math.exp(-rate * dt))` (`rate = 30` when attacking/dashing/parrying/flipping, `19` otherwise).
- `blendSkeleton` (`animation.ts:47-71`) runs `lerpVec2` independently on all 14 joints (`hip`, `spineMid`, `neck`, `head`, `shoulderL/R`, `elbowL/R`, `handL/R`, `kneeL/R`, `footL/R`) plus `lerpAngle` on `weaponAngle`.
- `poseTime` is **not** reset on `jump -> fall`, `dash -> run/idle`, `parry -> idle`, `brake_skid`, or `run <-> idle`.
- `walkPhase` is **not** phase-reset when starting a run from `idle` (`Player.ts:976-977`).
- `sittingOnChair` in `Player.update()` (`579-586`) returns early before `stepSkeletonBlend(dt)` (`1097`).

### 1.5 Secondary Codebase Findings Affecting Character Parity & Existing Tests
- **Aether (`aether`) gaps**:
  - `src/game/characters.ts:314, 691` sets `headGear: 'astral_halo'`, which is missing from `StickmanRenderOptions['headGear']` (`StickmanRenderer.ts:161-173`) and `renderHeroHeadGear` (`StickmanRenderer.ts:1625-1934`).
  - `src/game/animation.ts`: `getComboMoveForCharacter` (`338-1093`), `getUltimateStyleId` (`139-151`), and `getAwakenedVisualProfile` (`163-298`) lack explicit `'aether'` cases (falling through to `'kuro'`).
  - `src/game/synergy.ts:116-152` (`computeSynergyCooldownRefund`) lacks an `'aether'` branch.
- **Unit test assumptions (`src/game/rules.test.ts`)**:
  - Lines `140, 156, 157, 266-269, 291-292` assert `4` characters (`CHARACTER_ORDER.length === 4`), whereas `characters.ts:86` has `5` (`['kuro', 'raijin', 'kagura', 'zero', 'aether']`).
  - Lines `188-197` assert on `blendSkeleton(idle, dash, 0.5)`: `mid.hip.x > idle.hip.x && mid.hip.x < dash.hip.x` and `mid.hip.y > idle.hip.y && mid.hip.y < dash.hip.y`.
  - Lines `223-248` assert on `computeRunStrideKinematics(phase)`: `distL < 51.5`, `distR < 51.5`, `footL.y < -14` at some phase, `footR.y < -14` at some phase, and `footL.y === 0 || footR.y === 0` at some phase.

---

## 2. Logic Chain

1. **Why all 5 characters feel identical and "rón rén" in locomotion/stance**:
   - From Observation 1.3, `computeStickmanSkeleton` never receives `characterId`, so Kuro, Raijin, Kagura, Zero, and Aether all evaluate the same `idle`, `run`, `dash`, `jump`, `fall`, `parry` formulas.
   - In `idle` (`hip.y=-48`, `torsoLean=0.1`, `foot=±17.5`) and `parry` (`hip.y=-44`, `torsoLean=-0.06`), leg lengths are `49.2–51.3px` out of `52px` max, leaving knees nearly locked straight and center of mass high.
   - In `run` (`animation.ts:84-131`), `torsoLean=0.34` (19.5°) and symmetric `cos(phase)*23` foot arc around `hip.x=3` create a short-stride upright jog without explosive push-off/knee-drive asymmetry. Combined with `Player.ts:2047` entering `'run'` at `|vx|>35` while `walkPhase` increments by `|dx|*0.042`, acceleration and deceleration produce slow-motion shuffling ("rón rén").
   - Because `'land'` does not exist (Obs 1.3), landing uses canvas `scaleX/scaleY` (`Player.ts:995-996`), distorting the head circle into an ellipse while keeping `hip.y` at `-48` (idle height), failing the low-COG landing requirement.

2. **Why joints stretch or invert**:
   - From Obs 1.2 & 1.3, `computeStickmanSkeleton` passes raw `footLTarget`/`handLTarget` directly into `SkeletonJoints` (`1057-1064`) while `solveTwoBoneIK` clamps only `dist` (`225`). Whenever `hypot(target - root) > len1 + len2`, the distal segment (`shin` or `forearm`) visually stretches beyond `26px` / `19px` — reaching `70.5px` (185% of `38px`) on `dash.handR` and `44.9px` on `run.handR`.
   - Fixed `bendDir = +1` on elbows (`1047-1048`) inverts the elbow upward whenever a hand is raised above and behind the shoulder (`dx < 0, dy < 0`).
   - Adding `spineBend` purely to `spineMid.x` (`1034`) and keeping `shoulderL/R` unrotated (`1042-1043`) distorts the spine/shoulder silhouette under steep forward leans (`dash`, `run`, flips).

3. **Why transitions can snap or shrink limbs**:
   - From Obs 1.4, `blendSkeleton` lerps intermediate `elbow`, `knee`, `neck`, and `head` positions linearly in Cartesian space instead of preserving bone lengths or re-solving IK on the blended targets, causing limbs to collapse/shorten mid-chord during large arm/leg sweeps (e.g., `idle` <-> `dash`, `run` <-> `parry`).
   - Un-reset `poseTime` on `jump -> fall`, `dash -> run/idle`, `parry -> idle`, and unaligned `walkPhase` at run start cause mid-cycle phase jumps when switching states.

4. **How to enable 5 character agents to work in parallel with ZERO conflicts**:
   - Separating shared IK/FK, end-effector clamping, spine/shoulder transform, sprint-curve helpers, and smart transition blending into `src/game/poses/poseMath.ts` + `src/game/poses/types.ts` gives all 5 character modules a single, safe `PoseDraft -> SkeletonJoints` pipeline.
   - Placing each character's basic poses in its own file (`kuroPoses.ts`, `raijinPoses.ts`, `kaguraPoses.ts`, `zeroPoses.ts`, `aetherPoses.ts`) behind a thin `src/game/poses/index.ts` router isolates all 5 character authors completely from each other and from `Player.ts`/`StickmanRenderer.ts`.

---

## 3. Caveats

- **Scope boundary**: This survey focused on skeleton, IK/FK, the 7 basic movement states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry` + `brake_skid`), state transitions, and renderer/player wiring. Attack combo poses (`attack_1..4`, `spear_*`, `nodachi_*`, `dagger_*`, `katana_*`) in `StickmanRenderer.ts:373-1012` were reviewed for IK/clamping impact (`solveTwoBoneIK` clamping benefits them too) but are not proposed for per-character basic-movement rewrites unless needed.
- **Test execution**: Per read-only Phase 0 role, no tests or builds were run; existing test contracts were verified by direct source inspection (`src/game/rules.test.ts`, `tests/e2e/helpers/testHarness.ts`, `tests/e2e/tier1_features.e2e.test.ts`, `tests/e2e/run-e2e.mjs`).
- **Pre-existing `rules.test.ts` 4-vs-5 character mismatch**: `src/game/rules.test.ts` lines `140, 156-157, 266-269, 291-292` still expect 4 characters while `src/game/characters.ts:86` defines 5 (`kuro`, `raijin`, `kagura`, `zero`, `aether`). Whoever handles Foundation/Integration or Testing will need to account for this when running `--with-unit`.

---

## 4. Conclusion & Recommended Architecture

### 4.1 Proposed Module Layout (`src/game/poses/`)
1. **Foundation / Integration Ownership** (touches `src/game/poses/types.ts`, `src/game/poses/poseMath.ts`, `src/game/poses/index.ts`, `src/game/animation.ts`, `src/game/StickmanRenderer.ts`, `src/game/Player.ts`):
   - `src/game/poses/types.ts`: Defines `PoseContext`, `PoseDraft`, `CharacterPoseModule`, `SprintStyleConfig`.
   - `src/game/poses/poseMath.ts`:
     - Constants: `TORSO_LEN = 34`, `HEAD_OFFSET = 13`, `THIGH_LEN = 26`, `SHIN_LEN = 26`, `UPPER_ARM_LEN = 19`, `FOREARM_LEN = 19`.
     - `clampToReach(root, target, minDist, maxDist)`: clamps `footL/R` (max `51.4`) and `handL/R` (max `37.4`) **before** storing into `SkeletonJoints`, eliminating stretched forearms/shins.
     - `solveSafeTwoBoneIK(root, target, len1, len2, bendDir)`: `Number.isFinite` guards, zero-distance fallback, returns `{ joint, endEffector }`.
     - `resolveElbowBendDir(shoulder, hand, torsoLean, override?)`: defaults to `+1` for front/low-back hands and `-1` when raised behind-above shoulder (`dx < 0 && dy < 0` in torso frame) so elbows never invert.
     - `buildSkeletonFromDraft(draft: PoseDraft): SkeletonJoints`: computes `neck`, perpendicular `spineMid`, torso-rotated `shoulderL/R`, `head` (with optional `headTilt`), and solves clamped legs/arms with finite sanitization on every coordinate.
     - `computeAnimeSprintStride(walkPhase, cfg: SprintStyleConfig)`: asymmetric drive/recovery sprint foot trajectory (`push-off -> heel-kick -> high-knee reach -> plant`), speed-scaled stride factor (no slow-mo tiptoe), guaranteed `dist < 51.4`.
     - `computeLandingCurve(t, duration)`: crisp drop-and-rebound curve for `land`.
   - `src/game/poses/index.ts`: Maps `CharacterId` -> `CharacterPoseModule` (`kuro`, `raijin`, `kagura`, `zero`, `aether`), defaulting cleanly to `kuro`.
   - `src/game/animation.ts`:
     - Update `computeRunStrideKinematics(walkPhase)` via `computeAnimeSprintStride` (preserving `rules.test.ts:223-248`).
     - Upgrade `blendSkeleton(prev, target, alpha)` to interpolate `hip`/`hand`/`foot`/`head`/`neck`/`weaponAngle` AND re-clamp/re-solve `elbowL/R` and `kneeL/R` (or preserve bone segment lengths) with `Number.isFinite` guards so transitions never collapse limbs or produce `NaN`.
   - `src/game/StickmanRenderer.ts`:
     - Add `'land'` to `StickPoseName`.
     - Add optional `characterId?: CharacterId` (plus `vx?: number; vy?: number; awakened?: boolean`) to `StickmanRenderOptions`.
     - Extend `computeStickmanSkeleton(pose, t, walkPhase, characterId?, extra?)` (backward-compatible 3-arg signature for `Enemy.ts`, `Boss.ts`, `rules.test.ts`) to dispatch basic states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) through `src/game/poses/index.ts` -> `buildSkeletonFromDraft`, and apply `clampToReach` in the tail for legacy attack poses.
     - (Optional integration fix) Add `'astral_halo'` to `headGear` union & `renderHeroHeadGear` for Aether.
   - `src/game/Player.ts`:
     - Add `landTimer = 0` (`0.16s` normal landing, `0.24s` heavy/slam landing) set on touchdown (`!onGround && vy > 180`), cancelable immediately on `jump`, `dash`, `attack`, `parry`, or sustained `moveAxis` after initial absorb (`landTimer < 0.08`).
     - Return `'land'` in `getCurrentPose()` when `this.landTimer > 0`.
     - Reset `poseTime = 0` on state transitions (`jump->fall`, `fall->land`, `dash->run/idle`, `parry->idle`, `brake_skid`) and phase-align `walkPhase` when starting run from standstill (`|vx| < 40 && moveAxis !== 0`).
     - Soften whole-context `scaleX/scaleY` on jump/dash/land (`0.93..1.08` instead of `0.66..1.36`) so real joint articulation drives squash/stretch without oval heads.
     - Pass `this.character.id`, `this.skinId`, `this.vx`, `this.vy`, `this.awakened` into `computeStickmanSkeleton` and `renderStickman`.

2. **5 Parallel Character Pose Agents (ZERO File Overlap!)**:
   - **Agent Kuro** -> `src/game/poses/kuroPoses.ts`: Iaido swordsman — low coiled combat `idle` (left hand near hip sheath, katana poised forward-low), sharp 38° forward-lean `run` with trailing reverse-grip katana & forward guard arm, razor-flat low Iaido bullet `dash` (`hip.y ≈ -33`, `torsoLean ≈ 0.92`, clamped trailing arm), poised aerial sword tuck `jump`/`fall`, single-knee-drop absorb `land`, diagonal two-handed katana deflection `parry`.
   - **Agent Raijin** -> `src/game/poses/raijinPoses.ts`: Lightning spearman — wide athletic lancer `idle` (spear angled forward/low ready to thrust), aerodynamic 42° sprint `run` with spear trailing cleanly behind hip, horizontal dragon-skewer `dash`, pole-vault tucked `jump` / spear-aimed `fall`, wide planted lancer brace `land`, diagonal cross-shaft polearm `parry`.
   - **Agent Kagura** -> `src/game/poses/kaguraPoses.ts`: Heavy Flame Nodachi powerhouse — wide-stanced grounded `idle` (Nodachi resting over shoulder or angled heavy two-handed), heavy 34° powerhouse charging `run`, low battering-ram greatblade `dash`, heavy arcing `jump`/`fall`, deep wide ground-braced shock-absorb `land`, braced two-handed vertical/diagonal greatblade wall `parry`.
   - **Agent Zero** -> `src/game/poses/zeroPoses.ts`: Twin-dagger shadow assassin — deep crouched panther `idle` (very low hip `-39..-41`, crossed/reversed twin daggers), extreme 48° shinobi sprint `run` (both daggers swept symmetrically behind — no off-hand clipping face!), ultra-low shadow-skim `dash`, coiled somersault-ready `jump`/`fall`, silent low cat-crouch `land`, X-scissor crossed dagger `parry`.
   - **Agent Aether** -> `src/game/poses/aetherPoses.ts`: VIP Battle Mage — poised levitating/martial-mage `idle` (floating palms holding arcane circles, rhythmic hover/weight shift), wind-gliding 36° `run` with trailing arcane palms, comet-streak low `dash`, graceful aerial levitation `jump`/`fall`, cushioned palm-stabilized `land`, forward double-palm arcane mandala barrier `parry`.

### 4.2 Quantitative Pose Invariant Targets (For Verification & Tests)
- **Zero `NaN`/`Infinity`**: Every joint `(x, y)` and `weaponAngle` finite for all `t >= 0`, `walkPhase in [0, 4π]`, all 5 characters, all 8 basic poses.
- **Strict Limb Length Bounds**: `dist(hip, foot) <= 51.5` and `dist(shoulder, hand) <= 37.5` (no stretched forearms/shins).
- **No "Rón Rén" Posture**:
  - `run`: `torsoLean >= 0.50` rad (~29°+) across all 5 characters; stride foot horizontal separation (`max(footR.x - footL.x)`) `>= 52px` (vs current `46px`), asymmetric lift/drive.
  - `dash`: `torsoLean >= 0.78` rad (~45°+), `dash.hip.y >= idle.hip.y + 7` (at least 7px lower COG than idle, while keeping `dash.hip.x > idle.hip.x` for `rules.test.ts:195`).
  - `land`: `land.hip.y >= idle.hip.y + 8` (at least 8px lower COG than idle at compression peak `t ≈ 0.04`).
  - `parry`: wide grounded stance (`footR.x - footL.x >= 44px`), lower hip than `idle` (`parry.hip.y >= idle.hip.y + 2`), forward-committed guard (`torsoLean >= 0.08` or braced forward).

---

## 5. Verification Method
1. **Static Inspection of Current Findings**:
   - Inspect `src/game/StickmanRenderer.ts` lines `216-371, 656-667, 1028-1068, 1137-1139, 1297-1435, 1625-1934`.
   - Inspect `src/game/animation.ts` lines `47-131` and `src/game/Player.ts` lines `976-1123, 2028-2146`.
2. **Post-Implementation Automated Verification**:
   - Run existing unit & E2E suites (per `PROJECT.md` Android execution rules):
     - `node tests/e2e/run-e2e.mjs --with-unit --tier=all`
   - Run a programmatic pose/joint invariant test covering all 5 characters × `{idle, run, dash, jump, fall, land, parry}` verifying:
     - Zero `NaN` / `Infinity` in all 14 joints + `weaponAngle`
     - `dist(hip, foot) <= 52` and `dist(shoulder, hand) <= 38`
     - `run` `torsoLean >= 0.50` & stride span `>= 52px`
     - `dash` & `land` `hip.y` lower (less negative) than `idle.hip.y` by `>= 7px`
     - `blendSkeleton` transition sweep (`0..1`) preserves finite, non-collapsed limb lengths
   - Run production build in `/data` scratch per `PROJECT.md`: `node node_modules/vite/bin/vite.js build`
   - Render visual verification PNGs via `tests/e2e/render-skins.py` (or extended pose-sheet renderer) and inspect with `view_file`.
3. **Invalidation Conditions**:
   - Any change to `rules.test.ts:192-196` expectations (`dash.hip.x > idle.hip.x`, `dash.hip.y > idle.hip.y`) or `computeRunStrideKinematics` bounds (`dist < 51.5`) without updating/re-verifying `rules.test.ts` would invalidate test compatibility.
