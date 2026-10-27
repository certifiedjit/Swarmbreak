/**
 * The five unlockable heroes' bodies (32x40, facing right, feet on y≈36), drawn
 * in the same layered style as the Warden in heroArt.ts. Each has a silhouette
 * that reads at a glance and its start weapon clearly in hand.
 */
import { OUTLINE, Pix, blend, shade } from './pixel';
import type { HeroPalette } from './heroArt';

const HERO_W = 32;
const HERO_H = 40;

export interface Pose {
  bob: number;
  frontLeg: [number, number];
  backLeg: [number, number];
  cape: number;
  glow: number;
  victory: boolean;
  /** animation phase 0..1 across the cycle (orbiting coins, flame flicker) */
  t: number;
}

export function leg(p: Pix, hipX: number, hipY: number, footDx: number, footLift: number, c: number, cHi: number, boot: number, w = 4): void {
  const fx = hipX + footDx;
  const fy = 36 - footLift;
  for (let t = 0; t <= 1.001; t += 1 / 10) {
    const x = hipX + (fx - hipX) * t;
    const y = hipY + (fy - hipY) * t;
    p.rect(Math.round(x), Math.round(y), w, 1, c);
    p.set(Math.round(x) + w - 1, Math.round(y), cHi);
  }
  p.rect(fx, fy, w + 1, 2, boot);
  p.set(fx + w, fy, shade(boot, 1.4));
}

function glows(pal: HeroPalette, k: number): { glow: number; hot: number } {
  return { glow: blend(shade(pal.glow, 0.45), pal.glow, k), hot: blend(pal.glow, 0xffffff, 0.45 * k) };
}

/** a licking flame, base at (x, y), `h` tall */
function flame(p: Pix, x: number, y: number, h: number, t: number, outer: number, mid: number, core: number): void {
  for (let i = 0; i < h; i++) {
    const f = i / h;
    const w = Math.max(0, Math.round((1 - f) * (h * 0.45) + 0.4));
    const sway = Math.round(Math.sin(t * Math.PI * 2 + f * 3) * f * 1.4);
    const cx = x + sway, cy = y - i;
    p.rect(cx - w, cy, w * 2 + 1, 1, outer);
    if (w >= 1) p.rect(cx - w + 1, cy, w * 2 - 1, 1, mid);
    if (f < 0.55 && w >= 2) p.rect(cx - w + 2, cy, Math.max(1, w * 2 - 3), 1, core);
  }
}

function finish(p: Pix, rimC: number): Pix {
  p.rim(rimC, 1, 0, 0.3).rim(rimC, 0, -1, 0.2);
  p.outline(OUTLINE);
  return p;
}

// ---------------------------------------------------------------- Glint: slim scout, trailing scarf, double plasma glaive

export const GLINT_PALETTE: HeroPalette = {
  armorDark: 0x1a1426,
  armorMid: 0x2c2244,
  armorLight: 0x473862,
  armorHi: 0x6f5c94,
  clothDark: 0x5a0f44,
  clothMid: 0xc21c79,
  glow: 0xff4dd2,
  shieldFace: 0x2c2244,
  shieldRim: 0x473862,
  bladeCore: 0xffe8fb,
};

/** a four-bladed plasma glaive (the same star as the thrown projectile), spun by `spin` 0..1 */
function glaive(p: Pix, cx: number, cy: number, R: number, spin: number, pal: HeroPalette, glow: number, hot: number): void {
  for (let k = 0; k < 4; k++) {
    const a = spin * Math.PI * 0.5 + (k * Math.PI) / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tip: [number, number] = [cx + ca * R, cy + sa * R];
    const l: [number, number] = [cx + ca * 1.8 - sa * 1.8, cy + sa * 1.8 + ca * 1.8];
    const r: [number, number] = [cx + ca * 1.8 + sa * 1.8, cy + sa * 1.8 - ca * 1.8];
    p.poly([tip, l, [cx, cy], r], glow);
    p.line(cx + ca * 2, cy + sa * 2, tip[0] - ca, tip[1] - sa, pal.bladeCore);
  }
  p.circle(cx, cy, 2, shade(pal.glow, 0.5));
  p.set(Math.round(cx - 0.5), Math.round(cy - 0.5), hot);
}

