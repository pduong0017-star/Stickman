import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Maximize2,
  Settings,
  Sparkles,
  Swords,
  Users,
  X,
} from 'lucide-react';
import {
  CHARACTER_ORDER,
  CHARACTER_ROSTER,
  getCharacterDef,
  getSkinsForCharacter,
} from '../game/characters';
import { BOSS_ROSTER } from '../game/rules';
import { getSkinVfxProfile } from '../game/skinVfx';
import { CAMPAIGN_STAGES } from '../game/stages';
import type { BotArchetype } from '../game/ai/BotBrain';
import type { CharacterId, GameMode, SkinId } from '../game/types';

export type LobbyDrawerTab = 'hero' | 'skin' | 'stage';

interface TitleScreenProps {
  selectedCharacter: CharacterId;
  selectedSkin: SkinId;
  selectedStageIndex: number;
  clearedStages: number[];
  onSelectCharacter: (id: CharacterId) => void;
  onSelectSkin: (skinId: SkinId) => void;
  onSelectStage: (index: number) => void;
  onStartMode: (mode: GameMode) => void;
  onStartSolo1v1?: (opponentId: CharacterId, botArchetype: BotArchetype) => void;
  onOpenSettings?: () => void;
  onOpenControls?: () => void;
  onOpenAudio?: () => void;
  onToggleFullscreen: () => void;
  canFullscreen: boolean;
  initialDrawer?: LobbyDrawerTab | null;
  onConsumeInitialDrawer?: () => void;
}

