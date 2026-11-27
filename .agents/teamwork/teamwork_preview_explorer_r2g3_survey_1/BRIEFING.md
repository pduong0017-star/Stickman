# BRIEFING — 2026-11-25T17:45:00Z

## Mission
Phase 0 Survey (Explorer 1 / `r2g3_survey_1`): Investigate Stickman pose, skeleton, IK/FK, animation state transitions, and rendering architecture across all 5 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`), identify root causes of "rón rén" postures, snapping, and broken joints, and design a zero-conflict per-character + shared-math modular architecture.

## 🔒 My Identity
- Archetype: Teamwork explorer (`r2g3_survey_1`)
- Roles: Investigation, Synthesis
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r2g3_survey_1`
- Original parent: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Milestone: Phase 0 Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT modify any source files in `src/` or tests
- Write only to `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r2g3_survey_1`
- Context-mode compliance: never read >400 lines in one `view_file` call

## Current Parent
- Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Updated: `2026-11-25T17:45:00Z`

## Investigation State
- **Explored paths**: All 29 files in `src/` listed; deeply inspected `src/game/types.ts`, `src/game/animation.ts`, `src/game/StickmanRenderer.ts`, `src/game/Player.ts`, `src/game/characters.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Game.ts`, `src/game/synergy.ts`, `src/game/rules.test.ts`, `tests/e2e/run-e2e.mjs`, `tests/e2e/tier1_features.e2e.test.ts`, `tests/e2e/helpers/testHarness.ts`, `tests/e2e/helpers/assertions.ts`.
- **Key findings**:
  1. `computeStickmanSkeleton(pose, t, walkPhase)` ignores `characterId` — all 5 characters share identical `idle`, `run`, `dash`, `jump`, `fall`, `parry` poses, and `land` does not exist (only whole-context `scaleX/scaleY` squashing).
  2. Root causes of "rón rén": upright torso (`idle` 0.1 rad, `run` 0.34 rad, `parry` -0.06 rad), narrow/symmetrical sine stride (`±23px` around `hip.x=3`, `hip.y=-44..-46.2`), `vx > 35` threshold causing slow-motion shuffling, and `dash`/`run` arms overstretching `> 38px` (`dash` `handR` = 70.5px, 185% of arm length) with unclamped IK targets.
  3. `blendSkeleton` linearly lerps intermediate joints (`elbow`, `knee`, `neck`, `head`) in Cartesian space (limb shrinkage mid-transition) and `poseTime` is not reset on `jump->fall`, `fall->land`, `dash->run/idle`, `brake_skid`, or `parry->idle`.
  4. `aether` lacks `astral_halo` rendering in `StickmanRenderer.ts` and falls through to `kuro` in `animation.ts` (`getComboMoveForCharacter`, `getUltimateStyleId`, `getAwakenedVisualProfile`) and `synergy.ts`; `rules.test.ts:140` still asserts `CHARACTER_ORDER.length === 4` (vs 5 in `characters.ts`).
- **Unexplored areas**: None within Phase 0 pose/skeleton/renderer scope.

## Key Decisions Made
- Designed `src/game/poses/` split: `types.ts` + `poseMath.ts` + `index.ts` (shared foundation) and 5 isolated files (`kuroPoses.ts`, `raijinPoses.ts`, `kaguraPoses.ts`, `zeroPoses.ts`, `aetherPoses.ts`) for parallel zero-conflict character authoring.

## Artifact Index
- `DISPATCH.md` — Dispatch log
- `BRIEFING.md` — Persistent working memory
- `progress.md` — Liveness heartbeat & step log
- `handoff.md` — Final 5-component survey report
