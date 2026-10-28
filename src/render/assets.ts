/**
 * Builds every texture at startup: all art is generated in code and packed
 * into two atlases (crisp pixel art + soft glows) so the particle layers can
 * batch hundreds of sprites per draw call.
 */
import { Rectangle, Texture, TextureSource } from 'pixi.js';
import { BIG_SPRITES, BOSS_DRAW, ENEMY_DRAW, ENEMY_FRAMES } from './enemyArt';
import { bell, candles, cathedralFloor, glassShard, pew, pillar } from './cathedralArt';
import { blackSunFloor, crystalSpire, floatingRock, starEmber } from './blackSunArt';
import { archiveFloor, buriedShelf, frozenPillar, iceSpikes, lostBook, snowDrift } from './archiveArt';
import { chitinRidge, deadTendril, glowPod, hiveFloor, nestShell } from './hiveArt';
import * as fx from './fxArt';
import { HERO_BODIES, HERO_PALETTES, drawHeroFrames, type HeroBody, type HeroFrames } from './heroArt';
import { skinPalette, spectral } from './heroSkins';
import { achievementIcon } from './achIcons';
import { COSMETICS } from '../data/cosmetics';
import { ACHIEVEMENTS } from '../systems/achievements';
import { buildIcons } from './icons';
import { debris, girder, graveyardFloor, lamp, wreck } from './mapArt';
import type { Pix } from './pixel';

export interface HeroTextures {
  idle: Texture[];
  run: Texture[];
  victory: Texture;
  flash: Texture;
  /** opaque pixels of idle frame 0, for death embers */
  shape: [number, number, number][];
}

export interface BossTextures {
  normal: Texture[];
  cracked: Texture[];
  flash: Texture;
}

export interface Assets {
  px: Record<string, Texture>;
  soft: Record<string, Texture>;
  pxSource: TextureSource;
  softSource: TextureSource;
  floor: Record<string, Texture>;
  /** keyed by skin id (e.g. 'warden_default', 'glint_frost', 'sprout') */
  heroes: Record<string, HeroTextures>;
  enemy: Record<string, Texture[]>;
  enemyFlash: Record<string, Texture>;
  enemyShape: Record<string, [number, number, number][]>;
  /** main boss textures keyed by boss sprite id */
  bossArt: Record<string, BossTextures>;
  icons: Record<string, string>;
}

interface Packed {
  source: TextureSource;
  frames: Record<string, Texture>;
}

function pack(items: Record<string, HTMLCanvasElement | Pix>, nearest: boolean, pad = 2): Packed {
  const list = Object.entries(items).map(([name, it]) => {
    const canvas = it instanceof HTMLCanvasElement ? it : it.toCanvas();
    return { name, canvas, w: canvas.width, h: canvas.height, x: 0, y: 0 };
  });
  list.sort((a, b) => b.h - a.h);
  const W = 2048;
  let x = pad, y = pad, rowH = 0;
  for (const it of list) {
    if (x + it.w + pad > W) {
      x = pad;
      y += rowH + pad;
      rowH = 0;
    }
    it.x = x;
    it.y = y;
    x += it.w + pad;
    rowH = Math.max(rowH, it.h);
  }
  const H = y + rowH + pad;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  for (const it of list) ctx.drawImage(it.canvas, it.x, it.y);
  const source = TextureSource.from(canvas);
  source.scaleMode = nearest ? 'nearest' : 'linear';
  const frames: Record<string, Texture> = {};
  for (const it of list) frames[it.name] = new Texture({ source, frame: new Rectangle(it.x, it.y, it.w, it.h) });
  return { source, frames };
}

