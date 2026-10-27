/**
 * Art for Chapter 2, the Cathedral Moon: green-gold rot, candlelight and
 * stained glass. Enemies face right (the game flips them).
 */
import { OUTLINE, Pix, blend, noise2, shade } from './pixel';

type Draw = (frame: number) => Pix;

function finish(p: Pix, rim = 0xc9c08a): Pix {
  p.rim(rim, 0, -1, 0.22);
  p.outline(OUTLINE);
  return p;
}

const GOLD = 0xffd34d;
const ROT = 0x9bcf4a;

// ---------------------------------------------------------------- enemies

/** Bone-plated cultist: hooded, ribcage armour, censer. */
export const cultist: Draw = (f) => {
  const p = new Pix(18, 22);
  const robe = 0x2a2a1c, robeHi = 0x3a3a26, bone = 0xb8b090;
  const sway = f ? 1 : 0;
  p.poly([[4, 8], [13, 8], [15 + sway, 21], [2 - sway, 21]], robe);
  p.line(5, 9, 3 - sway, 20, robeHi);
  // hood
  p.ellipse(10, 6, 5, 5, robe);
  p.ellipse(11, 7, 3, 3, 0x0e0e09);
  p.set(12, 6, GOLD).set(10, 6, GOLD).set(12, 7, 0xfff0b0);
  // rib plates
  for (let i = 0; i < 3; i++) p.line(6, 11 + i * 2, 12, 11 + i * 2, bone);
  p.line(9, 10, 9, 16, shade(bone, 0.8));
  // censer on a chain
  p.line(14, 12, 16, 15 + sway, 0x6b6450);
  p.circle(16, 16 + sway, 1.6, 0x8a7a40).set(16, 16 + sway, f ? 0xffe28a : 0xffb330);
  return finish(p);
};

/** Candle imp: a little wax creature with a flame for a head. */
export const candleImp: Draw = (f) => {
  const p = new Pix(14, 16);
  const wax = 0xcfc39a, waxD = 0x8a7f5e;
  p.rect(4, 7, 6, 7, wax).rect(4, 12, 6, 2, waxD);
  p.set(3, 9, wax).set(10, 9, wax).line(4, 14, 3, 15, waxD).line(9, 14, 10, 15, waxD);
  p.rect(6, 9, 1, 1, 0x2a1e10).rect(8, 9, 1, 1, 0x2a1e10);
  // wick + flame
  p.set(7, 6, 0x2a1e10);
  const h = f ? 1 : 0;
  p.poly([[5, 6], [7, 1 - h], [9, 6]], 0xff8a3d).poly([[6, 6], [7, 3 - h], [8, 6]], 0xffe28a);
  return finish(p, 0xfff0c0);
};

/** Choir wraith: a singing ghost in tatters. */
export const choirWraith: Draw = (f) => {
  const p = new Pix(20, 22);
  const body = 0x3a4a36, hi = 0x56704e;
  const w = f ? 1 : 0;
  p.ellipse(10, 7, 6, 6, body);
  p.poly([[4, 8], [16, 8], [17, 18], [14 - w, 21], [11, 18], [8 + w, 21], [5, 18], [3, 20]], body);
  p.line(5, 9, 4, 18, hi);
  // eyes and singing mouth
  p.rect(10, 5, 2, 2, ROT).rect(14, 5, 2, 2, ROT);
  p.ellipse(13, 10, 1.6, 2 + w * 0.6, 0x0b0f08);
  p.set(13, 9, 0xe4ff8a);
  // music motes
  p.set(18, 3 + w, 0xe4ff8a).set(17, 2 + w, 0xe4ff8a);
  return finish(p, 0xb8e0a0);
};

/** Thorn horror: a bramble beast with a spiked back. */
export const thornHorror: Draw = (f) => {
  const p = new Pix(26, 18);
  const bark = 0x2a2418, barkHi = 0x3e3524, thorn = 0x5a6a2a;
  const o = f ? 1 : 0;
  for (let i = 0; i < 4; i++) p.line(5 + i * 5, 11, 4 + i * 5 + ((i + o) % 2) * 2, 17, 0x1a160e);
  p.ellipse(12, 10, 10, 5, bark);
  p.ellipse(11, 8, 7, 3, barkHi);
  for (let i = 0; i < 6; i++) p.poly([[4 + i * 3, 7], [5 + i * 3, 1 + (i % 2)], [6 + i * 3, 7]], thorn);
  // head + glowing eyes
  p.ellipse(21, 10, 4, 3.5, bark);
  p.set(22, 9, ROT).set(24, 9, ROT).set(23, 9, 0xe4ff8a);
  p.line(23, 12, 25, 13, 0xd8d0b0);
  return finish(p, 0xa8b878);
};

