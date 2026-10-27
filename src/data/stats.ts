/**
 * Character stats. Every stat is a plain number; how it's used:
 *  maxHp        flat hit points
 *  regen        HP per second
 *  armor        flat damage reduction per hit (a hit always deals at least 25%)
 *  damage       damage multiplier (1 = 100%)
 *  attackSpeed  cooldown speed multiplier (2 = weapons fire twice as often)
 *  moveSpeed    move speed multiplier on the character's base speed
 *  area         size multiplier for weapon effects
 *  projectiles  extra projectiles/strikes added to every weapon
 *  duration     duration multiplier for lingering effects
 *  critChance   0..1
 *  critDamage   crit damage multiplier
 *  pickupRange  magnet radius in world pixels
 *  luck         +% luck (0.2 = +20%) for rarity rolls and drops
 *  xpGain       multiplier
 *  coinGain     multiplier
 *  lifesteal    fraction of damage dealt returned as HP (capped per second)
 *  thorns       flat damage dealt back to enemies that touch you
 *  dodge        0..0.6 chance to ignore a hit
 *  revives      extra lives
 */
export const STAT_KEYS = [
  'maxHp',
  'regen',
  'armor',
  'damage',
  'attackSpeed',
  'moveSpeed',
  'area',
  'projectiles',
  'duration',
  'critChance',
  'critDamage',
  'pickupRange',
  'luck',
  'xpGain',
  'coinGain',
  'lifesteal',
  'thorns',
  'dodge',
  'revives',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type StatBlock = Record<StatKey, number>;

/** add: added to the base. pct: summed and applied as a multiplier (1 + sum) after adds. */
export interface StatMod {
  stat: StatKey;
  add?: number;
  pct?: number;
}

export const STAT_LABELS: Record<StatKey, string> = {
  maxHp: 'Max HP',
  regen: 'HP Regen',
  armor: 'Armour',
  damage: 'Damage',
  attackSpeed: 'Attack Speed',
  moveSpeed: 'Move Speed',
  area: 'Area',
  projectiles: 'Projectiles',
  duration: 'Duration',
  critChance: 'Crit Chance',
  critDamage: 'Crit Damage',
  pickupRange: 'Pickup Range',
  luck: 'Luck',
  xpGain: 'XP Gain',
  coinGain: 'Coin Gain',
  lifesteal: 'Lifesteal',
  thorns: 'Thorns',
  dodge: 'Dodge',
  revives: 'Revives',
};

/** How a stat value is shown: as a percent of 1, a percent of 0, or a flat number. */
export const STAT_FORMAT: Record<StatKey, 'mult' | 'pct' | 'flat' | 'flat1'> = {
  maxHp: 'flat',
  regen: 'flat1',
  armor: 'flat',
  damage: 'mult',
  attackSpeed: 'mult',
  moveSpeed: 'mult',
  area: 'mult',
  projectiles: 'flat',
  duration: 'mult',
  critChance: 'pct',
  critDamage: 'mult',
  pickupRange: 'flat',
  luck: 'pct',
  xpGain: 'mult',
  coinGain: 'mult',
  lifesteal: 'pct',
  thorns: 'flat',
  dodge: 'pct',
  revives: 'flat',
};

export const STAT_CAPS: Partial<Record<StatKey, [number, number]>> = {
  maxHp: [1, 99999],
  armor: [0, 999],
  damage: [0.1, 999],
  attackSpeed: [0.25, 6],
  moveSpeed: [0.3, 3],
  area: [0.3, 6],
  projectiles: [0, 20],
  duration: [0.3, 6],
  critChance: [0, 1],
  critDamage: [1, 20],
  pickupRange: [10, 2000],
  luck: [-0.9, 20],
  xpGain: [0.1, 20],
  coinGain: [0.1, 20],
  lifesteal: [0, 0.5],
  thorns: [0, 9999],
  dodge: [0, 0.6],
  revives: [0, 9],
  regen: [0, 999],
};

export function emptyStats(): StatBlock {
  const s = {} as StatBlock;
  for (const k of STAT_KEYS) s[k] = 0;
  return s;
}

/** Describe a mod for UI, e.g. "+8% Move Speed" or "+12 Max HP". */
export function describeMod(m: StatMod): string {
  const parts: string[] = [];
  const fmt = STAT_FORMAT[m.stat];
  const label = STAT_LABELS[m.stat];
  if (m.add) {
    if (fmt === 'mult' || fmt === 'pct') parts.push(`${m.add > 0 ? '+' : ''}${round1(m.add * 100)}% ${label}`);
    else if (fmt === 'flat1') parts.push(`${m.add > 0 ? '+' : ''}${round1(m.add)} ${label}`);
    else parts.push(`${m.add > 0 ? '+' : ''}${round1(m.add)} ${label}`);
  }
  if (m.pct) parts.push(`${m.pct > 0 ? '+' : ''}${round1(m.pct * 100)}% ${label}`);
  return parts.join(', ');
}

export function formatStat(key: StatKey, v: number): string {
  const fmt = STAT_FORMAT[key];
  if (fmt === 'mult') return `${Math.round(v * 100)}%`;
  if (fmt === 'pct') return `${round1(v * 100)}%`;
  if (fmt === 'flat1') return `${round1(v)}`;
  return `${Math.round(v)}`;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
