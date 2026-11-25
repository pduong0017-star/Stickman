import type { AudioEngine } from './AudioEngine';
import type { Camera } from './Camera';
import type { CharacterId } from './types';
import { getUltimateStyleId } from './animation';

export interface CutsceneTheme {
  characterId?: CharacterId;
  kanji: string;
  primaryColor: string;
  secondaryColor: string;
  bannerTitle: string;
}

export interface CutsceneCallbacks {
  onKanjiImpact: () => void;
  onComplete: () => void;
}

interface RadialSlash {
  angle: number;
  delay: number;
  width: number;
}

interface OmniCutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  width: number;
}

const DEFAULT_THEME: CutsceneTheme = {
  characterId: 'kuro',
  kanji: '断',
  primaryColor: '#dc2626',
  secondaryColor: '#fde68a',
  bannerTitle: 'SCARLET SHEATH · 断',
};

export class UltimateCutscene {
  public active = false;
  public timer = 0;
  public readonly duration = 2.7;

  private slashes: RadialSlash[] = [];
  private omniCuts: OmniCutLine[] = [];
  private sheathClicked = false;
  private kanjiDropped = false;
  private callbacks: CutsceneCallbacks | null = null;
  private theme: CutsceneTheme = DEFAULT_THEME;

  public start(callbacks: CutsceneCallbacks, audio: AudioEngine, theme?: CutsceneTheme): void {
    this.active = true;
    this.timer = 0;
    this.sheathClicked = false;
    this.kanjiDropped = false;
    this.callbacks = callbacks;
    this.theme = theme ?? DEFAULT_THEME;

    this.slashes = [];
    for (let i = 0; i < 32; i++) {
      this.slashes.push({
        angle: (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.14,
        delay: i * 0.012,
        width: 4 + Math.random() * 5,
      });
    }

    this.omniCuts = [];
    for (let i = 0; i < 16; i++) {
      const horiz = i % 2 === 0;
      const a = 0.08 + ((i * 37) % 84) / 100;
      const b = 0.08 + (((i + 5) * 53) % 84) / 100;
      this.omniCuts.push({
        x1: horiz ? 0 : a,
        y1: horiz ? a : 0,
        x2: horiz ? 1 : b,
        y2: horiz ? b : 1,
        delay: 0.45 + i * 0.055,
        width: 3 + (i % 3) * 2.2,
      });
    }

    audio.playSlash(3, true);
  }

  public isSilhouettePhase(): boolean {
    const style = getUltimateStyleId(this.theme.characterId ?? 'kuro');
    if (style !== 'scarlet_sheath') {
      return this.active && this.timer >= 1.55 && this.timer < 1.92;
    }
    return this.active && this.timer >= 1.32 && this.timer < 1.85;
  }

  public isWhiteFlashPhase(): boolean {
    return this.active && this.timer >= 1.85 && this.timer < 2.18;
  }

  public update(dt: number, audio: AudioEngine, camera: Camera): void {
    if (!this.active) return;
    const prev = this.timer;
    this.timer += dt;
    const style = getUltimateStyleId(this.theme.characterId ?? 'kuro');

    if (prev < 0.18 && this.timer >= 0.18) {
      if (style === 'volt_judgment') audio.playLaser();
      else audio.playSlash(2, true);
    }
    if (prev < 0.42 && this.timer >= 0.42) {
      if (style === 'solar_inferno') audio.playCryoShatter();
      else audio.playSlash(1, true);
    }
    if (prev < 0.72 && this.timer >= 0.72) {
      if (style === 'volt_judgment') audio.playLaser();
      else audio.playParry();
      camera.addShake(0.45, 1, -0.4);
    }
    if (prev < 1.15 && this.timer >= 1.15) {
      if (style === 'phantom_eclipse') audio.playSlash(4, true);
      else if (style === 'volt_judgment') audio.playCryoShatter();
      camera.addShake(0.48, -0.7, 0.7);
    }

    // Climax beat right before Kanji drop
    if (!this.sheathClicked && this.timer >= 1.86) {
      this.sheathClicked = true;
      if (style === 'scarlet_sheath') {
        audio.playSheathClick();
      } else if (style === 'volt_judgment') {
        audio.playLaser();
      } else if (style === 'solar_inferno') {
        audio.playCryoShatter();
      } else {
        audio.playParry();
      }
      camera.addShake(0.45, 0, 1);
    }

    // Giant brush-ink Kanji stamp + execution damage!
    if (!this.kanjiDropped && this.timer >= 2.18) {
      this.kanjiDropped = true;
      audio.playKanjiDrop();
      camera.addShake(0.95, 0, 1);
      this.callbacks?.onKanjiImpact();
    }

    if (this.timer >= this.duration) {
      this.active = false;
      this.callbacks?.onComplete();
    }
  }

  public renderScreen(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    if (!this.active) return;
    const style = getUltimateStyleId(this.theme.characterId ?? 'kuro');

    ctx.save();
    if (style === 'volt_judgment') {
      this.renderVoltJudgment(ctx, viewW, viewH);
    } else if (style === 'solar_inferno') {
      this.renderSolarInferno(ctx, viewW, viewH);
    } else if (style === 'phantom_eclipse') {
      this.renderPhantomEclipse(ctx, viewW, viewH);
    } else {
      this.renderScarletSheath(ctx, viewW, viewH);
    }

    // Crisp Anime Top-Left Ultimate Banner
    ctx.fillStyle = 'rgba(12, 15, 22, 0.9)';
    ctx.fillRect(16, 14, 248, 30);
    ctx.strokeStyle = this.theme.primaryColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 14, 248, 30);

    ctx.font = 'italic 800 17px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.theme.bannerTitle, 28, 29);

    ctx.restore();
  }

