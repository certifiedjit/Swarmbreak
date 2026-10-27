/**
 * Weapon behaviours, keyed by WeaponDef.kind. Numbers live in src/data/weapons.ts.
 *
 *  arc        Oathblade / Oathbreaker      sweeping crescent slashes around the facing direction
 *  orbit      Rune Halo / Rune Corona      blades circling the player
 *  chain      Arc Chain / Tempest Crown    lightning that leaps between enemies
 *  boomerang  Plasma Glaive / Comet Glaive  glaives that fly out and come back
 *  homing     Seeker Swarm / Hive Barrage   homing missiles with splash
 *  shockwave  Gravemaul / Singularity Slam  expanding ground rings
 *
 * To add a weapon kind: add it to WeaponKind, add a `fire` case (and an
 * `update` case if it is continuous), and give it an icon in src/render/icons.ts.
 */
import { Sprite } from 'pixi.js';
import { audio } from '../audio/audio';
import { TAU, angleDiff } from '../core/math';
import { WEAPONS, type WeaponDef } from '../data/weapons';
import { damageEnemy } from './enemies';
import type { Game } from './game';
import type { PP } from './layers';
import type { Enemy, Projectile } from './types';
import { Arsenal } from './arsenal';

export interface WState {
  id: string;
  def: WeaponDef;
  cd: number;
  /** orbit: current angle */
  ang: number;
  /** orbit: blade sprites */
  blades: PP[];
  /** arc: which side swings next; aura: shockwave timer */
  flip: number;
  /** aura: ring + glow sprites under the player */
  aura: Sprite[];
}

export interface Wave {
  x: number;
  y: number;
  r: number;
  max: number;
  speed: number;
  dmg: number;
  knock: number;
  color: number;
  delay: number;
  hits: Set<number>;
  weapon: string;
  pull: number;
  kills: number;
}

interface Pending {
  t: number;
  fn: () => void;
}

export interface EffStats {
  dmg: number;
  cd: number;
  area: number;
  amount: number;
  speed: number;
  dur: number;
  pierce: number;
  knock: number;
  chain: number;
}

const ids: number[] = [];

/** jagged lightning polyline between two points */
function jag(x0: number, y0: number, x1: number, y1: number, segs: number, amp: number): number[] {
  const pts = [x0, y0];
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const o = (Math.random() - 0.5) * 2 * amp * Math.sin(t * Math.PI);
    pts.push(x0 + dx * t + nx * o, y0 + dy * t + ny * o);
  }
  pts.push(x1, y1);
  return pts;
}

export class Weapons {
  readonly g: Game;
  list: WState[] = [];
  waves: Wave[] = [];
  readonly arsenal: Arsenal;
  private pending: Pending[] = [];
  private pool: Projectile[] = [];
  dashHitSet = new Set<number>();
  private healBudget = 0;

  constructor(g: Game) {
    this.g = g;
    this.arsenal = new Arsenal(this);
  }

  /** match weapon states to the build (after level-ups / evolutions) */
  sync(): void {
    const owned = this.g.build.weapons;
    const next: WState[] = [];
    for (const w of owned) {
      let st = this.list.find((s) => s.id === w.id);
      if (!st) st = { id: w.id, def: WEAPONS[w.id], cd: 0.3 + next.length * 0.25, ang: 0, blades: [], flip: 1, aura: [] };
      next.push(st);
    }
    for (const s of this.list) {
      if (next.includes(s)) continue;
      for (const b of s.blades) this.g.projLayer.release(b);
      for (const a of s.aura) a.destroy();
      s.blades = [];
      s.aura = [];
    }
    this.list = next;
  }

  eff(id: string): EffStats {
    const w = this.g.build.weapons.find((x) => x.id === id)!;
    const s = this.g.stats;
    const ws = w.stats;
    return {
      dmg: ws.damage,
      cd: ws.cooldown / s.attackSpeed,
      area: ws.area * s.area,
      amount: ws.amount + Math.floor(s.projectiles),
      speed: ws.speed,
      dur: ws.duration * s.duration,
      pierce: ws.pierce,
      knock: ws.knockback,
      chain: ws.chain,
    };
  }

