import type { SkeletonJoints } from '../StickmanRenderer';
import type { Vec2 } from '../types';
import type { PoseDraft, SprintStyleConfig } from './types';

export const TORSO_LEN = 34;
export const HEAD_OFFSET = 13;
export const THIGH_LEN = 26;
export const SHIN_LEN = 26;
export const UPPER_ARM_LEN = 19;
export const FOREARM_LEN = 19;

export const LEG_MIN_REACH = 8;
export const LEG_MAX_REACH = 51.4;
export const ARM_MIN_REACH = 4;
export const ARM_MAX_REACH = 37.4;

export function sanitizeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function sanitizeVec2(v: Vec2 | undefined, fallback: Vec2 = { x: 0, y: 0 }): Vec2 {
  if (!v) return { x: fallback.x, y: fallback.y };
  return {
    x: sanitizeFinite(v.x, fallback.x),
    y: sanitizeFinite(v.y, fallback.y),
  };
}

/**
 * Clamps a target end-effector to [minDist, maxDist] from root BEFORE storing into SkeletonJoints,
 * preventing stretched limbs and zero-length singularities.
 */
export function clampToReach(
  root: Vec2,
  target: Vec2,
  minDist: number,
  maxDist: number
): Vec2 {
  const safeRoot = sanitizeVec2(root, { x: 0, y: 0 });
  const safeMin = Math.max(0.01, sanitizeFinite(minDist, 1));
  const safeMax = Math.max(safeMin, sanitizeFinite(maxDist, safeMin));
  const safeTarget = sanitizeVec2(target, { x: safeRoot.x, y: safeRoot.y + safeMin });

  const dx = safeTarget.x - safeRoot.x;
  const dy = safeTarget.y - safeRoot.y;
  const dist = Math.hypot(dx, dy);

  if (!Number.isFinite(dist) || dist < 1e-5) {
    return { x: safeRoot.x, y: safeRoot.y + safeMin };
  }
  if (dist < safeMin) {
    const inv = safeMin / dist;
    return {
      x: safeRoot.x + dx * inv,
      y: safeRoot.y + dy * inv,
    };
  }
  if (dist > safeMax) {
    const inv = safeMax / dist;
    return {
      x: safeRoot.x + dx * inv,
      y: safeRoot.y + dy * inv,
    };
  }
  return safeTarget;
}

/**
 * Safe 2-bone IK solver with reach clamping, zero-distance fallback, and finite guards.
 */
export function solveSafeTwoBoneIK(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  bendDir: number
): { joint: Vec2; endEffector: Vec2 } {
  const safeRoot = sanitizeVec2(root, { x: 0, y: 0 });
  const l1 = Math.max(0.5, sanitizeFinite(len1, 19));
  const l2 = Math.max(0.5, sanitizeFinite(len2, 19));
  const minR = Math.max(0.5, Math.abs(l1 - l2) + 0.5);
  const maxR = Math.max(minR, l1 + l2 - 0.05);

  const endEffector = clampToReach(safeRoot, target, minR, maxR);
  const dx = endEffector.x - safeRoot.x;
  const dy = endEffector.y - safeRoot.y;
  const dist = Math.max(0.01, Math.min(maxR, Math.hypot(dx, dy)));

  const baseAngle = Math.atan2(dy, dx);
  const cosAngle = Math.max(
    -1,
    Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))
  );
  const dir = sanitizeFinite(bendDir, 1) >= 0 ? 1 : -1;
  const angle = baseAngle + dir * Math.acos(cosAngle);

  const joint = sanitizeVec2(
    {
      x: safeRoot.x + Math.cos(angle) * l1,
      y: safeRoot.y + Math.sin(angle) * l1,
    },
    { x: safeRoot.x, y: safeRoot.y + l1 }
  );

  return { joint, endEffector };
}

/**
 * Transforms (hand - shoulder) into the torso-aligned frame so hands raised behind/above
 * the shoulder bend naturally (-1) rather than inverting upward (+1).
 */
