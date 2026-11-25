import React from 'react';
import type { AudioSettings, HudSnapshot, StyleRank } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  audioSettings: AudioSettings;
  showTouchControls: boolean;
  canFullscreen: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleTouch: () => void;
  onToggleFullscreen: () => void;
}

const RANK_COLORS: Record<StyleRank, string> = {
  D: '#94a3b8',
  C: '#38bdf8',
  B: '#4ade80',
  A: '#facc15',
  S: '#fb923c',
  SS: '#f43f5e',
  SSS: '#e879f9',
};

const RANK_SUBTITLES: Record<StyleRank, string> = {
  D: 'DISMAL',
  C: 'CRAZY',
  B: 'BRUTAL',
  A: 'ANARCHIC',
  S: 'SAVAGE',
  SS: 'STYLISH',
  SSS: 'SUPREME',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  audioSettings,
  showTouchControls,
  canFullscreen,
  onToggleMute,
  onTogglePause,
  onRestart,
  onToggleTouch,
  onToggleFullscreen,
}) => {
  if (hud.cutsceneActive) {
    return null;
  }

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const trailPct = Math.max(hpPct, Math.min(100, (hud.trailHp / hud.maxHp) * 100));
  const ragePct = Math.max(0, Math.min(100, (hud.rage / hud.maxRage) * 100));
  const awakenPct = hud.awakened
    ? Math.max(0, Math.min(100, (hud.cooldowns.awakenTimeLeft / hud.cooldowns.awakenDuration) * 100))
    : Math.max(0, Math.min(100, (hud.awakening / hud.maxAwakening) * 100));

  const comboScale = 1 + hud.comboPulse * 0.22;

  return (
    <div className="landscape-hud-top fixed inset-0 z-10 pointer-events-none flex flex-col justify-between safe-inset-hud sm:p-4">
      {/* TOP BAR: 3-Zone Header (Left Player Vitals · Center Boss Bar · Right Utility + Style Rank) */}
      <div className="flex items-start justify-between gap-2">
        {/* TOP-LEFT: Compact Character + Act + HP / Rage / Awakening */}
        <div className="landscape-hud-vitals flex flex-col gap-1 w-[210px] sm:w-[290px] shrink-0">
          <div className="flex items-baseline gap-1.5 hud-text-shadow">
            <span className="font-display italic font-extrabold text-lg sm:text-2xl leading-none text-red-500">
              {hud.actCode}
            </span>
            <span className="font-display italic font-bold text-base sm:text-xl leading-none tracking-wider text-white truncate">
              {hud.actTitle}
            </span>
            <span
              className="font-display italic font-bold text-[11px] sm:text-sm tracking-wider shrink-0"
              style={{ color: hud.characterAccent }}
            >
              · {hud.characterName}
            </span>
          </div>

          {/* HP Bar with delayed damage trail */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-semibold tracking-wider text-slate-300 hud-text-shadow leading-none">
              <span>HP</span>
              <span className="font-mono-num text-white">
                {hud.hp} / {hud.maxHp}
              </span>
            </div>
            <div className="relative h-2 sm:h-3 w-full bg-[#0e121c] border border-slate-700/90 clip-slant-left overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-amber-400/80 transition-none"
                style={{ width: `${trailPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hpPct <= 30 ? '#ef4444' : hud.awakened ? '#facc15' : hud.characterAccent,
                }}
              />
            </div>
          </div>

          {/* Rage & Awakening Slim Dual Bars */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-semibold tracking-wider hud-text-shadow leading-none">
                <span className={hud.cooldowns.ultimateReady ? 'text-red-400' : 'text-slate-400'}>
                  {hud.cooldowns.ultimateReady ? `NỘ [${hud.characterSkills.ultimateKanji}]` : 'NỘ'}
                </span>
                <span className="font-mono-num text-slate-200">{hud.rage}%</span>
              </div>
              <div
                className="relative h-1.5 sm:h-2 w-full bg-[#0e121c] border overflow-hidden"
                style={{
                  borderColor: hud.cooldowns.ultimateReady ? '#ef4444' : 'rgba(51,65,85,0.9)',
                  boxShadow: hud.cooldowns.ultimateReady ? '0 0 10px rgba(239,68,68,0.6)' : 'none',
                }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${ragePct}%`,
                    backgroundColor: hud.cooldowns.ultimateReady ? '#ef4444' : '#dc2626',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-semibold tracking-wider hud-text-shadow leading-none">
                <span
                  className={
                    hud.awakened
                      ? 'text-red-300'
                      : hud.cooldowns.awakenReady
                        ? 'text-amber-300'
                        : 'text-slate-400'
                  }
                >
                  {hud.awakened
                    ? `${hud.cooldowns.awakenTimeLeft}s`
                    : hud.cooldowns.awakenReady
                      ? 'TỈNH [O]'
                      : 'TỈNH'}
                </span>
                <span className="font-mono-num text-slate-200">
                  {hud.awakened ? 'ON' : `${hud.awakening}%`}
                </span>
              </div>
              <div
                className="relative h-1.5 sm:h-2 w-full bg-[#0e121c] border overflow-hidden"
                style={{
                  borderColor:
                    hud.awakened || hud.cooldowns.awakenReady
                      ? '#f59e0b'
                      : 'rgba(51,65,85,0.9)',
                  boxShadow:
                    hud.awakened || hud.cooldowns.awakenReady
                      ? '0 0 8px rgba(245,158,11,0.5)'
                      : 'none',
                }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${awakenPct}%`,
                    backgroundColor: hud.awakened ? '#ef4444' : '#f59e0b',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quiet Wave & Tactical Hint Line (desktop only) */}
          <div className="landscape-compact-hidden text-[11px] text-slate-300/90 hud-text-shadow leading-snug">
            <span className="font-mono-num text-slate-400 mr-2">{hud.waveProgressText}</span>
            <span className="hidden md:inline text-slate-300">· {hud.actHint}</span>
          </div>
        </div>

        {/* TOP-CENTER: Boss HP Bar (centered cleanly so right-hand combat controls & Combo Rank never overlap!) */}
        {hud.boss ? (
          <div className="landscape-hud-boss flex-1 max-w-[260px] sm:max-w-[340px] flex flex-col gap-0.5 items-center pt-0.5">
            <div className="flex items-baseline justify-between w-full hud-text-shadow px-0.5">
              <span
                className="text-[9px] sm:text-[11px] font-bold tracking-widest truncate"
                style={{ color: hud.boss.accentColor }}
              >
                {hud.boss.faction}
              </span>
              <span className="font-display italic font-extrabold text-sm sm:text-xl text-white tracking-wide truncate ml-2">
                {hud.boss.name}
              </span>
            </div>
            <div className="relative h-2 sm:h-3 w-full bg-[#0e121c] border border-slate-700 clip-slant overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-amber-300/80"
                style={{ width: `${Math.min(100, (hud.boss.trailHp / hud.boss.maxHp) * 100)}%` }}
              />
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${Math.max(0, Math.min(100, (hud.boss.hp / hud.boss.maxHp) * 100))}%`,
                  backgroundColor: hud.boss.accentColor,
                }}
              />
            </div>
            <div className="landscape-compact-hidden text-[10px] font-mono-num text-slate-300 hud-text-shadow">
              {hud.boss.title} · {hud.boss.hp}/{hud.boss.maxHp}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* TOP-RIGHT: Compact Utility Controls + Style Rank & Combo */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
            <div className="mr-1 hidden md:flex items-baseline gap-1.5 hud-text-shadow">
              <span className="text-[10px] text-slate-400 font-semibold">ĐIỂM</span>
              <span className="font-mono-num text-sm sm:text-base font-bold text-white" data-testid="hud-score">
                {hud.score}
              </span>
            </div>

            {canFullscreen && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Toàn màn hình"
                title="Toàn màn hình"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleFullscreen();
                }}
                className="landscape-hud-util-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121723]/90 hover:bg-[#1e2638] border border-slate-700 text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              aria-label={showTouchControls ? 'Ẩn nút cảm ứng' : 'Hiện nút cảm ứng'}
              title="Nút cảm ứng Mobile"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleTouch();
              }}
              className="landscape-hud-util-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121723]/90 hover:bg-[#1e2638] border text-slate-200 cursor-pointer"
              style={{
                borderColor: showTouchControls ? hud.characterAccent : '#334155',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M7 12h4M9 10v4M15.5 11h.01M17.5 13h.01" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={audioSettings.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              title="Âm thanh [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="landscape-hud-util-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121723]/90 hover:bg-[#1e2638] border border-slate-700 text-slate-200 cursor-pointer"
            >
              {audioSettings.muted ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M22 9l-6 6M16 9l6 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Chơi lại"
              title="Chơi lại [R]"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="landscape-hud-util-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121723]/90 hover:bg-[#1e2638] border border-slate-700 text-slate-200 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Tạm dừng"
              title="Tạm dừng [Esc / P]"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="landscape-hud-util-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121723]/90 hover:bg-[#1e2638] border border-slate-700 text-slate-200 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            </button>
          </div>

          {/* Compact Combo Counter & Style Rank (tucked cleanly under top-right bar) */}
          {hud.combo > 0 && (
            <div
              className="flex items-baseline gap-2 pr-0.5 transition-transform duration-75"
              style={{ transform: `scale(${comboScale})`, transformOrigin: 'top right' }}
            >
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1 hud-text-shadow">
                  <span className="font-mono-num font-bold text-lg sm:text-2xl text-white leading-none">
                    {hud.combo}
                  </span>
                  <span className="font-display italic font-bold text-[10px] sm:text-xs text-slate-300 tracking-wider">
                    HITS
                  </span>
                </div>
                <div className="landscape-compact-hidden text-[10px] font-bold tracking-[0.2em] text-slate-200 hud-text-shadow">
                  {RANK_SUBTITLES[hud.styleRank]}
                </div>
              </div>
              <div
                className="landscape-combo-rank font-display italic font-extrabold text-4xl sm:text-5xl leading-none hud-text-shadow"
                style={{ color: RANK_COLORS[hud.styleRank] }}
              >
                {hud.styleRank}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER-RIGHT DRAMATIC BOSS INTRO BANNER (0.88s) */}
      {hud.bossIntro && (
        <div className="fixed right-0 top-1/3 z-30 pointer-events-none">
          <div
            className="clip-slant-right px-6 sm:px-8 py-2.5 sm:py-4 bg-[#0b0e16]/95 border-y-2"
            style={{ borderColor: hud.bossIntro.accentColor }}
          >
            <div
              className="text-[10px] sm:text-xs font-bold tracking-[0.25em]"
              style={{ color: hud.bossIntro.accentColor }}
            >
              {hud.bossIntro.faction}
            </div>
            <div className="font-display italic font-extrabold text-2xl sm:text-5xl text-white tracking-wider">
              {hud.bossIntro.name}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-300 tracking-wider">
              {hud.bossIntro.title}
            </div>
          </div>
        </div>
      )}

      {/* AWAKENING PROMPT BANNER (When Fable shatters blade) */}
      {hud.awakenPrompt && (
        <div className="self-center px-4 py-1 bg-[#1a070b]/95 border border-red-500 text-center">
          <span className="font-display italic font-bold text-sm sm:text-xl tracking-wider text-red-200">
            BẤM [O] / TỈNH — KÍCH HOẠT {hud.characterSkills.awakenName}!
          </span>
        </div>
      )}

      {/* BOTTOM DESKTOP KEYBOARD SKILL BAR — hidden automatically when Touch Controls are visible */}
      {!showTouchControls && (
        <div className="flex items-end justify-center pb-0.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <SkillSlot
              keyLabel="J"
              name={hud.characterSkills.basicName}
              ready={true}
              active={hud.awakened}
              accent={hud.awakened ? '#ef4444' : hud.characterAccent}
              cooldownText=""
              icon={
                <path d="M5 19l4-1 10-10-3-3L6 15l-1 4zM14 6l4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              }
            />
            <SkillSlot
              keyLabel="K"
              name="PARRY"
              ready={hud.cooldowns.parry <= 0}
              active={false}
              accent="#38bdf8"
              cooldownText={hud.cooldowns.parry > 0 ? `${hud.cooldowns.parry}` : ''}
              icon={
                <path d="M12 3l7 4v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4z" strokeWidth="2" strokeLinejoin="round" />
              }
            />
            <SkillSlot
              keyLabel="U"
              name={
                hud.cooldowns.cryoActive
                  ? hud.characterSkills.specialActiveName
                  : hud.characterSkills.specialName
              }
              ready={hud.cooldowns.cryoActive || hud.cooldowns.cryo <= 0}
              active={hud.cooldowns.cryoActive}
              accent="#38bdf8"
              cooldownText={!hud.cooldowns.cryoActive && hud.cooldowns.cryo > 0 ? `${hud.cooldowns.cryo}` : ''}
              icon={
                <path d="M12 2l5 7-5 13-5-13 5-7zM7 9h10" strokeWidth="2" strokeLinejoin="round" />
              }
            />
            <SkillSlot
              keyLabel="I"
              name={hud.characterSkills.ultimateName}
              ready={hud.cooldowns.ultimateReady}
              active={hud.cooldowns.ultimateReady}
              accent="#ef4444"
              cooldownText={hud.cooldowns.ultimateReady ? '' : `${hud.rage}%`}
              icon={
                <path d="M4 18L20 6M9 5l6 14M6 9l12 6" strokeWidth="2" strokeLinecap="round" />
              }
            />
            <SkillSlot
              keyLabel="O"
              name={hud.characterSkills.awakenName}
              ready={hud.cooldowns.awakenReady || hud.awakened}
              active={hud.awakened || hud.cooldowns.awakenReady}
              accent="#f59e0b"
              cooldownText={
                hud.awakened
                  ? `${hud.cooldowns.awakenTimeLeft}s`
                  : hud.cooldowns.awakenReady
                    ? ''
                    : `${hud.awakening}%`
              }
              icon={
                <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" strokeWidth="2" strokeLinejoin="round" />
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface SkillSlotProps {
  keyLabel: string;
  name: string;
  ready: boolean;
  active: boolean;
  accent: string;
  cooldownText: string;
  icon: React.ReactNode;
}

const SkillSlot: React.FC<SkillSlotProps> = ({
  keyLabel,
  name,
  ready,
  active,
  accent,
  cooldownText,
  icon,
}) => {
  return (
    <div
      className="relative w-14 h-14 sm:w-16 sm:h-16 flex flex-col items-center justify-center bg-[#0d111a]/92 border transition-transform duration-150"
      style={{
        borderColor: active ? accent : ready ? 'rgba(148,163,184,0.45)' : 'rgba(51,65,85,0.55)',
        boxShadow: active ? `0 0 14px ${accent}77` : 'none',
        opacity: ready ? 1 : 0.62,
      }}
    >
      <span
        className="absolute top-0.5 left-1.5 font-mono-num text-[10px] font-bold"
        style={{ color: active ? accent : '#cbd5e1' }}
      >
        {keyLabel}
      </span>

      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 sm:w-6 sm:h-6 mt-1"
        fill="none"
        stroke={active ? accent : ready ? '#f8fafc' : '#64748b'}
      >
        {icon}
      </svg>

      <span className="text-[9px] font-bold tracking-wider text-slate-300 mt-0.5 truncate max-w-[92%]">
        {name}
      </span>

      {cooldownText && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#090b10]/72">
          <span className="font-mono-num text-xs font-bold text-white">{cooldownText}</span>
        </div>
      )}
    </div>
  );
};
