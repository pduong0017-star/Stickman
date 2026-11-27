import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getAwakenedVisualProfile, getComboMoveForCharacter } from '../../src/game/animation';
import { getCharacterDef } from '../../src/game/characters';
import { Enemy } from '../../src/game/Enemy';
import { MirrorRift } from '../../src/game/Entities';
import { PeriodicTableBG } from '../../src/game/PeriodicTableBG';
import { GROUND_Y, createScarfChain, stepVerletScarf } from '../../src/game/rules';
import { SKIN_VFX_PROFILES, getSkinVfxProfile } from '../../src/game/skinVfx';
import {
  computeStickmanSkeleton,
  renderSlashTrails,
  renderStickman,
  type SlashTrail,
  type StickmanRenderOptions,
} from '../../src/game/StickmanRenderer';
import { renderAttackSwingAura } from '../../src/game/renderer/trails';
import { getSkinInkPalette } from '../../src/game/renderer/inkStyle';
import type { ProjectileTheme, SkinId } from '../../src/game/types';
import { MockCanvasElement, installDomShims } from './helpers/mockCanvas';
import {
  assertDistinctSignatures,
  assertDrawTraceValid,
  assertValidCssHexColor,
} from './helpers/assertions';
import {
  PROJECT_ROOT,
  createHeadlessGame,
  createTestPlayer,
  extractGeometryMetrics,
  getActiveParticleTexts,
  getGameInternals,
} from './helpers/testHarness';

const FORBIDDEN_SWORD_STYLES = new Set(['arc', 'iaido_line', 'heavy_cleave']);
const VALID_MIRAGE_TRAIL_STYLES = new Set(['mirror_fracture', 'void_prism_fracture']);
const VALID_PROJECTILE_THEMES = new Set<ProjectileTheme>([
  'default',
  'seraph',
  'void',
  'shogun',
  'cyber',
  'phoenix',
  'frostfire',
  'blood_moon',
  'astral',
]);

function listSrcTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSrcTsFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

function buildMirageRenderOpts(
  skinId: SkinId,
  opts: {
    pose: StickmanRenderOptions['pose'];
    awakened: boolean;
    attackProgress?: number;
  }
): StickmanRenderOptions {
  const def = getCharacterDef('mirage', skinId);
  const vfx = getSkinVfxProfile('mirage', skinId);
  const awProf = opts.awakened ? getAwakenedVisualProfile('mirage', skinId) : null;
  const scarf = createScarfChain(320, GROUND_Y - 66);
  for (let i = 0; i < 6; i++) {
    stepVerletScarf(scarf, 320, GROUND_Y - 66, 1, 0.25 + i * 0.03, 9, 1 / 60);
  }

  return {
    x: 320,
    y: GROUND_Y,
    facing: 1,
    pose: opts.pose,
    poseTime: 0.24,
    walkPhase: 0.4,
    bodyColor: opts.awakened ? def.awakenedBodyColor : def.bodyColor,
    glowColor: opts.awakened ? vfx.impactRingColor : def.glowColor,
    lineWidth: opts.awakened ? 10.6 : 10.0,
    headRadius: 12.8,
    scarf,
    scarfPrimary: awProf ? awProf.scarfPrimary : def.scarfPrimary,
    scarfHighlight: awProf ? awProf.scarfHighlight : def.scarfHighlight,
    hasSheath: def.hasSheath,
    darkAura: opts.awakened ? def.awakenedAuraStyle : def.auraStyle,
    headGear: def.headGear,
    weapon: opts.awakened ? def.awakenedWeapon : def.weapon,
    awakenedForm: opts.awakened ? 'mirage' : null,
    awakened: opts.awakened,
    skinId,
    characterId: 'mirage',
    attackProgress: opts.attackProgress ?? 0,
    attackAuraColor: vfx.swingAuraColor,
    attackAuraSecondary: vfx.swingAuraSecondary ?? def.accentColor,
    vfxMotif: vfx.motif,
    auraRimColor: vfx.auraTendrilPrimary,
    auraPuddleColor: vfx.auraTendrilSecondary,
  };
}

// =========================================================================
// R1 — Glass/Mirror Combat VFX & Non-Sword Trails
// =========================================================================

