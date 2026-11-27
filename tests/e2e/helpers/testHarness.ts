import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ActionKey, BossId, CharacterId, HudSnapshot, SkinId, StageThemeId } from '../../../src/game/types';
import { Boss } from '../../../src/game/Boss';
import { Enemy } from '../../../src/game/Enemy';
import { Game } from '../../../src/game/Game';
import { InputHandler } from '../../../src/game/InputHandler';
import { ParticleSystem } from '../../../src/game/ParticleSystem';
import { PeriodicTableBG } from '../../../src/game/PeriodicTableBG';
import { Player } from '../../../src/game/Player';
import { BOSS_ORDER, BOSS_ROSTER, GROUND_Y, createScarfChain, stepVerletScarf } from '../../../src/game/rules';
import { STAGE_THEME_PALETTES, type RegularEnemyType } from '../../../src/game/stages';
import {
  computeStickmanSkeleton,
  renderSlashTrails,
  renderStickman,
  type SkeletonJoints,
  type SlashTrail,
  type StickmanRenderOptions,
} from '../../../src/game/StickmanRenderer';
import { getAwakenedVisualProfile } from '../../../src/game/animation';
import { getCharacterDef } from '../../../src/game/characters';
import {
  MockCanvasElement,
  RecordingContext2D,
  installDomShims,
  type DrawCommand,
} from './mockCanvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
export const DEFAULT_RENDER_DIR =
  process.env.STICKMAN_RENDER_DIR ||
  path.join(PROJECT_ROOT, '.agents', 'teamwork', 'e2e_renders');

export const ALL_5_CHARACTERS: CharacterId[] = ['kuro', 'raijin', 'kagura', 'zero', 'aether'];
export const ALL_6_CHARACTERS: CharacterId[] = ['kuro', 'raijin', 'kagura', 'zero', 'aether', 'valkyrie'];

export const BASIC_POSES = ['idle', 'run', 'dash', 'jump', 'fall', 'land', 'parry'] as const;
export type BasicPoseName = (typeof BASIC_POSES)[number];

export interface SkinEntry {
  index: number;
  characterId: CharacterId;
  skinId: SkinId;
  key: string;
  label: string;
}

export const ALL_12_SKINS: SkinEntry[] = [
  { index: 1, characterId: 'kuro', skinId: 'default', key: 'kuro:default', label: 'KURO · Default' },
  { index: 2, characterId: 'kuro', skinId: 'radiant_seraph', key: 'kuro:radiant_seraph', label: 'KURO · Radiant Seraph' },
  { index: 3, characterId: 'kuro', skinId: 'void_walker', key: 'kuro:void_walker', label: 'KURO · Void Walker' },
  { index: 4, characterId: 'raijin', skinId: 'default', key: 'raijin:default', label: 'RAIJIN · Default' },
  { index: 5, characterId: 'raijin', skinId: 'storm_shogun', key: 'raijin:storm_shogun', label: 'RAIJIN · Storm Shogun' },
  { index: 6, characterId: 'raijin', skinId: 'cyber_valkyrie', key: 'raijin:cyber_valkyrie', label: 'RAIJIN · Cyber Overdrive' },
  { index: 7, characterId: 'kagura', skinId: 'default', key: 'kagura:default', label: 'KAGURA · Default' },
  { index: 8, characterId: 'kagura', skinId: 'solar_phoenix', key: 'kagura:solar_phoenix', label: 'KAGURA · Solar Phoenix' },
  { index: 9, characterId: 'kagura', skinId: 'frost_empress', key: 'kagura:frost_empress', label: 'KAGURA · Frostfire Oni' },
  { index: 10, characterId: 'zero', skinId: 'default', key: 'zero:default', label: 'ZERO · Default' },
  { index: 11, characterId: 'zero', skinId: 'blood_moon', key: 'zero:blood_moon', label: 'ZERO · Blood Moon' },
  { index: 12, characterId: 'zero', skinId: 'astral_phantom', key: 'zero:astral_phantom', label: 'ZERO · Astral Phantom' },
];

export const ALL_14_SKINS: SkinEntry[] = [
  ...ALL_12_SKINS,
  { index: 13, characterId: 'aether', skinId: 'default', key: 'aether:default', label: 'AETHER · Default' },
  { index: 14, characterId: 'aether', skinId: 'prismatic_archon', key: 'aether:prismatic_archon', label: 'AETHER · Prismatic Archon' },
];

export const ALL_18_SKINS: SkinEntry[] = [
  { index: 1, characterId: 'kuro', skinId: 'default', key: 'kuro:default', label: 'KURO · Default' },
  { index: 2, characterId: 'kuro', skinId: 'radiant_seraph', key: 'kuro:radiant_seraph', label: 'KURO · Radiant Seraph' },
  { index: 3, characterId: 'kuro', skinId: 'void_walker', key: 'kuro:void_walker', label: 'KURO · Void Walker' },
  { index: 4, characterId: 'kuro', skinId: 'eclipse_ronin', key: 'kuro:eclipse_ronin', label: 'KURO · Eclipse Ronin' },
  { index: 5, characterId: 'raijin', skinId: 'default', key: 'raijin:default', label: 'RAIJIN · Default' },
  { index: 6, characterId: 'raijin', skinId: 'storm_shogun', key: 'raijin:storm_shogun', label: 'RAIJIN · Storm Shogun' },
  { index: 7, characterId: 'raijin', skinId: 'cyber_valkyrie', key: 'raijin:cyber_valkyrie', label: 'RAIJIN · Cyber Overdrive' },
  { index: 8, characterId: 'kagura', skinId: 'default', key: 'kagura:default', label: 'KAGURA · Default' },
  { index: 9, characterId: 'kagura', skinId: 'solar_phoenix', key: 'kagura:solar_phoenix', label: 'KAGURA · Solar Phoenix' },
  { index: 10, characterId: 'kagura', skinId: 'frost_empress', key: 'kagura:frost_empress', label: 'KAGURA · Frostfire Oni' },
  { index: 11, characterId: 'zero', skinId: 'default', key: 'zero:default', label: 'ZERO · Default' },
  { index: 12, characterId: 'zero', skinId: 'blood_moon', key: 'zero:blood_moon', label: 'ZERO · Blood Moon' },
  { index: 13, characterId: 'zero', skinId: 'astral_phantom', key: 'zero:astral_phantom', label: 'ZERO · Astral Phantom' },
  { index: 14, characterId: 'aether', skinId: 'default', key: 'aether:default', label: 'AETHER · Default' },
  { index: 15, characterId: 'aether', skinId: 'prismatic_archon', key: 'aether:prismatic_archon', label: 'AETHER · Prismatic Archon' },
  { index: 16, characterId: 'valkyrie', skinId: 'default', key: 'valkyrie:default', label: 'VALKYRIE · Default' },
  { index: 17, characterId: 'valkyrie', skinId: 'celestial_empress', key: 'valkyrie:celestial_empress', label: 'VALKYRIE · Celestial Empress' },
  { index: 18, characterId: 'valkyrie', skinId: 'abyssal_valkyrie', key: 'valkyrie:abyssal_valkyrie', label: 'VALKYRIE · Abyssal Valkyrie' },
];

