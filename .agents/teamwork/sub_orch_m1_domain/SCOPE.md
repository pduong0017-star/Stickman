# Scope: M1 — Full-Screen Domain ("LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU")

## Parent & Identity
- Parent Orchestrator: `59a327d2-fb56-416f-91d6-839113d20259` (`teamwork_preview_orchestrator_r7`)
- Working Directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/sub_orch_m1_domain`
- Authoritative Request: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (`## Follow-up — 2026-11-27T03:27:56Z` R1)
- Project Plan: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r7/PROJECT.md`
- Survey Reference: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_1/handoff.md`

## Exclusive File Ownership (ONLY modify these files)
- `src/game/types.ts` (extend `DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng'`)
- `src/components/GameHUD.tsx` (left-corner banner `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU` when `hud.domainKind === 'xuan_feng'`)
- `src/game/PeriodicTableBG.ts` (`xuanFengDomainBlend`, `renderXuanFengDomainScreenBackdrop`, `renderXuanFengDomainWorld`, modeled 1:1 on `chrono_sovereign`)
- `src/game/Game.ts` (ONLY Domain fields/methods: `isXuanFengDomainOwner()`, `getDomainOwnerKind()`, `onRequestAwaken` + Ultimate `onKanjiImpact`/`onComplete` triggers for `xuan_feng_sage`, gating `mactienDomainBlend` so `xuan_feng_sage` uses `PeriodicTableBG` full-screen Domain without overlapping `mactien:default` overlay. DO NOT modify `inkSeals` rendering/detonation or hit Hanzi flashes — those belong to Wave 2 M5.)

## Requirements (R1)
1. Activate full-screen Domain `"LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU"` whenever `xuan_feng_sage` activates Awaken OR casts Ultimate, matching `chrono_sovereign`'s `Tháp Đồng Hồ Cổ Đại` structural architecture (including HUD left-corner banner + timer).
2. **3D Perspective Floor Ring** (`PeriodicTableBG.ts` world layer): Flat horizontal elliptical calligraphy/Heaven-Earth formation ring beneath the character's feet (`GROUND_Y + 62`, 3+ concentric rings, 12 Earthly Branches / Confucian tick marks, slowly rotating radial lines in jade teal `#5eead4`/`#2dd4bf` + pale gold `#fde68a`).
3. **Central Backdrop** (`PeriodicTableBG.ts` screen backdrop): Deep ink-night sky + Giant Ink-Wash Sun-Moon & Classic Scripture Wheel (3 counter-rotating concentric rings: inner thick-thin Enso brush stroke, middle ring with 12 ancient calligraphy characters `春・風・靜・禮・義・仁・智・信...`, outer fine light rays + swirling ink-wash clouds + ambient rising motes/petals).
4. **Symmetrical Side Architecture** (`PeriodicTableBG.ts` world layer): 2 symmetrical Jade Scholar Pillars / Vertical Hanging Scrolls framing the left and right edges (mirroring Chrono's architectural pillars + edge gates), plus bamboo branches and peach blossom petals drifting with depth parallax.

## Guardrails
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Zero `ctx.shadowBlur` in `src/`.
- Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- Strictly balanced `ctx.save()` / `ctx.restore()` (via `try { ... } finally { ctx.restore(); }`) in every render function.
- Type-check from `/data/user/0/com.agy/files/stickman-build`: `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`.
