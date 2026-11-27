import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getAwakenedVisualProfile, getComboMoveForCharacter } from '../../src/game/animation';
import { CHARACTER_ROSTER, getCharacterDef, getSkinsForCharacter } from '../../src/game/characters';
import { computeSynergyCooldownRefund } from '../../src/game/synergy';
import { Boss } from '../../src/game/Boss';
import { Enemy } from '../../src/game/Enemy';
import { Projectile } from '../../src/game/Entities';
import { PeriodicTableBG } from '../../src/game/PeriodicTableBG';
import { UltimateCutscene } from '../../src/game/UltimateCutscene';
import { AudioEngine } from '../../src/game/AudioEngine';
import { Camera } from '../../src/game/Camera';
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
import { TitleScreen } from '../../src/components/TitleScreen';
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

const VALID_CHRONO_TRAIL_STYLES = new Set(['chrono_clockwork_slash', 'chrono_sovereign_slash']);
const GENERIC_TRAIL_STYLES = new Set(['arc', 'heavy_cleave', 'spear_thrust', 'twin_x']);
const VALID_PARTICLE_ACCENT_KINDS = new Set([
  'spark',
  'ember',
  'ice',
  'lightning',
  'smoke',
  'feather',
  'petal',
  'star',
  'shard',
  'ink_splatter',
]);
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

function buildChronoRenderOpts(
  skinId: SkinId,
  opts: {
    pose: StickmanRenderOptions['pose'];
    awakened: boolean;
    attackProgress?: number;
  }
): StickmanRenderOptions {
  const def = getCharacterDef('chrono', skinId);
  const vfx = getSkinVfxProfile('chrono', skinId);
  const awProf = opts.awakened ? getAwakenedVisualProfile('chrono', skinId) : null;
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
    awakenedForm: opts.awakened ? 'chrono' : null,
    awakened: opts.awakened,
    skinId,
    characterId: 'chrono',
    attackProgress: opts.attackProgress ?? 0,
    attackAuraColor: vfx.swingAuraColor,
    attackAuraSecondary: vfx.swingAuraSecondary ?? def.accentColor,
    vfxMotif: vfx.motif,
    auraRimColor: vfx.auraTendrilPrimary,
    auraPuddleColor: vfx.auraTendrilSecondary,
  };
}

// =========================================================================
// R1 — Chrono Roster, VFX Profiles, Synergy, Moveset, Ink Palettes & Portrait
// =========================================================================

