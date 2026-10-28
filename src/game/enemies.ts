/**
 * Regular enemies and elites: spawn director, AI, separation, damage and death.
 */
import { Text } from 'pixi.js';
import { audio } from '../audio/audio';
import { TAU, clamp } from '../core/math';
import { save } from '../core/save';
import { ELITE_MODS, ELITE_MOD_IDS, ENEMIES, ENEMY_DAMAGE_SCALE, type EliteMod } from '../data/enemies';
import { eliteName } from '../data/names';
import { endlessMixWeights, endlessParams } from '../systems/endless';
import { bossDeath } from './bosses';
import type { Game } from './game';
import type { Enemy, EnemyKind } from './types';

const ids: number[] = [];
let codexDirty = false;

export interface SpawnOpts {
  hpMult?: number;
  dmgMult?: number;
  speedMult?: number;
  kind?: EnemyKind;
  scale?: number;
  countsForMeter?: boolean;
}

/** recycled Enemy objects (object pool: no garbage per spawn) */
const enemyPool: Enemy[] = [];

export function newEnemyBase(g: Game, x: number, y: number): Enemy {
  const e = enemyPool.pop() ?? ({} as Enemy);
  e.uid = g.uid++;
  e.kind = 'normal';
  e.def = null;
  e.sprite = '';
  e.x = x;
  e.y = y;
  e.kx = e.ky = 0;
  e.r = 8;
  e.hp = e.maxHp = 1;
  e.speed = e.dmg = e.xp = e.coinChance = e.mass = e.armor = 0;
  e.color = 0xffffff;
  e.p = null;
  e.view = null;
  e.scale = 1;
  e.flash = 0;
  e.anim = Math.random();
  e.facing = 1;
  e.state = 0;
  e.stateT = Math.random() * 2;
  e.aux = e.ax = e.ay = 0;
  e.orbitHitAt = e.wheelHitAt = e.hazardHitAt = e.dashHitAt = -99;
  e.frozen = 0;
  e.dmgAccum = e.dmgTimer = e.shield = 0;
  e.dead = false;
  e.elite = null;
  e.boss = null;
  e.countsForMeter = true;
  return e;
}

export function spawnEnemy(g: Game, defId: string, x: number, y: number, o: SpawnOpts = {}): Enemy {
  const def = ENEMIES[defId];
  const e = newEnemyBase(g, x, y);
  const scale = o.scale ?? 1;
  e.kind = o.kind ?? 'normal';
  e.def = def;
  e.sprite = def.sprite;
  e.r = def.radius * scale;
  e.maxHp = e.hp = def.hp * (o.hpMult ?? 1);
  e.speed = def.speed * (o.speedMult ?? 1) * (0.9 + Math.random() * 0.2);
  e.dmg = def.damage * (o.dmgMult ?? 1) * ENEMY_DAMAGE_SCALE;
  e.xp = def.xp;
  e.coinChance = def.coinChance;
  e.mass = def.mass;
  e.armor = def.armor ?? 0;
  e.color = def.color;
  e.scale = scale;
  e.countsForMeter = o.countsForMeter ?? true;
  e.p = g.enemyLayer.acquire(g.a.enemy[def.sprite][0], x, y);
  e.p.scaleX = scale;
  e.p.scaleY = scale;
  g.enemies.push(e);
  if (!save.data.codex.enemies.includes(defId)) {
    save.data.codex.enemies.push(defId);
    codexDirty = true;
  }
  return e;
}

export function makeElite(g: Game, e: Enemy, mod: EliteMod, power = 1): void {
  const info = ELITE_MODS[mod];
  e.kind = 'elite';
  e.maxHp = e.hp = e.hp * 9 * power;
  e.dmg *= 1.4;
  e.xp *= 12;
  e.coinChance = 1;
  e.mass = Math.min(0.9, e.mass + 0.5);
  e.scale = 1.6;
  e.r *= 1.6;
  if (mod === 'fast') e.speed *= 1.7;
  if (e.p) {
    e.p.scaleX = e.scale;
    e.p.scaleY = e.scale;
  }
  const aura = g.auraLayer.acquire(g.a.soft.glow, e.x, e.y);
  aura.tint = info.aura;
  aura.alpha = 0.55;
  const name = eliteName(g.rng);
  const label = new Text({
    text: name,
    style: { fontFamily: 'Silkscreen, monospace', fontSize: 9, fill: info.aura, stroke: { color: 0x05060a, width: 3 }, align: 'center' },
    resolution: Math.min(4, g.zoom * (window.devicePixelRatio || 1)),
  });
  label.anchor.set(0.5, 1);
  g.labelLayer.addChild(label);
  e.elite = { name, mod, aura, label, timer: 2 + Math.random() * 3 };
}

