# Scope: M2 — High-Density Back-Gear, Outfit, Weapon & Underfoot Aura

## Parent & Identity
- Parent Orchestrator: `59a327d2-fb56-416f-91d6-839113d20259` (`teamwork_preview_orchestrator_r7`)
- Working Directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/sub_orch_m2_gear`
- Authoritative Request: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (`## Follow-up — 2026-11-27T03:27:56Z` R2)
- Project Plan: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7/PROJECT.md`
- Survey References:
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_2/handoff.md`
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_1/handoff.md` (§1.3.A underfoot aura)

## Exclusive File Ownership (ONLY modify these files)
- `src/game/renderer/gear.ts` (`renderHeroHeadGear`, `renderAwakenedHeadForm`, `renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderSkinBodyArmor` for `xuan_feng_sage` / `xuan_feng_robe`, plus optional front-orbit/pendant pass if hooked cleanly)
- `src/game/renderer/weapons.ts` (`xuan_feng_sage` Ngọc Tiêu Tiên Bút inside `renderWeapon`, accepting optional `vx = 0, vy = 0`)
- `src/game/StickmanRenderer.ts` (ONLY: pass `opts.vx, opts.vy` into `renderWeapon` and `renderSkinBackAttachment`; add `xuan_feng_sage` `skinMap` entry + bespoke underfoot calligraphy/Enso/petal aura in `renderDarkInkAura`; add optional front-layer hook if needed for 3D depth-sorted bamboo slips. DO NOT modify `computeStickmanSkeleton` attack poses — those belong to Wave 2 M4.)
- `src/game/renderer/types.ts` (ONLY add optional `awakened?: boolean; characterId?: CharacterId;` to `Afterimage` interface so Wave 2 M4 & M5 can use it cleanly. DO NOT modify `StickPoseName`.)

## Requirements (R2)
1. **3-Layer Heaven-Earth Literary Wheel (`Thiên Địa Văn Luân`)** (`gear.ts` normal & awakened back attachment):
   - Layer 1 (inner): Thick-thin Enso brush ring with ink-wash bleed.
   - Layer 2 (middle): Fine octagonal/scripture ring with 8 counter-rotating engraved ticks.
   - Layer 3 (outer): 4–6 Jade Bamboo Slips / Small Seals orbiting in a 3D elliptical path around the character's back (proper front/back depth sorting & perspective foreshortening).
   - Awakened state (`renderAwakenedBackForm`): Moonlight White – Jade Teal – Pale Gold (`#fde68a`) glow, NO harsh yellow, full 3-layer wheel + falling petals.
2. **Multi-Layered Scholar Outfit** (`gear.ts`):
   - Eliminate the flat white trapezoid torso and overlapping waist rects!
   - Contoured multi-layered scholar robe with high scholar collar around `neck`, separate front & back coattails swaying independently with velocity/pose, jade-teal waist sash with hanging jade pendant (`Ngọc Bội`), wide flowing sleeves anchored to `shoulder/elbow/hand` moving with attack direction, detailed jade hairpin, and sharp jade-teal eye glint (`drawInkEyeSlit` in both normal & awakened states).
3. **Ngọc Tiêu Tiên Bút Weapon** (`weapons.ts`):
   - Multi-segment jade shaft with pale-gold metallic joints/collars, rotating energy ring around the brush ferrule, long velocity-driven multi-segment flowing silk tassel (`vx, vy`), glowing white-core brush tip with jade-teal edge.
4. **Underfoot Aura** (`StickmanRenderer.ts` `renderDarkInkAura`):
   - Register `xuan_feng_sage` in `skinMap` and render a bespoke elliptical ink/jade calligraphy & petal ground aura (matching `chrono_sovereign`'s `renderDarkInkAura` density, replacing generic black tentacles).

## Guardrails
- Reference `chrono_sovereign` in `gear.ts`, `weapons.ts`, `StickmanRenderer.ts` FIRST.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`. Zero `performance.now()` in `src/game/renderer/`.
- Strictly balanced `ctx.save()` / `ctx.restore()` (via `try { ... } finally { ctx.restore(); }`).
- Type-check from `/data/user/0/com.agy/files/stickman-build`: `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`.
