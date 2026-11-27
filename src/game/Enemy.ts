import {
  ARENA_WIDTH,
  GRAVITY,
  GROUND_Y,
  clamp,
  createScarfChain,
  stepVerletScarf,
} from './rules';
import type { CharacterId, EnemyType, ScarfNode, SkinId } from './types';
import type { AudioEngine } from './AudioEngine';
import type { ParticleSystem } from './ParticleSystem';
import {
  type Afterimage,
  type SkeletonJoints,
  type SlashTrail,
  type StickPoseName,
  computeStickmanSkeleton,
  renderAfterimages,
  renderSlashTrails,
  renderStickman,
} from './StickmanRenderer';
import {
  type ComboMoveSpec,
  blendSkeleton,
  getAwakenedVisualProfile,
  getComboMoveForCharacter,
} from './animation';
import { type CharacterDefinition, getCharacterDef } from './characters';
import { getSkinVfxProfile } from './skinVfx';
import { getEnemyVisualProfile } from './enemyVisuals';
import { colorWithAlpha } from './renderer/inkStyle';
import { getElementalMarkSpec } from './synergy';
import {
  BotBrain,
  MagicCircle,
  Projectile,
  resolveDefaultArchetype,
  stepBotBrainHook,
  type BotArchetype,
  type BotDecision,
  type BotDifficulty,
} from './Entities';

export interface EnemyAttackHit {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  dir: 1 | -1;
  parryable: boolean;
  heavy?: boolean;
  source: Enemy;
}

let nextEnemyId = 1;

export class Enemy {
  public readonly id: number;
  public readonly type: EnemyType;
  public readonly isElite: boolean;
  public x: number;
  public y = GROUND_Y;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = -1;
  public onGround = true;

  public hp: number;
  public maxHp: number;
  public trailHp: number;
  public speed: number;
  public damage: number;
  public scoreValue: number;

  public alive = true;
  public dying = false;
  public koTimer = 0;
  public readonly koDuration = 0.82;

  public hitFlash = 0;
  public hurtTimer = 0;
  public stunTimer = 0;
  public shieldBrokenTimer = 0;
  public parryGuardTimer = 0;
  public dashActionTimer = 0;
  public skillCastTimer = 0;
  public walkPhase = 0;
  public poseTime = 0;

  // Optional Hero Fighter Persona (used in Solo 1v1 so opponent is the exact chosen Character!)
  public heroCharacterId: CharacterId | null = null;
  public heroSkinId: SkinId = 'default';
  public heroDef: CharacterDefinition | null = null;
  public heroAwakened = false;
  public heroComboStep = 0;
  public heroAirComboStep = 0;
  public heroCurrentMove: ComboMoveSpec | null = null;
  public heroScarf: ScarfNode[] = [];
  public heroSlashTrails: SlashTrail[] = [];
  public heroAfterimages: Afterimage[] = [];
  private heroAfterimageTimer = 0;

  // Elemental Synergy Mark (Ice / Volt / Flame / Shadow seal stackable 1..3!)
  public markKind: CharacterId | null = null;
  public markStacks = 0;
  public markTimer = 0;
  public markPrimaryColor: string | null = null;
  public markSecondaryColor: string | null = null;

  // Attack State Machine (windup -> active -> recovery)
  public attackPhase: 'none' | 'windup' | 'active' | 'recovery' = 'none';
  public attackTimer = 0;
  public attackCooldown = 0.6;
  public attackDealt = false;
  public hasToken = false;
  private ninjaBlinkCooldown = 1.8;
  private reaperFlurryStep = 0;
  private mageSpellToggle = 0;
  private consecutiveHits = 0;
  private hitStreakTimer = 0;
  private evadeCooldown = 0;
  private comboFollowups = 0;
  private activeSkillKind: 'none' | 'skill' | 'ultimate' = 'none';
  private isTrainingDummyFlag = false;
  public readonly botBrain: BotBrain;

  // Appearance & Smooth Blended Skeleton
  public bodyColor = '#f1f5f9';
  public glowColor = '#94a3b8';
  public label = 'META';
  protected blendedJoints: SkeletonJoints | null = null;
  protected lastRenderedJoints: SkeletonJoints | null = null;

  constructor(
    type: EnemyType,
    x: number,
    isTrainingDummy = false,
    isElite = false,
    archetype?: BotArchetype,
    difficulty?: BotDifficulty
  ) {
    this.id = nextEnemyId++;
    this.type = type;
    this.isTrainingDummyFlag = isTrainingDummy;
    this.isElite = isElite && !type.startsWith('boss_');
    this.x = x;
    const resolvedArch = archetype ?? resolveDefaultArchetype(type, this.id);
    const resolvedDiff: BotDifficulty =
      difficulty ?? (type.startsWith('boss_') ? 'MASTER' : this.isElite ? 'HARD' : 'NORMAL');
    this.botBrain = new BotBrain(resolvedArch, resolvedDiff, this.id);

    if (type === 'deepseek_gunner') {
      this.maxHp = isTrainingDummy ? 120 : 135;
      this.speed = 260;
      this.damage = 25;
      this.scoreValue = 160;
      this.bodyColor = '#e2e8f0';
      this.glowColor = '#38bdf8';
      this.label = 'DEEPSEEK';
    } else if (type === 'swarm_blade') {
      this.maxHp = isTrainingDummy ? 120 : 120;
      this.speed = 375;
      this.damage = 24;
      this.scoreValue = 145;
      this.bodyColor = '#f1f5f9';
      this.glowColor = '#a855f7';
      this.label = 'SWARM';
    } else if (type === 'shield_guard') {
      this.maxHp = isTrainingDummy ? 150 : 200;
      this.speed = 265;
      this.damage = 28;
      this.scoreValue = 210;
      this.bodyColor = '#cbd5e1';
      this.glowColor = '#38bdf8';
      this.label = 'AEGIS';
    } else if (type === 'cyber_ninja') {
      this.maxHp = isTrainingDummy ? 130 : 160;
      this.speed = 410;
      this.damage = 28;
      this.scoreValue = 220;
      this.bodyColor = '#94a3b8';
      this.glowColor = '#f43f5e';
      this.label = 'PHANTOM';
    } else if (type === 'heavy_brute') {
      this.maxHp = isTrainingDummy ? 190 : 300;
      this.speed = 235;
      this.damage = 38;
      this.scoreValue = 260;
      this.bodyColor = '#fed7aa';
      this.glowColor = '#f97316';
      this.label = 'TITAN';
    } else if (type === 'frost_mage') {
      this.maxHp = isTrainingDummy ? 140 : 145;
      this.speed = 245;
      this.damage = 26;
      this.scoreValue = 235;
      this.bodyColor = '#bae6fd';
      this.glowColor = '#22d3ee';
      this.label = 'ARCANIST';
    } else if (type === 'berserker_reaper') {
      this.maxHp = isTrainingDummy ? 160 : 185;
      this.speed = 395;
      this.damage = 30;
      this.scoreValue = 250;
      this.bodyColor = '#fecdd3';
      this.glowColor = '#f43f5e';
      this.label = 'REAPER';
    } else {
      // meta_melee
      this.maxHp = isTrainingDummy ? 140 : 150;
      this.speed = 315;
      this.damage = 22;
      this.scoreValue = 120;
      this.bodyColor = '#ffffff';
      this.glowColor = '#94a3b8';
      this.label = 'META';
    }

    if (this.isElite) {
      this.maxHp = Math.round(this.maxHp * 1.75);
      this.damage = Math.round(this.damage * 1.35);
      this.scoreValue = Math.round(this.scoreValue * 1.75);
      this.speed = Math.round(this.speed * 1.15);
    }

    this.hp = this.maxHp;
    this.trailHp = this.maxHp;
    this.attackCooldown = 0.04 + Math.random() * 0.1;
  }

  public configureAsHeroFighter(
    characterId: CharacterId,
    skinId: SkinId = 'default',
    archetype?: BotArchetype,
    difficulty: BotDifficulty = 'HARD',
    targetMaxHp?: number
  ): void {
    const def = getCharacterDef(characterId, skinId);
    this.heroCharacterId = def.id;
    this.heroSkinId = skinId;
    this.heroDef = def;
    this.heroAwakened = false;
    this.heroComboStep = 0;
    this.heroAirComboStep = 0;
    this.heroCurrentMove = null;
    this.bodyColor = def.bodyColor;
    this.glowColor = def.glowColor;
    this.label = def.name;
    this.maxHp = targetMaxHp ?? def.maxHp;
    this.hp = this.maxHp;
    this.trailHp = this.maxHp;
    this.speed = Math.round(def.moveSpeed * 0.92);
    this.damage = Math.round(24 * def.damageMultiplier);
    this.heroScarf = createScarfChain(this.x, this.y - 72, 9, 9);
    this.heroSlashTrails = [];
    this.heroAfterimages = [];
    if (archetype) {
      this.botBrain.setProfile(archetype, difficulty);
    }
  }

  public isBoss(): boolean {
    return this.type.startsWith('boss_');
  }

  public isParryGuarding(): boolean {
    return this.parryGuardTimer > 0 && this.stunTimer <= 0 && !this.dying;
  }

  public isShieldActive(): boolean {
    if (this.isParryGuarding()) return true;
    return (
      this.type === 'shield_guard' &&
      this.shieldBrokenTimer <= 0 &&
      this.stunTimer <= 0 &&
      !this.dying
    );
  }

