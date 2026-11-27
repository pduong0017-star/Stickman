# E2E & Visual Verification Specification — Stickman Skin Attack VFX Upgrade

> **Role**: `spec_miner_e2e` (Read-Only Specification Miner)
> **Authoritative Sources Inspected**:
> - `.agents/teamwork/ORIGINAL_REQUEST.md`
> - `PROJECT.md`
> - `package.json`, `tsconfig.json`, `vite.config.ts`
> - `src/game/rules.test.ts` (17/17 passing baseline)
> - `src/game/types.ts`, `src/game/characters.ts`, `src/game/animation.ts`, `src/game/synergy.ts`
> - `src/game/ParticleSystem.ts`, `src/game/StickmanRenderer.ts`, `src/game/UltimateCutscene.ts`, `src/game/Entities.ts`
> - `src/game/Player.ts`, `src/game/Game.ts`, `src/game/AudioEngine.ts`, `src/game/InputHandler.ts`, `src/game/Camera.ts`
> - `src/App.tsx`, `src/components/TitleScreen.tsx`

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | F1 (Registry) | 12-Skin Unique VFX Registry (`src/game/skinVfx.ts`) | Declarative `SKIN_VFX_PROFILES` mapping all 12 `(CharacterId, SkinId)` pairs (`kuro/{default,radiant_seraph,void_walker}`, `raijin/{default,storm_shogun,cyber_valkyrie}`, `kagura/{default,solar_phoenix,frost_empress}`, `zero/{default,blood_moon,astral_phantom}`) to strictly unique `SkinVfxProfile` configs, plus resolving the `frost_empress` vs `astral_phantom` `slashColors: ['#38bdf8', '#c084fc']` collision in `characters.ts:529,602`. | `(characterId: CharacterId, skinId?: SkinId)` via `getSkinVfxKey`, `getSkinVfxProfile`, `listAllSkinVfxProfiles()` | Non-null `SkinVfxProfile` with unique `profileId` (`${char}:${skin}`), `motif`, 4 slash colors, 2 swing aura colors, 2 tendril colors, `afterimageColor`, 2 particle colors, `swingParticleKind`, `finisherParticleKind`, `impactRingColor`, `hitTextColor`, `detonationColor`, `projectileTheme`, `pillarTheme`, `iceWallTheme`, `cutscenePrimary/Secondary/Accent`. | Invalid/mismatched `skinId` or unknown `characterId` falls back deterministically (via `normalizeSkinForCharacter` / `getCharacterDef` -> `'default'` / `'kuro'`) without throwing. | `PROJECT.md:19,41-76`, `characters.ts:306-643` |
| 2 | F2 (Particles) | Pooled Skin Particle Kinds (`src/game/ParticleSystem.ts`) | Fixed-size pre-allocated pool bumped from `500` to `MAX_PARTICLES = 720`, implementing `feather`, `petal`, `star`, `shard`, and currently-unused `ink_splatter`, plus `getActiveCount()` and `getPoolCapacity()`. | `emitFeathers`, `emitPetals`, `emitStars`, `emitShards`, `emitInkSplatter` `(x, y, count, color, spread?, scale?)`, `update(dt)`, `render(ctx)`, `clear()` | Active particles updated with drag/gravity/rotation; expired when `life >= maxLife`; pool usage bounded at `<= 720` via ring-buffer cursor overwrite; `getActiveCount()` returns `0` after expiry/clear. | `count <= 0` emits 0 particles; overflow overwrites oldest slot at `cursor` without resizing `pool` array; `dt = 0` is safe no-op. | `PROJECT.md:20,78-88`, `ParticleSystem.ts:3-84` |
| 3 | F3 (Trails) | Per-Skin Slash Trails & 12 Motifs (`src/game/StickmanRenderer.ts`) | `SlashTrail` extended with `skinId?`, `characterId?`, `rimColor?`, `secondaryColor?`, `motif?`, `seed?`. `renderSlashTrails(ctx, trails)` renders per-skin palettes (replacing hardcoded `#fde047`/`#f8fafc`) and 12 distinct trail motifs/ornaments (`iaido_ink`, `seraph_feathers`, `void_rift`, `volt_arc`, `shogun_drums`, `cyber_glitch`, `flame_lick`, `phoenix_plume`, `frostfire_crystal`, `shadow_wisps`, `blood_crescent`, `astral_constellation`). | `SlashTrail[]` passed to `renderSlashTrails(ctx, trails)` | Distinct Canvas2D geometry, outer rim, secondary gradient/ornament, and core strokes per motif wrapped in `ctx.save()` / `ctx.restore()` with `globalCompositeOperation = 'lighter'`. | Missing optional fields (`rimColor`, `motif`, etc.) fall back safely to legacy `outerColor`/`coreColor`/`style` defaults; empty `trails` draws 0 ops. | `PROJECT.md:21,90-98`, `StickmanRenderer.ts:108-121,3486-3690` |
| 4 | F4 (Auras/Forms) | Per-Skin Swing Aura, Dark Ink Aura & Awakened/Weapon Accents (`src/game/StickmanRenderer.ts`) | `StickmanRenderOptions` accepts attack/aura parameters (`attackProgress?`, `attackAuraColor?`, `attackAuraSecondary?`, `vfxMotif?`). Renders dynamic swing aura burst around fighter during attacks and expands `renderDarkInkAura`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`, `renderWeapon` for all 12 skins (closing gap where Raijin/Kagura/Zero custom skins share default weapon/awakened visuals). | `StickmanRenderOptions` passed to `renderStickman(ctx, opts)` | Skin-distinct foot aura puddle/tendrils, swing aura burst during active attacks, distinct weapon & awakened visuals across all 12 skins. | `silhouette` or `whiteFlash` suppresses colored overlays cleanly; `darkAura: 'none'` or `weapon: 'none'` skips respective layer without error. | `PROJECT.md:22,98`, `StickmanRenderer.ts:133-197,1093-1424,2827-3469` |
| 5 | F5 (Cutscenes) | Per-Skin Ultimate Cutscenes (`src/game/UltimateCutscene.ts`) | `renderVoltJudgment`, `renderSolarInferno`, `renderPhantomEclipse`, and `renderScarletSheath` consume `CutsceneTheme` (`skinId`, `primaryColor`, `secondaryColor`, `accentColor`/profile) so all 8 custom skins (not just Kuro's `radiant_seraph` / `void_walker`) display skin-matched Ultimate VFX. | `CutsceneTheme` passed to `cutscene.start(callbacks, audio, theme)`, `update(dt, audio, camera)`, `renderScreen(ctx, viewW, viewH)` | Distinct screen-space Ultimate frames per `(characterId, skinId)` with kanji stamp, silhouette phase (`isSilhouettePhase()`), white flash (`isWhiteFlashPhase()`), and `onKanjiImpact`/`onComplete` callbacks at `t=2.18s` / `t=2.7s`. | Missing `skinId` or unknown `characterId` falls back to default theme cleanly; inactive cutscene `renderScreen` is a no-op. | `PROJECT.md:23`, `UltimateCutscene.ts:6-189` |
| 6 | F6 (Combat Wiring) | Player & Game Combat VFX Wiring (`src/game/Player.ts`, `src/game/Game.ts`) | Replaces hardcoded character hex colors in `Player.ts` (melee swings, dash, parry, `[U]` skills, Link Arts, Awakening, ambient aura) and `Game.ts` (thunder blink, cryo chill, ice wall crush, magma pillar hit, parry wave, mark detonations, ultimate aftermath) with `getSkinVfxProfile`; includes `skinId` in `syncHudThrottled` fingerprint (`Game.ts:2297-2321`). | `Player.setCharacter(id, skinId)`, `Player.update(...)`, `Game.setSkin(skinId)`, `Game.setCharacter(id)`, `Game.startMode(...)` | Per-skin slash trails, particles, afterimages, impact frames, hit text, and `HudSnapshot.skinId` updates emitted immediately when skin changes even if other HUD fields stay constant. | Combat hitboxes (`ActiveMeleeHitbox`), `attackDuration`, `damage`, `knockX/Y`, and `rules.test.ts` remain invariant across all 3 skins of each fighter (R3). | `PROJECT.md:24`, `Player.ts:151-1814`, `Game.ts:296-345,2293-2438` |
| 7 | F7 (Entities) | Skin-Themed Projectiles & Pillars (`src/game/Entities.ts`) | `ProjectileConfig` accepts `theme?: ProjectileTheme`, `rimColor?: string`, `secondaryColor?: string` (replacing fragile `this.color === '#facc15'` string matching in `Entities.ts:565-566`); `MagmaPillar` accepts `theme?: PillarTheme` (`'fire' | 'phoenix' | 'frostfire'`); `IceWall` supports `'ice' | 'seraph' | 'void'`. | `new Projectile(cfg)`, `new MagmaPillar(x, dir, delay, dmg, theme?)`, `new IceWall(x, dir, theme?)` | Distinct projectile trails/colors/ornaments (`seraph`, `void`, `shogun`, `cyber`, `phoenix`, `frostfire`, `blood_moon`, `astral`, `default`) and themed pillar eruptions (`fire`, `phoenix`, `frostfire`). | Omitting `theme` defaults cleanly to `'default'` / `'fire'` / `'ice'`; out-of-bounds or `life >= maxLife` deactivates entities cleanly (`active = false`). | `PROJECT.md:25,106-109`, `Entities.ts:114-620,945-1038` |
| 8 | F8 (Lifecycle) | VFX Lifecycle & Memory Cleanup Hardening (`src/game/Player.ts`, `src/game/ParticleSystem.ts`) | Enforces hard capacity caps on `Player.slashTrails` (e.g., `<= 24`) and `Player.afterimages` (e.g., `<= 24`), deterministic `life >= maxLife` expiry in both `update()` and `updateIdleOnTitle()`, immediate clearing on `setCharacter()` / `reset()`, and `Player.getActiveVfxCounts()`. | `Player.getActiveVfxCounts()`, `setCharacter()`, `reset()`, `update()`, `updateIdleOnTitle()` | After `>= 50` attacks + settling window (`>= 1.5s`), `slashTrails === 0`, `afterimages === 0`, and `particles.getActiveCount() === 0` (no linear growth or leaks). | Pathological `dt` spikes or attack spam never exceed array caps (`<= 24`) or `MAX_PARTICLES` (`720`); `ctx.shadowBlur` never enabled inside particle/trail loops. | `PROJECT.md:26,100-105`, `Player.ts:151-223,392-486` |
| 9 | F9 (Verification) | E2E Suite, Visual PNG Pipeline & `/data` Scratch Build/Typecheck | 4-tier opaque-box E2E suite (`tests/e2e/run-e2e.mjs` + `tier1..tier4`), mock-`CanvasRenderingContext2D` draw-trace + Python `Pillow 13.0.0` 12-skin PNG rasterizer (`tests/e2e/render-skins.py`), React SSR `TitleScreen` check, and `/data` scratch `tsc --noEmit` (`typescript@5.8.3`) + `vite build` (`vite@8.3.8`). | `ESBUILD_BINARY_PATH` + `tsx --test`, `--tier=1|2|3|4|all`, Python 3 + Pillow 13.0.0, `/data/.../scratch/stickman-build` | >=104 E2E tests passing + 17/17 `rules.test.ts`; 12 distinct skin PNGs + grid sheet visually inspectable via `view_file`; 0 TS errors & 0 Vite build errors. | Non-zero exit on any failed assertion, blank/duplicate PNG render, uncaught runtime exception, or build/type error. | `PROJECT.md:27,117-124`, `ORIGINAL_REQUEST.md:21-33` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | F1 / F6 | `getCharacterDef('kuro', 'blood_moon')` (cross-character skin mismatch) | `normalizeSkinForCharacter('kuro', 'blood_moon')` returns `'default'`; `getCharacterDef` falls back safely to Kuro default without throwing. |
| 2 | F1 | `frost_empress` vs `astral_phantom` `slashColors` | Baseline `characters.ts:529` and `characters.ts:602` currently collide (`['#38bdf8', '#c084fc']`). F1 must resolve this collision AND ensure all 12 `SkinVfxProfile` objects are strictly distinct across visual properties. |
| 3 | F2 | Emit `1000` particles in a single frame (`count > MAX_PARTICLES`) | Ring buffer wraps cleanly at `720`; `getActiveCount() <= 720`, `getPoolCapacity() === 720`, zero `Array` reallocation or crash. |
| 4 | F2 | `ParticleSystem.update(dt)` with `dt = 0` or `dt = 10` (huge pause spike) | `dt = 0` preserves particles without `NaN`; `dt = 10` expires all particles (`life >= maxLife`) so `getActiveCount() === 0`. |
| 5 | F6 | `Game.setSkin('void_walker')` on Title screen when `hp`, `rage`, `combo`, `state` are unchanged | Baseline `syncHudThrottled` (`Game.ts:2297-2321`) omitted `this.skinId` from `fp`. F6 adds `this.skinId` to `fp` so throttled syncs also detect skin changes. |
| 6 | F8 | `Player.setCharacter` / `reset` while `slashTrails` and `afterimages` are populated | Baseline `setCharacter` (`Player.ts:151-162`) did NOT clear `slashTrails`/`afterimages` and `updateIdleOnTitle` (`Player.ts:392-399`) did NOT tick them. F8 clears them on switch/reset and ticks them in idle. |
| 7 | F9 (Android) | Running `tsx` or `tsc` directly inside `/storage/emulated/0/Antigravity/Stickman` | `/storage/emulated/0` is mounted `noexec` (`EACCES` on esbuild), and `node_modules/typescript@7.0.2` throws `Unable to resolve @typescript/typescript-android-arm64`. Must copy `esbuild` to `$TMPDIR/esbuild_bin` for `tsx`, and sync to `/data/.../scratch/stickman-build` (`typescript@5.8.3` + `vite@8.3.8`) for `tsc --noEmit` & `vite build`. |
| 8 | F9 (Pillow) | `PIL.ImageColor.getrgb('rgba(250, 204, 21, 0.45)')` | **Empirically verified failure** in Pillow 13.0.0 (`ValueError: unknown color specifier`). Rasterizer MUST use a custom CSS color parser for `rgba(...)`, `rgb(...)`, `#RRGGBBAA`, and `#RRGGBB`. |
| 9 | F9 (Node DOM) | Instantiating `new Game(canvas, cb)` in Node.js without DOM | `Game.ts:768-770` calls `window.requestAnimationFrame(tick)` unconditionally (`AudioEngine` and `InputHandler` guard `window`, `Game.startLoop` does not). Mock harness must provide `globalThis.window` with controllable `requestAnimationFrame` queue & `localStorage` shim without overwriting read-only `globalThis.navigator` in Node 26. |

