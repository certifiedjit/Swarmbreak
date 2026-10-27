/**
 * Character mastery: every hero has a permanent level. XP collected in a run
 * becomes mastery XP for that hero; each mastery level grants one skill point
 * to spend in that hero's skill tree. Refunds are free and unlimited.
 * Pure logic (no DOM / save access) so it is easy to test.
 */
import type { StatMod } from '../data/stats';

export type Branch = 'bulwark' | 'oath' | 'salvage';

/** non-stat run bonuses a node can give, per rank */
export interface RunPerks {
  rerolls?: number;
  banishes?: number;
  skips?: number;
  startCoins?: number;
  /** strengthens the hero's signature passive (see src/systems/heroes.ts) */
  passive?: number;
}

export interface SkillNode {
  id: string;
  name: string;
  branch: Branch;
  /** one line describing what a single rank gives */
  desc: string;
  maxRank: number;
  /** skill points per rank */
  cost: number;
  requires?: { id: string; rank: number };
  perRank: { mods?: StatMod[]; perks?: RunPerks };
}

export const BRANCHES: Record<Branch, { name: string; desc: string; color: string }> = {
  bulwark: { name: 'Bulwark', desc: 'Defence', color: '#59f3ff' },
  oath: { name: 'Oath', desc: 'Offence', color: '#ff7a5c' },
  salvage: { name: 'Salvage', desc: 'Utility', color: '#ffc94d' },
};

const N = (n: SkillNode): SkillNode => n;

