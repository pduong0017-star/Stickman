## 2026-11-25T11:23:58Z

Sender: `b589790b-28b0-4a60-980a-68ac67599fd4` (parent)

Task: Milestone M1 Worker (`Skin VFX Registry & Pooled Particles`)
Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m1`
Project root: `/storage/emulated/0/Antigravity/Stickman`

Exclusive Write Ownership:
- `src/game/types.ts`
- `src/game/skinVfx.ts` (new file)
- `src/game/characters.ts`
- `src/game/ParticleSystem.ts`

Tasks:
1. `src/game/types.ts`: Export `SlashVfxMotif`, `SkinParticleAccentKind`, `PillarTheme`, `ProjectileTheme` per `PROJECT.md § Interface Contracts`.
2. `src/game/skinVfx.ts`: Implement `SkinVfxProfile`, `SKIN_VFX_PROFILES` (all 12 `(CharacterId, SkinId)` pairs), `getSkinVfxKey`, `getSkinVfxProfile`, `listAllSkinVfxProfiles`, and re-export the union types. Every color field MUST be a valid 6-digit `#rrggbb` hex literal (keep `#rrggbb` on `slashPrimary`, `slashSecondary`, `slashRim`, `slashCore`, `swingAuraColor`, `swingAuraSecondary`, `afterimageColor`, `particlePrimary`, `particleSecondary`, `impactRingColor`, `hitTextColor`, `detonationColor`, `cutscenePrimary`, `cutsceneSecondary`, `cutsceneAccent` so `${color}38` hex-alpha concatenation never breaks). Guarantee 12/12 strictly unique profiles across `motif`, `slashColors`, swing aura, particle colors/kinds, and cutscene palettes.
3. `src/game/characters.ts`: Resolve the `kagura/frost_empress` vs `zero/astral_phantom` `slashColors` collision by updating `zero/astral_phantom` `slashColors` to `['#818cf8', '#fde047']` (`characters.ts:602`). Keep all gameplay stats, cooldowns, and `CHARACTER_ROSTER` compatibility intact (R3).
4. `src/game/ParticleSystem.ts`:
   - Export `MAX_PARTICLES = 720` and pre-allocate 720 slots in `pool`.
   - Implement `ParticleKind` additions (`'feather'`, `'petal'`, `'star'`, `'shard'`) and implement `'ink_splatter'`.
   - Implement `emitFeathers`, `emitPetals`, `emitStars`, `emitShards`, `emitInkSplatter` (all pooled, zero combat GC, `maxLife <= 0.45`, zero `ctx.shadowBlur`, balanced `ctx.save()`/`ctx.restore()`).
   - Add flutter drift for `'feather'`/`'petal'` in `update(dt)` and crisp Canvas 2D rendering branches in `render(ctx)`.
   - Add `getActiveCount(): number` and `getPoolCapacity(): number`.

Verification Required Before Reporting:
1. Run existing unit tests (`src/game/rules.test.ts` via tsx + tmp esbuild).
2. Run Node/tsx verification snippet confirming 12 unique `SkinVfxProfile`s, 12 unique `slashColors` in `characters.ts`, `ParticleSystem.getPoolCapacity() === 720`, all 5 new emitters populate and expire `getActiveCount()` back to `0`.
3. Sync to `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` and verify `tsc --noEmit` (`typescript@5.8.3`) exits 0 on M1 files.
4. Maintain `progress.md`, write `handoff.md`, and `send_message` to `b589790b-28b0-4a60-980a-68ac67599fd4`.
