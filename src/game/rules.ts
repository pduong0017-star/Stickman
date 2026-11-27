import type { BossId, GameMode, ScarfNode, StyleRank } from './types';

export const ARENA_WIDTH = 1600;
export const GROUND_Y = 560;
export const PARRY_WINDOW_SEC = 0.22;
export const GRAVITY = 2150;

export interface BossMetadata {
  id: BossId;
  faction: string;
  name: string;
  title: string;
  maxHp: number;
  accentColor: string;
  secondaryColor: string;
  hint: string;
}

export const BOSS_ROSTER: Record<BossId, BossMetadata> = {
  boss_haiku: {
    id: 'boss_haiku',
    faction: 'CLAUDE SQUAD',
    name: 'HAIKU',
    title: 'VANGUARD · KẺ CẦM KHIÊN',
    maxHp: 580,
    accentColor: '#38bdf8',
    secondaryColor: '#e2e8f0',
    hint: 'Nhảy qua sau lưng hoặc Parry [K] đòn húc khiên để PHÁ GIÁP!',
  },
  boss_astra: {
    id: 'boss_astra',
    faction: 'OPENAI SQUAD',
    name: 'ASTRA',
    title: 'LANCER · THƯƠNG THỦ BÃO CÁT',
    maxHp: 680,
    accentColor: '#fbbf24',
    secondaryColor: '#f8fafc',
    hint: 'Lướt [Shift] kích hoạt Né Hoàn Hảo & Parry [K] thương phóng!',
  },
  boss_glacius: {
    id: 'boss_glacius',
    faction: 'CRYO CITADEL',
    name: 'GLACIUS',
    title: 'WARDEN · LÃNH CHÚA BĂNG HÀ',
    maxHp: 780,
    accentColor: '#22d3ee',
    secondaryColor: '#bae6fd',
    hint: 'Cẩn thận Nhũ Băng rơi & mảnh băng rẻ quạt · Parry [K] Kích Băng!',
  },
  boss_opus: {
    id: 'boss_opus',
    faction: 'CLAUDE SQUAD',
    name: 'OPUS',
    title: 'LEADER · KIẾM SĨ HỒNG LIÊN',
    maxHp: 890,
    accentColor: '#ef4444',
    secondaryColor: '#fca5a5',
    hint: 'Tốc độ cực cao! Parry [K] liên hoàn chuỗi chém đỏ để làm đầy thanh Choáng!',
  },
  boss_vulcan: {
    id: 'boss_vulcan',
    faction: 'IRON FOUNDRY',
    name: 'VULCAN',
    title: 'FORGE TITAN · CHIẾN THẦN DUNG NHAM',
    maxHp: 1020,
    accentColor: '#f97316',
    secondaryColor: '#fde047',
    hint: 'Nhảy tránh cột Dung Nham khi Titan giậm búa & đánh bồi lúc hắn nghỉ!',
  },
  boss_sol: {
    id: 'boss_sol',
    faction: 'ORBITAL CORPS',
    name: 'SOL',
    title: 'SNIPER · XẠ THỦ QUỸ ĐẠO',
    maxHp: 870,
    accentColor: '#fb923c',
    secondaryColor: '#22d3ee',
    hint: 'Canh tia khóa mục tiêu bấm [K] phản xạ Laser & né Tia Quỹ Đạo!',
  },
  boss_nyx: {
    id: 'boss_nyx',
    faction: 'VOID SANCTUM',
    name: 'NYX',
    title: 'REAPER · TỬ THẦN HƯ KHÔNG',
    maxHp: 1120,
    accentColor: '#a855f7',
    secondaryColor: '#f43f5e',
    hint: 'Cảnh giác dịch chuyển sau lưng! Bấm [K] phản đòn Lưỡi Hái Tử Thần!',
  },
  boss_fable: {
    id: 'boss_fable',
    faction: 'NEON SOVEREIGN',
    name: 'FABLE',
    title: 'FINAL ENTITY · THỰC THỂ TỐI THƯỢNG',
    maxHp: 1420,
    accentColor: '#22c55e',
    secondaryColor: '#c084fc',
    hint: 'Né Vòng Tròn Ma Pháp, Parry cầu sét & bấm [O] THỨC TỈNH quyết chiến!',
  },
  boss_raiden: {
    id: 'boss_raiden',
    faction: 'CYBER SHOGUNATE',
    name: 'RAIDEN',
    title: 'MECHA SHOGUN · TƯỚNG QUÂN LÔI CƠ',
    maxHp: 1560,
    accentColor: '#38bdf8',
    secondaryColor: '#fde047',
    hint: 'Né Lõi Sét Quá Tải trên sàn, Parry [K] đòn Lôi Đột & đập vỡ Tinh Thể để lấy Buff!',
  },
  boss_akaza: {
    id: 'boss_akaza',
    faction: 'BLOOD MOON CULT',
    name: 'AKAZA',
    title: 'CRIMSON ONI · QUỶ VƯƠNG HUYẾT NGUYỆT',
    maxHp: 1700,
    accentColor: '#f43f5e',
    secondaryColor: '#fecdd3',
    hint: 'Nhảy né Huyết Kiếm Trận trồi từ đất & canh Parry [K] cú đấm chấn động của Quỷ Vương!',
  },
  boss_kronos: {
    id: 'boss_kronos',
    faction: 'CHRONO MIRAGE',
    name: 'KRONOS',
    title: 'TIME REAPER · KẺ NGHỊCH ĐẢO THỜI GIAN',
    maxHp: 1840,
    accentColor: '#eab308',
    secondaryColor: '#c084fc',
    hint: 'Cảnh giác dịch chuyển đảo chiều sau lưng! Parry [K] chuỗi Song Đao Thời Không!',
  },
  boss_omega: {
    id: 'boss_omega',
    faction: 'PRIMORDIAL ABYSS',
    name: 'OMEGA',
    title: 'CHAOS SOVEREIGN · THẦN HỦY DIỆT KHỞI NGUYÊN',
    maxHp: 2100,
    accentColor: '#f97316',
    secondaryColor: '#e879f9',
    hint: 'Chương Cuối Tối Thượng — Né Mưa Thiên Thạch Hỗn Mang, Parry cầu Hư Không & THỨC TỈNH [O]!',
  },
};

