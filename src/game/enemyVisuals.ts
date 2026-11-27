import type { BossId, EnemyType } from './types';
import type { EnemyOutfitId } from './renderer/types';

export type RegularEnemyType = Exclude<EnemyType, BossId>;

export interface EnemyVisualProfile {
  id: EnemyType;
  outfit: EnemyOutfitId;
  bodyColor: string;
  inkOutlineColor: string;
  rimColor: string;
  accentColor: string;
  vermilionAccent: string;
  capeColor?: string;
  lineWidth: number;
  headRadius: number;
  phase2BodyColor?: string;
  phase2RimColor?: string;
  phase2AuraMode?: 'purple' | 'crimson' | 'cyan' | 'gold' | 'ember' | 'emerald';
  projectileColor?: string;
  projectileRimColor?: string;
}

const MOB_VISUAL_PROFILES: Record<RegularEnemyType, EnemyVisualProfile> = {
  meta_melee: {
    id: 'meta_melee',
    outfit: 'meta_mob',
    bodyColor: '#f8fafc',
    inkOutlineColor: '#0b0c10',
    rimColor: '#e2e8f0',
    accentColor: '#94a3b8',
    vermilionAccent: '#dc2626',
    lineWidth: 9.2,
    headRadius: 11.6,
  },
  deepseek_gunner: {
    id: 'deepseek_gunner',
    outfit: 'gunner_mob',
    bodyColor: '#e2e8f0',
    inkOutlineColor: '#0b0c10',
    rimColor: '#bae6fd',
    accentColor: '#38bdf8',
    vermilionAccent: '#ef4444',
    lineWidth: 9.2,
    headRadius: 11.6,
    projectileColor: '#fde047',
    projectileRimColor: '#38bdf8',
  },
  swarm_blade: {
    id: 'swarm_blade',
    outfit: 'swarm_mob',
    bodyColor: '#f1f5f9',
    inkOutlineColor: '#0b0c10',
    rimColor: '#e9d5ff',
    accentColor: '#a855f7',
    vermilionAccent: '#dc2626',
    lineWidth: 9.2,
    headRadius: 11.6,
  },
  shield_guard: {
    id: 'shield_guard',
    outfit: 'aegis_mob',
    bodyColor: '#cbd5e1',
    inkOutlineColor: '#0b0c10',
    rimColor: '#e0f2fe',
    accentColor: '#38bdf8',
    vermilionAccent: '#dc2626',
    lineWidth: 9.4,
    headRadius: 11.8,
  },
  cyber_ninja: {
    id: 'cyber_ninja',
    outfit: 'ninja_mob',
    bodyColor: '#94a3b8',
    inkOutlineColor: '#0b0c10',
    rimColor: '#fecdd3',
    accentColor: '#f43f5e',
    vermilionAccent: '#dc2626',
    lineWidth: 9.2,
    headRadius: 11.6,
    projectileColor: '#f43f5e',
    projectileRimColor: '#fecdd3',
  },
  heavy_brute: {
    id: 'heavy_brute',
    outfit: 'brute_mob',
    bodyColor: '#fed7aa',
    inkOutlineColor: '#0b0c10',
    rimColor: '#fef08a',
    accentColor: '#f97316',
    vermilionAccent: '#dc2626',
    lineWidth: 11.4,
    headRadius: 13.2,
  },
  frost_mage: {
    id: 'frost_mage',
    outfit: 'arcanist_mob',
    bodyColor: '#bae6fd',
    inkOutlineColor: '#0b0c10',
    rimColor: '#ecfeff',
    accentColor: '#22d3ee',
    vermilionAccent: '#dc2626',
    lineWidth: 9.2,
    headRadius: 11.6,
    projectileColor: '#22d3ee',
    projectileRimColor: '#e0f2fe',
  },
  berserker_reaper: {
    id: 'berserker_reaper',
    outfit: 'reaper_mob',
    bodyColor: '#fecdd3',
    inkOutlineColor: '#0b0c10',
    rimColor: '#ffe4e6',
    accentColor: '#f43f5e',
    vermilionAccent: '#dc2626',
    lineWidth: 9.2,
    headRadius: 11.6,
  },
};

const ELITE_VISUAL_OVERRIDES: Record<
  RegularEnemyType,
  {
    bodyColor: string;
    rimColor: string;
    accentColor: string;
    vermilionAccent: string;
    projectileColor?: string;
    projectileRimColor?: string;
  }
