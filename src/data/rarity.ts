export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
export type RarityIndex = 0 | 1 | 2 | 3 | 4;

export const RARITY_INFO: Record<Rarity, { label: string; color: number; css: string; mult: number }> = {
  common: { label: 'Common', color: 0xc3ccd6, css: '#c3ccd6', mult: 1.0 },
  uncommon: { label: 'Uncommon', color: 0x4fe38f, css: '#4fe38f', mult: 1.3 },
  rare: { label: 'Rare', color: 0x45a9ff, css: '#45a9ff', mult: 1.65 },
  epic: { label: 'Epic', color: 0xc46dff, css: '#c46dff', mult: 2.1 },
  legendary: { label: 'Legendary', color: 0xffb330, css: '#ffb330', mult: 2.8 },
};

/** Base odds (relative weights) for level-up cards. */
export const LEVELUP_WEIGHTS: readonly number[] = [62, 24, 10, 3.4, 0.6];
/** Base odds (relative weights) for chests. Chests are a bit juicier than level-ups. */
export const CHEST_WEIGHTS: readonly number[] = [50, 28, 14, 6, 2];

/**
 * Luck shifts weight from Common toward rarer tiers. Rarer tiers benefit more.
 * luck is a fraction: 0.25 = +25% luck.
 */
export function luckAdjustedWeights(base: readonly number[], luck: number): number[] {
  const l = Math.max(-0.9, luck);
  return base.map((w, i) => (i === 0 ? w : w * Math.pow(1 + l, 0.6 + i * 0.45)));
}

export function normalize(weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  return weights.map((w) => (total > 0 ? Math.max(0, w) / total : 0));
}

export function rarityOf(i: number): Rarity {
  return RARITIES[Math.max(0, Math.min(4, i))];
}
