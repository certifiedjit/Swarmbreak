/**
 * Enemy, mini-boss and boss sprites. Muted bodies, bright glowing eyes and
 * cores, thick dark outlines. All face right; the game flips them.
 */
import { OUTLINE, Pix, noise2, shade } from './pixel';
import { CATHEDRAL_ENEMY_DRAW, drawOrgan } from './cathedralArt';
import { BLACK_SUN_ENEMY_DRAW, drawHeart } from './blackSunArt';

type Draw = (frame: number) => Pix;

function finish(p: Pix, rim = 0x8a93a8): Pix {
  p.rim(rim, 0, -1, 0.22);
  p.outline(OUTLINE);
  return p;
}

const crawler: Draw = (f) => {
  const p = new Pix(22, 16);
  const legC = 0x231b18;
  const o = f === 0 ? [0, 1, 0] : [1, 0, 1];
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 4;
    p.line(x, 9, x - 2 + o[i], 14, legC);
    p.line(x + 1, 9, x + 2 - o[i], 14, shade(legC, 1.2));
  }
  p.ellipse(10, 8, 7.5, 4.5, 0x3d302a);
  p.ellipse(9, 6.5, 5.5, 2.5, 0x544238);
  p.line(5, 5, 12, 4, 0x6b5545);
  for (let i = 0; i < 6; i++) p.set(4 + ((i * 7) % 12), 6 + (i % 3), 0x7a3f24);
  p.line(7, 4, 7, 10, 0x2a211d);
  p.line(11, 4, 11, 10, 0x2a211d);
  p.rect(15, 6, 4, 5, 0x2e2420);
  p.set(17, 7, 0xff4d3d);
  p.set(18, 7, 0xffb0a0);
  p.set(17, 9, 0xff4d3d);
  p.set(18, 9, 0xff4d3d);
  p.set(19, 10, 0x1a1412);
  p.set(19, 11, 0x1a1412);
  return finish(p);
};

const drone: Draw = (f) => {
  const p = new Pix(16, 16);
  if (f === 0) p.line(2, 2, 13, 2, 0x5a6478);
  else p.line(5, 2, 10, 2, 0x8a93a8);
  p.line(8, 3, 8, 4, 0x3a4252);
  p.circle(8, 9, 5.2, 0x2b313d);
  p.ellipse(7, 7.5, 3.6, 2.4, 0x3c4454);
  p.line(4, 11, 7, 13, 0x1c2029);
  p.line(6, 6, 5, 8, 0x1c2029);
  p.rect(10, 8, 2, 2, 0x5cc8ff);
  p.set(10, 8, 0xd8f4ff);
  p.set(6, 14, f ? 0x2f6f99 : 0x5cc8ff);
  p.set(10, 14, f ? 0x5cc8ff : 0x2f6f99);
  return finish(p);
};

const voidspawn: Draw = (f) => {
  const p = new Pix(18, 18);
  const w = f === 0 ? 0 : 1;
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 3;
    p.line(x, 13, x + (i % 2 === w ? -1 : 1), 17, 0x251334);
  }
  p.ellipse(9, 10, 6.8 + w * 0.4, 5.6 - w * 0.4, 0x1d1028);
  p.ellipse(9, 8.5, 4.5, 2.6, 0x2e1a42);
  p.line(4, 7, 6, 4, 0x2e1a42);
  p.line(9, 5, 9, 2, 0x2e1a42);
  p.line(13, 6, 15, 3, 0x2e1a42);
  p.set(11, 9, 0xff3df2);
  p.set(13, 9, 0xff3df2);
  p.set(12, 11, 0xff3df2);
  p.set(12, 9, 0xffc6fb);
  p.set(6, 12, 0x3d2156);
  p.set(8, 13, 0x3d2156);
  return finish(p, 0x6a3f88);
};

