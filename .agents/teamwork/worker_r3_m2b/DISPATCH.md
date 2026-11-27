# Worker Dispatch — M2B: 18-Skin Slash Trails, Motifs & Player Render Sync

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `## Follow-up — 2026-11-26T09:54:29Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1/handoff.md`
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r3_survey_1/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m2b`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **EXCLUSIVE Write Ownership (ONLY edit these files)**:
  - `src/game/renderer/trails.ts`
  - `src/game/Player.ts` (minimal render-param / `afterimages` color & finite-guard checks ONLY — do NOT alter hitboxes, physics, movement, damage, or combat timing!)
- **FORBIDDEN**: Do NOT modify ANY other file in `src/` or `tests/`.

## Detailed Scope & Design Requirements
1. **`src/game/renderer/trails.ts`**:
   - Fix `inferCharacterForSkin` (and `renderAttackSwingAura` at line 43!) to prefer `opts.characterId` when provided (instead of passing `opts.awakenedForm` which is `null` when unawakened!), and support all 18 skins (`eclipse_ronin`, `prismatic_archon`, `celestial_empress`, `abyssal_valkyrie`) plus weapons (`arcane_hands`, `prismatic_hands`, `valkyrie_glaive`, `valkyrie_excalibur`).
   - Implement all 6 missing motifs in BOTH `renderAttackSwingAura` AND `renderSlashMotifOrnament`:
     - `eclipse_blade` (black-crimson solar eclipse ring + ember sparks)
     - `arcane_sigil` (purple-magenta sumi-ink geometric sigil + star motes)
     - `prismatic_nova` (rainbow-ink crystal shards + star bursts)
     - `valkyrie_radiance` (radiant gold-white feather arcs + spear halo)
     - `celestial_halo` (sapphire-gold celestial ink rings + constellations)
     - `abyssal_eclipse` (crimson-violet eclipse crescent + abyssal ink feathers)
   - Upgrade `renderSlashTrails` and `renderAfterimages` with Ink-Wash / Thủy mặc aesthetic: sumi-ink outer brushstroke outline/edge splatter paired with vibrant core/rim taper, using `colorWithAlpha` from `inkStyle.ts` (zero `shadowBlur`, zero `arcTo`/`clip()`/`transform()`).
   - Replace fragile duplicated `ctx.restore()` before early `continue`s with clean `try { ... } finally { ctx.restore(); }` blocks so `save/restore === 0` is structurally guaranteed.
2. **`src/game/Player.ts` (Minimal Rendering-Only Check)**:
   - Verify `Player.render()` passes finite `poseTime`, `scaleX`, `scaleY`, `characterId`, `skinId`, and `awakenedForm` to `renderStickman`.
   - Check `Player.ts:744` (`ghostPalette` in dash afterimages) noted in Survey 3 (`T1-F6-02`): put `vfx.afterimageColor` at index `0` (or preserve skin-first `afterimageColor` on dash) while keeping `slashTrails`/`afterimages` caps (`<= 24`) and combat/hitboxes 100% untouched!

## Concurrency-Safe Mirror Sync & Verification
Serialize access to `/data/user/0/com.agy/files/stickman-build` with Python `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock` (do NOT delete other workers' files), sync `src/` into `$BUILD/src`, run `rules.test.ts` (17/17) and `node node_modules/vite/bin/vite.js build`, verify static `shadowBlur === 0`, and run a headless mock-Canvas2D test across all 18 motifs/skins for `renderAttackSwingAura`, `renderSlashTrails`, `renderAfterimages`, and `Player.render()`.
Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m2b/handoff.md` and message `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.


## 2026-11-26T10:12:44Z
Sender: `07826cb9-c437-445a-9ca0-4b73578e251e`
You are Worker `worker_r3_m2b` executing Milestone **M2B** (18-Skin Slash Trails, Motifs & Player Render Sync) for Scarlet Sheath R3.

- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m2b`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **Parent Orchestrator ID**: `07826cb9-c437-445a-9ca0-5b1da3c3e51d`

EXCLUSIVE WRITE OWNERSHIP: ONLY edit `src/game/renderer/trails.ts` and `src/game/Player.ts` (render-param/afterimage color & finite-guard checks only — zero gameplay/hitbox changes).

Keep `progress.md` updated with `Last visited:`. Use `fcntl.flock` on `/data/user/0/com.agy/files/stickman-build.lock` when syncing `src/` to `/data/user/0/com.agy/files/stickman-build/src` and running `rules.test.ts` (17/17) & `vite build` (exit 0). Verify zero `shadowBlur`, balanced `save/restore`, zero `NaN` across all 18 motifs/skins. Write `handoff.md` and message `07826cb9-c437-445a-9ca0-5b1da3c3e51d`.
