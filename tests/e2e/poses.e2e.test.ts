import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getCharacterDef } from '../../src/game/characters';
import { renderStickman, type SkeletonJoints, type StickmanRenderOptions } from '../../src/game/StickmanRenderer';
import { MockCanvasElement, installDomShims } from './helpers/mockCanvas';
import { assertDistinctSignatures, assertDrawTraceValid } from './helpers/assertions';
import {
  assertElbowContinuity,
  assertIKSegmentBounds,
  assertMaxJointDelta,
  assertNonInvertedKnees,
  assertSkeletonFinite,
  computeTorsoLeanRad,
  skeletonL2Distance,
  skeletonSignature,
} from './helpers/poseAssertions';
import {
  ALL_5_CHARACTERS,
  BASIC_POSES,
  DEFAULT_RENDER_DIR,
  PROJECT_ROOT,
  buildPoseSheetPayload,
  createTestPlayer,
  drivePlayerToPoseState,
  sampleCharacterPoseSkeleton,
} from './helpers/testHarness';

const T_SWEEP = [0, 0.03, 0.06, 0.12, 0.25, 0.5, 0.85, 1.0] as const;

// =========================================================================
// P1: Zero NaN / Infinity & Valid Draw Traces Across All 5×7 Poses
// =========================================================================

test('POSE-P1-01: All 5 characters × 7 basic poses stay 100% finite across t & walkPhase sweeps and render cleanly', () => {
  installDomShims();
  for (const charId of ALL_5_CHARACTERS) {
    const def = getCharacterDef(charId, 'default');
    for (const pose of BASIC_POSES) {
      for (const t of T_SWEEP) {
        const phases = pose === 'run' ? 16 : 2;
        for (let pIdx = 0; pIdx < phases; pIdx++) {
          const walkPhase = (pIdx / phases) * Math.PI * 2;
          const joints = sampleCharacterPoseSkeleton(charId, pose, t, walkPhase);
          assertSkeletonFinite(joints, `POSE-P1-01 ${charId}:${pose} t=${t} wp=${walkPhase.toFixed(2)}`);
        }
      }

      const canvas = new MockCanvasElement(320, 260);
      const ctx = canvas.getContext('2d')!;
      const joints = sampleCharacterPoseSkeleton(charId, pose, 0.08, 0.45);
      const opts: StickmanRenderOptions & Record<string, unknown> = {
        x: 150,
        y: 205,
        facing: 1,
        pose: pose as StickmanRenderOptions['pose'],
        poseTime: 0.08,
        walkPhase: 0.45,
        bodyColor: def.bodyColor,
        glowColor: def.glowColor,
        headGear: def.headGear as StickmanRenderOptions['headGear'],
        weapon: def.weapon,
        darkAura: def.auraStyle,
        skinId: 'default',
        characterId: charId,
        jointsOverride: joints,
      };
      renderStickman(ctx, opts);
      assert.ok(canvas.ctx.commands.length >= 4, `${charId}:${pose} drew too few commands`);
      assertDrawTraceValid(canvas.ctx.metrics, `POSE-P1-01 ${charId}:${pose}`);
    }
  }
});

// =========================================================================
// P2: Torso Lean & Run Stride Width (Eliminating "Rón Rén" Posture)
// =========================================================================

