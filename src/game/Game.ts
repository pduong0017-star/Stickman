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
import type {
  ActionKey,
  AudioSettings,
  BossHudInfo,
  BossIntroBanner,
  CharacterId,
  EnemyType,
  GameMode,
  GameState,
  HudSnapshot,
  RunStats,
} from './types';
import { getCharacterDef } from './characters';
import { getAwakenedVisualProfile } from './animation';
import { AudioEngine } from './AudioEngine';
import { Camera } from './Camera';
import { InputHandler } from './InputHandler';
import { ParticleSystem } from './ParticleSystem';
import { PeriodicTableBG } from './PeriodicTableBG';
import { Player } from './Player';
import { Enemy, type EnemyAttackHit } from './Enemy';
import { Boss } from './Boss';
import { IceWall, MagicCircle, MagmaPillar, PlasticChair, Projectile } from './Entities';
import { UltimateCutscene } from './UltimateCutscene';
import {
  computeDetonationDamage,
  computeOverdriveUltimateDamage,
  computeSynergyCooldownRefund,
  getElementalMarkSpec,
} from './synergy';

const BEST_SCORE_KEY = 'scarlet_sheath_best_score_v1';
const SELECTED_CHAR_KEY = 'scarlet_sheath_char_v1';

interface PendingSpawn {
  delay: number;
  type: EnemyType;
  side: 'left' | 'right';
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
  private pendingSpawns: PendingSpawn[] = [];

  private state: GameState = 'title';
  private mode: GameMode = 'story';
  private characterId: CharacterId = 'kuro';
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private viewW = 1280;
  private viewH = 720;
  private dpr = 1;
  private resizeObserver: ResizeObserver | null = null;
  private isTouchDevice = false;

