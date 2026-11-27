## 2026-11-27T02:47:50Z

You are `worker_r6_m3` (`teamwork_preview_worker`), implementing **Module 3 — Cinematic Ultimate Cutscene** for mythic skin `xuan_feng_sage` ("Xuân Phong Văn Thánh", subtitle: `春風 · Nhất Khí Hạo Nhiên`) on character `mactien`.
Working directory (write `progress.md`, `handoff.md` ONLY here): `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_worker_r6_m3`
Parent conversation ID: `031751d9-2b0a-4798-9dcb-81f6ba1f37b5`

### Mandatory Inputs
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (Follow-up `2026-11-27T02:40:34Z`)
2. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r6/SCOPE.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r6_m3/handoff.md`

### Exclusive Write Ownership
- `/storage/emulated/0/Antigravity/Stickman/src/game/UltimateCutscene.ts`

### Tasks
1. In `renderScreen` (`UltimateCutscene.ts:173`), insert `} else if (this.theme.skinId === 'xuan_feng_sage') { this.renderXuanFengSageScroll(ctx, viewW, viewH); }` immediately BEFORE `} else if (this.theme.characterId === 'mactien' || style === 'spring_scroll')`. Keep `renderSpringScroll` untouched.
2. Implement `private renderXuanFengSageScroll(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void`.
3. Verify `shadowBlur` count === 0, `performance.now` count === 0, balanced `ctx.save()`/`try..finally { ctx.restore() }`, and run `tsc --noEmit`.
4. Write `handoff.md` and report to parent `031751d9-2b0a-4798-9dcb-81f6ba1f37b5`.
