import type { SkinId } from '../../types';
import type { SkinModule } from './types';
// import { mySkin } from './my_skin';   // Step 2: import your module

/** Modular skins. Any skin listed here overrides the legacy code in gear.ts. */
export const MODULAR_SKINS: Partial<Record<SkinId, SkinModule>> = {
  // my_skin: mySkin,                    // Step 3: register it
};

export function getModularSkin(skinId: SkinId | undefined): SkinModule | undefined {
  return skinId ? MODULAR_SKINS[skinId] : undefined;
}
