# M3 Combat, Entities & Lifecycle Integration Blueprint

> **Summary**: Exhaustive line-by-line M3 integration specification for `Player.ts`, `Entities.ts`, `Game.ts`, and `Enemy.ts` (with cross-checks of `synergy.ts` and `Modals.tsx`) to wire all 12 `(CharacterId, SkinId)` profiles via `getSkinVfxProfile(characterId, skinId)`, replace fragile color-string checks in `Entities.ts` with explicit theme/color fields, and close all R2 lifecycle/memory/HUD-sync gaps without altering R3 combat determinism.

---

## 0. Shared M1/M2 Contracts Consumed by M3

From `PROJECT.md:41-108` and `src/game/StickmanRenderer.ts:108-197`:

- **`src/game/skinVfx.ts`** (M1):
  - `getSkinVfxProfile(characterId: CharacterId, skinId?: SkinId): SkinVfxProfile`
  - Fields consumed by M3:
    - `motif: SlashVfxMotif`, `slashPrimary`, `slashSecondary`, `slashRim`, `slashCore`
    - `swingAuraColor`, `swingAuraSecondary`, `auraTendrilPrimary`, `auraTendrilSecondary`, `afterimageColor`
    - `particlePrimary`, `particleSecondary`, `swingParticleKind: SkinParticleAccentKind`, `finisherParticleKind: SkinParticleAccentKind`
    - `impactRingColor`, `hitTextColor`, `detonationColor`
    - `projectileTheme: ProjectileTheme`, `pillarTheme: PillarTheme`, `iceWallTheme: 'ice' | 'seraph' | 'void'`
    - `cutscenePrimary`, `cutsceneSecondary`, `cutsceneAccent`
- **`src/game/ParticleSystem.ts`** (M1):
  - `MAX_PARTICLES = 720`, `getActiveCount(): number`, `getPoolCapacity(): number`
  - New pooled emitters: `emitFeathers`, `emitPetals`, `emitStars`, `emitShards`, `emitInkSplatter`
- **`src/game/StickmanRenderer.ts`** (M2):
  - `SlashTrail` extended with optional `skinId`, `characterId`, `rimColor`, `secondaryColor`, `motif`, `seed`.
  - **Naming Note**: `PROJECT.md:98` refers to `StickmanRenderParams`, whereas the actual exported interface at `StickmanRenderer.ts:133` is `StickmanRenderOptions`. M3 (`Player.ts:1782`) passes `attackProgress`, `attackAuraColor`, `attackAuraSecondary`, `vfxMotif` into `renderStickman(ctx, options)` using `StickmanRenderOptions`.
- **Shared M3 Accent Particle Helper** (recommended private helper in `Player.ts` or small pure helper imported by `Player.ts` & `Game.ts` — note M3 owns `Player.ts` and `Game.ts` exclusively):
  ```ts
  export function emitSkinAccentParticle(
    particles: ParticleSystem,
    kind: SkinParticleAccentKind,
    x: number,
    y: number,
    count: number,
    color: string,
    dir: 1 | -1 = 1,
    speed = 420
  ): void {
    switch (kind) {
      case 'feather': particles.emitFeathers(x, y, count, color); break;
      case 'petal': particles.emitPetals(x, y, count, color); break;
      case 'star': particles.emitStars(x, y, count, color); break;
      case 'shard': particles.emitShards(x, y, count, color); break;
      case 'ink_splatter': particles.emitInkSplatter(x, y, count, color); break;
      case 'ice': particles.emitIceShards(x, y, count, dir); break;
      case 'ember': particles.emitEmbers(x, y, count, color); break;
      case 'lightning':
        for (let i = 0; i < Math.min(3, count); i++) {
          particles.emitLightning(x + (i - 1) * 18, y, color, 42);
        }
        break;
      case 'smoke': particles.emitSmoke(x, y, count, color, -55, 22); break;
      case 'spark':
      default:
        particles.emitSparks(x, y, count, color, speed);
        break;
    }
  }
  ```
  > **Hex Constraint (`#rrggbb`)**: `Game.ts:2136` (`${themeColor}38`) and `Game.ts:2167` (`${proj.color}38`) concatenate 2-digit hex alpha directly onto color strings. Every color stored on `SkinVfxProfile` and passed to `Projectile.color` / `themeColor` **MUST** be a 6-digit hex literal (`#rrggbb`).

---

## 1. Exhaustive Hardcoded Color, Trail, Particle & Combat VFX Audit

### 1.1 `src/game/Player.ts` (1,815 lines)

