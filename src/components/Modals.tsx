import React from 'react';
import {
  Clock,
  Flame,
  Gamepad2,
  Home,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CHARACTER_ORDER, CHARACTER_ROSTER } from '../game/characters';
import type {
  AudioSettings,
  RunStats,
  Solo1v1HudState,
} from '../game/types';

export type GraphicsQuality = 'high' | 'low';

export interface GameVisualSettings {
  screenShake: boolean;
  impactFlash: boolean;
  graphicsQuality: GraphicsQuality;
}

const VISUAL_SETTINGS_KEY = 'scarlet_sheath_visual_settings_v1';
const AUDIO_SETTINGS_KEY = 'scarlet_sheath_audio_settings_v1';

export const DEFAULT_VISUAL_SETTINGS: GameVisualSettings = {
  screenShake: true,
  impactFlash: true,
  graphicsQuality: 'high',
};

export function loadVisualSettings(): GameVisualSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_VISUAL_SETTINGS };
  try {
    const raw = window.localStorage.getItem(VISUAL_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_VISUAL_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameVisualSettings>;
    return {
      screenShake: typeof parsed.screenShake === 'boolean' ? parsed.screenShake : true,
      impactFlash: typeof parsed.impactFlash === 'boolean' ? parsed.impactFlash : true,
      graphicsQuality: parsed.graphicsQuality === 'low' ? 'low' : 'high',
    };
  } catch {
    return { ...DEFAULT_VISUAL_SETTINGS };
  }
}

