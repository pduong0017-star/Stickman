// Copy this file to e.g. `my_skin.ts`, rename the export, then register in registry.ts.
// Every layer is optional; a missing layer draws nothing for that skin.
// NOTE: new skin IDs must first be added to the `SkinId` union in src/game/types.ts.
import type { SkinModule, SkinRenderContext } from './types';

function drawBackLayer({ ctx, joints, time, awakened }: SkinRenderContext): void {
  const { neck } = joints;
  ctx.save();
  try {
    const sway = Math.sin(time * 3) * 4;
    ctx.fillStyle = awakened ? '#ff4080' : '#8844cc';
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.lineTo(neck.x - 18 + sway, neck.y + 40);
    ctx.lineTo(neck.x + 4, neck.y + 36);
    ctx.closePath();
    ctx.fill();
  } finally {
    ctx.restore();
  }
}

function drawBody({ ctx, joints, awakened }: SkinRenderContext): void {
  const { neck, hip } = joints;
  ctx.save();
  try {
    ctx.strokeStyle = awakened ? '#ffd060' : '#cccccc';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y + 4);
    ctx.lineTo(hip.x, hip.y);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

function drawFrontLayer({ ctx, joints, headR = 10, time }: SkinRenderContext): void {
  const { head } = joints;
  ctx.save();
  try {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(head.x, head.y - headR - 6, headR * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

export const templateSkin: SkinModule = {
  id: 'default', // <- change to your SkinId
  drawBackLayer,
  drawBody,
  drawFrontLayer,
};
