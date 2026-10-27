/**
 * Behaviours for the expanded arsenal (the weapon kinds added after the first
 * six): cryo, puddle, laser, bouncer, turret, wheels, scythe, starfall,
 * ricochet, blackhole, flame and spirits. Numbers live in src/data/weapons.ts.
 *
 * Weapons owns the cooldowns and the projectile pool; this module fires,
 * updates continuous effects and steps the new projectile kinds.
 */
import { Sprite } from 'pixi.js';
import { audio } from '../audio/audio';
import { TAU, angleDiff, distToSegment2 } from '../core/math';
import { damageEnemy } from './enemies';
import type { Game } from './game';
import type { PP } from './layers';
import type { Enemy, Projectile } from './types';
import type { EffStats, Weapons, WState } from './weapons';

interface Beam {
  id: string;
  color: number;
  evolved: boolean;
  ang0: number;
  sweep: number;
  t: number;
  dur: number;
  len: number;
  w: number;
  dmg: number;
  knock: number;
  hits: Set<number>;
}

interface Flame {
  id: string;
  color: number;
  evolved: boolean;
  t: number;
  dur: number;
  tick: number;
  e: EffStats;
}

interface Hole {
  id: string;
  color: number;
  evolved: boolean;
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  tick: number;
  dmg: number;
  core: Sprite;
  ring: Sprite;
}

interface Turret {
  id: string;
  color: number;
  evolved: boolean;
  x: number;
  y: number;
  life: number;
  fireT: number;
  p: PP;
  e: EffStats;
}

const ids: number[] = [];

export class Arsenal {
  private w: Weapons;
  private beams: Beam[] = [];
  private flames: Flame[] = [];
  private holes: Hole[] = [];
  private turrets: Turret[] = [];
  private arcT = 0;

  constructor(w: Weapons) {
    this.w = w;
  }

  private get g(): Game {
    return this.w.g;
  }

  /** hero passives that boost summons (Voidcaller) and turrets (Riven) */
  private summonBonus(kind: 'spirits' | 'turret'): { amount: number; dur: number } {
    const c = this.g.opts.character;
    if (c === 'voidcaller' && kind === 'spirits') return { amount: 1, dur: 1.5 };
    if (c === 'voidcaller' && kind === 'turret') return { amount: 0, dur: 1.5 };
    if (c === 'riven' && kind === 'turret') return { amount: 1, dur: 1.2 };
    return { amount: 0, dur: 1 };
  }

  fire(ws: WState, e: EffStats): boolean {
    switch (ws.def.kind) {
      case 'cryo':
        return this.fireCryo(ws, e);
      case 'puddle':
        return this.firePuddle(ws, e);
      case 'laser':
        return this.fireLaser(ws, e);
      case 'bouncer':
        return this.fireBombs(ws, e);
      case 'turret':
        return this.fireTurret(ws, e);
      case 'scythe':
        return this.fireScythe(ws, e);
      case 'starfall':
        return this.fireStarfall(ws, e);
      case 'ricochet':
        return this.fireRicochet(ws, e);
      case 'blackhole':
        return this.fireHole(ws, e);
      case 'flame':
        return this.fireFlame(ws, e);
      case 'spirits':
        return this.fireSpirits(ws, e);
      default:
        return true;
    }
  }

  /** a few random living enemies near the player (on screen) */
  private randomTargets(n: number, maxR = 260): Enemy[] {
    const g = this.g;
    g.hash.query(g.px, g.py, maxR, ids);
    const pool: Enemy[] = [];
    for (const i of ids) {
      const e = g.enemies[i];
      if (e && !e.dead && (e.x - g.px) ** 2 + (e.y - g.py) ** 2 < maxR * maxR) pool.push(e);
    }
    const out: Enemy[] = [];
    for (let k = 0; k < n && pool.length; k++) out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    return out;
  }

  // ---------------------------------------------------------------- cryo
  private fireCryo(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const evolved = !!ws.def.evolved;
    const t = this.w.nearest(g.px, g.py, 300);
    if (!t && !evolved) return false;
    const base = t ? Math.atan2(t.y - g.py, t.x - g.px) : g.faceAng;
    const n = e.amount;
    for (let k = 0; k < n; k++) {
      const ang = evolved ? (k / n) * TAU : base + (k - (n - 1) / 2) * 0.17;
      const p = this.w.newProj('shard', ws, g.px, g.py, 'shard');
      const sp = (evolved ? 240 : 320) * e.speed;
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
      p.life = evolved ? 0.75 : 0.9;
      p.dmg = e.dmg;
      p.r = 5 * Math.sqrt(e.area);
      p.pierce = e.pierce;
      p.knock = e.knock;
      p.freeze = (evolved ? 2 : 0.8) * e.dur;
      p.p.scaleX = p.p.scaleY = 1.6 * Math.sqrt(e.area);
      p.p.rotation = ang;
    }
    if (evolved) {
      g.fx.ring(g.px, g.py, 6, 70 * e.area, ws.def.color, 0.35, 0.8, true);
      g.fx.glow(g.px, g.py, 0xdff8ff, 80, 0.25, 0.5);
    }
    audio.play('zap', { pitch: 1.7, vol: 0.5 });
    return true;
  }

