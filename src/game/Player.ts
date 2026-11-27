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
import type { CharacterId, ScarfNode, SkinId } from './types';
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
import {
  IceWall,
  MagmaPillar,
  MirrorRift,
  PlasticChair,
  Projectile,
  type TemporalEchoStrike,
  type TemporalPoseSnapshot,
} from './Entities';
import { getElementalMarkSpec } from './synergy';
import { getSkinVfxProfile, type SkinParticleAccentKind } from './skinVfx';
import { colorWithAlpha, finiteOr } from './renderer/inkStyle';

export function emitSkinAccentParticle(
  particles: ParticleSystem,
  kind: SkinParticleAccentKind,
  x: number,
  y: number,
  count: number,
  color: string,
  dir: 1 | -1 = 1,
  speed = 420
): void {
  switch (kind) {
    case 'feather':
      particles.emitFeathers(x, y, count, color);
      break;
    case 'petal':
      particles.emitPetals(x, y, count, color);
      break;
    case 'star':
      particles.emitStars(x, y, count, color);
      break;
    case 'shard':
      particles.emitShards(x, y, count, color);
      break;
    case 'ink_splatter':
      particles.emitInkSplatter(x, y, count, color);
      break;
    case 'ice':
      particles.emitIceShards(x, y, count, dir);
      break;
    case 'ember':
      particles.emitEmbers(x, y, count, color);
      break;
    case 'lightning':
      for (let i = 0; i < Math.min(3, count); i++) {
        particles.emitLightning(x + (i - 1) * 18, y, color, 42);
      }
      break;
    case 'smoke':
      particles.emitSmoke(x, y, count, color, -55, 22);
      break;
    case 'spark':
    default:
      particles.emitSparks(x, y, count, color, speed);
      break;
  }
}

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
  applyMarkStacks?: number;
  detonateMark?: boolean;
  isLinkArt?: boolean;
  hitIds: Set<number>;
}

export interface SkillLinkWarpResult {
  warpedToX?: number;
  warpedFacing?: 1 | -1;
}

export class Player {
  public character: CharacterDefinition = CHARACTER_ROSTER.kuro;
  public skinId: SkinId = 'default';
  public x = ARENA_WIDTH * 0.5;
  public y = GROUND_Y;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;
  public onGround = true;
  public pendingBoomerangThrow: {
    x: number;
    y: number;
    dir: 1 | -1;
    damage: number;
    primaryColor: string;
    secondaryColor: string;
  } | null = null;
  public pendingTemporalEcho: {
    x: number;
    y: number;
    facing: 1 | -1;
    pose: StickPoseName;
    poseTime: number;
    walkPhase: number;
    skinId: SkinId;
    awakened: boolean;
    damage: number;
    primaryColor: string;
    secondaryColor: string;
    initialStrike?: Omit<TemporalEchoStrike, 'triggerTime'>;
  } | null = null;
  public pendingTemporalStrikes: TemporalEchoStrike[] = [];
  private temporalClock = 0;
  private temporalHistory: TemporalPoseSnapshot[] = [];
  public pendingMirrorRifts: {
    x: number;
    y: number;
    damage: number;
    awakened: boolean;
    primaryColor: string;
    secondaryColor: string;
  }[] = [];
  public pendingInkSeals: {
    x: number;
    y: number;
    damage: number;
    awakened: boolean;
    skinId?: SkinId;
  }[] = [];

  public hp = 150;
  public maxHp = 150;
  public trailHp = 150;
  public rage = 0;
  public maxRage = 100;
  public awakening = 0;
  public maxAwakening = 100;
  public awakened = false;
  public awakenTimer = 0;
  public readonly awakenDuration = 12.5;

  public sittingOnChair = true;
  public chairKickTimer = 0;
  public danceTimer = 0;
  public awakenPoseTimer = 0;

  // Physics & responsive platforming
  public jumpsLeft = 2;
  public coyoteTimer = 0;
  public airFlipTimer = 0;
  public brakeTimer = 0;
  public landTimer = 0;
  private landDuration = 0.15;
  private prevPose: StickPoseName = 'idle';
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
  private attackHitsIssued = 0;
  private attackAfterimageTimer = 0;
  private hitboxForwardOffset = 0;
  private findAttackTarget: ((x: number, y: number, range: number) => { x: number; y: number } | null) | null = null;

  // Parry
  public parryTimer = 0;
  public parryCooldown = 0;
  public readonly parryCooldownMax = 0.52;
  public parryFlashTimer = 0;
  public parryCounterWindow = 0;

  // Signature Skill [U] & Skill-to-Skill Link Synergy
  public cryoCooldown = 0;
  public cryoCooldownMax = 3.2;
  public cryoCastTimer = 0;
  public cryoPunchTimer = 0;
  public skillLinkTimer = 0;
  public kaguraAirDivePending = false;
  private activeAttackIsLinkArt = false;
  private activeAttackDetonates = false;
  private activeAttackMarkStacks = 0;

  // Scarf, Smooth Blended Skeleton & VFX
  public static readonly MAX_SLASH_TRAILS = 24;
  public static readonly MAX_AFTERIMAGES = 24;
  public scarf: ScarfNode[] = [];
  public afterimages: Afterimage[] = [];
  public slashTrails: SlashTrail[] = [];
  public lastJoints: SkeletonJoints | null = null;
  public blendedJoints: SkeletonJoints | null = null;
  private auraTimer = 0;
  private accentAuraTimer = 0;
  private chairLightningTimer = 0;
  private lastStrideStep = 0;

  private pushAfterimage(item: Afterimage): void {
    if (this.afterimages.length >= Player.MAX_AFTERIMAGES) {
      this.afterimages.shift();
    }
    this.afterimages.push({
      ...item,
      skinId: item.skinId ?? this.skinId,
      awakened: item.awakened ?? this.awakened,
      characterId: item.characterId ?? this.character.id,
    });
  }

  private pushSlashTrail(item: SlashTrail): void {
    if (this.slashTrails.length >= Player.MAX_SLASH_TRAILS) {
      this.slashTrails.shift();
    }
    this.slashTrails.push(item);
  }

  private tickAndPruneVfx(dt: number): void {
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
  }

  public getActiveVfxCounts(): { slashTrails: number; afterimages: number } {
    return {
      slashTrails: this.slashTrails.length,
      afterimages: this.afterimages.length,
    };
  }

  public setCharacter(id: CharacterId, skinId: SkinId = 'default'): void {
    this.skinId = skinId;
    this.character = getCharacterDef(id, skinId);
    this.maxHp = this.character.maxHp;
    this.dashCooldownMax = this.character.dashCooldown;
    this.cryoCooldownMax = this.character.specialCooldown;
    if (this.hp > this.maxHp || this.sittingOnChair) {
      this.hp = this.maxHp;
      this.trailHp = this.maxHp;
    }
    this.jumpsLeft = this.character.maxJumps;
    this.slashTrails = [];
    this.afterimages = [];
    this.temporalHistory = [];
    this.pendingTemporalStrikes = [];
    this.pendingTemporalEcho = null;
    this.pendingInkSeals = [];
  }

  public getTemporalSnapshotDelayed(delaySec = 0.4): TemporalPoseSnapshot | null {
    if (this.temporalHistory.length === 0) return null;
    const targetTime = this.temporalClock - Math.max(0, finiteOr(delaySec, 0.4));
    if (targetTime <= this.temporalHistory[0].time) {
      return { ...this.temporalHistory[0] };
    }
    for (let i = this.temporalHistory.length - 1; i >= 0; i--) {
      if (this.temporalHistory[i].time <= targetTime) {
        return { ...this.temporalHistory[i] };
      }
    }
    return { ...this.temporalHistory[0] };
  }

  private recordTemporalSnapshot(dt: number): void {
    this.temporalClock += Math.max(0, dt);
    if (this.character.id !== 'chrono') {
      if (this.temporalHistory.length > 0) this.temporalHistory = [];
      return;
    }
    this.temporalHistory.push({
      time: this.temporalClock,
      x: this.x,
      y: this.y,
      facing: this.facing,
      pose: this.getCurrentPose(),
      poseTime: this.poseTime,
      walkPhase: this.walkPhase,
    });
    const cutoff = this.temporalClock - 1.15;
    while (this.temporalHistory.length > 2 && this.temporalHistory[1].time < cutoff) {
      this.temporalHistory.shift();
    }
  }

  public reset(x = ARENA_WIDTH * 0.5, sitOnChair = true): void {
    this.maxHp = this.character.maxHp;
    this.dashCooldownMax = this.character.dashCooldown;
    this.cryoCooldownMax = this.character.specialCooldown;
    this.bonusParryWindow = 0;
    this.blessingSpeedBonus = 0;
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
    this.landTimer = 0;
    this.landDuration = 0.15;
    this.prevPose = 'idle';
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
    this.skillLinkTimer = 0;
    this.kaguraAirDivePending = false;
    this.activeAttackIsLinkArt = false;
    this.activeAttackDetonates = false;
    this.activeAttackMarkStacks = 0;
    this.afterimages = [];
    this.slashTrails = [];
    this.temporalClock = 0;
    this.temporalHistory = [];
    this.pendingTemporalStrikes = [];
    this.pendingTemporalEcho = null;
    this.blendedJoints = null;
    this.scarf = createScarfChain(this.x, this.y - 72, 9, 9);
  }

  public notifyPerfectParry(): void {
    this.parryCounterWindow = 0.72;
    this.skillLinkTimer = Math.max(this.skillLinkTimer, 0.9);
  }

  public standUpFromChair(chair: PlasticChair | null, audio: AudioEngine, particles: ParticleSystem): void {
    if (!this.sittingOnChair) return;
    this.sittingOnChair = false;
    this.chairKickTimer = 0.25;
    this.landTimer = 0;
    this.poseTime = 0;
    this.vy = -260;
    this.onGround = false;
    if (chair) {
      chair.kick(this.facing);
    }
    audio.playChairKick();
    const vfx = getSkinVfxProfile(this.character.id, this.skinId);
    particles.emitSparks(this.x - 10, this.y - 26, 12, vfx.particlePrimary, 380);
    particles.emitShockwave(this.x, this.y - 30, vfx.impactRingColor, 70, 0.25);
    emitSkinAccentParticle(particles, vfx.swingParticleKind, this.x, this.y - 34, 5, vfx.particleSecondary, this.facing);
  }

  public bonusParryWindow = 0;
  public blessingSpeedBonus = 0;