---

## 1. `TEST_INFRA.md` & Test Runner (`tests/e2e/run-e2e.mjs`) Specification

### 1.1 Directory Layout (Owned by E2E Track per `PROJECT.md § Code Layout`)
```
Stickman/
├── TEST_INFRA.md
├── TEST_READY.md                     # Published by E2E engineer after baseline dry-run
└── tests/
    └── e2e/
        ├── run-e2e.mjs               # Android-compatible CLI test orchestrator
        ├── helpers/
        │   ├── mockCanvas.ts         # Node DOM/Window shim + CanvasRenderingContext2D draw-trace recorder
        │   ├── testHarness.ts        # Deterministic Player/Game stepping & input scripting helpers
        │   └── assertions.ts         # Deep visual-config uniqueness & invariants helpers
        ├── render-skins.py           # Python Pillow 13.0.0 draw-trace -> PNG rasterizer + pixel validator
        ├── tier1_features.e2e.test.ts    # Tier 1: Feature coverage (46 tests, >=5 per F1..F9)
        ├── tier2_boundaries.e2e.test.ts  # Tier 2: Boundary & corner cases (46 tests, >=5 per F1..F9)
        ├── tier3_pairwise.e2e.test.ts    # Tier 3: Cross-feature pairwise combos (12 tests)
        └── tier4_workloads.e2e.test.ts   # Tier 4: Real-world gameplay & visual PNG workloads (6 tests)
```
> **MediaStore Isolation Rule**: Any generated PNGs / JSON draw traces MUST be written either to `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman_e2e_renders/` OR to `.agents/teamwork/e2e_renders/` with a `.nomedia` file present so Android MediaStore never indexes test frames into the user's Gallery.

