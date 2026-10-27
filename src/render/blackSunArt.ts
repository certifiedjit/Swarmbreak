/**
 * Art for Chapter 3, the Black Sun: violet void, cold crystal light and the
 * last embers of swallowed stars. Enemies face right (the game flips them).
 */
import { OUTLINE, Pix, blend, noise2, shade } from './pixel';

type Draw = (frame: number) => Pix;

function finish(p: Pix, rim = 0xc9a8ff): Pix {
  p.rim(rim, 0, -1, 0.24);
  p.outline(OUTLINE);
  return p;
}

const VIOLET = 0xb36bff;
const ICE = 0x7ae0ff;
const ICE_HI = 0xd6f6ff;

// ---------------------------------------------------------------- enemies

/** Rift wraith: a tall tattered shade with a torn-open rift for a chest. */
export const riftWraith: Draw = (f) => {
  const p = new Pix(20, 26);
  const body = 0x2e2448, hi = 0x4a3a6e;
  const w = f ? 1 : 0;
  p.ellipse(11, 6, 5, 5, body);
  p.poly([[5, 7], [17, 7], [19, 20], [16 - w, 25], [13, 21], [10 + w, 25], [7, 21], [3, 24], [4, 14]], body);
  p.line(6, 8, 4, 22, hi);
  // the rift: a jagged violet tear down the chest
  p.poly([[11, 9], [13, 12], [11, 15], [13, 18], [11, 20], [9, 17], [11, 14], [9, 11]], VIOLET);
  p.line(11, 10, 11, 19, 0xf0d8ff);
  // hood eyes
  p.set(12, 5, 0xf0d8ff).set(15, 5, 0xf0d8ff).set(13, 5, VIOLET);
  // trailing motes
  p.set(2, 18 + w, VIOLET).set(1, 14 - w, 0x6a3db0);
  return finish(p);
};

/** Crystal crawler: a low beetle wearing a cluster of ice-blue crystals. */
export const crystalCrawler: Draw = (f) => {
  const p = new Pix(22, 18);
  const shell = 0x1c2a3a, shellHi = 0x2c4258;
  const o = f ? 1 : 0;
  for (let i = 0; i < 3; i++) p.line(5 + i * 5, 12, 3 + i * 5 + ((i + o) % 2) * 2, 17, 0x101820);
  p.ellipse(11, 12, 9, 4, shell);
  p.ellipse(10, 11, 6, 2, shellHi);
  // crystal spires
  p.poly([[5, 11], [7, 3], [9, 11]], ICE).poly([[9, 11], [11, 0], [13, 11]], blend(ICE, 0xffffff, 0.2)).poly([[13, 11], [16, 5], [17, 11]], ICE);
  p.line(7, 4, 7, 10, ICE_HI).line(11, 1, 11, 10, ICE_HI).line(16, 6, 16, 10, ICE_HI);
  // head
  p.ellipse(19, 13, 3, 3, shell);
  p.set(20, 12, ICE_HI).set(21, 13, ICE);
  return finish(p, ICE_HI);
};

/** Crystal shard: a spinning sliver that hunts on its own. */
export const crystalShard: Draw = (f) => {
  const p = new Pix(12, 12);
  if (f) p.poly([[1, 6], [6, 1], [11, 6], [6, 11]], ICE);
  else p.poly([[2, 3], [9, 2], [10, 9], [3, 10]], ICE);
  p.line(4, 6, 8, 6, ICE_HI).set(6, 4, 0xffffff);
  return finish(p, ICE_HI);
};

/** Eclipse seer: a robed prophet carrying a tiny eclipsed sun above its hands. */
export const eclipseSeer: Draw = (f) => {
  const p = new Pix(20, 24);
  const robe = 0x44204c, hi = 0x6a3274;
  const b = f ? 1 : 0;
  p.poly([[5, 9], [15, 9], [17, 23], [3, 23]], robe);
  p.line(6, 10, 4, 22, hi);
  p.ellipse(10, 6, 4, 4, robe);
  p.ellipse(11, 7, 2, 2, 0x0a0410);
  p.set(12, 6, 0xff9ae6);
  // raised hands + floating eclipse
  p.line(14, 12, 17, 8, robe).line(6, 12, 4, 9, robe);
  p.circle(16, 4 - b, 3, 0xff6bd6).circle(16, 4 - b, 2, 0x0a0410);
  p.set(14, 2 - b, 0xffd8f4);
  return finish(p, 0xffb8ee);
};

