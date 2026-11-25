import { ARENA_WIDTH, GROUND_Y } from './rules';
import type { ParticleSystem } from './ParticleSystem';

export class PlasticChair {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = 0;
  public vAngle = 0;
  public kicked = false;
  public active = true;
  public dissolveTimer = 0;

  constructor(x: number, y: number = GROUND_Y) {
    this.x = x;
    this.y = y;
  }

  public kick(dir: 1 | -1): void {
    if (this.kicked) return;
    this.kicked = true;
    this.vx = -dir * 420;
    this.vy = -340;
    this.vAngle = -dir * 10.5;
  }

  public update(dt: number, particles: ParticleSystem): void {
    if (!this.active || !this.kicked) return;
    this.vy += 1500 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.vAngle * dt;
    this.dissolveTimer += dt;

    if (this.y > GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = -Math.abs(this.vy) * 0.35;
      this.vx *= 0.72;
      this.vAngle *= 0.7;
    }

    if (this.dissolveTimer > 1.15) {
      particles.emitEmbers(this.x, this.y - 24, 16, '#8b5cf6');
      this.active = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const alpha = this.kicked ? Math.max(0, 1 - this.dissolveTimer / 1.15) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Cel-shaded monobloc plastic chair with crisp dark outline (reference 00:00–00:01)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Legs (dark outline then light ice-white fill)
    const drawLegs = (width: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(-22, -34);
      ctx.lineTo(-26, 0);
      ctx.moveTo(18, -34);
      ctx.lineTo(22, 0);
      ctx.moveTo(-12, -32);
      ctx.lineTo(-14, -2);
      ctx.moveTo(10, -32);
      ctx.lineTo(13, -2);
      ctx.stroke();
    };
    drawLegs(8, '#101218');
    drawLegs(4.5, '#cbd5e1');

    // Backrest polygon
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#101218';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-23, -34);
    ctx.lineTo(-29, -82);
    ctx.lineTo(-15, -82);
    ctx.lineTo(-11, -34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Seat slab
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-24, -39, 46, 8);
    ctx.strokeRect(-24, -39, 46, 8);

    // Armrest
    ctx.strokeStyle = '#101218';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(-20, -56);
    ctx.lineTo(16, -56);
    ctx.lineTo(18, -37);
    ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }
}

export class IceWall {
  public x: number;
  public y = GROUND_Y;
  public width = 82;
  public height = 148;
  public riseProgress = 0;
  public hp = 90;
  public maxHp = 90;
  public launched = false;
  public vx = 0;
  public dir: 1 | -1 = 1;
  public active = true;
  public life = 0;
  public maxLife = 8.5;
  public hitEnemyIds = new Set<number>();

  constructor(x: number, dir: 1 | -1) {
    this.x = x;
    this.dir = dir;
  }

  public takeBulletDamage(dmg: number, particles: ParticleSystem): void {
    this.hp -= dmg;
    particles.emitIceShards(this.x, this.y - this.height * 0.5, 6, -this.dir);
    if (this.hp <= 0) {
      this.shatter(particles);
    }
  }

  public launch(dir: 1 | -1, particles: ParticleSystem): void {
    if (this.launched) return;
    this.launched = true;
    this.dir = dir;
    this.vx = dir * 1050;
    this.life = 0;
    this.maxLife = 1.1;
    particles.emitShockwave(this.x, this.y - 55, '#38bdf8', 95, 0.25);
    particles.emitIceShards(this.x, this.y - 60, 16, dir);
  }

  public shatter(particles: ParticleSystem): void {
    if (!this.active) return;
    this.active = false;
    particles.emitIceShards(this.x, this.y - this.height * 0.5, 28, this.dir);
    particles.emitShockwave(this.x, this.y - 50, '#7dd3fc', 110, 0.3);
  }