> = {
  meta_melee: {
    bodyColor: '#fefce8',
    rimColor: '#fef08a',
    accentColor: '#facc15',
    vermilionAccent: '#ef4444',
  },
  deepseek_gunner: {
    bodyColor: '#fef3c7',
    rimColor: '#fde047',
    accentColor: '#f59e0b',
    vermilionAccent: '#ef4444',
    projectileColor: '#fb923c',
    projectileRimColor: '#fef08a',
  },
  swarm_blade: {
    bodyColor: '#faf5ff',
    rimColor: '#fde047',
    accentColor: '#f59e0b',
    vermilionAccent: '#f43f5e',
  },
  shield_guard: {
    bodyColor: '#fef3c7',
    rimColor: '#fef08a',
    accentColor: '#facc15',
    vermilionAccent: '#ef4444',
  },
  cyber_ninja: {
    bodyColor: '#e2e8f0',
    rimColor: '#fde047',
    accentColor: '#fbbf24',
    vermilionAccent: '#f43f5e',
    projectileColor: '#fb7185',
    projectileRimColor: '#fef08a',
  },
  heavy_brute: {
    bodyColor: '#fde68a',
    rimColor: '#fef9c3',
    accentColor: '#facc15',
    vermilionAccent: '#ef4444',
  },
  frost_mage: {
    bodyColor: '#e0f2fe',
    rimColor: '#fef08a',
    accentColor: '#facc15',
    vermilionAccent: '#38bdf8',
    projectileColor: '#38bdf8',
    projectileRimColor: '#fef08a',
  },
  berserker_reaper: {
    bodyColor: '#ffe4e6',
    rimColor: '#fde047',
    accentColor: '#f59e0b',
    vermilionAccent: '#e11d48',
  },
};

const BOSS_VISUAL_PROFILES: Record<BossId, EnemyVisualProfile> = {
  boss_haiku: {
    id: 'boss_haiku',
    outfit: 'haiku',
    bodyColor: '#9b8bb4',
    inkOutlineColor: '#0b0c10',
    rimColor: '#f8fafc',
    accentColor: '#38bdf8',
    vermilionAccent: '#ef4444',
    lineWidth: 10.6,
    headRadius: 13.2,
    phase2BodyColor: '#c4b5fd',
    phase2RimColor: '#fca5a5',
    phase2AuraMode: 'crimson',
  },
  boss_astra: {
    id: 'boss_astra',
    outfit: 'astra',
    bodyColor: '#f3e5ab',
    inkOutlineColor: '#0b0c10',
    rimColor: '#ffffff',
    accentColor: '#fbbf24',
    vermilionAccent: '#dc2626',
    lineWidth: 10.5,
    headRadius: 13.2,
    phase2BodyColor: '#fef08a',
    phase2RimColor: '#fda4af',
    phase2AuraMode: 'crimson',
    projectileColor: '#fbbf24',
    projectileRimColor: '#fef9c3',
  },
  boss_glacius: {
    id: 'boss_glacius',
    outfit: 'glacius',
    bodyColor: '#e0f2fe',
    inkOutlineColor: '#06101e',
    rimColor: '#ffffff',
    accentColor: '#22d3ee',
    vermilionAccent: '#ef4444',
    capeColor: '#0284c7',
    lineWidth: 10.8,
    headRadius: 13.2,
    phase2BodyColor: '#bae6fd',
    phase2RimColor: '#67e8f9',
    phase2AuraMode: 'cyan',
    projectileColor: '#22d3ee',
    projectileRimColor: '#ffffff',
  },
  boss_opus: {
    id: 'boss_opus',
    outfit: 'opus',
    bodyColor: '#94a3b8',
    inkOutlineColor: '#0b0c10',
    rimColor: '#f8fafc',
    accentColor: '#ef4444',
    vermilionAccent: '#fef08a',
    capeColor: '#dc2626',
    lineWidth: 10.5,
    headRadius: 13.2,
    phase2BodyColor: '#cbd5e1',
    phase2RimColor: '#fde047',
    phase2AuraMode: 'crimson',
    projectileColor: '#ef4444',
    projectileRimColor: '#fef08a',
  },
  boss_vulcan: {
    id: 'boss_vulcan',
    outfit: 'vulcan',
    bodyColor: '#fdba74',
    inkOutlineColor: '#0b0c10',
    rimColor: '#fef9c3',
    accentColor: '#f97316',
    vermilionAccent: '#ef4444',
    lineWidth: 12.2,
    headRadius: 14.4,
    phase2BodyColor: '#fb923c',
    phase2RimColor: '#ffffff',
    phase2AuraMode: 'ember',
  },
  boss_sol: {
    id: 'boss_sol',
    outfit: 'sol',
    bodyColor: '#f8fafc',
    inkOutlineColor: '#0b0c10',
    rimColor: '#67e8f9',
    accentColor: '#fb923c',
    vermilionAccent: '#22d3ee',
    capeColor: '#181a20',
    lineWidth: 10.5,
    headRadius: 13.2,
    phase2BodyColor: '#ffffff',
    phase2RimColor: '#fda4af',
    phase2AuraMode: 'crimson',
    projectileColor: '#fb923c',
    projectileRimColor: '#22d3ee',
  },
  boss_nyx: {
    id: 'boss_nyx',
    outfit: 'nyx',
    bodyColor: '#ddd6fe',
    inkOutlineColor: '#07040e',
    rimColor: '#f8fafc',
    accentColor: '#a855f7',
    vermilionAccent: '#f43f5e',
    capeColor: '#3b0764',
    lineWidth: 10.5,
    headRadius: 13.2,
    phase2BodyColor: '#e9d5ff',
    phase2RimColor: '#fda4af',
    phase2AuraMode: 'purple',
    projectileColor: '#a855f7',
    projectileRimColor: '#f5d0fe',
  },
  boss_fable: {
    id: 'boss_fable',
    outfit: 'fable',
    bodyColor: '#bef264',
    inkOutlineColor: '#090b10',
    rimColor: '#ffffff',
    accentColor: '#22c55e',
    vermilionAccent: '#c084fc',
    lineWidth: 10.6,
    headRadius: 13.4,
    phase2BodyColor: '#d9f99d',
    phase2RimColor: '#f0abfc',
    phase2AuraMode: 'crimson',
    projectileColor: '#c084fc',
    projectileRimColor: '#ecfccb',
  },
  boss_raiden: {
    id: 'boss_raiden',
    outfit: 'raiden',
    bodyColor: '#bae6fd',
    inkOutlineColor: '#060c18',
    rimColor: '#fef08a',
    accentColor: '#38bdf8',
    vermilionAccent: '#facc15',
    capeColor: '#0284c7',
    lineWidth: 10.8,
    headRadius: 13.4,
    phase2BodyColor: '#e0f2fe',
    phase2RimColor: '#ffffff',
    phase2AuraMode: 'cyan',
    projectileColor: '#38bdf8',
    projectileRimColor: '#fef08a',
  },
  boss_akaza: {
    id: 'boss_akaza',
    outfit: 'akaza',
    bodyColor: '#ffe4e6',
    inkOutlineColor: '#0b0407',
    rimColor: '#ffffff',
    accentColor: '#f43f5e',
    vermilionAccent: '#fef08a',
    capeColor: '#9f1239',
    lineWidth: 11.0,
    headRadius: 13.6,
    phase2BodyColor: '#fecdd3',
    phase2RimColor: '#fde047',
    phase2AuraMode: 'crimson',
    projectileColor: '#f43f5e',
    projectileRimColor: '#ffe4e6',
  },
  boss_kronos: {
    id: 'boss_kronos',
    outfit: 'kronos',
    bodyColor: '#fef9c3',
    inkOutlineColor: '#0b0814',
    rimColor: '#e0f2fe',
    accentColor: '#eab308',
    vermilionAccent: '#c084fc',
    capeColor: '#854d0e',
    lineWidth: 10.8,
    headRadius: 13.4,
    phase2BodyColor: '#fde047',
    phase2RimColor: '#f5d0fe',
    phase2AuraMode: 'gold',
    projectileColor: '#eab308',
    projectileRimColor: '#e0f2fe',
  },
  boss_omega: {
    id: 'boss_omega',
    outfit: 'omega',
    bodyColor: '#fed7aa',
    inkOutlineColor: '#09030f',
    rimColor: '#fef9c3',
    accentColor: '#f97316',
    vermilionAccent: '#e879f9',
    capeColor: '#ea580c',
    lineWidth: 12.4,
    headRadius: 14.6,
    phase2BodyColor: '#fde68a',
    phase2RimColor: '#f0abfc',
    phase2AuraMode: 'ember',
    projectileColor: '#f97316',
    projectileRimColor: '#f5d0fe',
  },
};