  // ---------------------------------------------------------------- puddle
  private firePuddle(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const evolved = !!ws.def.evolved;
    const targets = this.randomTargets(e.amount, 240);
    if (!targets.length && !evolved) return false;
    for (let k = 0; k < e.amount; k++) {
      const t = targets[k % Math.max(1, targets.length)];
      const a = Math.random() * TAU;
      const tx = t ? t.x + (Math.random() - 0.5) * 20 : g.px + Math.cos(a) * 80;
      const ty = t ? t.y + (Math.random() - 0.5) * 20 : g.py + Math.sin(a) * 80;
      const T = 0.45, grav = 420;
      const vx = (tx - g.px) / T, vy = (ty - g.py) / T - 0.5 * grav * T;
      g.fx.spawn('px', g.a.px.dot, g.px, g.py - 6, { vx, vy, grav, life: T, tint: ws.def.color, s0: 1.4, s1: 1.1, force: true });
      this.w.later(T + k * 0.04, () => {
        const r = 30 * e.area;
        g.zones.push({ x: tx, y: ty, r, life: 3 * e.dur, max: 3 * e.dur, tick: 0, dmg: e.dmg, weapon: ws.id, color: ws.def.color, pool: true, heal: evolved ? 0.8 : 0 });
        g.fx.glow(tx, ty, ws.def.color, r * 2.2, 0.2, 0.7);
        g.fx.sparks(tx, ty, ws.def.color, 5, 120, 0.25);
        audio.play('hit', { pitch: 0.5, vol: 0.6 });
      });
    }
    return true;
  }

  // ---------------------------------------------------------------- laser
  private fireLaser(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const evolved = !!ws.def.evolved;
    const t = this.w.nearest(g.px, g.py, 200 * e.area);
    if (!t && !evolved) return false;
    const center = t ? Math.atan2(t.y - g.py, t.x - g.px) : g.faceAng;
    // evolved: each beam covers 60% of a circle, so extra beams add coverage, not repeat hits on everything
    const sweep = evolved ? TAU * 0.6 : 2.1;
    for (let k = 0; k < e.amount; k++) {
      const off = evolved ? (k / e.amount) * TAU : k * Math.PI;
      this.beams.push({ id: ws.id, color: ws.def.color, evolved, ang0: center + off - (evolved ? 0 : sweep / 2), sweep, t: 0, dur: (evolved ? 0.9 : 0.55) * e.dur, len: 175 * e.area, w: 12 * Math.sqrt(e.area), dmg: e.dmg, knock: e.knock, hits: new Set() });
    }
    audio.play('zap', { pitch: 0.55, vol: 0.8 });
    return true;
  }