| Lines | Context | Current Hardcoded / Incomplete Code | M3 Replacement with `vfx = getSkinVfxProfile(this.character.id, this.skinId)` |
|---|---|---|---|
| `241–242` | `standUpFromChair` | `emitSparks(..., this.character.accentColor, 380)` & `emitShockwave(..., this.character.glowColor, 70, 0.25)` | `emitSparks(..., vfx.particlePrimary, 380)` + `emitShockwave(..., vfx.impactRingColor, 70, 0.25)` + `emitSkinAccentParticle(..., vfx.swingParticleKind, ..., 5, vfx.particleSecondary)` |
| `298–309` | `triggerAwakening` base burst | `const waveCol = this.character.awakeningWaveColor;` used for shockwave (`303`), slashBeam (`305`), embers (`307`), groundCrack (`309`); `'#ffffff'` (`304,306,308`) | `const waveCol = vfx.impactRingColor;` (`303,309`), `vfx.slashSecondary` (`305`), `vfx.particlePrimary` (`307`), keep `'#ffffff'` core highlights (`304,306,308`), plus `emitSkinAccentParticle(..., vfx.finisherParticleKind, this.x, this.y - 56, 12, vfx.particleSecondary)` |
| `312–316` | `triggerAwakening` (`raijin`) | `i % 2 === 0 ? '#facc15' : '#38bdf8'` | `i % 2 === 0 ? vfx.particleSecondary : vfx.particlePrimary` (themes `default`, `storm_shogun`, `cyber_valkyrie` distinctly) |
| `317–320` | `triggerAwakening` (`kagura`) | `'#fde047'` (`318,320`), `'#ea580c'` (`319`) | `vfx.particleSecondary` (`318`), `vfx.particlePrimary` (`319`), `vfx.impactRingColor` (`320`) + `emitSkinAccentParticle` (`feather`/`shard`/`ember`) |
| `321–334` | `triggerAwakening` (`zero`) | `this.afterimages.push({ ..., color: '#34d399' })` (`331`) | Use `pushAfterimage({ ..., color: vfx.afterimageColor })` (themes `default`, `blood_moon`, `astral_phantom`) |
| `335–351` | `triggerAwakening` (`kuro`) | Hardcoded `this.skinId === 'radiant_seraph' ? '#facc15' : 'void_walker' ? '#a855f7' : '#ef4444'` & `'#fef9c3'/'#e879f9'/'#fca5a5'` | Remove `this.skinId` branches; emit lightning with `vfx.particlePrimary` (`349`) and `vfx.particleSecondary` (`350`) |
| `353–359` | `triggerAwakening` callout | Hardcoded `this.skinId === 'radiant_seraph' ? 'ĐẠI THIÊN THẦN!' : ...` and `'#ffffff'` (`359`) | Use `this.skinId === 'default' ? profile.transformationCallout : this.character.awakeningBannerText` and `vfx.hitTextColor` (`359`) |
| `386` | `takeDamage` | `emitSparks(..., '#f43f5e', 460)` | **Keep `#f43f5e`** (enemy hurt feedback, non-skin) |
| `527` | Taunt `[T]` | `emitText(..., 'STYLE +RAGE', '#c084fc', 18)` | Use `vfx.hitTextColor` (or keep `#c084fc` UI cue) |
| `584–586` | Zero Shadow-Warp `[U]->[L]` | `emitChainArc(..., '#34d399', 6)`, `emitShockwave(..., '#34d399', 88, 0.24)`, `emitText(..., '#6ee7b7', 22)` | `vfx.particlePrimary`, `vfx.impactRingColor`, `vfx.hitTextColor` + `emitSkinAccentParticle(..., vfx.swingParticleKind, ..., 6, vfx.particleSecondary)` |
| `610–616` | Dash shockwave | `this.awakened ? this.character.awakeningWaveColor : this.character.accentColor` | `this.awakened ? vfx.impactRingColor : vfx.swingAuraColor` |
| `617–626` | Skin-specific Dash FX | Hardcoded `if (this.skinId === 'radiant_seraph') ... else if (this.skinId === 'void_walker') ...` (`#facc15`, `#fef08a`, `#7e22ce`, `#e879f9`, `#a855f7`) | Replace `this.skinId` branching with universal `vfx`-driven dash trail for all 12 skins: `emitSkinAccentParticle(particles, vfx.swingParticleKind, this.x - this.facing * 14, this.y - 46, 6, vfx.particlePrimary, this.facing)` + `emitSparks(..., vfx.particleSecondary, 360)` + for `void_rift`/`astral_constellation`/`cyber_glitch` motifs an extra `emitSlashBeam` / `emitLightning` in `vfx.slashSecondary` |
| `638–644` | Kuro dash-through IceWall text | Hardcoded `this.skinId === 'radiant_seraph' ? 'VẠN KIẾM XUNG KÍCH!' : ...` with `this.character.accentColor` | Use `${this.character.skills.specialName} XUNG KÍCH!` (or `vfx.iceWallTheme` lookup) and `vfx.hitTextColor` |
| `649–653` | Awakened Raijin Dash | `emitChainArc(..., '#fef08a', 5)` | `vfx.particleSecondary` |
| `716–724` | Dash afterimage | `color: this.awakened ? this.character.awakeningWaveColor : this.character.accentColor` | `pushAfterimage({ ..., color: this.awakened ? vfx.slashSecondary : vfx.afterimageColor })` |
| `737–745` | Attack afterimage | `color: this.awakened ? this.character.awakeningWaveColor : this.character.accentColor` | `pushAfterimage({ ..., color: this.awakened ? vfx.slashSecondary : vfx.afterimageColor })` |
| `756` | Brake skid dust | `emitSmoke(..., '#94a3b8', -18, 14)` | **Keep `#94a3b8`** (neutral arena dust) |
| `825–835` | Jump / Double jump | `isDouble ? this.character.accentColor : '#94a3b8'` & `emitShockwave(..., this.character.accentColor, 46, 0.22)` | On `isDouble`: `vfx.particlePrimary`, `vfx.impactRingColor` + small `emitSkinAccentParticle(..., vfx.swingParticleKind, this.x, this.y - 6, 4, vfx.particleSecondary)`; single jump keeps `'#94a3b8'` |
| `871–878` | Sprint stride dust | `this.awakened ? this.character.awakeningWaveColor : '#94a3b8'` | `this.awakened ? vfx.swingAuraColor : '#94a3b8'` |
| `887–894` | Landing dust | `emitSmoke(..., '#64748b', ...)` | **Keep `#64748b`** (neutral ground dust) |
| `895–906` | Kagura Air-Dive landing | `new MagmaPillar(px, ..., 0.05, baseDmg)` (`900`), `emitGroundCrack(..., '#f97316')` (`902`), `emitShockwave(..., '#fde047', ...)` (`903`), `emitText(..., '#fde047', 24)` (`904`) | `new MagmaPillar(px, ..., 0.05, baseDmg, vfx.pillarTheme)`; `vfx.particlePrimary` (`902`), `vfx.impactRingColor` (`903`), `vfx.hitTextColor` (`904`), + `emitSkinAccentParticle(..., vfx.finisherParticleKind, this.x, GROUND_Y - 24, 10, vfx.particleSecondary)` |
| `907–930` | Air Slam landing | `this.awakened ? this.character.awakeningWaveColor : this.character.accentColor` (`912,917`); `new MagmaPillar(..., 0.06, 52)` (`925–926`) | `vfx.impactRingColor` (`912,917`); `new MagmaPillar(..., 0.06, 52, vfx.pillarTheme)` (`925–926`) + `emitSkinAccentParticle` |
| `1039–1060` | Kuro `[U]` `cryo_wall` spawn | Hardcoded `this.skinId === 'radiant_seraph' ? 'seraph' : 'void_walker' ? 'void' : 'ice'` (`1039–1044`); hardcoded `#facc15`, `#c084fc`, `#a855f7`, `#ef4444`, `#38bdf8` (`1051–1060`) | `const wallTheme = vfx.iceWallTheme;`; emit `vfx.particlePrimary` sparks/crack (`1052–1059`) + `emitSkinAccentParticle(..., vfx.finisherParticleKind, spawnX, GROUND_Y - 22, 10, vfx.particleSecondary, this.facing)` (keeping `emitIceShards` for `'ice'`) |
| `1065–1095` | Awakened Kuro `[U]` twin waves | Hardcoded `this.skinId` `waveColor` (`#facc15`/`#a855f7`/`#ef4444`) & `calloutText` (`1066–1077`), `new Projectile({ ..., color: waveColor })` (`1089`), `emitText(..., waveColor)` (`1094`) | `new Projectile({ ..., color: vfx.slashPrimary, secondaryColor: vfx.slashSecondary, rimColor: vfx.slashRim, theme: vfx.projectileTheme })`; `emitText(..., `${this.character.skills.specialName}!`, vfx.hitTextColor, 24)` |
| `1114–1150` | Raijin `[U]` `thunder_blink` | Hardcoded `'#fef08a'` (`1114,1131,1139,1150`), `'#22d3ee'` (`1115,1129,1148`), `'#facc15'` (`1129,1141,1149`), `'#38bdf8'` (`1131,1140`) | `vfx.particleSecondary` (`1114,1129b,1131b,1139,1150`), `vfx.particlePrimary` (`1115,1129a→vfx.afterimageColor,1131a,1141,1148`), `vfx.impactRingColor` (`1140,1149`), `vfx.hitTextColor` (`1150`) + `emitSkinAccentParticle(..., vfx.finisherParticleKind, ...)` |
| `1164–1190` | Kagura `[U]` `magma_eruption` | Air-dive `#fde047`/`#f97316` (`1168–1169`), `new MagmaPillar(px, ..., baseDmg)` (`1178,1183`), crack `#f97316` (`1188`), text `#fde047` (`1189`) | `vfx.particleSecondary` (`1168`), `vfx.impactRingColor` (`1169`), `new MagmaPillar(..., vfx.pillarTheme)` (`1178,1183`), `vfx.particlePrimary` (`1188`), `vfx.hitTextColor` (`1189`) + `emitSkinAccentParticle` |
| `1208–1244` | Zero `[U]` `phantom_barrage` | `kunai` `color: '#10b981'` (`1219`), `void_crescent` `color: '#34d399'` (`1235`), shockwave `#34d399` (`1242`), text `#6ee7b7` (`1243`) | `kunai` & `void_crescent`: `color: vfx.slashPrimary, secondaryColor: vfx.slashSecondary, rimColor: vfx.slashRim, theme: vfx.projectileTheme`; shockwave `vfx.impactRingColor`, text `vfx.hitTextColor` + `emitSkinAccentParticle(..., vfx.finisherParticleKind, ...)` |
| `1291–1316` | Zero Link Art `ẢNH BỘ ÁM SÁT` | Afterimages `#34d399` (`1300`), chainArc `#34d399` (`1309`), shockwave `#a7f3d0` (`1310`), slashBeams `#10b981` & `#a7f3d0` (`1314–1315`), text `#6ee7b7` (`1316`) | `vfx.afterimageColor` (`1300`), `vfx.particlePrimary` (`1309`), `vfx.impactRingColor` (`1310`), `vfx.slashPrimary` & `vfx.slashSecondary` (`1314–1315`), `vfx.hitTextColor` (`1316`) + `emitSkinAccentParticle(..., vfx.finisherParticleKind, ...)` |
| `1317–1325` | Raijin Link Art `LÔI LIÊN THƯƠNG` | slashBeams `#22d3ee` & `#facc15` (`1322–1323`), text `#fef08a` (`1324`) | `vfx.slashPrimary`, `vfx.slashSecondary`, `vfx.hitTextColor` + `emitSkinAccentParticle` |
| `1326–1348` | Kagura Link Art `NHẬT THỰC TRẢM` | `fire_wave` `color: '#f97316'` (`1341`), slashBeams `#f97316` & `#fde047` (`1345–1346`), text `#fde047` (`1347`) | `fire_wave`: `color: vfx.slashPrimary, secondaryColor: vfx.slashSecondary, rimColor: vfx.slashRim, theme: vfx.projectileTheme`; slashBeams `vfx.slashPrimary` & `vfx.slashSecondary`; text `vfx.hitTextColor` |
| `1349–1357` | Kuro Link Art `HUYẾT ẢNH TRẢM` | slashBeams `#ef4444` & `#38bdf8` (`1353–1354`), text `#fca5a5` (`1355`) | `vfx.slashSecondary`, `vfx.slashPrimary`, `vfx.hitTextColor` |
| `1364–1365` | Parry Counter `[K]->[J]` | slashBeam `#38bdf8` (`1364`), text `#7dd3fc` (`1365`) | `vfx.slashPrimary`, `vfx.hitTextColor` |
| `1411–1419` | Zero Pass-Through afterimages | `color: '#34d399'` (`1418`) | `pushAfterimage({ ..., color: vfx.afterimageColor })` |
| `1462–1481` | **Primary `SlashTrail` push** | `this.character.slashColors`, `outerColor: i === 0 ? outerColor : '#f8fafc'`, `coreColor: '#ffffff'`, no `rimColor`/`secondaryColor`/`motif`/`skinId`/`characterId`/`seed`, no capacity cap | Use `vfx.slashPrimary` / `vfx.slashSecondary` (e.g. `outerColor: i === 0 ? (this.awakened || move.heavy ? vfx.slashSecondary : vfx.slashPrimary) : vfx.slashSecondary`), `coreColor: vfx.slashCore`, `rimColor: vfx.slashRim`, `secondaryColor: i === 0 ? vfx.slashSecondary : vfx.slashPrimary`, `motif: vfx.motif`, `skinId: this.skinId`, `characterId: this.character.id`, `seed: (this.hitboxSeq * 37 + i * 17) & 0xff`; enforce `MAX_SLASH_TRAILS = 24` via `pushSlashTrail(...)` |
| `1483–1556` | Normal attack signature flair | Universal: none (missing per-skin swing particles!). Kuro (`1487–1496`): `accentColor` & `#ffffff`; Raijin (`1502,1515`): `#facc15`/`#38bdf8`, `volt_lance` `#38bdf8`; Kagura (`1522–1531`): `#fb923c`, `#f97316`, `#fde047`, `MagmaPillar` unthemed; Zero (`1535,1550`): `#34d399`, `kunai` `#10b981` | **Every swing**: emit light `emitSkinAccentParticle(particles, isHeavyFinisher ? vfx.finisherParticleKind : vfx.swingParticleKind, strikeX, strikeY, isHeavyFinisher ? 8 : 4, vfx.particlePrimary, this.facing)` (short `maxLife <= 0.45s`). Replace `#facc15`/`#38bdf8`/`#fb923c`/`#f97316`/`#fde047`/`#34d399`/`#10b981` with `vfx.particlePrimary`, `vfx.particleSecondary`, `vfx.impactRingColor`; pass `theme: vfx.projectileTheme, secondaryColor: vfx.slashSecondary, rimColor: vfx.slashRim` to `volt_lance`/`kunai` and `vfx.pillarTheme` to `MagmaPillar` |
| `1559–1593` | Awakened melee effects | Kuro (`1566`): `awakeningWaveColor`; Raijin (`1571–1572`): `#fef08a`, `#38bdf8`; Kagura (`1577`): unthemed `MagmaPillar`; Zero (`1588`): `#34d399` | Kuro `vfx.slashSecondary`; Raijin `vfx.particleSecondary` & `vfx.impactRingColor`; Kagura `new MagmaPillar(..., vfx.pillarTheme)`; Zero `pushAfterimage({ ..., color: vfx.afterimageColor })` |
| `1606–1614` | IceWall melee launch text | Hardcoded `this.skinId === 'radiant_seraph' ...` & `this.character.accentColor` | `${this.character.skills.specialName} XUNG KÍCH!` & `vfx.hitTextColor` |
| `1638–1644` | `spawnCurrentHitbox` ground crack | `this.awakened ? this.character.awakeningWaveColor : this.character.accentColor` (`1642`) | `this.awakened ? vfx.impactRingColor : vfx.particlePrimary` |
| `1675–1703` | `updateAmbientAura` | `this.awakened ? this.character.awakeningWaveColor : this.character.glowColor` (`1683`), `awakeningWaveColor` (`1688`), `awakeningWaveColor : accentColor` (`1698`) | `this.awakened ? vfx.swingAuraSecondary : vfx.swingAuraColor` (`1683`), `vfx.particlePrimary` (`1688`), `this.awakened ? vfx.particleSecondary : vfx.particlePrimary` (`1698`); optionally 1 subtle `vfx.swingParticleKind` every ~0.22s when awakened or on title |
| `1735–1749` | Skill-Link resonance ring | `spec.secondaryColor` (`1741`) | `vfx.swingAuraSecondary` |
| `1752–1774` | Parry defensive arc ring | Hardcoded `'rgba(56, 189, 248, 0.35)'`, `'#7dd3fc'`, `'#ffffff'` | Outer halo `${vfx.impactRingColor}59`, main arc `vfx.slashPrimary`, inner core `'#ffffff'` (keeps cyan clarity for default Kuro/Raijin while matching custom skins) |
| `1782–1807` | `renderStickman` call | Passes `skinId`, `darkAura`, `weapon`, `awakenedForm`; does NOT pass swing aura params | Pass `attackProgress: this.attackTimer > 0 && this.attackDuration > 0 ? clamp(1 - this.attackTimer / this.attackDuration, 0, 1) : 0`, `attackAuraColor: vfx.swingAuraColor`, `attackAuraSecondary: vfx.swingAuraSecondary`, `vfxMotif: vfx.motif` (plus `auraTendrilPrimary: vfx.auraTendrilPrimary`, `auraTendrilSecondary: vfx.auraTendrilSecondary` per M2 `StickmanRenderOptions`) |

