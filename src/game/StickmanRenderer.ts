import type { CharacterId, ScarfNode, SkinId, SlashVfxMotif, Vec2 } from './types';
import { animeSwingCurve } from './animation';
import {
  buildSkeletonFromDraft,
  computeBasicCharacterSkeleton,
  isBasicPoseName,
} from './poses';
import { GROUND_Y } from './rules';
import type {
  Afterimage,
  BossStyleOutfit,
  EnemyOutfitId,
  SkeletonJoints,
  SlashTrail,
  SlashTrailStyle,
  StickPoseName,
  StickmanRenderOptions,
  StickmanRenderParams,
} from './renderer/types';
import {
  renderAwakenedBackForm,
  renderAwakenedHeadForm,
  renderBossOutfitDetails,
  renderHeroHeadGear,
  renderSkinBackAttachment,
  renderSkinBodyArmor,
  renderSkinFrontAttachment,
} from './renderer/gear';
import {
  renderOffhandChronoHand,
  renderOffhandDagger,
  renderOffhandMirrorShards,
  renderWeapon,
} from './renderer/weapons';
import {
  renderAfterimages,
  renderAttackSwingAura,
  renderSlashTrails,
} from './renderer/trails';
import {
  colorWithAlpha,
  drawInkBrushLimb,
  drawInkBrushTorso,
  drawInkHead,
  finiteOr,
  getSkinInkPalette,
} from './renderer/inkStyle';

export type {
  Afterimage,
  BossStyleOutfit,
  EnemyOutfitId,
  SkeletonJoints,
  SlashTrail,
  SlashTrailStyle,
  StickPoseName,
  StickmanRenderOptions,
  StickmanRenderParams,
} from './renderer/types';
export { renderAfterimages, renderSlashTrails } from './renderer/trails';

