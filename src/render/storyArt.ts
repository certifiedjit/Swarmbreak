/**
 * Small pixel-art scenes for story cards (drawn at 192x108, shown scaled up).
 */
import { Pix, noise2, blend } from './pixel';
import { drawTitan } from './enemyArt';
import { drawHeroFrames, WARDEN_PALETTE } from './heroArt';

const W = 192, H = 108;

function starfield(p: Pix, seed: number, top: number, bottom: number): void {
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const c = blend(top, bottom, t);
    for (let x = 0; x < W; x++) p.set(x, y, c);
  }
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(noise2(i, 1, seed) * W), y = Math.floor(noise2(i, 2, seed) * H * 0.7);
    const b = noise2(i, 3, seed);
    p.set(x, y, b > 0.9 ? 0xffffff : b > 0.6 ? 0x8fa6c8 : 0x3d4a66);
  }
}

function hullSilhouettes(p: Pix, seed: number, baseY: number, color: number): void {
  let x = -10;
  let i = 0;
  while (x < W + 10) {
    const w = 20 + noise2(i, 4, seed) * 40;
    const h = 8 + noise2(i, 5, seed) * 20;
    const pts: [number, number][] = [[x, baseY], [x + w * 0.1, baseY - h], [x + w * 0.4, baseY - h * (0.6 + noise2(i, 6, seed) * 0.5)], [x + w * 0.7, baseY - h * 0.8], [x + w, baseY]];
    p.poly(pts, color);
    if (noise2(i, 7, seed) > 0.5) p.set(x + w * 0.5, baseY - h * 0.4, noise2(i, 8, seed) > 0.5 ? 0xffa53d : 0x5cc8ff);
    x += w * 0.8;
    i++;
  }
  p.rect(0, baseY, W, H - baseY, color);
}

