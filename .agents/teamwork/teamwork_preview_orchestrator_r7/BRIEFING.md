# BRIEFING — 2026-11-27T03:29:30Z

## Mission
Orchestrate Round 7 comprehensive visual, Domain, Gear/Weapon, 3-Phase Cutscene, Poses/Trails, and Awakened Skill overhaul for Mythic skin `xuan_feng_sage` (`mactien`) matching `chrono_sovereign` quality.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Level: Project Orchestrator (top-level for Round 7)
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7
- Original parent: Sentinel (4f4c79c9-d978-4305-87b2-768a75fb373f)
- Original parent conversation ID: 4f4c79c9-d978-4305-87b2-768a75fb373f

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7/PROJECT.md
1. **Decompose**: Survey with 3 parallel Explorers first, then partition into cleanly non-overlapping file-ownership milestones/work-items (R1 Domain, R2 Gear/Outfit/Weapon, R3 3-Phase Cutscene, R4 Poses & Trails, R5 Awakened Skills).
2. **Dispatch & Execute**: Delegate to sub-orchestrators or run Explorer -> Worker -> Reviewer (x2) -> Challenger (x2) -> Forensic Auditor -> Gate loop.
3. **On failure**: Retry -> Replace -> Redesign -> Retry differently (never skip Forensic Auditor).
4. **Succession**: Self-succeed at 16 spawns (write soft handoff.md, update BRIEFING/progress, kill crons, spawn successor with parent 4f4c79c9-d978-4305-87b2-768a75fb373f).
- **Work items**:
  1. Survey (3 Explorers mapping `chrono_sovereign` & `xuan_feng_sage`) [done]
  2. M1 (R1): Full-Screen Domain (`LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU`) [in-progress]
  3. M2 (R2): High-Density Back-Gear, Outfit & Weapon [in-progress]
  4. M3 (R3): High-Contrast 3-Phase Ultimate Cutscene [in-progress]
  5. M4 (R4): Scholar 4-Hit Poses & 3-Layer Trails [pending]
  6. M5 (R5): Awakened Skill Transformations [pending]
- **Current phase**: 2A (Decompose & Delegate — Wave 1)
- **Current focus**: Wave 1 parallel sub-orchestrators (M1, M2, M3)

## 🔒 Key Constraints
- Reference `chrono_sovereign` FIRST before editing any file.
- NO minimalist/flat visuals.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`.
- Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- Strictly balanced `ctx.save()` / `ctx.restore()` in every render function.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 4f4c79c9-d978-4305-87b2-768a75fb373f
- Updated: 2026-11-27T03:36:30Z

## Key Decisions Made
- Initialized Round 7 Project Orchestrator working directory and completed 3-Explorer Survey phase.
- Decomposed into 5 strictly file-disjoint milestones across Wave 1 (M1, M2, M3) and Wave 2 (M4, M5), recorded in PROJECT.md.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | Survey: Domain & Awakened Skills | completed | aba78607-7ae7-402a-a5ba-feff9952878d |
| explorer_survey_2 | teamwork_preview_explorer | Survey: Gear, Weapon & Cutscene | completed | 74120c74-2a2c-4371-9853-fb7d94003d8f |
| explorer_survey_3 | teamwork_preview_explorer | Survey: Poses, Trails & Player | completed | 7508f6e9-e6e9-4f77-86f2-26fe7dc13a33 |
| worker_m1_domain | teamwork_preview_worker | M1: Full-Screen Domain | in-progress | c42284d5-7910-4c5a-9a76-e2a99a6892cb |
| worker_m2_gear | teamwork_preview_worker | M2: Gear, Outfit, Weapon & Aura | in-progress | db472fa1-76c2-4a89-b496-c68b9463b2f5 |
| worker_m3_cutscene | teamwork_preview_worker | M3: 3-Phase Dark Cutscene | completed | 21f3a352-e0ca-467b-8e28-b844dcc6cfe6 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: c42284d5-7910-4c5a-9a76-e2a99a6892cb, db472fa1-76c2-4a89-b496-c68b9463b2f5, 21f3a352-e0ca-467b-8e28-b844dcc6cfe6
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 59a327d2-fb56-416f-91d6-839113d20259/task-9
- Safety timer: covered by 10-min heartbeat cron
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` — Authoritative user request
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7/DISPATCH.md` — Dispatch record
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7/progress.md` — Liveness heartbeat & iteration tracking