/** pick a point just outside the view, inside the arena */
export function spawnPoint(g: Game, extra = 0): [number, number] {
  const dist = Math.max(300, Math.hypot(g.viewW, g.viewH) / 2 + 40) + extra;
  const W = g.map.width, H = g.map.height;
  let best: [number, number] = [g.px, g.py];
  let bestD = -1;
  for (let i = 0; i < 8; i++) {
    const a = g.rng.next() * Math.PI * 2;
    const x = clamp(g.px + Math.cos(a) * dist, 20, W - 20);
    const y = clamp(g.py + Math.sin(a) * dist, 20, H - 20);
    const d = Math.hypot(x - g.px, y - g.py);
    if (d > dist * 0.8) return [x, y];
    if (d > bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  return best;
}

let spawnAcc = 0;
const EATER_PULL = 170;

export function spawnDirector(g: Game, dt: number): void {
  if (g.victoryT >= 0) return;
  let cap = 70;
  let target: number, mix: Record<string, number>, hpM: number, dmgM: number, spdM: number, eliteChance: number, xpM: number;
  if (g.flow) {
    const rate = g.flow.spawnRate;
    if (rate <= 0) return;
    const s = g.flow.spec;
    target = g.flow.phase === 'round' ? g.flow.targetDensity() : s.density * rate;
    mix = s.mix;
    hpM = s.hpMult;
    dmgM = s.dmgMult;
    spdM = s.speedMult;
    eliteChance = g.flow.phase === 'round' ? s.eliteChance : 0;
    xpM = 1 + 0.3 * (g.flow.round - 1);
  } else {
    const p = endlessParams(g.endlessT);
    target = p.density;
    mix = endlessMixWeights(g.map.endlessMix, g.endlessT);
    hpM = p.hpMult;
    dmgM = p.dmgMult;
    spdM = p.speedMult;
    eliteChance = p.eliteChance;
    cap = p.spawnCap;
    xpM = 1 + g.time / 300;
  }
  // difficulty tier and curses
  const md = g.mods;
  hpM *= md.hp;
  dmgM *= md.dmg;
  spdM *= md.speed;
  target *= md.density;
  eliteChance = Math.min(0.6, Math.max(eliteChance * md.elites, md.eliteFloor));
  if (g.curseLevel) {
    hpM *= 1 + 0.25 * g.curseLevel;
    target *= 1 + 0.2 * g.curseLevel;
  }
  target = Math.min(560, target);
  let alive = 0;
  for (const e of g.enemies) if (!e.dead && (e.kind === 'normal' || e.kind === 'elite')) alive++;
  const deficit = target - alive;
  if (deficit <= 0) return;
  spawnAcc += dt * clamp(deficit * 1.3, 5, cap);
  const keys = Object.keys(mix);
  const weights = keys.map((k) => mix[k]);
  while (spawnAcc >= 1) {
    const group = Math.min(Math.ceil(deficit), g.rng.int(3, 8));
    spawnAcc -= group;
    const [sx, sy] = spawnPoint(g);
    const id = keys[g.rng.weighted(weights)];
    for (let i = 0; i < group; i++) {
      const pick = i === 0 ? id : g.rng.chance(0.65) ? id : keys[g.rng.weighted(weights)];
      const e = spawnEnemy(g, pick, sx + g.rng.range(-30, 30), sy + g.rng.range(-30, 30), { hpMult: hpM, dmgMult: dmgM, speedMult: spdM });
      e.xp = Math.max(1, Math.round(e.xp * xpM));
    }
    if (g.rng.chance(eliteChance)) {
      const e = spawnEnemy(g, keys[g.rng.weighted(weights)], sx, sy, { hpMult: hpM, dmgMult: dmgM, speedMult: spdM });
      e.xp = Math.round(e.xp * xpM);
      makeElite(g, e, g.rng.pick(ELITE_MOD_IDS));
    }
  }
}

export function spawnEliteWave(g: Game, n: number, power: number): void {
  const ids = ['scrap_crawler', 'void_spawn', 'signal_drone', 'scrap_hulk'];
  const p = g.flow ? { hpMult: g.flow.spec.hpMult, dmgMult: g.flow.spec.dmgMult } : endlessParams(g.endlessT);
  for (let i = 0; i < n; i++) {
    const [x, y] = spawnPoint(g);
    const e = spawnEnemy(g, g.rng.pick(ids), x, y, { hpMult: p.hpMult * g.mods.hp, dmgMult: p.dmgMult * g.mods.dmg, speedMult: g.mods.speed, countsForMeter: false });
    makeElite(g, e, g.rng.pick(ELITE_MOD_IDS), power);
  }
  audio.play('miniIntro', { vol: 0.6 });
}

// ---------------------------------------------------------------- update

const MAX_LABELS = 3;
const LABEL_R2 = 320 * 320;

export function updateEnemies(g: Game, dt: number): void {
  let labelsShown = 0;
  const ts = g.enemyTimeScale;
  const es = g.enemies;
  const maxD = Math.max(g.viewW, g.viewH) * 0.9 + 250;
  const W = g.map.width, H = g.map.height;
  for (let i = 0; i < es.length; i++) {
    const e = es[i];
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.dmgTimer > 0) {
      e.dmgTimer -= dt;
      if (e.dmgTimer <= 0) flushNumber(g, e);
    }
    if (e.kind === 'mini' || e.kind === 'boss') continue; // handled in bosses.ts

    const def = e.def!;
    const dx = g.px - e.x, dy = g.py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let mvx = 0, mvy = 0;
    const sp = e.speed;
    // frozen enemies stand still and stop attacking (cryo)
    if (e.frozen > 0) e.frozen -= dt;
    else switch (def.behavior) {
      case 'chase':
        mvx = (dx / d) * sp;
        mvy = (dy / d) * sp;
        break;
      case 'flyer': {
        const a = Math.atan2(dy, dx) + Math.sin(g.time * 3 + e.uid) * 0.6;
        mvx = Math.cos(a) * sp;
        mvy = Math.sin(a) * sp;
        break;
      }
      case 'lunger':
        e.stateT -= dt * ts;
        if (e.state === 0) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
          if (d < 150 && e.stateT <= 0 && !g.playerDead) {
            e.state = 1;
            e.stateT = 0.6;
            e.ax = dx / d;
            e.ay = dy / d;
            g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: Math.atan2(dy, dx), len: 110, w: 10 + e.r, dur: 0.6, color: 0xff3df2 });
          }
        } else if (e.state === 1) {
          if (e.stateT <= 0) {
            e.state = 2;
            e.stateT = 0.35;
          }
        } else {
          mvx = e.ax * 300;
          mvy = e.ay * 300;
          if (e.stateT <= 0) {
            e.state = 0;
            e.stateT = 2.2;
          }
        }
        break;
      case 'exploder':
        if (e.state === 0) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
          if (d < 34 && !g.playerDead) {
            e.state = 1;
            e.stateT = 0.75;
            g.telegraph({ kind: 'circle', x: e.x, y: e.y, r: BLAST_R, ang: 0, len: 0, w: 0, dur: 0.75, color: 0xb6ff4d });
            audio.play('warn', { vol: 0.35, pitch: 1.3 });
          }
        } else {
          e.stateT -= dt * ts;
          e.scale = 1 + (0.75 - Math.max(0, e.stateT)) * 0.6;
          if (e.stateT <= 0) {
            e.aux = 1; // already burst
            volatileBlast(g, e.x, e.y, e.maxHp * 2, e.dmg);
            killEnemy(g, e, 'volatile');
            continue;
          }
        }
        break;
      case 'artillery': {
        // hang back at the edge of the screen and lob shells where you stand
        const far = Math.max(g.viewW, g.viewH) * 0.42;
        if (d > far + 60) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
        } else if (d < far - 70) {
          mvx = (-dx / d) * sp;
          mvy = (-dy / d) * sp;
        }
        e.stateT -= dt * ts;
        if (e.stateT <= 0 && d < far + 140 && !g.playerDead) {
          e.stateT = 3.6 + Math.random() * 1.8;
          // the whole battery shares one fire-control: at most one shell every 0.9s
          if (g.time - lastShellAt > 0.9) {
            lastShellAt = g.time;
            e.state = 1;
            e.aux = 0.25; // recoil frames
            const spread = 18;
            lobShell(g, e, g.px + g.pvx * 0.35 + (Math.random() - 0.5) * spread, g.py + g.pvy * 0.35 + (Math.random() - 0.5) * spread);
          }
        }
        if (e.aux > 0) {
          e.aux -= dt;
          if (e.aux <= 0) e.state = 0;
        }
        break;
      }
      case 'blinker':
        // stalks you, then steps through the dark to a marked spot beside you
        e.stateT -= dt * ts;
        if (e.state === 2) {
          // dazed for a moment after stepping out of the rift: your window to cut it down
          if (e.stateT <= 0) {
            e.state = 0;
            e.stateT = 3.2 + Math.random() * 1.8;
          }
        } else if (e.state === 0) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
          if (e.stateT <= 0 && d > 110 && d < 380 && !g.playerDead) {
            const a = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 1.6;
            e.ax = clamp(g.px + Math.cos(a) * 78, 12, W - 12);
            e.ay = clamp(g.py + Math.sin(a) * 78, 12, H - 12);
            e.state = 1;
            e.stateT = 0.65;
            g.telegraph({ kind: 'ring', x: e.ax, y: e.ay, r: 14, ang: 0, len: 0, w: 0, dur: 0.65, color: 0xb36bff });
          }
        } else if (e.stateT <= 0) {
          g.fx.puff(e.x, e.y, 0x3a2060, 22, 0.4, 0, 0, 0.35);
          e.x = e.ax;
          e.y = e.ay;
          e.state = 2;
          e.stateT = 0.6;
          g.fx.ring(e.x, e.y, 4, 30, 0xb36bff, 0.25, 0.9);
        }
        break;
      case 'eater':
        mvx = (dx / d) * sp;
        mvy = (dy / d) * sp;
        // its gravity drags you toward the maw
        // no pull once you're at the maw, so it can't pin you there
        if (d < EATER_PULL && d > e.r + 34 && !g.playerDead && e.frozen <= 0) {
          const f = (34 * (1 - d / EATER_PULL) + 8) * ts;
          g.px -= (dx / d) * f * dt;
          g.py -= (dy / d) * f * dt;
          if (Math.random() < 0.15) {
            const a = Math.random() * TAU;
            g.fx.spawn('px', g.a.px.px, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, { vx: -Math.cos(a) * 110, vy: -Math.sin(a) * 110, life: 0.5, tint: 0xffb36b, s0: 1.2, s1: 0.2 });
          }
        }
        break;
      case 'orbiter':
      case 'node':
        break; // placed by its boss / rooted in place
      case 'diver':
        // circle you in a loose flock, then mark a line and dive along it
        e.stateT -= dt * ts;
        if (e.state === 0) {
          const a = Math.atan2(-dy, -dx) + 0.9;
          const want = 130 + (e.uid % 5) * 8;
          const tx = g.px + Math.cos(a) * want, ty = g.py + Math.sin(a) * want;
          const tdx = tx - e.x, tdy = ty - e.y, td = Math.hypot(tdx, tdy) || 1;
          mvx = (tdx / td) * sp;
          mvy = (tdy / td) * sp;
          if (e.stateT <= 0 && d < 220 && !g.playerDead) {
            e.state = 1;
            e.stateT = 0.55;
            e.ax = dx / d;
            e.ay = dy / d;
            g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: Math.atan2(dy, dx), len: 190, w: 8 + e.r, dur: 0.55, color: 0x6a5acd });
          }
        } else if (e.state === 1) {
          if (e.stateT <= 0) {
            e.state = 2;
            e.stateT = 0.5;
          }
        } else {
          mvx = e.ax * 360;
          mvy = e.ay * 360;
          if (e.stateT <= 0) {
            e.state = 0;
            e.stateT = 3 + Math.random() * 2.5;
          }
        }
        break;
      case 'charger':
        // a long, heavy charge along a marked line
        e.stateT -= dt * ts;
        if (e.state === 0) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
          if (d < 260 && e.stateT <= 0 && !g.playerDead) {
            e.state = 1;
            e.stateT = 0.85;
            e.ax = dx / d;
            e.ay = dy / d;
            g.telegraph({ kind: 'line', x: e.x, y: e.y, r: 0, ang: Math.atan2(dy, dx), len: 300, w: 14 + e.r, dur: 0.85, color: 0xffa040 });
            audio.play('warn', { vol: 0.35, pitch: 0.7 });
          }
        } else if (e.state === 1) {
          if (e.stateT <= 0) {
            e.state = 2;
            e.stateT = 0.7;
          }
        } else {
          mvx = e.ax * 420;
          mvy = e.ay * 420;
          if (Math.random() < 0.3) g.fx.puff(e.x, e.y + 6, 0x5a3a2a, 10, 0.3, 0, 0, 0.3);
          if (e.stateT <= 0) {
            e.state = 0;
            e.stateT = 3.2 + Math.random();
          }
        }
        break;
      case 'scribe':
      case 'spitter': {
        // keep a writing distance, then mark the floor where you stand
        if (d > 240) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
        } else if (d < 170) {
          mvx = (-dx / d) * sp;
          mvy = (-dy / d) * sp;
        } else {
          const s = e.uid % 2 ? 1 : -1;
          mvx = (-dy / d) * sp * 0.6 * s;
          mvy = (dx / d) * sp * 0.6 * s;
        }
        e.stateT -= dt * ts;
        if (e.stateT <= 0 && d < 340 && !g.playerDead) {
          const scribe = def.behavior === 'scribe';
          e.stateT = scribe ? 4.5 + Math.random() * 2 : 3.6 + Math.random() * 1.5;
          const tx = g.px + g.pvx * (scribe ? 0.2 : 0.45), ty = g.py + g.pvy * (scribe ? 0.2 : 0.45);
          const R = scribe ? 34 : 26;
          const dmg = e.dmg;
          const hz = g.hazards;
          g.telegraph({
            kind: 'circle', x: tx, y: ty, r: R, ang: 0, len: 0, w: 0, dur: scribe ? 1 : 0.95, color: scribe ? 0x9fe8ff : 0x9aff3d,
            onDone: () => {
              if (scribe) hz.addField('glyph', tx, ty, R, 5);
              else {
                hz.addField('acid', tx, ty, R, 4, dmg * 0.35);
                if (!g.playerDead && (g.px - tx) ** 2 + (g.py - ty) ** 2 < (R + 6) ** 2) g.hurt(dmg * 0.7, null);
                g.fx.puff(tx, ty, 0x9aff3d, 18, 0.4, 0, -10, 0.4);
              }
            },
          });
          // the glob flies to the mark (visual only: the mark is what hurts)
          if (!scribe) g.fx.spawn('px', g.a.px.dot, e.x, e.y - 6, { vx: (tx - e.x) / 0.95, vy: (ty - e.y) / 0.95, life: 0.95, tint: 0x9aff3d, s0: 1.6, s1: 1.2, force: true });
        }
        break;
      }
      case 'egg':
        // a sac that hatches unless popped; it shakes and is marked before it does
        e.stateT -= dt * ts;
        if (e.state === 0 && e.stateT <= 0) {
          e.state = 1;
          e.stateT = 7 + Math.random() * 3;
        } else if (e.state === 1 && e.stateT <= 1.4) {
          e.state = 2;
          g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 34, ang: 0, len: 0, w: 0, dur: 1.4, color: 0xe8c850 });
        } else if (e.state === 2) {
          e.scale = 1 + Math.sin(g.time * 30) * 0.08;
          if (e.stateT <= 0) {
            hatchEgg(g, e);
            continue;
          }
        }
        break;
      case 'shooter': {
        if (d > 230) {
          mvx = (dx / d) * sp;
          mvy = (dy / d) * sp;
        } else if (d < 150) {
          mvx = (-dx / d) * sp;
          mvy = (-dy / d) * sp;
        } else {
          const s = e.uid % 2 ? 1 : -1;
          mvx = (-dy / d) * sp * 0.6 * s;
          mvy = (dx / d) * sp * 0.6 * s;
        }
        e.stateT -= dt * ts;
        if (e.state === 0 && e.stateT <= 0 && d < 330) {
          e.state = 1;
          e.aux = 0.65;
          g.telegraph({ kind: 'ring', x: e.x, y: e.y, r: 16, ang: 0, len: 0, w: 0, dur: 0.65, color: 0xffa53d });
          audio.play('warn', { vol: 0.4 });
        } else if (e.state === 1) {
          mvx = mvy = 0;
          e.aux -= dt * ts;
          if (e.aux <= 0) {
            const shots = def.shots ?? 1;
            const base = Math.atan2(dy, dx);
            for (let k = 0; k < shots; k++) g.fireBullet(e.x, e.y, base + (k - (shots - 1) / 2) * 0.22, shots > 1 ? 105 : 125, e.dmg, false, def.shotColor);
            e.state = 0;
            e.stateT = 3 + Math.random() * 1.5;
          }
        }
        break;
      }
    }

    // elite twists
    const el = e.elite;
    if (el) {
      el.timer -= dt;
      if (el.mod === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04 * dt);
      if (el.mod === 'shielded') {
        if (e.shield > 0) e.shield -= dt;
        if (el.timer <= 0) {
          e.shield = 2;
          el.timer = 6;
          g.fx.ring(e.x, e.y, e.r * 2.2, e.r * 1.6, 0x6fb8ff, 0.3);
        }
      }
      if (el.mod === 'summoner' && el.timer <= 0) {
        el.timer = 5;
        g.fx.ring(e.x, e.y, 4, 40, 0xd06bff, 0.4);
        for (let k = 0; k < 3; k++) {
          const s = spawnEnemy(g, 'corrupted_drone', e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, { hpMult: e.maxHp / 9 / ENEMIES[e.def!.id].hp, countsForMeter: false });
          s.xp = 1;
        }
      }
    }

    // separation (cheap: a few neighbours only)
    let sx = 0, sy = 0;
    g.hash.query(e.x, e.y, e.r * 2 + 4, ids);
    let checks = 0;
    for (let k = 0; k < ids.length && checks < 7; k++) {
      const o = es[ids[k]];
      if (o === e || !o || o.dead) continue;
      checks++;
      const ox = e.x - o.x, oy = e.y - o.y;
      const rr = e.r + o.r;
      const d2 = ox * ox + oy * oy;
      if (d2 >= rr * rr || d2 === 0) continue;
      const dd = Math.sqrt(d2);
      const push = (rr - dd) / dd;
      const w = o.kind === 'mini' || o.kind === 'boss' ? 1 : 0.5;
      sx += ox * push * w;
      sy += oy * push * w;
    }

    const kd = Math.exp(-9 * dt);
    e.kx *= kd;
    e.ky *= kd;
    e.x += (mvx * ts + e.kx) * dt + sx * 0.5;
    e.y += (mvy * ts + e.ky) * dt + sy * 0.5;
    e.x = clamp(e.x, 8, W - 8);
    e.y = clamp(e.y, 8, H - 8);

    // keep the swarm around the player: recycle stragglers
    if (d > maxD && e.kind === 'normal' && def.behavior !== 'orbiter') {
      const [nx, ny] = spawnPoint(g);
      e.x = nx;
      e.y = ny;
    }

    // visuals
    const p = e.p!;
    p.x = e.x;
    p.y = e.y;
    if (Math.abs(dx) > 2) e.facing = dx > 0 ? 1 : -1;
    p.scaleX = e.facing * e.scale;
    p.scaleY = e.scale;
    e.anim += dt * (def.behavior === 'flyer' ? 10 : 6) * ts;
    const lunging = (def.behavior === 'lunger' || def.behavior === 'exploder') && e.state === 1;
    const recoil = def.behavior === 'artillery' && e.state === 1;
    p.texture = e.flash > 0 || (lunging && Math.floor(g.time * 16) % 2 === 0) ? g.a.enemyFlash[e.sprite] : g.a.enemy[e.sprite][recoil ? 1 : def.behavior === 'artillery' ? 0 : Math.floor(e.anim) % 2];
    p.tint = e.frozen > 0 ? 0x9fe8ff : e.shield > 0 ? 0x9fd0ff : 0xffffff;
    p.alpha = def.behavior === 'blinker' && e.state === 1 ? Math.max(0.15, e.stateT / 0.65) : def.behavior === 'blinker' && e.state === 2 ? 0.7 : 1;
    if (el) {
      if (el.aura) {
        el.aura.x = e.x;
        el.aura.y = e.y;
        el.aura.scaleX = el.aura.scaleY = (e.r * 3.2) / 64 * (1 + 0.1 * Math.sin(g.time * 5 + e.uid));
      }
      if (el.label) {
        el.label.position.set(e.x, e.y - e.r - 5);
        // name only the few elites close to you, so a big elite wave doesn't bury the screen in text
        const d2 = (e.x - g.px) ** 2 + (e.y - g.py) ** 2;
        if (d2 < LABEL_R2 && labelsShown < MAX_LABELS) {
          el.label.visible = true;
          labelsShown++;
        } else el.label.visible = false;
      }
    }
  }
  if (codexDirty && Math.random() < 0.01) {
    codexDirty = false;
    save.write();
  }
}

