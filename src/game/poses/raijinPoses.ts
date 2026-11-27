import { computeAnimeSprintStride, computeLandingCurve, sanitizeFinite } from './poseMath';
import type { CharacterPoseModule, PoseContext, PoseDraft } from './types';

/**
 * Raijin (Lightning Spearman) — Anime Fighting / Hyuns Dojo lancer movement & stance suite.
 * Wide grounded reach, aerodynamic sprint, horizontal dragon-skewer blitz, pole-vault jump,
 * dragoon dive, wide lancer brace landing, and diagonal cross-shaft parry guard.
 */
export const raijinPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const breath = Math.sin(t * 4.4) * 1.1;

  switch (ctx.pose) {
    case 'idle':
      return {
        hip: { x: 1, y: -47.2 + breath },
        torsoLean: 0.16,
        spineBend: 1.2,
        headTilt: -0.08,
        footL: { x: -16, y: 0 },
        footR: { x: 18, y: 0 },
        handL: { x: 20, y: -56 + breath },
        handR: { x: -8, y: -46 + breath },
        weaponAngle: -0.18,
      };

    case 'run': {
      const k = computeAnimeSprintStride(ctx.walkPhase, {
        hipBaseX: 5,
        hipBaseY: -36.5,
        hipBounce: 1.8,
        strideRadius: 34,
        footLift: 19,
        driveBias: 0.58,
        torsoLeanBase: 0.68,
        torsoLeanBob: 0.035,
        spineBend: 1.2,
        leadArmX: 19,
        leadArmY: -53,
        leadArmSwing: 12,
        trailArmX: -30,
        trailArmY: -52,
        trailArmSwing: 4,
        weaponAngleBase: -2.88,
        weaponAngleSwing: 0.05,
      });
      return {
        ...k,
        headTilt: -0.2,
      };
    }

    case 'brake_skid':
      return {
        hip: { x: -7, y: -36 },
        torsoLean: -0.32,
        spineBend: -6,
        headTilt: 0.16,
        footL: { x: -16, y: 0 },
        footR: { x: 28, y: 0 },
        handL: { x: -24, y: -48 },
        handR: { x: 10, y: -46 },
        weaponAngle: -0.82,
      };

    case 'jump': {
      const tuck = Math.min(1, t / 0.14);
      return {
        hip: { x: 4, y: -48 - tuck * 4 },
        torsoLean: 0.3,
        spineBend: 1.2,
        headTilt: -0.1,
        footL: { x: -24, y: -8 * tuck },
        footR: { x: 24, y: -26 * tuck },
        handL: { x: 22, y: -68 },
        handR: { x: -2, y: -52 },
        weaponAngle: -0.68,
      };
    }

    case 'fall': {
      const sway = Math.sin(t * 7.5) * 1.4;
      return {
        hip: { x: 2, y: -46 },
        torsoLean: 0.35,
        spineBend: 1.2,
        headTilt: 0.12,
        footL: { x: -16, y: -12 + sway },
        footR: { x: 18, y: -22 - sway },
        handL: { x: 18, y: -50 },
        handR: { x: -4, y: -62 },
        weaponAngle: 0.55,
      };
    }

    case 'land': {
      const c = computeLandingCurve(t, 0.16);
      return {
        hip: { x: 2, y: -43 + c * 13 },
        torsoLean: 0.24 + c * 0.26,
        spineBend: 1.2 + c * 7,
        headTilt: -0.08 - c * 0.06,
        footL: { x: -24 - c * 5, y: 0 },
        footR: { x: 25 + c * 5, y: 0 },
        handL: { x: 20 + c * 2, y: -56 + c * 10 },
        handR: { x: -8 - c * 4, y: -46 + c * 10 },
        weaponAngle: -0.18 - c * 0.56,
      };
    }

    case 'dash':
      return {
        hip: { x: 16, y: -32 },
        torsoLean: 1.05,
        spineBend: 1.2,
        headTilt: -0.32,
        footL: { x: -33, y: -15 },
        footR: { x: -27, y: -10 },
        handL: { x: 48, y: -43 },
        handR: { x: 64, y: -42 },
        weaponAngle: -0.05,
        motionArc: { x: -6, y: -38, r: 46, sa: 2.3, ea: 3.85 },
      };

    case 'parry':
      return {
        hip: { x: 3, y: -39 },
        torsoLean: 0.18,
        spineBend: 1.2,
        headTilt: -0.06,
        footL: { x: -25, y: 0 },
        footR: { x: 26, y: 0 },
        handL: { x: 24, y: -65 },
        handR: { x: 16, y: -48 },
        weaponAngle: -1.16,
      };
  }
};
