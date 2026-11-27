# Handoff Report — `explorer_m1_m2_design` (M1 & M2 Design Spec)

## 1. Observation
- `src/game/types.ts` (lines 5–17) defines 4 `CharacterId` values and 9 `SkinId` values forming 12 `(CharacterId, SkinId)` pairs.
- `src/game/characters.ts` (lines 529 & 602) has an exact `slashColors` collision: both `kagura/frost_empress` (line 529) and `zero/astral_phantom` (line 602) specify `slashColors: ['#38bdf8', '#c084fc']`.
- `src/game/rules.test.ts` (lines 139–160, 250–270) tests `CHARACTER_ORDER` (4), `ultimateKanji` uniqueness (4), `specialKind` uniqueness (4), `zero.maxJumps === 3`, `getCharacterDef('unknown_id').id === 'kuro'`, and `getAwakenedVisualProfile(id)` returning 4 distinct `motif`s. It does **not** assert `slashColors` values.
- `src/game/ParticleSystem.ts`: `MAX_PARTICLES = 500` (line 37); `ParticleKind` (lines 3–15) lists `'ink_splatter'` at line 12 with no emitter method and no `render()` branch; lacks `'feather'`, `'petal'`, `'star'`, `'shard'`, `getActiveCount()`, and `getPoolCapacity()`.
- `src/game/StickmanRenderer.ts`:
  - `SlashTrail` (lines 108–121) lacks `skinId`, `characterId`, `rimColor`, `secondaryColor`, `motif`, and `seed`.
  - Line 3675 hardcodes `ctx.strokeStyle = style === 'heavy_cleave' ? '#fde047' : s.outerColor;`.
  - `renderSlashTrails` (lines 3486–3690) only renders 6 base weapon `style` geometries without per-skin motifs.
  - `renderStickman` (lines 1093–1372) has no per-skin swing aura during `attackTimer > 0`.
  - `renderDarkInkAura` (lines 1374–1423) ignores `skinId`.
  - `renderAwakenedBackForm` (lines 2332–2510) and `renderAwakenedHeadForm` (lines 2515–2668) branch on `skinId` only for `kuro`, ignoring Raijin, Kagura, and Zero custom skins.
  - `renderWeapon` (lines 2827–3268) lacks a `skinId` parameter.
- `src/game/UltimateCutscene.ts` (lines 161–173, 343–663) branches on `skinId` only for `radiant_seraph` and `void_walker`; `renderVoltJudgment`, `renderSolarInferno`, and `renderPhantomEclipse` hardcode base character hex colors.
- `grep_search` across `src/game` for `shadowBlur` returned **0 results**.

## 2. Logic Chain
1. Because `kagura/frost_empress` is themed around glacial cyan (`#38bdf8`) and oni violet (`#c084fc`), while `zero/astral_phantom` is themed around cosmic indigo (`#4f46e5`/`#4338ca`) and starlight gold (`#fde047`/`#fef08a`), updating `zero/astral_phantom` at `src/game/characters.ts:602` to `slashColors: ['#818cf8', '#fde047']` resolves the collision while matching its armor/scarf palette and leaving `rules.test.ts` (17/17) intact.
2. Defining `SlashVfxMotif`, `SkinParticleAccentKind`, `PillarTheme`, and `ProjectileTheme` in `src/game/types.ts` and re-exporting them alongside `SkinVfxProfile`, `SKIN_VFX_PROFILES`, `getSkinVfxKey`, `getSkinVfxProfile`, and `listAllSkinVfxProfiles` in `src/game/skinVfx.ts` satisfies `PROJECT.md` contracts with zero circular imports.
3. Assigning each of the 12 skins a distinct `motif`, distinct `(slashPrimary, slashSecondary)`, distinct `(swingAuraColor, swingAuraSecondary)`, distinct `(auraTendrilPrimary, auraTendrilSecondary)`, distinct `afterimageColor`, distinct `(particlePrimary, particleSecondary)`, distinct `(swingParticleKind, finisherParticleKind)`, distinct `impactRingColor`/`hitTextColor`, and distinct `(cutscenePrimary, cutsceneSecondary, cutsceneAccent)` guarantees 100% uniqueness even if tests compare individual subsets.
4. Extending `ParticleSystem` to `MAX_PARTICLES = 720` with pooled `feather`, `petal`, `star`, `shard`, and `ink_splatter` (`maxLife <= 0.45`, zero `shadowBlur`, `save()`/`restore()` around `lighter`) satisfies R2 bounded memory while supporting all 12 skin motifs.
5. Extending `SlashTrail`, removing `#fde047` at `StickmanRenderer.ts:3675` in favor of `s.rimColor ?? s.secondaryColor ?? s.outerColor`, layering 12 deterministic `renderSlashMotifOrnament` recipes atop the 6 weapon `style` geometries, adding `renderAttackSwingAura` for `attackProgress`, skinning `renderDarkInkAura`/`renderAwakenedBackForm`/`renderAwakenedHeadForm`/`renderWeapon`, and parameterizing `UltimateCutscene.ts` preserves all R3 combat hitboxes/timing while delivering unmistakable visual differentiation across all 12 skins.

## 3. Caveats
- Read-only investigation: no source files were modified, and `Player.ts`, `Entities.ts`, `Game.ts`, and `Enemy.ts` wiring belongs to M3 (only inspected for contract compatibility).
- `StickmanRenderParams` mentioned in `PROJECT.md` maps to `StickmanRenderOptions` at `StickmanRenderer.ts:133`; exporting `export type StickmanRenderParams = StickmanRenderOptions;` is recommended so either symbol name works.

## 4. Conclusion
Full M1 & M2 design specification is documented in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/explorer_m1_m2_design/analysis.md` and ready for immediate M1 and M2 implementation:
- **M1**: Create `src/game/skinVfx.ts` (12 strictly unique `SkinVfxProfile`s), add VFX union types to `src/game/types.ts`, fix `zero/astral_phantom` `slashColors` at `src/game/characters.ts:602`, and upgrade `src/game/ParticleSystem.ts` (`MAX_PARTICLES = 720`, 5 pooled emitters + renderers, `getActiveCount()`, `getPoolCapacity()`).
- **M2**: Update `src/game/StickmanRenderer.ts` (`SlashTrail`, line 3675 `#fde047` fix, 12 slash motifs, swing aura, skin-themed `renderDarkInkAura` / `renderAwakenedBackForm` / `renderAwakenedHeadForm` / `renderWeapon`), `src/game/UltimateCutscene.ts` (skin palettes in `renderVoltJudgment`, `renderSolarInferno`, `renderPhantomEclipse`, plus `renderScarletSheath` stamp color), and `src/game/animation.ts` (`getAwakenedVisualProfile` optional `skinId`).

## 5. Verification Method
After M1 & M2 are implemented:
1. Run existing unit tests:
   `ESBUILD_BINARY_PATH="$TMPDIR/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` -> must pass 17/17.
2. Verify zero `shadowBlur` in `src/game/`: `grep -rn "shadowBlur" src/game/` -> 0 matches.
3. Programmatically verify `listAllSkinVfxProfiles().length === 12`, all 12 `motif`s / palettes / `characters.ts` `slashColors` are unique, and `ParticleSystem.getPoolCapacity() === 720` with `getActiveCount() === 0` after advancing `update(dt)` past `0.5s`.
4. Run production build in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman_build`: `node node_modules/vite/bin/vite.js build` -> 0 errors.
