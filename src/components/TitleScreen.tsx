import React from 'react';
import { CHARACTER_ORDER, CHARACTER_ROSTER, getCharacterDef } from '../game/characters';
import type { CharacterId, GameMode } from '../game/types';

interface TitleScreenProps {
  selectedCharacter: CharacterId;
  onSelectCharacter: (id: CharacterId) => void;
  onStartMode: (mode: GameMode) => void;
  onOpenControls: () => void;
  onOpenAudio: () => void;
  onToggleFullscreen: () => void;
  canFullscreen: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedCharacter,
  onSelectCharacter,
  onStartMode,
  onOpenControls,
  onOpenAudio,
  onToggleFullscreen,
  canFullscreen,
}) => {
  const activeChar = getCharacterDef(selectedCharacter);

  return (
    <div className="landscape-title-shell fixed inset-0 z-20 pointer-events-none flex flex-col justify-between safe-inset-hud md:p-10 lg:p-14">
      {/* Subtle left contrast scrim keeping center-right chair hero 100% unobstructed */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(9,11,16,0.92) 0%, rgba(9,11,16,0.74) 42%, rgba(9,11,16,0.12) 66%, rgba(9,11,16,0.3) 100%)',
        }}
      />

      {/* TOP-RIGHT COMPACT UTILITY STRIP ON MOBILE LANDSCAPE (frees vertical space on short screens!) */}
      <div className="landscape-only-flex hidden relative z-20 pointer-events-auto items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenControls}
          className="px-2.5 py-1 bg-[#111624]/92 border border-slate-700/80 text-[11px] font-semibold text-slate-200 hover:text-white cursor-pointer whitespace-nowrap"
        >
          Chiêu thức
        </button>
        <button
          type="button"
          onClick={onOpenAudio}
          className="px-2.5 py-1 bg-[#111624]/92 border border-slate-700/80 text-[11px] font-semibold text-slate-200 hover:text-white cursor-pointer whitespace-nowrap"
        >
          Âm thanh
        </button>
        {canFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="px-2.5 py-1 bg-[#102033]/92 border border-sky-500/70 text-[11px] font-semibold text-sky-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            Toàn MH
          </button>
        )}
      </div>

      {/* Main Content — 2-Zone Mobile Landscape (Left Roster + Mode Dock, Right Live Chair Hero) */}
      <div className="relative z-10 flex-1 flex items-center min-h-0">
        <div className="landscape-title-wrap pointer-events-auto w-full max-w-[500px] flex flex-col gap-3 sm:gap-5 max-h-full justify-center">
          {/* Custom inline SVG Anime Title Emblem */}
          <div className="flex flex-col gap-1">
            <svg
              viewBox="0 0 420 112"
              className="landscape-title-logo w-[220px] sm:w-[300px] lg:w-[380px] h-auto overflow-visible"
              role="img"
              aria-label="SCARLET SHEATH"
            >
              <path
                d="M 4 74 L 392 16 L 414 24 L 18 88 Z"
                fill={activeChar.ultimatePrimaryColor}
                opacity="0.92"
              />
              <path
                d="M 14 80 L 402 20"
                stroke="#fef2f2"
                strokeWidth="2"
                opacity="0.9"
              />
              {/* Active Character Kanji Seal */}
              <g transform="translate(342, 38)">
                <rect
                  x="0"
                  y="0"
                  width="54"
                  height="54"
                  fill="rgba(12, 8, 16, 0.94)"
                  stroke={activeChar.accentColor}
                  strokeWidth="3"
                />
                <text
                  x="27"
                  y="39"
                  textAnchor="middle"
                  fill={activeChar.accentColor}
                  fontSize="36"
                  fontWeight="900"
                  style={{ fontFamily: 'var(--font-kanji)' }}
                >
                  {activeChar.ultimateKanji}
                </text>
              </g>
              <text
                x="6"
                y="52"
                fill="#f8fafc"
                fontSize="54"
                fontWeight="800"
                fontStyle="italic"
                letterSpacing="2"
                stroke="#090b10"
                strokeWidth="6"
                paintOrder="stroke fill"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SCARLET
              </text>
              <text
                x="12"
                y="98"
                fill={activeChar.accentColor}
                fontSize="50"
                fontWeight="800"
                fontStyle="italic"
                letterSpacing="3"
                stroke="#090b10"
                strokeWidth="6"
                paintOrder="stroke fill"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SHEATH
              </text>
            </svg>
            <p className="landscape-compact-hidden text-xs sm:text-sm text-slate-300 tracking-wide pl-1">
              Đại chiến thực thể AI · 4 Nhân vật · Combo 6 đòn mượt 60 FPS
            </p>
          </div>

          {/* 4-Character Roster Selector (2x2 on compact landscape phones, 4-col on desktop) */}
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Chọn nhân vật">
            <div className="landscape-char-grid grid grid-cols-4 gap-1.5 sm:gap-2">
              {CHARACTER_ORDER.map((id) => {
                const c = CHARACTER_ROSTER[id];
                const isSelected = id === selectedCharacter;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Chọn nhân vật ${c.name} - ${c.codename}`}
                    onClick={() => onSelectCharacter(id)}
                    className="landscape-char-card relative flex flex-col items-start justify-between px-2.5 py-2 sm:px-3 sm:py-2.5 min-h-[44px] text-left border transition-transform duration-150 active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'rgba(20, 26, 40, 0.96)' : 'rgba(13, 17, 27, 0.84)',
                      borderColor: isSelected ? c.accentColor : 'rgba(51, 65, 85, 0.75)',
                      boxShadow: isSelected ? `0 0 14px ${c.accentColor}44` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between w-full gap-1">
                      <span
                        className="font-display italic font-extrabold text-sm sm:text-lg leading-none tracking-wide"
                        style={{ color: isSelected ? '#ffffff' : '#cbd5e1' }}
                      >
                        {c.name}
                      </span>
                      <span
                        className="text-xs sm:text-base font-black leading-none"
                        style={{ color: c.accentColor, fontFamily: 'var(--font-kanji)' }}
                      >
                        {c.ultimateKanji}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 truncate w-full mt-0.5">
                      {c.codename}
                    </span>
                    {isSelected && (
                      <span
                        className="absolute inset-x-0 bottom-0 h-0.5"
                        style={{ backgroundColor: c.accentColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Concise Active Fighter Stats & Kit Strip */}
            <div className="flex flex-col gap-0.5 pl-0.5 text-[10px] sm:text-xs text-slate-300 hud-text-shadow">
              <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="font-bold" style={{ color: activeChar.accentColor }}>
                  {activeChar.name} · {activeChar.archetype}
                </span>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="font-mono-num text-slate-200">
                  HP {activeChar.maxHp}
                </span>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="font-mono-num text-slate-200">
                  Nhảy x{activeChar.maxJumps}
                </span>
              </div>
              <div className="text-slate-300/90 truncate">
                <span className="text-sky-300 font-semibold">[U] {activeChar.skills.specialName}</span>
                <span className="text-slate-500 mx-1" aria-hidden="true">/</span>
                <span className="text-red-300 font-semibold">[I] {activeChar.skills.ultimateName} ({activeChar.ultimateKanji})</span>
                <span className="text-slate-500 mx-1" aria-hidden="true">/</span>
                <span className="text-amber-300 font-semibold">[O] {activeChar.skills.awakenName}</span>
              </div>
            </div>
          </div>

          {/* Primary 3 Mode Buttons — horizontal 3-col row on compact landscape phones, stacked on desktop */}
          <div className="landscape-title-modes grid grid-cols-1 gap-2 sm:gap-2.5 w-full max-w-[320px]">
            <button
              type="button"
              data-start="true"
              onClick={() => onStartMode('story')}
              className="landscape-title-mode-btn clip-slant-left group relative w-full text-left px-5 py-3 min-h-[44px] bg-[#dc2626] hover:bg-[#ef4444] active:translate-y-0.5 text-white font-display text-2xl font-bold italic tracking-wider transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer whitespace-nowrap"
            >
              <span className="flex items-center justify-between gap-2">
                <span>CHƠI NGAY</span>
                <span className="landscape-compact-hidden font-sans not-italic text-xs font-semibold text-red-100 opacity-90">
                  Cốt truyện · 4 Màn
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStartMode('boss_rush')}
              className="landscape-title-mode-btn clip-slant-left w-full text-left px-5 py-2.5 min-h-[44px] bg-[#151a27] hover:bg-[#1e2638] border border-slate-700/80 hover:border-purple-400/80 text-slate-100 font-display text-xl font-bold italic tracking-wider transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 cursor-pointer whitespace-nowrap"
            >
              <span className="flex items-center justify-between gap-2">
                <span>ĐẤU BOSS</span>
                <span className="landscape-compact-hidden font-sans not-italic text-xs font-medium text-slate-400">
                  5 Boss liên tiếp
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStartMode('training')}
              className="landscape-title-mode-btn clip-slant-left w-full text-left px-5 py-2.5 min-h-[44px] bg-[#151a27] hover:bg-[#1e2638] border border-slate-700/80 hover:border-sky-400/80 text-slate-100 font-display text-xl font-bold italic tracking-wider transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer whitespace-nowrap"
            >
              <span className="flex items-center justify-between gap-2">
                <span>LUYỆN TẬP</span>
                <span className="landscape-compact-hidden font-sans not-italic text-xs font-medium text-sky-300">
                  Vô hạn Nộ &amp; Thức Tỉnh
                </span>
              </span>
            </button>
          </div>

          {/* Secondary Utility Actions (desktop/tall screens — moved to top-right on mobile landscape) */}
          <div className="landscape-compact-hidden flex items-center flex-wrap gap-4 sm:gap-5 pt-0.5 pl-0.5">
            <button
              type="button"
              onClick={onOpenControls}
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer min-h-[36px] flex items-center whitespace-nowrap"
            >
              Chiêu thức &amp; Điều khiển
            </button>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenAudio}
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer min-h-[36px] flex items-center whitespace-nowrap"
            >
              Âm thanh
            </button>
            {canFullscreen && (
              <>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="text-xs sm:text-sm font-semibold text-sky-300 hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer min-h-[36px] flex items-center whitespace-nowrap"
                >
                  Toàn màn hình
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Flat Single-Line Control Hint in Bottom Safe Margin (desktop only) */}
      <div className="landscape-compact-hidden relative z-10 text-xs text-slate-400 tracking-wide hud-text-shadow truncate">
        A/D Di chuyển · W/Space Nhảy · Shift Lướt + J Chém lướt · J Combo 6 đòn · K Parry · U {activeChar.skills.specialName} · I {activeChar.skills.ultimateName} · O {activeChar.skills.awakenName}
      </div>
    </div>
  );
};