### 1.2 Runner Contract (`tests/e2e/run-e2e.mjs`)
- **CLI Flags**:
  - `--tier=1|2|3|4|all` (default: `all`)
  - `--with-unit` (also executes `src/game/rules.test.ts` before E2E tiers)
  - `--render-visuals` (forces Tier 4 visual PNG generation + Pillow inspection artifacts even if run standalone)
  - `--out-dir=<path>` (output directory for visual PNGs; defaults to `.agents/teamwork/e2e_renders` or `$STICKMAN_RENDER_DIR`)
  - `--verbose` (streams full TAP/spec reporter output)
- **Android `/storage/emulated/0` `esbuild` Bootstrap**:
  1. Resolve source binary: `path.resolve('node_modules/tsx/node_modules/@esbuild/android-arm64/bin/esbuild')`.
  2. Resolve executable temp path: `path.join(process.env.TMPDIR || '/data/user/0/com.agy/cache', 'esbuild_bin')`.
  3. Copy binary if missing or size differs, then `fs.chmodSync(esbuildDest, 0o755)`.
  4. Spawn `process.execPath` (`node`) with `['node_modules/tsx/dist/cli.mjs', '--test', ...tierFiles]` and env `{ ...process.env, ESBUILD_BINARY_PATH: esbuildDest }`.
- **Sequential Execution**: When `--tier=all`, execute Tier 1 -> Tier 2 -> Tier 3 -> Tier 4 sequentially (matching `PROJECT.md`: "Run E2E Tiers 1-4 sequentially"), print a per-tier summary (`PASS`/`FAIL`, test count, duration), and exit with code `0` iff all tiers pass (`1` otherwise).

### 1.3 `TEST_INFRA.md` Required Sections
1. Environment & Platform Constraints (Android `noexec` `/storage/emulated/0`, `esbuild` `$TMPDIR` copy, `typescript@7.0.2` vs `/data` scratch `typescript@5.8.3` + `vite@8.3.8`, Pillow `13.0.0`, `.nomedia` rule).
2. Quick-Start Commands (`--tier=1`, `--tier=2`, `--tier=3`, `--tier=4`, `--tier=all`, `--with-unit`, scratch `tsc` + `vite build`, Python Pillow visual render).
3. Test Tiers & Coverage Mapping (Tiers 1–4 mapped to F1–F9, total >= 104 tests).
4. Mock Canvas2D + Pillow Visual Render Architecture & Inspection Guide (`view_file` paths).
5. Acceptance Thresholds & Zero-Exception Policy.

---

## 2. Complete 4-Tier E2E Test Matrix (110 Concrete Test Cases >= 104)

> Formula check: `N = 9` features -> `11*N + max(5, ceil(N/2)) = 99 + 5 = 104`.
> Below specifies **46 (Tier 1) + 46 (Tier 2) + 12 (Tier 3) + 6 (Tier 4) = 110 concrete, opaque-box test cases**.

### Tier 1 — Feature Coverage (46 Tests: >= 5 per feature F1–F9)

#### F1: 12-Skin Unique VFX Registry (`T1-F1-01` .. `T1-F1-06`)
1. `T1-F1-01`: `listAllSkinVfxProfiles()` returns exactly `12` profiles covering all `4` characters × `3` skins (`kuro`, `raijin`, `kagura`, `zero`).
2. `T1-F1-02`: Every `profileId` matches `${characterId}:${skinId}` and all 12 `profileId` values are unique.
3. `T1-F1-03`: **Programmatic Uniqueness Gate (R1 Acceptance)**: No two of the 12 `SkinVfxProfile` records have identical visual configuration tuples `(motif, slashPrimary, slashSecondary, slashRim, swingAuraColor, particlePrimary, swingParticleKind, projectileTheme)` — strict pairwise distinction (`12` unique signatures).
4. `T1-F1-04`: `CHARACTER_SKINS` `slashColors` collision check — all 12 `(CharacterId, SkinId)` pairs resolved via `getCharacterDef(id, skinId)` have distinct `slashColors` pairs (specifically verifying `kagura:frost_empress` vs `zero:astral_phantom` no longer collide).
5. `T1-F1-05`: `getSkinVfxProfile(charId, skinId)` returns the matching entry for all 12 pairs, with valid non-empty CSS hex colors (`^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$`) on every color field.
6. `T1-F1-06`: All 12 `SlashVfxMotif` values (`iaido_ink` through `astral_constellation`) appear exactly once across the 12 profiles (1-to-1 bijection).

#### F2: Pooled Skin Particle Kinds (`T1-F2-01` .. `T1-F2-05`)
7. `T1-F2-01`: `ParticleSystem.getPoolCapacity()` returns `720` and `getActiveCount()` starts at `0` on a fresh instance.
8. `T1-F2-02`: `emitFeathers`, `emitPetals`, `emitStars`, `emitShards`, and `emitInkSplatter` each increment `getActiveCount()` by the requested `count` and render non-empty Canvas2D draw calls (`>= 1` `fill`/`stroke` op) without throwing.
9. `T1-F2-03`: All 5 new particle kinds respect `maxLife <= 0.6s` (and swing accents `<= 0.45s`) and return `getActiveCount()` to `0` after advancing `update(0.1)` across `1.0s`.
10. `T1-F2-04`: Legacy particle kinds (`spark`, `smoke`, `cartoon_smoke`, `ice`, `lightning`, `ember`, `ring`, `crack`, `slash_beam`, `chain_arc`, `text`) continue rendering and expiring cleanly in the `720`-slot pool.
11. `T1-F2-05`: `ParticleSystem.clear()` immediately resets `getActiveCount()` to `0` regardless of active particle kinds.

