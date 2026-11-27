import { ARENA_WIDTH, BOSS_ROSTER, GRAVITY, GROUND_Y, clamp } from './rules';
import type { BossId } from './types';
import type { AudioEngine } from './AudioEngine';
import type { ParticleSystem } from './ParticleSystem';
import { type StickPoseName, renderStickman } from './StickmanRenderer';
import { MagicCircle, MagmaPillar, Projectile, stepBotBrainHook } from './Entities';
import { Enemy, type EnemyAttackHit } from './Enemy';
import { getEnemyVisualProfile } from './enemyVisuals';
import { colorWithAlpha } from './renderer/inkStyle';

export class Boss extends Enemy {
  public readonly bossId: BossId;
  public readonly faction: string;
  public readonly bossName: string;
  public readonly bossTitle: string;
  public readonly accentColor: string;

  public shieldActive = false;
  public comboStep = 0;
  public floatTime = 0;
  public awakeningEventTriggered = false;

  // Phase 2 Enrage & Sekiro-style Posture / Stagger Gauge!
  public phase: 1 | 2 = 1;
  public posture = 0;
  public readonly maxPosture = 100;
  public postureIdleTimer = 0;
  public staggerTimer = 0;

  private sniperAimY = GROUND_Y - 52;
  private patternIndex = 0;
  private leapSlamPending = false;

  constructor(bossId: BossId, x: number) {
    super(bossId, x, false, false);
    const meta = BOSS_ROSTER[bossId];
    this.bossId = bossId;
    this.faction = meta.faction;
    this.bossName = meta.name;
    this.bossTitle = meta.title;
    this.accentColor = meta.accentColor;
    this.maxHp = meta.maxHp;
    this.hp = meta.maxHp;
    this.trailHp = meta.maxHp;
    this.scoreValue =
      bossId === 'boss_omega' ? 2400 : bossId === 'boss_fable' ? 1800 : 950;
    this.glowColor = meta.accentColor;
    this.label = meta.name;

    switch (bossId) {
      case 'boss_haiku':
        this.bodyColor = '#8f7fa6';
        this.speed = 285;
        this.damage = 28;
        this.shieldActive = true;
        break;
      case 'boss_astra':
        this.bodyColor = '#f3e5ab';
        this.speed = 350;
        this.damage = 31;
        break;
      case 'boss_glacius':
        this.bodyColor = '#bae6fd';
        this.speed = 305;
        this.damage = 32;
        break;
      case 'boss_opus':
        this.bodyColor = '#64748b';
        this.speed = 450;
        this.damage = 34;
        break;
      case 'boss_vulcan':
        this.bodyColor = '#fdba74';
        this.speed = 270;
        this.damage = 42;
        break;
      case 'boss_sol':
        this.bodyColor = '#f8fafc';
        this.speed = 325;
        this.damage = 37;
        break;
      case 'boss_nyx':
        this.bodyColor = '#c4b5fd';
        this.speed = 420;
        this.damage = 36;
        break;
      case 'boss_raiden':
        this.bodyColor = '#7dd3fc';
        this.speed = 415;
        this.damage = 40;
        break;
      case 'boss_akaza':
        this.bodyColor = '#fda4af';
        this.speed = 435;
        this.damage = 43;
        break;
      case 'boss_kronos':
        this.bodyColor = '#fef08a';
        this.speed = 455;
        this.damage = 42;
        break;
      case 'boss_omega':
        this.bodyColor = '#fdba74';
        this.speed = 355;
        this.damage = 46;
        this.y = GROUND_Y - 125;
        this.onGround = false;
        break;
      default:
        // boss_fable
        this.bodyColor = '#84cc16';
        this.speed = 300;
        this.damage = 38;
        this.y = GROUND_Y - 125;
        this.onGround = false;
        break;
    }
    this.attackCooldown = 0.45;
  }

  public isStaggered(): boolean {
    return this.staggerTimer > 0 && !this.dying;
  }

  public override isShieldActive(): boolean {
    if (this.isParryGuarding()) return true;
    return (
      this.bossId === 'boss_haiku' &&
      this.shieldActive &&
      this.shieldBrokenTimer <= 0 &&
      this.stunTimer <= 0 &&
      this.staggerTimer <= 0
    );
  }

  public override breakShield(particles: ParticleSystem): void {
    this.shieldBrokenTimer = 2.8;
    this.triggerPostureBreak(particles);
  }

  public addPostureDamage(amount: number, particles: ParticleSystem, audio?: AudioEngine): boolean {
    if (!this.alive || this.dying || this.staggerTimer > 0) return false;
    this.postureIdleTimer = 1.8;
    this.posture = Math.min(this.maxPosture, this.posture + amount);
    if (this.posture >= this.maxPosture) {
      if (audio) audio.playCryoShatter();
      this.triggerPostureBreak(particles);
      return true;
    }
    return false;
  }

  private triggerPostureBreak(particles: ParticleSystem): void {
    this.posture = 0;
    this.staggerTimer = 1.9;
    this.stunTimer = Math.max(this.stunTimer, 1.9);
    this.attackPhase = 'none';
    this.attackTimer = 0;
    this.leapSlamPending = false;
    this.vx = -this.facing * 240;
    particles.emitShockwave(this.x, this.y - 54, '#facc15', 165, 0.36);
    particles.emitSparks(this.x, this.y - 58, 26, '#fef08a', 620);
    particles.emitText(this.x, this.y - 126, 'PHÁ GIÁP · CHOÁNG!', '#facc15', 26);
  }

  public override takeDamage(
    dmg: number,
    knockX: number,
    knockY: number,
    particles: ParticleSystem,
    audio: AudioEngine,
    heavy = false
  ): boolean {
    const finalDmg = this.isStaggered() ? Math.round(dmg * 1.32) : dmg;
    return super.takeDamage(finalDmg, knockX, knockY, particles, audio, heavy);
  }

