import {
  ARENA_WIDTH,
  GRAVITY,
  GROUND_Y,
  clamp,
  createScarfChain,
  isWithinParryWindow,
  stepVerletScarf,
} from './rules';
import {
  CHARACTER_ROSTER,
  type CharacterDefinition,
  getCharacterDef,
} from './characters';
import type { CharacterId, ScarfNode } from './types';
import type { AudioEngine } from './AudioEngine';
import type { Camera } from './Camera';
import type { InputHandler } from './InputHandler';
import type { ParticleSystem } from './ParticleSystem';
import {
  type Afterimage,
  type SkeletonJoints,
  type SlashTrail,
  type StickPoseName,
  computeStickmanSkeleton,
  renderAfterimages,
  renderSlashTrails,
  renderStickman,
} from './StickmanRenderer';
import {
  type AttackContext,
  type ComboMoveSpec,
  blendSkeleton,
  getAwakenedVisualProfile,
  getComboMoveForCharacter,
} from './animation';
import { IceWall, MagmaPillar, PlasticChair, Projectile } from './Entities';

export interface ActiveMeleeHitbox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  knockX: number;
  knockY: number;
  heavy: boolean;
  unblockable: boolean;
  hitIds: Set<number>;
}

export class Player {
  public character: CharacterDefinition = CHARACTER_ROSTER.kuro;
  public x = ARENA_WIDTH * 0.5;
  public y = GROUND_Y;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;
  public onGround = true;

  public hp = 150;
  public maxHp = 150;
  public trailHp = 150;
  public rage = 0;
  public maxRage = 100;
  public awakening = 0;
  public maxAwakening = 100;
  public awakened = false;
  public awakenTimer = 0;
  public readonly awakenDuration = 22;

  public sittingOnChair = true;
  public chairKickTimer = 0;
  public danceTimer = 0;
  public awakenPoseTimer = 0;

  // Physics & responsive platforming
  public jumpsLeft = 2;
  public coyoteTimer = 0;
  public airFlipTimer = 0;
  public brakeTimer = 0;
  public scaleX = 1;
  public scaleY = 1;
  public walkPhase = 0;
  public poseTime = 0;
  public hitFlash = 0;
  public hurtTimer = 0;
  public invulnTimer = 0;

  // Dash
  public dashTimer = 0;
  public dashGraceTimer = 0; // allows chaining into Iaido Dash-Slash right after dash!
  public dashCooldown = 0;
  public dashCooldownMax = 0.62;
  private afterimageTimer = 0;

  // Attack / Fluid 6-Hit Ground + 3-Hit Air + Special Moves
  public comboStep = 0; // 1..6 ground
  public airComboStep = 0; // 1..3 air (3rd is Meteor Air Slam!)
  public currentMove: ComboMoveSpec | null = null;
  public airSlamPendingImpact = false;
  public attackTimer = 0;
  public attackDuration = 0;
  public comboResetTimer = 0;
  public activeHitbox: ActiveMeleeHitbox | null = null;
  private hitboxSeq = 1;
  private attackHitIssued = false;
  private attackAfterimageTimer = 0;

  // Parry
  public parryTimer = 0;
  public parryCooldown = 0;
  public readonly parryCooldownMax = 0.52;
  public parryFlashTimer = 0;
  public parryCounterWindow = 0;

  // Signature Skill [U]
  public cryoCooldown = 0;
  public cryoCooldownMax = 3.2;
  public cryoCastTimer = 0;
  public cryoPunchTimer = 0;

  // Scarf, Smooth Blended Skeleton & VFX
  public scarf: ScarfNode[] = [];
  public afterimages: Afterimage[] = [];
  public slashTrails: SlashTrail[] = [];
  public lastJoints: SkeletonJoints | null = null;
  public blendedJoints: SkeletonJoints | null = null;
  private auraTimer = 0;
  private chairLightningTimer = 0;
  private lastStrideStep = 0;

  public setCharacter(id: CharacterId): void {
    this.character = getCharacterDef(id);
    this.maxHp = this.character.maxHp;
    this.dashCooldownMax = this.character.dashCooldown;
    this.cryoCooldownMax = this.character.specialCooldown;
    if (this.hp > this.maxHp || this.sittingOnChair) {
      this.hp = this.maxHp;
      this.trailHp = this.maxHp;
    }
    this.jumpsLeft = this.character.maxJumps;
  }

  public reset(x = ARENA_WIDTH * 0.5, sitOnChair = true): void {
    this.maxHp = this.character.maxHp;
    this.dashCooldownMax = this.character.dashCooldown;
    this.cryoCooldownMax = this.character.specialCooldown;
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = true;
    this.hp = this.maxHp;
    this.trailHp = this.maxHp;
    this.rage = 0;
    this.awakening = 0;
    this.awakened = false;
    this.awakenTimer = 0;
    this.sittingOnChair = sitOnChair;
    this.chairKickTimer = 0;
    this.danceTimer = 0;
    this.awakenPoseTimer = 0;
    this.jumpsLeft = this.character.maxJumps;
    this.coyoteTimer = 0;
    this.airFlipTimer = 0;
    this.brakeTimer = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.walkPhase = 0;
    this.poseTime = 0;
    this.hitFlash = 0;
    this.hurtTimer = 0;
    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.dashGraceTimer = 0;
    this.dashCooldown = 0;
    this.comboStep = 0;
    this.airComboStep = 0;
    this.currentMove = null;
    this.airSlamPendingImpact = false;
    this.attackTimer = 0;
    this.attackDuration = 0;
    this.comboResetTimer = 0;
    this.activeHitbox = null;
    this.parryTimer = 0;
    this.parryCooldown = 0;
    this.parryFlashTimer = 0;
    this.parryCounterWindow = 0;
    this.cryoCooldown = 0;
    this.cryoCastTimer = 0;
    this.cryoPunchTimer = 0;
    this.afterimages = [];
    this.slashTrails = [];
    this.blendedJoints = null;
    this.scarf = createScarfChain(this.x, this.y - 72, 9, 9);
  }

  public notifyPerfectParry(): void {
    this.parryCounterWindow = 0.65;
  }

  public standUpFromChair(chair: PlasticChair | null, audio: AudioEngine, particles: ParticleSystem): void {
    if (!this.sittingOnChair) return;
    this.sittingOnChair = false;
    this.chairKickTimer = 0.25;
    this.poseTime = 0;
    this.vy = -260;
    this.onGround = false;
    if (chair) {
      chair.kick(this.facing);
    }
    audio.playChairKick();
    particles.emitSparks(this.x - 10, this.y - 26, 12, this.character.accentColor, 380);
    particles.emitShockwave(this.x, this.y - 30, this.character.glowColor, 70, 0.25);
  }