test('R4-R1-01: Mirage combo moveset uses mirror_fracture/void_prism_fracture and never sword arcs', () => {
  const groundPoses = new Set<string>();

  for (let step = 1; step <= 6; step++) {
    const move = getComboMoveForCharacter('mirage', step, 'ground');
    groundPoses.add(move.pose);
    assert.ok(
      move.cancelRatio > 0.35 && move.cancelRatio < 0.7,
      `mirage ground step ${step} cancelRatio=${move.cancelRatio} must be in (0.35, 0.7)`
    );
    assert.equal(
      FORBIDDEN_SWORD_STYLES.has(String(move.trailStyle)),
      false,
      `mirage ground step ${step} trailStyle="${move.trailStyle}" must not use sword trail`
    );
    assert.ok(
      VALID_MIRAGE_TRAIL_STYLES.has(String(move.trailStyle)),
      `mirage ground step ${step} trailStyle="${move.trailStyle}" must be mirror_fracture or void_prism_fracture`
    );
    assert.ok(move.slashArcs.length > 0, `mirage ground step ${step} must define slashArcs`);
    for (let i = 0; i < move.slashArcs.length; i++) {
      const arcStyle = move.slashArcs[i].style ?? move.trailStyle;
      assert.equal(
        FORBIDDEN_SWORD_STYLES.has(String(arcStyle)),
        false,
        `mirage ground step ${step} slashArcs[${i}].style="${arcStyle}" must not use sword trail`
      );
      assert.ok(
        VALID_MIRAGE_TRAIL_STYLES.has(String(arcStyle)),
        `mirage ground step ${step} slashArcs[${i}].style="${arcStyle}" must be mirror_fracture or void_prism_fracture`
      );
    }
  }
  assert.ok(
    groundPoses.size >= 5,
    `mirage ground 1..6 must have >= 5 distinct poses, got ${groundPoses.size}: ${Array.from(groundPoses).join(', ')}`
  );

  for (let step = 1; step <= 3; step++) {
    const move = getComboMoveForCharacter('mirage', step, 'air');
    assert.equal(
      FORBIDDEN_SWORD_STYLES.has(String(move.trailStyle)),
      false,
      `mirage air step ${step} trailStyle="${move.trailStyle}" must not use sword trail`
    );
    assert.ok(
      VALID_MIRAGE_TRAIL_STYLES.has(String(move.trailStyle)),
      `mirage air step ${step} trailStyle="${move.trailStyle}" must be mirror_fracture or void_prism_fracture`
    );
    assert.ok(move.slashArcs.length > 0, `mirage air step ${step} must define slashArcs`);
    for (let i = 0; i < move.slashArcs.length; i++) {
      const arcStyle = move.slashArcs[i].style ?? move.trailStyle;
      assert.equal(
        FORBIDDEN_SWORD_STYLES.has(String(arcStyle)),
        false,
        `mirage air step ${step} slashArcs[${i}].style="${arcStyle}" must not use sword trail`
      );
      assert.ok(
        VALID_MIRAGE_TRAIL_STYLES.has(String(arcStyle)),
        `mirage air step ${step} slashArcs[${i}].style="${arcStyle}" must be mirror_fracture or void_prism_fracture`
      );
    }
    if (step === 3) {
      assert.equal(move.unblockable, true, 'mirage air step 3 must be unblockable');
    }
  }

  const dashSlash = getComboMoveForCharacter('mirage', 1, 'dash_slash');
  assert.ok(dashSlash.lungeSpeed >= 500, `mirage dash_slash lungeSpeed=${dashSlash.lungeSpeed} must be >= 500`);
  assert.equal(dashSlash.afterimages, true, 'mirage dash_slash must enable afterimages');
  assert.equal(
    FORBIDDEN_SWORD_STYLES.has(String(dashSlash.trailStyle)),
    false,
    `mirage dash_slash trailStyle="${dashSlash.trailStyle}" must not use sword trail`
  );
  assert.ok(
    VALID_MIRAGE_TRAIL_STYLES.has(String(dashSlash.trailStyle)),
    `mirage dash_slash trailStyle="${dashSlash.trailStyle}" must be mirror_fracture or void_prism_fracture`
  );
  for (let i = 0; i < dashSlash.slashArcs.length; i++) {
    const arcStyle = dashSlash.slashArcs[i].style ?? dashSlash.trailStyle;
    assert.equal(FORBIDDEN_SWORD_STYLES.has(String(arcStyle)), false);
    assert.ok(VALID_MIRAGE_TRAIL_STYLES.has(String(arcStyle)));
  }

  const parryCounter = getComboMoveForCharacter('mirage', 1, 'parry_counter');
  assert.equal(parryCounter.unblockable, true, 'mirage parry_counter must be unblockable');
  assert.equal(
    FORBIDDEN_SWORD_STYLES.has(String(parryCounter.trailStyle)),
    false,
    `mirage parry_counter trailStyle="${parryCounter.trailStyle}" must not use sword trail`
  );
  assert.ok(
    VALID_MIRAGE_TRAIL_STYLES.has(String(parryCounter.trailStyle)),
    `mirage parry_counter trailStyle="${parryCounter.trailStyle}" must be mirror_fracture or void_prism_fracture`
  );
  for (let i = 0; i < parryCounter.slashArcs.length; i++) {
    const arcStyle = parryCounter.slashArcs[i].style ?? parryCounter.trailStyle;
    assert.equal(FORBIDDEN_SWORD_STYLES.has(String(arcStyle)), false);
    assert.ok(VALID_MIRAGE_TRAIL_STYLES.has(String(arcStyle)));
  }
});

