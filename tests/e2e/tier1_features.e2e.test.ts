import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHARACTER_ORDER, getCharacterDef, getSkinsForCharacter } from '../../src/game/characters';
import { ParticleSystem } from '../../src/game/ParticleSystem';
import { Player } from '../../src/game/Player';
import {
  renderSlashTrails,
  renderStickman,
  type SlashTrail,
  type StickmanRenderOptions,
} from '../../src/game/StickmanRenderer';
import { UltimateCutscene } from '../../src/game/UltimateCutscene';
import { IceWall, MagmaPillar, Projectile } from '../../src/game/Entities';
import { AudioEngine } from '../../src/game/AudioEngine';
import { Camera } from '../../src/game/Camera';
import { GROUND_Y } from '../../src/game/rules';
import { TitleScreen } from '../../src/components/TitleScreen';
import { MockCanvasElement, installDomShims } from './helpers/mockCanvas';
import {
  assertDistinctSignatures,
  assertDrawTraceValid,
  assertUniqueTuples,
  assertValidCssHexColor,
} from './helpers/assertions';
import {
  ALL_12_SKINS,
  ALL_18_MOTIFS,
  ALL_18_SKINS,
  ALL_22_MOTIFS,
  ALL_22_SKINS,
  PROJECT_ROOT,
  createHeadlessGame,
  createTestPlayer,
  loadSkinVfxModule,
} from './helpers/testHarness';

// =========================================================================
// F1: 22-Skin Unique VFX Registry (T1-F1-01 .. T1-F1-06)
// =========================================================================

test('T1-F1-01: listAllSkinVfxProfiles returns all 22 (CharacterId, SkinId) profiles', async () => {
  const mod = await loadSkinVfxModule();
  const profiles = mod.listAllSkinVfxProfiles();
  assert.equal(profiles.length, 22);
  const expectedKeys = new Set(ALL_22_SKINS.map((s) => s.key));
  const actualKeys = new Set(profiles.map((p) => `${p.characterId}:${p.skinId}`));
  assert.deepEqual(actualKeys, expectedKeys);
});

test('T1-F1-02: every SkinVfxProfile profileId matches ${characterId}:${skinId} and is unique across all 22 skins', async () => {
  const mod = await loadSkinVfxModule();
  const profiles = mod.listAllSkinVfxProfiles();
  const ids = new Set<string>();
  for (const p of profiles) {
    assert.equal(p.profileId, `${p.characterId}:${p.skinId}`);
    assert.equal(mod.getSkinVfxKey(p.characterId, p.skinId), p.profileId);
    ids.add(p.profileId);
  }
  assert.equal(ids.size, 22);
});

test('T1-F1-03: Programmatic Uniqueness Gate — no two skins share the same visual VFX tuple', async () => {
  const mod = await loadSkinVfxModule();
  const profiles = mod.listAllSkinVfxProfiles();
  assertUniqueTuples(
    profiles.map((p) => ({
      id: p.profileId,
      tupleKey: [
        p.motif,
        p.slashPrimary,
        p.slashSecondary,
        p.slashRim,
        p.swingAuraColor,
        p.particlePrimary,
        p.swingParticleKind,
        p.projectileTheme,
      ].join('|'),
    })),
    'T1-F1-03 visual VFX uniqueness'
  );
});

test('T1-F1-04: CHARACTER_SKINS slashColors have 0 collisions across all 18 skins', async () => {
  const tuples = ALL_18_SKINS.map((s) => {
    const def = getCharacterDef(s.characterId, s.skinId);
    return {
      id: s.key,
      tupleKey: `${def.slashColors[0].toLowerCase()}|${def.slashColors[1].toLowerCase()}`,
    };
  });
  assertUniqueTuples(tuples, 'T1-F1-04 CHARACTER_SKINS slashColors');
});

test('T1-F1-05: getSkinVfxProfile returns valid CSS hex colors on all 18 profiles', async () => {
  const mod = await loadSkinVfxModule();
  for (const entry of ALL_18_SKINS) {
    const p = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    assert.equal(p.profileId, entry.key);
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
      assertValidCssHexColor(p[field], `${entry.key}.${field}`);
    }
  }
});

test('T1-F1-06: all 22 SlashVfxMotif values form a 1-to-1 bijection across the 22 profiles', async () => {
  const mod = await loadSkinVfxModule();
  const profiles = mod.listAllSkinVfxProfiles();
  const seen = new Set(profiles.map((p) => p.motif));
  assert.equal(seen.size, 22);
  for (const motif of ALL_22_MOTIFS) {
    assert.ok(seen.has(motif), `Missing motif ${motif}`);
  }
});

// =========================================================================
// F2: Pooled Skin Particle Kinds (T1-F2-01 .. T1-F2-05)
// =========================================================================

test('T1-F2-01: ParticleSystem exposes getPoolCapacity() === 720 and getActiveCount() === 0 initially', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getPoolCapacity?: () => number;
    getActiveCount?: () => number;
  };
  assert.equal(typeof ps.getPoolCapacity, 'function', 'ParticleSystem.getPoolCapacity() required (M1)');
  assert.equal(typeof ps.getActiveCount, 'function', 'ParticleSystem.getActiveCount() required (M1)');
  assert.equal(ps.getPoolCapacity!(), 720);
  assert.equal(ps.getActiveCount!(), 0);
});

