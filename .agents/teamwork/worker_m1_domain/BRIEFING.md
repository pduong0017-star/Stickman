# BRIEFING — 2026-11-27T03:49:00Z

## Mission
Implement R1: Full-Screen Domain ("LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU") for `mactien:xuan_feng_sage` matching `chrono_sovereign`'s `Tháp Đồng Hồ Cổ Đại` architecture across `types.ts`, `GameHUD.tsx`, `PeriodicTableBG.ts`, and `Game.ts`.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m1_domain
- Original parent: 59a327d2-fb56-416f-91d6-839113d20259
- Milestone: R1 Full-Screen Domain (xuan_feng_sage)

## 🔒 Key Constraints
- Exclusive file ownership: ONLY modify `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, `src/game/Game.ts` (Domain triggers/lifecycle & `mactienDomainBlend` gating only; DO NOT modify `inkSeals` rendering/detonation or hit Hanzi flashes).
- DO NOT read or modify excluded files: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`.
- Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- Strictly balanced `ctx.save()` / `ctx.restore()` (use `try { ... } finally { ctx.restore(); }`).
- Verify `tsc --noEmit` from `/data/user/0/com.agy/files/stickman-build` passes with 0 errors.

## Current Parent
- Conversation ID: 59a327d2-fb56-416f-91d6-839113d20259
- Updated: 2026-11-27T03:49:00Z

## Task Summary
- **What to build**: Full-screen Domain `'xuan_feng'` (`LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU`) triggered on `xuan_feng_sage` Awaken (12.5s) and Ultimate (10.0s / 12.5s overdrive), with HUD badge, screen backdrop, and world arena.
- **Success criteria**: Architecture 1:1 parity with `chrono_sovereign`, clean domain reset on character/skin/mode/title transitions, `mactienDomainBlend` gated away from `xuan_feng_sage`, 0 TS errors in owned files, 0 `shadowBlur`, balanced `save/restore`.
- **Interface contracts**: `DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng'` in `src/game/types.ts`.
- **Code layout**: `/storage/emulated/0/Antigravity/Stickman/src` (symlinked into `/data/user/0/com.agy/files/stickman-build`).

## Key Decisions Made
- Inspected `chrono_sovereign` in `PeriodicTableBG.ts`, `Game.ts`, `GameHUD.tsx`, and `types.ts` before editing.
- Gated `mactienDomainBlend` to `this.characterId === 'mactien' && this.skinId !== 'xuan_feng_sage' && this.player.awakened` and reset `mactienDomainBlend = 0` on title/mode/character/skin transitions so `mactien:default` retains its overlay while `xuan_feng_sage` uses `PeriodicTableBG`'s full-screen Domain without stacking.

## Change Tracker
- **Files modified**:
  - `src/game/types.ts`: Added `'xuan_feng'` to `DomainKind`.
  - `src/components/GameHUD.tsx`: Added `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU` HUD badge styling (`#071112`, border `#5eead4`, title `#f0fdfa`/`#5eead4`, timer `#fde68a`).
  - `src/game/PeriodicTableBG.ts`: Added `xuanFengDomainBlend`, `getXuanFengDomainBlend()`, `renderXuanFengDomainScreenBackdrop()`, and `renderXuanFengDomainWorld()`.
  - `src/game/Game.ts`: Added `isXuanFengDomainOwner()`, `'xuan_feng'` in `getDomainOwnerKind()`, Awaken (`12.5s`) and Ultimate `onKanjiImpact` (`10.0s`/`12.5s`) + `onComplete` triggers, and `mactienDomainBlend` gating/resets.
- **Build status**: `tsc --noEmit` reported 0 errors in any modified/owned file (24 pre-existing errors only in untouched `chronoPoses.ts` and `tests/e2e/*`).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: `tsc --noEmit` clean for all owned files; `ctx.save()`/`ctx.restore()` balanced (`44/44` in `PeriodicTableBG.ts`, `17/17` in `Game.ts`).
- **Lint status**: 0 `shadowBlur` assignments in `src/`; 0 `performance.now()` in `src/game/renderer/` and `PeriodicTableBG.ts`.
- **Tests added/modified**: None (excluded `tests/`).

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m1_domain/progress.md` — liveness heartbeat and step tracker
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m1_domain/handoff.md` — final 5-component handoff report
