import { computeAnimeSprintStride, computeLandingCurve, sanitizeFinite } from './poseMath';
import type { CharacterPoseModule, PoseContext, PoseDraft } from './types';

/**
 * Zero (Twin-Dagger Shadow Assassin · twin_daggers / void_sabers)
 *
 * Anime Fighting / Hyuns Dojo shinobi-assassin silhouette:
 * - Razor-low panther center of gravity (`idle.hip.y = -40`), wide agile base, reverse-grip twin blades.
 * - Extreme 47° shinobi sprint (`torsoLean ≈ 0.82` rad, `strideSpan >= 58px`) with both arms swept cleanly
 *   backward-low so neither dagger clips the face or chest.
 * - Ultra-low shadow-skim `dash` (`hip.y = -30`, `torsoLean = 1.02` rad).
 * - Coiled somersault `jump`, predatory hawk-dive `fall`, cat-crouch `land` (`computeLandingCurve(t, 0.16)`),
 *   tight X-scissor `parry` (`handL` above `handR` so `weaponAngle + 0.55` & `weaponAngle` cross cleanly),
 *   and low shinobi slide-halt `brake_skid`.
 */
export const zeroPoses: CharacterPoseModule = (ctx: PoseContext): PoseDraft => {
  const t = Math.max(0, sanitizeFinite(ctx.t, 0));
  const breath = Math.sin(t * 4.8) * 1.0;

  switch (ctx.pose) {
    case 'idle':
      return {
        hip: { x: 2, y: -47.2 + breath },
        torsoLean: 0.16,
        spineBend: 1.2,
        headTilt: -0.14,
        footL: { x: -16, y: 0 },
        footR: { x: 18, y: 0 },
        // handL at mid/back guard, handR poised low-forward; reverse-grip blades swept cleanly away from head
        handL: { x: -14, y: -50 + breath },
        handR: { x: 22, y: -44 + breath },
        weaponAngle: 2.68,
        kneeBendL: -1,
        kneeBendR: -1,
      };

    case 'run': {
      const k = computeAnimeSprintStride(ctx.walkPhase, {
        hipBaseX: 5,
        hipBaseY: -36.5,
        hipBounce: 1.8,
        strideRadius: 34,
        footLift: 19,
        driveBias: 0.62,
        torsoLeanBase: 0.68,
        torsoLeanBob: 0.035,
        spineBend: 1.2,
        // Both hands kept cleanly behind torso & well within 37.4px of rotated shoulders
        leadArmX: -2,
        leadArmY: -49,
        leadArmSwing: 5,
        trailArmX: -30,
        trailArmY: -52,
        trailArmSwing: 4.5,
        weaponAngleBase: -2.85,
        weaponAngleSwing: 0.08,
      });
      return {
        ...k,
        headTilt: -0.24,
        kneeBendL: -1,
        kneeBendR: -1,
      };
    }

    case 'brake_skid':
      return {
        hip: { x: -5, y: -33 },
        torsoLean: -0.22,
        spineBend: -3,
        headTilt: 0.16,
        footL: { x: -20, y: 0 },
        footR: { x: 27, y: 0 },
        // Low shinobi slide-halt: rear hand flared back for balance, front hand braced forward-low
        handL: { x: -28, y: -46 },
        handR: { x: 16, y: -46 },
        weaponAngle: 0.42,
        kneeBendL: -1,
        kneeBendR: -1,
      };

    case 'jump': {
      const tuck = Math.min(1, t / 0.12);
      return {
        hip: { x: 2, y: -48 - tuck * 4 },
        torsoLean: 0.42,
        spineBend: 1.2,
        headTilt: -0.16,
        // Tight somersault-coiled shinobi knee tuck
        footL: { x: -13, y: -27 * tuck },
        footR: { x: 15, y: -22 * tuck },
        // Twin daggers tucked cleanly behind core with zero torso/head clipping
        handL: { x: -14, y: -62 },
        handR: { x: -8, y: -53 },
        weaponAngle: -2.85,
        kneeBendL: -1,
        kneeBendR: -1,
      };
    }

    case 'fall': {
      const sway = Math.sin(t * 8.2) * 1.4;
      return {
        hip: { x: 2, y: -46 },
        torsoLean: 0.48,
        spineBend: 1.2,
        headTilt: 0.04,
        // Poised hawk-dive legs ready to absorb touchdown
        footL: { x: -18, y: -12 + sway },
        footR: { x: 14, y: -20 - sway },
        // Twin daggers flared cleanly behind torso like hawk wings
        handL: { x: -15, y: -59 },
        handR: { x: -10, y: -50 },
        weaponAngle: -2.75,
        kneeBendL: -1,
        kneeBendR: -1,
      };
    }

    case 'land': {
      const c = computeLandingCurve(t, 0.16);
      return {
        hip: { x: 2, y: -40 + c * 10 },
        torsoLean: 0.35 + c * 0.36,
        spineBend: 1.2 + c * 8,
        headTilt: -0.14 - c * 0.12,
        // Wide low cat-crouch shock absorb rebounding smoothly to idle stance
        footL: { x: -22 - c * 5, y: 0 },
        footR: { x: 23 + c * 5, y: 0 },
        handL: { x: -14, y: -50 + c * 11 },
        handR: { x: 22, y: -44 + c * 12 },
        weaponAngle: 2.68 + c * 0.18,
        kneeBendL: -1,
        kneeBendR: -1,
      };
    }

    case 'dash': {
      const wind = Math.sin(t * 24) * 0.6;
      return {
        hip: { x: 16, y: -30 },
        torsoLean: 1.05,
        spineBend: 1.2,
        headTilt: -0.35,
        footL: { x: -33, y: -15 },
        footR: { x: -27, y: -10 },
        // Ultra-low shadow-skim: both arms & daggers streaming straight back behind torso
        handL: { x: 4, y: -40 + wind },
        handR: { x: 8, y: -33 - wind },
        weaponAngle: -3.02,
        kneeBendL: -1,
        kneeBendR: -1,
        motionArc: { x: -6, y: -36, r: 42, sa: 2.25, ea: 3.85 },
      };
    }

    case 'parry':
      return {
        hip: { x: 3, y: -36 },
        torsoLean: 0.22,
        spineBend: 1.2,
        headTilt: -0.08,
        footL: { x: -24, y: 0 },
        footR: { x: 25, y: 0 },
        // handL placed above handR so (weaponAngle + 0.55) and (weaponAngle) cross tightly in an X-scissor
        handL: { x: 20, y: -66 },
        handR: { x: 21, y: -50 },
        weaponAngle: -1.12,
        kneeBendL: -1,
        kneeBendR: -1,
      };
  }
};

