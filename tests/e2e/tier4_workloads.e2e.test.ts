import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHARACTER_ORDER, getSkinsForCharacter } from '../../src/game/characters';
import { AudioEngine } from '../../src/game/AudioEngine';
import { Camera } from '../../src/game/Camera';
import { Boss } from '../../src/game/Boss';
import { Enemy } from '../../src/game/Enemy';
import { IceWall, MagmaPillar, Projectile, StageHazard } from '../../src/game/Entities';
import { InputHandler } from '../../src/game/InputHandler';
import { ParticleSystem } from '../../src/game/ParticleSystem';
import { Player } from '../../src/game/Player';
import { TitleScreen } from '../../src/components/TitleScreen';
import { MockCanvasElement, installDomShims } from './helpers/mockCanvas';
import { assertDrawTraceValid } from './helpers/assertions';
import {
  ALL_12_SKINS,
  DEFAULT_RENDER_DIR,
  PROJECT_ROOT,
  buildSkinVisualSnapshot,
  createHeadlessGame,
  createTestPlayer,
  loadSkinVfxModule,
} from './helpers/testHarness';

test('T4-01 (R2 Workload): >= 50 attack spam returns active VFX entities to 0 after settling without linear leak', async () => {
  await loadSkinVfxModule();
  const sampleSkins = [
    ['kuro', 'void_walker'],
    ['raijin', 'cyber_valkyrie'],
    ['kagura', 'frost_empress'],
    ['zero', 'blood_moon'],
  ] as const;

  for (const [charId, skinId] of sampleSkins) {
    // 1. Isolated Player + ParticleSystem stress: 60 attacks -> 3.5s idle -> exact 0 cleanup
    const { player, particles, tap, step } = createTestPlayer(charId, skinId);
    const pWithCounts = player as Player & {
      getActiveVfxCounts?: () => { slashTrails: number; afterimages: number };
    };
    const psWithCounts = particles as ParticleSystem & {
      getActiveCount?: () => number;
      getPoolCapacity?: () => number;
    };
    assert.equal(typeof pWithCounts.getActiveVfxCounts, 'function', 'Player.getActiveVfxCounts required (M3)');
    assert.equal(typeof psWithCounts.getActiveCount, 'function', 'ParticleSystem.getActiveCount required (M1)');

    let peakParticles = 0;
    let peakTrails = 0;
    let peakAfterimages = 0;

    const dtSim = 1 / 120;
    for (let atk = 0; atk < 60; atk++) {
      if (atk % 10 === 0) {
        tap('dash', 2, dtSim);
      } else if (atk % 15 === 0) {
        tap('cryo', 2, dtSim);
      }
      tap('attack', 2, dtSim);
      step(24, dtSim); // 0.2s per attack cycle
      const vfx = pWithCounts.getActiveVfxCounts!();
      peakTrails = Math.max(peakTrails, vfx.slashTrails);
      peakAfterimages = Math.max(peakAfterimages, vfx.afterimages);
      peakParticles = Math.max(peakParticles, psWithCounts.getActiveCount!());
      assert.ok(vfx.slashTrails <= 24, `${charId}:${skinId} slashTrails exceeded 24`);
      assert.ok(vfx.afterimages <= 24, `${charId}:${skinId} afterimages exceeded 24`);
      assert.ok(psWithCounts.getActiveCount!() <= 720, `${charId}:${skinId} particles exceeded 720`);
    }

    assert.ok(peakTrails > 0, `${charId}:${skinId} must generate slashTrails during 60 attacks`);
    assert.ok(peakParticles > 0, `${charId}:${skinId} must generate particles during 60 attacks`);

    // Pause ambient aura spawning by simulating clean decay ticks on trails, afterimages & particles
    // for 3.5s (420 steps at 1/120s)
    for (let i = 0; i < 420; i++) {
      player.updateIdleOnTitle(dtSim, particles);
      // After 1.0s settle window, test particle decay without new ambient emissions
      if (i < 120) {
        particles.update(dtSim);
      } else {
        // Tick existing particles down to 0
        particles.update(dtSim);
      }
    }
    // Note: updateIdleOnTitle emits ambient smoke/lightning; verify slashTrails & afterimages hit exact 0
    // and then advance particles alone 3.5s to confirm 100% particle expiration to 0!
    assert.deepEqual(
      pWithCounts.getActiveVfxCounts!(),
      { slashTrails: 0, afterimages: 0 },
      `${charId}:${skinId} trails/afterimages must return to 0 after settling`
    );
    for (let i = 0; i < 420; i++) {
      particles.update(dtSim);
    }
    assert.equal(
      psWithCounts.getActiveCount!(),
      0,
      `${charId}:${skinId} all active particles must expire to 0 after settling`
    );
  }

  // 2. Full Game training-mode 60-attack spam -> bounded steady-state plateau
  const session = createHeadlessGame();
  try {
    session.game.setCharacter('kuro', false);
    session.game.setSkin('void_walker', false);
    session.game.startMode('training', false);
    for (let atk = 0; atk < 60; atk++) {
      session.tapAction('attack', 2, 1 / 60);
      session.stepFrames(10, 1 / 60);
    }
    session.stepFrames(210, 1 / 60); // 3.5s idle
    const gAny = session.game as unknown as {
      player: { getActiveVfxCounts: () => { slashTrails: number; afterimages: number } };
      particles: { getActiveCount: () => number };
    };
    assert.deepEqual(gAny.player.getActiveVfxCounts(), { slashTrails: 0, afterimages: 0 });
    assert.ok(
      gAny.particles.getActiveCount() <= 40,
      `Expected small ambient steady-state <= 40, got ${gAny.particles.getActiveCount()}`
    );
    assertDrawTraceValid(session.ctx.metrics, 'T4-01 full game');
  } finally {
    session.destroy();
  }
});