export function drawGlint(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob + 1;
  const { glow, hot } = glows(pal, pose.glow);
  const flap = pose.cape;

  // scarf tails streaming behind
  p.poly([[14, 14 + b], [17, 15 + b], [9 - flap, 19 + b], [2 - flap, 17 + b + (flap % 2)], [7 - flap, 16 + b]], pal.clothMid);
  p.poly([[14, 15 + b], [16, 16 + b], [8 - flap, 22 + b], [3 - flap, 22 + b - (flap % 2)], [7 - flap, 19 + b]], pal.clothDark);
  p.line(3 - flap, 17 + b + (flap % 2), 8 - flap, 18 + b, blend(pal.clothMid, 0xffffff, 0.3));

  leg(p, 13, 26 + b, pose.backLeg[0], pose.backLeg[1], pal.armorDark, pal.armorMid, shade(pal.armorDark, 0.8), 3);
  // lean torso
  p.poly([[13, 16 + b], [19, 16 + b], [19, 25 + b], [14, 25 + b]], pal.armorMid);
  p.poly([[14, 17 + b], [18, 17 + b], [18, 21 + b], [15, 21 + b]], pal.armorLight);
  p.line(16, 17 + b, 16, 24 + b, glow);
  p.rect(13, 24 + b, 7, 1, pal.armorDark);
  p.set(17, 24 + b, hot);
  leg(p, 16, 26 + b, pose.frontLeg[0], pose.frontLeg[1], pal.armorMid, pal.armorLight, pal.armorDark, 3);

  // head: sleek mask with a visor slit and an antenna
  p.ellipse(16.5, 10 + b, 3.6, 4.2, pal.armorMid);
  p.ellipse(17.5, 9 + b, 2.4, 2.2, pal.armorLight);
  p.rect(16, 10 + b, 5, 1, glow);
  p.set(20, 10 + b, hot);
  p.line(14, 7 + b, 11, 3 + b, pal.armorHi);
  p.set(11, 3 + b, glow);
  // scarf wrap
  p.rect(13, 14 + b, 7, 2, pal.clothMid);
  p.rect(14, 15 + b, 5, 1, pal.clothDark);

  if (pose.victory) {
    // glaive thrust overhead
    p.line(18, 16 + b, 21, 8 + b, pal.armorLight);
    p.line(19, 16 + b, 22, 8 + b, pal.armorMid);
    glaive(p, 22.5, 5, 5.5, 0.5, pal, glow, hot);
  } else {
    // arm forward, glaive spinning in the hand
    p.line(18, 17 + b, 22, 20 + b, pal.armorLight);
    p.line(18, 18 + b, 22, 21 + b, pal.armorMid);
    glaive(p, 25.5, 19.5 + b, 5.5, pose.t, pal, glow, hot);
  }
  return finish(p, 0xffc4ef);
}

// ---------------------------------------------------------------- Voidcaller: hooded robe, rune halo, void-orb staff

export const VOIDCALLER_PALETTE: HeroPalette = {
  armorDark: 0x221438,
  armorMid: 0x3a2360,
  armorLight: 0x573a8a,
  armorHi: 0x8a6ec0,
  clothDark: 0x170d26,
  clothMid: 0x2c1a48,
  glow: 0xb36bff,
  shieldFace: 0x05030a,
  shieldRim: 0x3a2360,
  bladeCore: 0xf2e6ff,
};