test('T1-F2-02: new skin particle emitters (feather, petal, star, shard, ink_splatter) emit and render draw calls', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getActiveCount?: () => number;
    emitFeathers?: (x: number, y: number, count: number, color: string, spread?: number, scale?: number) => void;
    emitPetals?: (x: number, y: number, count: number, color: string, spread?: number, scale?: number) => void;
    emitStars?: (x: number, y: number, count: number, color: string, spread?: number, scale?: number) => void;
    emitShards?: (x: number, y: number, count: number, color: string, spread?: number, scale?: number) => void;
    emitInkSplatter?: (x: number, y: number, count: number, color: string, spread?: number, scale?: number) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  const emitters = [
    ['emitFeathers', '#fde047'],
    ['emitPetals', '#f43f5e'],
    ['emitStars', '#7dd3fc'],
    ['emitShards', '#67e8f9'],
    ['emitInkSplatter', '#c084fc'],
  ] as const;

  let expectedActive = 0;
  for (const [name, color] of emitters) {
    const fn = ps[name];
    assert.equal(typeof fn, 'function', `ParticleSystem.${name} required (M1)`);
    fn!.call(ps, 400, 300, 4, color);
    expectedActive += 4;
    assert.equal(ps.getActiveCount!(), expectedActive);
  }

  const canvas = new MockCanvasElement(800, 600);
  ps.render(canvas.getContext('2d')!);
  assert.ok(canvas.ctx.commands.length >= 5, 'Expected rendered draw commands for new particle kinds');
  assertDrawTraceValid(canvas.ctx.metrics, 'T1-F2-02 particles');
});

test('T1-F2-03: all 5 new particle kinds expire cleanly to 0 within 1.0s', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getActiveCount?: () => number;
    emitFeathers?: (x: number, y: number, count: number, color: string) => void;
    emitPetals?: (x: number, y: number, count: number, color: string) => void;
    emitStars?: (x: number, y: number, count: number, color: string) => void;
    emitShards?: (x: number, y: number, count: number, color: string) => void;
    emitInkSplatter?: (x: number, y: number, count: number, color: string) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitFeathers, 'function', 'emitFeathers required (M1)');
  ps.emitFeathers!(200, 200, 5, '#fde047');
  ps.emitPetals!(200, 200, 5, '#fb7185');
  ps.emitStars!(200, 200, 5, '#fef08a');
  ps.emitShards!(200, 200, 5, '#38bdf8');
  ps.emitInkSplatter!(200, 200, 5, '#a855f7');
  assert.equal(ps.getActiveCount!(), 25);

  for (let i = 0; i < 10; i++) {
    ps.update(0.1);
  }
  assert.equal(ps.getActiveCount!(), 0);
});

test('T1-F2-04: legacy particle kinds continue emitting, rendering, and expiring cleanly', () => {
  const ps = new ParticleSystem() as ParticleSystem & { getActiveCount?: () => number };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  ps.emitSparks(300, 300, 3, '#fef08a');
  ps.emitSmoke(300, 300, 2, '#f8fafc');
  ps.emitIceShards(300, 300, 2, 1);
  ps.emitLightning(300, 300, '#c084fc', 32);
  ps.emitEmbers(300, 300, 2, '#ef4444');
  ps.emitShockwave(300, 300, '#38bdf8', 80, 0.25);
  ps.emitGroundCrack(300, 48, '#0b0c10');
  ps.emitSlashBeam(300, 300, 0.3, 180, '#ef4444', 10);
  ps.emitChainArc(200, 300, 400, 320, '#38bdf8', 4);
  ps.emitText(300, 260, 'PARRY!', '#ffffff', 22);
  assert.ok(ps.getActiveCount!() >= 14);

  const canvas = new MockCanvasElement(800, 600);
  ps.render(canvas.getContext('2d')!);
  assert.ok(canvas.ctx.commands.length >= 10);
  assertDrawTraceValid(canvas.ctx.metrics, 'T1-F2-04 legacy particles');

  for (let i = 0; i < 30; i++) ps.update(0.1);
  assert.equal(ps.getActiveCount!(), 0);
});

test('T1-F2-05: ParticleSystem.clear() immediately resets getActiveCount() to 0', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getActiveCount?: () => number;
    emitFeathers?: (x: number, y: number, count: number, color: string) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitFeathers, 'function', 'emitFeathers required (M1)');
  ps.emitFeathers!(100, 100, 12, '#facc15');
  ps.emitSparks(100, 100, 12, '#ffffff');
  assert.equal(ps.getActiveCount!(), 24);
  ps.clear();
  assert.equal(ps.getActiveCount!(), 0);
});

// =========================================================================
// F3: Per-Skin Slash Trails & 12 Motifs (T1-F3-01 .. T1-F3-05)
// =========================================================================

