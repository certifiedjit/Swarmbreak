/**
 * Unified input: keyboard (rebindable), floating virtual joystick on touch,
 * and gamepads (standard mapping). Gameplay reads `move` and edge-triggered
 * actions; menus read `nav` events.
 */
import { save, type Action } from '../core/save';

export type NavEvent = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'alt';

const DEADZONE = 0.22;

export class Input {
  move = { x: 0, y: 0 };
  private keysDown = new Set<string>();
  private pressed = new Set<Action>();
  private navQueue: NavEvent[] = [];
  private padPrev: boolean[] = [];
  private padAxisNav = { x: 0, y: 0, t: 0 };
  usingTouch = false;
  usingPad = false;
  /** set by the settings screen while waiting for a key to bind */
  captureKey: ((code: string) => void) | null = null;

  // touch joystick
  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private joyVec = { x: 0, y: 0 };
  private joyBase: HTMLElement;
  private joyKnob: HTMLElement;
  private touchEnabled = false;

  constructor(root: HTMLElement) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keysDown.clear());
    this.joyBase = document.createElement('div');
    this.joyBase.className = 'joy-base';
    this.joyKnob = document.createElement('div');
    this.joyKnob.className = 'joy-knob';
    this.joyBase.appendChild(this.joyKnob);
    root.appendChild(this.joyBase);
    const opts = { passive: false } as AddEventListenerOptions;
    root.addEventListener('touchstart', (e) => this.onTouchStart(e), opts);
    root.addEventListener('touchmove', (e) => this.onTouchMove(e), opts);
    root.addEventListener('touchend', (e) => this.onTouchEnd(e), opts);
    root.addEventListener('touchcancel', (e) => this.onTouchEnd(e), opts);
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.usingTouch = true;
      else if (e.pointerType === 'mouse') this.usingTouch = false;
      document.body.classList.toggle('touch', this.usingTouch);
    });
  }

  /** the joystick only captures touches while in gameplay */
  setTouchEnabled(on: boolean): void {
    this.touchEnabled = on;
    if (!on) this.releaseJoy();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (down && this.captureKey) {
      e.preventDefault();
      const cb = this.captureKey;
      this.captureKey = null;
      cb(e.code);
      return;
    }
    const keys = save.data.settings.keys;
    if (down) {
      if (!e.repeat) {
        for (const a of Object.keys(keys) as Action[]) if (keys[a].includes(e.code)) this.pressed.add(a);
      }
      const nav = this.keyNav(e.code);
      if (nav) {
        this.navQueue.push(nav);
        if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      }
      this.keysDown.add(e.code);
      this.usingPad = false;
    } else this.keysDown.delete(e.code);
  }

  private keyNav(code: string): NavEvent | null {
    const k = save.data.settings.keys;
    if (code === 'Enter' || code === 'NumpadEnter') return 'confirm';
    if (code === 'Escape' || code === 'Backspace') return 'back';
    if (code === 'KeyR') return 'alt';
    if (k.up.includes(code)) return 'up';
    if (k.down.includes(code)) return 'down';
    if (k.left.includes(code)) return 'left';
    if (k.right.includes(code)) return 'right';
    if (code === 'Space') return 'confirm';
    return null;
  }

  // ------------------------------------------------------------ touch joystick
  private onTouchStart(e: TouchEvent): void {
    this.usingTouch = true;
    document.body.classList.add('touch');
    if (!this.touchEnabled) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, .no-joy')) return;
    for (const t of Array.from(e.changedTouches)) {
      if (this.joyId !== null) break;
      this.joyId = t.identifier;
      this.joyOrigin = { x: t.clientX, y: t.clientY };
      this.joyVec = { x: 0, y: 0 };
      this.joyBase.style.display = 'block';
      this.joyBase.style.left = `${t.clientX}px`;
      this.joyBase.style.top = `${t.clientY}px`;
      this.joyKnob.style.transform = 'translate(-50%, -50%)';
    }
    e.preventDefault();
  }

  private onTouchMove(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== this.joyId) continue;
      const R = 52;
      let dx = t.clientX - this.joyOrigin.x;
      let dy = t.clientY - this.joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // drag the base along so direction changes stay responsive
        this.joyOrigin.x += (dx / d) * (d - R);
        this.joyOrigin.y += (dy / d) * (d - R);
        this.joyBase.style.left = `${this.joyOrigin.x}px`;
        this.joyBase.style.top = `${this.joyOrigin.y}px`;
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      this.joyVec = { x: dx / R, y: dy / R };
      this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      e.preventDefault();
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) if (t.identifier === this.joyId) this.releaseJoy();
  }

  private releaseJoy(): void {
    this.joyId = null;
    this.joyVec = { x: 0, y: 0 };
    this.joyBase.style.display = 'none';
  }

  // ------------------------------------------------------------ per-frame
  /** call once per rendered frame */
  poll(): void {
    let x = 0, y = 0;
    const k = save.data.settings.keys;
    const down = (a: Action) => k[a].some((c) => this.keysDown.has(c));
    if (down('left')) x -= 1;
    if (down('right')) x += 1;
    if (down('up')) y -= 1;
    if (down('down')) y += 1;

    if (this.joyId !== null) {
      const m = Math.hypot(this.joyVec.x, this.joyVec.y);
      if (m > 0.15) {
        x = this.joyVec.x;
        y = this.joyVec.y;
      }
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      const m = Math.hypot(ax, ay);
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      if (m > DEADZONE) {
        const s = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
        x = ax * s;
        y = ay * s;
        this.usingPad = true;
      }
      let dx = 0, dy = 0;
      if (b(14)) dx -= 1;
      if (b(15)) dx += 1;
      if (b(12)) dy -= 1;
      if (b(13)) dy += 1;
      if (dx || dy) {
        x = dx;
        y = dy;
      }
      const edge = (i: number) => b(i) && !this.padPrev[i];
      if (edge(0)) this.navQueue.push('confirm');
      if (edge(1)) this.navQueue.push('back');
      if (edge(2) || edge(3)) this.navQueue.push('alt');
      if (edge(12)) this.navQueue.push('up');
      if (edge(13)) this.navQueue.push('down');
      if (edge(14)) this.navQueue.push('left');
      if (edge(15)) this.navQueue.push('right');
      if (edge(0) || edge(7) || edge(5)) this.pressed.add('spell');
      if (edge(9)) {
        this.pressed.add('pause');
        this.navQueue.push('back');
      }
      // left stick as menu navigation (with repeat delay)
      const now = performance.now();
      const nx = Math.abs(ax) > 0.6 ? Math.sign(ax) : 0;
      const ny = Math.abs(ay) > 0.6 ? Math.sign(ay) : 0;
      if ((nx || ny) && (nx !== this.padAxisNav.x || ny !== this.padAxisNav.y || now - this.padAxisNav.t > 280)) {
        if (ny < 0) this.navQueue.push('up');
        else if (ny > 0) this.navQueue.push('down');
        else if (nx < 0) this.navQueue.push('left');
        else if (nx > 0) this.navQueue.push('right');
        this.padAxisNav.t = now;
      }
      this.padAxisNav.x = nx;
      this.padAxisNav.y = ny;
      if (pad.buttons.some((bt) => bt.pressed)) this.usingPad = true;
      this.padPrev = pad.buttons.map((bt) => bt.pressed);
      break;
    }

    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    this.move.x = x;
    this.move.y = y;
  }

  /** edge-triggered gameplay action (consumed) */
  consume(a: Action): boolean {
    const had = this.pressed.has(a);
    this.pressed.delete(a);
    return had;
  }

  press(a: Action): void {
    this.pressed.add(a);
  }

  takeNav(): NavEvent[] {
    const q = this.navQueue;
    this.navQueue = [];
    return q;
  }

  clearEdges(): void {
    this.pressed.clear();
    this.navQueue = [];
  }
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Escape: 'Esc', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', Enter: 'Enter' };
  return map[code] ?? code;
}
