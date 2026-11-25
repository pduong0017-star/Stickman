import React, { useRef, useState } from 'react';
import type { ActionKey, HudSnapshot } from '../game/types';

interface TouchControlsProps {
  hud: HudSnapshot;
  onAction: (action: ActionKey, pressed: boolean) => void;
}

/**
 * Mobile Landscape Native Radial Thumb-Arc Controls:
 * - Bottom-left corner: Compact translucent continuous horizontal thumbstick + diagonal LƯỚT (Dash)
 * - Bottom-right corner: Ergonomic quarter-circle radial cluster anchored on the primary CHÉM button
 *   (supports both rapid tap & hold-to-combo!) surrounded by PARRY, [U] Skill, NHẢY,
 *   plus sleek upper [I] Kanji Ultimate & [O] Awakening badges.
 *   Designed to hug the corners tightly so the entire center arena remains 100% open.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({ hud, onAction }) => {
  const [slideDir, setSlideDir] = useState<-1 | 0 | 1>(0);
  const [attackHeld, setAttackHeld] = useState(false);
  const slidePointerId = useRef<number | null>(null);
  const slidePadRef = useRef<HTMLDivElement | null>(null);

  if (hud.cutsceneActive) return null;

  const updateSlideDirection = (clientX: number) => {
    const pad = slidePadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const rel = (clientX - rect.left) / Math.max(1, rect.width);
    const nextDir: -1 | 0 | 1 = rel < 0.43 ? -1 : rel > 0.57 ? 1 : 0;
    if (nextDir !== slideDir) {
      setSlideDir(nextDir);
      onAction('left', nextDir === -1);
      onAction('right', nextDir === 1);
    }
  };

  const releaseSlide = () => {
    slidePointerId.current = null;
    setSlideDir(0);
    onAction('left', false);
    onAction('right', false);
  };

  const bindTouchButton = (action: ActionKey, onHeldChange?: (held: boolean) => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if unsupported
      }
      onHeldChange?.(true);
      onAction(action, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onHeldChange?.(false);
      onAction(action, false);
    },
    onPointerCancel: () => {
      onHeldChange?.(false);
      onAction(action, false);
    },
  });

  const specialLabel = hud.cooldowns.cryoActive
    ? hud.characterSkills.specialActiveName
    : hud.characterSkills.specialName;
  const specialShort = specialLabel.length > 7 ? specialLabel.split(' ')[0] : specialLabel;
  const specialReady = hud.cooldowns.cryoActive || hud.cooldowns.cryo <= 0;
  const parryReady = hud.cooldowns.parry <= 0;
  const dashReady = hud.cooldowns.dash <= 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex items-end justify-between safe-inset-touch">
      {/* BOTTOM-LEFT THUMB ZONE: Translucent Slide Joystick + Diagonal LƯỚT (Dash) */}
      <div className="pointer-events-auto relative w-[184px] h-[98px] select-none touch-none">
        {/* Diagonal Dash Button tucked cleanly above-right of thumbstick */}
        <button
          type="button"
          aria-label="Lướt nhanh"
          {...bindTouchButton('dash')}
          className="absolute left-[126px] bottom-[34px] w-[48px] h-[48px] rounded-full flex flex-col items-center justify-center border font-display italic font-bold text-[11px] tracking-wider active:scale-90 transition-transform cursor-pointer"
          style={{
            backgroundColor: 'rgba(10, 14, 24, 0.56)',
            borderColor: dashReady ? `${hud.characterAccent}cc` : 'rgba(71, 85, 105, 0.45)',
            color: dashReady ? '#f8fafc' : '#94a3b8',
            opacity: dashReady ? 0.92 : 0.52,
          }}
        >
          <span>LƯỚT</span>
          {!dashReady && (
            <span className="font-mono-num text-[9px] text-white leading-none">
              {hud.cooldowns.dash}
            </span>
          )}
        </button>

        {/* Continuous Horizontal Slide Joystick Capsule */}
        <div
          ref={slidePadRef}
          role="group"
          aria-label="Cần trượt di chuyển trái phải"
          onPointerDown={(e) => {
            e.preventDefault();
            slidePointerId.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            updateSlideDirection(e.clientX);
          }}
          onPointerMove={(e) => {
            if (slidePointerId.current === e.pointerId) {
              e.preventDefault();
              updateSlideDirection(e.clientX);
            }
          }}
          onPointerUp={(e) => {
            if (slidePointerId.current === e.pointerId) {
              e.preventDefault();
              releaseSlide();
            }
          }}
          onPointerCancel={releaseSlide}
          className="absolute left-0 bottom-0 flex items-center justify-between w-[124px] h-[54px] rounded-full border overflow-hidden select-none touch-none"
          style={{
            backgroundColor: 'rgba(10, 14, 24, 0.52)',
            borderColor: slideDir !== 0 ? hud.characterAccent : 'rgba(148, 163, 184, 0.36)',
          }}
        >
          <div
            className="flex-1 h-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: slideDir === -1 ? `${hud.characterAccent}42` : 'transparent',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={slideDir === -1 ? '#ffffff' : '#cbd5e1'}>
              <path d="M15 5l-7 7 7 7V5z" />
            </svg>
          </div>

          <div
            className="w-7 h-7 rounded-full border transition-transform duration-75 shrink-0"
            style={{
              backgroundColor: slideDir !== 0 ? `${hud.characterAccent}aa` : 'rgba(148, 163, 184, 0.25)',
              borderColor: slideDir !== 0 ? '#ffffff' : 'rgba(203, 213, 225, 0.35)',
              transform: `translateX(${slideDir * 16}px)`,
            }}
          />

          <div
            className="flex-1 h-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: slideDir === 1 ? `${hud.characterAccent}42` : 'transparent',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={slideDir === 1 ? '#ffffff' : '#cbd5e1'}>
              <path d="M9 5l7 7-7 7V5z" />
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT THUMB ZONE: Ergonomic Quarter-Circle Radial Combat Arc */}
      <div className="pointer-events-auto relative w-[184px] h-[138px] select-none touch-none">
        {/* Outer Arc Lower: Ultimate [I] (Kanji) */}
        <button
          type="button"
          aria-label={`Tuyệt kỹ ${hud.characterSkills.ultimateFullName}`}
          {...bindTouchButton('ultimate')}
          className="absolute right-[124px] bottom-[38px] w-[44px] h-[44px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer"
          style={{
            backgroundColor: hud.cooldowns.ultimateReady
              ? 'rgba(185, 28, 28, 0.9)'
              : 'rgba(14, 10, 16, 0.56)',
            borderColor: hud.cooldowns.ultimateReady ? '#fca5a5' : 'rgba(148, 163, 184, 0.38)',
            boxShadow: hud.cooldowns.ultimateReady ? '0 0 14px rgba(239, 68, 68, 0.72)' : 'none',
            opacity: hud.cooldowns.ultimateReady ? 1 : 0.62,
          }}
        >
          <span
            className="text-base font-black leading-none text-white"
            style={{ fontFamily: 'var(--font-kanji)' }}
          >
            {hud.characterSkills.ultimateKanji}
          </span>
          <span className="font-mono-num text-[8px] font-bold text-red-100 mt-0.5 leading-none">
            {hud.cooldowns.ultimateReady ? 'NỘ!' : `${hud.rage}%`}
          </span>
        </button>

        {/* Outer Arc Upper: Awakening [O] */}
        <button
          type="button"
          aria-label={`Thức tỉnh ${hud.characterSkills.awakenName}`}
          {...bindTouchButton('awaken')}
          className="absolute right-[122px] bottom-[90px] w-[44px] h-[44px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer"
          style={{
            backgroundColor:
              hud.awakened || hud.cooldowns.awakenReady
                ? 'rgba(180, 83, 9, 0.9)'
                : 'rgba(18, 14, 10, 0.56)',
            borderColor:
              hud.awakened || hud.cooldowns.awakenReady ? '#fde68a' : 'rgba(148, 163, 184, 0.38)',
            boxShadow:
              hud.awakened || hud.cooldowns.awakenReady
                ? '0 0 14px rgba(245, 158, 11, 0.65)'
                : 'none',
            opacity: hud.awakened || hud.cooldowns.awakenReady ? 1 : 0.62,
          }}
        >
          <span className="font-display italic font-extrabold text-[10px] leading-none text-amber-100">
            TỈNH
          </span>
          <span className="font-mono-num text-[8px] font-bold text-amber-200 mt-0.5 leading-none">
            {hud.awakened
              ? `${hud.cooldowns.awakenTimeLeft}s`
              : hud.cooldowns.awakenReady
                ? 'SẴN'
                : `${hud.awakening}%`}
          </span>
        </button>

        {/* Inner Arc Left: PARRY [K] */}
        <button
          type="button"
          aria-label="Parry phản đòn"
          {...bindTouchButton('parry')}
          className="absolute right-[74px] bottom-[2px] w-[46px] h-[46px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer"
          style={{
            backgroundColor: 'rgba(10, 20, 32, 0.6)',
            borderColor: parryReady ? '#38bdf8cc' : 'rgba(71, 85, 105, 0.48)',
            color: parryReady ? '#bae6fd' : '#94a3b8',
            opacity: parryReady ? 0.94 : 0.54,
          }}
        >
          <span className="font-display italic font-bold text-[11px] tracking-wide leading-none">
            PARRY
          </span>
          {!parryReady && (
            <span className="font-mono-num text-[9px] font-bold text-white leading-none mt-0.5">
              {hud.cooldowns.parry}
            </span>
          )}
        </button>

        {/* Inner Arc Upper-Left: Character Signature Skill [U] */}
        <button
          type="button"
          aria-label={`Chiêu thức ${specialLabel}`}
          {...bindTouchButton('cryo')}
          className="absolute right-[68px] bottom-[56px] w-[46px] h-[46px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer"
          style={{
            backgroundColor: hud.cooldowns.cryoActive
              ? 'rgba(14, 116, 144, 0.86)'
              : 'rgba(10, 18, 30, 0.6)',
            borderColor: specialReady ? `${hud.characterAccent}dd` : 'rgba(71, 85, 105, 0.48)',
            color: specialReady ? '#e0f2fe' : '#94a3b8',
            opacity: specialReady ? 0.95 : 0.54,
          }}
        >
          <span className="font-display italic font-bold text-[10px] leading-tight text-center px-1 truncate max-w-full">
            {specialShort}
          </span>
          {!specialReady && (
            <span className="font-mono-num text-[9px] font-bold text-white leading-none">
              {hud.cooldowns.cryo}
            </span>
          )}
        </button>

        {/* Inner Arc Top: NHẢY [W] (above CHÉM) */}
        <button
          type="button"
          aria-label="Nhảy"
          {...bindTouchButton('jump')}
          className="absolute right-[6px] bottom-[72px] w-[46px] h-[46px] rounded-full flex flex-col items-center justify-center border text-white active:scale-90 transition-transform cursor-pointer"
          style={{
            backgroundColor: 'rgba(14, 20, 34, 0.62)',
            borderColor: 'rgba(203, 213, 225, 0.65)',
          }}
        >
          <span className="font-display italic font-bold text-[11px] tracking-wide">NHẢY</span>
        </button>

        {/* Primary Giant Anchor Button: CHÉM [J] (glows gold for Skill-Link Art follow-up!) */}
        <button
          type="button"
          aria-label={`Tấn công ${hud.cooldowns.skillLinkActive ? hud.cooldowns.skillLinkLabel : hud.characterSkills.basicName}`}
          {...bindTouchButton('attack', setAttackHeld)}
          className="absolute right-0 bottom-0 w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center border-2 text-white transition-transform cursor-pointer"
          style={{
            backgroundColor: hud.cooldowns.skillLinkActive
              ? 'rgba(202, 138, 4, 0.94)'
              : hud.awakened
                ? 'rgba(220, 38, 38, 0.86)'
                : `${hud.characterAccent}d9`,
            borderColor: hud.cooldowns.skillLinkActive ? '#fef08a' : '#ffffff',
            boxShadow: hud.cooldowns.skillLinkActive
              ? '0 0 24px rgba(250, 204, 21, 0.95)'
              : `0 0 18px ${hud.awakened ? '#ef4444' : hud.characterAccent}88`,
            transform: attackHeld ? 'scale(0.92)' : hud.cooldowns.skillLinkActive ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          <span className="font-display italic font-extrabold text-[15px] leading-none tracking-wider">
            {hud.cooldowns.skillLinkActive ? hud.cooldowns.skillLinkLabel : 'CHÉM'}
          </span>
          <span className="text-[7.5px] font-bold opacity-95 mt-0.5 tracking-wider">
            {hud.cooldowns.skillLinkActive ? 'LIÊN CHIÊU!' : 'GIỮ COMBO'}
          </span>
        </button>
      </div>
    </div>
  );
};