test('T1-F3-01: renderSlashTrails renders all 12 SlashVfxMotif values with non-empty valid traces', async () => {
  const mod = await loadSkinVfxModule();
  for (const entry of ALL_12_SKINS) {
    const profile = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    const canvas = new MockCanvasElement(800, 600);
    const trail: SlashTrail & Record<string, unknown> = {
      x: 350,
      y: 300,
      facing: 1,
      radius: 120,
      startAngle: -1.4,
      endAngle: 0.9,
      life: 0.04,
      maxLife: 0.24,
      outerColor: profile.slashPrimary,
      coreColor: profile.slashCore,
      thickness: 30,
      style: 'arc',
      skinId: entry.skinId,
      characterId: entry.characterId,
      rimColor: profile.slashRim,
      secondaryColor: profile.slashSecondary,
      motif: profile.motif,
      seed: entry.index,
    };
    renderSlashTrails(canvas.getContext('2d')!, [trail]);
    assert.ok(canvas.ctx.commands.length >= 3, `${entry.key} (${profile.motif}) drew too few commands`);
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F3-01 ${entry.key}`);
  }
});

test('T1-F3-02: every skin within each character produces a distinct SlashTrail draw signature', async () => {
  const mod = await loadSkinVfxModule();
  for (const charId of CHARACTER_ORDER) {
    const skins = getSkinsForCharacter(charId);
    const sigs = skins.map((sk) => {
      const p = mod.getSkinVfxProfile(charId, sk.id);
      const canvas = new MockCanvasElement(800, 600);
      const trail: SlashTrail & Record<string, unknown> = {
        x: 350,
        y: 300,
        facing: 1,
        radius: 120,
        startAngle: -1.4,
        endAngle: 0.9,
        life: 0.04,
        maxLife: 0.24,
        outerColor: p.slashPrimary,
        coreColor: p.slashCore,
        thickness: 32,
        style: 'heavy_cleave',
        skinId: sk.id,
        characterId: charId,
        rimColor: p.slashRim,
        secondaryColor: p.slashSecondary,
        motif: p.motif,
        seed: 7,
      };
      renderSlashTrails(canvas.getContext('2d')!, [trail]);
      return { id: p.profileId, signature: canvas.ctx.getTraceSignature() };
    });
    assertDistinctSignatures(sigs, `T1-F3-02 ${charId} slash trails`);
  }
});

test('T1-F3-03: SlashTrail rimColor and secondaryColor are emitted into Canvas2D styles (no hardcoded #fde047)', async () => {
  const mod = await loadSkinVfxModule();
  const profile = mod.getSkinVfxProfile('kuro', 'void_walker');
  const customRim = '#14b8a6';
  const customSecondary = '#f472b6';
  const canvas = new MockCanvasElement(800, 600);
  const trail: SlashTrail & Record<string, unknown> = {
    x: 350,
    y: 300,
    facing: 1,
    radius: 125,
    startAngle: -1.5,
    endAngle: 1.0,
    life: 0.05,
    maxLife: 0.24,
    outerColor: profile.slashPrimary,
    coreColor: profile.slashCore,
    thickness: 34,
    style: 'heavy_cleave',
    skinId: 'void_walker',
    characterId: 'kuro',
    rimColor: customRim,
    secondaryColor: customSecondary,
    motif: profile.motif,
    seed: 11,
  };
  renderSlashTrails(canvas.getContext('2d')!, [trail]);
  assert.ok(
    canvas.ctx.metrics.uniqueColors.has(customRim),
    `Expected rimColor ${customRim} in draw trace; saw ${Array.from(canvas.ctx.metrics.uniqueColors).join(',')}`
  );
  assert.equal(
    canvas.ctx.metrics.uniqueColors.has('#fde047'),
    false,
    'heavy_cleave must not hardcode #fde047 when rimColor is provided'
  );
});

test('T1-F3-04: renderSlashTrails wraps lighter composite ops in balanced save/restore', async () => {
  const mod = await loadSkinVfxModule();
  const canvas = new MockCanvasElement(800, 600);
  const ctx = canvas.getContext('2d')!;
  const trails: SlashTrail[] = ALL_12_SKINS.map((s) => {
    const p = mod.getSkinVfxProfile(s.characterId, s.skinId);
    return {
      x: 300,
      y: 300,
      facing: 1,
      radius: 110,
      startAngle: -1.2,
      endAngle: 0.8,
      life: 0.05,
      maxLife: 0.24,
      outerColor: p.slashPrimary,
      coreColor: p.slashCore,
      thickness: 28,
      style: 'arc',
      rimColor: p.slashRim,
      secondaryColor: p.slashSecondary,
      motif: p.motif,
    } as SlashTrail;
  });
  renderSlashTrails(ctx, trails);
  assertDrawTraceValid(canvas.ctx.metrics, 'T1-F3-04');
  assert.equal(ctx.globalCompositeOperation, 'source-over');
});

test('T1-F3-05: legacy SlashTrail objects without optional skin fields render cleanly', () => {
  const canvas = new MockCanvasElement(800, 600);
  const legacyTrails: SlashTrail[] = [
    {
      x: 300,
      y: 300,
      facing: 1,
      radius: 100,
      startAngle: -1.2,
      endAngle: 0.9,
      life: 0.05,
      maxLife: 0.22,
      outerColor: '#38bdf8',
      coreColor: '#ffffff',
      thickness: 26,
      style: 'arc',
    },
    {
      x: 320,
      y: 300,
      facing: -1,
      radius: 120,
      startAngle: -0.4,
      endAngle: 0.4,
      life: 0.04,
      maxLife: 0.2,
      outerColor: '#22d3ee',
      coreColor: '#ffffff',
      thickness: 24,
      style: 'spear_thrust',
    },
  ];
  renderSlashTrails(canvas.getContext('2d')!, legacyTrails);
  assert.ok(canvas.ctx.commands.length >= 4);
  assertDrawTraceValid(canvas.ctx.metrics, 'T1-F3-05');
});

// =========================================================================
// F4: Per-Skin Swing Aura, Dark Ink Aura & Awakened/Weapon Accents (T1-F4-01 .. T1-F4-05)
// =========================================================================

test('T1-F4-01: renderStickman emits swing aura draw calls using skin colors during active attack', async () => {
  const mod = await loadSkinVfxModule();
  const profile = mod.getSkinVfxProfile('raijin', 'cyber_valkyrie');
  const def = getCharacterDef('raijin', 'cyber_valkyrie');
  const swingColor = '#ff00aa';
  const swingSecondary = '#00ffcc';

  const baseCanvas = new MockCanvasElement(800, 600);
  renderStickman(baseCanvas.getContext('2d')!, {
    x: 360,
    y: 350,
    facing: 1,
    pose: 'spear_thrust',
    poseTime: 0.15,
    walkPhase: 0,
    bodyColor: def.bodyColor,
    glowColor: def.glowColor,
    skinId: 'cyber_valkyrie',
    weapon: def.weapon,
  });

  const swingCanvas = new MockCanvasElement(800, 600);
  const swingOpts: StickmanRenderOptions & Record<string, unknown> = {
    x: 360,
    y: 350,
    facing: 1,
    pose: 'spear_thrust',
    poseTime: 0.15,
    walkPhase: 0,
    bodyColor: def.bodyColor,
    glowColor: def.glowColor,
    skinId: 'cyber_valkyrie',
    weapon: def.weapon,
    attackProgress: 0.45,
    attackAuraColor: swingColor,
    attackAuraSecondary: swingSecondary,
    vfxMotif: profile.motif,
  };
  renderStickman(swingCanvas.getContext('2d')!, swingOpts);

  assert.ok(
    swingCanvas.ctx.commands.length > baseCanvas.ctx.commands.length,
    'Active attack swing aura must add draw commands'
  );
  assert.ok(
    swingCanvas.ctx.metrics.uniqueColors.has(swingColor) ||
      swingCanvas.ctx.metrics.uniqueColors.has(swingSecondary),
    'Swing aura must emit attackAuraColor/attackAuraSecondary into Canvas2D trace'
  );
  assertDrawTraceValid(swingCanvas.ctx.metrics, 'T1-F4-01');
});

test('T1-F4-02: all 12 skins produce 12 distinct renderStickman draw signatures', async () => {
  const mod = await loadSkinVfxModule();
  const sigs = ALL_12_SKINS.map((s) => {
    const def = getCharacterDef(s.characterId, s.skinId);
    const p = mod.getSkinVfxProfile(s.characterId, s.skinId);
    const canvas = new MockCanvasElement(800, 600);
    const opts: StickmanRenderOptions & Record<string, unknown> = {
      x: 360,
      y: 350,
      facing: 1,
      pose: 'attack_1',
      poseTime: 0.2,
      walkPhase: 0.3,
      bodyColor: def.bodyColor,
      glowColor: def.glowColor,
      scarfPrimary: def.scarfPrimary,
      scarfHighlight: def.scarfHighlight,
      headGear: def.headGear,
      darkAura: def.auraStyle,
      weapon: def.weapon,
      skinId: s.skinId,
      attackProgress: 0.45,
      attackAuraColor: p.swingAuraColor,
      attackAuraSecondary: p.swingAuraSecondary,
      vfxMotif: p.motif,
    };
    renderStickman(canvas.getContext('2d')!, opts);
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F4-02 ${s.key}`);
    return { id: s.key, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F4-02 12-skin StickmanRenderer');
});

test('T1-F4-03: Raijin, Kagura, and Zero custom skins differ from default in base AND awakened states', async () => {
  await loadSkinVfxModule();
  for (const charId of ['raijin', 'kagura', 'zero'] as const) {
    const skins = getSkinsForCharacter(charId);
    for (const awakened of [false, true]) {
      const sigs = skins.map((sk) => {
        const def = getCharacterDef(charId, sk.id);
        const canvas = new MockCanvasElement(800, 600);
        // Hold bodyColor/glowColor neutral to verify skinId-driven weapon/aura/awakened rendering!
        renderStickman(canvas.getContext('2d')!, {
          x: 360,
          y: 350,
          facing: 1,
          pose: 'attack_2',
          poseTime: 0.25,
          walkPhase: 0,
          bodyColor: '#888888',
          glowColor: '#888888',
          scarfPrimary: '#888888',
          scarfHighlight: '#aaaaaa',
          headGear: def.headGear,
          darkAura: awakened ? def.awakenedAuraStyle : def.auraStyle,
          weapon: awakened ? def.awakenedWeapon : def.weapon,
          awakenedForm: awakened ? charId : null,
          skinId: sk.id,
        });
        return { id: `${charId}:${sk.id}:aw=${awakened}`, signature: canvas.ctx.getTraceSignature() };
      });
      assertDistinctSignatures(sigs, `T1-F4-03 ${charId} awakened=${awakened}`);
    }
  }
});

test('T1-F4-04: custom skinId changes darkAura/weapon/awakened accents for Raijin, Kagura, Zero', async () => {
  await loadSkinVfxModule();
  for (const [charId, customSkin] of [
    ['raijin', 'storm_shogun'],
    ['kagura', 'frost_empress'],
    ['zero', 'astral_phantom'],
  ] as const) {
    const baseCanvas = new MockCanvasElement(800, 600);
    const customCanvas = new MockCanvasElement(800, 600);
    const common: Omit<StickmanRenderOptions, 'skinId'> = {
      x: 360,
      y: 350,
      facing: 1,
      pose: 'awaken_pose',
      poseTime: 0.3,
      walkPhase: 0,
      bodyColor: '#999999',
      glowColor: '#999999',
      headGear: 'none',
      darkAura: 'cyan',
      weapon: getCharacterDef(charId, 'default').awakenedWeapon,
      awakenedForm: charId,
    };
    renderStickman(baseCanvas.getContext('2d')!, { ...common, skinId: 'default' });
    renderStickman(customCanvas.getContext('2d')!, { ...common, skinId: customSkin });
    assert.notEqual(
      baseCanvas.ctx.getTraceSignature(),
      customCanvas.ctx.getTraceSignature(),
      `Expected ${charId}:${customSkin} awakened/weapon accents to differ from default even with identical headGear & base colors`
    );
  }
});

test('T1-F4-05: silhouette and whiteFlash modes stay monochrome with balanced save/restore', () => {
  for (const mode of ['silhouette', 'whiteFlash'] as const) {
    const canvas = new MockCanvasElement(800, 600);
    const def = getCharacterDef('kagura', 'frost_empress');
    renderStickman(canvas.getContext('2d')!, {
      x: 360,
      y: 350,
      facing: 1,
      pose: 'attack_1',
      poseTime: 0.2,
      walkPhase: 0,
      bodyColor: def.bodyColor,
      glowColor: def.glowColor,
      headGear: def.headGear,
      darkAura: def.auraStyle,
      weapon: def.weapon,
      awakenedForm: 'kagura',
      skinId: 'frost_empress',
      silhouette: mode === 'silhouette',
      whiteFlash: mode === 'whiteFlash',
    });
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F4-05 ${mode}`);
    assert.ok(canvas.ctx.commands.length >= 2);
  }
});

// =========================================================================
// F5: Per-Skin Ultimate Cutscenes (T1-F5-01 .. T1-F5-05)
// =========================================================================

test('T1-F5-01: UltimateCutscene renders all 12 skins across key phases with distinct palettes', async () => {
  const mod = await loadSkinVfxModule();
  const audio = new AudioEngine();
  const cam = new Camera();
  const sigs: Array<{ id: string; signature: string }> = [];

  for (const entry of ALL_12_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const p = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: entry.characterId,
      skinId: entry.skinId,
      kanji: def.ultimateKanji,
      primaryColor: p.cutscenePrimary,
      secondaryColor: p.cutsceneSecondary,
      bannerTitle: def.ultimateBannerTitle,
    });
    const canvas = new MockCanvasElement(1280, 720);
    const ctx = canvas.getContext('2d')!;
    for (const targetT of [0.25, 0.7, 1.4, 2.0, 2.35]) {
      const dt = Math.max(0.01, targetT - uc.timer);
      uc.update(dt, audio, cam);
      uc.renderScreen(ctx, 1280, 720);
    }
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F5-01 ${entry.key}`);
    assert.ok(canvas.ctx.commands.length >= 20);
    sigs.push({ id: entry.key, signature: canvas.ctx.getTraceSignature() });
  }
  assertDistinctSignatures(sigs, 'T1-F5-01 12-skin UltimateCutscene');
});

