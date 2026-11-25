import { ARENA_WIDTH, GROUND_Y, clamp } from './rules';
import { computeResponsiveCameraScale } from './characters';
import { computeLandscapeFloorAnchor } from './animation';

export class Camera {
  public x = ARENA_WIDTH * 0.5;
  public y = GROUND_Y - 125;
  public zoom = 1;
  private responsiveScale = 1;
  private targetX = ARENA_WIDTH * 0.5;
  private targetY = GROUND_Y - 125;
  private targetZoom = 1;

  private trauma = 0;
  private kickX = 0;
  private kickY = 0;
  private zoomPulseTimer = 0;

  public shakeX = 0;
  public shakeY = 0;

  public setTarget(x: number, y: number, zoom = 1): void {
    this.targetX = x;
    this.targetY = y;
    if (this.zoomPulseTimer <= 0) {
      this.targetZoom = zoom;
    }
  }

  public pulseZoom(zoom: number, duration = 0.25): void {
    this.targetZoom = Math.max(this.targetZoom, zoom);
    this.zoomPulseTimer = Math.max(this.zoomPulseTimer, duration);
  }

  public addShake(intensity: number, dirX = 0, dirY = 0): void {
    this.trauma = clamp(this.trauma + intensity, 0, 1);
    this.kickX += dirX * intensity * 18;
    this.kickY += dirY * intensity * 12;
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.zoom = 1;
    this.targetZoom = 1;
    this.trauma = 0;
    this.kickX = 0;
    this.kickY = 0;
    this.zoomPulseTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  public update(dt: number, viewW: number, viewH: number): void {
    this.responsiveScale = computeResponsiveCameraScale(viewW, viewH);

    if (this.zoomPulseTimer > 0) {
      this.zoomPulseTimer = Math.max(0, this.zoomPulseTimer - dt);
      if (this.zoomPulseTimer === 0) {
        this.targetZoom = 1;
      }
    }

    const smooth = 1 - Math.exp(-9.5 * dt);
    const zoomSmooth = 1 - Math.exp(-7 * dt);
    this.zoom += (this.targetZoom - this.zoom) * zoomSmooth;

    const effectiveZoom = this.zoom * this.responsiveScale;
    const halfW = (viewW * 0.5) / effectiveZoom;
    const minX = Math.min(ARENA_WIDTH * 0.5, halfW);
    const maxX = Math.max(ARENA_WIDTH * 0.5, ARENA_WIDTH - halfW);

    const clampedTargetX = clamp(this.targetX, minX, maxX);
    const isCompactLandscape = viewW > viewH && viewH <= 520;
    // Lift camera slightly downward relative to floor on compact landscape so floor rises cleanly above touch buttons
    const floorOffset = isCompactLandscape ? 72 : 95;
    const desiredY = clamp(
      this.targetY + (isCompactLandscape ? 26 : 0),
      GROUND_Y - (viewH / effectiveZoom) * 0.44,
      GROUND_Y - floorOffset
    );

    this.x += (clampedTargetX - this.x) * smooth;
    this.y += (desiredY - this.y) * smooth;

    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const shakeMag = this.trauma * this.trauma * 24;
    this.shakeX = (Math.random() * 2 - 1) * shakeMag + this.kickX;
    this.shakeY = (Math.random() * 2 - 1) * shakeMag + this.kickY;

    const kickDecay = Math.exp(-16 * dt);
    this.kickX *= kickDecay;
    this.kickY *= kickDecay;
  }

  public applyTransform(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const effectiveZoom = this.zoom * this.responsiveScale;
    const anchorY = computeLandscapeFloorAnchor(viewW, viewH);
    ctx.translate(viewW * 0.5 + this.shakeX, viewH * anchorY + this.shakeY);
    ctx.scale(effectiveZoom, effectiveZoom);
    ctx.translate(-this.x, -this.y);
  }
}