  public isParrying(): boolean {
    return isWithinParryWindow(this.parryTimer, this.character.parryWindow);
  }

  public isInvulnerable(): boolean {
    return this.invulnTimer > 0 || this.dashTimer > 0 || this.awakenPoseTimer > 0;
  }

  public addRage(amount: number, trainingMode: boolean): void {
    this.rage = trainingMode ? this.maxRage : clamp(this.rage + amount, 0, this.maxRage);
  }

  public addAwakening(amount: number, trainingMode: boolean): void {
    if (this.awakened) return;
    this.awakening = trainingMode
      ? this.maxAwakening
      : clamp(this.awakening + amount, 0, this.maxAwakening);
  }

  public triggerVictoryDance(duration = 2.6): void {
    this.danceTimer = duration;
    this.poseTime = 0;
    this.vx = 0;
  }

  public triggerAwakening(audio: AudioEngine, particles: ParticleSystem, camera: Camera): boolean {
    if (this.awakened || this.awakening < this.maxAwakening) return false;
    this.awakened = true;
    this.awakenTimer = this.awakenDuration;
    this.awakening = 0;
    this.awakenPoseTimer = 0.62;
    this.invulnTimer = Math.max(this.invulnTimer, 0.95);
    this.hp = Math.min(this.maxHp, this.hp + 35);
    this.poseTime = 0;
    this.vx = 0;

    const profile = getAwakenedVisualProfile(this.character.id);
    const waveCol = this.character.awakeningWaveColor;
    audio.playAwaken();
    camera.pulseZoom(1.24, 0.58);
    camera.addShake(0.68, 0, -1);
    particles.emitShockwave(this.x, this.y - 52, waveCol, 195, 0.44);
    particles.emitShockwave(this.x, this.y - 52, '#ffffff', 130, 0.32);
    particles.emitEmbers(this.x, this.y - 55, 36, waveCol);
    particles.emitSparks(this.x, this.y - 60, 26, '#ffffff', 660);
    particles.emitGroundCrack(this.x, 82, waveCol);

    // Character-specific dramatic Awakening Transformation Burst FX!
    if (this.character.id === 'raijin') {
      for (let i = -2; i <= 2; i++) {
        particles.emitLightning(this.x + i * 38, this.y - 95, i % 2 === 0 ? '#facc15' : '#38bdf8', 90);
      }
      audio.playLaser();
    } else if (this.character.id === 'kagura') {
      particles.emitEmbers(this.x - 40, this.y - 65, 24, '#fde047');
      particles.emitEmbers(this.x + 40, this.y - 65, 24, '#ea580c');
      particles.emitShockwave(this.x, this.y - 52, '#fde047', 160, 0.38);
    } else if (this.character.id === 'zero') {
      if (this.lastJoints) {
        for (const ox of [-72, -36, 36, 72]) {
          this.afterimages.push({
            x: this.x + ox,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.48,
            color: '#34d399',
          });
        }
      }
    } else {
      // Kuro Blood Monarch crimson storm burst
      particles.emitLightning(this.x - 24, this.y - 80, '#ef4444', 72);
      particles.emitLightning(this.x + 24, this.y - 80, '#fca5a5', 72);
    }

    particles.emitText(this.x, this.y - 118, profile.transformationCallout, '#ffffff', 26);
    return true;
  }

  public takeDamage(
    dmg: number,
    knockDir: 1 | -1,
    audio: AudioEngine,
    particles: ParticleSystem,
    camera: Camera,
    trainingMode: boolean
  ): number {
    if (this.isInvulnerable() || this.hp <= 0) return 0;
    const actual = trainingMode ? Math.min(dmg, Math.max(0, this.hp - 25)) : dmg;
    this.hp = Math.max(0, this.hp - actual);
    this.hitFlash = 0.14;
    this.hurtTimer = 0.22;
    this.invulnTimer = 0.55;
    this.danceTimer = 0;
    this.vx = knockDir * 320;
    this.vy = -240;
    this.onGround = false;
    this.attackTimer = 0;
    this.activeHitbox = null;

    audio.playHit(true);
    camera.addShake(0.45, knockDir, 0);
    particles.emitSparks(this.x, this.y - 48, 16, '#f43f5e', 460);
    this.addRage(10, trainingMode);
    this.addAwakening(12, trainingMode);
    return actual;
  }

  public updateIdleOnTitle(dt: number, particles: ParticleSystem): void {
    this.poseTime += dt;
    this.updateAmbientAura(dt, particles, true);
    this.stepSkeletonBlend(dt);
    const neckX = this.x - 4 * this.facing;
    const neckY = this.y - 64;
    stepVerletScarf(this.scarf, neckX, neckY, -720 * this.facing, 380, 9, dt);
  }

