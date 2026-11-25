import { ARENA_WIDTH, GRAVITY, GROUND_Y, clamp } from './rules';
import type { EnemyType } from './types';
import type { AudioEngine } from './AudioEngine';
import type { ParticleSystem } from './ParticleSystem';
import {
  type SkeletonJoints,
  type StickPoseName,
  computeStickmanSkeleton,
  renderStickman,
} from './StickmanRenderer';
import { blendSkeleton } from './animation';
import { Projectile } from './Entities';

export interface EnemyAttackHit {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  dir: 1 | -1;
  parryable: boolean;
  source: Enemy;
}

let nextEnemyId = 1;

export class Enemy {
  public readonly id: number;
  public readonly type: EnemyType;
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
  public walkPhase = 0;
  public poseTime = 0;

  // Attack State Machine (windup -> active -> recovery)
  public attackPhase: 'none' | 'windup' | 'active' | 'recovery' = 'none';
  public attackTimer = 0;
  public attackCooldown = 0.6;
  public attackDealt = false;
  public hasToken = false;

  // Appearance & Smooth Blended Skeleton
  public bodyColor = '#f1f5f9';
  public glowColor = '#94a3b8';
  public label = 'META';
  protected blendedJoints: SkeletonJoints | null = null;

  constructor(type: EnemyType, x: number, isTrainingDummy = false) {
    this.id = nextEnemyId++;
    this.type = type;
    this.x = x;

    if (type === 'deepseek_gunner') {
      this.maxHp = isTrainingDummy ? 120 : 62;
      this.speed = 210;
      this.damage = 14;
      this.scoreValue = 160;
      this.bodyColor = '#ffffff';
      this.glowColor = '#38bdf8';
      this.label = 'DEEPSEEK';
    } else if (type === 'swarm_blade') {
      this.maxHp = isTrainingDummy ? 120 : 54;
      this.speed = 315;
      this.damage = 13;
      this.scoreValue = 140;
      this.bodyColor = '#ffffff';
      this.glowColor = '#a855f7';
      this.label = 'SWARM';
    } else {
      // meta_melee
      this.maxHp = isTrainingDummy ? 140 : 68;
      this.speed = 265;
      this.damage = 12;
      this.scoreValue = 120;
      this.bodyColor = '#ffffff';
      this.glowColor = '#94a3b8';
      this.label = 'META';
    }
    this.hp = this.maxHp;
    this.trailHp = this.maxHp;
    this.attackCooldown = 0.5 + Math.random() * 0.7;
  }

  public isBoss(): boolean {
    return this.type.startsWith('boss_');
  }

  public isShieldActive(): boolean {
    return false;
  }

  public applyStun(duration: number, particles: ParticleSystem): void {
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.attackPhase = 'none';
    this.attackTimer = 0;
    this.hasToken = false;
    this.vx = -this.facing * 260;
    particles.emitSparks(this.x, this.y - 60, 14, '#38bdf8', 460);
    particles.emitText(this.x, this.y - 102, 'STUNNED!', '#38bdf8', 22);
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
    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlash = 0.12;
    this.hurtTimer = this.isBoss() ? 0.14 : 0.24;
    if (!this.isBoss()) {
      this.attackPhase = 'none';
      this.hasToken = false;
    }

    const kbResist = this.isBoss() ? 0.35 : 1;
    this.vx = knockX * kbResist;
    if (knockY < 0) {
      this.vy = knockY * kbResist;
      this.onGround = false;
    }

    audio.playHit(heavy);
    particles.emitSparks(this.x, this.y - 50, heavy ? 16 : 9, heavy ? '#fef08a' : '#ffffff', heavy ? 540 : 380);

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
    this.attackPhase = 'none';
    this.hasToken = false;
    this.vx = knockX !== 0 ? knockX * 0.9 : -this.facing * 240;
    this.vy = -220;
    this.onGround = false;
    particles.emitSmoke(this.x, this.y - 35, 6, '#e2e8f0', -65, 22);
  }

  public update(params: {
    dt: number;
    playerX: number;
    playerY: number;
    requestToken: () => boolean;
    releaseToken: () => void;
    projectiles: Projectile[];
    particles: ParticleSystem;
    audio: AudioEngine;
    onMeleeHit: (hit: EnemyAttackHit) => void;
    passiveDummy?: boolean;
  }): void {
    const { dt, playerX, requestToken, releaseToken, projectiles, particles, audio, onMeleeHit, passiveDummy } = params;

    this.poseTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.trailHp > this.hp) {
      this.trailHp = Math.max(this.hp, this.trailHp - 110 * dt);
    } else {
      this.trailHp = this.hp;
    }

    // KO topple & dissolve into billowing white smoke!
    if (this.dying) {
      this.koTimer += dt;
      this.vy += GRAVITY * dt;
      this.x = clamp(this.x + this.vx * dt, 35, ARENA_WIDTH - 35);
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
      this.stepSkeletonBlend(dt);
      return;
    }