export const ALL_12_MOTIFS = [
  'iaido_ink',
  'seraph_feathers',
  'void_rift',
  'volt_arc',
  'shogun_drums',
  'cyber_glitch',
  'flame_lick',
  'phoenix_plume',
  'frostfire_crystal',
  'shadow_wisps',
  'blood_crescent',
  'astral_constellation',
] as const;

export const ALL_14_MOTIFS = [
  ...ALL_12_MOTIFS,
  'arcane_sigil',
  'prismatic_nova',
] as const;

export const ALL_18_MOTIFS = [
  'iaido_ink',
  'seraph_feathers',
  'void_rift',
  'eclipse_blade',
  'volt_arc',
  'shogun_drums',
  'cyber_glitch',
  'flame_lick',
  'phoenix_plume',
  'frostfire_crystal',
  'shadow_wisps',
  'blood_crescent',
  'astral_constellation',
  'arcane_sigil',
  'prismatic_nova',
  'valkyrie_radiance',
  'celestial_halo',
  'abyssal_eclipse',
] as const;

export type SlashVfxMotif = (typeof ALL_18_MOTIFS)[number];

export const ALL_8_ENEMY_TYPES: RegularEnemyType[] = [
  'meta_melee',
  'deepseek_gunner',
  'swarm_blade',
  'shield_guard',
  'cyber_ninja',
  'heavy_brute',
  'frost_mage',
  'berserker_reaper',
];

export const ALL_12_BOSS_IDS: BossId[] = [...BOSS_ORDER];

export const ALL_12_STAGE_THEMES: StageThemeId[] = Object.keys(STAGE_THEME_PALETTES) as StageThemeId[];

export interface SkinVfxProfileContract {
  profileId: string;
  characterId: CharacterId;
  skinId: SkinId;
  motif: SlashVfxMotif;
  slashPrimary: string;
  slashSecondary: string;
  slashRim: string;
  slashCore: string;
  swingAuraColor: string;
  swingAuraSecondary: string;
  auraTendrilPrimary: string;
  auraTendrilSecondary: string;
  afterimageColor: string;
  particlePrimary: string;
  particleSecondary: string;
  swingParticleKind: string;
  finisherParticleKind: string;
  impactRingColor: string;
  hitTextColor: string;
  detonationColor: string;
  projectileTheme: string;
  pillarTheme: string;
  iceWallTheme: string;
  cutscenePrimary: string;
  cutsceneSecondary: string;
  cutsceneAccent: string;
}

export interface SkinVfxModuleContract {
  SKIN_VFX_PROFILES: Record<string, SkinVfxProfileContract>;
  getSkinVfxKey: (characterId: CharacterId, skinId: SkinId) => string;
  getSkinVfxProfile: (characterId: CharacterId, skinId?: SkinId) => SkinVfxProfileContract;
  listAllSkinVfxProfiles: () => SkinVfxProfileContract[];
}

export async function loadSkinVfxModule(): Promise<SkinVfxModuleContract> {
  const rel = ['..', '..', '..', 'src', 'game', 'skinVfx'].join('/');
  try {
    const mod = (await import(rel)) as Partial<SkinVfxModuleContract>;
    assert.equal(typeof mod.getSkinVfxProfile, 'function', 'src/game/skinVfx.ts must export getSkinVfxProfile');
    assert.equal(typeof mod.getSkinVfxKey, 'function', 'src/game/skinVfx.ts must export getSkinVfxKey');
    assert.equal(typeof mod.listAllSkinVfxProfiles, 'function', 'src/game/skinVfx.ts must export listAllSkinVfxProfiles');
    assert.ok(mod.SKIN_VFX_PROFILES && typeof mod.SKIN_VFX_PROFILES === 'object', 'src/game/skinVfx.ts must export SKIN_VFX_PROFILES');
    return mod as SkinVfxModuleContract;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert.fail(`M1 src/game/skinVfx.ts unavailable or incomplete: ${msg}`);
  }
}

export async function tryLoadSkinVfxModule(): Promise<SkinVfxModuleContract | null> {
  const rel = ['..', '..', '..', 'src', 'game', 'skinVfx'].join('/');
  try {
    const mod = (await import(rel)) as Partial<SkinVfxModuleContract>;
    if (typeof mod.getSkinVfxProfile === 'function' && typeof mod.listAllSkinVfxProfiles === 'function') {
      return mod as SkinVfxModuleContract;
    }
    return null;
  } catch {
    return null;
  }
}

export interface HeadlessGameSession {
  game: Game;
  canvas: MockCanvasElement;
  ctx: RecordingContext2D;
  hudHistory: HudSnapshot[];
  getLatestHud: () => HudSnapshot;
  stepFrames: (count: number, dtSec?: number) => void;
  tapAction: (action: ActionKey, holdFrames?: number, dtSec?: number) => void;
  destroy: () => void;
}

export function createHeadlessGame(opts?: {
  width?: number;
  height?: number;
  clearStorage?: boolean;
}): HeadlessGameSession {
  const shims = installDomShims({
    innerWidth: opts?.width ?? 1280,
    innerHeight: opts?.height ?? 720,
    devicePixelRatio: 1,
  });
  if (opts?.clearStorage !== false) {
    shims.localStorage.clear();
  }
  shims.clearRafQueue();

  const canvas = new MockCanvasElement(opts?.width ?? 1280, opts?.height ?? 720);
  const hudHistory: HudSnapshot[] = [];
  const game = new Game(canvas as unknown as HTMLCanvasElement, (snap) => {
    hudHistory.push(snap);
  });

  return {
    game,
    canvas,
    ctx: canvas.ctx,
    hudHistory,
    getLatestHud(): HudSnapshot {
      assert.ok(hudHistory.length > 0, 'Expected at least one HudSnapshot emission');
      return hudHistory[hudHistory.length - 1];
    },
    stepFrames(count: number, dtSec = 1 / 60): void {
      const stepMs = dtSec * 1000;
      for (let i = 0; i < count; i++) {
        shims.flushAnimationFrames(1, stepMs);
      }
    },
    tapAction(action: ActionKey, holdFrames = 2, dtSec = 1 / 60): void {
      game.setVirtualAction(action, true);
      const stepMs = dtSec * 1000;
      for (let i = 0; i < holdFrames; i++) {
        shims.flushAnimationFrames(1, stepMs);
      }
      game.setVirtualAction(action, false);
    },
    destroy(): void {
      game.destroy();
      shims.clearRafQueue();
    },
  };
}

