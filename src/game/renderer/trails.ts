import type { CharacterId, SkinId, SlashVfxMotif } from '../types';
import { getSkinVfxProfile } from '../skinVfx';
import { strokeSkeletonLimbs } from '../StickmanRenderer';
import { colorWithAlpha, finiteOr } from './inkStyle';
import type { Afterimage, SkeletonJoints, SlashTrail, StickmanRenderOptions } from './types';

export function renderAfterimages(ctx: CanvasRenderingContext2D, afterimages: Afterimage[]): void {
  for (const a of afterimages) {
    if (!a || !a.joints) continue;
    const maxLife = Math.max(0.001, finiteOr(a.maxLife, 0.25));
    const life = Math.max(0, finiteOr(a.life, 0));
    const fade = Math.max(0, Math.min(1, 1 - life / maxLife));
    if (fade <= 0.01) continue;

    const ax = finiteOr(a.x, 0);
    const ay = finiteOr(a.y, 0);
    const facing = a.facing === -1 ? -1 : 1;
    const baseColor = a.color || '#a855f7';
    const isXuanFeng = a.skinId === 'xuan_feng_sage';

    ctx.save();
    try {
      ctx.translate(ax, ay);
      ctx.scale(facing, 1);

      if (isXuanFeng) {
        // Translucent white-robed scholar silhouette dissolving into ink mist & peach blossom petals
        const isAwakenedEcho = Boolean(a.awakened);
        const hip = a.joints.hip ?? { x: 0, y: -48 };
        const neck = a.joints.neck ?? { x: 2, y: -74 };
        const shoulderL = a.joints.shoulderL ?? { x: -4, y: -68 };
        const shoulderR = a.joints.shoulderR ?? { x: 6, y: -68 };
        const elbowL = a.joints.elbowL ?? { x: -10, y: -56 };
        const elbowR = a.joints.elbowR ?? { x: 14, y: -56 };
        const handL = a.joints.handL ?? { x: -16, y: -48 };
        const handR = a.joints.handR ?? { x: 22, y: -58 };
        const footL = a.joints.footL ?? { x: -14, y: 0 };
        const footR = a.joints.footR ?? { x: 16, y: 0 };

        const hx = finiteOr(hip.x, 0);
        const hy = finiteOr(hip.y, -48);
        const nx = finiteOr(neck.x, 2);
        const ny = finiteOr(neck.y, -74);
        const drift = (1 - fade) * (isAwakenedEcho ? 24 : 18);

        // 1. Soft outer Moonlight-Jade / white mist halo
        ctx.globalAlpha = fade * (isAwakenedEcho ? 0.28 : 0.20);
        strokeSkeletonLimbs(
          ctx,
          a.joints,
          10.8 + (1 - fade) * 4.2,
          12.4,
          isAwakenedEcho ? '#5eead4' : '#f8fafc'
        );

        // 2. Flowing white scholar robe & wide sleeves silhouette dissolving backward
        ctx.globalAlpha = fade * (isAwakenedEcho ? 0.36 : 0.28);
        ctx.fillStyle = isAwakenedEcho ? '#f0fdfa' : '#f8fafc';
        ctx.strokeStyle = colorWithAlpha(isAwakenedEcho ? '#fde68a' : '#5eead4', fade * 0.72);
        ctx.lineWidth = 1.25;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(nx - 6, ny + 1);
        ctx.lineTo(nx + 7, ny + 2);
        ctx.quadraticCurveTo(hx + 14, hy + 8, finiteOr(footR.x, 16) + 5, finiteOr(footR.y, 0) - 4);
        ctx.quadraticCurveTo(hx - 2 - drift * 0.35, hy + 18, finiteOr(footL.x, -14) - 10 - drift * 0.45, finiteOr(footL.y, 0) - 3);
        ctx.quadraticCurveTo(hx - 16 - drift * 0.3, hy - 4, finiteOr(shoulderL.x, -4) - 4, finiteOr(shoulderL.y, -68));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wide scholar sleeves along left & right forearms
        for (const [sh, el, ha] of [
          [shoulderR, elbowR, handR],
          [shoulderL, elbowL, handL],
        ] as const) {
          const sx0 = finiteOr(sh.x, 0);
          const sy0 = finiteOr(sh.y, -68);
          const ex0 = finiteOr(el.x, sx0);
          const ey0 = finiteOr(el.y, sy0 + 10);
          const hx0 = finiteOr(ha.x, ex0);
          const hy0 = finiteOr(ha.y, ey0);
          ctx.beginPath();
          ctx.moveTo(sx0, sy0);
          ctx.lineTo(ex0, ey0);
          ctx.lineTo(hx0 - 3, hy0 + 4);
          ctx.quadraticCurveTo(ex0 - 5 - drift * 0.25, ey0 + 13, sx0 - 4, sy0 + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 3. Inner translucent white-jade skeleton core
        ctx.globalAlpha = fade * (isAwakenedEcho ? 0.46 : 0.38);
        strokeSkeletonLimbs(
          ctx,
          a.joints,
          7.4,
          9.8,
          isAwakenedEcho ? '#f0fdfa' : a.color || '#f1f5f9',
          false,
          false,
          colorWithAlpha('#1e293b', 0.15),
          colorWithAlpha(isAwakenedEcho ? '#fde68a' : '#5eead4', 0.56)
        );

        // 4. Dissolving ink mist & moonlight-jade wisps trailing behind torso
        const sx = finiteOr(a.joints.spineMid?.x, 0);
        const sy = finiteOr(a.joints.spineMid?.y, -48);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colorWithAlpha('#1e293b', fade * 0.24);
        ctx.beginPath();
        ctx.ellipse(
          sx - 18 - drift * 1.05,
          sy - 2,
          Math.max(1.8, 8.5 * fade),
          Math.max(1, 2.5 * fade),
          -0.12,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = colorWithAlpha('#f8fafc', fade * 0.40);
        ctx.beginPath();
        ctx.ellipse(
          sx - 14 - drift,
          sy - 12,
          Math.max(1.5, 7 * fade),
          Math.max(1, 2.3 * fade),
          -0.15,
          0,
          Math.PI * 2
        );
        ctx.ellipse(
          sx - 21 - drift * 1.15,
          sy + 6,
          Math.max(1.5, 9 * fade),
          Math.max(1, 2.7 * fade),
          0.1,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = colorWithAlpha(isAwakenedEcho ? '#5eead4' : '#ccfbf1', fade * (isAwakenedEcho ? 0.56 : 0.42));
        ctx.beginPath();
        ctx.ellipse(
          sx - 12 - drift * 0.85,
          sy + 15,
          Math.max(1.2, 6 * fade),
          Math.max(0.8, 2.1 * fade),
          -0.1,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // 5. Dissolving peach blossom petals (+ Moonlight-Jade stars when Awakened)
        const petalCount = isAwakenedEcho ? 4 : 2;
        for (let p = 0; p < petalCount; p++) {
          const px = sx - 10 - drift * (0.7 + p * 0.28) + (p % 2 === 0 ? -4 : 5);
          const py = sy - 16 + p * 11 - (1 - fade) * 6;
          ctx.save();
          try {
            ctx.translate(px, py);
            ctx.rotate(p * 0.85 + (1 - fade) * 2.2);
            ctx.fillStyle = colorWithAlpha('#fda4af', fade * 0.86);
            ctx.strokeStyle = colorWithAlpha('#1e293b', fade * 0.45);
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.max(1.4, 3.6 * fade), Math.max(0.9, 1.9 * fade), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        if (isAwakenedEcho) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = colorWithAlpha('#5eead4', fade * 0.78);
          drawFourPointStar(ctx, sx - 16 - drift * 0.9, sy - 14, 5.2 * fade, 1.3 * fade);
          ctx.fillStyle = colorWithAlpha('#fde68a', fade * 0.72);
          drawFourPointStar(ctx, sx - 8 - drift * 0.5, sy + 10, 4.0 * fade, 1.0 * fade);
        }
      } else {
        // Sumi-e dark ink outer brushstroke echo
        ctx.globalAlpha = fade * 0.34;
        strokeSkeletonLimbs(ctx, a.joints, 10.6, 12.6, '#0b0c10');

        // Vibrant translucent ghost body with ink shadow & bright rim taper
        ctx.globalAlpha = fade * 0.44;
        strokeSkeletonLimbs(
          ctx,
          a.joints,
          8.5,
          11.0,
          baseColor,
          false,
          false,
          colorWithAlpha('#0b0c10', 0.45),
          colorWithAlpha(baseColor, 0.78)
        );

        // Ink-wash trailing edge splatter wisps behind torso
        const sx = finiteOr(a.joints.spineMid?.x, 0);
        const sy = finiteOr(a.joints.spineMid?.y, -48);
        ctx.fillStyle = colorWithAlpha('#0b0c10', fade * 0.48);
        ctx.beginPath();
        ctx.arc(sx - 18, sy - 8, Math.max(0.8, 3.2 * fade), 0, Math.PI * 2);
        ctx.arc(sx - 24, sy + 10, Math.max(0.8, 2.4 * fade), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colorWithAlpha(baseColor, fade * 0.52);
        ctx.beginPath();
        ctx.arc(sx - 14, sy + 4, Math.max(0.6, 2.2 * fade), 0, Math.PI * 2);
        ctx.fill();
      }
    } finally {
      ctx.restore();
    }
  }
}

function inferCharacterForSkin(
  skinId?: SkinId,
  fallbackChar?: CharacterId | null,
  weapon?: StickmanRenderOptions['weapon']
): CharacterId {
  if (fallbackChar) return fallbackChar;
  if (skinId === 'radiant_seraph' || skinId === 'void_walker' || skinId === 'eclipse_ronin') {
    return 'kuro';
  }
  if (skinId === 'storm_shogun' || skinId === 'cyber_valkyrie') return 'raijin';
  if (skinId === 'solar_phoenix' || skinId === 'frost_empress') return 'kagura';
  if (skinId === 'blood_moon' || skinId === 'astral_phantom') return 'zero';
  if (skinId === 'prismatic_archon') return 'aether';
  if (skinId === 'celestial_empress' || skinId === 'abyssal_valkyrie') return 'valkyrie';
  if (skinId === 'void_shatterer') return 'mirage';
  if (skinId === 'chrono_sovereign') return 'chrono';
  if (skinId === 'xuan_feng_sage') return 'mactien';
  if (weapon === 'volt_spear' || weapon === 'thunder_halberd') return 'raijin';
  if (weapon === 'flame_nodachi' || weapon === 'solar_greatblade') return 'kagura';
  if (weapon === 'twin_daggers' || weapon === 'void_sabers') return 'zero';
  if (weapon === 'arcane_hands' || weapon === 'prismatic_hands') return 'aether';
  if (weapon === 'valkyrie_glaive' || weapon === 'valkyrie_excalibur') return 'valkyrie';
  if (weapon === 'mirror_shards' || weapon === 'void_prism_scythe') return 'mirage';
  if (weapon === 'chrono_hand' || weapon === 'chrono_twin_hands') return 'chrono';
  if (weapon === 'ink_brush' || weapon === 'golden_ink_brush') return 'mactien';
  return 'kuro';
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number
): void {
  const rOut = Math.max(0.5, outerR);
  const rIn = Math.max(0.2, innerR);
  ctx.beginPath();
  ctx.moveTo(cx, cy - rOut);
  ctx.lineTo(cx + rIn, cy - rIn);
  ctx.lineTo(cx + rOut, cy);
  ctx.lineTo(cx + rIn, cy + rIn);
  ctx.lineTo(cx, cy + rOut);
  ctx.lineTo(cx - rIn, cy + rIn);
  ctx.lineTo(cx - rOut, cy);
  ctx.lineTo(cx - rIn, cy - rIn);
  ctx.closePath();
  ctx.fill();
}

function drawClockCogwheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  teeth: number,
  rot: number,
  inkColor: string,
  fillColor: string,
  rimColor: string
): void {
  const x = finiteOr(cx, 0);
  const y = finiteOr(cy, 0);
  const rIn = Math.max(2, finiteOr(innerR, 6));
  const rOut = Math.max(rIn + 1.5, finiteOr(outerR, 10));
  const toothCount = Math.max(4, Math.floor(finiteOr(teeth, 8)));
  const angle = finiteOr(rot, 0);

  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineJoin = 'miter';

    const buildGearPath = (radIn: number, radOut: number): void => {
      ctx.beginPath();
      const step = (Math.PI * 2) / toothCount;
      for (let i = 0; i < toothCount; i++) {
        const a0 = i * step;
        const a1 = a0 + step * 0.22;
        const a2 = a0 + step * 0.56;
        const a3 = a0 + step * 0.78;
        if (i === 0) ctx.moveTo(Math.cos(a0) * radIn, Math.sin(a0) * radIn);
        else ctx.lineTo(Math.cos(a0) * radIn, Math.sin(a0) * radIn);
        ctx.lineTo(Math.cos(a1) * radOut, Math.sin(a1) * radOut);
        ctx.lineTo(Math.cos(a2) * radOut, Math.sin(a2) * radOut);
        ctx.lineTo(Math.cos(a3) * radIn, Math.sin(a3) * radIn);
      }
      ctx.closePath();
    };

    // Sumi-ink gear silhouette
    ctx.globalCompositeOperation = 'source-over';
    buildGearPath(rIn + 1.1, rOut + 1.4);
    ctx.fillStyle = inkColor;
    ctx.fill();

    // Metallic/clockwork gear body
    buildGearPath(rIn, rOut);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inner hub cutout & cross spokes
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.4, rIn * 0.56), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.4, rIn * 0.56), 0, Math.PI * 2);
    ctx.moveTo(-rIn * 0.55, 0);
    ctx.lineTo(rIn * 0.55, 0);
    ctx.moveTo(0, -rIn * 0.55);
    ctx.lineTo(0, rIn * 0.55);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

function drawClockRomanNumeral(
  ctx: CanvasRenderingContext2D,
  label: 'XII' | 'III' | 'VI' | 'IX',
  cx: number,
  cy: number,
  fontSize: number,
  inkColor: string,
  fillColor: string,
  facing: 1 | -1 = 1
): void {
  const x = finiteOr(cx, 0);
  const y = finiteOr(cy, 0);
  const px = Math.max(7, Math.round(finiteOr(fontSize, 10)));

  ctx.save();
  try {
    ctx.translate(x, y);
    if (facing === -1) {
      ctx.scale(-1, 1);
    }
    ctx.font = `bold ${px}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.6;
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = fillColor;
    ctx.fillText(label, 0, 0);
  } finally {
    ctx.restore();
  }
}

function drawFacetedMirrorShard(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfLen: number,
  halfWidth: number,
  angle: number,
  inkColor: string,
  facetA: string,
  facetB: string,
  specularColor: string
): void {
  const len = Math.max(2, finiteOr(halfLen, 8));
  const wid = Math.max(1, finiteOr(halfWidth, 3.5));
  const x = finiteOr(cx, 0);
  const y = finiteOr(cy, 0);
  const rot = finiteOr(angle, 0);

  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Asymmetric jagged mirror polygon: sharp tip (+len), wider rear-side bevels
    const tipX = len;
    const tailX = -len * 0.85;
    const midX = -len * 0.12;

    // Ink-wash silhouette border
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.moveTo(tipX + 1.8, 0);
    ctx.lineTo(midX, -wid - 1.6);
    ctx.lineTo(tailX - 1.6, 0.6);
    ctx.lineTo(midX * 1.4, wid + 1.6);
    ctx.closePath();
    ctx.fill();

    // Upper prismatic facet
    ctx.fillStyle = facetA;
    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.lineTo(midX, -wid);
    ctx.lineTo(tailX, 0.3);
    ctx.closePath();
    ctx.fill();

    // Lower contrasting facet
    ctx.fillStyle = facetB;
    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.lineTo(tailX, 0.3);
    ctx.lineTo(midX * 1.4, wid);
    ctx.closePath();
    ctx.fill();

    // Razor-sharp specular reflection ridge
    ctx.strokeStyle = specularColor;
    ctx.lineWidth = Math.max(0.8, wid * 0.32);
    ctx.beginPath();
    ctx.moveTo(tailX * 0.75, 0);
    ctx.lineTo(tipX, 0);
    ctx.moveTo(midX, -wid * 0.85);
    ctx.lineTo(tipX * 0.72, -wid * 0.15);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

export function renderAttackSwingAura(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  opts: StickmanRenderOptions
): void {
  const p = Math.max(0, Math.min(1, finiteOr(opts.attackProgress, 0)));
  const env = Math.sin(p * Math.PI);
  if (env <= 0.01) return;

  const charId = inferCharacterForSkin(
    opts.skinId,
    opts.characterId ?? opts.awakenedForm,
    opts.weapon
  );
  const profile = getSkinVfxProfile(charId, opts.skinId ?? 'default');
  const motif = opts.vfxMotif ?? profile.motif;
  const auraPrimary = opts.attackAuraColor ?? profile.swingAuraColor;
  const auraSecondary = opts.attackAuraSecondary ?? profile.swingAuraSecondary;

  const sx = finiteOr(joints.spineMid?.x, 0);
  const sy = finiteOr(joints.spineMid?.y, -48);
  const ringR = Math.max(8, 34 + p * 24);

  ctx.save();
  try {
    ctx.translate(sx, sy);

    const isMirrorMotif = motif === 'mirror_shatter' || motif === 'void_prism';
    const isXuanFeng = opts.skinId === 'xuan_feng_sage' || motif === 'xuan_feng_calligraphy';
    if (isMirrorMotif) {
      // Sharp faceted octagonal mirror frame (no circular sword shock ring)
      const sides = 6;
      const rotBase = p * 0.45;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = env * 0.56;
      ctx.strokeStyle = '#090b10';
      ctx.lineWidth = 5.4;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = rotBase + (i / sides) * Math.PI * 2;
        const rad = (ringR + 2) * (i % 2 === 0 ? 1.08 : 0.88);
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = env * 0.65;
      ctx.strokeStyle = auraPrimary;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = rotBase + (i / sides) * Math.PI * 2;
        const rad = ringR * (i % 2 === 0 ? 1.06 : 0.86);
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (isXuanFeng) {
      // Delicate open jade-teal Enso brush arc + 2 tiny peach blossom petal flecks
      const ensoStart = -1.9 + p * 0.4;
      const ensoEnd = 2.0 + p * 0.4;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = env * 0.45;
      ctx.strokeStyle = colorWithAlpha('#1e293b', 0.35);
      ctx.lineWidth = 3.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, ringR + 1, ensoStart, ensoEnd);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = env * 0.62;
      ctx.strokeStyle = '#5eead4';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, ensoStart - 0.06, ensoEnd + 0.06);
      ctx.stroke();

      ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.72);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.88, ensoStart + 0.2, ensoEnd - 0.15);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = env * 0.82;
      for (let i = 0; i < 2; i++) {
        const pa = ensoEnd + 0.35 + i * 2.1;
        ctx.save();
        try {
          ctx.translate(Math.cos(pa) * (ringR + 4), Math.sin(pa) * (ringR + 4));
          ctx.rotate(pa + 0.5);
          ctx.fillStyle = '#fda4af';
          ctx.strokeStyle = colorWithAlpha('#1e293b', 0.55);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = env * 0.65;
    } else {
      // Sumi-e ink outer brush ring & edge flecks for crisp ink-wash contrast
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = env * 0.45;
      ctx.strokeStyle = '#090b10';
      ctx.lineWidth = 6.6;
      ctx.beginPath();
      ctx.arc(0, 0, ringR + 1.4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = colorWithAlpha('#090b10', 0.72);
      for (let i = 0; i < 3; i++) {
        const a = p * 2.4 + i * ((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (ringR + 6), Math.sin(a) * (ringR + 6), 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = env * 0.65;

      // Expanding energy shock ring
      ctx.strokeStyle = auraPrimary;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = auraSecondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.86, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Motif-specific dynamic body aura flare
    switch (motif) {
      case 'seraph_feathers': {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 3.2;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(
            side * 12,
            -4,
            ringR * 0.95,
            side > 0 ? -0.9 : Math.PI - 0.5,
            side > 0 ? 0.5 : Math.PI + 0.9
          );
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -ringR * 0.95, 10, 2.2, 0, 0, Math.PI * 2);
        ctx.ellipse(0, -ringR * 0.95, 2.2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'phoenix_plume': {
        ctx.strokeStyle = auraPrimary;
        ctx.lineWidth = 4;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-10, i * 10);
          ctx.quadraticCurveTo(-ringR * 0.8, i * 14 - 18, -ringR * 1.28, i * 8 - 22);
          ctx.stroke();
        }
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.08, -0.8, 0.8);
        ctx.stroke();
        break;
      }
      case 'volt_arc': {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 2.6;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p * 2.2;
          const r1 = ringR * 0.65;
          const r2 = ringR * 1.28;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(
            Math.cos(a + 0.14) * ((r1 + r2) * 0.5),
            Math.sin(a + 0.14) * ((r1 + r2) * 0.5)
          );
          ctx.lineTo(Math.cos(a - 0.05) * r2, Math.sin(a - 0.05) * r2);
          ctx.stroke();
        }
        break;
      }
      case 'shogun_drums': {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 2.4;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + p * 3;
          const dx = Math.cos(a) * ringR * 0.96;
          const dy = Math.sin(a) * ringR * 0.96;
          ctx.fillStyle = auraPrimary;
          ctx.beginPath();
          ctx.arc(dx, dy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'cyber_glitch': {
        for (let i = 0; i < 4; i++) {
          const gy = -24 + i * 15;
          const gw = 26 + ((i * 17) % 24);
          ctx.fillStyle = i % 2 === 0 ? auraPrimary : auraSecondary;
          ctx.fillRect(-gw * 0.5 + Math.sin(p * 18 + i) * 10, gy, gw, 3.2);
        }
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-ringR * 0.72, -ringR * 0.72, ringR * 1.44, ringR * 1.44);
        break;
      }
      case 'void_rift': {
        ctx.save();
        try {
          ctx.rotate(-0.42 + p * 0.5);
          ctx.strokeStyle = auraSecondary;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR * 1.25, ringR * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
        ctx.fillStyle = auraPrimary;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + p * 2;
          const vx = Math.cos(a) * ringR * 1.15;
          const vy = Math.sin(a) * ringR * 1.15;
          ctx.beginPath();
          ctx.moveTo(vx, vy - 6);
          ctx.lineTo(vx + 4, vy);
          ctx.lineTo(vx, vy + 6);
          ctx.lineTo(vx - 4, vy);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'eclipse_blade': {
        // Black-crimson solar eclipse ring + ember sparks
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha('#09090b', env * 0.78);
        ctx.beginPath();
        ctx.arc(-3, 0, ringR * 0.72, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 0.76, -1.25, 1.25);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(2, 0, ringR * 1.04, -1.05, 1.05);
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p * 2.1;
          const rIn = ringR * 0.85;
          const rOut = ringR * 1.32;
          ctx.strokeStyle = i % 2 === 0 ? '#fde047' : auraPrimary;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
          ctx.lineTo(Math.cos(a + 0.08) * rOut, Math.sin(a + 0.08) * rOut);
          ctx.stroke();
        }
        break;
      }
      case 'astral_constellation': {
        ctx.save();
        try {
          ctx.rotate(0.35 + p * 0.6);
          ctx.strokeStyle = auraSecondary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR * 1.22, ringR * 0.46, 0, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
        ctx.fillStyle = auraSecondary;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + p * 2.5;
          drawFourPointStar(
            ctx,
            Math.cos(a) * ringR * 1.08,
            Math.sin(a) * ringR * 1.08,
            6,
            2
          );
        }
        break;
      }
      case 'arcane_sigil': {
        // Purple-magenta sumi-ink geometric sigil + star motes
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        try {
          ctx.rotate(p * 1.6);
          const sigR = ringR * 0.94;
          ctx.strokeStyle = colorWithAlpha('#0a0518', env * 0.8);
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          ctx.arc(0, 0, sigR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = auraPrimary;
          ctx.lineWidth = 2.2;
          for (let tri = 0; tri < 2; tri++) {
            const offset = tri * (Math.PI / 3);
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              const a = offset + (k * Math.PI * 2) / 3;
              const px = Math.cos(a) * sigR;
              const py = Math.sin(a) * sigR;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 - p * 2.2;
          ctx.fillStyle = i % 2 === 0 ? auraSecondary : '#f0abfc';
          drawFourPointStar(
            ctx,
            Math.cos(a) * ringR * 1.15,
            Math.sin(a) * ringR * 1.15,
            5.5,
            1.8
          );
        }
        break;
      }
      case 'prismatic_nova': {
        // Rainbow-ink crystal shards + star bursts
        const prismColors = ['#f43f5e', '#fde047', '#34d399', '#38bdf8', '#e879f9'];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + p * 1.8;
          const bx = Math.cos(a) * ringR * 0.72;
          const by = Math.sin(a) * ringR * 0.72;
          const tx = Math.cos(a) * ringR * 1.32;
          const ty = Math.sin(a) * ringR * 1.32;
          const nx = -Math.sin(a) * 4.5;
          const ny = Math.cos(a) * 4.5;

          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#08051a';
          ctx.beginPath();
          ctx.moveTo(bx + nx * 1.3, by + ny * 1.3);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx - nx * 1.3, by - ny * 1.3);
          ctx.closePath();
          ctx.fill();

          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = prismColors[i % prismColors.length];
          ctx.beginPath();
          ctx.moveTo(bx + nx, by + ny);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx - nx, by - ny);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        drawFourPointStar(ctx, 0, -ringR * 0.85, 8.5, 2.4);
        break;
      }
      case 'valkyrie_radiance': {
        // Radiant gold-white feather arcs + spear halo
        ctx.strokeStyle = auraPrimary;
        ctx.lineWidth = 3.4;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(
            side * 10,
            -2,
            ringR * 1.06,
            side > 0 ? -0.95 : Math.PI - 0.65,
            side > 0 ? 0.65 : Math.PI + 0.95
          );
          ctx.stroke();
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -ringR * 1.24);
        ctx.lineTo(14, -ringR * 0.65);
        ctx.lineTo(0, -ringR * 0.82);
        ctx.lineTo(-14, -ringR * 0.65);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#fef9c3';
        drawFourPointStar(ctx, 0, -ringR * 1.05, 8, 2.2);
        break;
      }
      case 'celestial_halo': {
        // Sapphire-gold celestial ink rings + constellations
        ctx.save();
        try {
          ctx.rotate(-0.32 + p * 0.45);
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = colorWithAlpha('#060a18', env * 0.72);
          ctx.lineWidth = 4.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR * 1.22, ringR * 0.46, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR * 1.22, ringR * 0.46, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR * 0.98, ringR * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + p * 1.9;
          ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#e0f2fe';
          drawFourPointStar(
            ctx,
            Math.cos(a) * ringR * 1.12,
            Math.sin(a) * ringR * 1.12,
            5.5,
            1.7
          );
        }
        break;
      }
      case 'abyssal_eclipse': {
        // Crimson-violet eclipse crescent + abyssal ink feathers
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha('#09040a', env * 0.8);
        ctx.beginPath();
        ctx.arc(-4, 0, ringR * 0.76, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(2, 0, ringR * 0.88, -1.2, 1.2);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + p * 1.7;
          ctx.save();
          try {
            ctx.translate(Math.cos(a) * ringR * 1.06, Math.sin(a) * ringR * 1.06);
            ctx.rotate(a);
            ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#a855f7';
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'frostfire_crystal': {
        ctx.strokeStyle = auraPrimary;
        ctx.fillStyle = auraSecondary;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p * 0.8;
          const bx = Math.cos(a) * ringR * 0.85;
          const by = Math.sin(a) * ringR * 0.85;
          const tx = Math.cos(a) * ringR * 1.26;
          const ty = Math.sin(a) * ringR * 1.26;
          ctx.beginPath();
          ctx.moveTo(bx - Math.sin(a) * 4, by + Math.cos(a) * 4);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx + Math.sin(a) * 4, by - Math.cos(a) * 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'flame_lick': {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 3;
        for (let i = -2; i <= 2; i++) {
          const fx = i * 11;
          ctx.beginPath();
          ctx.moveTo(fx, 18);
          ctx.quadraticCurveTo(fx + Math.sin(p * 12 + i) * 10, -8, fx * 1.2, -ringR * 0.95);
          ctx.stroke();
        }
        break;
      }
      case 'blood_crescent': {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(4, 0, ringR * 1.12, -1.1, 1.1);
        ctx.stroke();
        ctx.fillStyle = auraPrimary;
        for (let i = -1; i <= 1; i++) {
          const px = Math.cos(i * 0.8) * ringR * 1.05;
          const py = Math.sin(i * 0.8) * ringR * 1.05;
          ctx.beginPath();
          ctx.ellipse(px, py, 5, 2.4, i * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'shadow_wisps': {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 2.8;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(8, i * 14);
          ctx.bezierCurveTo(-14, i * 18 - 10, -28, i * 12 + 12, -ringR * 1.25, i * 14);
          ctx.stroke();
        }
        break;
      }
      case 'mirror_shatter': {
        // Sharp spatial glass fracture lines, faceted silver-violet mirror shards & reflection flare
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p * 0.65;
          const r0 = ringR * 0.34;
          const rMid = ringR * 0.88;
          const rOut = ringR * (i % 2 === 0 ? 1.38 : 1.18);
          const jag = (i % 2 === 0 ? 1 : -1) * 0.16;
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = colorWithAlpha('#090b10', env * 0.8);
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a + jag) * rMid, Math.sin(a + jag) * rMid);
          ctx.lineTo(Math.cos(a - jag * 0.4) * rOut, Math.sin(a - jag * 0.4) * rOut);
          ctx.stroke();

          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = i % 2 === 0 ? auraSecondary : auraPrimary;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + p * 1.4;
          const sxPos = Math.cos(a) * ringR * 1.04;
          const syPos = Math.sin(a) * ringR * 1.04;
          drawFacetedMirrorShard(
            ctx,
            sxPos,
            syPos,
            7.5,
            3.2,
            a + 0.55,
            '#090b10',
            auraSecondary,
            auraPrimary,
            '#ffffff'
          );
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        drawFourPointStar(ctx, 0, -ringR * 0.96, 8.2, 2.0);
        break;
      }
      case 'void_prism': {
        // Ma Kính Hư Không: high-contrast obsidian ink-wash shards + crimson/cyan prismatic flares
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - p * 0.8;
          const r0 = ringR * 0.28;
          const rMid = ringR * 0.92;
          const rOut = ringR * (i % 2 === 0 ? 1.44 : 1.24);
          const jag = (i % 2 === 0 ? -1 : 1) * 0.2;
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = colorWithAlpha('#09090b', env * 0.88);
          ctx.lineWidth = 3.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a + jag) * rMid, Math.sin(a + jag) * rMid);
          ctx.lineTo(Math.cos(a - jag * 0.5) * rOut, Math.sin(a - jag * 0.5) * rOut);
          ctx.stroke();

          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = i % 2 === 0 ? '#f43f5e' : '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p * 1.65;
          const rad = ringR * (i % 2 === 0 ? 1.1 : 0.86);
          drawFacetedMirrorShard(
            ctx,
            Math.cos(a) * rad,
            Math.sin(a) * rad,
            8.5,
            3.6,
            a + (i % 2 === 0 ? 0.35 : -0.35),
            '#09090b',
            i % 2 === 0 ? '#f43f5e' : '#38bdf8',
            i % 2 === 0 ? '#38bdf8' : '#be123c',
            '#ffffff'
          );
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#38bdf8';
        drawFourPointStar(ctx, 0, -ringR * 1.02, 9.5, 2.2);
        ctx.fillStyle = '#f43f5e';
        drawFourPointStar(ctx, ringR * 0.88, 0, 7.2, 1.8);
        break;
      }
      case 'chrono_clockwork': {
        // Teal & antique bronze clockface ticks, spinning cogwheel, clock-hand rays & Roman numerals
        const auraFacing: 1 | -1 = opts.facing === -1 ? -1 : 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorWithAlpha('#061414', env * 0.82);
        ctx.lineWidth = 3.0;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const isMajor = i % 3 === 0;
          const rIn = ringR * (isMajor ? 0.78 : 0.88);
          const rOut = ringR * (isMajor ? 1.12 : 1.04);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
          ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
          ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const isMajor = i % 3 === 0;
          const rIn = ringR * (isMajor ? 0.8 : 0.9);
          const rOut = ringR * (isMajor ? 1.1 : 1.03);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
          ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
          ctx.stroke();
        }

        // Spinning bronze/teal cogwheel
        drawClockCogwheel(
          ctx,
          0,
          0,
          ringR * 0.44,
          ringR * 0.58,
          8,
          p * 2.4,
          '#081414',
          colorWithAlpha(auraPrimary, 0.72),
          auraSecondary
        );

        // Sweeping minute & hour clock-hand rays
        ctx.globalCompositeOperation = 'lighter';
        const minHand = -Math.PI * 0.5 + p * Math.PI * 2.2;
        const hrHand = Math.PI * 0.2 - p * 0.8;
        ctx.strokeStyle = '#99f6e4';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(minHand) * ringR * 1.24, Math.sin(minHand) * ringR * 1.24);
        ctx.stroke();
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(hrHand) * ringR * 0.86, Math.sin(hrHand) * ringR * 0.86);
        ctx.stroke();

        // Cardinal Roman numeral glyphs
        const numerals: Array<{ label: 'XII' | 'III' | 'VI' | 'IX'; a: number }> = [
          { label: 'XII', a: -Math.PI * 0.5 },
          { label: 'III', a: 0 },
          { label: 'VI', a: Math.PI * 0.5 },
          { label: 'IX', a: Math.PI },
        ];
        for (const n of numerals) {
          drawClockRomanNumeral(
            ctx,
            n.label,
            Math.cos(n.a) * ringR * 1.2,
            Math.sin(n.a) * ringR * 1.2,
            9,
            '#081414',
            n.label === 'XII' ? '#fde047' : '#99f6e4',
            auraFacing
          );
        }
        break;
      }
      case 'chrono_sovereign': {
        // Imperial gold & azure dual-gear Sovereign Clocktower astrolabe aura
        const auraFacing: 1 | -1 = opts.facing === -1 ? -1 : 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorWithAlpha('#0c0702', env * 0.86);
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = auraPrimary;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.14, 0, Math.PI * 2);
        ctx.stroke();

        // 12 gilded time-tick arcs
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + p * 0.35;
          const isMajor = i % 3 === 0;
          ctx.strokeStyle = isMajor ? '#fef08a' : auraSecondary;
          ctx.lineWidth = isMajor ? 2.6 : 1.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * ringR * 0.84, Math.sin(a) * ringR * 0.84);
          ctx.lineTo(Math.cos(a) * ringR * (isMajor ? 1.22 : 1.08), Math.sin(a) * ringR * (isMajor ? 1.22 : 1.08));
          ctx.stroke();
        }

        // Dual counter-rotating imperial cogwheels
        drawClockCogwheel(
          ctx,
          0,
          0,
          ringR * 0.56,
          ringR * 0.72,
          12,
          p * 2.0,
          '#0c0702',
          colorWithAlpha('#f59e0b', 0.68),
          '#fef08a'
        );
        drawClockCogwheel(
          ctx,
          0,
          0,
          ringR * 0.32,
          ringR * 0.44,
          8,
          -p * 3.1,
          '#0c0702',
          colorWithAlpha('#38bdf8', 0.7),
          '#e0f2fe'
        );

        // Twin sovereign clock-hand rays + 4-point star flare
        ctx.globalCompositeOperation = 'lighter';
        const sovMin = -Math.PI * 0.5 + p * Math.PI * 2.6;
        const sovHr = Math.PI * 0.15 - p * 1.2;
        for (const [handAng, handLen, col] of [
          [sovMin, ringR * 1.32, '#fef08a'],
          [sovHr, ringR * 0.96, '#38bdf8'],
        ] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(handAng) * handLen, Math.sin(handAng) * handLen);
          ctx.stroke();
          ctx.fillStyle = col;
          drawFourPointStar(
            ctx,
            Math.cos(handAng) * handLen,
            Math.sin(handAng) * handLen,
            5.5,
            1.6
          );
        }

        const sovNumerals: Array<{ label: 'XII' | 'III' | 'VI' | 'IX'; a: number }> = [
          { label: 'XII', a: -Math.PI * 0.5 },
          { label: 'III', a: 0 },
          { label: 'VI', a: Math.PI * 0.5 },
          { label: 'IX', a: Math.PI },
        ];
        for (const n of sovNumerals) {
          drawClockRomanNumeral(
            ctx,
            n.label,
            Math.cos(n.a) * ringR * 1.26,
            Math.sin(n.a) * ringR * 1.26,
            10,
            '#0c0702',
            n.label === 'XII' || n.label === 'VI' ? '#fef08a' : '#38bdf8',
            auraFacing
          );
        }
        break;
      }
      case 'xuan_feng_calligraphy': {
        // Confucian Heaven-Earth ring, counter-rotating engraved ticks, tapered Enso, petals & 4-point star glints
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorWithAlpha('#1e293b', env * 0.56);
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = colorWithAlpha('#2dd4bf', env * 0.72);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.14, 0, Math.PI * 2);
        ctx.stroke();

        // Pale-gold inner Confucian hairline ring
        ctx.strokeStyle = colorWithAlpha('#fde68a', env * 0.58);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 0.96, -2.3 + p * 0.5, 2.1 + p * 0.5);
        ctx.stroke();

        // 8 counter-rotating Confucian tick marks
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - p * 0.55;
          const isMajor = i % 2 === 0;
          ctx.strokeStyle = isMajor ? colorWithAlpha('#fde68a', env * 0.78) : colorWithAlpha('#5eead4', env * 0.68);
          ctx.lineWidth = isMajor ? 2.0 : 1.3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * ringR * 0.88, Math.sin(a) * ringR * 0.88);
          ctx.lineTo(Math.cos(a) * ringR * (isMajor ? 1.24 : 1.1), Math.sin(a) * ringR * (isMajor ? 1.24 : 1.1));
          ctx.stroke();
        }

        // Flowing white-jade calligraphy silk ribbons
        ctx.strokeStyle = colorWithAlpha('#f8fafc', env * 0.72);
        ctx.lineWidth = 1.65;
        ctx.beginPath();
        ctx.moveTo(-ringR * 0.98, -8);
        ctx.quadraticCurveTo(0, -20, ringR * 1.02, -4);
        ctx.moveTo(-ringR * 0.82, 10);
        ctx.quadraticCurveTo(0, 20, ringR * 0.88, 6);
        ctx.stroke();

        // 4 slowly rotating peach blossom petals around the Confucian ring
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i++) {
          const pa = (i / 4) * Math.PI * 2 + p * 1.65;
          ctx.save();
          try {
            ctx.translate(Math.cos(pa) * ringR * 1.18, Math.sin(pa) * ringR * 1.18);
            ctx.rotate(pa + 0.75);
            ctx.fillStyle = colorWithAlpha('#fda4af', env * 0.88);
            ctx.strokeStyle = colorWithAlpha('#1e293b', env * 0.5);
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // Twin 4-point star glints (Moonlight White & Pale Gold)
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = colorWithAlpha('#f0fdfa', env * 0.92);
        drawFourPointStar(ctx, 0, -ringR * 1.14, 6.2, 1.5);
        ctx.fillStyle = colorWithAlpha('#fde68a', env * 0.86);
        drawFourPointStar(ctx, ringR * 1.08, 0, 4.8, 1.2);
        break;
      }
      case 'iaido_ink':
      default: {
        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-ringR * 1.15, -6);
        ctx.lineTo(ringR * 1.15, -6);
        ctx.moveTo(-ringR * 0.9, 8);
        ctx.lineTo(ringR * 0.9, 8);
        ctx.stroke();
        break;
      }
    }
  } finally {
    ctx.restore();
  }
}

interface SlashAnchor {
  isArc: boolean;
  curStart: number;
  curEnd: number;
  r: number;
  lineStartX: number;
  lineEndX: number;
  lineY: number;
}

function sampleSlashAnchor(
  anchor: SlashAnchor,
  u: number,
  radialOffset = 0
): { x: number; y: number; dir: number } {
  if (anchor.isArc) {
    const ang = anchor.curStart + (anchor.curEnd - anchor.curStart) * u;
    const rad = Math.max(8, anchor.r + radialOffset);
    const sign = anchor.curEnd >= anchor.curStart ? 1 : -1;
    return {
      x: Math.cos(ang) * rad,
      y: Math.sin(ang) * rad,
      dir: ang + sign * Math.PI * 0.5,
    };
  }
  return {
    x: anchor.lineStartX + (anchor.lineEndX - anchor.lineStartX) * u,
    y: anchor.lineY + radialOffset,
    dir: 0,
  };
}

function resolveSlashMotif(s: SlashTrail): SlashVfxMotif | undefined {
  if (s.motif) return s.motif;
  if (s.characterId) {
    return getSkinVfxProfile(s.characterId, s.skinId ?? 'default').motif;
  }
  if (s.skinId && s.skinId !== 'default') {
    return getSkinVfxProfile(inferCharacterForSkin(s.skinId), s.skinId).motif;
  }
  if (s.style === 'spear_thrust' || s.style === 'spear_flurry') return 'volt_arc';
  if (s.style === 'twin_x') return 'shadow_wisps';
  if (s.style === 'heavy_cleave') return 'flame_lick';
  if (s.style === 'iaido_line') return 'iaido_ink';
  if (s.style === 'mirror_fracture') return 'mirror_shatter';
  if (s.style === 'void_prism_fracture') return 'void_prism';
  if (s.style === 'chrono_clockwork_slash') return 'chrono_clockwork';
  if (s.style === 'chrono_sovereign_slash') return 'chrono_sovereign';
  if (s.style === 'ink_brush_stroke') return 'ink_calligraphy';
  if (s.style === 'xuan_feng_brush') return 'xuan_feng_calligraphy';
  return undefined;
}

function drawSumiEdgeSplatter(
  ctx: CanvasRenderingContext2D,
  anchor: SlashAnchor,
  seed: number,
  inv: number,
  accentColor: string
): void {
  if (inv <= 0.02) return;
  for (let i = 0; i < 3; i++) {
    const u = 0.22 + i * 0.28;
    const off = (i % 2 === 0 ? 1 : -1) * (10 + ((seed + i * 3) % 5) * 2);
    const pt = sampleSlashAnchor(anchor, u, off);
    ctx.fillStyle = colorWithAlpha('#090b10', inv * 0.62);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(0.8, (2.8 - i * 0.4) * inv), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colorWithAlpha(accentColor, inv * 0.45);
    ctx.beginPath();
    ctx.arc(pt.x + 2, pt.y - 2, Math.max(0.6, 1.5 * inv), 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderSlashMotifOrnament(
  ctx: CanvasRenderingContext2D,
  s: SlashTrail,
  motif: SlashVfxMotif,
  t: number,
  inv: number,
  anchor: SlashAnchor,
  facing: 1 | -1 = 1
): void {
  if (inv <= 0.01) return;
  const seed = finiteOr(s.seed, 0);
  const secondary = s.secondaryColor ?? s.rimColor ?? s.outerColor;
  const rim = s.rimColor ?? s.secondaryColor ?? s.outerColor;

  ctx.save();
  try {
    switch (motif) {
      case 'iaido_ink': {
        // 4 obsidian sumi-e ink droplets + outer rim wisps + 2 crisp katana speed needles
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.9;
        for (let i = 0; i < 4; i++) {
          const u = 0.18 + i * 0.22;
          const off = (i % 2 === 0 ? 1 : -1) * (8 + ((i + seed) % 3) * 5);
          const pt = sampleSlashAnchor(anchor, u, off);
          ctx.fillStyle = '#090b10';
          ctx.strokeStyle = s.outerColor;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(
            pt.x,
            pt.y,
            Math.max(0.6, (3.2 + (i % 2) * 1.4) * Math.max(0.4, inv)),
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = s.coreColor || '#ffffff';
        ctx.lineWidth = 1.5;
        for (let n = 0; n < 2; n++) {
          const pt = sampleSlashAnchor(anchor, 0.35 + n * 0.35, n === 0 ? -10 : 10);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(14, 0);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'seraph_feathers': {
        // 4 golden-white feather ellipses + 4-point holy star glint at cut head
        ctx.globalAlpha = inv * 0.92;
        for (let i = 0; i < 4; i++) {
          const u = 0.16 + i * 0.22;
          const pt = sampleSlashAnchor(anchor, u, (i % 2 === 0 ? -1 : 1) * (9 + i * 2));
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + 0.35 * (i % 2 === 0 ? 1 : -1));
            ctx.fillStyle = '#fef9c3';
            ctx.beginPath();
            ctx.ellipse(0, 0, 8.5, 2.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(-7, 0);
            ctx.lineTo(7, 0);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        const head = sampleSlashAnchor(anchor, 0.92, 0);
        ctx.fillStyle = '#ffffff';
        ctx.save();
        try {
          ctx.translate(head.x, head.y);
          ctx.beginPath();
          ctx.ellipse(0, 0, Math.max(0.5, 12 * inv), Math.max(0.5, 2.2 * inv), 0, 0, Math.PI * 2);
          ctx.ellipse(0, 0, Math.max(0.5, 2.2 * inv), Math.max(0.5, 12 * inv), 0, 0, Math.PI * 2);
          ctx.fill();
        } finally {
          ctx.restore();
        }
        break;
      }
      case 'void_rift': {
        // Jagged spatial crack down centerline bordered by #e879f9 + 3 diamond void shards
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.92;
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (let i = 0; i <= 5; i++) {
          const u = 0.1 + (i / 5) * 0.82;
          const zig = i === 0 || i === 5 ? 0 : i % 2 === 0 ? 7 : -7;
          const pt = sampleSlashAnchor(anchor, u, zig);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.strokeStyle = '#0f0720';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#e879f9';
        for (let k = 0; k < 3; k++) {
          const pt = sampleSlashAnchor(anchor, 0.25 + k * 0.28, (k % 2 === 0 ? -1 : 1) * 11);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'eclipse_blade': {
        // Black-crimson solar eclipse medallion + ember sparks along the arc
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.94;
        const mid = sampleSlashAnchor(anchor, 0.56, 0);
        const rOrb = Math.max(4, 11 * Math.max(0.45, inv));
        ctx.fillStyle = '#09090b';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, rOrb, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(mid.x + 2, mid.y, rOrb + 2, -1.1, 1.1);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.16 + i * 0.22, (i % 2 === 0 ? 1 : -1) * 9);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#fde047';
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(0, -2.8);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 2.8);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'volt_arc': {
        // 5-segment jagged lightning bolt tracing the sweep + electric spark nodes
        ctx.globalAlpha = Math.min(1, inv * 1.15);
        ctx.beginPath();
        for (let i = 0; i <= 5; i++) {
          const u = 0.08 + (i / 5) * 0.86;
          const zig = i === 0 || i === 5 ? 0 : Math.sin(t * 42 + i * 2.4 + seed) * 9;
          const pt = sampleSlashAnchor(anchor, u, zig);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = s.outerColor;
        ctx.lineWidth = 4.2;
        ctx.stroke();
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        for (let i = 1; i <= 3; i++) {
          const pt = sampleSlashAnchor(anchor, i * 0.25, (i % 2 === 0 ? 1 : -1) * 8);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'shogun_drums': {
        // 3 imperial gold-rimmed tomoe circles + cobalt-gold lightning spikes
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.92;
        for (let i = 0; i < 3; i++) {
          const pt = sampleSlashAnchor(anchor, 0.22 + i * 0.28, (i % 2 === 0 ? -1 : 1) * 9);
          ctx.fillStyle = '#1d4ed8';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        const head = sampleSlashAnchor(anchor, 0.88, 0);
        ctx.beginPath();
        ctx.moveTo(head.x - 8, head.y - 8);
        ctx.lineTo(head.x + 8, head.y + 8);
        ctx.moveTo(head.x + 8, head.y - 8);
        ctx.lineTo(head.x - 8, head.y + 8);
        ctx.stroke();
        break;
      }
      case 'cyber_glitch': {
        // 5 stepped holographic glitch slices alternating #22d3ee & #e879f9 + diamond reticle
        ctx.globalAlpha = inv * 0.9;
        for (let i = 0; i < 5; i++) {
          const pt = sampleSlashAnchor(
            anchor,
            0.14 + i * 0.18,
            (i % 2 === 0 ? -1 : 1) * (5 + (i % 3) * 3)
          );
          ctx.fillStyle = i % 2 === 0 ? '#22d3ee' : '#e879f9';
          ctx.fillRect(pt.x - 8, pt.y - 1.8, 16, 3.6);
        }
        const tip = sampleSlashAnchor(anchor, 0.9, 0);
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y - 8);
        ctx.lineTo(tip.x + 8, tip.y);
        ctx.lineTo(tip.x, tip.y + 8);
        ctx.lineTo(tip.x - 8, tip.y);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'flame_lick': {
        // 4 curved quadraticCurveTo pointed fire tongues curling outward
        ctx.globalAlpha = inv * 0.88;
        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.2 + i * 0.21, 0);
          const side = i % 2 === 0 ? 1 : -1;
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.fillStyle = s.outerColor;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.quadraticCurveTo(0, side * 14, 12, side * 18);
            ctx.quadraticCurveTo(4, side * 5, 6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = s.coreColor || '#fffbeb';
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.quadraticCurveTo(0, side * 8, 7, side * 10);
            ctx.quadraticCurveTo(2, side * 3, 3, 0);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'phoenix_plume': {
        // 3 elongated swept crimson-gold tail plumes tapering behind the arc head
        ctx.globalAlpha = inv * 0.92;
        for (let i = 0; i < 3; i++) {
          const pt = sampleSlashAnchor(anchor, 0.28 + i * 0.25, (i - 1) * 7);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f97316';
            ctx.beginPath();
            ctx.moveTo(-16, -2.5);
            ctx.quadraticCurveTo(0, -6, 14, 0);
            ctx.quadraticCurveTo(0, 5, -16, 2.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.moveTo(-10, -1);
            ctx.lineTo(10, 0);
            ctx.lineTo(-10, 1);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'frostfire_crystal': {
        // 4 sharp diamond glacial crystal spikes + 2 #c084fc frostfire embers
        ctx.globalAlpha = inv * 0.92;
        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.18 + i * 0.22, (i % 2 === 0 ? -1 : 1) * 8);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + (i % 2 === 0 ? 0.45 : -0.45));
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(4.5, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-4.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        ctx.fillStyle = '#c084fc';
        for (let k = 0; k < 2; k++) {
          const pt = sampleSlashAnchor(anchor, 0.35 + k * 0.4, (k === 0 ? 1 : -1) * 11);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'shadow_wisps': {
        // 3 dark #090b10 curling ninja smoke ribbons outlined in #34d399
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.9;
        for (let i = 0; i < 3; i++) {
          const pt = sampleSlashAnchor(anchor, 0.22 + i * 0.26, (i - 1) * 9);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.strokeStyle = s.outerColor || '#34d399';
            ctx.lineWidth = 4.4;
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.bezierCurveTo(-5, -8, 5, 8, 14, -2);
            ctx.stroke();
            ctx.strokeStyle = '#090b10';
            ctx.lineWidth = 2.2;
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'blood_crescent': {
        // Secondary crescent moon arc overlay + 4 drifting notched rose petals
        ctx.globalAlpha = inv * 0.92;
        if (anchor.isArc) {
          ctx.strokeStyle = rim;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(
            0,
            0,
            Math.max(10, anchor.r + 7),
            anchor.curStart,
            anchor.curEnd,
            anchor.curEnd < anchor.curStart
          );
          ctx.stroke();
        } else {
          const mid = sampleSlashAnchor(anchor, 0.55, 0);
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 18, -1.1, 1.1);
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.16 + i * 0.22, (i % 2 === 0 ? -1 : 1) * 10);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + i * 0.7);
            ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#fecdd3';
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.quadraticCurveTo(5, -1, 2, 5);
            ctx.lineTo(0, 3);
            ctx.lineTo(-2, 5);
            ctx.quadraticCurveTo(-5, -1, 0, -5);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'astral_constellation': {
        // 4 twinkling 4-point stars linked by crisp constellation segments
        ctx.globalAlpha = Math.min(1, inv * 1.1);
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < 4; i++) {
          pts.push(sampleSlashAnchor(anchor, 0.15 + i * 0.24, (i % 2 === 0 ? -1 : 1) * 9));
        }
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
          else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        for (let i = 0; i < pts.length; i++) {
          const pStar = pts[i];
          ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#7dd3fc';
          drawFourPointStar(ctx, pStar.x, pStar.y, 6.5, 2);
        }
        break;
      }
      case 'arcane_sigil': {
        // Purple-magenta sumi-ink geometric sigil rings + star motes
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.92;
        for (const u of [0.34, 0.72]) {
          const pt = sampleSlashAnchor(anchor, u, u < 0.5 ? -6 : 6);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + t * 2.5);
            ctx.fillStyle = colorWithAlpha('#0a0518', 0.68);
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 7);
            ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.14 + i * 0.24, (i % 2 === 0 ? 1 : -1) * 10);
          ctx.fillStyle = i % 2 === 0 ? '#f0abfc' : '#38bdf8';
          drawFourPointStar(ctx, pt.x, pt.y, 5.2, 1.7);
        }
        break;
      }
      case 'prismatic_nova': {
        // Rainbow-ink crystal shards + star bursts
        const prism = ['#f43f5e', '#fde047', '#34d399', '#22d3ee', '#e879f9'];
        ctx.globalAlpha = inv * 0.94;
        for (let i = 0; i < 5; i++) {
          const pt = sampleSlashAnchor(anchor, 0.14 + i * 0.18, (i % 2 === 0 ? -1 : 1) * 9);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + (i - 2) * 0.25);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#08051a';
            ctx.beginPath();
            ctx.moveTo(0, -7.5);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 7.5);
            ctx.lineTo(-5, 0);
            ctx.closePath();
            ctx.fill();

            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = prism[i % prism.length];
            ctx.beginPath();
            ctx.moveTo(0, -5.5);
            ctx.lineTo(3.6, 0);
            ctx.lineTo(0, 5.5);
            ctx.lineTo(-3.6, 0);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        for (const u of [0.46, 0.88]) {
          const pt = sampleSlashAnchor(anchor, u, 0);
          ctx.fillStyle = '#ffffff';
          drawFourPointStar(ctx, pt.x, pt.y, 8 * Math.max(0.4, inv), 2.2 * Math.max(0.4, inv));
        }
        break;
      }
      case 'valkyrie_radiance': {
        // Radiant gold-white feather arcs + spear halo at cut head
        ctx.globalAlpha = inv * 0.94;
        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.18 + i * 0.2, (i % 2 === 0 ? -1 : 1) * 9);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + (i % 2 === 0 ? 0.28 : -0.28));
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(0, 0, 9.5, 3.0, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        const tip = sampleSlashAnchor(anchor, 0.9, 0);
        ctx.save();
        try {
          ctx.translate(tip.x, tip.y);
          ctx.rotate(tip.dir);
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 10 * Math.max(0.4, inv), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          drawFourPointStar(ctx, 0, 0, 11 * Math.max(0.4, inv), 2.3 * Math.max(0.4, inv));
        } finally {
          ctx.restore();
        }
        break;
      }
      case 'celestial_halo': {
        // Sapphire-gold celestial ink rings + linked constellations
        ctx.globalAlpha = inv * 0.94;
        for (const u of [0.28, 0.76]) {
          const pt = sampleSlashAnchor(anchor, u, u < 0.5 ? -5 : 5);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#060a18';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        const starPts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < 4; i++) {
          starPts.push(sampleSlashAnchor(anchor, 0.16 + i * 0.23, (i % 2 === 0 ? 1 : -1) * 9));
        }
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < starPts.length; i++) {
          if (i === 0) ctx.moveTo(starPts[i].x, starPts[i].y);
          else ctx.lineTo(starPts[i].x, starPts[i].y);
        }
        ctx.stroke();
        for (let i = 0; i < starPts.length; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#fde047';
          drawFourPointStar(ctx, starPts[i].x, starPts[i].y, 5.8, 1.8);
        }
        break;
      }
      case 'abyssal_eclipse': {
        // Crimson-violet eclipse crescent + dark abyssal ink feathers
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.94;
        const mid = sampleSlashAnchor(anchor, 0.54, 0);
        ctx.fillStyle = '#09040a';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 10.5 * Math.max(0.45, inv), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mid.x + 2, mid.y, 12.5 * Math.max(0.45, inv), -1.1, 1.1);
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
          const pt = sampleSlashAnchor(anchor, 0.16 + i * 0.22, (i % 2 === 0 ? -1 : 1) * 10);
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir + (i % 2 === 0 ? 0.35 : -0.35));
            ctx.fillStyle = '#09040a';
            ctx.strokeStyle = i % 2 === 0 ? '#f43f5e' : '#e879f9';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(0, 0, 8.8, 2.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'mirror_shatter': {
        // Sharp angular spatial glass fracture line + flying faceted silver-violet mirror shards + reflection glints
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.92;
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (let i = 0; i <= 5; i++) {
          const u = 0.08 + (i / 5) * 0.84;
          const zig = i === 0 || i === 5 ? 0 : (i % 2 === 0 ? 1 : -1) * (8 + ((seed + i) % 4) * 2);
          const pt = sampleSlashAnchor(anchor, u, zig);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        for (let i = 0; i < 5; i++) {
          const u = 0.14 + i * 0.19;
          const off = (i % 2 === 0 ? -1 : 1) * (10 + ((seed + i * 3) % 4) * 3);
          const pt = sampleSlashAnchor(anchor, u, off);
          drawFacetedMirrorShard(
            ctx,
            pt.x,
            pt.y,
            7.5 * Math.max(0.45, inv),
            3.1 * Math.max(0.45, inv),
            pt.dir + (i % 2 === 0 ? 0.42 : -0.48),
            '#090b10',
            s.outerColor || '#e2e8f0',
            secondary || '#a855f7',
            s.coreColor || '#ffffff'
          );
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = s.coreColor || '#ffffff';
        for (const u of [0.32, 0.86]) {
          const glint = sampleSlashAnchor(anchor, u, u < 0.5 ? -5 : 4);
          drawFourPointStar(
            ctx,
            glint.x,
            glint.y,
            7.5 * Math.max(0.4, inv),
            1.8 * Math.max(0.4, inv)
          );
        }
        break;
      }
      case 'void_prism': {
        // High-contrast crimson/cyan ink-wash spatial cracks + obsidian prism shards + sharp reflection flares
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.94;
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const u = 0.06 + (i / 6) * 0.88;
          const zig = i === 0 || i === 6 ? 0 : (i % 2 === 0 ? -1 : 1) * (10 + ((seed + i) % 3) * 3);
          const pt = sampleSlashAnchor(anchor, u, zig);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
          const u = 0.14 + (i / 4) * 0.72;
          const zig = i === 0 || i === 4 ? 0 : (i % 2 === 0 ? 1 : -1) * 8;
          const pt = sampleSlashAnchor(anchor, u, zig + 3);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const u = 0.1 + i * 0.16;
          const off = (i % 2 === 0 ? 1 : -1) * (11 + ((seed + i * 5) % 4) * 3);
          const pt = sampleSlashAnchor(anchor, u, off);
          drawFacetedMirrorShard(
            ctx,
            pt.x,
            pt.y,
            8.4 * Math.max(0.45, inv),
            3.5 * Math.max(0.45, inv),
            pt.dir + (i % 2 === 0 ? -0.52 : 0.46),
            '#09090b',
            i % 2 === 0 ? '#f43f5e' : '#38bdf8',
            i % 2 === 0 ? '#38bdf8' : '#be123c',
            '#ffffff'
          );
        }

        ctx.globalCompositeOperation = 'lighter';
        const apex = sampleSlashAnchor(anchor, 0.88, 0);
        ctx.fillStyle = '#38bdf8';
        drawFourPointStar(ctx, apex.x, apex.y, 9.2 * Math.max(0.4, inv), 2.1 * Math.max(0.4, inv));
        const midPt = sampleSlashAnchor(anchor, 0.44, -6);
        ctx.fillStyle = '#f43f5e';
        drawFourPointStar(ctx, midPt.x, midPt.y, 7.2 * Math.max(0.4, inv), 1.7 * Math.max(0.4, inv));
        break;
      }
      case 'chrono_clockwork': {
        // Teal & antique bronze clockwork ticks, spinning gears, Roman glyphs & clock-hand rays
        ctx.globalAlpha = inv * 0.94;
        for (let i = 0; i < 7; i++) {
          const u = 0.12 + (i / 6) * 0.76;
          const pt = sampleSlashAnchor(anchor, u, 0);
          const tickLen = i % 2 === 0 ? 9.5 : 6.0;
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#081414';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(0, -tickLen);
            ctx.lineTo(0, tickLen);
            ctx.stroke();

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = i % 2 === 0 ? '#f59e0b' : '#99f6e4';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // 2 spinning bronze/teal cogwheels along the sweep
        for (const [idxGear, u] of [
          [0, 0.28],
          [1, 0.74],
        ] as const) {
          const pt = sampleSlashAnchor(anchor, u, idxGear === 0 ? -9 : 9);
          const gScale = Math.max(0.45, inv);
          drawClockCogwheel(
            ctx,
            pt.x,
            pt.y,
            5.8 * gScale,
            8.8 * gScale,
            8,
            (idxGear === 0 ? 1 : -1) * (t * 4.5 + seed * 0.2),
            '#081414',
            idxGear === 0 ? '#2dd4bf' : '#f59e0b',
            '#99f6e4'
          );
        }

        // Roman numeral clock glyphs along the arc
        const glyphs: Array<'XII' | 'III' | 'VI' | 'IX'> = ['XII', 'III', 'VI', 'IX'];
        for (let i = 0; i < glyphs.length; i++) {
          const pt = sampleSlashAnchor(anchor, 0.16 + i * 0.23, i % 2 === 0 ? -12 : 12);
          drawClockRomanNumeral(
            ctx,
            glyphs[i],
            pt.x,
            pt.y,
            9.5 * Math.max(0.55, inv),
            '#081414',
            i === 0 ? '#fde047' : '#99f6e4',
            facing
          );
        }

        // Clock-hand needle ray at tip
        const head = sampleSlashAnchor(anchor, 0.9, 0);
        ctx.save();
        try {
          ctx.translate(head.x, head.y);
          ctx.rotate(head.dir);
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#99f6e4';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-12, 0);
          ctx.lineTo(15, 0);
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          drawFourPointStar(ctx, 0, 0, 7.5 * Math.max(0.4, inv), 1.9 * Math.max(0.4, inv));
        } finally {
          ctx.restore();
        }
        break;
      }
      case 'chrono_sovereign': {
        // Imperial gold & azure Sovereign Clocktower: dual counter-rotating gears, 8 gilded ticks, Roman dial & twin rays
        ctx.globalAlpha = inv * 0.96;

        // 8 gilded time-tick notches along the sweep
        for (let i = 0; i < 8; i++) {
          const u = 0.1 + (i / 7) * 0.8;
          const pt = sampleSlashAnchor(anchor, u, 0);
          const tickLen = i % 2 === 0 ? 11 : 7;
          ctx.save();
          try {
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.dir);
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#0c0702';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(0, -tickLen);
            ctx.lineTo(0, tickLen);
            ctx.stroke();

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = i % 2 === 0 ? '#fef08a' : '#38bdf8';
            ctx.lineWidth = 1.6;
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }

        // Dual counter-rotating imperial clockwork medallion at midpoint
        const mid = sampleSlashAnchor(anchor, 0.52, 0);
        const mScale = Math.max(0.45, inv);
        drawClockCogwheel(
          ctx,
          mid.x,
          mid.y,
          8.5 * mScale,
          12.5 * mScale,
          12,
          t * 3.8 + seed * 0.15,
          '#0c0702',
          '#f59e0b',
          '#fef08a'
        );
        drawClockCogwheel(
          ctx,
          mid.x,
          mid.y,
          4.8 * mScale,
          7.2 * mScale,
          8,
          -t * 5.4,
          '#0c0702',
          '#38bdf8',
          '#e0f2fe'
        );

        // Secondary azure cogwheel near start
        const startGear = sampleSlashAnchor(anchor, 0.2, -10);
        drawClockCogwheel(
          ctx,
          startGear.x,
          startGear.y,
          4.5 * mScale,
          7.0 * mScale,
          8,
          -t * 4.2,
          '#0c0702',
          '#38bdf8',
          '#fef08a'
        );

        // 4 cardinal Roman numerals along sweep
        const sovGlyphs: Array<'XII' | 'III' | 'VI' | 'IX'> = ['XII', 'III', 'VI', 'IX'];
        for (let i = 0; i < sovGlyphs.length; i++) {
          const pt = sampleSlashAnchor(anchor, 0.14 + i * 0.24, i % 2 === 0 ? -13 : 13);
          drawClockRomanNumeral(
            ctx,
            sovGlyphs[i],
            pt.x,
            pt.y,
            10.5 * Math.max(0.55, inv),
            '#0c0702',
            i % 2 === 0 ? '#fef08a' : '#38bdf8',
            facing
          );
        }

        // Twin clock-hand rays & starlight flares at apex and midpoint
        ctx.globalCompositeOperation = 'lighter';
        const tip = sampleSlashAnchor(anchor, 0.9, 0);
        ctx.save();
        try {
          ctx.translate(tip.x, tip.y);
          ctx.rotate(tip.dir);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(18, 0);
          ctx.stroke();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-8, -8);
          ctx.lineTo(8, 8);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
        ctx.fillStyle = '#fef08a';
        drawFourPointStar(ctx, tip.x, tip.y, 10 * Math.max(0.4, inv), 2.3 * Math.max(0.4, inv));
        ctx.fillStyle = '#38bdf8';
        drawFourPointStar(ctx, mid.x, mid.y, 7.2 * Math.max(0.4, inv), 1.8 * Math.max(0.4, inv));
        break;
      }
      case 'xuan_feng_calligraphy': {
        // Xuan Feng Sage calligraphy ornaments: pale-gold hairlines, point-flick ink ripples,
        // rotating Confucian seal ring on finisher, and 4-point star glints.
        const rawSpan = s.endAngle - s.startAngle;
        const isPointFlick = rawSpan < 0 || Math.abs(rawSpan) < 1.1;
        const isSealFinisher = s.secondaryColor === '#fda4af' || s.secondaryColor === '#ef4444';
        const isAwakenedTrail =
          s.outerColor === '#99f6e4' || s.rimColor === '#fde68a' || s.coreColor === '#f0fdfa';

        // 1. Delicate pale-gold & jade-teal calligraphic hairlines along sweep
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = inv * 0.78;
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = Math.max(0.85, 1.25 * inv);
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const u = 0.14 + (i / 10) * 0.76;
          const pt = sampleSlashAnchor(anchor, u, -8 + Math.sin(u * Math.PI) * 3);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.strokeStyle = isAwakenedTrail ? '#99f6e4' : '#5eead4';
        ctx.lineWidth = Math.max(0.75, 1.05 * inv);
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const u = 0.2 + (i / 10) * 0.68;
          const pt = sampleSlashAnchor(anchor, u, 8 - Math.sin(u * Math.PI) * 2.5);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // 2. Ink-wash ripples on brush-tip point flick (Hit 3 / reverse flick)
        const tip = sampleSlashAnchor(anchor, 0.88, 0);
        if (isPointFlick) {
          for (let rIdx = 0; rIdx < 2; rIdx++) {
            const rippleR = (10 + rIdx * 9) * (0.65 + t * 0.68);
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = colorWithAlpha('#1e293b', inv * (0.48 - rIdx * 0.16));
            ctx.lineWidth = 2.0 - rIdx * 0.5;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, rippleR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = colorWithAlpha(rIdx === 0 ? '#5eead4' : '#fde68a', inv * 0.72);
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, rippleR * 0.94, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // 3. Finisher: Fine-lined Confucian seal ring + rotating petals + crisp "静"
        if (isSealFinisher) {
          const ringR = 22 * (0.86 + 0.28 * inv);
          ctx.save();
          try {
            ctx.translate(tip.x, tip.y);
            ctx.scale(facing, 1);

            ctx.save();
            try {
              ctx.rotate(t * 3.4);
              ctx.globalCompositeOperation = 'lighter';
              ctx.strokeStyle = colorWithAlpha('#2dd4bf', inv * 0.88);
              ctx.lineWidth = 1.5;
              ctx.setLineDash([10, 6, 3, 6]);
              ctx.beginPath();
              ctx.arc(0, 0, ringR, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = colorWithAlpha('#fde68a', inv * 0.72);
              ctx.lineWidth = 1.1;
              ctx.setLineDash([6, 7]);
              ctx.beginPath();
              ctx.arc(0, 0, ringR * 0.76, 0, Math.PI * 2);
              ctx.stroke();

              ctx.globalCompositeOperation = 'source-over';
              for (let k = 0; k < 4; k++) {
                const pa = k * Math.PI * 0.5;
                ctx.save();
                try {
                  ctx.translate(Math.cos(pa) * ringR, Math.sin(pa) * ringR);
                  ctx.rotate(pa + 0.6);
                  ctx.fillStyle = colorWithAlpha('#fda4af', inv * 0.9);
                  ctx.strokeStyle = colorWithAlpha('#1e293b', inv * 0.5);
                  ctx.lineWidth = 0.6;
                  ctx.beginPath();
                  ctx.ellipse(0, 0, 3.2 * inv + 1, 1.8 * inv + 0.6, 0, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                } finally {
                  ctx.restore();
                }
              }
            } finally {
              ctx.setLineDash([]);
              ctx.restore();
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `900 ${Math.round(ringR * 1.08)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 2.6;
            ctx.strokeStyle = colorWithAlpha('#1e293b', inv * 0.86);
            ctx.strokeText('静', 0, 1);
            ctx.fillStyle = colorWithAlpha('#f8fafc', inv * 0.96);
            ctx.fillText('静', 0, 1);
          } finally {
            ctx.restore();
          }
        }

        // 4. 4-point star glints at tip & midpoint
        ctx.globalCompositeOperation = 'lighter';
        const midPt = sampleSlashAnchor(anchor, 0.5, 0);
        ctx.fillStyle = colorWithAlpha('#ffffff', inv * 0.94);
        drawFourPointStar(ctx, tip.x, tip.y, 7.6 * Math.max(0.4, inv), 1.8 * Math.max(0.4, inv));
        ctx.fillStyle = colorWithAlpha(isAwakenedTrail ? '#fde68a' : '#5eead4', inv * 0.86);
        drawFourPointStar(ctx, midPt.x, midPt.y, 5.4 * Math.max(0.4, inv), 1.4 * Math.max(0.4, inv));
        break;
      }
    }
  } finally {
    ctx.restore();
  }
}

/**
 * Wide anime fan-shaped blade smear wedges + sumi-ink brushstroke outer edge + per-skin motif ornaments
 */
export function renderSlashTrails(ctx: CanvasRenderingContext2D, trails: SlashTrail[]): void {
  for (const s of trails) {
    const sx = finiteOr(s.x, 0);
    const sy = finiteOr(s.y, 0);
    const facing = s.facing === -1 ? -1 : 1;
    const radius = Math.max(8, finiteOr(s.radius, 80));
    const startAngle = finiteOr(s.startAngle, -1.2);
    const endAngle = finiteOr(s.endAngle, 0.8);
    const safeMaxLife = Math.max(0.001, finiteOr(s.maxLife, 0.2));
    const safeLife = Math.max(0, finiteOr(s.life, 0));
    const thickness = Math.max(2, finiteOr(s.thickness, 16));
    const seed = finiteOr(s.seed, 0);

    const t = Math.max(0, Math.min(1, safeLife / safeMaxLife));
    const inv = Math.max(0, 1 - t);
    if (inv <= 0.005) continue;

    const style = s.style ?? 'arc';
    const motif = resolveSlashMotif(s);

    ctx.save();
    try {
      ctx.translate(sx, sy);
      ctx.scale(facing, 1);
      ctx.lineCap = 'round';

      if (style === 'chrono_clockwork_slash' || style === 'chrono_sovereign_slash') {
        // CHRONO CLOCKWORK / SOVEREIGN SLASH:
        // Sumi-ink clockface smear, graduated time-tick arcs, spinning cogwheels,
        // Roman numeral dial markings & clock-hand sweeping rays.
        const isSovereign =
          style === 'chrono_sovereign_slash' ||
          motif === 'chrono_sovereign' ||
          s.skinId === 'chrono_sovereign';
        const chronoMotif: SlashVfxMotif = isSovereign ? 'chrono_sovereign' : 'chrono_clockwork';
        const primaryBand = s.outerColor || (isSovereign ? '#f59e0b' : '#2dd4bf');
        const secondaryBand = s.secondaryColor ?? (isSovereign ? '#38bdf8' : '#f59e0b');
        const rimBand = s.rimColor ?? (isSovereign ? '#fef08a' : '#99f6e4');
        const rawSpan = endAngle - startAngle;

        if (Math.abs(rawSpan) < 0.65) {
          // Forward Spinning Chakram / Astrolabe Boomerang Throw
          const reach = radius * (isSovereign ? 1.54 : 1.44);
          // Out-and-back boomerang flight curve (peaks at t = 0.45, snaps back)
          const flightT = t < 0.45 ? t / 0.45 : Math.max(0.18, 1 - ((t - 0.45) / 0.55) * 0.72);
          const easedFlight = 1 - Math.pow(1 - flightT, 2.4);
          const discX = 16 + reach * easedFlight;
          const discR = Math.max(12, (isSovereign ? 26 : 21) * (0.75 + 0.3 * inv));
          const hw = Math.max(2.5, thickness * (isSovereign ? 0.5 : 0.4) * inv);
          ctx.rotate((startAngle + endAngle) * 0.25);

          const chronoLineAnchor: SlashAnchor = {
            isArc: false,
            curStart: 0,
            curEnd: 0,
            r: discX,
            lineStartX: 0,
            lineEndX: discX + discR,
            lineY: 0,
          };

          // Ink-wash flight corridor
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = colorWithAlpha('#081414', inv * 0.56);
          ctx.beginPath();
          ctx.moveTo(-10, -hw * 0.5);
          ctx.lineTo(discX, -hw * 1.45);
          ctx.lineTo(discX + discR * 0.85, 0);
          ctx.lineTo(discX, hw * 1.45);
          ctx.lineTo(-10, hw * 0.5);
          ctx.closePath();
          ctx.fill();
          drawSumiEdgeSplatter(ctx, chronoLineAnchor, seed, inv, primaryBand);

          // Twin energy slipstreams
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = inv * 0.7;
          ctx.strokeStyle = primaryBand;
          ctx.lineWidth = Math.max(1.8, hw * 0.8);
          ctx.beginPath();
          ctx.moveTo(0, -discR * 0.42);
          ctx.lineTo(discX, -discR * 0.62);
          ctx.moveTo(0, discR * 0.42);
          ctx.lineTo(discX, discR * 0.62);
          ctx.stroke();

          ctx.globalAlpha = inv * 0.85;
          ctx.strokeStyle = secondaryBand;
          ctx.lineWidth = Math.max(1.4, hw * 0.48);
          ctx.beginPath();
          ctx.moveTo(4, 0);
          ctx.lineTo(discX, 0);
          ctx.stroke();

          // Flying Spinning Chrono Chakram / Astrolabe Disc at discX
          ctx.save();
          try {
            ctx.translate(discX, 0);
            ctx.scale(1, 0.78); // Slight 3D perspective tilt
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.min(1, inv * 1.25);
            drawClockCogwheel(
              ctx,
              0,
              0,
              discR * 0.64,
              discR,
              isSovereign ? 10 : 8,
              t * 18.0,
              '#081214',
              primaryBand,
              rimBand
            );

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = secondaryBand;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(0, 0, discR * 0.86, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, 0, discR * 0.42, 0, Math.PI * 2);
            ctx.stroke();
          } finally {
            ctx.restore();
          }

          renderSlashMotifOrnament(ctx, s, chronoMotif, t, inv, chronoLineAnchor, facing);
          continue;
        }

        if (Math.abs(rawSpan) > 5.0) {
          // Giant Expanding Clockface / Eclipse Dial Snap Detonation (Hit 3 & Hit 6 Finisher)
          const dialX = radius * 0.62;
          const expand = 0.35 + 0.65 * (1 - Math.pow(1 - Math.min(1, t / 0.45), 3));
          const dialR = radius * (isSovereign ? 0.92 : 0.78) * expand;

          ctx.save();
          try {
            ctx.translate(dialX, 0);

            // 1. Sumi-ink dark eclipse dial backdrop
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = colorWithAlpha(isSovereign ? '#0c0804' : '#051414', inv * 0.52);
            ctx.beginPath();
            ctx.arc(0, 0, dialR, 0, Math.PI * 2);
            ctx.fill();

            // Outer ink bezel
            ctx.strokeStyle = colorWithAlpha('#081214', inv * 0.9);
            ctx.lineWidth = Math.max(3, 6.5 * inv);
            ctx.beginPath();
            ctx.arc(0, 0, dialR, 0, Math.PI * 2);
            ctx.stroke();

            // 2. Glowing clockface rim & 12 Roman tick notches
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = inv * 0.92;
            ctx.strokeStyle = primaryBand;
            ctx.lineWidth = Math.max(2, 3.8 * inv);
            ctx.beginPath();
            ctx.arc(0, 0, dialR, 0, Math.PI * 2);
            ctx.stroke();

            // Inner shockwave ring
            ctx.strokeStyle = secondaryBand;
            ctx.lineWidth = Math.max(1.5, 2.6 * inv);
            ctx.beginPath();
            ctx.arc(0, 0, dialR * (0.58 + t * 0.25), 0, Math.PI * 2);
            ctx.stroke();

            // 12 radial hour ticks
            ctx.strokeStyle = rimBand;
            ctx.lineWidth = Math.max(1.2, 2.0 * inv);
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
              const a = (i * Math.PI * 2) / 12 + t * 0.9;
              const inner = i % 3 === 0 ? dialR * 0.72 : dialR * 0.84;
              ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
              ctx.lineTo(Math.cos(a) * (dialR * 0.98), Math.sin(a) * (dialR * 0.98));
            }
            ctx.stroke();

            // Spinning central cogwheel
            ctx.globalCompositeOperation = 'source-over';
            drawClockCogwheel(
              ctx,
              0,
              0,
              Math.max(4, dialR * 0.22),
              Math.max(7, dialR * 0.36),
              isSovereign ? 12 : 8,
              -t * 7.5,
              '#081214',
              primaryBand,
              rimBand
            );

            // Sweeping giant clock hands snapping toward XII
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.8, 3.2 * inv);
            ctx.beginPath();
            const hourA = -Math.PI * 0.5 + (1 - expand) * 1.4;
            const minA = -Math.PI * 0.5 - (1 - expand) * 3.8;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(hourA) * dialR * 0.55, Math.sin(hourA) * dialR * 0.55);
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(minA) * dialR * 0.88, Math.sin(minA) * dialR * 0.88);
            ctx.stroke();

            // Sovereign Eclipse Cross-Flare
            if (isSovereign) {
              ctx.strokeStyle = secondaryBand;
              ctx.lineWidth = Math.max(1.6, 3.0 * inv);
              ctx.beginPath();
              ctx.moveTo(-dialR * 1.18, 0);
              ctx.lineTo(dialR * 1.18, 0);
              ctx.moveTo(0, -dialR * 1.18);
              ctx.lineTo(0, dialR * 1.18);
              ctx.stroke();
            }
          } finally {
            ctx.restore();
          }
          continue;
        }

        // Orbital Spinning Chakram / Astrolabe Ring Sweep (ZERO sword-crescent wedge!)
        const headProgress = Math.min(1, t / 0.34);
        const headEased = 1 - Math.pow(1 - headProgress, 3);
        const tailProgress = Math.max(0, (t - 0.12) / 0.88);
        const tailEased = tailProgress * tailProgress;

        const curStart = startAngle + rawSpan * tailEased;
        const curEnd = startAngle + rawSpan * headEased;
        if (Math.abs(curEnd - curStart) < 0.04) {
          continue;
        }

        const ccw = rawSpan < 0;
        const orbitR = radius * (isSovereign ? 1.06 : 1.0);
        const discR = Math.max(11, (isSovereign ? 23 : 18) * (0.72 + 0.32 * inv));
        const chronoArcAnchor: SlashAnchor = {
          isArc: true,
          curStart,
          curEnd,
          r: orbitR,
          lineStartX: 0,
          lineEndX: 0,
          lineY: 0,
        };

        // 1. Thin sumi-ink orbital guide lines (no thick sword-crescent fill)
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorWithAlpha('#081414', inv * 0.72);
        ctx.lineWidth = Math.max(2.2, 4.2 * inv);
        ctx.beginPath();
        ctx.arc(0, 0, orbitR, curStart, curEnd, ccw);
        ctx.stroke();

        // 2. Dual luminous orbital rings + Roman dial ticks
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = inv * 0.82;
        ctx.strokeStyle = primaryBand;
        ctx.lineWidth = Math.max(1.8, 3.2 * inv);
        ctx.beginPath();
        ctx.arc(0, 0, orbitR, curStart, curEnd, ccw);
        ctx.stroke();

        ctx.globalAlpha = inv * 0.62;
        ctx.strokeStyle = secondaryBand;
        ctx.lineWidth = Math.max(1.2, 2.0 * inv);
        ctx.beginPath();
        ctx.arc(0, 0, orbitR * 0.82, curStart, curEnd, ccw);
        ctx.stroke();

        const tickCount = isSovereign ? 10 : 7;
        ctx.strokeStyle = rimBand;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i <= tickCount; i++) {
          const u = i / tickCount;
          const a = curStart + (curEnd - curStart) * u;
          const rIn = orbitR * (i % 2 === 0 ? 0.8 : 0.88);
          const rOut = orbitR * 1.04;
          ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
          ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
        }
        ctx.stroke();

        // 3. Trailing ghost Chakram rings along the orbit
        const ghostFractions = [0.38, 0.7];
        for (let g = 0; g < ghostFractions.length; g++) {
          const frac = ghostFractions[g];
          const ga = curStart + (curEnd - curStart) * frac;
          const gx = Math.cos(ga) * orbitR;
          const gy = Math.sin(ga) * orbitR;
          const gr = discR * (0.62 + g * 0.16);
          ctx.globalAlpha = inv * (0.28 + g * 0.2);
          ctx.strokeStyle = g === 0 ? secondaryBand : primaryBand;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 4. Leading Spinning Bladed Chrono Chakram / Astrolabe at curEnd
        const headX = Math.cos(curEnd) * orbitR;
        const headY = Math.sin(curEnd) * orbitR;
        ctx.save();
        try {
          ctx.translate(headX, headY);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, inv * 1.25);
          drawClockCogwheel(
            ctx,
            0,
            0,
            discR * 0.62,
            discR,
            isSovereign ? 10 : 8,
            t * 16.0 * (ccw ? -1 : 1),
            '#081214',
            primaryBand,
            rimBand
          );

          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = secondaryBand;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, discR * 0.84, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, discR * 0.38, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        renderSlashMotifOrnament(ctx, s, chronoMotif, t, inv, chronoArcAnchor, facing);
        continue;
      }

      if (
        style === 'xuan_feng_brush' ||
        (style === 'ink_brush_stroke' &&
          (s.skinId === 'xuan_feng_sage' || motif === 'xuan_feng_calligraphy'))
      ) {
        // XUÂN PHONG VĂN THÁNH — Finer 3-Layer Silk Brush Ribbon (Ink Wash -> White-Jade Glow -> Razor Brush-Tip Flash)
        const isSealFinisher = s.secondaryColor === '#fda4af' || s.secondaryColor === '#ef4444';
        const isAwakenedTrail =
          s.outerColor === '#99f6e4' || s.rimColor === '#fde68a' || s.coreColor === '#f0fdfa';
        const silkGlowCol = s.outerColor || '#5eead4';
        const rawSpan = endAngle - startAngle;
        const sweep = Math.min(1, t / 0.2 + 0.36);
        const curStart = startAngle + rawSpan * Math.max(0, t * 0.44 - 0.05);
        const curEnd = startAngle + rawSpan * sweep;
        const maxHalfW = Math.max(2.6, thickness * 0.54 * inv);

        const steps = 22;
        const outerPts: Array<{ x: number; y: number }> = [];
        const innerPts: Array<{ x: number; y: number }> = [];
        const coreOutPts: Array<{ x: number; y: number }> = [];
        const coreInPts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const ang = curStart + (curEnd - curStart) * u;
          // Finer razor-sharp tapered tips (vanishes smoothly to 0 at u=0 and u=1)
          const taper =
            Math.pow(Math.sin(u * Math.PI), 1.04) * (0.74 + 0.32 * Math.sin(u * Math.PI * 0.85));
          const hw = maxHalfW * taper;
          const coreHw = hw * 0.52;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          outerPts.push({ x: cosA * (radius + hw), y: sinA * (radius + hw) });
          innerPts.push({
            x: cosA * Math.max(6, radius - hw * 0.62),
            y: sinA * Math.max(6, radius - hw * 0.62),
          });
          coreOutPts.push({ x: cosA * (radius + coreHw), y: sinA * (radius + coreHw) });
          coreInPts.push({
            x: cosA * Math.max(6, radius - coreHw * 0.52),
            y: sinA * Math.max(6, radius - coreHw * 0.52),
          });
        }

        const traceSilk = (
          ptsOut: Array<{ x: number; y: number }>,
          ptsIn: Array<{ x: number; y: number }>
        ) => {
          ctx.beginPath();
          ctx.moveTo(ptsOut[0].x, ptsOut[0].y);
          for (let i = 1; i < ptsOut.length; i++) ctx.lineTo(ptsOut[i].x, ptsOut[i].y);
          for (let i = ptsIn.length - 1; i >= 0; i--) ctx.lineTo(ptsIn[i].x, ptsIn[i].y);
          ctx.closePath();
        };

        // Layer 1 (Outer): Soft ink-wash bleed silk ribbon (#1e293b / #0f172a)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha('#1e293b', inv * 0.34);
        ctx.strokeStyle = colorWithAlpha('#0f172a', inv * 0.24);
        ctx.lineWidth = Math.max(0.8, 1.3 * inv);
        ctx.lineJoin = 'round';
        traceSilk(outerPts, innerPts);
        ctx.fill();
        ctx.stroke();

        // Layer 2 (Inner Glow): White-jade silk body (#f8fafc / #ccfbf1) + jade-teal luminous glow (#2dd4bf / #5eead4)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha(isAwakenedTrail ? '#ccfbf1' : '#f8fafc', inv * 0.34);
        traceSilk(coreOutPts, coreInPts);
        ctx.fill();

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = colorWithAlpha(silkGlowCol, inv * 0.44);
        ctx.strokeStyle = colorWithAlpha(isAwakenedTrail || isSealFinisher ? '#fde68a' : '#2dd4bf', inv * 0.78);
        ctx.lineWidth = Math.max(0.95, 1.45 * inv);
        traceSilk(coreOutPts, coreInPts);
        ctx.fill();
        ctx.stroke();

        // Layer 3 (Brush-Tip Flash): Razor-sharp pure #ffffff tip filament along leading half + bright tip flare
        const leadStartIdx = Math.floor(steps * 0.45);
        ctx.strokeStyle = colorWithAlpha('#ffffff', inv * 0.96);
        ctx.lineWidth = Math.max(1.0, 1.75 * inv);
        ctx.beginPath();
        for (let i = leadStartIdx; i <= steps; i++) {
          const p = outerPts[i];
          if (i === leadStartIdx) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        const leadTip = outerPts[steps - 1] ?? outerPts[steps];
        if (leadTip) {
          ctx.fillStyle = colorWithAlpha('#ffffff', inv * 0.95);
          drawFourPointStar(ctx, leadTip.x, leadTip.y, 5.8 * inv, 1.35 * inv);
        }

        // Slowly drifting peach blossom petals, jade bamboo leaves & ink droplets
        ctx.globalCompositeOperation = 'source-over';
        const swingSign = rawSpan >= 0 ? 1 : -1;
        for (let p = 0; p < 3; p++) {
          const u = 0.22 + p * 0.28;
          const ang = curStart + (curEnd - curStart) * u;
          const tangA = ang + swingSign * Math.PI * 0.5;
          const radialOff = maxHalfW * 0.68 + (6 + ((seed + p * 3) % 5) * 2) * (0.45 + t * 0.72);
          const px = Math.cos(ang) * (radius + radialOff) + Math.cos(tangA) * (t * 14);
          const py = Math.sin(ang) * (radius + radialOff) + Math.sin(tangA) * (t * 14) + t * 4;
          ctx.save();
          try {
            ctx.translate(px, py);
            ctx.rotate(tangA + (p - 1) * 0.35 + t * 1.2);
            if (p % 2 === 0) {
              const pLen = Math.max(1.8, 4.1 * inv);
              const pWid = Math.max(1.1, 2.2 * inv);
              ctx.fillStyle = colorWithAlpha('#fda4af', inv * 0.88);
              ctx.strokeStyle = colorWithAlpha('#1e293b', inv * 0.52);
              ctx.lineWidth = 0.65;
              ctx.beginPath();
              ctx.ellipse(0, 0, pLen, pWid, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else {
              const lLen = Math.max(2.1, 5.0 * inv);
              ctx.fillStyle = colorWithAlpha('#5eead4', inv * 0.84);
              ctx.strokeStyle = colorWithAlpha('#1e293b', inv * 0.5);
              ctx.lineWidth = 0.65;
              ctx.beginPath();
              ctx.moveTo(-lLen, 0);
              ctx.quadraticCurveTo(0, -1.7 * inv, lLen, 0);
              ctx.quadraticCurveTo(0, 1.7 * inv, -lLen, 0);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          } finally {
            ctx.restore();
          }
        }

        // Ink & jade droplets softly dispersing along outer brush edge
        for (let d = 0; d < 3; d++) {
          const du = 0.3 + d * 0.25;
          const dang = curStart + (curEnd - curStart) * du;
          const dropR = radius + maxHalfW * 0.9 + (4 + d * 3) * (0.5 + t * 0.8);
          const dx = Math.cos(dang) * dropR;
          const dy = Math.sin(dang) * dropR + t * 5;
          ctx.fillStyle = colorWithAlpha('#1e293b', inv * 0.62);
          ctx.beginPath();
          ctx.arc(dx, dy, Math.max(0.8, (2.2 - d * 0.3) * inv), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colorWithAlpha('#5eead4', inv * 0.54);
          ctx.beginPath();
          ctx.arc(dx + 1.8, dy - 1.5, Math.max(0.6, 1.25 * inv), 0, Math.PI * 2);
          ctx.fill();
        }

        const xuanFengAnchor: SlashAnchor = {
          isArc: true,
          curStart,
          curEnd,
          r: radius,
          lineStartX: 0,
          lineEndX: 0,
          lineY: 0,
        };
        renderSlashMotifOrnament(ctx, s, 'xuan_feng_calligraphy', t, inv, xuanFengAnchor, facing);
        continue;
      }

      if (style === 'ink_brush_stroke') {
        // MẶC TIÊN — TAPERED CALLIGRAPHY BRUSH STROKE (giữa dày, hai đầu vuốt nhọn sắc lẹm)
        const isGoldenInk = s.outerColor === '#f59e0b' || s.outerColor === '#fde047';
        const isSealFinisher = s.secondaryColor === '#ef4444';
        const inkCoreFill = isGoldenInk ? '#78350f' : '#12151c';
        const rimGlow = isGoldenInk ? '#fde047' : '#2dd4bf';
        const innerSheen = isGoldenInk ? '#fef9c3' : '#99f6e4';
        const rawSpan = endAngle - startAngle;
        const sweep = Math.min(1, t / 0.22 + 0.34);
        const curStart = startAngle + rawSpan * Math.max(0, t * 0.42 - 0.06);
        const curEnd = startAngle + rawSpan * sweep;
        const maxHalfW = Math.max(4, thickness * (isGoldenInk ? 0.92 : 0.78) * inv);

        // Build tapered crescent ribbon polygon (pointed tip -> thick brush belly -> pointed tail)
        const steps = 20;
        const outerPts: Array<{ x: number; y: number }> = [];
        const innerPts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const ang = curStart + (curEnd - curStart) * u;
          // Asymmetric calligraphy taper: swells cleanly in middle, sharp pointed ends
          const taper = Math.pow(Math.sin(u * Math.PI), 0.78) * (0.72 + 0.42 * Math.sin(u * Math.PI * 0.85));
          const hw = maxHalfW * taper;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          outerPts.push({ x: cosA * (radius + hw), y: sinA * (radius + hw) });
          innerPts.push({ x: cosA * Math.max(6, radius - hw * 0.72), y: sinA * Math.max(6, radius - hw * 0.72) });
        }

        const traceCrescent = (ptsOut: Array<{ x: number; y: number }>, ptsIn: Array<{ x: number; y: number }>) => {
          ctx.beginPath();
          ctx.moveTo(ptsOut[0].x, ptsOut[0].y);
          for (let i = 1; i < ptsOut.length; i++) ctx.lineTo(ptsOut[i].x, ptsOut[i].y);
          for (let i = ptsIn.length - 1; i >= 0; i--) ctx.lineTo(ptsIn[i].x, ptsIn[i].y);
          ctx.closePath();
        };

        // 1. Soft luminous jade / Kim Mặc outer halo silhouette (flat alpha, no shadowBlur)
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = colorWithAlpha(rimGlow, inv * (isGoldenInk ? 0.42 : 0.32));
        traceCrescent(outerPts, innerPts);
        ctx.fill();

        // 2. Crisp tapered Sumi-e black / deep gold ink body
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha(inkCoreFill, inv * 0.92);
        ctx.strokeStyle = colorWithAlpha(rimGlow, inv * 0.94);
        ctx.lineWidth = Math.max(1.4, 2.4 * inv);
        ctx.lineJoin = 'round';
        traceCrescent(outerPts, innerPts);
        ctx.fill();
        ctx.stroke();

        // 3. Fine luminous calligraphic leading edge along the outer crescent curve
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = colorWithAlpha(innerSheen, inv * 0.88);
        ctx.lineWidth = Math.max(1.1, 2.2 * inv);
        ctx.beginPath();
        for (let i = 2; i <= steps - 1; i++) {
          const p = outerPts[i];
          if (i === 2) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // 4. Dry-brush bristle wisps & directional ink droplets flung along swing tangent
        ctx.globalCompositeOperation = 'source-over';
        const swingSign = rawSpan >= 0 ? 1 : -1;
        for (let d = 0; d < 5; d++) {
          const u = 0.25 + d * 0.16;
          const ang = curStart + (curEnd - curStart) * u;
          const tangA = ang + swingSign * Math.PI * 0.5;
          const dist = radius + maxHalfW * 0.6 + (d % 2 === 0 ? 8 : 15) * (0.5 + t * 0.8);
          const dx = Math.cos(ang) * dist + Math.cos(tangA) * (t * 18);
          const dy = Math.sin(ang) * dist + Math.sin(tangA) * (t * 18);
          const rx = Math.max(1.2, (3.6 - d * 0.35) * inv);
          const ry = Math.max(0.7, rx * 0.45);
          ctx.save();
          try {
            ctx.translate(dx, dy);
            ctx.rotate(tangA);
            ctx.fillStyle = colorWithAlpha(d % 2 === 0 ? inkCoreFill : rimGlow, inv * 0.82);
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }

        // 5. Hit 4 Finisher: Transparent rotating ink magic-circle + glowing vermilion "静" (NO solid black box!)
        if (isSealFinisher) {
          const tipIdx = Math.min(steps, Math.round(steps * 0.86));
          const apexPt = outerPts[tipIdx];
          const ringR = (isGoldenInk ? 26 : 22) * (0.85 + 0.3 * inv);
          ctx.save();
          try {
            ctx.translate(apexPt.x, apexPt.y);
            ctx.scale(facing, 1);

            // Rotating dashed calligraphy ink ring
            ctx.save();
            try {
              ctx.rotate(t * 4.5);
              ctx.strokeStyle = colorWithAlpha('#ef4444', inv * 0.9);
              ctx.lineWidth = 2.4;
              ctx.setLineDash([12, 6, 4, 6]);
              ctx.beginPath();
              ctx.arc(0, 0, ringR, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = colorWithAlpha(rimGlow, inv * 0.72);
              ctx.lineWidth = 1.3;
              ctx.setLineDash([6, 8]);
              ctx.beginPath();
              ctx.arc(0, 0, ringR * 0.74, 0, Math.PI * 2);
              ctx.stroke();
            } finally {
              ctx.setLineDash([]);
              ctx.restore();
            }

            // Soft glowing vermilion / golden Kanji "静" (no opaque fill box)
            ctx.font = `900 ${Math.round(ringR * 1.15)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3.2;
            ctx.strokeStyle = colorWithAlpha('#12151c', inv * 0.85);
            ctx.strokeText('静', 0, 1);
            ctx.fillStyle = colorWithAlpha(isGoldenInk ? '#fde047' : '#ef4444', inv);
            ctx.fillText('静', 0, 1);
          } finally {
            ctx.restore();
          }
        }
        continue;
      }

      if (style === 'mirror_fracture' || style === 'void_prism_fracture') {
        // MIRAGE GLASS / VOID PRISM: Sharp spatial fracture lines, jagged dimensional cracks,
        // flying polygonal mirror shard volleys & prismatic reflection flashes (NO sword arcs!)
        const isVoidPrism = style === 'void_prism_fracture' || motif === 'void_prism';
        const crackAngle = (startAngle + endAngle) * 0.35 + ((seed % 5) - 2) * 0.07;
        const reach = radius * (isVoidPrism ? 1.46 : 1.32) * Math.min(1, t / 0.18 + 0.42);
        const halfW = Math.max(4, thickness * (isVoidPrism ? 0.85 : 0.72) * inv);

        ctx.rotate(crackAngle);
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        const fractureAnchor: SlashAnchor = {
          isArc: false,
          curStart: 0,
          curEnd: 0,
          r: reach,
          lineStartX: -8,
          lineEndX: reach + 16,
          lineY: 0,
        };

        // 1. Sharp angular dimensional tear silhouette (sumi-ink void split)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha('#090b10', inv * (isVoidPrism ? 0.68 : 0.56));
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(reach * 0.24, -halfW * 1.15);
        ctx.lineTo(reach * 0.58, -halfW * 0.65);
        ctx.lineTo(reach + 22, 0);
        ctx.lineTo(reach * 0.62, halfW * 1.05);
        ctx.lineTo(reach * 0.22, halfW * 0.72);
        ctx.closePath();
        ctx.fill();

        // Faceted prismatic interior fill
        const primaryFacet = isVoidPrism ? '#f43f5e' : s.outerColor || '#e2e8f0';
        const secondaryFacet = isVoidPrism
          ? '#38bdf8'
          : (s.secondaryColor ?? s.rimColor ?? '#a855f7');
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = inv * 0.42;
        ctx.fillStyle = primaryFacet;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(reach * 0.26, -halfW * 0.82);
        ctx.lineTo(reach + 16, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = secondaryFacet;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(reach + 16, 0);
        ctx.lineTo(reach * 0.58, halfW * 0.78);
        ctx.closePath();
        ctx.fill();

        // 2. Jagged main spatial crack & branching dimensional fissures
        const crackPts: Array<[number, number]> = [];
        const segCount = 6;
        for (let i = 0; i <= segCount; i++) {
          const u = i / segCount;
          const px = -12 + (reach + 30) * u;
          const jag =
            i === 0 || i === segCount
              ? 0
              : (i % 2 === 0 ? 1 : -1) * (5 + ((seed + i * 7) % 5) * 2.1) * (1 - u * 0.25);
          crackPts.push([px, jag]);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = inv * 0.94;
        ctx.strokeStyle = '#090b10';
        ctx.lineWidth = Math.max(2.6, halfW * 0.46);
        ctx.beginPath();
        for (let i = 0; i < crackPts.length; i++) {
          if (i === 0) ctx.moveTo(crackPts[i][0], crackPts[i][1]);
          else ctx.lineTo(crackPts[i][0], crackPts[i][1]);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = secondaryFacet;
        ctx.lineWidth = Math.max(1.8, halfW * 0.28);
        ctx.stroke();

        ctx.strokeStyle = s.coreColor || '#ffffff';
        ctx.lineWidth = Math.max(1.2, halfW * 0.16);
        ctx.stroke();

        // Sharp branching side fissures
        for (let b = 1; b < crackPts.length - 1; b++) {
          const [bx, by] = crackPts[b];
          const side = b % 2 === 0 ? 1 : -1;
          const bLen = (16 + ((seed + b * 11) % 4) * 6) * Math.max(0.45, inv);
          const midX = bx + bLen * 0.55;
          const midY = by + side * bLen * 0.58;
          const endX = bx + bLen * 1.15;
          const endY = by + side * bLen * 0.95;

          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = colorWithAlpha('#090b10', inv * 0.85);
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(midX, midY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = b % 2 === 0 ? primaryFacet : secondaryFacet;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        // 3. Flying polygonal mirror shard volley erupting outward along the fracture
        const shardCount = isVoidPrism ? 7 : 6;
        for (let i = 0; i < shardCount; i++) {
          const u = 0.12 + (i / shardCount) * 0.84;
          const side = i % 2 === 0 ? -1 : 1;
          const burstDist = (8 + ((seed + i * 13) % 5) * 3.5) * (0.45 + t * 1.05);
          const shX = -4 + reach * u + t * (10 + i * 2.5);
          const shY = side * burstDist;
          const shAng = side * (0.28 + ((seed + i) % 3) * 0.14) + t * side * 0.45;
          drawFacetedMirrorShard(
            ctx,
            shX,
            shY,
            (6.5 + (i % 3) * 2.2) * Math.max(0.42, inv),
            (2.8 + (i % 2) * 0.9) * Math.max(0.42, inv),
            shAng,
            '#090b10',
            i % 2 === 0 ? primaryFacet : secondaryFacet,
            i % 2 === 0 ? secondaryFacet : primaryFacet,
            s.coreColor || '#ffffff'
          );
        }

        // 4. Prismatic reflection flashes & straight-line refraction rays
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, inv * 1.18);
        ctx.fillStyle = s.coreColor || '#ffffff';
        drawFourPointStar(ctx, 4, 0, Math.max(2, 13 * inv), Math.max(0.8, 2.4 * inv));
        ctx.fillStyle = secondaryFacet;
        drawFourPointStar(ctx, reach * 0.86, 0, Math.max(2, 11 * inv), Math.max(0.8, 2.1 * inv));

        ctx.strokeStyle = s.rimColor ?? secondaryFacet;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(reach * 0.42 - 14, -14);
        ctx.lineTo(reach * 0.42 + 14, 14);
        ctx.moveTo(reach * 0.72 + 12, -12);
        ctx.lineTo(reach * 0.72 - 12, 12);
        ctx.stroke();

        if (motif) {
          renderSlashMotifOrnament(ctx, s, motif, t, inv, fractureAnchor);
        }
        continue;
      }

      if (style === 'spear_thrust') {
        // RAIJIN SPEAR: Sumi-ink outer smear + sonic spear lance cone + Mach shock ring!
        const thrustAngle = (startAngle + endAngle) * 0.5;
        const reach = radius * 1.48 * Math.min(1, t / 0.22 + 0.35);
        const w = Math.max(3, thickness * 0.72 * inv);
        ctx.rotate(thrustAngle);

        const thrustAnchor: SlashAnchor = {
          isArc: false,
          curStart: 0,
          curEnd: 0,
          r: reach,
          lineStartX: 0,
          lineEndX: reach + 20,
          lineY: 0,
        };

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha('#090b10', inv * 0.54);
        ctx.beginPath();
        ctx.moveTo(-20, -w * 0.65);
        ctx.lineTo(reach * 0.55, -w * 1.24);
        ctx.lineTo(reach + 30, 0);
        ctx.lineTo(reach * 0.55, w * 1.24);
        ctx.lineTo(-20, w * 0.65);
        ctx.closePath();
        ctx.fill();
        drawSumiEdgeSplatter(ctx, thrustAnchor, seed, inv, s.outerColor);

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = inv * 0.65;
        ctx.strokeStyle = s.secondaryColor ?? s.outerColor;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(reach * 0.32, 0, 7, w * 1.55, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = inv * 0.52;
        ctx.fillStyle = s.outerColor;
        ctx.beginPath();
        ctx.moveTo(-16, -w * 0.45);
        ctx.lineTo(reach * 0.55, -w);
        ctx.lineTo(reach + 26, 0);
        ctx.lineTo(reach * 0.55, w);
        ctx.lineTo(-16, w * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = Math.min(1, inv * 1.35);
        ctx.fillStyle = s.coreColor;
        ctx.beginPath();
        ctx.moveTo(-8, -w * 0.22);
        ctx.lineTo(reach + 32, 0);
        ctx.lineTo(-8, w * 0.22);
        ctx.closePath();
        ctx.fill();

        if (motif) {
          renderSlashMotifOrnament(ctx, s, motif, t, inv, thrustAnchor);
        }
        continue;
      }

      if (style === 'spear_flurry') {
        // RAIJIN HUNDRED-SPEAR FLURRY: Ink-edged fan of 5 rapid piercing needles
        const angles = [-0.28, -0.14, 0, 0.14, 0.26];
        const flurryAnchor: SlashAnchor = {
          isArc: false,
          curStart: 0,
          curEnd: 0,
          r: radius,
          lineStartX: 12,
          lineEndX: radius * 1.25,
          lineY: 0,
        };

        ctx.globalCompositeOperation = 'source-over';
        drawSumiEdgeSplatter(ctx, flurryAnchor, seed, inv, s.outerColor);

        for (let i = 0; i < angles.length; i++) {
          const len = radius * (1.18 + ((i * 37) % 3) * 0.16);
          const w = Math.max(2, thickness * 0.38 * inv);
          ctx.save();
          try {
            ctx.rotate(angles[i]);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = colorWithAlpha('#090b10', inv * 0.5);
            ctx.beginPath();
            ctx.moveTo(-4, -w * 1.35);
            ctx.lineTo(len + 4, 0);
            ctx.lineTo(-4, w * 1.35);
            ctx.closePath();
            ctx.fill();

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = inv * (i % 2 === 0 ? 0.85 : 0.62);
            ctx.fillStyle = i % 2 === 1 && s.secondaryColor ? s.secondaryColor : s.outerColor;
            ctx.beginPath();
            ctx.moveTo(0, -w);
            ctx.lineTo(len, 0);
            ctx.lineTo(0, w);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = s.coreColor || '#ffffff';
            ctx.beginPath();
            ctx.moveTo(8, -w * 0.4);
            ctx.lineTo(len + 12, 0);
            ctx.lineTo(8, w * 0.4);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        if (motif) {
          renderSlashMotifOrnament(ctx, s, motif, t, inv, flurryAnchor);
        }
        continue;
      }

      if (style === 'twin_x') {
        // ZERO TWIN DAGGERS: Dual intersecting X-scissor ink & razor crescents
        const len = radius * 1.18;
        const hw = Math.max(2.5, thickness * 0.52 * inv);
        const angles = [-0.52, 0.52];
        const twinAnchor: SlashAnchor = {
          isArc: false,
          curStart: 0,
          curEnd: 0,
          r: radius,
          lineStartX: 28 - radius * 0.55,
          lineEndX: 28 + radius * 0.55,
          lineY: 0,
        };

        ctx.globalCompositeOperation = 'source-over';
        drawSumiEdgeSplatter(ctx, twinAnchor, seed, inv, s.outerColor);

        for (let i = 0; i < angles.length; i++) {
          ctx.save();
          try {
            ctx.translate(28, 0);
            ctx.rotate(angles[i]);

            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = colorWithAlpha('#090b10', inv * 0.56);
            ctx.beginPath();
            ctx.moveTo(-len * 0.8, 0);
            ctx.quadraticCurveTo(0, -hw * 2.2, len * 0.8, 0);
            ctx.quadraticCurveTo(0, hw * 2.2, -len * 0.8, 0);
            ctx.closePath();
            ctx.fill();

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = inv * 0.55;
            ctx.fillStyle = i === 1 && s.secondaryColor ? s.secondaryColor : s.outerColor;
            ctx.beginPath();
            ctx.moveTo(-len * 0.75, 0);
            ctx.quadraticCurveTo(0, -hw * 1.8, len * 0.75, 0);
            ctx.quadraticCurveTo(0, hw * 1.8, -len * 0.75, 0);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = Math.min(1, inv * 1.35);
            ctx.fillStyle = s.coreColor || '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-len * 0.64, 0);
            ctx.quadraticCurveTo(0, -hw * 0.65, len * 0.64, 0);
            ctx.quadraticCurveTo(0, hw * 0.65, -len * 0.64, 0);
            ctx.closePath();
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        if (motif) {
          renderSlashMotifOrnament(ctx, s, motif, t, inv, twinAnchor);
        }
        continue;
      }

      if (style === 'iaido_line') {
        // KURO IAIDO KATANA: Sumi-ink brushstroke severing thread + tsuba star glint
        const len = radius * 1.55;
        const hw = Math.max(1.8, thickness * 0.44 * inv);
        ctx.rotate((startAngle + endAngle) * 0.18);

        const iaidoAnchor: SlashAnchor = {
          isArc: false,
          curStart: 0,
          curEnd: 0,
          r: len,
          lineStartX: -10,
          lineEndX: len + 6,
          lineY: 0,
        };

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorWithAlpha('#090b10', inv * 0.6);
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.quadraticCurveTo(len * 0.45, -hw * 2.6, len + 8, 0);
        ctx.quadraticCurveTo(len * 0.45, hw * 2.6, -30, 0);
        ctx.closePath();
        ctx.fill();
        drawSumiEdgeSplatter(ctx, iaidoAnchor, seed, inv, s.outerColor);

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = inv * 0.58;
        ctx.fillStyle = s.outerColor;
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.quadraticCurveTo(len * 0.45, -hw * 2.1, len, 0);
        ctx.quadraticCurveTo(len * 0.45, hw * 2.1, -26, 0);
        ctx.closePath();
        ctx.fill();

        if (s.secondaryColor) {
          ctx.globalAlpha = inv * 0.65;
          ctx.strokeStyle = s.secondaryColor;
          ctx.lineWidth = Math.max(1.4, hw * 0.75);
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(len + 6, 0);
          ctx.stroke();
        }

        ctx.globalAlpha = Math.min(1, inv * 1.4);
        ctx.fillStyle = s.coreColor || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(len + 14, 0);
        ctx.lineTo(-18, 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = s.coreColor || '#ffffff';
        for (const ga of [0, Math.PI * 0.5]) {
          ctx.save();
          try {
            ctx.translate(-6, 0);
            ctx.rotate(ga);
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.max(0.5, 16 * inv), Math.max(0.5, 2.2 * inv), 0, 0, Math.PI * 2);
            ctx.fill();
          } finally {
            ctx.restore();
          }
        }
        if (motif) {
          renderSlashMotifOrnament(ctx, s, motif, t, inv, iaidoAnchor);
        }
        continue;
      }

      // Dynamic anime smear progression for curved sweeps ('arc' and 'heavy_cleave')
      const headProgress = Math.min(1, t / 0.34);
      const headEased = 1 - Math.pow(1 - headProgress, 3);
      const tailProgress = Math.max(0, (t - 0.14) / 0.86);
      const tailEased = tailProgress * tailProgress;

      const span = endAngle - startAngle;
      const curStart = startAngle + span * tailEased;
      const curEnd = startAngle + span * headEased;
      if (Math.abs(curEnd - curStart) < 0.04) {
        continue;
      }

      const ccw = span < 0;
      const thickMult = style === 'heavy_cleave' ? 1.62 : 1.0;
      const innerRatio = style === 'heavy_cleave' ? 0.18 : 0.36;
      const arcAnchor: SlashAnchor = {
        isArc: true,
        curStart,
        curEnd,
        r: radius + thickness * 0.28,
        lineStartX: 0,
        lineEndX: 0,
        lineY: 0,
      };

      // Sumi-e dark ink outer brushstroke outline + edge splatter under-pass
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = colorWithAlpha('#090b10', inv * (style === 'heavy_cleave' ? 0.62 : 0.48));
      ctx.beginPath();
      ctx.arc(0, 0, radius + thickness * 0.68 * thickMult, curStart, curEnd, ccw);
      ctx.arc(0, 0, Math.max(8, radius * Math.max(0.14, innerRatio - 0.04)), curEnd, curStart, !ccw);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = colorWithAlpha('#090b10', inv * 0.72);
      ctx.lineWidth = Math.max(2.2, thickness * 0.26 * thickMult * inv);
      ctx.beginPath();
      ctx.arc(0, 0, radius + thickness * 0.68 * thickMult, curStart, curEnd, ccw);
      ctx.stroke();

      drawSumiEdgeSplatter(ctx, arcAnchor, seed, inv, s.outerColor);

      ctx.globalCompositeOperation = 'lighter';

      // Soft outer additive bloom halo
      ctx.globalAlpha = inv * (style === 'heavy_cleave' ? 0.42 : 0.28);
      ctx.strokeStyle = s.outerColor;
      ctx.lineWidth = Math.max(4, thickness * 1.65 * thickMult * inv);
      ctx.beginPath();
      ctx.arc(0, 0, radius + thickness * 0.25, curStart, curEnd, ccw);
      ctx.stroke();

      // Wide translucent anime fan wedge behind the blade sweep
      ctx.globalAlpha = inv * (style === 'heavy_cleave' ? 0.65 : 0.46);
      ctx.fillStyle = s.outerColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius + thickness * 0.55 * thickMult, curStart, curEnd, ccw);
      ctx.arc(0, 0, Math.max(10, radius * innerRatio), curEnd, curStart, !ccw);
      ctx.closePath();
      ctx.fill();

      // Crisp mid-arc secondary color accent band when provided
      if (s.secondaryColor) {
        ctx.globalAlpha = inv * (style === 'heavy_cleave' ? 0.72 : 0.62);
        ctx.strokeStyle = s.secondaryColor;
        ctx.lineWidth = Math.max(1.8, thickness * 0.45 * thickMult * inv);
        ctx.beginPath();
        ctx.arc(0, 0, radius + thickness * 0.12, curStart, curEnd, ccw);
        ctx.stroke();
      }

      // Primary sharp outer arc edge (uses skin rim/secondary color instead of hardcoded gold)
      const rimCol = s.rimColor ?? s.secondaryColor ?? s.outerColor;
      ctx.globalAlpha = Math.min(1, inv * 1.25);
      ctx.strokeStyle = style === 'heavy_cleave' ? rimCol : s.outerColor;
      ctx.lineWidth = Math.max(2, thickness * 0.72 * thickMult * inv);
      ctx.beginPath();
      ctx.arc(0, 0, radius + thickness * 0.3, curStart, curEnd, ccw);
      ctx.stroke();

      // Crisp pure-white hot blade core line
      ctx.globalAlpha = Math.min(1, inv * 1.35);
      ctx.strokeStyle = s.coreColor;
      ctx.lineWidth = Math.max(1.8, thickness * 0.34 * thickMult * inv);
      ctx.beginPath();
      ctx.arc(0, 0, radius + thickness * 0.32, curStart, curEnd, ccw);
      ctx.stroke();

      if (motif) {
        renderSlashMotifOrnament(ctx, s, motif, t, inv, arcAnchor, facing);
      }
    } finally {
      ctx.restore();
    }
  }
}

