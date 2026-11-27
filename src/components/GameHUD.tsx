import React from 'react';
import type { AudioSettings, BlessingId, HudSnapshot, StyleRank } from '../game/types';

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
  onSelectBlessing: (id: BlessingId) => void;
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
  onSelectBlessing,
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

  if (hud.mode === 'solo1v1' && hud.solo1v1) {
    const s = hud.solo1v1;
    const botHpPct = Math.max(0, Math.min(100, (s.botHp / Math.max(1, s.botMaxHp)) * 100));
    const botTrailPct = Math.max(botHpPct, Math.min(100, (s.botTrailHp / Math.max(1, s.botMaxHp)) * 100));
    const botRagePct = Math.max(0, Math.min(100, (s.botEnergy / Math.max(1, s.botMaxEnergy)) * 100));
    const roundDots = Array.from({ length: s.winsNeeded }, (_, idx) => idx);

    return (
      <div className="landscape-hud-top fixed inset-0 z-10 pointer-events-none flex flex-col justify-between safe-inset-hud sm:p-4">
        {/* TOP SYMMETRIC 1V1 FIGHTING BAR */}
        <div className="flex items-start justify-between gap-2 sm:gap-4 w-full max-w-5xl mx-auto">
          {/* LEFT: PLAYER */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 hud-text-shadow">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-display italic font-black text-sm sm:text-lg tracking-wider truncate"
                  style={{ color: hud.characterAccent }}
                >
                  {hud.characterName}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">P1</span>
              </div>
              <div className="flex items-center gap-1">
                {roundDots.map((idx) => (
                  <span
                    key={`p1-dot-${idx}`}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border"
                    style={{
                      borderColor: hud.characterAccent,
                      backgroundColor: idx < s.playerWins ? hud.characterAccent : 'rgba(15,23,42,0.8)',
                      boxShadow: idx < s.playerWins ? `0 0 8px ${hud.characterAccent}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Player HP Bar */}
            <div className="relative h-3 sm:h-4 w-full bg-[#0e121c] border border-slate-600/90 clip-slant-left overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-amber-400/80 transition-none"
                style={{ width: `${trailPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hpPct <= 30 ? '#ef4444' : hud.characterAccent,
                }}
              />
            </div>
            {/* Player Rage Bar */}
            <div className="flex items-center gap-1.5">
              <div className="relative h-1.5 sm:h-2 flex-1 bg-[#0e121c] border border-slate-700/90 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-amber-400"
                  style={{ width: `${ragePct}%` }}
                />
              </div>
              <span className="font-mono-num text-[9px] sm:text-[10px] text-amber-300 hud-text-shadow">
                NỘ {hud.rage}%
              </span>
            </div>
          </div>

          {/* CENTER: ROUND TIMER */}
          <div className="shrink-0 flex flex-col items-center px-2 sm:px-3 py-1 bg-[#0c101a]/90 border border-slate-700/80">
            <span className="text-[8px] sm:text-[10px] font-bold tracking-widest text-slate-400 leading-none">
              ROUND {s.roundNumber}
            </span>
            <span
              className="font-mono-num font-black text-xl sm:text-3xl leading-tight"
              style={{ color: s.roundTimer <= 15 ? '#ef4444' : '#f8fafc' }}
            >
              {String(s.roundTimer).padStart(2, '0')}
            </span>
          </div>

          {/* RIGHT: BOT OPPONENT (SYMMETRIC) */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 hud-text-shadow">
              <div className="flex items-center gap-1">
                {roundDots.map((idx) => (
                  <span
                    key={`bot-dot-${idx}`}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border"
                    style={{
                      borderColor: s.opponentAccent,
                      backgroundColor: idx < s.botWins ? s.opponentAccent : 'rgba(15,23,42,0.8)',
                      boxShadow: idx < s.botWins ? `0 0 8px ${s.opponentAccent}` : 'none',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[8px] sm:text-[10px] font-bold px-1 py-0.5 bg-slate-800/90 text-slate-300 border border-slate-700">
                  {s.botArchetype}
                </span>
                <span
                  className="font-display italic font-black text-sm sm:text-lg tracking-wider truncate"
                  style={{ color: s.opponentAccent }}
                >
                  {s.opponentName}
                </span>
              </div>
            </div>
            {/* Bot HP Bar (fills right-to-left) */}
            <div className="relative h-3 sm:h-4 w-full bg-[#0e121c] border border-slate-600/90 clip-slant-right overflow-hidden">
              <div
                className="absolute inset-y-0 right-0 bg-amber-400/80 transition-none"
                style={{ width: `${botTrailPct}%` }}
              />
              <div
                className="absolute inset-y-0 right-0"
                style={{
                  width: `${botHpPct}%`,
                  backgroundColor: botHpPct <= 30 ? '#ef4444' : s.opponentAccent,
                }}
              />
            </div>
            {/* Bot Rage / Energy Bar */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono-num text-[9px] sm:text-[10px] text-sky-300 hud-text-shadow">
                {s.botEnergy}% NỘ
              </span>
              <div className="relative h-1.5 sm:h-2 flex-1 bg-[#0e121c] border border-slate-700/90 overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-sky-500 to-indigo-400"
                  style={{ width: `${botRagePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Utility Pause Button */}
          <button
            type="button"
            onClick={onTogglePause}
            aria-label="Tạm dừng"
            className="pointer-events-auto shrink-0 px-2 py-1.5 bg-[#0e121c]/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
          >
            ⏸
          </button>
        </div>

        {/* CENTER ANNOUNCEMENT: ROUND X / FIGHT! / K.O. */}
        {s.bannerText && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="font-display italic font-black text-4xl sm:text-7xl tracking-widest uppercase px-6 py-2 hud-text-shadow"
              style={{
                color:
                  s.bannerText === 'K.O.' || s.bannerText === 'FIGHT!'
                    ? '#facc15'
                    : '#f8fafc',
                textShadow: '0 0 28px rgba(239,68,68,0.75), 0 4px 12px rgba(0,0,0,0.9)',
              }}
            >
              {s.bannerText}
            </div>
          </div>
        )}

        {/* Bottom spacer for clean layout */}
        <div className="h-4" />
      </div>
    );
  }

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

          {/* Active Roguelite Blessing Seals */}
          {hud.activeBlessings.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 pt-0.5">
              {hud.activeBlessings.map((b) => (
                <span
                  key={b.id}
                  title={`${b.name} (x${b.stacks})`}
                  className="px-1.5 py-0.5 bg-[#0c101b]/90 border text-[9px] sm:text-[10px] font-bold leading-none flex items-center gap-0.5"
                  style={{ borderColor: b.color, color: '#f8fafc' }}
                >
                  <span style={{ color: b.color }}>{b.badge}</span>
                  {b.stacks > 1 && <span className="font-mono-num text-slate-300">x{b.stacks}</span>}
                </span>
              ))}
            </div>
          )}

          {/* Domain Expansion Banner & Timer Badge (Ma Kính Hư Không / Tháp Đồng Hồ Cổ Đại / Xuân Phong Văn Miếu) */}
          {hud.domainActive && (
            <div
              data-testid="hud-domain-badge"
              className={
                hud.domainKind === 'chrono'
                  ? 'clip-chamfer px-2 py-1 bg-[#0c0a04]/95 border flex items-center justify-between gap-2 text-[9px] sm:text-[11px] font-display italic font-extrabold tracking-wider leading-none'
                  : hud.domainKind === 'xuan_feng'
                    ? 'clip-chamfer px-2 py-1 bg-[#071112]/95 border flex items-center justify-between gap-2 text-[9px] sm:text-[11px] font-display italic font-extrabold tracking-wider leading-none'
                    : 'clip-chamfer px-2 py-1 bg-[#0a0414]/95 border flex items-center justify-between gap-2 text-[9px] sm:text-[11px] font-display italic font-extrabold tracking-wider leading-none'
              }
              style={{
                borderColor:
                  hud.domainKind === 'chrono'
                    ? '#f59e0b'
                    : hud.domainKind === 'xuan_feng'
                      ? '#5eead4'
                      : '#f43f5e',
                boxShadow:
                  hud.domainKind === 'chrono'
                    ? '0 0 12px rgba(245, 158, 11, 0.42), inset 0 0 8px rgba(45, 212, 191, 0.22)'
                    : hud.domainKind === 'xuan_feng'
                      ? '0 0 12px rgba(94, 234, 212, 0.42), inset 0 0 8px rgba(253, 230, 138, 0.18)'
                      : '0 0 12px rgba(244, 63, 94, 0.42), inset 0 0 8px rgba(56, 189, 248, 0.2)',
              }}
            >
              <span
                className={
                  hud.domainKind === 'chrono'
                    ? 'text-amber-300 truncate'
                    : hud.domainKind === 'xuan_feng'
                      ? 'text-[#f0fdfa] truncate'
                      : 'text-rose-300 truncate'
                }
              >
                {hud.domainKind === 'chrono' ? (
                  'LÃNH ĐỊA: THÁP ĐỒNG HỒ CỔ ĐẠI'
                ) : hud.domainKind === 'xuan_feng' ? (
                  <>
                    LÃNH ĐỊA: <span className="text-[#5eead4]">XUÂN PHONG VĂN MIẾU</span>
                  </>
                ) : (
                  'LÃNH ĐỊA: MA KÍNH HƯ KHÔNG'
                )}
              </span>
              {typeof hud.domainTimeLeft === 'number' && hud.domainTimeLeft > 0 && (
                <span
                  className={
                    hud.domainKind === 'chrono'
                      ? 'font-mono-num text-teal-300 shrink-0'
                      : hud.domainKind === 'xuan_feng'
                        ? 'font-mono-num text-[#fde68a] shrink-0'
                        : 'font-mono-num text-sky-300 shrink-0'
                  }
                >
                  {hud.domainTimeLeft.toFixed(1)}s
                </span>
              )}
            </div>
          )}

          {/* Global Time Stop Active Badge */}
          {hud.timeStopActive && (
            <div
              data-testid="hud-timestop-badge"
              className="clip-chamfer px-2 py-1 bg-[#031314]/95 border flex items-center justify-between gap-2 text-[9px] sm:text-[11px] font-display italic font-extrabold tracking-wider leading-none"
              style={{
                borderColor: '#2dd4bf',
                boxShadow:
                  '0 0 12px rgba(45, 212, 191, 0.42), inset 0 0 8px rgba(245, 158, 11, 0.22)',
              }}
            >
              <span className="text-teal-300 truncate">
                NGƯNG ĐỌNG THỜI GIAN
              </span>
              {typeof hud.timeStopTimeLeft === 'number' && hud.timeStopTimeLeft > 0 && (
                <span className="font-mono-num text-amber-300 shrink-0">
                  {hud.timeStopTimeLeft.toFixed(1)}s
                </span>
              )}
            </div>
          )}

          {/* Arena Soul Crystal Buff & Sub-Wave Bounty Objective */}
          {(hud.arenaBuffText || hud.waveBountyText) && (
            <div className="flex flex-col gap-0.5 pt-0.5">
              {hud.arenaBuffText && (
                <div className="px-1.5 py-0.5 bg-[#0d1424]/92 border border-sky-400/70 text-[9px] sm:text-[10px] font-bold tracking-wide text-sky-200 leading-tight truncate">
                  {hud.arenaBuffText}
                </div>
              )}
              {hud.waveBountyText && (
                <div
                  className="px-1.5 py-0.5 bg-[#121622]/92 border text-[9px] sm:text-[10px] font-bold tracking-wide leading-tight truncate"
                  style={{
                    borderColor: hud.waveBountyDone ? '#34d399' : '#facc15',
                    color: hud.waveBountyDone ? '#6ee7b7' : '#fef08a',
                  }}
                >
                  {hud.waveBountyText}
                </div>
              )}
            </div>
          )}

          {/* Quiet Wave & Tactical Hint Line (desktop only) */}
          <div className="landscape-compact-hidden text-[11px] text-slate-300/90 hud-text-shadow leading-snug">
            <span className="font-mono-num text-slate-400 mr-2">{hud.waveProgressText}</span>
            <span className="hidden md:inline text-slate-300">· {hud.actHint}</span>
          </div>
        </div>

        {/* TOP-CENTER: Boss HP Bar + Posture Gauge + Phase II */}
        {hud.boss ? (
          <div className="landscape-hud-boss flex-1 max-w-[260px] sm:max-w-[350px] flex flex-col gap-0.5 items-center pt-0.5">
            <div className="flex items-baseline justify-between w-full hud-text-shadow px-0.5">
              <span
                className="text-[9px] sm:text-[11px] font-bold tracking-widest truncate"
                style={{ color: hud.boss.accentColor }}
              >
                {hud.boss.faction}
                {hud.boss.phase === 2 ? ' · PHASE II' : ''}
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
            <div className="relative h-1 sm:h-1.5 w-[92%] bg-[#090d16] border border-slate-800 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-75"
                style={{
                  width: `${hud.boss.staggered ? 100 : Math.min(100, (hud.boss.posture / hud.boss.maxPosture) * 100)}%`,
                  backgroundColor: hud.boss.staggered ? '#ef4444' : '#facc15',
                }}
              />
            </div>
            <div className="landscape-compact-hidden text-[10px] font-mono-num text-slate-300 hud-text-shadow">
              {hud.boss.staggered
                ? '⚡ PHÁ GIÁP · SÁT THƯƠNG x1.32!'
                : `${hud.boss.title} · ${hud.boss.hp}/${hud.boss.maxHp}`}
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

      {/* 3-CARD ROGUELITE STAGE BLESSING DRAFT OVERLAY */}
      {hud.blessingChoices && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto flex items-center justify-center p-3 sm:p-6"
          style={{ backgroundColor: 'rgba(6, 8, 15, 0.84)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Chọn Ấn Chú cường hoá qua màn"
        >
          <div className="w-full max-w-3xl flex flex-col items-center gap-3 sm:gap-5">
            <div className="text-center">
              <div className="text-[10px] sm:text-xs font-bold tracking-[0.26em] text-amber-300">
                VƯỢT ẢI THÀNH CÔNG · CƯỜNG HOÁ CHIẾN BINH
              </div>
              <h2 className="font-display italic font-extrabold text-2xl sm:text-4xl text-white tracking-wider mt-0.5">
                CHỌN 1 ẤN CHÚ SỨC MẠNH
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
              {hud.blessingChoices.map((card, idx) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectBlessing(card.id)}
                  className="clip-chamfer group relative bg-[#0f1422]/96 hover:bg-[#172036] border-2 p-2.5 sm:p-4 text-left flex flex-col justify-between gap-2 transition-transform duration-150 hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
                  style={{
                    borderColor: card.color,
                    boxShadow: `0 0 22px ${card.color}33`,
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center border font-black text-base sm:text-xl"
                        style={{
                          borderColor: card.color,
                          color: card.color,
                          backgroundColor: 'rgba(9, 11, 16, 0.9)',
                          fontFamily: 'var(--font-kanji)',
                        }}
                      >
                        {card.badge}
                      </span>
                      <span className="font-mono-num text-[10px] sm:text-xs font-bold px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300">
                        [{idx + 1}] CẤP {card.stacks}
                      </span>
                    </div>
                    <div>
                      <div
                        className="font-display italic font-extrabold text-sm sm:text-xl leading-tight tracking-wide text-white"
                      >
                        {card.name}
                      </div>
                      <div
                        className="text-[9px] sm:text-[11px] font-bold tracking-wider uppercase"
                        style={{ color: card.color }}
                      >
                        {card.subtitle}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-300 leading-snug">
                      {card.desc}
                    </p>
                  </div>

                  <div
                    className="text-[10px] sm:text-xs font-display italic font-bold tracking-wider pt-1 border-t border-slate-800"
                    style={{ color: card.color }}
                  >
                    KHẮC ẤN →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AWAKENING PROMPT BANNER (When Fable shatters blade) */}
      {hud.awakenPrompt && !hud.blessingChoices && (
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
              name={
                hud.cooldowns.skillLinkActive
                  ? hud.cooldowns.skillLinkLabel
                  : hud.characterSkills.basicName
              }
              ready={true}
              active={hud.cooldowns.skillLinkActive || hud.awakened}
              accent={
                hud.cooldowns.skillLinkActive
                  ? '#facc15'
                  : hud.awakened
                    ? '#ef4444'
                    : hud.characterAccent
              }
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
