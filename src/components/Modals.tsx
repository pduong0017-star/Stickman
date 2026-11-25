import React from 'react';
import { CHARACTER_ORDER, CHARACTER_ROSTER } from '../game/characters';
import type { AudioSettings, CharacterId, CharacterSkillMeta, RunStats } from '../game/types';

interface PauseModalProps {
  selectedCharacter: CharacterId;
  characterName: string;
  characterAccent: string;
  skills: CharacterSkillMeta;
  onSelectCharacter: (id: CharacterId) => void;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  selectedCharacter,
  characterName,
  characterAccent,
  skills,
  onSelectCharacter,
  onResume,
  onRestart,
  onMainMenu,
}) => (
  <div
    className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
    style={{ backgroundColor: 'rgba(6, 8, 14, 0.86)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Tạm dừng"
  >
    <div className="clip-chamfer w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-[#101420] border border-slate-700 p-4 sm:p-7 flex flex-col gap-4">
      <div className="flex items-baseline justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display italic font-extrabold text-3xl sm:text-4xl text-white tracking-wider">
            TẠM DỪNG
          </h2>
          <span
            className="text-xs font-bold tracking-[0.16em]"
            style={{ color: characterAccent }}
          >
            {characterName}
          </span>
        </div>
        <span className="font-mono-num text-xs text-slate-400">ESC / P</span>
      </div>

      {/* Quick Character Switcher */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400">
          ĐỔI NHÂN VẬT NHANH
        </div>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Đổi nhân vật">
          {CHARACTER_ORDER.map((id) => {
            const c = CHARACTER_ROSTER[id];
            const active = id === selectedCharacter;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelectCharacter(id)}
                className="px-2 py-1.5 border text-left transition-colors cursor-pointer"
                style={{
                  backgroundColor: active ? 'rgba(22, 28, 46, 0.96)' : 'rgba(11, 14, 23, 0.85)',
                  borderColor: active ? c.accentColor : 'rgba(51, 65, 85, 0.7)',
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display italic font-bold text-sm text-white leading-none">
                    {c.name}
                  </span>
                  <span
                    className="font-display font-extrabold text-xs leading-none"
                    style={{ color: c.accentColor }}
                  >
                    {c.skills.ultimateKanji}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{c.codename}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Character Skill Reference */}
      <div className="flex flex-col gap-1.5 text-xs sm:text-sm text-slate-300">
        <div className="font-semibold text-slate-200">
          Bộ chiêu thức — <span style={{ color: characterAccent }}>{characterName}</span>
        </div>
        <div className="flex justify-between gap-2 py-1 border-b border-slate-800/80">
          <span className="text-slate-400">Đánh thường / Air Combo</span>
          <span className="font-mono-num text-white text-right">J · {skills.basicName}</span>
        </div>
        <div className="flex justify-between gap-2 py-1 border-b border-slate-800/80">
          <span className="text-slate-400">Parry phản đạn &amp; phá giáp</span>
          <span className="font-mono-num text-sky-300 text-right">K (đúng nhịp)</span>
        </div>
        <div className="flex justify-between gap-2 py-1 border-b border-slate-800/80">
          <span className="text-slate-400">{skills.specialDesc}</span>
          <span className="font-mono-num text-right" style={{ color: characterAccent }}>
            U · {skills.specialName}
          </span>
        </div>
        <div className="flex justify-between gap-2 py-1 border-b border-slate-800/80">
          <span className="text-slate-400">{skills.ultimateDesc}</span>
          <span className="font-mono-num text-red-400 text-right">
            I · {skills.ultimateName} ({skills.ultimateKanji})
          </span>
        </div>
        <div className="flex justify-between gap-2 py-1 border-b border-slate-800/80">
          <span className="text-slate-400">{skills.awakenDesc}</span>
          <span className="font-mono-num text-amber-300 text-right">O · {skills.awakenName}</span>
        </div>
        <div className="pt-1 text-amber-200/95 font-medium">
          ⚡ {skills.synergyHint}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          type="button"
          onClick={onResume}
          className="flex-1 min-w-[110px] px-4 py-2.5 bg-[#dc2626] hover:bg-[#ef4444] text-white font-display italic font-bold text-lg sm:text-xl tracking-wider cursor-pointer"
        >
          TIẾP TỤC
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="px-4 py-2.5 bg-[#1a2030] hover:bg-[#252e44] border border-slate-700 text-slate-100 font-display italic font-bold text-lg sm:text-xl tracking-wider cursor-pointer"
        >
          CHƠI LẠI
        </button>
        <button
          type="button"
          onClick={onMainMenu}
          className="px-4 py-2.5 bg-[#141926] hover:bg-[#1e2638] border border-slate-800 text-slate-300 font-display italic font-bold text-lg sm:text-xl tracking-wider cursor-pointer"
        >
          MENU
        </button>
      </div>
    </div>
  </div>
);

interface OutcomeModalProps {
  stats: RunStats;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  stats,
  onPlayAgain,
  onMainMenu,
}) => {
  const isVictory = stats.outcome === 'victory';
  const mins = Math.floor(stats.elapsedTime / 60);
  const secs = Math.floor(stats.elapsedTime % 60);
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const fighter = CHARACTER_ROSTER[stats.characterId] ?? CHARACTER_ROSTER.kuro;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(6, 8, 14, 0.88)' }}
      role="dialog"
      aria-modal="true"
      aria-label={isVictory ? 'Chiến thắng' : 'Thất bại'}
    >
      <div
        className="clip-chamfer w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#101420] border p-5 sm:p-7 flex flex-col gap-4 sm:gap-5"
        style={{ borderColor: isVictory ? '#ef4444' : '#475569' }}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em]">
              <span style={{ color: isVictory ? '#f87171' : '#94a3b8' }}>{stats.actReached}</span>
              <span className="text-slate-600">·</span>
              <span style={{ color: fighter.accentColor }}>
                {stats.characterName} ({fighter.codename})
              </span>
            </div>
            <h2 className="font-display italic font-extrabold text-3xl sm:text-5xl text-white tracking-wider">
              {isVictory ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400">HẠNG</div>
            <div
              className="font-display italic font-extrabold text-4xl sm:text-5xl leading-none"
              style={{ color: isVictory ? '#facc15' : '#94a3b8' }}
            >
              {stats.grade}
            </div>
          </div>
        </div>

        {/* 3 Primary Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-[#0b0e17] border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Thời gian</div>
            <div className="font-mono-num text-lg sm:text-xl font-bold text-white mt-0.5">
              {timeStr}
            </div>
          </div>
          <div className="bg-[#0b0e17] border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Max Combo</div>
            <div className="font-mono-num text-lg sm:text-xl font-bold text-purple-300 mt-0.5">
              {stats.maxCombo}
            </div>
          </div>
          <div className="bg-[#0b0e17] border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Parry hoàn hảo</div>
            <div className="font-mono-num text-lg sm:text-xl font-bold text-sky-300 mt-0.5">
              {stats.perfectParries}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-3">
          <span>
            Điểm: <strong className="font-mono-num text-white">{stats.score}</strong> · Kỷ lục:{' '}
            <strong className="font-mono-num text-amber-300">{stats.bestScore}</strong>
          </span>
          {stats.remainingBossName ? (
            <span className="text-red-300">
              {stats.remainingBossName} còn {stats.remainingBossHpPct}% HP
            </span>
          ) : (
            <span className="text-slate-400">
              Boss hạ: {stats.bossesDefeated}/{stats.totalBosses}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 px-5 py-2.5 sm:py-3 bg-[#dc2626] hover:bg-[#ef4444] text-white font-display italic font-bold text-lg sm:text-xl tracking-wider cursor-pointer"
          >
            {isVictory ? 'CHƠI LẠI' : 'THỬ LẠI'}
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="px-5 py-2.5 sm:py-3 bg-[#171d2c] hover:bg-[#222b40] border border-slate-700 text-slate-200 font-display italic font-bold text-lg sm:text-xl tracking-wider cursor-pointer"
          >
            VỀ MENU
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
    className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
    style={{ backgroundColor: 'rgba(6, 8, 14, 0.86)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Hướng dẫn điều khiển và nhân vật"
  >
    <div className="clip-chamfer w-full max-w-2xl max-h-[92dvh] overflow-y-auto bg-[#101420] border border-slate-700 p-4 sm:p-7 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h2 className="font-display italic font-extrabold text-2xl sm:text-3xl text-white tracking-wider">
          ĐIỀU KHIỂN &amp; CHIÊU THỨC 4 NHÂN VẬT
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          Đóng
        </button>
      </div>

      {/* Keyboard + Touch controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        <ControlRow keys="A / D · Vuốt trái" desc="Di chuyển trái / phải" />
        <ControlRow keys="W / Space · NHẢY" desc="Nhảy đôi lộn vòng (ZERO nhảy 3 bậc)" />
        <ControlRow keys="Shift / L · LƯỚT" desc="Lướt nhanh (+ J để Chém Lướt)" />
        <ControlRow keys="J · Giữ CHÉM" desc="Combo 6 đòn mượt & Air Slam" />
        <ControlRow keys="K · PARRY" desc="Phản đạn (+ J để Phản Công)" />
        <ControlRow keys="U · CHIÊU RIÊNG" desc="Kỹ năng đặc trưng mỗi nhân vật" />
        <ControlRow keys="I · TUYỆT KỸ" desc="Chiêu cuối Cutscene (100% Nộ)" />
        <ControlRow keys="O · THỨC TỈNH" desc="Biến hình vũ khí tối thượng" />
      </div>

      {/* 4 Playable Characters Roster Guide */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        <div className="text-xs font-bold tracking-[0.16em] text-slate-300">
          HỆ THỐNG 4 NHÂN VẬT
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHARACTER_ORDER.map((id) => {
            const c = CHARACTER_ROSTER[id];
            return (
              <div
                key={id}
                className="bg-[#0b0e17] border p-2.5 flex flex-col gap-1"
                style={{ borderColor: `${c.accentColor}66` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display italic font-extrabold text-base text-white">
                      {c.name}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: c.accentColor }}>
                      {c.codename}
                    </span>
                  </div>
                  <span
                    className="font-display font-extrabold text-sm"
                    style={{ color: c.accentColor }}
                  >
                    {c.skills.ultimateKanji}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  <strong className="text-white">[U] {c.skills.specialName}:</strong>{' '}
                  {c.skills.specialDesc}
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">
                  <strong className="text-red-300">[I] {c.skills.ultimateName}</strong> ·{' '}
                  <strong className="text-amber-300">[O] {c.skills.awakenName}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2.5">
        Mẹo điện thoại: Xoay ngang màn hình và bấm <strong className="text-white">TOÀN MH</strong>{' '}
        để có góc nhìn rộng nhất. Ngón trái trượt liên tục trên thanh di chuyển để đổi hướng tức thì,
        ngón phải bấm vòng cung kỹ năng.
      </div>
    </div>
  </div>
);

const ControlRow: React.FC<{ keys: string; desc: string }> = ({ keys, desc }) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/70">
    <span className="font-mono-num text-xs font-bold text-purple-300 shrink-0">{keys}</span>
    <span className="text-xs text-slate-300 text-right">{desc}</span>
  </div>
);

interface AudioModalProps {
  settings: AudioSettings;
  onChange: (partial: Partial<AudioSettings>) => void;
  onClose: () => void;
}

export const AudioModal: React.FC<AudioModalProps> = ({ settings, onChange, onClose }) => (
  <div
    className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
    style={{ backgroundColor: 'rgba(6, 8, 14, 0.86)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Cài đặt âm thanh"
  >
    <div className="clip-chamfer w-full max-w-md max-h-[92dvh] overflow-y-auto bg-[#101420] border border-slate-700 p-5 sm:p-7 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h2 className="font-display italic font-extrabold text-2xl sm:text-3xl text-white tracking-wider">
          CÀI ĐẶT ÂM THANH
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          Đóng
        </button>
      </div>

      <div className="flex flex-col gap-3.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-200 font-medium">Nhạc nền Phonk (136 BPM)</span>
          <button
            type="button"
            onClick={() => onChange({ bgmEnabled: !settings.bgmEnabled })}
            className="px-4 py-1.5 font-mono-num text-xs font-bold border cursor-pointer"
            style={{
              backgroundColor: settings.bgmEnabled ? '#1e293b' : '#0f172a',
              borderColor: settings.bgmEnabled ? '#38bdf8' : '#334155',
              color: settings.bgmEnabled ? '#7dd3fc' : '#94a3b8',
            }}
          >
            {settings.bgmEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Âm lượng tổng</span>
            <span className="font-mono-num">{Math.round(settings.masterVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.masterVolume * 100)}
            onChange={(e) => onChange({ masterVolume: Number(e.target.value) / 100, muted: false })}
            className="accent-red-500 cursor-pointer"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Hiệu ứng chiến đấu (SFX)</span>
            <span className="font-mono-num">{Math.round(settings.sfxVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.sfxVolume * 100)}
            onChange={(e) => onChange({ sfxVolume: Number(e.target.value) / 100 })}
            className="accent-purple-500 cursor-pointer"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Âm lượng nhạc nền (BGM)</span>
            <span className="font-mono-num">{Math.round(settings.bgmVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.bgmVolume * 100)}
            onChange={(e) => onChange({ bgmVolume: Number(e.target.value) / 100 })}
            className="accent-sky-400 cursor-pointer"
          />
        </label>
      </div>
    </div>
  </div>
);
