# M1 & M2 Design Blueprint — 12-Skin Attack VFX System

> **Core Summary**: Complete read-only design specification for Milestone M1 (`types.ts`, `skinVfx.ts`, `characters.ts`, `ParticleSystem.ts`) and Milestone M2 (`StickmanRenderer.ts`, `UltimateCutscene.ts`, `animation.ts`). Defines 12 strictly unique `SkinVfxProfile` configurations (0 collisions across motifs, palettes, particles, and cutscenes), resolves the `kagura/frost_empress` vs `zero/astral_phantom` `slashColors` collision, and provides zero-`shadowBlur` Canvas 2D draw recipes.

---

## 1. Existing Codebase Observations

| File | Verified Line(s) | Current State / Gap |
|---|---|---|
| `src/game/types.ts` | 5–17 | Exports `CharacterId` (`'kuro' \| 'raijin' \| 'kagura' \| 'zero'`) and `SkinId` (9 IDs yielding 12 pairs). Lacks VFX theme/motif union types. |
| `src/game/characters.ts` | 529, 602 | **Collision**: both `kagura/frost_empress` (line 529) and `zero/astral_phantom` (line 602) define `slashColors: ['#38bdf8', '#c084fc']`. |
| `src/game/rules.test.ts` | 139–160, 250–270 | Does NOT assert `slashColors` values; asserts `CHARACTER_ORDER.length === 4`, unique `ultimateKanji` (4), unique `specialKind` (4), `zero.maxJumps === 3`, fallback `getCharacterDef('unknown_id').id === 'kuro'`, and `getAwakenedVisualProfile(id)` returning 4 unique `motif`s. |
| `src/game/ParticleSystem.ts` | 3–15, 37, 380–675 | `MAX_PARTICLES = 500`. `ParticleKind` declares `'ink_splatter'` (line 12) with NO emitter and NO render case. Lacks `'feather'`, `'petal'`, `'star'`, `'shard'`, `getActiveCount()`, and `getPoolCapacity()`. |
| `src/game/StickmanRenderer.ts` | 108–197, 1374–1423, 2332–2668, 2827–3268, 3486–3690 | `SlashTrail` lacks skin/motif fields; line 3675 hardcodes `style === 'heavy_cleave' ? '#fde047' : s.outerColor`; `renderSlashTrails` has 6 base `style` shapes and 0 skin motifs; no per-skin swing aura during active attacks; `renderDarkInkAura` ignores `skinId`; `renderAwakenedBackForm` & `renderAwakenedHeadForm` only branch `skinId` for `kuro`; `renderWeapon` has no `skinId` parameter so Raijin/Kagura/Zero skins use base weapon colors. |
| `src/game/UltimateCutscene.ts` | 161–173, 343–663 | Only `radiant_seraph` and `void_walker` have skin branches; `renderVoltJudgment`, `renderSolarInferno`, and `renderPhantomEclipse` hardcode base character colors for all 6 Raijin/Kagura/Zero skins. |
| `src/game/animation.ts` | 163–207 | `getAwakenedVisualProfile(characterId)` only takes `characterId`. |
| `src/game/*.ts` | All | `grep_search` for `shadowBlur` returned **0 matches** — zero `ctx.shadowBlur` constraint is currently clean and must be preserved. |

---

## 2. Collision Fix in `src/game/characters.ts` (M1)

In `src/game/characters.ts`:
- `kagura/frost_empress` (line 529, "Frostfire Oni · 蒼炎鬼"): keep `slashColors: ['#38bdf8', '#c084fc']` (glacial cyan + oni violet, matching `accentColor: '#38bdf8'` and armor `core: '#c084fc'`).
- `zero/astral_phantom` (line 602, "Astral Phantom · 星雲"): change from `['#38bdf8', '#c084fc']` to **`['#818cf8', '#fde047']`** (cosmic indigo `#818cf8` + starlight gold `#fde047`, matching `scarfPrimary: '#4338ca'`, `scarfHighlight: '#fde047'`, `ultimatePrimaryColor: '#4f46e5'`, `ultimateSecondaryColor: '#fef08a'`, armor `trim: '#fde047'`).

