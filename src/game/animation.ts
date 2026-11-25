import type { CharacterId, Vec2 } from './types';
import type { SkeletonJoints, StickPoseName } from './StickmanRenderer';

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
 * Shortest-path angular interpolation wrapping across [-PI, PI].
 */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Smoothly blends two Stickman skeletons so transitions between idle, run, jump,
 * parry, and 6-hit combo chains never snap abruptly.
 */
export function blendSkeleton(
  prev: SkeletonJoints,
  target: SkeletonJoints,
  alpha: number
): SkeletonJoints {
  const t = Math.max(0, Math.min(1, alpha));
  return {
    hip: lerpVec2(prev.hip, target.hip, t),
    spineMid: lerpVec2(prev.spineMid, target.spineMid, t),
    neck: lerpVec2(prev.neck, target.neck, t),
    head: lerpVec2(prev.head, target.head, t),
    shoulderL: lerpVec2(prev.shoulderL, target.shoulderL, t),
    elbowL: lerpVec2(prev.elbowL, target.elbowL, t),
    handL: lerpVec2(prev.handL, target.handL, t),
    shoulderR: lerpVec2(prev.shoulderR, target.shoulderR, t),
    elbowR: lerpVec2(prev.elbowR, target.elbowR, t),
    handR: lerpVec2(prev.handR, target.handR, t),
    kneeL: lerpVec2(prev.kneeL, target.kneeL, t),
    footL: lerpVec2(prev.footL, target.footL, t),
    kneeR: lerpVec2(prev.kneeR, target.kneeR, t),
    footR: lerpVec2(prev.footR, target.footR, t),
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

function computeSprintFoot(phase: number): Vec2 {
  // Asymmetric athletic sprint trajectory:
  // - sin(phase) <= 0: planted stance gliding back from +22 to -22 along ground (y = 0)
  // - sin(phase) > 0: flight recovery kicking heel up to y = -20 while driving knee forward
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const x = c * 22;
  const y = s > 0 ? -Math.pow(s, 0.85) * 21 : 0;
  return { x, y };
}

/**
 * Computes anatomically grounded anime martial-arts sprint kinematics:
 * - Hip stays low (-39 to -43.5) so hip-to-foot distance ALWAYS remains below max IK length (52px),
 *   preventing stiff straight-leg locking!
 * - Lead arm (L) pumps forward/back in natural counter-phase to legs.
 * - Weapon arm (R) sweeps smoothly behind the hip in a classic anime swordsman/shinobi trail.
 */
export function computeRunStrideKinematics(walkPhase: number): RunStrideKinematics {
  const bounce = Math.abs(Math.sin(walkPhase)) * 4.5;
  const hip: Vec2 = { x: 4, y: -39.5 - bounce };
  const torsoLean = 0.43 + Math.sin(walkPhase * 2) * 0.035;
  const spineBend = 7.5;

  const footR = computeSprintFoot(walkPhase);
  const footL = computeSprintFoot(walkPhase + Math.PI);

  // Lead arm counter-pumps against right leg (when footR swings forward, handL swings back & vice-versa)
  const armSwing = -Math.cos(walkPhase);
  const handL: Vec2 = {
    x: 11 + armSwing * 19,
    y: -51 - Math.max(0, armSwing) * 8 + Math.max(0, -armSwing) * 4,
  };

  // Weapon arm trails coolly behind the body with subtle rhythmic momentum
  const handR: Vec2 = {
    x: -13 - armSwing * 6,
    y: -44 + Math.sin(walkPhase * 2) * 2.5,
  };
  const weaponAngle = -2.74 - armSwing * 0.09;

  return {
    hip,
    torsoLean,
    spineBend,
    footL,
    footR,
    handL,
    handR,
    weaponAngle,
  };
}

export type UltimateStyleId =
  | 'scarlet_sheath'
  | 'volt_judgment'
  | 'solar_inferno'
  | 'phantom_eclipse';

export function getUltimateStyleId(characterId: CharacterId): UltimateStyleId {
  switch (characterId) {
    case 'raijin':
      return 'volt_judgment';
    case 'kagura':
      return 'solar_inferno';
    case 'zero':
      return 'phantom_eclipse';
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

export function getAwakenedVisualProfile(characterId: CharacterId): AwakenedVisualProfile {
  switch (characterId) {
    case 'raijin':
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
      return {
        formTitle: 'ẢNH VƯƠNG HƯ KHÔNG',
        motif: 'void_sovereign',
        scarfPrimary: '#059669',
        scarfHighlight: '#a7f3d0',
        upgradedSpecialName: 'THẬP TỰ ĐAO',
        auraAccent: '#10b981',
        transformationCallout: 'THỨC TỈNH: ẢNH VƯƠNG!',
      };
    case 'kuro':
    default:
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
  slashArcs: Array<{ sa: number; ea: number; radiusScale: number; yOffset: number }>;
}

export type AttackContext = 'ground' | 'air' | 'dash_slash' | 'parry_counter';

/**
 * Rich, explosive 6-hit ground combo + 3-hit air combo (ending in Meteor Plunge Slam) +
 * Iaido Dash-Slash + Parry Counter, with unique anime choreography tailored per fighter.
 */
export function getComboMoveForCharacter(
  characterId: CharacterId,
  step: number,
  context: AttackContext
): ComboMoveSpec {
  if (context === 'dash_slash') {
    const pose: StickPoseName =
      characterId === 'zero'
        ? 'shadow_blink_cut'
        : characterId === 'raijin'
          ? 'spear_thrust'
          : 'dash_slash';
    return {
      pose,
      duration: 0.24,
      cancelRatio: 0.5,
      baseDamage: 32,
      lungeSpeed: 560,
      knockX: 310,
      knockY: -170,
      heavy: true,
      unblockable: false,
      afterimages: true,
      slashArcs: [
        { sa: -0.6, ea: 0.6, radiusScale: 1.32, yOffset: -52 },
        { sa: -0.25, ea: 0.35, radiusScale: 1.48, yOffset: -56 },
      ],
    };
  }

  if (context === 'parry_counter') {
    return {
      pose: 'parry_counter',
      duration: 0.26,
      cancelRatio: 0.54,
      baseDamage: 44,
      lungeSpeed: 450,
      knockX: 430,
      knockY: -250,
      heavy: true,
      unblockable: true,
      afterimages: true,
      slashArcs: [
        { sa: -2.05, ea: 1.0, radiusScale: 1.36, yOffset: -56 },
        { sa: -1.1, ea: 1.4, radiusScale: 1.16, yOffset: -48 },
      ],
    };
  }

  if (context === 'air') {
    const airIdx = ((Math.max(1, step) - 1) % 3) + 1;
    if (airIdx === 1) {
      return {
        pose: 'air_attack',
        duration: 0.19,
        cancelRatio: 0.44,
        baseDamage: 19,
        lungeSpeed: 165,
        knockX: 145,
        knockY: -190,
        heavy: false,
        unblockable: false,
        afterimages: false,
        slashArcs: [{ sa: -1.85, ea: 1.05, radiusScale: 1.04, yOffset: -56 }],
      };
    }
    if (airIdx === 2) {
      return {
        pose: 'air_attack_2',
        duration: 0.2,
        cancelRatio: 0.46,
        baseDamage: 23,
        lungeSpeed: 185,
        knockX: 165,
        knockY: -270,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [{ sa: -2.35, ea: 0.45, radiusScale: 1.12, yOffset: -60 }],
      };
    }
    return {
      pose: 'air_slam',
      duration: 0.31,
      cancelRatio: 0.7,
      baseDamage: 36,
      lungeSpeed: 220,
      knockX: 290,
      knockY: 340,
      heavy: true,
      unblockable: true,
      afterimages: true,
      slashArcs: [{ sa: -2.45, ea: 1.45, radiusScale: 1.28, yOffset: -48 }],
    };
  }

  // 6-Hit Ground Combo Chain — Every fighter has signature openings, aerial hops, and explosive finishers!
  const idx = ((Math.max(1, step) - 1) % 6) + 1;

  if (characterId === 'raijin') {
    const raijinTable: Record<number, ComboMoveSpec> = {
      1: {
        pose: 'spear_thrust',
        duration: 0.18,
        cancelRatio: 0.42,
        baseDamage: 19,
        lungeSpeed: 310,
        knockX: 155,
        knockY: -65,
        heavy: false,
        unblockable: false,
        afterimages: false,
        slashArcs: [{ sa: -0.35, ea: 0.35, radiusScale: 1.32, yOffset: -58 }],
      },
      2: {
        pose: 'attack_2',
        duration: 0.2,
        cancelRatio: 0.42,
        baseDamage: 21,
        lungeSpeed: 260,
        knockX: 180,
        knockY: -95,
        heavy: false,
        unblockable: false,
        afterimages: false,
        slashArcs: [{ sa: -1.45, ea: 0.95, radiusScale: 1.18, yOffset: -54 }],
      },
      3: {
        pose: 'flurry_slash',
        duration: 0.22,
        cancelRatio: 0.44,
        baseDamage: 25,
        lungeSpeed: 320,
        knockX: 195,
        knockY: -125,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -0.45, ea: 0.45, radiusScale: 1.34, yOffset: -62 },
          { sa: -0.3, ea: 0.55, radiusScale: 1.22, yOffset: -48 },
        ],
      },
      4: {
        pose: 'vault_spear_slam',
        duration: 0.25,
        cancelRatio: 0.48,
        baseDamage: 28,
        lungeSpeed: 300,
        hopVy: -240,
        knockX: 225,
        knockY: -220,
        heavy: true,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -2.4, ea: 1.35, radiusScale: 1.26, yOffset: -54 },
          { sa: 0.2, ea: 2.9, radiusScale: 1.0, yOffset: -50 },
        ],
      },
      5: {
        pose: 'rising_dragon_slash',
        duration: 0.23,
        cancelRatio: 0.48,
        baseDamage: 28,
        lungeSpeed: 245,
        hopVy: -280,
        knockX: 190,
        knockY: -430,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [{ sa: -2.2, ea: 0.55, radiusScale: 1.24, yOffset: -64 }],
      },
      6: {
        pose: 'dash_slash',
        duration: 0.3,
        cancelRatio: 0.62,
        baseDamage: 40,
        lungeSpeed: 500,
        knockX: 430,
        knockY: -220,
        heavy: true,
        unblockable: true,
        afterimages: true,
        slashArcs: [
          { sa: -0.5, ea: 0.5, radiusScale: 1.48, yOffset: -56 },
          { sa: -1.65, ea: 1.15, radiusScale: 1.28, yOffset: -54 },
        ],
      },
    };
    return raijinTable[idx];
  }

  if (characterId === 'zero') {
    const zeroTable: Record<number, ComboMoveSpec> = {
      1: {
        pose: 'shadow_blink_cut',
        duration: 0.16,
        cancelRatio: 0.4,
        baseDamage: 17,
        lungeSpeed: 320,
        knockX: 135,
        knockY: -75,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -1.25, ea: 0.9, radiusScale: 1.0, yOffset: -56 },
          { sa: -0.75, ea: 1.3, radiusScale: 0.92, yOffset: -48 },
        ],
      },
      2: {
        pose: 'attack_1',
        duration: 0.17,
        cancelRatio: 0.4,
        baseDamage: 19,
        lungeSpeed: 255,
        knockX: 155,
        knockY: -130,
        heavy: false,
        unblockable: false,
        afterimages: false,
        slashArcs: [{ sa: -1.15, ea: 0.9, radiusScale: 1.0, yOffset: -48 }],
      },
      3: {
        pose: 'spin_slash',
        duration: 0.19,
        cancelRatio: 0.42,
        baseDamage: 23,
        lungeSpeed: 285,
        hopVy: -175,
        knockX: 180,
        knockY: -195,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -2.45, ea: 1.35, radiusScale: 1.12, yOffset: -54 },
          { sa: 0.4, ea: 2.9, radiusScale: 0.92, yOffset: -54 },
        ],
      },
      4: {
        pose: 'flurry_slash',
        duration: 0.2,
        cancelRatio: 0.42,
        baseDamage: 25,
        lungeSpeed: 315,
        knockX: 175,
        knockY: -145,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -1.75, ea: 0.8, radiusScale: 1.08, yOffset: -58 },
          { sa: -0.8, ea: 1.55, radiusScale: 1.02, yOffset: -46 },
        ],
      },
      5: {
        pose: 'rising_dragon_slash',
        duration: 0.2,
        cancelRatio: 0.45,
        baseDamage: 26,
        lungeSpeed: 240,
        hopVy: -275,
        knockX: 170,
        knockY: -415,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [{ sa: -2.2, ea: 0.5, radiusScale: 1.1, yOffset: -62 }],
      },
      6: {
        pose: 'cross_x_slash',
        duration: 0.27,
        cancelRatio: 0.56,
        baseDamage: 36,
        lungeSpeed: 400,
        knockX: 370,
        knockY: -230,
        heavy: true,
        unblockable: true,
        afterimages: true,
        slashArcs: [
          { sa: -2.25, ea: 1.15, radiusScale: 1.28, yOffset: -56 },
          { sa: -1.1, ea: 2.15, radiusScale: 1.18, yOffset: -50 },
        ],
      },
    };
    return zeroTable[idx];
  }

  if (characterId === 'kagura') {
    const kaguraTable: Record<number, ComboMoveSpec> = {
      1: {
        pose: 'crimson_cleave_low',
        duration: 0.22,
        cancelRatio: 0.45,
        baseDamage: 24,
        lungeSpeed: 225,
        knockX: 195,
        knockY: -95,
        heavy: false,
        unblockable: false,
        afterimages: false,
        slashArcs: [
          { sa: -1.45, ea: 1.05, radiusScale: 1.2, yOffset: -46 },
        ],
      },
      2: {
        pose: 'rising_dragon_slash',
        duration: 0.23,
        cancelRatio: 0.45,
        baseDamage: 26,
        lungeSpeed: 220,
        hopVy: -230,
        knockX: 195,
        knockY: -380,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [{ sa: -2.05, ea: 0.6, radiusScale: 1.22, yOffset: -60 }],
      },
      3: {
        pose: 'spin_slash',
        duration: 0.25,
        cancelRatio: 0.47,
        baseDamage: 30,
        lungeSpeed: 265,
        knockX: 260,
        knockY: -185,
        heavy: true,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -2.55, ea: 1.25, radiusScale: 1.3, yOffset: -54 },
          { sa: 0.2, ea: 2.85, radiusScale: 1.05, yOffset: -52 },
        ],
      },
      4: {
        pose: 'attack_1',
        duration: 0.21,
        cancelRatio: 0.45,
        baseDamage: 25,
        lungeSpeed: 250,
        knockX: 235,
        knockY: -155,
        heavy: false,
        unblockable: false,
        afterimages: true,
        slashArcs: [{ sa: -1.15, ea: 0.9, radiusScale: 1.12, yOffset: -48 }],
      },
      5: {
        pose: 'flurry_slash',
        duration: 0.25,
        cancelRatio: 0.48,
        baseDamage: 32,
        lungeSpeed: 275,
        knockX: 270,
        knockY: -200,
        heavy: true,
        unblockable: false,
        afterimages: true,
        slashArcs: [
          { sa: -1.85, ea: 0.95, radiusScale: 1.26, yOffset: -58 },
          { sa: -0.9, ea: 1.45, radiusScale: 1.18, yOffset: -46 },
        ],
      },
      6: {
        pose: 'awakened_finisher',
        duration: 0.34,
        cancelRatio: 0.64,
        baseDamage: 46,
        lungeSpeed: 330,
        hopVy: -190,
        knockX: 450,
        knockY: -260,
        heavy: true,
        unblockable: true,
        afterimages: true,
        slashArcs: [
          { sa: -2.45, ea: 1.3, radiusScale: 1.44, yOffset: -54 },
          { sa: -1.9, ea: 1.05, radiusScale: 1.2, yOffset: -50 },
        ],
      },
    };
    return kaguraTable[idx];
  }

  // KURO (Signature Iaido Katana + Martial Arts 6-Hit Chain)
  const kuroTable: Record<number, ComboMoveSpec> = {
    1: {
      pose: 'iai_draw_slash',
      duration: 0.19,
      cancelRatio: 0.42,
      baseDamage: 20,
      lungeSpeed: 275,
      knockX: 170,
      knockY: -95,
      heavy: false,
      unblockable: false,
      afterimages: true,
      slashArcs: [{ sa: -0.85, ea: 0.85, radiusScale: 1.14, yOffset: -50 }],
    },
    2: {
      pose: 'attack_1',
      duration: 0.19,
      cancelRatio: 0.42,
      baseDamage: 21,
      lungeSpeed: 240,
      knockX: 180,
      knockY: -120,
      heavy: false,
      unblockable: false,
      afterimages: false,
      slashArcs: [{ sa: -1.1, ea: 0.9, radiusScale: 1.04, yOffset: -48 }],
    },
    3: {
      pose: 'rising_dragon_slash',
      duration: 0.22,
      cancelRatio: 0.45,
      baseDamage: 25,
      lungeSpeed: 235,
      hopVy: -255,
      knockX: 190,
      knockY: -420,
      heavy: false,
      unblockable: false,
      afterimages: true,
      slashArcs: [{ sa: -2.15, ea: 0.6, radiusScale: 1.18, yOffset: -62 }],
    },
    4: {
      pose: 'spin_slash',
      duration: 0.23,
      cancelRatio: 0.45,
      baseDamage: 27,
      lungeSpeed: 285,
      knockX: 225,
      knockY: -180,
      heavy: false,
      unblockable: false,
      afterimages: true,
      slashArcs: [
        { sa: -2.45, ea: 1.2, radiusScale: 1.22, yOffset: -54 },
        { sa: 0.3, ea: 2.85, radiusScale: 0.98, yOffset: -52 },
      ],
    },
    5: {
      pose: 'flurry_slash',
      duration: 0.23,
      cancelRatio: 0.47,
      baseDamage: 29,
      lungeSpeed: 300,
      knockX: 240,
      knockY: -160,
      heavy: false,
      unblockable: false,
      afterimages: true,
      slashArcs: [
        { sa: -1.8, ea: 0.9, radiusScale: 1.2, yOffset: -58 },
        { sa: -0.85, ea: 1.5, radiusScale: 1.1, yOffset: -46 },
      ],
    },
    6: {
      pose: 'awakened_finisher',
      duration: 0.31,
      cancelRatio: 0.62,
      baseDamage: 40,
      lungeSpeed: 365,
      hopVy: -180,
      knockX: 410,
      knockY: -235,
      heavy: true,
      unblockable: true,
      afterimages: true,
      slashArcs: [
        { sa: -2.4, ea: 1.25, radiusScale: 1.38, yOffset: -54 },
        { sa: -1.85, ea: 0.95, radiusScale: 1.15, yOffset: -50 },
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