---

### 1.2 `src/game/Game.ts` (2,451 lines)

| Lines | Context | Current Hardcoded / Incomplete Code | M3 Replacement with `vfx = getSkinVfxProfile(this.characterId, this.skinId)` |
|---|---|---|---|
| `133` | `impactFrameColor` field init | `'#ef4444'` | Fine as initial default; overwritten by `triggerImpactFrame` |
| `315–318` | `setCharacter` title preview | `def.accentColor` (`316,317`) | `vfx.impactRingColor` (`316`), `vfx.particlePrimary` (`317`) + `emitSkinAccentParticle(..., vfx.swingParticleKind, ..., 6, vfx.particleSecondary)` |
| `338–343` | `setSkin` title preview | `def.accentColor` (`339,341`), `'#ffffff'` (`340`), `def.glowColor` (`342`) | `vfx.impactRingColor` (`339`), `'#ffffff'` (`340`), `vfx.particlePrimary` (`341`), `vfx.particleSecondary` (`342`) + `emitSkinAccentParticle(..., vfx.finisherParticleKind, this.player.x, this.player.y - 50, 10, vfx.particleSecondary)` |
| `1016` | `onRequestAwaken` impact frame | `this.player.character.awakeningWaveColor` | `vfx.impactRingColor` |
| `1022` | `onRequestAwaken` mark apply | `enemy.applyElementalMark(this.player.character.id, 2, this.particles)` | Pass optional `{ primary: vfx.particlePrimary, secondary: vfx.detonationColor }` tint |
| `1048–1051` | `onThunderBlinkHit` | `applyElementalMark('raijin', ...)` (`1048`), `emitLightning(..., '#fef08a', 58)` (`1050`), `emitSlashBeam(..., '#22d3ee', 10)` (`1051`) | Pass mark tint; `vfx.particleSecondary` (`1050`), `vfx.slashPrimary` (`1051`) + `emitSkinAccentParticle(..., vfx.swingParticleKind, ...)` |
| `1061–1062` | `onCryoSummonChill` | `applyElementalMark('kuro', ...)` (`1061`), `emitIceShards(...)` (`1062`) | Pass mark tint; if `vfx.iceWallTheme === 'ice'` keep `emitIceShards`, else `emitSkinAccentParticle(..., vfx.swingParticleKind, enemy.x, enemy.y - 48, 8, vfx.particlePrimary)` |
| `1114–1115` | `magmaPillars` enemy hit | `applyElementalMark('kagura', ...)` (`1114`), `emitText(..., 'VIÊM ẤN!', '#fb923c', 20)` (`1115`) | Pass mark tint; `vfx.hitTextColor` (`1115`) |
| `1148–1163` | `iceWalls` crush hit | `applyElementalMark('kuro', ...)` (`1148`), slashBeams `#ef4444`/`#38bdf8` (`1151–1152`), `triggerImpactFrame(..., '#38bdf8')` (`1153`), text `'BĂNG HUYẾT PHÁ!'` / `#fca5a5` / `#38bdf8` (`1156–1162`), `emitIceShards` (`1163`) | Pass mark tint; `vfx.slashSecondary` (`1151`), `vfx.slashPrimary` (`1152`), `vfx.impactRingColor` (`1153`), `vfx.hitTextColor` (`1160`), skin-themed crush text when overcharged (`vfx.iceWallTheme === 'seraph' ? 'THÁNH KIẾM PHÁ!' : vfx.iceWallTheme === 'void' ? 'HƯ KHÔNG PHÁ!' : 'BĂNG HUYẾT PHÁ!'`), and `vfx.iceWallTheme === 'ice' ? emitIceShards : emitSkinAccentParticle(..., vfx.finisherParticleKind, ...)` |
| `1219–1237` | Player melee hit vs enemies | `accentCol = awakened ? awakeningWaveColor : accentColor` (`1219–1221`), `emitSlashBeam(..., accentCol)` (`1225`), `applyElementalMark(chId, ...)` (`1229`), `triggerImpactFrame(..., accentCol)` (`1237`) | `const vfx = getSkinVfxProfile(chId, this.skinId);`, `accentCol = this.player.awakened ? vfx.slashSecondary : vfx.slashPrimary`, pass mark tint at `1229`, emit `emitSkinAccentParticle(..., hb.heavy || hb.isLinkArt ? vfx.finisherParticleKind : vfx.swingParticleKind, enemy.x, enemy.y - 52, hb.heavy ? 7 : 3, vfx.particlePrimary)` on hit, `vfx.impactRingColor` at `1237` |
| `1356–1369` | Player projectile hit | `applyElementalMark` (`1357,1359,1364,1367`), `emitSlashBeam(..., proj.color, 9)` (`1369`) | Pass mark tint; `proj.color` is already skin-themed (`vfx.slashPrimary`); optionally add 4-count `vfx.swingParticleKind` |
| `1406–1414` | Reflected projectile | `proj.reflected = true;` (`1412`) | Keep `computeReflectedProjectile` math untouched (R3); optionally set `proj.rimColor = vfx.impactRingColor` while keeping `#38bdf8` reflect indicator |
| `1662–1688` | `onPerfectParry` | Counter wave `color: '#22d3ee'` (`1673`), `triggerImpactFrame(..., '#38bdf8')` (`1681`), `emitSparks(..., '#38bdf8')` (`1684`), `emitShockwave(..., '#38bdf8')` (`1686`), `emitSlashBeam(..., '#38bdf8')` (`1687`), `emitText(..., '#38bdf8')` (`1688`), `applyElementalMark` (`1691`) | Counter wave: `color: vfx.slashPrimary, secondaryColor: vfx.slashSecondary, rimColor: vfx.slashRim, theme: vfx.projectileTheme`. Parry burst: blend `'#ffffff'` core with `vfx.impactRingColor` / `vfx.slashPrimary` + `emitSkinAccentParticle(..., vfx.swingParticleKind, fxX, fxY, 8, vfx.particleSecondary)`; pass mark tint at `1691` |
| `1758–1791, 1808` | `detonateElementalMarks` | Hardcoded per-character colors (`#facc15`, `#22d3ee`, `#fef08a`, `#f97316`, `#fde047`, `#10b981`, `#a7f3d0`, `#34d399`, `#ef4444`, `#38bdf8`), unthemed `MagmaPillar` (`1768`), `emitIceShards` (`1777`), `spec.secondaryColor` (`1789,1808`) | Use `vfx = getSkinVfxProfile(kind, this.skinId)`: `raijin` -> `vfx.particleSecondary`, `vfx.particlePrimary`, `vfx.impactRingColor`; `kagura` -> `vfx.impactRingColor`, `vfx.particleSecondary`, `new MagmaPillar(..., vfx.pillarTheme)`; `zero` -> `vfx.slashPrimary`, `vfx.slashSecondary`, `vfx.impactRingColor`; `kuro` -> `vfx.iceWallTheme === 'ice' ? emitIceShards : emitSkinAccentParticle(..., vfx.finisherParticleKind, ...)`, `vfx.slashSecondary`, `vfx.slashPrimary`, `vfx.impactRingColor`; ALL 4 emit `vfx.finisherParticleKind`; text/impact frame use `vfx.detonationColor` / `vfx.hitTextColor` |
| `1878–1901` | `activateScarletSheath` `onKanjiImpact` per-enemy | Hardcoded `#fef08a` (`1879`), `#f97316` (`1884`), `#10b981`/`#a7f3d0` (`1886–1887`), `ch.ultimatePrimaryColor` (`1889–1890`), `ch.ultimateSecondaryColor` (`1900`) | Use `vfx = getSkinVfxProfile(ch.id, this.skinId)`: `vfx.cutsceneSecondary` (`1879,1900`), `vfx.cutscenePrimary` (`1884,1886,1889,1890`), `vfx.cutsceneSecondary` (`1887`), plus `emitSkinAccentParticle(..., vfx.finisherParticleKind, enemy.x, enemy.y - 52, 8, vfx.particleSecondary)` |
| `1904–1992` | `activateScarletSheath` aftermath | `raijin`: `#fef08a`/`#22d3ee` (`1910–1918`); `kagura`: unthemed `MagmaPillar` (`1926`), `#fde047` (`1932`); `zero`: `kunai` `#10b981` (`1953`), `#6ee7b7` (`1962`); `kuro`: `ultimatePrimaryColor` (`1966`), `sword_wave` `awakeningWaveColor` (`1979`), `ultimateSecondaryColor` (`1988`) | `raijin`: `vfx.cutsceneSecondary`, `vfx.cutscenePrimary`, `vfx.hitTextColor`; `kagura`: `new MagmaPillar(..., vfx.pillarTheme)` & `vfx.hitTextColor`; `zero`: `kunai` with `color: vfx.cutscenePrimary, secondaryColor: vfx.cutsceneSecondary, rimColor: vfx.slashRim, theme: vfx.projectileTheme` & `vfx.hitTextColor`; `kuro`: `vfx.cutscenePrimary`, `sword_wave` with `color: vfx.slashPrimary, secondaryColor: vfx.slashSecondary, rimColor: vfx.slashRim, theme: vfx.projectileTheme` & `vfx.cutsceneSecondary` |
| `2005–2012` | `cutscene.start` theme arg | Passes `{ characterId, skinId, kanji, primaryColor: ch.ultimatePrimaryColor, secondaryColor: ch.ultimateSecondaryColor, bannerTitle }` | Pass `primaryColor: vfx.cutscenePrimary, secondaryColor: vfx.cutsceneSecondary` (and `accentColor: vfx.cutsceneAccent` if M2 `CutsceneTheme` defines it) |
| `2036–2038` | `render` `themeColor` | `this.player.awakened ? this.player.character.awakeningWaveColor : this.player.character.accentColor` | `const vfx = getSkinVfxProfile(this.characterId, this.skinId); const themeColor = this.player.awakened ? vfx.impactRingColor : vfx.swingAuraColor;` (propagates to `bg.renderScreenBackdrop`, `bg.renderWorld`, player point light at `2136`, speed lines at `2213`) |
| `2297–2321` | `syncHudThrottled` `fp` | Includes `this.characterId` (`2299`), **MISSING `this.skinId`** | Insert `this.skinId` right after `this.characterId` so HUD updates reliably on skin changes |