const signal: Draw = (f) => {
  const p = new Pix(18, 18);
  p.line(6, 6, 5, 1, 0x3a4252);
  p.set(5, 1, f ? 0xffa53d : 0x7a4a1c);
  p.poly(
    [
      [2, 8],
      [14, 5],
      [16, 11],
      [4, 14],
    ],
    0x2f3540,
  );
  p.poly(
    [
      [4, 8],
      [13, 6],
      [14, 8],
      [5, 10],
    ],
    0x434b5a,
  );
  p.ring(4, 11, 3.5, 1.2, 0x3a4252);
  p.rect(13, 8, 2, 2, 0xffa53d);
  p.set(14, 8, 0xffe0b0);
  p.set(8, 13, 0x1c2029);
  p.set(10, 12, 0x1c2029);
  return finish(p);
};

/** Volatile Cell: a swollen void sac with glowing seams. Frame 1 swells. */
const volatile: Draw = (f) => {
  const p = new Pix(18, 18);
  const sw = f ? 0.6 : 0;
  // little legs
  p.line(5, 13, 4, 16, 0x1f2a14).line(12, 13, 13, 16, 0x1f2a14).line(8, 14, 8, 16, 0x1f2a14);
  p.ellipse(9, 9, 6.2 + sw, 5.6 + sw, 0x26301a);
  p.ellipse(8, 7.5, 4, 2.8, 0x37452a);
  // glowing seams
  const seam = f ? 0xe4ff8a : 0xb6ff4d;
  p.line(5, 8, 8, 11, seam).line(8, 11, 12, 9, seam).line(10, 5, 11, 8, seam);
  p.set(8, 11, 0xffffff);
  p.set(6, 6, 0x55663e);
  return finish(p, 0x8aa86a);
};

/** Mortar Husk: a squat derelict cannon on three legs. Frame 1 = recoil. */
const mortar: Draw = (f) => {
  const p = new Pix(22, 18);
  const leg = 0x262a33;
  p.line(5, 12, 2, 17, leg).line(11, 13, 11, 17, leg).line(16, 12, 19, 17, leg);
  p.ellipse(11, 11, 7, 4, 0x2c3038);
  p.ellipse(10, 10, 5, 2.5, 0x3c424e);
  // barrel angled up-forward
  const r = f ? 1 : 0;
  p.poly([[9, 9 + r], [13, 9 + r], [18, 2 + r], [15, 0 + r]], 0x3a404c);
  p.line(10, 8 + r, 16, 1 + r, 0x555d6c);
  p.rect(15, 0 + r, 3, 2, 0x1a1d24);
  p.set(16, 1 + r, f ? 0xffe0b0 : 0xffa53d);
  // amber eye
  p.rect(5, 10, 2, 2, 0xffa53d);
  p.set(5, 10, 0xffe0b0);
  return finish(p);
};

const hulk: Draw = (f) => {
  const p = new Pix(34, 28);
  const legC = 0x241c18;
  for (let i = 0; i < 4; i++) {
    const x = 7 + i * 6;
    const o = (i + f) % 2;
    p.rect(x - 1 + o, 16, 3, 6, legC);
    p.rect(x - 2 + o * 2, 22, 4, 3, shade(legC, 1.3));
  }
  p.ellipse(15, 13, 13, 8.5, 0x3a2d27);
  p.ellipse(13, 10, 9, 4.5, 0x524036);
  p.line(5, 7, 20, 5, 0x6b5545);
  for (let i = 0; i < 18; i++) {
    const x = 4 + Math.floor(noise2(i, 1) * 22);
    const y = 7 + Math.floor(noise2(i, 2) * 10);
    p.set(x, y, noise2(i, 3) > 0.5 ? 0x7a3f24 : 0x2a211d);
  }
  // scrap spikes
  p.poly([[8, 6], [10, 0], [12, 6]], 0x45362e);
  p.poly([[15, 5], [18, 1], [19, 6]], 0x45362e);
  p.poly([[21, 6], [25, 3], [24, 8]], 0x45362e);
  // head
  p.rect(25, 10, 7, 8, 0x2e2420);
  p.set(29, 12, 0xff5a3d);
  p.set(30, 12, 0xffc0a0);
  p.set(27, 12, 0xff5a3d);
  p.set(29, 15, 0xff5a3d);
  p.set(31, 15, 0xff5a3d);
  p.rect(31, 17, 2, 2, 0x1a1412);
  return finish(p);
};

