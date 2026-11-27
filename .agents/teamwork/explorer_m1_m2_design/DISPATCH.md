# Dispatch Log

## 2026-11-25T11:17:46Z
From: `b589790b-28b0-4a60-980a-68ac67599fd4` (parent)

You are `explorer_m1_m2_design` (M1 & M2 Design Explorer).
Your working directory is: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/explorer_m1_m2_design`
Project root is: `/storage/emulated/0/Antigravity/Stickman`
Parent conversation ID: `b589790b-28b0-4a60-980a-68ac67599fd4`

MANDATORY FIRST STEP: Read `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` and `/storage/emulated/0/Antigravity/Stickman/PROJECT.md` completely before starting work.

Your mission (Read-only M1 & M2 Design Spec):
Inspect `src/game/types.ts`, `src/game/characters.ts`, `src/game/ParticleSystem.ts`, `src/game/StickmanRenderer.ts`, `src/game/UltimateCutscene.ts`, and `src/game/animation.ts` to produce a precise, concrete implementation blueprint for Milestones M1 & M2:
1. Exact `SkinVfxProfile` values for all 12 `(CharacterId, SkinId)` pairs (`kuro/default`, `kuro/radiant_seraph`, `kuro/void_walker`, `raijin/default`, `raijin/storm_shogun`, `raijin/cyber_valkyrie`, `kagura/default`, `kagura/solar_phoenix`, `kagura/frost_empress`, `zero/default`, `zero/blood_moon`, `zero/astral_phantom`) — ensuring 100% uniqueness across palettes, `slashColors`, `motif`, `swingParticleKind`, `finisherParticleKind`, `aura`, `projectileTheme`, `pillarTheme`, and `cutscene` colors.
2. Verify how to fix the `kagura/frost_empress` vs `zero/astral_phantom` `slashColors` collision in `src/game/characters.ts` without breaking `rules.test.ts`.
3. Exact Canvas 2D draw recipes (ZERO `ctx.shadowBlur`, proper `ctx.save()`/`ctx.restore()`) for:
   - `ParticleSystem.ts` new pooled kinds (`feather`, `petal`, `star`, `shard`, `ink_splatter`) + `MAX_PARTICLES = 720` + `getActiveCount()` / `getPoolCapacity()`.
   - `StickmanRenderer.ts`: `SlashTrail` extensions, removing hardcoded `#fde047` in `heavy_cleave`, 12 per-skin slash motifs (`renderSlashTrails`), per-skin swing aura around the fighter during `attackTimer > 0`, `renderDarkInkAura`, `renderAwakenedBackForm` / `renderAwakenedHeadForm` / `renderWeapon` skin accents for Raijin/Kagura/Zero skins.
   - `UltimateCutscene.ts`: per-skin palette overrides for `renderVoltJudgment`, `renderSolarInferno`, and `renderPhantomEclipse`.
