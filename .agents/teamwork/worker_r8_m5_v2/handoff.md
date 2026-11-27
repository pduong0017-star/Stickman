# Handoff Report — `worker_r8_m5_v2` (M5 — R5 Distinct Awakened Skill Transformations for `mactien:xuan_feng_sage`)

**Type:** Hard Handoff  
**Exclusive Modified Files:** `src/game/Entities.ts`, `src/game/Player.ts`, `src/game/Game.ts`

---

## 1. Observation

### 1.1 `chrono_sovereign` Reference Inspection (Pre-Edit)
- `src/game/Entities.ts`: `TemporalEcho` (`2522, 2524, 2591`) checks `this.skinId === 'chrono_sovereign'` for distinct primary/secondary colors and custom underfoot dial rendering inside `ctx.save(); try { ... } finally { ctx.restore(); }`.
- `src/game/Player.ts`: `startAttack` (`2307-2310`, `2607`, `2723`) branches on `this.skinId === 'chrono_sovereign'` for trail styles, sparks, shards, shockwaves, and `pushAfterimage`.
- `src/game/Game.ts`: `isChronoDomainOwner` (`258`), `detonateTimeStopDamage` (`1513`), `executeTemporalEchoStrike` (`1568, 1590`), and Time Stop overlay (`4372`) scale visual intensity and damage multipliers cleanly for the mythic skin without altering other skins.

### 1.2 Implemented Changes
1. **`src/game/Entities.ts`**:
   - Added `'bamboo_blade' | 'jade_seal_wave'` to `ProjectileKind` (`499-511`).
   - Added Ink-Wash Canvas 2D rendering branches in `Projectile.render` (`1330-1553`) wrapped in `try { ... } finally { ctx.restore(); }` with zero `ctx.shadowBlur`:
     - `'bamboo_blade'` (`1330-1449`): Soft ink-jade trailing wake (`#1e293b` / `#5eead4`), beveled two-facet jade bamboo slip (`#5eead4` / `#2dd4bf`) with `#0f172a` / `#1e293b` ink outline, `#fde68a` pale-gold binding cords and engraved rune, `#f8fafc` core highlight ridge, and 4-point star glint at the nib tip.
     - `'jade_seal_wave'` (`1450-1553`): Ink-jade pushback wake, rotating jade-teal calligraphy seal ring (`#2dd4bf` / `#5eead4`), open `#f8fafc` Enso brush arc, 8 `#fde68a` Confucian radial ticks, counter-rotating inner jade ring, and upright central `'静'` glyph.

2. **`src/game/Player.ts`**:
   - `pushAfterimage` (`254-265`): Always populates `skinId: item.skinId ?? this.skinId`, `awakened: item.awakened ?? this.awakened`, and `characterId: item.characterId ?? this.character.id`. Also explicitly populated `awakened` and `characterId` at dash start (`990-991`), dash ticks (`1164-1165`), attack momentum afterimages (`1192-1193`), and awakened `xuan_feng_sage` melee afterimages (`2874-2875`).
   - Awakened Dash (`963-1025`, `1167-1171`): When `isXuanFengDash && this.awakened`, emits extra dissolving peach blossom petals (`#fda4af`), `#5eead4` ink mist (`emitSmoke` + `ink_splatter`), and `#fde68a` stars both at dash initiation and per dash afterimage tick, with a moonlight-white/jade/pale-gold afterimage palette.
   - Awakened `[U]` (`triggerSignatureSkill` `'ink_seal'`, `1686-1692`): Emits `'VĂN THÁNH TRẤN THIÊN TRẬN!'` in `#fde68a` with `#fde68a` shockwave and stars when `this.awakened` (preserving `'TĨNH TỰ ẤN · 静!'` in `#5eead4` when unawakened).
   - Basic Combo Hit 3 & Hit 4 (`2683-2726`):
     - Hit 3 (`context === 'ground' && step === 3 && !this.awakened`): emits dual ink-ripple shockwaves (`#5eead4`, `#f8fafc`) and spawns 2 darting `'bamboo_blade'` projectiles forward (`[-0.06, 0.06]` spread, `vx: facing * 920`, `maxLife: 0.34`, `damage: 10`).
     - Hit 4 (`context === 'ground' && step === 4`): emits `#2dd4bf` + `#fde68a` shockwaves and spawns a short-range rotating `'jade_seal_wave'` pushback projectile (`vx: facing * 520`, `radius: 34`, `maxLife: 0.34`).
   - Awakened Basic Attacks (`Ngự Bút Thiên Hành`, `2831-2878`, `2938-2941`):
     - On each attack when `mactien:xuan_feng_sage` is Awakened, summons 2–3 elevated `'bamboo_blade'` projectiles behind/above (`y - 110..-132`) slashing diagonally downward across range (`vx: facing * 830..970`, `vy: 230..340`, `maxLife: 0.42`) with `#fde68a` star glints.
     - Added `+24` reach bonus (`xuanFengAwakenedReach`) in `spawnCurrentHitbox` (`2938-2940`) exclusively when `character.id === 'mactien' && skinId === 'xuan_feng_sage' && awakened`.