test('R4-R1-02: Mirage SKIN_VFX_PROFILES and getAwakenedVisualProfile are complete and non-fallback', () => {
  const kuroAwakened = getAwakenedVisualProfile('kuro', 'default');

  for (const skinId of ['default', 'void_shatterer'] as const) {
    const key = `mirage:${skinId}`;
    const raw = SKIN_VFX_PROFILES[key];
    assert.ok(raw, `SKIN_VFX_PROFILES['${key}'] must exist`);

    const prof = getSkinVfxProfile('mirage', skinId);
    assert.equal(prof.characterId, 'mirage');
    assert.equal(prof.skinId, skinId);
    assert.ok(prof.motif, `${key}.motif must be defined`);
    assert.ok(
      VALID_PROJECTILE_THEMES.has(prof.projectileTheme),
      `${key}.projectileTheme="${prof.projectileTheme}" must be a valid ProjectileTheme`
    );
    assertValidCssHexColor(prof.swingAuraSecondary, `${key}.swingAuraSecondary`);
    assertValidCssHexColor(prof.auraTendrilPrimary, `${key}.auraTendrilPrimary`);
    assertValidCssHexColor(prof.auraTendrilSecondary, `${key}.auraTendrilSecondary`);
    assertValidCssHexColor(prof.slashPrimary, `${key}.slashPrimary`);
    assertValidCssHexColor(prof.slashSecondary, `${key}.slashSecondary`);
    assertValidCssHexColor(prof.slashRim, `${key}.slashRim`);
    assertValidCssHexColor(prof.slashCore, `${key}.slashCore`);
    assertValidCssHexColor(prof.swingAuraColor, `${key}.swingAuraColor`);

    const aw = getAwakenedVisualProfile('mirage', skinId);
    assert.notEqual(
      aw.formTitle,
      kuroAwakened.formTitle,
      `getAwakenedVisualProfile('mirage', '${skinId}') must not fall back to Kuro's ${kuroAwakened.formTitle}`
    );
    assert.notEqual(
      aw.upgradedSpecialName,
      kuroAwakened.upgradedSpecialName,
      `getAwakenedVisualProfile('mirage', '${skinId}') must not inherit Kuro's upgradedSpecialName`
    );
    assertValidCssHexColor(aw.scarfPrimary, `aw(${key}).scarfPrimary`);
    assertValidCssHexColor(aw.scarfHighlight, `aw(${key}).scarfHighlight`);
    assertValidCssHexColor(aw.auraAccent, `aw(${key}).auraAccent`);
  }

  const defAw = getAwakenedVisualProfile('mirage', 'default');
  const mythicAw = getAwakenedVisualProfile('mirage', 'void_shatterer');
  assert.notEqual(defAw.formTitle, mythicAw.formTitle, 'Mirage skins must have distinct awakened formTitle');
  assert.notEqual(
    SKIN_VFX_PROFILES['mirage:default'].motif,
    SKIN_VFX_PROFILES['mirage:void_shatterer'].motif,
    'mirage:default and mirage:void_shatterer must have distinct VFX motifs'
  );
});