export function getEnemyVisualProfile(
  type: EnemyType,
  isElite = false,
  phase: 1 | 2 = 1
): EnemyVisualProfile {
  if (type.startsWith('boss_')) {
    const bossProfile =
      BOSS_VISUAL_PROFILES[type as BossId] ?? BOSS_VISUAL_PROFILES.boss_fable;
    if (phase === 2) {
      return {
        ...bossProfile,
        bodyColor: bossProfile.phase2BodyColor ?? bossProfile.bodyColor,
        rimColor: bossProfile.phase2RimColor ?? bossProfile.rimColor,
      };
    }
    return { ...bossProfile };
  }

  const mobKey = (
    type in MOB_VISUAL_PROFILES ? type : 'meta_melee'
  ) as RegularEnemyType;
  const base = MOB_VISUAL_PROFILES[mobKey];

  if (!isElite) {
    return { ...base };
  }

  const elite = ELITE_VISUAL_OVERRIDES[mobKey];
  return {
    ...base,
    bodyColor: elite.bodyColor,
    rimColor: elite.rimColor,
    accentColor: elite.accentColor,
    vermilionAccent: elite.vermilionAccent,
    lineWidth: mobKey === 'heavy_brute' ? 12.0 : 10.0,
    headRadius: mobKey === 'heavy_brute' ? 13.8 : 12.2,
    projectileColor: elite.projectileColor ?? base.projectileColor,
    projectileRimColor: elite.projectileRimColor ?? base.projectileRimColor,
  };
}

export function listAllEnemyVisualProfiles(): EnemyVisualProfile[] {
  return [
    ...Object.values(MOB_VISUAL_PROFILES),
    ...Object.values(BOSS_VISUAL_PROFILES),
  ];
}
