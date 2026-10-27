/**
 * Small pixel sprites: particles, digits, pickups, projectiles and map objects.
 */
import { OUTLINE, Pix, shade, blend } from './pixel';

export function pxSquare(size: number): Pix {
  return new Pix(size, size).rect(0, 0, size, size, 0xffffff);
}

export function ember(): Pix {
  const p = new Pix(3, 3);
  p.set(1, 0, 0xffffff).set(0, 1, 0xffffff).set(1, 1, 0xffffff).set(2, 1, 0xffffff).set(1, 2, 0xffffff);
  return p;
}

export function spark(): Pix {
  return new Pix(7, 2).rect(0, 0, 7, 2, 0xffffff, 255).rect(0, 0, 2, 2, 0xffffff, 140);
}

export function shard(): Pix {
  const p = new Pix(6, 4);
  p.poly([[0, 2], [3, 0], [6, 2], [3, 4]], 0xffffff);
  return p;
}

export function star(): Pix {
  const p = new Pix(7, 7);
  p.line(3, 0, 3, 6, 0xffffff).line(0, 3, 6, 3, 0xffffff).set(2, 2, 0xffffff).set(4, 4, 0xffffff).set(4, 2, 0xffffff).set(2, 4, 0xffffff);
  return p;
}

// ------------------------------------------------------------------ digits (5x7 + outline)
const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
};

export const DIGIT_CHARS = Object.keys(GLYPHS);

export function glyph(ch: string): Pix {
  const g = GLYPHS[ch];
  const p = new Pix(7, 9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '1') p.set(x + 1, y + 1, 0xffffff);
  p.outline(0x08070c);
  return p;
}

// ------------------------------------------------------------------ pickups
export const GEM_COLORS = [0x59f3ff, 0x7dff8a, 0xc46dff, 0xff5a8a];

export function gem(tier: number): Pix {
  const sizes = [
    [6, 8],
    [7, 10],
    [9, 12],
    [11, 14],
  ];
  const [w, h] = sizes[tier];
  const c = GEM_COLORS[tier];
  const p = new Pix(w + 2, h + 2);
  const cx = (w + 2) / 2;
  p.poly([[cx, 1], [w + 1, h * 0.4 + 1], [cx, h + 1], [1, h * 0.4 + 1]], shade(c, 0.75));
  p.poly([[cx, 1], [w + 1, h * 0.4 + 1], [cx, h * 0.55 + 1]], c);
  p.poly([[cx, 1], [cx, h * 0.55 + 1], [1, h * 0.4 + 1]], blend(c, 0xffffff, 0.45));
  p.set(Math.floor(cx) - 1, 3, 0xffffff);
  p.outline(OUTLINE);
  return p;
}

export function coin(frame: number): Pix {
  const p = new Pix(9, 9);
  const widths = [3.5, 2.6, 1.2, 2.6];
  const w = widths[frame % 4];
  p.ellipse(4.5, 4.5, w, 3.5, 0xc98a1e);
  p.ellipse(4.5, 4.2, Math.max(0.6, w - 1), 2.6, 0xffc94d);
  if (w > 2) p.set(4, 3, 0xfff1b8);
  p.outline(OUTLINE);
  return p;
}

export function food(): Pix {
  const p = new Pix(11, 11);
  p.rect(2, 3, 7, 6, 0x2a5a32);
  p.rect(3, 4, 5, 4, 0x7dff8a);
  p.rect(4, 4, 1, 4, 0xd6ffe0);
  p.rect(1, 2, 9, 2, 0x3a4252);
  p.rect(1, 8, 9, 2, 0x3a4252);
  p.outline(OUTLINE);
  return p;
}

export function magnet(): Pix {
  const p = new Pix(12, 12);
  p.ring(6, 6, 5, 2.5, 0xff4d4d);
  p.rect(1, 6, 10, 5, 0, 0);
  for (let y = 6; y < 11; y++) for (let x = 0; x < 12; x++) p.clearPx(x, y);
  p.rect(1, 6, 3, 4, 0xff4d4d);
  p.rect(8, 6, 3, 4, 0xff4d4d);
  p.rect(1, 9, 3, 2, 0xdfe6f0);
  p.rect(8, 9, 3, 2, 0xdfe6f0);
  p.outline(OUTLINE);
  return p;
}

export function bomb(): Pix {
  const p = new Pix(12, 13);
  p.circle(6, 7.5, 4.5, 0x23202c);
  p.ellipse(5, 6, 2, 1.5, 0x3d3a4a);
  p.line(6, 3, 8, 1, 0x6b5545);
  p.set(9, 0, 0xffb330);
  p.set(6, 8, 0xff5a3d);
  p.set(5, 7, 0xff5a3d);
  p.set(7, 7, 0xff5a3d);
  p.outline(OUTLINE);
  return p;
}

