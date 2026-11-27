import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getAwakenedVisualProfile } from '../../src/game/animation';
import { getCharacterDef } from '../../src/game/characters';
import { BOSS_ROSTER, GROUND_Y, createScarfChain, stepVerletScarf } from '../../src/game/rules';
import { STAGE_THEME_PALETTES } from '../../src/game/stages';
import {
  renderSlashTrails,
  renderStickman,
  type SlashTrail,
  type StickPoseName,
} from '../../src/game/StickmanRenderer';
import { MockCanvasElement, installDomShims } from './helpers/mockCanvas';
import {
  assertDistinctSignatures,
  assertDrawTraceValid,
  assertValidCssHexColor,
} from './helpers/assertions';
import {
  ALL_6_CHARACTERS,
  ALL_8_ENEMY_TYPES,
  ALL_12_BOSS_IDS,
  ALL_12_STAGE_THEMES,
  ALL_18_MOTIFS,
  ALL_18_SKINS,
  PROJECT_ROOT,
  buildR3EightEnemiesPayload,
  buildR3EighteenSkinsPayload,
  buildR3SixCharsNormalVsAwakenedPayload,
  buildR3TwelveBossesPayload,
  createTestBackdrop,
  createTestBoss,
  createTestEnemy,
  createTestPlayer,
  tryLoadSkinVfxModule,
} from './helpers/testHarness';

const KEY_HERO_POSES: StickPoseName[] = ['idle', 'run', 'attack_2', 'parry', 'awaken_pose'];

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

// =========================================================================
// Static Safety & Performance Pattern Audits (R3-STATIC-01 .. R3-STATIC-02)
// =========================================================================

test('R3-STATIC-01: Zero occurrences of shadowBlur across entire src/ directory', () => {
  const srcRoot = path.join(PROJECT_ROOT, 'src');
  const files = listSrcTsFiles(srcRoot);
  assert.ok(files.length > 0, 'Expected TypeScript files under src/');

  const offenders: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\bshadowBlur\b/.test(content)) {
      offenders.push(path.relative(PROJECT_ROOT, file));
    }
  }
  assert.deepEqual(offenders, [], `Forbidden shadowBlur found in: ${offenders.join(', ')}`);
});