function flushNumber(g: Game, e: Enemy): void {
  if (e.dmgAccum > 0) {
    g.fx.number(e.x + (Math.random() - 0.5) * 8, e.y - e.r - 4, e.dmgAccum, 0xf2f2f2, false);
    e.dmgAccum = 0;
  }
}

// ---------------------------------------------------------------- damage

export interface DamageOpts {
  kx?: number;
  ky?: number;
  knock?: number;
  noCrit?: boolean;
  noNumberIfSmall?: boolean;
  /** always a critical hit */
  crit?: boolean;
  /** raw damage, not scaled by the player's damage stat */
  raw?: boolean;
}

export function damageEnemy(g: Game, e: Enemy, amount: number, src: string, o: DamageOpts = {}): number {
  if (e.dead) return 0;
  if (e.shield > 0) {
    if (Math.random() < 0.3) g.fx.sparks(e.x, e.y, 0x6fb8ff, 2, 100, 0.2);
    return 0;
  }
  let dmg = o.raw ? amount : amount * g.stats.damage * g.passive.damageMult(e);
  const crit = o.crit === true || (!o.noCrit && g.rng.next() < g.stats.critChance);
  // a crit can "overcrit" into a MEGA crit (25% of your crit chance): another x1.75 on top
  const mega = crit && g.rng.next() < g.stats.critChance * 0.25;
  if (crit) dmg *= g.stats.critDamage * (mega ? 1.75 : 1) * (o.crit ? g.passive.forcedCritBonus() : 1);
  dmg *= 0.9 + g.rng.next() * 0.2;
  if (e.armor > 0) dmg = Math.max(dmg * 0.3, dmg - e.armor);
  if (e.boss?.guard !== undefined && e.boss.guard < 1) {
    dmg *= e.boss.guard;
    if (Math.random() < 0.2) g.fx.sparks(e.x, e.y, 0xc9a8ff, 2, 120, 0.2);
  }
  e.hp -= dmg;
  e.flash = crit ? 0.11 : 0.07;
  g.recordDamage(src, dmg);
  g.lifesteal(dmg);
  if (o.knock && e.mass < 1) {
    const k = o.knock * (1 - e.mass) * (crit ? 1.5 : 1);
    e.kx += (o.kx ?? 0) * k;
    e.ky += (o.ky ?? 0) * k;
  }
  if (crit) {
    g.fx.number(e.x, e.y - e.r - 8, dmg, mega ? 0xff4d9a : 0xffc94d, true, mega);
    g.fx.glow(e.x, e.y, mega ? 0xff4d9a : 0xfff3c0, e.r * (mega ? 6 : 3.5), 0.12, 0.9);
    g.fx.spawn('px', g.a.px.spark, e.x, e.y, { rot: Math.random() * Math.PI, life: 0.14, s0: mega ? 4 : 2.6, s1: 0.5, tint: 0xffffff, force: true, scaleY: 0.6 });
    g.fx.spawn('px', g.a.px.spark, e.x, e.y, { rot: Math.random() * Math.PI, life: 0.14, s0: mega ? 4 : 2.6, s1: 0.5, tint: 0xffffff, force: mega, scaleY: 0.6 });
    audio.play('crit', { pitch: mega ? 0.75 : 1, vol: mega ? 1.3 : 1 });
    if (mega) g.hitStop(0.035);
  } else if (!(o.noNumberIfSmall && dmg < 5)) {
    e.dmgAccum += dmg;
    if (e.dmgTimer <= 0) e.dmgTimer = 0.14;
    audio.play('hit', { pitch: e.kind === 'normal' ? 1 : 0.7 });
  }
  if (e.hp <= 0) killEnemy(g, e, src);
  return dmg;
}

