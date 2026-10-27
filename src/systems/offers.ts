/**
 * Level-up cards and chest rolls: what can be offered, rarity rolls (with luck),
 * chest pricing and the pity rule. Pure logic.
 */
import type { Rng } from '../core/rng';
import { PASSIVES, PASSIVE_MAX_LEVEL, RELICS, RELIC_IDS, BASE_PASSIVE_IDS } from '../data/passives';
import { CHEST_WEIGHTS, LEVELUP_WEIGHTS, luckAdjustedWeights, normalize, RARITY_INFO, rarityOf, type RarityIndex } from '../data/rarity';
import { SPELLS, SPELL_IDS } from '../data/spells';
import { describeMod } from '../data/stats';
import { BASE_WEAPON_IDS, WEAPONS, describeDelta } from '../data/weapons';
import {
  MAX_PASSIVES,
  MAX_WEAPONS,
  addOrLevelPassive,
  addRelic,
  addWeapon,
  eligibleEvolutions,
  evolveWeapon,
  levelWeapon,
  passiveLevelMods,
  weaponMaxed,
  type Build,
} from './build';

export type OfferKind = 'newWeapon' | 'weaponUp' | 'newPassive' | 'passiveUp' | 'evolution' | 'relic' | 'spell' | 'heal' | 'coins';

export interface Offer {
  kind: OfferKind;
  id: string;
  rarity: RarityIndex;
}

export function rollRarity(rng: Rng, baseWeights: readonly number[], luck: number, minIdx = 0): RarityIndex {
  const w = luckAdjustedWeights(baseWeights, luck).map((x, i) => (i < minIdx ? 0 : x));
  return rng.weighted(w) as RarityIndex;
}

export function rarityOdds(baseWeights: readonly number[], luck: number): number[] {
  return normalize(luckAdjustedWeights(baseWeights, luck));
}

/** For an evolved weapon, the base weapon it came from (else the id itself). */
export function baseWeaponOf(id: string): string {
  const from = Object.values(WEAPONS).find((d) => d.evolvesInto === id);
  return from ? from.id : id;
}

/** All upgrade options currently available for a build (before rarity). */
export function upgradePool(build: Build, unlockedWeapons: readonly string[] = BASE_WEAPON_IDS): { kind: OfferKind; id: string; weight: number }[] {
  const pool: { kind: OfferKind; id: string; weight: number }[] = [];
  const ban = new Set(build.banished);
  for (const w of build.weapons) if (!weaponMaxed(w) && !ban.has(w.id)) pool.push({ kind: 'weaponUp', id: w.id, weight: 1.25 });
  if (build.weapons.length < MAX_WEAPONS) {
    const owned = new Set(build.weapons.map((w) => baseWeaponOf(w.id)));
    for (const id of unlockedWeapons) {
      if (ban.has(id) || owned.has(id)) continue;
      pool.push({ kind: 'newWeapon', id, weight: 1 });
    }
  }
  for (const p of build.passives) if (p.level < PASSIVE_MAX_LEVEL && !ban.has(p.id)) pool.push({ kind: 'passiveUp', id: p.id, weight: 1.1 });
  if (build.passives.length < MAX_PASSIVES) {
    for (const id of BASE_PASSIVE_IDS) {
      if (ban.has(id) || build.passives.some((p) => p.id === id)) continue;
      pool.push({ kind: 'newPassive', id, weight: 0.9 });
    }
  }
  return pool;
}

/**
 * Roll `count` distinct level-up cards. If an evolution is ready it is always
 * one of the cards (as Legendary). If nothing is left to upgrade, offers
 * heals and coins instead.
 */