*(Note: `Game.ts:654` `'#38bdf8'` wave banner, `963/967/971` loot orb text, `1200–1201` guard clang, `1297` env hazard, `1596–1598` Witch Time purple-cyan, `2026–2027` Fable sword-shatter event, `2180–2196` Witch Time vignette, and `2269–2283` Low-HP crimson vignette are world/system cues, NOT character skin colors — preserve them.)*

---

### 1.3 `src/game/Enemy.ts` (804 lines)

| Lines | Context | Current Behavior | M3 Recommendation |
|---|---|---|---|
| `60–62` | Elemental mark fields | `markKind`, `markStacks`, `markTimer` | Add optional visual-only fields: `public markPrimaryColor: string | null = null; public markSecondaryColor: string | null = null;` |
| `176–187` | `applyElementalMark` | `const spec = getElementalMarkSpec(kind);` uses `spec.primaryColor` for `emitSparks` (`186`) | Add optional 4th arg `tint?: { primary: string; secondary: string }`. Store `this.markPrimaryColor = tint?.primary ?? null; this.markSecondaryColor = tint?.secondary ?? null;` and emit sparks with `tint?.primary ?? spec.primaryColor`. Zero changes to `markStacks`, `maxStacks`, `markTimer`, or `consumeElementalMark` (R3)! |
| `193–196` & `302–306` | Mark clear / expiry | Clears `markKind`, `markStacks`, `markTimer` | Also reset `this.markPrimaryColor = null; this.markSecondaryColor = null;` |
| `734–772` | `render` Elemental Mark Glyph | Uses `spec.primaryColor` (`747`), `spec.secondaryColor` (`747,759,764`), `spec.kanji` (`760`) | `const primaryCol = this.markPrimaryColor ?? spec.primaryColor;` and `const secondaryCol = this.markSecondaryColor ?? spec.secondaryColor;` — keeps `spec.kanji` intact while tinting the floating seal glyph to match the active skin! |
| `84–133, 163–173, 240–246, 265, 327, 397–403, 418–429, 526–527, 624–635, 665–685, 721, 780–798` | Enemy/Mob own colors | Enemy chassis, gunner bullets `#fde047`, ninja kunai `#f43f5e`, brute slam `#f97316`, elite `#facc15`, stun `#38bdf8` | **Do NOT change** — these belong to enemy silhouettes and readability, not player skin VFX. |