/** Crisp anime line-art portrait SVG for each of the 4 playable fighters */
const CharacterPortraitSvg: React.FC<{ id: CharacterId; color: string; active: boolean }> = ({
  id,
  color,
  active,
}) => {
  const strokeOpacity = active ? 0.92 : 0.52;
  if (id === 'kuro') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="kuro-glow" cx="55%" cy="55%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={active ? '0.32' : '0.1'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#kuro-glow)" />
        {/* Katana blade across back */}
        <path
          d="M 10 82 L 112 52 L 114 57 L 14 88 Z"
          fill={`${color}22`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
        {/* Flowing scarf */}
        <path
          d="M 68 44 C 86 42, 98 52, 110 46 C 102 58, 86 58, 72 54"
          fill={`${color}28`}
          stroke={color}
          strokeWidth="1.4"
          strokeOpacity={strokeOpacity}
        />
        {/* Stickman samurai head & eye */}
        <circle
          cx="62"
          cy="38"
          r="13"
          fill="#0b0e17"
          stroke={color}
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        <path d="M 55 37 L 64 35 L 62 39 Z" fill={color} opacity={strokeOpacity} />
        {/* Torso & haori cloak */}
        <path
          d="M 54 52 L 70 52 L 78 96 L 42 96 Z"
          fill="#0c101b"
          stroke={color}
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        {/* Sash & katana hilt */}
        <path
          d="M 48 70 L 74 66"
          stroke={color}
          strokeWidth="2"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 42 74 L 58 62"
          stroke="#e2e8f0"
          strokeWidth="2.2"
          strokeOpacity={strokeOpacity}
        />
      </svg>
    );
  }

  if (id === 'raijin') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="raijin-glow" cx="55%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={active ? '0.3' : '0.1'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#raijin-glow)" />
        {/* Lightning spear diagonal */}
        <path
          d="M 12 28 L 104 98"
          stroke={color}
          strokeWidth="2.2"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 8 24 L 26 30 L 18 40 Z"
          fill={`${color}44`}
          stroke={color}
          strokeWidth="1.4"
          strokeOpacity={strokeOpacity}
        />
        {/* Horned kabuto & head */}
        <path
          d="M 46 34 L 40 16 L 54 28 L 62 24 L 70 28 L 84 16 L 78 34 Z"
          fill={`${color}22`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
        <circle
          cx="62"
          cy="40"
          r="12"
          fill="#0b0e17"
          stroke={color}
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        {/* Armored torso */}
        <path
          d="M 46 56 L 62 50 L 78 56 L 84 96 L 40 96 Z"
          fill="#0c101b"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
        {/* Electric arcs */}
        <path
          d="M 86 38 L 96 46 L 90 54 L 102 62"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
      </svg>
    );
  }

  if (id === 'kagura') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="kagura-glow" cx="55%" cy="55%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={active ? '0.3' : '0.1'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#kagura-glow)" />
        {/* Twin crossed flame blades */}
        <path
          d="M 14 66 Q 58 84 110 54"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 18 92 Q 62 72 106 86"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        {/* Flowing hair & head */}
        <path
          d="M 46 54 C 42 30, 56 18, 68 22 C 80 26, 84 44, 78 60"
          fill={`${color}1a`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
        <circle
          cx="62"
          cy="38"
          r="11"
          fill="#0b0e17"
          stroke={color}
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        {/* Agile tunic */}
        <path
          d="M 52 52 L 72 52 L 76 96 L 46 96 Z"
          fill="#0c101b"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
      </svg>
    );
  }

  if (id === 'aether') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="aether-glow" cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity={active ? '0.34' : '0.12'} />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity={active ? '0.18' : '0.05'} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#aether-glow)" />
        {/* Floating Halo behind Archmage */}
        <circle
          cx="60"
          cy="36"
          r="22"
          fill="none"
          stroke="#fde047"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          strokeOpacity={strokeOpacity}
        />
        {/* Left & Right Hand-Cast Magic Circles */}
        <circle cx="24" cy="64" r="11" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeOpacity={strokeOpacity} />
        <circle cx="24" cy="64" r="3" fill="#ffffff" opacity={strokeOpacity} />
        <circle cx="96" cy="64" r="11" fill="none" stroke="#f472b6" strokeWidth="1.6" strokeOpacity={strokeOpacity} />
        <circle cx="96" cy="64" r="3" fill="#ffffff" opacity={strokeOpacity} />
        {/* Archmage Hood & Robe */}
        <circle cx="60" cy="38" r="11" fill="#0b0e17" stroke={color} strokeWidth="1.8" strokeOpacity={strokeOpacity} />
        <path
          d="M 46 54 L 60 48 L 74 54 L 82 96 L 38 96 Z"
          fill="#0c101b"
          stroke={color}
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        {/* Extended casting arms */}
        <path d="M 48 62 L 26 64 M 72 62 L 94 64" stroke={color} strokeWidth="1.6" strokeOpacity={strokeOpacity} />
      </svg>
    );
  }

  if (id === 'valkyrie') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="valkyrie-glow" cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor={color} stopOpacity={active ? '0.38' : '0.14'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#valkyrie-glow)" />
        {/* Angelic Wings */}
        <path
          d="M 52 56 C 32 34, 10 24, 6 42 C 14 48, 22 54, 14 64 C 28 66, 40 66, 50 68 Z"
          fill={`${color}28`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 68 56 C 88 34, 110 24, 114 42 C 106 48, 98 54, 106 64 C 92 66, 80 66, 70 68 Z"
          fill={`${color}28`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
        {/* Crown & Halo */}
        <path
          d="M 48 26 L 54 16 L 60 23 L 66 16 L 72 26 Z"
          fill={`${color}44`}
          stroke={color}
          strokeWidth="1.4"
          strokeOpacity={strokeOpacity}
        />
        {/* Head & Armored Cloak */}
        <circle cx="60" cy="38" r="11" fill="#0b0e17" stroke={color} strokeWidth="1.8" strokeOpacity={strokeOpacity} />
        <path
          d="M 48 52 L 72 52 L 78 96 L 42 96 Z"
          fill="#0c101b"
          stroke={color}
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        {/* Radiant Holy Blade */}
        <path
          d="M 20 96 L 98 22 L 102 26 L 26 100 Z"
          fill={`${color}33`}
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity={strokeOpacity}
        />
      </svg>
    );
  }

  if (id === 'chrono') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="chrono-glow" cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor={color} stopOpacity={active ? '0.35' : '0.12'} />
            <stop offset="62%" stopColor="#f59e0b" stopOpacity={active ? '0.16' : '0.05'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#chrono-glow)" />
        {/* Giant Roman clockwork halo behind Chrono */}
        <circle
          cx="60"
          cy="44"
          r="30"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.8"
          strokeDasharray="6 3"
          strokeOpacity={strokeOpacity}
        />
        <circle
          cx="60"
          cy="44"
          r="23"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeOpacity={strokeOpacity * 0.85}
        />
        {/* 12 Roman dial ticks around halo */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 60 + Math.cos(rad) * 24;
          const y1 = 44 + Math.sin(rad) * 24;
          const x2 = 60 + Math.cos(rad) * 29;
          const y2 = 44 + Math.sin(rad) * 29;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={deg % 90 === 0 ? '#fef08a' : color}
              strokeWidth={deg % 90 === 0 ? '2' : '1.1'}
              strokeOpacity={strokeOpacity}
            />
          );
        })}
        {/* Diagonal Clock-Hand Greatsabre across back */}
        <path
          d="M 16 94 L 98 20 L 104 25 L 22 98 Z"
          fill={`${color}26`}
          stroke="#fef08a"
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        <circle
          cx="32"
          cy="82"
          r="7"
          fill="#0b0e17"
          stroke="#f59e0b"
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        {/* Stickman Chrono head & bronze-teal chronometer monocle */}
        <circle
          cx="60"
          cy="39"
          r="11.5"
          fill="#0b0e17"
          stroke={color}
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        <circle
          cx="64"
          cy="38"
          r="4.2"
          fill={`${color}33`}
          stroke="#f59e0b"
          strokeWidth="1.4"
          strokeOpacity={strokeOpacity}
        />
        <path d="M 55 37 L 67 36 L 64 40 Z" fill="#fef08a" opacity={strokeOpacity} />
        {/* Clockmaker mantle & crossed brass sash */}
        <path
          d="M 48 52 L 72 52 L 80 96 L 40 96 Z"
          fill="#0c101b"
          stroke={color}
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 50 56 L 70 80 M 70 56 L 50 80"
          stroke="#f59e0b"
          strokeWidth="1.6"
          strokeOpacity={strokeOpacity}
        />
        {/* Chest astrolabe core */}
        <circle
          cx="60"
          cy="66"
          r="4.5"
          fill="#0b0e17"
          stroke="#fef08a"
          strokeWidth="1.4"
          strokeOpacity={strokeOpacity}
        />
      </svg>
    );
  }

  if (id === 'mactien') {
    return (
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full object-contain pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mactien-glow" cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={active ? '0.32' : '0.12'} />
            <stop offset="65%" stopColor="#1a1d24" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#090b10" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" fill="url(#mactien-glow)" />
        {/* Faint Xuan-paper circular ink-wash ring */}
        <circle
          cx="60"
          cy="56"
          r="38"
          fill="none"
          stroke="#f4f1ea"
          strokeWidth="2.2"
          strokeDasharray="24 8 10 6"
          strokeOpacity={strokeOpacity * 0.65}
        />
        {/* Vermilion Square Seal ("静") in upper-right corner */}
        <rect
          x="84"
          y="16"
          width="20"
          height="20"
          fill="#1a1d24"
          stroke="#ef4444"
          strokeWidth="1.8"
          opacity={strokeOpacity}
        />
        <text
          x="94"
          y="30"
          textAnchor="middle"
          fill="#ef4444"
          fontSize="13"
          fontWeight="900"
          fontFamily="serif"
          opacity={strokeOpacity}
        >
          静
        </text>
        {/* Giant Bamboo-Jade Ink Brush (Cự Bút) diagonal behind scholar */}
        <line
          x1="22"
          y1="98"
          x2="90"
          y2="30"
          stroke="#0f766e"
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeOpacity={strokeOpacity}
        />
        <line
          x1="22"
          y1="98"
          x2="90"
          y2="30"
          stroke="#2dd4bf"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 86 26 Q 99 17 104 16 Q 103 27 94 34 Z"
          fill="#1a1d24"
          stroke="#2dd4bf"
          strokeWidth="1.4"
          strokeOpacity={strokeOpacity}
        />
        {/* Scholar topknot & glowing jade hairpin */}
        <circle cx="58" cy="24" r="4.2" fill="#1a1d24" stroke="#f4f1ea" strokeWidth="1.2" opacity={strokeOpacity} />
        <line
          x1="46"
          y1="27"
          x2="70"
          y2="21"
          stroke="#2dd4bf"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeOpacity={strokeOpacity}
        />
        <circle cx="45.5" cy="27.2" r="2.4" fill="#99f6e4" opacity={strokeOpacity} />
        {/* Scholar head */}
        <circle
          cx="60"
          cy="39"
          r="11.2"
          fill="#1a1d24"
          stroke="#f4f1ea"
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        {/* Flowing black-white scholar robe (Trường Sam) */}
        <path
          d="M 47 52 L 73 52 L 82 98 L 38 98 Z"
          fill="#1a1d24"
          stroke="#f4f1ea"
          strokeWidth="1.7"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M 52 53 L 64 76 M 68 53 L 56 72"
          stroke="#f4f1ea"
          strokeWidth="1.8"
          strokeOpacity={strokeOpacity}
        />
        {/* Jade waist belt & vermilion accent */}
        <rect x="46" y="72" width="28" height="4.5" fill="#2dd4bf" opacity={strokeOpacity} />
        <rect x="64" y="73" width="6" height="6" fill="#ef4444" opacity={strokeOpacity} />
      </svg>
    );
  }

  // zero
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-full h-full object-contain pointer-events-none select-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="zero-glow" cx="55%" cy="55%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={active ? '0.28' : '0.08'} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill="url(#zero-glow)" />
      {/* Assassin hood & mask */}
      <path
        d="M 44 48 L 54 22 L 70 22 L 80 48 L 62 56 Z"
        fill="#0b0e17"
        stroke={color}
        strokeWidth="1.6"
        strokeOpacity={strokeOpacity}
      />
      <path d="M 55 38 L 60 39 M 64 39 L 69 38" stroke={color} strokeWidth="2" strokeOpacity={strokeOpacity} />
      {/* Twin daggers */}
      <path
        d="M 78 64 L 106 34 L 94 60 Z"
        fill={`${color}26`}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity={strokeOpacity}
      />
      <path
        d="M 44 68 L 20 84 L 46 78 Z"
        fill={`${color}22`}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity={strokeOpacity}
      />
      {/* Shadow cloak */}
      <path
        d="M 44 58 L 80 58 L 86 96 L 38 96 Z"
        fill="#0c101b"
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity={strokeOpacity}
      />
    </svg>
  );
};


