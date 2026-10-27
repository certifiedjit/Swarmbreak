/**
 * Keyboard / gamepad navigation for DOM menus. Anything with [data-nav] in the
 * active layer is focusable; arrows / WASD / d-pad move to the nearest element
 * in that direction, confirm clicks it.
 */
import { audio } from '../audio/audio';
import type { NavEvent } from '../input/input';

export class Nav {
  layer: HTMLElement | null = null;
  focused: HTMLElement | null = null;
  onBack: (() => void) | null = null;
  onAlt: (() => void) | null = null;

  /** make `layer` the navigable area */
  set(layer: HTMLElement, onBack: (() => void) | null = null, onAlt: (() => void) | null = null): void {
    this.layer = layer;
    this.onBack = onBack;
    this.onAlt = onAlt;
    this.focused = null;
    layer.addEventListener('pointerover', (e) => {
      const t = (e.target as HTMLElement).closest('[data-nav]') as HTMLElement | null;
      if (t && layer.contains(t) && !t.hasAttribute('disabled')) this.focus(t, false);
    });
  }

  release(layer: HTMLElement): void {
    if (this.layer === layer) {
      this.layer = null;
      this.focused = null;
      this.onBack = this.onAlt = null;
    }
  }

  items(): HTMLElement[] {
    if (!this.layer) return [];
    return Array.from(this.layer.querySelectorAll<HTMLElement>('[data-nav]')).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  focus(el: HTMLElement | null, sound = true): void {
    if (this.focused === el) return;
    this.focused?.classList.remove('focus');
    this.focused = el;
    if (el) {
      el.classList.add('focus');
      el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      if (sound) audio.play('hover');
    }
  }

  focusFirst(): void {
    const list = this.items();
    const auto = list.find((el) => el.hasAttribute('data-autofocus'));
    this.focus(auto ?? list[0] ?? null, false);
  }

  handle(events: NavEvent[]): void {
    for (const ev of events) {
      if (!this.layer) return;
      if (ev === 'back') {
        if (this.onBack) {
          audio.play('click');
          this.onBack();
        }
        continue;
      }
      if (ev === 'alt') {
        this.onAlt?.();
        continue;
      }
      const list = this.items();
      if (!list.length) continue;
      if (!this.focused || !list.includes(this.focused)) {
        this.focusFirst();
        if (ev !== 'confirm') continue;
      }
      if (ev === 'confirm') {
        if (this.focused && !this.focused.hasAttribute('disabled')) this.focused.click();
        continue;
      }
      // range sliders: left/right change the value
      if (this.focused instanceof HTMLInputElement && this.focused.type === 'range' && (ev === 'left' || ev === 'right')) {
        const r = this.focused;
        const step = Number(r.step || 0.05);
        r.value = String(Math.min(Number(r.max), Math.max(Number(r.min), Number(r.value) + (ev === 'left' ? -step : step) * 2)));
        r.dispatchEvent(new Event('input', { bubbles: true }));
        continue;
      }
      this.move(ev, list);
    }
  }

  private move(dir: NavEvent, list: HTMLElement[]): void {
    const cur = this.focused!;
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      const vertical = dir === 'up' || dir === 'down';
      const main = vertical ? (dir === 'up' ? -dy : dy) : dir === 'left' ? -dx : dx;
      const cross = vertical ? dx : dy;
      if (main <= 2) continue;
      const score = main + Math.abs(cross) * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (!best) {
      // wrap within lists
      const i = list.indexOf(cur);
      if (dir === 'down' || dir === 'right') best = list[(i + 1) % list.length];
      else best = list[(i - 1 + list.length) % list.length];
    }
    this.focus(best);
  }
}
