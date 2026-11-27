# R4 Mirage E2E Automated Verification Suite — Ready Report

**Status**: READY FOR M2B / M3 EXECUTION (`R4` suite implemented, compiled, verified against M1A+M1B+M2A; `--r3` 15/15 green).

## Test Files Created / Modified
1. `tests/e2e/r4_mirage.e2e.test.ts` (new — 12 tests covering R1–R5)
2. `tests/e2e/run-e2e.mjs` (added `--r4` flag & `R4_SUITE`; `--r3` and all existing flags preserved)
3. `tests/e2e/helpers/testHarness.ts` (added backward-compatible R4 helpers: `ALL_7_CHARACTERS`, `MIRAGE_SKINS`, `ALL_20_SKINS`, `ALL_20_MOTIFS`, `extractGeometryMetrics`, `getActiveParticleTexts`, `getGameInternals`)

## How to Run
```bash
# Run R4 Mirage suite
node tests/e2e/run-e2e.mjs --r4 --verbose

# Run R3 Ink-Wash regression check
node tests/e2e/run-e2e.mjs --r3
```

## Coverage Matrix (12 Tests)

| ID | Requirement | Description | Pre-M2B Status | Ready After M2B? |
|---|---|---|---|---|
| `R4-R1-01` | R1 | `getComboMoveForCharacter('mirage', ...)` (`ground` 1–6, `air` 1–3, `dash_slash`, `parry_counter`) never uses `'arc'`, `'iaido_line'`, `'heavy_cleave'`; uses `'mirror_fracture'` / `'void_prism_fracture'` | PASS | PASS |
| `R4-R1-02` | R1 | `SKIN_VFX_PROFILES['mirage:default']` & `['mirage:void_shatterer']` + `getAwakenedVisualProfile` valid & non-fallback | PASS | PASS |
| `R4-R1-03` | R1 | Live Mirage attacks (`createTestPlayer` + `createHeadlessGame`) spawn mirror/prism trails & render cleanly (`save/restore === 0`, 0 `NaN`, 0 `shadowBlur`) | PASS | PASS |
| `R4-R2-01` | R2 | `getSkinInkPalette('mirage', 'default')` & `('mirage', 'void_shatterer')` differ from `kuro:default` and from each other | PASS | PASS |
| `R4-R2-02` | R2 | `renderStickman` `mirage:void_shatterer` vs `mirage:default` (normal, awakened, `attack_1`) has distinct structural geometry (`commandCount`/`subpathCount`/`totalVertices`) + valid Canvas 2D trace | PASS | PASS |
| `R4-R3-01` | R3 | `mirage:void_shatterer` Awakening (`[O]`): `bg.getDomainBlend() > 0.5`, `MirrorRift.domainEmpowered === true`, `stageTheme` preserved, smooth reversion `< 0.08` after expiry | FAIL (needs M2B `Game.ts`) | **EXECUTE AFTER M2B** |
| `R4-R3-02` | R3 | `mirage:void_shatterer` Rage Ultimate (`[I]`): `bg.getDomainBlend() > 0.5` | FAIL (needs M2B `Game.ts`) | **EXECUTE AFTER M2B** |
| `R4-R3-03` | R3 | `mirage:default` Awakening (`[O]`) & Ultimate (`[I]`): `bg.getDomainBlend()` stays `0` | PASS | PASS |
| `R4-R4-01` | R4 | Attack (`[J]`) overlapping active `MirrorRift` (`[U]`): shatters rift, spawns `'mirror_shard'` projectile(s) or AoE damage, emits new floating callout text | FAIL (needs M2B `Game.ts`) | **EXECUTE AFTER M2B** |
| `R4-R4-02` | R4 | `Dash` through active `MirrorRift` (`[U]`): Mirror Warps near/behind enemy (`<= 150px`), refunds cooldown, emits new floating callout text | FAIL (needs M2B `Player.ts`/`Game.ts`) | **EXECUTE AFTER M2B** |
| `R4-R5-01` | R5 | Static scan: `0` `shadowBlur` in `src/`, `0` `performance.now()` in `src/game/renderer/` | PASS | PASS |
| `R4-R5-02` | R5 | Headless `PeriodicTableBG` (normal, `domainActive`, reverted) & `MirrorRift` (`domainEmpowered: false/true`) render cleanly (`save/restore === 0`, 0 `NaN`, 0 `shadowBlur`) | PASS | PASS |