#### F3: Per-Skin Slash Trails & 12 Motifs (`T1-F3-01` .. `T1-F3-05`)
12. `T1-F3-01`: `renderSlashTrails` renders each of the 12 `SlashVfxMotif` values (`iaido_ink`, `seraph_feathers`, `void_rift`, `volt_arc`, `shogun_drums`, `cyber_glitch`, `flame_lick`, `phoenix_plume`, `frostfire_crystal`, `shadow_wisps`, `blood_crescent`, `astral_constellation`) with non-empty Canvas2D draw calls and zero uncaught errors.
13. `T1-F3-02`: Every pair of skins within the same character (`default` vs custom 1 vs custom 2) produces **distinct** `SlashTrail` draw-call signatures (different `fillStyle`/`strokeStyle` palette sets and/or geometry op counts/types) when rendered via `renderSlashTrails`.
14. `T1-F3-03`: `SlashTrail` `rimColor` and `secondaryColor` are actually emitted into Canvas2D `strokeStyle`/`fillStyle` during `renderSlashTrails` (removing hardcoded `#fde047` on `heavy_cleave` / `#f8fafc` on secondary arcs).
15. `T1-F3-04`: `renderSlashTrails` wraps every trail's `'lighter'` composite operation in balanced `save()` / `restore()` calls (`saveCount === restoreCount`, final `globalCompositeOperation === 'source-over'`).
16. `T1-F3-05`: Legacy `SlashTrail` objects omitting optional fields (`motif`, `rimColor`, `secondaryColor`, `skinId`) still render cleanly without throwing.

#### F4: Per-Skin Swing Aura, Dark Ink Aura & Awakened/Weapon Accents (`T1-F4-01` .. `T1-F4-05`)
17. `T1-F4-01`: Rendering `renderStickman` during an active attack (`attackProgress = 0.45`, `attackAuraColor`, `attackAuraSecondary`, `vfxMotif`) emits swing aura draw calls using the skin's aura colors (more ops / distinct colors vs `attackProgress = undefined`).
18. `T1-F4-02`: All 12 `(CharacterId, SkinId)` pairs rendered via `renderStickman` in idle + attack poses produce 12 distinct Canvas2D color-palette/geometry signatures.
19. `T1-F4-03`: Raijin (`storm_shogun`, `cyber_valkyrie`), Kagura (`solar_phoenix`, `frost_empress`), and Zero (`blood_moon`, `astral_phantom`) custom skins produce distinct `renderStickman` draw traces in **both** base and `awakenedForm` states compared to their `default` skins.
20. `T1-F4-04`: `renderDarkInkAura` / `renderWeapon` / `renderAwakenedBackForm` / `renderAwakenedHeadForm` apply skin-specific colors when `skinId` is passed (not defaulting Raijin/Kagura/Zero skins to default cyan/ember/emerald).
21. `T1-F4-05`: `silhouette: true` and `whiteFlash: true` flags in `StickmanRenderOptions` continue producing clean monochrome output with balanced `save()` / `restore()`.

#### F5: Per-Skin Ultimate Cutscenes (`T1-F5-01` .. `T1-F5-05`)
22. `T1-F5-01`: `UltimateCutscene` renders all 12 `(CharacterId, SkinId)` themes across key phases (`t = 0.25, 0.7, 1.4, 2.0, 2.35`) with zero errors and distinct Canvas2D color palettes per skin.
23. `T1-F5-02`: Raijin's `default`, `storm_shogun`, and `cyber_valkyrie` produce 3 distinct `renderVoltJudgment` draw traces matching each skin's `cutscenePrimary`/`cutsceneSecondary`/`cutsceneAccent`.
24. `T1-F5-03`: Kagura's `default`, `solar_phoenix`, and `frost_empress` produce 3 distinct `renderSolarInferno` draw traces matching solar-gold vs frostfire cyan/violet palettes.
25. `T1-F5-04`: Zero's `default`, `blood_moon`, and `astral_phantom` produce 3 distinct `renderPhantomEclipse` draw traces matching emerald vs crimson blood moon vs indigo-gold astral palettes.
26. `T1-F5-05`: `UltimateCutscene.update` fires `onKanjiImpact` at `t >= 2.18` and `onComplete` at `t >= 2.7` with `active === false` for all 12 skins.

#### F6: Player & Game Combat VFX Wiring (`T1-F6-01` .. `T1-F6-05`)
27. `T1-F6-01`: `Player` executing Ground Attack 1 (`[J]`) for each of the 12 `(CharacterId, SkinId)` pairs spawns `slashTrails` with `outerColor`/`rimColor`/`motif` matching `getSkinVfxProfile(char, skin)`.
28. `T1-F6-02`: `Player` executing Dash (`[L]`), Parry (`[K]`), Signature Skill (`[U]`), and Awakening (`[O]`) across custom skins emits particles matching the skin's `SkinVfxProfile` colors/kinds (not hardcoded default character hexes).
29. `T1-F6-03`: `Game.setSkin(skinId)` immediately emits a `HudSnapshot` with the updated `skinId` and `characterSkills`, and `syncHudThrottled` detects `skinId` changes even when all other combat metrics are unchanged.
30. `T1-F6-04`: `Game` ambient aura and impact frames (`triggerAwakening`, `render`) reflect the active skin's `glowColor` / `awakeningWaveColor` / `swingAuraColor`.
31. `T1-F6-05`: **R3 Combat Invariance**: For all 4 characters, switching between all 3 skins preserves identical `ActiveMeleeHitbox` `damage`, `width`, `height`, `knockX`, `knockY`, `unblockable`, and `attackDuration`.

#### F7: Skin-Themed Projectiles & Pillars (`T1-F7-01` .. `T1-F7-05`)
32. `T1-F7-01`: `Projectile` accepts and renders all 9 `ProjectileTheme` values (`default`, `seraph`, `void`, `shogun`, `cyber`, `phoenix`, `frostfire`, `blood_moon`, `astral`) with distinct Canvas2D color outputs without relying on fragile `color === '#facc15'` string checks.
33. `T1-F7-02`: `MagmaPillar` accepts `'fire'`, `'phoenix'`, and `'frostfire'` themes and emits theme-appropriate particles on eruption and theme-distinct Canvas2D gradients/spires on `render()`.
34. `T1-F7-03`: `IceWall` renders distinct visuals & shatter particles across `'ice'`, `'seraph'`, and `'void'` themes.
35. `T1-F7-04`: `Player` spawning projectiles (`volt_lance`, `kunai`, `void_crescent`, `fire_wave`, `sword_wave`) passes the active skin's `projectileTheme` / `rimColor` / `secondaryColor`.
36. `T1-F7-05`: Kagura spawning `MagmaPillar` on `[U]`, combo 6, or Air Slam passes `'phoenix'` for `solar_phoenix`, `'frostfire'` for `frost_empress`, and `'fire'` for `default`.

#### F8: VFX Lifecycle & Memory Cleanup Hardening (`T1-F8-01` .. `T1-F8-05`)
37. `T1-F8-01`: `Player.getActiveVfxCounts()` returns `{ slashTrails: 0, afterimages: 0 }` after `reset()` and after `setCharacter(id, skinId)`.
38. `T1-F8-02`: `Player.setCharacter()` called mid-swing while `slashTrails.length > 0` and `afterimages.length > 0` immediately clears both arrays to `0`.
39. `T1-F8-03`: `Player.updateIdleOnTitle(dt, particles)` ticks and expires leftover `slashTrails` and `afterimages` to `0` within `0.5s`.
40. `T1-F8-04`: `Player.slashTrails` and `Player.afterimages` never exceed their hard capacity caps (`<= 24` each) even under rapid dash + combo spam.
41. `T1-F8-05`: `ctx.shadowBlur` is NEVER set (`> 0`) during `ParticleSystem.render()`, `renderSlashTrails()`, or `renderStickman()` across all 12 skins (R2 performance guarantee).