export function saveVisualSettings(settings: GameVisualSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function loadAudioSettings(): Partial<AudioSettings> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

interface PauseModalProps {
  characterName: string;
  characterAccent: string;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  characterName,
  characterAccent,
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => (
  <div
    className="fixed inset-0 z-30 flex items-center justify-center p-3 backdrop-blur-sm"
    style={{ backgroundColor: 'rgba(5, 7, 12, 0.84)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Tạm dừng"
  >
    <div className="ink-panel relative w-full max-w-sm border border-white/15 p-4 sm:p-5 flex flex-col gap-3">
      {/* Top wuxia crimson-gold accent bar */}
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #dc2626, #f59e0b 55%, transparent)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="ink-seal w-8 h-8 flex items-center justify-center bg-red-950/70 border border-red-500/50 text-red-300 text-base font-black">
            止
          </span>
          <div>
            <h2 className="font-display italic font-black text-2xl text-white tracking-wider leading-none">
              TẠM DỪNG
            </h2>
            <div className="text-[11px] font-semibold tracking-wider mt-0.5" style={{ color: characterAccent }}>
              {characterName}
            </div>
          </div>
        </div>
        <span className="font-mono-num text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-slate-400">
          ESC / P
        </span>
      </div>

      {/* 4 Clear Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onResume}
          className="clip-slant-left samurai-glint w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-[#dc2626] via-[#b91c1c] to-[#7f1d1d] hover:brightness-115 border border-amber-300/45 text-white font-display italic font-black text-lg tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>TIẾP TỤC</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[42px] px-3 py-2 bg-[#121724] hover:bg-[#1a2235] border border-white/14 hover:border-amber-400/50 text-slate-100 font-display italic font-bold text-base tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>ĐÁNH LẠI</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[42px] px-3 py-2 bg-[#101c22] hover:bg-[#162932] border border-teal-500/35 hover:border-teal-400/70 text-teal-200 font-display italic font-bold text-base tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <Settings className="w-4 h-4 text-teal-400" />
            <span>CÀI ĐẶT</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onMainMenu}
          className="w-full min-h-[40px] px-4 py-2 bg-[#0b0e16] hover:bg-[#151b2b] border border-white/10 text-slate-300 hover:text-white font-display italic font-bold text-base tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4 text-slate-400" />
          <span>VỀ MENU CHÍNH</span>
        </button>
      </div>
    </div>
  </div>
);

interface SettingsModalProps {
  audioSettings: AudioSettings;
  visualSettings: GameVisualSettings;
  onAudioChange: (partial: Partial<AudioSettings>) => void;
  onVisualChange: (partial: Partial<GameVisualSettings>) => void;
  onCustomizeTouch: () => void;
  onOpenControls?: () => void;
  onClose: () => void;
}

const InkToggle: React.FC<{
  label: string;
  sub?: string;
  checked: boolean;
  accent?: 'gold' | 'jade' | 'crimson';
  onToggle: () => void;
}> = ({ label, sub, checked, accent = 'jade', onToggle }) => {
  const palette =
    accent === 'gold'
      ? { border: '#f59e0b', bg: 'rgba(245,158,11,0.16)', text: '#fde047', dot: '#facc15' }
      : accent === 'crimson'
        ? { border: '#ef4444', bg: 'rgba(239,68,68,0.16)', text: '#fca5a5', dot: '#f87171' }
        : { border: '#14b8a6', bg: 'rgba(20,184,166,0.16)', text: '#5eead4', dot: '#2dd4bf' };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left cursor-pointer transition-colors"
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-100 leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{sub}</div>}
      </div>
      <span
        className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono-num text-[10px] font-bold tracking-wider transition-colors"
        style={{
          borderColor: checked ? palette.border : 'rgba(255,255,255,0.16)',
          backgroundColor: checked ? palette.bg : 'rgba(15,23,42,0.8)',
          color: checked ? palette.text : '#94a3b8',
        }}
      >
        <span
          className="w-1.5 h-1.5"
          style={{ backgroundColor: checked ? palette.dot : '#475569' }}
        />
        {checked ? 'BẬT' : 'TẮT'}
      </span>
    </button>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  audioSettings,
  visualSettings,
  onAudioChange,
  onVisualChange,
  onCustomizeTouch,
  onOpenControls,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm"
    style={{ backgroundColor: 'rgba(5, 7, 12, 0.86)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Cài đặt"
  >
    <div className="ink-panel relative w-full max-w-2xl max-h-[94dvh] overflow-y-auto border border-white/15 p-3.5 sm:p-5 flex flex-col gap-3">
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #14b8a6, #f59e0b 55%, #dc2626)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-teal-400" />
          <h2 className="font-display italic font-black text-xl sm:text-2xl text-white tracking-wider leading-none">
            CÀI ĐẶT HỆ THỐNG
          </h2>
          <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 bg-teal-950/70 border border-teal-500/35 text-teal-300 font-semibold">
            Tự động lưu
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[32px] px-2.5 py-1 bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer flex items-center gap-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Đóng</span>
        </button>
      </div>

      {/* 2-Column Landscape Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Column 1: Audio */}
        <div className="flex flex-col gap-2.5 bg-black/25 border border-white/8 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.16em] text-amber-300 uppercase flex items-center gap-1.5">
              {audioSettings.muted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              )}
              Âm thanh
            </span>
            <button
              type="button"
              onClick={() => onAudioChange({ muted: !audioSettings.muted })}
              className="px-2 py-0.5 text-[10px] font-bold border cursor-pointer transition-colors"
              style={{
                borderColor: audioSettings.muted ? '#ef4444' : '#14b8a6',
                backgroundColor: audioSettings.muted ? 'rgba(239,68,68,0.18)' : 'rgba(20,184,166,0.16)',
                color: audioSettings.muted ? '#fca5a5' : '#5eead4',
              }}
            >
              {audioSettings.muted ? 'ĐANG TẮT TIẾNG' : 'ÂM THANH: BẬT'}
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Hiệu ứng (SFX)</span>
              <span className="font-mono-num text-amber-300 font-bold">
                {Math.round(audioSettings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audioSettings.sfxVolume * 100)}
              onChange={(e) => onAudioChange({ sfxVolume: Number(e.target.value) / 100, muted: false })}
              className="ink-slider"
              style={{ ['--slider-accent' as string]: '#f59e0b' }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Nhạc nền (BGM)</span>
              <span className="font-mono-num text-teal-300 font-bold">
                {audioSettings.bgmEnabled ? `${Math.round(audioSettings.bgmVolume * 100)}%` : 'TẮT'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audioSettings.bgmVolume * 100)}
              onChange={(e) =>
                onAudioChange({ bgmVolume: Number(e.target.value) / 100, bgmEnabled: true, muted: false })
              }
              className="ink-slider"
              style={{ ['--slider-accent' as string]: '#14b8a6' }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Âm lượng tổng</span>
              <span className="font-mono-num text-red-300 font-bold">
                {Math.round(audioSettings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audioSettings.masterVolume * 100)}
              onChange={(e) => onAudioChange({ masterVolume: Number(e.target.value) / 100, muted: false })}
              className="ink-slider"
              style={{ ['--slider-accent' as string]: '#ef4444' }}
            />
          </label>

          <InkToggle
            label="Nhạc nền chiến đấu (BGM)"
            checked={audioSettings.bgmEnabled}
            accent="jade"
            onToggle={() => onAudioChange({ bgmEnabled: !audioSettings.bgmEnabled })}
          />
        </div>

        {/* Column 2: Graphics & Controls */}
        <div className="flex flex-col gap-2 bg-black/25 border border-white/8 p-3">
          <div className="text-[11px] font-bold tracking-[0.16em] text-teal-300 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Đồ họa &amp; Hiệu năng
          </div>

          <InkToggle
            label="Rung màn hình"
            sub="Hiệu ứng chấn động khi tung đòn nặng"
            checked={visualSettings.screenShake}
            accent="gold"
            onToggle={() => onVisualChange({ screenShake: !visualSettings.screenShake })}
          />

          <InkToggle
            label="Chớp Impact Frame"
            sub="Lóe sáng thủy mặc khi Parry & Tuyệt kỹ"
            checked={visualSettings.impactFlash}
            accent="crimson"
            onToggle={() => onVisualChange({ impactFlash: !visualSettings.impactFlash })}
          />

          {/* Graphics Quality Selector */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-white/[0.03] border border-white/10">
            <span className="text-xs font-semibold text-slate-100">Mức đồ họa</span>
            <div className="flex gap-1" role="radiogroup" aria-label="Mức đồ họa">
              {(
                [
                  { id: 'high', label: 'Cao' },
                  { id: 'low', label: 'Nhẹ máy' },
                ] as const
              ).map((opt) => {
                const active = visualSettings.graphicsQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onVisualChange({ graphicsQuality: opt.id })}
                    className="px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors"
                    style={{
                      borderColor: active ? '#f59e0b' : 'rgba(255,255,255,0.14)',
                      backgroundColor: active ? 'rgba(245,158,11,0.2)' : 'rgba(15,23,42,0.8)',
                      color: active ? '#fef08a' : '#94a3b8',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Section */}
          <div className="mt-auto pt-1 flex flex-col gap-1.5 border-t border-white/10">
            <button
              type="button"
              onClick={onCustomizeTouch}
              className="w-full min-h-[40px] px-3 py-2 bg-gradient-to-r from-[#0f2429] to-[#132f36] hover:brightness-120 border border-teal-400/55 text-teal-200 font-display italic font-bold text-sm sm:text-base tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Gamepad2 className="w-4 h-4 text-teal-300" />
              <span>TÙY CHỈNH NÚT CẢM ỨNG</span>
            </button>

            {onOpenControls && (
              <button
                type="button"
                onClick={onOpenControls}
                className="w-full py-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                Xem bảng hướng dẫn phím &amp; chiêu thức
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface OutcomeModalProps {
  stats: RunStats;
  solo1v1?: Solo1v1HudState | null;
  onPlayAgain: () => void;
  onChangeSetup: () => void;
  onMainMenu: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  stats,
  solo1v1,
  onPlayAgain,
  onChangeSetup,
  onMainMenu,
}) => {
  const isVictory = stats.outcome === 'victory';
  const isSolo = stats.mode === 'solo1v1' && Boolean(solo1v1);
  const mins = Math.floor(stats.elapsedTime / 60);
  const secs = Math.floor(stats.elapsedTime % 60);
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const fighter = CHARACTER_ROSTER[stats.characterId] ?? CHARACTER_ROSTER.kuro;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm"
      style={{
        background: isVictory
          ? 'radial-gradient(circle at 50% 35%, rgba(20, 83, 75, 0.35), rgba(5, 7, 12, 0.9) 70%)'
          : 'radial-gradient(circle at 50% 35%, rgba(127, 29, 29, 0.35), rgba(5, 7, 12, 0.92) 70%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isVictory ? 'Chiến thắng' : 'Thất bại'}
    >
      <div
        className="ink-panel relative w-full max-w-xl max-h-[94dvh] overflow-y-auto border p-4 sm:p-5 flex flex-col gap-3.5"
        style={{
          borderColor: isVictory ? 'rgba(250, 204, 21, 0.55)' : 'rgba(220, 38, 38, 0.55)',
          boxShadow: isVictory
            ? '0 20px 55px rgba(0,0,0,0.82), 0 0 32px rgba(20, 184, 166, 0.16)'
            : '0 20px 55px rgba(0,0,0,0.86), 0 0 32px rgba(220, 38, 38, 0.18)',
        }}
      >
        {/* Top ink-brush bar */}
        <div
          className="absolute top-0 inset-x-0 h-[3px]"
          style={{
            background: isVictory
              ? 'linear-gradient(90deg, #facc15, #14b8a6 65%, transparent)'
              : 'linear-gradient(90deg, #dc2626, #991b1b 65%, transparent)',
          }}
        />

        {/* Header + Score/Rank Stamp */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="ink-seal shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl font-black border"
              style={
                isVictory
                  ? {
                      borderColor: 'rgba(250, 204, 21, 0.65)',
                      background: 'linear-gradient(145deg, rgba(245,158,11,0.22), rgba(20,184,166,0.16))',
                      color: '#fde047',
                    }
                  : {
                      borderColor: 'rgba(239, 68, 68, 0.65)',
                      background: 'linear-gradient(145deg, rgba(185,28,28,0.32), rgba(15,10,12,0.8))',
                      color: '#f87171',
                    }
              }
            >
              {isVictory ? '勝' : '敗'}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] truncate">
                <span style={{ color: isVictory ? '#2dd4bf' : '#f87171' }}>{stats.actReached}</span>
                <span className="text-slate-600">·</span>
                <span style={{ color: fighter.accentColor }}>{stats.characterName}</span>
              </div>
              <h2
                className="font-display italic font-black text-3xl sm:text-4xl tracking-wider leading-none mt-0.5"
                style={{ color: isVictory ? '#fef08a' : '#fca5a5' }}
              >
                {isVictory ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
              </h2>
              {stats.remainingBossName && !isVictory && !isSolo && (
                <div className="text-[11px] text-red-300/90 mt-0.5 truncate">
                  {stats.remainingBossName} còn {stats.remainingBossHpPct}% HP
                </div>
              )}
            </div>
          </div>

          {/* Right Badge: Solo 1v1 Round Score OR Grade */}
          {isSolo && solo1v1 ? (
            <div
              className="shrink-0 px-3 py-1.5 border bg-black/50 flex flex-col items-center justify-center"
              style={{ borderColor: isVictory ? '#2dd4bf' : '#ef4444' }}
            >
              <span className="text-[9px] font-bold tracking-widest text-slate-400">TỶ SỐ HIỆP</span>
              <span className="font-mono-num font-black text-2xl sm:text-3xl leading-none text-white">
                <span style={{ color: isVictory ? '#fde047' : '#e2e8f0' }}>{solo1v1.playerWins}</span>
                <span className="text-slate-500 mx-1">-</span>
                <span style={{ color: isVictory ? '#94a3b8' : '#f87171' }}>{solo1v1.botWins}</span>
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[110px]">
                vs {solo1v1.opponentName}
              </span>
            </div>
          ) : (
            <div
              className="shrink-0 w-16 h-16 border bg-black/55 flex flex-col items-center justify-center"
              style={{ borderColor: isVictory ? '#facc15' : '#ef4444' }}
            >
              <span className="text-[9px] font-bold tracking-widest text-slate-400">XẾP HẠNG</span>
              <span
                className="font-display italic font-black text-3xl leading-none"
                style={{ color: isVictory ? '#facc15' : '#f87171' }}
              >
                {stats.grade}
              </span>
            </div>
          )}
        </div>

        {/* 4 Core Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/[0.03] border border-white/10 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Max Combo</span>
            </div>
            <div className="font-mono-num text-lg font-black text-amber-300 leading-tight mt-0.5">
              {stats.maxCombo}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span>Tổng điểm</span>
            </div>
            <div className="font-mono-num text-lg font-black text-white leading-tight mt-0.5">
              {stats.score.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-400 font-mono-num">
              Kỷ lục: {stats.bestScore.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3 text-teal-400" />
              <span>Thời gian</span>
            </div>
            <div className="font-mono-num text-lg font-black text-teal-200 leading-tight mt-0.5">
              {timeStr}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              {isSolo ? (
                <Swords className="w-3 h-3 text-rose-400" />
              ) : (
                <Shield className="w-3 h-3 text-sky-400" />
              )}
              <span>{isSolo ? 'Hạng trận' : 'Parry / Trùm'}</span>
            </div>
            <div className="font-mono-num text-lg font-black text-sky-200 leading-tight mt-0.5">
              {isSolo ? stats.grade : `${stats.perfectParries}`}
            </div>
            {!isSolo && (
              <div className="text-[9px] text-slate-400 font-mono-num">
                Boss: {stats.bossesDefeated}/{stats.totalBosses}
              </div>
            )}
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="clip-slant-left samurai-glint min-h-[44px] px-3.5 py-2.5 font-display italic font-black text-base sm:text-lg tracking-wider text-white cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:brightness-115 border"
            style={
              isVictory
                ? {
                    borderColor: '#facc15',
                    background: 'linear-gradient(100deg, #0d9488, #0f766e 60%, #115e59)',
                  }
                : {
                    borderColor: '#f87171',
                    background: 'linear-gradient(100deg, #dc2626, #991b1b 70%, #7f1d1d)',
                  }
            }
          >
            <RotateCcw className="w-4 h-4" />
            <span>ĐÁNH LẠI NGAY</span>
          </button>

          <button
            type="button"
            onClick={onChangeSetup}
            className="min-h-[44px] px-3 py-2.5 bg-[#121927] hover:bg-[#1a2438] border border-amber-400/40 text-amber-200 hover:text-white font-display italic font-bold text-sm sm:text-base tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">ĐỔI NHÂN VẬT / MÀN</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="min-h-[44px] px-3 py-2.5 bg-[#0c1018] hover:bg-[#151c2b] border border-white/14 text-slate-300 hover:text-white font-display italic font-bold text-sm sm:text-base tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400 shrink-0" />
            <span>VỀ MENU CHÍNH</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ControlsModalProps {
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm"
    style={{ backgroundColor: 'rgba(5, 7, 12, 0.86)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Hướng dẫn điều khiển và nhân vật"
  >
    <div className="ink-panel relative w-full max-w-2xl max-h-[94dvh] overflow-y-auto border border-white/15 p-4 sm:p-5 flex flex-col gap-3">
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #dc2626, #f59e0b 60%, transparent)' }}
      />

      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="font-display italic font-black text-xl sm:text-2xl text-white tracking-wider">
          ĐIỀU KHIỂN &amp; CHIÊU THỨC
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          <span>Đóng</span>
        </button>
      </div>

      {/* Keyboard + Touch controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <ControlRow keys="A / D · Vuốt trái" desc="Di chuyển trái / phải" />
        <ControlRow keys="W / Space · NHẢY" desc="Nhảy đôi (Zero & Aether nhảy 3 bậc)" />
        <ControlRow keys="Shift / L · LƯỚT" desc="Lướt xuyên đòn = Né Hoàn Hảo" />
        <ControlRow keys="J · Giữ CHÉM" desc="Combo 6 đòn & Air Slam" />
        <ControlRow keys="K · PARRY" desc="Phản đạn & làm đầy thanh Phá Giáp" />
        <ControlRow keys="U · CHIÊU RIÊNG" desc="Kỹ năng đặc trưng (+ J Liên Kích)" />
        <ControlRow keys="I · TUYỆT KỸ" desc="Chiêu cuối Cutscene (100% Nộ)" />
        <ControlRow keys="O · THỨC TỈNH" desc="Biến hình tối thượng" />
      </div>

      {/* Playable Characters Roster Guide */}
      <div className="border-t border-white/10 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CHARACTER_ORDER.map((id) => {
          const c = CHARACTER_ROSTER[id];
          return (
            <div
              key={id}
              className="bg-white/[0.03] border border-white/10 p-2 flex flex-col gap-0.5"
              style={{ borderLeft: `3px solid ${c.accentColor}` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display italic font-extrabold text-sm text-white">
                  {c.name}{' '}
                  <span className="text-[11px] font-normal" style={{ color: c.accentColor }}>
                    · {c.codename}
                  </span>
                </span>
                <span
                  className="font-black text-xs"
                  style={{ color: c.accentColor, fontFamily: 'var(--font-kanji)' }}
                >
                  {c.skills.ultimateKanji}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 leading-snug">
                <strong className="text-white">[U] {c.skills.specialName}:</strong>{' '}
                {c.skills.specialDesc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const ControlRow: React.FC<{ keys: string; desc: string }> = ({ keys, desc }) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-white/8">
    <span className="font-mono-num text-[11px] font-bold text-slate-200 shrink-0">{keys}</span>
    <span className="text-[11px] text-slate-400 text-right">{desc}</span>
  </div>
);
