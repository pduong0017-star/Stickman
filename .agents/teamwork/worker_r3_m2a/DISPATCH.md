# Worker Dispatch — M2A: 18-Skin Gear, Awakening Wings/Auras & Mob/Boss Outfits

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1/handoff.md`
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_1/handoff.md`
5. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_2/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m2a`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **EXCLUSIVE Write Ownership (ONLY edit this file)**:
  - `src/game/renderer/gear.ts`
- **FORBIDDEN**: Do NOT modify ANY other file in `src/` or `tests/`.

## Detailed Scope & Design Requirements
Consume `inkStyle.ts` (`getSkinInkPalette`, `colorWithAlpha`, `finiteOr`) and `EnemyOutfitId` from `renderer/types.ts` (completed in M1):

### Part A — Playable 6 Characters & 18 Skins (`gear.ts`)
1. **Ink-Wash Headgear (`renderHeroHeadGear`)**:
   - Upgrade all headgear variants with crisp sumi-ink outlines (`#0b0c10`), cel-shading, and rim highlights.
   - Fix `'oni_horns'` so `kuro:eclipse_ronin` uses eclipse crimson/ember-gold ink horns (NOT icy blue `#bae6fd`!), while `kagura:frost_empress` keeps frost-crimson ink horns.
   - Fix `'valkyrie_wings'` so all 3 `valkyrie` skins (`default` gold-white, `celestial_empress` sapphire-gold, `abyssal_valkyrie` crimson-violet) use their skin palettes instead of hardcoded yellow.
   - Upgrade `'astral_halo'` for `aether:default` vs `aether:prismatic_archon`, plus ink-wash polish on `'volt_visor'`, `'shogun_crest'`, `'cyber_visor'`, `'flame_band'`, `'phoenix_crown'`, `'phantom_eyes'`, `'kitsune_mask'`, `'astral_hood'`, `'seraph_helm'`, `'void_helm'`.
2. **Ink-Wash Body Armor / Haori / Obi (`renderSkinBodyArmor`)**:
   - Ensure ALL 6 playable characters and ALL 18 skins (including all base `default` skins, `kuro:eclipse_ronin`, `aether` × 2, `valkyrie` × 3) have distinct ink-wash torso garments (haori lapels, obi sashes, shoulder pauldrons, armored chestplates, arcane runes, valkyrie breastplates) anchored cleanly to `joints.hip`, `joints.spineMid`, `joints.neck`, `joints.shoulderL/R`.
3. **Back Attachments (`renderSkinBackAttachment`)**:
   - Add missing back attachments for `kuro:eclipse_ronin` (eclipse sun-ring + tattered ink-vermilion haori streamers), `aether:default` & `aether:prismatic_archon` (floating ink-calligraphy arcane ring / floating glyph sigils), and `valkyrie` × 3 (skin-themed winged mantle / spear-halo).
4. **Awakened Forms (`renderAwakenedBackForm` & `renderAwakenedHeadForm`)**:
   - Add dedicated Awakened forms for **`aether`** (both skins: floating cosmic ink mandala / prismatic wings + crown sigil), **`valkyrie`** (all 3 skins: multi-tiered feathered/armored ink-wash Seraphic/Celestial/Abyssal wings + luminous war-helm halo), and **`kuro:eclipse_ronin`** (blood-moon eclipse halo + tattered oni-ronin banner/horns).
5. **Android Perf & Safety Cleanups in `gear.ts`**:
   - Remove the 2 per-frame gradients at `gear.ts:672,693` (`createRadialGradient` / `createLinearGradient`) and replace with layered ink-wash polygons/arcs.
   - Remove the dead `destination-out` toggle at `gear.ts:905`.
   - Zero `ctx.shadowBlur`, zero `arcTo`/`transform`/`clip()`, and strict `try { ... } finally { ctx.restore(); }` on every `save()`.

### Part B — Normal Mobs, Elites & 12 Bosses Outfits (`renderBossOutfitDetails`)
6. **All 8 Normal Mob Outfits** (matching `EnemyOutfitId` in `renderer/types.ts`):
   - Implement distinct ink-wash silhouettes for `meta_mob`, `gunner_mob`, `swarm_mob`, `aegis_mob`, `ninja_mob`, `brute_mob`, `arcanist_mob`, `reaper_mob` (no mob left with generic/borrowed look).
7. **Elite Rank Ornaments**:
   - When `opts.entityTier === 'elite'`, render unmistakable ink-wash Elite visual cues (crimson-gold ink-flame horns/crest, armored shoulder pauldrons, rank sash/aura sigil) layered cleanly with the mob's base outfit.
8. **All 12 Boss Outfits (Phase 1 & Phase 2 Enrage)**:
   - Implement dedicated outfits for **Bosses 9–12** (`raiden`, `akaza`, `kronos`, `omega`) AND enrich Bosses 1–8 (`haiku`, `astra`, `glacius`, `opus`, `vulcan`, `sol`, `nyx`, `fable`) with sumi-e ink armor, masks, helms, glowing eyes, and rim-lit accents.
   - When `opts.enragePhase === 2`, render Phase 2 enraged visual escalation (cracked glowing ink veins/eyes, flared aura horns/wings/crests, heightened vermilion/accent energy).

## Concurrency-Safe Mirror Sync & Verification
Because parallel workers are running in Wave 2, **serialize access** to `/data/user/0/com.agy/files/stickman-build` using a Python `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock` (do NOT delete other workers' files — sync `/storage/emulated/0/Antigravity/Stickman/src` into `/data/user/0/com.agy/files/stickman-build/src` inside the lock, run `rules.test.ts` 17/17 and `node node_modules/vite/bin/vite.js build`).
Also run static `shadowBlur` check (`0`), `save/restore` check, and headless mock-Canvas2D check exercising `renderStickman` across all 18 skins (Normal & Awakened), all 8 mob outfits (Normal & Elite), and all 12 Boss outfits (Phase 1 & Phase 2).
Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m2a/handoff.md` and message `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.
