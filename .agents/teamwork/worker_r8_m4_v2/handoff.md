# Handoff Report — `worker_r8_m4_v2` (M4: R4 Refined Scholar Basic-Attack Poses & 3-Layer Trails)

**Type:** Hard Handoff (Task Complete)  
**Owner:** `worker_r8_m4_v2` (`teamwork_preview_worker`)  
**Parent:** `c811623b-be34-4c19-919f-c5b6447f28cd`

---

## 1. Observation

### 1.1 `chrono_sovereign` Benchmark References
Verified via `grep_search` across target files prior to editing:
- `src/game/StickmanRenderer.ts`: lines `1139`, `1721`, `1787`, `1791` (`motionArc` double arc + radial dial ticks, `skinMap`, underfoot dial aura).
- `src/game/animation.ts`: lines `343`, `679–681`, `950–952`, `1287–1289` (`chrono_sovereign_slash` assignments).
- `src/game/renderer/trails.ts`: lines `135`, `1079–1177` (`renderAttackSwingAura` `case 'chrono_sovereign':`), `1254`, `2130–2246` (`renderSlashMotifOrnament` `case 'chrono_sovereign':`), `2282–2290` & `2603` (`renderSlashTrails`).

### 1.2 Exact Changes Made Across the 5 Owned Files
1. **`src/game/poses/chronoPoses.ts`**:
   - Lines `87–90` (`case 'run':`): replaced `k.counterSwing` / `k.hipBounce` with `armSwing = -Math.cos(walkPhase)` and `hipBounce = Math.abs(Math.sin(walkPhase)) * 1.6`, matching `computeAnimeSprintStride` (`poseMath.ts:266–275`).
   - Lines `159–175` (`case 'land':`): replaced invalid object argument and `.hipY`/`.crouch` property accesses on `computeLandingCurve(t)` with scalar `const crouch = computeLandingCurve(t); const hipY = -47.6 + crouch * 14.1;` matching `computeLandingCurve(t: number, duration = 0.15): number` (`poseMath.ts:412`).
2. **`src/game/renderer/types.ts`**:
   - Lines `63–68`: added `'scholar_flick_1' | 'scholar_flick_2' | 'scholar_point_3' | 'scholar_palm_4' | 'scholar_dash_slash' | 'scholar_parry_counter'` to `StickPoseName` (retaining `xuan_feng_flick_1..4` for backwards compatibility).
3. **`src/game/StickmanRenderer.ts`**:
   - Lines `131–225` (`computeStickmanSkeleton`): implemented composed upright poses `scholar_flick_1` (`torsoLean: 0.02..0.06`, `spineBend: 0.4`, `handL` behind back at `{-17, -47}`), `scholar_flick_2` (`torsoLean: 0.01..0.05`, `spineBend: -0.6`, `handL` chest seal `{8, -62}`), `scholar_point_3` (`torsoLean: 0.04..0.08`, `spineBend: 0.6`, `handL` behind back `{-18, -46}`, `weaponAngle: -0.06 + (1 - snap) * -0.18`), `scholar_palm_4` (`torsoLean: 0.05..0.10`, `spineBend: 0.5`, open-palm forward push `handL` `{12 + snap * 22, -58}`, brush poised behind shoulder `weaponAngle: -2.08 + snap * 0.26`), `scholar_dash_slash` (`torsoLean: 0.12..0.14`, `spineBend: 1.2`), and `scholar_parry_counter` (`torsoLean: 0.04..0.10`, `spineBend: 0.6`).
   - Lines `1201–1260` (`renderStickman` `motionArc`): added `opts.characterId === 'mactien' && opts.skinId === 'xuan_feng_sage'` branch rendering ink-wash (`#1e293b`) + jade-teal (`#5eead4`) + white-jade (`#f8fafc`) silk double arc, 2 peach blossom petal flecks (`#fda4af`), and a 4-point star glint (`#f0fdfa`).
   - Lines `1333, 1340, 1451, 1482, 1501`: computed `const localVx = (opts.vx ?? 0) * facing;` inside the `ctx.scale(facing * safeScaleX, safeScaleY)` block and passed `localVx` to `renderSkinBackAttachment`, `renderSkinBodyArmor`, `renderSkinFrontAttachment`, and `renderWeapon`, fixing the Wave 1 Minor left-facing `vx` sign inversion.
