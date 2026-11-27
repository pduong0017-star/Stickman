# Worker M1 Handoff — Ink-Wash Core, Brush Primitives & Weapons

**Status**: Complete (`HEADLESS_M1_PASS`, `rules.test.ts` 17/17, `vite build` exit 0, zero `shadowBlur`, mirror synced).

---

## 1. Observation

### 1.1 Files Created / Modified (Exclusive M1 Ownership)
1. **`src/game/renderer/types.ts`**:
   - Replaced `BossStyleOutfit` literal union with expanded `EnemyOutfitId` (`'none' | 'meta_mob' | 'gunner_mob' | 'swarm_mob' | 'aegis_mob' | 'ninja_mob' | 'brute_mob' | 'arcanist_mob' | 'reaper_mob' | 'haiku' | 'astra' | 'glacius' | 'opus' | 'vulcan' | 'sol' | 'nyx' | 'fable' | 'raiden' | 'akaza' | 'kronos' | 'omega'`) at lines 60–82, preserving `export type BossStyleOutfit = EnemyOutfitId;` at line 84.
   - Extended `StickmanRenderOptions` (lines 229–233) with optional backward-compatible fields: `inkRimColor?: string;`, `inkAccent?: string;`, `entityTier?: 'hero' | 'mob' | 'elite' | 'boss';`, `enragePhase?: 1 | 2;`, `inkWash?: boolean;`.
2. **`src/game/renderer/inkStyle.ts`** *(new)*:
   - Exports `SkinInkPalette` interface, `finiteOr(value, fallback)`, `colorWithAlpha(color, alpha)` (safely handles `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`, converting `hsl`/`hsla` to `rgba(...)` for both Canvas 2D and Pillow compatibility), `getSkinInkPalette(characterId?, skinId?, awakened?, fallbackBody?, fallbackGlow?)` covering all **18 `(CharacterId, SkinId)` pairs** plus Awakened overrides and enemy/boss fallback derivation.
   - Exports calligraphic Ink-Wash primitives using only `moveTo`, `lineTo`, `quadraticCurveTo`, `arc`: `drawInkBrushLimb(...)`, `drawInkBrushTorso(...)`, and `drawInkHead(...)` (base fill, sumi-e crescent shadow wash, directional rim-light).
3. **`src/game/renderer/weapons.ts`**:
   - Added `drawBeveledBlade(...)` helper and upgraded all 16 playable weapons (`katana`, `blood_greatsword`, `seraph_blade`, `seraph_greatsword`, `void_blade`, `void_greatsword`, `volt_spear`, `thunder_halberd`, `flame_nodachi`, `solar_greatblade`, `twin_daggers`, `void_sabers`, `arcane_hands`, `prismatic_hands`, `valkyrie_glaive`, `valkyrie_excalibur`) and all 11 mob/boss weapons (`dagger`, `pistol`, `sword`, `shield_sword`, `spear`, `frost_halberd`, `laser_blade`, `titan_hammer`, `sniper_rifle`, `reaper_scythe`, `neon_orb`) with ink-wash outlines, tapered metallic/cel bevels, and edge rims.
   - Added `eclipse_ronin` black-crimson-gold blade theming to `katana` and `blood_greatsword`.
   - Added optional `accentOverride?: string` parameter to `renderWeapon` (used by `StickmanRenderer` via `opts.inkAccent` for M3 projectile/boss weapon parity).
   - Exported `renderOffhandDagger(ctx, joints, weapon, skinId?, whiteFlash?, inkAccent?)` for Zero & `cyber_ninja`.
   - Wrapped `renderWeapon` and `renderOffhandDagger` in `try { ... } finally { ctx.restore(); }` (`ctx.save` = 4, `ctx.restore` = 4).