  public update(params: {
    dt: number;
    input: InputHandler;
    audio: AudioEngine;
    particles: ParticleSystem;
    camera: Camera;
    chair: PlasticChair | null;
    iceWalls: IceWall[];
    magmaPillars: MagmaPillar[];
    projectiles: Projectile[];
    trainingMode: boolean;
    hasActiveEnemies: boolean;
    onRequestUltimate: () => void;
    onRequestAwaken: () => void;
    onThunderBlinkHit: (fromX: number, toX: number, y: number, dir: 1 | -1, damage: number) => void;
  }): void {
    const { dt, input, audio, particles, camera, chair, iceWalls, magmaPillars, projectiles, trainingMode } = params;

    this.poseTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashGraceTimer = Math.max(0, this.dashGraceTimer - dt);
    this.parryCooldown = Math.max(0, this.parryCooldown - dt);
    this.parryTimer = Math.max(0, this.parryTimer - dt);
    this.parryFlashTimer = Math.max(0, this.parryFlashTimer - dt);
    this.parryCounterWindow = Math.max(0, this.parryCounterWindow - dt);
    this.cryoCooldown = Math.max(0, this.cryoCooldown - dt);
    this.cryoCastTimer = Math.max(0, this.cryoCastTimer - dt);
    this.cryoPunchTimer = Math.max(0, this.cryoPunchTimer - dt);
    this.chairKickTimer = Math.max(0, this.chairKickTimer - dt);
    this.awakenPoseTimer = Math.max(0, this.awakenPoseTimer - dt);
    this.airFlipTimer = Math.max(0, this.airFlipTimer - dt);
    this.brakeTimer = Math.max(0, this.brakeTimer - dt);

    // Delayed damage trail bar
    if (this.trailHp > this.hp) {
      this.trailHp = Math.max(this.hp, this.trailHp - 85 * dt);
    } else {
      this.trailHp = this.hp;
    }

    // Awakening duration countdown
    if (this.awakened) {
      if (!trainingMode) {
        this.awakenTimer -= dt;
        if (this.awakenTimer <= 0) {
          this.awakened = false;
          this.awakenTimer = 0;
        }
      } else {
        this.awakenTimer = this.awakenDuration;
      }
    }

    // Training mode refills Rage & Awakening continuously
    if (trainingMode) {
      this.rage = this.maxRage;
      if (!this.awakened) this.awakening = this.maxAwakening;
    }

    // Spring squash & stretch back to (1, 1)
    const sqDecay = 1 - Math.exp(-14 * dt);
    this.scaleX += (1 - this.scaleX) * sqDecay;
    this.scaleY += (1 - this.scaleY) * sqDecay;

    // Update afterimages & slash trails
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life += dt;
      if (this.afterimages[i].life >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      this.slashTrails[i].life += dt;
      if (this.slashTrails[i].life >= this.slashTrails[i].maxLife) {
        this.slashTrails.splice(i, 1);
      }
    }

    // Sit on plastic chair until input arrives — stand up and immediately process that input!
    if (this.sittingOnChair) {
      this.updateAmbientAura(dt, particles, true);
      if (input.hasAnyGameplayInput()) {
        this.standUpFromChair(chair, audio, particles);
      } else {
        stepVerletScarf(this.scarf, this.x - 4 * this.facing, this.y - 64, -680 * this.facing, 380, 9, dt);
        return;
      }
    }

    // Victory Dance cancel on movement/combat input
    if (this.danceTimer > 0) {
      this.danceTimer = Math.max(0, this.danceTimer - dt);
      if (
        input.isHeld('left') ||
        input.isHeld('right') ||
        input.consumeJustPressed('attack') ||
        input.consumeJustPressed('dash') ||
        input.consumeJustPressed('jump')
      ) {
        this.danceTimer = 0;
      }
    }

    // Special Triggers: Ultimate [I] & Awakening [O] (buffered so taps during hitstop/combos never drop)
    if (this.rage >= this.maxRage && this.hp > 0 && input.consumeBuffered('ultimate')) {
      params.onRequestUltimate();
      return;
    }
    if (!this.awakened && this.awakening >= this.maxAwakening && this.hp > 0 && input.consumeBuffered('awaken')) {
      params.onRequestAwaken();
    }

    // Taunt / Victory Dance [T]
    if (input.consumeJustPressed('taunt') && this.onGround && this.attackTimer <= 0 && this.dashTimer <= 0) {
      this.triggerVictoryDance(2.2);
      if (params.hasActiveEnemies) {
        this.addRage(8, trainingMode);
        particles.emitText(this.x, this.y - 102, 'STYLE +RAGE', '#c084fc', 18);
      }
    }

    // Parry [K]
    if (
      this.parryCooldown <= 0 &&
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0 &&
      input.consumeBuffered('parry')
    ) {
      this.parryTimer = this.character.parryWindow;
      this.parryCooldown = this.parryCooldownMax;
      this.parryFlashTimer = 0.24;
      this.attackTimer = 0;
      this.activeHitbox = null;
      this.danceTimer = 0;
      this.poseTime = 0;
      this.vx *= 0.25;
      audio.playSlash(0, false);
    }

    // Character Signature Skill [U]
    if (this.hurtTimer <= 0 && this.awakenPoseTimer <= 0 && input.consumeBuffered('cryo')) {
      this.triggerSignatureSkill({
        audio,
        particles,
        camera,
        iceWalls,
        magmaPillars,
        projectiles,
        onThunderBlinkHit: params.onThunderBlinkHit,
      });
    }

    // Dash [Shift / L]
    if (
      input.consumeBuffered('dash') &&
      this.dashCooldown <= 0 &&
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0
    ) {
      const moveDir = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
      if (moveDir !== 0) this.facing = moveDir > 0 ? 1 : -1;
      this.dashTimer = 0.16;
      this.dashGraceTimer = 0.28;
      this.dashCooldown = this.dashCooldownMax;
      this.invulnTimer = Math.max(this.invulnTimer, 0.24);
      const baseDashSpeed = this.character.moveSpeed * 2.15;
      this.vx = this.facing * (this.awakened ? baseDashSpeed * 1.15 : baseDashSpeed);
      this.vy = 0;
      this.attackTimer = 0;
      this.currentMove = null;
      this.activeHitbox = null;
      this.danceTimer = 0;
      this.poseTime = 0;
      this.scaleX = 1.24;
      this.scaleY = 0.84;
      audio.playDash();
      particles.emitShockwave(
        this.x,
        this.y - 44,
        this.awakened ? this.character.awakeningWaveColor : this.character.accentColor,
        58,
        0.2
      );
      // Awakened Dash Perks: Raijin leaves shocking thunder arc; Zero flings rear shadow kunai!
      if (this.awakened && this.character.id === 'raijin') {
        const dashEnd = clamp(this.x + this.facing * 175, 48, ARENA_WIDTH - 48);
        particles.emitLightning(this.x + this.facing * 65, this.y - 46, '#fef08a', 60);
        params.onThunderBlinkHit(this.x, dashEnd, this.y - 46, this.facing, 26);
      } else if (this.awakened && this.character.id === 'zero') {
        projectiles.push(
          new Projectile({
            x: this.x - this.facing * 14,
            y: this.y - 52,
            vx: this.facing * 1120,
            vy: 0,
            radius: 18,
            damage: 24,
            kind: 'kunai',
            fromPlayer: true,
            color: '#34d399',
            maxLife: 0.7,
          })
        );
      }
    }

    // Attack [J] — Fluid 6-Hit Ground Combo, 3-Hit Air Combo + Slam, Iaido Dash-Slash, Parry Counter
    // Smooth combo cancel window + hold-to-combo support for buttery mobile & keyboard combat!
    const moveAxis = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
    const attackElapsed = this.attackDuration - this.attackTimer;
    const cancelThreshold = this.currentMove
      ? this.attackDuration * this.currentMove.cancelRatio
      : 0;
    const canChainNow =
      this.attackTimer <= 0 || (this.attackDuration > 0 && attackElapsed >= cancelThreshold);
    const canDashCancelIntoSlash = this.dashTimer > 0 && this.dashTimer < 0.11;
    const attackRequested =
      input.consumeBuffered('attack') ||
      (input.isHeld('attack') &&
        (this.attackTimer <= 0 ||
          (this.attackDuration > 0 && attackElapsed >= this.attackDuration * 0.72)));

    if (
      attackRequested &&
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0 &&
      (canChainNow || canDashCancelIntoSlash)
    ) {
      if (moveAxis !== 0) {
        this.facing = moveAxis > 0 ? 1 : -1;
      }
      this.startAttack(audio, particles, camera, iceWalls, magmaPillars, projectiles, params.onThunderBlinkHit);
    }

    // Horizontal Movement
    const maxSpeed = this.awakened ? this.character.awakenedSpeed : this.character.moveSpeed;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0 && this.lastJoints) {
        this.afterimageTimer = 0.028;
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          joints: this.lastJoints,
          life: 0,
          maxLife: 0.24,
          color: this.awakened ? this.character.awakeningWaveColor : this.character.accentColor,
        });
      }
    } else if (this.awakenPoseTimer > 0) {
      this.vx *= Math.exp(-12 * dt);
    } else if (this.hurtTimer > 0) {
      this.vx *= Math.exp(-5 * dt);
    } else if (this.attackTimer > 0) {
      this.vx *= Math.exp(-8.5 * dt);
      // Emit crisp ghost afterimages during high-momentum combo finishers & spin/flurry/dash-slash
      if (this.currentMove?.afterimages && this.lastJoints) {
        this.attackAfterimageTimer -= dt;
        if (this.attackAfterimageTimer <= 0) {
          this.attackAfterimageTimer = 0.042;
          this.afterimages.push({
            x: this.x,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.19,
            color: this.awakened ? this.character.awakeningWaveColor : this.character.accentColor,
          });
        }
      }
    } else if (this.danceTimer > 0) {
      this.vx *= Math.exp(-12 * dt);
    } else {
      if (moveAxis !== 0) {
        // Trigger stylish brake skid when reversing direction at high ground sprint speed
        if (this.onGround && Math.abs(this.vx) > 290 && Math.sign(this.vx) !== moveAxis) {
          this.brakeTimer = 0.12;
          particles.emitSmoke(this.x, GROUND_Y, 2, '#94a3b8', -18, 14);
        }
        this.facing = moveAxis > 0 ? 1 : -1;
        const accel = this.onGround ? 3600 : 2300;
        this.vx = clamp(this.vx + moveAxis * accel * dt, -maxSpeed, maxSpeed);
      } else {
        if (this.onGround && Math.abs(this.vx) > 310) {
          this.brakeTimer = 0.1;
        }
        const decel = this.onGround ? 15 : 4;
        this.vx *= Math.exp(-decel * dt);
        if (Math.abs(this.vx) < 8) this.vx = 0;
      }
    }

    // Coyote time & Multi-Jump [W / Space] (2 jumps standard, 3 for Zero!)
    if (this.onGround) {
      this.coyoteTimer = 0.1;
      this.jumpsLeft = this.character.maxJumps;
      this.airComboStep = 0;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (
      input.consumeBuffered('jump') &&
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0 &&
      (this.coyoteTimer > 0 || this.jumpsLeft > 0)
    ) {
      const isDouble = this.coyoteTimer <= 0;
      this.vy = isDouble ? -705 : -765;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpsLeft = Math.max(0, isDouble ? this.jumpsLeft - 1 : this.character.maxJumps - 1);
      this.danceTimer = 0;
      this.attackTimer = 0;
      this.currentMove = null;
      this.activeHitbox = null;
      this.poseTime = 0;
      if (isDouble) {
        this.airFlipTimer = 0.32;
      }
      this.scaleX = 0.84;
      this.scaleY = 1.22;
      audio.playJump();
      particles.emitSmoke(
        this.x,
        this.y - 4,
        isDouble ? 6 : 4,
        isDouble ? this.character.accentColor : '#94a3b8',
        -30,
        18
      );
      if (isDouble) {
        particles.emitShockwave(this.x, this.y - 6, this.character.accentColor, 46, 0.22);
      }
    }

    // Variable jump height cut when jump key released early
    if (!input.isHeld('jump') && this.vy < -280 && this.dashTimer <= 0 && !this.airSlamPendingImpact) {
      this.vy *= Math.pow(0.55, dt * 16);
    }

    // Gravity & Integration
    if (this.dashTimer <= 0) {
      const gravityScale = this.airSlamPendingImpact
        ? 2.2
        : !this.onGround && this.attackTimer > 0
          ? 0.28
          : 1;
      this.vy += GRAVITY * gravityScale * dt;
    }
    const prevX = this.x;
    this.x = clamp(this.x + this.vx * dt, 42, ARENA_WIDTH - 42);
    this.y += this.vy * dt;

    if (this.onGround && Math.abs(this.x - prevX) > 0.2) {
      this.walkPhase += Math.abs(this.x - prevX) * 0.088;
      const strideStep = Math.floor(this.walkPhase / Math.PI);
      if (strideStep !== this.lastStrideStep && Math.abs(this.vx) > 220) {
        this.lastStrideStep = strideStep;
        particles.emitSmoke(
          this.x - this.facing * 12,
          GROUND_Y - 2,
          1,
          this.awakened ? this.character.awakeningWaveColor : '#94a3b8',
          -14,
          10
        );
      }
    }

    // Ground landing (plus explosive Meteor Air Slam shockwave & Awakened Kagura Supernova!)
    if (this.y >= GROUND_Y) {
      if (!this.onGround && this.vy > 220) {
        this.scaleX = this.airSlamPendingImpact ? 1.34 : 1.22;
        this.scaleY = this.airSlamPendingImpact ? 0.68 : 0.78;
        particles.emitSmoke(this.x, GROUND_Y, this.airSlamPendingImpact ? 10 : 4, '#64748b', -30, 26);
        if (this.airSlamPendingImpact) {
          this.airSlamPendingImpact = false;
          particles.emitGroundCrack(
            this.x + this.facing * 26,
            66,
            this.awakened ? this.character.awakeningWaveColor : this.character.accentColor
          );
          particles.emitShockwave(
            this.x,
            GROUND_Y - 10,
            this.awakened ? this.character.awakeningWaveColor : this.character.accentColor,
            115,
            0.28
          );
          // Awakened Kagura Air Slam triggers flanking twin magma pillars!
          if (this.awakened && this.character.id === 'kagura') {
            magmaPillars.push(new MagmaPillar(clamp(this.x - 86, 64, ARENA_WIDTH - 64), -1, 0.06, 52));
            magmaPillars.push(new MagmaPillar(clamp(this.x + 86, 64, ARENA_WIDTH - 64), 1, 0.06, 52));
          }
          camera.addShake(0.42, 0, 1);
          audio.playCryoShatter();
        }
      }
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this.airFlipTimer = 0;
    }

    // Attack Timer & Active Hitbox Window
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      const elapsed = this.attackDuration - this.attackTimer;
      const activeStart = this.attackDuration * 0.14;
      const activeEnd = this.attackDuration * 0.68;
      if (elapsed >= activeStart && elapsed <= activeEnd) {
        if (!this.attackHitIssued) {
          this.attackHitIssued = true;
          this.spawnCurrentHitbox(iceWalls, particles, audio, camera);
        } else if (this.activeHitbox) {
          const reach = (this.awakened ? 136 : 92) + this.character.reachBonus;
          this.activeHitbox.x = this.x + this.facing * (reach * 0.55);
          this.activeHitbox.y = this.y - 50;
        }
      } else {
        this.activeHitbox = null;
      }
      if (this.attackTimer <= 0) {
        this.currentMove = null;
      }
    } else {
      this.activeHitbox = null;
      this.currentMove = null;
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }

    // Smoothly blend skeleton joints every frame (eliminates all pose snapping!)
    this.stepSkeletonBlend(dt);

    // Update Dark Foot Aura & Verlet Scarf
    this.updateAmbientAura(dt, particles, false);
    const neckX = this.x + this.facing * 2;
    const neckY = this.y - 72;
    const windX = -this.vx * 2.4 - this.facing * (this.awakened ? 1050 : 620);
    stepVerletScarf(this.scarf, neckX, neckY, windX, 420, 9.5, dt);
  }

  private stepSkeletonBlend(dt: number): void {
    const pose = this.getCurrentPose();
    const target = computeStickmanSkeleton(pose, this.poseTime, this.walkPhase);
    if (!this.blendedJoints) {
      this.blendedJoints = target;
      return;
    }
    // High blend rate during sharp combat strikes for crisp anime snap; silky smooth during locomotion
    const isSnappy =
      this.attackTimer > 0 ||
      this.dashTimer > 0 ||
      this.parryTimer > 0 ||
      this.airFlipTimer > 0;
    const rate = isSnappy ? 30 : 19;
    const alpha = 1 - Math.exp(-rate * dt);
    this.blendedJoints = blendSkeleton(this.blendedJoints, target, alpha);
  }

  private triggerSignatureSkill(params: {
    audio: AudioEngine;
    particles: ParticleSystem;
    camera: Camera;
    iceWalls: IceWall[];
    magmaPillars: MagmaPillar[];
    projectiles: Projectile[];
    onThunderBlinkHit: (fromX: number, toX: number, y: number, dir: 1 | -1, damage: number) => void;
  }): void {
    const { audio, particles, camera, iceWalls, magmaPillars, projectiles, onThunderBlinkHit } = params;
    const kind = this.character.specialKind;

    if (kind === 'cryo_wall') {
      const standingWall = iceWalls.find((w) => w.active && !w.launched);
      if (standingWall) {
        const dir: 1 | -1 = standingWall.x >= this.x ? 1 : -1;
        this.facing = dir;
        this.cryoPunchTimer = 0.25;
        this.poseTime = 0;
        standingWall.launch(dir, particles);
        audio.playCryoShatter();
        camera.addShake(0.42, dir, 0);
        camera.pulseZoom(1.08, 0.2);
      } else if (this.cryoCooldown <= 0) {
        const spawnX = clamp(this.x + this.facing * 92, 70, ARENA_WIDTH - 70);
        iceWalls.push(new IceWall(spawnX, this.facing));
        this.cryoCooldown = this.cryoCooldownMax;
        this.cryoCastTimer = 0.22;
        this.poseTime = 0;
        audio.playCryoSummon();
        particles.emitIceShards(spawnX, GROUND_Y - 22, 12, this.facing);
        particles.emitGroundCrack(spawnX, 46, this.awakened ? '#ef4444' : '#38bdf8');
        camera.addShake(0.24, 0, -1);

        // Awakened Kuro Upgrade (BĂNG HUYẾT): also launches twin piercing Blood-Ice Waves!
        if (this.awakened) {
          for (const dy of [-74, -38]) {
            projectiles.push(
              new Projectile({
                x: spawnX + this.facing * 18,
                y: this.y + dy,
                vx: this.facing * 1080,
                vy: 0,
                radius: 26,
                damage: 38,
                kind: 'sword_wave',
                fromPlayer: true,
                color: '#ef4444',
                maxLife: 1.0,
              })
            );
          }
          particles.emitText(spawnX, this.y - 108, 'BĂNG HUYẾT!', '#fca5a5', 24);
        }
      }
      return;
    }

    if (this.cryoCooldown > 0) return;

    if (kind === 'thunder_blink') {
      // Raijin: Instant Lightning Blink Piercing Thrust! (Awakened: LÔI ĐÌNH calls 3 Sky Thunderbolts!)
      const startX = this.x;
      const dist = this.awakened ? 390 : 300;
      const endX = clamp(startX + this.facing * dist, 56, ARENA_WIDTH - 56);
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoPunchTimer = 0.24;
      this.invulnTimer = Math.max(this.invulnTimer, 0.36);
      this.poseTime = 0;
      this.danceTimer = 0;

      if (this.lastJoints) {
        const steps = this.awakened ? 7 : 5;
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          const ax = startX + (endX - startX) * t;
          this.afterimages.push({
            x: ax,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: i * 0.02,
            maxLife: 0.3,
            color: i % 2 === 0 ? '#22d3ee' : '#facc15',
          });
          particles.emitLightning(ax, this.y - 48, i % 2 === 0 ? '#38bdf8' : '#fef08a', this.awakened ? 74 : 46);
        }
      }

      if (this.awakened) {
        // 3 Colossal Sky-to-Ground Thunder Pillars along the blink path!
        for (const frac of [0.25, 0.62, 1.0]) {
          const lx = startX + (endX - startX) * frac;
          particles.emitLightning(lx, this.y - 125, '#fef08a', 135);
          particles.emitShockwave(lx, GROUND_Y - 12, '#38bdf8', 95, 0.28);
          particles.emitGroundCrack(lx, 56, '#facc15');
        }
      }

      this.x = endX;
      this.vx = this.facing * 280;
      audio.playLaser();
      particles.emitShockwave(startX, this.y - 48, '#22d3ee', 84, 0.24);
      particles.emitShockwave(endX, this.y - 48, '#facc15', 112, 0.28);
      particles.emitText(endX, this.y - 104, this.awakened ? 'LÔI ĐÌNH GIÁNG THẾ!' : 'LÔI THIỂM!', '#fef08a', 24);
      camera.addShake(this.awakened ? 0.56 : 0.42, this.facing, 0);
      camera.pulseZoom(1.12, 0.22);

      const dmg = Math.round((this.awakened ? 92 : 54) * this.character.damageMultiplier);
      onThunderBlinkHit(startX, endX, this.y - 48, this.facing, dmg);
    } else if (kind === 'magma_eruption') {
      // Kagura: 3 Advancing Magma Pillars (Awakened: HỎA NGỤC spawns 5 Pillars sweeping BOTH sides!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoPunchTimer = 0.28;
      this.poseTime = 0;
      this.danceTimer = 0;
      this.vx = -this.facing * 90;

      const baseDmg = Math.round((this.awakened ? 74 : 48) * this.character.damageMultiplier);
      for (let i = 0; i < 3; i++) {
        const px = clamp(this.x + this.facing * (110 + i * 116), 64, ARENA_WIDTH - 64);
        magmaPillars.push(new MagmaPillar(px, this.facing, 0.08 + i * 0.13, baseDmg));
      }
      if (this.awakened) {
        for (let i = 0; i < 2; i++) {
          const bx = clamp(this.x - this.facing * (105 + i * 110), 64, ARENA_WIDTH - 64);
          magmaPillars.push(new MagmaPillar(bx, -this.facing as 1 | -1, 0.12 + i * 0.14, baseDmg));
        }
      }

      audio.playCryoSummon();
      particles.emitGroundCrack(this.x + this.facing * 42, 68, '#f97316');
      particles.emitText(this.x, this.y - 106, this.awakened ? 'HỎA NGỤC LIÊN HOÀN!' : 'HỎA BẠO CHẤN!', '#fde047', 24);
      camera.addShake(this.awakened ? 0.58 : 0.45, 0, 1);
    } else if (kind === 'phantom_barrage') {
      // Zero: Backstep leap + 5 Kunai Fan (Awakened: THẬP TỰ ĐAO flings 7 Kunai + Forward Void Crescent!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoCastTimer = 0.24;
      this.invulnTimer = Math.max(this.invulnTimer, 0.24);
      this.poseTime = 0;
      this.danceTimer = 0;
      this.vx = -this.facing * 260;
      this.vy = -345;
      this.onGround = false;

      const angles = this.awakened
        ? [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36]
        : [-0.26, -0.13, 0, 0.13, 0.26];
      const speed = this.awakened ? 1200 : 980;
      const dmg = Math.round((this.awakened ? 36 : 24) * this.character.damageMultiplier);
      for (const a of angles) {
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 28,
            y: this.y - 58,
            vx: Math.cos(a) * speed * this.facing,
            vy: Math.sin(a) * speed,
            radius: 16,
            damage: dmg,
            kind: 'kunai',
            fromPlayer: true,
            color: '#10b981',
            maxLife: 0.95,
          })
        );
      }
      if (this.awakened) {
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 46,
            y: this.y - 56,
            vx: this.facing * 1080,
            vy: 0,
            radius: 40,
            damage: 44,
            kind: 'void_crescent',
            fromPlayer: true,
            color: '#34d399',
            maxLife: 1.05,
          })
        );
      }

      audio.playSlash(3, this.awakened);
      particles.emitShockwave(this.x, this.y - 52, '#34d399', 80, 0.26);
      particles.emitText(this.x, this.y - 104, this.awakened ? 'THẬP TỰ ẢNH ĐAO!' : 'PHI ĐAO!', '#6ee7b7', 24);
      camera.addShake(0.32, -this.facing, 0);
    }
  }

  private startAttack(
    audio: AudioEngine,
    particles: ParticleSystem,
    camera: Camera,
    iceWalls: IceWall[],
    magmaPillars: MagmaPillar[],
    projectiles: Projectile[],
    onThunderBlinkHit: (fromX: number, toX: number, y: number, dir: 1 | -1, damage: number) => void
  ): void {
    this.danceTimer = 0;
    this.attackHitIssued = false;
    this.attackAfterimageTimer = 0;

    // Determine Attack Context: Parry Counter > Iaido Dash-Slash > 3-Hit Air Combo > 6-Hit Ground Combo
    let context: AttackContext = 'ground';
    let step = 1;
    if (this.parryCounterWindow > 0) {
      context = 'parry_counter';
      this.parryCounterWindow = 0;
      particles.emitText(this.x, this.y - 102, 'PHẢN CÔNG!', '#7dd3fc', 22);
    } else if (this.dashTimer > 0 || this.dashGraceTimer > 0) {
      context = 'dash_slash';
      this.dashTimer = 0;
      this.dashGraceTimer = 0;
    } else if (!this.onGround) {
      context = 'air';
      this.airComboStep = (this.airComboStep % 3) + 1;
      step = this.airComboStep;
    } else {
      context = 'ground';
      this.comboStep = (this.comboStep % 6) + 1;
      step = this.comboStep;
    }

    const move = getComboMoveForCharacter(this.character.id, step, context);
    this.currentMove = move;
    const speedFactor = (this.awakened ? 0.8 : 1) * this.character.attackSpeedMultiplier;
    this.attackDuration = move.duration * speedFactor;
    this.attackTimer = this.attackDuration;
    this.comboResetTimer = 0.88;
    this.poseTime = 0;
    this.airFlipTimer = 0;

    // Expressive squash-and-stretch impulse on strike
    this.scaleX = move.heavy ? 1.2 : 1.1;
    this.scaleY = move.heavy ? 0.84 : 0.92;

    // Forward combat lunge + acrobatic micro-hop on rising uppercuts & aerial vault slams!
    const lungeMult = this.character.id === 'raijin' ? 1.18 : this.character.id === 'zero' ? 1.14 : 1;
    this.vx = this.facing * move.lungeSpeed * lungeMult;
    if (!this.onGround) {
      if (move.pose === 'air_slam') {
        this.vy = 680; // Meteor dive plunge!
        this.airSlamPendingImpact = true;
      } else {
        this.vy = Math.min(this.vy, -175); // Crisp anime air-combo hang
      }
    } else if (move.hopVy) {
      this.vy = move.hopVy;
      this.onGround = false;
    }

    audio.playSlash(Math.min(4, step), this.awakened || move.heavy);

    // Spawn multi-layered dynamic sweeping anime slash smear wedges
    const baseRadius = (this.awakened ? 112 : 78) + this.character.reachBonus * 0.55;
    const [normalCol, heavyCol] = this.character.slashColors;
    const outerColor = this.awakened || move.heavy ? heavyCol : normalCol;
    for (let i = 0; i < move.slashArcs.length; i++) {
      const arc = move.slashArcs[i];
      this.slashTrails.push({
        x: this.x + this.facing * (22 + i * 7),
        y: this.y + arc.yOffset,
        facing: this.facing,
        radius: baseRadius * arc.radiusScale,
        startAngle: arc.sa,
        endAngle: arc.ea,
        life: 0,
        maxLife: (this.awakened ? 0.25 : 0.2) + i * 0.03,
        outerColor: i === 0 ? outerColor : '#f8fafc',
        coreColor: '#ffffff',
        thickness: (this.awakened ? 21 : this.character.id === 'kagura' ? 18 : 15) - i * 3,
      });
    }

    // Character-specific Basic Attack Elemental Flair & Combo Finishers (exciting even BEFORE Awakening!)
    const strikeX = this.x + this.facing * 56;
    const strikeY = this.y - 52;
    if (this.character.id === 'kuro') {
      if (step === 1 && context === 'ground') {
        particles.emitSparks(strikeX, strikeY, 8, '#c084fc', 380);
      } else if (step === 6 && context === 'ground') {
        particles.emitShockwave(strikeX, strikeY, '#ef4444', 96, 0.24);
        particles.emitSparks(strikeX, strikeY, 14, '#fca5a5', 460);
      }
    } else if (this.character.id === 'raijin') {
      if (step === 1 || step === 3 || step === 4 || step === 6) {
        particles.emitLightning(strikeX + this.facing * 18, strikeY, step >= 4 ? '#facc15' : '#38bdf8', 56);
      }
      if (step === 6 && context === 'ground' && !this.awakened) {
        projectiles.push(
          new Projectile({
            x: strikeX,
            y: strikeY,
            vx: this.facing * 1160,
            vy: 0,
            radius: 22,
            damage: 26,
            kind: 'volt_lance',
            fromPlayer: true,
            color: '#38bdf8',
            maxLife: 0.65,
          })
        );
      }
    } else if (this.character.id === 'kagura') {
      particles.emitEmbers(strikeX, strikeY + 12, step === 6 ? 16 : 6, '#fb923c');
      if (step === 6 && context === 'ground' && !this.awakened) {
        const px = clamp(this.x + this.facing * 95, 64, ARENA_WIDTH - 64);
        magmaPillars.push(new MagmaPillar(px, this.facing, 0.08, 34));
      }
    } else if (this.character.id === 'zero') {
      if (step === 1 || step === 4 || step === 6) {
        particles.emitSparks(strikeX, strikeY, 9, '#34d399', 410);
      }
      if ((step === 4 || step === 6) && context === 'ground' && !this.awakened) {
        const spread = step === 6 ? [-0.14, 0, 0.14] : [0];
        for (const ang of spread) {
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 36,
              y: this.y - 56,
              vx: Math.cos(ang) * this.facing * 1100,
              vy: Math.sin(ang) * 1100,
              radius: 16,
              damage: 20,
              kind: 'kunai',
              fromPlayer: true,
              color: '#10b981',
              maxLife: 0.85,
            })
          );
        }
      }
    }

    // DISTINCT AWAKENED MOVESET EFFECTS PER CHARACTER!
    if (this.awakened) {
      if (this.character.id === 'kuro') {
        // Kuro (HUYẾT KIẾM): Blazing Blood Crescent Wave + Twin Cross Wave on Combo 6!
        const angles = step === 6 ? [-0.12, 0.12] : [0];
        for (const a of angles) {
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 52,
              y: this.y - 54,
              vx: Math.cos(a) * this.facing * 1020,
              vy: Math.sin(a) * 1020,
              radius: 38,
              damage: Math.round(36 * this.character.damageMultiplier),
              kind: 'sword_wave',
              fromPlayer: true,
              color: '#ef4444',
              maxLife: 1.15,
            })
          );
        }
      } else if (this.character.id === 'raijin') {
        // Raijin (LÔI THẦN): Calls down Sky-to-Ground Thunder Strike ahead + Piercing Volt Lance!
        const boltX = clamp(this.x + this.facing * 135, 56, ARENA_WIDTH - 56);
        particles.emitLightning(boltX, this.y - 120, '#fef08a', 120);
        particles.emitShockwave(boltX, GROUND_Y - 12, '#38bdf8', 72, 0.22);
        onThunderBlinkHit(boltX - 38, boltX + 38, this.y - 52, this.facing, 24);
        if (step % 2 === 0 || move.heavy) {
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 52,
              y: this.y - 54,
              vx: this.facing * 1300,
              vy: 0,
              radius: 32,
              damage: Math.round(34 * this.character.damageMultiplier),
              kind: 'volt_lance',
              fromPlayer: true,
              color: '#38bdf8',
              maxLife: 1.0,
            })
          );
        }
      } else if (this.character.id === 'kagura') {
        // Kagura (VIÊM ĐẾ): Molten Fire Wave + Erupting Ground Magma Geyser on Heavy/3/6 hits!
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 52,
            y: this.y - 54,
            vx: this.facing * 920,
            vy: 0,
            radius: 40,
            damage: Math.round(36 * this.character.damageMultiplier),
            kind: 'fire_wave',
            fromPlayer: true,
            color: '#f97316',
            maxLife: 1.1,
          })
        );
        if (move.heavy || step === 3 || step === 6) {
          const mx = clamp(this.x + this.facing * 118, 64, ARENA_WIDTH - 64);
          magmaPillars.push(new MagmaPillar(mx, this.facing, 0.06, 42));
        }
      } else if (this.character.id === 'zero') {
        // Zero (ẢNH VƯƠNG): Shadow Clone Echo Double-Crescent + Emerald Mirage Afterimage!
        for (const vy of [-115, 115]) {
          projectiles.push(
            new Projectile({
              x: this.x + this.facing * 46,
              y: this.y - 54,
              vx: this.facing * 1060,
              vy,
              radius: 30,
              damage: Math.round(24 * this.character.damageMultiplier),
              kind: 'void_crescent',
              fromPlayer: true,
              color: '#10b981',
              maxLife: 0.92,
            })
          );
        }
        if (this.lastJoints) {
          this.afterimages.push({
            x: this.x - this.facing * 26,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.24,
            color: '#34d399',
          });
        }
      }
      camera.addShake(0.16, this.facing, 0);
    }

    // Also allow punching/striking a nearby standing IceWall with [J]!
    for (const wall of iceWalls) {
      if (
        wall.active &&
        !wall.launched &&
        Math.abs(wall.x - this.x) < 125 &&
        Math.sign(wall.x - this.x || this.facing) === this.facing
      ) {
        wall.launch(this.facing, particles);
        audio.playCryoShatter();
        camera.addShake(0.38, this.facing, 0);
      }
    }
  }

  private spawnCurrentHitbox(
    _iceWalls: IceWall[],
    particles: ParticleSystem,
    _audio: AudioEngine,
    _camera: Camera
  ): void {
    const move = this.currentMove;
    const extraReach = move?.pose === 'dash_slash' || move?.pose === 'spear_thrust' ? 28 : 0;
    const reach = (this.awakened ? 138 : 92) + this.character.reachBonus + extraReach;
    const baseDmg = move ? move.baseDamage : 20;
    const damage = Math.round(baseDmg * this.character.damageMultiplier * (this.awakened ? 1.55 : 1));
    const heavy = Boolean(move?.heavy || this.awakened);

    if (heavy && this.onGround) {
      particles.emitGroundCrack(
        this.x + this.facing * 52,
        48,
        this.awakened ? this.character.awakeningWaveColor : this.character.accentColor
      );
    }

    this.activeHitbox = {
      id: this.hitboxSeq++,
      x: this.x + this.facing * (reach * 0.55),
      y: this.y - 50,
      width: reach,
      height: this.awakened ? 116 : 92,
      damage,
      knockX: this.facing * (move ? move.knockX : heavy ? 360 : 175),
      knockY: move ? move.knockY : -100,
      heavy,
      unblockable: Boolean(this.awakened || move?.unblockable),
      hitIds: new Set<number>(),
    };
  }

  private updateAmbientAura(dt: number, particles: ParticleSystem, onChair: boolean): void {
    this.auraTimer -= dt;
    if (this.auraTimer <= 0) {
      this.auraTimer = this.awakened ? 0.045 : 0.085;
      particles.emitSmoke(
        this.x,
        this.y - 6,
        1,
        this.awakened ? this.character.awakeningWaveColor : this.character.glowColor,
        -75,
        24
      );
      if (this.awakened) {
        particles.emitEmbers(this.x, this.y - 30, 1, this.character.awakeningWaveColor);
      }
    }
    if (onChair || this.awakened || this.character.id === 'raijin') {
      this.chairLightningTimer -= dt;
      if (this.chairLightningTimer <= 0) {
        this.chairLightningTimer = this.awakened ? 0.14 : 0.34;
        particles.emitLightning(
          this.x + (Math.random() - 0.5) * 46,
          this.y - 24 - Math.random() * 48,
          this.awakened ? this.character.awakeningWaveColor : this.character.accentColor,
          36
        );
      }
    }
  }

  public getCurrentPose(): StickPoseName {
    if (this.hp <= 0) return 'ko';
    if (this.sittingOnChair) return 'chair_idle';
    if (this.chairKickTimer > 0) return 'chair_kick';
    if (this.awakenPoseTimer > 0) return 'awaken_pose';
    if (this.hurtTimer > 0) return 'hurt';
    if (this.parryTimer > 0 || this.parryFlashTimer > 0.1) return 'parry';
    if (this.cryoPunchTimer > 0) return 'cryo_punch';
    if (this.cryoCastTimer > 0) return 'cryo_cast';
    if (this.dashTimer > 0) return 'dash';
    if (this.attackTimer > 0 && this.currentMove) {
      return this.currentMove.pose;
    }
    if (this.danceTimer > 0) return 'victory_dance';
    if (!this.onGround) {
      if (this.airFlipTimer > 0) return 'double_jump_flip';
      return this.vy < 0 ? 'jump' : 'fall';
    }
    if (this.brakeTimer > 0) return 'brake_skid';
    if (Math.abs(this.vx) > 35) return 'run';
    return 'idle';
  }

  public render(ctx: CanvasRenderingContext2D, silhouetteMode = false): void {
    // Render dash & combo afterimages first
    if (!silhouetteMode) {
      renderAfterimages(ctx, this.afterimages);
    }

    // Render Parry Defensive Arc Ring when active
    if (this.parryFlashTimer > 0 && !silhouetteMode) {
      const alpha = this.parryFlashTimer / 0.24;
      ctx.save();
      ctx.translate(this.x + this.facing * 24, this.y - 52);
      ctx.scale(this.facing, 1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 48, -1.35, 1.35);
      ctx.stroke();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 48, -1.35, 1.35);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 48, -1.25, 1.25);
      ctx.stroke();
      ctx.restore();
    }

    // Render Protagonist Stickman using smoothly blended joints + distinct Awakened visual form!
    const pose = this.getCurrentPose();
    const awakenedProfile = this.awakened ? getAwakenedVisualProfile(this.character.id) : null;
    this.lastJoints = renderStickman(ctx, {
      x: this.x,
      y: this.y,
      facing: this.facing,
      pose,
      poseTime: this.poseTime,
      walkPhase: this.walkPhase,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      bodyColor: this.awakened ? this.character.awakenedBodyColor : this.character.bodyColor,
      glowColor: this.awakened ? this.character.awakeningWaveColor : this.character.glowColor,
      lineWidth: this.awakened ? 10.6 : 10.2,
      headRadius: 12.8,
      hitFlash: this.hitFlash,
      silhouette: false,
      scarf: this.scarf,
      scarfPrimary: awakenedProfile ? awakenedProfile.scarfPrimary : this.character.scarfPrimary,
      scarfHighlight: awakenedProfile ? awakenedProfile.scarfHighlight : this.character.scarfHighlight,
      hasSheath: this.character.hasSheath,
      headGear: this.character.headGear,
      darkAura: this.awakened ? this.character.awakenedAuraStyle : this.character.auraStyle,
      weapon: this.awakened ? this.character.awakenedWeapon : this.character.weapon,
      awakenedForm: this.awakened ? this.character.id : null,
      jointsOverride: this.blendedJoints ?? undefined,
    });

    // Render Slash Trails on top
    if (!silhouetteMode) {
      renderSlashTrails(ctx, this.slashTrails);
    }
  }
}
