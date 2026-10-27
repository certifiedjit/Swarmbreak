/**
 * Weapon definitions. Behaviour lives in src/game/weapons.ts (keyed by `kind`);
 * these are the numbers. To add a weapon: add a def here, add its `kind`
 * behaviour (or reuse one), draw an icon in src/render/icons.ts.
 */

export type WeaponKind =
  | 'arc' | 'orbit' | 'chain' | 'boomerang' | 'homing' | 'shockwave' | 'aura'
  | 'cryo' | 'puddle' | 'laser' | 'bouncer' | 'turret' | 'wheels' | 'scythe' | 'starfall' | 'ricochet' | 'blackhole' | 'flame' | 'spirits';

export interface WeaponStats {
  /** damage per hit */
  damage: number;
  /** seconds between activations (orbit: per-enemy hit interval) */
  cooldown: number;
  /** size multiplier */
  area: number;
  /** projectiles / strikes / blades / waves */
  amount: number;
  /** projectile / rotation speed multiplier */
  speed: number;
  /** lifetime multiplier */
  duration: number;
  /** extra enemies a projectile passes through (-1 = infinite) */
  pierce: number;
  /** push strength */
  knockback: number;
  /** chain jumps (lightning) */
  chain: number;
}

/** One level step. damage/knockback are flat; area/speed/duration add to multipliers; cooldownPct shortens cooldown. */
export interface WeaponDelta {
  damage?: number;
  cooldownPct?: number;
  area?: number;
  amount?: number;
  speed?: number;
  duration?: number;
  pierce?: number;
  knockback?: number;
  chain?: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  /** one-liner for cards */
  desc: string;
  /** glow colour used for its effects */
  color: number;
  base: WeaponStats;
  /** deltas for levels 2..7 (index 0 = level 2) */
  levels: WeaponDelta[];
  /** passive id that, with this weapon at max level, unlocks the evolution */
  evolvesWith?: string;
  evolvesInto?: string;
  /** true for evolved forms (they have a single level) */
  evolved?: boolean;
  lore?: string;
}

export const WEAPON_MAX_LEVEL = 7;

const W = (d: WeaponDef): WeaponDef => d;