export const SKILL_TREES: Record<string, SkillNode[]> = {
  warden: [
    N({ id: 'iron_hide', name: 'Iron Hide', branch: 'bulwark', desc: '+12 Max HP', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'maxHp', add: 12 }] } }),
    N({ id: 'runed_plates', name: 'Runed Plates', branch: 'bulwark', desc: '+1 Armour', maxRank: 3, cost: 1, requires: { id: 'iron_hide', rank: 2 }, perRank: { mods: [{ stat: 'armor', add: 1 }] } }),
    N({ id: 'spite', name: 'Spite', branch: 'bulwark', desc: '+8 Thorns', maxRank: 3, cost: 1, requires: { id: 'runed_plates', rank: 1 }, perRank: { mods: [{ stat: 'thorns', add: 8 }] } }),
    N({ id: 'unbroken', name: 'Unbroken', branch: 'bulwark', desc: '+1 Revive per run', maxRank: 1, cost: 3, requires: { id: 'spite', rank: 2 }, perRank: { mods: [{ stat: 'revives', add: 1 }] } }),

    N({ id: 'keen_edge', name: 'Keen Edge', branch: 'oath', desc: '+5% Damage', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'damage', add: 0.05 }] } }),
    N({ id: 'swift_hands', name: 'Swift Hands', branch: 'oath', desc: '+5% Attack Speed', maxRank: 3, cost: 1, requires: { id: 'keen_edge', rank: 2 }, perRank: { mods: [{ stat: 'attackSpeed', add: 0.05 }] } }),
    N({ id: 'weak_points', name: 'Weak Points', branch: 'oath', desc: '+3% Crit Chance', maxRank: 3, cost: 1, requires: { id: 'swift_hands', rank: 1 }, perRank: { mods: [{ stat: 'critChance', add: 0.03 }] } }),
    N({ id: 'executioner', name: 'Executioner', branch: 'oath', desc: '+25% Crit Damage', maxRank: 2, cost: 2, requires: { id: 'weak_points', rank: 2 }, perRank: { mods: [{ stat: 'critDamage', add: 0.25 }] } }),

    N({ id: 'long_reach', name: 'Long Reach', branch: 'salvage', desc: '+15 Pickup Range', maxRank: 3, cost: 1, perRank: { mods: [{ stat: 'pickupRange', add: 15 }] } }),
    N({ id: 'scholar', name: 'Scholar', branch: 'salvage', desc: '+5% XP Gain', maxRank: 3, cost: 1, requires: { id: 'long_reach', rank: 1 }, perRank: { mods: [{ stat: 'xpGain', add: 0.05 }] } }),
    N({ id: 'prospector', name: 'Prospector', branch: 'salvage', desc: '+40 starting coins, +5% Coin Gain', maxRank: 3, cost: 1, requires: { id: 'scholar', rank: 1 }, perRank: { mods: [{ stat: 'coinGain', add: 0.05 }], perks: { startCoins: 40 } } }),
    N({ id: 'gambler', name: 'Gambler', branch: 'salvage', desc: '+1 reroll and +1 banish per run', maxRank: 2, cost: 2, requires: { id: 'prospector', rank: 2 }, perRank: { perks: { rerolls: 1, banishes: 1 } } }),
  ],

  glint: [
    N({ id: 'light_frame', name: 'Light Frame', branch: 'bulwark', desc: '+10 Max HP', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'maxHp', add: 10 }] } }),
    N({ id: 'sidestep', name: 'Sidestep', branch: 'bulwark', desc: '+2% Dodge', maxRank: 3, cost: 1, requires: { id: 'light_frame', rank: 2 }, perRank: { mods: [{ stat: 'dodge', add: 0.02 }] } }),
    N({ id: 'slipstream', name: 'Slipstream', branch: 'bulwark', desc: '+4% Move Speed', maxRank: 3, cost: 1, requires: { id: 'sidestep', rank: 1 }, perRank: { mods: [{ stat: 'moveSpeed', add: 0.04 }] } }),
    N({ id: 'blur', name: 'Blur', branch: 'bulwark', desc: '+1 Revive per run', maxRank: 1, cost: 3, requires: { id: 'slipstream', rank: 2 }, perRank: { mods: [{ stat: 'revives', add: 1 }] } }),

    N({ id: 'honed_plasma', name: 'Honed Plasma', branch: 'oath', desc: '+5% Damage', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'damage', add: 0.05 }] } }),
    N({ id: 'quick_draw', name: 'Quick Draw', branch: 'oath', desc: '+5% Attack Speed', maxRank: 3, cost: 1, requires: { id: 'honed_plasma', rank: 2 }, perRank: { mods: [{ stat: 'attackSpeed', add: 0.05 }] } }),
    N({ id: 'pressure_points', name: 'Pressure Points', branch: 'oath', desc: '+3% Crit Chance', maxRank: 3, cost: 1, requires: { id: 'quick_draw', rank: 1 }, perRank: { mods: [{ stat: 'critChance', add: 0.03 }] } }),
    N({ id: 'third_eye', name: 'Third Eye', branch: 'oath', desc: 'Afterimage: guaranteed crits deal +25% damage', maxRank: 2, cost: 2, requires: { id: 'pressure_points', rank: 2 }, perRank: { perks: { passive: 1 } } }),

    N({ id: 'long_reach', name: 'Long Reach', branch: 'salvage', desc: '+15 Pickup Range', maxRank: 3, cost: 1, perRank: { mods: [{ stat: 'pickupRange', add: 15 }] } }),
    N({ id: 'quick_study', name: 'Quick Study', branch: 'salvage', desc: '+5% XP Gain', maxRank: 3, cost: 1, requires: { id: 'long_reach', rank: 1 }, perRank: { mods: [{ stat: 'xpGain', add: 0.05 }] } }),
    N({ id: 'pickpocket', name: 'Pickpocket', branch: 'salvage', desc: '+40 starting coins, +5% Coin Gain', maxRank: 3, cost: 1, requires: { id: 'quick_study', rank: 1 }, perRank: { mods: [{ stat: 'coinGain', add: 0.05 }], perks: { startCoins: 40 } } }),
    N({ id: 'second_look', name: 'Second Look', branch: 'salvage', desc: '+1 reroll and +1 banish per run', maxRank: 2, cost: 2, requires: { id: 'pickpocket', rank: 2 }, perRank: { perks: { rerolls: 1, banishes: 1 } } }),
  ],

  voidcaller: [
    N({ id: 'shroud', name: 'Shroud', branch: 'bulwark', desc: '+10 Max HP', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'maxHp', add: 10 }] } }),
    N({ id: 'ward_sigils', name: 'Ward Sigils', branch: 'bulwark', desc: '+0.3 HP Regen', maxRank: 3, cost: 1, requires: { id: 'shroud', rank: 2 }, perRank: { mods: [{ stat: 'regen', add: 0.3 }] } }),
    N({ id: 'soul_ward', name: 'Soul Ward', branch: 'bulwark', desc: '+1 Armour', maxRank: 3, cost: 1, requires: { id: 'ward_sigils', rank: 1 }, perRank: { mods: [{ stat: 'armor', add: 1 }] } }),
    N({ id: 'undying_bond', name: 'Undying Bond', branch: 'bulwark', desc: '+1 Revive per run', maxRank: 1, cost: 3, requires: { id: 'soul_ward', rank: 2 }, perRank: { mods: [{ stat: 'revives', add: 1 }] } }),

    N({ id: 'hunger', name: 'Hunger', branch: 'oath', desc: '+5% Damage', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'damage', add: 0.05 }] } }),
    N({ id: 'lingering_bond', name: 'Lingering Bond', branch: 'oath', desc: '+8% Duration', maxRank: 3, cost: 1, requires: { id: 'hunger', rank: 2 }, perRank: { mods: [{ stat: 'duration', add: 0.08 }] } }),
    N({ id: 'wide_call', name: 'Wide Call', branch: 'oath', desc: '+5% Area', maxRank: 3, cost: 1, requires: { id: 'lingering_bond', rank: 1 }, perRank: { mods: [{ stat: 'area', add: 0.05 }] } }),
    N({ id: 'grave_calling', name: 'Grave Calling', branch: 'oath', desc: 'Binding: +2% chance to raise a spirit', maxRank: 2, cost: 2, requires: { id: 'wide_call', rank: 2 }, perRank: { perks: { passive: 1 } } }),

    N({ id: 'soul_tether', name: 'Soul Tether', branch: 'salvage', desc: '+15 Pickup Range', maxRank: 3, cost: 1, perRank: { mods: [{ stat: 'pickupRange', add: 15 }] } }),
    N({ id: 'forbidden_lore', name: 'Forbidden Lore', branch: 'salvage', desc: '+5% XP Gain', maxRank: 3, cost: 1, requires: { id: 'soul_tether', rank: 1 }, perRank: { mods: [{ stat: 'xpGain', add: 0.05 }] } }),
    N({ id: 'grave_goods', name: 'Grave Goods', branch: 'salvage', desc: '+40 starting coins, +5% Coin Gain', maxRank: 3, cost: 1, requires: { id: 'forbidden_lore', rank: 1 }, perRank: { mods: [{ stat: 'coinGain', add: 0.05 }], perks: { startCoins: 40 } } }),
    N({ id: 'omens', name: 'Omens', branch: 'salvage', desc: '+1 reroll and +1 banish per run', maxRank: 2, cost: 2, requires: { id: 'grave_goods', rank: 2 }, perRank: { perks: { rerolls: 1, banishes: 1 } } }),
  ],

  riven: [
    N({ id: 'hardhat', name: 'Hardhat', branch: 'bulwark', desc: '+12 Max HP', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'maxHp', add: 12 }] } }),
    N({ id: 'reinforced', name: 'Reinforced', branch: 'bulwark', desc: '+1 Armour', maxRank: 3, cost: 1, requires: { id: 'hardhat', rank: 2 }, perRank: { mods: [{ stat: 'armor', add: 1 }] } }),
    N({ id: 'field_repair', name: 'Field Repair', branch: 'bulwark', desc: '+0.3 HP Regen', maxRank: 3, cost: 1, requires: { id: 'reinforced', rank: 1 }, perRank: { mods: [{ stat: 'regen', add: 0.3 }] } }),
    N({ id: 'failsafe', name: 'Failsafe', branch: 'bulwark', desc: '+1 Revive per run', maxRank: 1, cost: 3, requires: { id: 'field_repair', rank: 2 }, perRank: { mods: [{ stat: 'revives', add: 1 }] } }),

    N({ id: 'calibrated', name: 'Calibrated', branch: 'oath', desc: '+5% Damage', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'damage', add: 0.05 }] } }),
    N({ id: 'overclock', name: 'Overclock', branch: 'oath', desc: '+5% Attack Speed', maxRank: 3, cost: 1, requires: { id: 'calibrated', rank: 2 }, perRank: { mods: [{ stat: 'attackSpeed', add: 0.05 }] } }),
    N({ id: 'long_fuse', name: 'Long Fuse', branch: 'oath', desc: '+8% Duration', maxRank: 3, cost: 1, requires: { id: 'overclock', rank: 1 }, perRank: { mods: [{ stat: 'duration', add: 0.08 }] } }),
    N({ id: 'rapid_deploy', name: 'Rapid Deploy', branch: 'oath', desc: 'Overbuilt: deploy 0.3 s sooner, +1 field turret', maxRank: 2, cost: 2, requires: { id: 'long_fuse', rank: 2 }, perRank: { perks: { passive: 1 } } }),

    N({ id: 'magnet_coil', name: 'Magnet Coil', branch: 'salvage', desc: '+15 Pickup Range', maxRank: 3, cost: 1, perRank: { mods: [{ stat: 'pickupRange', add: 15 }] } }),
    N({ id: 'schematics', name: 'Schematics', branch: 'salvage', desc: '+5% XP Gain', maxRank: 3, cost: 1, requires: { id: 'magnet_coil', rank: 1 }, perRank: { mods: [{ stat: 'xpGain', add: 0.05 }] } }),
    N({ id: 'salvage_rights', name: 'Salvage Rights', branch: 'salvage', desc: '+40 starting coins, +5% Coin Gain', maxRank: 3, cost: 1, requires: { id: 'schematics', rank: 1 }, perRank: { mods: [{ stat: 'coinGain', add: 0.05 }], perks: { startCoins: 40 } } }),
    N({ id: 'spare_parts', name: 'Spare Parts', branch: 'salvage', desc: '+1 reroll and +1 banish per run', maxRank: 2, cost: 2, requires: { id: 'salvage_rights', rank: 2 }, perRank: { perks: { rerolls: 1, banishes: 1 } } }),
  ],

  fortune: [
    N({ id: 'lucky_charm', name: 'Lucky Charm', branch: 'bulwark', desc: '+10 Max HP', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'maxHp', add: 10 }] } }),
    N({ id: 'near_miss', name: 'Near Miss', branch: 'bulwark', desc: '+2% Dodge', maxRank: 3, cost: 1, requires: { id: 'lucky_charm', rank: 2 }, perRank: { mods: [{ stat: 'dodge', add: 0.02 }] } }),
    N({ id: 'rabbits_foot', name: 'Rabbit’s Foot', branch: 'bulwark', desc: '+0.3 HP Regen', maxRank: 3, cost: 1, requires: { id: 'near_miss', rank: 1 }, perRank: { mods: [{ stat: 'regen', add: 0.3 }] } }),
    N({ id: 'cheat_death', name: 'Cheat Death', branch: 'bulwark', desc: '+1 Revive per run', maxRank: 1, cost: 3, requires: { id: 'rabbits_foot', rank: 2 }, perRank: { mods: [{ stat: 'revives', add: 1 }] } }),

    N({ id: 'loaded', name: 'Loaded', branch: 'oath', desc: '+5% Damage', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'damage', add: 0.05 }] } }),
    N({ id: 'sleight', name: 'Sleight of Hand', branch: 'oath', desc: '+5% Attack Speed', maxRank: 3, cost: 1, requires: { id: 'loaded', rank: 2 }, perRank: { mods: [{ stat: 'attackSpeed', add: 0.05 }] } }),
    N({ id: 'marked_cards', name: 'Marked Cards', branch: 'oath', desc: '+3% Crit Chance', maxRank: 3, cost: 1, requires: { id: 'sleight', rank: 1 }, perRank: { mods: [{ stat: 'critChance', add: 0.03 }] } }),
    N({ id: 'jackpot', name: 'Jackpot', branch: 'oath', desc: 'Loaded Dice: +5% chance a coin bursts', maxRank: 2, cost: 2, requires: { id: 'marked_cards', rank: 2 }, perRank: { perks: { passive: 1 } } }),

    N({ id: 'lucky_streak', name: 'Lucky Streak', branch: 'salvage', desc: '+8% Luck', maxRank: 3, cost: 1, perRank: { mods: [{ stat: 'luck', add: 0.08 }] } }),
    N({ id: 'golden_touch', name: 'Golden Touch', branch: 'salvage', desc: '+40 starting coins, +5% Coin Gain', maxRank: 3, cost: 1, requires: { id: 'lucky_streak', rank: 1 }, perRank: { mods: [{ stat: 'coinGain', add: 0.05 }], perks: { startCoins: 40 } } }),
    N({ id: 'card_counter', name: 'Card Counter', branch: 'salvage', desc: '+5% XP Gain', maxRank: 3, cost: 1, requires: { id: 'golden_touch', rank: 1 }, perRank: { mods: [{ stat: 'xpGain', add: 0.05 }] } }),
    N({ id: 'house_edge', name: 'House Edge', branch: 'salvage', desc: '+1 reroll and +1 banish per run', maxRank: 2, cost: 2, requires: { id: 'card_counter', rank: 2 }, perRank: { perks: { rerolls: 1, banishes: 1 } } }),
  ],

  pyre: [
    N({ id: 'smoulder', name: 'Smoulder', branch: 'bulwark', desc: '+10 Max HP', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'maxHp', add: 10 }] } }),
    N({ id: 'heat_shield', name: 'Heat Shield', branch: 'bulwark', desc: '+1 Armour', maxRank: 3, cost: 1, requires: { id: 'smoulder', rank: 2 }, perRank: { mods: [{ stat: 'armor', add: 1 }] } }),
    N({ id: 'cinder_blood', name: 'Cinder Blood', branch: 'bulwark', desc: '+0.4 HP Regen', maxRank: 3, cost: 1, requires: { id: 'heat_shield', rank: 1 }, perRank: { mods: [{ stat: 'regen', add: 0.4 }] } }),
    N({ id: 'rekindle', name: 'Rekindle', branch: 'bulwark', desc: '+1 Revive per run', maxRank: 1, cost: 3, requires: { id: 'cinder_blood', rank: 2 }, perRank: { mods: [{ stat: 'revives', add: 1 }] } }),

    N({ id: 'stoke', name: 'Stoke', branch: 'oath', desc: '+5% Damage', maxRank: 5, cost: 1, perRank: { mods: [{ stat: 'damage', add: 0.05 }] } }),
    N({ id: 'spread', name: 'Spread', branch: 'oath', desc: '+5% Area', maxRank: 3, cost: 1, requires: { id: 'stoke', rank: 2 }, perRank: { mods: [{ stat: 'area', add: 0.05 }] } }),
    N({ id: 'flashpoint', name: 'Flashpoint', branch: 'oath', desc: '+3% Crit Chance', maxRank: 3, cost: 1, requires: { id: 'spread', rank: 1 }, perRank: { mods: [{ stat: 'critChance', add: 0.03 }] } }),
    N({ id: 'wildfire', name: 'Wildfire', branch: 'oath', desc: 'Kindling: burning trail deals +30% damage', maxRank: 2, cost: 2, requires: { id: 'flashpoint', rank: 2 }, perRank: { perks: { passive: 1 } } }),

    N({ id: 'updraft', name: 'Updraft', branch: 'salvage', desc: '+15 Pickup Range', maxRank: 3, cost: 1, perRank: { mods: [{ stat: 'pickupRange', add: 15 }] } }),
    N({ id: 'ash_lore', name: 'Ash Lore', branch: 'salvage', desc: '+5% XP Gain', maxRank: 3, cost: 1, requires: { id: 'updraft', rank: 1 }, perRank: { mods: [{ stat: 'xpGain', add: 0.05 }] } }),
    N({ id: 'molten_gold', name: 'Molten Gold', branch: 'salvage', desc: '+40 starting coins, +5% Coin Gain', maxRank: 3, cost: 1, requires: { id: 'ash_lore', rank: 1 }, perRank: { mods: [{ stat: 'coinGain', add: 0.05 }], perks: { startCoins: 40 } } }),
    N({ id: 'fire_sight', name: 'Fire Sight', branch: 'salvage', desc: '+1 reroll and +1 banish per run', maxRank: 2, cost: 2, requires: { id: 'molten_gold', rank: 2 }, perRank: { perks: { rerolls: 1, banishes: 1 } } }),
  ],
};