test('R5-R1-01: Chrono roster, SkinVfxProfile, AwakenedProfile, Synergy refund, and Moveset are complete and non-fallback', () => {
  // 1. synergyHint
  const synergyHint = CHARACTER_ROSTER.chrono.skills.synergyHint;
  assert.equal(typeof synergyHint, 'string', 'CHARACTER_ROSTER.chrono.skills.synergyHint must be a string');
  assert.ok(synergyHint.trim().length > 0, 'CHARACTER_ROSTER.chrono.skills.synergyHint must be non-empty');

  // 2. SKIN_VFX_PROFILES & getAwakenedVisualProfile
  const kuroAwakened = getAwakenedVisualProfile('kuro', 'default');

  for (const skinId of ['default', 'chrono_sovereign'] as const) {
    const key = `chrono:${skinId}`;
    const raw = SKIN_VFX_PROFILES[key];
    assert.ok(raw, `SKIN_VFX_PROFILES['${key}'] must exist`);

    const prof = getSkinVfxProfile('chrono', skinId);
    assert.equal(prof.profileId, key, `${key}.profileId must equal "${key}"`);
    assert.equal(prof.characterId, 'chrono');
    assert.equal(prof.skinId, skinId);
    assert.ok(prof.motif, `${key}.motif must be defined`);
    assert.ok(
      VALID_PROJECTILE_THEMES.has(prof.projectileTheme),
      `${key}.projectileTheme="${prof.projectileTheme}" must be a valid ProjectileTheme`
    );

    assert.notEqual(String(prof.swingParticleKind), 'rune', `${key}.swingParticleKind must not be invalid 'rune'`);
    assert.notEqual(String(prof.finisherParticleKind), 'rune', `${key}.finisherParticleKind must not be invalid 'rune'`);
    assert.ok(
      VALID_PARTICLE_ACCENT_KINDS.has(prof.swingParticleKind),
      `${key}.swingParticleKind="${prof.swingParticleKind}" must be a valid SkinParticleAccentKind`
    );
    assert.ok(
      VALID_PARTICLE_ACCENT_KINDS.has(prof.finisherParticleKind),
      `${key}.finisherParticleKind="${prof.finisherParticleKind}" must be a valid SkinParticleAccentKind`
    );

    for (const field of [
      'slashPrimary',
      'slashSecondary',
      'slashRim',
      'slashCore',
      'swingAuraColor',
      'swingAuraSecondary',
      'auraTendrilPrimary',
      'auraTendrilSecondary',
      'afterimageColor',
      'particlePrimary',
      'particleSecondary',
      'impactRingColor',
      'hitTextColor',
      'detonationColor',
      'cutscenePrimary',
      'cutsceneSecondary',
      'cutsceneAccent',
    ] as const) {
      assertValidCssHexColor(prof[field], `${key}.${field}`);
    }

    const aw = getAwakenedVisualProfile('chrono', skinId);
    assert.notEqual(
      aw.formTitle,
      kuroAwakened.formTitle,
      `getAwakenedVisualProfile('chrono', '${skinId}') must not fall back to Kuro's ${kuroAwakened.formTitle}`
    );
    assert.notEqual(
      aw.upgradedSpecialName,
      kuroAwakened.upgradedSpecialName,
      `getAwakenedVisualProfile('chrono', '${skinId}') must not inherit Kuro's upgradedSpecialName`
    );
    assertValidCssHexColor(aw.scarfPrimary, `aw(${key}).scarfPrimary`);
    assertValidCssHexColor(aw.scarfHighlight, `aw(${key}).scarfHighlight`);
    assertValidCssHexColor(aw.auraAccent, `aw(${key}).auraAccent`);
  }

  const defAw = getAwakenedVisualProfile('chrono', 'default');
  const mythicAw = getAwakenedVisualProfile('chrono', 'chrono_sovereign');
  assert.notEqual(defAw.formTitle, mythicAw.formTitle, 'Chrono skins must have distinct awakened formTitle');
  assert.notEqual(
    SKIN_VFX_PROFILES['chrono:default'].motif,
    SKIN_VFX_PROFILES['chrono:chrono_sovereign'].motif,
    'chrono:default and chrono:chrono_sovereign must have distinct VFX motifs'
  );

  // 3. Synergy cooldown refund curve for Chrono
  const kuroRefund3 = computeSynergyCooldownRefund('kuro', 3);
  const chronoRefund1 = computeSynergyCooldownRefund('chrono', 1);
  const chronoRefund3 = computeSynergyCooldownRefund('chrono', 3);
  for (const [tag, ref] of [
    ['chrono(1)', chronoRefund1],
    ['chrono(3)', chronoRefund3],
  ] as const) {
    assert.ok(Number.isFinite(ref.specialRefund) && ref.specialRefund > 0, `${tag} specialRefund must be > 0`);
    assert.ok(Number.isFinite(ref.dashRefund) && ref.dashRefund > 0, `${tag} dashRefund must be > 0`);
    assert.ok(Number.isFinite(ref.healAmount) && ref.healAmount >= 0, `${tag} healAmount must be finite >= 0`);
    assert.ok(Number.isFinite(ref.rageBonus) && ref.rageBonus > 0, `${tag} rageBonus must be > 0`);
  }
  assert.ok(
    chronoRefund3.specialRefund > chronoRefund1.specialRefund,
    `Chrono synergy specialRefund must scale with stacks (${chronoRefund1.specialRefund} -> ${chronoRefund3.specialRefund})`
  );
  assert.notDeepEqual(
    chronoRefund3,
    kuroRefund3,
    'computeSynergyCooldownRefund("chrono", 3) must use dedicated Chrono refund curve (not Kuro fallback)'
  );

  // 4. Dedicated Chrono combat moveset
  const groundPoses = new Set<string>();
  for (let step = 1; step <= 6; step++) {
    const move = getComboMoveForCharacter('chrono', step, 'ground');
    groundPoses.add(move.pose);
    assert.ok(
      move.cancelRatio > 0.35 && move.cancelRatio < 0.7,
      `chrono ground step ${step} cancelRatio=${move.cancelRatio} must be in (0.35, 0.7)`
    );
    assert.equal(
      GENERIC_TRAIL_STYLES.has(String(move.trailStyle)),
      false,
      `chrono ground step ${step} trailStyle="${move.trailStyle}" must not use generic trail`
    );
    assert.ok(
      VALID_CHRONO_TRAIL_STYLES.has(String(move.trailStyle)),
      `chrono ground step ${step} trailStyle="${move.trailStyle}" must be chrono_clockwork_slash or chrono_sovereign_slash`
    );
    assert.ok(move.slashArcs.length > 0, `chrono ground step ${step} must define slashArcs`);
    for (let i = 0; i < move.slashArcs.length; i++) {
      const arcStyle = move.slashArcs[i].style ?? move.trailStyle;
      assert.ok(
        VALID_CHRONO_TRAIL_STYLES.has(String(arcStyle)),
        `chrono ground step ${step} slashArcs[${i}].style="${arcStyle}" must be a Chrono trailStyle`
      );
    }
  }
  assert.ok(
    groundPoses.size >= 5,
    `chrono ground 1..6 must have >= 5 distinct poses, got ${groundPoses.size}: ${Array.from(groundPoses).join(', ')}`
  );

  for (let step = 1; step <= 3; step++) {
    const move = getComboMoveForCharacter('chrono', step, 'air');
    assert.ok(
      VALID_CHRONO_TRAIL_STYLES.has(String(move.trailStyle)),
      `chrono air step ${step} trailStyle="${move.trailStyle}" must be a Chrono trailStyle`
    );
    if (step === 3) {
      assert.equal(move.unblockable, true, 'chrono air step 3 must be unblockable');
    }
  }

  const dashSlash = getComboMoveForCharacter('chrono', 1, 'dash_slash');
  assert.ok(dashSlash.lungeSpeed >= 500, `chrono dash_slash lungeSpeed=${dashSlash.lungeSpeed} must be >= 500`);
  assert.equal(dashSlash.afterimages, true, 'chrono dash_slash must enable afterimages');
  assert.ok(
    VALID_CHRONO_TRAIL_STYLES.has(String(dashSlash.trailStyle)),
    `chrono dash_slash trailStyle="${dashSlash.trailStyle}" must be a Chrono trailStyle`
  );

  const parryCounter = getComboMoveForCharacter('chrono', 1, 'parry_counter');
  assert.equal(parryCounter.unblockable, true, 'chrono parry_counter must be unblockable');
  assert.ok(
    VALID_CHRONO_TRAIL_STYLES.has(String(parryCounter.trailStyle)),
    `chrono parry_counter trailStyle="${parryCounter.trailStyle}" must be a Chrono trailStyle`
  );
});

