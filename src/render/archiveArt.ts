/**
 * Art for Chapter 4, the Frozen Archive: a library buried in snow. Enemies are
 * dark ink and indigo so they read against the white floor; decor is muted
 * snow, ice and closed books (no loose pages, which would look like Page Wraiths).
 * Enemies face right (the game flips them).
 */
import { OUTLINE, Pix, blend, noise2, shade } from './pixel';

type Draw = (frame: number) => Pix;

function finish(p: Pix, rim = 0xcfe8ff): Pix {
  p.rim(rim, 0, -1, 0.25);
  p.outline(OUTLINE);
  return p;
}

const INK = 0x1c2240;
const INDIGO = 0x3a3a8a;
const FROST = 0x9fe8ff;
const PAPER = 0xd8ccb0;

// ---------------------------------------------------------------- enemies

/** Page wraith: a dark, torn folio with ink-drip wings and one cold eye. */
export const pageWraith: Draw = (f) => {
  const p = new Pix(18, 16);
  const flap = f ? 2 : 0;
  // wings: two splayed covers
  p.poly([[8, 8], [1, 3 + flap], [3, 11], [8, 11]], INDIGO);
  p.poly([[10, 8], [17, 3 + flap], [15, 11], [10, 11]], shade(INDIGO, 0.8));
  // the torn pages between them
  p.poly([[6, 5], [12, 5], [12, 13], [9, 15], [6, 13]], PAPER);
  for (let y = 7; y < 13; y += 2) p.line(7, y, 11, y, 0x5a5040);
  p.set(9, 9, FROST).set(10, 9, 0xffffff);
  p.line(8, 14, 7, 16, INK);
  return finish(p);
};

/** Ink hound: a low, dripping black dog with blue eyes. */
export const inkHound: Draw = (f) => {
  const p = new Pix(24, 16);
  const s = f ? 1 : 0;
  for (let i = 0; i < 4; i++) p.line(5 + i * 4, 10, 4 + i * 4 + ((i + s) % 2) * 2, 15, INK);
  p.ellipse(11, 9, 8, 4, INK);
  p.ellipse(10, 7, 6, 2.5, shade(INK, 1.5));
  p.ellipse(19, 7, 4, 3.5, INK);
  p.poly([[21, 7], [24, 8], [21, 10]], INK);
  p.set(20, 6, FROST).set(21, 6, 0xffffff);
  p.poly([[16, 3], [17, 0], [18, 4]], INK);
  // ink drips
  for (let i = 0; i < 4; i++) p.set(6 + i * 3, 13 + ((i + s) % 2), shade(INDIGO, 1.2));
  return finish(p, 0x7f8fd0);
};

/** Frost scribe: a hunched hooded copyist with a glowing quill. */
export const frostScribe: Draw = (f) => {
  const p = new Pix(18, 22);
  const robe = 0x26305a, robeHi = 0x36447a;
  const w = f ? 1 : 0;
  p.poly([[4, 8], [13, 8], [15 + w, 21], [2 - w, 21]], robe);
  p.line(5, 9, 3 - w, 20, robeHi);
  p.ellipse(9, 6, 5, 5, robe);
  p.ellipse(10, 7, 3, 3, 0x0a0d1c);
  p.set(11, 6, FROST).set(9, 6, FROST);
  // the quill and its frozen ink
  p.line(13, 13, 17, 7 - w, 0xeaf6ff);
  p.set(17, 6 - w, FROST).set(16, 7 - w, 0xffffff);
  p.rect(11, 13, 3, 2, 0xb0a080);
  return finish(p);
};

/** Tome golem: a hulk of stacked iron-bound books. */
export const tomeGolem: Draw = (f) => {
  const p = new Pix(36, 34);
  const s = f ? 1 : 0;
  const covers = [0x5a2a1e, 0x2a3a5a, 0x4a3a1e, 0x3a2a4a];
  // legs: two short stacks
  p.rect(9 - s, 24, 7, 9, covers[1]).rect(20 + s, 24, 7, 9, covers[2]);
  p.line(9 - s, 28, 15 - s, 28, PAPER).line(20 + s, 29, 26 + s, 29, PAPER);
  // body: a big leaning stack
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 4;
    p.rect(6 + (i % 2), y, 24 - (i % 2) * 2, 4, covers[i]);
    p.line(7 + (i % 2), y + 3, 28 - (i % 2), y + 3, PAPER);
  }
  // iron bands
  p.line(12, 8, 12, 24, 0x5a5f6a).line(23, 8, 23, 24, 0x5a5f6a);
  // head: a single heavy volume, eyes in the spine
  p.rect(12, 1, 12, 7, covers[0]);
  p.set(15, 4, 0xffb36b).set(20, 4, 0xffb36b);
  // fists
  p.rect(2, 14 + s, 5, 6, covers[3]).rect(29, 14 - s, 5, 6, covers[3]);
  // snow on the shoulders
  p.line(6, 8, 30, 8, 0xeaf6ff);
  return finish(p);
};

