import { ARENA_WIDTH, BOSS_ORDER } from './rules';
import type {
  ActiveBlessingBadge,
  BlessingChoice,
  BlessingId,
  BossId,
  EnemyType,
  StageHazardKind,
  StageThemeId,
} from './types';

export type RegularEnemyType = Exclude<EnemyType, BossId>;

export interface StageWaveSpawn {
  delay: number;
  type: RegularEnemyType;
  side: 'left' | 'right';
  elite?: boolean;
}

export interface CampaignStage {
  index: number;
  code: string;
  name: string;
  subtitle: string;
  theme: StageThemeId;
  accentColor: string;
  bossId: BossId;
  hazard: StageHazardKind;
  hazardInterval: number;
  hint: string;
  waves: StageWaveSpawn[][];
}

export interface StageEnemyScaling {
  mobHpMult: number;
  mobDmgMult: number;
  bossHpMult: number;
  bossDmgMult: number;
}

const CAMPAIGN_MOB_HP_MULTS: readonly number[] = [
  0.88, 0.94, 1.0, 1.06, 1.12, 1.18, 1.24, 1.3, 1.35, 1.4, 1.44, 1.48,
];
const CAMPAIGN_MOB_DMG_MULTS: readonly number[] = [
  0.9, 0.94, 0.98, 1.02, 1.06, 1.1, 1.14, 1.18, 1.21, 1.24, 1.27, 1.3,
];
const CAMPAIGN_BOSS_HP_MULTS: readonly number[] = [
  0.9, 0.93, 0.96, 1.0, 1.0, 1.02, 1.0, 0.95, 0.92, 0.9, 0.88, 0.86,
];
const CAMPAIGN_BOSS_DMG_MULTS: readonly number[] = [
  0.92, 0.95, 0.98, 1.0, 1.02, 1.04, 1.06, 1.08, 1.1, 1.12, 1.14, 1.16,
];

export function computeStageEnemyScaling(stageIndex: number): StageEnemyScaling {
  const idx = Math.max(0, Math.min(CAMPAIGN_STAGES.length - 1, Math.floor(stageIndex)));
  return {
    mobHpMult: CAMPAIGN_MOB_HP_MULTS[idx] ?? 1,
    mobDmgMult: CAMPAIGN_MOB_DMG_MULTS[idx] ?? 1,
    bossHpMult: CAMPAIGN_BOSS_HP_MULTS[idx] ?? 1,
    bossDmgMult: CAMPAIGN_BOSS_DMG_MULTS[idx] ?? 1,
  };
}

export type StagePillarStyle =
  | 'lab'
  | 'obelisk'
  | 'ice_spire'
  | 'torii'
  | 'reactor'
  | 'cyber_tower'
  | 'gothic_arch'
  | 'monolith';

export interface StageThemePalette {
  id: StageThemeId;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  spotlightColor: string;
  pillarStyle: StagePillarStyle;
  pillarColor: string;
  pillarTrim: string;
  floorTop: string;
  floorMid: string;
  floorBottom: string;
  gridColor: string;
  moteColor: string;
  moteMotion: 'rise' | 'fall' | 'drift';
  mistColor: string;
  mistAlpha: number;
  horizonRimColor: string;
}

