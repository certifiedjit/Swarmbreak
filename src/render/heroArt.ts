/**
 * Hero sprites (32x40), drawn in layers so skins/cosmetics are mostly palette,
 * glow and part swaps: cape/back item → held weapon → legs → torso → helm → shield.
 */
import { OUTLINE, Pix, blend, shade } from './pixel';

export const HERO_W = 32;
export const HERO_H = 40;

export interface HeroPalette {
  armorDark: number;
  armorMid: number;
  armorLight: number;
  armorHi: number;
  clothDark: number;
  clothMid: number;
  glow: number;
  shieldFace: number;
  shieldRim: number;
  bladeCore: number;
}

export type HeroBody = 'warden' | 'sprout';

export interface HeroLook {
  body: HeroBody;
  palette: HeroPalette;
}

export const WARDEN_PALETTE: HeroPalette = {
  armorDark: 0x1f2433,
  armorMid: 0x323a50,
  armorLight: 0x4a556f,
  armorHi: 0x6f7d9c,
  clothDark: 0x170f22,
  clothMid: 0x2a1c3d,
  glow: 0x59f3ff,
  shieldFace: 0x262d40,
  shieldRim: 0x4a556f,
  bladeCore: 0xeaffff,
};

interface Pose {
  bob: number;
  frontLeg: [number, number];
  backLeg: [number, number];
  cape: number;
  glow: number;
  victory: boolean;
}

function leg(p: Pix, hipX: number, hipY: number, footDx: number, footLift: number, c: number, cHi: number, boot: number): void {
  const fx = hipX + footDx;
  const fy = 36 - footLift;
  for (let t = 0; t <= 1.001; t += 1 / 10) {
    const x = hipX + (fx - hipX) * t;
    const y = hipY + (fy - hipY) * t;
    p.rect(Math.round(x), Math.round(y), 4, 1, c);
    p.set(Math.round(x) + 3, Math.round(y), cHi);
  }
  // boot
  p.rect(fx - 0, fy, 5, 2, boot);
  p.set(fx + 4, fy, shade(boot, 1.4));
}

