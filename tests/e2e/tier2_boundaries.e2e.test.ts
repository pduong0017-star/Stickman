import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CharacterId, SkinId } from '../../src/game/types';
import { computeResponsiveCameraScale } from '../../src/game/characters';
import { ParticleSystem, type ParticleKind } from '../../src/game/ParticleSystem';
import {
  renderSlashTrails,
  renderStickman,
  type SlashTrail,
} from '../../src/game/StickmanRenderer';
import { UltimateCutscene } from '../../src/game/UltimateCutscene';
import { IceWall, MagmaPillar, Projectile } from '../../src/game/Entities';
import { AudioEngine } from '../../src/game/AudioEngine';
import { Camera } from '../../src/game/Camera';
import { ARENA_WIDTH, GROUND_Y } from '../../src/game/rules';
import { TitleScreen } from '../../src/components/TitleScreen';
import { MockCanvasElement, installDomShims } from './helpers/mockCanvas';
import { assertDrawTraceValid } from './helpers/assertions';
import {
  ALL_12_MOTIFS,
  ALL_12_SKINS,
  PROJECT_ROOT,
  createHeadlessGame,
  createTestPlayer,
  loadSkinVfxModule,
} from './helpers/testHarness';

// =========================================================================
// F1 Boundaries (T2-F1-01 .. T2-F1-05)
// =========================================================================

test('T2-F1-01: getSkinVfxProfile with mismatched (characterId, skinId) falls back to character default', async () => {
  const mod = await loadSkinVfxModule();
  const profile = mod.getSkinVfxProfile('kuro', 'blood_moon');
  assert.equal(profile.profileId, 'kuro:default');
  assert.equal(profile.characterId, 'kuro');
  assert.equal(profile.skinId, 'default');
});

test('T2-F1-02: getSkinVfxProfile with undefined or unknown skinId falls back cleanly without throwing', async () => {
  const mod = await loadSkinVfxModule();
  const p1 = mod.getSkinVfxProfile('raijin', undefined);
  assert.equal(p1.profileId, 'raijin:default');
  const p2 = mod.getSkinVfxProfile('zero', 'nonexistent_skin' as SkinId);
  assert.equal(p2.profileId, 'zero:default');
});

test('T2-F1-03: getSkinVfxKey produces unique deterministic key for frost_empress', async () => {
  const mod = await loadSkinVfxModule();
  const k1 = mod.getSkinVfxKey('kagura', 'frost_empress');
  const k2 = mod.getSkinVfxKey('zero', 'astral_phantom');
  assert.equal(k1, 'kagura:frost_empress');
  assert.notEqual(k1, k2);
});

test('T2-F1-04: repeated getSkinVfxProfile calls return consistent deep-equal config', async () => {
  const mod = await loadSkinVfxModule();
  for (const entry of ALL_12_SKINS) {
    const a = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    const b = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    assert.deepEqual(a, b);
  }
});

test('T2-F1-05: every SkinVfxProfile swingParticleKind and finisherParticleKind is a supported ParticleKind', async () => {
  const mod = await loadSkinVfxModule();
  const validKinds = new Set<string>([
    'spark',
    'smoke',
    'cartoon_smoke',
    'ice',
    'lightning',
    'ember',
    'ring',
    'crack',
    'ink_splatter',
    'slash_beam',
    'chain_arc',
    'text',
    'feather',
    'petal',
    'star',
    'shard',
  ]);
  for (const p of mod.listAllSkinVfxProfiles()) {
    assert.ok(validKinds.has(p.swingParticleKind), `${p.profileId} invalid swingParticleKind ${p.swingParticleKind}`);
    assert.ok(validKinds.has(p.finisherParticleKind), `${p.profileId} invalid finisherParticleKind ${p.finisherParticleKind}`);
  }
});

// =========================================================================
// F2 Boundaries (T2-F2-01 .. T2-F2-05)
// =========================================================================