/** Star-eater: a huge round maw with an ember core and orbiting rubble. */
export const starEater: Draw = (f) => {
  const p = new Pix(40, 38);
  const hide = 0x2a1a24, hideHi = 0x40283a, dark = 0x0c0608;
  const open = f ? 2 : 0;
  p.ellipse(20, 20, 16, 15, hide);
  p.ellipse(17, 15, 10, 7, hideHi);
  // the maw
  p.ellipse(24, 22, 9, 5 + open, dark);
  p.ellipse(24, 22, 5, 2 + open * 0.5, 0xff7a2a);
  p.circle(24, 22, 1.5, 0xfff0b0);
  for (let i = 0; i < 7; i++) {
    const x = 16 + i * 2.6;
    p.poly([[x, 17 - open], [x + 1, 20 - open], [x + 2, 17 - open]], 0xe8d8c0);
    p.poly([[x, 27 + open], [x + 1, 24 + open], [x + 2, 27 + open]], 0xe8d8c0);
  }
  // eyes on stalks
  p.line(12, 9, 9, 3, hide).line(18, 7, 18, 1, hide);
  p.circle(9, 3, 2, 0xffd34d).circle(18, 1.5, 1.6, 0xffd34d).set(9, 3, dark).set(18, 1, dark);
  // orbiting rubble
  const a = f ? 0.6 : 0;
  for (let k = 0; k < 4; k++) {
    const ang = a + (k / 4) * Math.PI * 2;
    p.rect(20 + Math.cos(ang) * 18, 20 + Math.sin(ang) * 16, 2, 2, 0x5a4a50);
  }
  return finish(p, 0xffb36b);
};

/** The Twin-Headed Void Hound: a long black beast with two snarling heads. */
export const voidHound: Draw = (f) => {
  const p = new Pix(58, 38);
  const fur = 0x302448, furHi = 0x4c3a6c, dark = 0x150e20;
  const g = f ? 2 : 0;
  // legs (gallop), two pixels thick
  for (const [x0, x1] of [[14, 10 - g], [19, 21 + g], [34, 30 + g], [39, 43 - g]] as [number, number][]) {
    p.line(x0, 24, x1, 35, dark).line(x0 + 1, 24, x1 + 1, 35, fur);
    p.rect(x1 - 1, 35, 4, 2, dark);
  }
  // body + bristling spine
  p.ellipse(27, 20, 17, 8, fur);
  p.ellipse(25, 16, 13, 3, furHi);
  for (let i = 0; i < 7; i++) p.poly([[12 + i * 4, 14], [14 + i * 4, 7 + (i % 2) * 2], [16 + i * 4, 14]], i % 2 ? VIOLET : fur);
  // tail
  p.line(10, 18, 2, 11 - g, fur).line(10, 19, 2, 13 - g, fur).set(2, 11 - g, VIOLET);
  // two heads on two thick necks
  for (const [ny, hy] of [[15, 8], [21, 24]] as [number, number][]) {
    p.line(38, ny, 46, hy, fur).line(38, ny + 1, 46, hy + 1, fur).line(38, ny + 2, 46, hy + 2, furHi);
    p.ellipse(48, hy + 1, 5, 4, fur);
    p.poly([[50, hy - 1], [57, hy + 1 + g * 0.5], [50, hy + 3]], fur);
    p.poly([[45, hy - 2], [46, hy - 7], [48, hy - 2]], fur);
    p.set(49, hy, VIOLET).set(50, hy, 0xf0d8ff);
    p.line(52, hy + 3, 56, hy + 3, VIOLET).line(52, hy + 4, 55, hy + 4, 0xf0d8ff);
  }
  return finish(p, 0xe0c8ff);
};

