import { ARENA_WIDTH, GROUND_Y } from './rules';
import type { ParticleSystem } from './ParticleSystem';
import type { PillarTheme, ProjectileTheme } from './skinVfx';
import type { SkinId, StageHazardKind } from './types';
import { colorWithAlpha, finiteOr } from './renderer/inkStyle';
import { renderStickman, type StickPoseName } from './StickmanRenderer';

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
  public overcharged = false;
  public vx = 0;
  public dir: 1 | -1 = 1;
  public active = true;
  public life = 0;
  public maxLife = 8.5;
  public hitEnemyIds = new Set<number>();
  public theme: 'ice' | 'seraph' | 'void' = 'ice';

  constructor(x: number, dir: 1 | -1, theme: 'ice' | 'seraph' | 'void' = 'ice') {
    this.x = x;
    this.dir = dir;
    this.theme = theme;
  }

  public takeBulletDamage(dmg: number, particles: ParticleSystem): void {
    this.hp -= dmg;
    if (this.theme === 'seraph') {
      particles.emitSparks(this.x, this.y - this.height * 0.5, 6, '#facc15', 320);
    } else if (this.theme === 'void') {
      particles.emitSparks(this.x, this.y - this.height * 0.5, 6, '#c084fc', 320);
    } else {
      particles.emitIceShards(this.x, this.y - this.height * 0.5, 6, -this.dir);
    }
    if (this.hp <= 0) {
      this.shatter(particles);
    }
  }

  public launch(dir: 1 | -1, particles: ParticleSystem, overcharged = false): void {
    if (this.launched) return;
    this.launched = true;
    this.overcharged = overcharged;
    this.dir = dir;
    this.vx = dir * (overcharged ? 1320 : 1080);
    this.life = 0;
    this.maxLife = overcharged ? 1.25 : 1.1;
    const waveCol =
      this.theme === 'seraph'
        ? '#facc15'
        : this.theme === 'void'
          ? '#a855f7'
          : overcharged
            ? '#ef4444'
            : '#38bdf8';
    particles.emitShockwave(this.x, this.y - 55, waveCol, overcharged ? 135 : 95, 0.28);
    if (this.theme === 'seraph') {
      particles.emitSparks(this.x, this.y - 60, overcharged ? 26 : 16, '#fef08a', 520);
    } else if (this.theme === 'void') {
      particles.emitSparks(this.x, this.y - 60, overcharged ? 26 : 16, '#e879f9', 520);
    } else {
      particles.emitIceShards(this.x, this.y - 60, overcharged ? 26 : 16, dir);
    }
    if (overcharged) {
      particles.emitSlashBeam(this.x, this.y - 58, -0.22 * dir, 240, waveCol, 13);
      particles.emitSlashBeam(this.x, this.y - 58, 0.24 * dir, 220, '#ffffff', 11);
    }
  }

  public shatter(particles: ParticleSystem): void {
    if (!this.active) return;
    this.active = false;
    if (this.theme === 'seraph') {
      particles.emitSparks(this.x, this.y - this.height * 0.5, 24, '#facc15', 480);
      particles.emitShockwave(this.x, this.y - 50, '#fef08a', 110, 0.3);
    } else if (this.theme === 'void') {
      particles.emitSparks(this.x, this.y - this.height * 0.5, 24, '#c084fc', 480);
      particles.emitShockwave(this.x, this.y - 50, '#a855f7', 110, 0.3);
    } else {
      particles.emitIceShards(this.x, this.y - this.height * 0.5, 28, this.dir);
      particles.emitShockwave(this.x, this.y - 50, '#7dd3fc', 110, 0.3);
    }
  }

  public update(dt: number, particles: ParticleSystem): void {
    if (!this.active) return;
    this.life += dt;
    this.riseProgress = Math.min(1, this.riseProgress + dt * 7.2);

    if (this.launched) {
      this.x += this.vx * dt;
      if (Math.random() < 0.65) {
        if (this.theme === 'seraph') {
          particles.emitFeathers(this.x - this.dir * 26, this.y - 45, 1, '#fef08a', 26, 0.9);
        } else if (this.theme === 'void') {
          particles.emitShards(this.x - this.dir * 26, this.y - 45, 1, '#c084fc', 26, 0.9);
        } else {
          particles.emitIceShards(this.x - this.dir * 26, this.y - 35, 1, -this.dir);
        }
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
    try {
      ctx.translate(this.x, this.y);

    if (this.theme === 'seraph') {
      // VẠN KIẾM QUANG: Vertical Pillar of Golden Light + Magic Seal + 11 Radiant Floating Holy Swords!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (!this.launched) {
        const pillarGrad = ctx.createLinearGradient(0, -h * 1.85, 0, 0);
        pillarGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
        pillarGrad.addColorStop(0.55, 'rgba(250, 204, 21, 0.22)');
        pillarGrad.addColorStop(1, 'rgba(254, 249, 195, 0.48)');
        ctx.fillStyle = pillarGrad;
        ctx.fillRect(-w * 0.68, -h * 1.85, w * 1.36, h * 1.85);
      }

      // Glowing golden magic rune circle on ground
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, -2, w * 0.72, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, -2, w * 0.52, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const swords = this.launched
        ? [
            { ox: -36, oy: -h * 0.45, ang: this.dir * 0.72, len: h * 0.85 },
            { ox: -14, oy: -h * 0.75, ang: this.dir * 0.62, len: h * 1.05 },
            { ox: 8, oy: -h * 0.92, ang: this.dir * 0.52, len: h * 1.15 },
            { ox: 28, oy: -h * 0.62, ang: this.dir * 0.68, len: h * 0.95 },
            { ox: 44, oy: -h * 0.38, ang: this.dir * 0.78, len: h * 0.78 },
          ]
        : [
            { ox: -44, oy: -h * 0.55, ang: -0.22, len: h * 0.56 },
            { ox: -32, oy: -h * 0.82, ang: -0.14, len: h * 0.76 },
            { ox: -18, oy: -h * 1.02, ang: -0.07, len: h * 0.92 },
            { ox: 0, oy: -h * 1.18, ang: 0, len: h * 1.08 },
            { ox: 18, oy: -h * 1.02, ang: 0.07, len: h * 0.92 },
            { ox: 32, oy: -h * 0.82, ang: 0.14, len: h * 0.76 },
            { ox: 44, oy: -h * 0.55, ang: 0.22, len: h * 0.56 },
            // Floating upper tier golden blades
            { ox: -24, oy: -h * 1.32, ang: -0.09, len: h * 0.46 },
            { ox: 24, oy: -h * 1.32, ang: 0.09, len: h * 0.46 },
          ];

      for (const s of swords) {
        ctx.save();
        ctx.translate(s.ox, s.oy);
        ctx.rotate(s.ang);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.48)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, s.len);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#fef9c3';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(4.5, 6);
        ctx.lineTo(2.8, s.len);
        ctx.lineTo(-2.8, s.len);
        ctx.lineTo(-4.5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // White hot center core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, s.len * 0.9);
        ctx.stroke();

        // Golden angelic crossguard
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-9, 10);
        ctx.lineTo(9, 10);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (this.theme === 'void') {
      // HƯ KHÔNG KIẾM: Swirling Void Rift + Cluster of 9 Jagged Obsidian-Violet Crystal Shards!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(126, 34, 206, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, -2, w * 0.78, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, -2, w * 0.65, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const shards = this.launched
        ? [
            { ox: -32, hScale: 0.75, tilt: this.dir * 0.55, sw: 14 },
            { ox: -8, hScale: 1.05, tilt: this.dir * 0.45, sw: 18 },
            { ox: 18, hScale: 0.95, tilt: this.dir * 0.6, sw: 16 },
            { ox: 38, hScale: 0.65, tilt: this.dir * 0.7, sw: 12 },
          ]
        : [
            { ox: -42, hScale: 0.48, tilt: -0.34, sw: 12 },
            { ox: -28, hScale: 0.76, tilt: -0.2, sw: 15 },
            { ox: -12, hScale: 0.96, tilt: -0.08, sw: 17 },
            { ox: 2, hScale: 1.14, tilt: 0.02, sw: 19 },
            { ox: 18, hScale: 0.92, tilt: 0.12, sw: 16 },
            { ox: 32, hScale: 0.72, tilt: 0.24, sw: 14 },
            { ox: 44, hScale: 0.46, tilt: 0.36, sw: 11 },
          ];
      for (const sh of shards) {
        const shH = h * sh.hScale;
        ctx.save();
        ctx.translate(sh.ox, 0);
        ctx.rotate(sh.tilt);

        // Outer neon violet glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(168, 85, 247, 0.36)';
        ctx.beginPath();
        ctx.moveTo(-sh.sw * 0.72, 0);
        ctx.lineTo(0, -shH - 8);
        ctx.lineTo(sh.sw * 0.72, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Sharp faceted obsidian-violet crystal shard
        const sGrad = ctx.createLinearGradient(0, -shH, 0, 0);
        sGrad.addColorStop(0, '#f0abfc');
        sGrad.addColorStop(0.35, '#7e22ce');
        sGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = sGrad;
        ctx.strokeStyle = '#090714';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-sh.sw * 0.55, 0);
        ctx.lineTo(-sh.sw * 0.32, -shH * 0.65);
        ctx.lineTo(0, -shH);
        ctx.lineTo(sh.sw * 0.35, -shH * 0.62);
        ctx.lineTo(sh.sw * 0.55, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bright violet crystal facet edge
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -shH + 3);
        ctx.lineTo(-sh.sw * 0.1, -shH * 0.35);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    // Chunky faceted crystal monolith (Cyan Ice!)
    const drawShape = () => {
      ctx.beginPath();
      if (this.launched) {
        ctx.moveTo(-w * 0.55, 0);
        ctx.lineTo(-w * 0.45, -h * 0.85);
        ctx.lineTo(w * 0.25, -h);
        ctx.lineTo(w * 0.55, -h * 0.45);
        ctx.lineTo(w * 0.52, 0);
      } else {
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

    // Crisp bright inner highlight rim
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

    // Blazing red crush underside glow (and full crimson aura when Overcharged!)
    if (this.launched) {
      ctx.strokeStyle = this.overcharged ? '#f43f5e' : '#ef4444';
      ctx.lineWidth = this.overcharged ? 6.5 : 4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.58, -2);
      ctx.lineTo(w * 0.58, -2);
      ctx.stroke();
      if (this.overcharged) {
        drawShape();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
    }
    } finally {
      ctx.restore();
    }
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
  | 'void_crescent'
  | 'mirror_shard'
  | 'bamboo_blade'
  | 'jade_seal_wave';

export interface ProjectileConfig {
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
  theme?: ProjectileTheme;
  rimColor?: string;
  secondaryColor?: string;
}

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
  public theme: ProjectileTheme = 'default';
  public rimColor?: string;
  public secondaryColor?: string;
  public active = true;
  public life = 0;
  public maxLife = 3.2;
  public hitEnemyIds = new Set<number>();

  constructor(params: ProjectileConfig) {
    this.x = params.x;
    this.y = params.y;
    this.vx = params.vx;
    this.vy = params.vy;
    this.radius = params.radius;
    this.damage = params.damage;
    this.kind = params.kind;
    this.fromPlayer = params.fromPlayer;
    this.color = params.color;
    this.theme = params.theme ?? 'default';
    this.rimColor = params.rimColor;
    this.secondaryColor = params.secondaryColor;
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
    const safeX = finiteOr(this.x, 0);
    const safeY = finiteOr(this.y, 0);
    const safeVx = finiteOr(this.vx, 1);
    const safeVy = finiteOr(this.vy, 0);
    const angle = Math.atan2(safeVy, safeVx);
    ctx.save();
    try {
      ctx.translate(safeX, safeY);
      ctx.rotate(angle);

    if (this.kind === 'sword_wave' || this.kind === 'fire_wave' || this.kind === 'void_crescent') {
      const theme = this.theme;
      if (theme === 'seraph') {
        // RADIANT SERAPH: Blazing Golden Celestial Crescent Wave + Sweeping Feather Wake
        const outer = this.color || '#fde047';
        const sec = this.secondaryColor ?? '#fef9c3';
        const rim = this.rimColor ?? '#ffffff';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-14, 0, 56, -1.08, 1.08);
        ctx.stroke();
        ctx.globalAlpha = 1;

        const trailGrad = ctx.createLinearGradient(-125, 0, 42, 0);
        trailGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
        trailGrad.addColorStop(0.65, 'rgba(253, 224, 71, 0.55)');
        trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.92)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(42, 0);
        ctx.quadraticCurveTo(-18, -32, -125, -4);
        ctx.lineTo(-105, 0);
        ctx.lineTo(-125, 4);
        ctx.quadraticCurveTo(-18, 32, 42, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = outer;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.arc(-14, 0, 56, -1.02, 1.02);
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.arc(-11, 0, 58, -0.92, 0.92);
        ctx.stroke();

        ctx.fillStyle = sec;
        for (const [fx, fy, fr] of [[-48, -22, -0.25], [-74, 16, 0.22], [-96, -8, -0.1]] as const) {
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(fr);
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      } else if (theme === 'void') {
        // VOID WALKER: Jagged Obsidian-Violet Singularity Crescent + Void Shards
        const outer = this.color || '#a855f7';
        const sec = this.secondaryColor ?? '#e879f9';
        const rim = this.rimColor ?? '#d8b4fe';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-14, 0, 56, -1.08, 1.08);
        ctx.stroke();
        ctx.restore();

        const vGrad = ctx.createLinearGradient(-120, 0, 42, 0);
        vGrad.addColorStop(0, 'rgba(30, 27, 75, 0)');
        vGrad.addColorStop(0.6, 'rgba(88, 28, 135, 0.72)');
        vGrad.addColorStop(1, 'rgba(232, 121, 249, 0.9)');
        ctx.fillStyle = vGrad;
        ctx.beginPath();
        ctx.moveTo(42, 0);
        ctx.quadraticCurveTo(-15, -34, -120, -6);
        ctx.lineTo(-96, 0);
        ctx.lineTo(-120, 6);
        ctx.quadraticCurveTo(-15, 34, 42, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(-15, 0, 55, -1.0, 1.0);
        ctx.stroke();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rim;
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.arc(-13, 0, 56, -0.96, 0.96);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(-11, 0, 58, -0.84, 0.84);
        ctx.stroke();

        ctx.fillStyle = sec;
        for (const [sx, sy] of [[-46, -24], [-72, 18], [-94, -10]] as const) {
          ctx.beginPath();
          ctx.moveTo(sx + 8, sy);
          ctx.lineTo(sx, sy - 4);
          ctx.lineTo(sx - 8, sy);
          ctx.lineTo(sx, sy + 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (theme === 'phoenix') {
        // SOLAR PHOENIX: Solar-Gold & Crimson Flame Crescent + Feather-Ember Streaks
        const outer = this.color || '#fde047';
        const sec = this.secondaryColor ?? '#f97316';
        const rim = this.rimColor ?? '#ffffff';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.44;
        ctx.strokeStyle = sec;
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-14, 0, 56, -1.08, 1.08);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = outer;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(-14, 0, 55, -1.0, 1.0);
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(-11, 0, 58, -0.86, 0.86);
        ctx.stroke();

        ctx.fillStyle = outer;
        for (const [fx, fy, fr] of [[-44, -24, -0.3], [-70, 18, 0.28], [-94, -6, -0.14]] as const) {
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(fr);
          ctx.beginPath();
          ctx.ellipse(0, 0, 11, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      } else if (theme === 'frostfire') {
        // FROST EMPRESS: Glacial Cyan Outer Crescent + Violet-Orchid Edge + Crystal Diamonds
        const outer = this.color || '#38bdf8';
        const sec = this.secondaryColor ?? '#c084fc';
        const rim = this.rimColor ?? '#e0f2fe';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 26;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-14, 0, 56, -1.06, 1.06);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = outer;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.arc(-15, 0, 55, -1.0, 1.0);
        ctx.stroke();

        ctx.strokeStyle = sec;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.arc(-13, 0, 56, -0.94, 0.94);
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(-11, 0, 58, -0.82, 0.82);
        ctx.stroke();

        ctx.fillStyle = rim;
        for (const [cx, cy] of [[-44, -22], [-70, 18], [-92, -8]] as const) {
          ctx.beginPath();
          ctx.moveTo(cx + 6, cy);
          ctx.lineTo(cx, cy - 4.5);
          ctx.lineTo(cx - 6, cy);
          ctx.lineTo(cx, cy + 4.5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (theme === 'blood_moon') {
        // BLOOD MOON: Dark Crimson-Black Crescent + Blood-Rose Rim + Petal Flecks
        const outer = this.color || '#f43f5e';
        const sec = this.secondaryColor ?? '#fecdd3';
        const rim = this.rimColor ?? '#ffe4e6';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(-14, 0, 55, -1.06, 1.06);
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = '#19050b';
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.arc(-16, 0, 54, -1.0, 1.0);
        ctx.stroke();

        ctx.strokeStyle = outer;
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        ctx.arc(-14, 0, 55, -0.96, 0.96);
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(-11, 0, 57, -0.84, 0.84);
        ctx.stroke();

        ctx.fillStyle = sec;
        for (const [px, py, pr] of [[-46, -20, -0.4], [-72, 16, 0.35], [-92, -6, 0.1]] as const) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(pr);
          ctx.beginPath();
          ctx.ellipse(0, 0, 6.5, 2.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (theme === 'astral') {
        // ASTRAL PHANTOM: Deep Indigo-Cyan Crescent + Golden Star Glints
        const outer = this.color || '#818cf8';
        const sec = this.secondaryColor ?? '#fde047';
        const rim = this.rimColor ?? '#fef08a';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(-14, 0, 55, -1.06, 1.06);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = outer;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.arc(-15, 0, 54, -0.98, 0.98);
        ctx.stroke();

        ctx.strokeStyle = sec;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(-12, 0, 57, -0.86, 0.86);
        ctx.stroke();

        ctx.fillStyle = rim;
        for (const [sx, sy] of [[-44, -22], [-72, 16], [-94, -8]] as const) {
          ctx.beginPath();
          ctx.moveTo(sx, sy - 6);
          ctx.lineTo(sx + 2, sy - 2);
          ctx.lineTo(sx + 6, sy);
          ctx.lineTo(sx + 2, sy + 2);
          ctx.lineTo(sx, sy + 6);
          ctx.lineTo(sx - 2, sy + 2);
          ctx.lineTo(sx - 6, sy);
          ctx.lineTo(sx - 2, sy - 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (theme === 'shogun') {
        // STORM SHOGUN: Royal Cobalt-Gold Crescent + Drum-Ring Halo Glints
        const outer = this.color || '#60a5fa';
        const sec = this.secondaryColor ?? '#fde047';
        const rim = this.rimColor ?? '#bfdbfe';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(-14, 0, 54, -1.04, 1.04);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = outer;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(-15, 0, 53, -0.98, 0.98);
        ctx.stroke();

        ctx.strokeStyle = sec;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-12, 0, 56, -0.86, 0.86);
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(-52, -16, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-68, 16, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (theme === 'cyber') {
        // CYBER VALKYRIE: Neon Cyan-Magenta Digital Stepped Crescent
        const outer = this.color || '#22d3ee';
        const sec = this.secondaryColor ?? '#e879f9';
        const rim = this.rimColor ?? '#f0abfc';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = sec;
        ctx.lineWidth = 25;
        ctx.beginPath();
        ctx.arc(-14, 0, 54, -1.02, 1.02);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = outer;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.arc(-15, 0, 53, -0.96, 0.96);
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-12, 0, 56, -0.85, 0.85);
        ctx.stroke();

        ctx.fillStyle = sec;
        ctx.fillRect(-58, -22, 16, 4);
        ctx.fillRect(-78, 14, 18, 4);
        ctx.restore();
      } else {
        // 'default' theme: respects explicit color / secondaryColor / rimColor with kind fallbacks
        const outer =
          this.color ||
          (this.kind === 'fire_wave'
            ? '#f97316'
            : this.kind === 'void_crescent'
              ? '#10b981'
              : '#dc2626');
        const sec =
          this.secondaryColor ??
          (this.kind === 'fire_wave'
            ? '#fef08a'
            : this.kind === 'void_crescent'
              ? '#a7f3d0'
              : '#fecaca');
        const rim = this.rimColor ?? sec;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = outer;
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.moveTo(-110, 0);
        ctx.lineTo(48, 0);
        ctx.stroke();
        ctx.restore();

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
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-13, 0, 54, -0.82, 0.82);
        ctx.stroke();
      }
    } else if (this.kind === 'volt_lance') {
      // Theme-aware Lightning Lance (Raijin skins)
      const primary = this.color || '#22d3ee';
      const tip = this.secondaryColor ?? '#facc15';
      const core = this.rimColor ?? '#ffffff';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = primary;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-66, 0);
      ctx.lineTo(46, 0);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(42, 0);
      ctx.stroke();
      ctx.strokeStyle = primary;
      ctx.lineWidth = 5.5;
      ctx.stroke();

      ctx.strokeStyle = core;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-48, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();

      if (this.theme === 'cyber') {
        ctx.strokeStyle = tip;
        ctx.lineWidth = 2.4;
        for (const cx of [-28, -4, 16]) {
          ctx.beginPath();
          ctx.moveTo(cx - 7, -7);
          ctx.lineTo(cx, 0);
          ctx.lineTo(cx - 7, 7);
          ctx.stroke();
        }
      } else if (this.theme === 'shogun') {
        ctx.strokeStyle = tip;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(16, 0, 5, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = tip;
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
      // Theme-aware Shadow Kunai (Zero skins)
      const body = this.color || '#10b981';
      const glow = this.secondaryColor ?? body;
      const edge = this.rimColor ?? '#d1fae5';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.restore();

      if (this.theme === 'blood_moon') {
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.quadraticCurveTo(-34, -8, -46, -2);
        ctx.stroke();
      }

      ctx.fillStyle = body;
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

      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      if (this.theme === 'astral') {
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.moveTo(-21, -5);
        ctx.lineTo(-19, -1.5);
        ctx.lineTo(-15.5, 0);
        ctx.lineTo(-19, 1.5);
        ctx.lineTo(-21, 5);
        ctx.lineTo(-23, 1.5);
        ctx.lineTo(-26.5, 0);
        ctx.lineTo(-23, -1.5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (this.kind === 'laser') {
      const col = this.reflected ? '#38bdf8' : this.color || '#ef4444';
      const rim = this.reflected ? '#e0f2fe' : (this.rimColor ?? '#ffffff');
      ctx.strokeStyle = colorWithAlpha(col, 0.34);
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-54, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();

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

      ctx.strokeStyle = rim;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();
    } else if (this.kind === 'spear') {
      const headCol = this.reflected ? '#38bdf8' : this.color || '#7dd3fc';
      const rimCol = this.reflected ? '#e0f2fe' : (this.rimColor ?? '#f8fafc');
      const shaftCol = this.reflected ? '#e0f2fe' : '#cbd5e1';

      // Ink-wash outer trail rim wake
      ctx.strokeStyle = colorWithAlpha(headCol, 0.36);
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha(rimCol, 0.65);
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(-52, 0);
      ctx.lineTo(-14, 0);
      ctx.stroke();

      // Sumi-e ink shaft + steel core
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(26, 0);
      ctx.stroke();

      ctx.strokeStyle = shaftCol;
      ctx.lineWidth = 3.6;
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha(rimCol, 0.85);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-38, -1.2);
      ctx.lineTo(20, -1.2);
      ctx.stroke();

      // Ink-outlined spearhead honoring this.color & this.rimColor
      ctx.fillStyle = headCol;
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(20, -7.5);
      ctx.lineTo(43, 0);
      ctx.lineTo(20, 7.5);
      ctx.lineTo(23, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(23, 0);
      ctx.lineTo(39, 0);
      ctx.stroke();
    } else if (this.kind === 'orb') {
      const safeR = Math.max(2, finiteOr(this.radius, 12));
      const orbCol = this.reflected ? '#38bdf8' : this.color || '#d946ef';
      const rimCol = this.reflected ? '#e0f2fe' : (this.rimColor ?? '#f8fafc');

      // Directional ink-wash comet trail wake
      ctx.fillStyle = colorWithAlpha(orbCol, 0.34);
      ctx.beginPath();
      ctx.moveTo(0, -safeR * 0.85);
      ctx.lineTo(-safeR * 2.4, 0);
      ctx.lineTo(0, safeR * 0.85);
      ctx.closePath();
      ctx.fill();

      // Outer aura halo
      ctx.fillStyle = colorWithAlpha(orbCol, 0.34);
      ctx.beginPath();
      ctx.arc(0, 0, safeR + 8, 0, Math.PI * 2);
      ctx.fill();

      // Crisp sumi-e ink outline & orb core
      ctx.fillStyle = orbCol;
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, safeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bright outer rim highlight crescent
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, safeR - 2.2), -Math.PI * 0.65, Math.PI * 0.35);
      ctx.stroke();

      // Pure white hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, safeR * 0.48, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'mirror_shard') {
      const safeR = Math.max(4, finiteOr(this.radius, 10));
      const primary = this.reflected ? '#38bdf8' : this.color || '#f43f5e';
      const sec = this.reflected ? '#e0f2fe' : (this.secondaryColor ?? '#38bdf8');
      const rim = this.rimColor ?? '#f8fafc';

      // Prismatic wake streaks aligned behind shard velocity
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = colorWithAlpha(primary, 0.46);
        ctx.lineWidth = Math.max(2, safeR * 0.36);
        ctx.beginPath();
        ctx.moveTo(-safeR * 3.1, -safeR * 0.22);
        ctx.lineTo(safeR * 0.8, 0);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha(sec, 0.42);
        ctx.lineWidth = Math.max(1.5, safeR * 0.28);
        ctx.beginPath();
        ctx.moveTo(-safeR * 2.6, safeR * 0.22);
        ctx.lineTo(safeR * 0.8, 0);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // Obsidian ink-wash shard silhouette
      const tipX = safeR * 2.15;
      const wingX = -safeR * 0.35;
      const wingY = safeR * 0.72;
      const tailX = -safeR * 1.45;

      ctx.fillStyle = '#07040e';
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(wingX, -wingY);
      ctx.lineTo(tailX, 0);
      ctx.lineTo(wingX, wingY);
      ctx.closePath();
      ctx.fill();

      // Upper beveled prism facet (primary)
      ctx.fillStyle = colorWithAlpha(primary, 0.88);
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(wingX, -wingY);
      ctx.lineTo(tailX, 0);
      ctx.closePath();
      ctx.fill();

      // Lower beveled prism facet (secondary)
      ctx.fillStyle = colorWithAlpha(sec, 0.78);
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(tailX, 0);
      ctx.lineTo(wingX, wingY);
      ctx.closePath();
      ctx.fill();

      // Crisp sumi-e ink border
      ctx.strokeStyle = '#09060e';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(wingX, -wingY);
      ctx.lineTo(tailX, 0);
      ctx.lineTo(wingX, wingY);
      ctx.closePath();
      ctx.stroke();

      // Razor silver-white inner prism ridge & specular edge
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tailX * 0.78, 0);
      ctx.lineTo(tipX * 0.92, 0);
      ctx.stroke();
    } else if (this.kind === 'bamboo_blade') {
      // Floating Calligraphy Brush Blade / Beveled Jade Bamboo Slip
      const safeR = Math.max(6, finiteOr(this.radius, 15));
      const jadeLight = this.reflected ? '#38bdf8' : this.color || '#5eead4';
      const jadeDeep = this.reflected ? '#0284c7' : (this.secondaryColor ?? '#2dd4bf');
      const ridgeCol = '#f8fafc';
      const goldCol = '#fde68a';

      const tipX = safeR * 1.75;
      const shoulderX = safeR * 0.92;
      const tailX = -safeR * 1.4;
      const notchX = -safeR * 1.15;
      const halfW = safeR * 0.36;

      // Soft ink-jade wake behind the slip
      const wakeGrad = ctx.createLinearGradient(-safeR * 3.4, 0, tipX * 0.65, 0);
      wakeGrad.addColorStop(0, 'rgba(30, 41, 59, 0)');
      wakeGrad.addColorStop(0.55, colorWithAlpha('#1e293b', 0.32));
      wakeGrad.addColorStop(1, colorWithAlpha(jadeLight, 0.56));
      ctx.fillStyle = wakeGrad;
      ctx.beginPath();
      ctx.moveTo(tipX * 0.55, -halfW * 0.75);
      ctx.quadraticCurveTo(-safeR * 1.2, -halfW * 1.55, -safeR * 3.4, 0);
      ctx.quadraticCurveTo(-safeR * 1.2, halfW * 1.55, tipX * 0.55, halfW * 0.75);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = colorWithAlpha(jadeLight, 0.45);
        ctx.lineWidth = Math.max(2, safeR * 0.32);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-safeR * 2.8, 0);
        ctx.lineTo(tipX * 0.92, 0);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // Ink-bordered beveled slip silhouette
      const traceSlip = () => {
        ctx.beginPath();
        ctx.moveTo(tipX, 0);
        ctx.lineTo(shoulderX, -halfW);
        ctx.lineTo(tailX, -halfW * 0.92);
        ctx.lineTo(notchX, 0);
        ctx.lineTo(tailX, halfW * 0.92);
        ctx.lineTo(shoulderX, halfW);
        ctx.closePath();
      };

      traceSlip();
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Upper beveled jade facet
      ctx.fillStyle = jadeLight;
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(shoulderX, -halfW);
      ctx.lineTo(tailX, -halfW * 0.92);
      ctx.lineTo(notchX, 0);
      ctx.closePath();
      ctx.fill();

      // Lower beveled jade facet
      ctx.fillStyle = jadeDeep;
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(notchX, 0);
      ctx.lineTo(tailX, halfW * 0.92);
      ctx.lineTo(shoulderX, halfW);
      ctx.closePath();
      ctx.fill();

      // Crisp sumi-e ink outline
      traceSlip();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Pale-gold binding cords & engraved scholar rune
      ctx.strokeStyle = goldCol;
      ctx.lineWidth = 1.6;
      for (const bx of [-safeR * 0.78, -safeR * 0.56]) {
        ctx.beginPath();
        ctx.moveTo(bx, -halfW * 0.86);
        ctx.lineTo(bx, halfW * 0.86);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-safeR * 0.12, -halfW * 0.36);
      ctx.lineTo(safeR * 0.24, 0);
      ctx.lineTo(-safeR * 0.12, halfW * 0.36);
      ctx.stroke();

      // Moonlight-white core highlight ridge
      ctx.strokeStyle = ridgeCol;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(notchX * 0.85, 0);
      ctx.lineTo(tipX * 0.92, 0);
      ctx.stroke();

      // Delicate 4-point star glint at calligraphy nib tip
      ctx.fillStyle = this.rimColor ?? goldCol;
      const gx = tipX * 0.9;
      ctx.beginPath();
      ctx.moveTo(gx, -4.5);
      ctx.lineTo(gx + 1.3, -1.3);
      ctx.lineTo(gx + 4.5, 0);
      ctx.lineTo(gx + 1.3, 1.3);
      ctx.lineTo(gx, 4.5);
      ctx.lineTo(gx - 1.3, 1.3);
      ctx.lineTo(gx - 4.5, 0);
      ctx.lineTo(gx - 1.3, -1.3);
      ctx.closePath();
      ctx.fill();
    } else if (this.kind === 'jade_seal_wave') {
      // Rotating Jade-Teal Calligraphy Seal Ring for Hit 4 Graceful Pushback
      const safeR = Math.max(14, finiteOr(this.radius, 34));
      const p = Math.min(1, Math.max(0, this.life / Math.max(0.05, this.maxLife)));
      const fade = p > 0.65 ? Math.max(0.15, 1 - (p - 0.65) / 0.35) : 1;
      const r = safeR * (0.86 + p * 0.44);
      const jadeTeal = this.reflected ? '#38bdf8' : this.color || '#2dd4bf';
      const jadeLight = this.reflected ? '#e0f2fe' : (this.secondaryColor ?? '#5eead4');
      const white = this.rimColor ?? '#f8fafc';
      const gold = '#fde68a';

      ctx.save();
      try {
        ctx.globalAlpha = fade;

        // Soft ink-jade forward pushback crescent wake
        ctx.strokeStyle = colorWithAlpha('#1e293b', 0.42);
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-6, 0, r * 1.04, -1.05, 1.05);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha(jadeLight, 0.55);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(-3, 0, r * 1.06, -0.92, 0.92);
        ctx.stroke();

        // Outer rotating jade-teal calligraphy seal ring + Enso arc + Confucian ticks
        ctx.save();
        try {
          ctx.rotate(this.life * 5.2);

          ctx.fillStyle = colorWithAlpha(jadeTeal, 0.14);
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = jadeTeal;
          ctx.lineWidth = 2.6;
          ctx.setLineDash([14, 7, 5, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Open Moonlight-White Enso brush arc
          ctx.strokeStyle = white;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.88, -2.05, 1.75);
          ctx.stroke();

          // 8 Pale-Gold Confucian radial ticks
          ctx.strokeStyle = gold;
          ctx.lineWidth = 1.6;
          for (let k = 0; k < 8; k++) {
            const ta = (k * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ta) * (r * 0.72), Math.sin(ta) * (r * 0.72));
            ctx.lineTo(Math.cos(ta) * (r * 0.98), Math.sin(ta) * (r * 0.98));
            ctx.stroke();
          }
        } finally {
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Counter-rotating inner jade ring
        ctx.save();
        try {
          ctx.rotate(-this.life * 6.8);
          ctx.strokeStyle = jadeLight;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Upright central '静' glyph
        ctx.save();
        try {
          ctx.rotate(-angle);
          const fontSize = Math.max(14, Math.round(r * 0.56));
          ctx.font = `900 ${fontSize}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3.2;
          ctx.strokeStyle = '#0f172a';
          ctx.strokeText('静', 0, 1);
          ctx.fillStyle = white;
          ctx.fillText('静', 0, 1);
        } finally {
          ctx.restore();
        }
      } finally {
        ctx.restore();
      }
    } else {
      // Crisp ink-wash tracer bullet / kunai bolt honoring this.color & this.rimColor
      const bulletCol = this.reflected ? '#38bdf8' : this.color || '#fde047';
      const rimCol = this.reflected ? '#e0f2fe' : (this.rimColor ?? '#ffffff');
      ctx.fillStyle = colorWithAlpha(rimCol, 0.38);
      ctx.fillRect(-22, -2, 16, 4);
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(-13, -4, 26, 8);
      ctx.fillStyle = bulletCol;
      ctx.fillRect(-11, -2.5, 22, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -1.2, 13, 2.4);
    }
    } finally {
      ctx.restore();
    }
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
  public theme: PillarTheme = 'fire';
  public hitEnemyIds = new Set<number>();

  constructor(
    x: number,
    dir: 1 | -1,
    delay: number,
    damage: number,
    theme: PillarTheme = 'fire'
  ) {
    this.x = x;
    this.dir = dir;
    this.delay = delay;
    this.damage = damage;
    this.theme = theme;
  }

  public update(dt: number, particles: ParticleSystem): boolean {
    if (!this.active) return false;
    this.timer += dt;
    let justErupted = false;

    if (!this.erupted && this.timer >= this.delay) {
      this.erupted = true;
      justErupted = true;
      if (this.theme === 'phoenix') {
        particles.emitGroundCrack(this.x, 54, '#f59e0b');
        particles.emitShockwave(this.x, this.y - 16, '#fde047', 110, 0.3);
        particles.emitEmbers(this.x, this.y - 45, 22, '#facc15');
        particles.emitFeathers(this.x, this.y - 60, 6, '#fde047', 160, 0.95);
        particles.emitSparks(this.x, this.y - 75, 14, '#fef9c3', 520);
      } else if (this.theme === 'frostfire') {
        particles.emitGroundCrack(this.x, 54, '#22d3ee');
        particles.emitShockwave(this.x, this.y - 16, '#c084fc', 110, 0.3);
        particles.emitIceShards(this.x, this.y - 45, 16, this.dir);
        particles.emitShards(this.x, this.y - 60, 12, '#c084fc', 240, 1.0);
        particles.emitSparks(this.x, this.y - 75, 14, '#e0f2fe', 520);
      } else {
        particles.emitGroundCrack(this.x, 54, '#f97316');
        particles.emitShockwave(this.x, this.y - 16, '#fb923c', 110, 0.3);
        particles.emitEmbers(this.x, this.y - 45, 22, '#f97316');
        particles.emitSparks(this.x, this.y - 75, 14, '#fef08a', 520);
      }
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
      ctx.fillStyle =
        this.theme === 'phoenix'
          ? `rgba(245, 158, 11, ${0.35 + p * 0.45})`
          : this.theme === 'frostfire'
            ? `rgba(34, 211, 238, ${0.35 + p * 0.45})`
            : `rgba(249, 115, 22, ${0.35 + p * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 38 * (0.5 + p * 0.5), 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle =
        this.theme === 'phoenix'
          ? '#fef9c3'
          : this.theme === 'frostfire'
            ? '#e0f2fe'
            : '#fef08a';
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
      if (this.theme === 'phoenix') {
        grad.addColorStop(0, '#fef9c3');
        grad.addColorStop(0.45, '#fde047');
        grad.addColorStop(1, '#dc2626');
      } else if (this.theme === 'frostfire') {
        grad.addColorStop(0, '#e0f2fe');
        grad.addColorStop(0.45, '#c084fc');
        grad.addColorStop(1, '#3b0764');
      } else {
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.45, '#f97316');
        grad.addColorStop(1, '#b91c1c');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner spire core tongue
      ctx.fillStyle =
        this.theme === 'phoenix'
          ? '#ffffff'
          : this.theme === 'frostfire'
            ? '#f5d0fe'
            : '#fffbeb';
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

export type LootOrbKind = 'heal' | 'rage' | 'awaken';

/**
 * Magnetic Soul / Vitality / Fury Orbs dropped by defeated enemies & Boss Phase transitions!
 */
export class LootOrb {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public kind: LootOrbKind;
  public value: number;
  public age = 0;
  public active = true;

  constructor(x: number, y: number, kind: LootOrbKind, value: number) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.value = value;
    this.vx = (Math.random() - 0.5) * 240;
    this.vy = -260 - Math.random() * 140;
  }

  public get color(): string {
    if (this.kind === 'heal') return '#22c55e';
    if (this.kind === 'rage') return '#ef4444';
    return '#facc15';
  }

  public update(dt: number, playerX: number, playerY: number): boolean {
    if (!this.active) return false;
    this.age += dt;

    const targetX = playerX;
    const targetY = playerY - 52;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (this.age > 0.32 && (dist < 360 || this.age > 1.15)) {
      // Smooth magnetic homing acceleration toward player torso
      const pullSpeed = Math.min(1180, 460 + this.age * 480);
      this.vx += ((dx / dist) * pullSpeed - this.vx) * Math.min(1, dt * 11);
      this.vy += ((dy / dist) * pullSpeed - this.vy) * Math.min(1, dt * 11);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      this.vy += 1450 * dt;
      this.x = Math.max(48, Math.min(ARENA_WIDTH - 48, this.x + this.vx * dt));
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y - 12) {
        this.y = GROUND_Y - 12;
        this.vy = -Math.abs(this.vy) * 0.48;
        this.vx *= 0.76;
      }
    }

    if (dist < 38 && this.age > 0.16) {
      this.active = false;
      return true;
    }
    if (this.age > 9.0) {
      this.active = false;
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const bob = Math.sin(this.age * 8) * 3;
    const col = this.color;

    ctx.save();
    try {
      ctx.translate(this.x, this.y + bob);

      // Additive glow halo
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = colorWithAlpha(col, 0.27);
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }

      ctx.fillStyle = col;
      ctx.strokeStyle = '#090b10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (this.kind === 'awaken') {
        // Diamond soul crystal
        ctx.moveTo(0, -10);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-8, 0);
        ctx.closePath();
      } else {
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      if (this.kind === 'heal') {
        ctx.fillRect(-4.5, -1.4, 9, 2.8);
        ctx.fillRect(-1.4, -4.5, 2.8, 9);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } finally {
      ctx.restore();
    }
  }
}

/**
 * Biome-specific Environmental Stage Hazard!
 * Clearly telegraphed on the arena floor; punishes careless positioning AND lets skilled players
 * knock enemies into hazards for heavy bonus damage & stun!
 */
export class StageHazard {
  public readonly kind: Exclude<StageHazardKind, 'none'>;
  public x: number;
  public y = GROUND_Y;
  public radius: number;
  public telegraphTime: number;
  public activeDuration: number;
  public timer = 0;
  public erupted = false;
  public active = true;
  public hitPlayer = false;
  public hitEnemyIds = new Set<number>();

  constructor(kind: Exclude<StageHazardKind, 'none'>, x: number) {
    this.kind = kind;
    this.x = x;
    if (kind === 'orbital_laser') {
      this.radius = 66;
      this.telegraphTime = 0.95;
      this.activeDuration = 0.48;
    } else if (kind === 'void_rift') {
      this.radius = 105;
      this.telegraphTime = 1.05;
      this.activeDuration = 0.55;
    } else if (kind === 'icicle_drop') {
      this.radius = 68;
      this.telegraphTime = 0.92;
      this.activeDuration = 0.38;
    } else if (kind === 'plasma_mine') {
      this.radius = 84;
      this.telegraphTime = 0.95;
      this.activeDuration = 0.48;
    } else if (kind === 'cursed_fang') {
      this.radius = 78;
      this.telegraphTime = 0.88;
      this.activeDuration = 0.44;
    } else if (kind === 'meteor_rain') {
      this.radius = 92;
      this.telegraphTime = 0.92;
      this.activeDuration = 0.45;
    } else {
      // lava_geyser
      this.radius = 74;
      this.telegraphTime = 0.92;
      this.activeDuration = 0.46;
    }
  }

  public update(dt: number, particles: ParticleSystem): boolean {
    if (!this.active) return false;
    this.timer += dt;
    let justErupted = false;

    if (!this.erupted && this.timer >= this.telegraphTime) {
      this.erupted = true;
      justErupted = true;
      if (this.kind === 'icicle_drop') {
        particles.emitIceShards(this.x, this.y - 36, 22, 1);
        particles.emitShockwave(this.x, this.y - 12, '#38bdf8', 110, 0.3);
      } else if (this.kind === 'lava_geyser') {
        particles.emitEmbers(this.x, this.y - 55, 28, '#f97316');
        particles.emitGroundCrack(this.x, 68, '#ea580c');
        particles.emitShockwave(this.x, this.y - 18, '#fb923c', 120, 0.32);
      } else if (this.kind === 'orbital_laser') {
        particles.emitLightning(this.x, this.y - 160, '#22d3ee', 110);
        particles.emitShockwave(this.x, this.y - 10, '#e879f9', 125, 0.32);
      } else if (this.kind === 'plasma_mine') {
        particles.emitLightning(this.x - 24, this.y - 68, '#38bdf8', 85);
        particles.emitLightning(this.x + 24, this.y - 68, '#fde047', 85);
        particles.emitShockwave(this.x, this.y - 28, '#38bdf8', 132, 0.32);
      } else if (this.kind === 'cursed_fang') {
        particles.emitSparks(this.x, this.y - 46, 20, '#f43f5e', 480);
        particles.emitGroundCrack(this.x, 66, '#e11d48');
        particles.emitShockwave(this.x, this.y - 16, '#fb7185', 120, 0.3);
      } else if (this.kind === 'meteor_rain') {
        particles.emitEmbers(this.x, this.y - 48, 30, '#fb923c');
        particles.emitGroundCrack(this.x, 82, '#f97316');
        particles.emitShockwave(this.x, this.y - 20, '#fde047', 145, 0.35);
      } else {
        particles.emitLightning(this.x, this.y - 90, '#a855f7', 95);
        particles.emitShockwave(this.x, this.y - 40, '#c084fc', 135, 0.35);
      }
    }

    if (this.timer >= this.telegraphTime + this.activeDuration) {
      this.active = false;
    }
    return justErupted;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    const accent =
      this.kind === 'icicle_drop' || this.kind === 'plasma_mine'
        ? '#38bdf8'
        : this.kind === 'lava_geyser' || this.kind === 'meteor_rain'
          ? '#f97316'
          : this.kind === 'cursed_fang'
            ? '#f43f5e'
            : this.kind === 'orbital_laser'
              ? '#22d3ee'
              : '#a855f7';

    if (!this.erupted) {
      const p = Math.min(1, this.timer / this.telegraphTime);
      // Warning ground zone + shrinking ring
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4;
      ctx.globalAlpha = 0.45 + p * 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, 14, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = colorWithAlpha(accent, 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * p, 14 * p, 0, 0, Math.PI * 2);
      ctx.fill();

      if (this.kind === 'icicle_drop') {
        const dropY = -420 + p * 290;
        ctx.fillStyle = '#bae6fd';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-18, dropY - 95);
        ctx.lineTo(18, dropY - 95);
        ctx.lineTo(0, dropY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (this.kind === 'orbital_laser') {
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -480);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (this.kind === 'void_rift') {
        ctx.strokeStyle = '#e879f9';
        ctx.beginPath();
        ctx.arc(0, -46, this.radius * 0.45 * (1.2 - p * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.kind === 'plasma_mine') {
        // Pulsing Cyber-Coil Node on floor
        ctx.fillStyle = '#0ea5e9';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2;
        ctx.fillRect(-14, -22, 28, 22);
        ctx.strokeRect(-14, -22, 28, 22);
        ctx.beginPath();
        ctx.arc(0, -28, 8 + Math.sin(p * 24) * 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.kind === 'cursed_fang') {
        // Glowing Blood Seal Runes
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.radius * 0.48, -6, this.radius * 0.96, 12);
      } else if (this.kind === 'meteor_rain') {
        // Falling Blazing Meteor streaking diagonally!
        const mx = (1 - p) * -180;
        const my = -440 + p * 395;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(mx - 48, my - 110);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(mx, my, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const t = (this.timer - this.telegraphTime) / this.activeDuration;
      ctx.globalAlpha = Math.max(0, 1 - t);

      if (this.kind === 'orbital_laser') {
        const w = this.radius * 1.15 * (1 - t * 0.35);
        const grad = ctx.createLinearGradient(-w, 0, w, 0);
        grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        grad.addColorStop(0.3, 'rgba(232, 121, 249, 0.85)');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(0.7, 'rgba(34, 211, 238, 0.85)');
        grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-w, -520, w * 2, 520);
      } else if (this.kind === 'icicle_drop') {
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0369a1';
        ctx.lineWidth = 2.4;
        for (const [ox, h] of [[-26, 95], [0, 145], [26, 90]]) {
          ctx.beginPath();
          ctx.moveTo(ox - 16, 0);
          ctx.lineTo(ox, -h);
          ctx.lineTo(ox + 16, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (this.kind === 'lava_geyser') {
        const h = 230 * (1 - t * 0.25);
        const grad = ctx.createLinearGradient(0, -h, 0, 0);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.45, '#f97316');
        grad.addColorStop(1, '#dc2626');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.72, 0);
        ctx.lineTo(-this.radius * 0.28, -h);
        ctx.lineTo(this.radius * 0.28, -h);
        ctx.lineTo(this.radius * 0.72, 0);
        ctx.closePath();
        ctx.fill();
      } else if (this.kind === 'plasma_mine') {
        // Expanding Electromagnetic Plasma Dome
        const r = this.radius * (0.85 + t * 0.3);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.5)';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -24, r, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (this.kind === 'cursed_fang') {
        // 5 Jagged Crimson Blood-Blades Erupting Upward
        ctx.fillStyle = '#e11d48';
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 2;
        for (const [ox, h, tilt] of [
          [-38, 96, -12],
          [-18, 134, -5],
          [0, 162, 0],
          [18, 134, 5],
          [38, 96, 12],
        ]) {
          ctx.beginPath();
          ctx.moveTo(ox - 12, 0);
          ctx.lineTo(ox + tilt, -h);
          ctx.lineTo(ox + 12, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (this.kind === 'meteor_rain') {
        // Molten Chaos Impact Crater Pillar
        const r = this.radius * (0.8 + t * 0.35);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.78)';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -28, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const r = this.radius * 0.78 * (1 + t * 0.25);
        ctx.fillStyle = 'rgba(88, 28, 135, 0.78)';
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -52, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export type SoulCrystalKind = 'thunder_overdrive' | 'crimson_might' | 'aegis_vitality';

/**
 * Interactive Arena Buff Crystal ("Tinh Thể Chiến Trường"):
 * Materializes mid-wave. Players can shatter it in 2-3 hits to unleash an AoE shockwave on nearby
 * enemies and gain a powerful temporary combat buff!
 */
let nextCrystalId = 1;

export class SoulCrystal {
  public readonly id: number;
  public readonly kind: SoulCrystalKind;
  public x: number;
  public y = GROUND_Y;
  public hp = 48;
  public maxHp = 48;
  public life = 0;
  public maxLife = 16;
  public hitFlash = 0;
  public active = true;
  public lastHitboxId = -1;

  constructor(kind: SoulCrystalKind, x: number) {
    this.id = nextCrystalId++;
    this.kind = kind;
    this.x = x;
  }

  public get accentColor(): string {
    if (this.kind === 'thunder_overdrive') return '#38bdf8';
    if (this.kind === 'crimson_might') return '#f43f5e';
    return '#4ade80';
  }

  public get kanji(): string {
    if (this.kind === 'thunder_overdrive') return '雷';
    if (this.kind === 'crimson_might') return '狂';
    return '護';
  }

  public get label(): string {
    if (this.kind === 'thunder_overdrive') return 'TINH THỂ LÔI TỐC';
    if (this.kind === 'crimson_might') return 'TINH THỂ CUỒNG SÁT';
    return 'TINH THỂ HỘ MỆNH';
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.life += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  public takeHit(damage: number, particles: ParticleSystem): boolean {
    if (!this.active) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.hitFlash = 0.14;
    particles.emitSparks(this.x, this.y - 58, 10, this.accentColor, 420);
    if (this.hp <= 0) {
      this.active = false;
      particles.emitShockwave(this.x, this.y - 54, this.accentColor, 185, 0.36);
      particles.emitSparks(this.x, this.y - 58, 26, '#ffffff', 620);
      return true;
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const hover = Math.sin(this.life * 3.8) * 7;
    const cy = this.y - 58 + hover;
    const col = this.hitFlash > 0 ? '#ffffff' : this.accentColor;

    ctx.save();
    try {
      // Base pedestal ring
      ctx.strokeStyle = colorWithAlpha(this.accentColor, 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - 2, 28, 7, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Levitating Diamond Crystal
      ctx.translate(this.x, cy);
      ctx.fillStyle = colorWithAlpha(this.accentColor, 0.27);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(22, 0);
      ctx.lineTo(0, 34);
      ctx.lineTo(-22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner core facet & Kanji
      ctx.fillStyle = 'rgba(9, 11, 16, 0.82)';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '900 14px "Noto Serif JP", serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.kanji, 0, 1);

      // Overhead prompt + HP bar
      ctx.font = '800 11px "Barlow Condensed", sans-serif';
      ctx.fillStyle = this.accentColor;
      ctx.fillText(`★ ĐẬP VỠ [${this.label}]`, 0, -46);

      const bw = 38;
      const ratio = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-bw * 0.5, -39, bw, 4);
      ctx.fillStyle = this.accentColor;
      ctx.fillRect(-bw * 0.5, -39, bw * ratio, 4);
    } finally {
      ctx.restore();
    }
  }
}

/**
 * Exclusive Valkyrie [U] Mechanic: Spinning Astral Glaive Boomerang!
 * Flies forward piercing & pulling enemies, hovers briefly at apex, then returns to Valkyrie's hand
 * hitting every enemy a second time on the way back.
 */
export class ValkyrieBoomerang {
  public x: number;
  public y: number;
  public vx: number;
  public readonly startX: number;
  public readonly dir: 1 | -1;
  public readonly damage: number;
  public readonly primaryColor: string;
  public readonly secondaryColor: string;
  public life = 0;
  public readonly maxLife = 1.45;
  public returning = false;
  public active = true;
  public hitCooldowns = new Map<number, number>();

  constructor(
    x: number,
    y: number,
    dir: 1 | -1,
    damage: number,
    primaryColor: string,
    secondaryColor: string
  ) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.dir = dir;
    this.vx = dir * 920;
    this.damage = damage;
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
  }

  public update(dt: number, ownerX: number, ownerY: number): void {
    if (!this.active) return;
    this.life += dt;

    for (const [id, cd] of this.hitCooldowns.entries()) {
      if (cd - dt <= 0) this.hitCooldowns.delete(id);
      else this.hitCooldowns.set(id, cd - dt);
    }

    if (!this.returning) {
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.08, dt);
      if (this.life >= 0.52 || Math.abs(this.x - this.startX) >= 420) {
        this.returning = true;
      }
    } else {
      const dx = ownerX - this.x;
      const dy = ownerY - 54 - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 42 || this.life >= this.maxLife) {
        this.active = false;
        return;
      }
      const speed = 1040;
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const rot = this.life * 22 * this.dir;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(rot);

    // Outer spinning radiant halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.primaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();

    // Twin spinning crescent glaive blades
    ctx.fillStyle = this.secondaryColor;
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(28, -22, 46, 0);
      ctx.quadraticCurveTo(24, -6, 0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center crystal core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Mirage (Character 7) 100% Exclusive Entity: Void Mirror Rift
 * - Reflects enemy projectiles passing through it back as void-prism bolts!
 * - Emits periodic glass-shatter pulses damaging & marking enemies within radius.
 * - Explodes in a dimensional mirror collapse when its duration ends.
 */
export class MirrorRift {
  public x: number;
  public y: number;
  public radius: number;
  public damage: number;
  public awakened: boolean;
  public primaryColor: string;
  public secondaryColor: string;
  public life = 0;
  public maxLife: number;
  public active = true;
  public pulseTimer = 0.2;
  public finalBurstReady = false;
  public lastHitboxId = -1;
  public warpCooldown = 0;
  public domainEmpowered = false;

  constructor(
    x: number,
    y: number,
    damage: number,
    awakened: boolean,
    primaryColor: string,
    secondaryColor: string,
    maxLife = 3.8
  ) {
    this.x = x;
    this.y = y;
    this.radius = awakened ? 165 : 130;
    this.damage = damage;
    this.awakened = awakened;
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
    this.maxLife = maxLife;
  }

  public getEffectiveRadius(): number {
    return this.domainEmpowered ? this.radius * 1.45 : this.radius;
  }

  public getDamageMultiplier(): number {
    return this.domainEmpowered ? 1.55 : 1.0;
  }

  public update(dt: number): boolean {
    if (!this.active) return false;
    if (Number.isFinite(dt) && dt > 0 && this.warpCooldown > 0) {
      this.warpCooldown = Math.max(0, this.warpCooldown - dt);
    }
    this.life += dt;
    this.pulseTimer -= dt;
    let shouldPulse = false;
    if (this.pulseTimer <= 0) {
      this.pulseTimer = this.awakened || this.domainEmpowered ? 0.45 : 0.58;
      shouldPulse = true;
    }
    if (this.life >= this.maxLife) {
      this.active = false;
      this.finalBurstReady = true;
    }
    return shouldPulse;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const safeX = finiteOr(this.x, 0);
    const safeY = finiteOr(this.y, 0);
    const safeLife = finiteOr(this.life, 0);
    const safeMaxLife = Math.max(0.1, finiteOr(this.maxLife, 3.8));
    const p = Math.min(1, safeLife / 0.22);
    const fade = safeLife > safeMaxLife - 0.35 ? Math.max(0, (safeMaxLife - safeLife) / 0.35) : 1;
    const empowered = this.domainEmpowered;
    const h = (empowered ? 104 : this.awakened ? 92 : 74) * p;
    const w = (empowered ? 38 : this.awakened ? 32 : 24) * p;
    const spin = safeLife * (empowered ? 3.2 : 2.4);

    ctx.save();
    try {
      ctx.globalAlpha = fade;
      ctx.translate(safeX, safeY);

      if (empowered) {
        // Expanded outer crimson-cyan resonance ring
        const outerR = Math.max(24, w * 1.95 + Math.sin(safeLife * 4.5) * 4);
        ctx.strokeStyle = colorWithAlpha('#f43f5e', 0.48);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        try {
          ctx.rotate(-spin * 0.6);
          ctx.strokeStyle = colorWithAlpha('#38bdf8', 0.55);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          const octPts = 8;
          for (let i = 0; i <= octPts; i++) {
            const a = (i * Math.PI * 2) / octPts;
            const rr = outerR * (i % 2 === 0 ? 1.12 : 0.92);
            const ox = Math.cos(a) * rr;
            const oy = Math.sin(a) * rr * 1.18;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
          }
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // Sharper radiating fracture aura spikes around the rift
        ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.52);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI * 2) / 8 + Math.sin(safeLife * 3 + i) * 0.08;
          const r0 = w * 0.95;
          const r1 = outerR * 1.24;
          ctx.strokeStyle = i % 2 === 0 ? colorWithAlpha('#f43f5e', 0.72) : colorWithAlpha('#38bdf8', 0.72);
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * h * 0.52);
          ctx.lineTo(Math.cos(ang + 0.06) * ((r0 + r1) * 0.55), Math.sin(ang + 0.06) * h * 0.78);
          ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * (h * 0.95));
          ctx.stroke();
        }
      }

      // Outer dimensional mirror diamond frame (Ink-Wash obsidian + silver/crimson/cyan rim)
      ctx.fillStyle = empowered ? 'rgba(6, 3, 14, 0.9)' : 'rgba(10, 6, 24, 0.82)';
      ctx.strokeStyle = empowered ? '#f43f5e' : this.primaryColor;
      ctx.lineWidth = empowered ? 3.8 : this.awakened ? 3.2 : 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(w, 0);
      ctx.lineTo(0, h);
      ctx.lineTo(-w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (empowered) {
        // Dual cyan inner diamond bevel + void-prism crown at apex
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.86);
        ctx.lineTo(w * 0.82, 0);
        ctx.lineTo(0, h * 0.86);
        ctx.lineTo(-w * 0.82, 0);
        ctx.closePath();
        ctx.stroke();

        // Escalated crimson-cyan void-prism crown above apex
        const crownY = -h - 6;
        ctx.fillStyle = '#07040e';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, crownY - 22);
        ctx.lineTo(10, crownY - 5);
        ctx.lineTo(22, crownY - 14);
        ctx.lineTo(14, crownY + 4);
        ctx.lineTo(0, crownY + 8);
        ctx.lineTo(-14, crownY + 4);
        ctx.lineTo(-22, crownY - 14);
        ctx.lineTo(-10, crownY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, crownY - 18);
        ctx.lineTo(0, crownY + 6);
        ctx.moveTo(-16, crownY - 10);
        ctx.lineTo(0, crownY + 2);
        ctx.lineTo(16, crownY - 10);
        ctx.stroke();
      }

      // Inner fractured mirror facet lines
      ctx.strokeStyle = empowered ? '#f8fafc' : this.secondaryColor;
      ctx.lineWidth = empowered ? 1.7 : 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.82);
      ctx.lineTo(w * 0.4, -h * 0.15);
      ctx.lineTo(-w * 0.5, h * 0.22);
      ctx.moveTo(-w * 0.72, 0);
      ctx.lineTo(w * 0.72, 0);
      ctx.stroke();

      // Orbiting floating glass shards around the Mirror Rift
      ctx.globalCompositeOperation = 'lighter';
      const shardCount = empowered ? 8 : this.awakened ? 6 : 4;
      for (let i = 0; i < shardCount; i++) {
        const a = spin + (i * Math.PI * 2) / shardCount;
        const sx = Math.cos(a) * (w + (empowered ? 22 : 16));
        const sy = Math.sin(a) * (h * 0.58);
        ctx.fillStyle = empowered
          ? i % 3 === 0
            ? '#f43f5e'
            : i % 3 === 1
              ? '#38bdf8'
              : '#f8fafc'
          : i % 2 === 0
            ? this.primaryColor
            : this.secondaryColor;
        const shardSize = empowered ? 9 : 7;
        ctx.beginPath();
        ctx.moveTo(sx, sy - shardSize);
        ctx.lineTo(sx + shardSize * 0.7, sy);
        ctx.lineTo(sx, sy + shardSize);
        ctx.lineTo(sx - shardSize * 0.7, sy);
        ctx.closePath();
        ctx.fill();
      }
    } finally {
      ctx.restore();
    }
  }
}

export interface TemporalPoseSnapshot {
  time: number;
  x: number;
  y: number;
  facing: 1 | -1;
  pose: StickPoseName;
  poseTime: number;
  walkPhase: number;
}

export interface TemporalEchoStrike {
  triggerTime: number;
  x: number;
  y: number;
  facing: 1 | -1;
  pose: StickPoseName;
  poseTime: number;
  damage: number;
  reach: number;
  heavy: boolean;
  trailColor: string;
  trailAccent: string;
}

export interface TemporalEchoConfig {
  x: number;
  y: number;
  facing?: 1 | -1;
  pose?: StickPoseName;
  poseTime?: number;
  walkPhase?: number;
  skinId?: SkinId;
  awakened?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  maxLife?: number;
  delay?: number;
  damage?: number;
}

/**
 * Chrono (Character 8) Exclusive Entity: Temporal Echo (Phân Thân Quá Khứ)
 * - Records & replays Chrono's Stickman skeleton pose and melee strikes with a 0.4s delay.
 * - Renders a rotating Roman/clockwork aura underfoot and a full translucent Stickman afterimage.
 */
export class TemporalEcho {
  public x: number;
  public y: number;
  public facing: 1 | -1;
  public pose: StickPoseName;
  public poseTime: number;
  public walkPhase: number;
  public skinId: SkinId;
  public awakened: boolean;
  public primaryColor: string;
  public secondaryColor: string;
  public age = 0;
  public life = 0;
  public maxLife: number;
  public delay: number;
  public pendingStrikes: TemporalEchoStrike[] = [];
  public active = true;
  public damage: number;

  constructor(cfg: TemporalEchoConfig) {
    this.x = finiteOr(cfg.x, ARENA_WIDTH * 0.5);
    this.y = finiteOr(cfg.y, GROUND_Y);
    this.facing = cfg.facing === -1 ? -1 : 1;
    this.pose = cfg.pose ?? 'idle';
    this.poseTime = finiteOr(cfg.poseTime, 0);
    this.walkPhase = finiteOr(cfg.walkPhase, 0);
    this.skinId = cfg.skinId ?? 'default';
    this.awakened = Boolean(cfg.awakened);
    this.primaryColor =
      cfg.primaryColor ?? (this.skinId === 'chrono_sovereign' ? '#f59e0b' : '#2dd4bf');
    this.secondaryColor =
      cfg.secondaryColor ?? (this.skinId === 'chrono_sovereign' ? '#38bdf8' : '#f59e0b');
    this.maxLife = Math.max(0.1, finiteOr(cfg.maxLife, 4.2));
    this.delay = Math.max(0.05, finiteOr(cfg.delay, 0.4));
    this.damage = Math.max(1, finiteOr(cfg.damage, 28));
  }

  public queueStrike(strike: TemporalEchoStrike): void {
    if (!this.active) return;
    this.pendingStrikes.push({
      ...strike,
      triggerTime: finiteOr(strike.triggerTime, this.age + this.delay),
      x: finiteOr(strike.x, this.x),
      y: finiteOr(strike.y, this.y),
      facing: strike.facing === -1 ? -1 : 1,
      poseTime: finiteOr(strike.poseTime, 0),
      damage: Math.max(0, finiteOr(strike.damage, this.damage)),
      reach: Math.max(20, finiteOr(strike.reach, 95)),
    });
  }

  public update(dt: number, delayedSample?: TemporalPoseSnapshot): TemporalEchoStrike[] {
    if (!this.active) return [];
    if (!Number.isFinite(dt) || dt < 0) return [];

    this.age += dt;
    this.life += dt;

    if (delayedSample) {
      this.x = finiteOr(delayedSample.x, this.x);
      this.y = finiteOr(delayedSample.y, this.y);
      this.facing = delayedSample.facing === -1 ? -1 : 1;
      this.pose = delayedSample.pose;
      this.poseTime = finiteOr(delayedSample.poseTime, this.poseTime);
      this.walkPhase = finiteOr(delayedSample.walkPhase, this.walkPhase);
    }

    const ready: TemporalEchoStrike[] = [];
    const remaining: TemporalEchoStrike[] = [];
    for (const strike of this.pendingStrikes) {
      if (strike.triggerTime <= this.age) {
        ready.push(strike);
      } else {
        remaining.push(strike);
      }
    }
    this.pendingStrikes = remaining;

    if (this.life >= this.maxLife) {
      this.active = false;
    }

    return ready;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const safeX = finiteOr(this.x, 0);
    const safeY = finiteOr(this.y, GROUND_Y);
    const safeAge = finiteOr(this.age, 0);
    const safeMax = Math.max(0.1, finiteOr(this.maxLife, 4.2));
    const safePoseTime = finiteOr(this.poseTime, 0);
    const safeWalkPhase = finiteOr(this.walkPhase, 0);

    const spawnFade = Math.min(1, safeAge / 0.14);
    const endFade = safeAge > safeMax - 0.36 ? Math.max(0, (safeMax - safeAge) / 0.36) : 1;
    const ghostAlpha = Math.max(0.08, Math.min(0.68, 0.56 * spawnFade * endFade));

    const isSovereign = this.skinId === 'chrono_sovereign';
    const auraPrimary = this.primaryColor || (isSovereign ? '#f59e0b' : '#2dd4bf');
    const auraSecondary = this.secondaryColor || (isSovereign ? '#38bdf8' : '#f59e0b');
    const bodyCol = isSovereign ? '#d97706' : '#0f766e';

    ctx.save();
    try {
      ctx.globalAlpha = ghostAlpha;

      // 1. Rotating Miniature Roman / Clockwork Aura Circle Underfoot
      const spin = safeAge * 1.45;
      const rx = this.awakened ? 31 : 27;
      const ry = this.awakened ? 9.5 : 8.2;

      ctx.fillStyle = colorWithAlpha(auraPrimary, 0.18);
      ctx.beginPath();
      ctx.ellipse(safeX, safeY - 1, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = colorWithAlpha(auraPrimary, 0.88);
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(safeX, safeY - 1, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha(auraSecondary, 0.78);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(safeX, safeY - 1, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 12 radial Roman-clock ticks around the underfoot dial
      for (let i = 0; i < 12; i++) {
        const a = spin + (i * Math.PI * 2) / 12;
        const innerScale = i % 3 === 0 ? 0.66 : 0.78;
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        ctx.strokeStyle =
          i % 3 === 0 ? colorWithAlpha(auraSecondary, 0.92) : colorWithAlpha(auraPrimary, 0.72);
        ctx.lineWidth = i % 3 === 0 ? 1.8 : 1.1;
        ctx.beginPath();
        ctx.moveTo(safeX + cosA * rx * innerScale, safeY - 1 + sinA * ry * innerScale);
        ctx.lineTo(safeX + cosA * rx, safeY - 1 + sinA * ry);
        ctx.stroke();
      }

      // Twin miniature counter-rotating clock hands underfoot
      const hand1 = -safeAge * 3.8;
      const hand2 = safeAge * 1.6;
      ctx.strokeStyle = auraSecondary;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(safeX, safeY - 1);
      ctx.lineTo(safeX + Math.cos(hand1) * rx * 0.78, safeY - 1 + Math.sin(hand1) * ry * 0.78);
      ctx.moveTo(safeX, safeY - 1);
      ctx.lineTo(safeX + Math.cos(hand2) * rx * 0.54, safeY - 1 + Math.sin(hand2) * ry * 0.54);
      ctx.stroke();

      // 2. Full Translucent Stickman Skeleton Afterimage
      renderStickman(ctx, {
        x: safeX,
        y: safeY,
        facing: this.facing,
        pose: this.pose,
        poseTime: safePoseTime,
        walkPhase: safeWalkPhase,
        bodyColor: bodyCol,
        glowColor: auraPrimary,
        inkRimColor: auraSecondary,
        inkAccent: auraSecondary,
        scarfPrimary: auraPrimary,
        scarfHighlight: auraSecondary,
        lineWidth: 9.2,
        headRadius: 12.2,
        characterId: 'chrono',
        skinId: this.skinId,
        weapon: this.awakened ? 'chrono_twin_hands' : 'chrono_hand',
        headGear: 'chrono_gear',
        awakened: this.awakened,
        darkAura: 'none',
      });
    } finally {
      ctx.restore();
    }
  }
}

export {
  BotBrain,
  BOT_DIFFICULTY_PROFILES,
  resolveDefaultArchetype,
  type BotActionKind,
  type BotArchetype,
  type BotDecision,
  type BotDifficulty,
  type BotDifficultyProfile,
  type BotWorldSnapshot,
  type PlayerObservedAction,
} from './ai/BotBrain';
import {
  BotBrain as BotBrainCore,
  type BotDecision as BotDecisionCore,
  type BotWorldSnapshot as BotSnapshotCore,
} from './ai/BotBrain';

/**
 * Shared BotBrain execution hook for Enemy / Boss / Hero-Bot entities: invokes `brain.decide(...)`
 * and optionally applies immediate vertical jump impulse when requested.
 */
export function stepBotBrainHook(
  brain: BotBrainCore,
  snap: BotSnapshotCore,
  applyJump?: (jumpVy: number) => void
): BotDecisionCore {
  const decision = brain.decide(snap);
  if (applyJump && decision.jump && decision.jumpVy < 0 && snap.botOnGround) {
    applyJump(decision.jumpVy);
  }
  return decision;
}


