/**
 * Static map dressing, built once per run. One builder per map `art` key.
 * Builders return flickering light glows for the render loop to animate.
 */
import { Graphics, Sprite, type Container } from 'pixi.js';
import type { Rng } from '../core/rng';
import type { Assets } from '../render/assets';

export interface Lamp {
  s: Sprite;
  base: number;
  seed: number;
  flicker: boolean;
}

interface Ctx {
  a: Assets;
  layer: Container;
  r: Rng;
  W: number;
  H: number;
  lamps: Lamp[];
}

function spr(c: Ctx, tex: string, x: number, y: number, opts: { rot?: number; flip?: boolean; alpha?: number; ay?: number; scale?: number } = {}): Sprite {
  const s = new Sprite(c.a.px[tex]);
  s.anchor.set(0.5, opts.ay ?? 0.5);
  s.position.set(x, y);
  if (opts.rot) s.rotation = opts.rot;
  if (opts.flip) s.scale.x = -1;
  if (opts.scale) s.scale.set(opts.scale * (opts.flip ? -1 : 1), opts.scale);
  if (opts.alpha !== undefined) s.alpha = opts.alpha;
  c.layer.addChild(s);
  return s;
}

function light(c: Ctx, x: number, y: number, color: number, size: number, alpha: number, flicker: boolean): void {
  const glow = new Sprite(c.a.soft.glow);
  glow.anchor.set(0.5);
  glow.blendMode = 'add';
  glow.tint = color;
  glow.alpha = alpha;
  glow.scale.set(size);
  glow.position.set(x, y);
  c.layer.addChild(glow);
  c.lamps.push({ s: glow, base: alpha, seed: c.r.range(0, 100), flicker });
}

function border(c: Ctx, edge: number, accent: number): void {
  const g = new Graphics();
  const { W, H } = c;
  g.rect(-1200, -1200, W + 2400, 1200).fill({ color: edge, alpha: 0.86 });
  g.rect(-1200, H, W + 2400, 1200).fill({ color: edge, alpha: 0.86 });
  g.rect(-1200, 0, 1200, H).fill({ color: edge, alpha: 0.86 });
  g.rect(W, 0, 1200, H).fill({ color: edge, alpha: 0.86 });
  g.rect(0, 0, W, H).stroke({ color: accent, width: 2, alpha: 0.25 });
  c.layer.addChild(g);
}

/** points around the arena edge, just outside it */
function edgePoints(c: Ctx, n: number, out: [number, number]): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const side = i % 4, t = c.r.next(), d = c.r.range(out[0], out[1]);
    pts.push(side === 0 ? [t * c.W, -d] : side === 1 ? [c.W + d, t * c.H] : side === 2 ? [t * c.W, c.H + d] : [-d, t * c.H]);
  }
  return pts;
}

function graveyard(c: Ctx): void {
  const { r, W, H } = c;
  const cx = W / 2, cy = H / 2;
  for (let i = 0; i < 70; i++) {
    const x = r.range(-200, W + 200), y = r.range(-200, H + 200);
    if (Math.hypot(x - cx, y - cy) < 220) continue;
    spr(c, `wreck${r.int(0, 3)}`, x, y, { flip: r.chance(0.5), alpha: 0.95 });
  }
  for (let i = 0; i < 260; i++) spr(c, `debris${r.int(0, 3)}`, r.range(0, W), r.range(0, H), { rot: r.range(0, Math.PI * 2) });
  for (let i = 0; i < 40; i++) spr(c, 'girder', r.range(0, W), r.range(0, H), { rot: r.pick([0, Math.PI / 2, 0.3, -0.4]) });
  border(c, 0x020306, 0x59f3ff);
  for (const [x, y] of edgePoints(c, 90, [10, 80])) spr(c, `wreck${r.int(0, 3)}`, x, y, { rot: r.range(-0.4, 0.4) });
  // emergency lamps (flicker)
  for (let i = 0; i < 60; i++) {
    const x = r.range(40, W - 40), y = r.range(40, H - 40);
    const col = r.pick([0xff3d3d, 0xffa53d, 0x5cc8ff]);
    light(c, x, y, col, r.range(1.1, 2), 0.35, r.chance(0.4));
    spr(c, col === 0xff3d3d ? 'lamp_red' : col === 0xffa53d ? 'lamp_amber' : 'lamp_blue', x, y);
  }
}

