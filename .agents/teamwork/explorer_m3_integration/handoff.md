# Handoff Report — `explorer_m3_integration` (Hard Handoff)

- **Analysis Blueprint**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/explorer_m3_integration/analysis.md`
- **Status**: Complete (Read-only M3 Integration & Lifecycle Spec)

## 1. Observation

1. **`src/game/Player.ts` (1,815 lines)**:
   - `skinId: SkinId = 'default'` (`64`), `afterimages: Afterimage[] = []` (`143`), `slashTrails: SlashTrail[] = []` (`144`).
   - Hardcoded `this.skinId === 'radiant_seraph'` / `'void_walker'` branches exist at `338–358` (Kuro Awakening), `618–626` (Dash FX), `639–643` & `1608–1612` (IceWall launch text), `1040–1044` (`IceWall` theme), and `1067–1077` (Awakened Kuro twin wave color/callout). Zero custom skin branching exists for `raijin`, `kagura`, or `zero` (e.g., `314` `#facc15`/`#38bdf8`, `318–320` `#fde047`/`#ea580c`, `331` `#34d399`, `584–586` `#34d399`/`#6ee7b7`, `651` `#fef08a`, `902–904` `#f97316`/`#fde047`, `1114–1150`, `1168–1189`, `1219–1243`, `1293–1356`, `1418`, `1502–1550`, `1571–1588`).
   - Primary `slashTrails.push` (`1465–1481`) uses `this.character.slashColors`, hardcodes `i === 0 ? outerColor : '#f8fafc'` (`1476`) and `coreColor: '#ffffff'` (`1477`), omits `rimColor`, `secondaryColor`, `motif`, `skinId`, `characterId`, `seed`, and has no array cap.
   - `render()` (`1782–1807`) calls `renderStickman(ctx, ...)` without passing `attackProgress`, `attackAuraColor`, `attackAuraSecondary`, or `vfxMotif`, and `1758–1764` hardcodes `#38bdf8`/`#7dd3fc` on the parry arc ring.
   - `setCharacter()` (`151–162`) does NOT clear `this.slashTrails` or `this.afterimages`.
   - `updateIdleOnTitle()` (`392–399`) does NOT tick or prune `this.slashTrails` or `this.afterimages`.
   - `getActiveVfxCounts()` does not exist yet on `Player`.

2. **`src/game/Entities.ts` (1,340 lines)**:
   - `Projectile.render` (`565–566`) uses fragile hex string equality: `const isSeraphWave = this.kind === 'sword_wave' && this.color === '#facc15';` and `const isVoidWave = this.kind === 'sword_wave' && this.color === '#a855f7';`.
   - `fire_wave` (`683–690`), `void_crescent` (`685–692`), `volt_lance` (`732–758`), and `kunai` (`759–785`) hardcode hex colors (`#f97316`, `#fef08a`, `#10b981`, `#a7f3d0`, `#22d3ee`, `#facc15`, `#d1fae5`) ignoring `this.color`.
   - `MagmaPillar` (`945–1038`) has no `theme` parameter and hardcodes `#f97316`, `#fb923c`, `#fef08a`, `#b91c1c`, `#fffbeb` in `update()` (`971–974`) and `render()` (`990–1033`).
   - `IceWall.update()` (`205`) unconditionally calls `particles.emitIceShards(...)` when launched, even for `'seraph'` and `'void'` themes.

