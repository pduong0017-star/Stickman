import { ARENA_WIDTH, GROUND_Y } from './rules';

interface ElementCell {
  symbol: string;
  num: number;
  col: number;
  row: number;
  featured: boolean;
  dropSeed: number;
}

const RAW_PERIODIC_ROWS: Array<{ row: number; items: Array<[number, number, string]> }> = [
  { row: 0, items: [[0, 1, 'H'], [17, 2, 'He']] },
  {
    row: 1,
    items: [
      [0, 3, 'Li'], [1, 4, 'Be'],
      [12, 5, 'B'], [13, 6, 'C'], [14, 7, 'N'], [15, 8, 'O'], [16, 9, 'F'], [17, 10, 'Ne'],
    ],
  },
  {
    row: 2,
    items: [
      [0, 11, 'Na'], [1, 12, 'Mg'],
      [12, 13, 'Al'], [13, 14, 'Si'], [14, 15, 'P'], [15, 16, 'S'], [16, 17, 'Cl'], [17, 18, 'Ar'],
    ],
  },
  {
    row: 3,
    items: [
      [0, 19, 'K'], [1, 20, 'Ca'], [2, 21, 'Sc'], [3, 22, 'Ti'], [4, 23, 'V'], [5, 24, 'Cr'],
      [6, 25, 'Mn'], [7, 26, 'Fe'], [8, 27, 'Co'], [9, 28, 'Ni'], [10, 29, 'Cu'], [11, 30, 'Zn'],
      [12, 31, 'Ga'], [13, 32, 'Ge'], [14, 33, 'As'], [15, 34, 'Se'], [16, 35, 'Br'], [17, 36, 'Kr'],
    ],
  },
  {
    row: 4,
    items: [
      [0, 37, 'Rb'], [1, 38, 'Sr'], [2, 39, 'Y'], [3, 40, 'Zr'], [4, 41, 'Nb'], [5, 42, 'Mo'],
      [6, 43, 'Tc'], [7, 44, 'Ru'], [8, 45, 'Rh'], [9, 46, 'Pd'], [10, 47, 'Ag'], [11, 48, 'Cd'],
      [12, 49, 'In'], [13, 50, 'Sn'], [14, 51, 'Sb'], [15, 52, 'Te'], [16, 53, 'I'], [17, 54, 'Xe'],
    ],
  },
  {
    row: 5,
    items: [
      [0, 55, 'Cs'], [1, 56, 'Ba'], [2, 57, 'La'], [3, 72, 'Hf'], [4, 73, 'Ta'], [5, 74, 'W'],
      [6, 75, 'Re'], [7, 76, 'Os'], [8, 77, 'Ir'], [9, 78, 'Pt'], [10, 79, 'Au'], [11, 80, 'Hg'],
      [12, 81, 'Tl'], [13, 82, 'Pb'], [14, 83, 'Bi'], [15, 84, 'Po'], [16, 85, 'At'], [17, 86, 'Rn'],
    ],
  },
  {
    row: 6,
    items: [
      [0, 87, 'Fr'], [1, 88, 'Ra'], [2, 89, 'Ac'], [3, 104, 'Rf'], [4, 105, 'Db'], [5, 106, 'Sg'],
      [6, 107, 'Bh'], [7, 108, 'Hs'], [8, 109, 'Mt'], [9, 110, 'Ds'], [10, 111, 'Rg'], [11, 112, 'Cn'],
      [12, 113, 'Nh'], [13, 114, 'Fl'], [14, 115, 'Mc'], [15, 116, 'Lv'], [16, 117, 'Ts'], [17, 118, 'Og'],
    ],
  },
];

const FEATURED_SYMBOLS = new Set(['H', 'C', 'O', 'Ne', 'Ar', 'Kr']);

const PERIODIC_ELEMENTS: ElementCell[] = [];
for (const r of RAW_PERIODIC_ROWS) {
  for (const [col, num, symbol] of r.items) {
    PERIODIC_ELEMENTS.push({
      symbol,
      num,
      col,
      row: r.row,
      featured: FEATURED_SYMBOLS.has(symbol),
      dropSeed: ((num * 37) % 100) / 100,
    });
  }
}