#### F9: Build, Typecheck, E2E & Visual Infrastructure (`T1-F9-01` .. `T1-F9-06`)
42. `T1-F9-01`: Existing unit suite `src/game/rules.test.ts` runs under the Android `tsx` + `$TMPDIR/esbuild_bin` harness and passes `17/17`.
43. `T1-F9-02`: `TitleScreen` React SSR (`renderToStaticMarkup`) renders cleanly for all 12 `(CharacterId, SkinId)` pairs, displaying the active skin's `aria-checked="true"` radio button, `ultimateKanji`, and `skills.specialName`.
44. `T1-F9-03`: Mock `CanvasRenderingContext2D` maintains balanced `save()`/`restore()` stack (`stackDepth === 0` after `Game.render()`, `Player.render()`, `ParticleSystem.render()`, `UltimateCutscene.renderScreen()`).
45. `T1-F9-04`: `Game` instantiates cleanly in Node with mock canvas + browser shim, enters `title`, transitions to `training` / `story` / `boss_rush` / `endless`, and `destroy()` cleans up without throwing.
46. `T1-F9-05`: `tsconfig.json`, `package.json`, and `vite.config.ts` contracts remain intact (build entrypoint `src/main.tsx` -> `App.tsx` valid).
47. `T1-F9-06`: `.nomedia` file exists in `/storage/emulated/0/Antigravity/Stickman` and any E2E render output folder on shared storage.

---

### Tier 2 — Boundary & Corner Cases (46 Tests: >= 5 per feature F1–F9)

#### F1 Boundaries (`T2-F1-01` .. `T2-F1-05`)
48. `T2-F1-01`: `getSkinVfxProfile` with mismatched `(characterId, skinId)` (e.g., `('kuro', 'blood_moon')`) falls back to `'kuro:default'` instead of throwing or returning `undefined`.
49. `T2-F1-02`: `getSkinVfxProfile` with `skinId = undefined` or invalid cast `'nonexistent' as SkinId` falls back cleanly to `'${charId}:default'`.
50. `T2-F1-03`: `getSkinVfxKey('kagura', 'frost_empress')` produces `'kagura:frost_empress'` and never collides with any other key.
51. `T2-F1-04`: `SKIN_VFX_PROFILES` entries are immutable/consistent across repeated `getSkinVfxProfile` calls (same `profileId` and deep equality).
52. `T2-F1-05`: Every `SkinVfxProfile`'s `swingParticleKind` and `finisherParticleKind` is a valid `ParticleKind` supported by `ParticleSystem`.

#### F2 Boundaries (`T2-F2-01` .. `T2-F2-05`)
53. `T2-F2-01`: Pool saturation — emitting `1,500` mixed new-kind particles (`feather`, `petal`, `star`, `shard`, `ink_splatter`) in one burst keeps `getActiveCount() <= 720` and `getPoolCapacity() === 720`.
54. `T2-F2-02`: Zero-count emission (`emitFeathers(x, y, 0, color)`, `emitPetals(..., 0, ...)`, etc.) leaves `getActiveCount()` unchanged.
55. `T2-F2-03`: Extreme `dt` values: `update(0)` keeps `getActiveCount()` unchanged with finite coordinates; `update(60)` expires 100% of particles (`getActiveCount() === 0`).
56. `T2-F2-04`: Negative/extreme coordinates `(x = -500, y = 2000)` on `emitStars` / `emitShards` render cleanly without `NaN` in mock Canvas2D trace.
57. `T2-F2-05`: Rapid emit-update-emit cycling (200 frames of 20 particles/frame) stabilizes `getActiveCount()` at a bounded steady-state plateau (`< 720`) instead of growing monotonically.

#### F3 Boundaries (`T2-F3-01` .. `T2-F3-05`)
58. `T2-F3-01`: `renderSlashTrails(ctx, [])` (empty array) emits 0 draw ops and leaves `ctx` state unmodified.
59. `T2-F3-02`: `SlashTrail` at boundary lifetimes: `life = 0` (spawn frame), `life = maxLife * 0.5` (mid-swing), and `life = maxLife` (`inv = 0`) all execute without `NaN`, negative radius, or division-by-zero errors.
60. `T2-F3-03`: `SlashTrail` with `facing = -1` (left-facing) mirrors `ctx.scale(-1, 1)` cleanly for all 12 motifs without negative-radius `arc()` errors.
61. `T2-F3-04`: `SlashTrail` with `radius = 1` (tiny) and `radius = 300` (huge Awakened finisher) stays finite and balanced (`save === restore`) across all 12 motifs.
62. `T2-F3-05`: `SlashTrail` with `startAngle === endAngle` (`span = 0`, e.g. `spear_thrust` or degenerate `arc`) skips or draws cleanly without error.

#### F4 Boundaries (`T2-F4-01` .. `T2-F4-05`)
63. `T2-F4-01`: `renderStickman` with `attackProgress = 0`, `0.5`, `1.0`, and `-0.1` / `1.5` (clamped out-of-range) never throws or produces `NaN` coordinates.
64. `T2-F4-02`: `renderStickman` with `facing = -1` and `scaleX = 1.36, scaleY = 0.66` (landing squash) renders all 12 skins cleanly.
65. `T2-F4-03`: `renderStickman` when `y = GROUND_Y - 300` (high aerial combo) renders shadow/aura cleanly without negative ellipse radius.
66. `T2-F4-04`: `renderStickman` with `awakenedForm` set AND custom `skinId` across all 4 fighters renders both back and head awakened forms without conflict.
67. `T2-F4-05`: `renderStickman` with `darkAura: 'none'` and `weapon: 'none'` skips aura & weapon draws cleanly even when `skinId` is custom.

#### F5 Boundaries (`T2-F5-01` .. `T2-F5-05`)
68. `T2-F5-01`: `UltimateCutscene.renderScreen` when `active === false` is a strict no-op (0 draw calls).
69. `T2-F5-02`: `UltimateCutscene.renderScreen` at exact boundary timestamps `t = 0`, `t = 1.32`, `t = 1.85`, `t = 2.18`, `t = 2.699` across all 12 skins emits zero `NaN` values and preserves `save/restore` balance.
70. `T2-F5-03`: Small mobile landscape viewport (`viewW = 667, viewH = 360`) and large desktop viewport (`viewW = 1920, viewH = 1080`) render all 12 skin Ultimates with all draw coordinates finite.
71. `T2-F5-04`: `isSilhouettePhase()` and `isWhiteFlashPhase()` are mutually exclusive at all `t in [0, 2.7]` for all 4 Ultimate styles.
72. `T2-F5-05`: Restarting `cutscene.start(...)` mid-cutscene (`t = 1.0`) resets `timer = 0`, `sheathClicked = false`, `kanjiDropped = false` and switches cleanly to a new skin theme.

#### F6 Boundaries (`T2-F6-01` .. `T2-F6-05`)
73. `T2-F6-01`: Calling `Game.setSkin('cyber_valkyrie')` when `characterId` is `'kuro'` normalizes safely to `'default'` and emits valid `HudSnapshot`.
74. `T2-F6-02`: Calling `Game.setCharacter('kagura')` clears/normalizes incompatible `skinId` (`'void_walker'` -> `'default'`) and updates `HudSnapshot` + `Player.skinId`.
75. `T2-F6-03`: Rapidly toggling `attack` while `sittingOnChair === true` stands up from chair cleanly and triggers attack VFX with active skin colors.
76. `T2-F6-04`: `Player.takeDamage` while `invulnTimer > 0` returns `0` and leaves active skin state untouched; `takeDamage` in `trainingMode` clamps HP >= `25`.
77. `T2-F6-05`: `Game` URL param / `localStorage` edge case — corrupted `localStorage` skin value `'corrupted_skin'` recovers cleanly to `'default'` on `new Game(...)`.