/** an Egg Sac hatches: broodlings pour out, and it leaves no reward */
function hatchEgg(g: Game, e: Enemy): void {
  const n = 5;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + Math.random();
    const s = spawnEnemy(g, 'broodling', e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6, { hpMult: e.maxHp / e.def!.hp, dmgMult: e.dmg / Math.max(1, ENEMIES.broodling.damage * ENEMY_DAMAGE_SCALE) || 1, countsForMeter: false });
    s.kx = Math.cos(a) * 180;
    s.ky = Math.sin(a) * 180;
  }
  g.fx.puff(e.x, e.y, 0xe8c850, 20, 0.4, 0, 0, 0.4);
  g.fx.sparks(e.x, e.y, 0xfff0a0, 6, 120, 0.3);
  e.dead = true;
  flushNumber(g, e);
}

const CONFETTI = [0xff4d6d, 0xffc94d, 0x7dff8a, 0x59f3ff, 0xc46dff];

/** a normal enemy's death puff, in the equipped kill-burst style */
function killBurst(g: Game, e: Enemy): void {
  const fx = g.fx;
  switch (g.burstStyle) {
    case 'sparks':
      fx.glow(e.x, e.y, 0xfff3c0, e.r * 3, 0.14, 0.5);
      fx.sparks(e.x, e.y, 0xffffff, g.reduced ? 2 : 5, 170, 0.22);
      break;
    case 'void':
      fx.glow(e.x, e.y, 0xa060ff, e.r * 3.5, 0.2, 0.6);
      fx.ring(e.x, e.y, e.r * 2.4, 2, 0xc890ff, 0.22, 0.7);
      fx.embers(e.x, e.y, 0xc890ff, g.reduced ? 2 : 4, 40, 0.5);
      break;
    case 'confetti':
      fx.glow(e.x, e.y, e.color, e.r * 2.5, 0.14, 0.4);
      for (let k = 0; k < (g.reduced ? 3 : 6); k++) fx.spawn('px', g.a.px.px, e.x, e.y, { vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 90, life: 0.55, tint: CONFETTI[k % CONFETTI.length], s0: 1.6, s1: 1 });
      break;
    case 'pixels':
      fx.glow(e.x, e.y, e.color, e.r * 2.5, 0.14, 0.4);
      fx.dissolve(e.x, e.y, g.a.enemyShape[e.sprite], e.color, e.facing, e.scale, g.reduced ? 8 : 18, 0.55);
      break;
    default:
      fx.glow(e.x, e.y, e.color, e.r * 3.5, 0.18, 0.55);
      fx.embers(e.x, e.y, e.color, 5, 70, 0.5);
      if (Math.random() < 0.35) fx.dissolve(e.x, e.y, g.a.enemyShape[e.sprite], e.color, e.facing, e.scale, 14, 0.5);
  }
}