export interface BranchInfo {
  name: string;
  desc: string;
  color: string;
}

/** each hero names their three branches; the roles stay defence / offence / utility */
export const TREE_BRANCHES: Record<string, Record<Branch, BranchInfo>> = {
  warden: BRANCHES,
  glint: { bulwark: { name: 'Evasion', desc: 'Defence', color: '#ff9be6' }, oath: { name: 'Edge', desc: 'Offence', color: '#ff4dd2' }, salvage: { name: 'Scavenge', desc: 'Utility', color: '#ffc94d' } },
  voidcaller: { bulwark: { name: 'Veil', desc: 'Defence', color: '#8f9bff' }, oath: { name: 'Pact', desc: 'Offence', color: '#b36bff' }, salvage: { name: 'Rites', desc: 'Utility', color: '#ffc94d' } },
  riven: { bulwark: { name: 'Plating', desc: 'Defence', color: '#9aa3b8' }, oath: { name: 'Ordnance', desc: 'Offence', color: '#ffd34d' }, salvage: { name: 'Workshop', desc: 'Utility', color: '#7dff8a' } },
  fortune: { bulwark: { name: 'Charm', desc: 'Defence', color: '#7dff8a' }, oath: { name: 'Hustle', desc: 'Offence', color: '#ff7a5c' }, salvage: { name: 'Fortune', desc: 'Utility', color: '#ffb330' } },
  pyre: { bulwark: { name: 'Ember', desc: 'Defence', color: '#ffb36b' }, oath: { name: 'Blaze', desc: 'Offence', color: '#ff6a2a' }, salvage: { name: 'Ash', desc: 'Utility', color: '#c3ccd6' } },
};