  public update(dt: number, particles: ParticleSystem): void {
    if (!this.active) return;
    this.life += dt;
    this.riseProgress = Math.min(1, this.riseProgress + dt * 7.2);

    if (this.launched) {
      this.x += this.vx * dt;
      if (Math.random() < 0.65) {
        particles.emitIceShards(this.x - this.dir * 26, this.y - 35, 1, -this.dir);
      }
      if (this.x < 50 || this.x > ARENA_WIDTH - 50) {
        this.shatter(particles);
      }
    }

    if (this.life >= this.maxLife) {
      this.shatter(particles);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const h = (this.launched ? this.height * 0.58 : this.height) * this.riseProgress;
    const w = this.launched ? this.width * 1.45 : this.width;
    const damageRatio = 1 - Math.max(0, this.hp) / this.maxHp;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Chunky faceted cyan crystal monolith (matches reference 00:11–00:13!)
    const drawShape = () => {
      ctx.beginPath();
      if (this.launched) {
        // Slanted crushing ice wedge sliding on the ground
        ctx.moveTo(-w * 0.55, 0);
        ctx.lineTo(-w * 0.45, -h * 0.85);
        ctx.lineTo(w * 0.25, -h);
        ctx.lineTo(w * 0.55, -h * 0.45);
        ctx.lineTo(w * 0.52, 0);
      } else {
        // Tall curved shield monolith
        ctx.moveTo(-w * 0.52, 0);
        ctx.lineTo(-w * 0.38, -h * 0.55);
        ctx.lineTo(-w * 0.26, -h * 0.92);
        ctx.lineTo(w * 0.14, -h);
        ctx.lineTo(w * 0.44, -h * 0.72);
        ctx.lineTo(w * 0.52, -h * 0.22);
        ctx.lineTo(w * 0.42, 0);
      }
      ctx.closePath();
    };

    // Bold black cel outline
    drawShape();
    ctx.strokeStyle = '#0c1520';
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // Translucent cyan crystal body
    const grad = ctx.createLinearGradient(-w * 0.5, -h, w * 0.5, 0);
    grad.addColorStop(0, 'rgba(125, 211, 252, 0.88)');
    grad.addColorStop(0.5, 'rgba(34, 152, 198, 0.82)');
    grad.addColorStop(1, 'rgba(14, 116, 144, 0.88)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp bright cyan-white inner highlight rim
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Facet split lines inside crystal
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.62)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, -h * 0.95);
    ctx.lineTo(w * 0.08, -h * 0.48);
    ctx.lineTo(-w * 0.18, 0);
    ctx.moveTo(w * 0.08, -h * 0.48);
    ctx.lineTo(w * 0.42, -h * 0.32);
    ctx.stroke();

    // Progressive blocky crack lines when taking gunfire (reference 00:12!)
    if (damageRatio > 0.12) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, -h * 0.62);
      ctx.lineTo(w * 0.02, -h * 0.56);
      ctx.lineTo(-w * 0.08, -h * 0.35);
      ctx.lineTo(w * 0.26, -h * 0.3);
      if (damageRatio > 0.42) {
        ctx.moveTo(w * 0.24, -h * 0.78);
        ctx.lineTo(0, -h * 0.5);
        ctx.lineTo(w * 0.3, -h * 0.16);
      }
      ctx.stroke();
    }