/** The Crystal Colossus: a hulking golem of ice-blue crystal with a glowing core. */
export const crystalColossus: Draw = (f) => {
  const p = new Pix(52, 54);
  const rock = 0x1c2838, rockHi = 0x2c4058, crys = ICE;
  const s = f ? 1 : 0;
  // legs
  p.rect(14, 40, 9, 13, rock).rect(29, 40, 9, 13, rock);
  p.rect(12, 50, 13, 4, rockHi).rect(27, 50, 13, 4, rockHi);
  // torso
  p.poly([[10, 18], [42, 18], [38, 42], [14, 42]], rock);
  p.poly([[13, 20], [39, 20], [36, 30], [16, 30]], rockHi);
  // arms (huge crystal fists)
  p.rect(3, 20 + s, 8, 16, rock).rect(41, 20 - s, 8, 16, rock);
  p.poly([[1, 36 + s], [7, 30 + s], [13, 36 + s], [7, 44 + s]], crys);
  p.poly([[39, 36 - s], [45, 30 - s], [51, 36 - s], [45, 44 - s]], crys);
  // crystal crown on the shoulders and head
  p.poly([[12, 19], [15, 6], [19, 19]], crys).poly([[33, 19], [37, 4], [41, 19]], crys);
  p.rect(20, 8, 12, 11, rock);
  p.poly([[22, 9], [26, 0], [30, 9]], blend(crys, 0xffffff, 0.25));
  p.rect(22, 12, 3, 2, ICE_HI).rect(28, 12, 3, 2, ICE_HI);
  // core
  p.circle(26, 32, 4, 0x0a1420).circle(26, 32, 2.5, crys).set(26, 31, 0xffffff);
  for (const [x, y] of [[15, 7], [37, 5], [7, 31], [45, 31]]) p.line(x, y, x, y + 8, ICE_HI);
  return finish(p, ICE_HI);
};

// ---------------------------------------------------------------- the Heart of the Black Sun

/**
 * The Heart of the Black Sun: a vast eclipsed eye wrapped in a corona of
 * violet flame, veins of molten light across its face. cracked = phase 3:
 * the shell splits and white light pours out.
 */
export function drawHeart(frame: number, cracked: boolean): Pix {
  const S = 120;
  const p = new Pix(S, S);
  const c = S / 2;
  const pulse = frame ? 1 : 0;
  // corona: flame tongues around the rim
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2 + (frame ? 0.11 : 0);
    const len = 46 + (k % 3) * 5 + ((k + frame) % 2) * 4;
    const w = 0.09;
    p.poly([[c + Math.cos(a - w) * 36, c + Math.sin(a - w) * 36], [c + Math.cos(a) * len, c + Math.sin(a) * len], [c + Math.cos(a + w) * 36, c + Math.sin(a + w) * 36]], k % 2 ? 0x6a3db0 : VIOLET);
  }
  p.ring(c, c, 40, 3, cracked ? 0xffffff : 0xe0c0ff);
  // the black shell
  p.circle(c, c, 38, 0x07040c);
  p.circle(c - 8, c - 10, 22, 0x120a1e);
  // veins of light
  for (let k = 0; k < 9; k++) {
    let x = c, y = c;
    let a = (k / 9) * Math.PI * 2 + noise2(k, 3) * 0.4;
    for (let s = 0; s < 6; s++) {
      const nx = x + Math.cos(a) * 6, ny = y + Math.sin(a) * 6;
      if (Math.hypot(nx - c, ny - c) > 36) break;
      p.line(x, y, nx, ny, cracked ? 0xfff0ff : s < 2 ? 0xff9ae6 : 0x8a4ad0);
      x = nx;
      y = ny;
      a += (noise2(k, s) - 0.5) * 0.9;
    }
  }
  // the eye: iris of embers, a pupil that is a hole
  const ir = cracked ? 15 : 13;
  p.circle(c, c, ir + 2, 0x1a0a14);
  p.circle(c, c, ir, cracked ? 0xffe0a0 : 0xff7a2a);
  p.circle(c, c, ir - 3, cracked ? 0xffffff : 0xffb36b);
  p.ellipse(c, c, 3 + pulse, ir - 2, 0x000000);
  p.set(c - 4, c - 5, 0xffffff).set(c - 3, c - 5, 0xffffff);
  if (cracked) {
    // the shell breaks: shafts of white light
    for (const [x, y] of [[c - 30, c - 18], [c + 26, c - 24], [c - 22, c + 28], [c + 30, c + 16], [c + 4, c - 36]]) {
      p.line(c, c, x, y, 0xffffff);
      p.line(c + 1, c, x + 1, y, 0xf0d8ff);
    }
  }
  p.rim(0xf0d8ff, 0, -1, 0.16);
  p.outline(OUTLINE);
  return p;
}

/** One orbiting shield shard of the Heart (a separate, breakable enemy). */
export const heartShard: Draw = (f) => {
  const p = new Pix(18, 18);
  p.poly([[9, 0], [16, 7], [9, 17], [2, 7]], 0x2a1a44);
  p.poly([[9, 2], [14, 7], [9, 14], [4, 7]], f ? 0xc9a8ff : VIOLET);
  p.line(9, 3, 9, 13, 0xf0d8ff).set(7, 6, 0xffffff);
  return finish(p, 0xf0d8ff);
};

