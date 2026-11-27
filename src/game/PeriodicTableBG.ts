import { ARENA_WIDTH, GROUND_Y } from './rules';
import { STAGE_THEME_PALETTES } from './stages';
import { colorWithAlpha, finiteOr } from './renderer/inkStyle';
import type { DomainKind, StageThemeId } from './types';

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

const TABLE_CELL_W = 46;
const TABLE_CELL_H = 42;
const TABLE_CELL_GAP = 5;
const TABLE_COLS = 18;
const TABLE_ROWS = 7;
const TABLE_W = TABLE_COLS * (TABLE_CELL_W + TABLE_CELL_GAP);
const TABLE_H = TABLE_ROWS * (TABLE_CELL_H + TABLE_CELL_GAP);
const TABLE_PLATE_PAD = 8;

interface AmbientMote {
  x: number;
  y: number;
  r: number;
  speedY: number;
  driftPhase: number;
  alpha: number;
}

const AMBIENT_MOTES: AmbientMote[] = Array.from({ length: 42 }, (_, i) => ({
  x: ((i * 197) % 1000) / 1000,
  y: ((i * 313) % 1000) / 1000,
  r: 1.2 + (i % 4) * 0.7,
  speedY: 0.015 + (i % 5) * 0.008,
  driftPhase: i * 1.7,
  alpha: 0.2 + (i % 4) * 0.11,
}));

export class PeriodicTableBG {
  private time = 0;
  private awakeningBlend = 0;
  private mirageDomainBlend = 0;
  private chronoDomainBlend = 0;
  private xuanFengDomainBlend = 0;
  private domainKind: DomainKind = 'none';
  private tableDropTimer = 0;
  private wasAwakened = false;
  private crimsonFlash = 0;
  private stageTheme: StageThemeId = 'genesis_lab';
  private staticTableCanvas: HTMLCanvasElement | null = null;
  private staticTableFailed = false;

  public setStageTheme(theme: StageThemeId): void {
    this.stageTheme = theme;
  }

  public getStageTheme(): StageThemeId {
    return this.stageTheme;
  }

  public resetDomain(): void {
    this.mirageDomainBlend = 0;
    this.chronoDomainBlend = 0;
    this.xuanFengDomainBlend = 0;
    this.domainKind = 'none';
  }

  public getDomainBlend(): number {
    return Math.max(this.mirageDomainBlend, this.chronoDomainBlend, this.xuanFengDomainBlend);
  }

  public getMirageDomainBlend(): number {
    return this.mirageDomainBlend;
  }

  public getChronoDomainBlend(): number {
    return this.chronoDomainBlend;
  }

  public getXuanFengDomainBlend(): number {
    return this.xuanFengDomainBlend;
  }

  public getDomainKind(): DomainKind {
    return this.domainKind;
  }

  public triggerCrimsonFlash(amount = 0.7): void {
    const safeAmt = finiteOr(amount, 0.7);
    this.crimsonFlash = Math.min(1, Math.max(this.crimsonFlash, safeAmt));
  }

  public update(
    dt: number,
    awakened: boolean,
    domainActive: boolean | DomainKind = false,
    domainKind?: DomainKind
  ): void {
    if (!Number.isFinite(dt) || dt < 0) return;
    this.time += dt;
    if (awakened && !this.wasAwakened) {
      this.tableDropTimer = 0;
    }
    this.wasAwakened = awakened;
    if (awakened) {
      this.tableDropTimer = Math.min(1.6, this.tableDropTimer + dt);
    }

    const target = awakened ? 1 : 0;
    const blendRate = 1 - Math.exp(-5.0 * dt);
    this.awakeningBlend += (target - this.awakeningBlend) * blendRate;

    let resolvedKind: DomainKind = 'none';
    if (domainActive === 'chrono') {
      resolvedKind = 'chrono';
    } else if (domainActive === 'mirage') {
      resolvedKind = 'mirage';
    } else if (domainActive === 'xuan_feng') {
      resolvedKind = 'xuan_feng';
    } else if (domainActive === true) {
      resolvedKind =
        domainKind === 'chrono'
          ? 'chrono'
          : domainKind === 'xuan_feng'
            ? 'xuan_feng'
            : 'mirage';
    }

    const mirageTarget = resolvedKind === 'mirage' ? 1 : 0;
    const chronoTarget = resolvedKind === 'chrono' ? 1 : 0;
    const xuanFengTarget = resolvedKind === 'xuan_feng' ? 1 : 0;
    this.mirageDomainBlend += (mirageTarget - this.mirageDomainBlend) * blendRate;
    this.chronoDomainBlend += (chronoTarget - this.chronoDomainBlend) * blendRate;
    this.xuanFengDomainBlend += (xuanFengTarget - this.xuanFengDomainBlend) * blendRate;
    this.mirageDomainBlend = Math.max(0, Math.min(1, finiteOr(this.mirageDomainBlend, 0)));
    this.chronoDomainBlend = Math.max(0, Math.min(1, finiteOr(this.chronoDomainBlend, 0)));
    this.xuanFengDomainBlend = Math.max(0, Math.min(1, finiteOr(this.xuanFengDomainBlend, 0)));
    if (mirageTarget === 0 && this.mirageDomainBlend < 0.0005) this.mirageDomainBlend = 0;
    if (chronoTarget === 0 && this.chronoDomainBlend < 0.0005) this.chronoDomainBlend = 0;
    if (xuanFengTarget === 0 && this.xuanFengDomainBlend < 0.0005) this.xuanFengDomainBlend = 0;

    if (resolvedKind !== 'none') {
      this.domainKind = resolvedKind;
    } else if (
      this.mirageDomainBlend > 0.02 ||
      this.chronoDomainBlend > 0.02 ||
      this.xuanFengDomainBlend > 0.02
    ) {
      if (
        this.xuanFengDomainBlend >= this.chronoDomainBlend &&
        this.xuanFengDomainBlend >= this.mirageDomainBlend
      ) {
        this.domainKind = 'xuan_feng';
      } else if (this.chronoDomainBlend >= this.mirageDomainBlend) {
        this.domainKind = 'chrono';
      } else {
        this.domainKind = 'mirage';
      }
    } else {
      this.domainKind = 'none';
    }

    this.crimsonFlash = Math.max(0, this.crimsonFlash - dt * 2.4);
  }