3. **`src/game/Game.ts`**:
   - Added `slipTickTimer?: number` to `inkSeals` item type (`126`).
   - Glowing Hanzi Impact Flashes (`2683-2707` melee, `2963-2991` projectiles):
     - Flashes Hanzi calligraphy glyphs (`'春'`, `'風'`, `'文'`, `'雅'`, `'靜'`, `'禮'`) via `this.particles.emitText` (`#f0fdfa` / `#5eead4` / `#fde68a`), emits diagonal `#5eead4` slash beam + `#fda4af` petals + `#fde68a` stars (Awakened), applies `'mactien'` ink mark on `'bamboo_blade'` hits, and allows `'bamboo_blade'` and `'jade_seal_wave'` to pierce via `proj.hitEnemyIds` (`2999-3011`).
   - Awakened `[U]` — `Văn Thánh Trấn Thiên Trận` update (`2081-2253`):
     - During the `1.1s` pin phase when `seal.skinId === 'xuan_feng_sage' && seal.awakened`, rains `'bamboo_blade'` projectiles steeply downward (`vy: 940`) every `0.15s` with diagonal `#5eead4` `emitSlashBeam`s, `#fda4af` petals, and `#5eead4` ink splatter.
     - At detonation (`2205-2240`), triggers razor-sharp ink cross-slashes (`emitCrossSlash` `#1e293b` + `#5eead4`), `#fde68a` / `#f8fafc` slash beams, `#fde68a` / `#5eead4` shockwaves, petals, stars, `triggerImpactFrame`, and `'VĂN THÁNH TRẤN THIÊN TRẬN!'` in `#fde68a`.
   - Awakened `[U]` render (`4199-4391`):
     - When `isXuanFengSeal && seal.awakened`, renders a 3-tier Formation Ring: Tier 1 pale-gold (`#fde68a`) outer ring + 12 Confucian ticks + outer jade rim; Tier 2 ink (`#1e293b`) & moonlight-white (`#f8fafc`) Enso brush ring + 3 swirling spring wind arcs + 6 peach blossom petals; Tier 3 counter-rotating octagonal jade inner ring (`#2dd4bf` / `#5eead4`) + 4-point star glints; plus 4 orbiting sub-seals (`'禮'`, `'義'`, `'仁'`, `'智'`), raining bamboo slips, climax cross-slash flash, and central `'靜'`.

### 1.3 Verification Results
- `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` (from `/data/user/0/com.agy/files/stickman-build`):
  - **0 errors** across all `src/` files (`Entities.ts`, `Player.ts`, `Game.ts`, and all other `src/` files).
  - Exit code 2 solely due to 9 pre-existing errors in excluded `tests/e2e/` (`testHarness.ts`, `r3_inkwash.e2e.test.ts`, `tier1_features.e2e.test.ts`).
