# Module 2 Handoff — Soft Brush Trails, Seals & Afterimages (`xuan_feng_sage`)

## 1. Observation

### Modified Files (Exclusive Ownership)
1. `/storage/emulated/0/Antigravity/Stickman/src/game/renderer/types.ts`
   - Lines `118-122`: Added `| 'xuan_feng_brush'` to `SlashTrailStyle`.
   - Lines `144-152`: Added `skinId?: SkinId;` to `Afterimage`.
2. `/storage/emulated/0/Antigravity/Stickman/src/game/renderer/trails.ts`
   - Lines `19-115` (`renderAfterimages`): Added `isXuanFeng = a.skinId === 'xuan_feng_sage'` branch skipping the `#0b0c10` outline/splatter circles and rendering a translucent white-jade dissipating ink-mist silhouette (`#f8fafc`, `#ccfbf1`, `#5eead4` soft rim, 3 drifting mist ellipses).
   - Line `132` (`inferCharacterForSkin`): Added `if (skinId === 'xuan_feng_sage') return 'mactien';`.
   - Lines `320-400` (`renderAttackSwingAura`): Added `isXuanFeng` branch rendering a delicate open jade-teal Enso brush arc (`#5eead4` + `#f8fafc` sheen) and 2 small `#fda4af` petal flecks instead of the heavy `#090b10` ring/blobs; lines `1070-1080` added `case 'xuan_feng_calligraphy':` gentle curved breeze filaments.
   - Line `1137` (`resolveSlashMotif`): Added `if (s.style === 'xuan_feng_brush') return 'xuan_feng_calligraphy';`.
   - Lines `2607-2795` (`renderSlashTrails`): Inserted `xuan_feng_brush` branch right before `ink_brush_stroke` rendering a finer 2-layer white-jade/dark-ink tapered silk ribbon (`maxHalfW = Math.max(3, thickness * 0.62 * inv)`, `taper = Math.pow(Math.sin(u * Math.PI), 0.96) * ...`), 3 peach blossom petals / jade bamboo leaves along the sweep, and a fine-lined jade-teal `'静'` seal ring with 4 rotating `#fda4af` petals on finisher swings.
3. `/storage/emulated/0/Antigravity/Stickman/src/game/animation.ts`
   - Lines `363-374` (`getAwakenedVisualProfile`, `case 'mactien':`): Added `xuan_feng_sage` profile (`formTitle: 'XUÂN PHONG VĂN THÁNH'`, `scarfPrimary: '#f8fafc'`, `scarfHighlight: '#5eead4'`, `upgradedSpecialName: 'XUÂN PHONG · TĨNH ẤN'`, `auraAccent: '#5eead4'`, `transformationCallout: 'THỨC TỈNH: XUÂN PHONG · BẠCH NGỌC!'`).
   - Lines `458-463` (`getComboMoveForCharacter`): Added optional 4th parameter `skinId: SkinId = 'default'`.
   - Lines `557-578` (`dash_slash`), `671-692` (`parry_counter`), `939-999` (`air` 1–3), `1056-1143` (`mactienTable` 1–4): Branched `trailStyle: 'xuan_feng_brush'` and subtly lifted/lighter `slashArcs` (`sa`, `ea`, `yOffset`, `style: 'xuan_feng_brush'`) for `xuan_feng_sage` with all combat fields unchanged.
4. `/storage/emulated/0/Antigravity/Stickman/src/game/Player.ts`
   - Line `166`: Added `skinId?: SkinId;` to `pendingInkSeals`.
   - Line `257` (`pushAfterimage`): Defaulted `skinId: this.skinId` when omitted.
   - Lines `660-673` (Awakening VFX), `945-1002` (Dash start burst), `1094-1135` (Dash/attack-move afterimages), `1586-1622` (`[U]` `ink_seal` cast), `2091-2104` (Skill Link VFX), `2145` (`getComboMoveForCharacter(..., this.skinId)`), `2243-2285` (Trail spawning), `2340` (Finisher afterimage `skinId`), `2521-2550` (Normal strike VFX), and `2623-2662` (Awakened melee VFX): Added `this.skinId === 'xuan_feng_sage'` branches using `'xuan_feng_brush'`, jade-teal/white-jade shockwaves/mist, peach blossom petals (`emitPetals`, `'#fda4af'`), and white-jade afterimages.
5. `/storage/emulated/0/Antigravity/Stickman/src/game/Game.ts`
   - Line `125`: Added `skinId?: SkinId;` to `inkSeals`.
   - Lines `2054-2166`: Propagated `sealSkinId = req.skinId ?? this.skinId` into `inkSeals`, and branched seal spawn/stamp & detonation burst VFX (spring breeze `emitSlashBeam` + `emitPetals` + `#5eead4`/`#f8fafc` shockwaves + jade/peach `applyElementalMark` tint) while preserving all damage, root/pull physics, and hit registration.
   - Lines `3466-3479` & `3650-3687`: Branched `mactien` Ult per-enemy hit & activation VFX + passed `skinId: this.skinId` into Ult `inkSeals.push`.
   - Lines `4006-4112` (`inkSeals` render): Added `seal.skinId === 'xuan_feng_sage'` branch rendering white-jade ground mist, fine-lined `#2dd4bf`/`#f8fafc` dashed rings, 6 rotating `#fda4af` peach blossom petals, jade-haloed `'静'` glyph, and `ctx.setLineDash([])` in `finally`.
   - Lines `4502-4619` (`renderMacTienDomainBackdrop`): Added `isXuanFeng = this.skinId === 'xuan_feng_sage'` branch rendering moonlight-white/slate-teal mist, jade-teal calligraphy rings, and alternating peach blossom petals + jade bamboo leaves.