const mech: Draw = (f) => {
  const p = new Pix(46, 50);
  const steel = 0x2a2f3b, plate = 0x3b4252, hi = 0x56607a, dark = 0x1b1f28;
  const red = 0xff4d4d;
  // back arm
  p.rect(9, 20, 6, 14, dark);
  // legs
  const a = f === 0 ? 0 : 2;
  p.rect(14 - a, 32, 7, 10, plate);
  p.rect(13 - a, 42, 9, 5, steel);
  p.rect(25 + a, 32, 7, 10, steel);
  p.rect(24 + a, 42, 10, 5, plate);
  p.rect(15 - a, 36, 5, 2, hi);
  p.rect(26 + a, 36, 5, 2, hi);
  // hip
  p.rect(12, 28, 22, 6, dark);
  // torso
  p.poly([[10, 12], [36, 10], [35, 30], [12, 30]], steel);
  p.poly([[13, 13], [34, 12], [33, 20], [14, 21]], plate);
  p.line(13, 13, 34, 12, hi);
  p.rect(16, 23, 16, 2, dark);
  // vents
  for (let i = 0; i < 4; i++) p.rect(17 + i * 4, 26, 2, 2, 0x5a2020);
  // visor
  p.rect(27, 15, 8, 2, red);
  p.set(33, 15, 0xffd0d0);
  // head bump + antenna
  p.rect(20, 6, 10, 5, plate);
  p.line(22, 6, 21, 1, dark);
  p.set(21, 1, f ? red : 0x7a2020);
  // shoulder lamps
  p.ellipse(11, 14, 4, 3.5, plate);
  p.ellipse(35, 13, 4.5, 4, plate);
  p.set(35, 11, 0xffb330);
  p.set(11, 12, 0xffb330);
  // arm cannon
  p.rect(32, 21, 12, 6, dark);
  p.rect(33, 22, 10, 2, plate);
  p.rect(43, 22, 2, 4, red);
  return finish(p, 0xa8b4d0);
};

const queen: Draw = (f) => {
  const p = new Pix(50, 42);
  // wings (translucent)
  const wy = f === 0 ? 0 : 3;
  p.poly([[14, 14], [6, 2 + wy], [26, 8]], 0x6a7d99, 110);
  p.poly([[22, 12], [30, 0 + wy], [36, 10]], 0x6a7d99, 110);
  // dangling legs
  for (let i = 0; i < 4; i++) p.line(14 + i * 6, 30, 12 + i * 6 + (f ? 1 : -1), 39, 0x1e1b17);
  // abdomen
  p.ellipse(20, 22, 15, 10, 0x2a2620);
  p.ellipse(18, 19, 11, 6, 0x3a342b);
  // hex cells
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const x = 9 + c * 5 + (r % 2) * 2;
      const y = 17 + r * 4;
      const on = noise2(c, r, f) > 0.45;
      p.rect(x, y, 3, 2, on ? 0xffb330 : 0x6a4a18);
      if (on) p.set(x + 1, y, 0xffe6a8);
    }
  // head
  p.ellipse(37, 18, 7.5, 6.5, 0x2e2a24);
  p.ellipse(36, 16, 5, 3, 0x433b30);
  p.set(40, 17, 0xffb330);
  p.set(42, 18, 0xffb330);
  p.set(41, 17, 0xfff0c0);
  // crown spikes
  p.poly([[33, 12], [34, 6], [36, 12]], 0x433b30);
  p.poly([[37, 11], [39, 4], [40, 11]], 0x433b30);
  p.set(39, 5, 0xffb330);
  // mandibles
  p.line(43, 21, 46, 24, 0x1e1b17);
  p.line(42, 23, 44, 26, 0x1e1b17);
  return finish(p, 0xc9b38a);
};

