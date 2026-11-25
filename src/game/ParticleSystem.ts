import { GROUND_Y } from './rules';

export type ParticleKind =
  | 'spark'
  | 'smoke'
  | 'cartoon_smoke'
  | 'ice'
  | 'lightning'
  | 'ember'
  | 'ring'
  | 'crack'
  | 'ink_splatter'
  | 'slash_beam'
  | 'chain_arc'
  | 'text';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  endSize: number;
  color: string;
  rotation: number;
  vRot: number;
  gravity: number;
  drag: number;
  text: string;
  alpha: number;
}

const MAX_PARTICLES = 500;

export class ParticleSystem {
  private pool: Particle[] = [];
  private cursor = 0;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        kind: 'spark',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 4,
        endSize: 0,
        color: '#ffffff',
        rotation: 0,
        vRot: 0,
        gravity: 0,
        drag: 0.96,
        text: '',
        alpha: 1,
      });
    }
  }

  public clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool[i].active = false;
    }
  }

  private alloc(): Particle {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (this.cursor + i) % MAX_PARTICLES;
      if (!this.pool[idx].active) {
        this.cursor = (idx + 1) % MAX_PARTICLES;
        return this.pool[idx];
      }
    }
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    return p;
  }

  public emitSparks(
    x: number,
    y: number,
    count: number,
    color = '#fef08a',
    speed = 520,
    dirAngle?: number
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      const angle =
        dirAngle !== undefined
          ? dirAngle + (Math.random() - 0.5) * 1.4
          : Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.75);
      p.active = true;
      p.kind = 'spark';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 60;
      p.life = 0;
      p.maxLife = 0.22 + Math.random() * 0.18;
      p.size = 2.8 + Math.random() * 3;
      p.endSize = 0.6;
      p.color = color;
      p.rotation = angle;
      p.vRot = 0;
      p.gravity = 920;
      p.drag = 0.93;
      p.alpha = 1;
      p.text = '';
    }
  }

  public emitSmoke(
    x: number,
    y: number,
    count: number,
    color = '#f8fafc',
    riseSpeed = -75,
    spread = 28
  ): void {
    const useCartoon = color === '#f8fafc' || color === '#f1f5f9' || color === '#e2e8f0';
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      p.active = true;
      p.kind = useCartoon ? 'cartoon_smoke' : 'smoke';
      p.x = x + (Math.random() - 0.5) * spread * 1.4;
      p.y = y + (Math.random() - 0.5) * spread * 0.45;
      p.vx = (Math.random() - 0.5) * (useCartoon ? 110 : 65);
      p.vy = riseSpeed * (0.4 + Math.random() * 0.7);
      p.life = 0;
      p.maxLife = useCartoon ? 0.9 + Math.random() * 0.9 : 0.45 + Math.random() * 0.4;
      p.size = useCartoon ? 14 + Math.random() * 14 : 7 + Math.random() * 10;
      p.endSize = useCartoon ? 24 + Math.random() * 16 : 18 + Math.random() * 12;
      p.color = color;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 1.4;
      p.gravity = useCartoon ? -18 : -40;
      p.drag = 0.94;
      p.alpha = useCartoon ? 0.95 : 0.48;
      p.text = '';
    }
  }

  public emitIceShards(x: number, y: number, count: number, dirX = 1): void {
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      p.active = true;
      p.kind = 'ice';
      p.x = x + (Math.random() - 0.5) * 34;
      p.y = y + (Math.random() - 0.5) * 70;
      p.vx = dirX * (180 + Math.random() * 480) + (Math.random() - 0.5) * 260;
      p.vy = -180 - Math.random() * 380;
      p.life = 0;
      p.maxLife = 0.55 + Math.random() * 0.45;
      p.size = 7 + Math.random() * 11;
      p.endSize = 2;
      p.color = Math.random() > 0.35 ? '#38bdf8' : '#e0f2fe';
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 14;
      p.gravity = 1550;
      p.drag = 0.985;
      p.alpha = 0.95;
      p.text = '';
    }
  }

  public emitLightning(x: number, y: number, color = '#c084fc', size = 34): void {
    const p = this.alloc();
    p.active = true;
    p.kind = 'lightning';
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 30;
    p.vy = -40 - Math.random() * 40;
    p.life = 0;
    p.maxLife = 0.14 + Math.random() * 0.12;
    p.size = size;
    p.endSize = size * 0.6;
    p.color = color;
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = 0;
    p.gravity = 0;
    p.drag = 0.98;
    p.alpha = 0.95;
    p.text = '';
  }

  public emitEmbers(x: number, y: number, count: number, color = '#ef4444'): void {
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      p.active = true;
      p.kind = 'ember';
      p.x = x + (Math.random() - 0.5) * 28;
      p.y = y + (Math.random() - 0.5) * 40;
      p.vx = (Math.random() - 0.5) * 280;
      p.vy = -120 - Math.random() * 240;
      p.life = 0;
      p.maxLife = 0.42 + Math.random() * 0.4;
      p.size = 3.5 + Math.random() * 4;
      p.endSize = 0.5;
      p.color = color;
      p.rotation = Math.random() * Math.PI;
      p.vRot = (Math.random() - 0.5) * 8;
      p.gravity = 220;
      p.drag = 0.96;
      p.alpha = 1;
      p.text = '';
    }
  }

  public emitShockwave(
    x: number,
    y: number,
    color = '#38bdf8',
    endSize = 95,
    maxLife = 0.28
  ): void {
    const p = this.alloc();
    p.active = true;
    p.kind = 'ring';
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.life = 0;
    p.maxLife = maxLife;
    p.size = 10;
    p.endSize = endSize;
    p.color = color;
    p.rotation = 0;
    p.vRot = 0;
    p.gravity = 0;
    p.drag = 1;
    p.alpha = 0.9;
    p.text = '';
  }

  public emitGroundCrack(x: number, size = 48, color = '#0b0c10'): void {
    const p = this.alloc();
    p.active = true;
    p.kind = 'crack';
    p.x = x;
    p.y = GROUND_Y + 2;
    p.vx = 0;
    p.vy = 0;
    p.life = 0;
    p.maxLife = 2.6;
    p.size = size;
    p.endSize = size;
    p.color = color;
    p.rotation = Math.random() * 100;
    p.vRot = 0;
    p.gravity = 0;
    p.drag = 1;
    p.alpha = 0.85;
    p.text = '';
  }

  /**
   * Razor-sharp tapering anime cut-line slashing across a struck enemy (Sakuga impact smear).
   */
  public emitSlashBeam(
    x: number,
    y: number,
    angle: number,
    length = 220,
    color = '#ef4444',
    width = 12
  ): void {
    const p = this.alloc();
    p.active = true;
    p.kind = 'slash_beam';
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * 40;
    p.vy = Math.sin(angle) * 40;
    p.life = 0;
    p.maxLife = 0.24;
    p.size = length;
    p.endSize = width;
    p.color = color;
    p.rotation = angle;
    p.vRot = 0;
    p.gravity = 0;
    p.drag = 0.9;
    p.alpha = 1;
    p.text = '';
  }

  /**
   * Jagged crackling energy tether connecting (x1, y1) directly to (x2, y2) — used for
   * Raijin's Chain Lightning detonations and Zero's Shadow-Warp teleport ribbons!
   */
  public emitChainArc(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = '#38bdf8',
    thickness = 5
  ): void {
    const p = this.alloc();
    p.active = true;
    p.kind = 'chain_arc';
    p.x = x1;
    p.y = y1;
    p.vx = x2; // store endpoint x2
    p.vy = y2; // store endpoint y2
    p.life = 0;
    p.maxLife = 0.26;
    p.size = thickness;
    p.endSize = Math.random() * 100; // deterministic jitter seed
    p.color = color;
    p.rotation = 0;
    p.vRot = 0;
    p.gravity = 0;
    p.drag = 1;
    p.alpha = 1;
    p.text = '';
  }

  public emitText(x: number, y: number, text: string, color = '#f8fafc', size = 24): void {
    const p = this.alloc();
    p.active = true;
    p.kind = 'text';
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 28;
    p.vy = -85;
    p.life = 0;
    p.maxLife = 0.85;
    p.size = size;
    p.endSize = size;
    p.color = color;
    p.rotation = 0;
    p.vRot = 0;
    p.gravity = 0;
    p.drag = 0.94;
    p.alpha = 1;
    p.text = text;
  }

  public update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      if (p.kind !== 'chain_arc') {
        const dragPow = Math.pow(p.drag, dt * 60);
        p.vx *= dragPow;
        p.vy = p.vy * dragPow + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;
      }

      if (p.kind === 'ice' && p.y > GROUND_Y - 2) {
        p.y = GROUND_Y - 2;
        p.vy = -Math.abs(p.vy) * 0.35;
        p.vx *= 0.72;
      }
      if (p.kind === 'cartoon_smoke' && p.y > GROUND_Y - 6) {
        p.y = GROUND_Y - 6;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const inv = 1 - t;
      const curSize = p.size + (p.endSize - p.size) * t;

      if (p.kind === 'crack') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv * 2) * p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const seed = p.rotation;
        for (let b = -2; b <= 2; b++) {
          const dx = b * p.size * 0.34;
          const dy = Math.abs(b) * 4 + ((seed * (b + 4)) % 6);
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + dx * 0.55, p.y + dy * 0.5);
          ctx.lineTo(p.x + dx, p.y + dy);
        }
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = inv * p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 5.5 * inv);
        ctx.beginPath();
        ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.kind === 'cartoon_smoke') {
        // Cel-shaded puffy white anime smoke cloud with bold dark ink outline (reference 00:22–00:26!)
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv * 1.8) * p.alpha;
        const r = Math.max(2, curSize);
        ctx.fillStyle = '#0e1116';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
        ctx.arc(p.x - r * 0.55, p.y + 3, r * 0.72 + 2.2, 0, Math.PI * 2);
        ctx.arc(p.x + r * 0.55, p.y + 3, r * 0.68 + 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.arc(p.x - r * 0.55, p.y + 3, r * 0.72, 0, Math.PI * 2);
        ctx.arc(p.x + r * 0.55, p.y + 3, r * 0.68, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (p.kind === 'smoke') {
        ctx.save();
        ctx.globalAlpha = inv * p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, curSize), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (p.kind === 'spark') {
        ctx.save();
        ctx.globalAlpha = inv;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.2, curSize * 0.75);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.036, p.y - p.vy * 0.036);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.kind === 'ice') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv * 1.4) * p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -curSize);
        ctx.lineTo(curSize * 0.65, -curSize * 0.2);
        ctx.lineTo(curSize * 0.4, curSize * 0.8);
        ctx.lineTo(-curSize * 0.55, curSize * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.kind === 'lightning') {
        ctx.save();
        ctx.globalAlpha = inv * p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        let lx = p.x;
        let ly = p.y;
        ctx.moveTo(lx, ly);
        for (let s = 0; s < 4; s++) {
          const ang = p.rotation + (s % 2 === 0 ? 0.55 : -0.55);
          lx += Math.cos(ang) * (p.size * 0.36);
          ly += Math.sin(ang) * (p.size * 0.36);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.kind === 'ember') {
        ctx.save();
        ctx.globalAlpha = inv;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-curSize * 0.5, -curSize * 0.5, curSize, curSize);
        ctx.restore();
        continue;
      }

      if (p.kind === 'slash_beam') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const len = p.size * (0.72 + Math.min(1, t * 4.5) * 0.42);
        const halfW = Math.max(0.8, p.endSize * inv * inv);
        ctx.globalAlpha = Math.min(1, inv * 1.6);

        // Bold dark ink outer rim for cel-shaded anime contrast
        ctx.fillStyle = '#090b10';
        ctx.beginPath();
        ctx.moveTo(-len * 0.56, 0);
        ctx.quadraticCurveTo(0, -(halfW + 3.2), len * 0.56, 0);
        ctx.quadraticCurveTo(0, halfW + 3.2, -len * 0.56, 0);
        ctx.closePath();
        ctx.fill();

        // Vivid elemental blade smear
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-len * 0.52, 0);
        ctx.quadraticCurveTo(0, -halfW, len * 0.52, 0);
        ctx.quadraticCurveTo(0, halfW, -len * 0.52, 0);
        ctx.closePath();
        ctx.fill();

        // Blinding white razor core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-len * 0.42, 0);
        ctx.quadraticCurveTo(0, -halfW * 0.42, len * 0.42, 0);
        ctx.quadraticCurveTo(0, halfW * 0.42, -len * 0.42, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (p.kind === 'chain_arc') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv * 1.4);
        const x1 = p.x;
        const y1 = p.y;
        const x2 = p.vx;
        const y2 = p.vy;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const segs = Math.max(5, Math.min(12, Math.round(dist / 36)));
        const pts: Array<[number, number]> = [[x1, y1]];
        for (let s = 1; s < segs; s++) {
          const f = s / segs;
          const jitter = Math.sin(p.endSize + s * 9.7 + p.life * 48) * 18 * Math.sin(f * Math.PI);
          pts.push([x1 + dx * f + nx * jitter, y1 + dy * f + ny * jitter]);
        }
        pts.push([x2, y2]);

        const strokePath = (color: string, width: number) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let s = 1; s < pts.length; s++) {
            ctx.lineTo(pts[s][0], pts[s][1]);
          }
          ctx.stroke();
        };

        strokePath('#090b10', p.size * inv + 5.5);
        strokePath(p.color, p.size * inv + 2.2);
        strokePath('#ffffff', Math.max(1.2, p.size * inv * 0.5));
        ctx.restore();
        continue;
      }

      if (p.kind === 'text') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv * 1.6);
        const popScale = t < 0.14 ? 0.8 + (t / 0.14) * 0.35 : 1.0;
        ctx.translate(p.x, p.y);
        ctx.scale(popScale, popScale);
        ctx.font = `italic 800 ${p.size}px "Barlow Condensed", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#090b10';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