export function branchesFor(character: string): Record<Branch, BranchInfo> {
  return TREE_BRANCHES[character] ?? BRANCHES;
}

export interface MasteryState {
  /** XP into the current level */
  xp: number;
  level: number;
  ranks: Record<string, number>;
}

export function newMastery(): MasteryState {
  return { xp: 0, level: 1, ranks: {} };
}

/** mastery XP needed to go from `level` to `level + 1` */
export function masteryXpToNext(level: number): number {
  return 250 + 150 * (Math.max(1, level) - 1);
}

/** Mastery XP a run is worth: a share of the XP you collected, plus a bonus for clearing a chapter. */
export function runMasteryXp(xpCollected: number, won: boolean): number {
  return Math.max(0, Math.round(xpCollected / 12 + (won ? 400 : 0)));
}

/** add XP, rolling over levels. Returns levels gained. */
export function addMasteryXp(m: MasteryState, xp: number): number {
  let gained = 0;
  m.xp += Math.max(0, xp);
  while (m.xp >= masteryXpToNext(m.level)) {
    m.xp -= masteryXpToNext(m.level);
    m.level++;
    gained++;
  }
  return gained;
}

export function totalPoints(m: MasteryState): number {
  return m.level - 1;
}

export function spentPoints(m: MasteryState, tree: readonly SkillNode[]): number {
  let s = 0;
  for (const n of tree) s += (m.ranks[n.id] ?? 0) * n.cost;
  return s;
}