function cathedral(c: Ctx): void {
  const { r, W, H } = c;
  const cx = W / 2, cy = H / 2;
  // aisles of pillars running across the nave
  for (let row = 0; row < 7; row++) {
    const y = 200 + row * 440 + r.range(-40, 40);
    for (let x = 160; x < W - 100; x += r.range(200, 320)) {
      if (Math.hypot(x - cx, y - cy) < 240) continue;
      if (r.chance(0.25)) continue;
      spr(c, r.chance(0.35) ? 'pillar_broken' : 'pillar', x, y, { ay: 0.9 });
    }
  }
  // pews in loose rows
  for (let i = 0; i < 70; i++) {
    const x = r.range(80, W - 80), y = r.range(80, H - 80);
    if (Math.hypot(x - cx, y - cy) < 200) continue;
    const n = r.int(1, 3);
    for (let k = 0; k < n; k++) spr(c, 'pew', x, y + k * 22, { rot: r.range(-0.08, 0.08) + (r.chance(0.1) ? r.range(-0.6, 0.6) : 0), alpha: 0.95 });
  }
  // shattered stained glass on the floor
  for (let i = 0; i < 220; i++) spr(c, `glass_${r.pick(['r', 'b', 'y', 'g', 'p'])}`, r.range(0, W), r.range(0, H), { rot: r.range(0, Math.PI * 2), alpha: 0.75 });
  border(c, 0x050604, 0xd6c25a);
  for (const [x, y] of edgePoints(c, 80, [20, 90])) spr(c, r.chance(0.5) ? 'pillar_broken' : 'pillar', x, y, { ay: 0.9 });
  // candle clusters: warm, gently flickering
  for (let i = 0; i < 80; i++) {
    const x = r.range(40, W - 40), y = r.range(40, H - 40);
    light(c, x, y - 4, r.chance(0.8) ? 0xffb347 : 0xffe28a, r.range(0.9, 1.6), 0.3, false);
    spr(c, r.chance(0.5) ? 'candles3' : 'candles2', x, y, { ay: 0.9 });
  }
}

function blacksun(c: Ctx): void {
  const { r, W, H } = c;
  const cx = W / 2, cy = H / 2;
  // crystal groves: clusters of spires with a cold glow
  for (let i = 0; i < 26; i++) {
    const x = r.range(120, W - 120), y = r.range(120, H - 120);
    if (Math.hypot(x - cx, y - cy) < 260) continue;
    const n = r.int(2, 5);
    light(c, x, y - 20, 0x7ae0ff, r.range(1.6, 2.6), 0.18, false);
    // muted and tall, so scenery never reads as a Crystal Crawler
    for (let k = 0; k < n; k++) spr(c, `spire${r.int(1, 2)}`, x + r.range(-50, 50), y + r.range(-30, 30), { ay: 0.95, flip: r.chance(0.5), alpha: 0.8 }).tint = 0x7f8fb0;
  }
  // rubble of swallowed worlds
  for (let i = 0; i < 60; i++) {
    const x = r.range(-150, W + 150), y = r.range(-150, H + 150);
    if (Math.hypot(x - cx, y - cy) < 200) continue;
    spr(c, `rock${r.int(0, 2)}`, x, y, { rot: r.range(-0.5, 0.5), flip: r.chance(0.5), alpha: 0.95 });
  }
  border(c, 0x030208, 0xb36bff);
  for (const [x, y] of edgePoints(c, 90, [10, 90])) spr(c, r.chance(0.6) ? `rock${r.int(0, 2)}` : 'spire2', x, y, { ay: 0.9, rot: r.range(-0.3, 0.3) }).tint = 0x7f8fb0;
  // the last embers of dead stars: warm, slowly flickering
  for (let i = 0; i < 50; i++) {
    const x = r.range(40, W - 40), y = r.range(40, H - 40);
    light(c, x, y, r.chance(0.7) ? 0xff9a3d : 0xff6bd6, r.range(0.8, 1.5), 0.32, true);
    spr(c, 'ember', x, y);
  }
}

const BUILDERS: Record<string, (c: Ctx) => void> = { graveyard, cathedral, blacksun };

export function buildDecor(art: string, a: Assets, layer: Container, r: Rng, W: number, H: number): Lamp[] {
  const c: Ctx = { a, layer, r, W, H, lamps: [] };
  (BUILDERS[art] ?? graveyard)(c);
  return c.lamps;
}

export function registerDecor(art: string, fn: (c: Ctx) => void): void {
  BUILDERS[art] = fn;
}