export function computeStickmanSkeleton(
  pose: StickPoseName,
  t: number,
  walkPhase: number,
  characterId?: CharacterId,
  extra?: { vx?: number; vy?: number; awakened?: boolean }
): SkeletonJoints {
  const safeT = Math.max(0, finiteOr(t, 0));
  const safeWalk = finiteOr(walkPhase, 0);
  if (isBasicPoseName(pose)) {
    return computeBasicCharacterSkeleton(pose, safeT, safeWalk, characterId, extra);
  }
  t = safeT;

  let hip: Vec2 = { x: 0, y: -48 };
  let torsoLean = 0.08;
  let spineBend = 0; // positive = hunched forward, negative = arched back
  let footLTarget: Vec2 = { x: -16, y: 0 };
  let footRTarget: Vec2 = { x: 18, y: 0 };
  let handLTarget: Vec2 = { x: -12, y: -54 };
  let handRTarget: Vec2 = { x: 24, y: -56 };
  let weaponAngle = -0.38;
  let motionArc: SkeletonJoints['motionArc'];

  const breath = Math.sin(t * 3.8) * 1.8;

  switch (pose) {
    case 'chair_idle': {
      // Iconic Vergil hunched-forward cool sit on white plastic chair (ref 00:00–00:01)
      hip = { x: -4, y: -38 };
      torsoLean = 0.24;
      spineBend = 10;
      footLTarget = { x: 10, y: 0 };
      footRTarget = { x: 24, y: -15 }; // crossed leg
      handLTarget = { x: 16, y: -48 + breath * 0.5 };
      handRTarget = { x: 14, y: -42 + breath * 0.5 };
      weaponAngle = 0.72;
      break;
    }
    case 'chair_kick': {
      const p = Math.min(1, t / 0.24);
      hip = { x: 8 * p, y: -52 - Math.sin(p * Math.PI) * 20 };
      torsoLean = 0.34;
      spineBend = 6;
      footLTarget = { x: -32 * p, y: -16 * p };
      footRTarget = { x: 20, y: -6 };
      handLTarget = { x: -18, y: -62 };
      handRTarget = { x: 30, y: -64 };
      weaponAngle = -0.7;
      motionArc = { x: -12, y: -24, r: 34, sa: 1.8, ea: 3.4 };
      break;
    }
    case 'double_jump_flip': {
      // Fluid tucked anime front somersault in mid-air!
      const p = Math.min(1, t / 0.34);
      const rot = p * Math.PI * 2;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      hip = { x: Math.sin(rot) * 6, y: -52 };
      torsoLean = rot * 0.45;
      spineBend = 14;
      footLTarget = { x: -16 * c + 12 * s, y: -22 + 16 * s };
      footRTarget = { x: 16 * c - 10 * s, y: -16 - 14 * s };
      handLTarget = { x: -22 * c, y: -62 + 12 * s };
      handRTarget = { x: 22 * c, y: -64 - 12 * s };
      weaponAngle = -1.2 + rot;
      motionArc = { x: 0, y: -50, r: 38, sa: rot - 1.4, ea: rot + 1.1 };
      break;
    }
    case 'xuan_feng_flick_1':
    case 'scholar_flick_1': {
      // Hit 1: Upright composed scholar — left hand resting behind back, right wrist gentle horizontal silk flick
      const p = Math.min(1, t / 0.19);
      const snap = animeSwingCurve(p);
      hip = { x: 2 + snap * 3, y: -50.5 };
      torsoLean = 0.02 + snap * 0.04;
      spineBend = 0.4;
      footLTarget = { x: -13, y: 0 };
      footRTarget = { x: 16, y: 0 };
      handLTarget = { x: -17, y: -47 };
      handRTarget = { x: 8 + snap * 22, y: -58 - Math.sin(p * Math.PI) * 3 };
      weaponAngle = -0.68 + snap * 1.05;
      motionArc = { x: 24, y: -58, r: 52, sa: -0.82, ea: 0.88 };
      break;
    }
    case 'xuan_feng_flick_2':
    case 'scholar_flick_2': {
      // Hit 2: Upright scholar — left hand forming chest seal, right wrist upward calligraphic sweep
      const p = Math.min(1, t / 0.2);
      const snap = animeSwingCurve(p);
      hip = { x: 3 + snap * 3, y: -51 };
      torsoLean = 0.01 + snap * 0.04;
      spineBend = -0.6;
      footLTarget = { x: -14, y: 0 };
      footRTarget = { x: 17, y: 0 };
      handLTarget = { x: 8, y: -62 };
      handRTarget = { x: 14 + snap * 14, y: -52 - snap * 24 };
      weaponAngle = 0.58 - snap * 2.05;
      motionArc = { x: 22, y: -60, r: 56, sa: -1.95, ea: 0.68 };
      break;
    }
    case 'xuan_feng_point_3':
    case 'scholar_point_3': {
      // Hit 3: Poised brush-tip point into thin air — left hand behind back, right hand extends jade brush gracefully
      const p = Math.min(1, t / 0.21);
      const snap = animeSwingCurve(p);
      hip = { x: 4 + snap * 3, y: -50.2 };
      torsoLean = 0.04 + snap * 0.04;
      spineBend = 0.6;
      footLTarget = { x: -15, y: 0 };
      footRTarget = { x: 19, y: 0 };
      handLTarget = { x: -18, y: -46 };
      handRTarget = { x: 14 + snap * 21, y: -62 + Math.sin(p * Math.PI) * 2 };
      weaponAngle = -0.06 + (1 - snap) * -0.18;
      motionArc = { x: 30, y: -60, r: 44, sa: -0.42, ea: 0.42 };
      break;
    }
    case 'xuan_feng_palm_4':
    case 'scholar_palm_4': {
      // Hit 4: Upright composed open-palm gentle push forward with chest hand-seal & brush poised behind shoulder
      const p = Math.min(1, t / 0.29);
      const snap = animeSwingCurve(p);
      hip = { x: 3 + snap * 4, y: -49.8 };
      torsoLean = 0.05 + snap * 0.05;
      spineBend = 0.5;
      footLTarget = { x: -16, y: 0 };
      footRTarget = { x: 21, y: 0 };
      handLTarget = { x: 12 + snap * 22, y: -58 };
      handRTarget = { x: 2 + snap * 6, y: -62 };
      weaponAngle = -2.08 + snap * 0.26;
      motionArc = { x: 28, y: -58, r: 62, sa: -1.65, ea: 1.05 };
      break;
    }
    case 'scholar_dash_slash': {
      // Upright poised scholar dash-cut — serene posture with swift horizontal brush sweep
      const p = Math.min(1, t / 0.23);
      const snap = animeSwingCurve(p);
      hip = { x: 10 + snap * 6, y: -46 };
      torsoLean = 0.12 + snap * 0.02;
      spineBend = 1.2;
      footLTarget = { x: -24, y: -3 };
      footRTarget = { x: 22, y: 0 };
      handLTarget = { x: -18, y: -48 };
      handRTarget = { x: 10 + snap * 28, y: -58 };
      weaponAngle = -0.14 + (1 - snap) * -1.08;
      motionArc = { x: 22, y: -56, r: 58, sa: -0.75, ea: 0.65 };
      break;
    }
    case 'scholar_parry_counter': {
      // Upright poised scholar parry counter — chest hand-seal and crisp counter-flick
      const p = Math.min(1, t / 0.25);
      const snap = animeSwingCurve(p);
      const swing = -1.85 + snap * 2.9;
      hip = { x: 6 + snap * 4, y: -49 };
      torsoLean = 0.04 + snap * 0.06;
      spineBend = 0.6;
      footLTarget = { x: -18, y: 0 };
      footRTarget = { x: 22, y: 0 };
      handLTarget = { x: 8, y: -60 };
      handRTarget = { x: 16 + Math.cos(swing) * 24, y: -60 + Math.sin(swing) * 18 };
      weaponAngle = swing * 0.85;
      motionArc = { x: 22, y: -58, r: 62, sa: -1.65, ea: 1.05 };
      break;
    }
    case 'attack_1': {
      // Dynamic Spinning High Kick with anime anticipation & snap!
      const p = Math.min(1, t / 0.2);
      const snap = animeSwingCurve(p);
      const kickExt = Math.max(-0.2, Math.min(1.15, snap));
      hip = { x: 6 + kickExt * 6, y: -50 - Math.sin(p * Math.PI) * 5 };
      torsoLean = -0.1 - kickExt * 0.32;
      spineBend = -8 * kickExt;
      footLTarget = { x: -12, y: 0 };
      footRTarget = { x: -6 + 52 * kickExt, y: -4 - 48 * Math.sin(Math.min(1, p * 1.15) * Math.PI) };
      handLTarget = { x: -26, y: -58 };
      handRTarget = { x: 14 - kickExt * 8, y: -50 };
      weaponAngle = -2.45 - kickExt * 0.25;
      motionArc = { x: 14, y: -44, r: 48, sa: -1.15, ea: 0.8 };
      break;
    }
    case 'attack_2': {
      // Wide Sweeping Horizontal Katana Slash with anticipation coil -> explosive snap!
      const p = Math.min(1, t / 0.21);
      const snap = animeSwingCurve(p);
      const swing = -2.2 + snap * 3.55;
      hip = { x: 4 + snap * 11, y: -43 };
      torsoLean = 0.22 + snap * 0.34;
      spineBend = 10;
      footLTarget = { x: -28, y: 0 };
      footRTarget = { x: 30, y: 0 };
      handLTarget = { x: -22 - snap * 6, y: -54 };
      handRTarget = { x: 16 + Math.cos(swing) * 32, y: -62 + Math.sin(swing) * 20 };
      weaponAngle = swing * 0.78;
      motionArc = { x: 18, y: -54, r: 60, sa: -1.45, ea: 0.95 };
      break;
    }
    case 'attack_3': {
      // Acrobat Rising Uppercut Launcher Slash
      const p = Math.min(1, t / 0.22);
      const snap = animeSwingCurve(p);
      const swing = 1.45 - snap * 3.4;
      hip = { x: 6 + snap * 4, y: -46 - Math.max(0, snap) * 16 };
      torsoLean = 0.2 - snap * 0.42;
      spineBend = -8 * Math.max(0, snap);
      footLTarget = { x: -16, y: 0 };
      footRTarget = { x: 22, y: -12 * Math.max(0, snap) };
      handLTarget = { x: -22, y: -56 };
      handRTarget = { x: 16 + Math.cos(swing) * 30, y: -64 + Math.sin(swing) * 32 };
      weaponAngle = swing;
      motionArc = { x: 18, y: -64, r: 60, sa: -2.0, ea: 0.5 };
      break;
    }
    case 'attack_4': {
      // Heavy Overhead Cleave / Greatblade Earth-Slam with dramatic wind-up & snap!
      const p = Math.min(1, t / 0.31);
      const snap = animeSwingCurve(p);
      const swing = -2.6 + snap * 4.0;
      hip = { x: 6 + snap * 12, y: -44 + Math.max(0, snap) * 7 };
      torsoLean = -0.1 + snap * 0.72;
      spineBend = 13;
      footLTarget = { x: -30, y: 0 };
      footRTarget = { x: 32, y: 0 };
      handLTarget = { x: 12 + Math.cos(swing) * 18, y: -58 + Math.sin(swing) * 18 };
      handRTarget = { x: 16 + Math.cos(swing) * 32, y: -60 + Math.sin(swing) * 28 };
      weaponAngle = swing;
      motionArc = { x: 20, y: -54, r: 70, sa: -2.35, ea: 1.2 };
      break;
    }
    case 'iai_draw_slash': {
      // Iconic low crouching Samurai Iaido Draw: left hand grips sheath, right snaps blade horizontally!
      const p = Math.min(1, t / 0.19);
      const snap = animeSwingCurve(p);
      hip = { x: 8 + snap * 14, y: -36 + Math.max(0, snap) * 2 };
      torsoLean = 0.62 + snap * 0.24;
      spineBend = 12;
      footLTarget = { x: -30, y: 0 };
      footRTarget = { x: 28, y: 0 };
      handLTarget = { x: -6 - snap * 14, y: -40 }; // left hand pulls sheath back!
      handRTarget = { x: -6 + snap * 46, y: -46 - Math.sin(Math.max(0, snap) * Math.PI) * 12 };
      weaponAngle = -2.85 + Math.max(0, snap) * 2.95;
      motionArc = { x: 18, y: -48, r: 64, sa: -0.95, ea: 0.75 };
      break;
    }
    case 'rising_dragon_slash': {
      // Full-body leaping dragon-fang upward spiral launcher slash!
      const p = Math.min(1, t / 0.22);
      const snap = animeSwingCurve(p);
      const swing = 1.65 - snap * 3.85;
      hip = { x: 8 + snap * 8, y: -48 - Math.max(0, snap) * 20 };
      torsoLean = 0.25 - snap * 0.56;
      spineBend = -11 * Math.max(0, snap);
      footLTarget = { x: -16, y: -8 * Math.max(0, snap) };
      footRTarget = { x: 22, y: -22 * Math.max(0, snap) };
      handLTarget = { x: -24, y: -64 - Math.max(0, snap) * 10 };
      handRTarget = { x: 16 + Math.cos(swing) * 34, y: -68 + Math.sin(swing) * 34 };
      weaponAngle = swing;
      motionArc = { x: 18, y: -66, r: 66, sa: -2.25, ea: 0.65 };
      break;
    }
    case 'vault_spear_slam': {
      // Raijin acrobatic pole-vault spin-kick & descending lightning spear slam!
      const p = Math.min(1, t / 0.25);
      const snap = animeSwingCurve(p);
      const swing = -2.45 + snap * 3.55;
      hip = { x: 10 + snap * 10, y: -56 + snap * 14 };
      torsoLean = -0.22 + snap * 0.88;
      spineBend = 11;
      footLTarget = { x: -28, y: -18 * (1 - Math.max(0, snap) * 0.6) };
      footRTarget = { x: 26, y: -12 * (1 - Math.max(0, snap)) };
      handLTarget = { x: 10 + Math.cos(swing) * 18, y: -62 + Math.sin(swing) * 18 };
      handRTarget = { x: 18 + Math.cos(swing) * 34, y: -62 + Math.sin(swing) * 26 };
      weaponAngle = swing;
      motionArc = { x: 22, y: -56, r: 68, sa: -2.35, ea: 1.25 };
      break;
    }
    case 'crimson_cleave_low': {
      // Kagura wide ground-scraping molten odachi drag-up cleave!
      const p = Math.min(1, t / 0.22);
      const snap = animeSwingCurve(p);
      const swing = 1.15 - snap * 2.55;
      hip = { x: 6 + snap * 12, y: -38 };
      torsoLean = 0.54 - snap * 0.2;
      spineBend = 12;
      footLTarget = { x: -30, y: 0 };
      footRTarget = { x: 32, y: 0 };
      handLTarget = { x: 6 + Math.cos(swing) * 16, y: -48 + Math.sin(swing) * 16 };
      handRTarget = { x: 14 + Math.cos(swing) * 34, y: -50 + Math.sin(swing) * 26 };
      weaponAngle = swing;
      motionArc = { x: 20, y: -46, r: 66, sa: -1.55, ea: 1.05 };
      break;
    }
    case 'shadow_blink_cut': {
      // Zero hyper-low panther shadow-step horizontal dual-dagger X-lunge!
      const p = Math.min(1, t / 0.16);
      const snap = animeSwingCurve(p);
      hip = { x: 14 + snap * 10, y: -34 };
      torsoLean = 0.92;
      spineBend = 12;
      footLTarget = { x: -36, y: -4 };
      footRTarget = { x: 24, y: 0 };
      handLTarget = { x: 6 + snap * 36, y: -60 + snap * 18 };
      handRTarget = { x: 6 + snap * 40, y: -34 - snap * 20 };
      weaponAngle = -0.35 + (1 - snap) * -1.4;
      motionArc = { x: 24, y: -46, r: 58, sa: -1.3, ea: 1.1 };
      break;
    }
    case 'awakened_finisher': {
      // Heroic two-handed sakuga execution overhead-to-earthbreaker slam!
      const p = Math.min(1, t / 0.32);
      const snap = animeSwingCurve(p);
      const swing = -2.85 + snap * 4.25;
      hip = { x: 8 + snap * 16, y: -50 + Math.max(0, snap) * 14 };
      torsoLean = -0.25 + snap * 0.96;
      spineBend = 14;
      footLTarget = { x: -32, y: 0 };
      footRTarget = { x: 34, y: 0 };
      handLTarget = { x: 12 + Math.cos(swing) * 20, y: -62 + Math.sin(swing) * 20 };
      handRTarget = { x: 18 + Math.cos(swing) * 35, y: -64 + Math.sin(swing) * 30 };
      weaponAngle = swing;
      motionArc = { x: 24, y: -56, r: 76, sa: -2.45, ea: 1.35 };
      break;
    }
    case 'spin_slash': {
      // 360-degree Anime Whirlwind Spin Slash (4th ground combo link!)
      const p = Math.min(1, t / 0.23);
      const snap = animeSwingCurve(p);
      const spin = -2.6 + snap * 6.1;
      hip = { x: 10 + Math.sin(p * Math.PI) * 8, y: -46 - Math.sin(p * Math.PI) * 10 };
      torsoLean = 0.32 * Math.cos(spin * 0.5);
      spineBend = 8;
      footLTarget = { x: -24 * Math.cos(spin * 0.5), y: -6 * Math.sin(p * Math.PI) };
      footRTarget = { x: 26 * Math.cos(spin * 0.5), y: -12 * Math.sin(p * Math.PI) };
      handLTarget = { x: -22 * Math.cos(spin), y: -56 + Math.sin(spin) * 10 };
      handRTarget = { x: 10 + Math.cos(spin) * 34, y: -58 + Math.sin(spin) * 18 };
      weaponAngle = spin;
      motionArc = { x: 12, y: -56, r: 64, sa: spin - 2.3, ea: spin + 0.3 };
      break;
    }
    case 'flurry_slash': {
      // Ultra-fast Multi-Cut Anime Flurry (3 rapid whip cuts in one fluid chain!)
      const p = Math.min(1, t / 0.23);
      const osc = Math.sin(p * Math.PI * 3.0);
      const osc2 = Math.cos(p * Math.PI * 3.0);
      hip = { x: 14, y: -43 };
      torsoLean = 0.52 + osc * 0.08;
      spineBend = 10;
      footLTarget = { x: -28, y: 0 };
      footRTarget = { x: 30, y: 0 };
      handLTarget = { x: 6 + osc2 * 22, y: -60 - osc * 16 };
      handRTarget = { x: 22 + osc * 22, y: -58 + osc2 * 22 };
      weaponAngle = -0.3 + osc * 1.45;
      motionArc = { x: 24, y: -56, r: 58, sa: -1.6 + osc * 0.3, ea: 1.2 + osc * 0.3 };
      break;
    }
    case 'dash_slash': {
      // Iconic Iaido Dash-Through Horizontal Lunge Slash!
      const p = Math.min(1, t / 0.24);
      const snap = animeSwingCurve(p);
      hip = { x: 16 + snap * 6, y: -36 };
      torsoLean = 0.86;
      spineBend = 12;
      footLTarget = { x: -38, y: -6 };
      footRTarget = { x: 26, y: 0 };
      handLTarget = { x: -28, y: -48 };
      handRTarget = { x: 10 + snap * 36, y: -46 };
      weaponAngle = -0.08 + (1 - snap) * -1.4;
      motionArc = { x: 18, y: -48, r: 66, sa: -0.65, ea: 0.55 };
      break;
    }
    case 'parry_counter': {
      // Blazing Guard-Break Ripper Lunge right after a Perfect Parry!
      const p = Math.min(1, t / 0.26);
      const snap = animeSwingCurve(p);
      const swing = -2.3 + snap * 3.6;
      hip = { x: 14, y: -43 };
      torsoLean = 0.5;
      spineBend = 10;
      footLTarget = { x: -28, y: 0 };
      footRTarget = { x: 32, y: 0 };
      handLTarget = { x: -18, y: -60 };
      handRTarget = { x: 20 + Math.cos(swing) * 32, y: -62 + Math.sin(swing) * 24 };
      weaponAngle = swing;
      motionArc = { x: 22, y: -56, r: 68, sa: -2.0, ea: 1.1 };
      break;
    }
    case 'cross_x_slash': {
      // Dual-Blade Twin Scissor X-Cross Lunge (signature Zero move!)
      const p = Math.min(1, t / 0.2);
      const snap = animeSwingCurve(p);
      hip = { x: 12 + snap * 6, y: -42 };
      torsoLean = 0.54;
      spineBend = 11;
      footLTarget = { x: -26, y: 0 };
      footRTarget = { x: 28, y: 0 };
      handLTarget = { x: 4 + snap * 32, y: -74 + snap * 28 };
      handRTarget = { x: 4 + snap * 34, y: -42 - snap * 26 };
      weaponAngle = 0.9 - snap * 2.1;
      motionArc = { x: 22, y: -56, r: 54, sa: -1.4, ea: 1.2 };
      break;
    }
    case 'air_attack': {
      const p = Math.min(1, t / 0.2);
      const snap = animeSwingCurve(p);
      const swing = -2.1 + snap * 3.8;
      hip = { x: 5, y: -52 };
      torsoLean = 0.38;
      spineBend = 8;
      footLTarget = { x: -18, y: -18 };
      footRTarget = { x: 22, y: -12 };
      handLTarget = { x: -18, y: -66 };
      handRTarget = { x: 16 + Math.cos(swing) * 30, y: -64 + Math.sin(swing) * 24 };
      weaponAngle = swing;
      motionArc = { x: 16, y: -58, r: 58, sa: -2.0, ea: 1.2 };
      break;
    }
    case 'air_attack_2': {
      // Acrobatic Mid-Air Rising Somersault Kick-Slash!
      const p = Math.min(1, t / 0.21);
      const snap = animeSwingCurve(p);
      const swing = 1.5 - snap * 3.9;
      hip = { x: 4, y: -56 - Math.sin(p * Math.PI) * 8 };
      torsoLean = -0.32;
      spineBend = -9;
      footLTarget = { x: -12, y: -14 };
      footRTarget = { x: 34 * Math.max(0, snap), y: -46 * Math.max(0, snap) };
      handLTarget = { x: -22, y: -62 };
      handRTarget = { x: 14 + Math.cos(swing) * 30, y: -66 + Math.sin(swing) * 28 };
      weaponAngle = swing;
      motionArc = { x: 14, y: -60, r: 60, sa: -2.3, ea: 0.6 };
      break;
    }
    case 'air_slam': {
      // Meteoric Downward Air Plunge Cleave!
      const p = Math.min(1, t / 0.28);
      const snap = animeSwingCurve(p);
      const swing = -2.4 + snap * 3.8;
      hip = { x: 10, y: -48 };
      torsoLean = 0.64;
      spineBend = 14;
      footLTarget = { x: -22, y: -24 };
      footRTarget = { x: 18, y: -12 };
      handLTarget = { x: 8 + Math.cos(swing) * 20, y: -58 + Math.sin(swing) * 20 };
      handRTarget = { x: 14 + Math.cos(swing) * 32, y: -58 + Math.sin(swing) * 28 };
      weaponAngle = swing;
      motionArc = { x: 18, y: -52, r: 68, sa: -2.4, ea: 1.35 };
      break;
    }
    case 'cryo_cast': {
      // Low martial palm-thrust summoning crystal monolith (ref 00:09–00:11)
      hip = { x: 4, y: -42 };
      torsoLean = 0.28;
      spineBend = 7;
      footLTarget = { x: -20, y: 0 };
      footRTarget = { x: 22, y: 0 };
      handLTarget = { x: 28, y: -60 };
      handRTarget = { x: 22, y: -46 };
      weaponAngle = -2.6;
      break;
    }
    case 'cryo_punch': {
      // Explosive full-body shoulder smash launching the ice wall (ref 00:13)
      hip = { x: 14, y: -40 };
      torsoLean = 0.56;
      spineBend = 10;
      footLTarget = { x: -28, y: 0 };
      footRTarget = { x: 24, y: 0 };
      handLTarget = { x: 40, y: -58 };
      handRTarget = { x: -20, y: -50 };
      weaponAngle = -2.75;
      motionArc = { x: 24, y: -56, r: 38, sa: -0.9, ea: 0.9 };
      break;
    }
    case 'awaken_pose': {
      // Hand raised skyward summoning crimson energy & Blood Greatsword (ref 00:38!)
      hip = { x: 0, y: -48 };
      torsoLean = -0.1;
      spineBend = -5;
      footLTarget = { x: -22, y: 0 };
      footRTarget = { x: 22, y: 0 };
      handLTarget = { x: -22, y: -68 };
      handRTarget = { x: 10, y: -108 };
      weaponAngle = -Math.PI * 0.5;
      break;
    }
    case 'victory_dance': {
      // Energetic bouncy anime victory dance with arm waves & cross-arm crouch hop (ref 00:23–00:26!)
      const beat = t * 9.5;
      const phase = Math.floor(beat / Math.PI) % 2;
      const hop = Math.abs(Math.sin(beat)) * 16;
      const sway = Math.sin(beat * 0.5) * 10;
      if (phase === 0) {
        hip = { x: sway, y: -46 - hop };
        torsoLean = Math.sin(beat * 0.5) * 0.25;
        spineBend = 4;
        footLTarget = { x: -16 + Math.cos(beat) * 8, y: -Math.max(0, Math.sin(beat)) * 12 };
        footRTarget = { x: 16 - Math.cos(beat) * 8, y: -Math.max(0, -Math.sin(beat)) * 12 };
        handLTarget = { x: -26 + sway, y: -74 + Math.sin(beat) * 18 };
        handRTarget = { x: 26 + sway, y: -74 - Math.sin(beat) * 18 };
      } else {
        // Crossed-arm rhythmic bounce hop (ref 00:25)
        hip = { x: sway * 0.6, y: -38 - hop * 1.1 };
        torsoLean = 0.26;
        spineBend = 9;
        footLTarget = { x: -14, y: -hop * 0.6 };
        footRTarget = { x: 14, y: -hop * 0.8 };
        handLTarget = { x: 14, y: -56 - hop * 0.5 };
        handRTarget = { x: -12, y: -58 - hop * 0.5 };
      }
      weaponAngle = -1.35 + Math.sin(beat) * 0.5;
      motionArc = { x: 0, y: -58, r: 46, sa: -2.4, ea: -0.7 };
      break;
    }
    case 'hurt': {
      hip = { x: -10, y: -46 };
      torsoLean = -0.44;
      spineBend = -10;
      footLTarget = { x: -20, y: 0 };
      footRTarget = { x: 12, y: -6 };
      handLTarget = { x: -24, y: -62 };
      handRTarget = { x: 8, y: -52 };
      weaponAngle = -1.9;
      break;
    }
    case 'ko': {
      // Dramatic crumpled white stickman collapse onto the floor (ref 00:04–00:13!)
      const p = Math.min(1, t / 0.28);
      hip = { x: -14 * p, y: -46 + 38 * p };
      torsoLean = -0.4 - 1.25 * p;
      spineBend = -6 * p;
      footLTarget = { x: -28, y: -4 };
      footRTarget = { x: 10, y: -2 };
      handLTarget = { x: -42 * p, y: -14 };
      handRTarget = { x: -14, y: -8 };
      weaponAngle = -2.8;
      break;
    }
    case 'gun_aim':
    case 'sniper_aim': {
      hip = { x: -4, y: -46 };
      torsoLean = 0.1;
      spineBend = 2;
      footLTarget = { x: -18, y: 0 };
      footRTarget = { x: 20, y: 0 };
      handLTarget = { x: 18, y: -66 };
      handRTarget = { x: 32, y: -68 };
      weaponAngle = 0;
      break;
    }
    case 'shield_guard': {
      hip = { x: 0, y: -44 };
      torsoLean = 0.16;
      spineBend = 4;
      footLTarget = { x: -20, y: 0 };
      footRTarget = { x: 20, y: 0 };
      handLTarget = { x: 24, y: -60 };
      handRTarget = { x: -12, y: -54 };
      weaponAngle = -0.6;
      break;
    }
    case 'shield_charge': {
      hip = { x: 12, y: -40 };
      torsoLean = 0.52;
      spineBend = 10;
      footLTarget = { x: -26, y: -6 };
      footRTarget = { x: 24, y: 0 };
      handLTarget = { x: 32, y: -58 };
      handRTarget = { x: -18, y: -56 };
      weaponAngle = -2.2;
      break;
    }
    case 'spear_thrust': {
      const p = Math.min(1, t / 0.18);
      const snap = animeSwingCurve(p);
      hip = { x: 8 + snap * 14, y: -42 };
      torsoLean = 0.34 + snap * 0.32;
      spineBend = 9;
      footLTarget = { x: -32, y: 0 };
      footRTarget = { x: 32, y: 0 };
      handLTarget = { x: -4 + snap * 24, y: -58 };
      handRTarget = { x: 16 + snap * 34, y: -58 };
      weaponAngle = -0.02;
      break;
    }
    case 'spear_jab_low': {
      // Raijin knee-drop long-reach ankle/midsection lightning spear poke!
      const p = Math.min(1, t / 0.19);
      const snap = animeSwingCurve(p);
      hip = { x: 10 + snap * 14, y: -35 };
      torsoLean = 0.56 + snap * 0.24;
      spineBend = 11;
      footLTarget = { x: -36, y: 0 };
      footRTarget = { x: 30, y: 0 };
      handLTarget = { x: 0 + snap * 22, y: -48 };
      handRTarget = { x: 18 + snap * 36, y: -44 };
      weaponAngle = 0.12;
      break;
    }
    case 'spear_flurry_thrust': {
      // Raijin Hundred-Spear Rapid Multi-Jab (piston-like lightning stabs at 3 angles!)
      const p = Math.min(1, t / 0.28);
      const jab = Math.sin(p * Math.PI * 5.0);
      const aim = Math.sin(p * Math.PI * 3.0) * 0.24;
      hip = { x: 12, y: -41 };
      torsoLean = 0.44;
      spineBend = 8;
      footLTarget = { x: -32, y: 0 };
      footRTarget = { x: 30, y: 0 };
      handLTarget = { x: 4 + jab * 14, y: -56 + aim * 18 };
      handRTarget = { x: 24 + jab * 24, y: -56 + aim * 24 };
      weaponAngle = aim;
      break;
    }
    case 'spear_sky_drill': {
      // Raijin upward diagonal spiral spear launcher!
      const p = Math.min(1, t / 0.22);
      const snap = animeSwingCurve(p);
      hip = { x: 8 + snap * 8, y: -46 - Math.max(0, snap) * 18 };
      torsoLean = 0.12 - snap * 0.34;
      spineBend = -6;
      footLTarget = { x: -20, y: -6 * Math.max(0, snap) };
      footRTarget = { x: 24, y: -18 * Math.max(0, snap) };
      handLTarget = { x: 6 + snap * 16, y: -62 - snap * 18 };
      handRTarget = { x: 18 + snap * 26, y: -70 - snap * 24 };
      weaponAngle = -0.68;
      break;
    }
    case 'spear_dragon_pierce': {
      // Raijin Combo 6: Deep coil pull-back -> full-extension sonic Dragon Piercer lunge!
      const p = Math.min(1, t / 0.32);
      const snap = p < 0.28 ? -0.45 * (p / 0.28) : animeSwingCurve((p - 0.28) / 0.72);
      hip = { x: 10 + snap * 20, y: -36 };
      torsoLean = 0.35 + Math.max(0, snap) * 0.55;
      spineBend = 12;
      footLTarget = { x: -40, y: 0 };
      footRTarget = { x: 34, y: 0 };
      handLTarget = { x: -8 + snap * 30, y: -52 };
      handRTarget = { x: 8 + snap * 42, y: -52 };
      weaponAngle = 0;
      break;
    }
    case 'spear_air_dive': {
      // Raijin mid-air 45-degree downward lightning spear plunge!
      const p = Math.min(1, t / 0.24);
      const snap = animeSwingCurve(p);
      hip = { x: 8, y: -50 };
      torsoLean = 0.68;
      spineBend = 10;
      footLTarget = { x: -24, y: -26 };
      footRTarget = { x: 14, y: -18 };
      handLTarget = { x: 8 + snap * 16, y: -54 + snap * 12 };
      handRTarget = { x: 20 + snap * 26, y: -44 + snap * 18 };
      weaponAngle = 0.62;
      break;
    }
    case 'nodachi_drag_cleave': {
      // Kagura two-handed heavy ground-dragging molten odachi cleave!
      const p = Math.min(1, t / 0.27);
      const snap = p < 0.3 ? -0.35 * (p / 0.3) : animeSwingCurve((p - 0.3) / 0.7);
      const swing = 2.25 - snap * 3.1;
      hip = { x: 4 + Math.max(0, snap) * 14, y: -37 };
      torsoLean = 0.58 - Math.max(0, snap) * 0.28;
      spineBend = 12;
      footLTarget = { x: -32, y: 0 };
      footRTarget = { x: 34, y: 0 };
      // Both hands grip the long Nodachi hilt together!
      handLTarget = { x: 10 + Math.cos(swing) * 24, y: -48 + Math.sin(swing) * 20 };
      handRTarget = { x: 14 + Math.cos(swing) * 30, y: -48 + Math.sin(swing) * 24 };
      weaponAngle = swing;
      break;
    }
    case 'nodachi_overhead_slam': {
      // Kagura colossal two-handed overhead execution slam that craters the ground!
      const p = Math.min(1, t / 0.32);
      const snap = p < 0.32 ? -0.3 * (p / 0.32) : animeSwingCurve((p - 0.32) / 0.68);
      const swing = -2.55 + Math.max(-0.25, snap) * 3.45;
      hip = { x: 6 + Math.max(0, snap) * 14, y: -45 + Math.max(0, snap) * 9 };
      torsoLean = -0.24 + Math.max(0, snap) * 0.92;
      spineBend = 14;
      footLTarget = { x: -32, y: 0 };
      footRTarget = { x: 36, y: 0 };
      handLTarget = { x: 10 + Math.cos(swing) * 24, y: -60 + Math.sin(swing) * 24 };
      handRTarget = { x: 15 + Math.cos(swing) * 32, y: -60 + Math.sin(swing) * 28 };
      weaponAngle = swing;
      break;
    }
    case 'nodachi_tornado_spin': {
      // Kagura wide 360-degree two-handed horizontal flame cyclone sweep!
      const p = Math.min(1, t / 0.29);
      const spin = -Math.PI + p * Math.PI * 2.2;
      const reachX = Math.cos(spin);
      hip = { x: 8 * reachX, y: -41 };
      torsoLean = 0.36 * reachX;
      spineBend = 9;
      footLTarget = { x: -28, y: 0 };
      footRTarget = { x: 30, y: 0 };
      handLTarget = { x: reachX * 26, y: -52 };
      handRTarget = { x: reachX * 34, y: -52 };
      weaponAngle = reachX >= 0 ? 0.06 : Math.PI - 0.06;
      break;
    }
    case 'nodachi_earth_splitter': {
      // Kagura Combo 6: Leaping two-handed meteoric Nodachi earth-splitter!
      const p = Math.min(1, t / 0.38);
      const snap = p < 0.34 ? -0.35 * (p / 0.34) : animeSwingCurve((p - 0.34) / 0.66);
      const swing = -2.75 + Math.max(-0.3, snap) * 3.85;
      const airLift = Math.sin(Math.min(1, p * 1.2) * Math.PI) * 18;
      hip = { x: 8 + Math.max(0, snap) * 16, y: -46 - airLift + Math.max(0, snap) * 12 };
      torsoLean = -0.3 + Math.max(0, snap) * 1.05;
      spineBend = 15;
      footLTarget = { x: -34, y: -airLift * 0.4 };
      footRTarget = { x: 36, y: -airLift * 0.2 };
      handLTarget = { x: 12 + Math.cos(swing) * 26, y: -62 - airLift * 0.5 + Math.sin(swing) * 26 };
      handRTarget = { x: 18 + Math.cos(swing) * 34, y: -62 - airLift * 0.5 + Math.sin(swing) * 30 };
      weaponAngle = swing;
      break;
    }
    case 'dagger_reverse_slice': {
      // Zero reverse-grip twin-dagger wide outward scissor rip!
      const p = Math.min(1, t / 0.15);
      const snap = animeSwingCurve(p);
      hip = { x: 12 + snap * 8, y: -38 };
      torsoLean = 0.68;
      spineBend = 10;
      footLTarget = { x: -30, y: 0 };
      footRTarget = { x: 28, y: 0 };
      handLTarget = { x: 28 - snap * 48, y: -56 - snap * 8 };
      handRTarget = { x: -12 + snap * 48, y: -50 + snap * 6 };
      weaponAngle = 2.65 - snap * 2.4;
      break;
    }
    case 'dagger_buzzsaw_flip': {
      // Zero acrobatic mid-air forward buzzsaw somersault with twin blades extended!
      const p = Math.min(1, t / 0.21);
      const rot = p * Math.PI * 2.4;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      hip = { x: 6, y: -54 };
      torsoLean = rot;
      spineBend = 14;
      footLTarget = { x: -18 * c, y: -36 + 18 * s };
      footRTarget = { x: 18 * c, y: -36 - 18 * s };
      handLTarget = { x: -30 * c, y: -54 - 26 * s };
      handRTarget = { x: 30 * c, y: -54 + 26 * s };
      weaponAngle = rot + 0.4;
      break;
    }
    case 'dagger_phantom_blitz': {
      // Zero hyper-speed 4-cut alternating left/right assassin twin-dagger blitz!
      const p = Math.min(1, t / 0.22);
      const cyc = Math.sin(p * Math.PI * 4.0);
      const cycOpp = -cyc;
      hip = { x: 15, y: -36 };
      torsoLean = 0.78;
      spineBend = 11;
      footLTarget = { x: -34, y: 0 };
      footRTarget = { x: 28, y: 0 };
      handLTarget = { x: 18 + cycOpp * 26, y: -54 + cyc * 16 };
      handRTarget = { x: 20 + cyc * 28, y: -48 - cyc * 16 };
      weaponAngle = cyc * 1.15;
      break;
    }
    case 'katana_zantetsu_cut': {
      // Kuro Combo 6: Lightning-fast Iaido Horizon Sever -> crisp snap-resheath stance!
      const p = Math.min(1, t / 0.29);
      const snap = p < 0.65 ? animeSwingCurve(p / 0.65) : 1;
      const resheath = p >= 0.65 ? (p - 0.65) / 0.35 : 0;
      hip = { x: 14 + snap * 8, y: -36 };
      torsoLean = 0.72 - resheath * 0.35;
      spineBend = 10;
      footLTarget = { x: -36, y: 0 };
      footRTarget = { x: 32, y: 0 };
      handLTarget = { x: -8, y: -40 }; // left thumb clicks tsuba guard at hip!
      handRTarget = {
        x: (1 - resheath) * (-6 + snap * 46) + resheath * 2,
        y: (1 - resheath) * -48 + resheath * -40,
      };
      weaponAngle = (1 - resheath) * (-2.6 + snap * 2.8) + resheath * -2.85;
      break;
    }
    case 'laser_slash': {
      const p = Math.min(1, t / 0.25);
      const swing = -2.1 + p * 3.5;
      hip = { x: 12, y: -44 };
      torsoLean = 0.46;
      spineBend = 9;
      footLTarget = { x: -24, y: 0 };
      footRTarget = { x: 26, y: 0 };
      handLTarget = { x: -18, y: -58 };
      handRTarget = { x: 16 + Math.cos(swing) * 30, y: -64 + Math.sin(swing) * 24 };
      weaponAngle = swing;
      break;
    }
    case 'float_cast': {
      // Dynamic aerial skating pose for Fable (ref 00:43–00:46!)
      const hover = Math.sin(t * 4.8) * 7;
      hip = { x: 0, y: -54 + hover };
      torsoLean = -0.14;
      spineBend = -6;
      footLTarget = { x: -22, y: -2 + hover };
      footRTarget = { x: 18, y: -26 + hover }; // bent skating front knee
      handLTarget = { x: -24, y: -82 + hover };
      handRTarget = { x: 26, y: -76 + hover };
      weaponAngle = -0.5;
      break;
    }
  }

  return buildSkeletonFromDraft({
    hip,
    torsoLean,
    spineBend,
    footL: footLTarget,
    footR: footRTarget,
    handL: handLTarget,
    handR: handRTarget,
    weaponAngle,
    motionArc,
  });
}

