/**
 * Mini-bosses and main bosses. Every attack is telegraphed on the ground
 * before it lands. Bosses are drawn as regular sprites (too big to batch).
 *
 * Mini-bosses (one twist each):
 *   rogue_mech   shielded: raises a barrier you must wait out; charges, radial bursts
 *   swarm_queen  summoner: calls drone swarms; aimed fans, dive-bomb
 *
 * Main boss: the Fallen Star-Titan, 3 phases (HP thresholds in BossDef.phases)
 *   P1  stomps under you, cannon fans
 *   P2  + adds, rotating spiral barrage, sweeping core beam
 *   P3  cracked core: core novas, meteor rain, faster everything
 *
 * To add a boss: add a BossDef/MiniBossDef in src/data/enemies.ts, a sprite in
 * src/render/enemyArt.ts, and an attack pattern function below keyed by id.
 */
import { Container, Sprite, Text } from 'pixi.js';
import { audio } from '../audio/audio';
import { TAU, clamp } from '../core/math';
import { save } from '../core/save';
import { BOSSES, ELITE_MODS, ENEMY_DAMAGE_SCALE, MINIBOSSES } from '../data/enemies';
import { bossTitle, eliteName } from '../data/names';
import { SPELLS } from '../data/spells';
import { endlessParams } from '../systems/endless';
import { newEnemyBase, spawnEnemy } from './enemies';
import type { Game } from './game';
import type { BossState, Enemy } from './types';

const INTRO_TIME = 2.2;
const FAR_DIST = 520;
const FAR_TIME = 3;

function spawnSpot(g: Game, dist: number): [number, number] {
  for (let i = 0; i < 12; i++) {
    const a = g.rng.next() * TAU;
    const x = g.px + Math.cos(a) * dist, y = g.py + Math.sin(a) * dist;
    if (x > 80 && y > 80 && x < g.map.width - 80 && y < g.map.height - 80) return [x, y];
  }
  return [clamp(g.px + dist, 80, g.map.width - 80), clamp(g.py, 80, g.map.height - 80)];
}

function makeView(g: Game, e: Enemy, tex: Sprite['texture'], glowColor: number, anchorY: number): BossState['sprite'] {
  const view = new Container();
  const shadow = new Sprite(g.a.soft.glow);
  shadow.anchor.set(0.5);
  shadow.tint = 0x000000;
  shadow.alpha = 0.55;
  shadow.scale.set((e.r * 2.6) / 64, (e.r * 1.0) / 64);
  shadow.position.set(0, e.r * 0.7);
  const glow = new Sprite(g.a.soft.glow);
  glow.anchor.set(0.5);
  glow.blendMode = 'add';
  glow.tint = glowColor;
  glow.alpha = 0.45;
  glow.scale.set((e.r * 4) / 64);
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, anchorY);
  view.addChild(shadow, glow, sprite);
  view.position.set(e.x, e.y);
  g.bigLayer.addChild(view);
  e.view = view;
  return sprite;
}

function addBoss(g: Game, e: Enemy): void {
  g.enemies.push(e);
  g.bossActive = e;
  const id = e.boss!.id;
  if (!save.data.codex.enemies.includes(id)) {
    save.data.codex.enemies.push(id);
    save.write();
  }
}

// ---------------------------------------------------------------- spawning

export function spawnMiniboss(g: Game, id: string, index: number, clone?: { x: number; y: number; hp: number; maxHp: number; name: string }): Enemy {
  const def = MINIBOSSES[id];
  const [x, y] = clone ? [clone.x, clone.y] : spawnSpot(g, 230);
  const e = newEnemyBase(g, x, y);
  const spec = g.flow?.spec;
  const hpM = (spec ? spec.hpMult : endlessParams(g.endlessT).hpMult) * g.mods.hp;
  const dmgM = (spec ? spec.dmgMult : endlessParams(g.endlessT).dmgMult) * g.mods.dmg;
  e.kind = 'mini';
  e.sprite = def.sprite;
  e.r = def.radius;
  e.maxHp = e.hp = def.hp * hpM * (1 + 0.1 * index);
  e.speed = def.speed;
  e.dmg = def.damage * dmgM * ENEMY_DAMAGE_SCALE;
  e.mass = 1;
  e.color = def.color;
  e.countsForMeter = false;
  if (clone) {
    e.maxHp = clone.maxHp;
    e.hp = clone.hp;
  }
  const aura = ELITE_MODS[def.twist].aura;
  const name = clone ? clone.name : eliteName(g.rng);
  const sprite = makeView(g, e, g.a.enemy[def.sprite][0], aura, 0.55);
  const label = new Text({
    text: name,
    style: { fontFamily: 'Silkscreen, monospace', fontSize: 10, fill: aura, stroke: { color: 0x05060a, width: 3 }, align: 'center' },
    resolution: Math.min(4, g.zoom * (window.devicePixelRatio || 1)),
  });
  label.anchor.set(0.5, 1);
  label.visible = false; // the HUD boss bar already shows the name
  g.labelLayer.addChild(label);
  e.elite = { name, mod: def.twist, aura: null, label, timer: 4 };
  e.boss = {
    id, name, title: `${def.name} · ${ELITE_MODS[def.twist].label}`, isMain: false, phase: 0, attackT: INTRO_TIME + 1.2, attackIdx: 0, addsT: 3,
    spiralT: 0, spiralAng: 0, spiralArms: 0, sprite, glow: e.view!.children[1] as Sprite, shadow: e.view!.children[0] as Sprite, shieldGfx: null,
    power: 1, spawnedAt: g.time, miniIndex: index,
  };
  if (def.twist === 'shielded') {
    const sh = new Sprite(g.a.soft.ring_thick);
    sh.anchor.set(0.5);
    sh.blendMode = 'add';
    sh.tint = aura;
    sh.scale.set((e.r * 2.8) / 128);
    sh.visible = false;
    e.view!.addChild(sh);
    e.boss.shieldGfx = sh;
  }
  if (clone) {
    g.enemies.push(e);
    return e;
  }
  addBoss(g, e);
  intro(g, e, aura, false);
  return e;
}

/** spawn a main boss. isMain = the story finale; false = an Endless return (scaled by power) */
export function spawnMainBoss(g: Game, bossId: string, power: number, isMain: boolean): void {
  const def = BOSSES[bossId];
  const [x, y] = spawnSpot(g, 250);
  const e = newEnemyBase(g, x, y);
  e.kind = 'boss';
  e.sprite = def.sprite;
  e.r = def.radius;
  const endlessHp = isMain ? 1 : 0.35 * power * Math.sqrt(endlessParams(g.endlessT).hpMult);
  e.maxHp = e.hp = def.hp * endlessHp * g.mods.hp;
  e.speed = def.speed;
  e.dmg = def.damage * (isMain ? 1.6 : 1 + 0.25 * power * Math.sqrt(endlessParams(g.endlessT).dmgMult)) * ENEMY_DAMAGE_SCALE * g.mods.dmg;
  e.mass = 1;
  e.color = def.color;
  e.countsForMeter = false;
  const sprite = makeView(g, e, g.a.bossArt[def.sprite].normal[0], def.color, def.anchorY ?? 0.68);
  const title = bossTitle(g.rng);
  e.boss = {
    id: def.id, name: def.name, title, isMain: true, phase: 0, attackT: INTRO_TIME + 1.5, attackIdx: 0, addsT: 6, spiralT: 0, spiralAng: 0,
    spiralArms: 0, sprite, glow: e.view!.children[1] as Sprite, shadow: e.view!.children[0] as Sprite, shieldGfx: null, power, spawnedAt: g.time, miniIndex: -1,
  };
  if (def.id === 'heart_black_sun' || def.id === 'swarm_mind') {
    // the guard ring shown while its shards hold
    const sh = new Sprite(g.a.soft.ring_thick);
    sh.anchor.set(0.5);
    sh.blendMode = 'add';
    sh.tint = def.id === 'swarm_mind' ? 0xff9ab0 : 0xc9a8ff;
    sh.scale.set((e.r * 2.9) / 128);
    sh.visible = false;
    e.view!.addChild(sh);
    e.boss.shieldGfx = sh;
  }
  addBoss(g, e);
  if (!isMain) e.boss.title = `${title} · Returned, Stronger`;
  audio.playMusic(def.music ?? g.map.bossMusic);
  intro(g, e, def.color, true);
}

/** kept for older call sites: the current map's boss */
export function spawnTitan(g: Game, power: number, isMain: boolean): void {
  spawnMainBoss(g, g.map.boss, power, isMain);
}

function intro(g: Game, e: Enemy, color: number, main: boolean): void {
  g.ui.bossIntro(e.boss!.name, e.boss!.title, main, color);
  audio.play(main ? 'bossIntro' : 'miniIntro');
  g.ui.edgePulse('#' + color.toString(16).padStart(6, '0'), 1);
  g.fx.ring(e.x, e.y, e.r * 4, 4, color, 0.8, 1, true);
  g.fx.glow(e.x, e.y, color, e.r * 6, 1, 0.7, true);
  // clear breathing room around the arrival
  for (const o of g.enemies) {
    if (o === e || o.dead || o.kind !== 'normal') continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < e.r * 2.5) {
      o.kx += ((o.x - e.x) / (d || 1)) * 400;
      o.ky += ((o.y - e.y) / (d || 1)) * 400;
    }
  }
}

// ---------------------------------------------------------------- update

export function updateBosses(g: Game, dt: number): void {
  g.eclipseR = 0;
  // the Swarm Mind's arena only stands while it does
  if (g.arena && !g.enemies.some((o) => !o.dead && o.boss?.id === 'swarm_mind')) g.arena = null;
  for (const e of g.enemies) {
    if (e.dead || !e.boss) continue;
    const b = e.boss;
    const age = g.time - b.spawnedAt;
    const ts = g.enemyTimeScale;
    if (e.shield > 0) e.shield -= dt;
    if (age < INTRO_TIME) {
      // materialise
      const k = age / INTRO_TIME;
      b.sprite.alpha = k;
      b.glow!.alpha = 0.45 + (1 - k) * 0.8;
      e.shield = 0.1;
      syncView(g, e, dt);
      continue;
    }
    if (b.moving) {
      e.shield = 0.1;
      syncView(g, e, dt);
      continue;
    }
    b.sprite.alpha = 1;
    if (catchUp(g, e, b, dt)) continue;
    b.attackT -= dt * ts;
    const ai = (b.isMain ? MAIN_AI : MINI_AI)[b.id] ?? (b.isMain ? titanAI : mechAI);
    ai(g, e, b, dt * ts);
    if (g.mods.bossBarrage && b.isMain) nightmareBarrage(g, e, b, dt * ts);
    syncView(g, e, dt);
  }
}

