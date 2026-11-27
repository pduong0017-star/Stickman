import {
  ARM_MAX_REACH,
  ARM_MIN_REACH,
  FOREARM_LEN,
  TORSO_LEN,
  UPPER_ARM_LEN,
  clampToReach,
  computeAnimeSprintStride,
  computeLandingCurve,
  resolveElbowBendDir,
  sanitizeFinite,
  solveSafeTwoBoneIK,
} from './poseMath';
import type { Vec2 } from '../types';
import type { CharacterPoseModule, PoseContext, PoseDraft } from './types';

function computeForearmWeaponAngle(
  hip: Vec2,
  torsoLean: number,
  handR: Vec2,
  elbowBendR?: 1 | -1
): number {
  const sinL = Math.sin(torsoLean);
  const cosL = Math.cos(torsoLean);
  const neck = {
    x: hip.x + sinL * TORSO_LEN,
    y: hip.y - cosL * TORSO_LEN,
  };
  const shoulderR = {
    x: neck.x + (4 * cosL - 5 * sinL),
    y: neck.y + (4 * sinL + 5 * cosL),
  };
  const clampedHandR = clampToReach(shoulderR, handR, ARM_MIN_REACH, ARM_MAX_REACH);
  const elbowDirR = resolveElbowBendDir(shoulderR, clampedHandR, torsoLean, elbowBendR);
  const armR = solveSafeTwoBoneIK(shoulderR, clampedHandR, UPPER_ARM_LEN, FOREARM_LEN, elbowDirR);
  return sanitizeFinite(
    Math.atan2(armR.endEffector.y - armR.joint.y, armR.endEffector.x - armR.joint.x),
    0
  );
}

/**
 * Aether (VIP Arcane Battle Mage) — Regal, athletic martial-mage movement & stance suite.
 * Uses dual palm magic circles (arcane_hands / prismatic_hands) with forearm-aligned orb orientation.
 */
export const aetherPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const walkPhase = sanitizeFinite(ctx.walkPhase, 0);
  const hover = Math.sin(t * 3.4) * 1.8;

  switch (ctx.pose) {
    case 'idle': {
      const hip = { x: 0, y: -47.2 + hover };
      const torsoLean = 0.16;
      const handL = { x: 14, y: -62 + hover * 1.15 };
      const handR = { x: 31, y: -52 + hover * 0.85 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2,
        headTilt: -0.04,
        footL: { x: -19, y: 0 },
        footR: { x: 20, y: 0 },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
      };
    }

    case 'run': {
      const k = computeAnimeSprintStride(walkPhase, {
        hipBaseX: 4,
        hipBaseY: -36.5,
        hipBounce: 1.8,
        strideRadius: 34,
        footLift: 19,
        driveBias: 0.55,
        torsoLeanBase: 0.68,
        torsoLeanBob: 0.03,
        spineBend: 1.2,
        leadArmX: 28,
        leadArmY: -53,
        leadArmSwing: 11,
        trailArmX: -30,
        trailArmY: -52,
        trailArmSwing: 5,
      });
      return {
        ...k,
        headTilt: -0.16,
        weaponAngle: computeForearmWeaponAngle(k.hip, k.torsoLean, k.handR),
      };
    }

    case 'brake_skid': {
      const hip = { x: -5, y: -38 };
      const torsoLean = -0.24;
      const handL = { x: -24, y: -52 };
      const handR = { x: 22, y: -54 };
      return {
        hip,
        torsoLean,
        spineBend: -4,
        headTilt: 0.14,
        footL: { x: -19, y: 0 },
        footR: { x: 26, y: 0 },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
      };
    }

    case 'jump': {
      const tuck = Math.min(1, t / 0.16);
      const hip = { x: 1, y: -48 - tuck * 3 };
      const torsoLean = 0.24;
      const handL = { x: -20, y: -80 - tuck * 2 };
      const handR = { x: 28, y: -84 - tuck * 2 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2,
        headTilt: -0.08,
        footL: { x: -16, y: -7 * tuck },
        footR: { x: 20, y: -23 * tuck },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
      };
    }

    case 'fall': {
      const sway = Math.sin(t * 6.2) * 1.6;
      const hip = { x: 1, y: -48 };
      const torsoLean = 0.18;
      const handL = { x: -20, y: -60 - sway * 0.8 };
      const handR = { x: 32, y: -58 + sway * 0.8 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2,
        headTilt: 0.06,
        footL: { x: -16, y: -8 + sway },
        footR: { x: 15, y: -21 - sway },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
      };
    }

    case 'land': {
      const c = computeLandingCurve(t, 0.16);
      const hip = { x: 1, y: -45 + c * 13 };
      const torsoLean = 0.16 + c * 0.24;
      const handL = { x: -10 - c * 10, y: -56 + c * 15 };
      const handR = { x: 26 + c * 10, y: -53 + c * 14 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2 + c * 6,
        headTilt: -0.04 - c * 0.1,
        footL: { x: -21 - c * 7, y: 0 },
        footR: { x: 22 + c * 7, y: 0 },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
      };
    }

    case 'dash': {
      const hip = { x: 15, y: -34 };
      const torsoLean = 0.9;
      const handL = { x: 2, y: -44 };
      const handR = { x: 75, y: -47 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2,
        headTilt: -0.28,
        footL: { x: -33, y: -15 },
        footR: { x: -27, y: -10 },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
        motionArc: { x: 2, y: -44, r: 46, sa: 2.3, ea: 3.85 },
      };
    }

    case 'parry': {
      const hip = { x: 2, y: -40.5 };
      const torsoLean = 0.16;
      const handL = { x: 26, y: -64 };
      const handR = { x: 29, y: -51 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2,
        headTilt: -0.05,
        footL: { x: -22, y: 0 },
        footR: { x: 25, y: 0 },
        handL,
        handR,
        weaponAngle: computeForearmWeaponAngle(hip, torsoLean, handR),
      };
    }
  }
};