/** Echo moth: a violet-grey moth with eye-spots. */
export const echoMoth: Draw = (f) => {
  const p = new Pix(16, 14);
  const wing = 0x4a3a7a, spot = 0x9a8ad8;
  const up = f ? 2 : 0;
  p.ellipse(4, 6 - up / 2, 4, 4 - up / 2, wing).ellipse(12, 6 - up / 2, 4, 4 - up / 2, wing);
  p.ellipse(5, 10, 3, 2.5, shade(wing, 0.8)).ellipse(11, 10, 3, 2.5, shade(wing, 0.8));
  p.circle(4, 6 - up / 2, 1.3, spot).circle(12, 6 - up / 2, 1.3, spot);
  p.rect(7, 4, 2, 8, 0x1c1830);
  p.line(7, 4, 5, 1, 0x1c1830).line(8, 4, 10, 1, 0x1c1830);
  return finish(p, 0xd8d0ff);
};

/** the echo a moth leaves: paler and see-through */
export const mothEcho: Draw = (f) => {
  const src = echoMoth(f);
  const p = new Pix(src.w, src.h);
  for (let i = 0; i < src.data.length; i += 4) {
    if (!src.data[i + 3]) continue;
    p.data[i] = Math.min(255, src.data[i] + 90);
    p.data[i + 1] = Math.min(255, src.data[i + 1] + 80);
    p.data[i + 2] = Math.min(255, src.data[i + 2] + 110);
    p.data[i + 3] = 170;
  }
  return p;
};

// ---------------------------------------------------------------- mini-bosses

/** The Archivist: a tall robed keeper with a lantern and an open, glowing book. */
export const archivist: Draw = (f) => {
  const p = new Pix(40, 50);
  const robe = 0x1e2648, robeHi = 0x2e3a6a, trim = 0x7ab8ff;
  const s = f ? 1 : 0;
  // a ring of floating pages behind
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + s * 0.3;
    p.rect(20 + Math.cos(a) * 15, 16 + Math.sin(a) * 10, 3, 4, PAPER);
  }
  p.poly([[12, 16], [28, 16], [33 + s, 48], [7 - s, 48]], robe);
  p.poly([[14, 17], [20, 17], [17, 47], [10, 47]], robeHi);
  p.line(20, 17, 20, 47, trim);
  // hood + mask of pages
  p.ellipse(20, 11, 7, 8, robe);
  p.ellipse(21, 12, 4.5, 5, PAPER);
  p.rect(19, 11, 1, 2, INK).rect(23, 11, 1, 2, INK);
  p.set(19, 11, trim).set(23, 11, trim);
  // the open book, glowing
  p.poly([[22, 26], [30, 24], [36, 26], [36, 31], [30, 29], [22, 31]], PAPER);
  p.line(29, 24, 29, 29, 0x8a7a5a);
  p.rect(31, 26, 3, 1, trim).rect(24, 27, 3, 1, trim);
  // lantern on a hook
  p.line(9, 22, 6, 30 + s, 0x6a6a7a);
  p.rect(4, 30 + s, 5, 6, 0x3a3a4a).rect(5, 31 + s, 3, 4, 0xbfefff);
  return finish(p, 0xcfe8ff);
};

/** The Ice Wyrm: a long, low serpent of blue ice with a frost-white crest. */
export const iceWyrm: Draw = (f) => {
  const p = new Pix(52, 32);
  const body = 0x3a6a9a, hi = 0x6aa8d8, dark = 0x1a3050;
  const w = f ? 1 : 0;
  // body segments, coiling
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 6, y = 20 + Math.sin(i * 1.1 + w) * 3;
    p.ellipse(x, y, 5, 4.5, i % 2 ? body : shade(body, 0.85));
    p.set(x, y - 3, hi);
  }
  // head
  p.ellipse(42, 14, 9, 7, body);
  p.ellipse(41, 11, 6, 3, hi);
  p.poly([[46, 15], [52, 13 + w], [52, 19 - w], [46, 19]], dark); // open jaw
  p.line(47, 16, 51, 15 + w, 0xeaffff);
  p.set(44, 11, 0xffffff).set(45, 11, FROST);
  // ice crest
  for (let k = 0; k < 5; k++) p.poly([[30 + k * 3, 9], [32 + k * 3, 3 - (k % 2) * 2], [34 + k * 3, 9]], 0xd6f6ff);
  for (let k = 0; k < 4; k++) p.poly([[8 + k * 6, 16], [10 + k * 6, 11], [12 + k * 6, 16]], 0xb8e8ff);
  return finish(p);
};