/** Nightmare tier: main bosses add a ring of telegraphed ground strikes around you every few seconds */
function nightmareBarrage(g: Game, e: Enemy, b: BossState, dt: number): void {
  b.barrageT = (b.barrageT ?? 6) - dt;
  if (b.barrageT > 0) return;
  b.barrageT = 7 - Math.min(2, b.phase);
  const color = 0xff4d6d;
  const n = 5 + b.phase;
  const a0 = Math.random() * Math.PI * 2;
  // one gap in the ring so there is always a way out
  for (let k = 0; k < n; k++) {
    if (k === 0) continue;
    const a = a0 + (k / n) * Math.PI * 2;
    strike(g, g.px + Math.cos(a) * 46, g.py + Math.sin(a) * 46, 30, 1.1, e.dmg * 0.6, color);
  }
  strike(g, g.px, g.py, 26, 1.3, e.dmg * 0.6, color);
  g.ui.toast('Nightmare barrage', '#ff4d6d');
}

/** A boss left far behind sinks away and re-emerges near the player, so kiting never stalls a fight. */
function catchUp(g: Game, e: Enemy, b: BossState, dt: number): boolean {
  const d = Math.hypot(g.px - e.x, g.py - e.y);
  b.farT = d > FAR_DIST ? (b.farT ?? 0) + dt : 0;
  if (b.farT < FAR_TIME) return false;
  b.farT = 0;
  b.moving = true;
  const def = b.isMain ? BOSSES[b.id] : MINIBOSSES[b.id];
  const color = def.color;
  // land ahead of where the player is heading, but never right on top of them
  const a = Math.atan2(e.y - g.py, e.x - g.px) + (Math.random() - 0.5) * 1.2;
  const tx = clamp(g.px + Math.cos(a) * 240 + g.pvx * 0.6, e.r, g.map.width - e.r);
  const ty = clamp(g.py + Math.sin(a) * 240 + g.pvy * 0.6, e.r, g.map.height - e.r);
  g.fx.ring(e.x, e.y, 10, e.r * 2.4, color, 0.5, 1, true);
  g.fx.embers(e.x, e.y, color, 24, 140, 0.8);
  b.sprite.alpha = 0.15;
  audio.play('dash', { pitch: 0.45, vol: 0.6 });
  g.ui.toast(`${b.name} follows you`, '#' + color.toString(16).padStart(6, '0'));
  g.telegraph({
    kind: 'circle', x: tx, y: ty, r: e.r * 1.1, ang: 0, len: 0, w: 0, dur: 1.2, color,
    onDone: () => {
      b.moving = false;
      if (e.dead) return;
      e.x = tx;
      e.y = ty;
      e.state = 0;
      e.view!.alpha = 1;
      b.sprite.alpha = 1;
      b.attackT = Math.max(b.attackT, 0.9);
      g.fx.ring(tx, ty, 10, e.r * 2.6, color, 0.6, 1, true);
      g.fx.puff(tx, ty + 10, 0x55584f, 30, 0.6, 0, 0, 0.5);
      audio.play('slam', { vol: 0.6 });
    },
  });
  return true;
}

function syncView(g: Game, e: Enemy, dt: number): void {
  const b = e.boss!;
  const v = e.view!;
  e.x = clamp(e.x, e.r, g.map.width - e.r);
  e.y = clamp(e.y, e.r, g.map.height - e.r);
  v.position.set(e.x, e.y);
  const dx = g.px - e.x;
  if (Math.abs(dx) > 4 && e.state !== 2) e.facing = dx > 0 ? 1 : -1;
  e.anim += dt * 3;
  const f = Math.floor(e.anim) % 2;
  // bosses are hit constantly, so a full white silhouette would strobe: use a soft tint pulse
  if (b.isMain) {
    const art = g.a.bossArt[e.sprite];
    const set = b.phase >= 2 ? art.cracked : art.normal;
    b.sprite.texture = set[f];
  } else {
    b.sprite.texture = g.a.enemy[e.sprite][f];
    b.sprite.scale.x = e.facing;
  }
  b.glow!.scale.set(((e.r * 4) / 64) * (1 + 0.08 * Math.sin(g.time * 4)));
  if (b.isMain) b.glow!.alpha = 0.35 + 0.25 * b.phase + 0.1 * Math.sin(g.time * 6);
  if (b.shieldGfx) {
    b.shieldGfx.visible = e.shield > 0 || (b.guard ?? 1) < 1;
    b.shieldGfx.alpha = 0.7 + 0.3 * Math.sin(g.time * 12);
  }
  b.sprite.tint = e.shield > 0 && !b.shieldGfx ? 0xffe0b0 : e.flash > 0 ? 0xffc8c8 : 0xffffff;
  if (e.elite?.label) e.elite.label.position.set(e.x, e.y - e.r * 1.6);
}

function toPlayer(g: Game, e: Enemy): [number, number, number] {
  const dx = g.px - e.x, dy = g.py - e.y;
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d, d];
}

function chase(g: Game, e: Enemy, dt: number, speedMul = 1, keep = 0): void {
  const [nx, ny, d] = toPlayer(g, e);
  if (d < keep) {
    e.x -= nx * e.speed * speedMul * dt;
    e.y -= ny * e.speed * speedMul * dt;
  } else {
    e.x += nx * e.speed * speedMul * dt;
    e.y += ny * e.speed * speedMul * dt;
  }
}

function ring(g: Game, x: number, y: number, n: number, speed: number, dmg: number, offset = 0, big = false, tint?: number, gap = 0): void {
  // gap: number of consecutive bullets left out (a hole to slip through)
  for (let i = gap; i < n; i++) g.fireBullet(x, y, offset + (i / n) * TAU, speed, dmg, big, tint);
}

function fan(g: Game, x: number, y: number, ang: number, n: number, spread: number, speed: number, dmg: number, big = false, tint?: number): void {
  for (let i = 0; i < n; i++) g.fireBullet(x, y, ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), speed, dmg, big, tint);
}

/** a ground strike: telegraph a circle, then hurt the player if still inside */
function strike(g: Game, x: number, y: number, r: number, delay: number, dmg: number, color: number, onHit?: () => void): void {
  g.telegraph({
    kind: 'circle', x, y, r, ang: 0, len: 0, w: 0, dur: delay, color,
    onDone: () => {
      if (g.playerDead) return;
      g.fx.ring(x, y, 4, r * 1.3, color, 0.3, 0.9, true);
      g.fx.glow(x, y, color, r * 2.2, 0.25, 0.7);
      g.fx.sparks(x, y, color, 8, 200, 0.3);
      audio.play('slam', { vol: 0.6 });
      if ((g.px - x) ** 2 + (g.py - y) ** 2 < (r + 7) ** 2) g.hurt(dmg, null);
      onHit?.();
    },
  });
}

// ---------------------------------------------------------------- Rogue Security Mech (shielded)

function mechAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  // states: 0 walk, 1 charge wind-up, 2 charging
  e.stateT -= dt;
  b.addsT -= dt;
  if (b.addsT <= 0 && e.state === 0) {
    b.addsT = 7.5;
    e.shield = 2.6;
    g.fx.ring(e.x, e.y, e.r * 3, e.r * 1.4, 0x6fb8ff, 0.35, 0.9, true);
    audio.play('shrineDone', { vol: 0.6 });
    g.ui.toast(`${b.name} raises a barrier — hold on!`, '#6fb8ff');
  }
  if (e.state === 0) {
    chase(g, e, dt, 1);
    if (b.attackT <= 0) {
      b.attackIdx++;
      const [nx, ny] = toPlayer(g, e);
      if (b.attackIdx % 2 === 1) {
        e.state = 1;
        e.stateT = 0.85;
        e.ax = nx;
        e.ay = ny;
        g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: Math.atan2(ny, nx), len: 300, w: e.r * 2.2, dur: 0.85, color: 0xff4d4d });
        audio.play('warn', { vol: 0.6 });
      } else {
        g.telegraph({
          kind: 'ring', x: e.x, y: e.y, r: e.r * 2.2, ang: 0, len: 0, w: 0, dur: 0.7, color: 0xff4d4d,
          onDone: () => {
            if (e.dead) return;
            const n = 10 + b.miniIndex * 2;
            ring(g, e.x, e.y, n, 110, e.dmg * 0.7, Math.random());
            if (b.miniIndex >= 2) setTimeoutTick(g, 0.35, () => !e.dead && ring(g, e.x, e.y, n, 90, e.dmg * 0.7, Math.random()));
            audio.play('explosion', { vol: 0.4, pitch: 1.4 });
          },
        });
      }
      b.attackT = 2.6;
    }
  } else if (e.state === 1) {
    if (e.stateT <= 0) {
      e.state = 2;
      e.stateT = 0.85;
      audio.play('dash', { pitch: 0.6 });
    }
  } else {
    e.x += e.ax * 355 * dt;
    e.y += e.ay * 355 * dt;
    if (Math.random() < 0.6) g.fx.puff(e.x, e.y + e.r * 0.6, 0x5a6270, 18, 0.5, 0, 0, 0.35);
    if (e.stateT <= 0) {
      e.state = 0;
      b.attackT = 1.4;
    }
  }
}

// ---------------------------------------------------------------- Drone Swarm Queen (summoner)

function queenAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  e.stateT -= dt;
  b.addsT -= dt;
  if (e.state === 0) {
    // circle the player at a distance
    const [nx, ny, d] = toPlayer(g, e);
    const want = 165;
    const radial = d > want + 20 ? 1 : d < want - 20 ? -1 : 0;
    e.x += (nx * radial * e.speed + -ny * e.speed * 0.8) * dt;
    e.y += (ny * radial * e.speed + nx * e.speed * 0.8) * dt;
    if (b.addsT <= 0) {
      b.addsT = 4.5;
      const n = 6 + b.miniIndex * 2;
      g.fx.ring(e.x, e.y, 6, 60, 0xd06bff, 0.4);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const s = spawnEnemy(g, 'corrupted_drone', e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, { hpMult: g.flow ? g.flow.spec.hpMult : 1, countsForMeter: false });
        s.kx = Math.cos(a) * 160;
        s.ky = Math.sin(a) * 160;
        s.xp = 1;
      }
      audio.play('miniIntro', { vol: 0.35 });
    }
    if (b.attackT <= 0) {
      b.attackIdx++;
      if (b.attackIdx % 3 === 0) {
        // dive-bomb onto where you stand
        e.state = 1;
        e.stateT = 1.05;
        e.ax = g.px;
        e.ay = g.py;
        strike(g, g.px, g.py, 46, 1.05, e.dmg * 1.3, 0xffb330, () => {
          e.x = e.ax;
          e.y = e.ay;
          e.state = 0;
          ring(g, e.x, e.y, 8, 100, e.dmg * 0.6);
        });
        g.fx.glow(e.x, e.y, 0xffb330, 80, 0.4, 0.5);
      } else {
        const [nx, ny] = toPlayer(g, e);
        g.telegraph({
          kind: 'ring', x: e.x, y: e.y, r: 26, ang: 0, len: 0, w: 0, dur: 0.6, color: 0xffb330,
          onDone: () => !e.dead && fan(g, e.x, e.y, Math.atan2(ny, nx), 5 + b.miniIndex, 0.9, 130, e.dmg * 0.6),
        });
        audio.play('warn', { vol: 0.5 });
      }
      b.attackT = 2.3;
    }
  } else {
    // rising before the dive: fade out, then reappear at the target
    e.view!.alpha = Math.max(0.15, e.stateT);
    e.shield = 0.05;
    if (e.stateT <= -0.1) e.state = 0;
  }
  if (e.state === 0) e.view!.alpha = 1;
}

// ---------------------------------------------------------------- The Fallen Star-Titan

function titanAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  const def = BOSSES[b.id];
  const frac = e.hp / e.maxHp;
  // phase transitions
  const nextPhase = b.phase + 1;
  if (nextPhase < def.phases.length && frac <= def.phases[nextPhase]) {
    b.phase = nextPhase;
    e.shield = 1.6;
    b.attackT = 2;
    b.spiralT = 0;
    g.flash(0xff7a2a, 0.35);
    g.ui.edgePulse('#ff7a2a', 1);
    g.fx.ring(e.x, e.y, 10, 260, 0xff7a2a, 0.7, 1, true);
    g.fx.embers(e.x, e.y, 0xffb36b, 50, 180, 1.2);
    g.hitStop(0.12);
    audio.play('bossIntro', { vol: 0.6 });
    g.ui.banner(b.phase === 1 ? 'THE CORE FLARES' : 'THE CORE CRACKS OPEN', `Phase ${b.phase + 1} of ${def.phases.length}`, '#ff7a2a');
    if (b.phase === 2) e.speed = def.speed * 1.45;
    // push the swarm away from the titan
    for (const o of g.enemies) {
      if (o.dead || o.kind !== 'normal') continue;
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d < 200) {
        o.kx += ((o.x - e.x) / (d || 1)) * 500;
        o.ky += ((o.y - e.y) / (d || 1)) * 500;
      }
    }
  }
  const p = b.phase;
  const dmg = e.dmg;
  chase(g, e, dt, b.spiralT > 0 ? 0.3 : 1, 70);

  // continuous spiral barrage (phase 2+)
  if (b.spiralT > 0) {
    b.spiralT -= dt;
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = p >= 2 ? 0.1 : 0.14;
      b.spiralAng += p >= 2 ? 0.33 : 0.27;
      for (let k = 0; k < b.spiralArms; k++) g.fireBullet(e.x, e.y - 10, b.spiralAng + (k / b.spiralArms) * TAU, 95, dmg * 0.45, false);
    }
  }

  // adds
  if (p >= 1) {
    b.addsT -= dt;
    if (b.addsT <= 0) {
      b.addsT = p >= 2 ? 7 : 9;
      const n = p >= 2 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const a = Math.random() * TAU;
        const hp = g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult;
        spawnEnemy(g, k === 0 ? 'scrap_hulk' : 'void_spawn', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, { hpMult: hp, dmgMult: 1.2, countsForMeter: false });
      }
      g.fx.ring(e.x, e.y, 10, 120, 0xff7a2a, 0.4);
    }
  }

  if (b.attackT > 0) return;
  b.attackIdx++;
  const patterns = p === 0 ? ['stomp', 'cannon', 'stomp', 'cannon2'] : p === 1 ? ['stomp', 'spiral', 'beam', 'cannon2', 'stomp3'] : ['nova', 'meteors', 'spiral', 'beam', 'stomp3', 'nova'];
  const pat = patterns[b.attackIdx % patterns.length];
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  switch (pat) {
    case 'stomp':
      strike(g, g.px, g.py, 52, 1.1, dmg * 1.1, 0xff7a2a);
      strike(g, g.px + g.pvx * 0.8, g.py + g.pvy * 0.8, 40, 1.4, dmg * 0.9, 0xff7a2a);
      b.attackT = 2.4;
      break;
    case 'stomp3':
      for (let k = 0; k < 3; k++) strike(g, g.px + g.pvx * 0.4 * k + (Math.random() - 0.5) * 40, g.py + g.pvy * 0.4 * k + (Math.random() - 0.5) * 40, 44, 1.0 + k * 0.3, dmg, 0xff7a2a);
      b.attackT = 2.2;
      break;
    case 'cannon':
    case 'cannon2': {
      const ax = e.x + e.facing * 40, ay = e.y - 10;
      g.telegraph({
        kind: 'line', x: ax, y: ay, r: 0, ang: Math.atan2(g.py - ay, g.px - ax), len: 260, w: 34, dur: 0.75, color: 0xffb36b,
        onDone: () => {
          if (e.dead) return;
          const a = Math.atan2(g.py - ay, g.px - ax);
          fan(g, ax, ay, a, pat === 'cannon' ? 7 : 9, 0.85, 150, dmg * 0.55, true);
          if (pat === 'cannon2') setTimeoutTick(g, 0.3, () => !e.dead && fan(g, ax, ay, a, 8, 1.0, 120, dmg * 0.5, false));
          audio.play('explosion', { vol: 0.45, pitch: 1.2 });
          g.fx.glow(ax, ay, 0xffb36b, 50, 0.2, 0.9);
        },
      });
      audio.play('warn', { vol: 0.6 });
      b.attackT = 2.3;
      break;
    }
    case 'spiral':
      g.telegraph({ kind: 'ring', x: e.x, y: e.y - 10, r: 60, ang: 0, len: 0, w: 0, dur: 0.8, color: 0xff7a2a });
      audio.play('warn', { vol: 0.6 });
      b.spiralArms = p >= 2 ? 4 : 3;
      setTimeoutTick(g, 0.8, () => {
        b.spiralT = p >= 2 ? 3.6 : 3;
        e.aux = 0;
      });
      b.attackT = 4.6;
      break;
    case 'beam': {
      const len = 520, w = 30;
      const tg = g.telegraph({ kind: 'line', x: e.x, y: e.y - 12, r: 0, ang, len, w, dur: 1.15, color: 0xffe6b0 });
      audio.play('warn', { vol: 0.7 });
      tg.onDone = () => {
        if (e.dead) return;
        const c = Math.cos(tg.ang), s = Math.sin(tg.ang);
        for (let k = 0; k < 14; k++) g.fx.spawn('soft', g.a.soft.glow, e.x + c * (k * len) / 14, e.y - 12 + s * (k * len) / 14, { s0: 0.9, s1: 0.3, life: 0.35, alpha: 0.9, tint: 0xffd27a, force: true });
        g.fx.spawn('soft', g.a.soft.beam, e.x + (c * len) / 2, e.y - 12 + (s * len) / 2, { rot: tg.ang, s0: len / 64, scaleY: (w / 24) / (len / 64), life: 0.35, tint: 0xfff3d6, force: true });
        g.flash(0xffd27a, 0.12);
        audio.play('nova', { vol: 0.6 });
        // hit test: player within the beam rectangle
        const dx = g.px - e.x, dy = g.py - (e.y - 12);
        const along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
        if (along > 0 && along < len && across < w / 2 + 6) g.hurt(dmg * 1.4, null);
      };
      b.attackT = 2.6;
      break;
    }
    case 'nova':
      g.telegraph({
        kind: 'ring', x: e.x, y: e.y - 10, r: 90, ang: 0, len: 0, w: 0, dur: 0.9, color: 0xfff3d6,
        onDone: () => {
          if (e.dead) return;
          for (let k = 0; k < 3; k++) setTimeoutTick(g, k * 0.28, () => !e.dead && ring(g, e.x, e.y - 10, 22, 105 + k * 12, dmg * 0.5, k * 0.14, k === 1));
          g.fx.ring(e.x, e.y, 10, 150, 0xffb36b, 0.4, 1, true);
          audio.play('nova');
        },
      });
      audio.play('warn', { vol: 0.7 });
      b.attackT = 2.8;
      break;
    case 'meteors':
      for (let k = 0; k < 7; k++) {
        const a = Math.random() * TAU, r = k === 0 ? 0 : 30 + Math.random() * 110;
        const x = g.px + Math.cos(a) * r, y = g.py + Math.sin(a) * r;
        strike(g, x, y, 34, 1.0 + k * 0.18, dmg * 0.9, 0xffd27a, () => g.fx.embers(x, y, 0xffb36b, 10, 120, 0.7));
      }
      audio.play('warn', { vol: 0.7 });
      b.attackT = 3;
      break;
  }
  if (p >= 2) b.attackT *= 0.8;
}

// ---------------------------------------------------------------- shared: main-boss phase changes