4. **`src/game/StickmanRenderer.ts`**:
   - Kept `computeStickmanSkeleton`, `SkeletonJoints` bone lengths, and `poses/*` routing untouched; added `finiteOr` + `Math.max(0, ...)` pose-time guard at lines 57–62.
   - Upgraded `strokeSkeletonLimbs(ctx, joints, lw, headR, color, drawBackOnly, drawFrontOnly, shadowColor?, rimColor?)` to use `drawInkBrushLimb`, `drawInkBrushTorso`, and `drawInkHead` while remaining 100% compatible with `trails.ts:13`.
   - Upgraded `renderStickman`: added `finiteOr` guards on `opts.x`, `opts.y`, `opts.poseTime`, `opts.walkPhase`, `opts.scaleX`, `opts.scaleY`, `opts.lineWidth`, `opts.headRadius`; added outer ink-wash rim halo (`lw + 6.2`) behind the bold `#0b0c10` outline pass; added cape rim highlight; extracted skin-aware `renderWaistSheath(...)` covering all `kuro` (4 skins including `eclipse_ronin`) and `kagura` (3 skins including `solar_phoenix` & `frost_empress`); replaced inline offhand dagger with `renderOffhandDagger(...)`; added ink-wash shield shading/rim for `shield_sword`; wrapped all `save()` blocks in `try { ... } finally { ctx.restore(); }` (`ctx.save` = 13, `ctx.restore` = 13).
   - Upgraded `renderDarkInkAura` with sumi-e splatter ring, orbiting droplets, `entityTier`/`enragePhase` escalation, and dedicated entries for all 18 skins (including `eclipse_ronin`, `prismatic_archon`, `celestial_empress`, `abyssal_valkyrie`, `aether:default`, `valkyrie:default`).
   - Upgraded `renderCelScarf` with `Number.isFinite` node filtering, smooth midpoint quadratic curves, underside fold shadow, rim highlight, and tapered swallowtail forked tips.

### 1.2 Verification Outputs (Observed Verbatim)
- **Static audit + mirror sync**:
  - `shadowBlur files: []` (0 occurrences across entire `src/`).
  - `inkStyle.ts`: `ctx.save=0, ctx.restore=0`, `types.ts`: `ctx.save=0, ctx.restore=0`, `StickmanRenderer.ts`: `ctx.save=13, ctx.restore=13`, `weapons.ts`: `ctx.save=4, ctx.restore=4`. Zero `createLinearGradient`, `createRadialGradient`, `arcTo(`, `.clip(`, `.transform(`.
  - `diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src` exited `0`.
