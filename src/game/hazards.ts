/**
 * Map hazards. They affect anyone standing in them, enemies included, and the
 * dangerous ones are always telegraphed before they go live.
 *
 *  powerline    (Graveyard) two pylons with a cable that arcs with current
 *  steamvent    (Graveyard) a floor vent that hisses, then blasts steam
 *  bell         (Cathedral) a bell that tolls and summons a sudden wave around you
 *  lightbeam    (Cathedral) drifting stained-glass light: heals you, but slows you
 *  gravitywell  (Black Sun) pulls everything in; its core crushes
 *  blizzard     (Archive) a gust marked by chevrons on the ground, then shoves everyone downwind
 *  freezepatch  (Archive) frost spreads over a patch of floor, then it freezes: slows and stings
 *  eggfield     (Hive) a nest of hatched eggs that pulses, then spills broodlings around itself
 *  acidpool     (Hive) a pool that bubbles, then boils
 *
 * Fields are short-lived patches enemies leave: Frost Scribe glyphs (slow) and
 * Acid Spitter puddles (hurt). They only ever form where a telegraph was shown.
 *
 * To add a hazard kind: extend HazardSpec['kind'] in src/data/maps.ts and add
 * `place` / `update` / `draw` branches here.
 */
import { Sprite } from 'pixi.js';
import { audio } from '../audio/audio';
import { TAU, distToSegment2 } from '../core/math';
import type { HazardSpec } from '../data/maps';
import { damageEnemy, spawnEnemy } from './enemies';
import { endlessMixWeights, endlessParams } from '../systems/endless';
import type { Game } from './game';

type HState = 0 | 1 | 2; // idle, warning, live
type Kind = HazardSpec['kind'];

interface Hazard {
  kind: Kind;
  x: number;
  y: number;
  x2: number;
  y2: number;
  vx: number;
  vy: number;
  r: number;
  state: HState;
  t: number;
  tick: number;
  hue: number;
  sprites: Sprite[];
}

const IDLE: Record<Kind, [number, number]> = { powerline: [2.8, 6.5], steamvent: [3.5, 8], bell: [10, 16], lightbeam: [0, 0], gravitywell: [4, 7], blizzard: [14, 22], freezepatch: [3.5, 7.5], eggfield: [11, 17], acidpool: [3, 7.5] };
const WARN: Record<Kind, number> = { powerline: 1.1, steamvent: 1.0, bell: 1.8, lightbeam: 0, gravitywell: 1.1, blizzard: 1.5, freezepatch: 1.2, eggfield: 1.6, acidpool: 1.0 };
const LIVE: Record<Kind, number> = { powerline: 1.7, steamvent: 1.9, bell: 0.4, lightbeam: 0, gravitywell: 3.2, blizzard: 2.4, freezepatch: 2.6, eggfield: 0.3, acidpool: 2.0 };
const PLAYER_DMG: Record<Kind, number> = { powerline: 13, steamvent: 10, bell: 0, lightbeam: 0, gravitywell: 16, blizzard: 0, freezepatch: 6, eggfield: 0, acidpool: 8 };

/** a patch an enemy leaves on the floor */
interface Field {
  kind: 'glyph' | 'acid';
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  tick: number;
  dmg: number;
}
const GLASS = [0xc04040, 0x4060c0, 0xc0a030, 0x40a060, 0x8040c0];

const ids: number[] = [];

export class Hazards {
  private g: Game;
  list: Hazard[] = [];
  fields: Field[] = [];
  /** the current gust (world px/s), read by the snow */
  windX = 0;
  windY = 0;

  constructor(g: Game) {
    this.g = g;
  }