test('T1-F5-02: Raijin 3 skins produce distinct renderVoltJudgment traces matching cutscene colors', async () => {
  const mod = await loadSkinVfxModule();
  const audio = new AudioEngine();
  const sigs = getSkinsForCharacter('raijin').map((sk) => {
    const def = getCharacterDef('raijin', sk.id);
    const p = mod.getSkinVfxProfile('raijin', sk.id);
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: 'raijin',
      skinId: sk.id,
      kanji: def.ultimateKanji,
      primaryColor: p.cutscenePrimary,
      secondaryColor: p.cutsceneSecondary,
      bannerTitle: def.ultimateBannerTitle,
    });
    uc.timer = 0.75;
    const canvas = new MockCanvasElement(1280, 720);
    uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
    assert.ok(
      canvas.ctx.metrics.uniqueColors.has(p.cutscenePrimary.toLowerCase()) ||
        canvas.ctx.metrics.uniqueColors.has(p.cutsceneAccent.toLowerCase()),
      `Expected Raijin ${sk.id} cutscene colors in render trace`
    );
    return { id: sk.id, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F5-02 Raijin cutscenes');
});

test('T1-F5-03: Kagura 3 skins produce distinct renderSolarInferno traces', async () => {
  const mod = await loadSkinVfxModule();
  const audio = new AudioEngine();
  const sigs = getSkinsForCharacter('kagura').map((sk) => {
    const def = getCharacterDef('kagura', sk.id);
    const p = mod.getSkinVfxProfile('kagura', sk.id);
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: 'kagura',
      skinId: sk.id,
      kanji: def.ultimateKanji,
      primaryColor: p.cutscenePrimary,
      secondaryColor: p.cutsceneSecondary,
      bannerTitle: def.ultimateBannerTitle,
    });
    uc.timer = 1.05;
    const canvas = new MockCanvasElement(1280, 720);
    uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
    return { id: sk.id, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F5-03 Kagura cutscenes');
});

test('T1-F5-04: Zero 3 skins produce distinct renderPhantomEclipse traces', async () => {
  const mod = await loadSkinVfxModule();
  const audio = new AudioEngine();
  const sigs = getSkinsForCharacter('zero').map((sk) => {
    const def = getCharacterDef('zero', sk.id);
    const p = mod.getSkinVfxProfile('zero', sk.id);
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: 'zero',
      skinId: sk.id,
      kanji: def.ultimateKanji,
      primaryColor: p.cutscenePrimary,
      secondaryColor: p.cutsceneSecondary,
      bannerTitle: def.ultimateBannerTitle,
    });
    uc.timer = 1.05;
    const canvas = new MockCanvasElement(1280, 720);
    uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
    return { id: sk.id, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F5-04 Zero cutscenes');
});

test('T1-F5-05: UltimateCutscene fires onKanjiImpact at t>=2.18 and onComplete at t>=2.7 for all 12 skins', async () => {
  const mod = await loadSkinVfxModule();
  const audio = new AudioEngine();
  const cam = new Camera();
  for (const entry of ALL_12_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const p = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    let impactCount = 0;
    let completeCount = 0;
    const uc = new UltimateCutscene();
    uc.start(
      {
        onKanjiImpact: () => {
          impactCount++;
        },
        onComplete: () => {
          completeCount++;
        },
      },
      audio,
      {
        characterId: entry.characterId,
        skinId: entry.skinId,
        kanji: def.ultimateKanji,
        primaryColor: p.cutscenePrimary,
        secondaryColor: p.cutsceneSecondary,
        bannerTitle: def.ultimateBannerTitle,
      }
    );
    for (let i = 0; i < 180; i++) {
      uc.update(1 / 60, audio, cam);
    }
    assert.equal(impactCount, 1, `${entry.key} onKanjiImpact count`);
    assert.equal(completeCount, 1, `${entry.key} onComplete count`);
    assert.equal(uc.active, false, `${entry.key} should deactivate after 2.7s`);
  }
});

// =========================================================================
// F6: Player & Game Combat VFX Wiring (T1-F6-01 .. T1-F6-05)
// =========================================================================

test('T1-F6-01: Player ground attack 1 spawns SlashTrails matching SkinVfxProfile for all 12 skins', async () => {
  const mod = await loadSkinVfxModule();
  for (const entry of ALL_12_SKINS) {
    const profile = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    const { player, tap, step } = createTestPlayer(entry.characterId, entry.skinId);
    tap('attack', 1, 1 / 60);
    step(4, 1 / 60);
    assert.ok(player.slashTrails.length > 0, `${entry.key} attack must spawn SlashTrail`);
    const trail = player.slashTrails[0] as SlashTrail & {
      motif?: string;
      rimColor?: string;
      skinId?: string;
    };
    assert.equal(trail.outerColor.toLowerCase(), profile.slashPrimary.toLowerCase(), `${entry.key} outerColor`);
    assert.equal(trail.motif, profile.motif, `${entry.key} SlashTrail.motif`);
    assert.equal(trail.rimColor?.toLowerCase(), profile.slashRim.toLowerCase(), `${entry.key} rimColor`);
  }
});

test('T1-F6-02: Player Dash, Parry, Special [U], and Awakening [O] emit skin-themed VFX', async () => {
  const mod = await loadSkinVfxModule();
  const customSkins = [
    ['kuro', 'void_walker'],
    ['raijin', 'cyber_valkyrie'],
    ['kagura', 'frost_empress'],
    ['zero', 'blood_moon'],
  ] as const;

  for (const [charId, skinId] of customSkins) {
    const profile = mod.getSkinVfxProfile(charId, skinId);
    const { player, particles, ctx, tap, step } = createTestPlayer(charId, skinId);
    player.render(ctx as unknown as CanvasRenderingContext2D);
    tap('dash', 2, 1 / 60);
    step(3, 1 / 60);
    assert.ok(player.afterimages.length > 0, `${charId}:${skinId} dash should spawn afterimage`);
    assert.equal(
      player.afterimages[0].color.toLowerCase(),
      profile.afterimageColor.toLowerCase(),
      `${charId}:${skinId} afterimageColor`
    );

    ctx.resetTrace();
    tap('parry', 2, 1 / 60);
    player.render(ctx as unknown as CanvasRenderingContext2D);
    particles.render(ctx as unknown as CanvasRenderingContext2D);
    assert.ok(
      ctx.metrics.uniqueColors.has(profile.particlePrimary.toLowerCase()) ||
        ctx.metrics.uniqueColors.has(profile.swingAuraColor.toLowerCase()) ||
        ctx.metrics.uniqueColors.has(profile.slashPrimary.toLowerCase()),
      `${charId}:${skinId} parry/dash render must include skin VFX colors`
    );
  }
});

test('T1-F6-03: Game.setSkin updates HudSnapshot.skinId immediately and syncHudThrottled detects skinId change', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kuro', false);
    session.game.setSkin('void_walker', false);
    const hud = session.getLatestHud();
    assert.equal(hud.characterId, 'kuro');
    assert.equal(hud.skinId, 'void_walker');
    assert.equal(hud.characterSkills.ultimateKanji, '虚');

    // Also test throttled HUD sync catches a skin change
    const beforeLen = session.hudHistory.length;
    session.game.setSkin('radiant_seraph', false);
    session.stepFrames(10, 1 / 60);
    assert.ok(session.hudHistory.length > beforeLen);
    assert.equal(session.getLatestHud().skinId, 'radiant_seraph');
  } finally {
    session.destroy();
  }
});

test('T1-F6-04: Game render ambient aura & Awakening reflect active skin colors', async () => {
  const mod = await loadSkinVfxModule();
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kagura', false);
    session.game.setSkin('frost_empress', false);
    session.game.startMode('training', false);
    session.tapAction('awaken', 2, 1 / 60);
    session.stepFrames(8, 1 / 60);
    const p = mod.getSkinVfxProfile('kagura', 'frost_empress');
    const trace = session.ctx.metrics.uniqueColors;
    assert.ok(
      trace.has(p.swingAuraColor.toLowerCase()) ||
        trace.has(p.slashPrimary.toLowerCase()) ||
        trace.has('#22d3ee'),
      'Awakened frost_empress render trace must reflect skin aura colors'
    );
    assertDrawTraceValid(session.ctx.metrics, 'T1-F6-04');
  } finally {
    session.destroy();
  }
});

