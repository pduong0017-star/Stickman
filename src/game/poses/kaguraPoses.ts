import { computeAnimeSprintStride, computeLandingCurve, sanitizeFinite } from './poseMath';
import type { CharacterPoseModule, PoseContext, PoseDraft } from './types';

/**
 * Kagura (Heavy Flame Nodachi Powerhouse) — Immovable grounded stance, surging
 * juggernaut sprint, low battering-ram dash, weighty aerial cleave coil,
 * ground-cracking landing squat, and two-handed iron-wall greatblade parry.
 */
export const kaguraPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const breath = Math.sin(t * 3.0) * 1.0;

  switch (ctx.pose) {
    case 'idle':
      return {
        hip: { x: -1, y: -47.2 + breath },
        torsoLean: 0.16,
        spineBend: 1.2,
        headTilt: -0.05,
        footL: { x: -16, y: 0 },
        footR: { x: 18, y: 0 },
        handL: { x: 19.5, y: -52 + breath },
        handR: { x: 13, y: -61 + breath },
        weaponAngle: -2.22,
      };

    case 'run': {
      const k = computeAnimeSprintStride(ctx.walkPhase, {
        hipBaseX: 4.5,
        hipBaseY: -36.5,
        hipBounce: 1.8,
        strideRadius: 34,
        footLift: 19,
        driveBias: 0.58,
        torsoLeanBase: 0.68,
        torsoLeanBob: 0.03,
        spineBend: 1.2,
        leadArmX: 19,
        leadArmY: -51,
        leadArmSwing: 11,
        trailArmX: -30,
        trailArmY: -52,
        trailArmSwing: 3.5,
        weaponAngleBase: -2.72,
        weaponAngleSwing: 0.06,
      });
      return {
        ...k,
        headTilt: -0.16,
      };
    }

    case 'brake_skid':
      return {
        hip: { x: -6, y: -35 },
        torsoLean: -0.26,
        spineBend: -5,
        headTilt: 0.14,
        footL: { x: -17, y: 0 },
        footR: { x: 28, y: 0 },
        handL: { x: 5, y: -49 },
        handR: { x: 18, y: -44 },
        weaponAngle: 0.36,
      };

    case 'jump': {
      const tuck = Math.min(1, t / 0.16);
      return {
        hip: { x: 1, y: -46 - tuck * 3.5 },
        torsoLean: 0.26,
        spineBend: 1.2,
        headTilt: -0.07,
        footL: { x: -17, y: -19 * tuck },
        footR: { x: 18, y: -11 * tuck },
        handL: { x: 15, y: -62 },
        handR: { x: 6, y: -68 },
        weaponAngle: -2.38,
      };
    }

    case 'fall': {
      const sway = Math.sin(t * 5.6) * 1.1;
      return {
        hip: { x: 2, y: -44 },
        torsoLean: 0.32,
        spineBend: 1.2,
        headTilt: 0.08,
        footL: { x: -21, y: -9 + sway },
        footR: { x: 21, y: -14 - sway },
        handL: { x: 24, y: -57 },
        handR: { x: 18, y: -66 },
        weaponAngle: -1.98,
      };
    }

    case 'land': {
      const c = computeLandingCurve(t, 0.16);
      return {
        hip: { x: -1 + c * 2, y: -42 + c * 14.5 },
        torsoLean: 0.18 + c * 0.34,
        spineBend: 1.2 + c * 9,
        headTilt: -0.05 - c * 0.08,
        footL: { x: -23 - c * 6, y: 0 },
        footR: { x: 24 + c * 6, y: 0 },
        handL: { x: 19.5 + c * 3.5, y: -52 + c * 13 },
        handR: { x: 13 + c * 3, y: -61 + c * 18 },
        weaponAngle: -2.22 + c * 0.42,
      };
    }

    case 'dash':
      return {
        hip: { x: 13, y: -32 },
        torsoLean: 1.05,
        spineBend: 1.2,
        headTilt: -0.28,
        footL: { x: -33, y: -15 },
        footR: { x: -27, y: -10 },
        handL: { x: 24, y: -41 },
        handR: { x: 5, y: -39 },
        weaponAngle: -2.86,
        motionArc: { x: -8, y: -38, r: 48, sa: 2.2, ea: 3.9 },
      };

    case 'parry':
      return {
        hip: { x: 0, y: -37 },
        torsoLean: 0.16,
        spineBend: 1.2,
        headTilt: -0.06,
        footL: { x: -29, y: 0 },
        footR: { x: 27, y: 0 },
        handL: { x: 21.5, y: -49 },
        handR: { x: 24, y: -65 },
        weaponAngle: -1.48,
      };
  }
};