export function drawVoidcaller(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob;
  const { glow, hot } = glows(pal, pose.glow);
  const sway = pose.cape - 1;

  // rune halo behind the head
  const hr = pose.victory ? 8 : 7;
  p.ring(15.5, 9 + b, hr + 0.5, 1, shade(pal.glow, 0.35));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + pose.t * Math.PI * 0.4;
    const x = Math.round(15.5 + Math.cos(a) * hr), y = Math.round(9 + b + Math.sin(a) * hr * 0.9);
    p.set(x, y, i % 2 ? glow : hot);
  }

  // staff (behind the sleeve)
  const sx = 24;
  const top = pose.victory ? 1 : 6 + b;
  p.line(sx, top + 3, sx - (pose.victory ? 0 : 1), 36, pal.armorDark);
  p.line(sx + 1, top + 3, sx + 1 - (pose.victory ? 0 : 1), 35, pal.armorMid);
  p.line(sx - 2, top + 5, sx - 3, top, pal.armorHi);
  p.line(sx + 3, top + 5, sx + 4, top, pal.armorHi);
  p.circle(sx + 0.5, top + 1, 2.6, pal.glow);
  p.circle(sx + 0.5, top + 1, 1.6, pal.shieldFace);
  p.set(sx, top, pal.bladeCore);
  p.set(sx + 1, top + 2, hot);

  // tiny feet peeking under the hem
  p.rect(12 + Math.round(pose.backLeg[0] / 2), 35 - pose.backLeg[1], 3, 2, pal.clothDark);
  p.rect(17 + Math.round(pose.frontLeg[0] / 2), 35 - pose.frontLeg[1], 3, 2, pal.armorDark);

  // robe: a long cone
  p.poly([[12, 13 + b], [20, 13 + b], [23 + sway * 0.5, 35], [8 - sway, 35]], pal.clothMid);
  p.poly([[13, 14 + b], [16, 14 + b], [14, 35], [10 - sway, 35]], pal.clothDark);
  p.line(18, 16 + b, 20 + sway * 0.5, 34, shade(pal.clothMid, 1.35));
  // hem runes
  for (let x = 9 - sway; x <= 22; x += 3) p.set(x, 34, glow);
  p.line(8 - sway, 35, 23 + sway * 0.5, 35, shade(glow, 0.55));
  // sash
  p.rect(13, 22 + b, 8, 1, pal.armorMid);
  p.set(17, 22 + b, hot);

  // hood with a dark void face and two eyes
  p.poly([[11, 15 + b], [12, 7 + b], [15, 3 + b], [19, 4 + b], [22, 9 + b], [21, 15 + b]], pal.armorMid);
  p.poly([[12, 14 + b], [13, 8 + b], [15, 5 + b], [16, 6 + b], [14, 14 + b]], pal.armorDark);
  p.line(15, 3 + b, 19, 4 + b, pal.armorHi);
  p.ellipse(18.5, 10.5 + b, 2.6, 3.2, pal.shieldFace);
  p.set(18, 10 + b, hot);
  p.set(20, 10 + b, hot);

  // sleeve reaching to the staff
  if (pose.victory) {
    p.poly([[19, 15 + b], [22, 13 + b], [24, 9], [22, 9], [18, 17 + b]], pal.clothMid);
  } else {
    p.poly([[18, 15 + b], [21, 16 + b], [24, 20 + b], [22, 22 + b], [18, 19 + b]], pal.clothMid);
    p.rect(22, 20 + b, 2, 2, glow);
  }
  return finish(p, 0xe2c8ff);
}

// ---------------------------------------------------------------- Riven: engineer with a backpack workshop, blaster and drone

export const RIVEN_PALETTE: HeroPalette = {
  armorDark: 0x2c2618,
  armorMid: 0x4d4226,
  armorLight: 0x725f34,
  armorHi: 0x9e8a4e,
  clothDark: 0x1d2530,
  clothMid: 0x34404f,
  glow: 0xffd34d,
  shieldFace: 0x353b45,
  shieldRim: 0x5b636e,
  bladeCore: 0xfff6c8,
};

