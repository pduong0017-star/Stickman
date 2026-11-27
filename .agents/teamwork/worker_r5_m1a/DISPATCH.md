## 2026-11-26T15:48:56Z

You are `worker_r5_m1a` (Milestone M1A Worker).
Working Directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r5_m1a`
Parent Conversation ID: `5921fcfe-3b03-4b72-8e17-fd8ef853796e`
Project Root: `/storage/emulated/0/Antigravity/Stickman`

EXCLUSIVE WRITE OWNERSHIP (ONLY modify these files):
- `src/game/types.ts`
- `src/game/characters.ts`
- `src/game/skinVfx.ts`
- `src/game/synergy.ts`
- `src/game/animation.ts`
- `src/game/renderer/types.ts`
- `src/game/renderer/trails.ts`

Requirements for M1A:
1. `src/game/types.ts`: DomainKind, HudSnapshot fields, ProjectileTheme/SkinParticleAccentKind compatibility.
2. `src/game/characters.ts`: synergyHint on chrono.skills, richer distinct overrides on chrono_sovereign.
3. `src/game/skinVfx.ts`: profileId, swingAuraSecondary, auraTendrilPrimary, auraTendrilSecondary, valid SkinParticleAccentKind (replace 'rune').
4. `src/game/synergy.ts`: dedicated `if (id === 'chrono')` branch in computeSynergyCooldownRefund.
5. `src/game/animation.ts`: `case 'chrono':` in getAwakenedVisualProfile, dedicated `if (characterId === 'chrono')` choreography in getComboMoveForCharacter.
6. `src/game/renderer/types.ts` & `src/game/renderer/trails.ts`: chrono slash styles, inferCharacterForSkin, chrono_clockwork & chrono_sovereign in renderAttackSwingAura, renderSlashMotifOrnament, renderSlashTrails; zero shadowBlur, zero performance.now(), try/finally around ctx.save(), finiteOr, colorWithAlpha.
