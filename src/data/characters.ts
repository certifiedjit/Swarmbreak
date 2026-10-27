import type { StatBlock } from './stats';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  passiveName: string;
  passiveDesc: string;
  startWeapon: string;
  startSpell: string;
  /** base move speed in world px/s (multiplied by the moveSpeed stat) */
  baseSpeed: number;
  stats: StatBlock;
  /** playable in this build */
  available: boolean;
  unlock: string;
  /** glow / accent colour */
  glow: number;
}

const base = (o: Partial<StatBlock>): StatBlock => ({
  maxHp: 100,
  regen: 0.2,
  armor: 0,
  damage: 1,
  attackSpeed: 1,
  moveSpeed: 1,
  area: 1,
  projectiles: 0,
  duration: 1,
  critChance: 0.1,
  critDamage: 2,
  pickupRange: 70,
  luck: 0,
  xpGain: 1,
  coinGain: 1,
  lifesteal: 0,
  thorns: 0,
  dodge: 0,
  revives: 0,
  ...o,
});

export const CHARACTERS: Record<string, CharacterDef> = {
  warden: {
    id: 'warden',
    name: 'Warden',
    title: 'Void-Forged Knight',
    desc: 'A hulking knight behind a rune-lit tower shield. Slow, stubborn, very hard to kill.',
    passiveName: 'Bulwark',
    passiveDesc: 'High HP and armour. Enemies that hit you take thorns damage (more with armour).',
    startWeapon: 'oathblade',
    startSpell: 'aegis_dash',
    baseSpeed: 100,
    stats: base({ maxHp: 200, regen: 1, armor: 5, thorns: 12, damage: 1.1, pickupRange: 85 }),
    available: true,
    unlock: 'Available from the start',
    glow: 0x59f3ff,
  },
  glint: {
    id: 'glint',
    name: 'Glint',
    title: 'Cyber-Ninja Scout',
    desc: 'A blur in a magenta scarf. Very fast, very fragile, grabs everything.',
    passiveName: 'Afterimage',
    passiveDesc: 'Every 3rd projectile you launch is a guaranteed crit. Fast, with 12% dodge and long reach — but low HP.',
    startWeapon: 'plasma_glaive',
    startSpell: 'aegis_dash',
    baseSpeed: 124,
    stats: base({ maxHp: 80, pickupRange: 105, dodge: 0.12, critChance: 0.12 }),
    available: true,
    unlock: 'Beat Chapter 1',
    glow: 0xff4dd2,
  },
  voidcaller: {
    id: 'voidcaller',
    name: 'Voidcaller',
    title: 'Hooded Summoner',
    desc: 'Binds the swarm’s own dead into void spirits that fight for her.',
    passiveName: 'Binding',
    passiveDesc: 'Kills have a 3% chance to raise a void spirit ally. Summons last longer, Void Spirits get +1 spirit, and Void Pact cools down 25% faster. Deals 20% less damage to mini-bosses and bosses.',
    startWeapon: 'void_spirits',
    startSpell: 'void_pact',
    baseSpeed: 100,
    stats: base({ maxHp: 150, regen: 0.7, armor: 3, duration: 1.2 }),
    available: true,
    unlock: 'Kill 5,000 enemies',
    glow: 0xb36bff,
  },
  riven: {
    id: 'riven',
    name: 'Riven',
    title: 'Techno-Engineer',
    desc: 'Deploys turrets from a backpack workshop. Plants her feet and builds.',
    passiveName: 'Overbuilt',
    passiveDesc: 'Stand still for 1 second to deploy a sentry turret (up to 2 at once). +25% damage to elites, mini-bosses and bosses.',
    startWeapon: 'sentry_turret',
    startSpell: 'nova_burst',
    baseSpeed: 100,
    stats: base({ maxHp: 145, regen: 0.6, armor: 3 }),
    available: true,
    unlock: 'Beat Chapter 2',
    glow: 0xffd34d,
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    title: 'Cursed-Coin Rogue',
    desc: 'A rogue whose cursed coin orbits them, bending the odds.',
    passiveName: 'Loaded Dice',
    passiveDesc: '+40% luck, chests cost 25% less and every level-up has a free reroll. Coins you pick up sometimes burst, damaging enemies nearby.',
    startWeapon: 'arc_chain',
    startSpell: 'gem_tempest',
    baseSpeed: 104,
    stats: base({ maxHp: 120, regen: 0.5, luck: 0.4, armor: 1 }),
    available: true,
    unlock: 'Open 100 chests',
    glow: 0xffb330,
  },
  pyre: {
    id: 'pyre',
    name: 'Pyre',
    title: 'Plasma Sorcerer',
    desc: 'Robes burning at the edges. Enormous damage, paper-thin.',
    passiveName: 'Kindling',
    passiveDesc: 'Leaves a trail of burning ground while moving. Deals up to +60% damage as HP falls. Low HP.',
    startWeapon: 'void_flame',
    startSpell: 'nova_burst',
    baseSpeed: 100,
    stats: base({ maxHp: 105, regen: 0.5, armor: 1, damage: 1.2, area: 1.15 }),
    available: true,
    unlock: 'Survive 15 minutes in Endless',
    glow: 0xff6a2a,
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);

export interface SkinDef {
  id: string;
  name: string;
  character: string | '*';
  unlock: string;
}

export const SKINS: Record<string, SkinDef> = {
  default: { id: 'default', name: 'Void-Forged', character: '*', unlock: 'Default' },
  sprout: { id: 'sprout', name: 'Sprout', character: '*', unlock: 'Beat Chapter 1' },
};