  public applyBlessingStats(
    maxHpBonus: number,
    dashCdMult: number,
    parryWindowBonus: number,
    maxHpMult = 1,
    attackMoveSpeedBonus = 0
  ): void {
    const prevMax = this.maxHp;
    this.maxHp = Math.max(40, Math.round((this.character.maxHp + maxHpBonus) * maxHpMult));
    if (this.maxHp > prevMax) {
      this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMax));
      this.trailHp = Math.max(this.trailHp, this.hp);
    } else if (this.hp > this.maxHp) {
      this.hp = this.maxHp;
      this.trailHp = Math.min(this.trailHp, this.maxHp);
    }
    this.dashCooldownMax = Math.max(0.22, Number((this.character.dashCooldown * dashCdMult).toFixed(2)));
    this.bonusParryWindow = parryWindowBonus;
    this.blessingSpeedBonus = clamp(attackMoveSpeedBonus, 0, 0.48);
  }

  public isParrying(): boolean {
    return isWithinParryWindow(this.parryTimer, this.character.parryWindow + this.bonusParryWindow);
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
    this.awakenPoseTimer = 0.56;
    this.invulnTimer = Math.max(this.invulnTimer, 0.95);
    this.hp = Math.min(this.maxHp, this.hp + 20);
    // Awakening-Cancel Flow: instantly refresh [U] Skill & [L] Dash + open Skill Link window!
    this.cryoCooldown = 0;
    this.dashCooldown = 0;
    this.skillLinkTimer = 1.25;
    this.poseTime = 0;
    this.vx = 0;

    const vfx = getSkinVfxProfile(this.character.id, this.skinId);
    const profile = getAwakenedVisualProfile(this.character.id, this.skinId);
    const waveCol = vfx.impactRingColor;
    audio.playAwaken();
    camera.pulseZoom(1.26, 0.58);
    camera.addShake(0.72, 0, -1);
    particles.emitShockwave(this.x, this.y - 52, waveCol, 210, 0.44);
    particles.emitShockwave(this.x, this.y - 52, '#ffffff', 140, 0.32);
    if (this.character.id === 'mirage') {
      particles.emitShards(this.x, this.y - 56, 18, vfx.slashSecondary, 300, 1.15);
      particles.emitShards(this.x, this.y - 56, 10, '#ffffff', 240, 0.9);
    } else {
      particles.emitSlashBeam(this.x, this.y - 56, -0.35, 320, vfx.slashSecondary, 14);
      particles.emitSlashBeam(this.x, this.y - 56, 0.35, 320, '#ffffff', 10);
    }
    particles.emitEmbers(this.x, this.y - 55, 36, vfx.particlePrimary);
    particles.emitSparks(this.x, this.y - 60, 26, '#ffffff', 660);
    particles.emitGroundCrack(this.x, 82, waveCol);
    emitSkinAccentParticle(
      particles,
      vfx.finisherParticleKind,
      this.x,
      this.y - 56,
      12,
      vfx.particleSecondary,
      this.facing
    );

    // Character-specific dramatic Awakening Transformation Burst FX!
    if (this.character.id === 'raijin') {
      for (let i = -2; i <= 2; i++) {
        particles.emitLightning(
          this.x + i * 38,
          this.y - 95,
          i % 2 === 0 ? vfx.particleSecondary : vfx.particlePrimary,
          90
        );
      }
      audio.playLaser();
    } else if (this.character.id === 'kagura') {
      particles.emitEmbers(this.x - 40, this.y - 65, 24, vfx.particleSecondary);
      particles.emitEmbers(this.x + 40, this.y - 65, 24, vfx.particlePrimary);
      particles.emitShockwave(this.x, this.y - 52, vfx.impactRingColor, 160, 0.38);
    } else if (this.character.id === 'zero') {
      if (this.lastJoints) {
        for (const ox of [-72, -36, 36, 72]) {
          this.pushAfterimage({
            x: this.x + ox,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.48,
            color: vfx.afterimageColor,
          });
        }
      }
    } else if (this.character.id === 'aether') {
      // Aether (Char 5) Upgraded Awakening: 4-Ring Prismatic Constellation Nova + 6-Ray Starlight Hexagram!
      const prism = ['#38bdf8', '#e879f9', '#fde047', '#34d399'];
      for (let i = 0; i < prism.length; i++) {
        particles.emitShockwave(this.x, this.y - 54, prism[i], 90 + i * 42, 0.24 + i * 0.07);
      }
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3 + 0.2;
        particles.emitSlashBeam(this.x, this.y - 54, ang, 290, prism[i % prism.length], 13);
      }
      particles.emitChainArc(this.x - 110, this.y - 54, this.x + 110, this.y - 54, '#f0abfc', 4.5);
      particles.emitSparks(this.x, this.y - 54, 30, '#fde047', 560);
      audio.playLaser();
    } else if (this.character.id === 'valkyrie') {
      // Valkyrie (Char 6) 100% Exclusive Awakening: Heaven's Pillar + Feather Vortex + Divine Heal + Auto Awakened Glaive Throw!
      this.hp = Math.min(this.maxHp, this.hp + 15);
      this.pendingBoomerangThrow = {
        x: this.x + this.facing * 28,
        y: this.y - 56,
        dir: this.facing,
        damage: 28,
        primaryColor: vfx.slashPrimary,
        secondaryColor: vfx.slashSecondary,
      };
      particles.emitSlashBeam(this.x, this.y - 120, Math.PI * 0.5, 340, vfx.slashPrimary, 24);
      particles.emitSlashBeam(this.x, this.y - 120, Math.PI * 0.5, 300, '#ffffff', 12);
      particles.emitShockwave(this.x, this.y - 12, vfx.impactRingColor, 200, 0.44);
      particles.emitShockwave(this.x, this.y - 68, vfx.slashSecondary, 140, 0.34);
      emitSkinAccentParticle(particles, 'feather', this.x, this.y - 62, 26, vfx.particlePrimary, this.facing);
      emitSkinAccentParticle(particles, 'feather', this.x, this.y - 62, 14, vfx.particleSecondary, -this.facing as 1 | -1);
      audio.playParry();
    } else if (this.character.id === 'chrono') {
      this.dashCooldown = 0;
      this.cryoCooldown = 0;
      this.invulnTimer = Math.max(this.invulnTimer, 1.4);
      const echoDmg = Math.round(26 * this.character.damageMultiplier);
      this.pendingTemporalEcho = {
        x: this.x - this.facing * 24,
        y: this.y,
        facing: this.facing,
        pose: this.getCurrentPose(),
        poseTime: this.poseTime,
        walkPhase: this.walkPhase,
        skinId: this.skinId,
        awakened: this.awakened,
        damage: echoDmg,
        primaryColor: vfx.slashPrimary,
        secondaryColor: vfx.slashSecondary,
        initialStrike: {
          x: this.x,
          y: this.y,
          facing: this.facing,
          pose: 'attack_3',
          poseTime: 0.14,
          damage: echoDmg,
          reach: 110,
          heavy: true,
          trailColor: vfx.slashSecondary,
          trailAccent: vfx.slashRim,
        },
      };
      particles.emitShockwave(this.x, this.y - 54, vfx.slashPrimary, 195, 0.4);
      particles.emitShockwave(this.x, this.y - 54, vfx.slashSecondary, 130, 0.3);
      particles.emitSparks(this.x, this.y - 54, 24, vfx.particleSecondary, 520);
      emitSkinAccentParticle(
        particles,
        vfx.finisherParticleKind,
        this.x,
        this.y - 54,
        12,
        vfx.particlePrimary,
        this.facing
      );
      audio.playParry();
    } else if (this.character.id === 'mirage') {
      // Mirage (Char 7) 100% Exclusive Awakening: Dual Parallel Void Mirror Rifts + Dimensional Glass Lattice + 1.6s Void Invuln!
      this.invulnTimer = Math.max(this.invulnTimer, 1.6);
      const leftX = clamp(this.x - 120, 75, ARENA_WIDTH - 75);
      const rightX = clamp(this.x + 120, 75, ARENA_WIDTH - 75);
      for (const rx of [leftX, rightX]) {
        this.pendingMirrorRifts.push({
          x: rx,
          y: this.y - 56,
          damage: 24,
          awakened: true,
          primaryColor: vfx.slashPrimary,
          secondaryColor: vfx.slashSecondary,
        });
      }
      particles.emitChainArc(leftX, this.y - 56, rightX, this.y - 56, vfx.slashSecondary, 5.5);
      particles.emitShockwave(this.x, this.y - 56, vfx.slashPrimary, 190, 0.4);
      emitSkinAccentParticle(particles, 'shard', this.x, this.y - 58, 22, vfx.particlePrimary, this.facing);
      audio.playCryoShatter();
    } else if (this.character.id === 'mactien') {
      // Mặc Tiên Awakening: Kim Mặc Tiên Bút + Ấn Triện Đỏ wave + expanded brush aura!
      this.dashCooldown = 0;
      this.cryoCooldown = 0;
      this.invulnTimer = Math.max(this.invulnTimer, 1.4);
      const sealX = clamp(this.x + this.facing * 145, 75, ARENA_WIDTH - 75);
      this.pendingInkSeals.push({
        x: sealX,
        y: GROUND_Y,
        damage: Math.round(30 * this.character.damageMultiplier),
        awakened: true,
        skinId: this.skinId,
      });
      if (this.skinId === 'xuan_feng_sage') {
        particles.emitShockwave(this.x, this.y - 54, '#5eead4', 205, 0.42);
        particles.emitShockwave(this.x, this.y - 54, '#f8fafc', 135, 0.3);
        particles.emitPetals(this.x, this.y - 54, 16, '#fda4af', 180, 0.9);
        emitSkinAccentParticle(particles, 'ink_splatter', this.x, this.y - 54, 8, '#5eead4', this.facing);
      } else {
        particles.emitShockwave(this.x, this.y - 54, '#f59e0b', 205, 0.42);
        particles.emitShockwave(this.x, this.y - 54, '#ef4444', 135, 0.3);
        particles.emitSparks(this.x, this.y - 54, 24, '#fde047', 520);
        emitSkinAccentParticle(particles, 'ink_splatter', this.x, this.y - 54, 16, '#f59e0b', this.facing);
      }
      audio.playParry();
    } else {
      particles.emitLightning(this.x - 24, this.y - 80, vfx.particlePrimary, 72);
      particles.emitLightning(this.x + 24, this.y - 80, vfx.particleSecondary, 72);
    }

    const callout =
      this.skinId === 'default' ? profile.transformationCallout : this.character.awakeningBannerText;
    particles.emitText(this.x, this.y - 118, callout, vfx.hitTextColor, 26);
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
    this.invulnTimer = 0.35;
    this.danceTimer = 0;
    this.vx = knockDir * 320;
    this.vy = -240;
    this.onGround = false;
    this.attackTimer = 0;
    this.activeHitbox = null;

    audio.playHit(true);
    camera.addShake(0.45, knockDir, 0);
    particles.emitSparks(this.x, this.y - 48, 16, '#f43f5e', 460);
    this.addRage(6, trainingMode);
    this.addAwakening(4, trainingMode);
    return actual;
  }

  public updateIdleOnTitle(dt: number, particles: ParticleSystem): void {
    this.poseTime += dt;
    this.tickAndPruneVfx(dt);
    this.updateAmbientAura(dt, particles, true);
    this.stepSkeletonBlend(dt);
    const neckX = this.x - 4 * this.facing;
    const neckY = this.y - 64;
    stepVerletScarf(this.scarf, neckX, neckY, -720 * this.facing, 380, 9, dt);
  }

  private tryMirrorRiftDashWarp(
    mirrorRifts?: MirrorRift[],
    onMirrorRiftDashWarp?: (rift: MirrorRift) => void
  ): boolean {
    if (!mirrorRifts || mirrorRifts.length === 0) return false;
    for (const rift of mirrorRifts) {
      if (
        rift.active &&
        rift.warpCooldown <= 0 &&
        Math.abs(this.x - rift.x) < 68 &&
        Math.abs(this.y - 42 - rift.y) < 82
      ) {
        rift.warpCooldown = 0.75;
        this.dashCooldown = Math.min(this.dashCooldown, 0.12);
        this.cryoCooldown = Math.max(0, this.cryoCooldown - 0.6);
        onMirrorRiftDashWarp?.(rift);
        return true;
      }
    }
    return false;
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
    mirrorRifts?: MirrorRift[];
    trainingMode: boolean;
    hasActiveEnemies: boolean;
    findAttackTarget?: (x: number, y: number, range: number) => { x: number; y: number } | null;
    onRequestUltimate: () => void;
    onRequestAwaken: () => void;
    onThunderBlinkHit: (fromX: number, toX: number, y: number, dir: 1 | -1, damage: number) => void;
    onCryoSummonChill: (centerX: number, radius: number) => void;
    onSkillLinkWarp: (kind: CharacterId) => SkillLinkWarpResult | null;
    onDetonateAllMarks: (kind: CharacterId, originX: number, originY: number, maxRange: number) => number;
    onMirrorRiftDashWarp?: (rift: MirrorRift) => void;
  }): void {
    const { dt, input, audio, particles, camera, chair, iceWalls, magmaPillars, projectiles, trainingMode } = params;
    this.findAttackTarget = params.findAttackTarget ?? null;

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
    this.skillLinkTimer = Math.max(0, this.skillLinkTimer - dt);
    this.chairKickTimer = Math.max(0, this.chairKickTimer - dt);
    this.awakenPoseTimer = Math.max(0, this.awakenPoseTimer - dt);
    this.airFlipTimer = Math.max(0, this.airFlipTimer - dt);
    this.brakeTimer = Math.max(0, this.brakeTimer - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);

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
    this.tickAndPruneVfx(dt);
    const vfx = getSkinVfxProfile(this.character.id, this.skinId);

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
        particles.emitText(this.x, this.y - 102, 'STYLE +RAGE', vfx.hitTextColor, 18);
      }
    }

    // Parry [K]
    if (
      this.parryCooldown <= 0 &&
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0 &&
      input.consumeBuffered('parry')
    ) {
      this.parryTimer = this.character.parryWindow + this.bonusParryWindow;
      this.parryCooldown = this.parryCooldownMax;
      this.parryFlashTimer = 0.24;
      this.attackTimer = 0;
      this.activeHitbox = null;
      this.danceTimer = 0;
      this.landTimer = 0;
      this.poseTime = 0;
      this.vx *= 0.25;
      audio.playSlash(0, false);
    }

    // Character Signature Skill [U] (can cancel any basic attack cleanly for fluid chaining!)
    if (this.hurtTimer <= 0 && this.awakenPoseTimer <= 0 && input.consumeBuffered('cryo')) {
      this.triggerSignatureSkill({
        audio,
        particles,
        camera,
        iceWalls,
        magmaPillars,
        projectiles,
        onThunderBlinkHit: params.onThunderBlinkHit,
        onCryoSummonChill: params.onCryoSummonChill,
      });
    }

    // Dash [Shift / L]
    if (
      this.dashCooldown <= 0 &&
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0 &&
      input.consumeBuffered('dash')
    ) {
      // Zero [U] → [L] Shadow-Warp Synergy: instantly blinks behind the marked target!
      let shadowWarped = false;
      if (this.character.id === 'zero' && this.skillLinkTimer > 0) {
        const warp = params.onSkillLinkWarp('zero');
        if (warp && warp.warpedToX !== undefined) {
          const oldX = this.x;
          const oldY = this.y - 52;
          this.x = warp.warpedToX;
          this.y = Math.min(this.y, GROUND_Y);
          this.facing = warp.warpedFacing ?? this.facing;
          this.dashGraceTimer = 0.45;
          this.invulnTimer = Math.max(this.invulnTimer, 0.34);
          this.vx = this.facing * 180;
          this.vy = 0;
          this.landTimer = 0;
          particles.emitChainArc(oldX, oldY, this.x, this.y - 52, vfx.particlePrimary, 6);
          particles.emitShockwave(this.x, this.y - 52, vfx.impactRingColor, 88, 0.24);
          particles.emitText(this.x, this.y - 108, 'ẢNH BỘ!', vfx.hitTextColor, 22);
          emitSkinAccentParticle(particles, vfx.swingParticleKind, this.x, this.y - 52, 6, vfx.particleSecondary, this.facing);
          audio.playDash();
          shadowWarped = true;
        }
      }

      if (!shadowWarped) {
        const moveDir = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
        if (moveDir !== 0) this.facing = moveDir > 0 ? 1 : -1;
        this.dashTimer = 0.16;
        this.dashGraceTimer = 0.3;
        this.dashCooldown = this.dashCooldownMax;
        this.invulnTimer = Math.max(this.invulnTimer, 0.24);
        const baseDashSpeed = this.character.moveSpeed * 3.3;
        this.vx = this.facing * (this.awakened ? baseDashSpeed * 1.15 : baseDashSpeed);
        this.vy = 0;
        this.attackTimer = 0;
        this.currentMove = null;
        this.activeHitbox = null;
        this.danceTimer = 0;
        this.landTimer = 0;
        this.poseTime = 0;
        this.scaleX = 1.1;
        this.scaleY = 0.92;
        audio.playDash();
        // Horizontal speed slash trail (glass shards for Mirage, white-jade mist for Xuan Feng) + 5-layer afterimage ghosts
        const isXuanFengDash = this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage';
        if (this.character.id === 'mirage') {
          particles.emitShards(this.x - this.facing * 18, this.y - 44, 10, vfx.slashPrimary, 220, 0.9);
          particles.emitShards(this.x - this.facing * 14, this.y - 46, 5, vfx.slashSecondary, 180, 0.75);
        } else if (isXuanFengDash) {
          particles.emitSlashBeam(this.x - this.facing * 24, this.y - 42, 0, 210, '#f8fafc', 7);
          particles.emitSlashBeam(this.x - this.facing * 18, this.y - 46, 0, 165, '#5eead4', 4);
          particles.emitPetals(
            this.x - this.facing * 14,
            this.y - 46,
            this.awakened ? 8 : 3,
            '#fda4af',
            this.awakened ? 155 : 110,
            this.awakened ? 0.9 : 0.75
          );
          if (this.awakened) {
            particles.emitSmoke(this.x - this.facing * 16, this.y - 44, 4, '#5eead4', -24, 18);
            particles.emitStars(this.x - this.facing * 12, this.y - 48, 5, '#fde68a', 175, 0.9);
          }
        } else {
          particles.emitSlashBeam(this.x - this.facing * 26, this.y - 40, 0, 235, vfx.slashPrimary, 9);
          particles.emitSlashBeam(this.x - this.facing * 18, this.y - 44, 0, 175, '#38bdf8', 4.5);
        }
        if (this.lastJoints) {
          const ghostPalette = isXuanFengDash
            ? this.awakened
              ? ['#f8fafc', '#f0fdfa', '#ccfbf1', '#5eead4', '#fde68a']
              : ['#f8fafc', '#e2e8f0', '#ccfbf1', '#5eead4', '#f1f5f9']
            : [
                vfx.afterimageColor,
                vfx.slashPrimary,
                vfx.slashSecondary,
                vfx.swingAuraColor,
                vfx.impactRingColor,
              ];
          for (let g = 0; g < 5; g++) {
            this.pushAfterimage({
              x: this.x - this.facing * (g * 14),
              y: this.y,
              facing: this.facing,
              joints: this.lastJoints,
              life: 0,
              maxLife: 0.22 + g * 0.03,
              color: ghostPalette[g % ghostPalette.length],
              skinId: this.skinId,
              awakened: this.awakened,
              characterId: this.character.id,
            });
          }
        }
        particles.emitShockwave(
          this.x,
          this.y - 44,
          isXuanFengDash ? '#5eead4' : this.awakened ? vfx.impactRingColor : vfx.swingAuraColor,
          58,
          0.2
        );
        // Universal Skin-Themed Dash FX
        if (isXuanFengDash) {
          emitSkinAccentParticle(
            particles,
            'ink_splatter',
            this.x - this.facing * 14,
            this.y - 46,
            this.awakened ? 7 : 4,
            '#5eead4',
            this.facing
          );
          particles.emitSparks(this.x - this.facing * 8, this.y - 48, 4, '#f8fafc', 280);
          if (this.awakened) {
            particles.emitPetals(this.x - this.facing * 20, this.y - 48, 4, '#fda4af', 140, 0.85);
            particles.emitStars(this.x - this.facing * 18, this.y - 42, 3, '#fde68a', 150, 0.85);
          }
        } else {
          emitSkinAccentParticle(
            particles,
            vfx.swingParticleKind,
            this.x - this.facing * 14,
            this.y - 46,
            6,
            vfx.particlePrimary,
            this.facing
          );
          particles.emitSparks(this.x - this.facing * 8, this.y - 48, 8, vfx.particleSecondary, 360);
        }
        if (vfx.motif === 'seraph_feathers') {
          particles.emitSlashBeam(this.x - this.facing * 24, this.y - 48, 0, 170, vfx.slashPrimary, 11);
        } else if (
          vfx.motif === 'void_rift' ||
          vfx.motif === 'astral_constellation' ||
          vfx.motif === 'cyber_glitch'
        ) {
          particles.emitLightning(this.x - this.facing * 16, this.y - 48, vfx.slashSecondary, 60);
        }
        // Kuro Dash-Through Wall Synergy: dashing through standing Wall OVERCHARGES & launches it!
        for (const wall of iceWalls) {
          if (
            wall.active &&
            !wall.launched &&
            Math.abs(wall.x - this.x) < 165 &&
            Math.sign(wall.x - this.x || this.facing) === this.facing
          ) {
            wall.launch(this.facing, particles, true);
            this.skillLinkTimer = Math.max(this.skillLinkTimer, 1.0);
            audio.playCryoShatter();
            const launchText =
              vfx.iceWallTheme === 'seraph'
                ? 'VẠN KIẾM XUNG KÍCH!'
                : vfx.iceWallTheme === 'void'
                  ? 'HƯ KHÔNG XUNG KÍCH!'
                  : 'BĂNG HUYẾT XUNG KÍCH!';
            particles.emitText(wall.x, wall.y - 118, launchText, vfx.hitTextColor, 22);
            camera.addShake(0.45, this.facing, 0);
          }
        }
        // Mirage Dash-Through MirrorRift Synergy: Mirror Warp!
        this.tryMirrorRiftDashWarp(params.mirrorRifts, params.onMirrorRiftDashWarp);
        // Awakened Dash Perks: Raijin leaves shocking thunder arc!
        if (this.awakened && this.character.id === 'raijin') {
          const dashEnd = clamp(this.x + this.facing * 175, 48, ARENA_WIDTH - 48);
          particles.emitChainArc(this.x, this.y - 48, dashEnd, this.y - 48, vfx.particleSecondary, 5);
          params.onThunderBlinkHit(this.x, dashEnd, this.y - 46, this.facing, 26);
        }
      }
    }

    // Attack [J] — Fluid 6-Hit Ground Combo, 3-Hit Air Combo + Slam, Skill-Link Arts, Dash-Slash, Parry Counter
    const moveAxis = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
    const attackElapsed = this.attackDuration - this.attackTimer;
    const cancelThreshold = this.currentMove
      ? this.attackDuration * this.currentMove.cancelRatio
      : 0;
    const canChainNow =
      this.attackTimer <= 0 || (this.attackDuration > 0 && attackElapsed >= cancelThreshold);
    const canDashCancelIntoSlash = this.dashTimer > 0 && this.dashTimer < 0.12;
    const canAttackNow =
      this.hurtTimer <= 0 && this.awakenPoseTimer <= 0 && (canChainNow || canDashCancelIntoSlash);
    // Input buffer is only consumed once the attack can actually come out, so early
    // presses during a swing are queued (≈0.22s) and chain seamlessly at the cancel point.
    const attackRequested =
      canAttackNow &&
      (input.consumeBuffered('attack') ||
        (input.isHeld('attack') &&
          (this.attackTimer <= 0 ||
            (this.attackDuration > 0 && attackElapsed >= this.attackDuration * 0.72))));

    if (attackRequested) {
      if (moveAxis !== 0) {
        this.facing = moveAxis > 0 ? 1 : -1;
      }
      this.startAttack(
        audio,
        particles,
        camera,
        iceWalls,
        magmaPillars,
        projectiles,
        params.onThunderBlinkHit,
        params.onSkillLinkWarp,
        params.onDetonateAllMarks,
        moveAxis
      );
    } else if (
      // Movement-cancel: once the hitbox is over, holding a direction cuts the recovery
      // so the fighter flows straight back into running instead of standing frozen.
      moveAxis !== 0 &&
      this.attackTimer > 0 &&
      this.onGround &&
      !this.airSlamPendingImpact &&
      this.attackDuration > 0 &&
      attackElapsed >= Math.max(cancelThreshold, this.attackDuration * 0.7)
    ) {
      this.attackTimer = 0;
      this.currentMove = null;
      this.activeHitbox = null;
    }

    // Horizontal Movement
    const maxSpeed =
      (this.awakened ? this.character.awakenedSpeed : this.character.moveSpeed) *
      1.48 *
      (1 + this.blessingSpeedBonus);

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.tryMirrorRiftDashWarp(params.mirrorRifts, params.onMirrorRiftDashWarp);
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0 && this.lastJoints) {
        this.afterimageTimer = 0.028;
        this.pushAfterimage({
          x: this.x,
          y: this.y,
          facing: this.facing,
          joints: this.lastJoints,
          life: 0,
          maxLife: 0.24,
          color:
            this.skinId === 'xuan_feng_sage'
              ? this.awakened
                ? '#ccfbf1'
                : '#f8fafc'
              : this.awakened
                ? vfx.slashSecondary
                : vfx.afterimageColor,
          skinId: this.skinId,
          awakened: this.awakened,
          characterId: this.character.id,
        });
        if (this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage' && this.awakened) {
          particles.emitPetals(this.x - this.facing * 10, this.y - 46, 2, '#fda4af', 110, 0.8);
          particles.emitSmoke(this.x - this.facing * 12, this.y - 44, 1, '#5eead4', -18, 15);
          particles.emitStars(this.x - this.facing * 8, this.y - 48, 1, '#fde68a', 115, 0.75);
        }
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
          this.pushAfterimage({
            x: this.x,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.19,
            color:
              this.skinId === 'xuan_feng_sage'
                ? this.awakened
                  ? '#ccfbf1'
                  : '#f8fafc'
                : this.awakened
                  ? vfx.slashSecondary
                  : vfx.afterimageColor,
            skinId: this.skinId,
            awakened: this.awakened,
            characterId: this.character.id,
          });
        }
      }
    } else if (this.danceTimer > 0) {
      this.vx *= Math.exp(-12 * dt);
    } else {
      if (moveAxis !== 0) {
        if (this.landTimer > 0 && this.landTimer < this.landDuration - 0.06) {
          this.landTimer = 0;
        }
        const reversing = this.vx !== 0 && Math.sign(this.vx) !== moveAxis;
        // Trigger stylish brake skid when reversing direction at high ground sprint speed
        if (this.onGround && Math.abs(this.vx) > 290 && reversing) {
          this.brakeTimer = 0.1;
          particles.emitSmoke(this.x, GROUND_Y, 2, '#94a3b8', -18, 14);
        }
        if (this.onGround && Math.abs(this.vx) < 40 && this.landTimer <= 0) {
          this.walkPhase = 0.15;
        }
        this.facing = moveAxis > 0 ? 1 : -1;
        // Snap acceleration: near-instant ground start & direction reversal
        const baseAccel = this.onGround ? 9200 : 4600;
        const accel = reversing ? baseAccel * 2.6 : baseAccel;
        const target = moveAxis * maxSpeed;
        if (Math.abs(this.vx) > maxSpeed && !reversing) {
          // Preserve dash/lunge momentum, bleeding it off smoothly toward run speed
          this.vx += (target - this.vx) * (1 - Math.exp(-(this.onGround ? 11 : 3.5) * dt));
        } else {
          const delta = target - this.vx;
          const stepV = accel * dt;
          this.vx = Math.abs(delta) <= stepV ? target : this.vx + Math.sign(delta) * stepV;
        }
      } else {
        if (this.onGround && Math.abs(this.vx) > 310) {
          this.brakeTimer = 0.08;
        }
        const decel = this.onGround ? 28 : 4.2;
        this.vx *= Math.exp(-decel * dt);
        if (Math.abs(this.vx) < 12) this.vx = 0;
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

    // Instant Jump-Cancel as soon as blade enters active contact (YOMI Hustle air-combo launcher flow!)
    const curElapsed = this.attackDuration - this.attackTimer;
    const jumpCancelOk =
      this.attackTimer <= 0 ||
      !this.currentMove ||
      this.attackHitsIssued > 0 ||
      curElapsed >= Math.min(0.055, this.attackDuration * this.currentMove.cancelRatio);
    const canJumpNow =
      this.hurtTimer <= 0 &&
      this.awakenPoseTimer <= 0 &&
      !this.airSlamPendingImpact &&
      jumpCancelOk &&
      (this.coyoteTimer > 0 || this.jumpsLeft > 0);

    // Buffer consumed only when the jump really happens → pre-landing presses fire on touchdown
    if (canJumpNow && input.consumeBuffered('jump')) {
      const isDouble = this.coyoteTimer <= 0;
      this.vy = isDouble ? -735 : -790;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpsLeft = Math.max(0, isDouble ? this.jumpsLeft - 1 : this.character.maxJumps - 1);
      this.danceTimer = 0;
      this.attackTimer = 0;
      this.currentMove = null;
      this.activeHitbox = null;
      this.landTimer = 0;
      this.poseTime = 0;
      // Double-jump lets you redirect instantly toward the held direction
      if (isDouble && moveAxis !== 0 && Math.sign(this.vx) !== moveAxis) {
        this.vx = moveAxis * maxSpeed * 0.7;
      }
      if (isDouble) {
        this.airFlipTimer = 0.32;
      }
      this.scaleX = 0.94;
      this.scaleY = 1.06;
      audio.playJump();
      particles.emitSmoke(
        this.x,
        this.y - 4,
        isDouble ? 6 : 4,
        isDouble ? vfx.particlePrimary : '#94a3b8',
        -30,
        18
      );
      if (isDouble) {
        particles.emitShockwave(this.x, this.y - 6, vfx.impactRingColor, 46, 0.22);
        emitSkinAccentParticle(
          particles,
          vfx.swingParticleKind,
          this.x,
          this.y - 6,
          4,
          vfx.particleSecondary,
          this.facing
        );
      }
    }

    // Variable jump height cut when jump key released early
    if (!input.isHeld('jump') && this.vy < -280 && this.dashTimer <= 0 && !this.airSlamPendingImpact) {
      this.vy *= Math.pow(0.55, dt * 16);
    }

    // Gravity & Integration (apex hang-time + heavier fall = crisp, weighty jump arc)
    if (this.dashTimer <= 0) {
      let gravityScale: number;
      if (this.airSlamPendingImpact) {
        gravityScale = 2.2;
      } else if (!this.onGround && this.attackTimer > 0) {
        gravityScale = 0.28;
      } else if (!this.onGround && Math.abs(this.vy) < 130 && input.isHeld('jump')) {
        gravityScale = 0.62; // brief float at the apex for aerial control
      } else if (this.vy > 0) {
        gravityScale = 1.32; // fall faster than rise → less floaty
      } else {
        gravityScale = 1;
      }
      this.vy += GRAVITY * gravityScale * dt;
      if (!this.airSlamPendingImpact && !this.kaguraAirDivePending) {
        this.vy = Math.min(this.vy, 1350); // terminal velocity
      }
    }
    const prevX = this.x;
    this.x = clamp(this.x + this.vx * dt, 42, ARENA_WIDTH - 42);
    this.y += this.vy * dt;

    if (this.onGround && Math.abs(this.x - prevX) > 0.2) {
      // 0.021 rad/px = ~75px per stride -> wide, powerful sprint strides without low-pass knee mush!
      this.walkPhase += Math.abs(this.x - prevX) * 0.021;
      const strideStep = Math.floor(this.walkPhase / Math.PI);
      if (strideStep !== this.lastStrideStep && Math.abs(this.vx) > 220) {
        this.lastStrideStep = strideStep;
        particles.emitSmoke(
          this.x - this.facing * 12,
          GROUND_Y - 2,
          1,
          this.awakened ? vfx.swingAuraColor : '#94a3b8',
          -14,
          10
        );
        if (this.character.id === 'mirage') {
          particles.emitShards(
            this.x - this.facing * 18,
            this.y - 46,
            2,
            this.awakened ? vfx.slashSecondary : vfx.slashPrimary,
            90,
            0.55
          );
        } else {
          particles.emitSlashBeam(
            this.x - this.facing * 18,
            this.y - 46,
            0,
            75,
            this.awakened ? vfx.slashSecondary : vfx.slashPrimary,
            4
          );
        }
        if (this.lastJoints) {
          this.pushAfterimage({
            x: this.x - this.facing * 10,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.16,
            color: vfx.afterimageColor,
          });
        }
      }
    }

    // Ground landing (plus explosive Meteor Air Slam & Kagura Air-Dive Magma Eruption!)
    if (this.y >= GROUND_Y) {
      if (!this.onGround && (this.vy > 160 || this.kaguraAirDivePending || this.airSlamPendingImpact)) {
        const isHeavyLand =
          this.airSlamPendingImpact || this.kaguraAirDivePending || this.vy > 680;
        this.landDuration = isHeavyLand ? 0.22 : 0.15;
        this.landTimer = this.landDuration;
        this.poseTime = 0;
      }
      if (!this.onGround && (this.vy > 220 || this.kaguraAirDivePending)) {
        this.scaleX = this.airSlamPendingImpact || this.kaguraAirDivePending ? 1.07 : 1.05;
        this.scaleY = this.airSlamPendingImpact || this.kaguraAirDivePending ? 0.94 : 0.96;
        particles.emitSmoke(
          this.x,
          GROUND_Y,
          this.airSlamPendingImpact || this.kaguraAirDivePending ? 10 : 4,
          '#64748b',
          -30,
          26
        );
        if (this.kaguraAirDivePending) {
          this.kaguraAirDivePending = false;
          const baseDmg = Math.round((this.awakened ? 78 : 54) * this.character.damageMultiplier);
          for (const ox of [-115, 0, 115]) {
            const px = clamp(this.x + ox, 64, ARENA_WIDTH - 64);
            magmaPillars.push(new MagmaPillar(px, ox < 0 ? -1 : 1, 0.05, baseDmg, vfx.pillarTheme));
          }
          particles.emitGroundCrack(this.x, 78, vfx.particlePrimary);
          particles.emitShockwave(this.x, GROUND_Y - 12, vfx.impactRingColor, 145, 0.32);
          particles.emitText(this.x, this.y - 112, 'HỎA PHƯỢNG GIÁNG THẾ!', vfx.hitTextColor, 24);
          emitSkinAccentParticle(
            particles,
            vfx.finisherParticleKind,
            this.x,
            GROUND_Y - 24,
            10,
            vfx.particleSecondary,
            this.facing
          );
          camera.addShake(0.62, 0, 1);
          audio.playCryoShatter();
        } else if (this.airSlamPendingImpact) {
          this.airSlamPendingImpact = false;
          particles.emitGroundCrack(this.x + this.facing * 26, 66, vfx.impactRingColor);
          particles.emitShockwave(this.x, GROUND_Y - 10, vfx.impactRingColor, 115, 0.28);
          emitSkinAccentParticle(
            particles,
            vfx.finisherParticleKind,
            this.x,
            GROUND_Y - 20,
            8,
            vfx.particleSecondary,
            this.facing
          );
          // Air Slam detonates marks right underneath!
          params.onDetonateAllMarks(this.character.id, this.x, GROUND_Y - 45, 220);
          // Awakened Kagura Air Slam triggers flanking twin magma pillars!
          if (this.awakened && this.character.id === 'kagura') {
            magmaPillars.push(new MagmaPillar(clamp(this.x - 86, 64, ARENA_WIDTH - 64), -1, 0.06, 52, vfx.pillarTheme));
            magmaPillars.push(new MagmaPillar(clamp(this.x + 86, 64, ARENA_WIDTH - 64), 1, 0.06, 52, vfx.pillarTheme));
          }
          camera.addShake(0.45, 0, 1);
          audio.playCryoShatter();
        }
      }
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this.airFlipTimer = 0;
    }

    // Attack Timer & Active Multi-Hit Hitbox Window
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      const elapsed = this.attackDuration - this.attackTimer;
      // 2-3 frame ultra-snappy startup (~38ms) so attacks come out immediately on press!
      const activeStart = Math.min(0.038, this.attackDuration * 0.08);
      const activeEnd = this.attackDuration * 0.76;
      const totalHits = Math.max(1, this.currentMove?.hitCount ?? 1);
      if (elapsed >= activeStart && elapsed <= activeEnd) {
        const windowSpan = Math.max(0.01, activeEnd - activeStart);
        const targetHitsSoFar = Math.min(
          totalHits,
          Math.floor(((elapsed - activeStart) / windowSpan) * totalHits) + 1
        );
        if (this.attackHitsIssued < targetHitsSoFar) {
          this.attackHitsIssued++;
          const isFinalHit = this.attackHitsIssued >= totalHits;
          if (this.attackHitsIssued > 1) {
            audio.playSlash(Math.min(4, this.attackHitsIssued + 1), false);
          }
          this.spawnCurrentHitbox(iceWalls, particles, audio, camera, isFinalHit);
        } else if (this.activeHitbox) {
          this.activeHitbox.x = this.x + this.facing * this.hitboxForwardOffset;
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

    // Record rolling temporal pose history for Chrono's 0.4s delayed TemporalEcho
    this.recordTemporalSnapshot(dt);
  }

  private stepSkeletonBlend(dt: number): void {
    const pose = this.getCurrentPose();
    if (pose !== this.prevPose) {
      this.poseTime = 0;
      if (pose === 'run' && this.prevPose === 'idle') {
        this.walkPhase = 0.15;
      }
      this.prevPose = pose;
    }
    const target = computeStickmanSkeleton(pose, this.poseTime, this.walkPhase, this.character.id, {
      vx: this.vx,
      vy: this.vy,
      awakened: this.awakened,
    });
    if (!this.blendedJoints) {
      this.blendedJoints = target;
      return;
    }
    // Crisp high-frequency tracking so full 70px sprint strides & 2-frame slashes never get low-pass mushed
    const isSnappy =
      this.attackTimer > 0 ||
      this.dashTimer > 0 ||
      this.parryTimer > 0 ||
      this.airFlipTimer > 0 ||
      this.landTimer > 0;
    const rate = isSnappy ? 54 : 42;
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
    onCryoSummonChill: (centerX: number, radius: number) => void;
  }): void {
    const { audio, particles, camera, iceWalls, magmaPillars, projectiles, onThunderBlinkHit, onCryoSummonChill } = params;
    const kind = this.character.specialKind;
    const vfx = getSkinVfxProfile(this.character.id, this.skinId);

    // Smooth skill-cancel out of any basic attack!
    this.attackTimer = 0;
    this.currentMove = null;
    this.activeHitbox = null;
    this.landTimer = 0;

    if (kind === 'cryo_wall') {
      const standingWall = iceWalls.find((w) => w.active && !w.launched);
      if (standingWall) {
        const dir: 1 | -1 = standingWall.x >= this.x ? 1 : -1;
        this.facing = dir;
        this.cryoPunchTimer = 0.25;
        this.skillLinkTimer = 1.05;
        this.poseTime = 0;
        standingWall.launch(dir, particles, this.awakened);
        audio.playCryoShatter();
        camera.addShake(0.42, dir, 0);
        camera.pulseZoom(1.08, 0.2);
      } else if (this.cryoCooldown <= 0) {
        const spawnX = clamp(this.x + this.facing * 92, 70, ARENA_WIDTH - 70);
        const wallTheme = vfx.iceWallTheme;
        iceWalls.push(new IceWall(spawnX, this.facing, wallTheme));
        this.cryoCooldown = this.cryoCooldownMax;
        this.cryoCastTimer = 0.22;
        this.skillLinkTimer = 1.05;
        this.poseTime = 0;
        audio.playCryoSummon();
        if (wallTheme === 'ice') {
          particles.emitIceShards(spawnX, GROUND_Y - 22, 12, this.facing);
        } else {
          particles.emitSparks(spawnX, GROUND_Y - 22, 16, vfx.particlePrimary, 420);
        }
        particles.emitGroundCrack(spawnX, wallTheme === 'ice' ? 46 : 52, vfx.particlePrimary);
        emitSkinAccentParticle(
          particles,
          vfx.finisherParticleKind,
          spawnX,
          GROUND_Y - 22,
          10,
          vfx.particleSecondary,
          this.facing
        );
        onCryoSummonChill(spawnX, 175);
        camera.addShake(0.24, 0, -1);

        // Awakened Kuro Upgrade: launches twin piercing energy waves themed by skin!
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
                color: vfx.slashPrimary,
                secondaryColor: vfx.slashSecondary,
                rimColor: vfx.slashRim,
                theme: vfx.projectileTheme,
                maxLife: 1.0,
              })
            );
          }
          particles.emitText(spawnX, this.y - 108, `${this.character.skills.specialName}!`, vfx.hitTextColor, 24);
        }
      }
      return;
    }

    if (this.cryoCooldown > 0) return;

    if (kind === 'holy_judgment') {
      // Valkyrie Exclusive [U]: Throw Spinning Astral Glaive Boomerang (pierces out & returns, pulling enemies!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoPunchTimer = 0.24;
      this.skillLinkTimer = 1.25;
      this.poseTime = 0;
      this.danceTimer = 0;
      this.hp = Math.min(this.maxHp, this.hp + 8);
      const boomDmg = Math.round((this.awakened ? 38 : 28) * this.character.damageMultiplier);
      this.pendingBoomerangThrow = {
        x: this.x + this.facing * 32,
        y: this.y - 54,
        dir: this.facing,
        damage: boomDmg,
        primaryColor: vfx.slashPrimary,
        secondaryColor: vfx.slashSecondary,
      };
      audio.playSlash(3, this.awakened);
      camera.addShake(0.26, this.facing, 0);
      particles.emitShockwave(this.x + this.facing * 24, this.y - 54, vfx.impactRingColor, 110, 0.26);
      emitSkinAccentParticle(particles, 'feather', this.x, this.y - 56, 12, vfx.particlePrimary, this.facing);
      particles.emitText(this.x, this.y - 116, 'THIÊN KÍCH HỒI QUAY · +8 HP!', vfx.hitTextColor, 22);
      return;
    }

    if (kind === 'ink_seal') {
      // Mặc Tiên Exclusive [U]: Tĩnh Tự Ấn ("静") — Giant vermilion-ink square seal that roots/slows 1.1s then explodes!
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoCastTimer = 0.22;
      this.skillLinkTimer = 1.25;
      this.poseTime = 0;
      this.danceTimer = 0;
      const sealX = clamp(this.x + this.facing * 175, 80, ARENA_WIDTH - 80);
      const sealDmg = Math.round((this.awakened ? 32 : 24) * this.character.damageMultiplier);
      this.pendingInkSeals.push({
        x: sealX,
        y: GROUND_Y,
        damage: sealDmg,
        awakened: this.awakened,
        skinId: this.skinId,
      });
      audio.playParry();
      camera.addShake(0.24, this.facing, 0);
      if (this.skinId === 'xuan_feng_sage') {
        particles.emitShockwave(this.x + this.facing * 32, this.y - 52, '#5eead4', 96, 0.24);
        particles.emitPetals(this.x + this.facing * 36, this.y - 54, 10, '#fda4af', 130, 0.85);
        emitSkinAccentParticle(
          particles,
          'ink_splatter',
          this.x + this.facing * 36,
          this.y - 54,
          6,
          '#5eead4',
          this.facing
        );
        if (this.awakened) {
          particles.emitShockwave(this.x + this.facing * 32, this.y - 52, '#fde68a', 114, 0.28);
          particles.emitStars(this.x + this.facing * 36, this.y - 54, 6, '#fde68a', 145, 0.9);
          particles.emitText(this.x, this.y - 116, 'VĂN THÁNH TRẤN THIÊN TRẬN!', '#fde68a', 24);
        } else {
          particles.emitText(this.x, this.y - 116, 'TĨNH TỰ ẤN · 静!', '#5eead4', 23);
        }
      } else {
        particles.emitShockwave(this.x + this.facing * 32, this.y - 52, this.awakened ? '#f59e0b' : '#2dd4bf', 96, 0.24);
        emitSkinAccentParticle(
          particles,
          'ink_splatter',
          this.x + this.facing * 36,
          this.y - 54,
          12,
          this.awakened ? '#f59e0b' : '#ef4444',
          this.facing
        );
        particles.emitText(this.x, this.y - 116, 'TĨNH TỰ ẤN · 静!', '#ef4444', 23);
      }
      return;
    }

    if (kind === 'temporal_echo') {
      // Chrono Exclusive [U]: Summon Temporal Echo (repeats Chrono slashes 0.4s later!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoCastTimer = 0.2;
      this.skillLinkTimer = 1.25;
      this.poseTime = 0;
      this.danceTimer = 0;
      const echoDmg = Math.round((this.awakened ? 30 : 22) * this.character.damageMultiplier);
      this.pendingTemporalEcho = {
        x: this.x - this.facing * 20,
        y: this.y,
        facing: this.facing,
        pose: this.getCurrentPose(),
        poseTime: this.poseTime,
        walkPhase: this.walkPhase,
        skinId: this.skinId,
        awakened: this.awakened,
        damage: echoDmg,
        primaryColor: vfx.slashPrimary,
        secondaryColor: vfx.slashSecondary,
        initialStrike: {
          x: this.x,
          y: this.y,
          facing: this.facing,
          pose: 'attack_2',
          poseTime: 0.14,
          damage: echoDmg,
          reach: this.awakened ? 114 : 98,
          heavy: this.awakened,
          trailColor: vfx.slashPrimary,
          trailAccent: vfx.slashRim,
        },
      };
      audio.playParry();
      camera.addShake(0.22, this.facing, 0);
      particles.emitShockwave(this.x, this.y - 52, vfx.slashPrimary, 95, 0.26);
      emitSkinAccentParticle(
        particles,
        vfx.swingParticleKind,
        this.x,
        this.y - 52,
        10,
        vfx.particleSecondary,
        this.facing
      );
      particles.emitText(this.x, this.y - 116, 'PHÂN THÂN QUÁ KHỨ!', vfx.hitTextColor, 22);
      return;
    }

    if (kind === 'mirror_fracture') {
      // Mirage Exclusive [U]: Open Void Mirror Rift (reflects enemy bullets, pulses glass shards, explodes on collapse!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoCastTimer = 0.22;
      this.skillLinkTimer = 1.25;
      this.poseTime = 0;
      this.danceTimer = 0;
      const riftX = clamp(this.x + this.facing * 125, 75, ARENA_WIDTH - 75);
      const riftDmg = Math.round((this.awakened ? 28 : 20) * this.character.damageMultiplier);
      this.pendingMirrorRifts.push({
        x: riftX,
        y: this.y - 58,
        damage: riftDmg,
        awakened: this.awakened,
        primaryColor: vfx.slashPrimary,
        secondaryColor: vfx.slashSecondary,
      });
      audio.playCryoShatter();
      camera.addShake(0.24, this.facing, 0);
      particles.emitShockwave(riftX, this.y - 58, vfx.slashPrimary, 105, 0.28);
      emitSkinAccentParticle(particles, 'shard', riftX, this.y - 58, 14, vfx.particleSecondary, this.facing);
      particles.emitText(riftX, this.y - 118, 'CỔNG GƯƠNG HƯ KHÔNG!', vfx.hitTextColor, 22);
      return;
    }

    if (kind === 'thunder_blink') {
      // Raijin: Instant Lightning Blink Piercing Thrust! (opens Skill Link → [J] LÔI LIÊN THƯƠNG!)
      const startX = this.x;
      const dist = this.awakened ? 390 : 305;
      const endX = clamp(startX + this.facing * dist, 56, ARENA_WIDTH - 56);
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoPunchTimer = 0.22;
      this.skillLinkTimer = 1.1;
      this.invulnTimer = Math.max(this.invulnTimer, 0.36);
      this.poseTime = 0;
      this.danceTimer = 0;

      particles.emitChainArc(startX, this.y - 52, endX, this.y - 52, vfx.particleSecondary, 6.5);
      particles.emitChainArc(startX, this.y - 38, endX, this.y - 64, vfx.particlePrimary, 4.5);

      if (this.lastJoints) {
        const steps = this.awakened ? 7 : 5;
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          const ax = startX + (endX - startX) * t;
          this.pushAfterimage({
            x: ax,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: i * 0.02,
            maxLife: 0.3,
            color: i % 2 === 0 ? vfx.afterimageColor : vfx.particleSecondary,
          });
          particles.emitLightning(
            ax,
            this.y - 48,
            i % 2 === 0 ? vfx.particlePrimary : vfx.particleSecondary,
            this.awakened ? 74 : 46
          );
        }
      }

      if (this.awakened) {
        // 3 Colossal Sky-to-Ground Thunder Pillars along the blink path!
        for (const frac of [0.25, 0.62, 1.0]) {
          const lx = startX + (endX - startX) * frac;
          particles.emitLightning(lx, this.y - 125, vfx.particleSecondary, 135);
          particles.emitShockwave(lx, GROUND_Y - 12, vfx.impactRingColor, 95, 0.28);
          particles.emitGroundCrack(lx, 56, vfx.particlePrimary);
        }
      }

      this.x = endX;
      this.vx = this.facing * 280;
      audio.playLaser();
      particles.emitShockwave(startX, this.y - 48, vfx.particlePrimary, 84, 0.24);
      particles.emitShockwave(endX, this.y - 48, vfx.impactRingColor, 112, 0.28);
      emitSkinAccentParticle(
        particles,
        vfx.finisherParticleKind,
        endX,
        this.y - 52,
        8,
        vfx.particleSecondary,
        this.facing
      );
      particles.emitText(endX, this.y - 104, this.awakened ? 'LÔI ĐÌNH GIÁNG THẾ!' : 'LÔI THIỂM!', vfx.hitTextColor, 24);
      camera.addShake(this.awakened ? 0.56 : 0.42, this.facing, 0);
      camera.pulseZoom(1.12, 0.22);

      const dmg = Math.round((this.awakened ? 92 : 54) * this.character.damageMultiplier);
      onThunderBlinkHit(startX, endX, this.y - 48, this.facing, dmg);
    } else if (kind === 'magma_eruption') {
      // Kagura: Air-Dive Phoenix Plunge if mid-air, or 3/5 Advancing Magma Pillars on ground!
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoPunchTimer = 0.24;
      this.skillLinkTimer = 1.1;
      this.poseTime = 0;
      this.danceTimer = 0;

      if (!this.onGround && this.y < GROUND_Y - 40) {
        this.kaguraAirDivePending = true;
        this.vx = this.facing * 240;
        this.vy = 860;
        particles.emitEmbers(this.x, this.y - 48, 22, vfx.particleSecondary);
        particles.emitShockwave(this.x, this.y - 48, vfx.impactRingColor, 90, 0.24);
        emitSkinAccentParticle(particles, vfx.swingParticleKind, this.x, this.y - 48, 6, vfx.particlePrimary, this.facing);
        audio.playDash();
        return;
      }

      this.vx = -this.facing * 80;
      const baseDmg = Math.round((this.awakened ? 74 : 48) * this.character.damageMultiplier);
      for (let i = 0; i < 3; i++) {
        const px = clamp(this.x + this.facing * (110 + i * 116), 64, ARENA_WIDTH - 64);
        magmaPillars.push(new MagmaPillar(px, this.facing, 0.08 + i * 0.13, baseDmg, vfx.pillarTheme));
      }
      if (this.awakened) {
        for (let i = 0; i < 2; i++) {
          const bx = clamp(this.x - this.facing * (105 + i * 110), 64, ARENA_WIDTH - 64);
          magmaPillars.push(new MagmaPillar(bx, -this.facing as 1 | -1, 0.12 + i * 0.14, baseDmg, vfx.pillarTheme));
        }
      }

      audio.playCryoSummon();
      particles.emitGroundCrack(this.x + this.facing * 42, 68, vfx.particlePrimary);
      emitSkinAccentParticle(
        particles,
        vfx.finisherParticleKind,
        this.x + this.facing * 42,
        this.y - 44,
        8,
        vfx.particleSecondary,
        this.facing
      );
      particles.emitText(this.x, this.y - 106, this.awakened ? 'HỎA NGỤC LIÊN HOÀN!' : 'HỎA BẠO CHẤN!', vfx.hitTextColor, 24);
      camera.addShake(this.awakened ? 0.58 : 0.45, 0, 1);
    } else if (kind === 'phantom_barrage') {
      // Zero: Backstep leap + Kunai Fan (opens Skill Link → [J]/[L] ẢNH BỘ Shadow-Warp behind marked enemy!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoCastTimer = 0.22;
      this.skillLinkTimer = 1.25;
      this.invulnTimer = Math.max(this.invulnTimer, 0.26);
      this.poseTime = 0;
      this.danceTimer = 0;
      this.vx = -this.facing * 260;
      this.vy = -345;
      this.onGround = false;

      const angles = this.awakened
        ? [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36]
        : [-0.26, -0.13, 0, 0.13, 0.26];
      const speed = this.awakened ? 1240 : 1040;
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
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
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
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 1.05,
          })
        );
      }

      audio.playSlash(3, this.awakened);
      particles.emitShockwave(this.x, this.y - 52, vfx.impactRingColor, 80, 0.26);
      emitSkinAccentParticle(
        particles,
        vfx.finisherParticleKind,
        this.x,
        this.y - 52,
        8,
        vfx.particleSecondary,
        this.facing
      );
      particles.emitText(this.x, this.y - 104, this.awakened ? 'THẬP TỰ ẢNH ĐAO!' : 'PHI ĐAO!', vfx.hitTextColor, 24);
      camera.addShake(0.32, -this.facing, 0);
    } else if (kind === 'arcane_barrage') {
      // Aether VIP Mage: Hand-cast Arcane / Prismatic Rainbow Orb Barrage + Arcane Ward (+8 HP & 0.42s Ward!)
      this.cryoCooldown = this.cryoCooldownMax;
      this.cryoCastTimer = 0.26;
      this.skillLinkTimer = 1.25;
      this.poseTime = 0;
      this.danceTimer = 0;
      this.hp = Math.min(this.maxHp, this.hp + 8);
      this.invulnTimer = Math.max(this.invulnTimer, 0.42);
      particles.emitShockwave(this.x, this.y - 54, '#38bdf8', 78, 0.24);

      const isRainbow = this.skinId === 'prismatic_archon';
      const rainbowPalette = ['#f43f5e', '#f59e0b', '#fde047', '#34d399', '#38bdf8', '#a855f7', '#f472b6'];
      const defaultPalette = ['#e879f9', '#38bdf8', '#c084fc', '#f0abfc', '#818cf8'];
      const palette = isRainbow ? rainbowPalette : defaultPalette;
      const angles = this.awakened
        ? [-0.34, -0.22, -0.11, 0, 0.11, 0.22, 0.34]
        : [-0.24, -0.12, 0, 0.12, 0.24];
      const speed = this.awakened ? 1160 : 980;
      const dmg = Math.round((this.awakened ? 34 : 24) * this.character.damageMultiplier);

      angles.forEach((a, idx) => {
        const orbCol = palette[idx % palette.length];
        const nextCol = palette[(idx + 2) % palette.length];
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 36,
            y: this.y - 58,
            vx: Math.cos(a) * speed * this.facing,
            vy: Math.sin(a) * speed,
            radius: 18,
            damage: dmg,
            kind: 'orb',
            fromPlayer: true,
            color: orbCol,
            secondaryColor: nextCol,
            rimColor: '#ffffff',
            theme: vfx.projectileTheme,
            maxLife: 1.05,
          })
        );
      });

      // Central hand-cast Arcane Wave
      projectiles.push(
        new Projectile({
          x: this.x + this.facing * 44,
          y: this.y - 56,
          vx: this.facing * (this.awakened ? 1040 : 880),
          vy: 0,
          radius: this.awakened ? 46 : 36,
          damage: Math.round((this.awakened ? 48 : 34) * this.character.damageMultiplier),
          kind: 'void_crescent',
          fromPlayer: true,
          color: vfx.slashPrimary,
          secondaryColor: vfx.slashSecondary,
          rimColor: vfx.slashRim,
          theme: vfx.projectileTheme,
          maxLife: 1.05,
        })
      );

      audio.playLaser();
      particles.emitShockwave(this.x + this.facing * 24, this.y - 56, vfx.slashPrimary, 115, 0.32);
      particles.emitShockwave(this.x + this.facing * 24, this.y - 56, vfx.slashSecondary, 78, 0.24);
      emitSkinAccentParticle(
        particles,
        vfx.finisherParticleKind,
        this.x + this.facing * 34,
        this.y - 56,
        14,
        vfx.particlePrimary,
        this.facing
      );
      particles.emitText(
        this.x,
        this.y - 108,
        isRainbow ? 'THẤT SẮC TRẬN!' : 'MA PHÁP TRẬN!',
        vfx.hitTextColor,
        24
      );
      camera.addShake(0.36, this.facing, 0);
    }
  }

  private startAttack(
    audio: AudioEngine,
    particles: ParticleSystem,
    camera: Camera,
    iceWalls: IceWall[],
    magmaPillars: MagmaPillar[],
    projectiles: Projectile[],
    onThunderBlinkHit: (fromX: number, toX: number, y: number, dir: 1 | -1, damage: number) => void,
    onSkillLinkWarp: (kind: CharacterId) => SkillLinkWarpResult | null,
    onDetonateAllMarks: (kind: CharacterId, originX: number, originY: number, maxRange: number) => number,
    moveAxis = 0
  ): void {
    this.danceTimer = 0;
    this.attackHitsIssued = 0;
    this.attackAfterimageTimer = 0;
    this.activeAttackIsLinkArt = false;
    this.activeAttackDetonates = false;
    this.activeAttackMarkStacks = 0;
    const vfx = getSkinVfxProfile(this.character.id, this.skinId);

    // Soft target assist: with no direction held, swing toward the nearest nearby enemy
    // (like commercial brawlers) so you never whiff into empty air behind you.
    const assistTarget = this.findAttackTarget ? this.findAttackTarget(this.x, this.y, 300) : null;
    if (assistTarget && moveAxis === 0 && Math.abs(assistTarget.x - this.x) > 6) {
      this.facing = assistTarget.x > this.x ? 1 : -1;
    }

    // Determine Attack Context: Skill-Link Art > Parry Counter > Iaido Dash-Slash > Air Combo > 6-Hit Ground Combo
    let context: AttackContext = 'ground';
    let step = 1;
    const isSkillLink = this.skillLinkTimer > 0;
    if (isSkillLink) {
      this.skillLinkTimer = 0;
      this.activeAttackIsLinkArt = true;
      this.activeAttackDetonates = true;
      const spec = getElementalMarkSpec(this.character.id);

      if (this.character.id === 'zero') {
        // ZERO LINK ART: ẢNH BỘ ÁM SÁT — Instant Shadow-Warp behind marked enemy + X-Cross Execute!
        const warp = onSkillLinkWarp('zero');
        if (warp && warp.warpedToX !== undefined) {
          const oldX = this.x;
          const oldY = this.y - 52;
          if (this.lastJoints) {
            for (let i = 0; i < 4; i++) {
              const f = i / 4;
              this.pushAfterimage({
                x: oldX + (warp.warpedToX - oldX) * f,
                y: this.y,
                facing: this.facing,
                joints: this.lastJoints,
                life: i * 0.02,
                maxLife: 0.26,
                color: vfx.afterimageColor,
              });
            }
          }
          this.x = warp.warpedToX;
          this.y = GROUND_Y;
          this.onGround = true;
          this.vy = 0;
          this.facing = warp.warpedFacing ?? this.facing;
          particles.emitChainArc(oldX, oldY, this.x, this.y - 52, vfx.particlePrimary, 6.5);
          particles.emitShockwave(this.x, this.y - 52, vfx.impactRingColor, 96, 0.25);
        }
        context = 'dash_slash';
        this.comboStep = 4;
        particles.emitSlashBeam(this.x + this.facing * 42, this.y - 54, -0.58 * this.facing, 260, vfx.slashPrimary, 14);
        particles.emitSlashBeam(this.x + this.facing * 42, this.y - 54, 0.58 * this.facing, 260, vfx.slashSecondary, 12);
        particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, vfx.hitTextColor, 23);
        emitSkinAccentParticle(particles, vfx.finisherParticleKind, this.x + this.facing * 42, this.y - 54, 8, vfx.particleSecondary, this.facing);
      } else if (this.character.id === 'raijin') {
        // RAIJIN LINK ART: LÔI LIÊN THƯƠNG — High-speed Volt Thrust + Chain Lightning Detonation!
        context = 'ground';
        step = 4;
        this.comboStep = 4;
        particles.emitSlashBeam(this.x + this.facing * 68, this.y - 52, 0, 290, vfx.slashPrimary, 14);
        particles.emitSlashBeam(this.x + this.facing * 68, this.y - 52, -0.22 * this.facing, 220, vfx.slashSecondary, 10);
        particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, vfx.hitTextColor, 23);
        emitSkinAccentParticle(particles, vfx.finisherParticleKind, this.x + this.facing * 68, this.y - 52, 8, vfx.particleSecondary, this.facing);
        onDetonateAllMarks('raijin', this.x + this.facing * 60, this.y - 52, 460);
      } else if (this.character.id === 'kagura') {
        // KAGURA LINK ART: NHẬT THỰC TRẢM — Sweeping Solar Crescent + Arena Flame Detonation!
        context = 'ground';
        step = 6;
        this.comboStep = 6;
        projectiles.push(
          new Projectile({
            x: this.x + this.facing * 48,
            y: this.y - 54,
            vx: this.facing * 1020,
            vy: 0,
            radius: 42,
            damage: Math.round(44 * this.character.damageMultiplier),
            kind: 'fire_wave',
            fromPlayer: true,
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 1.0,
          })
        );
        particles.emitSlashBeam(this.x + this.facing * 56, this.y - 56, -0.35 * this.facing, 280, vfx.slashPrimary, 15);
        particles.emitSlashBeam(this.x + this.facing * 56, this.y - 56, 0.25 * this.facing, 240, vfx.slashSecondary, 11);
        particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, vfx.hitTextColor, 23);
        emitSkinAccentParticle(particles, vfx.finisherParticleKind, this.x + this.facing * 56, this.y - 56, 8, vfx.particleSecondary, this.facing);
        onDetonateAllMarks('kagura', this.x + this.facing * 90, this.y - 52, 440);
      } else if (this.character.id === 'mirage') {
        // MIRAGE LINK ART: KÍNH GIỚI ĐOẠN KHÔNG — Polygonal Shard Shatter + Mirror Mark Detonation!
        context = 'ground';
        step = 6;
        this.comboStep = 6;
        const linkX = this.x + this.facing * 64;
        const linkY = this.y - 54;
        particles.emitShards(linkX, linkY, 16, vfx.slashPrimary, 280, 1.1);
        particles.emitShards(linkX, linkY, 10, vfx.slashSecondary, 240, 0.9);
        particles.emitShockwave(linkX, linkY, vfx.impactRingColor, 112, 0.26);
        particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, vfx.hitTextColor, 23);
        emitSkinAccentParticle(particles, vfx.finisherParticleKind, linkX, linkY, 8, vfx.particleSecondary, this.facing);
        onDetonateAllMarks('mirage', this.x + this.facing * 90, this.y - 52, 420);
      } else if (this.character.id === 'chrono') {
        // CHRONO LINK ART: NHỊP ĐỒNG HỒ TRẢM — Temporal Clockwork Slash + Time-Mark Detonation!
        context = 'ground';
        step = 6;
        this.comboStep = 6;
        const linkX = this.x + this.facing * 66;
        const linkY = this.y - 54;
        particles.emitShockwave(linkX, linkY, vfx.slashPrimary, 118, 0.28);
        particles.emitShockwave(linkX, linkY, vfx.slashSecondary, 84, 0.22);
        particles.emitSlashBeam(linkX, linkY, -0.45 * this.facing, 275, vfx.slashPrimary, 14);
        particles.emitSlashBeam(linkX, linkY, 0.45 * this.facing, 250, vfx.slashSecondary, 11);
        particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, vfx.hitTextColor, 23);
        emitSkinAccentParticle(particles, vfx.finisherParticleKind, linkX, linkY, 10, vfx.particleSecondary, this.facing);
        onDetonateAllMarks('chrono', this.x + this.facing * 90, this.y - 52, 430);
      } else if (this.character.id === 'mactien') {
        // MẶC TIÊN LINK ART: CHU SA PHONG ẤN — Giant Vermilion Seal Finisher + Tĩnh Ấn Detonation!
        context = 'ground';
        step = 4;
        this.comboStep = 4;
        const linkX = this.x + this.facing * 72;
        const linkY = this.y - 54;
        if (this.skinId === 'xuan_feng_sage') {
          particles.emitShockwave(linkX, linkY, '#5eead4', 124, 0.28);
          particles.emitShockwave(linkX, linkY, '#fda4af', 88, 0.22);
          particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, '#5eead4', 23);
          particles.emitPetals(linkX, linkY, 10, '#fda4af', 150, 0.9);
          emitSkinAccentParticle(particles, 'ink_splatter', linkX, linkY, 6, '#5eead4', this.facing);
        } else {
          particles.emitShockwave(linkX, linkY, '#ef4444', 124, 0.28);
          particles.emitShockwave(linkX, linkY, this.awakened ? '#f59e0b' : '#2dd4bf', 88, 0.22);
          particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, '#ef4444', 23);
          emitSkinAccentParticle(particles, 'ink_splatter', linkX, linkY, 12, this.awakened ? '#f59e0b' : '#2dd4bf', this.facing);
        }
        onDetonateAllMarks('mactien', this.x + this.facing * 96, this.y - 52, 430);
      } else {
        // KURO LINK ART: HUYẾT ẢNH TRẢM — Dash-Through Cross-Cut + Overcharge Ice Wall + Shatter Detonation!
        context = 'dash_slash';
        this.comboStep = 5;
        particles.emitSlashBeam(this.x + this.facing * 56, this.y - 54, -0.42 * this.facing, 275, vfx.slashSecondary, 15);
        particles.emitSlashBeam(this.x + this.facing * 56, this.y - 54, 0.38 * this.facing, 250, vfx.slashPrimary, 11);
        particles.emitText(this.x, this.y - 114, `LIÊN CHIÊU · ${spec.linkArtName}!`, vfx.hitTextColor, 23);
        emitSkinAccentParticle(particles, vfx.finisherParticleKind, this.x + this.facing * 56, this.y - 54, 8, vfx.particleSecondary, this.facing);
        onDetonateAllMarks('kuro', this.x + this.facing * 90, this.y - 52, 360);
      }
      camera.pulseZoom(1.13, 0.22);
      camera.addShake(0.38, this.facing, 0);
    } else if (this.parryCounterWindow > 0) {
      context = 'parry_counter';
      this.parryCounterWindow = 0;
      this.activeAttackDetonates = true;
      if (this.character.id === 'mirage') {
        particles.emitShards(this.x + this.facing * 54, this.y - 54, 14, vfx.slashPrimary, 260, 1.05);
        particles.emitShockwave(this.x + this.facing * 54, this.y - 54, vfx.slashSecondary, 88, 0.22);
      } else {
        particles.emitSlashBeam(this.x + this.facing * 54, this.y - 54, -0.3 * this.facing, 250, vfx.slashPrimary, 13);
      }
      particles.emitText(this.x, this.y - 102, 'PHẢN CÔNG!', vfx.hitTextColor, 22);
      emitSkinAccentParticle(particles, vfx.swingParticleKind, this.x + this.facing * 54, this.y - 54, 6, vfx.particleSecondary, this.facing);
    } else if (this.dashTimer > 0 || this.dashGraceTimer > 0) {
      context = 'dash_slash';
      this.dashTimer = 0;
      this.dashGraceTimer = 0;
      this.activeAttackMarkStacks = 1;
      this.activeAttackDetonates = true;
    } else if (!this.onGround) {
      context = 'air';
      this.airComboStep = (this.airComboStep % 3) + 1;
      step = this.airComboStep;
      if (step === 3) this.activeAttackDetonates = true;
    } else {
      context = 'ground';
      if (this.character.id === 'mactien') {
        this.comboStep = (this.comboStep % 4) + 1;
        step = this.comboStep;
        if (step === 2 || step === 3) this.activeAttackMarkStacks = 1;
        if (step === 4) this.activeAttackDetonates = true;
      } else {
        this.comboStep = (this.comboStep % 6) + 1;
        step = this.comboStep;
        if (step === 3 || step === 4) this.activeAttackMarkStacks = 1;
        if (step === 6) this.activeAttackDetonates = true;
      }
    }

    const move = getComboMoveForCharacter(this.character.id, step, context, this.skinId);
    this.currentMove = move;
    const speedFactor =
      ((this.awakened ? 0.88 : 1) * this.character.attackSpeedMultiplier) /
      (1 + this.blessingSpeedBonus);
    this.attackDuration = move.duration * speedFactor;
    this.attackTimer = this.attackDuration;
    this.comboResetTimer = 0.92;
    this.poseTime = 0;
    this.airFlipTimer = 0;
    this.landTimer = 0;

    // Expressive squash-and-stretch impulse on strike
    this.scaleX = move.heavy || isSkillLink ? 1.24 : 1.12;
    this.scaleY = move.heavy || isSkillLink ? 0.82 : 0.92;

    // Weapon-class spacing & Zero Assassin Pass-Through Blink!
    const lungeMult =
      (this.character.id === 'raijin' ? 1.18 : this.character.id === 'zero' ? 1.14 : 1) *
      (isSkillLink ? 1.25 : 1);
    this.vx = this.facing * move.lungeSpeed * lungeMult;

    if (move.passThrough && assistTarget && Math.abs(assistTarget.x - this.x) < 190 && this.onGround) {
      // Zero Signature Twin-Dagger Pass-Through: slices straight through enemy's back & turns around!
      const oldX = this.x;
      const behindX = clamp(assistTarget.x + this.facing * 56, 48, ARENA_WIDTH - 48);
      if (this.lastJoints) {
        for (let g = 0; g < 3; g++) {
          const frac = g / 3;
          this.pushAfterimage({
            x: oldX + (behindX - oldX) * frac,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: g * 0.02,
            maxLife: 0.22,
            color: vfx.afterimageColor,
          });
        }
      }
      this.x = behindX;
      this.facing = assistTarget.x <= this.x ? -1 : 1;
      this.vx = this.facing * 90;
    } else if (assistTarget && !isSkillLink && this.onGround) {
      // Weapon-tailored ideal combat spacing (Spear pokes from afar, Nodachi mid-wide, Katana mid, Daggers point-blank!)
      const gap = (assistTarget.x - this.x) * this.facing;
      if (gap > 0 && gap < 320) {
        const weaponSpacing =
          this.character.id === 'raijin'
            ? 106
            : this.character.id === 'kagura'
              ? 82
              : this.character.id === 'zero'
                ? 42
                : 62;
        const desired = clamp((gap - weaponSpacing) * 8.5, 0, move.lungeSpeed * lungeMult * 1.7);
        this.vx = this.facing * desired;
      }
    }

    if (!this.onGround) {
      if (
        move.pose === 'air_slam' ||
        move.pose === 'spear_air_dive' ||
        move.pose === 'nodachi_earth_splitter'
      ) {
        this.vy = move.pose === 'spear_air_dive' ? 760 : 680;
        this.vx = move.pose === 'spear_air_dive' ? this.facing * 420 : this.vx;
        this.airSlamPendingImpact = true;
      } else {
        this.vy = Math.min(this.vy, -175); // Crisp anime air-combo hang
      }
    } else if (move.hopVy && !isSkillLink) {
      this.vy = move.hopVy;
      this.onGround = false;
    }

    audio.playSlash(Math.min(4, step), this.awakened || move.heavy || isSkillLink);

    // Spawn weapon-specific dynamic slash / thrust / X-cross / molten cleave trails!
    const baseRadius = (this.awakened ? 102 : 78) + this.character.reachBonus * 0.55;
    const outerColor = this.awakened || move.heavy ? vfx.slashSecondary : vfx.slashPrimary;
    if (this.character.id !== 'aether') {
      for (let i = 0; i < move.slashArcs.length; i++) {
        const arc = move.slashArcs[i];
        let trailStyle =
          arc.style ??
          move.trailStyle ??
          (this.character.id === 'mirage' ? 'mirror_fracture' : 'arc');
        if (this.character.id === 'chrono') {
          trailStyle =
            this.skinId === 'chrono_sovereign'
              ? 'chrono_sovereign_slash'
              : trailStyle === 'chrono_sovereign_slash'
                ? 'chrono_sovereign_slash'
                : 'chrono_clockwork_slash';
        }
        const isMacTien = this.character.id === 'mactien';
        const isXuanFeng = isMacTien && this.skinId === 'xuan_feng_sage';
        if (isXuanFeng) {
          trailStyle = 'xuan_feng_brush';
        }
        const isMacTienSealHit =
          isMacTien &&
          ((context === 'ground' && step === 4) || move.heavy || isSkillLink);
        const trailOuter = isXuanFeng
          ? this.awakened
            ? '#99f6e4'
            : '#5eead4'
          : isMacTien
            ? this.awakened
              ? '#f59e0b'
              : '#2dd4bf'
            : i === 0
              ? outerColor
              : vfx.slashSecondary;
        const trailSecondary = isXuanFeng
          ? isMacTienSealHit
            ? '#fda4af'
            : '#5eead4'
          : isMacTienSealHit
            ? '#ef4444'
            : i === 0
              ? vfx.slashSecondary
              : vfx.slashPrimary;
        const trailRadiusScale =
          isMacTien && this.awakened ? arc.radiusScale * 1.24 : arc.radiusScale;
        this.pushSlashTrail({
          x: this.x + this.facing * (22 + i * 7),
          y: this.y + arc.yOffset,
          facing: this.facing,
          radius: baseRadius * trailRadiusScale,
          startAngle: arc.sa,
          endAngle: arc.ea,
          life: 0,
          maxLife: (this.awakened ? 0.25 : 0.2) + i * 0.03,
          outerColor: trailOuter,
          coreColor: vfx.slashCore,
          thickness: isXuanFeng
            ? (this.awakened ? 17 : 13) - i * 2.5
            : (this.awakened ? 21 : this.character.id === 'kagura' ? 19 : 15) - i * 3,
          style: trailStyle,
          rimColor: vfx.slashRim,
          secondaryColor: trailSecondary,
          motif: vfx.motif,
          skinId: this.skinId,
          characterId: this.character.id,
          seed: (this.hitboxSeq * 37 + i * 17) & 0xff,
        });
      }

      // NGỰ BÚT THIÊN HÀNH — Awakened xuan_feng_sage summons 2 floating diagonal calligraphy blades at range
      if (this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage' && this.awakened) {
        for (let k = 0; k < 2; k++) {
          const diagSign = k === 0 ? -1 : 1;
          this.pushSlashTrail({
            x: this.x + this.facing * (76 + k * 36),
            y: this.y - 56 + diagSign * 18,
            facing: this.facing,
            radius: baseRadius * (1.08 + k * 0.14),
            startAngle: diagSign * -1.35,
            endAngle: diagSign * 1.15,
            life: 0,
            maxLife: 0.28 + k * 0.04,
            outerColor: k === 0 ? '#5eead4' : '#fde68a',
            coreColor: '#f8fafc',
            thickness: 12 - k * 2,
            style: 'xuan_feng_brush',
            rimColor: '#f8fafc',
            secondaryColor: '#fda4af',
            motif: vfx.motif,
            skinId: this.skinId,
            characterId: this.character.id,
            seed: (this.hitboxSeq * 53 + k * 29) & 0xff,
          });
        }
      }
    }

    // Record Chrono melee strike so active TemporalEchoes execute a faithful follow-up slash 0.4s later
    if (this.character.id === 'chrono') {
      const reachScale = move.reachScale ?? 1;
      const extraReach = this.activeAttackIsLinkArt ? 36 : 0;
      const baseReach = (this.awakened ? 114 : 94) + this.character.reachBonus + extraReach;
      const reach = Math.round(baseReach * reachScale);
      const basicStepScale =
        !this.activeAttackIsLinkArt && !move.unblockable && this.comboStep >= 1 && this.comboStep <= 4
          ? 0.68
          : 0.8;
      const linkMult = this.activeAttackIsLinkArt ? 1.32 : basicStepScale;
      const rawDmg = Math.round(
        move.baseDamage * this.character.damageMultiplier * (this.awakened ? 1.24 : 1) * linkMult
      );
      const echoDamage = Math.max(10, Math.round(rawDmg * (this.awakened ? 0.72 : 0.62)));
      this.pendingTemporalStrikes.push({
        triggerTime: 0.4,
        x: this.x,
        y: this.y,
        facing: this.facing,
        pose: move.pose,
        poseTime: 0.14,
        damage: echoDamage,
        reach,
        heavy: Boolean(move.heavy || isSkillLink || step >= 5 || (context === 'air' && step === 3)),
        trailColor: this.awakened || move.heavy ? vfx.slashSecondary : vfx.slashPrimary,
        trailAccent: vfx.slashRim,
      });
      if (this.pendingTemporalStrikes.length > 16) {
        this.pendingTemporalStrikes.shift();
      }
    }

    // Distinct Weapon-Class Signature Flair & Per-Skin Swing Accent Particles on Every Swing!
    const strikeX = this.x + this.facing * 64;
    const strikeY = this.y - 52;
    const isHeavyFinisher = Boolean(
      move.heavy || isSkillLink || step === 6 || (context === 'air' && step === 3)
    );
    if (isHeavyFinisher) {
      if (this.character.id === 'mirage') {
        particles.emitShards(strikeX, strikeY, 12, vfx.slashSecondary, 240, 1.0);
        particles.emitShards(strikeX, strikeY, 6, '#ffffff', 190, 0.8);
      } else {
        particles.emitSlashBeam(strikeX, strikeY, -0.58 * this.facing, 195, '#ffffff', 6);
      }
      particles.emitShockwave(strikeX, strikeY, vfx.slashPrimary, 64, 0.18);
      if (this.lastJoints) {
        this.pushAfterimage({
          x: this.x - this.facing * 16,
          y: this.y,
          facing: this.facing,
          joints: this.lastJoints,
          life: 0,
          maxLife: 0.22,
          color: vfx.afterimageColor,
          skinId: this.skinId,
        });
      }
    }
    emitSkinAccentParticle(
      particles,
      isHeavyFinisher ? vfx.finisherParticleKind : vfx.swingParticleKind,
      strikeX,
      strikeY,
      isHeavyFinisher ? 8 : 4,
      isHeavyFinisher ? vfx.particleSecondary : vfx.particlePrimary,
      this.facing
    );

    if (this.character.id === 'kuro') {
      if (step === 1 && context === 'ground') {
        particles.emitSparks(strikeX, strikeY, 8, vfx.particlePrimary, 380);
      } else if (move.zantetsuBurst) {
        // Combo 6 Zantetsu Spatial Cross-Sever ahead of Kuro!
        const zx = this.x + this.facing * 98;
        particles.emitSlashBeam(zx, strikeY, -0.45 * this.facing, 235, vfx.slashPrimary, 13);
        particles.emitSlashBeam(zx, strikeY, 0.45 * this.facing, 215, '#ffffff', 9);
        particles.emitShockwave(zx, strikeY, vfx.impactRingColor, 96, 0.24);
        particles.emitSparks(zx, strikeY, 14, '#ffffff', 460);
      }
    } else if (this.character.id === 'aether') {
      // AETHER VIP BATTLE MAGE: Pure close-range hand-to-hand Arcane Palm Strikes & Shockwave Bursts (balanced melee!)
      const isRainbow = this.skinId === 'prismatic_archon';
      const rainbow = ['#38bdf8', '#e879f9', '#fde047', '#f43f5e', '#34d399'];
      const palmX = this.x + this.facing * (isHeavyFinisher ? 78 : 54);
      const palmY = this.y - 54;
      const col1 = isRainbow ? rainbow[(step + this.hitboxSeq) % rainbow.length] : vfx.slashPrimary;
      const col2 = isRainbow ? rainbow[(step + this.hitboxSeq + 2) % rainbow.length] : vfx.slashSecondary;

      // Crisp close-range magic palm impact ring + arcane sparks
      particles.emitShockwave(palmX, palmY, col1, isHeavyFinisher ? 92 : 52, 0.22);
      particles.emitSparks(palmX, palmY, isHeavyFinisher ? 14 : 6, col2, isHeavyFinisher ? 440 : 300);

      if (step === 3 || step === 4) {
        // Double-palm cross energy pulse
        particles.emitShockwave(palmX + this.facing * 14, palmY, col2, 66, 0.2);
      } else if (isHeavyFinisher) {
        // Combo 5-6 / Air Slam Finisher: Close-range Arcane Palm Blast!
        particles.emitShockwave(palmX, palmY, col2, 118, 0.28);
        particles.emitSlashBeam(palmX, palmY, -0.35 * this.facing, 155, col1, 14);
        particles.emitSlashBeam(palmX, palmY, 0.35 * this.facing, 155, col2, 11);
      }
    } else if (this.character.id === 'raijin') {
      // Spear piercing electric arcs along the long shaft!
      const tipX = this.x + this.facing * 112;
      if (step === 1 || step === 2 || step === 3 || step === 6) {
        particles.emitChainArc(
          this.x + this.facing * 24,
          strikeY,
          tipX,
          strikeY,
          step >= 4 ? vfx.particleSecondary : vfx.particlePrimary,
          3.5
        );
      }
      if (step === 6 && context === 'ground' && !this.awakened) {
        projectiles.push(
          new Projectile({
            x: strikeX,
            y: strikeY,
            vx: this.facing * 1240,
            vy: 0,
            radius: 24,
            damage: 24,
            kind: 'volt_lance',
            fromPlayer: true,
            color: vfx.slashPrimary,
            secondaryColor: vfx.slashSecondary,
            rimColor: vfx.slashRim,
            theme: vfx.projectileTheme,
            maxLife: 0.65,
          })
        );
      }
    } else if (this.character.id === 'kagura') {
      // Heavy Flame Nodachi ground-scraping embers & earth-cratering slams!
      particles.emitEmbers(strikeX + this.facing * 18, strikeY + 14, move.earthSlam ? 18 : 8, vfx.particlePrimary);
      if (move.earthSlam && this.onGround) {
        const slamX = clamp(this.x + this.facing * 88, 56, ARENA_WIDTH - 56);
        particles.emitGroundCrack(slamX, 64, vfx.particlePrimary);
        particles.emitShockwave(slamX, GROUND_Y - 8, vfx.impactRingColor, 88, 0.24);
        camera.addShake(step === 6 ? 0.42 : 0.26, 0, 1);
      }
      if (step === 6 && context === 'ground' && !this.awakened) {
        const px = clamp(this.x + this.facing * 104, 64, ARENA_WIDTH - 64);
        magmaPillars.push(new MagmaPillar(px, this.facing, 0.06, 28, vfx.pillarTheme));
      }
    } else if (this.character.id === 'zero') {
      if (step === 1 || step === 4 || step === 6) {
        particles.emitSparks(strikeX - this.facing * 14, strikeY, 10, vfx.particlePrimary, 420);
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
              damage: 14,
              kind: 'kunai',
              fromPlayer: true,
              color: vfx.slashPrimary,
              secondaryColor: vfx.slashSecondary,
              rimColor: vfx.slashRim,
              theme: vfx.projectileTheme,
              maxLife: 0.85,
            })
          );
        }
      }
    } else if (this.character.id === 'mirage') {
      const isVoidMythic = this.skinId === 'void_shatterer';
      particles.emitShards(
        strikeX,
        strikeY,
        isHeavyFinisher ? 14 : 7,
        isVoidMythic ? '#f43f5e' : vfx.particlePrimary,
        isHeavyFinisher ? 270 : 190,
        isHeavyFinisher ? 1.08 : 0.85
      );
      particles.emitShards(
        strikeX + this.facing * 12,
        strikeY - 6,
        isHeavyFinisher ? 8 : 4,
        isVoidMythic ? '#38bdf8' : vfx.slashSecondary,
        isHeavyFinisher ? 230 : 160,
        0.78
      );
      particles.emitSparks(
        strikeX,
        strikeY,
        isHeavyFinisher ? 10 : 5,
        '#ffffff',
        isHeavyFinisher ? 440 : 300
      );
      if (isVoidMythic) {
        particles.emitShards(strikeX, strikeY, isHeavyFinisher ? 7 : 3, '#09090b', 200, 0.9);
      }
      if (step === 3 || isHeavyFinisher || context === 'dash_slash' || context === 'parry_counter') {
        particles.emitShockwave(
          strikeX + this.facing * 10,
          strikeY,
          isVoidMythic ? '#38bdf8' : vfx.impactRingColor,
          isHeavyFinisher ? 92 : 58,
          0.2
        );
      }
    } else if (this.character.id === 'chrono') {
      const isSovereign = this.skinId === 'chrono_sovereign';
      particles.emitSparks(
        strikeX,
        strikeY,
        isHeavyFinisher ? 12 : 6,
        isSovereign ? '#fde047' : vfx.particlePrimary,
        isHeavyFinisher ? 440 : 310
      );
      particles.emitShards(
        strikeX + this.facing * 10,
        strikeY - 6,
        isHeavyFinisher ? 8 : 4,
        isSovereign ? '#38bdf8' : vfx.particleSecondary,
        isHeavyFinisher ? 230 : 165,
        isHeavyFinisher ? 0.96 : 0.78
      );
      if (isHeavyFinisher || step === 3 || context === 'dash_slash' || context === 'parry_counter') {
        particles.emitShockwave(
          strikeX,
          strikeY,
          isSovereign ? '#f59e0b' : vfx.impactRingColor,
          isHeavyFinisher ? 92 : 58,
          0.2
        );
      }
    } else if (this.character.id === 'mactien') {
      if (this.skinId === 'xuan_feng_sage') {
        particles.emitPetals(strikeX, strikeY, isHeavyFinisher ? 4 : 2, '#fda4af', 115, 0.8);
        emitSkinAccentParticle(
          particles,
          'ink_splatter',
          strikeX,
          strikeY,
          isHeavyFinisher ? 5 : 2,
          '#5eead4',
          this.facing
        );
        if (context === 'ground' && step === 3 && !this.awakened) {
          particles.emitShockwave(strikeX, strikeY, '#5eead4', 70, 0.22);
          particles.emitShockwave(strikeX + this.facing * 14, strikeY, '#f8fafc', 48, 0.18);
          for (const ang of [-0.06, 0.06]) {
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 42,
                y: this.y - 58 + (ang < 0 ? -8 : 8),
                vx: Math.cos(ang) * this.facing * 920,
                vy: Math.sin(ang) * 920,
                radius: 15,
                damage: 10,
                kind: 'bamboo_blade',
                fromPlayer: true,
                color: '#5eead4',
                secondaryColor: '#2dd4bf',
                rimColor: '#f8fafc',
                maxLife: 0.34,
              })
            );
          }
        }
        if ((context === 'ground' && step === 4) || isHeavyFinisher) {
          particles.emitShockwave(strikeX + this.facing * 12, strikeY, '#2dd4bf', 106, 0.25);
          particles.emitShockwave(strikeX + this.facing * 18, strikeY, '#fde68a', 76, 0.2);
          particles.emitText(strikeX + this.facing * 14, strikeY - 26, '静', '#5eead4', 26);
          if (context === 'ground' && step === 4) {
            projectiles.push(
              new Projectile({
                x: this.x + this.facing * 46,
                y: this.y - 54,
                vx: this.facing * 520,
                vy: 0,
                radius: 34,
                damage: this.awakened ? 16 : 12,
                kind: 'jade_seal_wave',
                fromPlayer: true,
                color: '#2dd4bf',
                secondaryColor: '#5eead4',
                rimColor: '#f8fafc',
                maxLife: 0.34,
              })
            );
          }
        }
      } else {
        const inkAccent = this.awakened ? '#f59e0b' : '#2dd4bf';
        emitSkinAccentParticle(
          particles,
          'ink_splatter',
          strikeX,
          strikeY,
          isHeavyFinisher ? 12 : 6,
          inkAccent,
          this.facing
        );
        if ((context === 'ground' && step === 4) || isHeavyFinisher) {
          particles.emitShockwave(strikeX + this.facing * 12, strikeY, '#ef4444', 102, 0.24);
          particles.emitText(strikeX + this.facing * 14, strikeY - 26, '静', '#ef4444', 26);
        }
      }
    }

    // DISTINCT AWAKENED MELEE EFFECTS PER CHARACTER (focused on combo beats & finishers, no free stun-lock spam!)
    if (this.awakened) {
      if (this.character.id === 'kuro') {
        particles.emitSlashBeam(
          this.x + this.facing * 64,
          this.y - 54,
          -0.25 * this.facing,
          170,
          vfx.slashSecondary,
          8
        );
      } else if (this.character.id === 'raijin') {
        const boltX = clamp(this.x + this.facing * 115, 56, ARENA_WIDTH - 56);
        particles.emitLightning(boltX, this.y - 120, vfx.particleSecondary, 110);
        particles.emitShockwave(boltX, GROUND_Y - 12, vfx.impactRingColor, 68, 0.22);
        if (move.heavy || step === 3 || step === 6 || isSkillLink) {
          onThunderBlinkHit(boltX - 36, boltX + 36, this.y - 52, this.facing, 16);
        }
      } else if (this.character.id === 'kagura') {
        if (move.heavy || step === 3 || step === 6) {
          const mx = clamp(this.x + this.facing * 110, 64, ARENA_WIDTH - 64);
          magmaPillars.push(new MagmaPillar(mx, this.facing, 0.06, 26, vfx.pillarTheme));
        }
      } else if (this.character.id === 'zero') {
        if (this.lastJoints) {
          this.pushAfterimage({
            x: this.x - this.facing * 26,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.24,
            color: vfx.afterimageColor,
          });
        }
      } else if (this.character.id === 'mirage') {
        const isVoidMythic = this.skinId === 'void_shatterer';
        particles.emitShards(
          this.x + this.facing * 68,
          this.y - 54,
          6,
          isVoidMythic ? '#f43f5e' : vfx.slashSecondary,
          220,
          0.95
        );
        if (this.lastJoints && (move.heavy || step === 3 || step === 6 || isSkillLink)) {
          this.pushAfterimage({
            x: this.x - this.facing * 24,
            y: this.y,
            facing: this.facing,
            joints: this.lastJoints,
            life: 0,
            maxLife: 0.24,
            color: vfx.afterimageColor,
          });
        }
      } else if (this.character.id === 'chrono') {
        const isSovereign = this.skinId === 'chrono_sovereign';
        particles.emitSparks(
          this.x + this.facing * 68,
          this.y - 54,
          8,
          isSovereign ? '#fde047' : vfx.slashSecondary,
          420
        );
        if (move.heavy || step === 3 || step === 6 || isSkillLink) {
          particles.emitShockwave(
            this.x + this.facing * 68,
            this.y - 54,
            isSovereign ? '#38bdf8' : vfx.slashPrimary,
            82,
            0.22
          );
          if (this.lastJoints) {
            this.pushAfterimage({
              x: this.x - this.facing * 24,
              y: this.y,
              facing: this.facing,
              joints: this.lastJoints,
              life: 0,
              maxLife: 0.24,
              color: vfx.afterimageColor,
            });
          }
        }
      } else if (this.character.id === 'mactien') {
        if (this.skinId === 'xuan_feng_sage') {
          // Ngự Bút Thiên Hành: Summon 2-3 floating calligraphy brush blades / Jade Bamboo Slips slashing diagonally across range
          const slipCount = move.heavy || step >= 4 || isSkillLink ? 3 : 2;
          for (let b = 0; b < slipCount; b++) {
            const spawnX = clamp(
              this.x - this.facing * (34 - b * 24) + this.facing * 16,
              36,
              ARENA_WIDTH - 36
            );
            const spawnY = this.y - (110 + b * 11);
            projectiles.push(
              new Projectile({
                x: spawnX,
                y: spawnY,
                vx: this.facing * (830 + b * 70),
                vy: 230 + b * 55,
                radius: 16,
                damage: slipCount === 3 ? 15 : 12,
                kind: 'bamboo_blade',
                fromPlayer: true,
                color: b % 2 === 0 ? '#5eead4' : '#f8fafc',
                secondaryColor: '#2dd4bf',
                rimColor: '#fde68a',
                maxLife: 0.42,
              })
            );
            particles.emitStars(spawnX, spawnY, 1, '#fde68a', 95, 0.78);
          }
          particles.emitPetals(this.x + this.facing * 76, this.y - 54, 3, '#fda4af', 140, 0.85);
          particles.emitSparks(this.x + this.facing * 76, this.y - 54, 6, '#5eead4', 360);
          if (move.heavy || step === 4 || isSkillLink) {
            particles.emitShockwave(this.x + this.facing * 78, this.y - 54, '#5eead4', 105, 0.24);
            particles.emitShockwave(this.x + this.facing * 82, this.y - 54, '#fde68a', 76, 0.2);
            if (this.lastJoints) {
              this.pushAfterimage({
                x: this.x - this.facing * 24,
                y: this.y,
                facing: this.facing,
                joints: this.lastJoints,
                life: 0,
                maxLife: 0.24,
                color: '#f8fafc',
                skinId: this.skinId,
                awakened: this.awakened,
                characterId: this.character.id,
              });
            }
          }
        } else {
          // Awakened Kim Mặc: Golden calligraphy sparks & wide golden shockwave on Hit 4!
          particles.emitSparks(this.x + this.facing * 76, this.y - 54, 10, '#fde047', 430);
          if (move.heavy || step === 4 || isSkillLink) {
            particles.emitShockwave(this.x + this.facing * 78, this.y - 54, '#f59e0b', 105, 0.24);
            if (this.lastJoints) {
              this.pushAfterimage({
                x: this.x - this.facing * 24,
                y: this.y,
                facing: this.facing,
                joints: this.lastJoints,
                life: 0,
                maxLife: 0.24,
                color: '#f59e0b',
                skinId: this.skinId,
              });
            }
          }
        }
      }
      camera.addShake(0.16, this.facing, 0);
    }

    // Also allow striking/dash-slashing a nearby standing IceWall with [J] (Overcharges on Dash/Link/Awakened!)
    for (const wall of iceWalls) {
      if (
        wall.active &&
        !wall.launched &&
        Math.abs(wall.x - this.x) < 145 &&
        Math.sign(wall.x - this.x || this.facing) === this.facing
      ) {
        const overcharge = this.activeAttackIsLinkArt || context === 'dash_slash' || this.awakened;
        wall.launch(this.facing, particles, overcharge);
        audio.playCryoShatter();
        if (overcharge) {
          const launchText =
            vfx.iceWallTheme === 'seraph'
              ? 'VẠN KIẾM XUNG KÍCH!'
              : vfx.iceWallTheme === 'void'
                ? 'HƯ KHÔNG XUNG KÍCH!'
                : 'BĂNG HUYẾT XUNG KÍCH!';
          particles.emitText(wall.x, wall.y - 118, launchText, vfx.hitTextColor, 22);
        }
        camera.addShake(overcharge ? 0.5 : 0.38, this.facing, 0);
      }
    }
  }

  private spawnCurrentHitbox(
    _iceWalls: IceWall[],
    particles: ParticleSystem,
    _audio: AudioEngine,
    _camera: Camera,
    isFinalHit = true
  ): void {
    const move = this.currentMove;
    const reachScale = move?.reachScale ?? 1;
    const heightScale = move?.heightScale ?? 1;
    const xuanFengAwakenedReach =
      this.character.id === 'mactien' && this.skinId === 'xuan_feng_sage' && this.awakened ? 24 : 0;
    const extraReach = (this.activeAttackIsLinkArt ? 36 : 0) + xuanFengAwakenedReach;
    const baseReach = (this.awakened ? 114 : 94) + this.character.reachBonus + extraReach;
    const reach = Math.round(baseReach * reachScale);
    const baseDmg = move ? move.baseDamage : 20;
    // Basic combo openers (steps 1-4) deal crisp chip damage; finishers (5-6) & Link Arts deliver true power!
    const basicStepScale =
      !this.activeAttackIsLinkArt && !move?.unblockable && this.comboStep >= 1 && this.comboStep <= 4
        ? 0.68
        : 0.8;
    const linkMult = this.activeAttackIsLinkArt ? 1.32 : basicStepScale;
    const damage = Math.round(baseDmg * this.character.damageMultiplier * (this.awakened ? 1.24 : 1) * linkMult);
    const heavy = Boolean(
      (move?.heavy && isFinalHit) ||
        this.activeAttackIsLinkArt ||
        (this.awakened && isFinalHit && (this.comboStep >= 5 || this.airComboStep === 3))
    );

    if (heavy && this.onGround) {
      const vfx = getSkinVfxProfile(this.character.id, this.skinId);
      particles.emitGroundCrack(
        this.x + this.facing * 52,
        48,
        this.awakened ? vfx.impactRingColor : vfx.particlePrimary
      );
    }

    // Surround 360° spins center the hitbox around the fighter; linear spears/blades project forward!
    const surround = Boolean(move?.surroundHit);
    this.hitboxForwardOffset = surround ? 0 : reach * 0.56;
    const hitboxWidth = surround ? Math.round(reach * 1.65) : reach;
    const hitboxHeight = Math.round((this.awakened || this.activeAttackIsLinkArt ? 112 : 96) * heightScale);

    // Sub-hits in a multi-hit flurry keep enemies close (0.32x knockback) until the final hit launches them!
    const knockScale = isFinalHit ? 1 : 0.32;
    const rawKnockX = move ? move.knockX : heavy ? 360 : 175;
    const rawKnockY = move ? move.knockY : -100;

    this.activeHitbox = {
      id: this.hitboxSeq++,
      x: this.x + this.facing * this.hitboxForwardOffset,
      y: this.y - 50,
      width: hitboxWidth,
      height: hitboxHeight,
      damage,
      knockX: this.facing * Math.round(rawKnockX * knockScale),
      knockY: isFinalHit ? rawKnockY : Math.max(-95, Math.round(rawKnockY * 0.45)),
      heavy,
      unblockable: Boolean(
        move?.unblockable ||
          this.activeAttackIsLinkArt ||
          (this.awakened && (move?.heavy || this.comboStep === 6))
      ),
      applyMarkStacks: isFinalHit ? this.activeAttackMarkStacks : 0,
      detonateMark: isFinalHit && this.activeAttackDetonates,
      isLinkArt: this.activeAttackIsLinkArt,
      hitIds: new Set<number>(),
    };
  }

  private updateAmbientAura(dt: number, particles: ParticleSystem, onChair: boolean): void {
    const vfx = getSkinVfxProfile(this.character.id, this.skinId);
    this.auraTimer -= dt;
    if (this.auraTimer <= 0) {
      this.auraTimer = this.awakened ? 0.045 : 0.085;
      particles.emitSmoke(
        this.x,
        this.y - 6,
        1,
        this.awakened ? vfx.swingAuraSecondary : vfx.swingAuraColor,
        -75,
        24
      );
      if (this.awakened) {
        particles.emitEmbers(this.x, this.y - 30, 1, vfx.particlePrimary);
      }
    }
    if (this.awakened || onChair) {
      this.accentAuraTimer -= dt;
      if (this.accentAuraTimer <= 0) {
        this.accentAuraTimer = 0.22;
        emitSkinAccentParticle(
          particles,
          vfx.swingParticleKind,
          this.x + (Math.random() - 0.5) * 36,
          this.y - 24 - Math.random() * 44,
          1,
          vfx.particleSecondary,
          this.facing
        );
      }
    }
    if (onChair || this.awakened || this.character.id === 'raijin') {
      this.chairLightningTimer -= dt;
      if (this.chairLightningTimer <= 0) {
        this.chairLightningTimer = this.awakened ? 0.14 : 0.34;
        particles.emitLightning(
          this.x + (Math.random() - 0.5) * 46,
          this.y - 24 - Math.random() * 48,
          this.awakened ? vfx.particleSecondary : vfx.particlePrimary,
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
    if (this.landTimer > 0) return 'land';
    if (Math.abs(this.vx) > 35) return 'run';
    return 'idle';
  }

  public render(ctx: CanvasRenderingContext2D, silhouetteMode = false): void {
    const vfx = getSkinVfxProfile(this.character.id, this.skinId);
    const safeX = finiteOr(this.x, 0);
    const safeY = finiteOr(this.y, GROUND_Y);
    const safePoseTime = Math.max(0, finiteOr(this.poseTime, 0));
    const safeWalkPhase = finiteOr(this.walkPhase, 0);
    const safeScaleX = finiteOr(this.scaleX, 1);
    const safeScaleY = finiteOr(this.scaleY, 1);
    const safeVx = finiteOr(this.vx, 0);
    const safeVy = finiteOr(this.vy, 0);
    const safeHitFlash = Math.max(0, finiteOr(this.hitFlash, 0));
    const facing = this.facing === -1 ? -1 : 1;

    // Render dash & combo afterimages first
    if (!silhouetteMode) {
      renderAfterimages(ctx, this.afterimages);
    }

    // Render Skill-Link Active Resonance Ring (cues [J] Link Art follow-up!)
    if (this.skillLinkTimer > 0 && !silhouetteMode) {
      const linkTimer = finiteOr(this.skillLinkTimer, 0);
      const pulse = 0.5 + 0.5 * Math.sin(safePoseTime * 22);
      ctx.save();
      try {
        ctx.translate(safeX, safeY - 52);
        ctx.globalAlpha = Math.max(0, Math.min(0.85, linkTimer * 1.4));
        ctx.strokeStyle = vfx.swingAuraSecondary;
        ctx.lineWidth = 2.6 + pulse * 1.4;
        ctx.setLineDash([12, 8]);
        ctx.rotate(safePoseTime * 5.2);
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, 44 + pulse * 6), 0, Math.PI * 2);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // Render Parry Defensive Arc Ring when active
    if (this.parryFlashTimer > 0 && !silhouetteMode) {
      const alpha = Math.max(0, Math.min(1, finiteOr(this.parryFlashTimer, 0) / 0.24));
      ctx.save();
      try {
        ctx.translate(safeX + facing * 24, safeY - 52);
        ctx.scale(facing, 1);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colorWithAlpha(vfx.impactRingColor, 0.35);
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 48, -1.35, 1.35);
        ctx.stroke();
        ctx.strokeStyle = vfx.slashPrimary;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 48, -1.35, 1.35);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, 48, -1.25, 1.25);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // Render Protagonist Stickman using smoothly blended joints + distinct Awakened visual form!
    const pose = this.getCurrentPose();
    const awakenedProfile = this.awakened
      ? getAwakenedVisualProfile(this.character.id, this.skinId)
      : null;
    const attackDuration = finiteOr(this.attackDuration, 0);
    const attackTimer = finiteOr(this.attackTimer, 0);
    const attackProgress =
      attackTimer > 0 && attackDuration > 0
        ? clamp(1 - attackTimer / attackDuration, 0, 1)
        : 0;
    this.lastJoints = renderStickman(ctx, {
      x: safeX,
      y: safeY,
      facing,
      pose,
      poseTime: safePoseTime,
      walkPhase: safeWalkPhase,
      scaleX: safeScaleX,
      scaleY: safeScaleY,
      bodyColor: this.awakened ? this.character.awakenedBodyColor : this.character.bodyColor,
      glowColor: this.awakened ? vfx.impactRingColor : this.character.glowColor,
      lineWidth: this.awakened ? 10.6 : 10.2,
      headRadius: 12.8,
      hitFlash: safeHitFlash,
      silhouette: false,
      scarf: this.scarf,
      scarfPrimary: awakenedProfile ? awakenedProfile.scarfPrimary : this.character.scarfPrimary,
      scarfHighlight: awakenedProfile ? awakenedProfile.scarfHighlight : this.character.scarfHighlight,
      hasSheath: this.character.hasSheath,
      headGear: this.character.headGear,
      characterId: this.character.id,
      vx: safeVx,
      vy: safeVy,
      awakened: this.awakened,
      darkAura: this.awakened ? this.character.awakenedAuraStyle : this.character.auraStyle,
      weapon: this.awakened ? this.character.awakenedWeapon : this.character.weapon,
      awakenedForm: this.awakened ? this.character.id : null,
      skinId: this.skinId,
      jointsOverride: this.blendedJoints ?? undefined,
      attackProgress,
      attackAuraColor: vfx.swingAuraColor,
      attackAuraSecondary: vfx.swingAuraSecondary,
      vfxMotif: vfx.motif,
      auraRimColor: vfx.auraTendrilPrimary,
      auraPuddleColor: vfx.auraTendrilSecondary,
    });

    // Render Slash Trails on top
    if (!silhouetteMode) {
      renderSlashTrails(ctx, this.slashTrails);
    }
  }
}