export const STAGE_THEME_PALETTES: Record<StageThemeId, StageThemePalette> = {
  genesis_lab: {
    id: 'genesis_lab',
    skyTop: '#101624',
    skyMid: '#1a2438',
    skyBottom: '#0e131d',
    spotlightColor: '#38bdf8',
    pillarStyle: 'lab',
    pillarColor: 'rgba(12, 18, 30, 0.62)',
    pillarTrim: 'rgba(56, 189, 248, 0.24)',
    floorTop: '#1a2130',
    floorMid: '#121722',
    floorBottom: '#080b10',
    gridColor: 'rgba(56, 189, 248, 0.11)',
    moteColor: '#bae6fd',
    moteMotion: 'rise',
    mistColor: '#94a3b8',
    mistAlpha: 0.20,
    horizonRimColor: 'rgba(186, 230, 253, 0.56)',
  },
  solar_observatory: {
    id: 'solar_observatory',
    skyTop: '#1c120c',
    skyMid: '#3b2112',
    skyBottom: '#1a100b',
    spotlightColor: '#fbbf24',
    pillarStyle: 'obelisk',
    pillarColor: 'rgba(34, 21, 12, 0.68)',
    pillarTrim: 'rgba(251, 191, 36, 0.3)',
    floorTop: '#291c12',
    floorMid: '#1c130d',
    floorBottom: '#0c0806',
    gridColor: 'rgba(251, 191, 36, 0.13)',
    moteColor: '#fde68a',
    moteMotion: 'drift',
    mistColor: '#d6c3a5',
    mistAlpha: 0.22,
    horizonRimColor: 'rgba(253, 230, 138, 0.58)',
  },
  cryo_citadel: {
    id: 'cryo_citadel',
    skyTop: '#081726',
    skyMid: '#102e4a',
    skyBottom: '#091929',
    spotlightColor: '#22d3ee',
    pillarStyle: 'ice_spire',
    pillarColor: 'rgba(14, 42, 68, 0.58)',
    pillarTrim: 'rgba(125, 211, 252, 0.38)',
    floorTop: '#16324a',
    floorMid: '#0e2235',
    floorBottom: '#06111c',
    gridColor: 'rgba(125, 211, 252, 0.16)',
    moteColor: '#e0f2fe',
    moteMotion: 'fall',
    mistColor: '#94a3b8',
    mistAlpha: 0.23,
    horizonRimColor: 'rgba(224, 242, 254, 0.62)',
  },
  crimson_dojo: {
    id: 'crimson_dojo',
    skyTop: '#1a0810',
    skyMid: '#36101d',
    skyBottom: '#16070d',
    spotlightColor: '#ef4444',
    pillarStyle: 'torii',
    pillarColor: 'rgba(38, 10, 18, 0.72)',
    pillarTrim: 'rgba(239, 68, 68, 0.36)',
    floorTop: '#261119',
    floorMid: '#190b11',
    floorBottom: '#0b0508',
    gridColor: 'rgba(248, 113, 113, 0.12)',
    moteColor: '#fda4af',
    moteMotion: 'fall',
    mistColor: '#cbd5e1',
    mistAlpha: 0.27,
    horizonRimColor: 'rgba(248, 250, 252, 0.56)',
  },
  magma_foundry: {
    id: 'magma_foundry',
    skyTop: '#1a0b07',
    skyMid: '#3d1609',
    skyBottom: '#1c0905',
    spotlightColor: '#f97316',
    pillarStyle: 'reactor',
    pillarColor: 'rgba(28, 13, 9, 0.75)',
    pillarTrim: 'rgba(249, 115, 22, 0.38)',
    floorTop: '#2b150e',
    floorMid: '#1d0e09',
    floorBottom: '#0d0604',
    gridColor: 'rgba(251, 146, 60, 0.15)',
    moteColor: '#fdba74',
    moteMotion: 'rise',
    mistColor: '#a8a29e',
    mistAlpha: 0.22,
    horizonRimColor: 'rgba(253, 186, 116, 0.58)',
  },
  cyber_spire: {
    id: 'cyber_spire',
    skyTop: '#0c0a24',
    skyMid: '#1d1442',
    skyBottom: '#0a1229',
    spotlightColor: '#e879f9',
    pillarStyle: 'cyber_tower',
    pillarColor: 'rgba(14, 12, 38, 0.68)',
    pillarTrim: 'rgba(34, 211, 238, 0.36)',
    floorTop: '#161436',
    floorMid: '#0f0e26',
    floorBottom: '#070614',
    gridColor: 'rgba(232, 121, 249, 0.16)',
    moteColor: '#67e8f9',
    moteMotion: 'rise',
    mistColor: '#94a3b8',
    mistAlpha: 0.22,
    horizonRimColor: 'rgba(165, 243, 252, 0.58)',
  },
  shadow_sanctum: {
    id: 'shadow_sanctum',
    skyTop: '#0f071c',
    skyMid: '#24103d',
    skyBottom: '#0e0619',
    spotlightColor: '#a855f7',
    pillarStyle: 'gothic_arch',
    pillarColor: 'rgba(20, 9, 36, 0.74)',
    pillarTrim: 'rgba(192, 132, 252, 0.32)',
    floorTop: '#1d1130',
    floorMid: '#130b21',
    floorBottom: '#080410',
    gridColor: 'rgba(168, 85, 247, 0.14)',
    moteColor: '#d8b4fe',
    moteMotion: 'rise',
    mistColor: '#cbd5e1',
    mistAlpha: 0.28,
    horizonRimColor: 'rgba(233, 213, 255, 0.62)',
  },
  sovereign_throne: {
    id: 'sovereign_throne',
    skyTop: '#071712',
    skyMid: '#112e28',
    skyBottom: '#130b24',
    spotlightColor: '#22c55e',
    pillarStyle: 'monolith',
    pillarColor: 'rgba(10, 28, 24, 0.68)',
    pillarTrim: 'rgba(34, 197, 94, 0.38)',
    floorTop: '#122923',
    floorMid: '#0d1c1a',
    floorBottom: '#070a12',
    gridColor: 'rgba(74, 222, 128, 0.16)',
    moteColor: '#86efac',
    moteMotion: 'rise',
    mistColor: '#cbd5e1',
    mistAlpha: 0.25,
    horizonRimColor: 'rgba(187, 247, 208, 0.58)',
  },
  mecha_citadel: {
    id: 'mecha_citadel',
    skyTop: '#040d1a',
    skyMid: '#0b223d',
    skyBottom: '#14385c',
    spotlightColor: '#38bdf8',
    pillarStyle: 'cyber_tower',
    pillarColor: 'rgba(8, 22, 42, 0.78)',
    pillarTrim: 'rgba(56, 189, 248, 0.48)',
    floorTop: '#0d223b',
    floorMid: '#081628',
    floorBottom: '#040a14',
    gridColor: 'rgba(56, 189, 248, 0.2)',
    moteColor: '#fde047',
    moteMotion: 'fall',
    mistColor: '#94a3b8',
    mistAlpha: 0.22,
    horizonRimColor: 'rgba(186, 230, 253, 0.62)',
  },
  blood_shrine: {
    id: 'blood_shrine',
    skyTop: '#16040a',
    skyMid: '#360916',
    skyBottom: '#1c0612',
    spotlightColor: '#f43f5e',
    pillarStyle: 'torii',
    pillarColor: 'rgba(38, 7, 15, 0.78)',
    pillarTrim: 'rgba(244, 63, 94, 0.46)',
    floorTop: '#2c0914',
    floorMid: '#1a050c',
    floorBottom: '#0a0205',
    gridColor: 'rgba(251, 113, 133, 0.18)',
    moteColor: '#fda4af',
    moteMotion: 'fall',
    mistColor: '#e2e8f0',
    mistAlpha: 0.29,
    horizonRimColor: 'rgba(248, 250, 252, 0.62)',
  },
  mirage_oasis: {
    id: 'mirage_oasis',
    skyTop: '#120b24',
    skyMid: '#2d1c47',
    skyBottom: '#4a2c1d',
    spotlightColor: '#eab308',
    pillarStyle: 'obelisk',
    pillarColor: 'rgba(38, 24, 18, 0.74)',
    pillarTrim: 'rgba(250, 204, 21, 0.44)',
    floorTop: '#332218',
    floorMid: '#211510',
    floorBottom: '#0f0907',
    gridColor: 'rgba(250, 204, 21, 0.18)',
    moteColor: '#fef08a',
    moteMotion: 'drift',
    mistColor: '#cbd5e1',
    mistAlpha: 0.24,
    horizonRimColor: 'rgba(254, 240, 138, 0.60)',
  },
  chaos_abyss: {
    id: 'chaos_abyss',
    skyTop: '#09030f',
    skyMid: '#24082b',
    skyBottom: '#3b0d14',
    spotlightColor: '#f97316',
    pillarStyle: 'monolith',
    pillarColor: 'rgba(22, 6, 28, 0.78)',
    pillarTrim: 'rgba(249, 115, 22, 0.48)',
    floorTop: '#260b21',
    floorMid: '#160614',
    floorBottom: '#080208',
    gridColor: 'rgba(232, 121, 249, 0.2)',
    moteColor: '#fb923c',
    moteMotion: 'rise',
    mistColor: '#e2e8f0',
    mistAlpha: 0.29,
    horizonRimColor: 'rgba(253, 186, 116, 0.64)',
  },
  solo_arena: {
    id: 'solo_arena',
    skyTop: '#0a0d14',
    skyMid: '#121826',
    skyBottom: '#0b0f18',
    spotlightColor: '#e2e8f0',
    pillarStyle: 'monolith',
    pillarColor: 'rgba(15, 21, 34, 0.45)',
    pillarTrim: 'rgba(148, 163, 184, 0.22)',
    floorTop: '#161d2b',
    floorMid: '#101520',
    floorBottom: '#070a10',
    gridColor: 'rgba(148, 163, 184, 0.12)',
    moteColor: '#cbd5e1',
    moteMotion: 'drift',
    mistColor: '#64748b',
    mistAlpha: 0.10,
    horizonRimColor: 'rgba(226, 232, 240, 0.42)',
  },
};

