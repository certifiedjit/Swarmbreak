/**
 * The Salvage Drone's shop: shows up during breathers (and at Endless
 * milestones). Pure logic for what it sells and what it costs.
 */
import type { Rng } from '../core/rng';
import type { RarityIndex } from '../data/rarity';
import type { Build } from './build';
import { rollLevelUpOffers, type Offer } from './offers';

export type ShopKind = 'upgrade' | 'heal' | 'rerolls' | 'cache';

export interface ShopItem {
  kind: ShopKind;
  price: number;
  /** the upgrade on sale (kind 'upgrade') */
  offer?: Offer;
  sold: boolean;
}

/** base prices before the round scale */
export const SHOP_BASE = {
  upgrade: [40, 50, 70, 120, 210] as const,
  heal: 35,
  rerolls: 45,
  cache: 150,
};

/** later rounds cost more (tier 0 = the first breather) */
export function shopScale(tier: number, priceMult = 1): number {
  return (1 + 0.55 * Math.max(0, tier)) * priceMult;
}

export function shopPrice(base: number, tier: number, priceMult = 1): number {
  return Math.max(1, Math.round(base * shopScale(tier, priceMult)));
}

/**
 * Roll the drone's stock: two upgrades for your current build (always Rare
 * or better), a full heal, a reroll pack and a sealed Epic-or-better cache.
 */
export function rollShop(rng: Rng, build: Build, luck: number, tier: number, priceMult = 1, unlockedWeapons?: readonly string[]): ShopItem[] {
  const items: ShopItem[] = [];
  const ups = rollLevelUpOffers(rng, build, luck, 2, unlockedWeapons).filter((o) => o.kind !== 'heal' && o.kind !== 'coins');
  ups.forEach((o, i) => {
    // the first is at least Rare, the second at least Epic
    const min = (i === 0 ? 2 : 3) as RarityIndex;
    const rarity = (o.kind === 'evolution' ? 4 : Math.max(o.rarity, min)) as RarityIndex;
    const offer: Offer = { ...o, rarity };
    items.push({ kind: 'upgrade', offer, price: shopPrice(SHOP_BASE.upgrade[rarity], tier, priceMult), sold: false });
  });
  items.push({ kind: 'heal', price: shopPrice(SHOP_BASE.heal, tier, priceMult), sold: false });
  items.push({ kind: 'rerolls', price: shopPrice(SHOP_BASE.rerolls, tier, priceMult), sold: false });
  items.push({ kind: 'cache', price: shopPrice(SHOP_BASE.cache, tier, priceMult), sold: false });
  return items;
}