function checkPhase(g: Game, e: Enemy, b: BossState, lines: [string, string]): boolean {
  const def = BOSSES[b.id];
  const next = b.phase + 1;
  if (next >= def.phases.length || e.hp / e.maxHp > def.phases[next]) return false;
  b.phase = next;
  e.shield = 1.6;
  b.attackT = 2;
  b.spiralT = 0;
  const hex = '#' + def.color.toString(16).padStart(6, '0');
  g.flash(def.color, 0.35);
  g.ui.edgePulse(hex, 1);
  g.fx.ring(e.x, e.y, 10, 260, def.color, 0.7, 1, true);
  g.fx.embers(e.x, e.y, def.color, 50, 180, 1.2);
  g.hitStop(0.12);
  audio.play('bossIntro', { vol: 0.6 });
  g.ui.banner(lines[b.phase - 1] ?? 'IT GROWS ANGRIER', `Phase ${b.phase + 1} of ${def.phases.length}`, hex);
  for (const o of g.enemies) {
    if (o.dead || o.kind !== 'normal') continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < 200) {
      o.kx += ((o.x - e.x) / (d || 1)) * 500;
      o.ky += ((o.y - e.y) / (d || 1)) * 500;
    }
  }
  return true;
}

// ---------------------------------------------------------------- The Rotted High Priest (summoner: resurrects)

function priestAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  const [nx, ny, d] = toPlayer(g, e);
  // keep a pulpit distance and drift sideways
  const want = 115;
  const radial = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
  e.x += (nx * radial * e.speed + -ny * e.speed * 0.5) * dt;
  e.y += (ny * radial * e.speed + nx * e.speed * 0.5) * dt;
  b.addsT -= dt;
  if (b.addsT <= 0) {
    b.addsT = 5.5;
    // raise the fallen where they died
    const spots = g.recentDeaths.slice(-(6 + b.miniIndex * 2));
    if (!spots.length) for (let k = 0; k < 5; k++) spots.push({ x: e.x + Math.cos(k) * 60, y: e.y + Math.sin(k) * 60 });
    g.ui.toast(`${b.name} raises the dead!`, '#9bcf4a');
    audio.play('curse', { vol: 0.6 });
    g.fx.ring(e.x, e.y, 8, 70, 0x9bcf4a, 0.5, 1, true);
    for (const s of spots) {
      g.telegraph({
        kind: 'ring', x: s.x, y: s.y, r: 16, ang: 0, len: 0, w: 0, dur: 0.9, color: 0x9bcf4a,
        onDone: () => {
          if (e.dead) return;
          const hp = g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult;
          const z = spawnEnemy(g, 'bone_cultist', s.x, s.y, { hpMult: hp, countsForMeter: false });
          z.xp = 1;
          g.fx.embers(s.x, s.y, 0x9bcf4a, 8, 70, 0.6);
        },
      });
    }
  }
  if (b.attackT <= 0) {
    b.attackIdx++;
    const ang = Math.atan2(ny, nx);
    if (b.attackIdx % 3 === 0) {
      // halo nova
      g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 50, ang: 0, len: 0, w: 0, dur: 0.8, color: 0xffd34d, onDone: () => !e.dead && ring(g, e.x, e.y, 16 + b.miniIndex * 2, 95, e.dmg * 0.6, Math.random(), false, 0xffe28a) });
    } else {
      g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 24, ang: 0, len: 0, w: 0, dur: 0.6, color: 0xffd34d, onDone: () => !e.dead && fan(g, e.x, e.y - 10, ang, 7, 1.1, 120, e.dmg * 0.6, false, 0xffe28a) });
    }
    audio.play('warn', { vol: 0.5 });
    b.attackT = 2.4;
  }
}

// ---------------------------------------------------------------- Cathedral Gargoyle (fast: dives)

function gargoyleAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  e.stateT -= dt;
  if (e.state === 0) {
    const [nx, ny, d] = toPlayer(g, e);
    const want = 100;
    const radial = d > want + 20 ? 1 : d < want - 20 ? -0.6 : 0;
    e.x += (nx * radial * e.speed + ny * e.speed * 0.7) * dt;
    e.y += (ny * radial * e.speed - nx * e.speed * 0.7) * dt;
    if (b.attackT <= 0) {
      b.attackIdx++;
      if (b.attackIdx % 2 === 0) {
        // take off, then dive onto where you stand
        e.state = 1;
        e.stateT = 0.9;
        e.ax = g.px;
        e.ay = g.py;
        audio.play('dash', { pitch: 0.5 });
        strike(g, g.px, g.py, 52, 0.9, e.dmg * 1.3, 0xffb330, () => {
          e.x = e.ax;
          e.y = e.ay;
          e.state = 0;
          ring(g, e.x, e.y, 10 + b.miniIndex * 2, 110, e.dmg * 0.5, Math.random(), false, 0xd8d0c0);
          g.fx.puff(e.x, e.y + 10, 0x55584f, 40, 0.6, 0, 0, 0.5);
        });
        b.attackT = 1.6;
      } else {
        const ang = Math.atan2(ny, nx);
        g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 22, ang: 0, len: 0, w: 0, dur: 0.5, color: 0xffb330, onDone: () => !e.dead && fan(g, e.x, e.y, ang, 3 + b.miniIndex, 0.5, 150, e.dmg * 0.6, true, 0xd8d0c0) });
        b.attackT = 1.3;
      }
    }
  } else {
    // airborne: fade, untouchable
    e.view!.alpha = Math.max(0.12, e.stateT);
    e.shield = 0.05;
    if (e.stateT <= -0.2) e.state = 0;
  }
  if (e.state === 0) e.view!.alpha = 1;
}

// ---------------------------------------------------------------- The Organ-Beast

function organAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  checkPhase(g, e, b, ['THE HYMN SWELLS', 'THE ROSE WINDOW SHATTERS']);
  const p = b.phase;
  const dmg = e.dmg;
  const tint = 0xe4ff8a;
  chase(g, e, dt, 1, 150);
  const mx = e.x, my = e.y - 6;
  // continuous fugue (counter-rotating spirals)
  if (b.spiralT > 0) {
    b.spiralT -= dt;
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = p >= 2 ? 0.11 : 0.15;
      b.spiralAng += 0.29;
      for (let k = 0; k < b.spiralArms; k++) {
        g.fireBullet(mx, my, b.spiralAng + (k / b.spiralArms) * TAU, 90, dmg * 0.42, false, tint);
        g.fireBullet(mx, my, -b.spiralAng + (k / b.spiralArms) * TAU + 0.5, 80, dmg * 0.42, false, 0xffd34d);
      }
    }
  }
  if (p >= 1) {
    b.addsT -= dt;
    if (b.addsT <= 0) {
      b.addsT = p >= 2 ? 8 : 10;
      const hp = g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult;
      for (let k = 0; k < 3; k++) spawnEnemy(g, 'choir_wraith', e.x + Math.cos(k * 2.1) * 80, e.y + Math.sin(k * 2.1) * 80, { hpMult: hp, countsForMeter: false });
      for (let k = 0; k < 6; k++) spawnEnemy(g, 'candle_imp', e.x + Math.cos(k) * 60, e.y + Math.sin(k) * 60, { hpMult: hp, countsForMeter: false });
      g.fx.ring(e.x, e.y, 10, 120, 0x9bcf4a, 0.4);
      g.ui.toast('The choir answers the organ', '#9bcf4a');
    }
  }
  if (b.attackT > 0) return;
  b.attackIdx++;
  const patterns = p === 0 ? ['wave', 'chord', 'pedal', 'wave'] : p === 1 ? ['wave', 'fugue', 'chord', 'pedal', 'wave2'] : ['requiem', 'chord', 'fugue', 'wave2', 'pedal', 'requiem'];
  const pat = patterns[b.attackIdx % patterns.length];
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  switch (pat) {
    case 'wave':
    case 'wave2': {
      // a ring of sound with a gap you can slip through
      const n = pat === 'wave' ? 40 : 52;
      g.telegraph({
        kind: 'ring', x: mx, y: my, r: 70, ang: 0, len: 0, w: 0, dur: 0.8, color: 0x9bcf4a,
        onDone: () => {
          if (e.dead) return;
          const off = ang + Math.PI + (Math.random() - 0.5);
          ring(g, mx, my, n, 92, dmg * 0.5, off, false, tint, 6);
          if (pat === 'wave2') setTimeoutTick(g, 0.45, () => !e.dead && ring(g, mx, my, n, 92, dmg * 0.5, off + Math.PI, false, 0xffd34d, 6));
          g.fx.ring(mx, my, 10, 120, 0x9bcf4a, 0.4, 0.8, true);
          audio.play('nova', { vol: 0.5, pitch: 0.7 });
        },
      });
      audio.play('warn', { vol: 0.6 });
      b.attackT = 2.6;
      break;
    }
    case 'chord': {
      // three organ-pipe beams fanning toward you
      const len = 560, w = 26;
      const tgs = [-0.45, 0, 0.45].map((o) => g.telegraph({ kind: 'line', x: mx, y: my, r: 0, ang: ang + o, len, w, dur: 1.1, color: 0xffe28a }));
      tgs[1].onDone = () => {
        if (e.dead) return;
        for (const tg of tgs) {
          const c = Math.cos(tg.ang), s = Math.sin(tg.ang);
          g.fx.spawn('soft', g.a.soft.beam, mx + (c * len) / 2, my + (s * len) / 2, { rot: tg.ang, s0: len / 64, scaleY: (w / 24) / (len / 64), life: 0.35, tint: 0xfff3c0, force: true });
          const dx = g.px - mx, dy = g.py - my;
          const along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
          if (along > 0 && along < len && across < w / 2 + 6) g.hurt(dmg * 1.3, null);
        }
        g.flash(0xffe28a, 0.12);
        audio.play('nova', { vol: 0.6 });
      };
      audio.play('warn', { vol: 0.7 });
      b.attackT = 2.6;
      break;
    }
    case 'pedal':
      for (let k = 0; k < 3; k++) strike(g, g.px + g.pvx * 0.4 * k + (Math.random() - 0.5) * 50, g.py + g.pvy * 0.4 * k + (Math.random() - 0.5) * 50, 46, 1 + k * 0.25, dmg, 0x9bcf4a);
      audio.play('warn', { vol: 0.6 });
      b.attackT = 2.2;
      break;
    case 'fugue':
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 60, ang: 0, len: 0, w: 0, dur: 0.8, color: 0xffd34d });
      b.spiralArms = p >= 2 ? 4 : 3;
      setTimeoutTick(g, 0.8, () => {
        b.spiralT = 3.2;
        e.aux = 0;
      });
      audio.play('warn', { vol: 0.6 });
      b.attackT = 4.6;
      break;
    case 'requiem':
      g.telegraph({
        kind: 'ring', x: mx, y: my, r: 100, ang: 0, len: 0, w: 0, dur: 1, color: 0xfff3d6,
        onDone: () => {
          if (e.dead) return;
          for (let k = 0; k < 3; k++) setTimeoutTick(g, k * 0.4, () => !e.dead && ring(g, mx, my, 44, 100 + k * 10, dmg * 0.5, ang + k * 1.3, k === 1, k % 2 ? 0xffd34d : tint, 5));
          g.flash(0xfff3d6, 0.18);
          audio.play('nova');
        },
      });
      audio.play('warn', { vol: 0.8 });
      b.attackT = 3;
      break;
  }
  if (p >= 2) b.attackT *= 0.82;
}

