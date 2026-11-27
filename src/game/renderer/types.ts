import type { CharacterId, ScarfNode, SkinId, SlashVfxMotif, Vec2 } from '../types';

export type StickPoseName =
  | 'chair_idle'
  | 'chair_kick'
  | 'idle'
  | 'run'
  | 'brake_skid'
  | 'jump'
  | 'double_jump_flip'
  | 'fall'
  | 'land'
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
  | 'spear_jab_low'
  | 'spear_flurry_thrust'
  | 'spear_sky_drill'
  | 'spear_dragon_pierce'
  | 'spear_air_dive'
  | 'nodachi_drag_cleave'
  | 'nodachi_overhead_slam'
  | 'nodachi_tornado_spin'
  | 'nodachi_earth_splitter'
  | 'dagger_reverse_slice'
  | 'dagger_buzzsaw_flip'
  | 'dagger_phantom_blitz'
  | 'katana_zantetsu_cut'
  | 'laser_slash'
  | 'sniper_aim'
  | 'float_cast'
  | 'xuan_feng_flick_1'
  | 'xuan_feng_flick_2'
  | 'xuan_feng_point_3'
  | 'xuan_feng_palm_4'
  | 'scholar_flick_1'
  | 'scholar_flick_2'
  | 'scholar_point_3'
  | 'scholar_palm_4'
  | 'scholar_dash_slash'
  | 'scholar_parry_counter';

export type EnemyOutfitId =
  | 'none'
  | 'meta_mob'
  | 'gunner_mob'
  | 'swarm_mob'
  | 'aegis_mob'
  | 'ninja_mob'
  | 'brute_mob'
  | 'arcanist_mob'
  | 'reaper_mob'
  | 'haiku'
  | 'astra'
  | 'glacius'
  | 'opus'
  | 'vulcan'
  | 'sol'
  | 'nyx'
  | 'fable'
  | 'raiden'
  | 'akaza'
  | 'kronos'
  | 'omega';

export type BossStyleOutfit = EnemyOutfitId;

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

export type SlashTrailStyle =
  | 'arc'
  | 'iaido_line'
  | 'spear_thrust'
  | 'spear_flurry'
  | 'heavy_cleave'
  | 'twin_x'
  | 'mirror_fracture'
  | 'void_prism_fracture'
  | 'chrono_clockwork_slash'
  | 'chrono_sovereign_slash'
  | 'ink_brush_stroke'
  | 'xuan_feng_brush';

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
  style?: SlashTrailStyle;
  skinId?: SkinId;
  characterId?: CharacterId;
  rimColor?: string;
  secondaryColor?: string;
  motif?: SlashVfxMotif;
  seed?: number;
}

export interface Afterimage {
  x: number;
  y: number;
  facing: 1 | -1;
  joints: SkeletonJoints;
  life: number;
  maxLife: number;
  color: string;
  skinId?: SkinId;
  awakened?: boolean;
  characterId?: CharacterId;
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
  headGear?:
    | 'none'
    | 'volt_visor'
    | 'flame_band'
    | 'phantom_eyes'
    | 'seraph_helm'
    | 'void_helm'
    | 'shogun_crest'
    | 'cyber_visor'
    | 'phoenix_crown'
    | 'oni_horns'
    | 'kitsune_mask'
    | 'astral_hood'
    | 'astral_halo'
    | 'valkyrie_wings'
    | 'prism_crown'
    | 'chrono_gear'
    | 'jade_hairpin';
  characterId?: CharacterId;
  vx?: number;
  vy?: number;
  awakened?: boolean;
  weapon?:
    | 'none'
    | 'katana'
    | 'seraph_blade'
    | 'void_blade'
    | 'blood_greatsword'
    | 'seraph_greatsword'
    | 'void_greatsword'
    | 'volt_spear'
    | 'thunder_halberd'
    | 'flame_nodachi'
    | 'solar_greatblade'
    | 'twin_daggers'
    | 'void_sabers'
    | 'arcane_hands'
    | 'prismatic_hands'
    | 'valkyrie_glaive'
    | 'valkyrie_excalibur'
    | 'mirror_shards'
    | 'void_prism_scythe'
    | 'chrono_hand'
    | 'chrono_twin_hands'
    | 'ink_brush'
    | 'golden_ink_brush'
    | 'dagger'
    | 'pistol'
    | 'sword'
    | 'shield_sword'
    | 'spear'
    | 'frost_halberd'
    | 'laser_blade'
    | 'titan_hammer'
    | 'sniper_rifle'
    | 'reaper_scythe'
    | 'neon_orb';
  capeColor?: string;
  bossOutfit?: BossStyleOutfit;
  awakenedForm?: CharacterId | null;
  skinId?: SkinId;
  jointsOverride?: SkeletonJoints;
  attackProgress?: number;
  attackAuraColor?: string;
  attackAuraSecondary?: string;
  vfxMotif?: SlashVfxMotif;
  auraRimColor?: string;
  auraPuddleColor?: string;
  inkRimColor?: string;
  inkAccent?: string;
  entityTier?: 'hero' | 'mob' | 'elite' | 'boss';
  enragePhase?: 1 | 2;
  inkWash?: boolean;
}

export type StickmanRenderParams = StickmanRenderOptions;

/**
 * Computes elastic anime stickman skeleton with curved Bézier spine & expressive martial arts keyframing.
 * Routes all 8 basic movement/stance poses through the per-character pose engine when called with characterId.
 */
