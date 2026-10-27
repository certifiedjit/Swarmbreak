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
    desc: 'Very fast, very fragile. Grabs everything.',
    passiveName: 'Afterimage',
    passiveDesc: 'Bonus pickup range and dodge.',
    startWeapon: 'plasma_glaive',
    startSpell: 'aegis_dash',
    baseSpeed: 128,
    stats: base({ maxHp: 80, pickupRange: 110, dodge: 0.12 }),
    available: false,
    unlock: 'Beat Chapter 1',
    glow: 0xff4dd2,
  },
  voidcaller: {
    id: 'voidcaller',
    name: 'Voidcaller',
    title: 'Hooded Summoner',
    desc: 'Binds void spirits that last longer and multiply.',
    passiveName: 'Binding',
    passiveDesc: 'Summons last longer and multiply. Weak herself.',
    startWeapon: 'rune_halo',
    startSpell: 'chrono_hush',
    baseSpeed: 100,
    stats: base({ maxHp: 85, duration: 1.3 }),
    available: false,
    unlock: 'Kill 5,000 enemies',
    glow: 0xb36bff,
  },
  riven: {
    id: 'riven',
    name: 'Riven',
    title: 'Techno-Engineer',
    desc: 'Deploys turrets and drones from a backpack workshop.',
    passiveName: 'Overbuilt',
    passiveDesc: '+1 projectile on every weapon.',
    startWeapon: 'seeker_swarm',
    startSpell: 'nova_burst',
    baseSpeed: 100,
    stats: base({ maxHp: 100, projectiles: 1 }),
    available: false,
    unlock: 'Beat Chapter 2',
    glow: 0xffd34d,
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    title: 'Cursed-Coin Rogue',
    desc: 'A rogue whose cursed coin orbits them, bending odds.',
    passiveName: 'Loaded Dice',
    passiveDesc: 'Cheaper chests and much higher luck. Low armour.',
    startWeapon: 'arc_chain',
    startSpell: 'gem_tempest',
    baseSpeed: 104,
    stats: base({ maxHp: 95, luck: 0.4, armor: -2 }),
    available: false,
    unlock: 'Open 100 chests',
    glow: 0xffb330,
  },
  pyre: {
    id: 'pyre',
    name: 'Pyre',
    title: 'Plasma Sorcerer',
    desc: 'Robes burning at the edges. Enormous damage, paper-thin.',
    passiveName: 'Kindling',
    passiveDesc: 'Huge damage and area. Very low HP.',
    startWeapon: 'gravemaul',
    startSpell: 'nova_burst',
    baseSpeed: 98,
    stats: base({ maxHp: 65, damage: 1.35, area: 1.25 }),
    available: false,
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