export function availablePoints(m: MasteryState, tree: readonly SkillNode[]): number {
  return totalPoints(m) - spentPoints(m, tree);
}

export function isNodeUnlocked(m: MasteryState, node: SkillNode): boolean {
  return !node.requires || (m.ranks[node.requires.id] ?? 0) >= node.requires.rank;
}

export function canRankUp(m: MasteryState, tree: readonly SkillNode[], id: string): boolean {
  const node = tree.find((n) => n.id === id);
  if (!node) return false;
  if ((m.ranks[id] ?? 0) >= node.maxRank) return false;
  if (!isNodeUnlocked(m, node)) return false;
  return availablePoints(m, tree) >= node.cost;
}

export function rankUp(m: MasteryState, tree: readonly SkillNode[], id: string): boolean {
  if (!canRankUp(m, tree, id)) return false;
  m.ranks[id] = (m.ranks[id] ?? 0) + 1;
  return true;
}

/** free respec: every point comes back */
export function refundAll(m: MasteryState): void {
  m.ranks = {};
}

export interface MetaBonus {
  mods: StatMod[];
  rerolls: number;
  banishes: number;
  skips: number;
  startCoins: number;
  /** multiplier on chest and shop prices */
  priceMult: number;
  /** signature passive power */
  passive: number;
}