test('T2-F2-01: pool saturation emitting 1,500 mixed particles caps getActiveCount() <= 720', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getPoolCapacity?: () => number;
    getActiveCount?: () => number;
    emitFeathers?: (x: number, y: number, c: number, col: string) => void;
    emitPetals?: (x: number, y: number, c: number, col: string) => void;
    emitStars?: (x: number, y: number, c: number, col: string) => void;
    emitShards?: (x: number, y: number, c: number, col: string) => void;
    emitInkSplatter?: (x: number, y: number, c: number, col: string) => void;
  };
  assert.equal(typeof ps.getPoolCapacity, 'function', 'getPoolCapacity required (M1)');
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitFeathers, 'function', 'emitFeathers required (M1)');

  ps.emitFeathers!(100, 100, 300, '#fde047');
  ps.emitPetals!(100, 100, 300, '#fb7185');
  ps.emitStars!(100, 100, 300, '#7dd3fc');
  ps.emitShards!(100, 100, 300, '#38bdf8');
  ps.emitInkSplatter!(100, 100, 300, '#a855f7');

  assert.equal(ps.getPoolCapacity!(), 720);
  assert.equal(ps.getActiveCount!(), 720);
});

test('T2-F2-02: zero-count emission leaves getActiveCount() unchanged', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getActiveCount?: () => number;
    emitFeathers?: (x: number, y: number, c: number, col: string) => void;
    emitPetals?: (x: number, y: number, c: number, col: string) => void;
    emitStars?: (x: number, y: number, c: number, col: string) => void;
    emitShards?: (x: number, y: number, c: number, col: string) => void;
    emitInkSplatter?: (x: number, y: number, c: number, col: string) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitFeathers, 'function', 'emitFeathers required (M1)');
  ps.emitFeathers!(100, 100, 0, '#fde047');
  ps.emitPetals!(100, 100, 0, '#fb7185');
  ps.emitStars!(100, 100, 0, '#7dd3fc');
  ps.emitShards!(100, 100, 0, '#38bdf8');
  ps.emitInkSplatter!(100, 100, 0, '#a855f7');
  assert.equal(ps.getActiveCount!(), 0);
});

test('T2-F2-03: extreme dt values update(0) and update(60) behave cleanly without NaN', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getActiveCount?: () => number;
    emitStars?: (x: number, y: number, c: number, col: string) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitStars, 'function', 'emitStars required (M1)');
  ps.emitStars!(300, 300, 10, '#facc15');
  ps.update(0);
  assert.equal(ps.getActiveCount!(), 10);

  const canvas = new MockCanvasElement(800, 600);
  ps.render(canvas.getContext('2d')!);
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F2-03 dt=0');

  ps.update(60);
  assert.equal(ps.getActiveCount!(), 0);
});

test('T2-F2-04: negative and offscreen coordinates render without NaN in Canvas2D trace', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    emitStars?: (x: number, y: number, c: number, col: string) => void;
    emitShards?: (x: number, y: number, c: number, col: string) => void;
  };
  assert.equal(typeof ps.emitStars, 'function', 'emitStars required (M1)');
  ps.emitStars!(-500, 2000, 5, '#c084fc');
  ps.emitShards!(3000, -400, 5, '#38bdf8');
  ps.update(0.05);
  const canvas = new MockCanvasElement(800, 600);
  ps.render(canvas.getContext('2d')!);
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F2-04');
});

test('T2-F2-05: 200 frames of continuous emit-update cycling stays bounded below 720', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getActiveCount?: () => number;
    emitPetals?: (x: number, y: number, c: number, col: string) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitPetals, 'function', 'emitPetals required (M1)');
  for (let frame = 0; frame < 200; frame++) {
    ps.emitPetals!(400, 300, 12, '#f43f5e');
    ps.update(1 / 60);
  }
  const active = ps.getActiveCount!();
  assert.ok(active > 0 && active < 720, `Expected steady plateau < 720, got ${active}`);
});

// =========================================================================
// F3 Boundaries (T2-F3-01 .. T2-F3-05)
// =========================================================================

test('T2-F3-01: renderSlashTrails(ctx, []) emits 0 draw ops', () => {
  const canvas = new MockCanvasElement(800, 600);
  renderSlashTrails(canvas.getContext('2d')!, []);
  assert.equal(canvas.ctx.commands.length, 0);
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F3-01');
});

