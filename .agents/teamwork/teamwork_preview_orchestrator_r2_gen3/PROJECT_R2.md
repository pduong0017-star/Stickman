# Project R2: Stickman Anime Fighting Pose & Movement Overhaul

## Architecture
- **Engine**: React 19 + Vite 8 + Tailwind CSS v4 + TypeScript + HTML5 Canvas 2D fixed-substep (`SIM_STEP = 1/120s`) action game.
- **Modular Pose Architecture (`src/game/poses/`)**:
  - **Shared Pose Engine (`src/game/poses/types.ts`, `src/game/poses/poseMath.ts`, `src/game/poses/index.ts`)**:
    - Defines `PoseContext`, `PoseDraft`, `SprintStyleConfig`, `CharacterPoseModule`, and bone constants (`TORSO_LEN = 34`, `HEAD_OFFSET = 13`, `THIGH_LEN = 26`, `SHIN_LEN = 26`, `UPPER_ARM_LEN = 19`, `FOREARM_LEN = 19`).
    - Provides `clampToReach()` (clamping foot targets to `<= 51.4px` from hip and hand targets to `<= 37.4px` from shoulder **before** returning `SkeletonJoints`, eliminating stretched limbs), `solveSafeTwoBoneIK()` (with `Number.isFinite` guards), `resolveElbowBendDir()` (preventing upward elbow inversion when hands rise behind/above shoulders), `buildSkeletonFromDraft()` (torso-rotated shoulders, perpendicular `spineMid` curve, finite sanitization), `computeAnimeSprintStride()` (asymmetric drive/recovery sprint cycle with wide stride and ground contact), and `computeLandingCurve()`.
  - **Per-Character Pose Modules (`src/game/poses/{kuro,raijin,kagura,zero,aether}Poses.ts`)**:
    - Isolated, zero-conflict modules implementing distinct Anime Fighting / Hyuns Dojo silhouettes for all 8 basic movement/stance poses (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) tailored to each fighter's anatomy, weight, and weapon/magic identity.
- **Renderer, Animation & Player Integration**:
  - `src/game/StickmanRenderer.ts`: Adds `'land'` to `StickPoseName`, `'astral_halo'` to `headGear` + `renderHeroHeadGear`, optional `characterId` + context in `StickmanRenderOptions` and `computeStickmanSkeleton`, routes basic poses through `src/game/poses/index.ts`, applies `clampToReach` to legacy attack poses, and renders Aether's forward arcane mandala barrier during `parry`.
  - `src/game/animation.ts`: Upgrades `blendSkeleton()` to interpolate primary anchors (`hip`, `footL/R`, `handL/R`, `torsoLean`/`neck`/`head`, `weaponAngle`) and re-solve/clamp elbows & knees so transitions never collapse bone lengths or produce `NaN`; upgrades `computeRunStrideKinematics()` via `computeAnimeSprintStride`.
  - `src/game/Player.ts`: Adds non-blocking `landTimer` (`'land'` pose on touchdown, immediately cancelable on action or post-absorb movement), resets `poseTime = 0` on state transitions, phase-aligns `walkPhase` on run start, softens whole-canvas `scaleX`/`scaleY` (`0.94..1.07`) so joint articulation drives squash/stretch without flattening the head, and passes `character.id`, `vx`, `vy`, `awakened` to skeleton & render calls.
- **R3 Gameplay Compatibility Invariant**:
  - Hitboxes (`ActiveMeleeHitbox`), hurtboxes, movement speeds, dash speed/duration, jump velocity, gravity, parry frames/windows, 14 skins/VFX profiles, and `Enemy`/`Boss` default 3-arg `computeStickmanSkeleton(pose, t, walkPhase)` calls remain 100% preserved.