### Verification of All 12 `slashColors` Pairs After Fix
1. `kuro/default`: `['#38bdf8', '#ef4444']`
2. `kuro/radiant_seraph`: `['#fde047', '#f59e0b']`
3. `kuro/void_walker`: `['#a855f7', '#e879f9']`
4. `raijin/default`: `['#22d3ee', '#facc15']`
5. `raijin/storm_shogun`: `['#60a5fa', '#fde047']`
6. `raijin/cyber_valkyrie`: `['#22d3ee', '#e879f9']`
7. `kagura/default`: `['#fb923c', '#facc15']`
8. `kagura/solar_phoenix`: `['#fde047', '#f97316']`
9. `kagura/frost_empress`: `['#38bdf8', '#c084fc']`
10. `zero/default`: `['#34d399', '#a7f3d0']`
11. `zero/blood_moon`: `['#f43f5e', '#fecdd3']`
12. `zero/astral_phantom`: `['#818cf8', '#fde047']`

**Result**: 12/12 strictly unique tuples; `rules.test.ts` (17/17) unaffected.

---

## 3. Shared Types (`src/game/types.ts`) & 12-Skin Registry (`src/game/skinVfx.ts`) — M1

### 3.1 Types to Export from `src/game/types.ts` (and re-export from `src/game/skinVfx.ts`)

```ts
export type SlashVfxMotif =
  | 'iaido_ink'
  | 'seraph_feathers'
  | 'void_rift'
  | 'volt_arc'
  | 'shogun_drums'
  | 'cyber_glitch'
  | 'flame_lick'
  | 'phoenix_plume'
  | 'frostfire_crystal'
  | 'shadow_wisps'
  | 'blood_crescent'
  | 'astral_constellation';

export type SkinParticleAccentKind =
  | 'spark'
  | 'ember'
  | 'ice'
  | 'lightning'
  | 'smoke'
  | 'feather'
  | 'petal'
  | 'star'
  | 'shard'
  | 'ink_splatter';

export type PillarTheme = 'fire' | 'phoenix' | 'frostfire';

export type ProjectileTheme =
  | 'default'
  | 'seraph'
  | 'void'
  | 'shogun'
  | 'cyber'
  | 'phoenix'
  | 'frostfire'
  | 'blood_moon'
  | 'astral';
```

### 3.2 `SkinVfxProfile` Interface & Helpers (`src/game/skinVfx.ts`)

Matches `PROJECT.md` Interface Contracts exactly:
- `SKIN_VFX_PROFILES: Record<string, SkinVfxProfile>` (12 keys `${characterId}:${skinId}`)
- `getSkinVfxKey(characterId: CharacterId, skinId: SkinId): string`
- `getSkinVfxProfile(characterId: CharacterId, skinId: SkinId = 'default'): SkinVfxProfile` (falls back to `${characterId}:default`, then `kuro:default`)
- `listAllSkinVfxProfiles(): SkinVfxProfile[]` (returns all 12 profiles in deterministic order)

### 3.3 Exact 12 `SkinVfxProfile` Table (100% Unique Across Every Visual Subset)

