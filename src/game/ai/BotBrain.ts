import { ARENA_WIDTH, GROUND_Y, clamp } from '../rules';
import type { EnemyType } from '../types';

export type BotArchetype = 'RUSHDOWN' | 'COUNTER' | 'TRICKSTER';
export type BotDifficulty = 'NORMAL' | 'HARD' | 'MASTER';
export type PlayerObservedAction = 'idle' | 'attack' | 'dash' | 'jump' | 'skill';

export type BotActionKind =
  | 'move' | 'attack' | 'dash_in' | 'dash_back' | 'dash_crossup'
  | 'jump_evade' | 'parry' | 'skill' | 'ultimate' | 'combo_escape';

export interface BotWorldSnapshot {
  dt: number;
  botX: number;
  botY: number;
  botVx: number;
  botFacing: 1 | -1;
  botOnGround: boolean;
  botHpRatio: number;
  botSpeed: number;
  attackRange: number;
  attackPhase: 'none' | 'windup' | 'active' | 'recovery';
  attackCooldown: number;
  consecutiveHitsTaken: number;
  playerX: number;
  playerY: number;
  playerAttacking: boolean;
  playerDashing?: boolean;
  playerAirborne?: boolean;
  isBoss?: boolean;
  isElite?: boolean;
  arenaLeft?: number;
  arenaRight?: number;
}

export interface BotDecision {
  kind: BotActionKind;
  moveX: -1 | 0 | 1;
  jump: boolean;
  dash: boolean;
  attack: boolean;
  parry: boolean;
  skill: boolean;
  ultimate: boolean;
  targetVx: number;
  jumpVy: number;
  facing: 1 | -1;
  teleportX?: number;
  comboChainCount: number;
  dashCancelRecovery: boolean;
  triggerParryGuard: boolean;
  triggerBurstShockwave: boolean;
}

interface DelayedPlayerFrame {
  deliverAt: number; x: number; y: number;
  attacking: boolean; dashing: boolean; airborne: boolean;
}

export interface BotDifficultyProfile {
  reactionMinSec: number;
  reactionMaxSec: number;
  parryScale: number;
  comboChance: number;
  energyGainScale: number;
  escapeHitThreshold: number;
}

export const BOT_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyProfile> = {
  NORMAL: { reactionMinSec: 0.2, reactionMaxSec: 0.24, parryScale: 0.8, comboChance: 0.55, energyGainScale: 0.85, escapeHitThreshold: 4 },
  HARD: { reactionMinSec: 0.175, reactionMaxSec: 0.225, parryScale: 1.0, comboChance: 0.78, energyGainScale: 1.0, escapeHitThreshold: 3 },
  MASTER: { reactionMinSec: 0.16, reactionMaxSec: 0.195, parryScale: 1.25, comboChance: 0.94, energyGainScale: 1.25, escapeHitThreshold: 3 },
};

const RUSHDOWN_TYPES = new Set<EnemyType>(['berserker_reaper', 'swarm_blade', 'heavy_brute', 'boss_opus', 'boss_vulcan', 'boss_akaza']);
const COUNTER_TYPES = new Set<EnemyType>(['shield_guard', 'deepseek_gunner', 'boss_haiku', 'boss_astra', 'boss_glacius', 'boss_sol', 'boss_raiden']);
const TRICKSTER_TYPES = new Set<EnemyType>(['cyber_ninja', 'frost_mage', 'boss_nyx', 'boss_kronos', 'boss_fable', 'boss_omega']);

export function resolveDefaultArchetype(type: EnemyType, entityId = 1): BotArchetype {
  if (RUSHDOWN_TYPES.has(type)) return 'RUSHDOWN';
  if (COUNTER_TYPES.has(type)) return 'COUNTER';
  if (TRICKSTER_TYPES.has(type)) return 'TRICKSTER';
  const r = entityId % 3;
  return r === 0 ? 'RUSHDOWN' : r === 1 ? 'COUNTER' : 'TRICKSTER';
}