3. **`src/game/Game.ts` (2,451 lines)**:
   - Title previews (`316–317`, `339–342`), Awakening (`1016`), `onThunderBlinkHit` (`1050–1051`), `onCryoSummonChill` (`1062`), `magmaPillars` (`1115`), `iceWalls` (`1151–1163`), melee hit (`1219–1237`), `onPerfectParry` (`1673, 1681–1688`), `detonateElementalMarks` (`1758–1791, 1808`), `activateScarletSheath` (`1878–2012`), and `render()` (`2036–2038`) use `this.player.character.*` or hardcoded character hex strings instead of `getSkinVfxProfile(this.characterId, this.skinId)` and pass unthemed `MagmaPillar` / `Projectile` instances.
   - `syncHudThrottled()` `fp` array (`2297–2321`) includes `this.characterId` (`2299`) but **omits `this.skinId`**.
   - `enterTitleState()` (`423–458`) omits resetting `impactFrameTimer`, `hitstopTimer`, `pendingOutcome`, `defeatBeatTimer`, and `lastHudFingerprint`; `startMode()` (`460–551`) omits resetting `impactFrameTimer` and `lastHudFingerprint`.
   - `render()` lines `2136` (`${themeColor}38`) and `2167` (`${proj.color}38`) append 2-digit hex alpha strings directly onto `themeColor` and `proj.color`.

4. **`src/game/Enemy.ts` (804 lines), `src/game/synergy.ts` (141 lines), `src/components/Modals.tsx` (456 lines)**:
   - `Enemy.ts` (`176–187`, `734–772`) renders elemental mark sparks and overhead glyphs from `getElementalMarkSpec(kind)` (`synergy.ts:16–65`) without optional skin tinting.
   - `synergy.ts` defines deterministic detonation/cooldown math tested by `rules.test.ts:272–301`.
   - `Modals.tsx:165` (`OutcomeModal`) reads `CHARACTER_ROSTER[stats.characterId]` (`RunStats` in `types.ts:171–189` has no `skinId`), and `PauseModal` (`55–85`) switches base character without a skin picker.
   - `StickmanRenderer.ts:133` exports `StickmanRenderOptions` (named `StickmanRenderParams` in `PROJECT.md:98`).

## 2. Logic Chain

1. Because `Player.ts` only special-cases `radiant_seraph` and `void_walker` on Kuro (`338, 618, 1040, 1067`) while hardcoding default hex literals for Raijin, Kagura, and Zero, and `Entities.ts` hardcodes colors for `kunai`, `volt_lance`, `fire_wave`, `void_crescent`, and `MagmaPillar`, 6 of 8 custom skins fail R1 during combat swings, skills, detonations, and projectiles.
2. Replacing all character/skin color literals and `this.skinId === '...'` branches in `Player.ts` and `Game.ts` with `getSkinVfxProfile(characterId, skinId)`, adding `emitSkinAccentParticle`, and switching `Projectile` and `MagmaPillar` in `Entities.ts` to explicit `ProjectileTheme` / `PillarTheme` + `secondaryColor` / `rimColor` fields resolves R1 uniformly across all 12 skins while preserving enemy/boss defaults (`theme = 'default'`, `pillarTheme = 'fire'`).
3. Because `Player.setCharacter()` does not clear `slashTrails`/`afterimages`, `Player.updateIdleOnTitle()` does not prune them, and neither array is capped, rapid skin switching mid-run or `>=50` attack spam can leak stale trails or spike array sizes; adding `MAX_SLASH_TRAILS = 24`, `MAX_AFTERIMAGES = 24`, clearing in `setCharacter()` + `reset()`, ticking in `updateIdleOnTitle()`, exposing `getActiveVfxCounts()`, adding `this.skinId` to `Game.syncHudThrottled()` `fp`, and resetting `impactFrameTimer` in `enterTitleState()`/`startMode()` guarantees R2.
4. Keeping all hitboxes, frame data, damage formulas, and controls untouched in `Player.ts`, `Entities.ts`, `Game.ts`, `Enemy.ts`, and `synergy.ts` guarantees R3.

## 3. Caveats

