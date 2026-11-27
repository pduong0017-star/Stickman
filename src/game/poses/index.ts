import type { SkeletonJoints } from '../StickmanRenderer';
import type { CharacterId } from '../types';
import { aetherPoses } from './aetherPoses';
import { chronoPoses } from './chronoPoses';
import { kaguraPoses } from './kaguraPoses';
import { kuroPoses } from './kuroPoses';
import { mactienPoses } from './mactienPoses';
import { buildSkeletonFromDraft } from './poseMath';
import { raijinPoses } from './raijinPoses';
import type { BasicPoseName, CharacterPoseModule, PoseContext } from './types';
import { zeroPoses } from './zeroPoses';

export * from './types';
export * from './poseMath';

const POSE_MODULES: Record<CharacterId, CharacterPoseModule> = {
  kuro: kuroPoses,
  raijin: raijinPoses,
  kagura: kaguraPoses,
  zero: zeroPoses,
  aether: aetherPoses,
  valkyrie: raijinPoses,
  mirage: zeroPoses,
  chrono: chronoPoses,
  mactien: mactienPoses,
};

export const BASIC_POSE_NAMES: readonly BasicPoseName[] = [
  'idle',
  'run',
  'brake_skid',
  'jump',
  'fall',
  'land',
  'dash',
  'parry',
] as const;

export function isBasicPoseName(pose: string): pose is BasicPoseName {
  return (BASIC_POSE_NAMES as readonly string[]).includes(pose);
}

export function getCharacterPoseModule(characterId?: CharacterId): CharacterPoseModule {
  if (characterId && characterId in POSE_MODULES) {
    return POSE_MODULES[characterId];
  }
  return POSE_MODULES.kuro;
}

export function computeBasicCharacterSkeleton(
  pose: BasicPoseName,
  t: number,
  walkPhase: number,
  characterId?: CharacterId,
  extra?: { vx?: number; vy?: number; awakened?: boolean }
): SkeletonJoints {
  const mod = getCharacterPoseModule(characterId);
  const ctx: PoseContext = {
    pose,
    t,
    walkPhase,
    vx: extra?.vx,
    vy: extra?.vy,
    awakened: extra?.awakened,
  };
  return buildSkeletonFromDraft(mod(ctx));
}
