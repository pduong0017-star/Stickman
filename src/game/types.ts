export type GameMode = 'story' | 'boss_rush' | 'endless' | 'training' | 'solo1v1';

export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type DomainKind = 'none' | 'mirage' | 'chrono' | 'xuan_feng';

export type CharacterId = 'kuro' | 'raijin' | 'kagura' | 'zero' | 'aether' | 'valkyrie' | 'mirage' | 'chrono' | 'mactien';

export type SkinRarity = 'classic' | 'epic' | 'legendary' | 'mythic';

export type SkinId =
  | 'default'
  | 'radiant_seraph'
  | 'void_walker'
  | 'eclipse_ronin'
  | 'storm_shogun'
  | 'cyber_valkyrie'
  | 'solar_phoenix'
  | 'frost_empress'
  | 'blood_moon'
  | 'astral_phantom'
  | 'prismatic_archon'
  | 'celestial_empress'
  | 'abyssal_valkyrie'
  | 'void_shatterer'
  | 'chrono_sovereign'
  | 'xuan_feng_sage';

export type SlashVfxMotif =
  | 'iaido_ink'
  | 'seraph_feathers'
  | 'void_rift'
  | 'eclipse_blade'
  | 'volt_arc'
  | 'shogun_drums'
  | 'cyber_glitch'
  | 'flame_lick'
  | 'phoenix_plume'
  | 'frostfire_crystal'
  | 'shadow_wisps'
  | 'blood_crescent'
  | 'astral_constellation'
  | 'arcane_sigil'
  | 'prismatic_nova'
  | 'valkyrie_radiance'
  | 'celestial_halo'
  | 'abyssal_eclipse'
  | 'mirror_shatter'
  | 'void_prism'
  | 'chrono_clockwork'
  | 'chrono_sovereign'
  | 'ink_calligraphy'
  | 'xuan_feng_calligraphy';

export type SkinParticleAccentKind =
  | 'spark'
  | 'ember'
  | 'ice'
  | 'lightning'
  | 'smoke'
  | 'feather'
  | 'petal'
  | 'star'
  | 'shard'
  | 'ink_splatter';

export type PillarTheme = 'fire' | 'phoenix' | 'frostfire';

export type ProjectileTheme =
  | 'default'
  | 'seraph'
  | 'void'
  | 'shogun'
  | 'cyber'
  | 'phoenix'
  | 'frostfire'
  | 'blood_moon'
  | 'astral';

export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export type StageThemeId =
  | 'genesis_lab'
  | 'solar_observatory'
  | 'cryo_citadel'
  | 'crimson_dojo'
  | 'magma_foundry'
  | 'cyber_spire'
  | 'shadow_sanctum'
  | 'sovereign_throne'
  | 'mecha_citadel'
  | 'blood_shrine'
  | 'mirage_oasis'
  | 'chaos_abyss'
  | 'solo_arena';

export type StageHazardKind =
  | 'none'
  | 'icicle_drop'
  | 'lava_geyser'
  | 'orbital_laser'
  | 'void_rift'
  | 'plasma_mine'
  | 'cursed_fang'
  | 'meteor_rain';

export type BlessingId =
  | 'vampiric_edge'
  | 'phantom_reflex'
  | 'counter_mastery'
  | 'elemental_overload'
  | 'titan_vitality'
  | 'endless_fury'
  | 'berserker_soul'
  | 'executioner_crit'
  | 'chain_lightning'
  | 'meteor_slam'
  | 'blade_storm'
  | 'phoenix_grace'
  | 'crit_mastery'
  | 'swift_strike'
  | 'glass_cannon';

export interface BlessingChoice {
  id: BlessingId;
  name: string;
  subtitle: string;
  desc: string;
  color: string;
  badge: string;
  stacks: number;
}

export interface ActiveBlessingBadge {
  id: BlessingId;
  name: string;
  badge: string;
  color: string;
  stacks: number;
}

export interface CharacterSkillMeta {
  basicName: string;
  specialName: string;
  specialActiveName: string;
  specialDesc: string;
  synergyHint: string;
  ultimateName: string;
  ultimateFullName: string;
  ultimateKanji: string;
  ultimateDesc: string;
  awakenName: string;
  awakenDesc: string;
}

export type BossId =
  | 'boss_haiku'
  | 'boss_astra'
  | 'boss_glacius'
  | 'boss_opus'
  | 'boss_vulcan'
  | 'boss_sol'
  | 'boss_nyx'
  | 'boss_fable'
  | 'boss_raiden'
  | 'boss_akaza'
  | 'boss_kronos'
  | 'boss_omega';

export type EnemyType =
  | 'meta_melee'
  | 'deepseek_gunner'
  | 'swarm_blade'
  | 'shield_guard'
  | 'cyber_ninja'
  | 'heavy_brute'
  | 'frost_mage'
  | 'berserker_reaper'
  | BossId;

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
  phase: 1 | 2;
  posture: number;
  maxPosture: number;
  staggered: boolean;
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
  skillLinkActive: boolean;
  skillLinkLabel: string;
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
  skinId: SkinId;
  selectedStageIndex: number;
  clearedStages: number[];
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
  witchTimeActive: boolean;
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
  blessingChoices: BlessingChoice[] | null;
  activeBlessings: ActiveBlessingBadge[];
  runStats: RunStats | null;
  isTouchDevice: boolean;
  arenaBuffText?: string | null;
  waveBountyText?: string | null;
  waveBountyDone?: boolean;
  domainActive?: boolean;
  domainKind?: DomainKind;
  domainTimeLeft?: number;
  timeStopActive?: boolean;
  timeStopTimeLeft?: number;
  solo1v1?: Solo1v1HudState | null;
}

export interface Solo1v1HudState {
  phase: 'INTRO' | 'FIGHTING' | 'KO_SLOWMO' | 'ROUND_END' | 'MATCH_END';
  roundNumber: number;
  winsNeeded: number;
  playerWins: number;
  botWins: number;
  roundTimer: number;
  bannerText: string | null;
  opponentId: CharacterId;
  opponentName: string;
  opponentAccent: string;
  botArchetype: 'RUSHDOWN' | 'COUNTER' | 'TRICKSTER';
  botHp: number;
  botMaxHp: number;
  botTrailHp: number;
  botEnergy: number;
  botMaxEnergy: number;
}