export function storyScene(id: string): Pix {
  const p = new Pix(W, H);
  if (id === 'graveyard_before') {
    starfield(p, 3, 0x05060c, 0x14101c);
    // collapsing star
    p.circle(150, 34, 22, 0x2a0d08);
    p.circle(150, 34, 17, 0x7a2a10);
    p.circle(150, 34, 12, 0xff7a2a);
    p.circle(150, 34, 7, 0xffd27a);
    p.ring(150, 34, 27, 1, 0x3a1a3a);
    p.ring(150, 34, 31, 1, 0x26122a);
    hullSilhouettes(p, 5, 88, 0x0c0e15);
    hullSilhouettes(p, 9, 98, 0x07080c);
    // the Warden on a hull
    const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE }).idle[2];
    p.draw(hero, 40, 60);
  } else if (id === 'graveyard_after') {
    starfield(p, 8, 0x04050a, 0x0d0f18);
    // distant moon with cathedral
    p.circle(152, 30, 18, 0x2a2a20);
    p.circle(148, 27, 15, 0x3a3a2c);
    p.poly([[140, 18], [143, 8], [146, 18]], 0x14140f);
    p.rect(138, 18, 24, 6, 0x14140f);
    p.poly([[152, 18], [155, 4], [158, 18]], 0x14140f);
    p.set(155, 9, 0xffd34d);
    hullSilhouettes(p, 12, 92, 0x0a0b11);
    // fallen titan, dark core
    const t = drawTitan(0, true);
    const small = new Pix(58, 62);
    for (let y = 0; y < 62; y++) for (let x = 0; x < 58; x++) if (t.alpha(x * 2, y * 2) > 100) small.set(x, y, blend(t.get(x * 2, y * 2), 0x05060a, 0.55));
    p.draw(small, 18, 46);
    const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE }).victory;
    p.draw(hero, 92, 62);
  } else if (id === 'cathedral_before' || id === 'cathedral_after') {
    const after = id === 'cathedral_after';
    starfield(p, after ? 21 : 17, 0x05070a, after ? 0x0e0a16 : 0x0c1208);
    if (after) blackSun(p, 156, 26, 13);
    // the moon's surface
    p.ellipse(96, 132, 150, 50, 0x1c1e16);
    p.ellipse(96, 128, 140, 42, 0x24271c);
    for (let i = 0; i < 18; i++) p.ellipse(10 + noise2(i, 3, 7) * 172, 88 + noise2(i, 4, 7) * 18, 3 + noise2(i, 5, 7) * 5, 1.5, 0x1a1c14);
    cathedralSilhouette(p, after);
    const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE })[after ? 'victory' : 'idle'] as Pix | Pix[];
    p.draw(Array.isArray(hero) ? hero[1] : hero, 24, 64);
  } else if (id === 'blacksun_before') {
    starfield(p, 31, 0x040208, 0x120a1e);
    blackSun(p, 140, 34, 26);
    // light being drawn into it
    for (let i = 0; i < 40; i++) {
      const a = noise2(i, 1, 33) * Math.PI * 2, d = 32 + noise2(i, 2, 33) * 30;
      p.set(140 + Math.cos(a) * d, 34 + Math.sin(a) * d * 0.7, noise2(i, 3, 33) > 0.5 ? 0xc9a8ff : 0x6a3db0);
    }
    floatingRocks(p, 34);
    crystalRidge(p, 36, 88, false);
    const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE }).idle[1];
    p.draw(hero, 30, 58);
  } else if (id === 'blacksun_after' || id === 'ending') {
    // dawn: the dead sun ignites
    const ending = id === 'ending';
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const c = t < 0.5 ? blend(0x1a2a5a, 0xd0603a, t * 2) : blend(0xd0603a, 0xffd27a, (t - 0.5) * 2);
      for (let x = 0; x < W; x++) p.set(x, y, c);
    }
    for (let i = 0; i < 40; i++) p.set(Math.floor(noise2(i, 1, 41) * W), Math.floor(noise2(i, 2, 41) * H * 0.3), 0xc8d4ff);
    const sx = ending ? 96 : 140, sy = ending ? 46 : 36;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      p.line(sx + Math.cos(a) * 22, sy + Math.sin(a) * 22, sx + Math.cos(a) * (32 + (k % 2) * 10), sy + Math.sin(a) * (32 + (k % 2) * 10), 0xfff0b0);
    }
    p.circle(sx, sy, 20, 0xffe08a);
    p.circle(sx, sy, 16, 0xfff4c8);
    p.circle(sx, sy, 10, 0xffffff);
    if (ending) {
      // the worlds it swallowed, lit again: the Cathedral Moon and a drifting hull
      p.circle(34, 28, 10, 0x8a8a70).circle(31, 26, 8, 0xb0ae8c);
      p.poly([[29, 20], [31, 14], [33, 20]], 0x4a4a38).set(31, 17, 0xffd34d);
      p.poly([[150, 22], [178, 18], [184, 24], [156, 27]], 0x5a6478).set(170, 21, 0x9fe8ff);
    }
    crystalRidge(p, 36, ending ? 92 : 88, true);
    const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE }).victory;
    p.draw(hero, ending ? 80 : 30, ending ? 62 : 58);
  } else if (id === 'archive_before' || id === 'archive_after') {
    const after = id === 'archive_after';
    // a snowbound moon under a new, small sun
    starfield(p, after ? 53 : 51, 0x0a1220, after ? 0x2a3a52 : 0x1a2638);
    p.circle(160, 22, 9, after ? 0xfff0c0 : 0xffe08a);
    p.circle(160, 22, 6, 0xffffff);
    // the stacks rising out of the drifts
    for (let i = 0; i < 9; i++) {
      const x = 4 + i * 22 + noise2(i, 1, 55) * 8, h = 20 + noise2(i, 2, 55) * 26;
      p.rect(x, 86 - h, 16, h, 0x1a1418);
      for (let y = 86 - h + 3; y < 84; y += 6) p.rect(x + 2, y, 12, 1, 0x3a2a24);
      p.rect(x - 1, 86 - h - 2, 18, 3, 0xe6f0fa);
    }
    // snow ground
    for (let y = 80; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, blend(0xc8d8e8, 0xeef4fa, noise2(Math.floor(x / 6), Math.floor(y / 3), 57)));
    // falling snow
    for (let i = 0; i < 90; i++) p.set(Math.floor(noise2(i, 3, 59) * W), Math.floor(noise2(i, 4, 59) * 80), noise2(i, 5, 59) > 0.5 ? 0xffffff : 0xbfd0e4);
    if (after) {
      // a hole melted through the ice, glowing nerve-red from below
      p.ellipse(130, 96, 22, 6, 0x2a0c14);
      p.ellipse(130, 96, 16, 4, 0x6a1e30);
      p.ellipse(130, 96, 8, 2, 0xff6a8a);
    }
    const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE })[after ? 'victory' : 'idle'] as Pix | Pix[];
    p.draw(Array.isArray(hero) ? hero[1] : hero, after ? 70 : 40, 60);
  } else if (id === 'hive_before' || id === 'hive_after') {
    const after = id === 'hive_after';
    if (after) {
      // climbing out: snow and the new sun above, the dark hive below
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, y < 54 ? blend(0x6a8ab8, 0xffd8a0, y / 54) : blend(0xeef4fa, 0x2a1018, Math.min(1, (y - 54) / 30)));
      p.circle(96, 30, 12, 0xfff4c8);
      p.circle(96, 30, 8, 0xffffff);
      for (let i = 0; i < 40; i++) p.set(Math.floor(noise2(i, 1, 61) * W), Math.floor(noise2(i, 2, 61) * 50), 0xffffff);
      p.ellipse(96, 62, 30, 6, 0x1a0a10);
      const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE }).victory;
      p.draw(hero, 80, 30);
    } else {
      // a living tunnel, lit by glowing nodules
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, blend(0x12060a, 0x30141e, noise2(Math.floor(x / 10), Math.floor(y / 10), 63) * 0.6 + (Math.abs(y - 54) / 54) * 0.4));
      for (let i = 0; i < 14; i++) {
        const x = noise2(i, 1, 65) * W, y = noise2(i, 2, 65) * H;
        p.circle(x, y, 3, 0xff6a8a);
        p.circle(x, y, 1.5, 0xffe0e8);
      }
      for (let k = 0; k < 2; k++) for (let x = 0; x < W; x++) {
        const y = k ? 96 + Math.sin(x * 0.08) * 4 : 12 + Math.sin(x * 0.07 + 1) * 4;
        p.rect(x, k ? y : 0, 1, k ? H - y : y, 0x1a0a0e);
      }
      // the mind's eye in the dark
      p.ellipse(150, 50, 18, 12, 0x5a2a3a);
      p.ellipse(150, 50, 8, 6, 0xff4d6d);
      p.ellipse(150, 50, 2, 5, 0x1a0a10);
      const hero = drawHeroFrames({ body: 'warden', palette: WARDEN_PALETTE }).idle[1];
      p.draw(hero, 36, 60);
    }
  } else {
    starfield(p, 1, 0x05060c, 0x100c18);
  }
  return p;
}