test('R5-R1-02: Chrono SkinInkPalette, structural Stickman geometry, and Chrono slash trails are distinct and valid', () => {
  installDomShims();

  // 1. SkinInkPalette check across normal & awakened
  for (const awakened of [false, true]) {
    const kuroPal = getSkinInkPalette('kuro', 'default', awakened);
    const chronoDef = getSkinInkPalette('chrono', 'default', awakened);
    const chronoMythic = getSkinInkPalette('chrono', 'chrono_sovereign', awakened);

    for (const [name, pal] of [
      ['chrono:default', chronoDef],
      ['chrono:chrono_sovereign', chronoMythic],
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
      sig(chronoDef),
      sig(kuroPal),
      `chrono:default(awakened=${awakened}) must not fall back to kuro:default palette`
    );
    assert.notEqual(
      sig(chronoMythic),
      sig(kuroPal),
      `chrono:chrono_sovereign(awakened=${awakened}) must not fall back to kuro:default palette`
    );
    assert.notEqual(
      sig(chronoDef),
      sig(chronoMythic),
      `chrono:default and chrono:chrono_sovereign(awakened=${awakened}) must have distinct palettes`
    );
  }

  // 2. renderStickman structural geometry distinctness between chrono:default & chrono:chrono_sovereign
  const cases: Array<{ tag: string; pose: StickmanRenderOptions['pose']; awakened: boolean; attackProgress?: number }> = [
    { tag: 'normal_idle', pose: 'idle', awakened: false },
    { tag: 'awakened', pose: 'awaken_pose', awakened: true },
    { tag: 'attack_1_normal', pose: 'attack_1', awakened: false, attackProgress: 0.45 },
    { tag: 'attack_1_awakened', pose: 'attack_1', awakened: true, attackProgress: 0.45 },
  ];

  for (const c of cases) {
    const tracesBySkin: Record<'default' | 'chrono_sovereign', ReturnType<typeof extractGeometryMetrics>> = {
      default: { commandCount: 0, subpathCount: 0, closedSubpathCount: 0, totalVertices: 0, opCounts: {}, geometrySignature: '' },
      chrono_sovereign: { commandCount: 0, subpathCount: 0, closedSubpathCount: 0, totalVertices: 0, opCounts: {}, geometrySignature: '' },
    };
    const fullSigs: Array<{ id: string; signature: string }> = [];

    for (const skinId of ['default', 'chrono_sovereign'] as const) {
      const canvas = new MockCanvasElement(800, 650);
      const ctx = canvas.ctx;
      renderStickman(
        ctx as unknown as CanvasRenderingContext2D,
        buildChronoRenderOpts(skinId, {
          pose: c.pose,
          awakened: c.awakened,
          attackProgress: c.attackProgress,
        })
      );

      const label = `R5-R1-02 chrono:${skinId}:${c.tag}`;
      assertDrawTraceValid(ctx.metrics, label);
      assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must return to 0`);
      assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);

      tracesBySkin[skinId] = extractGeometryMetrics(ctx.commands);
      fullSigs.push({ id: `${skinId}:${c.tag}`, signature: ctx.getTraceSignature() });
    }

    assertDistinctSignatures(fullSigs, `R5-R1-02 ${c.tag} color+geometry distinctness`);

    const defGeo = tracesBySkin.default;
    const mythicGeo = tracesBySkin.chrono_sovereign;
    assert.notEqual(
      defGeo.geometrySignature,
      mythicGeo.geometrySignature,
      `R5-R1-02 ${c.tag}: chrono_sovereign must have distinct structural geometry from default (not palette-only swap)`
    );
    assert.ok(
      defGeo.commandCount !== mythicGeo.commandCount ||
        defGeo.subpathCount !== mythicGeo.subpathCount ||
        defGeo.totalVertices !== mythicGeo.totalVertices,
      `R5-R1-02 ${c.tag}: chrono_sovereign must differ in command/subpath/vertex counts (default=${defGeo.commandCount}/${defGeo.subpathCount}/${defGeo.totalVertices}, sovereign=${mythicGeo.commandCount}/${mythicGeo.subpathCount}/${mythicGeo.totalVertices})`
    );
  }

  // 3. Chrono slash trail & swing aura rendering (direct + live Player)
  const trailSigs: Array<{ id: string; signature: string }> = [];
  for (const skinId of ['default', 'chrono_sovereign'] as const) {
    const vfx = getSkinVfxProfile('chrono', skinId);
    const { player, ctx, tap, step } = createTestPlayer('chrono', skinId);
    tap('attack', 1, 1 / 60);
    step(3, 1 / 60);
    assert.ok(player.slashTrails.length > 0, `chrono:${skinId} attack must spawn SlashTrails`);
    for (const tr of player.slashTrails) {
      assert.ok(
        VALID_CHRONO_TRAIL_STYLES.has(String(tr.style)),
        `chrono:${skinId} live trail style="${tr.style}" must be a Chrono trail style`
      );
    }

    const explicitTrail: SlashTrail = {
      x: 340,
      y: GROUND_Y - 56,
      facing: 1,
      radius: 120,
      startAngle: -1.35,
      endAngle: 0.85,
      life: 0.05,
      maxLife: 0.25,
      outerColor: vfx.slashPrimary,
      coreColor: vfx.slashCore,
      thickness: 30,
      style: skinId === 'chrono_sovereign' ? 'chrono_sovereign_slash' : 'chrono_clockwork_slash',
      skinId,
      characterId: 'chrono',
      rimColor: vfx.slashRim,
      secondaryColor: vfx.slashSecondary,
      motif: vfx.motif,
      seed: skinId === 'chrono_sovereign' ? 99 : 42,
    };

    ctx.resetTrace();
    renderSlashTrails(ctx as unknown as CanvasRenderingContext2D, [...player.slashTrails, explicitTrail]);
    const joints = computeStickmanSkeleton('attack_2', 0.22, 0, 'chrono');
    renderAttackSwingAura(
      ctx as unknown as CanvasRenderingContext2D,
      joints,
      buildChronoRenderOpts(skinId, { pose: 'attack_2', awakened: false, attackProgress: 0.45 })
    );
    assertDrawTraceValid(ctx.metrics, `R5-R1-02 chrono:${skinId} trails+aura`);
    assert.equal(ctx.getSaveDepth(), 0, `R5-R1-02 chrono:${skinId} saveDepth must return to 0`);
    assert.ok(ctx.commands.length > 0, `R5-R1-02 chrono:${skinId} expected non-empty trail draw commands`);
    trailSigs.push({ id: `trail:${skinId}`, signature: ctx.getTraceSignature() });
  }
  assertDistinctSignatures(trailSigs, 'R5-R1-02 Chrono default vs sovereign trail+aura');
});

test('R5-R1-03: TitleScreen SSR renders Chrono SVG portrait and both Chrono skins cleanly', () => {
  const chronoSkins = getSkinsForCharacter('chrono');
  assert.equal(chronoSkins.length, 2, 'Chrono must expose exactly 2 skins');

  const baseProps = {
    selectedStageIndex: 0,
    clearedStages: [0, 1],
    onSelectCharacter: () => {},
    onSelectSkin: () => {},
    onSelectStage: () => {},
    onStartMode: () => {},
    onOpenControls: () => {},
    onOpenAudio: () => {},
    onToggleFullscreen: () => {},
    canFullscreen: false,
  };

  const htmlDefault = renderToStaticMarkup(
    React.createElement(TitleScreen, {
      ...baseProps,
      selectedCharacter: 'chrono',
      selectedSkin: 'default',
    })
  );
  const htmlSovereign = renderToStaticMarkup(
    React.createElement(TitleScreen, {
      ...baseProps,
      selectedCharacter: 'chrono',
      selectedSkin: 'chrono_sovereign',
    })
  );
  const htmlZero = renderToStaticMarkup(
    React.createElement(TitleScreen, {
      ...baseProps,
      selectedCharacter: 'zero',
      selectedSkin: 'default',
    })
  );

  assert.ok(htmlDefault.includes('CHRONO'), 'TitleScreen SSR must render CHRONO');
  assert.ok(htmlDefault.includes('Đồng Hồ Sư'), 'TitleScreen SSR must render chrono:default label');
  assert.ok(htmlSovereign.includes('Thần Thời Gian'), 'TitleScreen SSR must render chrono:chrono_sovereign label');
  assert.ok(htmlDefault.includes('<svg'), 'TitleScreen SSR must render SVG portraits');

  // Verify Chrono card has its own dedicated portrait SVG (not falling back to Zero's twin-dagger hood SVG)
  const extractPortraitSvgFor = (html: string, charName: string): string => {
    const marker = `aria-label="Chọn nhân vật ${charName}`;
    const idx = html.indexOf(marker);
    assert.ok(idx >= 0, `Expected button "${marker}" in TitleScreen HTML`);
    const svgStart = html.indexOf('<svg', idx);
    const svgEnd = html.indexOf('</svg>', svgStart);
    return svgStart >= 0 && svgEnd >= 0 ? html.slice(svgStart, svgEnd + 6) : '';
  };

  const chronoSvg = extractPortraitSvgFor(htmlDefault, 'CHRONO');
  const zeroSvg = extractPortraitSvgFor(htmlZero, 'ZERO');
  assert.ok(chronoSvg.length > 50, 'Expected non-trivial Chrono portrait SVG markup');
  assert.ok(chronoSvg.includes('chrono-glow'), 'Expected Chrono portrait SVG to render chrono-glow definition');
  assert.notEqual(
    chronoSvg.replace(/#(?:[0-9a-fA-F]{3,8})/g, '#COL'),
    zeroSvg.replace(/#(?:[0-9a-fA-F]{3,8})/g, '#COL'),
    'Chrono SVG portrait must have dedicated geometry and not fall back to Zero SVG'
  );
});

// =========================================================================
// R2 — [U] TemporalEcho Full Stickman Skeleton & 0.4s Delayed Slash
// =========================================================================

test('R5-R2-01: [U] TemporalEcho records skeleton pose data, renders without ReferenceError, and deals 0.4s delayed slash damage', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('chrono', false);
    session.game.setSkin('default', false);
    session.game.startMode('training', false);

    const internals = getGameInternals(session.game);
    // Stand up from chair & establish clean deterministic placement
    session.tapAction('right', 2, 1 / 60);
    session.stepFrames(5, 1 / 60);

    internals.player.maxHp = 99999;
    internals.player.hp = 99999;
    internals.player.x = 1200;
    internals.player.y = GROUND_Y;
    internals.player.facing = 1;
    internals.player.vx = 0;

    const enemy = new Enemy('heavy_brute', 1280, false);
    enemy.maxHp = 5000;
    enemy.hp = 5000;
    internals.enemies = [enemy];
    const initialHp = enemy.hp;

    // Activate [U] TemporalEcho
    session.tapAction('cryo', 2, 1 / 60);
    session.stepFrames(2, 1 / 60);

    assert.ok(
      Array.isArray(internals.temporalEchoes) && internals.temporalEchoes.length >= 1,
      'Pressing [U] on Chrono must spawn at least 1 active TemporalEcho'
    );
    const echo = internals.temporalEchoes[0];
    assert.equal(typeof echo.x, 'number');
    assert.equal(typeof echo.y, 'number');
    assert.ok(echo.facing === 1 || echo.facing === -1, 'TemporalEcho must record facing');
    assert.ok(
      typeof echo.pose === 'string' && echo.pose.length > 0,
      `TemporalEcho must carry real StickPoseName state, got ${String(echo.pose)}`
    );

    // Wait out cryoCastTimer (0.2s = 12 frames) then swing [J] while TemporalEcho is alive
    session.stepFrames(13, 1 / 60);
    session.ctx.resetTrace();

    // This [J] swing previously threw ReferenceError: ctx is not defined inside simulateStep()!
    session.tapAction('attack', 2, 1 / 60);
    session.stepFrames(8, 1 / 60);

    assertDrawTraceValid(session.ctx.metrics, 'R5-R2-01 TemporalEcho active + attack render');
    assert.equal(session.ctx.getSaveDepth(), 0, 'R5-R2-01 saveDepth must return to 0');
    assert.ok(session.ctx.commands.length > 0, 'R5-R2-01 Game.render() must draw player + TemporalEcho');

    const hpAfterDirectHit = enemy.hp;
    assert.ok(
      hpAfterDirectHit < initialHp,
      `Chrono initial [J] slash must hit enemy (hp=${hpAfterDirectHit}/${initialHp})`
    );

    // Step past 0.4s delayed replay (~0.52s = 31 frames) WITHOUT pressing attack again
    session.ctx.resetTrace();
    session.stepFrames(32, 1 / 60);

    assert.ok(
      enemy.hp < hpAfterDirectHit,
      `TemporalEcho 0.4s delayed follow-up slash must damage enemy (before=${hpAfterDirectHit}, after=${enemy.hp})`
    );
    assertDrawTraceValid(session.ctx.metrics, 'R5-R2-01 TemporalEcho delayed replay render');
    assert.equal(session.ctx.getSaveDepth(), 0);
  } finally {
    session.destroy();
  }
});

// =========================================================================
// R3 — [I] Global Time Stop (3.5s / 4.2s) & Accumulated Damage Detonation
// =========================================================================

test('R5-R3-01: UltimateCutscene.renderTimeStop & headless [I] Time Stop freeze enemies/Boss/projectiles and detonate stored damage', () => {
  installDomShims();

  // 1. Standalone UltimateCutscene.renderTimeStop check across both Chrono skins
  const audio = new AudioEngine();
  const cam = new Camera();
  for (const skinId of ['default', 'chrono_sovereign'] as const) {
    const def = getCharacterDef('chrono', skinId);
    const vfx = getSkinVfxProfile('chrono', skinId);
    const uc = new UltimateCutscene();
    let impactFired = 0;
    uc.start(
      {
        onKanjiImpact: () => {
          impactFired++;
        },
        onComplete: () => {},
      },
      audio,
      {
        characterId: 'chrono',
        skinId,
        kanji: def.ultimateKanji,
        primaryColor: vfx.cutscenePrimary,
        secondaryColor: vfx.cutsceneSecondary,
        bannerTitle: def.ultimateBannerTitle,
      }
    );

    let sawRomanText = false;
    let maxArcOrStrokeCmds = 0;
    for (let f = 0; f < 170; f++) {
      uc.update(1 / 60, audio, cam);
      if (f === 25 || f === 60 || f === 105 || f === 145) {
        const canvas = new MockCanvasElement(1280, 720);
        uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
        assertDrawTraceValid(canvas.ctx.metrics, `R5-R3-01 renderTimeStop ${skinId} frame=${f}`);
        assert.equal(canvas.ctx.getSaveDepth(), 0);
        assert.ok(canvas.ctx.commands.length > 0);
        maxArcOrStrokeCmds = Math.max(maxArcOrStrokeCmds, canvas.ctx.commands.length);
        if (
          canvas.ctx.commands.some(
            (cmd) =>
              (cmd.op === 'fillText' || cmd.op === 'strokeText') &&
              typeof cmd.text === 'string' &&
              /\b(?:XII|III|VI|IX)\b/.test(cmd.text)
          )
        ) {
          sawRomanText = true;
        }
      }
    }
    assert.equal(impactFired, 1, `UltimateCutscene for chrono:${skinId} must fire onKanjiImpact once`);
    assert.equal(sawRomanText, true, `renderTimeStop for chrono:${skinId} must draw Roman clock numerals`);
    assert.ok(maxArcOrStrokeCmds >= 18, `renderTimeStop for chrono:${skinId} must draw rich clockwork geometry, got ${maxArcOrStrokeCmds}`);
  }

  // 2. Headless Game [I] Time Stop: freezes regular Enemy, Boss, and enemy Projectile; renders filter; detonates stored damage
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('chrono', false);
    session.game.setSkin('default', false);
    session.game.startMode('training', false);

    const internals = getGameInternals(session.game);
    session.tapAction('right', 2, 1 / 60);
    session.stepFrames(4, 1 / 60);

    internals.player.maxHp = 99999;
    internals.player.hp = 99999;
    internals.player.x = 1200;
    internals.player.y = GROUND_Y;
    internals.player.facing = 1;
    internals.player.vx = 0;
    internals.player.rage = internals.player.maxRage;

    const regularEnemy = new Enemy('heavy_brute', 1290, false);
    regularEnemy.maxHp = 9000;
    regularEnemy.hp = 9000;

    const boss = new Boss('boss_haiku', 1340);
    boss.maxHp = 9000;
    boss.hp = 9000;

    internals.enemies = [regularEnemy, boss];

    const enemyProj = new Projectile({
      x: 1380,
      y: GROUND_Y - 52,
      vx: -340,
      vy: 0,
      radius: 14,
      damage: 45,
      kind: 'orb',
      fromPlayer: false,
      color: '#ef4444',
      maxLife: 10,
    });
    internals.projectiles.push(enemyProj);

    // Trigger [I] Ultimate
    session.tapAction('ultimate', 2, 1 / 60);

    // Advance past 2.7s cutscene (62 frames * 0.045s = 2.79s), resetting trace periodically
    for (let i = 0; i < 62; i++) {
      session.stepFrames(1, 0.045);
      if (i % 20 === 0) session.ctx.resetTrace();
    }

    assert.ok(
      typeof internals.timeStopTimer === 'number' && internals.timeStopTimer > 2.4 && internals.timeStopTimer <= 3.6,
      `Normal [I] Ultimate must activate ~3.5s timeStopTimer, got ${String(internals.timeStopTimer)}`
    );

    const frozenEnemyX = regularEnemy.x;
    const frozenEnemyY = regularEnemy.y;
    const frozenBossX = boss.x;
    const frozenBossY = boss.y;
    const frozenProjX = enemyProj.x;
    const frozenProjY = enemyProj.y;
    const playerHpAtFreezeStart = internals.player.hp;

    // Step 20 frames (0.90s) while Time Stop is active and confirm complete entity freeze + valid arena filter render
    session.ctx.resetTrace();
    session.stepFrames(20, 0.045);
    assert.ok(internals.timeStopTimer! > 1.5, 'timeStopTimer must still be active after 0.9s');

    assert.equal(regularEnemy.x, frozenEnemyX, 'Regular Enemy X must remain frozen during Time Stop');
    assert.equal(regularEnemy.y, frozenEnemyY, 'Regular Enemy Y must remain frozen during Time Stop');
    assert.equal(boss.x, frozenBossX, 'Boss X must remain frozen during Time Stop');
    assert.equal(boss.y, frozenBossY, 'Boss Y must remain frozen during Time Stop');
    assert.equal(enemyProj.x, frozenProjX, 'Enemy Projectile X must remain frozen during Time Stop');
    assert.equal(enemyProj.y, frozenProjY, 'Enemy Projectile Y must remain frozen during Time Stop');
    assert.equal(enemyProj.active, true, 'Frozen enemy Projectile must remain active in midair');
    assert.equal(internals.player.hp, playerHpAtFreezeStart, 'Frozen enemy Projectile must not damage player');

    assertDrawTraceValid(session.ctx.metrics, 'R5-R3-01 Time Stop arena filter render');
    assert.equal(session.ctx.getSaveDepth(), 0);
    assert.ok(session.ctx.commands.length > 20, 'Expected non-empty Time Stop render commands');

    // Attack Boss & Enemy during Time Stop to accumulate stored damage
    internals.player.x = regularEnemy.x - 55;
    internals.player.facing = 1;
    for (let hit = 0; hit < 2; hit++) {
      session.tapAction('attack', 2, 1 / 60);
      session.stepFrames(12, 1 / 60);
    }
    session.ctx.resetTrace();

    const bossHpBeforeExpiry = boss.hp;
    const enemyHpBeforeExpiry = regularEnemy.hp;
    internals.particles.clear();

    // Step past remaining ~2.4s until timeStopTimer expires and detonates accumulated damage
    for (let i = 0; i < 65; i++) {
      session.stepFrames(1, 0.045);
      if (i % 20 === 0) session.ctx.resetTrace();
    }

    assert.equal(internals.timeStopTimer, 0, 'timeStopTimer must reach 0 after expiry');
    assert.ok(
      regularEnemy.hp < enemyHpBeforeExpiry || boss.hp < bossHpBeforeExpiry,
      `Time Stop expiry must detonate stored Chrono damage (enemy: ${enemyHpBeforeExpiry}->${regularEnemy.hp}, boss: ${bossHpBeforeExpiry}->${boss.hp})`
    );
    const expiryTexts = getActiveParticleTexts(internals.particles);
    assert.ok(
      expiryTexts.length > 0,
      'Time Stop expiry detonation must emit floating detonation callout text'
    );
    assertDrawTraceValid(session.ctx.metrics, 'R5-R3-01 Time Stop expiry detonation');
  } finally {
    session.destroy();
  }

  // 3. Awakened [I] Ultimate grants extended ~4.2s Time Stop duration
  const awSession = createHeadlessGame();
  try {
    awSession.game.setCharacter('chrono', false);
    awSession.game.setSkin('default', false);
    awSession.game.startMode('training', false);

    const awInternals = getGameInternals(awSession.game);
    awInternals.player.awakening = awInternals.player.maxAwakening;
    awSession.tapAction('awaken', 2, 1 / 60);
    awSession.stepFrames(5, 1 / 60);
    assert.equal(awInternals.player.awakened, true, 'Expected Chrono to be Awakened');

    awInternals.player.rage = awInternals.player.maxRage;
    awSession.tapAction('ultimate', 2, 1 / 60);

    // Step 61 frames * 0.045s = 2.745s (cutscene finishes at 2.70s; only ~0.045s elapsed post-cutscene)
    for (let i = 0; i < 61; i++) {
      awSession.stepFrames(1, 0.045);
      if (i % 20 === 0) awSession.ctx.resetTrace();
    }
    assert.ok(
      typeof awInternals.timeStopTimer === 'number' && awInternals.timeStopTimer > 3.6,
      `Awakened [I] Ultimate must set ~4.2s timeStopTimer (> 3.6s), got ${String(awInternals.timeStopTimer)}`
    );
    assertDrawTraceValid(awSession.ctx.metrics, 'R5-R3-01 awakened timeStop');
  } finally {
    awSession.destroy();
  }
});

// =========================================================================
// R4 — Exclusive Ancient Clock Tower Domain (chrono_sovereign only)
// =========================================================================

test('R5-R4-01: chrono:chrono_sovereign Awakening [O] & Ultimate [I] activate Chrono domain, preserve stageTheme, and revert smoothly', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('chrono', false);
    session.game.setSkin('chrono_sovereign', false);
    session.game.setSelectedStage(2, false); // cryo_citadel
    session.game.startMode('story', false);

    const internals = getGameInternals(session.game);
    const initialTheme = internals.bg.getStageTheme();
    assert.equal(typeof internals.bg.getChronoDomainBlend, 'function', 'PeriodicTableBG.getChronoDomainBlend() required');
    assert.equal(typeof internals.bg.getMirageDomainBlend, 'function', 'PeriodicTableBG.getMirageDomainBlend() required');
    assert.equal(typeof internals.bg.getDomainBlend, 'function', 'PeriodicTableBG.getDomainBlend() required');

    internals.player.maxHp = 99999;
    internals.player.hp = 99999;
    internals.player.awakening = internals.player.maxAwakening;
    internals.enemies = [new Enemy('heavy_brute', 1480, false)];
    internals.enemies[0].maxHp = 99999;
    internals.enemies[0].hp = 99999;

    assert.equal(internals.bg.getChronoDomainBlend!(), 0);
    assert.equal(internals.bg.getMirageDomainBlend!(), 0);

    // 1. Trigger Awakening [O]
    session.tapAction('awaken', 2, 1 / 60);
    for (let i = 0; i < 35; i++) {
      session.stepFrames(1, 0.045);
      if (i % 15 === 0) session.ctx.resetTrace();
    }

    assert.equal(internals.player.awakened, true);
    assert.ok(
      internals.bg.getChronoDomainBlend!() > 0.5,
      `chrono:chrono_sovereign Awakening must raise chronoDomainBlend > 0.5, got ${internals.bg.getChronoDomainBlend!()}`
    );
    assert.equal(
      internals.bg.getMirageDomainBlend!(),
      0,
      `chrono:chrono_sovereign must keep mirageDomainBlend === 0, got ${internals.bg.getMirageDomainBlend!()}`
    );
    assert.equal(internals.bg.getStageTheme(), initialTheme, 'Chrono domain must preserve stageTheme');

    const hud = session.getLatestHud() as ReturnType<typeof session.getLatestHud> & {
      domainKind?: string;
    };
    assert.equal(hud.domainActive, true, 'HUD domainActive must be true for chrono:chrono_sovereign');
    assert.equal(hud.domainKind, 'chrono', `HUD domainKind must be 'chrono', got ${String(hud.domainKind)}`);
    assertDrawTraceValid(session.ctx.metrics, 'R5-R4-01 chrono_sovereign awakening domain');

    // 2. Step past 12.5s domain duration + decay (+14.4s = 320 frames at 0.045s), resetting trace periodically
    for (let i = 0; i < 320; i++) {
      session.stepFrames(1, 0.045);
      if (i % 35 === 0) session.ctx.resetTrace();
    }

    assert.ok(
      internals.bg.getChronoDomainBlend!() < 0.08,
      `Chrono domain blend must smoothly decay back near 0 after expiry, got ${internals.bg.getChronoDomainBlend!()}`
    );
    assert.equal(internals.bg.getMirageDomainBlend!(), 0);
    assert.equal(internals.bg.getStageTheme(), initialTheme, 'stageTheme must remain intact after expiry');
    assertDrawTraceValid(session.ctx.metrics, 'R5-R4-01 chrono_sovereign domain reverted');

    // 3. Trigger Rage Ultimate [I] on chrono:chrono_sovereign -> activates Chrono domain again
    internals.player.rage = internals.player.maxRage;
    session.tapAction('ultimate', 2, 1 / 60);
    for (let i = 0; i < 85; i++) {
      session.stepFrames(1, 0.045);
      if (i % 25 === 0) session.ctx.resetTrace();
    }

    assert.ok(
      internals.bg.getChronoDomainBlend!() > 0.5,
      `chrono:chrono_sovereign Ultimate [I] must raise chronoDomainBlend > 0.5, got ${internals.bg.getChronoDomainBlend!()}`
    );
    assert.equal(internals.bg.getMirageDomainBlend!(), 0);
    const ultHud = session.getLatestHud() as ReturnType<typeof session.getLatestHud> & {
      domainKind?: string;
    };
    assert.equal(ultHud.domainKind, 'chrono', `HUD domainKind after Ultimate must be 'chrono', got ${String(ultHud.domainKind)}`);
    assertDrawTraceValid(session.ctx.metrics, 'R5-R4-01 chrono_sovereign ultimate domain');
  } finally {
    session.destroy();
  }
});