export function emptyBonus(): MetaBonus {
  return { mods: [], rerolls: 0, banishes: 0, skips: 0, startCoins: 0, priceMult: 1, passive: 0 };
}

function addPerks(b: MetaBonus, p: RunPerks | undefined, times: number): void {
  if (!p) return;
  b.rerolls += (p.rerolls ?? 0) * times;
  b.banishes += (p.banishes ?? 0) * times;
  b.skips += (p.skips ?? 0) * times;
  b.startCoins += (p.startCoins ?? 0) * times;
  b.passive += (p.passive ?? 0) * times;
}

/** everything a hero's spent skill points give them in a run */
export function masteryBonus(m: MasteryState, tree: readonly SkillNode[], into: MetaBonus = emptyBonus()): MetaBonus {
  for (const n of tree) {
    const r = m.ranks[n.id] ?? 0;
    if (!r) continue;
    for (const mod of n.perRank.mods ?? []) into.mods.push({ stat: mod.stat, add: mod.add !== undefined ? mod.add * r : undefined, pct: mod.pct !== undefined ? mod.pct * r : undefined });
    addPerks(into, n.perRank.perks, r);
  }
  return into;
}

// ---------------------------------------------------------------- Star Shards & the Armory

/**
 * Star Shards: the permanent currency. Leftover coins convert at 1 shard per
 * 10 coins, plus a little for kills and a bonus for clearing a chapter.
 */