// ---------------------------------------------------------------- The Twin-Headed Void Hound (fast: double lunge, twin breath)

function houndAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  e.stateT -= dt;
  const [nx, ny, d] = toPlayer(g, e);
  if (e.state === 0) {
    // circle at a pounce distance
    const want = 150;
    const radial = d > want + 25 ? 1 : d < want - 25 ? -0.7 : 0;
    e.x += (nx * radial * e.speed - ny * e.speed * 0.6) * dt;
    e.y += (ny * radial * e.speed + nx * e.speed * 0.6) * dt;
    if (e.hp < e.maxHp * 0.5 && b.addsT > 0) {
      b.addsT = -1; // howl once
      g.ui.toast(`${b.name} howls into the dark`, '#b36bff');
      audio.play('curse', { vol: 0.7, pitch: 0.6 });
      const hp = g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult;
      for (let k = 0; k < 4 + b.miniIndex; k++) {
        const a = (k / 4) * TAU;
        const z = spawnEnemy(g, 'rift_wraith', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, { hpMult: hp, countsForMeter: false });
        z.xp = 1;
      }
    }
    if (b.attackT <= 0) {
      b.attackIdx++;
      if (b.attackIdx % 2 === 1) {
        // the first head lunges...
        e.state = 1;
        e.stateT = 0.55;
        e.ax = nx;
        e.ay = ny;
        g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: Math.atan2(ny, nx), len: 230, w: 30, dur: 0.55, color: 0xb36bff });
        audio.play('warn', { vol: 0.6 });
      } else {
        // twin breath: two fans, one from each head
        const ang = Math.atan2(ny, nx);
        g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 26, ang: 0, len: 0, w: 0, dur: 0.6, color: 0xb36bff, onDone: () => {
          if (e.dead) return;
          const n = 4 + b.miniIndex;
          for (const side of [-1, 1]) fan(g, e.x - ny * 12 * side, e.y + nx * 12 * side, ang + side * 0.28, n, 0.7, 125, e.dmg * 0.5, false, 0xc9a8ff);
          audio.play('nova', { vol: 0.5, pitch: 0.8 });
        } });
        b.attackT = 2.2;
      }
    }
  } else if (e.state === 1 || e.state === 3) {
    // wind-up
    if (e.stateT <= 0) {
      e.state++;
      e.stateT = 0.3;
      audio.play('dash', { pitch: 0.6 });
    }
  } else if (e.state === 2 || e.state === 4) {
    // dash
    e.x += e.ax * 560 * dt;
    e.y += e.ay * 560 * dt;
    if (Math.random() < 0.6) g.fx.puff(e.x, e.y + 8, 0x3a2060, 16, 0.35, 0, 0, 0.35);
    if (e.stateT <= 0) {
      if (e.state === 2) {
        // ...and the second head always follows, re-aimed
        e.state = 3;
        e.stateT = 0.4;
        e.ax = nx;
        e.ay = ny;
        g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: Math.atan2(ny, nx), len: 230, w: 30, dur: 0.4, color: 0xff6bd6 });
      } else {
        e.state = 0;
        b.attackT = 1.4;
        ring(g, e.x, e.y, 10 + b.miniIndex * 2, 100, e.dmg * 0.45, Math.random(), false, 0xc9a8ff);
      }
    }
  }
}

// ---------------------------------------------------------------- The Crystal Colossus (splits in two at half health)

function colossusAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  chase(g, e, dt, 1, 90);
  if (!b.split && e.hp < e.maxHp * 0.5) {
    b.split = true;
    // the halves: each keeps what's left, and both are smaller and quicker
    const hp = e.hp;
    e.maxHp = hp;
    const [nx, ny] = toPlayer(g, e);
    const twin = spawnMiniboss(g, b.id, b.miniIndex, { x: e.x + ny * 60, y: e.y - nx * 60, hp, maxHp: hp, name: b.name });
    twin.boss!.split = true;
    twin.boss!.attackT = 1.2;
    for (const o of [e, twin]) {
      o.speed *= 1.35;
      o.r *= 0.8;
      o.view!.scale.set(0.8);
    }
    e.x -= ny * 60;
    e.y += nx * 60;
    g.flash(0xd6f6ff, 0.3);
    g.fx.ring(e.x, e.y, 10, 200, 0x7ae0ff, 0.6, 1, true);
    g.fx.sparks(e.x, e.y, 0xd6f6ff, 30, 260, 0.5);
    audio.play('explosion', { pitch: 1.4 });
    g.ui.banner('IT SPLITS IN TWO', 'Break both halves', '#7ae0ff');
    b.attackT = 1.5;
  }
  if (b.attackT > 0) return;
  b.attackIdx++;
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  const k = b.attackIdx % 3;
  if (k === 0) {
    // ground slam: an eruption of crystal around where you stand
    strike(g, g.px, g.py, 64, 1.05, e.dmg * 1.2, 0x7ae0ff, () => ring(g, g.px, g.py, 10 + b.miniIndex * 2, 110, e.dmg * 0.4, Math.random(), false, 0xd6f6ff));
    b.attackT = 2.4;
  } else if (k === 1) {
    // a line of spikes marching toward you
    for (let s = 1; s <= 5; s++) strike(g, e.x + Math.cos(ang) * s * 52, e.y + Math.sin(ang) * s * 52, 30, 0.6 + s * 0.14, e.dmg, 0x9fe8ff);
    audio.play('warn', { vol: 0.6 });
    b.attackT = 2.2;
  } else {
    g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 24, ang: 0, len: 0, w: 0, dur: 0.55, color: 0x7ae0ff, onDone: () => !e.dead && fan(g, e.x, e.y, ang, 7 + b.miniIndex, 1.0, 140, e.dmg * 0.5, true, 0xd6f6ff) });
    b.attackT = 1.9;
  }
  if (b.split) b.attackT *= 1.25; // two of them: each attacks a bit less often
}

// ---------------------------------------------------------------- The Heart of the Black Sun

function heartShards(g: Game, e: Enemy, b: BossState): void {
  const n = 4 + b.phase;
  const hpM = (b.power || 1) * (g.flow ? 1.6 : 1.2 * Math.sqrt(endlessParams(g.endlessT).hpMult));
  b.minions = [];
  for (let k = 0; k < n; k++) {
    const s = spawnEnemy(g, 'heart_shard', e.x, e.y, { hpMult: hpM, countsForMeter: false });
    s.mass = 1;
    s.xp = 3;
    b.minions.push(s);
  }
  g.fx.ring(e.x, e.y, 10, 130, 0xc9a8ff, 0.5, 1, true);
  audio.play('magnet', { vol: 0.6, pitch: 0.7 });
}

function heartAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  if (checkPhase(g, e, b, ['THE CORONA BURNS', 'ECLIPSE'])) {
    for (const m of b.minions ?? []) if (!m.dead) killEnemyQuiet(g, m);
    heartShards(g, e, b);
    b.addsT = 0;
  }
  if (!b.minions) {
    heartShards(g, e, b);
    g.ui.toast('Break the orbiting shards to expose the Heart!', '#c9a8ff');
  }
  const p = b.phase;
  const dmg = e.dmg;
  // orbiting shards
  const alive = b.minions!.filter((m) => !m.dead);
  const R = e.r + 52 + p * 8;
  const spin = g.time * (0.9 + p * 0.35);
  alive.forEach((m, i) => {
    const a = spin + (i / alive.length) * TAU;
    m.x = e.x + Math.cos(a) * R;
    m.y = e.y + Math.sin(a) * R * 0.85;
  });
  b.guard = alive.length ? 0.25 : 1;
  if (b.shieldGfx) b.shieldGfx.visible = alive.length > 0;
  if (!alive.length) {
    // exposed: the shell regrows after a window
    b.addsT += dt;
    if (b.addsT > 13 - p * 1.5) {
      b.addsT = 0;
      heartShards(g, e, b);
    } else if (b.addsT < 0.1) g.ui.toast('The Heart is exposed — strike now!', '#ffb36b');
  }
  // eclipse: the dark closes and the Heart drags you in
  if (p >= 2) {
    g.eclipseR = 200;
    const dx = e.x - g.px, dy = e.y - g.py, d = Math.hypot(dx, dy) || 1;
    if (d > e.r + 30 && !g.playerDead) {
      g.px += (dx / d) * 22 * dt;
      g.py += (dy / d) * 22 * dt;
    }
  }
  chase(g, e, dt, 1, 230);
  const mx = e.x, my = e.y;
  // continuous spiral arms
  if (b.spiralT > 0) {
    b.spiralT -= dt;
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = p >= 2 ? 0.1 : 0.13;
      b.spiralAng += 0.23;
      for (let k = 0; k < b.spiralArms; k++) {
        g.fireBullet(mx, my, b.spiralAng + (k / b.spiralArms) * TAU, 88, dmg * 0.4, false, 0xc9a8ff);
        if (p >= 2) g.fireBullet(mx, my, -b.spiralAng + (k / b.spiralArms) * TAU, 72, dmg * 0.4, false, 0xff9ae6);
      }
    }
  }
  if (b.attackT > 0) return;
  b.attackIdx++;
  const patterns = p === 0 ? ['flare', 'nova', 'spiral', 'flare'] : p === 1 ? ['flower', 'flare', 'spiral', 'rays', 'nova'] : ['supernova', 'spiral', 'rays', 'flower', 'flare', 'supernova'];
  const pat = patterns[b.attackIdx % patterns.length];
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  switch (pat) {
    case 'flare':
      // aimed solar flare: a tight fan, then a wider one
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 40, ang: 0, len: 0, w: 0, dur: 0.6, color: 0xff9a3d, onDone: () => {
        if (e.dead) return;
        fan(g, mx, my, ang, 9, 0.9, 135, dmg * 0.5, false, 0xffb36b);
        setTimeoutTick(g, 0.3, () => !e.dead && fan(g, mx, my, ang, 13, 1.7, 110, dmg * 0.45, false, 0xff9a3d));
        audio.play('nova', { vol: 0.5 });
      } });
      b.attackT = 2.3;
      break;
    case 'nova':
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 70, ang: 0, len: 0, w: 0, dur: 0.8, color: 0xb36bff, onDone: () => {
        if (e.dead) return;
        ring(g, mx, my, 36, 95, dmg * 0.5, ang + Math.PI + 0.3, true, 0xc9a8ff, 5);
        audio.play('nova', { vol: 0.6, pitch: 0.7 });
      } });
      b.attackT = 2.4;
      break;
    case 'spiral':
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 54, ang: 0, len: 0, w: 0, dur: 0.7, color: 0xc9a8ff });
      b.spiralArms = 3 + p;
      setTimeoutTick(g, 0.7, () => {
        b.spiralT = 3.4;
        e.aux = 0;
      });
      audio.play('warn', { vol: 0.6 });
      b.attackT = 5;
      break;
    case 'flower':
      // petals: interleaved rings at two speeds make a blooming flower
      for (let k = 0; k < 4; k++) setTimeoutTick(g, k * 0.32, () => !e.dead && ring(g, mx, my, 24, k % 2 ? 70 : 115, dmg * 0.42, (k * TAU) / 48, false, k % 2 ? 0xff9ae6 : 0xc9a8ff, k === 0 ? 3 : 0));
      audio.play('warn', { vol: 0.6 });
      b.attackT = 2.8;
      break;
    case 'rays': {
      // six rays of the dead sun sweep out; stand between them
      const n = 6, len = 620, w = 22;
      const off = Math.random() * TAU;
      const tgs = Array.from({ length: n }, (_, k) => g.telegraph({ kind: 'line', x: mx, y: my, r: 0, ang: off + (k / n) * TAU, len, w, dur: 1.1, color: 0xff9a3d }));
      tgs[0].onDone = () => {
        if (e.dead) return;
        for (const tg of tgs) {
          const c = Math.cos(tg.ang), s2 = Math.sin(tg.ang);
          g.fx.spawn('soft', g.a.soft.beam, mx + (c * len) / 2, my + (s2 * len) / 2, { rot: tg.ang, s0: len / 64, scaleY: (w / 24) / (len / 64), life: 0.35, tint: 0xffd0a0, force: true });
          const dx = g.px - mx, dy = g.py - my;
          const along = dx * c + dy * s2, across = Math.abs(-dx * s2 + dy * c);
          if (along > 0 && along < len && across < w / 2 + 6) g.hurt(dmg * 1.2, null);
        }
        g.flash(0xffd0a0, 0.14);
        audio.play('nova', { vol: 0.7 });
      };
      audio.play('warn', { vol: 0.7 });
      b.attackT = 2.6;
      break;
    }
    case 'supernova':
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 110, ang: 0, len: 0, w: 0, dur: 1, color: 0xfff0ff, onDone: () => {
        if (e.dead) return;
        for (let k = 0; k < 3; k++) setTimeoutTick(g, k * 0.38, () => !e.dead && ring(g, mx, my, 42, 92 + k * 12, dmg * 0.48, ang + k * 1.1, k === 1, k % 2 ? 0xff9ae6 : 0xc9a8ff, 5));
        g.flash(0xfff0ff, 0.2);
        audio.play('nova');
      } });
      audio.play('warn', { vol: 0.8 });
      b.attackT = 3.2;
      break;
  }
  if (p >= 2) b.attackT *= 0.85;
}

/** remove an enemy without drops or kill credit (a boss re-forming its shell) */
function killEnemyQuiet(g: Game, m: Enemy): void {
  g.fx.sparks(m.x, m.y, 0xc9a8ff, 6, 140, 0.3);
  m.dead = true; // cleanupEnemies recycles it
}

// ---------------------------------------------------------------- The Archivist (regenerates; reads your last spell back at you)

function archivistAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  const [nx, ny, d] = toPlayer(g, e);
  // a lectern's distance, drifting sideways; slowly rebinds its own pages
  const radial = d > 160 ? 1 : d < 110 ? -1 : 0;
  e.x += (nx * radial * e.speed - ny * e.speed * 0.55) * dt;
  e.y += (ny * radial * e.speed + nx * e.speed * 0.55) * dt;
  e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.006 * dt);
  if (b.attackT > 0) return;
  b.attackIdx++;
  const ang = Math.atan2(ny, nx);
  const dmg = e.dmg;
  const spell = g.lastSpell;
  if (b.attackIdx % 2 === 0 && spell) {
    const name = SPELLS[spell]?.name ?? 'your spell';
    g.ui.toast(`${b.name} reads your ${name} back at you`, '#7ab8ff');
    audio.play('curse', { vol: 0.5, pitch: 1.2 });
    switch (SPELLS[spell]?.kind) {
      case 'dash': {
        const len = Math.min(320, d + 80);
        g.telegraph({
          kind: 'line', x: e.x, y: e.y, r: 0, ang, len, w: 34, dur: 0.85, color: 0x7ab8ff,
          onDone: () => {
            if (e.dead) return;
            const c = Math.cos(ang), s = Math.sin(ang);
            const dx = g.px - e.x, dy = g.py - e.y;
            const along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
            if (along > 0 && along < len && across < 24) g.hurt(dmg * 1.2, null);
            g.fx.spawn('soft', g.a.soft.beam, e.x + (c * len) / 2, e.y + (s * len) / 2, { rot: ang, s0: len / 64, scaleY: 0.5, life: 0.3, tint: 0xcff0ff, force: true });
            e.x += c * len;
            e.y += s * len;
          },
        });
        break;
      }
      case 'nova':
        strike(g, e.x, e.y, 120, 1.1, dmg * 1.1, 0x7ab8ff, () => !e.dead && ring(g, e.x, e.y, 18, 110, dmg * 0.4, Math.random(), false, 0xcff0ff));
        break;
      case 'timeSlow': {
        const cx = g.px, cy = g.py;
        g.telegraph({
          kind: 'circle', x: cx, y: cy, r: 90, ang: 0, len: 0, w: 0, dur: 1.1, color: 0x9b7bff,
          onDone: () => {
            if ((g.px - cx) ** 2 + (g.py - cy) ** 2 < 96 * 96 && !g.playerDead) g.chillT = 2.6;
          },
        });
        break;
      }
      case 'heal':
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08);
        g.fx.ring(e.x, e.y, 10, 70, 0x7dff8a, 0.5);
        g.fx.embers(e.x, e.y, 0x7dff8a, 14, 60, 1);
        break;
      case 'magnet': {
        // the gems you would have pulled in, as shards closing on you
        const cx = g.px, cy = g.py;
        g.telegraph({
          kind: 'ring', x: cx, y: cy, r: 200, ang: 0, len: 0, w: 0, dur: 1, color: 0x7ab8ff,
          onDone: () => {
            if (e.dead) return;
            for (let k = 0; k < 14; k++) {
              const a = (k / 14) * TAU;
              if (k === 0 || k === 7) continue; // two gaps to slip out through
              g.fireBullet(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200, a + Math.PI, 95, dmg * 0.5, false, 0xcff0ff);
            }
          },
        });
        break;
      }
      default: {
        const hp = g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult;
        for (let k = 0; k < 6; k++) spawnEnemy(g, 'page_wraith', e.x + Math.cos(k) * 50, e.y + Math.sin(k) * 50, { hpMult: hp * g.mods.hp, countsForMeter: false });
        g.fx.ring(e.x, e.y, 8, 70, 0x7ab8ff, 0.5, 1, true);
      }
    }
    b.attackT = 2.6;
  } else {
    g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 26, ang: 0, len: 0, w: 0, dur: 0.6, color: 0x7ab8ff, onDone: () => !e.dead && fan(g, e.x, e.y, ang, 5 + b.miniIndex, 0.9, 130, dmg * 0.55, false, 0xf4ecd8) });
    audio.play('warn', { vol: 0.5 });
    b.attackT = 1.9;
  }
}

// ---------------------------------------------------------------- The Ice Wyrm (fast: burrows under the snow)

function wyrmAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  e.stateT -= dt;
  if (e.state === 1) {
    // burrowed: untouchable, a bulge in the snow racing toward you
    e.shield = 0.05;
    e.view!.alpha = 0.12;
    const [nx, ny] = toPlayer(g, e);
    e.x += nx * e.speed * 2.2 * dt;
    e.y += ny * e.speed * 2.2 * dt;
    if (Math.random() < 0.5) g.fx.puff(e.x, e.y + 8, 0xeaf6ff, 16, 0.5, 0, -12, 0.35);
    if (e.stateT <= 0) {
      e.state = 2;
      const tx = g.px + g.pvx * 0.3, ty = g.py + g.pvy * 0.3;
      e.ax = tx;
      e.ay = ty;
      strike(g, tx, ty, 58, 1.0, e.dmg * 1.3, 0x9fe8ff, () => {
        e.x = e.ax;
        e.y = e.ay;
        e.state = 0;
        e.view!.alpha = 1;
        ring(g, e.x, e.y, 12 + b.miniIndex * 2, 115, e.dmg * 0.45, Math.random(), false, 0xd6f6ff, 2);
        g.fx.puff(e.x, e.y, 0xeaf6ff, 50, 0.7, 0, -20, 0.6);
        audio.play('slam', { vol: 0.7, pitch: 0.8 });
      });
    }
    return;
  }
  if (e.state === 2) {
    e.shield = 0.05;
    return; // about to erupt
  }
  e.view!.alpha = 1;
  chase(g, e, dt, 1, 90);
  if (b.attackT > 0) return;
  b.attackIdx++;
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  if (b.attackIdx % 3 === 0) {
    e.state = 1;
    e.stateT = 1.5;
    g.fx.puff(e.x, e.y, 0xeaf6ff, 40, 0.6, 0, -10, 0.5);
    audio.play('dash', { pitch: 0.5 });
    g.ui.toast('It dives under the snow — watch the ground', '#9fe8ff');
    b.attackT = 3.4;
  } else {
    // frost breath: a cone of shards
    g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 24, ang: 0, len: 0, w: 0, dur: 0.6, color: 0x9fe8ff, onDone: () => !e.dead && fan(g, e.x, e.y, ang, 7 + b.miniIndex, 0.8, 150, e.dmg * 0.5, false, 0xd6f6ff) });
    audio.play('warn', { vol: 0.5 });
    b.attackT = 1.7;
  }
}

