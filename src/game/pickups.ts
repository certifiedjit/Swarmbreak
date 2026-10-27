/**
 * XP gems, coins, food, magnets and bombs. Pooled and batched in one
 * ParticleContainer. When too many gems lie around they merge into bigger
 * ones so the count stays bounded.
 */
import { audio } from '../audio/audio';
import { TAU } from '../core/math';
import { gemTier } from '../systems/xp';
import { GEM_COLORS } from '../render/fxArt';
import type { Game } from './game';
import type { Pickup, PickupKind } from './types';

const MAX_PICKUPS = 900;

export class Pickups {
  private g: Game;
  list: Pickup[] = [];
  private pool: Pickup[] = [];
  private gemSoundT = 0;

  constructor(g: Game) {
    this.g = g;
  }

  drop(kind: PickupKind, x: number, y: number, value: number, vx?: number, vy?: number): void {
    const g = this.g;
    if (kind === 'gem' && this.list.length >= MAX_PICKUPS) {
      // merge into a random existing gem instead of adding another
      for (let tries = 0; tries < 6; tries++) {
        const o = this.list[(Math.random() * this.list.length) | 0];
        if (o.kind === 'gem' && !o.attracted) {
          o.value += value;
          o.p.texture = g.a.px[`gem${gemTier(o.value)}`];
          return;
        }
      }
    }
    const a = Math.random() * TAU;
    const s = 30 + Math.random() * 40;
    const p = this.pool.pop() ?? ({} as Pickup);
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx ?? Math.cos(a) * s;
    p.vy = vy ?? Math.sin(a) * s;
    p.value = value;
    p.attracted = false;
    p.speed = 0;
    p.t = Math.random() * 3;
    const tex = kind === 'gem' ? `gem${gemTier(value)}` : kind === 'coin' ? 'coin0' : kind;
    p.p = g.pickupLayer.acquire(g.a.px[tex], x, y);
    this.list.push(p);
    if (kind === 'food' || kind === 'magnet' || kind === 'bomb') g.fx.glow(x, y, kind === 'food' ? 0x7dff8a : kind === 'magnet' ? 0x59f3ff : 0xff5a3d, 30, 0.5, 0.6);
  }

  /** pull every gem and coin on the map to the player */
  attractAll(includeItems = false): void {
    for (const p of this.list) {
      if (p.kind === 'gem' || p.kind === 'coin' || includeItems) {
        p.attracted = true;
        p.speed = Math.max(p.speed, 120);
      }
    }
  }

  update(dt: number): void {
    const g = this.g;
    const R = g.stats.pickupRange;
    const R2 = R * R;
    const arr = this.list;
    const px = g.px, py = g.py;
    this.gemSoundT -= dt;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.t += dt;
      const dx = px - p.x, dy = py - p.y;
      const d2 = dx * dx + dy * dy;
      // items (food/magnet/bomb) need you to walk to them; gems and coins are magnetised
      const reach = p.kind === 'gem' || p.kind === 'coin' ? R2 : 18 * 18;
      if (!p.attracted && d2 < reach && !g.playerDead) {
        p.attracted = true;
        p.speed = 60;
        // tiny kick away first so they "pop" toward you
        const d = Math.sqrt(d2) || 1;
        p.vx = (-dx / d) * 70;
        p.vy = (-dy / d) * 70;
      }
      if (p.attracted && !g.playerDead) {
        const d = Math.sqrt(d2) || 1;
        p.speed = Math.min(1100, p.speed + 1300 * dt);
        const k = Math.min(1, dt * 9);
        p.vx += ((dx / d) * p.speed - p.vx) * k;
        p.vy += ((dy / d) * p.speed - p.vy) * k;
        if (d < 10 + p.speed * dt) {
          this.collect(p);
          g.pickupLayer.release(p.p);
          arr[i] = arr[arr.length - 1];
          arr.pop();
          this.pool.push(p);
          continue;
        }
      } else {
        const k = Math.exp(-5 * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const q = p.p;
      q.x = p.x;
      q.y = p.y + (p.attracted ? 0 : Math.sin(p.t * 4) * 1.2);
      if (p.kind === 'coin') q.texture = g.a.px[`coin${Math.floor(p.t * 8) % 4}`];
      else if (p.kind !== 'gem') q.scaleX = q.scaleY = 1 + 0.12 * Math.sin(p.t * 6);
    }
  }

  private collect(p: Pickup): void {
    const g = this.g;
    switch (p.kind) {
      case 'gem': {
        g.addXp(p.value);
        if (this.gemSoundT <= 0) {
          audio.play('gem');
          this.gemSoundT = 0.03;
        }
        if (!g.reduced || Math.random() < 0.3) g.fx.spawn('soft', g.a.soft.glow, g.px, g.py, { s0: 0.25, s1: 0.05, life: 0.18, alpha: 0.6, tint: GEM_COLORS[gemTier(p.value)] });
        break;
      }
      case 'coin':
        g.addCoins(p.value);
        audio.play('coin');
        g.fx.spawn('px', g.a.px.star, g.px + (Math.random() - 0.5) * 10, g.py - 14, { vy: -40, life: 0.4, tint: 0xffc94d, s0: 1, s1: 0.4 });
        break;
      case 'food':
        g.heal(Math.max(25, g.stats.maxHp * 0.2));
        audio.play('heal');
        g.fx.ring(g.px, g.py, 6, 34, 0x7dff8a, 0.3);
        break;
      case 'magnet':
        this.attractAll();
        audio.play('magnet');
        g.fx.ring(g.px, g.py, 500, 10, 0x59f3ff, 0.6);
        g.ui.toast('Magnet! Every gem is yours.', '#59f3ff');
        break;
      case 'bomb':
        audio.play('bomb');
        g.flash(0xffd7a0, 0.35);
        g.ui.edgePulse('#ff8a3d', 0.7);
        g.fx.ring(g.px, g.py, 10, 260, 0xff8a3d, 0.55, 1, true);
        g.fx.glow(g.px, g.py, 0xff8a3d, 300, 0.4, 0.6, true);
        g.hitStop(0.06);
        g.multiKill(g.areaDamage(g.px, g.py, 260, 40 + 10 * g.level, 'bomb', 400, { raw: true, bossCap: 0.015 }), 'BOOM');
        break;
    }
  }

  clear(): void {
    for (const p of this.list) this.g.pickupLayer.release(p.p);
    this.list.length = 0;
  }
}
