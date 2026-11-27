# BRIEFING — 2026-11-27T02:46:30Z

## Mission
Investigate Module 2 (`trails.ts`, `animation.ts`, `Entities.ts`, `Player.ts`, `Game.ts`) and Module 1 interfaces (`skinVfx.ts`, `inkStyle.ts`) to design a non-invasive VFX implementation plan for `mactien` mythic skin `xuan_feng_sage` (R2).

## 🔒 My Identity
- Archetype: Explorer (`teamwork_preview_explorer_r6_m2`)
- Roles: Investigation, Synthesis
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m2`
- Original parent: `031751d9-2b0a-4798-9dcb-81f6ba1f37b5`
- Milestone: Module 2 — Soft Brush Trails, Seals & Afterimages

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify any project code.
- DO NOT read or touch: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`.
- DO NOT read entire large files; use `grep_search` + small `view_file` line ranges.
- Never propose `ctx.shadowBlur` in `src/`, never propose `performance.now()` in `src/game/renderer/`, strictly balance `ctx.save()`/`ctx.restore()`.
- Do NOT modify hitboxes, damage, cooldowns, or combat logic.

## Current Parent
- Conversation ID: `031751d9-2b0a-4798-9dcb-81f6ba1f37b5`
- Updated: 2026-11-27T02:46:30Z

## Investigation State
- **Explored paths**:
  - `src/game/renderer/trails.ts` (lines 1-120, 290-380, 1110-1250, 2005-2185, 2480-2650)
  - `src/game/renderer/types.ts` (lines 1-256)
  - `src/game/animation.ts` (lines 160-430, 445-475, 545-710, 925-1030, 1050-1150, 1290-1520)
  - `src/game/poses/mactienPoses.ts` (lines 1-148), `src/game/poses/index.ts`, `src/game/poses/types.ts`
  - `src/game/StickmanRenderer.ts` (lines 1-430, 515-870, 935-990)
  - `src/game/Entities.ts` (grep classes + lines 2479-2666)
  - `src/game/Player.ts` (lines 45-185, 240-295, 535-565, 645-685, 940-1010, 1085-1140, 1290-1315, 1425-1475, 1570-1615, 1695-1720, 1990-2015, 2080-2195, 2225-2295, 2320-2400, 2515-2660, 2730-2927)
  - `src/game/Game.ts` (lines 105-140, 1825-1875, 2035-2165, 3455-3485, 3640-3685, 3910-4125, 4480-4600)
  - `src/game/skinVfx.ts` (lines 1-120, 655-711), `src/game/types.ts` (lines 1-120), `src/game/renderer/inkStyle.ts` (lines 1-120), `src/game/ParticleSystem.ts` (lines 465-495, 995-1030), `src/game/Enemy.ts` (lines 1010-1050), `src/game/rules.test.ts` (lines 190-270)
- **Key findings**:
  - `xuan_feng_sage` is not yet in `src/` (depends on Module 1 adding `'xuan_feng_sage'` to `SkinId` in `src/game/types.ts`).
  - `Entities.ts` does NOT hold `mactien` seals (`inkSeals` live on `Game` in `Game.ts` and `pendingInkSeals` on `Player` in `Player.ts`).
  - `SlashTrailStyle` and `Afterimage` live in `src/game/renderer/types.ts`; adding `'xuan_feng_brush'` and `Afterimage.skinId?: SkinId` enables clean skin branching in `trails.ts`.
  - `getComboMoveForCharacter` (`animation.ts:458`) can take optional 4th param `skinId: SkinId = 'default'` to refine `mactien` `trailStyle` and `slashArcs` angles without touching combat stats.
  - Hardcoded `#f59e0b` / `#ef4444` / `#fde047` colors in `Player.ts` and `Game.ts` (including `renderMacTienDomainBackdrop`, `inkSeals`, awakening, hit VFX) must branch on `skinId === 'xuan_feng_sage'`.
- **Unexplored areas**: None within Module 2 scope.

## Key Decisions Made
- Keep all combat parameters (damage, hitboxes, cooldowns, lungeSpeed, knockX/Y, cancelRatio, duration) untouched.
- Use `style === 'xuan_feng_brush'` / `skinId === 'xuan_feng_sage'` checks so Module 2 is independent of Module 1's `motif` naming choice.

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m2/DISPATCH.md` — Dispatch record
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m2/progress.md` — Liveness heartbeat
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m2/handoff.md` — 5-Component Handoff Report & Module 2 implementation plan