// ---------------------------------------------------------------- The Hive Knight (shielded: carapace, charges, spear sweeps)

function hiveKnightAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  e.stateT -= dt;
  b.addsT -= dt;
  if (b.addsT <= 0 && e.state === 0) {
    b.addsT = 8;
    e.shield = 2.4;
    g.fx.ring(e.x, e.y, e.r * 2.6, e.r * 1.6, 0xffc070, 0.35);
    g.ui.toast(`${b.name} hardens its carapace — wait it out`, '#ffc070');
  }
  if (e.state === 1) {
    if (e.stateT <= 0) {
      e.state = 2;
      e.stateT = 0.6;
    }
    return;
  }
  if (e.state === 2) {
    e.x += e.ax * 440 * dt;
    e.y += e.ay * 440 * dt;
    if (Math.random() < 0.4) g.fx.puff(e.x, e.y + 10, 0x5a3a2a, 14, 0.3, 0, 0, 0.3);
    if (e.stateT <= 0) e.state = 0;
    return;
  }
  chase(g, e, dt, 1, 70);
  if (b.attackT > 0) return;
  b.attackIdx++;
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  if (b.attackIdx % 2 === 0) {
    e.state = 1;
    e.stateT = 0.9;
    e.ax = nx;
    e.ay = ny;
    g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang, len: 280, w: e.r * 2 + 10, dur: 0.9, color: 0xffa040 });
    audio.play('warn', { vol: 0.6 });
    b.attackT = 2.4;
  } else {
    // a spear sweep: three short lines fanning toward you
    const len = 170, w = 22, x0 = e.x, y0 = e.y;
    const tgs = [-0.5, 0, 0.5].map((o) => g.telegraph({ kind: 'line', x: x0, y: y0, r: 0, ang: ang + o, len, w, dur: 0.75, color: 0xffc070 }));
    tgs[1].onDone = () => {
      if (e.dead) return;
      for (const tg of tgs) {
        const c = Math.cos(tg.ang), s = Math.sin(tg.ang);
        const dx = g.px - x0, dy = g.py - y0;
        const along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
        if (along > 0 && along < len && across < w / 2 + 6) {
          g.hurt(e.dmg * 0.9, null);
          break;
        }
      }
      fan(g, x0, y0, ang, 3 + b.miniIndex, 0.9, 140, e.dmg * 0.4, false, 0xffd8a0);
      audio.play('slam', { vol: 0.6, pitch: 1.2 });
    };
    b.attackT = 2;
  }
}

// ---------------------------------------------------------------- The Twin Larvae (splits: always two; the survivor goes frantic)

function larvaAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  if (!b.split) {
    b.split = true;
    const [nx, ny] = toPlayer(g, e);
    const twin = spawnMiniboss(g, b.id, b.miniIndex, { x: e.x + ny * 70, y: e.y - nx * 70, hp: e.hp, maxHp: e.maxHp, name: b.name });
    twin.boss!.split = true;
    twin.boss!.attackT = b.attackT + 1.1;
    g.ui.banner('TWO OF THEM', 'Break both larvae', '#a0d040');
  }
  const alone = !g.enemies.some((o) => o !== e && !o.dead && o.boss?.id === b.id);
  if (alone && !e.state) {
    e.state = 1;
    e.speed *= 1.6;
    g.fx.ring(e.x, e.y, 10, 120, 0xa0d040, 0.5, 1, true);
    g.ui.toast('The surviving larva goes frantic!', '#a0d040');
  }
  chase(g, e, dt, 1, 60);
  if (b.attackT > 0) return;
  b.attackIdx++;
  const dmg = e.dmg;
  // spit acid where you are heading
  const n = alone ? 3 : 2;
  for (let k = 0; k < n; k++) {
    const tx = g.px + g.pvx * (0.3 + k * 0.25) + (Math.random() - 0.5) * 40, ty = g.py + g.pvy * (0.3 + k * 0.25) + (Math.random() - 0.5) * 40;
    strike(g, tx, ty, 30, 0.9 + k * 0.2, dmg, 0x9aff3d, () => g.hazards.addField('acid', tx, ty, 30, 4, dmg * 0.45));
  }
  audio.play('warn', { vol: 0.5, pitch: 1.3 });
  b.attackT = alone ? 1.5 : 2.6;
}

// ---------------------------------------------------------------- The Librarian of Silence

function librarianAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  checkPhase(g, e, b, ['THE STACKS COLLAPSE', 'ABSOLUTE SILENCE']);
  const p = b.phase;
  const dmg = e.dmg;
  const tint = 0xf4ecd8;
  chase(g, e, dt, 1, 170);
  const mx = e.x, my = e.y - 8;
  // page storm: counter-rotating spirals of torn pages
  if (b.spiralT > 0) {
    b.spiralT -= dt;
    e.aux -= dt;
    if (e.aux <= 0) {
      e.aux = p >= 2 ? 0.12 : 0.16;
      b.spiralAng += 0.33;
      for (let k = 0; k < b.spiralArms; k++) g.fireBullet(mx, my, b.spiralAng + (k / b.spiralArms) * TAU, 88, dmg * 0.4, false, tint);
    }
  }
  if (p >= 1) {
    b.addsT -= dt;
    if (b.addsT <= 0) {
      b.addsT = p >= 2 ? 8 : 10;
      const hp = (g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult) * g.mods.hp;
      for (let k = 0; k < 2; k++) spawnEnemy(g, 'frost_scribe', e.x + Math.cos(k * 3) * 90, e.y + Math.sin(k * 3) * 90, { hpMult: hp, countsForMeter: false });
      for (let k = 0; k < 6; k++) spawnEnemy(g, 'page_wraith', e.x + Math.cos(k) * 60, e.y + Math.sin(k) * 60, { hpMult: hp, countsForMeter: false });
      g.ui.toast('The stacks stir — pages take flight', '#7ab8ff');
    }
  }
  if (b.attackT > 0) return;
  b.attackIdx++;
  const patterns = p === 0 ? ['silence', 'storm', 'shelves', 'fan'] : p === 1 ? ['silence', 'shelves', 'storm', 'grid', 'fan'] : ['silence2', 'grid', 'storm', 'shelves', 'silence', 'fan'];
  const pat = patterns[b.attackIdx % patterns.length];
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  switch (pat) {
    case 'silence':
    case 'silence2': {
      // circles where your weapons fall quiet
      const n = pat === 'silence2' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = g.px + g.pvx * 0.4 + (k ? (Math.random() - 0.5) * 220 : 0), y = g.py + g.pvy * 0.4 + (k ? (Math.random() - 0.5) * 220 : 0);
        const r = 95 + p * 10;
        g.telegraph({ kind: 'circle', x, y, r, ang: 0, len: 0, w: 0, dur: 1.2, color: 0x5a6ad0, onDone: () => !e.dead && g.silenceZones.push({ x, y, r, t: 5 + p, max: 5 + p }) });
      }
      g.ui.toast('A circle of silence — your weapons stop inside it', '#9fb0ff');
      audio.play('warn', { vol: 0.6, pitch: 0.6 });
      b.attackT = 2.4;
      break;
    }
    case 'storm':
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 60, ang: 0, len: 0, w: 0, dur: 0.8, color: 0xf4ecd8 });
      b.spiralArms = p >= 2 ? 5 : 4;
      setTimeoutTick(g, 0.8, () => {
        b.spiralT = 3;
        e.aux = 0;
      });
      audio.play('warn', { vol: 0.6 });
      b.attackT = 4.2;
      break;
    case 'shelves':
    case 'grid': {
      // shelves topple in marked lines across where you stand
      const lines: { x: number; y: number; a: number }[] = [];
      const a0 = Math.random() * Math.PI;
      const offs = pat === 'grid' ? [-70, 70] : [-110, 0, 110];
      for (const o of offs) lines.push({ x: g.px - Math.sin(a0) * o, y: g.py + Math.cos(a0) * o, a: a0 });
      if (pat === 'grid') for (const o of [-70, 70]) lines.push({ x: g.px - Math.sin(a0 + Math.PI / 2) * o, y: g.py + Math.cos(a0 + Math.PI / 2) * o, a: a0 + Math.PI / 2 });
      const len = 560, w = 34;
      lines.forEach((l, i) => {
        const sx = l.x - (Math.cos(l.a) * len) / 2, sy = l.y - (Math.sin(l.a) * len) / 2;
        g.telegraph({
          kind: 'line', x: sx, y: sy, r: 0, ang: l.a, len, w, dur: 1.15 + (pat === 'grid' && i >= 2 ? 0.5 : 0), color: 0x9fb0ff,
          onDone: () => {
            if (e.dead) return;
            const c = Math.cos(l.a), s = Math.sin(l.a);
            const dx = g.px - sx, dy = g.py - sy;
            const along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
            if (along > 0 && along < len && across < w / 2 + 6) g.hurt(dmg * 1.2, null);
            for (let t = 0; t < 8; t++) g.fx.puff(sx + c * len * (t / 8), sy + s * len * (t / 8), 0xcfd8e8, 18, 0.4, 0, -10, 0.4);
            audio.play('slam', { vol: 0.5, pitch: 0.7 + i * 0.1 });
          },
        });
      });
      audio.play('warn', { vol: 0.7 });
      b.attackT = pat === 'grid' ? 2.9 : 2.4;
      break;
    }
    case 'fan':
      g.telegraph({ kind: 'ring', x: mx, y: my, r: 30, ang: 0, len: 0, w: 0, dur: 0.6, color: 0xf4ecd8, onDone: () => !e.dead && fan(g, mx, my, ang, 9, 1.3, 125, dmg * 0.5, true, tint) });
      audio.play('warn', { vol: 0.5 });
      b.attackT = 1.9;
      break;
  }
  if (p >= 2) b.attackT *= 0.85;
}

