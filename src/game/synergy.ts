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
  aether: {
    id: 'aether',
    kanji: '宙',
    markName: 'TINH ẤN',
    detonateCallout: 'TINH QUANG BẠO!',
    linkArtName: 'CỘNG HƯỞNG TINH VÂN',
    linkShortLabel: 'TINH BẠO',
    primaryColor: '#e879f9',
    secondaryColor: '#38bdf8',
    baseDetonateDamage: 36,
    maxStacks: 3,
  },
  valkyrie: {
    id: 'valkyrie',
    kanji: '聖',
    markName: 'THÁNH ẤN',
    detonateCallout: 'THÁNH QUANG PHÁN QUYẾT!',
    linkArtName: 'THIÊN KÍCH PHÁN QUYẾT',
    linkShortLabel: 'THÁNH QUANG',
    primaryColor: '#fde047',
    secondaryColor: '#f8fafc',
    baseDetonateDamage: 37,
    maxStacks: 3,
  },
  mirage: {
    id: 'mirage',
    kanji: '鏡',
    markName: 'KÍNH ẤN',
    detonateCallout: 'VỠ KÍNH HƯ KHÔNG!',
    linkArtName: 'KÍNH GIỚI ĐOẠN KHÔNG',
    linkShortLabel: 'KÍNH ẤN',
    primaryColor: '#c084fc',
    secondaryColor: '#e2e8f0',
    baseDetonateDamage: 38,
    maxStacks: 3,
  },
  chrono: {
    id: 'chrono',
    kanji: '時',
    markName: 'THỜI ẤN',
    detonateCallout: 'BÙNG NỔ THỜI GIAN!',
    linkArtName: 'NHỊP ĐỒNG HỒ TRẢM',
    linkShortLabel: 'THỜI ẤN',
    primaryColor: '#2dd4bf',
    secondaryColor: '#f59e0b',
    baseDetonateDamage: 39,
    maxStacks: 3,
  },
  mactien: {
    id: 'mactien',
    kanji: '静',
    markName: 'TĨNH ẤN',
    detonateCallout: 'PHÁ TĨNH ẤN!',
    linkArtName: 'CHU SA PHONG ẤN',
    linkShortLabel: 'TĨNH ẤN',
    primaryColor: '#ef4444',
    secondaryColor: '#2dd4bf',
    baseDetonateDamage: 38,
    maxStacks: 3,
  },
};

export function getElementalMarkSpec(id: CharacterId): ElementalMarkSpec {
  return ELEMENTAL_MARK_SPECS[id] ?? ELEMENTAL_MARK_SPECS.kuro;
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
  const stackScale = clampedStacks === 1 ? 1.0 : clampedStacks === 2 ? 1.6 : 2.3;
  const awakenScale = awakened ? 1.24 : 1.0;
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
  const awakenMult = awakened ? 1.26 : 1.0;
  const markMult = 1 + clampedStacks * 0.08;
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
      specialRefund: 0.65 + (count - 1) * 0.22,
      dashRefund: 0.35,
      healAmount: 0,
      rageBonus: 5 * count,
    };
  }
  if (id === 'zero') {
    return {
      specialRefund: 0.72 + (count - 1) * 0.2,
      dashRefund: 0.38,
      healAmount: 0,
      rageBonus: 5 * count,
    };
  }
  if (id === 'kagura') {
    return {
      specialRefund: 0.45 + (count - 1) * 0.16,
      dashRefund: 0.22,
      healAmount: 6 + (count - 1) * 3,
      rageBonus: 4 * count,
    };
  }
  if (id === 'mirage') {
    return {
      specialRefund: 0.68 + (count - 1) * 0.22,
      dashRefund: 0.42,
      healAmount: 0,
      rageBonus: 6 * count,
    };
  }
  if (id === 'chrono') {
    return {
      specialRefund: 0.75 + (count - 1) * 0.24,
      dashRefund: 0.52 + (count - 1) * 0.1,
      healAmount: 0,
      rageBonus: 6 * count,
    };
  }
  if (id === 'mactien') {
    return {
      specialRefund: 0.7 + (count - 1) * 0.22,
      dashRefund: 0.38,
      healAmount: 3 + (count - 1) * 2,
      rageBonus: 6 * count,
    };
  }
  // kuro
  return {
    specialRefund: 0.55 + (count - 1) * 0.2,
    dashRefund: 0.48,
    healAmount: 0,
    rageBonus: 6 * count,
  };
}
