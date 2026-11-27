# BRIEFING — 2026-11-26T11:30:00Z

## Mission
Implement Milestone M2A: Domain Expansion Arena BG (`PeriodicTableBG.ts`), HUD (`types.ts`, `App.tsx`, `GameHUD.tsx`), `MirrorRift` & `'mirror_shard'` projectile (`Entities.ts`), and `UltimateCutscene.ts` inkStyle fix.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r4_m2a
- Original parent: c45a6256-a6e6-4432-a72d-ac8e535e61ed
- Milestone: M2A (R3 & R4 Foundation)

## 🔒 Key Constraints
- Exclusive File Ownership: ONLY edit `src/game/PeriodicTableBG.ts`, `src/game/Entities.ts`, `src/game/types.ts`, `src/App.tsx`, `src/components/GameHUD.tsx`, `src/game/UltimateCutscene.ts`.
- Do NOT modify `Game.ts`, `Player.ts`, `rules.ts`, `rules.test.ts`, or `src/game/renderer/*`.
- Do NOT modify `/data/user/0/com.agy/files/stickman-build/src` during parallel Wave 1.
- Strict R5: ZERO `ctx.shadowBlur`, `try { ... } finally { ctx.restore(); }` on every `ctx.save()`, `finiteOr()` & `colorWithAlpha()` from `./renderer/inkStyle`.

## Current Parent
- Conversation ID: c45a6256-a6e6-4432-a72d-ac8e535e61ed
- Updated: 2026-11-26T11:30:00Z

## Task Summary
- **What to build**: Ma Kính Hư Không Giới domain expansion rendering in `PeriodicTableBG.ts`, `MirrorRift` upgrades + `'mirror_shard'` projectile in `Entities.ts`, `HudSnapshot` domain fields & UI badge in `types.ts`/`App.tsx`/`GameHUD.tsx`, `UltimateCutscene.ts` `colorWithAlpha` & `try/finally` fix.
- **Success criteria**: All met and verified.
- **Interface contracts**: Verified against `R4_PLAN.md`.
- **Code layout**: `/storage/emulated/0/Antigravity/Stickman/src/`

## Change Tracker
- **Files modified**:
  - `src/game/PeriodicTableBG.ts` — Added `domainBlend`, `resetDomain()`, `getDomainBlend()`, 3rd arg `domainActive = false` on `update()`, `renderDomainScreenBackdrop()`, and `renderDomainWorld()` with Periodic Table suppression (`1 - domainBlend`, skipped when `domainBlend > 0.9`).
  - `src/game/Entities.ts` — Added `'mirror_shard'` to `ProjectileKind` + faceted shard renderer; extended `MirrorRift` with `lastHitboxId`, `warpCooldown`, `domainEmpowered`, `getEffectiveRadius()`, `getDamageMultiplier()`, `try/finally` `save/restore`, and empowered crown/resonance/fracture aura.
  - `src/game/types.ts` — Added optional `domainActive?: boolean; domainTimeLeft?: number;` to `HudSnapshot`.
  - `src/App.tsx` — Initialized `domainActive: false, domainTimeLeft: 0` in `INITIAL_HUD`.
  - `src/components/GameHUD.tsx` — Added `LÃNH ĐỊA: MA KÍNH HƯ KHÔNG` banner/timer badge when `hud.domainActive` is true.
  - `src/game/UltimateCutscene.ts` — Imported `colorWithAlpha` from `./renderer/inkStyle`, replaced `${primary}99` / `${secondary}88`, wrapped `renderMirrorShatter` `ctx.save()` calls in `try/finally`.
- **Build status**: `rules.test.ts` 17/17 pass; headless `tsx` `MockCanvasElement` pass; `GameHUD.tsx` `tsx` import pass; static `shadowBlur` count = 0.
- **Pending issues**: None for M2A; M2B (`Game.ts`, `Player.ts`) will wire `domainActive`, `MirrorRift` interactions, and `HudSnapshot` population.

## Quality Status
- **Build/test result**: PASS (17/17 `rules.test.ts` + headless `MockCanvasElement` M2A check)
- **Lint status**: Static `shadowBlur` check = 0 hits in `src/`; `GameHUD.tsx` parses/imports cleanly via `tsx`
- **Tests added/modified**: None (test files reserved for E2E worker)

## Key Decisions Made
- Crossfade Ma Kính Hư Không Giới cleanly via `domainBlend` in `[0, 1]` without mutating `this.stageTheme`, fading normal stage/Periodic Table by `(1 - domainBlend)` and skipping Periodic Table at `domainBlend > 0.9`.
- Used `colorWithAlpha` & `finiteOr` everywhere in new Canvas 2D code and wrapped every `ctx.save()` in `try { ... } finally { ctx.restore(); }`.

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r4_m2a/DISPATCH.md` — dispatch log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r4_m2a/progress.md` — heartbeat log
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r4_m2a/handoff.md` — 5-component handoff report
