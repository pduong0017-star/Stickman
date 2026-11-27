import type { AudioEngine } from './AudioEngine';
import type { Camera } from './Camera';
import type { CharacterId, ScarfNode, SkinId } from './types';
import { getUltimateStyleId } from './animation';
import { getCharacterDef } from './characters';
import { GROUND_Y } from './rules';
import { getSkinVfxProfile } from './skinVfx';
import { renderStickman } from './StickmanRenderer';
import { colorWithAlpha, finiteOr } from './renderer/inkStyle';

export interface CutsceneTheme {
  characterId?: CharacterId;
  skinId?: SkinId;
  kanji: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
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
    if (this.theme.skinId === 'xuan_feng_sage') {
      return this.active && this.timer >= 1.215 && this.timer < 1.89;
    }
    const style = getUltimateStyleId(this.theme.characterId ?? 'kuro');
    if (style !== 'scarlet_sheath') {
      return this.active && this.timer >= 1.55 && this.timer < 1.92;
    }
    return this.active && this.timer >= 1.32 && this.timer < 1.85;
  }

  public isWhiteFlashPhase(): boolean {
    if (this.theme.skinId === 'xuan_feng_sage') {
      return this.active && this.timer >= 1.89 && this.timer < 2.02;
    }
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
    if (this.theme.skinId === 'xuan_feng_sage' && prev < 1.215 && this.timer >= 1.215) {
      audio.playCryoShatter();
      camera.addShake(0.54, -0.5, 0.8);
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
    const kanjiDropTime = this.theme.skinId === 'xuan_feng_sage' ? 1.89 : 2.18;
    if (!this.kanjiDropped && this.timer >= kanjiDropTime) {
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
    try {
      if (this.theme.characterId === 'aether' || style === 'arcane_supernova') {
        this.renderArcaneSupernova(ctx, viewW, viewH);
      } else if (this.theme.characterId === 'valkyrie' || style === 'valkyrie_ascension') {
        this.renderValkyrieAscension(ctx, viewW, viewH);
      } else if (this.theme.characterId === 'mirage' || style === 'mirror_shatter') {
        this.renderMirrorShatter(ctx, viewW, viewH);
      } else if (this.theme.characterId === 'chrono' || style === 'time_stop') {
        this.renderTimeStop(ctx, viewW, viewH);
      } else if (this.theme.skinId === 'xuan_feng_sage') {
        this.renderXuanFengSageCutscene(ctx, viewW, viewH);
      } else if (this.theme.characterId === 'mactien' || style === 'spring_scroll') {
        this.renderSpringScroll(ctx, viewW, viewH);
      } else if (this.theme.skinId === 'radiant_seraph') {
        this.renderRadiantSeraphUltimate(ctx, viewW, viewH);
      } else if (this.theme.skinId === 'void_walker') {
        this.renderVoidWalkerUltimate(ctx, viewW, viewH);
      } else if (style === 'volt_judgment') {
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
    } finally {
      ctx.restore();
    }
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
        try {
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
        } finally {
          ctx.restore();
        }
      }
    } else if (t < 0.85) {
      const p = (t - 0.5) / 0.35;
      ctx.fillStyle = '#0a0709';
      ctx.fillRect(0, 0, viewW, viewH);
      const circleR = Math.min(viewW, viewH) * 0.32;
      const split = Math.min(1, p * 1.4) * 14;

      ctx.save();
      try {
        ctx.translate(cx, cy);
        ctx.rotate(-0.28);
        for (const side of [-1, 1]) {
          ctx.save();
          try {
            ctx.translate(0, side * split);
            ctx.beginPath();
            ctx.arc(0, 0, circleR, side === -1 ? Math.PI : 0, side === -1 ? 0 : Math.PI);
            ctx.closePath();
            ctx.fillStyle = primary;
            ctx.fill();
            ctx.strokeStyle = secondary;
            ctx.lineWidth = 6;
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        ctx.fillStyle = primary;
        ctx.fillRect(-viewW, -16, viewW * 2, 32);
        ctx.fillStyle = secondary;
        ctx.fillRect(-viewW, -8, viewW * 2, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-viewW, -3.5, viewW * 2, 7);
      } finally {
        ctx.restore();
      }
    } else if (t < 1.12) {
      const p = (t - 0.85) / 0.27;
      ctx.fillStyle = '#0d0607';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.save();
      try {
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
      } finally {
        ctx.restore();
      }
    } else if (t < 1.34) {
      const p = (t - 1.12) / 0.22;
      ctx.fillStyle = '#090608';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.save();
      try {
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
      } finally {
        ctx.restore();
      }
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
      this.renderKanjiStamp(ctx, viewW, viewH, this.theme.primaryColor);
    }
  }

  /**
   * RAIJIN — VOLT JUDGMENT · 雷 (Storm Indigo Sky + Spinning Raijin Drum Mandala + 7 Sky Thunder Pillars!)
   */
  private renderVoltJudgment(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const skinId = this.theme.skinId ?? 'default';
    const vfx = getSkinVfxProfile('raijin', skinId);
    const isShogun = skinId === 'storm_shogun';
    const isCyber = skinId === 'cyber_valkyrie';

    const skyPhase1 = isCyber ? '#090418' : isShogun ? '#03091f' : (this.theme.accentColor ?? '#040a1a');
    const skyPhase2 = isCyber ? '#110626' : isShogun ? '#071233' : '#050d21';
    const skyPhase3 = isCyber
      ? 'rgba(9, 4, 24, 0.58)'
      : isShogun
        ? 'rgba(3, 9, 31, 0.58)'
        : 'rgba(4, 12, 32, 0.55)';
    const boltPrimary = isCyber ? '#22d3ee' : isShogun ? '#60a5fa' : '#38bdf8';
    const boltSecondary = isCyber ? '#e879f9' : isShogun ? '#fde047' : '#fef08a';
    const ringOuter = isCyber ? '#c026d3' : isShogun ? '#1d4ed8' : '#0284c7';
    const ringInner = isCyber ? '#67e8f9' : isShogun ? '#fde047' : '#fef08a';
    const pillarOuterGlow = isCyber
      ? 'rgba(192, 38, 211, 0.45)'
      : isShogun
        ? 'rgba(29, 78, 216, 0.45)'
        : 'rgba(2, 132, 199, 0.42)';
    const calloutText = isCyber ? 'OVERDRIVE!' : isShogun ? 'THIÊN ĐÌNH!' : 'THIÊN LÔI!';
    const stampColor = isCyber
      ? '#c026d3'
      : isShogun
        ? '#1d4ed8'
        : (this.theme.primaryColor || vfx.cutscenePrimary);

    if (t < 0.6) {
      // Sky + jagged lightning / cyber grid bolts
      ctx.fillStyle = skyPhase1;
      ctx.fillRect(0, 0, viewW, viewH);
      for (let i = 0; i < 8; i++) {
        const y0 = (i / 7) * viewH;
        ctx.strokeStyle = i % 2 === 0 ? boltPrimary : boltSecondary;
        ctx.lineWidth = 2.5 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let seg = 1; seg <= 8; seg++) {
          const jx = (seg / 8) * viewW;
          const jy = isCyber
            ? y0 + (seg % 2 === 0 ? 1 : -1) * Math.round(Math.sin(t * 36 + i * 2) * 26)
            : y0 + Math.sin(t * 45 + i * 3 + seg * 2.1) * 34;
          ctx.lineTo(jx, jy);
        }
        ctx.stroke();
      }
    } else if (t < 1.28) {
      // Spinning Raijin Drum Mandala (Shogun: 7 Imperial Drums, Cyber: 6 Hex Plasma Nodes, Default: 6 Taiko Drums)
      const p = (t - 0.6) / 0.68;
      ctx.fillStyle = skyPhase2;
      ctx.fillRect(0, 0, viewW, viewH);

      const mandalaR = Math.min(viewW, viewH) * 0.34;
      ctx.save();
      try {
        ctx.translate(cx, cy);

        ctx.strokeStyle = ringOuter;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, mandalaR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = ringInner;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, mandalaR * 0.78, p * 4, p * 4 + Math.PI * 1.7);
        ctx.stroke();

        const nodeCount = isShogun ? 7 : 6;
        for (let i = 0; i < nodeCount; i++) {
          const a = (i / nodeCount) * Math.PI * 2 + p * 3.8;
          const dx = Math.cos(a) * mandalaR;
          const dy = Math.sin(a) * mandalaR;
          if (isCyber) {
            ctx.fillStyle = '#1e1b4b';
            ctx.strokeStyle = i % 2 === 0 ? '#e879f9' : '#22d3ee';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(dx, dy - 22);
            ctx.lineTo(dx + 20, dy);
            ctx.lineTo(dx, dy + 22);
            ctx.lineTo(dx - 20, dy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#67e8f9';
            ctx.beginPath();
            ctx.arc(dx, dy, 7, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = isShogun ? '#1e3a8a' : '#0f172a';
            ctx.strokeStyle = isShogun ? '#fde047' : '#38bdf8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(dx, dy, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = isShogun ? '#60a5fa' : '#facc15';
            ctx.beginPath();
            ctx.arc(dx, dy, 11, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = isCyber ? '#f0abfc' : isShogun ? '#bfdbfe' : '#e0f2fe';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(dx * 0.85, dy * 0.85);
          ctx.lineTo(dx * 0.4 + Math.sin(t * 60 + i) * 14, dy * 0.4 + Math.cos(t * 60 + i) * 14);
          ctx.lineTo(0, 0);
          ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -viewH * 0.5, 12, viewH);
        ctx.strokeStyle = boltPrimary;
        ctx.lineWidth = 18 * (0.5 + p * 0.5);
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, -viewH * 0.5);
        ctx.lineTo(0, viewH * 0.5);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    } else if (t < 2.18) {
      // 7 Colossal Vertical Sky-to-Ground Thunder Pillars slamming left-to-right!
      const p = (t - 1.28) / 0.9;
      ctx.fillStyle = skyPhase3;
      ctx.fillRect(0, 0, viewW, viewH);

      for (let i = 0; i < 7; i++) {
        const pillarDelay = i * 0.085;
        if (p < pillarDelay) continue;
        const lp = Math.min(1, (p - pillarDelay) / 0.25);
        const px = viewW * (0.09 + (i / 6) * 0.82);
        const pillarW = (32 + (i === 3 ? 22 : 0)) * (1.2 - lp * 0.25);

        ctx.save();
        try {
          ctx.fillStyle = pillarOuterGlow;
          ctx.fillRect(px - pillarW, 0, pillarW * 2, viewH);
          ctx.fillStyle = isCyber ? '#e879f9' : boltPrimary;
          ctx.fillRect(px - pillarW * 0.45, 0, pillarW * 0.9, viewH);
          ctx.fillStyle = isCyber ? '#67e8f9' : boltSecondary;
          ctx.fillRect(px - pillarW * 0.2, 0, pillarW * 0.4, viewH);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 4, 0, 8, viewH);

          ctx.strokeStyle = boltSecondary;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          for (let s = 1; s <= 6; s++) {
            ctx.lineTo(px + Math.sin(t * 50 + i * 2 + s * 3) * 26, (s / 6) * viewH);
          }
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy, (t - 1.86) / 0.32, calloutText, boltSecondary);
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, stampColor);
    }
  }

  /**
   * KAGURA — SOLAR INFERNO · 炎 (Solar Eclipse / Frostfire Eclipse + Wings + 5 Supernova Columns!)
   */
  private renderSolarInferno(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const skinId = this.theme.skinId ?? 'default';
    const vfx = getSkinVfxProfile('kagura', skinId);
    const isPhoenix = skinId === 'solar_phoenix';
    const isFrost = skinId === 'frost_empress';

    const skyPhase1 = isFrost ? '#04101f' : isPhoenix ? '#1c0602' : (this.theme.accentColor ?? '#120402');
    const skyPhase2 = isFrost ? '#06182e' : isPhoenix ? '#240803' : '#190502';
    const skyPhase3 = isFrost
      ? 'rgba(4, 16, 31, 0.6)'
      : isPhoenix
        ? 'rgba(28, 6, 2, 0.6)'
        : 'rgba(28, 6, 2, 0.58)';
    const calloutText = isFrost ? 'BĂNG HỎA!' : isPhoenix ? 'NIẾT BÀN!' : 'VIÊM NGỤC!';
    const calloutColor = isFrost ? '#e0f2fe' : isPhoenix ? '#fef9c3' : '#fde047';
    const stampColor = isFrost
      ? '#0284c7'
      : isPhoenix
        ? '#dc2626'
        : (this.theme.primaryColor || vfx.cutscenePrimary);

    if (t < 0.62) {
      // Blazing Solar / Frostfire Eclipse expanding in dark sky
      const p = t / 0.62;
      ctx.fillStyle = skyPhase1;
      ctx.fillRect(0, 0, viewW, viewH);

      const r = Math.min(viewW, viewH) * (0.14 + p * 0.24);
      const grad = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r * 1.9);
      if (isFrost) {
        grad.addColorStop(0, '#e0f2fe');
        grad.addColorStop(0.35, '#38bdf8');
        grad.addColorStop(0.7, 'rgba(192, 132, 252, 0.48)');
        grad.addColorStop(1, 'rgba(4, 16, 31, 0)');
      } else if (isPhoenix) {
        grad.addColorStop(0, '#fef9c3');
        grad.addColorStop(0.35, '#fde047');
        grad.addColorStop(0.7, 'rgba(220, 38, 38, 0.55)');
        grad.addColorStop(1, 'rgba(28, 6, 2, 0)');
      } else {
        grad.addColorStop(0, '#fde047');
        grad.addColorStop(0.35, '#f97316');
        grad.addColorStop(0.7, 'rgba(220, 38, 38, 0.45)');
        grad.addColorStop(1, 'rgba(18, 4, 2, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isFrost ? '#030b17' : '#090304';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 4;
      for (let i = 0; i < 16; i++) {
        ctx.strokeStyle = isFrost
          ? i % 2 === 0
            ? '#38bdf8'
            : '#c084fc'
          : isPhoenix
            ? '#fef9c3'
            : '#fde047';
        const a = (i / 16) * Math.PI * 2 + p * 1.4;
        const flare = r * (1.05 + Math.sin(t * 24 + i * 1.7) * 0.28);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
        ctx.lineTo(cx + Math.cos(a) * flare, cy + Math.sin(a) * flare);
        ctx.stroke();
      }
    } else if (t < 1.32) {
      // Full-Screen Phoenix / Glacial Crystal Wings unfurling!
      const p = (t - 0.62) / 0.7;
      ctx.fillStyle = skyPhase2;
      ctx.fillRect(0, 0, viewW, viewH);

      const spread = Math.min(1, p * 1.45);
      for (const side of [-1, 1]) {
        ctx.save();
        try {
          ctx.translate(cx, cy + 20);
          ctx.scale(side * spread, 1);

          ctx.fillStyle = isFrost ? '#0284c7' : isPhoenix ? '#b91c1c' : '#dc2626';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(viewW * 0.24, -viewH * 0.48, viewW * 0.49, -viewH * 0.34);
          ctx.lineTo(viewW * 0.36, -viewH * 0.08);
          ctx.lineTo(viewW * 0.46, viewH * 0.12);
          ctx.lineTo(viewW * 0.26, viewH * 0.2);
          ctx.lineTo(0, 32);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = isFrost ? '#38bdf8' : isPhoenix ? '#f97316' : '#fb923c';
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.quadraticCurveTo(viewW * 0.19, -viewH * 0.34, viewW * 0.38, -viewH * 0.22);
          ctx.lineTo(viewW * 0.24, viewH * 0.08);
          ctx.lineTo(0, 22);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = isFrost ? '#e0f2fe' : isPhoenix ? '#fef9c3' : '#fef08a';
          ctx.beginPath();
          ctx.moveTo(0, 8);
          ctx.quadraticCurveTo(viewW * 0.12, -viewH * 0.2, viewW * 0.24, -viewH * 0.12);
          ctx.lineTo(viewW * 0.14, viewH * 0.05);
          ctx.closePath();
          ctx.fill();

          if (isFrost) {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 4);
            ctx.lineTo(viewW * 0.42, -viewH * 0.26);
            ctx.moveTo(0, 12);
            ctx.lineTo(viewW * 0.34, viewH * 0.06);
            ctx.stroke();
          } else if (isPhoenix) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(viewW * 0.12, -viewH * 0.18);
            ctx.quadraticCurveTo(viewW * 0.32, -viewH * 0.4, viewW * 0.52, -viewH * 0.28);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      }
    } else if (t < 2.18) {
      // 5 Towering Supernova Columns erupting upward!
      const p = (t - 1.32) / 0.86;
      ctx.fillStyle = skyPhase3;
      ctx.fillRect(0, 0, viewW, viewH);

      for (let i = 0; i < 5; i++) {
        const px = viewW * (0.12 + (i / 4) * 0.76);
        const eruptH = viewH * Math.min(1.15, (p - i * 0.07) * 2.4);
        if (eruptH <= 0) continue;
        const w = 54 + (i === 2 ? 26 : 0);

        ctx.fillStyle = isFrost
          ? 'rgba(2, 132, 199, 0.52)'
          : isPhoenix
            ? 'rgba(220, 38, 38, 0.54)'
            : 'rgba(234, 88, 12, 0.52)';
        ctx.fillRect(px - w * 0.85, viewH - eruptH, w * 1.7, eruptH);
        ctx.fillStyle = isFrost ? '#38bdf8' : isPhoenix ? '#f97316' : '#f97316';
        ctx.fillRect(px - w * 0.48, viewH - eruptH, w * 0.96, eruptH);
        ctx.fillStyle = isFrost ? '#e0f2fe' : isPhoenix ? '#fef9c3' : '#fef08a';
        ctx.fillRect(px - w * 0.2, viewH - eruptH, w * 0.4, eruptH);

        if (isFrost) {
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.4;
          ctx.strokeRect(px - w * 0.48, viewH - eruptH, w * 0.96, eruptH);
        }
      }

      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy, (t - 1.86) / 0.32, calloutText, calloutColor);
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, stampColor);
    }
  }

  /**
   * ZERO — PHANTOM ECLIPSE · 影 (Time-Freeze Void + 16-Line Shadow Clone Omni-Slash Web!)
   */
  private renderPhantomEclipse(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const skinId = this.theme.skinId ?? 'default';
    const vfx = getSkinVfxProfile('zero', skinId);
    const isBloodMoon = skinId === 'blood_moon';
    const isAstral = skinId === 'astral_phantom';

    const skyPhase1 = isBloodMoon ? '#140308' : isAstral ? '#06041a' : (this.theme.accentColor ?? '#02120d');
    const skyPhase2 = t < 1.55
      ? (isBloodMoon ? '#1c050c' : isAstral ? '#090624' : '#031510')
      : (isBloodMoon ? 'rgba(20, 3, 8, 0.58)' : isAstral ? 'rgba(6, 4, 26, 0.58)' : 'rgba(3, 21, 16, 0.58)');
    const primaryCol = isBloodMoon ? '#e11d48' : isAstral ? '#4f46e5' : '#10b981';
    const midCol = isBloodMoon ? '#f43f5e' : isAstral ? '#818cf8' : '#34d399';
    const coreCol = isBloodMoon ? '#ffe4e6' : isAstral ? '#fef08a' : '#ecfdf5';
    const darkSpoke = isBloodMoon ? '#4c0519' : isAstral ? '#312e81' : '#065f46';
    const auraCol = isBloodMoon
      ? 'rgba(225, 29, 72, 0.58)'
      : isAstral
        ? 'rgba(79, 70, 229, 0.58)'
        : 'rgba(16, 185, 129, 0.55)';
    const cloneRingCol = isBloodMoon ? '#fda4af' : isAstral ? '#7dd3fc' : '#6ee7b7';
    const calloutText = isBloodMoon ? 'HUYẾT NGUYỆT!' : isAstral ? 'TINH TÚ!' : 'ẢNH TRẢM!';
    const calloutColor = isBloodMoon ? '#ffe4e6' : isAstral ? '#fef08a' : '#a7f3d0';
    const stampColor = isBloodMoon
      ? '#e11d48'
      : isAstral
        ? '#4f46e5'
        : (this.theme.primaryColor || vfx.cutscenePrimary);

    if (t < 0.48) {
      // Time-Freeze Void + Spinning Compass / Blood Moon / Astral Chart Ring!
      const p = t / 0.48;
      ctx.fillStyle = skyPhase1;
      ctx.fillRect(0, 0, viewW, viewH);

      const r = Math.min(viewW, viewH) * 0.36;
      ctx.save();
      try {
        ctx.translate(cx, cy);
        if (isBloodMoon) {
          // Giant crimson crescent moon backdrop
          ctx.fillStyle = 'rgba(225, 29, 72, 0.38)';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = skyPhase1;
          ctx.beginPath();
          ctx.arc(r * 0.28, -r * 0.12, r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.rotate(p * 2.4);
        ctx.strokeStyle = primaryCol;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.fillStyle = i % 2 === 0 ? midCol : darkSpoke;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
          ctx.lineTo(Math.cos(a + 0.12) * r * 0.72, Math.sin(a + 0.12) * r * 0.72);
          ctx.lineTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
          ctx.lineTo(Math.cos(a - 0.12) * r * 0.72, Math.sin(a - 0.12) * r * 0.72);
          ctx.closePath();
          ctx.fill();

          if (isAstral && i % 2 === 0) {
            const sx = Math.cos(a) * r * 1.18;
            const sy = Math.sin(a) * r * 1.18;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 2.18) {
      // 16 Intersecting Omni-Slash Cuts + Blinking Shadow Clone Silhouettes!
      ctx.fillStyle = skyPhase2;
      ctx.fillRect(0, 0, viewW, viewH);

      if (isBloodMoon) {
        ctx.save();
        try {
          ctx.translate(cx, cy);
          ctx.fillStyle = 'rgba(225, 29, 72, 0.22)';
          ctx.beginPath();
          ctx.arc(0, 0, Math.min(viewW, viewH) * 0.34, 0, Math.PI * 2);
          ctx.fill();
        } finally {
          ctx.restore();
        }
      }

      for (const cut of this.omniCuts) {
        if (t < cut.delay) continue;
        const p = Math.min(1, (t - cut.delay) / 0.12);
        const x1 = cut.x1 * viewW;
        const y1 = cut.y1 * viewH;
        const x2 = x1 + (cut.x2 * viewW - x1) * p;
        const y2 = y1 + (cut.y2 * viewH - y1) * p;

        ctx.strokeStyle = auraCol;
        ctx.lineWidth = cut.width * 2.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = midCol;
        ctx.lineWidth = cut.width;
        ctx.stroke();

        ctx.strokeStyle = coreCol;
        ctx.lineWidth = Math.max(1.5, cut.width * 0.38);
        ctx.stroke();

        if (isAstral) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(x2, y2 - 8);
          ctx.lineTo(x2 + 2.5, y2 - 2.5);
          ctx.lineTo(x2 + 8, y2);
          ctx.lineTo(x2 + 2.5, y2 + 2.5);
          ctx.lineTo(x2, y2 + 8);
          ctx.lineTo(x2 - 2.5, y2 + 2.5);
          ctx.lineTo(x2 - 8, y2);
          ctx.lineTo(x2 - 2.5, y2 - 2.5);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (t < 1.85) {
        const cloneIdx = Math.floor(t * 14) % 6;
        const bx = viewW * (0.16 + ((cloneIdx * 29) % 68) / 100);
        const by = viewH * (0.24 + ((cloneIdx * 41) % 52) / 100);
        ctx.strokeStyle = cloneRingCol;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (t >= 1.86) {
        this.renderClimaxCallout(ctx, cx, cy, (t - 1.86) / 0.32, calloutText, calloutColor);
      }
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, stampColor);
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
    try {
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
    } finally {
      ctx.restore();
    }
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
    try {
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
    } finally {
      ctx.restore();
    }
  }

  /**
   * KURO SKIN: RADIANT SERAPH — THIÊN LONG SCARLET · 光
   * Phase 1: Colossal Golden Pillar of Light + Vạn Kiếm Quang floating blades + falling golden feathers!
   * Phase 2: Sweeping Celestial Golden Dragon roaring diagonally across the screen!
   * Phase 3: Blinding Golden Kanji Seal 光 impact!
   */
  private renderRadiantSeraphUltimate(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;

    if (t < 0.85) {
      // Phase 1: Heaven's Pillar of Light + Vạn Kiếm Quang + Golden Feather Storm
      const p = Math.min(1, t / 0.85);
      ctx.fillStyle = '#0c0904';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const pillarW = viewW * (0.14 + p * 0.14);
        const pGrad = ctx.createLinearGradient(cx - pillarW, 0, cx + pillarW, 0);
        pGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        pGrad.addColorStop(0.25, 'rgba(250, 204, 21, 0.55)');
        pGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.96)');
        pGrad.addColorStop(0.75, 'rgba(250, 204, 21, 0.55)');
        pGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = pGrad;
        ctx.fillRect(cx - pillarW, 0, pillarW * 2, viewH);

        // 14 Radiant Holy Swords hovering around the pillar
        for (let i = 0; i < 14; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const idx = Math.floor(i / 2);
          const sx = cx + side * (pillarW * 0.72 + idx * (viewW * 0.045));
          const sy = viewH * (0.2 + ((idx * 37) % 55) / 100) - p * 26;
          const len = 58 + (idx % 3) * 18;
          ctx.fillStyle = '#fef9c3';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 4, sy + 14);
          ctx.lineTo(sx + 2, sy + len);
          ctx.lineTo(sx - 2, sy + len);
          ctx.lineTo(sx - 4, sy + 14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx - 9, sy + 14);
          ctx.lineTo(sx + 9, sy + 14);
          ctx.stroke();
        }

        // Swirling golden feathers across screen
        ctx.fillStyle = '#fef08a';
        for (let f = 0; f < 26; f++) {
          const fx = ((f * 97 + t * 240) % (viewW + 80)) - 40;
          const fy = ((f * 61 + t * 140) % (viewH + 60)) - 30;
          ctx.save();
          try {
            ctx.translate(fx, fy);
            ctx.rotate(t * 3 + f);
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 3.6, 0, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 1.32) {
      // Phase 2: Golden Celestial Dragon (Thiên Long) sweeping diagonally across the sky!
      const p = (t - 0.85) / 0.47;
      ctx.fillStyle = '#120c05';
      ctx.fillRect(0, 0, viewW, viewH);

      const headX = -viewW * 0.15 + p * viewW * 1.35;
      const headY = viewH * 0.68 - p * viewH * 0.36;

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        // Serpentine golden dragon body ribbons
        for (let layer = 0; layer < 2; layer++) {
          ctx.strokeStyle = layer === 0 ? 'rgba(245, 158, 11, 0.52)' : '#fef08a';
          ctx.lineWidth = layer === 0 ? 58 : 24;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let s = 0; s <= 18; s++) {
            const f = s / 18;
            const bx = headX - f * viewW * 0.72;
            const by = headY + f * viewH * 0.24 + Math.sin(f * 10 - t * 18) * 34;
            if (s === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
          }
          ctx.stroke();
        }

        // Stylized Fierce Golden Dragon Head
        ctx.save();
        try {
          ctx.translate(headX, headY);
          ctx.rotate(-0.26);
          ctx.fillStyle = '#fef9c3';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 4;
          // Upper snout & horns
          ctx.beginPath();
          ctx.moveTo(-48, -24);
          ctx.lineTo(-96, -54);
          ctx.lineTo(-42, -10);
          ctx.lineTo(54, -18);
          ctx.lineTo(74, 2);
          ctx.lineTo(20, 12);
          ctx.lineTo(58, 28);
          ctx.lineTo(-28, 34);
          ctx.lineTo(-56, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Blazing white-gold dragon eye
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(8, -10);
          ctx.lineTo(28, -4);
          ctx.lineTo(12, 2);
          ctx.closePath();
          ctx.fill();
        } finally {
          ctx.restore();
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 1.85) {
      // Phase 3: High-contrast silhouette beat (canvas world renders in silhouette)
      ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
      ctx.fillRect(0, 0, viewW, viewH);
    } else if (t < 2.18) {
      // Phase 4: Blinding Golden Light Flash
      const p = (t - 1.85) / 0.33;
      ctx.fillStyle = `rgba(254, 249, 195, ${(1 - p) * 0.55})`;
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, '#f59e0b');
    }
  }

  /**
   * KURO SKIN: VOID WALKER — HƯ KHÔNG LONG · 虚
   * Phase 1: Massive Black-Hole Singularity Vortex pulling shattered obsidian-violet space shards!
   * Phase 2: Menacing Void Dragon emerging from the abyss with neon magenta eyes & violet lightning!
   * Phase 3: Kanji Seal 虚 tearing reality apart!
   */
  private renderVoidWalkerUltimate(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;

    if (t < 0.85) {
      // Phase 1: Colossal Spinning Black Hole Singularity + Orbiting Void Crystal Shards
      const p = Math.min(1, t / 0.85);
      ctx.fillStyle = '#070410';
      ctx.fillRect(0, 0, viewW, viewH);

      const coreR = Math.min(viewW, viewH) * (0.12 + p * 0.14);
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(cx, cy, coreR * 0.7, cx, cy, coreR * 2.8);
        halo.addColorStop(0, 'rgba(168, 85, 247, 0.85)');
        halo.addColorStop(0.45, 'rgba(126, 34, 206, 0.38)');
        halo.addColorStop(1, 'rgba(15, 7, 32, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Spiral void rings
        for (let r = 0; r < 3; r++) {
          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.rotate(t * (4.2 - r * 1.1) * (r % 2 === 0 ? 1 : -1));
            ctx.strokeStyle = r === 0 ? '#e879f9' : '#a855f7';
            ctx.lineWidth = 4 - r;
            ctx.setLineDash([28, 16]);
            ctx.beginPath();
            ctx.arc(0, 0, coreR * (1.2 + r * 0.45), 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }

      // Pitch-black singularity event horizon
      ctx.fillStyle = '#05020a';
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 22 Jagged Void Crystal Shards swirling into the abyss
      ctx.fillStyle = '#c084fc';
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + t * 2.6;
        const dist = coreR * (1.35 + ((i * 29) % 100) / 55) * (1.15 - p * 0.25);
        const sx = cx + Math.cos(a) * dist;
        const sy = cy + Math.sin(a) * dist;
        ctx.save();
        try {
          ctx.translate(sx, sy);
          ctx.rotate(a + Math.PI * 0.5);
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(6, 0);
          ctx.lineTo(0, 14);
          ctx.lineTo(-6, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (t < 1.32) {
      // Phase 2: Void Dragon (Hư Không Long) lunging from the abyss!
      const p = (t - 0.85) / 0.47;
      ctx.fillStyle = '#090414';
      ctx.fillRect(0, 0, viewW, viewH);

      const headX = viewW * 1.15 - p * viewW * 1.35;
      const headY = viewH * 0.34 + p * viewH * 0.32;

      ctx.save();
      try {
        // Dark nebula dragon body + neon purple outline
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
        ctx.lineWidth = 64;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s <= 18; s++) {
          const f = s / 18;
          const bx = headX + f * viewW * 0.72;
          const by = headY - f * viewH * 0.2 + Math.sin(f * 10 - t * 20) * 36;
          if (s === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.stroke();

        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 34;
        ctx.stroke();
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Void Dragon Head (facing left)
        ctx.save();
        try {
          ctx.translate(headX, headY);
          ctx.scale(-1, 1);
          ctx.rotate(-0.22);
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-48, -24);
          ctx.lineTo(-102, -56);
          ctx.lineTo(-42, -10);
          ctx.lineTo(56, -20);
          ctx.lineTo(78, 2);
          ctx.lineTo(22, 12);
          ctx.lineTo(62, 30);
          ctx.lineTo(-28, 36);
          ctx.lineTo(-56, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Blazing Neon-Magenta Dragon Eye
          ctx.fillStyle = '#f0abfc';
          ctx.beginPath();
          ctx.moveTo(8, -11);
          ctx.lineTo(30, -4);
          ctx.lineTo(12, 3);
          ctx.closePath();
          ctx.fill();
        } finally {
          ctx.restore();
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 1.85) {
      ctx.fillStyle = 'rgba(126, 34, 206, 0.16)';
      ctx.fillRect(0, 0, viewW, viewH);
    } else if (t < 2.18) {
      const p = (t - 1.85) / 0.33;
      ctx.fillStyle = `rgba(216, 180, 254, ${(1 - p) * 0.45})`;
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, '#7e22ce');
    }
  }

  /**
   * AETHER (VIP MAGE) — THIÊN HÀ HỦY DIỆT (宙) / CẦU VỒNG TINH TÚ (虹)
   * Phase 1: Cosmic Starfield + 4 Counter-Rotating Sacred Geometry Mandalas
   * Phase 2: Dual Opposing Celestial Orbs (Cyan + Magenta) Spiral & Collide -> 12-Beam Prismatic Supernova!
   * Phase 3: Iridescent Aurora Flash -> Kanji Stamp (宙 / 虹)
   */
  private renderArcaneSupernova(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const isRainbow = this.theme.skinId === 'prismatic_archon';
    const rainbow = ['#38bdf8', '#818cf8', '#e879f9', '#f43f5e', '#f59e0b', '#fde047', '#34d399'];
    const baseR = Math.min(viewW, viewH) * 0.38;

    if (t < 0.85) {
      // Phase 1: Cosmic Starfield + 4 Nested Sacred Geometry Mandalas
      const p = Math.min(1, t / 0.85);
      ctx.fillStyle = '#050310';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';

        // Twinkling starfield
        for (let s = 0; s < 36; s++) {
          const sx = ((s * 173) % 997) / 997 * viewW;
          const sy = ((s * 311) % 991) / 991 * viewH;
          const sr = 1.2 + ((s * 7) % 3);
          ctx.fillStyle = isRainbow ? rainbow[s % rainbow.length] : '#e0f2fe';
          ctx.globalAlpha = 0.35 + 0.55 * Math.abs(Math.sin(t * 6 + s));
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.translate(cx, cy);
        for (let ring = 0; ring < 4; ring++) {
          const r = baseR * (0.28 + ring * 0.24) * (0.4 + p * 0.65);
          const dir = ring % 2 === 0 ? 1 : -1;
          ctx.save();
          try {
            ctx.rotate(t * (1.6 + ring * 0.7) * dir);
            ctx.strokeStyle = isRainbow
              ? rainbow[(ring * 2 + Math.floor(t * 5)) % rainbow.length]
              : ring % 2 === 0
                ? '#e879f9'
                : '#38bdf8';
            ctx.lineWidth = ring === 3 ? 4 : 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            // Sacred geometry star polygon
            const pts = ring % 2 === 0 ? 6 : 8;
            const step = ring % 2 === 0 ? 2 : 3;
            ctx.beginPath();
            for (let i = 0; i < pts; i++) {
              const a = (i * Math.PI * 2) / pts;
              const b = (((i + step) % pts) * Math.PI * 2) / pts;
              ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
            }
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 1.55) {
      // Phase 2: Dual Opposing Celestial Orbs Spiral Inward & Collide -> 12-Beam Prismatic Supernova!
      const p = (t - 0.85) / 0.7;
      ctx.fillStyle = '#080416';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, cy);

        if (p < 0.45) {
          // Dual Orbs spiraling in (Cyan + Magenta)
          const sp = p / 0.45;
          const dist = baseR * 0.85 * (1 - sp);
          const ang = sp * Math.PI * 2.2;
          const orbR = 26 + sp * 28;

          for (const side of [-1, 1]) {
            const ox = Math.cos(ang) * dist * side;
            const oy = Math.sin(ang) * dist * 0.6 * side;
            ctx.fillStyle = side === -1 ? '#38bdf8' : '#ec4899';
            ctx.beginPath();
            ctx.arc(ox, oy, orbR * 1.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ox, oy, orbR * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Supernova Collision Explosion: 12 Radial Prismatic Beams + Expanding Shockwaves!
          const ep = (p - 0.45) / 0.55;
          const beamCount = 12;
          for (let i = 0; i < beamCount; i++) {
            const a = (i * Math.PI * 2) / beamCount + ep * 0.6;
            const len = Math.max(viewW, viewH) * (0.25 + ep * 0.85);
            ctx.strokeStyle = isRainbow ? rainbow[i % rainbow.length] : i % 2 === 0 ? '#e879f9' : '#38bdf8';
            ctx.lineWidth = (1 - ep * 0.45) * 28;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            ctx.stroke();
          }

          // Triple concentric shockwave rings
          for (let k = 0; k < 3; k++) {
            ctx.strokeStyle = isRainbow ? rainbow[(k * 2) % rainbow.length] : '#f0abfc';
            ctx.lineWidth = 6 - k * 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, baseR * (0.3 + ep * (1.4 + k * 0.35)), 0, Math.PI * 2);
            ctx.stroke();
          }

          // Blinding Supernova Core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 32 + ep * 85, 0, Math.PI * 2);
          ctx.fill();
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 2.18) {
      const p = (t - 1.55) / 0.63;
      ctx.fillStyle = isRainbow
        ? `rgba(244, 114, 182, ${(1 - p) * 0.52})`
        : `rgba(192, 38, 211, ${(1 - p) * 0.48})`;
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, isRainbow ? '#ec4899' : '#c026d3');
    }
  }

  /**
   * Valkyrie (Character 6) 100% exclusive Ultimate:
   * Phase 1: 3-tier Celestial Wings unfurl + rotating golden halo + rising feather light streaks.
   * Phase 2: Colossal spinning Valkyrie Glaive descends in a vertical divine beam + intersecting crescent halos.
   * Phase 3: Radiant divine silhouette flash -> Giant 聖 Kanji impact.
   */
  private renderValkyrieAscension(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const isAbyss = this.theme.skinId === 'abyssal_valkyrie';
    const isEmpress = this.theme.skinId === 'celestial_empress';
    const primary = isAbyss ? '#f43f5e' : isEmpress ? '#facc15' : '#fbbf24';
    const secondary = isAbyss ? '#a855f7' : isEmpress ? '#38bdf8' : '#fef08a';
    const core = '#ffffff';
    const baseR = Math.min(viewW, viewH) * 0.36;

    if (t < 0.85) {
      // Phase 1: Unfurling 3-Tier Celestial Wings + Sacred Halo
      const p = Math.min(1, t / 0.85);
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(viewW, viewH) * 0.72);
      bg.addColorStop(0, isAbyss ? '#26081a' : '#261a06');
      bg.addColorStop(1, '#06070d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';

        // Rising feather light streaks
        for (let i = 0; i < 24; i++) {
          const fx = ((i * 197) % 991) / 991 * viewW;
          const fy = viewH - (((t * 360 + i * 93) % (viewH + 120)) - 60);
          const fLen = 18 + (i % 4) * 9;
          ctx.strokeStyle = i % 2 === 0 ? primary : secondary;
          ctx.lineWidth = 2.2;
          ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 7 + i);
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.sin(t * 4 + i) * 8, fy - fLen);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Symmetrical 3-tier Valkyrie wings unfurling
        ctx.translate(cx, cy);
        const spread = 0.25 + p * 0.75;
        for (const side of [-1, 1] as const) {
          for (let tier = 0; tier < 3; tier++) {
            const wingLen = baseR * (1.28 - tier * 0.24) * spread;
            const angle = (-0.52 + tier * 0.28) * spread;
            ctx.save();
            try {
              ctx.scale(side, 1);
              ctx.rotate(angle);
              ctx.fillStyle = tier === 0 ? colorWithAlpha(primary, 0.4) : colorWithAlpha(secondary, 0.27);
              ctx.strokeStyle = tier === 0 ? primary : secondary;
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.moveTo(16, 0);
              ctx.quadraticCurveTo(wingLen * 0.55, -wingLen * 0.28, wingLen, -wingLen * 0.08);
              ctx.quadraticCurveTo(wingLen * 0.65, wingLen * 0.14, 16, 12);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } finally {
              ctx.restore();
            }
          }
        }

        // Rotating Sacred Halo Ring
        ctx.rotate(t * 1.8);
        ctx.strokeStyle = primary;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * (0.48 + p * 0.22), 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = secondary;
        ctx.lineWidth = 1.8;
        for (let k = 0; k < 12; k++) {
          const a = (k * Math.PI * 2) / 12;
          const r1 = baseR * (0.42 + p * 0.22);
          const r2 = baseR * (0.58 + p * 0.22);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 1.55) {
      // Phase 2: Descending Divine Glaive Pillar + Intersecting Crescent Halos
      const p = (t - 0.85) / 0.7;
      ctx.fillStyle = isAbyss ? '#120514' : '#120d04';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';

        // Vertical Divine Light Pillar
        const pillarW = (26 + p * 140) * (1 - p * 0.18);
        const pillarGrad = ctx.createLinearGradient(cx - pillarW, 0, cx + pillarW, 0);
        pillarGrad.addColorStop(0, 'rgba(0,0,0,0)');
        pillarGrad.addColorStop(0.25, colorWithAlpha(primary, 0.6));
        pillarGrad.addColorStop(0.5, core);
        pillarGrad.addColorStop(0.75, colorWithAlpha(secondary, 0.6));
        pillarGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pillarGrad;
        ctx.fillRect(cx - pillarW, 0, pillarW * 2, viewH);

        // Descending Giant Spinning Valkyrie Glaive silhouette
        const gy = -80 + p * (cy + 95);
        ctx.save();
        try {
          ctx.translate(cx, gy);
          ctx.rotate(p * Math.PI * 3.5);
          ctx.strokeStyle = core;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(0, -92);
          ctx.lineTo(0, 92);
          ctx.stroke();
          // Twin crescent glaive blades
          ctx.fillStyle = primary;
          ctx.beginPath();
          ctx.moveTo(0, -98);
          ctx.quadraticCurveTo(36, -54, 0, -18);
          ctx.quadraticCurveTo(-36, -54, 0, -98);
          ctx.fill();
          ctx.fillStyle = secondary;
          ctx.beginPath();
          ctx.moveTo(0, 98);
          ctx.quadraticCurveTo(28, 60, 0, 28);
          ctx.quadraticCurveTo(-28, 60, 0, 98);
          ctx.fill();
        } finally {
          ctx.restore();
        }

        // Expanding Elliptical Divine Halo Waves at impact center
        for (let ring = 0; ring < 3; ring++) {
          const rx = baseR * (0.35 + p * (1.25 + ring * 0.32));
          const ry = rx * 0.34;
          ctx.strokeStyle = ring % 2 === 0 ? primary : secondary;
          ctx.lineWidth = 5 - ring * 1.2;
          ctx.beginPath();
          ctx.ellipse(cx, cy + 28, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 2.18) {
      const p = (t - 1.55) / 0.63;
      ctx.fillStyle = isAbyss
        ? `rgba(244, 63, 94, ${(1 - p) * 0.5})`
        : `rgba(250, 204, 21, ${(1 - p) * 0.52})`;
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, primary);
    }
  }

  /**
   * Mirage (Character 7) 100% Exclusive Ultimate: VẠN KÍNH PHÁ HƯ KHÔNG
   * Phase 1: Whole screen cracks into polygonal mirror shards with void-silver light seeping through.
   * Phase 2: Mirror shards detach, spin, and implode into a dimensional void singularity.
   * Phase 3: Prismatic glass flash -> Giant 鏡 / 碎 Kanji impact.
   */
  private renderMirrorShatter(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const t = this.timer;
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const isVoidSkin = this.theme.skinId === 'void_shatterer';
    const primary = isVoidSkin ? '#f43f5e' : '#a855f7';
    const secondary = isVoidSkin ? '#38bdf8' : '#e2e8f0';
    const diag = Math.hypot(viewW, viewH);

    if (t < 0.85) {
      // Phase 1: Glass Fracture Web spreading across the entire viewport
      const p = Math.min(1, t / 0.85);
      ctx.fillStyle = isVoidSkin ? '#0b040f' : '#080514';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const rays = 14;
        for (let i = 0; i < rays; i++) {
          const a = (i * Math.PI * 2) / rays + (i % 2 === 0 ? 0.08 : -0.06);
          const len = diag * 0.65 * Math.min(1, p * 1.35 - (i % 3) * 0.12);
          if (len <= 0) continue;
          const mx = cx + Math.cos(a + 0.07) * len * 0.52;
          const my = cy + Math.sin(a + 0.07) * len * 0.52;
          const ex = cx + Math.cos(a) * len;
          const ey = cy + Math.sin(a) * len;

          ctx.strokeStyle = i % 2 === 0 ? secondary : primary;
          ctx.lineWidth = i % 3 === 0 ? 3.2 : 1.8;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(mx, my);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        // Concentric shattered polygon rings
        for (let ring = 1; ring <= 3; ring++) {
          const rr = Math.min(viewW, viewH) * 0.14 * ring * p;
          ctx.strokeStyle = ring === 2 ? primary : secondary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= rays; i++) {
            const a = (i * Math.PI * 2) / rays;
            const jitter = 0.85 + ((i * 7 + ring * 3) % 5) * 0.08;
            const px = cx + Math.cos(a) * rr * jitter;
            const py = cy + Math.sin(a) * rr * jitter;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }
    } else if (t < 1.55) {
      // Phase 2: Detached Mirror Shards spinning & imploding into Void Singularity
      const p = (t - 0.85) / 0.7;
      ctx.fillStyle = '#05030c';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const shardCount = 26;
        for (let i = 0; i < shardCount; i++) {
          const a = (i * Math.PI * 2) / shardCount + p * 2.2;
          const dist = (1 - Math.pow(p, 1.4)) * diag * 0.45 + 16;
          const sx = cx + Math.cos(a) * dist;
          const sy = cy + Math.sin(a) * dist * 0.68;
          const size = 14 + (i % 4) * 9;

          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.rotate(a + p * 6 * (i % 2 === 0 ? 1 : -1));
            ctx.fillStyle =
              i % 3 === 0 ? colorWithAlpha(primary, 0.6) : colorWithAlpha(secondary, 0.53);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.55, 0);
            ctx.lineTo(0, size * 0.85);
            ctx.lineTo(-size * 0.45, size * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // Central Void Prism Collapse diamond
        const coreR = 24 + p * 84;
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.moveTo(cx, cy - coreR);
        ctx.lineTo(cx + coreR * 0.72, cy);
        ctx.lineTo(cx, cy + coreR);
        ctx.lineTo(cx - coreR * 0.72, cy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 14 + p * 36, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }
    } else if (t < 2.18) {
      const p = (t - 1.55) / 0.63;
      ctx.fillStyle = isVoidSkin
        ? `rgba(244, 63, 94, ${(1 - p) * 0.5})`
        : `rgba(168, 85, 247, ${(1 - p) * 0.52})`;
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      this.renderKanjiStamp(ctx, viewW, viewH, primary);
    }
  }

  private drawCutsceneGear(
    ctx: CanvasRenderingContext2D,
    outerR: number,
    innerR: number,
    teeth: number,
    rot: number,
    strokeCol: string,
    fillCol: string,
    spokes = 6
  ): void {
    ctx.save();
    try {
      ctx.rotate(rot);
      const safeTeeth = Math.max(6, Math.floor(teeth));
      const step = (Math.PI * 2) / safeTeeth;
      const rBase = outerR * 0.87;

      ctx.beginPath();
      for (let i = 0; i < safeTeeth; i++) {
        const a0 = i * step;
        const a1 = a0 + step * 0.2;
        const a2 = a0 + step * 0.5;
        const a3 = a0 + step * 0.72;
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
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.stroke();

      for (let s = 0; s < spokes; s++) {
        const sa = (s * Math.PI * 2) / spokes;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * (innerR * 0.25), Math.sin(sa) * (innerR * 0.25));
        ctx.lineTo(Math.cos(sa) * innerR, Math.sin(sa) * innerR);
        ctx.stroke();
      }
    } finally {
      ctx.restore();
    }
  }

  private renderTimeStop(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const safeW = Math.max(1, finiteOr(viewW, 1280));
    const safeH = Math.max(1, finiteOr(viewH, 720));
    const t = finiteOr(this.timer, 0);
    const cx = safeW * 0.5;
    const cy = safeH * 0.5;
    const isSovereign = this.theme.skinId === 'chrono_sovereign';
    const primary = isSovereign ? '#f59e0b' : '#2dd4bf';
    const secondary = isSovereign ? '#38bdf8' : '#f59e0b';
    const rimLight = isSovereign ? '#fef08a' : '#99f6e4';
    const baseR = Math.min(safeW, safeH) * 0.39;

    const ROMAN_NUMERALS = [
      'XII',
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
      'X',
      'XI',
    ] as const;

    if (t < 1.55) {
      const p = Math.min(1, t / 1.55);
      const ease = 1 - Math.pow(1 - p, 2);

      // Ink-wash midnight clocktower backdrop + radial halo
      const bg = ctx.createRadialGradient(cx, cy, baseR * 0.15, cx, cy, Math.max(safeW, safeH) * 0.72);
      bg.addColorStop(0, isSovereign ? '#1e1405' : '#062222');
      bg.addColorStop(0.55, isSovereign ? '#0d0903' : '#031214');
      bg.addColorStop(1, '#030407');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, safeW, safeH);

      ctx.save();
      try {
        ctx.translate(cx, cy);

        // Sovereign Clocktower Framing Arch & Celestial Rays
        if (isSovereign) {
          ctx.save();
          try {
            ctx.globalCompositeOperation = 'lighter';
            for (let r = 0; r < 12; r++) {
              const ra = (r * Math.PI * 2) / 12 + t * 0.18;
              ctx.strokeStyle = colorWithAlpha(r % 2 === 0 ? '#f59e0b' : '#38bdf8', 0.28);
              ctx.lineWidth = r % 3 === 0 ? 5 : 2;
              ctx.beginPath();
              ctx.moveTo(Math.cos(ra) * baseR * 0.95, Math.sin(ra) * baseR * 0.95);
              ctx.lineTo(Math.cos(ra) * baseR * 1.65, Math.sin(ra) * baseR * 1.65);
              ctx.stroke();
            }

            // Outer sovereign gold-azure clocktower ring
            ctx.strokeStyle = colorWithAlpha('#38bdf8', 0.65);
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.arc(0, 0, baseR * (1.06 + ease * 0.14), 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // 1. Concentric Counter-Rotating Mechanical Cogwheels
        const dialR = baseR * (0.68 + ease * 0.32);
        this.drawCutsceneGear(
          ctx,
          dialR * 1.14,
          dialR * 0.88,
          24,
          -t * 0.85,
          colorWithAlpha(primary, 0.78),
          'rgba(10, 11, 16, 0.76)',
          8
        );
        this.drawCutsceneGear(
          ctx,
          dialR * 0.64,
          dialR * 0.42,
          16,
          t * 1.35,
          colorWithAlpha(secondary, 0.74),
          'rgba(7, 10, 14, 0.8)',
          6
        );
        this.drawCutsceneGear(
          ctx,
          dialR * 0.32,
          dialR * 0.18,
          12,
          -t * 2.2,
          colorWithAlpha(rimLight, 0.82),
          'rgba(12, 14, 20, 0.85)',
          4
        );

        // 2. Bold Ink-Wash Clockface Dial Ring
        ctx.strokeStyle = '#07080c';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(0, 0, dialR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = primary;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(0, 0, dialR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = secondary;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, dialR * 0.76, 0, Math.PI * 2);
        ctx.stroke();

        // 60 minute ticks + 12 major hour ticks
        for (let i = 0; i < 60; i++) {
          const a = (i * Math.PI * 2) / 60 - Math.PI * 0.5;
          const isHour = i % 5 === 0;
          const r1 = dialR * (isHour ? 0.88 : 0.94);
          const r2 = dialR * 0.99;
          ctx.strokeStyle = isHour ? rimLight : colorWithAlpha(primary, 0.55);
          ctx.lineWidth = isHour ? 2.6 : 1.1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          ctx.stroke();
        }

        // 3. 12 Crisp Roman Numerals (XII .. XI) rotating slowly counter-clockwise with dial
        const numRingR = dialR * 0.81;
        const fontSize = Math.max(13, Math.round(dialR * 0.125));
        ctx.font = `900 ${fontSize}px "Noto Serif JP", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12 - Math.PI * 0.5 - t * 0.25;
          const nx = Math.cos(a) * numRingR;
          const ny = Math.sin(a) * numRingR;
          ctx.strokeStyle = '#07080c';
          ctx.lineWidth = 3.5;
          ctx.strokeText(ROMAN_NUMERALS[i], nx, ny);
          ctx.fillStyle = i % 3 === 0 ? rimLight : secondary;
          ctx.fillText(ROMAN_NUMERALS[i], nx, ny);
        }

        // 4. Beveled Hour, Minute & Second Hands Snapping / Reversing Counter-Clockwise
        const drawBeveledHand = (angle: number, len: number, width: number, fill: string, edge: string) => {
          ctx.save();
          try {
            ctx.rotate(angle);
            ctx.fillStyle = fill;
            ctx.strokeStyle = '#07080c';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(-len * 0.16, 0);
            ctx.lineTo(0, -width);
            ctx.lineTo(len, 0);
            ctx.lineTo(0, width);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = edge;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.lineTo(len * 0.88, 0);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        };

        // Rewind acceleration snap!
        const rewindStep = Math.floor(t * 9) * -0.18;
        drawBeveledHand(-Math.PI * 0.5 - t * 1.45, dialR * 0.52, 9, primary, rimLight);
        drawBeveledHand(-Math.PI * 0.5 - t * 3.6 + rewindStep, dialR * 0.78, 6.5, secondary, '#ffffff');
        drawBeveledHand(-Math.PI * 0.5 - t * 6.4, dialR * 0.9, 3, '#ffffff', rimLight);

        // Central clock pivot jewel
        ctx.fillStyle = '#07080c';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rimLight;
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    } else if (t < 2.18) {
      // Phase 2: Shattered Clock-Face Fracture Climax!
      const p = Math.min(1, (t - 1.55) / 0.63);
      ctx.fillStyle = isSovereign ? '#120b03' : '#031516';
      ctx.fillRect(0, 0, safeW, safeH);

      ctx.save();
      try {
        ctx.translate(cx, cy);

        // Radial temporal fracture cracks
        const rays = 14;
        const diag = Math.hypot(safeW, safeH) * 0.58;
        for (let i = 0; i < rays; i++) {
          const a = (i * Math.PI * 2) / rays + (i % 2 === 0 ? 0.05 : -0.05);
          const len = diag * (0.45 + p * 0.65);
          const mx = Math.cos(a + 0.06) * len * 0.48;
          const my = Math.sin(a + 0.06) * len * 0.48;
          const ex = Math.cos(a) * len;
          const ey = Math.sin(a) * len;
          ctx.strokeStyle = i % 2 === 0 ? primary : secondary;
          ctx.lineWidth = i % 3 === 0 ? 4.2 : 2.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(mx, my);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        // Flying shattered clockface wedge shards
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12 - Math.PI * 0.5;
          const dist = baseR * (0.55 + p * 0.95);
          const sx = Math.cos(a) * dist;
          const sy = Math.sin(a) * dist;
          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.rotate(a + p * 2.2 * (i % 2 === 0 ? 1 : -1));
            ctx.fillStyle = colorWithAlpha(i % 2 === 0 ? primary : secondary, (1 - p * 0.55) * 0.52);
            ctx.strokeStyle = rimLight;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-20, -14);
            ctx.lineTo(22, -6);
            ctx.lineTo(14, 18);
            ctx.lineTo(-18, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // Temporal freeze flash wash
        ctx.fillStyle = colorWithAlpha(primary, Math.max(0, (1 - p) * 0.48));
        ctx.fillRect(-safeW * 0.5, -safeH * 0.5, safeW, safeH);
      } finally {
        ctx.restore();
      }
    } else {
      this.renderKanjiStamp(ctx, safeW, safeH, primary);
    }
  }

  private renderSpringScroll(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const safeW = Math.max(1, viewW);
    const safeH = Math.max(1, viewH);
    const cx = safeW * 0.5;
    const cy = safeH * 0.5;
    const t = this.timer;
    const progress = Math.min(1, t / Math.max(0.01, this.duration));
    const scrollOpen = Math.min(1, progress / 0.24);
    const easedOpen = 1 - Math.pow(1 - scrollOpen, 3);
    const scrollHalfW = safeW * 0.49 * easedOpen;
    const scrollH = Math.min(safeH * 0.7, 370);
    const scrollTop = cy - scrollH * 0.5;

    // Impact shake right when golden "春" slams down (progress 0.42 -> 0.56)
    const impactAge = progress - 0.42;
    const shakeMag = impactAge >= 0 && impactAge < 0.16 ? (1 - impactAge / 0.16) * 9 : 0;
    const shakeX = shakeMag > 0 ? Math.sin(t * 95) * shakeMag : 0;
    const shakeY = shakeMag > 0 ? Math.cos(t * 112) * shakeMag * 0.7 : 0;

    ctx.save();
    try {
      ctx.translate(shakeX, shakeY);

      // 1. Deep sumi-ink atmospheric cinema bars
      ctx.fillStyle = 'rgba(10, 12, 18, 0.88)';
      ctx.fillRect(-20, -20, safeW + 40, safeH + 40);

      // 2. Unrolling Aged Xuan-Paper Scroll (Giấy Tuyên ngả vàng cổ điển)
      ctx.save();
      try {
        ctx.beginPath();
        ctx.rect(cx - scrollHalfW, scrollTop, scrollHalfW * 2, scrollH);
        ctx.clip();

        // Warm aged parchment radial/linear wash
        const paperGrad = ctx.createLinearGradient(0, scrollTop, 0, scrollTop + scrollH);
        paperGrad.addColorStop(0, '#e5d8bc');
        paperGrad.addColorStop(0.18, '#f3ebd8');
        paperGrad.addColorStop(0.82, '#efe5ce');
        paperGrad.addColorStop(1, '#dccca9');
        ctx.fillStyle = paperGrad;
        ctx.fillRect(cx - scrollHalfW, scrollTop, scrollHalfW * 2, scrollH);

        // Soft ambient ink-wash sky mist
        const skyMist = ctx.createRadialGradient(
          cx + scrollHalfW * 0.15,
          scrollTop + scrollH * 0.28,
          12,
          cx,
          cy,
          scrollHalfW * 1.15
        );
        skyMist.addColorStop(0, 'rgba(254, 243, 199, 0.35)');
        skyMist.addColorStop(0.65, 'rgba(45, 212, 191, 0.06)');
        skyMist.addColorStop(1, 'rgba(26, 29, 36, 0.24)');
        ctx.fillStyle = skyMist;
        ctx.fillRect(cx - scrollHalfW, scrollTop, scrollHalfW * 2, scrollH);

        // 3. Soft Multi-Layered Sumi-e Mountains (smooth Bezier ridges + vertical ink-wash gradients, NO sharp triangles!)
        const drawInkMountainLayer = (
          baseYRatio: number,
          amp: number,
          phase: number,
          topAlpha: number,
          botAlpha: number
        ) => {
          const leftX = cx - scrollHalfW - 20;
          const rightX = cx + scrollHalfW + 20;
          const span = rightX - leftX;
          const baseY = scrollTop + scrollH * baseYRatio;
          const mGrad = ctx.createLinearGradient(0, baseY - amp, 0, scrollTop + scrollH);
          mGrad.addColorStop(0, `rgba(22, 26, 35, ${topAlpha})`);
          mGrad.addColorStop(0.55, `rgba(34, 41, 54, ${topAlpha * 0.55})`);
          mGrad.addColorStop(1, `rgba(243, 235, 216, ${botAlpha})`);
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.moveTo(leftX, scrollTop + scrollH);
          ctx.lineTo(leftX, baseY);
          const segs = 5;
          for (let i = 0; i < segs; i++) {
            const x0 = leftX + (span * i) / segs;
            const x1 = leftX + (span * (i + 1)) / segs;
            const mx = (x0 + x1) * 0.5;
            const h0 = Math.sin(i * 1.65 + phase) * amp;
            const h1 = Math.sin((i + 1) * 1.65 + phase) * amp;
            const peak = baseY - Math.abs(Math.cos(i * 1.2 + phase)) * amp * 1.15;
            ctx.bezierCurveTo(
              x0 + (x1 - x0) * 0.3,
              baseY - h0 * 0.4,
              mx,
              peak,
              x1,
              baseY - h1 * 0.35
            );
          }
          ctx.lineTo(rightX, scrollTop + scrollH);
          ctx.closePath();
          ctx.fill();
        };

        drawInkMountainLayer(0.58, scrollH * 0.26, 0.4, 0.24, 0.0);
        drawInkMountainLayer(0.7, scrollH * 0.22, 2.1, 0.36, 0.04);
        drawInkMountainLayer(0.84, scrollH * 0.16, 4.0, 0.48, 0.08);

        // 4. Mặc Tiên Ink-Wash Silhouette sweeping the Giant Brush across the scroll!
        const heroP = Math.min(1, Math.max(0, (progress - 0.08) / 0.52));
        const easedHero = 1 - Math.pow(1 - heroP, 2.4);
        const hx = cx - scrollHalfW * 0.72 + easedHero * scrollHalfW * 0.46;
        const hy = scrollTop + scrollH * 0.62;
        const heroAlpha = progress < 0.75 ? 0.88 : Math.max(0.25, 0.88 * (1 - (progress - 0.75) / 0.25));

        ctx.save();
        try {
          ctx.translate(hx, hy);
          ctx.globalAlpha = heroAlpha;

          // Billowing scholar robe silhouette (Trường Sam bay mạnh theo nét vung bút)
          ctx.fillStyle = '#12151c';
          ctx.beginPath();
          ctx.moveTo(-6, -42);
          ctx.quadraticCurveTo(10, -18, 16, 32);
          ctx.quadraticCurveTo(-8, 44, -46, 36);
          ctx.quadraticCurveTo(-24, 8, -14, -38);
          ctx.closePath();
          ctx.fill();

          // Scholar head + topknot + glowing jade hairpin
          ctx.beginPath();
          ctx.arc(0, -54, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-3, -66, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2dd4bf';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-14, -63);
          ctx.lineTo(10, -69);
          ctx.stroke();

          // Sweeping arm & Giant Cự Bút angled dynamically forward
          const sweepAng = -0.85 + easedHero * 1.15;
          ctx.save();
          try {
            ctx.translate(4, -34);
            ctx.rotate(sweepAng);
            ctx.strokeStyle = '#0f766e';
            ctx.lineWidth = 5.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-24, 0);
            ctx.lineTo(54, 0);
            ctx.stroke();
            ctx.fillStyle = '#12151c';
            ctx.beginPath();
            ctx.moveTo(52, -6);
            ctx.quadraticCurveTo(68, -10, 82, 0);
            ctx.quadraticCurveTo(68, 10, 52, 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.moveTo(66, -3);
            ctx.lineTo(84, 0);
            ctx.lineTo(66, 3);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        } finally {
          ctx.restore();
        }

        // 5. Layered Swirling Ink-Wash Torrent (multi-thickness calligraphy brush ribbons, NO worm!)
        const waveP = Math.min(1, Math.max(0, (progress - 0.14) / 0.56));
        const easedWave = 1 - Math.pow(1 - waveP, 2.2);
        const startX = hx + 24;
        const headX = startX + easedWave * (scrollHalfW * 1.55);
        const headY = cy - scrollH * 0.08 + Math.sin(easedWave * Math.PI * 1.6) * 28;

        if (waveP > 0.01) {
          const ribbons: Array<{
            width: number;
            color: string;
            yOff: number;
            amp: number;
            alpha: number;
          }> = [
            { width: 32, color: '#111318', yOff: 4, amp: 34, alpha: 0.84 },
            { width: 19, color: '#1e2430', yOff: -8, amp: 42, alpha: 0.72 },
            { width: 10, color: '#2dd4bf', yOff: -12, amp: 38, alpha: 0.65 },
            { width: 6, color: '#f59e0b', yOff: 6, amp: 28, alpha: 0.78 },
            { width: 2.6, color: '#fef08a', yOff: -4, amp: 32, alpha: 0.85 },
          ];

          for (const rb of ribbons) {
            ctx.save();
            try {
              ctx.globalAlpha = rb.alpha;
              ctx.strokeStyle = rb.color;
              ctx.lineWidth = rb.width;
              ctx.lineCap = 'round';
              ctx.beginPath();
              const spanX = Math.max(12, headX - startX);
              ctx.moveTo(startX, cy + scrollH * 0.14 + rb.yOff);
              ctx.bezierCurveTo(
                startX + spanX * 0.32,
                cy - rb.amp * 1.3 + rb.yOff,
                startX + spanX * 0.68,
                cy + rb.amp * 1.1 + rb.yOff,
                headX,
                headY + rb.yOff * 0.4
              );
              ctx.stroke();
            } finally {
              ctx.restore();
            }
          }

          // Stylized Sharp Ink-Wash Dragon Head Crest at the leading wave front!
          ctx.save();
          try {
            ctx.translate(headX, headY);
            ctx.rotate(-0.12 + Math.cos(easedWave * Math.PI * 1.6) * 0.14);

            // Sharp sumi-e dragon skull & snout silhouette
            ctx.fillStyle = '#0e1117';
            ctx.beginPath();
            ctx.moveTo(-26, -18);
            ctx.lineTo(14, -22);
            ctx.lineTo(38, -6);
            ctx.lineTo(28, 8);
            ctx.lineTo(4, 14);
            ctx.lineTo(-24, 10);
            ctx.closePath();
            ctx.fill();

            // Swept calligraphic antlers & mane bristles
            ctx.strokeStyle = '#111318';
            ctx.lineWidth = 4.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-10, -18);
            ctx.quadraticCurveTo(-28, -42, -54, -34);
            ctx.moveTo(-14, -10);
            ctx.quadraticCurveTo(-36, -26, -58, -14);
            ctx.stroke();

            // Luminous jade ridge highlight & fierce golden dragon eye
            ctx.strokeStyle = '#2dd4bf';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(-16, -17);
            ctx.lineTo(12, -20);
            ctx.lineTo(34, -6);
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.moveTo(4, -7);
            ctx.lineTo(16, -9);
            ctx.lineTo(11, -2);
            ctx.closePath();
            ctx.fill();

            // Flowing golden ink whiskers
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.9;
            ctx.beginPath();
            ctx.moveTo(26, -2);
            ctx.quadraticCurveTo(46, -16, 62, -6);
            ctx.moveTo(24, 6);
            ctx.quadraticCurveTo(44, 20, 58, 12);
            ctx.stroke();
          } finally {
            ctx.restore();
          }

          // Dynamic ink splatters & golden bamboo leaves bursting along the sweep
          for (let i = 0; i < 16; i++) {
            const u = (i + 1) / 17;
            const sx = startX + (headX - startX) * u + Math.sin(i * 3.7 + t * 5) * 18;
            const sy =
              cy +
              Math.sin(u * Math.PI * 2.1 + i) * 48 +
              (i % 2 === 0 ? -1 : 1) * (16 + (i % 4) * 9);
            const r = 2.2 + (i % 4) * 1.4;
            ctx.fillStyle = i % 4 === 0 ? '#f59e0b' : i % 3 === 0 ? '#2dd4bf' : 'rgba(17, 19, 24, 0.78)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, r * 1.6, r * 0.75, i * 0.8 + t * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } finally {
        ctx.restore();
      }

      // 6. Traditional Wooden & Jade Scroll Rollers at left/right edges
      const rollerW = 14;
      for (const side of [-1, 1]) {
        const rx = cx + side * scrollHalfW - (side === 1 ? 0 : rollerW);
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.0;
        ctx.fillRect(rx, scrollTop - 12, rollerW, scrollH + 24);
        ctx.strokeRect(rx, scrollTop - 12, rollerW, scrollH + 24);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(rx - 2, scrollTop - 16, rollerW + 4, 8);
        ctx.fillRect(rx - 2, scrollTop + scrollH + 8, rollerW + 4, 8);
      }

      // 7. Monumental Golden Calligraphic "春" + Impact Flash + Rotating Vermilion Seal "静"!
      if (progress >= 0.4) {
        const stampP = Math.min(1, (progress - 0.4) / 0.2);
        const easedStamp = 1 - Math.pow(1 - stampP, 3);
        const scale = 2.35 - 1.35 * easedStamp;
        const fontSize = Math.round(Math.min(safeW, safeH) * 0.36);

        ctx.save();
        try {
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);

          // Expanding impact rings (flat alpha, no shadowBlur)
          ctx.strokeStyle = colorWithAlpha('#f59e0b', Math.max(0, (1 - stampP) * 0.65));
          ctx.lineWidth = 10 * (1 - stampP * 0.5);
          ctx.beginPath();
          ctx.arc(0, 0, 75 + easedStamp * 95, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#ef4444', Math.max(0, (1 - stampP) * 0.5));
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 58 + easedStamp * 125, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = `900 ${fontSize}px Georgia, "Times New Roman", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Ink-wash drop shadow offset (no shadowBlur!)
          ctx.fillStyle = 'rgba(14, 17, 24, 0.42)';
          ctx.fillText('春', 7, 11);

          // Thick sumi-e ink outline
          ctx.lineWidth = 11;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#111318';
          ctx.strokeText('春', 0, 4);

          // Rich golden Kim Mặc gradient fill
          const goldGrad = ctx.createLinearGradient(0, -fontSize * 0.45, 0, fontSize * 0.45);
          goldGrad.addColorStop(0, '#fef9c3');
          goldGrad.addColorStop(0.42, '#f59e0b');
          goldGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = goldGrad;
          ctx.fillText('春', 0, 4);

          // Crisp luminous golden rim
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = '#fef08a';
          ctx.strokeText('春', 0, 4);

          // Translucent rotating vermilion seal ring "静" beside "春" (no heavy opaque box!)
          const sx = fontSize * 0.54;
          const sy = fontSize * 0.24;
          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.6;
            ctx.setLineDash([12, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.font = '900 28px Georgia, serif';
            ctx.lineWidth = 3.2;
            ctx.strokeStyle = 'rgba(17, 19, 24, 0.8)';
            ctx.strokeText('静', 0, 2);
            ctx.fillStyle = '#ef4444';
            ctx.fillText('静', 0, 2);
          } finally {
            ctx.restore();
          }
        } finally {
          ctx.restore();
        }

        // Brief bright impact flash wash right on seal strike
        if (impactAge >= 0 && impactAge < 0.14) {
          const flashAlpha = (1 - impactAge / 0.14) * 0.42;
          ctx.fillStyle = colorWithAlpha('#fef9c3', flashAlpha);
          ctx.fillRect(-20, -20, safeW + 40, safeH + 40);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * MẶC TIÊN (MYTHIC: XUÂN PHONG VĂN THÁNH) — 春風 · Nhất Khí Hạo Nhiên
   * High-contrast 3-Phase Dark Ink-Night Cutscene (#070d12) matching chrono_sovereign pacing:
   * - Phase 1 (0%–45%, 0..1.215s): 3 giant counter-rotating Literary Wheels + inward ink/petal vortex
   * - Phase 2 (45%–70%, 1.215..1.89s): Radial ink/jade speedlines + perspective shattered bamboo slips
   * - Phase 3 (70%–100%, 1.89..2.70s): Real renderStickman (left) in Moonlight-Jade aura + Cinnabar/Jade Seal Frame stamping "春" (right) + Impact Frame & shake
   */
  private renderXuanFengSageCutscene(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
    const easeOutCubic = (v: number): number => 1 - Math.pow(1 - clamp01(v), 3);
    const easeInCubic = (v: number): number => {
      const c = clamp01(v);
      return c * c * c;
    };

    const safeW = Math.max(1, finiteOr(viewW, 1280));
    const safeH = Math.max(1, finiteOr(viewH, 720));
    const cx = safeW * 0.5;
    const cy = safeH * 0.5;
    const t = finiteOr(this.timer, 0);
    const dur = Math.max(0.01, finiteOr(this.duration, 2.7));
    const progress = clamp01(t / dur);
    const baseR = Math.min(safeW, safeH) * 0.41;
    const diag = Math.hypot(safeW, safeH);

    const INK_NIGHT = '#070d12';
    const MOONLIGHT = '#f8fafc';
    const MOONLIGHT_MINT = '#f0fdfa';
    const JADE_TEAL = '#5eead4';
    const JADE_DEEP = '#2dd4bf';
    const PALE_GOLD = '#fde68a';
    const PEACH_PINK = '#fda4af';
    const CINNABAR = '#dc2626';
    const CINNABAR_DARK = '#991b1b';

    const LITERARY_CHARS = ['春', '風', '靜', '禮', '義', '仁', '智', '信', '文', '道', '清', '雅'] as const;

    const drawLiteraryWheels = (wheelScale: number, alpha: number): void => {
      if (alpha <= 0.01 || wheelScale <= 0.01) return;
      ctx.save();
      try {
        ctx.translate(cx, cy);
        ctx.globalAlpha = alpha;

        // Wheel 1 (Outer): Ancient calligraphy ring + 24 Confucian ticks + pale-gold / jade rims
        const r1 = baseR * 1.04 * wheelScale;
        ctx.save();
        try {
          ctx.rotate(t * 0.55);

          ctx.strokeStyle = colorWithAlpha(JADE_TEAL, 0.24);
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.arc(0, 0, r1, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = INK_NIGHT;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(0, 0, r1, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = PALE_GOLD;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.arc(0, 0, r1 + 6, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = JADE_TEAL;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, r1 - 6, 0, Math.PI * 2);
          ctx.stroke();

          // 24 engraved Heaven-Earth tick marks
          for (let i = 0; i < 24; i++) {
            const a = (i * Math.PI * 2) / 24;
            const major = i % 2 === 0;
            const tr0 = r1 * (major ? 0.87 : 0.92);
            const tr1 = r1 * 0.985;
            ctx.strokeStyle = major ? PALE_GOLD : colorWithAlpha(JADE_TEAL, 0.7);
            ctx.lineWidth = major ? 2.4 : 1.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * tr0, Math.sin(a) * tr0);
            ctx.lineTo(Math.cos(a) * tr1, Math.sin(a) * tr1);
            ctx.stroke();
          }

          // 12 crisp ancient calligraphy characters
          const charR = r1 * 0.86;
          const charSize = Math.max(13, Math.round(r1 * 0.135));
          ctx.font = `900 ${charSize}px "Noto Serif JP", "Yu Mincho", Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (let i = 0; i < LITERARY_CHARS.length; i++) {
            const a = (i * Math.PI * 2) / LITERARY_CHARS.length - Math.PI * 0.5;
            ctx.save();
            try {
              ctx.translate(Math.cos(a) * charR, Math.sin(a) * charR);
              ctx.rotate(a + Math.PI * 0.5);
              ctx.strokeStyle = INK_NIGHT;
              ctx.lineWidth = 4;
              ctx.strokeText(LITERARY_CHARS[i], 0, 0);
              ctx.fillStyle = i % 3 === 0 ? PALE_GOLD : MOONLIGHT_MINT;
              ctx.fillText(LITERARY_CHARS[i], 0, 0);
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }

        // Wheel 2 (Middle): Counter-rotating thick-thin Enso brush stroke + octagonal scripture frame
        const r2 = baseR * 0.69 * wheelScale;
        ctx.save();
        try {
          ctx.rotate(-t * 0.95);

          // Inscribed octagon in pale gold & jade teal
          ctx.strokeStyle = colorWithAlpha(PALE_GOLD, 0.55);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i <= 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            const ox = Math.cos(a) * r2 * 1.07;
            const oy = Math.sin(a) * r2 * 1.07;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
          }
          ctx.stroke();

          // Thick-thin variable-width Enso brush stroke (28 tapered segments, open Zen gap)
          const segs = 28;
          const startAng = -Math.PI * 0.82;
          const arcSpan = Math.PI * 1.82;
          ctx.lineCap = 'round';
          for (let s = 0; s < segs; s++) {
            const u0 = s / segs;
            const u1 = (s + 1) / segs;
            const a0 = startAng + arcSpan * u0;
            const a1 = startAng + arcSpan * u1;
            const taper = Math.sin(u0 * Math.PI * 0.92 + 0.14);
            const widthBase = 3 + taper * 12;

            ctx.strokeStyle = colorWithAlpha(JADE_TEAL, 0.34);
            ctx.lineWidth = widthBase + 9;
            ctx.beginPath();
            ctx.arc(0, 0, r2, a0, a1);
            ctx.stroke();

            ctx.strokeStyle = INK_NIGHT;
            ctx.lineWidth = widthBase + 3.2;
            ctx.beginPath();
            ctx.arc(0, 0, r2, a0, a1);
            ctx.stroke();

            ctx.strokeStyle = s % 2 === 0 ? JADE_TEAL : MOONLIGHT;
            ctx.lineWidth = Math.max(1.8, widthBase * 0.55);
            ctx.beginPath();
            ctx.arc(0, 0, r2, a0, a1);
            ctx.stroke();
          }

          // 8 cardinal seal nodes
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            const nx = Math.cos(a) * r2 * 1.07;
            const ny = Math.sin(a) * r2 * 1.07;
            ctx.fillStyle = i % 2 === 0 ? PALE_GOLD : JADE_TEAL;
            ctx.strokeStyle = INK_NIGHT;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(nx, ny - 5);
            ctx.lineTo(nx + 5, ny);
            ctx.lineTo(nx, ny + 5);
            ctx.lineTo(nx - 5, ny);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }

        // Wheel 3 (Inner): Fast-spinning pale-gold & jade-teal scripture core wheel
        const r3 = baseR * 0.38 * wheelScale;
        ctx.save();
        try {
          ctx.rotate(t * 1.7);

          ctx.strokeStyle = JADE_TEAL;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, r3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = PALE_GOLD;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, r3 * 0.76, 0, Math.PI * 2);
          ctx.stroke();

          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            ctx.strokeStyle = colorWithAlpha(i % 2 === 0 ? JADE_TEAL : PALE_GOLD, 0.72);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r3 * 0.32, Math.sin(a) * r3 * 0.32);
            ctx.lineTo(Math.cos(a) * r3 * 0.96, Math.sin(a) * r3 * 0.96);
            ctx.stroke();
          }

          // Central glowing seal core
          ctx.fillStyle = INK_NIGHT;
          ctx.strokeStyle = PALE_GOLD;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, r3 * 0.34, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = JADE_TEAL;
          ctx.font = `900 ${Math.max(14, Math.round(r3 * 0.38))}px "Noto Serif JP", Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('文', 0, 1);
        } finally {
          ctx.restore();
        }
      } finally {
        ctx.restore();
      }
    };

    const drawPeachPetal = (px: number, py: number, len: number, wid: number, rot: number, alpha: number): void => {
      ctx.save();
      try {
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = PEACH_PINK;
        ctx.beginPath();
        ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fecdd3';
        ctx.beginPath();
        ctx.ellipse(-len * 0.15, -wid * 0.15, len * 0.55, wid * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }
    };

    ctx.save();
    try {
      // PHASE 1 — Literary Wheel Convergence (0%–45%, 0..1.215s)
      if (progress < 0.45) {
        const p = clamp01(progress / 0.45);
        const ease = easeOutCubic(p);

        // Deep ink-night radial backdrop (#070d12)
        const bg = ctx.createRadialGradient(cx, cy, baseR * 0.12, cx, cy, Math.max(safeW, safeH) * 0.74);
        bg.addColorStop(0, '#102933');
        bg.addColorStop(0.45, INK_NIGHT);
        bg.addColorStop(1, '#020407');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, safeW, safeH);

        // Subtle celestial jade/gold rays
        ctx.save();
        try {
          ctx.translate(cx, cy);
          ctx.globalCompositeOperation = 'lighter';
          for (let r = 0; r < 12; r++) {
            const ra = (r * Math.PI * 2) / 12 + t * 0.24;
            ctx.strokeStyle = colorWithAlpha(r % 2 === 0 ? JADE_TEAL : PALE_GOLD, 0.16 + 0.12 * ease);
            ctx.lineWidth = r % 3 === 0 ? 4.5 : 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ra) * baseR * 0.25, Math.sin(ra) * baseR * 0.25);
            ctx.lineTo(Math.cos(ra) * diag * 0.58, Math.sin(ra) * diag * 0.58);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }

        // 3 Giant concentric counter-rotating Literary Wheels scaling up sharply
        const wheelScale = 0.28 + ease * 0.78;
        drawLiteraryWheels(wheelScale, Math.min(1, 0.35 + ease * 0.75));

        // Inward vortex of ink ribbons & peach blossom petals
        ctx.save();
        try {
          ctx.translate(cx, cy);
          const ribbonCount = 10;
          for (let i = 0; i < ribbonCount; i++) {
            const baseAng = (i * Math.PI * 2) / ribbonCount + t * 1.85;
            const rOuter = diag * 0.56 * (1 - p * 0.48);
            const rMid = rOuter * 0.56;
            const rInner = Math.max(18, baseR * 0.18 * (1 - p * 0.5));
            const sx = Math.cos(baseAng) * rOuter;
            const sy = Math.sin(baseAng) * rOuter;
            const mx = Math.cos(baseAng + 0.65) * rMid;
            const my = Math.sin(baseAng + 0.65) * rMid;
            const ex = Math.cos(baseAng + 1.35) * rInner;
            const ey = Math.sin(baseAng + 1.35) * rInner;

            ctx.lineCap = 'round';
            ctx.strokeStyle = colorWithAlpha(INK_NIGHT, 0.82);
            ctx.lineWidth = i % 2 === 0 ? 8 : 5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(mx, my, ex, ey);
            ctx.stroke();

            ctx.strokeStyle = colorWithAlpha(
              i % 3 === 0 ? PALE_GOLD : i % 2 === 0 ? JADE_TEAL : MOONLIGHT,
              0.72
            );
            ctx.lineWidth = i % 2 === 0 ? 3.2 : 2.0;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(mx, my, ex, ey);
            ctx.stroke();
          }

          // 28 spiraling peach blossom petals & jade ink sparks
          const petalCount = 28;
          for (let i = 0; i < petalCount; i++) {
            const phase = (i / petalCount + p * 0.85) % 1;
            const spiralDist = diag * 0.54 * (1 - easeInCubic(phase * 0.88));
            const a = (i * Math.PI * 2) / petalCount + phase * 3.8 + t * 1.4;
            const px = Math.cos(a) * spiralDist;
            const py = Math.sin(a) * spiralDist * 0.78;
            if (i % 4 === 0) {
              ctx.fillStyle = colorWithAlpha(JADE_TEAL, 0.85);
              ctx.beginPath();
              ctx.arc(px, py, 2.8, 0, Math.PI * 2);
              ctx.fill();
            } else {
              drawPeachPetal(px, py, 5.5 + (i % 3), 2.8, a + t * 3, 0.88);
            }
          }
        } finally {
          ctx.restore();
        }
      } else if (progress < 0.70) {
        // PHASE 2 — Space Shatter / Transition (45%–70%, 1.215..1.89s)
        const p = clamp01((progress - 0.45) / 0.25);
        const ease = easeOutCubic(p);

        ctx.fillStyle = INK_NIGHT;
        ctx.fillRect(0, 0, safeW, safeH);

        ctx.save();
        try {
          ctx.translate(cx, cy);

          // Expanding jade-moonlight burst glow at shatter center
          const burstR = Math.max(40, diag * (0.14 + ease * 0.48));
          const burstGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, burstR);
          burstGrad.addColorStop(0, colorWithAlpha(MOONLIGHT_MINT, (1 - p * 0.65) * 0.48));
          burstGrad.addColorStop(0.45, colorWithAlpha(JADE_TEAL, (1 - p * 0.5) * 0.28));
          burstGrad.addColorStop(1, 'rgba(7, 13, 18, 0)');
          ctx.fillStyle = burstGrad;
          ctx.beginPath();
          ctx.arc(0, 0, burstR, 0, Math.PI * 2);
          ctx.fill();

          // 28 Radial ink streaks & jade-teal silk speedlines bursting outward
          const lineCount = 28;
          for (let i = 0; i < lineCount; i++) {
            const a = (i * Math.PI * 2) / lineCount + (i % 2 === 0 ? 0.04 : -0.04);
            const rInner = baseR * (0.08 + ease * 0.34) + (i % 4) * 14;
            const rOuter = diag * (0.45 + ease * 0.68);
            const halfW = (i % 3 === 0 ? 5.5 : 2.6) * (1 - p * 0.35);
            const nx = -Math.sin(a);
            const ny = Math.cos(a);

            ctx.fillStyle =
              i % 4 === 0
                ? PALE_GOLD
                : i % 2 === 0
                  ? JADE_TEAL
                  : MOONLIGHT;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
            ctx.lineTo(Math.cos(a) * rOuter + nx * halfW, Math.sin(a) * rOuter + ny * halfW);
            ctx.lineTo(Math.cos(a) * rOuter - nx * halfW, Math.sin(a) * rOuter - ny * halfW);
            ctx.closePath();
            ctx.fill();
          }

          // 12 jagged ink-fracture cracks radiating across space
          const crackCount = 12;
          for (let i = 0; i < crackCount; i++) {
            const a = (i * Math.PI * 2) / crackCount + 0.14;
            const len = diag * (0.35 + ease * 0.55);
            const mx = Math.cos(a + 0.07) * len * 0.46;
            const my = Math.sin(a + 0.07) * len * 0.46;
            const ex = Math.cos(a) * len;
            const ey = Math.sin(a) * len;

            ctx.strokeStyle = i % 2 === 0 ? JADE_TEAL : PALE_GOLD;
            ctx.lineWidth = i % 3 === 0 ? 3.4 : 1.9;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(mx, my);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }

          // Perspective shattered bamboo slips (Trúc Giản) & scripture pages flying toward camera
          const slipCount = 16;
          for (let i = 0; i < slipCount; i++) {
            const a = (i * Math.PI * 2) / slipCount + (i % 3) * 0.12;
            const depthZ = 1.9 - ease * 1.55 - (i % 4) * 0.08;
            const persp = 1 / Math.max(0.24, depthZ);
            const radial = baseR * (0.28 + ease * 0.85) * persp * 0.65;
            const sx = Math.cos(a) * radial;
            const sy = Math.sin(a) * radial * 0.72;
            const slipScale = Math.min(3.4, persp * (0.72 + (i % 3) * 0.16));
            const tumble = a + Math.PI * 0.5 + p * 2.6 * (i % 2 === 0 ? 1 : -1);
            const pitchScale = 0.45 + 0.55 * Math.abs(Math.cos(p * 3.8 + i));
            const isScripturePage = i % 3 === 0;

            ctx.save();
            try {
              ctx.translate(sx, sy);
              ctx.rotate(tumble);
              ctx.scale(slipScale, slipScale * pitchScale);

              if (isScripturePage) {
                // Flying torn scripture page with glowing jade fracture edge
                ctx.fillStyle = colorWithAlpha(MOONLIGHT, 0.92);
                ctx.strokeStyle = JADE_TEAL;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(-14, -20);
                ctx.lineTo(15, -17);
                ctx.lineTo(12, 19);
                ctx.lineTo(-16, 15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Miniature vertical ink calligraphy strokes on the flying page
                ctx.strokeStyle = INK_NIGHT;
                ctx.lineWidth = 1.6;
                for (let l = -1; l <= 1; l++) {
                  ctx.beginPath();
                  ctx.moveTo(l * 6, -11);
                  ctx.lineTo(l * 6, 11);
                  ctx.stroke();
                }
              } else {
                // Shattered Jade-White Bamboo Slip (Trúc Giản) with pale-gold binding cords
                ctx.fillStyle = i % 2 === 0 ? MOONLIGHT_MINT : '#99f6e4';
                ctx.strokeStyle = INK_NIGHT;
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.rect(-7, -22, 14, 44);
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = PALE_GOLD;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(-7, -13);
                ctx.lineTo(7, -13);
                ctx.moveTo(-7, 13);
                ctx.lineTo(7, 13);
                ctx.stroke();

                ctx.fillStyle = INK_NIGHT;
                ctx.fillRect(-1.5, -8, 3, 16);
              }
            } finally {
              ctx.restore();
            }
          }

          // Pre-impact convergence flash tightening as Phase 2 ends
          if (p > 0.72) {
            const cP = (p - 0.72) / 0.28;
            ctx.strokeStyle = colorWithAlpha(MOONLIGHT_MINT, cP * 0.85);
            ctx.lineWidth = 4 + cP * 6;
            ctx.beginPath();
            ctx.arc(0, 0, baseR * (1.2 - cP * 0.95), 0, Math.PI * 2);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      } else {
        // PHASE 3 — Grand Seal Impact (70%–100%, 1.89..2.70s)
        const p = clamp01((progress - 0.70) / 0.30);

        // Decaying canvas screen shake on Grand Seal slam
        const shakeDecay = p < 0.26 ? 1 - p / 0.26 : 0;
        const shakeMag = shakeDecay * shakeDecay * 14;
        const shakeX = shakeMag > 0.1 ? Math.sin(t * 142) * shakeMag : 0;
        const shakeY = shakeMag > 0.1 ? Math.cos(t * 168) * shakeMag * 0.75 : 0;

        // Deep ink-night #070d12 background (unshaken base fill)
        const bg = ctx.createRadialGradient(
          safeW * 0.34,
          safeH * 0.52,
          24,
          safeW * 0.5,
          safeH * 0.5,
          diag * 0.65
        );
        bg.addColorStop(0, '#102c36');
        bg.addColorStop(0.45, INK_NIGHT);
        bg.addColorStop(1, '#020406');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, safeW, safeH);

        ctx.save();
        try {
          ctx.translate(shakeX, shakeY);

          // Lingering background Literary Wheel resonance for visual continuity
          drawLiteraryWheels(1.08, 0.22 * (1 - p * 0.35));

          // Crisp anime horizontal energy streaks across the dark ink night
          for (let i = 0; i < 16; i++) {
            const sy = ((i + 0.5) / 16) * safeH;
            const speedOffset = ((t * 1800 + i * 193) % (safeW * 1.4)) - safeW * 0.2;
            const lineLen = 90 + (i % 4) * 75;
            ctx.strokeStyle = colorWithAlpha(
              i % 3 === 0 ? PALE_GOLD : JADE_TEAL,
              0.18 + (i % 2) * 0.10
            );
            ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.3;
            ctx.beginPath();
            ctx.moveTo(speedOffset, sy);
            ctx.lineTo(speedOffset + lineLen, sy);
            ctx.stroke();
          }

          // LEFT: Full-detail xuan_feng_sage via REAL renderStickman inside radiant Moonlight-Jade aura
          const slideEase = easeOutCubic(clamp01(p / 0.18));
          const charX = safeW * (0.16 + 0.10 * slideEase);
          const charFootY = safeH * 0.77;
          const charScale = Math.min(2.65, Math.max(1.45, safeH * 0.0036));
          const auraCenterY = charFootY - 54 * charScale;

          // Radiant Moonlight-Jade Aura behind character (no shadowBlur)
          ctx.save();
          try {
            const auraR = 98 * charScale;
            const auraGrad = ctx.createRadialGradient(charX, auraCenterY, 8, charX, auraCenterY, auraR);
            auraGrad.addColorStop(0, colorWithAlpha(MOONLIGHT_MINT, 0.44));
            auraGrad.addColorStop(0.42, colorWithAlpha(JADE_TEAL, 0.28));
            auraGrad.addColorStop(0.76, colorWithAlpha(PALE_GOLD, 0.10));
            auraGrad.addColorStop(1, 'rgba(7, 13, 18, 0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(charX, auraCenterY, auraR, 0, Math.PI * 2);
            ctx.fill();

            // Expanding moonlight-jade impact rings around character
            if (p < 0.55) {
              const rp = p / 0.55;
              ctx.strokeStyle = colorWithAlpha(JADE_TEAL, (1 - rp) * 0.65);
              ctx.lineWidth = 4 * (1 - rp * 0.5);
              ctx.beginPath();
              ctx.arc(charX, auraCenterY, 36 + easeOutCubic(rp) * 165, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = colorWithAlpha(PALE_GOLD, (1 - rp) * 0.48);
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(charX, auraCenterY, 24 + easeOutCubic(rp) * 210, 0, Math.PI * 2);
              ctx.stroke();
            }
          } finally {
            ctx.restore();
          }

          // Real full-detail xuan_feng_sage character via renderStickman + getCharacterDef
          const def = getCharacterDef('mactien', 'xuan_feng_sage');
          const vfx = getSkinVfxProfile('mactien', 'xuan_feng_sage');
          const scarfNodes: ScarfNode[] = [];
          for (let s = 0; s < 6; s++) {
            const sx = -s * 11;
            const sy = GROUND_Y - 70 + Math.sin(t * 7.5 - s * 0.65) * (1.8 + s * 1.1) + s * 1.4;
            scarfNodes.push({ x: sx, y: sy, oldX: sx, oldY: sy });
          }

          ctx.save();
          try {
            ctx.translate(charX, charFootY);
            ctx.scale(charScale, charScale);
            ctx.translate(0, -GROUND_Y);
            renderStickman(ctx, {
              x: 0,
              y: GROUND_Y,
              facing: 1,
              pose: 'parry',
              poseTime: t,
              walkPhase: 0,
              bodyColor: def.awakenedBodyColor,
              glowColor: def.glowColor,
              lineWidth: 10.6,
              headRadius: 12.8,
              scarf: scarfNodes,
              scarfPrimary: def.scarfPrimary,
              scarfHighlight: def.scarfHighlight,
              hasSheath: def.hasSheath,
              headGear: def.headGear,
              characterId: 'mactien',
              awakened: true,
              darkAura: def.awakenedAuraStyle,
              weapon: def.awakenedWeapon,
              awakenedForm: 'mactien',
              skinId: 'xuan_feng_sage',
              attackAuraColor: vfx.swingAuraColor,
              attackAuraSecondary: vfx.swingAuraSecondary,
              vfxMotif: vfx.motif,
              auraRimColor: vfx.auraTendrilPrimary,
              auraPuddleColor: vfx.auraTendrilSecondary,
              inkRimColor: JADE_TEAL,
              inkAccent: PALE_GOLD,
            });
          } finally {
            ctx.restore();
          }

          // RIGHT: Vibrant Cinnabar-Red / Jade-Teal Seal Frame slamming massive razor-sharp "春"
          const slamP = clamp01(p / 0.18);
          const sealScale = slamP < 1 ? 2.35 - 1.35 * easeOutCubic(slamP) : 1.0 + p * 0.03;
          const sealAlpha = p > 0.80 ? Math.max(0, 1 - (p - 0.80) / 0.20) : 1;
          const sealX = safeW * 0.67;
          const sealY = safeH * 0.49;
          const boxHalf = Math.min(108, safeH * 0.25);

          ctx.save();
          try {
            ctx.translate(sealX, sealY);
            ctx.scale(sealScale, sealScale);
            ctx.globalAlpha = sealAlpha;

            // Shockwave ring behind Seal on impact
            if (p < 0.45) {
              const sp = p / 0.45;
              ctx.strokeStyle = colorWithAlpha(JADE_TEAL, (1 - sp) * 0.72);
              ctx.lineWidth = 4.5 * (1 - sp * 0.4);
              ctx.beginPath();
              ctx.arc(0, 0, boxHalf * (1.1 + easeOutCubic(sp) * 1.15), 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = colorWithAlpha(CINNABAR, (1 - sp) * 0.58);
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, boxHalf * (0.95 + easeOutCubic(sp) * 1.45), 0, Math.PI * 2);
              ctx.stroke();
            }

            // Cinnabar & jade ink splatters framing the seal slam
            const splatters: Array<[number, number, number, string]> = [
              [-1.24, -0.94, 6.5, CINNABAR],
              [1.18, -0.82, 8, JADE_TEAL],
              [-1.08, 1.06, 5.5, JADE_TEAL],
              [1.26, 0.92, 7.5, CINNABAR],
              [-1.36, 0.14, 4.5, PALE_GOLD],
              [1.32, -0.18, 5.5, CINNABAR],
              [0.36, -1.28, 5, JADE_TEAL],
              [-0.46, 1.22, 6, PALE_GOLD],
            ];
            for (const [sx, sy, sr, col] of splatters) {
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.arc(sx * boxHalf, sy * boxHalf, sr, 0, Math.PI * 2);
              ctx.fill();
            }

            // Outer Jade-Teal luminous seal frame halo (no shadowBlur)
            ctx.strokeStyle = colorWithAlpha(JADE_TEAL, 0.48);
            ctx.lineWidth = 10;
            ctx.strokeRect(-boxHalf - 6, -boxHalf - 6, (boxHalf + 6) * 2, (boxHalf + 6) * 2);

            ctx.strokeStyle = JADE_TEAL;
            ctx.lineWidth = 3;
            ctx.strokeRect(-boxHalf - 6, -boxHalf - 6, (boxHalf + 6) * 2, (boxHalf + 6) * 2);

            // Vibrant Cinnabar-Red Seal Body
            const sealGrad = ctx.createLinearGradient(-boxHalf, -boxHalf, boxHalf, boxHalf);
            sealGrad.addColorStop(0, '#ef4444');
            sealGrad.addColorStop(0.55, CINNABAR);
            sealGrad.addColorStop(1, CINNABAR_DARK);
            ctx.fillStyle = sealGrad;
            ctx.fillRect(-boxHalf, -boxHalf, boxHalf * 2, boxHalf * 2);

            // Bold ink-night border & inner pale-gold Chữ Triện hairline
            ctx.strokeStyle = INK_NIGHT;
            ctx.lineWidth = 6.5;
            ctx.strokeRect(-boxHalf, -boxHalf, boxHalf * 2, boxHalf * 2);

            ctx.strokeStyle = colorWithAlpha(PALE_GOLD, 0.85);
            ctx.lineWidth = 2;
            ctx.strokeRect(-boxHalf + 8, -boxHalf + 8, (boxHalf - 8) * 2, (boxHalf - 8) * 2);

            // Jade-Teal & Pale-Gold corner filigree brackets
            const br = 18;
            ctx.strokeStyle = PALE_GOLD;
            ctx.lineWidth = 3;
            for (const cxSign of [-1, 1]) {
              for (const cySign of [-1, 1]) {
                const bx = cxSign * (boxHalf + 11);
                const by = cySign * (boxHalf + 11);
                ctx.beginPath();
                ctx.moveTo(bx - cxSign * br, by);
                ctx.lineTo(bx, by);
                ctx.lineTo(bx, by - cySign * br);
                ctx.stroke();
              }
            }

            // Massive, razor-sharp calligraphy "春"
            const kanjiFontSize = Math.round(boxHalf * 1.54);
            ctx.font = `900 ${kanjiFontSize}px "Noto Serif JP", "Yu Mincho", Georgia, serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';

            ctx.lineWidth = 11;
            ctx.strokeStyle = INK_NIGHT;
            ctx.strokeText('春', 0, boxHalf * 0.06);

            ctx.lineWidth = 4.2;
            ctx.strokeStyle = JADE_TEAL;
            ctx.strokeText('春', 0, boxHalf * 0.06);

            const kanjiGrad = ctx.createLinearGradient(0, -boxHalf * 0.72, 0, boxHalf * 0.78);
            kanjiGrad.addColorStop(0, MOONLIGHT);
            kanjiGrad.addColorStop(0.65, MOONLIGHT_MINT);
            kanjiGrad.addColorStop(1, PALE_GOLD);
            ctx.fillStyle = kanjiGrad;
            ctx.fillText('春', 0, boxHalf * 0.06);

            // Refined subtitle strip below the seal
            const tagW = boxHalf * 1.86;
            const tagH = 24;
            const tagY = boxHalf + 24;
            ctx.fillStyle = colorWithAlpha(INK_NIGHT, 0.92);
            ctx.strokeStyle = JADE_DEEP;
            ctx.lineWidth = 1.6;
            ctx.fillRect(-tagW * 0.5, tagY - tagH * 0.5, tagW, tagH);
            ctx.strokeRect(-tagW * 0.5, tagY - tagH * 0.5, tagW, tagH);

            ctx.font = '800 12px "Barlow Condensed", sans-serif';
            ctx.fillStyle = PALE_GOLD;
            ctx.fillText('春風 · NHẤT KHÍ HẠO NHIÊN', 0, tagY + 0.5);
          } finally {
            ctx.restore();
          }

          // Foreground drifting peach blossom petals & jade glints
          for (let i = 0; i < 14; i++) {
            const u = ((i + 0.3) / 14 + p * 0.55) % 1;
            const px = u * safeW;
            const py = safeH * (0.16 + ((i * 37) % 68) / 100) + Math.sin(t * 3.4 + i) * 14;
            drawPeachPetal(px, py, 5 + (i % 3), 2.5, t * 2.2 + i, 0.85 * (1 - p * 0.35));
          }
        } finally {
          ctx.restore();
        }

        // High-Contrast Impact Frame Flash at Phase 3 entry (1.89..2.00s)
        if (p < 0.14) {
          if (p < 0.045) {
            // Crisp inverted Moonlight-White & Ink-Night Impact Frame
            ctx.fillStyle = colorWithAlpha(MOONLIGHT_MINT, 0.88);
            ctx.fillRect(0, 0, safeW, safeH);

            ctx.save();
            try {
              ctx.translate(safeW * 0.67, safeH * 0.49);
              ctx.fillStyle = INK_NIGHT;
              for (let i = 0; i < 16; i++) {
                const a = (i * Math.PI * 2) / 16;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 42, Math.sin(a) * 42);
                ctx.lineTo(Math.cos(a + 0.03) * diag * 0.65, Math.sin(a + 0.03) * diag * 0.65);
                ctx.lineTo(Math.cos(a - 0.03) * diag * 0.65, Math.sin(a - 0.03) * diag * 0.65);
                ctx.closePath();
                ctx.fill();
              }
            } finally {
              ctx.restore();
            }
          } else {
            const flashDecay = 1 - (p - 0.045) / 0.095;
            ctx.fillStyle = colorWithAlpha(JADE_TEAL, Math.max(0, flashDecay * 0.48));
            ctx.fillRect(0, 0, safeW, safeH);
          }
        }
      }
    } finally {
      ctx.restore();
    }
  }
}