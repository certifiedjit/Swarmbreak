/**
 * Art for Chapter 5, the Hive Below: living tunnels of chitin, membrane and
 * nerve-red light. Live Egg Sacs are bright yellow and pulse; decor nests are
 * dark, already-broken shells so they never read as enemies.
 * Enemies face right (the game flips them).
 */
import { OUTLINE, Pix, blend, noise2, shade } from './pixel';

type Draw = (frame: number) => Pix;

function finish(p: Pix, rim = 0xffc0d0): Pix {
  p.rim(rim, 0, -1, 0.22);
  p.outline(OUTLINE);
  return p;
}

const CHITIN = 0x6a3a2a;
const CHITIN_HI = 0x9a5a3a;
const ACID = 0x9aff3d;
const NERVE = 0xff6a8a;

// ---------------------------------------------------------------- enemies

/** Broodling: a tiny six-legged grub with a big green eye. */
export const broodling: Draw = (f) => {
  const p = new Pix(12, 10);
  const s = f ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    p.line(3 + i * 3, 6, 2 + i * 3 - s, 9, 0x2a1a10);
    p.line(4 + i * 3, 6, 5 + i * 3 + s, 9, 0x2a1a10);
  }
  p.ellipse(6, 5, 5, 3.5, 0x7a9a2a);
  p.ellipse(5, 4, 3, 1.5, 0xa8d040);
  p.circle(9, 4, 1.5, 0x1a1a10).set(9, 4, ACID);
  return finish(p, 0xd8ff9a);
};

/** Acid spitter: a swollen sac on legs with a dripping green mouth. */
export const acidSpitter: Draw = (f) => {
  const p = new Pix(20, 20);
  const s = f ? 1 : 0;
  for (let i = 0; i < 4; i++) p.line(5 + i * 3, 13, 3 + i * 4 + ((i + s) % 2), 19, 0x2a1a10);
  p.ellipse(10, 9, 7, 6, CHITIN);
  p.ellipse(9, 7 + s, 5, 4, 0x5a8a2a);
  p.ellipse(8, 6 + s, 3, 2, ACID);
  p.ellipse(16, 10, 3, 3, CHITIN_HI);
  p.ellipse(18, 11, 1.5, 2, 0x1a1a10);
  p.set(18, 13 + s, ACID).set(18, 14 + s, ACID);
  p.set(14, 8, 0xffd040);
  return finish(p, 0xd8ff9a);
};

/** Carapace charger: a horned, armoured beetle built to ram. */
export const carapaceCharger: Draw = (f) => {
  const p = new Pix(30, 20);
  const s = f ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    p.line(8 + i * 6, 13, 6 + i * 6 + s * 2, 19, 0x2a1a10);
    p.line(10 + i * 6, 13, 12 + i * 6 - s * 2, 19, 0x2a1a10);
  }
  p.ellipse(13, 10, 11, 6, CHITIN);
  p.ellipse(12, 8, 9, 3.5, CHITIN_HI);
  p.line(13, 4, 13, 15, shade(CHITIN, 0.7));
  // head + great horn
  p.ellipse(24, 11, 4, 3.5, shade(CHITIN, 0.8));
  p.poly([[25, 9], [30, 3], [28, 10]], 0xe8d0a0);
  p.set(25, 11, 0xffd040);
  return finish(p, 0xffd8b0);
};

/** Egg sac: a glossy yellow egg; it swells and veins glow as it nears hatching. */
export const eggSac: Draw = (f) => {
  const p = new Pix(20, 22);
  p.ellipse(10, 21, 8, 2, 0x3a2a14);
  p.ellipse(10, 12, 7.5, 9.5 + (f ? 0.5 : 0), 0xe8c850);
  p.ellipse(8, 9, 4, 5, 0xfff0a0);
  p.line(10, 4, 12, 18, 0xc89030).line(6, 8, 7, 18, 0xc89030);
  p.set(7, 7, 0xffffff);
  // a shadow of something curled inside
  p.ellipse(11, 14, 3, 2, shade(0xe8c850, 0.75));
  return finish(p, 0xfff8d0);
};

/** Hive drone: an amber wasp-thing with blurred wings. */
export const hiveDrone: Draw = (f) => {
  const p = new Pix(18, 14);
  const up = f ? 1 : 0;
  p.ellipse(6, 4 - up, 5, 3, 0xd8e8f0, 150);
  p.ellipse(12, 4 - up, 5, 3, 0xd8e8f0, 150);
  p.ellipse(9, 9, 6, 3.5, 0xffb33d);
  p.line(5, 7, 5, 11, 0x2a1a10).line(9, 6, 9, 12, 0x2a1a10);
  p.circle(15, 8, 2.5, 0x3a2a14).set(16, 7, NERVE);
  p.poly([[2, 9], [0, 10], [2, 11]], 0x2a1a10);
  return finish(p, 0xfff0c0);
};