  update(dt: number): void {
    this.healBudget = Math.min(8, this.healBudget + dt * 4);
    for (const w of this.list) {
      if (w.def.kind === 'orbit') {
        this.updateOrbit(w, dt);
        continue;
      }
      if (w.def.kind === 'aura') {
        this.updateAura(w, dt);
        continue;
      }
      if (w.def.kind === 'wheels') {
        this.arsenal.updateWheels(w, dt);
        continue;
      }
      w.cd -= dt;
      if (w.cd <= 0) {
        const e = this.eff(w.id);
        if (this.fire(w, e)) w.cd = e.cd;
        else w.cd = 0.2; // nothing to shoot at: check again soon
      }
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t <= 0) {
        this.pending.splice(i, 1);
        p.fn();
      }
    }
    this.updateWaves(dt);
    this.updateProjectiles(dt);
    this.arsenal.update(dt);
  }

  later(t: number, fn: () => void): void {
    this.pending.push({ t, fn });
  }

  /** returns false if the weapon had no target */
  private fire(w: WState, e: EffStats): boolean {
    switch (w.def.kind) {
      case 'arc':
        this.fireArc(w, e);
        return true;
      case 'chain':
        return this.fireChain(w, e);
      case 'boomerang':
        return this.fireGlaive(w, e);
      case 'homing':
        return this.fireMissiles(w, e);
      case 'shockwave':
        this.fireSlam(w, e);
        return true;
      default:
        return this.arsenal.fire(w, e);
    }
  }

  // ------------------------------------------------------------ helpers
  nearest(x: number, y: number, maxR: number, skip?: Set<number>): Enemy | null {
    const g = this.g;
    g.hash.query(x, y, maxR, ids);
    let best: Enemy | null = null;
    let bd = maxR * maxR;
    for (const i of ids) {
      const e = g.enemies[i];
      if (!e || e.dead) continue;
      if (skip && skip.has(e.uid)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  heal(hits: number): void {
    const h = Math.min(this.healBudget, hits * 0.6);
    if (h <= 0) return;
    this.healBudget -= h;
    this.g.heal(h, false);
  }

  // ------------------------------------------------------------ arc
  private fireArc(w: WState, e: EffStats): void {
    const g = this.g;
    const evolved = !!w.def.evolved;
    const R = 72 * e.area;
    const base = g.faceAng;
    const n = e.amount;
    for (let k = 0; k < n; k++) {
      // alternate front/back, then fill the sides
      const offs = [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI * 0.75, -Math.PI / 4, Math.PI * 0.75];
      const ang = base + offs[k % offs.length] * (evolved ? 1 : w.flip);
      this.later(k * 0.07, () => this.slash(w, e, ang, R, evolved));
    }
    w.flip = -w.flip;
  }

  private slash(w: WState, e: EffStats, ang: number, R: number, evolved: boolean): void {
    const g = this.g;
    const half = evolved ? 1.65 : 1.3;
    const x = g.px, y = g.py;
    g.fx.spawn('soft', g.a.soft.slash, x, y, { rot: ang, s0: (R / 58) * 0.8, s1: (R / 58) * 1.08, life: 0.17, alpha: 1, tint: g.trailColor(w.def.color), force: true, scaleY: evolved ? 1.35 : 1 });
    g.fx.spawn('soft', g.a.soft.slash, x, y, { rot: ang, s0: (R / 58) * 0.7, s1: (R / 58) * 0.95, life: 0.12, alpha: 0.7, tint: 0xffffff, force: true });
    audio.play('swing', { pitch: evolved ? 0.8 : 1 });
    g.hash.query(x, y, R + 30, ids);
    let hits = 0, kills = 0;
    for (const i of ids) {
      const en = g.enemies[i];
      if (!en || en.dead) continue;
      const dx = en.x - x, dy = en.y - y;
      const d = Math.hypot(dx, dy);
      if (d > R + en.r) continue;
      if (d > en.r + 6 && Math.abs(angleDiff(ang, Math.atan2(dy, dx))) > half) continue;
      damageEnemy(g, en, e.dmg, w.id, { kx: dx / (d || 1), ky: dy / (d || 1), knock: e.knock * 3 });
      hits++;
      if (en.dead) kills++;
      if (hits < 8) g.fx.sparks(en.x, en.y, w.def.color, 2, 140, 0.2);
    }
    if (evolved && hits) this.heal(hits);
    g.multiKill(kills, 'CLEAVE');
  }

  // ------------------------------------------------------------ orbit
  private updateOrbit(w: WState, dt: number): void {
    const g = this.g;
    const e = this.eff(w.id);
    const n = Math.min(16, e.amount);
    while (w.blades.length < n) w.blades.push(g.projLayer.acquire(g.a.px.rune_blade, g.px, g.py));
    while (w.blades.length > n) g.projLayer.release(w.blades.pop()!);
    const evolved = !!w.def.evolved;
    w.ang += dt * 3.1 * e.speed;
    const breathe = evolved ? 1 + 0.25 * Math.sin(g.time * 2.2) : 1;
    const R = 40 * e.area * breathe;
    const br = 9 * Math.sqrt(e.area);
    const interval = e.cd; // per-enemy hit interval
    for (let k = 0; k < n; k++) {
      const a = w.ang + (k / n) * TAU;
      const bx = g.px + Math.cos(a) * R, by = g.py + Math.sin(a) * R;
      const b = w.blades[k];
      b.x = bx;
      b.y = by;
      b.rotation = a + Math.PI / 2;
      b.scaleX = b.scaleY = 1.1 * Math.sqrt(e.area);
      b.tint = w.def.color;
      if (!g.reduced || k % 2 === 0) g.fx.spawn('soft', g.a.soft.glow, bx, by, { s0: 0.28, s1: 0.1, life: 0.16, alpha: 0.45, tint: g.trailColor(w.def.color) });
      g.hash.query(bx, by, br + 20, ids);
      for (const i of ids) {
        const en = g.enemies[i];
        if (!en || en.dead) continue;
        const rr = br + en.r;
        const dx = en.x - bx, dy = en.y - by;
        if (dx * dx + dy * dy > rr * rr) continue;
        if (g.time - en.orbitHitAt < interval) continue;
        en.orbitHitAt = g.time;
        const ox = en.x - g.px, oy = en.y - g.py;
        const od = Math.hypot(ox, oy) || 1;
        damageEnemy(g, en, e.dmg, w.id, { kx: ox / od, ky: oy / od, knock: e.knock * 3 });
        g.fx.sparks(bx, by, w.def.color, evolved ? 3 : 2, 120, 0.18);
      }
    }
  }

  // ------------------------------------------------------------ aura
  private updateAura(w: WState, dt: number): void {
    const g = this.g;
    const e = this.eff(w.id);
    const evolved = !!w.def.evolved;
    // an aura has no projectiles, so each extra projectile widens the burn instead (+15%)
    const R = 46 * e.area * (1 + 0.15 * Math.max(0, Math.floor(g.stats.projectiles)));
    if (!w.aura.length) {
      const glow = new Sprite(g.a.soft.glow);
      const ring = new Sprite(g.a.soft.ring);
      for (const s of [glow, ring]) {
        s.anchor.set(0.5);
        s.blendMode = 'add';
        s.tint = w.def.color;
      }
      g.playerLayer.addChildAt(glow, 0);
      g.playerLayer.addChildAt(ring, 0);
      w.aura = [ring, glow];
    }
    const [ring, glow] = w.aura;
    const pulse = 1 + 0.04 * Math.sin(g.time * 7);
    ring.position.set(g.px, g.py);
    glow.position.set(g.px, g.py);
    ring.scale.set(((R * 2) / 128) * pulse);
    glow.scale.set(((R * 2.1) / 64) * pulse);
    ring.alpha = 0.55 + 0.2 * Math.sin(g.time * 9);
    glow.alpha = evolved ? 0.11 : 0.06;
    ring.rotation += dt * 0.8;
    // licks of flame along the edge
    if (!g.reduced || Math.random() < 0.4) {
      const a = Math.random() * TAU;
      g.fx.spawn('px', g.a.px.ember, g.px + Math.cos(a) * R, g.py + Math.sin(a) * R, { vx: Math.cos(a) * 10, vy: -30 - Math.random() * 30, life: 0.5, tint: Math.random() < 0.5 ? w.def.color : 0xffd27a, s0: 1.2, s1: 0.3 });
    }
    w.cd -= dt;
    if (w.cd <= 0) {
      w.cd = e.cd;
      g.fx.ring(g.px, g.py, R * 0.55, R * 1.08, w.def.color, 0.28, 0.45);
      g.hash.query(g.px, g.py, R + 30, ids);
      let kills = 0;
      for (const i of ids) {
        const en = g.enemies[i];
        if (!en || en.dead) continue;
        const dx = en.x - g.px, dy = en.y - g.py;
        const d = Math.hypot(dx, dy);
        if (d > R + en.r) continue;
        damageEnemy(g, en, e.dmg, w.id, { kx: dx / (d || 1), ky: dy / (d || 1), knock: e.knock * 2, noNumberIfSmall: true });
        if (en.dead) kills++;
        else if (Math.random() < 0.3) g.fx.sparks(en.x, en.y, w.def.color, 1, 80, 0.2);
      }
      g.multiKill(kills, 'SCORCH');
    }
    if (evolved) {
      // solar shockwave every few seconds
      w.flip -= dt;
      if (w.flip <= 0) {
        w.flip = 2.6 / Math.max(0.5, g.stats.attackSpeed);
        this.waves.push({ x: g.px, y: g.py, r: 4, max: R * 2.4, speed: (R * 2.4) / 0.4, dmg: e.dmg * 3, knock: 90, color: 0xffd27a, delay: 0, hits: new Set(), weapon: w.id, pull: 0, kills: 0 });
        g.fx.glow(g.px, g.py, 0xffb330, R * 3, 0.3, 0.6, true);
      }
    }
  }

  // ------------------------------------------------------------ chain lightning
  private fireChain(w: WState, e: EffStats): boolean {
    const g = this.g;
    if (w.def.evolved) return this.fireTempest(w, e);
    const first = this.nearest(g.px, g.py, 300);
    if (!first) return false;
    const struck = new Set<number>();
    for (let s = 0; s < e.amount; s++) {
      this.later(s * 0.09, () => {
        let target = s === 0 && !first.dead ? first : this.nearest(g.px, g.py, 300, struck);
        if (!target) return;
        let fx = g.px, fy = g.py - 10;
        const jumps = e.chain + 1;
        for (let j = 0; j < jumps && target; j++) {
          struck.add(target.uid);
          g.bolt(jag(fx, fy, target.x, target.y, 7, 10), w.def.color, 0.16, 2);
          g.fx.glow(target.x, target.y, w.def.color, 26, 0.15, 0.8);
          g.fx.sparks(target.x, target.y, 0xcff4ff, 3, 160, 0.2);
          fx = target.x;
          fy = target.y;
          damageEnemy(g, target, e.dmg * (1 - j * 0.06), w.id, { knock: e.knock, kx: 0, ky: 0 });
          target = this.nearest(fx, fy, 110 * e.area, struck);
        }
        audio.play('zap');
      });
    }
    return true;
  }

  /** Tempest Crown: a storm strikes every enemy on screen */
  private fireTempest(w: WState, e: EffStats): boolean {
    const g = this.g;
    const hw = g.viewW / 2 + 10, hh = g.viewH / 2 + 10;
    const targets: Enemy[] = [];
    for (const en of g.enemies) if (!en.dead && Math.abs(en.x - g.px) < hw && Math.abs(en.y - g.py) < hh) targets.push(en);
    if (!targets.length) return false;
    g.flash(0xcff4ff, 0.08);
    g.ui.edgePulse('#7fd8ff', 0.35);
    audio.play('zap', { pitch: 0.7, vol: 1.2 });
    const strikes = e.amount;
    for (let s = 0; s < strikes; s++) {
      this.later(s * 0.15, () => {
        let drawn = 0;
        for (const en of targets) {
          if (en.dead) continue;
          if (drawn < (g.reduced ? 25 : 70)) {
            drawn++;
            g.bolt(jag(en.x + (Math.random() - 0.5) * 30, en.y - 140, en.x, en.y, 6, 9), w.def.color, 0.14, 1.6);
          }
          damageEnemy(g, en, e.dmg, w.id, { noNumberIfSmall: true });
        }
      });
    }
    return true;
  }

  // ------------------------------------------------------------ projectiles
  newProj(kind: Projectile['kind'], w: WState, x: number, y: number, tex: string): Projectile {
    return this.newProjRaw(kind, w.id, w.def.color, !!w.def.evolved, x, y, tex);
  }

  newProjRaw(kind: Projectile['kind'], id: string, color: number, evolved: boolean, x: number, y: number, tex: string): Projectile {
    const g = this.g;
    const p = this.pool.pop() ?? ({ hits: new Set<number>() } as Projectile);
    p.kind = kind;
    p.weapon = id;
    p.x = x;
    p.y = y;
    p.vx = p.vy = 0;
    p.life = 1;
    p.age = 0;
    p.dmg = 0;
    p.r = 6;
    p.knock = 0;
    p.pierce = -1;
    p.hits.clear();
    p.p = g.projLayer.acquire(g.a.px[tex], x, y);
    p.p.tint = color;
    p.glow = null;
    p.phase = 0;
    p.target = 0;
    p.tgt = null;
    p.mini = false;
    p.spin = 0;
    p.trailT = 0;
    p.evolved = evolved;
    p.splash = 0;
    p.color = color;
    p.n = 0;
    p.freeze = 0;
    p.cd = 0;
    g.passive.onLaunch(p);
    g.projectiles.push(p);
    return p;
  }

  private fireGlaive(w: WState, e: EffStats): boolean {
    const g = this.g;
    const t = this.nearest(g.px, g.py, 320);
    const base = t ? Math.atan2(t.y - g.py, t.x - g.px) : g.faceAng;
    const n = e.amount;
    for (let k = 0; k < n; k++) {
      const ang = p2(base, k, n, w.def.evolved ? TAU / n : 0.5);
      const p = this.newProj('glaive', w, g.px, g.py, 'glaive');
      const sp = 270 * e.speed;
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
      p.life = 0.62 * e.dur;
      p.dmg = e.dmg;
      p.r = 9 * e.area;
      p.knock = e.knock;
      p.spin = 16;
      p.phase = 0;
      p.target = ang; // stash launch angle for the comet spiral
      p.p.scaleX = p.p.scaleY = e.area;
    }
    audio.play('swing', { pitch: 1.3 });
    return true;
  }

  private fireMissiles(w: WState, e: EffStats): boolean {
    const g = this.g;
    const t = this.nearest(g.px, g.py, 340);
    if (!t) return false;
    const n = e.amount;
    for (let k = 0; k < n; k++) {
      this.later(k * 0.05, () => this.launchMissile(w, e, g.px, g.py, false, Math.random() * TAU));
    }
    return true;
  }

  private launchMissile(w: WState, e: EffStats, x: number, y: number, mini: boolean, ang: number): void {
    const p = this.newProj('missile', w, x, y, 'missile');
    const sp = (mini ? 160 : 140) * e.speed;
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp;
    p.life = 2.6;
    p.dmg = mini ? e.dmg * 0.5 : e.dmg;
    p.r = 5;
    p.knock = e.knock;
    p.pierce = 0;
    p.mini = mini;
    p.splash = (mini ? 18 : 26) * e.area;
    if (mini) p.p.scaleX = p.p.scaleY = 0.75;
    const tg = this.nearest(x, y, 360);
    if (tg) {
      p.tgt = tg;
      p.target = tg.uid;
    }
  }

  private updateProjectiles(dt: number): void {
    const g = this.g;
    const arr = g.projectiles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.age += dt;
      const dead = p.kind === 'glaive' ? this.stepGlaive(p, dt) : p.kind === 'missile' ? this.stepMissile(p, dt) : this.arsenal.step(p, dt);
      if (dead) {
        g.projLayer.release(p.p);
        arr[i] = arr[arr.length - 1];
        arr.pop();
        this.pool.push(p);
      }
    }
  }

  private stepGlaive(p: Projectile, dt: number): boolean {
    const g = this.g;
    if (p.phase === 0) {
      p.life -= dt;
      if (p.evolved) {
        // spiral outward
        const a = Math.atan2(p.vy, p.vx) + dt * 2.2;
        const sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
      }
      if (p.life <= 0) {
        p.phase = 1;
        p.hits.clear();
      }
    } else {
      const dx = g.px - p.x, dy = g.py - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(520, Math.hypot(p.vx, p.vy) + 900 * dt);
      p.vx += ((dx / d) * sp - p.vx) * Math.min(1, dt * 6);
      p.vy += ((dy / d) * sp - p.vy) * Math.min(1, dt * 6);
      if (d < 14 || p.age > 4) return true;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.p.x = p.x;
    p.p.y = p.y;
    p.p.rotation += p.spin * dt;
    p.trailT -= dt;
    if (p.trailT <= 0) {
      p.trailT = p.evolved ? 0.09 : 0.05;
      g.fx.spawn('soft', g.a.soft.glow, p.x, p.y, { s0: p.r / 40, s1: 0.05, life: 0.25, alpha: 0.5, tint: g.trailColor(p.color) });
      if (p.evolved) {
        g.zones.push({ x: p.x, y: p.y, r: 13 * (p.r / 9), life: 1.3, tick: 0, dmg: p.dmg * 0.25, weapon: p.weapon, color: p.color });
        g.fx.spawn('soft', g.a.soft.glow, p.x, p.y, { s0: p.r / 22, s1: p.r / 30, life: 1.3, alpha: 0.35, tint: 0xff7a2a });
      }
    }
    this.hitAlong(p, (en) => {
      damageEnemy(g, en, p.dmg, p.weapon, { kx: p.vx / 300, ky: p.vy / 300, knock: p.knock, crit: p.crit });
      return false;
    });
    return false;
  }

  private stepMissile(p: Projectile, dt: number): boolean {
    const g = this.g;
    p.life -= dt;
    if (p.life <= 0) {
      this.explode(p);
      return true;
    }
    let t = p.tgt;
    if (!t || t.dead || t.uid !== p.target) {
      t = this.nearest(p.x, p.y, 260);
      p.tgt = t;
      p.target = t ? t.uid : 0;
    }
    const sp = Math.min(p.mini ? 420 : 380, Math.hypot(p.vx, p.vy) + 520 * dt);
    if (t) {
      const want = Math.atan2(t.y - p.y, t.x - p.x);
      const cur = Math.atan2(p.vy, p.vx);
      const turn = Math.max(-1, Math.min(1, angleDiff(cur, want) / 0.4)) * 7.5 * dt;
      const a = cur + turn;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
    } else {
      const m = Math.hypot(p.vx, p.vy) || 1;
      p.vx = (p.vx / m) * sp;
      p.vy = (p.vy / m) * sp;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.p.x = p.x;
    p.p.y = p.y;
    p.p.rotation = Math.atan2(p.vy, p.vx);
    p.trailT -= dt;
    if (p.trailT <= 0) {
      p.trailT = 0.03;
      g.fx.spawn('px', g.a.px.px, p.x - p.vx * 0.02, p.y - p.vy * 0.02, { life: 0.3, tint: g.trailColor(p.color), s0: 1.2, s1: 0.3, vx: -p.vx * 0.1, vy: -p.vy * 0.1 });
    }
    let hit = false;
    this.hitAlong(p, () => {
      hit = true;
      return true;
    });
    if (hit) {
      this.explode(p);
      return true;
    }
    return false;
  }

  private explode(p: Projectile): void {
    const g = this.g;
    const R = p.splash;
    g.fx.glow(p.x, p.y, p.color, R * 2.4, 0.18, 0.9);
    g.fx.ring(p.x, p.y, 3, R, p.color, 0.2, 0.8);
    g.fx.sparks(p.x, p.y, p.color, 4, 150, 0.22);
    audio.play('explosion', { vol: 0.25, pitch: 1.6 });
    g.hash.query(p.x, p.y, R + 30, ids);
    for (const i of ids) {
      const en = g.enemies[i];
      if (!en || en.dead) continue;
      const dx = en.x - p.x, dy = en.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > R + en.r) continue;
      damageEnemy(g, en, p.dmg, p.weapon, { kx: dx / (d || 1), ky: dy / (d || 1), knock: p.knock, crit: p.crit });
    }
    if (p.evolved && !p.mini) {
      const w = this.list.find((s) => s.id === p.weapon);
      if (w) {
        const e = this.eff(w.id);
        for (let k = 0; k < 2; k++) this.launchMissile(w, e, p.x, p.y, true, Math.random() * TAU);
      }
    }
  }

  /** collide a projectile with enemies; cb returns true to stop */
  hitAlong(p: Projectile, cb: (e: Enemy) => boolean): void {
    const g = this.g;
    g.hash.query(p.x, p.y, p.r + 24, ids);
    for (const i of ids) {
      const en = g.enemies[i];
      if (!en || en.dead || p.hits.has(en.uid)) continue;
      const rr = p.r + en.r;
      if ((en.x - p.x) ** 2 + (en.y - p.y) ** 2 > rr * rr) continue;
      p.hits.add(en.uid);
      if (cb(en)) return;
    }
  }

  // ------------------------------------------------------------ shockwave
  private fireSlam(w: WState, e: EffStats): void {
    const g = this.g;
    const evolved = !!w.def.evolved;
    const R = 92 * e.area;
    const start = () => {
      for (let k = 0; k < e.amount; k++) {
        this.waves.push({ x: g.px, y: g.py, r: 4, max: R * (1 + k * 0.25), speed: R / 0.32, dmg: e.dmg, knock: e.knock, color: w.def.color, delay: k * 0.22, hits: new Set(), weapon: w.id, pull: 0, kills: 0 });
      }
    };
    if (evolved) {
      // drag the swarm inward first
      const PR = 175 * e.area;
      g.fx.ring(g.px, g.py, PR, 10, w.def.color, 0.4, 0.8, true);
      g.fx.glow(g.px, g.py, 0x8affd8, 60, 0.4, 0.6);
      audio.play('magnet', { vol: 0.5 });
      g.hash.query(g.px, g.py, PR, ids);
      for (const i of ids) {
        const en = g.enemies[i];
        if (!en || en.dead || en.mass >= 1) continue;
        const dx = g.px - en.x, dy = g.py - en.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > PR) continue;
        const k = 420 * (1 - en.mass);
        en.kx += (dx / d) * k;
        en.ky += (dy / d) * k;
      }
      this.later(0.32, start);
    } else start();
  }

  private updateWaves(dt: number): void {
    const g = this.g;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      if (w.delay > 0) {
        w.delay -= dt;
        if (w.delay <= 0) {
          w.x = g.px;
          w.y = g.py;
          this.slamFx(w);
        }
        continue;
      }
      if (w.r <= 4.01) this.slamFx(w);
      const prev = w.r;
      w.r = Math.min(w.max, w.r + w.speed * dt);
      g.hash.query(w.x, w.y, w.r + 30, ids);
      for (const k of ids) {
        const en = g.enemies[k];
        if (!en || en.dead || w.hits.has(en.uid)) continue;
        const dx = en.x - w.x, dy = en.y - w.y;
        const d = Math.hypot(dx, dy);
        if (d > w.r + en.r || d < prev - en.r - 6) continue;
        w.hits.add(en.uid);
        damageEnemy(g, en, w.dmg, w.weapon, { kx: dx / (d || 1), ky: dy / (d || 1), knock: w.knock * 2 });
        if (en.dead) w.kills++;
      }
      if (w.r >= w.max) {
        g.multiKill(w.kills, 'QUAKE');
        this.waves.splice(i, 1);
      }
    }
  }

  private slamFx(w: Wave): void {
    const g = this.g;
    w.r = 4.02;
    g.fx.ring(w.x, w.y, 6, w.max, w.color, 0.34, 0.95, true);
    g.fx.ring(w.x, w.y, 4, w.max * 0.8, 0xffffff, 0.22, 0.5);
    for (let k = 0; k < (g.reduced ? 5 : 12); k++) {
      const a = (k / 12) * TAU;
      g.fx.puff(w.x + Math.cos(a) * 14, w.y + Math.sin(a) * 14, 0x5a6270, 22, 0.6, Math.cos(a) * 60, Math.sin(a) * 60, 0.35);
    }
    audio.play('slam');
  }

  // ------------------------------------------------------------ dash
  dashHits(): void {
    const g = this.g;
    g.hash.query(g.px, g.py, 40, ids);
    for (const i of ids) {
      const en = g.enemies[i];
      if (!en || en.dead || this.dashHitSet.has(en.uid)) continue;
      const rr = en.r + 14;
      if ((en.x - g.px) ** 2 + (en.y - g.py) ** 2 > rr * rr) continue;
      this.dashHitSet.add(en.uid);
      const d = Math.hypot(g.dashVX, g.dashVY) || 1;
      damageEnemy(g, en, 22, 'aegis_dash', { kx: -g.dashVY / d, ky: g.dashVX / d, knock: 260 });
      g.fx.sparks(en.x, en.y, 0x6ff3ff, 3, 160, 0.2);
    }
  }

  clear(): void {
    this.arsenal.clear();
    for (const w of this.list) {
      for (const b of w.blades) this.g.projLayer.release(b);
      for (const a of w.aura) a.destroy();
    }
    this.list = [];
  }
}

/** spread k-th of n projectiles around a base angle */
function p2(base: number, k: number, n: number, spread: number): number {
  if (n <= 1) return base;
  if (spread >= TAU - 0.01) return base + (k / n) * TAU;
  return base + (k - (n - 1) / 2) * spread;
}