test('POSE-P2-01: All 5 characters run pose has >= 0.48 rad forward lean, >= 50px stride, alternating lift (< -14) & ground plant (=== 0)', () => {
  const steps = 32;
  for (const charId of ALL_5_CHARACTERS) {
    let minStrideDiff = Infinity;
    let maxStrideX = 0;
    let minFootLY = Infinity;
    let maxFootLY = -Infinity;
    let minFootRY = Infinity;
    let maxFootRY = -Infinity;
    let peakLean = -Infinity;
    let leanSum = 0;

    for (let i = 0; i < steps; i++) {
      const wp = (i / steps) * Math.PI * 2;
      const j = sampleCharacterPoseSkeleton(charId, 'run', 0.25, wp);
      const lean = computeTorsoLeanRad(j);
      leanSum += lean;
      peakLean = Math.max(peakLean, lean);

      const strideX = Math.abs(j.footR.x - j.footL.x);
      maxStrideX = Math.max(maxStrideX, strideX);
      minStrideDiff = Math.min(minStrideDiff, strideX);

      minFootLY = Math.min(minFootLY, j.footL.y);
      maxFootLY = Math.max(maxFootLY, j.footL.y);
      minFootRY = Math.min(minFootRY, j.footR.y);
      maxFootRY = Math.max(maxFootRY, j.footR.y);
    }

    const meanLean = leanSum / steps;
    assert.ok(
      meanLean >= 0.48 && peakLean >= 0.48,
      `${charId} run torsoLean too upright (mean=${meanLean.toFixed(3)}, peak=${peakLean.toFixed(3)}, need >= 0.48 rad)`
    );
    assert.ok(
      maxStrideX >= 50,
      `${charId} run maxStrideX=${maxStrideX.toFixed(2)}px < 50px`
    );
    assert.ok(
      minFootLY < -14 && minFootRY < -14,
      `${charId} run lacks alternating foot lift (minL=${minFootLY.toFixed(2)}, minR=${minFootRY.toFixed(2)})`
    );
    assert.equal(maxFootLY, 0, `${charId} run footL must plant cleanly at y=0 (got ${maxFootLY})`);
    assert.equal(maxFootRY, 0, `${charId} run footR must plant cleanly at y=0 (got ${maxFootRY})`);
  }
});

test('POSE-P2-02: All 5 characters dash pose has aggressive forward torso lean (>= 0.72 rad) and forward hip offset', () => {
  for (const charId of ALL_5_CHARACTERS) {
    const idle = sampleCharacterPoseSkeleton(charId, 'idle', 0, 0);
    const dash = sampleCharacterPoseSkeleton(charId, 'dash', 0.08, 0);
    const dashLean = computeTorsoLeanRad(dash);
    assert.ok(
      dashLean >= 0.72,
      `${charId} dash torsoLean=${dashLean.toFixed(3)} rad < 0.72 rad`
    );
    assert.ok(
      dash.hip.x > idle.hip.x,
      `${charId} dash.hip.x (${dash.hip.x.toFixed(2)}) must exceed idle.hip.x (${idle.hip.x.toFixed(2)})`
    );
  }
});

// =========================================================================
// P3: Lowered Center of Gravity (land & dash vs idle) & Parry Stance
// =========================================================================

test('POSE-P3-01: All 5 characters land pose compresses COG (hip.y >= idle.hip.y + 7) at t in [0.02, 0.08] and rebounds cleanly', () => {
  for (const charId of ALL_5_CHARACTERS) {
    const idle = sampleCharacterPoseSkeleton(charId, 'idle', 0, 0);
    let peakLand: SkeletonJoints | null = null;
    for (const t of [0.02, 0.04, 0.06, 0.08]) {
      const cand = sampleCharacterPoseSkeleton(charId, 'land', t, 0);
      if (!peakLand || cand.hip.y > peakLand.hip.y) {
        peakLand = cand;
      }
    }
    assert.ok(peakLand, `${charId} land sample missing`);
    assert.ok(
      peakLand.hip.y >= idle.hip.y + 7,
      `${charId} land COG drop insufficient: peakLand.hip.y=${peakLand.hip.y.toFixed(2)} vs idle.hip.y=${idle.hip.y.toFixed(2)}`
    );
    assert.ok(
      peakLand.head.y > idle.head.y + 4,
      `${charId} land head.y (${peakLand.head.y.toFixed(2)}) must drop clearly below idle.head.y (${idle.head.y.toFixed(2)})`
    );

    const rebound = sampleCharacterPoseSkeleton(charId, 'land', 0.16, 0);
    assert.ok(
      rebound.hip.y < peakLand.hip.y - 1.5,
      `${charId} land must rebound upward by t=0.16 (peak=${peakLand.hip.y.toFixed(2)}, rebound=${rebound.hip.y.toFixed(2)})`
    );
  }
});