export function drawRiven(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob;
  const { glow, hot } = glows(pal, pose.glow);

  // backpack workshop
  p.rect(5, 13 + b, 8, 13, pal.shieldRim);
  p.rect(6, 14 + b, 6, 11, pal.shieldFace);
  p.rect(7, 16 + b, 4, 1, glow);
  p.rect(7, 19 + b, 4, 1, shade(glow, 0.6));
  p.rect(6, 23 + b, 2, 2, pal.armorDark);
  p.rect(9, 23 + b, 2, 2, pal.armorDark);
  p.line(7, 13 + b, 5, 6 + b, pal.shieldRim);
  p.set(5, 5 + b, pose.glow > 0.8 ? hot : glow);
  p.rect(12, 12 + b, 2, 3, pal.shieldRim); // pipe

  leg(p, 13, 27 + b, pose.backLeg[0], pose.backLeg[1], pal.clothDark, pal.clothMid, shade(pal.armorDark, 0.8));
  // jacket
  p.poly([[11, 15 + b], [21, 15 + b], [21, 27 + b], [12, 27 + b]], pal.armorMid);
  p.poly([[13, 16 + b], [20, 16 + b], [20, 21 + b], [13, 21 + b]], pal.armorLight);
  p.line(12, 15 + b, 18, 26 + b, pal.armorDark); // strap
  p.rect(11, 25 + b, 11, 2, pal.armorDark); // tool belt
  p.rect(13, 25 + b, 2, 2, pal.armorHi);
  p.rect(18, 25 + b, 2, 2, glow);
  leg(p, 17, 27 + b, pose.frontLeg[0], pose.frontLeg[1], pal.clothMid, shade(pal.clothMid, 1.3), pal.armorDark);

  // head: hard hat and big goggles
  p.rect(13, 8 + b, 8, 7, 0xb7825c);
  p.rect(13, 12 + b, 8, 3, 0x6a4430); // beard
  p.ellipse(17, 7 + b, 5, 3, pal.armorLight);
  p.rect(11, 8 + b, 12, 1, pal.armorHi);
  p.rect(15, 4 + b, 3, 1, pal.armorHi);
  p.rect(15, 9 + b, 7, 3, pal.armorDark);
  p.rect(16, 10 + b, 2, 1, glow);
  p.rect(19, 10 + b, 2, 1, glow);
  p.set(21, 10 + b, hot);

  // blaster
  if (pose.victory) {
    p.line(19, 16 + b, 22, 10 + b, pal.armorLight);
    p.rect(21, 3 + b, 4, 8, pal.shieldRim);
    p.rect(22, 4 + b, 2, 6, pal.shieldFace);
    p.rect(22, 1 + b, 2, 2, glow);
  } else {
    p.line(19, 17 + b, 22, 21 + b, pal.armorLight);
    p.line(19, 18 + b, 22, 22 + b, pal.armorMid);
    p.rect(21, 19 + b, 8, 4, pal.shieldRim);
    p.rect(22, 20 + b, 6, 2, pal.shieldFace);
    p.rect(29, 20 + b, 2, 2, glow);
    p.set(30, 20 + b, hot);
    p.rect(22, 18 + b, 2, 1, pal.armorHi); // wrench jaw
    p.rect(21, 23 + b, 2, 2, pal.shieldRim); // grip
  }

  // helper drone hovering over the shoulder
  const dy = Math.round(Math.sin(pose.t * Math.PI * 2) * 1.2);
  const dx0 = pose.victory ? 26 : 25;
  p.rect(dx0, 4 + dy, 5, 3, pal.shieldRim);
  p.rect(dx0 + 1, 5 + dy, 3, 1, pal.shieldFace);
  p.set(dx0 + 3, 5 + dy, hot);
  p.line(dx0 - 1, 3 + dy, dx0 + 5, 3 + dy, pose.glow > 0.8 ? pal.armorHi : pal.shieldRim);
  return finish(p, 0xfff0b0);
}

// ---------------------------------------------------------------- Fortune: wide-brim rogue, long coat, coin sceptre, orbiting cursed coin