    // Blazing red crush underside glow when sliding into enemies (reference 00:13!)
    if (this.launched) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.56, -2);
      ctx.lineTo(w * 0.56, -2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export type ProjectileKind =
  | 'bullet'
  | 'spear'
  | 'laser'
  | 'orb'
  | 'sword_wave'
  | 'kunai'
  | 'volt_lance'
  | 'fire_wave'
  | 'void_crescent';

export class Projectile {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public damage: number;
  public kind: ProjectileKind;
  public fromPlayer: boolean;
  public reflected = false;
  public color: string;
  public active = true;
  public life = 0;
  public maxLife = 3.2;
  public hitEnemyIds = new Set<number>();

  constructor(params: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    damage: number;
    kind: ProjectileKind;
    fromPlayer: boolean;
    color: string;
    maxLife?: number;
  }) {
    this.x = params.x;
    this.y = params.y;
    this.vx = params.vx;
    this.vy = params.vy;
    this.radius = params.radius;
    this.damage = params.damage;
    this.kind = params.kind;
    this.fromPlayer = params.fromPlayer;
    this.color = params.color;
    this.maxLife = params.maxLife ?? 3.0;
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (
      this.life >= this.maxLife ||
      this.x < -120 ||
      this.x > ARENA_WIDTH + 120 ||
      this.y > GROUND_Y + 40 ||
      this.y < -220
    ) {
      this.active = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    if (this.kind === 'sword_wave' || this.kind === 'fire_wave' || this.kind === 'void_crescent') {
      const outer =
        this.kind === 'fire_wave'
          ? '#f97316'
          : this.kind === 'void_crescent'
            ? '#10b981'
            : '#dc2626';
      const rim =
        this.kind === 'fire_wave'
          ? '#fef08a'
          : this.kind === 'void_crescent'
            ? '#a7f3d0'
            : '#fecaca';
      const glow =
        this.kind === 'fire_wave'
          ? 'rgba(249, 115, 22, 0.35)'
          : this.kind === 'void_crescent'
            ? 'rgba(16, 185, 129, 0.35)'
            : 'rgba(220, 38, 38, 0.35)';

      ctx.strokeStyle = glow;
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(-110, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();

      ctx.strokeStyle = outer;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(-18, 0, 52, -1.0, 1.0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-100, 0);
      ctx.lineTo(44, 0);
      ctx.stroke();

      ctx.strokeStyle = '#09070b';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(-16, 0, 52, -0.92, 0.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-92, 0);
      ctx.lineTo(38, 0);
      ctx.stroke();

      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-13, 0, 54, -0.82, 0.82);
      ctx.stroke();
    } else if (this.kind === 'volt_lance') {
      // Crackling electric cyan-gold lightning lance (Raijin Awakened)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-66, 0);
      ctx.lineTo(46, 0);
      ctx.stroke();
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(42, 0);
      ctx.stroke();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 5.5;
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(26, -8);
      ctx.lineTo(54, 0);
      ctx.lineTo(26, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.kind === 'kunai') {
      // Crisp cel-shaded neon-emerald shadow kunai (Zero Phantom Barrage)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.38)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.lineTo(20, 0);
      ctx.lineTo(-14, 4);
      ctx.lineTo(-22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#d1fae5';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
    } else if (this.kind === 'laser') {
      const col = this.reflected ? '#38bdf8' : this.color;
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(-44, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(26, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();
    } else if (this.kind === 'spear') {
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(26, 0);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.8;
      ctx.stroke();
      ctx.fillStyle = this.reflected ? '#38bdf8' : '#7dd3fc';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, -7);
      ctx.lineTo(42, 0);
      ctx.lineTo(20, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.kind === 'orb') {
      // Crackling purple-pink energy sphere (Fable, reference 00:44–00:46)
      ctx.fillStyle = this.reflected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(192, 132, 252, 0.34)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.reflected ? '#38bdf8' : '#d946ef';
      ctx.strokeStyle = '#101218';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.52, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Crisp cel-shaded tracer bullet (DeepSeek pistol, reference 00:12)
      ctx.fillStyle = '#101218';
      ctx.fillRect(-13, -4, 26, 8);
      ctx.fillStyle = this.reflected ? '#38bdf8' : '#fde047';
      ctx.fillRect(-11, -2.5, 22, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -1.2, 13, 2.4);
    }

    ctx.restore();
  }
}

export class MagicCircle {
  public x: number;
  public y = GROUND_Y;
  public radius = 92;
  public telegraphTime = 0.78;
  public timer = 0;
  public erupted = false;
  public active = true;
  public hitPlayer = false;

  constructor(x: number) {
    this.x = x;
  }

  public update(dt: number, particles: ParticleSystem): boolean {
    if (!this.active) return false;
    this.timer += dt;
    let justErupted = false;

    if (!this.erupted && this.timer >= this.telegraphTime) {
      this.erupted = true;
      justErupted = true;
      particles.emitShockwave(this.x, this.y - 6, '#fbbf24', 120, 0.35);
      particles.emitLightning(this.x, this.y - 90, '#d946ef', 76);
      particles.emitLightning(this.x - 20, this.y - 170, '#84cc16', 84);
      particles.emitGroundCrack(this.x, 62, '#101218');
    }

    if (this.timer >= this.telegraphTime + 0.42) {
      this.active = false;
    }
    return justErupted;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (!this.erupted) {
      // Golden-amber concentric runic ground circle (reference 00:45–00:46!)
      const p = Math.min(1, this.timer / this.telegraphTime);
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.48 + p * 0.52})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, 18, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(254, 240, 138, ${0.35 + p * 0.5})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 0.72, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(192, 132, 252, ${0.4 + p * 0.55})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * p, 18 * p, 0, 0, Math.PI * 2);
      ctx.stroke();

      const rot = this.timer * 4.2;
      for (let i = 0; i < 8; i++) {
        const a = rot + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * this.radius * 0.42, Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * 18);
        ctx.stroke();
      }
    } else {
      const t = (this.timer - this.telegraphTime) / 0.42;
      const alpha = Math.max(0, 1 - t);
      ctx.globalAlpha = alpha;
      const grad = ctx.createLinearGradient(-this.radius * 0.7, 0, this.radius * 0.7, 0);
      grad.addColorStop(0, 'rgba(132, 204, 22, 0)');
      grad.addColorStop(0.25, 'rgba(217, 70, 239, 0.75)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.96)');
      grad.addColorStop(0.75, 'rgba(132, 204, 22, 0.75)');
      grad.addColorStop(1, 'rgba(132, 204, 22, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-this.radius * 0.7, -430, this.radius * 1.4, 430);
    }

    ctx.restore();
  }
}

/**
 * Kagura's Signature [U] Skill: Sequential erupting magma pillars advancing along the floor.
 */
export class MagmaPillar {
  public x: number;
  public y = GROUND_Y;
  public delay: number;
  public timer = 0;
  public erupted = false;
  public active = true;
  public damage: number;
  public dir: 1 | -1;
  public hitEnemyIds = new Set<number>();

  constructor(x: number, dir: 1 | -1, delay: number, damage: number) {
    this.x = x;
    this.dir = dir;
    this.delay = delay;
    this.damage = damage;
  }

  public update(dt: number, particles: ParticleSystem): boolean {
    if (!this.active) return false;
    this.timer += dt;
    let justErupted = false;

    if (!this.erupted && this.timer >= this.delay) {
      this.erupted = true;
      justErupted = true;
      particles.emitGroundCrack(this.x, 54, '#f97316');
      particles.emitShockwave(this.x, this.y - 16, '#fb923c', 110, 0.3);
      particles.emitEmbers(this.x, this.y - 45, 22, '#f97316');
      particles.emitSparks(this.x, this.y - 75, 14, '#fef08a', 520);
    }

    if (this.timer >= this.delay + 0.44) {
      this.active = false;
    }
    return justErupted;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (!this.erupted) {
      const p = Math.min(1, this.timer / Math.max(0.05, this.delay));
      ctx.fillStyle = `rgba(249, 115, 22, ${0.35 + p * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 38 * (0.5 + p * 0.5), 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const t = (this.timer - this.delay) / 0.44;
      const alpha = Math.max(0, 1 - t * t);
      const h = (1 - t * 0.35) * 195 * Math.min(1, t * 7 + 0.35);
      const w = 52 * (1 - t * 0.25);

      ctx.globalAlpha = alpha;
      // Cel-shaded jagged magma spire with thick black outline
      ctx.beginPath();
      ctx.moveTo(-w * 0.65, 0);
      ctx.lineTo(-w * 0.42, -h * 0.65);
      ctx.lineTo(-w * 0.12, -h * 0.82);
      ctx.lineTo(0, -h);
      ctx.lineTo(w * 0.24, -h * 0.72);
      ctx.lineTo(w * 0.55, -h * 0.42);
      ctx.lineTo(w * 0.65, 0);
      ctx.closePath();

      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6;
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, -h, 0, 0);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.45, '#f97316');
      grad.addColorStop(1, '#b91c1c');
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner white-gold core tongue
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.moveTo(-w * 0.22, 0);
      ctx.lineTo(0, -h * 0.78);
      ctx.lineTo(w * 0.22, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