/** Ossuary brute: a hulking bone-armoured ogre with a bell-hammer. */
export const ossuary: Draw = (f) => {
  const p = new Pix(36, 32);
  const skin = 0x2f2a20, armor = 0xb0a888, armorD = 0x7a7258;
  const s = f ? 1 : 0;
  // legs
  p.rect(10 - s, 22, 5, 8, skin).rect(19 + s, 22, 5, 8, skin);
  // body
  p.ellipse(17, 16, 11, 9, skin);
  p.ellipse(16, 13, 8, 5, shade(skin, 1.3));
  // bone plates
  p.ellipse(10, 9, 5, 4, armor).ellipse(24, 9, 5, 4, armor);
  p.circle(10, 9, 1.5, armorD).circle(24, 9, 1.5, armorD);
  for (let i = 0; i < 3; i++) p.line(12, 15 + i * 2, 22, 15 + i * 2, armorD);
  // head
  p.ellipse(18, 6, 4, 3.5, armor);
  p.set(19, 6, GOLD).set(17, 6, GOLD);
  // bell-hammer
  p.line(28, 6 - s, 30, 22 - s, 0x5a4a30);
  p.poly([[27, 2 - s], [33, 2 - s], [34, 7 - s], [26, 7 - s]], 0x8a7a40);
  p.set(30, 4 - s, 0xffe28a);
  return finish(p);
};

// ---------------------------------------------------------------- mini-bosses

/** High Priest: tall mitre, golden halo, staff with a glowing orb. Resurrects the dead. */
export const priest: Draw = (f) => {
  const p = new Pix(40, 50);
  const robe = 0x26301e, robeHi = 0x38482a, trim = 0xc9a640;
  const s = f ? 1 : 0;
  // halo behind
  p.ring(20, 11, 10, 1.5, GOLD);
  // robe
  p.poly([[13, 18], [27, 18], [32 + s, 48], [8 - s, 48]], robe);
  p.poly([[16, 18], [24, 18], [26, 46], [14, 46]], robeHi);
  p.line(20, 20, 20, 46, trim);
  p.line(9 - s, 47, 31 + s, 47, trim);
  // arms
  p.poly([[13, 20], [9, 32], [12, 33], [15, 24]], robe);
  // head + mitre
  p.ellipse(20, 14, 4.5, 4.5, 0x4a4030);
  p.poly([[15, 11], [20, 1], [25, 11]], 0xd8d0b0);
  p.line(20, 2, 20, 10, trim);
  p.rect(18, 13, 1, 1, GOLD).rect(21, 13, 1, 1, GOLD);
  // staff
  p.line(32, 12, 33, 48, 0x6b5a30);
  p.circle(32, 10, 3, f ? 0xe4ff8a : ROT).set(32, 9, 0xffffff);
  return finish(p, 0xe0d8a0);
};

/** Gargoyle: crouched stone beast, wings spread. Dives from above. */
export const gargoyle: Draw = (f) => {
  const p = new Pix(50, 42);
  const stone = 0x3a3c38, stoneHi = 0x55584f, dark = 0x242622;
  const flap = f ? 3 : 0;
  // wings
  p.poly([[20, 16], [2, 4 + flap], [6, 14], [3, 22 - flap], [18, 24]], dark);
  p.poly([[30, 16], [48, 4 + flap], [44, 14], [47, 22 - flap], [32, 24]], dark);
  p.line(20, 16, 3, 5 + flap, stoneHi).line(30, 16, 47, 5 + flap, stoneHi);
  // body crouched
  p.ellipse(25, 26, 10, 9, stone);
  p.ellipse(24, 23, 7, 5, stoneHi);
  // legs / claws
  p.rect(17, 32, 5, 7, stone).rect(28, 32, 5, 7, stone);
  p.line(16, 39, 22, 39, dark).line(27, 39, 34, 39, dark);
  // head with horns
  p.ellipse(32, 15, 6, 5, stone);
  p.poly([[28, 11], [26, 4], [30, 10]], stoneHi).poly([[35, 11], [38, 4], [36, 11]], stoneHi);
  p.set(33, 14, 0xffb330).set(36, 14, 0xffb330).set(34, 14, 0xffe0a0);
  p.line(34, 18, 38, 19, 0xd8d0c0);
  // moss
  for (let i = 0; i < 10; i++) p.set(18 + Math.floor(noise2(i, 4) * 14), 20 + Math.floor(noise2(i, 5) * 12), 0x4a6a2a);
  return finish(p, 0xd0d0c0);
};

