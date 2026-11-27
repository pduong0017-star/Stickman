import type { SkinId } from '../types';
import { colorWithAlpha, finiteOr } from './inkStyle';
import type { SkeletonJoints, StickmanRenderOptions } from './types';

function drawBeveledBlade(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tipX: number,
  tipY: number,
  halfWidthBase: number,
  halfWidthMid: number,
  outlineColor: string,
  darkHalfColor: string,
  lightHalfColor: string,
  edgeRimColor: string
): void {
  const mx = (x0 + x1) * 0.5;
  const my = (y0 + y1) * 0.5;

  // 1. Crisp sumi-ink outer blade silhouette
  ctx.fillStyle = darkHalfColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0 - halfWidthBase);
  ctx.quadraticCurveTo(mx, my - halfWidthMid, tipX, tipY);
  ctx.quadraticCurveTo(mx, my + halfWidthMid, x0, y0 + halfWidthBase);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Upper lit metallic bevel half
  ctx.fillStyle = lightHalfColor;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - halfWidthBase * 0.85);
  ctx.quadraticCurveTo(mx, my - halfWidthMid * 0.85, tipX - 1, tipY);
  ctx.quadraticCurveTo(mx, my + 0.3, x0, y0 + 0.3);
  ctx.closePath();
  ctx.fill();

  // 3. Razor edge rim highlight
  ctx.strokeStyle = edgeRimColor;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + 2, y0 - halfWidthBase * 0.72);
  ctx.quadraticCurveTo(mx, my - halfWidthMid * 0.72, tipX - 2, tipY);
  ctx.stroke();
}

export function renderOffhandDagger(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  weapon: 'twin_daggers' | 'void_sabers',
  skinId?: SkinId,
  whiteFlash = false,
  inkAccent?: string
): void {
  const hx = finiteOr(joints.handL.x, 0);
  const hy = finiteOr(joints.handL.y, 0);
  const angle = finiteOr(joints.weaponAngle, 0) + 0.55;

  ctx.save();
  try {
    ctx.translate(hx, hy);
    ctx.rotate(angle);

    const len = weapon === 'void_sabers' ? 56 : 36;
    if (whiteFlash) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      return;
    }

    const isBlood = skinId === 'blood_moon';
    const isAstral = skinId === 'astral_phantom';
    const outerCol = inkAccent
      ? inkAccent
      : isBlood
        ? '#f43f5e'
        : isAstral
          ? '#818cf8'
          : weapon === 'void_sabers'
            ? '#10b981'
            : '#34d399';
    const darkCol = isBlood ? '#4c0519' : isAstral ? '#1e1b4b' : '#064e3b';
    const edgeCol = isBlood ? '#ffe4e6' : isAstral ? '#fde047' : '#ecfdf5';

    // Subtle energy aura on void_sabers
    if (weapon === 'void_sabers') {
      ctx.strokeStyle = colorWithAlpha(outerCol, 0.36);
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(len + 2, -2);
      ctx.stroke();
    }

    // Wrapped hilt + guard
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();

    ctx.strokeStyle = outerCol;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(1, -5.5);
    ctx.lineTo(3, 5.5);
    ctx.stroke();

    // Tapered ink-washed dagger/saber blade
    drawBeveledBlade(
      ctx,
      3,
      0,
      len * 0.72,
      -1.2,
      len,
      -2.2,
      weapon === 'void_sabers' ? 4.2 : 3.2,
      weapon === 'void_sabers' ? 3.5 : 2.6,
      '#0b0c10',
      darkCol,
      outerCol,
      edgeCol
    );
  } finally {
    ctx.restore();
  }
}

export function renderOffhandMirrorShards(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  weapon: 'mirror_shards' | 'void_prism_scythe',
  time: number,
  whiteFlash = false,
  skinId?: SkinId,
  accentOverride?: string
): void {
  const hx = finiteOr(joints.handL.x, 0);
  const hy = finiteOr(joints.handL.y, 0);
  const angle = finiteOr(joints.weaponAngle, 0) * 0.45 + 0.35;
  const safeTime = finiteOr(time, 0);
  const isVoidShatterer = skinId === 'void_shatterer';

  ctx.save();
  try {
    ctx.translate(hx, hy);
    ctx.rotate(angle);

    if (whiteFlash) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(0, -5);
      ctx.lineTo(-9, 0);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (isVoidShatterer) {
      const primary = accentOverride || '#f43f5e';
      const cyan = '#38bdf8';

      // Held obsidian-crimson jagged mirror-claw shard on off-hand
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#07040a';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, 1);
      ctx.lineTo(4, -5.5);
      ctx.lineTo(24, -2);
      ctx.lineTo(15, 3.5);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crimson bevel facet
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(2, -4.2);
      ctx.lineTo(22, -2);
      ctx.lineTo(12, 0.4);
      ctx.lineTo(-6, 0.5);
      ctx.closePath();
      ctx.fill();

      // Cyan razor edge highlight
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4, -4.5);
      ctx.lineTo(23, -2);
      ctx.stroke();

      // Orbiting cyan-obsidian sliver
      const orbitA = safeTime * 5.2 + 1.1;
      const ox = 8 + Math.cos(orbitA) * 11;
      const oy = Math.sin(orbitA) * 9;
      ctx.save();
      try {
        ctx.translate(ox, oy);
        ctx.rotate(orbitA + 0.4);
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#07040a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(-7, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    } else {
      const accent = accentOverride || '#c084fc';
      const shardCount = weapon === 'void_prism_scythe' ? 2 : 2;
      for (let i = 0; i < shardCount; i++) {
        const a = safeTime * 4.4 + i * Math.PI + 0.6;
        const sx = 6 + Math.cos(a) * 10;
        const sy = Math.sin(a) * 8.5;
        ctx.save();
        try {
          ctx.translate(sx, sy);
          ctx.rotate(a * 0.5 + i * 0.8);
          ctx.fillStyle = i === 0 ? '#f1f5f9' : accent;
          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 1.8;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(11, 0);
          ctx.lineTo(0, -4.2);
          ctx.lineTo(-8, 0);
          ctx.lineTo(0, 4.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#312e81';
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(0, 3.6);
          ctx.lineTo(-7, 0);
          ctx.closePath();
          ctx.fill();
        } finally {
          ctx.restore();
        }
      }
    }
  } finally {
    ctx.restore();
  }
}

export function renderOffhandChronoHand(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  weapon: 'chrono_hand' | 'chrono_twin_hands',
  time: number,
  whiteFlash = false,
  skinId?: SkinId,
  accentOverride?: string
): void {
  const hx = finiteOr(joints.handL.x, 0);
  const hy = finiteOr(joints.handL.y, 0);
  const angle = finiteOr(joints.weaponAngle, 0) * 0.6 + 0.45;
  const safeTime = finiteOr(time, 0);
  const isSovereign = skinId === 'chrono_sovereign';
  const isTwin = weapon === 'chrono_twin_hands';

  ctx.save();
  try {
    ctx.translate(hx, hy);
    ctx.rotate(angle);

    if (whiteFlash) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isTwin ? 3.8 : 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(isTwin ? 8 : 4, 0, isTwin ? (isSovereign ? 16 : 13.5) : (isSovereign ? 10 : 8), 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    const outline = isSovereign ? '#0a0704' : '#081214';
    const primary = accentOverride || (isSovereign ? '#f59e0b' : '#2dd4bf');
    const secondary = isSovereign ? '#38bdf8' : '#f59e0b';
    const rim = isSovereign ? '#fef08a' : '#99f6e4';
    const darkHalf = isSovereign ? '#1c1917' : '#042f2e';

    if (isTwin) {
      // Offhand Awakened Secondary Chrono Chakram / Celestial Astrolabe Ring
      const ringR = isSovereign ? 16.5 : 14;
      ctx.save();
      try {
        ctx.translate(8, 0);
        // Subtle aura halo (flat alpha halo)
        ctx.strokeStyle = colorWithAlpha(secondary, 0.34);
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Counter-rotating bladed outer gear ring
        ctx.save();
        try {
          ctx.rotate(-safeTime * (isSovereign ? 4.4 : 3.4));
          ctx.strokeStyle = outline;
          ctx.lineWidth = 4.6;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = isSovereign ? primary : secondary;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // 8 razor-cog fins
          ctx.strokeStyle = rim;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            ctx.moveTo(Math.cos(a) * (ringR - 1.5), Math.sin(a) * (ringR - 1.5));
            ctx.lineTo(Math.cos(a + 0.16) * (ringR + 4.2), Math.sin(a + 0.16) * (ringR + 4.2));
          }
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // Inner dial ring + core jewel
        ctx.strokeStyle = colorWithAlpha(primary, 0.85);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 0.56, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isSovereign ? secondary : primary;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    } else {
      // Offhand Floating Wrist Astrolabe / Pocket Chronometer Dial
      const dialR = isSovereign ? 11.5 : 8.5;
      ctx.save();
      try {
        ctx.translate(4, 0);
        // Sumi-ink outer bezel
        ctx.fillStyle = colorWithAlpha(darkHalf, 0.88);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, dialR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = primary;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        if (isSovereign) {
          // Outer rotating gear teeth
          ctx.save();
          try {
            ctx.rotate(-safeTime * 1.8);
            ctx.strokeStyle = secondary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const a = (i * Math.PI * 2) / 8;
              ctx.moveTo(Math.cos(a) * (dialR - 1), Math.sin(a) * (dialR - 1));
              ctx.lineTo(Math.cos(a) * (dialR + 3.2), Math.sin(a) * (dialR + 3.2));
            }
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        } else {
          // 4 cardinal ticks
          ctx.strokeStyle = rim;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            ctx.moveTo(Math.cos(a) * (dialR - 3), Math.sin(a) * (dialR - 3));
            ctx.lineTo(Math.cos(a) * (dialR - 0.5), Math.sin(a) * (dialR - 0.5));
          }
          ctx.stroke();
        }

        // Sweeping miniature clock hands
        const minAng = safeTime * 3.8;
        const hrAng = -safeTime * 0.9;
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(minAng) * (dialR * 0.78), Math.sin(minAng) * (dialR * 0.78));
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(hrAng) * (dialR * 0.5), Math.sin(hrAng) * (dialR * 0.5));
        ctx.stroke();

        ctx.fillStyle = secondary;
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }
    }
  } finally {
    ctx.restore();
  }
}