  public breakShield(particles: ParticleSystem): void {
    this.parryGuardTimer = 0;
    this.shieldBrokenTimer = 2.8;
    this.applyStun(1.4, particles);
    particles.emitText(this.x, this.y - 116, 'PHÁ KHIÊN!', '#38bdf8', 24);
  }

  public applyStun(duration: number, particles: ParticleSystem): void {
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.parryGuardTimer = 0;
    this.attackPhase = 'none';
    this.attackTimer = 0;
    this.hasToken = false;
    this.vx = -this.facing * 260;
    particles.emitSparks(this.x, this.y - 60, 14, '#38bdf8', 460);
    particles.emitText(this.x, this.y - 102, 'STUNNED!', '#38bdf8', 22);
  }

  public applyElementalMark(
    kind: CharacterId,
    addStacks: number,
    particles: ParticleSystem,
    tint?: { primary: string; secondary: string }
  ): void {
    if (!this.alive || this.dying) return;
    const spec = getElementalMarkSpec(kind);
    if (this.markKind === kind) {
      this.markStacks = Math.min(spec.maxStacks, this.markStacks + addStacks);
    } else {
      this.markKind = kind;
      this.markStacks = Math.min(spec.maxStacks, Math.max(1, addStacks));
    }
    this.markTimer = 7.0;
    this.markPrimaryColor = tint?.primary ?? null;
    this.markSecondaryColor = tint?.secondary ?? null;
    particles.emitSparks(this.x, this.y - 62, 6, tint?.primary ?? spec.primaryColor, 320);
  }

  public consumeElementalMark(expectedKind?: CharacterId): { kind: CharacterId; stacks: number } | null {
    if (!this.markKind || this.markStacks <= 0) return null;
    if (expectedKind && this.markKind !== expectedKind) return null;
    const result = { kind: this.markKind, stacks: this.markStacks };
    this.markKind = null;
    this.markStacks = 0;
    this.markTimer = 0;
    this.markPrimaryColor = null;
    this.markSecondaryColor = null;
    return result;
  }

  public takeDamage(
    dmg: number,
    knockX: number,
    knockY: number,
    particles: ParticleSystem,
    audio: AudioEngine,
    heavy = false
  ): boolean {
    if (!this.alive || this.dying) return false;

    // Active BotBrain Parry Stance: deflects light/medium hits & counter-charges energy!
    if (this.isParryGuarding() && !heavy) {
      this.parryGuardTimer = 0;
      this.consecutiveHits = 0;
      this.botBrain.energy = Math.min(this.botBrain.maxEnergy, this.botBrain.energy + 25);
      this.attackCooldown = 0;
      this.vx = -this.facing * 120;
      audio.playParry();
      particles.emitShockwave(this.x + this.facing * 22, this.y - 52, this.heroDef?.accentColor ?? '#38bdf8', 78, 0.22);
      particles.emitSparks(this.x + this.facing * 22, this.y - 52, 16, '#fef08a', 480);
      particles.emitText(this.x, this.y - 104, 'PARRY!', '#38bdf8', 22);
      return false;
    }

    // Defensive Reflex: after 3+ consecutive hits, 30% chance to Auto-Block / Back-Jump escape!
    if (!this.isBoss() && !this.isTrainingDummyFlag && !heavy && this.stunTimer <= 0) {
      this.consecutiveHits++;
      this.hitStreakTimer = 1.4;
      if (this.consecutiveHits >= 3 && Math.random() < 0.3) {
        this.consecutiveHits = 0;
        const reduced = Math.max(1, Math.round(dmg * 0.25));
        this.hp = Math.max(1, this.hp - reduced);
        this.hitFlash = 0.08;
        this.attackPhase = 'none';
        this.hasToken = false;
        this.vx = -this.facing * 430;
        this.vy = -340;
        this.onGround = false;
        this.attackCooldown = 0.1;
        audio.playParry();
        particles.emitShockwave(this.x, this.y - 48, '#38bdf8', 58, 0.18);
        particles.emitSparks(this.x, this.y - 48, 12, '#38bdf8', 420);
        particles.emitText(this.x, this.y - 96, 'ĐỠ ĐÒN!', '#38bdf8', 18);
        return false;
      }
    }

    // Heavy Brute, Elites, and Bosses resist light-hit stunlock!
    const hasSuperArmor =
      (this.isBoss() && this.attackPhase !== 'none' && !heavy) ||
      ((this.type === 'heavy_brute' || this.isElite) && !heavy && this.stunTimer <= 0);

    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlash = 0.12;
    this.botBrain.energy = Math.min(this.botBrain.maxEnergy, this.botBrain.energy + 8);

    if (this.heroDef && !this.heroAwakened && this.hp > 0 && this.hp <= this.maxHp * 0.42) {
      this.heroAwakened = true;
      this.speed = Math.round(this.heroDef.awakenedSpeed * 0.92);
      this.damage = Math.round(27 * this.heroDef.damageMultiplier);
      audio.playAwaken();
      particles.emitShockwave(this.x, this.y - 52, this.heroDef.awakeningWaveColor, 165, 0.36);
      particles.emitText(this.x, this.y - 118, this.heroDef.awakeningBannerText, this.heroDef.accentColor, 22);
    }

    if (!hasSuperArmor) {
      this.hurtTimer = this.isBoss() ? 0.06 : this.heroDef ? 0.09 : this.type === 'heavy_brute' ? 0.1 : this.isElite ? 0.1 : 0.12;
      if (!this.isBoss()) {
        this.attackPhase = 'none';
        this.hasToken = false;
      }
      const kbResist = this.isBoss() ? 0.22 : this.type === 'heavy_brute' ? 0.38 : this.isElite || this.heroDef ? 0.65 : 0.85;
      this.vx = knockX * kbResist;
      if (knockY < 0) {
        this.vy = knockY * kbResist;
        this.onGround = false;
      }
    } else {
      this.vx = knockX * 0.12;
    }

    if (heavy && this.type === 'shield_guard' && this.shieldBrokenTimer <= 0) {
      this.shieldBrokenTimer = 2.0;
    }

    audio.playHit(heavy);
    particles.emitSparks(
      this.x,
      this.y - 50,
      heavy ? 16 : 9,
      heavy ? '#fef08a' : '#ffffff',
      heavy ? 540 : 380
    );

    if (this.hp <= 0) {
      this.beginKO(knockX, particles);
      return true;
    }
    return false;
  }

  public beginKO(knockX: number, particles: ParticleSystem): void {
    if (this.dying) return;
    this.dying = true;
    this.koTimer = 0;
    this.poseTime = 0;
    this.parryGuardTimer = 0;
    this.attackPhase = 'none';
    this.hasToken = false;
    this.vx = knockX !== 0 ? knockX * 0.9 : -this.facing * 240;
    this.vy = -220;
    this.onGround = false;
    particles.emitSmoke(this.x, this.y - 35, 6, '#e2e8f0', -65, 22);
  }

