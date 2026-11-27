# BRIEFING — 2026-11-25T17:41:00Z

## Mission
Overhaul the entire pose & basic movement animation system (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `guard/parry`) for all 5 characters (`kuro`, `raijin`, `kagura`, `zero`, `aether`) in Anime Fighting / Hyuns Dojo style, assigning dedicated agents per character, with programmatic pose/joint tests, visual render verification, 100% E2E + unit test pass, and clean `vite build` + synced `dist/`.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Level: Project Orchestrator (top-level for Follow-up R2, gen3 recovery start)
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3
- Original parent: Sentinel
- Original parent conversation ID: a2ba595b-599a-49c6-89c3-391d64ac8372

## 🔒 My Workflow
- **Pattern**: Project Pattern (Dual Track: Implementation + E2E/Pose/Visual Testing)
- **Scope document**: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md
- **Iteration config**: 3 Explorers, 1 Worker, 2 Reviewers, 2 Challengers, 1 Forensic Auditor (`teamwork_preview_auditor`)
1. **Decompose**: Phase 0 Survey with 3 parallel Explorers; decompose into clean shared-foundation + dedicated per-character milestones (`kuro`, `raijin`, `kagura`, `zero`, `aether`) + E2E/Pose/Visual Testing Track + Final Integration/Verification Milestone.
2. **Dispatch & Execute**: Delegate milestones to sub-orchestrators (or direct iteration loops where single-cycle) with strict exclusive write ownership and mandatory integrity warning.
3. **On failure**: Retry → Replace → Skip (never skip Auditor) → Redistribute → Redesign.
4. **Succession**: Self-succeed at 16 spawns (when all non-sub-orchestrator subagents complete).
- **Work items**:
  1. Phase 0 Survey (3 parallel Explorers) [done]
  2. Decomposition & Interface Contracts (`PROJECT_R2.md`) [done]
  3. Wave 1: M1 Shared Pose Foundation & Integration + E2E Pose/Visual Suite [done]
  4. Wave 2: 5 Parallel Per-Character Pose Overhauls (Kuro, Raijin, Kagura, Zero, Aether) [done]
  5. Final Integration, Full Test Suite, Visual Check & Production Build (`dist/`) [in-progress]
- **Current phase**: 2B (M3 Integration & Build Sync)
- **Current focus**: `worker_aether_fix` fixing `aether jump->jump` `elbowL` continuity, running full `--with-unit --tier=all` + `--pose --render-poses`, `tsc --noEmit`, `vite build`, and `dist/` sync prior to Final Verification Gate.

## 🔒 Key Constraints
- DISPATCH-ONLY orchestrator: NEVER write/modify source code or run build/test commands directly; only edit `.md` metadata in `.agents/teamwork/`.
- Integrity Mode: `development`. Mandatory integrity warning in every Worker dispatch; Forensic Auditor veto is binary and non-skippable.
- Never reuse a subagent after it delivers its handoff — always spawn fresh.
- User explicitly requested: "Full team — phân chia mỗi agent phụ trách đại tu dáng & chuyển động cho từng nhân vật (Kuro, Raijin, Kagura, Zero, Aether)."
- Must preserve gameplay compatibility (hitboxes, movement speed, combat mechanics, 12+ skins, existing tests).
- Must account for Android execution environment (`$TMPDIR/esbuild_bin`, `/data` scratch for `vite build`, `.nomedia` for PNGs).

## Current Parent
- Conversation ID: a2ba595b-599a-49c6-89c3-391d64ac8372
- Updated: 2026-11-25T17:41:00Z

## Key Decisions Made
- Checked `r2` and `r2_gen2` directories: prior `r2` survey explorers had not produced `handoff.md` and `r2_gen2` was empty, so starting clean Phase 0 Survey with 3 parallel Explorers under `r2_gen3`.
- Confirmed `teamwork_preview_orchestrator` is not an available subagent type, so executing Project Pattern 2B iteration loops directly as Project Orchestrator.
- Created `PROJECT_R2.md` with strict exclusive write ownership across M1, E2E, 5 per-character modules (`src/game/poses/<char>Poses.ts`), and M3.
- Wave 1 completed cleanly: M1 Foundation (`5d2457c1`) passed `rules.test.ts` 17/17 + `tsc` 0 errors + `vite build`; `test_writer_e2e_r2` (`7349b9f1`) aligned 14 skins (`Tier 1/2/3` 100% pass), added `poses.e2e.test.ts` (`10/11`, catching `POSE-P4-03` on Raijin's M1 scaffold), and created `render-poses.py`.
- Wave 2 completed all 5 parallel character workers (`kuro`, `raijin`, `kagura`, `zero`, `aether`); Raijin fixed `parry` + `POSE-P4-03` (`worstLiveDelta=15.72px`), and `poses.e2e.test.ts` surfaced `aether jump->jump step=86` `elbowL` jump (`31.66px`), dispatched to `worker_aether_fix` alongside full build/test sync.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| r2g3_survey_1 | teamwork_preview_explorer | Pose, Skeleton, IK & Renderer Survey | completed | 72b0dba7-13ce-4610-9665-d7b3a2ecfdb5 |
| r2g3_survey_2 | teamwork_preview_explorer | 5 Characters, States & Gameplay Survey | completed | 1afd1684-5f0d-4392-af3b-003d778127cf |
| r2g3_survey_3 | teamwork_preview_explorer | Build, Tests & Visual Pipeline Survey | completed | 1775dd3f-c41f-4e8d-950c-8b0136984529 |
| worker_m1_foundation | teamwork_preview_worker | M1 Shared Pose Foundation & Integration | completed | 5d2457c1-925c-41fe-af37-49aada5bcf92 |
| test_writer_e2e_r2 | teamwork_preview_test_writer | E2E Pose & Visual Render Suite | completed | 7349b9f1-a0c7-4a15-ab2c-b6eb9723239d |
| worker_kuro | teamwork_preview_worker | M2-Kuro Pose & Movement Overhaul | completed | 1b03bd1e-a3e5-4f3d-a56f-d4484e209347 |
| worker_raijin | teamwork_preview_worker | M2-Raijin Pose & Movement Overhaul | completed | 515dbd7e-35a4-4293-9287-7fb989014474 |
| worker_kagura | teamwork_preview_worker | M2-Kagura Pose & Movement Overhaul | completed | a1d37f07-17f8-47be-a267-3557b90850fb |
| worker_zero | teamwork_preview_worker | M2-Zero Pose & Movement Overhaul | completed | 6788ff3f-1168-40c4-b58d-2490a2ab8252 |
| worker_aether | teamwork_preview_worker | M2-Aether Pose & Movement Overhaul | completed | fc3bc394-1102-4db1-8777-a673f0a45802 |
| worker_aether_fix | teamwork_preview_worker | Fix Aether jump continuity + full test/build sync | failed (429 quota) | 668d89b9-c5fa-470c-9c58-bc6b69cb153e |

## Succession Status
- Succession required: no
- Spawn count: 11 / 16
- Pending subagents: none
- Predecessor: none (r2/r2_gen2 incomplete)
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: cb9506f4-9088-4284-adc1-d9197e1f15f9/task-24
- Safety timer: covered by task-24

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` — Authoritative user request (Initial + Follow-up R2)
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/DISPATCH.md` — Incoming dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/progress.md` — Liveness & step checklist
- `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` — Round 1 project architecture & layout
- `/storage/emulated/0/Antigravity/Stickman/TEST_READY.md` — Existing E2E suite status