---

### 1.4 Cross-Check of `src/game/synergy.ts` (141 lines) & `src/components/Modals.tsx` (456 lines)

- **`src/game/synergy.ts`**:
  - `ELEMENTAL_MARK_SPECS` (`16–65`) defines deterministic combat values (`baseDetonateDamage`, `maxStacks`, `kanji`, `detonateCallout`, `linkArtName`, `linkShortLabel`) plus default `primaryColor` / `secondaryColor`.
  - Pure math (`computeDetonationDamage` `74–85`, `computeOverdriveUltimateDamage` `90–99`, `computeSynergyCooldownRefund` `104–140`) is tested by `rules.test.ts:272–301`.
  - **M3 Boundary**: `synergy.ts` is NOT modified in M3 (R3 + ownership boundary). Visual skin overrides flow from `getSkinVfxProfile` in `Player.ts` / `Game.ts` into `Enemy.applyElementalMark(..., tint)` and `detonateElementalMarks` without altering `synergy.ts`.
- **`src/components/Modals.tsx`**:
  - `PauseModal` (`16–148`): Receives `characterName`, `characterAccent`, `skills` from `HudSnapshot` (which `Game.emitHudSnapshot()` populates from `this.player.character` — already skin-merged via `getCharacterDef(id, skinId)`). Its quick character switcher (`55–85`) uses `CHARACTER_ROSTER[id]` and calls `onSelectCharacter(id)`.
  - `OutcomeModal` (`156–261`): `const fighter = CHARACTER_ROSTER[stats.characterId] ?? CHARACTER_ROSTER.kuro;` (`165`) uses base `CHARACTER_ROSTER` for `fighter.accentColor` (`184`) and `fighter.codename` (`185`) because `RunStats` (`types.ts:171–189`) does not store `skinId`.
  - `ControlsModal` (`267–354`): Displays base `CHARACTER_ROSTER` overview.
  - **M3 Boundary**: `Modals.tsx` and `types.ts` are outside M3 write ownership (`PROJECT.md:113`); documented as a non-blocking observation (no runtime error, UI stays compatible per R3).

