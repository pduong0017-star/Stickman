import type { CharacterId, SkinId } from '../types';

export interface SkinInkPalette {
  inkOutline: string;
  baseFill: string;
  shadowFill: string;
  rimColor: string;
  accentColor: string;
  clothPrimary: string;
  clothHighlight: string;
  metalLight: string;
  metalDark: string;
  glowCore: string;
}

export function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hslToRgb(hDeg: number, sPct: number, lPct: number): [number, number, number] {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  const s = clamp01(sPct / 100);
  const l = clamp01(lPct / 100);
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

function parseColorRgb(color: string): [number, number, number, number] | null {
  if (typeof color !== 'string') return null;
  const s = color.trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === 'transparent') return [0, 0, 0, 0];
  if (low === 'white') return [255, 255, 255, 1];
  if (low === 'black') return [0, 0, 0, 1];

  if (s[0] === '#') {
    const hex = s.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        1,
      ];
    }
    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        parseInt(hex[3] + hex[3], 16) / 255,
      ];
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        1,
      ];
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16) / 255,
      ];
    }
  }

  const rgbMatch =
    /^rgba?\(\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)(?:\s*,\s*([0-9.+-]+))?\s*\)$/i.exec(
      s
    );
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, Math.round(Number(rgbMatch[1]))));
    const g = Math.max(0, Math.min(255, Math.round(Number(rgbMatch[2]))));
    const b = Math.max(0, Math.min(255, Math.round(Number(rgbMatch[3]))));
    const a = rgbMatch[4] !== undefined ? clamp01(Number(rgbMatch[4])) : 1;
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return [r, g, b, a];
    }
  }

  const hslMatch =
    /^hsla?\(\s*([0-9.+-]+)(?:deg)?\s*,\s*([0-9.+-]+)%\s*,\s*([0-9.+-]+)%(?:\s*,\s*([0-9.+-]+))?\s*\)$/i.exec(
      s
    );
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const sat = Number(hslMatch[2]);
    const lit = Number(hslMatch[3]);
    const a = hslMatch[4] !== undefined ? clamp01(Number(hslMatch[4])) : 1;
    if (Number.isFinite(h) && Number.isFinite(sat) && Number.isFinite(lit)) {
      const [r, g, b] = hslToRgb(h, sat, lit);
      return [r, g, b, a];
    }
  }

  return null;
}

export function colorWithAlpha(color: string, alpha: number): string {
  const a = clamp01(alpha);
  const parsed = parseColorRgb(color);
  if (!parsed) {
    return `rgba(255, 255, 255, ${a.toFixed(3)})`;
  }
  const finalAlpha = parsed[3] === 0 ? 0 : a;
  return `rgba(${parsed[0]}, ${parsed[1]}, ${parsed[2]}, ${finalAlpha.toFixed(3)})`;
}