export class BotBrain {
  public archetype: BotArchetype;
  public difficulty: BotDifficulty;
  public energy = 25;
  public readonly maxEnergy = 100;

  private clock = 0;
  private reactionDelaySec = 0.19;
  private reactionRetuneTimer = 0;
  private observationQueue: DelayedPlayerFrame[] = [];
  private perceivedPlayer: DelayedPlayerFrame | null = null;
  private prevPerceived = { attacking: false, dashing: false, airborne: false };

  // Anti-Spam Memory (last 5 discrete Player actions)
  private playerActionHistory: PlayerObservedAction[] = [];
  private antiSpamBuffTimer = 0;

  // Footsies, Whiff Punish & Combo Sequencer
  private footsiePhase = 0;
  private whiffBaitActive = false;
  private whiffPunishWindow = 0;
  private dashCooldown = 0;
  private parryCooldown = 0;
  private skillCooldown = 0;
  private jumpCooldown = 0;
  private escapeCooldown = 0;
  private queuedComboRemaining = 0;
  private pendingFinisher: 'none' | 'skill' | 'ultimate' = 'none';
  private pendingPostComboExit: 'none' | 'chase' | 'retreat' = 'none';
  private pendingAirJuggle = false;

  constructor(archetype: BotArchetype = 'RUSHDOWN', difficulty: BotDifficulty = 'HARD', seedOffset = 0) {
    this.archetype = archetype;
    this.difficulty = difficulty;
    this.footsiePhase = (seedOffset % 7) * 0.91;
    this.retuneReactionWindow();
  }

  public setProfile(archetype: BotArchetype, difficulty?: BotDifficulty): void {
    this.archetype = archetype;
    if (difficulty) this.difficulty = difficulty;
    this.retuneReactionWindow();
  }

  private emit(kind: BotActionKind, facing: 1 | -1, targetVx: number, opts?: Partial<BotDecision>): BotDecision {
    const resolvedJumpVy = opts?.jumpVy ?? 0;
    const resolvedFacing = opts?.facing ?? facing;
    const moveX: -1 | 0 | 1 = Math.abs(targetVx) < 12 ? 0 : targetVx > 0 ? 1 : -1;
    return {
      kind,
      moveX: opts?.moveX ?? moveX,
      jump: opts?.jump ?? resolvedJumpVy < 0,
      dash: opts?.dash ?? (kind === 'dash_in' || kind === 'dash_back' || kind === 'dash_crossup' || kind === 'combo_escape'),
      attack: opts?.attack ?? kind === 'attack',
      parry: opts?.parry ?? kind === 'parry',
      skill: opts?.skill ?? kind === 'skill',
      ultimate: opts?.ultimate ?? kind === 'ultimate',
      targetVx,
      jumpVy: resolvedJumpVy,
      facing: resolvedFacing,
      teleportX: opts?.teleportX,
      comboChainCount: opts?.comboChainCount ?? 0,
      dashCancelRecovery: opts?.dashCancelRecovery ?? false,
      triggerParryGuard: opts?.triggerParryGuard ?? false,
      triggerBurstShockwave: opts?.triggerBurstShockwave ?? false,
    };
  }

  /** Hit-confirm Combo Sequencer: chains 2-4 hits -> Skill/Ultimate -> Chase or Retreat */
  public notifyHitConfirmed(launchedPlayer = false): void {
    const profile = BOT_DIFFICULTY_PROFILES[this.difficulty];
    this.energy = Math.min(this.maxEnergy, this.energy + 22 * profile.energyGainScale);
    if (launchedPlayer) {
      this.pendingAirJuggle = true;
    }
    if (this.queuedComboRemaining <= 0 && Math.random() < profile.comboChance) {
      const totalHits = (this.archetype === 'RUSHDOWN' ? 3 : 2) + (this.archetype === 'RUSHDOWN' && Math.random() < 0.45 ? 1 : 0);
      this.queuedComboRemaining = clamp(totalHits - 1, 1, 3);
      this.pendingFinisher = this.energy >= 85 ? 'ultimate' : this.energy >= 40 && this.skillCooldown <= 0 ? 'skill' : 'none';
      this.pendingPostComboExit = launchedPlayer || this.archetype === 'RUSHDOWN' ? 'chase' : 'retreat';
    }
  }