export function strokeSkeletonLimbs(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  lw: number,
  headR: number,
  color: string,
  drawBackOnly = false,
  drawFrontOnly = false,
  shadowColor?: string,
  rimColor?: string
): void {
  const safeLw = Math.max(1, finiteOr(lw, 9.5));
  const safeHeadR = Math.max(1, finiteOr(headR, 12));

  if (!drawFrontOnly) {
    // Back leg & arm
    drawInkBrushLimb(
      ctx,
      joints.hip.x,
      joints.hip.y,
      joints.kneeL.x,
      joints.kneeL.y,
      safeLw * 1.1,
      safeLw * 0.88,
      color,
      shadowColor,
      rimColor
    );
    drawInkBrushLimb(
      ctx,
      joints.kneeL.x,
      joints.kneeL.y,
      joints.footL.x,
      joints.footL.y,
      safeLw * 0.88,
      safeLw * 0.56,
      color,
      shadowColor,
      rimColor
    );

    drawInkBrushLimb(
      ctx,
      joints.shoulderL.x,
      joints.shoulderL.y,
      joints.elbowL.x,
      joints.elbowL.y,
      safeLw * 0.98,
      safeLw * 0.8,
      color,
      shadowColor,
      rimColor
    );
    drawInkBrushLimb(
      ctx,
      joints.elbowL.x,
      joints.elbowL.y,
      joints.handL.x,
      joints.handL.y,
      safeLw * 0.8,
      safeLw * 0.56,
      color,
      shadowColor,
      rimColor
    );

    // Sculpted V-tapered Ink-Wash Torso along curved Bézier spine
    drawInkBrushTorso(
      ctx,
      joints.hip.x,
      joints.hip.y,
      joints.spineMid.x,
      joints.spineMid.y,
      joints.neck.x,
      joints.neck.y,
      safeLw * 1.44,
      safeLw * 0.96,
      color,
      shadowColor,
      rimColor
    );

    // Head with optional sumi-e shadow & directional rim light
    drawInkHead(
      ctx,
      joints.head.x,
      joints.head.y,
      safeHeadR,
      '',
      color,
      shadowColor,
      rimColor
    );
  }

  if (!drawBackOnly) {
    // Front leg & arm
    drawInkBrushLimb(
      ctx,
      joints.hip.x,
      joints.hip.y,
      joints.kneeR.x,
      joints.kneeR.y,
      safeLw * 1.16,
      safeLw * 0.92,
      color,
      shadowColor,
      rimColor
    );
    drawInkBrushLimb(
      ctx,
      joints.kneeR.x,
      joints.kneeR.y,
      joints.footR.x,
      joints.footR.y,
      safeLw * 0.92,
      safeLw * 0.6,
      color,
      shadowColor,
      rimColor
    );

    drawInkBrushLimb(
      ctx,
      joints.shoulderR.x,
      joints.shoulderR.y,
      joints.elbowR.x,
      joints.elbowR.y,
      safeLw * 1.04,
      safeLw * 0.84,
      color,
      shadowColor,
      rimColor
    );
    drawInkBrushLimb(
      ctx,
      joints.elbowR.x,
      joints.elbowR.y,
      joints.handR.x,
      joints.handR.y,
      safeLw * 0.84,
      safeLw * 0.6,
      color,
      shadowColor,
      rimColor
    );
  }
}