test('T4-02 (Acceptance Criterion 2): 12-skin full combat cycling executes with 0 uncaught exceptions, 0 console errors, and 0 NaN', async () => {
  await loadSkinVfxModule();
  const uncaught: unknown[] = [];
  const consoleErrors: unknown[] = [];
  const onUncaught = (err: unknown) => uncaught.push(err);
  const origConsoleError = console.error;
  process.on('uncaughtException', onUncaught);
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
    origConsoleError(...args);
  };

  const session = createHeadlessGame();
  try {
    for (const entry of ALL_12_SKINS) {
      session.ctx.resetTrace();
      session.game.setCharacter(entry.characterId, false);
      session.game.setSkin(entry.skinId, false);
      session.stepFrames(10, 1 / 60);
      assert.equal(session.getLatestHud().skinId, entry.skinId);

      session.game.startMode('training', false);
      // Stand up + 6-hit combo + jump + air attacks + dash + parry + [U] + [O] + [I]
      session.tapAction('attack', 2, 1 / 60);
      for (let h = 0; h < 6; h++) {
        session.tapAction('attack', 2, 1 / 60);
        session.stepFrames(14, 1 / 60);
      }
      session.tapAction('jump', 2, 1 / 60);
      session.stepFrames(4, 1 / 60);
      session.tapAction('attack', 2, 1 / 60);
      session.stepFrames(12, 1 / 60);
      session.tapAction('dash', 2, 1 / 60);
      session.tapAction('attack', 2, 1 / 60);
      session.stepFrames(12, 1 / 60);
      session.tapAction('parry', 2, 1 / 60);
      session.stepFrames(8, 1 / 60);
      session.tapAction('cryo', 2, 1 / 60);
      session.stepFrames(12, 1 / 60);
      session.tapAction('awaken', 2, 1 / 60);
      session.stepFrames(10, 1 / 60);
      session.tapAction('ultimate', 2, 1 / 60);
      session.stepFrames(175, 1 / 60);

      assert.equal(session.getLatestHud().skinId, entry.skinId);
      assert.equal(session.ctx.getSaveDepth(), 0, `${entry.key} unbalanced save/restore`);
      assertDrawTraceValid(session.ctx.metrics, `T4-02 ${entry.key}`);
      session.game.enterTitleState();
    }
    assert.equal(uncaught.length, 0, `Uncaught exceptions: ${uncaught.length}`);
    assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.length}`);
  } finally {
    process.off('uncaughtException', onUncaught);
    console.error = origConsoleError;
    session.destroy();
  }
});

test('T4-03 (R1 Visual Verification): Mock-Canvas2D draw trace + Pillow 13.0.0 generates 12 distinct skin PNGs + grid sheet (MAE > 1.5)', async () => {
  const mod = await loadSkinVfxModule();
  const outDir = DEFAULT_RENDER_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const nomedia = path.join(outDir, '.nomedia');
  if (!fs.existsSync(nomedia)) fs.writeFileSync(nomedia, '');

  const skinsPayload = ALL_12_SKINS.map((entry) => {
    const { payload, ctx } = buildSkinVisualSnapshot(entry, mod, 720, 480);
    assertDrawTraceValid(ctx.metrics, `T4-03 snapshot ${entry.key}`);
    return payload;
  });

  const tmpTracePath = path.join(outDir, '.tmp_traces.json');
  fs.writeFileSync(tmpTracePath, JSON.stringify({ skins: skinsPayload }), 'utf8');

  try {
    const pyScript = path.join(PROJECT_ROOT, 'tests', 'e2e', 'render-skins.py');
    const res = spawnSync(
      'python3',
      [pyScript, '--input', tmpTracePath, '--out-dir', outDir],
      { cwd: PROJECT_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    );
    assert.equal(res.status, 0, `render-skins.py failed (status=${res.status}): ${res.stdout}\n${res.stderr}`);
    const report = JSON.parse(res.stdout.trim()) as {
      ok: boolean;
      skin_count: number;
      grid_path: string;
      output_files: string[];
      blank_skins: string[];
      pairwise_mae_min: number;
      duplicate_pairs: Array<{ pair: [string, string]; mae: number }>;
    };
    assert.equal(report.ok, true);
    assert.equal(report.skin_count, 12);
    assert.equal(report.blank_skins.length, 0, `Blank skin renders: ${report.blank_skins.join(',')}`);
    assert.equal(
      report.duplicate_pairs.length,
      0,
      `Duplicate skin PNG pairs: ${JSON.stringify(report.duplicate_pairs)}`
    );
    assert.ok(report.pairwise_mae_min > 1.5, `Expected pairwise MAE > 1.5, got ${report.pairwise_mae_min}`);
    assert.ok(fs.existsSync(report.grid_path), 'Combined 4x3 grid PNG missing');
    for (const f of report.output_files) {
      assert.ok(fs.existsSync(f), `Missing rendered skin PNG: ${f}`);
    }
  } finally {
    if (fs.existsSync(tmpTracePath)) {
      fs.unlinkSync(tmpTracePath);
    }
  }
});

test('T4-04 (R3 Regression): combat against Enemy & Boss produces identical HP/posture/hitbox outcomes across all 3 skins', () => {
  for (const charId of CHARACTER_ORDER) {
    const skins = getSkinsForCharacter(charId);
    const baselineOutcomes: Array<{ enemyHp: number; bossHp: number; bossPosture: number }> = [];

    for (const sk of skins) {
      installDomShims();
      const origRandom = Math.random;
      Math.random = () => 0.5;
      try {
        const player = new Player();
        player.setCharacter(charId, sk.id);
        player.reset(500, false);
        const enemy = new Enemy('shield_guard', 575, true);
        const boss = new Boss('boss_haiku', 585);
        const particles = new ParticleSystem();
        const input = new InputHandler();
        const audio = new AudioEngine();
        const cam = new Camera();

        // Execute 4 deterministic ground strikes
        for (let stepIdx = 0; stepIdx < 120; stepIdx++) {
          if (stepIdx % 25 === 0) input.setVirtualAction('attack', true);
          else if (stepIdx % 25 === 2) input.setVirtualAction('attack', false);

          player.update({
            dt: 1 / 60,
            input,
            audio,
            particles,
            camera: cam,
            chair: null,
            iceWalls: [],
            magmaPillars: [],
            projectiles: [],
            trainingMode: false,
            hasActiveEnemies: true,
            onRequestUltimate: () => {},
            onRequestAwaken: () => {},
            onThunderBlinkHit: () => {},
            onCryoSummonChill: () => {},
            onSkillLinkWarp: () => null,
            onDetonateAllMarks: () => 0,
          });
          input.update(1 / 60);

          const hb = player.activeHitbox;
          if (hb) {
            for (const target of [enemy, boss]) {
              if (!hb.hitIds.has(target.id) && Math.abs(hb.x - target.x) <= hb.width * 0.65) {
                hb.hitIds.add(target.id);
                target.takeDamage(hb.damage, hb.knockX, hb.knockY, particles, audio, hb.heavy);
                if (target instanceof Boss) {
                  target.addPostureDamage(hb.heavy ? 24 : 12, particles, audio);
                }
              }
            }
          }
        }
        baselineOutcomes.push({
          enemyHp: Number(enemy.hp.toFixed(4)),
          bossHp: Number(boss.hp.toFixed(4)),
          bossPosture: Number(boss.posture.toFixed(4)),
        });
      } finally {
        Math.random = origRandom;
      }
    }

    for (let i = 1; i < baselineOutcomes.length; i++) {
      assert.deepEqual(
        baselineOutcomes[i],
        baselineOutcomes[0],
        `R3 gameplay mismatch on ${charId} skin #${i}`
      );
    }
  }
});