| `profileId` | `motif` | `slashPrimary` / `slashSecondary` | `slashRim` / `slashCore` | `swingAuraColor` / `swingAuraSecondary` | `auraTendrilPrimary` / `auraTendrilSecondary` | `afterimageColor` | `particlePrimary` / `particleSecondary` | `swingParticleKind` / `finisherParticleKind` | `impactRingColor` / `hitTextColor` / `detonationColor` | `projectileTheme` / `pillarTheme` / `iceWallTheme` | `cutscenePrimary` / `cutsceneSecondary` / `cutsceneAccent` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `kuro:default` | `iaido_ink` | `#38bdf8` / `#ef4444` | `#7dd3fc` / `#ffffff` | `#7c3aed` / `#38bdf8` | `#7c3aed` / `rgba(124, 58, 237, 0.32)` | `#6366f1` | `#38bdf8` / `#ef4444` | `ink_splatter` / `spark` | `#38bdf8` / `#a5b4fc` / `#38bdf8` | `default` / `fire` / `ice` | `#dc2626` / `#fde68a` / `#070508` |
| `kuro:radiant_seraph` | `seraph_feathers` | `#fde047` / `#f59e0b` | `#fef9c3` / `#ffffff` | `#facc15` / `#fef9c3` | `#eab308` / `rgba(250, 204, 21, 0.36)` | `#fde047` | `#fef9c3` / `#f59e0b` | `feather` / `star` | `#facc15` / `#fef9c3` / `#f59e0b` | `seraph` / `fire` / `seraph` | `#f59e0b` / `#fef9c3` / `#0c0904` |
| `kuro:void_walker` | `void_rift` | `#a855f7` / `#e879f9` | `#d8b4fe` / `#fdf4ff` | `#9333ea` / `#f0abfc` | `#a855f7` / `rgba(147, 51, 234, 0.36)` | `#c084fc` | `#c084fc` / `#e879f9` | `shard` / `ink_splatter` | `#a855f7` / `#f0abfc` / `#d946ef` | `void` / `fire` / `void` | `#7e22ce` / `#e9d5ff` / `#070410` |
| `raijin:default` | `volt_arc` | `#22d3ee` / `#facc15` | `#a5f3fc` / `#ecfeff` | `#06b6d4` / `#fef08a` | `#06b6d4` / `rgba(6, 182, 212, 0.34)` | `#22d3ee` | `#22d3ee` / `#facc15` | `lightning` / `spark` | `#06b6d4` / `#67e8f9` / `#facc15` | `default` / `fire` / `ice` | `#0284c7` / `#fef08a` / `#040a1a` |
| `raijin:storm_shogun` | `shogun_drums` | `#60a5fa` / `#fde047` | `#bfdbfe` / `#fefce8` | `#2563eb` / `#fde047` | `#3b82f6` / `rgba(37, 99, 235, 0.36)` | `#60a5fa` | `#fbbf24` / `#60a5fa` | `spark` / `lightning` | `#fbbf24` / `#fde047` / `#60a5fa` | `shogun` / `fire` / `ice` | `#1d4ed8` / `#fde047` / `#03091f` |
| `raijin:cyber_valkyrie` | `cyber_glitch` | `#22d3ee` / `#e879f9` | `#f0abfc` / `#f0fdfa` | `#d946ef` / `#67e8f9` | `#e879f9` / `rgba(217, 70, 239, 0.35)` | `#e879f9` | `#e879f9` / `#67e8f9` | `shard` / `lightning` | `#e879f9` / `#e879f9` / `#f0abfc` | `cyber` / `fire` / `ice` | `#c026d3` / `#67e8f9` / `#090418` |
| `kagura:default` | `flame_lick` | `#fb923c` / `#facc15` | `#fed7aa` / `#fffbeb` | `#f97316` / `#fb7185` | `#f97316` / `rgba(249, 115, 22, 0.35)` | `#fb923c` | `#f97316` / `#fb7185` | `ember` / `smoke` | `#fb923c` / `#fdba74` / `#ea580c` | `default` / `fire` / `ice` | `#ea580c` / `#fef08a` / `#120402` |
| `kagura:solar_phoenix` | `phoenix_plume` | `#fde047` / `#f97316` | `#fca5a5` / `#fff7ed` | `#ef4444` / `#fde047` | `#fbbf24` / `rgba(239, 68, 68, 0.36)` | `#f97316` | `#fde047` / `#ef4444` | `feather` / `ember` | `#ef4444` / `#facc15` / `#fbbf24` | `phoenix` / `phoenix` / `ice` | `#dc2626` / `#fde047` / `#1c0602` |
| `kagura:frost_empress` | `frostfire_crystal` | `#38bdf8` / `#c084fc` | `#e0f2fe` / `#f0f9ff` | `#0ea5e9` / `#c084fc` | `#22d3ee` / `rgba(14, 165, 233, 0.36)` | `#38bdf8` | `#bae6fd` / `#c084fc` | `ice` / `shard` | `#22d3ee` / `#bae6fd` / `#0284c7` | `frostfire` / `frostfire` / `ice` | `#0284c7` / `#e0f2fe` / `#04101f` |
| `zero:default` | `shadow_wisps` | `#34d399` / `#a7f3d0` | `#6ee7b7` / `#ecfdf5` | `#10b981` / `#a7f3d0` | `#10b981` / `rgba(16, 185, 129, 0.34)` | `#10b981` | `#34d399` / `#a7f3d0` | `smoke` / `ink_splatter` | `#10b981` / `#6ee7b7` / `#34d399` | `default` / `fire` / `ice` | `#059669` / `#d1fae5` / `#02120d` |
| `zero:blood_moon` | `blood_crescent` | `#f43f5e` / `#fecdd3` | `#fda4af` / `#fff1f2` | `#e11d48` / `#fda4af` | `#f43f5e` / `rgba(225, 29, 72, 0.36)` | `#f43f5e` | `#fb7185` / `#ffe4e6` | `petal` / `ink_splatter` | `#f43f5e` / `#fda4af` / `#e11d48` | `blood_moon` / `fire` / `ice` | `#e11d48` / `#ffe4e6` / `#140308` |
| `zero:astral_phantom` | `astral_constellation` | `#818cf8` / `#fde047` | `#7dd3fc` / `#fef9c3` | `#4f46e5` / `#fde047` | `#6366f1` / `rgba(79, 70, 229, 0.36)` | `#818cf8` | `#7dd3fc` / `#fef08a` | `star` / `star` | `#818cf8` / `#fef08a` / `#4f46e5` | `astral` / `fire` / `ice` | `#4f46e5` / `#fef08a` / `#06041a` |