  public updateBoss(params: {
    dt: number;
    playerX: number;
    playerY: number;
    playerAttacking?: boolean;
    playerDashing?: boolean;
    projectiles: Projectile[];
    magicCircles: MagicCircle[];
    magmaPillars: MagmaPillar[];
    particles: ParticleSystem;
    audio: AudioEngine;
    onMeleeHit: (hit: EnemyAttackHit) => void;
    onTriggerFableAwakening: () => void;
    onPhaseTwoTransition?: (boss: Boss) => void;
  }): void {
    const {
      dt,
      playerX,
      playerY,
      playerAttacking,
      playerDashing,
      projectiles,
      magicCircles,
      magmaPillars,
      particles,
      audio,
      onMeleeHit,
      onTriggerFableAwakening,
      onPhaseTwoTransition,
    } = params;

    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }

    this.poseTime += dt;
    this.floatTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.staggerTimer = Math.max(0, this.staggerTimer - dt);
    this.shieldBrokenTimer = Math.max(0, this.shieldBrokenTimer - dt);
    this.parryGuardTimer = Math.max(0, this.parryGuardTimer - dt);
    this.dashActionTimer = Math.max(0, this.dashActionTimer - dt);
    this.skillCastTimer = Math.max(0, this.skillCastTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.postureIdleTimer > 0) {
      this.postureIdleTimer -= dt;
    } else if (this.posture > 0 && this.staggerTimer <= 0) {
      this.posture = Math.max(0, this.posture - 13.5 * dt);
    }

    if (this.trailHp > this.hp) {
      this.trailHp = Math.max(this.hp, this.trailHp - 135 * dt);
    } else {
      this.trailHp = this.hp;
    }

    // Fable / Omega dramatic Awakening Event at <= 72% HP
    if (
      (this.bossId === 'boss_fable' || this.bossId === 'boss_omega') &&
      !this.awakeningEventTriggered &&
      this.hp <= this.maxHp * 0.72 &&
      !this.dying
    ) {
      this.awakeningEventTriggered = true;
      onTriggerFableAwakening();
    }

    // Universal Boss Phase 2 Enrage Transition at <= 50% HP!
    if (this.phase === 1 && !this.dying && this.hp > 0 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.speed = Math.round(this.speed * 1.22);
      this.damage = Math.round(this.damage * 1.15);
      this.staggerTimer = 0;
      this.stunTimer = 0;
      this.attackPhase = 'none';
      this.attackCooldown = 0.35;
      audio.playAwaken();
      particles.emitShockwave(this.x, this.y - 54, this.accentColor, 210, 0.42);
      particles.emitLightning(this.x, this.y - 96, this.accentColor, 95);
      particles.emitEmbers(this.x, this.y - 52, 28, this.accentColor);
      particles.emitText(this.x, this.y - 132, `${this.bossName} · CUỒNG NỘ PHASE II!`, this.accentColor, 26);
      onPhaseTwoTransition?.(this);
    }