4. **`src/game/animation.ts`**:
   - Lines `572, 689, 1090, 1109, 1128, 1147`: updated `getComboMoveForCharacter` for `characterId === 'mactien'` when `skinId === 'xuan_feng_sage'` to assign `'scholar_dash_slash'`, `'scholar_parry_counter'`, `'scholar_flick_1'`, `'scholar_flick_2'`, `'scholar_point_3'`, and `'scholar_palm_4'`, preserving all `baseDamage`, `duration`, `cancelRatio`, `heavy`, `unblockable`, `knockX`, `knockY`, `lungeSpeed`, and `slashArcs`.
5. **`src/game/renderer/trails.ts`**:
   - Lines `26–185` (`renderAfterimages` `isXuanFeng`): upgraded to render a translucent white-robed scholar silhouette (flowing scholar robe & wide sleeves polygons in `#f8fafc`/`#f0fdfa` with `#5eead4`/`#fde68a` rim over skeleton limbs), dissolving ink/jade mist ellipses, and drifting peach blossom petals (`#fda4af`), heightened with `#5eead4`/`#fde68a` Moonlight-Jade glow, 4 petals, and twin `drawFourPointStar` glints when `a.awakened` is true.
   - Lines `1284–1356` (`renderAttackSwingAura` `case 'xuan_feng_calligraphy':`): upgraded to match `chrono_sovereign` layering density with Confucian outer ring (`#1e293b`/`#2dd4bf`), pale-gold inner hairline (`#fde68a`), 8 counter-rotating engraved ticks, flowing white-jade silk ribbons, 4 rotating peach blossom petals (`#fda4af`), and twin 4-point star glints (`#f0fdfa`/`#fde68a`).
   - Lines `2415–2541` (`renderSlashMotifOrnament` `case 'xuan_feng_calligraphy':`): added pale-gold (`#fde68a`) & jade-teal (`#5eead4`/`#99f6e4`) calligraphic hairlines, concentric ink-wash & jade-teal ripples on brush-tip point flick (`rawSpan < 0 || Math.abs(rawSpan) < 1.1`), rotating Confucian seal ring with 4 petals and `'静'` on finisher (`isSealFinisher`), and twin `drawFourPointStar` glints.
   - Lines `2902–3068` (`renderSlashTrails` `xuan_feng_brush`): upgraded to a finer 3-layer silk ribbon (Layer 1: ink-wash bleed `#1e293b`/`#0f172a`; Layer 2: white-jade `#f8fafc`/`#ccfbf1` body + `lighter` jade-teal `#2dd4bf`/`#5eead4` glow with `#fde68a` shimmer on awakened/finisher; Layer 3: razor-sharp `#ffffff` tip filament along `u >= 0.45` + `#ffffff` tip star flare), drifting peach blossom petals, slender jade leaves, ink/jade droplets, and `renderSlashMotifOrnament(..., 'xuan_feng_calligraphy', ...)`.

### 1.3 Verification Results
- **TypeScript (`tsc --noEmit` from `/data/user/0/com.agy/files/stickman-build`)**: Exit code `2` with **0 errors across all `src/` files** (including all 5 owned files; the 15 pre-existing errors in `chronoPoses.ts` are gone). Only the 9 pre-existing errors in untouched excluded `tests/e2e/*` files remain.
- **Headless Mock Canvas 2D Verification (`node --import .../tsx/dist/loader.mjs`)**: Passed (`ALL CHECKS PASSED! Total balanced ctx.save/restore pairs: 425/425`), confirming finite coordinates in `chronoPoses`, `scholar_*` assignment in `getComboMoveForCharacter`, upright scholar torso lean (`[-0.05, 0.20]`), and balanced `ctx.save/restore` across `renderStickman`, `renderAfterimages`, `renderAttackSwingAura`, and `renderSlashTrails` for both `facing: 1` and `facing: -1`.
- **Static Invariants (`src/`)**:
  - `ctx.shadowBlur`: `0` assignments in `src/` (10 comment hits saying `no shadowBlur`).
  - `performance.now()` in `src/game/renderer/`: `0` hits.
  - `ctx.save()` / `ctx.restore()` file totals: `StickmanRenderer.ts` `16 / 16` (`diff = 0`), `renderer/trails.ts` `48 / 48` (`diff = 0`).
  - Harsh yellow (`#facc15` / `#eab308` / `#fde047`): `0` matches in any `xuan_feng` / `scholar` block.
