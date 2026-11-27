import {
  ARENA_WIDTH,
  BOSS_ORDER,
  BOSS_ROSTER,
  GROUND_Y,
  STORY_ACTS,
  calculateRunGrade,
  clamp,
  computeReflectedProjectile,
  computeStyleRank,
  decayStyleScore,
  isAttackBlockedByShield,
} from './rules';
import {
  CAMPAIGN_STAGES,
  SOLO_ARENA_STAGE,
  type RegularEnemyType,
  buildActiveBlessingBadges,
  computeBlessingModifiers,
  computeStageEnemyScaling,
  generateEndlessWave,
  rollBlessingChoices,
} from './stages';
import {
  DEFAULT_SOLO_1V1_CONFIG,
  Solo1v1Controller,
  type Solo1v1Config,
} from './modes/solo1v1';
import type {
  ActionKey,
  AudioSettings,
  BlessingChoice,
  BlessingId,
  BossHudInfo,
  BossIntroBanner,
  CharacterId,
  DomainKind,
  GameMode,
  GameState,
  HudSnapshot,
  RunStats,
  SkinId,
  StageHazardKind,
} from './types';
import { getCharacterDef, normalizeSkinForCharacter } from './characters';
import { getAwakenedVisualProfile } from './animation';
import { AudioEngine } from './AudioEngine';
import { Camera } from './Camera';
import { InputHandler } from './InputHandler';
import { ParticleSystem } from './ParticleSystem';
import { PeriodicTableBG } from './PeriodicTableBG';
import { emitSkinAccentParticle, Player } from './Player';
import { Enemy, type EnemyAttackHit } from './Enemy';
import { Boss } from './Boss';
import {
  IceWall,
  LootOrb,
  MagicCircle,
  MagmaPillar,
  PlasticChair,
  Projectile,
  SoulCrystal,
  type SoulCrystalKind,
  StageHazard,
  TemporalEcho,
  type TemporalEchoStrike,
  ValkyrieBoomerang,
  MirrorRift,
} from './Entities';
import { renderSlashTrails, type SlashTrail } from './StickmanRenderer';
import { UltimateCutscene } from './UltimateCutscene';
import {
  computeDetonationDamage,
  computeOverdriveUltimateDamage,
  computeSynergyCooldownRefund,
  getElementalMarkSpec,
} from './synergy';
import { getSkinVfxProfile } from './skinVfx';
import { colorWithAlpha, finiteOr } from './renderer/inkStyle';

const BEST_SCORE_KEY = 'scarlet_sheath_best_score_v1';
const SELECTED_CHAR_KEY = 'scarlet_sheath_char_v1';
const SELECTED_SKIN_KEY = 'scarlet_sheath_skin_v1';
const CLEARED_STAGES_KEY = 'scarlet_sheath_cleared_stages_v1';

interface PendingSpawn {
  delay: number;
  type: RegularEnemyType;
  side: 'left' | 'right';
  elite?: boolean;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onHudUpdate: (snapshot: HudSnapshot) => void;

  public readonly audio = new AudioEngine();
  private readonly camera = new Camera();
  private readonly input: InputHandler;
  private readonly particles = new ParticleSystem();
  private readonly bg = new PeriodicTableBG();
  private readonly player = new Player();
  private readonly cutscene = new UltimateCutscene();

  private chair: PlasticChair | null = null;
  private enemies: Enemy[] = [];
  private activeBoss: Boss | null = null;
  private iceWalls: IceWall[] = [];
  private magmaPillars: MagmaPillar[] = [];
  private projectiles: Projectile[] = [];
  private magicCircles: MagicCircle[] = [];
  private stageHazards: StageHazard[] = [];
  private soulCrystals: SoulCrystal[] = [];
  private valkyrieBoomerangs: ValkyrieBoomerang[] = [];
  private mirrorRifts: MirrorRift[] = [];
  private inkSeals: {
    x: number;
    y: number;
    radius: number;
    damage: number;
    awakened: boolean;
    life: number;
    maxLife: number;
    skinId?: SkinId;
    slipTickTimer?: number;
  }[] = [];
  private mactienDomainBlend = 0;
  private mactienDomainTime = 0;
  private timeStopTimer = 0;
  private timeStopStoredDamage = new Map<number, number>();
  private temporalEchoes: TemporalEcho[] = [];
  private echoSlashTrails: SlashTrail[] = [];
  private lootOrbs: LootOrb[] = [];
  private pendingSpawns: PendingSpawn[] = [];

  private state: GameState = 'title';
  private mode: GameMode = 'story';
  private characterId: CharacterId = 'kuro';
  private skinId: SkinId = 'default';
  private selectedStageIndex = 0;
  private currentStageIndex = 0;
  private stageSubWave = 0; // 0: Wave 1, 1: Wave 2, 2: Stage Boss
  private endlessWave = 0;
  private clearedStages = new Set<number>();

  // Roguelite Blessing Upgrades, Arena Crystal Buffs & Wave Bounties
  private blessingStacks: Partial<Record<BlessingId, number>> = {};
  private blessingChoices: BlessingChoice[] | null = null;
  private onAfterBlessingPick: (() => void) | null = null;
  private phoenixRevivesUsed = 0;
  private crystalSpawnTimer = 10.5;
  private arenaBuffKind: SoulCrystalKind | null = null;
  private arenaBuffTimer = 0;
  private waveBountyKind: 'combo' | 'counter' | 'speed' | null = null;
  private waveBountyProgress = 0;
  private waveBountyTarget = 0;
  private waveBountyTimer = 0;
  private waveBountyDone = false;
  private witchTimeTimer = 0;
  private witchTimeCooldown = 0;
  private activeHazardKind: StageHazardKind = 'none';
  private hazardInterval = 0;
  private hazardSpawnTimer = 3.0;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private viewW = 1280;
  private viewH = 720;
  private dpr = 1;
  private resizeObserver: ResizeObserver | null = null;
  private isTouchDevice = false;

  // Combat & Wave State
  private hitstopTimer = 0;
  private camLookahead = 0;
  private impactFrameTimer = 0;
  private impactFrameDuration = 0.05;
  private impactFrameColor = '#ef4444';
  private impactFrameWorldX = ARENA_WIDTH * 0.5;
  private impactFrameWorldY = GROUND_Y - 56;
  private bossIntroTimer = 0;
  private bossIntroBanner: BossIntroBanner | null = null;
  private bossRushIndex = 0;
  private nextWaveDelay = 0;
  private activeAttackTokens = 0;
  private readonly maxAttackTokens = 5;
  private defeatBeatTimer = 0;
  private pendingOutcome: 'victory' | 'gameover' | null = null;
  private awakenPromptTimer = 0;
  private fableAwakeningTriggered = false;
  private domainTimer = 0;
  private readonly domainDuration = 12.5;
  private activeDomainKind: DomainKind = 'none';
  private domainBeamTickTimer = 0;
  private readonly solo1v1 = new Solo1v1Controller();
  private solo1v1Config: Solo1v1Config = { ...DEFAULT_SOLO_1V1_CONFIG };
  private soloOpponent: Enemy | null = null;

  public setSolo1v1Config(config: Partial<Solo1v1Config>): void {
    const resolvedOpponent = config.opponentId
      ? getCharacterDef(config.opponentId, config.opponentSkinId ?? 'default')
      : null;
    this.solo1v1Config = {
      ...this.solo1v1Config,
      ...config,
      ...(resolvedOpponent ? { opponentId: resolvedOpponent.id } : {}),
    };
  }

  private resetSolo1v1Round(): void {
    this.enemies = [];
    this.activeBoss = null;
    this.iceWalls = [];
    this.magmaPillars = [];
    this.projectiles = [];
    this.magicCircles = [];
    this.stageHazards = [];
    this.valkyrieBoomerangs = [];
    this.mirrorRifts = [];
    this.inkSeals = [];
    this.temporalEchoes = [];
    this.echoSlashTrails = [];
    this.lootOrbs = [];
    this.pendingSpawns = [];
    this.activeAttackTokens = 0;

    this.player.reset(SOLO_ARENA_STAGE.spawnPlayerX, false);
    this.player.facing = 1;
    this.camera.reset(ARENA_WIDTH * 0.5, GROUND_Y - 115);

    const oppId = this.solo1v1.config.opponentId ?? this.solo1v1Config.opponentId;
    const oppSkin = this.solo1v1.config.opponentSkinId ?? this.solo1v1Config.opponentSkinId ?? 'default';
    const oppDef = getCharacterDef(oppId, oppSkin);
    const botType: RegularEnemyType =
      this.solo1v1Config.botArchetype === 'RUSHDOWN'
        ? 'berserker_reaper'
        : this.solo1v1Config.botArchetype === 'COUNTER'
          ? 'shield_guard'
          : 'cyber_ninja';
    const opponent = new Enemy(botType, SOLO_ARENA_STAGE.spawnBotX, false, false);
    opponent.facing = -1;
    opponent.configureAsHeroFighter(
      oppDef.id,
      oppSkin,
      this.solo1v1Config.botArchetype,
      'HARD',
      oppDef.maxHp
    );
    this.soloOpponent = opponent;
    this.enemies.push(opponent);
  }

  private isVoidShattererDomainOwner(): boolean {
    return this.characterId === 'mirage' && this.skinId === 'void_shatterer';
  }

  private isChronoDomainOwner(): boolean {
    return this.characterId === 'chrono' && this.skinId === 'chrono_sovereign';
  }

  private isXuanFengDomainOwner(): boolean {
    return this.characterId === 'mactien' && this.skinId === 'xuan_feng_sage';
  }

  private getDomainOwnerKind(): DomainKind {
    if (this.isVoidShattererDomainOwner()) return 'mirage';
    if (this.isChronoDomainOwner()) return 'chrono';
    if (this.isXuanFengDomainOwner()) return 'xuan_feng';
    return 'none';
  }

  // Score, Combo & Run Telemetry
  private elapsedTime = 0;
  private score = 0;
  private bestScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private comboPulse = 0;
  private styleScore = 0;
  private perfectParries = 0;
  private enemiesDefeated = 0;
  private bossesDefeated = 0;
  private damageTaken = 0;
  private actCode = '01';
  private actTitle = CAMPAIGN_STAGES[0].name;
  private actHint = CAMPAIGN_STAGES[0].hint;
  private runStats: RunStats | null = null;

