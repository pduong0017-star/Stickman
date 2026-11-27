# BRIEFING — 2026-11-27T04:07:35Z

## Mission
Implement M4 (R4: Scholar upright basic-attack poses, `xuan_feng_sage` motionArc, 3-layer `xuan_feng_brush` trails, `xuan_feng_calligraphy` ornaments & swing aura, white-robed mist/petal-dissolving afterimages), fix 15 pre-existing TS errors in `chronoPoses.ts`, and fix `(opts.vx ?? 0) * facing` in `StickmanRenderer.ts`.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r8_m4_poses_trails
- Original parent: c811623b-be34-4c19-919f-c5b6447f28cd
- Milestone: M4 (R4 Refined Scholar Basic-Attack Poses & 3-Layer Trails)

## 🔒 Key Constraints
- Exclusive file ownership (5 files ONLY): `src/game/poses/chronoPoses.ts`, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/renderer/trails.ts`.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`.
- Zero `performance.now()` in `src/game/renderer/` (and `UltimateCutscene.ts`).
- Strictly balanced `ctx.save()` / `ctx.restore()` (using `try { ... } finally { ctx.restore(); }`) in every modified render function.
- Zero harsh yellow (`#facc15` / `#eab308` / `#fde047`).
- Reference `chrono_sovereign` FIRST before editing any file.

## Current Parent
- Conversation ID: c811623b-be34-4c19-919f-c5b6447f28cd
- Updated: 2026-11-27T04:07:35Z

## Task Summary
- **What to build**: M4 scholar poses, motionArc, combo pose assignment, 3-layer trails, motif ornament, swing aura, mist/petal afterimages, chronoPoses TS fixes, StickmanRenderer facing*vx fix.
- **Success criteria**: `tsc --noEmit` 0 errors in `src/`, all Canvas 2D invariants pass, zero harsh yellow, genuine high-density scholar rendering.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending investigation
- **Pending issues**: 15 pre-existing TS errors in `chronoPoses.ts`

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: N/A

## Key Decisions Made
- Starting investigation of `chrono_sovereign` references and target files.

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/explorer_r8_wave2/handoff.md` — Wave 2 blueprint
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/reviewer_r8_wave1_v2/handoff.md` — Wave 1 review findings