- **Unit tests (`src/game/rules.test.ts`)**: `17` tests, `17` pass, `0` fail (`6746.792ms`).
- **Vite production build**: `1694 modules transformed`, built `dist/index.html` (`1.76 kB`), `dist/assets/index-DVgzHGJ9.css` (`41.49 kB`), `dist/assets/index-Dr1n4N7B.js` (`745.20 kB`) in `7.00s`, exit `0`.
- **Headless Mock-Canvas2D Verification**:
  - `{"skinPairs":18,"totalRenders":288,"weaponsTested":27,"colorWithAlphaSamples":["rgba(255, 0, 0, 0.500)","rgba(17, 34, 51, 0.300)","rgba(17, 34, 51, 0.700)","rgba(10, 20, 30, 0.400)","rgba(10, 20, 30, 0.500)","rgba(0, 255, 255, 0.600)"],"status":"HEADLESS_M1_PASS"}`
  - Confirmed `saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, `nanDetected === false`, and `commands.length > 0` across all 6 chars × 18 skins × {Normal, Awakened} × 8 poses (`288` renders), all `27` weapons × {normal, whiteFlash}, `renderOffhandDagger`, and `NaN`/`Infinity` input resilience.

---

## 2. Logic Chain

1. Expanding `EnemyOutfitId` (with `BossStyleOutfit = EnemyOutfitId`) and adding optional `inkRimColor`, `inkAccent`, `entityTier`, `enragePhase`, and `inkWash` fields in `src/game/renderer/types.ts` establishes the shared contracts for M2 (`gear.ts`, `trails.ts`) and M3 (`enemyVisuals.ts`, `Enemy.ts`, `Boss.ts`) without breaking any existing callers.
2. Implementing `getSkinInkPalette`, `colorWithAlpha`, `finiteOr`, and pure-path tapered brush primitives (`drawInkBrushLimb`, `drawInkBrushTorso`, `drawInkHead`) in `src/game/renderer/inkStyle.ts` without `shadowBlur`, `create*Gradient`, `arcTo`, `transform`, or `clip()` guarantees full compatibility with Android Canvas 2D and `tests/e2e/helpers/mockCanvas.ts` + Pillow rasterization.
3. Wiring those primitives into `StickmanRenderer.ts` (`strokeSkeletonLimbs`, `renderStickman`, `renderDarkInkAura`, `renderCelScarf`, `renderWaistSheath`) and upgrading all 27 weapons + `renderOffhandDagger` in `src/game/renderer/weapons.ts` upgrades the base silhouette, contrast, and weapon detail across all 6 fighters × 18 skins and all enemies/bosses while leaving `poses/*`, `poseMath.ts`, and `rules.ts` untouched — confirmed by `rules.test.ts` (17/17), `vite build` (exit 0), and `HEADLESS_M1_PASS` (288/288 renders).

---

## 3. Caveats

- `tsc --noEmit` was not run because `typescript@7.0.2` in `/data/user/0/com.agy/files/stickman-build` lacks `@typescript/typescript-android-arm64` (per `PROJECT.md` and `survey_3`); bundling and module resolution were verified via `vite build` and `tsx`/`esbuild`.
- Per-skin armor/headgear/back attachments (`gear.ts`) and slash trail motifs (`trails.ts`) belong to M2 and were not modified in M1; `renderStickman` passes `opts.skinId` and `opts.awakenedForm` cleanly to them.
- Full E2E visual PNG generation (`tests/e2e/r3_inkwash.e2e.test.ts` / `render-r3-sheet.py`) belongs to the E2E / M4 milestones.

---

## 4. Conclusion

Milestone M1 is complete and verified. `inkStyle.ts`, `types.ts`, `StickmanRenderer.ts`, and `weapons.ts` deliver the Ink-Wash / Thủy mặc brush-stroke core, 18-skin ink palettes, upgraded weapons, quadratic swallowtail scarf, skin-aware waist sheath, and `renderOffhandDagger` export, synced to `/data/user/0/com.agy/files/stickman-build/src` with zero `shadowBlur`, balanced `save/restore`, zero `NaN`, 17/17 unit tests passing, and a clean Vite production build. M2 and M3 can proceed immediately against these contracts.

---

## 5. Verification Method

Run from `/data/user/0/com.agy/files/stickman-build` after verifying mirror sync (`diff -rq /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src`):
1. Static audit:
   ```bash
   python3 -c "import pathlib; bad=[str(p) for p in pathlib.Path('/storage/emulated/0/Antigravity/Stickman/src').rglob('*.ts*') if 'shadowBlur' in p.read_text()]; assert not bad"
   ```
2. Unit tests (17/17):
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   ```
3. Vite production build (exit 0):
   ```bash
   node node_modules/vite/bin/vite.js build
   ```
4. Headless mock-Canvas2D check: instantiate `MockCanvasElement` from `/storage/emulated/0/Antigravity/Stickman/tests/e2e/helpers/mockCanvas.ts` and invoke `renderStickman` across `CHARACTER_ORDER` × `CHARACTER_SKINS` (18 skins) × `{false, true}` awakened × 8 poses plus `renderWeapon` for all 27 weapon IDs, asserting `saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, and `nanDetected === false`.
5. **Invalidation conditions**: Any subsequent edits to `src/game/renderer/inkStyle.ts`, `types.ts`, `weapons.ts`, or `StickmanRenderer.ts` require re-syncing `src/` to `/data/user/0/com.agy/files/stickman-build/src` and re-running steps 1–4.
