# BRIEFING — 2026-11-27T04:07:35Z

## Mission
Implement M5 (R5: Distinct Awakened Skill Transformations for `mactien:xuan_feng_sage`) across `Entities.ts`, `Player.ts`, and `Game.ts`.

## 🔒 My Identity
- Archetype: `teamwork_preview_worker`
- Roles: implementer, qa, specialist
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r8_m5_awakened`
- Original parent: `c811623b-be34-4c19-919f-c5b6447f28cd`
- Milestone: M5 (Wave 2 — R5 Awakened Skill Transformations)

## 🔒 Key Constraints
- Exclusive file ownership: ONLY edit `src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts`.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Reference `chrono_sovereign` FIRST before editing any file.
- Zero `ctx.shadowBlur` in `src/`.
- Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- Strictly balanced `ctx.save()` / `ctx.restore()` (via `try { ... } finally { ctx.restore(); }`) in every modified render function.
- STRICTLY NO harsh yellow (`#facc15`/`#eab308`/`#fde047`); use Moonlight White (`#f8fafc`/`#f0fdfa`), Jade Teal (`#5eead4`/`#2dd4bf`), Pale Gold (`#fde68a`), Peach Blossom (`#fda4af`), and Ink (`#1e293b`/`#070d12`).
- Do NOT break hitboxes/cooldowns/damage of non-`xuan_feng_sage` characters or default `mactien`.

## Current Parent
- Conversation ID: `c811623b-be34-4c19-919f-c5b6447f28cd`
- Updated: 2026-11-27T04:07:35Z

## Task Summary
- **What to build**:
  1. `Entities.ts`: `'bamboo_blade' | 'jade_seal_wave'` ProjectileKind + Ink-Wash Canvas 2D renders.
  2. `Player.ts`: `Afterimage` `awakened`/`characterId` metadata, Awakened Dash dissolving petals/mist, Hit 3 2x `'bamboo_blade'` darting slips, Hit 4 rotating `'jade_seal_wave'` pushback ring, Awakened basic attacks (`Ngự Bút Thiên Hành`: 2-3 elevated diagonal `'bamboo_blade'` slashes + `+24` reach bonus), Awakened `[U]` `'VĂN THÁNH TRẤN THIÊN TRẬN!'` text.
  3. `Game.ts`: Glowing Hanzi impact flashes + `'mactien'` ink mark + piercing `'bamboo_blade'`/`'jade_seal_wave'`, Awakened `[U]` `Văn Thánh Trấn Thiên Trận` update (rain bamboo slips + spring wind + ink cross-slash) and render (giant 3-tier Formation Ring + 4 orbiting sub-seals + petals + 4-point star glints).
- **Success criteria**: `tsc --noEmit` 0 errors in `Entities.ts`, `Player.ts`, `Game.ts`; 0 `shadowBlur`; balanced `save/restore`.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Not yet run
- **Pending issues**: Investigating `chrono_sovereign` & target blocks

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: N/A

## Key Decisions Made
- Following Wave 2 blueprint (`explorer_r8_wave2/handoff.md`) with zero file overlap against M4.

## Artifact Index
- `.agents/teamwork/worker_r8_m5_awakened/progress.md` — Liveness heartbeat & progress
- `.agents/teamwork/worker_r8_m5_awakened/handoff.md` — Final 5-component handoff report