#### F7 Boundaries (`T2-F7-01` .. `T2-F7-05`)
78. `T2-F7-01`: `Projectile` spawned at arena bounds (`x = -125` or `x = ARENA_WIDTH + 125`) deactivates cleanly on first `update(0.016)`.
79. `T2-F7-02`: `Projectile` with `vx = 0, vy = 0` (`atan2(0, 0) === 0`) renders cleanly across all 9 `ProjectileTheme`s without `NaN`.
80. `T2-F7-03`: `MagmaPillar` renders cleanly both pre-eruption (`timer < delay`) and post-eruption (`timer >= delay`), and deactivates (`active = false`) at `timer >= delay + 0.44` for all 3 themes (`'fire'`, `'phoenix'`, `'frostfire'`).
81. `T2-F7-04`: `IceWall` double-`launch()` call is idempotent (second call returns early) and `shatter()` sets `active = false` cleanly for `'ice'`, `'seraph'`, and `'void'`.
82. `T2-F7-05`: `Projectile` with `color = '#facc15'` and explicit `theme = 'shogun'` uses `shogun` theme rather than accidentally matching Seraph (`'seraph'`) by color string!

#### F8 Boundaries (`T2-F8-01` .. `T2-F8-05`)
83. `T2-F8-01`: `Player` pushed past `slashTrails` cap (`> 24` attacks in 1 frame via `dt = 0.001`) enforces `slashTrails.length <= 24` (oldest pruned).
84. `T2-F8-02`: `Player` pushed past `afterimages` cap (`> 24` dashes/warps) enforces `afterimages.length <= 24`.
85. `T2-F8-03`: `Player.update` with `dt = 1.0` (single huge tick) expires all `slashTrails` and `afterimages` (`=== 0`) cleanly without array-index skip bugs.
86. `T2-F8-04`: `Game.enterTitleState()` and `Game.startMode(...)` clear all projectiles, ice walls, magma pillars, particles, trails, and afterimages to `0`.
87. `T2-F8-05`: `Game.destroy()` followed by synthetic frame callbacks does not execute updates or throw errors.

#### F9 Boundaries (`T2-F9-01` .. `T2-F9-05`)
88. `T2-F9-01`: Mock `CanvasRenderingContext2D` handles zero-length paths (`beginPath` + `stroke`/`fill` with no `moveTo`), `globalAlpha` clamped to `[0, 1]`, and `ctx.createRadialGradient` / `createLinearGradient` with `0` radius cleanly.
89. `T2-F9-02`: Custom CSS color parser handles `#fff`, `#ef4444`, `#a855f738`, `rgba(250, 204, 21, 0.45)`, `rgb(9, 11, 16)`, and `rgba(0,0,0,0)` without raising `ValueError`.
90. `T2-F9-03`: `computeResponsiveCameraScale` at extreme aspect ratios (`320x240`, `844x390`, `2560x1440`) produces finite camera transforms during `Game.render()`.
91. `T2-F9-04`: `TitleScreen` SSR renders without error when `clearedStages = []` vs `clearedStages = [0,1,2,3,4,5,6,7]` and `canFullscreen = false` vs `true`.
92. `T2-F9-05`: `run-e2e.mjs --tier=invalid` exits non-zero with a clear usage error rather than silently passing 0 tests.

---

### Tier 3 — Cross-Feature Pairwise Combinations (12 Tests >= 9)

93. `T3-01` (**F1 × F3**): All 12 `SkinVfxProfile` records drive `renderSlashTrails` and produce 12 pairwise-distinct rendered draw-call signatures.
94. `T3-02` (**F1 × F4**): All 12 `SkinVfxProfile` records drive `renderStickman` (with active attack swing aura + weapon + dark aura) and produce 12 pairwise-distinct character+aura draw-call signatures.
95. `T3-03` (**F1 × F5**): All 12 `SkinVfxProfile` records drive `UltimateCutscene.renderScreen` and produce 12 pairwise-distinct Ultimate cutscene palettes.
96. `T3-04` (**F2 × F6**): `Player` executing combo finisher (step 6 ground + air slam step 3) across all 12 skins emits the exact `swingParticleKind` / `finisherParticleKind` defined in `SkinVfxProfile` into `ParticleSystem`.
97. `T3-05` (**F3 × F6**): `Player` executing all 4 `AttackContext` types (`ground`, `air`, `dash_slash`, `parry_counter`) produces `SlashTrail`s matching the active skin's `motif`, `slashPrimary`/`slashSecondary`, and `slashRim`.
98. `T3-06` (**F4 × F6**): `Player` transitioning from Normal -> `triggerAwakening()` -> Attack -> `awakenTimer` expiry switches weapon, aura, swing aura, and `HudSnapshot` cleanly back and forth without residual state.
99. `T3-07` (**F5 × F6**): `Game` triggering Ultimate (`[I]`) while Awakened (`Overdrive`) passes `skinId` + skin theme colors to `UltimateCutscene` and spawns skin-themed aftermath projectiles/pillars on `onKanjiImpact()`.
100. `T3-08` (**F6 × F7**): `kuro:radiant_seraph` and `kuro:void_walker` `[U]` -> `[L]` / `[J]` IceWall overcharge-launch spawns `'seraph'`/`'void'` IceWalls + `'seraph'`/`'void'` `sword_wave` projectiles; `kagura:solar_phoenix` and `kagura:frost_empress` `[U]` spawn `'phoenix'`/`'frostfire'` `MagmaPillar`s.
101. `T3-09` (**F2 × F8**): Heavy multi-hit flurry + Awakened Ultimate particle bursts across 4 characters stay within `MAX_PARTICLES = 720`, and all active particles expire to `0` after `3.0s` of idle simulation.
102. `T3-10` (**F3 × F8**): Rapid 6-hit combo cancellation (`attack` -> `dash` -> `dash_slash` -> `special` -> `setCharacter`) bounds `slashTrails` (`<= 24`) and resets cleanly to `0` on character/skin switch.
103. `T3-11` (**F6 × F9**): `Game.setCharacter` + `Game.setSkin` -> `HudSnapshot` -> `TitleScreen` SSR markup pipeline stays 100% synchronized across all 12 `(CharacterId, SkinId)` pairs.
104. `T3-12` (**F7 × F8**): Spawning max projectiles + magma pillars + ice walls in `Game`, then calling `startMode('story')` / `enterTitleState()`, guarantees all entity arrays, particles, trails, and afterimages reset to `0`.

---

### Tier 4 — Real-World Gameplay & Visual Verification Workloads (6 Scenarios >= 5)

