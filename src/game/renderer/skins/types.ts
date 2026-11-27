import type { CharacterId, SkinId } from '../../types';
import type { SkinInkPalette } from '../inkStyle';
import type { SkeletonJoints, StickmanRenderOptions } from '../types';

/**
 * Data passed to a modular skin. Mirrors exactly what gear.ts receives.
 * Coordinates are LOCAL (character-space, hip ~ y=-48, head ~ y=-90, y up = negative);
 * the caller already applied position/facing/scale transforms to `ctx`.
 */
export interface SkinRenderContext {
  ctx: CanvasRenderingContext2D;
  /** Skeleton joints (Vec2 {x,y}): hip, spineMid, neck, head, shoulderL/R, elbowL/R, handL/R, kneeL/R, footL/R, weaponAngle. */
  joints: SkeletonJoints;
  skinId: SkinId;
  characterId?: CharacterId;
  /** True when the awakened/ultimate form is active. */
  awakened: boolean;
  /** Animation clock in seconds. */
  time: number;
  /** Head radius (only provided to drawFrontLayer). */
  headR?: number;
  /** Head gear kind (only provided to drawFrontLayer). */
  headGear?: Exclude<NonNullable<StickmanRenderOptions['headGear']>, 'none'>;
  /** Ink palette for this skin, from getSkinInkPalette(). */
  palette?: SkinInkPalette;
}

export type SkinDrawFn = (c: SkinRenderContext) => void;

export interface SkinModule {
  id: SkinId;
  /** Behind the body (wings, capes, halos). Replaces renderSkinBackAttachment. */
  drawBackLayer?: SkinDrawFn;
  /** Body armor. Replaces renderSkinBodyArmor. */
  drawBody?: SkinDrawFn;
  /** Optional weapon overlay (not yet dispatched from gear.ts). */
  drawWeapon?: SkinDrawFn;
  /** Head gear / front accessories. Replaces renderHeroHeadGear. */
  drawFrontLayer?: SkinDrawFn;
}
