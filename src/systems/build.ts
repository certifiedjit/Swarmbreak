/**
 * The player's in-run build (weapons, passives, relics, spell) and the pure
 * rules for stacking stats, levelling weapons/passives and evolving weapons.
 * No rendering or game-world code here, so it is easy to unit test.
 */
import { CHARACTERS } from '../data/characters';
import { PASSIVES, PASSIVE_MAX_LEVEL, RELICS } from '../data/passives';
import { RARITY_INFO, rarityOf } from '../data/rarity';
import { STAT_CAPS, STAT_KEYS, emptyStats, type StatBlock, type StatMod } from '../data/stats';
import { WEAPONS, WEAPON_MAX_LEVEL, type WeaponDelta, type WeaponStats } from '../data/weapons';

export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

export interface OwnedWeapon {
  id: string;
  level: number;
  stats: WeaponStats;
}

export interface OwnedPassive {
  id: string;
  level: number;
  mods: StatMod[];
}

export interface Build {
  character: string;
  weapons: OwnedWeapon[];
  passives: OwnedPassive[];
  /** relic + shrine + misc stat boosts */
  extraMods: StatMod[];
  spell: string;
  banished: string[];
  relicCounts: Record<string, number>;
}

export function newBuild(characterId: string): Build {
  const c = CHARACTERS[characterId];
  const b: Build = {
    character: characterId,
    weapons: [],
    passives: [],
    extraMods: [],
    spell: c.startSpell,
    banished: [],
    relicCounts: {},
  };
  addWeapon(b, c.startWeapon, 0);
  return b;
}

/** Final stats = (base + Σadd) × (1 + Σpct), clamped to caps. */
export function computeStats(base: StatBlock, mods: readonly StatMod[]): StatBlock {
  const add = emptyStats();
  const pct = emptyStats();
  for (const m of mods) {
    if (m.add) add[m.stat] += m.add;
    if (m.pct) pct[m.stat] += m.pct;
  }
  const out = emptyStats();
  for (const k of STAT_KEYS) {
    let v = (base[k] + add[k]) * (1 + pct[k]);
    const cap = STAT_CAPS[k];
    if (cap) v = Math.min(cap[1], Math.max(cap[0], v));
    out[k] = v;
  }
  return out;
}

export function allMods(build: Build): StatMod[] {
  const mods: StatMod[] = [];
  for (const p of build.passives) mods.push(...p.mods);
  mods.push(...build.extraMods);
  return mods;
}

/** Every level-up also makes you stronger on its own: +3 max HP and +2% damage per level. */
export const GROWTH_PER_LEVEL = { maxHp: 3, damage: 0.02 };

export function levelGrowthMods(level: number): StatMod[] {
  const l = Math.max(0, level - 1);
  if (!l) return [];
  return [
    { stat: 'maxHp', add: GROWTH_PER_LEVEL.maxHp * l },
    { stat: 'damage', add: GROWTH_PER_LEVEL.damage * l },
  ];
}

export function buildStats(build: Build, level = 1, extra: readonly StatMod[] = []): StatBlock {
  const s = computeStats(CHARACTERS[build.character].stats, [...allMods(build), ...levelGrowthMods(level), ...extra]);
  // Warden's Bulwark: thorns scale with armour
  if (build.character === 'warden') s.thorns += s.armor * 2;
  return s;
}

const INTEGER_STATS = new Set(['projectiles', 'revives']);

/** Scale a stat mod by a rarity multiplier (whole-number stats are not scaled). */
export function scaleMod(m: StatMod, mult: number): StatMod {
  if (INTEGER_STATS.has(m.stat)) return { ...m };
  return {
    stat: m.stat,
    add: m.add !== undefined ? m.add * mult : undefined,
    pct: m.pct !== undefined ? m.pct * mult : undefined,
  };
}

// ---------------------------------------------------------------- weapons

/**
 * Apply one level step to weapon stats. Continuous stats are scaled by the
 * card's rarity multiplier; whole-number stats (amount/pierce/chain) are not,
 * and instead a rarer card adds bonus damage.
 */
export function applyWeaponDelta(stats: WeaponStats, delta: WeaponDelta, rarityIdx: number, baseDamage: number): WeaponStats {
  const m = RARITY_INFO[rarityOf(rarityIdx)].mult;
  const s = { ...stats };
  let continuous = false;
  if (delta.damage) {
    s.damage += delta.damage * m;
    continuous = true;
  }
  if (delta.knockback) {
    s.knockback += delta.knockback * m;
    continuous = true;
  }
  if (delta.area) {
    s.area += delta.area * m;
    continuous = true;
  }
  if (delta.speed) {
    s.speed += delta.speed * m;
    continuous = true;
  }
  if (delta.duration) {
    s.duration += delta.duration * m;
    continuous = true;
  }
  if (delta.cooldownPct) {
    s.cooldown *= 1 - Math.min(0.6, delta.cooldownPct * m);
    continuous = true;
  }
  if (delta.amount) s.amount += delta.amount;
  if (delta.pierce && s.pierce >= 0) s.pierce += delta.pierce;
  if (delta.chain) s.chain += delta.chain;
  if (!continuous && rarityIdx > 0) s.damage += baseDamage * 0.1 * rarityIdx;
  return s;
}