105. `T4-01` (**>= 50-Attack Spam & Lifecycle Cleanup to 0 — R2 Acceptance**):
     - Instantiate full `Game` in `training` mode (and test `Player` directly) for custom skins across all 4 fighters (`void_walker`, `cyber_valkyrie`, `frost_empress`, `blood_moon`).
     - Simulate **60 consecutive attacks** (mix of 6-hit ground combos, 3-hit air combos, dash-slashes, and `[U]` skills) across `~20s` of `SIM_STEP = 1/120s` frames while rendering every 4th frame.
     - Assert peak `particles.getActiveCount() <= 720`, `slashTrails <= 24`, `afterimages <= 24` (bounded plateau, NOT linear growth with attack count).
     - Stop attacking and simulate `3.5s` of idle frames; assert `player.getActiveVfxCounts()` === `{ slashTrails: 0, afterimages: 0 }` AND `particles.getActiveCount() === 0` (when ambient aura emission is paused or via isolated `Player` + `ParticleSystem` after settling `3.5s` without new ambient emissions) AND verify in `Game` `training` mode that ambient `getActiveCount()` settles to a small constant steady-state (`<= 25`) rather than growing linearly!
106. `T4-02` (**12-Skin Full Combat Cycling with Zero Uncaught Exceptions — Acceptance Criterion 2**):
     - Attach global `uncaughtException` / `unhandledRejection` / `console.error` listeners.
     - Instantiate `Game` with mock canvas (`1280×720`) and cycle through all **12 `(CharacterId, SkinId)` pairs** sequentially:
       - Select character & skin on Title (`setCharacter`, `setSkin`), step `10` idle frames + `render()`.
       - Start `'training'` mode (`startMode('training')`), stand up, perform full 6-hit combo, jump + 3-hit air combo, dash + dash-slash, parry, `[U]` signature skill, `[O]` Awakening + awakened combo, `[I]` Ultimate cutscene to completion (`2.8s`), calling `render()` every frame.
       - Return to Title (`enterTitleState()`).
     - Assert: **0 uncaught exceptions**, **0 console errors**, **0 `NaN` coordinates** in any Canvas2D draw call, `HudSnapshot.skinId` matches each active skin, and `save/restore` stack depth returns to `0` on every frame.
107. `T4-03` (**Mock-Canvas2D Draw Trace + Python Pillow 13.0.0 12-Skin Visual PNG Verification — R1 Visual Acceptance**):
     - For each of the **12 `(CharacterId, SkinId)` pairs**, set up a deterministic active combat swing snapshot (fighter at `(360, 295)` facing right in mid-combo heavy strike with active `SlashTrail`s, swing aura, weapon, dark foot aura, and burst of skin-themed `ParticleSystem` accents).
     - Render into mock `CanvasRenderingContext2D` (`720×480`), export draw-call JSON trace (`tests/e2e/.tmp_traces.json` or scratch), and invoke `python3 tests/e2e/render-skins.py` using **Pillow 13.0.0** to produce:
       - 12 individual PNGs (`<outDir>/skin_01_kuro_default.png` .. `skin_12_zero_astral_phantom.png`) with clean dark stage backdrop (`#0d111b`), floor line, fighter + weapon + aura + slash trail + particles, and crisp label header (`KURO · Default`, `KURO · Radiant Seraph`, etc.).
       - 1 combined `4×3` comparison contact sheet (`<outDir>/all_12_skins_grid.png`, `2880×1440` or `1440×1080`).
     - Programmatic PNG assertions (returned by `render-skins.py` JSON summary):
       - All 13 PNG files exist and decode via `Image.open(...).verify()`.
       - Every skin PNG has `> 5%` non-background foreground pixels (not blank) and active slash-zone pixels ahead of fighter.
       - All `12 * 11 / 2 = 66` pairwise image comparisons have mean per-pixel RGB difference (`MAE > 1.5`) — proving every single one of the 12 rendered frames is visually distinct!
108. `T4-04` (**R3 Gameplay & Hitbox Regression Across All Skins**):
     - Run scripted combat against `Enemy('shield_guard', ...)` and `Boss('boss_haiku', ...)` across all 3 skins of each of the 4 characters with identical inputs and fixed PRNG seed.
     - Assert identical enemy HP deltas, identical boss posture deltas, identical `ActiveMeleeHitbox` bounds & timing, and identical `combo` / `styleScore` / `score` progression across all 3 skins of each fighter.
109. `T4-05` (**Title Screen Live Idle + Rapid 36-Switch Skin Stress + React SSR Verification**):
     - On `Game` in `title` state, cycle rapidly through all 12 skins 3 times (`36` switches) interleaved with `update(1/60)` and `render()`, checking `TitleScreen` SSR markup at each step.
     - Assert `HudSnapshot` updates `skinId` on every switch, `TitleScreen` renders the selected skin badge/kanji, `player.getActiveVfxCounts()` stays bounded (`0` trails/afterimages), and no memory/particle leak occurs.
110. `T4-06` (**Campaign Multi-Mode Transition & Entity Cleanup Workload**):
     - Exercise `story` -> `boss_rush` -> `endless` -> `training` -> `title` transitions while spawning `IceWall`, `MagmaPillar`, `Projectile` (`fire_wave`, `sword_wave`, `kunai`, `volt_lance`, `void_crescent`), and `StageHazard` across custom skins.
     - Verify every entity renders cleanly under mock Canvas2D and every mode reset leaves 0 stale entities/trails/particles from the previous mode.

---

## 3. Mock-`CanvasRenderingContext2D` Recorder & Python `Pillow 13.0.0` Rasterizer Spec

### 3.1 Exact Canvas2D API Surface Used by `src/game/`
Verified by scanning all 19 files in `src/game/`:
- **Methods actually called**:
  - State & Transform: `save()`, `restore()`, `translate(x, y)`, `scale(sx, sy)`, `rotate(angle)`
  - Path Building: `beginPath()`, `closePath()`, `moveTo(x, y)`, `lineTo(x, y)`, `quadraticCurveTo(cpx, cpy, x, y)`, `bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)`, `arc(x, y, r, sa, ea, ccw?)`, `ellipse(x, y, rx, ry, rot, sa, ea, ccw?)`
  - Drawing: `fill()`, `stroke()`, `fillRect(x, y, w, h)`, `strokeRect(x, y, w, h)`, `fillText(text, x, y)`, `strokeText(text, x, y)`
  - Dash & Gradients: `setLineDash(segments)`, `createLinearGradient(x0, y0, x1, y1)`, `createRadialGradient(x0, y0, r0, x1, y1, r1)` (returning object with `addColorStop(offset, color)`)
- **Properties actually read/written**:
  - `fillStyle`, `strokeStyle`, `lineWidth`, `lineCap`, `lineJoin`, `globalAlpha`, `globalCompositeOperation`, `font`, `textAlign`, `textBaseline`
- **Defensive Stubs (for forward safety & assertions)**:
  - `shadowBlur` (default `0`, record max observed `shadowBlur` to assert `=== 0` in F8!), `shadowColor`, `clearRect`, `rect`, `roundRect`, `clip`, `measureText(text) => { width: text.length * 10 }`, `resetTransform`, `setTransform`.