  /**
   * Rich cinematic anime fighting stage backdrop with biome-specific sky landmarks,
   * volumetric god-rays, atmospheric depth gradient, and directional weather motes.
   */
  public renderScreenBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    awakened: boolean,
    themeColor = '#ef4444'
  ): void {
    const safeW = Math.max(1, finiteOr(viewW, 1280));
    const safeH = Math.max(1, finiteOr(viewH, 720));
    const safeThemeColor =
      typeof themeColor === 'string' && themeColor.trim().length > 0 ? themeColor : '#ef4444';
    const pal = STAGE_THEME_PALETTES[this.stageTheme] ?? STAGE_THEME_PALETTES.genesis_lab;
    const d = this.getDomainBlend();

    if (d < 0.98) {
      const grad = ctx.createLinearGradient(0, 0, 0, safeH);
      if (this.awakeningBlend > 0.12) {
        grad.addColorStop(0, '#0d0c14');
        grad.addColorStop(0.55, '#1b1522');
        grad.addColorStop(1, '#0c0b10');
      } else {
        grad.addColorStop(0, pal.skyTop);
        grad.addColorStop(0.58, pal.skyMid);
        grad.addColorStop(1, pal.skyBottom);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, safeW, safeH);

      // Biome-specific Sky Landmarks (Blood Moon, Celestial Astrolabe, Aurora, Eclipse, Cyber Skyline, Rift)
      this.renderSkyLandmark(ctx, safeW, safeH);

      // Subtle atmospheric theme-colored radial spotlight in the center
      const spotCol =
        awakened || this.awakeningBlend > 0.15 ? safeThemeColor : pal.spotlightColor;
      const rad = ctx.createRadialGradient(
        safeW * 0.5,
        safeH * 0.44,
        30,
        safeW * 0.5,
        safeH * 0.44,
        safeW * 0.64
      );
      rad.addColorStop(0, colorWithAlpha(spotCol, awakened ? 0.20 : 0.12));
      rad.addColorStop(0.58, colorWithAlpha(spotCol, 0.04));
      rad.addColorStop(1, 'rgba(4, 6, 12, 0.54)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, safeW, safeH);

      // Volumetric slanted overhead arena god-rays & weather motes
      const normalFade = Math.max(0, 1 - d);
      if (normalFade > 0.02) {
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 3; i++) {
            const sway = Math.sin(this.time * 0.45 + i * 2.1) * 28;
            const topX = safeW * (0.2 + i * 0.3) + sway;
            const rayW = safeW * 0.11;
            const rayGrad = ctx.createLinearGradient(topX, 0, topX + 90, safeH * 0.85);
            rayGrad.addColorStop(
              0,
              awakened
                ? colorWithAlpha(safeThemeColor, 0.14 * normalFade)
                : colorWithAlpha(pal.spotlightColor, 0.095 * normalFade)
            );
            rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(topX - rayW * 0.4, 0);
            ctx.lineTo(topX + rayW * 0.4, 0);
            ctx.lineTo(topX + rayW * 1.15 + 70, safeH);
            ctx.lineTo(topX - rayW * 0.15 + 70, safeH);
            ctx.closePath();
            ctx.fill();
          }

          // Biome-specific Weather / Atmospheric Motes (Snow falling, Sakura petals, Desert wind, Rising embers)
          ctx.fillStyle = awakened ? safeThemeColor : pal.moteColor;
          const isSakuraPetal = this.stageTheme === 'crimson_dojo' && !awakened;
          for (const m of AMBIENT_MOTES) {
            let mx: number;
            let my: number;
            if (pal.moteMotion === 'fall') {
              mx = (((m.x + this.time * 0.02 + Math.sin(this.time * 0.9 + m.driftPhase) * 0.03) % 1 + 1) % 1) * safeW;
              my = (((m.y + this.time * m.speedY * 1.65) % 1 + 1) % 1) * safeH;
            } else if (pal.moteMotion === 'drift') {
              mx = (((m.x + this.time * m.speedY * 3.2) % 1 + 1) % 1) * safeW;
              my = (((m.y + Math.sin(this.time * 1.4 + m.driftPhase) * 0.04) % 1 + 1) % 1) * safeH;
            } else {
              mx = (((m.x + Math.sin(this.time * 0.5 + m.driftPhase) * 0.025 + 1) % 1)) * safeW;
              my = ((((m.y - this.time * m.speedY * 1.35) % 1) + 1) % 1) * safeH;
            }
            const twinkle = 0.55 + 0.45 * Math.sin(this.time * 2.8 + m.driftPhase);
            ctx.globalAlpha = m.alpha * twinkle * (awakened ? 1.25 : 1) * normalFade;

            if (isSakuraPetal) {
              // Stylized tilted sakura/crimson petal without per-mote save/restore
              const rot = this.time * 1.8 + m.driftPhase;
              ctx.beginPath();
              ctx.ellipse(mx, my, m.r * 2.1, m.r * 0.9, rot, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(mx, my, m.r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } finally {
          ctx.restore();
        }
      }
    }

    if (this.mirageDomainBlend > 0.02) {
      this.renderDomainScreenBackdrop(ctx, safeW, safeH, this.mirageDomainBlend);
    }

    if (this.chronoDomainBlend > 0.02) {
      this.renderChronoDomainScreenBackdrop(ctx, safeW, safeH, this.chronoDomainBlend);
    }

    if (this.xuanFengDomainBlend > 0.02) {
      this.renderXuanFengDomainScreenBackdrop(ctx, safeW, safeH, this.xuanFengDomainBlend);
    }

    if (this.crimsonFlash > 0.01) {
      ctx.save();
      try {
        ctx.globalAlpha = this.crimsonFlash * 0.28;
        ctx.fillStyle =
          this.xuanFengDomainBlend > 0.35
            ? '#5eead4'
            : this.chronoDomainBlend > 0.35
              ? '#f59e0b'
              : this.mirageDomainBlend > 0.35
                ? '#f43f5e'
                : safeThemeColor;
        ctx.fillRect(0, 0, safeW, safeH);
      } finally {
        ctx.restore();
      }
    }
  }

  /**
   * Ma Kính Hư Không Giới (Domain Expansion) Screen-Space Void Sky:
   * Obsidian void gradient, sharp polygonal dimensional cracks (#f43f5e / #38bdf8 / #f8fafc),
   * central fractured mirror singularity, and floating prismatic glass motes.
   */
  private renderDomainScreenBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    blend: number
  ): void {
    const safeBlend = Math.max(0, Math.min(1, finiteOr(blend, 0)));
    const cx = viewW * 0.5;
    const cy = viewH * 0.33;
    const baseR = Math.min(viewW, viewH) * 0.19;
    const diag = Math.hypot(viewW, viewH);

    ctx.save();
    try {
      ctx.globalAlpha = safeBlend;

      // 1. Deep Void-Obsidian Sky Gradient
      const voidSky = ctx.createLinearGradient(0, 0, 0, viewH);
      voidSky.addColorStop(0, '#04020a');
      voidSky.addColorStop(0.52, '#130618');
      voidSky.addColorStop(1, '#060c18');
      ctx.fillStyle = voidSky;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2. Crimson-Cyan Dimensional Void Core Glow
      const coreGlow = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, viewW * 0.58);
      coreGlow.addColorStop(0, colorWithAlpha('#f43f5e', 0.24));
      coreGlow.addColorStop(0.45, colorWithAlpha('#38bdf8', 0.12));
      coreGlow.addColorStop(1, 'rgba(3, 2, 8, 0)');
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, viewW, viewH);

      // 3. Sharp Polygonal Sky Fractures & Dimensional Cracks
      const crackCount = 14;
      for (let i = 0; i < crackCount; i++) {
        const ang = (i * Math.PI * 2) / crackCount + Math.sin(this.time * 0.2 + i) * 0.015;
        const reach = diag * (0.48 + (i % 3) * 0.11);
        const mid1R = reach * 0.34;
        const mid2R = reach * 0.68;
        const j1 = ((i % 2 === 0 ? 1 : -1) * 0.085);
        const j2 = ((i % 3 === 0 ? -1 : 1) * 0.065);

        const p1x = cx + Math.cos(ang + j1) * mid1R;
        const p1y = cy + Math.sin(ang + j1) * mid1R * 0.78;
        const p2x = cx + Math.cos(ang + j2) * mid2R;
        const p2y = cy + Math.sin(ang + j2) * mid2R * 0.78;
        const ex = cx + Math.cos(ang) * reach;
        const ey = cy + Math.sin(ang) * reach * 0.78;

        const isCrimson = i % 2 === 0;
        const edgeCol = isCrimson ? '#f43f5e' : '#38bdf8';

        // Outer beveled fracture tint
        ctx.strokeStyle = colorWithAlpha(edgeCol, 0.42);
        ctx.lineWidth = i % 3 === 0 ? 4.2 : 2.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Crisp silver-white inner dimensional tear
        ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.68);
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Branching polygonal sky shard offshoot
        if (i % 2 === 0) {
          const bAng = ang + (i % 4 === 0 ? 0.24 : -0.24);
          const bx = p1x + Math.cos(bAng) * (reach * 0.22);
          const by = p1y + Math.sin(bAng) * (reach * 0.18);
          ctx.fillStyle = colorWithAlpha(edgeCol, 0.11);
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(bx, by);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 4. Concentric Shattered Mirror Crest in Upper Sky
      for (let ring = 0; ring < 2; ring++) {
        const rr = baseR * (ring === 0 ? 0.85 : 1.38);
        const sides = ring === 0 ? 6 : 8;
        const rot = this.time * (ring === 0 ? 0.16 : -0.11);
        ctx.strokeStyle = colorWithAlpha(ring === 0 ? '#f43f5e' : '#38bdf8', 0.56);
        ctx.lineWidth = ring === 0 ? 2.4 : 1.8;
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const a = rot + (s * Math.PI * 2) / sides;
          const jitter = 0.88 + ((s * 5 + ring * 3) % 4) * 0.08;
          const vx = cx + Math.cos(a) * rr * jitter;
          const vy = cy + Math.sin(a) * rr * 0.78 * jitter;
          if (s === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }

      // Central Obsidian Mirror Diamond Seal
      ctx.fillStyle = 'rgba(5, 3, 12, 0.9)';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - baseR * 0.54);
      ctx.lineTo(cx + baseR * 0.38, cy);
      ctx.lineTo(cx, cy + baseR * 0.54);
      ctx.lineTo(cx - baseR * 0.38, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 5. Floating Prismatic Glass Motes
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < AMBIENT_MOTES.length; i++) {
          const m = AMBIENT_MOTES[i];
          const mx =
            (((m.x + Math.sin(this.time * 0.55 + m.driftPhase) * 0.03 + this.time * 0.012) % 1 + 1) % 1) *
            viewW;
          const my =
            (((m.y - this.time * m.speedY * 1.45) % 1 + 1) % 1) * viewH;
          const size = m.r * 2.2 + 1.5;
          const rot = this.time * 1.9 + m.driftPhase;
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          const twinkle = 0.45 + 0.55 * Math.sin(this.time * 3.1 + m.driftPhase);

          ctx.globalAlpha = safeBlend * m.alpha * twinkle * 1.35;
          ctx.fillStyle = i % 3 === 0 ? '#f43f5e' : i % 3 === 1 ? '#38bdf8' : '#f8fafc';

          ctx.beginPath();
          ctx.moveTo(mx + cosR * size, my + sinR * size);
          ctx.lineTo(mx - sinR * size * 0.5, my + cosR * size * 0.5);
          ctx.lineTo(mx - cosR * size, my - sinR * size);
          ctx.lineTo(mx + sinR * size * 0.5, my - cosR * size * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      } finally {
        ctx.restore();
      }
    } finally {
      ctx.restore();
    }
  }

  private drawClockGear(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    teeth: number,
    rot: number,
    strokeCol: string,
    fillCol: string,
    spokeCount = 6
  ): void {
    ctx.save();
    try {
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      const safeTeeth = Math.max(6, Math.floor(teeth));
      const step = (Math.PI * 2) / safeTeeth;
      ctx.beginPath();
      for (let i = 0; i < safeTeeth; i++) {
        const a0 = i * step;
        const a1 = a0 + step * 0.22;
        const a2 = a0 + step * 0.48;
        const a3 = a0 + step * 0.72;
        const rBase = outerR * 0.86;
        if (i === 0) {
          ctx.moveTo(Math.cos(a0) * rBase, Math.sin(a0) * rBase);
        } else {
          ctx.lineTo(Math.cos(a0) * rBase, Math.sin(a0) * rBase);
        }
        ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
        ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
        ctx.lineTo(Math.cos(a3) * rBase, Math.sin(a3) * rBase);
      }
      ctx.closePath();
      ctx.fillStyle = fillCol;
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Inner gear ring
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.stroke();

      // Mechanical spokes
      for (let s = 0; s < spokeCount; s++) {
        const sa = (s * Math.PI * 2) / spokeCount;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * (innerR * 0.28), Math.sin(sa) * (innerR * 0.28));
        ctx.lineTo(Math.cos(sa) * innerR, Math.sin(sa) * innerR);
        ctx.stroke();
      }

      // Hub
      ctx.beginPath();
      ctx.arc(0, 0, innerR * 0.26, 0, Math.PI * 2);
      ctx.stroke();
    } finally {
      ctx.restore();
    }
  }

  /**
   * Tháp Đồng Hồ Cổ Đại (Chrono Sovereign Domain Expansion) Screen-Space Clocktower Sky:
   * Deep antique bronze-midnight gradient, giant glowing Roman-numeral clockface (XII, III, VI, IX),
   * counter-rotating mechanical gears, and floating golden time-dust motes.
   */
  private renderChronoDomainScreenBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    blend: number
  ): void {
    const safeBlend = Math.max(0, Math.min(1, finiteOr(blend, 0)));
    const cx = viewW * 0.5;
    const cy = viewH * 0.34;
    const baseR = Math.min(viewW, viewH) * 0.24;

    ctx.save();
    try {
      ctx.globalAlpha = safeBlend;

      // 1. Deep Antique Bronze-Midnight Sky Gradient
      const chronoSky = ctx.createLinearGradient(0, 0, 0, viewH);
      chronoSky.addColorStop(0, '#04090c');
      chronoSky.addColorStop(0.5, '#0f161b');
      chronoSky.addColorStop(1, '#1a1206');
      ctx.fillStyle = chronoSky;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2. Warm Antique Gold & Azure Temporal Halo
      const skyGlow = ctx.createRadialGradient(cx, cy, baseR * 0.18, cx, cy, viewW * 0.62);
      skyGlow.addColorStop(0, colorWithAlpha('#f59e0b', 0.26));
      skyGlow.addColorStop(0.45, colorWithAlpha('#2dd4bf', 0.12));
      skyGlow.addColorStop(1, 'rgba(4, 8, 12, 0)');
      ctx.fillStyle = skyGlow;
      ctx.fillRect(0, 0, viewW, viewH);

      // 3. Flanking Counter-Rotating Sky Clockwork Gears
      this.drawClockGear(
        ctx,
        cx - baseR * 1.48,
        cy - baseR * 0.16,
        baseR * 0.72,
        baseR * 0.44,
        16,
        this.time * 0.22,
        colorWithAlpha('#f59e0b', 0.34),
        colorWithAlpha('#1c1408', 0.45),
        6
      );
      this.drawClockGear(
        ctx,
        cx + baseR * 1.48,
        cy + baseR * 0.12,
        baseR * 0.68,
        baseR * 0.42,
        14,
        -this.time * 0.28,
        colorWithAlpha('#38bdf8', 0.32),
        colorWithAlpha('#07131c', 0.45),
        6
      );

      // 4. Giant Glowing Roman-Numeral Clockface in the Sky
      this.drawClockGear(
        ctx,
        cx,
        cy,
        baseR * 1.24,
        baseR * 0.94,
        24,
        -this.time * 0.11,
        colorWithAlpha('#f59e0b', 0.48),
        'rgba(10, 8, 4, 0.72)',
        8
      );

      ctx.strokeStyle = colorWithAlpha('#fef08a', 0.72);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.94, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha('#2dd4bf', 0.62);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.68, 0, Math.PI * 2);
      ctx.stroke();

      // 12 radial ticks + cardinal Roman numerals (XII, III, VI, IX)
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12 - Math.PI * 0.5;
        const rIn = baseR * (i % 3 === 0 ? 0.74 : 0.82);
        const rOut = baseR * 0.92;
        ctx.strokeStyle = i % 3 === 0 ? '#fef08a' : colorWithAlpha('#f59e0b', 0.66);
        ctx.lineWidth = i % 3 === 0 ? 2.6 : 1.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
        ctx.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
        ctx.stroke();
      }

      const cardinals = [
        { label: 'XII', a: -Math.PI * 0.5 },
        { label: 'III', a: 0 },
        { label: 'VI', a: Math.PI * 0.5 },
        { label: 'IX', a: Math.PI },
      ];
      ctx.font = `900 ${Math.max(12, Math.round(baseR * 0.17))}px "Noto Serif JP", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const c of cardinals) {
        const tx = cx + Math.cos(c.a) * (baseR * 0.8);
        const ty = cy + Math.sin(c.a) * (baseR * 0.8);
        ctx.strokeStyle = '#070604';
        ctx.lineWidth = 3.2;
        ctx.strokeText(c.label, tx, ty);
        ctx.fillStyle = '#fef08a';
        ctx.fillText(c.label, tx, ty);
      }

      // Sweeping antique bronze & azure clock hands
      const hourAng = -Math.PI * 0.5 + this.time * 0.14;
      const minAng = -Math.PI * 0.5 - this.time * 0.52;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hourAng) * (baseR * 0.52), cy + Math.sin(hourAng) * (baseR * 0.52));
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(minAng) * (baseR * 0.78), cy + Math.sin(minAng) * (baseR * 0.78));
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Floating Golden Time-Dust Motes
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < AMBIENT_MOTES.length; i++) {
          const m = AMBIENT_MOTES[i];
          const mx =
            (((m.x + Math.sin(this.time * 0.42 + m.driftPhase) * 0.025 + this.time * 0.008) % 1 + 1) % 1) *
            viewW;
          const my =
            (((m.y - this.time * m.speedY * 1.1) % 1 + 1) % 1) * viewH;
          const twinkle = 0.45 + 0.55 * Math.sin(this.time * 2.6 + m.driftPhase);
          ctx.globalAlpha = safeBlend * m.alpha * twinkle * 1.35;
          ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 3 === 1 ? '#f59e0b' : '#2dd4bf';
          ctx.beginPath();
          ctx.arc(mx, my, m.r * 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      } finally {
        ctx.restore();
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Xuân Phong Văn Miếu (Xuan Feng Sage Domain Expansion) Screen-Space Literary Sky:
   * Deep ink-night gradient (#050c0f -> #0c1b1e -> #112220), swirling ink-wash clouds,
   * Giant Ink-Wash Sun-Moon & Classic Scripture Wheel (3 counter-rotating rings with 12 calligraphy glyphs),
   * outer fine light rays, and rising jade/pale-gold/peach-petal motes.
   */
  private renderXuanFengDomainScreenBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    blend: number
  ): void {
    const safeBlend = Math.max(0, Math.min(1, finiteOr(blend, 0)));
    const cx = viewW * 0.5;
    const cy = viewH * 0.34;
    const baseR = Math.min(viewW, viewH) * 0.24;

    ctx.save();
    try {
      ctx.globalAlpha = safeBlend;

      // 1. Deep Ink-Night Sky Gradient (#050c0f -> #0c1b1e -> #112220)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
      skyGrad.addColorStop(0, '#050c0f');
      skyGrad.addColorStop(0.52, '#0c1b1e');
      skyGrad.addColorStop(1, '#112220');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2. Luminous Jade-Teal & Pale-Gold Atmospheric Halo
      const skyGlow = ctx.createRadialGradient(cx, cy, baseR * 0.16, cx, cy, viewW * 0.64);
      skyGlow.addColorStop(0, colorWithAlpha('#5eead4', 0.24));
      skyGlow.addColorStop(0.38, colorWithAlpha('#fde68a', 0.11));
      skyGlow.addColorStop(0.7, colorWithAlpha('#2dd4bf', 0.06));
      skyGlow.addColorStop(1, 'rgba(5, 12, 15, 0)');
      ctx.fillStyle = skyGlow;
      ctx.fillRect(0, 0, viewW, viewH);

      // 2B. Distant Ink-Wash Mountain Silhouettes along Lower Horizon
      ctx.fillStyle = 'rgba(6, 16, 18, 0.86)';
      ctx.beginPath();
      ctx.moveTo(0, viewH);
      ctx.lineTo(0, viewH * 0.72);
      ctx.quadraticCurveTo(viewW * 0.14, viewH * 0.58, viewW * 0.28, viewH * 0.69);
      ctx.quadraticCurveTo(viewW * 0.44, viewH * 0.54, viewW * 0.58, viewH * 0.67);
      ctx.quadraticCurveTo(viewW * 0.76, viewH * 0.56, viewW * 0.9, viewH * 0.66);
      ctx.lineTo(viewW, viewH * 0.61);
      ctx.lineTo(viewW, viewH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = colorWithAlpha('#5eead4', 0.16);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, viewH * 0.72);
      ctx.quadraticCurveTo(viewW * 0.14, viewH * 0.58, viewW * 0.28, viewH * 0.69);
      ctx.quadraticCurveTo(viewW * 0.44, viewH * 0.54, viewW * 0.58, viewH * 0.67);
      ctx.quadraticCurveTo(viewW * 0.76, viewH * 0.56, viewW * 0.9, viewH * 0.66);
      ctx.lineTo(viewW, viewH * 0.61);
      ctx.stroke();

      // 2C. Swirling Ink-Wash Clouds across Upper & Mid Sky
      const cloudDrifts = [
        { y: viewH * 0.2, amp: 24, speed: 0.26, col: '#134e4a', alpha: 0.22, w: 26 },
        { y: viewH * 0.42, amp: 18, speed: -0.21, col: '#071112', alpha: 0.45, w: 34 },
        { y: viewH * 0.56, amp: 20, speed: 0.18, col: '#5eead4', alpha: 0.09, w: 14 },
      ];
      ctx.lineCap = 'round';
      for (let c = 0; c < cloudDrifts.length; c++) {
        const cd = cloudDrifts[c];
        const shift = Math.sin(this.time * cd.speed + c * 1.7) * 58;
        ctx.strokeStyle = colorWithAlpha(cd.col, cd.alpha);
        ctx.lineWidth = cd.w;
        ctx.beginPath();
        ctx.moveTo(-60, cd.y);
        ctx.bezierCurveTo(
          viewW * 0.25 + shift,
          cd.y - cd.amp,
          viewW * 0.48 - shift,
          cd.y + cd.amp,
          viewW * 0.72 + shift * 0.5,
          cd.y - cd.amp * 0.5
        );
        ctx.quadraticCurveTo(viewW * 0.88, cd.y + cd.amp * 0.6, viewW + 60, cd.y - 8);
        ctx.stroke();
      }

      // 3. Flanking Counter-Rotating Jade-Gold Literary Astrolabe Rings (mirroring Chrono flanking gears)
      for (const side of [-1, 1] as const) {
        const fx = cx + side * baseR * 1.48;
        const fy = cy + (side === -1 ? -baseR * 0.14 : baseR * 0.12);
        const fr = baseR * 0.58;
        ctx.save();
        try {
          ctx.translate(fx, fy);
          ctx.rotate(this.time * (side === -1 ? 0.16 : -0.19));
          ctx.strokeStyle = colorWithAlpha(side === -1 ? '#5eead4' : '#fde68a', 0.28);
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, fr, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#2dd4bf', 0.2);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, fr * 0.72, 0, Math.PI * 2);
          ctx.stroke();

          // 8 Confucian / Bagua octagonal ticks
          for (let k = 0; k < 8; k++) {
            const ka = (k * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ka) * (fr * 0.74), Math.sin(ka) * (fr * 0.74));
            ctx.lineTo(Math.cos(ka) * (fr * 0.96), Math.sin(ka) * (fr * 0.96));
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      }

      // 4. Giant Ink-Wash Sun-Moon & Classic Scripture Wheel (3 Counter-Rotating Concentric Rings)
      // 4A. Outer Ring: Fine Celestial Light Rays + Segmented Pale-Gold Halo
      ctx.save();
      try {
        ctx.translate(cx, cy);
        ctx.rotate(this.time * 0.055);
        const rayCount = 24;
        for (let i = 0; i < rayCount; i++) {
          const a = (i * Math.PI * 2) / rayCount;
          const rStart = baseR * 1.13;
          const rEnd = baseR * (i % 2 === 0 ? 1.56 : 1.36);
          ctx.strokeStyle =
            i % 2 === 0 ? colorWithAlpha('#5eead4', 0.34) : colorWithAlpha('#fde68a', 0.28);
          ctx.lineWidth = i % 4 === 0 ? 2.0 : 1.1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rStart, Math.sin(a) * rStart);
          ctx.lineTo(Math.cos(a) * rEnd, Math.sin(a) * rEnd);
          ctx.stroke();
        }

        ctx.strokeStyle = colorWithAlpha('#fde68a', 0.45);
        ctx.lineWidth = 1.6;
        ctx.setLineDash([18, 10, 6, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.22, 0, Math.PI * 2);
        ctx.stroke();
      } finally {
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 4B. Middle Ring: Classic Scripture Wheel with 12 Ancient Calligraphy Characters (counter-rotating)
      const scriptureGlyphs = ['春', '風', '靜', '禮', '義', '仁', '智', '信', '文', '雅', '清', '和'];
      ctx.save();
      try {
        ctx.translate(cx, cy);
        ctx.rotate(-this.time * 0.09);

        // Dark ink-jade ring band
        ctx.fillStyle = 'rgba(7, 17, 18, 0.74)';
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.12, 0, Math.PI * 2);
        ctx.arc(0, 0, baseR * 0.84, 0, Math.PI * 2, true);
        ctx.fill();

        ctx.strokeStyle = colorWithAlpha('#5eead4', 0.72);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#fde68a', 0.62);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 0.84, 0, Math.PI * 2);
        ctx.stroke();

        const glyphFontSize = Math.max(11, Math.round(baseR * 0.14));
        ctx.font = `900 ${glyphFontSize}px "Noto Serif JP", "Noto Serif TC", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < scriptureGlyphs.length; i++) {
          const a = (i * Math.PI * 2) / scriptureGlyphs.length - Math.PI * 0.5;
          const divA = a + Math.PI / scriptureGlyphs.length;

          // Divider tick between glyphs
          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.42);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(divA) * (baseR * 0.86), Math.sin(divA) * (baseR * 0.86));
          ctx.lineTo(Math.cos(divA) * (baseR * 1.1), Math.sin(divA) * (baseR * 1.1));
          ctx.stroke();

          const gx = Math.cos(a) * (baseR * 0.98);
          const gy = Math.sin(a) * (baseR * 0.98);
          ctx.save();
          try {
            ctx.translate(gx, gy);
            ctx.rotate(a + Math.PI * 0.5);
            ctx.strokeStyle = '#040a0c';
            ctx.lineWidth = 3.2;
            ctx.strokeText(scriptureGlyphs[i], 0, 0);
            ctx.fillStyle = i % 3 === 0 ? '#fde68a' : '#f0fdfa';
            ctx.fillText(scriptureGlyphs[i], 0, 0);
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }

      // 4C. Inner Ring: Thick-Thin Tapered Zen Enso Brush Stroke + Ink-Wash Sun-Moon Core
      ctx.save();
      try {
        ctx.translate(cx, cy);
        ctx.rotate(this.time * 0.14);

        // Luminous Sun-Moon disc behind Enso
        const moonGrad = ctx.createRadialGradient(-baseR * 0.12, -baseR * 0.12, baseR * 0.06, 0, 0, baseR * 0.62);
        moonGrad.addColorStop(0, 'rgba(240, 253, 250, 0.24)');
        moonGrad.addColorStop(0.5, 'rgba(94, 234, 212, 0.12)');
        moonGrad.addColorStop(0.85, 'rgba(253, 230, 138, 0.06)');
        moonGrad.addColorStop(1, 'rgba(7, 17, 18, 0)');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 0.64, 0, Math.PI * 2);
        ctx.fill();

        // Thick-thin tapered Enso brush stroke (open Zen brush arc)
        const ensoR = baseR * 0.66;
        const segments = 28;
        const startA = 0.28;
        const spanA = Math.PI * 1.78;
        ctx.lineCap = 'round';
        for (let s = 0; s < segments; s++) {
          const t0 = s / segments;
          const t1 = (s + 1) / segments;
          const a0 = startA + t0 * spanA;
          const a1 = startA + t1 * spanA;
          // Taper thickest in first third, thinning gracefully toward brush lift
          const taper = Math.sin(Math.pow(t0, 0.72) * Math.PI);
          const strokeW = 2.2 + taper * (baseR * 0.095);

          // Dark ink-wash bleed edge
          ctx.strokeStyle = colorWithAlpha('#071112', 0.85);
          ctx.lineWidth = strokeW + 4.0;
          ctx.beginPath();
          ctx.arc(0, 0, ensoR, a0, a1);
          ctx.stroke();

          // Jade-teal ink rim
          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.58 + taper * 0.28);
          ctx.lineWidth = strokeW + 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, ensoR, a0, a1);
          ctx.stroke();

          // Moonlight white core brush fiber
          ctx.strokeStyle = colorWithAlpha('#f0fdfa', 0.75 + taper * 0.22);
          ctx.lineWidth = Math.max(1.2, strokeW * 0.56);
          ctx.beginPath();
          ctx.arc(0, 0, ensoR, a0, a1);
          ctx.stroke();
        }

        // Subtle inner Sun-Moon crescent & cinnabar seal accent
        ctx.strokeStyle = colorWithAlpha('#fde68a', 0.42);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 0.44, -Math.PI * 0.7, Math.PI * 0.45);
        ctx.stroke();

        ctx.fillStyle = colorWithAlpha('#e11d48', 0.72);
        ctx.fillRect(baseR * 0.16, baseR * 0.12, baseR * 0.13, baseR * 0.13);
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(baseR * 0.16, baseR * 0.12, baseR * 0.13, baseR * 0.13);
      } finally {
        ctx.restore();
      }

      // 5. Rising Jade / Pale-Gold / Peach-Blossom Petal Motes
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < AMBIENT_MOTES.length; i++) {
          const m = AMBIENT_MOTES[i];
          const mx =
            (((m.x + Math.sin(this.time * 0.46 + m.driftPhase) * 0.032 + this.time * 0.009) % 1 + 1) % 1) *
            viewW;
          const my =
            (((m.y - this.time * m.speedY * 1.18) % 1 + 1) % 1) * viewH;
          const twinkle = 0.45 + 0.55 * Math.sin(this.time * 2.5 + m.driftPhase);
          ctx.globalAlpha = safeBlend * m.alpha * twinkle * 1.3;

          if (i % 4 === 0) {
            // Rising peach blossom petal mote
            const rot = this.time * 1.3 + m.driftPhase;
            ctx.fillStyle = '#fda4af';
            ctx.beginPath();
            ctx.ellipse(mx, my, m.r * 2.1, m.r * 1.0, rot, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = i % 3 === 0 ? '#fde68a' : i % 3 === 1 ? '#5eead4' : '#f0fdfa';
            ctx.beginPath();
            ctx.arc(mx, my, m.r * 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } finally {
        ctx.restore();
      }
    } finally {
      ctx.restore();
    }
  }

  private renderSkyLandmark(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    ctx.save();
    try {
      const cx = viewW * 0.52;
      const cy = viewH * 0.28;
      const baseR = Math.min(viewW, viewH) * 0.16;

      switch (this.stageTheme) {
        case 'crimson_dojo': {
          // Giant Crimson Blood Moon
          const halo = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, baseR * 2.2);
          halo.addColorStop(0, 'rgba(239, 68, 68, 0.34)');
          halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(220, 38, 38, 0.48)';
          ctx.beginPath();
          ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(254, 202, 202, 0.24)';
          ctx.beginPath();
          ctx.arc(cx - baseR * 0.15, cy - baseR * 0.12, baseR * 0.78, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'solar_observatory': {
          // Rotating Golden Celestial Astrolabe Rings
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.24)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 1.15, 0, Math.PI * 2);
          ctx.stroke();

          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.rotate(this.time * 0.18);
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.2)';
            ctx.beginPath();
            ctx.ellipse(0, 0, baseR * 1.65, baseR * 0.52, 0.35, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }

          ctx.fillStyle = 'rgba(251, 191, 36, 0.32)';
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 0.48, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'cryo_citadel': {
          // Shimmering Glacial Aurora Ribbons
          ctx.globalCompositeOperation = 'lighter';
          for (let b = 0; b < 2; b++) {
            ctx.strokeStyle = b === 0 ? 'rgba(34, 211, 238, 0.14)' : 'rgba(52, 211, 153, 0.11)';
            ctx.lineWidth = 28;
            ctx.beginPath();
            for (let x = 0; x <= viewW; x += 48) {
              const y = viewH * (0.18 + b * 0.08) + Math.sin(x * 0.006 + this.time * 0.7 + b * 2) * 22;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }
        case 'shadow_sanctum': {
          // Violet Solar Eclipse Corona
          const corona = ctx.createRadialGradient(cx, cy, baseR * 0.82, cx, cy, baseR * 1.95);
          corona.addColorStop(0, 'rgba(216, 180, 254, 0.55)');
          corona.addColorStop(0.35, 'rgba(168, 85, 247, 0.28)');
          corona.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.fillStyle = corona;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 1.95, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#070312';
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 0.84, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'magma_foundry': {
          // Horizon Volcanic Furnace Glow
          const furnace = ctx.createRadialGradient(
            viewW * 0.5,
            viewH * 0.82,
            20,
            viewW * 0.5,
            viewH * 0.82,
            viewW * 0.55
          );
          furnace.addColorStop(0, 'rgba(249, 115, 22, 0.34)');
          furnace.addColorStop(0.5, 'rgba(220, 38, 38, 0.14)');
          furnace.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = furnace;
          ctx.fillRect(0, 0, viewW, viewH);
          break;
        }
        case 'cyber_spire': {
          // Distant Synthwave Neon Cityscape Silhouette
          ctx.fillStyle = 'rgba(8, 7, 24, 0.55)';
          const heights = [0.28, 0.42, 0.34, 0.52, 0.38, 0.48, 0.3, 0.44, 0.36];
          const bW = viewW / heights.length;
          for (let i = 0; i < heights.length; i++) {
            const bh = viewH * heights[i];
            const bx = i * bW + 6;
            const by = viewH * 0.76 - bh;
            ctx.fillRect(bx, by, bW - 12, bh);
            ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 211, 238, 0.22)' : 'rgba(232, 121, 249, 0.22)';
            ctx.fillRect(bx + 6, by + 8, bW - 24, 3);
            ctx.fillStyle = 'rgba(8, 7, 24, 0.55)';
          }
          break;
        }
        case 'sovereign_throne': {
          // Cosmic Emerald-Violet Dimensional Rift
          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.rotate(this.time * 0.22);
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.26)';
            ctx.lineWidth = 3;
            ctx.strokeRect(-baseR * 0.9, -baseR * 0.9, baseR * 1.8, baseR * 1.8);
            ctx.rotate(Math.PI * 0.25);
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.26)';
            ctx.strokeRect(-baseR * 0.9, -baseR * 0.9, baseR * 1.8, baseR * 1.8);
          } finally {
            ctx.restore();
          }
          break;
        }
        case 'mecha_citadel': {
          // Giant Interlocking MechaReactor Cogwheel & Electric Plasma Core
          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.rotate(this.time * 0.25);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, baseR * 1.18, 0, Math.PI * 2);
            ctx.stroke();
            for (let t = 0; t < 12; t++) {
              const ang = (t / 12) * Math.PI * 2;
              ctx.save();
              try {
                ctx.rotate(ang);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
                ctx.fillRect(baseR * 1.15, -7, 18, 14);
              } finally {
                ctx.restore();
              }
            }
            ctx.rotate(-this.time * 0.65);
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.28)';
            ctx.setLineDash([16, 12]);
            ctx.beginPath();
            ctx.arc(0, 0, baseR * 0.78, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
          break;
        }
        case 'blood_shrine': {
          // Colossal Crimson Blood Moon & Cursed Shrine Clouds
          const bHalo = ctx.createRadialGradient(cx, cy, baseR * 0.45, cx, cy, baseR * 2.15);
          bHalo.addColorStop(0, 'rgba(244, 63, 94, 0.48)');
          bHalo.addColorStop(0.55, 'rgba(159, 18, 57, 0.2)');
          bHalo.addColorStop(1, 'rgba(159, 18, 57, 0)');
          ctx.fillStyle = bHalo;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 2.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(225, 29, 72, 0.72)';
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 1.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(15, 4, 9, 0.55)';
          ctx.fillRect(cx - baseR * 1.35, cy + baseR * 0.22, baseR * 2.7, 12);
          ctx.fillRect(cx - baseR * 0.95, cy - baseR * 0.36, baseR * 2.1, 8);
          break;
        }
        case 'mirage_oasis': {
          // Celestial Chrono-Hourglass & Golden Astrolabe Rings
          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.34)';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(-baseR * 0.62, -baseR * 0.85);
            ctx.lineTo(baseR * 0.62, -baseR * 0.85);
            ctx.lineTo(-baseR * 0.62, baseR * 0.85);
            ctx.lineTo(baseR * 0.62, baseR * 0.85);
            ctx.closePath();
            ctx.stroke();

            ctx.rotate(this.time * 0.32);
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, baseR * 1.55, baseR * 0.5, 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 0, baseR * 1.55, baseR * 0.5, -0.4, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
          break;
        }
        case 'chaos_abyss': {
          // Primordial Singularity Event-Horizon & Accretion Disk
          const cHalo = ctx.createRadialGradient(cx, cy, baseR * 0.75, cx, cy, baseR * 2.25);
          cHalo.addColorStop(0, 'rgba(249, 115, 22, 0.58)');
          cHalo.addColorStop(0.45, 'rgba(232, 121, 249, 0.26)');
          cHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = cHalo;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 2.25, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#050208';
          ctx.beginPath();
          ctx.arc(cx, cy, baseR * 0.86, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.78)';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.rotate(-this.time * 0.45);
            ctx.strokeStyle = 'rgba(240, 171, 252, 0.42)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, baseR * 1.75, baseR * 0.36, -0.22, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
          break;
        }
        default:
          break;
      }
    } finally {
      ctx.restore();
    }
  }

  public renderWorld(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    bossAccent: string | null,
    themeColor = '#a855f7'
  ): void {
    const px = finiteOr(playerX, ARENA_WIDTH * 0.5);
    const py = finiteOr(playerY, GROUND_Y);
    const validBossAccent =
      typeof bossAccent === 'string' && bossAccent.trim().length > 0 ? bossAccent : null;
    const safeThemeColor =
      typeof themeColor === 'string' && themeColor.trim().length > 0 ? themeColor : '#a855f7';
    const d = this.getDomainBlend();
    const stageAlpha = Math.max(0, 1 - d);

    ctx.save();
    try {
      const pal = STAGE_THEME_PALETTES[this.stageTheme] ?? STAGE_THEME_PALETTES.genesis_lab;

      const activeAccent =
        this.awakeningBlend > 0.25 ? safeThemeColor : validBossAccent ?? pal.spotlightColor;

      if (d < 0.98 && stageAlpha > 0.02) {
        ctx.save();
        try {
          ctx.globalAlpha = stageAlpha;

          // 0. Biome-Specific Parallax Architectural Pillars
          const parallaxOffset = (px - ARENA_WIDTH * 0.5) * 0.18;
          this.renderBiomePillars(
            ctx,
            pal.pillarStyle,
            pal.pillarColor,
            pal.pillarTrim,
            parallaxOffset,
            safeThemeColor
          );

          // 1. Clean Arena Wall Grid
          const gridSize = 68;
          ctx.strokeStyle =
            this.awakeningBlend > 0.25 ? colorWithAlpha(safeThemeColor, 0.13) : pal.gridColor;
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

          // 2. Full 18-Column Periodic Table of Chemical Elements (faded out during Domain Expansion)
          const tableAlpha = this.awakeningBlend * stageAlpha;
          if (this.awakeningBlend > 0.02 && d <= 0.9 && tableAlpha > 0.02) {
            this.renderPeriodicTable(ctx, px, py, tableAlpha, safeThemeColor);
          }

          // 3. Glowing Arena Edge Barrier Gates
          ctx.save();
          try {
            ctx.strokeStyle =
              this.awakeningBlend > 0.3 ? colorWithAlpha(safeThemeColor, 0.60) : pal.pillarTrim;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(26, 20);
            ctx.lineTo(26, GROUND_Y);
            ctx.moveTo(ARENA_WIDTH - 26, 20);
            ctx.lineTo(ARENA_WIDTH - 26, GROUND_Y);
            ctx.stroke();
          } finally {
            ctx.restore();
          }

          // 3B. Ink-Wash Mid-Ground Contrast Separation Band (isolates dark ink outlines & vermilion accents)
          this.renderCombatMistBand(ctx, pal.mistColor, pal.mistAlpha, safeThemeColor);

          // 4. Biome-Tinted Reflective Stage Floor Plane
          const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 320);
          if (this.awakeningBlend > 0.25) {
            floorGrad.addColorStop(0, '#1e1824');
            floorGrad.addColorStop(0.24, '#14111a');
            floorGrad.addColorStop(1, '#09080d');
          } else {
            floorGrad.addColorStop(0, pal.floorTop);
            floorGrad.addColorStop(0.24, pal.floorMid);
            floorGrad.addColorStop(1, pal.floorBottom);
          }
          ctx.fillStyle = floorGrad;
          ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);

          // 4B. 3D Perspective Floor Grid Lines
          ctx.save();
          try {
            ctx.strokeStyle =
              this.awakeningBlend > 0.25 ? colorWithAlpha(safeThemeColor, 0.165) : pal.gridColor;
            ctx.lineWidth = 1.2;
            const vanishX = px;
            ctx.beginPath();
            for (let fx = -200; fx <= ARENA_WIDTH + 200; fx += 96) {
              const bottomX = fx + (fx - vanishX) * 0.65;
              ctx.moveTo(fx, GROUND_Y);
              ctx.lineTo(bottomX, GROUND_Y + 280);
            }
            for (const fy of [16, 42, 82, 138, 210]) {
              ctx.moveTo(-500, GROUND_Y + fy);
              ctx.lineTo(ARENA_WIDTH + 500, GROUND_Y + fy);
            }
            ctx.stroke();
          } finally {
            ctx.restore();
          }

          // 4C. Dynamic Floor Light Pool reflecting player's aura onto the stage floor
          ctx.save();
          try {
            ctx.globalCompositeOperation = 'lighter';
            const poolR = this.awakeningBlend > 0.25 ? 240 : 160;
            const poolGrad = ctx.createRadialGradient(
              px,
              GROUND_Y + 8,
              8,
              px,
              GROUND_Y + 12,
              poolR
            );
            poolGrad.addColorStop(
              0,
              colorWithAlpha(activeAccent, this.awakeningBlend > 0.25 ? 0.24 : 0.14)
            );
            poolGrad.addColorStop(0.55, colorWithAlpha(activeAccent, 0.055));
            poolGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = poolGrad;
            ctx.beginPath();
            ctx.ellipse(px, GROUND_Y + 10, poolR, 36, 0, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }

          // 4D. Crisp Ink-Wash Ground Horizon Rim Stroke
          ctx.fillStyle = 'rgba(6, 7, 11, 0.78)';
          ctx.fillRect(-500, GROUND_Y - 2, ARENA_WIDTH + 1000, 6);
          ctx.fillStyle =
            this.awakeningBlend > 0.25
              ? colorWithAlpha(safeThemeColor, 0.62)
              : pal.horizonRimColor;
          ctx.fillRect(-500, GROUND_Y - 0.8, ARENA_WIDTH + 1000, 2.2);
          ctx.fillStyle = colorWithAlpha(pal.horizonRimColor, 0.30);
          ctx.fillRect(-500, GROUND_Y - 2.0, ARENA_WIDTH + 1000, 1.0);
        } finally {
          ctx.restore();
        }
      }

      // 5. Ma Kính Hư Không Giới (Mirage Domain Expansion) Arena World
      if (this.mirageDomainBlend > 0.02) {
        this.renderDomainWorld(ctx, px, py, this.mirageDomainBlend);
      }

      // 6. Tháp Đồng Hồ Cổ Đại (Chrono Sovereign Domain Expansion) Arena World
      if (this.chronoDomainBlend > 0.02) {
        this.renderChronoDomainWorld(ctx, px, py, this.chronoDomainBlend);
      }

      // 7. Xuân Phong Văn Miếu (Xuan Feng Sage Domain Expansion) Arena World
      if (this.xuanFengDomainBlend > 0.02) {
        this.renderXuanFengDomainWorld(ctx, px, py, this.xuanFengDomainBlend);
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Ma Kính Hư Không Giới (Domain Expansion) World-Space Arena:
   * - Floating black-red-cyan obsidian mirror monoliths (slow parallax drift + beveled ink-wash faces)
   * - Shattered reflective glass floor plane (polygonal fracture tiles, mirrored floor reflections, crimson-cyan horizon rim)
   * - Floating prismatic glass shards in the air
   */
  private renderDomainWorld(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    blend: number
  ): void {
    const safeBlend = Math.max(0, Math.min(1, finiteOr(blend, 0)));
    const px = finiteOr(playerX, ARENA_WIDTH * 0.5);
    const py = finiteOr(playerY, GROUND_Y);

    ctx.save();
    try {
      ctx.globalAlpha = safeBlend;

      // 1. Floating Black-Red-Cyan Obsidian Mirror Monoliths (slow parallax drift + beveled ink-wash faces)
      const monolithSpecs = [
        { baseX: -80, topY: 36, h: 350, w: 46, depth: 0.14, seed: 0.4 },
        { baseX: 165, topY: 72, h: 300, w: 38, depth: 0.20, seed: 1.3 },
        { baseX: 430, topY: 18, h: 360, w: 50, depth: 0.12, seed: 2.1 },
        { baseX: 710, topY: 64, h: 310, w: 40, depth: 0.22, seed: 3.0 },
        { baseX: 980, topY: 26, h: 355, w: 48, depth: 0.15, seed: 3.9 },
        { baseX: 1250, topY: 68, h: 305, w: 40, depth: 0.21, seed: 4.8 },
        { baseX: 1520, topY: 34, h: 345, w: 46, depth: 0.13, seed: 5.7 },
        { baseX: 1740, topY: 78, h: 295, w: 38, depth: 0.19, seed: 6.4 },
      ];

      for (let i = 0; i < monolithSpecs.length; i++) {
        const m = monolithSpecs[i];
        const driftX = (px - ARENA_WIDTH * 0.5) * m.depth + Math.sin(this.time * 0.35 + m.seed) * 10;
        const hoverY = Math.sin(this.time * 1.15 + m.seed) * 14;
        const mx = m.baseX + driftX;
        const my = m.topY + hoverY;
        const hw = m.w;
        const hh = m.h * 0.5;
        const cy = my + hh;
        const primaryEdge = i % 2 === 0 ? '#f43f5e' : '#38bdf8';
        const secondaryEdge = i % 2 === 0 ? '#38bdf8' : '#f43f5e';

        // Left beveled obsidian-crimson/cyan face
        ctx.fillStyle = '#07040e';
        ctx.beginPath();
        ctx.moveTo(mx, cy - hh);
        ctx.lineTo(mx + hw, cy - hh * 0.62);
        ctx.lineTo(mx + hw * 0.86, cy + hh * 0.68);
        ctx.lineTo(mx, cy + hh);
        ctx.lineTo(mx - hw * 0.86, cy + hh * 0.68);
        ctx.lineTo(mx - hw, cy - hh * 0.62);
        ctx.closePath();
        ctx.fill();

        // Diagonal ink-wash lit half-facet
        ctx.fillStyle = i % 2 === 0 ? colorWithAlpha('#f43f5e', 0.16) : colorWithAlpha('#38bdf8', 0.16);
        ctx.beginPath();
        ctx.moveTo(mx, cy - hh);
        ctx.lineTo(mx + hw, cy - hh * 0.62);
        ctx.lineTo(mx + hw * 0.86, cy + hh * 0.68);
        ctx.lineTo(mx, cy + hh);
        ctx.closePath();
        ctx.fill();

        // Crisp ink-wash outer outline
        ctx.strokeStyle = '#030206';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(mx, cy - hh);
        ctx.lineTo(mx + hw, cy - hh * 0.62);
        ctx.lineTo(mx + hw * 0.86, cy + hh * 0.68);
        ctx.lineTo(mx, cy + hh);
        ctx.lineTo(mx - hw * 0.86, cy + hh * 0.68);
        ctx.lineTo(mx - hw, cy - hh * 0.62);
        ctx.closePath();
        ctx.stroke();

        // Crimson & Cyan beveled prism rim strokes
        ctx.strokeStyle = colorWithAlpha(primaryEdge, 0.72);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(mx, cy - hh);
        ctx.lineTo(mx + hw, cy - hh * 0.62);
        ctx.lineTo(mx + hw * 0.86, cy + hh * 0.68);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha(secondaryEdge, 0.56);
        ctx.beginPath();
        ctx.moveTo(mx, cy - hh);
        ctx.lineTo(mx - hw, cy - hh * 0.62);
        ctx.lineTo(mx - hw * 0.86, cy + hh * 0.68);
        ctx.stroke();

        // Inner mirror fracture line & specular glint
        ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.42);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(mx - hw * 0.48, cy - hh * 0.36);
        ctx.lineTo(mx + hw * 0.42, cy + hh * 0.18);
        ctx.moveTo(mx, cy - hh * 0.78);
        ctx.lineTo(mx, cy + hh * 0.78);
        ctx.stroke();
      }

      // 2. Domain Edge Barrier Gates (Crimson & Cyan Void Pillars)
      ctx.save();
      try {
        ctx.strokeStyle = colorWithAlpha('#f43f5e', 0.72);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(26, 20);
        ctx.lineTo(26, GROUND_Y);
        ctx.moveTo(ARENA_WIDTH - 26, 20);
        ctx.lineTo(ARENA_WIDTH - 26, GROUND_Y);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#38bdf8', 0.55);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(31, 28);
        ctx.lineTo(31, GROUND_Y);
        ctx.moveTo(ARENA_WIDTH - 31, 28);
        ctx.lineTo(ARENA_WIDTH - 31, GROUND_Y);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // 3. Ink-Wash Contrast Band behind fighters for razor-sharp readability
      this.renderCombatMistBand(ctx, '#1e1b2e', 0.24, '#f43f5e');

      // 4. Shattered Reflective Glass Floor Plane
      const glassFloorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 360);
      glassFloorGrad.addColorStop(0, '#12081c');
      glassFloorGrad.addColorStop(0.22, '#080510');
      glassFloorGrad.addColorStop(1, '#020105');
      ctx.fillStyle = glassFloorGrad;
      ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);

      // Polygonal fracture tiles across the reflective glass floor
      const vanishX = px;
      const rowYs = [0, 22, 56, 108, 182, 275];
      for (let r = 0; r < rowYs.length - 1; r++) {
        const y0 = GROUND_Y + rowYs[r];
        const y1 = GROUND_Y + rowYs[r + 1];
        const spread0 = 0.08 * r;
        const spread1 = 0.08 * (r + 1);
        for (let fx = -240; fx <= ARENA_WIDTH + 240; fx += 120) {
          const skew = ((fx / 120 + r) % 2 === 0 ? 18 : -16);
          const tx0 = fx + (fx - vanishX) * spread0;
          const tx1 = fx + 120 + (fx + 120 - vanishX) * spread0;
          const bx0 = fx + skew + (fx - vanishX) * spread1;
          const bx1 = fx + 120 + skew + (fx + 120 - vanishX) * spread1;

          const tileType = Math.abs(Math.round(fx / 120) + r * 3) % 5;
          if (tileType === 0) {
            ctx.fillStyle = colorWithAlpha('#f43f5e', 0.095);
          } else if (tileType === 2) {
            ctx.fillStyle = colorWithAlpha('#38bdf8', 0.095);
          } else if (tileType === 4) {
            ctx.fillStyle = colorWithAlpha('#f8fafc', 0.045);
          } else {
            ctx.fillStyle = 'rgba(6, 4, 14, 0.42)';
          }

          ctx.beginPath();
          ctx.moveTo(tx0, y0);
          ctx.lineTo(tx1, y0);
          ctx.lineTo(bx1, y1);
          ctx.lineTo(bx0, y1);
          ctx.closePath();
          ctx.fill();

          // Diagonal shatter split line inside each glass tile
          ctx.strokeStyle =
            tileType % 2 === 0
              ? colorWithAlpha('#38bdf8', 0.22)
              : colorWithAlpha('#f43f5e', 0.22);
          ctx.lineWidth = 1.1;
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.14);
          ctx.beginPath();
          ctx.moveTo(tx0, y0);
          ctx.lineTo(bx1, y1);
          ctx.stroke();
        }
      }

      // Mirrored floor reflections from monoliths & player energy pool
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < monolithSpecs.length; i++) {
          const m = monolithSpecs[i];
          const mx = m.baseX + (px - ARENA_WIDTH * 0.5) * m.depth;
          const refCol = i % 2 === 0 ? '#f43f5e' : '#38bdf8';
          const refGrad = ctx.createLinearGradient(mx, GROUND_Y, mx, GROUND_Y + 170);
          refGrad.addColorStop(0, colorWithAlpha(refCol, 0.22));
          refGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = refGrad;
          ctx.beginPath();
          ctx.moveTo(mx - m.w * 0.65, GROUND_Y + 2);
          ctx.lineTo(mx + m.w * 0.65, GROUND_Y + 2);
          ctx.lineTo(mx + m.w * 1.15, GROUND_Y + 170);
          ctx.lineTo(mx - m.w * 1.15, GROUND_Y + 170);
          ctx.closePath();
          ctx.fill();
        }

        // Player mirrored void-prism light pool
        const playerRef = ctx.createRadialGradient(
          px,
          GROUND_Y + 14,
          10,
          px,
          GROUND_Y + 18,
          240
        );
        playerRef.addColorStop(0, colorWithAlpha('#f8fafc', 0.22));
        playerRef.addColorStop(0.35, colorWithAlpha('#f43f5e', 0.18));
        playerRef.addColorStop(0.7, colorWithAlpha('#38bdf8', 0.10));
        playerRef.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = playerRef;
        ctx.beginPath();
        ctx.ellipse(px, GROUND_Y + 14, 240, 42, 0, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }

      // Crimson-Cyan Horizon Rim Stroke along GROUND_Y
      ctx.fillStyle = 'rgba(4, 2, 10, 0.9)';
      ctx.fillRect(-500, GROUND_Y - 2.5, ARENA_WIDTH + 1000, 7);
      ctx.fillStyle = colorWithAlpha('#f43f5e', 0.78);
      ctx.fillRect(-500, GROUND_Y - 1.2, ARENA_WIDTH + 1000, 2.2);
      ctx.fillStyle = colorWithAlpha('#38bdf8', 0.68);
      ctx.fillRect(-500, GROUND_Y + 1.0, ARENA_WIDTH + 1000, 1.5);
      ctx.fillStyle = colorWithAlpha('#f8fafc', 0.55);
      ctx.fillRect(-500, GROUND_Y - 2.2, ARENA_WIDTH + 1000, 1.0);

      // 5. Floating Glass Shards in the Air (mid-ground beveled diamond/triangle prisms)
      for (let i = 0; i < 18; i++) {
        const sx =
          ((i * 113 + 70 + Math.sin(this.time * 0.55 + i * 1.4) * 28) % (ARENA_WIDTH + 160)) - 80;
        const sy =
          85 + ((i * 67) % Math.max(120, GROUND_Y - 135)) + Math.cos(this.time * 1.35 + i * 2.1) * 16;
        const size = 9 + (i % 4) * 4.5;
        const rot = this.time * (i % 2 === 0 ? 0.9 : -0.75) + i * 0.8;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);

        const tipX = sx + cosR * size * 1.4;
        const tipY = sy + sinR * size * 1.4;
        const rightX = sx - sinR * size * 0.65;
        const rightY = sy + cosR * size * 0.65;
        const tailX = sx - cosR * size * 1.1;
        const tailY = sy - sinR * size * 1.1;
        const leftX = sx + sinR * size * 0.55;
        const leftY = sy - cosR * size * 0.55;

        // Check player vertical proximity only gently so shards don't distract
        const nearPlayer = Math.hypot(sx - px, sy - (py - 50)) < 110;
        const shardAlpha = safeBlend * (nearPlayer ? 0.35 : 0.78);

        ctx.save();
        try {
          ctx.globalAlpha = shardAlpha;
          ctx.fillStyle = 'rgba(8, 5, 18, 0.85)';
          ctx.strokeStyle = i % 3 === 0 ? '#f43f5e' : i % 3 === 1 ? '#38bdf8' : '#f8fafc';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(rightX, rightY);
          ctx.lineTo(tailX, tailY);
          ctx.lineTo(leftX, leftY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Inner prismatic facet highlight
          ctx.fillStyle =
            i % 2 === 0 ? colorWithAlpha('#f43f5e', 0.38) : colorWithAlpha('#38bdf8', 0.38);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(rightX, rightY);
          ctx.lineTo(tailX, tailY);
          ctx.closePath();
          ctx.fill();
        } finally {
          ctx.restore();
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Tháp Đồng Hồ Cổ Đại (Chrono Sovereign Domain Expansion) World-Space Arena:
   * - Giant slow-turning background mechanical clockwork gears
   * - Ancient clocktower bronze-stone architectural pillars with arched gothic clockwork trim
   * - Reflective antique brass-teal floor dial with concentric perspective clockwork rings
   * - Floating golden time-dust motes & drifting miniature cogs
   */
  private renderChronoDomainWorld(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    blend: number
  ): void {
    const safeBlend = Math.max(0, Math.min(1, finiteOr(blend, 0)));
    const px = finiteOr(playerX, ARENA_WIDTH * 0.5);
    const py = finiteOr(playerY, GROUND_Y);

    ctx.save();
    try {
      ctx.globalAlpha = safeBlend;

      // 1. Giant Slow-Turning Background Clockwork Gears
      const parallaxSlow = (px - ARENA_WIDTH * 0.5) * 0.1;
      const bgGears = [
        { x: 260, y: GROUND_Y - 210, r: 155, inner: 102, teeth: 20, speed: 0.14, col: '#f59e0b' },
        { x: ARENA_WIDTH * 0.5, y: GROUND_Y - 255, r: 195, inner: 132, teeth: 24, speed: -0.1, col: '#2dd4bf' },
        { x: ARENA_WIDTH - 260, y: GROUND_Y - 205, r: 150, inner: 98, teeth: 18, speed: 0.16, col: '#38bdf8' },
      ];
      for (const g of bgGears) {
        this.drawClockGear(
          ctx,
          g.x + parallaxSlow,
          g.y,
          g.r,
          g.inner,
          g.teeth,
          this.time * g.speed,
          colorWithAlpha(g.col, 0.34),
          colorWithAlpha('#0d0b07', 0.52),
          8
        );
      }

      // 2. Ancient Clocktower Architectural Bronze-Stone Pillars
      const parallax = (px - ARENA_WIDTH * 0.5) * 0.18;
      const pillarXs = [-90, 210, 520, 840, 1160, 1480, 1790];
      for (let i = 0; i < pillarXs.length; i++) {
        const x = pillarXs[i] + parallax;
        const w = i % 2 === 0 ? 58 : 46;
        const topY = i % 2 === 0 ? -120 : -60;
        const h = GROUND_Y - topY;

        // Pillar stone/bronze column body
        const colGrad = ctx.createLinearGradient(x - w * 0.5, 0, x + w * 0.5, 0);
        colGrad.addColorStop(0, '#0a0805');
        colGrad.addColorStop(0.5, '#1d160b');
        colGrad.addColorStop(1, '#080705');
        ctx.fillStyle = colGrad;
        ctx.fillRect(x - w * 0.5, topY, w, h);

        ctx.strokeStyle = '#050403';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - w * 0.5, topY, w, h);

        // Antique brass & teal trim ribs
        const trimCol = i % 2 === 0 ? '#f59e0b' : '#2dd4bf';
        ctx.strokeStyle = colorWithAlpha(trimCol, 0.56);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.32, topY + 20);
        ctx.lineTo(x - w * 0.32, GROUND_Y - 14);
        ctx.moveTo(x + w * 0.32, topY + 20);
        ctx.lineTo(x + w * 0.32, GROUND_Y - 14);
        ctx.stroke();

        // Pointed clocktower window arch & miniature dial emblem
        ctx.fillStyle = colorWithAlpha(trimCol, 0.12);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.28, GROUND_Y - 110);
        ctx.lineTo(x - w * 0.28, GROUND_Y - 220);
        ctx.lineTo(x, GROUND_Y - 255);
        ctx.lineTo(x + w * 0.28, GROUND_Y - 220);
        ctx.lineTo(x + w * 0.28, GROUND_Y - 110);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colorWithAlpha('#fef08a', 0.42);
        ctx.stroke();

        // Pedestal base
        ctx.fillStyle = '#120e07';
        ctx.fillRect(x - w * 0.65, GROUND_Y - 18, w * 1.3, 18);
        ctx.strokeStyle = colorWithAlpha('#f59e0b', 0.55);
        ctx.strokeRect(x - w * 0.65, GROUND_Y - 18, w * 1.3, 18);
      }

      // 3. Chrono Edge Barrier Gates (Antique Brass & Azure)
      ctx.save();
      try {
        ctx.strokeStyle = colorWithAlpha('#f59e0b', 0.72);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(26, 20);
        ctx.lineTo(26, GROUND_Y);
        ctx.moveTo(ARENA_WIDTH - 26, 20);
        ctx.lineTo(ARENA_WIDTH - 26, GROUND_Y);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#2dd4bf', 0.55);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(31, 28);
        ctx.lineTo(31, GROUND_Y);
        ctx.moveTo(ARENA_WIDTH - 31, 28);
        ctx.lineTo(ARENA_WIDTH - 31, GROUND_Y);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // 4. Ink-Wash Contrast Band behind fighters
      this.renderCombatMistBand(ctx, '#0f172a', 0.24, '#f59e0b');

      // 5. Reflective Antique Brass-Teal Clockwork Floor Dial Plane
      const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 360);
      floorGrad.addColorStop(0, '#161108');
      floorGrad.addColorStop(0.24, '#0b0e12');
      floorGrad.addColorStop(1, '#030406');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);

      // Perspective brass-teal floor dial rings & radial spokes
      const centerDialX = ARENA_WIDTH * 0.5;
      const dialRadii = [190, 340, 520, 740];
      for (let r = 0; r < dialRadii.length; r++) {
        const rad = dialRadii[r];
        ctx.strokeStyle =
          r % 2 === 0 ? colorWithAlpha('#f59e0b', 0.26) : colorWithAlpha('#2dd4bf', 0.22);
        ctx.lineWidth = r % 2 === 0 ? 2.0 : 1.4;
        ctx.beginPath();
        ctx.ellipse(centerDialX, GROUND_Y + 62, rad, rad * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 12 radial perspective clock lines across floor
      ctx.strokeStyle = colorWithAlpha('#f59e0b', 0.18);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12 + this.time * 0.04;
        ctx.moveTo(centerDialX + Math.cos(a) * 140, GROUND_Y + 62 + Math.sin(a) * 30);
        ctx.lineTo(centerDialX + Math.cos(a) * 860, GROUND_Y + 62 + Math.sin(a) * 190);
      }
      ctx.stroke();

      // Player reflective antique gold-teal pool on floor
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const playerRef = ctx.createRadialGradient(px, GROUND_Y + 14, 10, px, GROUND_Y + 18, 240);
        playerRef.addColorStop(0, colorWithAlpha('#fef08a', 0.2));
        playerRef.addColorStop(0.38, colorWithAlpha('#f59e0b', 0.16));
        playerRef.addColorStop(0.72, colorWithAlpha('#2dd4bf', 0.1));
        playerRef.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = playerRef;
        ctx.beginPath();
        ctx.ellipse(px, GROUND_Y + 14, 240, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }

      // Antique Bronze-Gold & Teal Horizon Rim Strokes along GROUND_Y
      ctx.fillStyle = 'rgba(6, 5, 3, 0.9)';
      ctx.fillRect(-500, GROUND_Y - 2.5, ARENA_WIDTH + 1000, 7);
      ctx.fillStyle = colorWithAlpha('#f59e0b', 0.8);
      ctx.fillRect(-500, GROUND_Y - 1.2, ARENA_WIDTH + 1000, 2.2);
      ctx.fillStyle = colorWithAlpha('#2dd4bf', 0.65);
      ctx.fillRect(-500, GROUND_Y + 1.0, ARENA_WIDTH + 1000, 1.5);
      ctx.fillStyle = colorWithAlpha('#fef08a', 0.55);
      ctx.fillRect(-500, GROUND_Y - 2.2, ARENA_WIDTH + 1000, 1.0);

      // 6. Floating Golden Time-Dust Motes & Miniature Drifting Cogs
      for (let i = 0; i < 16; i++) {
        const sx =
          ((i * 127 + 60 + Math.sin(this.time * 0.45 + i * 1.2) * 24) % (ARENA_WIDTH + 140)) - 70;
        const sy =
          80 + ((i * 71) % Math.max(120, GROUND_Y - 140)) + Math.cos(this.time * 1.15 + i * 1.9) * 14;
        const nearPlayer = Math.hypot(sx - px, sy - (py - 50)) < 110;
        const moteAlpha = safeBlend * (nearPlayer ? 0.32 : 0.76);

        ctx.save();
        try {
          ctx.globalAlpha = moteAlpha;
          if (i % 4 === 0) {
            this.drawClockGear(
              ctx,
              sx,
              sy,
              11 + (i % 3) * 3,
              6 + (i % 3) * 1.5,
              8,
              this.time * (i % 2 === 0 ? 0.9 : -0.8) + i,
              '#f59e0b',
              'rgba(18, 13, 6, 0.8)',
              4
            );
          } else {
            ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#2dd4bf';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.4 + (i % 3) * 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        } finally {
          ctx.restore();
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Xuân Phong Văn Miếu (Xuan Feng Sage Domain Expansion) World-Space Arena:
   * - Distant rotating ink-jade literary halos & temple eaves
   * - Symmetrical Jade Scholar Pillars & Vertical Hanging Calligraphy Scrolls framing the arena
   * - Bamboo branches and peach blossom petals drifting with depth parallax
   * - Reflective ink-jade floor with 3D perspective Heaven-Earth formation ring (3 rings, 12 Earthly Branches, rotating radials)
   */
  private renderXuanFengDomainWorld(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    blend: number
  ): void {
    const safeBlend = Math.max(0, Math.min(1, finiteOr(blend, 0)));
    const px = finiteOr(playerX, ARENA_WIDTH * 0.5);
    const py = finiteOr(playerY, GROUND_Y);

    ctx.save();
    try {
      ctx.globalAlpha = safeBlend;

      // 1. Slow-Parallax Background Literary Halos & Temple Silhouettes
      const parallaxSlow = (px - ARENA_WIDTH * 0.5) * 0.1;
      const bgHalos = [
        { x: 260, y: GROUND_Y - 220, r: 145, speed: 0.08, col: '#5eead4' },
        { x: ARENA_WIDTH * 0.5, y: GROUND_Y - 265, r: 185, speed: -0.06, col: '#fde68a' },
        { x: ARENA_WIDTH - 260, y: GROUND_Y - 215, r: 140, speed: 0.09, col: '#2dd4bf' },
      ];
      for (const h of bgHalos) {
        ctx.save();
        try {
          ctx.translate(h.x + parallaxSlow, h.y);
          ctx.rotate(this.time * h.speed);
          ctx.strokeStyle = colorWithAlpha(h.col, 0.22);
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, h.r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#f0fdfa', 0.14);
          ctx.lineWidth = 1.2;
          ctx.setLineDash([16, 12]);
          ctx.beginPath();
          ctx.arc(0, 0, h.r * 0.78, 0, Math.PI * 2);
          ctx.stroke();

          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (h.r * 0.78), Math.sin(a) * (h.r * 0.78));
            ctx.lineTo(Math.cos(a) * h.r, Math.sin(a) * h.r);
            ctx.stroke();
          }
        } finally {
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // 2. Symmetrical Jade Scholar Pillars & Vertical Hanging Calligraphy Scrolls
      const parallax = (px - ARENA_WIDTH * 0.5) * 0.18;
      const pillarXs = [-90, 210, 520, 840, 1160, 1480, 1790];
      const scrollTexts: Record<number, string[]> = {
        1: ['春', '風', '化', '雨'],
        3: ['文', '雅', '清', '和'],
        5: ['一', '氣', '浩', '然'],
      };

      for (let i = 0; i < pillarXs.length; i++) {
        const x = pillarXs[i] + parallax;
        const isScroll = i === 1 || i === 3 || i === 5;

        if (isScroll) {
          // Vertical Hanging Calligraphy Scroll suspended from jade-gold crossbeam
          const scrollW = i === 3 ? 62 : 52;
          const scrollTop = i === 3 ? -85 : -55;
          const scrollBot = GROUND_Y - 72;
          const scrollH = scrollBot - scrollTop;

          // Suspension cord & jade beam
          ctx.strokeStyle = colorWithAlpha('#fde68a', 0.52);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - scrollW * 0.35, scrollTop - 40);
          ctx.lineTo(x, scrollTop - 58);
          ctx.lineTo(x + scrollW * 0.35, scrollTop - 40);
          ctx.stroke();

          // Silk backing & dark ink-jade parchment
          const scrollGrad = ctx.createLinearGradient(x - scrollW * 0.5, 0, x + scrollW * 0.5, 0);
          scrollGrad.addColorStop(0, '#071112');
          scrollGrad.addColorStop(0.5, '#0f2526');
          scrollGrad.addColorStop(1, '#071112');
          ctx.fillStyle = scrollGrad;
          ctx.fillRect(x - scrollW * 0.5, scrollTop, scrollW, scrollH);

          // Jade & pale-gold border frame
          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.55);
          ctx.lineWidth = 2.0;
          ctx.strokeRect(x - scrollW * 0.5, scrollTop, scrollW, scrollH);
          ctx.strokeStyle = colorWithAlpha('#fde68a', 0.36);
          ctx.lineWidth = 1.0;
          ctx.strokeRect(x - scrollW * 0.38, scrollTop + 14, scrollW * 0.76, scrollH - 28);

          // Top & bottom wooden/jade scroll rollers with gold endcaps
          for (const ry of [scrollTop, scrollBot]) {
            ctx.fillStyle = '#132a2c';
            ctx.fillRect(x - scrollW * 0.68, ry - 5, scrollW * 1.36, 10);
            ctx.strokeStyle = colorWithAlpha('#fde68a', 0.65);
            ctx.lineWidth = 1.4;
            ctx.strokeRect(x - scrollW * 0.68, ry - 5, scrollW * 1.36, 10);
          }

          // Vertical Calligraphy Glyphs
          const chars = scrollTexts[i] ?? ['春', '風', '靜', '和'];
          ctx.font = `900 ${i === 3 ? 24 : 20}px "Noto Serif JP", "Noto Serif TC", Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (let c = 0; c < chars.length; c++) {
            const cyPos = scrollTop + 62 + c * 58;
            ctx.strokeStyle = '#040a0c';
            ctx.lineWidth = 3;
            ctx.strokeText(chars[c], x, cyPos);
            ctx.fillStyle = c === 0 ? '#fde68a' : '#f0fdfa';
            ctx.fillText(chars[c], x, cyPos);
          }

          // Tiny cinnabar seal stamp at bottom of scroll
          ctx.fillStyle = colorWithAlpha('#e11d48', 0.78);
          ctx.fillRect(x - 7, scrollBot - 34, 14, 14);
          ctx.strokeStyle = '#fda4af';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 7, scrollBot - 34, 14, 14);
        } else {
          // Jade Scholar Stone Pillar
          const w = i === 0 || i === 6 ? 60 : 48;
          const topY = i === 0 || i === 6 ? -125 : -75;
          const h = GROUND_Y - topY;

          const colGrad = ctx.createLinearGradient(x - w * 0.5, 0, x + w * 0.5, 0);
          colGrad.addColorStop(0, '#050d0e');
          colGrad.addColorStop(0.5, '#112728');
          colGrad.addColorStop(1, '#040a0b');
          ctx.fillStyle = colGrad;
          ctx.fillRect(x - w * 0.5, topY, w, h);

          ctx.strokeStyle = '#030809';
          ctx.lineWidth = 3;
          ctx.strokeRect(x - w * 0.5, topY, w, h);

          // Jade & Pale-Gold Vertical Trim Ribs
          const trimCol = i === 0 || i === 6 ? '#5eead4' : '#fde68a';
          ctx.strokeStyle = colorWithAlpha(trimCol, 0.55);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(x - w * 0.32, topY + 24);
          ctx.lineTo(x - w * 0.32, GROUND_Y - 18);
          ctx.moveTo(x + w * 0.32, topY + 24);
          ctx.lineTo(x + w * 0.32, GROUND_Y - 18);
          ctx.stroke();

          // Carved Temple Window Niche & Jade Lattice Emblem
          ctx.fillStyle = colorWithAlpha('#5eead4', 0.11);
          ctx.beginPath();
          ctx.moveTo(x - w * 0.26, GROUND_Y - 108);
          ctx.lineTo(x - w * 0.26, GROUND_Y - 216);
          ctx.quadraticCurveTo(x, GROUND_Y - 248, x + w * 0.26, GROUND_Y - 216);
          ctx.lineTo(x + w * 0.26, GROUND_Y - 108);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = colorWithAlpha('#fde68a', 0.42);
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Flared Temple Capital & Stepped Pedestal Base
          ctx.fillStyle = '#0b191b';
          ctx.fillRect(x - w * 0.68, GROUND_Y - 18, w * 1.36, 18);
          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.58);
          ctx.strokeRect(x - w * 0.68, GROUND_Y - 18, w * 1.36, 18);
        }
      }

      // 2B. Symmetrical Framing Bamboo Branches along Upper Left & Right Arena Edges
      const bambooClusters = [
        { baseX: -40 + parallax * 1.1, dir: 1 },
        { baseX: ARENA_WIDTH + 40 + parallax * 1.1, dir: -1 },
      ];
      for (const bc of bambooClusters) {
        for (let b = 0; b < 2; b++) {
          const sway = Math.sin(this.time * 1.1 + b * 1.5 + bc.dir) * 8;
          const startX = bc.baseX + bc.dir * (b * 42);
          const startY = -40;
          const midX = startX + bc.dir * (95 + b * 32) + sway * 0.5;
          const midY = 125 + b * 28;
          const tipX = midX + bc.dir * (105 + b * 20) + sway;
          const tipY = 230 + b * 36;

          ctx.strokeStyle = colorWithAlpha('#134e4a', 0.72);
          ctx.lineWidth = 5 - b;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(midX, midY, tipX, tipY);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.42);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(midX, midY, tipX, tipY);
          ctx.stroke();

          // Bamboo leaf clusters along branch
          for (let lf = 0; lf < 4; lf++) {
            const lx = midX + (tipX - midX) * (lf * 0.28 + 0.12);
            const ly = midY + (tipY - midY) * (lf * 0.28 + 0.12);
            for (let k = -1; k <= 1; k++) {
              const ang = (bc.dir > 0 ? 0.45 : Math.PI - 0.45) + k * 0.36 + sway * 0.012;
              ctx.save();
              try {
                ctx.translate(lx, ly);
                ctx.rotate(ang);
                ctx.fillStyle = lf % 2 === 0 ? colorWithAlpha('#5eead4', 0.45) : colorWithAlpha('#2dd4bf', 0.38);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(14, -3.6, 26, 0);
                ctx.quadraticCurveTo(14, 3.6, 0, 0);
                ctx.closePath();
                ctx.fill();
              } finally {
                ctx.restore();
              }
            }
          }
        }
      }

      // 3. Xuan Feng Edge Barrier Gates (Jade Teal & Pale Gold)
      ctx.save();
      try {
        ctx.strokeStyle = colorWithAlpha('#5eead4', 0.72);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(26, 20);
        ctx.lineTo(26, GROUND_Y);
        ctx.moveTo(ARENA_WIDTH - 26, 20);
        ctx.lineTo(ARENA_WIDTH - 26, GROUND_Y);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#fde68a', 0.55);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(31, 28);
        ctx.lineTo(31, GROUND_Y);
        ctx.moveTo(ARENA_WIDTH - 31, 28);
        ctx.lineTo(ARENA_WIDTH - 31, GROUND_Y);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // 4. Ink-Wash Contrast Band behind fighters
      this.renderCombatMistBand(ctx, '#071112', 0.25, '#5eead4');

      // 5. Reflective Ink-Jade Floor Plane & 3D Perspective Heaven-Earth Formation Ring
      const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 360);
      floorGrad.addColorStop(0, '#0d1e20');
      floorGrad.addColorStop(0.24, '#071214');
      floorGrad.addColorStop(1, '#030708');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(-500, GROUND_Y, ARENA_WIDTH + 1000, 420);

      // 3D Perspective Floor Ring (GROUND_Y + 62): 3 concentric rings + 12 Earthly Branches + rotating radials
      const centerDialX = ARENA_WIDTH * 0.5;
      const centerDialY = GROUND_Y + 62;
      const dialRadii = [220, 440, 690];
      for (let r = 0; r < dialRadii.length; r++) {
        const rad = dialRadii[r];
        ctx.strokeStyle =
          r === 1 ? colorWithAlpha('#fde68a', 0.28) : colorWithAlpha('#5eead4', 0.30);
        ctx.lineWidth = r === 0 ? 2.2 : r === 1 ? 1.8 : 1.5;
        ctx.beginPath();
        ctx.ellipse(centerDialX, centerDialY, rad, rad * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Slowly rotating 12 radial lines & 12 Earthly Branches / Confucian tick marks
      const floorRot = this.time * 0.035;
      ctx.strokeStyle = colorWithAlpha('#5eead4', 0.20);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12 + floorRot;
        ctx.moveTo(centerDialX + Math.cos(a) * 140, centerDialY + Math.sin(a) * 30);
        ctx.lineTo(centerDialX + Math.cos(a) * 760, centerDialY + Math.sin(a) * 167);
      }
      ctx.stroke();

      // 12 Earthly Branch tick marks & subtle perspective glyphs along the middle-outer band
      const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      ctx.font = '700 13px "Noto Serif JP", "Noto Serif TC", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12 + floorRot;
        const tInX = centerDialX + Math.cos(a) * 410;
        const tInY = centerDialY + Math.sin(a) * 90;
        const tOutX = centerDialX + Math.cos(a) * 465;
        const tOutY = centerDialY + Math.sin(a) * 102;
        ctx.strokeStyle = colorWithAlpha('#fde68a', 0.42);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tInX, tInY);
        ctx.lineTo(tOutX, tOutY);
        ctx.stroke();

        const gx = centerDialX + Math.cos(a) * 535;
        const gy = centerDialY + Math.sin(a) * 118;
        ctx.fillStyle = colorWithAlpha(i % 2 === 0 ? '#fde68a' : '#5eead4', 0.36);
        ctx.fillText(earthlyBranches[i], gx, gy);
      }

      // Player reflective moonlight-jade-gold pool on floor
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const playerRef = ctx.createRadialGradient(px, GROUND_Y + 14, 10, px, GROUND_Y + 18, 240);
        playerRef.addColorStop(0, colorWithAlpha('#f0fdfa', 0.2));
        playerRef.addColorStop(0.38, colorWithAlpha('#5eead4', 0.16));
        playerRef.addColorStop(0.72, colorWithAlpha('#fde68a', 0.09));
        playerRef.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = playerRef;
        ctx.beginPath();
        ctx.ellipse(px, GROUND_Y + 14, 240, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }

      // Ink-Jade & Pale-Gold Horizon Rim Strokes along GROUND_Y
      ctx.fillStyle = 'rgba(4, 10, 11, 0.9)';
      ctx.fillRect(-500, GROUND_Y - 2.5, ARENA_WIDTH + 1000, 7);
      ctx.fillStyle = colorWithAlpha('#5eead4', 0.82);
      ctx.fillRect(-500, GROUND_Y - 1.2, ARENA_WIDTH + 1000, 2.2);
      ctx.fillStyle = colorWithAlpha('#fde68a', 0.58);
      ctx.fillRect(-500, GROUND_Y + 1.0, ARENA_WIDTH + 1000, 1.4);
      ctx.fillStyle = colorWithAlpha('#f0fdfa', 0.52);
      ctx.fillRect(-500, GROUND_Y - 2.2, ARENA_WIDTH + 1000, 1.0);

      // 6. Depth-Parallax Drifting Peach Blossom Petals, Bamboo Leaves & Jade/Gold Motes
      for (let i = 0; i < 18; i++) {
        const depthScale = 0.75 + (i % 3) * 0.25;
        const sx =
          (((i * 127 + 60 + this.time * (18 * depthScale) + Math.sin(this.time * 0.55 + i * 1.2) * 28) %
            (ARENA_WIDTH + 140)) +
            (ARENA_WIDTH + 140)) %
            (ARENA_WIDTH + 140) -
          70;
        const sy =
          (((70 + i * 59 + this.time * (16 * depthScale)) % Math.max(120, GROUND_Y - 40)) +
            Math.max(120, GROUND_Y - 40)) %
            Math.max(120, GROUND_Y - 40) +
          Math.cos(this.time * 1.2 + i * 1.9) * 12;
        const nearPlayer = Math.hypot(sx - px, sy - (py - 50)) < 110;
        const moteAlpha = safeBlend * (nearPlayer ? 0.32 : 0.76);

        ctx.save();
        try {
          ctx.globalAlpha = moteAlpha;
          ctx.translate(sx, sy);
          ctx.rotate(this.time * (i % 2 === 0 ? 1.15 : -0.95) + i * 0.9);
          if (i % 3 === 0) {
            // Peach blossom petal
            ctx.fillStyle = '#fda4af';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6.2 * depthScale, 3.1 * depthScale, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (i % 3 === 1) {
            // Jade bamboo leaf
            const len = 8.5 * depthScale;
            ctx.fillStyle = '#5eead4';
            ctx.beginPath();
            ctx.moveTo(-len, 0);
            ctx.quadraticCurveTo(0, -2.6 * depthScale, len, 0);
            ctx.quadraticCurveTo(0, 2.6 * depthScale, -len, 0);
            ctx.closePath();
            ctx.fill();
          } else {
            // Pale-gold / moonlight mote
            ctx.fillStyle = i % 2 === 0 ? '#fde68a' : '#f0fdfa';
            ctx.beginPath();
            ctx.arc(0, 0, 2.3 + (i % 3) * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        } finally {
          ctx.restore();
        }
      }
    } finally {
      ctx.restore();
    }
  }

  private renderCombatMistBand(
    ctx: CanvasRenderingContext2D,
    mistColor: string,
    mistAlpha: number,
    themeColor: string
  ): void {
    const bandTop = GROUND_Y - 215;
    const bandHeight = 215;
    const safeAlpha = Math.max(0.12, Math.min(0.4, finiteOr(mistAlpha, 0.22)));
    const mistBase = this.awakeningBlend > 0.25 ? '#cbd5e1' : mistColor;

    ctx.save();
    try {
      const mistGrad = ctx.createLinearGradient(0, bandTop, 0, GROUND_Y);
      mistGrad.addColorStop(0, colorWithAlpha(mistBase, 0));
      mistGrad.addColorStop(0.38, colorWithAlpha(mistBase, safeAlpha * 0.45));
      mistGrad.addColorStop(0.82, colorWithAlpha(mistBase, safeAlpha));
      mistGrad.addColorStop(1, colorWithAlpha(mistBase, safeAlpha * 0.88));
      ctx.fillStyle = mistGrad;
      ctx.fillRect(-500, bandTop, ARENA_WIDTH + 1000, bandHeight);

      // Subtle horizontal sumi-e mist ribbons for figure-ground separation behind fighters
      const drift1 = Math.sin(this.time * 0.35) * 42;
      const drift2 = Math.cos(this.time * 0.28) * 36;
      const ribbonTint = this.awakeningBlend > 0.25 ? themeColor : mistBase;

      ctx.lineCap = 'round';
      ctx.strokeStyle = colorWithAlpha(ribbonTint, safeAlpha * 0.24);
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(-240, GROUND_Y - 108);
      ctx.quadraticCurveTo(
        ARENA_WIDTH * 0.3 + drift1,
        GROUND_Y - 128,
        ARENA_WIDTH * 0.65,
        GROUND_Y - 96
      );
      ctx.quadraticCurveTo(
        ARENA_WIDTH * 0.88 - drift1,
        GROUND_Y - 82,
        ARENA_WIDTH + 240,
        GROUND_Y - 104
      );
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha(mistBase, safeAlpha * 0.28);
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-240, GROUND_Y - 42);
      ctx.quadraticCurveTo(
        ARENA_WIDTH * 0.35 - drift2,
        GROUND_Y - 56,
        ARENA_WIDTH * 0.7,
        GROUND_Y - 38
      );
      ctx.quadraticCurveTo(
        ARENA_WIDTH * 0.9 + drift2,
        GROUND_Y - 28,
        ARENA_WIDTH + 240,
        GROUND_Y - 44
      );
      ctx.stroke();
    } finally {
      ctx.restore();
    }
  }

  private renderBiomePillars(
    ctx: CanvasRenderingContext2D,
    style: string,
    pillarColor: string,
    trimColor: string,
    parallaxOffset: number,
    themeColor: string
  ): void {
    const activeTrim =
      this.awakeningBlend > 0.25 ? colorWithAlpha(themeColor, 0.27) : trimColor;

    for (let px = -120; px <= ARENA_WIDTH + 160; px += 280) {
      const x = px + parallaxOffset;

      if (style === 'ice_spire') {
        // Jagged Crystalline Ice Monoliths
        ctx.fillStyle = pillarColor;
        ctx.beginPath();
        ctx.moveTo(x - 38, GROUND_Y);
        ctx.lineTo(x - 18, 90);
        ctx.lineTo(x + 4, 20);
        ctx.lineTo(x + 24, 130);
        ctx.lineTo(x + 40, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = activeTrim;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (style === 'torii') {
        // Japanese Crimson Torii Columns & Lintels
        ctx.fillStyle = pillarColor;
        ctx.fillRect(x - 42, 120, 14, GROUND_Y - 120);
        ctx.fillRect(x + 28, 120, 14, GROUND_Y - 120);
        ctx.fillRect(x - 62, 108, 124, 14);
        ctx.fillRect(x - 50, 142, 100, 9);
        ctx.fillStyle = activeTrim;
        ctx.fillRect(x - 62, 106, 124, 3);
      } else if (style === 'obelisk') {
        // Tapered Desert Obelisks
        ctx.fillStyle = pillarColor;
        ctx.beginPath();
        ctx.moveTo(x - 30, GROUND_Y);
        ctx.lineTo(x - 16, 85);
        ctx.lineTo(x, 48);
        ctx.lineTo(x + 16, 85);
        ctx.lineTo(x + 30, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = activeTrim;
        ctx.fillRect(x - 2, 95, 4, GROUND_Y - 120);
      } else if (style === 'monolith') {
        // Floating Cosmic Rune Slabs
        const hoverY = Math.sin(this.time * 1.8 + px * 0.01) * 18;
        ctx.fillStyle = pillarColor;
        ctx.fillRect(x - 22, 90 + hoverY, 44, 290);
        ctx.strokeStyle = activeTrim;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 22, 90 + hoverY, 44, 290);
        ctx.fillStyle = activeTrim;
        ctx.fillRect(x - 3, 130 + hoverY, 6, 210);
      } else if (style === 'gothic_arch') {
        // Gothic Cathedral Columns & Pointed Arches
        ctx.fillStyle = pillarColor;
        ctx.fillRect(x - 22, 40, 44, GROUND_Y - 40);
        ctx.strokeStyle = activeTrim;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x - 20, GROUND_Y);
        ctx.lineTo(x - 20, 140);
        ctx.lineTo(x, 82);
        ctx.lineTo(x + 20, 140);
        ctx.lineTo(x + 20, GROUND_Y);
        ctx.stroke();
      } else {
        // Default / Lab / Reactor / Cyber Tower
        ctx.fillStyle = pillarColor;
        ctx.fillRect(x - 24, -180, 48, GROUND_Y + 180);
        ctx.fillStyle = activeTrim;
        ctx.fillRect(x - 2.5, -160, 5, GROUND_Y + 140);
        if (style === 'reactor' || style === 'cyber_tower') {
          for (let ry = 80; ry < GROUND_Y - 40; ry += 88) {
            ctx.fillRect(x - 18, ry, 36, 4);
          }
        }
        ctx.fillStyle = 'rgba(12, 16, 28, 0.76)';
        ctx.fillRect(x - 34, GROUND_Y - 18, 68, 18);
      }
    }
  }

  private getStaticTablePlate(): HTMLCanvasElement | null {
    if (this.staticTableCanvas) return this.staticTableCanvas;
    if (this.staticTableFailed) return null;
    if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
      return null;
    }
    try {
      const canvas = document.createElement('canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        this.staticTableFailed = true;
        return null;
      }
      canvas.width = Math.ceil(TABLE_W + TABLE_PLATE_PAD * 2);
      canvas.height = Math.ceil(TABLE_H + TABLE_PLATE_PAD * 2);
      const offCtx = canvas.getContext('2d');
      if (!offCtx) {
        this.staticTableFailed = true;
        return null;
      }

      offCtx.font = '800 15px "Barlow Condensed", sans-serif';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.lineWidth = 1.2;

      for (const el of PERIODIC_ELEMENTS) {
        if (el.featured) continue;
        const cx = TABLE_PLATE_PAD + el.col * (TABLE_CELL_W + TABLE_CELL_GAP);
        const cy = TABLE_PLATE_PAD + el.row * (TABLE_CELL_H + TABLE_CELL_GAP);
        offCtx.fillStyle = 'rgba(15, 16, 24, 0.72)';
        offCtx.strokeStyle = 'rgba(226, 232, 240, 0.24)';
        offCtx.fillRect(cx, cy, TABLE_CELL_W, TABLE_CELL_H);
        offCtx.strokeRect(cx, cy, TABLE_CELL_W, TABLE_CELL_H);
        offCtx.fillStyle = 'rgba(241, 245, 249, 0.56)';
        offCtx.fillText(el.symbol, cx + TABLE_CELL_W * 0.5, cy + TABLE_CELL_H * 0.5 + 2);
      }

      this.staticTableCanvas = canvas;
      return canvas;
    } catch {
      this.staticTableFailed = true;
      return null;
    }
  }

  private renderPeriodicTable(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    alpha: number,
    themeColor: string
  ): void {
    const safeAlpha = Math.max(0, Math.min(1, finiteOr(alpha, 1)));
    ctx.save();
    try {
      const originX = ARENA_WIDTH * 0.5 - TABLE_W * 0.5;
      const originY = GROUND_Y - 372;

      const featuredCenters: Array<{ x: number; y: number; symbol: string }> = [];
      const settled = this.tableDropTimer >= 0.82;
      const staticPlate = settled ? this.getStaticTablePlate() : null;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (staticPlate) {
        ctx.globalAlpha = safeAlpha * 0.48;
        ctx.drawImage(staticPlate, originX - TABLE_PLATE_PAD, originY - TABLE_PLATE_PAD);
      }

      for (const el of PERIODIC_ELEMENTS) {
        if (staticPlate && !el.featured) {
          continue;
        }

        const targetX = originX + el.col * (TABLE_CELL_W + TABLE_CELL_GAP);
        const targetY = originY + el.row * (TABLE_CELL_H + TABLE_CELL_GAP);

        const startDelay = el.dropSeed * 0.35;
        const dropP = settled
          ? 1
          : Math.max(0, Math.min(1, (this.tableDropTimer - startDelay) / 0.45));
        const easeOut = settled ? 1 : 1 - Math.pow(1 - dropP, 3);
        const dropOffsetY = settled ? 0 : (1 - easeOut) * (-240 - el.row * 25);
        const tilt = settled ? 0 : (1 - easeOut) * ((el.dropSeed - 0.5) * 1.4);

        const x = targetX;
        const y = targetY + dropOffsetY;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 5.5 + el.num * 0.6);

        const cellAlpha = safeAlpha * Math.min(1, dropP * 1.4) * (el.featured ? 0.78 : 0.48);

        if (el.featured) {
          featuredCenters.push({
            x: targetX + TABLE_CELL_W * 0.5,
            y: targetY + TABLE_CELL_H * 0.5,
            symbol: el.symbol,
          });
        }

        const fillCol = el.featured
          ? colorWithAlpha(themeColor, 0.24 + pulse * 0.22)
          : 'rgba(15, 16, 24, 0.72)';
        const strokeCol = el.featured ? themeColor : 'rgba(226, 232, 240, 0.24)';
        const lineW = el.featured ? 2.2 : 1.2;
        const fontStr = `800 ${el.featured ? 18 : 15}px "Barlow Condensed", sans-serif`;
        const textCol = el.featured ? '#ffffff' : 'rgba(241, 245, 249, 0.56)';

        if (Math.abs(tilt) > 0.005) {
          ctx.save();
          try {
            ctx.globalAlpha = cellAlpha;
            ctx.translate(x + TABLE_CELL_W * 0.5, y + TABLE_CELL_H * 0.5);
            ctx.rotate(tilt);
            ctx.fillStyle = fillCol;
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = lineW;
            ctx.fillRect(-TABLE_CELL_W * 0.5, -TABLE_CELL_H * 0.5, TABLE_CELL_W, TABLE_CELL_H);
            ctx.strokeRect(-TABLE_CELL_W * 0.5, -TABLE_CELL_H * 0.5, TABLE_CELL_W, TABLE_CELL_H);
            ctx.font = fontStr;
            ctx.fillStyle = textCol;
            ctx.fillText(el.symbol, 0, 2);
          } finally {
            ctx.restore();
          }
        } else {
          ctx.globalAlpha = cellAlpha;
          ctx.fillStyle = fillCol;
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = lineW;
          ctx.fillRect(x, y, TABLE_CELL_W, TABLE_CELL_H);
          ctx.strokeRect(x, y, TABLE_CELL_W, TABLE_CELL_H);
          ctx.font = fontStr;
          ctx.fillStyle = textCol;
          ctx.fillText(el.symbol, x + TABLE_CELL_W * 0.5, y + TABLE_CELL_H * 0.5 + 2);
        }
      }

      if (this.tableDropTimer > 0.4) {
        const targetY = playerY - 58;
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < featuredCenters.length; i++) {
            const c = featuredCenters[i];
            const beamPulse = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 6 + i * 1.3));
            ctx.globalAlpha = safeAlpha * 0.38 * beamPulse;
            ctx.strokeStyle = i % 2 === 0 ? themeColor : '#ffffff';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            const steps = 4;
            for (let s = 1; s < steps; s++) {
              const frac = s / steps;
              const jx = Math.sin(this.time * 24 + i * 7 + s * 3) * 14;
              const jy = Math.cos(this.time * 20 + i * 5 + s * 2) * 14;
              ctx.lineTo(
                c.x + (playerX - c.x) * frac + jx,
                c.y + (targetY - c.y) * frac + jy
              );
            }
            ctx.lineTo(playerX, targetY);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      }
    } finally {
      ctx.restore();
    }
  }
}
