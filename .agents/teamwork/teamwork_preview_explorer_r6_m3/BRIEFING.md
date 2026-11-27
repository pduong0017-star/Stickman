# BRIEFING — 2026-11-27T02:44:00Z

## Mission
Investigate `UltimateCutscene.ts` and its `characterId`/`skinId` plumbing to produce a self-contained implementation plan for Module 3 (`xuan_feng_sage` mythic ultimate cutscene for `mactien`).

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Explorer, Synthesizer
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m3
- Original parent: 031751d9-2b0a-4798-9dcb-81f6ba1f37b5
- Milestone: Module 3 — Cinematic Ultimate Cutscene

## 🔒 Key Constraints
- Read-only investigation — do NOT modify any project source files.
- DO NOT read or touch: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`.
- DO NOT read entire large files; grep first and view only relevant sections.
- Invariants: zero `ctx.shadowBlur` in `src/`, zero `performance.now()` in `src/game/renderer/` (and check `UltimateCutscene.ts` timing), balanced `ctx.save()` / `ctx.restore()`.

## Current Parent
- Conversation ID: 031751d9-2b0a-4798-9dcb-81f6ba1f37b5
- Updated: 2026-11-27T02:44:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md` (lines 200-262)
  - `src/game/UltimateCutscene.ts` (lines 1-250, 920-970, 1295-1335, 1605-1840, 2050-2457)
  - `src/game/Game.ts` (lines 3395-3775, 3795-3845, 4265-4290 — `cutscene.start` & `cutscene.renderScreen`)
  - `src/game/renderer/inkStyle.ts` (lines 1-120 — `finiteOr`, `colorWithAlpha`)
  - `src/game/types.ts` (lines 1-65 — `SkinId` union)
  - `src/game/animation.ts` (grep `spring_scroll` lines 152, 171)
- **Key findings**:
  - `Game.ts:3748-3756` already passes `skinId: this.skinId` inside `CutsceneTheme` to `this.cutscene.start(...)`. Module 3 only needs to edit `src/game/UltimateCutscene.ts`.
  - `UltimateCutscene.ts` uses `this.timer` (0 -> `this.duration = 2.7`), `finiteOr`, and `colorWithAlpha`; zero `performance.now()` and zero `ctx.shadowBlur` exist in `UltimateCutscene.ts`.
  - `renderScreen()` dispatches `mactien` / `spring_scroll` at lines 173-174. Adding a dedicated `this.theme.skinId === 'xuan_feng_sage'` branch right before line 173 cleanly isolates the mythic cutscene from the default `renderSpringScroll` dragon/gold scroll.
  - `SkinId` in `src/game/types.ts:11-26` does not yet contain `'xuan_feng_sage'` (owned by Module 1).
- **Unexplored areas**: None within Module 3 scope.

## Key Decisions Made
- Recommend `if (this.theme.skinId === 'xuan_feng_sage')` branch in `UltimateCutscene.ts:renderScreen()` before line 173, calling a new private method `renderXuanFengSageScroll(ctx, viewW, viewH)`.
- Recommend pure `this.timer`-driven deterministic animation (no `Math.random()` in render, no `performance.now()`, no `ctx.shadowBlur`, every `ctx.save()` paired with `try { ... } finally { ctx.restore(); }`).

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m3/DISPATCH.md` — Dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m3/progress.md` — Heartbeat log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m3/handoff.md` — Final 5-component handoff report