test('POSE-P3-02: All 5 characters dash lowers COG (hip.y >= idle.hip.y + 6) and parry forms wide grounded forward guard', () => {
  for (const charId of ALL_5_CHARACTERS) {
    const idle = sampleCharacterPoseSkeleton(charId, 'idle', 0, 0);
    const dash = sampleCharacterPoseSkeleton(charId, 'dash', 0.08, 0);
    assert.ok(
      dash.hip.y >= idle.hip.y + 6,
      `${charId} dash COG drop insufficient: dash.hip.y=${dash.hip.y.toFixed(2)} vs idle.hip.y=${idle.hip.y.toFixed(2)}`
    );
    assert.ok(
      dash.head.y > idle.head.y + 4,
      `${charId} dash head.y (${dash.head.y.toFixed(2)}) must drop below idle.head.y (${idle.head.y.toFixed(2)})`
    );

    const parry = sampleCharacterPoseSkeleton(charId, 'parry', 0.08, 0);
    const stanceWidth = Math.abs(parry.footR.x - parry.footL.x);
    const parryLean = computeTorsoLeanRad(parry);
    assert.ok(
      stanceWidth >= 40,
      `${charId} parry stance width ${stanceWidth.toFixed(2)}px < 40px`
    );
    assert.ok(
      parry.hip.y >= idle.hip.y + 2,
      `${charId} parry hip.y (${parry.hip.y.toFixed(2)}) must brace lower than idle (${idle.hip.y.toFixed(2)})`
    );
    assert.ok(
      parryLean >= 0.05,
      `${charId} parry torsoLean=${parryLean.toFixed(3)} rad < 0.05 rad`
    );
  }
});

// =========================================================================
// P4: IK Segment Bounds, Non-Inverted Knees, Elbow & Transition Continuity
// =========================================================================

test('POSE-P4-01: All 5 characters × 7 basic poses stay within clamped IK segment bounds', () => {
  for (const charId of ALL_5_CHARACTERS) {
    for (const pose of BASIC_POSES) {
      for (const t of T_SWEEP) {
        const phases = pose === 'run' ? 16 : 1;
        for (let pIdx = 0; pIdx < phases; pIdx++) {
          const wp = (pIdx / phases) * Math.PI * 2;
          const joints = sampleCharacterPoseSkeleton(charId, pose, t, wp);
          assertIKSegmentBounds(joints, `POSE-P4-01 ${charId}:${pose} t=${t} wp=${wp.toFixed(2)}`);
        }
      }
    }
  }
});

test('POSE-P4-02: Grounded/running knees bend forward (non-inverted) and elbows articulate continuously', () => {
  const groundedPoses = ['idle', 'run', 'land', 'parry'] as const;
  for (const charId of ALL_5_CHARACTERS) {
    for (const pose of groundedPoses) {
      const steps = pose === 'run' ? 32 : 8;
      for (let i = 0; i < steps; i++) {
        const t = pose === 'land' ? 0.02 + (i / steps) * 0.14 : (i / steps) * 0.4;
        const wp = pose === 'run' ? (i / steps) * Math.PI * 2 : 0;
        const joints = sampleCharacterPoseSkeleton(charId, pose, t, wp);
        assertNonInvertedKnees(joints, `POSE-P4-02 ${charId}:${pose}[${i}]`);
      }
    }

    // Check elbow continuity across 32-step run cycle
    const runSeq: SkeletonJoints[] = [];
    for (let i = 0; i < 32; i++) {
      runSeq.push(sampleCharacterPoseSkeleton(charId, 'run', 0.25, (i / 32) * Math.PI * 2));
    }
    assertElbowContinuity(runSeq, `POSE-P4-02 ${charId}:run`, 18);

    // Check elbow continuity across land compression + rebound
    const landSeq: SkeletonJoints[] = [];
    for (let i = 0; i <= 12; i++) {
      landSeq.push(sampleCharacterPoseSkeleton(charId, 'land', i * 0.015, 0));
    }
    assertElbowContinuity(landSeq, `POSE-P4-02 ${charId}:land`, 18);
  }
});