export function resolveElbowBendDir(
  shoulder: Vec2,
  hand: Vec2,
  torsoLean: number,
  override?: 1 | -1
): 1 | -1 {
  if (override === 1 || override === -1) {
    return override;
  }
  const s = sanitizeVec2(shoulder, { x: 0, y: -70 });
  const h = sanitizeVec2(hand, { x: 12, y: -56 });
  const lean = sanitizeFinite(torsoLean, 0);

  const dx = h.x - s.x;
  const dy = h.y - s.y;
  const cosL = Math.cos(lean);
  const sinL = Math.sin(lean);

  // Torso-local coordinates: +localX = torso forward, +localY = torso down (-localY = torso up)
  const localX = dx * cosL + dy * sinL;
  const localY = -dx * sinL + dy * cosL;

  if (localX < -2 && localY < -1) {
    return -1;
  }
  return 1;
}

/**
 * Builds a complete, finite, anatomically bounded SkeletonJoints from a high-level PoseDraft.
 * - Rotates shoulder offsets (+/-4, +5) with torsoLean
 * - Applies spineBend perpendicular to torso axis
 * - Applies optional headTilt to head orientation
 * - Clamps foot targets to [8, 51.4] and hand targets to [4, 37.4] before solving IK
 */
export function buildSkeletonFromDraft(draft: PoseDraft): SkeletonJoints {
  const hip = sanitizeVec2(draft.hip, { x: 0, y: -45 });
  const torsoLean = sanitizeFinite(draft.torsoLean, 0.1);
  const spineBend = sanitizeFinite(draft.spineBend ?? 0, 0);
  const headTilt = sanitizeFinite(draft.headTilt ?? 0, 0);
  const weaponAngle = sanitizeFinite(draft.weaponAngle, -0.45);

  const sinL = Math.sin(torsoLean);
  const cosL = Math.cos(torsoLean);

  const neck = sanitizeVec2(
    {
      x: hip.x + sinL * TORSO_LEN,
      y: hip.y - cosL * TORSO_LEN,
    },
    { x: hip.x, y: hip.y - TORSO_LEN }
  );

  const spineMid = sanitizeVec2(
    {
      x: (hip.x + neck.x) * 0.5 + cosL * spineBend,
      y: (hip.y + neck.y) * 0.5 + sinL * spineBend,
    },
    { x: (hip.x + neck.x) * 0.5, y: (hip.y + neck.y) * 0.5 }
  );

  const headAngle = torsoLean + headTilt;
  const head = sanitizeVec2(
    {
      x: neck.x + Math.sin(headAngle) * HEAD_OFFSET,
      y: neck.y - Math.cos(headAngle) * HEAD_OFFSET,
    },
    { x: neck.x, y: neck.y - HEAD_OFFSET }
  );

  // Rotate shoulder local offsets (-4, +5) and (+4, +5) by torsoLean
  const shoulderL = sanitizeVec2(
    {
      x: neck.x + (-4 * cosL - 5 * sinL),
      y: neck.y + (-4 * sinL + 5 * cosL),
    },
    { x: neck.x - 4, y: neck.y + 5 }
  );
  const shoulderR = sanitizeVec2(
    {
      x: neck.x + (4 * cosL - 5 * sinL),
      y: neck.y + (4 * sinL + 5 * cosL),
    },
    { x: neck.x + 4, y: neck.y + 5 }
  );

  const clampedFootL = clampToReach(hip, draft.footL, LEG_MIN_REACH, LEG_MAX_REACH);
  const clampedFootR = clampToReach(hip, draft.footR, LEG_MIN_REACH, LEG_MAX_REACH);
  const clampedHandL = clampToReach(shoulderL, draft.handL, ARM_MIN_REACH, ARM_MAX_REACH);
  const clampedHandR = clampToReach(shoulderR, draft.handR, ARM_MIN_REACH, ARM_MAX_REACH);

  const legL = solveSafeTwoBoneIK(
    hip,
    clampedFootL,
    THIGH_LEN,
    SHIN_LEN,
    draft.kneeBendL ?? -1
  );
  const legR = solveSafeTwoBoneIK(
    hip,
    clampedFootR,
    THIGH_LEN,
    SHIN_LEN,
    draft.kneeBendR ?? -1
  );

  const elbowDirL = resolveElbowBendDir(shoulderL, clampedHandL, torsoLean, draft.elbowBendL);
  const elbowDirR = resolveElbowBendDir(shoulderR, clampedHandR, torsoLean, draft.elbowBendR);

  const armL = solveSafeTwoBoneIK(
    shoulderL,
    clampedHandL,
    UPPER_ARM_LEN,
    FOREARM_LEN,
    elbowDirL
  );
  const armR = solveSafeTwoBoneIK(
    shoulderR,
    clampedHandR,
    UPPER_ARM_LEN,
    FOREARM_LEN,
    elbowDirR
  );

  const motionArc = draft.motionArc
    ? {
        x: sanitizeFinite(draft.motionArc.x, 0),
        y: sanitizeFinite(draft.motionArc.y, -48),
        r: Math.max(1, sanitizeFinite(draft.motionArc.r, 40)),
        sa: sanitizeFinite(draft.motionArc.sa, 0),
        ea: sanitizeFinite(draft.motionArc.ea, Math.PI),
      }
    : undefined;

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
    weaponAngle,
    motionArc,
  };
}