test('T2-F3-02: SlashTrail boundary lifetimes (0, 0.5*maxLife, maxLife) emit 0 NaN across all 12 motifs', async () => {
  const mod = await loadSkinVfxModule();
  for (const motif of ALL_12_MOTIFS) {
    for (const life of [0, 0.12, 0.24]) {
      const canvas = new MockCanvasElement(800, 600);
      const trail: SlashTrail & Record<string, unknown> = {
        x: 350,
        y: 300,
        facing: 1,
        radius: 110,
        startAngle: -1.3,
        endAngle: 0.9,
        life,
        maxLife: 0.24,
        outerColor: '#38bdf8',
        coreColor: '#ffffff',
        thickness: 28,
        style: 'arc',
        motif,
        rimColor: '#a855f7',
        secondaryColor: '#facc15',
      };
      renderSlashTrails(canvas.getContext('2d')!, [trail]);
      assertDrawTraceValid(canvas.ctx.metrics, `T2-F3-02 ${motif} life=${life}`);
    }
  }
  void mod;
});

test('T2-F3-03: SlashTrail with facing = -1 (left-facing) mirrors cleanly across all 12 motifs', () => {
  for (const motif of ALL_12_MOTIFS) {
    const canvas = new MockCanvasElement(800, 600);
    const trail: SlashTrail & Record<string, unknown> = {
      x: 350,
      y: 300,
      facing: -1,
      radius: 115,
      startAngle: -1.3,
      endAngle: 0.85,
      life: 0.06,
      maxLife: 0.24,
      outerColor: '#f43f5e',
      coreColor: '#ffffff',
      thickness: 30,
      style: 'heavy_cleave',
      motif,
      rimColor: '#fecdd3',
      secondaryColor: '#be123c',
    };
    renderSlashTrails(canvas.getContext('2d')!, [trail]);
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F3-03 ${motif}`);
  }
});

test('T2-F3-04: SlashTrail tiny (radius=1) and huge (radius=300) stay finite and balanced', () => {
  for (const radius of [1, 300]) {
    for (const motif of ALL_12_MOTIFS) {
      const canvas = new MockCanvasElement(800, 600);
      const trail: SlashTrail & Record<string, unknown> = {
        x: 400,
        y: 300,
        facing: 1,
        radius,
        startAngle: -1.5,
        endAngle: 1.5,
        life: 0.05,
        maxLife: 0.25,
        outerColor: '#22d3ee',
        coreColor: '#ffffff',
        thickness: 24,
        style: 'arc',
        motif,
      };
      renderSlashTrails(canvas.getContext('2d')!, [trail]);
      assertDrawTraceValid(canvas.ctx.metrics, `T2-F3-04 r=${radius} ${motif}`);
    }
  }
});

test('T2-F3-05: SlashTrail with startAngle === endAngle (degenerate span=0) handles cleanly without error', () => {
  for (const style of ['arc', 'heavy_cleave', 'spear_thrust', 'iaido_line', 'twin_x'] as const) {
    const canvas = new MockCanvasElement(800, 600);
    renderSlashTrails(canvas.getContext('2d')!, [
      {
        x: 300,
        y: 300,
        facing: 1,
        radius: 100,
        startAngle: 0.5,
        endAngle: 0.5,
        life: 0.05,
        maxLife: 0.2,
        outerColor: '#38bdf8',
        coreColor: '#ffffff',
        thickness: 20,
        style,
      },
    ]);
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F3-05 ${style}`);
  }
});

// =========================================================================
// F4 Boundaries (T2-F4-01 .. T2-F4-05)
// =========================================================================

test('T2-F4-01: renderStickman with boundary & out-of-range attackProgress values stays finite', () => {
  for (const ap of [-0.1, 0, 0.5, 1.0, 1.5]) {
    const canvas = new MockCanvasElement(800, 600);
    renderStickman(canvas.getContext('2d')!, {
      x: 350,
      y: 350,
      facing: 1,
      pose: 'attack_1',
      poseTime: 0.2,
      walkPhase: 0,
      bodyColor: '#7c5cff',
      glowColor: '#8b5cf6',
      skinId: 'radiant_seraph',
      attackProgress: ap,
      attackAuraColor: '#facc15',
      attackAuraSecondary: '#fef08a',
      vfxMotif: 'seraph_feathers',
    } as never);
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F4-01 ap=${ap}`);
  }
});

test('T2-F4-02: renderStickman with facing=-1 and landing squash (1.36, 0.66) renders all 12 skins', () => {
  for (const entry of ALL_12_SKINS) {
    const canvas = new MockCanvasElement(800, 600);
    renderStickman(canvas.getContext('2d')!, {
      x: 350,
      y: 350,
      facing: -1,
      pose: 'idle',
      poseTime: 0.1,
      walkPhase: 0,
      scaleX: 1.36,
      scaleY: 0.66,
      bodyColor: '#38bdf8',
      glowColor: '#22d3ee',
      skinId: entry.skinId,
    });
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F4-02 ${entry.key}`);
  }
});

