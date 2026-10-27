import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { newBuild, buildStats } from '../src/systems/build';
import {
  cacheTierWeights,
  rollCacheShards,
  ARMORY,
  SKILL_TREES,
  addMasteryXp,
  armoryBonus,
  armoryCost,
  availablePoints,
  buyArmory,
  canRankUp,
  masteryBonus,
  masteryXpToNext,
  newMastery,
  rankUp,
  refundAll,
  runMasteryXp,
  shardsForRun,
} from '../src/systems/mastery';
import { rollShop, shopPrice } from '../src/systems/shop';

const tree = SKILL_TREES.warden;

describe('Mastery levels', () => {
  it('rolls XP over into levels, one skill point per level', () => {
    const m = newMastery();
    const gained = addMasteryXp(m, masteryXpToNext(1) + masteryXpToNext(2) + 10);
    expect(gained).toBe(2);
    expect(m.level).toBe(3);
    expect(m.xp).toBe(10);
    expect(availablePoints(m, tree)).toBe(2);
  });

  it('a chapter clear is worth a few levels; an early death still earns something', () => {
    const clear = runMasteryXp(23000, true);
    const m = newMastery();
    addMasteryXp(m, clear);
    expect(m.level).toBeGreaterThanOrEqual(4);
    expect(runMasteryXp(1500, false)).toBeGreaterThan(0);
  });
});

describe('Skill tree', () => {
  it('needs points, respects max rank and prerequisites', () => {
    const m = newMastery();
    expect(canRankUp(m, tree, 'iron_hide')).toBe(false); // no points yet
    m.level = 10; // 9 points
    expect(canRankUp(m, tree, 'runed_plates')).toBe(false); // needs Iron Hide 2
    expect(rankUp(m, tree, 'iron_hide')).toBe(true);
    expect(rankUp(m, tree, 'iron_hide')).toBe(true);
    expect(rankUp(m, tree, 'runed_plates')).toBe(true);
    expect(availablePoints(m, tree)).toBe(6);
    for (let i = 0; i < 10; i++) rankUp(m, tree, 'iron_hide');
    expect(m.ranks.iron_hide).toBe(5);
  });

  it('refunds are free and give every point back', () => {
    const m = newMastery();
    m.level = 6;
    rankUp(m, tree, 'keen_edge');
    rankUp(m, tree, 'keen_edge');
    expect(availablePoints(m, tree)).toBe(3);
    refundAll(m);
    expect(availablePoints(m, tree)).toBe(5);
  });

  it('spent ranks turn into stat mods and run perks', () => {
    const m = newMastery();
    m.level = 30;
    rankUp(m, tree, 'iron_hide');
    rankUp(m, tree, 'iron_hide');
    for (const id of ['long_reach', 'scholar', 'prospector', 'prospector']) rankUp(m, tree, id);
    rankUp(m, tree, 'gambler');
    const bonus = masteryBonus(m, tree);
    const base = buildStats(newBuild('warden'));
    const withTree = buildStats(newBuild('warden'), 1, bonus.mods);
    expect(withTree.maxHp - base.maxHp).toBeCloseTo(24);
    expect(bonus.startCoins).toBe(80);
    expect(bonus.rerolls).toBe(1);
    expect(bonus.banishes).toBe(1);
  });
});

describe('Star Shards and the Armory', () => {
  it('leftover coins convert into shards, plus kills and a clear bonus', () => {
    expect(shardsForRun({ coinsLeft: 500, kills: 4000, won: true })).toBe(50 + 20 + 20);
    expect(shardsForRun({ coinsLeft: 0, kills: 0, won: false })).toBe(0);
  });

  it('each rank costs more, and you cannot overspend or exceed max rank', () => {
    const ranks: Record<string, number> = {};
    const it0 = ARMORY.find((a) => a.id === 'skip')!;
    let shards = armoryCost(it0, 0) + armoryCost(it0, 1) + 5;
    shards = buyArmory(ranks, shards, 'skip')!;
    shards = buyArmory(ranks, shards, 'skip')!;
    expect(ranks.skip).toBe(2);
    expect(shards).toBe(5);
    expect(buyArmory(ranks, 9999, 'skip')).toBeNull(); // maxed
    expect(buyArmory({}, 1, 'might')).toBeNull(); // too poor
  });

  it('haggling discounts prices', () => {
    expect(armoryBonus({ haggler: 2 }).priceMult).toBeCloseTo(0.84);
  });
});

describe('Salvage shop', () => {
  it('sells upgrades that are at least Rare, plus heal, rerolls and a cache', () => {
    const items = rollShop(new Rng(4), newBuild('warden'), 0, 0);
    const kinds = items.map((i) => i.kind);
    expect(kinds).toContain('heal');
    expect(kinds).toContain('rerolls');
    expect(kinds).toContain('cache');
    for (const i of items.filter((x) => x.kind === 'upgrade')) expect(i.offer!.rarity).toBeGreaterThanOrEqual(2);
  });

  it('prices rise with each breather and drop with discounts', () => {
    expect(shopPrice(100, 3)).toBeGreaterThan(shopPrice(100, 0));
    expect(shopPrice(100, 1, 0.8)).toBeLessThan(shopPrice(100, 1));
  });
});

describe('Victory Cache shard roll', () => {
  it('usually pays the base, rarely the jackpot', () => {
    expect(rollCacheShards(0, 20)).toEqual({ shards: 20, tier: 0 });
    expect(rollCacheShards(0.999, 20)).toEqual({ shards: 200, tier: 3 });
    let jackpots = 0, total = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const r = rollCacheShards((i + 0.5) / N, 10);
      total += r.shards;
      if (r.tier === 3) jackpots++;
    }
    expect(jackpots / N).toBeCloseTo(0.03, 2);
    expect(total / N / 10).toBeGreaterThan(1.5); // the average beats a flat payout
    expect(total / N / 10).toBeLessThan(2.2);
  });

  it('luck makes the rare tiers more likely', () => {
    const w0 = cacheTierWeights(0), w1 = cacheTierWeights(2);
    const share = (w: number[]) => w[3] / w.reduce((a, b) => a + b, 0);
    expect(share(w1)).toBeGreaterThan(share(w0));
  });
});
