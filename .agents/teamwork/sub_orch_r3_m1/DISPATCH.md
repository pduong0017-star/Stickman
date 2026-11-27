# Sub-Orchestrator Dispatch — M1: Ink-Wash Core, Brush Primitives & Weapons

- **Scope**: Milestone `M1` (`R3-F1`, `R3-F2`) per `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
- **Exclusive Write Ownership**:
  - `src/game/renderer/inkStyle.ts` *(new)*
  - `src/game/renderer/types.ts`
  - `src/game/StickmanRenderer.ts`
  - `src/game/renderer/weapons.ts`
- **Forbidden Edits**: Do NOT modify `src/game/poses/*`, `src/game/animation.ts`, `src/game/rules.ts`, `src/game/rules.test.ts`, `src/game/characters.ts`, `src/game/skinVfx.ts`, `src/game/types.ts`, `src/game/renderer/gear.ts`, `src/game/renderer/trails.ts`, `src/game/Player.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`, `src/game/PeriodicTableBG.ts`, `src/game/Game.ts`.
- **Mandatory Reads**:
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
  - `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_1/handoff.md`
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_2/handoff.md`
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_3/handoff.md`
- **Acceptance Criteria for M1**:
  1. `inkStyle.ts`: 18-entry `SkinInkPalette`, safe `colorWithAlpha()`, finite guards (`finiteOr`), tapered brush limb/torso/head primitives, cel+sumi-e shadows, high-contrast rim light — zero `ctx.shadowBlur`, zero per-frame `create*Gradient`.
  2. `renderer/types.ts`: Export expanded `EnemyOutfitId` (8 mob + 12 boss outfits + `'none'`), `BossStyleOutfit = EnemyOutfitId`, and backward-compatible `StickmanRenderOptions` fields (`inkRimColor?`, `inkAccent?`, `entityTier?`, `enragePhase?`, `inkWash?`).
  3. `StickmanRenderer.ts`: Upgrade `renderStickman` with tapered brush limbs/torso/head, cel+sumi-e shadow pass, directional rim-light, smooth quadratic swallowtail scarf, skin-aware waist sheath for all sheath users (`kuro` 4 skins + `kagura` 3 skins), `renderDarkInkAura` sumi-e ink-wash puddle/wisps for all 18 skins + enemy/boss tiers, finite input guards, and delegate Zero's offhand dagger to `weapons.ts`. Keep `computeStickmanSkeleton` & bone lengths intact.
  4. `renderer/weapons.ts`: Upgrade playable + mob/boss weapons with sumi-ink outlines, tapered metallic/ink blades, glowing edge rims (no `shadowBlur`), `eclipse_ronin` blade accents, export `renderOffhandDagger`, clean single-exit `save/restore`.
  5. Sync `src/` to `/data/user/0/com.agy/files/stickman-build/src`, verify `rules.test.ts` 17/17 pass, `vite build` succeeds (exit 0), zero `shadowBlur` in `src/`, balanced `save/restore` (= 0), zero `NaN` in headless mock Canvas2D test.
