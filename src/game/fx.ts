/**
 * Particles and floating damage numbers. All pooled, all batched.
 * The particle budget shrinks automatically when the frame rate drops and
 * when "reduced effects" is on.
 */
import type { Texture } from 'pixi.js';
import type { Assets } from '../render/assets';
import { PLayer, type PP } from './layers';

export type FxLayerName = 'soft' | 'px' | 'pxNormal';

interface Part {
  p: PP;
  layer: PLayer;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  s0: number;
  s1: number;
  a0: number;
  drag: number;
  grav: number;
  spin: number;
  /** if > 0, particle homes toward the target point (gems, embers into player) */
  home: number;
  tx: number;
  ty: number;
}

export interface SpawnOpts {
  vx?: number;
  vy?: number;
  life?: number;
  s0?: number;
  s1?: number;
  alpha?: number;
  tint?: number;
  drag?: number;
  grav?: number;
  spin?: number;
  rot?: number;
  /** ignore the budget (important feedback) */
  force?: boolean;
  scaleY?: number;
}

interface DmgNum {
  parts: PP[];
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  scale: number;
  w: number;
}

export class Fx {
  readonly soft: PLayer;
  readonly px: PLayer;
  readonly pxNormal: PLayer;
  readonly digits: PLayer;
  private parts: Part[] = [];
  private nums: DmgNum[] = [];
  private a: Assets;
  /** max simultaneous particles (adaptive) */
  budget = 2400;
  maxBudget = 2400;
  reduced = false;
  numbersOn = true;
  maxNumbers = 70;

  constructor(a: Assets) {
    this.a = a;
    this.soft = new PLayer(a.soft.glow, { blend: 'add' });
    this.px = new PLayer(a.px.px, { blend: 'add' });
    this.pxNormal = new PLayer(a.px.px);
    this.digits = new PLayer(a.px.d_0, { rotation: false });
  }

  get count(): number {
    return this.parts.length;
  }

  setReduced(on: boolean): void {
    this.reduced = on;
    this.maxBudget = on ? 700 : 2400;
    this.budget = Math.min(this.budget, this.maxBudget);
    this.maxNumbers = on ? 30 : 70;
  }

  /** called with a smoothed fps estimate */
  adapt(fps: number): void {
    if (fps < 50) this.budget = Math.max(250, this.budget * 0.92);
    else if (fps > 58) this.budget = Math.min(this.maxBudget, this.budget + 20);
  }

  spawn(layer: FxLayerName, tex: Texture, x: number, y: number, o: SpawnOpts = {}): boolean {
    if (!o.force && this.parts.length >= this.budget) return false;
    const L = this[layer];
    const p = L.acquire(tex, x, y);
    const s0 = o.s0 ?? 1;
    p.scaleX = s0;
    p.scaleY = s0 * (o.scaleY ?? 1);
    p.alpha = o.alpha ?? 1;
    p.tint = o.tint ?? 0xffffff;
    p.rotation = o.rot ?? 0;
    const life = o.life ?? 0.5;
    this.parts.push({
      p, layer: L, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, life, max: life, s0, s1: o.s1 ?? s0, a0: o.alpha ?? 1,
      drag: o.drag ?? 0, grav: o.grav ?? 0, spin: o.spin ?? 0, home: 0, tx: 0, ty: 0,
    });
    return true;
  }

  update(dt: number): void {
    const arr = this.parts;
    for (let i = arr.length - 1; i >= 0; i--) {
      const q = arr[i];
      q.life -= dt;
      if (q.life <= 0) {
        q.layer.release(q.p);
        arr[i] = arr[arr.length - 1];
        arr.pop();
        continue;
      }
      if (q.drag) {
        const k = Math.exp(-q.drag * dt);
        q.vx *= k;
        q.vy *= k;
      }
      q.vy += q.grav * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const t = 1 - q.life / q.max;
      const p = q.p;
      p.x = q.x;
      p.y = q.y;
      const s = q.s0 + (q.s1 - q.s0) * t;
      const sy = p.scaleY / (p.scaleX || 1);
      p.scaleX = s;
      p.scaleY = s * sy;
      p.alpha = q.a0 * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      if (q.spin) p.rotation += q.spin * dt;
    }
    this.updateNumbers(dt);
  }

  clear(): void {
    for (const q of this.parts) q.layer.release(q.p);
    this.parts.length = 0;
    for (const n of this.nums) for (const p of n.parts) this.digits.release(p);
    this.nums.length = 0;
  }

