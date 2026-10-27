/**
 * Things on the map you interact with: chests (cost coins earned in the run,
 * price rises with each one opened) and shrines (stand inside to charge).
 * Also draws off-screen markers so you can find them.
 */
import { Graphics, Sprite, Text } from 'pixi.js';
import { audio } from '../audio/audio';
import { TAU } from '../core/math';
import { normalize } from '../data/rarity';
import { chestOdds } from '../systems/offers';
import { rollShop, type ShopItem } from '../systems/shop';
import type { Game } from './game';

export interface ChestOpts {
  free?: boolean;
  minRarity?: number;
  legendary?: boolean;
  /** the end-of-story Victory Cache: permanent rewards instead of an item */
  victory?: boolean;
}

interface Chest {
  x: number;
  y: number;
  free: boolean;
  minRarity: number;
  legendary: boolean;
  victory: boolean;
  opened: boolean;
  fade: number;
  sprite: Sprite;
  glow: Sprite;
  label: Text;
  denyT: number;
  age: number;
}

interface Shrine {
  x: number;
  y: number;
  cursed: boolean;
  charge: number;
  spent: boolean;
  sprite: Sprite;
  label: Text;
}

interface Drone {
  x: number;
  y: number;
  tier: number;
  items: ShopItem[] | null;
  sprite: Sprite;
  glow: Sprite;
  label: Text;
  inside: boolean;
  /** seconds left before it leaves (Infinity = until told to leave) */
  life: number;
  leaving: number;
  t: number;
}

/** what the HUD shows when you stand next to a chest */
export interface ChestFocus {
  sx: number;
  sy: number;
  price: number;
  affordable: boolean;
  free: boolean;
  legendary: boolean;
  victory: boolean;
  odds: number[];
}

const SHRINE_R = 42;

export class WorldObjects {
  private g: Game;
  chests: Chest[] = [];
  shrines: Shrine[] = [];
  focus: ChestFocus | null = null;
  drones: Drone[] = [];
  private ind = new Graphics();

  constructor(g: Game) {
    this.g = g;
    g.root.addChildAt(this.ind, g.root.children.length - 1);
  }

  place(): void {
    const g = this.g;
    const r = g.rng.fork(57);
    const W = g.map.width, H = g.map.height, cx = W / 2, cy = H / 2;
    const spot = (minD: number): [number, number] => {
      let x = 0, y = 0;
      for (let t = 0; t < 30; t++) {
        x = r.range(120, W - 120);
        y = r.range(120, H - 120);
        const far = Math.hypot(x - cx, y - cy) > minD;
        const clear = [...this.chests, ...this.shrines].every((o) => Math.hypot(o.x - x, o.y - y) > 260);
        if (far && clear) break;
      }
      return [x, y];
    };
    for (let i = 0; i < g.map.chests; i++) {
      const [x, y] = spot(i < 2 ? 220 : 380);
      this.spawnChest(x, y, {});
    }
    for (let i = 0; i < g.map.shrines + g.map.cursedShrines; i++) {
      const [x, y] = spot(420);
      this.spawnShrine(x, y, i >= g.map.shrines);
    }
  }

  private makeLabel(text: string, color: number): Text {
    const t = new Text({
      text,
      style: { fontFamily: '"Jersey UI", monospace', fontSize: 12, fill: color, stroke: { color: 0x05060a, width: 3 }, align: 'center' },
      resolution: Math.min(4, this.g.zoom * (window.devicePixelRatio || 1)),
    });
    t.anchor.set(0.5, 1);
    this.g.labelLayer.addChild(t);
    return t;
  }

  spawnChest(x: number, y: number, o: ChestOpts): void {
    const g = this.g;
    x = Math.min(g.map.width - 30, Math.max(30, x));
    y = Math.min(g.map.height - 30, Math.max(30, y));
    const gold = !!o.legendary || !!o.free;
    const glow = new Sprite(g.a.soft.glow);
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.tint = o.legendary ? 0xffb330 : o.free ? 0xffe28a : 0x59f3ff;
    glow.alpha = 0.35;
    glow.position.set(x, y);
    const s = new Sprite(g.a.px[gold ? 'chest_gold' : 'chest']);
    s.anchor.set(0.5, 0.7);
    s.position.set(x, y);
    if (o.legendary) s.scale.set(1.5);
    g.objectsLayer.addChild(glow, s);
    const label = this.makeLabel('', 0xffc94d);
    const c: Chest = { x, y, free: !!o.free, minRarity: o.minRarity ?? 0, legendary: !!o.legendary, victory: !!o.victory, opened: false, fade: 1, sprite: s, glow, label, denyT: 0, age: 0 };
    this.chests.push(c);
    if (o.free) {
      g.fx.ring(x, y, 4, 60, glow.tint as number, 0.5);
      g.fx.embers(x, y, 0xffe28a, 14, 80, 0.8);
    }
  }