---

## 2. Explicit `Projectile`, `MagmaPillar` & `IceWall` Theming Spec (`src/game/Entities.ts`)

### 2.1 Why Current `Entities.ts` Fails R1
1. **`Projectile.render` (`Entities.ts:565–566`)** uses fragile hex equality:
   ```ts
   const isSeraphWave = this.kind === 'sword_wave' && this.color === '#facc15';
   const isVoidWave = this.kind === 'sword_wave' && this.color === '#a855f7';
   ```
   - Any color tweak breaks matching; only Kuro's 2 custom skins work (`sword_wave`).
2. **Hardcoded hex ignores `this.color` for 4 projectile kinds**:
   - `fire_wave` (`683–690`): hardcoded `#f97316` / `#fef08a` (breaks Kagura `solar_phoenix` & `frost_empress`).
   - `void_crescent` (`685–692`): hardcoded `#10b981` / `#a7f3d0` (breaks Zero `blood_moon` & `astral_phantom`).
   - `volt_lance` (`732–758`): hardcoded `#22d3ee` / `#facc15` (breaks Raijin `storm_shogun` & `cyber_valkyrie`).
   - `kunai` (`759–785`): hardcoded `#10b981` / `#d1fae5` (breaks Zero `blood_moon` & `astral_phantom`).