- **M1/M2 Dependency**: M3 implementation assumes M1 (`src/game/skinVfx.ts`, `ParticleSystem.ts` `MAX_PARTICLES = 720` + 5 new emitters + `getActiveCount`/`getPoolCapacity`) and M2 (`StickmanRenderer.ts` `SlashTrail` extensions + `StickmanRenderOptions` swing aura fields, `UltimateCutscene.ts` `CutsceneTheme`) are merged first.
- **Interface Name Mismatch**: `PROJECT.md:98` writes `StickmanRenderParams`, while `StickmanRenderer.ts:133` actually exports `StickmanRenderOptions`. M3 must target `StickmanRenderOptions`.
- **Hex Color Format Invariant**: Because `Game.ts:2136, 2167` concatenate `'38'` onto `themeColor` and `proj.color`, all colors passed there must remain 6-digit `#rrggbb` hex strings.
- **Ambient Aura Baseline**: On Title screen (`updateIdleOnTitle`) and idle `Player.update()`, `updateAmbientAura` emits ~1 smoke/lightning particle periodically (`<= 16` steady-state), whereas standalone `ParticleSystem` after `>=50` attack bursts returns to `0` active particles within `<= 2.6s` (and `player.slashTrails` / `player.afterimages` return to `0` within `<= 0.50s`).
- **Out-of-Scope Files**: `Modals.tsx` (`OutcomeModal` base `CHARACTER_ROSTER` lookup) and `synergy.ts` are outside M3's exclusive write list (`PROJECT.md:113`) and were left out of M3's modification plan.

## 4. Conclusion

The complete M3 blueprint is documented in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/explorer_m3_integration/analysis.md`. Implementing M3 should:
1. Wire every `Player.ts` and `Game.ts` VFX site listed in `analysis.md` Section 1 to `getSkinVfxProfile(characterId, skinId)` and `emitSkinAccentParticle`, plus optional `markTint` on `Enemy.applyElementalMark` (`analysis.md` Section 1.3).
2. Refactor `Entities.ts` (`ProjectileConfig`, `Projectile`, `MagmaPillar`, `IceWall.update` line 205) per `analysis.md` Section 2, removing `color === '#facc15'` / `'#a855f7'` checks.
3. Harden lifecycle cleanup (`MAX_SLASH_TRAILS = 24`, `MAX_AFTERIMAGES = 24`, `setCharacter()` clear, `updateIdleOnTitle()` tick/prune, `getActiveVfxCounts()`, `syncHudThrottled` `fp` including `this.skinId`, `enterTitleState`/`startMode` timer resets) per `analysis.md` Section 3.

## 5. Verification Method

1. **Unit & Combat Regression**: Run existing `rules.test.ts` (17/17 tests) and M3/E2E lifecycle tests using Android `esbuild` + `tsx`:
   ```bash
   cp node_modules/tsx/node_modules/@esbuild/android-arm64/bin/esbuild "$TMPDIR/esbuild_bin"
   chmod +x "$TMPDIR/esbuild_bin"
   ESBUILD_BINARY_PATH="$TMPDIR/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts
   ```
2. **Lifecycle & Spam Stress Check (R2)**:
   - Simulate `>= 50` consecutive attacks via `Player.update()`, verify `player.getActiveVfxCounts().slashTrails <= 24` and `afterimages <= 24` during spam, and verify both equal `0` after `0.5s` of idle ticks (both in `update()` and `updateIdleOnTitle()`).
   - Verify `ParticleSystem.getActiveCount()` returns to `0` after `3.0s` of `particles.update(dt)` with no further emissions, and verify `player.setCharacter(...)` immediately resets `getActiveVfxCounts()` to `{ slashTrails: 0, afterimages: 0 }` across rapid skin switches.
3. **Inspection**: Verify `grep` in `src/game/Entities.ts` shows zero `color === '#'` checks, and `grep` in `src/game/Player.ts` shows zero `this.skinId === 'radiant_seraph'` or `'void_walker'` VFX color branches.
4. **Production Build**: Run `node node_modules/vite/bin/vite.js build` in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman_build` per `PROJECT.md:121`.