test('R4-R1-03: Live Mirage attacks spawn mirror_fracture/void_prism_fracture trails and render cleanly', () => {
  for (const skinId of ['default', 'void_shatterer'] as const) {
    const { player, ctx, tap, step } = createTestPlayer('mirage', skinId);
    const observedStyles = new Set<string>();

    // Ground combo attacks
    for (let hit = 1; hit <= 4; hit++) {
      tap('attack', 1, 1 / 60);
      step(3, 1 / 60);
      for (const tr of player.slashTrails) {
        assert.equal(
          FORBIDDEN_SWORD_STYLES.has(String(tr.style ?? 'arc')),
          false,
          `${skinId} ground hit ${hit} spawned forbidden sword trail style="${tr.style}"`
        );
        assert.ok(
          VALID_MIRAGE_TRAIL_STYLES.has(String(tr.style)),
          `${skinId} ground hit ${hit} expected mirror_fracture/void_prism_fracture, got "${tr.style}"`
        );
        observedStyles.add(String(tr.style));
      }
      const waitSteps = Math.max(2, Math.ceil((player.attackDuration * 0.56) / (1 / 60)));
      step(waitSteps, 1 / 60);
    }

    // Air attack
    tap('jump', 2, 1 / 60);
    step(4, 1 / 60);
    tap('attack', 1, 1 / 60);
    step(3, 1 / 60);
    assert.ok(player.slashTrails.length > 0, `${skinId} air attack must spawn SlashTrail`);
    for (const tr of player.slashTrails) {
      assert.ok(
        VALID_MIRAGE_TRAIL_STYLES.has(String(tr.style)),
        `${skinId} air attack trail style="${tr.style}" must be mirror_fracture/void_prism_fracture`
      );
      observedStyles.add(String(tr.style));
    }

    // Render slash trails & swing aura cleanly
    ctx.resetTrace();
    renderSlashTrails(ctx as unknown as CanvasRenderingContext2D, player.slashTrails);
    const joints = computeStickmanSkeleton('attack_2', 0.22, 0, 'mirage');
    renderAttackSwingAura(
      ctx as unknown as CanvasRenderingContext2D,
      joints,
      buildMirageRenderOpts(skinId, { pose: 'attack_2', awakened: false, attackProgress: 0.45 })
    );
    assertDrawTraceValid(ctx.metrics, `R4-R1-03 ${skinId} trails+aura`);
    assert.equal(ctx.getSaveDepth(), 0, `R4-R1-03 ${skinId} saveDepth must return to 0`);
    assert.ok(ctx.commands.length > 0, `R4-R1-03 ${skinId} expected non-empty trail+aura draw commands`);
    assert.ok(observedStyles.size > 0, `${skinId} expected at least one Mirage mirror trail style`);
  }

  // Also verify via createHeadlessGame
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('mirage', false);
    session.game.setSkin('void_shatterer', false);
    session.game.startMode('training', false);
    session.tapAction('attack', 2, 1 / 60);
    session.stepFrames(6, 1 / 60);
    const { player } = getGameInternals(session.game);
    assert.ok(player.slashTrails.length > 0, 'Headless Mirage attack must produce SlashTrails');
    for (const tr of player.slashTrails) {
      assert.ok(
        VALID_MIRAGE_TRAIL_STYLES.has(String(tr.style)),
        `Headless Mirage trail style="${tr.style}" must not be sword arc`
      );
    }
    assertDrawTraceValid(session.ctx.metrics, 'R4-R1-03 headless Mirage attack');
    assert.equal(session.ctx.getSaveDepth(), 0);
  } finally {
    session.destroy();
  }
});

// =========================================================================
// R2 — Unique Mythic Skin Ma Kính (void_shatterer)
// =========================================================================

test('R4-R2-01: getSkinInkPalette differentiates mirage:default, mirage:void_shatterer, and kuro:default', () => {
  for (const awakened of [false, true]) {
    const kuroPal = getSkinInkPalette('kuro', 'default', awakened);
    const mirageDef = getSkinInkPalette('mirage', 'default', awakened);
    const mirageMythic = getSkinInkPalette('mirage', 'void_shatterer', awakened);

    for (const [name, pal] of [
      ['mirage:default', mirageDef],
      ['mirage:void_shatterer', mirageMythic],
    ] as const) {
      for (const key of [
        'inkOutline',
        'baseFill',
        'shadowFill',
        'rimColor',
        'accentColor',
        'clothPrimary',
        'clothHighlight',
        'metalLight',
        'metalDark',
        'glowCore',
      ] as const) {
        assertValidCssHexColor(pal[key], `${name}(awakened=${awakened}).${key}`);
      }
    }

    const sig = (p: ReturnType<typeof getSkinInkPalette>) =>
      [p.baseFill, p.shadowFill, p.rimColor, p.accentColor, p.clothPrimary, p.glowCore].join('|');

    assert.notEqual(
      sig(mirageDef),
      sig(kuroPal),
      `mirage:default(awakened=${awakened}) must not fall back to kuro:default palette`
    );
    assert.notEqual(
      sig(mirageMythic),
      sig(kuroPal),
      `mirage:void_shatterer(awakened=${awakened}) must not fall back to kuro:default palette`
    );
    assert.notEqual(
      sig(mirageDef),
      sig(mirageMythic),
      `mirage:default and mirage:void_shatterer(awakened=${awakened}) must have distinct palettes`
    );
  }
});

