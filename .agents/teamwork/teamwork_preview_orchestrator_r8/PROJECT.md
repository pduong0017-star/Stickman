# Project: Xuan Feng Sage (`xuan_feng_sage`) Round 8 Visual & Domain Overhaul

## Architecture
Round 8 resumes Round 7 to complete the Mythic skin `mactien:xuan_feng_sage` (`Xuân Phong Văn Thánh · 春風 · Nhất Khí Hạo Nhiên`) overhaul matching `chrono:chrono_sovereign`:
- **Wave 1 Status (Inherited from Round 7)**:
  - **M1 (R1)**: Full-Screen Domain `"LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU"` (`types.ts`, `GameHUD.tsx`, `PeriodicTableBG.ts`, `Game.ts`) — `worker_m1_domain` reported DONE; verifying in Round 8.
  - **M2 (R2)**: High-Density Back-Gear (`Thiên Địa Văn Luân`), Multi-Layer Scholar Outfit, Ngọc Tiêu Tiên Bút Weapon & Underfoot Aura (`gear.ts`, `weapons.ts`, `StickmanRenderer.ts`, `renderer/types.ts`) — `worker_m2_gear` was interrupted at step 2; must implement & verify.
  - **M3 (R3)**: High-Contrast 3-Phase `#070d12` Dark Ultimate Cutscene (`UltimateCutscene.ts`, `skinVfx.ts`, `characters.ts`, `renderer/inkStyle.ts`) — `worker_m3_cutscene` reported DONE; verifying in Round 8.
- **Wave 2 (To Implement with Disjoint File Ownership)**:
  - **M4 (R4)**: Refined Scholar 4-Hit Upright Basic-Attack Poses & 3-Layer Trails (`src/game/poses/` if used, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/renderer/trails.ts`).
  - **M5 (R5)**: Distinct Awakened Skill Transformations (`src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts`).

## Milestones
| # | Name | Scope (Exclusive File Ownership) | Dependencies | Status |
|---|------|----------------------------------|--------------|--------|
| M1 | Domain: Xuân Phong Văn Miếu | `src/game/types.ts`, `src/components/GameHUD.tsx`, `src/game/PeriodicTableBG.ts`, `src/game/Game.ts` | none | DONE |
| M2 | Gear, Outfit, Weapon & Underfoot Aura | `src/game/renderer/gear.ts`, `src/game/renderer/weapons.ts`, `src/game/StickmanRenderer.ts`, `src/game/renderer/types.ts` | none | DONE |
| M3 | 3-Phase Dark Ultimate Cutscene | `src/game/UltimateCutscene.ts`, `src/game/skinVfx.ts`, `src/game/characters.ts`, `src/game/renderer/inkStyle.ts` | none | DONE |
| M4 | Scholar 4-Hit Poses & 3-Layer Trails | `src/game/poses/chronoPoses.ts`, `src/game/renderer/types.ts`, `src/game/StickmanRenderer.ts`, `src/game/animation.ts`, `src/game/renderer/trails.ts` | M2 | DONE |
| M5 | Awakened Skill Transformations | `src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts` | M1, M2, M3 | DONE |

## Code Layout & Guardrails
- Source root: `/storage/emulated/0/Antigravity/Stickman/src/`
- Build/check directory: `/data/user/0/com.agy/files/stickman-build` (`tsc --noEmit`)
- Excluded files (NEVER read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Technical invariants:
  - Zero `ctx.shadowBlur` anywhere in `src/`.
  - Zero `performance.now()` anywhere in `src/game/renderer/` and `UltimateCutscene.ts`.
  - Strictly balanced `ctx.save()` / `ctx.restore()` in every modified render function.