export interface SoloArenaConfig {
  id: 'solo_arena';
  code: string;
  name: string;
  subtitle: string;
  theme: StageThemeId;
  leftWall: number;
  rightWall: number;
  spawnPlayerX: number;
  spawnBotX: number;
}

export const SOLO_ARENA_STAGE: SoloArenaConfig = {
  id: 'solo_arena',
  code: '1V1',
  name: 'VÕ ĐÀI SOLO',
  subtitle: 'SOLO ARENA · BEST OF 3',
  theme: 'solo_arena',
  leftWall: Math.round(ARENA_WIDTH * 0.5 - 520),
  rightWall: Math.round(ARENA_WIDTH * 0.5 + 520),
  spawnPlayerX: Math.round(ARENA_WIDTH * 0.5 - 230),
  spawnBotX: Math.round(ARENA_WIDTH * 0.5 + 230),
};

export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    index: 0,
    code: '01',
    name: 'PHÒNG THÍ NGHIỆM',
    subtitle: 'GENESIS LAB · HAIKU',
    theme: 'genesis_lab',
    accentColor: '#38bdf8',
    bossId: 'boss_haiku',
    hazard: 'none',
    hazardInterval: 0,
    hint: 'Chặt chém [J] · Lướt [Shift] Né Hoàn Hảo · Phản đòn [K]',
    waves: [
      [
        { delay: 0.7, type: 'meta_melee', side: 'right' },
        { delay: 1.2, type: 'meta_melee', side: 'left' },
        { delay: 1.9, type: 'deepseek_gunner', side: 'right' },
        { delay: 2.6, type: 'swarm_blade', side: 'left' },
        { delay: 3.4, type: 'meta_melee', side: 'right' },
        { delay: 4.1, type: 'shield_guard', side: 'left' },
      ],
      [
        { delay: 0.5, type: 'shield_guard', side: 'right' },
        { delay: 1.1, type: 'deepseek_gunner', side: 'left' },
        { delay: 1.8, type: 'swarm_blade', side: 'right' },
        { delay: 2.5, type: 'meta_melee', side: 'left' },
        { delay: 3.2, type: 'deepseek_gunner', side: 'right' },
        { delay: 3.9, type: 'heavy_brute', side: 'left' },
        { delay: 4.6, type: 'swarm_blade', side: 'right', elite: true },
      ],
    ],
  },
  {
    index: 1,
    code: '02',
    name: 'ĐÀI THIÊN VĂN',
    subtitle: 'SOLAR OBSERVATORY · ASTRA',
    theme: 'solar_observatory',
    accentColor: '#fbbf24',
    bossId: 'boss_astra',
    hazard: 'none',
    hazardInterval: 0,
    hint: 'Nhảy qua sau lưng Lính Khiên & dùng [U] kết hợp [J] kích nổ Ấn!',
    waves: [
      [
        { delay: 0.5, type: 'swarm_blade', side: 'right' },
        { delay: 1.0, type: 'swarm_blade', side: 'left' },
        { delay: 1.7, type: 'deepseek_gunner', side: 'right' },
        { delay: 2.3, type: 'shield_guard', side: 'left' },
        { delay: 3.0, type: 'deepseek_gunner', side: 'left' },
        { delay: 3.7, type: 'cyber_ninja', side: 'right' },
        { delay: 4.4, type: 'heavy_brute', side: 'left' },
      ],
      [
        { delay: 0.5, type: 'shield_guard', side: 'right', elite: true },
        { delay: 1.1, type: 'swarm_blade', side: 'left' },
        { delay: 1.7, type: 'swarm_blade', side: 'right' },
        { delay: 2.4, type: 'cyber_ninja', side: 'left' },
        { delay: 3.1, type: 'deepseek_gunner', side: 'right' },
        { delay: 3.8, type: 'heavy_brute', side: 'left', elite: true },
        { delay: 4.5, type: 'deepseek_gunner', side: 'left' },
      ],
    ],
  },
  {
    index: 2,
    code: '03',
    name: 'THÀNH TRÌ BĂNG GIÁ',
    subtitle: 'CRYO CITADEL · GLACIUS',
    theme: 'cryo_citadel',
    accentColor: '#22d3ee',
    bossId: 'boss_glacius',
    hazard: 'icicle_drop',
    hazardInterval: 4.6,
    hint: 'Coi chừng Nhũ Băng rơi & Pháp Sư Băng triệu hồi Vòng Tròn Ma Pháp dưới chân!',
    waves: [
      [
        { delay: 0.6, type: 'shield_guard', side: 'right' },
        { delay: 1.2, type: 'frost_mage', side: 'left' },
        { delay: 1.9, type: 'cyber_ninja', side: 'right' },
        { delay: 2.7, type: 'swarm_blade', side: 'left' },
        { delay: 3.4, type: 'deepseek_gunner', side: 'right' },
        { delay: 4.1, type: 'meta_melee', side: 'left' },
      ],
      [
        { delay: 0.5, type: 'heavy_brute', side: 'right' },
        { delay: 1.2, type: 'frost_mage', side: 'left', elite: true },
        { delay: 2.0, type: 'deepseek_gunner', side: 'right' },
        { delay: 2.8, type: 'shield_guard', side: 'left' },
        { delay: 3.5, type: 'berserker_reaper', side: 'right' },
        { delay: 4.2, type: 'cyber_ninja', side: 'left', elite: true },
      ],
    ],
  },
  {
    index: 3,
    code: '04',
    name: 'VÕ ĐƯỜNG HỒNG LIÊN',
    subtitle: 'CRIMSON DOJO · OPUS',
    theme: 'crimson_dojo',
    accentColor: '#ef4444',
    bossId: 'boss_opus',
    hazard: 'none',
    hazardInterval: 0,
    hint: 'Cuồng Đao & Sát Thủ Ảo Ảnh lao tới liên hoàn — canh Parry [K] 2 nhịp để phản sát!',
    waves: [
      [
        { delay: 0.5, type: 'cyber_ninja', side: 'right' },
        { delay: 1.0, type: 'berserker_reaper', side: 'left' },
        { delay: 1.7, type: 'swarm_blade', side: 'right' },
        { delay: 2.3, type: 'swarm_blade', side: 'left' },
        { delay: 3.0, type: 'shield_guard', side: 'right' },
        { delay: 3.7, type: 'deepseek_gunner', side: 'left' },
      ],
      [
        { delay: 0.5, type: 'berserker_reaper', side: 'right', elite: true },
        { delay: 1.2, type: 'heavy_brute', side: 'left' },
        { delay: 2.0, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 2.6, type: 'swarm_blade', side: 'left' },
        { delay: 3.3, type: 'frost_mage', side: 'right' },
        { delay: 4.0, type: 'deepseek_gunner', side: 'left', elite: true },
      ],
    ],
  },
  {
    index: 4,
    code: '05',
    name: 'LÒ DUNG NHAM',
    subtitle: 'MAGMA FOUNDRY · VULCAN',
    theme: 'magma_foundry',
    accentColor: '#f97316',
    bossId: 'boss_vulcan',
    hazard: 'lava_geyser',
    hazardInterval: 4.4,
    hint: 'Tránh Mạch Dung Nham phun trào & đập vỡ Tinh Thể Cường Hóa để lấy Buff!',
    waves: [
      [
        { delay: 0.6, type: 'heavy_brute', side: 'right' },
        { delay: 1.3, type: 'shield_guard', side: 'left' },
        { delay: 2.0, type: 'berserker_reaper', side: 'right' },
        { delay: 2.8, type: 'frost_mage', side: 'left' },
        { delay: 3.5, type: 'heavy_brute', side: 'left' },
        { delay: 4.2, type: 'deepseek_gunner', side: 'right' },
      ],
      [
        { delay: 0.5, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 1.2, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 2.0, type: 'frost_mage', side: 'right' },
        { delay: 2.8, type: 'shield_guard', side: 'left', elite: true },
        { delay: 3.6, type: 'swarm_blade', side: 'right' },
        { delay: 4.2, type: 'deepseek_gunner', side: 'left' },
      ],
    ],
  },
  {
    index: 5,
    code: '06',
    name: 'THÁP VIỄN VỌNG NEON',
    subtitle: 'CYBER SPIRE · SOL',
    theme: 'cyber_spire',
    accentColor: '#e879f9',
    bossId: 'boss_sol',
    hazard: 'orbital_laser',
    hazardInterval: 4.8,
    hint: 'Né Tia Laser Quỹ Đạo khóa vị trí & bấm [K] phản đạn bắn tỉa!',
    waves: [
      [
        { delay: 0.5, type: 'deepseek_gunner', side: 'right', elite: true },
        { delay: 1.0, type: 'frost_mage', side: 'left' },
        { delay: 1.7, type: 'shield_guard', side: 'right' },
        { delay: 2.4, type: 'cyber_ninja', side: 'left' },
        { delay: 3.2, type: 'berserker_reaper', side: 'right' },
        { delay: 3.9, type: 'deepseek_gunner', side: 'left' },
      ],
      [
        { delay: 0.5, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 1.1, type: 'frost_mage', side: 'left', elite: true },
        { delay: 1.9, type: 'heavy_brute', side: 'right' },
        { delay: 2.7, type: 'berserker_reaper', side: 'left' },
        { delay: 3.4, type: 'shield_guard', side: 'right' },
        { delay: 4.1, type: 'deepseek_gunner', side: 'right', elite: true },
      ],
    ],
  },
  {
    index: 6,
    code: '07',
    name: 'THÁNH ĐƯỜNG BÓNG TỐI',
    subtitle: 'SHADOW SANCTUM · NYX',
    theme: 'shadow_sanctum',
    accentColor: '#a855f7',
    bossId: 'boss_nyx',
    hazard: 'void_rift',
    hazardInterval: 5.0,
    hint: 'Lướt thoát lực hút Vết Nứt Hư Không & bắt bài Tử Thần Nyx dịch chuyển!',
    waves: [
      [
        { delay: 0.5, type: 'berserker_reaper', side: 'right', elite: true },
        { delay: 1.1, type: 'frost_mage', side: 'left', elite: true },
        { delay: 1.8, type: 'heavy_brute', side: 'right' },
        { delay: 2.5, type: 'swarm_blade', side: 'left' },
        { delay: 3.2, type: 'cyber_ninja', side: 'left' },
        { delay: 3.9, type: 'deepseek_gunner', side: 'right' },
      ],
      [
        { delay: 0.5, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 1.2, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 2.0, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 2.7, type: 'frost_mage', side: 'left' },
        { delay: 3.4, type: 'shield_guard', side: 'right', elite: true },
        { delay: 4.1, type: 'cyber_ninja', side: 'left' },
      ],
    ],
  },
  {
    index: 7,
    code: '08',
    name: 'NGAI VÀNG HƯ VÔ',
    subtitle: 'SOVEREIGN THRONE · FABLE',
    theme: 'sovereign_throne',
    accentColor: '#22c55e',
    bossId: 'boss_fable',
    hazard: 'orbital_laser',
    hazardInterval: 5.0,
    hint: 'Mở khóa Thức Tỉnh [O] & thanh tẩy Thực Thể Tối Thượng Fable!',
    waves: [
      [
        { delay: 0.5, type: 'shield_guard', side: 'right', elite: true },
        { delay: 1.0, type: 'berserker_reaper', side: 'left' },
        { delay: 1.7, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 2.5, type: 'frost_mage', side: 'left' },
        { delay: 3.2, type: 'swarm_blade', side: 'right' },
        { delay: 3.8, type: 'deepseek_gunner', side: 'left', elite: true },
      ],
      [
        { delay: 0.4, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 1.0, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 1.8, type: 'cyber_ninja', side: 'right' },
        { delay: 2.4, type: 'frost_mage', side: 'left', elite: true },
        { delay: 3.2, type: 'shield_guard', side: 'right' },
        { delay: 3.9, type: 'deepseek_gunner', side: 'left', elite: true },
      ],
    ],
  },
  {
    index: 8,
    code: '09',
    name: 'PHÁO ĐÀI LÔI CƠ',
    subtitle: 'MECHA CITADEL · RAIDEN',
    theme: 'mecha_citadel',
    accentColor: '#38bdf8',
    bossId: 'boss_raiden',
    hazard: 'plasma_mine',
    hazardInterval: 4.5,
    hint: 'Né Lõi Điện Từ Quá Tải trên sàn, đập vỡ Tinh Thể & khuất phục Tướng Quân Raiden!',
    waves: [
      [
        { delay: 0.4, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 0.9, type: 'deepseek_gunner', side: 'left' },
        { delay: 1.6, type: 'berserker_reaper', side: 'right' },
        { delay: 2.2, type: 'frost_mage', side: 'left' },
        { delay: 2.9, type: 'shield_guard', side: 'right', elite: true },
        { delay: 3.6, type: 'swarm_blade', side: 'left', elite: true },
      ],
      [
        { delay: 0.4, type: 'heavy_brute', side: 'left', elite: true },
        { delay: 1.0, type: 'berserker_reaper', side: 'right', elite: true },
        { delay: 1.7, type: 'frost_mage', side: 'left' },
        { delay: 2.4, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 3.1, type: 'deepseek_gunner', side: 'left' },
        { delay: 3.8, type: 'shield_guard', side: 'right', elite: true },
      ],
    ],
  },
  {
    index: 9,
    code: '10',
    name: 'ĐỀN THỜ HUYẾT NGUYỆT',
    subtitle: 'BLOOD MOON SHRINE · AKAZA',
    theme: 'blood_shrine',
    accentColor: '#f43f5e',
    bossId: 'boss_akaza',
    hazard: 'cursed_fang',
    hazardInterval: 4.3,
    hint: 'Nhảy tránh Huyết Kiếm Trận trồi dưới đất & Parry [K] quyền cước của Quỷ Vương Akaza!',
    waves: [
      [
        { delay: 0.4, type: 'berserker_reaper', side: 'right', elite: true },
        { delay: 0.9, type: 'berserker_reaper', side: 'left' },
        { delay: 1.6, type: 'frost_mage', side: 'right', elite: true },
        { delay: 2.2, type: 'shield_guard', side: 'left' },
        { delay: 2.9, type: 'cyber_ninja', side: 'right' },
        { delay: 3.5, type: 'heavy_brute', side: 'left', elite: true },
      ],
      [
        { delay: 0.4, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 1.0, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 1.7, type: 'frost_mage', side: 'right' },
        { delay: 2.3, type: 'frost_mage', side: 'left' },
        { delay: 3.0, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 3.7, type: 'heavy_brute', side: 'left', elite: true },
      ],
    ],
  },
  {
    index: 10,
    code: '11',
    name: 'MÊ CUNG CÁT THỜI GIAN',
    subtitle: 'CHRONO SANDS · KRONOS',
    theme: 'mirage_oasis',
    accentColor: '#eab308',
    bossId: 'boss_kronos',
    hazard: 'void_rift',
    hazardInterval: 4.4,
    hint: 'Thoát lực hút Xoáy Cát Thời Gian & bắt bài nhát chém đảo chiều của Kronos!',
    waves: [
      [
        { delay: 0.4, type: 'frost_mage', side: 'left', elite: true },
        { delay: 0.9, type: 'cyber_ninja', side: 'right', elite: true },
        { delay: 1.5, type: 'berserker_reaper', side: 'left' },
        { delay: 2.2, type: 'deepseek_gunner', side: 'right' },
        { delay: 2.9, type: 'shield_guard', side: 'left', elite: true },
        { delay: 3.6, type: 'cyber_ninja', side: 'right', elite: true },
      ],
      [
        { delay: 0.4, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 1.0, type: 'heavy_brute', side: 'left' },
        { delay: 1.7, type: 'frost_mage', side: 'right', elite: true },
        { delay: 2.3, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 3.0, type: 'cyber_ninja', side: 'right' },
        { delay: 3.6, type: 'deepseek_gunner', side: 'left', elite: true },
      ],
    ],
  },
  {
    index: 11,
    code: '12',
    name: 'VỰC THẲM HỖN MANG',
    subtitle: 'CHAOS ABYSS · OMEGA',
    theme: 'chaos_abyss',
    accentColor: '#f97316',
    bossId: 'boss_omega',
    hazard: 'meteor_rain',
    hazardInterval: 4.0,
    hint: 'Chương Cuối Tối Thượng — Né Mưa Thiên Thạch Hỗn Mang & quyết chiến Thần Hủy Diệt Omega!',
    waves: [
      [
        { delay: 0.4, type: 'heavy_brute', side: 'right', elite: true },
        { delay: 0.9, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 1.5, type: 'frost_mage', side: 'right' },
        { delay: 2.1, type: 'shield_guard', side: 'left', elite: true },
        { delay: 2.8, type: 'cyber_ninja', side: 'right' },
        { delay: 3.4, type: 'deepseek_gunner', side: 'left', elite: true },
      ],
      [
        { delay: 0.4, type: 'heavy_brute', side: 'left', elite: true },
        { delay: 0.9, type: 'heavy_brute', side: 'right' },
        { delay: 1.5, type: 'berserker_reaper', side: 'left', elite: true },
        { delay: 2.1, type: 'berserker_reaper', side: 'right' },
        { delay: 2.8, type: 'frost_mage', side: 'left', elite: true },
        { delay: 3.4, type: 'frost_mage', side: 'right', elite: true },
        { delay: 4.0, type: 'cyber_ninja', side: 'left', elite: true },
      ],
    ],
  },
];