// ---------------------------------------------------------------- the Organ-Beast

/** The Organ-Beast: a living pipe organ. cracked = phase 3 (rose window shattered, burning bright). */
export function drawOrgan(frame: number, cracked: boolean): Pix {
  const p = new Pix(128, 120);
  const wood = 0x2a1e14, woodHi = 0x3e2c1c, brass = 0x8a7038, brassHi = 0xc9a640, dark = 0x120c08;
  const breathe = frame ? 1 : 0;
  // pipes (back row, arched)
  for (let i = 0; i < 13; i++) {
    const x = 10 + i * 8.5;
    const top = 6 + Math.abs(i - 6) * 3.2 - breathe * (i % 2);
    p.rect(x, top, 6, 54 - top, brass);
    p.rect(x + 1, top, 1, 54 - top, brassHi);
    p.rect(x, top, 6, 2, dark);
    p.ellipse(x + 3, top + 10, 2, 1, dark); // pipe mouth
  }
  // case
  p.poly([[6, 50], [122, 50], [116, 112], [12, 112]], wood);
  p.poly([[12, 54], [116, 54], [111, 108], [17, 108]], woodHi);
  // carved frame + rot
  p.line(6, 50, 122, 50, brassHi);
  for (let i = 0; i < 60; i++) {
    const x = 14 + Math.floor(noise2(i, 21) * 100), y = 56 + Math.floor(noise2(i, 22) * 50);
    p.set(x, y, noise2(i, 23) > 0.6 ? 0x4a6a2a : dark);
  }
  // rose window (the core)
  const R = cracked ? 17 : 15;
  p.circle(64, 72, R + 3, dark);
  const glass = [0xc04040, 0x4060c0, 0xc0a030, 0x40a060, 0x8040c0, 0xc06030];
  for (let k = 0; k < 12; k++) {
    const a0 = (k / 12) * Math.PI * 2;
    const pts: [number, number][] = [[64, 72]];
    for (let s = 0; s <= 3; s++) {
      const a = a0 + (s / 3) * (Math.PI / 6);
      pts.push([64 + Math.cos(a) * R, 72 + Math.sin(a) * R]);
    }
    p.poly(pts, cracked ? blend(glass[k % 6], 0xffffff, 0.35) : glass[k % 6]);
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.line(64, 72, 64 + Math.cos(a) * R, 72 + Math.sin(a) * R, dark);
  }
  p.circle(64, 72, 5, cracked ? 0xffffff : 0xffe28a);
  p.ring(64, 72, R, 1.5, brassHi);
  if (cracked) {
    for (const [x, y] of [[40, 58], [90, 60], [46, 96], [84, 98]]) p.line(64, 72, x, y, 0xfff0b0);
  }
  // eyes above the window
  p.ellipse(46, 58, 4, 2.5, dark).ellipse(82, 58, 4, 2.5, dark);
  p.ellipse(46, 58, 2.5, 1.5, ROT).ellipse(82, 58, 2.5, 1.5, ROT);
  p.set(46, 58, 0xffffff).set(82, 58, 0xffffff);
  // keyboard maw
  p.rect(30, 92 + breathe, 68, 12, dark);
  for (let i = 0; i < 17; i++) p.rect(31 + i * 4, 93 + breathe, 3, 6, i % 3 === 1 ? 0x1a1410 : 0xd8d0b0);
  for (let i = 0; i < 16; i++) p.rect(32 + i * 4, 104 - breathe, 3, 4, 0xd8d0b0);
  // feet / pedals
  p.rect(18, 110, 20, 6, wood).rect(90, 110, 20, 6, wood);
  p.rim(0xffe28a, 0, -1, 0.18);
  p.outline(OUTLINE);
  return p;
}

export const CATHEDRAL_ENEMY_DRAW: Record<string, Draw> = { cultist, candleimp: candleImp, wraith: choirWraith, thorn: thornHorror, ossuary, priest, gargoyle };

// ---------------------------------------------------------------- map art