/** Armoured node: a knot of nerves inside a cage of carapace plates. */
export const hiveNode: Draw = (f) => {
  const p = new Pix(28, 28);
  p.ellipse(14, 25, 11, 3, 0x2a1418);
  p.circle(14, 14, 8, f ? NERVE : shade(NERVE, 0.8));
  p.circle(13, 12, 3, 0xffd0dc);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    p.poly([[14 + Math.cos(a) * 6, 14 + Math.sin(a) * 6], [14 + Math.cos(a + 0.4) * 13, 14 + Math.sin(a + 0.4) * 13], [14 + Math.cos(a + 0.8) * 7, 14 + Math.sin(a + 0.8) * 7]], CHITIN_HI);
  }
  return finish(p);
};

// ---------------------------------------------------------------- mini-bosses

/** The Hive Knight: an upright armoured insect with a spear and shield-carapace. */
export const hiveKnight: Draw = (f) => {
  const p = new Pix(44, 50);
  const s = f ? 1 : 0;
  // legs
  p.line(16, 34, 12 - s, 48, 0x2a1a10).line(17, 34, 14 - s, 48, 0x2a1a10);
  p.line(26, 34, 30 + s, 48, 0x2a1a10).line(27, 34, 32 + s, 48, 0x2a1a10);
  // abdomen and thorax
  p.ellipse(21, 30, 9, 7, CHITIN);
  p.ellipse(21, 19, 8, 9, CHITIN_HI);
  p.line(21, 11, 21, 36, shade(CHITIN, 0.7));
  // helm-head with mandibles
  p.ellipse(22, 7, 6, 5, CHITIN);
  p.set(24, 6, NERVE).set(20, 6, NERVE);
  p.line(19, 11, 17, 14, 0xe8d0a0).line(25, 11, 27, 14, 0xe8d0a0);
  // spear
  p.line(34, 4 - s, 34, 46 - s, 0x5a3a20);
  p.poly([[32, 6 - s], [34, -1 - s], [36, 6 - s]], 0xe8d0a0);
  p.line(28, 20, 34, 22, CHITIN_HI);
  // the shield-plate arm
  p.poly([[6, 14], [13, 12], [14, 32], [8, 34], [5, 26]], shade(CHITIN_HI, 1.1));
  p.line(9, 15, 10, 31, 0xd8a070);
  return finish(p, 0xffd8b0);
};

/** One of the Twin Larvae: a fat segmented grub with a green-glowing throat. */
export const larva: Draw = (f) => {
  const p = new Pix(44, 30);
  const s = f ? 1 : 0;
  for (let i = 0; i < 5; i++) {
    const x = 7 + i * 7, y = 17 + ((i + s) % 2);
    p.ellipse(x, y, 6, 7 - Math.abs(i - 2) * 0.5, i % 2 ? 0xd8c890 : 0xc8b478);
    p.line(x - 5, y + 5, x + 5, y + 5, 0x8a7a50);
  }
  p.ellipse(39, 14, 6, 6, 0xc8b478);
  p.ellipse(42, 15, 2.5, 3.5, 0x1a1a10);
  p.ellipse(42, 15, 1.5, 2, ACID);
  p.set(38, 11, 0x1a1a10).set(40, 10, 0x1a1a10);
  return finish(p, 0xfff0c0);
};

// ---------------------------------------------------------------- the Swarm Mind

/** The Swarm Mind: a vast pulsing brain-sac wreathed in tendrils, a crown of eyes. cracked = phase 3. */
export function drawSwarmMind(frame: number, cracked: boolean): Pix {
  const p = new Pix(132, 124);
  const flesh = 0x5a2a3a, fleshHi = 0x8a3a52, vein = cracked ? 0xffd0dc : NERVE;
  const b = frame ? 1 : 0;
  // tendrils
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * 0.15 + (k / 7) * Math.PI * 0.7;
    let x = 66, y = 80;
    for (let t = 0; t < 14; t++) {
      x += Math.cos(a) * 3.6 * (k < 4 ? -1 : 1) + Math.sin(t * 0.7 + k + b) * 1.2;
      y += Math.sin(a) * 2.8;
      p.circle(x, y, 4 - t * 0.22, t % 3 ? flesh : fleshHi);
    }
  }
  // the brain-sac
  p.ellipse(66, 56, 46 + b, 40 + b, flesh);
  p.ellipse(60, 48, 34, 26, fleshHi);
  // folds
  for (let k = 0; k < 9; k++) {
    const y = 28 + k * 6;
    for (let x = 30; x < 102; x += 2) {
      const yy = y + Math.sin(x * 0.18 + k) * 3;
      if ((x - 66) ** 2 / 46 ** 2 + (yy - 56) ** 2 / 40 ** 2 < 0.9) p.set(x, yy, shade(flesh, 0.7));
    }
  }
  // glowing veins
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    p.line(66, 60, 66 + Math.cos(a) * 38, 58 + Math.sin(a) * 30, vein);
  }
  // crown of eyes
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * 1.1 + (k / 6) * Math.PI * 0.8;
    const x = 66 + Math.cos(a) * 34, y = 52 + Math.sin(a) * 30;
    p.circle(x, y, 4, 0xf8e8d0);
    p.circle(x + 0.5, y, 2, cracked ? 0xffffff : NERVE);
    p.set(x, y, 0x1a0a10);
  }
  // the central eye
  p.ellipse(66, 64, 12, 9, 0xf8e8d0);
  p.ellipse(66, 64, 7, 7, cracked ? 0xffe0a0 : 0xff4d6d);
  p.ellipse(66, 64, 2.5, 6, 0x1a0a10);
  if (cracked) for (const [x, y] of [[40, 40], [92, 44], [48, 84], [86, 82]]) p.line(66, 64, x, y, 0xfff0e0);
  p.rim(0xffc0d0, 0, -1, 0.18);
  p.outline(OUTLINE);
  return p;
}