3. **`MagmaPillar` (`945–1038`)** has no `theme` parameter: hardcodes orange/red/gold in `update()` (`971–974`) and `render()` (`990–1033`).
4. **`IceWall.update()` (`205`)** still emits cyan `emitIceShards` during flight even when `this.theme === 'seraph'` or `'void'`.

### 2.2 Explicit `ProjectileConfig` & `Projectile` Design
Import `type { PillarTheme, ProjectileTheme } from './skinVfx'` (no circular import — `skinVfx.ts` only imports `types.ts`):

```ts
export interface ProjectileConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  kind: ProjectileKind;
  fromPlayer: boolean;
  color: string;
  maxLife?: number;
  theme?: ProjectileTheme;
  rimColor?: string;
  secondaryColor?: string;
}
```
On `class Projectile`:
- Fields: `public theme: ProjectileTheme = 'default';`, `public rimColor?: string;`, `public secondaryColor?: string;`
- Constructor: assign `this.theme = params.theme ?? 'default';`, `this.rimColor = params.rimColor;`, `this.secondaryColor = params.secondaryColor;`.
- `render(ctx)` dispatches on `this.theme` (zero `this.color === '#...'` checks!):
  - **`sword_wave` / `fire_wave` / `void_crescent`**:
    - `this.theme === 'seraph'` → Golden celestial crescent + feather wake (uses `this.color`, `this.secondaryColor ?? '#fef9c3'`, `this.rimColor ?? '#ffffff'`).
    - `this.theme === 'void'` → Obsidian-violet singularity crescent + diamond void shards.
    - `this.theme === 'phoenix'` → Solar-gold & crimson-orange flame crescent with trailing feather-ember streaks (`this.color`, `this.secondaryColor ?? '#fde047'`, `this.rimColor ?? '#ffffff'`).
    - `this.theme === 'frostfire'` → Cyan-ice outer crescent (`this.color`) with deep violet-orchid inner edge (`this.secondaryColor ?? '#c084fc'`) and crystal diamond specks (`this.rimColor ?? '#e0f2fe'`).
    - `this.theme === 'blood_moon'` → Dark crimson-black crescent with blood-rose rim (`this.color`, `this.secondaryColor ?? '#fecdd3'`, `this.rimColor ?? '#ffe4e6'`) and petal-crescent flecks.
    - `this.theme === 'astral'` → Deep indigo-cyan crescent with golden star glints (`this.color`, `this.secondaryColor ?? '#c084fc'`, `this.rimColor ?? '#fef08a'`).
    - `this.theme === 'shogun'` / `'cyber'` (e.g. Counter Mastery Parry Wave on Raijin) → `shogun` gold-cobalt crescent; `cyber` neon cyan-magenta digital crescent.
    - `this.theme === 'default'` → Existing crescent renderer using `outer = this.color || defaultByKind` and `rim = this.rimColor ?? defaultRimByKind`.
  - **`volt_lance`**:
    - Uses `primary = this.color || '#22d3ee'`, `tip = this.secondaryColor ?? '#facc15'`, `core = this.rimColor ?? '#ffffff'`, plus `this.theme === 'cyber'` adds neon magenta/cyan chevron segments and `this.theme === 'shogun'` adds royal-gold lance ring.
  - **`kunai`**:
    - Uses `body = this.color || '#10b981'`, `glow = this.secondaryColor ?? body`, `edge = this.rimColor ?? '#d1fae5'`, plus `this.theme === 'astral'` adds tiny 4-point star glint at hilt and `this.theme === 'blood_moon'` adds crimson trailing ribbon.
  - **Reflected enemy bullets/lasers/spears/orbs**: keep `this.reflected ? '#38bdf8' : ...` (or `this.rimColor`) for clear parry-reflect visual feedback; all `Enemy.ts` (`418,624`) and `Boss.ts` (`463,552,651,847,914,1030`) callers omit `theme` and default cleanly to `'default'`.

### 2.3 Explicit `MagmaPillar` Theme Design
```ts
export class MagmaPillar {
  ...
  public theme: PillarTheme = 'fire';

  constructor(
    x: number,
    dir: 1 | -1,
    delay: number,
    damage: number,
    theme: PillarTheme = 'fire'
  ) {
    this.x = x;
    this.dir = dir;
    this.delay = delay;
    this.damage = damage;
    this.theme = theme;
  }
```
Theme palette table inside `MagmaPillar`:
| `theme` | Crack & Telegraph | Shockwave & Spire Mid | Sparks / Tip / Core | Extra Eruption Particle |
|---|---|---|---|---|
| `'fire'` | `#f97316` | `#fb923c` / `#f97316` / `#b91c1c` | `#fef08a` / `#fffbeb` | `emitEmbers(..., '#f97316')` |
| `'phoenix'` | `#f59e0b` | `#fde047` / `#f59e0b` / `#dc2626` | `#fef9c3` / `#ffffff` | `emitEmbers(..., '#facc15')` + `emitFeathers(..., '#fde047')` |
| `'frostfire'` | `#22d3ee` | `#c084fc` / `#0891b2` / `#3b0764` | `#e0f2fe` / `#f5d0fe` | `emitIceShards(..., this.dir)` + `emitShards(..., '#c084fc')` |

`Boss.ts:288` (`boss_vulcan`) omits the 5th argument and continues using `'fire'` unchanged (R3).

### 2.4 `IceWall` Launch Trail Fix (`Entities.ts:204–206`)
Replace `particles.emitIceShards(this.x - this.dir * 26, this.y - 35, 1, -this.dir);` with:
- `'seraph'` -> `particles.emitFeathers(this.x - this.dir * 26, this.y - 45, 1, '#fef08a', 26, 0.9)`
- `'void'` -> `particles.emitShards(this.x - this.dir * 26, this.y - 45, 1, '#c084fc', 26, 0.9)`
- `'ice'` -> `particles.emitIceShards(this.x - this.dir * 26, this.y - 35, 1, -this.dir)`

---

## 3. VFX Lifecycle, Memory Cleanup & R2/R3 Hardening Audit

### 3.1 Inventory of Every VFX Buffer & Cleanup Path