test('T2-F4-03: renderStickman high aerial position (GROUND_Y - 300) keeps shadow/aura radii non-negative', () => {
  const canvas = new MockCanvasElement(800, 600);
  renderStickman(canvas.getContext('2d')!, {
    x: 400,
    y: GROUND_Y - 300,
    facing: 1,
    pose: 'air_attack',
    poseTime: 0.15,
    walkPhase: 0,
    bodyColor: '#10b981',
    glowColor: '#34d399',
    darkAura: 'emerald',
    skinId: 'astral_phantom',
  });
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F4-03');
});

test('T2-F4-04: renderStickman with awakenedForm set across all 4 fighters and custom skins renders cleanly', () => {
  for (const entry of ALL_12_SKINS) {
    const canvas = new MockCanvasElement(800, 600);
    renderStickman(canvas.getContext('2d')!, {
      x: 380,
      y: 350,
      facing: 1,
      pose: 'awakened_finisher',
      poseTime: 0.4,
      walkPhase: 0,
      bodyColor: '#ffffff',
      glowColor: '#facc15',
      awakenedForm: entry.characterId,
      skinId: entry.skinId,
      darkAura: 'gold',
      weapon: 'katana',
    });
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F4-04 ${entry.key}`);
  }
});

test('T2-F4-05: renderStickman with darkAura="none" and weapon="none" skips layers cleanly', () => {
  const canvas = new MockCanvasElement(800, 600);
  renderStickman(canvas.getContext('2d')!, {
    x: 350,
    y: 350,
    facing: 1,
    pose: 'idle',
    poseTime: 0,
    walkPhase: 0,
    bodyColor: '#f8fafc',
    glowColor: '#38bdf8',
    darkAura: 'none',
    weapon: 'none',
    skinId: 'cyber_valkyrie',
  });
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F4-05');
  assert.ok(canvas.ctx.commands.length >= 2);
});

// =========================================================================
// F5 Boundaries (T2-F5-01 .. T2-F5-05)
// =========================================================================

test('T2-F5-01: UltimateCutscene.renderScreen when active=false is a strict no-op', () => {
  const uc = new UltimateCutscene();
  const canvas = new MockCanvasElement(1280, 720);
  uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
  assert.equal(canvas.ctx.commands.length, 0);
});

test('T2-F5-02: UltimateCutscene.renderScreen at boundary timestamps across all 12 skins emits 0 NaN', () => {
  const audio = new AudioEngine();
  for (const entry of ALL_12_SKINS) {
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: entry.characterId,
      skinId: entry.skinId,
      kanji: '断',
      primaryColor: '#38bdf8',
      secondaryColor: '#fde047',
      bannerTitle: 'TEST',
    });
    for (const t of [0, 1.32, 1.85, 2.18, 2.699]) {
      uc.timer = t;
      const canvas = new MockCanvasElement(1280, 720);
      uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
      assertDrawTraceValid(canvas.ctx.metrics, `T2-F5-02 ${entry.key} t=${t}`);
    }
  }
});

test('T2-F5-03: UltimateCutscene renders cleanly on 667x360 mobile landscape and 1920x1080 desktop', () => {
  const audio = new AudioEngine();
  for (const [w, h] of [
    [667, 360],
    [1920, 1080],
  ] as const) {
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: 'raijin',
      skinId: 'cyber_valkyrie',
      kanji: '電',
      primaryColor: '#c026d3',
      secondaryColor: '#67e8f9',
      bannerTitle: 'OVERDRIVE',
    });
    uc.timer = 0.9;
    const canvas = new MockCanvasElement(w, h);
    uc.renderScreen(canvas.getContext('2d')!, w, h);
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F5-03 ${w}x${h}`);
  }
});

