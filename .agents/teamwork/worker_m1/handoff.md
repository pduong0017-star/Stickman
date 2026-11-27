# Milestone M1 Handoff Report (`Skin VFX Registry & Pooled Particles`)

**Handoff Type**: Hard  
**Agent**: `worker_m1`  
**Status**: COMPLETE

---

## 1. Observation

- **`src/game/types.ts` (lines 18–55)**: Added and exported `SlashVfxMotif` (12 motifs), `SkinParticleAccentKind` (10 particle kinds), `PillarTheme` (`'fire' | 'phoenix' | 'frostfire'`), and `ProjectileTheme` (9 themes) matching `PROJECT.md § Interface Contracts`.
- **`src/game/skinVfx.ts` (lines 1–374, new file)**: Implemented `SkinVfxProfile`, `SKIN_VFX_PROFILES` covering all 12 `(CharacterId, SkinId)` pairs, `getSkinVfxKey`, `getSkinVfxProfile` (with fallback to `${characterId}:default` and `kuro:default`), `listAllSkinVfxProfiles`, and re-exported the 4 union types from `./types`. All 16 hex color fields (`slashPrimary`, `slashSecondary`, `slashRim`, `slashCore`, `swingAuraColor`, `swingAuraSecondary`, `auraTendrilPrimary`, `afterimageColor`, `particlePrimary`, `particleSecondary`, `impactRingColor`, `hitTextColor`, `detonationColor`, `cutscenePrimary`, `cutsceneSecondary`, `cutsceneAccent`) are 6-digit `#rrggbb` literals; `auraTendrilSecondary` uses `rgba(...)` matching `StickmanRenderer.ts` `renderDarkInkAura` puddle fill usage.
- **`src/game/characters.ts` (line 602)**: Changed `zero/astral_phantom` `slashColors` from `['#38bdf8', '#c084fc']` (which collided with `kagura/frost_empress` at line 529) to `['#818cf8', '#fde047']`. Zero gameplay stats, cooldowns, or `CHARACTER_ROSTER` definitions were modified.
- **`src/game/ParticleSystem.ts` (lines 13–16, 36, 71–81, 367–549, 839–972)**:
  - Exported `MAX_PARTICLES = 720` (up from `const MAX_PARTICLES = 500`) with 720 pre-allocated `Particle` slots in `this.pool`.
  - Added `'feather' | 'petal' | 'star' | 'shard'` to `ParticleKind` alongside `'ink_splatter'`.
  - Added read-only inspection helpers `getActiveCount(): number` and `getPoolCapacity(): number`.
  - Added 5 pooled emitters: `emitFeathers` (`maxLife` 0.28–0.44), `emitPetals` (`maxLife` 0.28–0.44), `emitStars` (`maxLife` 0.22–0.40), `emitShards` (`maxLife` 0.20–0.38), `emitInkSplatter` (`maxLife` 0.20–0.36). All `maxLife <= 0.45`, allocating zero objects during combat.
  - Added sinusoidal flutter drift in `update(dt)` for `'feather'` and `'petal'`.
  - Added 5 Canvas 2D render branches (`feather`, `petal`, `star`, `shard`, `ink_splatter`), each wrapped in balanced `ctx.save()` / `ctx.restore()` with zero `ctx.shadowBlur`.