test('R3-STATIC-02: Zero per-frame gradient allocations, dead destination-out, or fragile hex-suffix concatenation', () => {
  const rendererFiles = [
    path.join(PROJECT_ROOT, 'src', 'game', 'StickmanRenderer.ts'),
    ...listSrcTsFiles(path.join(PROJECT_ROOT, 'src', 'game', 'renderer')),
  ].filter((f) => fs.existsSync(f));

  const perFrameGradients: string[] = [];
  for (const file of rendererFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/create(?:Linear|Radial)Gradient\s*\(/.test(content)) {
      perFrameGradients.push(path.relative(PROJECT_ROOT, file));
    }
  }
  assert.deepEqual(
    perFrameGradients,
    [],
    `Per-frame create*Gradient inside character/renderer loop in: ${perFrameGradients.join(', ')}`
  );

  const gearFile = path.join(PROJECT_ROOT, 'src', 'game', 'renderer', 'gear.ts');
  const gearSrc = fs.readFileSync(gearFile, 'utf8');
  assert.equal(
    /['"]destination-out['"]/.test(gearSrc),
    false,
    'src/game/renderer/gear.ts must not use dead destination-out composite op'
  );

  const fragileHexSuffixFiles: string[] = [];
  const checkFiles = [
    path.join(PROJECT_ROOT, 'src', 'game', 'PeriodicTableBG.ts'),
    path.join(PROJECT_ROOT, 'src', 'game', 'Entities.ts'),
    path.join(PROJECT_ROOT, 'src', 'game', 'Game.ts'),
  ];
  const hexSuffixRe = /\$\{[^}]+\}(?:[0-9a-fA-F]{2}|`|\$\{)/;
  for (const file of checkFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (hexSuffixRe.test(line) && /(?:addColorStop|fillStyle|strokeStyle)/.test(line)) {
        fragileHexSuffixFiles.push(`${path.relative(PROJECT_ROOT, file)}:${idx + 1}`);
      }
    });
  }
  assert.deepEqual(
    fragileHexSuffixFiles,
    [],
    `Fragile \${color}XX hex-suffix concatenation found at: ${fragileHexSuffixFiles.join(', ')}`
  );
});

// =========================================================================
// R3 Module Interface Contracts (inkStyle.ts & enemyVisuals.ts)
// =========================================================================

test('R3-CONTRACT-01: src/game/renderer/inkStyle.ts exports Ink-Wash primitives & 18-skin palette registry', async () => {
  const rel = ['..', '..', 'src', 'game', 'renderer', 'inkStyle'].join('/');
  let mod: Record<string, unknown>;
  try {
    mod = (await import(rel)) as Record<string, unknown>;
  } catch (err) {
    assert.fail(`Expected M1 src/game/renderer/inkStyle.ts: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const fnName of [
    'getSkinInkPalette',
    'colorWithAlpha',
    'finiteOr',
    'drawInkBrushLimb',
    'drawInkBrushTorso',
    'drawInkHead',
  ]) {
    assert.equal(typeof mod[fnName], 'function', `inkStyle.ts must export ${fnName}()`);
  }

  const colorWithAlpha = mod.colorWithAlpha as (color: string, alpha: number) => string;
  for (const sample of ['#abc', '#38bdf8', '#38bdf8cc', 'rgb(10, 20, 30)', 'rgba(10, 20, 30, 0.5)', 'hsl(290, 80%, 60%)']) {
    const out = colorWithAlpha(sample, 0.45);
    assert.equal(typeof out, 'string');
    assert.ok(!out.includes('NaN') && !out.includes('undefined'), `colorWithAlpha(${sample}) returned ${out}`);
    assert.ok(/^rgba?\(|^#/.test(out), `colorWithAlpha(${sample}) returned invalid CSS color: ${out}`);
  }

  const finiteOr = mod.finiteOr as (v: number | undefined, fb: number) => number;
  assert.equal(finiteOr(NaN, 12), 12);
  assert.equal(finiteOr(Infinity, -5), -5);
  assert.equal(finiteOr(undefined, 7), 7);
  assert.equal(finiteOr(42, 7), 42);

  const getSkinInkPalette = mod.getSkinInkPalette as (
    charId?: string,
    skinId?: string,
    awakened?: boolean
  ) => Record<string, string>;

  const seenPalettes: Array<{ id: string; signature: string }> = [];
  for (const entry of ALL_18_SKINS) {
    for (const awakened of [false, true]) {
      const pal = getSkinInkPalette(entry.characterId, entry.skinId, awakened);
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
      ]) {
        assertValidCssHexColor(pal[key], `${entry.key}(awakened=${awakened}).${key}`);
      }
      if (!awakened) {
        seenPalettes.push({
          id: entry.key,
          signature: [pal.baseFill, pal.shadowFill, pal.rimColor, pal.accentColor, pal.clothPrimary].join('|'),
        });
      }
    }
  }
  assertDistinctSignatures(seenPalettes, 'R3-CONTRACT-01 18-skin Ink palettes');
});

test('R3-CONTRACT-02: src/game/enemyVisuals.ts exports distinct profiles for all 8 mobs (Normal/Elite) and 12 bosses (P1/P2)', async () => {
  const rel = ['..', '..', 'src', 'game', 'enemyVisuals'].join('/');
  let mod: Record<string, unknown>;
  try {
    mod = (await import(rel)) as Record<string, unknown>;
  } catch (err) {
    assert.fail(`Expected M3 src/game/enemyVisuals.ts: ${err instanceof Error ? err.message : String(err)}`);
  }

  assert.equal(typeof mod.getEnemyVisualProfile, 'function', 'enemyVisuals.ts must export getEnemyVisualProfile()');
  const getProfile = mod.getEnemyVisualProfile as (
    type: string,
    isElite?: boolean,
    phase?: 1 | 2
  ) => Record<string, unknown>;

  const mobOutfits: Array<{ id: string; signature: string }> = [];
  for (const enemyType of ALL_8_ENEMY_TYPES) {
    const normal = getProfile(enemyType, false, 1);
    const elite = getProfile(enemyType, true, 1);
    assert.notEqual(normal.outfit, 'none', `${enemyType} must have a dedicated mob outfit`);
    assertValidCssHexColor(normal.bodyColor, `${enemyType}.bodyColor`);
    assertValidCssHexColor(normal.inkOutlineColor, `${enemyType}.inkOutlineColor`);
    assertValidCssHexColor(normal.rimColor, `${enemyType}.rimColor`);
    assertValidCssHexColor(normal.accentColor, `${enemyType}.accentColor`);
    assert.notEqual(
      `${normal.rimColor}|${normal.accentColor}`,
      `${elite.rimColor}|${elite.accentColor}`,
      `${enemyType} elite profile must differ from normal`
    );
    mobOutfits.push({ id: enemyType, signature: String(normal.outfit) });
  }
  assertDistinctSignatures(mobOutfits, 'R3-CONTRACT-02 8 normal enemies distinct outfits');

  const bossOutfits: Array<{ id: string; signature: string }> = [];
  for (const bossId of ALL_12_BOSS_IDS) {
    const p1 = getProfile(bossId, false, 1);
    const p2 = getProfile(bossId, false, 2);
    assert.notEqual(p1.outfit, 'none', `${bossId} must have a dedicated boss outfit`);
    assertValidCssHexColor(p1.bodyColor, `${bossId}.bodyColor`);
    assertValidCssHexColor(p1.rimColor, `${bossId}.rimColor`);
    assertValidCssHexColor(p1.accentColor, `${bossId}.accentColor`);
    assert.ok(
      p2.phase2BodyColor || p2.phase2RimColor || p2.phase2AuraMode || p1.rimColor !== p2.rimColor,
      `${bossId} Phase 2 must carry distinct enrage visual spec`
    );
    bossOutfits.push({ id: bossId, signature: String(p1.outfit) });
  }
  assertDistinctSignatures(bossOutfits, 'R3-CONTRACT-02 12 bosses distinct outfits');
});