**Uniqueness Audit**:
- `motif`: 12/12 unique.
- `(slashPrimary, slashSecondary)`: 12/12 unique (exact match with `characters.ts` `slashColors`!).
- `(swingAuraColor, swingAuraSecondary)`: 12/12 unique.
- `(auraTendrilPrimary, auraTendrilSecondary)`: 12/12 unique.
- `afterimageColor`: 12/12 unique.
- `(particlePrimary, particleSecondary)`: 12/12 unique.
- `(swingParticleKind, finisherParticleKind)`: 12/12 unique.
- `impactRingColor`, `hitTextColor`: 12/12 unique each.
- `(cutscenePrimary, cutsceneSecondary, cutsceneAccent)`: 12/12 unique.

---

## 4. `ParticleSystem.ts` Blueprint (M1)

1. **Pool Capacity & Inspection**:
   - Export `export const MAX_PARTICLES = 720;` (line 37, up from 500).
   - Add `getActiveCount(): number` and `getPoolCapacity(): number`.
2. **`ParticleKind` Extension**:
   - Add `'feather' | 'petal' | 'star' | 'shard'` to `ParticleKind` (alongside existing `'ink_splatter'`).
3. **5 New Pooled Emitters** (all `maxLife <= 0.45`, zero allocations outside pre-allocated `pool`):
   - `emitFeathers(x, y, count, color = '#fef9c3', spread = 120, scale = 1)`: `maxLife = 0.28..0.44`, `size = (7..12)*scale`, `endSize = size*0.55`, `gravity = 190`, `drag = 0.94`, `vRot = ±3`.
   - `emitPetals(x, y, count, color = '#fb7185', spread = 140, scale = 1)`: `maxLife = 0.28..0.44`, `size = (5.5..10)*scale`, `endSize = size*0.6`, `gravity = 160`, `drag = 0.94`, `vRot = ±4.5`.
   - `emitStars(x, y, count, color = '#fef08a', spread = 180, scale = 1)`: `maxLife = 0.22..0.40`, `size = (6..11)*scale`, `endSize = 1.5`, `gravity = 0`, `drag = 0.91`, `vRot = ±4`.
   - `emitShards(x, y, count, color = '#c084fc', spread = 240, scale = 1)`: `maxLife = 0.20..0.38`, `size = (6..12)*scale`, `endSize = 1.8`, `gravity = 560`, `drag = 0.95`, `vRot = ±7`.
   - `emitInkSplatter(x, y, count, color = '#38bdf8', spread = 220, scale = 1)`: `maxLife = 0.20..0.36`, `size = (4.5..9.5)*scale`, `endSize = 0.8`, `gravity = 640`, `drag = 0.93`, `rotation = angle`, `vRot = 0`.