    // Basic gravity
    this.vy += GRAVITY * dt;
    const prevX = this.x;
    this.x = clamp(this.x + this.vx * dt, 40, ARENA_WIDTH - 40);
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
    }
    if (this.onGround && Math.abs(this.x - prevX) > 0.2) {
      this.walkPhase += Math.abs(this.x - prevX) * 0.08;
    }

    if (this.hurtTimer > 0 || this.stunTimer > 0 || passiveDummy) {
      this.vx *= Math.exp(-7 * dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    if (this.attackPhase === 'none') {
      this.facing = dx >= 0 ? 1 : -1;
    }

    // Distinct AI Policies per Archetype
    if (this.type === 'deepseek_gunner') {
      this.updateGunnerAI(dt, dx, dist, requestToken, releaseToken, projectiles, audio);
    } else {
      this.updateMeleeAI(dt, dx, dist, requestToken, releaseToken, audio, onMeleeHit);
    }
    this.stepSkeletonBlend(dt);
  }

  protected stepSkeletonBlend(dt: number): void {
    const target = computeStickmanSkeleton(this.getPose(), this.poseTime, this.walkPhase);
    if (!this.blendedJoints) {
      this.blendedJoints = target;
      return;
    }
    const rate = this.attackPhase === 'active' || this.hurtTimer > 0 ? 26 : 16;
    const alpha = 1 - Math.exp(-rate * dt);
    this.blendedJoints = blendSkeleton(this.blendedJoints, target, alpha);
  }

  private updateMeleeAI(
    dt: number,
    _dx: number,
    dist: number,
    requestToken: () => boolean,
    releaseToken: () => void,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    const attackRange = this.type === 'swarm_blade' ? 92 : 76;

    if (this.attackPhase === 'none') {
      if (dist > attackRange - 8) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
        if (this.attackCooldown <= 0 && requestToken()) {
          this.hasToken = true;
          this.attackPhase = 'windup';
          this.attackTimer = this.type === 'swarm_blade' ? 0.36 : 0.42;
          this.attackDealt = false;
          this.poseTime = 0;
          audio.playTelegraph();
        }
      }
      return;
    }

    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      this.vx = -this.facing * 45;
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.16;
        this.vx = this.facing * (this.type === 'swarm_blade' ? 390 : 300);
        audio.playSlash(1, false);
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-6 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 46,
          y: this.y - 48,
          width: 78,
          height: 76,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.38;
        if (this.hasToken) {
          this.hasToken = false;
          releaseToken();
        }
      }
    } else if (this.attackPhase === 'recovery') {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.75 + Math.random() * 0.55;
      }
    }
  }

  private updateGunnerAI(
    dt: number,
    _dx: number,
    dist: number,
    requestToken: () => boolean,
    releaseToken: () => void,
    projectiles: Projectile[],
    audio: AudioEngine
  ): void {
    // Kiter/Ranged policy: keep 340–520px spacing
    if (this.attackPhase === 'none') {
      if (dist < 260) {
        this.vx = -this.facing * this.speed * 0.9;
      } else if (dist > 540) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
        if (this.attackCooldown <= 0 && requestToken()) {
          this.hasToken = true;
          this.attackPhase = 'windup';
          this.attackTimer = 0.52;
          this.attackDealt = false;
          this.poseTime = 0;
          audio.playTelegraph();
        }
      }
      return;
    }

    this.vx *= Math.exp(-10 * dt);
    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.38;
        this.fireBullet(projectiles, audio);
      }
    } else if (this.attackPhase === 'active') {
      if (!this.attackDealt && this.attackTimer <= 0.18) {
        this.attackDealt = true;
        this.fireBullet(projectiles, audio);
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.45;
        if (this.hasToken) {
          this.hasToken = false;
          releaseToken();
        }
      }
    } else if (this.attackPhase === 'recovery') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.25 + Math.random() * 0.6;
      }
    }
  }

  private fireBullet(projectiles: Projectile[], audio: AudioEngine): void {
    audio.playGunshot();
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
        color: '#fde047',
      })
    );
  }

  protected getPose(): StickPoseName {
    if (this.dying) return 'ko';
    if (this.hurtTimer > 0 || this.stunTimer > 0) return 'hurt';
    if (this.type === 'deepseek_gunner' && (this.attackPhase === 'windup' || this.attackPhase === 'active')) {
      return 'gun_aim';
    }
    if (this.attackPhase === 'active') return 'attack_2';
    if (Math.abs(this.vx) > 25) return 'run';
    return 'idle';
  }

  public render(ctx: CanvasRenderingContext2D, silhouetteMode = false, whiteFlash = false): void {
    if (!this.alive) return;
    const isMono = silhouetteMode || whiteFlash;

    // Red Laser Aim Telegraph for DeepSeek Gunner
    if (this.type === 'deepseek_gunner' && this.attackPhase === 'windup' && !isMono) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x + this.facing * 32, this.y - 60);
      ctx.lineTo(this.x + this.facing * 620, this.y - 60);
      ctx.stroke();
      ctx.restore();
    }

    // Melee Attack Telegraph Flash Ring
    if (this.attackPhase === 'windup' && this.type !== 'deepseek_gunner' && !isMono) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(this.x + this.facing * 18, this.y - 68, 15 + Math.sin(this.poseTime * 28) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const weapon =
      this.type === 'deepseek_gunner'
        ? 'pistol'
        : this.type === 'swarm_blade'
          ? 'sword'
          : 'dagger';

    renderStickman(ctx, {
      x: this.x,
      y: this.y,
      facing: this.facing,
      pose: this.getPose(),
      poseTime: this.poseTime,
      walkPhase: this.walkPhase,
      bodyColor: this.bodyColor,
      glowColor: this.glowColor,
      lineWidth: 9.2,
      headRadius: 11.6,
      hitFlash: this.hitFlash,
      silhouette: silhouetteMode,
      whiteFlash,
      weapon,
      jointsOverride: this.blendedJoints ?? undefined,
    });

    // Overhead mini HP bar & faction label for regular enemies
    if (!this.isBoss() && !this.dying && !isMono) {
      if (this.stunTimer > 0) {
        ctx.save();
        ctx.font = 'italic 800 14px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('STUN', this.x, this.y - 110);
        ctx.restore();
      }
      if (this.hp < this.maxHp) {
        const bw = 44;
        const bh = 4.5;
        const bx = this.x - bw * 0.5;
        const by = this.y - 104;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
      }
    }
  }
}
