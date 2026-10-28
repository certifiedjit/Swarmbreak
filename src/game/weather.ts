/**
 * Snow for the Frozen Archive: a light layer of flakes drifting with the wind
 * (thinner with Reduced effects), footprints that fade behind you, and a
 * whiteout every few minutes — heavier snow, a steady gust and white fog at the
 * edges of the screen. The fog and flakes sit under bullets and telegraphs, so
 * those always stay visible.
 */
import { Sprite, Texture } from 'pixi.js';
import { audio } from '../audio/audio';
import type { Game } from './game';
import { PLayer, type PP } from './layers';

interface Flake {
  p: PP;
  /** fall speed and sideways drift; z = nearness (bigger, faster) */
  vy: number;
  vx: number;
  z: number;
  ph: number;
}

interface Print {
  p: PP;
  life: number;
}

/** radius (canvas px) of the clear hole in the fog texture */
const FOG_HOLE = 80;

/** white fog with a soft clear hole in the middle */
function fogCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgb(232, 242, 252)';
  x.fillRect(0, 0, 1024, 1024);
  x.globalCompositeOperation = 'destination-out';
  const gr = x.createRadialGradient(512, 512, FOG_HOLE * 0.6, 512, 512, FOG_HOLE * 3.2);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 1024, 1024);
  return c;
}

/** first whiteout, then the gap between them, and how long one lasts (seconds) */
export const WHITEOUT = { first: 95, every: [150, 210] as [number, number], last: 22, warn: 4 };

export class Weather {
  readonly snow: PLayer;
  readonly prints: PLayer;
  readonly fog = new Sprite();
  private g: Game;
  private flakes: Flake[] = [];
  private printList: Print[] = [];
  private printDist = 0;
  private printSide = 1;
  private lastX = 0;
  private lastY = 0;
  /** seconds until the next whiteout, and seconds left in the current one */
  whiteoutIn = WHITEOUT.first;
  whiteoutT = 0;
  private warned = false;
  private fogA = 0;
  readonly on: boolean;

  constructor(g: Game) {
    this.g = g;
    this.on = !!g.map.snow;
    this.snow = new PLayer(g.a.px.px);
    this.prints = new PLayer(g.a.px.px, { rotation: false });
    if (this.on) this.fog.texture = Texture.from(fogCanvas());
    this.fog.anchor.set(0.5);
    this.fog.alpha = 0;
    this.fog.visible = false;
    this.lastX = g.px;
    this.lastY = g.py;
  }

  get whiteout(): boolean {
    return this.whiteoutT > 0;
  }

  /** simulation: the whiteout schedule and its steady gust */
  tick(dt: number): void {
    if (!this.on) return;
    const g = this.g;
    if (this.whiteoutT > 0) {
      this.whiteoutT -= dt;
      // a steady side-wind you can walk against
      if (!g.playerDead && g.dashT <= 0) g.px = Math.max(16, g.px - 28 * dt);
      if (this.whiteoutT <= 0) {
        this.whiteoutIn = WHITEOUT.every[0] + Math.random() * (WHITEOUT.every[1] - WHITEOUT.every[0]);
        g.ui.toast('The whiteout passes.', '#cfefff');
      }
      return;
    }
    if (g.victoryT >= 0) return;
    this.whiteoutIn -= dt;
    if (!this.warned && this.whiteoutIn <= WHITEOUT.warn) {
      this.warned = true;
      g.ui.toast('The wind is rising…', '#cfefff');
      audio.play('warn', { vol: 0.3, pitch: 0.5 });
    }
    if (this.whiteoutIn <= 0) {
      this.whiteoutT = WHITEOUT.last;
      this.warned = false;
      g.ui.banner('WHITEOUT', 'Heavy snow. Stay sharp — the warnings still show.', '#dff4ff');
      g.ui.edgePulse('#eaf6ff', 0.6);
      audio.play('dash', { vol: 0.5, pitch: 0.35 });
    }
  }

