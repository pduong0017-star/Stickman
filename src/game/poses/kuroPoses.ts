import { computeAnimeSprintStride, computeLandingCurve, sanitizeFinite } from './poseMath';
import type { CharacterPoseModule, PoseContext, PoseDraft } from './types';

/**
 * Kuro (Iaido Swordsman) — Anime Fighting / Hyuns Dojo movement & stance suite.
 * Coiled low Iaido readiness (left hand resting on waist scabbard), razor-sharp
 * shinobi-samurai sprint, flat flash-step dash, front-knee-tuck aerials,
 * single-knee-drop landing absorb, two-handed diagonal deflection parry, and
 * heel-digging friction skid.
 */
export const kuroPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const breath = Math.sin(t * 3.8) * 1.3;
  const poiseSway = Math.sin(t * 1.9) * 0.015;

  switch (ctx.pose) {
    case 'idle':
      return {
        hip: { x: 0, y: -47.2 + breath },
        torsoLean: 0.16 + poiseSway,
        spineBend: 1.2,
        headTilt: -0.06,
        footL: { x: -16, y: 0 },
        footR: { x: 18, y: 0 },
        handL: { x: 5, y: -39 + breath * 0.85 },
        handR: { x: 17, y: -45 + breath * 0.9 },
        weaponAngle: -0.24 + poiseSway,
      };

    case 'run': {
      const k = computeAnimeSprintStride(ctx.walkPhase, {
        hipBaseX: 4,
        hipBaseY: -36.5,
        hipBounce: 1.8,
        strideRadius: 34,
        footLift: 19,
        driveBias: 0.56,
        torsoLeanBase: 0.68,
        torsoLeanBob: 0.035,
        spineBend: 1.2,
        leadArmX: 22,
        leadArmY: -55,
        leadArmSwing: 11,
        trailArmX: -30,
        trailArmY: -52,
        trailArmSwing: 4,
        weaponAngleBase: -2.75,
        weaponAngleSwing: 0.08,
      });
      return {
        ...k,
        headTilt: -0.16,
      };
    }

    case 'brake_skid':
      return {
        hip: { x: -6, y: -37 },
        torsoLean: -0.26,
        spineBend: -5,
        headTilt: 0.14,
        footL: { x: -20, y: 0 },
        footR: { x: 26, y: 0 },
        handL: { x: -24, y: -50 },
        handR: { x: 16, y: -50 },
        weaponAngle: -0.78,
      };

    case 'jump': {
      const tuck = Math.min(1, t / 0.14);
      const vyBoost =
        ctx.vy !== undefined && Number.isFinite(ctx.vy)
          ? Math.max(0, Math.min(1, -ctx.vy / 680))
          : 0.5;
      return {
        hip: { x: 2, y: -48 - tuck * (2.5 + vyBoost * 1.5) },
        torsoLean: 0.3,
        spineBend: 1.2,
        headTilt: -0.1,
        footL: { x: -18, y: -7 * tuck },
        footR: { x: 18, y: -(20 + vyBoost * 3) * tuck },
        handL: { x: 22, y: -64 },
        handR: { x: -10, y: -54 },
        weaponAngle: -2.42,
      };
    }

    case 'fall': {
      const sway = Math.sin(t * 7.2) * 1.4;
      const vyNorm =
        ctx.vy !== undefined && Number.isFinite(ctx.vy)
          ? Math.max(0, Math.min(1, ctx.vy / 650))
          : 0.45;
      return {
        hip: { x: 2, y: -47 + vyNorm * 1.5 },
        torsoLean: 0.24 + vyNorm * 0.08,
        spineBend: 1.2,
        headTilt: 0.06,
        footL: { x: -18, y: -11 + sway - vyNorm * 2 },
        footR: { x: 17, y: -16 - sway - vyNorm * 2 },
        handL: { x: 19, y: -62 },
        handR: { x: 10, y: -44 },
        weaponAngle: -0.65,
      };
    }

    case 'land': {
      const c = computeLandingCurve(t, 0.16);
      return {
        hip: { x: c * 2, y: -43.5 + c * 13 },
        torsoLean: 0.22 + c * 0.34,
        spineBend: 1.2 + c * 6,
        headTilt: -0.06 - c * 0.06,
        footL: { x: -22 - c * 7, y: 0 },
        footR: { x: 24 + c * 3, y: 0 },
        handL: { x: 5 + c * 3, y: -39 + c * 7 },
        handR: { x: 17 - c * 25, y: -45 + c * 7 },
        weaponAngle: -0.24 - c * 2.28,
      };
    }

    case 'dash':
      return {
        hip: { x: 14, y: -33 },
        torsoLean: 1.05,
        spineBend: 1.2,
        headTilt: -0.3,
        footL: { x: -33, y: -15 },
        footR: { x: -27, y: -10 },
        handL: { x: 8, y: -58 },
        handR: { x: 16, y: -32 },
        weaponAngle: -2.92,
        motionArc: { x: -8, y: -40, r: 44, sa: 2.25, ea: 3.9 },
      };

    case 'parry':
      return {
        hip: { x: 4, y: -40 },
        torsoLean: 0.18,
        spineBend: 1.2,
        headTilt: -0.06,
        footL: { x: -24, y: 0 },
        footR: { x: 26, y: 0 },
        handL: { x: 20, y: -52 },
        handR: { x: 25, y: -62 },
        weaponAngle: -1.1,
      };
  }
};
