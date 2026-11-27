import assert from 'node:assert/strict';
import type { SkeletonJoints } from '../../../src/game/StickmanRenderer';
import type { Vec2 } from '../../../src/game/types';

export const JOINT_NAMES = [
  'hip',
  'spineMid',
  'neck',
  'head',
  'shoulderL',
  'elbowL',
  'handL',
  'shoulderR',
  'elbowR',
  'handR',
  'kneeL',
  'footL',
  'kneeR',
  'footR',
] as const;

export type JointName = (typeof JOINT_NAMES)[number];

export function vecDist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function cross2D(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function computeTorsoLeanRad(j: SkeletonJoints): number {
  return Math.atan2(j.neck.x - j.hip.x, j.hip.y - j.neck.y);
}

/**
 * P1: Every joint coordinate, weaponAngle, and optional motionArc must be finite.
 */
export function assertSkeletonFinite(j: SkeletonJoints, label: string): void {
  for (const name of JOINT_NAMES) {
    const pt = j[name];
    assert.ok(pt && typeof pt === 'object', `${label}: missing joint ${name}`);
    assert.ok(
      Number.isFinite(pt.x) && Number.isFinite(pt.y),
      `${label}: joint ${name} has non-finite coords (${String(pt.x)}, ${String(pt.y)})`
    );
  }
  assert.ok(
    Number.isFinite(j.weaponAngle),
    `${label}: weaponAngle is non-finite (${String(j.weaponAngle)})`
  );
  if (j.motionArc) {
    for (const field of ['x', 'y', 'r', 'sa', 'ea'] as const) {
      assert.ok(
        Number.isFinite(j.motionArc[field]),
        `${label}: motionArc.${field} is non-finite (${String(j.motionArc[field])})`
      );
    }
  }
}

/**
 * P4: IK segment reach & bone-length sanity bounds (eliminating stretched limbs).
 */
export function assertIKSegmentBounds(j: SkeletonJoints, label: string): void {
  const legL = vecDist(j.hip, j.footL);
  const legR = vecDist(j.hip, j.footR);
  const armL = vecDist(j.shoulderL, j.handL);
  const armR = vecDist(j.shoulderR, j.handR);
  const torso = vecDist(j.hip, j.neck);

  assert.ok(legL <= 51.5, `${label}: dist(hip, footL)=${legL.toFixed(2)} exceeds 51.5`);
  assert.ok(legR <= 51.5, `${label}: dist(hip, footR)=${legR.toFixed(2)} exceeds 51.5`);
  assert.ok(armL <= 37.5, `${label}: dist(shoulderL, handL)=${armL.toFixed(2)} exceeds 37.5`);
  assert.ok(armR <= 37.5, `${label}: dist(shoulderR, handR)=${armR.toFixed(2)} exceeds 37.5`);
  assert.ok(torso <= 35, `${label}: dist(hip, neck)=${torso.toFixed(2)} exceeds 35`);

  const thighL = vecDist(j.hip, j.kneeL);
  const shinL = vecDist(j.kneeL, j.footL);
  const thighR = vecDist(j.hip, j.kneeR);
  const shinR = vecDist(j.kneeR, j.footR);
  const upperL = vecDist(j.shoulderL, j.elbowL);
  const foreL = vecDist(j.elbowL, j.handL);
  const upperR = vecDist(j.shoulderR, j.elbowR);
  const foreR = vecDist(j.elbowR, j.handR);

  assert.ok(thighL <= 26.5 && shinL <= 26.5, `${label}: left leg segments out of bounds (${thighL.toFixed(2)}, ${shinL.toFixed(2)})`);
  assert.ok(thighR <= 26.5 && shinR <= 26.5, `${label}: right leg segments out of bounds (${thighR.toFixed(2)}, ${shinR.toFixed(2)})`);
  assert.ok(upperL <= 19.5 && foreL <= 19.5, `${label}: left arm segments out of bounds (${upperL.toFixed(2)}, ${foreL.toFixed(2)})`);
  assert.ok(upperR <= 19.5 && foreR <= 19.5, `${label}: right arm segments out of bounds (${upperR.toFixed(2)}, ${foreR.toFixed(2)})`);
}

/**
 * P4: Knees bend forward naturally in grounded/running poses (never inverted backward).
 */
export function assertNonInvertedKnees(j: SkeletonJoints, label: string): void {
  const minKneeLX = (j.hip.x + j.footL.x) * 0.5 - 3;
  const minKneeRX = (j.hip.x + j.footR.x) * 0.5 - 3;
  assert.ok(
    j.kneeL.x >= minKneeLX,
    `${label}: kneeL.x=${j.kneeL.x.toFixed(2)} < ${minKneeLX.toFixed(2)} (inverted knee)`
  );
  assert.ok(
    j.kneeR.x >= minKneeRX,
    `${label}: kneeR.x=${j.kneeR.x.toFixed(2)} < ${minKneeRX.toFixed(2)} (inverted knee)`
  );
}

/**
 * P4: Elbow continuity across consecutive sampled frames — no sudden flip inversions or snaps.
 */
export function assertElbowContinuity(
  sequence: SkeletonJoints[],
  label: string,
  maxElbowStepDelta = 20
): void {
  assert.ok(sequence.length >= 2, `${label}: expected >= 2 frames`);
  for (let i = 1; i < sequence.length; i++) {
    const prev = sequence[i - 1];
    const curr = sequence[i];

    const dL = vecDist(prev.elbowL, curr.elbowL);
    const dR = vecDist(prev.elbowR, curr.elbowR);
    assert.ok(
      dL < maxElbowStepDelta,
      `${label}[${i}]: elbowL jumped ${dL.toFixed(2)}px (limit ${maxElbowStepDelta})`
    );
    assert.ok(
      dR < maxElbowStepDelta,
      `${label}[${i}]: elbowR jumped ${dR.toFixed(2)}px (limit ${maxElbowStepDelta})`
    );

    // Check bend-direction stability when arm has significant bend (|cross| > 45)
    for (const side of ['L', 'R'] as const) {
      const shPrev = side === 'L' ? prev.shoulderL : prev.shoulderR;
      const elPrev = side === 'L' ? prev.elbowL : prev.elbowR;
      const haPrev = side === 'L' ? prev.handL : prev.handR;
      const shCurr = side === 'L' ? curr.shoulderL : curr.shoulderR;
      const elCurr = side === 'L' ? curr.elbowL : curr.elbowR;
      const haCurr = side === 'L' ? curr.handL : curr.handR;

      const crossPrev = cross2D(
        { x: elPrev.x - shPrev.x, y: elPrev.y - shPrev.y },
        { x: haPrev.x - elPrev.x, y: haPrev.y - elPrev.y }
      );
      const crossCurr = cross2D(
        { x: elCurr.x - shCurr.x, y: elCurr.y - shCurr.y },
        { x: haCurr.x - elCurr.x, y: haCurr.y - elCurr.y }
      );
      if (Math.abs(crossPrev) > 45 && Math.abs(crossCurr) > 45) {
        assert.ok(
          Math.sign(crossPrev) === Math.sign(crossCurr),
          `${label}[${i}]: elbow${side} bend inverted abruptly (${crossPrev.toFixed(1)} -> ${crossCurr.toFixed(1)})`
        );
      }
    }
  }
}

/**
 * P4: Frame-to-frame transition continuity across all 14 joints.
 */
export function assertMaxJointDelta(
  prev: SkeletonJoints,
  curr: SkeletonJoints,
  maxDelta: number,
  label: string
): void {
  let worstName: JointName = 'hip';
  let worstDelta = 0;
  for (const name of JOINT_NAMES) {
    const d = vecDist(prev[name], curr[name]);
    if (d > worstDelta) {
      worstDelta = d;
      worstName = name;
    }
  }
  assert.ok(
    worstDelta < maxDelta,
    `${label}: joint ${worstName} jumped ${worstDelta.toFixed(2)}px (must be < ${maxDelta})`
  );
}

export function skeletonSignature(j: SkeletonJoints): string {
  const coords = JOINT_NAMES.map((name) => `${name}:${j[name].x.toFixed(2)},${j[name].y.toFixed(2)}`).join('|');
  return `${coords}|w:${j.weaponAngle.toFixed(2)}`;
}

export function skeletonL2Distance(a: SkeletonJoints, b: SkeletonJoints): number {
  let sumSq = 0;
  for (const name of JOINT_NAMES) {
    const dx = a[name].x - b[name].x;
    const dy = a[name].y - b[name].y;
    sumSq += dx * dx + dy * dy;
  }
  return Math.sqrt(sumSq);
}