export function killEnemy(g: Game, e: Enemy, _src: string): void {
  if (e.dead) return;
  e.dead = true;
  flushNumber(g, e);
  const fx = g.fx;
  if (e.kind === 'normal') {
    killBurst(g, e);
    // the kill sound climbs with your streak
    audio.play('kill', { pitch: 1 + Math.min(g.streak, 80) / 110 });
  } else if (e.kind === 'elite') {
    fx.glow(e.x, e.y, e.elite ? ELITE_MODS[e.elite.mod].aura : e.color, 90, 0.35, 0.9, true);
    fx.ring(e.x, e.y, 6, 70, e.color, 0.35);
    fx.dissolve(e.x, e.y, g.a.enemyShape[e.sprite], e.color, e.facing, e.scale, 60, 0.9);
    fx.sparks(e.x, e.y, 0xffffff, 10, 220);
    audio.play('explosion', { vol: 0.7 });
    g.hitStop(0.05);
  }
  // Volatile Cells burst when killed, damaging other enemies (chain reactions!)
  if (e.def?.behavior === 'exploder' && e.aux !== 1) {
    const x = e.x, y = e.y, dmg = e.maxHp * 2;
    g.after(0.05 + Math.random() * 0.06, () => volatileBlast(g, x, y, dmg, 0));
  }
  // drops
  const luck = g.stats.luck;
  if (e.kind === 'normal' || e.kind === 'elite') {
    g.pickups.drop('gem', e.x, e.y, e.xp);
    if (g.rng.next() < e.coinChance * (1 + luck * 0.3)) g.pickups.drop('coin', e.x + 4, e.y + 2, e.kind === 'elite' ? 10 : 1);
    const r = g.rng.next();
    const fb = e.kind === 'elite' ? 0.3 : 0.012 * (1 + luck * 0.5);
    if (r < fb) g.pickups.drop('food', e.x - 4, e.y, 1);
    else if (r < fb + 0.003 * (1 + luck)) g.pickups.drop('magnet', e.x, e.y - 4, 1);
    else if (e.kind === 'normal' && r < fb + 0.003 * (1 + luck) + 0.0015 * (1 + luck * 0.5)) g.pickups.drop('bomb', e.x, e.y - 4, 1);
    // crystal crawlers shatter into hunting shards
    if (e.def?.splitInto) {
      const n = e.def.splitCount ?? 2;
      const kid = ENEMIES[e.def.splitInto];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + Math.random();
        const s = spawnEnemy(g, kid.id, e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, { hpMult: e.maxHp / e.def.hp, dmgMult: e.dmg / e.def.damage / ENEMY_DAMAGE_SCALE, countsForMeter: false });
        s.kx = Math.cos(a) * 240;
        s.ky = Math.sin(a) * 240;
      }
      g.fx.sparks(e.x, e.y, 0xd6f6ff, 6, 160, 0.25);
    }
    if (e.elite?.mod === 'splits' && e.def) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const s = spawnEnemy(g, e.def.id, e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, { hpMult: (e.maxHp / e.def.hp / 9) * 2, countsForMeter: e.countsForMeter });
        s.kx = Math.cos(a) * 200;
        s.ky = Math.sin(a) * 200;
      }
    }
  }
  if (e.boss) bossDeath(g, e);
  g.onKill(e);
  if (e.boss) g.onBossKilled(e);
}