### 3.2 Recording Architecture (`tests/e2e/helpers/mockCanvas.ts`)
To prevent Pillow transform bugs with `scale(-1, 1)` (left-facing) and `scale(1, -0.58)` (floor reflection), the TypeScript `RecordingContext2D` maintains:
1. **State Stack**: `[ { matrix: [a,b,c,d,e,f], fillStyle, strokeStyle, lineWidth, lineCap, lineJoin, globalAlpha, globalCompositeOperation, font, textAlign, textBaseline, lineDash } ]`.
2. **Screen-Space Path Tessellation on `beginPath()` -> `fill()` / `stroke()`**:
   - `moveTo(x, y)` / `lineTo(x, y)` -> transforms `(x, y)` by `matrix` -> emits `{ t: 'M'|'L', x, y }`.
   - `quadraticCurveTo(cpx, cpy, x, y)` -> samples `N = 12` points along `B(t)` in local space, transforms each by `matrix`, emits `'L'` segments (for `M` start if needed).
   - `bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` -> samples `N = 16` points along cubic Bezier, transforms by `matrix`.
   - `arc(cx, cy, r, sa, ea, ccw)` -> normalizes sweep (`ccw ? sa - ea ...`) and samples `N = max(12, ceil(abs(sweep) * 16))` points `(cx + cos(a)*r, cy + sin(a)*r)`, transforming each by `matrix`! Note: if `currentPath` already has points (e.g. `arc` ring donut in `renderSlashTrails:3668-3669`), connects with `'L'` (standard HTML5 Canvas2D behavior!), else starts with `'M'`.
   - `ellipse(cx, cy, rx, ry, rot, sa, ea, ccw)` -> samples rotated ellipse `(cx + rx*cos(a)*cos(rot) - ry*sin(a)*sin(rot), ...)` and transforms by `matrix`.
   - `closePath()` -> emits `{ t: 'Z' }`.
3. **Gradient Serialization**:
   - `MockCanvasGradient` stores `{ kind: 'linear'|'radial', x0, y0, r0, x1, y1, r1, stops: Array<[number, string]> }` and transforms `(x0, y0)` / `(x1, y1)` by `matrix` at `fill()`/`stroke()` time!
4. **Draw Command Stream**:
   Each `fill()`, `stroke()`, `fillRect()`, `strokeRect()`, `fillText()`, `strokeText()` pushes a flat JSON-serializable command:
   ```ts
   export interface DrawCommand {
     op: 'fill' | 'stroke' | 'fillRect' | 'strokeRect' | 'fillText' | 'strokeText';
     subpaths?: Array<{ closed: boolean; pts: Array<[number, number]> }>;
     rectPts?: Array<[number, number]>; // 4 transformed corners
     text?: string; x?: number; y?: number; fontSize?: number; textAlign?: string;
     style: string | SerializedGradient;
     lineWidth: number;
     lineCap: CanvasLineCap;
     globalAlpha: number;
     composite: GlobalCompositeOperation; // 'source-over' | 'lighter'
   }
   ```
   Also tracks `metrics`: `{ maxSaveDepth, unbalancedSaveRestore, shadowBlurUsed, nanDetected, uniqueColors: Set<string>, opCounts: Record<string, number> }`.

### 3.3 Python `Pillow 13.0.0` PNG Rasterizer (`tests/e2e/render-skins.py`)
1. **Canvas Initialization**: `base = Image.new('RGBA', (width, height), (9, 11, 16, 255))`.
2. **Custom `parse_css_color(style, global_alpha)`**:
   - Handles `#RRGGBB`, `#RRGGBBAA` (e.g. `#a855f738`), `#RGB`, `rgb(r,g,b)`, `rgba(r,g,b,a)` with float `a` & arbitrary whitespace (avoiding `ImageColor.getrgb('rgba(...)')` which raises `ValueError` in Pillow 13.0.0!).
   - For `SerializedGradient`: interpolates primary stop or blends linear/radial gradient across bounding box so aura glows (`createRadialGradient` fading to `rgba(0,0,0,0)`) and blades render with smooth soft falloff rather than solid circles!
3. **Layer Compositing**:
   - Create temp layer `layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))` for each draw op (or batch contiguous `'source-over'` opaque ops).
   - `fill`: `ImageDraw.Draw(layer, 'RGBA').polygon(pts, fill=rgba)` (for radial gradients: draw concentric stepped alpha rings or pixel-box radial mask).
   - `stroke`: `ImageDraw.Draw(layer, 'RGBA').line(pts, fill=rgba, width=max(1, round(lineWidth)), joint='curve')`; if `lineCap == 'round'` and `lineWidth >= 3`, draw circles of radius `lineWidth / 2` at endpoints/vertices for crisp cel-shaded outlines!
   - `fillText` / `strokeText`: `ImageFont.load_default(size=fontSize)`.
   - Compositing onto `base`:
     - If `composite == 'lighter'`: premultiply `layer` RGB by its alpha (`Image.composite` against black `(0,0,0,0)` or `ImageChops.multiply`), then `base = ImageChops.add(base, glow_rgb_rgba)`!
     - Else (`'source-over'`): `base = Image.alpha_composite(base, layer)`.
4. **12-Skin Frame Staging & Output**:
   - Canvas size per skin: `720×480` (world `GROUND_Y` centered cleanly so full fighter, weapon, slash arc `radius ~ 115px`, swing aura, dark ink foot puddle, and particles fit with generous margins).
   - Stage background: subtle `#090b10` -> `#121826` floor band at `y = 370` + grid accent so bright white/gold/cyan/crimson slashes pop with high contrast.
   - Header badge drawn cleanly at top-left: `[CHARACTER] · [SKIN NAME] ([motif])`.
   - Generates 12 individual PNGs (`skin_01_...png` .. `skin_12_...png`) + 1 `4×3` grid (`all_12_skins_grid.png`) inside `<outDir>` (with `.nomedia`).
   - Emits JSON metrics report (`non_bg_ratios`, `pairwise_mae_min`, `duplicate_pairs: []`) and exits `0` iff all 12 frames are non-blank and pairwise distinct (`min MAE > 1.5`).

---

## 4. `/data` Scratch Build & Typecheck Verification Steps

Empirically verified on this device:
- **Why `/data` scratch is mandatory**:
  - In `/storage/emulated/0/Antigravity/Stickman`:
    - `node_modules/typescript` is `v7.0.2` (`tsgo`), which fails on Android ARM64 with `Error: Unable to resolve @typescript/typescript-android-arm64`.
    - `vite build` requires executable native binaries (`rolldown` / `lightningcss` / `esbuild`), blocked by Android `noexec` mount on `/storage/emulated/0`.
  - In `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build`:
    - Pure-JS `typescript@5.8.3` is installed and executable!
    - `vite@8.3.8` native binaries execute cleanly!

- **Exact Verification Procedure (for M4 / Final Gate)**:
  ```bash
  # 1. Sync updated source & config files from Stickman to scratch (preserve scratch node_modules!)
  SRC="/storage/emulated/0/Antigravity/Stickman"
  BUILD="/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build"
  rm -rf "$BUILD/src" "$BUILD/public" "$BUILD/dist"
  cp -r "$SRC/src" "$BUILD/src"
  [ -d "$SRC/public" ] && cp -r "$SRC/public" "$BUILD/public"
  cp "$SRC/index.html" "$SRC/package.json" "$SRC/tsconfig.json" "$SRC/vite.config.ts" "$BUILD/"

  # 2. TypeScript Typecheck (pure-JS typescript@5.8.3)
  (cd "$BUILD" && node node_modules/typescript/bin/tsc --noEmit)

  # 3. Production Vite Build (vite@8.3.8)
  (cd "$BUILD" && node node_modules/vite/bin/vite.js build)
  ```
- **Pass Criteria**:
  - `tsc --noEmit` exits `0` with zero diagnostics.
  - `vite build` exits `0`, produces `dist/index.html`, `dist/assets/*.css`, `dist/assets/*.js`.
  - `node tests/e2e/run-e2e.mjs --with-unit --tier=all` exits `0` (17/17 unit + >= 104 E2E tests).
  - Visual inspection of `all_12_skins_grid.png` and individual skin PNGs via `view_file` confirms all 12 skins are clearly distinct, legible, and free of rendering artifacts.