// =========================================================================
// Playable Roster: 6 Characters × Normal & Awakened × 18 Skins
// =========================================================================

test('R3-HERO-01: All 6 characters render cleanly in Normal & Awakened across key poses with distinct traces', async () => {
  installDomShims();
  const vfxMod = await tryLoadSkinVfxModule();

  for (const charId of ALL_6_CHARACTERS) {
    const def = getCharacterDef(charId, 'default');
    const vfx = vfxMod ? vfxMod.getSkinVfxProfile(charId, 'default') : null;
    const scarf = createScarfChain(300, GROUND_Y - 66);
    for (let s = 0; s < 6; s++) stepVerletScarf(scarf, 300, GROUND_Y - 66, 1, 0.25, 1 / 60);

    const normalVsAwakened: Array<{ id: string; signature: string }> = [];

    for (const awakened of [false, true]) {
      const awProf = awakened ? getAwakenedVisualProfile(charId, 'default') : null;

      for (const pose of KEY_HERO_POSES) {
        const canvas = new MockCanvasElement(800, 650);
        const ctx = canvas.ctx;
        renderStickman(ctx as unknown as CanvasRenderingContext2D, {
          x: 320,
          y: GROUND_Y,
          facing: 1,
          pose,
          poseTime: 0.26,
          walkPhase: 0.45,
          bodyColor: awakened ? def.awakenedBodyColor : def.bodyColor,
          glowColor: awakened ? (vfx?.impactRingColor ?? def.glowColor) : def.glowColor,
          lineWidth: awakened ? 10.6 : 10.0,
          headRadius: 12.8,
          scarf,
          scarfPrimary: awProf ? awProf.scarfPrimary : def.scarfPrimary,
          scarfHighlight: awProf ? awProf.scarfHighlight : def.scarfHighlight,
          hasSheath: def.hasSheath,
          darkAura: awakened ? def.awakenedAuraStyle : def.auraStyle,
          headGear: def.headGear,
          weapon: awakened ? def.awakenedWeapon : def.weapon,
          awakenedForm: awakened ? charId : null,
          awakened,
          skinId: 'default',
          characterId: charId,
          attackProgress: pose === 'attack_2' ? 0.48 : 0,
          attackAuraColor: vfx?.swingAuraColor ?? def.glowColor,
          attackAuraSecondary: vfx?.swingAuraSecondary ?? def.accentColor,
          vfxMotif: vfx?.motif,
        });

        const label = `R3-HERO-01 ${charId}:${pose}:awakened=${awakened}`;
        assertDrawTraceValid(ctx.metrics, label);
        assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must return to 0`);
        assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);

        if (pose === 'idle') {
          normalVsAwakened.push({
            id: `${charId}:${awakened ? 'awakened' : 'normal'}`,
            signature: ctx.getTraceSignature(),
          });
        }
      }
    }

    assertDistinctSignatures(normalVsAwakened, `R3-HERO-01 ${charId} Normal vs Awakened`);
  }
});

test('R3-HERO-02: All 18 skins render cleanly across key poses (Normal & Awakened) with distinct traces', async () => {
  installDomShims();
  const vfxMod = await tryLoadSkinVfxModule();
  const skinSignatures: Array<{ id: string; signature: string }> = [];

  for (const entry of ALL_18_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const vfx = vfxMod ? vfxMod.getSkinVfxProfile(entry.characterId, entry.skinId) : null;
    const scarf = createScarfChain(300, GROUND_Y - 66);

    for (const awakened of [false, true]) {
      const awProf = awakened ? getAwakenedVisualProfile(entry.characterId, entry.skinId) : null;
      for (const pose of KEY_HERO_POSES) {
        const canvas = new MockCanvasElement(800, 650);
        const ctx = canvas.ctx;
        renderStickman(ctx as unknown as CanvasRenderingContext2D, {
          x: 320,
          y: GROUND_Y,
          facing: 1,
          pose,
          poseTime: 0.25,
          walkPhase: 0.4,
          bodyColor: awakened ? def.awakenedBodyColor : def.bodyColor,
          glowColor: awakened ? (vfx?.impactRingColor ?? def.glowColor) : def.glowColor,
          lineWidth: awakened ? 10.6 : 10.2,
          headRadius: 12.8,
          scarf,
          scarfPrimary: awProf ? awProf.scarfPrimary : def.scarfPrimary,
          scarfHighlight: awProf ? awProf.scarfHighlight : def.scarfHighlight,
          hasSheath: def.hasSheath,
          darkAura: awakened ? def.awakenedAuraStyle : def.auraStyle,
          headGear: def.headGear,
          weapon: awakened ? def.awakenedWeapon : def.weapon,
          awakenedForm: awakened ? entry.characterId : null,
          awakened,
          skinId: entry.skinId,
          characterId: entry.characterId,
          attackProgress: pose === 'attack_2' ? 0.45 : 0,
          attackAuraColor: vfx?.swingAuraColor ?? def.glowColor,
          attackAuraSecondary: vfx?.swingAuraSecondary ?? def.accentColor,
          vfxMotif: vfx?.motif,
        });

        const label = `R3-HERO-02 ${entry.key}:${pose}:awakened=${awakened}`;
        assertDrawTraceValid(ctx.metrics, label);
        assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must return to 0`);
        assert.ok(ctx.commands.length > 0, `${label}: expected non-empty draw commands`);

        if (!awakened && pose === 'attack_2') {
          skinSignatures.push({ id: entry.key, signature: ctx.getTraceSignature() });
        }
      }
    }
  }

  assertDistinctSignatures(skinSignatures, 'R3-HERO-02 18-skin stickman render signatures');
});