function drawWarden(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob;
  const glow = blend(shade(pal.glow, 0.45), pal.glow, pose.glow);
  const glowHot = blend(pal.glow, 0xffffff, 0.45 * pose.glow);

  // --- cape (behind)
  const flap = pose.cape;
  p.poly(
    [
      [11, 14 + b],
      [18, 14 + b],
      [17, 33],
      [12 - flap, 35],
      [6 - flap, 33],
      [8 - flap * 0.5, 22 + b],
    ],
    pal.clothDark,
  );
  p.line(17, 15 + b, 16, 32, pal.clothMid);
  p.line(10, 18 + b, 8 - flap, 31, pal.clothMid);
  p.line(6 - flap, 33, 12 - flap, 35, shade(glow, 0.7)); // glowing hem

  // --- Oathblade (back hand): dark edges, bright core, tapered tip, crossguard, grip, pommel gem
  const edge = shade(pal.glow, 0.42);
  if (pose.victory) {
    // raised straight up
    for (let y = 1; y <= 16; y++) {
      const tip = y <= 2;
      if (!tip) p.set(8, y, edge);
      p.set(9, y, y % 4 === 0 ? glowHot : glow);
      p.set(10, y, pal.bladeCore);
      if (!tip) p.set(11, y, edge);
    }
    p.set(9, 0, pal.bladeCore);
    p.rect(6, 17, 8, 1, blend(pal.armorHi, 0xffffff, 0.35));
    p.rect(6, 18, 8, 1, pal.armorLight);
    p.set(9, 17, glowHot);
    p.set(10, 17, glowHot);
    p.rect(9, 19, 2, 3, pal.clothMid);
    p.set(9, 22, glow);
    p.set(10, 22, glow);
  } else {
    const hx = 11, hy = 25 + b;
    const L = 15;
    for (let t = 0; t < L; t++) {
      const x = Math.round(hx - 4 - t * 0.45);
      const y = Math.round(hy - 4 - t);
      const tip = t >= L - 2;
      if (!tip) p.set(x - 1, y, edge);
      p.set(x, y, t % 4 === 1 ? glowHot : glow);
      p.set(x + 1, y, tip ? glow : pal.bladeCore);
      if (!tip) p.set(x + 2, y, edge);
    }
    // crossguard (perpendicular to the blade), 2px thick with a glowing gem
    p.line(hx - 7, hy - 1, hx - 1, hy - 4, blend(pal.armorHi, 0xffffff, 0.35));
    p.line(hx - 7, hy, hx - 1, hy - 3, pal.armorLight);
    p.set(hx - 4, hy - 2, glowHot);
    // grip + pommel
    p.rect(hx - 3, hy - 1, 2, 3, pal.clothMid);
    p.set(hx - 2, hy - 1, shade(pal.clothMid, 1.5));
    p.set(hx - 2, hy + 2, glow);
  }

  // --- back leg
  leg(p, 13, 28 + b, pose.backLeg[0], pose.backLeg[1], pal.armorDark, pal.armorMid, shade(pal.armorDark, 0.85));

  // --- torso
  p.poly(
    [
      [10, 15 + b],
      [22, 15 + b],
      [21, 27 + b],
      [12, 27 + b],
    ],
    pal.armorMid,
  );
  p.poly(
    [
      [12, 16 + b],
      [21, 16 + b],
      [20, 22 + b],
      [13, 22 + b],
    ],
    pal.armorLight,
  );
  p.line(13, 16 + b, 20, 16 + b, pal.armorHi);
  // chest rune
  for (let i = 0; i < 3; i++) {
    p.set(14 + i, 18 + i + b, glow);
    p.set(19 - i, 18 + i + b, glow);
  }
  p.rect(16, 21 + b, 2, 1, glowHot);
  p.rect(16, 22 + b, 2, 2, shade(glow, 0.7));
  // belt + buckle
  p.rect(11, 25 + b, 11, 2, pal.armorDark);
  p.rect(16, 25 + b, 2, 2, glow);
  // tassets
  p.rect(12, 27 + b, 4, 3, pal.armorDark);
  p.rect(17, 27 + b, 4, 3, pal.armorDark);
  p.set(15, 27 + b, pal.armorMid);

  // --- front leg
  leg(p, 17, 28 + b, pose.frontLeg[0], pose.frontLeg[1], pal.armorMid, pal.armorLight, pal.armorDark);

  // --- helm
  p.rect(12, 5 + b, 9, 9, pal.armorMid);
  p.rect(13, 4 + b, 7, 1, pal.armorMid);
  p.rect(13, 5 + b, 7, 3, pal.armorLight);
  p.line(14, 4 + b, 19, 4 + b, pal.armorHi);
  // crest fin
  p.rect(14, 2 + b, 5, 2, pal.armorDark);
  p.set(18, 2 + b, glow);
  p.set(17, 1 + b, pal.armorDark);
  // T visor
  p.rect(15, 9 + b, 7, 2, glow);
  p.rect(18, 11 + b, 2, 2, shade(glow, 0.8));
  p.set(20, 9 + b, glowHot);
  p.set(21, 9 + b, glowHot);
  // gorget
  p.rect(13, 13 + b, 8, 2, pal.armorDark);

  // --- pauldrons
  p.ellipse(11, 16 + b, 3, 2.5, pal.armorDark);
  p.ellipse(20.5, 15.5 + b, 3.5, 3, pal.armorLight);
  p.line(18, 13 + b, 22, 13 + b, pal.armorHi);
  p.set(21, 16 + b, glow);

  // --- tower shield (front)
  const sy = 15 + b;
  p.poly(
    [
      [21, sy],
      [29, sy],
      [29, sy + 14],
      [25, sy + 17],
      [21, sy + 14],
    ],
    pal.shieldRim,
  );
  p.poly(
    [
      [22, sy + 1],
      [28, sy + 1],
      [28, sy + 13],
      [25, sy + 15],
      [22, sy + 13],
    ],
    pal.shieldFace,
  );
  p.line(22, sy + 1, 22, sy + 13, shade(pal.shieldFace, 0.75));
  p.line(28, sy + 1, 28, sy + 12, shade(pal.shieldRim, 1.25));
  // shield rune: vertical line with a diamond
  for (let y = sy + 2; y <= sy + 13; y++) p.set(25, y, glow);
  p.poly(
    [
      [25, sy + 4],
      [27.5, sy + 7],
      [25, sy + 10],
      [22.5, sy + 7],
    ],
    glow,
  );
  p.rect(24, sy + 6, 2, 2, glowHot);
  p.set(23, sy + 3, shade(glow, 0.6));
  p.set(27, sy + 3, shade(glow, 0.6));

  p.rim(0xaee9ff, 1, 0, 0.3).rim(0xaee9ff, 0, -1, 0.2);
  p.outline(OUTLINE);
  return p;
}