  // Combat & Wave State
  private hitstopTimer = 0;
  private impactFrameTimer = 0;
  private impactFrameDuration = 0.05;
  private impactFrameColor = '#ef4444';
  private impactFrameWorldX = ARENA_WIDTH * 0.5;
  private impactFrameWorldY = GROUND_Y - 56;
  private bossIntroTimer = 0;
  private bossIntroBanner: BossIntroBanner | null = null;
  private waveStage = 0; // 0: Act01, 1: Act02, 2: Act03 Swarm, 3+: Boss Rush index (waveStage - 3)
  private nextWaveDelay = 0;
  private activeAttackTokens = 0;
  private readonly maxAttackTokens = 3;
  private defeatBeatTimer = 0;
  private pendingOutcome: 'victory' | 'gameover' | null = null;
  private awakenPromptTimer = 0;
  private fableAwakeningTriggered = false;

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
  private actTitle = 'MAIN FIGHT';
  private actHint = STORY_ACTS[0].hint;
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
        this.player.setCharacter(def.id);
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
    const def = getCharacterDef(id);
    this.characterId = def.id;
    this.player.setCharacter(def.id);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SELECTED_CHAR_KEY, def.id);
      } catch {
        // ignore storage errors
      }
    }
    if (fromUserGesture) {
      this.audio.unlock();
      this.audio.playSlash(1, false);
    }
    if (this.state === 'title') {
      this.particles.emitShockwave(this.player.x, this.player.y - 45, def.accentColor, 85, 0.28);
      this.particles.emitSparks(this.player.x, this.player.y - 48, 12, def.accentColor, 360);
    }
    this.emitHudSnapshot();
  }

  public getCharacterId(): CharacterId {
    return this.characterId;
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
    this.pendingSpawns = [];
    this.cutscene.active = false;
    this.bossIntroTimer = 0;
    this.bossIntroBanner = null;
    this.runStats = null;

    // Protagonist sits coolly on white plastic chair framed prominently on the right third for Title screen
    const chairX = ARENA_WIDTH * 0.56;
    this.player.setCharacter(this.characterId);
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
    this.pendingSpawns = [];
    this.cutscene.active = false;
    this.hitstopTimer = 0;
    this.bossIntroTimer = 0;
    this.bossIntroBanner = null;
    this.activeAttackTokens = 0;
    this.defeatBeatTimer = 0;
    this.pendingOutcome = null;
    this.awakenPromptTimer = 0;
    this.fableAwakeningTriggered = false;
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

    // Spawn player in center on plastic chair (standing up automatically when input or enemy arrives)
    const startX = ARENA_WIDTH * 0.5;
    this.player.setCharacter(this.characterId);
    this.player.reset(startX, true);
    this.player.facing = 1;
    this.chair = new PlasticChair(startX, GROUND_Y);
    this.camera.reset(startX, GROUND_Y - 115);

    if (mode === 'training') {
      this.player.rage = this.player.maxRage;
      this.player.awakening = this.player.maxAwakening;
      this.actCode = 'TR';
      this.actTitle = 'TRAINING LAB';
      this.actHint = `Vô hạn Nộ [I] & Thức Tỉnh [O] · Thử ${this.player.character.skills.specialName} [U] & Parry [K]`;
      this.spawnTrainingBots();
      this.audio.setBgmActive(true, 1);
    } else if (mode === 'boss_rush') {
      this.waveStage = 3;
      this.actCode = '04';
      this.actTitle = 'BOSS RUSH';
      this.actHint = STORY_ACTS[3].hint;
      this.nextWaveDelay = 0.25;
      this.audio.setBgmActive(true, 2);
    } else {
      // Story / Wave Mode
      this.waveStage = 0;
      this.setupStoryWave(0);
      this.audio.setBgmActive(true, 1);
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.emitHudSnapshot();
  }

  public pauseGame(): void {
    if (this.state !== 'playing') return;
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
      new Enemy('meta_melee', this.player.x + 280, true),
      new Enemy('deepseek_gunner', this.player.x + 480, true),
      new Enemy('swarm_blade', this.player.x - 310, true),
    ];
  }

  private setupStoryWave(stage: number): void {
    this.pendingSpawns = [];
    if (stage === 0) {
      // Act 01: MAIN FIGHT (META melee + DEEPSEEK gunners)
      this.actCode = STORY_ACTS[0].code;
      this.actTitle = STORY_ACTS[0].title;
      this.actHint = STORY_ACTS[0].hint;
      this.pendingSpawns = [
        { delay: 1.4, type: 'meta_melee', side: 'right' },
        { delay: 1.9, type: 'meta_melee', side: 'left' },
        { delay: 2.9, type: 'deepseek_gunner', side: 'right' },
        { delay: 4.0, type: 'meta_melee', side: 'left' },
        { delay: 4.8, type: 'deepseek_gunner', side: 'left' },
      ];
    } else if (stage === 1) {
      // Act 02: CRYO CRUSH (Ranged gunners + melee wave)
      this.actCode = STORY_ACTS[1].code;
      this.actTitle = STORY_ACTS[1].title;
      this.actHint = STORY_ACTS[1].hint;
      this.pendingSpawns = [
        { delay: 0.7, type: 'deepseek_gunner', side: 'right' },
        { delay: 1.1, type: 'deepseek_gunner', side: 'right' },
        { delay: 1.5, type: 'meta_melee', side: 'right' },
        { delay: 2.2, type: 'meta_melee', side: 'left' },
        { delay: 3.1, type: 'deepseek_gunner', side: 'left' },
        { delay: 3.7, type: 'swarm_blade', side: 'right' },
      ];
    } else if (stage === 2) {
      // Act 03: SCARLET SHEATH (Large Swarm!)
      this.actCode = STORY_ACTS[2].code;
      this.actTitle = STORY_ACTS[2].title;
      this.actHint = STORY_ACTS[2].hint;
      // Give generous rage boost so player can charge up Scarlet Sheath during the swarm
      this.player.addRage(35, false);
      for (let i = 0; i < 10; i++) {
        this.pendingSpawns.push({
          delay: 0.4 + i * 0.45,
          type: i % 3 === 0 ? 'meta_melee' : 'swarm_blade',
          side: i % 2 === 0 ? 'right' : 'left',
        });
      }
    } else {
      // Act 04: BOSS RUSH (5 Bosses sequentially)
      const bossIdx = stage - 3;
      if (bossIdx >= BOSS_ORDER.length) {
        this.triggerOutcome('victory');
        return;
      }
      const bossId = BOSS_ORDER[bossIdx];
      const meta = BOSS_ROSTER[bossId];
      this.actCode = STORY_ACTS[3].code;
      this.actTitle = `BOSS ${bossIdx + 1}/${BOSS_ORDER.length} · ${meta.name}`;
      this.actHint = meta.hint;

      // Spawn Boss on opposite side of player with dramatic 0.8s intro freeze!
      const spawnSide = this.player.x < ARENA_WIDTH * 0.5 ? 1 : -1;
      const spawnX = clamp(this.player.x + spawnSide * 440, 140, ARENA_WIDTH - 140);
      const boss = new Boss(bossId, spawnX);
      boss.facing = spawnSide === 1 ? -1 : 1;
      this.activeBoss = boss;
      this.enemies.push(boss);

      // Heal player slightly between bosses
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 38);
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
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt);
      this.render();

      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    if (this.state === 'title') {
      this.bg.update(dt, false);
      this.player.updateIdleOnTitle(dt, this.particles);
      this.particles.update(dt);
      this.camera.update(dt, this.viewW, this.viewH);
      return;
    }

    if (this.state !== 'playing') {
      return;
    }

    // Visual effects & camera always tick in real dt even during hitstop/intro
    this.bg.update(dt, this.player.awakened);
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

    // Hit-stop freeze (30ms - 80ms)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.elapsedTime += dt;

    // Combo & Style decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
    this.styleScore = decayStyleScore(this.styleScore, dt);

    // Process pending wave spawns
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      this.pendingSpawns[i].delay -= dt;
      if (this.pendingSpawns[i].delay <= 0) {
        const sp = this.pendingSpawns.splice(i, 1)[0];
        const spawnX =
          sp.side === 'right'
            ? clamp(this.player.x + 560, 120, ARENA_WIDTH - 80)
            : clamp(this.player.x - 560, 80, ARENA_WIDTH - 120);
        this.enemies.push(new Enemy(sp.type, spawnX, false));
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

    // Update Player
    const trainingMode = this.mode === 'training';
    this.player.update({
      dt,
      input: this.input,
      audio: this.audio,
      particles: this.particles,
      camera: this.camera,
      chair: this.chair,
      iceWalls: this.iceWalls,
      magmaPillars: this.magmaPillars,
      projectiles: this.projectiles,
      trainingMode,
      hasActiveEnemies: this.enemies.some((e) => e.alive && !e.dying),
      onRequestUltimate: () => this.activateScarletSheath(),
      onRequestAwaken: () => {
        if (this.player.triggerAwakening(this.audio, this.particles, this.camera)) {
          this.bg.triggerCrimsonFlash(0.95);
          this.audio.setBgmIntensity(2);
          this.awakenPromptTimer = 0;
          this.triggerImpactFrame(
            this.player.x,
            this.player.y - 54,
            this.player.character.awakeningWaveColor,
            0.065
          );
          // Awakening-Cancel Shockwave: launches nearby foes slightly upward & brands them with Elemental Marks!
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying) continue;
            if (Math.abs(enemy.x - this.player.x) < 260) {
              enemy.applyElementalMark(this.player.character.id, 2, this.particles);
              if (!enemy.isBoss()) {
                enemy.vy = Math.min(enemy.vy, -240);
                enemy.onGround = false;
              }
            }
          }
        }
      },
      onThunderBlinkHit: (fromX, toX, y, dir, damage) => {
        const minX = Math.min(fromX, toX) - 42;
        const maxX = Math.max(fromX, toX) + 42;
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          if (enemy.x >= minX && enemy.x <= maxX && Math.abs(enemy.y - 48 - y) < 102) {
            const killed = enemy.takeDamage(
              damage,
              dir * 290,
              -200,
              this.particles,
              this.audio,
              true
            );
            enemy.applyElementalMark('raijin', 2, this.particles);
            enemy.applyStun(enemy.isBoss() ? 0.9 : 1.45, this.particles);
            this.particles.emitLightning(enemy.x, enemy.y - 52, '#fef08a', 58);
            this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.25 * dir, 210, '#22d3ee', 10);
            this.registerPlayerHit(damage, 32, true, killed, enemy);
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.05);
          }
        }
      },
      onCryoSummonChill: (centerX, radius) => {
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying) continue;
          if (Math.abs(enemy.x - centerX) <= radius) {
            enemy.applyElementalMark('kuro', 2, this.particles);
            this.particles.emitIceShards(enemy.x, enemy.y - 48, 8, enemy.x >= centerX ? 1 : -1);
          }
        }
      },
      onSkillLinkWarp: (kind) => {
        // Find nearest marked enemy first, falling back to nearest alive enemy within 650px!
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
        // Detonate immediately on warp arrival for Zero!
        this.detonateElementalMarks(kind, best.x, best.y - 52, 230);
        return { warpedToX, warpedFacing };
      },
      onDetonateAllMarks: (kind, originX, originY, maxRange) =>
        this.detonateElementalMarks(kind, originX, originY, maxRange),
    });

    // Update Magma Pillars (Kagura [U] Skill)
    for (let i = this.magmaPillars.length - 1; i >= 0; i--) {
      const mp = this.magmaPillars[i];
      const erupted = mp.update(dt, this.particles);
      if (erupted) {
        this.audio.playCryoShatter();
        this.camera.addShake(0.32, 0, -1);
      }
      if (mp.erupted) {
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying || mp.hitEnemyIds.has(enemy.id)) continue;
          if (Math.abs(enemy.x - mp.x) < 66 && enemy.y > GROUND_Y - 195) {
            mp.hitEnemyIds.add(enemy.id);
            const killed = enemy.takeDamage(
              mp.damage,
              mp.dir * 240,
              -420,
              this.particles,
              this.audio,
              true
            );
            enemy.applyElementalMark('kagura', 2, this.particles);
            this.particles.emitText(enemy.x, enemy.y - 100, 'VIÊM ẤN!', '#fb923c', 20);
            this.registerPlayerHit(mp.damage, 30, true, killed, enemy);
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
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying || wall.hitEnemyIds.has(enemy.id)) continue;
          const hitRadius = wall.overcharged ? 86 : 64;
          if (Math.abs(enemy.x - wall.x) < hitRadius && Math.abs(enemy.y - wall.y) < 115) {
            wall.hitEnemyIds.add(enemy.id);
            const baseCrush = enemy.isBoss() ? 78 : 130;
            const crushDmg = wall.overcharged ? Math.round(baseCrush * 1.45) : baseCrush;
            const killed = enemy.takeDamage(
              crushDmg,
              wall.dir * (wall.overcharged ? 620 : 520),
              -310,
              this.particles,
              this.audio,
              true
            );
            enemy.applyElementalMark('kuro', wall.overcharged ? 3 : 2, this.particles);
            if (wall.overcharged) {
              enemy.applyStun(enemy.isBoss() ? 1.1 : 1.7, this.particles);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.35 * wall.dir, 260, '#ef4444', 14);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.35 * wall.dir, 240, '#38bdf8', 12);
              this.triggerImpactFrame(enemy.x, enemy.y - 52, '#38bdf8', 0.055);
              this.detonateElementalMarks('kuro', enemy.x, enemy.y - 52, 180);
            }
            this.particles.emitText(
              enemy.x,
              enemy.y - 98,
              wall.overcharged ? 'BĂNG HUYẾT PHÁ!' : 'CRUSHED!',
              wall.overcharged ? '#fca5a5' : '#38bdf8',
              26
            );
            this.particles.emitIceShards(enemy.x, enemy.y - 50, wall.overcharged ? 24 : 14, wall.dir);
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

    // Update Player Melee Hitbox vs Enemies
    if (this.player.activeHitbox) {
      const hb = this.player.activeHitbox;
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.dying || hb.hitIds.has(enemy.id)) continue;
        const dx = Math.abs(enemy.x - hb.x);
        const dy = Math.abs(enemy.y - 48 - hb.y);
        if (dx < hb.width * 0.5 + 24 && dy < hb.height * 0.5 + 42) {
          hb.hitIds.add(enemy.id);
          // Check Haiku frontal shield!
          if (
            isAttackBlockedByShield(
              enemy.x,
              enemy.facing,
              this.player.x,
              enemy.isShieldActive(),
              hb.unblockable
            )
          ) {
            this.audio.playShieldClang();
            this.particles.emitSparks(enemy.x + enemy.facing * 24, enemy.y - 52, 12, '#38bdf8', 420);
            this.particles.emitText(enemy.x, enemy.y - 102, 'GUARD!', '#38bdf8', 20);
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.032);
            continue;
          }

          const killed = enemy.takeDamage(
            hb.damage,
            hb.knockX,
            hb.knockY,
            this.particles,
            this.audio,
            hb.heavy
          );
          const chId = this.player.character.id;
          const accentCol = this.player.awakened
            ? this.player.character.awakeningWaveColor
            : this.player.character.accentColor;

          // Razor directional slash smear on heavy, finisher, and Link hits!
          if (hb.heavy || hb.isLinkArt) {
            const ang = (Math.random() - 0.5) * 0.9 - 0.25 * this.player.facing;
            this.particles.emitSlashBeam(enemy.x, enemy.y - 54, ang, hb.isLinkArt ? 260 : 195, accentCol, hb.isLinkArt ? 13 : 9);
          }

          if (hb.applyMarkStacks && hb.applyMarkStacks > 0 && !killed) {
            enemy.applyElementalMark(chId, hb.applyMarkStacks, this.particles);
          }

          this.registerPlayerHit(hb.damage, hb.isLinkArt ? 42 : hb.heavy ? 26 : 16, hb.heavy, killed, enemy);

          // Trigger Elemental Detonation if finisher / Link Art / Dash-Slash hits a marked enemy!
          if (hb.detonateMark && enemy.markKind === chId && enemy.markStacks > 0) {
            this.detonateElementalMarks(chId, enemy.x, enemy.y - 52, chId === 'raijin' ? 460 : 210);
          } else if (hb.isLinkArt || (hb.heavy && this.player.comboStep === 6) || killed) {
            this.triggerImpactFrame(enemy.x, enemy.y - 54, accentCol, hb.isLinkArt ? 0.052 : 0.038);
          }

          this.hitstopTimer = Math.max(this.hitstopTimer, hb.isLinkArt ? 0.062 : hb.heavy ? 0.048 : 0.022);
          this.camera.addShake(hb.isLinkArt ? 0.45 : hb.heavy ? 0.34 : 0.14, this.player.facing, 0);
        }
      }
    }

    // Update Magic Circles (Final Boss Fable)
    for (let i = this.magicCircles.length - 1; i >= 0; i--) {
      const mc = this.magicCircles[i];
      const erupted = mc.update(dt, this.particles);
      if (erupted) {
        this.audio.playLaser();
        this.camera.addShake(0.32, 0, 1);
      }
      if (mc.erupted && !mc.hitPlayer && Math.abs(this.player.x - mc.x) < mc.radius * 0.78 && this.player.y > GROUND_Y - 140) {
        mc.hitPlayer = true;
        const dir: 1 | -1 = this.player.x >= mc.x ? 1 : -1;
        this.applyEnemyDamageToPlayer(20, dir, false, null);
      }
      if (!mc.active) {
        this.magicCircles.splice(i, 1);
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.fromPlayer) {
        // Player Sword Waves, Kunai, Volt Lances, Fire Waves or Reflected Enemy Projectiles hitting enemies!
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.dying || proj.hitEnemyIds.has(enemy.id)) continue;
          if (Math.abs(enemy.x - proj.x) < proj.radius + 26 && Math.abs(enemy.y - 52 - proj.y) < proj.radius + 46) {
            proj.hitEnemyIds.add(enemy.id);
            const dir = Math.sign(proj.vx || 1);
            const killed = enemy.takeDamage(
              proj.damage,
              dir * 380,
              -150,
              this.particles,
              this.audio,
              true
            );
            // Apply Elemental Marks from character projectiles!
            if (proj.kind === 'kunai' || proj.kind === 'void_crescent') {
              enemy.applyElementalMark('zero', 1, this.particles);
            } else if (proj.kind === 'volt_lance') {
              enemy.applyElementalMark('raijin', 1, this.particles);
            } else if (proj.kind === 'fire_wave') {
              if (enemy.markKind === 'kagura' && enemy.markStacks >= 2) {
                this.detonateElementalMarks('kagura', enemy.x, enemy.y - 52, 220);
              } else {
                enemy.applyElementalMark('kagura', 1, this.particles);
              }
            } else if (proj.kind === 'sword_wave') {
              enemy.applyElementalMark('kuro', 1, this.particles);
            }
            this.particles.emitSlashBeam(enemy.x, enemy.y - 52, Math.atan2(proj.vy, proj.vx), 185, proj.color, 9);
            this.registerPlayerHit(proj.damage, 30, true, killed, enemy);
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.042);
            this.camera.addShake(0.35, dir, 0);
            if (
              proj.kind !== 'sword_wave' &&
              proj.kind !== 'volt_lance' &&
              proj.kind !== 'fire_wave' &&
              proj.kind !== 'void_crescent'
            ) {
              proj.active = false;
              break;
            }
          }
        }
      } else {
        // Enemy projectile vs Standing Ice Wall!
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

        // Enemy projectile vs Player (Parry Reflection or Hit!)
        if (
          Math.abs(proj.x - this.player.x) < proj.radius + 32 &&
          Math.abs(proj.y - (this.player.y - 52)) < proj.radius + 44
        ) {
          if (this.player.isParrying()) {
            // PERFECT PARRY DEFLECTION!
            const reflected = computeReflectedProjectile(proj.vx, proj.vy, proj.damage);
            proj.vx = reflected.vx;
            proj.vy = reflected.vy;
            proj.damage = reflected.damage;
            proj.fromPlayer = true;
            proj.reflected = true;
            proj.life = 0;
            this.onPerfectParry(proj.x, proj.y, null);
          } else if (!this.player.isInvulnerable()) {
            const dir: 1 | -1 = proj.vx >= 0 ? 1 : -1;
            this.applyEnemyDamageToPlayer(proj.damage, dir, false, null);
            proj.active = false;
          }
        }
      }
    }

    // Update Enemies & Bosses
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy instanceof Boss) {
        enemy.updateBoss({
          dt,
          playerX: this.player.x,
          playerY: this.player.y,
          projectiles: this.projectiles,
          magicCircles: this.magicCircles,
          particles: this.particles,
          audio: this.audio,
          onMeleeHit: (hit) => this.resolveEnemyMeleeHit(hit),
          onTriggerFableAwakening: () => this.triggerFableAwakeningEvent(),
        });
      } else {
        enemy.update({
          dt,
          playerX: this.player.x,
          playerY: this.player.y,
          requestToken: () => {
            if (this.activeAttackTokens >= this.maxAttackTokens) return false;
            this.activeAttackTokens++;
            return true;
          },
          releaseToken: () => {
            this.activeAttackTokens = Math.max(0, this.activeAttackTokens - 1);
          },
          projectiles: this.projectiles,
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
          this.activeBoss = null;
          this.bossesDefeated++;
          this.audio.setBgmIntensity(this.player.awakened ? 2 : 1);
        }
        this.enemies.splice(i, 1);
      }
    }

    // Training Mode respawns bots automatically if cleared
    if (this.mode === 'training' && this.enemies.length === 0) {
      this.nextWaveDelay += dt;
      if (this.nextWaveDelay >= 1.4) {
        this.nextWaveDelay = 0;
        this.spawnTrainingBots();
      }
    } else if (this.mode !== 'training') {
      // Story & Boss Rush Wave Progression
      const anyAlive = this.enemies.length > 0 || this.pendingSpawns.length > 0;
      if (!anyAlive) {
        if (this.nextWaveDelay <= 0) {
          this.nextWaveDelay = 1.6;
        } else {
          this.nextWaveDelay -= dt;
          if (this.nextWaveDelay <= 0) {
            if (this.mode === 'boss_rush') {
              const bossIdx = this.waveStage - 3;
              if (bossIdx >= BOSS_ORDER.length) {
                this.triggerOutcome('victory');
              } else {
                this.setupStoryWave(this.waveStage);
                this.waveStage++;
              }
            } else {
              this.waveStage++;
              this.setupStoryWave(this.waveStage);
            }
          }
        }
      }
    }

    // Dynamic Camera tracking
    if (this.activeBoss && !this.activeBoss.dying) {
      const midX = this.player.x * 0.65 + this.activeBoss.x * 0.35;
      this.camera.setTarget(midX, GROUND_Y - 122, 1.0);
    } else {
      this.camera.setTarget(this.player.x + this.player.facing * 65, this.player.y - 118, 1.0);
    }

    // Check player defeat
    if (this.player.hp <= 0 && !this.pendingOutcome) {
      this.triggerOutcome('gameover');
    }

    this.input.update(dt);
    this.syncHudThrottled(dt);
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

    this.applyEnemyDamageToPlayer(hit.damage, hit.dir, false, hit.source);
  }

  private applyEnemyDamageToPlayer(
    damage: number,
    dir: 1 | -1,
    _unblockable: boolean,
    _source: Enemy | null
  ): void {
    const taken = this.player.takeDamage(
      damage,
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
    this.perfectParries++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 4.2;
    this.comboPulse = 1;
    this.styleScore = Math.min(620, this.styleScore + 95);
    this.score += 250;

    // Rapidly charge Rage & Awakening on Perfect Parry!
    this.player.addRage(38, this.mode === 'training');
    this.player.addAwakening(26, this.mode === 'training');
    this.player.notifyPerfectParry();
    this.player.parryCooldown = 0.08; // Allow chaining parries against Opus!
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.3);

    this.audio.playParry();
    this.hitstopTimer = 0.075;
    this.triggerImpactFrame(fxX, fxY, '#38bdf8', 0.055);
    this.camera.pulseZoom(1.16, 0.24);
    this.camera.addShake(0.45, -this.player.facing, 0);
    this.particles.emitSparks(fxX, fxY, 26, '#38bdf8', 680);
    this.particles.emitSparks(fxX, fxY, 12, '#ffffff', 520);
    this.particles.emitShockwave(fxX, fxY, '#38bdf8', 115, 0.28);
    this.particles.emitSlashBeam(fxX, fxY, -0.4, 220, '#38bdf8', 11);
    this.particles.emitText(this.player.x, this.player.y - 108, 'PERFECT PARRY!', '#38bdf8', 26);

    if (attacker) {
      attacker.applyElementalMark(this.player.character.id, 3, this.particles);
      if (attacker instanceof Boss && attacker.bossId === 'boss_haiku') {
        attacker.breakShield(this.particles);
      } else {
        attacker.applyStun(attacker.isBoss() ? 1.45 : 2.1, this.particles);
      }
    }
  }

  private triggerImpactFrame(worldX: number, worldY: number, color: string, duration = 0.05): void {
    this.impactFrameWorldX = worldX;
    this.impactFrameWorldY = worldY;
    this.impactFrameColor = color;
    this.impactFrameDuration = duration;
    this.impactFrameTimer = Math.max(this.impactFrameTimer, duration);
  }

  /**
   * Core Skill-Synergy Detonation Engine!
   * Consumes matching Elemental Marks on enemies within maxRange and executes each fighter's
   * signature chain-reaction burst, cooldown refunds, and Sakuga impact frames.
   */
  private detonateElementalMarks(
    kind: CharacterId,
    originX: number,
    originY: number,
    maxRange: number
  ): number {
    const spec = getElementalMarkSpec(kind);
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

      const burstDmg = computeDetonationDamage(
        kind,
        mark.stacks,
        this.player.awakened,
        this.player.character.damageMultiplier
      );
      const knockDir = enemy.x >= this.player.x ? 1 : -1;
      const launchY = kind === 'kagura' ? -440 : kind === 'kuro' ? -240 : -210;
      const killed = enemy.takeDamage(
        burstDmg,
        knockDir * (kind === 'kuro' ? 420 : 280),
        launchY,
        this.particles,
        this.audio,
        true
      );

      // Character-specific Visual & Tactical Detonation Payoffs!
      if (kind === 'raijin') {
        // Chain Lightning Arcs jumping from player/prev target to every marked enemy!
        this.particles.emitChainArc(prevX, prevY, enemy.x, enemy.y - 54, '#facc15', 6.5);
        this.particles.emitChainArc(prevX, prevY - 12, enemy.x, enemy.y - 44, '#22d3ee', 4.5);
        this.particles.emitLightning(enemy.x, enemy.y - 115, '#fef08a', 110);
        if (!killed) enemy.applyStun(enemy.isBoss() ? 0.85 : 1.35, this.particles);
        this.audio.playLaser();
      } else if (kind === 'kagura') {
        // Synchronized Magma Chain Eruption beneath every burning enemy!
        this.particles.emitShockwave(enemy.x, enemy.y - 46, '#f97316', 135, 0.3);
        this.particles.emitEmbers(enemy.x, enemy.y - 50, 26, '#fde047');
        this.magmaPillars.push(
          new MagmaPillar(clamp(enemy.x, 64, ARENA_WIDTH - 64), knockDir as 1 | -1, 0.05, Math.round(burstDmg * 0.65))
        );
        this.audio.playCryoShatter();
      } else if (kind === 'zero') {
        // Twin Emerald X-Cross Shadow Execute Beams + Air Jump Refill!
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.65, 290, '#10b981', 15);
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.65, 290, '#a7f3d0', 13);
        this.particles.emitShockwave(enemy.x, enemy.y - 54, '#34d399', 120, 0.28);
        this.player.jumpsLeft = this.player.character.maxJumps;
      } else {
        // Kuro Frost-Blood Shatter Explosion!
        this.particles.emitIceShards(enemy.x, enemy.y - 54, 24, knockDir);
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, -0.45, 270, '#ef4444', 14);
        this.particles.emitSlashBeam(enemy.x, enemy.y - 54, 0.45, 250, '#38bdf8', 12);
        this.particles.emitShockwave(enemy.x, enemy.y - 54, '#38bdf8', 130, 0.3);
        if (!killed) enemy.applyStun(enemy.isBoss() ? 0.75 : 1.25, this.particles);
        this.audio.playCryoShatter();
      }

      this.particles.emitText(
        enemy.x,
        enemy.y - 116,
        `${spec.detonateCallout} x${mark.stacks}`,
        spec.secondaryColor,
        26
      );
      this.registerPlayerHit(burstDmg, 48 + mark.stacks * 16, true, killed, enemy);
      prevX = enemy.x;
      prevY = enemy.y - 54;
    }

    if (detonatedCount > 0) {
      const refund = computeSynergyCooldownRefund(kind, detonatedCount);
      this.player.cryoCooldown = Math.max(0, this.player.cryoCooldown - refund.specialRefund);
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - refund.dashRefund);
      if (refund.healAmount > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + refund.healAmount);
      }
      this.player.addRage(refund.rageBonus, this.mode === 'training');
      this.triggerImpactFrame(prevX, prevY, spec.secondaryColor, 0.06);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.068);
      this.camera.pulseZoom(1.16, 0.24);
      this.camera.addShake(0.54, this.player.facing, 0);
    }

    return detonatedCount;
  }

  private registerPlayerHit(
    damage: number,
    styleGain: number,
    _heavy: boolean,
    killed: boolean,
    enemy: Enemy
  ): void {
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.8;
    this.comboPulse = 1;
    this.styleScore = Math.min(620, this.styleScore + styleGain);
    this.score += damage * 3 + this.combo * 8;

    const training = this.mode === 'training';
    this.player.addRage(killed ? 14 : 6.5, training);
    this.player.addAwakening(killed ? 11 : 4.5, training);

    if (killed) {
      this.enemiesDefeated++;
      this.score += enemy.scoreValue;
      // Kagura Awakened Lifesteal Perk
      if (this.player.awakened && this.player.character.awakeningLifestealOnKill > 0) {
        this.player.hp = Math.min(
          this.player.maxHp,
          this.player.hp + this.player.character.awakeningLifestealOnKill
        );
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
    const isOverdrive = this.player.awakened;

    this.cutscene.start(
      {
        onKanjiImpact: () => {
          // Every active enemy gets obliterated (or heavily damaged if Boss) with Overdrive + Mark Resonance!
          let clearedNonBoss = 0;
          for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.dying) continue;
            const consumed = enemy.consumeElementalMark(ch.id);
            const markStacks = consumed ? consumed.stacks : 0;
            const ultDmg = enemy.isBoss()
              ? computeOverdriveUltimateDamage(ch.ultimateBossDamage, isOverdrive, markStacks)
              : 9999;
            const killed = enemy.takeDamage(
              ultDmg,
              enemy.x >= this.player.x ? 280 : -280,
              -180,
              this.particles,
              this.audio,
              true
            );
            if (ch.id === 'raijin') {
              this.particles.emitLightning(enemy.x, enemy.y - 120, '#fef08a', 135);
              if (!killed) {
                enemy.applyStun(isOverdrive ? 2.8 : 2.2, this.particles);
              }
            } else if (ch.id === 'kagura') {
              this.particles.emitEmbers(enemy.x, enemy.y - 50, 22, '#f97316');
            } else if (ch.id === 'zero') {
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, -0.6, 260, '#10b981', 14);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, 0.6, 260, '#a7f3d0', 12);
            } else {
              this.particles.emitShockwave(enemy.x, enemy.y - 48, '#ef4444', 110, 0.34);
              this.particles.emitSlashBeam(enemy.x, enemy.y - 52, -0.32, 280, '#ef4444', 14);
            }
            this.particles.emitSmoke(enemy.x, enemy.y - 30, 18, '#f8fafc', -95, 45);
            this.registerPlayerHit(enemy.isBoss() ? ultDmg : 120, isOverdrive ? 68 : 48, true, killed, enemy);
            if (killed && !enemy.isBoss()) clearedNonBoss++;
          }

          // Open Skill-Link right after Ultimate so players can immediately chain into follow-ups!
          this.player.skillLinkTimer = 1.25;
          if (isOverdrive) {
            this.triggerImpactFrame(this.player.x, this.player.y - 58, ch.ultimateSecondaryColor, 0.08);
          }

          // Character-specific Ultimate battlefield aftermath (+ Awakened Overdrive Storm!)
          if (ch.id === 'raijin') {
            this.player.dashCooldown = 0;
            this.player.cryoCooldown = 0;
            if (isOverdrive) {
              for (const ox of [-220, -90, 90, 220]) {
                const lx = clamp(this.player.x + ox, 60, ARENA_WIDTH - 60);
                this.particles.emitLightning(lx, GROUND_Y - 125, '#fef08a', 145);
                this.particles.emitChainArc(this.player.x, this.player.y - 56, lx, GROUND_Y - 24, '#22d3ee', 5);
              }
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'TUYỆT KỸ THỨC TỈNH · THIÊN LÔI!' : 'LÔI PHẠT · CHOÁNG!',
              '#fef08a',
              24
            );
          } else if (ch.id === 'kagura') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + (isOverdrive ? 50 : 35));
            const offsets = isOverdrive ? [-240, -120, 0, 120, 240] : [-150, 0, 150];
            for (const ox of offsets) {
              const px = clamp(this.player.x + ox, 70, ARENA_WIDTH - 70);
              this.magmaPillars.push(new MagmaPillar(px, this.player.facing, 0.08, isOverdrive ? 64 : 48));
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'TUYỆT KỸ THỨC TỈNH · +50 HP!' : 'VIÊM NGỤC · +35 HP!',
              '#fde047',
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
                  color: '#10b981',
                  maxLife: 0.9,
                })
              );
            }
            this.particles.emitText(
              this.player.x,
              this.player.y - 114,
              isOverdrive ? 'TUYỆT KỸ THỨC TỈNH · VÔ ẢNH!' : 'VÔ ẢNH · RESET CHIÊU!',
              '#6ee7b7',
              24
            );
          } else {
            this.particles.emitShockwave(this.player.x, this.player.y - 52, '#dc2626', 180, 0.36);
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
                    color: '#ef4444',
                    maxLife: 1.1,
                  })
                );
              }
              this.particles.emitText(this.player.x, this.player.y - 114, 'TUYỆT KỸ THỨC TỈNH · 断!', '#fca5a5', 25);
            }
          }

          // Clear enemy bullets on screen
          this.projectiles = this.projectiles.filter((p) => p.fromPlayer);
          if (clearedNonBoss >= 2 && !this.activeBoss) {
            this.player.triggerVictoryDance(2.2);
          }
        },
        onComplete: () => {
          this.emitHudSnapshot();
        },
      },
      this.audio,
      {
        characterId: ch.id,
        kanji: ch.ultimateKanji,
        primaryColor: ch.ultimatePrimaryColor,
        secondaryColor: ch.ultimateSecondaryColor,
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

    // 1. Screen-space Atmospheric Backdrop
    this.bg.renderScreenBackdrop(ctx, this.viewW, this.viewH, this.player.awakened);

    // 2. World-space Camera Transform
    ctx.save();
    this.camera.applyTransform(ctx, this.viewW, this.viewH);

    const silhouette = this.cutscene.isSilhouettePhase();
    const whiteFlash = this.cutscene.isWhiteFlashPhase();
    const monoArena = silhouette || whiteFlash;

    if (monoArena) {
      // Exact anime contrast flash from reference 00:20–00:21!
      ctx.fillStyle = whiteFlash ? '#3b3e44' : '#bcc0c7';
      ctx.fillRect(-500, -400, ARENA_WIDTH + 1000, GROUND_Y + 400);
      ctx.fillStyle = whiteFlash ? '#24272c' : '#8c9099';
      ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);
    } else {
      this.bg.renderWorld(ctx, this.player.x, this.player.y, this.activeBoss?.accentColor ?? null);
    }

    // Magic Circles on floor
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

    // Enemies & Bosses
    for (const enemy of this.enemies) {
      enemy.render(ctx, silhouette, whiteFlash);
    }

    // Protagonist
    this.player.render(ctx, monoArena);

    // Projectiles
    if (!monoArena) {
      for (const proj of this.projectiles) {
        proj.render(ctx);
      }
    }

    // Pooled Particles
    this.particles.render(ctx);

    ctx.restore(); // End world space

    // 3. Sakuga Anime Impact Frame Flash (1–2 frame monochrome speedline punch on Detonations/Finishers/Parry!)
    if (this.impactFrameTimer > 0 && !this.cutscene.active) {
      const ratio = clamp(this.impactFrameTimer / Math.max(0.01, this.impactFrameDuration), 0, 1);
      const isPeak = ratio > 0.55;
      ctx.save();
      ctx.fillStyle = isPeak ? 'rgba(9, 11, 16, 0.42)' : 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);

      // Converging anime impact rays centered around screen midpoint biased toward impact side
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

    // 4. Peripheral Crimson Low-HP Vignette (gaze routing cue)
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

  private syncHudThrottled(dt: number): void {
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.08) {
      this.hudSyncAccum = 0;
      const fp = [
        this.state,
        this.characterId,
        this.actCode,
        this.actTitle,
        Math.ceil(this.player.hp),
        Math.ceil(this.player.trailHp),
        Math.round(this.player.rage),
        Math.round(this.player.awakening),
        this.player.awakened ? Math.ceil(this.player.awakenTimer * 2) : 0,
        this.combo,
        Math.round(this.score),
        this.activeBoss ? Math.ceil(this.activeBoss.hp) : -1,
        this.bossIntroBanner ? 1 : 0,
        this.cutscene.active ? 1 : 0,
        this.enemies.length,
        this.iceWalls.some((w) => w.active && !w.launched) ? 1 : 0,
        this.player.skillLinkTimer > 0 ? 1 : 0,
        this.player.cryoCooldown > 0 ? this.player.cryoCooldown.toFixed(1) : '0',
        this.player.parryCooldown > 0 ? this.player.parryCooldown.toFixed(1) : '0',
        this.player.dashCooldown > 0 ? this.player.dashCooldown.toFixed(1) : '0',
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
      };
    }

    const standingIceWall = this.iceWalls.some((w) => w.active && !w.launched);
    const remaining = this.enemies.filter((e) => e.alive && !e.dying).length + this.pendingSpawns.length;

    let waveProgressText = '';
    if (this.mode === 'training') {
      waveProgressText = 'LUYỆN TẬP TỰ DO';
    } else if (this.mode === 'boss_rush') {
      waveProgressText = `BOSS ${Math.min(BOSS_ORDER.length, this.bossesDefeated + 1)} / ${BOSS_ORDER.length}`;
    } else if (this.waveStage < 3) {
      waveProgressText = `ĐỊCH CÒN LẠI: ${remaining}`;
    } else {
      waveProgressText = `BIỆT ĐỘI BOSS ${Math.min(BOSS_ORDER.length, this.bossesDefeated + 1)} / ${BOSS_ORDER.length}`;
    }

    const ch = this.player.character;
    const awakenedProfile = this.player.awakened ? getAwakenedVisualProfile(ch.id) : null;
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
      runStats: this.runStats,
      isTouchDevice: this.isTouchDevice,
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
    }
    this.resizeObserver?.disconnect();
    this.resizeCleanup?.();
    this.input.destroy();
    this.audio.destroy();
  }
}