test('R3-HERO-03: Live Player.render() across all 18 skins (Normal & Awakened) produces valid distinct traces', () => {
  const liveSignatures: Array<{ id: string; signature: string }> = [];

  for (const entry of ALL_18_SKINS) {
    const { player, ctx, input, step, tap } = createTestPlayer(entry.characterId, entry.skinId);

    // Stand up from chair & run + attack + parry
    input.setVirtualAction('right', true);
    step(10, 1 / 60);
    input.setVirtualAction('right', false);
    tap('attack', 2, 1 / 60);
    step(3, 1 / 60);

    ctx.resetTrace();
    player.render(ctx as unknown as CanvasRenderingContext2D);
    assertDrawTraceValid(ctx.metrics, `R3-HERO-03 ${entry.key} live attack`);
    assert.equal(ctx.getSaveDepth(), 0, `R3-HERO-03 ${entry.key} live attack saveDepth`);
    assert.ok(ctx.commands.length > 0, `R3-HERO-03 ${entry.key} live attack commands`);
    liveSignatures.push({ id: entry.key, signature: ctx.getTraceSignature() });

    // Parry state
    tap('parry', 1, 1 / 60);
    step(1, 1 / 60);
    ctx.resetTrace();
    player.render(ctx as unknown as CanvasRenderingContext2D);
    assertDrawTraceValid(ctx.metrics, `R3-HERO-03 ${entry.key} live parry`);
    assert.equal(ctx.getSaveDepth(), 0, `R3-HERO-03 ${entry.key} live parry saveDepth`);

    // Awakened live render
    player.awakened = true;
    player.awakenTimer = 10;
    player.awakenPoseTimer = 0.25;
    step(2, 1 / 60);
    ctx.resetTrace();
    player.render(ctx as unknown as CanvasRenderingContext2D);
    assertDrawTraceValid(ctx.metrics, `R3-HERO-03 ${entry.key} live awakened`);
    assert.equal(ctx.getSaveDepth(), 0, `R3-HERO-03 ${entry.key} live awakened saveDepth`);
    assert.ok(ctx.commands.length > 0, `R3-HERO-03 ${entry.key} live awakened commands`);
  }

  assertDistinctSignatures(liveSignatures, 'R3-HERO-03 18 skins live Player.render()');
});

