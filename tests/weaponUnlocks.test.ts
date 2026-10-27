import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { ALL_WEAPON_IDS, STARTER_WEAPON_IDS, WEAPONS } from '../src/data/weapons';
import { Rng } from '../src/core/rng';
import { newBuild } from '../src/systems/build';
import { rollChestItem, rollLevelUpOffers, upgradePool } from '../src/systems/offers';
import { rollShop } from '../src/systems/shop';
import { LOCKED_WEAPON_IDS, WEAPON_UNLOCKS, buyWeapon, weaponPool } from '../src/systems/weaponUnlocks';

describe('weapon unlocks', () => {
  it('every non-starter weapon has a shard price', () => {
    for (const id of LOCKED_WEAPON_IDS) expect(WEAPON_UNLOCKS[id]?.shards, id).toBeGreaterThan(0);
    for (const id of Object.keys(WEAPON_UNLOCKS)) expect(WEAPONS[id], id).toBeDefined();
    expect(LOCKED_WEAPON_IDS.length + STARTER_WEAPON_IDS.length).toBe(ALL_WEAPON_IDS.length);
  });

  it('the pool is starters + the hero\'s own weapon + unlocks', () => {
    const p = weaponPool([], 'void_spirits');
    expect(p).toEqual(ALL_WEAPON_IDS.filter((id) => STARTER_WEAPON_IDS.includes(id) || id === 'void_spirits'));
    expect(weaponPool(['starfall'], 'oathblade')).toContain('starfall');
    expect(weaponPool([], 'oathblade', true)).toEqual(ALL_WEAPON_IDS);
    for (const c of Object.values(CHARACTERS)) expect(weaponPool([], c.startWeapon)).toContain(c.startWeapon);
  });

  it('buying costs shards once', () => {
    const owned: string[] = [];
    expect(buyWeapon(owned, 10, 'starfall')).toBeNull();
    expect(buyWeapon(owned, 150, 'starfall')).toBe(150 - WEAPON_UNLOCKS.starfall.shards);
    expect(owned).toEqual(['starfall']);
    expect(buyWeapon(owned, 999, 'starfall')).toBeNull();
    expect(buyWeapon(owned, 999, 'oathblade')).toBeNull();
  });

  it('locked weapons never appear in level-ups, chests or the shop', () => {
    const pool = weaponPool([], 'oathblade');
    const rng = new Rng(3);
    for (let i = 0; i < 300; i++) {
      const b = newBuild('warden');
      for (const o of rollLevelUpOffers(rng, b, 0, 3, pool)) if (o.kind === 'newWeapon') expect(pool).toContain(o.id);
      const c = rollChestItem(rng, b, 1, pool);
      if (c.kind === 'newWeapon') expect(pool).toContain(c.id);
      for (const s of rollShop(rng, b, 0, 0, 1, pool)) if (s.offer?.kind === 'newWeapon') expect(pool).toContain(s.offer.id);
    }
    expect(upgradePool(newBuild('warden'), pool).filter((o) => o.kind === 'newWeapon').every((o) => pool.includes(o.id))).toBe(true);
  });
});