// ---------------------------------------------------------------- soft (canvas 2D) textures
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function softGlow(size: number, hardness = 0): HTMLCanvasElement {
  const [c, g] = canvas(size, size);
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(Math.min(0.9, 0.15 + hardness), 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function softRing(size: number, thickness: number): HTMLCanvasElement {
  const [c, g] = canvas(size, size);
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  const t = thickness / r;
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(Math.max(0, 1 - t * 2.5), 'rgba(255,255,255,0)');
  grad.addColorStop(1 - t, 'rgba(255,255,255,1)');
  grad.addColorStop(0.985, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function puff(): HTMLCanvasElement {
  const [c, g] = canvas(48, 48);
  for (let i = 0; i < 7; i++) {
    const x = 24 + Math.cos(i * 2.1) * 8, y = 24 + Math.sin(i * 1.7) * 8;
    const grad = g.createRadialGradient(x, y, 0, x, y, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
  }
  return c;
}

/** crescent slash, opening to the right (+x), centre of the swing at the texture centre */
function slash(): HTMLCanvasElement {
  const [c, g] = canvas(128, 128);
  g.translate(64, 64);
  g.shadowColor = 'white';
  g.shadowBlur = 8;
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const a0 = -1.1 + t * 2.2;
    const w = Math.sin(t * Math.PI) * 13 + 1;
    g.fillStyle = `rgba(255,255,255,${0.25 + 0.75 * Math.sin(t * Math.PI)})`;
    g.beginPath();
    g.arc(0, 0, 58, a0, a0 + 2.2 / steps + 0.02);
    g.arc(0, 0, 58 - w, a0 + 2.2 / steps + 0.02, a0, true);
    g.closePath();
    g.fill();
  }
  return c;
}

function beam(): HTMLCanvasElement {
  const [c, g] = canvas(64, 24);
  const grad = g.createLinearGradient(0, 0, 0, 24);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 24);
  return c;
}

export function vignetteCanvas(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 40, 128, 128, 182);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(2,3,8,0.35)');
  grad.addColorStop(1, 'rgba(2,3,8,0.92)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return c;
}

// ---------------------------------------------------------------- build all

export function buildAssets(): Assets {
  const pxItems: Record<string, Pix> = {};

  // heroes
  const bodyFrames = Object.fromEntries(HERO_BODIES.map((b) => [b, drawHeroFrames({ body: b, palette: HERO_PALETTES[b] })])) as Record<HeroBody, HeroFrames>;
  // every skin cosmetic gets its own frames, keyed by skin id
  const heroFrames: Record<string, HeroFrames> = {};
  for (const c of COSMETICS) {
    if (c.kind !== 'skin') continue;
    if (c.skin === 'sprout') heroFrames[c.id] = bodyFrames.sprout;
    else {
      const body = c.hero as HeroBody;
      if (c.skin === 'spectral') {
        const f = bodyFrames[body];
        heroFrames[c.id] = { idle: f.idle.map(spectral), run: f.run.map(spectral), victory: spectral(f.victory) };
      } else heroFrames[c.id] = c.skin === 'default' ? bodyFrames[body] : drawHeroFrames({ body, palette: skinPalette(HERO_PALETTES[body], c.skin ?? 'default', body === 'pyre') });
    }
  }
  for (const [body, f] of Object.entries(heroFrames)) {
    f.idle.forEach((p, i) => (pxItems[`${body}_idle${i}`] = p));
    f.run.forEach((p, i) => (pxItems[`${body}_run${i}`] = p));
    pxItems[`${body}_victory`] = f.victory;
    pxItems[`${body}_flash`] = f.idle[0].silhouette(0xffffff);
  }

  // enemies
  const enemyShapes: Record<string, [number, number, number][]> = {};
  for (const [id, draw] of Object.entries(ENEMY_DRAW)) {
    for (let i = 0; i < ENEMY_FRAMES; i++) pxItems[`e_${id}_${i}`] = draw(i);
    const f0 = pxItems[`e_${id}_0`];
    pxItems[`e_${id}_flash`] = f0.silhouette(0xffffff);
    enemyShapes[id] = f0.opaquePoints(BIG_SPRITES.has(id) ? 2 : 1).map(([x, y, c]) => [x - f0.w / 2, y - f0.h / 2, c]);
  }
  for (const [id, draw] of Object.entries(BOSS_DRAW)) {
    for (let f = 0; f < 2; f++) {
      pxItems[`boss_${id}_${f}`] = draw(f, false);
      pxItems[`bossc_${id}_${f}`] = draw(f, true);
    }
    const b0 = pxItems[`boss_${id}_0`];
    pxItems[`boss_${id}_flash`] = b0.silhouette(0xffffff);
    enemyShapes[id] = b0.opaquePoints(3).map(([x, y, c]) => [x - b0.w / 2, y - b0.h / 2, c]);
  }

  // particles / digits / pickups / projectiles / objects
  pxItems.px = fx.pxSquare(2);
  pxItems.dot = fx.pxSquare(4);
  pxItems.ember = fx.ember();
  pxItems.spark = fx.spark();
  pxItems.shard = fx.shard();
  pxItems.star = fx.star();
  for (const ch of fx.DIGIT_CHARS) pxItems[`d_${ch}`] = fx.glyph(ch);
  for (let t = 0; t < 4; t++) pxItems[`gem${t}`] = fx.gem(t);
  for (let f = 0; f < 4; f++) pxItems[`coin${f}`] = fx.coin(f);
  pxItems.food = fx.food();
  pxItems.magnet = fx.magnet();
  pxItems.bomb = fx.bomb();
  pxItems.glaive = fx.glaive();
  pxItems.missile = fx.missile();
  pxItems.orb = fx.enemyOrb(false);
  pxItems.orb_big = fx.enemyOrb(true);
  pxItems.orb_w = fx.enemyOrbNeutral(false);
  pxItems.orb_big_w = fx.enemyOrbNeutral(true);
  pxItems.rune_blade = fx.runeBlade();
  pxItems.chest = fx.chest(false, false);
  pxItems.chest_open = fx.chest(true, false);
  pxItems.chest_gold = fx.chest(false, true);
  pxItems.chest_gold_open = fx.chest(true, true);
  pxItems.shrine = fx.shrine(false, false);
  pxItems.shrine_cursed = fx.shrine(true, false);
  pxItems.shrine_spent = fx.shrine(false, true);
  pxItems.pylon = fx.pylon();
  pxItems.turret = fx.turret();
  pxItems.wheel = fx.wheelShield();
  pxItems.spirit0 = fx.spirit(0);
  pxItems.spirit1 = fx.spirit(1);
  pxItems.round = fx.round();
  pxItems.salvage0 = fx.salvageDrone(0);
  pxItems.salvage1 = fx.salvageDrone(1);
  pxItems.vent = fx.vent();
  pxItems.sigil = fx.sigil(0xffffff);
  for (let i = 0; i < 4; i++) pxItems[`wreck${i}`] = wreck(i);
  for (let i = 0; i < 4; i++) pxItems[`debris${i}`] = debris(i);
  pxItems.lamp_red = lamp(0xff3d3d);
  pxItems.lamp_amber = lamp(0xffa53d);
  pxItems.lamp_blue = lamp(0x5cc8ff);
  pxItems.girder = girder();
  // Cathedral Moon decor
  pxItems.pillar = pillar(false);
  pxItems.pillar_broken = pillar(true);
  pxItems.pew = pew();
  pxItems.candles3 = candles(3);
  pxItems.candles2 = candles(2);
  pxItems.bell = bell();
  for (const [k, c] of Object.entries({ r: 0xc04040, b: 0x4060c0, y: 0xc0a030, g: 0x40a060, p: 0x8040c0 })) pxItems[`glass_${k}`] = glassShard(c);

  // Black Sun decor
  for (let i = 0; i < 3; i++) pxItems[`spire${i}`] = crystalSpire(i);
  for (let i = 0; i < 3; i++) pxItems[`rock${i}`] = floatingRock(i);
  pxItems.ember = starEmber();

  // Frozen Archive decor
  for (let i = 0; i < 2; i++) pxItems[`drift${i}`] = snowDrift(i);
  for (let i = 0; i < 2; i++) pxItems[`shelf${i}`] = buriedShelf(i);
  pxItems.fpillar = frozenPillar(false);
  pxItems.fpillar_broken = frozenPillar(true);
  for (let i = 0; i < 2; i++) pxItems[`icespike${i}`] = iceSpikes(i);
  for (let i = 0; i < 3; i++) pxItems[`book${i}`] = lostBook(i);
  // Hive decor
  for (let i = 0; i < 2; i++) pxItems[`ridge${i}`] = chitinRidge(i);
  for (let i = 0; i < 2; i++) pxItems[`tendril${i}`] = deadTendril(i);
  pxItems.glowpod = glowPod();
  pxItems.nest_shell = nestShell();

  const px = pack(pxItems, true);
  const soft = pack(
    {
      glow: softGlow(64),
      glow_hard: softGlow(64, 0.35),
      ring: softRing(128, 6),
      ring_thick: softRing(128, 18),
      puff: puff(),
      slash: slash(),
      beam: beam(),
    },
    false,
  );

  const floorTex = (pix: Pix): Texture => {
    const src = TextureSource.from(pix.toCanvas());
    src.scaleMode = 'nearest';
    src.addressMode = 'repeat';
    return new Texture({ source: src });
  };

  const heroes: Record<string, HeroTextures> = {};
  for (const body of Object.keys(heroFrames)) {
    const f = heroFrames[body];
    heroes[body] = {
      idle: f.idle.map((_, i) => px.frames[`${body}_idle${i}`]),
      run: f.run.map((_, i) => px.frames[`${body}_run${i}`]),
      victory: px.frames[`${body}_victory`],
      flash: px.frames[`${body}_flash`],
      shape: f.idle[0].opaquePoints(1).map(([x, y, c]) => [x - 16, y - 36, c]),
    };
  }

  const enemy: Record<string, Texture[]> = {};
  const enemyFlash: Record<string, Texture> = {};
  for (const id of Object.keys(ENEMY_DRAW)) {
    enemy[id] = [0, 1].map((i) => px.frames[`e_${id}_${i}`]);
    enemyFlash[id] = px.frames[`e_${id}_flash`];
  }

  const iconPix = buildIcons();
  const icons: Record<string, string> = {};
  for (const [k, p] of Object.entries(iconPix)) icons[k] = p.toDataURL();
  // hero portraits for menus
  for (const b of HERO_BODIES) icons[`hero_${b}`] = bodyFrames[b].idle[0].toDataURL();
  for (const [id, f] of Object.entries(heroFrames)) icons[`skin_${id}`] = f.idle[0].toDataURL();
  for (const a of ACHIEVEMENTS) icons[`ach_${a.id}`] = achievementIcon(a.icon, a.color).toDataURL();
  for (const id of Object.keys(ENEMY_DRAW)) icons[`enemy_${id}`] = pxItems[`e_${id}_0`].toDataURL();
  for (const id of Object.keys(BOSS_DRAW)) icons[`enemy_${id}`] = pxItems[`boss_${id}_0`].toDataURL();
  icons.i_salvage = pxItems.salvage0.toDataURL();

  return {
    px: px.frames,
    soft: soft.frames,
    pxSource: px.source,
    softSource: soft.source,
    floor: { graveyard: floorTex(graveyardFloor(3)), cathedral: floorTex(cathedralFloor(2)), blacksun: floorTex(blackSunFloor(4)), archive: floorTex(archiveFloor(5)), hive: floorTex(hiveFloor(6)) },
    heroes,
    enemy,
    enemyFlash,
    enemyShape: enemyShapes,
    bossArt: Object.fromEntries(
      Object.keys(BOSS_DRAW).map((id) => [id, { normal: [px.frames[`boss_${id}_0`], px.frames[`boss_${id}_1`]], cracked: [px.frames[`bossc_${id}_0`], px.frames[`bossc_${id}_1`]], flash: px.frames[`boss_${id}_flash`] }]),
    ),
    icons,
  };
}
