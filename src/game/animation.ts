import type { CharacterId, SkinId, Vec2 } from './types';
import type { SkeletonJoints, SlashTrailStyle, StickPoseName } from './StickmanRenderer';
import {
  ARM_MAX_REACH,
  ARM_MIN_REACH,
  FOREARM_LEN,
  LEG_MAX_REACH,
  LEG_MIN_REACH,
  SHIN_LEN,
  THIGH_LEN,
  UPPER_ARM_LEN,
  clampToReach,
  computeAnimeSprintStride,
  resolveElbowBendDir,
  sanitizeFinite,
  sanitizeVec2,
  solveSafeTwoBoneIK,
} from './poses/poseMath';

/**
 * 3-phase anime martial-arts easing curve (Alan Becker / Hyun's Dojo style):
 *  - 0.00 -> 0.20: Anticipation coil-back (dips slightly negative for weight)
 *  - 0.20 -> 0.54: Explosive quintic snap through the strike arc (overshoots to 1.07)
 *  - 0.54 -> 1.00: Smooth elastic recoil & follow-through settle to 1.0
 */
export function animeSwingCurve(rawP: number): number {
  const p = Math.max(0, Math.min(1, rawP));
  if (p < 0.2) {
    const t = p / 0.2;
    return -0.14 * Math.sin(t * Math.PI * 0.5);
  }
  if (p < 0.54) {
    const t = (p - 0.2) / 0.34;
    // Fast ease-out cubic snap with slight overshoot
    const eased = 1 - Math.pow(1 - t, 3.2);
    return -0.14 + eased * 1.21;
  }
  const t = (p - 0.54) / 0.46;
  // Settle smoothly from 1.07 back to 1.0
  return 1.07 - 0.07 * (1 - Math.pow(1 - t, 2));
}

/**
 * Shortest-path angular interpolation wrapping across [-PI, PI] with finite guards.
 */