export class PeriodicTableBG {
  private time = 0;
  private awakeningBlend = 0;
  private tableDropTimer = 0;
  private wasAwakened = false;
  private crimsonFlash = 0;

  public triggerCrimsonFlash(amount = 0.7): void {
    this.crimsonFlash = Math.min(1, Math.max(this.crimsonFlash, amount));
  }

  public update(dt: number, awakened: boolean): void {
    this.time += dt;
    if (awakened && !this.wasAwakened) {
      this.tableDropTimer = 0;
    }
    this.wasAwakened = awakened;
    if (awakened) {
      this.tableDropTimer = Math.min(1.6, this.tableDropTimer + dt);
    }

    const target = awakened ? 1 : 0;
    this.awakeningBlend += (target - this.awakeningBlend) * (1 - Math.exp(-5.0 * dt));
    this.crimsonFlash = Math.max(0, this.crimsonFlash - dt * 2.4);
  }

  /**
   * Matte charcoal-gray anime fighting stage backdrop (matching reference video!)
   * High contrast against pure white stickmen, violet hero, cyan crystal walls, and crimson slashes.
   */
  public renderScreenBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    awakened: boolean
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    if (this.awakeningBlend > 0.08) {
      grad.addColorStop(0, '#1e161b');
      grad.addColorStop(0.65, '#2b1e23');
      grad.addColorStop(1, '#191317');
    } else {
      grad.addColorStop(0, '#363a3f');
      grad.addColorStop(0.68, '#3f4348');
      grad.addColorStop(1, '#26292e');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Subtle soft studio spotlight in the center
    const rad = ctx.createRadialGradient(
      viewW * 0.5,
      viewH * 0.45,
      40,
      viewW * 0.5,
      viewH * 0.45,
      viewW * 0.58
    );
    if (awakened || this.awakeningBlend > 0.15) {
      rad.addColorStop(0, `rgba(220, 38, 38, ${0.14 * this.awakeningBlend})`);
      rad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    } else {
      rad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      rad.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
    }
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, viewW, viewH);

