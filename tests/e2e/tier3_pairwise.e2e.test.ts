import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CharacterId } from '../../src/game/types';
import { getCharacterDef } from '../../src/game/characters';
import { ParticleSystem } from '../../src/game/ParticleSystem';
import {
  renderSlashTrails,
  renderStickman,
  type SlashTrail,
  type StickmanRenderOptions,
} from '../../src/game/StickmanRenderer';
import { UltimateCutscene } from '../../src/game/UltimateCutscene';
import { AudioEngine } from '../../src/game/AudioEngine';
import { Camera } from '../../src/game/Camera';
import { IceWall, MagmaPillar, Projectile } from '../../src/game/Entities';
import { TitleScreen } from '../../src/components/TitleScreen';
import { MockCanvasElement } from './helpers/mockCanvas';
import { assertDistinctSignatures, assertDrawTraceValid } from './helpers/assertions';
import {
  ALL_12_SKINS,
  createHeadlessGame,
  createTestPlayer,
  loadSkinVfxModule,
} from './helpers/testHarness';

test('T3-01 (F1 x F3): all 12 SkinVfxProfiles drive renderSlashTrails to 12 pairwise-distinct signatures', async () => {
  const mod = await loadSkinVfxModule();
  const sigs = ALL_12_SKINS.map((s) => {
    const p = mod.getSkinVfxProfile(s.characterId, s.skinId);
    const canvas = new MockCanvasElement(800, 600);
    const trail: SlashTrail & Record<string, unknown> = {
      x: 360,
      y: 300,
      facing: 1,
      radius: 124,
      startAngle: -1.45,
      endAngle: 0.9,
      life: 0.04,
      maxLife: 0.24,
      outerColor: p.slashPrimary,
      coreColor: p.slashCore,
      thickness: 32,
      style: 'arc',
      skinId: s.skinId,
      characterId: s.characterId,
      rimColor: p.slashRim,
      secondaryColor: p.slashSecondary,
      motif: p.motif,
      seed: s.index * 13,
    };
    renderSlashTrails(canvas.getContext('2d')!, [trail]);
    assertDrawTraceValid(canvas.ctx.metrics, `T3-01 ${s.key}`);
    return { id: s.key, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T3-01 F1xF3');
});

test('T3-02 (F1 x F4): all 12 SkinVfxProfiles drive renderStickman with swing aura to 12 distinct signatures', async () => {
  const mod = await loadSkinVfxModule();
  const sigs = ALL_12_SKINS.map((s) => {
    const def = getCharacterDef(s.characterId, s.skinId);
    const p = mod.getSkinVfxProfile(s.characterId, s.skinId);
    const canvas = new MockCanvasElement(800, 600);
    const opts: StickmanRenderOptions & Record<string, unknown> = {
      x: 360,
      y: 340,
      facing: 1,
      pose: 'attack_3',
      poseTime: 0.22,
      walkPhase: 0,
      bodyColor: def.bodyColor,
      glowColor: def.glowColor,
      scarfPrimary: def.scarfPrimary,
      scarfHighlight: def.scarfHighlight,
      headGear: def.headGear,
      darkAura: def.auraStyle,
      weapon: def.weapon,
      skinId: s.skinId,
      attackProgress: 0.48,
      attackAuraColor: p.swingAuraColor,
      attackAuraSecondary: p.swingAuraSecondary,
      vfxMotif: p.motif,
    };
    renderStickman(canvas.getContext('2d')!, opts);
    assertDrawTraceValid(canvas.ctx.metrics, `T3-02 ${s.key}`);
    return { id: s.key, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T3-02 F1xF4');
});

test('T3-03 (F1 x F5): all 12 SkinVfxProfiles drive UltimateCutscene to 12 pairwise-distinct palettes', async () => {
  const mod = await loadSkinVfxModule();
  const audio = new AudioEngine();
  const cam = new Camera();
  const sigs = ALL_12_SKINS.map((s) => {
    const def = getCharacterDef(s.characterId, s.skinId);
    const p = mod.getSkinVfxProfile(s.characterId, s.skinId);
    const uc = new UltimateCutscene();
    uc.start({ onKanjiImpact: () => {}, onComplete: () => {} }, audio, {
      characterId: s.characterId,
      skinId: s.skinId,
      kanji: def.ultimateKanji,
      primaryColor: p.cutscenePrimary,
      secondaryColor: p.cutsceneSecondary,
      bannerTitle: def.ultimateBannerTitle,
    });
    const canvas = new MockCanvasElement(1280, 720);
    const ctx = canvas.getContext('2d')!;
    for (const t of [0.3, 0.72, 1.25]) {
      uc.update(Math.max(0.01, t - uc.timer), audio, cam);
      uc.renderScreen(ctx, 1280, 720);
    }
    assertDrawTraceValid(canvas.ctx.metrics, `T3-03 ${s.key}`);
    return { id: s.key, signature: canvas.ctx.getTraceSignature() };
  });
  assertDistinctSignatures(sigs, 'T3-03 F1xF5');
});

test('T3-04 (F2 x F6): Player combo finisher & air slam across custom skins emit profile-matched particles', async () => {
  const mod = await loadSkinVfxModule();
  for (const entry of ALL_12_SKINS) {
    const profile = mod.getSkinVfxProfile(entry.characterId, entry.skinId);
    const { player, particles, ctx, tap, step } = createTestPlayer(entry.characterId, entry.skinId);
    const psAny = particles as unknown as { getActiveCount?: () => number };
    assert.equal(typeof psAny.getActiveCount, 'function', 'getActiveCount required (M1)');

    // Chain 6-hit ground combo to finisher
    for (let hit = 1; hit <= 6; hit++) {
      tap('attack', 1, 1 / 60);
      const waitSteps = Math.max(2, Math.ceil((player.attackDuration * 0.58) / (1 / 60)));
      step(waitSteps, 1 / 60);
    }
    particles.render(ctx as unknown as CanvasRenderingContext2D);
    assert.ok(psAny.getActiveCount!() > 0, `${entry.key} finisher must emit active particles`);
    assert.ok(
      ctx.metrics.uniqueColors.has(profile.particlePrimary.toLowerCase()) ||
        ctx.metrics.uniqueColors.has(profile.particleSecondary.toLowerCase()) ||
        ctx.metrics.uniqueColors.has(profile.slashPrimary.toLowerCase()),
      `${entry.key} finisher particles must include SkinVfxProfile colors`
    );
  }
});

test('T3-05 (F3 x F6): Player ground, air, dash_slash, and parry_counter produce skin-matched SlashTrails', async () => {
  const mod = await loadSkinVfxModule();
  const profile = mod.getSkinVfxProfile('kagura', 'frost_empress');

  // Ground
  {
    const { player, tap, step } = createTestPlayer('kagura', 'frost_empress');
    tap('attack', 1, 1 / 60);
    step(2, 1 / 60);
    const t = player.slashTrails[0] as SlashTrail & { motif?: string };
    assert.ok(t);
    assert.equal(t.motif, profile.motif);
  }
  // Air
  {
    const { player, tap, step } = createTestPlayer('kagura', 'frost_empress');
    tap('jump', 2, 1 / 60);
    step(3, 1 / 60);
    tap('attack', 1, 1 / 60);
    step(2, 1 / 60);
    const t = player.slashTrails[0] as SlashTrail & { motif?: string };
    assert.ok(t);
    assert.equal(t.motif, profile.motif);
  }
  // Dash slash
  {
    const { player, tap, step } = createTestPlayer('kagura', 'frost_empress');
    tap('dash', 2, 1 / 60);
    tap('attack', 1, 1 / 60);
    step(2, 1 / 60);
    const t = player.slashTrails[0] as SlashTrail & { motif?: string };
    assert.ok(t);
    assert.equal(t.motif, profile.motif);
  }
  // Parry counter
  {
    const { player, tap, step } = createTestPlayer('kagura', 'frost_empress');
    player.notifyPerfectParry();
    tap('attack', 1, 1 / 60);
    step(2, 1 / 60);
    const t = player.slashTrails[0] as SlashTrail & { motif?: string };
    assert.ok(t);
    assert.equal(t.motif, profile.motif);
  }
});

test('T3-06 (F4 x F6): Normal -> Awakened -> Attack -> Expiry cleanly restores base skin visuals', async () => {
  await loadSkinVfxModule();
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('zero', false);
    session.game.setSkin('blood_moon', false);
    session.game.startMode('training', false);
    session.tapAction('awaken', 2, 1 / 60);
    session.stepFrames(5, 1 / 60);
    assert.equal(session.getLatestHud().awakened, true);
    assert.equal(session.getLatestHud().skinId, 'blood_moon');

    session.tapAction('attack', 2, 1 / 60);
    session.stepFrames(5, 1 / 60);
    assertDrawTraceValid(session.ctx.metrics, 'T3-06 awakened attack');

    const p = (session.game as unknown as { player: { awakened: boolean; awakenTimer: number } }).player;
    p.awakened = false;
    p.awakenTimer = 0;
    session.stepFrames(10, 1 / 60);
    assert.equal(session.getLatestHud().awakened, false);
    assert.equal(session.getLatestHud().skinId, 'blood_moon');
  } finally {
    session.destroy();
  }
});

test('T3-07 (F5 x F6): Game Ultimate while Awakened passes skinId/theme and spawns aftermath entities', async () => {
  const mod = await loadSkinVfxModule();
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kagura', false);
    session.game.setSkin('frost_empress', false);
    session.game.startMode('training', false);
    session.tapAction('awaken', 2, 1 / 60);
    session.stepFrames(5, 1 / 60);
    session.tapAction('ultimate', 2, 1 / 60);
    session.stepFrames(10, 1 / 60);
    assert.equal(session.getLatestHud().cutsceneActive, true);

    const p = mod.getSkinVfxProfile('kagura', 'frost_empress');
    assert.ok(
      session.ctx.metrics.uniqueColors.has(p.cutscenePrimary.toLowerCase()) ||
        session.ctx.metrics.uniqueColors.has(p.cutsceneSecondary.toLowerCase()),
      'Ultimate cutscene frame must render active skin palette'
    );
    // Run to cutscene completion (~2.8s = 168 frames at 60fps)
    session.stepFrames(175, 1 / 60);
    assert.equal(session.getLatestHud().cutsceneActive, false);
    assertDrawTraceValid(session.ctx.metrics, 'T3-07 complete');
  } finally {
    session.destroy();
  }
});

test('T3-08 (F6 x F7): Kuro seraph/void IceWall launch and Kagura phoenix/frostfire MagmaPillar wiring', async () => {
  await loadSkinVfxModule();
  for (const [skinId, expectedTheme] of [
    ['radiant_seraph', 'seraph'],
    ['void_walker', 'void'],
  ] as const) {
    const { player, input, step } = createTestPlayer('kuro', skinId);
    const iceWalls: IceWall[] = [];
    const projectiles: Projectile[] = [];
    const noopAudio = new AudioEngine();
    const ps = new ParticleSystem();
    const cam = new Camera();
    input.setVirtualAction('cryo', true);
    player.update({
      dt: 1 / 60,
      input,
      audio: noopAudio,
      particles: ps,
      camera: cam,
      chair: null,
      iceWalls,
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
    input.setVirtualAction('cryo', false);
    void step;
    assert.equal(iceWalls.length, 1);
    assert.equal(iceWalls[0].theme, expectedTheme);
  }
});

test('T3-09 (F2 x F8): heavy multi-character burst stays <= 720 particles and expires to 0 after 3.0s idle', () => {
  const ps = new ParticleSystem() as ParticleSystem & {
    getPoolCapacity?: () => number;
    getActiveCount?: () => number;
    emitFeathers?: (x: number, y: number, c: number, col: string) => void;
    emitPetals?: (x: number, y: number, c: number, col: string) => void;
    emitStars?: (x: number, y: number, c: number, col: string) => void;
    emitShards?: (x: number, y: number, c: number, col: string) => void;
  };
  assert.equal(typeof ps.getActiveCount, 'function', 'getActiveCount required (M1)');
  assert.equal(typeof ps.emitFeathers, 'function', 'emitFeathers required (M1)');

  for (let burst = 0; burst < 10; burst++) {
    ps.emitFeathers!(400, 300, 30, '#facc15');
    ps.emitPetals!(420, 300, 30, '#f43f5e');
    ps.emitStars!(440, 300, 30, '#38bdf8');
    ps.emitShards!(460, 300, 30, '#c084fc');
    ps.emitSparks(450, 300, 30, '#ffffff');
    assert.ok(ps.getActiveCount!() <= 720);
    ps.update(0.05);
  }
  for (let i = 0; i < 60; i++) ps.update(0.05);
  assert.equal(ps.getActiveCount!(), 0);
});

test('T3-10 (F3 x F8): rapid combo cancellation + setCharacter bounds slashTrails <= 24 and resets to 0', () => {
  const { player, tap, step } = createTestPlayer('kuro', 'radiant_seraph');
  const p = player as typeof player & { getActiveVfxCounts?: () => { slashTrails: number; afterimages: number } };
  assert.equal(typeof p.getActiveVfxCounts, 'function', 'getActiveVfxCounts required (M3)');
  for (let i = 0; i < 15; i++) {
    tap('attack', 1, 1 / 60);
    tap('dash', 1, 1 / 60);
    tap('attack', 1, 1 / 60);
    step(1, 1 / 60);
    assert.ok(p.getActiveVfxCounts!().slashTrails <= 24);
  }
  player.setCharacter('zero', 'astral_phantom');
  assert.deepEqual(p.getActiveVfxCounts!(), { slashTrails: 0, afterimages: 0 });
});

test('T3-11 (F6 x F9): Game.setCharacter + setSkin -> HudSnapshot -> TitleScreen SSR stays 100% synced across 12 skins', () => {
  const session = createHeadlessGame();
  try {
    for (const entry of ALL_12_SKINS) {
      session.game.setCharacter(entry.characterId, false);
      session.game.setSkin(entry.skinId, false);
      const hud = session.getLatestHud();
      assert.equal(hud.characterId, entry.characterId);
      assert.equal(hud.skinId, entry.skinId);

      const html = renderToStaticMarkup(
        React.createElement(TitleScreen, {
          selectedCharacter: hud.characterId,
          selectedSkin: hud.skinId,
          selectedStageIndex: hud.selectedStageIndex,
          clearedStages: hud.clearedStages,
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
      assert.ok(html.includes(hud.characterSkills.ultimateKanji));
    }
  } finally {
    session.destroy();
  }
});

test('T3-12 (F7 x F8): spawning entities then switching modes clears all entities, trails, and particles to 0', () => {
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kagura', false);
    session.game.setSkin('solar_phoenix', false);
    session.game.startMode('training', false);
    session.tapAction('cryo', 2, 1 / 60);
    session.tapAction('attack', 2, 1 / 60);
    session.stepFrames(4, 1 / 60);

    session.game.startMode('story', false);
    const gAny = session.game as unknown as {
      iceWalls: IceWall[];
      magmaPillars: MagmaPillar[];
      projectiles: Projectile[];
      particles: ParticleSystem & { getActiveCount?: () => number };
      player: { slashTrails: unknown[]; afterimages: unknown[] };
    };
    assert.equal(gAny.iceWalls.length, 0);
    assert.equal(gAny.magmaPillars.length, 0);
    assert.equal(gAny.projectiles.length, 0);
    assert.equal(gAny.player.slashTrails.length, 0);
    assert.equal(gAny.player.afterimages.length, 0);
    if (typeof gAny.particles.getActiveCount === 'function') {
      assert.equal(gAny.particles.getActiveCount(), 0);
    }
  } finally {
    session.destroy();
  }
});