let lastShellAt = -99;
const SHELL_R = 32;
const SHELL_T = 1.25;

function lobShell(g: Game, e: Enemy, tx: number, ty: number): void {
  const dmg = e.dmg;
  g.telegraph({
    kind: 'circle', x: tx, y: ty, r: SHELL_R, ang: 0, len: 0, w: 0, dur: SHELL_T, color: 0xffa53d,
    onDone: () => {
      g.fx.glow(tx, ty, 0xffa53d, SHELL_R * 2.6, 0.25, 0.9);
      g.fx.ring(tx, ty, 4, SHELL_R * 1.2, 0xffd27a, 0.25, 0.9, true);
      g.fx.sparks(tx, ty, 0xffd27a, 7, 200, 0.28);
      g.fx.puff(tx, ty, 0x5a4a3a, 28, 0.6, 0, -15, 0.45);
      audio.play('explosion', { vol: 0.4, pitch: 0.9 });
      if ((g.px - tx) ** 2 + (g.py - ty) ** 2 < (SHELL_R + 7) ** 2) g.hurt(dmg, null);
      // friendly fire: shells hurt the swarm too
      g.hash.query(tx, ty, SHELL_R + 20, ids);
      for (const i of ids) {
        const o = g.enemies[i];
        if (!o || o.dead || o.kind === 'boss' || o.kind === 'mini') continue;
        if ((o.x - tx) ** 2 + (o.y - ty) ** 2 > (SHELL_R + o.r) ** 2) continue;
        damageEnemy(g, o, dmg * 2, 'mortar', { raw: true, noCrit: true, noNumberIfSmall: true });
      }
    },
  });
  // the shell itself, flying in an arc
  const grav = 300;
  const vx = (tx - e.x) / SHELL_T;
  const vy = (ty - e.y) / SHELL_T - 0.5 * grav * SHELL_T;
  g.fx.spawn('px', g.a.px.orb_big, e.x + e.facing * 6, e.y - 10, { vx, vy, grav, life: SHELL_T, tint: 0xffc46b, s0: 1.3, s1: 1, force: true });
  g.fx.puff(e.x + e.facing * 6, e.y - 12, 0x6a6a6a, 14, 0.5, 0, -30, 0.4);
  audio.play('slam', { vol: 0.25, pitch: 1.6 });
}

