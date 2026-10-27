import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { CHARACTERS } from '../src/data/characters';
import { RARITY_INFO } from '../src/data/rarity';
import { PASSIVES } from '../src/data/passives';
import { BASE_WEAPON_IDS, WEAPONS, WEAPON_MAX_LEVEL } from '../src/data/weapons';
import {
  addOrLevelPassive,
  addRelic,
  allEvolutionRecipes,
  applyWeaponDelta,
  buildStats,
  computeStats,
  eligibleEvolutions,
  evolveWeapon,
  GROWTH_PER_LEVEL,
  levelGrowthMods,
  levelWeapon,
  newBuild,
} from '../src/systems/build';
import { applyOffer, rollChestItem, rollLevelUpOffers } from '../src/systems/offers';

const warden = CHARACTERS.warden.stats;

describe('Stat stacking', () => {
  it('adds flat values, then applies percent multipliers', () => {
    const s = computeStats(warden, [
      { stat: 'maxHp', add: 20 },
      { stat: 'maxHp', add: 10 },
      { stat: 'maxHp', pct: 0.1 },
      { stat: 'maxHp', pct: 0.1 },
    ]);
    expect(s.maxHp).toBeCloseTo((warden.maxHp + 30) * 1.2);
  });

  it('clamps to caps', () => {
    const s = computeStats(warden, [
      { stat: 'dodge', add: 5 },
      { stat: 'critChance', add: 3 },
      { stat: 'attackSpeed', add: -10 },
    ]);
    expect(s.dodge).toBe(0.6);
    expect(s.critChance).toBe(1);
    expect(s.attackSpeed).toBe(0.25);
  });

  it('passive levels stack (5 levels of boots = +40% move speed at Common)', () => {
    const b = newBuild('warden');
    for (let i = 0; i < 5; i++) addOrLevelPassive(b, 'void_boots', 0);
    expect(buildStats(b).moveSpeed).toBeCloseTo(1.4);
    addOrLevelPassive(b, 'void_boots', 4); // already max: no effect
    expect(buildStats(b).moveSpeed).toBeCloseTo(1.4);
  });

  it('rarer cards give bigger boosts', () => {
    const a = newBuild('warden');
    const b = newBuild('warden');
    addOrLevelPassive(a, 'star_lens', 0);
    addOrLevelPassive(b, 'star_lens', 4);
    expect(buildStats(b).area - 1).toBeCloseTo((buildStats(a).area - 1) * RARITY_INFO.legendary.mult);
  });

  it('whole-number stats are not scaled by rarity, but get a rarity bonus', () => {
    const a = newBuild('warden');
    const b = newBuild('warden');
    addOrLevelPassive(a, 'twin_capacitor', 0);
    addOrLevelPassive(b, 'twin_capacitor', 3);
    expect(buildStats(a).projectiles).toBe(1);
    expect(buildStats(b).projectiles).toBe(1);
    expect(buildStats(b).damage).toBeGreaterThan(buildStats(a).damage);
  });

  it('relics and passives combine', () => {
    const b = newBuild('warden');
    addRelic(b, 'ember_shard', 0);
    addRelic(b, 'ember_shard', 0);
    addOrLevelPassive(b, 'twin_capacitor', 0);
    addOrLevelPassive(b, 'twin_capacitor', 0); // L2: +5% damage
    expect(buildStats(b).damage).toBeCloseTo(warden.damage + 0.06 * 2 + 0.05);
    expect(b.relicCounts.ember_shard).toBe(2);
  });

  it("Warden's thorns grow with armour", () => {
    const b = newBuild('warden');
    const before = buildStats(b).thorns;
    addOrLevelPassive(b, 'runeplate', 0);
    expect(buildStats(b).thorns).toBeCloseTo(before + 2);
  });

  it('weapon level steps accumulate, scaled by rarity', () => {
    const def = WEAPONS.gravemaul;
    const common = applyWeaponDelta(def.base, { damage: 10 }, 0, def.base.damage);
    const epic = applyWeaponDelta(def.base, { damage: 10 }, 3, def.base.damage);
    expect(common.damage).toBe(def.base.damage + 10);
    expect(epic.damage).toBeCloseTo(def.base.damage + 10 * RARITY_INFO.epic.mult);
    const cd = applyWeaponDelta(def.base, { cooldownPct: 0.15 }, 0, def.base.damage);
    expect(cd.cooldown).toBeCloseTo(def.base.cooldown * 0.85);
    const amt = applyWeaponDelta(def.base, { amount: 1 }, 2, def.base.damage);
    expect(amt.amount).toBe(def.base.amount + 1);
    expect(amt.damage).toBeCloseTo(def.base.damage * 1.2);
  });
});