## Feature Inventory
Every requirement from `ORIGINAL_REQUEST.md` (`## Follow-up — 2026-11-25T17:33:57Z`) and Phase 0 Survey findings is assigned to a milestone below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| R2-F1 | Safe Pose Math, Clamped IK & Transition Blender | Create `src/game/poses/{types,poseMath,index}.ts`, upgrade `blendSkeleton()` & `computeRunStrideKinematics()` in `animation.ts`, eliminating stretched arms/legs (`<=37.4px`/`<=51.4px`), inverted elbows, mid-blend limb collapse, and `NaN`/`Infinity`. | M1 | survey_1 |
| R2-F2 | `'land'` State, Transition Resets & Renderer/Aether Type Parity | Add `'land'` pose + non-blocking `landTimer` in `Player.ts`, `poseTime` resets, softened `scaleX/scaleY`, `'land'` & `characterId` routing + Aether `parry` barrier + `'astral_halo'` fix in `StickmanRenderer.ts` & `characters.ts`, and `4->5` alignment in `rules.test.ts`. | M1 | survey_1, survey_2, survey_3 |
| R2-F3 | Kuro Pose & Movement Overhaul | Iaido Swordsman (`kuroPoses.ts`): coiled low-draw `idle`, sharp 38°+ lean `run`, razor-flat Iaido `dash`, tucked `jump`/`fall`, single-knee-drop `land`, diagonal katana deflection `parry`, `brake_skid`. | M2-Kuro | ORIGINAL_REQUEST, survey_1, survey_2 |
| R2-F4 | Raijin Pose & Movement Overhaul | Lightning Spearman (`raijinPoses.ts`): wide athletic lancer `idle`, aerodynamic 40°+ sprint `run`, horizontal dragon-skewer `dash`, pole-vault `jump`/`fall`, wide lancer brace `land`, cross-shaft polearm `parry`, `brake_skid`. | M2-Raijin | ORIGINAL_REQUEST, survey_1, survey_2 |
| R2-F5 | Kagura Pose & Movement Overhaul | Heavy Flame Nodachi (`kaguraPoses.ts`): grounded powerhouse `idle`, surging heavy 34°+ `run`, low battering-ram `dash`, weighty arcing `jump`/`fall`, deep wide ground-brace `land`, two-handed greatblade wall `parry`, `brake_skid`. | M2-Kagura | ORIGINAL_REQUEST, survey_1, survey_2 |
| R2-F6 | Zero Pose & Movement Overhaul | Twin-Dagger Assassin (`zeroPoses.ts`): deep crouched panther `idle`, extreme 45°+ shinobi `run` (clean dual-dagger sweep), ultra-low shadow-skim `dash`, coiled somersault `jump`/`fall`, cat-crouch `land`, X-scissor dagger `parry`, `brake_skid`. | M2-Zero | ORIGINAL_REQUEST, survey_1, survey_2 |
| R2-F7 | Aether Pose & Movement Overhaul | VIP Arcane Battle Mage (`aetherPoses.ts`): poised levitating/martial-mage `idle`, wind-gliding 32°+ `run` with trailing arcane palms, comet-streak low `dash`, graceful `jump`/`fall`, palm-stabilized `land`, forward double-palm mandala `parry`, `brake_skid`. | M2-Aether | ORIGINAL_REQUEST, survey_1, survey_2 |
| R2-F8 | Programmatic Pose/Joint Tests & Visual Pose Sheet Suite | Align `tier1_features` / `testHarness` to 5 chars & 14 skins; build `poseAssertions.ts`, `poses.e2e.test.ts`, and Pillow `render-poses.py` (5×7 contact sheet + metrics with `.nomedia` isolation). | E2E | ORIGINAL_REQUEST, survey_3 |
| R2-F9 | Full Verification, Visual Inspection, Tier 5 Hardening & `dist/` Sync | Run full unit + E2E suite (100% pass), inspect 5×7 visual PNGs, run Tier 5 adversarial pose/joint hardening, run `tsc --noEmit` (0 errors) & `vite build` in scratch, sync `Stickman/dist/`. | M3 | ORIGINAL_REQUEST, survey_3 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M1 | Shared Pose Foundation & Integration | `src/game/poses/{types,poseMath,index}.ts` + initial scaffolds, `animation.ts`, `StickmanRenderer.ts`, `Player.ts`, `characters.ts`, `rules.test.ts` (R2-F1, R2-F2) | none | PLANNED |
| E2E | Programmatic Pose & Visual Render Suite | `tests/e2e/helpers/{testHarness.ts,poseAssertions.ts}`, `tests/e2e/poses.e2e.test.ts`, `tests/e2e/tier1_features.e2e.test.ts`, `tests/e2e/render-poses.py`, `tests/e2e/run-e2e.mjs`, `TEST_INFRA.md`, `TEST_READY.md` (R2-F8) | none | PLANNED |
| M2-Kuro | Kuro Pose & Movement Overhaul | `src/game/poses/kuroPoses.ts` (R2-F3) | M1 | PLANNED |
| M2-Raijin | Raijin Pose & Movement Overhaul | `src/game/poses/raijinPoses.ts` (R2-F4) | M1 | PLANNED |
| M2-Kagura | Kagura Pose & Movement Overhaul | `src/game/poses/kaguraPoses.ts` (R2-F5) | M1 | PLANNED |
| M2-Zero | Zero Pose & Movement Overhaul | `src/game/poses/zeroPoses.ts` (R2-F6) | M1 | PLANNED |
| M2-Aether | Aether Pose & Movement Overhaul | `src/game/poses/aetherPoses.ts` (R2-F7) | M1 | PLANNED |
| M3 | Final Integration, Visual Check, Tier 5 & Build | Full `--with-unit --tier=all` + pose suite, 5×7 PNG visual inspection, Tier 5 adversarial hardening, `tsc --noEmit` + `vite build` + `dist/` sync (R2-F9) | M1, E2E, M2-Kuro, M2-Raijin, M2-Kagura, M2-Zero, M2-Aether | PLANNED |