/** Fallen Star-Titan. variant 1 = cracked open (phase 3). */
export function drawTitan(frame: number, cracked: boolean): Pix {
  const p = new Pix(116, 124);
  const dark = 0x1f1f27, steel = 0x2b2b35, plate = 0x3b3b47, hi = 0x55556a, rust = 0x5a3424;
  const sway = frame === 0 ? 0 : 1;
  // legs
  p.rect(32, 84, 18, 30, steel);
  p.rect(66, 84, 18, 30, plate);
  for (let i = 0; i < 4; i++) {
    p.rect(32, 88 + i * 7, 18, 1, dark);
    p.rect(66, 88 + i * 7, 18, 1, dark);
  }
  p.rect(28, 112, 26, 8, dark);
  p.rect(62, 112, 26, 8, steel);
  p.rect(70, 92, 8, 3, 0xff7a2a); // glowing vent on leg
  // pelvis
  p.rect(28, 76, 60, 12, dark);
  p.rect(34, 78, 48, 3, plate);
  // left arm (claw)
  p.rect(6 + sway, 40, 16, 46, steel);
  p.rect(8 + sway, 44, 12, 4, hi);
  for (let i = 0; i < 4; i++) p.rect(6 + sway, 52 + i * 8, 16, 1, dark);
  p.poly([[4 + sway, 86], [12 + sway, 98], [14 + sway, 86]], plate);
  p.poly([[14 + sway, 86], [20 + sway, 100], [22 + sway, 86]], plate);
  // right arm (broken cannon)
  p.rect(94 - sway, 40, 16, 40, plate);
  p.rect(96 - sway, 80, 12, 10, dark);
  for (let i = 0; i < 3; i++) p.rect(98 - sway, 48 + i * 9, 8, 3, 0xff7a2a);
  p.rect(97 - sway, 90, 10, 3, 0xffb36b);
  // torso
  p.poly([[18, 26], [98, 26], [90, 80], [26, 80]], steel);
  p.poly([[24, 30], [92, 30], [86, 50], [30, 50]], plate);
  p.line(24, 30, 92, 30, hi);
  // armour seams + rust
  for (let i = 0; i < 70; i++) {
    const x = 22 + Math.floor(noise2(i, 9) * 72);
    const y = 32 + Math.floor(noise2(i, 10) * 46);
    p.set(x, y, noise2(i, 11) > 0.6 ? rust : dark);
  }
  p.line(40, 52, 36, 78, dark);
  p.line(76, 52, 80, 78, dark);
  // shoulders
  p.ellipse(20, 34, 15, 11, plate);
  p.ellipse(96, 34, 15, 11, steel);
  p.line(8, 28, 30, 25, hi);
  p.line(86, 25, 108, 28, hi);
  p.rect(14, 30, 4, 2, 0xff7a2a);
  p.rect(98, 30, 4, 2, 0xff7a2a);
  // head
  p.ellipse(58, 20, 11, 10, steel);
  p.rect(48, 18, 21, 10, steel);
  p.ellipse(57, 15, 8, 4, plate);
  p.rect(52, 20, 14, 3, 0xff9a4a);
  p.rect(56, 20, 6, 3, 0xffe6b0);
  p.line(50, 10, 44, 2, dark); // broken horn
  p.line(66, 10, 70, 5, dark);
  // core socket
  const cr = cracked ? 17 : 13;
  p.circle(58, 56, cr + 3, dark);
  p.circle(58, 56, cr, 0x7a2a10);
  p.circle(58, 56, cr - 3, 0xff7a2a);
  p.circle(58, 56, cr - 7, 0xffc46b);
  p.circle(58, 56, cr - 10, 0xfff3d6);
  if (cracked) {
    const cracks: [number, number][] = [[30, 40], [86, 42], [40, 76], [80, 74], [58, 30]];
    for (const [x, y] of cracks) {
      p.line(58, 56, x, y, 0xff9a4a);
      p.line(58 + 1, 56, x + 1, y, 0xff7a2a);
    }
  }
  p.rim(0xc09080, 0, -1, 0.2);
  p.outline(OUTLINE);
  return p;
}

export const ENEMY_DRAW: Record<string, Draw> = { crawler, drone, voidspawn, signal, volatile, mortar, hulk, mech, queen, ...CATHEDRAL_ENEMY_DRAW, ...BLACK_SUN_ENEMY_DRAW };

/** main bosses: sprite id -> draw(frame, cracked) */
export const BOSS_DRAW: Record<string, (frame: number, cracked: boolean) => Pix> = { titan: drawTitan, organ: drawOrgan, heart: drawHeart };

/** big sprites get a coarser death-ember sample */
export const BIG_SPRITES = new Set(['mech', 'queen', 'priest', 'gargoyle', 'hound', 'colossus', 'eater']);
export const ENEMY_FRAMES = 2;