test('POSE-P4-03: Live Player state transitions (idle -> run -> dash -> jump -> fall -> land -> parry -> idle) have smooth < 22px per-substep delta', () => {
  // Matches Game.SIM_STEP = 1 / 120s fixed-substep simulation rate
  const dt = 1 / 120;
  for (const charId of ALL_5_CHARACTERS) {
    const { player, input, step } = createTestPlayer(charId, 'default');
    const history: Array<{ frame: number; pose: string; joints: SkeletonJoints }> = [];
    let frame = 0;

    const recordStep = (count: number) => {
      for (let i = 0; i < count; i++) {
        step(1, dt);
        frame++;
        assert.ok(player.blendedJoints, `${charId} step ${frame}: blendedJoints is null`);
        assertSkeletonFinite(player.blendedJoints, `${charId} step ${frame}`);
        assertIKSegmentBounds(player.blendedJoints, `${charId} step ${frame} (${player.getCurrentPose()})`);
        history.push({
          frame,
          pose: player.getCurrentPose(),
          joints: structuredClone(player.blendedJoints),
        });
      }
    };

    // 1. Idle
    recordStep(16);
    // 2. Run
    input.setVirtualAction('right', true);
    recordStep(36);
    // 3. Dash
    input.setVirtualAction('right', false);
    input.setVirtualAction('dash', true);
    recordStep(2);
    input.setVirtualAction('dash', false);
    recordStep(20);
    // 4. Jump -> Fall -> Land
    input.setVirtualAction('jump', true);
    recordStep(16);
    input.setVirtualAction('jump', false);
    let leftGround = !player.onGround;
    for (let i = 0; i < 240; i++) {
      recordStep(1);
      if (!player.onGround) leftGround = true;
      else if (leftGround && player.onGround) break;
    }
    recordStep(8);
    // 5. Parry -> Idle
    input.setVirtualAction('parry', true);
    recordStep(2);
    input.setVirtualAction('parry', false);
    recordStep(32);
    recordStep(24);

    for (let i = 1; i < history.length; i++) {
      assertMaxJointDelta(
        history[i - 1].joints,
        history[i].joints,
        22,
        `POSE-P4-03 ${charId} ${history[i - 1].pose}->${history[i].pose} step=${history[i].frame}`
      );
    }
  }
});

// =========================================================================
// P5: Cross-Character Distinctness & Live Player Pose Verification
// =========================================================================

test('POSE-P5-01: All 5 fighters produce distinct skeleton silhouettes across all 7 basic poses', () => {
  const sampleTiming: Record<(typeof BASIC_POSES)[number], { t: number; wp: number }> = {
    idle: { t: 0.25, wp: 0 },
    run: { t: 0.25, wp: 0.45 },
    dash: { t: 0.08, wp: 0 },
    jump: { t: 0.14, wp: 0 },
    fall: { t: 0.22, wp: 0 },
    land: { t: 0.04, wp: 0 },
    parry: { t: 0.08, wp: 0 },
  };

  for (const pose of BASIC_POSES) {
    const { t, wp } = sampleTiming[pose];
    const samples = ALL_5_CHARACTERS.map((charId) => {
      const joints = sampleCharacterPoseSkeleton(charId, pose, t, wp);
      return {
        charId,
        joints,
        signature: skeletonSignature(joints),
      };
    });

    assertDistinctSignatures(
      samples.map((s) => ({ id: `${s.charId}:${pose}`, signature: s.signature })),
      `POSE-P5-01 ${pose}`
    );

    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        const dist = skeletonL2Distance(samples[i].joints, samples[j].joints);
        assert.ok(
          dist >= 3.0,
          `POSE-P5-01 ${pose}: ${samples[i].charId} vs ${samples[j].charId} too similar (L2=${dist.toFixed(2)})`
        );
      }
    }
  }
});