function floatingRocks(p: Pix, seed: number): void {
  for (let i = 0; i < 6; i++) {
    const x = 10 + noise2(i, 1, seed) * 172, y = 20 + noise2(i, 2, seed) * 44;
    const r = 2 + noise2(i, 3, seed) * 5;
    p.ellipse(x, y, r * 1.4, r * 0.8, 0x1c1426);
    p.ellipse(x - 1, y - 1, r * 0.8, r * 0.4, 0x2c2238);
  }
}

/** a jagged crystal landscape; lit = catching the new dawn */
function crystalRidge(p: Pix, seed: number, baseY: number, lit: boolean): void {
  const dark = lit ? 0x2a1e30 : 0x0a0812;
  for (let i = 0; i < 26; i++) {
    const x = noise2(i, 1, seed) * W, h = 8 + noise2(i, 2, seed) * 22, w = 3 + noise2(i, 3, seed) * 5;
    const col = lit ? blend(0x7ae0ff, 0xffe0a0, noise2(i, 4, seed) * 0.6) : blend(0x1c2a3a, 0x3a1e5a, noise2(i, 4, seed));
    p.poly([[x - w, baseY + 2], [x, baseY - h], [x + w, baseY + 2]], col);
    if (lit) p.line(x - 1, baseY - h + 2, x - w * 0.5, baseY, 0xfff8e0);
  }
  p.rect(0, baseY, W, H - baseY, dark);
}

/** a black star with a violet corona */
export function blackSun(p: Pix, cx: number, cy: number, r: number): void {
  for (let k = 6; k > 0; k--) p.circle(cx, cy, r + k * 2, blend(0x05040a, 0x8a5cff, 0.12 * (7 - k)));
  p.ring(cx, cy, r + 1.5, 1.5, 0xc9a8ff);
  p.circle(cx, cy, r, 0x020104);
}

function cathedralSilhouette(p: Pix, broken: boolean): void {
  const c = 0x0a0b07, x0 = 92, base = 92;
  // nave and side aisles
  p.rect(x0 - 34, base - 30, 68, 30, c);
  p.poly([[x0 - 36, base - 30], [x0, base - 52], [x0 + 36, base - 30]], c);
  p.rect(x0 - 52, base - 18, 18, 18, c).rect(x0 + 34, base - 18, 18, 18, c);
  // twin spires and the bell tower
  p.rect(x0 - 30, base - 64, 10, 36, c).poly([[x0 - 32, base - 64], [x0 - 25, base - 86], [x0 - 18, base - 64]], c);
  p.rect(x0 + 20, base - 70, 12, 42, c).poly([[x0 + 18, base - 70], [x0 + 26, base - 96], [x0 + 34, base - 70]], c);
  p.rect(x0 + 23, base - 62, 6, 6, broken ? 0x1a1a10 : 0xffd34d);
  // the rose window
  p.circle(x0, base - 34, 8, broken ? 0x2a2418 : 0x8a6a2a);
  if (!broken) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      p.line(x0, base - 34, x0 + Math.cos(a) * 7, base - 34 + Math.sin(a) * 7, [0xc04040, 0x4060c0, 0xc0a030, 0x40a060][k % 4]);
    }
    p.set(x0, base - 34, 0xfff0b0);
  } else {
    p.line(x0 - 6, base - 39, x0 + 5, base - 29, 0x0a0b07).line(x0 + 6, base - 38, x0 - 4, base - 28, 0x0a0b07);
  }
  // lit windows
  for (let i = 0; i < 5; i++) p.rect(x0 - 26 + i * 12, base - 22, 3, 6, broken ? 0x16140c : 0xc9a640);
  p.rect(0, base, 192, 108 - base, 0x14160f);
}