// ---------------------------------------------------------------- the Librarian of Silence

/** The Librarian of Silence: a towering robed figure inside a bookcase-throne. cracked = phase 3. */
export function drawLibrarian(frame: number, cracked: boolean): Pix {
  const p = new Pix(120, 128);
  const wood = 0x2a1e18, woodHi = 0x3e2c22, robe = 0x1a2044, robeHi = 0x2a3466, glow = cracked ? 0xbfe0ff : 0x7ab8ff;
  const b = frame ? 1 : 0;
  // the bookcase-throne behind it
  p.rect(14, 10, 92, 100, wood);
  for (let shelf = 0; shelf < 5; shelf++) {
    const y = 16 + shelf * 19;
    p.rect(18, y + 15, 84, 3, woodHi);
    for (let x = 20; x < 100; x += 4) {
      const h = 10 + Math.floor(noise2(x, shelf, 7) * 5);
      const col = [0x5a2a1e, 0x2a3a5a, 0x4a3a1e, 0x3a2a4a, 0x2a4a3a][Math.floor(noise2(x, shelf, 9) * 5)];
      p.rect(x, y + 15 - h, 3, h, col);
    }
  }
  // snow on top, icicles hanging
  p.rect(12, 8, 96, 4, 0xeaf6ff);
  for (let x = 16; x < 104; x += 7) p.poly([[x, 12], [x + 3, 12], [x + 1.5, 18 + (x % 3) * 2]], 0xcfeeff);
  // the robed figure
  p.poly([[42, 40], [78, 40], [90, 122], [30, 122]], robe);
  p.poly([[46, 42], [58, 42], [52, 120], [36, 120]], robeHi);
  // hood and the void of a face, a finger to its lips
  p.ellipse(60, 32 + b, 15, 16, robe);
  p.ellipse(60, 35 + b, 9, 10, 0x05060c);
  p.rect(53, 33 + b, 4, 2, glow).rect(63, 33 + b, 4, 2, glow);
  p.rect(59, 38 + b, 2, 10, 0xd8ccb0); // the hushing finger
  // great open book in its arms
  p.poly([[36, 70], [60, 64], [84, 70], [84, 84], [60, 78], [36, 84]], PAPER);
  p.line(60, 64, 60, 78, 0x8a7a5a);
  for (let i = 0; i < 4; i++) {
    p.line(40, 71 + i * 3, 56, 67 + i * 3, 0x8a7a6a);
    p.line(64, 67 + i * 3, 80, 71 + i * 3, 0x8a7a6a);
  }
  p.circle(60, 74, cracked ? 5 : 3, glow);
  if (cracked) {
    // the silence is breaking: cracks of light through the robe
    for (const [x, y] of [[44, 96], [76, 100], [52, 112], [70, 88]]) p.line(60, 74, x, y, 0xdff0ff);
  }
  // floating rings of silence
  p.ring(60, 74, 26 + b, 1, shade(glow, 0.7));
  p.rim(0xcfe8ff, 0, -1, 0.18);
  p.outline(OUTLINE);
  return p;
}

export const ARCHIVE_ENEMY_DRAW: Record<string, Draw> = {
  pagewraith: pageWraith, inkhound: inkHound, scribe: frostScribe, tomegolem: tomeGolem, moth: echoMoth, mothecho: mothEcho, archivist, wyrm: iceWyrm,
};

// ---------------------------------------------------------------- map art

/** deep snow in a cool blue-grey (so falling white flakes show against it), with soft drift shading and wind ripples */
export function archiveFloor(seed = 5): Pix {
  const S = 256;
  const p = new Pix(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      // soft, wrapping drift shading
      const n = noise2(Math.floor(x / 24), Math.floor(y / 24), seed) * 0.5 + noise2(Math.floor(x / 8), Math.floor(y / 8), seed + 1) * 0.3 + noise2(x, y, seed + 2) * 0.2;
      p.set(x, y, blend(0x7e92ae, 0xbccbdc, 0.35 + n * 0.5));
    }
  // wind ripples
  for (let i = 0; i < 40; i++) {
    const x = noise2(i, 1, seed) * S, y = noise2(i, 2, seed) * S, L = 8 + noise2(i, 3, seed) * 18;
    for (let t = 0; t < L; t++) {
      const X = Math.floor(x + t) % S, Y = Math.floor(y + Math.sin(t * 0.4) * 1.5 + S) % S;
      p.set(X, Y, blend(p.get(X, Y), 0xdfe9f4, 0.5));
      p.set(X, (Y + 1) % S, blend(p.get(X, (Y + 1) % S), 0x6a7e9a, 0.35));
    }
  }
  return p;
}