export const BLACK_SUN_ENEMY_DRAW: Record<string, Draw> = {
  rift: riftWraith, crystal: crystalCrawler, shard: crystalShard, seer: eclipseSeer, eater: starEater,
  hound: voidHound, colossus: crystalColossus, heartshard: heartShard,
};

// ---------------------------------------------------------------- map

/** Floor: cracked obsidian plates with cold veins and drifting star dust. */
export function blackSunFloor(seed = 4): Pix {
  const S = 256;
  const p = new Pix(S, S);
  const base = 0x120e1c;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      // irregular plates (cellular-ish via quantised noise)
      const px = Math.floor((x + noise2(Math.floor(y / 8), 1, seed) * 10) / 40), py = Math.floor((y + noise2(Math.floor(x / 8), 2, seed) * 10) / 40);
      const tone = 0.8 + noise2(px, py, seed) * 0.4;
      const fine = 0.94 + noise2(x, y, seed + 7) * 0.12;
      p.set(x, y, shade(base, tone * fine));
    }
  // plate seams
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const a = Math.floor((x + noise2(Math.floor(y / 8), 1, seed) * 10) / 40), b = Math.floor((x + 1 + noise2(Math.floor(y / 8), 1, seed) * 10) / 40);
      const c = Math.floor((y + noise2(Math.floor(x / 8), 2, seed) * 10) / 40), d = Math.floor((y + 1 + noise2(Math.floor(x / 8), 2, seed) * 10) / 40);
      if (a !== b || c !== d) p.set(x, y, 0x050308);
    }
  // glowing veins
  for (let i = 0; i < 9; i++) {
    let x = noise2(i, 4, seed) * S, y = noise2(i, 5, seed) * S;
    let a = noise2(i, 6, seed) * Math.PI * 2;
    const col = noise2(i, 7, seed) > 0.6 ? 0x2a5a78 : 0x3a1e5a;
    for (let s = 0; s < 22; s++) {
      p.set(((Math.round(x) % S) + S) % S, ((Math.round(y) % S) + S) % S, col);
      x += Math.cos(a) * 1.5;
      y += Math.sin(a) * 1.5;
      a += (noise2(i, s, seed) - 0.5) * 0.8;
    }
  }
  // star dust
  for (let i = 0; i < 40; i++) p.set(Math.floor(noise2(i, 8, seed) * S), Math.floor(noise2(i, 9, seed) * S), noise2(i, 10, seed) > 0.7 ? 0x9fe8ff : 0x5a4a7a);
  return p;
}

/** A spire of crystal growing out of the ground. */
export function crystalSpire(size: number): Pix {
  const h = 28 + size * 18, w = 18 + size * 8;
  const p = new Pix(w, h);
  const n = 2 + size;
  for (let k = 0; k < n; k++) {
    const cx = w / 2 + (k - (n - 1) / 2) * (w / (n + 1)) * 1.1;
    const top = 2 + Math.abs(k - (n - 1) / 2) * 8 + noise2(k, size) * 6;
    const bw = 3 + size + (k === Math.floor(n / 2) ? 2 : 0);
    p.poly([[cx - bw, h - 2], [cx, top], [cx + bw, h - 2]], k % 2 ? 0x3a8ab0 : ICE);
    p.line(cx - 1, top + 3, cx - bw * 0.5, h - 4, ICE_HI);
  }
  p.rect(2, h - 4, w - 4, 3, 0x141c28);
  p.outline(0x05060a);
  return p;
}

/** A floating chunk of a swallowed world. */
export function floatingRock(v: number): Pix {
  const p = new Pix(34, 26);
  const rock = 0x221a2a, hi = 0x362a40;
  const pts: [number, number][] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const r = 11 + noise2(k, v) * 5;
    pts.push([17 + Math.cos(a) * r * 1.3, 12 + Math.sin(a) * r * 0.8]);
  }
  p.poly(pts, rock);
  p.ellipse(14, 8, 8, 3, hi);
  for (let i = 0; i < 4; i++) p.set(8 + Math.floor(noise2(i, v + 3) * 18), 6 + Math.floor(noise2(i, v + 4) * 10), noise2(i, v + 5) > 0.5 ? ICE : VIOLET);
  p.outline(0x05060a);
  return p;
}

/** A dying ember of a swallowed star (light source). */
export function starEmber(): Pix {
  const p = new Pix(8, 8);
  p.circle(4, 4, 3, 0xffb36b).circle(4, 4, 1.6, 0xfff0d0);
  return p;
}