  // ------------------------------------------------------------------ presets
  glow(x: number, y: number, color: number, size: number, life: number, alpha = 0.8, force = false): void {
    this.spawn('soft', this.a.soft.glow, x, y, { s0: size / 64, s1: (size * 1.3) / 64, life, alpha, tint: color, force });
  }

  ring(x: number, y: number, r0: number, r1: number, color: number, life: number, alpha = 0.9, thick = false): void {
    this.spawn('soft', thick ? this.a.soft.ring_thick : this.a.soft.ring, x, y, { s0: (r0 * 2) / 128, s1: (r1 * 2) / 128, life, alpha, tint: color, force: true });
  }

  sparks(x: number, y: number, color: number, n: number, speed = 160, life = 0.3): void {
    if (this.reduced) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.spawn('px', this.a.px.spark, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: a, life: life * (0.6 + Math.random() * 0.6), drag: 6, tint: color, s0: 1, s1: 0.4 });
    }
  }

  embers(x: number, y: number, color: number, n: number, speed = 90, life = 0.7): void {
    if (this.reduced) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random());
      this.spawn('px', Math.random() < 0.5 ? this.a.px.ember : this.a.px.px, x, y, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: life * (0.5 + Math.random() * 0.8), drag: 3, grav: -30, tint: color, s0: 1, s1: 0.5,
      });
    }
  }

  /** dissolve a sprite shape into embers (death) */
  dissolve(x: number, y: number, shape: [number, number, number][], tint: number, flip: number, scale = 1, maxPts = 60, life = 0.9): void {
    const step = Math.max(1, Math.ceil(shape.length / (this.reduced ? maxPts / 3 : maxPts)));
    for (let i = 0; i < shape.length; i += step) {
      const [sx, sy, c] = shape[i];
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 60;
      this.spawn('px', this.a.px.px, x + sx * flip * scale, y + sy * scale, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 25, life: life * (0.5 + Math.random() * 0.7), drag: 2, grav: -40,
        tint: Math.random() < 0.5 ? tint : c, s0: scale, s1: 0.3,
      });
    }
  }

  puff(x: number, y: number, color: number, size: number, life: number, vx = 0, vy = -20, alpha = 0.5): void {
    this.spawn('soft', this.a.soft.puff, x, y, { vx, vy, s0: size / 48, s1: (size * 1.8) / 48, life, alpha, tint: color, drag: 1.5, spin: (Math.random() - 0.5) * 2 });
  }

  // ------------------------------------------------------------------ damage numbers
  number(x: number, y: number, value: number, color: number, crit: boolean, mega = false): void {
    if (!this.numbersOn) return;
    if (this.nums.length >= this.maxNumbers && !crit) return;
    if (this.nums.length >= this.maxNumbers + 20 && !mega) return;
    const text = String(Math.max(1, Math.round(value)));
    const scale = mega ? 2.5 : crit ? 1.8 : value >= 100 ? 1.3 : 1.1;
    const parts: PP[] = [];
    const w = text.length * 6 * scale;
    for (let i = 0; i < text.length; i++) {
      const tex = this.a.px[`d_${text[i]}`] ?? this.a.px.d_0;
      const p = this.digits.acquire(tex, x - w / 2 + i * 6 * scale, y);
      p.scaleX = scale;
      p.scaleY = scale;
      p.tint = color;
      parts.push(p);
    }
    for (let k = 0; k < (mega ? 2 : crit ? 1 : 0); k++) {
      const p = this.digits.acquire(this.a.px['d_!'], x + w / 2 + 2, y);
      p.scaleX = scale;
      p.scaleY = scale;
      p.tint = color;
      parts.push(p);
    }
    const life = mega ? 1.05 : crit ? 0.8 : 0.6;
    this.nums.push({ parts, x: x - w / 2, y, vy: mega ? -90 : crit ? -70 : -45, life, max: life, scale, w });
  }

  private updateNumbers(dt: number): void {
    const arr = this.nums;
    for (let i = arr.length - 1; i >= 0; i--) {
      const n = arr[i];
      n.life -= dt;
      if (n.life <= 0) {
        for (const p of n.parts) this.digits.release(p);
        arr[i] = arr[arr.length - 1];
        arr.pop();
        continue;
      }
      n.vy *= Math.exp(-4 * dt);
      n.y += n.vy * dt;
      const t = 1 - n.life / n.max;
      const pop = t < 0.12 ? 1 + (0.12 - t) * 3 : 1;
      const a = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
      for (let k = 0; k < n.parts.length; k++) {
        const p = n.parts[k];
        p.y = n.y;
        p.x = n.x + k * 6 * n.scale * pop;
        p.scaleX = n.scale * pop;
        p.scaleY = n.scale * pop;
        p.alpha = a;
      }
    }
  }
}
