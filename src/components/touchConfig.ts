export type MoveStyle = 'buttons' | 'joystick' | 'slider';

export type TouchButtonId =
  | 'move'
  | 'dash'
  | 'attack'
  | 'jump'
  | 'parry'
  | 'skill'
  | 'ultimate'
  | 'awaken';

export type TouchPresetId = 'standard' | 'fighting' | 'claw';

export interface TouchButtonLayout {
  /** Horizontal center position in viewport percentage (0 - 100) */
  x: number;
  /** Vertical center position in viewport percentage (0 - 100) */
  y: number;
  /** Per-button scale multiplier (0.7 - 1.8) */
  scale: number;
}

export interface TouchConfig {
  moveStyle: MoveStyle;
  floatingJoystick: boolean;
  globalScale: number;
  opacity: number;
  buttons: Record<TouchButtonId, TouchButtonLayout>;
}

export const TOUCH_BUTTON_LABELS: Record<TouchButtonId, string> = {
  move: 'Di chuyển',
  dash: 'Lướt',
  attack: 'Chém',
  jump: 'Nhảy',
  parry: 'Parry',
  skill: 'Chiêu U',
  ultimate: 'Tuyệt kỹ I',
  awaken: 'Thức tỉnh O',
};

export const TOUCH_BUTTON_IDS: TouchButtonId[] = [
  'move',
  'dash',
  'attack',
  'jump',
  'parry',
  'skill',
  'ultimate',
  'awaken',
];

const STORAGE_KEY = 'scarlet_sheath_touch_config_v1';

export function clampTouchValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const TOUCH_PRESETS: Record<
  TouchPresetId,
  {
    name: string;
    description: string;
    moveStyle?: MoveStyle;
    buttons: Record<TouchButtonId, TouchButtonLayout>;
  }
> = {
  standard: {
    name: 'Tiêu chuẩn (To rõ)',
    description: 'Nút to, giãn khoảng cách cụm phải để tránh bấm nhầm',
    buttons: {
      move: { x: 14, y: 80, scale: 1.05 },
      dash: { x: 25, y: 63, scale: 1.0 },
      attack: { x: 90, y: 80, scale: 1.15 },
      jump: { x: 91, y: 56, scale: 1.0 },
      parry: { x: 77, y: 83, scale: 1.0 },
      skill: { x: 78, y: 63, scale: 1.0 },
      ultimate: { x: 66, y: 76, scale: 0.95 },
      awaken: { x: 67, y: 54, scale: 0.95 },
    },
  },
  fighting: {
    name: 'Đối kháng (Cung tròn)',
    description: 'Ôm theo vòng cung ngón cái phải, Parry & Lướt dễ phản xạ',
    buttons: {
      move: { x: 14, y: 80, scale: 1.05 },
      dash: { x: 24, y: 78, scale: 1.05 },
      attack: { x: 90, y: 79, scale: 1.15 },
      parry: { x: 77, y: 82, scale: 1.08 },
      skill: { x: 79, y: 62, scale: 1.0 },
      jump: { x: 90, y: 56, scale: 1.0 },
      ultimate: { x: 67, y: 73, scale: 0.95 },
      awaken: { x: 69, y: 52, scale: 0.95 },
    },
  },
  claw: {
    name: '4 Ngón (Claw)',
    description: 'Đưa Lướt & Parry lên góc trên để dùng ngón trỏ bấm',
    buttons: {
      move: { x: 14, y: 80, scale: 1.05 },
      dash: { x: 14, y: 24, scale: 1.05 },
      parry: { x: 86, y: 24, scale: 1.08 },
      attack: { x: 90, y: 79, scale: 1.15 },
      jump: { x: 90, y: 55, scale: 1.0 },
      skill: { x: 77, y: 68, scale: 1.0 },
      ultimate: { x: 76, y: 85, scale: 0.95 },
      awaken: { x: 65, y: 74, scale: 0.95 },
    },
  },
};

function cloneButtons(
  buttons: Record<TouchButtonId, TouchButtonLayout>
): Record<TouchButtonId, TouchButtonLayout> {
  const copy = {} as Record<TouchButtonId, TouchButtonLayout>;
  for (const id of TOUCH_BUTTON_IDS) {
    copy[id] = { ...buttons[id] };
  }
  return copy;
}

export function createDefaultTouchConfig(): TouchConfig {
  return {
    moveStyle: 'buttons',
    floatingJoystick: true,
    globalScale: 1.2,
    opacity: 0.88,
    buttons: cloneButtons(TOUCH_PRESETS.standard.buttons),
  };
}

export function applyTouchPreset(presetId: TouchPresetId, base?: TouchConfig): TouchConfig {
  const current = base ?? createDefaultTouchConfig();
  const preset = TOUCH_PRESETS[presetId];
  return {
    ...current,
    moveStyle: preset.moveStyle ?? current.moveStyle,
    buttons: cloneButtons(preset.buttons),
  };
}

export function loadTouchConfig(): TouchConfig {
  const defaults = createDefaultTouchConfig();
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<TouchConfig>;

    const moveStyle: MoveStyle =
      parsed.moveStyle === 'buttons' ||
      parsed.moveStyle === 'joystick' ||
      parsed.moveStyle === 'slider'
        ? parsed.moveStyle
        : defaults.moveStyle;

    const floatingJoystick =
      typeof parsed.floatingJoystick === 'boolean'
        ? parsed.floatingJoystick
        : defaults.floatingJoystick;

    const globalScale =
      typeof parsed.globalScale === 'number' && Number.isFinite(parsed.globalScale)
        ? clampTouchValue(parsed.globalScale, 0.8, 1.6)
        : defaults.globalScale;

    const opacity =
      typeof parsed.opacity === 'number' && Number.isFinite(parsed.opacity)
        ? clampTouchValue(parsed.opacity, 0.35, 1.0)
        : defaults.opacity;

    const buttons = cloneButtons(defaults.buttons);
    if (parsed.buttons && typeof parsed.buttons === 'object') {
      for (const id of TOUCH_BUTTON_IDS) {
        const b = parsed.buttons[id];
        if (b && typeof b === 'object') {
          buttons[id] = {
            x:
              typeof b.x === 'number' && Number.isFinite(b.x)
                ? clampTouchValue(b.x, 4, 96)
                : defaults.buttons[id].x,
            y:
              typeof b.y === 'number' && Number.isFinite(b.y)
                ? clampTouchValue(b.y, 6, 94)
                : defaults.buttons[id].y,
            scale:
              typeof b.scale === 'number' && Number.isFinite(b.scale)
                ? clampTouchValue(b.scale, 0.7, 1.8)
                : defaults.buttons[id].scale,
          };
        }
      }
    }

    return { moveStyle, floatingJoystick, globalScale, opacity, buttons };
  } catch {
    return defaults;
  }
}

export function saveTouchConfig(config: TouchConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export function resetTouchConfig(): TouchConfig {
  const defaults = createDefaultTouchConfig();
  saveTouchConfig(defaults);
  return defaults;
}