    if (this.crimsonFlash > 0.01) {
      ctx.fillStyle = `rgba(220, 38, 38, ${this.crimsonFlash * 0.26})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }

  public renderWorld(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    _bossAccent: string | null
  ): void {
    ctx.save();

    // 1. Clean Subtle Lab Wall Grid (matches reference 00:27–00:45)
    const gridSize = 68;
    ctx.strokeStyle =
      this.awakeningBlend > 0.25
        ? `rgba(248, 113, 113, ${0.06 + 0.05 * this.awakeningBlend})`
        : 'rgba(255, 255, 255, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -200; x <= ARENA_WIDTH + 200; x += gridSize) {
      ctx.moveTo(x, -160);
      ctx.lineTo(x, GROUND_Y);
    }
    for (let y = -120; y <= GROUND_Y; y += gridSize) {
      ctx.moveTo(-200, y);
      ctx.lineTo(ARENA_WIDTH + 200, y);
    }
    ctx.stroke();

    // 2. Full 18-Column Periodic Table of Chemical Elements (drops into formation during Awakening!)
    if (this.awakeningBlend > 0.02) {
      this.renderPeriodicTable(ctx, playerX, playerY, this.awakeningBlend);
    }

    // 3. Subtle Arena Edge Markers
    ctx.strokeStyle =
      this.awakeningBlend > 0.3
        ? 'rgba(239, 68, 68, 0.45)'
        : 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 20);
    ctx.lineTo(26, GROUND_Y);
    ctx.moveTo(ARENA_WIDTH - 26, 20);
    ctx.lineTo(ARENA_WIDTH - 26, GROUND_Y);
    ctx.stroke();

    // 4. Clean Darker Matte Charcoal Floor Plane (exact reference look!)
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 300);
    if (this.awakeningBlend > 0.25) {
      floorGrad.addColorStop(0, '#2a2024');
      floorGrad.addColorStop(0.25, '#20181c');
      floorGrad.addColorStop(1, '#140f12');
    } else {
      floorGrad.addColorStop(0, '#2b2e33');
      floorGrad.addColorStop(0.22, '#24272c');
      floorGrad.addColorStop(1, '#181a1e');
    }
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);

    // Subtle horizon shadow seam where wall meets floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.fillRect(-500, GROUND_Y - 2, ARENA_WIDTH + 1000, 4);

    ctx.restore();
  }

  private renderPeriodicTable(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    alpha: number
  ): void {
    ctx.save();
    const cellW = 46;
    const cellH = 42;
    const gap = 5;
    const tableW = 18 * (cellW + gap);
    const originX = ARENA_WIDTH * 0.5 - tableW * 0.5;
    const originY = GROUND_Y - 372;

    const featuredCenters: Array<{ x: number; y: number; symbol: string }> = [];

    for (const el of PERIODIC_ELEMENTS) {
      const targetX = originX + el.col * (cellW + gap);
      const targetY = originY + el.row * (cellH + gap);

      // Dynamic drop-and-tumble entrance animation (matches 00:41 -> 00:42!)
      const startDelay = el.dropSeed * 0.35;
      const dropP = Math.max(0, Math.min(1, (this.tableDropTimer - startDelay) / 0.45));
      const easeOut = 1 - Math.pow(1 - dropP, 3);
      const dropOffsetY = (1 - easeOut) * (-240 - el.row * 25);
      const tilt = (1 - easeOut) * ((el.dropSeed - 0.5) * 1.4);

      const x = targetX;
      const y = targetY + dropOffsetY;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 5.5 + el.num * 0.6);

      ctx.save();
      ctx.globalAlpha = alpha * Math.min(1, dropP * 1.4) * (el.featured ? 0.96 : 0.68);
      ctx.translate(x + cellW * 0.5, y + cellH * 0.5);
      if (Math.abs(tilt) > 0.005) ctx.rotate(tilt);

      if (el.featured) {
        featuredCenters.push({ x: targetX + cellW * 0.5, y: targetY + cellH * 0.5, symbol: el.symbol });
        ctx.fillStyle = `rgba(185, 28, 28, ${0.32 + pulse * 0.28})`;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.2;
      } else {
        ctx.fillStyle = 'rgba(20, 18, 24, 0.72)';
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
        ctx.lineWidth = 1.2;
      }

      ctx.fillRect(-cellW * 0.5, -cellH * 0.5, cellW, cellH);
      ctx.strokeRect(-cellW * 0.5, -cellH * 0.5, cellW, cellH);

      // Crisp symbol text
      ctx.font = `800 ${el.featured ? 18 : 15}px "Barlow Condensed", sans-serif`;
      ctx.fillStyle = el.featured ? '#ffffff' : 'rgba(241, 245, 249, 0.72)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.symbol, 0, 2);

      ctx.restore();
    }

    // Crackling lightning energy tethers from glowing featured elements (Ne, Ar, Kr, H, C, O) to protagonist
    if (this.tableDropTimer > 0.4) {
      const targetY = playerY - 58;
      for (let i = 0; i < featuredCenters.length; i++) {
        const c = featuredCenters[i];
        const beamPulse = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 6 + i * 1.3));
        ctx.save();
        ctx.globalAlpha = alpha * 0.55 * beamPulse;
        ctx.strokeStyle = i % 2 === 0 ? '#ef4444' : '#c084fc';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        const steps = 4;
        for (let s = 1; s < steps; s++) {
          const frac = s / steps;
          const jx = (Math.sin(this.time * 24 + i * 7 + s * 3) * 14);
          const jy = (Math.cos(this.time * 20 + i * 5 + s * 2) * 14);
          ctx.lineTo(
            c.x + (playerX - c.x) * frac + jx,
            c.y + (targetY - c.y) * frac + jy
          );
        }
        ctx.lineTo(playerX, targetY);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