- `ctx.save()` / `ctx.restore()` balance & `shadowBlur` check:
  - `src/game/Entities.ts`: `saves: 42, restores: 42, balanced: true, shadow: 0`
  - `src/game/Player.ts`: `saves: 2, restores: 2, balanced: true, shadow: 0`
  - `src/game/Game.ts`: `saves: 22, restores: 22, balanced: true, shadow: 0`
  - Entire `src/` scan for `shadowBlur\s*=|ctx\.shadowBlur`: `[]` (0 matches).
  - `src/game/renderer/` scan for `performance.now`: 0 matches.
- `rules.test.ts` (`node --test ... src/game/rules.test.ts`): 14/17 pass; 3 pre-existing failures unrelated to M5 (`characters.ts` 9 vs 8, `animation.ts` `mactien` pose count, `rules.ts` blessing `damageMult > 1.3`).

---

## 2. Logic Chain
1. Adding `'bamboo_blade'` and `'jade_seal_wave'` to `ProjectileKind` and `Projectile.render` in `Entities.ts` provides reusable, ink-wash Canvas 2D projectile entities without altering any existing projectile kinds.
2. Populating `awakened` and `characterId` in `Player.pushAfterimage` (and call sites) ensures `renderer/trails.ts` receives full state metadata on every dash/attack ghost without M5 editing `trails.ts`.
3. Scoping Hit 3/Hit 4 spawns, Awakened `Ngự Bút Thiên Hành` elevated slips, `+24` reach bonus, and awakened dash particles behind `character.id === 'mactien' && skinId === 'xuan_feng_sage'` guarantees zero behavioral regression for default `mactien` or any other fighter.
4. Wiring Hanzi impact flashes, `'mactien'` ink marks, piercing (`hitEnemyIds`), and `Văn Thánh Trấn Thiên Trận` update/render in `Game.ts` completes the gameplay loop from `Player` spawns to `Entity` rendering and enemy damage/feedback.

---

## 3. Caveats
1. **Excluded files untouched:** `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts` were neither read nor modified; E2E tests were not run per dispatch constraints.
2. **Pre-existing `rules.test.ts` failures:** `rules.test.ts` fails 3 assertions in `characters.ts`/`animation.ts`/`rules.ts` (unrelated to M5's owned files `Entities.ts`, `Player.ts`, `Game.ts`).
3. **Color discipline:** Verified no harsh yellow (`#facc15`, `#eab308`, `#fde047`) exists in any `xuan_feng_sage` block across `Entities.ts`, `Player.ts`, and `Game.ts` (the single `#fde047` in `Player.ts:2882` belongs to the pre-existing `default` Kim Mặc `else` branch).

---

## 4. Conclusion
M5 (R5 Distinct Awakened Skill Transformations for `mactien:xuan_feng_sage`) is complete across `src/game/Entities.ts`, `src/game/Player.ts`, and `src/game/Game.ts`, with 0 TypeScript errors in `src/`, 0 `ctx.shadowBlur`, balanced `ctx.save()`/`ctx.restore()`, and strict file-ownership compliance.

---

## 5. Verification Method
Run from `/data/user/0/com.agy/files/stickman-build`:
1. **Type-check:**
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
   Confirm 0 errors in `src/` (only the 9 pre-existing `tests/e2e/` errors remain).
2. **Static invariants (from `/storage/emulated/0/Antigravity/Stickman`):**
   ```bash
   node -e "const fs=require('fs'); for (const f of ['src/game/Entities.ts','src/game/Player.ts','src/game/Game.ts']) { const s=fs.readFileSync(f,'utf8'); console.log(f, (s.match(/ctx\.save\(\)/g)||[]).length === (s.match(/ctx\.restore\(\)/g)||[]).length, (s.match(/ctx\.shadowBlur/g)||[]).length); }"
   ```
3. **Invalidation conditions:** Any TypeScript error in `src/game/Entities.ts`, `src/game/Player.ts`, or `src/game/Game.ts`, any `ctx.shadowBlur` usage, or any unbalanced `save()`/`restore()`.