export const BOSS_ORDER: BossId[] = [
  'boss_haiku',
  'boss_astra',
  'boss_glacius',
  'boss_opus',
  'boss_vulcan',
  'boss_sol',
  'boss_nyx',
  'boss_fable',
  'boss_raiden',
  'boss_akaza',
  'boss_kronos',
  'boss_omega',
];

export interface ActDefinition {
  code: string;
  title: string;
  hint: string;
}

export const STORY_ACTS: ActDefinition[] = [
  {
    code: '01',
    title: 'PHÒNG THÍ NGHIỆM',
    hint: 'Chặt chém [J] · Lướt [Shift] Né Hoàn Hảo · Phản đòn [K]',
  },
  {
    code: '02',
    title: 'ĐÀI THIÊN VĂN',
    hint: 'Áp sát Xạ Thủ, nhảy sau lưng Lính Khiên & tích Ấn Nguyên Tố',
  },
  {
    code: '03',
    title: 'THÀNH TRÌ BĂNG GIÁ',
    hint: 'Coi chừng Nhũ Băng rơi — hất văng địch vào bẫy để gây sát thương lớn!',
  },
  {
    code: '04',
    title: 'VÕ ĐƯỜNG HỒNG LIÊN',
    hint: 'Cảnh giác Sát Thủ dịch chuyển · Tích 100% Nộ bấm [I] tung Tuyệt Kỹ',
  },
  {
    code: '05',
    title: 'LÒ DUNG NHAM',
    hint: 'Dùng đòn Nặng / Kỹ năng [U] phá Giáp Bá Thể của Titan & né Mạch Lửa',
  },
  {
    code: '06',
    title: 'THÁP VIỄN VỌNG NEON',
    hint: 'Né Tia Laser Quỹ Đạo & phản xạ đạn bắn tỉa bằng [K]',
  },
  {
    code: '07',
    title: 'THÁNH ĐƯỜNG BÓNG TỐI',
    hint: 'Thoát khỏi Vết Nứt Hư Không & săn lùng Tử Thần Nyx',
  },
  {
    code: '08',
    title: 'NGAI VÀNG HƯ VÔ',
    hint: 'Mở khóa Thức Tỉnh [O] & hạ gục Thực Thể Tối Thượng Fable!',
  },
  {
    code: '09',
    title: 'PHÁO ĐÀI LÔI CƠ',
    hint: 'Đập vỡ Tinh Thể Cường Hóa lấy Buff, né Lõi Sét & hạ Tướng Quân Raiden!',
  },
  {
    code: '10',
    title: 'ĐỀN THỜ HUYẾT NGUYỆT',
    hint: 'Coi chừng Huyết Kiếm Trận trồi dưới chân & khuất phục Quỷ Vương Akaza!',
  },
  {
    code: '11',
    title: 'MÊ CUNG CÁT THỜI GIAN',
    hint: 'Vượt Xoáy Không Gian, hoàn thành Thử Thách Đợt & bắt bài Kronos!',
  },
  {
    code: '12',
    title: 'VỰC THẲM HỖN MANG',
    hint: 'Quyết Chiến Tối Thượng — Né Mưa Thiên Thạch & tiêu diệt Thần Hủy Diệt Omega!',
  },
];