test('R5-R4-02: chrono:default NEVER activates Domain Expansion, while mirage:void_shatterer exclusively activates mirage domain', () => {
  // 1. chrono:default Awakening [O] & Ultimate [I] must NOT activate any domain
  const chronoDefSession = createHeadlessGame();
  try {
    chronoDefSession.game.setCharacter('chrono', false);
    chronoDefSession.game.setSkin('default', false);
    chronoDefSession.game.startMode('training', false);

    const internals = getGameInternals(chronoDefSession.game);
    assert.equal(typeof internals.bg.getDomainBlend, 'function');

    chronoDefSession.tapAction('awaken', 2, 1 / 60);
    for (let i = 0; i < 35; i++) {
      chronoDefSession.stepFrames(1, 0.045);
      if (i % 15 === 0) chronoDefSession.ctx.resetTrace();
    }
    assert.equal(internals.player.awakened, true);
    assert.equal(
      internals.bg.getDomainBlend!(),
      0,
      `chrono:default Awakening must keep domainBlend === 0, got ${internals.bg.getDomainBlend!()}`
    );

    internals.player.rage = internals.player.maxRage;
    chronoDefSession.tapAction('ultimate', 2, 1 / 60);
    for (let i = 0; i < 85; i++) {
      chronoDefSession.stepFrames(1, 0.045);
      if (i % 25 === 0) chronoDefSession.ctx.resetTrace();
    }
    assert.equal(
      internals.bg.getDomainBlend!(),
      0,
      `chrono:default Ultimate must keep domainBlend === 0, got ${internals.bg.getDomainBlend!()}`
    );
    assertDrawTraceValid(chronoDefSession.ctx.metrics, 'R5-R4-02 chrono:default no domain');
  } finally {
    chronoDefSession.destroy();
  }

  // 2. mirage:void_shatterer Awakening [O] activates 'mirage' domain (never 'chrono')
  const mirageSession = createHeadlessGame();
  try {
    mirageSession.game.setCharacter('mirage', false);
    mirageSession.game.setSkin('void_shatterer', false);
    mirageSession.game.startMode('training', false);

    const internals = getGameInternals(mirageSession.game);
    assert.equal(typeof internals.bg.getMirageDomainBlend, 'function');
    assert.equal(typeof internals.bg.getChronoDomainBlend, 'function');

    mirageSession.tapAction('awaken', 2, 1 / 60);
    for (let i = 0; i < 35; i++) {
      mirageSession.stepFrames(1, 0.045);
      if (i % 15 === 0) mirageSession.ctx.resetTrace();
    }

    assert.ok(
      internals.bg.getMirageDomainBlend!() > 0.5,
      `mirage:void_shatterer Awakening must raise mirageDomainBlend > 0.5, got ${internals.bg.getMirageDomainBlend!()}`
    );
    assert.equal(
      internals.bg.getChronoDomainBlend!(),
      0,
      `mirage:void_shatterer must keep chronoDomainBlend === 0, got ${internals.bg.getChronoDomainBlend!()}`
    );
    const hud = mirageSession.getLatestHud() as ReturnType<typeof mirageSession.getLatestHud> & {
      domainKind?: string;
    };
    assert.equal(hud.domainKind, 'mirage', `HUD domainKind for mirage:void_shatterer must be 'mirage', got ${String(hud.domainKind)}`);
    assertDrawTraceValid(mirageSession.ctx.metrics, 'R5-R4-02 mirage:void_shatterer exclusive domain');
  } finally {
    mirageSession.destroy();
  }
});