const RARITY_META: Record<string, { label: string; bg: string }> = {
  mythic: { label: 'THẦN THOẠI', bg: 'linear-gradient(90deg, #f43f5e, #facc15, #2dd4bf)' },
  legendary: { label: 'HUYỀN THOẠI', bg: 'linear-gradient(90deg, #f59e0b, #fde047)' },
  epic: { label: 'SỬ THI', bg: 'linear-gradient(90deg, #8b5cf6, #38bdf8)' },
  classic: { label: 'CƠ BẢN', bg: '#64748b' },
};

const BOT_ARCHETYPE_META: Record<BotArchetype, { label: string; desc: string; color: string }> = {
  RUSHDOWN: { label: 'RUSHDOWN', desc: 'Áp sát liên hoàn', color: '#ef4444' },
  COUNTER: { label: 'COUNTER', desc: 'Phản đòn chuẩn xác', color: '#f59e0b' },
  TRICKSTER: { label: 'TRICKSTER', desc: 'Biến ảo né đòn', color: '#2dd4bf' },
};

const inferRarity = (skin: { id: SkinId; rarity?: string }): string =>
  skin.rarity ??
  (skin.id === 'default'
    ? 'classic'
    : skin.id === 'prismatic_archon' || skin.id === 'radiant_seraph'
      ? 'mythic'
      : 'legendary');

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedCharacter,
  selectedSkin,
  selectedStageIndex,
  clearedStages,
  onSelectCharacter,
  onSelectSkin,
  onSelectStage,
  onStartMode,
  onStartSolo1v1,
  onOpenSettings,
  onOpenAudio,
  onToggleFullscreen,
  canFullscreen,
  initialDrawer,
  onConsumeInitialDrawer,
}) => {
  const [drawerTab, setDrawerTab] = React.useState<LobbyDrawerTab | null>(null);
  const [soloOpen, setSoloOpen] = React.useState(false);
  const [soloOpponentId, setSoloOpponentId] = React.useState<CharacterId>('raijin');
  const [soloArchetype, setSoloArchetype] = React.useState<BotArchetype>('RUSHDOWN');

  React.useEffect(() => {
    if (initialDrawer) {
      setDrawerTab(initialDrawer);
      onConsumeInitialDrawer?.();
    }
  }, [initialDrawer, onConsumeInitialDrawer]);

  const activeChar = getCharacterDef(selectedCharacter, selectedSkin);
  const availableSkins = getSkinsForCharacter(selectedCharacter);
  const activeVfx = getSkinVfxProfile(selectedCharacter, selectedSkin);
  const activeStage = CAMPAIGN_STAGES[selectedStageIndex] ?? CAMPAIGN_STAGES[0];
  const stageBoss = BOSS_ROSTER[activeStage.bossId] ?? BOSS_ROSTER.boss_haiku;
  const clearedSet = new Set(clearedStages);
  const activeSkinObj = availableSkins.find((s) => s.id === selectedSkin) ?? availableSkins[0];
  const activeRarity = RARITY_META[activeSkinObj ? inferRarity(activeSkinObj) : 'classic'];
  const accent = activeVfx.slashPrimary || activeChar.accentColor;
  const bossCount = Object.keys(BOSS_ROSTER).length;
  const totalStages = CAMPAIGN_STAGES.length;

  const stepStage = (dir: number) => {
    const nextIndex = (activeStage.index + dir + totalStages) % totalStages;
    onSelectStage(nextIndex);
  };

  const secondaryModes: { mode: GameMode; title: string; sub: string; color: string }[] = [
    { mode: 'boss_rush', title: `ĐẤU ${bossCount} BOSS`, sub: 'Liên hoàn trùm', color: '#f59e0b' },
    { mode: 'endless', title: 'VÔ TẬN', sub: 'Leo tầng', color: '#2dd4bf' },
    { mode: 'training', title: 'LUYỆN TẬP', sub: 'Vô hạn Nộ', color: '#94a3b8' },
  ];

  const drawerTabs: { id: LobbyDrawerTab; label: string; count: number }[] = [
    { id: 'hero', label: 'NHÂN VẬT', count: CHARACTER_ORDER.length },
    { id: 'skin', label: 'TRANG PHỤC', count: availableSkins.length },
    { id: 'stage', label: 'MÀN CHƠI', count: totalStages },
  ];

  return (
    <div className="landscape-title-shell fixed inset-0 z-20 pointer-events-none flex items-center justify-center px-4 py-3 sm:px-8 sm:py-5">
      {/* Subtle ink-wash atmospheric scrim keeping canvas alive while UI stays razor-sharp */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(9, 12, 18, 0.52) 0%, rgba(6, 8, 13, 0.88) 72%, rgba(4, 6, 10, 0.96) 100%)',
        }}
      />

      {/* TOP-RIGHT COMPACT ICON BUTTONS: Settings + Fullscreen */}
      <div className="fixed top-2.5 right-3 sm:top-4 sm:right-6 z-30 pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => (onOpenSettings ?? onOpenAudio)?.()}
          aria-label="Cài đặt"
          title="Cài đặt"
          className="w-10 h-10 flex items-center justify-center bg-[#0d111b]/92 hover:bg-[#161e2e] border border-white/15 hover:border-amber-400/60 text-slate-200 hover:text-amber-300 cursor-pointer transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        {canFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label="Toàn màn hình"
            title="Toàn màn hình"
            className="w-10 h-10 flex items-center justify-center bg-[#0c1a1f]/92 hover:bg-[#132930] border border-teal-500/45 hover:border-teal-300 text-teal-300 hover:text-white cursor-pointer transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* MAIN 2-COLUMN LANDSCAPE CONTAINER */}
      <div className="relative z-10 pointer-events-auto w-full max-w-5xl grid grid-cols-1 sm:grid-cols-[1.06fr_1fr] gap-3 sm:gap-6 items-center">
        {/* LEFT COLUMN: Game Title + Selected Hero/Skin Preview */}
        <section className="flex flex-col gap-2.5 sm:gap-3.5 min-w-0">
          {/* Title Brand Lockup */}
          <div className="flex items-center gap-3">
            <div className="ink-seal shrink-0 w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center bg-gradient-to-br from-[#991b1b] to-[#450a0a] border border-amber-400/60 text-amber-200 text-xl sm:text-2xl font-black shadow-lg">
              鞘
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <h1 className="landscape-title-logo-text font-display italic font-black text-3xl sm:text-4xl md:text-5xl tracking-wider text-white">
                  SCARLET
                </h1>
                <span className="landscape-title-sub-text font-display italic font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-widest text-[#ef4444]">
                  SHEATH
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em] text-amber-300/85 font-semibold">
                  Võ Hiệp Thủy Mặc
                </span>
                <span className="text-slate-600">·</span>
                <span>
                  Tiến độ{' '}
                  <strong className="font-mono-num text-teal-300">
                    {clearedSet.size}/{totalStages}
                  </strong>{' '}
                  ải
                </span>
              </div>
            </div>
          </div>

          <div
            className="ink-brush-divider"
            style={{ ['--ink-accent' as string]: accent }}
          />

          {/* Selected Hero & Skin Preview Card */}
          <div
            className="ink-panel relative border border-white/12 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 overflow-hidden"
            style={{ borderLeft: `3px solid ${accent}` }}
          >
            {/* Kanji subtle watermark */}
            <span
              className="kanji-watermark absolute -right-2 -bottom-4 text-[88px] sm:text-[108px] font-black opacity-[0.07]"
              style={{ color: accent }}
              aria-hidden="true"
            >
              {activeChar.ultimateKanji}
            </span>

            {/* Portrait Frame */}
            <button
              type="button"
              onClick={() => setDrawerTab('hero')}
              aria-label="Mở bảng chọn nhân vật và skin"
              className="relative shrink-0 w-20 h-20 sm:w-28 sm:h-28 border bg-[#07090f] overflow-hidden cursor-pointer group transition-transform hover:scale-[1.02]"
              style={{
                borderColor: `${accent}88`,
                boxShadow: `inset 0 0 22px ${accent}24`,
              }}
            >
              <CharacterPortraitSvg id={selectedCharacter} color={accent} active={true} />
              <span
                className="absolute top-1 left-1 text-xs font-black"
                style={{ color: accent, fontFamily: 'var(--font-kanji)' }}
              >
                {activeChar.ultimateKanji}
              </span>
              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-bold text-slate-200 text-center py-0.5 tracking-wider group-hover:text-amber-300 transition-colors">
                ĐỔI VÕ SĨ
              </span>
            </button>

            {/* Hero & Skin Info */}
            <div className="relative z-10 min-w-0 flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display italic font-black text-xl sm:text-2xl text-white tracking-wider leading-none">
                  {activeChar.name}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: accent }}>
                  · {activeChar.codename}
                </span>
              </div>

              {activeSkinObj && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-[8px] sm:text-[9px] font-black tracking-wider px-1.5 py-[1px] text-black leading-tight"
                    style={{ background: activeRarity.bg }}
                  >
                    {activeRarity.label}
                  </span>
                  <span className="text-xs font-semibold text-amber-200 truncate">
                    {activeSkinObj.name}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                {activeChar.archetype} · [U]{' '}
                <strong className="text-slate-200">{activeChar.skills.specialName}</strong>
              </p>

              {/* Inline Stage Selector Strip */}
              <div className="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setDrawerTab('stage')}
                  className="min-w-0 flex-1 text-left flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white cursor-pointer truncate"
                  title="Chọn màn chơi"
                >
                  <Compass className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="truncate">
                    Ải <strong className="font-mono-num text-amber-300">{activeStage.code}</strong> ·{' '}
                    <span className="text-white font-semibold">{activeStage.name}</span>
                  </span>
                </button>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Ải trước"
                    onClick={() => stepStage(-1)}
                    className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/12 text-slate-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Ải sau"
                    onClick={() => stepStage(1)}
                    className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/12 text-slate-200 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Large Easy-to-Tap Mode Buttons */}
        <section className="flex flex-col gap-2 sm:gap-2.5 min-w-0">
          {/* 1. ĐI ẢI (Primary Campaign Mode) */}
          <button
            type="button"
            data-start="true"
            onClick={() => onStartMode('story')}
            className="landscape-title-mode-btn clip-slant-left samurai-glint w-full min-h-[58px] sm:min-h-[68px] px-4 py-2.5 text-left border cursor-pointer transition-all hover:brightness-115 flex items-center justify-between gap-3"
            style={{
              borderColor: '#f59e0b',
              background: 'linear-gradient(105deg, #b91c1c 0%, #7f1d1d 60%, #2a0a0a 100%)',
              boxShadow: '0 8px 24px rgba(185, 28, 28, 0.32)',
            }}
          >
            <div className="min-w-0">
              <div className="landscape-title-mode-title font-display italic font-black text-xl sm:text-2xl tracking-wider text-white leading-none flex items-center gap-2">
                <span>ĐI ẢI</span>
                <span className="text-[10px] font-mono-num not-italic px-1.5 py-0.5 bg-amber-400/20 border border-amber-300/50 text-amber-200">
                  MÀN {activeStage.code}/{String(totalStages).padStart(2, '0')}
                </span>
              </div>
              <div className="landscape-title-mode-sub text-[11px] sm:text-xs text-amber-100/85 mt-1 truncate">
                Chế độ vượt ải · Trùm {stageBoss.name}
              </div>
            </div>
            <span className="ink-seal shrink-0 w-9 h-9 flex items-center justify-center bg-black/35 border border-amber-300/45 text-amber-300 text-base font-black">
              戦
            </span>
          </button>

          {/* 2. SOLO 1V1 */}
          <button
            type="button"
            onClick={() => setSoloOpen(true)}
            className="landscape-title-mode-btn samurai-glint w-full min-h-[54px] sm:min-h-[64px] px-4 py-2.5 text-left border cursor-pointer transition-all hover:brightness-115 flex items-center justify-between gap-3"
            style={{
              borderColor: 'rgba(244, 63, 94, 0.65)',
              background: 'linear-gradient(105deg, rgba(136, 19, 55, 0.72) 0%, rgba(17, 20, 32, 0.96) 72%)',
            }}
          >
            <div className="min-w-0">
              <div className="landscape-title-mode-title font-display italic font-black text-xl sm:text-2xl tracking-wider text-white leading-none flex items-center gap-2">
                <Swords className="w-5 h-5 text-rose-400 shrink-0" />
                <span>SOLO 1V1</span>
              </div>
              <div className="landscape-title-mode-sub text-[11px] sm:text-xs text-rose-200/80 mt-1 truncate">
                Tỷ thí Best of 3 · Chọn đối thủ &amp; BotBrain
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-mono-num font-bold px-2 py-1 bg-rose-950/80 border border-rose-400/45 text-rose-200">
              BO3
            </span>
          </button>

          {/* 3. NHÂN VẬT & SKIN */}
          <button
            type="button"
            onClick={() => setDrawerTab('hero')}
            className="landscape-title-mode-btn samurai-glint w-full min-h-[54px] sm:min-h-[64px] px-4 py-2.5 text-left border cursor-pointer transition-all hover:brightness-115 flex items-center justify-between gap-3"
            style={{
              borderColor: 'rgba(20, 184, 166, 0.6)',
              background: 'linear-gradient(105deg, rgba(17, 94, 89, 0.52) 0%, rgba(13, 18, 28, 0.96) 72%)',
            }}
          >
            <div className="min-w-0">
              <div className="landscape-title-mode-title font-display italic font-black text-xl sm:text-2xl tracking-wider text-white leading-none flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-300 shrink-0" />
                <span>NHÂN VẬT &amp; SKIN</span>
              </div>
              <div className="landscape-title-mode-sub text-[11px] sm:text-xs text-teal-200/80 mt-1 truncate">
                {activeChar.name} · {activeSkinObj?.name ?? 'Mặc định'} ({CHARACTER_ORDER.length} võ sĩ)
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          </button>

          {/* Compact Secondary Modes Row (Boss Rush / Endless / Training) */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {secondaryModes.map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => onStartMode(m.mode)}
                className="min-h-[40px] px-2 py-1.5 bg-[#0e131e]/92 hover:bg-[#172033] border transition-colors cursor-pointer flex flex-col items-center justify-center text-center"
                style={{ borderColor: `${m.color}55` }}
              >
                <span className="font-display italic font-extrabold text-xs sm:text-sm text-white leading-tight">
                  {m.title}
                </span>
                <span className="text-[9px] leading-tight mt-0.5" style={{ color: m.color }}>
                  {m.sub}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* SOLO 1V1 QUICK-SELECT MODAL */}
      {soloOpen && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-black/80 backdrop-blur-sm p-2.5 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn đối thủ Solo 1v1"
        >
          <div className="ink-panel relative w-full max-w-2xl max-h-[94dvh] overflow-y-auto border border-rose-500/60 p-3.5 sm:p-5 flex flex-col gap-3">
            <div
              className="absolute top-0 inset-x-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, #f43f5e, #f59e0b 60%, transparent)' }}
            />

            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-rose-400" />
                <h2 className="font-display italic font-black text-xl text-white tracking-wider leading-none">
                  SOLO 1V1 · BEST OF 3
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSoloOpen(false)}
                className="px-2 py-1 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/12 border border-white/15 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-3">
              {/* Opponent picker */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                  Đối thủ:{' '}
                  <span style={{ color: CHARACTER_ROSTER[soloOpponentId].accentColor }}>
                    {CHARACTER_ROSTER[soloOpponentId].name}
                  </span>{' '}
                  · {CHARACTER_ROSTER[soloOpponentId].codename}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {CHARACTER_ORDER.map((cid) => {
                    const def = CHARACTER_ROSTER[cid];
                    const active = soloOpponentId === cid;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => {
                          setSoloOpponentId(cid);
                          const defaultArch: BotArchetype =
                            cid === 'raijin' || cid === 'kagura' || cid === 'valkyrie'
                              ? 'RUSHDOWN'
                              : cid === 'kuro' || cid === 'aether'
                                ? 'COUNTER'
                                : 'TRICKSTER';
                          setSoloArchetype(defaultArch);
                        }}
                        className="min-h-[44px] px-1.5 py-1.5 text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                        style={{
                          borderColor: active ? def.accentColor : 'rgba(255,255,255,0.12)',
                          backgroundColor: active ? `${def.accentColor}26` : 'rgba(12,16,26,0.88)',
                          color: active ? '#ffffff' : '#cbd5e1',
                        }}
                      >
                        <span
                          className="text-xs font-black leading-none"
                          style={{ color: def.accentColor, fontFamily: 'var(--font-kanji)' }}
                        >
                          {def.ultimateKanji}
                        </span>
                        <span className="font-display italic font-bold text-xs leading-none">
                          {def.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bot Archetype + Start CTA */}
              <div className="flex flex-col justify-between gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                    Tính cách BotBrain
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {(['RUSHDOWN', 'COUNTER', 'TRICKSTER'] as BotArchetype[]).map((arch) => {
                      const active = soloArchetype === arch;
                      const meta = BOT_ARCHETYPE_META[arch];
                      return (
                        <button
                          key={arch}
                          type="button"
                          onClick={() => setSoloArchetype(arch)}
                          className="px-2.5 py-1.5 border text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                          style={{
                            borderColor: active ? meta.color : 'rgba(255,255,255,0.12)',
                            backgroundColor: active ? `${meta.color}22` : 'rgba(12,16,26,0.85)',
                          }}
                        >
                          <span
                            className="font-display italic font-black text-sm tracking-wider"
                            style={{ color: active ? '#ffffff' : '#cbd5e1' }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px]" style={{ color: active ? meta.color : '#94a3b8' }}>
                            {meta.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSoloOpen(false);
                    if (onStartSolo1v1) {
                      onStartSolo1v1(soloOpponentId, soloArchetype);
                    } else {
                      onStartMode('solo1v1');
                    }
                  }}
                  className="clip-slant-left samurai-glint w-full min-h-[44px] py-2 font-display italic font-black text-lg tracking-wider text-white border border-amber-300/60 bg-gradient-to-r from-rose-600 via-red-700 to-red-900 hover:brightness-115 cursor-pointer"
                >
                  ▶ VÀO TRẬN 1V1
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT CHARACTER / SKIN / STAGE SELECTOR MODAL */}
      {drawerTab && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-black/80 backdrop-blur-sm p-2.5 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn nhân vật, trang phục và màn chơi"
        >
          <div className="ink-panel relative w-full max-w-3xl max-h-[92dvh] flex flex-col border border-white/15 p-3.5 sm:p-5 gap-3 overflow-hidden">
            <div
              className="absolute top-0 inset-x-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, ${accent}, #f59e0b 55%, #14b8a6)` }}
            />

            {/* Header + Tabs */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Tuỳ chỉnh võ sĩ">
                {drawerTabs.map((t) => {
                  const on = drawerTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setDrawerTab(t.id)}
                      className="px-3 py-1.5 text-xs font-bold tracking-wider border transition-colors cursor-pointer flex items-center gap-1.5"
                      style={{
                        borderColor: on ? accent : 'rgba(255,255,255,0.12)',
                        backgroundColor: on ? `${accent}24` : 'rgba(12,16,24,0.8)',
                        color: on ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      <span>{t.label}</span>
                      <span className="font-mono-num text-[10px] opacity-80">{t.count}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setDrawerTab(null)}
                className="px-3 py-1.5 bg-teal-950/75 hover:bg-teal-900/80 border border-teal-400/50 text-xs font-bold text-teal-200 hover:text-white cursor-pointer flex items-center gap-1"
              >
                <span>Xong</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
              {drawerTab === 'hero' && (
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Chọn nhân vật">
                  {CHARACTER_ORDER.map((id) => {
                    const c = CHARACTER_ROSTER[id];
                    const on = id === selectedCharacter;
                    const color = on ? accent : c.accentColor;
                    const badge = id === 'mactien' ? 'NEW' : id === 'aether' ? 'VIP' : null;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onSelectCharacter(id)}
                        className="relative h-[88px] sm:h-[104px] border overflow-hidden transition-all cursor-pointer"
                        style={{
                          backgroundColor: on ? 'rgba(18,24,38,0.98)' : 'rgba(11,14,22,0.88)',
                          borderColor: on ? '#facc15' : `${c.accentColor}55`,
                          boxShadow: on ? `0 0 16px ${color}55, inset 0 0 14px ${color}24` : 'none',
                        }}
                      >
                        <div className="absolute inset-0">
                          <CharacterPortraitSvg id={id} color={color} active={on} />
                        </div>
                        {badge && (
                          <span className="absolute top-0 right-0 z-10 px-1 py-[1px] bg-gradient-to-r from-amber-300 to-rose-500 text-[8px] font-black text-black leading-none">
                            {badge}
                          </span>
                        )}
                        <span
                          className="absolute top-1 left-1.5 z-10 text-xs font-black"
                          style={{ color, fontFamily: 'var(--font-kanji)' }}
                        >
                          {c.ultimateKanji}
                        </span>
                        <div className="absolute bottom-0 inset-x-0 z-10 bg-black/78 px-1 py-1 text-center">
                          <div className="font-display italic font-extrabold text-xs text-white leading-none">
                            {c.name}
                          </div>
                          <div className="text-[9px] text-slate-300 truncate mt-0.5">{c.codename}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {drawerTab === 'skin' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Chọn trang phục">
                  {availableSkins.map((skin) => {
                    const on = skin.id === (activeSkinObj?.id ?? selectedSkin);
                    const v = getSkinVfxProfile(selectedCharacter, skin.id);
                    const r = RARITY_META[inferRarity(skin)];
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onSelectSkin(skin.id)}
                        className="relative min-h-[82px] flex flex-col justify-end gap-0.5 p-2.5 text-left border overflow-hidden transition-all cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${v.slashPrimary}33, rgba(10,13,22,0.95) 58%, ${v.slashSecondary}26)`,
                          borderColor: on ? '#facc15' : 'rgba(255,255,255,0.14)',
                          boxShadow: on ? `0 0 14px ${v.slashPrimary}55` : 'none',
                        }}
                      >
                        <span
                          className="absolute top-2 right-2 w-5 h-5 rotate-45 border-2"
                          style={{
                            borderColor: v.slashPrimary,
                            background: `linear-gradient(135deg, ${v.slashPrimary}, ${v.slashSecondary})`,
                          }}
                        />
                        <span
                          className="text-[8px] font-black tracking-wider px-1.5 py-[1px] w-fit text-black leading-none"
                          style={{ background: r.bg }}
                        >
                          {r.label}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white leading-tight mt-0.5">
                          {skin.name}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                          {skin.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {drawerTab === 'stage' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Chọn màn chơi">
                  {CAMPAIGN_STAGES.map((st) => {
                    const on = st.index === selectedStageIndex;
                    const cleared = clearedSet.has(st.index);
                    const boss = BOSS_ROSTER[st.bossId];
                    return (
                      <button
                        key={st.code}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onSelectStage(st.index)}
                        className="relative min-h-[82px] flex flex-col p-2 text-left border overflow-hidden transition-all cursor-pointer"
                        style={{
                          background: `linear-gradient(160deg, ${st.accentColor}2e, rgba(10,13,22,0.95) 62%)`,
                          borderColor: on ? '#facc15' : 'rgba(255,255,255,0.14)',
                          boxShadow: on ? `0 0 14px ${st.accentColor}55` : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-mono-num font-black text-base leading-none"
                            style={{ color: st.accentColor }}
                          >
                            {st.code}
                          </span>
                          {cleared && (
                            <span className="text-[8px] font-black px-1 bg-teal-400 text-black leading-tight">
                              ✓ XONG
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white leading-tight line-clamp-2 mt-1">
                          {st.name}
                        </span>
                        {boss && (
                          <span className="mt-auto pt-1 text-[10px] text-slate-400 truncate">
                            Trùm: <span style={{ color: boss.accentColor }}>{boss.name}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accessible specialName for SSR & screen readers */}
      <span className="sr-only">
        {activeChar.ultimateKanji} {activeChar.skills.specialName}
      </span>
    </div>
  );
};

