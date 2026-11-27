# BRIEFING — 2026-11-25T11:39:20Z

## Mission
Implement Milestone M3 (`Combat, Entities & Lifecycle Integration`) across `Entities.ts`, `Enemy.ts`, `Player.ts`, and `Game.ts` per `explorer_m3_integration/analysis.md`, wiring all 12 `(CharacterId, SkinId)` VFX profiles and hardening R2 lifecycle cleanup while preserving R3 combat determinism.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m3`
- Original parent: `b589790b-28b0-4a60-980a-68ac67599fd4`
- Milestone: M3 (`Combat, Entities & Lifecycle Integration`)

## 🔒 Key Constraints
- Exclusive write ownership ONLY: `src/game/Player.ts`, `src/game/Entities.ts`, `src/game/Game.ts`, `src/game/Enemy.ts`. Do NOT touch any other `src/` or `tests/` files.
- R1: All 12 skins distinctly themed across combat swings, trails, auras, particles, projectiles, pillars, walls, marks, detonations, and cutscenes. Every color on `SkinVfxProfile`/themeColor/Projectile.color must be 6-digit `#rrggbb`.
- R2: `MAX_SLASH_TRAILS = 24`, `MAX_AFTERIMAGES = 24`, bounded eviction, clear in `setCharacter()` & `reset()`, `tickAndPruneVfx(dt)` in `update()` & `updateIdleOnTitle()`, `getActiveVfxCounts()`, no `shadowBlur` in `src/`.
- R3: Zero changes to `ActiveMeleeHitbox` dimensions, timing, damage, controls, or `synergy.ts` math/`kanji`. Preserve enemy/boss defaults.

## Current Parent
- Conversation ID: `b589790b-28b0-4a60-980a-68ac67599fd4`
- Updated: 2026-11-25T11:39:20Z

## Task Summary
- **What to build**: Wire `getSkinVfxProfile` and pooled accent particles into `Entities.ts`, `Enemy.ts`, `Player.ts`, and `Game.ts`; add explicit projectile/pillar themes; harden VFX lifecycle & HUD fingerprint sync.
- **Success criteria**: `rules.test.ts` 17/17 pass; >=50 attack spam & rapid skin-switch lifecycle test passes; 0 `shadowBlur` in `src/`; 0 `color === '#'` in `Entities.ts`; `this.skinId` in `syncHudThrottled`; `tsc --noEmit` & `vite build` exit 0.
- **Interface contracts**: `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` § Interface Contracts, `src/game/skinVfx.ts`, `src/game/StickmanRenderer.ts`, `src/game/UltimateCutscene.ts`.
- **Code layout**: `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` § Code Layout.

## Key Decisions Made
- Starting inspection of target files (`Entities.ts`, `Enemy.ts`, `Player.ts`, `Game.ts`) and M1/M2 contracts (`skinVfx.ts`, `ParticleSystem.ts`, `StickmanRenderer.ts`, `UltimateCutscene.ts`).

## Change Tracker
- **Files modified**: None yet
- **Build status**: Not yet run
- **Pending issues**: Implement M3 across all 4 owned files and run full verification

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: N/A (read-only verification script in `$TMPDIR` only; no `tests/` edits)

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m3/DISPATCH.md` — Dispatch record
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m3/progress.md` — Heartbeat log