// ------------------------------------------------------------------ projectiles
export function glaive(): Pix {
  const p = new Pix(15, 15);
  const c = 0xff8a3d;
  p.poly([[7.5, 0], [9, 6], [7.5, 7.5], [6, 6]], c);
  p.poly([[15, 7.5], [9, 9], [7.5, 7.5], [9, 6]], c);
  p.poly([[7.5, 15], [6, 9], [7.5, 7.5], [9, 9]], c);
  p.poly([[0, 7.5], [6, 6], [7.5, 7.5], [6, 9]], c);
  p.circle(7.5, 7.5, 2.2, 0xffe0b0);
  p.set(7, 7, 0xffffff);
  p.outline(0x3a1405);
  return p;
}

export function missile(): Pix {
  const p = new Pix(10, 5);
  p.rect(2, 1, 6, 3, 0x9aa3b8);
  p.rect(7, 1, 2, 3, 0xffd34d);
  p.set(9, 2, 0xffffff);
  p.rect(0, 2, 2, 1, 0xff8a3d);
  p.outline(OUTLINE);
  return p;
}

/** neutral enemy shot for tinting (map-themed bullets) */
export function enemyOrbNeutral(big: boolean): Pix {
  const r = big ? 5.5 : 3.5;
  const s = big ? 14 : 10;
  const p = new Pix(s, s);
  p.circle(s / 2, s / 2, r, 0xb8b8b8);
  p.circle(s / 2, s / 2, r - 1.5, 0xe6e6e6);
  p.circle(s / 2, s / 2, Math.max(1, r - 3), 0xffffff);
  p.outline(0x101010);
  return p;
}

export function enemyOrb(big: boolean): Pix {
  const r = big ? 5.5 : 3.5;
  const s = big ? 14 : 10;
  const p = new Pix(s, s);
  p.circle(s / 2, s / 2, r, 0xff3d3d);
  p.circle(s / 2, s / 2, r - 1.5, 0xffa07a);
  p.circle(s / 2, s / 2, Math.max(1, r - 3), 0xffffff);
  p.outline(0x2a0505);
  return p;
}

export function runeBlade(): Pix {
  const p = new Pix(15, 7);
  p.poly([[0, 3.5], [4, 1], [14, 3.5], [4, 6]], 0x9b7bff);
  p.line(3, 3, 13, 3, 0xe6dcff);
  p.rect(1, 2, 2, 3, 0x5a3fb0);
  p.outline(OUTLINE);
  return p;
}

// ------------------------------------------------------------------ world objects
export function chest(open: boolean, gold: boolean): Pix {
  const p = new Pix(22, 20);
  const body = gold ? 0x5a4520 : 0x262c3c;
  const band = gold ? 0xffc94d : 0x4a556f;
  const glow = gold ? 0xfff1b8 : 0x59f3ff;
  p.rect(2, 9, 18, 9, body);
  p.rect(2, 12, 18, 1, band);
  p.rect(2, 17, 18, 1, shade(body, 0.7));
  if (open) {
    p.poly([[2, 9], [20, 9], [18, 3], [4, 3]], shade(body, 1.2));
    p.rect(4, 8, 14, 2, glow);
    p.rect(6, 7, 10, 1, blend(glow, 0xffffff, 0.5));
  } else {
    p.poly([[2, 9], [20, 9], [19, 5], [3, 5]], shade(body, 1.25));
    p.rect(2, 8, 18, 1, band);
    p.rect(9, 8, 4, 5, band);
    p.rect(10, 9, 2, 3, glow);
  }
  p.rect(2, 9, 1, 9, band);
  p.rect(19, 9, 1, 9, band);
  p.outline(OUTLINE);
  return p;
}

export function shrine(cursed: boolean, spent: boolean): Pix {
  const p = new Pix(24, 34);
  const stone = 0x252a36, stoneHi = 0x3a4152;
  const glow = spent ? 0x3a4152 : cursed ? 0xff3d7a : 0x59f3ff;
  p.poly([[6, 33], [18, 33], [16, 26], [8, 26]], stone);
  p.poly([[8, 26], [16, 26], [15, 6], [12, 1], [9, 6]], stone);
  p.line(9, 7, 9, 25, stoneHi);
  p.line(12, 2, 15, 6, stoneHi);
  for (let y = 8; y < 24; y += 4) p.rect(11, y, 2, 2, glow);
  p.set(12, 4, glow);
  if (cursed) {
    p.line(8, 12, 5, 9, stone);
    p.line(16, 12, 19, 9, stone);
  }
  p.outline(OUTLINE);
  return p;
}

export function pylon(): Pix {
  const p = new Pix(10, 24);
  p.rect(3, 4, 4, 18, 0x2a2f3b);
  p.rect(1, 21, 8, 3, 0x1b1f28);
  p.rect(0, 3, 10, 2, 0x3b4252);
  p.rect(4, 0, 2, 4, 0x56607a);
  p.set(4, 8, 0xffd34d);
  p.set(4, 14, 0xffd34d);
  p.outline(OUTLINE);
  return p;
}