export interface AnimeSprintResult {
  hip: Vec2;
  torsoLean: number;
  spineBend: number;
  footL: Vec2;
  footR: Vec2;
  handL: Vec2;
  handR: Vec2;
  weaponAngle: number;
}

function clampGroundFoot(hip: Vec2, foot: Vec2): Vec2 {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= LEG_MAX_REACH) {
    return foot;
  }
  if (foot.y === 0 && Math.abs(hip.y) < LEG_MAX_REACH - 0.5) {
    // Keep ground contact === 0 while respecting LEG_MAX_REACH
    const maxDx = Math.sqrt(Math.max(1, LEG_MAX_REACH * LEG_MAX_REACH - hip.y * hip.y));
    return {
      x: hip.x + Math.sign(dx || 1) * maxDx,
      y: 0,
    };
  }
  return clampToReach(hip, foot, LEG_MIN_REACH, LEG_MAX_REACH);
}

function computeAsymmetricSprintFoot(
  phase: number,
  hipX: number,
  strideRadius: number,
  footLift: number,
  driveBias: number
): Vec2 {
  const twoPi = Math.PI * 2;
  const wrapped = ((phase % twoPi) + twoPi) % twoPi;
  const u = wrapped / twoPi; // [0, 1)

  const forwardReach = strideRadius * (0.96 + driveBias * 0.06);
  const backPush = strideRadius * (1.02 - driveBias * 0.04);

  if (u < 0.38) {
    // Grounded front-plant -> mid-stance drive along y = 0
    const s = u / 0.38;
    const x = hipX + forwardReach - s * (forwardReach + backPush * 0.72);
    return { x, y: 0 };
  }

  if (u < 0.56) {
    // Explosive rear push-off: trailing leg extends ~170° straight behind body!
    const s = (u - 0.38) / 0.18;
    const x = hipX - backPush * (0.72 + 0.34 * s);
    const y = -7.5 * s;
    return { x, y };
  }

  // Airborne recovery phase: brisk heel-whip -> long front reach before planting
  const w = (u - 0.56) / 0.44; // [0, 1)
  const forwardWhip = 0.5 - 0.5 * Math.cos(Math.PI * Math.pow(w, 0.8));
  const x = hipX - backPush * 1.06 + forwardWhip * (forwardReach + backPush * 1.06);
  const y = -7.5 * (1 - w) - Math.sin(Math.PI * Math.pow(w, 0.78)) * footLift;
  return { x, y };
}

/**
 * Computes asymmetric Anime Fighting / YOMI Hustle sprint stride:
 * - Pelvis drops to -36.5 so horizontal ground reach is ~35px each way (~70px full stride!)
 * - 38°-42° forward torso lean, straight spine, trailing weapon arm swept back
 * - Ground plant (foot.y === 0) during drive, ~170° rear extension on push-off, crisp lift (< -14) on recovery
 * - Guaranteed within LEG_MAX_REACH (< 51.4px)
 */