test('T1-F6-05: R3 Combat Invariance — ActiveMeleeHitbox stats & attackDuration are identical across all 3 skins', () => {
  for (const charId of CHARACTER_ORDER) {
    const skins = getSkinsForCharacter(charId);
    const baseline: Array<{
      damage: number;
      width: number;
      height: number;
      knockX: number;
      knockY: number;
      unblockable: boolean;
      attackDuration: number;
    }> = [];

    for (let sIdx = 0; sIdx < skins.length; sIdx++) {
      const { player, tap, step } = createTestPlayer(charId, skins[sIdx].id);
      const records: typeof baseline = [];
      for (let hit = 1; hit <= 6; hit++) {
        tap('attack', 1, 1 / 60);
        for (let f = 0; f < 30 && !player.activeHitbox; f++) {
          step(1, 1 / 60);
        }
        assert.ok(player.activeHitbox, `${charId}:${skins[sIdx].id} step ${hit} activeHitbox missing`);
        records.push({
          damage: player.activeHitbox.damage,
          width: player.activeHitbox.width,
          height: player.activeHitbox.height,
          knockX: player.activeHitbox.knockX,
          knockY: player.activeHitbox.knockY,
          unblockable: player.activeHitbox.unblockable,
          attackDuration: Number(player.attackDuration.toFixed(5)),
        });
        // Wait past cancel ratio to chain next step cleanly
        while (player.attackTimer > player.attackDuration * 0.42) {
          step(1, 1 / 60);
        }
      }
      if (sIdx === 0) {
        baseline.push(...records);
      } else {
        assert.deepEqual(
          records,
          baseline,
          `R3 violation: ${charId}:${skins[sIdx].id} altered hitbox stats or attackDuration vs default`
        );
      }
    }
  }
});

