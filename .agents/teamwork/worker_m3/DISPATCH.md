## 2026-11-25T11:39:08Z
Sender: `b589790b-28b0-4a60-980a-68ac67599fd4`
Role: `worker_m3` — Milestone M3 Worker (`Combat, Entities & Lifecycle Integration`)
Exclusive Write Ownership:
- `src/game/Player.ts`
- `src/game/Entities.ts`
- `src/game/Game.ts`
- `src/game/Enemy.ts`

Tasks:
1. `src/game/Entities.ts`: Explicit `theme`/`rimColor`/`secondaryColor` on `ProjectileConfig`/`Projectile` across all 9 `ProjectileTheme`s (removing `color === '#...'` checks and hardcoded projectile colors); `theme: PillarTheme = 'fire'` on `MagmaPillar`; fix `IceWall.update()` launched trail for `'seraph'`/`'void'`/`'ice'`; preserve enemy/boss defaults.
2. `src/game/Enemy.ts`: Visual-only `markPrimaryColor`/`markSecondaryColor`, optional 4th `tint` arg on `applyElementalMark`, clear on mark clear/expiry, use in `render()` mark glyph while keeping `synergy.ts` math & `kanji` untouched.
3. `src/game/Player.ts`: Wire `getSkinVfxProfile` + `emitSkinAccentParticle` across all combat/movement/skill/aura/render sites; R2 lifecycle hardening (`MAX_SLASH_TRAILS = 24`, `MAX_AFTERIMAGES = 24`, bounded push eviction, clear in `setCharacter()` & `reset()`, `tickAndPruneVfx(dt)` in `update()` & `updateIdleOnTitle()`, `getActiveVfxCounts()`); R3 zero hitbox/timing/damage/control changes.
4. `src/game/Game.ts`: Wire `getSkinVfxProfile` into title previews, skills, hits, parries, mark detonations, ultimate cutscene & aftermath, `render` `themeColor` (6-digit `#rrggbb`); add `this.skinId` to `syncHudThrottled()` `fp`; reset `impactFrameTimer = 0` and `lastHudFingerprint = ''` (plus `hitstopTimer`, `pendingOutcome`, `defeatBeatTimer` in `enterTitleState()`) in `enterTitleState()` / `startMode()`; check `startLoop()` / `destroy()`.
Verification: `rules.test.ts` (17/17), `>=50` attack spam & rapid skin-switch lifecycle test, zero `shadowBlur` in `src/`, zero `color === '#'` in `Entities.ts`, `this.skinId` in `syncHudThrottled`, `tsc --noEmit` & `vite build` in scratch.
