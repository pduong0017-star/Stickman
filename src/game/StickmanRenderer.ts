import type { CharacterId, ScarfNode, Vec2 } from './types';
import { animeSwingCurve, computeRunStrideKinematics } from './animation';

export type StickPoseName =
  | 'chair_idle'
  | 'chair_kick'
  | 'idle'
  | 'run'
  | 'brake_skid'
  | 'jump'
  | 'double_jump_flip'
  | 'fall'
  | 'dash'
  | 'attack_1'
  | 'attack_2'
  | 'attack_3'
  | 'attack_4'
  | 'iai_draw_slash'
  | 'rising_dragon_slash'
  | 'vault_spear_slam'
  | 'crimson_cleave_low'
  | 'shadow_blink_cut'
  | 'awakened_finisher'
  | 'spin_slash'
  | 'flurry_slash'
  | 'dash_slash'
  | 'parry_counter'
  | 'cross_x_slash'
  | 'air_attack'
  | 'air_attack_2'
  | 'air_slam'
  | 'parry'
  | 'cryo_cast'
  | 'cryo_punch'
  | 'awaken_pose'
  | 'victory_dance'
  | 'hurt'
  | 'ko'
  | 'gun_aim'
  | 'shield_guard'
  | 'shield_charge'
  | 'spear_thrust'
  | 'laser_slash'
  | 'sniper_aim'
  | 'float_cast';

export type BossStyleOutfit =
  | 'none'
  | 'haiku'
  | 'astra'
  | 'opus'
  | 'sol'
  | 'fable';

export interface SkeletonJoints {
  hip: Vec2;
  spineMid: Vec2;
  neck: Vec2;
  head: Vec2;
  shoulderL: Vec2;
  elbowL: Vec2;
  handL: Vec2;
  shoulderR: Vec2;
  elbowR: Vec2;
  handR: Vec2;
  kneeL: Vec2;
  footL: Vec2;
  kneeR: Vec2;
  footR: Vec2;
  weaponAngle: number;
  motionArc?: {
    x: number;
    y: number;
    r: number;
    sa: number;
    ea: number;
  };
}

export interface SlashTrail {
  x: number;
  y: number;
  facing: 1 | -1;
  radius: number;
  startAngle: number;
  endAngle: number;
  life: number;
  maxLife: number;
  outerColor: string;
  coreColor: string;
  thickness: number;
}

export interface Afterimage {
  x: number;
  y: number;
  facing: 1 | -1;
  joints: SkeletonJoints;
  life: number;
  maxLife: number;
  color: string;
}

export interface StickmanRenderOptions {
  x: number;
  y: number;
  facing: 1 | -1;
  pose: StickPoseName;
  poseTime: number;
  walkPhase: number;
  scaleX?: number;
  scaleY?: number;
  bodyColor: string;
  glowColor: string;
  lineWidth?: number;
  headRadius?: number;
  hitFlash?: number;
  silhouette?: boolean;
  whiteFlash?: boolean;
  scarf?: ScarfNode[];
  scarfPrimary?: string;
  scarfHighlight?: string;
  hasSheath?: boolean;
  darkAura?: 'none' | 'purple' | 'crimson' | 'cyan' | 'gold' | 'ember' | 'emerald';
  headGear?: 'none' | 'volt_visor' | 'flame_band' | 'phantom_eyes';
  weapon?:
    | 'none'
    | 'katana'
    | 'blood_greatsword'
    | 'volt_spear'
    | 'thunder_halberd'
    | 'flame_nodachi'
    | 'solar_greatblade'
    | 'twin_daggers'
    | 'void_sabers'
    | 'dagger'
    | 'pistol'
    | 'sword'
    | 'shield_sword'
    | 'spear'
    | 'laser_blade'
    | 'sniper_rifle'
    | 'neon_orb';
  capeColor?: string;
  bossOutfit?: BossStyleOutfit;
  awakenedForm?: CharacterId | null;
  jointsOverride?: SkeletonJoints;
}

function solveTwoBoneIK(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  bendDir: number
): Vec2 {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const dist = Math.max(0.01, Math.min(len1 + len2 - 0.01, Math.hypot(dx, dy)));
  const baseAngle = Math.atan2(dy, dx);
  const cosAngle = Math.max(
    -1,
    Math.min(1, (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist))
  );
  const angle = baseAngle + bendDir * Math.acos(cosAngle);
  return {
    x: root.x + Math.cos(angle) * len1,
    y: root.y + Math.sin(angle) * len1,
  };
}

/**
 * Computes elastic anime stickman skeleton with curved Bézier spine & expressive martial arts keyframing.
 */
