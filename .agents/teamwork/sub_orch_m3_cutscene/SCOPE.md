# Scope: M3 — High-Contrast 3-Phase Dark Ultimate Cutscene & Palette Alignment

## Parent & Identity
- Parent Orchestrator: `59a327d2-fb56-416f-91d6-839113d20259` (`teamwork_preview_orchestrator_r7`)
- Working Directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/sub_orch_m3_cutscene`
- Authoritative Request: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (`## Follow-up — 2026-11-27T03:27:56Z` R3)
- Project Plan: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7/PROJECT.md`
- Survey Reference: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_2/handoff.md`

## Exclusive File Ownership (ONLY modify these files)
- `src/game/UltimateCutscene.ts` (replace `renderXuanFengSageScroll` with high-contrast 3-phase `#070d12` dark ink-night cutscene + import `renderStickman` & `getCharacterDef` + align `update()` impact/shake timing if needed)
- `src/game/skinVfx.ts` (update `'mactien:xuan_feng_sage'` cutsceneAccent `'#070d12'` and pale-gold `#fde68a` highlights without harsh yellow)
- `src/game/characters.ts` (align `xuan_feng_sage` `awakeningBannerText` / palette accents if needed while preserving `mythic` tier and `ultimateKanji: '春'`)
- `src/game/renderer/inkStyle.ts` (align `mactien:xuan_feng_sage` base & awakened Moonlight White – Jade Teal – Pale Gold accents if needed)

## Requirements (R3)
Completely replace the current washed-out white-paper scroll cutscene (`renderXuanFengSageScroll`) with 3 high-contrast cinematic phases on a deep ink-night background (`#070d12`) matching `chrono_sovereign`'s `renderTimeStop` dramatic pacing:
1. **Phase 1 — Literary Wheel Convergence (0%–45%)**: Against `#070d12` deep ink night, 3 giant concentric counter-rotating Literary Wheels (calligraphy characters + Enso brush strokes + jade-teal/pale-gold rims) scale up sharply at center while ink ribbons and peach blossom petals vortex inward.
2. **Phase 2 — Space Shatter / Transition (45%–70%)**: Radial ink streaks & jade-teal silk speedlines burst outward from center in all directions, accompanied by perspective shattered bamboo slips / scripture pages flying toward the camera (mirroring Chrono's perspective shatter phase).
3. **Phase 3 — Grand Seal Impact (70%–100%)**: Full-detail `xuan_feng_sage` character rendered via real `renderStickman` (NEVER a crude stickman!) appears on the left within a radiant Moonlight-Jade aura; on the right slams down a vibrant Cinnabar-Red / Jade-Teal Seal Frame stamping a massive, razor-sharp calligraphy `春`, complete with screen shake + Impact Frame flash.

## Guardrails
- Reference `chrono_sovereign`'s `renderTimeStop` and `renderKanjiStamp` in `UltimateCutscene.ts` FIRST.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`.
- Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts` (use cutscene elapsed `t` / `this.elapsed` only!).
- Strictly balanced `ctx.save()` / `ctx.restore()` (via `try { ... } finally { ctx.restore(); }`).
- Type-check from `/data/user/0/com.agy/files/stickman-build`: `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`.