  place(): void {
    const g = this.g;
    const r = g.rng.fork(31);
    const W = g.map.width, H = g.map.height, cx = W / 2, cy = H / 2;
    for (const spec of g.map.hazards) {
      for (let i = 0; i < spec.count; i++) {
        let x = 0, y = 0;
        for (let tries = 0; tries < 20; tries++) {
          x = r.range(150, W - 150);
          y = r.range(150, H - 150);
          if (Math.hypot(x - cx, y - cy) > 260 && this.list.every((h) => Math.hypot(h.x - x, h.y - y) > 160)) break;
        }
        const [a, b] = IDLE[spec.kind];
        const h: Hazard = { kind: spec.kind, x, y, x2: x, y2: y, vx: 0, vy: 0, r: 34, state: 0, t: r.range(1, Math.max(2, b * 0.6 + a * 0.2)), tick: 0, hue: i, sprites: [] };
        if (spec.kind === 'powerline') {
          const ang = r.range(0, TAU);
          const L = r.range(150, 230);
          h.x2 = Math.min(W - 40, Math.max(40, x + Math.cos(ang) * L));
          h.y2 = Math.min(H - 40, Math.max(40, y + Math.sin(ang) * L));
          for (const [px, py] of [[h.x, h.y], [h.x2, h.y2]]) h.sprites.push(this.sprite('pylon', px, py, 0.5, 0.9, g.objectsLayer));
        } else if (spec.kind === 'steamvent') {
          h.sprites.push(this.sprite('vent', x, y, 0.5, 0.5, g.decor));
        } else if (spec.kind === 'bell') {
          h.r = 60;
          h.sprites.push(this.sprite('bell', x, y, 0.5, 0.95, g.objectsLayer));
        } else if (spec.kind === 'lightbeam') {
          h.r = r.range(40, 56);
          const ang = r.range(0, TAU);
          h.vx = Math.cos(ang) * 18;
          h.vy = Math.sin(ang) * 18;
          h.state = 2;
          const s = new Sprite(g.a.soft.glow);
          s.anchor.set(0.5);
          s.blendMode = 'add';
          s.alpha = 0.35;
          g.decor.addChild(s);
          h.sprites.push(s);
        } else if (spec.kind === 'blizzard') {
          h.t = r.range(9, 14);
        } else if (spec.kind === 'freezepatch') {
          h.r = r.range(40, 54);
        } else if (spec.kind === 'acidpool') {
          h.r = r.range(32, 44);
        } else if (spec.kind === 'eggfield') {
          h.r = 70;
          // a nest of already-hatched, dark shells: never mistaken for a live Egg Sac
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * TAU + r.range(-0.3, 0.3), d = r.range(14, 40);
            h.sprites.push(this.sprite('nest_shell', x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 0.5, 0.8, g.decor));
          }
        } else if (spec.kind === 'gravitywell') {
          h.r = 170;
          const core = new Sprite(g.a.soft.glow);
          core.anchor.set(0.5);
          core.tint = 0x000000;
          core.alpha = 0.85;
          const ring = new Sprite(g.a.soft.ring_thick);
          ring.anchor.set(0.5);
          ring.blendMode = 'add';
          ring.tint = 0xb36bff;
          g.decor.addChild(core, ring);
          h.sprites.push(core, ring);
        }
        this.list.push(h);
      }
    }
  }

  private sprite(tex: string, x: number, y: number, ax: number, ay: number, parent: { addChild: (s: Sprite) => unknown }): Sprite {
    const s = new Sprite(this.g.a.px[tex]);
    s.anchor.set(ax, ay);
    s.position.set(x, y);
    parent.addChild(s);
    return s;
  }

  update(dt: number): void {
    const g = this.g;
    g.hazardSlow = 1;
    this.windX *= Math.exp(-2 * dt);
    this.windY *= Math.exp(-2 * dt);
    this.updateFields(dt);
    const hw = g.viewW / 2 + 260, hh = g.viewH / 2 + 260;
    for (const h of this.list) {
      if (h.kind === 'blizzard') {
        this.updateBlizzard(h, dt);
        continue;
      }
      if (h.kind === 'lightbeam') {
        this.updateLight(h, dt);
        continue;
      }
      h.t -= dt;
      const near = Math.abs(h.x - g.px) < hw && Math.abs(h.y - g.py) < hh;
      if (h.t <= 0) this.advance(h, near);
      if (h.kind === 'bell' || h.kind === 'eggfield') continue; // they act once, when they go off
      if (!near) continue;
      this.ambient(h);
      if (h.state !== 2) continue;
      if (h.kind === 'gravitywell') this.pull(h, dt);
      if (h.kind === 'freezepatch' && this.inside(h, g.px, g.py, 0)) g.hazardSlow = Math.min(g.hazardSlow, 0.65);
      h.tick -= dt;
      if (h.tick > 0) continue;
      h.tick = 0.3;
      this.applyDamage(h);
    }
  }

  private advance(h: Hazard, near: boolean): void {
    const g = this.g;
    if (h.state === 0) {
      h.state = 1;
      h.t = WARN[h.kind];
      if (!near && h.kind !== 'bell') return;
      if (h.kind === 'steamvent') g.telegraph({ kind: 'circle', x: h.x, y: h.y, r: h.r, ang: 0, len: 0, w: 0, dur: h.t, color: 0xdfe9ff });
      if (h.kind === 'gravitywell') g.telegraph({ kind: 'ring', x: h.x, y: h.y, r: h.r, ang: 0, len: 0, w: 0, dur: h.t, color: 0xb36bff });
      if (h.kind === 'freezepatch') g.telegraph({ kind: 'circle', x: h.x, y: h.y, r: h.r, ang: 0, len: 0, w: 0, dur: h.t, color: 0x9fe8ff });
      if (h.kind === 'acidpool') g.telegraph({ kind: 'circle', x: h.x, y: h.y, r: h.r, ang: 0, len: 0, w: 0, dur: h.t, color: 0x9aff3d });
      if (h.kind === 'eggfield') {
        if (Math.hypot(h.x - g.px, h.y - g.py) < 900) {
          g.telegraph({ kind: 'ring', x: h.x, y: h.y, r: h.r + 40, ang: 0, len: 0, w: 0, dur: h.t, color: 0xe8c850 });
          audio.play('warn', { vol: 0.35, pitch: 0.8 });
        }
        return;
      }
      if (h.kind === 'bell') {
        if (Math.hypot(h.x - g.px, h.y - g.py) < 1000) {
          audio.play('bell');
          g.telegraph({ kind: 'ring', x: g.px, y: g.py, r: 200, ang: 0, len: 0, w: 0, dur: h.t, color: 0xffd34d });
          g.ui.toast('A bell tolls… something answers', '#ffd34d');
        }
        return;
      }
      audio.play('warn', { vol: 0.25 });
    } else if (h.state === 1) {
      h.state = 2;
      h.t = LIVE[h.kind];
      h.tick = 0;
      if (h.kind === 'bell') this.toll(h);
      else if (h.kind === 'eggfield') this.hatch(h);
      else if (near) audio.play(h.kind === 'powerline' ? 'zap' : h.kind === 'gravitywell' ? 'magnet' : 'dash', { vol: 0.5, pitch: h.kind === 'powerline' ? 0.6 : 0.5 });
    } else {
      h.state = 0;
      const [a, b] = IDLE[h.kind];
      h.t = a + Math.random() * (b - a);
    }
  }

  /** the bell summons a ring of enemies around the player */
  private toll(h: Hazard): void {
    const g = this.g;
    if (Math.hypot(h.x - g.px, h.y - g.py) > 1000 || g.victoryT >= 0) return;
    g.fx.ring(h.x, h.y, 10, 260, 0xffd34d, 0.8, 0.8, true);
    g.ui.edgePulse('#ffd34d', 0.5);
    const mix = g.flow ? g.flow.spec.mix : endlessMixWeights(g.map.endlessMix, g.endlessT);
    const keys = Object.keys(mix);
    if (!keys.length) return;
    const weights = keys.map((k) => mix[k]);
    const p = g.flow ? { hpMult: g.flow.spec.hpMult, dmgMult: g.flow.spec.dmgMult } : endlessParams(g.endlessT);
    const n = Math.min(Math.max(0, 560 - g.enemies.length), 12 + (g.flow ? g.flow.round * 3 : Math.floor(g.time / 60) * 2));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const d = 190 + Math.random() * 30;
      const x = g.px + Math.cos(a) * d, y = g.py + Math.sin(a) * d;
      const e = spawnEnemy(g, keys[g.rng.weighted(weights)], x, y, { hpMult: p.hpMult, dmgMult: p.dmgMult });
      e.xp = Math.max(1, e.xp);
      g.fx.embers(x, y, 0xffd34d, 3, 50, 0.5);
    }
  }