test('R4-R2-02: renderStickman renders mirage:void_shatterer with distinct structural geometry from mirage:default', () => {
  installDomShims();

  const cases: Array<{ tag: string; pose: StickmanRenderOptions['pose']; awakened: boolean; attackProgress?: number }> = [
    { tag: 'normal_idle', pose: 'idle', awakened: false },
    { tag: 'awakened', pose: 'awaken_pose', awakened: true },
    { tag: 'attack_1_normal', pose: 'attack_1', awakened: false, attackProgress: 0.45 },
    { tag: 'attack_1_awakened', pose: 'attack_1', awakened: true, attackProgress: 0.45 },
  ];

  for (const c of cases) {
    const tracesBySkin: Record<'default' | 'void_shatterer', ReturnType<typeof extractGeometryMetrics>> = {
      default: { commandCount: 0, subpathCount: 0, closedSubpathCount: 0, totalVertices: 0, opCounts: {}, geometrySignature: '' },
      void_shatterer: { commandCount: 0, subpathCount: 0, closedSubpathCount: 0, totalVertices: 0, opCounts: {}, geometrySignature: '' },
    };
    const fullSigs: Array<{ id: string; signature: string }> = [];

    for (const skinId of ['default', 'void_shatterer'] as const) {
      const canvas = new MockCanvasElement(800, 650);
      const ctx = canvas.ctx;
      renderStickman(
        ctx as unknown as CanvasRenderingContext2D,
        buildMirageRenderOpts(skinId, {
          pose: c.pose,
          awakened: c.awakened,
          attackProgress: c.attackProgress,
        })
      );

      const label = `R4-R2-02 mirage:${skinId}:${c.tag}`;
      assertDrawTraceValid(ctx.metrics, label);
      assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must return to 0`);
      assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);

      tracesBySkin[skinId] = extractGeometryMetrics(ctx.commands);
      fullSigs.push({ id: `${skinId}:${c.tag}`, signature: ctx.getTraceSignature() });
    }

    assertDistinctSignatures(fullSigs, `R4-R2-02 ${c.tag} color+geometry distinctness`);

    const defGeo = tracesBySkin.default;
    const mythicGeo = tracesBySkin.void_shatterer;
    assert.notEqual(
      defGeo.geometrySignature,
      mythicGeo.geometrySignature,
      `R4-R2-02 ${c.tag}: void_shatterer must have distinct structural geometry from default (not palette-only swap)`
    );
    assert.ok(
      defGeo.commandCount !== mythicGeo.commandCount ||
        defGeo.subpathCount !== mythicGeo.subpathCount ||
        defGeo.totalVertices !== mythicGeo.totalVertices,
      `R4-R2-02 ${c.tag}: void_shatterer must differ in command/subpath/vertex counts (default=${defGeo.commandCount}/${defGeo.subpathCount}/${defGeo.totalVertices}, mythic=${mythicGeo.commandCount}/${mythicGeo.subpathCount}/${mythicGeo.totalVertices})`
    );
  }
});

// =========================================================================
// R3 — Exclusive Domain Expansion (void_shatterer only)
// =========================================================================

test('R4-R3-01: Awakening on mirage:void_shatterer activates Domain Expansion, empowers MirrorRifts, and reverts cleanly on expiry', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('mirage', false);
    session.game.setSkin('void_shatterer', false);
    session.game.setSelectedStage(1, false); // solar_observatory -> confirm stageTheme preserved
    session.game.startMode('story', false);

    const internals = getGameInternals(session.game);
    const initialTheme = internals.bg.getStageTheme();
    assert.equal(typeof internals.bg.getDomainBlend, 'function', 'PeriodicTableBG.getDomainBlend() required');

    // Prevent player death or accidental wave completion during 15s Domain test window
    internals.player.maxHp = 99999;
    internals.player.hp = 99999;
    internals.player.awakening = internals.player.maxAwakening;
    internals.enemies = [new Enemy('heavy_brute', 1480, false)];
    internals.enemies[0].maxHp = 99999;
    internals.enemies[0].hp = 99999;

    assert.equal(internals.bg.getDomainBlend!(), 0, 'Domain blend must start at 0 before Awakening');

    // Trigger Awakening [O]
    session.tapAction('awaken', 2, 1 / 60);
    session.stepFrames(35, 0.045); // ~1.58s

    assert.equal(internals.player.awakened, true, 'Mirage void_shatterer must be awakened');
    assert.ok(
      internals.bg.getDomainBlend!() > 0.5,
      `Domain Expansion blend must climb > 0.5 after Awakening, got ${internals.bg.getDomainBlend!()}`
    );
    assert.ok(internals.mirrorRifts.length > 0, 'Awakening must spawn MirrorRifts');
    for (const rift of internals.mirrorRifts) {
      assert.equal(
        rift.domainEmpowered,
        true,
        'Active MirrorRifts during Domain Expansion must have domainEmpowered === true'
      );
    }
    assert.equal(
      internals.bg.getStageTheme(),
      initialTheme,
      'Domain Expansion must preserve original stageTheme without mutating it'
    );
    assertDrawTraceValid(session.ctx.metrics, 'R4-R3-01 domain active');

    // Step past 12.5s Awakening / Domain duration + decay time (+14.4s = 320 frames at 0.045s)
    session.stepFrames(320, 0.045);

    assert.ok(
      internals.bg.getDomainBlend!() < 0.08,
      `Domain Expansion blend must smoothly decay back near 0 after expiry, got ${internals.bg.getDomainBlend!()}`
    );
    assert.equal(
      internals.bg.getStageTheme(),
      initialTheme,
      'Original stageTheme must still be preserved after Domain Expansion expires'
    );
    assertDrawTraceValid(session.ctx.metrics, 'R4-R3-01 domain reverted');
  } finally {
    session.destroy();
  }
});

test('R4-R3-02: Rage Ultimate [I] on mirage:void_shatterer activates Domain Expansion', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('mirage', false);
    session.game.setSkin('void_shatterer', false);
    session.game.startMode('training', false);

    const internals = getGameInternals(session.game);
    assert.equal(typeof internals.bg.getDomainBlend, 'function', 'PeriodicTableBG.getDomainBlend() required');
    internals.player.rage = internals.player.maxRage;
    assert.equal(internals.bg.getDomainBlend!(), 0);

    // Trigger Rage Ultimate [I] (cutscene runs ~2.7-3.0s)
    session.tapAction('ultimate', 2, 1 / 60);
    session.stepFrames(85, 0.045); // ~3.8s total: cutscene completes + domainBlend ramps up

    assert.ok(
      internals.bg.getDomainBlend!() > 0.5,
      `Domain Expansion blend must climb > 0.5 after void_shatterer Rage Ultimate, got ${internals.bg.getDomainBlend!()}`
    );
    assertDrawTraceValid(session.ctx.metrics, 'R4-R3-02 void_shatterer ultimate domain');
  } finally {
    session.destroy();
  }
});

test('R4-R3-03: mirage:default NEVER activates Domain Expansion on Awakening [O] or Ultimate [I]', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('mirage', false);
    session.game.setSkin('default', false);
    session.game.startMode('training', false);

    const internals = getGameInternals(session.game);
    assert.equal(typeof internals.bg.getDomainBlend, 'function', 'PeriodicTableBG.getDomainBlend() required');

    // Trigger Awakening [O]
    session.tapAction('awaken', 2, 1 / 60);
    session.stepFrames(35, 0.045);
    assert.equal(internals.player.awakened, true);
    assert.equal(
      internals.bg.getDomainBlend!(),
      0,
      `mirage:default Awakening must keep domainBlend === 0, got ${internals.bg.getDomainBlend!()}`
    );

    // Trigger Rage Ultimate [I]
    internals.player.rage = internals.player.maxRage;
    session.tapAction('ultimate', 2, 1 / 60);
    session.stepFrames(85, 0.045);
    assert.equal(
      internals.bg.getDomainBlend!(),
      0,
      `mirage:default Rage Ultimate must keep domainBlend === 0, got ${internals.bg.getDomainBlend!()}`
    );
    assertDrawTraceValid(session.ctx.metrics, 'R4-R3-03 mirage:default no domain');
  } finally {
    session.destroy();
  }
});

// =========================================================================
// R4 — Active MirrorRift ([U]) Interactions
// =========================================================================

test('R4-R4-01: Attack [J] overlapping active MirrorRift shatters it into mirror_shards/AoE damage + callout', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('mirage', false);
    session.game.setSkin('void_shatterer', false);
    session.game.startMode('training', false);

    const internals = getGameInternals(session.game);
    // Stand up from chair & position deterministically
    session.tapAction('right', 2, 1 / 60);
    session.stepFrames(4, 1 / 60);

    internals.player.x = 1200;
    internals.player.y = GROUND_Y;
    internals.player.facing = 1;
    internals.player.vx = 0;

    // Place a single enemy ahead of the rift so shard volleys/AoE target it
    const enemy = new Enemy('heavy_brute', 1480, false);
    enemy.maxHp = 5000;
    enemy.hp = 5000;
    internals.enemies = [enemy];
    const initialHp = enemy.hp;

    // Summon MirrorRift via [U] ('cryo') -> spawns around x = 1325
    session.tapAction('cryo', 2, 1 / 60);
    session.stepFrames(2, 1 / 60);
    assert.ok(internals.mirrorRifts.length >= 1, 'Pressing [U] must spawn at least 1 MirrorRift');
    const rift = internals.mirrorRifts[0];

    // Step through cryoCastTimer (0.22s), clear prior [U] particles so callout check is strict, and align [J]
    session.stepFrames(14, 1 / 60);
    internals.particles.clear();
    internals.player.x = rift.x - 55;
    internals.player.facing = 1;
    internals.player.vx = 0;

    let sawMirrorShardProj = false;
    let sawCalloutText = false;

    // Attack [J] overlapping the MirrorRift
    session.tapAction('attack', 2, 1 / 60);
    for (let f = 0; f < 25; f++) {
      session.stepFrames(1, 1 / 60);
      if (internals.projectiles.some((p) => p.fromPlayer && p.kind === 'mirror_shard')) {
        sawMirrorShardProj = true;
      }
      if (getActiveParticleTexts(internals.particles).length > 0) {
        sawCalloutText = true;
      }
    }

    const riftShattered = !rift.active || !internals.mirrorRifts.includes(rift);
    assert.equal(riftShattered, true, 'Attacking [J] across an active MirrorRift must shatter the rift');
    assert.ok(
      sawMirrorShardProj || enemy.hp < initialHp,
      `Shattering MirrorRift must spawn piercing mirror_shard projectile(s) or deal shatter AoE damage (sawShard=${sawMirrorShardProj}, enemyHp=${enemy.hp}/${initialHp})`
    );
    assert.equal(sawCalloutText, true, 'Shattering MirrorRift must emit new floating callout text');
    assertDrawTraceValid(session.ctx.metrics, 'R4-R4-01 rift shatter');
  } finally {
    session.destroy();
  }
});

test('R4-R4-02: Dash through active MirrorRift triggers Mirror Warp, cooldown refund, and callout', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('mirage', false);
    session.game.setSkin('default', false);
    session.game.startMode('training', false);

    const internals = getGameInternals(session.game);
    session.tapAction('right', 2, 1 / 60);
    session.stepFrames(4, 1 / 60);

    internals.player.x = 300;
    internals.player.y = GROUND_Y;
    internals.player.facing = 1;
    internals.player.vx = 0;

    // Place enemy ~615px ahead of rift (within typical warp search range, unreachable by ~266px normal dash)
    const enemy = new Enemy('heavy_brute', 1040, false);
    enemy.maxHp = 5000;
    enemy.hp = 5000;
    internals.enemies = [enemy];

    // Summon MirrorRift via [U] ('cryo') -> spawns around x = 1125
    session.tapAction('cryo', 2, 1 / 60);
    session.stepFrames(15, 1 / 60); // let cryoCastTimer finish
    assert.ok(internals.mirrorRifts.length >= 1, 'Pressing [U] must spawn active MirrorRift');
    const rift = internals.mirrorRifts[0];

    // Position player right next to the rift facing into it; clear prior [U] texts so callout check is strict
    internals.particles.clear();
    internals.player.x = rift.x - 35;
    internals.player.facing = 1;
    internals.player.vx = 0;
    internals.player.dashCooldown = 0;
    const cryoCdBefore = internals.player.cryoCooldown;
    assert.ok(cryoCdBefore > 0.5, 'Expected cryoCooldown > 0.5s after summoning rift');

    // Dash through the MirrorRift
    session.tapAction('dash', 2, 1 / 60);
    let sawCalloutText = false;
    let warpedNearEnemy = false;
    let sawCooldownRefund = false;
    for (let f = 0; f < 10; f++) {
      session.stepFrames(1, 1 / 60);
      if (Math.abs(internals.player.x - enemy.x) <= 150) {
        warpedNearEnemy = true;
      }
      if (
        internals.player.cryoCooldown < cryoCdBefore - 0.35 ||
        (f < 3 && internals.player.dashCooldown <= 0.2)
      ) {
        sawCooldownRefund = true;
      }
      if (getActiveParticleTexts(internals.particles).length > 0) {
        sawCalloutText = true;
      }
    }

    assert.equal(
      warpedNearEnemy,
      true,
      `Dashing through MirrorRift must Mirror-Warp Mirage near/behind enemy (player.x=${internals.player.x}, enemy.x=${enemy.x})`
    );
    assert.equal(
      sawCooldownRefund,
      true,
      `Mirror Warp must refund cooldown (cryoCd: ${cryoCdBefore.toFixed(2)} -> ${internals.player.cryoCooldown.toFixed(2)}, dashCd=${internals.player.dashCooldown.toFixed(2)})`
    );
    assert.equal(sawCalloutText, true, 'Mirror Warp must emit new floating callout text');
    assertDrawTraceValid(session.ctx.metrics, 'R4-R4-02 mirror warp');
  } finally {
    session.destroy();
  }
});

// =========================================================================
// R5 — Static & Headless Canvas 2D Compliance
// =========================================================================

test('R4-R5-01: Static scan confirms 0 shadowBlur across src/ and 0 performance.now() in src/game/renderer/', () => {
  const srcRoot = path.join(PROJECT_ROOT, 'src');
  const allSrcFiles = listSrcTsFiles(srcRoot);
  assert.ok(allSrcFiles.length > 0, 'Expected TypeScript files under src/');

  const shadowBlurOffenders: string[] = [];
  for (const file of allSrcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\bshadowBlur\b/.test(content)) {
      shadowBlurOffenders.push(path.relative(PROJECT_ROOT, file));
    }
  }
  assert.deepEqual(
    shadowBlurOffenders,
    [],
    `Forbidden shadowBlur found in: ${shadowBlurOffenders.join(', ')}`
  );

  const rendererDir = path.join(srcRoot, 'game', 'renderer');
  const rendererFiles = listSrcTsFiles(rendererDir);
  assert.ok(rendererFiles.length > 0, 'Expected TypeScript files under src/game/renderer/');

  const perfNowOffenders: string[] = [];
  for (const file of rendererFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\bperformance\s*\.\s*now\s*\(/.test(content)) {
      perfNowOffenders.push(path.relative(PROJECT_ROOT, file));
    }
  }
  assert.deepEqual(
    perfNowOffenders,
    [],
    `Forbidden performance.now() in src/game/renderer/: ${perfNowOffenders.join(', ')}`
  );
});

test('R4-R5-02: PeriodicTableBG (normal, domainActive, reverted) and MirrorRift (empowered false/true) render cleanly', () => {
  installDomShims();

  // 1. PeriodicTableBG headless render check across normal -> domain -> reverted
  const bg = new PeriodicTableBG() as PeriodicTableBG & {
    update: (dt: number, awakened: boolean, domainActive?: boolean) => void;
    getDomainBlend?: () => number;
  };
  bg.setStageTheme('genesis_lab');

  const renderBgState = (label: string, awakened: boolean): string => {
    const canvas = new MockCanvasElement(1280, 720);
    const ctx = canvas.ctx;
    bg.renderScreenBackdrop(ctx as unknown as CanvasRenderingContext2D, 1280, 720, awakened, '#f43f5e');
    bg.renderWorld(ctx as unknown as CanvasRenderingContext2D, 640, GROUND_Y, '#38bdf8', '#f43f5e');
    assertDrawTraceValid(ctx.metrics, label);
    assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must be 0`);
    assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);
    return ctx.getTraceSignature();
  };

  for (let i = 0; i < 15; i++) bg.update(1 / 60, false, false);
  const normalSig = renderBgState('R4-R5-02 bg normal', false);

  for (let i = 0; i < 60; i++) bg.update(1 / 30, true, true);
  if (typeof bg.getDomainBlend === 'function') {
    assert.ok(bg.getDomainBlend() > 0.7, `Expected domainBlend > 0.7, got ${bg.getDomainBlend()}`);
  }
  const domainSig = renderBgState('R4-R5-02 bg domainActive', true);
  assert.notEqual(domainSig, normalSig, 'Domain active PeriodicTableBG render must differ from normal');

  for (let i = 0; i < 120; i++) bg.update(1 / 30, false, false);
  if (typeof bg.getDomainBlend === 'function') {
    assert.ok(bg.getDomainBlend() < 0.05, `Expected domainBlend < 0.05 after revert, got ${bg.getDomainBlend()}`);
  }
  renderBgState('R4-R5-02 bg reverted', false);

  // 2. MirrorRift headless render check (domainEmpowered = false vs true)
  for (const empowered of [false, true]) {
    const rift = new MirrorRift(640, GROUND_Y - 58, 28, true, '#38bdf8', '#f43f5e', 4.5) as MirrorRift & {
      domainEmpowered?: boolean;
    };
    rift.domainEmpowered = empowered;
    rift.update(0.25);

    const canvas = new MockCanvasElement(1280, 720);
    const ctx = canvas.ctx;
    rift.render(ctx as unknown as CanvasRenderingContext2D);
    const label = `R4-R5-02 MirrorRift domainEmpowered=${empowered}`;
    assertDrawTraceValid(ctx.metrics, label);
    assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must be 0`);
    assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);
  }
});