  /** visuals: flakes, footprints and fog follow the camera every frame */
  draw(dt: number): void {
    if (!this.on) return;
    const g = this.g;
    const reduced = g.reduced;
    const heavy = this.whiteout;
    const want = heavy ? (reduced ? 150 : 420) : reduced ? 55 : 170;
    while (this.flakes.length < want) this.addFlake(true);
    while (this.flakes.length > want) this.snow.release(this.flakes.pop()!.p);
    const hw = g.viewW / 2 + 30, hh = g.viewH / 2 + 30;
    const windX = (heavy ? -150 : -22) + g.hazards.windX * 0.35;
    const windY = g.hazards.windY * 0.35;
    for (const f of this.flakes) {
      const p = f.p;
      f.ph += dt;
      p.x += (f.vx + windX * f.z + Math.sin(f.ph * 1.7) * 8) * dt;
      p.y += (f.vy * f.z + windY * f.z) * dt;
      // wrap around the view
      if (p.x < g.camX - hw) p.x += hw * 2;
      else if (p.x > g.camX + hw) p.x -= hw * 2;
      if (p.y < g.camY - hh) p.y += hh * 2;
      else if (p.y > g.camY + hh) p.y -= hh * 2;
    }
    // footprints in the snow
    const d = Math.hypot(g.px - this.lastX, g.py - this.lastY);
    if (d < 40 && !g.playerDead) this.printDist += d;
    if (this.printDist > 11) {
      this.printDist = 0;
      this.printSide = -this.printSide;
      const a = Math.atan2(g.py - this.lastY, g.px - this.lastX);
      const ox = -Math.sin(a) * 3 * this.printSide, oy = Math.cos(a) * 3 * this.printSide;
      const p = this.prints.acquire(g.a.px.px, g.px + ox, g.py + 10 + oy);
      p.tint = 0x7f9ab8;
      p.scaleX = 1.3;
      p.scaleY = 0.9;
      this.printList.push({ p, life: 9 });
      if (this.printList.length > 140) this.prints.release(this.printList.shift()!.p);
    }
    this.lastX = g.px;
    this.lastY = g.py;
    for (let i = this.printList.length - 1; i >= 0; i--) {
      const pr = this.printList[i];
      pr.life -= dt;
      pr.p.alpha = Math.min(0.55, pr.life / 9);
      if (pr.life <= 0) {
        this.prints.release(pr.p);
        this.printList.splice(i, 1);
      }
    }
    // whiteout fog closes in at the edges
    const fogWant = heavy ? (reduced ? 0.4 : 0.55) : 0;
    this.fogA += (fogWant - this.fogA) * Math.min(1, dt * 0.8);
    this.fog.visible = this.fogA > 0.01;
    if (this.fog.visible) {
      this.fog.position.set(g.px, g.py);
      // the clear circle around you shrinks as the whiteout thickens
      this.fog.scale.set((150 - 40 * this.fogA) / FOG_HOLE);
      this.fog.alpha = this.fogA;
    }
  }

  private addFlake(anywhere: boolean): void {
    const g = this.g;
    const z = 0.5 + Math.random() * 0.9;
    const x = g.camX + (Math.random() - 0.5) * (g.viewW + 60);
    const y = anywhere ? g.camY + (Math.random() - 0.5) * (g.viewH + 60) : g.camY - g.viewH / 2 - 20;
    const p = this.snow.acquire(g.a.px.px, x, y);
    p.tint = z > 1.1 ? 0xffffff : 0xdbe8f6;
    p.alpha = 0.45 + z * 0.35;
    p.scaleX = p.scaleY = 0.5 + z * 0.55;
    this.flakes.push({ p, vy: 26 + Math.random() * 18, vx: (Math.random() - 0.5) * 10, z, ph: Math.random() * 6 });
  }
}