test('R3-HERO-04: renderStickman handles NaN/Infinity inputs without NaN Canvas commands or save/restore leaks', () => {
  installDomShims();
  for (const charId of ALL_6_CHARACTERS) {
    const def = getCharacterDef(charId, 'default');
    const canvas = new MockCanvasElement(800, 650);
    const ctx = canvas.ctx;
    renderStickman(ctx as unknown as CanvasRenderingContext2D, {
      x: 320,
      y: GROUND_Y,
      facing: 1,
      pose: 'attack_2',
      poseTime: Number.NaN,
      walkPhase: Number.POSITIVE_INFINITY,
      scaleX: Number.NaN,
      scaleY: Number.NEGATIVE_INFINITY,
      bodyColor: def.bodyColor,
      glowColor: def.glowColor,
      characterId: charId,
      skinId: 'default',
      weapon: def.weapon,
      headGear: def.headGear,
      attackProgress: Number.NaN,
    });
    assertDrawTraceValid(ctx.metrics, `R3-HERO-04 ${charId} finite guard`);
    assert.equal(ctx.getSaveDepth(), 0, `R3-HERO-04 ${charId} saveDepth`);
  }
});

test('R3-HERO-05: All 18 SlashVfxMotifs render distinct slash trail signatures with characterId routing', async () => {
  installDomShims();
  const vfxMod = await tryLoadSkinVfxModule();
  const trailSigs: Array<{ id: string; signature: string }> = [];

  for (const entry of ALL_18_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const vfx = vfxMod ? vfxMod.getSkinVfxProfile(entry.characterId, entry.skinId) : null;
    const motif = vfx?.motif ?? ALL_18_MOTIFS[entry.index - 1];
    const canvas = new MockCanvasElement(640, 480);
    const ctx = canvas.ctx;

    const trail: SlashTrail = {
      x: 260,
      y: 260,
      facing: 1,
      radius: 120,
      startAngle: -1.4,
      endAngle: 0.9,
      life: 0.05,
      maxLife: 0.24,
      outerColor: vfx?.slashPrimary ?? def.slashColors[0],
      coreColor: vfx?.slashCore ?? '#ffffff',
      thickness: 30,
      style: 'arc',
      skinId: entry.skinId,
      characterId: entry.characterId,
      rimColor: vfx?.slashRim ?? def.slashColors[1],
      secondaryColor: vfx?.slashSecondary ?? def.accentColor,
      motif,
      seed: entry.index * 13,
    };

    renderSlashTrails(ctx as unknown as CanvasRenderingContext2D, [trail]);
    assertDrawTraceValid(ctx.metrics, `R3-HERO-05 ${entry.key} motif=${motif}`);
    assert.equal(ctx.getSaveDepth(), 0);
    assert.ok(ctx.commands.length > 0, `R3-HERO-05 ${entry.key} empty trail`);
    trailSigs.push({ id: `${entry.key}:${motif}`, signature: ctx.getTraceSignature() });
  }

  assertDistinctSignatures(trailSigs, 'R3-HERO-05 all 18 SlashVfxMotif trail traces');
});

// =========================================================================
// Enemies: 8 Enemy Types × Normal & Elite (R3-ENEMY-01 .. R3-ENEMY-02)
// =========================================================================