test('T2-F5-04: isSilhouettePhase() and isWhiteFlashPhase() activate in expected climax windows and clear when inactive', () => {
  const audio = new AudioEngine();
  for (const charId of ['kuro', 'raijin', 'kagura', 'zero'] as CharacterId[]) {
    const uc = new UltimateCutscene();
    assert.equal(uc.isSilhouettePhase(), false);
    assert.equal(uc.isWhiteFlashPhase(), false);
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: charId,
      skinId: 'default',
      kanji: '断',
      primaryColor: '#ef4444',
      secondaryColor: '#ffffff',
      bannerTitle: 'TEST',
    });
    uc.timer = 0.5;
    assert.equal(uc.isSilhouettePhase(), false);
    assert.equal(uc.isWhiteFlashPhase(), false);
    uc.timer = 1.65;
    assert.equal(uc.isSilhouettePhase(), true, `${charId} should be in silhouette at t=1.65`);
    uc.timer = 2.0;
    assert.equal(uc.isWhiteFlashPhase(), true, `${charId} should be in whiteFlash at t=2.0`);
    uc.timer = 2.3;
    assert.equal(uc.isSilhouettePhase(), false);
    assert.equal(uc.isWhiteFlashPhase(), false);
  }
});

test('T2-F5-05: restarting cutscene.start() mid-cutscene resets timer and switches skin theme cleanly', () => {
  const audio = new AudioEngine();
  const uc = new UltimateCutscene();
  uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
    characterId: 'kuro',
    skinId: 'default',
    kanji: '断',
    primaryColor: '#dc2626',
    secondaryColor: '#fde68a',
    bannerTitle: 'FIRST',
  });
  uc.timer = 1.0;
  uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
    characterId: 'zero',
    skinId: 'blood_moon',
    kanji: '血',
    primaryColor: '#e11d48',
    secondaryColor: '#ffe4e6',
    bannerTitle: 'SECOND',
  });
  assert.equal(uc.timer, 0);
  assert.equal(uc.active, true);
  const canvas = new MockCanvasElement(1280, 720);
  uc.renderScreen(canvas.getContext('2d')!, 1280, 720);
  assert.ok(canvas.ctx.commands.some((c) => c.op === 'fillText' && c.text === 'SECOND'));
});

// =========================================================================
// F6 Boundaries (T2-F6-01 .. T2-F6-05)
// =========================================================================

test('T2-F6-01: Game.setSkin with cross-character skinId normalizes safely to default', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kuro', false);
    session.game.setSkin('cyber_valkyrie', false);
    assert.equal(session.getLatestHud().skinId, 'default');
  } finally {
    session.destroy();
  }
});

test('T2-F6-02: Game.setCharacter resets incompatible skinId to default and syncs HudSnapshot', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kuro', false);
    session.game.setSkin('void_walker', false);
    assert.equal(session.getLatestHud().skinId, 'void_walker');

    session.game.setCharacter('kagura', false);
    assert.equal(session.getLatestHud().characterId, 'kagura');
    assert.equal(session.getLatestHud().skinId, 'default');
  } finally {
    session.destroy();
  }
});

test('T2-F6-03: rapid attack while sittingOnChair stands up and triggers attack VFX', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('raijin', false);
    session.game.setSkin('storm_shogun', false);
    session.game.startMode('training', false);
    session.tapAction('attack', 2, 1 / 60);
    session.stepFrames(5, 1 / 60);
    assert.equal(session.getLatestHud().state, 'playing');
    assertDrawTraceValid(session.ctx.metrics, 'T2-F6-03');
  } finally {
    session.destroy();
  }
});

test('T2-F6-04: Player.takeDamage during invulnTimer>0 returns 0 and in trainingMode clamps HP >= 25', () => {
  const { player, particles } = createTestPlayer('kagura', 'solar_phoenix');
  const audio = new AudioEngine();
  const cam = new Camera();
  player.invulnTimer = 0.5;
  assert.equal(player.takeDamage(50, 1, audio, particles, cam, false), 0);

  player.invulnTimer = 0;
  player.hp = 40;
  player.takeDamage(999, 1, audio, particles, cam, true);
  assert.ok(player.hp >= 25, `Expected training mode HP clamp >= 25, got ${player.hp}`);
  assert.equal(player.skinId, 'solar_phoenix');
});

test('T2-F6-05: corrupted localStorage skin value recovers cleanly to default on Game init', () => {
  const shims = installDomShims();
  shims.localStorage.clear();
  shims.localStorage.setItem('scarlet_sheath_char_v1', 'zero');
  shims.localStorage.setItem('scarlet_sheath_skin_v1', 'corrupted_skin_xyz');
  const session = createHeadlessGame({ clearStorage: false });
  try {
    assert.equal(session.getLatestHud().characterId, 'zero');
    assert.equal(session.getLatestHud().skinId, 'default');
  } finally {
    session.destroy();
  }
});