- **Verification commands & verbatim results**:
  1. `ESBUILD_BINARY_PATH="$TMPDIR/esbuild_m1" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` → exited `0`, `tests 17 / pass 17 / fail 0`.
  2. Programmatic Node/tsx verification (`$TMPDIR/verify_m1.ts`, deleted after execution) → exited `0`: `M1 VERIFICATION PASSED: 12/12 unique profiles, 12/12 slashColors, pool=720, 5 emitters verified.`
  3. Scratch sync & `tsc --noEmit`: synced `src/*` to `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/src/` and ran `node .../typescript/bin/tsc --noEmit -p .../tsconfig.json` (`Version 5.8.3`) → exited `0` (0 errors).
  4. Scratch production build: `node node_modules/vite/bin/vite.js build` in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` → exited `0` (`✓ 37 modules transformed.`, `✓ built in 1.08s`).
  5. `grep -rn "shadowBlur" src/` → `ZERO shadowBlur matches`.

---

## 2. Logic Chain

1. Exporting `SlashVfxMotif`, `SkinParticleAccentKind`, `PillarTheme`, and `ProjectileTheme` in `src/game/types.ts` and re-exporting them from `src/game/skinVfx.ts` gives Milestones M2 and M3 a single canonical contract without circular dependencies.
2. Updating `zero/astral_phantom`'s `slashColors` in `src/game/characters.ts:602` eliminates the duplicate `['#38bdf8', '#c084fc']` tuple shared with `kagura/frost_empress` while preserving every fighter's deterministic combat numbers and `rules.test.ts` invariants (17/17 pass).
3. Defining all 12 entries in `SKIN_VFX_PROFILES` with distinct motifs, `slashPrimary`/`slashSecondary` matching `characters.ts`, distinct swing/tendril auras, afterimages, particle pairs/kinds, impact/hit-text colors, and cutscene palettes guarantees zero duplicate configurations across the roster. Keeping `#rrggbb` on all 16 hex fields prevents `${color}38` hex-alpha bugs when wired in M3.
4. Raising `MAX_PARTICLES` to `720` with pre-allocated slots, adding `getActiveCount()` / `getPoolCapacity()`, implementing the 5 new pooled emitters (`maxLife <= 0.44`), flutter physics, and balanced Canvas 2D draw branches ensures M2/M3 can trigger skin-specific bursts without heap churn, unbounded particle leaks, or `shadowBlur` performance drops.

---

## 3. Caveats

- Only the 4 M1-owned files (`src/game/types.ts`, `src/game/skinVfx.ts`, `src/game/characters.ts`, `src/game/ParticleSystem.ts`) were modified. M2 (`StickmanRenderer.ts`, `UltimateCutscene.ts`, `animation.ts`) and M3 (`Player.ts`, `Entities.ts`, `Game.ts`, `Enemy.ts`) are not yet wired to consume `SKIN_VFX_PROFILES` or the 5 new `ParticleSystem` emitters; visual rendering in actual gameplay waits on M2/M3.
- Runtime verification of `ParticleSystem.render(ctx)` in M1 used a mock Canvas 2D context in Node (`$TMPDIR/verify_m1.ts`); pixel-level visual inspection of rendered frames belongs to M4.

---

## 4. Conclusion

Milestone M1 is **complete and verified**. All interface contracts in `PROJECT.md` for `types.ts`, `skinVfx.ts`, `characters.ts`, and `ParticleSystem.ts` are implemented cleanly, all 12 `(CharacterId, SkinId)` pairs have strictly unique VFX profiles and `slashColors`, the 720-slot particle pool and all 5 new emitters pass lifecycle/expiry and balanced Canvas 2D checks, `rules.test.ts` passes 17/17, and `tsc --noEmit` (`typescript@5.8.3`) + `vite build` succeed with 0 errors. M2 and M3 workers can now build directly on M1.

---

## 5. Verification Method

Run from `/storage/emulated/0/Antigravity/Stickman`:
1. Existing unit tests:
   ```bash
   mkdir -p "$TMPDIR" && cp node_modules/tsx/node_modules/@esbuild/android-arm64/bin/esbuild "$TMPDIR/esbuild_m1" && chmod +x "$TMPDIR/esbuild_m1"
   ESBUILD_BINARY_PATH="$TMPDIR/esbuild_m1" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts
   ```
   Expected: 17/17 pass, exit 0.
2. TypeScript check & Vite build in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build`:
   ```bash
   cp -r /storage/emulated/0/Antigravity/Stickman/src/* /data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/src/
   node /data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/node_modules/typescript/bin/tsc --noEmit -p /data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/tsconfig.json
   node /data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build/node_modules/vite/bin/vite.js build
   ```
   Expected: both exit 0 with 0 errors.
3. Inspect files:
   - `src/game/types.ts` (lines 18–55)
   - `src/game/skinVfx.ts` (full file)
   - `src/game/characters.ts` (line 602)
   - `src/game/ParticleSystem.ts` (lines 13–81, 367–549, 839–972)
4. Invalidation conditions: any duplicate motif/palette/`slashColors` across the 12 skins, `getPoolCapacity() !== 720`, any new emitter exceeding `maxLife > 0.45`, any `shadowBlur` usage, or any TypeScript/unit-test failure.