### Verification Outputs Observed
- `grep_search` for `shadowBlur` in `src/`: 0 code usages (11 matches are all comments saying `no shadowBlur`).
- `grep_search` for `performance.now` in `src/game/renderer/`: `No results found`.
- Node invariant script on the 5 modified files:
  - `renderer/types.ts`: `saves: 0, restores: 0, shadow: 0, perfNow: 0`
  - `renderer/trails.ts`: `saves: 46, restores: 46, balancedSaveRestore: true, dashNonEmpty: 4, dashReset: 2, shadow: 0, perfNow: 0` (each `try ... finally` block resets `ctx.setLineDash([])` before `ctx.restore()`)
  - `animation.ts`: `saves: 0, restores: 0, shadow: 0, perfNow: 0`
  - `Player.ts`: `saves: 2, restores: 2, balancedSaveRestore: true, shadow: 0, perfNow: 0`
  - `Game.ts`: `saves: 17, restores: 17, balancedSaveRestore: true, dashNonEmpty: 7, dashReset: 7, shadow: 0, perfNow: 0`
- `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` (from `/data/user/0/com.agy/files/stickman-build`): exited 2 with 24 pre-existing errors in 4 untouched files (`src/game/poses/chronoPoses.ts`, `tests/e2e/helpers/testHarness.ts`, `tests/e2e/r3_inkwash.e2e.test.ts`, `tests/e2e/tier1_features.e2e.test.ts`), and **0 errors** in all 5 Module 2 files.
- `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts`: 14/17 passed; 3 pre-existing failures (`9 !== 8` fighters, `mactien` 4-hit vs 5-pose assertion, `mods.damageMult > 1.3`), none introduced by Module 2.

---

## 2. Logic Chain

1. Because `SlashTrailStyle` (`renderer/types.ts:122`) and `Afterimage` (`renderer/types.ts:151`) now include `'xuan_feng_brush'` and `skinId?: SkinId`, `Player.ts` and `trails.ts` can cleanly isolate `mactien:xuan_feng_sage` ribbon trails, swing auras, and white-jade mist afterimages from `mactien:default` and all other fighters.
2. Because `getComboMoveForCharacter` (`animation.ts:458-463`) takes `skinId: SkinId = 'default'` as an optional 4th parameter, existing 3-argument callers (`Enemy.ts`, `rules.test.ts`) remain 100% backwards-compatible while `Player.ts:2145` passes `this.skinId` to get `'xuan_feng_brush'` and lighter/lifted `slashArcs` with unchanged combat metrics.
3. Because `pendingInkSeals` (`Player.ts:166`) and `inkSeals` (`Game.ts:125`) propagate `skinId`, all seal stamp, active ring rendering, spring-breeze detonation, and domain backdrop effects use the white-jade/jade-teal/peach-blossom palette exclusively when `skinId === 'xuan_feng_sage'`.
4. Static grep/AST-pattern checks confirm zero `ctx.shadowBlur`, zero `performance.now()` in `src/game/renderer/`, strictly paired `ctx.save()`/`ctx.restore()`, and `ctx.setLineDash([])` in `try ... finally`.

---

## 3. Caveats

- `tsc --noEmit` still reports 24 pre-existing errors in `src/game/poses/chronoPoses.ts` and `tests/e2e/*` (files outside Module 2 scope and excluded from modification).
- `src/game/rules.test.ts` has 3 pre-existing assertion mismatches (`characters.length` 9 vs 8, `mactien` 4-hit combo vs 5-pose check, and blessing `damageMult > 1.3`).
- Browser/E2E visual verification was intentionally skipped per dispatch constraints (`DO NOT run E2E tests or open a browser`).

---

## 4. Conclusion

Module 2 (`xuan_feng_sage` — "Xuân Phong Văn Thánh") is complete across all 5 owned files (`src/game/renderer/types.ts`, `src/game/renderer/trails.ts`, `src/game/animation.ts`, `src/game/Player.ts`, `src/game/Game.ts`) with zero overlap into M1/M3/excluded files, zero changes to hitboxes/damage/cooldowns/combat logic, zero TypeScript errors in any modified file, and full compliance with all Canvas 2D invariants.

---

## 5. Verification Method

From `/data/user/0/com.agy/files/stickman-build`:
1. Type-check (verify 0 errors in `renderer/types.ts`, `renderer/trails.ts`, `animation.ts`, `Player.ts`, `Game.ts`):
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
2. Production Vite bundle check (after M1 & M3 finish):
   ```bash
   node node_modules/vite/bin/vite.js build && cp -r dist/. "/storage/emulated/0/Antigravity/Stickman/dist/"
   ```
3. Static Canvas 2D invariant check from `/storage/emulated/0/Antigravity/Stickman`:
   - Confirm no `ctx.shadowBlur` in `src/` and no `performance.now()` in `src/game/renderer/`.
   - Confirm `ctx.save()` === `ctx.restore()` across all modified render functions.
4. Invalidation conditions: Any non-empty `ctx.shadowBlur` call, `performance.now()` in `src/game/renderer/`, unbalanced `save/restore`, or TypeScript error referencing M2 files invalidates this handoff.
