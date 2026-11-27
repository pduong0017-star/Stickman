# BRIEFING — 2026-11-27T03:38:00Z

## Mission
Implement R2 (3-Layer Heaven-Earth Literary Wheel Back-Gear, Multi-Layer Scholar Outfit, Ngọc Tiêu Tiên Bút Weapon & Underfoot Aura) for `mactien:xuan_feng_sage` matching `chrono_sovereign` density and layering depth.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m2_gear
- Original parent: 59a327d2-fb56-416f-91d6-839113d20259
- Milestone: R2 Back-Gear, Outfit, Weapon & Underfoot Aura

## 🔒 Key Constraints
- Exclusive file ownership: ONLY modify `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`, `src/game/StickmanRenderer.ts`, `src/game/renderer/types.ts`.
- In `StickmanRenderer.ts`: ONLY pass `opts.vx ?? 0, opts.vy ?? 0` to `renderWeapon` & `renderSkinBackAttachment`; add `xuan_feng_sage` `skinMap` entry + bespoke underfoot calligraphy/Enso/petal ground aura in `renderDarkInkAura`; add a front-layer depth-sorted slip/pendant hook after `renderHeroHeadGear` if needed. DO NOT modify `computeStickmanSkeleton` attack poses.
- In `types.ts`: ONLY add optional `awakened?: boolean; characterId?: CharacterId;` to `Afterimage`. DO NOT modify `StickPoseName`.
- DO NOT read or modify excluded files: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`. Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- Strictly balanced `ctx.save()` / `ctx.restore()` (use `try { ... } finally { ctx.restore(); }`).
- Palette: Moonlight White (`#f8fafc`, `#f0fdfa`), Jade Teal (`#5eead4`, `#2dd4bf`, `#0d9488`), Pale Gold (`#fde68a`), Ink Wash (`#1e293b`, `#0f172a`), Peach Blossom Pink (`#fda4af`), subtle cinnabar (`#ef4444` / `#dc2626`). STRICTLY NO harsh yellow (`#facc15`, `#eab308`, `#fde047`).

## Current Parent
- Conversation ID: 59a327d2-fb56-416f-91d6-839113d20259
- Updated: 2026-11-27T03:38:00Z

## Change Tracker
- **Files modified**: None yet
- **Build status**: Not run yet
- **Pending issues**: Inspect `chrono_sovereign` and `xuan_feng_sage` in owned files

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: N/A (R2 renderer visuals, tsc --noEmit + static checks)