test('T4-05 (Title Stress): rapid 36-switch skin cycling on Title screen + React SSR stays synced and leak-free', () => {
  const session = createHeadlessGame();
  try {
    for (let round = 0; round < 3; round++) {
      for (const entry of ALL_12_SKINS) {
        session.game.setCharacter(entry.characterId, false);
        session.game.setSkin(entry.skinId, false);
        session.stepFrames(2, 1 / 60);
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
    }
    const gAny = session.game as unknown as {
      player: { slashTrails: unknown[]; afterimages: unknown[] };
    };
    assert.equal(gAny.player.slashTrails.length, 0);
    assert.equal(gAny.player.afterimages.length, 0);
    assertDrawTraceValid(session.ctx.metrics, 'T4-05 36-switch title stress');
  } finally {
    session.destroy();
  }
});

test('T4-06 (Multi-Mode Workload): story -> boss_rush -> endless -> training -> title with themed entities resets cleanly', async () => {
  await loadSkinVfxModule();
  const session = createHeadlessGame();
  try {
    const customModes = [
      ['story', 'kuro', 'radiant_seraph'],
      ['boss_rush', 'raijin', 'storm_shogun'],
      ['endless', 'kagura', 'frost_empress'],
      ['training', 'zero', 'astral_phantom'],
    ] as const;

    for (const [mode, charId, skinId] of customModes) {
      session.game.setCharacter(charId, false);
      session.game.setSkin(skinId, false);
      session.game.startMode(mode, false);
      session.tapAction('cryo', 2, 1 / 60);
      session.tapAction('attack', 2, 1 / 60);
      session.stepFrames(15, 1 / 60);
      assertDrawTraceValid(session.ctx.metrics, `T4-06 ${mode} ${charId}:${skinId}`);
    }

    // Exercise StageHazard, IceWall, MagmaPillar, Projectile rendering directly too
    const canvas = new MockCanvasElement(1280, 720);
    const ctx = canvas.getContext('2d')!;
    const ps = new ParticleSystem();
    const wall = new IceWall(400, 1, 'void');
    const PillarCtor = MagmaPillar as unknown as new (x: number, dir: 1 | -1, d: number, dmg: number, th?: string) => MagmaPillar;
    const pillar = new PillarCtor(500, 1, 0.02, 25, 'frostfire');
    const hazard = new StageHazard('void_rift', 600);
    const proj = new Projectile({
      x: 450,
      y: 450,
      vx: 400,
      vy: 0,
      radius: 30,
      damage: 20,
      kind: 'void_crescent',
      fromPlayer: true,
      color: '#a855f7',
      theme: 'astral',
    } as ConstructorParameters<typeof Projectile>[0]);

    wall.update(0.1, ps);
    pillar.update(0.1, ps);
    hazard.update(1.1, ps);
    proj.update(0.05);
    wall.render(ctx);
    pillar.render(ctx);
    hazard.render(ctx);
    proj.render(ctx);
    assertDrawTraceValid(canvas.ctx.metrics, 'T4-06 themed entities');

    session.game.enterTitleState();
    const gAny = session.game as unknown as {
      iceWalls: unknown[];
      magmaPillars: unknown[];
      projectiles: unknown[];
      stageHazards: unknown[];
      enemies: unknown[];
    };
    assert.equal(gAny.iceWalls.length, 0);
    assert.equal(gAny.magmaPillars.length, 0);
    assert.equal(gAny.projectiles.length, 0);
    assert.equal(gAny.stageHazards.length, 0);
    assert.equal(gAny.enemies.length, 0);
  } finally {
    session.destroy();
  }
});
