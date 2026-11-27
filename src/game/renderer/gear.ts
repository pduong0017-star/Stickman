import type { CharacterId, SkinId, Vec2 } from '../types';
import { colorWithAlpha, finiteOr, getSkinInkPalette, type SkinInkPalette } from './inkStyle';
import type {
  BossStyleOutfit,
  EnemyOutfitId,
  SkeletonJoints,
  StickmanRenderOptions,
} from './types';
import { getModularSkin } from './skins/registry';

function safePt(v: Vec2 | undefined, fx = 0, fy = 0): { x: number; y: number } {
  return {
    x: finiteOr(v?.x, fx),
    y: finiteOr(v?.y, fy),
  };
}

function safeHeadRadius(headR: number): number {
  return Math.max(4, finiteOr(headR, 12));
}

function safeClock(time: number | undefined): number {
  return finiteOr(time, 0);
}

function inferCharacterFromSkin(skinId?: SkinId, characterId?: CharacterId): CharacterId {
  if (skinId === 'radiant_seraph' || skinId === 'void_walker' || skinId === 'eclipse_ronin') {
    return 'kuro';
  }
  if (skinId === 'storm_shogun' || skinId === 'cyber_valkyrie') {
    return 'raijin';
  }
  if (skinId === 'solar_phoenix' || skinId === 'frost_empress') {
    return 'kagura';
  }
  if (skinId === 'blood_moon' || skinId === 'astral_phantom') {
    return 'zero';
  }
  if (skinId === 'prismatic_archon') {
    return 'aether';
  }
  if (skinId === 'celestial_empress' || skinId === 'abyssal_valkyrie') {
    return 'valkyrie';
  }
  if (skinId === 'void_shatterer') {
    return 'mirage';
  }
  if (skinId === 'chrono_sovereign') {
    return 'chrono';
  }
  if (skinId === 'xuan_feng_sage') {
    return 'mactien';
  }
  return characterId ?? 'kuro';
}

function normalizeStyleString(style: unknown): string {
  return typeof style === 'string' ? style.trim().toLowerCase() : '';
}

function matchesAnyColor(style: string, targets: string[]): boolean {
  if (!style) return false;
  return targets.includes(style);
}

function inferOniHornsVariant(
  ctx: CanvasRenderingContext2D,
  skinId?: SkinId,
  characterId?: CharacterId
): 'eclipse_ronin' | 'frost_empress' {
  if (skinId === 'eclipse_ronin' || characterId === 'kuro') return 'eclipse_ronin';
  if (skinId === 'frost_empress' || characterId === 'kagura') return 'frost_empress';

  // Fallback when caller (e.g. StickmanRenderer) does not forward skinId/characterId:
  // inspect fillStyle/strokeStyle left by drawInkHead immediately prior.
  const fill = normalizeStyleString(ctx.fillStyle);
  const stroke = normalizeStyleString(ctx.strokeStyle);
  if (
    matchesAnyColor(fill, ['#09090b', 'rgb(9, 9, 11)', '#1a0404', 'rgb(26, 4, 4)']) ||
    matchesAnyColor(stroke, ['#fed7aa', 'rgb(254, 215, 170)', '#fde047', 'rgb(253, 224, 71)'])
  ) {
    return 'eclipse_ronin';
  }
  return 'frost_empress';
}

function inferValkyrieVariant(
  ctx: CanvasRenderingContext2D,
  skinId?: SkinId
): 'default' | 'celestial_empress' | 'abyssal_valkyrie' {
  if (skinId === 'celestial_empress') return 'celestial_empress';
  if (skinId === 'abyssal_valkyrie') return 'abyssal_valkyrie';
  if (skinId === 'default') return 'default';

  const fill = normalizeStyleString(ctx.fillStyle);
  const stroke = normalizeStyleString(ctx.strokeStyle);
  if (
    matchesAnyColor(fill, ['#060a14', 'rgb(6, 10, 20)', '#0f172a', 'rgb(15, 23, 42)']) ||
    matchesAnyColor(stroke, ['#e0f2fe', 'rgb(224, 242, 254)', '#fef08a', 'rgb(254, 240, 138)'])
  ) {
    return 'celestial_empress';
  }
  if (
    matchesAnyColor(fill, ['#09090b', 'rgb(9, 9, 11)', '#1a020a', 'rgb(26, 2, 10)']) ||
    matchesAnyColor(stroke, ['#fda4af', 'rgb(253, 164, 175)', '#f0abfc', 'rgb(240, 171, 252)'])
  ) {
    return 'abyssal_valkyrie';
  }
  return 'default';
}

function inferAstralHaloVariant(
  ctx: CanvasRenderingContext2D,
  skinId?: SkinId
): 'default' | 'prismatic_archon' {
  if (skinId === 'prismatic_archon') return 'prismatic_archon';
  if (skinId === 'default') return 'default';

  const fill = normalizeStyleString(ctx.fillStyle);
  const stroke = normalizeStyleString(ctx.strokeStyle);
  if (
    matchesAnyColor(fill, ['#0e0b2b', 'rgb(14, 11, 43)', '#151238', 'rgb(21, 18, 56)']) ||
    matchesAnyColor(stroke, ['#fef08a', 'rgb(254, 240, 138)'])
  ) {
    return 'prismatic_archon';
  }
  return 'default';
}

function drawInkEyeSlit(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  outerColor: string,
  coreColor = '#ffffff',
  scale = 1
): void {
  ctx.fillStyle = outerColor;
  ctx.beginPath();
  ctx.moveTo(hx + 1 * scale, hy - 3.6 * scale);
  ctx.lineTo(hx + 11.2 * scale, hy - 1.4 * scale);
  ctx.lineTo(hx + 4 * scale, hy + 2.4 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.moveTo(hx + 3 * scale, hy - 2.3 * scale);
  ctx.lineTo(hx + 9.2 * scale, hy - 1.2 * scale);
  ctx.lineTo(hx + 4.4 * scale, hy + 1 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawInkHorn(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  baseHalfW: number,
  fill: string,
  outline: string,
  rimColor: string,
  tipColor?: string
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;

  ctx.fillStyle = fill;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.1;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + px * baseHalfW, y0 + py * baseHalfW);
  ctx.quadraticCurveTo(cx + px * baseHalfW * 0.55, cy + py * baseHalfW * 0.55, x1, y1);
  ctx.quadraticCurveTo(cx - px * baseHalfW * 0.45, cy - py * baseHalfW * 0.45, x0 - px * baseHalfW, y0 - py * baseHalfW);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (tipColor) {
    const mx = (cx + x1) * 0.5;
    const my = (cy + y1) * 0.5;
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.moveTo(mx + px * baseHalfW * 0.28, my + py * baseHalfW * 0.28);
    ctx.lineTo(x1, y1);
    ctx.lineTo(mx - px * baseHalfW * 0.24, my - py * baseHalfW * 0.24);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + px * baseHalfW * 0.65, y0 + py * baseHalfW * 0.65);
  ctx.quadraticCurveTo(cx + px * baseHalfW * 0.35, cy + py * baseHalfW * 0.35, x1 * 0.96 + x0 * 0.04, y1 * 0.96 + y0 * 0.04);
  ctx.stroke();
}

function drawInkFeatheredWingTier(
  ctx: CanvasRenderingContext2D,
  len: number,
  w: number,
  fill: string,
  shadowFill: string,
  outline: string,
  spineRim: string,
  haloColor?: string
): void {
  if (haloColor) {
    ctx.save();
    try {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = haloColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.52, -w * 1.48, len * 1.08, -w * 0.14);
      ctx.quadraticCurveTo(len * 0.55, w * 0.92, 0, 4);
      ctx.closePath();
      ctx.fill();
    } finally {
      ctx.restore();
    }
  }

  // Main ink-outlined wing silhouette
  ctx.fillStyle = fill;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.48, -w, len, -2);
  ctx.lineTo(len * 0.76, w * 0.28);
  ctx.lineTo(len * 0.88, w * 0.52);
  ctx.lineTo(len * 0.62, w * 0.56);
  ctx.lineTo(len * 0.7, w * 0.78);
  ctx.quadraticCurveTo(len * 0.34, w * 0.58, 0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cel-shaded lower feather shadow band
  ctx.fillStyle = shadowFill;
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.quadraticCurveTo(len * 0.4, w * 0.18, len * 0.78, w * 0.22);
  ctx.lineTo(len * 0.62, w * 0.52);
  ctx.quadraticCurveTo(len * 0.32, w * 0.48, 2, 3.6);
  ctx.closePath();
  ctx.fill();

  // Sharp luminous rachis / edge highlight
  ctx.strokeStyle = spineRim;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, -0.5);
  ctx.lineTo(len * 0.88, -1.5);
  ctx.stroke();
}

