/**
 * Small, fast, seedable PRNG (mulberry32). Everything that should be
 * reproducible for seeded runs (spawns, chest rolls, level-up offers)
 * goes through an Rng instance instead of Math.random.
 */
export class Rng {
  private s: number;

  constructor(seed: number = Date.now()) {
    this.s = seed >>> 0;
  }

  get state(): number {
    return this.s;
  }

  /** float in [0, 1) */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** float in [a, b) */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** integer in [a, b] inclusive */
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** index chosen proportionally to weights (weights <= 0 never chosen) */
  weighted(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) if (w > 0) total += w;
    if (total <= 0) return 0;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      if (w <= 0) continue;
      if (r < w) return i;
      r -= w;
    }
    return weights.length - 1;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** derive an independent child stream (so e.g. chest rolls don't shift when spawns change) */
  fork(salt: number): Rng {
    return new Rng(hash32(this.s ^ Math.imul(salt + 1, 0x9e3779b1)));
  }
}

export function hash32(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return (n ^ (n >>> 16)) >>> 0;
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return hash32(h);
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** short human-friendly seed code, e.g. "VX7Q-2KDM" */
export function seedToCode(seed: number): string {
  let s = seed >>> 0;
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += SEED_ALPHABET[s % 32];
    s = Math.floor(s / 32);
    if (i === 3) out += '-';
  }
  return out;
}

export function codeToSeed(code: string): number | null {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 8) return null;
  let s = 0;
  for (let i = 7; i >= 0; i--) {
    const v = SEED_ALPHABET.indexOf(clean[i]);
    if (v < 0) return null;
    s = s * 32 + v;
  }
  return s >>> 0;
}
