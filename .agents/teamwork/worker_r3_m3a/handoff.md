# Worker M3A Handoff — EnemyVisuals, Monsters, Elites, 12 Bosses & Projectiles

**Status**: Complete (`HEADLESS_M3A_PASS`, 6/6 M3A `r3_inkwash.e2e.test.ts` checks pass, `rules.test.ts` 17/17, `vite build` exit 0, zero `shadowBlur`, mirror synced with `fcntl.flock`).

---

## 1. Observation

### 1.1 Files Created / Modified (Exclusive M3A Ownership)
1. **`src/game/enemyVisuals.ts`** *(new)*:
   - Exports `RegularEnemyType`, `EnemyVisualProfile`, `getEnemyVisualProfile(type, isElite = false, phase = 1)`, and `listAllEnemyVisualProfiles()`.
   - Maps all **8 normal enemies** to dedicated `EnemyOutfitId`s: `meta_melee` → `meta_mob`, `deepseek_gunner` → `gunner_mob`, `swarm_blade` → `swarm_mob`, `shield_guard` → `aegis_mob`, `cyber_ninja` → `ninja_mob`, `heavy_brute` → `brute_mob`, `frost_mage` → `arcanist_mob`, `berserker_reaper` → `reaper_mob`.
   - Applies **Elite (`isElite = true`)** overrides with distinct `bodyColor`, `rimColor`, `accentColor`, `vermilionAccent`, heavier brush weights (`10.0` / `12.0` for `heavy_brute`), and projectile tint overrides.
   - Maps all **12 Bosses** (`boss_haiku` .. `boss_omega`) to 12 unique `EnemyOutfitId`s (including dedicated `'raiden'`, `'akaza'`, `'kronos'`, `'omega'`), stage-contrast-safe `rimColor`/`vermilionAccent` (addressing dark/same-hue traps on `shadow_sanctum`, `chaos_abyss`, `blood_shrine`, `crimson_dojo`, `mirage_oasis`, `cryo_citadel`, `sovereign_throne`), `capeColor`, `phase2BodyColor`, `phase2RimColor`, `phase2AuraMode`, and `projectileColor`/`projectileRimColor`.
2. **`src/game/Enemy.ts`**:
   - Imports `getEnemyVisualProfile` (`./enemyVisuals`) and `colorWithAlpha` (`./renderer/inkStyle`).
   - Wires `getEnemyVisualProfile(this.type, this.isElite)` into `Enemy.render()` (lines 957–1050), passing `bossOutfit: profile.outfit`, `entityTier: this.isElite ? 'elite' : 'mob'`, `inkRimColor: profile.rimColor`, `inkAccent: profile.vermilionAccent`, `inkWash: true`, `bodyColor: profile.bodyColor`, `glowColor: profile.accentColor`, `lineWidth: profile.lineWidth`, `headRadius: profile.headRadius` to `renderStickman`.
   - Added Ink-Wash Elite rank crest ring beneath feet (`Enemy.ts:989-1015`) and upgraded Elite overhead badge to an ink-bordered pill (`Enemy.ts:1129-1143`) wrapped inside `ctx.save()` / `try { ... } finally { ctx.restore(); }` — fixing the `ctx.font` / `ctx.textAlign` state leak.
   - Clamped overhead HP bar ratio to `[0, 1]` with `Math.max(1, ...)` guard (`Enemy.ts:1115-1117`).
   - Passed `projProfile.projectileColor` and `projProfile.projectileRimColor` when spawning `cyber_ninja` (line 491), `deepseek_gunner` (line 742), and `frost_mage` (line 803) projectiles without changing speed, radius, or damage.
   - Kept all Enemy stats, AI, hitboxes, `isShieldActive()`, and `takeDamage()` untouched.