export function createTestPlayer(characterId: CharacterId, skinId: SkinId): {
  player: Player;
  particles: ParticleSystem;
  input: InputHandler;
  ctx: RecordingContext2D;
  step: (frames: number, dt?: number) => void;
  tap: (action: ActionKey, holdFrames?: number, dt?: number) => void;
} {
  installDomShims();
  const canvas = new MockCanvasElement(1280, 720);
  const player = new Player();
  player.setCharacter(characterId, skinId);
  player.reset(800, false);
  const particles = new ParticleSystem();
  const input = new InputHandler();

  const noopAudio = {
    unlock: () => {},
    playSlash: () => {},
    playDash: () => {},
    playJump: () => {},
    playParry: () => {},
    playHit: () => {},
    playAwaken: () => {},
    playCryoShatter: () => {},
    playCryoSummon: () => {},
    playLaser: () => {},
    playChairKick: () => {},
    playSheathClick: () => {},
    playKanjiDrop: () => {},
  };
  const noopCamera = {
    addShake: () => {},
    pulseZoom: () => {},
    setTarget: () => {},
  };

  const stepOne = (dt: number) => {
    player.update({
      dt,
      input,
      audio: noopAudio as never,
      particles,
      camera: noopCamera as never,
      chair: null,
      iceWalls: [],
      magmaPillars: [],
      projectiles: [],
      trainingMode: true,
      hasActiveEnemies: false,
      onRequestUltimate: () => {},
      onRequestAwaken: () => {},
      onThunderBlinkHit: () => {},
      onCryoSummonChill: () => {},
      onSkillLinkWarp: () => null,
      onDetonateAllMarks: () => 0,
    });
    particles.update(dt);
    input.update(dt);
  };

  return {
    player,
    particles,
    input,
    ctx: canvas.ctx,
    step(frames: number, dt = 1 / 60): void {
      for (let i = 0; i < frames; i++) {
        stepOne(dt);
      }
    },
    tap(action: ActionKey, holdFrames = 2, dt = 1 / 60): void {
      input.setVirtualAction(action, true);
      for (let i = 0; i < holdFrames; i++) {
        stepOne(dt);
      }
      input.setVirtualAction(action, false);
    },
  };
}

export interface SkinSnapshotPayload {
  index: number;
  key: string;
  title: string;
  subtitle: string;
  motif: string;
  width: number;
  height: number;
  commands: DrawCommand[];
}

/**
 * Renders a deterministic active-attack combat snapshot for one (CharacterId, SkinId)
 * at 720x480 using the REAL StickmanRenderer, SlashTrails, and ParticleSystem.
 */
export function buildSkinVisualSnapshot(
  entry: SkinEntry,
  skinVfxMod: SkinVfxModuleContract | null,
  width = 720,
  height = 480
): { payload: SkinSnapshotPayload; ctx: RecordingContext2D } {
  installDomShims();
  const canvas = new MockCanvasElement(width, height);
  const ctx = canvas.ctx;
  const def = getCharacterDef(entry.characterId, entry.skinId);
  const profile = skinVfxMod ? skinVfxMod.getSkinVfxProfile(entry.characterId, entry.skinId) : null;

  const fighterX = 270;
  const fighterY = 345;
  const particles = new ParticleSystem();

  // Emit skin-themed particles if M1 emitter methods exist, else standard sparks/embers
  const pAny = particles as unknown as Record<string, unknown>;
  const emitMethodMap: Record<string, string> = {
    feather: 'emitFeathers',
    petal: 'emitPetals',
    star: 'emitStars',
    shard: 'emitShards',
    ink_splatter: 'emitInkSplatter',
    spark: 'emitSparks',
    ember: 'emitEmbers',
    ice: 'emitIceShards',
    lightning: 'emitLightning',
    smoke: 'emitSmoke',
  };

  if (profile) {
    const swingMethodName = emitMethodMap[profile.swingParticleKind] || 'emitSparks';
    const finMethodName = emitMethodMap[profile.finisherParticleKind] || 'emitEmbers';
    const swingFn = pAny[swingMethodName];
    const finFn = pAny[finMethodName];
    if (typeof swingFn === 'function') {
      if (swingMethodName === 'emitIceShards') {
        (swingFn as (x: number, y: number, c: number, d?: number) => void).call(particles, fighterX + 90, fighterY - 58, 12, 1);
      } else if (swingMethodName === 'emitLightning') {
        (swingFn as (x: number, y: number, col: string, sz: number) => void).call(particles, fighterX + 95, fighterY - 62, profile.particlePrimary, 48);
      } else {
        (swingFn as (x: number, y: number, c: number, col: string) => void).call(particles, fighterX + 95, fighterY - 58, 14, profile.particlePrimary);
      }
    }
    if (typeof finFn === 'function') {
      if (finMethodName === 'emitIceShards') {
        (finFn as (x: number, y: number, c: number, d?: number) => void).call(particles, fighterX + 125, fighterY - 48, 10, 1);
      } else if (finMethodName === 'emitLightning') {
        (finFn as (x: number, y: number, col: string, sz: number) => void).call(particles, fighterX + 125, fighterY - 48, profile.particleSecondary, 54);
      } else {
        (finFn as (x: number, y: number, c: number, col: string) => void).call(particles, fighterX + 125, fighterY - 48, 12, profile.particleSecondary);
      }
    }
    particles.emitShockwave(fighterX + 110, fighterY - 54, profile.impactRingColor, 105, 0.28);
  } else {
    particles.emitSparks(fighterX + 95, fighterY - 58, 14, def.slashColors[0], 420);
    particles.emitEmbers(fighterX + 120, fighterY - 48, 10, def.slashColors[1]);
  }
  particles.update(0.05);

  const poseByChar: Record<CharacterId, StickmanRenderOptions['pose']> = {
    kuro: 'iai_draw_slash',
    raijin: 'spear_dragon_pierce',
    kagura: 'nodachi_drag_cleave',
    zero: 'dagger_phantom_blitz',
    aether: 'float_cast',
    valkyrie: 'spear_dragon_pierce',
  };

  const renderOpts: StickmanRenderOptions & Record<string, unknown> = {
    x: fighterX,
    y: fighterY,
    facing: 1,
    pose: poseByChar[entry.characterId],
    poseTime: 0.24,
    walkPhase: 0.4,
    scaleX: 1.08,
    scaleY: 0.94,
    bodyColor: def.bodyColor,
    glowColor: def.glowColor,
    lineWidth: 10.5,
    headRadius: 13,
    scarfPrimary: def.scarfPrimary,
    scarfHighlight: def.scarfHighlight,
    hasSheath: def.hasSheath,
    darkAura: def.auraStyle,
    headGear: def.headGear as StickmanRenderOptions['headGear'],
    weapon: def.weapon,
    awakenedForm: null,
    skinId: entry.skinId,
    characterId: entry.characterId,
    attackProgress: 0.48,
    attackAuraColor: profile?.swingAuraColor ?? def.glowColor,
    attackAuraSecondary: profile?.swingAuraSecondary ?? def.accentColor,
    vfxMotif: profile?.motif,
    auraRimColor: profile?.slashRim,
  };

  renderStickman(ctx as unknown as CanvasRenderingContext2D, renderOpts);

  const trailStyleByChar: Record<CharacterId, SlashTrail['style']> = {
    kuro: 'arc',
    raijin: 'spear_thrust',
    kagura: 'heavy_cleave',
    zero: 'twin_x',
    aether: 'arc',
    valkyrie: 'spear_thrust',
  };

  const primaryTrail: SlashTrail & Record<string, unknown> = {
    x: fighterX + 24,
    y: fighterY - 56,
    facing: 1,
    radius: 132,
    startAngle: -1.45,
    endAngle: 0.85,
    life: 0.04,
    maxLife: 0.24,
    outerColor: profile?.slashPrimary ?? def.slashColors[0],
    coreColor: profile?.slashCore ?? '#ffffff',
    thickness: 34,
    style: trailStyleByChar[entry.characterId],
    skinId: entry.skinId,
    characterId: entry.characterId,
    rimColor: profile?.slashRim ?? def.slashColors[1],
    secondaryColor: profile?.slashSecondary ?? def.accentColor,
    motif: profile?.motif,
    seed: entry.index * 17,
  };

  const secondaryTrail: SlashTrail & Record<string, unknown> = {
    x: fighterX + 34,
    y: fighterY - 52,
    facing: 1,
    radius: 108,
    startAngle: -0.95,
    endAngle: 0.95,
    life: 0.06,
    maxLife: 0.22,
    outerColor: profile?.slashSecondary ?? def.slashColors[1],
    coreColor: profile?.slashCore ?? '#ffffff',
    thickness: 22,
    style: 'arc',
    skinId: entry.skinId,
    characterId: entry.characterId,
    rimColor: profile?.slashRim ?? def.slashColors[0],
    secondaryColor: profile?.slashPrimary ?? def.accentColor,
    motif: profile?.motif,
    seed: entry.index * 31,
  };

  renderSlashTrails(ctx as unknown as CanvasRenderingContext2D, [primaryTrail, secondaryTrail]);
  particles.render(ctx as unknown as CanvasRenderingContext2D);

  // Also ensure GROUND_Y constant is respected in coordinate sanity
  void GROUND_Y;

  return {
    ctx,
    payload: {
      index: entry.index,
      key: entry.key,
      title: entry.label,
      subtitle: entry.key,
      motif: profile?.motif ?? 'baseline',
      width,
      height,
      commands: ctx.commands,
    },
  };
}

