/**
 * XP needed to go from `level` to `level + 1`. The first few levels come
 * quickly, then the curve steepens so a full chapter is roughly 28-32 levels
 * (a pick every ~15s early, 40s+ late) and you spend your time fighting.
 */
export function xpToNext(level: number): number {
  const l = Math.max(1, level) - 1;
  return Math.round(8 + l * 9 + 2.8 * l * l);
}

/** true when a level-up has nothing to choose (build maxed): it resolves without pausing */
export function isFillerOnly(kinds: readonly string[]): boolean {
  return kinds.length > 0 && kinds.every((k) => k === 'heal' || k === 'coins');
}

/** XP gem tiers by value. */
export function gemTier(value: number): 0 | 1 | 2 | 3 {
  if (value >= 40) return 3;
  if (value >= 10) return 2;
  if (value >= 3) return 1;
  return 0;
}