4. **Flutter in `update(dt)`**:
   - For `'feather'` and `'petal'`, apply `p.x += Math.sin(p.life * 16 + p.rotation) * 32 * dt;` so feathers/petals drift organically before expiring at `p.life >= p.maxLife`.
5. **Canvas 2D `render(ctx)` Recipes (ZERO `ctx.shadowBlur`, all wrapped in `ctx.save()` / `ctx.restore()`)**:
   - `'feather'`: Curved quill polygon filled with `p.color` + `#ffffff` center rachis line.
   - `'petal'`: Notched teardrop sakura/rose petal filled with `p.color` + `#090b10` 1.1px ink stroke.
   - `'star'`: Additive (`'lighter'`) 4-point star polygon (`outer = curSize`, `inner = curSize * 0.24`) in `p.color` + smaller `#ffffff` core star.
   - `'shard'`: Faceted crystal diamond filled with `p.color`, `#090b10` 1.4px outline + `#ffffff` specular edge highlight.
   - `'ink_splatter'`: Colored outer splash ellipse (`p.color`) + obsidian `#090b10` pointed ink-drop core + trailing micro-droplet (`p.color`).

---

## 5. `StickmanRenderer.ts` Blueprint (M2)

### 5.1 Type Extensions
- **`SlashTrail`** (lines 108–121): add optional `skinId?: SkinId`, `characterId?: CharacterId`, `rimColor?: string`, `secondaryColor?: string`, `motif?: SlashVfxMotif`, `seed?: number`.
- **`StickmanRenderOptions`** (lines 133–197, plus `export type StickmanRenderParams = StickmanRenderOptions;`): add optional `attackProgress?: number`, `attackAuraColor?: string`, `attackAuraSecondary?: string`, `vfxMotif?: SlashVfxMotif`, `auraRimColor?: string`, `auraPuddleColor?: string`.

### 5.2 Hardcoded `#fde047` Removal (`StickmanRenderer.ts:3675`)
Replace:
```ts
ctx.strokeStyle = style === 'heavy_cleave' ? '#fde047' : s.outerColor;
```
With:
```ts
const rimCol = s.rimColor ?? s.secondaryColor ?? s.outerColor;
ctx.strokeStyle = style === 'heavy_cleave' ? rimCol : s.outerColor;
```
Also in `arc`/`heavy_cleave` (lines 3664–3688), when `s.secondaryColor` is provided, stroke a subtle mid-arc accent band (`s.secondaryColor`, `globalAlpha = inv * 0.68`, `lineWidth = s.thickness * 0.45 * thickMult * inv`, radius `s.radius + s.thickness * 0.12`) between the translucent fan wedge and the razor core!

### 5.3 12 Per-Skin Slash Motifs in `renderSlashTrails`
Inside `renderSlashTrails(ctx, trails)`, compute a deterministic anchor point `(anchorX, anchorY, anchorAng)` for whichever `style` was drawn (`spear_thrust`, `spear_flurry`, `twin_x`, `iaido_line`, `arc`/`heavy_cleave`) and call `renderSlashMotifOrnament(ctx, s, motif, t, inv)` inside `ctx.save()` / `ctx.restore()` (with `globalCompositeOperation = 'lighter'` where appropriate, ZERO `shadowBlur`, deterministic trig using `s.seed ?? 0`):