export function rollLevelUpOffers(rng: Rng, build: Build, luck: number, count = 3, unlockedWeapons?: readonly string[]): Offer[] {
  const offers: Offer[] = [];
  const evo = eligibleEvolutions(build);
  if (evo.length) offers.push({ kind: 'evolution', id: evo[0].weapon, rarity: 4 });
  const pool = upgradePool(build, unlockedWeapons).filter((o) => !(o.kind === 'weaponUp' && evo.some((e) => e.weapon === o.id)));
  while (offers.length < count && pool.length) {
    const i = rng.weighted(pool.map((p) => p.weight));
    const pick = pool.splice(i, 1)[0];
    offers.push({ kind: pick.kind, id: pick.id, rarity: rollRarity(rng, LEVELUP_WEIGHTS, luck) });
  }
  if (offers.length < count) offers.push({ kind: 'heal', id: 'field_ration', rarity: rollRarity(rng, LEVELUP_WEIGHTS, luck) });
  if (offers.length < count) offers.push({ kind: 'coins', id: 'scrap_cache', rarity: rollRarity(rng, LEVELUP_WEIGHTS, luck) });
  return offers;
}

// ---------------------------------------------------------------- chests

export const PITY_THRESHOLD = 3;

export interface ChestState {
  opened: number;
  /** Commons in a row from chests */
  commonStreak: number;
  /** count of chests opened by rarity */
  byRarity: number[];
}

export function newChestState(): ChestState {
  return { opened: 0, commonStreak: 0, byRarity: [0, 0, 0, 0, 0] };
}

/** Price rises with each chest opened. costMult lets a character/meta upgrade discount chests. */
export function chestPrice(opened: number, costMult = 1): number {
  return Math.max(1, Math.round((20 + 10 * opened) * Math.pow(1.12, opened) * costMult));
}

/** Rarity odds shown on a chest, accounting for luck and pity. */
export function chestOdds(state: ChestState, luck: number): number[] {
  const w = luckAdjustedWeights(CHEST_WEIGHTS, luck);
  if (state.commonStreak >= PITY_THRESHOLD) {
    w[0] = 0;
    w[1] = 0;
  }
  return normalize(w);
}

/** Roll a chest's rarity, applying pity: after PITY_THRESHOLD Commons in a row, the next is Rare or better. */
export function rollChestRarity(rng: Rng, state: ChestState, luck: number, minIdx = 0): RarityIndex {
  const pityMin = state.commonStreak >= PITY_THRESHOLD ? 2 : 0;
  const r = rollRarity(rng, CHEST_WEIGHTS, luck, Math.max(minIdx, pityMin));
  if (r === 0) state.commonStreak++;
  else state.commonStreak = 0;
  state.opened++;
  state.byRarity[r]++;
  return r;
}

/** One chest = one item at the rolled rarity. Evolutions always win if ready. */
export function rollChestItem(rng: Rng, build: Build, rarity: RarityIndex, unlockedWeapons?: readonly string[]): Offer {
  const evo = eligibleEvolutions(build);
  if (evo.length) return { kind: 'evolution', id: evo[0].weapon, rarity: 4 };
  const pool = upgradePool(build, unlockedWeapons);
  const candidates: { offer: Offer; weight: number }[] = pool.map((p) => ({ offer: { kind: p.kind, id: p.id, rarity }, weight: p.weight }));
  for (const id of RELIC_IDS) candidates.push({ offer: { kind: 'relic', id, rarity }, weight: 0.35 });
  for (const id of SPELL_IDS) if (id !== build.spell) candidates.push({ offer: { kind: 'spell', id, rarity }, weight: 0.12 });
  const i = rng.weighted(candidates.map((c) => c.weight));
  return candidates[i].offer;
}

// ---------------------------------------------------------------- apply + describe

export interface OfferResult {
  /** coins to add */
  coins?: number;
  /** fraction of max HP to heal */
  heal?: number;
  /** evolution id discovered */
  evolvedInto?: string;
  /** spell swapped in */
  spell?: string;
}

export function applyOffer(build: Build, o: Offer): OfferResult {
  switch (o.kind) {
    case 'newWeapon':
      addWeapon(build, o.id, o.rarity);
      return {};
    case 'weaponUp':
      levelWeapon(build, o.id, o.rarity);
      return {};
    case 'newPassive':
    case 'passiveUp':
      addOrLevelPassive(build, o.id, o.rarity);
      return {};
    case 'relic':
      addRelic(build, o.id, o.rarity);
      return {};
    case 'evolution': {
      const w = evolveWeapon(build, o.id);
      return w ? { evolvedInto: w.id } : {};
    }
    case 'spell':
      build.spell = o.id;
      return { spell: o.id };
    case 'heal':
      return { heal: 0.25 * RARITY_INFO[rarityOf(o.rarity)].mult };
    case 'coins':
      return { coins: Math.round(15 * RARITY_INFO[rarityOf(o.rarity)].mult) };
  }
}