export function addWeapon(build: Build, id: string, rarityIdx: number): OwnedWeapon {
  const def = WEAPONS[id];
  const stats = { ...def.base };
  if (rarityIdx > 0) stats.damage += def.base.damage * 0.12 * rarityIdx;
  const w: OwnedWeapon = { id, level: 1, stats };
  build.weapons.push(w);
  return w;
}

export function levelWeapon(build: Build, id: string, rarityIdx: number): OwnedWeapon | null {
  const w = build.weapons.find((x) => x.id === id);
  if (!w) return null;
  const def = WEAPONS[id];
  if (w.level >= WEAPON_MAX_LEVEL || def.evolved) return w;
  const delta = def.levels[w.level - 1];
  w.stats = applyWeaponDelta(w.stats, delta, rarityIdx, def.base.damage);
  w.level++;
  return w;
}

export function weaponMaxed(w: OwnedWeapon): boolean {
  const def = WEAPONS[w.id];
  return def.evolved === true || w.level >= WEAPON_MAX_LEVEL;
}

// ---------------------------------------------------------------- passives

export function passiveLevelMods(id: string, level: number, rarityIdx: number): StatMod[] {
  const def = PASSIVES[id];
  const m = RARITY_INFO[rarityOf(rarityIdx)].mult;
  const mods = def.levels[level - 1].map((x) => scaleMod(x, m));
  const allWhole = def.levels[level - 1].every((x) => INTEGER_STATS.has(x.stat));
  if (allWhole && rarityIdx > 0 && def.rarityBonus) {
    mods.push({ stat: def.rarityBonus.stat, add: (def.rarityBonus.add ?? 0) * rarityIdx, pct: def.rarityBonus.pct ? def.rarityBonus.pct * rarityIdx : undefined });
  }
  return mods;
}

export function addOrLevelPassive(build: Build, id: string, rarityIdx: number): OwnedPassive {
  let p = build.passives.find((x) => x.id === id);
  if (!p) {
    p = { id, level: 0, mods: [] };
    build.passives.push(p);
  }
  if (p.level < PASSIVE_MAX_LEVEL) {
    p.level++;
    p.mods.push(...passiveLevelMods(id, p.level, rarityIdx));
  }
  return p;
}

export function addRelic(build: Build, id: string, rarityIdx: number): StatMod {
  const def = RELICS[id];
  const mod = scaleMod(def.mod, RARITY_INFO[rarityOf(rarityIdx)].mult);
  build.extraMods.push(mod);
  build.relicCounts[id] = (build.relicCounts[id] ?? 0) + 1;
  return mod;
}

// ---------------------------------------------------------------- evolutions

export interface EvolutionRecipe {
  weapon: string;
  passive: string;
  into: string;
}

export function allEvolutionRecipes(): EvolutionRecipe[] {
  return Object.values(WEAPONS)
    .filter((w) => w.evolvesInto && w.evolvesWith)
    .map((w) => ({ weapon: w.id, passive: w.evolvesWith!, into: w.evolvesInto! }));
}

/** Evolutions the build can take right now: weapon at max level + matching passive owned. */
export function eligibleEvolutions(build: Build): EvolutionRecipe[] {
  const out: EvolutionRecipe[] = [];
  for (const w of build.weapons) {
    const def = WEAPONS[w.id];
    if (def.evolved || !def.evolvesInto || !def.evolvesWith) continue;
    if (w.level < WEAPON_MAX_LEVEL) continue;
    if (!build.passives.some((p) => p.id === def.evolvesWith && p.level >= 1)) continue;
    out.push({ weapon: w.id, passive: def.evolvesWith, into: def.evolvesInto });
  }
  return out;
}

export function evolveWeapon(build: Build, weaponId: string): OwnedWeapon | null {
  const recipe = eligibleEvolutions(build).find((r) => r.weapon === weaponId);
  if (!recipe) return null;
  const idx = build.weapons.findIndex((w) => w.id === weaponId);
  const evo = WEAPONS[recipe.into];
  const w: OwnedWeapon = { id: evo.id, level: 1, stats: { ...evo.base } };
  build.weapons[idx] = w;
  return w;
}