export const WEAPONS: Record<string, WeaponDef> = {
  oathblade: W({
    id: 'oathblade',
    name: 'Oathblade',
    kind: 'arc',
    desc: 'A plasma blade cleaves a wide arc in front of you.',
    color: 0x6ff3ff,
    base: { damage: 22, cooldown: 0.85, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 90, chain: 0 },
    levels: [{ amount: 1 }, { damage: 10 }, { area: 0.25, damage: 6 }, { cooldownPct: 0.15 }, { damage: 16 }, { area: 0.25, amount: 1 }],
    evolvesWith: 'runeplate',
    evolvesInto: 'oathbreaker',
    lore: 'Forged from a dead star’s last light. It remembers every promise.',
  }),
  rune_halo: W({
    id: 'rune_halo',
    name: 'Rune Halo',
    kind: 'orbit',
    desc: 'Rune-etched blades orbit you, cutting anything they touch.',
    color: 0x9b7bff,
    base: { damage: 9, cooldown: 0.5, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 30, chain: 0 },
    levels: [{ amount: 1 }, { damage: 5 }, { amount: 1, area: 0.1 }, { speed: 0.3, damage: 4 }, { area: 0.25 }, { amount: 1, damage: 6 }],
    evolvesWith: 'star_lens',
    evolvesInto: 'rune_corona',
    lore: 'Each blade bears a name. None of them are friendly.',
  }),
  arc_chain: W({
    id: 'arc_chain',
    name: 'Arc Chain',
    kind: 'chain',
    desc: 'Lightning strikes the nearest foe and leaps to others.',
    color: 0x7fd8ff,
    base: { damage: 16, cooldown: 1.5, area: 1, amount: 1, speed: 1, duration: 1, pierce: 0, knockback: 10, chain: 2 },
    levels: [{ chain: 1 }, { damage: 7 }, { amount: 1 }, { chain: 2, area: 0.15 }, { cooldownPct: 0.15 }, { damage: 10, amount: 1 }],
    evolvesWith: 'conductor_coil',
    evolvesInto: 'tempest_crown',
    lore: 'Salvaged from a capital ship’s reactor. Still hungry.',
  }),
  plasma_glaive: W({
    id: 'plasma_glaive',
    name: 'Plasma Glaive',
    kind: 'boomerang',
    desc: 'A spinning glaive flies out and returns, cutting through everything.',
    color: 0xff8a3d,
    base: { damage: 20, cooldown: 1.7, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 40, chain: 0 },
    levels: [{ amount: 1 }, { damage: 8 }, { area: 0.25 }, { amount: 1 }, { speed: 0.25, damage: 6 }, { damage: 10, cooldownPct: 0.1 }],
    evolvesWith: 'void_boots',
    evolvesInto: 'comet_glaive',
    lore: 'Throw it hard enough and it forgets to come back. So far, it always has.',
  }),
  seeker_swarm: W({
    id: 'seeker_swarm',
    name: 'Seeker Swarm',
    kind: 'homing',
    desc: 'Fires homing micro-missiles that burst on impact.',
    color: 0xffd34d,
    base: { damage: 11, cooldown: 1.35, area: 1, amount: 2, speed: 1, duration: 1, pierce: 0, knockback: 30, chain: 0 },
    levels: [{ amount: 1 }, { damage: 5 }, { area: 0.3 }, { amount: 2 }, { cooldownPct: 0.15 }, { damage: 8, amount: 1 }],
    evolvesWith: 'twin_capacitor',
    evolvesInto: 'hive_barrage',
    lore: 'Each missile has a tiny mind and a single dream.',
  }),
  gravemaul: W({
    id: 'gravemaul',
    name: 'Gravemaul Slam',
    kind: 'shockwave',
    desc: 'Slam the ground, sending a crushing shockwave outward.',
    color: 0x5effc8,
    base: { damage: 26, cooldown: 2.7, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 140, chain: 0 },
    levels: [{ damage: 8 }, { area: 0.15 }, { cooldownPct: 0.12 }, { amount: 1 }, { damage: 10, knockback: 40 }, { area: 0.2, damage: 8 }],
    evolvesWith: 'lodestone',
    evolvesInto: 'singularity_slam',
    lore: 'The ground of the Graveyard is mostly old hull. It rings like a bell.',
  }),

  searing_mantle: W({
    id: 'searing_mantle',
    name: 'Searing Mantle',
    kind: 'aura',
    desc: 'A ring of plasma fire around you scorches everything inside it.',
    color: 0xff6a2a,
    base: { damage: 7, cooldown: 0.45, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 22, chain: 0 },
    levels: [{ damage: 3 }, { area: 0.15 }, { cooldownPct: 0.12 }, { damage: 4 }, { area: 0.2 }, { damage: 5, area: 0.1 }],
    evolvesWith: 'phoenix_ember',
    evolvesInto: 'sunheart_mantle',
    lore: 'Woven from the last flare of a dying star. It is never quite done burning.',
  }),

  cryo_shards: W({
    id: 'cryo_shards', name: 'Cryo Shards', kind: 'cryo', color: 0x9fe8ff,
    desc: 'Fires a fan of ice shards that freeze whatever they hit.',
    base: { damage: 10, cooldown: 1.35, area: 1, amount: 3, speed: 1, duration: 1, pierce: 1, knockback: 20, chain: 0 },
    levels: [{ amount: 1 }, { damage: 5 }, { pierce: 1 }, { duration: 0.3 }, { amount: 2 }, { damage: 8, cooldownPct: 0.1 }],
    evolvesWith: 'hourglass', evolvesInto: 'absolute_zero',
    lore: 'Cut from the frozen wake of a ship that flew too close to nothing.',
  }),
  corrosive_flask: W({
    id: 'corrosive_flask', name: 'Corrosive Flask', kind: 'puddle', color: 0x9dff4d,
    desc: 'Lobs flasks that leave pools of acid on the ground.',
    base: { damage: 6, cooldown: 2.2, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 0, chain: 0 },
    levels: [{ damage: 2 }, { amount: 1 }, { area: 0.2 }, { duration: 0.3 }, { amount: 1 }, { damage: 4, area: 0.2 }],
    evolvesWith: 'blood_chalice', evolvesInto: 'plague_font',
    lore: 'The label just says DO NOT. Someone did.',
  }),
  sweep_laser: W({
    id: 'sweep_laser', name: 'Sweep Laser', kind: 'laser', color: 0xff4d6d,
    desc: 'A long laser beam sweeps across the swarm in front of you.',
    base: { damage: 18, cooldown: 2.3, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 10, chain: 0 },
    levels: [{ damage: 6 }, { area: 0.2 }, { cooldownPct: 0.15 }, { amount: 1 }, { damage: 9 }, { duration: 0.3, area: 0.2 }],
    evolvesWith: 'reaper_sigil', evolvesInto: 'judgement_ray',
    lore: 'Mining equipment, technically.',
  }),
  gravity_bombs: W({
    id: 'gravity_bombs', name: 'Gravity Bombs', kind: 'bouncer', color: 0xb36bff,
    desc: 'Hurls bombs that bounce through the swarm, then implode.',
    base: { damage: 26, cooldown: 2.4, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 0, chain: 0 },
    levels: [{ amount: 1 }, { damage: 9 }, { area: 0.2 }, { amount: 1 }, { duration: 0.3 }, { damage: 13, area: 0.2 }],
    evolvesWith: 'cursed_clover', evolvesInto: 'chaos_orbs',
    lore: 'Each one contains a very small, very angry star.',
  }),
  sentry_turret: W({
    id: 'sentry_turret', name: 'Sentry Turret', kind: 'turret', color: 0xffd34d,
    desc: 'Deploys a sentry turret that shoots the nearest enemy.',
    base: { damage: 9, cooldown: 6, area: 1, amount: 1, speed: 1, duration: 1, pierce: 0, knockback: 20, chain: 0 },
    levels: [{ damage: 3 }, { duration: 0.3 }, { amount: 1 }, { speed: 0.3 }, { damage: 5 }, { amount: 1 }],
    evolvesWith: 'field_battery', evolvesInto: 'bastion_array',
    lore: 'Fold-out, fire-and-forget, and fiercely territorial.',
  }),
  aegis_wheels: W({
    id: 'aegis_wheels', name: 'Aegis Wheels', kind: 'wheels', color: 0x6fb8ff,
    desc: 'Heavy shields circle wide around you, smashing enemies away and blocking shots.',
    base: { damage: 12, cooldown: 0.6, area: 1, amount: 2, speed: 1, duration: 1, pierce: -1, knockback: 160, chain: 0 },
    levels: [{ damage: 4 }, { amount: 1 }, { area: 0.15 }, { knockback: 60 }, { speed: 0.3 }, { amount: 1, damage: 6 }],
    evolvesWith: 'briar_crown', evolvesInto: 'bramble_bulwark',
    lore: 'Cathedral doors, liberated.',
  }),
  soul_scythe: W({
    id: 'soul_scythe', name: 'Soul Scythe', kind: 'scythe', color: 0x8affc1,
    desc: 'A spectral scythe reaps a full circle around you at long range.',
    base: { damage: 26, cooldown: 2.2, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 50, chain: 0 },
    levels: [{ damage: 8 }, { area: 0.15 }, { cooldownPct: 0.12 }, { amount: 1 }, { damage: 10 }, { area: 0.2, damage: 6 }],
    evolvesWith: 'leech_fang', evolvesInto: 'reapers_harvest',
    lore: 'It only cuts what is already dead. Everything here is already dead.',
  }),
  starfall: W({
    id: 'starfall', name: 'Starfall', kind: 'starfall', color: 0xffe6a0,
    desc: 'Dying stars fall from the sky onto random enemies.',
    base: { damage: 32, cooldown: 1.9, area: 1, amount: 2, speed: 1, duration: 1, pierce: -1, knockback: 60, chain: 0 },
    levels: [{ amount: 1 }, { damage: 10 }, { area: 0.2 }, { amount: 1 }, { cooldownPct: 0.15 }, { damage: 14, amount: 1 }],
    evolvesWith: 'archive_core', evolvesInto: 'starfall_requiem',
    lore: 'The system had twelve suns. It is down to the ones you throw.',
  }),
  ricochet: W({
    id: 'ricochet', name: 'Ricochet Rounds', kind: 'ricochet', color: 0xb6c3ff,
    desc: 'Fires rounds that ricochet from enemy to enemy.',
    base: { damage: 10, cooldown: 0.9, area: 1, amount: 1, speed: 1, duration: 1, pierce: 0, knockback: 30, chain: 3 },
    levels: [{ chain: 1 }, { damage: 4 }, { amount: 1 }, { chain: 2 }, { cooldownPct: 0.15 }, { damage: 6, amount: 1 }],
    evolvesWith: 'phase_veil', evolvesInto: 'phantom_volley',
    lore: 'Aim is optional. Walls are encouraged.',
  }),
  black_hole: W({
    id: 'black_hole', name: 'Pocket Singularity', kind: 'blackhole', color: 0x8a5cff,
    desc: 'Opens a small black hole that drags enemies in and crushes them.',
    base: { damage: 6, cooldown: 5, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 0, chain: 0 },
    levels: [{ damage: 2 }, { duration: 0.3 }, { area: 0.2 }, { cooldownPct: 0.15 }, { amount: 1 }, { damage: 4, area: 0.2 }],
    evolvesWith: 'void_heart', evolvesInto: 'event_horizon',
    lore: 'Pocket-sized. Do not put it in your pocket.',
  }),
  void_flame: W({
    id: 'void_flame', name: 'Void Flame', kind: 'flame', color: 0xd06bff,
    desc: 'Breathes a cone of purple void fire the way you are facing.',
    base: { damage: 6, cooldown: 1.9, area: 1, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 15, chain: 0 },
    levels: [{ damage: 2 }, { area: 0.2 }, { duration: 0.3 }, { damage: 3 }, { amount: 1 }, { area: 0.25, damage: 3 }],
    evolvesWith: 'cinder_core', evolvesInto: 'abyssal_breath',
    lore: 'It burns cold, and then it burns everything.',
  }),
  void_spirits: W({
    id: 'void_spirits', name: 'Void Spirits', kind: 'spirits', color: 0xc46dff,
    desc: 'Summons void spirits that hunt the nearest enemies.',
    base: { damage: 8, cooldown: 4, area: 1, amount: 2, speed: 1, duration: 1, pierce: -1, knockback: 15, chain: 0 },
    levels: [{ amount: 1 }, { damage: 3 }, { duration: 0.3 }, { amount: 1 }, { damage: 4 }, { amount: 2 }],
    evolvesWith: 'soul_lantern', evolvesInto: 'void_legion',
    lore: 'They used to be someone. Now they are on your side.',
  }),

  // ---------- Evolutions ----------
  oathbreaker: W({
    id: 'oathbreaker',
    name: 'Oathbreaker',
    kind: 'arc',
    evolved: true,
    desc: 'Twin crescents carve a full circle. Every hit mends you.',
    color: 0xb4ffff,
    base: { damage: 70, cooldown: 0.75, area: 1.5, amount: 2, speed: 1, duration: 1, pierce: -1, knockback: 120, chain: 0 },
    levels: [],
    lore: 'Some oaths are kept by breaking everything else.',
  }),
  rune_corona: W({
    id: 'rune_corona',
    name: 'Rune Corona',
    kind: 'orbit',
    evolved: true,
    desc: 'A breathing ring of eight runeblades that sears what it cuts.',
    color: 0xc9a8ff,
    base: { damage: 24, cooldown: 0.35, area: 1.5, amount: 8, speed: 1.4, duration: 1, pierce: -1, knockback: 45, chain: 0 },
    levels: [],
    lore: 'The runes finally finished their sentence.',
  }),
  tempest_crown: W({
    id: 'tempest_crown',
    name: 'Tempest Crown',
    kind: 'chain',
    evolved: true,
    desc: 'A storm crown that strikes every enemy on screen.',
    color: 0xcff4ff,
    base: { damage: 24, cooldown: 1.4, area: 1.3, amount: 1, speed: 1, duration: 1, pierce: 0, knockback: 20, chain: 2 },
    levels: [],
    lore: 'Wear it, and the sky takes your side.',
  }),
  comet_glaive: W({
    id: 'comet_glaive',
    name: 'Comet Glaive',
    kind: 'boomerang',
    evolved: true,
    desc: 'Four blazing glaives spiral out and back, leaving burning trails.',
    color: 0xffb36b,
    base: { damage: 40, cooldown: 1.6, area: 1.4, amount: 4, speed: 1.3, duration: 1.2, pierce: -1, knockback: 60, chain: 0 },
    levels: [],
    lore: 'It came back with a tail.',
  }),
  hive_barrage: W({
    id: 'hive_barrage',
    name: 'Hive Barrage',
    kind: 'homing',
    evolved: true,
    desc: 'An endless volley of seekers that split into more seekers.',
    color: 0xfff27a,
    base: { damage: 22, cooldown: 0.9, area: 1.4, amount: 6, speed: 1.25, duration: 1, pierce: 0, knockback: 40, chain: 0 },
    levels: [],
    lore: 'The tiny minds have started a union.',
  }),
  sunheart_mantle: W({
    id: 'sunheart_mantle',
    name: 'Sunheart Mantle',
    kind: 'aura',
    evolved: true,
    desc: 'A blazing corona that sears all around you and erupts in solar shockwaves.',
    color: 0xffb330,
    base: { damage: 19, cooldown: 0.35, area: 1.5, amount: 1, speed: 1, duration: 1, pierce: -1, knockback: 40, chain: 0 },
    levels: [],
    lore: 'You are the star now. Try not to collapse.',
  }),
  singularity_slam: W({
    id: 'singularity_slam',
    name: 'Singularity Slam',
    kind: 'shockwave',
    evolved: true,
    desc: 'Drag the swarm inward, then crush it with a double shockwave.',
    color: 0x8affd8,
    base: { damage: 70, cooldown: 2.3, area: 1.45, amount: 2, speed: 1, duration: 1, pierce: -1, knockback: 60, chain: 0 },
    levels: [],
    lore: 'Gravity, but personal.',
  }),
  absolute_zero: W({
    id: 'absolute_zero', name: 'Absolute Zero', kind: 'cryo', evolved: true, color: 0xdff8ff,
    desc: 'A ring of frost bursts outward, freezing everything around you.',
    base: { damage: 30, cooldown: 1.6, area: 1.4, amount: 16, speed: 1, duration: 2, pierce: 4, knockback: 30, chain: 0 }, levels: [],
    lore: 'The coldest place in the system is wherever you are standing.',
  }),
  plague_font: W({
    id: 'plague_font', name: 'Plague Font', kind: 'puddle', evolved: true, color: 0xc6ff4d,
    desc: 'Huge spreading acid pools that mend you while you stand in them.',
    base: { damage: 15, cooldown: 1.7, area: 1.6, amount: 4, speed: 1, duration: 1.6, pierce: -1, knockback: 0, chain: 0 }, levels: [],
    lore: 'Drink from it. Actually, don’t.',
  }),
  judgement_ray: W({
    id: 'judgement_ray', name: 'Judgement Ray', kind: 'laser', evolved: true, color: 0xff9aaa,
    desc: 'Twin beams sweep around you. Every hit is a critical hit.',
    base: { damage: 25, cooldown: 2.4, area: 1.4, amount: 2, speed: 1, duration: 1.2, pierce: -1, knockback: 20, chain: 0 }, levels: [],
    lore: 'The verdict is always the same.',
  }),
  chaos_orbs: W({
    id: 'chaos_orbs', name: 'Chaos Orbs', kind: 'bouncer', evolved: true, color: 0xe0a8ff,
    desc: 'Lucky orbs that burst into more orbs.',
    base: { damage: 44, cooldown: 2.1, area: 1.4, amount: 3, speed: 1.2, duration: 1, pierce: -1, knockback: 0, chain: 0 }, levels: [],
    lore: 'Statistically, something good happens. Eventually.',
  }),
  bastion_array: W({
    id: 'bastion_array', name: 'Bastion Array', kind: 'turret', evolved: true, color: 0xfff27a,
    desc: 'Three turrets fire bursts and arc lightning between each other.',
    base: { damage: 16, cooldown: 5, area: 1.3, amount: 3, speed: 1.6, duration: 1.6, pierce: 0, knockback: 30, chain: 0 }, levels: [],
    lore: 'A fortress that folds into a backpack.',
  }),
  bramble_bulwark: W({
    id: 'bramble_bulwark', name: 'Bramble Bulwark', kind: 'wheels', evolved: true, color: 0xb0ff6a,
    desc: 'Four thorned bulwarks that shred enemies and swat shots out of the air.',
    base: { damage: 28, cooldown: 0.45, area: 1.35, amount: 4, speed: 1.3, duration: 1, pierce: -1, knockback: 220, chain: 0 }, levels: [],
    lore: 'The garden fights back.',
  }),
  reapers_harvest: W({
    id: 'reapers_harvest', name: 'Reaper’s Harvest', kind: 'scythe', evolved: true, color: 0xc6ffe0,
    desc: 'Twin reaping circles. Every soul taken heals you.',
    base: { damage: 52, cooldown: 1.8, area: 1.4, amount: 2, speed: 1, duration: 1, pierce: -1, knockback: 70, chain: 0 }, levels: [],
    lore: 'A bountiful season.',
  }),
  starfall_requiem: W({
    id: 'starfall_requiem', name: 'Starfall Requiem', kind: 'starfall', evolved: true, color: 0xfff3d6,
    desc: 'A meteor storm: a sky full of stars, each leaving a burning crater.',
    base: { damage: 46, cooldown: 1.6, area: 1.3, amount: 8, speed: 1, duration: 1, pierce: -1, knockback: 80, chain: 0 }, levels: [],
    lore: 'Make a wish. Make several.',
  }),
  phantom_volley: W({
    id: 'phantom_volley', name: 'Phantom Volley', kind: 'ricochet', evolved: true, color: 0xe0e6ff,
    desc: 'Phantom rounds that split on every bounce.',
    base: { damage: 16, cooldown: 0.75, area: 1, amount: 3, speed: 1.3, duration: 1, pierce: 0, knockback: 30, chain: 6 }, levels: [],
    lore: 'You only fired once. Probably.',
  }),
  event_horizon: W({
    id: 'event_horizon', name: 'Event Horizon', kind: 'blackhole', evolved: true, color: 0xb08aff,
    desc: 'A huge singularity that swallows the swarm, then collapses in a nova.',
    base: { damage: 12, cooldown: 4.5, area: 1.7, amount: 1, speed: 1, duration: 1.5, pierce: -1, knockback: 0, chain: 0 }, levels: [],
    lore: 'Past this point, nothing comes back. Except loot.',
  }),
  abyssal_breath: W({
    id: 'abyssal_breath', name: 'Abyssal Breath', kind: 'flame', evolved: true, color: 0xf0a8ff,
    desc: 'Twin roaring cones of void fire that leave the ground burning.',
    base: { damage: 10, cooldown: 1.6, area: 1.5, amount: 2, speed: 1, duration: 1.4, pierce: -1, knockback: 25, chain: 0 }, levels: [],
    lore: 'The abyss breathes out. Stand behind it.',
  }),
  void_legion: W({
    id: 'void_legion', name: 'Void Legion', kind: 'spirits', evolved: true, color: 0xe0a8ff,
    desc: 'A legion of spirits that never fade and multiply when they kill.',
    base: { damage: 14, cooldown: 2.5, area: 1.2, amount: 6, speed: 1.3, duration: 99, pierce: -1, knockback: 20, chain: 0 }, levels: [],
    lore: 'There are always more of them. That is the point.',
  }),
};