export interface OfferView {
  name: string;
  tag: string;
  lines: string[];
  icon: string;
  color: number;
}

export function describeOffer(build: Build, o: Offer): OfferView {
  const mult = RARITY_INFO[rarityOf(o.rarity)].mult;
  const multNote = o.rarity > 0 ? ` (×${mult.toFixed(2).replace(/0$/, '')})` : '';
  switch (o.kind) {
    case 'newWeapon': {
      const d = WEAPONS[o.id];
      return { name: d.name, tag: 'NEW WEAPON', lines: [d.desc, o.rarity > 0 ? `+${o.rarity * 12}% starting damage` : ''].filter(Boolean), icon: `w_${o.id}`, color: d.color };
    }
    case 'weaponUp': {
      const d = WEAPONS[o.id];
      const w = build.weapons.find((x) => x.id === o.id);
      const delta = w ? d.levels[w.level - 1] : undefined;
      if (!w || !delta) return { name: d.name, tag: 'MAX LEVEL', lines: ['Already at max level'], icon: `w_${o.id}`, color: d.color };
      const extra = delta && !delta.damage && !delta.area && !delta.cooldownPct && !delta.speed && !delta.duration && !delta.knockback && o.rarity > 0 ? `+${o.rarity * 10}% bonus damage` : '';
      return { name: d.name, tag: `LV ${w.level} → ${w.level + 1}`, lines: [describeDelta(delta) + (extra ? '' : multNote), extra].filter(Boolean), icon: `w_${o.id}`, color: d.color };
    }
    case 'newPassive':
    case 'passiveUp': {
      const d = PASSIVES[o.id];
      const p = build.passives.find((x) => x.id === o.id);
      const lvl = (p?.level ?? 0) + 1;
      if (lvl > PASSIVE_MAX_LEVEL) return { name: d.name, tag: 'MAX LEVEL', lines: ['Already at max level'], icon: `p_${o.id}`, color: d.color };
      const mods = passiveLevelMods(o.id, lvl, o.rarity);
      return {
        name: d.name,
        tag: p ? `LV ${p.level} → ${lvl}` : 'NEW PASSIVE',
        lines: [p ? '' : d.desc, mods.map(describeMod).join(', ')].filter(Boolean),
        icon: `p_${o.id}`,
        color: d.color,
      };
    }
    case 'evolution': {
      const from = WEAPONS[o.id];
      const into = WEAPONS[from.evolvesInto!];
      return { name: into.name, tag: 'EVOLUTION', lines: [into.desc, `${from.name} + ${PASSIVES[from.evolvesWith!].name}`], icon: `w_${into.id}`, color: into.color };
    }
    case 'relic': {
      const d = RELICS[o.id];
      return { name: d.name, tag: 'RELIC', lines: [describeMod({ stat: d.mod.stat, add: d.mod.add ? d.mod.add * mult : undefined, pct: d.mod.pct ? d.mod.pct * mult : undefined })], icon: `r_${o.id}`, color: d.color };
    }
    case 'spell': {
      const d = SPELLS[o.id];
      return { name: d.name, tag: 'SPELL', lines: [d.desc, `Replaces ${SPELLS[build.spell].name}`], icon: `s_${o.id}`, color: d.color };
    }
    case 'heal':
      return { name: 'Field Ration', tag: 'HEAL', lines: [`Restore ${Math.round(25 * mult)}% HP`], icon: 'i_food', color: 0x7dff8a };
    case 'coins':
      return { name: 'Scrap Cache', tag: 'COINS', lines: [`+${Math.round(15 * mult)} coins`], icon: 'i_coin', color: 0xffc94d };
  }
}