export function vent(): Pix {
  const p = new Pix(26, 18);
  p.ellipse(13, 9, 12, 7.5, 0x1b1f28);
  p.ellipse(13, 9, 10, 6, 0x0d0f15);
  for (let x = 5; x < 22; x += 3) p.line(x, 4, x, 14, 0x2a2f3b);
  p.ring(13, 9, 12, 1.5, 0x3b4252);
  p.outline(OUTLINE);
  return p;
}

/** soft glowing rune circle drawn under the player's feet */
export function sigil(color: number): Pix {
  const p = new Pix(48, 24);
  const cx = 24, cy = 12;
  for (let a = 0; a < 360; a += 1.5) {
    const r = (a * Math.PI) / 180;
    p.set(cx + Math.cos(r) * 22, cy + Math.sin(r) * 10.5, color, 200);
    p.set(cx + Math.cos(r) * 17, cy + Math.sin(r) * 8, color, 120);
  }
  for (let i = 0; i < 8; i++) {
    const r = (i / 8) * Math.PI * 2;
    const x = cx + Math.cos(r) * 19.5, y = cy + Math.sin(r) * 9.2;
    p.rect(Math.round(x), Math.round(y), 2, 1, color, 255);
  }
  return p;
}

/** Salvage Drone (the breather shop): a hovering cargo drone with a lit crate. frame 1 = thrusters flare */
export function salvageDrone(frame: number): Pix {
  const p = new Pix(28, 24);
  const hull = 0x3a4252, hullHi = 0x55606f, dark = 0x1c2029;
  // rotor arms
  p.rect(1, 4, 8, 2, dark).rect(19, 4, 8, 2, dark);
  p.rect(0, 3, 4, 1, frame ? 0x9fe8ff : 0x59f3ff).rect(24, 3, 4, 1, frame ? 0x9fe8ff : 0x59f3ff);
  // body
  p.poly([[6, 6], [22, 6], [24, 12], [4, 12]], hull);
  p.rect(7, 7, 14, 2, hullHi);
  p.rect(12, 8, 4, 2, 0x7dff8a); // friendly green eye
  p.set(13, 8, 0xeaffea);
  // hanging crate
  p.line(9, 12, 10, 14, dark).line(19, 12, 18, 14, dark);
  p.rect(8, 14, 12, 8, 0x5a4a2e);
  p.rect(8, 14, 12, 2, 0x7a6640);
  p.rect(13, 15, 2, 6, 0xffc94d);
  p.set(13, 17, 0xfff0b0);
  // thruster glow
  p.rect(5, 12, 2, 1 + frame, 0x59f3ff).rect(21, 12, 2, 1 + frame, 0x59f3ff);
  p.outline(0x0a0910);
  return p;
}

/** Sentry turret (top-down-ish, faces right; rotated in game) */
export function turret(): Pix {
  const p = new Pix(16, 16);
  p.circle(8, 9, 6, 0x2c3038).circle(8, 9, 4.5, 0x3c424e);
  p.rect(8, 7, 8, 4, 0x55606f).rect(8, 8, 8, 1, 0x7a8599);
  p.circle(8, 9, 2.5, 0x262a33).set(8, 9, 0xffd34d).set(7, 8, 0xfff0b0);
  p.outline(OUTLINE);
  return p;
}

/** heavy round shield for Aegis Wheels */
export function wheelShield(): Pix {
  const p = new Pix(16, 16);
  p.circle(8, 8, 7, 0x3a4566).circle(8, 8, 5.5, 0x55628a).ring(8, 8, 7, 1, 0xffffff);
  p.line(8, 3, 8, 13, 0xffffff).line(3, 8, 13, 8, 0xffffff);
  p.circle(8, 8, 1.5, 0xffffff);
  p.outline(OUTLINE);
  return p;
}

/** a small void spirit (white so it can be tinted) */
export function spirit(frame: number): Pix {
  const p = new Pix(12, 14);
  p.circle(6, 5, 4.5, 0xd8c8ff);
  const w = frame ? 1 : 0;
  p.poly([[1.5, 6], [10.5, 6], [10 - w, 13], [7, 10], [5, 13 - w], [2 + w, 11]], 0xd8c8ff);
  p.rect(3, 4, 2, 2, 0x1a1030).rect(7, 4, 2, 2, 0x1a1030);
  p.set(3, 4, 0xffffff).set(7, 4, 0xffffff);
  p.outline(OUTLINE);
  return p;
}

/** a ricochet round */
export function round(): Pix {
  const p = new Pix(7, 3);
  p.rect(0, 0, 7, 3, 0xffffff, 120).rect(1, 1, 6, 1, 0xffffff);
  return p;
}