export const HIVE_ENEMY_DRAW: Record<string, Draw> = {
  broodling, spitter: acidSpitter, charger: carapaceCharger, eggsac: eggSac, hivedrone: hiveDrone, hivenode: hiveNode, hiveknight: hiveKnight, larva,
};

// ---------------------------------------------------------------- map art

/** living floor: membrane, chitin plates and veins */
export function hiveFloor(seed = 6): Pix {
  const S = 256;
  const p = new Pix(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = noise2(Math.floor(x / 20), Math.floor(y / 20), seed) * 0.5 + noise2(Math.floor(x / 6), Math.floor(y / 6), seed + 1) * 0.3 + noise2(x, y, seed + 2) * 0.2;
      p.set(x, y, blend(0x1a0c12, 0x30161e, n));
    }
  // chitin plates
  for (let i = 0; i < 14; i++) {
    const cx = noise2(i, 1, seed) * S, cy = noise2(i, 2, seed) * S, r = 8 + noise2(i, 3, seed) * 10;
    for (let y = -r; y <= r; y++)
      for (let x = -r * 1.3; x <= r * 1.3; x++) {
        if ((x * x) / (r * r * 1.7) + (y * y) / (r * r) > 1) continue;
        const X = ((Math.round(cx + x) % S) + S) % S, Y = ((Math.round(cy + y) % S) + S) % S;
        p.set(X, Y, blend(0x241014, 0x301a18, (y + r) / (2 * r)));
      }
  }
  // veins
  for (let i = 0; i < 10; i++) {
    let x = noise2(i, 5, seed) * S, y = noise2(i, 6, seed) * S, a = noise2(i, 7, seed) * 6.28;
    for (let t = 0; t < 60; t++) {
      a += (noise2(i, t, seed + 3) - 0.5) * 0.6;
      x += Math.cos(a);
      y += Math.sin(a);
      const X = ((Math.round(x) % S) + S) % S, Y = ((Math.round(y) % S) + S) % S;
      p.set(X, Y, blend(p.get(X, Y), 0x6a1e30, 0.7));
    }
  }
  return p;
}

/** a ridge of chitin jutting from the tunnel floor */
export function chitinRidge(v: number): Pix {
  const p = new Pix(46, 24);
  for (let k = 0; k < 5; k++) {
    const x = 4 + k * 9, h = 10 + noise2(k, v, 51) * 12;
    p.poly([[x - 4, 23], [x + 1, 23 - h], [x + 6, 23]], blend(0x3a2016, 0x5a3022, noise2(k, v, 52)));
    p.line(x, 22, x + 1, 24 - h, 0x6a4030);
  }
  p.outline(0x0a0508);
  return p;
}

/** a limp tendril lying across the floor (dark; it never moves) */
export function deadTendril(v: number): Pix {
  const p = new Pix(48, 18);
  let y = 9;
  for (let x = 2; x < 46; x++) {
    y += Math.sin(x * 0.3 + v) * 0.6;
    p.circle(x, y, 3 - x / 30, x % 6 < 3 ? 0x3a1a24 : 0x2a1218);
  }
  p.outline(0x0a0508);
  return p;
}

/** a glowing nodule in the wall: the tunnels' only light */
export function glowPod(): Pix {
  const p = new Pix(12, 12);
  p.circle(6, 6, 5, 0x5a2a3a);
  p.circle(6, 6, 3.5, 0xff9ab0);
  p.circle(5, 5, 1.5, 0xffe0e8);
  p.outline(0x0a0508);
  return p;
}

/** a hatched, broken shell (egg-field decor): dark and open, so it never reads as a live Egg Sac */
export function nestShell(): Pix {
  const p = new Pix(16, 14);
  p.ellipse(8, 12, 7, 2, 0x1a0c08);
  p.poly([[2, 12], [3, 5], [5, 8], [7, 3], [9, 7], [11, 4], [13, 9], [14, 12]], 0x5a4a28);
  p.ellipse(8, 11, 4, 2, 0x140a06);
  p.outline(0x0a0508);
  return p;
}
