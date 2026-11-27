import { computeAnimeSprintStride, computeLandingCurve, sanitizeFinite } from './poseMath';
import type { CharacterPoseModule, PoseContext, PoseDraft } from './types';

/**
 * Mặc Tiên (Ink-Wash Grand Scholar) — Upright, poised calligraphy-master movement suite.
 * Stands tall and serene when idle or gliding, carrying the Giant Ink Brush angled gracefully
 * behind his shoulder rather than hunched forward like a spearman.
 */
export const mactienPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const breath = Math.sin(t * 3.1) * 1.1;
  const poiseSway = Math.sin(t * 1.6) * 0.012;

  switch (ctx.pose) {
    case 'idle':
      return {
        hip: { x: 0, y: -50.2 + breath },
        torsoLean: 0.03 + poiseSway,
        spineBend: 0.35,
        headTilt: -0.02,
        footL: { x: -13, y: 0 },
        footR: { x: 14, y: 0 },
        // Left hand poised near waist/sleeve, right hand resting Cự Bút angled behind shoulder
        handL: { x: -11, y: -51 + breath * 0.8 },
        handR: { x: 11, y: -62 + breath * 0.9 },
        weaponAngle: -2.14 + poiseSway * 1.4,
      };

    case 'run': {
      const k = computeAnimeSprintStride(ctx.walkPhase, {
        hipBaseX: 2,
        hipBaseY: -45.5,
        hipBounce: 1.5,
        strideRadius: 30,
        footLift: 17,
        driveBias: 0.52,
        torsoLeanBase: 0.22,
        torsoLeanBob: 0.025,
        spineBend: 0.5,
        leadArmX: 16,
        leadArmY: -56,
        leadArmSwing: 8,
        trailArmX: -20,
        trailArmY: -62,
        trailArmSwing: 4,
        weaponAngleBase: -2.48,
        weaponAngleSwing: 0.06,
      });
      return {
        ...k,
        headTilt: -0.05,
      };
    }

    case 'brake_skid':
      return {
        hip: { x: -4, y: -43 },
        torsoLean: -0.14,
        spineBend: -2.5,
        headTilt: 0.08,
        footL: { x: -18, y: 0 },
        footR: { x: 24, y: 0 },
        handL: { x: -20, y: -54 },
        handR: { x: 14, y: -60 },
        weaponAngle: -2.28,
      };

    case 'jump': {
      const tuck = Math.min(1, t / 0.14);
      const vyBoost =
        ctx.vy !== undefined && Number.isFinite(ctx.vy)
          ? Math.max(0, Math.min(1, -ctx.vy / 680))
          : 0.5;
      return {
        hip: { x: 1, y: -50 - tuck * (2.2 + vyBoost * 1.4) },
        torsoLean: 0.12,
        spineBend: 0.5,
        headTilt: -0.04,
        footL: { x: -15, y: -6 * tuck },
        footR: { x: 15, y: -(17 + vyBoost * 3) * tuck },
        handL: { x: 16, y: -64 },
        handR: { x: -10, y: -64 },
        weaponAngle: -2.32,
      };
    }

    case 'fall': {
      const sway = Math.sin(t * 6.2) * 1.2;
      const vyNorm =
        ctx.vy !== undefined && Number.isFinite(ctx.vy)
          ? Math.max(0, Math.min(1, ctx.vy / 650))
          : 0.45;
      return {
        hip: { x: 1, y: -49 + vyNorm * 1.4 },
        torsoLean: 0.08,
        spineBend: -0.8,
        headTilt: 0.04,
        footL: { x: -14, y: -12 + sway * 0.5 },
        footR: { x: 14, y: -5 - sway * 0.5 },
        handL: { x: 18, y: -66 + sway },
        handR: { x: -12, y: -66 - sway * 0.6 },
        weaponAngle: -2.22,
      };
    }

    case 'land': {
      const crouch = computeLandingCurve(t);
      return {
        hip: { x: 1, y: -50 + crouch * 11 },
        torsoLean: 0.08 + crouch * 0.16,
        spineBend: 0.6 + crouch * 0.8,
        headTilt: 0.02 + crouch * 0.06,
        footL: { x: -16 - crouch * 3, y: 0 },
        footR: { x: 18 + crouch * 3, y: 0 },
        handL: { x: -14 - crouch * 4, y: -52 + crouch * 8 },
        handR: { x: 12 + crouch * 3, y: -60 + crouch * 8 },
        weaponAngle: -2.18 - crouch * 0.18,
      };
    }

    case 'dash':
      return {
        hip: { x: 6, y: -44 },
        torsoLean: 0.42,
        spineBend: 1.0,
        headTilt: -0.1,
        footL: { x: -30, y: -4 },
        footR: { x: 24, y: -6 },
        handL: { x: 22, y: -58 },
        handR: { x: -24, y: -60 },
        weaponAngle: -2.68,
      };

    case 'parry':
      return {
        hip: { x: -2, y: -48 },
        torsoLean: -0.06,
        spineBend: -0.8,
        headTilt: 0.02,
        footL: { x: -17, y: 0 },
        footR: { x: 19, y: 0 },
        handL: { x: 14, y: -56 },
        handR: { x: 22, y: -64 },
        weaponAngle: -1.18,
      };
  }
};