- **Unit Test (`src/game/rules.test.ts`)**: `14/17` passed; the `3` failures are pre-existing in untouched logic (`9 !== 8` playable roster count, `mactien` 4-hit vs 5-pose combo assertion, roguelite `mods.damageMult > 1.3`).

---

## 2. Logic Chain
1. `chronoPoses.ts` failed compilation because `computeAnimeSprintStride` returns no `counterSwing`/`hipBounce` fields and `computeLandingCurve` returns a scalar `number`; deriving `armSwing`/`hipBounce` from `walkPhase` and `hipY` from `computeLandingCurve(t)` restores exact sprint/landing geometry with zero type errors.
2. Default `mactien` attacks in `animation.ts` used heavy/lunging poses (`attack_1` kick, `attack_2` hunched swing, `nodachi_overhead_slam`), which clashed with `xuan_feng_sage`'s serene scholar identity; mapping `xuan_feng_sage` in `getComboMoveForCharacter` to `scholar_flick_1..4`, `scholar_dash_slash`, and `scholar_parry_counter` keeps combat frame data identical while keeping `torsoLean` in `[0.01, 0.14]` and `spineBend` in `[-0.6, 1.2]`.
3. `StickmanRenderer.ts` applies `ctx.scale(facing * safeScaleX, safeScaleY)` before calling gear/weapon renderers, so multiplying `opts.vx` by `facing` (`localVx`) aligns tassel, pendant, and orbit lag direction in local space when facing left (`facing === -1`).
4. `trails.ts` upgrades (`xuan_feng_brush` 3-layer ribbon, `xuan_feng_calligraphy` ornament + swing aura, white-robed petal/mist `renderAfterimages`) use existing `SlashTrail` and `Afterimage` (`awakened?: boolean`) fields, requiring zero edits to M5 files (`Entities.ts`, `Player.ts`, `Game.ts`).

---

## 3. Caveats
- Excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) were neither read nor modified, and E2E tests were not run per dispatch instructions.
- `vite build` was deferred until M5 finishes so the full Wave 2 integration builds once cleanly.
- `xuan_feng_brush` awakened shimmer (`#fde68a`) and `renderAfterimages` awakened Moonlight-Jade mode rely on M5 (`Player.ts`) populating `awakened: this.awakened` on `Afterimage` items and optional awakened colors on `SlashTrail` (gracefully defaulting to normal scholar visuals otherwise).

---

## 4. Conclusion
M4 is **complete and verified**: all 15 `chronoPoses.ts` TypeScript errors are resolved, Wave 1's `facing * vx` minor finding is fixed, `xuan_feng_sage` now uses composed upright scholar poses across ground combos, dash-slash, and parry-counter with bespoke `motionArc` styling, and `trails.ts` renders 3-layer silk brush trails, Confucian swing auras, calligraphic ornaments (ink ripples, rotating `'静'` seal ring, 4-point star glints), and white-robed mist/petal afterimages with zero `src/` TS errors and 100% Canvas 2D invariant compliance.

---

## 5. Verification Method
Run from `/data/user/0/com.agy/files/stickman-build`:
1. **TypeScript Check**:
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
   Confirm `0` errors in `src/` (only the 9 pre-existing errors in `tests/e2e/`).
2. **Static Invariants** (from `/storage/emulated/0/Antigravity/Stickman`):
   - Confirm `0` `ctx.shadowBlur` assignments in `src/`, `0` `performance.now()` calls in `src/game/renderer/`, balanced `ctx.save()` / `ctx.restore()` in `StickmanRenderer.ts` (`16/16`) and `renderer/trails.ts` (`48/48`), and `0` harsh yellow (`#facc15`/`#eab308`/`#fde047`) in `xuan_feng`/`scholar` code.
3. **Invalidation Conditions**: Any TypeScript error in `src/`, any `ctx.shadowBlur` or `performance.now()` in `renderer/`, unbalanced `save/restore`, or overlap with M5 files (`Entities.ts`, `Player.ts`, `Game.ts`) invalidates this handoff.
