# Scarlet Sheath — Stickman Anime Action Game

High-speed 2D HTML5 Canvas + React 19 + TypeScript stickman hack-and-slash fighting game.

## Key Features
- **4 Playable Characters & Custom Skins**:
  - **KURO** (Iaido Katana · Skins: Default, *Radiant Seraph*, *Void Walker*)
  - **RAIJIN** (Volt Spear · Multi-hit lightning thrusts & chain arcs)
  - **KAGURA** (Flame Nodachi · Heavy wide cleaves & magma pillars)
  - **ZERO** (Twin Shadow Daggers · Triple jump, pass-through X-slashes & kunai)
- **8-Chapter Campaign (`src/game/stages.ts`)**:
  1. `01` Genesis Lab — Boss: **HAIKU** (Vanguard)
  2. `02` Solar Observatory — Boss: **ASTRA** (Lancer)
  3. `03` Cryo Citadel (Icicle Drop Hazards) — Boss: **GLACIUS** (Cryo Warden)
  4. `04` Crimson Dojo — Boss: **OPUS** (Laser Blade Leader)
  5. `05` Magma Foundry (Lava Geyser Hazards) — Boss: **VULCAN** (Forge Titan)
  6. `06` Cyber Spire (Orbital Laser Hazards) — Boss: **SOL** (Orbital Sniper)
  7. `07` Shadow Sanctum (Void Rift Hazards) — Boss: **NYX** (Phantom Reaper)
  8. `08` Sovereign Throne — Boss: **FABLE** (Final Entity)
- **Game Modes**: Story Campaign (with Stage Selector), 8-Boss Rush, Endless Survival Arena, and Training Lab.
- **Combat Depth**:
  - Fixed-step 120Hz simulation, hit-stop, and Sakuga impact frames
  - **Perfect Parry (`[K]`)** projectile reflection & **Sekiro-style Boss Posture / Guard Break** (`+45%` stagger damage)
  - **Perfect Dodge / Witch Time (`[Shift]`)** slowing enemies & projectiles to `24%` speed
  - **Boss Phase II Enrage** at `50%` HP with upgraded attack patterns
  - **Roguelite Stage Blessings (`Ấn Chú`)** 3-card upgrade draft between stages
  - **Magnetic Loot Orbs** (HP, Rage, Awakening) & interactive Stage Environmental Hazards

## Development & Build
```bash
npm install --legacy-peer-deps
npm run dev
npm run build
```