3. **`src/game/Boss.ts`**:
   - Imports `getEnemyVisualProfile` (`./enemyVisuals`) and `colorWithAlpha` (`./renderer/inkStyle`).
   - Wires `getEnemyVisualProfile(this.bossId, false, this.phase)` into `Boss.render()` (lines 1609–1752), assigning all 12 dedicated `bossOutfit`s via `profile.outfit`, passing `entityTier: 'boss'`, `enragePhase: this.phase`, `inkRimColor: profile.rimColor`, `inkAccent: profile.vermilionAccent`, `inkWash: true`, `capeColor: profile.capeColor`, `darkAura: this.phase === 2 ? (profile.phase2AuraMode ?? 'crimson') : 'none'`.
   - Clamped `boss_sol` windup telegraph progress `p = clamp(..., 0, 1)` (`Boss.ts:1616-1620`) and used `colorWithAlpha('#22d3ee', 0.45 + p * 0.55)`.
   - Upgraded Phase 2 ground aura ring (`Boss.ts:1632-1680`) to a multi-layered sumi-ink calligraphy ring + vermilion dashed inner ring + 4 orbiting diamond ink sigil ticks (zero `shadowBlur`), wrapped in `try/finally`.
   - Passed theme-matched `rimColor` on all Boss `Projectile` spawns (`boss_astra`, `boss_glacius`, `boss_opus`, `boss_sol`, `boss_nyx`, `boss_fable`, `boss_raiden`, `boss_akaza`, `boss_kronos`, `boss_omega`) without modifying velocity, radius, or damage.
   - Kept all Boss stats, `BOSS_ROSTER` invariants, AI, hitboxes, `isShieldActive()`, and `takeDamage()` untouched.
4. **`src/game/Entities.ts`**:
   - Imports `colorWithAlpha` and `finiteOr` from `./renderer/inkStyle`.
   - Fixed `spear` (`Entities.ts:1145-1197`) and `orb` (`Entities.ts:1198-1239`) projectiles in `Projectile.render()` to honor `this.color` and `this.rimColor` (replacing hardcoded `#7dd3fc` and `#d946ef`) with sumi-ink outlines, outer trail rim wakes, and bright core highlights; also made `laser` and `bullet` honor `this.color` / `this.rimColor` cleanly.
   - Replaced all 4 fragile `${color}XX` hex-suffix concatenations with `colorWithAlpha(...)` in `LootOrb.render()` (`Entities.ts:1578`), `StageHazard.render()` (`Entities.ts:1739`), and `SoulCrystal.render()` (`Entities.ts:1974, 1982`).
   - Wrapped `IceWall.render()`, `Projectile.render()`, `LootOrb.render()`, and `SoulCrystal.render()` outer `ctx.save()` calls in `try { ... } finally { ctx.restore(); }` and removed duplicated `ctx.restore()` before early `return`s in `IceWall.render()`.

### 1.2 Verification Outputs (Observed Verbatim)
- **Static Audit** (on all 4 owned files):
  - `enemyVisuals.ts: save=0, restore=0, shadowBlur=False, bad_api=[], hex_hits=[]`
  - `Enemy.ts: save=7, restore=7, shadowBlur=False, bad_api=[], hex_hits=[]`
  - `Boss.ts: save=4, restore=4, shadowBlur=False, bad_api=[], hex_hits=[]`
  - `Entities.ts: save=33, restore=33, shadowBlur=False, bad_api=[], hex_hits=[]`
- **Headless Mock-Canvas2D Verification**:
  - `{"enemyRenders":112,"bossRenders":144,"entityRenders":21,"mobNormalSigs":8,"p1Sigs":12,"p2Sigs":12,"spearSigs":4,"orbSigs":5,"status":"HEADLESS_M3A_PASS"}`
  - Verified `saveCount === restoreCount`, `getSaveDepth() === 0`, `shadowBlurUsed === false`, `nanDetected === false`, zero `ctx.font`/`ctx.textAlign` leaks, distinct Normal vs Elite traces across all 8 mobs, distinct P1 vs P2 and cross-boss traces across all 12 bosses, and `spear`/`orb` honoring distinct `color` & `rimColor`.
- **R3 E2E Suite (M3A Scope — `tests/e2e/r3_inkwash.e2e.test.ts`)**:
  - `R3-STATIC-01`: PASS (`0` `shadowBlur` across `src/`)
  - `R3-CONTRACT-02`: PASS (`enemyVisuals.ts` 8 mobs Normal/Elite + 12 bosses P1/P2)
  - `R3-ENEMY-01`: PASS (all 8 enemies Normal/Elite across 7 states, zero `font`/`textAlign` leak, distinct traces)
  - `R3-ENEMY-02`: PASS (clamped boundary HP bar & `ElementalMark`)
  - `R3-BOSS-01`: PASS (all 12 bosses P1/P2 across 6 states, distinct traces)
  - `R3-BOSS-02`: PASS (Boss Sol windup alpha clamp on `-0.2`, `0.2`, `0.95`)
  - Result: `6` pass, `0` fail.