test('R3-ENEMY-01: All 8 EnemyTypes render cleanly as Normal & Elite across states with distinct traces', () => {
  installDomShims();
  const normalSignatures: Array<{ id: string; signature: string }> = [];

  for (const enemyType of ALL_8_ENEMY_TYPES) {
    const pairSigs: Array<{ id: string; signature: string }> = [];

    for (const isElite of [false, true]) {
      const states: Array<{
        tag: string;
        attackPhase: 'none' | 'windup' | 'active';
        vx?: number;
        hurtTimer?: number;
        stunTimer?: number;
        silhouette?: boolean;
        whiteFlash?: boolean;
      }> = [
        { tag: 'idle', attackPhase: 'none', vx: 0 },
        { tag: 'windup', attackPhase: 'windup', vx: 0 },
        { tag: 'active', attackPhase: 'active', vx: 120 },
        { tag: 'hurt', attackPhase: 'none', hurtTimer: 0.2 },
        { tag: 'stunned', attackPhase: 'none', stunTimer: 1.0 },
        { tag: 'silhouette', attackPhase: 'active', silhouette: true },
        { tag: 'whiteFlash', attackPhase: 'active', whiteFlash: true },
      ];

      for (const st of states) {
        const canvas = new MockCanvasElement(800, 650);
        const ctx = canvas.ctx;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        const enemy = createTestEnemy(enemyType, {
          isElite,
          x: 340,
          y: GROUND_Y,
          facing: -1,
          poseTime: 0.25,
          attackPhase: st.attackPhase,
          attackTimer: 0.22,
          vx: st.vx ?? 0,
          hurtTimer: st.hurtTimer ?? 0,
          stunTimer: st.stunTimer ?? 0,
        });

        enemy.render(
          ctx as unknown as CanvasRenderingContext2D,
          Boolean(st.silhouette),
          Boolean(st.whiteFlash)
        );

        const label = `R3-ENEMY-01 ${enemyType}:elite=${isElite}:${st.tag}`;
        assertDrawTraceValid(ctx.metrics, label);
        assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must be 0`);
        assert.ok(ctx.commands.length > 0, `${label}: expected non-empty commands`);

        if (st.tag === 'active') {
          assert.equal(ctx.font, '12px monospace', `${label}: leaked ctx.font state`);
          assert.equal(ctx.textAlign, 'left', `${label}: leaked ctx.textAlign state`);
          pairSigs.push({ id: `${enemyType}:${isElite ? 'elite' : 'normal'}`, signature: ctx.getTraceSignature() });
          if (!isElite) {
            normalSignatures.push({ id: enemyType, signature: ctx.getTraceSignature() });
          }
        }
      }
    }

    assertDistinctSignatures(pairSigs, `R3-ENEMY-01 ${enemyType} Normal vs Elite`);
  }

  assertDistinctSignatures(normalSignatures, 'R3-ENEMY-01 8 distinct normal enemy renders');
});

test('R3-ENEMY-02: Enemy.render clamps boundary HP ratios and renders ElementalMark safely', () => {
  installDomShims();
  const canvas = new MockCanvasElement(800, 650);
  const ctx = canvas.ctx;
  const enemy = createTestEnemy('shield_guard', { isElite: true, x: 340, y: GROUND_Y });
  enemy.hp = -25;
  enemy.maxHp = 0;
  enemy.markKind = 'kuro';
  enemy.markStacks = 3;
  enemy.markTimer = 2.0;

  enemy.render(ctx as unknown as CanvasRenderingContext2D);
  assertDrawTraceValid(ctx.metrics, 'R3-ENEMY-02 boundary hp & mark');
  assert.equal(ctx.getSaveDepth(), 0);
  const rectCmds = ctx.commands.filter((c) => c.op === 'fillRect');
  for (const rc of rectCmds) {
    assert.ok(rc.rectPts && rc.rectPts.length === 4);
    const xs = rc.rectPts.map((p) => p[0]);
    const w = Math.max(...xs) - Math.min(...xs);
    assert.ok(w >= 0 && w <= 60, `HP bar width out of clamped bounds: ${w}`);
  }
});

// =========================================================================
// Bosses: 12 Bosses × Phase 1 & Phase 2 (R3-BOSS-01 .. R3-BOSS-02)
// =========================================================================

test('R3-BOSS-01: All 12 BOSS_ORDER bosses render cleanly at Phase 1 & Phase 2 with distinct traces', () => {
  installDomShims();
  const crossBossP1Sigs: Array<{ id: string; signature: string }> = [];
  const crossBossP2Sigs: Array<{ id: string; signature: string }> = [];

  for (const bossId of ALL_12_BOSS_IDS) {
    const p1VsP2: Array<{ id: string; signature: string }> = [];

    for (const phase of [1, 2] as const) {
      const states: Array<{
        tag: string;
        attackPhase: 'none' | 'windup' | 'active';
        staggerTimer?: number;
        silhouette?: boolean;
        whiteFlash?: boolean;
      }> = [
        { tag: 'idle', attackPhase: 'none' },
        { tag: 'windup', attackPhase: 'windup' },
        { tag: 'active', attackPhase: 'active' },
        { tag: 'staggered', attackPhase: 'none', staggerTimer: 1.2 },
        { tag: 'silhouette', attackPhase: 'active', silhouette: true },
        { tag: 'whiteFlash', attackPhase: 'active', whiteFlash: true },
      ];

      for (const st of states) {
        const canvas = new MockCanvasElement(960, 650);
        const ctx = canvas.ctx;
        const boss = createTestBoss(bossId, {
          phase,
          x: 420,
          facing: -1,
          poseTime: 0.25,
          floatTime: 0.45,
          attackPhase: st.attackPhase,
          attackTimer: 0.24,
          staggerTimer: st.staggerTimer ?? 0,
        });

        assert.equal(boss.maxHp, BOSS_ROSTER[bossId].maxHp, `${bossId} maxHp invariant`);
        boss.render(
          ctx as unknown as CanvasRenderingContext2D,
          Boolean(st.silhouette),
          Boolean(st.whiteFlash)
        );

        const label = `R3-BOSS-01 ${bossId}:P${phase}:${st.tag}`;
        assertDrawTraceValid(ctx.metrics, label);
        assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must be 0`);
        assert.ok(ctx.commands.length > 0, `${label}: expected non-empty commands`);

        if (st.tag === 'active') {
          const sig = ctx.getTraceSignature();
          p1VsP2.push({ id: `${bossId}:P${phase}`, signature: sig });
          if (phase === 1) crossBossP1Sigs.push({ id: bossId, signature: sig });
          else crossBossP2Sigs.push({ id: bossId, signature: sig });
        }
      }
    }

    assertDistinctSignatures(p1VsP2, `R3-BOSS-01 ${bossId} Phase 1 vs Phase 2`);
  }

  assertDistinctSignatures(crossBossP1Sigs, 'R3-BOSS-01 all 12 bosses Phase 1 distinctness');
  assertDistinctSignatures(crossBossP2Sigs, 'R3-BOSS-01 all 12 bosses Phase 2 distinctness');
});