describe('Weapon evolutions', () => {
  it('every base weapon has a recipe pointing at a real evolved weapon and passive', () => {
    const recipes = allEvolutionRecipes();
    expect(recipes.length).toBe(BASE_WEAPON_IDS.length);
    for (const r of recipes) {
      expect(WEAPONS[r.into].evolved).toBe(true);
      expect(WEAPONS[r.weapon].evolved).toBeFalsy();
      expect(PASSIVES[r.passive]).toBeDefined();
    }
    // each passive unlocks at most one evolution, so builds don't collide
    const passives = recipes.map((r) => r.passive);
    expect(new Set(passives).size).toBe(passives.length);
  });

  it('requires max level AND the matching passive', () => {
    const b = newBuild('warden'); // starts with oathblade (evolves with runeplate)
    expect(eligibleEvolutions(b)).toEqual([]);
    for (let i = 1; i < WEAPON_MAX_LEVEL; i++) levelWeapon(b, 'oathblade', 0);
    expect(b.weapons[0].level).toBe(WEAPON_MAX_LEVEL);
    expect(eligibleEvolutions(b)).toEqual([]); // no passive yet
    addOrLevelPassive(b, 'star_lens', 0); // wrong passive
    expect(eligibleEvolutions(b)).toEqual([]);
    addOrLevelPassive(b, 'runeplate', 0);
    expect(eligibleEvolutions(b)).toEqual([{ weapon: 'oathblade', passive: 'runeplate', into: 'oathbreaker' }]);
  });

  it('evolving replaces the weapon in its slot', () => {
    const b = newBuild('warden');
    for (let i = 1; i < WEAPON_MAX_LEVEL; i++) levelWeapon(b, 'oathblade', 0);
    addOrLevelPassive(b, 'runeplate', 0);
    const w = evolveWeapon(b, 'oathblade');
    expect(w?.id).toBe('oathbreaker');
    expect(b.weapons.map((x) => x.id)).toEqual(['oathbreaker']);
    expect(eligibleEvolutions(b)).toEqual([]);
    expect(evolveWeapon(b, 'oathblade')).toBeNull();
  });

  it('is always offered on level-up and always wins a chest once ready', () => {
    const b = newBuild('warden');
    for (let i = 1; i < WEAPON_MAX_LEVEL; i++) levelWeapon(b, 'oathblade', 0);
    addOrLevelPassive(b, 'runeplate', 0);
    const rng = new Rng(11);
    const offers = rollLevelUpOffers(rng, b, 0);
    expect(offers[0]).toEqual({ kind: 'evolution', id: 'oathblade', rarity: 4 });
    expect(rollChestItem(rng, b, 0).kind).toBe('evolution');
    const res = applyOffer(b, offers[0]);
    expect(res.evolvedInto).toBe('oathbreaker');
  });

  it('an evolved weapon is never offered again as a new weapon', () => {
    const b = newBuild('warden');
    for (let i = 1; i < WEAPON_MAX_LEVEL; i++) levelWeapon(b, 'oathblade', 0);
    addOrLevelPassive(b, 'runeplate', 0);
    evolveWeapon(b, 'oathblade');
    const rng = new Rng(77);
    for (let i = 0; i < 300; i++) for (const o of rollLevelUpOffers(rng, b, 0)) expect(o.id === 'oathblade' && o.kind === 'newWeapon').toBe(false);
  });
});

describe('Level growth', () => {
  it('each level adds max HP and damage on top of upgrades', () => {
    const b = newBuild('warden');
    const l1 = buildStats(b, 1);
    const l21 = buildStats(b, 21);
    expect(l21.maxHp - l1.maxHp).toBeCloseTo(GROWTH_PER_LEVEL.maxHp * 20);
    expect(l21.damage - l1.damage).toBeCloseTo(GROWTH_PER_LEVEL.damage * 20);
    expect(levelGrowthMods(1)).toEqual([]);
  });
});