// =========================================================================
// F7: Skin-Themed Projectiles & Pillars (T1-F7-01 .. T1-F7-05)
// =========================================================================

test('T1-F7-01: Projectile renders all 9 ProjectileTheme values with distinct traces', async () => {
  await loadSkinVfxModule();
  const themes = ['default', 'seraph', 'void', 'shogun', 'cyber', 'phoenix', 'frostfire', 'blood_moon', 'astral'] as const;
  const sigs = themes.map((theme) => {
    const proj = new Projectile({
      x: 400,
      y: 350,
      vx: 500,
      vy: 0,
      radius: 36,
      damage: 25,
      kind: 'sword_wave',
      fromPlayer: true,
      color: '#ffffff',
      theme,
    } as ConstructorParameters<typeof Projectile>[0]);
    const canvas = new MockCanvasElement(800, 600);
    proj.render(canvas.getContext('2d')!);
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F7-01 ${theme}`);
    return { id: theme, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F7-01 ProjectileTheme');
});

test('T1-F7-02: MagmaPillar renders fire, phoenix, and frostfire themes distinctly', async () => {
  await loadSkinVfxModule();
  const themes = ['fire', 'phoenix', 'frostfire'] as const;
  const sigs = themes.map((theme) => {
    const ps = new ParticleSystem();
    const PillarCtor = MagmaPillar as unknown as new (
      x: number,
      dir: 1 | -1,
      delay: number,
      damage: number,
      theme?: string
    ) => MagmaPillar;
    const pillar = new PillarCtor(400, 1, 0.05, 30, theme);
    pillar.update(0.1, ps);
    const canvas = new MockCanvasElement(800, 600);
    pillar.render(canvas.getContext('2d')!);
    ps.render(canvas.getContext('2d')!);
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F7-02 ${theme}`);
    return { id: theme, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F7-02 MagmaPillar themes');
});

test('T1-F7-03: IceWall renders and shatters distinctly across ice, seraph, and void themes', () => {
  const sigs = (['ice', 'seraph', 'void'] as const).map((theme) => {
    const ps = new ParticleSystem();
    const wall = new IceWall(400, 1, theme);
    wall.update(0.2, ps);
    const canvas = new MockCanvasElement(800, 600);
    wall.render(canvas.getContext('2d')!);
    wall.shatter(ps);
    ps.render(canvas.getContext('2d')!);
    assertDrawTraceValid(canvas.ctx.metrics, `T1-F7-03 ${theme}`);
    return { id: theme, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T1-F7-03 IceWall themes');
});

test('T1-F7-04: Player spawning kunai / sword_wave passes skin projectileTheme', async () => {
  const mod = await loadSkinVfxModule();
  const { player, input } = createTestPlayer('zero', 'astral_phantom');
  const projectiles: Projectile[] = [];
  input.setVirtualAction('cryo', true);
  player.update({
    dt: 1 / 60,
    input,
    audio: new AudioEngine(),
    particles: new ParticleSystem(),
    camera: new Camera(),
    chair: null,
    iceWalls: [],
    magmaPillars: [],
    projectiles,
    trainingMode: true,
    hasActiveEnemies: false,
    onRequestUltimate: () => {},
    onRequestAwaken: () => {},
    onThunderBlinkHit: () => {},
    onCryoSummonChill: () => {},
    onSkillLinkWarp: () => null,
    onDetonateAllMarks: () => 0,
  });
  assert.ok(projectiles.length > 0, 'Zero [U] skill should spawn projectiles');
  const expectedTheme = mod.getSkinVfxProfile('zero', 'astral_phantom').projectileTheme;
  const first = projectiles[0] as Projectile & { theme?: string };
  assert.equal(first.theme, expectedTheme);
});

test('T1-F7-05: Kagura [U] skill spawns fire/phoenix/frostfire MagmaPillars matching skin', async () => {
  const mod = await loadSkinVfxModule();
  for (const [skinId, expectedTheme] of [
    ['default', 'fire'],
    ['solar_phoenix', 'phoenix'],
    ['frost_empress', 'frostfire'],
  ] as const) {
    assert.equal(mod.getSkinVfxProfile('kagura', skinId).pillarTheme, expectedTheme);
    const { player, input } = createTestPlayer('kagura', skinId);
    const pillars: MagmaPillar[] = [];
    input.setVirtualAction('cryo', true);
    player.update({
      dt: 1 / 60,
      input,
      audio: new AudioEngine(),
      particles: new ParticleSystem(),
      camera: new Camera(),
      chair: null,
      iceWalls: [],
      magmaPillars: pillars,
      projectiles: [],
      trainingMode: true,
      hasActiveEnemies: false,
      onRequestUltimate: () => {},
      onRequestAwaken: () => {},
      onThunderBlinkHit: () => {},
      onCryoSummonChill: () => {},
      onSkillLinkWarp: () => null,
      onDetonateAllMarks: () => 0,
    });
    assert.ok(pillars.length > 0, `Kagura:${skinId} [U] must spawn MagmaPillars`);
    const p0 = pillars[0] as MagmaPillar & { theme?: string };
    assert.equal(p0.theme, expectedTheme);
  }
});

// =========================================================================
// F8: VFX Lifecycle & Memory Cleanup Hardening (T1-F8-01 .. T1-F8-05)
// =========================================================================

test('T1-F8-01: Player.getActiveVfxCounts() returns { slashTrails: 0, afterimages: 0 } after reset()', () => {
  const player = new Player() as Player & {
    getActiveVfxCounts?: () => { slashTrails: number; afterimages: number };
  };
  assert.equal(typeof player.getActiveVfxCounts, 'function', 'Player.getActiveVfxCounts required (M3)');
  player.reset(800, false);
  assert.deepEqual(player.getActiveVfxCounts!(), { slashTrails: 0, afterimages: 0 });
});

test('T1-F8-02: Player.setCharacter() mid-swing clears active slashTrails and afterimages immediately', () => {
  const { player, tap, step } = createTestPlayer('kuro', 'void_walker');
  const p = player as Player & { getActiveVfxCounts?: () => { slashTrails: number; afterimages: number } };
  assert.equal(typeof p.getActiveVfxCounts, 'function', 'Player.getActiveVfxCounts required (M3)');
  tap('dash', 2, 1 / 60);
  tap('attack', 2, 1 / 60);
  step(2, 1 / 60);
  const mid = p.getActiveVfxCounts!();
  assert.ok(mid.slashTrails > 0 || mid.afterimages > 0, 'Expected active VFX mid-combo');

  player.setCharacter('raijin', 'storm_shogun');
  assert.deepEqual(p.getActiveVfxCounts!(), { slashTrails: 0, afterimages: 0 });
});

test('T1-F8-03: Player.updateIdleOnTitle ticks and expires leftover slashTrails and afterimages within 0.5s', () => {
  const { player, particles, tap, step } = createTestPlayer('zero', 'blood_moon');
  tap('dash', 2, 1 / 60);
  tap('attack', 2, 1 / 60);
  step(1, 1 / 60);
  assert.ok(player.slashTrails.length > 0 || player.afterimages.length > 0);

  for (let i = 0; i < 36; i++) {
    player.updateIdleOnTitle(1 / 60, particles);
  }
  assert.equal(player.slashTrails.length, 0, 'updateIdleOnTitle must expire leftover slashTrails');
  assert.equal(player.afterimages.length, 0, 'updateIdleOnTitle must expire leftover afterimages');
});

test('T1-F8-04: Player.slashTrails and afterimages remain capped <= 24 under rapid combo/dash spam', () => {
  const { player, tap, step } = createTestPlayer('zero', 'astral_phantom');
  for (let i = 0; i < 40; i++) {
    tap('dash', 1, 1 / 60);
    tap('attack', 1, 1 / 60);
    step(2, 1 / 60);
    assert.ok(player.slashTrails.length <= 24, `slashTrails exceeded cap: ${player.slashTrails.length}`);
    assert.ok(player.afterimages.length <= 24, `afterimages exceeded cap: ${player.afterimages.length}`);
  }
});

test('T1-F8-05: ctx.shadowBlur is NEVER enabled during ParticleSystem, renderSlashTrails, or renderStickman', async () => {
  const mod = await loadSkinVfxModule();
  for (const entry of ALL_12_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const p = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    const canvas = new MockCanvasElement(800, 600);
    const ctx = canvas.getContext('2d')!;
    renderStickman(ctx, {
      x: 350,
      y: GROUND_Y,
      facing: 1,
      pose: 'attack_1',
      poseTime: 0.2,
      walkPhase: 0,
      bodyColor: def.bodyColor,
      glowColor: def.glowColor,
      darkAura: def.auraStyle,
      weapon: def.weapon,
      skinId: entry.skinId,
    });
    renderSlashTrails(ctx, [
      {
        x: 350,
        y: GROUND_Y - 50,
        facing: 1,
        radius: 120,
        startAngle: -1.2,
        endAngle: 0.8,
        life: 0.04,
        maxLife: 0.22,
        outerColor: p.slashPrimary,
        coreColor: p.slashCore,
        thickness: 28,
        style: 'arc',
      },
    ]);
    const ps = new ParticleSystem();
    ps.emitSparks(350, 300, 10, p.particlePrimary);
    ps.render(ctx);
    assert.equal(canvas.ctx.metrics.shadowBlurUsed, false, `${entry.key} enabled shadowBlur`);
  }
});

// =========================================================================
// F9: Build, Typecheck, E2E & Visual Infrastructure (T1-F9-01 .. T1-F9-05)
// =========================================================================

test('T1-F9-01: TitleScreen React SSR renders cleanly for all 12 (CharacterId, SkinId) pairs', () => {
  for (const entry of ALL_12_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const html = renderToStaticMarkup(
      React.createElement(TitleScreen, {
        selectedCharacter: entry.characterId,
        selectedSkin: entry.skinId,
        selectedStageIndex: 0,
        clearedStages: [],
        onSelectCharacter: () => {},
        onSelectSkin: () => {},
        onSelectStage: () => {},
        onStartMode: () => {},
        onOpenControls: () => {},
        onOpenAudio: () => {},
        onToggleFullscreen: () => {},
        canFullscreen: false,
      })
    );
    assert.ok(html.includes(def.ultimateKanji), `${entry.key} SSR missing kanji ${def.ultimateKanji}`);
    assert.ok(html.includes(def.skills.specialName), `${entry.key} SSR missing specialName`);
    assert.ok(html.includes('aria-checked="true"'), `${entry.key} SSR missing selected radio state`);
  }
});

test('T1-F9-02: Mock CanvasRenderingContext2D maintains balanced save/restore depth === 0 after Game.render()', () => {
  const session = createHeadlessGame();
  try {
    session.game.startMode('training', false);
    session.stepFrames(5, 1 / 60);
    assert.equal(session.ctx.getSaveDepth(), 0);
    assertDrawTraceValid(session.ctx.metrics, 'T1-F9-02 Game.render');
  } finally {
    session.destroy();
  }
});

test('T1-F9-03: Game instantiates cleanly in Node, enters all 4 modes, and destroy() cleans up', () => {
  const session = createHeadlessGame();
  try {
    assert.equal(session.getLatestHud().state, 'title');
    for (const mode of ['training', 'story', 'boss_rush', 'endless'] as const) {
      session.game.startMode(mode, false);
      session.stepFrames(3, 1 / 60);
      assert.equal(session.getLatestHud().state, 'playing');
      assert.equal(session.getLatestHud().mode, mode);
    }
    session.game.enterTitleState();
    assert.equal(session.getLatestHud().state, 'title');
  } finally {
    session.destroy();
  }
});

test('T1-F9-04: tsconfig.json, package.json, and vite.config.ts entrypoints remain valid', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.build, 'vite build');
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'src', 'main.tsx')));
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'src', 'App.tsx')));
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'vite.config.ts')));
});

test('T1-F9-05: .nomedia exists in project root and e2e_renders directory', () => {
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, '.nomedia')), 'Root .nomedia missing');
  assert.ok(
    fs.existsSync(path.join(PROJECT_ROOT, '.agents', 'teamwork', 'e2e_renders', '.nomedia')),
    'e2e_renders .nomedia missing'
  );
});