const BLAST_R = 46;
const chain = { n: 0, t: 0 };

/** a Volatile Cell blast: hurts nearby enemies, and the player if playerDmg > 0 */
export function volatileBlast(g: Game, x: number, y: number, dmg: number, playerDmg: number): void {
  g.fx.glow(x, y, 0xb6ff4d, BLAST_R * 2.6, 0.22, 0.85);
  g.fx.ring(x, y, 4, BLAST_R, 0xd8ff8a, 0.25, 0.9);
  g.fx.sparks(x, y, 0xe4ff8a, 6, 190, 0.25);
  g.fx.puff(x, y, 0x55663e, 30, 0.5, 0, -10, 0.4);
  audio.play('explosion', { vol: 0.45, pitch: 1.3 });
  if (playerDmg > 0 && (g.px - x) ** 2 + (g.py - y) ** 2 < (BLAST_R + 7) ** 2) g.hurt(playerDmg, null);
  g.hash.query(x, y, BLAST_R + 20, ids);
  let kills = 0;
  for (const i of ids) {
    const o = g.enemies[i];
    if (!o || o.dead || o.kind === 'boss' || o.kind === 'mini') continue;
    const ox = o.x - x, oy = o.y - y;
    const od = Math.hypot(ox, oy);
    if (od > BLAST_R + o.r) continue;
    damageEnemy(g, o, dmg, 'volatile', { raw: true, noCrit: true, kx: ox / (od || 1), ky: oy / (od || 1), knock: 220 });
    if (o.dead) kills++;
  }
  if (playerDmg <= 0) {
    chain.n += kills + 1;
    chain.t = 0.45;
  }
}

