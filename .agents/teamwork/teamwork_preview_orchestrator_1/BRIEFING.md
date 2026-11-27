# BRIEFING — 2026-11-25T11:10:00Z

## Mission
Upgrade the Stickman (Vite/TypeScript) game's attack visual effects system (slash trails, weapon trails, aura, particles) so every existing skin has distinct, themed, performant, lifecycle-managed VFX, verified by build/typecheck, automated uniqueness & >=50-attack cleanup tests, zero console errors, and visual screenshot verification.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Level: Project Orchestrator (top-level)
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_1
- Project root: /storage/emulated/0/Antigravity/Stickman
- Original parent: sentinel
- Original parent conversation ID: 426b8f37-bbe8-469a-b4be-8f41f5997eac

## 🔒 My Workflow
- **Pattern**: Project Pattern (Direct Iteration Loop with Dual Track: Implementation + E2E Testing)
- **Scope document**: /storage/emulated/0/Antigravity/Stickman/PROJECT.md
- **Iteration Config**: 3 Explorers/Spec Miners, Workers (M1, M2, M3 with disjoint write ownership) + Test Writer (E2E Track), 2 Reviewers, 2 Challengers, 1 Forensic Auditor (`teamwork_preview_auditor`) per iteration loop; max 32 iterations.
1. **Survey (Phase 0)**: Completed with 3 Explorers (`survey_1`, `survey_2`, `survey_3`); merged into `PROJECT.md`.
2. **Direct (iteration loop)**:
   - Note: `invoke_subagent("self")` is unsupported in this runtime; execute Project Pattern directly via the full Iteration Loop (`3` Explorers/Spec Miners → Workers & E2E Test Writer → `2` Reviewers → `2` Challengers → `1` Forensic Auditor → Gate in `GATE_STATUS.md`).
   - Always include `ORIGINAL_REQUEST.md` path and verbatim integrity warning for workers/test_writer.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical; NEVER skip Forensic Auditor)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition in PROJECT.md
4. **Succession**: Self-succeed at 16 spawns (when all pending subagents complete), writing soft `handoff.md`, killing crons, spawning successor if needed (note: if `self` is disallowed, record constraint and check available options).
- **Work items**:
  1. Phase 0 Survey (3 Explorers) [done]
  2. PROJECT.md Architecture & Decomposition [done]
  3. Iteration 1: Design Explorers/Spec Miner -> M1 & E2E -> M2 -> M3 -> Reviewers -> Challengers -> Auditor [in-progress]
  4. Final Build, Visual PNG Inspection, Tier 5 Adversarial Hardening & Victory Gate [pending]
- **Current phase**: 2B (Iteration Loop — Iteration 1)
- **Current focus**: Dispatching 3 Explorers/Spec Miners for exact M1/M2/M3 patch specs & E2E Tier 1-4 test matrix

## 🔒 Key Constraints
- DISPATCH-ONLY orchestrator: NEVER read/write source code files directly or run build/test commands directly; delegate all technical investigation, coding, testing, and verification to subagents.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Forensic Auditor (`teamwork_preview_auditor`) is NON-SKIPPABLE and has binary veto on INTEGRITY VIOLATION.
- Integrity mode: `development`.
- Every subagent dispatch MUST include `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`.

## Current Parent
- Conversation ID: 426b8f37-bbe8-469a-b4be-8f41f5997eac
- Updated: 2026-11-25T11:10:00Z

## Key Decisions Made
- Starting Phase 0 Survey with 3 parallel Explorers covering: (1) Skin definitions, themes, UI/selection & asset/color specs; (2) Combat, attack animations, weapon/slash trail & VFX/particle rendering architecture; (3) Project tooling, Vite/TS config, test runners, Playwright/browser capabilities & runtime setup.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| survey_1 | teamwork_preview_explorer | Phase 0 Survey: Skins & UI | completed | 40bbe3d4-e217-4cea-b3bc-caae24471bf0 |
| survey_2 | teamwork_preview_explorer | Phase 0 Survey: Combat & VFX | completed | ab014f7c-7f54-4b13-b1ec-ccab4f130cca |
| survey_3 | teamwork_preview_explorer | Phase 0 Survey: Build, Test & Tooling | completed | 5795bd31-c7da-4506-aad5-6d80d4ab8cbb |
| explorer_m1_m2_design | teamwork_preview_explorer | Iter 1: M1/M2 VFX Design Spec | completed | 1d73d194-41d6-48ea-98ca-78f24131e62b |
| explorer_m3_integration | teamwork_preview_explorer | Iter 1: M3 Integration & Lifecycle | completed | 1c81ea82-733c-43a6-b57d-c86eff44ba71 |
| spec_miner_e2e | teamwork_preview_spec_miner | Iter 1: E2E & Visual Spec | completed | a4b5b01b-7715-42da-b246-541263b77638 |
| worker_m1 | teamwork_preview_worker | M1: Skin VFX Registry & Particles | completed | eb1bd7ba-e08a-457e-8441-13da918f7817 |
| test_writer_e2e | teamwork_preview_test_writer | E2E: 4-Tier Suite & Visual Render | completed | accbec14-caa3-45e1-abb3-3b19cf33cbb9 |
| worker_m2 | teamwork_preview_worker | M2: Renderer & Cutscene VFX | completed | 009253ff-9d0b-4869-a98b-4ebe99fe57d4 |
| worker_m3 | teamwork_preview_worker | M3: Combat, Entities & Lifecycle | in-progress | 236e3522-158b-4fae-b9ff-0e77df0c9882 |

## Succession Status
- Succession required: no
- Spawn count: 10 / 16
- Pending subagents: 236e3522-158b-4fae-b9ff-0e77df0c9882
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: b589790b-28b0-4a60-980a-68ac67599fd4/task-12
- Safety timer: covered by heartbeat cron

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` — immutable user request
- `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` — architecture, feature inventory, milestones, interface contracts, code layout
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_1/DISPATCH.md` — dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_1/progress.md` — liveness & state checkpoint