## Interface Contracts

### `src/game/poses/types.ts` ↔ `poseMath.ts`, `<char>Poses.ts`, `StickmanRenderer.ts`
- `export type BasicPoseName = 'idle' | 'run' | 'brake_skid' | 'jump' | 'fall' | 'land' | 'dash' | 'parry';`
- `export interface PoseContext { pose: BasicPoseName; t: number; walkPhase: number; vx?: number; vy?: number; awakened?: boolean; }`
- `export interface PoseDraft { hip: Vec2; torsoLean: number; spineBend?: number; headTilt?: number; footL: Vec2; footR: Vec2; handL: Vec2; handR: Vec2; weaponAngle: number; kneeBendL?: 1 | -1; kneeBendR?: 1 | -1; elbowBendL?: 1 | -1; elbowBendR?: 1 | -1; motionArc?: { x: number; y: number; r: number; sa: number; ea: number }; }`
- `export type CharacterPoseModule = (ctx: PoseContext) => PoseDraft;`

### `src/game/StickmanRenderer.ts` ↔ `Player.ts` & Tests
- `StickPoseName` includes `'land'`.
- `StickmanRenderOptions` adds optional `characterId?: CharacterId; vx?: number; vy?: number; awakened?: boolean;` and `'astral_halo'` in `headGear`.
- `export function computeStickmanSkeleton(pose: StickPoseName, t: number, walkPhase: number, characterId?: CharacterId, extra?: { vx?: number; vy?: number; awakened?: boolean }): SkeletonJoints` (backward-compatible 3-arg call for `Enemy.ts`, `Boss.ts`, and `rules.test.ts`).

### Quantitative Pose & Compatibility Invariants (Mandatory for ALL 5 Characters)
1. **Finite & Bounded**: Every joint `(x, y)` and `weaponAngle` finite; `dist(hip, footL/R) <= 51.5`; `dist(shoulderL/R, handL/R) <= 37.5`.
2. **Non-Rón-Rén Posture**:
   - `run`: Peak/mean `torsoLean >= 0.48` rad (~27.5°+, derived via `atan2(neck.x - hip.x, hip.y - neck.y)`); horizontal stride span `max(|footR.x - footL.x|) >= 50px` across cycle, with alternating foot lift (`min(foot.y) < -14`) and ground plant (`max(foot.y) === 0`).
   - `dash`: `torsoLean >= 0.72` rad (~41°+); `dash.hip.y >= idle.hip.y + 6` (lower COG than idle, since floor is `y=0` and upward is negative); `dash.hip.x > idle.hip.x` (required by `rules.test.ts:195`).
   - `land`: Peak compression (`t ∈ [0.02, 0.08]`) has `land.hip.y >= idle.hip.y + 7` (clearly lower COG than idle) and rebounds cleanly toward idle height by `t >= 0.14`.
   - `parry`: Grounded wide stance (`|footR.x - footL.x| >= 40px`), `parry.hip.y >= idle.hip.y + 2` (lower/braced than idle), forward-committed guard (`torsoLean >= 0.05` or upright-forward braced, not leaning timidly backward).
3. **No Inverted Joints**: Knees bend forward (`knee.x >= (hip.x + foot.x) * 0.5 - 3` in grounded/running poses, consistent with `bendDir = -1`); elbows resolve naturally via `resolveElbowBendDir` with no sudden frame-to-frame flip inversions.

## Code Layout (Strict Exclusive Write Ownership)
- **M1**: `src/game/poses/types.ts`, `src/game/poses/poseMath.ts`, `src/game/poses/index.ts`, initial `src/game/poses/*Poses.ts` scaffolds, `src/game/animation.ts`, `src/game/StickmanRenderer.ts`, `src/game/Player.ts`, `src/game/characters.ts`, `src/game/rules.test.ts`
- **E2E**: `tests/e2e/helpers/testHarness.ts`, `tests/e2e/helpers/poseAssertions.ts`, `tests/e2e/poses.e2e.test.ts`, `tests/e2e/tier1_features.e2e.test.ts`, `tests/e2e/render-poses.py`, `tests/e2e/run-e2e.mjs`, `TEST_INFRA.md`, `TEST_READY.md`
- **M2-Kuro**: `src/game/poses/kuroPoses.ts` ONLY
- **M2-Raijin**: `src/game/poses/raijinPoses.ts` ONLY
- **M2-Kagura**: `src/game/poses/kaguraPoses.ts` ONLY
- **M2-Zero**: `src/game/poses/zeroPoses.ts` ONLY
- **M2-Aether**: `src/game/poses/aetherPoses.ts` ONLY
- **M3**: Verification, visual inspection, Tier 5 adversarial fixes (if any), `scratch/stickman-build` sync + `dist/` build, root `PROJECT.md` sync