/**
 * Samples the character-specific skeleton for a given basic pose using the real
 * computeStickmanSkeleton() export (passing optional 4th characterId arg).
 */
export function sampleCharacterPoseSkeleton(
  characterId: CharacterId,
  pose: BasicPoseName,
  t = 0.2,
  walkPhase = 0
): SkeletonJoints {
  const fn = computeStickmanSkeleton as unknown as (
    p: string,
    time: number,
    phase: number,
    charId?: CharacterId
  ) => SkeletonJoints;
  return fn(pose, t, walkPhase, characterId);
}

/**
 * Drives a real Player instance through authentic InputHandler actions to reach
 * targetPose ('idle', 'run', 'dash', 'jump', 'fall', 'land', 'parry'), then renders.
 */
export function drivePlayerToPoseState(
  characterId: CharacterId,
  targetPose: BasicPoseName
): {
  player: Player;
  ctx: RecordingContext2D;
  input: InputHandler;
  particles: ParticleSystem;
  pose: string;
  joints: SkeletonJoints | null;
} {
  const harness = createTestPlayer(characterId, 'default');
  const { player, input, particles, ctx, step, tap } = harness;
  const dt = 1 / 60;

  switch (targetPose) {
    case 'idle': {
      step(6, dt);
      break;
    }
    case 'run': {
      input.setVirtualAction('right', true);
      step(15, dt);
      break;
    }
    case 'dash': {
      tap('dash', 1, dt);
      step(2, dt);
      break;
    }
    case 'jump': {
      input.setVirtualAction('jump', true);
      step(4, dt);
      input.setVirtualAction('jump', false);
      break;
    }
    case 'fall': {
      input.setVirtualAction('jump', true);
      step(6, dt);
      input.setVirtualAction('jump', false);
      for (let i = 0; i < 90; i++) {
        step(1, dt);
        if (!player.onGround && player.vy > 120) break;
      }
      break;
    }
    case 'land': {
      input.setVirtualAction('jump', true);
      step(10, dt);
      input.setVirtualAction('jump', false);
      let leftGround = !player.onGround;
      for (let i = 0; i < 140; i++) {
        step(1, dt);
        if (!player.onGround) {
          leftGround = true;
        } else if (leftGround && player.onGround) {
          break;
        }
      }
      break;
    }
    case 'parry': {
      tap('parry', 1, dt);
      step(1, dt);
      break;
    }
  }

  ctx.resetTrace();
  player.render(ctx as unknown as CanvasRenderingContext2D);

  return {
    player,
    ctx,
    input,
    particles,
    pose: player.getCurrentPose(),
    joints: player.blendedJoints,
  };
}

export interface PoseCellPayload {
  characterId: CharacterId;
  pose: BasicPoseName;
  key: string;
  title: string;
  width: number;
  height: number;
  floorY: number;
  nanDetected: boolean;
  commands: DrawCommand[];
}

export interface PoseSheetPayload {
  width: number;
  height: number;
  characters: CharacterId[];
  poses: BasicPoseName[];
  cells: PoseCellPayload[];
}

/**
 * Renders all 5 x 7 = 35 (characterId, pose) cells using the real renderStickman()
 * onto MockCanvasElement(width, height) for Pillow contact-sheet rasterization.
 */
