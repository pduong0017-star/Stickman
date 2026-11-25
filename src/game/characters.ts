import type { CharacterId, CharacterSkillMeta } from './types';

export type CharacterWeaponKind =
  | 'katana'
  | 'volt_spear'
  | 'flame_nodachi'
  | 'twin_daggers';

export type CharacterAwakenedWeaponKind =
  | 'blood_greatsword'
  | 'thunder_halberd'
  | 'solar_greatblade'
  | 'void_sabers';

export type CharacterSpecialKind =
  | 'cryo_wall'
  | 'thunder_blink'
  | 'magma_eruption'
  | 'phantom_barrage';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  codename: string;
  archetype: string;
  summary: string;
  // Visual palette (cel-shaded Alan Becker / Hyuns Dojo vector look)
  bodyColor: string;
  awakenedBodyColor: string;
  glowColor: string;
  accentColor: string;
  scarfPrimary: string;
  scarfHighlight: string;
  auraStyle: 'purple' | 'cyan' | 'ember' | 'emerald';
  awakenedAuraStyle: 'crimson' | 'gold' | 'ember' | 'emerald';
  weapon: CharacterWeaponKind;
  awakenedWeapon: CharacterAwakenedWeaponKind;
  hasSheath: boolean;
  headGear: 'none' | 'volt_visor' | 'flame_band' | 'phantom_eyes';
  // Combat stats
  maxHp: number;
  moveSpeed: number;
  awakenedSpeed: number;
  damageMultiplier: number;
  attackSpeedMultiplier: number; // < 1 means faster animations
  reachBonus: number;
  maxJumps: number;
  dashCooldown: number;
  parryWindow: number;
  specialCooldown: number;
  specialKind: CharacterSpecialKind;
  // Skill metadata for HUD, Title & Modals
  skills: CharacterSkillMeta;
  // Ultimate theme
  ultimateKanji: string;
  ultimatePrimaryColor: string;
  ultimateSecondaryColor: string;
  ultimateBannerTitle: string;
  ultimateBossDamage: number;
  // Awakening theme
  awakeningBannerText: string;
  awakeningWaveColor: string;
  awakeningLifestealOnKill: number;
  slashColors: [string, string]; // [normal, heavy/awakened]
}

export const CHARACTER_ORDER: CharacterId[] = ['kuro', 'raijin', 'kagura', 'zero'];