  /** a few fresh chests within reach of where you're fighting */
  spawnNearbyChests(n: number): void {
    const g = this.g;
    for (let k = 0; k < n; k++) {
      const a = g.rng.next() * TAU;
      const d = 200 + g.rng.next() * 150;
      this.spawnChest(g.px + Math.cos(a) * d, g.py + Math.sin(a) * d, {});
    }
  }

  /** the Salvage Drone shop lands next to you */
  spawnDrone(tier: number, life = Infinity): void {
    const g = this.g;
    const a = g.rng.next() * TAU;
    const x = Math.min(g.map.width - 40, Math.max(40, g.px + Math.cos(a) * 70));
    const y = Math.min(g.map.height - 40, Math.max(40, g.py + Math.sin(a) * 70));
    const glow = new Sprite(g.a.soft.glow);
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.tint = 0x7dff8a;
    glow.alpha = 0.4;
    const sprite = new Sprite(g.a.px.salvage0);
    sprite.anchor.set(0.5, 0.6);
    g.objectsLayer.addChild(glow, sprite);
    const label = this.makeLabel('SALVAGE SHOP', 0x7dff8a);
    this.drones.push({ x, y, tier, items: null, sprite, glow, label, inside: false, life, leaving: 0, t: 0 });
    g.fx.ring(x, y, 4, 60, 0x7dff8a, 0.5);
    g.fx.embers(x, y, 0x7dff8a, 14, 80, 0.8);
    audio.play('shrineDone', { vol: 0.6 });
    g.ui.toast('A Salvage Drone landed — spend your coins!', '#7dff8a');
  }

  /** every drone takes off (the next round is starting) */
  departDrones(): void {
    for (const d of this.drones) if (!d.leaving) d.leaving = 0.01;
  }