    if (this.dying) {
      this.koTimer += dt;
      this.vy += GRAVITY * dt;
      this.x = clamp(this.x + this.vx * dt, 45, ARENA_WIDTH - 45);
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.vx *= Math.exp(-8 * dt);
      }
      if (this.koTimer >= 0.65) {
        this.alive = false;
        particles.emitSmoke(this.x, this.y - 30, 26, '#f8fafc', -110, 56);
        particles.emitShockwave(this.x, this.y - 50, this.accentColor, 180, 0.45);
      }
      this.stepSkeletonBlend(dt);
      return;
    }

    // Physics (Fable & Omega levitate; others obey gravity + leap-slam landing detection)
    const prevX = this.x;
    if (this.bossId === 'boss_fable' || this.bossId === 'boss_omega') {
      const targetHoverY = GROUND_Y - 125 + Math.sin(this.floatTime * 3.2) * 22;
      this.y += (targetHoverY - this.y) * (1 - Math.exp(-5 * dt));
      this.x = clamp(this.x + this.vx * dt, 65, ARENA_WIDTH - 65);
      if (Math.random() < (this.phase === 2 ? 0.45 : 0.25)) {
        const emberCol =
          this.bossId === 'boss_omega'
            ? this.phase === 2
              ? '#e879f9'
              : '#f97316'
            : this.phase === 2
              ? '#c084fc'
              : '#22c55e';
        particles.emitEmbers(this.x, this.y - 35, 1, emberCol);
      }
    } else {
      this.vy += GRAVITY * dt;
      this.x = clamp(this.x + this.vx * dt, 50, ARENA_WIDTH - 50);
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;

        // Handle Leap-Slam touchdown impact
        if (this.leapSlamPending) {
          this.leapSlamPending = false;
          this.vx = 0;
          audio.playCryoShatter();
          particles.emitGroundCrack(this.x, 86, this.accentColor);
          particles.emitShockwave(this.x, this.y - 16, this.accentColor, 165, 0.36);

          onMeleeHit({
            x: this.x,
            y: this.y - 46,
            width: 190,
            height: 92,
            damage: this.damage + 4,
            dir: this.facing,
            parryable: true,
            source: this,
          });

          if (this.bossId === 'boss_vulcan') {
            const count = this.phase === 2 ? 3 : 2;
            for (let s = 1; s <= count; s++) {
              for (const dir of [-1, 1] as const) {
                const px = clamp(this.x + dir * s * 135, 65, ARENA_WIDTH - 65);
                magmaPillars.push(new MagmaPillar(px, dir, s * 0.14, 0));
                const mc = new MagicCircle(px);
                mc.radius = 68;
                mc.telegraphTime = 0.48 + s * 0.14;
                magicCircles.push(mc);
              }
            }
          } else if (this.bossId === 'boss_glacius') {
            for (const ox of [-160, 160]) {
              magicCircles.push(new MagicCircle(clamp(this.x + ox, 85, ARENA_WIDTH - 85)));
            }
          } else if (this.bossId === 'boss_akaza') {
            // Blood Oni Meteor Dive spawns outward shockwave orbs + twin blood runes!
            for (const dir of [-1, 1] as const) {
              projectiles.push(
                new Projectile({
                  x: this.x + dir * 36,
                  y: this.y - 46,
                  vx: dir * 760,
                  vy: 0,
                  radius: 15,
                  damage: this.damage - 4,
                  kind: 'laser',
                  fromPlayer: false,
                  color: '#f43f5e',
                  rimColor: '#ffe4e6',
                })
              );
              if (this.phase === 2) {
                magicCircles.push(new MagicCircle(clamp(this.x + dir * 175, 85, ARENA_WIDTH - 85)));
              }
            }
          } else if (this.bossId === 'boss_raiden') {
            particles.emitLightning(this.x - 40, this.y - 80, '#38bdf8', 95);
            particles.emitLightning(this.x + 40, this.y - 80, '#fde047', 95);
            for (const dir of [-1, 1] as const) {
              projectiles.push(
                new Projectile({
                  x: this.x + dir * 32,
                  y: this.y - 48,
                  vx: dir * 720,
                  vy: 0,
                  radius: 14,
                  damage: this.damage - 3,
                  kind: 'orb',
                  fromPlayer: false,
                  color: '#38bdf8',
                  rimColor: '#fef08a',
                })
              );
            }
          }
        }
      } else {
        this.onGround = false;
      }
      if (this.onGround && Math.abs(this.x - prevX) > 0.2) {
        this.walkPhase += Math.abs(this.x - prevX) * 0.08;
      }
      if (this.phase === 2 && Math.random() < 0.28) {
        particles.emitEmbers(this.x, this.y - 48, 1, this.accentColor);
      }
    }

    if (this.stunTimer > 0 || this.staggerTimer > 0) {
      this.vx *= Math.exp(-8 * dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    if (this.attackPhase === 'none' || this.attackPhase === 'recovery') {
      if (Math.abs(dx) > 4) {
        this.facing = dx >= 0 ? 1 : -1;
      }
    }

    const isHoverBoss = this.bossId === 'boss_fable' || this.bossId === 'boss_omega';
    const bossDecision = stepBotBrainHook(
      this.botBrain,
      {
        dt,
        botX: this.x,
        botY: this.y,
        botVx: this.vx,
        botFacing: this.facing,
        botOnGround: isHoverBoss ? false : this.onGround,
        botHpRatio: this.maxHp > 0 ? this.hp / this.maxHp : 1,
        botSpeed: this.speed,
        attackRange: 135,
        attackPhase: this.attackPhase,
        attackCooldown: this.attackCooldown,
        consecutiveHitsTaken: 0,
        playerX,
        playerY,
        playerAttacking: Boolean(playerAttacking),
        playerDashing: Boolean(playerDashing),
        playerAirborne: playerY < GROUND_Y - 28,
        isBoss: true,
        isElite: true,
      },
      !isHoverBoss && this.bossId !== 'boss_sol'
        ? (jumpVy) => {
            if (this.attackPhase === 'none' && this.onGround) {
              this.vy = jumpVy;
              this.onGround = false;
              audio.playJump();
            }
          }
        : undefined
    );

    if (!isHoverBoss && bossDecision.dashCancelRecovery && this.attackPhase === 'recovery') {
      this.attackPhase = 'none';
      this.attackCooldown = 0.06;
      this.vx = bossDecision.targetVx;
      this.dashActionTimer = 0.18;
      if (bossDecision.jumpVy < 0 && this.onGround) {
        this.vy = bossDecision.jumpVy;
        this.onGround = false;
      }
      particles.emitSmoke(this.x, GROUND_Y - 2, 5, this.accentColor, -28, 16);
    }

    if (this.attackPhase === 'none') {
      if (bossDecision.parry && bossDecision.triggerParryGuard) {
        this.parryGuardTimer = 0.32;
        this.attackCooldown = 0.05;
        audio.playParry();
        particles.emitSparks(this.x + this.facing * 24, this.y - 54, 12, this.accentColor, 420);
      } else if (bossDecision.ultimate || bossDecision.skill) {
        this.attackCooldown = 0;
        if (!isHoverBoss && this.bossId !== 'boss_sol' && bossDecision.ultimate && this.onGround && dist > 165) {
          // Boss Ultimate Aerial Leap-Slam!
          this.attackPhase = 'active';
          this.attackTimer = 0.56;
          this.vy = -710;
          this.vx = clamp((playerX - this.x) * 1.45, -580, 580);
          this.onGround = false;
          this.leapSlamPending = true;
          this.attackDealt = true;
          audio.playJump();
          particles.emitShockwave(this.x, this.y - 48, this.accentColor, 145, 0.3);
          particles.emitText(this.x, this.y - 122, `${this.bossName} · TUYỆT KỸ!`, this.accentColor, 22);
          this.stepSkeletonBlend(dt);
          return;
        }
        if (bossDecision.ultimate) {
          particles.emitShockwave(this.x, this.y - 54, this.accentColor, 140, 0.28);
          particles.emitText(this.x, this.y - 122, `${this.bossName} · BỘC PHÁ!`, this.accentColor, 22);
        }
      }
    }

    const cdScale = this.phase === 2 ? 0.72 : 0.94;

    switch (this.bossId) {
      case 'boss_haiku':
        this.updateHaiku(dt, dist, audio, onMeleeHit, cdScale);
        break;
      case 'boss_astra':
        this.updateAstra(dt, dist, projectiles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_glacius':
        this.updateGlacius(dt, dist, playerX, projectiles, magicCircles, particles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_opus':
        this.updateOpus(dt, dist, projectiles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_vulcan':
        this.updateVulcan(dt, dist, playerX, magicCircles, particles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_sol':
        this.updateSol(dt, dist, playerY, projectiles, audio, cdScale);
        break;
      case 'boss_nyx':
        this.updateNyx(dt, dist, playerX, projectiles, particles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_fable':
        this.updateFable(dt, dx, dist, playerX, playerY, projectiles, magicCircles, particles, audio, cdScale);
        break;
      case 'boss_raiden':
        this.updateRaiden(dt, dist, playerX, projectiles, particles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_akaza':
        this.updateAkaza(dt, dist, playerX, projectiles, magicCircles, particles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_kronos':
        this.updateKronos(dt, dist, playerX, projectiles, magicCircles, particles, audio, onMeleeHit, cdScale);
        break;
      case 'boss_omega':
        this.updateOmega(dt, dx, dist, playerX, playerY, projectiles, magicCircles, magmaPillars, particles, audio, onMeleeHit, cdScale);
        break;
    }

    // Apply BotBrain footsies/backstep/jump-evade during melee Boss neutral cooldown (replacing static slowdown)
    if (!isHoverBoss && this.bossId !== 'boss_sol' && this.attackPhase === 'none' && this.attackCooldown > 0.04) {
      if (bossDecision.kind === 'dash_crossup' && bossDecision.teleportX !== undefined) {
        particles.emitSmoke(this.x, this.y - 46, 10, this.accentColor, -40, 26);
        this.x = bossDecision.teleportX;
        this.facing = playerX >= this.x ? 1 : -1;
        this.dashActionTimer = 0.18;
        audio.playDash();
        particles.emitSmoke(this.x, this.y - 46, 10, this.accentColor, -40, 26);
      } else {
        this.vx = bossDecision.targetVx;
        if (bossDecision.dash) {
          this.dashActionTimer = 0.16;
        }
        if (bossDecision.jumpVy < 0 && this.onGround) {
          this.vy = bossDecision.jumpVy;
          this.onGround = false;
          audio.playJump();
        }
      }
    }
    this.stepSkeletonBlend(dt);
  }

  // Boss 1: Vanguard Haiku — Shield guard + Shield Charge + Phase 2 Leap Slam
  private updateHaiku(
    dt: number,
    dist: number,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 110) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 420) {
        this.patternIndex = this.phase === 2 ? (this.patternIndex + 1) % 2 : 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.52 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-12 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 1 && this.onGround) {
          this.attackTimer = 0.55;
          this.vy = -660;
          this.vx = this.facing * 420;
          this.onGround = false;
          this.leapSlamPending = true;
          this.attackDealt = true;
          audio.playJump();
        } else {
          this.attackTimer = 0.34;
          this.vx = this.facing * (this.phase === 2 ? 820 : 720);
          audio.playDash();
        }
      }
    } else if (this.attackPhase === 'active') {
      if (!this.attackDealt) {
        onMeleeHit({
          x: this.x + this.facing * 42,
          y: this.y - 48,
          width: 86,
          height: 84,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.52 * cdScale;
      }
    } else {
      this.vx *= Math.exp(-9 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.05 * cdScale;
      }
    }
  }

  // Boss 2: Lancer Astra — Extreme-reach Spear Thrust & Spear Volley
  private updateAstra(
    dt: number,
    dist: number,
    projectiles: Projectile[],
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 165) {
        this.vx = this.facing * this.speed;
      } else if (dist < 95) {
        this.vx = -this.facing * this.speed * 0.7;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 580) {
        this.patternIndex = dist > 260 ? 1 : (this.patternIndex + 1) % 2;
        this.attackPhase = 'windup';
        this.attackTimer = 0.44 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.28;
        if (this.patternIndex === 1) {
          audio.playSlash(3, false);
          const vySpread = this.phase === 2 ? [-95, 0, 75] : [0];
          for (const vy of vySpread) {
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 48,
                y: this.y - 58,
                vx: this.facing * 880,
                vy,
                radius: 14,
                damage: this.damage,
                kind: 'spear',
                fromPlayer: false,
                color: '#fbbf24',
                rimColor: '#fef9c3',
              })
            );
          }
          this.attackDealt = true;
        } else {
          this.vx = this.facing * (this.phase === 2 ? 640 : 560);
          audio.playSlash(2, false);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 86,
          y: this.y - 52,
          width: 158,
          height: 72,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.4 * cdScale;
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.9 * cdScale;
      }
    }
  }

  // Boss 3 (NEW): Cryo Warden Glacius — Frost Halberd Sweep + 3-Way Ice Lance Fan + Glacial Leap Slam!
  private updateGlacius(
    dt: number,
    dist: number,
    playerX: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 145) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 560) {
        const modes = this.phase === 2 ? 3 : 2;
        this.patternIndex = (this.patternIndex + 1) % modes;
        this.attackPhase = 'windup';
        this.attackTimer = 0.48 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
        particles.emitIceShards(this.x + this.facing * 24, this.y - 60, 6, this.facing);
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 1) {
          // Fan of Frost Spears + Ground Ice Rune under player
          this.attackTimer = 0.3;
          audio.playCryoSummon();
          for (const vy of [-85, 0, 70]) {
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 44,
                y: this.y - 60,
                vx: this.facing * 790,
                vy,
                radius: 13,
                damage: this.damage - 2,
                kind: 'spear',
                fromPlayer: false,
                color: '#22d3ee',
                rimColor: '#ffffff',
              })
            );
          }
          if (this.phase === 2) {
            magicCircles.push(new MagicCircle(clamp(playerX, 85, ARENA_WIDTH - 85)));
          }
          this.attackDealt = true;
        } else if (this.patternIndex === 2 && this.onGround) {
          // Glacial Sky Leap Slam!
          this.attackTimer = 0.58;
          this.vy = -700;
          this.vx = clamp((playerX - this.x) * 1.35, -540, 540);
          this.onGround = false;
          this.leapSlamPending = true;
          this.attackDealt = true;
          audio.playJump();
        } else {
          // Heavy Frost Halberd Lunge Cleave
          this.attackTimer = 0.24;
          this.vx = this.facing * 590;
          audio.playSlash(3, true);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 74,
          y: this.y - 54,
          width: 145,
          height: 86,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.45 * cdScale;
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.94 * cdScale;
      }
    }
  }

  // Boss 4: Leader Opus — Red Laser Blade high-speed multi-slash flurry (+ Phase 2 Crimson Wave!)
  private updateOpus(
    dt: number,
    dist: number,
    projectiles: Projectile[],
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 110) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-12 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 360) {
        this.comboStep = 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.34 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    const maxFlurry = this.phase === 2 ? 4 : 3;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-12 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.16;
        this.attackDealt = false;
        this.vx = this.facing * 660;
        audio.playSlash(this.comboStep + 1, true);
        if (this.phase === 2 && this.comboStep === maxFlurry - 1) {
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 46,
              y: this.y - 56,
              vx: this.facing * 920,
              vy: 0,
              radius: 16,
              damage: this.damage,
              kind: 'laser',
              fromPlayer: false,
              color: '#ef4444',
              rimColor: '#fef08a',
            })
          );
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-7 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 66,
          y: this.y - 52,
          width: 122,
          height: 84,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.comboStep++;
        if (this.comboStep < maxFlurry) {
          this.attackPhase = 'windup';
          this.attackTimer = 0.22 * cdScale;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.attackPhase = 'recovery';
          this.attackTimer = 0.56 * cdScale;
        }
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.86 * cdScale;
      }
    }
  }

  // Boss 5 (NEW): Forge Titan Vulcan — Meteor Hammer Leap + Molten Earthshaker Smash!
  private updateVulcan(
    dt: number,
    dist: number,
    playerX: number,
    magicCircles: MagicCircle[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 130) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 540) {
        this.patternIndex = dist > 230 ? 1 : (this.patternIndex + 1) % 2;
        this.attackPhase = 'windup';
        this.attackTimer = 0.56 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
        particles.emitEmbers(this.x + this.facing * 22, this.y - 62, 12, '#f97316');
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 1 && this.onGround) {
          // Meteor Hammer Sky Leap -> triggers magma eruptions on touchdown!
          this.attackTimer = 0.62;
          this.vy = -730;
          this.vx = clamp((playerX - this.x) * 1.4, -560, 560);
          this.onGround = false;
          this.leapSlamPending = true;
          this.attackDealt = true;
          audio.playJump();
        } else {
          // Heavy Molten Hammer Smash + targeted magma rune under player
          this.attackTimer = 0.26;
          this.vx = this.facing * 490;
          audio.playSlash(3, true);
          particles.emitGroundCrack(this.x + this.facing * 68, 74, '#f97316');
          if (this.phase === 2) {
            magicCircles.push(new MagicCircle(clamp(playerX, 85, ARENA_WIDTH - 85)));
          }
        }
      }
    } else if (this.attackPhase === 'active') {
      if (!this.leapSlamPending) {
        this.vx *= Math.exp(-6 * dt);
      }
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 72,
          y: this.y - 52,
          width: 148,
          height: 94,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0 && !this.leapSlamPending) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.58 * cdScale;
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.02 * cdScale;
      }
    }
  }

  // Boss 6: Sniper Sol — High-speed Laser Bolt (+ Phase 2 Dual Rapid Shot & Backstep!)
  private updateSol(
    dt: number,
    dist: number,
    playerY: number,
    projectiles: Projectile[],
    audio: AudioEngine,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist < 360) {
        this.vx = -this.facing * this.speed * 1.18;
      } else if (dist > 640) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0) {
        this.attackPhase = 'windup';
        this.attackTimer = 0.64 * cdScale;
        this.sniperAimY = playerY - 52;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.vx *= Math.exp(-12 * dt);
    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      if (this.attackTimer > 0.2) {
        this.sniperAimY += (playerY - 52 - this.sniperAimY) * Math.min(1, dt * 8);
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = this.phase === 2 ? 0.34 : 0.24;
        this.fireSniperBolt(projectiles, audio, 0);
      }
    } else if (this.attackPhase === 'active') {
      if (this.phase === 2 && !this.attackDealt && this.attackTimer <= 0.16) {
        this.attackDealt = true;
        this.fireSniperBolt(projectiles, audio, -18);
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.48 * cdScale;
      }
    } else {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.0 * cdScale;
      }
    }
  }

  private fireSniperBolt(projectiles: Projectile[], audio: AudioEngine, yOffset: number): void {
    audio.playLaser();
    const dy = this.sniperAimY + yOffset - (this.y - 60);
    const speed = 1090;
    const len = Math.hypot(this.facing * 500, dy) || 1;
    projectiles.push(
      new Projectile({
        x: this.x + this.facing * 42,
        y: this.y - 60,
        vx: ((this.facing * 500) / len) * speed,
        vy: (dy / len) * speed,
        radius: 15,
        damage: this.damage,
        kind: 'laser',
        fromPlayer: false,
        color: '#fb923c',
        rimColor: '#22d3ee',
      })
    );
  }

  // Boss 7 (NEW): Phantom Reaper Nyx — Void Shadow-Blink Behind Player + Reaper Scythe Flurry + Void Orbs!
  private updateNyx(
    dt: number,
    dist: number,
    playerX: number,
    projectiles: Projectile[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 125) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0) {
        this.patternIndex = (this.patternIndex + 1) % 3;
        if (this.patternIndex === 0) {
          // Shadow-Blink Ambush behind player!
          particles.emitSmoke(this.x, this.y - 48, 14, '#a855f7', -55, 34);
          particles.emitLightning(this.x, this.y - 68, '#a855f7', 58);
          const behindDir: 1 | -1 = playerX >= this.x ? 1 : -1;
          this.x = clamp(playerX + behindDir * 96, 65, ARENA_WIDTH - 65);
          this.facing = playerX >= this.x ? 1 : -1;
          this.vx = 0;
          particles.emitSmoke(this.x, this.y - 48, 14, '#f43f5e', -55, 34);
          particles.emitLightning(this.x, this.y - 68, '#f43f5e', 58);
        }
        this.comboStep = 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.42 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-12 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 2) {
          // Void Crescent Orbs volley
          this.attackTimer = 0.26;
          audio.playLaser();
          const count = this.phase === 2 ? 3 : 2;
          for (let i = 0; i < count; i++) {
            const vy = (i - (count - 1) * 0.5) * 85;
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 42,
                y: this.y - 58,
                vx: this.facing * 720,
                vy,
                radius: 15,
                damage: this.damage - 2,
                kind: 'orb',
                fromPlayer: false,
                color: '#a855f7',
                rimColor: '#f5d0fe',
              })
            );
          }
          this.attackDealt = true;
        } else {
          // Wide Reaper Scythe Harvest Sweep!
          this.attackTimer = 0.2;
          this.attackDealt = false;
          this.vx = this.facing * 640;
          audio.playSlash(2, true);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-7 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 74,
          y: this.y - 52,
          width: 148,
          height: 88,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.comboStep++;
        if (this.patternIndex !== 2 && this.comboStep < (this.phase === 2 ? 2 : 1)) {
          this.attackPhase = 'windup';
          this.attackTimer = 0.26 * cdScale;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.attackPhase = 'recovery';
          this.attackTimer = 0.48 * cdScale;
        }
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.88 * cdScale;
      }
    }
  }

  // Boss 8: Final Entity Fable — Neon Sovereign (Magic Circles + Lightning Orbs + Phase 2 Nova!)
  private updateFable(
    dt: number,
    dx: number,
    dist: number,
    playerX: number,
    playerY: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[],
    particles: ParticleSystem,
    audio: AudioEngine,
    cdScale: number
  ): void {
    const desiredDist = 340;
    if (this.attackPhase === 'none') {
      if (dist < desiredDist - 50) {
        this.vx = -Math.sign(dx || 1) * this.speed;
      } else if (dist > desiredDist + 80) {
        this.vx = Math.sign(dx || 1) * this.speed;
      } else {
        this.vx = Math.sin(this.floatTime * 1.9) * 140;
      }

      if (this.attackCooldown <= 0) {
        this.patternIndex = (this.patternIndex + 1) % 2;
        this.attackPhase = 'windup';
        this.attackTimer = 0.52 * cdScale;
        this.poseTime = 0;
        audio.playTelegraph();
        particles.emitLightning(this.x, this.y - 65, '#c084fc', 48);
      }
      return;
    }

    this.vx *= Math.exp(-6 * dt);
    this.attackTimer -= dt;

    if (this.attackPhase === 'windup') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.32;
        if (this.patternIndex === 0) {
          magicCircles.push(new MagicCircle(clamp(playerX, 90, ARENA_WIDTH - 90)));
          const offset = Math.random() > 0.5 ? 190 : -190;
          magicCircles.push(new MagicCircle(clamp(playerX + offset, 90, ARENA_WIDTH - 90)));
          if (this.phase === 2) {
            magicCircles.push(new MagicCircle(clamp(playerX - offset, 90, ARENA_WIDTH - 90)));
          }
          audio.playCryoSummon();
        } else {
          audio.playLaser();
          const offsets = this.phase === 2 ? [-42, -12, 22, 54] : [-12, 22];
          for (const dyOff of offsets) {
            const tx = playerX - this.x;
            const ty = playerY - 52 + dyOff - (this.y - 58);
            const len = Math.hypot(tx, ty) || 1;
            const spd = this.phase === 2 ? 680 : 620;
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 26,
                y: this.y - 58,
                vx: (tx / len) * spd,
                vy: (ty / len) * spd,
                radius: 15,
                damage: this.damage,
                kind: 'orb',
                fromPlayer: false,
                color: '#c084fc',
                rimColor: '#ecfccb',
              })
            );
          }
        }
      }
    } else if (this.attackPhase === 'active') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.44 * cdScale;
      }
    } else {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.0 * cdScale;
      }
    }
  }

  // Boss 9: Mecha Shogun Raiden — Cyber Thunder Halberd Lunge + Plasma Fan + Sky Thunder Dive
  private updateRaiden(
    dt: number,
    dist: number,
    playerX: number,
    projectiles: Projectile[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 135) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 580) {
        this.patternIndex = (this.patternIndex + 1) % 3;
        this.attackPhase = 'windup';
        this.attackTimer = 0.38 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        particles.emitLightning(this.x, this.y - 68, '#38bdf8', 58);
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-12 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 1) {
          this.attackTimer = 0.25;
          audio.playLaser();
          const spread = this.phase === 2 ? [-95, -32, 32, 95] : [-55, 0, 55];
          for (const vy of spread) {
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 46,
                y: this.y - 58,
                vx: this.facing * 840,
                vy,
                radius: 14,
                damage: this.damage - 3,
                kind: 'spear',
                fromPlayer: false,
                color: '#38bdf8',
                rimColor: '#fef08a',
              })
            );
          }
          this.attackDealt = true;
        } else if (this.patternIndex === 2 && this.onGround) {
          this.attackTimer = 0.54;
          this.vy = -735;
          this.vx = clamp((playerX - this.x) * 1.5, -600, 600);
          this.onGround = false;
          this.leapSlamPending = true;
          this.attackDealt = true;
          audio.playJump();
        } else {
          this.attackTimer = 0.22;
          this.vx = this.facing * 810;
          particles.emitChainArc(this.x, this.y - 52, this.x + this.facing * 150, this.y - 52, '#fde047', 4.5);
          audio.playSlash(2, true);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 80,
          y: this.y - 54,
          width: 158,
          height: 86,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.38 * cdScale;
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.78 * cdScale;
      }
    }
  }

  // Boss 10: Crimson Oni Akaza — Demon Martial Flurry + Blood Meteor Dive + Shockwave Crescents
  private updateAkaza(
    dt: number,
    dist: number,
    playerX: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 118) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 560) {
        this.patternIndex = dist > 250 ? 1 : (this.patternIndex + 1) % 3;
        this.comboStep = 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.36 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        particles.emitEmbers(this.x, this.y - 54, 14, '#f43f5e');
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-12 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 1 && this.onGround) {
          this.attackTimer = 0.56;
          this.vy = -720;
          this.vx = clamp((playerX - this.x) * 1.45, -590, 590);
          this.onGround = false;
          this.leapSlamPending = true;
          this.attackDealt = true;
          audio.playJump();
        } else if (this.patternIndex === 2) {
          this.attackTimer = 0.28;
          audio.playLaser();
          for (const vy of this.phase === 2 ? [-75, 0, 75] : [-45, 45]) {
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 44,
                y: this.y - 56,
                vx: this.facing * 880,
                vy,
                radius: 15,
                damage: this.damage - 2,
                kind: 'laser',
                fromPlayer: false,
                color: '#f43f5e',
                rimColor: '#ffe4e6',
              })
            );
          }
          magicCircles.push(new MagicCircle(clamp(playerX, 85, ARENA_WIDTH - 85)));
          this.attackDealt = true;
        } else {
          this.attackTimer = 0.18;
          this.attackDealt = false;
          this.vx = this.facing * 690;
          particles.emitShockwave(this.x + this.facing * 56, this.y - 48, '#f43f5e', 110, 0.24);
          audio.playSlash(3, true);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 72,
          y: this.y - 52,
          width: 146,
          height: 88,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.comboStep++;
        if (this.patternIndex === 0 && this.comboStep < (this.phase === 2 ? 3 : 2)) {
          this.attackPhase = 'windup';
          this.attackTimer = 0.22 * cdScale;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.attackPhase = 'recovery';
          this.attackTimer = 0.42 * cdScale;
        }
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.8 * cdScale;
      }
    }
  }

  // Boss 11: Time Reaper Kronos — Paradox Backstab Blink + Twin Saber Flurry + Chrono Spears
  private updateKronos(
    dt: number,
    dist: number,
    playerX: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 120) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 600) {
        this.patternIndex = (this.patternIndex + 1) % 3;
        if (this.patternIndex === 0) {
          particles.emitShockwave(this.x, this.y - 52, '#eab308', 115, 0.25);
          const behindDir: 1 | -1 = playerX >= this.x ? 1 : -1;
          this.x = clamp(playerX + behindDir * 92, 65, ARENA_WIDTH - 65);
          this.facing = playerX >= this.x ? 1 : -1;
          this.vx = 0;
          particles.emitLightning(this.x, this.y - 68, '#fef08a', 66);
        }
        this.comboStep = 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.35 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-12 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 2) {
          this.attackTimer = 0.26;
          audio.playLaser();
          magicCircles.push(new MagicCircle(clamp(playerX, 90, ARENA_WIDTH - 90)));
          if (this.phase === 2) {
            magicCircles.push(new MagicCircle(clamp(playerX + this.facing * 165, 90, ARENA_WIDTH - 90)));
          }
          const count = this.phase === 2 ? 4 : 3;
          for (let i = 0; i < count; i++) {
            const vy = (i - (count - 1) * 0.5) * 76;
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 42,
                y: this.y - 58,
                vx: this.facing * 810,
                vy,
                radius: 14,
                damage: this.damage - 2,
                kind: 'spear',
                fromPlayer: false,
                color: '#eab308',
                rimColor: '#e0f2fe',
              })
            );
          }
          this.attackDealt = true;
        } else {
          this.attackTimer = 0.17;
          this.attackDealt = false;
          this.vx = this.facing * 710;
          audio.playSlash(this.comboStep + 1, true);
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-7 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 74,
          y: this.y - 52,
          width: 146,
          height: 86,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.comboStep++;
        if (this.patternIndex !== 2 && this.comboStep < (this.phase === 2 ? 3 : 2)) {
          this.attackPhase = 'windup';
          this.attackTimer = 0.2 * cdScale;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.attackPhase = 'recovery';
          this.attackTimer = 0.42 * cdScale;
        }
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.78 * cdScale;
      }
    }
  }

  // Boss 12: Chaos Sovereign Omega — True Final Entity (Abyssal Swoop Cleave + Chaos Pillars + Void Star Barrage)
  private updateOmega(
    dt: number,
    dx: number,
    dist: number,
    playerX: number,
    playerY: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[],
    magmaPillars: MagmaPillar[],
    particles: ParticleSystem,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void,
    cdScale: number
  ): void {
    const desiredDist = 310;
    if (this.attackPhase === 'none') {
      if (dist < desiredDist - 60) {
        this.vx = -Math.sign(dx || 1) * this.speed;
      } else if (dist > desiredDist + 85) {
        this.vx = Math.sign(dx || 1) * this.speed;
      } else {
        this.vx = Math.sin(this.floatTime * 2.3) * 185;
      }

      if (this.attackCooldown <= 0) {
        this.patternIndex = (this.patternIndex + 1) % 3;
        this.attackPhase = 'windup';
        this.attackTimer = 0.44 * cdScale;
        this.attackDealt = false;
        this.poseTime = 0;
        audio.playTelegraph();
        particles.emitLightning(this.x, this.y - 65, '#f97316', 62);
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx *= Math.exp(-8 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        if (this.patternIndex === 0) {
          // Low-altitude Abyssal Greatblade Swoop Slash (Parryable!)
          this.attackTimer = 0.24;
          this.y = GROUND_Y - 22;
          this.vx = this.facing * 860;
          particles.emitShockwave(this.x, this.y - 36, '#f97316', 140, 0.3);
          audio.playSlash(3, true);
        } else if (this.patternIndex === 1) {
          this.attackTimer = 0.32;
          const basePx = clamp(playerX, 110, ARENA_WIDTH - 110);
          magicCircles.push(new MagicCircle(basePx));
          magmaPillars.push(new MagmaPillar(basePx, 1, 0.14, 0));
          for (const ox of this.phase === 2 ? [-175, 175, -330, 330] : [-185, 185]) {
            const cx = clamp(basePx + ox, 85, ARENA_WIDTH - 85);
            magicCircles.push(new MagicCircle(cx));
            magmaPillars.push(new MagmaPillar(cx, ox < 0 ? -1 : 1, 0.26, 0));
          }
          this.attackDealt = true;
          audio.playCryoShatter();
        } else {
          this.attackTimer = 0.3;
          audio.playLaser();
          const offsets = this.phase === 2 ? [-52, -18, 18, 52] : [-26, 0, 26];
          for (const dyOff of offsets) {
            const tx = playerX - this.x;
            const ty = playerY - 52 + dyOff - (this.y - 58);
            const len = Math.hypot(tx, ty) || 1;
            const spd = this.phase === 2 ? 770 : 690;
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 28,
                y: this.y - 58,
                vx: (tx / len) * spd,
                vy: (ty / len) * spd,
                radius: 15,
                damage: this.damage,
                kind: 'orb',
                fromPlayer: false,
                color: '#f97316',
                rimColor: '#f5d0fe',
              })
            );
          }
          this.attackDealt = true;
        }
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-5 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 82,
          y: GROUND_Y - 54,
          width: 175,
          height: 105,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.4 * cdScale;
      }
    } else {
      this.vx *= Math.exp(-8 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.85 * cdScale;
      }
    }
  }

  protected override getPose(): StickPoseName {
    if (this.dying) return 'ko';
    if (this.stunTimer > 0 || this.staggerTimer > 0) return 'hurt';
    if (this.isParryGuarding()) return 'parry';
    if (this.bossId === 'boss_fable') return 'float_cast';
    if (this.bossId === 'boss_omega') {
      if (this.attackPhase === 'active' && this.patternIndex === 0) return 'crimson_cleave_low';
      return 'float_cast';
    }
    if (!this.onGround && this.leapSlamPending) return 'air_slam';
    if (this.dashActionTimer > 0 && this.attackPhase === 'none') return 'dash';

    if (this.bossId === 'boss_haiku') {
      if (this.attackPhase === 'active') return 'shield_charge';
      if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
      return this.isShieldActive() ? 'shield_guard' : Math.abs(this.vx) > 30 ? 'run' : 'idle';
    }
    if ((this.bossId === 'boss_astra' || this.bossId === 'boss_raiden') && this.attackPhase === 'active') {
      return 'spear_thrust';
    }
    if (this.bossId === 'boss_glacius') {
      if (this.attackPhase === 'windup') return 'nodachi_drag_cleave';
      if (this.attackPhase === 'active') return 'crimson_cleave_low';
    }
    if (this.bossId === 'boss_opus' && this.attackPhase === 'active') return 'laser_slash';
    if (this.bossId === 'boss_vulcan' || this.bossId === 'boss_akaza') {
      if (this.attackPhase === 'windup') return 'nodachi_overhead_slam';
      if (this.attackPhase === 'active') return 'nodachi_earth_splitter';
    }
    if (this.bossId === 'boss_sol' && (this.attackPhase === 'windup' || this.attackPhase === 'active')) {
      return 'sniper_aim';
    }
    if (this.bossId === 'boss_nyx' || this.bossId === 'boss_kronos') {
      if (this.attackPhase === 'windup') return 'iai_draw_slash';
      if (this.attackPhase === 'active') return 'spin_slash';
    }
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (Math.abs(this.vx) > 30) return 'run';
    return 'idle';
  }

  public override render(ctx: CanvasRenderingContext2D, silhouetteMode = false, whiteFlash = false): void {
    if (!this.alive) return;
    const isMono = silhouetteMode || whiteFlash;
    const profile = getEnemyVisualProfile(this.bossId, false, this.phase);

    // Sniper Sol Lock-on Sight Line Telegraph
    if (this.bossId === 'boss_sol' && this.attackPhase === 'windup' && !isMono) {
      const rawP = 1 - this.attackTimer / 0.64;
      const p = clamp(Number.isFinite(rawP) ? rawP : 0, 0, 1);
      ctx.save();
      try {
        ctx.strokeStyle = colorWithAlpha('#22d3ee', 0.45 + p * 0.55);
        ctx.lineWidth = 2 + p * 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.facing * 36, this.y - 60);
        ctx.lineTo(this.x + this.facing * 980, this.sniperAimY);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // Phase 2 Enrage Ink-Wash Calligraphy Floor Ring
    if (this.phase === 2 && !this.dying && !isMono) {
      const pulse = Math.sin(this.floatTime * 8.5);
      const rx = 44 + pulse * 2.5;
      const ry = 10.5 + pulse * 0.6;
      ctx.save();
      try {
        // Bold sumi-ink outer calligraphy stroke
        ctx.strokeStyle = profile.inkOutlineColor;
        ctx.lineWidth = 5.0;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 4, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Primary Phase 2 accent ring
        ctx.strokeStyle = colorWithAlpha(profile.accentColor, 0.72 + pulse * 0.18);
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 4, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner vermilion broken brush-stroke ring
        ctx.strokeStyle = colorWithAlpha(profile.vermilionAccent, 0.78);
        ctx.lineWidth = 1.8;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 4, rx - 6, ry - 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4 orbiting ink-wash sigil ticks
        for (let i = 0; i < 4; i++) {
          const a = this.floatTime * 2.6 + i * (Math.PI * 0.5);
          const sx = this.x + Math.cos(a) * (rx + 3);
          const sy = this.y - 4 + Math.sin(a) * (ry + 1.5);
          ctx.fillStyle = profile.vermilionAccent;
          ctx.strokeStyle = profile.inkOutlineColor;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 4);
          ctx.lineTo(sx + 3.5, sy);
          ctx.lineTo(sx, sy + 4);
          ctx.lineTo(sx - 3.5, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }
    }

    // Windup Parry Cue Glint on Bosses
    if (this.attackPhase === 'windup' && !isMono) {
      ctx.save();
      try {
        const r = 18 + Math.sin(this.poseTime * 30) * 5;
        ctx.strokeStyle = profile.inkOutlineColor;
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.arc(this.x + this.facing * 18, this.y - 68, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = profile.vermilionAccent;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(this.x + this.facing * 18, this.y - 68, r, 0, Math.PI * 2);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    const weaponMap = {
      boss_haiku: 'shield_sword',
      boss_astra: 'spear',
      boss_glacius: 'frost_halberd',
      boss_opus: 'laser_blade',
      boss_vulcan: 'titan_hammer',
      boss_sol: 'sniper_rifle',
      boss_nyx: 'reaper_scythe',
      boss_fable: 'neon_orb',
      boss_raiden: 'thunder_halberd',
      boss_akaza: 'blood_greatsword',
      boss_kronos: 'void_sabers',
      boss_omega: 'solar_greatblade',
    } as const;

    renderStickman(ctx, {
      x: this.x,
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
      weapon: weaponMap[this.bossId],
      capeColor: profile.capeColor,
      bossOutfit: profile.outfit,
      darkAura:
        this.phase === 2
          ? (profile.phase2AuraMode ?? 'crimson')
          : 'none',
      entityTier: 'boss',
      enragePhase: this.phase,
      inkRimColor: profile.rimColor,
      inkAccent: profile.vermilionAccent,
      inkWash: true,
      jointsOverride: this.blendedJoints ?? undefined,
    });

    if ((this.stunTimer > 0 || this.staggerTimer > 0) && !isMono) {
      ctx.save();
      try {
        ctx.font = 'italic 800 18px "Barlow Condensed", sans-serif';
        ctx.fillStyle = this.staggerTimer > 0 ? '#facc15' : '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText(this.staggerTimer > 0 ? 'PHÁ GIÁP (x1.32 DMG)' : 'STUNNED', this.x, this.y - 122);
      } finally {
        ctx.restore();
      }
    }
  }
}