function shadeColor(color: string, factor: number, fallback: string): string {
  const parsed = parseColorRgb(color);
  if (!parsed) return fallback;
  const r = Math.max(0, Math.min(255, Math.round(parsed[0] * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parsed[1] * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parsed[2] * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function tintColor(color: string, mixWhite: number, fallback: string): string {
  const parsed = parseColorRgb(color);
  if (!parsed) return fallback;
  const t = clamp01(mixWhite);
  const r = Math.round(parsed[0] + (255 - parsed[0]) * t);
  const g = Math.round(parsed[1] + (255 - parsed[1]) * t);
  const b = Math.round(parsed[2] + (255 - parsed[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const SKIN_INK_PALETTES: Record<string, SkinInkPalette> = {
  'kuro:default': {
    inkOutline: '#0b0c10',
    baseFill: '#7c5cff',
    shadowFill: '#3b247a',
    rimColor: '#e2e8f0',
    accentColor: '#ef4444',
    clothPrimary: '#2563eb',
    clothHighlight: '#93c5fd',
    metalLight: '#f8fafc',
    metalDark: '#334155',
    glowCore: '#a855f7',
  },
  'kuro:radiant_seraph': {
    inkOutline: '#0b0c10',
    baseFill: '#f1f5f9',
    shadowFill: '#94a3b8',
    rimColor: '#ffffff',
    accentColor: '#f59e0b',
    clothPrimary: '#fef3c7',
    clothHighlight: '#ffffff',
    metalLight: '#fef9c3',
    metalDark: '#b45309',
    glowCore: '#facc15',
  },
  'kuro:void_walker': {
    inkOutline: '#070410',
    baseFill: '#1e1b4b',
    shadowFill: '#0c0a24',
    rimColor: '#e9d5ff',
    accentColor: '#c084fc',
    clothPrimary: '#581c87',
    clothHighlight: '#e879f9',
    metalLight: '#d8b4fe',
    metalDark: '#3b0764',
    glowCore: '#a855f7',
  },
  'kuro:eclipse_ronin': {
    inkOutline: '#09090b',
    baseFill: '#18181b',
    shadowFill: '#09090b',
    rimColor: '#fed7aa',
    accentColor: '#dc2626',
    clothPrimary: '#b91c1c',
    clothHighlight: '#fde047',
    metalLight: '#fde047',
    metalDark: '#27272a',
    glowCore: '#f97316',
  },
  'raijin:default': {
    inkOutline: '#0b0c10',
    baseFill: '#06b6d4',
    shadowFill: '#0e5268',
    rimColor: '#ecfeff',
    accentColor: '#facc15',
    clothPrimary: '#ca8a04',
    clothHighlight: '#fef08a',
    metalLight: '#e0f2fe',
    metalDark: '#0369a1',
    glowCore: '#22d3ee',
  },
  'raijin:storm_shogun': {
    inkOutline: '#070b18',
    baseFill: '#1d4ed8',
    shadowFill: '#11256b',
    rimColor: '#fef08a',
    accentColor: '#fbbf24',
    clothPrimary: '#f8fafc',
    clothHighlight: '#fde047',
    metalLight: '#fef9c3',
    metalDark: '#1e3a8a',
    glowCore: '#facc15',
  },
  'raijin:cyber_valkyrie': {
    inkOutline: '#090418',
    baseFill: '#0f172a',
    shadowFill: '#060a14',
    rimColor: '#67e8f9',
    accentColor: '#e879f9',
    clothPrimary: '#0891b2',
    clothHighlight: '#f0abfc',
    metalLight: '#e0f2fe',
    metalDark: '#3b0764',
    glowCore: '#e879f9',
  },
  'kagura:default': {
    inkOutline: '#0b0c10',
    baseFill: '#e11d48',
    shadowFill: '#6b0b24',
    rimColor: '#fed7aa',
    accentColor: '#f97316',
    clothPrimary: '#1e293b',
    clothHighlight: '#fb923c',
    metalLight: '#fef08a',
    metalDark: '#451a03',
    glowCore: '#fb7185',
  },
  'kagura:solar_phoenix': {
    inkOutline: '#120402',
    baseFill: '#b91c1c',
    shadowFill: '#5c0c0c',
    rimColor: '#fef9c3',
    accentColor: '#fde047',
    clothPrimary: '#fef3c7',
    clothHighlight: '#ffffff',
    metalLight: '#fef08a',
    metalDark: '#9a3412',
    glowCore: '#facc15',
  },
  'kagura:frost_empress': {
    inkOutline: '#060c18',
    baseFill: '#1e293b',
    shadowFill: '#0b1424',
    rimColor: '#e0f2fe',
    accentColor: '#38bdf8',
    clothPrimary: '#3b0764',
    clothHighlight: '#67e8f9',
    metalLight: '#bae6fd',
    metalDark: '#0c4a6e',
    glowCore: '#22d3ee',
  },
  'zero:default': {
    inkOutline: '#0b0c10',
    baseFill: '#10b981',
    shadowFill: '#064e3b',
    rimColor: '#d1fae5',
    accentColor: '#34d399',
    clothPrimary: '#047857',
    clothHighlight: '#a7f3d0',
    metalLight: '#ecfdf5',
    metalDark: '#065f46',
    glowCore: '#34d399',
  },
  'zero:blood_moon': {
    inkOutline: '#0b0508',
    baseFill: '#18181b',
    shadowFill: '#09090b',
    rimColor: '#fecdd3',
    accentColor: '#f43f5e',
    clothPrimary: '#be123c',
    clothHighlight: '#ffe4e6',
    metalLight: '#fda4af',
    metalDark: '#4c0519',
    glowCore: '#f43f5e',
  },
  'zero:astral_phantom': {
    inkOutline: '#06041a',
    baseFill: '#1e1b4b',
    shadowFill: '#0c0a28',
    rimColor: '#bae6fd',
    accentColor: '#fde047',
    clothPrimary: '#4338ca',
    clothHighlight: '#fef08a',
    metalLight: '#e0f2fe',
    metalDark: '#312e81',
    glowCore: '#38bdf8',
  },
  'aether:default': {
    inkOutline: '#0a0518',
    baseFill: '#4c1d95',
    shadowFill: '#240b4d',
    rimColor: '#f5d0fe',
    accentColor: '#38bdf8',
    clothPrimary: '#7c3aed',
    clothHighlight: '#e879f9',
    metalLight: '#fae8ff',
    metalDark: '#581c87',
    glowCore: '#e879f9',
  },
  'aether:prismatic_archon': {
    inkOutline: '#08051a',
    baseFill: '#1e1b4b',
    shadowFill: '#0e0b2b',
    rimColor: '#fef08a',
    accentColor: '#f43f5e',
    clothPrimary: '#7c3aed',
    clothHighlight: '#38bdf8',
    metalLight: '#fef9c3',
    metalDark: '#312e81',
    glowCore: '#38bdf8',
  },
  'valkyrie:default': {
    inkOutline: '#0b0c10',
    baseFill: '#f8fafc',
    shadowFill: '#94a3b8',
    rimColor: '#ffffff',
    accentColor: '#facc15',
    clothPrimary: '#d97706',
    clothHighlight: '#fef9c3',
    metalLight: '#fef9c3',
    metalDark: '#b45309',
    glowCore: '#facc15',
  },
  'valkyrie:celestial_empress': {
    inkOutline: '#060a18',
    baseFill: '#0f172a',
    shadowFill: '#060a14',
    rimColor: '#e0f2fe',
    accentColor: '#fde047',
    clothPrimary: '#0284c7',
    clothHighlight: '#7dd3fc',
    metalLight: '#e0f2fe',
    metalDark: '#1e3a8a',
    glowCore: '#38bdf8',
  },
  'valkyrie:abyssal_valkyrie': {
    inkOutline: '#09040a',
    baseFill: '#18181b',
    shadowFill: '#09090b',
    rimColor: '#fda4af',
    accentColor: '#f43f5e',
    clothPrimary: '#9f1239',
    clothHighlight: '#e879f9',
    metalLight: '#fecdd3',
    metalDark: '#4c0519',
    glowCore: '#e11d48',
  },
  'mirage:default': {
    inkOutline: '#0b0c10',
    baseFill: '#1e1b4b',
    shadowFill: '#0f0d2e',
    rimColor: '#f1f5f9',
    accentColor: '#c084fc',
    clothPrimary: '#6366f1',
    clothHighlight: '#e2e8f0',
    metalLight: '#f1f5f9',
    metalDark: '#312e81',
    glowCore: '#c084fc',
  },
  'mirage:void_shatterer': {
    inkOutline: '#07040a',
    baseFill: '#18181b',
    shadowFill: '#09090b',
    rimColor: '#e0f2fe',
    accentColor: '#f43f5e',
    clothPrimary: '#9f1239',
    clothHighlight: '#fda4af',
    metalLight: '#38bdf8',
    metalDark: '#4c0519',
    glowCore: '#f43f5e',
  },
  'chrono:default': {
    inkOutline: '#081214',
    baseFill: '#0f766e',
    shadowFill: '#042f2e',
    rimColor: '#99f6e4',
    accentColor: '#f59e0b',
    clothPrimary: '#115e59',
    clothHighlight: '#fde047',
    metalLight: '#fef08a',
    metalDark: '#78350f',
    glowCore: '#2dd4bf',
  },
  'chrono:chrono_sovereign': {
    inkOutline: '#0a0704',
    baseFill: '#1c1917',
    shadowFill: '#090705',
    rimColor: '#fef08a',
    accentColor: '#f59e0b',
    clothPrimary: '#b45309',
    clothHighlight: '#fef08a',
    metalLight: '#fef9c3',
    metalDark: '#92400e',
    glowCore: '#38bdf8',
  },
  'mactien:default': {
    inkOutline: '#090b10',
    baseFill: '#1a1d24',
    shadowFill: '#0c0e13',
    rimColor: '#f4f1ea',
    accentColor: '#ef4444',
    clothPrimary: '#1a1d24',
    clothHighlight: '#f4f1ea',
    metalLight: '#99f6e4',
    metalDark: '#0f766e',
    glowCore: '#2dd4bf',
  },
  'mactien:xuan_feng_sage': {
    inkOutline: '#070d12',
    baseFill: '#f8fafc',
    shadowFill: '#cbd5e1',
    rimColor: '#5eead4',
    accentColor: '#fde68a',
    clothPrimary: '#f8fafc',
    clothHighlight: '#5eead4',
    metalLight: '#fef08a',
    metalDark: '#0f766e',
    glowCore: '#2dd4bf',
  },
};

const AWAKENED_BASE_OVERRIDES: Record<string, { baseFill: string; shadowFill: string; rimColor: string }> = {
  'kuro:default': { baseFill: '#8b5cf6', shadowFill: '#451a6b', rimColor: '#fca5a5' },
  'kuro:radiant_seraph': { baseFill: '#fef9c3', shadowFill: '#ca8a04', rimColor: '#ffffff' },
  'kuro:void_walker': { baseFill: '#312e81', shadowFill: '#160d3d', rimColor: '#f5d0fe' },
  'kuro:eclipse_ronin': { baseFill: '#450a0a', shadowFill: '#1a0404', rimColor: '#fde047' },
  'raijin:default': { baseFill: '#22d3ee', shadowFill: '#0e697d', rimColor: '#fef9c3' },
  'raijin:storm_shogun': { baseFill: '#60a5fa', shadowFill: '#1e3a8a', rimColor: '#fef9c3' },
  'raijin:cyber_valkyrie': { baseFill: '#1e1b4b', shadowFill: '#0d0928', rimColor: '#f0abfc' },
  'kagura:default': { baseFill: '#f97316', shadowFill: '#7c2d12', rimColor: '#fef08a' },
  'kagura:solar_phoenix': { baseFill: '#f59e0b', shadowFill: '#9a3412', rimColor: '#ffffff' },
  'kagura:frost_empress': { baseFill: '#0e7490', shadowFill: '#083344', rimColor: '#e0f2fe' },
  'zero:default': { baseFill: '#34d399', shadowFill: '#065f46', rimColor: '#ecfdf5' },
  'zero:blood_moon': { baseFill: '#4c0519', shadowFill: '#1f030b', rimColor: '#ffe4e6' },
  'zero:astral_phantom': { baseFill: '#312e81', shadowFill: '#151238', rimColor: '#fef08a' },
  'aether:default': { baseFill: '#c026d3', shadowFill: '#581c87', rimColor: '#fef9c3' },
  'aether:prismatic_archon': { baseFill: '#312e81', shadowFill: '#151238', rimColor: '#fef9c3' },
  'valkyrie:default': { baseFill: '#fef08a', shadowFill: '#b45309', rimColor: '#ffffff' },
  'valkyrie:celestial_empress': { baseFill: '#1e3a8a', shadowFill: '#0f172a', rimColor: '#fef08a' },
  'valkyrie:abyssal_valkyrie': { baseFill: '#4c0519', shadowFill: '#1a020a', rimColor: '#f0abfc' },
  'mirage:default': { baseFill: '#312e81', shadowFill: '#16134a', rimColor: '#e2e8f0' },
  'mirage:void_shatterer': { baseFill: '#3b0764', shadowFill: '#09090b', rimColor: '#38bdf8' },
  'chrono:default': { baseFill: '#14b8a6', shadowFill: '#064e3b', rimColor: '#fef08a' },
  'chrono:chrono_sovereign': { baseFill: '#78350f', shadowFill: '#1c1917', rimColor: '#38bdf8' },
  'mactien:default': { baseFill: '#292118', shadowFill: '#0f0c08', rimColor: '#fde047' },
  'mactien:xuan_feng_sage': { baseFill: '#f0fdfa', shadowFill: '#99f6e4', rimColor: '#fde68a' },
};

export function getSkinInkPalette(
  characterId?: CharacterId,
  skinId?: SkinId,
  awakened?: boolean,
  fallbackBody?: string,
  fallbackGlow?: string
): SkinInkPalette {
  if (!characterId) {
    const body = fallbackBody || '#e2e8f0';
    const glow = fallbackGlow || '#dc2626';
    return {
      inkOutline: '#0b0c10',
      baseFill: body,
      shadowFill: shadeColor(body, 0.45, '#1e293b'),
      rimColor: tintColor(glow, 0.55, '#f8fafc'),
      accentColor: glow,
      clothPrimary: shadeColor(body, 0.7, '#334155'),
      clothHighlight: tintColor(glow, 0.35, '#e2e8f0'),
      metalLight: '#f8fafc',
      metalDark: '#334155',
      glowCore: glow,
    };
  }

  const key = `${characterId}:${skinId ?? 'default'}`;
  const base =
    SKIN_INK_PALETTES[key] ??
    SKIN_INK_PALETTES[`${characterId}:default`] ??
    SKIN_INK_PALETTES['kuro:default'];

  if (!awakened) {
    return base;
  }

  const awak =
    AWAKENED_BASE_OVERRIDES[key] ?? AWAKENED_BASE_OVERRIDES[`${characterId}:default`];
  if (!awak) return base;
  return {
    ...base,
    baseFill: awak.baseFill,
    shadowFill: awak.shadowFill,
    rimColor: awak.rimColor,
  };
}

/**
 * Draws a tapered calligraphic ink-wash limb polygon from (x1, y1) to (x2, y2).
 * Uses only basic path primitives (moveTo, lineTo, quadraticCurveTo, arc) for Android Canvas 2D & MockCanvas safety.
 */
export function drawInkBrushLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wStart: number,
  wEnd: number,
  fillStyle: string,
  shadowStyle?: string,
  rimStyle?: string
): void {
  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2)
  ) {
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const r1 = Math.max(0.5, finiteOr(wStart, 8) * 0.5);
  const r2 = Math.max(0.5, finiteOr(wEnd, 6) * 0.5);

  if (len < 0.75) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular vector (rotated +90 deg)
  const px = -uy;
  const py = ux;

  // Mid-brush calligraphic swell for organic martial-arts muscle/ink weight
  const mx = x1 + dx * 0.36;
  const my = y1 + dy * 0.36;
  const rMid = r1 * 0.88 + r2 * 0.24;

  // Start cap center & end cap center
  const sTopX = x1 + px * r1;
  const sTopY = y1 + py * r1;
  const sBotX = x1 - px * r1;
  const sBotY = y1 - py * r1;

  const eTopX = x2 + px * r2;
  const eTopY = y2 + py * r2;
  const eBotX = x2 - px * r2;
  const eBotY = y2 - py * r2;

  // Determine upper-front vs lower-back edge in local character space (smaller y is higher, +x is facing)
  const topIsLit = py <= 0 || (Math.abs(py) < 0.25 && px >= 0);
  const litSign = topIsLit ? 1 : -1;

  // 1. Main tapered brush silhouette with rounded end caps
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(sTopX, sTopY);
  ctx.quadraticCurveTo(mx + px * rMid, my + py * rMid, eTopX, eTopY);
  ctx.quadraticCurveTo(x2 + ux * r2 * 1.15, y2 + uy * r2 * 1.15, eBotX, eBotY);
  ctx.quadraticCurveTo(mx - px * rMid, my - py * rMid, sBotX, sBotY);
  ctx.quadraticCurveTo(x1 - ux * r1 * 1.15, y1 - uy * r1 * 1.15, sTopX, sTopY);
  ctx.closePath();
  ctx.fill();

  // 2. Sumi-e cel/ink shadow wash on the unlit trailing side
  if (shadowStyle) {
    const shSign = -litSign;
    const shR1 = r1 * 0.92;
    const shR2 = r2 * 0.88;
    const shMid = rMid * 0.88;
    ctx.fillStyle = shadowStyle;
    ctx.beginPath();
    ctx.moveTo(x1 + px * shSign * (r1 * 0.1), y1 + py * shSign * (r1 * 0.1));
    ctx.quadraticCurveTo(
      mx + px * shSign * (shMid * 0.22),
      my + py * shSign * (shMid * 0.22),
      x2 + px * shSign * (r2 * 0.15),
      y2 + py * shSign * (r2 * 0.15)
    );
    ctx.lineTo(x2 + px * shSign * shR2, y2 + py * shSign * shR2);
    ctx.quadraticCurveTo(
      mx + px * shSign * shMid,
      my + py * shSign * shMid,
      x1 + px * shSign * shR1,
      y1 + py * shSign * shR1
    );
    ctx.closePath();
    ctx.fill();
  }

  // 3. Sharp directional rim-light stroke along the lit edge
  if (rimStyle && len > 4) {
    const rimW = Math.max(1.2, Math.min(2.4, Math.min(r1, r2) * 0.42));
    const offsetStart = r1 * 0.72;
    const offsetMid = rMid * 0.76;
    const offsetEnd = r2 * 0.72;
    ctx.strokeStyle = rimStyle;
    ctx.lineWidth = rimW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(
      x1 + dx * 0.14 + px * litSign * offsetStart,
      y1 + dy * 0.14 + py * litSign * offsetStart
    );
    ctx.quadraticCurveTo(
      mx + px * litSign * offsetMid,
      my + py * litSign * offsetMid,
      x1 + dx * 0.88 + px * litSign * offsetEnd,
      y1 + dy * 0.88 + py * litSign * offsetEnd
    );
    ctx.stroke();
  }
}

/**
 * Draws a sculpted V-tapered martial-arts torso along the quadratic Bézier spine.
 */
export function drawInkBrushTorso(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  spineX: number,
  spineY: number,
  neckX: number,
  neckY: number,
  shoulderW: number,
  waistW: number,
  fillStyle: string,
  shadowStyle?: string,
  rimStyle?: string
): void {
  if (
    !Number.isFinite(hipX) ||
    !Number.isFinite(hipY) ||
    !Number.isFinite(spineX) ||
    !Number.isFinite(spineY) ||
    !Number.isFinite(neckX) ||
    !Number.isFinite(neckY)
  ) {
    return;
  }

  const evalSpine = (t: number): [number, number, number, number] => {
    const mt = 1 - t;
    const x = mt * mt * hipX + 2 * mt * t * spineX + t * t * neckX;
    const y = mt * mt * hipY + 2 * mt * t * spineY + t * t * neckY;
    const tx = 2 * mt * (spineX - hipX) + 2 * t * (neckX - spineX);
    const ty = 2 * mt * (spineY - hipY) + 2 * t * (neckY - spineY);
    const len = Math.hypot(tx, ty) || 1;
    // Normal pointing right/front when spine goes up (ty < 0 => nx = -ty/len > 0)
    return [x, y, -ty / len, tx / len];
  };

  const wHalf = Math.max(1.5, finiteOr(waistW, 9) * 0.5);
  const sHalf = Math.max(2.0, finiteOr(shoulderW, 13) * 0.5);
  const midHalf = wHalf * 0.86;
  const chestHalf = sHalf * 1.04;
  const collarHalf = wHalf * 0.72;

  const [x0, y0, nx0, ny0] = evalSpine(0);
  const [x1, y1, nx1, ny1] = evalSpine(0.38);
  const [x2, y2, nx2, ny2] = evalSpine(0.78);
  const [x3, y3, nx3, ny3] = evalSpine(1);

  // Sculpted torso polygon: front contour (hip -> chest -> neck) + back contour (neck -> waist -> hip)
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(x0 + nx0 * wHalf, y0 + ny0 * wHalf);
  ctx.quadraticCurveTo(x1 + nx1 * midHalf, y1 + ny1 * midHalf, x2 + nx2 * chestHalf, y2 + ny2 * chestHalf);
  ctx.quadraticCurveTo(x3 + nx3 * (chestHalf * 0.78), y3 + ny3 * (chestHalf * 0.78), x3 + nx3 * collarHalf, y3 + ny3 * collarHalf);
  ctx.quadraticCurveTo(x3, y3 - collarHalf * 0.45, x3 - nx3 * collarHalf, y3 - ny3 * collarHalf);
  ctx.quadraticCurveTo(x3 - nx3 * (chestHalf * 0.78), y3 - ny3 * (chestHalf * 0.78), x2 - nx2 * chestHalf, y2 - ny2 * chestHalf);
  ctx.quadraticCurveTo(x1 - nx1 * midHalf, y1 - ny1 * midHalf, x0 - nx0 * wHalf, y0 - ny0 * wHalf);
  ctx.quadraticCurveTo(x0, y0 + wHalf * 0.48, x0 + nx0 * wHalf, y0 + ny0 * wHalf);
  ctx.closePath();
  ctx.fill();

  // Sumi-e shadow half on the back side of the torso
  if (shadowStyle) {
    ctx.fillStyle = shadowStyle;
    ctx.beginPath();
    ctx.moveTo(x0 - nx0 * (wHalf * 0.05), y0 - ny0 * (wHalf * 0.05));
    ctx.quadraticCurveTo(x1 - nx1 * (midHalf * 0.15), y1 - ny1 * (midHalf * 0.15), x2 - nx2 * (chestHalf * 0.12), y2 - ny2 * (chestHalf * 0.12));
    ctx.lineTo(x3 - nx3 * (collarHalf * 0.9), y3 - ny3 * (collarHalf * 0.9));
    ctx.quadraticCurveTo(x2 - nx2 * (chestHalf * 0.94), y2 - ny2 * (chestHalf * 0.94), x1 - nx1 * (midHalf * 0.94), y1 - ny1 * (midHalf * 0.94));
    ctx.lineTo(x0 - nx0 * (wHalf * 0.92), y0 - ny0 * (wHalf * 0.92));
    ctx.closePath();
    ctx.fill();
  }

  // Crisp directional front chest rim-light
  if (rimStyle) {
    const rimW = Math.max(1.3, Math.min(2.5, sHalf * 0.28));
    ctx.strokeStyle = rimStyle;
    ctx.lineWidth = rimW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 + nx0 * (wHalf * 0.72), y0 + ny0 * (wHalf * 0.72));
    ctx.quadraticCurveTo(
      x1 + nx1 * (midHalf * 0.78),
      y1 + ny1 * (midHalf * 0.78),
      x2 + nx2 * (chestHalf * 0.82),
      y2 + ny2 * (chestHalf * 0.82)
    );
    ctx.stroke();
  }
}

/**
 * Draws an ink-wash head with crisp ink outline, crescent sumi-e shadow wash, and directional rim-light.
 */
export function drawInkHead(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  radius: number,
  inkOutline: string,
  fillStyle: string,
  shadowStyle?: string,
  rimStyle?: string
): void {
  if (!Number.isFinite(headX) || !Number.isFinite(headY)) return;
  const r = Math.max(1, finiteOr(radius, 12));

  if (inkOutline) {
    ctx.fillStyle = inkOutline;
    ctx.beginPath();
    ctx.arc(headX, headY, r + 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(headX, headY, r, 0, Math.PI * 2);
  ctx.fill();

  // Crescent sumi-e ink shadow on the lower-rear quadrant without clip()
  if (shadowStyle) {
    ctx.fillStyle = shadowStyle;
    ctx.beginPath();
    ctx.arc(headX, headY, r * 0.95, Math.PI * 0.35, Math.PI * 1.25);
    ctx.quadraticCurveTo(
      headX - r * 0.15,
      headY + r * 0.15,
      headX + Math.cos(Math.PI * 0.35) * r * 0.95,
      headY + Math.sin(Math.PI * 0.35) * r * 0.95
    );
    ctx.closePath();
    ctx.fill();
  }

  // Crisp top-front rim-light arc
  if (rimStyle && r > 3) {
    ctx.strokeStyle = rimStyle;
    ctx.lineWidth = Math.max(1.5, Math.min(2.6, r * 0.19));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(headX, headY, Math.max(1, r - 2.1), -Math.PI * 0.72, -Math.PI * 0.14);
    ctx.stroke();
  }
}