export function lerpAngle(a: number, b: number, t: number): number {
  const sa = sanitizeFinite(a, 0);
  const sb = sanitizeFinite(b, sa);
  const st = Math.max(0, Math.min(1, sanitizeFinite(t, 0)));
  let diff = ((sb - sa + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return sa + diff * st;
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  const sa = sanitizeVec2(a, { x: 0, y: 0 });
  const sb = sanitizeVec2(b, sa);
  return {
    x: sa.x + (sb.x - sa.x) * t,
    y: sa.y + (sb.y - sa.y) * t,
  };
}

/**
 * Smoothly blends two Stickman skeletons by interpolating primary anchors
 * and re-clamping/re-solving knees & elbows via safe 2-bone IK so limb lengths
 * never collapse mid-transition or produce NaN.
 */
export function blendSkeleton(
  prev: SkeletonJoints,
  target: SkeletonJoints,
  alpha: number
): SkeletonJoints {
  const t = Math.max(0, Math.min(1, sanitizeFinite(alpha, 1)));
  const hip = lerpVec2(prev.hip, target.hip, t);
  const spineMid = lerpVec2(prev.spineMid, target.spineMid, t);
  const neck = lerpVec2(prev.neck, target.neck, t);
  const head = lerpVec2(prev.head, target.head, t);
  const shoulderL = lerpVec2(prev.shoulderL, target.shoulderL, t);
  const shoulderR = lerpVec2(prev.shoulderR, target.shoulderR, t);

  const rawFootL = lerpVec2(prev.footL, target.footL, t);
  const rawFootR = lerpVec2(prev.footR, target.footR, t);
  const rawHandL = lerpVec2(prev.handL, target.handL, t);
  const rawHandR = lerpVec2(prev.handR, target.handR, t);

  const clampedFootL = clampToReach(hip, rawFootL, LEG_MIN_REACH, LEG_MAX_REACH);
  const clampedFootR = clampToReach(hip, rawFootR, LEG_MIN_REACH, LEG_MAX_REACH);
  const clampedHandL = clampToReach(shoulderL, rawHandL, ARM_MIN_REACH, ARM_MAX_REACH);
  const clampedHandR = clampToReach(shoulderR, rawHandR, ARM_MIN_REACH, ARM_MAX_REACH);

  const dxTorso = neck.x - hip.x;
  const dyTorso = hip.y - neck.y;
  const torsoLen = Math.hypot(dxTorso, dyTorso);
  const torsoLean = torsoLen > 1e-4 ? Math.atan2(dxTorso, dyTorso) : 0;

  const legL = solveSafeTwoBoneIK(hip, clampedFootL, THIGH_LEN, SHIN_LEN, -1);
  const legR = solveSafeTwoBoneIK(hip, clampedFootR, THIGH_LEN, SHIN_LEN, -1);

  const elbowDirL = resolveElbowBendDir(shoulderL, clampedHandL, torsoLean);
  const elbowDirR = resolveElbowBendDir(shoulderR, clampedHandR, torsoLean);
  const armL = solveSafeTwoBoneIK(shoulderL, clampedHandL, UPPER_ARM_LEN, FOREARM_LEN, elbowDirL);
  const armR = solveSafeTwoBoneIK(shoulderR, clampedHandR, UPPER_ARM_LEN, FOREARM_LEN, elbowDirR);

  return {
    hip,
    spineMid,
    neck,
    head,
    shoulderL,
    elbowL: armL.joint,
    handL: armL.endEffector,
    shoulderR,
    elbowR: armR.joint,
    handR: armR.endEffector,
    kneeL: legL.joint,
    footL: legL.endEffector,
    kneeR: legR.joint,
    footR: legR.endEffector,
    weaponAngle: lerpAngle(prev.weaponAngle, target.weaponAngle, t),
    motionArc: target.motionArc,
  };
}

export interface RunStrideKinematics {
  hip: Vec2;
  torsoLean: number;
  spineBend: number;
  footL: Vec2;
  footR: Vec2;
  handL: Vec2;
  handR: Vec2;
  weaponAngle: number;
}

/**
 * Computes grounded, weighty anime martial-arts sprint kinematics via shared asymmetric stride solver.
 */
export function computeRunStrideKinematics(walkPhase: number): RunStrideKinematics {
  return computeAnimeSprintStride(walkPhase);
}

export type UltimateStyleId =
  | 'scarlet_sheath'
  | 'volt_judgment'
  | 'solar_inferno'
  | 'phantom_eclipse'
  | 'arcane_supernova'
  | 'valkyrie_ascension'
  | 'mirror_shatter'
  | 'time_stop'
  | 'spring_scroll';

export function getUltimateStyleId(characterId: CharacterId): UltimateStyleId {
  switch (characterId) {
    case 'raijin':
      return 'volt_judgment';
    case 'kagura':
      return 'solar_inferno';
    case 'zero':
      return 'phantom_eclipse';
    case 'aether':
      return 'arcane_supernova';
    case 'valkyrie':
      return 'valkyrie_ascension';
    case 'mirage':
      return 'mirror_shatter';
    case 'chrono':
      return 'time_stop';
    case 'mactien':
      return 'spring_scroll';
    case 'kuro':
    default:
      return 'scarlet_sheath';
  }
}

export interface AwakenedVisualProfile {
  formTitle: string;
  motif: 'blood_monarch' | 'storm_god' | 'solar_phoenix' | 'void_sovereign';
  scarfPrimary: string;
  scarfHighlight: string;
  upgradedSpecialName: string;
  auraAccent: string;
  transformationCallout: string;
}

export function getAwakenedVisualProfile(
  characterId: CharacterId,
  skinId: SkinId = 'default'
): AwakenedVisualProfile {
  switch (characterId) {
    case 'raijin':
      if (skinId === 'storm_shogun') {
        return {
          formTitle: 'LÔI THẦN TƯỚNG QUÂN',
          motif: 'storm_god',
          scarfPrimary: '#f8fafc',
          scarfHighlight: '#fde047',
          upgradedSpecialName: 'TƯỚNG LÔI THIỂM',
          auraAccent: '#facc15',
          transformationCallout: 'THỨC TỈNH: LÔI THẦN TƯỚNG QUÂN!',
        };
      }
      if (skinId === 'cyber_valkyrie') {
        return {
          formTitle: 'CHIẾN THẦN OVERDRIVE',
          motif: 'storm_god',
          scarfPrimary: '#0891b2',
          scarfHighlight: '#e879f9',
          upgradedSpecialName: 'XUNG LƯỢNG TỬ',
          auraAccent: '#e879f9',
          transformationCallout: 'THỨC TỈNH: OVERDRIVE MODE!',
        };
      }
      return {
        formTitle: 'LÔI THẦN GIÁNG THẾ',
        motif: 'storm_god',
        scarfPrimary: '#eab308',
        scarfHighlight: '#fef9c3',
        upgradedSpecialName: 'LÔI ĐÌNH',
        auraAccent: '#38bdf8',
        transformationCallout: 'THỨC TỈNH: LÔI THẦN!',
      };
    case 'kagura':
      if (skinId === 'solar_phoenix') {
        return {
          formTitle: 'THÁI DƯƠNG PHƯỢNG HOÀNG',
          motif: 'solar_phoenix',
          scarfPrimary: '#fef3c7',
          scarfHighlight: '#fde047',
          upgradedSpecialName: 'PHƯỢNG VŨ',
          auraAccent: '#facc15',
          transformationCallout: 'THỨC TỈNH: THÁI DƯƠNG PHƯỢNG HOÀNG!',
        };
      }
      if (skinId === 'frost_empress') {
        return {
          formTitle: 'BĂNG HỎA MA ĐẾ',
          motif: 'solar_phoenix',
          scarfPrimary: '#3b0764',
          scarfHighlight: '#67e8f9',
          upgradedSpecialName: 'THƯƠNG VIÊM',
          auraAccent: '#22d3ee',
          transformationCallout: 'THỨC TỈNH: BĂNG HỎA MA ĐẾ!',
        };
      }
      return {
        formTitle: 'VIÊM ĐẾ PHƯỢNG HOÀNG',
        motif: 'solar_phoenix',
        scarfPrimary: '#ea580c',
        scarfHighlight: '#fde047',
        upgradedSpecialName: 'HỎA NGỤC',
        auraAccent: '#f97316',
        transformationCallout: 'THỨC TỈNH: VIÊM ĐẾ!',
      };
    case 'zero':
      if (skinId === 'blood_moon') {
        return {
          formTitle: 'HUYẾT NGUYỆT SÁT THẦN',
          motif: 'void_sovereign',
          scarfPrimary: '#be123c',
          scarfHighlight: '#fecdd3',
          upgradedSpecialName: 'HUYẾT PHI ĐAO',
          auraAccent: '#f43f5e',
          transformationCallout: 'THỨC TỈNH: HUYẾT NGUYỆT SÁT THẦN!',
        };
      }
      if (skinId === 'astral_phantom') {
        return {
          formTitle: 'TINH VÂN CHÚA TỂ',
          motif: 'void_sovereign',
          scarfPrimary: '#4338ca',
          scarfHighlight: '#fde047',
          upgradedSpecialName: 'TINH PHI ĐAO',
          auraAccent: '#38bdf8',
          transformationCallout: 'THỨC TỈNH: TINH VÂN CHÚA TỂ!',
        };
      }
      return {
        formTitle: 'ẢNH VƯƠNG HƯ KHÔNG',
        motif: 'void_sovereign',
        scarfPrimary: '#059669',
        scarfHighlight: '#a7f3d0',
        upgradedSpecialName: 'THẬP TỰ ĐAO',
        auraAccent: '#10b981',
        transformationCallout: 'THỨC TỈNH: ẢNH VƯƠNG!',
      };
    case 'valkyrie':
      if (skinId === 'celestial_empress') {
        return {
          formTitle: 'NỮ HOÀNG TINH TÚ',
          motif: 'solar_phoenix',
          scarfPrimary: '#38bdf8',
          scarfHighlight: '#fde047',
          upgradedSpecialName: 'NGÂN HÀ PHÁN QUYẾT',
          auraAccent: '#38bdf8',
          transformationCallout: 'THỨC TỈNH: NỮ HOÀNG TINH TÚ!',
        };
      }
      if (skinId === 'abyssal_valkyrie') {
        return {
          formTitle: 'VALKYRIE HẮC ÁM',
          motif: 'blood_monarch',
          scarfPrimary: '#9f1239',
          scarfHighlight: '#e879f9',
          upgradedSpecialName: 'NHẬT THỰC PHÁN QUYẾT',
          auraAccent: '#f43f5e',
          transformationCallout: 'THỨC TỈNH: NỮ THẦN NHẬT THỰC!',
        };
      }
      return {
        formTitle: 'THÁNH QUANG CHIẾN THẦN',
        motif: 'solar_phoenix',
        scarfPrimary: '#f59e0b',
        scarfHighlight: '#fef9c3',
        upgradedSpecialName: 'THIÊN KÍCH THÁNH QUANG',
        auraAccent: '#fde047',
        transformationCallout: 'THỨC TỈNH: THÁNH QUANG CHIẾN THẦN!',
      };
    case 'mirage':
      if (skinId === 'void_shatterer') {
        return {
          formTitle: 'MA KÍNH HƯ KHÔNG',
          motif: 'void_sovereign',
          scarfPrimary: '#be123c',
          scarfHighlight: '#38bdf8',
          upgradedSpecialName: 'PHÁ KÍNH HƯ KHÔNG',
          auraAccent: '#f43f5e',
          transformationCallout: 'THỨC TỈNH: MA KÍNH HƯ KHÔNG!',
        };
      }
      return {
        formTitle: 'ẢNH KÍNH HƯ KHÔNG',
        motif: 'void_sovereign',
        scarfPrimary: '#6366f1',
        scarfHighlight: '#f1f5f9',
        upgradedSpecialName: 'VỠ KÍNH PHẢN XẠ',
        auraAccent: '#c084fc',
        transformationCallout: 'THỨC TỈNH: HƯ KHÔNG KÍNH GIỚI!',
      };
    case 'chrono':
      if (skinId === 'chrono_sovereign') {
        return {
          formTitle: 'CHÚA TỂ THÁP ĐỒNG HỒ',
          motif: 'void_sovereign',
          scarfPrimary: '#b45309',
          scarfHighlight: '#fef08a',
          upgradedSpecialName: 'BÁNH RĂNG VĨNH HẰNG',
          auraAccent: '#f59e0b',
          transformationCallout: 'BÀNH TRƯỚNG: THÁP ĐỒNG HỒ CỔ ĐẠI!',
        };
      }
      return {
        formTitle: 'ĐỒNG HỒ THỜI KHÔNG',
        motif: 'storm_god',
        scarfPrimary: '#115e59',
        scarfHighlight: '#99f6e4',
        upgradedSpecialName: 'NHỊP THỜI GIAN',
        auraAccent: '#2dd4bf',
        transformationCallout: 'THỨC TỈNH: ĐỒNG HỒ THỜI KHÔNG!',
      };
    case 'mactien':
      if (skinId === 'xuan_feng_sage') {
        return {
          formTitle: 'XUÂN PHONG VĂN THÁNH',
          motif: 'storm_god',
          scarfPrimary: '#f8fafc',
          scarfHighlight: '#5eead4',
          upgradedSpecialName: 'XUÂN PHONG · TĨNH ẤN',
          auraAccent: '#5eead4',
          transformationCallout: 'THỨC TỈNH: XUÂN PHONG · BẠCH NGỌC!',
        };
      }
      return {
        formTitle: 'KIM MẶC TIÊN BÚT',
        motif: 'solar_phoenix',
        scarfPrimary: '#78350f',
        scarfHighlight: '#fde047',
        upgradedSpecialName: 'KIM MẶC PHONG ẤN',
        auraAccent: '#f59e0b',
        transformationCallout: 'THỨC TỈNH: KIM MẶC TIÊN BÚT!',
      };
    case 'kuro':
    default:
      if (skinId === 'eclipse_ronin') {
        return {
          formTitle: 'NHẬT THỰC LÃNG KHÁCH',
          motif: 'blood_monarch',
          scarfPrimary: '#dc2626',
          scarfHighlight: '#facc15',
          upgradedSpecialName: 'NHẬT THỰC TRẢM',
          auraAccent: '#f97316',
          transformationCallout: 'THỨC TỈNH: NHẬT THỰC LÃNG KHÁCH!',
        };
      }
      if (skinId === 'radiant_seraph') {
        return {
          formTitle: 'ĐẠI THIÊN THẦN TỐI THƯỢNG',
          motif: 'blood_monarch',
          scarfPrimary: '#fef3c7',
          scarfHighlight: '#ffffff',
          upgradedSpecialName: 'THÁNH KIẾM TRẬN',
          auraAccent: '#facc15',
          transformationCallout: 'THỨC TỈNH: ĐẠI THIÊN THẦN!',
        };
      }
      if (skinId === 'void_walker') {
        return {
          formTitle: 'HƯ KHÔNG CHÚA TỂ',
          motif: 'blood_monarch',
          scarfPrimary: '#581c87',
          scarfHighlight: '#d8b4fe',
          upgradedSpecialName: 'XÉ HƯ KHÔNG',
          auraAccent: '#a855f7',
          transformationCallout: 'THỨC TỈNH: HƯ KHÔNG CHÚA TỂ!',
        };
      }
      return {
        formTitle: 'HUYẾT KIẾM MA VƯƠNG',
        motif: 'blood_monarch',
        scarfPrimary: '#b91c1c',
        scarfHighlight: '#fca5a5',
        upgradedSpecialName: 'BĂNG HUYẾT',
        auraAccent: '#ef4444',
        transformationCallout: 'THỨC TỈNH: HUYẾT KIẾM!',
      };
  }
}

export interface ComboMoveSpec {
  pose: StickPoseName;
  duration: number;
  cancelRatio: number; // fraction of duration after which next combo input flows seamlessly
  baseDamage: number;
  lungeSpeed: number;
  hopVy?: number; // expressive micro-hop for rising uppercuts & acrobatic vaults
  knockX: number;
  knockY: number;
  heavy: boolean;
  unblockable: boolean;
  afterimages: boolean;
  hitCount?: number; // multi-hit strikes (e.g. Zero twin daggers, Raijin spear flurry, Kagura spin)
  reachScale?: number; // weapon reach multiplier (Spear > Nodachi > Katana > Daggers)
  heightScale?: number; // vertical hitbox multiplier
  surroundHit?: boolean; // hits enemies both in front and behind (360° spins)
  passThrough?: boolean; // assassin blink/dash-through behind target on strike
  earthSlam?: boolean; // heavy weapon slams ground & spawns shock/flame burst
  zantetsuBurst?: boolean; // Iaido delayed spatial cross-cut ahead
  trailStyle?: SlashTrailStyle;
  slashArcs: Array<{
    sa: number;
    ea: number;
    radiusScale: number;
    yOffset: number;
    style?: SlashTrailStyle;
  }>;
}

export type AttackContext = 'ground' | 'air' | 'dash_slash' | 'parry_counter';

/**
 * Distinct Weapon-Class Martial Choreography per Fighter:
 * - KURO (Katana): Crisp Iaido horizontal draws, high kick link, & Zantetsu spatial resheath sever.
 * - RAIJIN (Volt Spear): Long-range linear sonic thrusts, piston multi-stabs, pole-vault & sky drill.
 * - KAGURA (Flame Nodachi): Heavy two-handed ground-dragging cleaves, earth-cratering slams & 360° cyclone.
 * - ZERO (Twin Daggers): Hyper-fast dual-hit X-scissor cuts, acrobatic buzzsaw flips & blink-behind execute.
 */
export function getComboMoveForCharacter(
  characterId: CharacterId,
  step: number,
  context: AttackContext,
  skinId: SkinId = 'default'
): ComboMoveSpec {
  if (context === 'dash_slash') {
    if (characterId === 'raijin') {
      return {
        pose: 'spear_dragon_pierce',
        duration: 0.23,
        cancelRatio: 0.48,
        baseDamage: 33,
        lungeSpeed: 640,
        knockX: 340,
        knockY: -140,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.6,
        heightScale: 0.78,
        trailStyle: 'spear_thrust',
        slashArcs: [{ sa: 0, ea: 0, radiusScale: 1.5, yOffset: -52, style: 'spear_thrust' }],
      };
    }
    if (characterId === 'zero') {
      return {
        pose: 'shadow_blink_cut',
        duration: 0.2,
        cancelRatio: 0.44,
        baseDamage: 19,
        hitCount: 2,
        lungeSpeed: 620,
        knockX: 260,
        knockY: -165,
        heavy: true,
        unblockable: false,
        afterimages: true,
        passThrough: true,
        trailStyle: 'twin_x',
        slashArcs: [{ sa: -0.6, ea: 0.6, radiusScale: 1.25, yOffset: -50, style: 'twin_x' }],
      };
    }
    if (characterId === 'kagura') {
      return {
        pose: 'nodachi_drag_cleave',
        duration: 0.28,
        cancelRatio: 0.52,
        baseDamage: 38,
        lungeSpeed: 500,
        knockX: 390,
        knockY: -220,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.32,
        heightScale: 1.3,
        earthSlam: true,
        trailStyle: 'heavy_cleave',
        slashArcs: [{ sa: 1.85, ea: -1.35, radiusScale: 1.38, yOffset: -48, style: 'heavy_cleave' }],
      };
    }
    if (characterId === 'mirage') {
      return {
        pose: 'shadow_blink_cut',
        duration: 0.21,
        cancelRatio: 0.46,
        baseDamage: 30,
        lungeSpeed: 615,
        knockX: 300,
        knockY: -175,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.36,
        trailStyle: 'mirror_fracture',
        slashArcs: [
          { sa: -0.25, ea: 0.25, radiusScale: 1.42, yOffset: -50, style: 'mirror_fracture' },
        ],
      };
    }
    if (characterId === 'chrono') {
      return {
        pose: 'dash_slash',
        duration: 0.22,
        cancelRatio: 0.46,
        baseDamage: 33,
        lungeSpeed: 605,
        knockX: 320,
        knockY: -175,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.38,
        trailStyle: 'chrono_clockwork_slash',
        slashArcs: [
          { sa: -0.22, ea: 0.22, radiusScale: 1.42, yOffset: -50, style: 'chrono_clockwork_slash' },
        ],
      };
    }
    if (characterId === 'mactien') {
      const isXuanFeng = skinId === 'xuan_feng_sage';
      return {
        pose: isXuanFeng ? 'scholar_dash_slash' : 'dash_slash',
        duration: 0.23,
        cancelRatio: 0.46,
        baseDamage: 32,
        lungeSpeed: 585,
        knockX: 335,
        knockY: -175,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.42,
        trailStyle: isXuanFeng ? 'xuan_feng_brush' : 'ink_brush_stroke',
        slashArcs: [
          isXuanFeng
            ? { sa: -0.95, ea: 0.85, radiusScale: 1.44, yOffset: -56, style: 'xuan_feng_brush' }
            : { sa: -1.15, ea: 0.95, radiusScale: 1.44, yOffset: -52, style: 'ink_brush_stroke' },
        ],
      };
    }
    // Kuro Iaido Dash-Slash
    return {
      pose: 'dash_slash',
      duration: 0.23,
      cancelRatio: 0.48,
      baseDamage: 32,
      lungeSpeed: 575,
      knockX: 310,
      knockY: -170,
      heavy: true,
      unblockable: false,
      afterimages: true,
      reachScale: 1.3,
      trailStyle: 'iaido_line',
      slashArcs: [{ sa: -0.1, ea: 0.1, radiusScale: 1.38, yOffset: -48, style: 'iaido_line' }],
    };
  }

  if (context === 'parry_counter') {
    if (characterId === 'raijin') {
      return {
        pose: 'spear_dragon_pierce',
        duration: 0.24,
        cancelRatio: 0.5,
        baseDamage: 45,
        lungeSpeed: 520,
        knockX: 440,
        knockY: -210,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.65,
        trailStyle: 'spear_thrust',
        slashArcs: [{ sa: -0.05, ea: -0.05, radiusScale: 1.55, yOffset: -52, style: 'spear_thrust' }],
      };
    }
    if (characterId === 'zero') {
      return {
        pose: 'cross_x_slash',
        duration: 0.22,
        cancelRatio: 0.48,
        baseDamage: 25,
        hitCount: 2,
        lungeSpeed: 480,
        knockX: 380,
        knockY: -240,
        heavy: true,
        unblockable: true,
        afterimages: true,
        passThrough: true,
        trailStyle: 'twin_x',
        slashArcs: [{ sa: -1.2, ea: 1.2, radiusScale: 1.32, yOffset: -52, style: 'twin_x' }],
      };
    }
    if (characterId === 'mirage') {
      return {
        pose: 'cross_x_slash',
        duration: 0.23,
        cancelRatio: 0.48,
        baseDamage: 46,
        hitCount: 2,
        lungeSpeed: 470,
        knockX: 430,
        knockY: -245,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.42,
        trailStyle: 'void_prism_fracture',
        slashArcs: [
          { sa: -0.42, ea: 0.42, radiusScale: 1.44, yOffset: -54, style: 'void_prism_fracture' },
          { sa: 0.38, ea: -0.38, radiusScale: 1.24, yOffset: -48, style: 'mirror_fracture' },
        ],
      };
    }
    if (characterId === 'chrono') {
      return {
        pose: 'parry_counter',
        duration: 0.24,
        cancelRatio: 0.48,
        baseDamage: 46,
        lungeSpeed: 465,
        knockX: 435,
        knockY: -245,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.44,
        trailStyle: 'chrono_sovereign_slash',
        slashArcs: [
          { sa: -1.85, ea: 1.05, radiusScale: 1.42, yOffset: -54, style: 'chrono_sovereign_slash' },
          { sa: -0.95, ea: 1.35, radiusScale: 1.18, yOffset: -48, style: 'chrono_clockwork_slash' },
        ],
      };
    }
    if (characterId === 'mactien') {
      const isXuanFeng = skinId === 'xuan_feng_sage';
      return {
        pose: isXuanFeng ? 'scholar_parry_counter' : 'parry_counter',
        duration: 0.25,
        cancelRatio: 0.48,
        baseDamage: 46,
        lungeSpeed: 450,
        knockX: 430,
        knockY: -235,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.46,
        trailStyle: isXuanFeng ? 'xuan_feng_brush' : 'ink_brush_stroke',
        slashArcs: [
          isXuanFeng
            ? { sa: -1.65, ea: 1.05, radiusScale: 1.46, yOffset: -58, style: 'xuan_feng_brush' }
            : { sa: -1.85, ea: 1.15, radiusScale: 1.46, yOffset: -54, style: 'ink_brush_stroke' },
        ],
      };
    }
    return {
      pose: characterId === 'kagura' ? 'nodachi_overhead_slam' : 'parry_counter',
      duration: characterId === 'kagura' ? 0.29 : 0.25,
      cancelRatio: 0.52,
      baseDamage: characterId === 'kagura' ? 52 : 44,
      lungeSpeed: 440,
      knockX: 440,
      knockY: -260,
      heavy: true,
      unblockable: true,
      afterimages: true,
      earthSlam: characterId === 'kagura',
      trailStyle: characterId === 'kagura' ? 'heavy_cleave' : 'arc',
      slashArcs: [
        { sa: -2.05, ea: 1.0, radiusScale: 1.38, yOffset: -56 },
        { sa: -1.1, ea: 1.4, radiusScale: 1.16, yOffset: -48 },
      ],
    };
  }

  // Distinct Weapon-Specific 3-Hit Air Combos!
  if (context === 'air') {
    const airIdx = ((Math.max(1, step) - 1) % 3) + 1;
    if (characterId === 'raijin') {
      if (airIdx === 1) {
        return {
          pose: 'spear_thrust',
          duration: 0.17,
          cancelRatio: 0.42,
          baseDamage: 20,
          lungeSpeed: 210,
          knockX: 155,
          knockY: -185,
          heavy: false,
          unblockable: false,
          afterimages: false,
          reachScale: 1.45,
          trailStyle: 'spear_thrust',
          slashArcs: [{ sa: 0, ea: 0, radiusScale: 1.25, yOffset: -56, style: 'spear_thrust' }],
        };
      }
      if (airIdx === 2) {
        return {
          pose: 'spear_flurry_thrust',
          duration: 0.22,
          cancelRatio: 0.45,
          baseDamage: 14,
          hitCount: 2,
          lungeSpeed: 195,
          knockX: 165,
          knockY: -250,
          heavy: false,
          unblockable: false,
          afterimages: true,
          reachScale: 1.4,
          trailStyle: 'spear_flurry',
          slashArcs: [{ sa: -0.2, ea: 0.2, radiusScale: 1.22, yOffset: -56, style: 'spear_flurry' }],
        };
      }
      return {
        pose: 'spear_air_dive',
        duration: 0.29,
        cancelRatio: 0.68,
        baseDamage: 38,
        lungeSpeed: 380,
        knockX: 310,
        knockY: 360,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.45,
        trailStyle: 'spear_thrust',
        slashArcs: [{ sa: 0.58, ea: 0.58, radiusScale: 1.38, yOffset: -44, style: 'spear_thrust' }],
      };
    }

    if (characterId === 'zero') {
      if (airIdx === 1) {
        return {
          pose: 'dagger_buzzsaw_flip',
          duration: 0.18,
          cancelRatio: 0.4,
          baseDamage: 13,
          hitCount: 2,
          lungeSpeed: 200,
          knockX: 135,
          knockY: -200,
          heavy: false,
          unblockable: false,
          afterimages: true,
          surroundHit: true,
          slashArcs: [
            { sa: -2.6, ea: 2.2, radiusScale: 1.05, yOffset: -54 },
            { sa: 0.5, ea: 3.6, radiusScale: 0.92, yOffset: -54 },
          ],
        };
      }
      if (airIdx === 2) {
        return {
          pose: 'cross_x_slash',
          duration: 0.18,
          cancelRatio: 0.42,
          baseDamage: 14,
          hitCount: 2,
          lungeSpeed: 215,
          knockX: 155,
          knockY: -265,
          heavy: false,
          unblockable: false,
          afterimages: true,
          trailStyle: 'twin_x',
          slashArcs: [{ sa: -1.1, ea: 1.1, radiusScale: 1.12, yOffset: -56, style: 'twin_x' }],
        };
      }
      return {
        pose: 'air_slam',
        duration: 0.27,
        cancelRatio: 0.66,
        baseDamage: 35,
        lungeSpeed: 260,
        knockX: 280,
        knockY: 350,
        heavy: true,
        unblockable: true,
        afterimages: true,
        trailStyle: 'twin_x',
        slashArcs: [{ sa: -1.2, ea: 1.2, radiusScale: 1.26, yOffset: -48, style: 'twin_x' }],
      };
    }

    if (characterId === 'mirage') {
      if (airIdx === 1) {
        return {
          pose: 'float_cast',
          duration: 0.18,
          cancelRatio: 0.42,
          baseDamage: 18,
          lungeSpeed: 190,
          knockX: 150,
          knockY: -195,
          heavy: false,
          unblockable: false,
          afterimages: true,
          reachScale: 1.25,
          trailStyle: 'mirror_fracture',
          slashArcs: [
            { sa: -0.35, ea: 0.35, radiusScale: 1.18, yOffset: -58, style: 'mirror_fracture' },
          ],
        };
      }
      if (airIdx === 2) {
        return {
          pose: 'dagger_buzzsaw_flip',
          duration: 0.2,
          cancelRatio: 0.44,
          baseDamage: 14,
          hitCount: 2,
          lungeSpeed: 215,
          knockX: 170,
          knockY: -265,
          heavy: false,
          unblockable: false,
          afterimages: true,
          surroundHit: true,
          reachScale: 1.26,
          trailStyle: 'mirror_fracture',
          slashArcs: [
            { sa: -0.5, ea: 0.5, radiusScale: 1.22, yOffset: -56, style: 'mirror_fracture' },
          ],
        };
      }
      return {
        pose: 'air_slam',
        duration: 0.28,
        cancelRatio: 0.66,
        baseDamage: 38,
        lungeSpeed: 255,
        knockX: 300,
        knockY: 360,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.35,
        trailStyle: 'void_prism_fracture',
        slashArcs: [
          { sa: -0.45, ea: 0.45, radiusScale: 1.38, yOffset: -48, style: 'void_prism_fracture' },
        ],
      };
    }

    if (characterId === 'chrono') {
      if (airIdx === 1) {
        return {
          pose: 'air_attack',
          duration: 0.18,
          cancelRatio: 0.42,
          baseDamage: 20,
          lungeSpeed: 185,
          knockX: 155,
          knockY: -195,
          heavy: false,
          unblockable: false,
          afterimages: true,
          reachScale: 1.24,
          trailStyle: 'chrono_clockwork_slash',
          slashArcs: [
            { sa: -1.65, ea: 0.95, radiusScale: 1.16, yOffset: -56, style: 'chrono_clockwork_slash' },
          ],
        };
      }
      if (airIdx === 2) {
        return {
          pose: 'air_attack_2',
          duration: 0.2,
          cancelRatio: 0.44,
          baseDamage: 14,
          hitCount: 2,
          lungeSpeed: 205,
          knockX: 175,
          knockY: -265,
          heavy: false,
          unblockable: false,
          afterimages: true,
          reachScale: 1.28,
          trailStyle: 'chrono_clockwork_slash',
          slashArcs: [
            { sa: -2.2, ea: 0.55, radiusScale: 1.24, yOffset: -58, style: 'chrono_clockwork_slash' },
          ],
        };
      }
      return {
        pose: 'air_slam',
        duration: 0.28,
        cancelRatio: 0.64,
        baseDamage: 38,
        lungeSpeed: 245,
        knockX: 300,
        knockY: 360,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.36,
        trailStyle: 'chrono_sovereign_slash',
        slashArcs: [
          { sa: -2.35, ea: 1.35, radiusScale: 1.38, yOffset: -48, style: 'chrono_sovereign_slash' },
        ],
      };
    }

    if (characterId === 'mactien') {
      const isXuanFeng = skinId === 'xuan_feng_sage';
      const inkStyle = isXuanFeng ? 'xuan_feng_brush' : 'ink_brush_stroke';
      if (airIdx === 1) {
        return {
          pose: 'air_attack',
          duration: 0.19,
          cancelRatio: 0.44,
          baseDamage: 20,
          lungeSpeed: 180,
          knockX: 165,
          knockY: -195,
          heavy: false,
          unblockable: false,
          afterimages: true,
          reachScale: 1.28,
          trailStyle: inkStyle,
          slashArcs: [
            isXuanFeng
              ? { sa: -1.25, ea: 0.92, radiusScale: 1.22, yOffset: -60, style: 'xuan_feng_brush' }
              : { sa: -1.45, ea: 1.05, radiusScale: 1.22, yOffset: -56, style: 'ink_brush_stroke' },
          ],
        };
      }
      if (airIdx === 2) {
        return {
          pose: 'air_attack_2',
          duration: 0.21,
          cancelRatio: 0.45,
          baseDamage: 23,
          lungeSpeed: 200,
          knockX: 185,
          knockY: -245,
          heavy: false,
          unblockable: false,
          afterimages: true,
          reachScale: 1.32,
          trailStyle: inkStyle,
          slashArcs: [
            isXuanFeng
              ? { sa: 1.45, ea: -1.1, radiusScale: 1.28, yOffset: -62, style: 'xuan_feng_brush' }
              : { sa: 1.65, ea: -1.25, radiusScale: 1.28, yOffset: -58, style: 'ink_brush_stroke' },
          ],
        };
      }
      return {
        pose: 'air_slam',
        duration: 0.28,
        cancelRatio: 0.62,
        baseDamage: 38,
        lungeSpeed: 240,
        knockX: 330,
        knockY: 360,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.4,
        trailStyle: inkStyle,
        slashArcs: [
          isXuanFeng
            ? { sa: -2.0, ea: 1.1, radiusScale: 1.42, yOffset: -52, style: 'xuan_feng_brush' }
            : { sa: -2.25, ea: 1.25, radiusScale: 1.42, yOffset: -48, style: 'ink_brush_stroke' },
        ],
      };
    }

    // Kuro & Kagura Air Combos (Kagura uses heavy_cleave molten arcs!)
    const isKagura = characterId === 'kagura';
    if (airIdx === 1) {
      return {
        pose: 'air_attack',
        duration: isKagura ? 0.22 : 0.19,
        cancelRatio: 0.44,
        baseDamage: isKagura ? 24 : 19,
        lungeSpeed: 165,
        knockX: 155,
        knockY: -195,
        heavy: isKagura,
        unblockable: false,
        afterimages: isKagura,
        reachScale: isKagura ? 1.25 : 1.0,
        trailStyle: isKagura ? 'heavy_cleave' : 'arc',
        slashArcs: [{ sa: -1.85, ea: 1.05, radiusScale: isKagura ? 1.22 : 1.04, yOffset: -56 }],
      };
    }
    if (airIdx === 2) {
      return {
        pose: 'air_attack_2',
        duration: isKagura ? 0.23 : 0.2,
        cancelRatio: 0.46,
        baseDamage: isKagura ? 28 : 23,
        lungeSpeed: 185,
        knockX: 175,
        knockY: -275,
        heavy: isKagura,
        unblockable: false,
        afterimages: true,
        reachScale: isKagura ? 1.25 : 1.0,
        trailStyle: isKagura ? 'heavy_cleave' : 'arc',
        slashArcs: [{ sa: -2.35, ea: 0.45, radiusScale: isKagura ? 1.26 : 1.12, yOffset: -60 }],
      };
    }
    return {
      pose: isKagura ? 'nodachi_earth_splitter' : 'air_slam',
      duration: isKagura ? 0.34 : 0.3,
      cancelRatio: 0.7,
      baseDamage: isKagura ? 44 : 36,
      lungeSpeed: 225,
      knockX: 310,
      knockY: 360,
      heavy: true,
      unblockable: true,
      afterimages: true,
      reachScale: isKagura ? 1.32 : 1.1,
      earthSlam: isKagura,
      trailStyle: isKagura ? 'heavy_cleave' : 'arc',
      slashArcs: [{ sa: -2.45, ea: 1.45, radiusScale: isKagura ? 1.42 : 1.28, yOffset: -48 }],
    };
  }

  // ============================================================================
  // 6-HIT GROUND COMBOS — 100% DISTINCT WEAPON CHOREOGRAPHY PER FIGHTER
  // ============================================================================
  const idx = ((Math.max(1, step) - 1) % 6) + 1;

  if (characterId === 'mactien') {
    // MẶC TIÊN — 4-HIT CALLIGRAPHY BRUSH COMBO: Nét Ngang -> Nét Sổ -> Nét Phẩy -> Ấn Triện Đỏ ("静")
    const isXuanFeng = skinId === 'xuan_feng_sage';
    const inkStyle = isXuanFeng ? 'xuan_feng_brush' : 'ink_brush_stroke';
    const inkIdx = ((Math.max(1, step) - 1) % 4) + 1;
    const mactienTable: Record<number, ComboMoveSpec> = {
      1: {
        // Hit 1: Nét Ngang (Horizontal Calligraphy Sweep)
        pose: isXuanFeng ? 'scholar_flick_1' : 'attack_1',
        duration: 0.19,
        cancelRatio: 0.4,
        baseDamage: 20,
        lungeSpeed: 255,
        knockX: 165,
        knockY: -80,
        heavy: false,
        unblockable: false,
        afterimages: false,
        reachScale: 1.3,
        trailStyle: inkStyle,
        slashArcs: [
          isXuanFeng
            ? { sa: -0.82, ea: 0.88, radiusScale: 1.32, yOffset: -56, style: 'xuan_feng_brush' }
            : { sa: -0.95, ea: 0.95, radiusScale: 1.32, yOffset: -52, style: 'ink_brush_stroke' },
        ],
      },
      2: {
        // Hit 2: Nét Sổ (Vertical Downward Brush Stroke)
        pose: isXuanFeng ? 'scholar_flick_2' : 'attack_2',
        duration: 0.2,
        cancelRatio: 0.42,
        baseDamage: 24,
        lungeSpeed: 270,
        knockX: 185,
        knockY: -105,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.34,
        trailStyle: inkStyle,
        slashArcs: [
          isXuanFeng
            ? { sa: -1.95, ea: 0.68, radiusScale: 1.34, yOffset: -60, style: 'xuan_feng_brush' }
            : { sa: -2.2, ea: 0.75, radiusScale: 1.34, yOffset: -56, style: 'ink_brush_stroke' },
        ],
      },
      3: {
        // Hit 3: Nét Phẩy (Diagonal Sweeping Flick)
        pose: isXuanFeng ? 'scholar_point_3' : 'attack_3',
        duration: 0.21,
        cancelRatio: 0.44,
        baseDamage: 27,
        lungeSpeed: 295,
        knockX: 225,
        knockY: -165,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.38,
        trailStyle: inkStyle,
        slashArcs: [
          isXuanFeng
            ? { sa: 1.3, ea: -1.25, radiusScale: 1.38, yOffset: -58, style: 'xuan_feng_brush' }
            : { sa: 1.45, ea: -1.4, radiusScale: 1.38, yOffset: -54, style: 'ink_brush_stroke' },
        ],
      },
      4: {
        // Hit 4: Ấn Triện Đỏ ("静") — Heavy Vermilion Seal Finisher + Knockback!
        pose: isXuanFeng ? 'scholar_palm_4' : 'nodachi_overhead_slam',
        duration: 0.29,
        cancelRatio: 0.62,
        baseDamage: 40,
        lungeSpeed: 340,
        knockX: 410,
        knockY: -205,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.46,
        trailStyle: inkStyle,
        slashArcs: [
          isXuanFeng
            ? { sa: -1.85, ea: 1.12, radiusScale: 1.48, yOffset: -56, style: 'xuan_feng_brush' }
            : { sa: -2.05, ea: 1.25, radiusScale: 1.48, yOffset: -52, style: 'ink_brush_stroke' },
        ],
      },
    };
    return mactienTable[inkIdx];
  }

  if (characterId === 'chrono') {
    // CHRONO — CLOCK HAND & TWIN HANDS: Precision temporal sweeps, pendulum cuts & Midnight XII sever!
    const chronoTable: Record<number, ComboMoveSpec> = {
      1: {
        // 1. Quét Luân Bàn Ngang (Horizontal Chakram Ring Sweep)
        pose: 'spin_slash',
        duration: 0.17,
        cancelRatio: 0.38,
        baseDamage: 19,
        lungeSpeed: 270,
        knockX: 160,
        knockY: -85,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.26,
        trailStyle: 'chrono_clockwork_slash',
        slashArcs: [
          { sa: -1.35, ea: 1.15, radiusScale: 1.26, yOffset: -52, style: 'chrono_clockwork_slash' },
        ],
      },
      2: {
        // 2. Phóng Luân Bàn Xoay (Mid-Range Spinning Chakram Throw & Recall)
        pose: 'spear_thrust',
        duration: 0.18,
        cancelRatio: 0.4,
        baseDamage: 22,
        lungeSpeed: 245,
        knockX: 185,
        knockY: -115,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.38,
        trailStyle: 'chrono_clockwork_slash',
        slashArcs: [
          { sa: -0.18, ea: 0.18, radiusScale: 1.46, yOffset: -52, style: 'chrono_clockwork_slash' },
        ],
      },
      3: {
        // 3. Búng Tay Kích Nổ Mặt Đồng Hồ (Temporal Dial Snap AoE — 2 hits!)
        pose: 'cryo_cast',
        duration: 0.21,
        cancelRatio: 0.42,
        baseDamage: 16,
        hitCount: 2,
        lungeSpeed: 260,
        knockX: 210,
        knockY: -155,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.34,
        trailStyle: 'chrono_clockwork_slash',
        slashArcs: [
          { sa: -3.14, ea: 3.14, radiusScale: 1.24, yOffset: -52, style: 'chrono_clockwork_slash' },
        ],
      },
      4: {
        // 4. Song Luân Giao Thoa (Intersecting Twin-Chakram Orbit — 2 hits surroundHit!)
        pose: 'cross_x_slash',
        duration: 0.22,
        cancelRatio: 0.44,
        baseDamage: 16,
        hitCount: 2,
        lungeSpeed: 280,
        hopVy: -140,
        knockX: 215,
        knockY: -215,
        heavy: false,
        unblockable: false,
        afterimages: true,
        surroundHit: true,
        reachScale: 1.32,
        trailStyle: 'chrono_clockwork_slash',
        slashArcs: [
          { sa: -1.25, ea: 1.15, radiusScale: 1.28, yOffset: -56, style: 'chrono_clockwork_slash' },
          { sa: 1.15, ea: -1.15, radiusScale: 1.18, yOffset: -46, style: 'chrono_clockwork_slash' },
        ],
      },
      5: {
        // 5. Thiên Luân Thăng Thiên (Ascending Astrolabe Vortex Launcher)
        pose: 'rising_dragon_slash',
        duration: 0.23,
        cancelRatio: 0.46,
        baseDamage: 28,
        lungeSpeed: 255,
        hopVy: -250,
        knockX: 195,
        knockY: -410,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.34,
        heightScale: 1.22,
        trailStyle: 'chrono_clockwork_slash',
        slashArcs: [
          { sa: 1.65, ea: -2.15, radiusScale: 1.34, yOffset: -60, style: 'chrono_clockwork_slash' },
        ],
      },
      6: {
        // 6. Thập Nhị Thời Khắc · Nhật Thực Luân Bàn (Unblockable XII Eclipse Dial Detonation!)
        pose: 'cryo_cast',
        duration: 0.3,
        cancelRatio: 0.58,
        baseDamage: 44,
        lungeSpeed: 390,
        knockX: 430,
        knockY: -245,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.54,
        heightScale: 1.2,
        zantetsuBurst: true,
        trailStyle: 'chrono_sovereign_slash',
        slashArcs: [
          { sa: -3.14, ea: 3.14, radiusScale: 1.48, yOffset: -52, style: 'chrono_sovereign_slash' },
          { sa: -0.22, ea: 0.22, radiusScale: 1.44, yOffset: -50, style: 'chrono_clockwork_slash' },
        ],
      },
    };
    return chronoTable[idx];
  }

  if (characterId === 'mirage') {
    // MIRAGE — MIRROR SHARDS & VOID PRISM: Sharp spatial fractures, shard fan volleys & rift shatter!
    const mirageTable: Record<number, ComboMoveSpec> = {
      1: {
        // 1. Prism Palm Fracture (Sharp spatial palm crack releasing forward prism shards)
        pose: 'cryo_cast',
        duration: 0.16,
        cancelRatio: 0.38,
        baseDamage: 18,
        lungeSpeed: 265,
        knockX: 150,
        knockY: -80,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.24,
        trailStyle: 'mirror_fracture',
        slashArcs: [
          { sa: -0.18, ea: 0.18, radiusScale: 1.22, yOffset: -52, style: 'mirror_fracture' },
        ],
      },
      2: {
        // 2. Shard Fan Volley (2-hit outward mirror shard fan cut)
        pose: 'dagger_reverse_slice',
        duration: 0.17,
        cancelRatio: 0.4,
        baseDamage: 12,
        hitCount: 2,
        lungeSpeed: 280,
        knockX: 165,
        knockY: -115,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.28,
        trailStyle: 'mirror_fracture',
        slashArcs: [
          { sa: -0.32, ea: 0.28, radiusScale: 1.24, yOffset: -56, style: 'mirror_fracture' },
          { sa: 0.24, ea: -0.24, radiusScale: 1.12, yOffset: -44, style: 'mirror_fracture' },
        ],
      },
      3: {
        // 3. Cross-Mirror Piercing Thrust (Intersecting dimensional glass cross-fracture)
        pose: 'cross_x_slash',
        duration: 0.2,
        cancelRatio: 0.42,
        baseDamage: 14,
        hitCount: 2,
        lungeSpeed: 300,
        knockX: 190,
        knockY: -145,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.32,
        trailStyle: 'void_prism_fracture',
        slashArcs: [
          { sa: -0.45, ea: 0.45, radiusScale: 1.3, yOffset: -52, style: 'void_prism_fracture' },
        ],
      },
      4: {
        // 4. Void Prism Spin (360° orbiting faceted glass shard ring)
        pose: 'spin_slash',
        duration: 0.22,
        cancelRatio: 0.44,
        baseDamage: 15,
        hitCount: 2,
        lungeSpeed: 270,
        hopVy: -155,
        knockX: 215,
        knockY: -220,
        heavy: false,
        unblockable: false,
        afterimages: true,
        surroundHit: true,
        reachScale: 1.3,
        trailStyle: 'mirror_fracture',
        slashArcs: [
          { sa: -0.4, ea: 0.4, radiusScale: 1.28, yOffset: -54, style: 'mirror_fracture' },
          { sa: 0.35, ea: -0.35, radiusScale: 1.15, yOffset: -48, style: 'mirror_fracture' },
        ],
      },
      5: {
        // 5. Shatter Barrage (3-hit rapid prism shatter launcher)
        pose: 'dagger_phantom_blitz',
        duration: 0.24,
        cancelRatio: 0.46,
        baseDamage: 10,
        hitCount: 3,
        lungeSpeed: 310,
        hopVy: -235,
        knockX: 195,
        knockY: -395,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.34,
        heightScale: 1.2,
        trailStyle: 'mirror_fracture',
        slashArcs: [
          { sa: -0.5, ea: 0.5, radiusScale: 1.34, yOffset: -58, style: 'mirror_fracture' },
        ],
      },
      6: {
        // 6. Spatial Rift Finisher (Unblockable void-prism dimensional shatter burst!)
        pose: 'cryo_punch',
        duration: 0.29,
        cancelRatio: 0.58,
        baseDamage: 42,
        lungeSpeed: 420,
        knockX: 430,
        knockY: -245,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.54,
        heightScale: 1.2,
        trailStyle: 'void_prism_fracture',
        slashArcs: [
          { sa: -0.32, ea: 0.32, radiusScale: 1.55, yOffset: -54, style: 'void_prism_fracture' },
          { sa: 0.28, ea: -0.28, radiusScale: 1.3, yOffset: -46, style: 'mirror_fracture' },
        ],
      },
    };
    return mirageTable[idx];
  }

  if (characterId === 'raijin') {
    // RAIJIN — VOLT SPEAR: Long-reach linear sonic thrusts, rapid multi-stabs & pole-vault!
    const raijinTable: Record<number, ComboMoveSpec> = {
      1: {
        // 1. Lôi Kích (Mid-level Sonic Spear Jab — long reach!)
        pose: 'spear_thrust',
        duration: 0.16,
        cancelRatio: 0.38,
        baseDamage: 19,
        lungeSpeed: 280,
        knockX: 150,
        knockY: -55,
        heavy: false,
        unblockable: false,
        afterimages: false,
        reachScale: 1.48,
        heightScale: 0.72,
        trailStyle: 'spear_thrust',
        slashArcs: [{ sa: -0.02, ea: -0.02, radiusScale: 1.28, yOffset: -56, style: 'spear_thrust' }],
      },
      2: {
        // 2. Song Thương Đột (Knee-drop Low Poke + High Snap — 2 hits!)
        pose: 'spear_jab_low',
        duration: 0.2,
        cancelRatio: 0.42,
        baseDamage: 13,
        hitCount: 2,
        lungeSpeed: 300,
        knockX: 155,
        knockY: -85,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.52,
        heightScale: 0.85,
        trailStyle: 'spear_thrust',
        slashArcs: [
          { sa: 0.12, ea: 0.12, radiusScale: 1.32, yOffset: -42, style: 'spear_thrust' },
          { sa: -0.14, ea: -0.14, radiusScale: 1.24, yOffset: -62, style: 'spear_thrust' },
        ],
      },
      3: {
        // 3. Bách Liệt Thương (Hundred-Spear Lightning Flurry — 3 rapid piercing hits!)
        pose: 'spear_flurry_thrust',
        duration: 0.27,
        cancelRatio: 0.48,
        baseDamage: 11,
        hitCount: 3,
        lungeSpeed: 240,
        knockX: 145,
        knockY: -115,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.55,
        heightScale: 1.05,
        trailStyle: 'spear_flurry',
        slashArcs: [{ sa: -0.25, ea: 0.25, radiusScale: 1.36, yOffset: -54, style: 'spear_flurry' }],
      },
      4: {
        // 4. Phi Thương Trụy (Acrobatic Pole-Vault Wide Halberd Sweep)
        pose: 'vault_spear_slam',
        duration: 0.24,
        cancelRatio: 0.46,
        baseDamage: 29,
        lungeSpeed: 320,
        hopVy: -240,
        knockX: 220,
        knockY: -220,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.38,
        slashArcs: [{ sa: -2.4, ea: 1.35, radiusScale: 1.34, yOffset: -54 }],
      },
      5: {
        // 5. Thăng Long Thương (Upward Spiral Sky-Drill Launcher!)
        pose: 'spear_sky_drill',
        duration: 0.22,
        cancelRatio: 0.46,
        baseDamage: 28,
        lungeSpeed: 250,
        hopVy: -285,
        knockX: 185,
        knockY: -435,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.42,
        heightScale: 1.25,
        trailStyle: 'spear_thrust',
        slashArcs: [{ sa: -0.68, ea: -0.68, radiusScale: 1.38, yOffset: -64, style: 'spear_thrust' }],
      },
      6: {
        // 6. Lôi Long Xuyên Phá (Full-extension Sonic Dragon Piercer across half the stage!)
        pose: 'spear_dragon_pierce',
        duration: 0.31,
        cancelRatio: 0.6,
        baseDamage: 44,
        lungeSpeed: 560,
        knockX: 460,
        knockY: -210,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.82,
        heightScale: 0.9,
        trailStyle: 'spear_thrust',
        slashArcs: [
          { sa: 0, ea: 0, radiusScale: 1.72, yOffset: -52, style: 'spear_thrust' },
        ],
      },
    };
    return raijinTable[idx];
  }

  if (characterId === 'zero') {
    // ZERO — TWIN DAGGERS: Blistering dual-blade multi-hits, buzzsaw cartwheels & blink-behind!
    const zeroTable: Record<number, ComboMoveSpec> = {
      1: {
        // 1. Song Ảnh X (Low Panther Twin-Scissor Lunge — 2 fast hits!)
        pose: 'shadow_blink_cut',
        duration: 0.15,
        cancelRatio: 0.36,
        baseDamage: 11,
        hitCount: 2,
        lungeSpeed: 340,
        knockX: 120,
        knockY: -70,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 0.96,
        trailStyle: 'twin_x',
        slashArcs: [{ sa: -1.1, ea: 1.1, radiusScale: 1.02, yOffset: -48, style: 'twin_x' }],
      },
      2: {
        // 2. Nghịch Đao Xé Gió (Reverse-Grip Outward Dual Rip)
        pose: 'dagger_reverse_slice',
        duration: 0.15,
        cancelRatio: 0.36,
        baseDamage: 19,
        lungeSpeed: 270,
        knockX: 145,
        knockY: -115,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 0.98,
        trailStyle: 'twin_x',
        slashArcs: [{ sa: 1.35, ea: -1.35, radiusScale: 1.06, yOffset: -52, style: 'twin_x' }],
      },
      3: {
        // 3. Ảnh Vũ Luân (Acrobatic Forward Buzzsaw Cartwheel — 2 hits 360°!)
        pose: 'dagger_buzzsaw_flip',
        duration: 0.21,
        cancelRatio: 0.42,
        baseDamage: 14,
        hitCount: 2,
        lungeSpeed: 310,
        hopVy: -195,
        knockX: 165,
        knockY: -195,
        heavy: false,
        unblockable: false,
        afterimages: true,
        surroundHit: true,
        slashArcs: [
          { sa: -2.6, ea: 2.1, radiusScale: 1.12, yOffset: -54 },
          { sa: 0.4, ea: 3.5, radiusScale: 0.94, yOffset: -54 },
        ],
      },
      4: {
        // 4. Loạn Ảnh Tứ Tuyệt (Phantom 4-Blade Blitz — 3 ultra-fast hits!)
        pose: 'dagger_phantom_blitz',
        duration: 0.22,
        cancelRatio: 0.44,
        baseDamage: 10,
        hitCount: 3,
        lungeSpeed: 330,
        knockX: 155,
        knockY: -145,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.04,
        trailStyle: 'twin_x',
        slashArcs: [
          { sa: -1.4, ea: 1.4, radiusScale: 1.1, yOffset: -54, style: 'twin_x' },
        ],
      },
      5: {
        // 5. Song Nha Thăng Thiên (Backflip Kick + Twin Rising Fangs)
        pose: 'air_attack_2',
        duration: 0.19,
        cancelRatio: 0.44,
        baseDamage: 26,
        lungeSpeed: 245,
        hopVy: -285,
        knockX: 165,
        knockY: -420,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [{ sa: 1.6, ea: -2.2, radiusScale: 1.14, yOffset: -60 }],
      },
      6: {
        // 6. Thập Tự Ám Sát (Blinks THROUGH enemy & carves a lethal X-Cross behind their back!)
        pose: 'cross_x_slash',
        duration: 0.25,
        cancelRatio: 0.54,
        baseDamage: 22,
        hitCount: 2,
        lungeSpeed: 460,
        knockX: 380,
        knockY: -235,
        heavy: true,
        unblockable: true,
        afterimages: true,
        passThrough: true,
        reachScale: 1.24,
        trailStyle: 'twin_x',
        slashArcs: [
          { sa: -1.4, ea: 1.4, radiusScale: 1.38, yOffset: -54, style: 'twin_x' },
        ],
      },
    };
    return zeroTable[idx];
  }

  if (characterId === 'kagura') {
    // KAGURA — FLAME NODACHI: Colossal two-handed sweeps, ground-cratering slams & 360° fire cyclone!
    const kaguraTable: Record<number, ComboMoveSpec> = {
      1: {
        // 1. Viêm Trảm Kéo Đất (Two-handed Ground-Dragging Molten Upward Cleave)
        pose: 'nodachi_drag_cleave',
        duration: 0.26,
        cancelRatio: 0.46,
        baseDamage: 27,
        lungeSpeed: 215,
        knockX: 215,
        knockY: -125,
        heavy: false,
        unblockable: false,
        afterimages: true,
        reachScale: 1.28,
        heightScale: 1.25,
        trailStyle: 'heavy_cleave',
        slashArcs: [{ sa: 1.95, ea: -1.25, radiusScale: 1.3, yOffset: -46, style: 'heavy_cleave' }],
      },
      2: {
        // 2. Đoạn Giáp Trảm (Crushing Overhead Greatblade Slam — Heavy!)
        pose: 'nodachi_overhead_slam',
        duration: 0.3,
        cancelRatio: 0.48,
        baseDamage: 34,
        lungeSpeed: 235,
        knockX: 250,
        knockY: -160,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.32,
        heightScale: 1.35,
        earthSlam: true,
        trailStyle: 'heavy_cleave',
        slashArcs: [{ sa: -2.45, ea: 1.15, radiusScale: 1.36, yOffset: -52, style: 'heavy_cleave' }],
      },
      3: {
        // 3. Hỏa Luân Phong (360° Two-Handed Molten Cyclone Spin — 2 hits both sides!)
        pose: 'nodachi_tornado_spin',
        duration: 0.29,
        cancelRatio: 0.48,
        baseDamage: 20,
        hitCount: 2,
        lungeSpeed: 280,
        knockX: 265,
        knockY: -190,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.3,
        surroundHit: true,
        trailStyle: 'heavy_cleave',
        slashArcs: [
          { sa: -2.8, ea: 1.4, radiusScale: 1.36, yOffset: -52, style: 'heavy_cleave' },
          { sa: 0.3, ea: 3.1, radiusScale: 1.18, yOffset: -52, style: 'heavy_cleave' },
        ],
      },
      4: {
        // 4. Nghịch Hỏa Phá (Wide Horizontal Greatblade Knockback Sweep)
        pose: 'attack_2',
        duration: 0.25,
        cancelRatio: 0.46,
        baseDamage: 30,
        lungeSpeed: 250,
        knockX: 295,
        knockY: -145,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.34,
        trailStyle: 'heavy_cleave',
        slashArcs: [{ sa: -1.65, ea: 1.15, radiusScale: 1.34, yOffset: -52, style: 'heavy_cleave' }],
      },
      5: {
        // 5. Thăng Viêm Hỏa Sơn (Volcanic Greatblade Uppercut Launcher)
        pose: 'rising_dragon_slash',
        duration: 0.26,
        cancelRatio: 0.48,
        baseDamage: 34,
        lungeSpeed: 235,
        hopVy: -245,
        knockX: 220,
        knockY: -410,
        heavy: true,
        unblockable: false,
        afterimages: true,
        reachScale: 1.3,
        heightScale: 1.35,
        trailStyle: 'heavy_cleave',
        slashArcs: [{ sa: 1.75, ea: -2.15, radiusScale: 1.36, yOffset: -58, style: 'heavy_cleave' }],
      },
      6: {
        // 6. Thiên Hỏa Đoạn Sơn (Leaping Meteoric Earth-Splitter + Magma Eruption!)
        pose: 'nodachi_earth_splitter',
        duration: 0.37,
        cancelRatio: 0.64,
        baseDamage: 54,
        lungeSpeed: 340,
        hopVy: -215,
        knockX: 480,
        knockY: -280,
        heavy: true,
        unblockable: true,
        afterimages: true,
        reachScale: 1.44,
        heightScale: 1.4,
        earthSlam: true,
        trailStyle: 'heavy_cleave',
        slashArcs: [
          { sa: -2.6, ea: 1.35, radiusScale: 1.5, yOffset: -52, style: 'heavy_cleave' },
          { sa: -2.0, ea: 1.1, radiusScale: 1.28, yOffset: -48, style: 'heavy_cleave' },
        ],
      },
    };
    return kaguraTable[idx];
  }

  // KURO — IAIDO KATANA: Razor-clean horizontal quick-draws, martial high kick & Zantetsu spatial sever!
  const kuroTable: Record<number, ComboMoveSpec> = {
    1: {
      // 1. Bạt Đao Trảm (Signature Horizontal Iaido Quick-Draw Line + Hilt Star Glint!)
      pose: 'iai_draw_slash',
      duration: 0.18,
      cancelRatio: 0.4,
      baseDamage: 20,
      lungeSpeed: 285,
      knockX: 165,
      knockY: -90,
      heavy: false,
      unblockable: false,
      afterimages: true,
      reachScale: 1.16,
      trailStyle: 'iaido_line',
      slashArcs: [{ sa: -0.08, ea: 0.08, radiusScale: 1.18, yOffset: -48, style: 'iaido_line' }],
    },
    2: {
      // 2. Hồi Thiên Cước (Martial Spinning High Kick flowing out of Iaido draw)
      pose: 'attack_1',
      duration: 0.18,
      cancelRatio: 0.4,
      baseDamage: 21,
      lungeSpeed: 245,
      knockX: 175,
      knockY: -125,
      heavy: false,
      unblockable: false,
      afterimages: false,
      slashArcs: [{ sa: -1.1, ea: 0.85, radiusScale: 1.02, yOffset: -48 }],
    },
    3: {
      // 3. Nghịch Phong Trảm (Crisp Horizontal Katana Reverse Sweep)
      pose: 'attack_2',
      duration: 0.2,
      cancelRatio: 0.42,
      baseDamage: 24,
      lungeSpeed: 265,
      knockX: 195,
      knockY: -140,
      heavy: false,
      unblockable: false,
      afterimages: true,
      reachScale: 1.14,
      slashArcs: [{ sa: -1.45, ea: 0.95, radiusScale: 1.16, yOffset: -52 }],
    },
    4: {
      // 4. Phi Long Thăng (Rising Dragon Katana Launcher)
      pose: 'rising_dragon_slash',
      duration: 0.21,
      cancelRatio: 0.44,
      baseDamage: 26,
      lungeSpeed: 240,
      hopVy: -255,
      knockX: 190,
      knockY: -415,
      heavy: false,
      unblockable: false,
      afterimages: true,
      slashArcs: [{ sa: 1.65, ea: -2.15, radiusScale: 1.2, yOffset: -62 }],
    },
    5: {
      // 5. Song Tuyệt Liên Trảm (2-Hit Diagonal Katana Cross-Cut!)
      pose: 'flurry_slash',
      duration: 0.23,
      cancelRatio: 0.46,
      baseDamage: 16,
      hitCount: 2,
      lungeSpeed: 300,
      knockX: 225,
      knockY: -165,
      heavy: false,
      unblockable: false,
      afterimages: true,
      reachScale: 1.18,
      slashArcs: [
        { sa: -1.8, ea: 0.9, radiusScale: 1.22, yOffset: -58 },
        { sa: 1.45, ea: -0.95, radiusScale: 1.14, yOffset: -46 },
      ],
    },
    6: {
      // 6. Nhất Đao Đoạn Không · Zantetsu (Lightning Horizon Draw -> Resheath Click + Spatial Cross Burst!)
      pose: 'katana_zantetsu_cut',
      duration: 0.29,
      cancelRatio: 0.58,
      baseDamage: 42,
      lungeSpeed: 410,
      knockX: 415,
      knockY: -240,
      heavy: true,
      unblockable: true,
      afterimages: true,
      reachScale: 1.52,
      zantetsuBurst: true,
      trailStyle: 'iaido_line',
      slashArcs: [
        { sa: 0, ea: 0, radiusScale: 1.48, yOffset: -48, style: 'iaido_line' },
      ],
    },
  };
  return kuroTable[idx];
}

/**
 * Computes mobile-landscape-aware floor anchor Y fraction so combat action sits cleanly
 * in the middle viewport band — ABOVE bottom thumb controls and BELOW the slim top HUD.
 */
export function computeLandscapeFloorAnchor(viewW: number, viewH: number): number {
  const isCompactLandscape = viewW > viewH && viewH <= 520;
  if (isCompactLandscape) {
    return 0.52;
  }
  return 0.58;
}