export function computeStickmanSkeleton(
  pose: StickPoseName,
  t: number,
  walkPhase: number
): SkeletonJoints {
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
    case 'idle': {
      hip = { x: 0, y: -48 + breath };
      torsoLean = 0.1;
      spineBend = 3;
      footLTarget = { x: -17, y: 0 };
      footRTarget = { x: 18, y: 0 };
      handLTarget = { x: 10, y: -56 + breath };
      handRTarget = { x: 24, y: -52 + breath };
      weaponAngle = -0.45;
      break;
    }
    case 'run': {
      // Anatomically grounded anime martial-arts sprint (no straight-leg lock, natural arm counter-pump, sleek trailing blade!)
      const k = computeRunStrideKinematics(walkPhase);
      hip = k.hip;
      torsoLean = k.torsoLean;
      spineBend = k.spineBend;
      footLTarget = k.footL;
      footRTarget = k.footR;
      handLTarget = k.handL;
      handRTarget = k.handR;
      weaponAngle = k.weaponAngle;
      break;
    }
    case 'brake_skid': {
      // Stylish anime sprint-brake skid with leaning heels
      hip = { x: -6, y: -40 };
      torsoLean = -0.34;
      spineBend = -6;
      footLTarget = { x: -14, y: 0 };
      footRTarget = { x: 28, y: 0 };
      handLTarget = { x: -24, y: -56 };
      handRTarget = { x: 18, y: -52 };
      weaponAngle = -0.7;
      break;
    }
    case 'jump': {
      const tuck = Math.min(1, t / 0.18);
      hip = { x: 0, y: -52 - tuck * 3 };
      torsoLean = 0.24;
      spineBend = 7;
      footLTarget = { x: -14, y: -20 * tuck };
      footRTarget = { x: 18, y: -10 * tuck };
      handLTarget = { x: -22, y: -70 };
      handRTarget = { x: 24, y: -72 };
      weaponAngle = -0.95;
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
    case 'fall': {
      hip = { x: 0, y: -50 };
      torsoLean = 0.1;
      spineBend = -5;
      footLTarget = { x: -18, y: -10 };
      footRTarget = { x: 12, y: -22 };
      handLTarget = { x: -24, y: -76 };
      handRTarget = { x: 26, y: -68 };
      weaponAngle = -0.46;
      break;
    }
    case 'dash': {
      // Ultra-low anime horizontal speed dash (ref 00:02)
      hip = { x: 14, y: -37 };
      torsoLean = 0.82;
      spineBend = 11;
      footLTarget = { x: -36, y: -9 };
      footRTarget = { x: 20, y: -3 };
      handLTarget = { x: -28, y: -50 };
      handRTarget = { x: -26, y: -40 };
      weaponAngle = -2.95;
      motionArc = { x: -8, y: -42, r: 44, sa: 2.2, ea: 3.9 };
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
    case 'parry': {
      // Crisp vertical blade guard stance (ref 00:05 & 00:32)
      hip = { x: 2, y: -44 };
      torsoLean = -0.06;
      spineBend = 3;
      footLTarget = { x: -22, y: 0 };
      footRTarget = { x: 24, y: 0 };
      handLTarget = { x: 16, y: -60 };
      handRTarget = { x: 24, y: -68 };
      weaponAngle = -1.42;
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
      const p = Math.min(1, t / 0.22);
      const snap = animeSwingCurve(p);
      hip = { x: 6 + snap * 10, y: -43 };
      torsoLean = 0.28 + snap * 0.28;
      spineBend = 9;
      footLTarget = { x: -28, y: 0 };
      footRTarget = { x: 30, y: 0 };
      handLTarget = { x: -2 + snap * 26, y: -62 };
      handRTarget = { x: 14 + snap * 28, y: -62 };
      weaponAngle = -0.04;
      motionArc = { x: 30, y: -60, r: 44, sa: -0.45, ea: 0.45 };
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

  const torsoLen = 34;
  const neck: Vec2 = {
    x: hip.x + Math.sin(torsoLean) * torsoLen,
    y: hip.y - Math.cos(torsoLean) * torsoLen,
  };
  const spineMid: Vec2 = {
    x: (hip.x + neck.x) * 0.5 + spineBend,
    y: (hip.y + neck.y) * 0.5,
  };
  const head: Vec2 = {
    x: neck.x + Math.sin(torsoLean) * 13,
    y: neck.y - Math.cos(torsoLean) * 13,
  };

  const shoulderL: Vec2 = { x: neck.x - 4, y: neck.y + 5 };
  const shoulderR: Vec2 = { x: neck.x + 4, y: neck.y + 5 };

  const kneeL = solveTwoBoneIK(hip, footLTarget, 26, 26, -1);
  const kneeR = solveTwoBoneIK(hip, footRTarget, 26, 26, -1);
  const elbowL = solveTwoBoneIK(shoulderL, handLTarget, 19, 19, 1);
  const elbowR = solveTwoBoneIK(shoulderR, handRTarget, 19, 19, 1);

  return {
    hip,
    spineMid,
    neck,
    head,
    shoulderL,
    elbowL,
    handL: handLTarget,
    shoulderR,
    elbowR,
    handR: handRTarget,
    kneeL,
    footL: footLTarget,
    kneeR,
    footR: footRTarget,
    weaponAngle,
    motionArc,
  };
}

function strokeSkeletonLimbs(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  lw: number,
  headR: number,
  color: string,
  drawBackOnly = false,
  drawFrontOnly = false
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (!drawFrontOnly) {
    ctx.lineWidth = lw * 0.94;
    drawLimb(ctx, joints.hip, joints.kneeL, joints.footL);
    drawLimb(ctx, joints.shoulderL, joints.elbowL, joints.handL);

    // Curved Bézier Spine Torso
    ctx.lineWidth = lw * 1.12;
    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y);
    ctx.quadraticCurveTo(joints.spineMid.x, joints.spineMid.y, joints.neck.x, joints.neck.y);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(joints.head.x, joints.head.y, headR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!drawBackOnly) {
    ctx.lineWidth = lw;
    drawLimb(ctx, joints.hip, joints.kneeR, joints.footR);
    ctx.lineWidth = lw * 0.96;
    drawLimb(ctx, joints.shoulderR, joints.elbowR, joints.handR);
  }
}

export function renderStickman(
  ctx: CanvasRenderingContext2D,
  opts: StickmanRenderOptions
): SkeletonJoints {
  const joints =
    opts.jointsOverride ?? computeStickmanSkeleton(opts.pose, opts.poseTime, opts.walkPhase);
  const isMono = Boolean(opts.silhouette || opts.whiteFlash);

  // 1. Writhing Black Ink-Flame / Shadow Puddle at Hero's Feet (ref 00:00–00:46!)
  if (opts.darkAura && opts.darkAura !== 'none' && !isMono) {
    renderDarkInkAura(ctx, opts.x, opts.y, opts.poseTime, opts.darkAura);
  }

  // 2. Chunky Cel-Shaded Flowing Verlet Scarf (with bold black ink outline!)
  if (opts.scarf && opts.scarf.length > 1 && !isMono) {
    renderCelScarf(ctx, opts.scarf, opts.scarfPrimary ?? '#2563eb', opts.scarfHighlight ?? '#60a5fa');
  }

  ctx.save();
  ctx.translate(opts.x, opts.y);
  ctx.scale(opts.facing * (opts.scaleX ?? 1), opts.scaleY ?? 1);

  // 3. Fable Aerial White Skate-Arc Trails beneath feet (ref 00:43–00:46!)
  if (opts.bossOutfit === 'fable' && !isMono) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
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
    ctx.restore();
  }

  // 4. Sweeping Anime Speed-Arc Motion Lines (ref 00:02–00:06 & 00:23–00:26!)
  if (joints.motionArc && !isMono) {
    const a = joints.motionArc;
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.34)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, a.sa, a.ea);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r + 8, a.sa + 0.15, a.ea - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Flowing Cel-Shaded Red Boss Cape (Opus) / Black Cloak (Sol)
  if ((opts.capeColor || opts.bossOutfit === 'sol') && !isMono) {
    const wave = Math.sin(opts.poseTime * 9) * 8;
    ctx.save();
    ctx.fillStyle = opts.bossOutfit === 'sol' ? '#181a20' : opts.capeColor!;
    ctx.strokeStyle = '#0c0d12';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(joints.neck.x - 4, joints.neck.y + 2);
    ctx.quadraticCurveTo(joints.hip.x - 30, joints.hip.y - 6 + wave * 0.5, joints.hip.x - 48, -4 + wave);
    ctx.lineTo(joints.hip.x - 16, -2 + wave * 0.4);
    ctx.lineTo(joints.neck.x + 4, joints.neck.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 5B. Distinct Awakened Visual Form Back Attachments (Wings / Raijin Taiko Ring / Orbiting Blood Blades / Void Kunai!)
  if (opts.awakenedForm && !isMono) {
    renderAwakenedBackForm(ctx, joints, opts.awakenedForm, opts.poseTime);
  }

  const lw = opts.lineWidth ?? 9.5;
  const headR = opts.headRadius ?? 12.2;
  const fillColor = opts.silhouette
    ? '#07080b'
    : opts.whiteFlash
      ? '#ffffff'
      : (opts.hitFlash ?? 0) > 0
        ? '#ffffff'
        : opts.bodyColor;

  // Ground contact shadow (subtle oval)
  if (!isMono && opts.pose !== 'float_cast') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 24, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle colored rim glow ONLY for protagonist & Fable (matches ref subtle aura)
  if (!isMono && (opts.darkAura !== 'none' && opts.darkAura !== undefined || opts.bossOutfit === 'fable')) {
    ctx.save();
    ctx.globalAlpha = 0.24;
    strokeSkeletonLimbs(ctx, joints, lw + 8, headR + 4, opts.glowColor);
    ctx.restore();
  }

  // BOLD CEL-SHADED BLACK INK OUTLINE PASS (The signature Alan Becker / Hyuns Dojo look!)
  if (!opts.whiteFlash) {
    strokeSkeletonLimbs(ctx, joints, lw + 4.4, headR + 2.3, '#0b0c10');
  }

  // Main Body Back + Torso + Head Fill
  strokeSkeletonLimbs(ctx, joints, lw, headR, fillColor, true, false);

  // Boss Outfits: Tunic, Mask, Glowing Eyes (ref 00:28–00:45!)
  if (opts.bossOutfit && opts.bossOutfit !== 'none' && !isMono) {
    renderBossOutfitDetails(ctx, joints, headR, opts.bossOutfit);
  }

  // Playable Fighter Headgear (Volt Visor / Flame Band / Phantom Eyes)
  if (opts.headGear && opts.headGear !== 'none' && !isMono) {
    renderHeroHeadGear(ctx, joints, headR, opts.headGear, opts.poseTime);
  }

  // Distinct Awakened Form Head & Aura Crown / Horns / Spikes / Oni Trails!
  if (opts.awakenedForm && !isMono) {
    renderAwakenedHeadForm(ctx, joints, headR, opts.awakenedForm, opts.poseTime);
  }

  // Waist Sheath (Red-black lacquer with gold guard & rings)
  if (opts.hasSheath && !isMono) {
    ctx.save();
    ctx.translate(joints.hip.x - 4, joints.hip.y + 2);
    ctx.rotate(0.28);
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    ctx.strokeStyle = '#1f232c';
    ctx.lineWidth = 5.5;
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-24, 0);
    ctx.moveTo(-8, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(10, -3);
    ctx.lineTo(13, 3);
    ctx.stroke();
    ctx.restore();
  }

  // Weapon attached to front hand
  if (opts.weapon && opts.weapon !== 'none' && !opts.silhouette) {
    renderWeapon(ctx, joints, opts.weapon, opts.poseTime, Boolean(opts.whiteFlash));
  }

  // Front Leg & Front Arm Fill
  strokeSkeletonLimbs(ctx, joints, lw, headR, fillColor, false, true);

  // Snug Cel-Shaded Scarf Neck Collar on top of neck (ref 00:00–00:46!)
  if (opts.scarf && opts.scarf.length > 0 && !isMono) {
    ctx.save();
    ctx.translate(joints.neck.x, joints.neck.y + 2);
    ctx.fillStyle = opts.scarfPrimary ?? '#3b82f6';
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 5.5, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Off-hand dagger / void saber for Zero (twin blades!)
  if ((opts.weapon === 'twin_daggers' || opts.weapon === 'void_sabers') && !isMono) {
    ctx.save();
    ctx.translate(joints.handL.x, joints.handL.y);
    ctx.rotate(joints.weaponAngle + 0.55);
    const len = opts.weapon === 'void_sabers' ? 54 : 34;
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.strokeStyle = opts.weapon === 'void_sabers' ? '#34d399' : '#a7f3d0';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.restore();
  }

  // Round Golden-Tan Shield on front/left hand for Boss 1 Haiku (ref 00:28–00:36!)
  if (opts.weapon === 'shield_sword' && !isMono) {
    ctx.save();
    ctx.translate(joints.handL.x + 6, joints.handL.y);
    ctx.fillStyle = '#d6c38d';
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  return joints;
}

function renderDarkInkAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  mode: 'purple' | 'crimson' | 'cyan' | 'gold' | 'ember' | 'emerald'
): void {
  ctx.save();
  ctx.translate(x, y + 2);
  const rimMap: Record<typeof mode, [string, string]> = {
    purple: ['#7c3aed', 'rgba(124, 58, 237, 0.32)'],
    crimson: ['#dc2626', 'rgba(220, 38, 38, 0.34)'],
    cyan: ['#06b6d4', 'rgba(6, 182, 212, 0.34)'],
    gold: ['#eab308', 'rgba(234, 179, 8, 0.36)'],
    ember: ['#f97316', 'rgba(249, 115, 22, 0.35)'],
    emerald: ['#10b981', 'rgba(16, 185, 129, 0.34)'],
  };
  const [rimColor, puddleColor] = rimMap[mode];

  // Soft outer rim puddle
  ctx.fillStyle = puddleColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark ink puddle core
  ctx.fillStyle = '#0d0b12';
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 7 writhing ink-flame tendrils rising around feet (ref 00:01–00:46!)
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

    ctx.strokeStyle = '#0a090e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function renderCelScarf(
  ctx: CanvasRenderingContext2D,
  scarf: ScarfNode[],
  primaryColor: string,
  highlightColor: string
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Build thick cel-shaded scarf ribbon polygon with bold black outline!
  const drawRibbon = (extraWidth: number, color: string) => {
    ctx.strokeStyle = color;
    for (let i = 0; i < scarf.length - 1; i++) {
      const a = scarf[i];
      const b = scarf[i + 1];
      const t = i / (scarf.length - 1);
      ctx.lineWidth = Math.max(4, 15 * (1 - t * 0.42)) + extraWidth;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  };

  drawRibbon(4.5, '#0b0c10'); // Bold anime black ink outline
  drawRibbon(0, primaryColor); // Deep scarf body
  drawRibbon(-5, highlightColor); // Bright cel highlight band
  ctx.restore();
}

function renderHeroHeadGear(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  gear: 'volt_visor' | 'flame_band' | 'phantom_eyes',
  time: number
): void {
  ctx.save();
  if (gear === 'volt_visor') {
    // Sleek cyber-thunder visor with glowing gold slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(joints.head.x - 1, joints.head.y - 5, headR + 2, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(joints.head.x + 2, joints.head.y - 3, 9, 3);
  } else if (gear === 'flame_band') {
    // Crimson-gold ronin headband with fluttering ribbons
    const flutter = Math.sin(time * 11) * 4;
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(joints.head.x - headR, joints.head.y - 5);
    ctx.lineTo(joints.head.x + headR, joints.head.y - 5);
    ctx.stroke();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(joints.head.x - headR, joints.head.y - 5);
    ctx.quadraticCurveTo(joints.head.x - headR - 14, joints.head.y - 9 + flutter, joints.head.x - headR - 26, joints.head.y - 2 + flutter);
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (gear === 'phantom_eyes') {
    // Razor-sharp glowing emerald-white assassin eyes
    ctx.fillStyle = '#0b0c10';
    ctx.beginPath();
    ctx.moveTo(joints.head.x, joints.head.y - 4);
    ctx.lineTo(joints.head.x + 11, joints.head.y - 2);
    ctx.lineTo(joints.head.x + 3, joints.head.y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.moveTo(joints.head.x + 2, joints.head.y - 3);
    ctx.lineTo(joints.head.x + 10, joints.head.y - 1.5);
    ctx.lineTo(joints.head.x + 4, joints.head.y + 1.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders each character's dramatic Awakened back transformation:
 * - KURO: 3 Floating Crimson-Black Phantom Swords + dark crimson energy mantle
 * - RAIJIN: Iconic Spinning Raijin Taiko Thunder Drum Halo (5 golden-cyan lightning drums!)
 * - KAGURA: Colossal Animated Blazing Phoenix Flame Wings
 * - ZERO: Twin Jagged Spectral Shadow Wings + 4 Orbiting Neon-Emerald Phantom Kunai
 */
function renderAwakenedBackForm(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  form: CharacterId,
  time: number
): void {
  ctx.save();
  const cx = joints.neck.x - 6;
  const cy = joints.neck.y + 6;

  if (form === 'kuro') {
    // 3 Orbiting Dark-Crimson Phantom Blades hovering behind Kuro's shoulders!
    const bladeConfigs = [
      { ox: -36, oy: -28, rot: -2.25, phase: 0 },
      { ox: -48, oy: -4, rot: -2.65, phase: 2.1 },
      { ox: -30, oy: 18, rot: -3.0, phase: 4.2 },
    ];
    for (const b of bladeConfigs) {
      const bob = Math.sin(time * 7 + b.phase) * 5;
      ctx.save();
      ctx.translate(cx + b.ox, cy + b.oy + bob);
      ctx.rotate(b.rot + Math.sin(time * 4 + b.phase) * 0.08);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.42)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();

      ctx.fillStyle = '#09070c';
      ctx.strokeStyle = '#ef4444';
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
      ctx.restore();
    }
  } else if (form === 'raijin') {
    // Iconic Raijin Thunder God Spinning Taiko Drum Ring behind back!
    const ringR = 34;
    ctx.save();
    ctx.translate(cx - 8, cy - 6);
    // Electric outer halo ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 5 Spinning Taiko Lightning Drums around the ring
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time * 2.6;
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
    ctx.restore();
  } else if (form === 'kagura') {
    // Colossal Animated Blazing Phoenix Flame Wings unfurling behind Kagura!
    const flap = Math.sin(time * 8.5) * 10;
    const drawPhoenixWing = (dirX: number, scale: number) => {
      ctx.save();
      ctx.translate(cx - 4, cy + 2);
      // Outer crimson-orange flame plumage
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

      // Inner incandescent gold-yellow core feathers
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dirX * 26 * scale, -26 * scale + flap * 0.7, dirX * 50 * scale, -18 * scale + flap);
      ctx.lineTo(dirX * 34 * scale, 4 * scale + flap * 0.5);
      ctx.quadraticCurveTo(dirX * 14 * scale, 10 * scale, 0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawPhoenixWing(-1, 1.0);
    drawPhoenixWing(0.55, 0.72);
  } else if (form === 'zero') {
    // Twin Jagged Spectral Void Shadow Wings + 4 Orbiting Emerald Phantom Kunai!
    const flutter = Math.sin(time * 10) * 8;
    ctx.save();
    ctx.translate(cx - 2, cy + 4);
    ctx.fillStyle = 'rgba(6, 78, 59, 0.82)';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.4;
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

    // 4 Orbiting Emerald Kunai spinning smoothly around Zero
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + time * 4.5;
      const kx = Math.cos(a) * 34;
      const ky = Math.sin(a) * 20;
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(a + Math.PI * 0.5);
      ctx.fillStyle = '#34d399';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-6, -3.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders each character's Awakened head/crown transformation (Horns, Plasma Spikes, Solar Crown, Oni Eye-Trails).
 */
function renderAwakenedHeadForm(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  form: CharacterId,
  time: number
): void {
  ctx.save();
  const hx = joints.head.x;
  const hy = joints.head.y;

  if (form === 'kuro') {
    // Curved Crimson-Obsidian Demon Horns + Fierce Glowing Blood-Red Eyes!
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 4, hy - headR + 2);
    ctx.quadraticCurveTo(hx - 14, hy - headR - 14, hx - 22, hy - headR - 16);
    ctx.moveTo(hx + 4, hy - headR + 2);
    ctx.quadraticCurveTo(hx + 12, hy - headR - 12, hx + 18, hy - headR - 14);
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Glowing Crimson Demon Eye Slit + Light Trail
    ctx.fillStyle = '#fecaca';
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy - 3);
    ctx.lineTo(hx + 11, hy - 1);
    ctx.lineTo(hx + 3, hy + 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy - 1);
    ctx.quadraticCurveTo(hx - 14, hy - 4 + Math.sin(time * 16) * 3, hx - 28, hy - 8);
    ctx.stroke();
  } else if (form === 'raijin') {
    // Crackling Golden-Cyan Super-Plasma Hair Spikes shooting up from crown!
    const pulse = Math.sin(time * 20) * 2.5;
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0b0c10';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy - headR + 3);
    ctx.lineTo(hx - 16, hy - headR - 14 - pulse);
    ctx.lineTo(hx - 4, hy - headR - 4);
    ctx.lineTo(hx + 1, hy - headR - 20 - pulse);
    ctx.lineTo(hx + 7, hy - headR - 5);
    ctx.lineTo(hx + 16, hy - headR - 12 - pulse);
    ctx.lineTo(hx + 10, hy - headR + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Blazing white-gold visor eye flare
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy - 1);
    ctx.lineTo(hx - 24, hy - 6 + Math.sin(time * 18) * 3);
    ctx.stroke();
  } else if (form === 'kagura') {
    // Radiant Blazing Solar Flame Crown hovering above head + glowing spine core
    const flicker = Math.sin(time * 15) * 3;
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy - headR - 1);
    ctx.lineTo(hx - 10, hy - headR - 14 - flicker);
    ctx.lineTo(hx - 3, hy - headR - 6);
    ctx.lineTo(hx, hy - headR - 19 - flicker);
    ctx.lineTo(hx + 3, hy - headR - 6);
    ctx.lineTo(hx + 10, hy - headR - 14 - flicker);
    ctx.lineTo(hx + 12, hy - headR - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing solar spine highlight
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y);
    ctx.quadraticCurveTo(joints.spineMid.x, joints.spineMid.y, joints.neck.x, joints.neck.y);
    ctx.stroke();
  } else if (form === 'zero') {
    // Blazing Neon-Emerald Oni Eye-Stream Trail + Sharp Phantom Horns
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy - 1);
    ctx.quadraticCurveTo(hx - 14, hy - 5 + Math.sin(time * 18) * 4, hx - 36, hy - 11);
    ctx.stroke();
    ctx.strokeStyle = '#ecfdf5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function renderBossOutfitDetails(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  headR: number,
  outfit: BossStyleOutfit
): void {
  ctx.save();
  if (outfit === 'haiku') {
    // Dark visor stripe across face
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(joints.head.x - 2, joints.head.y - 4, headR + 2, 5);
  } else if (outfit === 'astra') {
    // Ninja bandit mask + light blue tunic vest
    ctx.fillStyle = '#111827';
    ctx.fillRect(joints.head.x - headR + 2, joints.head.y - 4, headR * 2 - 2, 7);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(joints.head.x + 2, joints.head.y - 2, 4, 3);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y - 4);
    ctx.lineTo(joints.neck.x, joints.neck.y + 4);
    ctx.stroke();
  } else if (outfit === 'opus') {
    // Fierce glowing yellow anime eyes on steel-blue head
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(joints.head.x + 1, joints.head.y - 3);
    ctx.lineTo(joints.head.x + 9, joints.head.y - 1);
    ctx.lineTo(joints.head.x + 3, joints.head.y + 2);
    ctx.closePath();
    ctx.fill();
  } else if (outfit === 'sol') {
    // Sleek glowing cyan visor goggles on pure white head
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(joints.head.x - 2, joints.head.y - 5, headR + 2, 8);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(joints.head.x + 1, joints.head.y - 3, 8, 4);
  } else if (outfit === 'fable') {
    // Glowing pure white alien eyes on electric lime-green head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(joints.head.x + 4, joints.head.y - 2, 3.5, 2.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLimb(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, c: Vec2): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
}

function renderWeapon(
  ctx: CanvasRenderingContext2D,
  joints: SkeletonJoints,
  weapon: NonNullable<StickmanRenderOptions['weapon']>,
  time: number,
  whiteFlash: boolean
): void {
  ctx.save();
  ctx.translate(joints.handR.x, joints.handR.y);
  ctx.rotate(joints.weaponAngle);

  if (whiteFlash) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(54, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }

  switch (weapon) {
    case 'katana': {
      // Diamond-wrapped katana hilt + gold tsuba + gleaming outlined steel blade (ref 00:20–00:35)
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(2, 0);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(2, -7);
      ctx.lineTo(2, 7);
      ctx.stroke();

      // Outlined silver-white katana blade
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.quadraticCurveTo(36, -2, 64, -4);
      ctx.stroke();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.4;
      ctx.stroke();
      break;
    }
    case 'blood_greatsword': {
      // Massive Black-Core Crimson-Edged Blood Greatsword (ref 00:41–00:46!)
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(-18, -3.5, 22, 7);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(2, -12, 6, 24);
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, -12, 6, 24);

      ctx.beginPath();
      ctx.moveTo(8, -7.5);
      ctx.lineTo(102, -4.5);
      ctx.lineTo(124, 0);
      ctx.lineTo(102, 5.5);
      ctx.lineTo(8, 7.5);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.36)';
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.fillStyle = '#09070c';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(104, 0);
      ctx.stroke();
      break;
    }
    case 'volt_spear': {
      // Raijin's cel-shaded cyan-gold lightning spear
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 7.2;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(74, 0);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.6;
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(66, -8);
      ctx.lineTo(96, 0);
      ctx.lineTo(66, 8);
      ctx.lineTo(72, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'thunder_halberd': {
      // Awakened Raijin's blazing Storm Halberd
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(108, 0);
      ctx.stroke();
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(92, 0);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#0ea5e9';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(64, -14);
      ctx.lineTo(114, 0);
      ctx.lineTo(64, 14);
      ctx.lineTo(76, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'flame_nodachi': {
      // Kagura's long curved fiery nodachi blade
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(4, -9);
      ctx.lineTo(4, 9);
      ctx.stroke();
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.quadraticCurveTo(44, -4, 82, -8);
      ctx.stroke();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 4.6;
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      break;
    }
    case 'solar_greatblade': {
      // Awakened Kagura's massive obsidian-molten solar greatblade
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(-20, -4, 24, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(2, -14, 7, 28);
      ctx.beginPath();
      ctx.moveTo(9, -9);
      ctx.lineTo(106, -5);
      ctx.lineTo(130, 0);
      ctx.lineTo(106, 6);
      ctx.lineTo(9, 9);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.42)';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.fillStyle = '#1c0f0a';
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(110, 0);
      ctx.stroke();
      break;
    }
    case 'twin_daggers': {
      // Zero's sleek curved emerald phantom dagger
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(38, -2);
      ctx.stroke();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = '#ecfdf5';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      break;
    }
    case 'void_sabers': {
      // Awakened Zero's glowing neon-emerald void saber
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.36)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(74, -4);
      ctx.stroke();
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(72, -4);
      ctx.stroke();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4.2;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      break;
    }
    case 'dagger': {
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case 'sword':
    case 'shield_sword': {
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(44, 0);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      break;
    }
    case 'pistol': {
      ctx.fillStyle = '#101218';
      ctx.fillRect(-1, -6, 20, 8);
      ctx.fillRect(-1, 0, 7, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(1, -4, 16, 4);
      break;
    }
    case 'spear': {
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 6.8;
      ctx.beginPath();
      ctx.moveTo(-38, 0);
      ctx.lineTo(82, 0);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.fillStyle = '#7dd3fc';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(78, -7);
      ctx.lineTo(104, 0);
      ctx.lineTo(78, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'laser_blade': {
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.36)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(74, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(74, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(72, 0);
      ctx.stroke();
      break;
    }
    case 'sniper_rifle': {
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(-10, -6, 38, 9);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(8, -3, 18, 3);
      break;
    }
    case 'neon_orb': {
      const r = 8 + Math.sin(time * 12) * 2;
      ctx.fillStyle = 'rgba(217, 70, 239, 0.36)';
      ctx.beginPath();
      ctx.arc(8, 0, r + 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d946ef';
      ctx.beginPath();
      ctx.arc(8, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function renderAfterimages(ctx: CanvasRenderingContext2D, afterimages: Afterimage[]): void {
  for (const a of afterimages) {
    const alpha = Math.max(0, 1 - a.life / a.maxLife) * 0.38;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(a.x, a.y);
    ctx.scale(a.facing, 1);
    strokeSkeletonLimbs(ctx, a.joints, 8.5, 11, a.color);
    ctx.restore();
  }
}

/**
 * Wide anime fan-shaped blade smear wedges + razor bright cutting edge (matches ref 00:03–00:06 & 00:30–00:35!)
 */
export function renderSlashTrails(ctx: CanvasRenderingContext2D, trails: SlashTrail[]): void {
  for (const s of trails) {
    const t = Math.min(1, s.life / s.maxLife);
    const inv = Math.max(0, 1 - t);
    // Dynamic anime smear progression: blade opens rapidly (0->0.35), then tail catches up to tip!
    const headProgress = Math.min(1, t / 0.34);
    const headEased = 1 - Math.pow(1 - headProgress, 3);
    const tailProgress = Math.max(0, (t - 0.14) / 0.86);
    const tailEased = tailProgress * tailProgress;

    const span = s.endAngle - s.startAngle;
    const curStart = s.startAngle + span * tailEased;
    const curEnd = s.startAngle + span * headEased;
    if (Math.abs(curEnd - curStart) < 0.04) continue;

    const ccw = span < 0;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing, 1);
    ctx.lineCap = 'round';

    // Wide translucent anime fan wedge behind the blade sweep
    ctx.globalAlpha = inv * 0.42;
    ctx.fillStyle = s.outerColor;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius + s.thickness * 0.55, curStart, curEnd, ccw);
    ctx.arc(0, 0, Math.max(12, s.radius * 0.34), curEnd, curStart, !ccw);
    ctx.closePath();
    ctx.fill();

    // Primary sharp outer arc edge
    ctx.globalAlpha = Math.min(1, inv * 1.15);
    ctx.strokeStyle = s.outerColor;
    ctx.lineWidth = Math.max(2, s.thickness * 0.7 * inv);
    ctx.beginPath();
    ctx.arc(0, 0, s.radius + s.thickness * 0.3, curStart, curEnd, ccw);
    ctx.stroke();

    // Crisp pure-white hot blade core line
    ctx.strokeStyle = s.coreColor;
    ctx.lineWidth = Math.max(1.5, s.thickness * 0.32 * inv);
    ctx.beginPath();
    ctx.arc(0, 0, s.radius + s.thickness * 0.32, curStart, curEnd, ccw);
    ctx.stroke();
    ctx.restore();
  }
}