export function computeStyleRank(styleScore: number): StyleRank {
  if (styleScore >= 520) return 'SSS';
  if (styleScore >= 390) return 'SS';
  if (styleScore >= 280) return 'S';
  if (styleScore >= 190) return 'A';
  if (styleScore >= 115) return 'B';
  if (styleScore >= 50) return 'C';
  return 'D';
}

export function decayStyleScore(styleScore: number, dt: number): number {
  const rate = styleScore > 280 ? 36 : styleScore > 115 ? 24 : 15;
  return Math.max(0, styleScore - rate * dt);
}

export function isWithinParryWindow(parryTimer: number, windowSec = PARRY_WINDOW_SEC): boolean {
  return parryTimer > 0 && parryTimer <= windowSec;
}

export function computeReflectedProjectile(
  vx: number,
  vy: number,
  damage: number,
  speedMultiplier = 1.65,
  damageMultiplier = 2.4
): { vx: number; vy: number; damage: number } {
  return {
    vx: -vx * speedMultiplier,
    vy: -vy * 0.45,
    damage: Math.round(damage * damageMultiplier),
  };
}

/**
 * Checks whether a shielded enemy blocks an incoming attack based on facing direction.
 * Returns true if the attacker is in front of the defender and the attack is blockable.
 */
export function isAttackBlockedByShield(
  defenderX: number,
  defenderFacing: 1 | -1,
  attackerX: number,
  shieldActive: boolean,
  unblockable = false
): boolean {
  if (!shieldActive || unblockable) return false;
  const attackerRelative = attackerX - defenderX;
  return defenderFacing === 1 ? attackerRelative > 0 : attackerRelative < 0;
}

export function createScarfChain(anchorX: number, anchorY: number, segments = 9, segLen = 9): ScarfNode[] {
  const nodes: ScarfNode[] = [];
  for (let i = 0; i < segments; i++) {
    nodes.push({
      x: anchorX - i * segLen,
      y: anchorY + i * 1.5,
      oldX: anchorX - i * segLen,
      oldY: anchorY + i * 1.5,
    });
  }
  return nodes;
}

/**
 * Pure Verlet integration step for the protagonist's flowing blue scarf.
 */
export function stepVerletScarf(
  nodes: ScarfNode[],
  anchorX: number,
  anchorY: number,
  windX: number,
  gravityY: number,
  segLen: number,
  dt: number,
  damping = 0.91
): void {
  if (nodes.length === 0) return;
  const dtSq = Math.min(dt, 0.033) * Math.min(dt, 0.033);

  nodes[0].x = anchorX;
  nodes[0].y = anchorY;
  nodes[0].oldX = anchorX;
  nodes[0].oldY = anchorY;

  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    const vx = (n.x - n.oldX) * damping;
    const vy = (n.y - n.oldY) * damping;
    n.oldX = n.x;
    n.oldY = n.y;
    const flutter = Math.sin(i * 1.35 + anchorX * 0.05) * 42;
    n.x += vx + (windX + flutter) * dtSq;
    n.y += vy + gravityY * dtSq;
  }

  for (let iter = 0; iter < 5; iter++) {
    nodes[0].x = anchorX;
    nodes[0].y = anchorY;
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = (dist - segLen) / dist;
      if (i === 1) {
        curr.x -= dx * diff;
        curr.y -= dy * diff;
      } else {
        prev.x += dx * diff * 0.35;
        prev.y += dy * diff * 0.35;
        curr.x -= dx * diff * 0.65;
        curr.y -= dy * diff * 0.65;
      }
    }
  }
}

export function calculateRunGrade(params: {
  outcome: 'victory' | 'gameover';
  maxCombo: number;
  perfectParries: number;
  damageTaken: number;
  elapsedTime: number;
  mode: GameMode;
}): 'S+' | 'S' | 'A' | 'B' | 'C' {
  if (params.outcome === 'gameover') {
    if (params.maxCombo >= 20 || params.perfectParries >= 4) return 'B';
    return 'C';
  }
  let points = 0;
  if (params.maxCombo >= 35) points += 3;
  else if (params.maxCombo >= 20) points += 2;
  else if (params.maxCombo >= 10) points += 1;

  if (params.perfectParries >= 8) points += 3;
  else if (params.perfectParries >= 4) points += 2;
  else if (params.perfectParries >= 2) points += 1;

  if (params.damageTaken <= 40) points += 3;
  else if (params.damageTaken <= 120) points += 2;
  else if (params.damageTaken <= 220) points += 1;

  const targetTime = params.mode === 'boss_rush' ? 120 : 180;
  if (params.elapsedTime <= targetTime) points += 1;

  if (points >= 9) return 'S+';
  if (points >= 7) return 'S';
  if (points >= 5) return 'A';
  if (points >= 3) return 'B';
  return 'C';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