| Target | Current Init / Push Sites | Current Cleanup / Tick Sites | Gaps Found | M3 Fix |
|---|---|---|---|---|
| `Player.slashTrails` | `Player.ts:144` (`[]`), pushed at `1467` (1–3 per swing) | Cleared in `reset()` (`220`); ticked in `update()` (`481–486`) | 1. **Not cleared** in `setCharacter()` (`151–162`).<br>2. **Not ticked/pruned** in `updateIdleOnTitle()` (`392–399`).<br>3. **No capacity cap**. | 1. Add `public static readonly MAX_SLASH_TRAILS = 24;` & `pushSlashTrail()` eviction.<br>2. Clear `this.slashTrails = []` in `setCharacter()`.<br>3. Extract `tickAndPruneVfx(dt)` and call in both `update()` and `updateIdleOnTitle()`. |
| `Player.afterimages` | `Player.ts:143` (`[]`), pushed at `324`, `716`, `737`, `1122`, `1293`, `1411`, `1581` | Cleared in `reset()` (`219`); ticked in `update()` (`475–480`) | 1. **Not cleared** in `setCharacter()` (`151–162`).<br>2. **Not ticked/pruned** in `updateIdleOnTitle()` (`392–399`).<br>3. **No capacity cap**. | 1. Add `public static readonly MAX_AFTERIMAGES = 24;` & `pushAfterimage()` eviction.<br>2. Clear `this.afterimages = []` in `setCharacter()`.<br>3. Tick & prune via `tickAndPruneVfx(dt)` in both `update()` and `updateIdleOnTitle()`. |
| `Player.getActiveVfxCounts()` | Does not exist yet | N/A | Required by `PROJECT.md:101` for E2E R2 tests | Add `public getActiveVfxCounts(): { slashTrails: number; afterimages: number }` |
| `ParticleSystem` | Fixed pool (`MAX_PARTICLES = 720` in M1) | `clear()` (`67–71`), `update(dt)` (`351–378`) expires when `life >= maxLife` | Swing accent particles must have short `maxLife <= 0.45s`; ambient aura emits ~1 particle/0.085s while alive (`Player.ts:1676–1702`) | Ensure all M3 accent calls use short `maxLife`; verify standalone `ParticleSystem` returns to `getActiveCount() === 0` within `<= 2.6s` (and `<= 0.45s` for swing accents), and during active `Player.update()` idle stays at constant bounded baseline (`<= 16`), never growing linearly over `>=50` attacks |
| `Game.enterTitleState()` (`423–458`) | Calls `particles.clear()`, resets entity arrays, `cutscene.active = false`, `player.setCharacter`, `player.reset` | N/A | Does NOT reset `impactFrameTimer`, `hitstopTimer`, `pendingOutcome`, `defeatBeatTimer`, `lastHudFingerprint` | Reset `this.impactFrameTimer = 0; this.hitstopTimer = 0; this.pendingOutcome = null; this.defeatBeatTimer = 0; this.lastHudFingerprint = '';` |
| `Game.startMode()` (`460–551`) | Resets all entity arrays, `particles.clear()`, `hitstopTimer = 0`, `cutscene.active = false`, `player.setCharacter`, `player.reset` | N/A | Does NOT reset `impactFrameTimer` or `lastHudFingerprint` | Reset `this.impactFrameTimer = 0; this.lastHudFingerprint = '';` |
| `Game.setCharacter()` (`296–320`) & `Game.setSkin()` (`322–345`) | Calls `player.setCharacter(def.id, this.skinId)` & `emitHudSnapshot()` | Emits preview particles on `title` | Rapid skin switching leaves old `slashTrails`/`afterimages` if called mid-run (e.g. `PauseModal`), and relies on `ParticleSystem` pool | Clearing `slashTrails` & `afterimages` inside `Player.setCharacter()` guarantees zero residual trails/afterimages; `ParticleSystem` fixed pool (720) guarantees 0 leaks under rapid skin switching |
| `Game.syncHudThrottled()` (`2293–2327`) | Fingerprints `fp` every `0.08s` | Compares `fp !== this.lastHudFingerprint` | **`this.skinId` is missing from `fp`!** (`2297–2321`) | Add `this.skinId` right after `this.characterId` in `fp` |
| `Game.magmaPillars`, `iceWalls`, `projectiles`, `magicCircles`, `stageHazards`, `lootOrbs` | Spliced in `simulateStep` when `!active` (`1121,1170,1302,1324,1334,1480,974`) | Cleared in `enterTitleState()` & `startMode()` | All have finite `maxLife` (`<= 1.25s` launched wall, `<= 8.5s` standing wall, `<= 3.2s` projectile, `delay + 0.44s` pillar) | Bounded and self-cleaning; zero leaks |

### 3.2 R2 Convergence Timeline After `>= 50` Attack Spam
When simulating `>= 50` consecutive attacks (e.g. rapid `Player.update` loop with `attack` input, then stopping input and stepping `dt = 1/60`):
- **During spam**: `slashTrails.length <= 24`, `afterimages.length <= 24`, `particles.getActiveCount() <= 720`.
- **After stopping attacks**:
  - `t + 0.35s`: `player.slashTrails.length === 0` (all `maxLife <= 0.29s`).
  - `t + 0.50s`: `player.afterimages.length === 0` (all `maxLife <= 0.48s`).
  - `t + 1.25s`: all player-spawned `Projectile` (`maxLife <= 1.1s`) and `MagmaPillar` (`<= 0.8s`) have `active === false` and are spliced.
  - `t + 2.70s`: all `ParticleSystem` combat particles (`crack` `maxLife = 2.6s` is longest; all swing accents `<= 0.45s`) expire (`getActiveCount() === 0` if `ParticleSystem` ticked standalone, or constant bounded ambient idle `<= 16` if `updateAmbientAura` is ticking).

### 3.3 R3 Compatibility Invariants (Must NOT Change)
- **Hitboxes & Frame Data**: `ComboMoveSpec` (`animation.ts`), `attackDuration`, `cancelRatio`, `activeStart` (`0.12`), `activeEnd` (`0.74`), `spawnCurrentHitbox` (`reach`, `hitboxWidth`, `hitboxHeight`, `damage`, `knockX`, `knockY`, `heavy`, `unblockable`), `dashTimer` (`0.16`), `dashCooldownMax`, `parryTimer`, `cryoCooldownMax`.
- **Combat Math**: `rules.ts`, `synergy.ts`, `scalePlayerDamage`, `applyBossPostureHit`, `resolveEnemyMeleeHit`, `onPerfectDodge`, `onPerfectParry`, `detonateElementalMarks`, `activateScarletSheath` damage & cooldown refunds.
- **Controls & UI**: `InputHandler.ts`, `TitleScreen.tsx`, `GameHUD.tsx`, `Modals.tsx`, `TouchControls.tsx` bindings and flows remain intact (`rules.test.ts` 17/17 must continue passing).