export function renderWeapon(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  weapon: NonNullable<StickmanRenderOptions['weapon']>,
  time: number,
  whiteFlash: boolean,
  skinId?: SkinId,
  accentOverride?: string,
  vx = 0,
  vy = 0
): void {
  const hx = finiteOr(joints.handR.x, 0);
  const hy = finiteOr(joints.handR.y, 0);
  const angle = finiteOr(joints.weaponAngle, 0);
  const safeTime = finiteOr(time, 0);
  const safeVx = finiteOr(vx, 0);
  const safeVy = finiteOr(vy, 0);

  ctx.save();
  try {
    ctx.translate(hx, hy);
    ctx.rotate(angle);

    if (whiteFlash) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(54, 0);
      ctx.stroke();
      return;
    }

    switch (weapon) {
      case 'katana': {
        const isEclipse = skinId === 'eclipse_ronin';
        const wrapCol = isEclipse ? '#dc2626' : '#f8fafc';
        const tsubaCol = isEclipse ? '#fb923c' : '#facc15';
        const darkSpine = isEclipse ? '#18181b' : '#475569';
        const lightSteel = isEclipse ? '#dc2626' : '#f8fafc';
        const edgeRim = isEclipse ? '#fde047' : '#ffffff';

        // Hilt + diamond wrap
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-17, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();
        ctx.strokeStyle = wrapCol;
        ctx.lineWidth = 3;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ornate tsuba guard
        ctx.fillStyle = tsubaCol;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 1.6;
        ctx.fillRect(0.5, -7, 3.5, 14);
        ctx.strokeRect(0.5, -7, 3.5, 14);

        if (isEclipse) {
          ctx.strokeStyle = colorWithAlpha('#f97316', 0.38);
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.quadraticCurveTo(36, -2, 66, -4.5);
          ctx.stroke();
        }

        // Curved tapered ink-wash katana blade
        ctx.fillStyle = lightSteel;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(4, -2.8);
        ctx.quadraticCurveTo(36, -4.5, 66, -4.5);
        ctx.lineTo(61, 0.2);
        ctx.quadraticCurveTo(34, 0.8, 4, 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dark sumi-ink mune (back spine) for classic anime katana contrast
        ctx.strokeStyle = darkSpine;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(5, 1.3);
        ctx.quadraticCurveTo(34, 0.1, 60, -0.4);
        ctx.stroke();

        // Razor hamon rim
        ctx.strokeStyle = edgeRim;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(6, -2.1);
        ctx.quadraticCurveTo(36, -3.7, 64, -4);
        ctx.stroke();
        break;
      }
      case 'chrono_hand':
      case 'chrono_twin_hands': {
        const isTwin = weapon === 'chrono_twin_hands';
        const isSovereign = skinId === 'chrono_sovereign';
        const cx = isTwin ? 20 : 17;
        const cy = 0;

        if (isSovereign) {
          // Thần Thời Gian (chrono_sovereign): Thiên Cầu Hỗn Thiên Nghi (Celestial Astrolabe)
          const primary = accentOverride || '#f59e0b';
          const azure = '#38bdf8';
          const rim = '#fef9c3';
          const outline = '#0a0704';
          const outerR = isTwin ? 26 : 22;

          ctx.save();
          try {
            ctx.translate(cx, cy);

            // Soft imperial golden aura ring (flat alpha halo)
            ctx.strokeStyle = colorWithAlpha(primary, 0.3);
            ctx.lineWidth = 8.5;
            ctx.beginPath();
            ctx.arc(0, 0, outerR, 0, Math.PI * 2);
            ctx.stroke();

            // Outer Celestial Meridian Ring with 12 Roman ticks & 8 bladed sun-fins
            ctx.save();
            try {
              ctx.rotate(safeTime * (isTwin ? 3.8 : 2.6));
              ctx.strokeStyle = outline;
              ctx.lineWidth = 6.0;
              ctx.beginPath();
              ctx.arc(0, 0, outerR, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = primary;
              ctx.lineWidth = 3.0;
              ctx.stroke();

              ctx.strokeStyle = rim;
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.arc(0, 0, outerR - 1.2, 0, Math.PI * 2);
              ctx.stroke();

              // 8 swept celestial blade fins
              for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI * 2) / 8;
                const aTip = a + 0.24;
                ctx.fillStyle = i % 2 === 0 ? primary : azure;
                ctx.strokeStyle = outline;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (outerR - 1), Math.sin(a) * (outerR - 1));
                ctx.lineTo(Math.cos(aTip) * (outerR + 6.5), Math.sin(aTip) * (outerR + 6.5));
                ctx.lineTo(Math.cos(a + 0.34) * (outerR - 0.5), Math.sin(a + 0.34) * (outerR - 0.5));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              }
            } finally {
              ctx.restore();
            }

            // Tilted Elliptical Astrolabe Orbit Band (azure starlight)
            ctx.save();
            try {
              ctx.rotate(-safeTime * 2.1);
              ctx.strokeStyle = outline;
              ctx.lineWidth = 3.2;
              ctx.beginPath();
              ctx.ellipse(0, 0, outerR * 0.86, outerR * 0.38, 0.4, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = azure;
              ctx.lineWidth = 1.6;
              ctx.stroke();
            } finally {
              ctx.restore();
            }

            // Awakened: Counter-rotating Inner Sovereign Gear Ring
            if (isTwin) {
              ctx.save();
              try {
                ctx.rotate(-safeTime * 4.6);
                const innerR = outerR * 0.58;
                ctx.strokeStyle = outline;
                ctx.lineWidth = 4.0;
                ctx.beginPath();
                ctx.arc(0, 0, innerR, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = azure;
                ctx.lineWidth = 2.0;
                ctx.stroke();

                ctx.strokeStyle = rim;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                  const a = (i * Math.PI * 2) / 6;
                  ctx.moveTo(Math.cos(a) * (innerR - 2), Math.sin(a) * (innerR - 2));
                  ctx.lineTo(Math.cos(a) * (innerR + 3.2), Math.sin(a) * (innerR + 3.2));
                }
                ctx.stroke();
              } finally {
                ctx.restore();
              }
            }

            // Central Sun-Moon Clock Axis Jewel + miniature hands
            ctx.fillStyle = '#0a0704';
            ctx.strokeStyle = primary;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = azure;
            ctx.beginPath();
            ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = rim;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            const hA = safeTime * 1.4;
            const mA = safeTime * 5.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(hA) * (outerR * 0.42), Math.sin(hA) * (outerR * 0.42));
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(mA) * (outerR * 0.68), Math.sin(mA) * (outerR * 0.68));
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        } else {
          // Chrono Default: Luân Bàn Thời Gian (Chrono Chakram) -> Awakened: Song Luân Bàn
          const primary = accentOverride || '#2dd4bf';
          const brass = '#f59e0b';
          const rim = '#99f6e4';
          const outline = '#081214';
          const outerR = isTwin ? 22 : 18.5;

          ctx.save();
          try {
            ctx.translate(cx, cy);

            // Soft teal temporal wake ring (flat alpha halo)
            ctx.strokeStyle = colorWithAlpha(primary, 0.28);
            ctx.lineWidth = 7.2;
            ctx.beginPath();
            ctx.arc(0, 0, outerR, 0, Math.PI * 2);
            ctx.stroke();

            // Outer Ink-Wash Bladed Chrono Chakram
            ctx.save();
            try {
              ctx.rotate(safeTime * (isTwin ? 4.2 : 2.8));
              ctx.strokeStyle = outline;
              ctx.lineWidth = 5.4;
              ctx.beginPath();
              ctx.arc(0, 0, outerR, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = primary;
              ctx.lineWidth = 2.6;
              ctx.stroke();

              // 12 clock ticks around the rim
              ctx.strokeStyle = brass;
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              for (let i = 0; i < 12; i++) {
                const a = (i * Math.PI * 2) / 12;
                const r0 = i % 3 === 0 ? outerR - 4.2 : outerR - 2.4;
                ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
                ctx.lineTo(Math.cos(a) * (outerR + 0.6), Math.sin(a) * (outerR + 0.6));
              }
              ctx.stroke();

              // 6 swept razor-cog blades on outer circumference
              for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI * 2) / 6;
                const aTip = a + 0.26;
                ctx.fillStyle = i % 2 === 0 ? primary : brass;
                ctx.strokeStyle = outline;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (outerR - 0.8), Math.sin(a) * (outerR - 0.8));
                ctx.lineTo(Math.cos(aTip) * (outerR + 5.4), Math.sin(aTip) * (outerR + 5.4));
                ctx.lineTo(Math.cos(a + 0.36) * (outerR - 0.4), Math.sin(a + 0.36) * (outerR - 0.4));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              }
            } finally {
              ctx.restore();
            }

            // Awakened: Counter-rotating Inner Brass Chakram (Song Luân Bàn)
            if (isTwin) {
              ctx.save();
              try {
                ctx.rotate(-safeTime * 4.8);
                const innerR = outerR * 0.56;
                ctx.strokeStyle = outline;
                ctx.lineWidth = 3.8;
                ctx.beginPath();
                ctx.arc(0, 0, innerR, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = brass;
                ctx.lineWidth = 1.9;
                ctx.stroke();

                ctx.strokeStyle = rim;
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                  const a = (i * Math.PI * 2) / 6;
                  ctx.moveTo(Math.cos(a) * (innerR - 1.5), Math.sin(a) * (innerR - 1.5));
                  ctx.lineTo(Math.cos(a) * (innerR + 3.0), Math.sin(a) * (innerR + 3.0));
                }
                ctx.stroke();
              } finally {
                ctx.restore();
              }
            }

            // Center Chrono Dial Hub + sweeping clock hands
            ctx.fillStyle = '#042f2e';
            ctx.strokeStyle = brass;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = rim;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            const hA = safeTime * 1.6;
            const mA = safeTime * 6.0;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(hA) * (outerR * 0.4), Math.sin(hA) * (outerR * 0.4));
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(mA) * (outerR * 0.65), Math.sin(mA) * (outerR * 0.65));
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        }
        break;
      }
      case 'ink_brush':
      case 'golden_ink_brush': {
        if (skinId === 'xuan_feng_sage') {
          // Ngọc Tiêu Tiên Bút: Thân ngọc đa đoạn khớp kim nhạt (#fde68a), vòng linh khí xoay quanh cổ bút, tua lụa đa đoạn theo vận tốc (vx, vy), đầu bút lõi trắng viền thanh ngọc
          const isAwakenedBrush = weapon === 'golden_ink_brush';
          const outline = '#1e293b';
          const jadeShaft = isAwakenedBrush ? '#f0fdfa' : '#f8fafc';
          const jadeMid = isAwakenedBrush ? '#99f6e4' : '#cbd5e1';
          const jadeVein = '#5eead4';
          const jadeSilk = isAwakenedBrush ? '#5eead4' : '#2dd4bf';
          const paleGold = '#fde68a';
          const paleGoldShadow = '#d97706';
          const petalKnot = '#fda4af';
          const cinnabar = '#e11d48';
          const shaftLen = isAwakenedBrush ? 76 : 68;
          const bristleLen = isAwakenedBrush ? 26 : 21;

          // 1. Soft Moonlight White – Jade Teal – Pale Gold ambient halo behind brush head (flat alpha, zero shadowBlur)
          ctx.strokeStyle = colorWithAlpha(jadeVein, isAwakenedBrush ? 0.34 : 0.22);
          ctx.lineWidth = isAwakenedBrush ? 14.5 : 10.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(shaftLen - 10, 0);
          ctx.lineTo(shaftLen + bristleLen + 3, 0);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha(paleGold, isAwakenedBrush ? 0.22 : 0.14);
          ctx.lineWidth = isAwakenedBrush ? 9.5 : 7.0;
          ctx.beginPath();
          ctx.moveTo(shaftLen - 4, 0);
          ctx.lineTo(shaftLen + bristleLen + 1, 0);
          ctx.stroke();

          // 2. Long velocity-driven multi-segment flowing silk tassel trailing from pommel (-16)
          const cosA = Math.cos(-angle);
          const sinA = Math.sin(-angle);
          const localVx = safeVx * cosA - safeVy * sinA;
          const localVy = safeVx * sinA + safeVy * cosA;
          const dragX = Math.max(-22, Math.min(18, -localVx * 0.036));
          const dragY = Math.max(-18, Math.min(18, -localVy * 0.036));

          const tPts: Array<{ x: number; y: number }> = [{ x: -16, y: 0 }];
          for (let seg = 1; seg <= 4; seg++) {
            const frac = seg / 4;
            const wave = Math.sin(safeTime * 6.8 - seg * 1.15) * (2.6 + seg * 1.15);
            const sx = -16 - seg * 8.2 + dragX * frac * 0.72;
            const sy = seg * 2.4 + dragY * frac * 0.85 + wave;
            tPts.push({ x: sx, y: sy });
          }

          // Primary Jade-Teal flowing silk ribbon (4 linked segments)
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = outline;
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          ctx.moveTo(tPts[0].x, tPts[0].y);
          for (let seg = 1; seg < tPts.length; seg++) {
            const prev = tPts[seg - 1];
            const cur = tPts[seg];
            ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) * 0.5, (prev.y + cur.y) * 0.5);
          }
          ctx.lineTo(tPts[tPts.length - 1].x, tPts[tPts.length - 1].y);
          ctx.stroke();

          ctx.strokeStyle = jadeSilk;
          ctx.lineWidth = 2.3;
          ctx.stroke();

          // Secondary Moonlight White & Pale Gold silk strands weaving around primary tassel
          ctx.strokeStyle = colorWithAlpha('#f0fdfa', 0.88);
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.moveTo(-16, 0.5);
          for (let seg = 1; seg < tPts.length; seg++) {
            const p = tPts[seg];
            const w2 = Math.cos(safeTime * 5.6 - seg * 1.3) * (1.8 + seg * 0.6);
            ctx.lineTo(p.x + 1.2, p.y - 1.6 + w2 * 0.45);
          }
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha(paleGold, 0.82);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(-16, -0.5);
          for (let seg = 1; seg <= 3; seg++) {
            const p = tPts[seg];
            ctx.lineTo(p.x + 2.0, p.y + 1.2 - Math.sin(safeTime * 6.0 - seg) * 1.2);
          }
          ctx.stroke();

          // Pommel pale-gold cap + peach blossom knot + cinnabar charm
          ctx.fillStyle = paleGold;
          ctx.strokeStyle = outline;
          ctx.lineWidth = 1.3;
          ctx.fillRect(-16.5, -3.5, 4.2, 7.0);
          ctx.strokeRect(-16.5, -3.5, 4.2, 7.0);

          ctx.fillStyle = petalKnot;
          ctx.beginPath();
          ctx.arc(-16.8, 0, 2.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = cinnabar;
          ctx.beginPath();
          ctx.arc(-18.2, 1.8, 1.35, 0, Math.PI * 2);
          ctx.fill();

          // 3. Multi-segment white-jade shaft with pale-gold metallic joints/collars
          const jointXs = [10, 35, shaftLen - 12];
          const segStarts = [-12.5, 12.2, 37.2];
          const segEnds = [8.2, 33.2, shaftLen - 13.5];

          for (let s = 0; s < segStarts.length; s++) {
            const x0 = segStarts[s];
            const x1 = segEnds[s];
            if (x1 <= x0 + 2) continue;

            ctx.fillStyle = jadeShaft;
            ctx.strokeStyle = outline;
            ctx.lineWidth = 1.75;
            ctx.beginPath();
            ctx.rect(x0, -3.2, x1 - x0, 6.4);
            ctx.fill();
            ctx.stroke();

            // Shaded lower jade bevel
            ctx.fillStyle = colorWithAlpha(jadeMid, 0.82);
            ctx.fillRect(x0 + 0.6, 0.4, x1 - x0 - 1.2, 2.3);

            // Inner glowing jade-teal spirit vein
            ctx.strokeStyle = colorWithAlpha(jadeVein, isAwakenedBrush ? 0.94 : 0.74);
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(x0 + 2, -1.1);
            ctx.lineTo(x1 - 2, -1.1);
            ctx.stroke();
          }

          // Pale-gold metallic joints/collars separating segments
          for (const jx of jointXs) {
            ctx.fillStyle = paleGold;
            ctx.strokeStyle = outline;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.rect(jx - 2.1, -4.1, 4.2, 8.2);
            ctx.fill();
            ctx.stroke();

            // Lower metallic bevel + crisp specular rim
            ctx.fillStyle = colorWithAlpha(paleGoldShadow, 0.48);
            ctx.fillRect(jx - 1.4, 0.8, 2.8, 2.4);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(jx - 1.2, -2.5);
            ctx.lineTo(jx + 1.2, -2.5);
            ctx.stroke();

            // Tiny jade inlay at joint center
            ctx.fillStyle = jadeVein;
            ctx.beginPath();
            ctx.arc(jx, 0, 1.15, 0, Math.PI * 2);
            ctx.fill();
          }

          // Ornate ferrule collar (pale-gold + white-jade + cinnabar seal band)
          ctx.fillStyle = '#f0fdfa';
          ctx.strokeStyle = outline;
          ctx.lineWidth = 1.6;
          ctx.fillRect(shaftLen - 10, -4.6, 8.5, 9.2);
          ctx.strokeRect(shaftLen - 10, -4.6, 8.5, 9.2);

          ctx.fillStyle = paleGold;
          ctx.fillRect(shaftLen - 10, -4.6, 3.0, 9.2);
          ctx.strokeRect(shaftLen - 10, -4.6, 3.0, 9.2);

          ctx.fillStyle = cinnabar;
          ctx.fillRect(shaftLen - 5.6, -3.5, 2.2, 7.0);

          // 4. Rotating energy ring around the brush ferrule
          const ringCx = shaftLen - 5.5;
          ctx.save();
          try {
            ctx.translate(ringCx, 0);
            ctx.rotate(safeTime * (isAwakenedBrush ? 4.2 : 2.8));

            ctx.strokeStyle = outline;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.8, 12.6, 0.18, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = jadeVein;
            ctx.lineWidth = 1.45;
            ctx.stroke();

            ctx.strokeStyle = paleGold;
            ctx.lineWidth = 0.95;
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.8, 12.6, 0.18, -0.8, 1.2);
            ctx.stroke();

            // 4 rotating diamond/petal motes on ferrule ring
            for (let k = 0; k < 4; k++) {
              const ka = (k * Math.PI) / 2;
              const rx = Math.cos(ka) * 4.8;
              const ry = Math.sin(ka) * 12.6;
              const px = rx * Math.cos(0.18) - ry * Math.sin(0.18);
              const py = rx * Math.sin(0.18) + ry * Math.cos(0.18);
              ctx.fillStyle = k % 2 === 0 ? paleGold : jadeVein;
              ctx.beginPath();
              ctx.arc(px, py, 1.35, 0, Math.PI * 2);
              ctx.fill();
            }
          } finally {
            ctx.restore();
          }

          // 5. White bristles with glowing white core & jade-teal edge
          const bx = shaftLen - 1.5;
          const bw = isAwakenedBrush ? 8.2 : 7.0;
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = outline;
          ctx.lineWidth = 2.0;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(bx, -bw * 0.56);
          ctx.quadraticCurveTo(bx + bristleLen * 0.42, -bw * 1.14, bx + bristleLen, 0);
          ctx.quadraticCurveTo(bx + bristleLen * 0.42, bw * 1.14, bx, bw * 0.56);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Ink-wash shading along lower bristle curve
          ctx.fillStyle = colorWithAlpha('#cbd5e1', 0.65);
          ctx.beginPath();
          ctx.moveTo(bx + 1, 0.6);
          ctx.quadraticCurveTo(bx + bristleLen * 0.4, bw * 0.88, bx + bristleLen * 0.85, 0.5);
          ctx.lineTo(bx + 1, bw * 0.42);
          ctx.closePath();
          ctx.fill();

          // Jade-teal inked edge along outer tip & upper contour
          ctx.fillStyle = jadeSilk;
          ctx.beginPath();
          ctx.moveTo(bx + bristleLen * 0.36, -bw * 0.58);
          ctx.quadraticCurveTo(bx + bristleLen * 0.78, -bw * 0.38, bx + bristleLen + 1.8, 0);
          ctx.quadraticCurveTo(bx + bristleLen * 0.78, bw * 0.38, bx + bristleLen * 0.36, bw * 0.58);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = jadeVein;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx + 2, -bw * 0.52);
          ctx.quadraticCurveTo(bx + bristleLen * 0.45, -bw * 0.96, bx + bristleLen + 1.4, 0);
          ctx.quadraticCurveTo(bx + bristleLen * 0.45, bw * 0.96, bx + 2, bw * 0.52);
          ctx.stroke();

          // Glowing pure-white core down the brush tip center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(bx + bristleLen * 0.54, -bw * 0.24);
          ctx.quadraticCurveTo(bx + bristleLen * 0.86, -bw * 0.14, bx + bristleLen + 1.3, 0);
          ctx.quadraticCurveTo(bx + bristleLen * 0.86, bw * 0.14, bx + bristleLen * 0.54, bw * 0.24);
          ctx.closePath();
          ctx.fill();

          // 3 subtle drifting jade-ink, pale-gold & peach blossom motes from the tip
          for (let d = 0; d < 3; d++) {
            const cycle = (safeTime * 1.9 + d * 0.34) % 1;
            const dropX = bx + bristleLen - 1 - d * 4.5 + Math.sin(safeTime * 3.5 + d) * 2.0;
            const dropY = 2 + cycle * 13;
            const dropR = Math.max(0.7, (2.1 - d * 0.3) * (1 - cycle * 0.5));
            ctx.fillStyle = colorWithAlpha(
              d === 0 ? jadeVein : d === 1 ? petalKnot : paleGold,
              (1 - cycle) * 0.82
            );
            ctx.beginPath();
            ctx.arc(dropX, dropY, dropR, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        const isGolden = weapon === 'golden_ink_brush';
        const outline = '#090b10';
        const shaftBase = isGolden ? '#b45309' : '#0f766e';
        const shaftHi = isGolden ? '#fde047' : '#2dd4bf';
        const ferrule = isGolden ? '#fef08a' : '#f4f1ea';
        const bristleInk = isGolden ? '#f59e0b' : '#1a1d24';
        const bristleTip = isGolden ? '#fef9c3' : '#2dd4bf';
        const sealRed = '#ef4444';
        const shaftLen = isGolden ? 74 : 66;
        const bristleLen = isGolden ? 24 : 20;

        // Soft ambient ink/gold wake behind brush head (flat alpha, no shadowBlur)
        ctx.strokeStyle = colorWithAlpha(shaftHi, isGolden ? 0.34 : 0.24);
        ctx.lineWidth = isGolden ? 12 : 9.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shaftLen - 12, 0);
        ctx.lineTo(shaftLen + bristleLen, 0);
        ctx.stroke();

        // Vermilion scholar tassel dangling at pommel
        const tasselWave = Math.sin(safeTime * 7.2) * 3.2;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.quadraticCurveTo(-22, 4 + tasselWave * 0.5, -28, 9 + tasselWave);
        ctx.stroke();
        ctx.strokeStyle = sealRed;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Bamboo-Jade / Golden-Bamboo shaft with ink outline
        ctx.strokeStyle = outline;
        ctx.lineWidth = 7.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(shaftLen - 10, 0);
        ctx.stroke();

        ctx.strokeStyle = shaftBase;
        ctx.lineWidth = 4.6;
        ctx.stroke();

        // Upper specular highlight along bamboo shaft
        ctx.strokeStyle = shaftHi;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-11, -1.3);
        ctx.lineTo(shaftLen - 12, -1.3);
        ctx.stroke();

        // Bamboo nodes along the shaft
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.8;
        for (const nx of [-4, 14, 32, 50]) {
          if (nx < shaftLen - 14) {
            ctx.beginPath();
            ctx.moveTo(nx, -3.4);
            ctx.lineTo(nx, 3.4);
            ctx.stroke();
          }
        }

        // Decorative Xuan-paper / gold ferrule collar before brush head
        ctx.fillStyle = ferrule;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.rect(shaftLen - 11, -4.4, 9, 8.8);
        ctx.fill();
        ctx.stroke();

        // Red vermilion band on collar
        ctx.fillStyle = sealRed;
        ctx.fillRect(shaftLen - 8.5, -3.4, 3.2, 6.8);

        // Lush tapered giant calligraphy brush head (Cự Bút)
        const bx = shaftLen - 2;
        const bw = isGolden ? 7.8 : 6.6;
        ctx.fillStyle = bristleInk;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, -bw * 0.55);
        ctx.quadraticCurveTo(bx + bristleLen * 0.42, -bw * 1.15, bx + bristleLen, 0);
        ctx.quadraticCurveTo(bx + bristleLen * 0.42, bw * 1.15, bx, bw * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Radiant soaked ink tip (Jade glow or Golden Kim Mặc)
        ctx.fillStyle = bristleTip;
        ctx.beginPath();
        ctx.moveTo(bx + bristleLen * 0.46, -bw * 0.44);
        ctx.quadraticCurveTo(bx + bristleLen * 0.78, -bw * 0.28, bx + bristleLen + 1.5, 0);
        ctx.quadraticCurveTo(bx + bristleLen * 0.78, bw * 0.28, bx + bristleLen * 0.46, bw * 0.44);
        ctx.closePath();
        ctx.fill();

        // Animated dripping ink droplets from the brush tip
        for (let d = 0; d < 2; d++) {
          const cycle = (safeTime * 2.2 + d * 0.52) % 1;
          const dropX = bx + bristleLen - 3 - d * 6 + Math.sin(safeTime * 4 + d) * 1.8;
          const dropY = 3 + cycle * 15;
          const dropR = Math.max(0.8, (2.4 - d * 0.4) * (1 - cycle * 0.55));
          ctx.fillStyle = colorWithAlpha(isGolden ? '#fde047' : '#1a1d24', (1 - cycle) * 0.85);
          ctx.beginPath();
          ctx.arc(dropX, dropY, dropR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colorWithAlpha(shaftHi, (1 - cycle) * 0.65);
          ctx.beginPath();
          ctx.arc(dropX - 0.5, dropY - 0.5, dropR * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'mirror_shards': {
        const isVoidShatterer = skinId === 'void_shatterer';
        if (isVoidShatterer) {
          const primary = accentOverride || '#f43f5e';
          const cyan = '#38bdf8';

          // Rift energy wake along void-mirror dagger
          ctx.strokeStyle = colorWithAlpha(primary, 0.34);
          ctx.lineWidth = 11;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(48, -2);
          ctx.stroke();

          // Obsidian hilt & fractured prism crossguard
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-12, 0);
          ctx.lineTo(3, 0);
          ctx.stroke();

          ctx.fillStyle = cyan;
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(4, -9);
          ctx.lineTo(8, 0);
          ctx.lineTo(4, 9);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Jagged beveled void-mirror dagger blade
          drawBeveledBlade(
            ctx,
            5,
            0,
            34,
            -1.4,
            50,
            -3.2,
            5.2,
            4.2,
            '#07040a',
            '#18181b',
            primary,
            '#e0f2fe'
          );

          // Crimson-cyan inner fracture seam across blade
          ctx.strokeStyle = cyan;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(10, 0.8);
          ctx.lineTo(24, -1.6);
          ctx.lineTo(34, 0.2);
          ctx.stroke();

          // 3 orbiting jagged obsidian-cyan monolith shards around wrist
          const spin = safeTime * 5.6;
          for (let i = 0; i < 3; i++) {
            const a = spin + (i * Math.PI * 2) / 3;
            const sx = 20 + Math.cos(a) * 16;
            const sy = Math.sin(a) * 13;
            ctx.save();
            try {
              ctx.translate(sx, sy);
              ctx.rotate(a + 0.3);
              ctx.fillStyle = i % 2 === 0 ? '#18181b' : primary;
              ctx.strokeStyle = '#07040a';
              ctx.lineWidth = 1.8;
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(15, 0);
              ctx.lineTo(2, -4.8);
              ctx.lineTo(-11, 0);
              ctx.lineTo(0, 4.2);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              ctx.strokeStyle = i % 2 === 0 ? cyan : '#e0f2fe';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(13, 0);
              ctx.lineTo(2, -3.5);
              ctx.stroke();
            } finally {
              ctx.restore();
            }
          }
        } else {
          // Mirage Default: Sleek beveled prism ring + 3 orbiting faceted silver-violet mirror shards
          const accent = accentOverride || '#c084fc';
          const spin = safeTime * 4.8;

          ctx.strokeStyle = colorWithAlpha(accent, 0.32);
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.ellipse(16, 0, 14, 10, 0, 0, Math.PI * 2);
          ctx.stroke();

          for (let i = 0; i < 3; i++) {
            const a = spin + (i * Math.PI * 2) / 3;
            const sx = 18 + Math.cos(a) * 15;
            const sy = Math.sin(a) * 12;
            ctx.save();
            try {
              ctx.translate(sx, sy);
              ctx.rotate(a);
              // Dark sumi-ink silhouette + dual-tone crystal facets
              ctx.fillStyle = '#312e81';
              ctx.strokeStyle = '#0b0c10';
              ctx.lineWidth = 1.9;
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(15, 0);
              ctx.lineTo(0, -5.4);
              ctx.lineTo(-10, 0);
              ctx.lineTo(0, 5.4);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Upper lit crystal facet
              ctx.fillStyle = i % 2 === 0 ? '#f1f5f9' : accent;
              ctx.beginPath();
              ctx.moveTo(14, 0);
              ctx.lineTo(0, -4.6);
              ctx.lineTo(-9, 0);
              ctx.closePath();
              ctx.fill();

              // Specular razor rim
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.moveTo(13, 0);
              ctx.lineTo(0, -3.8);
              ctx.stroke();
            } finally {
              ctx.restore();
            }
          }
        }
        break;
      }
      case 'void_prism_scythe': {
        const isVoidShatterer = skinId === 'void_shatterer';
        if (isVoidShatterer) {
          const primary = accentOverride || '#f43f5e';
          const cyan = '#38bdf8';

          // Rift energy aura along halberd-scythe shaft
          ctx.strokeStyle = colorWithAlpha(primary, 0.34);
          ctx.lineWidth = 13;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-34, 0);
          ctx.lineTo(84, 0);
          ctx.stroke();

          // Heavy obsidian shaft with crimson core vein
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 7.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-34, 0);
          ctx.lineTo(72, 0);
          ctx.stroke();
          ctx.strokeStyle = '#9f1239';
          ctx.lineWidth = 3.2;
          ctx.stroke();

          // Spiked pommel crystal
          ctx.fillStyle = cyan;
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-42, 0);
          ctx.lineTo(-34, -4.5);
          ctx.lineTo(-28, 0);
          ctx.lineTo(-34, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Fractured prism ring collar at scythe neck
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(54, 0, 7, 13, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = cyan;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Primary sweeping upper fractured-mirror scythe crescent
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 2.6;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(58, -3);
          ctx.quadraticCurveTo(92, -26, 44, -52);
          ctx.lineTo(54, -34);
          ctx.lineTo(38, -28);
          ctx.quadraticCurveTo(64, -14, 50, -1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Crimson upper bevel facet on main crescent
          ctx.fillStyle = primary;
          ctx.beginPath();
          ctx.moveTo(60, -4);
          ctx.quadraticCurveTo(88, -24, 47, -49);
          ctx.quadraticCurveTo(72, -22, 54, -5);
          ctx.closePath();
          ctx.fill();

          // Cyan specular cutting edge
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.moveTo(61, -4);
          ctx.quadraticCurveTo(87, -24, 46, -49);
          ctx.stroke();

          // Secondary lower reverse-crescent fang (dual-crescent halberd-scythe)
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(54, 3);
          ctx.quadraticCurveTo(74, 18, 42, 32);
          ctx.quadraticCurveTo(58, 14, 46, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = cyan;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(55, 4);
          ctx.quadraticCurveTo(70, 17, 44, 30);
          ctx.stroke();

          // Beveled spearhead apex prism tip
          drawBeveledBlade(
            ctx,
            56,
            0,
            74,
            0,
            94,
            0,
            6.5,
            4.2,
            '#07040a',
            '#4c0519',
            cyan,
            '#ffffff'
          );

          // Orbiting rift crystal sliver at scythe core
          const shardAngle = safeTime * 5.2;
          const sx = 54 + Math.cos(shardAngle) * 14;
          const sy = Math.sin(shardAngle) * 14;
          ctx.fillStyle = primary;
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 5);
          ctx.lineTo(sx + 3.5, sy);
          ctx.lineTo(sx, sy + 5);
          ctx.lineTo(sx - 3.5, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Mirage Default Awakened: Ink-washed Astral Prism Scythe
          const accent = accentOverride || '#c084fc';

          ctx.strokeStyle = colorWithAlpha(accent, 0.3);
          ctx.lineWidth = 11;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-26, 0);
          ctx.lineTo(74, 0);
          ctx.stroke();

          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 6.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-28, 0);
          ctx.lineTo(66, 0);
          ctx.stroke();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2.8;
          ctx.stroke();

          // Diamond pommel & prism collar
          ctx.fillStyle = '#f1f5f9';
          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-34, 0);
          ctx.lineTo(-28, -3.8);
          ctx.lineTo(-23, 0);
          ctx.lineTo(-28, 3.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Beveled crystalline scythe blade
          ctx.fillStyle = '#312e81';
          ctx.strokeStyle = '#0b0c10';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(64, -2);
          ctx.quadraticCurveTo(88, -24, 48, -46);
          ctx.quadraticCurveTo(66, -18, 52, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.moveTo(63, -2);
          ctx.quadraticCurveTo(83, -22, 49, -43);
          ctx.quadraticCurveTo(69, -18, 57, -1);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(64, -2.5);
          ctx.quadraticCurveTo(84, -22, 49, -43);
          ctx.stroke();

          // Beveled spear point tip
          drawBeveledBlade(
            ctx,
            56,
            0,
            68,
            0,
            82,
            0,
            4.6,
            3.2,
            '#0b0c10',
            '#312e81',
            '#f1f5f9',
            '#ffffff'
          );
        }
        break;
      }
      case 'valkyrie_glaive': {
        const isCelestial = skinId === 'celestial_empress';
        const isAbyssal = skinId === 'abyssal_valkyrie';
        const primary = isCelestial ? '#38bdf8' : isAbyssal ? '#f43f5e' : '#facc15';
        const secondary = isCelestial ? '#fde047' : isAbyssal ? '#a855f7' : '#fef9c3';
        const shaftFill = isAbyssal ? '#27272a' : isCelestial ? '#1e3a8a' : '#e2e8f0';
        const wave = Math.sin(safeTime * 9) * 4.5;

        // Polearm shaft with pommel & ink outline
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-36, 0);
        ctx.lineTo(54, 0);
        ctx.stroke();
        ctx.strokeStyle = shaftFill;
        ctx.lineWidth = 3.4;
        ctx.stroke();

        // Pommel jewel
        ctx.fillStyle = primary;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(-36, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Flowing silk ribbon
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(36, 0);
        ctx.quadraticCurveTo(22, -10 + wave, 8, -14 - wave * 0.6);
        ctx.stroke();
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(35, -1);
        ctx.quadraticCurveTo(22, -11 + wave, 10, -14 - wave * 0.6);
        ctx.stroke();

        // Twin crescent axe-wings
        ctx.fillStyle = primary;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(42, -3);
        ctx.quadraticCurveTo(54, -19, 67, -12.5);
        ctx.quadraticCurveTo(56, -6, 56, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(42, 3);
        ctx.quadraticCurveTo(54, 19, 67, 12.5);
        ctx.quadraticCurveTo(56, 6, 56, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Beveled crystal spearhead
        drawBeveledBlade(
          ctx,
          48,
          0,
          68,
          0,
          88,
          0,
          5.2,
          4,
          '#0b0c10',
          primary,
          secondary,
          '#ffffff'
        );
        break;
      }
      case 'valkyrie_excalibur': {
        const isCelestial = skinId === 'celestial_empress';
        const isAbyssal = skinId === 'abyssal_valkyrie';
        const primary = isCelestial ? '#38bdf8' : isAbyssal ? '#f43f5e' : '#f59e0b';
        const core = isCelestial ? '#e0f2fe' : isAbyssal ? '#fecdd3' : '#fef9c3';
        const darkCol = isCelestial ? '#0369a1' : isAbyssal ? '#4c0519' : '#b45309';

        // Energy aura along lance
        ctx.strokeStyle = colorWithAlpha(primary, 0.36);
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(96, 0);
        ctx.stroke();

        // Ornate shaft
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 8.4;
        ctx.beginPath();
        ctx.moveTo(-42, 0);
        ctx.lineTo(58, 0);
        ctx.stroke();
        ctx.strokeStyle = primary;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Rotating sacred halo ring
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = primary;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.ellipse(46, 0, 8, 17, 0, 0, Math.PI * 2);
          ctx.stroke();
        } finally {
          ctx.restore();
        }

        // Colossal beveled halberd blade
        drawBeveledBlade(
          ctx,
          46,
          0,
          76,
          0,
          104,
          0,
          14,
          9.5,
          '#0b0c10',
          darkCol,
          core,
          '#ffffff'
        );
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(48, -13);
        ctx.quadraticCurveTo(73, -8.5, 102, 0);
        ctx.quadraticCurveTo(73, 8.5, 48, 13);
        ctx.stroke();
        break;
      }
      case 'seraph_blade': {
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Winged golden crossguard
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -12);
        ctx.lineTo(10, -4.5);
        ctx.lineTo(10, 4.5);
        ctx.lineTo(2, 12);
        ctx.lineTo(-2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#facc15', 0.42);
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(72, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          8,
          0,
          56,
          0,
          78,
          0,
          4.8,
          3.5,
          '#0b0c10',
          '#fde047',
          '#fef9c3',
          '#ffffff'
        );
        break;
      }
      case 'seraph_greatsword': {
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(-18, -3.5, 22, 7);
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(2, -16);
        ctx.lineTo(12, -6);
        ctx.lineTo(12, 6);
        ctx.lineTo(2, 16);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#facc15', 0.46);
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(122, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          10,
          0,
          96,
          0,
          128,
          0,
          8.2,
          5.6,
          '#0b0c10',
          '#f59e0b',
          '#fef9c3',
          '#ffffff'
        );
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(108, 0);
        ctx.stroke();
        break;
      }
      case 'void_blade': {
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.strokeStyle = '#7e22ce';
        ctx.lineWidth = 3.2;
        ctx.stroke();

        ctx.fillStyle = '#312e81';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(3, -9.5);
        ctx.lineTo(8.5, 0);
        ctx.lineTo(3, 9.5);
        ctx.lineTo(-1, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#a855f7', 0.44);
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(70, -2);
        ctx.stroke();

        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(6, -4.2);
        ctx.lineTo(24, -5.8);
        ctx.lineTo(30, -2.5);
        ctx.lineTo(48, -5.2);
        ctx.lineTo(75, -1);
        ctx.lineTo(54, 4.2);
        ctx.lineTo(6, 4.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        const zig = Math.sin(safeTime * 28) * 1.6;
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(36, zig);
        ctx.lineTo(62, -zig);
        ctx.stroke();
        break;
      }
      case 'void_greatsword': {
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(-18, -3.5, 22, 7);
        ctx.fillStyle = '#581c87';
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -15);
        ctx.lineTo(12, -5);
        ctx.lineTo(12, 5);
        ctx.lineTo(2, 15);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = colorWithAlpha('#a855f7', 0.48);
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(122, 0);
        ctx.stroke();

        ctx.fillStyle = '#0f0720';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10, -8);
        ctx.lineTo(42, -9.8);
        ctx.lineTo(50, -5);
        ctx.lineTo(102, -6);
        ctx.lineTo(128, 0);
        ctx.lineTo(102, 6);
        ctx.lineTo(10, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2;
        ctx.stroke();

        const zig = Math.sin(safeTime * 32) * 2.5;
        ctx.strokeStyle = '#f5d0fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(48, zig);
        ctx.lineTo(82, -zig);
        ctx.lineTo(112, 0);
        ctx.stroke();
        break;
      }
      case 'blood_greatsword': {
        const isEclipse = skinId === 'eclipse_ronin';
        const guardCol = isEclipse ? '#f97316' : '#dc2626';
        const rimCol = isEclipse ? '#fb923c' : '#ef4444';
        const coreCol = isEclipse ? '#fde047' : '#fca5a5';
        const auraCol = isEclipse
          ? colorWithAlpha('#f97316', 0.4)
          : colorWithAlpha('#ef4444', 0.36);

        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(-18, -3.5, 22, 7);
        ctx.fillStyle = guardCol;
        ctx.fillRect(2, -13, 6.5, 26);
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(2, -13, 6.5, 26);

        ctx.strokeStyle = auraCol;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(120, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          8,
          0,
          96,
          0,
          126,
          0,
          7.8,
          5.2,
          '#0b0c10',
          '#09070c',
          isEclipse ? '#450a0a' : '#2b090e',
          rimCol
        );

        ctx.strokeStyle = coreCol;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(108, 0);
        ctx.stroke();
        break;
      }
      case 'volt_spear': {
        const shaftCol =
          skinId === 'storm_shogun'
            ? '#1d4ed8'
            : skinId === 'cyber_valkyrie'
              ? '#e879f9'
              : '#38bdf8';
        const headCol =
          skinId === 'storm_shogun'
            ? '#fde047'
            : skinId === 'cyber_valkyrie'
              ? '#22d3ee'
              : '#facc15';
        const rimCol = skinId === 'cyber_valkyrie' ? '#f0abfc' : '#ffffff';

        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-36, 0);
        ctx.lineTo(74, 0);
        ctx.stroke();
        ctx.strokeStyle = shaftCol;
        ctx.lineWidth = 3.6;
        ctx.stroke();

        // Collar ring
        ctx.fillStyle = headCol;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 1.6;
        ctx.fillRect(62, -5.5, 5, 11);
        ctx.strokeRect(62, -5.5, 5, 11);

        drawBeveledBlade(
          ctx,
          66,
          0,
          82,
          0,
          98,
          0,
          8,
          4.5,
          '#0b0c10',
          shaftCol,
          headCol,
          rimCol
        );
        break;
      }
      case 'thunder_halberd': {
        const auraBase =
          skinId === 'storm_shogun'
            ? '#1d4ed8'
            : skinId === 'cyber_valkyrie'
              ? '#e879f9'
              : '#38bdf8';
        const shaftCol =
          skinId === 'storm_shogun'
            ? '#fde047'
            : skinId === 'cyber_valkyrie'
              ? '#67e8f9'
              : '#fef08a';
        const headCol =
          skinId === 'storm_shogun'
            ? '#2563eb'
            : skinId === 'cyber_valkyrie'
              ? '#d946ef'
              : '#0ea5e9';

        ctx.strokeStyle = colorWithAlpha(auraBase, 0.38);
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-42, 0);
        ctx.lineTo(108, 0);
        ctx.stroke();

        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 8.6;
        ctx.beginPath();
        ctx.moveTo(-42, 0);
        ctx.lineTo(92, 0);
        ctx.stroke();
        ctx.strokeStyle = shaftCol;
        ctx.lineWidth = 4;
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          64,
          0,
          88,
          0,
          115,
          0,
          14,
          8,
          '#0b0c10',
          headCol,
          shaftCol,
          '#ffffff'
        );
        break;
      }
      case 'flame_nodachi': {
        const guardCol =
          skinId === 'frost_empress'
            ? '#0284c7'
            : skinId === 'solar_phoenix'
              ? '#dc2626'
              : '#f97316';
        const bladeCol =
          skinId === 'frost_empress'
            ? '#38bdf8'
            : skinId === 'solar_phoenix'
              ? '#f97316'
              : '#fb923c';
        const darkCol =
          skinId === 'frost_empress'
            ? '#082f49'
            : skinId === 'solar_phoenix'
              ? '#7f1d1d'
              : '#7c2d12';
        const edgeCol =
          skinId === 'frost_empress'
            ? '#e0f2fe'
            : skinId === 'solar_phoenix'
              ? '#fde047'
              : '#fef08a';

        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-19, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.strokeStyle = guardCol;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(4, -9.5);
        ctx.lineTo(4, 9.5);
        ctx.stroke();

        // Curved tapered nodachi polygon
        ctx.fillStyle = bladeCol;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(6, -3.5);
        ctx.quadraticCurveTo(44, -7.2, 84, -8.5);
        ctx.lineTo(78, -2.5);
        ctx.quadraticCurveTo(42, -1.5, 6, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = darkCol;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(8, 1.8);
        ctx.quadraticCurveTo(42, -2, 76, -3.5);
        ctx.stroke();

        ctx.strokeStyle = edgeCol;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(8, -2.6);
        ctx.quadraticCurveTo(44, -6, 81, -7.8);
        ctx.stroke();

        if (skinId === 'frost_empress') {
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(14, 1);
          ctx.quadraticCurveTo(46, -2.2, 75, -5.2);
          ctx.stroke();
        }
        break;
      }
      case 'solar_greatblade': {
        const guardCol =
          skinId === 'frost_empress'
            ? '#38bdf8'
            : skinId === 'solar_phoenix'
              ? '#fde047'
              : '#facc15';
        const auraBase =
          skinId === 'frost_empress'
            ? '#38bdf8'
            : skinId === 'solar_phoenix'
              ? '#dc2626'
              : '#f97316';
        const bodyCol =
          skinId === 'frost_empress'
            ? '#082f49'
            : skinId === 'solar_phoenix'
              ? '#450a0a'
              : '#1c0f0a';
        const rimCol =
          skinId === 'frost_empress'
            ? '#c084fc'
            : skinId === 'solar_phoenix'
              ? '#fde047'
              : '#f97316';
        const coreCol =
          skinId === 'frost_empress'
            ? '#e0f2fe'
            : skinId === 'solar_phoenix'
              ? '#fef9c3'
              : '#fef08a';

        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(-20, -4, 24, 8);
        ctx.fillStyle = guardCol;
        ctx.fillRect(2, -14, 7, 28);
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, -14, 7, 28);

        ctx.strokeStyle = colorWithAlpha(auraBase, 0.42);
        ctx.lineWidth = 13;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(124, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          9,
          0,
          104,
          0,
          130,
          0,
          9,
          5.6,
          '#0b0c10',
          bodyCol,
          rimCol,
          coreCol
        );
        ctx.strokeStyle = coreCol;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(110, 0);
        ctx.stroke();
        break;
      }
      case 'twin_daggers': {
        const outerCol =
          skinId === 'blood_moon'
            ? '#f43f5e'
            : skinId === 'astral_phantom'
              ? '#818cf8'
              : '#34d399';
        const darkCol =
          skinId === 'blood_moon'
            ? '#4c0519'
            : skinId === 'astral_phantom'
              ? '#1e1b4b'
              : '#064e3b';
        const innerCol =
          skinId === 'blood_moon'
            ? '#ffe4e6'
            : skinId === 'astral_phantom'
              ? '#fde047'
              : '#ecfdf5';

        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          2,
          0,
          26,
          -1,
          40,
          -2.4,
          3.4,
          2.6,
          '#0b0c10',
          darkCol,
          outerCol,
          innerCol
        );
        break;
      }
      case 'arcane_hands':
      case 'prismatic_hands': {
        const isRainbow = skinId === 'prismatic_archon' || weapon === 'prismatic_hands';
        const hue = (safeTime * 180) % 360;
        const ringCol = isRainbow ? colorWithAlpha(`hsl(${hue}, 95%, 64%)`, 1) : '#e879f9';
        const innerCol = isRainbow
          ? colorWithAlpha(`hsl(${(hue + 140) % 360}, 95%, 72%)`, 1)
          : '#38bdf8';
        const r = weapon === 'prismatic_hands' ? 18 : 13;

        // Ink-wash outer arcane ring for silhouette contrast
        ctx.strokeStyle = colorWithAlpha('#0b0c10', 0.85);
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.rotate(safeTime * (weapon === 'prismatic_hands' ? 5.2 : 3.4));

          ctx.strokeStyle = ringCol;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = innerCol;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            ctx.lineTo(Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r);
          }
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
          ctx.fill();
        } finally {
          ctx.restore();
        }
        break;
      }
      case 'void_sabers': {
        const edgeCol =
          skinId === 'blood_moon'
            ? '#e11d48'
            : skinId === 'astral_phantom'
              ? '#4f46e5'
              : '#10b981';
        const darkCol =
          skinId === 'blood_moon'
            ? '#4c0519'
            : skinId === 'astral_phantom'
              ? '#1e1b4b'
              : '#064e3b';
        const coreCol =
          skinId === 'blood_moon'
            ? '#fecdd3'
            : skinId === 'astral_phantom'
              ? '#fef08a'
              : '#ffffff';

        ctx.strokeStyle = colorWithAlpha(edgeCol, 0.38);
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(74, -4);
        ctx.stroke();

        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          2,
          0,
          50,
          -2.2,
          75,
          -4.5,
          4.4,
          3.4,
          '#0b0c10',
          darkCol,
          edgeCol,
          coreCol
        );
        break;
      }
      case 'dagger': {
        drawBeveledBlade(
          ctx,
          0,
          0,
          16,
          0,
          26,
          0,
          3,
          2.2,
          '#0b0c10',
          '#64748b',
          '#f8fafc',
          '#ffffff'
        );
        break;
      }
      case 'sword':
      case 'shield_sword': {
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();

        ctx.fillStyle = weapon === 'shield_sword' ? '#d6c38d' : '#94a3b8';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 1.6;
        ctx.fillRect(0, -6.5, 3.5, 13);
        ctx.strokeRect(0, -6.5, 3.5, 13);

        drawBeveledBlade(
          ctx,
          3.5,
          0,
          30,
          0,
          48,
          0,
          3.6,
          2.8,
          '#0b0c10',
          '#475569',
          '#f8fafc',
          '#ffffff'
        );
        break;
      }
      case 'pistol': {
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(-3, -7, 23, 10);
        ctx.fillRect(-3, 1, 9, 13);
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, -5, 18, 5);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(14, -4, 4, 2);
        break;
      }
      case 'spear': {
        const tipCol = accentOverride || '#7dd3fc';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-38, 0);
        ctx.lineTo(80, 0);
        ctx.stroke();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3.4;
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          76,
          0,
          90,
          0,
          106,
          0,
          7,
          4.2,
          '#0b0c10',
          '#334155',
          tipCol,
          '#ffffff'
        );
        break;
      }
      case 'laser_blade': {
        const beamCol = accentOverride || '#ef4444';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-10, -3, 14, 6);

        ctx.strokeStyle = colorWithAlpha(beamCol, 0.38);
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(74, 0);
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          5,
          0,
          54,
          0,
          76,
          0,
          4.5,
          3.4,
          '#0b0c10',
          '#7f1d1d',
          beamCol,
          '#ffffff'
        );
        break;
      }
      case 'sniper_rifle': {
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(-12, -7, 44, 11);
        ctx.fillRect(-8, 2, 10, 10);
        ctx.fillStyle = '#334155';
        ctx.fillRect(-8, -5, 36, 5);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(8, -3.5, 19, 2.5);
        // Scope
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(2, -12, 16, 5);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(15, -11, 2.5, 3);
        break;
      }
      case 'neon_orb': {
        const orbCol = accentOverride || '#d946ef';
        const r = Math.max(2, 8 + Math.sin(safeTime * 12) * 2);
        ctx.fillStyle = colorWithAlpha(orbCol, 0.36);
        ctx.beginPath();
        ctx.arc(8, 0, r + 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.fillStyle = orbCol;
        ctx.beginPath();
        ctx.arc(8, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, 0, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'frost_halberd': {
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-34, 0);
        ctx.lineTo(74, 0);
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.6;
        ctx.stroke();

        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(42, -3);
        ctx.quadraticCurveTo(56, -24, 68, -14);
        ctx.quadraticCurveTo(60, -4, 62, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        drawBeveledBlade(
          ctx,
          64,
          0,
          78,
          0,
          95,
          0,
          6,
          3.8,
          '#0b0c10',
          '#0284c7',
          '#e0f2fe',
          '#ffffff'
        );
        break;
      }
      case 'titan_hammer': {
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(58, 0);
        ctx.stroke();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 4.4;
        ctx.stroke();

        ctx.fillStyle = '#292524';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.8;
        ctx.fillRect(46, -21, 27, 42);
        ctx.strokeRect(46, -21, 27, 42);

        ctx.fillStyle = '#f97316';
        ctx.fillRect(48, -19, 23, 6);
        ctx.fillRect(48, 13, 23, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(53, -6, 13, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(48, -19);
        ctx.lineTo(71, -19);
        ctx.stroke();
        break;
      }
      case 'reaper_scythe': {
        const bladeCol = accentOverride || '#a855f7';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 7.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-36, 0);
        ctx.lineTo(72, 0);
        ctx.stroke();
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(62, -2);
        ctx.quadraticCurveTo(80, 18, 35, 45);
        ctx.quadraticCurveTo(58, 16, 52, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = bladeCol;
        ctx.beginPath();
        ctx.moveTo(62, -1);
        ctx.quadraticCurveTo(77, 17, 38, 41);
        ctx.quadraticCurveTo(64, 15, 57, 1);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(64, 2);
        ctx.quadraticCurveTo(73, 18, 40, 40);
        ctx.stroke();
        break;
      }
    }
  } finally {
    ctx.restore();
  }
}