/** report chain reactions once they stop */
export function updateChains(g: Game, dt: number): void {
  if (chain.t <= 0) return;
  chain.t -= dt;
  if (chain.t <= 0) {
    if (chain.n >= 6) g.multiKill(chain.n, 'CHAIN REACTION');
    chain.n = 0;
  }
}

export function cleanupEnemies(g: Game): void {
  const es = g.enemies;
  let w = 0;
  for (let i = 0; i < es.length; i++) {
    const e = es[i];
    if (!e.dead) {
      es[w++] = e;
      continue;
    }
    if (e.p) g.enemyLayer.release(e.p);
    if (e.elite) {
      if (e.elite.aura) g.auraLayer.release(e.elite.aura);
      e.elite.label?.destroy();
    }
    if (e.view) e.view.destroy({ children: true });
    e.p = null;
    e.view = null;
    e.elite = null;
    e.boss = null;
    enemyPool.push(e);
  }
  es.length = w;
}

/** kill every regular enemy (breather / victory), with a sweeping wave */
export function clearAllEnemies(g: Game, includeElites: boolean, x = g.px, y = g.py): void {
  g.fx.ring(x, y, 10, 900, 0x7dff8a, 0.9, 0.8, true);
  g.flash(0xd8ffe0, 0.3);
  audio.play('bomb', { vol: 0.8 });
  for (const e of g.enemies) {
    if (e.dead || e.kind === 'mini' || e.kind === 'boss') continue;
    if (e.kind === 'elite' && !includeElites) continue;
    e.countsForMeter = false;
    killEnemy(g, e, 'wave');
  }
}