export function computeAnimeSprintStride(
  walkPhase: number,
  cfg: SprintStyleConfig = {}
): AnimeSprintResult {
  const safePhase = sanitizeFinite(walkPhase, 0);
  const hipBaseX = sanitizeFinite(cfg.hipBaseX ?? 5, 5);
  const hipBaseY = sanitizeFinite(cfg.hipBaseY ?? -36.5, -36.5);
  const hipBounce = sanitizeFinite(cfg.hipBounce ?? 1.8, 1.8);
  const strideRadius = sanitizeFinite(cfg.strideRadius ?? 34, 34);
  const footLift = sanitizeFinite(cfg.footLift ?? 19, 19);
  const driveBias = Math.max(0, Math.min(1, sanitizeFinite(cfg.driveBias ?? 0.56, 0.56)));

  const bounce = Math.abs(Math.sin(safePhase)) * hipBounce;
  const hip: Vec2 = {
    x: hipBaseX + Math.cos(safePhase * 2) * 1.4,
    y: hipBaseY - bounce,
  };

  const torsoLeanBase = sanitizeFinite(cfg.torsoLeanBase ?? 0.68, 0.68);
  const torsoLeanBob = sanitizeFinite(cfg.torsoLeanBob ?? 0.03, 0.03);
  const torsoLean = torsoLeanBase + Math.sin(safePhase * 2) * torsoLeanBob;
  const spineBend = sanitizeFinite(cfg.spineBend ?? 1.2, 1.2);

  const rawFootR = computeAsymmetricSprintFoot(safePhase, hip.x, strideRadius, footLift, driveBias);
  const rawFootL = computeAsymmetricSprintFoot(
    safePhase + Math.PI,
    hip.x,
    strideRadius,
    footLift,
    driveBias
  );

  const footR = clampGroundFoot(hip, rawFootR);
  const footL = clampGroundFoot(hip, rawFootL);

  const armSwing = -Math.cos(safePhase);
  const leadArmX = sanitizeFinite(cfg.leadArmX ?? 22, 22);
  const leadArmY = sanitizeFinite(cfg.leadArmY ?? -50, -50);
  const leadArmSwing = sanitizeFinite(cfg.leadArmSwing ?? 7, 7);

  const trailArmX = sanitizeFinite(cfg.trailArmX ?? -30, -30);
  const trailArmY = sanitizeFinite(cfg.trailArmY ?? -52, -52);
  const trailArmSwing = sanitizeFinite(cfg.trailArmSwing ?? 3.5, 3.5);

  const handL: Vec2 = {
    x: leadArmX + armSwing * leadArmSwing,
    y: leadArmY - Math.max(0, armSwing) * 3 + Math.max(0, -armSwing) * 2,
  };
  const handR: Vec2 = {
    x: trailArmX - armSwing * trailArmSwing,
    y: trailArmY + Math.sin(safePhase * 2) * 1.8,
  };

  const weaponAngleBase = sanitizeFinite(cfg.weaponAngleBase ?? -2.52, -2.52);
  const weaponAngleSwing = sanitizeFinite(cfg.weaponAngleSwing ?? 0.06, 0.06);
  const weaponAngle = weaponAngleBase - armSwing * weaponAngleSwing;

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

/**
 * Crisp touchdown impact drop & elastic rebound curve in [0, 1].
 * Peaks within t in [0.02, 0.08] and rebounds smoothly toward 0 by t >= duration.
 */
export function computeLandingCurve(t: number, duration = 0.15): number {
  const safeT = Math.max(0, sanitizeFinite(t, 0));
  const safeDur = Math.max(0.05, sanitizeFinite(duration, 0.15));
  const p = Math.max(0, Math.min(1, safeT / safeDur));

  if (p < 0.28) {
    return 0.35 + 0.65 * Math.sin((p / 0.28) * Math.PI * 0.5);
  }
  const reboundP = (p - 0.28) / 0.72;
  return Math.max(0, Math.cos(reboundP * Math.PI * 0.5));
}