export const FORTUNE_PALETTE: HeroPalette = {
  armorDark: 0x2c1810,
  armorMid: 0x4f2a1a,
  armorLight: 0x743e24,
  armorHi: 0xa06038,
  clothDark: 0x1a1122,
  clothMid: 0x2e2038,
  glow: 0xffb330,
  shieldFace: 0x1a1122,
  shieldRim: 0x3a2a48,
  bladeCore: 0xfff2c4,
};

function coin(p: Pix, x: number, y: number, r: number, pal: HeroPalette, hot: number): void {
  p.circle(x, y, r, pal.glow);
  p.circle(x - 0.3, y - 0.3, Math.max(0.8, r - 1), blend(pal.glow, 0xffffff, 0.35));
  p.set(Math.round(x), Math.round(y), shade(pal.glow, 0.55));
  p.set(Math.round(x - r + 1), Math.round(y - r + 1), hot);
}

export function drawFortune(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob;
  const { glow, hot } = glows(pal, pose.glow);
  const flap = pose.cape;
  const a = pose.t * Math.PI * 2;
  const orb = { x: 15.5 + Math.cos(a) * 12, y: 21 + b + Math.sin(a) * 4, front: Math.sin(a) > 0 };
  if (!pose.victory && !orb.front) coin(p, orb.x, orb.y, 1.6, pal, hot);

  // coat tails
  p.poly([[11, 22 + b], [19, 22 + b], [18, 33], [10 - flap, 34], [7 - flap, 31]], pal.armorDark);
  p.line(8 - flap, 31, 10 - flap, 34, shade(glow, 0.5));
  leg(p, 13, 27 + b, pose.backLeg[0], pose.backLeg[1], pal.clothDark, pal.clothMid, shade(pal.armorDark, 0.8), 3);
  // coat
  p.poly([[12, 15 + b], [20, 15 + b], [21, 27 + b], [12, 27 + b]], pal.armorMid);
  p.poly([[15, 15 + b], [19, 15 + b], [18, 22 + b], [16, 22 + b]], pal.clothMid); // vest
  p.line(15, 15 + b, 17, 22 + b, pal.armorLight);
  p.line(19, 15 + b, 17, 22 + b, pal.armorLight);
  p.set(17, 17 + b, glow);
  p.set(17, 19 + b, glow);
  p.rect(12, 23 + b, 9, 1, pal.armorDark);
  p.set(16, 23 + b, hot);
  leg(p, 17, 27 + b, pose.frontLeg[0], pose.frontLeg[1], pal.clothMid, shade(pal.clothMid, 1.4), pal.armorDark, 3);

  // head + domino mask
  p.rect(14, 9 + b, 6, 6, 0xd7a07a);
  p.rect(14, 10 + b, 7, 2, pal.clothDark);
  p.set(19, 10 + b, hot);
  p.rect(17, 13 + b, 2, 1, 0x8a4a3a);
  // wide-brim hat with a gold band and a feather
  p.rect(8, 8 + b, 17, 2, pal.clothDark);
  p.rect(9, 7 + b, 15, 1, pal.clothMid);
  p.rect(12, 2 + b, 9, 5, pal.clothDark);
  p.rect(13, 2 + b, 7, 1, pal.clothMid);
  p.rect(12, 6 + b, 9, 1, glow);
  p.line(12, 4 + b, 8, 0 + b, pal.armorHi);
  p.line(13, 4 + b, 9, 1 + b, shade(pal.armorHi, 1.3));

  // coin sceptre
  if (pose.victory) {
    p.line(19, 16 + b, 23, 10, pal.armorLight);
    p.line(23, 10, 25, 4, pal.armorHi);
    coin(p, 26, 2, 2.2, pal, hot);
    coin(p, 20, 0.5, 1.4, pal, hot);
  } else {
    p.line(19, 17 + b, 22, 21 + b, pal.armorLight);
    p.line(22, 21 + b, 27, 14 + b, pal.armorHi);
    p.line(23, 21 + b, 27, 15 + b, pal.armorDark);
    coin(p, 27.5, 12.5 + b, 2.4, pal, hot);
    // arc sparks off the coin
    p.set(30, 10 + b, hot);
    p.set(31, 12 + b, glow);
    p.set(29, 9 + b, glow);
  }
  if (!pose.victory && orb.front) coin(p, orb.x, orb.y, 1.6, pal, hot);
  return finish(p, 0xffe2a8);
}

