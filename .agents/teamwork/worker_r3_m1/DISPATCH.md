# Worker Dispatch — M1: Ink-Wash Core, Brush Primitives & Weapons

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_1/handoff.md`
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_2/handoff.md`
5. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_3/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **EXCLUSIVE Write Ownership (ONLY edit/create these files)**:
  - `src/game/renderer/inkStyle.ts` *(new)*
  - `src/game/renderer/types.ts`
  - `src/game/StickmanRenderer.ts`
  - `src/game/renderer/weapons.ts`
- **FORBIDDEN**: Do NOT modify `poses/*`, `poseMath.ts`, `animation.ts`, `rules.ts`, `rules.test.ts`, `characters.ts`, `skinVfx.ts`, `types.ts`, `gear.ts`, `trails.ts`, `Player.ts`, `Enemy.ts`, `Boss.ts`, `Entities.ts`, `PeriodicTableBG.ts`, `stages.ts`, `Game.ts`, or `tests/*`.

## Detailed Scope & Design Requirements
1. **`src/game/renderer/types.ts`**:
   - Expand `EnemyOutfitId` (keeping `export type BossStyleOutfit = EnemyOutfitId;` for backward compatibility):
     `'none' | 'meta_mob' | 'gunner_mob' | 'swarm_mob' | 'aegis_mob' | 'ninja_mob' | 'brute_mob' | 'arcanist_mob' | 'reaper_mob' | 'haiku' | 'astra' | 'glacius' | 'opus' | 'vulcan' | 'sol' | 'nyx' | 'fable' | 'raiden' | 'akaza' | 'kronos' | 'omega'`
   - Add optional backward-compatible fields to `StickmanRenderOptions`:
     `inkRimColor?: string; inkAccent?: string; entityTier?: 'hero' | 'mob' | 'elite' | 'boss'; enragePhase?: 1 | 2; inkWash?: boolean;`
2. **`src/game/renderer/inkStyle.ts` *(new)***:
   - Pure data + Android-safe Canvas 2D Ink-Wash helpers (**ZERO `ctx.shadowBlur`**, **ZERO per-frame `create*Gradient`**).
   - `finiteOr(v: number | undefined, fallback: number): number`
   - `colorWithAlpha(color: string, alpha: number): string` (safely parses `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `rgb(...)`, `rgba(...)`, `hsl(...)` — never fragile `${hex}33` concatenation!).
   - `SkinInkPalette` interface & `getSkinInkPalette(characterId?, skinId?, awakened?, fallbackBody?, fallbackGlow?)` covering **all 18 `(CharacterId, SkinId)` pairs** (`kuro` 4, `raijin` 3, `kagura` 3, `zero` 3, `aether` 2, `valkyrie` 3) with crisp sumi-e ink outline (`#0b0c10` or deep ink), base fill, sumi shadow fill, high-contrast directional rim highlight, vermilion/theme accent, cloth primary/highlight, metal light/dark, and glow core — honoring `fallbackBody`/`fallbackGlow` when rendering enemies/bosses or `silhouette`/`whiteFlash`.
   - Calligraphic Ink-Wash primitives (using multi-pass tapered polygons / quadratic brush strokes, NO `arcTo`, NO `transform`, NO `clip()`):
     - `drawInkBrushLimb(ctx, x1, y1, x2, y2, wStart, wEnd, fillStyle, shadowStyle?, rimStyle?)` (tapers from shoulder/hip to wrist/ankle with subtle dry-brush inner highlight / sumi shadow).
     - `drawInkBrushTorso(ctx, hipX, hipY, spineX, spineY, neckX, neckY, shoulderW, waistW, fillStyle, shadowStyle?, rimStyle?)` (sculpted tapered martial-arts torso rather than uniform stick).
     - `drawInkHead(ctx, headX, headY, radius, inkOutline, fillStyle, shadowStyle, rimStyle)` (crisp ink contour, crescent sumi-e shadow wash, sharp directional rim-light arc).
3. **`src/game/StickmanRenderer.ts`**:
   - Keep `computeStickmanSkeleton`, `SkeletonJoints` bone lengths (`TORSO_LEN=34`, `THIGH_LEN=26`, `SHIN_LEN=26`, `UPPER_ARM_LEN=19`, `FOREARM_LEN=19`), and `poses/*` calls 100% untouched.
   - Add `finiteOr` guards on `opts.x`, `opts.y`, `opts.poseTime`, `opts.scaleX`, `opts.scaleY`, and scarf nodes; guard non-basic pose time ratios (`t >= 0`).
   - Replace flat `strokeSkeletonLimbs` & `renderCelScarf` with Ink-Wash calligraphic brush limbs/torso/head + cel/sumi shadow + directional rim light (preserving `silhouette` and `whiteFlash` modes cleanly!).
   - Upgrade `renderCelScarf` to smooth quadratic spline cloth with tapered swallowtail ink tips, fold shadow line, and rim highlight.
   - Make waist sheath skin-aware for all sheath users (`kuro`'s 4 skins including `eclipse_ronin` + `kagura`'s 3 skins including `solar_phoenix` & `frost_empress`).
   - Upgrade `renderDarkInkAura` with sumi-e brush splatter rings & tendrils supporting all 18 skins (including `eclipse_ronin`, `prismatic_archon`, `celestial_empress`, `abyssal_valkyrie`) plus enemy/boss tiers (`entityTier`, `enragePhase`).
   - Replace the inline thick-line Zero offhand dagger at lines 1066-1088 by calling `renderOffhandDagger(...)` from `weapons.ts`.
   - Guarantee strict `ctx.save()` / `ctx.restore()` balance (= 0 on all paths).
4. **`src/game/renderer/weapons.ts`**:
   - Upgrade all playable weapons (`katana`, `blood_greatsword`, `seraph_blade`, `seraph_greatsword`, `void_blade`, `void_greatsword`, `volt_spear`, `thunder_halberd`, `flame_nodachi`, `solar_greatblade`, `twin_daggers`, `void_sabers`, `arcane_hands`, `prismatic_hands`, `valkyrie_glaive`, `valkyrie_excalibur`) AND mob/boss weapons (`dagger`, `pistol`, `sword`, `shield_sword`, `spear`, `frost_halberd`, `laser_blade`, `titan_hammer`, `sniper_rifle`, `reaper_scythe`, `neon_orb`) with ink-wash outlines, tapered blades, metallic/cel bevels, and glowing edge rims (zero `shadowBlur`, zero `arcTo`/`clip()`).
   - Add `eclipse_ronin` black-crimson-gold blade theming to `katana`/`blood_greatsword`.
   - Export `renderOffhandDagger(...)` for Zero & `cyber_ninja`.
   - Use clean single-exit `save/restore` (e.g. `try { ... } finally { ctx.restore(); }`).

## Mandatory Verification (Before Reporting Done)
1. Static audit: confirm `0` occurrences of `shadowBlur` in `src/` and balanced `save/restore`.
2. Sync `src/` to `/data/user/0/com.agy/files/stickman-build/src` and run:
   - `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts` (must pass **17/17**).
   - `node node_modules/vite/bin/vite.js build` in `/data/user/0/com.agy/files/stickman-build` (must exit 0).
3. Run a quick Node headless mock-Canvas2D check (`tests/e2e/helpers/mockCanvas.ts` or inline tsx check) over `renderStickman` for all 6 characters × 18 skins (Normal & Awakened) confirming `saveCount === restoreCount`, `shadowBlurUsed === false`, `nanDetected === false`, `commands.length > 0`.
4. Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1/handoff.md` with exact commands, outputs, and file changes, and message parent `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.
