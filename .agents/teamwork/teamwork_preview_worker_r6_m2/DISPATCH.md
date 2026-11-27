## 2026-11-27T02:47:50Z

You are `worker_r6_m2` (`teamwork_preview_worker`), implementing **Module 2 — Soft Brush Trails, Seals & Afterimages** for mythic skin `xuan_feng_sage` ("Xuân Phong Văn Thánh") on character `mactien`.
Working directory (write `progress.md`, `handoff.md` ONLY here): `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_worker_r6_m2`
Parent conversation ID: `031751d9-2b0a-4798-9dcb-81f6ba1f37b5`

### Exclusive Write Ownership
1. `src/game/renderer/types.ts`
2. `src/game/renderer/trails.ts`
3. `src/game/animation.ts`
4. `src/game/Player.ts` (only `mactien` VFX/trail/afterimage/seal-metadata lines)
5. `src/game/Game.ts` (only `inkSeals` `skinId` + seal render/burst VFX + `renderMacTienDomainBackdrop` + `mactien` ult VFX)

### Key Constraints
- DO NOT read or modify: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`, `Entities.ts`, M1/M3 files.
- DO NOT modify hitboxes, damage, cooldowns, or combat logic.
- DO NOT run E2E tests or open a browser.
- Zero `ctx.shadowBlur` in `src/`. Zero `performance.now()` in `src/game/renderer/`. Balanced `ctx.save()`/`ctx.restore()` and `ctx.setLineDash([])` inside `try ... finally`.