  private updateDrones(dt: number): void {
    const g = this.g;
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      d.t += dt;
      d.life -= dt;
      if (d.life <= 0 && !d.leaving) d.leaving = 0.01;
      if (d.leaving) {
        d.leaving += dt;
        d.y -= dt * 160 * d.leaving;
        d.sprite.alpha = d.glow.alpha = Math.max(0, 1 - d.leaving);
        d.label.alpha = d.sprite.alpha;
        if (d.leaving >= 1) {
          d.sprite.destroy();
          d.glow.destroy();
          d.label.destroy();
          this.drones.splice(i, 1);
          continue;
        }
      }
      const bob = Math.sin(d.t * 3) * 3;
      d.sprite.position.set(d.x, d.y + bob - 8);
      d.sprite.texture = g.a.px[Math.floor(d.t * 10) % 2 ? 'salvage1' : 'salvage0'];
      d.glow.position.set(d.x, d.y);
      d.glow.scale.set(0.9 + 0.1 * Math.sin(d.t * 4));
      d.label.position.set(d.x, d.y - 30 + bob);
      if (d.leaving || g.playerDead) continue;
      const dist = Math.hypot(d.x - g.px, d.y - g.py);
      if (dist < 26 && !d.inside) {
        d.inside = true;
        d.items ??= rollShop(g.lootRng, g.build, g.stats.luck, d.tier, g.priceMult, g.weaponPool);
        g.openShop(d.items);
      } else if (dist > 44) d.inside = false;
    }
  }

  private spawnShrine(x: number, y: number, cursed: boolean): void {
    const g = this.g;
    const s = new Sprite(g.a.px[cursed ? 'shrine_cursed' : 'shrine']);
    s.anchor.set(0.5, 0.85);
    s.position.set(x, y);
    g.objectsLayer.addChild(s);
    const label = this.makeLabel(cursed ? 'CURSED SHRINE' : 'SHRINE', cursed ? 0xff3d7a : 0x7dff8a);
    label.position.set(x, y - 34);
    label.alpha = 0.8;
    this.shrines.push({ x, y, cursed, charge: 0, spent: false, sprite: s, label });
  }

  /** rarity odds for a chest with a minimum rarity, including luck and pity */
  oddsFor(minRarity: number): number[] {
    const base = chestOdds(this.g.chestState, this.g.stats.luck);
    return normalize(base.map((w, i) => (i < minRarity ? 0 : w)));
  }

  update(dt: number): void {
    const g = this.g;
    this.focus = null;
    this.updateDrones(dt);
    if (g.playerDead) return;
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const c = this.chests[i];
      c.age += dt;
      if (c.opened) {
        c.fade -= dt;
        c.sprite.alpha = c.glow.alpha = Math.max(0, c.fade);
        if (c.fade <= 0) {
          c.sprite.destroy();
          c.glow.destroy();
          c.label.destroy();
          this.chests.splice(i, 1);
        }
        continue;
      }
      if (c.denyT > 0) c.denyT -= dt;
      const d = Math.hypot(c.x - g.px, c.y - g.py);
      // after the boss dies, the Legendary chest flies to you if you dawdle
      if (c.legendary && g.victoryT > 8 && c.age > 3) {
        c.x += (g.px - c.x) * Math.min(1, dt * 3);
        c.y += (g.py - c.y) * Math.min(1, dt * 3);
        c.sprite.position.set(c.x, c.y);
        c.glow.position.set(c.x, c.y);
      }
      const price = g.chestCost();
      const canAfford = g.coins >= price;
      if (d < 70) {
        const sx = g.app.screen.width / 2 + (c.x - g.camX) * g.zoom;
        const sy = g.app.screen.height / 2 + (c.y - g.camY - 22) * g.zoom;
        this.focus = { sx, sy, price, affordable: canAfford, free: c.free, legendary: c.legendary, victory: c.victory, odds: c.victory ? [0, 0, 0, 0, 0] : c.legendary ? [0, 0, 0, 0, 1] : this.oddsFor(c.minRarity) };
      }
      if (d < 20 && c.age > 0.4) {
        if (c.free || c.legendary) this.open(c);
        else if (canAfford) this.open(c);
        else if (c.denyT <= 0) {
          c.denyT = 2;
          g.ui.toast(`Need ${price} coins (you have ${g.coins})`, '#ffc94d');
          audio.play('click');
        }
      }
    }
    for (const s of this.shrines) {
      if (s.spent) continue;
      const inside = Math.hypot(s.x - g.px, s.y - g.py) < SHRINE_R;
      const rate = s.cursed ? 1 / 2 : 1 / 2.8;
      if (inside) {
        s.charge = Math.min(1, s.charge + dt * rate);
        if (Math.random() < 0.4) {
          const a = Math.random() * TAU;
          g.fx.spawn('px', g.a.px.px, s.x + Math.cos(a) * SHRINE_R, s.y + Math.sin(a) * SHRINE_R, { vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60 - 20, life: 0.6, tint: s.cursed ? 0xff3d7a : 0x7dff8a, s0: 1.5, s1: 0.5 });
        }
        if (Math.random() < dt * 8) audio.play('shrine', { pitch: s.charge });
      } else s.charge = Math.max(0, s.charge - dt * 0.25);
      if (s.charge >= 1) {
        s.spent = true;
        s.sprite.texture = g.a.px.shrine_spent;
        s.label.text = s.cursed ? 'CURSE TAKEN' : 'SPENT';
        s.label.alpha = 0.4;
        g.fx.ring(s.x, s.y, 6, 90, s.cursed ? 0xff3d7a : 0x7dff8a, 0.5, 1, true);
        g.fx.embers(s.x, s.y - 10, s.cursed ? 0xff3d7a : 0x7dff8a, 24, 120, 1);
        g.flash(s.cursed ? 0xff3d7a : 0x7dff8a, 0.15);
        g.shrineCharged(s.cursed);
      }
    }
  }

  private open(c: Chest): void {
    const g = this.g;
    c.opened = true;
    c.fade = 1.2;
    c.sprite.texture = g.a.px[c.legendary || c.free ? 'chest_gold_open' : 'chest_open'];
    c.label.text = '';
    g.fx.glow(c.x, c.y, c.glow.tint as number, 80, 0.4, 0.9, true);
    g.fx.embers(c.x, c.y - 6, c.glow.tint as number, 20, 110, 0.8);
    if (c.victory) g.openVictoryCache();
    else g.openChest(c.free || c.legendary, c.minRarity, c.legendary);
  }

  draw(): void {
    const g = this.g;
    const t = g.time;
    // chest bob + price labels
    for (const c of this.chests) {
      if (c.opened) continue;
      c.glow.scale.set((c.legendary ? 1.6 : 1) * (0.9 + 0.12 * Math.sin(t * 3 + c.x)));
      const d = Math.hypot(c.x - g.px, c.y - g.py);
      if (d < 240 && d >= 70) {
        const price = g.chestCost();
        c.label.text = c.legendary ? 'LEGENDARY' : c.free ? 'FREE' : `${price} COINS`;
        c.label.style.fill = c.legendary ? 0xffb330 : c.free ? 0xffe28a : g.coins >= price ? 0xffc94d : 0x8a8f9c;
        c.label.position.set(c.x, c.y - 18 * (c.legendary ? 1.5 : 1));
        c.label.visible = true;
      } else c.label.visible = false;
    }
    // shrine circles (on the ground layer)
    const gg = g.groundGfx;
    gg.clear();
    for (const s of this.shrines) {
      if (Math.abs(s.x - g.camX) > g.viewW || Math.abs(s.y - g.camY) > g.viewH) continue;
      const col = s.cursed ? 0xff3d7a : 0x7dff8a;
      if (s.spent) {
        gg.circle(s.x, s.y, SHRINE_R).stroke({ color: 0x3a4152, width: 1, alpha: 0.5 });
        continue;
      }
      gg.circle(s.x, s.y, SHRINE_R).fill({ color: col, alpha: 0.06 + 0.03 * Math.sin(t * 3) });
      gg.circle(s.x, s.y, SHRINE_R).stroke({ color: col, width: 1.5, alpha: 0.55 });
      if (s.charge > 0) {
        gg.moveTo(s.x + SHRINE_R - 4, s.y);
        gg.arc(s.x, s.y, SHRINE_R - 4, 0, TAU * s.charge).stroke({ color: col, width: 4, alpha: 0.95 });
      }
    }
    this.drawIndicators();
  }

  /** arrows at the screen edge pointing to off-screen chests, shrines and bosses */
  private drawIndicators(): void {
    const g = this.g;
    const gfx = this.ind;
    gfx.clear();
    if (g.playerDead) return;
    const sw = g.app.screen.width, sh = g.app.screen.height;
    const margin = 26;
    const arrow = (wx: number, wy: number, color: number, size: number, maxDist: number) => {
      const sx = sw / 2 + (wx - g.camX) * g.zoom, sy = sh / 2 + (wy - g.camY) * g.zoom;
      if (sx > 0 && sy > 0 && sx < sw && sy < sh) return;
      const dist = Math.hypot(wx - g.px, wy - g.py);
      if (dist > maxDist) return;
      const dx = sx - sw / 2, dy = sy - sh / 2;
      const k = Math.min((sw / 2 - margin) / Math.abs(dx || 1e-6), (sh / 2 - margin - 40) / Math.abs(dy || 1e-6));
      const ax = sw / 2 + dx * k, ay = sh / 2 + dy * k;
      const a = Math.atan2(dy, dx);
      const c = Math.cos(a), s = Math.sin(a);
      const pts = [ax + c * size, ay + s * size, ax - c * size * 0.6 - s * size * 0.7, ay - s * size * 0.6 + c * size * 0.7, ax - c * size * 0.6 + s * size * 0.7, ay - s * size * 0.6 - c * size * 0.7];
      gfx.poly(pts).fill({ color, alpha: 0.85 }).stroke({ color: 0x05060a, width: 2, alpha: 0.8 });
    };
    for (const c of this.chests) {
      if (c.opened) continue;
      const afford = c.free || c.legendary || g.coins >= g.chestCost();
      arrow(c.x, c.y, c.legendary ? 0xffb330 : afford ? 0xffc94d : 0x6c7180, c.legendary || c.free ? 12 : 8, afford ? 2400 : 900);
    }
    for (const s of this.shrines) if (!s.spent) arrow(s.x, s.y, s.cursed ? 0xff3d7a : 0x7dff8a, 7, 1100);
    for (const d of this.drones) if (!d.leaving) arrow(d.x, d.y, 0x7dff8a, 13, 99999);
    for (const e of g.enemies) if (!e.dead && (e.kind === 'boss' || e.kind === 'mini')) arrow(e.x, e.y, 0xff4d4d, 13, 99999);
  }
}
