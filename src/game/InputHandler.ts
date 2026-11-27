import type { ActionKey } from './types';

const KEY_MAP: Record<string, ActionKey> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'jump',
  ArrowUp: 'jump',
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyL: 'dash',
  KeyJ: 'attack',
  KeyK: 'parry',
  KeyU: 'cryo',
  KeyI: 'ultimate',
  KeyO: 'awaken',
  KeyT: 'taunt',
  Escape: 'pause',
  KeyP: 'pause',
};

export class InputHandler {
  private held = new Set<ActionKey>();
  private justPressed = new Set<ActionKey>();
  private buffers = new Map<ActionKey, number>();
  private onSpecialKey?: (code: string) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundClear: () => void;

  constructor(onSpecialKey?: (code: string) => void) {
    this.onSpecialKey = onSpecialKey;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundClear = this.clearAll.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
      window.addEventListener('blur', this.boundClear);
      document.addEventListener('visibilitychange', this.boundClear);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (this.onSpecialKey && !e.repeat) {
      this.onSpecialKey(e.code);
    }

    const action = KEY_MAP[e.code];
    if (!action) return;

    if (
      e.code === 'Space' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown'
    ) {
      e.preventDefault();
    }

    if (!this.held.has(action)) {
      this.justPressed.add(action);
      this.buffers.set(action, 0.22);
    }
    this.held.add(action);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = KEY_MAP[e.code];
    if (!action) return;
    this.held.delete(action);
  }

  public setVirtualAction(action: ActionKey, pressed: boolean): void {
    if (pressed) {
      if (!this.held.has(action)) {
        this.justPressed.add(action);
        this.buffers.set(action, 0.22);
      }
      this.held.add(action);
    } else {
      this.held.delete(action);
    }
  }

  public isHeld(action: ActionKey): boolean {
    return this.held.has(action);
  }

  public consumeJustPressed(action: ActionKey): boolean {
    if (this.justPressed.has(action)) {
      this.justPressed.delete(action);
      this.buffers.delete(action);
      return true;
    }
    return false;
  }

  public consumeBuffered(action: ActionKey): boolean {
    const rem = this.buffers.get(action);
    if (rem !== undefined && rem > 0) {
      this.buffers.delete(action);
      this.justPressed.delete(action);
      return true;
    }
    return false;
  }

  /** Peek whether an action is buffered without consuming it. */
  public hasBuffered(action: ActionKey): boolean {
    const rem = this.buffers.get(action);
    return rem !== undefined && rem > 0;
  }

  public hasAnyGameplayInput(): boolean {
    return (
      this.held.has('left') ||
      this.held.has('right') ||
      this.buffers.size > 0 ||
      this.justPressed.has('jump') ||
      this.justPressed.has('attack') ||
      this.justPressed.has('dash') ||
      this.justPressed.has('parry') ||
      this.justPressed.has('cryo') ||
      this.justPressed.has('ultimate') ||
      this.justPressed.has('awaken') ||
      this.justPressed.has('taunt')
    );
  }

  public update(dt: number): void {
    this.justPressed.clear();
    for (const [k, v] of this.buffers.entries()) {
      const next = v - dt;
      if (next <= 0) this.buffers.delete(k);
      else this.buffers.set(k, next);
    }
  }

  public clearAll(): void {
    this.held.clear();
    this.justPressed.clear();
    this.buffers.clear();
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
      window.removeEventListener('blur', this.boundClear);
      document.removeEventListener('visibilitychange', this.boundClear);
    }
  }
}
