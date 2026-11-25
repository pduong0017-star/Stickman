import { ARENA_WIDTH, BOSS_ROSTER, GRAVITY, GROUND_Y, clamp } from './rules';
import type { BossId } from './types';
import type { AudioEngine } from './AudioEngine';
import type { ParticleSystem } from './ParticleSystem';
import { type StickPoseName, renderStickman } from './StickmanRenderer';
import { MagicCircle, Projectile } from './Entities';
import { Enemy, type EnemyAttackHit } from './Enemy';

export class Boss extends Enemy {
  public readonly bossId: BossId;
  public readonly faction: string;
  public readonly bossName: string;
  public readonly bossTitle: string;
  public readonly accentColor: string;

  public shieldActive = false;
  public shieldBrokenTimer = 0;
  public comboStep = 0;
  public floatTime = 0;
  public awakeningEventTriggered = false;
  private sniperAimY = GROUND_Y - 52;
  private patternIndex = 0;

  constructor(bossId: BossId, x: number) {
    super(bossId, x, false);
    const meta = BOSS_ROSTER[bossId];
    this.bossId = bossId;
    this.faction = meta.faction;
    this.bossName = meta.name;
    this.bossTitle = meta.title;
    this.accentColor = meta.accentColor;
    this.maxHp = meta.maxHp;
    this.hp = meta.maxHp;
    this.trailHp = meta.maxHp;
    this.scoreValue = bossId === 'boss_fable' ? 1500 : 850;
    this.glowColor = meta.accentColor;
    this.label = meta.name;

    if (bossId === 'boss_haiku') {
      this.bodyColor = '#8f7fa6';
      this.speed = 250;
      this.damage = 18;
      this.shieldActive = true;
    } else if (bossId === 'boss_astra') {
      this.bodyColor = '#f3e5ab';
      this.speed = 310;
      this.damage = 19;
    } else if (bossId === 'boss_opus') {
      this.bodyColor = '#64748b';
      this.speed = 415;
      this.damage = 20;
    } else if (bossId === 'boss_sol') {
      this.bodyColor = '#f8fafc';
      this.speed = 285;
      this.damage = 24;
    } else {
      // boss_fable (Final Boss: Electric Lime-Green Levitating Entity, ref 00:43–00:46!)
      this.bodyColor = '#84cc16';
      this.speed = 260;
      this.damage = 22;
      this.y = GROUND_Y - 125;
      this.onGround = false;
    }
    this.attackCooldown = 0.8;
  }

  public override isShieldActive(): boolean {
    return this.bossId === 'boss_haiku' && this.shieldActive && this.shieldBrokenTimer <= 0 && this.stunTimer <= 0;
  }

  public breakShield(particles: ParticleSystem): void {
    this.shieldBrokenTimer = 3.2;
    this.applyStun(1.8, particles);
    particles.emitText(this.x, this.y - 118, 'GUARD BREAK!', '#38bdf8', 26);
  }

  public updateBoss(params: {
    dt: number;
    playerX: number;
    playerY: number;
    projectiles: Projectile[];
    magicCircles: MagicCircle[];
    particles: ParticleSystem;
    audio: AudioEngine;
    onMeleeHit: (hit: EnemyAttackHit) => void;
    onTriggerFableAwakening: () => void;
  }): void {
    const {
      dt,
      playerX,
      playerY,
      projectiles,
      magicCircles,
      particles,
      audio,
      onMeleeHit,
      onTriggerFableAwakening,
    } = params;

    this.poseTime += dt;
    this.floatTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.shieldBrokenTimer = Math.max(0, this.shieldBrokenTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.trailHp > this.hp) {
      this.trailHp = Math.max(this.hp, this.trailHp - 135 * dt);
    } else {
      this.trailHp = this.hp;
    }

    // Fable dramatic Awakening Event at <= 72% HP
    if (
      this.bossId === 'boss_fable' &&
      !this.awakeningEventTriggered &&
      this.hp <= this.maxHp * 0.72 &&
      !this.dying
    ) {
      this.awakeningEventTriggered = true;
      onTriggerFableAwakening();
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

    // Physics (Fable levitates; others obey gravity)
    const prevX = this.x;
    if (this.bossId === 'boss_fable') {
      const targetHoverY = GROUND_Y - 125 + Math.sin(this.floatTime * 3.2) * 22;
      this.y += (targetHoverY - this.y) * (1 - Math.exp(-5 * dt));
      this.x = clamp(this.x + this.vx * dt, 65, ARENA_WIDTH - 65);
      if (Math.random() < 0.25) {
        particles.emitEmbers(this.x, this.y - 35, 1, '#22c55e');
      }
    } else {
      this.vy += GRAVITY * dt;
      this.x = clamp(this.x + this.vx * dt, 50, ARENA_WIDTH - 50);
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
      }
      if (this.onGround && Math.abs(this.x - prevX) > 0.2) {
        this.walkPhase += Math.abs(this.x - prevX) * 0.08;
      }
    }

    if (this.stunTimer > 0) {
      this.vx *= Math.exp(-8 * dt);
      this.stepSkeletonBlend(dt);
      return;
    }

    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    if (this.attackPhase === 'none') {
      this.facing = dx >= 0 ? 1 : -1;
    }

    switch (this.bossId) {
      case 'boss_haiku':
        this.updateHaiku(dt, dist, audio, onMeleeHit);
        break;
      case 'boss_astra':
        this.updateAstra(dt, dist, projectiles, audio, onMeleeHit);
        break;
      case 'boss_opus':
        this.updateOpus(dt, dist, audio, onMeleeHit);
        break;
      case 'boss_sol':
        this.updateSol(dt, dist, playerY, projectiles, audio);
        break;
      case 'boss_fable':
        this.updateFable(dt, dx, dist, playerX, playerY, projectiles, magicCircles, particles, audio);
        break;
    }
    this.stepSkeletonBlend(dt);
  }