/** a nest spills broodlings around itself (only near the player) */
  private hatch(h: Hazard): void {
    const g = this.g;
    if (Math.hypot(h.x - g.px, h.y - g.py) > 900 || g.victoryT >= 0) return;
    const p = g.flow ? { hpMult: g.flow.spec.hpMult, dmgMult: g.flow.spec.dmgMult } : endlessParams(g.endlessT);
    const n = Math.min(Math.max(0, 560 - g.enemies.length), 7 + (g.flow ? g.flow.round * 2 : Math.floor(g.time / 90)));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU, d = h.r * 0.6 + Math.random() * 30;
      const e = spawnEnemy(g, 'broodling', h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, { hpMult: p.hpMult * g.mods.hp, dmgMult: p.dmgMult * g.mods.dmg, countsForMeter: false });
      e.kx = Math.cos(a) * 160;
      e.ky = Math.sin(a) * 160;
    }
    g.fx.puff(h.x, h.y, 0xc8b060, 40, 0.5, 0, -10, 0.5);
    audio.play('curse', { vol: 0.4, pitch: 1.4 });
  }

  /** the blizzard: chevrons on the ground show where the wind will blow, then it shoves everyone */
  private updateBlizzard(h: Hazard, dt: number): void {
    const g = this.g;
    h.t -= dt;
    if (h.t <= 0) {
      if (h.state === 0) {
        h.state = 1;
        h.t = WARN.blizzard;
        const a = Math.random() * TAU;
        h.vx = Math.cos(a);
        h.vy = Math.sin(a);
        audio.play('warn', { vol: 0.35, pitch: 0.6 });
        g.ui.toast('A gust is coming — brace!', '#cfefff');
      } else if (h.state === 1) {
        h.state = 2;
        h.t = LIVE.blizzard;
        audio.play('dash', { vol: 0.5, pitch: 0.4 });
      } else {
        h.state = 0;
        h.t = IDLE.blizzard[0] + Math.random() * (IDLE.blizzard[1] - IDLE.blizzard[0]);
      }
    }
    if (h.state !== 2) return;
    const F = 110;
    this.windX = h.vx * F * 3;
    this.windY = h.vy * F * 3;
    if (!g.playerDead && g.dashT <= 0) {
      g.px = Math.min(g.map.width - 16, Math.max(16, g.px + h.vx * F * dt));
      g.py = Math.min(g.map.height - 16, Math.max(16, g.py + h.vy * F * dt));
    }
    for (const e of g.enemies) {
      if (e.dead || e.mass >= 1 || e.kind !== 'normal') continue;
      e.kx += h.vx * 260 * dt * (1 - e.mass);
      e.ky += h.vy * 260 * dt * (1 - e.mass);
    }
  }

  /** an enemy-made patch: always preceded by a telegraph from its maker */
  addField(kind: Field['kind'], x: number, y: number, r: number, life: number, dmg = 0): void {
    if (this.fields.length > 60) this.fields.shift();
    this.fields.push({ kind, x, y, r, life, max: life, tick: 0, dmg });
  }

  private updateFields(dt: number): void {
    const g = this.g;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.fields.splice(i, 1);
        continue;
      }
      if (g.playerDead || (g.px - f.x) ** 2 + (g.py - f.y) ** 2 > f.r * f.r) continue;
      if (f.kind === 'glyph') g.hazardSlow = Math.min(g.hazardSlow, 0.7);
      else {
        f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = 0.4;
          g.hurt(f.dmg, null);
        }
      }
    }
  }

  private updateLight(h: Hazard, dt: number): void {
    const g = this.g;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (h.x < 120 || h.x > g.map.width - 120) h.vx = -h.vx;
    if (h.y < 120 || h.y > g.map.height - 120) h.vy = -h.vy;
    h.hue += dt * 0.25;
    const inside = (g.px - h.x) ** 2 + (g.py - h.y) ** 2 < h.r * h.r;
    if (inside && !g.playerDead) {
      g.hazardSlow = 0.6;
      g.heal(g.stats.maxHp * 0.025 * dt, false);
      if (Math.random() < 0.15) g.fx.spawn('px', g.a.px.px, g.px + (Math.random() - 0.5) * 16, g.py, { vy: -40, life: 0.5, tint: 0xfff3c0, s0: 1.5, s1: 0.3 });
    }
  }

  private pull(h: Hazard, dt: number): void {
    const g = this.g;
    // drag the player in (you can walk out, but it is hard)
    const dx = h.x - g.px, dy = h.y - g.py;
    const d = Math.hypot(dx, dy) || 1;
    if (d < h.r && !g.playerDead) {
      const f = 75 * (1 - d / h.r) + 25;
      g.px += (dx / d) * f * dt;
      g.py += (dy / d) * f * dt;
    }
    g.hash.query(h.x, h.y, h.r, ids);
    for (const id of ids) {
      const e = g.enemies[id];
      if (!e || e.dead || e.mass >= 1) continue;
      const ex = h.x - e.x, ey = h.y - e.y;
      const ed = Math.hypot(ex, ey) || 1;
      if (ed > h.r) continue;
      e.kx += (ex / ed) * 500 * dt * (1 - e.mass);
      e.ky += (ey / ed) * 500 * dt * (1 - e.mass);
    }
  }

  private ambient(h: Hazard): void {
    const g = this.g;
    if (h.state === 1 && h.kind === 'steamvent' && Math.random() < 0.3) g.fx.puff(h.x + (Math.random() - 0.5) * 16, h.y, 0xbfcbe0, 10, 0.5, 0, -30, 0.25);
    if (h.state === 1 && h.kind === 'powerline' && Math.random() < 0.25) {
      const t = Math.random();
      g.fx.sparks(h.x + (h.x2 - h.x) * t, h.y + (h.y2 - h.y) * t, 0xfff27a, 2, 90, 0.2);
    }
    if (h.kind === 'gravitywell' && (h.state === 2 || Math.random() < 0.2)) {
      const a = Math.random() * TAU, d = h.r * (h.state === 2 ? 0.9 : 0.4);
      g.fx.spawn('px', g.a.px.px, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, { vx: -Math.cos(a) * d * 1.6 - Math.sin(a) * 60, vy: -Math.sin(a) * d * 1.6 + Math.cos(a) * 60, life: 0.6, tint: 0xc9a8ff, s0: 1.3, s1: 0.2 });
    }
    if (h.kind === 'acidpool' && Math.random() < (h.state === 2 ? 0.5 : 0.08)) g.fx.spawn('px', g.a.px.px, h.x + (Math.random() - 0.5) * h.r * 1.4, h.y + (Math.random() - 0.5) * h.r, { vy: -30, life: 0.4, tint: 0xc8ff6a, s0: 1.4, s1: 0.4 });
    if (h.kind === 'freezepatch' && h.state === 2 && Math.random() < 0.3) g.fx.spawn('px', g.a.px.px, h.x + (Math.random() - 0.5) * h.r * 1.4, h.y + (Math.random() - 0.5) * h.r, { vy: -14, life: 0.6, tint: 0xeaffff, s0: 1.2, s1: 0.3 });
    if (h.state !== 2) return;
    if (h.kind === 'steamvent') {
      if (!g.reduced || Math.random() < 0.5) g.fx.puff(h.x + (Math.random() - 0.5) * 24, h.y - 4, 0xd8e2f0, 26, 0.9, (Math.random() - 0.5) * 30, -70, 0.42);
    } else if (h.kind === 'powerline' && Math.random() < 0.5) {
      g.bolt(this.cableBolt(h), 0x9fe8ff, 0.08, 1.6);
    }
  }

  private inside(h: Hazard, x: number, y: number, pad: number): boolean {
    if (h.kind === 'powerline') return distToSegment2(x, y, h.x, h.y, h.x2, h.y2) < (9 + pad) ** 2;
    const r = h.kind === 'gravitywell' ? 26 : h.r;
    return (x - h.x) ** 2 + (y - h.y) ** 2 < (r + pad) ** 2;
  }

  private applyDamage(h: Hazard): void {
    const g = this.g;
    const scale = g.flow ? 1 + 0.15 * (g.flow.round - 1) : 1 + g.time / 600;
    if (PLAYER_DMG[h.kind] && this.inside(h, g.px, g.py, 4) && g.hurt(PLAYER_DMG[h.kind] * scale * (1 + 0.25 * (g.map.chapter - 1)), null)) g.hazardHit = true;
    const mx = (h.x + h.x2) / 2, my = (h.y + h.y2) / 2;
    const R = h.kind === 'powerline' ? Math.hypot(h.x2 - h.x, h.y2 - h.y) / 2 + 20 : h.r + 20;
    g.hash.query(mx, my, R, ids);
    for (const i of ids) {
      const e = g.enemies[i];
      if (!e || e.dead || e.kind === 'boss') continue;
      if (!this.inside(h, e.x, e.y, e.r)) continue;
      damageEnemy(g, e, 18 + e.maxHp * 0.12, 'hazard', { raw: true, noCrit: true, noNumberIfSmall: true });
    }
  }

  private cableBolt(h: Hazard): number[] {
    const pts = [h.x, h.y - 20];
    const n = 8;
    const dx = h.x2 - h.x, dy = h.y2 - h.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const o = (Math.random() - 0.5) * 12;
      pts.push(h.x + dx * t + nx * o, h.y - 20 + dy * t + ny * o + Math.sin(t * Math.PI) * 6);
    }
    pts.push(h.x2, h.y2 - 20);
    return pts;
  }

  draw(): void {
    const g = this.g;
    const gfx = g.hazardGfx;
    gfx.clear();
    for (const f of this.fields) {
      const k = Math.min(1, f.life / 0.5, (f.max - f.life) / 0.25 + 0.3);
      if (f.kind === 'glyph') {
        gfx.circle(f.x, f.y, f.r).fill({ color: 0x7fd0ff, alpha: 0.18 * k });
        gfx.circle(f.x, f.y, f.r).stroke({ color: 0xcff4ff, width: 1.5, alpha: 0.7 * k });
        // the written rune
        gfx.moveTo(f.x - f.r * 0.5, f.y).lineTo(f.x + f.r * 0.5, f.y).moveTo(f.x, f.y - f.r * 0.5).lineTo(f.x, f.y + f.r * 0.5).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 * k });
      } else {
        gfx.ellipse(f.x, f.y, f.r, f.r * 0.85).fill({ color: 0x9aff3d, alpha: 0.3 * k });
        gfx.ellipse(f.x, f.y, f.r, f.r * 0.85).stroke({ color: 0xc8ff6a, width: 1.2, alpha: 0.7 * k });
      }
    }
    const hw = g.viewW / 2 + 260, hh = g.viewH / 2 + 260;
    const t = g.time;
    for (const h of this.list) {
      if (Math.abs(h.x - g.camX) > hw || Math.abs(h.y - g.camY) > hh) continue;
      if (h.kind === 'powerline') {
        const sag = 6;
        const live = h.state === 2, warn = h.state === 1;
        const flick = warn ? (Math.sin(t * 40) > 0 ? 1 : 0.3) : 1;
        const col = live ? 0x9fe8ff : warn ? 0xfff27a : 0x3a4152;
        if (live || warn) {
          gfx.moveTo(h.x, h.y).lineTo(h.x2, h.y2).stroke({ color: live ? 0x59f3ff : 0xffd34d, width: 18, alpha: (live ? 0.22 : 0.12) * flick });
          gfx.moveTo(h.x, h.y).lineTo(h.x2, h.y2).stroke({ color: live ? 0xcff4ff : 0xfff27a, width: 2, alpha: 0.6 * flick });
        }
        gfx.moveTo(h.x, h.y - 20).quadraticCurveTo((h.x + h.x2) / 2, (h.y + h.y2) / 2 - 20 + sag, h.x2, h.y2 - 20).stroke({ color: col, width: live ? 2 : 1.3, alpha: live ? 1 : 0.8 * flick });
      } else if (h.kind === 'steamvent') {
        if (h.state === 2) gfx.circle(h.x, h.y, h.r).fill({ color: 0xcfe0ff, alpha: 0.16 + 0.05 * Math.sin(t * 20) });
        const glow = h.state === 1 ? 0xffa53d : h.state === 2 ? 0xffffff : 0x3a2a20;
        gfx.circle(h.x, h.y, 5).fill({ color: glow, alpha: h.state === 0 ? 0.5 : 0.8 });
      } else if (h.kind === 'bell') {
        const s = h.sprites[0];
        s.rotation = h.state === 1 ? Math.sin(t * 18) * 0.18 : 0;
        s.tint = h.state === 1 ? 0xfff0b0 : 0xffffff;
        if (h.state === 1) gfx.circle(h.x, h.y - 14, 18 + 6 * Math.sin(t * 18)).stroke({ color: 0xffd34d, width: 2, alpha: 0.6 });
      } else if (h.kind === 'lightbeam') {
        const col = GLASS[Math.floor(h.hue) % GLASS.length];
        const s = h.sprites[0];
        s.position.set(h.x, h.y);
        s.scale.set((h.r * 2.6) / 64);
        s.tint = col;
        s.alpha = 0.3 + 0.06 * Math.sin(t * 2 + h.r);
        // shafts of light falling from above-left
        for (let k = -2; k <= 2; k++) {
          const ox = h.x + k * h.r * 0.35;
          gfx.moveTo(ox - 120, h.y - 220).lineTo(ox, h.y).stroke({ color: col, width: h.r * 0.28, alpha: 0.05 });
        }
        gfx.ellipse(h.x, h.y, h.r, h.r * 0.92).stroke({ color: 0xfff3c0, width: 1.2, alpha: 0.35 });
      } else if (h.kind === 'blizzard') {
        if (h.state === 0) continue;
        // chevrons on the ground around you, pointing downwind
        const a = Math.atan2(h.vy, h.vx), live = h.state === 2;
        const al = live ? 0.5 : 0.35 + 0.25 * Math.sin(t * 14);
        for (let k = 0; k < 14; k++) {
          const ox = g.px + ((k * 97) % 11 - 5) * 34 + h.vx * ((t * (live ? 300 : 60) + k * 40) % 120);
          const oy = g.py + ((k * 53) % 9 - 4) * 34 + h.vy * ((t * (live ? 300 : 60) + k * 40) % 120);
          const c = Math.cos(a), s = Math.sin(a);
          gfx.moveTo(ox - c * 8 - s * 7, oy - s * 8 + c * 7).lineTo(ox, oy).lineTo(ox - c * 8 + s * 7, oy - s * 8 - c * 7).stroke({ color: 0xeaffff, width: 2, alpha: al });
        }
      } else if (h.kind === 'freezepatch') {
        const live = h.state === 2;
        gfx.circle(h.x, h.y, h.r).fill({ color: 0xbfe8ff, alpha: live ? 0.42 : 0.12 });
        if (live) gfx.circle(h.x, h.y, h.r).stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
        for (let k = 0; k < 5; k++) {
          const ang = k * 1.26 + h.hue;
          gfx.moveTo(h.x, h.y).lineTo(h.x + Math.cos(ang) * h.r * 0.8, h.y + Math.sin(ang) * h.r * 0.8).stroke({ color: 0xffffff, width: 1, alpha: live ? 0.6 : 0.18 });
        }
      } else if (h.kind === 'acidpool') {
        const live = h.state === 2;
        gfx.ellipse(h.x, h.y, h.r, h.r * 0.85).fill({ color: live ? 0x9aff3d : 0x4a7a1a, alpha: live ? 0.45 + 0.08 * Math.sin(t * 16) : 0.35 });
        gfx.ellipse(h.x, h.y, h.r, h.r * 0.85).stroke({ color: 0xc8ff6a, width: 1.2, alpha: live ? 0.8 : 0.3 });
      } else if (h.kind === 'eggfield') {
        const warn = h.state === 1;
        for (const s of h.sprites) s.rotation = warn ? Math.sin(t * 22 + s.x) * 0.15 : 0;
        if (warn) gfx.circle(h.x, h.y, h.r * 0.6).fill({ color: 0xe8c850, alpha: 0.12 + 0.08 * Math.sin(t * 18) });
      } else if (h.kind === 'gravitywell') {
        const [core, ring] = h.sprites;
        const live = h.state === 2;
        core.position.set(h.x, h.y);
        core.scale.set(((live ? 34 : 22) * 2) / 64);
        ring.position.set(h.x, h.y);
        ring.rotation += 0.05 + (live ? 0.08 : 0);
        ring.scale.set(((live ? h.r : h.r * 0.35) * 2) / 128);
        ring.alpha = live ? 0.6 : 0.3;
        if (live) gfx.circle(h.x, h.y, h.r).stroke({ color: 0xb36bff, width: 1.5, alpha: 0.35 + 0.15 * Math.sin(t * 8) });
      }
    }
  }
}