  private hudSyncAccum = 0;
  private lastHudFingerprint = '';
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not acquire 2D rendering context');
    }
    this.ctx = ctx;
    this.onHudUpdate = onHudUpdate;

    if (typeof window !== 'undefined') {
      try {
        this.bestScore = Number(window.localStorage.getItem(BEST_SCORE_KEY) || '0') || 0;
        const savedChar = window.localStorage.getItem(SELECTED_CHAR_KEY);
        const def = getCharacterDef(savedChar);
        this.characterId = def.id;
        const savedSkin = window.localStorage.getItem(SELECTED_SKIN_KEY);
        this.skinId = normalizeSkinForCharacter(def.id, savedSkin);
        this.player.setCharacter(def.id, this.skinId);

        const savedCleared = window.localStorage.getItem(CLEARED_STAGES_KEY);
        if (savedCleared) {
          const parsed = JSON.parse(savedCleared);
          if (Array.isArray(parsed)) {
            for (const idx of parsed) {
              if (typeof idx === 'number' && idx >= 0 && idx < CAMPAIGN_STAGES.length) {
                this.clearedStages.add(idx);
              }
            }
          }
        }
      } catch {
        this.bestScore = 0;
      }
      this.isTouchDevice =
        'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
    }

    this.input = new InputHandler((code) => this.handleGlobalShortcut(code));
    this.setupResize();
    this.enterTitleState();
    this.startLoop();
  }

  private resizeCleanup?: () => void;

  private setupResize(): void {
    const updateSize = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.viewW = Math.max(320, rect.width || window.innerWidth);
      this.viewH = Math.max(240, rect.height || window.innerHeight);
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.viewW * this.dpr);
      this.canvas.height = Math.round(this.viewH * this.dpr);
    };
    const onTouchPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && !this.isTouchDevice) {
        this.isTouchDevice = true;
        this.emitHudSnapshot();
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(updateSize);
      this.resizeObserver.observe(this.canvas);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', updateSize);
      window.visualViewport?.addEventListener('resize', updateSize);
      window.addEventListener('pointerdown', onTouchPointer, { passive: true });
      this.resizeCleanup = () => {
        window.removeEventListener('orientationchange', updateSize);
        window.visualViewport?.removeEventListener('resize', updateSize);
        window.removeEventListener('pointerdown', onTouchPointer);
      };
    }
  }

  private setBodyState(state: GameState): void {
    if (typeof document !== 'undefined') {
      const bodyState = state === 'victory' ? 'gameover' : state;
      document.body.dataset.state = bodyState;
    }
  }

  private handleGlobalShortcut(code: string): void {
    this.audio.unlock();
    if (this.blessingChoices && this.state === 'playing') {
      if (code === 'Digit1' && this.blessingChoices[0]) {
        this.selectBlessing(this.blessingChoices[0].id);
        return;
      }
      if (code === 'Digit2' && this.blessingChoices[1]) {
        this.selectBlessing(this.blessingChoices[1].id);
        return;
      }
      if (code === 'Digit3' && this.blessingChoices[2]) {
        this.selectBlessing(this.blessingChoices[2].id);
        return;
      }
    }
    if (code === 'KeyM') {
      this.audio.toggleMute();
      return;
    }
    if (code === 'KeyR' && (this.state === 'playing' || this.state === 'paused')) {
      this.startMode(this.mode);
      return;
    }
    if ((code === 'Escape' || code === 'KeyP') && (this.state === 'playing' || this.state === 'paused')) {
      if (this.state === 'playing') this.pauseGame();
      else this.resumeGame();
    }
  }

  public getAudioSettings(): AudioSettings {
    return this.audio.getSettings();
  }

  public updateAudioSettings(partial: Partial<AudioSettings>): AudioSettings {
    return this.audio.updateSettings(partial);
  }

  public setVirtualAction(action: ActionKey, pressed: boolean): void {
    this.audio.unlock();
    this.input.setVirtualAction(action, pressed);
  }

  public setCharacter(id: CharacterId, fromUserGesture = true): void {
    const base = getCharacterDef(id);
    this.characterId = base.id;
    let savedSkin: string | null = this.skinId;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SELECTED_CHAR_KEY, base.id);
        savedSkin = window.localStorage.getItem(SELECTED_SKIN_KEY);
      } catch {
        // ignore storage errors
      }
    }
    this.skinId = normalizeSkinForCharacter(base.id, savedSkin);
    const def = getCharacterDef(base.id, this.skinId);
    this.player.setCharacter(def.id, this.skinId);
    const charMods = computeBlessingModifiers(this.blessingStacks);
    this.player.applyBlessingStats(
      charMods.maxHpBonus,
      charMods.dashCdMult,
      charMods.parryWindowBonus,
      charMods.maxHpMult,
      charMods.attackMoveSpeedBonus
    );
    const ownerKind = this.getDomainOwnerKind();
    if (ownerKind === 'none' || (this.activeDomainKind !== 'none' && this.activeDomainKind !== ownerKind)) {
      this.domainTimer = 0;
      this.domainBeamTickTimer = 0;
      this.activeDomainKind = 'none';
      this.bg.resetDomain();
    }
    if (this.characterId !== 'mactien' || this.skinId === 'xuan_feng_sage') {
      this.mactienDomainBlend = 0;
    }
    if (fromUserGesture) {
      this.audio.unlock();
      this.audio.playSlash(1, false);
    }
    if (this.state === 'title') {
      const vfx = getSkinVfxProfile(def.id, this.skinId);
      this.particles.emitShockwave(this.player.x, this.player.y - 45, vfx.impactRingColor, 85, 0.28);
      this.particles.emitSparks(this.player.x, this.player.y - 48, 12, vfx.particlePrimary, 360);
      emitSkinAccentParticle(
        this.particles,
        vfx.swingParticleKind,
        this.player.x,
        this.player.y - 48,
        6,
        vfx.particleSecondary,
        this.player.facing
      );
    }
    this.emitHudSnapshot();
  }

  public setSkin(skinId: SkinId, fromUserGesture = true): void {
    const normalized = normalizeSkinForCharacter(this.characterId, skinId);
    this.skinId = normalized;
    const def = getCharacterDef(this.characterId, normalized);
    this.player.setCharacter(def.id, normalized);
    const skinMods = computeBlessingModifiers(this.blessingStacks);
    this.player.applyBlessingStats(
      skinMods.maxHpBonus,
      skinMods.dashCdMult,
      skinMods.parryWindowBonus,
      skinMods.maxHpMult,
      skinMods.attackMoveSpeedBonus
    );
    const ownerKind = this.getDomainOwnerKind();
    if (ownerKind === 'none' || (this.activeDomainKind !== 'none' && this.activeDomainKind !== ownerKind)) {
      this.domainTimer = 0;
      this.domainBeamTickTimer = 0;
      this.activeDomainKind = 'none';
      this.bg.resetDomain();
    }
    if (this.characterId !== 'mactien' || this.skinId === 'xuan_feng_sage') {
      this.mactienDomainBlend = 0;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SELECTED_SKIN_KEY, normalized);
      } catch {
        // ignore storage errors
      }
    }
    if (fromUserGesture) {
      this.audio.unlock();
      this.audio.playAwaken();
    }
    if (this.state === 'title') {
      const vfx = getSkinVfxProfile(def.id, normalized);
      this.particles.emitShockwave(this.player.x, this.player.y - 50, vfx.impactRingColor, 130, 0.34);
      this.particles.emitShockwave(this.player.x, this.player.y - 50, '#ffffff', 80, 0.24);
      this.particles.emitSparks(this.player.x, this.player.y - 52, 22, vfx.particlePrimary, 480);
      this.particles.emitEmbers(this.player.x, this.player.y - 46, 16, vfx.particleSecondary);
      emitSkinAccentParticle(
        this.particles,
        vfx.finisherParticleKind,
        this.player.x,
        this.player.y - 50,
        10,
        vfx.particleSecondary,
        this.player.facing
      );
    }
    this.emitHudSnapshot();
  }

  public getCharacterId(): CharacterId {
    return this.characterId;
  }

  public getSkinId(): SkinId {
    return this.skinId;
  }

  public setSelectedStage(stageIndex: number, fromUserGesture = true): void {
    const idx = clamp(Math.floor(stageIndex), 0, CAMPAIGN_STAGES.length - 1);
    this.selectedStageIndex = idx;
    const st = CAMPAIGN_STAGES[idx];
    this.bg.setStageTheme(st.theme);
    if (fromUserGesture) {
      this.audio.unlock();
      this.audio.playSlash(2, false);
    }
    if (this.state === 'title') {
      this.particles.emitShockwave(this.player.x, this.player.y - 46, st.accentColor, 105, 0.3);
      this.particles.emitSparks(this.player.x, this.player.y - 50, 14, st.accentColor, 380);
    }
    this.emitHudSnapshot();
  }

  public selectBlessing(id: BlessingId): void {
    if (!this.blessingChoices) return;
    const chosen = this.blessingChoices.find((c) => c.id === id) ?? this.blessingChoices[0];
    if (!chosen) return;

    this.blessingStacks[chosen.id] = (this.blessingStacks[chosen.id] ?? 0) + 1;
    this.blessingChoices = null;

    const mods = computeBlessingModifiers(this.blessingStacks);
    this.player.applyBlessingStats(
      mods.maxHpBonus,
      mods.dashCdMult,
      mods.parryWindowBonus,
      mods.maxHpMult,
      mods.attackMoveSpeedBonus
    );
    if (chosen.id === 'titan_vitality') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
    } else if (chosen.id === 'glass_cannon') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp);
    } else {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 28);
    }

    this.audio.playAwaken();
    this.camera.pulseZoom(1.14, 0.32);
    this.particles.emitShockwave(this.player.x, this.player.y - 52, chosen.color, 155, 0.36);
    this.particles.emitSparks(this.player.x, this.player.y - 54, 24, chosen.color, 520);
    this.particles.emitText(this.player.x, this.player.y - 118, `ẤN CHÚ · ${chosen.name}!`, chosen.color, 26);

    const next = this.onAfterBlessingPick;
    this.onAfterBlessingPick = null;
    if (next) {
      next();
    }
    this.emitHudSnapshot();
  }

  private openBlessingDraft(onContinue: () => void): void {
    this.input.clearAll();
    const choices = rollBlessingChoices(this.blessingStacks, 3);
    if (choices.length === 0) {
      onContinue();
      this.emitHudSnapshot();
      return;
    }
    this.blessingChoices = choices;
    this.onAfterBlessingPick = onContinue;
    this.emitHudSnapshot();
  }

  private markStageCleared(stageIdx: number): void {
    if (this.clearedStages.has(stageIdx)) return;
    this.clearedStages.add(stageIdx);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          CLEARED_STAGES_KEY,
          JSON.stringify(Array.from(this.clearedStages).sort((a, b) => a - b))
        );
      } catch {
        // ignore storage errors
      }
    }
  }

  public enterTitleState(): void {
    this.state = 'title';
    this.setBodyState('title');
    this.audio.setBgmActive(false);
    this.input.clearAll();
    this.particles.clear();
    this.enemies = [];
    this.activeBoss = null;
    this.iceWalls = [];
    this.magmaPillars = [];
    this.projectiles = [];
    this.magicCircles = [];
    this.stageHazards = [];
    this.soulCrystals = [];
    this.valkyrieBoomerangs = [];
    this.mirrorRifts = [];
    this.inkSeals = [];
    this.timeStopTimer = 0;
    this.timeStopStoredDamage.clear();
    this.temporalEchoes = [];
    this.echoSlashTrails = [];
    this.lootOrbs = [];
    this.pendingSpawns = [];
    this.blessingChoices = null;
    this.onAfterBlessingPick = null;
    this.arenaBuffKind = null;
    this.arenaBuffTimer = 0;
    this.waveBountyKind = null;
    this.waveBountyDone = false;
    this.witchTimeTimer = 0;
    this.cutscene.active = false;
    this.impactFrameTimer = 0;
    this.hitstopTimer = 0;
    this.pendingOutcome = null;
    this.defeatBeatTimer = 0;
    this.lastHudFingerprint = '';
    this.bossIntroTimer = 0;
    this.bossIntroBanner = null;
    this.domainTimer = 0;
    this.activeDomainKind = 'none';
    this.domainBeamTickTimer = 0;
    this.mactienDomainBlend = 0;
    this.runStats = null;

    const previewStage = CAMPAIGN_STAGES[this.selectedStageIndex] ?? CAMPAIGN_STAGES[0];
    this.bg.setStageTheme(previewStage.theme);
    this.bg.resetDomain();

    // Protagonist sits coolly on white plastic chair framed prominently on the right third for Title screen
    const chairX = ARENA_WIDTH * 0.56;
    this.player.setCharacter(this.characterId, this.skinId);
    this.player.reset(chairX, true);
    this.player.facing = -1;
    this.chair = new PlasticChair(chairX, GROUND_Y);
    this.camera.reset(chairX - 135, GROUND_Y - 72);
    this.camera.setTarget(chairX - 135, GROUND_Y - 72, 1.44);
    this.emitHudSnapshot();
  }

  public startMode(mode: GameMode, fromUserGesture = true): void {
    if (fromUserGesture) {
      this.audio.unlock();
    }
    this.mode = mode;
    this.state = 'playing';
    this.setBodyState('playing');
    this.input.clearAll();
    this.particles.clear();
    this.enemies = [];
    this.activeBoss = null;
    this.iceWalls = [];
    this.magmaPillars = [];
    this.projectiles = [];
    this.magicCircles = [];
    this.stageHazards = [];
    this.soulCrystals = [];
    this.valkyrieBoomerangs = [];
    this.mirrorRifts = [];
    this.inkSeals = [];
    this.timeStopTimer = 0;
    this.timeStopStoredDamage.clear();
    this.temporalEchoes = [];
    this.echoSlashTrails = [];
    this.lootOrbs = [];
    this.pendingSpawns = [];
    this.blessingStacks = {};
    this.blessingChoices = null;
    this.onAfterBlessingPick = null;
    this.phoenixRevivesUsed = 0;
    this.crystalSpawnTimer = 9.5;
    this.arenaBuffKind = null;
    this.arenaBuffTimer = 0;
    this.waveBountyKind = null;
    this.waveBountyProgress = 0;
    this.waveBountyTarget = 0;
    this.waveBountyTimer = 0;
    this.waveBountyDone = false;
    this.witchTimeTimer = 0;
    this.witchTimeCooldown = 0;
    this.cutscene.active = false;
    this.impactFrameTimer = 0;
    this.lastHudFingerprint = '';
    this.hitstopTimer = 0;
    this.camLookahead = 0;
    this.bossIntroTimer = 0;
    this.bossIntroBanner = null;
    this.activeAttackTokens = 0;
    this.defeatBeatTimer = 0;
    this.pendingOutcome = null;
    this.awakenPromptTimer = 0;
    this.fableAwakeningTriggered = false;
    this.domainTimer = 0;
    this.activeDomainKind = 'none';
    this.domainBeamTickTimer = 0;
    this.mactienDomainBlend = 0;
    this.bg.resetDomain();
    this.runStats = null;

    // Reset telemetry
    this.elapsedTime = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.comboPulse = 0;
    this.styleScore = 0;
    this.perfectParries = 0;
    this.enemiesDefeated = 0;
    this.bossesDefeated = 0;
    this.damageTaken = 0;

    const startX = ARENA_WIDTH * 0.5;
    this.player.setCharacter(this.characterId, this.skinId);
    this.player.reset(startX, true);
    this.player.facing = 1;
    this.chair = new PlasticChair(startX, GROUND_Y);
    this.camera.reset(startX, GROUND_Y - 115);

    this.soloOpponent = null;
    if (mode === 'solo1v1') {
      this.chair = null;
      this.bg.setStageTheme(SOLO_ARENA_STAGE.theme);
      this.activeHazardKind = 'none';
      this.hazardInterval = 0;
      this.solo1v1.startMatch(this.solo1v1Config);
      const oppDef = getCharacterDef(this.solo1v1.config.opponentId);
      this.actCode = SOLO_ARENA_STAGE.code;
      this.actTitle = SOLO_ARENA_STAGE.name;
      this.actHint = `Đối kháng 1v1 vs ${oppDef.name} (Thắng ${this.solo1v1.config.winsNeeded} hiệp) · Bot ${this.solo1v1.config.botArchetype}`;
      this.resetSolo1v1Round();
      this.audio.setBgmActive(true, 2);
    } else if (mode === 'training') {
      this.bg.setStageTheme(CAMPAIGN_STAGES[this.selectedStageIndex]?.theme ?? 'genesis_lab');
      this.activeHazardKind = 'none';
      this.hazardInterval = 0;
      this.player.rage = this.player.maxRage;
      this.player.awakening = this.player.maxAwakening;
      this.actCode = 'TR';
      this.actTitle = 'PHÒNG LUYỆN TẬP';
      this.actHint = `Vô hạn Nộ [I] & Thức Tỉnh [O] · Thử Né Hoàn Hảo [Shift] & Phá Khiên [K]`;
      this.spawnTrainingBots();
      this.audio.setBgmActive(true, 1);
    } else if (mode === 'boss_rush') {
      this.bossRushIndex = 0;
      this.activeHazardKind = 'none';
      this.hazardInterval = 0;
      this.actCode = 'BR';
      this.actTitle = `ĐẤU TRƯỜNG ${BOSS_ORDER.length} BOSS`;
      this.actHint = STORY_ACTS[0].hint;
      this.nextWaveDelay = 0.25;
      this.audio.setBgmActive(true, 2);
    } else if (mode === 'endless') {
      this.endlessWave = 1;
      this.setupEndlessWave(1);
      this.audio.setBgmActive(true, 1);
    } else {
      // 12-Chapter Campaign Story Mode (starts at player-selected chapter!)
      this.currentStageIndex = clamp(this.selectedStageIndex, 0, CAMPAIGN_STAGES.length - 1);
      this.stageSubWave = 0;
      this.setupCampaignSubWave();
      this.audio.setBgmActive(true, 1);
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.emitHudSnapshot();
  }

  public pauseGame(): void {
    if (this.state !== 'playing' || this.blessingChoices) return;
    this.state = 'paused';
    this.setBodyState('paused');
    this.input.clearAll();
    this.audio.setBgmActive(false);
    this.emitHudSnapshot();
  }

  public resumeGame(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.setBodyState('playing');
    this.input.clearAll();
    this.audio.setBgmActive(true, this.activeBoss || this.player.awakened ? 2 : 1);
    this.emitHudSnapshot();
  }

  private spawnTrainingBots(): void {
    this.enemies = [
      new Enemy('shield_guard', this.player.x + 260, true),
      new Enemy('deepseek_gunner', this.player.x + 490, true),
      new Enemy('cyber_ninja', this.player.x - 280, true),
      new Enemy('heavy_brute', this.player.x - 480, true),
    ];
  }

  private rollWaveBounty(seedIndex: number): void {
    const pick = seedIndex % 3;
    this.waveBountyDone = false;
    this.waveBountyProgress = 0;
    if (pick === 0) {
      this.waveBountyKind = 'combo';
      this.waveBountyTarget = 14;
      this.waveBountyTimer = 0;
    } else if (pick === 1) {
      this.waveBountyKind = 'counter';
      this.waveBountyTarget = 2;
      this.waveBountyTimer = 0;
    } else {
      this.waveBountyKind = 'speed';
      this.waveBountyTarget = 25;
      this.waveBountyTimer = 25;
    }
  }

  private completeWaveBounty(): void {
    if (!this.waveBountyKind || this.waveBountyDone) return;
    this.waveBountyDone = true;
    const training = this.mode === 'training';
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 16);
    this.player.addRage(24, training);
    this.player.addAwakening(18, training);
    this.score += 650;
    this.spawnLootOrbsAt(this.player.x, this.player.y, 2, true);
    this.audio.playParry();
    this.particles.emitShockwave(this.player.x, this.player.y - 52, '#fde047', 145, 0.34);
    this.particles.emitSparks(this.player.x, this.player.y - 58, 22, '#fde047', 560);
    this.particles.emitText(
      this.player.x,
      this.player.y - 134,
      '★ HOÀN THÀNH THỬ THÁCH! +HP +NỘ +TỈNH',
      '#fde047',
      24
    );
  }

  private spawnArenaCrystalNearAction(): void {
    if (this.soulCrystals.length >= 1) return;
    const kinds: SoulCrystalKind[] = ['thunder_overdrive', 'crimson_might', 'aegis_vitality'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const dir = Math.random() < 0.5 ? -1 : 1;
    const cx = clamp(this.player.x + dir * (210 + Math.random() * 140), 140, ARENA_WIDTH - 140);
    this.soulCrystals.push(new SoulCrystal(kind, cx));
    this.particles.emitShockwave(cx, GROUND_Y - 48, '#fde047', 85, 0.28);
  }

  private setupCampaignSubWave(): void {
    const stage = CAMPAIGN_STAGES[this.currentStageIndex] ?? CAMPAIGN_STAGES[0];
    this.bg.setStageTheme(stage.theme);
    this.activeHazardKind = stage.hazard;
    this.hazardInterval = stage.hazardInterval;
    this.hazardSpawnTimer = Math.max(2.4, stage.hazardInterval * 0.75);
    this.pendingSpawns = [];
    this.stageHazards = [];

    if (this.stageSubWave < stage.waves.length) {
      const waveDef = stage.waves[this.stageSubWave];
      this.actCode = stage.code;
      this.actTitle = `${stage.name} · ĐỢT ${this.stageSubWave + 1}`;
      this.actHint = stage.hint;
      if (this.stageSubWave === 1) {
        this.player.addRage(10, false);
        this.rollWaveBounty(this.currentStageIndex);
        this.spawnArenaCrystalNearAction();
      } else {
        this.waveBountyKind = null;
        this.waveBountyDone = false;
      }
      this.pendingSpawns = waveDef.map((sp) => ({ ...sp }));
      if (this.stageSubWave === 0 && this.currentStageIndex > 0) {
        this.bg.triggerCrimsonFlash(0.45);
        this.particles.emitText(
          this.player.x,
          this.player.y - 128,
          `MÀN ${stage.code} · ${stage.name}`,
          stage.accentColor,
          28
        );
      }
    } else {
      // Chapter Finale: Dedicated Stage Boss!
      this.waveBountyKind = null;
      this.waveBountyDone = false;
      const meta = BOSS_ROSTER[stage.bossId];
      this.actCode = stage.code;
      this.actTitle = `${stage.name} · ${meta.name}`;
      this.actHint = meta.hint;
      this.spawnBossEncounter(stage.bossId);
    }
  }

  private setupBossRushWave(): void {
    if (this.bossRushIndex >= BOSS_ORDER.length) {
      this.triggerOutcome('victory');
      return;
    }
    const bossId = BOSS_ORDER[this.bossRushIndex];
    const meta = BOSS_ROSTER[bossId];
    const matchingStage = CAMPAIGN_STAGES.find((s) => s.bossId === bossId) ?? CAMPAIGN_STAGES[0];
    this.bg.setStageTheme(matchingStage.theme);
    this.activeHazardKind = matchingStage.hazard;
    this.hazardInterval = matchingStage.hazardInterval > 0 ? matchingStage.hazardInterval + 1.0 : 0;
    this.hazardSpawnTimer = 3.6;

    this.actCode = `B${this.bossRushIndex + 1}`;
    this.actTitle = `BOSS ${this.bossRushIndex + 1}/${BOSS_ORDER.length} · ${meta.name}`;
    this.actHint = meta.hint;
    this.spawnBossEncounter(bossId);
  }

  private setupEndlessWave(waveNum: number): void {
    const gen = generateEndlessWave(waveNum);
    this.bg.setStageTheme(gen.theme);
    this.activeHazardKind = gen.hazard;
    this.hazardInterval = gen.hazard !== 'none' ? 5.2 : 0;
    this.hazardSpawnTimer = 3.4;
    this.pendingSpawns = gen.spawns.map((s) => ({ ...s }));
    this.actCode = `W${String(waveNum).padStart(2, '0')}`;

    if (gen.bossId) {
      this.waveBountyKind = null;
      this.waveBountyDone = false;
      const meta = BOSS_ROSTER[gen.bossId];
      this.actTitle = `SINH TỒN TẦNG ${waveNum} · ${meta.name}`;
      this.actHint = meta.hint;
      this.spawnBossEncounter(gen.bossId);
    } else {
      this.rollWaveBounty(waveNum);
      if (waveNum % 2 === 0) {
        this.spawnArenaCrystalNearAction();
      }
      this.actTitle = `ĐẤU TRƯỜNG SINH TỒN · TẦNG ${waveNum}`;
      this.actHint = 'Hoàn thành Thử Thách Đợt & đập vỡ Tinh Thể · Mỗi 3 tầng chạm trán Boss!';
      this.particles.emitText(this.player.x, this.player.y - 124, `TẦNG ${waveNum}`, '#38bdf8', 26);
    }
  }

  private spawnBossEncounter(bossId: (typeof BOSS_ORDER)[number]): void {
    const meta = BOSS_ROSTER[bossId];
    const spawnSide = this.player.x < ARENA_WIDTH * 0.5 ? 1 : -1;
    const spawnX = clamp(this.player.x + spawnSide * 440, 140, ARENA_WIDTH - 140);
    const boss = new Boss(bossId, spawnX);
    if (this.mode === 'endless') {
      const hpScale = 1 + Math.max(0, this.endlessWave - 3) * 0.08;
      const dmgScale = 1 + Math.min(0.45, Math.max(0, this.endlessWave - 3) * 0.025);
      boss.maxHp = Math.round(boss.maxHp * hpScale);
      boss.hp = boss.maxHp;
      boss.trailHp = boss.maxHp;
      boss.damage = Math.max(1, Math.round(boss.damage * dmgScale));
    } else if (this.mode === 'story' || this.mode === 'boss_rush') {
      const refIdx =
        this.mode === 'boss_rush'
          ? Math.max(0, BOSS_ORDER.indexOf(bossId))
          : this.currentStageIndex;
      const stageScale = computeStageEnemyScaling(refIdx);
      boss.maxHp = Math.round(boss.maxHp * stageScale.bossHpMult);
      boss.hp = boss.maxHp;
      boss.trailHp = boss.maxHp;
      boss.damage = Math.max(1, Math.round(boss.damage * stageScale.bossDmgMult));
    }
    boss.facing = spawnSide === 1 ? -1 : 1;
    this.activeBoss = boss;
    this.enemies.push(boss);

    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    if (this.player.sittingOnChair) {
      this.player.standUpFromChair(this.chair, this.audio, this.particles);
    }

    this.bossIntroTimer = 0.88;
    this.bossIntroBanner = {
      faction: meta.faction,
      name: meta.name,
      title: meta.title,
      accentColor: meta.accentColor,
      progress: 0,
    };
    this.audio.playBossIntro();
    this.audio.setBgmIntensity(2);
    this.camera.pulseZoom(1.24, 0.85);
    this.camera.addShake(0.35, 0, 1);
    this.particles.emitShockwave(boss.x, boss.y - 52, meta.accentColor, 150, 0.4);
  }

  private triggerOutcome(outcome: 'victory' | 'gameover'): void {
    if (this.pendingOutcome) return;
    this.pendingOutcome = outcome;
    this.defeatBeatTimer = outcome === 'gameover' ? 0.55 : 0.9;
    this.audio.setBgmActive(false);
    if (outcome === 'victory') {
      this.audio.playVictory();
      this.player.triggerVictoryDance(3.5);
    } else {
      this.audio.playDefeat();
    }
  }

  private finalizeOutcome(outcome: 'victory' | 'gameover'): void {
    this.state = outcome;
    this.setBodyState(outcome);
    this.input.clearAll();

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
        } catch {
          // ignore storage errors
        }
      }
    }

    const grade = calculateRunGrade({
      outcome,
      maxCombo: this.maxCombo,
      perfectParries: this.perfectParries,
      damageTaken: this.damageTaken,
      elapsedTime: this.elapsedTime,
      mode: this.mode,
    });

    this.runStats = {
      mode: this.mode,
      characterId: this.characterId,
      characterName: this.player.character.name,
      outcome,
      elapsedTime: this.elapsedTime,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      maxCombo: this.maxCombo,
      perfectParries: this.perfectParries,
      enemiesDefeated: this.enemiesDefeated,
      bossesDefeated: this.bossesDefeated,
      totalBosses: BOSS_ORDER.length,
      damageTaken: Math.round(this.damageTaken),
      actReached: `${this.actCode} ${this.actTitle}`,
      grade,
      remainingBossName: this.activeBoss && !this.activeBoss.dying ? this.activeBoss.bossName : null,
      remainingBossHpPct:
        this.activeBoss && !this.activeBoss.dying
          ? Math.round((this.activeBoss.hp / this.activeBoss.maxHp) * 100)
          : 0,
    };

    this.emitHudSnapshot();
  }

  private startLoop(): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return;
    }
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt);
      this.render();

      if (!this.destroyed) {
        this.rafId = window.requestAnimationFrame(tick);
      }
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    if (this.state === 'title') {
      this.bg.update(dt, false, false);
      this.player.updateIdleOnTitle(dt, this.particles);
      this.particles.update(dt);
      this.camera.update(dt, this.viewW, this.viewH);
      return;
    }

    if (this.state !== 'playing') {
      return;
    }

    if (!this.cutscene.active && !this.blessingChoices && this.bossIntroTimer <= 0 && !this.pendingOutcome) {
      this.domainTimer = Math.max(0, this.domainTimer - dt);
      if (this.domainTimer <= 0) {
        this.activeDomainKind = 'none';
      }
    }
    const ownerKind = this.getDomainOwnerKind();
    const resolvedDomainKind: DomainKind =
      this.domainTimer > 0 && ownerKind !== 'none'
        ? this.activeDomainKind !== 'none'
          ? this.activeDomainKind
          : ownerKind
        : 'none';
    const domainActive = resolvedDomainKind !== 'none';

    // Visual effects & camera always tick in real dt even during hitstop/intro
    const isDefaultMacTienAwakened =
      this.characterId === 'mactien' && this.skinId !== 'xuan_feng_sage' && this.player.awakened;
    const targetInkBlend = isDefaultMacTienAwakened ? 1 : 0;
    this.mactienDomainBlend += (targetInkBlend - this.mactienDomainBlend) * Math.min(1, dt * 3.2);
    if (this.mactienDomainBlend < 0.004 && !isDefaultMacTienAwakened) this.mactienDomainBlend = 0;
    this.mactienDomainTime += dt;
    this.bg.update(dt, this.player.awakened && !isDefaultMacTienAwakened, domainActive, resolvedDomainKind);
    this.particles.update(dt);
    this.camera.update(dt, this.viewW, this.viewH);
    this.comboPulse = Math.max(0, this.comboPulse - dt * 4.5);
    this.awakenPromptTimer = Math.max(0, this.awakenPromptTimer - dt);
    this.impactFrameTimer = Math.max(0, this.impactFrameTimer - dt);

    // Handle final victory/defeat beat before freezing snapshot
    if (this.pendingOutcome) {
      this.defeatBeatTimer -= dt;
      this.player.poseTime += dt;
      if (this.defeatBeatTimer <= 0) {
        const outcome = this.pendingOutcome;
        this.pendingOutcome = null;
        this.finalizeOutcome(outcome);
      }
      return;
    }

    // Scarlet Sheath Full-Screen Cutscene (freezes normal combat!)
    if (this.cutscene.active) {
      this.cutscene.update(dt, this.audio, this.camera);
      this.camera.setTarget(this.player.x, this.player.y - 75, 1.18);
      this.syncHudThrottled(dt);
      return;
    }

    // Boss Intro Freeze (0.88s)
    if (this.bossIntroTimer > 0) {
      this.bossIntroTimer -= dt;
      if (this.bossIntroBanner) {
        this.bossIntroBanner.progress = clamp(1 - this.bossIntroTimer / 0.88, 0, 1);
      }
      if (this.activeBoss) {
        this.camera.setTarget(this.activeBoss.x, this.activeBoss.y - 70, 1.24);
      }
      if (this.bossIntroTimer <= 0) {
        this.bossIntroBanner = null;
      }
      this.syncHudThrottled(dt);
      return;
    }

    // Pause active simulation while player chooses a Stage Blessing card
    if (this.blessingChoices) {
      this.syncHudThrottled(dt);
      return;
    }

    // Fixed-size simulation substeps (≤ 1/120s)
    let remaining = dt;
    while (remaining > 1e-6) {
      const step = Math.min(remaining, Game.SIM_STEP);
      remaining -= step;
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= step;
        continue;
      }
      this.simulateStep(step);
      if (
        this.state !== 'playing' ||
        this.pendingOutcome ||
        this.cutscene.active ||
        this.bossIntroTimer > 0 ||
        this.blessingChoices
      ) {
        break;
      }
    }
  }

  private static readonly SIM_STEP = 1 / 120;

  private scalePlayerDamage(baseDmg: number, enemy: Enemy): number {
    const mods = computeBlessingModifiers(this.blessingStacks);
    let mult = mods.damageMult;
    if (this.arenaBuffKind === 'crimson_might' && this.arenaBuffTimer > 0) {
      mult *= 1.28;
    }
    if (enemy.isBoss()) mult *= mods.bossDamageMult;
    if (enemy.hp <= enemy.maxHp * 0.45) mult *= mods.executeLowHpMult;
    if (mods.critChance > 0 && Math.random() < mods.critChance) {
      mult *= mods.critDamageMult;
      this.particles.emitSparks(enemy.x, enemy.y - 52, 10, '#fbbf24', 420);
      this.particles.emitText(enemy.x, enemy.y - 96, 'CHÍ MẠNG!', '#fbbf24', 18);
    }
    return Math.max(1, Math.round(baseDmg * mult));
  }

  private damageSoulCrystal(c: SoulCrystal, dmg: number): void {
    const shattered = c.takeHit(dmg, this.particles);
    this.audio.playShieldClang();
    if (!shattered) return;

    this.audio.playCryoShatter();
    this.camera.pulseZoom(1.14, 0.24);
    this.camera.addShake(0.42, 0, -1);
    this.triggerImpactFrame(c.x, c.y - 56, c.accentColor, 0.05);

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      if (Math.abs(enemy.x - c.x) <= 230) {
        const dir: 1 | -1 = enemy.x >= c.x ? 1 : -1;
        const killed = enemy.takeDamage(
          enemy.isBoss() ? 42 : 64,
          dir * 340,
          -240,
          this.particles,
          this.audio,
          true
        );
        this.applyBossPostureHit(enemy, 22);
        if (!killed) {
          enemy.applyStun(enemy.isBoss() ? 0.75 : 1.25, this.particles);
        }
        this.registerPlayerHit(enemy.isBoss() ? 42 : 64, 28, true, killed, enemy);
      }
    }

    this.arenaBuffKind = c.kind;
    this.arenaBuffTimer = 9.5;
    if (c.kind === 'aegis_vitality') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 24);
      this.player.addRage(20, this.mode === 'training');
      this.particles.emitText(c.x, c.y - 118, '🛡️ HỘ MỆNH · +24 HP & GIÁP 9.5s!', '#34d399', 24);
    } else if (c.kind === 'crimson_might') {
      this.player.addRage(16, this.mode === 'training');
      this.particles.emitText(c.x, c.y - 118, '🔥 CUỒNG SÁT · +28% DMG & HÚT MÁU!', '#fb7185', 24);
    } else {
      this.player.dashCooldown = 0;
      this.player.cryoCooldown = Math.max(0, this.player.cryoCooldown - 2.5);
      this.particles.emitText(c.x, c.y - 118, '⚡ LÔI TỐC · GIẬT SÉT LAN 9.5s!', '#38bdf8', 24);
    }
  }

  private pointToSegmentDistance(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
  ): number {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
  }

  private shatterMirrorRiftByHit(rift: MirrorRift, hitboxId: number): void {
    rift.lastHitboxId = hitboxId;
    rift.active = false;
    rift.finalBurstReady = false;

    const vfx = getSkinVfxProfile('mirage', this.skinId);
    const isMythic = this.skinId === 'void_shatterer';
    const dmgMult = rift.getDamageMultiplier();
    const effRadius = rift.getEffectiveRadius();
    const shardDmg = Math.max(12, Math.round(rift.damage * dmgMult * 0.9));
    const aoeDmg = Math.max(16, Math.round(rift.damage * dmgMult * 1.45));
    const shardPrimary = isMythic ? '#f43f5e' : vfx.slashPrimary;
    const shardSecondary = isMythic ? '#38bdf8' : vfx.slashSecondary;

    let nearest: Enemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      const d = Math.hypot(enemy.x - rift.x, enemy.y - 48 - rift.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = enemy;
      }
    }

    if (nearest) {
      const baseAngle = Math.atan2(nearest.y - 48 - rift.y, nearest.x - rift.x);
      const fanOffsets = [-0.18, -0.09, 0, 0.09, 0.18];
      const speed = 1160;
      for (const offset of fanOffsets) {
        const ang = baseAngle + offset;
        this.projectiles.push(
          new Projectile({
            x: rift.x,
            y: rift.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 18,
            damage: shardDmg,
            kind: 'mirror_shard',
            fromPlayer: true,
            color: shardPrimary,
            secondaryColor: shardSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 1.05,
          })
        );
      }
    } else {
      const speed = 1040;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI * 0.5;
        this.projectiles.push(
          new Projectile({
            x: rift.x,
            y: rift.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 18,
            damage: shardDmg,
            kind: 'mirror_shard',
            fromPlayer: true,
            color: shardPrimary,
            secondaryColor: shardSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 1.05,
          })
        );
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      const dist = Math.hypot(enemy.x - rift.x, enemy.y - 48 - rift.y);
      if (dist <= effRadius) {
        const pushDir: 1 | -1 = enemy.x >= rift.x ? 1 : -1;
        const scaled = this.scalePlayerDamage(aoeDmg, enemy);
        const killed = enemy.takeDamage(
          scaled,
          pushDir * 240,
          -175,
          this.particles,
          this.audio,
          true
        );
        this.applyBossPostureHit(enemy, 18);
        if (!killed) {
          enemy.applyElementalMark('mirage', 1, this.particles, {
            primary: vfx.particlePrimary,
            secondary: vfx.particleSecondary,
          });
        }
        this.registerPlayerHit(scaled, 26, true, killed, enemy);
      }
    }

    this.audio.playCryoShatter();
    this.camera.pulseZoom(1.12, 0.2);
    this.camera.addShake(0.38, this.player.facing, 0);
    this.particles.emitShockwave(rift.x, rift.y, shardSecondary, effRadius * 0.92, 0.3);
    this.particles.emitShards(rift.x, rift.y, 20, shardPrimary, 290, 1.15);
    this.particles.emitShards(rift.x, rift.y, 10, shardSecondary, 240, 0.9);
    this.particles.emitText(
      rift.x,
      rift.y - 54,
      'PHÁ KÍNH BÃO MẢNH!',
      isMythic ? '#f43f5e' : '#c084fc',
      18
    );
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
  }

  private handleMirrorRiftDashWarp(rift: MirrorRift): void {
    const oldX = this.player.x;
    const oldY = this.player.y - 52;
    const vfx = getSkinVfxProfile('mirage', this.skinId);
    const warpCol = this.skinId === 'void_shatterer' ? '#f43f5e' : vfx.slashPrimary;

    // Shattered-glass departure afterimages & shards
    if (this.player.lastJoints) {
      for (const offset of [0, 18]) {
        if (this.player.afterimages.length >= Player.MAX_AFTERIMAGES) {
          this.player.afterimages.shift();
        }
        this.player.afterimages.push({
          x: oldX - this.player.facing * offset,
          y: this.player.y,
          facing: this.player.facing,
          joints: this.player.lastJoints,
          life: 0,
          maxLife: 0.32,
          color: '#38bdf8',
        });
      }
    }
    this.particles.emitShards(oldX, oldY, 12, warpCol, 230, 0.95);
    this.particles.emitShockwave(rift.x, rift.y, '#38bdf8', 82, 0.22);

    let nearestEnemy: Enemy | null = null;
    let bestEnemyDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      const d = Math.abs(enemy.x - rift.x);
      if (d < bestEnemyDist) {
        bestEnemyDist = d;
        nearestEnemy = enemy;
      }
    }

    let destX: number;
    let destFacing: 1 | -1;
    if (nearestEnemy) {
      destX = clamp(
        nearestEnemy.x + (nearestEnemy.x >= this.player.x ? 78 : -78),
        60,
        ARENA_WIDTH - 60
      );
      destFacing = nearestEnemy.x >= destX ? 1 : -1;
    } else {
      const otherRift = this.mirrorRifts.find((r) => r !== rift && r.active);
      if (otherRift) {
        destX = clamp(otherRift.x, 60, ARENA_WIDTH - 60);
        destFacing = this.player.facing;
      } else {
        destX = clamp(rift.x + this.player.facing * 140, 60, ARENA_WIDTH - 60);
        destFacing = this.player.facing;
      }
    }

    this.player.x = destX;
    this.player.facing = destFacing;
    this.player.vx = destFacing * 200;
    this.player.dashTimer = Math.min(this.player.dashTimer, 0.04);
    this.player.dashGraceTimer = Math.max(this.player.dashGraceTimer, 0.38);
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.35);

    this.particles.emitChainArc(oldX, oldY, this.player.x, this.player.y - 52, '#38bdf8', 4.5);
    this.particles.emitShards(this.player.x, this.player.y - 52, 16, '#38bdf8', 250, 1.05);
    this.particles.emitShards(this.player.x, this.player.y - 52, 8, warpCol, 200, 0.85);
    this.particles.emitShockwave(this.player.x, this.player.y - 52, warpCol, 96, 0.25);
    this.particles.emitText(this.player.x, this.player.y - 88, 'DỊCH CHUYỂN GƯƠNG!', '#38bdf8', 18);
    this.audio.playCryoShatter();
    this.camera.addShake(0.28, destFacing, 0);
  }

  private applyBossPostureHit(enemy: Enemy, basePosture: number): void {
    if (enemy instanceof Boss) {
      const mods = computeBlessingModifiers(this.blessingStacks);
      enemy.addPostureDamage(basePosture * mods.postureDamageMult, this.particles, this.audio);
    }
  }

  private spawnLootOrbsAt(x: number, y: number, count: number, guaranteedHeal = false): void {
    for (let i = 0; i < count; i++) {
      let kind: 'heal' | 'rage' | 'awaken';
      if (guaranteedHeal && i === 0) {
        kind = 'heal';
      } else if (this.player.hp < this.player.maxHp * 0.65 && Math.random() < 0.34) {
        kind = 'heal';
      } else if (Math.random() < 0.58) {
        kind = 'rage';
      } else {
        kind = 'awaken';
      }
      const val = kind === 'heal' ? 11 : kind === 'rage' ? 11 : 8;
      this.lootOrbs.push(new LootOrb(x + (i - (count - 1) * 0.5) * 22, y - 38, kind, val));
    }
  }

  private recordTimeStopDamage(enemyId: number, amount: number): void {
    if (this.timeStopTimer <= 0 || amount <= 0) return;
    this.timeStopStoredDamage.set(enemyId, (this.timeStopStoredDamage.get(enemyId) ?? 0) + amount);
  }

  private detonateTimeStopDamage(): void {
    const cvfx = getSkinVfxProfile('chrono', this.skinId);
    const isSovereign = this.skinId === 'chrono_sovereign';
    this.particles.emitShockwave(this.player.x, this.player.y - 54, cvfx.cutsceneSecondary, 290, 0.48);
    this.particles.emitShockwave(this.player.x, this.player.y - 54, cvfx.cutscenePrimary, 210, 0.36);
    this.particles.emitText(
      this.player.x,
      this.player.y - 126,
      'VỠ THỜI GIAN!',
      cvfx.hitTextColor,
      26
    );
    this.audio.playCryoShatter();
    this.camera.pulseZoom(1.16, 0.28);
    this.camera.addShake(0.55, 0, -1);

    let anyDetonated = false;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      const stored = this.timeStopStoredDamage.get(enemy.id) ?? 0;
      const baseBurst = enemy.isBoss() ? 95 : 135;
      const rawBurst = baseBurst + Math.round(stored * (isSovereign ? 0.85 : 0.72));
      const burstDmg = this.scalePlayerDamage(rawBurst, enemy);
      const dir: 1 | -1 = enemy.x >= this.player.x ? 1 : -1;
      const killed = enemy.takeDamage(
        burstDmg,
        dir * 280,
        -180,
        this.particles,
        this.audio,
        true
      );
      this.applyBossPostureHit(enemy, stored > 0 ? 28 : 16);
      this.particles.emitShockwave(enemy.x, enemy.y - 52, cvfx.cutscenePrimary, 120, 0.32);
      this.particles.emitShards(enemy.x, enemy.y - 54, 14, cvfx.cutsceneSecondary, 260, 1.0);
      this.particles.emitSparks(enemy.x, enemy.y - 54, 16, cvfx.particlePrimary, 480);
      if (stored > 0) {
        this.particles.emitText(
          enemy.x,
          enemy.y - 108,
          `VỠ THỜI GIAN · +${burstDmg}!`,
          cvfx.hitTextColor,
          22
        );
      }
      this.registerPlayerHit(burstDmg, stored > 0 ? 34 : 22, true, killed, enemy);
      anyDetonated = true;
    }
    if (anyDetonated) {
      this.triggerImpactFrame(this.player.x, this.player.y - 54, cvfx.cutsceneSecondary, 0.06);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.065);
    }
    this.timeStopStoredDamage.clear();
  }

  private executeTemporalEchoStrike(echo: TemporalEcho, strike: TemporalEchoStrike): void {
    const cvfx = getSkinVfxProfile('chrono', echo.skinId);
    const isSovereign = echo.skinId === 'chrono_sovereign';
    echo.x = finiteOr(strike.x, echo.x);
    echo.y = finiteOr(strike.y, echo.y);
    echo.facing = strike.facing === -1 ? -1 : 1;
    echo.pose = strike.pose;
    echo.poseTime = finiteOr(strike.poseTime, 0.14);

    if (this.echoSlashTrails.length >= 16) {
      this.echoSlashTrails.shift();
    }
    this.echoSlashTrails.push({
      x: echo.x + echo.facing * 24,
      y: echo.y - 54,
      facing: echo.facing,
      radius: Math.max(72, strike.reach * 0.92),
      startAngle: -1.4,
      endAngle: 0.95,
      life: 0,
      maxLife: 0.22,
      outerColor: strike.trailColor || echo.primaryColor,
      coreColor: cvfx.slashCore,
      thickness: strike.heavy ? 18 : 13,
      style: isSovereign ? 'chrono_sovereign_slash' : 'chrono_clockwork_slash',
      rimColor: strike.trailAccent || cvfx.slashRim,
      secondaryColor: echo.secondaryColor,
      motif: cvfx.motif,
      skinId: echo.skinId,
      characterId: 'chrono',
      seed: Math.round(echo.age * 100) & 0xff,
    });

    const hitX = echo.x + echo.facing * (strike.reach * 0.56);
    const hitY = echo.y - 50;
    this.particles.emitSlashBeam(
      hitX,
      hitY,
      -0.42 * echo.facing,
      strike.heavy ? 185 : 145,
      strike.trailColor || echo.primaryColor,
      strike.heavy ? 9 : 7
    );
    this.particles.emitSparks(hitX, hitY, strike.heavy ? 10 : 5, echo.secondaryColor, 360);
    if (strike.heavy) {
      this.particles.emitShockwave(hitX, hitY, echo.primaryColor, 76, 0.2);
    }

    const halfW = strike.reach * 0.5 + 28;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      if (Math.abs(enemy.x - hitX) <= halfW && Math.abs(enemy.y - 48 - hitY) <= 78) {
        const dmg = this.scalePlayerDamage(strike.damage, enemy);
        const killed = enemy.takeDamage(
          dmg,
          echo.facing * (strike.heavy ? 180 : 110),
          strike.heavy ? -80 : -35,
          this.particles,
          this.audio,
          strike.heavy
        );
        this.applyBossPostureHit(enemy, strike.heavy ? 10 : 5);
        this.recordTimeStopDamage(enemy.id, dmg);
        if (!killed) {
          enemy.applyElementalMark('chrono', 1, this.particles, {
            primary: echo.primaryColor,
            secondary: echo.secondaryColor,
          });
        }
        this.registerPlayerHit(dmg, strike.heavy ? 18 : 12, strike.heavy, killed, enemy);
      }
    }
  }

  private simulateStep(dt: number): void {
    this.elapsedTime += dt;
    if (this.witchTimeTimer > 0) {
      this.witchTimeTimer = Math.max(0, this.witchTimeTimer - dt);
    }
    if (this.witchTimeCooldown > 0) {
      this.witchTimeCooldown = Math.max(0, this.witchTimeCooldown - dt);
    }
    if (this.arenaBuffTimer > 0) {
      this.arenaBuffTimer = Math.max(0, this.arenaBuffTimer - dt);
      if (this.arenaBuffTimer <= 0) {
        this.arenaBuffKind = null;
      }
    }
    if (this.arenaBuffKind === 'thunder_overdrive' && this.arenaBuffTimer > 0) {
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt * 0.65);
    }
    // Witch Time slows hostile world to 24%; Global Time Stop freezes hostile world completely!
    let soloTimeScale = 1;
    let soloMovementLocked = false;
    if (this.mode === 'solo1v1') {
      const soloTick = this.solo1v1.update(dt, {
        playerHp: this.player.hp,
        playerMaxHp: this.player.maxHp,
        botHp: this.soloOpponent && this.soloOpponent.alive ? this.soloOpponent.hp : 0,
        botMaxHp: this.soloOpponent ? this.soloOpponent.maxHp : this.player.maxHp,
        playerCombo: this.combo,
      });
      soloTimeScale = soloTick.timeScale;
      soloMovementLocked = soloTick.movementLocked;
      if (soloTick.resetRound) {
        this.resetSolo1v1Round();
        this.input.update(dt);
        this.syncHudThrottled(dt);
        return;
      }
      if (soloTick.matchEnded && soloTick.winner) {
        this.triggerOutcome(soloTick.winner === 'player' ? 'victory' : 'gameover');
        this.input.update(dt);
        this.syncHudThrottled(dt);
        return;
      }
    }
    const timeStopped = this.timeStopTimer > 0;
    const baseWorldDt = this.witchTimeTimer > 0 ? dt * 0.24 : dt;
    const worldDt = soloMovementLocked ? 0 : baseWorldDt * soloTimeScale;
    const playerDt = soloMovementLocked ? 0 : dt * soloTimeScale;
    const enemyWorldDt = timeStopped ? 0 : worldDt;

    // Combo & Style decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
    this.styleScore = decayStyleScore(this.styleScore, dt);

    // Process pending wave spawns (frozen during Time Stop)
    if (!timeStopped) {
      for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
        this.pendingSpawns[i].delay -= worldDt;
        if (this.pendingSpawns[i].delay <= 0) {
          const sp = this.pendingSpawns.splice(i, 1)[0];
          const spawnX =
            sp.side === 'right'
              ? clamp(this.player.x + 560, 120, ARENA_WIDTH - 80)
              : clamp(this.player.x - 560, 80, ARENA_WIDTH - 120);
          const spawned = new Enemy(sp.type, spawnX, false, Boolean(sp.elite));
          if (this.mode === 'story') {
            const stageScale = computeStageEnemyScaling(this.currentStageIndex);
            spawned.maxHp = Math.max(1, Math.round(spawned.maxHp * stageScale.mobHpMult));
            spawned.hp = spawned.maxHp;
            spawned.trailHp = spawned.maxHp;
            spawned.damage = Math.max(1, Math.round(spawned.damage * stageScale.mobDmgMult));
          } else if (this.mode === 'endless') {
            const endlessHpScale = 0.9 + Math.min(0.85, Math.max(0, this.endlessWave - 1) * 0.055);
            const endlessDmgScale = 0.92 + Math.min(0.45, Math.max(0, this.endlessWave - 1) * 0.03);
            spawned.maxHp = Math.max(1, Math.round(spawned.maxHp * endlessHpScale));
            spawned.hp = spawned.maxHp;
            spawned.trailHp = spawned.maxHp;
            spawned.damage = Math.max(1, Math.round(spawned.damage * endlessDmgScale));
          }
          this.enemies.push(spawned);
        }
      }
    }

    // Periodic Biome Stage Hazards (frozen during Time Stop)
    if (
      !timeStopped &&
      this.activeHazardKind !== 'none' &&
      this.hazardInterval > 0 &&
      (this.enemies.length > 0 || this.pendingSpawns.length > 0)
    ) {
      this.hazardSpawnTimer -= worldDt;
      if (this.hazardSpawnTimer <= 0) {
        this.hazardSpawnTimer = this.hazardInterval * (0.85 + Math.random() * 0.3);
        const offset = (Math.random() - 0.5) * 440;
        const hx = clamp(this.player.x + offset, 110, ARENA_WIDTH - 110);
        this.stageHazards.push(new StageHazard(this.activeHazardKind, hx));
      }
    }

    // Periodic Soul Crystal Arena Buff Object
    if (
      this.mode !== 'training' &&
      this.soulCrystals.length === 0 &&
      (this.enemies.length > 0 || this.pendingSpawns.length > 0)
    ) {
      this.crystalSpawnTimer -= enemyWorldDt;
      if (this.crystalSpawnTimer <= 0) {
        this.crystalSpawnTimer = 17.5;
        this.spawnArenaCrystalNearAction();
      }
    }

    for (let i = this.soulCrystals.length - 1; i >= 0; i--) {
      this.soulCrystals[i].update(dt);
      if (!this.soulCrystals[i].active) {
        this.soulCrystals.splice(i, 1);
      }
    }

    // Sub-wave Bounty Objective check
    if (this.waveBountyKind && !this.waveBountyDone) {
      if (this.waveBountyKind === 'combo' && this.combo >= this.waveBountyTarget) {
        this.completeWaveBounty();
      } else if (this.waveBountyKind === 'speed') {
        this.waveBountyTimer -= dt;
        const clearedNow =
          this.pendingSpawns.length === 0 && !this.enemies.some((e) => e.alive && !e.dying);
        if (clearedNow && this.waveBountyTimer > 0) {
          this.completeWaveBounty();
        } else if (this.waveBountyTimer <= 0) {
          this.waveBountyKind = null;
        }
      }
    }

    // Auto-stand off chair if an enemy gets close
    if (this.player.sittingOnChair) {
      const closeEnemy = this.enemies.find((e) => e.alive && !e.dying && Math.abs(e.x - this.player.x) < 230);
      if (closeEnemy) {
        this.player.standUpFromChair(this.chair, this.audio, this.particles);
      }
    }

    // Update Plastic Chair
    if (this.chair) {
      this.chair.update(dt, this.particles);
      if (!this.chair.active) this.chair = null;
    }

    // Update Magnetic Loot Orbs
    const mods = computeBlessingModifiers(this.blessingStacks);
    for (let i = this.lootOrbs.length - 1; i >= 0; i--) {
      const orb = this.lootOrbs[i];
      const collected = orb.update(dt, this.player.x, this.player.y);
      if (collected) {
        this.particles.emitSparks(this.player.x, this.player.y - 52, 8, orb.color, 320);
        if (orb.kind === 'heal') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + orb.value);
          this.particles.emitText(this.player.x, this.player.y - 98, `+${orb.value} HP`, '#4ade80', 18);
        } else if (orb.kind === 'rage') {
          const gain = Math.round(orb.value * mods.meterGainMult);
          this.player.addRage(gain, this.mode === 'training');
          this.particles.emitText(this.player.x, this.player.y - 98, `+${gain} NỘ`, '#f87171', 18);
        } else {
          const gain = Math.round(orb.value * mods.meterGainMult);
          this.player.addAwakening(gain, this.mode === 'training');
          this.particles.emitText(this.player.x, this.player.y - 98, `+${gain} TỈNH`, '#fde047', 18);
        }
      }
      if (!orb.active) {
        this.lootOrbs.splice(i, 1);
      }
    }

    // Update Player (always runs at 100% real dt even during Witch Time / Time Stop!)
    const trainingMode = this.mode === 'training';
    this.player.update({
      dt: playerDt,
      input: this.input,
      audio: this.audio,
      particles: this.particles,
      camera: this.camera,
      chair: this.chair,
      iceWalls: this.iceWalls,
      magmaPillars: this.magmaPillars,
      projectiles: this.projectiles,
      mirrorRifts: this.mirrorRifts,
      trainingMode,
      hasActiveEnemies: this.enemies.some((e) => e.alive && !e.dying),
      findAttackTarget: (x, y, range) => {
        let best: { x: number; y: number } | null = null;
        let bestD = range;
        for (const e of this.enemies) {
          if (!e.alive || e.dying) continue;
          if (Math.abs(e.y - y) > 170) continue;
          const d = Math.abs(e.x - x);
          if (d < bestD) {
            bestD = d;
            best = { x: e.x, y: e.y };
          }
        }
        return best;
      },
      onRequestUltimate: () => this.activateScarletSheath(),
      onRequestAwaken: () => {
        if (this.player.triggerAwakening(this.audio, this.particles, this.camera)) {
          const vfx = getSkinVfxProfile(this.characterId, this.skinId);
          const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
          if (this.characterId !== 'mactien') {
            this.bg.triggerCrimsonFlash(0.95);
          }
          this.audio.setBgmIntensity(2);
          this.awakenPromptTimer = 0;
          if (this.isVoidShattererDomainOwner()) {
            this.domainTimer = this.domainDuration;
            this.activeDomainKind = 'mirage';
            this.domainBeamTickTimer = 0.2;
            this.particles.emitText(
              this.player.x,
              this.player.y - 146,
              'BÀNH TRƯỚNG LÃNH ĐỊA · MA KÍNH HƯ KHÔNG GIỚI!',
              '#f43f5e',
              22
            );
          } else if (this.isChronoDomainOwner()) {
            this.domainTimer = this.domainDuration;
            this.activeDomainKind = 'chrono';
            this.particles.emitText(
              this.player.x,
              this.player.y - 146,
              'BÀNH TRƯỚNG LÃNH ĐỊA · THÁP ĐỒNG HỒ CỔ ĐẠI!',
              '#f59e0b',
              22
            );
          } else if (this.isXuanFengDomainOwner()) {
            this.domainTimer = this.domainDuration;
            this.activeDomainKind = 'xuan_feng';
            this.particles.emitText(
              this.player.x,
              this.player.y - 146,
              'BÀNH TRƯỚNG LÃNH ĐỊA · XUÂN PHONG VĂN MIẾU!',
              '#5eead4',
              22
            );
          }
          this.triggerImpactFrame(
            this.player.x,
            this.player.y - 54,
            vfx.impactRingColor,
            0.065
          );
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying) continue;
            if (Math.abs(enemy.x - this.player.x) < 260) {
              enemy.applyElementalMark(this.player.character.id, 2, this.particles, markTint);
              this.applyBossPostureHit(enemy, 18);
              if (!enemy.isBoss()) {
                enemy.vy = Math.min(enemy.vy, -240);
                enemy.onGround = false;
              }
            }
          }
        }
      },
      onThunderBlinkHit: (fromX, toX, y, dir, damage) => {
        const vfx = getSkinVfxProfile('raijin', this.skinId);
        const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
        const minX = Math.min(fromX, toX) - 42;
        const maxX = Math.max(fromX, toX) + 42;
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          if (enemy.x >= minX && enemy.x <= maxX && Math.abs(enemy.y - 48 - y) < 102) {
            const scaled = this.scalePlayerDamage(damage, enemy);
            const killed = enemy.takeDamage(
              scaled,
              dir * 290,
              -200,
              this.particles,
              this.audio,
              true
            );
            this.applyBossPostureHit(enemy, 22);
            enemy.applyElementalMark('raijin', 2, this.particles, markTint);
            enemy.applyStun(enemy.isBoss() ? 0.9 : 1.45, this.particles);
            this.particles.emitLightning(enemy.x, enemy.y - 52, vfx.particleSecondary, 58);
            this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.25 * dir, 210, vfx.slashPrimary, 10);
            emitSkinAccentParticle(
              this.particles,
              vfx.swingParticleKind,
              enemy.x,
              enemy.y - 52,
              5,
              vfx.particleSecondary,
              dir
            );
            this.registerPlayerHit(scaled, 32, true, killed, enemy);
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.05);
          }
        }
      },
      onCryoSummonChill: (centerX, radius) => {
        const vfx = getSkinVfxProfile('kuro', this.skinId);
        const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          if (Math.abs(enemy.x - centerX) <= radius) {
            enemy.applyElementalMark('kuro', 2, this.particles, markTint);
            if (vfx.iceWallTheme === 'ice') {
              this.particles.emitIceShards(enemy.x, enemy.y - 48, 8, enemy.x >= centerX ? 1 : -1);
            } else {
              emitSkinAccentParticle(
                this.particles,
                vfx.swingParticleKind,
                enemy.x,
                enemy.y - 48,
                8,
                vfx.particlePrimary,
                enemy.x >= centerX ? 1 : -1
              );
            }
          }
        }
      },
      onSkillLinkWarp: (kind) => {
        let best: Enemy | null = null;
        let bestScore = Infinity;
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          const dist = Math.abs(enemy.x - this.player.x);
          if (dist > 680) continue;
          const markedBonus = enemy.markKind === kind ? -450 : 0;
          const score = dist + markedBonus;
          if (score < bestScore) {
            bestScore = score;
            best = enemy;
          }
        }
        if (!best) return null;
        const behindDir: 1 | -1 = best.x >= this.player.x ? 1 : -1;
        const warpedToX = clamp(best.x + behindDir * 68, 52, ARENA_WIDTH - 52);
        const warpedFacing: 1 | -1 = best.x >= warpedToX ? 1 : -1;
        this.detonateElementalMarks(kind, best.x, best.y - 52, 230);
        return { warpedToX, warpedFacing };
      },
      onDetonateAllMarks: (kind, originX, originY, maxRange) =>
        this.detonateElementalMarks(kind, originX, originY, maxRange),
      onMirrorRiftDashWarp: (rift) => this.handleMirrorRiftDashWarp(rift),
    });

    // Tick & prune TemporalEcho slash trails
    for (let i = this.echoSlashTrails.length - 1; i >= 0; i--) {
      this.echoSlashTrails[i].life += dt;
      if (this.echoSlashTrails[i].life >= this.echoSlashTrails[i].maxLife) {
        this.echoSlashTrails.splice(i, 1);
      }
    }

    // Chrono Exclusive: Temporal Echoes (replays pose & strikes 0.4s later!) & Global Time Stop (3.5s / 4.2s)
    if (this.player.pendingTemporalEcho) {
      const e = this.player.pendingTemporalEcho;
      this.player.pendingTemporalEcho = null;
      const echo = new TemporalEcho({
        x: e.x,
        y: e.y,
        facing: e.facing,
        pose: e.pose,
        poseTime: e.poseTime,
        walkPhase: e.walkPhase,
        skinId: e.skinId,
        awakened: e.awakened,
        primaryColor: e.primaryColor,
        secondaryColor: e.secondaryColor,
        maxLife: e.awakened ? 5.2 : 4.2,
        delay: 0.4,
        damage: e.damage,
      });
      if (e.initialStrike) {
        echo.queueStrike({
          ...e.initialStrike,
          triggerTime: echo.delay,
        });
      }
      this.temporalEchoes.push(echo);
      if (this.temporalEchoes.length > 3) {
        this.temporalEchoes.shift();
      }
    }

    if (this.player.pendingTemporalStrikes.length > 0) {
      for (const strike of this.player.pendingTemporalStrikes) {
        for (const echo of this.temporalEchoes) {
          if (!echo.active) continue;
          echo.queueStrike({
            ...strike,
            triggerTime: echo.age + echo.delay,
          });
        }
      }
      this.player.pendingTemporalStrikes.length = 0;
    }

    const delayedSnap = this.player.getTemporalSnapshotDelayed(0.4) ?? undefined;
    for (let i = this.temporalEchoes.length - 1; i >= 0; i--) {
      const echo = this.temporalEchoes[i];
      const readyStrikes = echo.update(dt, delayedSnap);
      for (const strike of readyStrikes) {
        this.executeTemporalEchoStrike(echo, strike);
      }
      if (!echo.active) {
        this.temporalEchoes.splice(i, 1);
      }
    }

    if (this.timeStopTimer > 0) {
      this.timeStopTimer = Math.max(0, this.timeStopTimer - dt);
      if (this.timeStopTimer <= 0) {
        this.detonateTimeStopDamage();
      }
    }

    // Mặc Tiên Exclusive: Tĩnh Tự Ấn ("静") — Giant square ink seal that roots/slows enemies for 1.1s then explodes!
    if (this.player.pendingInkSeals.length > 0) {
      for (const req of this.player.pendingInkSeals) {
        let targetX = req.x;
        let bestDist = 360;
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          const dx = (enemy.x - this.player.x) * this.player.facing;
          if (dx >= -24 && dx < bestDist) {
            bestDist = dx;
            targetX = clamp(enemy.x, 80, ARENA_WIDTH - 80);
          }
        }
        const radius = req.awakened ? 132 : 108;
        const sealSkinId = req.skinId ?? this.skinId;
        const isXuanFengSeal = sealSkinId === 'xuan_feng_sage';
        this.inkSeals.push({
          x: targetX,
          y: GROUND_Y,
          radius,
          damage: req.damage,
          awakened: req.awakened,
          life: 0,
          maxLife: 1.1,
          skinId: sealSkinId,
          slipTickTimer: 0.08,
        });
        if (isXuanFengSeal) {
          this.particles.emitShockwave(targetX, GROUND_Y - 38, '#5eead4', radius * 1.15, 0.28);
          this.particles.emitShockwave(
            targetX,
            GROUND_Y - 38,
            req.awakened ? '#fde68a' : '#fda4af',
            radius * 0.85,
            0.22
          );
          this.particles.emitPetals(
            targetX,
            GROUND_Y - 42,
            req.awakened ? 14 : 10,
            '#fda4af',
            140,
            0.85
          );
          if (req.awakened) {
            this.particles.emitStars(targetX, GROUND_Y - 54, 7, '#fde68a', 155, 0.9);
          }
          emitSkinAccentParticle(
            this.particles,
            'ink_splatter',
            targetX,
            GROUND_Y - 42,
            6,
            '#5eead4',
            this.player.facing
          );
        } else {
          this.particles.emitShockwave(targetX, GROUND_Y - 38, '#ef4444', radius * 1.15, 0.28);
          this.particles.emitShockwave(targetX, GROUND_Y - 38, req.awakened ? '#f59e0b' : '#2dd4bf', radius * 0.85, 0.22);
          emitSkinAccentParticle(
            this.particles,
            'ink_splatter',
            targetX,
            GROUND_Y - 42,
            14,
            req.awakened ? '#f59e0b' : '#2dd4bf',
            this.player.facing
          );
        }
        // Initial seal stamp damage + mark
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - targetX) <= radius && Math.abs(enemy.y - GROUND_Y) <= 135) {
            const kDir: 1 | -1 = enemy.x >= targetX ? 1 : -1;
            const killed = enemy.takeDamage(
              req.damage,
              kDir * 45,
              -35,
              this.particles,
              this.audio,
              false
            );
            enemy.applyElementalMark(
              'mactien',
              1,
              this.particles,
              isXuanFengSeal
                ? { primary: '#5eead4', secondary: '#fda4af' }
                : {
                    primary: '#ef4444',
                    secondary: req.awakened ? '#f59e0b' : '#2dd4bf',
                  }
            );
            this.registerPlayerHit(req.damage, 12, false, killed, enemy);
          }
        }
      }
      this.player.pendingInkSeals.length = 0;
    }

    for (let i = this.inkSeals.length - 1; i >= 0; i--) {
      const seal = this.inkSeals[i];
      seal.life += worldDt;
      // Continuously root / heavily slow enemies trapped inside the Tĩnh Tự Ấn square
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - seal.x;
        if (Math.abs(dx) <= seal.radius && Math.abs(enemy.y - GROUND_Y) <= 130) {
          enemy.vx *= Math.pow(0.06, worldDt * 5);
          // Subtle calligraphic gravity pull toward seal center
          enemy.x -= Math.sign(dx) * Math.min(Math.abs(dx), 68 * worldDt);
        }
      }

      if (seal.skinId === 'xuan_feng_sage' && seal.awakened && seal.life < seal.maxLife) {
        seal.slipTickTimer = (seal.slipTickTimer ?? 0) - worldDt;
        if (seal.slipTickTimer <= 0) {
          seal.slipTickTimer = 0.15;
          const waveSeed = Math.round(seal.life * 20);
          const offsets = waveSeed % 2 === 0 ? [-46, 38] : [-18, 52];
          for (const ox of offsets) {
            const sx = clamp(seal.x + ox, 40, ARENA_WIDTH - 40);
            const sy = GROUND_Y - 236;
            const vx = -ox * 1.45;
            const vy = 940;
            this.projectiles.push(
              new Projectile({
                x: sx,
                y: sy,
                vx,
                vy,
                radius: 14,
                damage: Math.max(6, Math.round(seal.damage * 0.25)),
                kind: 'bamboo_blade',
                fromPlayer: true,
                color: '#5eead4',
                secondaryColor: '#2dd4bf',
                rimColor: '#fde68a',
                maxLife: 0.34,
              })
            );
            this.particles.emitSlashBeam(
              seal.x + ox * 0.6,
              GROUND_Y - 78,
              Math.atan2(vy, vx),
              135,
              '#5eead4',
              5
            );
          }
          this.particles.emitPetals(seal.x, GROUND_Y - 64, 4, '#fda4af', 155, 0.85);
          emitSkinAccentParticle(
            this.particles,
            'ink_splatter',
            seal.x,
            GROUND_Y - 56,
            2,
            '#5eead4',
            1
          );
        }
      }

      if (seal.life >= seal.maxLife) {
        // Detonate Tĩnh Tự Ấn in a huge ink-wave!
        const burstDmg = Math.round(seal.damage * 1.45);
        const isXuanFengSeal = seal.skinId === 'xuan_feng_sage';
        if (isXuanFengSeal) {
          if (seal.awakened) {
            this.particles.emitCrossSlash(seal.x, GROUND_Y - 52, -0.32, seal.radius * 2.5, '#1e293b', 18);
            this.particles.emitCrossSlash(seal.x, GROUND_Y - 52, -0.32, seal.radius * 2.2, '#5eead4', 11);
            this.particles.emitSlashBeam(seal.x, GROUND_Y - 52, -0.38, seal.radius * 2.1, '#fde68a', 9);
            this.particles.emitSlashBeam(seal.x, GROUND_Y - 52, 0.38, seal.radius * 2.1, '#f8fafc', 8);
            this.particles.emitShockwave(seal.x, GROUND_Y - 42, '#fde68a', seal.radius * 1.75, 0.4);
            this.particles.emitShockwave(seal.x, GROUND_Y - 42, '#5eead4', seal.radius * 1.4, 0.32);
            this.particles.emitPetals(seal.x, GROUND_Y - 48, 18, '#fda4af', 240, 0.95);
            this.particles.emitStars(seal.x, GROUND_Y - 52, 10, '#fde68a', 210, 0.95);
            emitSkinAccentParticle(
              this.particles,
              'ink_splatter',
              seal.x,
              GROUND_Y - 46,
              8,
              '#5eead4',
              1
            );
            this.particles.emitText(
              seal.x,
              GROUND_Y - 114,
              'VĂN THÁNH TRẤN THIÊN TRẬN!',
              '#fde68a',
              25
            );
            this.triggerImpactFrame(seal.x, GROUND_Y - 52, '#5eead4', 0.055);
          } else {
            this.particles.emitShockwave(seal.x, GROUND_Y - 40, '#5eead4', seal.radius * 1.6, 0.36);
            this.particles.emitShockwave(seal.x, GROUND_Y - 40, '#f8fafc', seal.radius * 1.25, 0.28);
            this.particles.emitSlashBeam(seal.x - 24, GROUND_Y - 44, -0.08, seal.radius * 1.5, '#5eead4', 9);
            this.particles.emitSlashBeam(seal.x + 24, GROUND_Y - 52, 0.08, seal.radius * 1.35, '#f8fafc', 7);
            this.particles.emitPetals(seal.x, GROUND_Y - 46, 16, '#fda4af', 220, 0.95);
            emitSkinAccentParticle(
              this.particles,
              'ink_splatter',
              seal.x,
              GROUND_Y - 46,
              6,
              '#5eead4',
              1
            );
            this.particles.emitText(seal.x, GROUND_Y - 108, 'PHÁ TĨNH ẤN · 静!', '#5eead4', 24);
          }
        } else {
          this.particles.emitShockwave(seal.x, GROUND_Y - 40, '#ef4444', seal.radius * 1.65, 0.36);
          this.particles.emitShockwave(
            seal.x,
            GROUND_Y - 40,
            seal.awakened ? '#f59e0b' : '#2dd4bf',
            seal.radius * 1.35,
            0.3
          );
          emitSkinAccentParticle(
            this.particles,
            'ink_splatter',
            seal.x,
            GROUND_Y - 46,
            20,
            seal.awakened ? '#f59e0b' : '#1a1d24',
            1
          );
          this.particles.emitText(seal.x, GROUND_Y - 108, 'PHÁ TĨNH ẤN · 静!', '#ef4444', 24);
        }
        this.camera.addShake(0.32, 0, -1);
        this.audio.playHit(true);

        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - seal.x) <= seal.radius * 1.28 && Math.abs(enemy.y - GROUND_Y) <= 155) {
            const kDir: 1 | -1 = enemy.x >= seal.x ? 1 : -1;
            const killed = enemy.takeDamage(
              burstDmg,
              kDir * 310,
              -215,
              this.particles,
              this.audio,
              true
            );
            enemy.applyElementalMark(
              'mactien',
              1,
              this.particles,
              isXuanFengSeal
                ? { primary: '#5eead4', secondary: '#fda4af' }
                : {
                    primary: '#ef4444',
                    secondary: seal.awakened ? '#f59e0b' : '#2dd4bf',
                  }
            );
            this.registerPlayerHit(burstDmg, 18, true, killed, enemy);
          }
        }
        this.inkSeals.splice(i, 1);
      }
    }

    // Mirage Exclusive: Void Mirror Rifts (only empowered when activeDomainKind === 'mirage')
    const domainActive =
      this.domainTimer > 0 && this.activeDomainKind === 'mirage' && this.isVoidShattererDomainOwner();
    if (this.player.pendingMirrorRifts.length > 0) {
      for (const r of this.player.pendingMirrorRifts) {
        const rift = new MirrorRift(r.x, r.y, r.damage, r.awakened, r.primaryColor, r.secondaryColor);
        rift.domainEmpowered = domainActive;
        this.mirrorRifts.push(rift);
      }
      this.player.pendingMirrorRifts.length = 0;
    }
    const mirageVfx = getSkinVfxProfile('mirage', this.skinId);
    for (let i = this.mirrorRifts.length - 1; i >= 0; i--) {
      const rift = this.mirrorRifts[i];
      rift.domainEmpowered = domainActive;
      const shouldPulse = rift.update(worldDt);
      const effRadius = rift.getEffectiveRadius();
      const dmgMult = rift.getDamageMultiplier();
      // Reflect enemy projectiles passing through the Mirror Rift!
      for (const proj of this.projectiles) {
        if (!proj.fromPlayer && proj.active && Math.hypot(proj.x - rift.x, proj.y - rift.y) < effRadius * 0.58) {
          proj.fromPlayer = true;
          proj.reflected = true;
          proj.vx = -proj.vx * 1.45;
          proj.vy = -proj.vy * 1.1;
          proj.damage = Math.max(proj.damage * 2, 32);
          proj.color = rift.primaryColor;
          this.particles.emitShockwave(proj.x, proj.y, rift.secondaryColor, 48, 0.18);
          this.audio.playParry();
        }
      }
      if (shouldPulse || rift.finalBurstReady) {
        const isFinal = rift.finalBurstReady;
        const rawDmg = isFinal ? rift.damage * 2.0 : rift.damage;
        const dmg = Math.round(rawDmg * dmgMult);
        this.particles.emitShockwave(
          rift.x,
          rift.y,
          isFinal ? rift.secondaryColor : rift.primaryColor,
          isFinal ? effRadius : effRadius * 0.72,
          isFinal ? 0.34 : 0.22
        );
        emitSkinAccentParticle(
          this.particles,
          'shard',
          rift.x,
          rift.y,
          isFinal ? 16 : 6,
          mirageVfx.particlePrimary,
          1
        );
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          const dist = Math.hypot(enemy.x - rift.x, enemy.y - 48 - rift.y);
          if (dist <= effRadius) {
            const pullDir = enemy.x > rift.x ? -1 : 1;
            const scaled = this.scalePlayerDamage(dmg, enemy);
            const killed = enemy.takeDamage(
              scaled,
              pullDir * (isFinal ? 220 : 90),
              isFinal ? -180 : -40,
              this.particles,
              this.audio,
              isFinal
            );
            if (!killed) {
              enemy.applyElementalMark('mirage', 1, this.particles, {
                primary: mirageVfx.particlePrimary,
                secondary: mirageVfx.particleSecondary,
              });
            }
            this.registerPlayerHit(scaled, isFinal ? 26 : 10, isFinal, killed, enemy);
          }
        }
      }
      if (!rift.active) {
        this.mirrorRifts.splice(i, 1);
      }
    }

    // Inter-Rift Void-Mirror Beams during Domain Expansion
    if (domainActive && this.mirrorRifts.length >= 2) {
      this.domainBeamTickTimer -= worldDt;
      if (this.domainBeamTickTimer <= 0) {
        this.domainBeamTickTimer = 0.28;
        for (let i = 0; i < this.mirrorRifts.length - 1; i++) {
          const a = this.mirrorRifts[i];
          const b = this.mirrorRifts[i + 1];
          if (!a.active || !b.active) continue;
          const beamBaseDmg = Math.round(14 * Math.max(a.getDamageMultiplier(), b.getDamageMultiplier()));
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying) continue;
            const d = this.pointToSegmentDistance(enemy.x, enemy.y - 48, a.x, a.y, b.x, b.y);
            if (d <= 48) {
              const beamDmg = this.scalePlayerDamage(beamBaseDmg, enemy);
              const dir: 1 | -1 = enemy.x >= this.player.x ? 1 : -1;
              const killed = enemy.takeDamage(beamDmg, dir * 60, -25, this.particles, this.audio, false);
              if (!killed) {
                enemy.applyElementalMark('mirage', 1, this.particles, {
                  primary: mirageVfx.particlePrimary,
                  secondary: mirageVfx.particleSecondary,
                });
              }
              this.particles.emitShards(enemy.x, enemy.y - 50, 4, '#f43f5e', 170, 0.75);
              this.registerPlayerHit(beamDmg, 8, false, killed, enemy);
            }
          }
        }
      }
    }

    if (this.player.pendingBoomerangThrow) {
      const b = this.player.pendingBoomerangThrow;
      this.player.pendingBoomerangThrow = null;
      this.valkyrieBoomerangs.push(
        new ValkyrieBoomerang(b.x, b.y, b.dir, b.damage, b.primaryColor, b.secondaryColor)
      );
    }
    for (let i = this.valkyrieBoomerangs.length - 1; i >= 0; i--) {
      const bm = this.valkyrieBoomerangs[i];
      bm.update(dt, this.player.x, this.player.y);
      if (!bm.active) {
        this.valkyrieBoomerangs.splice(i, 1);
        continue;
      }
      const vfx = getSkinVfxProfile('valkyrie', this.skinId);
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.dying) continue;
        const dx = bm.x - enemy.x;
        const dy = Math.abs(enemy.y - 52 - bm.y);
        if (Math.abs(dx) < 135 && dy < 95 && !enemy.isBoss()) {
          enemy.x = clamp(enemy.x + Math.sign(dx) * 190 * dt, 45, ARENA_WIDTH - 45);
        }
        if (Math.abs(dx) < 58 && dy < 72 && !bm.hitCooldowns.has(enemy.id)) {
          bm.hitCooldowns.set(enemy.id, 0.26);
          const scaled = this.scalePlayerDamage(bm.damage, enemy);
          const killed = enemy.takeDamage(
            scaled,
            (bm.returning ? -bm.dir : bm.dir) * 210,
            -120,
            this.particles,
            this.audio,
            true
          );
          this.applyBossPostureHit(enemy, 14);
          if (!killed) {
            enemy.applyElementalMark('valkyrie', 1, this.particles, {
              primary: vfx.particlePrimary,
              secondary: vfx.detonationColor,
            });
          }
          this.particles.emitSlashBeam(enemy.x, enemy.y - 52, (Math.random() - 0.5) * 1.4, 175, bm.primaryColor, 9);
          this.registerPlayerHit(scaled, 24, true, killed, enemy);
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.032);
        }
      }
    }

    // Update Magma Pillars (Kagura [U] Skill; damage === 0 pillars are visual Vulcan eruptions)
    for (let i = this.magmaPillars.length - 1; i >= 0; i--) {
      const mp = this.magmaPillars[i];
      const erupted = mp.update(dt, this.particles);
      if (erupted) {
        this.audio.playCryoShatter();
        this.camera.addShake(0.32, 0, -1);
      }
      if (mp.erupted && mp.damage > 0) {
        const vfx = getSkinVfxProfile('kagura', this.skinId);
        const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying || mp.hitEnemyIds.has(enemy.id)) continue;
          if (Math.abs(enemy.x - mp.x) < 66 && enemy.y > GROUND_Y - 195) {
            mp.hitEnemyIds.add(enemy.id);
            const scaled = this.scalePlayerDamage(mp.damage, enemy);
            const killed = enemy.takeDamage(
              scaled,
              mp.dir * 240,
              -420,
              this.particles,
              this.audio,
              true
            );
            this.applyBossPostureHit(enemy, 18);
            enemy.applyElementalMark('kagura', 2, this.particles, markTint);
            this.particles.emitText(enemy.x, enemy.y - 100, 'VIÊM ẤN!', vfx.hitTextColor, 20);
            this.registerPlayerHit(scaled, 30, true, killed, enemy);
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
          }
        }
      }
      if (!mp.active) {
        this.magmaPillars.splice(i, 1);
      }
    }

    // Update Ice Walls & Crush Collision
    for (let i = this.iceWalls.length - 1; i >= 0; i--) {
      const wall = this.iceWalls[i];
      wall.update(dt, this.particles);
      if (wall.active && wall.launched) {
        const vfx = getSkinVfxProfile('kuro', this.skinId);
        const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying || wall.hitEnemyIds.has(enemy.id)) continue;
          const hitRadius = wall.overcharged ? 86 : 64;
          if (Math.abs(enemy.x - wall.x) < hitRadius && Math.abs(enemy.y - wall.y) < 115) {
            wall.hitEnemyIds.add(enemy.id);
            const baseCrush = enemy.isBoss() ? 78 : 130;
            const rawCrush = wall.overcharged ? Math.round(baseCrush * 1.45) : baseCrush;
            const crushDmg = this.scalePlayerDamage(rawCrush, enemy);
            const killed = enemy.takeDamage(
              crushDmg,
              wall.dir * (wall.overcharged ? 620 : 520),
              -310,
              this.particles,
              this.audio,
              true
            );
            this.applyBossPostureHit(enemy, wall.overcharged ? 36 : 24);
            enemy.applyElementalMark('kuro', wall.overcharged ? 3 : 2, this.particles, markTint);
            if (wall.overcharged) {
              enemy.applyStun(enemy.isBoss() ? 1.1 : 1.7, this.particles);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.35 * wall.dir, 260, vfx.slashSecondary, 14);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.35 * wall.dir, 240, vfx.slashPrimary, 12);
              this.triggerImpactFrame(enemy.x, enemy.y - 52, vfx.impactRingColor, 0.055);
              this.detonateElementalMarks('kuro', enemy.x, enemy.y - 52, 180);
            }
            const overchargeCrushText =
              vfx.iceWallTheme === 'seraph'
                ? 'THÁNH KIẾM PHÁ!'
                : vfx.iceWallTheme === 'void'
                  ? 'HƯ KHÔNG PHÁ!'
                  : 'BĂNG HUYẾT PHÁ!';
            this.particles.emitText(
              enemy.x,
              enemy.y - 98,
              wall.overcharged ? overchargeCrushText : 'CRUSHED!',
              wall.overcharged ? vfx.hitTextColor : vfx.slashPrimary,
              26
            );
            if (vfx.iceWallTheme === 'ice') {
              this.particles.emitIceShards(enemy.x, enemy.y - 50, wall.overcharged ? 24 : 14, wall.dir);
            } else {
              emitSkinAccentParticle(
                this.particles,
                vfx.finisherParticleKind,
                enemy.x,
                enemy.y - 50,
                wall.overcharged ? 20 : 12,
                vfx.particleSecondary,
                wall.dir
              );
            }
            this.registerPlayerHit(crushDmg, wall.overcharged ? 52 : 38, true, killed, enemy);
            this.hitstopTimer = Math.max(this.hitstopTimer, wall.overcharged ? 0.068 : 0.055);
            this.camera.addShake(wall.overcharged ? 0.62 : 0.5, wall.dir, 0);
          }
        }
      }
      if (!wall.active) {
        this.iceWalls.splice(i, 1);
      }
    }

    // Update Player Melee Hitbox vs Enemies & Soul Crystals
    if (this.player.activeHitbox) {
      const hb = this.player.activeHitbox;
      const chId = this.player.character.id;
      const vfx = getSkinVfxProfile(chId, this.skinId);
      const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
      const accentCol = this.player.awakened ? vfx.slashSecondary : vfx.slashPrimary;

      for (const c of this.soulCrystals) {
        if (!c.active || c.lastHitboxId === hb.id) continue;
        if (Math.abs(c.x - hb.x) < hb.width * 0.5 + 28 && Math.abs(c.y - 52 - hb.y) < hb.height * 0.5 + 48) {
          c.lastHitboxId = hb.id;
          this.damageSoulCrystal(c, hb.damage);
        }
      }

      for (const rift of this.mirrorRifts) {
        if (!rift.active || rift.lastHitboxId === hb.id) continue;
        if (
          Math.abs(rift.x - hb.x) < hb.width * 0.5 + 36 &&
          Math.abs(rift.y - hb.y) < hb.height * 0.5 + 58
        ) {
          this.shatterMirrorRiftByHit(rift, hb.id);
        }
      }

      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.dying || hb.hitIds.has(enemy.id)) continue;
        const dx = Math.abs(enemy.x - hb.x);
        const dy = Math.abs(enemy.y - 48 - hb.y);
        if (dx < hb.width * 0.5 + 24 && dy < hb.height * 0.5 + 42) {
          hb.hitIds.add(enemy.id);
          // Check Haiku / Aegis Guard frontal shield!
          if (
            isAttackBlockedByShield(
              enemy.x,
              enemy.facing,
              this.player.x,
              enemy.isShieldActive(),
              hb.unblockable
            )
          ) {
            if (hb.heavy) {
              enemy.breakShield(this.particles);
              this.audio.playCryoShatter();
            } else {
              this.applyBossPostureHit(enemy, 7);
              this.audio.playShieldClang();
              this.particles.emitSparks(enemy.x + enemy.facing * 24, enemy.y - 52, 12, '#38bdf8', 420);
              this.particles.emitText(enemy.x, enemy.y - 102, 'GUARD!', '#38bdf8', 20);
              this.hitstopTimer = Math.max(this.hitstopTimer, 0.032);
              continue;
            }
          }

          const finalDmg = this.scalePlayerDamage(hb.damage, enemy);
          const killed = enemy.takeDamage(
            finalDmg,
            hb.knockX,
            hb.knockY,
            this.particles,
            this.audio,
            hb.heavy
          );
          this.applyBossPostureHit(enemy, hb.isLinkArt ? 22 : hb.heavy ? 12 : 4.5);
          this.recordTimeStopDamage(enemy.id, finalDmg);

          if (this.arenaBuffKind === 'crimson_might' && this.arenaBuffTimer > 0) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
          }

          if (hb.heavy || hb.isLinkArt) {
            if (chId === 'mirage') {
              this.particles.emitShards(enemy.x, enemy.y - 54, hb.isLinkArt ? 14 : 9, accentCol, 240, 1.0);
              this.particles.emitShockwave(enemy.x, enemy.y - 54, vfx.impactRingColor, hb.isLinkArt ? 88 : 62, 0.2);
            } else {
              const ang = (Math.random() - 0.5) * 0.9 - 0.25 * this.player.facing;
              this.particles.emitSlashBeam(enemy.x, enemy.y - 54, ang, hb.isLinkArt ? 260 : 195, accentCol, hb.isLinkArt ? 13 : 9);
            }
          }
          emitSkinAccentParticle(
            this.particles,
            hb.heavy || hb.isLinkArt ? vfx.finisherParticleKind : vfx.swingParticleKind,
            enemy.x,
            enemy.y - 52,
            hb.heavy ? 7 : 3,
            vfx.particlePrimary,
            this.player.facing
          );
          if (chId === 'mactien' && this.skinId === 'xuan_feng_sage') {
            const hanziPool = ['春', '風', '文', '雅', '靜', '禮'];
            const hanziColors = this.player.awakened
              ? ['#fde68a', '#f0fdfa', '#5eead4']
              : ['#f0fdfa', '#5eead4'];
            const glyphIdx = Math.abs(hb.id + enemy.id);
            this.particles.emitText(
              enemy.x + ((enemy.id % 3) - 1) * 14,
              enemy.y - (this.player.awakened ? 86 : 76),
              hanziPool[glyphIdx % hanziPool.length],
              hanziColors[glyphIdx % hanziColors.length],
              this.player.awakened ? 21 : 17
            );
            if (this.player.awakened) {
              this.particles.emitSlashBeam(
                enemy.x,
                enemy.y - 54,
                -0.62 * this.player.facing,
                170,
                '#5eead4',
                7
              );
              this.particles.emitPetals(enemy.x, enemy.y - 52, 3, '#fda4af', 130, 0.85);
            }
          }

          if (hb.applyMarkStacks && hb.applyMarkStacks > 0 && !killed) {
            enemy.applyElementalMark(chId, hb.applyMarkStacks, this.particles, markTint);
          }

          this.registerPlayerHit(finalDmg, hb.isLinkArt ? 42 : hb.heavy ? 26 : 16, hb.heavy, killed, enemy);

          // New Blessing & Crystal Synergies: Chain Lightning, Meteor Slam & Blade Storm!
          const hasChainArc =
            ((hb.heavy || hb.isLinkArt) && mods.chainLightningCount > 0) ||
            (this.arenaBuffKind === 'thunder_overdrive' && this.arenaBuffTimer > 0 && (hb.heavy || this.combo % 3 === 0));
          if (hasChainArc) {
            let chained = 0;
            const arcBase = 16 + mods.chainLightningCount * 11;
            for (const other of this.enemies) {
              if (other === enemy || !other.alive || other.dying) continue;
              if (Math.abs(other.x - enemy.x) <= 300) {
                const arcDmg = this.scalePlayerDamage(arcBase, other);
                const arcKilled = other.takeDamage(
                  arcDmg,
                  (other.x >= enemy.x ? 1 : -1) * 140,
                  -90,
                  this.particles,
                  this.audio,
                  false
                );
                this.particles.emitChainArc(enemy.x, enemy.y - 52, other.x, other.y - 52, '#38bdf8', 5);
                this.registerPlayerHit(arcDmg, 14, false, arcKilled, other);
                chained++;
                if (chained >= 2) break;
              }
            }
          }

          if (hb.heavy && this.player.comboStep === 6) {
            if (mods.meteorSlamCount > 0) {
              this.magmaPillars.push(
                new MagmaPillar(
                  clamp(enemy.x, 70, ARENA_WIDTH - 70),
                  this.player.facing,
                  0.06,
                  26 + mods.meteorSlamCount * 14,
                  vfx.pillarTheme
                )
              );
            }
            if (mods.bladeStormCount > 0 && this.styleScore >= 115) {
              this.projectiles.push(
                new Projectile({
                  x: this.player.x + this.player.facing * 42,
                  y: this.player.y - 54,
                  vx: this.player.facing * 1080,
                  vy: 0,
                  radius: 34,
                  damage: 26 + mods.bladeStormCount * 12,
                  kind: 'sword_wave',
                  fromPlayer: true,
                  color: vfx.slashPrimary,
                  secondaryColor: vfx.slashSecondary,
                  rimColor: vfx.slashRim,
                  theme: vfx.projectileTheme,
                  maxLife: 0.9,
                })
              );
            }
          }

          if (hb.detonateMark && enemy.markKind === chId && enemy.markStacks > 0) {
            this.detonateElementalMarks(chId, enemy.x, enemy.y - 52, chId === 'raijin' ? 460 : 210);
          } else if (hb.isLinkArt || (hb.heavy && this.player.comboStep === 6) || killed) {
            this.triggerImpactFrame(enemy.x, enemy.y - 54, vfx.impactRingColor, hb.isLinkArt ? 0.05 : 0.038);
          }

          const isFinisher = hb.isLinkArt || (hb.heavy && this.player.comboStep === 6) || killed;
          if (isFinisher) {
            this.particles.emitCrossSlash(
              enemy.x,
              enemy.y - 54,
              this.player.facing > 0 ? -0.28 : Math.PI + 0.28,
              hb.isLinkArt ? 420 : 340,
              vfx.slashPrimary,
              hb.isLinkArt ? 16 : 13
            );
            this.camera.triggerActionZoom('finisher');
          } else if (hb.heavy) {
            this.camera.triggerActionZoom('heavy');
          }

          this.hitstopTimer = Math.max(this.hitstopTimer, hb.isLinkArt ? 0.1 : hb.heavy ? 0.075 : 0.055);
          this.camera.addDirectionalShake(
            this.player.facing,
            hb.knockY < -100 ? -0.45 : 0,
            hb.isLinkArt ? 0.5 : hb.heavy ? 0.36 : 0.16
          );
        }
      }
    }

    // Update Stage Environmental Hazards (frozen during Time Stop!)
    if (!timeStopped) {
      for (let i = this.stageHazards.length - 1; i >= 0; i--) {
        const hz = this.stageHazards[i];
        // Void Rift gently pulls nearby characters inward during telegraph!
        if (hz.kind === 'void_rift' && !hz.erupted) {
          const pdx = hz.x - this.player.x;
          if (Math.abs(pdx) < 220 && this.player.dashTimer <= 0) {
            this.player.x = clamp(this.player.x + Math.sign(pdx) * 85 * worldDt, 45, ARENA_WIDTH - 45);
          }
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying || enemy.isBoss()) continue;
            const edx = hz.x - enemy.x;
            if (Math.abs(edx) < 240) {
              enemy.x = clamp(enemy.x + Math.sign(edx) * 140 * worldDt, 45, ARENA_WIDTH - 45);
            }
          }
        }

        const erupted = hz.update(worldDt, this.particles);
        if (erupted) {
          this.audio.playCryoShatter();
          this.camera.addShake(0.28, 0, 1);
        }
        if (hz.erupted) {
          if (!hz.hitPlayer && Math.abs(this.player.x - hz.x) < hz.radius * 0.78 && this.player.y > GROUND_Y - 150) {
            hz.hitPlayer = true;
            if (this.player.dashTimer > 0 && this.witchTimeCooldown <= 0) {
              this.onPerfectDodge(this.player.x, this.player.y - 52);
            } else if (!this.player.isInvulnerable()) {
              const dir: 1 | -1 = this.player.x >= hz.x ? 1 : -1;
              this.applyEnemyDamageToPlayer(20, dir, false, null);
            }
          }
          // Environmental Damage to Enemies!
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying || hz.hitEnemyIds.has(enemy.id)) continue;
            if (Math.abs(enemy.x - hz.x) < hz.radius * 0.9 && enemy.y > GROUND_Y - 170) {
              hz.hitEnemyIds.add(enemy.id);
              const envDmg = enemy.isBoss() ? 38 : 56;
              const killed = enemy.takeDamage(
                envDmg,
                (enemy.x >= hz.x ? 1 : -1) * 280,
                -260,
                this.particles,
                this.audio,
                true
              );
              this.applyBossPostureHit(enemy, 20);
              if (!killed && !enemy.isBoss()) {
                enemy.applyStun(1.2, this.particles);
              }
              this.particles.emitText(enemy.x, enemy.y - 108, 'BẪY MÔI TRƯỜNG!', '#fde047', 22);
              this.registerPlayerHit(envDmg, 28, true, killed, enemy);
            }
          }
        }
        if (!hz.active) {
          this.stageHazards.splice(i, 1);
        }
      }
    }

    // Update Magic Circles (frozen during Time Stop!)
    if (!timeStopped) {
      for (let i = this.magicCircles.length - 1; i >= 0; i--) {
        const mc = this.magicCircles[i];
        const erupted = mc.update(worldDt, this.particles);
        if (erupted) {
          this.audio.playLaser();
          this.camera.addShake(0.32, 0, 1);
        }
        if (mc.erupted && !mc.hitPlayer && Math.abs(this.player.x - mc.x) < mc.radius * 0.78 && this.player.y > GROUND_Y - 140) {
          mc.hitPlayer = true;
          if (this.player.dashTimer > 0 && this.witchTimeCooldown <= 0) {
            this.onPerfectDodge(this.player.x, this.player.y - 52);
          } else {
            const dir: 1 | -1 = this.player.x >= mc.x ? 1 : -1;
            this.applyEnemyDamageToPlayer(24, dir, false, null);
          }
        }
        if (!mc.active) {
          this.magicCircles.splice(i, 1);
        }
      }
    }

    // Update Projectiles (enemy projectiles freeze midair during Time Stop!)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(proj.fromPlayer ? dt : enemyWorldDt);

      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.fromPlayer) {
        for (const c of this.soulCrystals) {
          if (!c.active || proj.hitEnemyIds.has(-c.id)) continue;
          if (Math.abs(c.x - proj.x) < proj.radius + 24 && Math.abs(c.y - 54 - proj.y) < proj.radius + 46) {
            proj.hitEnemyIds.add(-c.id);
            this.damageSoulCrystal(c, proj.damage);
          }
        }

        const playerVfx = getSkinVfxProfile(this.characterId, this.skinId);
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying || proj.hitEnemyIds.has(enemy.id)) continue;
          if (Math.abs(enemy.x - proj.x) < proj.radius + 26 && Math.abs(enemy.y - 52 - proj.y) < proj.radius + 46) {
            proj.hitEnemyIds.add(enemy.id);
            const dir: 1 | -1 = (proj.vx || 1) >= 0 ? 1 : -1;
            const scaledDmg = this.scalePlayerDamage(proj.damage, enemy);
            const isBambooSlip = proj.kind === 'bamboo_blade';
            const isJadeSealWave = proj.kind === 'jade_seal_wave';
            const killed = enemy.takeDamage(
              scaledDmg,
              isBambooSlip ? dir * 185 : isJadeSealWave ? dir * 360 : dir * 380,
              isBambooSlip ? -85 : isJadeSealWave ? -115 : -150,
              this.particles,
              this.audio,
              !isBambooSlip
            );
            this.applyBossPostureHit(enemy, proj.reflected ? 34 : isBambooSlip ? 6 : 12);
            this.recordTimeStopDamage(enemy.id, scaledDmg);

            if (proj.kind === 'kunai' || proj.kind === 'void_crescent') {
              const kv = getSkinVfxProfile('zero', this.skinId);
              enemy.applyElementalMark('zero', 1, this.particles, {
                primary: kv.particlePrimary,
                secondary: kv.detonationColor,
              });
            } else if (proj.kind === 'volt_lance') {
              const rv = getSkinVfxProfile('raijin', this.skinId);
              enemy.applyElementalMark('raijin', 1, this.particles, {
                primary: rv.particlePrimary,
                secondary: rv.detonationColor,
              });
            } else if (proj.kind === 'fire_wave') {
              if (enemy.markKind === 'kagura' && enemy.markStacks >= 2) {
                this.detonateElementalMarks('kagura', enemy.x, enemy.y - 52, 220);
              } else {
                const fv = getSkinVfxProfile('kagura', this.skinId);
                enemy.applyElementalMark('kagura', 1, this.particles, {
                  primary: fv.particlePrimary,
                  secondary: fv.detonationColor,
                });
              }
            } else if (proj.kind === 'sword_wave') {
              const sv = getSkinVfxProfile('kuro', this.skinId);
              enemy.applyElementalMark('kuro', 1, this.particles, {
                primary: sv.particlePrimary,
                secondary: sv.detonationColor,
              });
            } else if (proj.kind === 'mirror_shard') {
              const mv = getSkinVfxProfile('mirage', this.skinId);
              enemy.applyElementalMark('mirage', 1, this.particles, {
                primary: mv.particlePrimary,
                secondary: mv.detonationColor,
              });
            } else if (isBambooSlip) {
              enemy.applyElementalMark('mactien', 1, this.particles, {
                primary: '#5eead4',
                secondary: '#fda4af',
              });
            }
            if (this.characterId === 'mirage' || proj.kind === 'mirror_shard') {
              this.particles.emitShards(enemy.x, enemy.y - 52, 8, proj.color, 210, 0.9);
            } else if (isBambooSlip || isJadeSealWave) {
              const slashAng = isBambooSlip ? Math.atan2(proj.vy, proj.vx) : -0.35 * dir;
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, slashAng, 175, '#5eead4', 8);
              this.particles.emitPetals(enemy.x, enemy.y - 52, 4, '#fda4af', 145, 0.85);
              if (this.player.awakened) {
                this.particles.emitStars(enemy.x, enemy.y - 54, 2, '#fde68a', 125, 0.82);
              }
              if (this.characterId === 'mactien' && this.skinId === 'xuan_feng_sage') {
                const hanziPool = ['春', '風', '文', '雅', '靜', '禮'];
                const hanziColors = this.player.awakened
                  ? ['#fde68a', '#f0fdfa', '#5eead4']
                  : ['#f0fdfa', '#5eead4'];
                const glyphIdx = Math.abs(enemy.id + Math.round(proj.x));
                this.particles.emitText(
                  enemy.x + ((enemy.id % 3) - 1) * 12,
                  enemy.y - 84,
                  hanziPool[glyphIdx % hanziPool.length],
                  hanziColors[glyphIdx % hanziColors.length],
                  this.player.awakened ? 21 : 18
                );
              }
            } else {
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, Math.atan2(proj.vy, proj.vx), 185, proj.color, 9);
            }
            emitSkinAccentParticle(
              this.particles,
              playerVfx.swingParticleKind,
              enemy.x,
              enemy.y - 52,
              4,
              playerVfx.particlePrimary,
              dir
            );
            this.registerPlayerHit(scaledDmg, isBambooSlip ? 18 : 30, !isBambooSlip, killed, enemy);
            this.hitstopTimer = Math.max(this.hitstopTimer, isBambooSlip ? 0.025 : 0.042);
            this.camera.addShake(isBambooSlip ? 0.16 : 0.35, dir, 0);
            if (
              proj.kind !== 'sword_wave' &&
              proj.kind !== 'volt_lance' &&
              proj.kind !== 'fire_wave' &&
              proj.kind !== 'void_crescent' &&
              proj.kind !== 'mirror_shard' &&
              proj.kind !== 'bamboo_blade' &&
              proj.kind !== 'jade_seal_wave'
            ) {
              proj.active = false;
              break;
            }
          }
        }
      } else {
        if (timeStopped) {
          continue;
        }
        let blockedByIce = false;
        for (const wall of this.iceWalls) {
          if (
            wall.active &&
            Math.abs(proj.x - wall.x) < wall.width * 0.5 + proj.radius &&
            proj.y > wall.y - wall.height &&
            proj.y < wall.y
          ) {
            wall.takeBulletDamage(proj.damage, this.particles);
            this.audio.playShieldClang();
            proj.active = false;
            blockedByIce = true;
            break;
          }
        }
        if (blockedByIce) continue;

        if (
          Math.abs(proj.x - this.player.x) < proj.radius + 32 &&
          Math.abs(proj.y - (this.player.y - 52)) < proj.radius + 44
        ) {
          if (this.player.isParrying()) {
            const reflected = computeReflectedProjectile(proj.vx, proj.vy, proj.damage);
            const vfx = getSkinVfxProfile(this.characterId, this.skinId);
            proj.vx = reflected.vx;
            proj.vy = reflected.vy;
            proj.damage = reflected.damage;
            proj.fromPlayer = true;
            proj.reflected = true;
            proj.rimColor = vfx.impactRingColor;
            proj.life = 0;
            this.onPerfectParry(proj.x, proj.y, null);
          } else if (this.player.dashTimer > 0 && this.witchTimeCooldown <= 0) {
            this.onPerfectDodge(this.player.x, this.player.y - 52);
          } else if (!this.player.isInvulnerable()) {
            const dir: 1 | -1 = proj.vx >= 0 ? 1 : -1;
            this.applyEnemyDamageToPlayer(proj.damage, dir, false, null);
            proj.active = false;
          }
        }
      }
    }

    // Sync activeAttackTokens from live enemies so interrupted attacks never leak tokens
    this.activeAttackTokens = this.enemies.reduce(
      (acc, e) => acc + (e.alive && !e.dying && e.hasToken ? 1 : 0),
      0
    );

    // Update Enemies & Bosses (with Witch Time worldDt & full freeze during Time Stop!)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy instanceof Boss) {
        enemy.updateBoss({
          dt: enemyWorldDt,
          playerX: this.player.x,
          playerY: this.player.y,
          playerAttacking: this.player.attackTimer > 0,
          playerDashing: this.player.dashTimer > 0,
          projectiles: this.projectiles,
          magicCircles: this.magicCircles,
          magmaPillars: this.magmaPillars,
          particles: this.particles,
          audio: this.audio,
          onMeleeHit: (hit) => this.resolveEnemyMeleeHit(hit),
          onTriggerFableAwakening: () => this.triggerFableAwakeningEvent(),
          onPhaseTwoTransition: (b) => {
            this.camera.pulseZoom(1.2, 0.45);
            this.camera.addShake(0.55, 0, -1);
            this.bg.triggerCrimsonFlash(0.6);
            this.spawnLootOrbsAt(b.x, b.y, 1, true);
          },
        });
      } else if (!timeStopped) {
        enemy.update({
          dt: worldDt,
          playerX: this.player.x,
          playerY: this.player.y,
          playerAttacking: this.player.attackTimer > 0,
          playerDashing: this.player.dashTimer > 0,
          arenaLeft: this.mode === 'solo1v1' ? SOLO_ARENA_STAGE.leftWall : undefined,
          arenaRight: this.mode === 'solo1v1' ? SOLO_ARENA_STAGE.rightWall : undefined,
          requestToken: () => {
            if (this.activeAttackTokens >= this.maxAttackTokens) return false;
            this.activeAttackTokens++;
            return true;
          },
          releaseToken: () => {
            this.activeAttackTokens = Math.max(0, this.activeAttackTokens - 1);
          },
          projectiles: this.projectiles,
          magicCircles: this.magicCircles,
          particles: this.particles,
          audio: this.audio,
          onMeleeHit: (hit) => this.resolveEnemyMeleeHit(hit),
        });
      }

      if (!enemy.alive) {
        if (enemy.hasToken) {
          this.activeAttackTokens = Math.max(0, this.activeAttackTokens - 1);
        }
        if (enemy === this.activeBoss) {
          this.spawnLootOrbsAt(enemy.x, enemy.y, 2, true);
          this.activeBoss = null;
          this.bossesDefeated++;
          this.audio.setBgmIntensity(this.player.awakened ? 2 : 1);
        } else if (this.mode !== 'training' && (enemy.isElite || Math.random() < 0.25)) {
          this.spawnLootOrbsAt(enemy.x, enemy.y, 1, false);
        }
        this.enemies.splice(i, 1);
      }
    }

    // Solo 1v1 Arena corner walls (no falling off, tight corner-combo bounds)
    if (this.mode === 'solo1v1') {
      this.player.x = clamp(this.player.x, SOLO_ARENA_STAGE.leftWall, SOLO_ARENA_STAGE.rightWall);
      if (this.soloOpponent && this.soloOpponent.alive) {
        this.soloOpponent.x = clamp(
          this.soloOpponent.x,
          SOLO_ARENA_STAGE.leftWall,
          SOLO_ARENA_STAGE.rightWall
        );
      }
    }

    // Wave & Stage Progression
    if (this.mode === 'solo1v1') {
      // Handled by Solo1v1Controller
    } else if (this.mode === 'training' && this.enemies.length === 0) {
      this.nextWaveDelay += dt;
      if (this.nextWaveDelay >= 1.4) {
        this.nextWaveDelay = 0;
        this.spawnTrainingBots();
      }
    } else if (this.mode !== 'training' && !this.blessingChoices) {
      const anyAlive = this.enemies.length > 0 || this.pendingSpawns.length > 0;
      if (!anyAlive) {
        if (this.nextWaveDelay <= 0) {
          this.nextWaveDelay = 1.35;
        } else {
          this.nextWaveDelay -= dt;
          if (this.nextWaveDelay <= 0) {
            this.advanceStageOrWave();
          }
        }
      }
    }

    // Dynamic Camera tracking
    const desiredLead = clamp(this.player.facing * 55 + this.player.vx * 0.12, -110, 110);
    this.camLookahead += (desiredLead - this.camLookahead) * (1 - Math.exp(-3.2 * dt));
    if (this.activeBoss && !this.activeBoss.dying) {
      this.camera.trackCombatFocus(
        this.player.x,
        this.player.y,
        this.activeBoss.x,
        this.activeBoss.y,
        this.camLookahead
      );
    } else {
      let nearestEnemy: Enemy | null = null;
      let nearestDist = 640;
      for (const e of this.enemies) {
        if (!e.alive || e.dying) continue;
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = e;
        }
      }
      this.camera.trackCombatFocus(
        this.player.x,
        this.player.y,
        nearestEnemy ? nearestEnemy.x : null,
        nearestEnemy ? nearestEnemy.y : null,
        this.camLookahead
      );
    }

    if (this.mode !== 'solo1v1' && this.player.hp <= 0 && !this.pendingOutcome) {
      if (this.phoenixRevivesUsed < mods.phoenixReviveCount) {
        this.phoenixRevivesUsed++;
        this.player.hp = Math.round(this.player.maxHp * 0.5);
        this.player.trailHp = this.player.hp;
        this.player.invulnTimer = 2.4;
        this.player.hurtTimer = 0;
        this.audio.playAwaken();
        this.bg.triggerCrimsonFlash(0.85);
        this.camera.pulseZoom(1.2, 0.36);
        this.camera.addShake(0.55, 0, -1);
        this.particles.emitShockwave(this.player.x, this.player.y - 52, '#f97316', 180, 0.42);
        this.particles.emitEmbers(this.player.x, this.player.y - 56, 32, '#fde047');
        this.particles.emitText(this.player.x, this.player.y - 130, '🔥 NIẾT BÀN TÁI SINH · +50% HP!', '#fde047', 26);
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          if (Math.abs(enemy.x - this.player.x) < 260) {
            enemy.applyStun(enemy.isBoss() ? 1.0 : 1.8, this.particles);
          }
        }
      } else {
        this.triggerOutcome('gameover');
      }
    }

    this.input.update(dt);
    this.syncHudThrottled(dt);
  }

  private advanceStageOrWave(): void {
    if (this.mode === 'boss_rush') {
      if (this.bossRushIndex >= BOSS_ORDER.length) {
        this.triggerOutcome('victory');
        return;
      }
      if (this.bossRushIndex > 0 && this.bossRushIndex % 2 === 0) {
        const nextIdx = this.bossRushIndex;
        this.bossRushIndex++;
        this.openBlessingDraft(() => {
          this.bossRushIndex = nextIdx;
          this.setupBossRushWave();
          this.bossRushIndex = nextIdx + 1;
        });
      } else {
        this.setupBossRushWave();
        this.bossRushIndex++;
      }
      return;
    }

    if (this.mode === 'endless') {
      if (this.endlessWave % 3 === 0) {
        this.openBlessingDraft(() => {
          this.endlessWave++;
          this.setupEndlessWave(this.endlessWave);
        });
      } else {
        this.endlessWave++;
        this.setupEndlessWave(this.endlessWave);
      }
      return;
    }

    // 12-Chapter Story Campaign Progression
    const stage = CAMPAIGN_STAGES[this.currentStageIndex] ?? CAMPAIGN_STAGES[0];
    if (this.stageSubWave < stage.waves.length) {
      this.stageSubWave++;
      this.setupCampaignSubWave();
    } else {
      // Chapter Boss Defeated!
      this.markStageCleared(this.currentStageIndex);
      if (this.currentStageIndex >= CAMPAIGN_STAGES.length - 1) {
        this.triggerOutcome('victory');
      } else {
        this.openBlessingDraft(() => {
          this.currentStageIndex++;
          this.stageSubWave = 0;
          this.setupCampaignSubWave();
        });
      }
    }
  }

  private onPerfectDodge(fxX: number, fxY: number): void {
    const mods = computeBlessingModifiers(this.blessingStacks);
    this.witchTimeTimer = 0.72 + mods.witchTimeBonusSec;
    this.witchTimeCooldown = 1.65;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 4.0;
    this.comboPulse = 1;
    this.styleScore = Math.min(620, this.styleScore + 55);
    this.score += 180;
    if (this.waveBountyKind === 'counter' && !this.waveBountyDone) {
      this.waveBountyProgress++;
      if (this.waveBountyProgress >= this.waveBountyTarget) {
        this.completeWaveBounty();
      }
    }

    const training = this.mode === 'training';
    this.player.addRage(Math.round(14 * mods.meterGainMult), training);
    this.player.addAwakening(Math.round(11 * mods.meterGainMult), training);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown * 0.45);
    this.player.skillLinkTimer = Math.max(this.player.skillLinkTimer, 1.0);

    this.audio.playDash();
    this.camera.pulseZoom(1.12, 0.25);
    this.particles.emitShockwave(fxX, fxY, '#c084fc', 115, 0.3);
    this.particles.emitSparks(fxX, fxY, 18, '#38bdf8', 520);
    this.particles.emitText(this.player.x, this.player.y - 114, 'NÉ HOÀN HẢO · NGƯNG ĐỌNG!', '#e879f9', 24);
  }

  private resolveEnemyMeleeHit(hit: EnemyAttackHit): void {
    const dx = Math.abs(this.player.x - hit.x);
    const dy = Math.abs(this.player.y - 48 - hit.y);
    if (dx > hit.width * 0.5 + 24 || dy > hit.height * 0.5 + 42) return;

    if (hit.parryable && this.player.isParrying()) {
      this.onPerfectParry(this.player.x + this.player.facing * 22, this.player.y - 54, hit.source);
      hit.source.attackDealt = true;
      return;
    }

    if (this.player.dashTimer > 0 && this.witchTimeCooldown <= 0) {
      this.onPerfectDodge(this.player.x, this.player.y - 52);
      hit.source.attackDealt = true;
      return;
    }

    this.applyEnemyDamageToPlayer(hit.damage, hit.dir, false, hit.source);
  }

  private applyEnemyDamageToPlayer(
    damage: number,
    dir: 1 | -1,
    _unblockable: boolean,
    _source: Enemy | null
  ): void {
    const mods = computeBlessingModifiers(this.blessingStacks);
    const aegisMult = this.arenaBuffKind === 'aegis_vitality' && this.arenaBuffTimer > 0 ? 0.65 : 1;
    const mitigated = Math.max(1, Math.round(damage * mods.damageTakenMult * aegisMult));
    const taken = this.player.takeDamage(
      mitigated,
      dir,
      this.audio,
      this.particles,
      this.camera,
      this.mode === 'training'
    );
    if (taken > 0) {
      this.damageTaken += taken;
      this.combo = 0;
      this.styleScore = Math.max(0, this.styleScore - 70);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.048);
    }
  }

  private onPerfectParry(fxX: number, fxY: number, attacker: Enemy | null): void {
    const mods = computeBlessingModifiers(this.blessingStacks);
    const vfx = getSkinVfxProfile(this.characterId, this.skinId);
    const markTint = { primary: vfx.particlePrimary, secondary: vfx.detonationColor };
    this.perfectParries++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 4.2;
    this.comboPulse = 1;
    this.styleScore = Math.min(620, this.styleScore + 95);
    this.score += 250;
    if (this.waveBountyKind === 'counter' && !this.waveBountyDone) {
      this.waveBountyProgress++;
      if (this.waveBountyProgress >= this.waveBountyTarget) {
        this.completeWaveBounty();
      }
    }

    this.player.addRage(Math.round(28 * mods.meterGainMult), this.mode === 'training');
    this.player.addAwakening(Math.round(20 * mods.meterGainMult), this.mode === 'training');
    this.player.notifyPerfectParry();
    this.player.parryCooldown = 0.08;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.3);

    // Counter Mastery Blessing: unleash piercing Counter Sword Wave on every Perfect Parry!
    if (mods.parryWaveCount > 0) {
      this.projectiles.push(
        new Projectile({
          x: this.player.x + this.player.facing * 38,
          y: this.player.y - 54,
          vx: this.player.facing * 1060,
          vy: 0,
          radius: 34,
          damage: 32 + mods.parryWaveCount * 16,
          kind: 'sword_wave',
          fromPlayer: true,
          color: vfx.slashPrimary,
          secondaryColor: vfx.slashSecondary,
          rimColor: vfx.slashRim,
          theme: vfx.projectileTheme,
          maxLife: 0.9,
        })
      );
    }

    this.audio.playParry();
    this.hitstopTimer = 0.075;
    this.triggerImpactFrame(fxX, fxY, vfx.impactRingColor, 0.045);
    this.camera.triggerActionZoom('parry');
    this.camera.addDirectionalShake(-this.player.facing, -0.15, 0.45);
    this.particles.emitSparks(fxX, fxY, 26, vfx.slashPrimary, 680);
    this.particles.emitSparks(fxX, fxY, 12, '#ffffff', 520);
    this.particles.emitShockwave(fxX, fxY, vfx.impactRingColor, 115, 0.28);
    if (this.characterId === 'mirage') {
      this.particles.emitShards(fxX, fxY, 14, vfx.slashPrimary, 260, 1.0);
    } else {
      this.particles.emitSlashBeam(fxX, fxY, -0.4, 220, vfx.slashPrimary, 11);
    }
    emitSkinAccentParticle(
      this.particles,
      vfx.swingParticleKind,
      fxX,
      fxY,
      8,
      vfx.particleSecondary,
      this.player.facing
    );
    this.particles.emitText(this.player.x, this.player.y - 108, 'PERFECT PARRY!', vfx.hitTextColor, 26);

    if (attacker) {
      attacker.applyElementalMark(this.player.character.id, 3, this.particles, markTint);
      if (attacker instanceof Boss) {
        if (attacker.bossId === 'boss_haiku') {
          attacker.breakShield(this.particles);
        } else {
          const broke = attacker.addPostureDamage(44 * mods.postureDamageMult, this.particles, this.audio);
          if (!broke) {
            attacker.applyStun(1.2, this.particles);
          }
        }
      } else if (attacker.type === 'shield_guard') {
        attacker.breakShield(this.particles);
      } else {
        attacker.applyStun(2.1, this.particles);
      }
    }
  }

  private triggerImpactFrame(worldX: number, worldY: number, color: string, duration = 0.045): void {
    this.impactFrameWorldX = worldX;
    this.impactFrameWorldY = worldY;
    this.impactFrameColor = color;
    this.impactFrameDuration = duration;
    this.impactFrameTimer = Math.max(this.impactFrameTimer, duration);
    this.particles.triggerImpactFlash(clamp(duration * 1000, 30, 50));
  }

  private detonateElementalMarks(
    kind: CharacterId,
    originX: number,
    originY: number,
    maxRange: number
  ): number {
    const spec = getElementalMarkSpec(kind);
    const vfx = getSkinVfxProfile(kind, this.skinId);
    const mods = computeBlessingModifiers(this.blessingStacks);
    const targets = this.enemies.filter(
      (e) => e.alive && !e.dying && e.markKind === kind && e.markStacks > 0 && Math.abs(e.x - originX) <= maxRange
    );
    if (targets.length === 0) return 0;

    let prevX = originX;
    let prevY = originY;
    let detonatedCount = 0;

    for (const enemy of targets) {
      const mark = enemy.consumeElementalMark(kind);
      if (!mark) continue;
      detonatedCount++;

      const rawBurst = computeDetonationDamage(
        kind,
        mark.stacks,
        this.player.awakened,
        this.player.character.damageMultiplier * mods.markBurstMult
      );
      const burstDmg = this.scalePlayerDamage(rawBurst, enemy);
      const knockDir: 1 | -1 = enemy.x >= this.player.x ? 1 : -1;
      const launchY = kind === 'kagura' ? -440 : kind === 'kuro' ? -240 : -210;
      const killed = enemy.takeDamage(
        burstDmg,
        knockDir * (kind === 'kuro' ? 420 : 280),
        launchY,
        this.particles,
        this.audio,
        true
      );
      this.applyBossPostureHit(enemy, 24);
      this.recordTimeStopDamage(enemy.id, burstDmg);

      if (kind === 'raijin') {
        this.particles.emitChainArc(prevX, prevY, enemy.x, enemy.y - 54, vfx.particleSecondary, 6.5);
        this.particles.emitChainArc(prevX, prevY - 12, enemy.x, enemy.y - 44, vfx.particlePrimary, 4.5);
        this.particles.emitLightning(enemy.x, enemy.y - 115, vfx.impactRingColor, 110);
        if (!killed) enemy.applyStun(enemy.isBoss() ? 0.85 : 1.35, this.particles);
        this.audio.playLaser();
      } else if (kind === 'kagura') {
        this.particles.emitShockwave(enemy.x, enemy.y - 46, vfx.impactRingColor, 135, 0.3);
        this.particles.emitEmbers(enemy.x, enemy.y - 50, 26, vfx.particleSecondary);
        this.magmaPillars.push(
          new MagmaPillar(
            clamp(enemy.x, 64, ARENA_WIDTH - 64),
            knockDir,
            0.05,
            Math.round(burstDmg * 0.65),
            vfx.pillarTheme
          )
        );
        this.audio.playCryoShatter();
      } else if (kind === 'zero') {
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.65, 290, vfx.slashPrimary, 15);
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.65, 290, vfx.slashSecondary, 13);
        this.particles.emitShockwave(enemy.x, enemy.y - 54, vfx.impactRingColor, 120, 0.28);
        this.player.jumpsLeft = this.player.character.maxJumps;
      } else if (kind === 'mirage') {
        this.particles.emitShards(enemy.x, enemy.y - 54, 18, vfx.slashSecondary, 280, 1.1);
        this.particles.emitShards(enemy.x, enemy.y - 54, 10, vfx.slashPrimary, 220, 0.9);
        this.particles.emitShockwave(enemy.x, enemy.y - 54, vfx.impactRingColor, 130, 0.3);
        if (!killed) enemy.applyStun(enemy.isBoss() ? 0.75 : 1.25, this.particles);
        this.audio.playCryoShatter();
      } else if (kind === 'chrono') {
        this.particles.emitShockwave(enemy.x, enemy.y - 54, vfx.slashPrimary, 135, 0.3);
        this.particles.emitShockwave(enemy.x, enemy.y - 54, vfx.slashSecondary, 92, 0.22);
        this.particles.emitShards(enemy.x, enemy.y - 54, 12, vfx.slashSecondary, 240, 0.95);
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.5, 250, vfx.slashPrimary, 13);
        if (!killed) enemy.applyStun(enemy.isBoss() ? 0.75 : 1.35, this.particles);
        this.audio.playCryoShatter();
      } else {
        if (vfx.iceWallTheme === 'ice') {
          this.particles.emitIceShards(enemy.x, enemy.y - 54, 24, knockDir);
        }
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.45, 270, vfx.slashSecondary, 14);
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.45, 250, vfx.slashPrimary, 12);
        this.particles.emitShockwave(enemy.x, enemy.y - 54, vfx.impactRingColor, 130, 0.3);
        if (!killed) enemy.applyStun(enemy.isBoss() ? 0.75 : 1.25, this.particles);
        this.audio.playCryoShatter();
      }

      emitSkinAccentParticle(
        this.particles,
        vfx.finisherParticleKind,
        enemy.x,
        enemy.y - 54,
        10,
        vfx.particleSecondary,
        knockDir
      );
      this.particles.emitText(
        enemy.x,
        enemy.y - 116,
        `${spec.detonateCallout} x${mark.stacks}`,
        vfx.hitTextColor,
        26
      );
      this.registerPlayerHit(burstDmg, 48 + mark.stacks * 16, true, killed, enemy);
      prevX = enemy.x;
      prevY = enemy.y - 54;
    }

    if (detonatedCount > 0) {
      const refund = computeSynergyCooldownRefund(kind, detonatedCount);
      this.player.cryoCooldown = Math.max(
        0,
        this.player.cryoCooldown - refund.specialRefund - mods.markExtraRefundSec
      );
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - refund.dashRefund);
      if (refund.healAmount > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + refund.healAmount);
      }
      this.player.addRage(Math.round(refund.rageBonus * mods.meterGainMult), this.mode === 'training');
      this.triggerImpactFrame(prevX, prevY, vfx.detonationColor, 0.06);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.068);
      this.camera.pulseZoom(1.16, 0.24);
      this.camera.addShake(0.54, this.player.facing, 0);
    }

    return detonatedCount;
  }

  private registerPlayerHit(
    damage: number,
    styleGain: number,
    heavy: boolean,
    killed: boolean,
    enemy: Enemy
  ): void {
    const mods = computeBlessingModifiers(this.blessingStacks);
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.8;
    this.comboPulse = 1;
    this.styleScore = Math.min(620, this.styleScore + styleGain);
    this.score += damage * 3 + this.combo * 8;

    const training = this.mode === 'training';
    const baseRageGain = killed ? 9.5 : heavy ? 4.2 : 2.6;
    const baseAwakenGain = killed ? 6.5 : heavy ? 3.2 : 1.6;
    this.player.addRage(baseRageGain * mods.meterGainMult, training);
    this.player.addAwakening(baseAwakenGain * mods.meterGainMult, training);

    if (killed) {
      this.enemiesDefeated++;
      this.score += enemy.scoreValue;
      const totalLifesteal =
        mods.lifestealOnKill +
        (this.player.awakened ? this.player.character.awakeningLifestealOnKill : 0);
      if (totalLifesteal > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + totalLifesteal);
      }
    }
  }

  private activateScarletSheath(): void {
    if (this.cutscene.active) return;
    if (this.mode !== 'training') {
      this.player.rage = 0;
    }
    this.player.invulnTimer = 3.2;
    this.bg.triggerCrimsonFlash(0.95);
    const ch = this.player.character;
    const vfx = getSkinVfxProfile(ch.id, this.skinId);
    const isOverdrive = this.player.awakened;

    this.cutscene.start(
      {
        onKanjiImpact: () => {
          // Every active enemy gets obliterated (or frozen & marked for Chrono Time Stop) with Overdrive + Mark Resonance!
          let clearedNonBoss = 0;
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying) continue;
            const consumed = enemy.consumeElementalMark(ch.id);
            const markStacks = consumed ? consumed.stacks : 0;
            const ultDmg =
              ch.id === 'chrono'
                ? computeOverdriveUltimateDamage(
                    enemy.isBoss() ? ch.ultimateBossDamage : Math.round(ch.ultimateBossDamage * 0.45),
                    isOverdrive,
                    markStacks
                  )
                : enemy.isBoss()
                  ? computeOverdriveUltimateDamage(ch.ultimateBossDamage, isOverdrive, markStacks)
                  : 9999;
            const knockDir: 1 | -1 = enemy.x >= this.player.x ? 1 : -1;
            const killed = enemy.takeDamage(
              ultDmg,
              knockDir * (ch.id === 'chrono' ? 80 : 280),
              ch.id === 'chrono' ? -40 : -180,
              this.particles,
              this.audio,
              true
            );
            if (ch.id === 'raijin') {
              this.particles.emitLightning(enemy.x, enemy.y - 120, vfx.cutsceneSecondary, 135);
              if (!killed) {
                enemy.applyStun(isOverdrive ? 2.8 : 2.2, this.particles);
              }
            } else if (ch.id === 'kagura') {
              this.particles.emitEmbers(enemy.x, enemy.y - 50, 22, vfx.cutscenePrimary);
            } else if (ch.id === 'zero') {
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, -0.6, 260, vfx.cutscenePrimary, 14);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, 0.6, 260, vfx.cutsceneSecondary, 12);
            } else if (ch.id === 'aether') {
              this.particles.emitShockwave(enemy.x, enemy.y - 52, '#38bdf8', 115, 0.32);
              this.particles.emitShockwave(enemy.x, enemy.y - 52, '#e879f9', 82, 0.24);
              this.particles.emitChainArc(this.player.x, this.player.y - 58, enemy.x, enemy.y - 52, '#fde047', 4.5);
              this.particles.emitSparks(enemy.x, enemy.y - 52, 16, '#f0abfc', 460);
            } else if (ch.id === 'chrono') {
              this.particles.emitShockwave(enemy.x, enemy.y - 50, vfx.cutscenePrimary, 115, 0.32);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, -0.35, 220, vfx.cutsceneSecondary, 11);
            } else if (ch.id === 'mirage') {
              this.particles.emitShockwave(enemy.x, enemy.y - 52, vfx.cutscenePrimary, 115, 0.32);
              emitSkinAccentParticle(this.particles, 'shard', enemy.x, enemy.y - 52, 12, vfx.particlePrimary, knockDir);
            } else if (ch.id === 'valkyrie') {
              this.particles.emitSlashBeam(enemy.x, enemy.y - 110, Math.PI * 0.5, 290, vfx.cutscenePrimary, 18);
              this.particles.emitShockwave(enemy.x, enemy.y - 24, vfx.cutsceneSecondary, 120, 0.36);
              emitSkinAccentParticle(this.particles, 'feather', enemy.x, enemy.y - 56, 12, vfx.particlePrimary, knockDir);
            } else if (ch.id === 'mactien') {
              if (this.skinId === 'xuan_feng_sage') {
                this.particles.emitShockwave(enemy.x, enemy.y - 54, '#5eead4', 135, 0.36);
                this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.22, 290, '#f8fafc', 11);
                this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.22, 260, '#5eead4', 9);
                this.particles.emitPetals(enemy.x, enemy.y - 56, 8, '#fda4af', 160, 0.9);
                emitSkinAccentParticle(this.particles, 'ink_splatter', enemy.x, enemy.y - 56, 6, '#5eead4', knockDir);
              } else {
                this.particles.emitShockwave(enemy.x, enemy.y - 54, '#f59e0b', 135, 0.36);
                this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.22, 290, '#2dd4bf', 14);
                this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.22, 260, '#f59e0b', 12);
                emitSkinAccentParticle(this.particles, 'ink_splatter', enemy.x, enemy.y - 56, 14, '#1a1d24', knockDir);
              }
            } else {
              this.particles.emitShockwave(enemy.x, enemy.y - 48, vfx.cutscenePrimary, 110, 0.34);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, -0.32, 280, vfx.cutscenePrimary, 14);
            }
            emitSkinAccentParticle(
              this.particles,
              vfx.finisherParticleKind,
              enemy.x,
              enemy.y - 52,
              8,
              vfx.particleSecondary,
              knockDir
            );
            this.particles.emitSmoke(enemy.x, enemy.y - 30, 18, '#f8fafc', -95, 45);
            this.registerPlayerHit(enemy.isBoss() ? ultDmg : 120, isOverdrive ? 68 : 48, true, killed, enemy);
            if (killed && !enemy.isBoss()) clearedNonBoss++;
          }

          if (this.isVoidShattererDomainOwner()) {
            this.domainTimer = this.domainDuration;
            this.activeDomainKind = 'mirage';
            this.domainBeamTickTimer = 0.2;
          } else if (this.isChronoDomainOwner()) {
            this.domainTimer = isOverdrive ? 12.5 : 10.0;
            this.activeDomainKind = 'chrono';
          } else if (this.isXuanFengDomainOwner()) {
            this.domainTimer = isOverdrive ? 12.5 : 10.0;
            this.activeDomainKind = 'xuan_feng';
          }

          // Open Skill-Link right after Ultimate so players can immediately chain into follow-ups!
          this.player.skillLinkTimer = 1.25;
          if (isOverdrive) {
            this.triggerImpactFrame(this.player.x, this.player.y - 58, vfx.cutsceneSecondary, 0.08);
          }

          // Character-specific Ultimate battlefield aftermath (+ Awakened Overdrive Storm!)
          if (ch.id === 'raijin') {
            this.player.dashCooldown = 0;
            this.player.cryoCooldown = 0;
            if (isOverdrive) {
              for (const ox of [-220, -90, 90, 220]) {
                const lx = clamp(this.player.x + ox, 60, ARENA_WIDTH - 60);
                this.particles.emitLightning(lx, GROUND_Y - 125, vfx.cutsceneSecondary, 145);
                this.particles.emitChainArc(this.player.x, this.player.y - 56, lx, GROUND_Y - 24, vfx.cutscenePrimary, 5);
              }
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'TUYỆT KỸ THỨC TỈNH · THIÊN LÔI!' : 'LÔI PHẠT · CHOÁNG!',
              vfx.hitTextColor,
              24
            );
          } else if (ch.id === 'kagura') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + (isOverdrive ? 36 : 24));
            const offsets = isOverdrive ? [-240, -120, 0, 120, 240] : [-150, 0, 150];
            for (const ox of offsets) {
              const px = clamp(this.player.x + ox, 70, ARENA_WIDTH - 70);
              this.magmaPillars.push(
                new MagmaPillar(px, this.player.facing, 0.08, isOverdrive ? 52 : 38, vfx.pillarTheme)
              );
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'TUYỆT KỸ THỨC TỈNH · +36 HP!' : 'VIÊM NGỤC · +24 HP!',
              vfx.hitTextColor,
              24
            );
          } else if (ch.id === 'zero') {
            this.player.dashCooldown = 0;
            this.player.cryoCooldown = 0;
            this.player.parryCooldown = 0;
            this.player.invulnTimer = Math.max(this.player.invulnTimer, 3.0);
            const kunaiCount = isOverdrive ? 12 : 8;
            for (let i = 0; i < kunaiCount; i++) {
              const a = (i / kunaiCount) * Math.PI * 2;
              this.projectiles.push(
                new Projectile({
                  x: this.player.x,
                  y: this.player.y - 52,
                  vx: Math.cos(a) * 1080,
                  vy: Math.sin(a) * 1080,
                  radius: 18,
                  damage: isOverdrive ? 42 : 32,
                  kind: 'kunai',
                  fromPlayer: true,
                  color: vfx.cutscenePrimary,
                  secondaryColor: vfx.cutsceneSecondary,
                  rimColor: vfx.slashRim,
                  theme: vfx.projectileTheme,
                  maxLife: 0.9,
                })
              );
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'TUYỆT KỸ THỨC TỈNH · VÔ ẢNH!' : 'VÔ ẢNH · RESET CHIÊU!',
              vfx.hitTextColor,
              24
            );
          } else if (ch.id === 'aether') {
            // Aether (Char 5) Exclusive: Prismatic Constellation Nova + Arcane Star Orbs
            const rainbow = ['#38bdf8', '#e879f9', '#fde047', '#34d399', '#f43f5e'];
            for (let k = 0; k < 3; k++) {
              this.particles.emitShockwave(this.player.x, this.player.y - 56, rainbow[k], 125 + k * 55, 0.34 + k * 0.06);
            }
            const orbCount = isOverdrive ? 10 : 6;
            for (let i = 0; i < orbCount; i++) {
              const a = (i / orbCount) * Math.PI * 2;
              this.projectiles.push(
                new Projectile({
                  x: this.player.x + Math.cos(a) * 28,
                  y: this.player.y - 56 + Math.sin(a) * 22,
                  vx: Math.cos(a) * 760,
                  vy: Math.sin(a) * 420,
                  radius: 20,
                  damage: isOverdrive ? 44 : 30,
                  kind: 'orb',
                  fromPlayer: true,
                  color: rainbow[i % rainbow.length],
                  secondaryColor: '#ffffff',
                  rimColor: '#fde047',
                  theme: vfx.projectileTheme,
                  maxLife: 1.15,
                })
              );
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'SIÊU TÂN TINH · PHÁP TRẬN TINH TÚ!' : 'TINH TÚ BÙNG NỔ!',
              '#f0abfc',
              24
            );
          } else if (ch.id === 'chrono') {
            const stopDuration = isOverdrive ? 4.2 : 3.5;
            this.timeStopTimer = stopDuration;
            this.timeStopStoredDamage.clear();
            this.player.dashCooldown = 0;
            this.player.cryoCooldown = 0;
            if (this.isChronoDomainOwner()) {
              this.domainTimer = isOverdrive ? 12.5 : 10.0;
              this.activeDomainKind = 'chrono';
            }
            this.particles.emitShockwave(this.player.x, this.player.y - 54, vfx.cutscenePrimary, 260, 0.45);
            this.particles.emitShockwave(this.player.x, this.player.y - 54, vfx.cutsceneSecondary, 180, 0.34);
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              `NGƯNG ĐỌNG TOÀN CẦU · ${stopDuration.toFixed(1)}s!`,
              vfx.hitTextColor,
              25
            );
          } else if (ch.id === 'mirage') {
            this.player.dashCooldown = 0;
            this.player.cryoCooldown = 0;
            const ultRift = new MirrorRift(
              clamp(this.player.x + this.player.facing * 95, 80, ARENA_WIDTH - 80),
              this.player.y - 60,
              isOverdrive ? 36 : 26,
              true,
              vfx.cutscenePrimary,
              vfx.cutsceneSecondary,
              4.8
            );
            ultRift.domainEmpowered = this.isVoidShattererDomainOwner();
            this.mirrorRifts.push(ultRift);
            this.particles.emitShockwave(this.player.x, this.player.y - 56, vfx.cutscenePrimary, 220, 0.42);
            emitSkinAccentParticle(this.particles, 'shard', this.player.x, this.player.y - 56, 24, vfx.particlePrimary, this.player.facing);
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'VẠN KÍNH HƯ KHÔNG · PHÁ GIỚI!' : 'VẠN KÍNH PHÁ HƯ KHÔNG!',
              vfx.hitTextColor,
              24
            );
          } else if (ch.id === 'mactien') {
            this.player.dashCooldown = 0;
            this.player.cryoCooldown = 0;
            const sealX = clamp(this.player.x + this.player.facing * 140, 90, ARENA_WIDTH - 90);
            this.inkSeals.push({
              x: sealX,
              y: GROUND_Y,
              radius: isOverdrive ? 150 : 128,
              damage: Math.round((isOverdrive ? 44 : 32) * ch.damageMultiplier),
              awakened: true,
              life: 0,
              maxLife: 1.1,
              skinId: this.skinId,
            });
            if (this.skinId === 'xuan_feng_sage') {
              this.particles.emitShockwave(this.player.x, this.player.y - 54, '#5eead4', 270, 0.46);
              this.particles.emitShockwave(this.player.x, this.player.y - 54, '#f8fafc', 195, 0.36);
              this.particles.emitPetals(this.player.x, this.player.y - 56, 22, '#fda4af', 220, 0.95);
              emitSkinAccentParticle(this.particles, 'ink_splatter', this.player.x, this.player.y - 56, 10, '#5eead4', this.player.facing);
              this.particles.emitText(
                this.player.x,
                this.player.y - 116,
                'XUÂN PHONG VĂN THÁNH · 春!',
                '#5eead4',
                25
              );
            } else {
              this.particles.emitShockwave(this.player.x, this.player.y - 54, '#f59e0b', 270, 0.46);
              this.particles.emitShockwave(this.player.x, this.player.y - 54, '#2dd4bf', 195, 0.36);
              emitSkinAccentParticle(this.particles, 'ink_splatter', this.player.x, this.player.y - 56, 24, '#f59e0b', this.player.facing);
              this.particles.emitText(
                this.player.x,
                this.player.y - 116,
                isOverdrive ? 'THIÊN HẠ NGHÊNH XUÂN · KIM MẶC!' : 'THIÊN HẠ NGHÊNH XUÂN · 春!',
                '#fde047',
                25
              );
            }
          } else if (ch.id === 'valkyrie') {
            // Valkyrie (Char 6) 100% Exclusive: Twin Opposite Awakened Boomerang Glaives + Divine Halo Heal
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + (isOverdrive ? 32 : 20));
            this.player.invulnTimer = Math.max(this.player.invulnTimer, 2.2);
            for (const dir of [-1, 1] as const) {
              this.valkyrieBoomerangs.push(
                new ValkyrieBoomerang(
                  this.player.x + dir * 32,
                  this.player.y - 56,
                  dir,
                  isOverdrive ? 44 : 32,
                  vfx.cutscenePrimary,
                  vfx.cutsceneSecondary
                )
              );
            }
            this.particles.emitShockwave(this.player.x, this.player.y - 56, vfx.cutscenePrimary, 210, 0.42);
            emitSkinAccentParticle(this.particles, 'feather', this.player.x, this.player.y - 60, 20, vfx.particlePrimary, this.player.facing);
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'THÁNH QUANG PHÁN QUYẾT · SONG KÍCH!' : 'THIÊN DỰC PHÁN QUYẾT!',
              vfx.hitTextColor,
              24
            );
          } else {
            this.particles.emitShockwave(this.player.x, this.player.y - 52, vfx.cutscenePrimary, 180, 0.36);
            if (isOverdrive) {
              for (const dir of [-1, 1] as const) {
                this.projectiles.push(
                  new Projectile({
                    x: this.player.x + dir * 40,
                    y: this.player.y - 56,
                    vx: dir * 1100,
                    vy: 0,
                    radius: 44,
                    damage: 54,
                    kind: 'sword_wave',
                    fromPlayer: true,
                    color: vfx.slashPrimary,
                    secondaryColor: vfx.slashSecondary,
                    rimColor: vfx.slashRim,
                    theme: vfx.projectileTheme,
                    maxLife: 1.1,
                  })
                );
              }
              this.particles.emitText(
                this.player.x,
                this.player.y - 114,
                `TUYỆT KỸ THỨC TỈNH · ${ch.ultimateKanji}!`,
                vfx.cutsceneSecondary,
                25
              );
            }
          }

          // Clear enemy bullets on screen (Chrono's Time Stop freezes them in midair instead!)
          if (ch.id !== 'chrono') {
            this.projectiles = this.projectiles.filter((p) => p.fromPlayer);
          }
          if (clearedNonBoss >= 2 && !this.activeBoss) {
            this.player.triggerVictoryDance(2.2);
          }
        },
        onComplete: () => {
          if (this.isVoidShattererDomainOwner()) {
            this.domainTimer = Math.max(this.domainTimer, this.domainDuration);
            this.activeDomainKind = 'mirage';
            this.domainBeamTickTimer = 0.2;
          } else if (this.isChronoDomainOwner()) {
            this.domainTimer = Math.max(this.domainTimer, 10.0);
            this.activeDomainKind = 'chrono';
          } else if (this.isXuanFengDomainOwner()) {
            this.domainTimer = Math.max(this.domainTimer, 10.0);
            this.activeDomainKind = 'xuan_feng';
          }
          this.emitHudSnapshot();
        },
      },
      this.audio,
      {
        characterId: ch.id,
        skinId: this.skinId,
        kanji: ch.ultimateKanji,
        primaryColor: vfx.cutscenePrimary,
        secondaryColor: vfx.cutsceneSecondary,
        accentColor: vfx.cutsceneAccent,
        bannerTitle: ch.ultimateBannerTitle,
      }
    );
    this.emitHudSnapshot();
  }

  private triggerFableAwakeningEvent(): void {
    if (this.fableAwakeningTriggered) return;
    this.fableAwakeningTriggered = true;
    this.player.awakening = this.player.maxAwakening;
    this.awakenPromptTimer = 7.5;
    this.bg.triggerCrimsonFlash(0.75);
    this.camera.pulseZoom(1.18, 0.45);
    this.camera.addShake(0.55, 0, -1);
    this.audio.playParry();
    this.particles.emitSparks(this.player.x, this.player.y - 54, 28, '#ef4444', 650);
    this.particles.emitText(this.player.x, this.player.y - 122, 'KIẾM VỠ! BẤM [O] THỨC TỈNH!', '#fecaca', 26);
    this.emitHudSnapshot();
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const vfx = getSkinVfxProfile(this.characterId, this.skinId);
    const themeColor = this.player.awakened ? vfx.impactRingColor : vfx.swingAuraColor;

    // 1. Screen-space Atmospheric Backdrop (volumetric god rays, motes & theme tint)
    const isDefaultMacTienAwakened =
      this.characterId === 'mactien' && this.skinId !== 'xuan_feng_sage' && this.player.awakened;
    this.bg.renderScreenBackdrop(
      ctx,
      this.viewW,
      this.viewH,
      this.player.awakened && !isDefaultMacTienAwakened,
      themeColor
    );
    if (this.mactienDomainBlend > 0.01 && !this.isXuanFengDomainOwner()) {
      this.renderMacTienDomainBackdrop(ctx, this.viewW, this.viewH);
    }

    // 2. World-space Camera Transform
    ctx.save();
    this.camera.applyTransform(ctx, this.viewW, this.viewH);

    const silhouette = this.cutscene.isSilhouettePhase();
    const whiteFlash = this.cutscene.isWhiteFlashPhase();
    const monoArena = silhouette || whiteFlash;

    if (monoArena) {
      // High-contrast anime silhouette flash
      ctx.fillStyle = whiteFlash ? '#3b3e44' : '#bcc0c7';
      ctx.fillRect(-500, -400, ARENA_WIDTH + 1000, GROUND_Y + 400);
      ctx.fillStyle = whiteFlash ? '#24272c' : '#8c9099';
      ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);
    } else {
      this.bg.renderWorld(
        ctx,
        this.player.x,
        this.player.y,
        this.activeBoss?.accentColor ?? null,
        themeColor
      );
      this.particles.renderImpactFlash(ctx, -500, -500, ARENA_WIDTH + 1000, GROUND_Y + 1000);
    }

    // Stage Hazards & Magic Circles on floor
    if (!monoArena) {
      for (const hz of this.stageHazards) {
        hz.render(ctx);
      }
    }
    for (const mc of this.magicCircles) {
      mc.render(ctx);
    }

    // White Plastic Chair (Vergil prop)
    if (this.chair) {
      this.chair.render(ctx);
    }

    // Cryo Ice Walls & Magma Pillars
    for (const wall of this.iceWalls) {
      wall.render(ctx);
    }
    for (const mp of this.magmaPillars) {
      mp.render(ctx);
    }

    // Magnetic Loot Orbs & Destructible Soul Crystals
    if (!monoArena) {
      for (const c of this.soulCrystals) {
        c.render(ctx);
      }
      for (const orb of this.lootOrbs) {
        orb.render(ctx);
      }
    }

    // Enemies & Bosses
    for (const enemy of this.enemies) {
      enemy.render(ctx, silhouette, whiteFlash);
    }

    // Chrono Temporal Echoes (world-space, rendered behind protagonist)
    if (!monoArena && this.temporalEchoes.length > 0) {
      for (const echo of this.temporalEchoes) {
        echo.render(ctx);
      }
      if (this.echoSlashTrails.length > 0) {
        renderSlashTrails(ctx, this.echoSlashTrails);
      }
    }

    // Protagonist
    this.player.render(ctx, monoArena);

    // Projectiles, Inter-Rift Domain Beams & Exclusive Valkyrie Boomerangs
    if (!monoArena) {
      for (const proj of this.projectiles) {
        proj.render(ctx);
      }
      if (
        this.domainTimer > 0 &&
        this.activeDomainKind === 'mirage' &&
        this.isVoidShattererDomainOwner() &&
        this.mirrorRifts.length >= 2
      ) {
        ctx.save();
        try {
          const pulse = 0.72 + 0.28 * Math.sin(finiteOr(this.elapsedTime, 0) * 14);
          for (let i = 0; i < this.mirrorRifts.length - 1; i++) {
            const a = this.mirrorRifts[i];
            const b = this.mirrorRifts[i + 1];
            if (!a.active || !b.active) continue;
            const ax = finiteOr(a.x, 0);
            const ay = finiteOr(a.y, GROUND_Y - 58);
            const bx = finiteOr(b.x, 0);
            const by = finiteOr(b.y, GROUND_Y - 58);
            const midX = (ax + bx) * 0.5;
            const midY = (ay + by) * 0.5 + Math.sin(finiteOr(this.elapsedTime, 0) * 18 + i) * 10;

            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.34 * pulse;
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(midX, midY);
            ctx.lineTo(bx, by);
            ctx.stroke();

            ctx.globalAlpha = 0.78 * pulse;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4.2;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(midX, midY);
            ctx.lineTo(bx, by);
            ctx.stroke();

            ctx.globalAlpha = 0.92;
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      }
      for (const rift of this.mirrorRifts) {
        rift.render(ctx);
      }
      for (const seal of this.inkSeals) {
        const p = Math.min(1, seal.life / seal.maxLife);
        const pulse = 0.78 + 0.22 * Math.sin(seal.life * 15);
        const r = seal.radius * (0.86 + 0.14 * Math.min(1, seal.life * 8));
        const fadeNearEnd = p > 0.85 ? 1 - ((p - 0.85) / 0.15) * 0.25 : 1;
        const isXuanFengSeal = seal.skinId === 'xuan_feng_sage';
        const inkGold = seal.awakened ? '#fde047' : '#ef4444';
        const rimAccent = seal.awakened ? '#f59e0b' : '#2dd4bf';
        ctx.save();
        try {
          ctx.translate(seal.x, seal.y - r * 0.56 - 6);

          if (isXuanFengSeal) {
            if (seal.awakened) {
              // VĂN THÁNH TRẤN THIÊN TRẬN — Giant 3-tier Formation Ring + 4 Orbiting Sub-Seals
              ctx.fillStyle = `rgba(248, 250, 252, ${(0.24 + 0.1 * p) * fadeNearEnd})`;
              ctx.beginPath();
              ctx.ellipse(0, r * 0.56 + 4, seal.radius * 1.05, 13, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = `rgba(253, 230, 138, ${0.65 * fadeNearEnd})`;
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.ellipse(0, r * 0.56 + 4, seal.radius * 0.88, 9, 0, 0, Math.PI * 2);
              ctx.stroke();

              // Tier 1 (Outer): Pale-Gold Ring + 12 Confucian Ticks + Outer Jade Rim
              ctx.save();
              try {
                ctx.rotate(seal.life * 0.72);
                ctx.strokeStyle = `rgba(253, 230, 138, ${0.86 * fadeNearEnd})`;
                ctx.lineWidth = 2.2;
                ctx.setLineDash([22, 10, 6, 10]);
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = `rgba(94, 234, 212, ${0.62 * fadeNearEnd})`;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([12, 14]);
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.89, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.strokeStyle = `rgba(253, 230, 138, ${0.9 * fadeNearEnd})`;
                ctx.lineWidth = 1.7;
                for (let tIdx = 0; tIdx < 12; tIdx++) {
                  const ta = (tIdx * Math.PI * 2) / 12;
                  const tickIn = tIdx % 3 === 0 ? r * 0.84 : r * 0.88;
                  const tickOut = tIdx % 3 === 0 ? r * 1.01 : r * 0.97;
                  ctx.beginPath();
                  ctx.moveTo(Math.cos(ta) * tickIn, Math.sin(ta) * tickIn);
                  ctx.lineTo(Math.cos(ta) * tickOut, Math.sin(ta) * tickOut);
                  ctx.stroke();
                }
              } finally {
                ctx.setLineDash([]);
                ctx.restore();
              }

              // Tier 2 (Middle): Ink & Moonlight-White Enso Brush Ring + Swirling Spring Wind Arcs + Petals
              ctx.save();
              try {
                ctx.rotate(seal.life * 1.28);
                // Sumi-e ink Enso understroke
                ctx.strokeStyle = `rgba(30, 41, 59, ${0.78 * fadeNearEnd})`;
                ctx.lineWidth = 6.2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.71, -2.25, 1.95);
                ctx.stroke();

                // Moonlight-white Enso core stroke
                ctx.strokeStyle = `rgba(248, 250, 252, ${0.9 * fadeNearEnd})`;
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.71, -2.1, 1.8);
                ctx.stroke();

                // Swirling spring wind arcs
                for (let wIdx = 0; wIdx < 3; wIdx++) {
                  const wa = (wIdx * Math.PI * 2) / 3;
                  ctx.strokeStyle =
                    wIdx % 2 === 0
                      ? `rgba(94, 234, 212, ${0.72 * fadeNearEnd})`
                      : `rgba(248, 250, 252, ${0.68 * fadeNearEnd})`;
                  ctx.lineWidth = 1.6;
                  ctx.beginPath();
                  ctx.arc(0, 0, r * (0.78 + wIdx * 0.04), wa, wa + 0.95);
                  ctx.stroke();
                }

                // 6 Drifting peach blossom petals
                for (let k = 0; k < 6; k++) {
                  const a = (k * Math.PI) / 3;
                  ctx.save();
                  try {
                    ctx.translate(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74);
                    ctx.rotate(a + 0.65);
                    ctx.fillStyle = `rgba(253, 164, 175, ${0.92 * fadeNearEnd})`;
                    ctx.strokeStyle = `rgba(30, 41, 59, ${0.55 * fadeNearEnd})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 5.8, 3.0, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                  } finally {
                    ctx.restore();
                  }
                }
              } finally {
                ctx.restore();
              }

              // Tier 3 (Inner): Counter-Rotating Octagonal Jade Formation Ring
              ctx.save();
              try {
                ctx.rotate(-seal.life * 1.65);
                const octR = r * 0.48 * Math.max(0.58, 1 - p * 0.18);
                ctx.strokeStyle = `rgba(45, 212, 191, ${0.9 * fadeNearEnd})`;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                for (let v = 0; v < 8; v++) {
                  const va = (v * Math.PI) / 4;
                  const vx = Math.cos(va) * octR;
                  const vy = Math.sin(va) * octR;
                  if (v === 0) ctx.moveTo(vx, vy);
                  else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
                ctx.stroke();

                ctx.strokeStyle = `rgba(94, 234, 212, ${0.75 * fadeNearEnd})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(0, 0, octR * 0.78, 0, Math.PI * 2);
                ctx.stroke();

                // 4-point star glints at cardinal vertices
                ctx.fillStyle = `rgba(253, 230, 138, ${0.92 * fadeNearEnd})`;
                for (let v = 0; v < 4; v++) {
                  const va = (v * Math.PI) / 2;
                  const sx = Math.cos(va) * octR;
                  const sy = Math.sin(va) * octR;
                  ctx.beginPath();
                  ctx.moveTo(sx, sy - 4.5);
                  ctx.lineTo(sx + 1.3, sy - 1.3);
                  ctx.lineTo(sx + 4.5, sy);
                  ctx.lineTo(sx + 1.3, sy + 1.3);
                  ctx.lineTo(sx, sy + 4.5);
                  ctx.lineTo(sx - 1.3, sy + 1.3);
                  ctx.lineTo(sx - 4.5, sy);
                  ctx.lineTo(sx - 1.3, sy - 1.3);
                  ctx.closePath();
                  ctx.fill();
                }
              } finally {
                ctx.restore();
              }

              // 4 Orbiting Sub-Seals (禮, 義, 仁, 智) around the outer ring
              ctx.save();
              try {
                const subChars = ['禮', '義', '仁', '智'];
                ctx.font = 'bold 12px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let sIdx = 0; sIdx < 4; sIdx++) {
                  const sa = (sIdx * Math.PI) / 2 + seal.life * 0.95;
                  const sx = Math.cos(sa) * r * 0.94;
                  const sy = Math.sin(sa) * r * 0.94;
                  ctx.fillStyle = `rgba(15, 23, 42, ${0.86 * fadeNearEnd})`;
                  ctx.strokeStyle = `rgba(253, 230, 138, ${0.92 * fadeNearEnd})`;
                  ctx.lineWidth = 1.6;
                  ctx.beginPath();
                  ctx.arc(sx, sy, 12, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();

                  ctx.strokeStyle = `rgba(94, 234, 212, ${0.75 * fadeNearEnd})`;
                  ctx.lineWidth = 0.9;
                  ctx.beginPath();
                  ctx.arc(sx, sy, 9.2, 0, Math.PI * 2);
                  ctx.stroke();

                  ctx.fillStyle = `rgba(248, 250, 252, ${0.96 * fadeNearEnd})`;
                  ctx.fillText(subChars[sIdx], sx, sy + 0.5);
                }
              } finally {
                ctx.restore();
              }

              // Raining jade bamboo slips descending through the formation
              for (let b = 0; b < 5; b++) {
                const bx = (b - 2) * (r * 0.34) + Math.sin(seal.life * 5 + b) * 6;
                const by = -r * 0.95 + ((seal.life * 200 + b * 44) % (r * 1.7));
                ctx.fillStyle = `rgba(94, 234, 212, ${0.8 * fadeNearEnd})`;
                ctx.strokeStyle = `rgba(248, 250, 252, ${0.88 * fadeNearEnd})`;
                ctx.lineWidth = 0.8;
                ctx.fillRect(bx - 1.8, by - 9, 3.6, 18);
                ctx.strokeRect(bx - 1.8, by - 9, 3.6, 18);
              }

              // Razor-sharp ink cross-slash climax flash near detonation (p > 0.78)
              if (p > 0.78) {
                const crossAlpha = Math.min(1, (p - 0.78) / 0.22);
                const len = r * (0.98 + crossAlpha * 0.58);
                for (const ang of [Math.PI * 0.25, -Math.PI * 0.25]) {
                  const dx = Math.cos(ang) * len;
                  const dy = Math.sin(ang) * len;
                  ctx.strokeStyle = `rgba(30, 41, 59, ${0.78 * crossAlpha})`;
                  ctx.lineWidth = 11 * (1 - crossAlpha * 0.35);
                  ctx.beginPath();
                  ctx.moveTo(-dx, -dy);
                  ctx.lineTo(dx, dy);
                  ctx.stroke();

                  ctx.strokeStyle = `rgba(94, 234, 212, ${0.9 * crossAlpha})`;
                  ctx.lineWidth = 5 * (1 - crossAlpha * 0.3);
                  ctx.beginPath();
                  ctx.moveTo(-dx, -dy);
                  ctx.lineTo(dx, dy);
                  ctx.stroke();

                  ctx.strokeStyle = `rgba(248, 250, 252, ${0.95 * crossAlpha})`;
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(-dx, -dy);
                  ctx.lineTo(dx, dy);
                  ctx.stroke();
                }
              }

              // Radiant jade-gold halo & crisp central "靜" + overhead "禮" crest
              ctx.fillStyle = `rgba(94, 234, 212, ${0.22 * pulse * fadeNearEnd})`;
              ctx.beginPath();
              ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
              ctx.fill();

              const fontSize = Math.round(r * 0.58);
              ctx.font = `900 ${fontSize}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 3.4;
              ctx.strokeStyle = `rgba(30, 41, 59, ${0.88 * fadeNearEnd})`;
              ctx.strokeText('靜', 0, 2);
              ctx.fillStyle = '#f8fafc';
              ctx.globalAlpha = 0.96 * pulse * fadeNearEnd;
              ctx.fillText('靜', 0, 2);
            } else {
              // Soft white-jade ground mist ripple beneath the formation ring
              ctx.fillStyle = `rgba(248, 250, 252, ${(0.22 + 0.1 * p) * fadeNearEnd})`;
              ctx.beginPath();
              ctx.ellipse(0, r * 0.56 + 4, seal.radius * 0.9, 11, 0, 0, Math.PI * 2);
              ctx.fill();

              // Fine-lined jade-teal outer calligraphy formation ring + 6 gently rotating peach petals
              ctx.save();
              try {
                ctx.rotate(seal.life * 1.2);
                ctx.strokeStyle = `rgba(45, 212, 191, ${0.86 * fadeNearEnd})`;
                ctx.lineWidth = 2.0;
                ctx.setLineDash([20, 10, 6, 10]);
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = `rgba(248, 250, 252, ${0.78 * fadeNearEnd})`;
                ctx.lineWidth = 1.3;
                ctx.setLineDash([14, 12]);
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.54, 0, Math.PI * 2);
                ctx.stroke();

                for (let k = 0; k < 6; k++) {
                  const a = (k * Math.PI) / 3;
                  ctx.save();
                  try {
                    ctx.translate(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
                    ctx.rotate(a + 0.65);
                    ctx.fillStyle = `rgba(253, 164, 175, ${0.9 * fadeNearEnd})`;
                    ctx.strokeStyle = `rgba(30, 41, 59, ${0.55 * fadeNearEnd})`;
                    ctx.lineWidth = 0.7;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 5.4, 2.9, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                  } finally {
                    ctx.restore();
                  }
                }
              } finally {
                ctx.setLineDash([]);
                ctx.restore();
              }

              // Counter-rotating fine inner jade-teal ring with 8 delicate radial ticks
              ctx.save();
              try {
                ctx.rotate(-seal.life * 1.75);
                const innerR = r * 0.44 * Math.max(0.45, 1 - p * 0.24);
                ctx.strokeStyle = `rgba(94, 234, 212, ${0.88 * fadeNearEnd})`;
                ctx.lineWidth = 1.4;
                ctx.setLineDash([10, 7]);
                ctx.beginPath();
                ctx.arc(0, 0, innerR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                for (let k = 0; k < 8; k++) {
                  const a = (k * Math.PI * 2) / 8;
                  ctx.beginPath();
                  ctx.moveTo(Math.cos(a) * (innerR - 3), Math.sin(a) * (innerR - 3));
                  ctx.lineTo(Math.cos(a) * (innerR + 5), Math.sin(a) * (innerR + 5));
                  ctx.stroke();
                }
              } finally {
                ctx.setLineDash([]);
                ctx.restore();
              }

              // Soft jade halo behind crisp "静"
              ctx.fillStyle = `rgba(94, 234, 212, ${0.18 * pulse * fadeNearEnd})`;
              ctx.beginPath();
              ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
              ctx.fill();

              const fontSize = Math.round(r * 0.56);
              ctx.font = `900 ${fontSize}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 3.0;
              ctx.strokeStyle = `rgba(30, 41, 59, ${0.84 * fadeNearEnd})`;
              ctx.strokeText('静', 0, 2);
              ctx.fillStyle = '#f8fafc';
              ctx.globalAlpha = 0.96 * pulse * fadeNearEnd;
              ctx.fillText('静', 0, 2);
            }
          } else {
            // Subtle ground ink-wash mist ripple beneath the magic circle
            ctx.fillStyle = `rgba(18, 21, 28, ${(0.24 + 0.14 * p) * fadeNearEnd})`;
            ctx.beginPath();
            ctx.ellipse(0, r * 0.56 + 4, seal.radius * 0.9, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outer rotating calligraphic ink magic-circle ring (transparent center, no solid box!)
            ctx.save();
            try {
              ctx.rotate(seal.life * 1.45);
              ctx.strokeStyle = `rgba(18, 21, 28, ${0.78 * fadeNearEnd})`;
              ctx.lineWidth = 4.2;
              ctx.setLineDash([28, 10, 8, 10]);
              ctx.beginPath();
              ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = rimAccent;
              ctx.globalAlpha = 0.84 * fadeNearEnd;
              ctx.lineWidth = 2.0;
              ctx.setLineDash([20, 14]);
              ctx.beginPath();
              ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
              ctx.stroke();
            } finally {
              ctx.setLineDash([]);
              ctx.restore();
            }

            // Counter-rotating inner vermilion/gold rune ring with 8 radial calligraphic ticks
            ctx.save();
            try {
              ctx.rotate(-seal.life * 2.1);
              const innerR = r * 0.45 * Math.max(0.45, 1 - p * 0.28);
              ctx.strokeStyle = inkGold;
              ctx.globalAlpha = 0.88 * fadeNearEnd;
              ctx.lineWidth = 1.9;
              ctx.setLineDash([12, 8]);
              ctx.beginPath();
              ctx.arc(0, 0, innerR, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);

              for (let k = 0; k < 8; k++) {
                const a = (k * Math.PI * 2) / 8;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (innerR - 4), Math.sin(a) * (innerR - 4));
                ctx.lineTo(Math.cos(a) * (innerR + 6), Math.sin(a) * (innerR + 6));
                ctx.stroke();
              }
            } finally {
              ctx.setLineDash([]);
              ctx.restore();
            }

            // Soft radiant glow aura behind Kanji (flat alpha, no shadowBlur)
            ctx.fillStyle = seal.awakened
              ? `rgba(245, 158, 11, ${0.14 * pulse * fadeNearEnd})`
              : `rgba(239, 68, 68, ${0.15 * pulse * fadeNearEnd})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
            ctx.fill();

            // Glowing floating calligraphic Kanji "静" (vermilion / Kim Mặc gold, no opaque box)
            const fontSize = Math.round(r * 0.56);
            ctx.font = `900 ${fontSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 4.5;
            ctx.strokeStyle = `rgba(14, 17, 24, ${0.86 * fadeNearEnd})`;
            ctx.strokeText('静', 0, 2);
            ctx.fillStyle = inkGold;
            ctx.globalAlpha = 0.95 * pulse * fadeNearEnd;
            ctx.fillText('静', 0, 2);
          }
        } finally {
          ctx.restore();
        }
      }
      for (const bm of this.valkyrieBoomerangs) {
        bm.render(ctx);
      }
    }

    // Pooled Particles
    this.particles.render(ctx);

    // 2B. World-Space Dynamic Additive Point Lighting (Restrained Bloom to preserve Ink-Wash Linework)
    if (!monoArena) {
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';

        // Protagonist ambient light aura (restrained so #0b0c10 ink linework stays sharp)
        const px = finiteOr(this.player.x, ARENA_WIDTH * 0.5);
        const py = finiteOr(this.player.y, GROUND_Y) - 52;
        const pR = this.player.awakened ? 128 : 78;
        const pGrad = ctx.createRadialGradient(px, py, 6, px, py, pR);
        pGrad.addColorStop(0, colorWithAlpha(themeColor, this.player.awakened ? 0.14 : 0.08));
        pGrad.addColorStop(0.55, colorWithAlpha(themeColor, this.player.awakened ? 0.05 : 0.025));
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pR, 0, Math.PI * 2);
        ctx.fill();

        // Active Boss menacing aura glow
        if (this.activeBoss && this.activeBoss.alive && !this.activeBoss.dying) {
          const bx = finiteOr(this.activeBoss.x, ARENA_WIDTH * 0.5);
          const by = finiteOr(this.activeBoss.y, GROUND_Y) - 56;
          const bCol = this.activeBoss.accentColor;
          const bGrad = ctx.createRadialGradient(bx, by, 8, bx, by, 112);
          bGrad.addColorStop(0, colorWithAlpha(bCol, 0.12));
          bGrad.addColorStop(0.55, colorWithAlpha(bCol, 0.04));
          bGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(bx, by, 112, 0, Math.PI * 2);
          ctx.fill();
        }

        // Soft restrained luminous glow around energy projectiles (attenuated under dense barrages)
        let activeProjCount = 0;
        for (const proj of this.projectiles) {
          if (proj.active) activeProjCount++;
        }
        const projAlpha = Math.max(0.06, 0.14 - Math.max(0, activeProjCount - 4) * 0.008);
        for (const proj of this.projectiles) {
          if (!proj.active) continue;
          const jx = finiteOr(proj.x, px);
          const jy = finiteOr(proj.y, py);
          const pr = Math.max(26, finiteOr(proj.radius, 12) * 1.85);
          const pg = ctx.createRadialGradient(jx, jy, 2, jx, jy, pr);
          pg.addColorStop(0, colorWithAlpha(proj.color, projAlpha));
          pg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(jx, jy, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      } finally {
        ctx.restore();
      }
    }

    ctx.restore(); // End world space

    // 2B-1. Global Time Stop Arena Filter (teal / antique-gold wash + Roman clock dial overlay)
    if (this.timeStopTimer > 0 && !this.cutscene.active) {
      ctx.save();
      try {
        const cx = this.viewW * 0.5;
        const cy = this.viewH * 0.5;
        const fade = Math.min(1, this.timeStopTimer / 0.35);
        const isSovereign = this.skinId === 'chrono_sovereign';

        // Screen-space temporal teal / antique-gold wash
        const tsGrad = ctx.createRadialGradient(
          cx,
          cy,
          this.viewW * 0.16,
          cx,
          cy,
          this.viewW * 0.72
        );
        tsGrad.addColorStop(0, `rgba(13, 148, 136, ${(0.12 * fade).toFixed(3)})`);
        tsGrad.addColorStop(0.65, `rgba(17, 94, 89, ${(0.22 * fade).toFixed(3)})`);
        tsGrad.addColorStop(
          1,
          isSovereign
            ? `rgba(217, 119, 6, ${(0.32 * fade).toFixed(3)})`
            : `rgba(245, 158, 11, ${(0.24 * fade).toFixed(3)})`
        );
        ctx.fillStyle = tsGrad;
        ctx.fillRect(0, 0, this.viewW, this.viewH);

        // Subtle Roman clock dial ring overlay
        const dialR = Math.max(80, Math.min(this.viewW, this.viewH) * 0.34);
        ctx.globalAlpha = 0.24 * fade;
        ctx.strokeStyle = isSovereign ? '#fbbf24' : '#2dd4bf';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, dialR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = isSovereign ? '#38bdf8' : '#f59e0b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, dialR * 0.86, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 12; i++) {
          const a = -Math.PI * 0.5 + (i * Math.PI * 2) / 12;
          const rIn = i % 3 === 0 ? dialR * 0.84 : dialR * 0.9;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
          ctx.lineTo(cx + Math.cos(a) * dialR, cy + Math.sin(a) * dialR);
          ctx.stroke();
        }

        ctx.fillStyle = isSovereign ? '#fde047' : '#99f6e4';
        ctx.font = '700 15px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const numerals: Array<[string, number]> = [
          ['XII', -Math.PI * 0.5],
          ['III', 0],
          ['VI', Math.PI * 0.5],
          ['IX', Math.PI],
        ];
        for (const [label, ang] of numerals) {
          ctx.fillText(label, cx + Math.cos(ang) * (dialR * 0.76), cy + Math.sin(ang) * (dialR * 0.76));
        }

        // Frozen dial hands gently aligned to remaining Time Stop progress
        const handAngle = -Math.PI * 0.5 - this.timeStopTimer * 0.6;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(handAngle) * (dialR * 0.64), cy + Math.sin(handAngle) * (dialR * 0.64));
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // 2B-2. Witch Time Chrono-Dilation Screen Tint (cyan-violet bullet-time frame!)
    if (this.witchTimeTimer > 0 && !this.cutscene.active) {
      const wtAlpha = Math.min(0.26, this.witchTimeTimer * 0.42);
      ctx.save();
      const wtGrad = ctx.createRadialGradient(
        this.viewW * 0.5,
        this.viewH * 0.5,
        this.viewW * 0.22,
        this.viewW * 0.5,
        this.viewH * 0.5,
        this.viewW * 0.68
      );
      wtGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
      wtGrad.addColorStop(1, `rgba(168, 85, 247, ${wtAlpha})`);
      ctx.fillStyle = wtGrad;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.restore();
    }

    // 2C. Dynamic Peripheral Anime Speed Lines during Dash, Witch Time, or Awakening
    if (
      this.state === 'playing' &&
      !this.cutscene.active &&
      (this.player.dashTimer > 0 || this.player.awakened || this.witchTimeTimer > 0)
    ) {
      const intensity = this.player.dashTimer > 0 ? 0.32 : this.witchTimeTimer > 0 ? 0.22 : 0.14;
      const cx = this.viewW * 0.5;
      const cy = this.viewH * 0.5;
      const outerR = Math.hypot(cx, cy) * 1.08;
      const innerR = outerR * (this.player.dashTimer > 0 ? 0.58 : 0.72);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = intensity;
      ctx.strokeStyle =
        this.witchTimeTimer > 0 ? '#38bdf8' : this.player.dashTimer > 0 ? '#ffffff' : themeColor;
      const count = this.player.dashTimer > 0 ? 22 : 14;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + this.elapsedTime * 3.5;
        const jitter = ((i * 37) % 100) / 100;
        ctx.lineWidth = 1.2 + jitter * 1.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (innerR + jitter * 45), cy + Math.sin(a) * (innerR + jitter * 45));
        ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Sakuga Anime Impact Frame Flash
    if (this.impactFrameTimer > 0 && !this.cutscene.active) {
      const ratio = clamp(this.impactFrameTimer / Math.max(0.01, this.impactFrameDuration), 0, 1);
      const isPeak = ratio > 0.55;
      ctx.save();
      ctx.fillStyle = isPeak ? 'rgba(9, 11, 16, 0.42)' : 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);

      const cx = this.viewW * 0.5 + clamp((this.impactFrameWorldX - this.player.x) * 0.35, -180, 180);
      const cy = this.viewH * 0.54;
      const maxR = Math.hypot(this.viewW, this.viewH) * 0.72;
      ctx.globalAlpha = ratio * 0.85;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + ratio * 0.5;
        const inner = 75 + (i % 3) * 32;
        ctx.strokeStyle = i % 3 === 0 ? this.impactFrameColor : isPeak ? '#ffffff' : '#090b10';
        ctx.lineWidth = i % 2 === 0 ? 3.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3B. Subtle Cinematic Edge Vignette
    if (!this.cutscene.active) {
      const vig = ctx.createRadialGradient(
        this.viewW * 0.5,
        this.viewH * 0.5,
        this.viewW * 0.34,
        this.viewW * 0.5,
        this.viewH * 0.5,
        this.viewW * 0.72
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(4, 6, 12, 0.42)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    // 4. Peripheral Crimson Low-HP Vignette
    if (this.state === 'playing' && this.player.hp <= this.player.maxHp * 0.3 && !this.cutscene.active) {
      const pulse = 0.22 + 0.14 * Math.sin(this.elapsedTime * 7);
      const vig = ctx.createRadialGradient(
        this.viewW * 0.5,
        this.viewH * 0.5,
        this.viewW * 0.25,
        this.viewW * 0.5,
        this.viewH * 0.5,
        this.viewW * 0.65
      );
      vig.addColorStop(0, 'rgba(220, 38, 38, 0)');
      vig.addColorStop(1, `rgba(220, 38, 38, ${pulse})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    // 5. Full-screen Ultimate Cutscene Overlay
    if (this.cutscene.active) {
      this.cutscene.renderScreen(ctx, this.viewW, this.viewH);
    }

    ctx.restore();
  }

  private resolveHudDomainKind(): DomainKind {
    const ownerKind = this.getDomainOwnerKind();
    if (this.domainTimer <= 0 || ownerKind === 'none') return 'none';
    return this.activeDomainKind !== 'none' ? this.activeDomainKind : ownerKind;
  }

  private syncHudThrottled(dt: number): void {
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.08) {
      this.hudSyncAccum = 0;
      const domainKind = this.resolveHudDomainKind();
      const domainActive = domainKind !== 'none';
      const fp = [
        this.state,
        this.characterId,
        this.skinId,
        this.selectedStageIndex,
        this.actCode,
        this.actTitle,
        Math.ceil(this.player.hp),
        Math.ceil(this.player.trailHp),
        Math.round(this.player.rage),
        Math.round(this.player.awakening),
        this.player.awakened ? Math.ceil(this.player.awakenTimer * 2) : 0,
        domainActive ? `${domainKind}:${Math.ceil(this.domainTimer * 2)}` : 'none:0',
        this.timeStopTimer > 0 ? Math.ceil(this.timeStopTimer * 4) : 0,
        this.witchTimeTimer > 0 ? 1 : 0,
        this.arenaBuffKind ? `${this.arenaBuffKind}:${Math.ceil(this.arenaBuffTimer)}` : '-',
        this.waveBountyKind
          ? `${this.waveBountyKind}:${this.waveBountyDone ? 1 : 0}:${this.waveBountyProgress}:${Math.ceil(this.waveBountyTimer)}`
          : '-',
        this.blessingChoices ? 1 : 0,
        this.combo,
        Math.round(this.score),
        this.activeBoss ? `${Math.ceil(this.activeBoss.hp)}:${Math.round(this.activeBoss.posture)}:${this.activeBoss.phase}:${this.activeBoss.isStaggered() ? 1 : 0}` : '-1',
        this.bossIntroBanner ? 1 : 0,
        this.cutscene.active ? 1 : 0,
        this.enemies.length,
        this.iceWalls.some((w) => w.active && !w.launched) ? 1 : 0,
        this.player.skillLinkTimer > 0 ? 1 : 0,
        this.player.cryoCooldown > 0 ? this.player.cryoCooldown.toFixed(1) : '0',
        this.player.parryCooldown > 0 ? this.player.parryCooldown.toFixed(1) : '0',
        this.player.dashCooldown > 0 ? this.player.dashCooldown.toFixed(1) : '0',
        this.mode === 'solo1v1'
          ? `${this.solo1v1.phase}:${this.solo1v1.roundNumber}:${this.solo1v1.playerWins}:${this.solo1v1.botWins}:${Math.ceil(this.solo1v1.roundTimer)}:${this.solo1v1.getBannerText() ?? ''}:${this.soloOpponent ? `${Math.ceil(this.soloOpponent.hp)}:${Math.ceil(this.soloOpponent.trailHp)}:${Math.round(this.soloOpponent.botBrain.energy)}` : '0'}`
          : '-',
      ].join('|');
      if (fp !== this.lastHudFingerprint) {
        this.lastHudFingerprint = fp;
        this.emitHudSnapshot();
      }
    }
  }

  private emitHudSnapshot(): void {
    let bossInfo: BossHudInfo | null = null;
    if (this.activeBoss && this.activeBoss.alive) {
      bossInfo = {
        id: this.activeBoss.bossId,
        name: this.activeBoss.bossName,
        faction: this.activeBoss.faction,
        title: this.activeBoss.bossTitle,
        hp: Math.ceil(this.activeBoss.hp),
        maxHp: this.activeBoss.maxHp,
        trailHp: Math.ceil(this.activeBoss.trailHp),
        accentColor: this.activeBoss.accentColor,
        phase: this.activeBoss.phase,
        posture: Math.round(this.activeBoss.posture),
        maxPosture: this.activeBoss.maxPosture,
        staggered: this.activeBoss.isStaggered(),
      };
    }

    const standingIceWall = this.iceWalls.some((w) => w.active && !w.launched);
    const remaining = this.enemies.filter((e) => e.alive && !e.dying).length + this.pendingSpawns.length;
    const totalStagesStr = String(CAMPAIGN_STAGES.length).padStart(2, '0');

    let waveProgressText = '';
    if (this.mode === 'solo1v1') {
      waveProgressText = `SOLO 1V1 · HIỆP ${this.solo1v1.roundNumber}`;
    } else if (this.mode === 'training') {
      waveProgressText = 'LUYỆN TẬP TỰ DO';
    } else if (this.mode === 'boss_rush') {
      waveProgressText = `BOSS ${Math.min(BOSS_ORDER.length, this.bossesDefeated + 1)} / ${BOSS_ORDER.length}`;
    } else if (this.mode === 'endless') {
      waveProgressText = `TẦNG ${this.endlessWave} · ĐỊCH: ${remaining}`;
    } else {
      const stage = CAMPAIGN_STAGES[this.currentStageIndex] ?? CAMPAIGN_STAGES[0];
      if (this.stageSubWave < stage.waves.length) {
        waveProgressText = `MÀN ${stage.code}/${totalStagesStr} · ĐỢT ${this.stageSubWave + 1}/${stage.waves.length + 1} · ĐỊCH: ${remaining}`;
      } else {
        waveProgressText = `MÀN ${stage.code}/${totalStagesStr} · TRÙM CHƯƠNG`;
      }
    }

    let arenaBuffText: string | null = null;
    if (this.arenaBuffKind && this.arenaBuffTimer > 0) {
      const sec = this.arenaBuffTimer.toFixed(1);
      if (this.arenaBuffKind === 'thunder_overdrive') {
        arenaBuffText = `⚡ LÔI TỐC · GIẬT SÉT LAN (${sec}s)`;
      } else if (this.arenaBuffKind === 'crimson_might') {
        arenaBuffText = `🔥 CUỒNG SÁT · +28% DMG (${sec}s)`;
      } else {
        arenaBuffText = `🛡️ HỘ MỆNH · GIẢM 35% ST (${sec}s)`;
      }
    }

    let waveBountyText: string | null = null;
    if (this.waveBountyKind) {
      if (this.waveBountyDone) {
        waveBountyText = '✓ THỬ THÁCH ĐỢT HOÀN TẤT (+HP +NỘ)';
      } else if (this.waveBountyKind === 'combo') {
        waveBountyText = `🎯 THỬ THÁCH: Đạt ${this.combo}/${this.waveBountyTarget} Combo`;
      } else if (this.waveBountyKind === 'counter') {
        waveBountyText = `🎯 THỬ THÁCH: Parry/Né Hoàn Hảo ${this.waveBountyProgress}/${this.waveBountyTarget}`;
      } else {
        waveBountyText = `🎯 THỬ THÁCH: Quét sạch trong ${Math.max(0, Math.ceil(this.waveBountyTimer))}s`;
      }
    }

    const ch = this.player.character;
    const domainKind = this.resolveHudDomainKind();
    const domainActive = domainKind !== 'none';
    const awakenedProfile =
      this.player.awakened && this.skinId === 'default'
        ? getAwakenedVisualProfile(ch.id, this.skinId)
        : null;
    const activeSkills = awakenedProfile
      ? {
          ...ch.skills,
          specialName: awakenedProfile.upgradedSpecialName,
          specialActiveName: standingIceWall ? ch.skills.specialActiveName : awakenedProfile.upgradedSpecialName,
        }
      : ch.skills;

    this.onHudUpdate({
      state: this.state,
      mode: this.mode,
      characterId: ch.id,
      skinId: this.skinId,
      selectedStageIndex: this.selectedStageIndex,
      clearedStages: Array.from(this.clearedStages).sort((a, b) => a - b),
      characterName: ch.name,
      characterCodename: awakenedProfile ? awakenedProfile.formTitle : ch.codename,
      characterAccent: awakenedProfile ? awakenedProfile.auraAccent : ch.accentColor,
      characterSkills: activeSkills,
      actCode: this.actCode,
      actTitle: this.actTitle,
      actHint: this.actHint,
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      trailHp: Math.ceil(this.player.trailHp),
      rage: Math.round(this.player.rage),
      maxRage: this.player.maxRage,
      awakening: Math.round(this.player.awakening),
      maxAwakening: this.player.maxAwakening,
      awakened: this.player.awakened,
      awakenPrompt: this.awakenPromptTimer > 0 && !this.player.awakened && this.player.awakening >= this.player.maxAwakening,
      witchTimeActive: this.witchTimeTimer > 0,
      combo: this.combo,
      comboPulse: this.comboPulse,
      styleRank: computeStyleRank(this.styleScore),
      styleScore: Math.round(this.styleScore),
      score: Math.round(this.score),
      perfectParries: this.perfectParries,
      elapsedTime: this.elapsedTime,
      boss: bossInfo,
      bossIntro: this.bossIntroBanner ? { ...this.bossIntroBanner } : null,
      cooldowns: {
        dash: Number(this.player.dashCooldown.toFixed(1)),
        dashMax: this.player.dashCooldownMax,
        parry: Number(this.player.parryCooldown.toFixed(1)),
        parryMax: this.player.parryCooldownMax,
        cryo: Number(this.player.cryoCooldown.toFixed(1)),
        cryoMax: this.player.cryoCooldownMax,
        cryoActive: standingIceWall,
        skillLinkActive: this.player.skillLinkTimer > 0,
        skillLinkLabel: getElementalMarkSpec(ch.id).linkShortLabel,
        ultimateReady: this.player.rage >= this.player.maxRage,
        awakenReady: !this.player.awakened && this.player.awakening >= this.player.maxAwakening,
        awakened: this.player.awakened,
        awakenTimeLeft: Number(this.player.awakenTimer.toFixed(1)),
        awakenDuration: this.player.awakenDuration,
      },
      cutsceneActive: this.cutscene.active,
      cutsceneTitle: ch.skills.ultimateFullName,
      enemiesRemaining: remaining,
      waveProgressText,
      arenaBuffText,
      waveBountyText,
      waveBountyDone: this.waveBountyDone,
      domainActive,
      domainKind,
      domainTimeLeft: domainActive ? Number(this.domainTimer.toFixed(1)) : 0,
      timeStopActive: this.timeStopTimer > 0,
      timeStopTimeLeft: Number(Math.max(0, this.timeStopTimer).toFixed(1)),
      solo1v1: this.mode === 'solo1v1' ? this.solo1v1.buildHudState(this.soloOpponent) : null,
      blessingChoices: this.blessingChoices ? this.blessingChoices.map((c) => ({ ...c })) : null,
      activeBlessings: buildActiveBlessingBadges(this.blessingStacks),
      runStats: this.runStats,
      isTouchDevice: this.isTouchDevice,
    });
  }

  public getTestInternals() {
    return {
      player: this.player,
      bg: this.bg,
      enemies: this.enemies,
      activeBoss: this.activeBoss,
      particles: this.particles,
      mirrorRifts: this.mirrorRifts,
      temporalEchoes: this.temporalEchoes,
      timeStopTimer: this.timeStopTimer,
      timeStopStoredDamage: this.timeStopStoredDamage,
      activeDomainKind: this.activeDomainKind,
      projectiles: this.projectiles,
      domainTimer: this.domainTimer,
    };
  }

  private renderMacTienDomainBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number
  ): void {
    const blend = Math.max(0, Math.min(1, this.mactienDomainBlend));
    if (blend <= 0.005) return;
    const t = this.mactienDomainTime;
    const isXuanFeng = this.skinId === 'xuan_feng_sage';

    ctx.save();
    try {
      // 1. Minimalist sumi-e ink-wash mist gradient (moonlight-jade for Xuân Phong, sumi-e dark vignette for default)
      const radGrad = ctx.createRadialGradient(
        viewW * 0.5,
        viewH * 0.48,
        Math.min(viewW, viewH) * 0.14,
        viewW * 0.5,
        viewH * 0.5,
        Math.max(viewW, viewH) * 0.72
      );
      if (isXuanFeng) {
        radGrad.addColorStop(0, `rgba(248, 250, 252, ${0.09 * blend})`);
        radGrad.addColorStop(0.58, `rgba(20, 48, 52, ${0.18 * blend})`);
        radGrad.addColorStop(1, `rgba(15, 23, 42, ${0.38 * blend})`);
      } else {
        radGrad.addColorStop(0, `rgba(244, 241, 234, ${0.06 * blend})`);
        radGrad.addColorStop(0.58, `rgba(20, 24, 32, ${0.22 * blend})`);
        radGrad.addColorStop(1, `rgba(10, 12, 18, ${0.52 * blend})`);
      }
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2. Faint slow-drifting calligraphy characters & seal rings in far background
      const glyphs = ['静', '墨', '竹', '春'];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < glyphs.length; i++) {
        const gx = ((viewW * (0.16 + i * 0.23) - t * (10 + i * 2.5)) % (viewW + 160) + viewW + 160) % (viewW + 160) - 80;
        const gy = viewH * (0.22 + (i % 2) * 0.24) + Math.sin(t * 0.65 + i * 1.9) * 18;
        const gSize = 54 + (i % 2) * 18;

        ctx.font = `900 ${gSize}px serif`;
        ctx.fillStyle = isXuanFeng
          ? i % 2 === 0
            ? `rgba(248, 250, 252, ${0.09 * blend})`
            : `rgba(94, 234, 212, ${0.08 * blend})`
          : i % 2 === 0
            ? `rgba(244, 241, 234, ${0.08 * blend})`
            : `rgba(253, 224, 71, ${0.07 * blend})`;
        ctx.fillText(glyphs[i], gx, gy);

        // Faint rotating seal ring behind alternate glyphs
        if (i % 2 === 0) {
          ctx.save();
          try {
            ctx.translate(gx, gy);
            ctx.rotate(t * 0.25 * (i === 0 ? 1 : -1));
            ctx.strokeStyle = isXuanFeng
              ? `rgba(94, 234, 212, ${0.14 * blend})`
              : `rgba(239, 68, 68, ${0.1 * blend})`;
            ctx.lineWidth = isXuanFeng ? 1.3 : 1.6;
            ctx.setLineDash([14, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, gSize * 0.68, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
      }

      // 3. Softly falling petals & bamboo leaves
      for (let i = 0; i < 10; i++) {
        const speedY = 26 + (i % 4) * 9;
        const ly = ((i * 73 + t * speedY) % (viewH + 60)) - 30;
        const lx =
          ((i * 157 + t * (14 + (i % 3) * 5) + Math.sin(t * 1.4 + i) * 32) % (viewW + 80) + viewW + 80) %
            (viewW + 80) -
          40;
        const rot = t * (0.9 + (i % 3) * 0.35) + i * 1.2;
        const leafLen = 9 + (i % 3) * 2.5;
        ctx.save();
        try {
          ctx.translate(lx, ly);
          ctx.rotate(rot);
          if (isXuanFeng) {
            if (i % 2 === 0) {
              // Peach blossom petal
              ctx.fillStyle = `rgba(253, 164, 175, ${0.46 * blend})`;
              ctx.beginPath();
              ctx.ellipse(0, 0, leafLen * 0.55, leafLen * 0.32, 0, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Jade bamboo leaf
              ctx.fillStyle = `rgba(94, 234, 212, ${0.38 * blend})`;
              ctx.beginPath();
              ctx.moveTo(-leafLen * 0.9, 0);
              ctx.quadraticCurveTo(0, -2.8, leafLen * 0.9, 0);
              ctx.quadraticCurveTo(0, 2.8, -leafLen * 0.9, 0);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            ctx.fillStyle =
              i % 3 === 0
                ? `rgba(253, 224, 71, ${0.42 * blend})`
                : `rgba(245, 158, 11, ${0.34 * blend})`;
            ctx.beginPath();
            ctx.moveTo(-leafLen, 0);
            ctx.quadraticCurveTo(0, -3.2, leafLen, 0);
            ctx.quadraticCurveTo(0, 3.2, -leafLen, 0);
            ctx.closePath();
            ctx.fill();
          }
        } finally {
          ctx.restore();
        }
      }
    } finally {
      ctx.restore();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (
      this.rafId !== null &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeCleanup?.();
    this.input.destroy();
    this.audio.destroy();
  }
}