/** All non-evolved weapons. */
export const ALL_WEAPON_IDS = Object.values(WEAPONS).filter((w) => !w.evolved).map((w) => w.id);
/** Weapons in the pool from the start; the rest unlock in the Armory or by achievements (systems/weaponUnlocks.ts). */
export const STARTER_WEAPON_IDS = ['oathblade', 'rune_halo', 'arc_chain', 'plasma_glaive', 'seeker_swarm', 'gravemaul', 'searing_mantle'];
/** kept for callers that want "every base weapon" */
export const BASE_WEAPON_IDS = ALL_WEAPON_IDS;

export function describeDelta(d: WeaponDelta): string {
  const p: string[] = [];
  if (d.damage) p.push(`+${d.damage} damage`);
  if (d.amount) p.push(`+${d.amount} ${d.amount === 1 ? 'projectile' : 'projectiles'}`);
  if (d.chain) p.push(`+${d.chain} chain`);
  if (d.area) p.push(`+${Math.round(d.area * 100)}% area`);
  if (d.cooldownPct) p.push(`-${Math.round(d.cooldownPct * 100)}% cooldown`);
  if (d.speed) p.push(`+${Math.round(d.speed * 100)}% speed`);
  if (d.duration) p.push(`+${Math.round(d.duration * 100)}% duration`);
  if (d.pierce) p.push(`+${d.pierce} pierce`);
  if (d.knockback) p.push(`+knockback`);
  return p.join(', ');
}