export function buildPoseSheetPayload(width = 320, height = 260): {
  payload: PoseSheetPayload;
  traces: Array<{ key: string; ctx: RecordingContext2D }>;
} {
  installDomShims();
  const floorY = Math.round(height * 0.79); // 205 at height=260
  const fighterX = Math.round(width * 0.47); // 150 at width=320

  const sampleParams: Record<BasicPoseName, { poseTime: number; walkPhase: number; vx: number; vy: number }> = {
    idle: { poseTime: 0.35, walkPhase: 0, vx: 0, vy: 0 },
    run: { poseTime: 0.25, walkPhase: 0.45, vx: 450, vy: 0 },
    dash: { poseTime: 0.08, walkPhase: 0, vx: 960, vy: 0 },
    jump: { poseTime: 0.14, walkPhase: 0, vx: 120, vy: -520 },
    fall: { poseTime: 0.22, walkPhase: 0, vx: 80, vy: 420 },
    land: { poseTime: 0.04, walkPhase: 0, vx: 0, vy: 0 },
    parry: { poseTime: 0.1, walkPhase: 0, vx: 0, vy: 0 },
  };

  const cells: PoseCellPayload[] = [];
  const traces: Array<{ key: string; ctx: RecordingContext2D }> = [];

  for (const charId of ALL_5_CHARACTERS) {
    const def = getCharacterDef(charId, 'default');
    for (const pose of BASIC_POSES) {
      const canvas = new MockCanvasElement(width, height);
      const ctx = canvas.ctx;
      const timing = sampleParams[pose];
      const joints = sampleCharacterPoseSkeleton(charId, pose, timing.poseTime, timing.walkPhase);

      const renderOpts: StickmanRenderOptions & Record<string, unknown> = {
        x: fighterX,
        y: floorY,
        facing: 1,
        pose: pose as StickmanRenderOptions['pose'],
        poseTime: timing.poseTime,
        walkPhase: timing.walkPhase,
        scaleX: 1,
        scaleY: 1,
        bodyColor: def.bodyColor,
        glowColor: def.glowColor,
        lineWidth: 9.6,
        headRadius: 12.2,
        scarfPrimary: def.scarfPrimary,
        scarfHighlight: def.scarfHighlight,
        hasSheath: def.hasSheath,
        darkAura: def.auraStyle,
        headGear: def.headGear as StickmanRenderOptions['headGear'],
        weapon: def.weapon,
        awakenedForm: null,
        skinId: 'default',
        characterId: charId,
        vx: timing.vx,
        vy: timing.vy,
        jointsOverride: joints,
      };

      renderStickman(ctx as unknown as CanvasRenderingContext2D, renderOpts);

      const key = `${charId}:${pose}`;
      traces.push({ key, ctx });
      cells.push({
        characterId: charId,
        pose,
        key,
        title: `${def.name} · ${pose.toUpperCase()}`,
        width,
        height,
        floorY,
        nanDetected: ctx.metrics.nanDetected,
        commands: ctx.commands,
      });
    }
  }

  return {
    payload: {
      width,
      height,
      characters: [...ALL_5_CHARACTERS],
      poses: [...BASIC_POSES],
      cells,
    },
    traces,
  };
}

// =========================================================================
// R3 Ink-Wash Helpers: Enemies, Bosses, Stage Backdrops & Contact Sheets
// =========================================================================

export function createTestEnemy(
  type: RegularEnemyType,
  opts?: {
    isElite?: boolean;
    x?: number;
    y?: number;
    facing?: 1 | -1;
    poseTime?: number;
    walkPhase?: number;
    vx?: number;
    attackPhase?: Enemy['attackPhase'];
    attackTimer?: number;
    hitFlash?: number;
    hurtTimer?: number;
    stunTimer?: number;
    shieldBrokenTimer?: number;
  }
): Enemy {
  const enemy = new Enemy(type, opts?.x ?? 200, false, Boolean(opts?.isElite));
  if (opts?.y !== undefined) enemy.y = opts.y;
  if (opts?.facing !== undefined) enemy.facing = opts.facing;
  enemy.poseTime = opts?.poseTime ?? 0.25;
  enemy.walkPhase = opts?.walkPhase ?? 0.4;
  if (opts?.vx !== undefined) enemy.vx = opts.vx;
  if (opts?.attackPhase !== undefined) enemy.attackPhase = opts.attackPhase;
  if (opts?.attackTimer !== undefined) enemy.attackTimer = opts.attackTimer;
  if (opts?.hitFlash !== undefined) enemy.hitFlash = opts.hitFlash;
  if (opts?.hurtTimer !== undefined) enemy.hurtTimer = opts.hurtTimer;
  if (opts?.stunTimer !== undefined) enemy.stunTimer = opts.stunTimer;
  if (opts?.shieldBrokenTimer !== undefined) enemy.shieldBrokenTimer = opts.shieldBrokenTimer;
  return enemy;
}

export function createTestBoss(
  bossId: BossId,
  opts?: {
    phase?: 1 | 2;
    x?: number;
    y?: number;
    facing?: 1 | -1;
    poseTime?: number;
    floatTime?: number;
    walkPhase?: number;
    vx?: number;
    attackPhase?: Boss['attackPhase'];
    attackTimer?: number;
    hitFlash?: number;
    stunTimer?: number;
    staggerTimer?: number;
    shieldBrokenTimer?: number;
  }
): Boss {
  const boss = new Boss(bossId, opts?.x ?? 200);
  const phase = opts?.phase ?? 1;
  boss.phase = phase;
  if (phase === 2) {
    boss.hp = Math.max(1, Math.floor(boss.maxHp * 0.42));
  }
  if (opts?.y !== undefined) boss.y = opts.y;
  if (opts?.facing !== undefined) boss.facing = opts.facing;
  boss.poseTime = opts?.poseTime ?? 0.25;
  boss.floatTime = opts?.floatTime ?? 0.45;
  boss.walkPhase = opts?.walkPhase ?? 0.4;
  if (opts?.vx !== undefined) boss.vx = opts.vx;
  if (opts?.attackPhase !== undefined) boss.attackPhase = opts.attackPhase;
  if (opts?.attackTimer !== undefined) boss.attackTimer = opts.attackTimer;
  if (opts?.hitFlash !== undefined) boss.hitFlash = opts.hitFlash;
  if (opts?.stunTimer !== undefined) boss.stunTimer = opts.stunTimer;
  if (opts?.staggerTimer !== undefined) boss.staggerTimer = opts.staggerTimer;
  if (opts?.shieldBrokenTimer !== undefined) boss.shieldBrokenTimer = opts.shieldBrokenTimer;
  return boss;
}

