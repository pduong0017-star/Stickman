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

function computeChronoRingAngle(
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
 * Chrono (Chủ Nhân Thời Gian) — Poised Chronomancer stance controlling a floating
 * Chrono Chakram / Celestial Astrolabe. Distinct from katana/blade stances.
 */
export const chronoPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const walkPhase = sanitizeFinite(ctx.walkPhase, 0);
  const breathe = Math.sin(t * 2.9) * 1.6;
  const tickPulse = Math.sin(t * 5.8) * 0.8;

  switch (ctx.pose) {
    case 'idle': {
      // Poised upright Chronomancer: right hand raised forward guiding the spinning Chakram,
      // left hand poised near chest/waist as if measuring time.
      const hip = { x: 0, y: -47.6 + breathe };
      const torsoLean = 0.08;
      const handL = { x: -11, y: -61 + breathe * 0.9 };
      const handR = { x: 28, y: -64 + breathe * 1.1 + tickPulse };
      return {
        hip,
        torsoLean,
        spineBend: 0.8,
        headTilt: -0.03,
        footL: { x: -17, y: 0 },
        footR: { x: 18, y: 0 },
        handL,
        handR,
        weaponAngle: computeChronoRingAngle(hip, torsoLean, handR),
      };
    }

    case 'run': {
      // Sleek forward time-glide sprint: right arm swept back trailing the spinning Chakram,
      // left arm angled forward for balance.
      const k = computeAnimeSprintStride(walkPhase, {
        hipBaseX: 4,
        hipBaseY: -37.2,
        hipBounce: 1.6,
        strideRadius: 34,
        footLift: 19,
        driveBias: 0.54,
        torsoLeanBase: 0.64,
        torsoLeanBob: 0.025,
        spineBend: 1.1,
      });
      const armSwing = -Math.cos(walkPhase);
      const hipBounce = Math.abs(Math.sin(walkPhase)) * 1.6;
      const handL = { x: 24 + armSwing * 6, y: -56 + hipBounce * 0.7 };
      const handR = { x: -24 - armSwing * 5, y: -52 + hipBounce * 0.9 };
      return {
        hip: k.hip,
        torsoLean: k.torsoLean,
        spineBend: k.spineBend,
        headTilt: 0.14,
        footL: k.footL,
        footR: k.footR,
        handL,
        handR,
        weaponAngle: computeChronoRingAngle(k.hip, k.torsoLean, handR),
      };
    }

    case 'brake_skid': {
      const hip = { x: -4, y: -41 };
      const torsoLean = -0.22;
      const handL = { x: -20, y: -60 };
      const handR = { x: 26, y: -58 };
      return {
        hip,
        torsoLean,
        spineBend: -0.8,
        headTilt: 0.1,
        footL: { x: -20, y: 0 },
        footR: { x: 24, y: 0 },
        handL,
        handR,
        weaponAngle: computeChronoRingAngle(hip, torsoLean, handR),
      };
    }

    case 'jump': {
      const hip = { x: 1, y: -49 };
      const torsoLean = 0.18;
      const handL = { x: -16, y: -74 };
      const handR = { x: 24, y: -78 };
      return {
        hip,
        torsoLean,
        spineBend: 1.2,
        headTilt: -0.08,
        footL: { x: -14, y: -12 },
        footR: { x: 14, y: -22 },
        handL,
        handR,
        weaponAngle: computeChronoRingAngle(hip, torsoLean, handR),
      };
    }

    case 'fall': {
      const hip = { x: 0, y: -48 };
      const torsoLean = 0.12;
      const handL = { x: -22, y: -74 };
      const handR = { x: 28, y: -72 };
      return {
        hip,
        torsoLean,
        spineBend: 0.6,
        headTilt: 0.08,
        footL: { x: -16, y: -6 },
        footR: { x: 15, y: -14 },
        handL,
        handR,
        weaponAngle: computeChronoRingAngle(hip, torsoLean, handR),
      };
    }

    case 'land': {
      const crouch = computeLandingCurve(t);
      const hipY = -47.6 + crouch * 14.1;
      const hip = { x: 2, y: hipY };
      const torsoLean = 0.12 + crouch * 0.28;
      const handL = { x: -14 - crouch * 6, y: hipY - 13 };
      const handR = { x: 28 + crouch * 4, y: hipY - 14 };
      return {
        hip,
        torsoLean,
        spineBend: 0.9 + crouch * 0.8,
        headTilt: 0.04 + crouch * 0.1,
        footL: { x: -19 - crouch * 4, y: 0 },
        footR: { x: 20 + crouch * 4, y: 0 },
        handL,
        handR,
        weaponAngle: computeChronoRingAngle(hip, torsoLean, handR),
      };
    }

    case 'dash': {
      // Aerodynamic time-slip glide
      const hip = { x: 8, y: -35 };
      const torsoLean = 0.96;
      const handL = { x: -24, y: -56 };
      const handR = { x: 28, y: -52 };
      return {
        hip,
        torsoLean,
        spineBend: 1.5,
        headTilt: 0.24,
        footL: { x: -34, y: -12 },
        footR: { x: 18, y: -4 },
        handL,
        handR,
        weaponAngle: 0.15,
      };
    }

    case 'parry':
    default: {
      // Hold spinning Chrono Chakram vertically in front like a temporal shield
      const hip = { x: -2, y: -44 };
      const torsoLean = 0.04;
      const handL = { x: 14, y: -64 };
      const handR = { x: 26, y: -62 };
      return {
        hip,
        torsoLean,
        spineBend: 0.4,
        headTilt: 0.02,
        footL: { x: -20, y: 0 },
        footR: { x: 18, y: 0 },
        handL,
        handR,
        weaponAngle: -Math.PI * 0.5,
      };
    }
  }
};
