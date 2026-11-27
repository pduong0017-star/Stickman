# BRIEFING — 2026-11-25T17:35:00Z

## Mission
Overhaul the entire pose & basic movement animation system (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `guard/parry`) for all 5 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`) in Anime Fighting / Hyuns Dojo style, with dedicated per-character assignment, programmatic pose/joint tests, visual render verification, 100% E2E + unit test pass, and clean `vite build` + `dist/`.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Level: Project Orchestrator (top-level for Follow-up R2)
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2
- Original parent: Sentinel
- Original parent conversation ID: a2ba595b-599a-49c6-89c3-391d64ac8372

## 🔒 My Workflow
- **Pattern**: Project Pattern (Dual Track: Implementation + E2E/Visual Verification)
- **Scope document**: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2/PROJECT_R2.md (and update root PROJECT.md if appropriate)
- **Iteration config**: 3 Explorers, 1 Worker (per milestone/character as decomposed), 2 Reviewers, 2 Challengers, 1 Forensic Auditor (`teamwork_preview_auditor`)
1. **Decompose**: Phase 0 Survey with 3 parallel Explorers; decompose into clean per-character & shared-foundation/testing milestones so each character (`kuro`, `raijin`, `kagura`, `zero`, `aether`) has a dedicated agent/sub-orchestrator or exclusive file/profile ownership, plus E2E/programmatic pose & visual verification track.
2. **Dispatch & Execute**: Delegate milestones to sub-orchestrators (or direct iteration loops if single-cycle) with strict exclusive write ownership and mandatory integrity warning.
3. **On failure**: Retry → Replace → Skip (never skip Auditor) → Redistribute → Redesign.
4. **Succession**: Self-succeed at 16 spawns (when all non-sub-orchestrator subagents complete).
- **Work items**:
  1. Phase 0 Survey (3 Explorers) [in-progress]
  2. Decomposition & Interface Contracts (PROJECT_R2.md) [pending]
  3. Implementation Track (Shared Pose/IK/Transition Foundation + Dedicated Character Overhauls: Kuro, Raijin, Kagura, Zero, Aether) [pending]
  4. E2E & Programmatic/Visual Pose Testing Track [pending]
  5. Final Integration, Full Test Suite, Visual Check & Production Build (`dist/`) [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Phase 0 Survey — spawning 3 parallel Explorers

## 🔒 Key Constraints
- DISPATCH-ONLY orchestrator: NEVER write/modify source code or run build/test commands directly; only edit `.md` metadata in `.agents/teamwork/`.
- Integrity Mode: `development`. Mandatory integrity warning in every Worker dispatch; Forensic Auditor veto is binary and non-skippable.
- Never reuse a subagent after it delivers its handoff — always spawn fresh.
- User explicitly requested: "Full team — phân chia mỗi agent phụ trách đại tu dáng & chuyển động cho từng nhân vật (Kuro, Raijin, Kagura, Zero, Aether)."
- Must preserve gameplay compatibility (hitboxes, movement speed, combat mechanics, 12+ skins, existing tests).
- Must verify Android execution environment (`$TMPDIR/esbuild_bin`, `/data` scratch for `vite build`, `.nomedia` for visual PNGs).

## Current Parent
- Conversation ID: a2ba595b-599a-49c6-89c3-391d64ac8372
- Updated: 2026-11-25T17:35:00Z

## Key Decisions Made
- Initialized R2 Project Orchestrator workspace under `.agents/teamwork/teamwork_preview_orchestrator_r2/`.
- Starting Phase 0 Survey with 3 parallel Explorers before finalizing milestone decomposition and per-character ownership.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| r2_survey_1 | teamwork_preview_explorer | Pose, Skeleton, IK & Renderer Survey | in-progress | 30a142d6-0d91-44a7-b080-bdf7714fd91d |
| r2_survey_2 | teamwork_preview_explorer | Characters, Skins & Gameplay State Survey | in-progress | 89d1a8a4-e5d7-411b-a1b5-d95c66b6751c |
| r2_survey_3 | teamwork_preview_explorer | Build, Tests & Visual Pipeline Survey | in-progress | 89738205-3d8a-4ce5-890e-35e42985d36d |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 30a142d6-0d91-44a7-b080-bdf7714fd91d, 89d1a8a4-e5d7-411b-a1b5-d95c66b6751c, 89738205-3d8a-4ce5-890e-35e42985d36d
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 24254a4e-73ab-4e07-97fe-5eb6b41c8b4b/task-9
- Safety timer: covered by 10m heartbeat cron task-9

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` — Authoritative user request (Initial + Follow-up R2)
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2/DISPATCH.md` — Incoming dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2/progress.md` — Liveness & step checklist
- `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` — Prior project architecture & layout
- `/storage/emulated/0/Antigravity/Stickman/TEST_READY.md` — Existing E2E suite status