export function createTestBackdrop(
  theme: StageThemeId,
  opts?: { awakened?: boolean; timeSteps?: number; dt?: number }
): PeriodicTableBG {
  const bg = new PeriodicTableBG();
  bg.setStageTheme(theme);
  const awakened = Boolean(opts?.awakened);
  const steps = opts?.timeSteps ?? (awakened ? 35 : 8);
  const dt = opts?.dt ?? 1 / 60;
  for (let i = 0; i < steps; i++) {
    bg.update(dt, awakened);
  }
  return bg;
}

export interface R3CellPayload {
  key: string;
  group: string;
  variant: string;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  floorY: number;
  nanDetected: boolean;
  shadowBlurUsed: boolean;
  saveCount: number;
  restoreCount: number;
  commands: DrawCommand[];
}

export interface R3SheetPayload {
  sheetName: string;
  cols: number;
  rows: number;
  width: number;
  height: number;
  cells: R3CellPayload[];
}

function makeAnimatedScarf(anchorX: number, anchorY: number): ReturnType<typeof createScarfChain> {
  const scarf = createScarfChain(anchorX, anchorY);
  for (let i = 0; i < 10; i++) {
    stepVerletScarf(scarf, anchorX, anchorY, -1, 0.4 + i * 0.03, 1 / 60);
  }
  return scarf;
}

export function buildR3SixCharsNormalVsAwakenedPayload(
  skinVfxMod: SkinVfxModuleContract | null,
  width = 340,
  height = 300
): { payload: R3SheetPayload; traces: Array<{ key: string; ctx: RecordingContext2D }> } {
  installDomShims();
  const floorY = Math.round(height * 0.867); // 260
  const fighterX = Math.round(width * 0.47); // 160
  const cells: R3CellPayload[] = [];
  const traces: Array<{ key: string; ctx: RecordingContext2D }> = [];

  const poseByChar: Record<CharacterId, StickmanRenderOptions['pose']> = {
    kuro: 'iai_draw_slash',
    raijin: 'spear_dragon_pierce',
    kagura: 'nodachi_drag_cleave',
    zero: 'dagger_phantom_blitz',
    aether: 'float_cast',
    valkyrie: 'spear_dragon_pierce',
  };

  for (const awakened of [false, true]) {
    for (const charId of ALL_6_CHARACTERS) {
      const def = getCharacterDef(charId, 'default');
      const vfx = skinVfxMod ? skinVfxMod.getSkinVfxProfile(charId, 'default') : null;
      const awProf = awakened ? getAwakenedVisualProfile(charId, 'default') : null;
      const canvas = new MockCanvasElement(width, height);
      const ctx = canvas.ctx;
      const worldY = GROUND_Y;
      const scarf = makeAnimatedScarf(fighterX, worldY - 66);

      ctx.save();
      ctx.translate(0, floorY - GROUND_Y);

      renderStickman(ctx as unknown as CanvasRenderingContext2D, {
        x: fighterX,
        y: worldY,
        facing: 1,
        pose: awakened ? 'awaken_pose' : poseByChar[charId],
        poseTime: 0.28,
        walkPhase: 0.4,
        scaleX: 1.03,
        scaleY: 0.97,
        bodyColor: awakened ? def.awakenedBodyColor : def.bodyColor,
        glowColor: awakened ? (vfx?.impactRingColor ?? def.glowColor) : def.glowColor,
        lineWidth: awakened ? 10.6 : 10.0,
        headRadius: 12.6,
        scarf,
        scarfPrimary: awProf ? awProf.scarfPrimary : def.scarfPrimary,
        scarfHighlight: awProf ? awProf.scarfHighlight : def.scarfHighlight,
        hasSheath: def.hasSheath,
        darkAura: awakened ? def.awakenedAuraStyle : def.auraStyle,
        headGear: def.headGear,
        weapon: awakened ? def.awakenedWeapon : def.weapon,
        awakenedForm: awakened ? charId : null,
        awakened,
        skinId: 'default',
        characterId: charId,
        attackProgress: awakened ? 0.5 : 0.42,
        attackAuraColor: vfx?.swingAuraColor ?? def.glowColor,
        attackAuraSecondary: vfx?.swingAuraSecondary ?? def.accentColor,
        vfxMotif: vfx?.motif,
        auraRimColor: vfx?.auraTendrilPrimary,
        auraPuddleColor: vfx?.auraTendrilSecondary,
      });

      ctx.restore();

      const variant = awakened ? 'awakened' : 'normal';
      const key = `${charId}:${variant}`;
      traces.push({ key, ctx });
      cells.push({
        key,
        group: charId,
        variant,
        title: `${def.name} · ${awakened ? 'AWAKENED' : 'NORMAL'}`,
        subtitle: awakened ? def.awakenedWeapon : def.weapon,
        width,
        height,
        floorY,
        nanDetected: ctx.metrics.nanDetected,
        shadowBlurUsed: ctx.metrics.shadowBlurUsed,
        saveCount: ctx.metrics.saveCount,
        restoreCount: ctx.metrics.restoreCount,
        commands: ctx.commands,
      });
    }
  }

  return {
    payload: {
      sheetName: 'r3_6chars_normal_vs_awakened',
      cols: 6,
      rows: 2,
      width,
      height,
      cells,
    },
    traces,
  };
}