test('POSE-P5-02: Live Player.getCurrentPose() & render() reach idle, run, dash, jump, fall, land, and parry for all 5 characters', () => {
  for (const charId of ALL_5_CHARACTERS) {
    for (const targetPose of BASIC_POSES) {
      const res = drivePlayerToPoseState(charId, targetPose);
      assert.equal(
        res.pose,
        targetPose,
        `POSE-P5-02 ${charId}: expected Player.getCurrentPose()==="${targetPose}", got "${res.pose}"`
      );
      assert.ok(res.joints, `POSE-P5-02 ${charId}:${targetPose} blendedJoints missing`);
      assertSkeletonFinite(res.joints, `POSE-P5-02 ${charId}:${targetPose}`);
      assertIKSegmentBounds(res.joints, `POSE-P5-02 ${charId}:${targetPose}`);
      assertDrawTraceValid(res.ctx.metrics, `POSE-P5-02 ${charId}:${targetPose}`);
      assert.ok(res.ctx.commands.length >= 4, `POSE-P5-02 ${charId}:${targetPose} drew too few commands`);
    }
  }
});

// =========================================================================
// Visual Verification: Pillow 5×7 Pose Sheet & Metrics
// =========================================================================

test('POSE-VISUAL-01: Pillow 5×7 pose sheet generates all_5_chars_poses_grid.png, 5 strips, and valid pose_metrics.json', () => {
  const posesOutDir = path.join(DEFAULT_RENDER_DIR, 'poses');
  fs.mkdirSync(posesOutDir, { recursive: true });
  const nomedia = path.join(posesOutDir, '.nomedia');
  if (!fs.existsSync(nomedia)) {
    fs.writeFileSync(nomedia, '');
  }

  const { payload, traces } = buildPoseSheetPayload(320, 260);
  assert.equal(payload.cells.length, 35);
  for (const tr of traces) {
    assertDrawTraceValid(tr.ctx.metrics, `POSE-VISUAL-01 ${tr.key}`);
  }

  const tmpTracePath = path.join(posesOutDir, '.tmp_pose_traces.json');
  fs.writeFileSync(tmpTracePath, JSON.stringify(payload), 'utf8');

  try {
    const pyScript = path.join(PROJECT_ROOT, 'tests', 'e2e', 'render-poses.py');
    const res = spawnSync(
      'python3',
      [pyScript, '--input', tmpTracePath, '--out-dir', posesOutDir],
      { cwd: PROJECT_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    );
    assert.equal(
      res.status,
      0,
      `render-poses.py failed (status=${res.status}): ${res.stdout}\n${res.stderr}`
    );
    const report = JSON.parse(res.stdout.trim()) as {
      ok: boolean;
      cell_count: number;
      grid_path: string;
      strip_paths: string[];
      blank_cells: string[];
      nan_cells: string[];
      min_intra_mae: number;
      low_diff_pairs: Array<{ characterId: string; pair: [string, string]; mae: number }>;
    };
    assert.equal(report.ok, true, `pose_metrics ok=false: ${JSON.stringify(report)}`);
    assert.equal(report.cell_count, 35);
    assert.equal(report.blank_cells.length, 0, `Blank cells: ${report.blank_cells.join(',')}`);
    assert.equal(report.nan_cells.length, 0, `NaN cells: ${report.nan_cells.join(',')}`);
    assert.equal(report.low_diff_pairs.length, 0, `Low-diff pose pairs: ${JSON.stringify(report.low_diff_pairs)}`);
    assert.ok(report.min_intra_mae > 1.0, `Expected min_intra_mae > 1.0, got ${report.min_intra_mae}`);
    assert.ok(fs.existsSync(report.grid_path), 'Missing all_5_chars_poses_grid.png');
    assert.equal(report.strip_paths.length, 5);
    for (const sp of report.strip_paths) {
      assert.ok(fs.existsSync(sp), `Missing strip PNG: ${sp}`);
    }
    assert.ok(fs.existsSync(path.join(posesOutDir, 'pose_metrics.json')), 'Missing pose_metrics.json');
  } finally {
    if (fs.existsSync(tmpTracePath)) {
      fs.unlinkSync(tmpTracePath);
    }
  }
});