| Motif | Canvas 2D Ornament Recipe |
|---|---|
| `iaido_ink` | 4 obsidian `#090b10` sumi-e ink droplets + `s.outerColor` rim arcs + 2 crisp white katana speed needles trailing the cut |
| `seraph_feathers` | 4 golden-white feather ellipses (`#fef9c3` fill, `#f59e0b` rachis) fanned along the slash + 4-point holy star glint at cut head |
| `void_rift` | Jagged `#0f0720` spatial crack zigzag down slash centerline bordered by `#e879f9` + 3 diamond void shards along arc |
| `volt_arc` | 5-segment jagged lightning bolt (`#22d3ee` outer 4.5px, `#fef08a` core 1.8px) tracing the sweep + electric spark nodes |
| `shogun_drums` | 3 rotating imperial gold-rimmed tomoe circles (`#1d4ed8` fill, `#fde047` ring) spaced along arc + cobalt-gold lightning spikes |
| `cyber_glitch` | 5 stepped horizontal/angled `fillRect` holographic glitch slices alternating `#22d3ee` & `#e879f9` + diamond reticle at tip |
| `flame_lick` | 4 curved `quadraticCurveTo` pointed fire tongues (`#fb923c` outer, `#fffbeb` core) curling outward from sweep |
| `phoenix_plume` | 3 elongated swept crimson-gold tail plumes (`#ef4444` -> `#fde047`) tapering behind the arc head |
| `frostfire_crystal` | 4 sharp triangular/diamond glacial crystal spikes (`#38bdf8` fill, `#e0f2fe` edge) + 2 `#c084fc` frostfire embers |
| `shadow_wisps` | 3 dark `#090b10` curling ninja smoke ribbons outlined in `#34d399` trailing behind the slash |
| `blood_crescent` | Secondary `#e11d48`/`#fecdd3` crescent moon arc overlay + 4 drifting notched rose petals along the sweep |
| `astral_constellation` | 4 twinkling 4-point stars (`#fde047` / `#7dd3fc`) linked by crisp thin constellation segments (`#818cf8`) along the sweep |

### 5.4 Per-Skin Swing Aura (`renderAttackSwingAura`)
Called inside `renderStickman` when `opts.attackProgress !== undefined && opts.attackProgress >= 0 && opts.attackProgress < 1 && !isMono`:
- Envelope: `const env = Math.sin(p * Math.PI);` (0 at start/end, 1 at strike peak).
- Wrapped in `ctx.save()`, `ctx.translate(joints.spineMid.x, joints.spineMid.y)`, `ctx.globalCompositeOperation = 'lighter'`, `ctx.globalAlpha = env * 0.65`, `ctx.restore()`.
- Draws:
  1. Expanding energy shock ring (`radius = 34 + p * 24`, outer `attackAuraColor` 5px, inner `attackAuraSecondary` 2px).
  2. Motif-specific body-aura flare (e.g., wing flare arcs for `seraph_feathers`/`phoenix_plume`, crackling spikes for `volt_arc`/`shogun_drums`/`cyber_glitch`, tilted constellation ring for `void_rift`/`astral_constellation`, crystal/flame tongues for `frostfire_crystal`/`flame_lick`, sumi-e/petal wisps for `iaido_ink`/`shadow_wisps`/`blood_crescent`).

### 5.5 `renderDarkInkAura` Skin Support (`StickmanRenderer.ts:1374-1423`)
Pass `opts.skinId`, `opts.auraRimColor`, `opts.auraPuddleColor` to `renderDarkInkAura(...)`:
- Uses `auraRimColor` / `auraPuddleColor` if supplied, otherwise resolves via `skinId` skin table (e.g., `radiant_seraph` golden light pool without dark `#0d0b12` soot puddle; `frost_empress` icy cyan-slate crystal spikes; `blood_moon` crimson crescent pool; `astral_phantom` deep indigo nebula pool with 3 star dots; `cyber_valkyrie` stepped neon-magenta digital spires; `storm_shogun` cobalt-gold zigzags; `solar_phoenix` blazing crimson-gold plumes).

### 5.6 `renderAwakenedBackForm`, `renderAwakenedHeadForm`, `renderWeapon` Skin Accents
- **`renderAwakenedBackForm`** (lines 2395–2507):
  - `raijin`: `storm_shogun` uses `#1d4ed8` / `#fde047` 7-drum halo; `cyber_valkyrie` uses `#e879f9` / `#22d3ee` rotating holographic circuit ring + hexagonal nodes.
  - `kagura`: `solar_phoenix` uses `#dc2626` / `#f97316` / `#fef9c3` triple-plume solar wings + sun halo; `frost_empress` uses `#0284c7` / `#38bdf8` / `#e0f2fe` / `#c084fc` jagged glacial crystal wings (zero orange!).
  - `zero`: `blood_moon` uses `#4c0519` / `#f43f5e` wings + `#f43f5e`/`#fecdd3` orbiting blood kunai; `astral_phantom` uses `#1e1b4b` / `#7dd3fc` wings + `#fde047`/`#38bdf8` orbiting 4-point astral blades.
