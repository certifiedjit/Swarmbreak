/**
 * Map art for the Starship Graveyard: a dark deck-plate floor, wrecked hull
 * pieces, debris and emergency lamps. Cold blue + rust.
 */
import { Pix, noise2, shade, blend } from './pixel';

export function graveyardFloor(seed = 1): Pix {
  const S = 256;
  const p = new Pix(S, S);
  const base = 0x0e121b;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const px = Math.floor(x / 32), py = Math.floor(y / 32);
      const plateTone = 0.85 + noise2(px, py, seed) * 0.3;
      const fine = 0.94 + noise2(x, y, seed + 7) * 0.12;
      p.set(x, y, shade(base, plateTone * fine));
    }
  // plate seams + rivets
  for (let i = 0; i < S; i += 32) {
    for (let k = 0; k < S; k++) {
      p.set(i, k, 0x080a10);
      p.set(k, i, 0x080a10);
      p.set(i + 1, k, 0x161c28);
      p.set(k, i + 1, 0x161c28);
    }
  }
  for (let y = 0; y < S; y += 32)
    for (let x = 0; x < S; x += 32) {
      for (const [dx, dy] of [[4, 4], [27, 4], [4, 27], [27, 27]]) p.set(x + dx, y + dy, 0x232b3c);
      // occasional grate plate
      if (noise2(x, y, seed + 3) > 0.82) for (let g = 6; g < 28; g += 3) p.rect(x + 6, y + g, 20, 1, 0x070910);
      // occasional faint blue light strip
      if (noise2(x, y, seed + 11) > 0.9) p.rect(x + 3, y + 15, 26, 1, 0x1b3b55);
    }
  // rust blotches
  for (let i = 0; i < 14; i++) {
    const cx = noise2(i, 1, seed) * S, cy = noise2(i, 2, seed) * S;
    const r = 3 + noise2(i, 3, seed) * 8;
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        if (noise2(Math.round(cx + x), Math.round(cy + y), seed + 5) > 0.45) continue;
        const X = ((Math.round(cx + x) % S) + S) % S, Y = ((Math.round(cy + y) % S) + S) % S;
        p.set(X, Y, blend(p.get(X, Y), 0x2a1a16, 0.35));
      }
  }
  // scratches
  for (let i = 0; i < 18; i++) {
    const x = noise2(i, 4, seed) * S, y = noise2(i, 5, seed) * S;
    const l = 6 + noise2(i, 6, seed) * 18;
    const a = noise2(i, 7, seed) * Math.PI;
    p.line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0x1c2433);
  }
  return p;
}

/** A broken hull section. variant changes shape. */
export function wreck(variant: number): Pix {
  const sizes = [
    [150, 70],
    [110, 96],
    [190, 64],
    [80, 60],
  ];
  const [w, h] = sizes[variant % sizes.length];
  const p = new Pix(w, h);
  const hull = 0x1a1f2b, hullHi = 0x262d3d, dark = 0x0c0e14, rust = 0x3a2219;
  // irregular silhouette: top edge broken
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * (w - 4) + 2;
    const y = h * 0.18 + noise2(i, variant, 31) * h * 0.3;
    pts.push([x, y]);
  }
  pts.push([w - 2, h - 6], [w * 0.7, h - 2], [w * 0.3, h - 3], [2, h - 6]);
  p.poly(pts, hull);
  // ribs
  for (let x = 8; x < w - 6; x += 14) p.line(x, h * 0.3, x + 2, h - 6, dark);
  // highlight strip
  for (let i = 0; i < n; i++) p.line(pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, hullHi);
  // windows (some lit)
  for (let i = 0; i < Math.floor(w / 18); i++) {
    const x = 10 + i * 16;
    const y = Math.floor(h * 0.55);
    const lit = noise2(i, variant, 77) > 0.72;
    p.rect(x, y, 5, 3, lit ? (noise2(i, variant, 5) > 0.5 ? 0x5cc8ff : 0xffa53d) : 0x07080c);
  }
  // rust streaks
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(noise2(i, variant, 2) * w);
    const y0 = Math.floor(h * 0.3 + noise2(i, variant, 3) * h * 0.5);
    const l = 2 + Math.floor(noise2(i, variant, 4) * 8);
    for (let k = 0; k < l; k++) if (p.alpha(x, y0 + k) > 0) p.set(x, y0 + k, blend(p.get(x, y0 + k), rust, 0.6));
  }
  // holes
  for (let i = 0; i < 3; i++) {
    const cx = 12 + noise2(i, variant, 9) * (w - 24);
    const cy = h * 0.45 + noise2(i, variant, 10) * h * 0.3;
    p.ellipse(cx, cy, 4 + noise2(i, variant, 11) * 6, 3 + noise2(i, variant, 12) * 4, dark);
  }
  p.outline(0x05060a);
  return p;
}

export function debris(variant: number): Pix {
  const p = new Pix(22, 16);
  const c = [0x1d2230, 0x2a1d18, 0x232836, 0x1a1a22][variant % 4];
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 4 + noise2(i, variant, 13) * 6;
    pts.push([11 + Math.cos(a) * r, 8 + Math.sin(a) * r * 0.6]);
  }
  p.poly(pts, c);
  p.line(pts[0][0], pts[0][1], pts[3][0], pts[3][1], shade(c, 1.5));
  p.outline(0x05060a);
  return p;
}

export function lamp(color: number): Pix {
  const p = new Pix(6, 6);
  p.rect(1, 2, 4, 3, 0x1b1f28);
  p.rect(2, 1, 2, 3, color);
  p.set(2, 1, 0xffffff);
  p.outline(0x05060a);
  return p;
}

export function girder(): Pix {
  const p = new Pix(72, 12);
  p.rect(0, 2, 72, 2, 0x232836).rect(0, 8, 72, 2, 0x232836);
  for (let x = 0; x < 70; x += 8) {
    p.line(x, 3, x + 8, 9, 0x1b1f28);
    p.line(x + 8, 3, x, 9, 0x1b1f28);
  }
  p.outline(0x05060a);
  return p;
}
