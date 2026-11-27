import React, { useEffect, useRef, useState } from 'react';
import type { ActionKey, HudSnapshot } from '../game/types';
import {
  TOUCH_BUTTON_LABELS,
  TOUCH_PRESETS,
  applyTouchPreset,
  clampTouchValue,
  createDefaultTouchConfig,
  loadTouchConfig,
  saveTouchConfig,
  type MoveStyle,
  type TouchButtonId,
  type TouchConfig,
  type TouchPresetId,
} from './touchConfig';

interface TouchControlsProps {
  hud: HudSnapshot;
  onAction: (action: ActionKey, pressed: boolean) => void;
  editing?: boolean;
  onCloseEditor?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  hud,
  onAction,
  editing = false,
  onCloseEditor,
}) => {
  const [config, setConfig] = useState<TouchConfig>(() => loadTouchConfig());
  const [draftConfig, setDraftConfig] = useState<TouchConfig>(config);
  const [selectedId, setSelectedId] = useState<TouchButtonId>('attack');

  // Movement states
  const [slideDir, setSlideDir] = useState<-1 | 0 | 1>(0);
  const slideDirRef = useRef<-1 | 0 | 1>(0);
  const movePointerId = useRef<number | null>(null);
  const movePadRef = useRef<HTMLDivElement | null>(null);

  // Joystick visual state
  const [joyCenter, setJoyCenter] = useState<{ x: number; y: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Attack held visual
  const [attackHeld, setAttackHeld] = useState(false);

  // Dragging state in editor
  const dragRef = useRef<{
    id: TouchButtonId;
    pointerId: number;
  } | null>(null);

  // Sync draft when entering edit mode
  useEffect(() => {
    if (editing) {
      setDraftConfig(config);
      // Release any held movement when entering editor
      if (slideDirRef.current !== 0) {
        slideDirRef.current = 0;
        setSlideDir(0);
        onAction('left', false);
        onAction('right', false);
      }
    }
  }, [editing, config, onAction]);

  if (!editing && hud.cutsceneActive) return null;

  const activeConfig = editing ? draftConfig : config;

  const setMoveDirection = (nextDir: -1 | 0 | 1) => {
    if (nextDir !== slideDirRef.current) {
      slideDirRef.current = nextDir;
      setSlideDir(nextDir);
      onAction('left', nextDir === -1);
      onAction('right', nextDir === 1);
    }
  };

  const releaseMove = () => {
    movePointerId.current = null;
    joyOriginRef.current = null;
    setJoyCenter(null);
    setJoyKnob({ x: 0, y: 0 });
    setMoveDirection(0);
  };

  const updateHorizontalPad = (clientX: number) => {
    const pad = movePadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const rel = (clientX - rect.left) / Math.max(1, rect.width);
    const nextDir: -1 | 0 | 1 = rel < 0.44 ? -1 : rel > 0.56 ? 1 : 0;
    setMoveDirection(nextDir);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const origin = joyOriginRef.current;
    if (!origin) return;
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const maxRadius = 42 * activeConfig.globalScale * activeConfig.buttons.move.scale;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    setJoyKnob({
      x: Math.cos(angle) * clampedDist,
      y: Math.sin(angle) * clampedDist,
    });
    const deadzone = 10;
    if (Math.abs(dx) < deadzone) {
      setMoveDirection(0);
    } else {
      setMoveDirection(dx < 0 ? -1 : 1);
    }
  };

  const bindTouchButton = (action: ActionKey, onHeldChange?: (held: boolean) => void) => {
    if (editing) return {};
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
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
        e.stopPropagation();
        onHeldChange?.(false);
        onAction(action, false);
      },
      onPointerCancel: () => {
        onHeldChange?.(false);
        onAction(action, false);
      },
    };
  };

  const startEditorDrag = (id: TouchButtonId) => (e: React.PointerEvent) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    dragRef.current = { id, pointerId: e.pointerId };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const moveEditorDrag = (e: React.PointerEvent) => {
    if (!editing || !dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const nextX = clampTouchValue((e.clientX / vw) * 100, 4, 96);
    const nextY = clampTouchValue((e.clientY / vh) * 100, 8, 94);
    const targetId = dragRef.current.id;
    setDraftConfig((prev) => ({
      ...prev,
      buttons: {
        ...prev.buttons,
        [targetId]: {
          ...prev.buttons[targetId],
          x: Math.round(nextX * 10) / 10,
          y: Math.round(nextY * 10) / 10,
        },
      },
    }));
  };

  const endEditorDrag = (e: React.PointerEvent) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  const getButtonStyle = (id: TouchButtonId, extraOpacity = 1): React.CSSProperties => {
    const btn = activeConfig.buttons[id];
    const totalScale = activeConfig.globalScale * btn.scale;
    return {
      left: `${btn.x}%`,
      top: `${btn.y}%`,
      transform: `translate(-50%, -50%) scale(${totalScale})`,
      opacity: editing ? 0.96 : clampTouchValue(activeConfig.opacity * extraOpacity, 0.2, 1),
    };
  };

  const editorRingClass = (id: TouchButtonId) =>
    editing
      ? selectedId === id
        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black/70 cursor-grab active:cursor-grabbing'
        : 'ring-1 ring-white/40 cursor-grab active:cursor-grabbing'
      : '';

  const specialLabel = hud.cooldowns.cryoActive
    ? hud.characterSkills.specialActiveName
    : hud.characterSkills.specialName;
  const specialShort = specialLabel.length > 7 ? specialLabel.split(' ')[0] : specialLabel;
  const specialReady = hud.cooldowns.cryoActive || hud.cooldowns.cryo <= 0;
  const parryReady = hud.cooldowns.parry <= 0;
  const dashReady = hud.cooldowns.dash <= 0;

  const selectedLayout = draftConfig.buttons[selectedId];

  return (
    <div
      className={`fixed inset-0 z-40 select-none touch-none ${
        editing ? 'pointer-events-auto bg-black/55' : 'pointer-events-none'
      }`}
      style={
        editing
          ? {
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }
          : undefined
      }
      onPointerMove={moveEditorDrag}
      onPointerUp={endEditorDrag}
      onPointerCancel={endEditorDrag}
    >
      {/* FLOATING JOYSTICK TOUCH ZONE (Left half of screen when enabled & not editing) */}
      {!editing &&
        activeConfig.moveStyle === 'joystick' &&
        activeConfig.floatingJoystick && (
          <div
            className="fixed left-0 top-0 bottom-0 w-1/2 pointer-events-auto touch-none"
            onPointerDown={(e) => {
              if (movePointerId.current !== null) return;
              e.preventDefault();
              movePointerId.current = e.pointerId;
              joyOriginRef.current = { x: e.clientX, y: e.clientY };
              setJoyCenter({ x: e.clientX, y: e.clientY });
              setJoyKnob({ x: 0, y: 0 });
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
            }}
            onPointerMove={(e) => {
              if (movePointerId.current === e.pointerId) {
                e.preventDefault();
                updateJoystick(e.clientX, e.clientY);
              }
            }}
            onPointerUp={(e) => {
              if (movePointerId.current === e.pointerId) {
                e.preventDefault();
                releaseMove();
              }
            }}
            onPointerCancel={releaseMove}
          />
        )}

      {/* MOVEMENT CONTROL */}
      {activeConfig.moveStyle === 'buttons' && (
        <div
          ref={movePadRef}
          role="group"
          aria-label="Nút di chuyển trái phải"
          onPointerDown={
            editing
              ? startEditorDrag('move')
              : (e) => {
                  e.preventDefault();
                  movePointerId.current = e.pointerId;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                  updateHorizontalPad(e.clientX);
                }
          }
          onPointerMove={
            editing
              ? undefined
              : (e) => {
                  if (movePointerId.current === e.pointerId) {
                    e.preventDefault();
                    updateHorizontalPad(e.clientX);
                  }
                }
          }
          onPointerUp={
            editing
              ? undefined
              : (e) => {
                  if (movePointerId.current === e.pointerId) {
                    e.preventDefault();
                    releaseMove();
                  }
                }
          }
          onPointerCancel={editing ? undefined : releaseMove}
          className={`fixed pointer-events-auto flex items-center gap-2.5 p-2 -m-2 touch-none ${editorRingClass('move')}`}
          style={getButtonStyle('move')}
        >
          <div
            className="w-[60px] h-[56px] rounded-xl border-2 flex items-center justify-center transition-colors"
            style={{
              backgroundColor:
                slideDir === -1 ? `${hud.characterAccent}66` : 'rgba(10, 14, 24, 0.62)',
              borderColor: slideDir === -1 ? '#ffffff' : 'rgba(148, 163, 184, 0.45)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill={slideDir === -1 ? '#ffffff' : '#cbd5e1'}>
              <path d="M15.5 5l-7 7 7 7V5z" />
            </svg>
          </div>
          <div
            className="w-[60px] h-[56px] rounded-xl border-2 flex items-center justify-center transition-colors"
            style={{
              backgroundColor:
                slideDir === 1 ? `${hud.characterAccent}66` : 'rgba(10, 14, 24, 0.62)',
              borderColor: slideDir === 1 ? '#ffffff' : 'rgba(148, 163, 184, 0.45)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill={slideDir === 1 ? '#ffffff' : '#cbd5e1'}>
              <path d="M8.5 5l7 7-7 7V5z" />
            </svg>
          </div>
        </div>
      )}

      {activeConfig.moveStyle === 'slider' && (
        <div
          ref={movePadRef}
          role="group"
          aria-label="Thanh trượt di chuyển trái phải"
          onPointerDown={
            editing
              ? startEditorDrag('move')
              : (e) => {
                  e.preventDefault();
                  movePointerId.current = e.pointerId;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                  updateHorizontalPad(e.clientX);
                }
          }
          onPointerMove={
            editing
              ? undefined
              : (e) => {
                  if (movePointerId.current === e.pointerId) {
                    e.preventDefault();
                    updateHorizontalPad(e.clientX);
                  }
                }
          }
          onPointerUp={
            editing
              ? undefined
              : (e) => {
                  if (movePointerId.current === e.pointerId) {
                    e.preventDefault();
                    releaseMove();
                  }
                }
          }
          onPointerCancel={editing ? undefined : releaseMove}
          className={`fixed pointer-events-auto flex items-center justify-between w-[144px] h-[60px] rounded-full border-2 overflow-hidden touch-none ${editorRingClass('move')}`}
          style={{
            ...getButtonStyle('move'),
            backgroundColor: 'rgba(10, 14, 24, 0.58)',
            borderColor: slideDir !== 0 ? hud.characterAccent : 'rgba(148, 163, 184, 0.42)',
          }}
        >
          <div
            className="flex-1 h-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: slideDir === -1 ? `${hud.characterAccent}48` : 'transparent',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={slideDir === -1 ? '#ffffff' : '#cbd5e1'}>
              <path d="M15 5l-7 7 7 7V5z" />
            </svg>
          </div>
          <div
            className="w-8 h-8 rounded-full border transition-transform duration-75 shrink-0"
            style={{
              backgroundColor: slideDir !== 0 ? `${hud.characterAccent}bb` : 'rgba(148, 163, 184, 0.28)',
              borderColor: slideDir !== 0 ? '#ffffff' : 'rgba(203, 213, 225, 0.4)',
              transform: `translateX(${slideDir * 18}px)`,
            }}
          />
          <div
            className="flex-1 h-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: slideDir === 1 ? `${hud.characterAccent}48` : 'transparent',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={slideDir === 1 ? '#ffffff' : '#cbd5e1'}>
              <path d="M9 5l7 7-7 7V5z" />
            </svg>
          </div>
        </div>
      )}

      {activeConfig.moveStyle === 'joystick' && (
        <div
          role="group"
          aria-label="Cần Joystick di chuyển"
          onPointerDown={
            editing
              ? startEditorDrag('move')
              : !activeConfig.floatingJoystick
                ? (e) => {
                    e.preventDefault();
                    movePointerId.current = e.pointerId;
                    const rect = e.currentTarget.getBoundingClientRect();
                    joyOriginRef.current = {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                    };
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                    updateJoystick(e.clientX, e.clientY);
                  }
                : undefined
          }
          onPointerMove={
            !editing && !activeConfig.floatingJoystick
              ? (e) => {
                  if (movePointerId.current === e.pointerId) {
                    e.preventDefault();
                    updateJoystick(e.clientX, e.clientY);
                  }
                }
              : undefined
          }
          onPointerUp={
            !editing && !activeConfig.floatingJoystick
              ? (e) => {
                  if (movePointerId.current === e.pointerId) {
                    e.preventDefault();
                    releaseMove();
                  }
                }
              : undefined
          }
          onPointerCancel={!editing && !activeConfig.floatingJoystick ? releaseMove : undefined}
          className={`fixed pointer-events-auto w-[108px] h-[108px] rounded-full border-2 flex items-center justify-center touch-none ${editorRingClass('move')}`}
          style={
            joyCenter && !editing
              ? {
                  left: `${joyCenter.x}px`,
                  top: `${joyCenter.y}px`,
                  transform: `translate(-50%, -50%) scale(${activeConfig.globalScale * activeConfig.buttons.move.scale})`,
                  opacity: activeConfig.opacity,
                  backgroundColor: 'rgba(10, 14, 24, 0.45)',
                  borderColor: slideDir !== 0 ? hud.characterAccent : 'rgba(148, 163, 184, 0.4)',
                }
              : {
                  ...getButtonStyle('move', activeConfig.floatingJoystick && !editing ? 0.5 : 1),
                  backgroundColor: 'rgba(10, 14, 24, 0.45)',
                  borderColor: slideDir !== 0 ? hud.characterAccent : 'rgba(148, 163, 184, 0.4)',
                }
          }
        >
          <div
            className="w-[44px] h-[44px] rounded-full border-2 transition-transform duration-75"
            style={{
              backgroundColor: slideDir !== 0 ? `${hud.characterAccent}cc` : 'rgba(148, 163, 184, 0.35)',
              borderColor: '#ffffff',
              transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
            }}
          />
        </div>
      )}

      {/* DASH [LƯỚT] */}
      <button
        type="button"
        aria-label="Lướt nhanh"
        onPointerDown={editing ? startEditorDrag('dash') : undefined}
        {...bindTouchButton('dash')}
        className={`fixed pointer-events-auto w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center border font-display italic font-bold text-[11px] tracking-wider active:scale-90 transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-1.5 ${editorRingClass('dash')}`}
        style={{
          ...getButtonStyle('dash', dashReady ? 0.95 : 0.55),
          backgroundColor: 'rgba(10, 14, 24, 0.62)',
          borderColor: dashReady ? `${hud.characterAccent}cc` : 'rgba(71, 85, 105, 0.5)',
          color: dashReady ? '#f8fafc' : '#94a3b8',
        }}
      >
        <span>LƯỚT</span>
        {!dashReady && (
          <span className="font-mono-num text-[9px] text-white leading-none">
            {hud.cooldowns.dash}
          </span>
        )}
      </button>

      {/* ULTIMATE [I] */}
      <button
        type="button"
        aria-label={`Tuyệt kỹ ${hud.characterSkills.ultimateFullName}`}
        onPointerDown={editing ? startEditorDrag('ultimate') : undefined}
        {...bindTouchButton('ultimate')}
        className={`fixed pointer-events-auto w-[48px] h-[48px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-1.5 ${editorRingClass('ultimate')}`}
        style={{
          ...getButtonStyle('ultimate', hud.cooldowns.ultimateReady ? 1 : 0.62),
          backgroundColor: hud.cooldowns.ultimateReady
            ? 'rgba(185, 28, 28, 0.9)'
            : 'rgba(14, 10, 16, 0.6)',
          borderColor: hud.cooldowns.ultimateReady ? '#fca5a5' : 'rgba(148, 163, 184, 0.42)',
          boxShadow: hud.cooldowns.ultimateReady ? '0 0 14px rgba(239, 68, 68, 0.72)' : 'none',
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

      {/* AWAKENING [O] */}
      <button
        type="button"
        aria-label={`Thức tỉnh ${hud.characterSkills.awakenName}`}
        onPointerDown={editing ? startEditorDrag('awaken') : undefined}
        {...bindTouchButton('awaken')}
        className={`fixed pointer-events-auto w-[48px] h-[48px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-1.5 ${editorRingClass('awaken')}`}
        style={{
          ...getButtonStyle('awaken', hud.awakened || hud.cooldowns.awakenReady ? 1 : 0.62),
          backgroundColor:
            hud.awakened || hud.cooldowns.awakenReady
              ? 'rgba(180, 83, 9, 0.9)'
              : 'rgba(18, 14, 10, 0.6)',
          borderColor:
            hud.awakened || hud.cooldowns.awakenReady ? '#fde68a' : 'rgba(148, 163, 184, 0.42)',
          boxShadow:
            hud.awakened || hud.cooldowns.awakenReady
              ? '0 0 14px rgba(245, 158, 11, 0.65)'
              : 'none',
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

      {/* PARRY [K] */}
      <button
        type="button"
        aria-label="Parry phản đòn"
        onPointerDown={editing ? startEditorDrag('parry') : undefined}
        {...bindTouchButton('parry')}
        className={`fixed pointer-events-auto w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-1.5 ${editorRingClass('parry')}`}
        style={{
          ...getButtonStyle('parry', parryReady ? 0.96 : 0.56),
          backgroundColor: 'rgba(10, 20, 32, 0.64)',
          borderColor: parryReady ? '#38bdf8cc' : 'rgba(71, 85, 105, 0.5)',
          color: parryReady ? '#bae6fd' : '#94a3b8',
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

      {/* SKILL [U] */}
      <button
        type="button"
        aria-label={`Chiêu thức ${specialLabel}`}
        onPointerDown={editing ? startEditorDrag('skill') : undefined}
        {...bindTouchButton('cryo')}
        className={`fixed pointer-events-auto w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center border active:scale-90 transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-1.5 ${editorRingClass('skill')}`}
        style={{
          ...getButtonStyle('skill', specialReady ? 0.96 : 0.56),
          backgroundColor: hud.cooldowns.cryoActive
            ? 'rgba(14, 116, 144, 0.88)'
            : 'rgba(10, 18, 30, 0.64)',
          borderColor: specialReady ? `${hud.characterAccent}dd` : 'rgba(71, 85, 105, 0.5)',
          color: specialReady ? '#e0f2fe' : '#94a3b8',
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

      {/* JUMP [W] */}
      <button
        type="button"
        aria-label="Nhảy"
        onPointerDown={editing ? startEditorDrag('jump') : undefined}
        {...bindTouchButton('jump')}
        className={`fixed pointer-events-auto w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center border text-white active:scale-90 transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-1.5 ${editorRingClass('jump')}`}
        style={{
          ...getButtonStyle('jump', 0.95),
          backgroundColor: 'rgba(14, 20, 34, 0.66)',
          borderColor: 'rgba(203, 213, 225, 0.68)',
        }}
      >
        <span className="font-display italic font-bold text-[11px] tracking-wide">NHẢY</span>
      </button>

      {/* ATTACK [J] */}
      <button
        type="button"
        aria-label={`Tấn công ${hud.cooldowns.skillLinkActive ? hud.cooldowns.skillLinkLabel : hud.characterSkills.basicName}`}
        onPointerDown={editing ? startEditorDrag('attack') : undefined}
        {...bindTouchButton('attack', setAttackHeld)}
        className={`fixed pointer-events-auto w-[66px] h-[66px] rounded-full flex flex-col items-center justify-center border-2 text-white transition-transform cursor-pointer before:content-[''] before:absolute before:-inset-2 ${editorRingClass('attack')}`}
        style={{
          ...getButtonStyle('attack', 1),
          transform: `${getButtonStyle('attack').transform} ${
            attackHeld ? 'scale(0.92)' : hud.cooldowns.skillLinkActive ? 'scale(1.06)' : ''
          }`,
          backgroundColor: hud.cooldowns.skillLinkActive
            ? 'rgba(202, 138, 4, 0.94)'
            : hud.awakened
              ? 'rgba(220, 38, 38, 0.86)'
              : `${hud.characterAccent}d9`,
          borderColor: hud.cooldowns.skillLinkActive ? '#fef08a' : '#ffffff',
          boxShadow: hud.cooldowns.skillLinkActive
            ? '0 0 24px rgba(250, 204, 21, 0.95)'
            : `0 0 18px ${hud.awakened ? '#ef4444' : hud.characterAccent}88`,
        }}
      >
        <span className="font-display italic font-extrabold text-[15px] leading-none tracking-wider">
          {hud.cooldowns.skillLinkActive ? hud.cooldowns.skillLinkLabel : 'CHÉM'}
        </span>
        <span className="text-[7.5px] font-bold opacity-95 mt-0.5 tracking-wider">
          {hud.cooldowns.skillLinkActive ? 'LIÊN CHIÊU!' : 'GIỮ COMBO'}
        </span>
      </button>

      {/* LAYOUT EDITOR TOP BAR */}
      {editing && (
        <div
          className="fixed top-2 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[700px] z-50 bg-[#0b0e17]/95 border border-white/15 rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 text-xs text-slate-200 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
            <div className="font-display italic font-bold text-sm text-white tracking-wider">
              TÙY CHỈNH NÚT — <span className="text-amber-300">{TOUCH_BUTTON_LABELS[selectedId]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  saveTouchConfig(draftConfig);
                  setConfig(draftConfig);
                  onCloseEditor?.();
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setDraftConfig(createDefaultTouchConfig())}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded cursor-pointer"
              >
                Đặt lại mặc định
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftConfig(config);
                  onCloseEditor?.();
                }}
                className="px-2.5 py-1 bg-rose-700/80 hover:bg-rose-600 text-white font-semibold rounded cursor-pointer"
              >
                Thoát
              </button>
            </div>
          </div>

          {/* Sliders row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300 shrink-0">Cỡ nút này</span>
              <input
                type="range"
                min={0.7}
                max={1.8}
                step={0.05}
                value={selectedLayout.scale}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDraftConfig((prev) => ({
                    ...prev,
                    buttons: {
                      ...prev.buttons,
                      [selectedId]: { ...prev.buttons[selectedId], scale: val },
                    },
                  }));
                }}
                className="w-24 accent-amber-400"
              />
              <span className="font-mono-num w-9 text-right">{selectedLayout.scale.toFixed(2)}x</span>
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300 shrink-0">Cỡ chung</span>
              <input
                type="range"
                min={0.8}
                max={1.6}
                step={0.05}
                value={draftConfig.globalScale}
                onChange={(e) =>
                  setDraftConfig((prev) => ({
                    ...prev,
                    globalScale: parseFloat(e.target.value),
                  }))
                }
                className="w-24 accent-sky-400"
              />
              <span className="font-mono-num w-9 text-right">
                {draftConfig.globalScale.toFixed(2)}x
              </span>
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300 shrink-0">Độ mờ</span>
              <input
                type="range"
                min={0.35}
                max={1.0}
                step={0.05}
                value={draftConfig.opacity}
                onChange={(e) =>
                  setDraftConfig((prev) => ({
                    ...prev,
                    opacity: parseFloat(e.target.value),
                  }))
                }
                className="w-24 accent-rose-400"
              />
              <span className="font-mono-num w-9 text-right">
                {Math.round(draftConfig.opacity * 100)}%
              </span>
            </label>
          </div>

          {/* Move style + Presets row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 mr-1">Di chuyển:</span>
              {(
                [
                  ['buttons', '2 Nút'],
                  ['joystick', 'Joystick'],
                  ['slider', 'Thanh trượt'],
                ] as [MoveStyle, string][]
              ).map(([style, label]) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setDraftConfig((prev) => ({ ...prev, moveStyle: style }))}
                  className={`px-2 py-0.5 rounded border cursor-pointer ${
                    draftConfig.moveStyle === style
                      ? 'bg-sky-600/80 border-sky-400 text-white font-bold'
                      : 'bg-slate-800/80 border-white/10 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              {draftConfig.moveStyle === 'joystick' && (
                <button
                  type="button"
                  onClick={() =>
                    setDraftConfig((prev) => ({
                      ...prev,
                      floatingJoystick: !prev.floatingJoystick,
                    }))
                  }
                  className={`ml-1 px-2 py-0.5 rounded border cursor-pointer ${
                    draftConfig.floatingJoystick
                      ? 'bg-amber-600/80 border-amber-400 text-white font-bold'
                      : 'bg-slate-800/80 border-white/10 text-slate-300'
                  }`}
                >
                  Floating: {draftConfig.floatingJoystick ? 'Bật' : 'Tắt'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 mr-1">Mẫu:</span>
              {(['standard', 'fighting', 'claw'] as TouchPresetId[]).map((presetId) => (
                <button
                  key={presetId}
                  type="button"
                  onClick={() => setDraftConfig((prev) => applyTouchPreset(presetId, prev))}
                  className="px-2 py-0.5 rounded border bg-slate-800/80 hover:bg-slate-700 border-white/15 text-slate-200 cursor-pointer"
                  title={TOUCH_PRESETS[presetId].description}
                >
                  {TOUCH_PRESETS[presetId].name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