- **`renderAwakenedHeadForm`** (lines 2603–2665):
  - `raijin`: `storm_shogun` gold-cobalt crown spikes + `#60a5fa` flare; `cyber_valkyrie` twin `#e879f9`/`#22d3ee` holo-horns + `#f0abfc` beam.
  - `kagura`: `solar_phoenix` crimson-gold 5-plume diadem + `#fef08a` spine; `frost_empress` glacial-cyan `#bae6fd`/`#0284c7` + `#c084fc` frostfire crown + `#38bdf8` spine.
  - `zero`: `blood_moon` `#f43f5e`/`#ffe4e6` eye stream + scarlet horns; `astral_phantom` `#fde047`/`#7dd3fc` eye stream + floating star crest.
- **`renderWeapon`** (lines 2827–3268):
  - Add optional `skinId?: SkinId` parameter (passed from `renderStickman` line 1306).
  - Skin-palette `volt_spear`, `thunder_halberd`, `flame_nodachi`, `solar_greatblade`, `twin_daggers`, `void_sabers` for all 6 Raijin/Kagura/Zero skins so weapons match skin colors in both base and Awakened forms.

---

## 6. `UltimateCutscene.ts` & `animation.ts` Blueprint (M2)

### 6.1 `UltimateCutscene.ts` Per-Skin Palettes
In `renderVoltJudgment`, `renderSolarInferno`, and `renderPhantomEclipse`, read `this.theme.skinId` (and `getSkinVfxProfile(this.theme.characterId ?? ..., this.theme.skinId)`):
- **`renderVoltJudgment` (Raijin)**:
  - `default`: `#040a1a` sky, `#38bdf8` / `#fef08a` bolts & 7 pillars, `#0284c7` stamp, `'THIÊN LÔI!'`.
  - `storm_shogun`: `#03091f` sky, `#60a5fa` / `#fde047` bolts & pillars, `#1d4ed8` stamp, `'THIÊN ĐÌNH!'`.
  - `cyber_valkyrie`: `#090418` sky, `#22d3ee` / `#e879f9` grid bolts & plasma pillars, `#c026d3` stamp, `'OVERDRIVE!'`.
- **`renderSolarInferno` (Kagura)**:
  - `default`: `#120402` sky, `#dc2626` / `#f97316` / `#fde047`, `#ea580c` stamp, `'VIÊM NGỤC!'`.
  - `solar_phoenix`: `#1c0602` sky, `#b91c1c` / `#f97316` / `#fef9c3`, `#dc2626` stamp, `'NIẾT BÀN!'`.
  - `frost_empress`: `#04101f` sky, `#0284c7` / `#38bdf8` / `#e0f2fe` + `#c084fc` frostfire corona & glacial wings & cyan-violet supernova columns, `#0284c7` stamp, `'BĂNG HỎA!'`.
- **`renderPhantomEclipse` (Zero)**:
  - `default`: `#02120d` sky, `#10b981` / `#34d399` / `#a7f3d0`, `#059669` stamp, `'ẢNH TRẢM!'`.
  - `blood_moon`: `#140308` sky, `#e11d48` / `#f43f5e` / `#ffe4e6` + crimson moon crescent overlay, `#e11d48` stamp, `'HUYẾT NGUYỆT!'`.
  - `astral_phantom`: `#06041a` sky, `#4f46e5` / `#818cf8` / `#fef08a` + twinkling 4-point star accents at omni-cut nodes, `#4f46e5` stamp, `'TINH TÚ!'`.
- **`renderScarletSheath` (Kuro)**: replace hardcoded `'#dc2626'` at line 336 with `this.theme.primaryColor`.

### 6.2 `animation.ts`
Extend `getAwakenedVisualProfile(characterId: CharacterId, skinId: SkinId = 'default')` so default calls (`getAwakenedVisualProfile(id)`) return the exact existing objects (preserving `rules.test.ts` 17/17), while custom `skinId` returns matching `scarfPrimary`, `scarfHighlight`, `auraAccent`, `formTitle`, and `transformationCallout`.