  // Boss 1: Vanguard Haiku — Shield guard + Shield Charge rush
  private updateHaiku(
    dt: number,
    dist: number,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 110) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 390) {
        this.attackPhase = 'windup';
        this.attackTimer = 0.56;
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
        this.attackTimer = 0.34;
        this.vx = this.facing * 720;
        audio.playDash();
      }
    } else if (this.attackPhase === 'active') {
      if (!this.attackDealt) {
        onMeleeHit({
          x: this.x + this.facing * 42,
          y: this.y - 48,
          width: 82,
          height: 82,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.55;
      }
    } else {
      this.vx *= Math.exp(-9 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.1;
      }
    }
  }

  // Boss 2: Lancer Astra — Extreme-reach Spear Thrust & Spear Throw
  private updateAstra(
    dt: number,
    dist: number,
    projectiles: Projectile[],
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 165) {
        this.vx = this.facing * this.speed;
      } else if (dist < 95) {
        this.vx = -this.facing * this.speed * 0.7;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 560) {
        this.patternIndex = dist > 260 ? 1 : (this.patternIndex + 1) % 2;
        this.attackPhase = 'windup';
        this.attackTimer = 0.46;
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
          // Throw energy spear!
          audio.playSlash(3, false);
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 48,
              y: this.y - 58,
              vx: this.facing * 860,
              vy: 0,
              radius: 14,
              damage: this.damage,
              kind: 'spear',
              fromPlayer: false,
              color: '#fbbf24',
            })
          );
          this.attackDealt = true;
        } else {
          // Long-reach triple thrust lunge
          this.vx = this.facing * 560;
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
          width: 155,
          height: 70,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.42;
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.92;
      }
    }
  }

  // Boss 3: Leader Opus — Red Laser Blade high-speed 3-slash flurry!
  private updateOpus(
    dt: number,
    dist: number,
    audio: AudioEngine,
    onMeleeHit: (hit: EnemyAttackHit) => void
  ): void {
    if (this.attackPhase === 'none') {
      if (dist > 110) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-12 * dt);
      }
      if (this.attackCooldown <= 0 && dist < 320) {
        this.comboStep = 0;
        this.attackPhase = 'windup';
        this.attackTimer = 0.36;
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
        this.attackTimer = 0.16;
        this.attackDealt = false;
        this.vx = this.facing * 640;
        audio.playSlash(this.comboStep + 1, true);
      }
    } else if (this.attackPhase === 'active') {
      this.vx *= Math.exp(-7 * dt);
      if (!this.attackDealt) {
        this.attackDealt = true;
        onMeleeHit({
          x: this.x + this.facing * 66,
          y: this.y - 52,
          width: 120,
          height: 84,
          damage: this.damage,
          dir: this.facing,
          parryable: true,
          source: this,
        });
      }
      if (this.attackTimer <= 0) {
        this.comboStep++;
        if (this.comboStep < 3) {
          this.attackPhase = 'windup';
          this.attackTimer = 0.24;
          this.poseTime = 0;
          audio.playTelegraph();
        } else {
          this.attackPhase = 'recovery';
          this.attackTimer = 0.58;
        }
      }
    } else {
      this.vx *= Math.exp(-10 * dt);
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 0.88;
      }
    }
  }

  // Boss 4: Sniper Sol — Backline high-speed Energy Laser Bolt (rewarding Parry reflection!)
  private updateSol(
    dt: number,
    dist: number,
    playerY: number,
    projectiles: Projectile[],
    audio: AudioEngine
  ): void {
    if (this.attackPhase === 'none') {
      if (dist < 380) {
        this.vx = -this.facing * this.speed * 1.15;
      } else if (dist > 640) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx *= Math.exp(-10 * dt);
      }
      if (this.attackCooldown <= 0) {
        this.attackPhase = 'windup';
        this.attackTimer = 0.68;
        this.sniperAimY = playerY - 52;
        this.poseTime = 0;
        audio.playTelegraph();
      }
      return;
    }

    this.vx *= Math.exp(-12 * dt);
    this.attackTimer -= dt;
    if (this.attackPhase === 'windup') {
      // Smoothly lock onto player vertical position during first half of windup
      if (this.attackTimer > 0.22) {
        this.sniperAimY += (playerY - 52 - this.sniperAimY) * Math.min(1, dt * 8);
      }
      if (this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = 0.24;
        audio.playLaser();
        const dy = this.sniperAimY - (this.y - 60);
        const speed = 1080;
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
            color: '#f97316',
          })
        );
      }
    } else if (this.attackPhase === 'active') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.52;
      }
    } else {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.05;
      }
    }
  }

  // Final Boss: Entity Fable — Neon Green Levitating Sovereign (Magic Circles + Purple Lightning Orbs)
  private updateFable(
    dt: number,
    dx: number,
    dist: number,
    playerX: number,
    playerY: number,
    projectiles: Projectile[],
    magicCircles: MagicCircle[],
    particles: ParticleSystem,
    audio: AudioEngine
  ): void {
    // Graceful aerial hovering orbit around player
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
        this.attackTimer = 0.55;
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
          // Summon 2 glowing Magic Circles on the floor!
          magicCircles.push(new MagicCircle(clamp(playerX, 90, ARENA_WIDTH - 90)));
          const offset = Math.random() > 0.5 ? 190 : -190;
          magicCircles.push(new MagicCircle(clamp(playerX + offset, 90, ARENA_WIDTH - 90)));
          audio.playCryoSummon();
        } else {
          // Fire spread of 2 Purple Lightning Orbs (parryable!)
          audio.playLaser();
          for (const dyOff of [-12, 22]) {
            const tx = playerX - this.x;
            const ty = playerY - 52 + dyOff - (this.y - 58);
            const len = Math.hypot(tx, ty) || 1;
            const spd = 620;
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
              })
            );
          }
        }
      }
    } else if (this.attackPhase === 'active') {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = 0.45;
      }
    } else {
      if (this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.attackCooldown = 1.05;
      }
    }
  }

  protected override getPose(): StickPoseName {
    if (this.dying) return 'ko';
    if (this.stunTimer > 0) return 'hurt';
    if (this.bossId === 'boss_fable') return 'float_cast';
    if (this.bossId === 'boss_haiku') {
      if (this.attackPhase === 'active') return 'shield_charge';
      return this.isShieldActive() ? 'shield_guard' : 'idle';
    }
    if (this.bossId === 'boss_astra' && this.attackPhase === 'active') return 'spear_thrust';
    if (this.bossId === 'boss_opus' && this.attackPhase === 'active') return 'laser_slash';
    if (this.bossId === 'boss_sol' && (this.attackPhase === 'windup' || this.attackPhase === 'active')) {
      return 'sniper_aim';
    }
    if (Math.abs(this.vx) > 30) return 'run';
    return 'idle';
  }

  public override render(ctx: CanvasRenderingContext2D, silhouetteMode = false, whiteFlash = false): void {
    if (!this.alive) return;
    const isMono = silhouetteMode || whiteFlash;

    // Sniper Sol Lock-on Sight Line Telegraph
    if (this.bossId === 'boss_sol' && this.attackPhase === 'windup' && !isMono) {
      const p = 1 - this.attackTimer / 0.68;
      ctx.save();
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.45 + p * 0.55})`;
      ctx.lineWidth = 2 + p * 2;
      ctx.beginPath();
      ctx.moveTo(this.x + this.facing * 36, this.y - 60);
      ctx.lineTo(this.x + this.facing * 980, this.sniperAimY);
      ctx.stroke();
      ctx.restore();
    }

    // Windup Parry Cue Glint on Bosses
    if (this.attackPhase === 'windup' && !isMono) {
      ctx.save();
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = 3;
      const r = 18 + Math.sin(this.poseTime * 30) * 5;
      ctx.beginPath();
      ctx.arc(this.x + this.facing * 18, this.y - 68, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const weaponMap = {
      boss_haiku: 'shield_sword',
      boss_astra: 'spear',
      boss_opus: 'laser_blade',
      boss_sol: 'sniper_rifle',
      boss_fable: 'neon_orb',
    } as const;

    const outfitMap = {
      boss_haiku: 'haiku',
      boss_astra: 'astra',
      boss_opus: 'opus',
      boss_sol: 'sol',
      boss_fable: 'fable',
    } as const;

    renderStickman(ctx, {
      x: this.x,
      y: this.y,
      facing: this.facing,
      pose: this.getPose(),
      poseTime: this.poseTime,
      walkPhase: this.walkPhase,
      bodyColor: this.bodyColor,
      glowColor: this.glowColor,
      lineWidth: 10.5,
      headRadius: 13.2,
      hitFlash: this.hitFlash,
      silhouette: silhouetteMode,
      whiteFlash,
      weapon: weaponMap[this.bossId],
      capeColor: this.bossId === 'boss_opus' ? '#dc2626' : undefined,
      bossOutfit: outfitMap[this.bossId],
      jointsOverride: this.blendedJoints ?? undefined,
    });

    if (this.stunTimer > 0 && !isMono) {
      ctx.save();
      ctx.font = 'italic 800 18px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('STUNNED', this.x, this.y - 118);
      ctx.restore();
    }
  }
}