export function buildR3EighteenSkinsPayload(
  skinVfxMod: SkinVfxModuleContract | null,
  width = 340,
  height = 280
): { payload: R3SheetPayload; traces: Array<{ key: string; ctx: RecordingContext2D }> } {
  installDomShims();
  const floorY = Math.round(height * 0.8); // 224
  const fighterX = Math.round(width * 0.42); // 143
  const cells: R3CellPayload[] = [];
  const traces: Array<{ key: string; ctx: RecordingContext2D }> = [];

  const poseByChar: Record<CharacterId, StickmanRenderOptions['pose']> = {
    kuro: 'iai_draw_slash',
    raijin: 'spear_dragon_pierce',
    kagura: 'nodachi_drag_cleave',
    zero: 'dagger_phantom_blitz',
    aether: 'float_cast',
    valkyrie: 'spear_dragon_pierce',
  };

  const trailStyleByChar: Record<CharacterId, SlashTrail['style']> = {
    kuro: 'arc',
    raijin: 'spear_thrust',
    kagura: 'heavy_cleave',
    zero: 'twin_x',
    aether: 'arc',
    valkyrie: 'spear_thrust',
  };

  for (const entry of ALL_18_SKINS) {
    const def = getCharacterDef(entry.characterId, entry.skinId);
    const vfx = skinVfxMod ? skinVfxMod.getSkinVfxProfile(entry.characterId, entry.skinId) : null;
    const canvas = new MockCanvasElement(width, height);
    const ctx = canvas.ctx;
    const worldY = GROUND_Y;
    const scarf = makeAnimatedScarf(fighterX, worldY - 66);

    ctx.save();
    ctx.translate(0, floorY - GROUND_Y);

    renderStickman(ctx as unknown as CanvasRenderingContext2D, {
      x: fighterX,
      y: worldY,
      facing: 1,
      pose: poseByChar[entry.characterId],
      poseTime: 0.25,
      walkPhase: 0.4,
      scaleX: 1.04,
      scaleY: 0.96,
      bodyColor: def.bodyColor,
      glowColor: def.glowColor,
      lineWidth: 10.2,
      headRadius: 12.6,
      scarf,
      scarfPrimary: def.scarfPrimary,
      scarfHighlight: def.scarfHighlight,
      hasSheath: def.hasSheath,
      darkAura: def.auraStyle,
      headGear: def.headGear,
      weapon: def.weapon,
      awakenedForm: null,
      awakened: false,
      skinId: entry.skinId,
      characterId: entry.characterId,
      attackProgress: 0.48,
      attackAuraColor: vfx?.swingAuraColor ?? def.glowColor,
      attackAuraSecondary: vfx?.swingAuraSecondary ?? def.accentColor,
      vfxMotif: vfx?.motif,
      auraRimColor: vfx?.auraTendrilPrimary,
      auraPuddleColor: vfx?.auraTendrilSecondary,
    });

    const trail: SlashTrail = {
      x: fighterX + 18,
      y: worldY - 54,
      facing: 1,
      radius: 86,
      startAngle: -1.35,
      endAngle: 0.85,
      life: 0.04,
      maxLife: 0.24,
      outerColor: vfx?.slashPrimary ?? def.slashColors[0],
      coreColor: vfx?.slashCore ?? '#ffffff',
      thickness: 22,
      style: trailStyleByChar[entry.characterId],
      skinId: entry.skinId,
      characterId: entry.characterId,
      rimColor: vfx?.slashRim ?? def.slashColors[1],
      secondaryColor: vfx?.slashSecondary ?? def.accentColor,
      motif: vfx?.motif,
      seed: entry.index * 17,
    };
    renderSlashTrails(ctx as unknown as CanvasRenderingContext2D, [trail]);

    ctx.restore();

    traces.push({ key: entry.key, ctx });
    cells.push({
      key: entry.key,
      group: entry.characterId,
      variant: entry.skinId,
      title: entry.label,
      subtitle: vfx?.motif ?? def.weapon,
      width,
      height,
      floorY,
      nanDetected: ctx.metrics.nanDetected,
      shadowBlurUsed: ctx.metrics.shadowBlurUsed,
      saveCount: ctx.metrics.saveCount,
      restoreCount: ctx.metrics.restoreCount,
      commands: ctx.commands,
    });
  }

  return {
    payload: {
      sheetName: 'r3_18_skins_sheet',
      cols: 6,
      rows: 3,
      width,
      height,
      cells,
    },
    traces,
  };
}

export function buildR3EightEnemiesPayload(
  width = 320,
  height = 280
): { payload: R3SheetPayload; traces: Array<{ key: string; ctx: RecordingContext2D }> } {
  installDomShims();
  const floorY = Math.round(height * 0.8); // 224
  const enemyX = Math.round(width * 0.5); // 160
  const cells: R3CellPayload[] = [];
  const traces: Array<{ key: string; ctx: RecordingContext2D }> = [];

  for (const isElite of [false, true]) {
    for (const enemyType of ALL_8_ENEMY_TYPES) {
      const canvas = new MockCanvasElement(width, height);
      const ctx = canvas.ctx;
      const enemy = createTestEnemy(enemyType, {
        isElite,
        x: enemyX,
        y: GROUND_Y,
        facing: -1,
        poseTime: 0.25,
        attackPhase: 'active',
        attackTimer: 0.2,
      });

      ctx.save();
      ctx.translate(0, floorY - GROUND_Y);
      enemy.render(ctx as unknown as CanvasRenderingContext2D);
      ctx.restore();

      const variant = isElite ? 'elite' : 'normal';
      const key = `${enemyType}:${variant}`;
      traces.push({ key, ctx });
      cells.push({
        key,
        group: enemyType,
        variant,
        title: `${enemy.label} · ${isElite ? 'ELITE' : 'NORMAL'}`,
        subtitle: enemyType,
        width,
        height,
        floorY,
        nanDetected: ctx.metrics.nanDetected,
        shadowBlurUsed: ctx.metrics.shadowBlurUsed,
        saveCount: ctx.metrics.saveCount,
        restoreCount: ctx.metrics.restoreCount,
        commands: ctx.commands,
      });
    }
  }

  return {
    payload: {
      sheetName: 'r3_8_enemies_normal_vs_elite',
      cols: 8,
      rows: 2,
      width,
      height,
      cells,
    },
    traces,
  };
}

export function buildR3TwelveBossesPayload(
  width = 340,
  height = 310
): { payload: R3SheetPayload; traces: Array<{ key: string; ctx: RecordingContext2D }> } {
  installDomShims();
  const floorY = Math.round(height * 0.852); // 264
  const bossX = Math.round(width * 0.5); // 170
  const cells: R3CellPayload[] = [];
  const traces: Array<{ key: string; ctx: RecordingContext2D }> = [];

  // Pair P1 & P2 in 6 cols x 4 rows:
  // Row 0 = Bosses 1..6 P1, Row 1 = Bosses 1..6 P2, Row 2 = Bosses 7..12 P1, Row 3 = Bosses 7..12 P2
  const groups = [ALL_12_BOSS_IDS.slice(0, 6), ALL_12_BOSS_IDS.slice(6, 12)];

  for (const batch of groups) {
    for (const phase of [1, 2] as const) {
      for (const bossId of batch) {
        const meta = BOSS_ROSTER[bossId];
        const canvas = new MockCanvasElement(width, height);
        const ctx = canvas.ctx;
        const levitates = bossId === 'boss_fable' || bossId === 'boss_omega';
        const boss = createTestBoss(bossId, {
          phase,
          x: bossX,
          y: levitates ? GROUND_Y - 46 : GROUND_Y,
          facing: -1,
          poseTime: 0.25,
          floatTime: 0.45,
          attackPhase: 'active',
          attackTimer: 0.24,
        });

        ctx.save();
        ctx.translate(0, floorY - GROUND_Y);
        boss.render(ctx as unknown as CanvasRenderingContext2D);
        ctx.restore();

        const variant = `phase${phase}`;
        const key = `${bossId}:${variant}`;
        traces.push({ key, ctx });
        cells.push({
          key,
          group: bossId,
          variant,
          title: `${meta.name} · P${phase}`,
          subtitle: bossId,
          width,
          height,
          floorY,
          nanDetected: ctx.metrics.nanDetected,
          shadowBlurUsed: ctx.metrics.shadowBlurUsed,
          saveCount: ctx.metrics.saveCount,
          restoreCount: ctx.metrics.restoreCount,
          commands: ctx.commands,
        });
      }
    }
  }

  return {
    payload: {
      sheetName: 'r3_12_bosses_p1_vs_p2',
      cols: 6,
      rows: 4,
      width,
      height,
      cells,
    },
    traces,
  };
}