  private updateBeams(dt: number): void {
    const g = this.g;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      const ang = b.ang0 + b.sweep * k;
      const c = Math.cos(ang), s = Math.sin(ang);
      const x0 = g.px + c * 8, y0 = g.py + s * 8 - 6;
      const x1 = x0 + c * b.len, y1 = y0 + s * b.len;
      // visuals: a glowing beam sprite redrawn each frame
      g.fx.spawn('soft', g.a.soft.beam, (x0 + x1) / 2, (y0 + y1) / 2, { rot: ang, s0: b.len / 64, scaleY: (b.w / 24) / (b.len / 64), life: 0.05, alpha: 0.95, tint: b.color, force: true });
      g.fx.spawn('soft', g.a.soft.beam, (x0 + x1) / 2, (y0 + y1) / 2, { rot: ang, s0: b.len / 64, scaleY: (b.w / 60) / (b.len / 64), life: 0.04, alpha: 0.9, tint: 0xffffff, force: true });
      if (Math.random() < 0.6) g.fx.sparks(x1, y1, b.color, 1, 120, 0.2);
      // hits
      g.hash.query((x0 + x1) / 2, (y0 + y1) / 2, b.len / 2 + 24, ids);
      for (const id of ids) {
        const en = g.enemies[id];
        if (!en || en.dead || b.hits.has(en.uid)) continue;
        const rr = b.w / 2 + en.r;
        if (distToSegment2(en.x, en.y, x0, y0, x1, y1) > rr * rr) continue;
        b.hits.add(en.uid);
        damageEnemy(g, en, b.dmg, b.id, { kx: c, ky: s, knock: b.knock, crit: b.evolved || undefined });
      }
      if (k >= 1) this.beams.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- gravity bombs
  private fireBombs(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const t = this.w.nearest(g.px, g.py, 280);
    const base = t ? Math.atan2(t.y - g.py, t.x - g.px) : g.faceAng;
    for (let k = 0; k < e.amount; k++) this.launchBomb(ws.id, ws.def.color, !!ws.def.evolved, g.px, g.py, base + (k - (e.amount - 1) / 2) * 0.6, e, false);
    audio.play('swing', { pitch: 0.6 });
    return true;
  }

  private launchBomb(id: string, color: number, evolved: boolean, x: number, y: number, ang: number, e: EffStats, mini: boolean): void {
    const p = this.w.newProjRaw('bomb', id, color, evolved, x, y, 'orb_big');
    const sp = (mini ? 240 : 210) * e.speed;
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp;
    p.life = (mini ? 0.9 : 1.6) * e.dur;
    p.dmg = mini ? e.dmg * 0.6 : e.dmg;
    p.r = (mini ? 5 : 7) * Math.sqrt(e.area);
    p.splash = (mini ? 30 : 44) * e.area;
    p.mini = mini;
    p.p.scaleX = p.p.scaleY = (mini ? 1 : 1.5) * Math.sqrt(e.area);
  }

  private stepBomb(p: Projectile, dt: number): boolean {
    const g = this.g;
    p.life -= dt;
    p.cd -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = Math.exp(-0.6 * dt);
    p.vx *= k;
    p.vy *= k;
    // bounce off the arena edges
    if (p.x < 10 || p.x > g.map.width - 10) p.vx = -p.vx;
    if (p.y < 10 || p.y > g.map.height - 10) p.vy = -p.vy;
    // bounce off enemies
    if (p.cd <= 0) {
      g.hash.query(p.x, p.y, p.r + 24, ids);
      for (const id of ids) {
        const en = g.enemies[id];
        if (!en || en.dead) continue;
        const dx = p.x - en.x, dy = p.y - en.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > p.r + en.r) continue;
        const nx = dx / d, ny = dy / d;
        const dot = p.vx * nx + p.vy * ny;
        if (dot < 0) {
          p.vx -= 2 * dot * nx;
          p.vy -= 2 * dot * ny;
        }
        damageEnemy(g, en, p.dmg * 0.25, p.weapon, { noNumberIfSmall: true });
        g.fx.sparks(p.x, p.y, p.color, 2, 120, 0.2);
        p.cd = 0.12;
        break;
      }
    }
    p.p.x = p.x;
    p.p.y = p.y;
    p.p.rotation += dt * 6;
    p.p.tint = Math.floor(p.life * (p.life < 0.5 ? 16 : 6)) % 2 ? 0xffffff : p.color;
    if (Math.random() < 0.5) g.fx.spawn('soft', g.a.soft.glow, p.x, p.y, { s0: p.r / 22, s1: 0.05, life: 0.2, alpha: 0.5, tint: p.color });
    if (p.life > 0) return false;
    this.implode(p);
    return true;
  }