/** a low mound of drifted snow */
export function snowDrift(v: number): Pix {
  const w = 40 + v * 12, h = 14 + v * 3;
  const p = new Pix(w, h);
  p.ellipse(w / 2, h - 2, w / 2 - 1, h - 3, 0xdfeaf4);
  p.ellipse(w / 2 - 3, h - 5, w / 2 - 6, h - 7, 0xf2f8ff);
  p.ellipse(w / 2 + 6, h - 1, w / 3, 2, 0xa8bcd2);
  return p;
}

/** a bookshelf half buried in snow, icicles on its rim */
export function buriedShelf(v: number): Pix {
  const p = new Pix(44, 40);
  const wood = 0x3a2a20, dark = 0x22180f;
  p.rect(2, 4, 40, 32, wood).rect(4, 6, 36, 28, dark);
  for (let s = 0; s < 2; s++) {
    const y = 7 + s * 13;
    p.rect(4, y + 11, 36, 2, wood);
    for (let x = 5; x < 39; x += 3) {
      const h = 8 + Math.floor(noise2(x, s, v + 3) * 3);
      p.rect(x, y + 11 - h, 2, h, shade([0x5a3a2a, 0x3a4a5a, 0x5a5030][Math.floor(noise2(x, s, v) * 3)], 0.75));
    }
  }
  // snow cap and the drift burying the bottom
  p.rect(1, 2, 42, 3, 0xf2f8ff);
  p.ellipse(22, 37, 23, 9, 0xdfeaf4);
  p.ellipse(18, 35, 14, 5, 0xf2f8ff);
  for (let x = 4; x < 40; x += 6) p.poly([[x, 5], [x + 2, 5], [x + 1, 9 + (x % 4)]], 0xcfeeff);
  p.outline(0x0a0d14);
  return p;
}

/** a stone pillar sheathed in ice */
export function frozenPillar(broken: boolean): Pix {
  const h = broken ? 46 : 66;
  const p = new Pix(28, h);
  const stone = 0x4a5468, hi = 0x6a7488;
  p.rect(3, h - 8, 22, 8, 0x3a4252).rect(7, 8, 14, h - 16, stone);
  for (let x = 9; x < 20; x += 3) p.line(x, 9, x, h - 9, hi);
  if (broken) p.poly([[7, 8], [11, 2], [14, 6], [18, 1], [21, 8]], stone);
  else p.rect(4, 2, 20, 7, hi);
  // the ice sheath
  p.poly([[5, 12], [9, 10], [9, h - 6], [4, h - 4]], 0xb8e4ff, 200);
  p.poly([[19, 14], [24, 18], [24, h - 5], [19, h - 7]], 0xcfeeff, 190);
  p.line(6, 14, 6, h - 8, 0xffffff);
  p.rect(2, 1, 24, 2, 0xf2f8ff);
  p.outline(0x0a0d14);
  return p;
}

/** a cluster of ice spikes jutting from the snow */
export function iceSpikes(v: number): Pix {
  const p = new Pix(30, 26);
  for (let k = 0; k < 4 + v; k++) {
    const x = 4 + noise2(k, v, 41) * 22, h = 10 + noise2(k, v, 42) * 14, w = 2 + noise2(k, v, 43) * 2;
    p.poly([[x - w, 25], [x, 25 - h], [x + w, 25]], blend(0x9fd8ff, 0xe6f8ff, noise2(k, v, 44)));
    p.line(x, 25 - h + 2, x - w * 0.5, 24, 0xffffff);
  }
  p.ellipse(15, 25, 13, 2, 0xdfeaf4);
  p.outline(0x1a2a3a);
  return p;
}

/** a closed book lying in the snow (closed and brown: never a Page Wraith) */
export function lostBook(v: number): Pix {
  const p = new Pix(12, 9);
  const col = [0x5a3a2a, 0x3a4a5a, 0x5a5030][v % 3];
  p.rect(1, 1, 10, 7, col).rect(1, 6, 10, 2, 0xb8ac90);
  p.line(1, 1, 1, 7, shade(col, 0.6));
  p.rect(3, 0, 8, 2, 0xf2f8ff);
  p.outline(0x0a0d14);
  return p;
}
