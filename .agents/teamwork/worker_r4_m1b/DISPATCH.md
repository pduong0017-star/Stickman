## 2026-11-26T11:23:28Z

You are `worker_r4_m1b` (`teamwork_preview_worker`) implementing **Milestone M1B: Mythic `Ma Kính (void_shatterer)` Skin, Gear, Weapons & Ink-Wash Renderer (R2)**.

- **Working directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r4_m1b`
- **Project root**: `/storage/emulated/0/Antigravity/Stickman`
- **Parent conversation ID**: `c45a6256-a6e6-4432-a72d-ac8e535e61ed`
- **Mandatory reading before editing**:
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (especially `Follow-up — 2026-11-26T11:13:35Z`)
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r4/R4_PLAN.md`
  - `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_r4_survey_2/handoff.md`

## Exclusive File Ownership (ONLY edit these files)
- `src/game/renderer/inkStyle.ts`
- `src/game/renderer/gear.ts`
- `src/game/renderer/weapons.ts`
- `src/game/StickmanRenderer.ts`

## Requirements to Implement
1. `src/game/renderer/inkStyle.ts`: Add `'mirage:default'` and `'mirage:void_shatterer'` to `SKIN_INK_PALETTES` and `AWAKENED_BASE_OVERRIDES`.
2. `src/game/renderer/gear.ts`: Update `inferCharacterFromSkin`, `renderHeroHeadGear` (`'prism_crown'`), `getArmorSpec`, `renderSkinBodyArmor`, `renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderAwakenedHeadForm`.
3. `src/game/renderer/weapons.ts`: Overhaul `'mirror_shards'` and `'void_prism_scythe'` branching on `skinId`, honoring `accentOverride` & `whiteFlash`, replacing `performance.now()` with `safeTime`, wrapping every `ctx.save()` in `try/finally`.
4. `src/game/StickmanRenderer.ts`: Suppress/replace `joints.motionArc` circular sword-arc lines when `opts.characterId === 'mirage'`; add `'mirage'`/`'void_shatterer'` to `renderDarkInkAura`; render off-hand (`handL`) mirror shard(s) for Mirage; strict R5 compliance.

## Verification
- Run `rules.test.ts` and headless `MockCanvasElement` check.
