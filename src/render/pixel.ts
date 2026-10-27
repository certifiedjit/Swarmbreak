/**
 * Tiny software pixel canvas used to draw all the game's art in code.
 * Colours are 0xRRGGBB numbers; alpha is 0..255.
 */
export class Pix {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, c: number, a = 255): this {
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return this;
    const i = (y * this.w + x) * 4;
    if (a >= 255 || this.data[i + 3] === 0) {
      this.data[i] = (c >> 16) & 255;
      this.data[i + 1] = (c >> 8) & 255;
      this.data[i + 2] = c & 255;
      this.data[i + 3] = a;
      return this;
    }
    // alpha-over
    const t = a / 255;
    this.data[i] = this.data[i] * (1 - t) + ((c >> 16) & 255) * t;
    this.data[i + 1] = this.data[i + 1] * (1 - t) + ((c >> 8) & 255) * t;
    this.data[i + 2] = this.data[i + 2] * (1 - t) + (c & 255) * t;
    this.data[i + 3] = Math.min(255, this.data[i + 3] + a * (1 - this.data[i + 3] / 255));
    return this;
  }

  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  get(x: number, y: number): number {
    const i = (y * this.w + x) * 4;
    return (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
  }

  clearPx(x: number, y: number): void {
    if (!this.inside(x, y)) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: number, a = 255): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
    return this;
  }

  /** filled ellipse centred at (cx, cy) */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a = 255): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
    }
    return this;
  }

  circle(cx: number, cy: number, r: number, c: number, a = 255): this {
    return this.ellipse(cx, cy, r, r, c, a);
  }

  ring(cx: number, cy: number, r: number, thickness: number, c: number, a = 255): this {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d >= r - thickness) this.set(x, y, c, a);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number, a = 255): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** polygon fill (even-odd scanline) */
  poly(pts: [number, number][], c: number, a = 255): this {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c, a);
    }
    return this;
  }

  /** 1px outline around all opaque pixels (4-neighbourhood) */
  outline(c: number, threshold = 40): this {
    const mark: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > threshold) continue;
        if (this.alpha(x - 1, y) > threshold || this.alpha(x + 1, y) > threshold || this.alpha(x, y - 1) > threshold || this.alpha(x, y + 1) > threshold) mark.push(x, y);
      }
    }
    for (let i = 0; i < mark.length; i += 2) this.set(mark[i], mark[i + 1], c);
    return this;
  }

  /** lighten opaque pixels whose neighbour in (dx, dy) is empty or outline-dark: a rim light */
  rim(c: number, dx: number, dy: number, amount = 0.45, outlineColor = -1): this {
    const hits: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) < 200) continue;
        if (outlineColor >= 0 && this.get(x, y) === outlineColor) continue;
        const nx = x + dx, ny = y + dy;
        const empty = this.alpha(nx, ny) < 40 || (outlineColor >= 0 && this.get(nx, ny) === outlineColor);
        if (empty) hits.push(x, y);
      }
    }
    for (let i = 0; i < hits.length; i += 2) {
      const x = hits[i], y = hits[i + 1];
      const k = (y * this.w + x) * 4;
      this.data[k] += (((c >> 16) & 255) - this.data[k]) * amount;
      this.data[k + 1] += (((c >> 8) & 255) - this.data[k + 1]) * amount;
      this.data[k + 2] += ((c & 255) - this.data[k + 2]) * amount;
    }
    return this;
  }

  /** copy with every opaque pixel replaced by one colour (hit flash) */
  silhouette(c: number): Pix {
    const p = new Pix(this.w, this.h);
    for (let i = 0; i < this.data.length; i += 4) {
      if (this.data[i + 3] === 0) continue;
      p.data[i] = (c >> 16) & 255;
      p.data[i + 1] = (c >> 8) & 255;
      p.data[i + 2] = c & 255;
      p.data[i + 3] = this.data[i + 3];
    }
    return p;
  }

  flipX(): Pix {
    const p = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const s = (y * this.w + x) * 4;
        const d = (y * this.w + (this.w - 1 - x)) * 4;
        p.data[d] = this.data[s];
        p.data[d + 1] = this.data[s + 1];
        p.data[d + 2] = this.data[s + 2];
        p.data[d + 3] = this.data[s + 3];
      }
    return p;
  }

  /** blit another Pix on top (alpha-over) */
  draw(src: Pix, ox: number, oy: number): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        const a = src.data[i + 3];
        if (a === 0) continue;
        this.set(ox + x, oy + y, (src.data[i] << 16) | (src.data[i + 1] << 8) | src.data[i + 2], a);
      }
    return this;
  }

  /** list of opaque pixel coordinates (used to spawn death embers from the sprite's shape) */
  opaquePoints(step = 1): [number, number, number][] {
    const out: [number, number, number][] = [];
    for (let y = 0; y < this.h; y += step)
      for (let x = 0; x < this.w; x += step) if (this.alpha(x, y) > 128) out.push([x, y, this.get(x, y)]);
    return out;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale;
    c.height = this.h * scale;
    const ctx = c.getContext('2d')!;
    const img = new ImageData(new Uint8ClampedArray(this.data), this.w, this.h);
    if (scale === 1) {
      ctx.putImageData(img, 0, 0);
      return c;
    }
    const tmp = document.createElement('canvas');
    tmp.width = this.w;
    tmp.height = this.h;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, c.width, c.height);
    return c;
  }

  toDataURL(scale = 1): string {
    return this.toCanvas(scale).toDataURL();
  }
}

/** multiply rgb by k (0..2) */
export function shade(c: number, k: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
}

/** blend a toward b */
export function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** deterministic tiny hash noise for texture details */
export function noise2(x: number, y: number, seed = 0): number {
  let n = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export const OUTLINE = 0x0a0910;
