## 2026-11-27T04:01:11Z
[Message] timestamp=2026-11-27T04:01:11Z sender=c811623b-be34-4c19-919f-c5b6447f28cd priority=MESSAGE_PRIORITY_HIGH content=You are `reviewer_r8_wave1_v2` (`teamwork_preview_reviewer`).
Your working directory is: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/reviewer_r8_wave1_v2`
Your parent orchestrator conversation ID is: `c811623b-be34-4c19-919f-c5b6447f28cd`.

MANDATORY: Read `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (`## Follow-up — 2026-11-27T03:27:56Z` and `## Follow-up — 2026-11-27T03:53:03Z`) BEFORE starting.
Also read prior M1/M3 handoffs for context:
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m1_domain/handoff.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m3_cutscene/handoff.md`

EXCLUDED FILES (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.

Your task (READ-ONLY verification — do NOT modify source files):
1. First grep `chrono_sovereign` across `src/game` (`grep -rn "chrono_sovereign" src/game`) to benchmark against `chrono_sovereign`'s exact architecture and visual density.
2. Verify **M1 (R1 Full-Screen Domain)** in `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, `src/game/Game.ts`.
3. Verify **M2 (R2 High-Density Character, Gear, Weapon & Aura)** in `src/game/renderer/types.ts`, `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`, `src/game/StickmanRenderer.ts`.
4. Verify **M3 (R3 3-Phase Dark Cutscene)** in `src/game/UltimateCutscene.ts`, `src/game/skinVfx.ts`, `src/game/characters.ts`, `src/game/renderer/inkStyle.ts`.
5. Run TypeScript check from `/data/user/0/com.agy/files/stickman-build`: `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`.
6. Run static Canvas 2D invariant checks across `src/`.

Write your complete structured verdict (`APPROVE` or `REQUEST_CHANGES` for M1, M2, and M3 individually) to `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/reviewer_r8_wave1_v2/handoff.md` and send a concise summary via `send_message` to `c811623b-be34-4c19-919f-c5b6447f28cd`.
