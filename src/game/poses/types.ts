import type { Vec2 } from '../types';

export type BasicPoseName =
  | 'idle'
  | 'run'
  | 'brake_skid'
  | 'jump'
  | 'fall'
  | 'land'
  | 'dash'
  | 'parry';

export interface PoseContext {
  pose: BasicPoseName;
  t: number;
  walkPhase: number;
  vx?: number;
  vy?: number;
  awakened?: boolean;
}

export interface PoseDraft {
  hip: Vec2;
  torsoLean: number;
  spineBend?: number;
  headTilt?: number;
  footL: Vec2;
  footR: Vec2;
  handL: Vec2;
  handR: Vec2;
  weaponAngle: number;
  kneeBendL?: 1 | -1;
  kneeBendR?: 1 | -1;
  elbowBendL?: 1 | -1;
  elbowBendR?: 1 | -1;
  motionArc?: { x: number; y: number; r: number; sa: number; ea: number };
}

export type CharacterPoseModule = (ctx: PoseContext) => PoseDraft;

export interface SprintStyleConfig {
  hipBaseX?: number;
  hipBaseY?: number;
  hipBounce?: number;
  strideRadius?: number;
  footLift?: number;
  driveBias?: number;
  torsoLeanBase?: number;
  torsoLeanBob?: number;
  spineBend?: number;
  leadArmX?: number;
  leadArmY?: number;
  leadArmSwing?: number;
  trailArmX?: number;
  trailArmY?: number;
  trailArmSwing?: number;
  weaponAngleBase?: number;
  weaponAngleSwing?: number;
}
