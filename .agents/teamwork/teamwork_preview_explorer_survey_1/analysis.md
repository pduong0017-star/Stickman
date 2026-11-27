# Phase 0 Survey Analysis — Skins, UI & VFX Coupling Points

**Core Summary**: The project is a Vite + React 19 + TypeScript + HTML5 Canvas 2D stickman action game (`SCARLET SHEATH`) with **4 playable characters** and **12 total character-skin combinations** (4 `'default'` + 8 custom skins across 9 `SkinId` literals). Currently, only Kuro's 2 custom skins (`radiant_seraph`, `void_walker`) have ad-hoc combat/ultimate VFX overrides, while the other 6 custom skins only change character geometry/armor/colors and fall back to shared/character-hardcoded slash trails, aura geometry, and combat particles (with 2 skins even sharing identical `slashColors`).

---

## 1. Project Directory Layout

Top-level workspace (`/storage/emulated/0/Antigravity/Stickman`):
- `index.html` — Root HTML document (`lang="vi"`, Google Fonts: `Barlow Condensed`, `Plus Jakarta Sans`, `JetBrains Mono`, `Noto Serif JP`; `<body data-state="title">` updated dynamically by `Game.setBodyState`).
- `package.json` — Scripts: `dev` (`vite --port=3000 --host=0.0.0.0`), `build` (`vite build`), `preview`, `clean`, `lint` (`tsc --noEmit`). Dependencies: `react@^19.0.1`, `react-dom@^19.0.1`, `vite@^8.3.0`, `@vitejs/plugin-react@^6.1.1`, `@tailwindcss/vite@^4.3.3`, `lucide-react`, `motion`, `typescript@^7.0.2`, `tsx@^4.21.0`.
- `tsconfig.json` — ES2022 target, bundler moduleResolution, `noEmit: true`, `@/*` path alias.
- `vite.config.ts` — React + Tailwind v4 plugins + `copy-unbundled-src-assets` build hook.
- `public/assets/aistudio/` — Reference media/prompt (`8f2697bab24603234b6f0a9dea10ff21_043d6637.mp4`, `Master_Prompt_T_o_Game_Stickman_Action_Anime_39f2982f.md`).
- `src/` (28 files):
  - `src/main.tsx` — React entry mount.
  - `src/index.css` — Tailwind v4 import, font CSS vars, chamfer/slant clip-paths, safe-area insets, mobile landscape media queries (`@media (max-height: 520px)`).
  - `src/App.tsx` — Root React shell; mounts `<canvas data-testid="game-canvas">` & `new Game(canvas, setHud)` once, parses URL params (`?char`, `?skin`, `?stage`, `?touch`, `?autostart`, `?mode`), renders `TitleScreen`, `GameHUD`, `TouchControls`, `PauseModal`, `OutcomeModal`, `ControlsModal`, `AudioModal`.
  - `src/components/`:
    - `TitleScreen.tsx` — Title overlay with character roster (4 cards), skin selector strip, 8-stage selector, 4 game modes, utility modal triggers.
    - `GameHUD.tsx` — In-game HUD (HP/Rage/Awakening bars, Boss HP/Posture bar, Combo/Style Rank, Blessing draft overlay, bottom keyboard skill bar).
    - `TouchControls.tsx` — Mobile virtual slide joystick + radial combat button cluster.
    - `Modals.tsx` — `PauseModal` (includes 4-character quick switcher, no skin switcher), `OutcomeModal`, `ControlsModal`, `AudioModal`.
  - `src/game/`:
    - `types.ts` — Core TypeScript unions & HUD/stats interfaces (`CharacterId`, `SkinId`, `HudSnapshot`, `CharacterSkillMeta`, etc.).
    - `characters.ts` — `CHARACTER_ROSTER`, `CHARACTER_SKINS`, `getSkinsForCharacter`, `normalizeSkinForCharacter`, `getCharacterDef`, `computeResponsiveCameraScale`.
    - `animation.ts` — `animeSwingCurve`, `blendSkeleton`, `computeRunStrideKinematics`, `getUltimateStyleId`, `getAwakenedVisualProfile`, `getComboMoveForCharacter` (6-hit ground, 3-hit air, dash-slash, parry-counter movesets).
    - `synergy.ts` — `ELEMENTAL_MARK_SPECS` (per `CharacterId`), `computeDetonationDamage`, `computeOverdriveUltimateDamage`, `computeSynergyCooldownRefund`.
    - `StickmanRenderer.ts` — Procedural IK skeleton (`computeStickmanSkeleton`), `renderStickman`, `renderDarkInkAura`, `renderCelScarf`, `renderHeroHeadGear`, `renderSkinBackAttachment`, `renderSkinBodyArmor`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`, `renderWeapon`, `renderAfterimages`, `renderSlashTrails`.
    - `Player.ts` — Player state, physics, combo state machine, `slashTrails` & `afterimages` lifecycle, signature skills (`triggerSignatureSkill`), `startAttack`, `triggerAwakening`, `updateAmbientAura`, `render`.
    - `ParticleSystem.ts` — Pre-allocated 500-slot ring-buffer particle pool (`MAX_PARTICLES = 500`) with 12 particle kinds (`spark`, `smoke`, `cartoon_smoke`, `ice`, `lightning`, `ember`, `ring`, `crack`, `ink_splatter`, `slash_beam`, `chain_arc`, `text`).
    - `UltimateCutscene.ts` — Full-screen canvas Ultimate cutscenes (4 character styles + 2 Kuro skin cutscenes).
    - `Game.ts` — Fixed-timestep game loop, `localStorage` persistence, combat collision & mark detonation, camera/hitstop/impact frames, HUD snapshot sync.
    - `Entities.ts` — `PlasticChair`, `IceWall` (with `'ice' | 'seraph' | 'void'` themes), `MagmaPillar`, `Projectile`, `MagicCircle`, `StageHazard`, `LootOrb`.
    - `Enemy.ts`, `Boss.ts`, `Camera.ts`, `InputHandler.ts`, `AudioEngine.ts`, `PeriodicTableBG.ts`, `stages.ts`, `rules.ts`, `rules.test.ts`.

---

## 2. Complete Enumeration of Existing Skins

Defined in `src/game/types.ts:7-16` (`SkinId`) and `src/game/characters.ts:85-613` (`CHARACTER_ROSTER` + `CHARACTER_SKINS`).
All skins are **unlocked by default** (no currency, progression lock, or achievement gate — any skin can be freely selected on TitleScreen or via `?skin=<id>`).

### Summary Table (12 Character-Skin Combinations)

| # | Character | SkinId | Display Name | Subtitle / Theme | Badge | `bodyColor` / `awakened` | `glowColor` / `accentColor` | `scarfPrimary` / `Highlight` | `auraStyle` / `awakened` | `weapon` / `awakenedWeapon` | `headGear` | `slashColors` `[normal, heavy]` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `kuro` | `default` | Mặc định | Hắc Kiếm Sĩ (Iaido Shadow) | `#a855f7` | `#7c5cff` / `#8b5cf6` | `#8b5cf6` / `#a855f7` | `#2563eb` / `#60a5fa` | `purple` / `crimson` | `katana` / `blood_greatsword` | `none` | `['#38bdf8', '#ef4444']` |
| 2 | `kuro` | `radiant_seraph` | Radiant Seraph | 炽天使 · Đại Thiên Thần | `#facc15` | `#f1f5f9` / `#fef9c3` | `#facc15` / `#fbbf24` | `#fef3c7` / `#ffffff` | `gold` / `gold` | `seraph_blade` / `seraph_greatsword` | `seraph_helm` | `['#fde047', '#f59e0b']` |
| 3 | `kuro` | `void_walker` | Void Walker | 虚空行者 · Hư Không Hành Giả | `#c084fc` | `#1e1b4b` / `#312e81` | `#a855f7` / `#c084fc` | `#581c87` / `#d8b4fe` | `purple` / `purple` | `void_blade` / `void_greatsword` | `void_helm` | `['#a855f7', '#e879f9']` |
| 4 | `raijin` | `default` | Mặc định | Lôi Thương (Lightning Spear) | `#38bdf8` | `#06b6d4` / `#22d3ee` | `#06b6d4` / `#38bdf8` | `#ca8a04` / `#fef08a` | `cyan` / `gold` | `volt_spear` / `thunder_halberd` | `volt_visor` | `['#22d3ee', '#facc15']` |
| 5 | `raijin` | `storm_shogun` | Storm Shogun | 雷将軍 · Lôi Thần Tướng Quân | `#facc15` | `#1d4ed8` / `#60a5fa` | `#facc15` / `#fbbf24` | `#f8fafc` / `#fde047` | `gold` / `gold` | `volt_spear` / `thunder_halberd` | `shogun_crest` | `['#60a5fa', '#fde047']` |
| 6 | `raijin` | `cyber_valkyrie` | Cyber Overdrive | 電脳戦神 · Chiến Thần Cơ Giới | `#e879f9` | `#0f172a` / `#1e1b4b` | `#e879f9` / `#f0abfc` | `#0891b2` / `#67e8f9` | `cyan` / `purple` | `volt_spear` / `thunder_halberd` | `cyber_visor` | `['#22d3ee', '#e879f9']` |
| 7 | `kagura` | `default` | Mặc định | Hỏa Diệm Đao (Flame Nodachi) | `#fb7185` | `#e11d48` / `#f97316` | `#f97316` / `#fb7185` | `#1e293b` / `#f97316` | `ember` / `ember` | `flame_nodachi` / `solar_greatblade` | `flame_band` | `['#fb923c', '#facc15']` |
| 8 | `kagura` | `solar_phoenix` | Solar Phoenix | 不死鳥 · Phượng Hoàng Bất Tử | `#facc15` | `#b91c1c` / `#f59e0b` | `#facc15` / `#fde047` | `#fef3c7` / `#ffffff` | `gold` / `gold` | `flame_nodachi` / `solar_greatblade` | `phoenix_crown` | `['#fde047', '#f97316']` |
| 9 | `kagura` | `frost_empress` | Frostfire Oni | 蒼炎鬼 · Băng Hỏa Ma Đế | `#22d3ee` | `#1e293b` / `#0e7490` | `#22d3ee` / `#38bdf8` | `#3b0764` / `#67e8f9` | `cyan` / `purple` | `flame_nodachi` / `solar_greatblade` | `oni_horns` | `['#38bdf8', '#c084fc']` |
| 10 | `zero` | `default` | Mặc định | Ảnh Sát Thủ (Shadow Assassin) | `#34d399` | `#10b981` / `#34d399` | `#10b981` / `#34d399` | `#047857` / `#a7f3d0` | `emerald` / `emerald` | `twin_daggers` / `void_sabers` | `phantom_eyes` | `['#34d399', '#a7f3d0']` |
| 11 | `zero` | `blood_moon` | Blood Moon | 血月 · Huyết Nguyệt Sát Thần | `#f43f5e` | `#18181b` / `#4c0519` | `#f43f5e` / `#fb7185` | `#be123c` / `#fecdd3` | `ember` / `crimson` | `twin_daggers` / `void_sabers` | `kitsune_mask` | `['#f43f5e', '#fecdd3']` |
| 12 | `zero` | `astral_phantom` | Astral Phantom | 星雲 · Tinh Vân Ảo Ảnh | `#38bdf8` | `#1e1b4b` / `#312e81` | `#38bdf8` / `#7dd3fc` | `#4338ca` / `#fde047` | `purple` / `cyan` | `twin_daggers` / `void_sabers` | `astral_hood` | `['#38bdf8', '#c084fc']` |