export const CHARACTER_ROSTER: Record<CharacterId, CharacterDefinition> = {
  kuro: {
    id: 'kuro',
    name: 'KURO',
    codename: 'Hắc Kiếm Sĩ',
    archetype: 'Cân bằng · Phản đòn',
    summary: 'Kiếm sĩ Katana toàn diện với Tường Băng chắn đạn và Huyết Kiếm thức tỉnh.',
    bodyColor: '#7c5cff',
    awakenedBodyColor: '#8b5cf6',
    glowColor: '#8b5cf6',
    accentColor: '#a855f7',
    scarfPrimary: '#2563eb',
    scarfHighlight: '#60a5fa',
    auraStyle: 'purple',
    awakenedAuraStyle: 'crimson',
    weapon: 'katana',
    awakenedWeapon: 'blood_greatsword',
    hasSheath: true,
    headGear: 'none',
    maxHp: 150,
    moveSpeed: 445,
    awakenedSpeed: 520,
    damageMultiplier: 1.0,
    attackSpeedMultiplier: 1.0,
    reachBonus: 0,
    maxJumps: 2,
    dashCooldown: 0.62,
    parryWindow: 0.22,
    specialCooldown: 3.2,
    specialKind: 'cryo_wall',
    skills: {
      basicName: 'RÚT KIẾM',
      specialName: 'TƯỜNG BĂNG',
      specialActiveName: 'ĐẨY BĂNG',
      specialDesc: 'Gọi cột băng chắn đạn (Thức tỉnh bắn kèm song băng huyết)',
      ultimateName: 'SCARLET',
      ultimateFullName: 'SCARLET SHEATH',
      ultimateKanji: '断',
      ultimateDesc: 'Xé không gian đỏ rực, thu kiếm "CẠCH!" và khắc ấn 断 kết liễu',
      awakenName: 'HUYẾT KIẾM',
      awakenDesc: 'Hóa Ma Vương có sừng & kiếm bay, chém ra sóng Huyết Kiếm',
    },
    ultimateKanji: '断',
    ultimatePrimaryColor: '#dc2626',
    ultimateSecondaryColor: '#fde68a',
    ultimateBannerTitle: 'SCARLET SHEATH · 断',
    ultimateBossDamage: 225,
    awakeningBannerText: 'THỨC TỈNH: HUYẾT KIẾM!',
    awakeningWaveColor: '#ef4444',
    awakeningLifestealOnKill: 0,
    slashColors: ['#38bdf8', '#ef4444'],
  },
  raijin: {
    id: 'raijin',
    name: 'RAIJIN',
    codename: 'Lôi Thương',
    archetype: 'Tốc độ · Xuyên phá',
    summary: 'Thương thủ siêu tốc độ với chiêu Lôi Thiểm xuyên địch, Lôi Thần trống sét và bão sấm.',
    bodyColor: '#06b6d4',
    awakenedBodyColor: '#22d3ee',
    glowColor: '#06b6d4',
    accentColor: '#38bdf8',
    scarfPrimary: '#ca8a04',
    scarfHighlight: '#fef08a',
    auraStyle: 'cyan',
    awakenedAuraStyle: 'gold',
    weapon: 'volt_spear',
    awakenedWeapon: 'thunder_halberd',
    hasSheath: false,
    headGear: 'volt_visor',
    maxHp: 135,
    moveSpeed: 515,
    awakenedSpeed: 595,
    damageMultiplier: 0.96,
    attackSpeedMultiplier: 0.9,
    reachBonus: 26,
    maxJumps: 2,
    dashCooldown: 0.44,
    parryWindow: 0.24,
    specialCooldown: 2.3,
    specialKind: 'thunder_blink',
    skills: {
      basicName: 'LÔI THƯƠNG',
      specialName: 'LÔI THIỂM',
      specialActiveName: 'LÔI ĐÌNH',
      specialDesc: 'Tốc biến tia sét xuyên địch (Thức tỉnh giáng thêm 3 cột thiên lôi)',
      ultimateName: 'LÔI PHẠT',
      ultimateFullName: 'VOLT JUDGMENT',
      ultimateKanji: '雷',
      ultimateDesc: 'Triệu hồi 7 trụ Thiên Lôi giáng xuống chiến trường & làm choáng Boss',
      awakenName: 'LÔI THẦN',
      awakenDesc: 'Hiện vòng Trống Lôi Thần, đánh thường gọi sét trời & lướt giật điện',
    },
    ultimateKanji: '雷',
    ultimatePrimaryColor: '#0284c7',
    ultimateSecondaryColor: '#fef08a',
    ultimateBannerTitle: 'VOLT JUDGMENT · 雷',
    ultimateBossDamage: 215,
    awakeningBannerText: 'THỨC TỈNH: LÔI THẦN!',
    awakeningWaveColor: '#38bdf8',
    awakeningLifestealOnKill: 0,
    slashColors: ['#22d3ee', '#facc15'],
  },
  kagura: {
    id: 'kagura',
    name: 'KAGURA',
    codename: 'Hỏa Diệm Đao',
    archetype: 'Sát thương · Trâu bò',
    summary: 'Kiếm sĩ hỏa ngục máu cao, hóa cánh Phượng Hoàng Viêm Đế và gọi dung nham thiêu rụi.',
    bodyColor: '#e11d48',
    awakenedBodyColor: '#f97316',
    glowColor: '#f97316',
    accentColor: '#fb7185',
    scarfPrimary: '#1e293b',
    scarfHighlight: '#f97316',
    auraStyle: 'ember',
    awakenedAuraStyle: 'ember',
    weapon: 'flame_nodachi',
    awakenedWeapon: 'solar_greatblade',
    hasSheath: true,
    headGear: 'flame_band',
    maxHp: 175,
    moveSpeed: 415,
    awakenedSpeed: 490,
    damageMultiplier: 1.24,
    attackSpeedMultiplier: 1.08,
    reachBonus: 16,
    maxJumps: 2,
    dashCooldown: 0.68,
    parryWindow: 0.21,
    specialCooldown: 2.9,
    specialKind: 'magma_eruption',
    skills: {
      basicName: 'HỎA ĐAO',
      specialName: 'HỎA CHẤN',
      specialActiveName: 'HỎA NGỤC',
      specialDesc: 'Gọi 3 cột dung nham bùng nổ (Thức tỉnh gọi 5 cột thiêu cả hai bên)',
      ultimateName: 'VIÊM NGỤC',
      ultimateFullName: 'SOLAR INFERNO',
      ultimateKanji: '炎',
      ultimateDesc: 'Nhật Thực Phượng Hoàng thiêu rụi màn hình, để lại cột lửa & hồi 35 HP',
      awakenName: 'VIÊM ĐẾ',
      awakenDesc: 'Mọc cánh lửa Phượng Hoàng, chém nổ dung nham & hút máu khi hạ địch',
    },
    ultimateKanji: '炎',
    ultimatePrimaryColor: '#ea580c',
    ultimateSecondaryColor: '#fef08a',
    ultimateBannerTitle: 'SOLAR INFERNO · 炎',
    ultimateBossDamage: 275,
    awakeningBannerText: 'THỨC TỈNH: VIÊM ĐẾ!',
    awakeningWaveColor: '#f97316',
    awakeningLifestealOnKill: 14,
    slashColors: ['#fb923c', '#facc15'],
  },
  zero: {
    id: 'zero',
    name: 'ZERO',
    codename: 'Ảnh Sát Thủ',
    archetype: 'Combo · Nhảy 3 bước',
    summary: 'Sát thủ song đao nhảy 3 bước, hóa Ảnh Vương với cánh bóng tối & phân thân chém đôi.',
    bodyColor: '#10b981',
    awakenedBodyColor: '#34d399',
    glowColor: '#10b981',
    accentColor: '#34d399',
    scarfPrimary: '#047857',
    scarfHighlight: '#a7f3d0',
    auraStyle: 'emerald',
    awakenedAuraStyle: 'emerald',
    weapon: 'twin_daggers',
    awakenedWeapon: 'void_sabers',
    hasSheath: false,
    headGear: 'phantom_eyes',
    maxHp: 140,
    moveSpeed: 495,
    awakenedSpeed: 585,
    damageMultiplier: 0.92,
    attackSpeedMultiplier: 0.82,
    reachBonus: -4,
    maxJumps: 3,
    dashCooldown: 0.48,
    parryWindow: 0.27,
    specialCooldown: 2.4,
    specialKind: 'phantom_barrage',
    skills: {
      basicName: 'SONG ĐAO',
      specialName: 'PHI ĐAO',
      specialActiveName: 'THẬP TỰ ĐAO',
      specialDesc: 'Lùi nhảy phóng 5 phi tiêu (Thức tỉnh phóng 7 phi tiêu + lưỡi liềm ảnh)',
      ultimateName: 'VÔ ẢNH',
      ultimateFullName: 'PHANTOM ECLIPSE',
      ultimateKanji: '影',
      ultimateDesc: 'Ngưng đọng thời gian, 6 ảnh phân thân dệt lưới trảm 影 & hồi mọi chiêu',
      awakenName: 'ẢNH VƯƠNG',
      awakenDesc: 'Hiện cánh Hư Không & phi đao xoay quanh, chém cực tốc kèm phân thân',
    },
    ultimateKanji: '影',
    ultimatePrimaryColor: '#059669',
    ultimateSecondaryColor: '#d1fae5',
    ultimateBannerTitle: 'PHANTOM ECLIPSE · 影',
    ultimateBossDamage: 220,
    awakeningBannerText: 'THỨC TỈNH: ẢNH VƯƠNG!',
    awakeningWaveColor: '#10b981',
    awakeningLifestealOnKill: 0,
    slashColors: ['#34d399', '#a7f3d0'],
  },
};

export function getCharacterDef(id: string | null | undefined): CharacterDefinition {
  if (id && id in CHARACTER_ROSTER) {
    return CHARACTER_ROSTER[id as CharacterId];
  }
  return CHARACTER_ROSTER.kuro;
}

/**
 * Computes responsive camera scale so short mobile landscape screens (e.g. 844x390)
 * frame the full combat arena cleanly without clipping double jumps or bosses behind the HUD.
 */
export function computeResponsiveCameraScale(viewW: number, viewH: number): number {
  const heightScale = viewH / 560;
  const widthScale = viewW / 960;
  const raw = Math.min(heightScale, widthScale);
  return Math.max(0.64, Math.min(1.06, raw));
}