export interface BlessingDefinition {
  id: BlessingId;
  name: string;
  subtitle: string;
  desc: string;
  color: string;
  badge: string;
}

export const BLESSING_POOL: BlessingDefinition[] = [
  {
    id: 'vampiric_edge',
    name: 'HUYẾT KIẾM',
    subtitle: 'HÚT SINH LỰC',
    desc: 'Hạ địch hồi +6 HP & tăng +14% sát thương (cộng dồn, tối đa 4 bậc).',
    color: '#ef4444',
    badge: '血',
  },
  {
    id: 'phantom_reflex',
    name: 'LÔI TỐC ẢO ẢNH',
    subtitle: 'CƠ ĐỘNG TỐI ĐA',
    desc: 'Giảm 14% hồi chiêu Lướt [Shift] (tối đa 3 bậc, trần -42%) & kéo dài Ngưng Đọng Thời Gian khi Né Hoàn Hảo.',
    color: '#38bdf8',
    badge: '閃',
  },
  {
    id: 'counter_mastery',
    name: 'PHẢN ĐÒN TỐI THƯỢNG',
    subtitle: 'KIẾM KHÍ PHẢN KÍCH',
    desc: 'Mở rộng cửa sổ Parry [K] +0.065s (tối đa 3 bậc) & mỗi lần Parry phóng Kiếm Khí xuyên phá.',
    color: '#22d3ee',
    badge: '反',
  },
  {
    id: 'elemental_overload',
    name: 'BẠO KÍCH NGUYÊN TỐ',
    subtitle: 'CỘNG HƯỞNG ẤN',
    desc: 'Nổ Ấn Nguyên Tố gây thêm +30% sát thương & giảm ngay 1.0s hồi chiêu [U].',
    color: '#a855f7',
    badge: '印',
  },
  {
    id: 'titan_vitality',
    name: 'GIÁP CHIẾN THẦN',
    subtitle: 'BẤT KHUẤT',
    desc: 'Tăng +40 HP Tối đa, hồi ngay 40 HP & giảm 8% sát thương gánh chịu (tối đa 5 bậc, trần -40%).',
    color: '#22c55e',
    badge: '護',
  },
  {
    id: 'endless_fury',
    name: 'CUỒNG NỘ VĨNH CỬU',
    subtitle: 'BÙNG NỔ NĂNG LƯỢNG',
    desc: 'Tăng +30% tốc độ tích Nộ [I] và Thanh Thức Tỉnh [O].',
    color: '#f97316',
    badge: '怒',
  },
  {
    id: 'berserker_soul',
    name: 'SÁT Ý ĐOẠT MỆNH',
    subtitle: 'PHÁ GIÁP BOSS',
    desc: 'Tăng +15% sát thương lên Boss & gây thêm +35% điểm Phá Giáp/Choáng.',
    color: '#facc15',
    badge: '破',
  },
  {
    id: 'executioner_crit',
    name: 'TRẢM QUỶ TUYỆT KỸ',
    subtitle: 'KẾT LIỄU HỦY DIỆT',
    desc: 'Địch dưới 45% HP nhận thêm +25% sát thương kết liễu (tối đa 4 bậc).',
    color: '#f43f5e',
    badge: '斬',
  },
  {
    id: 'chain_lightning',
    name: 'LÔI LIÊN HOÀN',
    subtitle: 'SẤM SÉT DẪN TRUYỀN',
    desc: 'Đòn đánh nặng & Liên Chiêu phóng tia sét giật lan sang 2 kẻ địch gần đó.',
    color: '#38bdf8',
    badge: '電',
  },
  {
    id: 'meteor_slam',
    name: 'THIÊN THẠCH TRỤY',
    subtitle: 'ĐỊA CHẤN HỦY DIỆT',
    desc: 'Đòn bổ trên không (Air Slam) và kết thúc combo gọi Cột Lửa Thiên Thạch nổ tung sàn đấu.',
    color: '#fb923c',
    badge: '星',
  },
  {
    id: 'blade_storm',
    name: 'KIẾM KHÍ VÔ CỰC',
    subtitle: 'PHONG BẠO TRẢM',
    desc: 'Khi đạt Style Rank B trở lên, đòn kết thúc combo phóng thêm Kiếm Khí xuyên thấu.',
    color: '#c084fc',
    badge: '剣',
  },
  {
    id: 'phoenix_grace',
    name: 'NIẾT BÀN TÁI SINH',
    subtitle: 'BẤT TỬ PHƯỢNG HOÀNG',
    desc: 'Khi HP chạm 0 sẽ Hồi Sinh ngay lập tức với 50% HP, nổ sóng lửa đẩy lùi toàn bộ địch!',
    color: '#fde047',
    badge: '鳳',
  },
  {
    id: 'crit_mastery',
    name: 'CHÍ MẠNG TUYỆT ĐỐI',
    subtitle: 'BẠO KÍCH TỬ THẦN',
    desc: 'Tăng +15% Tỉ lệ Chí mạng (sát thương 1.6x, tối đa 4 bậc, trần 60%).',
    color: '#fbbf24',
    badge: '暴',
  },
  {
    id: 'swift_strike',
    name: 'TỐC CHIẾN VÔ SONG',
    subtitle: 'CUỒNG PHONG THẦN TỐC',
    desc: 'Tăng +12% tốc độ đánh & tốc độ di chuyển (tối đa 4 bậc, trần +48%).',
    color: '#34d399',
    badge: '迅',
  },
  {
    id: 'glass_cannon',
    name: 'LIỀU MẠNG · GLASS CANNON',
    subtitle: 'HUYẾT THỆ HỦY DIỆT',
    desc: 'Đánh đổi: Tăng mạnh +35% sát thương toàn bộ đòn đánh nhưng giảm 25% HP Tối đa (1 bậc duy nhất).',
    color: '#fb7185',
    badge: '狂',
  },
];