export function renderStickman(
  ctx: CanvasRenderingContext2D,
  opts: StickmanRenderOptions
): SkeletonJoints {
  const safeX = finiteOr(opts.x, 0);
  const safeY = finiteOr(opts.y, 0);
  const safePoseTime = finiteOr(opts.poseTime, 0);
  const safeWalkPhase = finiteOr(opts.walkPhase, 0);
  const safeScaleX = finiteOr(opts.scaleX, 1);
  const safeScaleY = finiteOr(opts.scaleY, 1);
  const facing = opts.facing === -1 ? -1 : 1;

  const joints =
    opts.jointsOverride ??
    computeStickmanSkeleton(opts.pose, safePoseTime, safeWalkPhase, opts.characterId, {
      vx: opts.vx,
      vy: opts.vy,
      awakened: opts.awakened ?? Boolean(opts.awakenedForm),
    });

  const isMono = Boolean(opts.silhouette || opts.whiteFlash);
  const isHitFlash = !isMono && finiteOr(opts.hitFlash, 0) > 0;
  const isAwakened = Boolean(opts.awakened || opts.awakenedForm);
  const inkPalette = getSkinInkPalette(
    opts.characterId,
    opts.skinId,
    isAwakened,
    opts.bodyColor,
    opts.glowColor
  );

  // 1. Writhing Sumi-e Ink-Flame / Shadow Puddle at Fighter's Feet
  if (opts.darkAura && opts.darkAura !== 'none' && !isMono) {
    renderDarkInkAura(
      ctx,
      safeX,
      safeY,
      safePoseTime,
      opts.darkAura,
      opts.skinId,
      opts.auraRimColor,
      opts.auraPuddleColor,
      opts.characterId,
      opts.entityTier,
      opts.enragePhase
    );
  }

  // 2. Smooth Quadratic Ink-Wash Flowing Verlet Scarf with Swallowtail Tip
  if (opts.scarf && opts.scarf.length > 1 && !isMono) {
    renderCelScarf(
      ctx,
      opts.scarf,
      opts.scarfPrimary ?? inkPalette.clothPrimary,
      opts.scarfHighlight ?? inkPalette.clothHighlight
    );
  }

  ctx.save();
  try {
    ctx.translate(safeX, safeY);
    ctx.scale(facing * safeScaleX, safeScaleY);

    // 3. Fable Aerial White Skate-Arc Trails beneath feet
    if (opts.bossOutfit === 'fable' && !isMono) {
      ctx.save();
      try {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(joints.footL.x - 16, joints.footL.y + 6);
        ctx.quadraticCurveTo(10, joints.footL.y + 14, joints.footR.x + 28, joints.footR.y + 34);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(132, 204, 22, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(joints.footL.x - 10, joints.footL.y + 11);
        ctx.quadraticCurveTo(14, joints.footL.y + 20, joints.footR.x + 22, joints.footR.y + 38);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // 4. Sweeping Anime Speed-Arc Motion Lines (suppressed & replaced by polygonal mirror-fractures for Mirage)
    if (joints.motionArc && !isMono) {
      const a = joints.motionArc;
      const ax = finiteOr(a.x, 0);
      const ay = finiteOr(a.y, -48);
      const ar = Math.max(1, finiteOr(a.r, 40));
      const sa = finiteOr(a.sa, -1);
      const ea = finiteOr(a.ea, 1);
      ctx.save();
      try {
        if (opts.characterId === 'mirage') {
          const isVoid = opts.skinId === 'void_shatterer';
          const primaryCol = isVoid ? '#f43f5e' : '#c084fc';
          const glintCol = isVoid ? '#38bdf8' : '#f1f5f9';
          const steps = 4;

          // Jagged spatial fracture crack polyline (no circular ctx.arc)
          ctx.strokeStyle = colorWithAlpha(glintCol, 0.55);
          ctx.lineWidth = 2.0;
          ctx.lineJoin = 'miter';
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const ang = sa + (ea - sa) * frac;
            const rad = ar + (i % 2 === 0 ? 5 : -6);
            const px = ax + Math.cos(ang) * rad;
            const py = ay + Math.sin(ang) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Sharp polygonal mirror-shard glints along the motion fracture
          for (let i = 0; i < 3; i++) {
            const frac = 0.2 + i * 0.3;
            const ang = sa + (ea - sa) * frac;
            const sx = ax + Math.cos(ang) * (ar + (i === 1 ? 7 : -2));
            const sy = ay + Math.sin(ang) * (ar + (i === 1 ? 7 : -2));
            ctx.save();
            try {
              ctx.translate(sx, sy);
              ctx.rotate(ang + Math.PI * 0.5);
              ctx.fillStyle = colorWithAlpha(i === 1 ? glintCol : primaryCol, 0.72);
              ctx.strokeStyle = '#0b0c10';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(9, 0);
              ctx.lineTo(0, -3.2);
              ctx.lineTo(-7, 0);
              ctx.lineTo(0, 3.2);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } finally {
              ctx.restore();
            }
          }
        } else if (opts.characterId === 'chrono') {
          const isSov = opts.skinId === 'chrono_sovereign';
          const arcPrimary = isSov ? '#f59e0b' : '#2dd4bf';
          const arcRim = isSov ? '#38bdf8' : '#fef08a';

          ctx.strokeStyle = colorWithAlpha(arcPrimary, 0.56);
          ctx.lineWidth = 2.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ax, ay, ar, sa, ea);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha(arcRim, 0.45);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ax, ay, ar + 7, sa + 0.12, ea - 0.12);
          ctx.stroke();

          // Radial clock-dial ticks along arc
          ctx.strokeStyle = colorWithAlpha(arcRim, 0.75);
          ctx.lineWidth = 1.4;
          for (let i = 0; i <= 4; i++) {
            const ang = sa + (ea - sa) * (i / 4);
            ctx.beginPath();
            ctx.moveTo(ax + Math.cos(ang) * (ar - 4), ay + Math.sin(ang) * (ar - 4));
            ctx.lineTo(ax + Math.cos(ang) * (ar + 9), ay + Math.sin(ang) * (ar + 9));
            ctx.stroke();
          }
        } else if (opts.characterId === 'mactien' && opts.skinId === 'xuan_feng_sage') {
          // Ink-wash + jade-teal double silk motion arc with peach petal flecks & 4-point star glint
          ctx.strokeStyle = colorWithAlpha('#1e293b', 0.42);
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ax, ay, ar, sa, ea);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#5eead4', 0.64);
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(ax, ay, ar + 1, sa + 0.04, ea - 0.04);
          ctx.stroke();

          ctx.strokeStyle = colorWithAlpha('#f8fafc', 0.78);
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.arc(ax, ay, ar + 6, sa + 0.14, ea - 0.14);
          ctx.stroke();

          // 2 delicate peach blossom petal flecks along arc
          for (let i = 0; i < 2; i++) {
            const pAng = sa + (ea - sa) * (0.28 + i * 0.44);
            const px = ax + Math.cos(pAng) * (ar + 7);
            const py = ay + Math.sin(pAng) * (ar + 7);
            ctx.save();
            try {
              ctx.translate(px, py);
              ctx.rotate(pAng + 0.6);
              ctx.fillStyle = colorWithAlpha('#fda4af', 0.85);
              ctx.strokeStyle = colorWithAlpha('#1e293b', 0.48);
              ctx.lineWidth = 0.65;
              ctx.beginPath();
              ctx.ellipse(0, 0, 2.8, 1.5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } finally {
              ctx.restore();
            }
          }

          // Crisp 4-point star glint near leading tip
          const starAng = ea - (ea - sa) * 0.12;
          const sx0 = ax + Math.cos(starAng) * (ar + 3);
          const sy0 = ay + Math.sin(starAng) * (ar + 3);
          const rOut = 4.6;
          const rIn = 1.15;
          ctx.fillStyle = colorWithAlpha('#f0fdfa', 0.9);
          ctx.beginPath();
          ctx.moveTo(sx0, sy0 - rOut);
          ctx.lineTo(sx0 + rIn, sy0 - rIn);
          ctx.lineTo(sx0 + rOut, sy0);
          ctx.lineTo(sx0 + rIn, sy0 + rIn);
          ctx.lineTo(sx0, sy0 + rOut);
          ctx.lineTo(sx0 - rIn, sy0 + rIn);
          ctx.lineTo(sx0 - rOut, sy0);
          ctx.lineTo(sx0 - rIn, sy0 - rIn);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.34)';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ax, ay, ar, sa, ea);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(ax, ay, ar + 8, sa + 0.15, ea - 0.15);
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }
    }

    // 4A. Per-Skin Attack Swing Aura Burst around fighter during active strike
    if (
      opts.attackProgress !== undefined &&
      Number.isFinite(opts.attackProgress) &&
      opts.attackProgress > 0 &&
      opts.attackProgress < 1 &&
      !isMono
    ) {
      renderAttackSwingAura(ctx, joints, opts);
    }

    // 5. Flowing Ink-Wash Boss Cape / Cloak
    if ((opts.capeColor || opts.bossOutfit === 'sol') && !isMono) {
      const wave = Math.sin(safePoseTime * 9) * 8;
      const capeFill = opts.bossOutfit === 'sol' ? '#181a20' : opts.capeColor!;
      const capeRim = opts.inkRimColor ?? inkPalette.rimColor;
      ctx.save();
      try {
        ctx.fillStyle = capeFill;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.8;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(joints.neck.x - 4, joints.neck.y + 2);
        ctx.quadraticCurveTo(
          joints.hip.x - 30,
          joints.hip.y - 6 + wave * 0.5,
          joints.hip.x - 48,
          -4 + wave
        );
        ctx.lineTo(joints.hip.x - 16, -2 + wave * 0.4);
        ctx.lineTo(joints.neck.x + 4, joints.neck.y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crisp ink-wash rim highlight along trailing cape edge
        ctx.strokeStyle = colorWithAlpha(capeRim, 0.72);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(joints.neck.x - 4, joints.neck.y + 3);
        ctx.quadraticCurveTo(
          joints.hip.x - 28,
          joints.hip.y - 5 + wave * 0.5,
          joints.hip.x - 45,
          -5 + wave
        );
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // 5A. Skin Back Attachments
    const localVx = (opts.vx ?? 0) * facing;
    if (!isMono && (opts.characterId || opts.skinId)) {
      renderSkinBackAttachment(
        ctx,
        joints,
        opts.skinId ?? 'default',
        isAwakened,
        safePoseTime,
        opts.characterId,
        localVx,
        opts.vy ?? 0
      );
    }

    // 5B. Distinct Awakened Visual Form Back Attachments
    if (opts.awakenedForm && !isMono) {
      renderAwakenedBackForm(ctx, joints, opts.awakenedForm, safePoseTime, opts.skinId);
    }

    const lw = Math.max(1, finiteOr(opts.lineWidth, 9.5));
    const headR = Math.max(2, finiteOr(opts.headRadius, 12.2));
    const fillColor = opts.silhouette
      ? '#07080b'
      : opts.whiteFlash || isHitFlash
        ? '#ffffff'
        : opts.bodyColor || inkPalette.baseFill;
    const shadowColor = !isMono && !isHitFlash ? inkPalette.shadowFill : undefined;
    const rimColor = !isMono && !isHitFlash ? (opts.inkRimColor ?? inkPalette.rimColor) : undefined;

    // Altitude-aware ground shadow + sleek glossy floor reflection
    if (!isMono && opts.pose !== 'float_cast') {
      const heightAboveFloor = Math.max(0, GROUND_Y - safeY);
      const groundFactor = Math.max(0.18, 1 - heightAboveFloor / 260);
      const shadowY = heightAboveFloor + 2;

      if (heightAboveFloor < 130) {
        const reflAlpha = (1 - heightAboveFloor / 130) * 0.16;
        ctx.save();
        try {
          ctx.translate(0, shadowY * 2 - 2);
          ctx.scale(1, -0.58);
          ctx.globalAlpha = reflAlpha;
          strokeSkeletonLimbs(ctx, joints, lw + 1, headR, fillColor);
        } finally {
          ctx.restore();
        }
      }

      ctx.fillStyle = `rgba(0, 0, 0, ${(0.42 * groundFactor).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(0, shadowY, 26 * groundFactor, 6 * groundFactor, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft additive rim glow for protagonist, Fable, or rim-lit bosses/elites
    if (
      !isMono &&
      ((opts.darkAura !== 'none' && opts.darkAura !== undefined) ||
        opts.bossOutfit === 'fable' ||
        Boolean(opts.inkRimColor))
    ) {
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28;
        strokeSkeletonLimbs(
          ctx,
          joints,
          lw + 8.8,
          headR + 4.3,
          opts.inkRimColor ?? opts.glowColor
        );
      } finally {
        ctx.restore();
      }
    }

    // Subtle crisp outer ink-wash rim halo behind the sumi outline so dark silhouettes pop on dark arenas
    if (!isMono && !isHitFlash && rimColor) {
      strokeSkeletonLimbs(
        ctx,
        joints,
        lw + 6.2,
        headR + 3.1,
        colorWithAlpha(rimColor, 0.34)
      );
    }

    // BOLD SUMI-E BLACK INK OUTLINE PASS (tapered calligraphic contour)
    if (!opts.whiteFlash) {
      strokeSkeletonLimbs(ctx, joints, lw + 4.4, headR + 2.3, inkPalette.inkOutline);
    }

    // Main Body Back + Torso + Head Fill (with sumi-e shadow wash & directional rim light)
    strokeSkeletonLimbs(ctx, joints, lw, headR, fillColor, true, false, shadowColor, rimColor);

    // Boss Outfits: Tunic, Mask, Glowing Eyes
    if (opts.bossOutfit && opts.bossOutfit !== 'none' && !isMono) {
      renderBossOutfitDetails(
        ctx,
        joints,
        headR,
        opts.bossOutfit,
        safePoseTime,
        opts.entityTier,
        opts.enragePhase
      );
    }

    // Skin Body Armor
    if (!isMono && (opts.characterId || opts.skinId)) {
      renderSkinBodyArmor(
        ctx,
        joints,
        opts.skinId ?? 'default',
        isAwakened,
        safePoseTime,
        opts.characterId,
        localVx,
        opts.vy
      );
    }

    // Playable Fighter Headgear
    if (opts.headGear && opts.headGear !== 'none' && !isMono) {
      renderHeroHeadGear(
        ctx,
        joints,
        headR,
        opts.headGear,
        safePoseTime,
        opts.skinId,
        opts.characterId
      );
    }

    // Distinct Awakened Form Head & Aura Crown / Horns / Spikes / Oni Trails
    if (opts.awakenedForm && !isMono) {
      renderAwakenedHeadForm(ctx, joints, headR, opts.awakenedForm, safePoseTime, opts.skinId);
    }

    // Front-layer depth-sorted skin attachments (e.g. 3D orbiting Jade Bamboo Slips / Small Seals)
    if (!isMono && (opts.characterId || opts.skinId)) {
      renderSkinFrontAttachment(
        ctx,
        joints,
        opts.skinId ?? 'default',
        isAwakened,
        safePoseTime,
        opts.characterId,
        localVx,
        opts.vy ?? 0
      );
    }

    // Skin-aware Waist Sheath (covers all Kuro & Kagura skins)
    if (opts.hasSheath && !isMono) {
      renderWaistSheath(ctx, joints, opts.characterId, opts.skinId);
    }

    // Weapon attached to front hand
    if (opts.weapon && opts.weapon !== 'none' && !opts.silhouette) {
      renderWeapon(
        ctx,
        joints,
        opts.weapon,
        safePoseTime,
        Boolean(opts.whiteFlash),
        opts.skinId,
        opts.inkAccent,
        localVx,
        opts.vy ?? 0
      );
    }

    // Front Leg & Front Arm Fill (with sumi-e shadow wash & directional rim light)
    strokeSkeletonLimbs(ctx, joints, lw, headR, fillColor, false, true, shadowColor, rimColor);

    // Snug Ink-Wash Scarf Neck Collar
    if (opts.scarf && opts.scarf.length > 0 && !isMono) {
      const collarPrimary = opts.scarfPrimary ?? inkPalette.clothPrimary;
      const collarHighlight = opts.scarfHighlight ?? inkPalette.clothHighlight;
      ctx.save();
      try {
        ctx.translate(joints.neck.x, joints.neck.y + 2);
        ctx.fillStyle = collarPrimary;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11.5, 5.8, 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = collarHighlight;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(0, -1, 8.2, 2.8, 0.12, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }

    // Off-hand dagger / void saber for Zero & cyber_ninja (delegated to weapons.ts)
    if ((opts.weapon === 'twin_daggers' || opts.weapon === 'void_sabers') && !isMono) {
      renderOffhandDagger(
        ctx,
        joints,
        opts.weapon,
        opts.skinId,
        Boolean(opts.whiteFlash),
        opts.inkAccent
      );
    } else if (
      (opts.weapon === 'mirror_shards' || opts.weapon === 'void_prism_scythe') &&
      !opts.silhouette
    ) {
      renderOffhandMirrorShards(
        ctx,
        joints,
        opts.weapon,
        safePoseTime,
        Boolean(opts.whiteFlash),
        opts.skinId,
        opts.inkAccent
      );
    } else if (
      (opts.weapon === 'chrono_hand' || opts.weapon === 'chrono_twin_hands') &&
      !opts.silhouette
    ) {
      renderOffhandChronoHand(
        ctx,
        joints,
        opts.weapon,
        safePoseTime,
        Boolean(opts.whiteFlash),
        opts.skinId,
        opts.inkAccent
      );
    } else if ((opts.weapon === 'arcane_hands' || opts.weapon === 'prismatic_hands') && !isMono) {
      const isRainbow = opts.skinId === 'prismatic_archon' || opts.weapon === 'prismatic_hands';
      const r = opts.weapon === 'prismatic_hands' ? 16 : 12;
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(joints.handL.x, joints.handL.y);
        ctx.rotate(-safePoseTime * 4.2);
        ctx.strokeStyle = isRainbow ? '#38bdf8' : '#e879f9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = isRainbow ? '#fde047' : '#38bdf8';
        ctx.lineWidth = 1.3;
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

      if (opts.pose === 'parry') {
        const bx = (joints.handL.x + joints.handR.x) * 0.5 + 10;
        const by = (joints.handL.y + joints.handR.y) * 0.5;
        const barrierCol = isRainbow ? '#38bdf8' : '#e879f9';
        const innerBarrierCol = isRainbow ? '#fde047' : '#38bdf8';
        ctx.save();
        try {
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(bx, by);
          ctx.strokeStyle = barrierCol;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 15, 32, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = innerBarrierCol;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = safePoseTime * 3.2 + (i * Math.PI) / 3;
            const rx = Math.cos(a) * 11;
            const ry = Math.sin(a) * 24;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(2, 0, 11, 24, 0, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.stroke();
        } finally {
          ctx.restore();
        }
      }
    }

    // Ink-Washed Round Shield on front/left hand for Boss 1 Haiku & Aegis Guard
    if (opts.weapon === 'shield_sword' && !isMono) {
      ctx.save();
      try {
        ctx.translate(joints.handL.x + 6, joints.handL.y);
        ctx.fillStyle = '#d6c38d';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 21, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dark sumi-e shield shadow crescent
        ctx.fillStyle = '#927948';
        ctx.beginPath();
        ctx.ellipse(-2, 1, 9, 17, 0, Math.PI * 0.5, Math.PI * 1.5);
        ctx.closePath();
        ctx.fill();

        // Shield boss & rim highlight
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(0, 0, 11.5, 18.5, 0, -Math.PI * 0.42, Math.PI * 0.28);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    }
  } finally {
    ctx.restore();
  }
  return joints;
}

function renderWaistSheath(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  characterId?: CharacterId,
  skinId?: SkinId
): void {
  let bodyCol = '#1f232c';
  let wrapCol = '#ef4444';
  let fittingCol = '#facc15';
  let rimCol = '#94a3b8';

  if (skinId === 'radiant_seraph') {
    bodyCol = '#f8fafc';
    wrapCol = '#f59e0b';
    fittingCol = '#facc15';
    rimCol = '#ffffff';
  } else if (skinId === 'void_walker') {
    bodyCol = '#1e1b4b';
    wrapCol = '#a855f7';
    fittingCol = '#e879f9';
    rimCol = '#d8b4fe';
  } else if (skinId === 'eclipse_ronin') {
    bodyCol = '#09090b';
    wrapCol = '#f97316';
    fittingCol = '#fde047';
    rimCol = '#fb923c';
  } else if (skinId === 'solar_phoenix') {
    bodyCol = '#7f1d1d';
    wrapCol = '#fde047';
    fittingCol = '#fef9c3';
    rimCol = '#fbbf24';
  } else if (skinId === 'frost_empress') {
    bodyCol = '#0c4a6e';
    wrapCol = '#38bdf8';
    fittingCol = '#c084fc';
    rimCol = '#e0f2fe';
  } else if (characterId === 'kagura') {
    bodyCol = '#1c1917';
    wrapCol = '#f97316';
    fittingCol = '#fbbf24';
    rimCol = '#fed7aa';
  }

  ctx.save();
  try {
    ctx.translate(joints.hip.x - 4, joints.hip.y + 2);
    ctx.rotate(0.28);
    ctx.lineCap = 'round';

    // Outer sumi-ink contour
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 9.2;
    ctx.beginPath();
    ctx.moveTo(-43, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    // Scabbard body
    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = 5.4;
    ctx.stroke();

    // Top specular rim highlight
    ctx.strokeStyle = colorWithAlpha(rimCol, 0.72);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-40, -1.8);
    ctx.lineTo(9, -1.8);
    ctx.stroke();

    // Sageo cord bands
    ctx.strokeStyle = wrapCol;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-24, 0);
    ctx.moveTo(-8, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Kojiri & Koiguchi metallic fittings
    ctx.strokeStyle = fittingCol;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-43, -2);
    ctx.lineTo(-43, 2);
    ctx.moveTo(10, -3.2);
    ctx.lineTo(13, 3.2);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

function renderDarkInkAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  mode: 'purple' | 'crimson' | 'cyan' | 'gold' | 'ember' | 'emerald',
  skinId?: SkinId,
  auraRimColor?: string,
  auraPuddleColor?: string,
  characterId?: CharacterId,
  entityTier?: 'hero' | 'mob' | 'elite' | 'boss',
  enragePhase?: 1 | 2
): void {
  ctx.save();
  try {
    ctx.translate(x, y + 2);
    const rimMap: Record<typeof mode, [string, string]> = {
      purple: ['#7c3aed', 'rgba(124, 58, 237, 0.32)'],
      crimson: ['#dc2626', 'rgba(220, 38, 38, 0.34)'],
      cyan: ['#06b6d4', 'rgba(6, 182, 212, 0.34)'],
      gold: ['#eab308', 'rgba(234, 179, 8, 0.36)'],
      ember: ['#f97316', 'rgba(249, 115, 22, 0.35)'],
      emerald: ['#10b981', 'rgba(16, 185, 129, 0.34)'],
    };
    const skinMap: Partial<Record<SkinId, { rim: string; puddle: string; core: string }>> = {
      radiant_seraph: { rim: '#eab308', puddle: 'rgba(250, 204, 21, 0.36)', core: '#fef9c3' },
      void_walker: { rim: '#a855f7', puddle: 'rgba(147, 51, 234, 0.36)', core: '#090418' },
      eclipse_ronin: { rim: '#f97316', puddle: 'rgba(220, 38, 38, 0.38)', core: '#090404' },
      storm_shogun: { rim: '#3b82f6', puddle: 'rgba(37, 99, 235, 0.36)', core: '#0f172a' },
      cyber_valkyrie: { rim: '#e879f9', puddle: 'rgba(217, 70, 239, 0.35)', core: '#090418' },
      solar_phoenix: { rim: '#fbbf24', puddle: 'rgba(239, 68, 68, 0.36)', core: '#1c0602' },
      frost_empress: { rim: '#22d3ee', puddle: 'rgba(14, 165, 233, 0.36)', core: '#0c4a6e' },
      blood_moon: { rim: '#f43f5e', puddle: 'rgba(225, 29, 72, 0.36)', core: '#1f060c' },
      astral_phantom: { rim: '#6366f1', puddle: 'rgba(79, 70, 229, 0.36)', core: '#1e1b4b' },
      prismatic_archon: { rim: '#38bdf8', puddle: 'rgba(236, 72, 153, 0.38)', core: '#1e1b4b' },
      celestial_empress: { rim: '#38bdf8', puddle: 'rgba(56, 189, 248, 0.38)', core: '#060a18' },
      abyssal_valkyrie: { rim: '#f43f5e', puddle: 'rgba(190, 18, 60, 0.40)', core: '#0d040b' },
      void_shatterer: { rim: '#f43f5e', puddle: 'rgba(244, 63, 94, 0.38)', core: '#09090b' },
      chrono_sovereign: { rim: '#f59e0b', puddle: 'rgba(245, 158, 11, 0.38)', core: '#120b03' },
      xuan_feng_sage: { rim: '#5eead4', puddle: 'rgba(94, 234, 212, 0.30)', core: '#0f172a' },
    };
    const defaultCharMap: Partial<
      Record<CharacterId, { rim: string; puddle: string; core: string }>
    > = {
      aether: { rim: '#e879f9', puddle: 'rgba(192, 38, 211, 0.36)', core: '#130524' },
      valkyrie: { rim: '#facc15', puddle: 'rgba(250, 204, 21, 0.36)', core: '#1c1404' },
      mirage: { rim: '#c084fc', puddle: 'rgba(192, 132, 252, 0.34)', core: '#130f2e' },
      chrono: { rim: '#2dd4bf', puddle: 'rgba(45, 212, 191, 0.34)', core: '#041f1e' },
    };

    const safeTime = finiteOr(time, 0);
    const skinCfg =
      skinId && skinId !== 'default'
        ? skinMap[skinId]
        : characterId
          ? defaultCharMap[characterId]
          : undefined;
    const [fallbackRim, fallbackPuddle] = rimMap[mode];
    const rimColor = auraRimColor ?? skinCfg?.rim ?? fallbackRim;
    const puddleColor = auraPuddleColor ?? skinCfg?.puddle ?? fallbackPuddle;
    const coreColor = skinCfg?.core ?? '#0b0c10';
    const isEnraged = enragePhase === 2;
    const scaleRadius = isEnraged ? 1.16 : 1;

    // Soft outer rim puddle
    ctx.fillStyle = puddleColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 48 * scaleRadius, 12 * scaleRadius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sumi-e ink splatter ring + droplets around the base puddle
    ctx.strokeStyle = colorWithAlpha('#0b0c10', 0.85);
    ctx.lineWidth = isEnraged ? 3 : 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 44 * scaleRadius, 10.5 * scaleRadius, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Core ink pool
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40 * scaleRadius, 8.5 * scaleRadius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elite / Enraged Boss ring accent
    if (entityTier === 'elite' || isEnraged) {
      ctx.strokeStyle = colorWithAlpha(rimColor, 0.78);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 52 * scaleRadius, 13 * scaleRadius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Orbiting sumi-e ink droplets
    ctx.fillStyle = '#0b0c10';
    for (let d = 0; d < 4; d++) {
      const a = safeTime * 2.4 + d * (Math.PI * 0.5);
      const dx = Math.cos(a) * 48 * scaleRadius;
      const dy = Math.sin(a) * 10 * scaleRadius - Math.abs(Math.sin(safeTime * 4 + d)) * 4;
      ctx.beginPath();
      ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (
      skinId === 'chrono_sovereign' ||
      (characterId === 'chrono' && (!skinId || skinId === 'default'))
    ) {
      // Chrono / Thần Thời Gian: Crisp ink-wash Roman clock dial + rotating gear ticks ground aura
      const isSov = skinId === 'chrono_sovereign';
      const dialPrimary = isSov ? '#f59e0b' : '#2dd4bf';
      const dialSecondary = isSov ? '#38bdf8' : '#fef08a';
      const rx = 44 * scaleRadius;
      const ry = 10.5 * scaleRadius;

      // Outer gilded/teal bezel ellipse
      ctx.strokeStyle = dialPrimary;
      ctx.lineWidth = isSov ? 2.2 : 1.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner counter-rotating gear tick ring in perspective
      ctx.strokeStyle = dialSecondary;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const ang = (k * Math.PI * 2) / 12 + safeTime * (isSov ? 0.9 : 0.55);
        const rIn = k % 3 === 0 ? 0.62 : 0.78;
        ctx.moveTo(Math.cos(ang) * rx * rIn, Math.sin(ang) * ry * rIn);
        ctx.lineTo(Math.cos(ang) * rx * 0.96, Math.sin(ang) * ry * 0.96);
      }
      ctx.stroke();

      // Sweeping perspective clock hands across the dial
      const minA = safeTime * 2.6;
      const hrA = -safeTime * 0.7;
      ctx.strokeStyle = isSov ? '#fef08a' : '#99f6e4';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(minA) * rx * 0.78, Math.sin(minA) * ry * 0.78);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(hrA) * rx * 0.52, Math.sin(hrA) * ry * 0.52);
      ctx.stroke();

      // Ascending time-dust / clock sparks
      for (let s = -2; s <= 2; s++) {
        const sx = s * 14 + Math.sin(safeTime * 4.2 + s * 1.3) * 4;
        const sy = -8 - Math.abs(Math.cos(safeTime * 5.0 + s * 1.9)) * (isSov ? 16 : 11);
        ctx.fillStyle = s % 2 === 0 ? dialPrimary : dialSecondary;
        ctx.strokeStyle = '#081214';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3.6);
        ctx.lineTo(sx + 2.4, sy);
        ctx.lineTo(sx, sy + 3.6);
        ctx.lineTo(sx - 2.4, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (
      skinId === 'void_shatterer' ||
      (characterId === 'mirage' && (!skinId || skinId === 'default'))
    ) {
      // Mirage / Ma Kính: Shattered obsidian crystal puddle + angular fracture lines + prismatic shard tendrils
      const isVoid = skinId === 'void_shatterer';
      const shardPrimary = isVoid ? '#f43f5e' : '#c084fc';
      const shardSecondary = isVoid ? '#38bdf8' : '#f1f5f9';
      const shardCore = isVoid ? '#18181b' : '#1e1b4b';
      const shardOutline = isVoid ? '#07040a' : '#0b0c10';

      // Angular shattered mirror web across the ground puddle
      ctx.strokeStyle = shardSecondary;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k * Math.PI) / 3 + 0.2;
        ctx.moveTo(Math.cos(ang) * 10, Math.sin(ang) * 2.5);
        ctx.lineTo(Math.cos(ang) * 44 * scaleRadius, Math.sin(ang) * 10.5 * scaleRadius);
      }
      ctx.stroke();

      // 7 sharp faceted crystal shard tendrils rising around feet
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11.5;
        const h =
          (isVoid ? 21 : 17) +
          Math.sin(safeTime * 6.4 + i * 1.55) * 6 +
          (3 - Math.abs(i)) * 4.5;
        const tilt = i * 2.2 + Math.cos(safeTime * 4.2 + i) * 2.5;
        ctx.fillStyle = shardCore;
        ctx.strokeStyle = shardOutline;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - 4.2, 1);
        ctx.lineTo(bx + tilt, -h);
        ctx.lineTo(bx + 4.2, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lit prism facet half
        ctx.fillStyle = i % 2 === 0 ? shardPrimary : shardSecondary;
        ctx.beginPath();
        ctx.moveTo(bx, 0.5);
        ctx.lineTo(bx + tilt, -h + 1);
        ctx.lineTo(bx + 3.5, 0.5);
        ctx.closePath();
        ctx.fill();
      }

      // Orbiting floating mirror splinters for Ma Kính (void_shatterer)
      if (isVoid) {
        for (let s = 0; s < 3; s++) {
          const sa = safeTime * 3.1 + (s * Math.PI * 2) / 3;
          const sx = Math.cos(sa) * 36;
          const sy = -10 - Math.abs(Math.sin(safeTime * 4.8 + s * 1.7)) * 12;
          ctx.fillStyle = s % 2 === 0 ? '#38bdf8' : '#f43f5e';
          ctx.strokeStyle = '#07040a';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 4.5);
          ctx.lineTo(sx + 2.6, sy);
          ctx.lineTo(sx, sy + 4.5);
          ctx.lineTo(sx - 2.6, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (skinId === 'xuan_feng_sage') {
      // Xuân Phong Văn Thánh: Trận đồ Thư Pháp – Viên Tương – Hoa Đào dưới chân (tương đương mật độ Chrono Sovereign)
      const rx = 46 * scaleRadius;
      const ry = 11.2 * scaleRadius;

      // 1. Outer pale-gold & jade-teal elliptical scripture ring
      ctx.strokeStyle = colorWithAlpha('#fde68a', 0.72);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + 3, ry + 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#5eead4';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Perspective open Zen Enso brush stroke rotating slowly across floor pool
      const ensoRot = safeTime * 0.65;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.76, ry * 0.76, 0, ensoRot + 0.25, ensoRot + Math.PI * 1.72);
      ctx.stroke();

      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.66, ry * 0.66, 0, ensoRot + 0.45, ensoRot + Math.PI * 1.52);
      ctx.stroke();

      // 3. 12 counter-rotating Confucian / calligraphy tick marks along perspective ring
      for (let k = 0; k < 12; k++) {
        const ang = (k * Math.PI * 2) / 12 - safeTime * 0.55;
        const isCardinal = k % 3 === 0;
        const rIn = isCardinal ? 0.64 : 0.82;
        ctx.strokeStyle = isCardinal ? '#fde68a' : '#5eead4';
        ctx.lineWidth = isCardinal ? 1.7 : 1.15;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * rx * rIn, Math.sin(ang) * ry * rIn);
        ctx.lineTo(Math.cos(ang) * rx * 0.98, Math.sin(ang) * ry * 0.98);
        ctx.stroke();
      }

      // 4. 5 ascending peach blossom petals & jade-gold calligraphy sparks rising around feet
      for (let s = -2; s <= 2; s++) {
        const sx = s * 15 + Math.sin(safeTime * 3.4 + s * 1.4) * 5;
        const sy = -7 - Math.abs(Math.cos(safeTime * 4.0 + s * 1.8)) * 15;
        if (s % 2 === 0) {
          // Ascending peach blossom petal
          ctx.save();
          try {
            ctx.translate(sx, sy);
            ctx.rotate(safeTime * 1.5 + s);
            ctx.fillStyle = s === 0 ? '#fbcfe8' : '#fda4af';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 0.95;
            ctx.beginPath();
            ctx.moveTo(0, -3.2);
            ctx.quadraticCurveTo(3.2, -0.8, 1.5, 2.8);
            ctx.quadraticCurveTo(0, 3.4, -1.5, 2.8);
            ctx.quadraticCurveTo(-3.2, -0.8, 0, -3.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } finally {
            ctx.restore();
          }
        } else {
          // Jade-teal & pale-gold calligraphy spark diamond
          ctx.fillStyle = s > 0 ? '#5eead4' : '#fde68a';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 3.4);
          ctx.lineTo(sx + 2.2, sy);
          ctx.lineTo(sx, sy + 3.4);
          ctx.lineTo(sx - 2.2, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (skinId === 'radiant_seraph' || (characterId === 'valkyrie' && (!skinId || skinId === 'default'))) {
      // Luminous golden rays rising from holy light pool
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 18 + Math.sin(time * 7.5 + i * 1.4) * 8 + (3 - Math.abs(i)) * 4;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx * 1.15, -h);
        ctx.stroke();
      }
    } else if (skinId === 'frost_empress') {
      // Glacial cyan-violet crystal spikes rising around feet
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 17 + Math.sin(time * 5 + i * 1.6) * 5 + (3 - Math.abs(i)) * 4;
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#c084fc';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx - 4, 1);
        ctx.lineTo(bx, -h);
        ctx.lineTo(bx + 4, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (skinId === 'cyber_valkyrie') {
      // Stepped neon-magenta & cyan digital energy bars
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 15 + Math.abs(Math.sin(time * 10 + i * 1.8)) * 14;
        ctx.fillStyle = i % 2 === 0 ? '#e879f9' : '#22d3ee';
        ctx.fillRect(bx - 2.2, -h, 4.4, h);
      }
    } else if (skinId === 'eclipse_ronin') {
      // Solar-eclipse obsidian ring + blazing crimson-gold ink flame tongues
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -4, 32, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 19 + Math.sin(time * 8 + i * 1.5) * 9 + (3 - Math.abs(i)) * 4.5;
        const sway = Math.cos(time * 6.5 + i * 1.8) * 8;
        ctx.strokeStyle = i % 2 === 0 ? '#f97316' : '#dc2626';
        ctx.lineWidth = 5.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + sway, -h * 0.55, bx + sway * 1.3, -h);
        ctx.stroke();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    } else if (
      skinId === 'prismatic_archon' ||
      (characterId === 'aether' && (!skinId || skinId === 'default'))
    ) {
      // Arcane / Prismatic floating sigil motes & ascending wisps
      const isPrism = skinId === 'prismatic_archon';
      const prismCols = ['#f43f5e', '#fde047', '#34d399', '#38bdf8', '#c084fc'];
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 17 + Math.sin(time * 6.8 + i * 1.5) * 8 + (3 - Math.abs(i)) * 3.5;
        const sway = Math.cos(time * 5.2 + i * 1.7) * 7;
        ctx.strokeStyle = isPrism ? prismCols[(i + 3) % prismCols.length] : rimColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + sway, -h * 0.55, bx + sway * 1.25, -h);
        ctx.stroke();
      }
      ctx.fillStyle = isPrism ? '#fde047' : '#38bdf8';
      for (let s = -1; s <= 1; s++) {
        const sx = s * 18 + Math.sin(time * 4.5 + s) * 4;
        const sy = -12 - Math.abs(Math.cos(time * 5.2 + s * 2)) * 12;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skinId === 'celestial_empress') {
      // Starlight sapphire & gold plumes
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 18 + Math.sin(time * 6.5 + i * 1.4) * 8 + (3 - Math.abs(i)) * 4;
        ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#fde047';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx * 1.1, -h * 0.5, bx * 1.2, -h);
        ctx.stroke();
      }
    } else if (skinId === 'abyssal_valkyrie') {
      // Eclipse crimson-violet dark feathers rising
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 19 + Math.sin(time * 7.8 + i * 1.5) * 9 + (3 - Math.abs(i)) * 4;
        const sway = Math.cos(time * 6.2 + i * 1.8) * 8;
        ctx.strokeStyle = i % 2 === 0 ? '#f43f5e' : '#a855f7';
        ctx.lineWidth = 4.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + sway, -h * 0.55, bx + sway * 1.3, -h);
        ctx.stroke();
        ctx.strokeStyle = '#09040b';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    } else if (skinId === 'astral_phantom') {
      // Indigo nebula wisps + 3 twinkling star points
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 17 + Math.sin(time * 6.5 + i * 1.4) * 8 + (3 - Math.abs(i)) * 3.5;
        const sway = Math.cos(time * 5 + i * 1.9) * 7;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + sway, -h * 0.55, bx + sway * 1.3, -h);
        ctx.stroke();
      }
      ctx.fillStyle = '#fde047';
      for (let s = -1; s <= 1; s++) {
        const sx = s * 16 + Math.sin(time * 4 + s) * 4;
        const sy = -10 - Math.abs(Math.cos(time * 5 + s * 2)) * 12;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skinId === 'blood_moon') {
      // Crimson crescent arc rim + scarlet wisps
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0.15, Math.PI - 0.15);
      ctx.stroke();
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11;
        const h = 18 + Math.sin(time * 7.5 + i * 1.4) * 9 + (3 - Math.abs(i)) * 4;
        const sway = Math.cos(time * 6 + i * 1.9) * 8;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + sway, -h * 0.55, bx + sway * 1.35, -h);
        ctx.stroke();
        ctx.strokeStyle = '#4c0519';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    } else {
      // Classic 7 writhing sumi-e ink-flame tendrils (intensified in Boss Phase 2)
      const innerColor =
        skinId === 'solar_phoenix'
          ? '#fef08a'
          : skinId === 'storm_shogun'
            ? '#fde047'
            : '#0a090e';
      const boost = isEnraged ? 1.25 : 1;
      for (let i = -3; i <= 3; i++) {
        const bx = i * 11 * boost;
        const h = (18 + Math.sin(time * 7.5 + i * 1.4) * 9 + (3 - Math.abs(i)) * 4) * boost;
        const sway = Math.cos(time * 6 + i * 1.9) * 8;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = isEnraged ? 5.8 : 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + sway, -h * 0.55, bx + sway * 1.35, -h);
        ctx.stroke();

        ctx.strokeStyle = innerColor;
        ctx.lineWidth = skinId === 'solar_phoenix' || skinId === 'storm_shogun' ? 2.2 : 3;
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
}

function renderCelScarf(
  ctx: CanvasRenderingContext2D,
  scarf: ScarfNode[],
  primaryColor: string,
  highlightColor: string
): void {
  const pts = scarf.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
  if (pts.length < 2) return;

  ctx.save();
  try {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawQuadraticRibbon = (extraWidth: number, color: string, offsetY = 0) => {
      ctx.strokeStyle = color;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const prev = i > 0 ? pts[i - 1] : a;
        const t = i / (pts.length - 1);
        const w = Math.max(2.2, 15 * (1 - t * 0.58) + extraWidth);
        ctx.lineWidth = w;
        const sx = i === 0 ? a.x : (prev.x + a.x) * 0.5;
        const sy = (i === 0 ? a.y : (prev.y + a.y) * 0.5) + offsetY;
        const ex = i === pts.length - 2 ? b.x : (a.x + b.x) * 0.5;
        const ey = (i === pts.length - 2 ? b.y : (a.y + b.y) * 0.5) + offsetY;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(a.x, a.y + offsetY, ex, ey);
        ctx.stroke();
      }
    };

    // Bold sumi-e ink outline
    drawQuadraticRibbon(4.6, '#0b0c10');
    // Primary cloth body
    drawQuadraticRibbon(0, primaryColor);
    // Subtle underside fold shadow
    drawQuadraticRibbon(-6.5, colorWithAlpha('#090b10', 0.3), 2.4);
    // Top rim highlight band
    drawQuadraticRibbon(-5.8, highlightColor, -1.2);

    // Tapered swallowtail forked ink tips at tail end
    const tail = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = tail.x - prev.x;
    const dy = tail.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.5) {
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;
      const drawFork = (spread: number, forkLen: number) => {
        const tipX = tail.x + ux * forkLen + px * spread;
        const tipY = tail.y + uy * forkLen + py * spread;
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = '#0b0c10';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tail.x + px * (spread * 0.35), tail.y + py * (spread * 0.35));
        ctx.quadraticCurveTo(
          tail.x + ux * (forkLen * 0.55) + px * (spread * 0.7),
          tail.y + uy * (forkLen * 0.55) + py * (spread * 0.7),
          tipX,
          tipY
        );
        ctx.quadraticCurveTo(
          tail.x + ux * (forkLen * 0.4),
          tail.y + uy * (forkLen * 0.4),
          tail.x,
          tail.y
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      drawFork(6, 13);
      drawFork(-5, 10);
    }
  } finally {
    ctx.restore();
  }
}