  /**
   * KURO — SCARLET SHEATH · 断 (Dimension Sever + Concentric Crimson Eye + Sheath Click)
   */
  private renderScarletSheath(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const primary = this.theme.primaryColor;
    const secondary = this.theme.secondaryColor;

    if (t < 0.5) {
      ctx.fillStyle = '#070508';
      ctx.fillRect(0, 0, viewW, viewH);
      for (const s of this.slashes) {
        if (t < s.delay) continue;
        const p = Math.min(1, (t - s.delay) / 0.12);
        const len = Math.max(viewW, viewH) * p * 0.72;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(s.angle);
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(len * 0.65, -s.width * 0.55);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.65, s.width * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(len * 0.88, 0);
        ctx.stroke();
        ctx.restore();
      }
    } else if (t < 0.85) {
      const p = (t - 0.5) / 0.35;
      ctx.fillStyle = '#0a0709';
      ctx.fillRect(0, 0, viewW, viewH);
      const circleR = Math.min(viewW, viewH) * 0.32;
      const split = Math.min(1, p * 1.4) * 14;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.28);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(0, side * split);
        ctx.beginPath();
        ctx.arc(0, 0, circleR, side === -1 ? Math.PI : 0, side === -1 ? 0 : Math.PI);
        ctx.closePath();
        ctx.fillStyle = primary;
        ctx.fill();
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = primary;
      ctx.fillRect(-viewW, -16, viewW * 2, 32);
      ctx.fillStyle = secondary;
      ctx.fillRect(-viewW, -8, viewW * 2, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-viewW, -3.5, viewW * 2, 7);
      ctx.restore();
    } else if (t < 1.12) {
      const p = (t - 0.85) / 0.27;
      ctx.fillStyle = '#0d0607';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.28);
      const tearOpen = Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5) * 95;
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.ellipse(0, 0, viewW * 0.7, tearOpen + 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.ellipse(0, 0, viewW * 0.65, tearOpen + 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#070609';
      ctx.beginPath();
      ctx.ellipse(0, 0, viewW * 0.42, Math.max(8, tearOpen * 0.72), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        const lx = i * 110;
        const side = i % 2 === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(lx, side * tearOpen);
        ctx.lineTo(lx + 18, side * (tearOpen + 36));
        ctx.lineTo(lx - 10, side * (tearOpen + 68));
        ctx.stroke();
      }
      ctx.restore();
    } else if (t < 1.34) {
      const p = (t - 1.12) / 0.22;
      ctx.fillStyle = '#090608';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.18);
      ctx.strokeStyle = primary;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-viewW * 0.48, 0);
      ctx.quadraticCurveTo(0, -210, viewW * 0.48, 0);
      ctx.quadraticCurveTo(0, 210, -viewW * 0.48, 0);
      ctx.stroke();
      const irisR = Math.min(viewW, viewH) * 0.24;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, irisR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.setLineDash([28, 16]);
      ctx.beginPath();
      ctx.arc(0, 0, irisR * 0.88, p * 2, p * 2 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (t < 2.18) {
      const lines = [
        [0, viewH * 0.64, viewW, viewH * 0.34],
        [0, viewH * 0.76, viewW, viewH * 0.48],
      ];
      for (const [x1, y1, x2, y2] of lines) {
        ctx.strokeStyle = primary;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy + 44, (t - 1.86) / 0.32, 'CẠCH!', secondary);
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, '#dc2626');
    }
  }

  /**
   * RAIJIN — VOLT JUDGMENT · 雷 (Storm Indigo Sky + Spinning Raijin 6-Drum Mandala + 7 Sky Thunder Pillars!)
   */
  private renderVoltJudgment(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;

    if (t < 0.6) {
      // Storm-indigo sky + jagged spiderweb lightning grid
      ctx.fillStyle = '#040a1a';
      ctx.fillRect(0, 0, viewW, viewH);
      for (let i = 0; i < 8; i++) {
        const y0 = (i / 7) * viewH;
        ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#fef08a';
        ctx.lineWidth = 2.5 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let seg = 1; seg <= 8; seg++) {
          const jx = (seg / 8) * viewW;
          const jy = y0 + Math.sin(t * 45 + i * 3 + seg * 2.1) * 34;
          ctx.lineTo(jx, jy);
        }
        ctx.stroke();
      }
    } else if (t < 1.28) {
      // Colossal Spinning Raijin 6-Drum Thunder Mandala + Charging Sky Spear!
      const p = (t - 0.6) / 0.68;
      ctx.fillStyle = '#050d21';
      ctx.fillRect(0, 0, viewW, viewH);

      const mandalaR = Math.min(viewW, viewH) * 0.34;
      ctx.save();
      ctx.translate(cx, cy);

      // Rotating electric rings
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, 0, mandalaR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, mandalaR * 0.78, p * 4, p * 4 + Math.PI * 1.7);
      ctx.stroke();

      // 6 Rotating Taiko Thunder Drums with lightning links
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + p * 3.8;
        const dx = Math.cos(a) * mandalaR;
        const dy = Math.sin(a) * mandalaR;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(dx, dy, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(dx, dy, 11, 0, Math.PI * 2);
        ctx.fill();

        // Lightning spoke to center
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(dx * 0.85, dy * 0.85);
        ctx.lineTo(dx * 0.4 + Math.sin(t * 60 + i) * 14, dy * 0.4 + Math.cos(t * 60 + i) * 14);
        ctx.lineTo(0, 0);
        ctx.stroke();
      }

      // Central charging vertical thunder spear
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -viewH * 0.5, 12, viewH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 18 * (0.5 + p * 0.5);
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, -viewH * 0.5);
      ctx.lineTo(0, viewH * 0.5);
      ctx.stroke();
      ctx.restore();
    } else if (t < 2.18) {
      // 7 Colossal Vertical Sky-to-Ground Thunder Pillars slamming left-to-right!
      const p = (t - 1.28) / 0.9;
      ctx.fillStyle = 'rgba(4, 12, 32, 0.55)';
      ctx.fillRect(0, 0, viewW, viewH);

      for (let i = 0; i < 7; i++) {
        const pillarDelay = i * 0.085;
        if (p < pillarDelay) continue;
        const lp = Math.min(1, (p - pillarDelay) / 0.25);
        const px = viewW * (0.09 + (i / 6) * 0.82);
        const pillarW = (32 + (i === 3 ? 22 : 0)) * (1.2 - lp * 0.25);

        ctx.save();
        ctx.fillStyle = 'rgba(2, 132, 199, 0.42)';
        ctx.fillRect(px - pillarW, 0, pillarW * 2, viewH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px - pillarW * 0.45, 0, pillarW * 0.9, viewH);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(px - pillarW * 0.2, 0, pillarW * 0.4, viewH);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 4, 0, 8, viewH);

        // Jagged fork arcs off each pillar
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        for (let s = 1; s <= 6; s++) {
          ctx.lineTo(px + Math.sin(t * 50 + i * 2 + s * 3) * 26, (s / 6) * viewH);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy, (t - 1.86) / 0.32, 'THIÊN LÔI!', '#fef08a');
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, '#0284c7');
    }
  }

  /**
   * KAGURA — SOLAR INFERNO · 炎 (Blazing Solar Eclipse + Full-Screen Phoenix Wings + 5 Volcanic Magma Columns!)
   */
  private renderSolarInferno(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;

    if (t < 0.62) {
      // Blazing Solar Eclipse expanding in volcanic black-crimson sky
      const p = t / 0.62;
      ctx.fillStyle = '#120402';
      ctx.fillRect(0, 0, viewW, viewH);

      const r = Math.min(viewW, viewH) * (0.14 + p * 0.24);
      const grad = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r * 1.9);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(0.35, '#f97316');
      grad.addColorStop(0.7, 'rgba(220, 38, 38, 0.45)');
      grad.addColorStop(1, 'rgba(18, 4, 2, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // Dark eclipse core
      ctx.fillStyle = '#090304';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
      ctx.fill();

      // Blazing solar corona flames radiating outward
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + p * 1.4;
        const flare = r * (1.05 + Math.sin(t * 24 + i * 1.7) * 0.28);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
        ctx.lineTo(cx + Math.cos(a) * flare, cy + Math.sin(a) * flare);
        ctx.stroke();
      }
    } else if (t < 1.32) {
      // Colossal Full-Screen Flaming Phoenix Wings unfurling + diagonal flame cleaves!
      const p = (t - 0.62) / 0.7;
      ctx.fillStyle = '#190502';
      ctx.fillRect(0, 0, viewW, viewH);

      const spread = Math.min(1, p * 1.45);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(cx, cy + 20);
        ctx.scale(side * spread, 1);
        // Outer scarlet flame wing
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(viewW * 0.24, -viewH * 0.48, viewW * 0.49, -viewH * 0.34);
        ctx.lineTo(viewW * 0.36, -viewH * 0.08);
        ctx.lineTo(viewW * 0.46, viewH * 0.12);
        ctx.lineTo(viewW * 0.26, viewH * 0.2);
        ctx.lineTo(0, 32);
        ctx.closePath();
        ctx.fill();

        // Inner incandescent gold wing core
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(viewW * 0.19, -viewH * 0.34, viewW * 0.38, -viewH * 0.22);
        ctx.lineTo(viewW * 0.24, viewH * 0.08);
        ctx.lineTo(0, 22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(viewW * 0.12, -viewH * 0.2, viewW * 0.24, -viewH * 0.12);
        ctx.lineTo(viewW * 0.14, viewH * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (t < 2.18) {
      // 5 Towering Volcanic Supernova Magma Columns erupting upward!
      const p = (t - 1.32) / 0.86;
      ctx.fillStyle = 'rgba(28, 6, 2, 0.58)';
      ctx.fillRect(0, 0, viewW, viewH);

      for (let i = 0; i < 5; i++) {
        const px = viewW * (0.12 + (i / 4) * 0.76);
        const eruptH = viewH * Math.min(1.15, (p - i * 0.07) * 2.4);
        if (eruptH <= 0) continue;
        const w = 54 + (i === 2 ? 26 : 0);

        ctx.fillStyle = 'rgba(234, 88, 12, 0.52)';
        ctx.fillRect(px - w * 0.85, viewH - eruptH, w * 1.7, eruptH);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px - w * 0.48, viewH - eruptH, w * 0.96, eruptH);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(px - w * 0.2, viewH - eruptH, w * 0.4, eruptH);
      }

      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy, (t - 1.86) / 0.32, 'VIÊM NGỤC!', '#fde047');
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, '#ea580c');
    }
  }

  /**
   * ZERO — PHANTOM ECLIPSE · 影 (Emerald Time-Freeze Void + 16-Line Shadow Clone Omni-Slash Web!)
   */
  private renderPhantomEclipse(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;

    if (t < 0.48) {
      // Emerald-Obsidian Time-Freeze Void + Spinning Shuriken Clock Ring!
      const p = t / 0.48;
      ctx.fillStyle = '#02120d';
      ctx.fillRect(0, 0, viewW, viewH);

      const r = Math.min(viewW, viewH) * 0.36;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(p * 2.4);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // 8-point ninja compass spokes
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 ? '#34d399' : '#065f46';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
        ctx.lineTo(Math.cos(a + 0.12) * r * 0.72, Math.sin(a + 0.12) * r * 0.72);
        ctx.lineTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
        ctx.lineTo(Math.cos(a - 0.12) * r * 0.72, Math.sin(a - 0.12) * r * 0.72);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (t < 2.18) {
      // 16 Intersecting Neon-Emerald Omni-Slash Cuts + Blinking Shadow Clone Silhouettes!
      ctx.fillStyle = t < 1.55 ? '#031510' : 'rgba(3, 21, 16, 0.58)';
      ctx.fillRect(0, 0, viewW, viewH);

      for (const cut of this.omniCuts) {
        if (t < cut.delay) continue;
        const p = Math.min(1, (t - cut.delay) / 0.12);
        const x1 = cut.x1 * viewW;
        const y1 = cut.y1 * viewH;
        const x2 = x1 + (cut.x2 * viewW - x1) * p;
        const y2 = y1 + (cut.y2 * viewH - y1) * p;

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.lineWidth = cut.width * 2.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = cut.width;
        ctx.stroke();

        ctx.strokeStyle = '#ecfdf5';
        ctx.lineWidth = Math.max(1.5, cut.width * 0.38);
        ctx.stroke();
      }

      // Flashing emerald clone afterimage rings
      if (t < 1.85) {
        const cloneIdx = Math.floor(t * 14) % 6;
        const bx = viewW * (0.16 + ((cloneIdx * 29) % 68) / 100);
        const by = viewH * (0.24 + ((cloneIdx * 41) % 52) / 100);
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy, (t - 1.86) / 0.32, 'ẢNH TRẢM!', '#a7f3d0');
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, '#059669');
    }
  }

  private renderClimaxCallout(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gp: number,
    text: string,
    color: string
  ): void {
    const starR = 118 * (1 - gp * 0.32);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.max(0, 1 - gp * 0.6);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-starR, 0);
    ctx.lineTo(starR, 0);
    ctx.moveTo(0, -starR * 0.55);
    ctx.lineTo(0, starR * 0.55);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'italic 800 34px "Barlow Condensed", sans-serif';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#090b10';
    ctx.lineWidth = 5.5;
    ctx.textAlign = 'center';
    ctx.strokeText(text, 0, -34);
    ctx.fillText(text, 0, -34);
    ctx.restore();
  }

  private renderKanjiStamp(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    stampColor: string
  ): void {
    const p = (this.timer - 2.18) / (this.duration - 2.18);
    const stampScale = p < 0.16 ? 2.2 - (p / 0.16) * 1.2 : 1.0 + p * 0.04;
    const alpha = p > 0.74 ? Math.max(0, 1 - (p - 0.74) / 0.26) : 1;
    const boxHalf = Math.min(94, viewH * 0.22);

    ctx.save();
    ctx.translate(viewW * 0.64, viewH * 0.48);
    ctx.scale(stampScale, stampScale);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = stampColor;
    const splatters = [
      [-1.18, -0.92, 6],
      [1.14, -0.78, 8],
      [-1.04, 1.02, 5],
      [1.22, 0.9, 7],
      [-1.32, 0.12, 4],
      [1.28, -0.16, 5],
      [0.34, -1.24, 5],
      [-0.44, 1.18, 6],
    ];
    for (const [sx, sy, sr] of splatters) {
      ctx.beginPath();
      ctx.arc(sx * boxHalf, sy * boxHalf, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = stampColor;
    ctx.fillRect(-boxHalf, -boxHalf, boxHalf * 2, boxHalf * 2);
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 6;
    ctx.strokeRect(-boxHalf, -boxHalf, boxHalf * 2, boxHalf * 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(boxHalf * 1.56)}px "Noto Serif JP", "Yu Mincho", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.theme.kanji, 0, boxHalf * 0.08);
    ctx.restore();
  }
}