export interface BlessingModifiers {
  damageMult: number;
  dashCdMult: number;
  witchTimeBonusSec: number;
  parryWindowBonus: number;
  parryWaveCount: number;
  markBurstMult: number;
  markExtraRefundSec: number;
  maxHpBonus: number;
  maxHpMult: number;
  damageTakenMult: number;
  meterGainMult: number;
  lifestealOnKill: number;
  bossDamageMult: number;
  postureDamageMult: number;
  executeLowHpMult: number;
  chainLightningCount: number;
  meteorSlamCount: number;
  bladeStormCount: number;
  phoenixReviveCount: number;
  critChance: number;
  critDamageMult: number;
  attackMoveSpeedBonus: number;
}

export const BLESSING_MAX_STACKS: Record<BlessingId, number> = {
  vampiric_edge: 4,
  phantom_reflex: 3,
  counter_mastery: 3,
  elemental_overload: 4,
  titan_vitality: 5,
  endless_fury: 4,
  berserker_soul: 4,
  executioner_crit: 4,
  chain_lightning: 3,
  meteor_slam: 3,
  blade_storm: 3,
  phoenix_grace: 1,
  crit_mastery: 4,
  swift_strike: 4,
  glass_cannon: 1,
};

export function computeBlessingModifiers(
  stacks: Partial<Record<BlessingId, number>>
): BlessingModifiers {
  const g = (id: BlessingId) => Math.min(stacks[id] ?? 0, BLESSING_MAX_STACKS[id]);
  const vamp = g('vampiric_edge');
  const reflex = g('phantom_reflex');
  const counter = g('counter_mastery');
  const elem = g('elemental_overload');
  const titan = g('titan_vitality');
  const fury = g('endless_fury');
  const berserk = g('berserker_soul');
  const exec = g('executioner_crit');
  const chain = g('chain_lightning');
  const meteor = g('meteor_slam');
  const storm = g('blade_storm');
  const phoenix = g('phoenix_grace');
  const crit = g('crit_mastery');
  const swift = g('swift_strike');
  const glass = g('glass_cannon');

  // Cộng dồn tuyến tính (additive) + trần an toàn.
  return {
    damageMult: 1 + Math.min(0.56, vamp * 0.14) + glass * 0.35,
    dashCdMult: Math.max(0.55, 1 - reflex * 0.14),
    witchTimeBonusSec: reflex * 0.25,
    parryWindowBonus: counter * 0.065,
    parryWaveCount: counter,
    markBurstMult: 1 + elem * 0.3,
    markExtraRefundSec: elem * 1.0,
    maxHpBonus: titan * 40,
    maxHpMult: glass > 0 ? 0.75 : 1,
    damageTakenMult: Math.max(0.6, 1 - titan * 0.08),
    meterGainMult: 1 + fury * 0.3,
    lifestealOnKill: Math.min(24, vamp * 6),
    bossDamageMult: 1 + berserk * 0.15,
    postureDamageMult: 1 + berserk * 0.35,
    executeLowHpMult: 1 + exec * 0.25,
    chainLightningCount: chain,
    meteorSlamCount: meteor,
    bladeStormCount: storm,
    phoenixReviveCount: phoenix,
    critChance: Math.min(0.6, crit * 0.15),
    critDamageMult: 1.6,
    attackMoveSpeedBonus: Math.min(0.48, swift * 0.12),
  };
}