// =========================================================================
// R4 Mirage Helpers (backward-compatible additions)
// =========================================================================

export const ALL_7_CHARACTERS: CharacterId[] = [...ALL_6_CHARACTERS, 'mirage'];

export const MIRAGE_SKINS: SkinEntry[] = [
  { index: 19, characterId: 'mirage', skinId: 'default', key: 'mirage:default', label: 'MIRAGE · Ảnh Kính' },
  { index: 20, characterId: 'mirage', skinId: 'void_shatterer', key: 'mirage:void_shatterer', label: 'MIRAGE · Ma Kính' },
];

export const ALL_20_SKINS: SkinEntry[] = [...ALL_18_SKINS, ...MIRAGE_SKINS];

export const ALL_20_MOTIFS = [
  ...ALL_18_MOTIFS,
  'mirror_shatter',
  'void_prism',
] as const;

export interface GeometryMetrics {
  commandCount: number;
  subpathCount: number;
  closedSubpathCount: number;
  totalVertices: number;
  opCounts: Record<string, number>;
  geometrySignature: string;
}

/**
 * Extracts structural Canvas 2D geometry metrics from DrawCommand[] while ignoring
 * colors/styles, enabling verification that mythic skins alter geometry rather than
 * only swapping palettes.
 */
export function extractGeometryMetrics(commands: DrawCommand[]): GeometryMetrics {
  let subpathCount = 0;
  let closedSubpathCount = 0;
  let totalVertices = 0;
  const opCounts: Record<string, number> = {};
  const parts: string[] = [];

  for (const cmd of commands) {
    opCounts[cmd.op] = (opCounts[cmd.op] ?? 0) + 1;
    if (cmd.subpaths && cmd.subpaths.length > 0) {
      subpathCount += cmd.subpaths.length;
      const spDesc: string[] = [];
      for (const sp of cmd.subpaths) {
        if (sp.closed) closedSubpathCount++;
        totalVertices += sp.pts.length;
        const first = sp.pts[0];
        const last = sp.pts[sp.pts.length - 1];
        const fTag = first ? `${Math.round(first[0])},${Math.round(first[1])}` : 'x';
        const lTag = last ? `${Math.round(last[0])},${Math.round(last[1])}` : 'x';
        spDesc.push(`${sp.closed ? 'C' : 'O'}:${sp.pts.length}:${fTag}->${lTag}`);
      }
      parts.push(`${cmd.op}[${spDesc.join(';')}]`);
    } else if (cmd.rectPts) {
      parts.push(`${cmd.op}[rect:${cmd.rectPts.length}]`);
    } else if (cmd.text !== undefined) {
      parts.push(`${cmd.op}[text:${cmd.text.length}]`);
    } else {
      parts.push(cmd.op);
    }
  }

  return {
    commandCount: commands.length,
    subpathCount,
    closedSubpathCount,
    totalVertices,
    opCounts,
    geometrySignature: `${commands.length}|${subpathCount}|${totalVertices}|${parts.join('/')}`,
  };
}

export function getActiveParticleTexts(particles: ParticleSystem): string[] {
  const pool = (particles as unknown as { pool?: Array<{ active: boolean; kind: string; text: string }> }).pool;
  if (!Array.isArray(pool)) return [];
  const texts: string[] = [];
  for (const p of pool) {
    if (p.active && p.kind === 'text' && p.text) {
      texts.push(p.text);
    }
  }
  return texts;
}

export interface HeadlessGameInternals {
  player: Player;
  bg: PeriodicTableBG & {
    update: (
      dt: number,
      awakened: boolean,
      domainActive?: boolean | 'none' | 'mirage' | 'chrono',
      domainKind?: 'none' | 'mirage' | 'chrono'
    ) => void;
    getDomainBlend?: () => number;
    getMirageDomainBlend?: () => number;
    getChronoDomainBlend?: () => number;
    getDomainKind?: () => 'none' | 'mirage' | 'chrono';
    resetDomain?: () => void;
  };
  enemies: Enemy[];
  activeBoss?: Boss | null;
  particles: ParticleSystem;
  mirrorRifts: Array<{
    x: number;
    y: number;
    radius: number;
    damage: number;
    awakened: boolean;
    active: boolean;
    domainEmpowered?: boolean;
    lastHitboxId?: number;
    warpCooldown?: number;
  }>;
  temporalEchoes?: Array<{
    x: number;
    y: number;
    facing: 1 | -1;
    pose?: string;
    poseTime?: number;
    walkPhase?: number;
    skinId?: SkinId;
    awakened?: boolean;
    active?: boolean;
    life?: number;
    maxLife?: number;
    age?: number;
    delay?: number;
    pendingStrikes?: unknown[];
    strikeTimer?: number;
  }>;
  timeStopTimer?: number;
  timeStopStoredDamage?: Map<number, number>;
  activeDomainKind?: 'none' | 'mirage' | 'chrono';
  projectiles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    fromPlayer: boolean;
    active: boolean;
    kind: string;
    reflected?: boolean;
  }>;
  domainTimer?: number;
}

export function getGameInternals(game: Game): HeadlessGameInternals {
  return game as unknown as HeadlessGameInternals;
}

// =========================================================================
// R5 Chrono Helpers (backward-compatible additive exports)
// =========================================================================

export const ALL_8_CHARACTERS: CharacterId[] = [...ALL_7_CHARACTERS, 'chrono'];

export const CHRONO_SKINS: SkinEntry[] = [
  { index: 21, characterId: 'chrono', skinId: 'default', key: 'chrono:default', label: 'CHRONO · Đồng Hồ Sư' },
  { index: 22, characterId: 'chrono', skinId: 'chrono_sovereign', key: 'chrono:chrono_sovereign', label: 'CHRONO · Thần Thời Gian' },
];

export const ALL_22_SKINS: SkinEntry[] = [...ALL_20_SKINS, ...CHRONO_SKINS];

export const ALL_22_MOTIFS = [
  ...ALL_20_MOTIFS,
  'chrono_clockwork',
  'chrono_sovereign',
] as const;

