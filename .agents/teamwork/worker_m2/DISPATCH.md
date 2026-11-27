## 2026-11-25T11:28:37Z
Sender: `b589790b-28b0-4a60-980a-68ac67599fd4`
Role: `worker_m2`, Milestone M2 Worker (`Renderer & Cutscene Skin VFX`)

### Exclusive Write Ownership
- `src/game/StickmanRenderer.ts`
- `src/game/UltimateCutscene.ts`
- `src/game/animation.ts` (visual profile helper `getAwakenedVisualProfile` ONLY)

### Tasks
1. `src/game/StickmanRenderer.ts`:
   - Extend `SlashTrail` with optional `skinId?: SkinId`, `characterId?: CharacterId`, `rimColor?: string`, `secondaryColor?: string`, `motif?: SlashVfxMotif`, `seed?: number`.
   - Extend `StickmanRenderOptions` (and export `StickmanRenderParams = StickmanRenderOptions`) with `attackProgress?: number`, `attackAuraColor?: string`, `attackAuraSecondary?: string`, `vfxMotif?: SlashVfxMotif`, `auraRimColor?: string`, `auraPuddleColor?: string`.
   - Fix hardcoded `#fde047` at line ~3675 (`heavy_cleave`): use `s.rimColor ?? s.secondaryColor ?? s.outerColor`, and add a crisp mid-arc `s.secondaryColor` band when provided.
   - Implement 12 distinct per-skin slash motif ornaments (`renderSlashMotifOrnament`) in `renderSlashTrails` anchored cleanly for `spear_thrust`, `spear_flurry`, `twin_x`, `iaido_line`, `arc`, and `heavy_cleave`, wrapped in balanced `ctx.save()`/`ctx.restore()` with ZERO `ctx.shadowBlur`.
   - Implement `renderAttackSwingAura` inside `renderStickman` when `opts.attackProgress !== undefined && opts.attackProgress > 0 && opts.attackProgress < 1 && !isMono`.
   - Update `renderDarkInkAura` to accept/use `skinId`, `auraRimColor`, `auraPuddleColor` so all 12 skins have distinct foot aura styling.
   - Update `renderAwakenedBackForm`, `renderAwakenedHeadForm`, and `renderWeapon` (add optional `skinId?: SkinId` param passed from `renderStickman`) for Raijin/Kagura/Zero custom skins.
   - Ensure `silhouette: true` and `whiteFlash: true` still render cleanly without color bleed, and `save/restore` is 100% balanced.
2. `src/game/UltimateCutscene.ts`:
   - Ensure `CutsceneTheme` supports optional `accentColor?: string` (and uses `getSkinVfxProfile(characterId, skinId)` as fallback/palette source).
   - Update `renderVoltJudgment`, `renderSolarInferno`, and `renderPhantomEclipse` for all 6 Raijin/Kagura/Zero skins (and replace hardcoded `'#dc2626'` in `renderScarletSheath` with `this.theme.primaryColor`).
   - Keep `onKanjiImpact` (`t >= 2.18`), `onComplete` (`t >= 2.7`), `isSilhouettePhase()`, and `isWhiteFlashPhase()` timing/semantics intact.
3. `src/game/animation.ts`:
   - Extend `getAwakenedVisualProfile(characterId: CharacterId, skinId: SkinId = 'default')` preserving exact existing default profile for `rules.test.ts`, while custom `skinId` returns matching `scarfPrimary`, `scarfHighlight`, `auraAccent`, `formTitle`, and `transformationCallout`.