  private tickHeroVfx(dt: number): void {
    if (!this.heroDef) return;
    const anchorX = this.x - this.facing * 6;
    const anchorY = this.y - 68;
    const windX = -this.vx * 0.48 - this.facing * 95;
    stepVerletScarf(this.heroScarf, anchorX, anchorY, windX, 520, 9, dt);

    if ((this.dashActionTimer > 0 || (this.attackPhase === 'active' && this.heroCurrentMove?.afterimages)) && this.lastRenderedJoints) {
      this.heroAfterimageTimer -= dt;
      if (this.heroAfterimageTimer <= 0) {
        this.heroAfterimageTimer = 0.035;
        const vfx = getSkinVfxProfile(this.heroDef.id, this.heroSkinId);
        if (this.heroAfterimages.length >= 16) this.heroAfterimages.shift();
        this.heroAfterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          joints: this.lastRenderedJoints,
          life: 0,
          maxLife: 0.22,
          color: vfx.afterimageColor,
        });
      }
    }

    for (let i = this.heroAfterimages.length - 1; i >= 0; i--) {
      this.heroAfterimages[i].life += dt;
      if (this.heroAfterimages[i].life >= this.heroAfterimages[i].maxLife) {
        this.heroAfterimages.splice(i, 1);
      }
    }
    for (let i = this.heroSlashTrails.length - 1; i >= 0; i--) {
      this.heroSlashTrails[i].life += dt;
      if (this.heroSlashTrails[i].life >= this.heroSlashTrails[i].maxLife) {
        this.heroSlashTrails.splice(i, 1);
      }
    }
  }

  public update(params: {
    dt: number;
    playerX: number;
    playerY: number;
    playerAttacking?: boolean;
    playerDashing?: boolean;
    arenaLeft?: number;
    arenaRight?: number;
    requestToken: () => boolean;
    releaseToken: () => void;
    projectiles: Projectile[];
    magicCircles?: MagicCircle[];
    particles: ParticleSystem;
    audio: AudioEngine;
    onMeleeHit: (hit: EnemyAttackHit) => void;
    passiveDummy?: boolean;
  }): void {
    const {
      dt,
      playerX,
      playerY,
      playerAttacking,
      playerDashing,
      arenaLeft,
      arenaRight,
      requestToken,
      releaseToken,
      projectiles,
      magicCircles,
      particles,
      audio,
      onMeleeHit,
      passiveDummy,
    } = params;

    const minX = arenaLeft ?? 40;
    const maxX = arenaRight ?? ARENA_WIDTH - 40;

    this.poseTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.shieldBrokenTimer = Math.max(0, this.shieldBrokenTimer - dt);
    this.parryGuardTimer = Math.max(0, this.parryGuardTimer - dt);
    this.dashActionTimer = Math.max(0, this.dashActionTimer - dt);
    this.skillCastTimer = Math.max(0, this.skillCastTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.ninjaBlinkCooldown = Math.max(0, this.ninjaBlinkCooldown - dt);
    this.evadeCooldown = Math.max(0, this.evadeCooldown - dt);
    if (this.hitStreakTimer > 0) {
      this.hitStreakTimer -= dt;
      if (this.hitStreakTimer <= 0) this.consecutiveHits = 0;
    }

    if (this.markTimer > 0) {
      this.markTimer -= dt;
      if (this.markTimer <= 0) {
        this.markKind = null;
        this.markStacks = 0;
        this.markTimer = 0;
        this.markPrimaryColor = null;
        this.markSecondaryColor = null;
      }
    }

    if (this.trailHp > this.hp) {
      this.trailHp = Math.max(this.hp, this.trailHp - 110 * dt);
    } else {
      this.trailHp = this.hp;
    }

    if (this.dying) {
      this.koTimer += dt;
      this.vy += GRAVITY * dt;
      this.x = clamp(this.x + this.vx * dt, minX, maxX);
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.vx *= Math.exp(-8 * dt);
      }
      if (this.koTimer >= this.koDuration) {
        this.alive = false;
        particles.emitSmoke(this.x, this.y - 16, 14, '#f1f5f9', -85, 36);
      }
      this.tickHeroVfx(dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    // Basic gravity & platform bounds
    this.vy += GRAVITY * dt;
    const prevX = this.x;
    this.x = clamp(this.x + this.vx * dt, minX, maxX);
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this.heroAirComboStep = 0;
    } else {
      this.onGround = false;
    }
    if (this.onGround && Math.abs(this.x - prevX) > 0.2) {
      // Match Player's wide sprint stride cadence so Enemies never squat/hop!
      this.walkPhase += Math.abs(this.x - prevX) * 0.022;
    }

    if (this.hurtTimer > 0 || this.stunTimer > 0 || passiveDummy) {
      this.vx *= Math.exp(-7 * dt);
      this.tickHeroVfx(dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    // Always face Player when not locked inside active strike frames (fixes swinging backwards!)
    if (this.attackPhase === 'none' || this.attackPhase === 'recovery') {
      if (Math.abs(dx) > 4) {
        this.facing = dx >= 0 ? 1 : -1;
      }
    }

    const effectiveRange = this.heroDef
      ? 104 + this.heroDef.reachBonus
      : this.type === 'heavy_brute'
        ? 112
        : this.type === 'shield_guard'
          ? 98
          : 92;

    const brainDecision = stepBotBrainHook(
      this.botBrain,
      {
        dt,
        botX: this.x,
        botY: this.y,
        botVx: this.vx,
        botFacing: this.facing,
        botOnGround: this.onGround,
        botHpRatio: this.maxHp > 0 ? this.hp / this.maxHp : 1,
        botSpeed: this.speed,
        attackRange: effectiveRange,
        attackPhase: this.attackPhase,
        attackCooldown: this.attackCooldown,
        consecutiveHitsTaken: this.consecutiveHits,
        playerX,
        playerY,
        playerAttacking: Boolean(playerAttacking),
        playerDashing: Boolean(playerDashing),
        playerAirborne: playerY < GROUND_Y - 26,
        isBoss: this.isBoss(),
        isElite: this.isElite || Boolean(this.heroDef),
        arenaLeft: minX,
        arenaRight: maxX,
      },
      (jumpVy) => {
        if (this.attackPhase === 'none' || brainDecisionJumpAllowed(this.attackPhase)) {
          this.vy = jumpVy;
          this.onGround = false;
          audio.playJump();
          particles.emitSmoke(this.x, GROUND_Y - 4, 5, this.glowColor, -30, 16);
        }
      }
    );

    if (brainDecision.kind === 'combo_escape') {
      this.consecutiveHits = 0;
      this.attackPhase = 'none';
      if (this.hasToken) {
        this.hasToken = false;
        releaseToken();
      }
      this.facing = brainDecision.facing;
      this.vx = brainDecision.targetVx;
      this.dashActionTimer = 0.2;
      if (brainDecision.jumpVy < 0 && this.onGround) {
        this.vy = brainDecision.jumpVy;
        this.onGround = false;
      }
      if (brainDecision.triggerBurstShockwave) {
        audio.playParry();
        particles.emitShockwave(this.x, this.y - 48, this.glowColor, 95, 0.24);
        particles.emitText(this.x, this.y - 96, 'THOÁT COMBO!', '#facc15', 18);
        if (dist <= 135) {
          onMeleeHit({
            x: this.x,
            y: this.y - 48,
            width: 170,
            height: 96,
            damage: Math.max(8, Math.round(this.damage * 0.45)),
            dir: this.facing,
            parryable: true,
            source: this,
          });
        }
      }
      this.tickHeroVfx(dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    if (brainDecision.dashCancelRecovery && this.attackPhase === 'recovery') {
      this.attackPhase = 'none';
      this.attackCooldown = 0.03;
      this.facing = brainDecision.facing;
      this.vx = brainDecision.targetVx;
      this.dashActionTimer = 0.18;
      if (brainDecision.jumpVy < 0 && this.onGround) {
        this.vy = brainDecision.jumpVy;
        this.onGround = false;
        audio.playJump();
      } else {
        audio.playDash();
      }
      particles.emitSmoke(this.x, this.y - 8, 5, this.glowColor, -24, 14);
    }

    if (this.heroDef) {
      this.updateHeroFighterAI(
        dt,
        dx,
        dist,
        playerX,
        playerY,
        minX,
        maxX,
        brainDecision,
        requestToken,
        releaseToken,
        projectiles,
        magicCircles,
        particles,
        audio,
        onMeleeHit
      );
      this.tickHeroVfx(dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    // Shared BotBrain jump / crossup / parry / skill / ultimate hooks for all regular Enemy archetypes too!
    if (this.attackPhase === 'none') {
      if (brainDecision.kind === 'dash_crossup' && brainDecision.teleportX !== undefined && this.evadeCooldown <= 0) {
        this.evadeCooldown = 1.3;
        particles.emitSmoke(this.x, this.y - 42, 8, this.glowColor, -35, 22);
        this.x = clamp(brainDecision.teleportX, minX + 20, maxX - 20);
        this.facing = playerX >= this.x ? 1 : -1;
        this.vx = brainDecision.targetVx;
        this.dashActionTimer = 0.18;
        this.attackCooldown = 0.03;
        audio.playDash();
        particles.emitSmoke(this.x, this.y - 42, 8, this.glowColor, -35, 22);
      } else if (brainDecision.parry && brainDecision.triggerParryGuard) {
        this.parryGuardTimer = 0.34;
        this.vx = brainDecision.targetVx;
        this.attackCooldown = 0.04;
        audio.playParry();
        particles.emitSparks(this.x + this.facing * 24, this.y - 52, 8, '#38bdf8', 360);
      } else if ((brainDecision.skill || brainDecision.ultimate) && requestToken()) {
        this.executeMobSpecialSkill(
          brainDecision.ultimate,
          playerX,
          playerY,
          projectiles,
          magicCircles,
          particles,
          audio,
          onMeleeHit,
          releaseToken
        );
        this.stepSkeletonBlend(dt);
        return;
      }
    }

    if (this.type === 'deepseek_gunner') {
      this.updateGunnerAI(dt, dx, dist, brainDecision, requestToken, releaseToken, projectiles, audio);
    } else if (this.type === 'cyber_ninja') {
      this.updateNinjaAI(dt, dx, dist, playerX, brainDecision, requestToken, releaseToken, projectiles, particles, audio, onMeleeHit);
    } else if (this.type === 'frost_mage') {
      this.updateFrostMageAI(dt, dist, playerX, playerY, brainDecision, requestToken, releaseToken, projectiles, magicCircles, particles, audio);
    } else if (this.type === 'berserker_reaper') {
      this.updateBerserkerAI(dt, dist, playerX, brainDecision, requestToken, releaseToken, particles, audio, onMeleeHit);
    } else {
      this.updateMeleeAI(dt, dx, dist, Boolean(playerAttacking), brainDecision, requestToken, releaseToken, particles, audio, onMeleeHit);
    }
    this.stepSkeletonBlend(dt);
  }

  protected stepSkeletonBlend(dt: number): void {
    const target = computeStickmanSkeleton(
      this.getPose(),
      this.poseTime,
      this.walkPhase,
      this.heroDef?.id,
      this.heroDef
        ? {
            vx: this.vx,
            vy: this.vy,
            awakened: this.heroAwakened,
          }
        : undefined
    );
    if (!this.blendedJoints) {
      this.blendedJoints = target;
      return;
    }
    const rate = this.attackPhase === 'active' || this.dashActionTimer > 0 || this.hurtTimer > 0 ? 52 : 42;
    const alpha = 1 - Math.exp(-rate * dt);
    this.blendedJoints = blendSkeleton(this.blendedJoints, target, alpha);
  }

  private executeMobSpecialSkill(
    isUltimate: boolean,
    playerX: number,
    playerY: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[] | undefined,
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    releaseToken: () => void
  ): void {
    this.hasToken = true;
    this.activeSkillKind = isUltimate ? 'ultimate' : 'skill';
    this.skillCastTimer = 0.24;
    this.poseTime = 0;
    const projProfile = getEnemyVisualProfile(this.type, this.isElite);
    const col = projProfile.projectileColor ?? this.glowColor;
    const rim = projProfile.projectileRimColor ?? '#ffffff';

    if (this.type === 'frost_mage' || this.type === 'deepseek_gunner') {
      this.attackCooldown = isUltimate ? 0.45 : 0.35;
      if (magicCircles && (isUltimate || this.type === 'frost_mage')) {
        magicCircles.push(new MagicCircle(clamp(playerX, 85, ARENA_WIDTH - 85)));
      }
      const spreads = isUltimate ? [-95, -35, 35, 95] : [-45, 45];
      for (const dyOff of spreads) {
        const tx = playerX - this.x;
        const ty = playerY - 52 + dyOff - (this.y - 58);
        const len = Math.hypot(tx, ty) || 1;
        const spd = isUltimate ? 780 : 680;
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 32,
            y: this.y - 58,
            vx: (tx / len) * spd,
            vy: (ty / len) * spd,
            radius: isUltimate ? 14 : 11,
            damage: Math.round(this.damage * (isUltimate ? 1.25 : 0.95)),
            kind: this.type === 'frost_mage' ? 'orb' : 'bullet',
            fromPlayer: false,
            color: col,
            rimColor: rim,
          })
        );
      }
      audio.playLaser();
      particles.emitShockwave(this.x, this.y - 52, col, isUltimate ? 115 : 80, 0.25);
      if (isUltimate) {
        particles.emitText(this.x, this.y - 104, 'BÃO ĐẠN!', col, 20);
      }
      this.hasToken = false;
      releaseToken();
      return;
    }

    // Melee / Ninja / Reaper skill & ultimate: explosive lunge slash + energy wave!
    this.attackPhase = 'windup';
    this.attackTimer = isUltimate ? 0.12 : 0.15;
    this.attackDealt = false;
    this.comboFollowups = isUltimate ? 2 : 1;
    if (this.onGround && isUltimate) {
      this.vy = -340;
      this.onGround = false;
    }
    this.vx = this.facing * (isUltimate ? 620 : 500);
    particles.emitShockwave(this.x, this.y - 48, col, isUltimate ? 120 : 84, 0.24);
    audio.playTelegraph();
    if (isUltimate || this.isElite || this.type === 'cyber_ninja') {
      projectiles.push(
        new Projectile({
          x: this.x + this.facing * 36,
          y: this.y - 54,
          vx: this.facing * (isUltimate ? 860 : 740),
          vy: 0,
          radius: isUltimate ? 18 : 13,
          damage: Math.round(this.damage * (isUltimate ? 1.2 : 0.85)),
          kind: isUltimate ? 'laser' : 'spear',
          fromPlayer: false,
          color: col,
          rimColor: rim,
        })
      );
    }
    if (isUltimate) {
      particles.emitText(this.x, this.y - 104, 'TUYỆT KỸ!', col, 20);
      onMeleeHit({
        x: this.x + this.facing * 52,
        y: this.y - 50,
        width: 145,
        height: 94,
        damage: Math.round(this.damage * 1.25),
        dir: this.facing,
        parryable: true,
        heavy: true,
        source: this,
      });
    }
  }

  private updateHeroFighterAI(
    dt: number,
    _dx: number,
    dist: number,
    playerX: number,
    playerY: number,
    minX: number,
    maxX: number,
    decision: BotDecision,
    requestToken: () => boolean,
    releaseToken: () => void,
    projectiles: Projectile[],
    magicCircles: MagicCircle[] | undefined,
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    const def = this.heroDef!;
    const vfx = getSkinVfxProfile(def.id, this.heroSkinId);
    const attackRange = 104 + def.reachBonus;

    if (this.attackPhase === 'none') {
      if (decision.kind === 'dash_crossup' && decision.teleportX !== undefined && this.evadeCooldown <= 0) {
        this.evadeCooldown = 0.95;
        particles.emitSmoke(this.x, this.y - 46, 10, def.accentColor, -40, 24);
        this.x = clamp(decision.teleportX, minX + 24, maxX - 24);
        this.facing = playerX >= this.x ? 1 : -1;
        this.vx = decision.targetVx;
        this.dashActionTimer = 0.2;
        this.attackCooldown = 0.02;
        audio.playDash();
        particles.emitSmoke(this.x, this.y - 46, 10, def.accentColor, -40, 24);
        return;
      }

      if (decision.parry && decision.triggerParryGuard) {
        this.parryGuardTimer = 0.36;
        this.vx = decision.targetVx;
        this.attackCooldown = 0.03;
        audio.playParry();
        particles.emitSparks(this.x + this.facing * 24, this.y - 52, 12, vfx.slashPrimary, 420);
        return;
      }

      if ((decision.ultimate || decision.skill) && requestToken()) {
        this.executeHeroSkillOrUltimate(
          decision.ultimate,
          playerX,
          playerY,
          minX,
          maxX,
          projectiles,
          magicCircles,
          particles,
          audio,
          onMeleeHit,
          releaseToken
        );
        return;
      }

      if (decision.dash && this.evadeCooldown <= 0 && (decision.kind === 'dash_in' || decision.kind === 'dash_back')) {
        this.evadeCooldown = Math.max(0.38, def.dashCooldown * 0.85);
        this.dashActionTimer = 0.18;
        this.vx = decision.targetVx;
        audio.playDash();
        particles.emitSmoke(this.x, this.y - 8, 6, def.accentColor, -28, 16);
      } else {
        this.vx = decision.targetVx;
      }

      if (decision.jump && decision.jumpVy < 0 && this.onGround) {
        this.vy = decision.jumpVy;
        this.onGround = false;
        audio.playJump();
      }

      const verticalOk = Math.abs(playerY - this.y) < 135;
      const wantsAttack =
        decision.attack ||
        (decision.kind === 'dash_in' && dist <= attackRange + 32) ||
        (!this.onGround && dist <= attackRange + 36 && verticalOk && this.attackCooldown <= 0.02);

      if (wantsAttack && dist <= attackRange + 32 && verticalOk && this.attackCooldown <= 0 && requestToken()) {
        this.beginHeroComboStrike(decision.comboChainCount, audio);
      }
      return;
    }

    // Hero Fighter Active Attack Phases (uses real getComboMoveForCharacter poses, lunge, hopVy & slash trails!)
    this.attackTimer -= dt;
    const move = this.heroCurrentMove;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-8 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        const dur = (move ? move.duration : 0.2) * def.attackSpeedMultiplier;
        this.attackTimer = Math.max(0.1, dur * 0.65);
        this.attackDealt = false;
        const lunge = move ? move.lungeSpeed : 460;
        this.vx = this.facing * lunge * 0.85;
        if (move?.hopVy && move.hopVy < 0) {
          this.vy = move.hopVy;
          this.onGround = false;
        }
        if (move?.passThrough) {
          this.x = clamp(this.x + this.facing * 110, minX + 24, maxX - 24);
          this.facing = playerX >= this.x ? 1 : -1;
        }
        audio.playSlash(Math.min(3, Math.max(1, this.heroComboStep)), Boolean(move?.heavy || this.heroAwakened));
        if (move) {
          for (const arc of move.slashArcs) {
            if (this.heroSlashTrails.length >= 16) this.heroSlashTrails.shift();
            this.heroSlashTrails.push({
              x: this.x + this.facing * 18,
              y: this.y + arc.yOffset,
              facing: this.facing,
              radius: 66 * arc.radiusScale,
              startAngle: arc.sa,
              endAngle: arc.ea,
              life: 0,
              maxLife: 0.2,
              outerColor: this.heroAwakened ? vfx.slashSecondary : vfx.slashPrimary,
              coreColor: vfx.slashRim,
              thickness: move.heavy ? 16 : 12,
              style: arc.style ?? move.trailStyle ?? 'arc',
              skinId: this.heroSkinId,
              characterId: def.id,
              rimColor: vfx.slashRim,
              secondaryColor: vfx.slashSecondary,
              motif: vfx.motif,
            });
          }
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        const reachMult = move?.reachScale ?? 1;
        const heightMult = move?.heightScale ?? 1;
        const hitW = Math.round((96 + def.reachBonus) * reachMult);
        const hitH = Math.round(84 * heightMult);
        const hitCenterX = move?.surroundHit ? this.x : this.x + this.facing * Math.round(hitW * 0.48);
        const rawDmg = move ? move.baseDamage : 22;
        const dmg = Math.max(8, Math.round(rawDmg * def.damageMultiplier * (this.heroAwakened ? 1.15 : 0.88)));
        const launched = Boolean(move && move.knockY < -240);
        if (Math.abs(playerX - hitCenterX) <= hitW * 0.65 && Math.abs(playerY - this.y) <= hitH + 45) {
          this.botBrain.notifyHitConfirmed(launched);
        }
        onMeleeHit({
          x: hitCenterX,
          y: this.y - 50,
          width: hitW,
          height: hitH,
          damage: dmg,
          dir: this.facing,
          parryable: !move?.unblockable,
          heavy: Boolean(move?.heavy),
          source: this,
        });

        // Awakened Hero Bot fires signature Crescent Wave on heavy combo finishers!
        if (this.heroAwakened && move?.heavy) {
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 40,
              y: this.y - 54,
              vx: this.facing * 940,
              vy: 0,
              radius: 26,
              damage: Math.round(dmg * 0.7),
              kind: def.id === 'kagura' ? 'fire_wave' : def.id === 'raijin' ? 'volt_lance' : 'sword_wave',
              fromPlayer: false,
              color: vfx.slashPrimary,
              secondaryColor: vfx.slashSecondary,
              rimColor: vfx.slashRim,
              theme: vfx.projectileTheme,
              maxLife: 0.9,
            })
          );
        }
      }
      if (this.attackTimer <= 0) {
        const distNow = Math.abs(playerX - this.x);
        const verticalNow = Math.abs(playerY - this.y) < 145;
        const canChain =
          distNow <= attackRange + 62 &&
          verticalNow &&
          ((this.comboFollowups > 0 && (this.comboFollowups--, true)) ||
            this.botBrain.consumeComboStep(distNow, attackRange + 62));
        if (canChain) {
          this.facing = playerX >= this.x ? 1 : -1;
          this.beginHeroComboStrike(this.comboFollowups, audio, true);
        } else {
          this.comboFollowups = 0;
          this.attackPhase = 'recovery';
          this.attackTimer = Math.max(0.08, 0.14 * def.attackSpeedMultiplier);
          if (this.hasToken) {
            this.hasToken = false;
            releaseToken();
          }
        }
      }
    } else if (this.attackPhase === 'recovery') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.activeSkillKind = 'none';
        this.attackCooldown = Math.max(0.06, 0.14 * def.attackSpeedMultiplier);
      }
    }
  }

  private beginHeroComboStrike(chainCount: number, audio: AudioEngine, isChainContinuation = false): void {
    const def = this.heroDef!;
    this.hasToken = true;
    this.comboFollowups = isChainContinuation ? chainCount : Math.max(0, chainCount);
    let move: ComboMoveSpec;
    if (!this.onGround) {
      this.heroAirComboStep = (this.heroAirComboStep % 3) + 1;
      move = getComboMoveForCharacter(def.id, this.heroAirComboStep, 'air');
    } else if (!isChainContinuation && this.dashActionTimer > 0) {
      this.heroComboStep = 1;
      move = getComboMoveForCharacter(def.id, 1, 'dash_slash');
    } else {
      this.heroComboStep = (this.heroComboStep % 6) + 1;
      move = getComboMoveForCharacter(def.id, this.heroComboStep, 'ground');
    }
    this.heroCurrentMove = move;
    this.attackPhase = 'windup';
    this.attackTimer = Math.max(0.06, (isChainContinuation ? 0.07 : 0.11) * def.attackSpeedMultiplier);
    this.attackDealt = false;
    this.poseTime = 0;
    if (!isChainContinuation) {
      audio.playTelegraph();
    }
  }

  private executeHeroSkillOrUltimate(
    isUltimate: boolean,
    playerX: number,
    playerY: number,
    minX: number,
    maxX: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[] | undefined,
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    releaseToken: () => void
  ): void {
    const def = this.heroDef!;
    const vfx = getSkinVfxProfile(def.id, this.heroSkinId);
    this.hasToken = true;
    this.activeSkillKind = isUltimate ? 'ultimate' : 'skill';
    this.skillCastTimer = 0.28;
    this.poseTime = 0;
    this.facing = playerX >= this.x ? 1 : -1;

    if (isUltimate) {
      // Character-Accurate Ultimate Attack with signature callout, shockwaves, projectiles & heavy AoE!
      audio.playAwaken();
      particles.emitShockwave(this.x, this.y - 54, def.ultimatePrimaryColor, 185, 0.36);
      particles.emitShockwave(this.x, this.y - 54, def.ultimateSecondaryColor, 125, 0.26);
      particles.emitSparks(this.x, this.y - 54, 24, def.ultimateSecondaryColor, 620);
      particles.emitText(this.x, this.y - 120, `${def.skills.ultimateFullName}!`, def.accentColor, 24);

      if (def.id === 'raijin' || def.id === 'zero' || def.id === 'mirage') {
        const endX = clamp(playerX - this.facing * 54, minX + 28, maxX - 28);
        particles.emitChainArc(this.x, this.y - 52, endX, this.y - 52, def.ultimateSecondaryColor, 6);
        this.x = endX;
        this.facing = playerX >= this.x ? 1 : -1;
      } else {
        this.vx = this.facing * 540;
      }

      const ultDmg = Math.round(42 * def.damageMultiplier);
      if (Math.abs(playerX - this.x) <= 235 && Math.abs(playerY - this.y) <= 170) {
        onMeleeHit({
          x: playerX,
          y: playerY - 48,
          width: 220,
          height: 130,
          damage: ultDmg,
          dir: this.facing,
          parryable: true,
          heavy: true,
          source: this,
        });
      }

      if (
        magicCircles &&
        (def.id === 'kagura' ||
          def.id === 'aether' ||
          def.id === 'valkyrie' ||
          def.id === 'chrono' ||
          def.id === 'mactien')
      ) {
        magicCircles.push(new MagicCircle(clamp(playerX, minX + 45, maxX - 45)));
      }

      const waveAngles = def.id === 'zero' || def.id === 'aether' ? [-0.22, 0, 0.22] : [-0.1, 0.1];
      for (const ang of waveAngles) {
        const spd = 920;
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 36,
            y: this.y - 56,
            vx: Math.cos(ang) * spd * this.facing,
            vy: Math.sin(ang) * spd,
            radius: 22,
            damage: Math.round(24 * def.damageMultiplier),
            kind:
              def.id === 'zero'
                ? 'kunai'
                : def.id === 'aether'
                  ? 'orb'
                  : def.id === 'mirage'
                    ? 'mirror_shard'
                    : def.id === 'kagura'
                      ? 'fire_wave'
                      : 'sword_wave',
            fromPlayer: false,
            color: def.ultimatePrimaryColor,
            secondaryColor: def.ultimateSecondaryColor,
            rimColor: '#ffffff',
            theme: vfx.projectileTheme,
            maxLife: 1.0,
          })
        );
      }

      this.attackPhase = 'recovery';
      this.attackTimer = 0.22;
      this.hasToken = false;
      releaseToken();
      return;
    }

    // Character-Specific Signature Skill [U] Execution!
    const kind = def.specialKind;
    particles.emitText(this.x, this.y - 108, `${def.skills.specialName}!`, vfx.hitTextColor, 20);

    if (kind === 'thunder_blink') {
      // Raijin: Lightning Blink Piercing Thrust across the arena!
      const startX = this.x;
      const endX = clamp(startX + this.facing * 285, minX + 28, maxX - 28);
      particles.emitChainArc(startX, this.y - 52, endX, this.y - 52, vfx.particleSecondary, 6);
      particles.emitLightning(endX, this.y - 68, vfx.particlePrimary, 80);
      this.x = endX;
      this.facing = playerX >= this.x ? 1 : -1;
      this.vx = this.facing * 240;
      audio.playLaser();
      const midX = (startX + endX) * 0.5;
      const spanW = Math.abs(endX - startX) + 80;
      onMeleeHit({
        x: midX,
        y: this.y - 50,
        width: spanW,
        height: 92,
        damage: Math.round(30 * def.damageMultiplier),
        dir: startX <= endX ? 1 : -1,
        parryable: true,
        heavy: true,
        source: this,
      });
    } else if (kind === 'phantom_barrage') {
      // Zero: Backflip Kunai Fan!
      this.vx = -this.facing * 250;
      if (this.onGround) {
        this.vy = -380;
        this.onGround = false;
      }
      audio.playSlash(3, true);
      for (const a of [-0.24, -0.12, 0, 0.12, 0.24]) {
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 28,
            y: this.y - 56,
            vx: Math.cos(a) * 960 * this.facing,
            vy: Math.sin(a) * 960,
            radius: 15,
            damage: Math.round(18 * def.damageMultiplier),
            kind: 'kunai',
            fromPlayer: false,
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 0.95,
          })
        );
      }
    } else if (kind === 'arcane_barrage') {
      // Aether: Arcane Orb Fan + Crescent Wave + +6 HP Ward!
      this.hp = Math.min(this.maxHp, this.hp + 6);
      audio.playLaser();
      for (const a of [-0.2, 0, 0.2]) {
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 34,
            y: this.y - 56,
            vx: Math.cos(a) * 880 * this.facing,
            vy: Math.sin(a) * 880,
            radius: 16,
            damage: Math.round(19 * def.damageMultiplier),
            kind: 'orb',
            fromPlayer: false,
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: '#ffffff',
            theme: vfx.projectileTheme,
            maxLife: 1.05,
          })
        );
      }
    } else if (kind === 'magma_eruption') {
      // Kagura: Advancing Flame Wave + Targeted Eruption Circle!
      audio.playCryoSummon();
      particles.emitGroundCrack(this.x + this.facing * 48, 64, vfx.particlePrimary);
      particles.emitEmbers(this.x + this.facing * 48, this.y - 44, 18, vfx.particleSecondary);
      if (magicCircles) {
        magicCircles.push(new MagicCircle(clamp(playerX, minX + 45, maxX - 45)));
      }
      projectiles.push(
        new Projectile({
          x: this.x + this.facing * 42,
          y: this.y - 48,
          vx: this.facing * 860,
          vy: 0,
          radius: 30,
          damage: Math.round(28 * def.damageMultiplier),
          kind: 'fire_wave',
          fromPlayer: false,
          color: vfx.slashPrimary,
          secondaryColor: vfx.slashSecondary,
          rimColor: vfx.slashRim,
          theme: vfx.projectileTheme,
          maxLife: 0.95,
        })
      );
    } else if (kind === 'holy_judgment') {
      // Valkyrie: Twin Radiant Glaive Waves + +6 HP!
      this.hp = Math.min(this.maxHp, this.hp + 6);
      audio.playSlash(3, true);
      for (const vyOff of [-65, 65]) {
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 38,
            y: this.y - 54,
            vx: this.facing * 920,
            vy: vyOff,
            radius: 24,
            damage: Math.round(22 * def.damageMultiplier),
            kind: 'sword_wave',
            fromPlayer: false,
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 0.95,
          })
        );
      }
    } else if (kind === 'mirror_fracture') {
      // Mirage: Prismatic Mirror Shard Volley!
      audio.playCryoShatter();
      particles.emitShards(this.x + this.facing * 42, this.y - 56, 12, vfx.particleSecondary, 240, 0.95);
      for (const a of [-0.18, 0, 0.18]) {
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 36,
            y: this.y - 56,
            vx: Math.cos(a) * 940 * this.facing,
            vy: Math.sin(a) * 940,
            radius: 14,
            damage: Math.round(20 * def.damageMultiplier),
            kind: 'mirror_shard',
            fromPlayer: false,
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 0.95,
          })
        );
      }
    } else if (kind === 'temporal_echo') {
      // Chrono: Clockwork Spatial Lunge + Delayed Rune Circle!
      audio.playParry();
      particles.emitShockwave(this.x, this.y - 52, vfx.slashPrimary, 105, 0.26);
      if (magicCircles) {
        magicCircles.push(new MagicCircle(clamp(playerX, minX + 45, maxX - 45)));
      }
      this.vx = this.facing * 520;
      onMeleeHit({
        x: this.x + this.facing * 64,
        y: this.y - 52,
        width: 140,
        height: 92,
        damage: Math.round(28 * def.damageMultiplier),
        dir: this.facing,
        parryable: true,
        heavy: true,
        source: this,
      });
    } else {
      // Kuro: Cryo / Seraph / Void Piercing Wave Burst!
      audio.playCryoSummon();
      particles.emitShockwave(this.x + this.facing * 36, this.y - 52, vfx.impactRingColor, 95, 0.25);
      projectiles.push(
        new Projectile({
          x: this.x + this.facing * 42,
          y: this.y - 52,
          vx: this.facing * 980,
          vy: 0,
          radius: 28,
          damage: Math.round(28 * def.damageMultiplier),
          kind: 'sword_wave',
          fromPlayer: false,
          color: vfx.slashPrimary,
          secondaryColor: vfx.slashSecondary,
          rimColor: vfx.slashRim,
          theme: vfx.projectileTheme,
          maxLife: 0.95,
        })
      );
    }

    this.attackCooldown = 0.14;
    this.hasToken = false;
    releaseToken();
  }

  private updateNinjaAI(
    dt: number,
    _dx: number,
    dist: number,
    playerX: number,
    decision: BotDecision,
    requestToken: () => boolean,
    releaseToken: () => void,
    projectiles: Projectile[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    if (this.attackPhase === 'none') {
      // Shadow-blink behind player when at mid-distance!
      if (dist > 130 && dist < 310 && this.ninjaBlinkCooldown <= 0 && requestToken()) {
        this.ninjaBlinkCooldown = 3.4 + Math.random() * 1.1;
        this.hasToken = true;
        particles.emitSmoke(this.x, this.y - 44, 10, '#c084fc', -45, 28);
        const behindSide: 1 | -1 = playerX >= this.x ? 1 : -1;
        this.x = clamp(playerX + behindSide * 78, 55, ARENA_WIDTH - 55);
        this.facing = playerX >= this.x ? 1 : -1;
        this.vx = 0;
        particles.emitSmoke(this.x, this.y - 44, 10, '#f43f5e', -45, 28);
        particles.emitSparks(this.x, this.y - 52, 8, '#f43f5e', 340);
        this.attackPhase = 'windup';
        this.attackTimer = 0.28;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
        return;
      }

      // Throw Kunai from afar if cooldown ready
      if (dist > 340 && dist < 560 && this.attackCooldown <= 0 && requestToken()) {
        this.hasToken = true;
        this.attackCooldown = 0.55;
        audio.playSlash(1, false);
        const projProfile = getEnemyVisualProfile(this.type, this.isElite);
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 32,
            y: this.y - 56,
            vx: this.facing * 760,
            vy: 0,
            radius: 10,
            damage: Math.round(this.damage * 0.85),
            kind: 'bullet',
            fromPlayer: false,
            color: projProfile.projectileColor ?? '#f43f5e',
            rimColor: projProfile.projectileRimColor ?? '#fecdd3',
          })
        );
        this.hasToken = false;
        releaseToken();
        return;
      }

      if (dist > 88) {
        this.vx = decision.targetVx || this.facing * this.speed;
      } else if (this.attackCooldown <= 0 && requestToken()) {
        this.hasToken = true;
        this.attackPhase = 'windup';
        this.comboFollowups = Math.max(1, decision.comboChainCount);
        this.attackTimer = 0.24;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      } else {
        this.vx = decision.targetVx;
      }
      return;
    }

    this.updateMeleePhases(dt, playerX, releaseToken, particles, audio, onMeleeHit);
  }

  private updateMeleeAI(
    dt: number,
    _dx: number,
    dist: number,
    playerAttacking: boolean,
    decision: BotDecision,
    requestToken: () => boolean,
    releaseToken: () => void,
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    const isShield = this.type === 'shield_guard';
    const isSword = this.type === 'swarm_blade' || this.type === 'meta_melee';
    const attackRange =
      this.type === 'heavy_brute'
        ? 112
        : isShield
          ? 98
          : this.type === 'swarm_blade'
            ? 94
            : 86;

    if (this.attackPhase === 'none') {
      if (decision.kind === 'dash_back' && this.evadeCooldown <= 0) {
        this.evadeCooldown = 0.95;
        this.dashActionTimer = 0.16;
        this.vx = decision.targetVx;
        this.attackCooldown = Math.min(this.attackCooldown, 0.05);
        particles.emitSmoke(this.x, GROUND_Y - 2, 4, '#94a3b8', -20, 12);
        return;
      }

      if (isShield) {
        if (dist > attackRange - 12) {
          this.vx = decision.targetVx || this.facing * this.speed * 1.18;
        } else if (playerAttacking && this.shieldBrokenTimer <= 0) {
          this.vx = this.facing * 45;
          this.attackCooldown = Math.min(this.attackCooldown, 0.04);
        } else if (this.attackCooldown <= 0 && requestToken()) {
          this.hasToken = true;
          this.attackPhase = 'windup';
          this.comboFollowups = Math.max(0, decision.comboChainCount - 1);
          this.attackTimer = 0.16;
          this.attackDealt = false;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.vx = decision.targetVx;
        }
        return;
      }

      const wantsStrike =
        decision.attack ||
        decision.skill ||
        decision.ultimate ||
        (decision.kind === 'dash_in' && dist <= attackRange + 22);

      if (wantsStrike && dist <= attackRange + 18 && this.attackCooldown <= 0 && requestToken()) {
        this.hasToken = true;
        this.attackPhase = 'windup';
        this.comboFollowups =
          decision.comboChainCount > 0
            ? decision.comboChainCount
            : isSword && Math.random() < 0.55
              ? 1
              : 0;
        this.attackTimer =
          decision.ultimate || decision.skill
            ? 0.13
            : this.type === 'heavy_brute'
              ? 0.34
              : this.type === 'swarm_blade'
                ? 0.15
                : 0.18;
        this.attackDealt = false;
        this.poseTime = 0;
        if (decision.triggerBurstShockwave) {
          particles.emitShockwave(this.x, this.y - 48, this.glowColor, 90, 0.22);
        }
        audio.playTelegraph();
      } else {
        this.vx = decision.targetVx;
        if (decision.jumpVy < 0 && this.onGround) {
          this.vy = decision.jumpVy;
          this.onGround = false;
        }
      }
      return;
    }

    this.updateMeleePhases(dt, _dx + this.x, releaseToken, particles, audio, onMeleeHit);
  }

  private updateMeleePhases(
    dt: number,
    playerX: number,
    releaseToken: () => void,
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx = -this.facing * (this.type === 'heavy_brute' ? 20 : 35);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = this.type === 'heavy_brute' ? 0.2 : 0.13;
        const lunge =
          this.type === 'shield_guard'
            ? 500
            : this.type === 'cyber_ninja'
              ? 480
              : this.type === 'swarm_blade'
                ? 440
                : this.type === 'heavy_brute'
                  ? 290
                  : 380;
        this.vx = this.facing * lunge;
        audio.playSlash(this.type === 'heavy_brute' ? 3 : 1, this.type === 'heavy_brute');
        if (this.type === 'heavy_brute') {
          particles.emitGroundCrack(this.x + this.facing * 52, 54, '#f97316');
          particles.emitShockwave(this.x + this.facing * 52, this.y - 16, '#fb923c', 95, 0.26);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        const hitW = this.type === 'heavy_brute' ? 118 : this.type === 'shield_guard' ? 88 : 84;
        const hitCenterX = this.x + this.facing * (this.type === 'heavy_brute' ? 58 : 46);
        if (Math.abs(playerX - hitCenterX) <= hitW * 0.65) {
          this.botBrain.notifyHitConfirmed(this.type === 'heavy_brute');
        }
        onMeleeHit({
          x: hitCenterX,
          y: this.y - 48,
          width: hitW,
          height: this.type === 'heavy_brute' ? 92 : 80,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          heavy: this.type === 'heavy_brute' || this.activeSkillKind === 'ultimate',
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        const distNow = Math.abs(playerX - this.x);
        const canChain =
          distNow <= 160 &&
          ((this.comboFollowups > 0 && (this.comboFollowups--, true)) ||
            this.botBrain.consumeComboStep(distNow, 160));
        if (canChain) {
          this.facing = playerX >= this.x ? 1 : -1;
          this.attackPhase = 'windup';
          this.attackTimer = 0.12;
          this.attackDealt = false;
          this.poseTime = 0;
        } else {
          this.comboFollowups = 0;
          this.activeSkillKind = 'none';
          this.attackPhase = 'recovery';
          this.attackTimer = this.type === 'heavy_brute' ? 0.28 : 0.16;
          if (this.hasToken) {
            this.hasToken = false;
            releaseToken();
          }
        }
      }
    } else if (this.attackPhase === 'recovery') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown =
          (this.type === 'heavy_brute' ? 0.34 : 0.16) + Math.random() * 0.16;
      }
    }
  }

  private updateGunnerAI(
    dt: number,
    _dx: number,
    dist: number,
    decision: BotDecision,
    requestToken: () => boolean,
    releaseToken: () => void,
    projectiles: Projectile[],
    audio: AudioEngine
  ): void {
    if (this.attackPhase === 'none') {
      if (dist < 250) {
        this.vx = decision.dash ? decision.targetVx : -this.facing * this.speed * 0.95;
      } else if (dist > 540) {
        this.vx = this.facing * this.speed;
      } else if (this.attackCooldown <= 0 && requestToken()) {
        this.hasToken = true;
        this.attackPhase = 'windup';
        this.attackTimer = 0.46;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      } else {
        this.vx = decision.targetVx * 0.65;
      }
      return;
    }

    this.vx *= Math.exp(-10 * dt);
    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.36;
        this.fireBullet(projectiles, audio);
      }
    } else if (this.attackPhase === 'active') {
      if (!this.attackDealt && this.attackTimer <= 0.18) {
        this.attackDealt = true;
        this.fireBullet(projectiles, audio);
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.36;
        if (this.hasToken) {
          this.hasToken = false;
          releaseToken();
        }
      }
    } else if (this.attackPhase === 'recovery') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.42 + Math.random() * 0.22;
      }
    }
  }

  private fireBullet(projectiles: Projectile[], audio: AudioEngine): void {
    audio.playGunshot();
    const projProfile = getEnemyVisualProfile(this.type, this.isElite);
    projectiles.push(
      new Projectile({
        x: this.x + this.facing * 38,
        y: this.y - 60,
        vx: this.facing * 690,
        vy: (Math.random() - 0.5) * 26,
        radius: 9,
        damage: this.damage,
        kind: 'bullet',
        fromPlayer: false,
        color: projProfile.projectileColor ?? '#fde047',
        rimColor: projProfile.projectileRimColor ?? '#38bdf8',
      })
    );
  }

  private updateFrostMageAI(
    dt: number,
    dist: number,
    playerX: number,
    playerY: number,
    decision: BotDecision,
    requestToken: () => boolean,
    releaseToken: () => void,
    projectiles: Projectile[],
    magicCircles: MagicCircle[] | undefined,
    particles: ParticleSystem,
    audio: AudioEngine
  ): void {
    if (this.attackPhase === 'none') {
      if (dist < 235) {
        this.vx = decision.dash ? decision.targetVx : -this.facing * this.speed * 0.95;
      } else if (dist > 510) {
        this.vx = this.facing * this.speed;
      } else if (this.attackCooldown <= 0 && requestToken()) {
        this.hasToken = true;
        this.attackPhase = 'windup';
        this.attackTimer = 0.46;
        this.attackDealt = false;
        this.poseTime = 0;
        particles.emitIceShards(this.x + this.facing * 20, this.y - 62, 5, this.facing);
        audio.playTelegraph();
      } else {
        this.vx = decision.targetVx * 0.65;
      }
      return;
    }

    this.vx *= Math.exp(-10 * dt);
    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.26;
        this.mageSpellToggle = (this.mageSpellToggle + 1) % 2;
        if (this.mageSpellToggle === 0 && magicCircles) {
          magicCircles.push(new MagicCircle(clamp(playerX, 85, ARENA_WIDTH - 85)));
          audio.playCryoSummon();
        } else {
          audio.playLaser();
          const projProfile = getEnemyVisualProfile(this.type, this.isElite);
          const offsets = this.isElite ? [-24, 24] : [0];
          for (const dyOff of offsets) {
            const tx = playerX - this.x;
            const ty = playerY - 52 + dyOff - (this.y - 60);
            const len = Math.hypot(tx, ty) || 1;
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 30,
                y: this.y - 60,
                vx: (tx / len) * 610,
                vy: (ty / len) * 610,
                radius: 13,
                damage: this.damage,
                kind: 'orb',
                fromPlayer: false,
                color: projProfile.projectileColor ?? '#22d3ee',
                rimColor: projProfile.projectileRimColor ?? '#e0f2fe',
              })
            );
          }
        }
      }
    } else if (this.attackPhase === 'active') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.34;
        if (this.hasToken) {
          this.hasToken = false;
          releaseToken();
        }
      }
    } else if (this.attackPhase === 'recovery') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.36 + Math.random() * 0.2;
      }
    }
  }

  private updateBerserkerAI(
    dt: number,
    dist: number,
    playerX: number,
    decision: BotDecision,
    requestToken: () => boolean,
    releaseToken: () => void,
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 110) {
        this.vx = decision.targetVx || this.facing * this.speed;
      } else if (this.attackCooldown <= 0 && requestToken()) {
        this.hasToken = true;
        this.reaperFlurryStep = 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.28;
        this.attackDealt = false;
        this.poseTime = 0;
        particles.emitSparks(this.x + this.facing * 22, this.y - 60, 6, '#f43f5e', 340);
        audio.playTelegraph();
      } else {
        this.vx = decision.targetVx;
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.18;
        this.attackDealt = false;
        this.vx = this.facing * 520;
        if (this.reaperFlurryStep === 0 && this.onGround) {
          this.vy = -230;
          this.onGround = false;
        }
        audio.playSlash(2, true);
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        if (Math.abs(playerX - (this.x + this.facing * 58)) <= 76) {
          this.botBrain.notifyHitConfirmed(false);
        }
        onMeleeHit({
          x: this.x + this.facing * 58,
          y: this.y - 50,
          width: 112,
          height: 84,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.reaperFlurryStep++;
        if (this.reaperFlurryStep < 2) {
          this.facing = playerX >= this.x ? 1 : -1;
          this.attackPhase = 'windup';
          this.attackTimer = 0.18;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.attackPhase = 'recovery';
          this.attackTimer = 0.28;
          if (this.hasToken) {
            this.hasToken = false;
            releaseToken();
          }
        }
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.32 + Math.random() * 0.22;
      }
    }
  }

  protected getPose(): StickPoseName {
    if (this.dying) return 'ko';
    if (this.hurtTimer > 0 || this.stunTimer > 0) return 'hurt';
    if (this.isParryGuarding()) return 'parry';

    if (this.heroDef) {
      if (this.skillCastTimer > 0) return 'cryo_cast';
      if (this.dashActionTimer > 0) return 'dash';
      if (this.attackPhase === 'windup' || this.attackPhase === 'active') {
        return this.heroCurrentMove ? this.heroCurrentMove.pose : 'attack_2';
      }
      if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
      if (Math.abs(this.vx) > 30) return 'run';
      return 'idle';
    }

    if (this.dashActionTimer > 0) return 'dash';
    if (this.type === 'deepseek_gunner' && (this.attackPhase === 'windup' || this.attackPhase === 'active')) {
      return 'gun_aim';
    }
    if (this.type === 'frost_mage') {
      if (this.attackPhase === 'windup' || this.attackPhase === 'active') return 'float_cast';
    }
    if (this.type === 'berserker_reaper') {
      if (this.attackPhase === 'windup') return 'iai_draw_slash';
      if (this.attackPhase === 'active') return 'spin_slash';
    }
    if (this.type === 'shield_guard') {
      if (this.attackPhase === 'active') return 'shield_charge';
      if (this.isShieldActive() && Math.abs(this.vx) <= 28) return 'shield_guard';
    }
    if (this.type === 'heavy_brute') {
      if (this.attackPhase === 'windup') return 'nodachi_overhead_slam';
      if (this.attackPhase === 'active') return 'nodachi_earth_splitter';
    }
    if (this.type === 'cyber_ninja' && this.attackPhase === 'active') {
      return 'dagger_reverse_slice';
    }
    if (!this.onGround && this.attackPhase === 'active') return 'air_attack';
    if (this.attackPhase === 'active') return 'attack_2';
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (Math.abs(this.vx) > 25) return 'run';
    return 'idle';
  }

  public render(ctx: CanvasRenderingContext2D, silhouetteMode = false, whiteFlash = false): void {
    if (!this.alive) return;
    const isMono = silhouetteMode || whiteFlash;
    const hitShake = this.hitFlash > 0 ? (Math.random() - 0.5) * 9 * (this.hitFlash / 0.12) : 0;

    // Render Hero Fighter Persona (Solo 1v1 exact selected character visual, weapon, headgear, scarf & trails!)
    if (this.heroDef) {
      const def = this.heroDef;
      const vfx = getSkinVfxProfile(def.id, this.heroSkinId);
      const awakenedProfile = this.heroAwakened
        ? getAwakenedVisualProfile(def.id, this.heroSkinId)
        : null;

      if (!isMono && this.heroAfterimages.length > 0) {
        renderAfterimages(ctx, this.heroAfterimages);
      }

      if (this.isParryGuarding() && !isMono) {
        ctx.save();
        try {
          ctx.translate(this.x + this.facing * 24, this.y - 52);
          ctx.scale(this.facing, 1);
          ctx.strokeStyle = vfx.slashPrimary;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, 46, -1.3, 1.3);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }

      if (this.attackPhase === 'windup' && !isMono) {
        ctx.save();
        try {
          ctx.strokeStyle = def.accentColor;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(this.x + this.facing * 18, this.y - 68, 14 + Math.sin(this.poseTime * 28) * 3, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }

      this.lastRenderedJoints = renderStickman(ctx, {
        x: this.x + hitShake,
        y: this.y,
        facing: this.facing,
        pose: this.getPose(),
        poseTime: this.poseTime,
        walkPhase: this.walkPhase,
        bodyColor: this.heroAwakened ? def.awakenedBodyColor : def.bodyColor,
        glowColor: this.heroAwakened ? vfx.impactRingColor : def.glowColor,
        lineWidth: this.heroAwakened ? 10.6 : 10.2,
        headRadius: 12.8,
        hitFlash: this.hitFlash,
        silhouette: silhouetteMode,
        whiteFlash,
        scarf: this.heroScarf,
        scarfPrimary: awakenedProfile ? awakenedProfile.scarfPrimary : def.scarfPrimary,
        scarfHighlight: awakenedProfile ? awakenedProfile.scarfHighlight : def.scarfHighlight,
        hasSheath: def.hasSheath,
        headGear: def.headGear,
        characterId: def.id,
        vx: this.vx,
        vy: this.vy,
        awakened: this.heroAwakened,
        darkAura: this.heroAwakened ? def.awakenedAuraStyle : def.auraStyle,
        weapon: this.heroAwakened ? def.awakenedWeapon : def.weapon,
        awakenedForm: this.heroAwakened ? def.id : null,
        skinId: this.heroSkinId,
        jointsOverride: this.blendedJoints ?? undefined,
        attackProgress: this.attackPhase === 'active' ? 0.55 : 0,
        attackAuraColor: vfx.swingAuraColor,
        attackAuraSecondary: vfx.swingAuraSecondary,
        vfxMotif: vfx.motif,
        auraRimColor: vfx.auraTendrilPrimary,
        auraPuddleColor: vfx.auraTendrilSecondary,
      });

      if (!isMono && this.heroSlashTrails.length > 0) {
        renderSlashTrails(ctx, this.heroSlashTrails);
      }

      if (this.markKind && this.markStacks > 0 && !this.dying && !isMono) {
        this.renderElementalMarkGlyph(ctx);
      }
      if (this.stunTimer > 0 && !this.dying && !isMono) {
        ctx.save();
        try {
          ctx.font = 'italic 800 14px "Barlow Condensed", sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText('STUN', this.x, this.y - 110);
        } finally {
          ctx.restore();
        }
      }
      return;
    }

    const profile = getEnemyVisualProfile(this.type, this.isElite);

    // Red Laser Aim Telegraph for DeepSeek Gunner
    if (this.type === 'deepseek_gunner' && this.attackPhase === 'windup' && !isMono) {
      ctx.save();
      try {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(this.x + this.facing * 32, this.y - 60);
        ctx.lineTo(this.x + this.facing * 620, this.y - 60);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // Melee / Spell Telegraph Flash Ring
    if (this.attackPhase === 'windup' && this.type !== 'deepseek_gunner' && !isMono) {
      ctx.save();
      try {
        ctx.strokeStyle = profile.vermilionAccent;
        ctx.lineWidth = this.type === 'heavy_brute' ? 3.5 : 2.8;
        ctx.beginPath();
        ctx.arc(this.x + this.facing * 18, this.y - 68, 15 + Math.sin(this.poseTime * 28) * 4, 0, Math.PI * 2);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // Ink-Wash Elite Rank Crest Ring beneath feet
    if (this.isElite && !this.dying && !isMono) {
      const pulse = Math.sin(this.poseTime * 6.5) * 2.5;
      ctx.save();
      try {
        ctx.strokeStyle = profile.inkOutlineColor;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 2, 34 + pulse, 8.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha(profile.accentColor, 0.88);
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 2, 34 + pulse, 8.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha(profile.vermilionAccent, 0.78);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 2, 26 + pulse * 0.6, 6.2, 0, 0.25, Math.PI - 0.25);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    const weapon =
      this.type === 'deepseek_gunner'
        ? 'pistol'
        : this.type === 'shield_guard'
          ? 'shield_sword'
          : this.type === 'cyber_ninja'
            ? 'twin_daggers'
            : this.type === 'heavy_brute'
              ? 'solar_greatblade'
              : this.type === 'frost_mage'
                ? 'neon_orb'
                : this.type === 'berserker_reaper'
                  ? 'reaper_scythe'
                  : this.type === 'swarm_blade'
                    ? 'sword'
                    : 'dagger';

    this.lastRenderedJoints = renderStickman(ctx, {
      x: this.x + hitShake,
      y: this.y,
      facing: this.facing,
      pose: this.getPose(),
      poseTime: this.poseTime,
      walkPhase: this.walkPhase,
      bodyColor: profile.bodyColor,
      glowColor: profile.accentColor,
      lineWidth: profile.lineWidth,
      headRadius: profile.headRadius,
      hitFlash: this.hitFlash,
      silhouette: silhouetteMode,
      whiteFlash,
      weapon,
      bossOutfit: profile.outfit,
      darkAura: this.isElite ? 'gold' : this.type === 'frost_mage' ? 'cyan' : 'none',
      entityTier: this.isElite ? 'elite' : 'mob',
      inkRimColor: profile.rimColor,
      inkAccent: profile.vermilionAccent,
      inkWash: true,
      jointsOverride: this.blendedJoints ?? undefined,
    });

    // Elemental Synergy Mark Glyph
    if (this.markKind && this.markStacks > 0 && !this.dying && !isMono) {
      this.renderElementalMarkGlyph(ctx);
    }

    // Overhead mini HP bar & Elite badge for regular enemies
    if (!this.isBoss() && !this.dying && !isMono) {
      if (this.stunTimer > 0) {
        ctx.save();
        try {
          ctx.font = 'italic 800 14px "Barlow Condensed", sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText('STUN', this.x, this.y - 110);
        } finally {
          ctx.restore();
        }
      }
      if (this.hp < this.maxHp || this.isElite) {
        const bw = this.isElite ? 54 : 44;
        const bh = this.isElite ? 5.4 : 4.5;
        const bx = this.x - bw * 0.5;
        const by = this.y - 104;
        const maxHpSafe = Math.max(1, Number.isFinite(this.maxHp) ? this.maxHp : 1);
        const rawRatio = Number.isFinite(this.hp) ? this.hp / maxHpSafe : 0;
        const hpRatio = clamp(rawRatio, 0, 1);

        ctx.save();
        try {
          ctx.fillStyle = 'rgba(11, 12, 16, 0.92)';
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = this.isElite ? '#f59e0b' : '#ef4444';
          ctx.fillRect(bx, by, bw * hpRatio, bh);
          ctx.strokeStyle = profile.inkOutlineColor;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);

          if (this.isElite) {
            const pillW = Math.max(58, this.label.length * 7 + 20);
            const pillH = 14;
            const pillX = this.x - pillW * 0.5;
            const pillY = by - 17;
            ctx.fillStyle = 'rgba(11, 12, 16, 0.88)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = colorWithAlpha(profile.accentColor, 0.92);
            ctx.lineWidth = 1.2;
            ctx.strokeRect(pillX, pillY, pillW, pillH);
            ctx.font = '800 11px "Barlow Condensed", sans-serif';
            ctx.fillStyle = '#fde047';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`★ ${this.label}`, this.x, pillY + pillH * 0.5 + 0.5);
          }
        } finally {
          ctx.restore();
        }
      }
    }
  }

  protected renderElementalMarkGlyph(ctx: CanvasRenderingContext2D): void {
    if (!this.markKind || this.markStacks <= 0) return;
    const spec = getElementalMarkSpec(this.markKind);
    const primaryCol = this.markPrimaryColor ?? spec.primaryColor;
    const secondaryCol = this.markSecondaryColor ?? spec.secondaryColor;
    const sealY = this.isBoss() ? this.y - 128 : this.y - 122;
    const pulse = 1 + Math.sin(this.poseTime * 11) * (this.markStacks >= 3 ? 0.16 : 0.08);
    ctx.save();
    try {
      ctx.translate(this.x, sealY);
      ctx.scale(pulse, pulse);

      ctx.save();
      try {
        ctx.rotate(this.poseTime * 2.2);
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = 5;
        ctx.strokeRect(-11, -11, 22, 22);
        ctx.strokeStyle = this.markStacks >= 3 ? secondaryCol : primaryCol;
        ctx.lineWidth = 2.2;
        ctx.strokeRect(-11, -11, 22, 22);
      } finally {
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(9, 11, 16, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '900 13px "Noto Serif JP", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.markStacks >= 3 ? '#ffffff' : secondaryCol;
      ctx.fillText(spec.kanji, 0, 1);

      for (let s = 0; s < 3; s++) {
        const px = (s - 1) * 9;
        ctx.fillStyle = s < this.markStacks ? secondaryCol : 'rgba(51, 65, 85, 0.7)';
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, 16, s < this.markStacks ? 3.2 : 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } finally {
      ctx.restore();
    }
  }
}

function brainDecisionJumpAllowed(phase: 'none' | 'windup' | 'active' | 'recovery'): boolean {
  return phase === 'none' || phase === 'recovery';
}