function drawInkPauldron(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  side: -1 | 1,
  fill: string,
  shadowFill: string,
  outline: string,
  rimColor: string,
  spiked = false
): void {
  ctx.save();
  try {
    ctx.translate(sx, sy);
    ctx.scale(side, 1);
    ctx.fillStyle = fill;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (spiked) {
      ctx.moveTo(-4, -3);
      ctx.lineTo(8, -11);
      ctx.lineTo(13, -4);
      ctx.lineTo(9, 4);
      ctx.lineTo(-3, 5);
    } else {
      ctx.moveTo(-4, -3);
      ctx.quadraticCurveTo(5, -10, 12, -4);
      ctx.quadraticCurveTo(10, 4, -2, 5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadowFill;
    ctx.beginPath();
    ctx.moveTo(-2, 1);
    ctx.lineTo(10, -2);
    ctx.lineTo(8, 3.5);
    ctx.lineTo(-2, 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(spiked ? 8 : 10, spiked ? -9.5 : -4.5);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

function drawInkRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  outline: string,
  strokeColor: string,
  lineW: number
): void {
  ctx.save();
  try {
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = outline;
    ctx.lineWidth = lineW + 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

export function renderHeroHeadGear(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  gear: Exclude<NonNullable<StickmanRenderOptions['headGear']>, 'none'>,
  time: number,
  skinId?: SkinId,
  characterId?: CharacterId
): void {
  const modHead = getModularSkin(skinId)?.drawFrontLayer;
  if (modHead) {
    modHead({ ctx, joints, skinId: skinId!, characterId, awakened: false, time, headR, headGear: gear });
    return;
  }
  const head = safePt(joints.head, 0, -90);
  const spineMid = safePt(joints.spineMid, 0, -64);
  const r = safeHeadRadius(headR);
  const t = safeClock(time);
  const hx = head.x;
  const hy = head.y;
  const sx = spineMid.x;
  const sy = spineMid.y;

  ctx.save();
  try {
    if (gear === 'chrono_gear') {
      const bob = Math.sin(t * 4.2) * 1.8;
      if (skinId === 'chrono_sovereign') {
        // Thần Thời Gian (chrono_sovereign): Imperial astrolabe crown with horned sundial crest, split gold/azure chrono-visor & floating time-key diamond
        // 1. Horned sundial crest flanking head
        drawInkHorn(
          ctx,
          hx - 5,
          hy - r + 2,
          hx - 15,
          hy - r - 15,
          hx - 23,
          hy - r - 11,
          3.2,
          '#1c1917',
          '#0a0704',
          '#fef08a',
          '#f59e0b'
        );
        drawInkHorn(
          ctx,
          hx + 5,
          hy - r + 2,
          hx + 15,
          hy - r - 16,
          hx + 21,
          hy - r - 10,
          3.0,
          '#92400e',
          '#0a0704',
          '#38bdf8',
          '#fef08a'
        );

        // 2. Obsidian-bronze sovereign chrono-visor with sumi-ink bevels
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#0a0704';
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy - r + 2);
        ctx.lineTo(hx + r + 3.2, hy - 3.5);
        ctx.lineTo(hx + r + 1.2, hy + 4.2);
        ctx.lineTo(hx + 3, hy + r * 0.62);
        ctx.lineTo(hx - 4.5, hy + 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crisp starlight-gold brow bevel rim
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 3, hy - r + 3);
        ctx.lineTo(hx + r + 2.4, hy - 3.2);
        ctx.stroke();

        // Split gold/azure chrono-visor optic slit
        drawInkEyeSlit(ctx, hx, hy, '#f59e0b', '#38bdf8', 1.05);

        // 3. Imperial astrolabe ring & hovering time-key diamond above brow
        const crownY = hy - r - 12 + bob;
        drawInkRing(ctx, hx, crownY + 2, 13, 3.6, -0.06, '#0a0704', '#f59e0b', 2.2);

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#0a0704';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(hx, crownY - 8);
        ctx.lineTo(hx + 5, crownY);
        ctx.lineTo(hx, crownY + 7);
        ctx.lineTo(hx - 5, crownY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(hx, crownY - 5);
        ctx.lineTo(hx + 2.6, crownY);
        ctx.lineTo(hx, crownY + 3.5);
        ctx.lineTo(hx - 2.6, crownY);
        ctx.closePath();
        ctx.fill();
      } else {
        // Chrono Default: Ink-outlined bronze-teal clockwork monocle & half-halo gear behind head
        const spin = t * 1.8;
        const gx = hx - 9;
        const gy = hy - 6;
        ctx.save();
        try {
          ctx.translate(gx, gy);
          ctx.rotate(spin);
          // Sumi-ink gear contour
          ctx.strokeStyle = '#081214';
          ctx.lineWidth = 4.6;
          ctx.beginPath();
          ctx.arc(0, 0, 12, -Math.PI * 0.78, Math.PI * 0.62);
          ctx.stroke();

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Gear teeth
          ctx.strokeStyle = '#2dd4bf';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5);
            ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }

        // Ink-outlined bronze-teal clockwork monocle over front eye
        const mx = hx + 4.5;
        const my = hy - 1.5;
        ctx.fillStyle = colorWithAlpha('#042f2e', 0.86);
        ctx.strokeStyle = '#081214';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(mx, my, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Luminous aqua monocle lens & tiny brass hand
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.arc(mx + 0.8, my, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#99f6e4';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + 3.4, my - 1.4);
        ctx.stroke();
      }
    } else if (gear === 'jade_hairpin') {
      if (skinId === 'xuan_feng_sage') {
        // Xuân Phong Văn Thánh: Búi tóc thư sinh thanh nhã, ngọc quan viền kim nhạt, trâm bạch ngọc, hoa đào & ánh mắt thanh ngọc sắc nét
        const pulse = 0.76 + 0.24 * Math.sin(t * 3.6);
        const bunX = hx - 2.5;
        const bunY = hy - headR - 2.8;

        // Sharp jade-teal scholar eye glint (drawInkEyeSlit)
        drawInkEyeSlit(ctx, hx, hy, '#2dd4bf', '#f0fdfa', 0.94);

        // Scholar ink-wash topknot bun with layered hair contour
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(bunX, bunY, 4.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crisp Moonlight White & Jade Teal scholar diadem band (Ngọc Quan)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bunX - 5.2, bunY + 1.2);
        ctx.lineTo(bunX - 4.0, bunY + 4.0);
        ctx.lineTo(bunX + 4.4, bunY + 3.6);
        ctx.lineTo(bunX + 5.2, bunY + 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pale-gold diadem clasp & jade inlay
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(bunX - 3.6, bunY + 2.4);
        ctx.lineTo(bunX + 3.8, bunY + 2.0);
        ctx.stroke();

        ctx.fillStyle = '#5eead4';
        ctx.beginPath();
        ctx.arc(bunX + 1.4, bunY + 2.1, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Translucent white-jade hairpin piercing diagonally with pale-gold collars
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bunX - 13.5, bunY + 2.8);
        ctx.lineTo(bunX + 13.5, bunY - 3.8);
        ctx.stroke();

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Pale-gold metallic hairpin bands
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bunX - 7.8, bunY + 1.5);
        ctx.lineTo(bunX - 6.6, bunY + 1.2);
        ctx.moveTo(bunX + 7.2, bunY - 2.2);
        ctx.lineTo(bunX + 8.6, bunY - 2.6);
        ctx.stroke();

        // Soft jade-teal glow finial + pale-gold bezel
        const gemX = bunX - 13.5;
        const gemY = bunY + 2.9;
        ctx.fillStyle = colorWithAlpha('#5eead4', 0.30 * pulse);
        ctx.beginPath();
        ctx.arc(gemX, gemY, 6.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#5eead4';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(gemX, gemY, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(gemX, gemY, 3.2, -0.6, 1.4);
        ctx.stroke();

        // Multi-petal peach blossom ornament beside hairpin base
        const flX = bunX - 5.4;
        const flY = bunY - 0.6;
        ctx.fillStyle = '#fda4af';
        for (let p = 0; p < 5; p++) {
          const pa = (p * Math.PI * 2) / 5 + 0.2;
          ctx.beginPath();
          ctx.arc(flX + Math.cos(pa) * 1.4, flY + Math.sin(pa) * 1.4, 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(flX, flY, 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Flowing 2-strand jade & moonlight silk ribbon swaying softly + muted cinnabar bead
        const sway = Math.sin(t * 4.8) * 3.2;
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(gemX, gemY + 2.2);
        ctx.quadraticCurveTo(gemX - 4.2, gemY + 8.5 + sway * 0.45, gemX - 8.2, gemY + 15.5 + sway);
        ctx.stroke();

        ctx.strokeStyle = '#f0fdfa';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(gemX + 1.0, gemY + 2.4);
        ctx.quadraticCurveTo(gemX - 2.4, gemY + 7.5 + sway * 0.35, gemX - 5.4, gemY + 13.0 + sway * 0.8);
        ctx.stroke();

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(gemX, gemY + 3.2, 1.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Mặc Tiên: Búi tóc thư sinh + Trâm Ngọc Bích phát sáng nhẹ + tua đỏ chu sa
        const pulse = 0.65 + 0.35 * Math.sin(t * 4.2);
        const pinColor = '#2dd4bf';
        const pinGlow = '#99f6e4';
        const bunX = hx - 2.5;
        const bunY = hy - headR - 2.5;

        // Scholar ink topknot bun
        ctx.fillStyle = '#1a1d24';
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(bunX, bunY, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White Xuan-paper hairband ribbon around bun
        ctx.strokeStyle = '#f4f1ea';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bunX - 4.2, bunY + 2.4);
        ctx.lineTo(bunX + 4.2, bunY + 2.4);
        ctx.stroke();

        // Jade hairpin piercing diagonally through the topknot
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bunX - 11, bunY + 2.5);
        ctx.lineTo(bunX + 12, bunY - 3.5);
        ctx.stroke();

        ctx.strokeStyle = pinColor;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Soft glowing jade gem finial (flat alpha halo, no shadowBlur)
        const gemX = bunX - 11.5;
        const gemY = bunY + 2.8;
        ctx.fillStyle = colorWithAlpha(pinColor, 0.28 * pulse);
        ctx.beginPath();
        ctx.arc(gemX, gemY, 6.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pinGlow;
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(gemX, gemY, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Small vermilion tassel swaying from the jade finial
        const sway = Math.sin(t * 5.6) * 2.4;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(gemX, gemY + 2);
        ctx.quadraticCurveTo(gemX - 2.5, gemY + 6 + sway * 0.4, gemX - 4.5, gemY + 10 + sway);
        ctx.stroke();
      }
    } else if (gear === 'prism_crown') {
      const bob = Math.sin(t * 4.5) * 2;
      if (skinId === 'void_shatterer') {
        // Ma Kính Demon-Mirror Mask: Asymmetric shattered obsidian faceplate + crack seams + crimson-cyan prism horns + fierce split optic slit
        // 1. Asymmetric shattered obsidian faceplate covering upper/front face
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#07040a';
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy - r + 2);
        ctx.lineTo(hx + r + 3.2, hy - 3.5);
        ctx.lineTo(hx + r + 1.5, hy + 4.5);
        ctx.lineTo(hx + 4, hy + r * 0.72);
        ctx.lineTo(hx - 5, hy + 4);
        ctx.lineTo(hx - 2, hy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lower jaw cel-shadow plate
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy + 1.5);
        ctx.lineTo(hx + r + 1.5, hy + 2.5);
        ctx.lineTo(hx + 4, hy + r * 0.68);
        ctx.lineTo(hx - 4.5, hy + 3.5);
        ctx.closePath();
        ctx.fill();

        // Crisp cyan-silver rim along mask brow & nose ridge
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 3, hy - r + 3);
        ctx.lineTo(hx + r + 2.5, hy - 3.2);
        ctx.stroke();

        // Glowing crimson & cyan diagonal shatter crack seams across mask
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(hx - 2, hy - r + 4);
        ctx.lineTo(hx + 4, hy - 3);
        ctx.lineTo(hx + 1, hy + 2.5);
        ctx.lineTo(hx + 6, hy + 6.5);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx + 4, hy - 3);
        ctx.lineTo(hx + 9, hy - 5.5);
        ctx.stroke();

        // Fierce split optic slit (crimson flare + razor cyan-white core)
        drawInkEyeSlit(ctx, hx, hy, '#f43f5e', '#e0f2fe', 1.05);

        // Sweeping asymmetrical crimson-cyan prism demon horns
        drawInkHorn(
          ctx,
          hx - 4,
          hy - r + 2,
          hx - 14,
          hy - r - 14,
          hx - 22,
          hy - r - 12,
          3.2,
          '#9f1239',
          '#07040a',
          '#e0f2fe',
          '#f43f5e'
        );
        drawInkHorn(
          ctx,
          hx + 4,
          hy - r + 2,
          hx + 13,
          hy - r - 16,
          hx + 19,
          hy - r - 11,
          3.0,
          '#18181b',
          '#07040a',
          '#38bdf8',
          '#f43f5e'
        );

        // Floating fractured crimson-cyan mirror crown shard above brow
        const crownY = hy - r - 12 + bob;
        ctx.fillStyle = '#f43f5e';
        ctx.strokeStyle = '#07040a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(hx + 1, crownY - 8);
        ctx.lineTo(hx + 6, crownY);
        ctx.lineTo(hx + 1, crownY + 6);
        ctx.lineTo(hx - 4, crownY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(hx + 1, crownY - 7);
        ctx.lineTo(hx + 5, crownY);
        ctx.lineTo(hx + 1, crownY + 1);
        ctx.closePath();
        ctx.fill();
      } else {
        // Mirage Default: Sleek silver-violet half-visor optic glint + 3-shard prism diadem
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.0;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 2, hy - 6.5);
        ctx.lineTo(hx + r + 2.5, hy - 3.5);
        ctx.lineTo(hx + r + 0.5, hy + 2.8);
        ctx.lineTo(hx - 1.5, hy + 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(hx - 1, hy - 5.8);
        ctx.lineTo(hx + r + 1.8, hy - 3.2);
        ctx.stroke();

        drawInkEyeSlit(ctx, hx, hy, '#c084fc', '#f1f5f9', 0.92);

        // 3 beveled floating silver-violet prism diadem shards
        for (const ox of [-9, 0, 9]) {
          const isCenter = ox === 0;
          const py = hy - r - 7 + (isCenter ? -4 : 0) + bob;
          const halfH = isCenter ? 7 : 5;
          const halfW = isCenter ? 4 : 3;
          ctx.fillStyle = '#312e81';
          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(hx + ox, py - halfH);
          ctx.lineTo(hx + ox + halfW, py);
          ctx.lineTo(hx + ox, py + halfH * 0.72);
          ctx.lineTo(hx + ox - halfW, py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isCenter ? '#f1f5f9' : '#c084fc';
          ctx.beginPath();
          ctx.moveTo(hx + ox, py - halfH + 0.6);
          ctx.lineTo(hx + ox + halfW - 0.5, py);
          ctx.lineTo(hx + ox, py + 0.4);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (gear === 'valkyrie_wings') {
      const variant = inferValkyrieVariant(ctx, skinId);
      const pal = getSkinInkPalette('valkyrie', variant, false);
      const flap = Math.sin(t * 6.5) * 6;
      const wingPrimary =
        variant === 'celestial_empress'
          ? '#0284c7'
          : variant === 'abyssal_valkyrie'
            ? '#9f1239'
            : '#fef9c3';
      const wingShadow =
        variant === 'celestial_empress'
          ? '#1e3a8a'
          : variant === 'abyssal_valkyrie'
            ? '#4c0519'
            : '#d97706';
      const wingEdge =
        variant === 'celestial_empress'
          ? '#fde047'
          : variant === 'abyssal_valkyrie'
            ? '#e879f9'
            : '#facc15';
      const glowTint =
        variant === 'celestial_empress'
          ? colorWithAlpha('#38bdf8', 0.34)
          : variant === 'abyssal_valkyrie'
            ? colorWithAlpha('#f43f5e', 0.34)
            : colorWithAlpha('#fde047', 0.36);

      // 3-tier ink-outlined feathered back plumes anchored behind spineMid
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        for (let tier = 0; tier < 3; tier++) {
          const len = 34 - tier * 6;
          const spreadY = -18 + tier * 11 + flap * (1 - tier * 0.25);
          ctx.fillStyle = glowTint;
          ctx.strokeStyle = wingEdge;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx - 4, sy - 4 + tier * 3);
          ctx.quadraticCurveTo(sx - len * 0.65, sy + spreadY - 12, sx - len - 8, sy + spreadY);
          ctx.quadraticCurveTo(sx - len * 0.55, sy + spreadY + 8, sx - 4, sy + 2 + tier * 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }

      // Crisp sumi-ink Valkyrie Winged Diadem + cel shadow + rim highlight
      ctx.fillStyle = wingPrimary;
      ctx.strokeStyle = pal.inkOutline;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - 5);
      ctx.lineTo(hx - 21, hy - 18 + flap * 0.25);
      ctx.lineTo(hx - 12, hy - 7);
      ctx.lineTo(hx - 19, hy - 8);
      ctx.lineTo(hx - 4, hy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = wingShadow;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 2);
      ctx.lineTo(hx - 17, hy - 7.5);
      ctx.lineTo(hx - 4, hy + 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = pal.rimColor;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 5);
      ctx.lineTo(hx - 19, hy - 16.5 + flap * 0.25);
      ctx.stroke();

      // Theme-matched brow tiara + crest gem + eye slit
      ctx.strokeStyle = pal.inkOutline;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(hx - 5, hy - 7);
      ctx.lineTo(hx + r + 1, hy - 5);
      ctx.stroke();

      ctx.strokeStyle = wingEdge;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = pal.accentColor;
      ctx.beginPath();
      ctx.arc(hx + 3, hy - 6, 2.2, 0, Math.PI * 2);
      ctx.fill();

      drawInkEyeSlit(ctx, hx, hy, wingEdge, '#ffffff', 0.9);
    } else if (gear === 'volt_visor') {
      // Ink-wash tactical Raijin visor with cyan rim & blazing gold optic slit
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 6);
      ctx.lineTo(hx + r + 3, hy - 4.5);
      ctx.lineTo(hx + r + 1, hy + 2.5);
      ctx.lineTo(hx - 1, hy + 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - 5.5);
      ctx.lineTo(hx + r + 2, hy - 4.2);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.fillRect(hx + 2, hy - 2.8, 9, 2.8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx + 4, hy - 2.2, 4.5, 1.3);

      // Swept ink lightning fin at temple
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 5);
      ctx.lineTo(hx - 12, hy - 11);
      ctx.stroke();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (gear === 'flame_band') {
      // Ink-brush hachimaki headband with bifurcated vermilion ribbons
      const flutter = Math.sin(t * 11) * 4;
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - r, hy - 5);
      ctx.lineTo(hx + r, hy - 5);
      ctx.stroke();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3.6;
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.4, hy - 6);
      ctx.lineTo(hx + r * 0.8, hy - 5.8);
      ctx.stroke();

      // Primary & secondary flowing ink-wash ribbons
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      ctx.moveTo(hx - r, hy - 5);
      ctx.quadraticCurveTo(hx - r - 14, hy - 10 + flutter, hx - r - 27, hy - 3 + flutter);
      ctx.stroke();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(hx - r, hy - 4);
      ctx.quadraticCurveTo(hx - r - 11, hy - 2 - flutter * 0.6, hx - r - 21, hy + 4 - flutter * 0.7);
      ctx.stroke();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.1;
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#fb923c', '#fef9c3', 0.85);
    } else if (gear === 'phantom_eyes') {
      // Sumi-ink shinobi mask band + emerald razor eye slit + shadow wisp
      ctx.fillStyle = '#0b0c10';
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.6, hy - 5);
      ctx.lineTo(hx + r + 1, hy - 2.5);
      ctx.lineTo(hx + 3, hy + 3.5);
      ctx.lineTo(hx - r * 0.4, hy + 2);
      ctx.closePath();
      ctx.fill();

      drawInkEyeSlit(ctx, hx, hy, '#10b981', '#ecfdf5', 1.0);

      const sway = Math.sin(t * 9) * 3;
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.6, hy - 3.5);
      ctx.quadraticCurveTo(hx - r - 8, hy - 5 + sway, hx - r - 16, hy - 1 + sway);
      ctx.stroke();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (gear === 'seraph_helm') {
      const bob = Math.sin(t * 5.2) * 1.8;
      drawInkRing(ctx, hx - 1, hy - r - 7 + bob, 13, 3.8, -0.08, '#0b0c10', '#facc15', 2.8);
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(hx - 1, hy - r - 7 + bob, 13, 3.8, -0.08, 0, Math.PI * 2);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // Sculpted silver-gold paladin cheek-guard with sumi outline + cel shadow
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 7);
      ctx.lineTo(hx + r + 0.5, hy - 3);
      ctx.lineTo(hx + r - 1, hy + 5.5);
      ctx.lineTo(hx - 3, hy + 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy - 6);
      ctx.lineTo(hx + r - 1, hy - 3);
      ctx.lineTo(hx + 2, hy + 0.5);
      ctx.closePath();
      ctx.fill();

      const flare = 0.8 + 0.2 * Math.sin(t * 9);
      ctx.fillStyle = colorWithAlpha('#ffffff', flare);
      ctx.beginPath();
      ctx.ellipse(hx + 6, hy - 1, 5, 2.2, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Swept golden feathered ear-wings with ink outline & rim
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 5);
      ctx.lineTo(hx - 22, hy - 18);
      ctx.lineTo(hx - 12, hy - 7);
      ctx.lineTo(hx - 20, hy - 9);
      ctx.lineTo(hx - 6, hy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 5);
      ctx.lineTo(hx - 20, hy - 16.5);
      ctx.stroke();
    } else if (gear === 'void_helm') {
      const bob = Math.sin(t * 6) * 2;
      ctx.fillStyle = '#e879f9';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r - 14 + bob);
      ctx.lineTo(hx + 4.5, hy - r - 7 + bob);
      ctx.lineTo(hx, hy - r - 1.5 + bob);
      ctx.lineTo(hx - 4.5, hy - r - 7 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Swept obsidian-violet horn with sumi outline & magenta rim
      drawInkHorn(
        ctx,
        hx - 5,
        hy - 4,
        hx - 14,
        hy - 13,
        hx - 22,
        hy - 22,
        3.2,
        '#312e81',
        '#0b0c10',
        '#e9d5ff',
        '#c084fc'
      );

      // Angular void face-plate
      ctx.fillStyle = '#090714';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy - 5);
      ctx.lineTo(hx + r + 1.5, hy - 2);
      ctx.lineTo(hx + 4, hy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#e879f9', '#ffffff', 0.95);
    } else if (gear === 'shogun_crest') {
      // Storm Shogun kabuto dome + sumi outline + cel shadow + kuwa-gata crescent horns
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(hx, hy - 2, r + 1.8, Math.PI * 1.04, Math.PI * 1.96);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#11256b';
      ctx.beginPath();
      ctx.arc(hx - 1, hy - 2, r, Math.PI * 1.08, Math.PI * 1.52);
      ctx.lineTo(hx - 1, hy - 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(hx, hy - 2, r + 0.5, Math.PI * 1.48, Math.PI * 1.92);
      ctx.stroke();

      // Golden Kuwa-gata horns
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 2, hy - r + 1);
      ctx.quadraticCurveTo(hx + 14, hy - r - 14, hx + 8, hy - r - 19);
      ctx.quadraticCurveTo(hx + 7, hy - r - 7, hx, hy - r - 2);
      ctx.quadraticCurveTo(hx - 9, hy - r - 13, hx - 14, hy - r - 15);
      ctx.quadraticCurveTo(hx - 6, hy - r - 5, hx - 2, hy - r + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(hx + 2, hy - 3, 9, 3.4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx + 4, hy - 2.3, 4.5, 1.4);
    } else if (gear === 'cyber_visor') {
      // Full-wrap Cyber Overdrive visor with sumi frame + magenta-cyan slit + twin antenna fins
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy - 6);
      ctx.lineTo(hx + r + 3, hy - 4);
      ctx.lineTo(hx + r + 1, hy + 4);
      ctx.lineTo(hx - 4, hy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#e879f9';
      ctx.fillRect(hx + 1, hy - 2.5, 11, 3.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx + 4, hy - 1.8, 6, 1.5);

      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 5, hy - 6);
      ctx.lineTo(hx - 18, hy - 18);
      ctx.moveTo(hx - 3, hy - 8);
      ctx.lineTo(hx - 12, hy - 19);
      ctx.stroke();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.1;
      ctx.stroke();
    } else if (gear === 'phoenix_crown') {
      // Solar Phoenix multi-plume diadem with sumi outline & white-gold rim
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - r + 2);
      ctx.lineTo(hx - 19, hy - r - 13);
      ctx.lineTo(hx - 4, hy - r - 5);
      ctx.lineTo(hx + 4, hy - r - 18);
      ctx.lineTo(hx + 9, hy - r - 4);
      ctx.lineTo(hx + 15, hy - r - 9);
      ctx.lineTo(hx + 8, hy - r + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - r + 1);
      ctx.lineTo(hx - 13, hy - r - 9);
      ctx.lineTo(hx - 3, hy - r - 4);
      ctx.lineTo(hx + 4, hy - r - 14);
      ctx.lineTo(hx + 8, hy - r - 3);
      ctx.closePath();
      ctx.fill();

      drawInkEyeSlit(ctx, hx, hy, '#facc15', '#ffffff', 0.95);
    } else if (gear === 'oni_horns') {
      const oniKind = inferOniHornsVariant(ctx, skinId, characterId);
      if (oniKind === 'eclipse_ronin') {
        // Kuro: Eclipse Ronin — crimson/ember-gold sumi-ink oni horns + darkened brow + ember eye
        drawInkHorn(
          ctx,
          hx - 3,
          hy - r + 3,
          hx - 13,
          hy - r - 13,
          hx - 21,
          hy - r - 11,
          3.1,
          '#991b1b',
          '#09090b',
          '#fde047',
          '#f97316'
        );
        drawInkHorn(
          ctx,
          hx + 4,
          hy - r + 3,
          hx + 13,
          hy - r - 15,
          hx + 19,
          hy - r - 9,
          2.9,
          '#dc2626',
          '#09090b',
          '#fde047',
          '#fb923c'
        );

        // Ronin crimson brow tie + blazing ember-gold oni eye slit
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(hx - r * 0.9, hy - 5.5);
        ctx.lineTo(hx + r * 0.95, hy - 4.5);
        ctx.stroke();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.3;
        ctx.stroke();

        drawInkEyeSlit(ctx, hx, hy, '#f97316', '#fde047', 1.0);
      } else {
        // Kagura: Frost Empress — frost-crimson & glacial-cyan ink horns + crimson brow seal
        drawInkHorn(
          ctx,
          hx - 2,
          hy - r + 2,
          hx - 12,
          hy - r - 14,
          hx - 17,
          hy - r - 10,
          2.9,
          '#bae6fd',
          '#060c18',
          '#ffffff',
          '#38bdf8'
        );
        drawInkHorn(
          ctx,
          hx + 3,
          hy - r + 2,
          hx + 12,
          hy - r - 15,
          hx + 16,
          hy - r - 9,
          2.8,
          '#bae6fd',
          '#060c18',
          '#ffffff',
          '#c084fc'
        );

        // Frostfire crimson-violet oni brow mark + icy cyan eye slit
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.moveTo(hx + 2, hy - r + 1);
        ctx.lineTo(hx + 5, hy - r + 5);
        ctx.lineTo(hx + 2, hy - r + 7);
        ctx.lineTo(hx - 1, hy - r + 5);
        ctx.closePath();
        ctx.fill();

        drawInkEyeSlit(ctx, hx, hy, '#22d3ee', '#e0f2fe', 0.95);
      }
    } else if (gear === 'kitsune_mask') {
      // Blood Moon Kitsune Mask: crisp chalk white + sumi outline + cel shadow + vermilion brush marks
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 8);
      ctx.lineTo(hx + r + 2.5, hy - 2);
      ctx.lineTo(hx + r - 2, hy + 6.5);
      ctx.lineTo(hx - 2, hy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle jaw cel shadow
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy + 2.5);
      ctx.lineTo(hx + r - 1, hy + 2.5);
      ctx.lineTo(hx + r - 2, hy + 5.8);
      ctx.lineTo(hx - 1.5, hy + 5.5);
      ctx.closePath();
      ctx.fill();

      // Pointed Kitsune ears with crimson inner ear
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - r + 3);
      ctx.lineTo(hx - 10, hy - r - 12);
      ctx.lineTo(hx + 2, hy - r + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - r + 2);
      ctx.lineTo(hx - 8, hy - r - 8);
      ctx.lineTo(hx, hy - r + 1);
      ctx.closePath();
      ctx.fill();

      // Vermilion whisker brush strokes + fierce scarlet eye
      drawInkEyeSlit(ctx, hx, hy, '#e11d48', '#ffe4e6', 0.95);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 3);
      ctx.lineTo(hx + 8, hy + 3.6);
      ctx.moveTo(hx + 1, hy - 5.8);
      ctx.lineTo(hx + 7, hy - 4.4);
      ctx.stroke();
    } else if (gear === 'astral_hood') {
      // Astral Phantom cosmic indigo hood with sumi outline + fold shadow + gold starlight trim
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06041a';
      ctx.lineWidth = 2.3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - r - 6.5, hy - r - 4);
      ctx.lineTo(hx + r + 2.5, hy - r + 1);
      ctx.lineTo(hx + r - 2, hy + r * 0.72);
      ctx.lineTo(hx - r - 2.5, hy + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0c0a28';
      ctx.beginPath();
      ctx.moveTo(hx - r - 4, hy - 2);
      ctx.lineTo(hx + 2, hy + 2);
      ctx.lineTo(hx + r - 3, hy + r * 0.65);
      ctx.lineTo(hx - r - 2, hy + r * 0.55);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx - r - 5, hy - r - 3.5);
      ctx.lineTo(hx + r + 2, hy - r + 1);
      ctx.lineTo(hx + r - 2, hy + r * 0.68);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(hx + 6, hy - 1.5, 2.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + 6, hy - 1.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (gear === 'astral_halo') {
      const variant = inferAstralHaloVariant(ctx, skinId);
      const bob = Math.sin(t * 4.6) * 1.8;
      const haloY = hy - r - 7 + bob;

      if (variant === 'prismatic_archon') {
        drawInkRing(ctx, hx, haloY, 15.5, 4.5, -0.06, '#08051a', '#fde047', 2.4);
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(hx, haloY, 11, 3.1, 0.08, 0, Math.PI * 2);
          ctx.stroke();
          const prismCols = ['#f43f5e', '#fde047', '#38bdf8', '#e879f9'];
          for (let i = 0; i < 4; i++) {
            const a = t * 3.5 + (i * Math.PI) / 2;
            const sx2 = hx + Math.cos(a) * 15.5;
            const sy2 = haloY + Math.sin(a) * 4.5;
            ctx.fillStyle = prismCols[i];
            ctx.beginPath();
            ctx.arc(sx2, sy2, 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
        } finally {
          ctx.restore();
        }
        drawInkEyeSlit(ctx, hx, hy, '#38bdf8', '#fef9c3', 0.95);
      } else {
        drawInkRing(ctx, hx, haloY, 14, 4.2, -0.06, '#0a0518', '#e879f9', 2.4);
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(hx, haloY, 9.5, 2.8, 0.08, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 3; i++) {
            const a = t * 3.2 + (i * Math.PI * 2) / 3;
            const sx2 = hx + Math.cos(a) * 14;
            const sy2 = haloY + Math.sin(a) * 4.2;
            ctx.fillStyle = i === 0 ? '#fde047' : '#ffffff';
            ctx.beginPath();
            ctx.arc(sx2, sy2, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        } finally {
          ctx.restore();
        }
        drawInkEyeSlit(ctx, hx, hy, '#e879f9', '#ffffff', 0.9);
      }
    }
  } finally {
    ctx.restore();
  }
}

function drawXuanFengSlipOrSeal(
  ctx: CanvasRenderingContext2D,
  itemIndex: number,
  awakened: boolean,
  t: number
): void {
  const isSeal = itemIndex === 1 || itemIndex === 4;
  if (isSeal) {
    // Small carved Jade & Pale-Gold Talisman Seal with cinnabar chop & swaying silk tassel
    ctx.fillStyle = awakened ? '#f0fdfa' : '#f8fafc';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.6, -3.5);
    ctx.lineTo(4.6, 4.5);
    ctx.lineTo(0, 6.8);
    ctx.lineTo(-4.6, 4.5);
    ctx.lineTo(-4.6, -3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pale-gold outer bezel trim
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Cinnabar-red calligraphic seal square & jade dot
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-2.2, -1.6, 4.4, 4.4);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-1.1, -0.4);
    ctx.lineTo(1.1, -0.4);
    ctx.moveTo(0, -1.0);
    ctx.lineTo(0, 2.0);
    ctx.stroke();

    ctx.fillStyle = '#5eead4';
    ctx.beginPath();
    ctx.arc(0, -4.3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Miniature swaying tassel
    const sway = Math.sin(t * 5.2 + itemIndex * 1.4) * 2.0;
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6.8);
    ctx.quadraticCurveTo(sway * 0.5, 9.8, sway, 12.6);
    ctx.stroke();
    return;
  }

  // Beveled Jade Bamboo Slip (Thẻ Trúc Ngọc) with pale-gold binding cords & calligraphy ink strokes
  const slipW = 5.8;
  const slipH = 15.2;
  ctx.fillStyle = awakened ? '#f0fdfa' : '#f8fafc';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.35;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-slipW * 0.5, -slipH * 0.5);
  ctx.lineTo(slipW * 0.5, -slipH * 0.5 + 1.0);
  ctx.lineTo(slipW * 0.5, slipH * 0.5);
  ctx.lineTo(-slipW * 0.5, slipH * 0.5 - 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jade-wash shaded right bevel
  ctx.fillStyle = awakened ? '#99f6e4' : '#cbd5e1';
  ctx.fillRect(0.2, -slipH * 0.5 + 1.4, slipW * 0.42, slipH - 2.6);

  // Pale-gold silk binding cords top & bottom
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(-slipW * 0.52, -slipH * 0.32);
  ctx.lineTo(slipW * 0.52, -slipH * 0.32);
  ctx.moveTo(-slipW * 0.52, slipH * 0.32);
  ctx.lineTo(slipW * 0.52, slipH * 0.32);
  ctx.stroke();

  // Fine ink-wash vertical calligraphy strokes
  ctx.strokeStyle = colorWithAlpha('#1e293b', 0.78);
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  ctx.moveTo(-0.3, -3.6);
  ctx.lineTo(-0.3, 2.8);
  ctx.moveTo(-1.5, -1.6);
  ctx.lineTo(1.2, -1.6);
  ctx.moveTo(-1.2, 0.8);
  ctx.lineTo(1.0, 0.4);
  ctx.stroke();

  // Small cinnabar chop or jade header notch
  if (itemIndex % 2 === 0) {
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-1.2, 3.8, 2.2, 2.0);
  } else {
    ctx.fillStyle = '#5eead4';
    ctx.beginPath();
    ctx.arc(0, -6.0, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderXuanFengOrbitSlipsPass(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  awakened: boolean,
  time: number,
  pass: 'back' | 'front',
  vx = 0,
  vy = 0
): void {
  const neck = safePt(joints.neck, 0, -80);
  const hip = safePt(joints.hip, 0, -48);
  const t = safeClock(time);
  const lagX = Math.max(-9, Math.min(9, vx * 0.025));
  const lagY = Math.max(-6, Math.min(6, vy * 0.015));
  const orbitCx = (neck.x + hip.x) * 0.5 - 1 - lagX * 0.45;
  const orbitCy = (neck.y + hip.y) * 0.5 - 4 - lagY * 0.45;
  const rx = awakened ? 45 : 36;
  const ry = awakened ? 14.5 : 11.2;
  const planeTilt = -0.24;
  const cosTilt = Math.cos(planeTilt);
  const sinTilt = Math.sin(planeTilt);

  const items: Array<{
    idx: number;
    sx: number;
    sy: number;
    depth: number;
    persp: number;
    faceScale: number;
    tilt: number;
  }> = [];

  for (let i = 0; i < 6; i++) {
    const ang = t * (awakened ? 0.96 : 0.72) + (i * Math.PI * 2) / 6 + 0.35;
    const depth = Math.sin(ang);
    if ((pass === 'back' && depth >= 0) || (pass === 'front' && depth < 0)) {
      continue;
    }
    const lx = Math.cos(ang) * rx;
    const ly = Math.sin(ang) * ry;
    const sx = orbitCx + lx * cosTilt - ly * sinTilt;
    const sy = orbitCy + lx * sinTilt + ly * cosTilt + Math.sin(t * 2.1 + i * 1.3) * 2.2;
    const persp = 0.78 + 0.28 * depth;
    const faceScale = 0.62 + 0.38 * Math.abs(depth);
    const tilt = Math.sin(t * 1.4 + i * 1.2) * 0.14 + Math.cos(ang) * 0.16;
    items.push({ idx: i, sx, sy, depth, persp, faceScale, tilt });
  }

  items.sort((a, b) => a.depth - b.depth);

  for (const item of items) {
    const alpha = pass === 'back' ? 0.68 + (item.depth + 1) * 0.14 : 0.88 + item.depth * 0.12;
    ctx.save();
    try {
      ctx.globalAlpha = Math.max(0.45, Math.min(1, alpha));
      ctx.translate(item.sx, item.sy);
      ctx.rotate(item.tilt);
      ctx.scale(item.persp * item.faceScale, item.persp);
      drawXuanFengSlipOrSeal(ctx, item.idx, awakened, t);
    } finally {
      ctx.restore();
    }
  }
}

export function renderSkinFrontAttachment(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  skinId: SkinId,
  awakened: boolean,
  time: number,
  characterId?: CharacterId,
  vx = 0,
  vy = 0
): void {
  if (skinId !== 'xuan_feng_sage') return;
  const t = safeClock(time);
  const neck = safePt(joints.neck, 0, -80);
  const hip = safePt(joints.hip, 0, -48);
  const cx = (neck.x + hip.x) * 0.5;
  const cy = (neck.y + hip.y) * 0.5;

  ctx.save();
  try {
    // Front-half 3D orbiting Jade Bamboo Slips & Small Seals (depth >= 0)
    renderXuanFengOrbitSlipsPass(ctx, joints, awakened, t, 'front', vx, vy);

    // 2 delicate foreground peach blossom petals drifting across front silhouette
    const petalCount = awakened ? 3 : 2;
    for (let p = 0; p < petalCount; p++) {
      const pAng = -t * 1.25 + p * 2.4 + 0.4;
      if (Math.sin(pAng) < -0.1) continue;
      const px = cx + Math.cos(pAng) * (awakened ? 34 : 27);
      const py = cy + Math.sin(pAng * 1.3 + p) * 14;
      ctx.save();
      try {
        ctx.translate(px, py);
        ctx.rotate(t * 1.6 + p * 1.2);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = p % 2 === 0 ? '#fda4af' : '#fbcfe8';
        ctx.strokeStyle = colorWithAlpha('#1e293b', 0.65);
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(0, -3.3);
        ctx.quadraticCurveTo(3.3, -0.9, 1.7, 2.9);
        ctx.quadraticCurveTo(0, 3.5, -1.7, 2.9);
        ctx.quadraticCurveTo(-3.3, -0.9, 0, -3.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }
  } finally {
    ctx.restore();
  }
}

export function renderSkinBackAttachment(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  skinId: SkinId,
  awakened: boolean,
  time: number,
  characterId?: CharacterId,
  vx = 0,
  vy = 0
): void {
  const modBack = getModularSkin(skinId)?.drawBackLayer;
  if (modBack) {
    modBack({ ctx, joints, skinId, characterId, awakened, time });
    return;
  }
  const neck = safePt(joints.neck, 0, -80);
  const hip = safePt(joints.hip, 0, -48);
  const t = safeClock(time);
  const cx = neck.x - 3;
  const cy = neck.y + 7;

  ctx.save();
  try {
    if (skinId === 'prismatic_archon') {
      const scale = awakened ? 1.34 : 1.1;
      const flap = Math.sin(t * (awakened ? 6.8 : 4.2));
      const rainbow = ['#f43f5e', '#f59e0b', '#fde047', '#34d399', '#38bdf8', '#a855f7'];

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx - 2, cy - 10);
        ctx.rotate(t * 1.4);
        ctx.strokeStyle = colorWithAlpha(`hsl(${(t * 120) % 360}, 95%, 65%)`, 0.9);
        ctx.lineWidth = awakened ? 4.2 : 2.8;
        ctx.beginPath();
        ctx.arc(0, 0, awakened ? 56 : 42, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(-t * 2.6);
        ctx.strokeStyle = colorWithAlpha(`hsl(${(t * 120 + 160) % 360}, 95%, 70%)`, 0.85);
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, awakened ? 68 : 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } finally {
        ctx.restore();
      }

      const auroraTiers = [
        { ang: -0.96 + flap * 0.14, len: 74 * scale, w: 14 * scale, col: '#38bdf8', sh: '#1e3a8a', rim: '#e0f2fe' },
        { ang: -0.44 + flap * 0.1, len: 64 * scale, w: 12 * scale, col: '#e879f9', sh: '#581c87', rim: '#fae8ff' },
        { ang: 0.08 + flap * 0.07, len: 52 * scale, w: 10 * scale, col: '#fde047', sh: '#b45309', rim: '#fef9c3' },
      ];

      const drawRainbowWings = (sideDir: -1 | 1, alphaMult: number, sizeMult: number) => {
        ctx.save();
        try {
          ctx.globalAlpha = alphaMult;
          ctx.translate(cx + sideDir * 3, cy);
          ctx.scale(sideDir, 1);
          for (const wl of auroraTiers) {
            const len = wl.len * sizeMult;
            const w = wl.w * sizeMult;
            ctx.save();
            try {
              ctx.rotate(wl.ang);
              drawInkFeatheredWingTier(
                ctx,
                len,
                w,
                wl.col,
                wl.sh,
                '#08051a',
                wl.rim,
                colorWithAlpha(wl.col, awakened ? 0.36 : 0.22)
              );
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }
      };
      drawRainbowWings(1, 0.72, 0.82);
      drawRainbowWings(-1, 1.0, 1.0);

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        const orbCount = awakened ? 6 : 4;
        const orbitR = awakened ? 56 : 44;
        const pts: Array<{ x: number; y: number; col: string }> = [];
        for (let i = 0; i < orbCount; i++) {
          const a = t * 2.4 + (i * Math.PI * 2) / orbCount;
          pts.push({
            x: cx + Math.cos(a) * orbitR,
            y: cy - 6 + Math.sin(a) * (orbitR * 0.55),
            col: rainbow[i % rainbow.length],
          });
        }
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(next.x, next.y);
        }
        ctx.stroke();

        if (awakened) {
          ctx.save();
          try {
            ctx.translate(cx - 2, cy - 10);
            ctx.rotate(t * 0.9);
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i * Math.PI) / 3;
              const b = ((i + 2) * Math.PI) / 3;
              ctx.moveTo(Math.cos(a) * 58, Math.sin(a) * 58);
              ctx.lineTo(Math.cos(b) * 58, Math.sin(b) * 58);
            }
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        for (const p of pts) {
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, awakened ? 6.8 : 5.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } finally {
        ctx.restore();
      }
    } else if (skinId === 'radiant_seraph') {
      const scale = awakened ? 1.32 : 1.04;
      const flap = Math.sin(t * (awakened ? 7.2 : 3.8));

      if (awakened) {
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(cx - 4, cy - 12);
          ctx.rotate(t * 1.6);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, 52, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([12, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, 62, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } finally {
          ctx.restore();
        }
      }

      const drawWingSet = (sideDir: -1 | 1, alphaMult: number, sizeMult: number) => {
        const tiers = [
          { ang: -0.95 + flap * 0.14, len: 74 * scale * sizeMult, w: 14 * scale * sizeMult, col: '#fef9c3', sh: '#cbd5e1', rim: '#f59e0b' },
          { ang: -0.45 + flap * 0.1, len: 62 * scale * sizeMult, w: 12 * scale * sizeMult, col: '#ffffff', sh: '#e2e8f0', rim: '#facc15' },
          { ang: 0.08 + flap * 0.07, len: 48 * scale * sizeMult, w: 10 * scale * sizeMult, col: '#fef3c7', sh: '#d97706', rim: '#eab308' },
        ];
        ctx.save();
        try {
          ctx.globalAlpha = alphaMult;
          ctx.translate(cx + sideDir * 3, cy);
          ctx.scale(sideDir, 1);
          for (const wl of tiers) {
            ctx.save();
            try {
              ctx.rotate(wl.ang);
              drawInkFeatheredWingTier(
                ctx,
                wl.len,
                wl.w,
                wl.col,
                wl.sh,
                '#0b0c10',
                wl.rim,
                awakened ? 'rgba(250, 204, 21, 0.42)' : 'rgba(253, 224, 71, 0.25)'
              );
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }
      };

      drawWingSet(1, 0.72, 0.82);
      drawWingSet(-1, 1.0, 1.0);

      if (awakened) {
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.8;
          for (let i = 0; i < 3; i++) {
            const phase = t * 9 + i * 2.1;
            const ax = cx + Math.cos(phase) * 34;
            const ay = cy - 18 + Math.sin(phase * 1.3) * 26;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax + Math.sin(phase * 3) * 10, ay + 14);
            ctx.lineTo(ax - Math.cos(phase * 2.5) * 9, ay + 28);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      }

      const sway = Math.sin(t * 6) * 6;
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hip.x - 2, hip.y);
      ctx.quadraticCurveTo(hip.x - 24, hip.y + 8 + sway * 0.5, hip.x - 40, hip.y + 24 + sway);
      ctx.lineTo(hip.x - 20, hip.y + 18 + sway * 0.6);
      ctx.lineTo(hip.x - 24, hip.y + 26 + sway * 0.7);
      ctx.lineTo(hip.x - 6, hip.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (skinId === 'void_walker') {
      if (awakened) {
        // Layered ink-wash singularity vortex rings (no per-frame gradient allocations)
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(cx - 8, cy - 6);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.14)';
          ctx.beginPath();
          ctx.arc(0, 0, 56, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(168, 85, 247, 0.28)';
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(15, 7, 32, 0.9)';
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 2.6;
          ctx.rotate(-t * 3.4);
          ctx.setLineDash([14, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, 44, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } finally {
          ctx.restore();
        }

        // Layered cel-shaded Nebula Cloak polygons (no per-frame gradient allocations)
        const wave = Math.sin(t * 7.5) * 10;
        ctx.fillStyle = '#4c1d95';
        ctx.strokeStyle = '#070410';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.quadraticCurveTo(cx - 42, cy + 8 + wave * 0.5, cx - 76, 6 + wave);
        ctx.lineTo(cx - 48, 12 + wave * 0.7);
        ctx.lineTo(cx - 26, 4 + wave * 0.4);
        ctx.lineTo(cx + 4, cy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.quadraticCurveTo(cx - 24, cy + 4 + wave * 0.3, cx - 44, 4 + wave * 0.6);
        ctx.lineTo(cx - 26, 4 + wave * 0.4);
        ctx.lineTo(cx + 3, cy + 10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.quadraticCurveTo(cx - 42, cy + 8 + wave * 0.5, cx - 76, 6 + wave);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        for (let s = 0; s < 5; s++) {
          const sx2 = cx - 18 - s * 11;
          const sy2 = cy + 6 + (s % 2 === 0 ? -4 : 6) + wave * 0.35;
          ctx.beginPath();
          ctx.arc(sx2, sy2, 1.3 + (s % 2) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = 0; i < 2; i++) {
        const phase = t * 5.2 + i * Math.PI;
        const sway = Math.sin(phase) * 9;
        const len = (awakened ? 60 : 44) + i * 8;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy + i * 6);
        ctx.bezierCurveTo(
          cx - len * 0.45,
          cy - 18 + sway,
          cx - len * 0.85,
          cy + 14 - sway,
          cx - len,
          cy - 8 + sway
        );
        ctx.stroke();

        ctx.strokeStyle = i === 0 ? '#a855f7' : '#e879f9';
        ctx.lineWidth = 3.2;
        ctx.stroke();
      }

      for (let c = 0; c < 3; c++) {
        const ang = t * 2.4 + (c * Math.PI * 2) / 3;
        const sx2 = cx - 8 + Math.cos(ang) * (awakened ? 38 : 28);
        const sy2 = cy - 4 + Math.sin(ang) * (awakened ? 24 : 18);
        ctx.save();
        try {
          ctx.translate(sx2, sy2);
          ctx.rotate(ang + Math.PI * 0.5);
          ctx.fillStyle = '#e879f9';
          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -6.5);
          ctx.lineTo(3.5, 0);
          ctx.lineTo(0, 6.5);
          ctx.lineTo(-3.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (skinId === 'eclipse_ronin') {
      // Eclipse Sun-Ring + tattered ink-vermilion haori streamers
      const r = awakened ? 42 : 31;
      const ox = cx - 6;
      const oy = cy - 8;

      // Outer crimson-ember eclipse ring with sumi-ink inner disc
      drawInkRing(ctx, ox, oy, r, r, 0, '#09090b', '#dc2626', 3.4);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ox, oy, r + 2.2, -Math.PI * 0.35, Math.PI * 0.55);
      ctx.stroke();

      ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
      ctx.beginPath();
      ctx.arc(ox - 2, oy, r * 0.62, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting calligraphy brush ticks around eclipse ring
      for (let i = 0; i < 4; i++) {
        const a = t * 1.9 + (i * Math.PI) / 2;
        const px = ox + Math.cos(a) * r;
        const py = oy + Math.sin(a) * r;
        ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#fde047';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Tattered ink-vermilion haori streamers
      const sway = Math.sin(t * 7.5) * 8;
      for (let i = 0; i < 2; i++) {
        const yOff = i * 9;
        ctx.fillStyle = i === 0 ? '#b91c1c' : '#18181b';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + yOff);
        ctx.quadraticCurveTo(
          cx - 26,
          cy + 8 + yOff + sway * 0.5,
          cx - 48 - i * 8,
          cy + 18 + yOff + sway
        );
        ctx.lineTo(cx - 32, cy + 20 + yOff + sway * 0.7);
        ctx.lineTo(cx - 38, cy + 26 + yOff + sway * 0.8);
        ctx.lineTo(cx - 6, cy + 12 + yOff);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = i === 0 ? '#fde047' : '#dc2626';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy + yOff + 1);
        ctx.quadraticCurveTo(cx - 24, cy + 7 + yOff + sway * 0.5, cx - 44 - i * 6, cy + 16 + yOff + sway);
        ctx.stroke();
      }
    } else if (skinId === 'storm_shogun') {
      const r = awakened ? 44 : 34;
      ctx.save();
      try {
        ctx.translate(cx - 4, cy - 8);
        ctx.strokeStyle = '#070b18';
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        for (let d = 0; d < 5; d++) {
          const a = t * 1.4 + (d * Math.PI * 2) / 5 - Math.PI * 0.5;
          const dx = Math.cos(a) * r;
          const dy = Math.sin(a) * r;
          ctx.fillStyle = '#1e3a8a';
          ctx.strokeStyle = '#070b18';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(dx, dy, awakened ? 7.5 : 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(dx, dy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } finally {
        ctx.restore();
      }
    } else if (skinId === 'cyber_valkyrie') {
      const scale = awakened ? 1.28 : 1.0;
      const pulse = 0.78 + 0.22 * Math.sin(t * 12);
      ctx.save();
      try {
        for (let w = 0; w < 3; w++) {
          const ang = -0.82 + w * 0.34;
          const len = (66 - w * 11) * scale;
          ctx.save();
          try {
            ctx.translate(cx - 4, cy);
            ctx.rotate(ang);
            ctx.fillStyle =
              w % 2 === 0
                ? colorWithAlpha('#e879f9', 0.45 * pulse)
                : colorWithAlpha('#22d3ee', 0.48 * pulse);
            ctx.strokeStyle = '#090418';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(0, -3);
            ctx.lineTo(-len * 0.72, -10);
            ctx.lineTo(-len, 0);
            ctx.lineTo(-len * 0.65, 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = w % 2 === 0 ? '#f0abfc' : '#67e8f9';
            ctx.lineWidth = 1.6;
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (skinId === 'solar_phoenix') {
      const scale = awakened ? 1.3 : 1.02;
      const flap = Math.sin(t * 6.5) * 0.14;
      drawInkRing(ctx, cx - 4, cy - 10, 32 * scale, 32 * scale, 0, '#120402', '#facc15', 2.8);

      ctx.save();
      try {
        const plumes = [
          { ang: -0.92 + flap, len: 72 * scale, col: '#ef4444', tip: '#fef08a' },
          { ang: -0.42 + flap * 0.8, len: 62 * scale, col: '#f97316', tip: '#ffffff' },
          { ang: 0.08 + flap * 0.5, len: 48 * scale, col: '#facc15', tip: '#fef9c3' },
        ];
        for (const p of plumes) {
          ctx.save();
          try {
            ctx.translate(cx - 3, cy);
            ctx.rotate(p.ang);
            ctx.fillStyle = p.col;
            ctx.strokeStyle = '#120402';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-p.len * 0.5, -18, -p.len, -2);
            ctx.quadraticCurveTo(-p.len * 0.55, 11, 0, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = p.tip;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.quadraticCurveTo(-p.len * 0.45, -7, -p.len * 0.85, -1);
            ctx.quadraticCurveTo(-p.len * 0.45, 5, -6, 2);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (skinId === 'frost_empress') {
      const scale = awakened ? 1.26 : 1.0;
      const flap = Math.sin(t * 4.5) * 0.1;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        try {
          ctx.translate(cx - 4, cy);
          ctx.rotate(-0.85 + i * 0.42 + flap);
          const len = (64 - i * 10) * scale;
          ctx.fillStyle = i === 1 ? '#e0f2fe' : '#38bdf8';
          ctx.strokeStyle = '#060c18';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-len * 0.55, -11);
          ctx.lineTo(-len, -2);
          ctx.lineTo(-len * 0.62, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-4, -1);
          ctx.lineTo(-len * 0.85, -2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }

      for (let k = 0; k < 2; k++) {
        const a = t * 3.2 + k * Math.PI;
        const ox = cx - 8 + Math.cos(a) * 34;
        const oy = cy - 6 + Math.sin(a) * 20;
        ctx.fillStyle = k === 0 ? '#22d3ee' : '#c084fc';
        ctx.strokeStyle = '#060c18';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox, oy, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skinId === 'blood_moon') {
      // Blood Moon crimson crescent sigil + scarlet ribbons (dark eclipse overlay, no composite cutout)
      const r = awakened ? 38 : 28;
      ctx.save();
      try {
        ctx.translate(cx - 10, cy - 10);
        ctx.fillStyle = '#0b0508';
        ctx.beginPath();
        ctx.arc(0, 0, r + 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(225, 29, 72, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0c0a14';
        ctx.beginPath();
        ctx.arc(r * 0.34, -r * 0.14, r * 0.82, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 0.55, Math.PI * 1.65);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    } else if (skinId === 'astral_phantom') {
      ctx.save();
      try {
        ctx.translate(cx - 6, cy - 8);
        ctx.globalCompositeOperation = 'lighter';
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          ctx.save();
          try {
            ctx.rotate(t * (rIdx === 0 ? 1.5 : -1.2) + rIdx * 0.8);
            ctx.strokeStyle = rIdx === 0 ? 'rgba(56, 189, 248, 0.72)' : 'rgba(250, 204, 21, 0.65)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, awakened ? 44 : 34, awakened ? 16 : 12, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(awakened ? 44 : 34, 0, 2.8, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (skinId === 'celestial_empress' || skinId === 'abyssal_valkyrie') {
      // Valkyrie Mythic / Legendary back attachment: skin-themed winged mantle + spear-halo
      const isCelestial = skinId === 'celestial_empress';
      const scale = awakened ? 1.3 : 1.05;
      const flap = Math.sin(t * (awakened ? 6.8 : 4.1));
      const fillCol = isCelestial ? '#0284c7' : '#9f1239';
      const shadowCol = isCelestial ? '#1e3a8a' : '#4c0519';
      const outlineCol = isCelestial ? '#060a18' : '#09040a';
      const rimCol = isCelestial ? '#fde047' : '#e879f9';
      const glowCol = isCelestial
        ? colorWithAlpha('#38bdf8', 0.32)
        : colorWithAlpha('#f43f5e', 0.34);

      drawInkRing(ctx, cx - 4, cy - 10, 34 * scale, 34 * scale, 0, outlineCol, rimCol, 2.6);
      const drawValkSide = (sideDir: -1 | 1, alphaMult: number, sizeMult: number) => {
        ctx.save();
        try {
          ctx.globalAlpha = alphaMult;
          ctx.translate(cx + sideDir * 3, cy);
          ctx.scale(sideDir, 1);
          for (let tier = 0; tier < 3; tier++) {
            const ang = -0.9 + tier * 0.48 + flap * (0.13 - tier * 0.03);
            const len = (68 - tier * 11) * scale * sizeMult;
            const w = (13 - tier * 1.8) * scale * sizeMult;
            ctx.save();
            try {
              ctx.rotate(ang);
              drawInkFeatheredWingTier(
                ctx,
                len,
                w,
                fillCol,
                shadowCol,
                outlineCol,
                rimCol,
                glowCol
              );
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }
      };
      drawValkSide(1, 0.7, 0.8);
      drawValkSide(-1, 1.0, 1.0);
    } else if (skinId === 'void_shatterer') {
      // Ma Kính (void_shatterer): Fractured double dimensional halo ring + 4 large hovering obsidian/crimson-cyan winged mirror blades
      const scale = awakened ? 1.24 : 1.0;
      const haloX = cx - 6;
      const haloY = cy - 10;
      const outerR = 39 * scale;
      const innerR = 26 * scale;

      // Outer fractured dimensional halo ring (broken obsidian + crimson arc segments)
      ctx.save();
      try {
        ctx.translate(haloX, haloY);
        ctx.rotate(t * 0.9);
        for (let seg = 0; seg < 4; seg++) {
          const sa = seg * (Math.PI * 0.5) + 0.14;
          const ea = sa + Math.PI * 0.34;
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 5.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, outerR, sa, ea);
          ctx.stroke();

          ctx.strokeStyle = seg % 2 === 0 ? '#f43f5e' : '#38bdf8';
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }

      // Inner tilted cyan-silver prism halo ring
      drawInkRing(
        ctx,
        haloX,
        haloY,
        innerR,
        innerR * 0.72,
        -t * 1.15,
        '#07040a',
        '#e0f2fe',
        2.0
      );

      // 4 Large hovering obsidian/crimson-cyan winged mirror blades fanned behind the back
      const bladeSpecs = [
        { ang: -1.18, dist: 38 * scale, len: 30 * scale, w: 7.5, flip: false },
        { ang: -2.18, dist: 42 * scale, len: 34 * scale, w: 8.2, flip: true },
        { ang: 2.38, dist: 36 * scale, len: 28 * scale, w: 7.0, flip: false },
        { ang: 1.48, dist: 32 * scale, len: 24 * scale, w: 6.4, flip: true },
      ];
      for (let i = 0; i < bladeSpecs.length; i++) {
        const b = bladeSpecs[i];
        const hover = Math.sin(t * 4.6 + i * 1.35) * 3.5;
        const bx = haloX + Math.cos(b.ang) * (b.dist + hover);
        const by = haloY + Math.sin(b.ang) * (b.dist + hover);
        ctx.save();
        try {
          ctx.translate(bx, by);
          ctx.rotate(b.ang + (b.flip ? 0.15 : -0.15));
          // Obsidian mirror blade body
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 2.2;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(b.len * 0.65, 0);
          ctx.lineTo(0, -b.w);
          ctx.lineTo(-b.len * 0.48, -b.w * 0.35);
          ctx.lineTo(-b.len * 0.35, b.w * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Crimson bevel half
          ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#9f1239';
          ctx.beginPath();
          ctx.moveTo(b.len * 0.62, 0);
          ctx.lineTo(0, -b.w * 0.85);
          ctx.lineTo(-b.len * 0.42, -b.w * 0.25);
          ctx.closePath();
          ctx.fill();

          // Crisp cyan-silver edge rim
          ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#e0f2fe';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(b.len * 0.6, 0);
          ctx.lineTo(0, -b.w * 0.82);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (skinId === 'chrono_sovereign') {
      // Thần Thời Gian (chrono_sovereign): Giant multi-ring rotating mechanical gear halo + Roman ticks + floating clock hands
      const scale = awakened ? 1.24 : 1.0;
      const haloX = cx - 5;
      const haloY = cy - 10;
      const outerR = 40 * scale;
      const innerR = 26 * scale;

      // 1. Outer rotating antique-gold cogwheel halo with 12 Roman ticks & gear teeth
      ctx.save();
      try {
        ctx.translate(haloX, haloY);
        ctx.rotate(t * 0.72);

        // Sumi-ink halo ring + gold bevel
        ctx.strokeStyle = '#0a0704';
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // 12 gear teeth + cardinal Roman tick flares
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12;
          const isCardinal = i % 3 === 0;
          const r0 = outerR - (isCardinal ? 5 : 2);
          const r1 = outerR + (isCardinal ? 7.5 : 4.5);
          ctx.strokeStyle = '#0a0704';
          ctx.lineWidth = isCardinal ? 4.4 : 3.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.stroke();

          ctx.strokeStyle = isCardinal ? '#fef08a' : '#b45309';
          ctx.lineWidth = isCardinal ? 2.2 : 1.6;
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }

      // 2. Counter-rotating inner azure-silver astrolabe ring
      drawInkRing(
        ctx,
        haloX,
        haloY,
        innerR,
        innerR * 0.78,
        -t * 1.15,
        '#0a0704',
        '#38bdf8',
        2.1
      );

      // 3. Two giant floating beveled clock hands sweeping behind shoulders
      for (const [handAng, handLen, col, rim] of [
        [t * 1.4 - 0.8, 36 * scale, '#f59e0b', '#fef9c3'],
        [-t * 0.55 + 2.1, 27 * scale, '#38bdf8', '#e0f2fe'],
      ] as const) {
        ctx.save();
        try {
          ctx.translate(haloX, haloY);
          ctx.rotate(handAng);
          ctx.fillStyle = col;
          ctx.strokeStyle = '#0a0704';
          ctx.lineWidth = 2.0;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(4, -3.5);
          ctx.lineTo(handLen, 0);
          ctx.lineTo(4, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = rim;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(4, -1.2);
          ctx.lineTo(handLen - 3, 0);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (skinId === 'xuan_feng_sage') {
      // Xuân Phong Văn Thánh: Thiên Địa Văn Luân 3 tầng (Viên Tương đậm-nhạt, Bát Quái Văn Kinh 8 khắc xoay ngược, 6 thẻ trúc/ấn triện quỹ đạo 3D)
      const wheelX = cx - 2;
      const wheelY = cy - 8;
      const scale = awakened ? 1.24 : 1.0;
      const ensoR = 25 * scale;
      const midR = 35 * scale;

      // Layer 1 (Inner): Thick-thin Enso brush ring with ink-wash bleed
      ctx.save();
      try {
        ctx.translate(wheelX, wheelY);
        ctx.rotate(t * 0.28);
        ctx.lineCap = 'round';

        // Soft ink-wash & jade-teal bleed halo
        ctx.strokeStyle = colorWithAlpha('#1e293b', awakened ? 0.34 : 0.46);
        ctx.lineWidth = awakened ? 9.6 : 7.8;
        ctx.beginPath();
        ctx.arc(0, 0, ensoR, 0.24, Math.PI * 1.78);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#2dd4bf', awakened ? 0.30 : 0.20);
        ctx.lineWidth = awakened ? 7.2 : 5.8;
        ctx.beginPath();
        ctx.arc(0, 0, ensoR, 0.28, Math.PI * 1.72);
        ctx.stroke();

        // Variable-thickness calligraphic Enso segments (thick ink head -> slim tapered brush tail)
        const segs = 12;
        const startA = 0.28;
        const endA = Math.PI * 1.74;
        for (let s = 0; s < segs; s++) {
          const f0 = s / segs;
          const f1 = (s + 1) / segs;
          const a0 = startA + (endA - startA) * f0;
          const a1 = startA + (endA - startA) * f1;
          const bell = Math.sin(Math.pow(f0, 0.72) * Math.PI);
          const wInk = (2.2 + bell * 4.0) * (awakened ? 1.15 : 1.0);
          const wSilk = (1.1 + bell * 2.3) * (awakened ? 1.15 : 1.0);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = wInk;
          ctx.beginPath();
          ctx.arc(0, 0, ensoR, a0, a1 + 0.03);
          ctx.stroke();

          ctx.strokeStyle = awakened ? '#ffffff' : '#f8fafc';
          ctx.lineWidth = wSilk;
          ctx.beginPath();
          ctx.arc(0, 0, ensoR, a0, a1 + 0.02);
          ctx.stroke();
        }

        // Inner Jade-Teal & Pale-Gold calligraphic edge filaments
        ctx.strokeStyle = awakened ? '#5eead4' : '#2dd4bf';
        ctx.lineWidth = 1.45;
        ctx.beginPath();
        ctx.arc(0, 0, ensoR - 1.4, 0.34, Math.PI * 1.56);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#fde68a', awakened ? 0.85 : 0.58);
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, ensoR + 1.5, 0.42, Math.PI * 1.35);
        ctx.stroke();

        // Dry-brush bristle wisps at open gap
        ctx.strokeStyle = colorWithAlpha('#1e293b', 0.55);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, ensoR + 1.0, Math.PI * 1.77, Math.PI * 1.89);
        ctx.stroke();
        ctx.strokeStyle = colorWithAlpha('#5eead4', 0.6);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, ensoR - 1.1, Math.PI * 1.76, Math.PI * 1.86);
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // Layer 2 (Middle): Fine octagonal / scripture ring with 8 counter-rotating engraved ticks
      ctx.save();
      try {
        ctx.translate(wheelX, wheelY);
        ctx.rotate(-t * 0.44);

        // Fine octagonal outer frame
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
          const ox = Math.cos(a) * midR;
          const oy = Math.sin(a) * midR;
          if (i === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = awakened ? '#5eead4' : '#2dd4bf';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Concentric fine pale-gold scripture ring & dashed inner ring
        ctx.strokeStyle = colorWithAlpha('#fde68a', awakened ? 0.88 : 0.66);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, midR * 0.92, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.52);
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, midR * 0.84, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 8 counter-rotating engraved ticks (cardinals with pale-gold diamond finials)
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          const isCardinal = i % 2 === 0;
          const r0 = midR - (isCardinal ? 5.5 : 3.2);
          const r1 = midR + (isCardinal ? 5.8 : 3.4);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = isCardinal ? 3.2 : 2.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.stroke();

          ctx.strokeStyle = isCardinal ? '#fde68a' : '#5eead4';
          ctx.lineWidth = isCardinal ? 1.6 : 1.15;
          ctx.stroke();

          if (isCardinal) {
            const fx = Math.cos(a) * (r1 + 2.4);
            const fy = Math.sin(a) * (r1 + 2.4);
            ctx.fillStyle = '#fde68a';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(fx, fy - 2.2);
            ctx.lineTo(fx + 2.2, fy);
            ctx.lineTo(fx, fy + 2.2);
            ctx.lineTo(fx - 2.2, fy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      } finally {
        ctx.restore();
      }

      // Layer 3 (Outer, Back-Pass): 3D elliptical Jade Bamboo Slips & Small Seals behind character (depth < 0)
      renderXuanFengOrbitSlipsPass(ctx, joints, awakened, t, 'back', vx, vy);

      // Subtle back-drifting peach blossom petals behind shoulders
      for (let p = 0; p < 2; p++) {
        const pAng = -t * 0.9 + p * Math.PI + 0.5;
        const px = wheelX + Math.cos(pAng) * (28 * scale);
        const py = wheelY + 6 + Math.sin(pAng * 1.3 + p) * (15 * scale);
        ctx.save();
        try {
          ctx.translate(px, py);
          ctx.rotate(t * 1.2 + p * 1.5);
          ctx.globalAlpha = 0.78;
          ctx.fillStyle = p === 0 ? '#fda4af' : '#fbcfe8';
          ctx.strokeStyle = colorWithAlpha('#1e293b', 0.6);
          ctx.lineWidth = 0.95;
          ctx.beginPath();
          ctx.moveTo(0, -3.4);
          ctx.quadraticCurveTo(3.4, -0.9, 1.7, 3.0);
          ctx.quadraticCurveTo(0, 3.6, -1.7, 3.0);
          ctx.quadraticCurveTo(-3.4, -0.9, 0, -3.4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (skinId === 'default') {
      const charId = inferCharacterFromSkin(skinId, characterId);
      const pal = getSkinInkPalette(charId, 'default', awakened);
      if (charId === 'aether') {
        // Aether default: floating ink-calligraphy arcane ring + 3 floating glyph sigils
        const ringR = awakened ? 42 : 33;
        drawInkRing(ctx, cx - 4, cy - 8, ringR, ringR, t * 0.4, pal.inkOutline, pal.glowCore, 2.6);
        drawInkRing(ctx, cx - 4, cy - 8, ringR * 0.72, ringR * 0.72, -t * 0.6, pal.inkOutline, pal.accentColor, 1.6);
        for (let i = 0; i < 3; i++) {
          const a = t * 2.2 + (i * Math.PI * 2) / 3;
          const gx = cx - 4 + Math.cos(a) * ringR;
          const gy = cy - 8 + Math.sin(a) * ringR;
          ctx.fillStyle = i === 0 ? pal.accentColor : pal.clothHighlight;
          ctx.strokeStyle = pal.inkOutline;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(gx, gy - 5);
          ctx.lineTo(gx + 4, gy);
          ctx.lineTo(gx, gy + 5);
          ctx.lineTo(gx - 4, gy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (charId === 'mirage') {
        // Mirage default: Sleek rotating faceted prism ring + 4 orbiting beveled silver-violet mirror shards
        const ringR = awakened ? 38 : 30;
        const hxRing = cx - 5;
        const hyRing = cy - 8;

        // Faceted octagonal ink-washed prism ring
        ctx.save();
        try {
          ctx.translate(hxRing, hyRing);
          ctx.rotate(t * 0.7);
          ctx.strokeStyle = pal.inkOutline;
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            const px = Math.cos(a) * ringR;
            const py = Math.sin(a) * ringR;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = pal.accentColor;
          ctx.lineWidth = 1.9;
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // 4 orbiting sleek prism shards
        for (let i = 0; i < 4; i++) {
          const a = t * 2.1 + (i * Math.PI * 2) / 4;
          const sx = hxRing + Math.cos(a) * ringR;
          const sy = hyRing + Math.sin(a) * ringR;
          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.rotate(a + Math.PI * 0.5);
            ctx.fillStyle = i % 2 === 0 ? '#f1f5f9' : '#c084fc';
            ctx.strokeStyle = pal.inkOutline;
            ctx.lineWidth = 1.7;
            ctx.beginPath();
            ctx.moveTo(0, -7.5);
            ctx.lineTo(3.8, 0);
            ctx.lineTo(0, 7.5);
            ctx.lineTo(-3.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
      } else if (charId === 'chrono') {
        // Chrono default: Compact brass clock-pendulum + teal-bronze ink scarf & half-gear halo
        const pendSwing = Math.sin(t * 4.4) * 0.34;
        const sway = Math.sin(t * 6.2) * 5.5;
        const px = cx - 4;
        const py = cy - 4;

        // Compact half-gear brass ring behind shoulders
        drawInkRing(ctx, px, py, awakened ? 26 : 21, awakened ? 26 : 21, t * 0.9, pal.inkOutline, '#2dd4bf', 2.0);

        // Swinging brass clock-pendulum behind cloak
        ctx.save();
        try {
          ctx.translate(px, py + 2);
          ctx.rotate(pendSwing);
          ctx.strokeStyle = pal.inkOutline;
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-4, 24);
          ctx.stroke();

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.9;
          ctx.stroke();

          ctx.fillStyle = '#0f766e';
          ctx.strokeStyle = pal.inkOutline;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(-4, 26, 6.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // Flowing teal-bronze ink scarf ribbon
        ctx.strokeStyle = pal.inkOutline;
        ctx.lineWidth = 5.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx - 22, cy + 5 + sway * 0.4, cx - 36, cy + 14 + sway);
        ctx.stroke();
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      } else if (charId === 'mactien') {
        // Mặc Tiên: Lá trúc ngọc bích & giọt mực thủy mặc (hoặc Kim Mặc khi Thức Tỉnh) bay lơ lửng quanh người
        const leafColor = awakened ? '#fde047' : '#2dd4bf';
        const inkColor = awakened ? '#f59e0b' : '#1a1d24';
        const rimColor = awakened ? '#fef9c3' : '#f4f1ea';

        // Faint calligraphic sumi-e ink halo behind shoulders
        drawInkRing(
          ctx,
          cx - 2,
          cy - 6,
          awakened ? 27 : 22,
          awakened ? 27 : 22,
          t * 0.7,
          pal.inkOutline,
          leafColor,
          awakened ? 2.2 : 1.7
        );

        // 3 floating bamboo leaves orbiting smoothly around Mặc Tiên
        for (let i = 0; i < 3; i++) {
          const ang = t * 1.45 + (i * Math.PI * 2) / 3;
          const lx = cx + Math.cos(ang) * (awakened ? 34 : 28);
          const ly = cy - 4 + Math.sin(ang * 1.3 + i) * 18;
          ctx.save();
          try {
            ctx.translate(lx, ly);
            ctx.rotate(ang + 0.6);
            ctx.fillStyle = leafColor;
            ctx.strokeStyle = pal.inkOutline;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(-6.5, 0);
            ctx.quadraticCurveTo(0, -3.4, 7.5, 0);
            ctx.quadraticCurveTo(0, 3.4, -6.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // 3 floating ink droplets with soft paper/gold specular dot
        for (let j = 0; j < 3; j++) {
          const dAng = -t * 1.85 + j * 2.15 + 0.8;
          const dx = cx + Math.cos(dAng) * (awakened ? 24 : 20);
          const dy = cy + 2 + Math.sin(dAng * 1.5) * 16;
          const r = awakened ? 3.2 : 2.7;
          ctx.fillStyle = inkColor;
          ctx.strokeStyle = pal.inkOutline;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(dx, dy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = rimColor;
          ctx.beginPath();
          ctx.arc(dx - 0.8, dy - 0.8, r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (charId === 'valkyrie') {
        // Valkyrie default: gold-white winged mantle + spear-halo
        const scale = awakened ? 1.28 : 1.02;
        const flap = Math.sin(t * 4.2);
        drawInkRing(ctx, cx - 4, cy - 10, 32 * scale, 32 * scale, 0, pal.inkOutline, '#facc15', 2.4);
        ctx.save();
        try {
          ctx.translate(cx - 3, cy);
          ctx.scale(-1, 1);
          for (let tier = 0; tier < 3; tier++) {
            ctx.save();
            try {
              ctx.rotate(-0.9 + tier * 0.46 + flap * 0.1);
              drawInkFeatheredWingTier(
                ctx,
                (64 - tier * 10) * scale,
                (12 - tier * 1.6) * scale,
                '#fef9c3',
                '#cbd5e1',
                pal.inkOutline,
                '#f59e0b',
                colorWithAlpha('#fde047', 0.25)
              );
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }
      } else {
        // Subtle sumi-ink back ribbon / emblem for default kuro, raijin, kagura, zero
        const sway = Math.sin(t * 6.5) * 6;
        ctx.strokeStyle = pal.inkOutline;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx - 20, cy + 6 + sway * 0.5, cx - 34, cy + 16 + sway);
        ctx.stroke();
        ctx.strokeStyle = pal.accentColor;
        ctx.lineWidth = 2.1;
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
}

interface ArmorSpec {
  plate: string;
  shadow: string;
  outline: string;
  trim: string;
  core: string;
  pauldron: string;
  sash: string;
  spiked: boolean;
  style:
    | 'haori'
    | 'plate'
    | 'tabard'
    | 'vest'
    | 'mirror_haori'
    | 'void_cloak'
    | 'chrono_coat'
    | 'sovereign_clockplate'
    | 'scholar_robe'
    | 'xuan_feng_robe';
}

function getArmorSpec(
  charId: CharacterId,
  skinId: SkinId,
  awakened: boolean,
  pal: SkinInkPalette
): ArmorSpec {
  const key = `${charId}:${skinId}`;
  switch (key) {
    case 'kuro:radiant_seraph':
      return {
        plate: awakened ? '#fef9c3' : '#f8fafc',
        shadow: '#94a3b8',
        outline: pal.inkOutline,
        trim: '#f59e0b',
        core: '#fde047',
        pauldron: '#fef08a',
        sash: '#f59e0b',
        spiked: true,
        style: 'plate',
      };
    case 'kuro:void_walker':
      return {
        plate: awakened ? '#312e81' : '#1e1b4b',
        shadow: '#0c0a24',
        outline: pal.inkOutline,
        trim: '#c084fc',
        core: '#e879f9',
        pauldron: '#3b0764',
        sash: '#7e22ce',
        spiked: true,
        style: 'plate',
      };
    case 'kuro:eclipse_ronin':
      return {
        plate: '#18181b',
        shadow: '#09090b',
        outline: '#09090b',
        trim: '#dc2626',
        core: '#fde047',
        pauldron: '#27272a',
        sash: '#b91c1c',
        spiked: true,
        style: 'haori',
      };
    case 'kuro:default':
      return {
        plate: '#1f232c',
        shadow: '#0b0c10',
        outline: '#0b0c10',
        trim: '#2563eb',
        core: '#ef4444',
        pauldron: '#334155',
        sash: '#dc2626',
        spiked: false,
        style: 'haori',
      };
    case 'raijin:storm_shogun':
      return {
        plate: '#1e3a8a',
        shadow: '#11256b',
        outline: pal.inkOutline,
        trim: '#facc15',
        core: '#38bdf8',
        pauldron: '#1d4ed8',
        sash: '#f8fafc',
        spiked: true,
        style: 'plate',
      };
    case 'raijin:cyber_valkyrie':
      return {
        plate: '#0f172a',
        shadow: '#060a14',
        outline: pal.inkOutline,
        trim: '#22d3ee',
        core: '#e879f9',
        pauldron: '#1e1b4b',
        sash: '#0891b2',
        spiked: true,
        style: 'plate',
      };
    case 'raijin:default':
      return {
        plate: '#0e5268',
        shadow: '#083344',
        outline: pal.inkOutline,
        trim: '#facc15',
        core: '#22d3ee',
        pauldron: '#0369a1',
        sash: '#ca8a04',
        spiked: false,
        style: 'vest',
      };
    case 'kagura:solar_phoenix':
      return {
        plate: '#991b1b',
        shadow: '#5c0c0c',
        outline: pal.inkOutline,
        trim: '#facc15',
        core: '#fef08a',
        pauldron: '#ea580c',
        sash: '#fef3c7',
        spiked: true,
        style: 'plate',
      };
    case 'kagura:frost_empress':
      return {
        plate: '#0f172a',
        shadow: '#060c18',
        outline: pal.inkOutline,
        trim: '#38bdf8',
        core: '#c084fc',
        pauldron: '#0369a1',
        sash: '#3b0764',
        spiked: true,
        style: 'haori',
      };
    case 'kagura:default':
      return {
        plate: '#1e293b',
        shadow: '#0f172a',
        outline: pal.inkOutline,
        trim: '#e11d48',
        core: '#f97316',
        pauldron: '#6b0b24',
        sash: '#f97316',
        spiked: false,
        style: 'haori',
      };
    case 'zero:blood_moon':
      return {
        plate: '#18181b',
        shadow: '#09090b',
        outline: pal.inkOutline,
        trim: '#e11d48',
        core: '#fda4af',
        pauldron: '#4c0519',
        sash: '#be123c',
        spiked: true,
        style: 'haori',
      };
    case 'zero:astral_phantom':
      return {
        plate: '#1e1b4b',
        shadow: '#0c0a28',
        outline: pal.inkOutline,
        trim: '#fde047',
        core: '#38bdf8',
        pauldron: '#312e81',
        sash: '#4338ca',
        spiked: false,
        style: 'vest',
      };
    case 'zero:default':
      return {
        plate: '#064e3b',
        shadow: '#022c22',
        outline: pal.inkOutline,
        trim: '#34d399',
        core: '#a7f3d0',
        pauldron: '#047857',
        sash: '#10b981',
        spiked: false,
        style: 'vest',
      };
    case 'aether:prismatic_archon':
      return {
        plate: '#1e1b4b',
        shadow: '#0e0b2b',
        outline: pal.inkOutline,
        trim: '#fde047',
        core: '#38bdf8',
        pauldron: '#7c3aed',
        sash: '#f43f5e',
        spiked: true,
        style: 'tabard',
      };
    case 'aether:default':
      return {
        plate: '#4c1d95',
        shadow: '#240b4d',
        outline: pal.inkOutline,
        trim: '#e879f9',
        core: '#38bdf8',
        pauldron: '#581c87',
        sash: '#7c3aed',
        spiked: false,
        style: 'tabard',
      };
    case 'valkyrie:celestial_empress':
      return {
        plate: '#0f172a',
        shadow: '#060a14',
        outline: pal.inkOutline,
        trim: '#fde047',
        core: '#38bdf8',
        pauldron: '#0284c7',
        sash: '#0369a1',
        spiked: true,
        style: 'plate',
      };
    case 'valkyrie:abyssal_valkyrie':
      return {
        plate: '#18181b',
        shadow: '#09040a',
        outline: pal.inkOutline,
        trim: '#f43f5e',
        core: '#e879f9',
        pauldron: '#9f1239',
        sash: '#4c0519',
        spiked: true,
        style: 'plate',
      };
    case 'mirage:void_shatterer':
      return {
        plate: awakened ? '#3b0764' : '#18181b',
        shadow: '#09090b',
        outline: pal.inkOutline,
        trim: '#38bdf8',
        core: '#f43f5e',
        pauldron: '#18181b',
        sash: '#9f1239',
        spiked: true,
        style: 'void_cloak',
      };
    case 'mirage:default':
      return {
        plate: awakened ? '#312e81' : '#1e1b4b',
        shadow: '#0f0d2e',
        outline: pal.inkOutline,
        trim: '#c084fc',
        core: '#f1f5f9',
        pauldron: '#312e81',
        sash: '#6366f1',
        spiked: false,
        style: 'mirror_haori',
      };
    case 'chrono:chrono_sovereign':
      return {
        plate: awakened ? '#78350f' : '#1c1917',
        shadow: '#090705',
        outline: pal.inkOutline,
        trim: '#f59e0b',
        core: '#38bdf8',
        pauldron: '#92400e',
        sash: '#b45309',
        spiked: true,
        style: 'sovereign_clockplate',
      };
    case 'chrono:default':
      return {
        plate: awakened ? '#115e59' : '#0f766e',
        shadow: '#042f2e',
        outline: pal.inkOutline,
        trim: '#f59e0b',
        core: '#2dd4bf',
        pauldron: '#115e59',
        sash: '#d97706',
        spiked: false,
        style: 'chrono_coat',
      };
    case 'mactien:default':
      return {
        plate: awakened ? '#292118' : '#1a1d24',
        shadow: '#0c0e13',
        outline: pal.inkOutline,
        trim: awakened ? '#fde047' : '#f4f1ea',
        core: awakened ? '#f59e0b' : '#2dd4bf',
        pauldron: awakened ? '#78350f' : '#1a1d24',
        sash: '#ef4444',
        spiked: false,
        style: 'scholar_robe',
      };
    case 'mactien:xuan_feng_sage':
      return {
        plate: awakened ? '#f0fdfa' : '#f8fafc',
        shadow: awakened ? '#99f6e4' : '#e2e8f0',
        outline: pal.inkOutline,
        trim: awakened ? '#5eead4' : '#2dd4bf',
        core: '#5eead4',
        pauldron: '#f8fafc',
        sash: awakened ? '#5eead4' : '#2dd4bf',
        spiked: false,
        style: 'xuan_feng_robe',
      };
    case 'valkyrie:default':
    default:
      return {
        plate: awakened ? '#fef08a' : '#f8fafc',
        shadow: '#94a3b8',
        outline: pal.inkOutline,
        trim: '#facc15',
        core: '#fef9c3',
        pauldron: '#d97706',
        sash: '#d97706',
        spiked: true,
        style: 'plate',
      };
  }
}

export function renderSkinBodyArmor(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  skinId: SkinId,
  awakened: boolean,
  time: number,
  characterId?: CharacterId,
  vx = 0,
  vy = 0
): void {
  const modBody = getModularSkin(skinId)?.drawBody;
  if (modBody) {
    modBody({ ctx, joints, skinId, characterId, awakened, time });
    return;
  }
  const neck = safePt(joints.neck, 0, -80);
  const spineMid = safePt(joints.spineMid, 0, -64);
  const hip = safePt(joints.hip, 0, -48);
  const shL = safePt(joints.shoulderL, -4, -78);
  const shR = safePt(joints.shoulderR, 4, -78);
  const t = safeClock(time);

  const charId = inferCharacterFromSkin(skinId, characterId);
  const pal = getSkinInkPalette(charId, skinId, awakened);
  const spec = getArmorSpec(charId, skinId, awakened, pal);

  ctx.save();
  try {
    if (spec.style === 'void_cloak') {
      // Ma Kính (void_shatterer): Tattered obsidian-crimson void cloak coat-tails + jagged high collar + angular faceted mirror-plate pauldrons
      const sway = Math.sin(t * 7.8) * 6.5;

      // 1A. Tattered obsidian-crimson void coat-tails billowing from waist/hip
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x - 5, hip.y - 2);
      ctx.quadraticCurveTo(hip.x - 24, hip.y + 8 + sway * 0.4, hip.x - 42, hip.y + 24 + sway);
      ctx.lineTo(hip.x - 24, hip.y + 18 + sway * 0.65);
      ctx.lineTo(hip.x - 28, hip.y + 29 + sway * 0.8);
      ctx.lineTo(hip.x - 10, hip.y + 17 + sway * 0.4);
      ctx.lineTo(hip.x + 4, hip.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crimson inner cloak lining & cyan edge glint
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.moveTo(hip.x - 3, hip.y);
      ctx.quadraticCurveTo(hip.x - 18, hip.y + 7 + sway * 0.35, hip.x - 34, hip.y + 21 + sway * 0.9);
      ctx.lineTo(hip.x - 16, hip.y + 14 + sway * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hip.x - 4, hip.y - 1);
      ctx.quadraticCurveTo(hip.x - 22, hip.y + 7 + sway * 0.4, hip.x - 40, hip.y + 23 + sway);
      ctx.stroke();

      // 1B. Jagged high obsidian-crimson collar flaring around neck
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(neck.x - 9, neck.y + 4);
      ctx.lineTo(neck.x - 14, neck.y - 11);
      ctx.lineTo(neck.x - 4, neck.y - 5);
      ctx.lineTo(neck.x + 5, neck.y - 5);
      ctx.lineTo(neck.x + 12, neck.y - 10);
      ctx.lineTo(neck.x + 8, neck.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(neck.x - 12, neck.y - 9);
      ctx.lineTo(neck.x - 4, neck.y - 4);
      ctx.moveTo(neck.x + 10, neck.y - 8);
      ctx.lineTo(neck.x + 4, neck.y - 4);
      ctx.stroke();

      // 1C. Angular faceted mirror-plate pauldrons on shoulderL / shoulderR
      for (const [pt, side] of [
        [shL, -1 as const],
        [shR, 1 as const],
      ] as const) {
        ctx.save();
        try {
          ctx.translate(pt.x, pt.y);
          ctx.scale(side, 1);
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = spec.outline;
          ctx.lineWidth = 2.1;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-4, -2);
          ctx.lineTo(5, -13);
          ctx.lineTo(15, -7);
          ctx.lineTo(12, 3);
          ctx.lineTo(2, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Crimson inner prism facet
          ctx.fillStyle = '#9f1239';
          ctx.beginPath();
          ctx.moveTo(0, -1);
          ctx.lineTo(6, -11);
          ctx.lineTo(13, -6);
          ctx.lineTo(6, 1);
          ctx.closePath();
          ctx.fill();

          // Cyan razor crystal edge
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-2, -2);
          ctx.lineTo(5, -12);
          ctx.lineTo(14, -6.5);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (spec.style === 'sovereign_clockplate') {
      // Thần Thời Gian (chrono_sovereign): Sovereign clocktower mantle coat-tails + high astrolabe collar + cogwheel pauldrons
      const sway = Math.sin(t * 7.2) * 6.0;

      // 1A. Sovereign clocktower mantle coat-tails billowing from hip
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x - 5, hip.y - 2);
      ctx.quadraticCurveTo(hip.x - 24, hip.y + 8 + sway * 0.4, hip.x - 44, hip.y + 25 + sway);
      ctx.lineTo(hip.x - 22, hip.y + 18 + sway * 0.65);
      ctx.lineTo(hip.x - 26, hip.y + 30 + sway * 0.8);
      ctx.lineTo(hip.x - 8, hip.y + 17 + sway * 0.4);
      ctx.lineTo(hip.x + 4, hip.y + 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(hip.x - 3, hip.y);
      ctx.quadraticCurveTo(hip.x - 18, hip.y + 7 + sway * 0.35, hip.x - 36, hip.y + 22 + sway * 0.9);
      ctx.lineTo(hip.x - 14, hip.y + 14 + sway * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hip.x - 4, hip.y - 1);
      ctx.quadraticCurveTo(hip.x - 22, hip.y + 7 + sway * 0.4, hip.x - 41, hip.y + 24 + sway);
      ctx.stroke();

      // 1B. Imperial clocktower high collar
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(neck.x - 9, neck.y + 4);
      ctx.lineTo(neck.x - 13, neck.y - 9);
      ctx.lineTo(neck.x - 3, neck.y - 4);
      ctx.lineTo(neck.x + 3, neck.y - 4);
      ctx.lineTo(neck.x + 11, neck.y - 9);
      ctx.lineTo(neck.x + 8, neck.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(neck.x - 11, neck.y - 7.5);
      ctx.lineTo(neck.x - 3, neck.y - 3);
      ctx.moveTo(neck.x + 9, neck.y - 7.5);
      ctx.lineTo(neck.x + 3, neck.y - 3);
      ctx.stroke();

      // 1C. Cogwheel pauldrons on shoulderL / shoulderR
      for (const [pt, side] of [
        [shL, -1 as const],
        [shR, 1 as const],
      ] as const) {
        ctx.save();
        try {
          ctx.translate(pt.x, pt.y);
          ctx.scale(side, 1);
          // Cogwheel notched rim
          ctx.fillStyle = '#92400e';
          ctx.strokeStyle = spec.outline;
          ctx.lineWidth = 2.1;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-4, -2);
          ctx.lineTo(1, -11);
          ctx.lineTo(5, -9);
          ctx.lineTo(9, -12);
          ctx.lineTo(14, -6);
          ctx.lineTo(12, 3);
          ctx.lineTo(2, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(9, -11);
          ctx.lineTo(13, -5.5);
          ctx.stroke();

          // Azure pivot jewel
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(5, -3, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } finally {
          ctx.restore();
        }
      }
    } else if (spec.style === 'chrono_coat') {
      // Chrono Default: Ink-wash clockmaker trench/haori coat-tails + compact brass pauldrons
      const sway = Math.sin(t * 6.5) * 5.0;
      ctx.fillStyle = '#042f2e';
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 2.1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x - 4, hip.y);
      ctx.quadraticCurveTo(hip.x - 18, hip.y + 8 + sway * 0.4, hip.x - 32, hip.y + 20 + sway);
      ctx.lineTo(hip.x - 12, hip.y + 15 + sway * 0.5);
      ctx.lineTo(hip.x + 4, hip.y + 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(hip.x - 4, hip.y + 1);
      ctx.quadraticCurveTo(hip.x - 16, hip.y + 8 + sway * 0.4, hip.x - 30, hip.y + 19 + sway);
      ctx.stroke();

      drawInkPauldron(
        ctx,
        shL.x,
        shL.y,
        -1,
        spec.pauldron,
        spec.shadow,
        spec.outline,
        spec.trim,
        false
      );
      drawInkPauldron(
        ctx,
        shR.x,
        shR.y,
        1,
        spec.pauldron,
        spec.shadow,
        spec.outline,
        spec.trim,
        false
      );
    } else if (spec.style === 'scholar_robe') {
      // Mặc Tiên: Tà trường sam thư sinh bay mềm theo vận tốc (vx, vy)
      const speedTrail = Math.min(26, Math.abs(vx) * 0.042);
      const liftTrail = Math.max(-10, Math.min(12, -vy * 0.018));
      const sway = Math.sin(t * 5.8) * (4.8 + speedTrail * 0.14);
      const tailLen = 28 + speedTrail;

      // Outer Xuan-paper / ink flowing robe hem
      ctx.fillStyle = spec.plate;
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 2.1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x - 5, hip.y);
      ctx.quadraticCurveTo(
        hip.x - 16 - speedTrail * 0.45,
        hip.y + 11 + liftTrail * 0.5 + sway * 0.4,
        hip.x - tailLen,
        hip.y + 24 + liftTrail + sway
      );
      ctx.lineTo(hip.x - tailLen * 0.42, hip.y + 26 + liftTrail * 0.6 + sway * 0.55);
      ctx.lineTo(hip.x + 7, hip.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White Xuan-paper / Golden trim ribbon along the flowing robe hem
      ctx.strokeStyle = spec.trim;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hip.x - 5, hip.y + 1.5);
      ctx.quadraticCurveTo(
        hip.x - 15 - speedTrail * 0.42,
        hip.y + 11 + liftTrail * 0.5 + sway * 0.4,
        hip.x - tailLen + 2,
        hip.y + 23 + liftTrail + sway
      );
      ctx.stroke();

      // Secondary jade/gold ink-wash accent stripe
      ctx.strokeStyle = spec.core;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hip.x - 2, hip.y + 4);
      ctx.quadraticCurveTo(
        hip.x - 11 - speedTrail * 0.3,
        hip.y + 13 + liftTrail * 0.4 + sway * 0.35,
        hip.x - tailLen * 0.68,
        hip.y + 22 + liftTrail * 0.7 + sway * 0.65
      );
      ctx.stroke();
    } else if (spec.style === 'xuan_feng_robe') {
      // Xuân Phong Văn Thánh: Tà áo sau & tà trước tách biệt bay theo gió/vận tốc, cổ áo thư sinh cao, tay áo rộng Quảng Tụ
      const speedTrail = Math.min(28, Math.abs(vx) * 0.044);
      const liftTrail = Math.max(-10, Math.min(13, -vy * 0.018));
      const windBackA = Math.sin(t * 4.1) * (4.4 + speedTrail * 0.14);
      const windBackB = Math.cos(t * 3.3 + 0.8) * (3.6 + speedTrail * 0.11);
      const windFront = Math.sin(t * 4.8 + 1.4) * (2.6 + speedTrail * 0.08);
      const tailLen = 34 + speedTrail;

      const elL = safePt(joints.elbowL, shL.x - 10, shL.y + 12);
      const hdL = safePt(joints.handL, elL.x - 6, elL.y + 10);
      const elR = safePt(joints.elbowR, shR.x + 10, shR.y + 12);
      const hdR = safePt(joints.handR, elR.x + 8, elR.y + 10);
      const kL = safePt(joints.kneeL, hip.x - 6, hip.y + 18);
      const kR = safePt(joints.kneeR, hip.x + 6, hip.y + 18);

      const drawScholarSleeve = (
        sh: { x: number; y: number },
        el: { x: number; y: number },
        hd: { x: number; y: number },
        isBackArm: boolean
      ) => {
        const armDx = hd.x - sh.x;
        const armDy = hd.y - sh.y;
        const cuffX = el.x + (hd.x - el.x) * 0.85;
        const cuffY = el.y + (hd.y - el.y) * 0.85;
        const fx = cuffX - el.x;
        const fy = cuffY - el.y;
        const fLen = Math.hypot(fx, fy) || 1;
        const rawNx = -fy / fLen;
        const rawNy = fx / fLen;
        const upSign = rawNy < 0 ? 1 : -1;
        const upX = rawNx * upSign;
        const upY = rawNy * upSign;

        const dirDrag = -Math.sign(armDx || 1) * 3.2 - Math.min(7, Math.abs(vx) * 0.012);
        const sleeveWave = Math.sin(t * 5.0 + (isBackArm ? 0 : 1.7)) * 2.1;
        const drapeY = 11.5 + sleeveWave - Math.max(-4, Math.min(5, vy * 0.008));

        const topShX = sh.x;
        const topShY = sh.y - 3.6;
        const topElX = el.x + upX * 3.8;
        const topElY = el.y + upY * 3.8;
        const cuffTopX = cuffX + upX * 4.0;
        const cuffTopY = cuffY + upY * 4.0;
        const cuffBotX = cuffX - upX * 10.5 + dirDrag * 0.45;
        const cuffBotY = cuffY - upY * 10.5 + Math.max(2.5, drapeY * 0.45);
        const elDrapeX = el.x + dirDrag * 0.6;
        const elDrapeY = el.y + Math.max(7.5, drapeY);
        const botShX = sh.x - 1.0;
        const botShY = sh.y + 5.2;

        ctx.save();
        try {
          ctx.globalAlpha = isBackArm ? 0.9 : 1.0;
          ctx.fillStyle = isBackArm ? (awakened ? '#ccfbf1' : '#e2e8f0') : spec.plate;
          ctx.strokeStyle = spec.outline;
          ctx.lineWidth = isBackArm ? 1.65 : 1.85;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(topShX, topShY);
          ctx.quadraticCurveTo(topElX, topElY, cuffTopX, cuffTopY);
          ctx.lineTo(cuffBotX, cuffBotY);
          ctx.quadraticCurveTo(elDrapeX, elDrapeY, botShX, botShY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Ink-wash inner sleeve fold shadow
          ctx.fillStyle = isBackArm ? colorWithAlpha('#94a3b8', 0.45) : spec.shadow;
          ctx.beginPath();
          ctx.moveTo(el.x, el.y + 1.5);
          ctx.lineTo(cuffX - upX * 3.5, cuffY - upY * 3.5);
          ctx.lineTo(cuffBotX, cuffBotY);
          ctx.quadraticCurveTo(elDrapeX, elDrapeY, botShX, botShY);
          ctx.closePath();
          ctx.fill();

          // Jade-teal & pale-gold flowing cuff trim
          ctx.strokeStyle = spec.trim;
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cuffTopX, cuffTopY);
          ctx.lineTo(cuffBotX, cuffBotY);
          ctx.stroke();

          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(cuffTopX - (fx / fLen) * 2.4, cuffTopY - (fy / fLen) * 2.4);
          ctx.lineTo(cuffBotX - (fx / fLen) * 2.4, cuffBotY - (fy / fLen) * 2.4);
          ctx.stroke();

          if (!isBackArm && Math.abs(armDx) > 4) {
            // Subtle wind-flutter filament on active swinging sleeve
            ctx.strokeStyle = colorWithAlpha('#5eead4', 0.65);
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(cuffBotX, cuffBotY);
            ctx.quadraticCurveTo(
              cuffBotX - Math.sign(armDx) * 6,
              cuffBotY + 3 + sleeveWave * 0.5,
              elDrapeX - Math.sign(armDx) * 3,
              elDrapeY + 2
            );
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      };

      // 1A. Back-arm flowing sleeve (drawn behind back coattail/torso)
      drawScholarSleeve(shL, elL, hdL, true);

      // 1B. Separate Back Coattails (2 layered independent back tails)
      // Under-layer shadow back coattail
      ctx.fillStyle = awakened ? '#ccfbf1' : spec.shadow;
      ctx.strokeStyle = colorWithAlpha(spec.outline, 0.82);
      ctx.lineWidth = 1.65;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x - 3, hip.y + 1);
      ctx.quadraticCurveTo(
        hip.x - 20 - speedTrail * 0.5,
        hip.y + 13 + liftTrail * 0.55 + windBackB * 0.45,
        hip.x - tailLen - 7,
        hip.y + 28 + liftTrail + windBackB
      );
      ctx.lineTo(hip.x - tailLen * 0.5, hip.y + 29 + liftTrail * 0.65 + windBackB * 0.6);
      ctx.lineTo(hip.x + 4, hip.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main white Xuan-silk back coattail with split swallowtail notch
      ctx.fillStyle = spec.plate;
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(hip.x - 5, hip.y - 1);
      ctx.quadraticCurveTo(
        hip.x - 18 - speedTrail * 0.44,
        hip.y + 10 + liftTrail * 0.45 + windBackA * 0.4,
        hip.x - tailLen + 1,
        hip.y + 23 + liftTrail + windBackA
      );
      ctx.lineTo(hip.x - tailLen * 0.62, hip.y + 21 + liftTrail * 0.5 + windBackA * 0.55);
      ctx.lineTo(hip.x - tailLen * 0.42, hip.y + 26 + liftTrail * 0.55 + windBackA * 0.5);
      ctx.lineTo(hip.x + 2, hip.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Jade-teal & pale-gold trim along back coattail
      ctx.strokeStyle = spec.trim;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hip.x - 5, hip.y + 1);
      ctx.quadraticCurveTo(
        hip.x - 17 - speedTrail * 0.42,
        hip.y + 10 + liftTrail * 0.45 + windBackA * 0.4,
        hip.x - tailLen + 2,
        hip.y + 22.5 + liftTrail + windBackA
      );
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha('#fde68a', 0.85);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(hip.x - 3, hip.y + 3.5);
      ctx.quadraticCurveTo(
        hip.x - 13 - speedTrail * 0.34,
        hip.y + 12 + liftTrail * 0.4 + windBackA * 0.35,
        hip.x - tailLen * 0.72,
        hip.y + 20.5 + liftTrail * 0.6 + windBackA * 0.65
      );
      ctx.stroke();

      // Trailing translucent jade silk sash ribbons
      ctx.strokeStyle = colorWithAlpha('#5eead4', awakened ? 0.92 : 0.76);
      ctx.lineWidth = awakened ? 2.2 : 1.7;
      ctx.beginPath();
      ctx.moveTo(hip.x - 4, hip.y + 2);
      ctx.quadraticCurveTo(
        hip.x - 19 - speedTrail * 0.45,
        hip.y + 6 + windBackB * 0.5,
        hip.x - tailLen - 8,
        hip.y + 14 + liftTrail * 0.8 + windBackB * 1.1
      );
      ctx.stroke();

      // 1C. Separate Front Coattails (left & right split front apron panels swaying with stride & wind)
      const strideBiasL = (kL.x - hip.x) * 0.35;
      const strideBiasR = (kR.x - hip.x) * 0.35;
      // Inner front flap
      ctx.fillStyle = awakened ? '#f0fdfa' : '#e2e8f0';
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.moveTo(hip.x - 4, hip.y + 3);
      ctx.quadraticCurveTo(
        hip.x - 8 + strideBiasL * 0.5 - speedTrail * 0.12,
        hip.y + 15 + liftTrail * 0.3,
        hip.x - 10 + strideBiasL + windFront - speedTrail * 0.2,
        hip.y + 26 + liftTrail * 0.4
      );
      ctx.lineTo(hip.x + 1 + strideBiasL * 0.4, hip.y + 24 + liftTrail * 0.35);
      ctx.lineTo(hip.x + 3, hip.y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Outer front flap with jade border, pale-gold corner stitch & peach blossom accent
      ctx.fillStyle = spec.plate;
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hip.x - 1, hip.y + 3);
      ctx.quadraticCurveTo(
        hip.x + 4 + strideBiasR * 0.45 - speedTrail * 0.08,
        hip.y + 15 + liftTrail * 0.3,
        hip.x + 3 + strideBiasR + windFront * 0.85 - speedTrail * 0.14,
        hip.y + 27 + liftTrail * 0.38
      );
      ctx.lineTo(hip.x + 11 + strideBiasR * 0.55 - speedTrail * 0.1, hip.y + 24 + liftTrail * 0.3);
      ctx.quadraticCurveTo(hip.x + 10, hip.y + 13, hip.x + 7, hip.y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = spec.trim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hip.x + 1, hip.y + 5);
      ctx.lineTo(
        hip.x + 4 + strideBiasR + windFront * 0.85 - speedTrail * 0.14,
        hip.y + 26 + liftTrail * 0.38
      );
      ctx.stroke();

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(
        hip.x + 4 + strideBiasR + windFront * 0.85 - speedTrail * 0.14,
        hip.y + 25.5 + liftTrail * 0.38
      );
      ctx.lineTo(hip.x + 10 + strideBiasR * 0.55 - speedTrail * 0.1, hip.y + 23.2 + liftTrail * 0.3);
      ctx.stroke();

      // 1D. High Scholar Collar around neck
      ctx.fillStyle = spec.plate;
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = 1.85;
      ctx.beginPath();
      ctx.moveTo(neck.x - 8.5, neck.y + 4);
      ctx.lineTo(neck.x - 10.5, neck.y - 6.5);
      ctx.lineTo(neck.x - 3.5, neck.y - 3.5);
      ctx.lineTo(neck.x + 3.5, neck.y - 3.5);
      ctx.lineTo(neck.x + 9.5, neck.y - 6.5);
      ctx.lineTo(neck.x + 8.0, neck.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = spec.trim;
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.moveTo(neck.x - 9.5, neck.y - 5.2);
      ctx.lineTo(neck.x - 3.0, neck.y - 2.6);
      ctx.moveTo(neck.x + 8.5, neck.y - 5.2);
      ctx.lineTo(neck.x + 3.0, neck.y - 2.6);
      ctx.stroke();

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(neck.x - 3.0, neck.y - 2.6);
      ctx.lineTo(neck.x + 3.0, neck.y - 2.6);
      ctx.stroke();

      // 1E. Front-arm wide flowing scholar sleeve (reactive to attack direction)
      drawScholarSleeve(shR, elR, hdR, false);

      if (awakened) {
        // Moonlight White - Jade Teal - Pale Gold luminous hem shimmer
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.85);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hip.x - 6, hip.y + 0.5);
        ctx.quadraticCurveTo(
          hip.x - 17 - speedTrail * 0.42,
          hip.y + 9.5 + liftTrail * 0.45 + windBackA * 0.4,
          hip.x - tailLen + 1,
          hip.y + 22 + liftTrail + windBackA
        );
        ctx.stroke();
      }
    } else {
      // 1. Anchored shoulder pauldrons directly on joints.shoulderL / joints.shoulderR
      drawInkPauldron(
        ctx,
        shL.x,
        shL.y,
        -1,
        spec.pauldron,
        spec.shadow,
        spec.outline,
        spec.trim,
        spec.spiked
      );
      drawInkPauldron(
        ctx,
        shR.x,
        shR.y,
        1,
        spec.pauldron,
        spec.shadow,
        spec.outline,
        spec.trim,
        spec.spiked
      );
    }

    // 2. Torso garment anchored along hip -> spineMid -> neck
    const midX = (neck.x + hip.x) * 0.5;
    const midY = (neck.y + hip.y) * 0.5;
    const torsoAng = Math.atan2(hip.y - neck.y, hip.x - neck.x) - Math.PI * 0.5;

    ctx.save();
    try {
      ctx.translate(midX, midY);
      ctx.rotate(torsoAng);

      if (spec.style === 'void_cloak') {
        // Ma Kính angular armored mirror-cloak chestplate with shattered rift core
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, -13);
        ctx.lineTo(10, -13);
        ctx.lineTo(8.5, 11);
        ctx.lineTo(0, 17);
        ctx.lineTo(-8.5, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-9, -12);
        ctx.lineTo(0, -12);
        ctx.lineTo(-1, 15);
        ctx.lineTo(-7.5, 10);
        ctx.closePath();
        ctx.fill();

        // Asymmetric crimson & cyan shattered mirror seam lines
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-8, -11);
        ctx.lineTo(0, -1);
        ctx.lineTo(8, -10);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, 3);
        ctx.lineTo(0, -1);
        ctx.lineTo(6, 5);
        ctx.stroke();
      } else if (spec.style === 'mirror_haori') {
        // Mirage Default: Sleek astral-mirror vest/haori with faceted silver-violet crystal trim
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-9, -13);
        ctx.lineTo(9, -13);
        ctx.lineTo(7.5, 13);
        ctx.lineTo(1, 16);
        ctx.lineTo(-7.5, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(0, -12);
        ctx.lineTo(-0.5, 14.5);
        ctx.lineTo(-6.8, 10.5);
        ctx.closePath();
        ctx.fill();

        // Faceted silver-violet prism trim lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-7, -11);
        ctx.lineTo(0, 3);
        ctx.lineTo(7, -11);
        ctx.stroke();

        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(6, -3);
        ctx.stroke();
      } else if (spec.style === 'haori') {
        // Ink-wash crossed kimono / haori lapels + cel shadow + obi sash
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-9, -13);
        ctx.lineTo(9, -13);
        ctx.lineTo(8, 13);
        ctx.lineTo(-8, 13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(0, -12);
        ctx.lineTo(-1, 12);
        ctx.lineTo(-7.5, 12);
        ctx.closePath();
        ctx.fill();

        // Crossed haori lapel trim
        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-7, -12);
        ctx.lineTo(3, 5);
        ctx.moveTo(7, -12);
        ctx.lineTo(-2, 4);
        ctx.stroke();
      } else if (spec.style === 'tabard') {
        // Archmage tabard with arcane diamond rune & hanging lower stole
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-8.5, -12);
        ctx.lineTo(8.5, -12);
        ctx.lineTo(6.5, 16);
        ctx.lineTo(0, 21);
        ctx.lineTo(-6.5, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-7.5, -11);
        ctx.lineTo(-0.5, -11);
        ctx.lineTo(-0.5, 19);
        ctx.lineTo(-5.5, 15);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-4.5, -8, 9, 9);
      } else if (spec.style === 'vest') {
        // Sleek shinobi / storm brigandine with diagonal bandolier
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(-8.5, -12);
        ctx.lineTo(8.5, -12);
        ctx.lineTo(6, 11);
        ctx.lineTo(-6, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-7, -10);
        ctx.lineTo(6.5, 8);
        ctx.stroke();
      } else if (spec.style === 'sovereign_clockplate') {
        // Thần Thời Gian: Sovereign clocktower armored breastplate with astrolabe filigree
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, -13);
        ctx.lineTo(10, -13);
        ctx.lineTo(8, 11);
        ctx.lineTo(0, 16.5);
        ctx.lineTo(-8, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-9, -12);
        ctx.lineTo(0, -12);
        ctx.lineTo(0, 15);
        ctx.lineTo(-7, 10);
        ctx.closePath();
        ctx.fill();

        // Crossed gold astrolabe filigree ribs
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(-8, -11);
        ctx.lineTo(0, -1);
        ctx.lineTo(8, -11);
        ctx.moveTo(-7, 5);
        ctx.lineTo(7, 5);
        ctx.stroke();
      } else if (spec.style === 'chrono_coat') {
        // Chrono Default: Ink-wash clockmaker haori/trench with brass pocket-watch chain
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-9, -13);
        ctx.lineTo(9, -13);
        ctx.lineTo(7.5, 13);
        ctx.lineTo(-7.5, 13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(0, -12);
        ctx.lineTo(-1, 12);
        ctx.lineTo(-6.8, 12);
        ctx.closePath();
        ctx.fill();

        // Crossed teal-brass lapels & pocket-watch chain
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-7, -12);
        ctx.lineTo(2, 4);
        ctx.moveTo(7, -12);
        ctx.lineTo(-2, 4);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-5, 3);
        ctx.quadraticCurveTo(0, 8, 5.5, 4);
        ctx.stroke();
      } else if (spec.style === 'scholar_robe') {
        // Mặc Tiên: Trường sam thư sinh vạt chéo trắng giấy tuyên + đai ngọc bích & ấn triện chu sa
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.1;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-9, -13);
        ctx.lineTo(9, -13);
        ctx.lineTo(8, 13.5);
        ctx.lineTo(-8, 13.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Xuan-paper white inner robe V-collar
        ctx.fillStyle = spec.trim;
        ctx.beginPath();
        ctx.moveTo(-5.5, -12.5);
        ctx.lineTo(5.5, -12.5);
        ctx.lineTo(0, -2.5);
        ctx.closePath();
        ctx.fill();

        // Crossed scholar lapels (right-over-left)
        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(-7, -12);
        ctx.lineTo(4.5, 4);
        ctx.moveTo(7, -12);
        ctx.lineTo(-2.5, 2);
        ctx.stroke();

        // Jade / Golden waist sash + miniature red vermilion seal stamp
        ctx.fillStyle = spec.core;
        ctx.fillRect(-7.5, 4.5, 15, 3.2);
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.2;
        ctx.fillRect(2.5, 5.5, 4.5, 4.5);
        ctx.strokeRect(2.5, 5.5, 4.5, 4.5);
      } else if (spec.style === 'xuan_feng_robe') {
        // Xuân Phong Văn Thánh: Trường sam bạch ngọc tạo khối đa tầng (không hình thang phẳng), đai ngọc bích & Ngọc Bội lủng lẳng
        const pendSwing = Math.sin(t * 5.2) * 2.4 - Math.max(-5, Math.min(5, vx * 0.012));

        // 2A. Contoured sculpted scholar robe silhouette (broad sloped shoulders -> tapered waist -> hip flare)
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.9;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-10.2, -13.2);
        ctx.quadraticCurveTo(0, -14.2, 10.2, -13.2);
        ctx.quadraticCurveTo(8.5, -2.0, 6.4, 6.2);
        ctx.quadraticCurveTo(8.0, 11.2, 8.8, 15.2);
        ctx.quadraticCurveTo(0, 16.8, -8.8, 15.2);
        ctx.quadraticCurveTo(-8.0, 11.2, -6.4, 6.2);
        ctx.quadraticCurveTo(-8.5, -2.0, -10.2, -13.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2B. Ink-wash cel-shading fold along left/back drape
        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-9.2, -12.4);
        ctx.lineTo(-1.5, -12.8);
        ctx.quadraticCurveTo(-2.8, -1.0, -3.2, 6.2);
        ctx.lineTo(-7.6, 14.2);
        ctx.quadraticCurveTo(-7.2, 10.0, -5.8, 6.0);
        ctx.quadraticCurveTo(-7.8, -2.0, -9.2, -12.4);
        ctx.closePath();
        ctx.fill();

        // 2C. Inner Moonlight-White V-neck under-robe (Trung Y) with jade piping
        ctx.fillStyle = awakened ? '#ffffff' : '#f0fdfa';
        ctx.beginPath();
        ctx.moveTo(-5.0, -13.0);
        ctx.lineTo(5.0, -13.0);
        ctx.lineTo(0, -1.2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-4.6, -12.8);
        ctx.lineTo(0, -1.6);
        ctx.lineTo(4.6, -12.8);
        ctx.stroke();

        // 2D. Layered crossed scholar lapels (Giao Lĩnh: outer right-over-left drape)
        ctx.fillStyle = awakened ? '#f0fdfa' : '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-7.8, -12.6);
        ctx.lineTo(-4.5, -12.6);
        ctx.lineTo(5.6, 4.8);
        ctx.lineTo(-5.8, 4.8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(-7.6, -12.4);
        ctx.lineTo(5.2, 5.0);
        ctx.moveTo(7.4, -12.4);
        ctx.lineTo(-2.6, 2.2);
        ctx.stroke();

        // Pale-gold fine brocade piping & peach-blossom lapel embroidery
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.moveTo(-6.2, -12.2);
        ctx.lineTo(3.6, 4.4);
        ctx.stroke();

        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-4.8, -6.2);
        ctx.lineTo(-1.8, -2.2);
        ctx.stroke();
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.arc(-3.6, -4.6, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // 2E. Contoured single Jade-Teal Waist Sash (Ngọc Đái) with Pale-Gold buckle & Cinnabar seal tag
        ctx.fillStyle = spec.sash;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-7.0, 5.2);
        ctx.quadraticCurveTo(0, 6.4, 7.0, 5.2);
        ctx.lineTo(7.2, 9.4);
        ctx.quadraticCurveTo(0, 10.6, -7.2, 9.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pale-gold sash edge & center clasp
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-6.6, 5.8);
        ctx.quadraticCurveTo(0, 7.0, 6.6, 5.8);
        ctx.stroke();

        ctx.fillStyle = '#fde68a';
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(-0.4, 7.6, 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Small cinnabar seal tag tucked on sash
        ctx.fillStyle = '#e11d48';
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.0;
        ctx.fillRect(-5.6, 5.8, 3.0, 3.4);
        ctx.strokeRect(-5.6, 5.8, 3.0, 3.4);

        // 2F. Hanging Jade Pendant (Ngọc Bội) suspended from waist sash
        const pendX = 3.6;
        const pendY = 9.4;
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(pendX, pendY);
        ctx.lineTo(pendX + pendSwing * 0.35, pendY + 3.2);
        ctx.stroke();

        // Carved Jade Bi-disc pendant
        const discX = pendX + pendSwing * 0.45;
        const discY = pendY + 5.6;
        ctx.fillStyle = '#5eead4';
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(discX, discY, 2.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f0fdfa';
        ctx.beginPath();
        ctx.arc(discX, discY, 0.95, 0, Math.PI * 2);
        ctx.fill();

        // Swaying 2-strand jade & peach-blossom silk tassel below jade pendant
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(discX, discY + 2.5);
        ctx.quadraticCurveTo(discX + pendSwing * 0.65, discY + 6.5, discX + pendSwing, discY + 10.4);
        ctx.stroke();

        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(discX + 0.7, discY + 2.5);
        ctx.quadraticCurveTo(discX + 0.8 + pendSwing * 0.5, discY + 5.8, discX + 0.8 + pendSwing * 0.8, discY + 9.2);
        ctx.stroke();
      } else {
        // Sculpted cel-shaded breastplate
        ctx.fillStyle = spec.plate;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 2.3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-9.5, -12.5);
        ctx.lineTo(9.5, -12.5);
        ctx.lineTo(7, 11);
        ctx.lineTo(0, 15.5);
        ctx.lineTo(-7, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.shadow;
        ctx.beginPath();
        ctx.moveTo(-8.5, -11.5);
        ctx.lineTo(0, -11.5);
        ctx.lineTo(0, 14);
        ctx.lineTo(-6, 10.5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = spec.trim;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-7, -9);
        ctx.lineTo(0, 2.5);
        ctx.lineTo(7, -9);
        ctx.stroke();
      }

      // Obi waist sash at bottom of torso (skip for xuan_feng_robe which draws its own sculpted sash & pendant)
      if (spec.style !== 'xuan_feng_robe') {
        ctx.fillStyle = spec.sash;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.8;
        ctx.fillRect(-7.2, 8.5, 14.4, 4.2);
        ctx.strokeRect(-7.2, 8.5, 14.4, 4.2);
      }

      // Luminous chest core / void-rift diamond / sovereign clock-core emblem
      const pulse = 0.82 + 0.18 * Math.sin(t * 10);
      ctx.globalAlpha = pulse;
      if (spec.style === 'void_cloak') {
        ctx.fillStyle = '#f43f5e';
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -9.2);
        ctx.lineTo(5.2, -2.5);
        ctx.lineTo(0, 4.2);
        ctx.lineTo(-5.2, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(2.4, -2.5);
        ctx.lineTo(0, 1.5);
        ctx.lineTo(-2.4, -2.5);
        ctx.closePath();
        ctx.fill();
      } else if (spec.style === 'sovereign_clockplate' || spec.style === 'chrono_coat') {
        const isSov = spec.style === 'sovereign_clockplate';
        const dialR = isSov ? 5.2 : 4.0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = isSov ? '#0a0704' : '#042f2e';
        ctx.strokeStyle = isSov ? '#fef08a' : '#f59e0b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -3, dialR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Animated miniature chest clock hands
        const hAng = t * 2.8;
        ctx.strokeStyle = isSov ? '#38bdf8' : '#2dd4bf';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(Math.cos(hAng) * (dialR - 1), -3 + Math.sin(hAng) * (dialR - 1));
        ctx.moveTo(0, -3);
        ctx.lineTo(0, -3 - (dialR - 1.5));
        ctx.stroke();
      } else if (spec.style === 'xuan_feng_robe') {
        // Serene jade pearl clasp with subtle peach-blossom center glint
        ctx.fillStyle = spec.core;
        ctx.strokeStyle = spec.outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, -2.5, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.arc(0, -2.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = spec.core;
        ctx.beginPath();
        ctx.moveTo(0, -7.2);
        ctx.lineTo(3.6, -2.5);
        ctx.lineTo(0, 2.2);
        ctx.lineTo(-3.6, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -2.5, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } finally {
      ctx.restore();
    }

    // Subtle rim dot at spineMid
    ctx.fillStyle = pal.rimColor;
    ctx.beginPath();
    ctx.arc(spineMid.x + 2, spineMid.y - 4, 1.1, 0, Math.PI * 2);
    ctx.fill();
  } finally {
    ctx.restore();
  }
}

export function renderAwakenedBackForm(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  form: CharacterId,
  time: number,
  skinId?: SkinId
): void {
  const neck = safePt(joints.neck, 0, -80);
  const t = safeClock(time);
  const cx = neck.x - 6;
  const cy = neck.y + 6;

  ctx.save();
  try {
    if (form === 'kuro') {
      if (skinId === 'eclipse_ronin') {
        // Blood-Moon Eclipse Halo + Tattered Oni-Ronin Banner + 3 Eclipse Blades!
        drawInkRing(ctx, cx - 4, cy - 10, 40, 40, 0, '#09090b', '#dc2626', 4.5);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 10, 43, -Math.PI * 0.4, Math.PI * 0.65);
        ctx.stroke();

        // Tattered oni-ronin banner fluttering behind back
        const sway = Math.sin(t * 9) * 8;
        ctx.fillStyle = '#450a0a';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 14);
        ctx.quadraticCurveTo(cx - 32, cy - 6 + sway * 0.4, cx - 60, cy + 4 + sway);
        ctx.lineTo(cx - 42, cy + 16 + sway * 0.7);
        ctx.lineTo(cx - 52, cy + 28 + sway * 0.8);
        ctx.lineTo(cx - 6, cy + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 12);
        ctx.quadraticCurveTo(cx - 30, cy - 5 + sway * 0.4, cx - 56, cy + 4 + sway);
        ctx.stroke();
      }

      const glowCol =
        skinId === 'radiant_seraph'
          ? 'rgba(250, 204, 21, 0.55)'
          : skinId === 'void_walker'
            ? 'rgba(168, 85, 247, 0.55)'
            : skinId === 'eclipse_ronin'
              ? 'rgba(249, 115, 22, 0.52)'
              : 'rgba(239, 68, 68, 0.42)';
      const coreCol =
        skinId === 'radiant_seraph'
          ? '#fef9c3'
          : skinId === 'void_walker'
            ? '#1e1b4b'
            : '#09070c';
      const edgeCol =
        skinId === 'radiant_seraph'
          ? '#f59e0b'
          : skinId === 'void_walker'
            ? '#e879f9'
            : skinId === 'eclipse_ronin'
              ? '#fde047'
              : '#ef4444';

      const bladeConfigs = [
        { ox: -36, oy: -28, rot: -2.25, phase: 0 },
        { ox: -48, oy: -4, rot: -2.65, phase: 2.1 },
        { ox: -30, oy: 18, rot: -3.0, phase: 4.2 },
      ];
      for (const b of bladeConfigs) {
        const bob = Math.sin(t * 7 + b.phase) * 5;
        ctx.save();
        try {
          ctx.translate(cx + b.ox, cy + b.oy + bob);
          ctx.rotate(b.rot + Math.sin(t * 4 + b.phase) * 0.08);
          ctx.strokeStyle = glowCol;
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(-14, 0);
          ctx.lineTo(34, 0);
          ctx.stroke();

          ctx.fillStyle = coreCol;
          ctx.strokeStyle = edgeCol;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-12, -3.5);
          ctx.lineTo(24, -4.5);
          ctx.lineTo(38, 0);
          ctx.lineTo(24, 4.5);
          ctx.lineTo(-12, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    } else if (form === 'raijin') {
      const ringR = skinId === 'storm_shogun' ? 38 : 34;
      ctx.save();
      try {
        ctx.translate(cx - 8, cy - 6);
        if (skinId === 'cyber_valkyrie') {
          ctx.strokeStyle = 'rgba(232, 121, 249, 0.55)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([10, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 3.1;
            const dx = Math.cos(a) * ringR;
            const dy = Math.sin(a) * ringR;
            ctx.fillStyle = '#1e1b4b';
            ctx.strokeStyle = i % 2 === 0 ? '#e879f9' : '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dx, dy - 8);
            ctx.lineTo(dx + 7, dy);
            ctx.lineTo(dx, dy + 8);
            ctx.lineTo(dx - 7, dy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (skinId === 'storm_shogun') {
          ctx.strokeStyle = 'rgba(29, 78, 216, 0.58)';
          ctx.lineWidth = 7.5;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.6;
          ctx.stroke();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + t * 2.4;
            const dx = Math.cos(a) * ringR;
            const dy = Math.sin(a) * ringR;
            ctx.fillStyle = '#1d4ed8';
            ctx.strokeStyle = '#070b18';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(dx, dy, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.fillStyle = '#60a5fa';
            ctx.beginPath();
            ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.4;
          ctx.stroke();

          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + t * 2.6;
            const dx = Math.cos(a) * ringR;
            const dy = Math.sin(a) * ringR;
            ctx.fillStyle = '#0b0c10';
            ctx.beginPath();
            ctx.arc(dx, dy, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(dx, dy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(dx, dy, 2.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (form === 'kagura') {
      if (skinId === 'frost_empress') {
        const flap = Math.sin(t * 7) * 7;
        const drawCrystalWing = (dirX: number, scale: number) => {
          ctx.save();
          try {
            ctx.translate(cx - 4, cy + 2);
            ctx.fillStyle = 'rgba(2, 132, 199, 0.84)';
            ctx.strokeStyle = '#060c18';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dirX * 36 * scale, -44 * scale + flap);
            ctx.lineTo(dirX * 72 * scale, -26 * scale + flap * 1.15);
            ctx.lineTo(dirX * 52 * scale, -4 * scale + flap * 0.7);
            ctx.lineTo(dirX * 66 * scale, 10 * scale + flap * 0.8);
            ctx.lineTo(dirX * 38 * scale, 18 * scale + flap * 0.4);
            ctx.lineTo(0, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(dirX * 26 * scale, -24 * scale + flap * 0.7);
            ctx.lineTo(dirX * 48 * scale, -14 * scale + flap);
            ctx.lineTo(dirX * 28 * scale, 6 * scale + flap * 0.4);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(dirX * 56 * scale, -18 * scale + flap);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        };
        drawCrystalWing(-1, 1.0);
        drawCrystalWing(0.55, 0.72);
      } else if (skinId === 'solar_phoenix') {
        const flap = Math.sin(t * 8.5) * 10;
        drawInkRing(ctx, cx - 4, cy - 4, 36, 36, 0, '#120402', '#fef9c3', 2.8);

        const drawSolarWing = (dirX: number, scale: number) => {
          ctx.save();
          try {
            ctx.translate(cx - 4, cy + 2);
            ctx.fillStyle = 'rgba(220, 38, 38, 0.88)';
            ctx.strokeStyle = '#120402';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(dirX * 38 * scale, -48 * scale + flap, dirX * 76 * scale, -30 * scale + flap * 1.2);
            ctx.lineTo(dirX * 56 * scale, -8 * scale + flap * 0.8);
            ctx.lineTo(dirX * 70 * scale, 8 * scale + flap * 0.9);
            ctx.lineTo(dirX * 44 * scale, 14 * scale + flap * 0.5);
            ctx.lineTo(dirX * 50 * scale, 30 * scale + flap * 0.4);
            ctx.quadraticCurveTo(dirX * 18 * scale, 18 * scale, 0, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            ctx.fillStyle = '#fef9c3';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(dirX * 26 * scale, -26 * scale + flap * 0.7, dirX * 52 * scale, -18 * scale + flap);
            ctx.lineTo(dirX * 34 * scale, 4 * scale + flap * 0.5);
            ctx.quadraticCurveTo(dirX * 14 * scale, 10 * scale, 0, 5);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        };
        drawSolarWing(-1, 1.05);
        drawSolarWing(0.58, 0.75);
      } else {
        const flap = Math.sin(t * 8.5) * 10;
        const drawPhoenixWing = (dirX: number, scale: number) => {
          ctx.save();
          try {
            ctx.translate(cx - 4, cy + 2);
            ctx.fillStyle = 'rgba(234, 88, 12, 0.84)';
            ctx.strokeStyle = '#0b0c10';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(dirX * 36 * scale, -44 * scale + flap, dirX * 72 * scale, -28 * scale + flap * 1.2);
            ctx.lineTo(dirX * 54 * scale, -8 * scale + flap * 0.8);
            ctx.lineTo(dirX * 68 * scale, 6 * scale + flap * 0.9);
            ctx.lineTo(dirX * 42 * scale, 12 * scale + flap * 0.5);
            ctx.lineTo(dirX * 48 * scale, 28 * scale + flap * 0.4);
            ctx.quadraticCurveTo(dirX * 18 * scale, 18 * scale, 0, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(dirX * 26 * scale, -26 * scale + flap * 0.7, dirX * 50 * scale, -18 * scale + flap);
            ctx.lineTo(dirX * 34 * scale, 4 * scale + flap * 0.5);
            ctx.quadraticCurveTo(dirX * 14 * scale, 10 * scale, 0, 5);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        };
        drawPhoenixWing(-1, 1.0);
        drawPhoenixWing(0.55, 0.72);
      }
    } else if (form === 'zero') {
      const flutter = Math.sin(t * 10) * 8;
      const isBloodMoon = skinId === 'blood_moon';
      const isAstral = skinId === 'astral_phantom';
      ctx.save();
      try {
        ctx.translate(cx - 2, cy + 4);
        ctx.fillStyle = isBloodMoon
          ? 'rgba(76, 5, 25, 0.86)'
          : isAstral
            ? 'rgba(30, 27, 75, 0.86)'
            : 'rgba(6, 78, 59, 0.82)';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-56, -34 + flutter);
        ctx.lineTo(-38, -8 + flutter * 0.6);
        ctx.lineTo(-64, 4 + flutter * 0.9);
        ctx.lineTo(-34, 16 + flutter * 0.5);
        ctx.lineTo(-46, 36 + flutter * 0.4);
        ctx.lineTo(-8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = isBloodMoon ? '#f43f5e' : isAstral ? '#7dd3fc' : '#34d399';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + t * 4.5;
          const kx = Math.cos(a) * 34;
          const ky = Math.sin(a) * 20;
          ctx.save();
          try {
            ctx.translate(kx, ky);
            if (isAstral) {
              ctx.rotate(t * 2 + i);
              ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#38bdf8';
              ctx.strokeStyle = '#1e1b4b';
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(0, -10);
              ctx.lineTo(3, -3);
              ctx.lineTo(10, 0);
              ctx.lineTo(3, 3);
              ctx.lineTo(0, 10);
              ctx.lineTo(-3, 3);
              ctx.lineTo(-10, 0);
              ctx.lineTo(-3, -3);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.rotate(a + Math.PI * 0.5);
              ctx.fillStyle = isBloodMoon ? '#f43f5e' : '#34d399';
              ctx.strokeStyle = isBloodMoon ? '#fecdd3' : '#0b0c10';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.moveTo(11, 0);
              ctx.lineTo(-6, -3.5);
              ctx.lineTo(-3, 0);
              ctx.lineTo(-6, 3.5);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          } finally {
            ctx.restore();
          }
        }
      } finally {
        ctx.restore();
      }
    } else if (form === 'aether') {
      // Dedicated Awakened Aether Form: Cosmic Ink Mandala + Arcane/Prismatic Wings + 6 Orbiting Orbs
      const isPrism = skinId === 'prismatic_archon';
      const flap = Math.sin(t * 6.5) * 0.12;
      const ringR = isPrism ? 54 : 46;
      const outlineCol = isPrism ? '#08051a' : '#0a0518';
      const primaryCol = isPrism ? '#38bdf8' : '#e879f9';
      const secondaryCol = isPrism ? '#fde047' : '#38bdf8';

      // Ink-calligraphy outer & inner mandala rings
      drawInkRing(ctx, cx - 4, cy - 8, ringR, ringR, t * 0.8, outlineCol, primaryCol, 2.8);
      drawInkRing(ctx, cx - 4, cy - 8, ringR * 0.72, ringR * 0.72, -t * 1.1, outlineCol, secondaryCol, 2.0);

      // 6-pointed sacred-geometry cosmic mandala
      ctx.save();
      try {
        ctx.translate(cx - 4, cy - 8);
        ctx.rotate(t * 0.7);
        ctx.strokeStyle = colorWithAlpha(secondaryCol, 0.75);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const b = ((i + 2) * Math.PI) / 3;
          ctx.moveTo(Math.cos(a) * (ringR * 0.92), Math.sin(a) * (ringR * 0.92));
          ctx.lineTo(Math.cos(b) * (ringR * 0.92), Math.sin(b) * (ringR * 0.92));
        }
        ctx.stroke();
      } finally {
        ctx.restore();
      }

      // Cosmic ink wings on both sides
      const wingTiers = isPrism
        ? [
            { ang: -0.92 + flap, len: 74, w: 14, col: '#38bdf8', sh: '#1e3a8a', rim: '#fde047' },
            { ang: -0.38 + flap * 0.7, len: 62, w: 12, col: '#f43f5e', sh: '#4c0519', rim: '#fef08a' },
          ]
        : [
            { ang: -0.9 + flap, len: 66, w: 13, col: '#c026d3', sh: '#4c1d95', rim: '#f5d0fe' },
            { ang: -0.36 + flap * 0.7, len: 54, w: 11, col: '#7c3aed', sh: '#240b4d', rim: '#38bdf8' },
          ];
      for (const sideDir of [1, -1] as const) {
        ctx.save();
        try {
          ctx.globalAlpha = sideDir === 1 ? 0.68 : 0.96;
          ctx.translate(cx + sideDir * 3, cy);
          ctx.scale(sideDir, 1);
          for (const wt of wingTiers) {
            ctx.save();
            try {
              ctx.rotate(wt.ang);
              drawInkFeatheredWingTier(
                ctx,
                wt.len * (sideDir === 1 ? 0.78 : 1),
                wt.w * (sideDir === 1 ? 0.8 : 1),
                wt.col,
                wt.sh,
                outlineCol,
                wt.rim,
                colorWithAlpha(wt.col, 0.28)
              );
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }
      }

      // 6 Orbiting star-orbs
      const prismCols = ['#f43f5e', '#f59e0b', '#fde047', '#34d399', '#38bdf8', '#e879f9'];
      for (let i = 0; i < 6; i++) {
        const a = t * 2.5 + (i * Math.PI * 2) / 6;
        const ox = cx - 4 + Math.cos(a) * ringR;
        const oy = cy - 8 + Math.sin(a) * (ringR * 0.6);
        ctx.fillStyle = isPrism ? prismCols[i] : i % 2 === 0 ? '#e879f9' : '#38bdf8';
        ctx.strokeStyle = outlineCol;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(ox, oy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox, oy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (form === 'valkyrie') {
      // Dedicated Awakened Valkyrie Form: Multi-tiered Armored Seraphic/Celestial/Abyssal Wings + Spear-Halo
      const isCel = skinId === 'celestial_empress';
      const isAbyss = skinId === 'abyssal_valkyrie';
      const flap = Math.sin(t * 7.0);
      const outlineCol = isCel ? '#060a18' : isAbyss ? '#09040a' : '#0b0c10';
      const haloCol = isCel ? '#fde047' : isAbyss ? '#f43f5e' : '#facc15';
      const wingPrimary = isCel ? '#0284c7' : isAbyss ? '#9f1239' : '#fef9c3';
      const wingSecondary = isCel ? '#38bdf8' : isAbyss ? '#e11d48' : '#ffffff';
      const wingShadow = isCel ? '#1e3a8a' : isAbyss ? '#4c0519' : '#d97706';
      const spineRim = isCel ? '#fde047' : isAbyss ? '#e879f9' : '#f59e0b';

      // Spinning Armored Spear-Halo Ring behind wings
      drawInkRing(ctx, cx - 4, cy - 10, 48, 48, 0, outlineCol, haloCol, 3.2);
      for (let s = 0; s < 4; s++) {
        const a = t * 1.8 + (s * Math.PI) / 2;
        const sx2 = cx - 4 + Math.cos(a) * 48;
        const sy2 = cy - 10 + Math.sin(a) * 48;
        ctx.save();
        try {
          ctx.translate(sx2, sy2);
          ctx.rotate(a + Math.PI * 0.5);
          ctx.fillStyle = spineRim;
          ctx.strokeStyle = outlineCol;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -8);
          ctx.lineTo(3.5, 0);
          ctx.lineTo(0, 6);
          ctx.lineTo(-3.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }

      const drawValkAwakenedWings = (sideDir: -1 | 1, alphaMult: number, sizeMult: number) => {
        const tiers = [
          { ang: -0.98 + flap * 0.14, len: 82 * sizeMult, w: 15 * sizeMult, col: wingPrimary },
          { ang: -0.46 + flap * 0.1, len: 68 * sizeMult, w: 13 * sizeMult, col: wingSecondary },
          { ang: 0.06 + flap * 0.07, len: 54 * sizeMult, w: 11 * sizeMult, col: wingPrimary },
        ];
        ctx.save();
        try {
          ctx.globalAlpha = alphaMult;
          ctx.translate(cx + sideDir * 3, cy);
          ctx.scale(sideDir, 1);

          // Metallic armored wing-root guard
          ctx.fillStyle = wingShadow;
          ctx.strokeStyle = outlineCol;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-2, -10);
          ctx.lineTo(14, -14);
          ctx.lineTo(10, 6);
          ctx.lineTo(-2, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          for (const wt of tiers) {
            ctx.save();
            try {
              ctx.rotate(wt.ang);
              drawInkFeatheredWingTier(
                ctx,
                wt.len,
                wt.w,
                wt.col,
                wingShadow,
                outlineCol,
                spineRim,
                colorWithAlpha(haloCol, 0.34)
              );
            } finally {
              ctx.restore();
            }
          }
        } finally {
          ctx.restore();
        }
      };

      drawValkAwakenedWings(1, 0.72, 0.8);
      drawValkAwakenedWings(-1, 1.0, 1.0);
    } else if (form === 'mirage') {
      const isVoidShatterer = skinId === 'void_shatterer';
      if (isVoidShatterer) {
        // Ma Kính Awakened: Grand shattered mirror-wing array + monumental astral void halo + 6 jagged monolith shards
        const haloX = cx - 6;
        const haloY = cy - 10;
        const flap = Math.sin(t * 6.8) * 0.12;

        // Monumental double astral void halo
        drawInkRing(ctx, haloX, haloY, 54, 54, t * 0.65, '#07040a', '#f43f5e', 3.4);
        drawInkRing(ctx, haloX, haloY, 38, 38, -t * 1.1, '#07040a', '#38bdf8', 2.2);

        // Rotating 8-point shattered fracture mandala inside halo
        ctx.save();
        try {
          ctx.translate(haloX, haloY);
          ctx.rotate(t * 0.8);
          ctx.strokeStyle = colorWithAlpha('#e0f2fe', 0.65);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const b = ((i + 3) * Math.PI) / 4;
            ctx.moveTo(Math.cos(a) * 48, Math.sin(a) * 48);
            ctx.lineTo(Math.cos(b) * 48, Math.sin(b) * 48);
          }
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // Grand 3-tier shattered obsidian/crimson/cyan mirror-blade wings on both sides
        const wingTiers = [
          { ang: -1.04 + flap, len: 82, w: 13.5, body: '#18181b', bevel: '#f43f5e', rim: '#38bdf8' },
          { ang: -0.52 + flap * 0.75, len: 68, w: 11.5, body: '#09090b', bevel: '#9f1239', rim: '#e0f2fe' },
          { ang: 0.04 + flap * 0.5, len: 54, w: 9.5, body: '#18181b', bevel: '#f43f5e', rim: '#38bdf8' },
        ];
        for (const sideDir of [1, -1] as const) {
          ctx.save();
          try {
            ctx.globalAlpha = sideDir === 1 ? 0.68 : 0.98;
            ctx.translate(cx + sideDir * 3, cy);
            ctx.scale(sideDir, 1);
            const sizeMult = sideDir === 1 ? 0.82 : 1.0;
            for (const wt of wingTiers) {
              ctx.save();
              try {
                ctx.rotate(wt.ang);
                const len = wt.len * sizeMult;
                const w = wt.w * sizeMult;
                // Jagged crystal mirror wing polygon
                ctx.fillStyle = wt.body;
                ctx.strokeStyle = '#07040a';
                ctx.lineWidth = 2.2;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(len * 0.48, -w * 1.12);
                ctx.lineTo(len, -2);
                ctx.lineTo(len * 0.74, w * 0.42);
                ctx.lineTo(len * 0.84, w * 0.68);
                ctx.lineTo(len * 0.42, w * 0.52);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Crimson beveled facet
                ctx.fillStyle = wt.bevel;
                ctx.beginPath();
                ctx.moveTo(4, -0.5);
                ctx.lineTo(len * 0.48, -w * 0.96);
                ctx.lineTo(len * 0.94, -2);
                ctx.lineTo(len * 0.46, w * 0.08);
                ctx.closePath();
                ctx.fill();

                // Razor cyan-silver edge rim
                ctx.strokeStyle = wt.rim;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(4, -1);
                ctx.lineTo(len * 0.48, -w * 1.0);
                ctx.lineTo(len * 0.96, -2);
                ctx.stroke();
              } finally {
                ctx.restore();
              }
            }
          } finally {
            ctx.restore();
          }
        }

        // 6 orbiting void-mirror monolith shards around halo
        for (let i = 0; i < 6; i++) {
          const a = t * 2.4 + (i * Math.PI * 2) / 6;
          const sx = haloX + Math.cos(a) * 54;
          const sy = haloY + Math.sin(a) * 34;
          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.rotate(a + Math.PI * 0.5);
            ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#38bdf8';
            ctx.strokeStyle = '#07040a';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
      } else {
        // Mirage Default Awakened: Twin astral mirror halo + sweeping silver-violet prism wings + 6 orbiting shards
        const haloX = cx - 5;
        const haloY = cy - 9;
        const flap = Math.sin(t * 5.8) * 0.1;

        drawInkRing(ctx, haloX, haloY, 46, 46, t * 0.5, '#0b0c10', '#c084fc', 2.8);
        drawInkRing(ctx, haloX, haloY, 32, 32, -t * 0.85, '#0b0c10', '#f1f5f9', 1.9);

        const wingTiers = [
          { ang: -0.92 + flap, len: 64, w: 11, col: '#6366f1', sh: '#1e1b4b', rim: '#f1f5f9' },
          { ang: -0.38 + flap * 0.7, len: 52, w: 9.5, col: '#c084fc', sh: '#312e81', rim: '#ffffff' },
        ];
        for (const sideDir of [1, -1] as const) {
          ctx.save();
          try {
            ctx.globalAlpha = sideDir === 1 ? 0.65 : 0.95;
            ctx.translate(cx + sideDir * 3, cy);
            ctx.scale(sideDir, 1);
            const sizeMult = sideDir === 1 ? 0.78 : 1.0;
            for (const wt of wingTiers) {
              ctx.save();
              try {
                ctx.rotate(wt.ang);
                const len = wt.len * sizeMult;
                const w = wt.w * sizeMult;
                ctx.fillStyle = wt.sh;
                ctx.strokeStyle = '#0b0c10';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(len * 0.52, -w);
                ctx.lineTo(len, -1);
                ctx.lineTo(len * 0.55, w * 0.55);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = wt.col;
                ctx.beginPath();
                ctx.moveTo(3, -0.5);
                ctx.lineTo(len * 0.52, -w * 0.85);
                ctx.lineTo(len * 0.95, -1);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = wt.rim;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(4, -1);
                ctx.lineTo(len * 0.52, -w * 0.85);
                ctx.lineTo(len * 0.95, -1);
                ctx.stroke();
              } finally {
                ctx.restore();
              }
            }
          } finally {
            ctx.restore();
          }
        }

        for (let i = 0; i < 6; i++) {
          const a = t * 2.2 + (i * Math.PI * 2) / 6;
          const sx = haloX + Math.cos(a) * 46;
          const sy = haloY + Math.sin(a) * 28;
          ctx.fillStyle = i % 2 === 0 ? '#f1f5f9' : '#c084fc';
          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 6);
          ctx.lineTo(sx + 3.5, sy);
          ctx.lineTo(sx, sy + 6);
          ctx.lineTo(sx - 3.5, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (form === 'chrono') {
      const isSovereign = skinId === 'chrono_sovereign';
      const haloX = cx - 5;
      const haloY = cy - 10;
      const flap = Math.sin(t * (isSovereign ? 6.4 : 5.4)) * 0.12;

      if (isSovereign) {
        // Thần Thời Gian Awakened: Giant celestial clockwork mandala + twin pendulum wings + 6 orbiting time-key diamonds
        drawInkRing(ctx, haloX, haloY, 56, 56, t * 0.65, '#0a0704', '#f59e0b', 3.4);
        drawInkRing(ctx, haloX, haloY, 40, 40, -t * 1.1, '#0a0704', '#38bdf8', 2.4);

        // Rotating 12-tick Roman celestial gear spokes inside mandala
        ctx.save();
        try {
          ctx.translate(haloX, haloY);
          ctx.rotate(t * 0.75);
          ctx.strokeStyle = colorWithAlpha('#fef08a', 0.72);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI * 2) / 12;
            const rIn = i % 3 === 0 ? 22 : 42;
            ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
            ctx.lineTo(Math.cos(a) * 61, Math.sin(a) * 61);
          }
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // Twin pendulum mechanical wings (3 clock-hand feather vanes per side)
        const wingTiers = [
          { ang: -1.04 + flap, len: 84, w: 13.5, body: '#1c1917', bevel: '#f59e0b', rim: '#fef08a' },
          { ang: -0.52 + flap * 0.75, len: 70, w: 11.5, body: '#090705', bevel: '#b45309', rim: '#38bdf8' },
          { ang: 0.04 + flap * 0.5, len: 56, w: 9.5, body: '#1c1917', bevel: '#f59e0b', rim: '#fef08a' },
        ];
        for (const sideDir of [1, -1] as const) {
          ctx.save();
          try {
            ctx.globalAlpha = sideDir === 1 ? 0.68 : 0.98;
            ctx.translate(cx + sideDir * 3, cy);
            ctx.scale(sideDir, 1);
            const sizeMult = sideDir === 1 ? 0.82 : 1.0;
            for (const wt of wingTiers) {
              ctx.save();
              try {
                ctx.rotate(wt.ang);
                const len = wt.len * sizeMult;
                const w = wt.w * sizeMult;
                ctx.fillStyle = wt.body;
                ctx.strokeStyle = '#0a0704';
                ctx.lineWidth = 2.2;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(len * 0.45, -w);
                ctx.lineTo(len, 0);
                ctx.lineTo(len * 0.48, w * 0.65);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = wt.bevel;
                ctx.beginPath();
                ctx.moveTo(4, -0.5);
                ctx.lineTo(len * 0.45, -w * 0.85);
                ctx.lineTo(len * 0.94, 0);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = wt.rim;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(6, -1);
                ctx.lineTo(len * 0.45, -w * 0.88);
                ctx.lineTo(len * 0.96, 0);
                ctx.stroke();
              } finally {
                ctx.restore();
              }
            }
          } finally {
            ctx.restore();
          }
        }

        // 6 orbiting gold/azure time-key diamonds
        for (let i = 0; i < 6; i++) {
          const a = t * 2.3 + (i * Math.PI * 2) / 6;
          const sx = haloX + Math.cos(a) * 56;
          const sy = haloY + Math.sin(a) * 34;
          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.rotate(a + Math.PI * 0.5);
            ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#38bdf8';
            ctx.strokeStyle = '#0a0704';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
      } else {
        // Chrono Default Awakened: Twin teal-bronze clockwork mandala + sleek twin pendulum wing blades
        drawInkRing(ctx, haloX, haloY, 45, 45, t * 0.55, '#081214', '#2dd4bf', 2.8);
        drawInkRing(ctx, haloX, haloY, 31, 31, -t * 0.9, '#081214', '#f59e0b', 2.0);

        const wingTiers = [
          { ang: -0.92 + flap, len: 64, w: 10.5, col: '#2dd4bf', sh: '#042f2e', rim: '#99f6e4' },
          { ang: -0.38 + flap * 0.7, len: 52, w: 9.0, col: '#f59e0b', sh: '#78350f', rim: '#fef08a' },
        ];
        for (const sideDir of [1, -1] as const) {
          ctx.save();
          try {
            ctx.globalAlpha = sideDir === 1 ? 0.65 : 0.95;
            ctx.translate(cx + sideDir * 3, cy);
            ctx.scale(sideDir, 1);
            const sizeMult = sideDir === 1 ? 0.78 : 1.0;
            for (const wt of wingTiers) {
              ctx.save();
              try {
                ctx.rotate(wt.ang);
                const len = wt.len * sizeMult;
                const w = wt.w * sizeMult;
                ctx.fillStyle = wt.sh;
                ctx.strokeStyle = '#081214';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(len * 0.5, -w);
                ctx.lineTo(len, 0);
                ctx.lineTo(len * 0.52, w * 0.58);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = wt.col;
                ctx.beginPath();
                ctx.moveTo(3, -0.5);
                ctx.lineTo(len * 0.5, -w * 0.85);
                ctx.lineTo(len * 0.95, 0);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = wt.rim;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(4, -1);
                ctx.lineTo(len * 0.5, -w * 0.85);
                ctx.lineTo(len * 0.95, 0);
                ctx.stroke();
              } finally {
                ctx.restore();
              }
            }
          } finally {
            ctx.restore();
          }
        }

        for (let i = 0; i < 4; i++) {
          const a = t * 2.1 + (i * Math.PI * 2) / 4;
          const sx = haloX + Math.cos(a) * 45;
          const sy = haloY + Math.sin(a) * 27;
          ctx.fillStyle = i % 2 === 0 ? '#2dd4bf' : '#f59e0b';
          ctx.strokeStyle = '#081214';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 6);
          ctx.lineTo(sx + 3.5, sy);
          ctx.lineTo(sx, sy + 6);
          ctx.lineTo(sx - 3.5, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (form === 'mactien') {
      if (skinId === 'xuan_feng_sage') {
        // Xuân Phong Văn Thánh Awakened Back: Hào quang Nguyệt Bạch – Thanh Ngọc – Kim Nhạt (#fde68a), vầng Thiên Địa mở rộng, dải tiên lụa & mưa hoa đào
        const wheelX = cx - 2;
        const wheelY = cy - 8;
        const pulse = 0.82 + 0.18 * Math.sin(t * 2.8);

        // 1. Moonlight White – Jade Teal – Pale Gold layered soft aura (flat alpha, zero shadowBlur)
        ctx.fillStyle = colorWithAlpha('#5eead4', 0.12 * pulse);
        ctx.beginPath();
        ctx.arc(wheelX, wheelY, 58, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colorWithAlpha('#fde68a', 0.08 * pulse);
        ctx.beginPath();
        ctx.arc(wheelX, wheelY, 46, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colorWithAlpha('#f0fdfa', 0.14 * pulse);
        ctx.beginPath();
        ctx.arc(wheelX, wheelY, 34, 0, Math.PI * 2);
        ctx.fill();

        // 2. Outer Awakened Heaven-Earth Scripture Halo (12 radial pale-gold & jade rays + fine concentric rims)
        ctx.save();
        try {
          ctx.translate(wheelX, wheelY);
          ctx.rotate(t * 0.34);

          ctx.strokeStyle = colorWithAlpha('#fde68a', 0.58 * pulse);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 54, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.72 * pulse);
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, 50.5, 0.15, Math.PI * 1.85);
          ctx.stroke();

          // 12 radial Confucian rays & pale-gold star ticks
          for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI * 2) / 12;
            const isMajor = i % 3 === 0;
            const r0 = isMajor ? 45 : 49;
            const r1 = isMajor ? 62 : 57;
            ctx.strokeStyle = isMajor
              ? colorWithAlpha('#fde68a', 0.85 * pulse)
              : colorWithAlpha('#f0fdfa', 0.52 * pulse);
            ctx.lineWidth = isMajor ? 1.8 : 1.1;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
            ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }

        // 3. Twin billowing Moonlight-Jade & Pale-Gold Celestial Silk Streamers behind shoulders
        for (const sideDir of [-1, 1] as const) {
          const wave1 = Math.sin(t * 4.4 + sideDir * 0.9) * 7.5;
          const wave2 = Math.cos(t * 3.6 + sideDir * 1.3) * 5.0;
          const sx0 = cx + sideDir * 7;
          const sy0 = cy - 12;
          const tipX = cx + sideDir * 56 + wave2 * 0.5;
          const tipY = cy + 16 + wave1;

          ctx.save();
          try {
            ctx.globalAlpha = sideDir === 1 ? 0.62 : 0.88;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 5.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx0, sy0);
            ctx.bezierCurveTo(
              cx + sideDir * 24,
              cy - 28 + wave2,
              cx + sideDir * 44,
              cy - 4 - wave1 * 0.5,
              tipX,
              tipY
            );
            ctx.stroke();

            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 3.2;
            ctx.stroke();

            ctx.strokeStyle = '#5eead4';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = 0.95;
            ctx.beginPath();
            ctx.moveTo(sx0, sy0 - 1.5);
            ctx.bezierCurveTo(
              cx + sideDir * 24,
              cy - 30 + wave2,
              cx + sideDir * 44,
              cy - 6 - wave1 * 0.5,
              tipX,
              tipY - 1.5
            );
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // 4. 6 spring peach blossom petals falling gently around the character
        for (let i = 0; i < 6; i++) {
          const cycle = (t * 0.42 + i * 0.17) % 1;
          const px = cx - 36 + i * 14.5 + Math.sin(t * 1.9 + i * 1.6) * 10;
          const py = cy - 42 + cycle * 82;
          const fade = Math.sin(cycle * Math.PI);
          ctx.save();
          try {
            ctx.translate(px, py);
            ctx.rotate(t * 1.2 + i * 1.3);
            ctx.globalAlpha = 0.88 * fade;
            ctx.fillStyle = i % 2 === 0 ? '#fda4af' : '#fbcfe8';
            ctx.strokeStyle = colorWithAlpha('#1e293b', 0.58);
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(0, -4.3);
            ctx.quadraticCurveTo(4.3, -1.2, 2.2, 3.7);
            ctx.quadraticCurveTo(0, 4.5, -2.2, 3.7);
            ctx.quadraticCurveTo(-4.3, -1.2, 0, -4.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.arc(0, 0.2, 0.75, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
      }
    }
  } finally {
    ctx.restore();
  }
}

export function renderAwakenedHeadForm(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  form: CharacterId,
  time: number,
  skinId?: SkinId
): void {
  const head = safePt(joints.head, 0, -90);
  const neck = safePt(joints.neck, 0, -80);
  const spineMid = safePt(joints.spineMid, 0, -64);
  const hip = safePt(joints.hip, 0, -48);
  const r = safeHeadRadius(headR);
  const t = safeClock(time);
  const hx = head.x;
  const hy = head.y;

  ctx.save();
  try {
    if (form === 'kuro') {
      if (skinId === 'radiant_seraph') {
        const bob = Math.sin(t * 6) * 2;
        drawInkRing(ctx, hx - 1, hy - r - 11 + bob, 16, 4.5, -0.08, '#0b0c10', '#fef9c3', 2.6);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(hx + 4, hy - 1);
        ctx.quadraticCurveTo(hx - 12, hy - 5 + Math.sin(t * 16) * 3, hx - 26, hy - 9);
        ctx.stroke();
      } else if (skinId === 'void_walker') {
        const pulse = Math.sin(t * 18) * 2;
        ctx.fillStyle = '#581c87';
        ctx.strokeStyle = '#070410';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(hx - 11, hy - r + 2);
        ctx.lineTo(hx - 17, hy - r - 14 - pulse);
        ctx.lineTo(hx - 5, hy - r - 4);
        ctx.lineTo(hx, hy - r - 19 - pulse);
        ctx.lineTo(hx + 6, hy - r - 4);
        ctx.lineTo(hx + 14, hy - r - 13 - pulse);
        ctx.lineTo(hx + 10, hy - r + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(232, 121, 249, 0.9)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(hx + 3, hy - 1);
        ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(t * 18) * 3.5, hx - 30, hy - 10);
        ctx.stroke();
      } else if (skinId === 'eclipse_ronin') {
        // Blood-Moon Eclipse Crown Ring + Massive Crimson-Gold Oni Horns + Ember Eye Trail
        const bob = Math.sin(t * 6) * 1.5;
        drawInkRing(ctx, hx - 2, hy - r - 10 + bob, 15, 4.2, -0.1, '#09090b', '#dc2626', 2.8);
        drawInkHorn(
          ctx,
          hx - 4,
          hy - r + 2,
          hx - 15,
          hy - r - 16,
          hx - 24,
          hy - r - 18,
          3.4,
          '#991b1b',
          '#09090b',
          '#fde047',
          '#f97316'
        );
        drawInkHorn(
          ctx,
          hx + 4,
          hy - r + 2,
          hx + 13,
          hy - r - 14,
          hx + 20,
          hy - r - 15,
          3.1,
          '#dc2626',
          '#09090b',
          '#fde047',
          '#fb923c'
        );
        drawInkEyeSlit(ctx, hx, hy, '#f97316', '#fef08a', 1.05);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.88)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(hx + 2, hy - 1);
        ctx.quadraticCurveTo(hx - 14, hy - 4 + Math.sin(t * 17) * 3, hx - 30, hy - 9);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy - r + 2);
        ctx.quadraticCurveTo(hx - 14, hy - r - 14, hx - 22, hy - r - 16);
        ctx.moveTo(hx + 4, hy - r + 2);
        ctx.quadraticCurveTo(hx + 12, hy - r - 12, hx + 18, hy - r - 14);
        ctx.stroke();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.8;
        ctx.stroke();

        drawInkEyeSlit(ctx, hx, hy, '#ef4444', '#fecaca', 1.0);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hx + 2, hy - 1);
        ctx.quadraticCurveTo(hx - 14, hy - 4 + Math.sin(t * 16) * 3, hx - 28, hy - 8);
        ctx.stroke();
      }
    } else if (form === 'raijin') {
      const pulse = Math.sin(t * 20) * 2.5;
      if (skinId === 'cyber_valkyrie') {
        ctx.fillStyle = '#e879f9';
        ctx.strokeStyle = '#090418';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(hx - 8, hy - r + 2);
        ctx.lineTo(hx - 15, hy - r - 17 - pulse);
        ctx.lineTo(hx - 2, hy - r - 4);
        ctx.moveTo(hx + 4, hy - r - 4);
        ctx.lineTo(hx + 15, hy - r - 17 - pulse);
        ctx.lineTo(hx + 9, hy - r + 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hx + 4, hy - 1);
        ctx.lineTo(hx - 26, hy - 6 + Math.sin(t * 18) * 3);
        ctx.stroke();
      } else if (skinId === 'storm_shogun') {
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#070b18';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(hx - 11, hy - r + 3);
        ctx.lineTo(hx - 17, hy - r - 15 - pulse);
        ctx.lineTo(hx - 5, hy - r - 4);
        ctx.lineTo(hx + 1, hy - r - 22 - pulse);
        ctx.lineTo(hx + 7, hy - r - 5);
        ctx.lineTo(hx + 17, hy - r - 14 - pulse);
        ctx.lineTo(hx + 11, hy - r + 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hx + 4, hy - 1);
        ctx.lineTo(hx - 26, hy - 6 + Math.sin(t * 18) * 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(hx - 10, hy - r + 3);
        ctx.lineTo(hx - 16, hy - r - 14 - pulse);
        ctx.lineTo(hx - 4, hy - r - 4);
        ctx.lineTo(hx + 1, hy - r - 20 - pulse);
        ctx.lineTo(hx + 7, hy - r - 5);
        ctx.lineTo(hx + 16, hy - r - 12 - pulse);
        ctx.lineTo(hx + 10, hy - r + 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hx + 4, hy - 1);
        ctx.lineTo(hx - 24, hy - 6 + Math.sin(t * 18) * 3);
        ctx.stroke();
      }
    } else if (form === 'kagura') {
      const flicker = Math.sin(t * 15) * 3;
      if (skinId === 'frost_empress') {
        ctx.fillStyle = '#bae6fd';
        ctx.strokeStyle = '#060c18';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(hx - 12, hy - r - 1);
        ctx.lineTo(hx - 11, hy - r - 15 - flicker);
        ctx.lineTo(hx - 4, hy - r - 6);
        ctx.lineTo(hx, hy - r - 20 - flicker);
        ctx.lineTo(hx + 4, hy - r - 6);
        ctx.lineTo(hx + 11, hy - r - 15 - flicker);
        ctx.lineTo(hx + 12, hy - r - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(hx, hy - r - 8, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.quadraticCurveTo(spineMid.x, spineMid.y, neck.x, neck.y);
        ctx.stroke();
      } else if (skinId === 'solar_phoenix') {
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#120402';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(hx - 13, hy - r - 1);
        ctx.lineTo(hx - 14, hy - r - 15 - flicker);
        ctx.lineTo(hx - 6, hy - r - 6);
        ctx.lineTo(hx, hy - r - 22 - flicker);
        ctx.lineTo(hx + 6, hy - r - 6);
        ctx.lineTo(hx + 14, hy - r - 15 - flicker);
        ctx.lineTo(hx + 13, hy - r - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.88)';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.quadraticCurveTo(spineMid.x, spineMid.y, neck.x, neck.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(hx - 12, hy - r - 1);
        ctx.lineTo(hx - 10, hy - r - 14 - flicker);
        ctx.lineTo(hx - 3, hy - r - 6);
        ctx.lineTo(hx, hy - r - 19 - flicker);
        ctx.lineTo(hx + 3, hy - r - 6);
        ctx.lineTo(hx + 10, hy - r - 14 - flicker);
        ctx.lineTo(hx + 12, hy - r - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.quadraticCurveTo(spineMid.x, spineMid.y, neck.x, neck.y);
        ctx.stroke();
      }
    } else if (form === 'zero') {
      if (skinId === 'blood_moon') {
        ctx.strokeStyle = '#0b0508';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 3, hy - r + 1);
        ctx.quadraticCurveTo(hx - 12, hy - r - 12, hx - 18, hy - r - 14);
        ctx.moveTo(hx + 3, hy - r + 1);
        ctx.quadraticCurveTo(hx + 10, hy - r - 10, hx + 15, hy - r - 12);
        ctx.stroke();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(hx + 6, hy - 1);
        ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(t * 18) * 4, hx - 36, hy - 11);
        ctx.stroke();
        ctx.strokeStyle = '#ffe4e6';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (skinId === 'astral_phantom') {
        const bob = Math.sin(t * 6) * 2;
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#06041a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(hx, hy - r - 18 + bob);
        ctx.lineTo(hx + 3, hy - r - 11 + bob);
        ctx.lineTo(hx + 10, hy - r - 8 + bob);
        ctx.lineTo(hx + 3, hy - r - 5 + bob);
        ctx.lineTo(hx, hy - r + 2 + bob);
        ctx.lineTo(hx - 3, hy - r - 5 + bob);
        ctx.lineTo(hx - 10, hy - r - 8 + bob);
        ctx.lineTo(hx - 3, hy - r - 11 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + 6, hy - 1);
        ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(t * 18) * 4, hx - 36, hy - 11);
        ctx.stroke();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + 6, hy - 1);
        ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(t * 18) * 4, hx - 36, hy - 11);
        ctx.stroke();
        ctx.strokeStyle = '#ecfdf5';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else if (form === 'aether') {
      // Dedicated Awakened Aether Crown Sigil + Arcane Eye Stream
      const isPrism = skinId === 'prismatic_archon';
      const bob = Math.sin(t * 5.8) * 2;
      const outlineCol = isPrism ? '#08051a' : '#0a0518';
      const sigilCol = isPrism ? '#fde047' : '#e879f9';
      const accentCol = isPrism ? '#38bdf8' : '#38bdf8';

      // Floating diamond crown sigil above halo
      ctx.fillStyle = sigilCol;
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r - 24 + bob);
      ctx.lineTo(hx + 6, hy - r - 15 + bob);
      ctx.lineTo(hx, hy - r - 7 + bob);
      ctx.lineTo(hx - 6, hy - r - 15 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Flanking crescent calligraphy horns
      ctx.strokeStyle = accentCol;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx, hy - r - 13 + bob, 14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.strokeStyle = sigilCol;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy - 1.5);
      ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(t * 16) * 3, hx - 28, hy - 9);
      ctx.stroke();
    } else if (form === 'valkyrie') {
      // Dedicated Awakened Valkyrie Luminous War-Helm Halo + Swept Wing Crest
      const isCel = skinId === 'celestial_empress';
      const isAbyss = skinId === 'abyssal_valkyrie';
      const bob = Math.sin(t * 6) * 1.8;
      const outlineCol = isCel ? '#060a18' : isAbyss ? '#09040a' : '#0b0c10';
      const haloCol = isCel ? '#fde047' : isAbyss ? '#f43f5e' : '#fef08a';
      const crestCol = isCel ? '#38bdf8' : isAbyss ? '#e879f9' : '#facc15';

      drawInkRing(ctx, hx, hy - r - 10 + bob, 15, 4.2, -0.06, outlineCol, haloCol, 2.6);

      // Luminous war-helm crown spikes
      ctx.fillStyle = crestCol;
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy - r + 2);
      ctx.lineTo(hx - 20, hy - r - 14);
      ctx.lineTo(hx - 4, hy - r - 4);
      ctx.lineTo(hx + 2, hy - r - 17);
      ctx.lineTo(hx + 8, hy - r - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = haloCol;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy - 1);
      ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(t * 17) * 3, hx - 28, hy - 9);
      ctx.stroke();
    } else if (form === 'mirage') {
      const isVoidShatterer = skinId === 'void_shatterer';
      const bob = Math.sin(t * 6.2) * 1.8;
      if (isVoidShatterer) {
        // Ma Kính Awakened: Multi-pronged horned mirror crown + shattered crimson-cyan halo + intense split optic stream
        drawInkRing(ctx, hx - 1, hy - r - 12 + bob, 17, 4.6, -0.08, '#07040a', '#f43f5e', 2.8);

        // Towering asymmetrical obsidian-crimson crystal horns
        drawInkHorn(
          ctx,
          hx - 5,
          hy - r + 1,
          hx - 16,
          hy - r - 18,
          hx - 26,
          hy - r - 16,
          3.5,
          '#9f1239',
          '#07040a',
          '#e0f2fe',
          '#f43f5e'
        );
        drawInkHorn(
          ctx,
          hx + 5,
          hy - r + 1,
          hx + 15,
          hy - r - 20,
          hx + 23,
          hy - r - 14,
          3.2,
          '#18181b',
          '#07040a',
          '#38bdf8',
          '#f43f5e'
        );

        // 5-pronged jagged mirror crown spikes hovering above brow
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#07040a';
        ctx.lineWidth = 2.0;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 12, hy - r - 3 + bob);
        ctx.lineTo(hx - 14, hy - r - 17 + bob);
        ctx.lineTo(hx - 6, hy - r - 9 + bob);
        ctx.lineTo(hx, hy - r - 24 + bob);
        ctx.lineTo(hx + 6, hy - r - 9 + bob);
        ctx.lineTo(hx + 14, hy - r - 16 + bob);
        ctx.lineTo(hx + 11, hy - r - 3 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(hx - 13, hy - r - 15 + bob);
        ctx.lineTo(hx, hy - r - 23 + bob);
        ctx.lineTo(hx + 13, hy - r - 15 + bob);
        ctx.stroke();

        // Fierce split crimson-cyan optic trail
        drawInkEyeSlit(ctx, hx, hy, '#f43f5e', '#e0f2fe', 1.1);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + 3, hy - 1);
        ctx.lineTo(hx - 14, hy - 4 + Math.sin(t * 17) * 2.5);
        ctx.lineTo(hx - 30, hy - 9);
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      } else {
        // Mirage Default Awakened: Elevated astral prism halo + 3 tall crystal spires + violet-silver optic stream
        drawInkRing(ctx, hx, hy - r - 11 + bob, 14, 3.8, -0.05, '#0b0c10', '#c084fc', 2.4);

        ctx.fillStyle = '#f1f5f9';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 1.9;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 10, hy - r - 2 + bob);
        ctx.lineTo(hx - 9, hy - r - 15 + bob);
        ctx.lineTo(hx - 3, hy - r - 7 + bob);
        ctx.lineTo(hx, hy - r - 20 + bob);
        ctx.lineTo(hx + 3, hy - r - 7 + bob);
        ctx.lineTo(hx + 9, hy - r - 15 + bob);
        ctx.lineTo(hx + 10, hy - r - 2 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + 3, hy - 1);
        ctx.lineTo(hx - 13, hy - 4 + Math.sin(t * 16) * 2.5);
        ctx.lineTo(hx - 27, hy - 8);
        ctx.stroke();
      }
    } else if (form === 'chrono') {
      const isSovereign = skinId === 'chrono_sovereign';
      const bob = Math.sin(t * 5.8) * 1.8;
      if (isSovereign) {
        // Thần Thời Gian Awakened: Sovereign temporal crown, twin sundial horns, gilded astrolabe halo & gold-azure optic stream
        drawInkRing(ctx, hx - 1, hy - r - 13 + bob, 18, 4.8, -0.07, '#0a0704', '#f59e0b', 2.8);

        drawInkHorn(
          ctx,
          hx - 5,
          hy - r + 1,
          hx - 16,
          hy - r - 19,
          hx - 25,
          hy - r - 15,
          3.4,
          '#1c1917',
          '#0a0704',
          '#fef08a',
          '#f59e0b'
        );
        drawInkHorn(
          ctx,
          hx + 5,
          hy - r + 1,
          hx + 16,
          hy - r - 20,
          hx + 23,
          hy - r - 13,
          3.2,
          '#92400e',
          '#0a0704',
          '#38bdf8',
          '#fef08a'
        );

        // 5-pronged sovereign clocktower spire crown
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#0a0704';
        ctx.lineWidth = 2.0;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 12, hy - r - 3 + bob);
        ctx.lineTo(hx - 13, hy - r - 17 + bob);
        ctx.lineTo(hx - 6, hy - r - 9 + bob);
        ctx.lineTo(hx, hy - r - 24 + bob);
        ctx.lineTo(hx + 6, hy - r - 9 + bob);
        ctx.lineTo(hx + 13, hy - r - 17 + bob);
        ctx.lineTo(hx + 11, hy - r - 3 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(hx - 12, hy - r - 15 + bob);
        ctx.lineTo(hx, hy - r - 23 + bob);
        ctx.lineTo(hx + 12, hy - r - 15 + bob);
        ctx.stroke();

        // Split gold/azure temporal optic trail
        drawInkEyeSlit(ctx, hx, hy, '#f59e0b', '#38bdf8', 1.1);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + 3, hy - 1);
        ctx.lineTo(hx - 14, hy - 4 + Math.sin(t * 16) * 2.5);
        ctx.lineTo(hx - 30, hy - 9);
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      } else {
        // Chrono Default Awakened: Elevated teal-bronze clockwork halo + 3 dial-crest spires + aqua optic trail
        drawInkRing(ctx, hx, hy - r - 11 + bob, 14, 3.8, -0.05, '#081214', '#2dd4bf', 2.4);

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#081214';
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hx - 9, hy - r - 2 + bob);
        ctx.lineTo(hx - 8, hy - r - 14 + bob);
        ctx.lineTo(hx - 3, hy - r - 6 + bob);
        ctx.lineTo(hx, hy - r - 19 + bob);
        ctx.lineTo(hx + 3, hy - r - 6 + bob);
        ctx.lineTo(hx + 8, hy - r - 14 + bob);
        ctx.lineTo(hx + 9, hy - r - 2 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + 3, hy - 1);
        ctx.lineTo(hx - 13, hy - 4 + Math.sin(t * 15) * 2.4);
        ctx.lineTo(hx - 26, hy - 8);
        ctx.stroke();
      }
    } else if (form === 'mactien') {
      if (skinId === 'xuan_feng_sage') {
        // Xuân Phong Văn Thánh Awakened Head: Nguyệt Bạch – Thanh Ngọc – Kim Nhạt hoa quan & ánh mắt thanh ngọc sắc bén
        const bob = Math.sin(t * 3.4) * 1.6;
        const arcCx = hx - 1;
        const arcCy = hy - r - 11 + bob;

        // Open moonlight-jade-gold crescent halo above scholar hairpin (no harsh yellow)
        ctx.strokeStyle = colorWithAlpha('#5eead4', 0.44);
        ctx.lineWidth = 5.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(arcCx, arcCy, 15.0, -Math.PI * 0.88, -Math.PI * 0.14);
        ctx.stroke();

        ctx.strokeStyle = '#f0fdfa';
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.arc(arcCx, arcCy, 15.0, -Math.PI * 0.84, -Math.PI * 0.18);
        ctx.stroke();

        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(arcCx, arcCy, 17.2, -Math.PI * 0.72, -Math.PI * 0.28);
        ctx.stroke();

        // 3 floating jade / pale-gold scholar crown motes
        for (let m = -1; m <= 1; m++) {
          const mx = arcCx + m * 10.5;
          const my = arcCy - 14 + Math.abs(m) * 3.2 + Math.sin(t * 4.2 + m) * 1.4;
          ctx.fillStyle = m === 0 ? '#fde68a' : '#5eead4';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(mx, my - 3.6);
          ctx.lineTo(mx + 2.4, my);
          ctx.lineTo(mx, my + 3.6);
          ctx.lineTo(mx - 2.4, my);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Sharp awakened jade-teal eye glint + dual-layer moonlight-jade-gold optic wisp
        drawInkEyeSlit(ctx, hx, hy, '#5eead4', '#ffffff', 1.08);
        ctx.strokeStyle = colorWithAlpha('#5eead4', 0.88);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(hx + 4, hy - 1);
        ctx.quadraticCurveTo(hx - 11, hy - 4.0 + Math.sin(t * 10) * 2.0, hx - 26, hy - 7.5);
        ctx.stroke();

        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
}

function renderEliteOrnaments(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  t: number
): void {
  const head = safePt(joints.head, 0, -90);
  const neck = safePt(joints.neck, 0, -80);
  const hip = safePt(joints.hip, 0, -48);
  const shL = safePt(joints.shoulderL, -4, -78);
  const shR = safePt(joints.shoulderR, 4, -78);
  const r = safeHeadRadius(headR);

  // 1. Floating ink-calligraphy Elite halo sigil behind neck
  drawInkRing(
    ctx,
    neck.x - 4,
    neck.y - 6,
    18 + Math.sin(t * 5) * 1.5,
    18 + Math.sin(t * 5) * 1.5,
    0,
    '#0b0c10',
    '#facc15',
    2.2
  );

  // 2. Crimson-gold ink-flame horns rising from head
  drawInkHorn(
    ctx,
    head.x - 4,
    head.y - r + 2,
    head.x - 13,
    head.y - r - 11,
    head.x - 18,
    head.y - r - 16,
    2.7,
    '#dc2626',
    '#0b0c10',
    '#fde047',
    '#facc15'
  );
  drawInkHorn(
    ctx,
    head.x + 4,
    head.y - r + 2,
    head.x + 12,
    head.y - r - 11,
    head.x + 17,
    head.y - r - 15,
    2.7,
    '#dc2626',
    '#0b0c10',
    '#fde047',
    '#facc15'
  );

  // 3. Armored crimson-gold shoulder pauldrons
  drawInkPauldron(ctx, shL.x, shL.y, -1, '#dc2626', '#450a0a', '#0b0c10', '#fde047', true);
  drawInkPauldron(ctx, shR.x, shR.y, 1, '#dc2626', '#450a0a', '#0b0c10', '#fde047', true);

  // 4. Diagonal gold-vermilion rank sash across torso
  ctx.strokeStyle = '#0b0c10';
  ctx.lineWidth = 6.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neck.x + 5, neck.y + 2);
  ctx.lineTo(hip.x - 5, hip.y - 2);
  ctx.stroke();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3.0;
  ctx.stroke();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function renderPhase2EnrageEscalation(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  outfit: EnemyOutfitId,
  t: number
): void {
  const head = safePt(joints.head, 0, -90);
  const neck = safePt(joints.neck, 0, -80);
  const spineMid = safePt(joints.spineMid, 0, -64);
  const hip = safePt(joints.hip, 0, -48);
  const shL = safePt(joints.shoulderL, -4, -78);
  const shR = safePt(joints.shoulderR, 4, -78);
  const r = safeHeadRadius(headR);

  const enrageCol =
    outfit === 'glacius' || outfit === 'raiden'
      ? '#38bdf8'
      : outfit === 'nyx'
        ? '#c084fc'
        : outfit === 'kronos'
          ? '#fde047'
          : outfit === 'fable'
            ? '#84cc16'
            : '#f43f5e';
  const pulse = Math.sin(t * 14) * 2.2;

  // 1. Cracked glowing ink veins along torso
  ctx.strokeStyle = '#0b0c10';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hip.x - 2, hip.y - 4);
  ctx.lineTo(spineMid.x + 3, spineMid.y);
  ctx.lineTo(neck.x - 2, neck.y + 4);
  ctx.moveTo(spineMid.x - 4, spineMid.y - 4);
  ctx.lineTo(spineMid.x + 5, spineMid.y + 4);
  ctx.stroke();

  ctx.strokeStyle = enrageCol;
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // 2. Flared aura horns & streaming eye-flare trail
  drawInkHorn(
    ctx,
    head.x - 5,
    head.y - r + 1,
    head.x - 16,
    head.y - r - 14 - pulse,
    head.x - 24,
    head.y - r - 19 - pulse,
    2.8,
    enrageCol,
    '#0b0c10',
    '#ffffff'
  );
  drawInkHorn(
    ctx,
    head.x + 5,
    head.y - r + 1,
    head.x + 15,
    head.y - r - 14 - pulse,
    head.x + 22,
    head.y - r - 18 - pulse,
    2.8,
    enrageCol,
    '#0b0c10',
    '#ffffff'
  );

  ctx.strokeStyle = enrageCol;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(head.x + 4, head.y - 2);
  ctx.quadraticCurveTo(head.x - 14, head.y - 6 + Math.sin(t * 18) * 3, head.x - 32, head.y - 11);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Heightened shoulder energy spikes
  for (const [sx, sy, dir] of [
    [shL.x, shL.y, -1],
    [shR.x, shR.y, 1],
  ] as const) {
    ctx.fillStyle = colorWithAlpha(enrageCol, 0.72);
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 4);
    ctx.lineTo(sx + dir * 14, sy - 16 - pulse * 0.5);
    ctx.lineTo(sx + dir * 8, sy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function renderBossOutfitDetails(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  outfit: BossStyleOutfit,
  time = 0,
  entityTier?: StickmanRenderOptions['entityTier'],
  enragePhase?: 1 | 2
): void {
  const head = safePt(joints.head, 0, -90);
  const neck = safePt(joints.neck, 0, -80);
  const spineMid = safePt(joints.spineMid, 0, -64);
  const hip = safePt(joints.hip, 0, -48);
  const shL = safePt(joints.shoulderL, -4, -78);
  const shR = safePt(joints.shoulderR, 4, -78);
  const r = safeHeadRadius(headR);
  const t = safeClock(time);
  const hx = head.x;
  const hy = head.y;

  ctx.save();
  try {
    // ── 8 NORMAL MOB OUTFITS ───────────────────────────────────────────────
    if (outfit === 'meta_mob') {
      // Striker iron headband + angled chin guard + slate chest harness
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - r, hy - 5);
      ctx.lineTo(hx + r + 1, hy - 4);
      ctx.lineTo(hx + r, hy - 1);
      ctx.lineTo(hx - r, hy - 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#94a3b8', '#f8fafc', 0.85);
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(neck.x - 5, neck.y + 4);
      ctx.lineTo(hip.x + 5, hip.y - 4);
      ctx.stroke();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.1;
      ctx.stroke();
    } else if (outfit === 'gunner_mob') {
      // Tactical recon cowl + cyan targeting monocle + ammo bandolier
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2;
      ctx.fillRect(hx - 2, hy - 6, r + 3, 7);
      ctx.strokeRect(hx - 2, hy - 6, r + 3, 7);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(hx + 6, hy - 2.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + 6, hy - 2.5, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Recon antenna
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - 6);
      ctx.lineTo(hx - 9, hy - r - 9);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Diagonal ammo bandolier + right rangefinder pauldron
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.moveTo(neck.x + 6, neck.y + 3);
      ctx.lineTo(hip.x - 5, hip.y - 3);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#1e293b', '#0f172a', '#0b0c10', '#38bdf8', false);
    } else if (outfit === 'swarm_mob') {
      // Jagged violet mask + twin swept assassin ear-fins + tattered sash
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 6);
      ctx.lineTo(hx + r + 2, hy - 2);
      ctx.lineTo(hx + r - 2, hy + 5);
      ctx.lineTo(hx - 2, hy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkHorn(ctx, hx - 4, hy - 5, hx - 11, hy - 12, hx - 16, hy - 14, 2.2, '#a855f7', '#0b0c10', '#f5d0fe');
      drawInkEyeSlit(ctx, hx, hy, '#a855f7', '#ffffff', 0.9);

      ctx.fillStyle = '#3b0764';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.8;
      ctx.fillRect(hip.x - 6, hip.y - 6, 12, 4.5);
      ctx.strokeRect(hip.x - 6, hip.y - 6, 12, 4.5);
    } else if (outfit === 'aegis_mob') {
      // Heavy riot helm + cyan visor slit + steel breastplate & shield pauldrons
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.fillRect(hx - 2, hy - 5, r + 3, 7);
      ctx.strokeRect(hx - 2, hy - 5, r + 3, 7);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(hx + 2, hy - 3, 7.5, 3);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(hx + 4, hy - 2.3, 4, 1.3);

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#475569', '#1e293b', '#0b0c10', '#e0f2fe', false);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#475569', '#1e293b', '#0b0c10', '#e0f2fe', false);
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2;
      ctx.fillRect(spineMid.x - 6, spineMid.y - 9, 12, 16);
      ctx.strokeRect(spineMid.x - 6, spineMid.y - 9, 12, 16);
    } else if (outfit === 'ninja_mob') {
      // Crimson shinobi headband + tail + dark lower mask + crossed chest harness
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.8;
      ctx.fillRect(hx - r, hy - 5.5, r * 2, 4.5);
      ctx.strokeRect(hx - r, hy - 5.5, r * 2, 4.5);

      ctx.beginPath();
      ctx.moveTo(hx - r, hy - 3.5);
      ctx.lineTo(hx - r - 14, hy - 8);
      ctx.lineTo(hx - r - 10, hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#09090b';
      ctx.fillRect(hx - 1, hy + 0.5, r + 1, 5.5);
      drawInkEyeSlit(ctx, hx, hy, '#facc15', '#fef9c3', 0.85);

      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(neck.x - 5, neck.y + 3);
      ctx.lineTo(hip.x + 5, hip.y - 3);
      ctx.moveTo(neck.x + 5, neck.y + 3);
      ctx.lineTo(hip.x - 5, hip.y - 3);
      ctx.stroke();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (outfit === 'brute_mob') {
      // Heavy iron oni jawplate + glowing ember visor + spiked iron shoulder pauldrons
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.4;
      ctx.fillRect(hx - 3, hy - 2, r + 4, 8.5);
      ctx.strokeRect(hx - 3, hy - 2, r + 4, 8.5);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(hx + 2, hy - 5.5, 8, 3.2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(hx + 4, hy - 4.8, 4, 1.4);

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#292524', '#0c0a09', '#0b0c10', '#fb923c', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#292524', '#0c0a09', '#0b0c10', '#fb923c', true);
    } else if (outfit === 'arcanist_mob') {
      // Scholar-mage pointed hood/collar + frost-rune medallion + icy-violet eye
      ctx.fillStyle = '#0c4a6e';
      ctx.strokeStyle = '#060c18';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(hx - r - 4, hy - r - 2);
      ctx.lineTo(hx + r + 1, hy - r + 2);
      ctx.lineTo(hx + r - 3, hy + 4);
      ctx.lineTo(hx - r - 2, hy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawInkEyeSlit(ctx, hx, hy, '#22d3ee', '#e0f2fe', 0.9);

      // Frost-rune collar medallion & mage stole
      ctx.strokeStyle = '#060c18';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(neck.x, neck.y + 2);
      ctx.lineTo(hip.x, hip.y - 2);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(neck.x + 2, neck.y + 6, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (outfit === 'reaper_mob') {
      // Tattered crimson-ink executioner shroud + skeletal rib markings + fierce slit eye
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#09040a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hx - r - 5, hy - r - 1);
      ctx.lineTo(hx + r + 2, hy - r + 2);
      ctx.lineTo(hx + r - 2, hy + 6);
      ctx.lineTo(hx - r - 3, hy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      drawInkEyeSlit(ctx, hx, hy, '#f43f5e', '#fecdd3', 0.95);

      // Rib-guard ink markings on chest
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(spineMid.x - 5, spineMid.y + i * 5);
        ctx.lineTo(spineMid.x + 5, spineMid.y + i * 5);
        ctx.stroke();
      }
    }

    // ── 12 BOSS OUTFITS (PHASE 1 + PHASE 2 ENRAGE) ─────────────────────────
    else if (outfit === 'haiku') {
      // Boss 01: Vanguard Knight Helm + Cyan Visor + Plated Chestguard + Pauldrons
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(hx, hy - 1, r + 1.5, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(hx + r, hy + 5);
      ctx.lineTo(hx - 4, hy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hx - 2, hy - 4, r + 2, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(hx + 2, hy - 3, 8, 2.8);

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#475569', '#1e293b', '#0b0c10', '#38bdf8', false);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#475569', '#1e293b', '#0b0c10', '#38bdf8', false);
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.0;
      ctx.fillRect(spineMid.x - 6.5, spineMid.y - 9, 13, 17);
      ctx.strokeRect(spineMid.x - 6.5, spineMid.y - 9, 13, 17);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(spineMid.x + 1, spineMid.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (outfit === 'astra') {
      // Boss 02: Sandstorm Lancer turban/mask + gold brow pin + lancer tunic & sash
      ctx.fillStyle = '#f3e5ab';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(hx, hy - 2, r + 1.5, Math.PI * 1.0, Math.PI * 2.0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.fillRect(hx - r + 2, hy - 4, r * 2 - 2, 7.5);
      drawInkEyeSlit(ctx, hx, hy, '#fbbf24', '#fef08a', 0.9);

      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(hip.x, hip.y - 4);
      ctx.lineTo(neck.x, neck.y + 4);
      ctx.stroke();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 6.5;
      ctx.stroke();

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#ca8a04', '#78350f', '#0b0c10', '#fef08a', false);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#ca8a04', '#78350f', '#0b0c10', '#fef08a', false);
    } else if (outfit === 'glacius') {
      // Boss 03: Cryo Warden crystalline ice crown + frost chestplate + large glacial pauldron
      ctx.fillStyle = '#bae6fd';
      ctx.strokeStyle = '#060c18';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy - r + 2);
      ctx.lineTo(hx - 13, hy - r - 13);
      ctx.lineTo(hx - 2, hy - r - 4);
      ctx.lineTo(hx + 3, hy - r - 18);
      ctx.lineTo(hx + 8, hy - r - 3);
      ctx.lineTo(hx + 14, hy - r - 11);
      ctx.lineTo(hx + 9, hy - r + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#38bdf8', '#0c4a6e', '#060c18', '#e0f2fe', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#38bdf8', '#0c4a6e', '#060c18', '#e0f2fe', true);

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#060c18';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(neck.x - 7, neck.y + 4);
      ctx.lineTo(neck.x + 8, neck.y + 4);
      ctx.lineTo(hip.x + 5, hip.y - 2);
      ctx.lineTo(hip.x - 5, hip.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#22d3ee', '#ffffff', 0.95);
    } else if (outfit === 'opus') {
      // Boss 04: Crimson Blade Leader samurai half-mask + fierce yellow eye + dojo haori
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy + 1);
      ctx.lineTo(hx + r + 2, hy - 1);
      ctx.lineTo(hx + r - 2, hy + 7);
      ctx.lineTo(hx - 2, hy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#facc15', '#ffffff', 1.0);

      // Crimson-black dojo haori lapels
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(neck.x - 5, neck.y + 3);
      ctx.lineTo(hip.x + 4, hip.y - 3);
      ctx.stroke();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.8;
      ctx.stroke();
      drawInkPauldron(ctx, shL.x, shL.y, -1, '#334155', '#0f172a', '#0b0c10', '#ef4444', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#334155', '#0f172a', '#0b0c10', '#ef4444', true);
    } else if (outfit === 'vulcan') {
      // Boss 05: Forge Titan molten horned helm + furnace reactor core + forge pauldrons
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy - r + 2);
      ctx.lineTo(hx - 16, hy - r - 12);
      ctx.lineTo(hx + 2, hy - r - 3);
      ctx.lineTo(hx + 17, hy - r - 13);
      ctx.lineTo(hx + 9, hy - r + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.fillRect(hx, hy - 3, 10, 4);

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#292524', '#0c0a09', '#0b0c10', '#f97316', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#292524', '#0c0a09', '#0b0c10', '#f97316', true);

      ctx.fillStyle = '#0b0c10';
      ctx.beginPath();
      ctx.arc(spineMid.x + 2, spineMid.y - 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(spineMid.x + 2, spineMid.y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(spineMid.x + 2, spineMid.y - 2, 3.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (outfit === 'sol') {
      // Boss 06: Orbital Sniper visor helm + rangefinder ear fin + tactical collar
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.4;
      ctx.fillRect(hx - 3, hy - 5.5, r + 4, 8.5);
      ctx.strokeRect(hx - 3, hy - 5.5, r + 4, 8.5);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(hx + 1, hy - 3, 8.5, 3.8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx + 4, hy - 2.2, 4, 1.5);

      ctx.fillStyle = '#fb923c';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 5);
      ctx.lineTo(hx - 12, hy - r - 9);
      ctx.lineTo(hx - 2, hy - r + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#181a20', '#09090b', '#0b0c10', '#22d3ee', false);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#181a20', '#09090b', '#0b0c10', '#fb923c', false);
    } else if (outfit === 'nyx') {
      // Boss 07: Void Reaper tall pointed hood + spectral rib crest + crimson-violet eye
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#070410';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(hx - r - 7, hy - r - 7);
      ctx.lineTo(hx + r + 3, hy - r + 1);
      ctx.lineTo(hx + r - 1, hy + r * 0.72);
      ctx.lineTo(hx - r - 2, hy + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#f43f5e', '#fecdd3', 1.0);
      drawInkPauldron(ctx, shL.x, shL.y, -1, '#3b0764', '#1e1b4b', '#070410', '#a855f7', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#3b0764', '#1e1b4b', '#070410', '#a855f7', true);
    } else if (outfit === 'fable') {
      // Boss 08: Final Entity sovereign crest + glowing white alien eyes + geometric core
      drawInkHorn(ctx, hx - 5, hy - r + 2, hx - 12, hy - r - 11, hx - 14, hy - r - 17, 2.5, '#0b0c10', '#84cc16', '#ffffff');
      drawInkHorn(ctx, hx + 4, hy - r + 2, hx + 11, hy - r - 11, hx + 13, hy - r - 17, 2.5, '#0b0c10', '#84cc16', '#ffffff');

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(hx + 4, hy - 2, 3.8, 2.3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(hx + 2, hy - 7, 1.8, 0, Math.PI * 2);
      ctx.fill();

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#1e293b', '#0b0c10', '#0b0c10', '#84cc16', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#1e293b', '#0b0c10', '#0b0c10', '#84cc16', true);
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(spineMid.x + 1, spineMid.y - 7);
      ctx.lineTo(spineMid.x + 6, spineMid.y - 1);
      ctx.lineTo(spineMid.x + 1, spineMid.y + 5);
      ctx.lineTo(spineMid.x - 4, spineMid.y - 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (outfit === 'raiden') {
      // Boss 09: Mecha Shogun — robotic kabuto helm + twin cyan mecha horns + capacitor pauldrons
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(hx, hy - 2, r + 2, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mecha cyan crest horns
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - r);
      ctx.lineTo(hx - 14, hy - r - 16);
      ctx.lineTo(hx - 1, hy - r - 5);
      ctx.lineTo(hx + 12, hy - r - 17);
      ctx.lineTo(hx + 6, hy - r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(hx + 1, hy - 3.5, 10, 3.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx + 3.5, hy - 2.8, 5, 1.6);

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#0284c7', '#0f172a', '#0b0c10', '#7dd3fc', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#0284c7', '#0f172a', '#0b0c10', '#7dd3fc', true);

      // Mecha chest reactor plate
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.fillRect(spineMid.x - 6, spineMid.y - 8, 12, 14);
      ctx.strokeRect(spineMid.x - 6, spineMid.y - 8, 12, 14);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(spineMid.x - 2.5, spineMid.y - 4, 5, 6);
    } else if (outfit === 'akaza') {
      // Boss 10: Crimson Oni Demon King — curved black-crimson oni horns + brow marks + oni war-haori
      drawInkHorn(ctx, hx - 4, hy - r + 2, hx - 13, hy - r - 13, hx - 19, hy - r - 15, 3.0, '#18181b', '#09040a', '#fda4af', '#dc2626');
      drawInkHorn(ctx, hx + 4, hy - r + 2, hx + 12, hy - r - 12, hx + 17, hy - r - 14, 3.0, '#18181b', '#09040a', '#fda4af', '#dc2626');

      // Crimson demon face markings + blazing eyes
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 6);
      ctx.lineTo(hx + 7, hy - 5);
      ctx.moveTo(hx + 1, hy + 4);
      ctx.lineTo(hx + 8, hy + 3);
      ctx.stroke();
      drawInkEyeSlit(ctx, hx, hy, '#f43f5e', '#fef08a', 1.0);

      // Oni beaded war-collar & open-chest crimson haori lapels
      drawInkPauldron(ctx, shL.x, shL.y, -1, '#991b1b', '#450a0a', '#09040a', '#fda4af', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#991b1b', '#450a0a', '#09040a', '#fda4af', true);
      for (let b = -1; b <= 1; b++) {
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#09040a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(neck.x + b * 4.5, neck.y + 5, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (outfit === 'kronos') {
      // Boss 11: Time Reaper — golden clockwork halo behind head + hood + hourglass chest core
      drawInkRing(ctx, hx - 2, hy - 2, r + 9, r + 9, t * 0.6, '#0b0c10', '#eab308', 2.4);
      for (let k = 0; k < 4; k++) {
        const a = t * 0.6 + (k * Math.PI) / 2;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - 2 + Math.cos(a) * (r + 5), hy - 2 + Math.sin(a) * (r + 5));
        ctx.lineTo(hx - 2 + Math.cos(a) * (r + 12), hy - 2 + Math.sin(a) * (r + 12));
        ctx.stroke();
      }

      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hx - r - 5, hy - r - 3);
      ctx.lineTo(hx + r + 2, hy - r + 1);
      ctx.lineTo(hx + r - 2, hy + 5);
      ctx.lineTo(hx - r - 2, hy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawInkEyeSlit(ctx, hx, hy, '#eab308', '#fef9c3', 0.95);

      drawInkPauldron(ctx, shL.x, shL.y, -1, '#ca8a04', '#422006', '#0b0c10', '#fef08a', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#ca8a04', '#422006', '#0b0c10', '#fef08a', true);

      // Golden hourglass chest rune
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(spineMid.x - 4, spineMid.y - 6);
      ctx.lineTo(spineMid.x + 4, spineMid.y - 6);
      ctx.lineTo(spineMid.x - 4, spineMid.y + 4);
      ctx.lineTo(spineMid.x + 4, spineMid.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (outfit === 'omega') {
      // Boss 12: Chaos Sovereign — colossal obsidian-ember-magenta crown + chaos chest singularity
      drawInkHorn(ctx, hx - 6, hy - r + 2, hx - 16, hy - r - 14, hx - 22, hy - r - 20, 3.4, '#18181b', '#09030f', '#f97316', '#e879f9');
      drawInkHorn(ctx, hx + 5, hy - r + 2, hx + 15, hy - r - 14, hx + 21, hy - r - 20, 3.4, '#18181b', '#09030f', '#f97316', '#e879f9');

      // Central sovereign spire
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#09030f';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - r + 1);
      ctx.lineTo(hx, hy - r - 17);
      ctx.lineTo(hx + 4, hy - r + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawInkEyeSlit(ctx, hx, hy, '#f97316', '#ffffff', 1.05);
      drawInkPauldron(ctx, shL.x, shL.y, -1, '#18181b', '#09030f', '#09030f', '#f97316', true);
      drawInkPauldron(ctx, shR.x, shR.y, 1, '#18181b', '#09030f', '#09030f', '#e879f9', true);

      // Blazing solar-chaos chest singularity
      ctx.fillStyle = '#09030f';
      ctx.beginPath();
      ctx.arc(spineMid.x + 1, spineMid.y - 2, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(spineMid.x + 1, spineMid.y - 2, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(spineMid.x + 1, spineMid.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── ELITE RANK ORNAMENTS ───────────────────────────────────────────────
    if (entityTier === 'elite') {
      renderEliteOrnaments(ctx, joints, r, t);
    }

    // ── BOSS PHASE 2 ENRAGE ESCALATION ─────────────────────────────────────
    if (enragePhase === 2) {
      renderPhase2EnrageEscalation(ctx, joints, r, outfit, t);
    }
  } finally {
    ctx.restore();
  }
}