// ---------------------------------------------------------------- Pyre: burning robe, crown of fire, brazier staff

export const PYRE_PALETTE: HeroPalette = {
  armorDark: 0x2c1210,
  armorMid: 0x4f1c14,
  armorLight: 0x74301c,
  armorHi: 0x5c4436,
  clothDark: 0x161012,
  clothMid: 0x2a1a1a,
  glow: 0xff6a2a,
  shieldFace: 0x2a1a14,
  shieldRim: 0x7a5a40,
  bladeCore: 0xfff0a0,
};

export function drawPyre(pal: HeroPalette, pose: Pose): Pix {
  const p = new Pix(HERO_W, HERO_H);
  const b = pose.bob;
  const { glow, hot } = glows(pal, pose.glow);
  const yellow = pal.bladeCore;
  const t = pose.t;

  // fireball cupped in the back hand
  flame(p, 9, 22 + b, 5, t + 0.3, shade(glow, 0.8), glow, yellow);

  leg(p, 13, 28 + b, pose.backLeg[0], pose.backLeg[1], pal.clothDark, pal.clothMid, shade(pal.armorDark, 0.8), 3);
  leg(p, 17, 28 + b, pose.frontLeg[0], pose.frontLeg[1], pal.clothMid, shade(pal.clothMid, 1.4), pal.armorDark, 3);
  // robe to the knee, burning at the hem
  p.poly([[12, 14 + b], [20, 14 + b], [23, 30 + b], [9, 30 + b]], pal.armorMid);
  p.poly([[12, 15 + b], [15, 15 + b], [13, 30 + b], [10, 30 + b]], pal.armorDark);
  p.line(19, 16 + b, 21, 29 + b, pal.armorLight);
  for (let x = 9; x <= 22; x++) {
    const hgt = (x + Math.round(t * 8)) % 3;
    p.set(x, 30 + b, hgt === 0 ? yellow : glow);
    if (hgt === 1) p.set(x, 29 + b, glow);
  }
  p.rect(12, 21 + b, 9, 1, pal.clothDark);
  p.set(16, 21 + b, hot);
  // arm to the brazier hand
  p.line(11, 17 + b, 9, 21 + b, pal.armorMid);

  // head + crown of fire
  p.ellipse(16.5, 10 + b, 3.4, 3.8, pal.armorDark);
  p.rect(14, 12 + b, 6, 2, pal.clothDark);
  p.set(18, 10 + b, hot);
  p.set(20, 10 + b, hot);
  const crownH = pose.victory ? 8 : 6;
  flame(p, 14, 7 + b, crownH - 2, t, shade(glow, 0.75), glow, yellow);
  flame(p, 17, 7 + b, crownH, t + 0.33, shade(glow, 0.75), glow, yellow);
  flame(p, 19, 7 + b, crownH - 3, t + 0.66, shade(glow, 0.75), glow, yellow);

  // brazier staff
  const top = pose.victory ? 4 : 9 + b;
  p.line(24, top + 4, 23, 36, pal.armorHi);
  p.line(25, top + 4, 24, 35, pal.shieldFace);
  p.rect(22, top, 5, 4, pal.shieldRim);
  p.rect(23, top + 1, 3, 2, glow);
  p.set(22, top - 1, pal.shieldRim);
  p.set(26, top - 1, pal.shieldRim);
  flame(p, 24, top - 1, pose.victory ? 9 : 7, t + 0.15, shade(glow, 0.8), glow, yellow);
  // front arm on the staff
  p.line(19, 16 + b, 23, (pose.victory ? 12 : 20) + b, pal.armorLight);
  p.rect(22, (pose.victory ? 11 : 19) + b, 2, 2, pal.armorLight);
  return finish(p, 0xffc890);
}