function drawSprout(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob;
  const glow = blend(shade(0x8dff6a, 0.5), 0x8dff6a, pose.glow);
  const seedDark = 0x3b2a1c, seedMid = 0x5c4229, seedHi = 0x7d5c37;
  // feet
  p.rect(12 + pose.backLeg[0] / 2, 35 - pose.backLeg[1], 3, 2, seedDark);
  p.rect(18 + pose.frontLeg[0] / 2, 35 - pose.frontLeg[1], 3, 2, seedDark);
  // seed body
  p.ellipse(16, 28 + b, 7.5, 8, seedMid);
  p.ellipse(17.5, 25.5 + b, 4, 3.5, seedHi);
  p.ellipse(13, 31 + b, 4, 3.5, seedDark);
  // glowing veins
  p.line(12, 24 + b, 14, 33 + b, shade(glow, 0.8));
  p.line(19, 30 + b, 21, 26 + b, shade(glow, 0.8));
  // face
  p.rect(18, 26 + b, 1, 2, glow);
  p.rect(21, 26 + b, 1, 2, glow);
  p.set(18, 26 + b, 0xffffff);
  p.set(21, 26 + b, 0xffffff);
  p.rect(19, 30 + b, 2, 1, shade(seedDark, 0.8));
  // stem + leaf (sways)
  const sway = pose.cape - 1;
  p.line(16, 20 + b, 16 + sway, 15 + b, 0x3f8f2c);
  p.poly(
    [
      [16 + sway, 15 + b],
      [20 + sway, 9 + b],
      [27 + sway, 8 + b],
      [24 + sway, 13 + b],
    ],
    0x57c93e,
  );
  p.line(16 + sway, 15 + b, 25 + sway, 9 + b, 0xb8ff8a);
  p.set(26 + sway, 8 + b, glow);
  // tiny second leaf
  p.poly(
    [
      [16 + sway, 16 + b],
      [12 + sway, 12 + b],
      [10 + sway, 14 + b],
    ],
    0x3f9a2e,
  );
  p.rim(0xd7ffb8, 1, 0, 0.25).rim(0xd7ffb8, 0, -1, 0.2);
  p.outline(OUTLINE);
  void pal;
  return p;
}

const IDLE_BOB = [0, 0, 1, 1];
const IDLE_GLOW = [0.65, 0.85, 1, 0.85];
const RUN_FRONT: [number, number][] = [[4, 0], [2, 2], [0, 1], [-3, 0], [-1, 1], [2, 1]];
const RUN_BACK: [number, number][] = [[-3, 0], [-1, 1], [2, 1], [4, 0], [2, 2], [0, 1]];
const RUN_BOB = [0, 1, 0, 0, 1, 0];
const RUN_CAPE = [3, 2, 1, 3, 2, 1];

export interface HeroFrames {
  idle: Pix[];
  run: Pix[];
  victory: Pix;
}

export function drawHeroFrames(look: HeroLook): HeroFrames {
  const draw = look.body === 'sprout' ? drawSprout : drawWarden;
  const idle = IDLE_BOB.map((bob, i) =>
    draw(look.palette, { bob, frontLeg: [0, 0], backLeg: [0, 0], cape: i % 2, glow: IDLE_GLOW[i], victory: false }),
  );
  const run = RUN_BOB.map((bob, i) =>
    draw(look.palette, { bob, frontLeg: RUN_FRONT[i], backLeg: RUN_BACK[i], cape: RUN_CAPE[i], glow: 0.9, victory: false }),
  );
  const victory = draw(look.palette, { bob: 0, frontLeg: [1, 0], backLeg: [-1, 0], cape: 2, glow: 1, victory: true });
  return { idle, run, victory };
}
