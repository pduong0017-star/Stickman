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
    maxHp: 380,
    accentColor: '#38bdf8',
    secondaryColor: '#e2e8f0',
    hint: 'Nhảy qua sau lưng hoặc Parry [K] đòn húc khiên để phá giáp',
  },
  boss_astra: {
    id: 'boss_astra',
    faction: 'OPENAI SQUAD',
    name: 'ASTRA',
    title: 'LANCER · THƯƠNG THỦ',
    maxHp: 440,
    accentColor: '#fbbf24',
    secondaryColor: '#f8fafc',
    hint: 'Lướt [Shift] né đâm tầm xa và Parry [K] giáo phóng',
  },
  boss_opus: {
    id: 'boss_opus',
    faction: 'CLAUDE SQUAD',
    name: 'OPUS',
    title: 'LEADER · KIẾM LASER ĐỎ',
    maxHp: 560,
    accentColor: '#ef4444',
    secondaryColor: '#fca5a5',
    hint: 'Tốc độ ngang cơ! Parry [K] liên hoàn chuỗi chém đỏ',
  },
  boss_sol: {
    id: 'boss_sol',
    faction: 'OPENAI SQUAD',
    name: 'SOL',
    title: 'SNIPER · XẠ THỦ NĂNG LƯỢNG',
    maxHp: 480,
    accentColor: '#f97316',
    secondaryColor: '#fef08a',
    hint: 'Canh tia khóa mục tiêu và bấm [K] phản xạ tia Laser!',
  },
  boss_fable: {
    id: 'boss_fable',
    faction: 'NEON SOVEREIGN',
    name: 'FABLE',
    title: 'FINAL ENTITY · THỰC THỂ NEON XANH',
    maxHp: 820,
    accentColor: '#22c55e',
    secondaryColor: '#c084fc',
    hint: 'Né Vòng Tròn Ma Pháp, Parry cầu sét & bấm [O] THỨC TỈNH!',
  },
};

export const BOSS_ORDER: BossId[] = [
  'boss_haiku',
  'boss_astra',
  'boss_opus',
  'boss_sol',
  'boss_fable',
];

export interface ActDefinition {
  code: string;
  title: string;
  hint: string;
}

export const STORY_ACTS: ActDefinition[] = [
  {
    code: '01',
    title: 'MAIN FIGHT',
    hint: 'Chặt chém [J] · Lướt [Shift] · Phản đòn [K]',
  },
  {
    code: '02',
    title: 'CRYO CRUSH',
    hint: 'Dùng [U] tạo Tường Băng chắn đạn, bấm [U]/[J] để đẩy nghiền nát địch',
  },
  {
    code: '03',
    title: 'SCARLET SHEATH',
    hint: 'Tích đầy Thanh Nộ 100% và bấm [I] tung tuyệt kỹ cắt không gian',
  },
  {
    code: '04',
    title: 'BOSS RUSH',
    hint: 'Đối đầu Biệt Đội Boss — Parry chuẩn xác & mở khóa Thức Tỉnh [O]',
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