export function rollBlessingChoices(
  stacks: Partial<Record<BlessingId, number>>,
  count = 3
): BlessingChoice[] {
  // Loại thẻ đã đạt cấp tối đa khỏi danh sách random.
  const pool = BLESSING_POOL.filter(
    (d) => (stacks[d.id] ?? 0) < BLESSING_MAX_STACKS[d.id]
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, count).map((def) => ({
    ...def,
    stacks: (stacks[def.id] ?? 0) + 1,
  }));
}

export function buildActiveBlessingBadges(
  stacks: Partial<Record<BlessingId, number>>
): ActiveBlessingBadge[] {
  const out: ActiveBlessingBadge[] = [];
  for (const def of BLESSING_POOL) {
    const s = Math.min(stacks[def.id] ?? 0, BLESSING_MAX_STACKS[def.id]);
    if (s > 0) {
      out.push({
        id: def.id,
        name: def.name,
        badge: def.badge,
        color: def.color,
        stacks: s,
      });
    }
  }
  return out;
}

export function generateEndlessWave(waveNumber: number): {
  theme: StageThemeId;
  hazard: StageHazardKind;
  spawns: StageWaveSpawn[];
  bossId: BossId | null;
} {
  const stageTemplate = CAMPAIGN_STAGES[(waveNumber - 1) % CAMPAIGN_STAGES.length];
  const isBossWave = waveNumber % 3 === 0;
  const bossId = isBossWave
    ? BOSS_ORDER[Math.floor((waveNumber / 3 - 1) % BOSS_ORDER.length)]
    : null;

  const enemyPool: RegularEnemyType[] = [
    'meta_melee',
    'deepseek_gunner',
    'swarm_blade',
    'shield_guard',
    'cyber_ninja',
    'frost_mage',
    'berserker_reaper',
    'heavy_brute',
  ];
  const count = isBossWave
    ? Math.min(5, 2 + Math.floor(waveNumber / 4))
    : Math.min(12, 5 + Math.floor(waveNumber * 0.85));
  const eliteChance = Math.min(0.62, 0.12 + waveNumber * 0.045);

  const spawns: StageWaveSpawn[] = [];
  for (let i = 0; i < count; i++) {
    const maxPoolIdx = Math.min(enemyPool.length, 4 + Math.floor(waveNumber / 2));
    const type = enemyPool[(waveNumber * 7 + i * 3) % maxPoolIdx];
    spawns.push({
      delay: 0.42 + i * 0.48,
      type,
      side: i % 2 === 0 ? 'right' : 'left',
      elite: ((waveNumber + i) % 5 === 0) || Math.random() < eliteChance,
    });
  }

  return {
    theme: stageTemplate.theme,
    hazard: waveNumber >= 2 ? stageTemplate.hazard : 'none',
    spawns,
    bossId,
  };
}