### Per-Skin Visual Details & Existing VFX Hooks

1. **`kuro/default`** (`characters.ts:86-137`):
   - Kanji `断`, Ultimate `SCARLET SHEATH` (`#dc2626` / `#fde68a`), Awakening wave `#ef4444`.
   - Renderer: no `headGear`, standard `katana` / `blood_greatsword`, dark-crimson sheath (`StickmanRenderer.ts:1277, 1286`), Awakened profile via `getAwakenedVisualProfile('kuro')` (`animation.ts:197-205`: crimson scarf, 3 blood phantom blades, horns).
   - VFX: `slashColors` `['#38bdf8', '#ef4444']`, IceWall `'ice'`, Zantetsu burst (`Player.ts:1490-1497`), Awakening lightning (`#ef4444`/`#fca5a5`), standard `renderScarletSheath` cutscene.

2. **`kuro/radiant_seraph`** (`characters.ts:316-352`):
   - Kanji `光`, Ultimate `THIÊN LONG SCARLET` (`#f59e0b` / `#fef9c3`), Awakening wave `#facc15`.
   - Renderer: `seraph_helm` (halo + paladin visor + ear-wings, `StickmanRenderer.ts:1507-1552`), `renderSkinBackAttachment` (6-wing feathered seraph wings + awakened rotating halo wheel + waist feathers, `1783-1879`), `renderSkinBodyArmor` (silver-white breastplate + gold trim + winged pauldrons, `2176-2217`), white-gold sheath (`1273, 1282`), `seraph_blade` / `seraph_greatsword` (`2884-2979`), golden orbiting awakened blades (`2346-2362`) and halo crown (`2528-2547`).
   - Existing VFX hooks:
     - `Player.ts:338-358`: Awakening lightning `#facc15`/`#fef9c3`, callout `'ĐẠI THIÊN THẦN!'`.
     - `Player.ts:618-621`: Dash emits golden `emitSlashBeam`, `emitEmbers('#fef08a')`, `emitSparks('#ffffff')`.
     - `Player.ts:639, 1039-1094, 1608`: Spawns `IceWall` with `theme: 'seraph'` (`Entities.ts:226-319`, floating holy swords + gold sparks/shockwave), awakened `[U]` emits `#facc15` `sword_wave` projectiles + `'VẠN KIẾM QUANG!'`.
     - `UltimateCutscene.ts:161-162, 752-886`: Dedicated `renderRadiantSeraphUltimate` (Heaven's pillar + 14 swords + golden feathers + Celestial Dragon + Kanji `光`).

3. **`kuro/void_walker`** (`characters.ts:355-392`):
   - Kanji `虚`, Ultimate `HƯ KHÔNG LONG · 虚` (`#7e22ce` / `#e9d5ff`), Awakening wave `#a855f7`.
   - Renderer: `void_helm` (floating diamond sigil + curved horns + glowing magenta eye, `StickmanRenderer.ts:1553-1598`), `renderSkinBackAttachment` (void tendrils + 3 orbiting crystal shards + awakened singularity vortex & starlight nebula cloak, `1880-1981`), `renderSkinBodyArmor` (obsidian-indigo armor + pulsing violet diamond core + spiked pauldrons, `2218-2260`), obsidian-purple sheath (`1275, 1284, 1295`), `void_blade` / `void_greatsword` (`2980-3085`), violet orbiting awakened blades (`2348-2362`) and void sovereign crown (`2548+`).
   - Existing VFX hooks:
     - `Player.ts:340-358`: Awakening lightning `#a855f7`/`#e879f9`, callout `'HƯ KHÔNG CHÚA TỂ!'`.
     - `Player.ts:622-626`: Dash emits violet `emitShockwave('#7e22ce')`, `emitLightning('#e879f9')`, `emitEmbers('#a855f7')`.
     - `Player.ts:641, 1042-1094, 1610`: Spawns `IceWall` with `theme: 'void'` (`Entities.ts:321-399`, obsidian-violet crystal shards + purple sparks), awakened `[U]` emits `#a855f7` `sword_wave` projectiles + `'HƯ KHÔNG TRẢM!'`.
     - `UltimateCutscene.ts:163-164, 894-1036`: Dedicated `renderVoidWalkerUltimate` (Black Hole singularity + crystal shards + Void Dragon + Kanji `虚`).

4. **`raijin/default`** (`characters.ts:138-189`):
   - Kanji `雷`, Ultimate `VOLT JUDGMENT · 雷` (`#0284c7` / `#fef08a`), Awakening wave `#38bdf8`.
   - Renderer: `volt_visor`, `volt_spear` / `thunder_halberd`, `cyan`/`gold` aura.
   - VFX: `slashColors` `['#22d3ee', '#facc15']`, hardcoded cyan/yellow spear sparks, chain arcs, `volt_lance`, awakened thunder bolts, `renderVoltJudgment` cutscene.

5. **`raijin/storm_shogun`** (`characters.ts:403-433`):
   - Kanji `霆`, Ultimate `THIÊN LÔI TƯỚNG QUÂN · 霆` (`#2563eb` / `#fef08a`), Awakening wave `#facc15`.
   - Renderer: `shogun_crest` (`StickmanRenderer.ts:1599-1625`), `renderSkinBackAttachment` (5-drum Raijin thunder halo, `1982-2008`), `renderSkinBodyArmor` (`armorMap.storm_shogun`, `2269`). Shares base `volt_spear`/`thunder_halberd` weapon art.
   - Existing VFX hooks: Only `slashColors` `['#60a5fa', '#fde047']`, `auraStyle: 'gold'`, and `accentColor`/`awakeningWaveColor` (`#fbbf24`/`#facc15`) on generic shockwaves/afterimages. **No** skin-specific dash, hit, lightning, projectile, or cutscene VFX.

6. **`raijin/cyber_valkyrie`** (`characters.ts:435-465`):
   - Kanji `電`, Ultimate `XUNG KÍCH LƯỢNG TỬ · 電` (`#c026d3` / `#67e8f9`), Awakening wave `#e879f9`.
   - Renderer: `cyber_visor` (`StickmanRenderer.ts:1626-1653`), `renderSkinBackAttachment` (3 holographic neon-magenta & cyan mech wings, `2009-2034`), `renderSkinBodyArmor` (`armorMap.cyber_valkyrie`, `2270`). Shares base `volt_spear`/`thunder_halberd` weapon art.
   - Existing VFX hooks: Only `slashColors` `['#22d3ee', '#e879f9']`, `auraStyle: 'cyan'` / `awakenedAuraStyle: 'purple'`, `accentColor: '#f0abfc'`. **No** cyber/neon-magenta lightning, chain-arc, or projectile color overrides (e.g. `Player.ts:1502, 1515, 1571` hardcode `#38bdf8`/`#facc15`/`#fef08a`).

7. **`kagura/default`** (`characters.ts:190-241`):
   - Kanji `炎`, Ultimate `SOLAR INFERNO · 炎` (`#ea580c` / `#fef08a`), Awakening wave `#f97316`.
   - Renderer: `flame_band`, `flame_nodachi` / `solar_greatblade`, `ember` aura, Phoenix wings on awaken.
   - VFX: `slashColors` `['#fb923c', '#facc15']`, hardcoded orange embers/ground cracks/MagmaPillar/fire_wave, `renderSolarInferno` cutscene.

8. **`kagura/solar_phoenix`** (`characters.ts:476-506`):
   - Kanji `鳳`, Ultimate `PHƯỢNG HOÀNG NIẾT BÀN · 鳳` (`#ea580c` / `#fef9c3`), Awakening wave `#facc15`.
   - Renderer: `phoenix_crown` (`StickmanRenderer.ts:1654-1674`), `renderSkinBackAttachment` (3-tier blazing crimson-gold phoenix wings + sun disc halo, `2035-2072`), `renderSkinBodyArmor` (`armorMap.solar_phoenix`, `2271`). Shares base `flame_nodachi`/`solar_greatblade` weapon art.
   - Existing VFX hooks: Only `slashColors` `['#fde047', '#f97316']`, `auraStyle: 'gold'`, `accentColor: '#fde047'`. **No** skin-specific swing particles, dash VFX, or ultimate cutscene.

9. **`kagura/frost_empress`** (`characters.ts:508-538`):
   - Kanji `蒼`, Ultimate `THƯƠNG VIÊM BĂNG NGỤC · 蒼` (`#0284c7` / `#e0f2fe`), Awakening wave `#22d3ee`.
   - Renderer: `oni_horns` (`StickmanRenderer.ts:1675-1702`), `renderSkinBackAttachment` (jagged glacial-cyan crystal wings + 2 orbiting cyan/violet frostfire orbs, `2073-2110`), `renderSkinBodyArmor` (`armorMap.frost_empress`, `2272`). Shares base `flame_nodachi`/`solar_greatblade` weapon art.
   - Existing VFX hooks: Only `slashColors` `['#38bdf8', '#c084fc']` (**identical to `zero/astral_phantom`!**), `auraStyle: 'cyan'` / `awakenedAuraStyle: 'purple'`. **Mismatch**: all swing embers (`Player.ts:1522`), ground cracks (`1525`), magma pillars (`1178, 1531`), and fire_wave (`1341`) remain hardcoded orange `#fb923c`/`#f97316`.

10. **`zero/default`** (`characters.ts:242-293`):
    - Kanji `影`, Ultimate `PHANTOM ECLIPSE · 影` (`#059669` / `#d1fae5`), Awakening wave `#10b981`.
    - Renderer: `phantom_eyes`, `twin_daggers` / `void_sabers`, `emerald` aura, emerald shadow wings + 4 orbiting kunai on awaken.
    - VFX: `slashColors` `['#34d399', '#a7f3d0']`, hardcoded emerald sparks/kunai/afterimages/slash beams, `renderPhantomEclipse` cutscene.

11. **`zero/blood_moon`** (`characters.ts:549-579`):
    - Kanji `血`, Ultimate `HUYẾT NGUYỆT VÔ ẢNH · 血` (`#e11d48` / `#ffe4e6`), Awakening wave `#f43f5e`.
    - Renderer: `kitsune_mask` (`StickmanRenderer.ts:1703-1740`), `renderSkinBackAttachment` (crimson crescent moon sigil, `2111-2132`), `renderSkinBodyArmor` (`armorMap.blood_moon`, `2273`), off-hand dagger color `#f43f5e` (`1339`). Main-hand weapon shares `twin_daggers`/`void_sabers`.
    - Existing VFX hooks: Only `slashColors` `['#f43f5e', '#fecdd3']`, `auraStyle: 'ember'` / `awakenedAuraStyle: 'crimson'`, off-hand dagger stroke (`1339`). **Mismatch**: normal attack sparks (`Player.ts:1535`), kunai (`1219, 1550`), void_crescent (`1235`), pass-through/awakening afterimages (`331, 1418, 1588`), and skill-link warp arcs/beams (`584-585, 1300-1315`) remain hardcoded emerald `#10b981`/`#34d399`!

12. **`zero/astral_phantom`** (`characters.ts:581-612`):
    - Kanji `星`, Ultimate `TINH TÚ VÔ ẢNH · 星` (`#4f46e5` / `#fef08a`), Awakening wave `#38bdf8`.
    - Renderer: `astral_hood` (`StickmanRenderer.ts:1741-1763`), `renderSkinBackAttachment` (dual tilted gold/cyan constellation rings, `2133-2153`), `renderSkinBodyArmor` (`armorMap.astral_phantom`, `2274`), off-hand dagger color `#38bdf8` (`1341`). Main-hand weapon shares `twin_daggers`/`void_sabers`.
    - Existing VFX hooks: Only `slashColors` `['#38bdf8', '#c084fc']` (**identical to `kagura/frost_empress`!**), `auraStyle: 'purple'` / `awakenedAuraStyle: 'cyan'`, off-hand dagger stroke (`1341`). Same emerald hardcoded mismatches in `Player.ts` & `Game.ts` as `blood_moon`.

---

## 3. Skin Selection UI, State Management & Gameplay/Rendering Flow

1. **Title Screen UI (`src/components/TitleScreen.tsx`)**:
   - Reads `availableSkins = getSkinsForCharacter(selectedCharacter)` (`line 42`) and `activeChar = getCharacterDef(selectedCharacter, selectedSkin)` (`line 41`).
   - Renders the `SKIN:` radio group strip (`lines 214-254`) whenever `availableSkins.length > 1`. Clicking a skin button calls `onSelectSkin(skin.id)` (`line 232`).
   - Live title-screen emblem (`SCARLET SHEATH` SVG, `lines 90-159`), stats strip (`lines 257-269`), and bottom control hint (`lines 414-416`) reactively reflect `activeChar` overrides (`ultimatePrimaryColor`, `accentColor`, `ultimateKanji`, `skills.specialName`, `skills.ultimateName`, `skills.awakenName`).
   - Meanwhile, the `<canvas>` renders the selected fighter + skin sitting on the plastic chair on the right side of the screen (`Game.enterTitleState` at `Game.ts:450-457`).
2. **React Root State (`src/App.tsx`)**:
   - Owns `hud: HudSnapshot` initialized with `skinId: 'default'` (`App.tsx:16`).
   - On mount (`lines 126-135`), reads URL params `?char=...` then `?skin=...` and calls `engine.setCharacter(..., false)` and `engine.setSkin(..., false)`.
   - Passes `selectedSkin={hud.skinId}` and `onSelectSkin={handleSelectSkin}` (`lines 257, 261`) to `TitleScreen`.
   - **Gap**: `PauseModal` (`App.tsx:299-310`, `Modals.tsx:16-148`) only exposes `onSelectCharacter` (`ĐỔI NHÂN VẬT NHANH`) and does NOT allow switching skins while paused. `OutcomeModal` (`Modals.tsx:165`) reads `CHARACTER_ROSTER[stats.characterId]` instead of skin-aware definition.
3. **Engine State & Persistence (`src/game/Game.ts`)**:
   - `SELECTED_SKIN_KEY = 'scarlet_sheath_skin_v1'` (`Game.ts:66`).
   - Constructor (`lines 180-186`): restores character and skin from `localStorage`, normalizes via `normalizeSkinForCharacter(def.id, savedSkin)`, calls `this.player.setCharacter(def.id, this.skinId)`.
   - `setCharacter(id, fromUserGesture)` (`lines 296-320`): saves `SELECTED_CHAR_KEY`, reads `SELECTED_SKIN_KEY` (Wait: note nuance — switching character re-reads `localStorage.getItem(SELECTED_SKIN_KEY)` and normalizes it for the new character, falling back to `'default'` if incompatible), updates `this.player.setCharacter`, emits title shockwave/sparks, and calls `this.emitHudSnapshot()`.
   - `setSkin(skinId, fromUserGesture)` (`lines 322-345`): normalizes via `normalizeSkinForCharacter`, persists `SELECTED_SKIN_KEY`, updates `this.player.setCharacter(def.id, normalized)`, plays `audio.playAwaken()`, emits title shockwave/sparks/embers, and calls `this.emitHudSnapshot()`.
   - `enterTitleState()` (`line 451`) and `startMode()` (`line 509`) both re-sync `this.player.setCharacter(this.characterId, this.skinId)` and `this.player.reset(...)`.
   - `emitHudSnapshot()` (`lines 2367-2437`) includes `skinId: this.skinId`. Note: `syncHudThrottled` (`lines 2297-2321`) omits `this.skinId` from its change-detection fingerprint `fp`, relying on `setSkin()` calling `emitHudSnapshot()` directly.
4. **Player & Rendering (`src/game/Player.ts` & `src/game/StickmanRenderer.ts` & `src/game/UltimateCutscene.ts`)**:
   - `Player.setCharacter(id, skinId)` (`Player.ts:151-162`) stores `this.skinId = skinId` and computes merged `this.character = getCharacterDef(id, skinId)`.
   - `Player.startAttack(...)` (`Player.ts:1461-1481`) creates `SlashTrail` instances using `this.character.slashColors` (`[normalCol, heavyCol]`) and `move.slashArcs` / `move.trailStyle`, and pushes them to `this.slashTrails`.
   - `Player.update(...)` (`Player.ts:475-486`) ticks `life += dt` on `this.afterimages` and `this.slashTrails` and splices expired entries (`life >= maxLife`).
   - `Player.updateAmbientAura(...)` (`Player.ts:1675-1703`) emits `smoke`, `ember` (when awakened), and `lightning` (on chair / awakened / raijin).
   - `Player.render(...)` (`Player.ts:1728-1813`) draws `afterimages`, skill-link ring, parry ring, calls `renderStickman(ctx, { ..., darkAura, weapon, awakenedForm, skinId: this.skinId })`, and calls `renderSlashTrails(ctx, this.slashTrails)`.
   - `Game.activateScarletSheath()` (`Game.ts:2005-2012`) passes `skinId: this.skinId` into `UltimateCutscene.start(...)`.

---

## 4. Constraints, Coupling Points & Gaps for R1, R2, R3

### R1 Gaps (Distinct Skin Swing/Slash/Aura/Particle VFX)
1. **Non-unique `slashColors`**: `kagura/frost_empress` and `zero/astral_phantom` have identical `slashColors: ['#38bdf8', '#c084fc']`.
2. **Basic `SlashTrail` renderer (`StickmanRenderer.ts:108-121, 3486-3690`)**:
   - No `skinId` or `vfxProfile` field on `SlashTrail`.
   - Secondary arcs (`i > 0` in `Player.ts:1476`) force `outerColor: '#f8fafc'`; `coreColor` is hardcoded `'#ffffff'`; `heavy_cleave` rim (`StickmanRenderer.ts:3675`) is hardcoded `'#fde047'`.
   - Only 6 weapon-class geometries (`arc`, `iaido_line`, `spear_thrust`, `spear_flurry`, `heavy_cleave`, `twin_x`) — no skin-themed ornamentation (e.g., seraph feathers/halo runes, void rift cracks/crystals, cyber scanlines/hex shards, phoenix plumes, frostfire crystals, blood moon crescents, astral constellations, storm shogun lightning arcs).
3. **Hardcoded Character Colors Bypassing Skin Theme**:
   - `Player.ts` hardcodes colors for Raijin (`#22d3ee`/`#38bdf8`/`#facc15`/`#fef08a`), Kagura (`#fb923c`/`#f97316`/`#fde047`), Zero (`#10b981`/`#34d399`/`#a7f3d0`), and parry flash ring (`#7dd3fc`/`rgba(56, 189, 248, 0.35)` at `Player.ts:1758-1763`).
   - `Game.ts` hardcodes hit/detonation/ultimate/blink colors by `CharacterId` in `onThunderBlinkHit` (`1050-1051`), `onCryoSummonChill` (`1062`), `IceWall` collision (`1151-1163`), `detonateElementalMarks` (`1758-1790`), and `activateScarletSheath` (`1878-1964`).
   - `synergy.ts` (`ELEMENTAL_MARK_SPECS`) and `Enemy.ts` (`applyElementalMark` & mark rendering) are keyed solely by `CharacterId`, not `SkinId`.
   - `animation.ts` (`getAwakenedVisualProfile`) and `StickmanRenderer.ts` (`renderAwakenedBackForm`, `renderAwakenedHeadForm`) only branch on `skinId` for Kuro's 2 custom skins.
4. **Shared Aura Styles & Limited Particle Kinds**:
   - `renderDarkInkAura` (`StickmanRenderer.ts:1374-1423`) has only 6 color presets with identical 7-tendril shapes. Multiple skins collide (`purple` x3, `cyan` x3, `gold` x3, `ember` x2).
   - `ParticleSystem` (`ParticleSystem.ts:3-15`) has `ink_splatter` declared in `ParticleKind` (`line 12`) with no emitter/renderer, and lacks specialized motifs (e.g., feather, star/constellation sparkle, sakura/petal, rune/crescent) unless extended cleanly.

### R2 Gaps & Risks (Performance & Lifecycle Cleanup)
1. **Dynamic Arrays vs Fixed Pool**:
   - `ParticleSystem` uses a fixed 500-slot ring buffer (`MAX_PARTICLES = 500`), automatically bounding memory and expiring particles (`life >= maxLife`). However, spawning too many particles per swing during rapid 120Hz spam could overwrite active particles before natural expiry, and `crack` particles linger `2.6s`.
   - `Player.slashTrails` and `Player.afterimages` are unbounded JS arrays (`Player.ts:143-144`). While `Player.update()` splices expired items, **no cap** exists on `slashTrails.length` or `afterimages.length` during extreme spam, and **`Player.updateIdleOnTitle()` (`Player.ts:392-399`) does NOT clean up `slashTrails` or `afterimages`**!
   - `Player.setCharacter()` (`Player.ts:151-162`) does NOT clear active `slashTrails` or `afterimages` on skin switch.
2. **Canvas Performance**: Avoid `ctx.shadowBlur` or allocating `CanvasGradient` inside tight particle loops; keep additive glow (`globalCompositeOperation = 'lighter'`) lightweight.

### R3 Constraints & Build/Tooling Findings
1. **HUD & State Sync**: `Game.syncHudThrottled()` (`Game.ts:2297-2321`) should include `this.skinId` in `fp` if skin switching is ever triggered outside `setSkin()`, and `PauseModal` / `OutcomeModal` currently do not surface skin selection or skin codename.
2. **Mobile Landscape**: `src/index.css:74-144` tightly constrains title/HUD layout for `max-height: 520px`; avoid inflating TitleScreen height.
3. **Android Environment Tooling**:
   - `node_modules/.bin` does not exist on `/storage/emulated/0`.
   - `typescript` (`^7.0.2`) throws `Unable to resolve @typescript/typescript-android-arm64` when running `node node_modules/typescript/bin/tsc --noEmit`.
   - Existing unit tests run cleanly via `node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` (verified: 17/17 pass).