// =========================================================================
// R5 — Static Canvas Safety Scan & PeriodicTableBG Domain State Transitions
// =========================================================================

test('R5-R5-01: Static scan (0 shadowBlur, 0 performance.now in renderer, 0 ${...}XX in src/game) & PeriodicTableBG domain transitions', () => {
  // 1. Static scan
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

  const gameDir = path.join(srcRoot, 'game');
  const gameFiles = listSrcTsFiles(gameDir);
  const hexConcatOffenders: string[] = [];
  for (const file of gameFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\$\{[^}]+\}[0-9a-fA-F]{2}\b/.test(content)) {
      hexConcatOffenders.push(path.relative(PROJECT_ROOT, file));
    }
  }
  assert.deepEqual(
    hexConcatOffenders,
    [],
    `Forbidden \${hex}XX alpha concatenation in src/game/: ${hexConcatOffenders.join(', ')}`
  );

  // 2. PeriodicTableBG domain transitions: none -> chrono -> none -> mirage -> none
  installDomShims();
  const bg = new PeriodicTableBG() as PeriodicTableBG & {
    update: (
      dt: number,
      awakened: boolean,
      domainActive?: boolean | 'none' | 'mirage' | 'chrono',
      domainKind?: 'none' | 'mirage' | 'chrono'
    ) => void;
    getDomainBlend: () => number;
    getMirageDomainBlend: () => number;
    getChronoDomainBlend: () => number;
    getDomainKind: () => 'none' | 'mirage' | 'chrono';
    resetDomain: () => void;
  };
  bg.setStageTheme('sovereign_throne');

  const renderBg = (label: string, awakened: boolean, themeColor: string): string => {
    const canvas = new MockCanvasElement(1280, 720);
    const ctx = canvas.ctx;
    bg.renderScreenBackdrop(ctx as unknown as CanvasRenderingContext2D, 1280, 720, awakened, themeColor);
    bg.renderWorld(ctx as unknown as CanvasRenderingContext2D, 640, GROUND_Y, '#2dd4bf', '#f59e0b');
    assertDrawTraceValid(ctx.metrics, label);
    assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must be 0`);
    assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);
    return ctx.getTraceSignature();
  };

  for (let i = 0; i < 15; i++) bg.update(1 / 60, false, 'none');
  assert.equal(bg.getDomainKind(), 'none');
  const normalSig = renderBg('R5-R5-01 bg none', false, '#f59e0b');

  // none -> chrono
  for (let i = 0; i < 60; i++) bg.update(1 / 30, true, 'chrono');
  assert.ok(bg.getChronoDomainBlend() > 0.7, `Expected chronoDomainBlend > 0.7, got ${bg.getChronoDomainBlend()}`);
  assert.equal(bg.getMirageDomainBlend(), 0);
  assert.equal(bg.getDomainKind(), 'chrono');
  const chronoSig = renderBg('R5-R5-01 bg chrono', true, '#f59e0b');
  assert.notEqual(chronoSig, normalSig, 'Chrono domain PeriodicTableBG render must differ from normal');

  // chrono -> none
  for (let i = 0; i < 120; i++) bg.update(1 / 30, false, 'none');
  assert.ok(bg.getChronoDomainBlend() < 0.05, `Expected chronoDomainBlend < 0.05 after revert, got ${bg.getChronoDomainBlend()}`);
  renderBg('R5-R5-01 bg chrono->none', false, '#f59e0b');

  // none -> mirage (backward-compatible boolean true)
  for (let i = 0; i < 60; i++) bg.update(1 / 30, true, true);
  assert.ok(bg.getMirageDomainBlend() > 0.7, `Expected mirageDomainBlend > 0.7, got ${bg.getMirageDomainBlend()}`);
  assert.ok(bg.getChronoDomainBlend() < 0.05);
  assert.equal(bg.getDomainKind(), 'mirage');
  const mirageSig = renderBg('R5-R5-01 bg mirage', true, '#f43f5e');
  assert.notEqual(mirageSig, chronoSig, 'Mirage domain PeriodicTableBG render must differ distinctly from Chrono domain');

  // mirage -> none
  for (let i = 0; i < 120; i++) bg.update(1 / 30, false, false);
  assert.ok(bg.getDomainBlend() < 0.05, `Expected domainBlend < 0.05 after mirage revert, got ${bg.getDomainBlend()}`);
  renderBg('R5-R5-01 bg mirage->none', false, '#f43f5e');
});
