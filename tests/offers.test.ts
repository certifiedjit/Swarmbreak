import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { CHEST_WEIGHTS, LEVELUP_WEIGHTS, luckAdjustedWeights, normalize } from '../src/data/rarity';
import { MAX_WEAPONS, newBuild } from '../src/systems/build';
import { BASE_PASSIVE_IDS } from '../src/data/passives';
import { BASE_WEAPON_IDS } from '../src/data/weapons';
import {
  PITY_THRESHOLD,
  applyOffer,
  chestOdds,
  chestPrice,
  describeOffer,
  newChestState,
  rarityOdds,
  rollChestItem,
  rollChestRarity,
  rollLevelUpOffers,
  rollRarity,
} from '../src/systems/offers';

describe('Level-up rarity rolls', () => {
  it('matches the configured odds over many rolls', () => {
    const rng = new Rng(1234);
    const counts = [0, 0, 0, 0, 0];
    const N = 200_000;
    for (let i = 0; i < N; i++) counts[rollRarity(rng, LEVELUP_WEIGHTS, 0)]++;
    const expected = normalize(LEVELUP_WEIGHTS);
    counts.forEach((c, i) => expect(c / N).toBeCloseTo(expected[i], 2));
  });

  it('luck makes rarer cards more likely, and helps the rarest the most', () => {
    const base = rarityOdds(LEVELUP_WEIGHTS, 0);
    const lucky = rarityOdds(LEVELUP_WEIGHTS, 1);
    expect(lucky[0]).toBeLessThan(base[0]);
    for (let i = 1; i < 5; i++) expect(lucky[i]).toBeGreaterThan(base[i]);
    expect(lucky[4] / base[4]).toBeGreaterThan(lucky[1] / base[1]);
  });

  it('luck weights stay positive for negative luck', () => {
    for (const w of luckAdjustedWeights(LEVELUP_WEIGHTS, -0.5)) expect(w).toBeGreaterThan(0);
  });

  it('offers 3 distinct cards', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 200; i++) {
      const b = newBuild('warden');
      const offers = rollLevelUpOffers(rng, b, 0);
      expect(offers).toHaveLength(3);
      const keys = offers.map((o) => o.kind + o.id);
      expect(new Set(keys).size).toBe(3);
    }
  });

  it('never offers banished items', () => {
    const rng = new Rng(99);
    const b = newBuild('warden');
    b.banished.push('rune_halo', 'star_lens', 'oathblade');
    for (let i = 0; i < 300; i++) {
      for (const o of rollLevelUpOffers(rng, b, 0)) expect(['rune_halo', 'star_lens', 'oathblade']).not.toContain(o.id);
    }
  });

  it('stops offering new weapons once slots are full', () => {
    const rng = new Rng(3);
    const b = newBuild('warden');
    for (const id of ['rune_halo', 'arc_chain', 'gravemaul', 'plasma_glaive', 'seeker_swarm', 'searing_mantle'].slice(0, MAX_WEAPONS - 1)) applyOffer(b, { kind: 'newWeapon', id, rarity: 0 });
    expect(b.weapons).toHaveLength(MAX_WEAPONS);
    for (let i = 0; i < 300; i++) for (const o of rollLevelUpOffers(rng, b, 0)) expect(o.kind).not.toBe('newWeapon');
  });

  it('falls back to heal/coins when everything is maxed', () => {
    const rng = new Rng(5);
    const b = newBuild('warden');
    b.banished.push(...BASE_WEAPON_IDS, ...BASE_PASSIVE_IDS);
    const offers = rollLevelUpOffers(rng, b, 0);
    expect(offers.map((o) => o.kind).sort()).toEqual(['coins', 'heal']);
  });
});

describe('Chest odds and pity', () => {
  it('prices rise with every chest opened', () => {
    let prev = 0;
    for (let n = 0; n < 20; n++) {
      const p = chestPrice(n);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    expect(chestPrice(0)).toBe(20);
    expect(chestPrice(3, 0.7)).toBeLessThan(chestPrice(3));
  });

  it('shown odds sum to 1 and match the base weights with no luck', () => {
    const odds = chestOdds(newChestState(), 0);
    expect(odds.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    normalize(CHEST_WEIGHTS).forEach((p, i) => expect(odds[i]).toBeCloseTo(p, 10));
  });

  it(`after ${PITY_THRESHOLD} Commons in a row the next chest is Rare or better`, () => {
    const s = newChestState();
    s.commonStreak = PITY_THRESHOLD;
    const odds = chestOdds(s, 0);
    expect(odds[0]).toBe(0);
    expect(odds[1]).toBe(0);
    const rng = new Rng(42);
    for (let i = 0; i < 500; i++) {
      const st = newChestState();
      st.commonStreak = PITY_THRESHOLD;
      expect(rollChestRarity(rng, st, 0)).toBeGreaterThanOrEqual(2);
      expect(st.commonStreak).toBe(0);
    }
  });

  it('a long simulated run never sees more than the threshold of Commons in a row', () => {
    const rng = new Rng(2024);
    const s = newChestState();
    let streak = 0;
    let maxStreak = 0;
    for (let i = 0; i < 50_000; i++) {
      const r = rollChestRarity(rng, s, -0.5); // unlucky player = many commons
      streak = r === 0 ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
    }
    expect(maxStreak).toBe(PITY_THRESHOLD);
    expect(s.opened).toBe(50_000);
    expect(s.byRarity.reduce((a, b) => a + b, 0)).toBe(50_000);
  });

  it('uncommon breaks a common streak', () => {
    const s = newChestState();
    s.commonStreak = 2;
    const rng = new Rng(1);
    const r = rollChestRarity(rng, s, 0, 1);
    expect(r).toBeGreaterThanOrEqual(1);
    expect(s.commonStreak).toBe(0);
  });

  it('luck improves chest odds', () => {
    const a = chestOdds(newChestState(), 0);
    const b = chestOdds(newChestState(), 0.6);
    expect(b[4]).toBeGreaterThan(a[4]);
    expect(b[0]).toBeLessThan(a[0]);
  });

  it('chest items carry the rolled rarity', () => {
    const rng = new Rng(8);
    const b = newBuild('warden');
    for (let i = 0; i < 100; i++) {
      const item = rollChestItem(rng, b, 3);
      expect(item.rarity).toBe(3);
    }
  });
});

describe('Offer descriptions', () => {
  it('never crash on a stale upgrade for a maxed or missing weapon', () => {
    const b = newBuild('warden');
    for (let i = 0; i < 10; i++) applyOffer(b, { kind: 'weaponUp', id: 'oathblade', rarity: 0 });
    expect(() => describeOffer(b, { kind: 'weaponUp', id: 'oathblade', rarity: 2 })).not.toThrow();
    expect(() => describeOffer(b, { kind: 'weaponUp', id: 'rune_halo', rarity: 2 })).not.toThrow();
    for (let i = 0; i < 8; i++) applyOffer(b, { kind: 'passiveUp', id: 'star_lens', rarity: 0 });
    expect(() => describeOffer(b, { kind: 'passiveUp', id: 'star_lens', rarity: 1 })).not.toThrow();
  });
});
