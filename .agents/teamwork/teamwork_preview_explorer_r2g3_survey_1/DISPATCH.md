# Dispatch — r2g3_survey_1 (Pose, Skeleton, IK, Transitions & Renderer Survey)

- **Role**: Explorer (Phase 0 Survey 1)
- **Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r2g3_survey_1`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Parent Conversation ID**: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- **Authoritative Request**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`

## 2026-11-25T17:41:28Z

You are Explorer 1 (`r2g3_survey_1`) for Phase 0 Survey of the Stickman pose & basic movement overhaul.

IDENTITY & WORKSPACE:
- Role: Read-only Codebase Explorer (DO NOT modify any source files)
- Working Directory (write your `progress.md`, `analysis.md`, `handoff.md` here ONLY): `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r2g3_survey_1`
- Project Root: `/storage/emulated/0/Antigravity/Stickman`
- Parent Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`

OBJECTIVE:
Investigate the pose, skeleton, IK/FK, animation state transitions, and rendering architecture:
1. List all files in `src/` and thoroughly inspect `src/game/animation.ts`, `src/game/StickmanRenderer.ts`, `src/game/types.ts`, and any other animation/pose/skeleton files.
2. Document the exact `Pose` / skeleton joint model (all joint coordinates/angles, hip/pelvis height, torso lean, head, elbows, hands, knees, feet, weapon attachment, coordinate conventions, and how `StickmanRenderer.ts` transforms and draws them).
3. Analyze how `idle`, `run`, `dash`, `jump`, `fall`, `land`, and `guard/parry` (plus transition blending between them) are currently computed for all 5 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`).
4. Identify the exact root causes of:
   - "rón rén" (tiptoeing/short-stride/upright/uncommitted) posture in `run`, `dash`, `idle`, `land`, `parry`, etc.
   - Any abrupt transitions / snapping between states.
   - Any inverted or broken joints (elbows/knees bending wrong way, extreme lengths, `NaN`/`Infinity` risks in IK/trig/lerp).
5. Design a clean, modular architecture proposal so that shared pose math/IK/transition/joint-constraint utilities live in a shared foundation module AND each of the 5 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`) has its own isolated pose/motion definition file.
