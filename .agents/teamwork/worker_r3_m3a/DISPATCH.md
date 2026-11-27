# Worker Dispatch — M3A: EnemyVisuals, Monsters, Elites, 12 Bosses & Projectiles

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1/handoff.md`
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_2/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m3a`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **EXCLUSIVE Write Ownership (ONLY edit/create these files)**:
  - `src/game/enemyVisuals.ts` *(new)*
  - `src/game/Enemy.ts`
  - `src/game/Boss.ts`
  - `src/game/Entities.ts`
- **FORBIDDEN**: Do NOT modify ANY other file in `src/` or `tests/`. Do NOT touch Enemy/Boss AI, hitboxes, `maxHp`, `speed`, `damage`, `isShieldActive()`, `takeDamage()`, or `BOSS_ROSTER`.

## Detailed Scope & Design Requirements
1. **`src/game/enemyVisuals.ts` *(new)***:
   - Pure-data visual registry mapping all **8 normal enemies** (`meta_melee`, `deepseek_gunner`, `swarm_blade`, `shield_guard`, `cyber_ninja`, `heavy_brute`, `frost_mage`, `berserker_reaper`), **Elite** overrides (`isElite = true`), and **all 12 Bosses** (`boss_haiku`..`boss_omega`) in both **Phase 1 (`phase = 1`)** and **Phase 2 (`phase = 2`)** to distinct Ink-Wash profiles (`EnemyVisualProfile`):
     - Dedicated `EnemyOutfitId` (`meta_mob`, `gunner_mob`, `swarm_mob`, `aegis_mob`, `ninja_mob`, `brute_mob`, `arcanist_mob`, `reaper_mob`, and `haiku`..`omega` including dedicated `raiden`, `akaza`, `kronos`, `omega`).
     - High-contrast `rimColor` & `vermilionAccent` chosen specifically to counter dark/same-hue stage contrast traps (e.g. crisp chalk/silver/pale-gold rim on `shadow_sanctum`/`chaos_abyss`, crisp bone-white/cyan/obsidian separation for `akaza`/`opus` on `blood_shrine`/`crimson_dojo`, deep ink-shadow + bright rim for `kronos` on `mirage_oasis`, `glacius` on `cryo_citadel`, `fable` on `sovereign_throne`).
     - `phase2BodyColor`, `phase2RimColor`, `phase2AuraMode`, and `projectileColor` / `projectileRimColor`.
2. **`src/game/Enemy.ts`**:
   - Wire `getEnemyVisualProfile(this.type, this.isElite)` into `Enemy.render()`.
   - Pass `bossOutfit: profile.outfit`, `entityTier: this.isElite ? 'elite' : 'mob'`, `inkRimColor: profile.rimColor`, `inkAccent: profile.vermilionAccent` to `renderStickman`.
   - Upgrade Elite overhead badge & aura ring with clean ink-wash crest; **fix `Enemy.ts:1098-1103` `ctx.font`/`ctx.textAlign` state leak** by wrapping inside `ctx.save()/ctx.restore()` (with `try/finally`), and clamp `this.hp / Math.max(1, this.maxHp)` to `[0, 1]`.
   - Pass theme-matched projectile colors when spawning `frost_mage` / `deepseek_gunner` projectiles if applicable without changing speed/damage/radius.
3. **`src/game/Boss.ts`**:
   - Wire `getEnemyVisualProfile(this.id, false, this.phase)` into `Boss.render()`.
   - Assign dedicated `bossOutfit` for ALL 12 Bosses (fixing `boss_raiden`, `boss_akaza`, `boss_kronos`, `boss_omega` reusing earlier outfits!).
   - Pass `entityTier: 'boss'`, `enragePhase: this.phase`, `inkRimColor: profile.rimColor`, `inkAccent: profile.vermilionAccent` to `renderStickman`.
   - Clamp `p` at `Boss.ts:1613` to `[0, 1]`, and use `colorWithAlpha` from `inkStyle.ts` cleanly; enhance Phase 2 floor ring with ink-wash calligraphy ring + vermilion/accent energy (no `shadowBlur`).
4. **`src/game/Entities.ts`**:
   - Fix `spear` (`Entities.ts:1140`) and `orb` (`Entities.ts:1150-1166`) projectiles so they honor `this.color` / `this.rimColor` (instead of hardcoded `#7dd3fc` and `#d946ef`!) with crisp ink-wash core + outer trail rim.
   - Replace fragile `${color}33` hex concatenation (`Entities.ts:1490, 1647, 1881, 1889`) with `colorWithAlpha` from `inkStyle.ts`.
   - Verify `ctx.save()` / `ctx.restore()` balance on all early-return paths (zero `shadowBlur`, zero `arcTo`/`clip()`/`transform()`).

## Concurrency-Safe Mirror Sync & Verification
Serialize access to `/data/user/0/com.agy/files/stickman-build` with Python `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock`, sync `src/` into `$BUILD/src`, run `rules.test.ts` (17/17) and `node node_modules/vite/bin/vite.js build`, verify static `shadowBlur === 0`, and run a headless mock-Canvas2D test rendering all 8 mobs (Normal & Elite), all 12 Bosses (Phase 1 & Phase 2), and `Projectile` (`spear`/`orb`) asserting `save/restore === 0`, `shadowBlurUsed === false`, zero `NaN`/exceptions.
Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m3a/handoff.md` and message `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.

## 2026-11-26T10:12:45Z
Sender: `07826cb9-c437-445a-9ca0-4b73578e251e`
You are Worker `worker_r3_m3a` executing Milestone **M3A** (EnemyVisuals, Monsters, Elites, 12 Bosses & Projectiles) for Scarlet Sheath R3.

- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m3a`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **Parent Orchestrator ID**: `07826cb9-c437-445a-9ca0-5b1da3c3e51d`

EXCLUSIVE WRITE OWNERSHIP: ONLY create/edit `src/game/enemyVisuals.ts`, `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/game/Entities.ts`. Keep all Enemy/Boss stats, AI, hitboxes, `isShieldActive()`, and `takeDamage()` untouched.
