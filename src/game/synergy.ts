import type { CharacterId } from './types';

export interface ElementalMarkSpec {
  id: CharacterId;
  kanji: string;
  markName: string;
  detonateCallout: string;
  linkArtName: string;
  linkShortLabel: string;
  primaryColor: string;
  secondaryColor: string;
  baseDetonateDamage: number;
  maxStacks: number;
}

export const ELEMENTAL_MARK_SPECS: Record<CharacterId, ElementalMarkSpec> = {
  kuro: {
    id: 'kuro',
    kanji: '氷',
    markName: 'BĂNG ẤN',
    detonateCallout: 'PHÁ BĂNG!',
    linkArtName: 'HUYẾT ẢNH TRẢM',
    linkShortLabel: 'PHÁ BĂNG',
    primaryColor: '#38bdf8',
    secondaryColor: '#ef4444',
    baseDetonateDamage: 34,
    maxStacks: 3,
  },
  raijin: {
    id: 'raijin',
    kanji: '雷',
    markName: 'LÔI ẤN',
    detonateCallout: 'LIÊN HOÀN LÔI!',
    linkArtName: 'LÔI LIÊN THƯƠNG',
    linkShortLabel: 'LÔI LIÊN',
    primaryColor: '#22d3ee',
    secondaryColor: '#facc15',
    baseDetonateDamage: 30,
    maxStacks: 3,
  },
  kagura: {
    id: 'kagura',
    kanji: '炎',
    markName: 'VIÊM ẤN',
    detonateCallout: 'VIÊM NGỤC BÙNG NỔ!',
    linkArtName: 'NHẬT THỰC TRẢM',
    linkShortLabel: 'KÍCH NỔ',
    primaryColor: '#f97316',
    secondaryColor: '#fde047',
    baseDetonateDamage: 38,
    maxStacks: 3,
  },
  zero: {
    id: 'zero',
    kanji: '影',
    markName: 'ẢNH ẤN',
    detonateCallout: 'ẢNH SÁT!',
    linkArtName: 'ẢNH BỘ ÁM SÁT',
    linkShortLabel: 'ẢNH BỘ',
    primaryColor: '#10b981',
    secondaryColor: '#a7f3d0',
    baseDetonateDamage: 32,
    maxStacks: 3,
  },
};

export function getElementalMarkSpec(id: CharacterId): ElementalMarkSpec {
  return ELEMENTAL_MARK_SPECS[id];
}

/**
 * Computes elemental detonation burst damage scaled by mark stacks (1..3) and Awakening state.
 */
export function computeDetonationDamage(
  id: CharacterId,
  stacks: number,
  awakened: boolean,
  damageMultiplier = 1
): number {
  const clampedStacks = Math.max(1, Math.min(3, Math.floor(stacks)));
  const spec = ELEMENTAL_MARK_SPECS[id];
  const stackScale = clampedStacks === 1 ? 1.0 : clampedStacks === 2 ? 1.65 : 2.45;
  const awakenScale = awakened ? 1.35 : 1.0;
  return Math.round(spec.baseDetonateDamage * stackScale * awakenScale * damageMultiplier);
}

/**
 * Computes Awakened + Marked Overdrive Ultimate damage against Bosses.
 */
export function computeOverdriveUltimateDamage(
  baseBossDamage: number,
  awakened: boolean,
  markStacks: number
): number {
  const clampedStacks = Math.max(0, Math.min(3, Math.floor(markStacks)));
  const awakenMult = awakened ? 1.35 : 1.0;
  const markMult = 1 + clampedStacks * 0.1;
  return Math.round(baseBossDamage * awakenMult * markMult);
}

/**
 * Returns cooldown refund (in seconds) for [U] Signature Skill and [L] Dash on Synergy Detonation.
 */
export function computeSynergyCooldownRefund(
  id: CharacterId,
  detonatedCount: number
): { specialRefund: number; dashRefund: number; healAmount: number; rageBonus: number } {
  const count = Math.max(1, Math.min(4, Math.floor(detonatedCount)));
  if (id === 'raijin') {
    return {
      specialRefund: 0.95 + (count - 1) * 0.3,
      dashRefund: 0.45,
      healAmount: 0,
      rageBonus: 7 * count,
    };
  }
  if (id === 'zero') {
    return {
      specialRefund: 1.05 + (count - 1) * 0.25,
      dashRefund: 0.48,
      healAmount: 0,
      rageBonus: 8 * count,
    };
  }
  if (id === 'kagura') {
    return {
      specialRefund: 0.55 + (count - 1) * 0.2,
      dashRefund: 0.25,
      healAmount: 8 + (count - 1) * 4,
      rageBonus: 6 * count,
    };
  }
  // kuro
  return {
    specialRefund: 0.65 + (count - 1) * 0.25,
    dashRefund: 0.65,
    healAmount: 0,
    rageBonus: 9 * count,
  };
}
