# Hard Handoff — `teamwork_preview_orchestrator_r6`

**Type:** Hard Handoff  
**Task:** Standalone `mythic`-tier skin **"Xuân Phong Văn Thánh"** (`xuan_feng_sage`, subtitle: `春風 · Nhất Khí Hạo Nhiên`) for `mactien` in Scarlet Sheath (Stickman).

---

## Milestone State
- **Survey (Phase 1)**: DONE (`explorer_r6_m1`, `explorer_r6_m2`, `explorer_r6_m3`)
- **M1 — Data, Gear & Weapon**: DONE (`worker_r6_m1`)
- **M2 — Soft Brush Trails, Seals & Afterimages**: DONE (`worker_r6_m2`; `Entities.ts` verified to have no `mactien` seals/afterimages, untouched)
- **M3 — Cinematic Ultimate Cutscene**: DONE (`worker_r6_m3`)
- **Phase 3 Verification Gate**: **PASS** (`reviewer_r6_1` APPROVE, `reviewer_r6_2` APPROVE, `challenger_r6_1` CONFIRM, `challenger_r6_2` CONFIRM, `auditor_r6_1` CLEAN)

## Modified Files (12 Files, Zero Excluded Files Touched)
1. `src/game/types.ts` (M1): Added `'xuan_feng_sage'` to `SkinId` and `'xuan_feng_calligraphy'` to `SlashVfxMotif`.
2. `src/game/characters.ts` (M1): Registered mythic skin `xuan_feng_sage` under `CHARACTER_SKINS.mactien` with White Robe (`#f8fafc`), Moonlight White (`#f0fdfa`), Jade Teal (`#5eead4`/`#2dd4bf`), Peach Blossom (`#fda4af`), `auraStyle: 'cyan'`, `awakenedAuraStyle: 'cyan'`.
3. `src/game/skinVfx.ts` (M1): Registered `'mactien:xuan_feng_sage'` in `SKIN_VFX_PROFILES` (`motif: 'xuan_feng_calligraphy'`).
4. `src/game/renderer/inkStyle.ts` (M1): Added `'mactien:xuan_feng_sage'` to `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES`.
5. `src/game/renderer/gear.ts` (M1): Mapped `inferCharacterFromSkin`, added white-jade `jade_hairpin`, open Zen Enso back ring + 4 drifting bamboo slips + 3 peach petals (`renderSkinBackAttachment`), multi-layered flowing white scholar robe `'xuan_feng_robe'` (`getArmorSpec`, `renderSkinBodyArmor`) with velocity/wind sway and jade sash, and Moonlight White – Jade Teal `form === 'mactien'` awaken forms (`renderAwakenedBackForm`, `renderAwakenedHeadForm`).
6. `src/game/renderer/weapons.ts` (M1): Rendered Ngọc Tiêu Tiên Bút inside `ink_brush`/`golden_ink_brush` for `skinId === 'xuan_feng_sage'` (translucent white-jade shaft, jade silk tassel, white bristles with glowing jade-teal ink tip, zero gold).
7. `src/game/renderer/types.ts` (M2): Added `'xuan_feng_brush'` to `SlashTrailStyle` and `skinId?: SkinId` to `Afterimage`.
8. `src/game/renderer/trails.ts` (M2): Implemented `'xuan_feng_brush'` 2-layer white-jade/ink-wash silk ribbon with tapered tips + 3 peach petals/bamboo leaves + finisher jade-teal `'静'` seal ring, translucent white-jade mist `renderAfterimages`, and delicate Enso/petal `renderAttackSwingAura`.
9. `src/game/animation.ts` (M2): Added Moonlight White – Jade Teal `getAwakenedVisualProfile` branch and optional `skinId` param on `getComboMoveForCharacter` with `'xuan_feng_brush'` & lighter `slashArcs` (100% combat stat parity).
10. `src/game/Player.ts` (M2): Propagated `skinId` to `pendingInkSeals` and `pushAfterimage`; added `xuan_feng_sage` white-jade/jade-teal/petal VFX branches.
11. `src/game/Game.ts` (M2): Propagated `skinId` to `inkSeals`, rendered fine-lined jade-teal `'静'` seal ring with 6 rotating petals & spring-breeze burst, Ult VFX, and moonlight-jade `renderMacTienDomainBackdrop`.
12. `src/game/UltimateCutscene.ts` (M3): Added `skinId === 'xuan_feng_sage'` dispatch before `mactien` default (`renderXuanFengSageScroll`), rendering an unfurling cool-morning ink-wash scroll, 3 misty mountain layers, corner bamboo & peach boughs, calm white-robed `mactien` flicking sleeve & sweeping Ngọc Tiêu Tiên Bút into an open Zen Enso + spring wind with 24 deterministic petals/leaves (zero dragon/tube), large `"春"` with layered jade glow, and bottom-right cinnabar `"靜"` seal.

## Verification Summary
- `tsc --noEmit` (from `/data/user/0/com.agy/files/stickman-build`): **0 errors** across all 12 modified files (24 pre-existing errors reside solely in untouched `src/game/poses/chronoPoses.ts` and excluded `tests/e2e/*`).
- `vite build` (from `/data/user/0/com.agy/files/stickman-build`): Exit code **0** (1701 modules transformed).
- Static invariants: `0` functional `ctx.shadowBlur` in `src/`, `0` `performance.now()` in `src/game/renderer/` and `src/game/UltimateCutscene.ts`, `ctx.save()`/`ctx.restore()` strictly balanced across all modified files, `0` excluded files modified, `0` combat/hitbox/damage/cooldown logic edits.
- Headless MockCanvas2D stress tests (`challenger_r6_1`, `challenger_r6_2`): 30,646+ draw calls across normal/awakened poses, combo parity checks, trails, afterimages, and 180-frame `UltimateCutscene` lifecycle (`saveDepth=0`, `shadowBlurWrites=0`, `harshGoldWrites=0`, `nanCount=0`).

## Active Subagents / Pending Decisions / Remaining Work
- Active subagents: none (all 11 completed, heartbeat cron `task-10` cancelled).
- Remaining work: none. Ready for user inspection in browser.

## Key Artifacts
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r6/SCOPE.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r6/GATE_STATUS.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r6/BRIEFING.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r6/progress.md`
