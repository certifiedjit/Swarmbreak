import { describe, expect, it } from 'vitest';
import { isFillerOnly, xpToNext } from '../src/systems/xp';

describe('Level pacing', () => {
  it('early levels are quick and the curve keeps rising', () => {
    expect(xpToNext(1)).toBeLessThan(12);
    for (let l = 1; l < 60; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
  });
  it('a chapter worth of XP (~23k) buys roughly 30 levels, not 50+', () => {
    let xp = 23000, level = 1;
    while (xp >= xpToNext(level)) xp -= xpToNext(level++);
    expect(level).toBeGreaterThanOrEqual(26);
    expect(level).toBeLessThanOrEqual(34);
  });
  it('maxed-build level-ups (only heal/coins) skip the pause', () => {
    expect(isFillerOnly(['heal', 'coins'])).toBe(true);
    expect(isFillerOnly(['heal', 'weaponUp'])).toBe(false);
    expect(isFillerOnly([])).toBe(false);
  });
});