export function shardsForRun(r: { coinsLeft: number; kills: number; won: boolean }): number {
  return Math.max(0, Math.floor(r.coinsLeft / 10) + Math.floor(r.kills / 200) + (r.won ? 20 : 0));
}

export interface ArmoryItem {
  id: string;
  name: string;
  desc: string;
  maxRank: number;
  /** shard cost of the first rank; each rank costs base × (rank + 1) */
  base: number;
  perRank: { mods?: StatMod[]; perks?: RunPerks; priceCut?: number };
}

/** Armory upgrades apply to every hero. */
export const ARMORY: ArmoryItem[] = [
  { id: 'vitality', name: 'Vitality Core', desc: '+5% Max HP', maxRank: 5, base: 30, perRank: { mods: [{ stat: 'maxHp', pct: 0.05 }] } },
  { id: 'might', name: 'Starforged Edge', desc: '+4% Damage', maxRank: 5, base: 35, perRank: { mods: [{ stat: 'damage', add: 0.04 }] } },
  { id: 'magnet', name: 'Grav Harness', desc: '+12 Pickup Range', maxRank: 3, base: 25, perRank: { mods: [{ stat: 'pickupRange', add: 12 }] } },
  { id: 'purse', name: 'Salvager’s Purse', desc: '+30 starting coins', maxRank: 5, base: 25, perRank: { perks: { startCoins: 30 } } },
  { id: 'greed', name: 'Tithe Ledger', desc: '+6% Coin Gain', maxRank: 3, base: 30, perRank: { mods: [{ stat: 'coinGain', add: 0.06 }] } },
  { id: 'haggler', name: 'Haggler’s Chip', desc: '-8% chest and shop prices', maxRank: 3, base: 45, perRank: { priceCut: 0.08 } },
  { id: 'reroll', name: 'Fate Dice', desc: '+1 reroll per run', maxRank: 3, base: 40, perRank: { perks: { rerolls: 1 } } },
  { id: 'banish', name: 'Void Seal', desc: '+1 banish per run', maxRank: 2, base: 50, perRank: { perks: { banishes: 1 } } },
  { id: 'skip', name: 'Patience', desc: '+1 skip per run', maxRank: 2, base: 20, perRank: { perks: { skips: 1 } } },
];