export function cathedralFloor(seed = 2): Pix {
  const S = 256;
  const p = new Pix(S, S);
  const base = 0x16180f;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const px = Math.floor(x / 32), py = Math.floor((y + (px % 2) * 16) / 32);
      const tone = 0.82 + noise2(px, py, seed) * 0.34;
      const fine = 0.93 + noise2(x, y, seed + 7) * 0.14;
      p.set(x, y, shade(base, tone * fine));
    }
  // mortar lines (offset courses)
  for (let x = 0; x < S; x += 32) for (let y = 0; y < S; y++) p.set(x, y, 0x0a0b07);
  for (let cx = 0; cx < S; cx += 32) for (let y = (cx / 32) % 2 ? 16 : 0; y < S; y += 32) for (let x = cx; x < cx + 32; x++) p.set(x, y, 0x0a0b07);
  // moss and golden rot
  for (let i = 0; i < 22; i++) {
    const cx = noise2(i, 1, seed) * S, cy = noise2(i, 2, seed) * S;
    const r = 3 + noise2(i, 3, seed) * 9;
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r || noise2(Math.round(cx + x), Math.round(cy + y), seed + 5) > 0.5) continue;
        const X = ((Math.round(cx + x) % S) + S) % S, Y = ((Math.round(cy + y) % S) + S) % S;
        p.set(X, Y, blend(p.get(X, Y), noise2(i, 9, seed) > 0.7 ? 0x3a3416 : 0x1f2c12, 0.6));
      }
  }
  // grave slabs with a faint carved rune
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(noise2(i, 11, seed) * 7) * 32 + 4, y = Math.floor(noise2(i, 12, seed) * 7) * 32 + 4;
    p.rect(x, y, 24, 24, 0x1c1e14);
    p.line(x + 12, y + 4, x + 12, y + 20, 0x2c3020).line(x + 6, y + 9, x + 18, y + 9, 0x2c3020);
  }
  // wax drips
  for (let i = 0; i < 12; i++) p.set(noise2(i, 14, seed) * S, noise2(i, 15, seed) * S, 0x4a4430);
  return p;
}

export function pillar(broken: boolean): Pix {
  const h = broken ? 44 : 64;
  const p = new Pix(26, h);
  const stone = 0x2c2e24, hi = 0x3e4232, dark = 0x1a1c14;
  p.rect(3, h - 8, 20, 8, dark).rect(4, h - 9, 18, 2, hi);
  p.rect(6, 8, 14, h - 16, stone);
  for (let x = 8; x < 20; x += 3) p.line(x, 9, x, h - 9, x % 2 ? hi : dark);
  if (broken) p.poly([[6, 8], [10, 2], [13, 6], [17, 1], [20, 8]], stone);
  else p.rect(3, 2, 20, 7, hi).rect(4, 6, 18, 2, dark);
  for (let i = 0; i < 12; i++) p.set(7 + Math.floor(noise2(i, h) * 12), 10 + Math.floor(noise2(i, h + 1) * (h - 20)), 0x3e5a24);
  p.outline(0x05060a);
  return p;
}

export function pew(): Pix {
  const p = new Pix(52, 16);
  const wood = 0x2a1e14, hi = 0x3e2c1c;
  p.rect(0, 2, 52, 4, hi).rect(0, 6, 52, 6, wood);
  p.rect(0, 0, 3, 16, wood).rect(49, 0, 3, 16, wood);
  for (let x = 6; x < 48; x += 7) p.line(x, 7, x, 11, 0x1a120c);
  p.outline(0x05060a);
  return p;
}

export function candles(n: number): Pix {
  const p = new Pix(16, 14);
  for (let i = 0; i < n; i++) {
    const x = 2 + i * 4, h = 5 + ((i * 3) % 4);
    p.rect(x, 13 - h, 3, h, 0xcfc39a).set(x + 1, 12 - h, 0x2a1e10);
    p.set(x + 1, 11 - h, 0xffb330).set(x + 1, 10 - h, 0xffe28a);
  }
  p.outline(0x05060a);
  return p;
}

export function glassShard(color: number): Pix {
  const p = new Pix(8, 6);
  p.poly([[0, 5], [3, 0], [7, 2], [5, 5]], color, 200);
  p.set(3, 1, 0xffffff);
  return p;
}

/** a bronze bell hanging in a small frame (the toll hazard) */
export function bell(): Pix {
  const p = new Pix(30, 34);
  const wood = 0x2a1e14, bronze = 0x8a6a2a, hi = 0xc9a640;
  p.rect(2, 2, 26, 3, wood).rect(2, 2, 3, 32, wood).rect(25, 2, 3, 32, wood);
  p.line(15, 5, 15, 8, 0x5a4a30);
  p.poly([[10, 9], [20, 9], [23, 24], [7, 24]], bronze);
  p.poly([[11, 10], [14, 10], [12, 23], [9, 23]], hi);
  p.rect(6, 24, 18, 2, shade(bronze, 0.8));
  p.circle(15, 27, 1.5, 0x3a2a14);
  p.outline(0x05060a);
  return p;
}