  public consumeComboStep(distToPlayer?: number, maxChaseRange = 165): boolean {
    if (this.queuedComboRemaining <= 0) return false;
    if (distToPlayer !== undefined && distToPlayer > maxChaseRange) {
      this.queuedComboRemaining = 0;
      return false;
    }
    this.queuedComboRemaining--;
    return true;
  }

  public decide(snap: BotWorldSnapshot): BotDecision {
    const dt = clamp(snap.dt, 0, 0.1);
    const profile = BOT_DIFFICULTY_PROFILES[this.difficulty];
    this.clock += dt;
    this.footsiePhase += dt * (this.archetype === 'TRICKSTER' ? 5.2 : 3.8);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.parryCooldown = Math.max(0, this.parryCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.escapeCooldown = Math.max(0, this.escapeCooldown - dt);
    this.antiSpamBuffTimer = Math.max(0, this.antiSpamBuffTimer - dt);
    this.whiffPunishWindow = Math.max(0, this.whiffPunishWindow - dt);
    this.energy = Math.min(this.maxEnergy, this.energy + 7.5 * dt * profile.energyGainScale);
    if ((this.reactionRetuneTimer -= dt) <= 0) this.retuneReactionWindow();

    const leftBound = snap.arenaLeft ?? 45;
    const rightBound = snap.arenaRight ?? ARENA_WIDTH - 45;

    // 1. Human-like Reaction Queue (160ms-240ms latency for Player attacks; live spatial facing)
    this.pushObservation(snap);
    const pAttacking = this.perceivedPlayer ? this.perceivedPlayer.attacking : false;
    const livePlayerAirborne = Boolean(snap.playerAirborne ?? snap.playerY < GROUND_Y - 26);
    const pAirborne = livePlayerAirborne || (this.perceivedPlayer ? this.perceivedPlayer.airborne : false);
    const liveDx = snap.playerX - snap.botX;
    const dist = Math.abs(liveDx);
    const facing: 1 | -1 = Math.abs(liveDx) > 4 ? (liveDx >= 0 ? 1 : -1) : snap.botFacing;

    const pinnedLeft = snap.botX < leftBound + 95 && snap.playerX > snap.botX;
    const pinnedRight = snap.botX > rightBound - 95 && snap.playerX < snap.botX;
    const corneredByPlayer = (pinnedLeft || pinnedRight) && dist < 210;

    // 2. Combo Escape / Burst Reflex after 3-4 consecutive hits
    const escapeLimit = snap.isBoss ? profile.escapeHitThreshold + 1 : profile.escapeHitThreshold;
    if (snap.consecutiveHitsTaken >= escapeLimit && this.escapeCooldown <= 0) {
      this.escapeCooldown = snap.isBoss ? 3.0 : 2.3;
      this.queuedComboRemaining = 0;
      const useBurst = (snap.isBoss || snap.isElite || this.energy >= 50) && Math.random() < 0.6;
      if (useBurst) this.energy = Math.max(0, this.energy - 38);
      const escapeDir = corneredByPlayer ? facing : (-facing as 1 | -1);
      return this.emit('combo_escape', facing, escapeDir * Math.max(460, snap.botSpeed * 1.42), {
        jumpVy: snap.botOnGround ? (corneredByPlayer ? -580 : !useBurst ? -380 : 0) : 0,
        dashCancelRecovery: true,
        triggerBurstShockwave: useBurst,
      });
    }

    // 3. Dash-Cancel out of recovery when Player backs out or is launched airborne
    if (snap.attackPhase === 'recovery' && this.dashCooldown <= 0) {
      if (this.pendingAirJuggle && snap.botOnGround && dist < 240) {
        this.pendingAirJuggle = false;
        this.dashCooldown = 1.1;
        this.jumpCooldown = 0.85;
        return this.emit('jump_evade', facing, facing * Math.max(420, snap.botSpeed * 1.25), {
          jumpVy: -610,
          attack: dist <= snap.attackRange + 55,
          comboChainCount: 2,
          dashCancelRecovery: true,
        });
      }
      if ((this.archetype === 'RUSHDOWN' || this.archetype === 'TRICKSTER') && dist > snap.attackRange + 22 && dist < 310) {
        this.dashCooldown = 1.25;
        return this.emit('dash_in', facing, facing * Math.max(500, snap.botSpeed * 1.5), {
          jumpVy: snap.botOnGround && pAirborne ? -560 : 0,
          comboChainCount: 1,
          dashCancelRecovery: true,
        });
      }
    }

    // 4. Corner Escape Priority: never get stuck against arena wall!
    if (snap.attackPhase === 'none' && corneredByPlayer) {
      if (this.dashCooldown <= 0 && dist < 175) {
        this.dashCooldown = 1.35;
        const targetX = clamp(snap.playerX + facing * 96, leftBound + 45, rightBound - 45);
        const newFacing: 1 | -1 = snap.playerX >= targetX ? 1 : -1;
        return this.emit('dash_crossup', newFacing, newFacing * snap.botSpeed * 0.85, {
          facing: newFacing,
          teleportX: targetX,
          comboChainCount: 1,
        });
      }
      if (snap.botOnGround && this.jumpCooldown <= 0) {
        this.jumpCooldown = 0.95;
        return this.emit('jump_evade', facing, facing * Math.max(430, snap.botSpeed * 1.32), {
          jumpVy: -620,
          comboChainCount: 1,
        });
      }
    }

    // 5. Air Juggle & Aerial Combat (follow launched/jumping Player into the air and strike!)
    if (snap.attackPhase === 'none') {
      if (!snap.botOnGround) {
        // Already airborne: steer toward Player and perform aerial attacks/skills!
        const dyAir = Math.abs(snap.playerY - snap.botY);
        if (this.energy >= 88 && dist < 240 && dyAir < 140) {
          this.energy = 0;
          return this.emit('ultimate', facing, facing * snap.botSpeed * 1.15, {
            comboChainCount: 1,
            triggerBurstShockwave: true,
          });
        }
        if (this.skillCooldown <= 0 && this.energy >= 42 && dist < 260 && dyAir < 140) {
          this.skillCooldown = 2.6;
          this.energy = Math.max(0, this.energy - 38);
          return this.emit('skill', facing, facing * snap.botSpeed * 1.1, { comboChainCount: 1 });
        }
        if (dist <= snap.attackRange + 38 && dyAir < 125 && snap.attackCooldown <= 0.04) {
          return this.emit('attack', facing, facing * snap.botSpeed * 1.05, { comboChainCount: 2 });
        }
        return this.emit('move', facing, facing * snap.botSpeed * 1.15);
      }

      // Grounded bot sees Player high in the air -> Jump chase / Anti-air intercept!
      const playerHeightAboveGround = GROUND_Y - snap.playerY;
      if (
        (this.pendingAirJuggle || playerHeightAboveGround > 58) &&
        snap.botOnGround &&
        this.jumpCooldown <= 0 &&
        dist < 265
      ) {
        this.pendingAirJuggle = false;
        this.jumpCooldown = 0.9;
        return this.emit('jump_evade', facing, facing * Math.max(390, snap.botSpeed * 1.22), {
          jumpVy: playerHeightAboveGround > 120 ? -650 : -560,
          attack: dist <= snap.attackRange + 42 && snap.attackCooldown <= 0.05,
          comboChainCount: 2,
        });
      }
    }

    // 6. Combo Finisher & Proactive Neutral Skill / Ultimate Casts
    if (snap.attackPhase === 'none' && this.queuedComboRemaining === 0) {
      const wantsUltimate =
        (this.pendingFinisher === 'ultimate' && this.energy >= 82 && dist < 300) ||
        (this.energy >= 95 && dist < 320 && snap.attackCooldown <= 0.12);
      if (wantsUltimate) {
        this.pendingFinisher = 'none';
        this.energy = 0;
        return this.emit('ultimate', facing, facing * Math.max(500, snap.botSpeed * 1.5), {
          jumpVy: snap.botOnGround && this.archetype === 'RUSHDOWN' && pAirborne ? -520 : 0,
          comboChainCount: 1,
          triggerBurstShockwave: true,
        });
      }

      const wantsSkill =
        (this.pendingFinisher === 'skill' && this.skillCooldown <= 0 && dist < 300) ||
        (this.skillCooldown <= 0 && this.energy >= 45 && dist > 65 && dist < 340 && snap.attackCooldown <= 0.14);
      if (wantsSkill) {
        this.pendingFinisher = 'none';
        this.skillCooldown = 2.6;
        this.energy = Math.max(0, this.energy - 38);
        return this.emit('skill', facing, facing * Math.max(440, snap.botSpeed * 1.35), { comboChainCount: 1 });
      }

      if (this.pendingPostComboExit !== 'none' && this.dashCooldown <= 0) {
        const mode = this.pendingPostComboExit;
        this.pendingPostComboExit = 'none';
        this.dashCooldown = 1.15;
        if (mode === 'retreat' && dist < 145 && !corneredByPlayer) {
          return this.emit('dash_back', facing, -facing * Math.max(410, snap.botSpeed * 1.3));
        }
        if (mode === 'chase' && dist > snap.attackRange + 16) {
          return this.emit('dash_in', facing, facing * Math.max(500, snap.botSpeed * 1.5), {
            jumpVy: snap.botOnGround && pAirborne ? -560 : 0,
            comboChainCount: 1,
          });
        }
      }
    }

    // 7. Weighted Defensive Reflex against perceived incoming attack (Parry / Backdash / Jump / Cross-up)
    if (snap.attackPhase === 'none' && pAttacking && dist < snap.attackRange + 95) {
      const antiSpamBonus = this.antiSpamBuffTimer > 0 ? 0.35 : 0;
      if (this.archetype === 'COUNTER') this.whiffBaitActive = true;

      const wParry = this.parryCooldown > 0 ? 0 : (this.archetype === 'COUNTER' ? 0.5 : this.archetype === 'RUSHDOWN' ? 0.25 : 0.22) * profile.parryScale + antiSpamBonus;
      const wBackdash = this.dashCooldown > 0 || corneredByPlayer ? 0 : this.archetype === 'COUNTER' ? 0.36 : this.archetype === 'RUSHDOWN' ? 0.16 : 0.24;
      const wJump = snap.botOnGround && this.jumpCooldown <= 0 ? (this.archetype === 'TRICKSTER' ? 0.38 : 0.24) : 0;
      const wCrossup = this.dashCooldown > 0 ? 0 : (this.archetype === 'TRICKSTER' ? 0.36 : 0.16) + antiSpamBonus + (corneredByPlayer ? 0.35 : 0);
      const sum = wParry + wBackdash + wJump + wCrossup;

      if (sum > 0.05) {
        let roll = Math.random() * sum;
        if ((roll -= wParry) <= 0) {
          this.parryCooldown = 1.35;
          this.whiffPunishWindow = 0.65;
          return this.emit('parry', facing, facing * 45, { comboChainCount: 2, triggerParryGuard: true });
        }
        if ((roll -= wCrossup) <= 0) {
          this.dashCooldown = 1.5;
          const targetX = clamp(snap.playerX + facing * 84, leftBound + 45, rightBound - 45);
          const newFacing: 1 | -1 = snap.playerX >= targetX ? 1 : -1;
          return this.emit('dash_crossup', newFacing, newFacing * snap.botSpeed * 0.6, {
            facing: newFacing,
            teleportX: targetX,
            comboChainCount: 1,
          });
        }
        if ((roll -= wBackdash) <= 0) {
          this.dashCooldown = 1.15;
          this.whiffPunishWindow = 0.7;
          return this.emit('dash_back', facing, -facing * Math.max(420, snap.botSpeed * 1.35));
        }
        this.jumpCooldown = 0.9;
        const jumpDir = this.archetype === 'TRICKSTER' || corneredByPlayer ? facing : (-facing as 1 | -1);
        return this.emit('jump_evade', facing, jumpDir * snap.botSpeed * 1.15, {
          jumpVy: -575,
          comboChainCount: 1,
        });
      }
    }

    if (!pAttacking && this.whiffBaitActive) {
      this.whiffBaitActive = false;
      this.whiffPunishWindow = 0.65;
    }

    return this.decideArchetypeNeutral(snap, dist, facing, leftBound, rightBound);
  }

  private decideArchetypeNeutral(
    snap: BotWorldSnapshot,
    dist: number,
    facing: 1 | -1,
    leftBound: number,
    rightBound: number
  ): BotDecision {
    const nearCorner = snap.botX < leftBound + 105 || snap.botX > rightBound - 105;

    if (this.archetype === 'COUNTER') {
      if (this.whiffPunishWindow > 0 && snap.attackCooldown <= 0.08 && dist < 270) {
        this.whiffPunishWindow = 0;
        return this.emit(dist > snap.attackRange ? 'dash_in' : 'attack', facing, facing * Math.max(510, snap.botSpeed * 1.58), { comboChainCount: 2 });
      }
      if (dist <= snap.attackRange + 8 && snap.attackCooldown <= 0) {
        return this.emit('attack', facing, facing * snap.botSpeed * 0.95, { comboChainCount: 1 });
      }
      // Smooth micro-footsie weave while attackCooldown ticks — never freeze or stand idle!
      if (dist > snap.attackRange * 1.45) {
        if (dist > 250 && this.dashCooldown <= 0) {
          this.dashCooldown = 1.45;
          return this.emit('dash_in', facing, facing * Math.max(480, snap.botSpeed * 1.45), { comboChainCount: 1 });
        }
        return this.emit('move', facing, facing * snap.botSpeed * 1.08);
      }
      const weaveDir = nearCorner ? facing : (Math.sin(this.footsiePhase) >= -0.25 ? facing : (-facing as 1 | -1));
      return this.emit('move', facing, weaveDir * snap.botSpeed * 0.88);
    }

    if (this.archetype === 'TRICKSTER') {
      if (dist > 100 && dist < 280 && this.dashCooldown <= 0 && snap.attackCooldown <= 0.12 && Math.random() < 0.08) {
        this.dashCooldown = 1.75;
        const targetX = clamp(snap.playerX + facing * 82, leftBound + 45, rightBound - 45);
        const newFacing: 1 | -1 = snap.playerX >= targetX ? 1 : -1;
        return this.emit('dash_crossup', newFacing, newFacing * snap.botSpeed * 0.5, {
          facing: newFacing,
          teleportX: targetX,
          comboChainCount: 1,
        });
      }
      if (snap.botOnGround && this.jumpCooldown <= 0 && dist > 115 && dist < 245 && Math.random() < 0.045) {
        this.jumpCooldown = 1.1;
        return this.emit('jump_evade', facing, facing * snap.botSpeed * 1.25, {
          jumpVy: -585,
          comboChainCount: 1,
        });
      }
      if (dist <= snap.attackRange + 8 && snap.attackCooldown <= 0) {
        this.pendingPostComboExit = 'retreat';
        return this.emit('attack', facing, facing * snap.botSpeed * 1.12, { comboChainCount: 2 });
      }
      if (snap.attackCooldown > 0.08 && dist < snap.attackRange * 0.9) {
        if (snap.botOnGround && nearCorner && this.jumpCooldown <= 0) {
          this.jumpCooldown = 0.95;
          return this.emit('jump_evade', facing, facing * snap.botSpeed * 1.22, { jumpVy: -590 });
        }
        const dir = nearCorner ? facing : (-facing as 1 | -1);
        return this.emit('move', facing, dir * snap.botSpeed * 1.02);
      }
      return this.emit('move', facing, facing * snap.botSpeed * (1.16 + Math.sin(this.footsiePhase) * 0.16));
    }

    // RUSHDOWN: Relentless pressure, dash-in gap close, jump-in aerials & multi-hit combos
    if (dist > snap.attackRange + 32 && dist < 340 && this.dashCooldown <= 0) {
      this.dashCooldown = 1.2;
      const jumpIn = snap.botOnGround && this.jumpCooldown <= 0 && dist > 155 && Math.random() < 0.32;
      if (jumpIn) this.jumpCooldown = 1.0;
      return this.emit('dash_in', facing, facing * Math.max(520, snap.botSpeed * 1.58), {
        jumpVy: jumpIn ? -540 : 0,
        comboChainCount: 2,
      });
    }
    if (dist <= snap.attackRange + 10 && snap.attackCooldown <= 0) {
      return this.emit('attack', facing, facing * snap.botSpeed * 1.15, { comboChainCount: 2 });
    }
    // Even while attackCooldown ticks down in close range, keep pressuring forward or micro-stepping instead of stopping!
    const rushVx =
      dist > snap.attackRange * 0.72
        ? facing * snap.botSpeed * (dist > 140 ? 1.28 : 1.05)
        : (nearCorner ? facing : (Math.sin(this.footsiePhase * 1.4) >= -0.3 ? facing : (-facing as 1 | -1))) *
          snap.botSpeed *
          0.76;
    return this.emit('move', facing, rushVx);
  }

  private pushObservation(snap: BotWorldSnapshot): void {
    const airborne = Boolean(snap.playerAirborne ?? snap.playerY < GROUND_Y - 18);
    const dashing = Boolean(snap.playerDashing);
    this.observationQueue.push({ deliverAt: this.clock + this.reactionDelaySec, x: snap.playerX, y: snap.playerY, attacking: snap.playerAttacking, dashing, airborne });

    while (this.observationQueue.length > 0 && this.observationQueue[0].deliverAt <= this.clock) {
      const m = this.observationQueue.shift()!;
      if (m.attacking && !this.prevPerceived.attacking) this.recordPlayerAction('attack');
      else if (m.dashing && !this.prevPerceived.dashing) this.recordPlayerAction('dash');
      else if (m.airborne && !this.prevPerceived.airborne) this.recordPlayerAction('jump');
      this.prevPerceived = { attacking: m.attacking, dashing: m.dashing, airborne: m.airborne };
      this.perceivedPlayer = m;
    }
    if (this.observationQueue.length > 24) this.observationQueue.splice(0, this.observationQueue.length - 24);
  }

  public recordPlayerAction(action: PlayerObservedAction): void {
    if (action === 'idle') return;
    this.playerActionHistory.push(action);
    if (this.playerActionHistory.length > 5) this.playerActionHistory.shift();
    if (this.playerActionHistory.filter((a) => a === action).length >= 3) {
      this.antiSpamBuffTimer = 4.0;
    }
  }

  private retuneReactionWindow(): void {
    const p = BOT_DIFFICULTY_PROFILES[this.difficulty];
    this.reactionDelaySec = p.reactionMinSec + Math.random() * (p.reactionMaxSec - p.reactionMinSec);
    this.reactionRetuneTimer = 1.4 + Math.random() * 0.9;
  }
}
