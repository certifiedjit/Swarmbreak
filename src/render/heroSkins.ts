/**
 * Hero skins: palette recolours (Emberforged, Frostbound) and the Spectral
 * special, a translucent ghost pass over the hero's own frames.
 */
import type { SkinStyle } from '../data/cosmetics';
import type { HeroPalette } from './heroArt';
import { Pix } from './pixel';

function toHsl(c: number): [number, number, number] {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): number {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

/** move a colour to a new hue, keeping its lightness; `sat` scales saturation, `lift` brightens */
function rehue(c: number, hue: number, sat: number, lift = 0): number {
  const [, s, l] = toHsl(c);
  return fromHsl(hue, Math.min(1, Math.max(0.12, s) * sat), Math.min(0.95, l + lift));
}

const KEYS: (keyof HeroPalette)[] = ['armorDark', 'armorMid', 'armorLight', 'armorHi', 'clothDark', 'clothMid', 'glow', 'shieldFace', 'shieldRim', 'bladeCore'];

/** `fireHued` heroes are red already, so their 'ember' skin burns green instead (Witchfire) */
export function skinPalette(base: HeroPalette, style: SkinStyle, fireHued = false): HeroPalette {
  if (style === 'ember' && fireHued) {
    const out = { ...base };
    for (const k of KEYS) out[k] = rehue(base[k], 0.36, 1.1);
    out.glow = 0x7dff6a;
    out.bladeCore = 0xeaffd0;
    return out;
  }
  if (style === 'ember') {
    const out = { ...base };
    for (const k of KEYS) out[k] = rehue(base[k], 0.02, 1.4);
    out.glow = 0xff6a2a;
    out.bladeCore = 0xfff0c0;
    return out;
  }
  if (style === 'frost') {
    const out = { ...base };
    for (const k of KEYS) out[k] = rehue(base[k], 0.56, 0.8, 0.12);
    out.glow = 0x9ff0ff;
    out.bladeCore = 0xffffff;
    return out;
  }
  return base;
}

/** the Spectral special: a pale, see-through ghost with a bright rim */
export function spectral(src: Pix): Pix {
  const p = new Pix(src.w, src.h);
  for (let i = 0; i < src.data.length; i += 4) {
    const a = src.data[i + 3];
    if (!a) continue;
    const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
    const lum = (r * 0.3 + g * 0.55 + b * 0.15) / 255;
    const outline = lum < 0.08;
    p.data[i] = outline ? 40 : Math.round(150 + 105 * lum);
    p.data[i + 1] = outline ? 70 : Math.round(200 + 55 * lum);
    p.data[i + 2] = outline ? 110 : 255;
    p.data[i + 3] = outline ? 200 : Math.round(110 + 120 * lum);
  }
  return p;
}