test('R3-BOSS-02: Boss Sol windup clamps telegraph alpha cleanly when attackTimer exceeds 0.64 or is negative', () => {
  installDomShims();
  for (const t of [-0.2, 0.2, 0.95]) {
    const canvas = new MockCanvasElement(960, 650);
    const ctx = canvas.ctx;
    const sol = createTestBoss('boss_sol', {
      phase: 2,
      x: 420,
      attackPhase: 'windup',
      attackTimer: t,
    });
    sol.render(ctx as unknown as CanvasRenderingContext2D);
    assertDrawTraceValid(ctx.metrics, `R3-BOSS-02 sol windup t=${t}`);
    for (const cmd of ctx.commands) {
      if (typeof cmd.style === 'string' && cmd.style.startsWith('rgba(')) {
        const m = /rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.+-]+)\s*\)/.exec(cmd.style);
        if (m) {
          const a = Number(m[1]);
          assert.ok(Number.isFinite(a) && a >= 0 && a <= 1, `Invalid rgba alpha ${a} in ${cmd.style}`);
        }
      }
    }
  }
});

// =========================================================================
// Stage Backdrops: All 12 StageThemeIds (Normal & Awakened) (R3-STAGE-01)
// =========================================================================

test('R3-STAGE-01: PeriodicTableBG renders all 12 StageThemeIds (Normal & Awakened) cleanly with valid colors', () => {
  installDomShims();
  assert.equal(ALL_12_STAGE_THEMES.length, 12);

  for (const theme of ALL_12_STAGE_THEMES) {
    const pal = STAGE_THEME_PALETTES[theme];
    assert.ok(pal, `Missing STAGE_THEME_PALETTES[${theme}]`);

    for (const awakened of [false, true]) {
      for (const themeColor of ['#ef4444', 'hsl(295, 85%, 62%)']) {
        const canvas = new MockCanvasElement(1280, 720);
        const ctx = canvas.ctx;
        const bg = createTestBackdrop(theme, { awakened });

        bg.renderScreenBackdrop(ctx as unknown as CanvasRenderingContext2D, 1280, 720, awakened, themeColor);
        bg.renderWorld(ctx as unknown as CanvasRenderingContext2D, 640, GROUND_Y, awakened, themeColor);

        const label = `R3-STAGE-01 ${theme}:awakened=${awakened}:col=${themeColor}`;
        assertDrawTraceValid(ctx.metrics, label);
        assert.equal(ctx.getSaveDepth(), 0, `${label}: saveDepth must be 0`);
        assert.ok(ctx.commands.length > 0, `${label}: expected non-empty backdrop draw commands`);

        for (const col of ctx.metrics.uniqueColors) {
          assert.ok(
            !/^hsl\([^)]+\)[0-9a-f]{2}$/i.test(col) && !/^#[0-9a-f]{3}[0-9a-f]{2}$/i.test(col),
            `${label}: invalid concatenated color "${col}"`
          );
        }
      }
    }
  }
});

