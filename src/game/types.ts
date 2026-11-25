export type GameMode = 'story' | 'boss_rush' | 'training';

export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type CharacterId = 'kuro' | 'raijin' | 'kagura' | 'zero';

export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface CharacterSkillMeta {
  basicName: string;
  specialName: string;
  specialActiveName: string;
  specialDesc: string;
  ultimateName: string;
  ultimateFullName: string;
  ultimateKanji: string;
  ultimateDesc: string;
  awakenName: string;
  awakenDesc: string;
}

export type EnemyType =
  | 'meta_melee'
  | 'deepseek_gunner'
  | 'swarm_blade'
  | 'boss_haiku'
  | 'boss_astra'
  | 'boss_opus'
  | 'boss_sol'
  | 'boss_fable';

export type BossId =
  | 'boss_haiku'
  | 'boss_astra'
  | 'boss_opus'
  | 'boss_sol'
  | 'boss_fable';

export type ActionKey =
  | 'left'
  | 'right'
  | 'jump'
  | 'dash'
  | 'attack'
  | 'parry'
  | 'cryo'
  | 'ultimate'
  | 'awaken'
  | 'taunt'
  | 'pause';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ScarfNode {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

export interface AudioSettings {
  muted: boolean;
  bgmEnabled: boolean;
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
}

export interface BossHudInfo {
  id: BossId;
  name: string;
  faction: string;
  title: string;
  hp: number;
  maxHp: number;
  trailHp: number;
  accentColor: string;
}

export interface BossIntroBanner {
  faction: string;
  name: string;
  title: string;
  accentColor: string;
  progress: number;
}

export interface SkillCooldowns {
  dash: number;
  dashMax: number;
  parry: number;
  parryMax: number;
  cryo: number;
  cryoMax: number;
  cryoActive: boolean;
  ultimateReady: boolean;
  awakenReady: boolean;
  awakened: boolean;
  awakenTimeLeft: number;
  awakenDuration: number;
}

export interface RunStats {
  mode: GameMode;
  characterId: CharacterId;
  characterName: string;
  outcome: 'victory' | 'gameover';
  elapsedTime: number;
  score: number;
  bestScore: number;
  maxCombo: number;
  perfectParries: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  totalBosses: number;
  damageTaken: number;
  actReached: string;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C';
  remainingBossName: string | null;
  remainingBossHpPct: number;
}

export interface HudSnapshot {
  state: GameState;
  mode: GameMode;
  characterId: CharacterId;
  characterName: string;
  characterCodename: string;
  characterAccent: string;
  characterSkills: CharacterSkillMeta;
  actCode: string;
  actTitle: string;
  actHint: string;
  hp: number;
  maxHp: number;
  trailHp: number;
  rage: number;
  maxRage: number;
  awakening: number;
  maxAwakening: number;
  awakened: boolean;
  awakenPrompt: boolean;
  combo: number;
  comboPulse: number;
  styleRank: StyleRank;
  styleScore: number;
  score: number;
  perfectParries: number;
  elapsedTime: number;
  boss: BossHudInfo | null;
  bossIntro: BossIntroBanner | null;
  cooldowns: SkillCooldowns;
  cutsceneActive: boolean;
  cutsceneTitle: string;
  enemiesRemaining: number;
  waveProgressText: string;
  runStats: RunStats | null;
  isTouchDevice: boolean;
}