- **Final Locked Mirror Sync + Unit Tests + Vite Build** (under `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock`):
  - `diff -q` on all 4 owned files vs `/data/user/0/com.agy/files/stickman-build/src` exited `0`.
  - `rules.test.ts`: `17` tests, `17` pass, `0` fail (`1164.79ms`).
  - `node node_modules/vite/bin/vite.js build`: `1695 modules transformed`, `dist/index.html` (`1.76 kB`), `dist/assets/index-Bn2_7MU2.css` (`42.22 kB`), `dist/assets/index-BGh2yNjV.js` (`769.11 kB`) in `1.31s`, exit `0`.

---

## 2. Logic Chain

1. Creating `src/game/enemyVisuals.ts` as a pure-data registry decouples Ink-Wash palette/outfit/contrast choices from Enemy/Boss simulation logic while ensuring all 8 mobs, Elites, and all 12 Bosses (P1/P2) map to distinct `EnemyOutfitId`s and stage-contrast rims.
2. Wiring `getEnemyVisualProfile` into `Enemy.ts` and `Boss.ts` (and fixing the Elite `ctx.font`/`ctx.textAlign` leak, HP ratio clamp, Sol telegraph clamp, Phase 2 calligraphy floor ring, and theme-matched projectile colors) guarantees visual differentiation across tiers and phases without altering AI, hitboxes, `maxHp`, `speed`, `damage`, `isShieldActive()`, or `takeDamage()`.
3. Updating `Entities.ts` so `spear`/`orb`/`laser`/`bullet` honor `this.color` and `this.rimColor`, replacing all `${color}XX` concatenations with `colorWithAlpha`, and wrapping `save()`/`restore()` blocks in `try/finally` eliminates hardcoded projectile colors, non-hex color crashes, and early-return state leaks.

---

## 3. Caveats

- Only M3A-owned files (`src/game/enemyVisuals.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`) were created or edited; `src/game/renderer/gear.ts` (M2A), `src/game/renderer/trails.ts` + `Player.ts` (M2B), and `src/game/PeriodicTableBG.ts` + `stages.ts` + `Game.ts` (M3B) belong to peer workers in parallel execution.
- Full Pillow PNG contact-sheet verification (`--r3 --render-r3`) and integrated Tier 1–5 E2E verification run after M2A, M2B, M3A, and M3B all complete (Milestone M4).

---

## 4. Conclusion

Milestone M3A is complete and verified. `src/game/enemyVisuals.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, and `src/game/Entities.ts` pass static audits (`0` `shadowBlur`, balanced `save/restore`, `0` fragile hex concatenations), headless mock-Canvas2D verification (`HEADLESS_M3A_PASS`), all 6 M3A tests in `tests/e2e/r3_inkwash.e2e.test.ts`, `rules.test.ts` (`17/17`), and `vite build` (exit `0`) with mirror sync verified under `fcntl.flock`.

---

## 5. Verification Method

1. Static audit on owned files:
   ```bash
   python3 -c "import pathlib, re; [print(p, 'sb=', 'shadowBlur' in p.read_text(), 'save=', p.read_text().count('ctx.save('), 'restore=', p.read_text().count('ctx.restore(')) for p in map(pathlib.Path, ['src/game/enemyVisuals.ts','src/game/Enemy.ts','src/game/Boss.ts','src/game/Entities.ts'])]"
   ```
2. Unit tests & Vite build from `/data/user/0/com.agy/files/stickman-build` (under `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock`):
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
   node node_modules/vite/bin/vite.js build
   ```
3. M3A E2E checks from `/storage/emulated/0/Antigravity/Stickman`:
   ```bash
   ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --test-name-pattern="R3-CONTRACT-02|R3-ENEMY|R3-BOSS|R3-STATIC-01" --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs tests/e2e/r3_inkwash.e2e.test.ts
   ```
4. **Invalidation conditions**: Any edits to `src/game/enemyVisuals.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`, or `src/game/renderer/inkStyle.ts` / `types.ts` require re-syncing to `/data/user/0/com.agy/files/stickman-build/src` and re-running steps 1–3.