// ---------------------------------------------------------------- The Swarm Mind

function mindNodes(g: Game, e: Enemy, b: BossState): void {
  const n = 3 + b.phase;
  const hpM = (b.power || 1) * (g.flow ? 1.7 : 1.2 * Math.sqrt(endlessParams(g.endlessT).hpMult)) * g.mods.hp;
  b.minions = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + Math.random() * 0.5;
    const x = clamp(e.x + Math.cos(a) * 190, 60, g.map.width - 60), y = clamp(e.y + Math.sin(a) * 160, 60, g.map.height - 60);
    const s = spawnEnemy(g, 'hive_node', x, y, { hpMult: hpM, countsForMeter: false });
    s.mass = 1;
    s.xp = 3;
    b.minions.push(s);
    g.fx.ring(x, y, 4, 40, 0xff6a8a, 0.4);
  }
  audio.play('magnet', { vol: 0.6, pitch: 0.6 });
}

function swarmMindAI(g: Game, e: Enemy, b: BossState, dt: number): void {
  if (checkPhase(g, e, b, ['THE SWARM AWAKENS', 'THE HIVE CLOSES IN'])) {
    for (const m of b.minions ?? []) if (!m.dead) killEnemyQuiet(g, m);
    mindNodes(g, e, b);
    b.addsT = 1;
    if (b.phase >= 2 && b.isMain) {
      g.arena = { x: e.x, y: e.y, r: 640, to: 300 };
      g.ui.banner('THE HIVE CLOSES IN', 'Stay inside the ring', '#ff6a8a');
    }
  }
  if (!b.minions) {
    mindNodes(g, e, b);
    g.ui.toast('Break the armoured nodes to expose the Mind!', '#ff6a8a');
  }
  const p = b.phase;
  const dmg = e.dmg;
  const alive = b.minions!.filter((m) => !m.dead);
  b.guard = alive.length ? 0.25 : 1;
  if (b.shieldGfx) b.shieldGfx.visible = alive.length > 0;
  // nerve tethers from each node to the Mind
  e.aux -= dt;
  if (e.aux <= 0 && alive.length) {
    e.aux = 0.18;
    for (const m of alive) g.bolt([m.x, m.y, (m.x + e.x) / 2 + (Math.random() - 0.5) * 20, (m.y + e.y) / 2 + (Math.random() - 0.5) * 20, e.x, e.y], 0xff6a8a, 0.12, 1.2);
  }
  if (!alive.length) {
    b.spiralT += dt;
    if (b.spiralT > 12 - p * 1.5) {
      b.spiralT = 0;
      mindNodes(g, e, b);
    } else if (b.spiralT < 0.1) g.ui.toast('The Mind is exposed — strike now!', '#ffb36b');
  }
  // the final phase keeps it at the heart of its shrinking arena
  if (g.arena) chase(g, e, dt, 0.4, 260);
  else chase(g, e, dt, 1, 220);
  // waves of the swarm, called around you (marked first)
  b.addsT -= dt;
  if (b.addsT <= 0) {
    b.addsT = p >= 2 ? 7 : p >= 1 ? 8.5 : 10;
    const cx = g.px, cy = g.py;
    g.telegraph({
      kind: 'ring', x: cx, y: cy, r: 190, ang: 0, len: 0, w: 0, dur: 1.1, color: 0xa0d040,
      onDone: () => {
        if (e.dead) return;
        const hp = (g.flow ? g.flow.spec.hpMult : endlessParams(g.endlessT).hpMult) * g.mods.hp;
        const n = 12 + p * 4;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU;
          spawnEnemy(g, k % 4 === 0 ? 'hive_drone' : 'broodling', cx + Math.cos(a) * 200, cy + Math.sin(a) * 200, { hpMult: hp, countsForMeter: false });
        }
      },
    });
    g.ui.toast('The Mind calls the swarm', '#a0d040');
  }
  if (b.attackT > 0) return;
  b.attackIdx++;
  const patterns = p === 0 ? ['spit', 'spines', 'lash'] : p === 1 ? ['spit', 'lash', 'spines', 'spit'] : ['spines', 'lash', 'spit', 'lash'];
  const pat = patterns[b.attackIdx % patterns.length];
  const [nx, ny] = toPlayer(g, e);
  const ang = Math.atan2(ny, nx);
  if (pat === 'spit') {
    for (let k = 0; k < 3 + p; k++) {
      const tx = g.px + g.pvx * 0.35 * k + (Math.random() - 0.5) * 70, ty = g.py + g.pvy * 0.35 * k + (Math.random() - 0.5) * 70;
      strike(g, tx, ty, 34, 1 + k * 0.2, dmg, 0x9aff3d, () => g.hazards.addField('acid', tx, ty, 34, 4, dmg * 0.4));
    }
    b.attackT = 2.4;
  } else if (pat === 'spines') {
    g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 80, ang: 0, len: 0, w: 0, dur: 0.85, color: 0xff6a8a, onDone: () => !e.dead && ring(g, e.x, e.y, 36 + p * 6, 100, dmg * 0.45, ang + Math.PI, false, 0xffb0c0, 5) });
    b.attackT = 2.2;
  } else {
    // tendrils lash out along marked lines
    const len = 520, w = 28;
    const tgs = [-0.3, 0.3].concat(p >= 2 ? [0] : []).map((o) => g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: ang + o, len, w, dur: 1, color: 0xff6a8a }));
    tgs[0].onDone = () => {
      if (e.dead) return;
      for (const tg of tgs) {
        const c = Math.cos(tg.ang), s = Math.sin(tg.ang);
        g.fx.spawn('soft', g.a.soft.beam, tg.x + (c * len) / 2, tg.y + (s * len) / 2, { rot: tg.ang, s0: len / 64, scaleY: (w / 24) / (len / 64), life: 0.3, tint: 0xff9ab0, force: true });
        const dx = g.px - tg.x, dy = g.py - tg.y;
        const along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
        if (along > 0 && along < len && across < w / 2 + 6) g.hurt(dmg * 1.3, null);
      }
      audio.play('slam', { vol: 0.6 });
    };
    audio.play('warn', { vol: 0.7 });
    b.attackT = 2.3;
  }
  if (p >= 2) b.attackT *= 0.85;
}

const MAIN_AI: Record<string, (g: Game, e: Enemy, b: BossState, dt: number) => void> = { star_titan: titanAI, organ_beast: organAI, heart_black_sun: heartAI, librarian: librarianAI, swarm_mind: swarmMindAI };
const MINI_AI: Record<string, (g: Game, e: Enemy, b: BossState, dt: number) => void> = { rogue_mech: mechAI, swarm_queen: queenAI, high_priest: priestAI, gargoyle: gargoyleAI, void_hound: houndAI, crystal_colossus: colossusAI, archivist: archivistAI, ice_wyrm: wyrmAI, hive_knight: hiveKnightAI, twin_larva: larvaAI };

/** schedule a callback on the simulation clock (pauses with the game) */
function setTimeoutTick(g: Game, delay: number, fn: () => void): void {
  g.after(delay, fn);
}

// ---------------------------------------------------------------- death

export function bossDeath(g: Game, e: Enemy): void {
  const b = e.boss!;
  const big = b.isMain;
  const color = big ? 0xff7a2a : e.color;
  g.flash(0xffffff, big ? 0.7 : 0.35);
  g.hitStop(big ? 0.18 : 0.08);
  g.ui.edgePulse('#' + color.toString(16).padStart(6, '0'), 1);
  audio.play('explosion');
  audio.play('bomb', { vol: big ? 1 : 0.6 });
  g.fx.glow(e.x, e.y, color, big ? 420 : 200, 0.6, 1, true);
  g.fx.ring(e.x, e.y, 10, big ? 380 : 180, color, 0.7, 1, true);
  g.fx.ring(e.x, e.y, 10, big ? 260 : 120, 0xffffff, 0.45, 0.8);
  const shape = g.a.enemyShape[e.sprite];
  g.fx.dissolve(e.x, e.y, shape, color, b.isMain ? 1 : e.facing, 1, big ? 400 : 160, big ? 1.8 : 1.2);
  g.fx.sparks(e.x, e.y, 0xffffff, big ? 40 : 18, 320, 0.5);
  if (big) {
    // a chain of secondary blasts across the hull
    for (let k = 0; k < 8; k++) {
      const x = e.x + (Math.random() - 0.5) * 90, y = e.y + (Math.random() - 0.5) * 100;
      setTimeoutTick(g, 0.12 + k * 0.13, () => {
        g.fx.glow(x, y, 0xffb36b, 110, 0.3, 0.9, true);
        g.fx.ring(x, y, 4, 60, 0xff7a2a, 0.3, 0.9);
        g.fx.embers(x, y, 0xffb36b, 12, 160, 0.9);
        audio.play('explosion', { vol: 0.5, pitch: 0.8 + Math.random() * 0.4 });
      });
    }
  }
  // shower of coins and gems
  const coins = big ? 45 : 14;
  for (let k = 0; k < coins; k++) {
    const a = Math.random() * TAU, s = 80 + Math.random() * (big ? 260 : 160);
    g.pickups.drop('coin', e.x, e.y, big ? 4 : 3, Math.cos(a) * s, Math.sin(a) * s);
  }
  const gems = big ? 12 : 5;
  for (let k = 0; k < gems; k++) {
    const a = Math.random() * TAU, s = 60 + Math.random() * 140;
    g.pickups.drop('gem', e.x, e.y, big ? 40 : 20, Math.cos(a) * s, Math.sin(a) * s);
  }
  if (!big) g.pickups.drop('food', e.x, e.y + 10, 1);
}