  private implode(p: Projectile): void {
    const g = this.g;
    const R = p.splash;
    const x = p.x, y = p.y;
    g.fx.ring(x, y, R * 1.6, 4, p.color, 0.22, 0.9, true);
    g.fx.glow(x, y, p.color, R * 2.4, 0.3, 0.8);
    // pull in, then crush
    g.hash.query(x, y, R * 1.8, ids);
    for (const id of ids) {
      const en = g.enemies[id];
      if (!en || en.dead || en.mass >= 1) continue;
      const dx = x - en.x, dy = y - en.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R * 1.8) continue;
      en.kx += (dx / d) * 380 * (1 - en.mass);
      en.ky += (dy / d) * 380 * (1 - en.mass);
    }
    const dmg = p.dmg, id = p.weapon, color = p.color, evolved = p.evolved, mini = p.mini;
    this.w.later(0.14, () => {
      g.fx.ring(x, y, 4, R, 0xffffff, 0.2, 0.9);
      g.fx.sparks(x, y, color, 8, 220, 0.3);
      audio.play('explosion', { vol: 0.4, pitch: 1.4 });
      g.hash.query(x, y, R + 30, ids);
      let kills = 0;
      for (const i of ids) {
        const en = g.enemies[i];
        if (!en || en.dead) continue;
        const dx = en.x - x, dy = en.y - y;
        const d = Math.hypot(dx, dy);
        if (d > R + en.r) continue;
        damageEnemy(g, en, dmg, id, { kx: dx / (d || 1), ky: dy / (d || 1), knock: 60 });
        if (en.dead) kills++;
      }
      g.multiKill(kills, 'IMPLOSION');
      if (evolved && !mini) {
        const e = this.w.eff(id);
        for (let k = 0; k < 2; k++) this.launchBomb(id, color, true, x, y, Math.random() * TAU, e, true);
      }
    });
  }

  // ---------------------------------------------------------------- turret
  private fireTurret(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const bonus = this.summonBonus('turret');
    const n = e.amount + bonus.amount;
    const cap = n * 2;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + Math.random() * 0.6;
      const x = g.px + Math.cos(a) * 28, y = g.py + Math.sin(a) * 28;
      const p = g.projLayer.acquire(g.a.px.turret, x, y);
      p.tint = ws.def.color === 0xffd34d ? 0xffffff : ws.def.color;
      this.turrets.push({ id: ws.id, color: ws.def.color, evolved: !!ws.def.evolved, x, y, life: 8 * e.dur * bonus.dur, fireT: 0.3 + k * 0.1, p, e });
      g.fx.ring(x, y, 4, 24, ws.def.color, 0.3);
    }
    let mine = this.turrets.filter((t) => t.id === ws.id);
    while (mine.length > cap) {
      const old = mine.shift()!;
      this.removeTurret(old);
      mine = this.turrets.filter((t) => t.id === ws.id);
    }
    audio.play('slam', { pitch: 1.8, vol: 0.4 });
    return true;
  }

  private removeTurret(t: Turret): void {
    const i = this.turrets.indexOf(t);
    if (i >= 0) this.turrets.splice(i, 1);
    this.g.fx.sparks(t.x, t.y, t.color, 6, 140, 0.3);
    this.g.projLayer.release(t.p);
  }

  private updateTurrets(dt: number): void {
    const g = this.g;
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      // keep turret stats in sync with level-ups
      if (g.build.weapons.some((w) => w.id === t.id)) t.e = this.w.eff(t.id);
      t.life -= dt;
      if (t.life <= 0) {
        this.removeTurret(t);
        continue;
      }
      t.p.alpha = t.life < 1 ? t.life : 1;
      t.fireT -= dt;
      if (t.fireT > 0) continue;
      const target = this.w.nearest(t.x, t.y, 260);
      if (!target) {
        t.fireT = 0.2;
        continue;
      }
      t.fireT = 0.4 / t.e.speed;
      const ang = Math.atan2(target.y - t.y, target.x - t.x);
      t.p.rotation = ang;
      const shots = t.evolved ? 3 : 1;
      for (let s = 0; s < shots; s++) {
        this.w.later(s * 0.06, () => {
          const p = this.w.newProjRaw('bolt', t.id, t.color, t.evolved, t.x + Math.cos(ang) * 8, t.y + Math.sin(ang) * 8, 'round');
          const sp = 430;
          const a = ang + (s - (shots - 1) / 2) * 0.08;
          p.vx = Math.cos(a) * sp;
          p.vy = Math.sin(a) * sp;
          p.life = 0.75;
          p.dmg = t.e.dmg;
          p.r = 4;
          p.pierce = 0;
          p.knock = t.e.knock;
          p.p.rotation = a;
          p.p.scaleX = 1.4;
        });
      }
      audio.play('hit', { pitch: 1.8, vol: 0.4 });
    }
    // Bastion Array: lightning between turrets
    this.arcT -= dt;
    if (this.arcT <= 0) {
      this.arcT = 0.3;
      const ev = this.turrets.filter((t) => t.evolved);
      for (let a = 0; a < ev.length; a++) {
        const t1 = ev[a], t2 = ev[(a + 1) % ev.length];
        if (t1 === t2 || Math.hypot(t1.x - t2.x, t1.y - t2.y) > 260) continue;
        g.bolt([t1.x, t1.y, (t1.x + t2.x) / 2 + (Math.random() - 0.5) * 14, (t1.y + t2.y) / 2 + (Math.random() - 0.5) * 14, t2.x, t2.y], t1.color, 0.12, 1.5);
        g.hash.query((t1.x + t2.x) / 2, (t1.y + t2.y) / 2, Math.hypot(t1.x - t2.x, t1.y - t2.y) / 2 + 20, ids);
        for (const id of ids) {
          const en = g.enemies[id];
          if (!en || en.dead) continue;
          if (distToSegment2(en.x, en.y, t1.x, t1.y, t2.x, t2.y) > (en.r + 8) ** 2) continue;
          damageEnemy(g, en, t1.e.dmg * 0.6, t1.id, { noNumberIfSmall: true });
        }
      }
    }
  }

  // ---------------------------------------------------------------- wheels (continuous)
  updateWheels(ws: WState, dt: number): void {
    const g = this.g;
    const e = this.w.eff(ws.id);
    const n = Math.min(10, e.amount);
    while (ws.blades.length < n) ws.blades.push(g.projLayer.acquire(g.a.px.wheel, g.px, g.py));
    while (ws.blades.length > n) g.projLayer.release(ws.blades.pop()!);
    ws.ang += dt * 1.7 * e.speed;
    const R = 72 * e.area;
    const br = 11 * Math.sqrt(e.area);
    for (let k = 0; k < n; k++) {
      const a = ws.ang + (k / n) * TAU;
      const bx = g.px + Math.cos(a) * R, by = g.py + Math.sin(a) * R;
      const b = ws.blades[k];
      b.x = bx;
      b.y = by;
      b.rotation += dt * 9;
      b.scaleX = b.scaleY = 1.5 * Math.sqrt(e.area);
      b.tint = ws.def.color;
      // block enemy shots
      for (const bl of g.bullets) {
        if ((bl.x - bx) ** 2 + (bl.y - by) ** 2 < (br + bl.r) ** 2 && bl.life > 0) {
          bl.life = 0;
          g.fx.sparks(bl.x, bl.y, ws.def.color, 3, 140, 0.2);
        }
      }
      g.hash.query(bx, by, br + 24, ids);
      for (const id of ids) {
        const en = g.enemies[id];
        if (!en || en.dead) continue;
        if ((en.x - bx) ** 2 + (en.y - by) ** 2 > (br + en.r) ** 2) continue;
        if (g.time - en.wheelHitAt < e.cd) continue;
        en.wheelHitAt = g.time;
        const ox = en.x - g.px, oy = en.y - g.py;
        const od = Math.hypot(ox, oy) || 1;
        damageEnemy(g, en, e.dmg, ws.id, { kx: ox / od, ky: oy / od, knock: e.knock * 3 });
        g.fx.sparks(bx, by, ws.def.color, ws.def.evolved ? 4 : 2, 160, 0.2);
        audio.play('hit', { pitch: 0.6, vol: 0.6 });
      }
    }
  }

  // ---------------------------------------------------------------- scythe
  private fireScythe(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const Rout = 108 * e.area, Rin = 28;
    const evolved = !!ws.def.evolved;
    for (let s = 0; s < e.amount; s++) {
      this.w.later(s * 0.22, () => {
        const x = g.px, y = g.py;
        const start = Math.random() * TAU;
        for (let k = 0; k < 8; k++) {
          const a = start + (k / 8) * TAU;
          this.w.later(k * 0.03, () => g.fx.spawn('soft', g.a.soft.slash, g.px, g.py, { rot: a + 0.4, s0: (Rout / 58) * 0.92, s1: Rout / 58, life: 0.18, alpha: 0.85, tint: ws.def.color, force: true }));
        }
        g.fx.ring(x, y, Rout * 0.6, Rout, ws.def.color, 0.3, 0.5);
        audio.play('swing', { pitch: 0.55, vol: 1.2 });
        g.hash.query(x, y, Rout + 30, ids);
        let kills = 0;
        for (const id of ids) {
          const en = g.enemies[id];
          if (!en || en.dead) continue;
          const dx = en.x - x, dy = en.y - y;
          const d = Math.hypot(dx, dy);
          if (d > Rout + en.r || d < Rin - en.r) continue;
          damageEnemy(g, en, e.dmg, ws.id, { kx: -dy / (d || 1), ky: dx / (d || 1), knock: e.knock * 2 });
          if (en.dead) kills++;
        }
        if (evolved && kills) this.w.heal(kills * 1.5);
        g.multiKill(kills, 'REAPED');
      });
    }
    return true;
  }

  // ---------------------------------------------------------------- starfall
  private fireStarfall(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const targets = this.randomTargets(e.amount, Math.max(g.viewW, g.viewH) * 0.55);
    if (!targets.length) return false;
    const evolved = !!ws.def.evolved;
    targets.forEach((t, k) => {
      const x = t.x, y = t.y;
      const R = 30 * e.area;
      this.w.later(k * 0.07, () => {
        g.fx.glow(x, y, ws.def.color, R * 1.6, 0.3, 0.45);
        g.fx.spawn('px', g.a.px.spark, x - 60, y - 160, { vx: 200, vy: 530, life: 0.3, rot: Math.atan2(530, 200), s0: 3, s1: 2, tint: ws.def.color, force: true });
      });
      this.w.later(0.3 + k * 0.07, () => {
        g.fx.glow(x, y, 0xfff3d6, R * 2.2, 0.2, 0.65, true);
        g.fx.ring(x, y, 4, R * 1.3, ws.def.color, 0.28, 0.9, true);
        g.fx.embers(x, y, ws.def.color, 8, 140, 0.6);
        audio.play('explosion', { vol: 0.3, pitch: 1.2 + Math.random() * 0.3 });
        g.hash.query(x, y, R + 30, ids);
        let kills = 0;
        for (const id of ids) {
          const en = g.enemies[id];
          if (!en || en.dead) continue;
          const dx = en.x - x, dy = en.y - y;
          const d = Math.hypot(dx, dy);
          if (d > R + en.r) continue;
          damageEnemy(g, en, e.dmg, ws.id, { kx: dx / (d || 1), ky: dy / (d || 1), knock: e.knock });
          if (en.dead) kills++;
        }
        g.multiKill(kills, 'STARFALL');
        if (evolved) g.zones.push({ x, y, r: R * 0.8, life: 2, max: 2, tick: 0.2, dmg: e.dmg * 0.25, weapon: ws.id, color: 0xff8a3d, pool: true });
      });
    });
    return true;
  }

  // ---------------------------------------------------------------- ricochet
  private fireRicochet(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const skip = new Set<number>();
    let fired = 0;
    for (let k = 0; k < e.amount; k++) {
      const t = this.w.nearest(g.px, g.py, 320, skip);
      if (!t) break;
      skip.add(t.uid);
      this.w.later(k * 0.05, () => this.shootRound(ws.id, ws.def.color, !!ws.def.evolved, g.px, g.py, t, e.dmg, e.chain, e.speed, false));
      fired++;
    }
    if (fired) audio.play('hit', { pitch: 2, vol: 0.6 });
    return fired > 0;
  }

  private shootRound(id: string, color: number, evolved: boolean, x: number, y: number, t: Enemy, dmg: number, bounces: number, speed: number, mini: boolean): void {
    const p = this.w.newProjRaw('round', id, color, evolved, x, y, 'round');
    const ang = Math.atan2(t.y - y, t.x - x);
    const sp = 560 * speed;
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp;
    p.life = 0.8;
    p.dmg = dmg;
    p.r = 4;
    p.n = bounces;
    p.mini = mini;
    p.p.rotation = ang;
    p.p.scaleX = 1.6;
  }

  private stepRound(p: Projectile, dt: number): boolean {
    const g = this.g;
    p.life -= dt;
    if (p.life <= 0) return true;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.p.x = p.x;
    p.p.y = p.y;
    p.trailT -= dt;
    if (p.trailT <= 0) {
      p.trailT = 0.02;
      g.fx.spawn('px', g.a.px.px, p.x, p.y, { life: 0.15, tint: p.color, s0: 1, s1: 0.2 });
    }
    let hit: Enemy | null = null;
    this.w.hitAlong(p, (en) => {
      hit = en;
      return true;
    });
    if (!hit) return false;
    const en = hit as Enemy;
    damageEnemy(g, en, p.dmg, p.weapon, { kx: p.vx / 560, ky: p.vy / 560, knock: 30 });
    g.fx.sparks(en.x, en.y, p.color, 3, 160, 0.18);
    if (p.n <= 0) return true;
    p.n--;
    const next = this.w.nearest(en.x, en.y, 170, p.hits);
    if (!next) return true;
    // Phantom Volley: each bounce splits off another round
    if (p.evolved && !p.mini) {
      const other = this.w.nearest(en.x, en.y, 170, new Set([...p.hits, next.uid]));
      if (other) this.shootRound(p.weapon, p.color, true, en.x, en.y, other, p.dmg * 0.7, Math.floor(p.n / 2), 1, true);
    }
    const ang = Math.atan2(next.y - en.y, next.x - en.x);
    const sp = Math.hypot(p.vx, p.vy);
    p.x = en.x;
    p.y = en.y;
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp;
    p.p.rotation = ang;
    p.life = 0.6;
    return false;
  }

  // ---------------------------------------------------------------- black hole
  private fireHole(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const t = this.w.nearest(g.px, g.py, 240);
    if (!t) return false;
    for (let k = 0; k < e.amount; k++) {
      const a = Math.random() * TAU;
      const x = t.x + (k ? Math.cos(a) * 60 : 0), y = t.y + (k ? Math.sin(a) * 60 : 0);
      const r = 58 * e.area;
      const core = new Sprite(g.a.soft.glow);
      core.anchor.set(0.5);
      core.tint = 0x000000;
      core.alpha = 0.95;
      const ring = new Sprite(g.a.soft.ring_thick);
      ring.anchor.set(0.5);
      ring.blendMode = 'add';
      ring.tint = ws.def.color;
      g.bigLayer.addChild(core, ring);
      const life = 2.6 * e.dur;
      this.holes.push({ id: ws.id, color: ws.def.color, evolved: !!ws.def.evolved, x, y, r, life, max: life, tick: 0, dmg: e.dmg, core, ring });
    }
    audio.play('magnet', { vol: 0.6 });
    return true;
  }

  private updateHoles(dt: number): void {
    const g = this.g;
    for (let i = this.holes.length - 1; i >= 0; i--) {
      const h = this.holes[i];
      h.life -= dt;
      const age = h.max - h.life;
      const grow = Math.min(1, age / 0.25) * (h.life < 0.25 ? h.life / 0.25 : 1);
      h.core.position.set(h.x, h.y);
      h.core.scale.set(((h.r * 0.9) / 64) * grow);
      h.ring.position.set(h.x, h.y);
      h.ring.scale.set(((h.r * 1.2) / 128) * grow * (1 + 0.06 * Math.sin(age * 12)));
      h.ring.rotation += dt * 4;
      // particles spiral in
      if (!g.reduced || Math.random() < 0.4) {
        const a = Math.random() * TAU, d = h.r * 1.6;
        g.fx.spawn('px', g.a.px.px, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, { vx: -Math.cos(a) * d * 2 - Math.sin(a) * 80, vy: -Math.sin(a) * d * 2 + Math.cos(a) * 80, life: 0.45, tint: h.color, s0: 1.4, s1: 0.2 });
      }
      // pull
      g.hash.query(h.x, h.y, h.r * 1.8, ids);
      for (const id of ids) {
        const en = g.enemies[id];
        if (!en || en.dead || en.mass >= 1) continue;
        const dx = h.x - en.x, dy = h.y - en.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > h.r * 1.8 || d < 6) continue;
        const pull = (h.evolved ? 900 : 650) * (1 - en.mass) * dt;
        en.kx += (dx / d) * pull;
        en.ky += (dy / d) * pull;
      }
      h.tick -= dt;
      if (h.tick <= 0) {
        h.tick = 0.25;
        for (const id of ids) {
          const en = g.enemies[id];
          if (!en || en.dead) continue;
          if ((en.x - h.x) ** 2 + (en.y - h.y) ** 2 > (h.r * 0.7 + en.r) ** 2) continue;
          damageEnemy(g, en, h.dmg, h.id, { noNumberIfSmall: true });
        }
      }
      if (h.life > 0) continue;
      if (h.evolved) {
        // collapse into a nova
        g.flash(h.color, 0.15);
        g.fx.ring(h.x, h.y, 6, h.r * 2, 0xffffff, 0.35, 1, true);
        g.fx.glow(h.x, h.y, h.color, h.r * 3, 0.3, 0.9, true);
        audio.play('nova', { vol: 0.7 });
        g.hash.query(h.x, h.y, h.r * 1.6 + 20, ids);
        let kills = 0;
        for (const id of ids) {
          const en = g.enemies[id];
          if (!en || en.dead) continue;
          if ((en.x - h.x) ** 2 + (en.y - h.y) ** 2 > (h.r * 1.6 + en.r) ** 2) continue;
          damageEnemy(g, en, h.dmg * 10, h.id, { kx: en.x - h.x, ky: en.y - h.y, knock: 2 });
          if (en.dead) kills++;
        }
        g.multiKill(kills, 'COLLAPSE');
      }
      h.core.destroy();
      h.ring.destroy();
      this.holes.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- flame
  private fireFlame(ws: WState, e: EffStats): boolean {
    const g = this.g;
    if (!this.w.nearest(g.px, g.py, 110 * e.area)) return false;
    this.flames.push({ id: ws.id, color: ws.def.color, evolved: !!ws.def.evolved, t: 0, dur: 1.1 * e.dur, tick: 0, e });
    audio.play('dash', { pitch: 0.4, vol: 0.7 });
    return true;
  }

  private updateFlames(dt: number): void {
    const g = this.g;
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.t += dt;
      f.tick -= dt;
      const len = 100 * f.e.area, half = 0.48;
      const cones = f.e.amount;
      for (let c = 0; c < cones; c++) {
        const ang = g.faceAng + (c * TAU) / cones;
        // visuals: puffs streaming out
        for (let k = 0; k < (g.reduced ? 1 : 3); k++) {
          const a = ang + (Math.random() - 0.5) * half * 1.6;
          const sp = len * (2.2 + Math.random());
          g.fx.spawn('soft', g.a.soft.puff, g.px + Math.cos(ang) * 10, g.py + Math.sin(ang) * 10 - 4, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, s0: 0.25, s1: 0.9 * Math.sqrt(f.e.area), alpha: 0.6, tint: Math.random() < 0.3 ? 0xffc8ff : f.color, drag: 2 });
        }
        if (f.tick > 0) continue;
        g.hash.query(g.px, g.py, len + 30, ids);
        for (const id of ids) {
          const en = g.enemies[id];
          if (!en || en.dead) continue;
          const dx = en.x - g.px, dy = en.y - g.py;
          const d = Math.hypot(dx, dy);
          if (d > len + en.r) continue;
          if (d > en.r + 6 && Math.abs(angleDiff(ang, Math.atan2(dy, dx))) > half) continue;
          damageEnemy(g, en, f.e.dmg, f.id, { kx: dx / (d || 1), ky: dy / (d || 1), knock: f.e.knock, noNumberIfSmall: true });
        }
        if (f.evolved && Math.random() < 0.35) {
          const d = len * (0.4 + Math.random() * 0.5);
          g.zones.push({ x: g.px + Math.cos(ang) * d, y: g.py + Math.sin(ang) * d, r: 16 * f.e.area, life: 1.6, max: 1.6, tick: 0.2, dmg: f.e.dmg * 0.6, weapon: f.id, color: f.color, pool: true });
        }
      }
      if (f.tick <= 0) f.tick = 0.1;
      if (f.t >= f.dur) this.flames.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- spirits
  private fireSpirits(ws: WState, e: EffStats): boolean {
    const g = this.g;
    const bonus = this.summonBonus('spirits');
    const want = e.amount + bonus.amount;
    const evolved = !!ws.def.evolved;
    let alive = 0;
    for (const p of g.projectiles) if (p.kind === 'spirit' && p.weapon === ws.id) alive++;
    // evolved spirits never fade: just top them up
    const n = evolved ? Math.max(0, want - alive) : want;
    for (let k = 0; k < n; k++) this.summon(ws.id, ws.def.color, evolved, e.dmg, (evolved ? 9999 : 4.5 * e.dur) * bonus.dur, e.speed);
    if (n) audio.play('shrine', { pitch: 0.9 });
    return true;
  }

  /** also used by the Void Pact spell */
  summon(id: string, color: number, evolved: boolean, dmg: number, life: number, speed = 1): void {
    const g = this.g;
    const a = Math.random() * TAU;
    const p = this.w.newProjRaw('spirit', id, color, evolved, g.px + Math.cos(a) * 14, g.py + Math.sin(a) * 14, 'spirit0');
    p.vx = Math.cos(a) * 120;
    p.vy = Math.sin(a) * 120;
    p.life = life;
    p.dmg = dmg;
    p.r = 7;
    p.spin = speed;
    p.phase = Math.random() * TAU;
    g.fx.glow(p.x, p.y, color, 30, 0.3, 0.6);
  }

  private stepSpirit(p: Projectile, dt: number): boolean {
    const g = this.g;
    p.life -= dt;
    p.cd -= dt;
    p.age += dt;
    if (p.life <= 0) {
      g.fx.puff(p.x, p.y, p.color, 14, 0.4, 0, -20, 0.5);
      return true;
    }
    let t = p.tgt;
    if (!t || t.dead || t.uid !== p.target || Math.hypot(t.x - g.px, t.y - g.py) > 340) {
      t = this.w.nearest(p.x, p.y, 220);
      p.tgt = t;
      p.target = t ? t.uid : 0;
    }
    let tx: number, ty: number;
    if (t) {
      tx = t.x;
      ty = t.y;
    } else {
      p.phase += dt * 2;
      tx = g.px + Math.cos(p.phase) * 34;
      ty = g.py + Math.sin(p.phase) * 34;
    }
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = 190 * p.spin;
    p.vx += ((dx / d) * sp - p.vx) * Math.min(1, dt * 5);
    p.vy += ((dy / d) * sp - p.vy) * Math.min(1, dt * 5);
    p.x += p.vx * dt + Math.sin(p.age * 9) * 0.4;
    p.y += p.vy * dt + Math.cos(p.age * 7) * 0.4;
    p.p.x = p.x;
    p.p.y = p.y;
    p.p.texture = g.a.px[Math.floor(p.age * 8) % 2 ? 'spirit1' : 'spirit0'];
    p.p.scaleX = p.vx >= 0 ? 1 : -1;
    p.p.alpha = p.life < 0.6 ? p.life / 0.6 : 0.95;
    if (Math.random() < 0.4) g.fx.spawn('soft', g.a.soft.glow, p.x, p.y, { s0: 0.25, s1: 0.05, life: 0.3, alpha: 0.5, tint: p.color });
    if (t && p.cd <= 0 && d < t.r + p.r) {
      p.cd = 0.35;
      damageEnemy(g, t, p.dmg, p.weapon, { kx: p.vx / 190, ky: p.vy / 190, knock: 40 });
      g.fx.sparks(t.x, t.y, p.color, 3, 120, 0.2);
      // Void Legion: kills call more spirits (capped)
      if (t.dead && p.evolved && Math.random() < 0.3) {
        let n = 0;
        for (const q of g.projectiles) if (q.kind === 'spirit') n++;
        if (n < 16) this.summon(p.weapon, p.color, false, p.dmg * 0.7, 4, p.spin);
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- shared projectile stepping
  /** returns true when the projectile is finished */
  step(p: Projectile, dt: number): boolean {
    switch (p.kind) {
      case 'shard':
        return this.stepShard(p, dt);
      case 'bomb':
        return this.stepBomb(p, dt);
      case 'round':
        return this.stepRound(p, dt);
      case 'bolt':
        return this.stepBolt(p, dt);
      case 'spirit':
        return this.stepSpirit(p, dt);
      default:
        return true;
    }
  }

  private stepShard(p: Projectile, dt: number): boolean {
    const g = this.g;
    p.life -= dt;
    if (p.life <= 0) {
      if (p.evolved) g.fx.sparks(p.x, p.y, p.color, 2, 80, 0.2);
      return true;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.p.x = p.x;
    p.p.y = p.y;
    if (Math.random() < 0.5) g.fx.spawn('px', g.a.px.px, p.x, p.y, { life: 0.25, tint: 0xdff8ff, s0: 1, s1: 0.2, vx: -p.vx * 0.05, vy: -p.vy * 0.05 });
    let done = false;
    this.w.hitAlong(p, (en) => {
      damageEnemy(g, en, p.dmg, p.weapon, { kx: p.vx / 320, ky: p.vy / 320, knock: p.knock });
      if (!en.dead && en.kind !== 'boss') {
        en.frozen = Math.max(en.frozen, en.kind === 'normal' ? p.freeze : p.freeze * 0.35);
        g.fx.spawn('px', g.a.px.shard, en.x, en.y, { life: 0.3, tint: 0xdff8ff, s0: 1.5, s1: 0.5 });
      }
      if (p.pierce >= 0) {
        p.pierce--;
        if (p.pierce < 0) {
          done = true;
          return true;
        }
      }
      return false;
    });
    return done;
  }

  private stepBolt(p: Projectile, dt: number): boolean {
    const g = this.g;
    p.life -= dt;
    if (p.life <= 0) return true;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.p.x = p.x;
    p.p.y = p.y;
    let hit = false;
    this.w.hitAlong(p, (en) => {
      damageEnemy(g, en, p.dmg, p.weapon, { kx: p.vx / 430, ky: p.vy / 430, knock: p.knock });
      g.fx.sparks(p.x, p.y, p.color, 2, 120, 0.15);
      hit = true;
      return true;
    });
    return hit;
  }

  update(dt: number): void {
    this.updateBeams(dt);
    this.updateFlames(dt);
    this.updateHoles(dt);
    this.updateTurrets(dt);
  }

  clear(): void {
    for (const t of [...this.turrets]) this.removeTurret(t);
    for (const h of this.holes) {
      h.core.destroy();
      h.ring.destroy();
    }
    this.holes = [];
    this.beams = [];
    this.flames = [];
  }
}
