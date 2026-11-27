# BRIEFING — 2026-11-27T03:33:30Z

## Mission
Investigate Scholar 4-Hit Basic-Attack Poses & Multi-Layer Trails (R4) and how `Player.ts`, `animation.ts`, `StickmanRenderer.ts`, `poses/`, `trails.ts`, and `types.ts` work for `chrono_sovereign` vs. `mactien` / `xuan_feng_sage`, plus R4/R5 ownership boundaries.

## 🔒 My Identity
- Archetype: Teamwork Explorer
- Roles: Build, Test & Browser Tooling Explorer (`teamwork_preview_explorer_survey_3`)
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_3`
- Original parent: `b589790b-28b0-4a60-980a-68ac67599fd4`
- Milestone: Phase 0 Survey
- Survey 3 (2026-11-27T03:29:52Z): R4 Poses & Trails Explorer (`teamwork_preview_explorer`), parent `59a327d2-fb56-416f-91d6-839113d20259`

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write reports only to own teamwork folder
- Maintain `progress.md` with `Last visited: <ISO timestamp>`
- Do NOT read or modify excluded files: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`

## Current Parent
- Conversation ID: `59a327d2-fb56-416f-91d6-839113d20259`
- Updated: `2026-11-27T03:29:52Z`

## Investigation State
- **Explored paths**: `ORIGINAL_REQUEST.md`, `DISPATCH.md`, `src/game/poses/{types.ts,index.ts,mactienPoses.ts,chronoPoses.ts,poseMath.ts}`, `src/game/animation.ts`, `src/game/StickmanRenderer.ts`, `src/game/renderer/types.ts`, `src/game/renderer/trails.ts`, `src/game/Player.ts`, `src/game/types.ts`, `src/game/skinVfx.ts`, `src/game/Entities.ts` (Projectile kinds), `src/game/Game.ts` (InkSeal handling).
- **Key findings**:
  - `src/game/poses/` and `src/game/animation.ts` live under `src/game/`, not `src/game/renderer/`. Attack poses (`attack_1..4`, `nodachi_overhead_slam`, etc.) live in `StickmanRenderer.ts:61-784` (`computeStickmanSkeleton`).
  - Neither `PoseContext` (`poses/types.ts:13-20`) nor `computeStickmanSkeleton` (`StickmanRenderer.ts:61-67`) accepts `skinId` yet. `getComboMoveForCharacter` (`animation.ts:469`) already accepts `skinId`, and currently maps `mactien` ground 1..4 to heavy poses (`attack_1`, `attack_2`, `attack_3`, `nodachi_overhead_slam`).
  - `trails.ts` (`xuan_feng_brush`, 2607-2793) currently renders a 2-layer silk ribbon + 3 petals/leaves + optional `静` ring, lacking the 3-layer ink-wash/jade-teal/white-flash structure, 4-point star glints, ink droplets, and `renderSlashMotifOrnament` case (`chrono_sovereign` has full multi-layer ornaments at 2130-2246 and aura at 1079-1177).
  - `Player.ts` triggers `mactien` 4-hit combos at 2203-2207, spawns trails at 2299-2365, and separates basic skin VFX (2605-2637) from awakened melee VFX (2724-2743) and dash echoes (954-1008, 1124-1141).
- **Unexplored areas**: Excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`); full `Entities.ts` InkSeal rendering (belongs to R5).

## Key Decisions Made
- Completed read-only survey of R4 pose & trail architecture and mapped clean file/interface boundaries between R4 and R5.

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_3/DISPATCH.md` — Dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_3/progress.md` — Liveness heartbeat
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_3/handoff.md` — 5-component handoff report for Survey 3