export function armoryCost(item: ArmoryItem, rank: number): number {
  return item.base * (rank + 1);
}

export function armoryBonus(ranks: Record<string, number>, into: MetaBonus = emptyBonus()): MetaBonus {
  for (const it of ARMORY) {
    const r = Math.min(it.maxRank, ranks[it.id] ?? 0);
    if (!r) continue;
    for (const mod of it.perRank.mods ?? []) into.mods.push({ stat: mod.stat, add: mod.add !== undefined ? mod.add * r : undefined, pct: mod.pct !== undefined ? mod.pct * r : undefined });
    addPerks(into, it.perRank.perks, r);
    if (it.perRank.priceCut) into.priceMult *= 1 - it.perRank.priceCut * r;
  }
  return into;
}

/** try to buy the next rank; returns the new shard balance or null if not possible */
export function buyArmory(ranks: Record<string, number>, shards: number, id: string): number | null {
  const it = ARMORY.find((a) => a.id === id);
  if (!it) return null;
  const r = ranks[id] ?? 0;
  if (r >= it.maxRank) return null;
  const cost = armoryCost(it, r);
  if (shards < cost) return null;
  ranks[id] = r + 1;
  return shards - cost;
}

// ---------------------------------------------------------------- Victory Cache shard roll

export interface CacheTier {
  mult: number;
  weight: number;
  label: string;
}

/** most clears pay the base; a few pay big. Luck shifts weight toward the rare tiers. */
export const CACHE_TIERS: CacheTier[] = [
  { mult: 1, weight: 60, label: '' },
  { mult: 2, weight: 26, label: 'LUCKY!' },
  { mult: 4, weight: 11, label: 'HUGE!' },
  { mult: 10, weight: 3, label: 'JACKPOT!' },
];

export function cacheTierWeights(luck: number): number[] {
  return CACHE_TIERS.map((t, i) => t.weight * (i === 0 ? 1 : 1 + Math.max(0, luck) * 0.3));
}

/** roll in [0,1) → which tier, and how many shards */
export function rollCacheShards(roll: number, base: number, luck = 0): { shards: number; tier: number } {
  const w = cacheTierWeights(luck);
  const total = w.reduce((a, b) => a + b, 0);
  let x = roll * total;
  for (let i = 0; i < w.length; i++) {
    x -= w[i];
    if (x < 0) return { shards: base * CACHE_TIERS[i].mult, tier: i };
  }
  return { shards: base * CACHE_TIERS[CACHE_TIERS.length - 1].mult, tier: CACHE_TIERS.length - 1 };
}