// =========================================================================
// F7 Boundaries (T2-F7-01 .. T2-F7-05)
// =========================================================================

test('T2-F7-01: Projectile outside arena bounds deactivates cleanly on first update', () => {
  for (const x of [-125, ARENA_WIDTH + 125]) {
    const proj = new Projectile({
      x,
      y: 350,
      vx: 100,
      vy: 0,
      radius: 20,
      damage: 10,
      kind: 'sword_wave',
      fromPlayer: true,
      color: '#38bdf8',
    });
    proj.update(0.016);
    assert.equal(proj.active, false);
  }
});

test('T2-F7-02: Projectile with zero velocity (vx=0, vy=0) renders cleanly across all 9 themes', async () => {
  await loadSkinVfxModule();
  for (const theme of ['default', 'seraph', 'void', 'shogun', 'cyber', 'phoenix', 'frostfire', 'blood_moon', 'astral'] as const) {
    const proj = new Projectile({
      x: 400,
      y: 350,
      vx: 0,
      vy: 0,
      radius: 28,
      damage: 15,
      kind: 'sword_wave',
      fromPlayer: true,
      color: '#facc15',
      theme,
    } as ConstructorParameters<typeof Projectile>[0]);
    const canvas = new MockCanvasElement(800, 600);
    proj.render(canvas.getContext('2d')!);
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F7-02 ${theme}`);
  }
});

test('T2-F7-03: MagmaPillar renders pre-eruption and post-eruption and deactivates at delay+0.44', () => {
  const ps = new ParticleSystem();
  for (const theme of ['fire', 'phoenix', 'frostfire'] as const) {
    const PillarCtor = MagmaPillar as unknown as new (
      x: number,
      dir: 1 | -1,
      delay: number,
      damage: number,
      theme?: string
    ) => MagmaPillar;
    const mp = new PillarCtor(400, 1, 0.2, 30, theme);
    const canvas = new MockCanvasElement(800, 600);
    mp.update(0.1, ps);
    mp.render(canvas.getContext('2d')!);
    mp.update(0.2, ps);
    mp.render(canvas.getContext('2d')!);
    assert.equal(mp.erupted, true);
    assertDrawTraceValid(canvas.ctx.metrics, `T2-F7-03 ${theme}`);
    mp.update(0.4, ps);
    assert.equal(mp.active, false);
  }
});

test('T2-F7-04: IceWall double launch() is idempotent and shatter() deactivates across all 3 themes', () => {
  const ps = new ParticleSystem();
  for (const theme of ['ice', 'seraph', 'void'] as const) {
    const wall = new IceWall(400, 1, theme);
    wall.launch(1, ps, true);
    const vxAfterFirst = wall.vx;
    wall.launch(-1, ps, false);
    assert.equal(wall.vx, vxAfterFirst, 'Second launch() must be a no-op');
    wall.shatter(ps);
    assert.equal(wall.active, false);
  }
});

test('T2-F7-05: Projectile with color="#facc15" and theme="shogun" does not collide with seraph theme', async () => {
  await loadSkinVfxModule();
  const seraphProj = new Projectile({
    x: 400,
    y: 350,
    vx: 500,
    vy: 0,
    radius: 36,
    damage: 25,
    kind: 'sword_wave',
    fromPlayer: true,
    color: '#facc15',
    theme: 'seraph',
  } as ConstructorParameters<typeof Projectile>[0]);
  const shogunProj = new Projectile({
    x: 400,
    y: 350,
    vx: 500,
    vy: 0,
    radius: 36,
    damage: 25,
    kind: 'sword_wave',
    fromPlayer: true,
    color: '#facc15',
    theme: 'shogun',
  } as ConstructorParameters<typeof Projectile>[0]);

  const c1 = new MockCanvasElement(800, 600);
  const c2 = new MockCanvasElement(800, 600);
  seraphProj.render(c1.getContext('2d')!);
  shogunProj.render(c2.getContext('2d')!);
  assert.notEqual(
    c1.ctx.getTraceSignature(),
    c2.ctx.getTraceSignature(),
    'Explicit theme must take precedence over color-string heuristic'
  );
});

// =========================================================================
// F8 Boundaries (T2-F8-01 .. T2-F8-05)
// =========================================================================

test('T2-F8-01: Player slashTrails array stays capped <= 24 under rapid 1ms frame attack spam', () => {
  const { player, tap, step } = createTestPlayer('kuro', 'radiant_seraph');
  for (let i = 0; i < 35; i++) {
    player.attackTimer = 0;
    tap('attack', 1, 0.001);
    step(1, 0.001);
    assert.ok(player.slashTrails.length <= 24, `slashTrails cap violated: ${player.slashTrails.length}`);
  }
});

test('T2-F8-02: Player afterimages array stays capped <= 24 under rapid dash spam', () => {
  const { player, tap, step } = createTestPlayer('raijin', 'cyber_valkyrie');
  for (let i = 0; i < 35; i++) {
    player.dashCooldown = 0;
    tap('dash', 2, 0.01);
    step(2, 0.01);
    assert.ok(player.afterimages.length <= 24, `afterimages cap violated: ${player.afterimages.length}`);
  }
});

test('T2-F8-03: Player.update with single huge dt=1.0 expires all slashTrails and afterimages', () => {
  const { player, tap, step } = createTestPlayer('kagura', 'frost_empress');
  tap('dash', 2, 1 / 60);
  tap('attack', 2, 1 / 60);
  step(1, 1.0);
  assert.equal(player.slashTrails.length, 0);
  assert.equal(player.afterimages.length, 0);
});

test('T2-F8-04: Game.enterTitleState() and startMode() clear all active combat entities and particles', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kuro', false);
    session.game.setSkin('void_walker', false);
    session.game.startMode('training', false);
    session.tapAction('cryo', 2, 1 / 60);
    session.tapAction('attack', 2, 1 / 60);
    session.stepFrames(5, 1 / 60);

    session.game.enterTitleState();
    const gAny = session.game as unknown as {
      iceWalls: unknown[];
      magmaPillars: unknown[];
      projectiles: unknown[];
      enemies: unknown[];
      player: { slashTrails: unknown[]; afterimages: unknown[] };
    };
    assert.equal(gAny.iceWalls.length, 0);
    assert.equal(gAny.magmaPillars.length, 0);
    assert.equal(gAny.projectiles.length, 0);
    assert.equal(gAny.enemies.length, 0);
    assert.equal(gAny.player.slashTrails.length, 0);
    assert.equal(gAny.player.afterimages.length, 0);
  } finally {
    session.destroy();
  }
});

test('T2-F8-05: Game.destroy() prevents subsequent rAF callbacks from updating or throwing', () => {
  const shims = installDomShims();
  const canvas = new MockCanvasElement(1280, 720);
  const g = new (createHeadlessGame().game.constructor as new (c: HTMLCanvasElement, cb: () => void) => {
    destroy: () => void;
  })(canvas as unknown as HTMLCanvasElement, () => {});
  g.destroy();
  assert.doesNotThrow(() => {
    shims.flushAnimationFrames(5, 16.67);
  });
});

// =========================================================================
// F9 Boundaries (T2-F9-01 .. T2-F9-06)
// =========================================================================

test('T2-F9-01: MockCanvas handles zero-length path, clamped globalAlpha, and 0-radius gradients cleanly', () => {
  const canvas = new MockCanvasElement(400, 300);
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.stroke();
  ctx.fill();
  ctx.globalAlpha = -0.5;
  assert.equal(ctx.globalAlpha, 0);
  ctx.globalAlpha = 2.0;
  assert.equal(ctx.globalAlpha, 1);
  const grad = ctx.createRadialGradient(100, 100, 0, 100, 100, 0);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad as unknown as string;
  ctx.fillRect(90, 90, 20, 20);
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F9-01');
});

test('T2-F9-02: render-skins.py CSS color parser handles #fff, #ef4444, #a855f738, rgba(), rgb() without ValueError', () => {
  const script = [
    'import sys',
    `sys.path.insert(0, ${JSON.stringify(path.join(PROJECT_ROOT, 'tests', 'e2e'))})`,
    'import importlib.util',
    `spec = importlib.util.spec_from_file_location('render_skins', ${JSON.stringify(path.join(PROJECT_ROOT, 'tests', 'e2e', 'render-skins.py'))})`,
    'mod = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(mod)',
    "assert mod.parse_css_color('#fff', 1.0) == (255, 255, 255, 255)",
    "assert mod.parse_css_color('#ef4444', 1.0) == (239, 68, 68, 255)",
    "assert mod.parse_css_color('#a855f738', 1.0) == (168, 85, 247, 56)",
    "assert mod.parse_css_color('rgba(250, 204, 21, 0.45)', 1.0)[:3] == (250, 204, 21)",
    "assert mod.parse_css_color('rgb(9, 11, 16)', 0.5) == (9, 11, 16, 128)",
    "assert mod.parse_css_color('rgba(0,0,0,0)', 1.0) == (0, 0, 0, 0)",
    "print('OK')",
  ].join('\n');
  const res = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  assert.equal(res.status, 0, `Python color parser check failed: ${res.stderr}`);
  assert.ok(res.stdout.includes('OK'));
});

test('T2-F9-03: computeResponsiveCameraScale and Game.render stay finite across extreme viewport ratios', () => {
  for (const [w, h] of [
    [320, 240],
    [844, 390],
    [2560, 1440],
  ] as const) {
    const scale = computeResponsiveCameraScale(w, h);
    assert.ok(Number.isFinite(scale) && scale > 0);
    const session = createHeadlessGame({ width: w, height: h });
    try {
      session.game.startMode('training', false);
      session.stepFrames(2, 1 / 60);
      assertDrawTraceValid(session.ctx.metrics, `T2-F9-03 ${w}x${h}`);
    } finally {
      session.destroy();
    }
  }
});

test('T2-F9-04: TitleScreen SSR handles clearedStages=[0..7] and canFullscreen=true/false', () => {
  for (const canFullscreen of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(TitleScreen, {
        selectedCharacter: 'kuro',
        selectedSkin: 'radiant_seraph',
        selectedStageIndex: 7,
        clearedStages: [0, 1, 2, 3, 4, 5, 6, 7],
        onSelectCharacter: () => {},
        onSelectSkin: () => {},
        onSelectStage: () => {},
        onStartMode: () => {},
        onOpenControls: () => {},
        onOpenAudio: () => {},
        onToggleFullscreen: () => {},
        canFullscreen,
      })
    );
    assert.ok(html.includes('Radiant Seraph'));
    assert.ok(html.includes('Tiến độ'));
    assert.match(html, /8(?:<!-- -->)?\/(?:<!-- -->)?12/);
    assert.equal(html.includes('Toàn MH'), canFullscreen);
  }
});

test('T2-F9-05: run-e2e.mjs exits non-zero on invalid --tier flag', () => {
  const res = spawnSync(
    process.execPath,
    [path.join(PROJECT_ROOT, 'tests', 'e2e', 'run-e2e.mjs'), '--tier=invalid'],
    { cwd: PROJECT_ROOT, encoding: 'utf8' }
  );
  assert.notEqual(res.status, 0, 'Expected non-zero exit code for invalid --tier');
  assert.ok(res.stderr.includes('Invalid --tier'), `Expected clear error message, got: ${res.stderr}`);
});

test('T2-F9-06: ParticleSystem supports emitting every ParticleKind without runtime errors', () => {
  const ps = new ParticleSystem();
  const kinds: ParticleKind[] = [
    'spark',
    'smoke',
    'cartoon_smoke',
    'ice',
    'lightning',
    'ember',
    'ring',
    'crack',
    'ink_splatter',
    'slash_beam',
    'chain_arc',
    'text',
  ];
  assert.equal(kinds.length, 12);
  ps.emitSparks(10, 10, 1);
  ps.emitSmoke(10, 10, 1);
  ps.emitSmoke(10, 10, 1, '#f8fafc');
  ps.emitIceShards(10, 10, 1);
  ps.emitLightning(10, 10);
  ps.emitEmbers(10, 10, 1);
  ps.emitShockwave(10, 10);
  ps.emitGroundCrack(10);
  ps.emitSlashBeam(10, 10, 0);
  ps.emitChainArc(10, 10, 50, 50);
  ps.emitText(10, 10, 'HIT');
  const canvas = new MockCanvasElement(400, 300);
  ps.render(canvas.getContext('2d')!);
  assertDrawTraceValid(canvas.ctx.metrics, 'T2-F9-06');
});