// =========================================================================
// Trace Export & Pillow Contact-Sheet Generation (R3-VISUAL-01)
// =========================================================================

test('R3-VISUAL-01: Export 4 R3 trace JSONs and verify Pillow contact sheets & contrast/MAE metrics', () => {
  const renderDir = process.env.R3_RENDER_DIR || process.env.STICKMAN_RENDER_R3_DIR || '';
  if (!renderDir) {
    return;
  }

  fs.mkdirSync(renderDir, { recursive: true });
  const nomedia = path.join(renderDir, '.nomedia');
  if (!fs.existsSync(nomedia)) {
    fs.writeFileSync(nomedia, '');
  }

  const vfxModSyncPromise = tryLoadSkinVfxModule();
  // Synchronously resolve? node:test supports async test functions; convert cleanly:
  return vfxModSyncPromise.then((vfxMod) => {
    const s1 = buildR3SixCharsNormalVsAwakenedPayload(vfxMod);
    const s2 = buildR3EighteenSkinsPayload(vfxMod);
    const s3 = buildR3EightEnemiesPayload();
    const s4 = buildR3TwelveBossesPayload();

    for (const [name, sheet] of [
      ['6chars_normal_vs_awakened.json', s1],
      ['18_skins.json', s2],
      ['8_enemies_normal_vs_elite.json', s3],
      ['12_bosses_p1_vs_p2.json', s4],
    ] as const) {
      for (const t of sheet.traces) {
        assertDrawTraceValid(t.ctx.metrics, `R3-VISUAL-01 ${name}:${t.key}`);
        assert.equal(t.ctx.getSaveDepth(), 0, `R3-VISUAL-01 ${name}:${t.key} saveDepth`);
      }
      fs.writeFileSync(path.join(renderDir, name), JSON.stringify(sheet.payload));
    }

    const pyScript = path.join(PROJECT_ROOT, 'tests', 'e2e', 'render-r3-sheet.py');
    const res = spawnSync(
      'python3',
      [pyScript, '--input-dir', renderDir, '--out-dir', renderDir],
      { cwd: PROJECT_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    );

    const metricsPath = path.join(renderDir, 'r3_metrics.json');
    assert.ok(fs.existsSync(metricsPath), `Expected r3_metrics.json at ${metricsPath}. stderr=${res.stderr}`);
    for (const png of [
      'r3_6chars_normal_vs_awakened.png',
      'r3_18_skins_sheet.png',
      'r3_8_enemies_normal_vs_elite.png',
      'r3_12_bosses_p1_vs_p2.png',
    ]) {
      const p = path.join(renderDir, png);
      assert.ok(fs.existsSync(p) && fs.statSync(p).size > 1024, `Expected non-empty PNG ${p}`);
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8')) as {
      ok: boolean;
      blank_cells: string[];
      nan_cells: string[];
      shadow_blur_cells: string[];
      unbalanced_save_restore: string[];
      low_contrast_cells: Array<{ key: string; sheet: string; luma_spread: number }>;
      low_mae_pairs: Array<{ sheet: string; mae: number }>;
    };

    assert.deepEqual(metrics.nan_cells, [], `NaN cells: ${metrics.nan_cells.join(', ')}`);
    assert.deepEqual(metrics.shadow_blur_cells, [], `shadowBlur cells: ${metrics.shadow_blur_cells.join(', ')}`);
    assert.deepEqual(metrics.unbalanced_save_restore, [], `Unbalanced save/restore: ${metrics.unbalanced_save_restore.join(', ')}`);
    assert.deepEqual(metrics.blank_cells, [], `Blank cells: ${metrics.blank_cells.join(', ')}`);
    assert.deepEqual(
      metrics.low_contrast_cells,
      [],
      `Low ink-wash contrast cells: ${JSON.stringify(metrics.low_contrast_cells)}`
    );
    assert.deepEqual(
      metrics.low_mae_pairs,
      [],
      `Insufficient visual distinction (MAE <= 1.2): ${JSON.stringify(metrics.low_mae_pairs)}`
    );
    assert.equal(res.status, 0, `render-r3-sheet.py failed (exit ${res.status}): ${res.stdout}\n${res.stderr}`);
    assert.equal(metrics.ok, true, 'r3_metrics.json ok must be true');
  });
});
