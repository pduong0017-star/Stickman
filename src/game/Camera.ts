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
  private baseTargetZoom = 1;

  private trauma = 0;
  private kickX = 0;
  private kickY = 0;
  private dirShakeX = 0;
  private dirShakeY = 0;
  private dirShakeAmp = 0;
  private dirShakeTimer = 0;
  private dirShakeDuration = 0.18;
  private zoomPulseTimer = 0;

  public shakeX = 0;
  public shakeY = 0;

  public setTarget(x: number, y: number, zoom = 1): void {
    this.targetX = x;
    this.targetY = y;
    this.baseTargetZoom = zoom;
    if (this.zoomPulseTimer <= 0) {
      this.targetZoom = zoom;
    }
  }

  /**
   * Automatically tracks the midpoint between Player and combat target,
   * zooming out slightly (0.85x - 0.92x) during aerial exchanges or wide separation.
   */
  public trackCombatFocus(
    playerX: number,
    playerY: number,
    targetX: number | null,
    targetY: number | null,
    lookahead = 0
  ): void {
    if (targetX !== null && targetY !== null) {
      const dx = Math.abs(playerX - targetX);
      const dy = Math.abs(playerY - targetY);
      const highestY = Math.min(playerY, targetY);
      const airHeight = Math.max(0, GROUND_Y - highestY);

      const midX = playerX * 0.55 + targetX * 0.45 + lookahead * 0.25;
      const midY = (playerY + targetY) * 0.5 - 115;

      let dynamicZoom = 1.0;
      const isFar = dx > 250 || dy > 110;
      const isAirborne = airHeight > 65;
      if (isFar || isAirborne) {
        const distFactor = clamp((dx - 230) / 420, 0, 1);
        const airFactor = clamp((airHeight - 55) / 180, 0, 1);
        const spreadFactor = Math.max(distFactor, airFactor);
        // Smoothly zoom out into the 0.85x - 0.92x range
        dynamicZoom = clamp(0.92 - spreadFactor * 0.07, 0.85, 0.92);
      }
      this.setTarget(midX, midY, dynamicZoom);
      return;
    }

    const playerAirHeight = Math.max(0, GROUND_Y - playerY);
    const soloZoom = playerAirHeight > 85 ? 0.92 : 1.0;
    this.setTarget(playerX + lookahead, playerY - 118, soloZoom);
  }

  public pulseZoom(zoom: number, duration = 0.25): void {
    this.targetZoom = Math.max(this.targetZoom, zoom);
    this.zoomPulseTimer = Math.max(this.zoomPulseTimer, duration);
  }

  /**
   * Subtle high-speed combat zoom-in (1.08x - 1.15x) for heavy strikes, parries, and finishers.
   */
  public triggerActionZoom(kind: 'heavy' | 'parry' | 'finisher'): void {
    if (kind === 'finisher') {
      this.pulseZoom(1.15, 0.28);
    } else if (kind === 'parry') {
      this.pulseZoom(1.12, 0.22);
    } else {
      this.pulseZoom(1.08, 0.18);
    }
  }

  /**
   * Directional screen shake along the impact vector instead of purely random jitter.
   */
  public addDirectionalShake(
    dirX: number,
    dirY: number,
    intensity: number,
    duration = 0.18
  ): void {
    const len = Math.hypot(dirX, dirY);
    const nx = len > 0.001 ? dirX / len : 1;
    const ny = len > 0.001 ? dirY / len : 0;
    const clamped = clamp(intensity, 0, 1);

    this.dirShakeX = nx;
    this.dirShakeY = ny;
    this.dirShakeAmp = Math.max(this.dirShakeAmp, clamped * 22);
    this.dirShakeDuration = Math.max(0.08, duration);
    this.dirShakeTimer = Math.max(this.dirShakeTimer, this.dirShakeDuration);

    // Immediate punch kick along the hit vector
    this.kickX += nx * clamped * 16;
    this.kickY += ny * clamped * 12;
  }

  public addShake(intensity: number, dirX = 0, dirY = 0): void {
    if (dirX !== 0 || dirY !== 0) {
      this.addDirectionalShake(dirX, dirY, intensity, 0.16);
      this.trauma = clamp(this.trauma + intensity * 0.35, 0, 1);
      return;
    }
    this.trauma = clamp(this.trauma + intensity, 0, 1);
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.zoom = 1;
    this.targetZoom = 1;
    this.baseTargetZoom = 1;
    this.trauma = 0;
    this.kickX = 0;
    this.kickY = 0;
    this.dirShakeX = 0;
    this.dirShakeY = 0;
    this.dirShakeAmp = 0;
    this.dirShakeTimer = 0;
    this.dirShakeDuration = 0.18;
    this.zoomPulseTimer = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  public update(dt: number, viewW: number, viewH: number): void {
    this.responsiveScale = computeResponsiveCameraScale(viewW, viewH);

    if (this.zoomPulseTimer > 0) {
      this.zoomPulseTimer = Math.max(0, this.zoomPulseTimer - dt);
      if (this.zoomPulseTimer === 0) {
        this.targetZoom = this.baseTargetZoom;
      }
    }

    const smooth = 1 - Math.exp(-9.5 * dt);
    const zoomSmooth = 1 - Math.exp(-7.5 * dt);
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

    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    const shakeMag = this.trauma * this.trauma * 20;

    let directionalX = 0;
    let directionalY = 0;
    if (this.dirShakeTimer > 0) {
      this.dirShakeTimer = Math.max(0, this.dirShakeTimer - dt);
      const progress = 1 - this.dirShakeTimer / Math.max(0.001, this.dirShakeDuration);
      const damp = (1 - progress) * (1 - progress);
      // Damped oscillation along the strike vector
      const wave = Math.cos(progress * Math.PI * 4.5) * this.dirShakeAmp * damp;
      directionalX = this.dirShakeX * wave;
      directionalY = this.dirShakeY * wave;
      if (this.dirShakeTimer === 0) {
        this.dirShakeAmp = 0;
      }
    }

    this.shakeX = (Math.random() * 2 - 1) * shakeMag + directionalX + this.kickX;
    this.shakeY = (Math.random() * 2 - 1) * shakeMag + directionalY + this.kickY;

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
