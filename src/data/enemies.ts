/**
 * Enemy, elite, mini-boss and boss definitions. Sprites are drawn in
 * src/render/enemyArt.ts keyed by `sprite`; behaviours in src/game/enemyAI.ts.
 */

export type EnemyBehavior = 'chase' | 'flyer' | 'lunger' | 'shooter' | 'exploder' | 'artillery' | 'blinker' | 'eater' | 'orbiter';

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  coinChance: number;
  /** 0 = pushed around freely, 1 = immovable */
  mass: number;
  /** accent colour for death bursts */
  color: number;
  lore: string;
  /** flat damage reduction per hit (bone plating); a hit always deals at least 30% */
  armor?: number;
  /** shooter: bullets per volley (a fan) */
  shots?: number;
  /** shooter bullet colour */
  shotColor?: number;
  /** on death, burst into this many of another enemy */
  splitInto?: string;
  splitCount?: number;
}

/** global tuning knob: every enemy, mini-boss and boss hits this much harder */
export const ENEMY_DAMAGE_SCALE = 1.1;

export const ENEMIES: Record<string, EnemyDef> = {
  // ---------------- Chapter 3: the Black Sun
  rift_wraith: {
    id: 'rift_wraith', name: 'Rift Wraith', sprite: 'rift', behavior: 'blinker',
    hp: 24, speed: 38, damage: 11, radius: 9, xp: 4, coinChance: 0.4, mass: 0.2, color: 0xb36bff,
    lore: 'It steps through the dark instead of across it. Watch for the violet mark — that is where it will be.',
  },
  crystal_crawler: {
    id: 'crystal_crawler', name: 'Crystal Crawler', sprite: 'crystal', behavior: 'chase',
    hp: 28, speed: 50, damage: 13, radius: 9, xp: 3, coinChance: 0.35, mass: 0.4, color: 0x7ae0ff, armor: 2,
    splitInto: 'crystal_shard', splitCount: 3,
    lore: 'Starlight that set hard. Crack one and the pieces keep coming.',
  },
  crystal_shard: {
    id: 'crystal_shard', name: 'Crystal Shard', sprite: 'shard', behavior: 'flyer',
    hp: 6, speed: 96, damage: 7, radius: 5, xp: 1, coinChance: 0.05, mass: 0.05, color: 0x9fe8ff,
    lore: 'A sharp little piece of a crawler with a grudge.',
  },
  eclipse_seer: {
    id: 'eclipse_seer', name: 'Eclipse Seer', sprite: 'seer', behavior: 'shooter',
    hp: 30, speed: 40, damage: 10, radius: 9, xp: 4, coinChance: 0.45, mass: 0.15, color: 0xff6bd6, shots: 4, shotColor: 0xff9ae6,
    lore: 'Prophets of the black sun. Every prophecy is a fan of four bullets.',
  },
  heart_shard: {
    id: 'heart_shard', name: 'Heart Shard', sprite: 'heartshard', behavior: 'orbiter',
    hp: 260, speed: 0, damage: 18, radius: 10, xp: 2, coinChance: 0.5, mass: 1, color: 0xb36bff,
    lore: 'A shard of the Heart’s own shell, circling to protect it. While any shard holds, the Heart barely feels your blows.',
  },
  star_eater: {
    id: 'star_eater', name: 'Star-Eater', sprite: 'eater', behavior: 'eater',
    hp: 240, speed: 30, damage: 15, radius: 17, xp: 18, coinChance: 1, mass: 0.9, color: 0xff9a3d, armor: 4,
    lore: 'A mouth with a gravity well behind it. It drags you in. Do not be dragged in.',
  },
  // ---------------- Chapter 2: the Cathedral Moon
  bone_cultist: {
    id: 'bone_cultist', name: 'Bone-Plated Cultist', sprite: 'cultist', behavior: 'chase',
    hp: 22, speed: 46, damage: 14, radius: 8, xp: 3, coinChance: 0.35, mass: 0.35, color: 0xffd34d, armor: 3,
    lore: 'They wear their congregation. Small hits glance off the bone.',
  },
  candle_imp: {
    id: 'candle_imp', name: 'Candle Imp', sprite: 'candleimp', behavior: 'flyer',
    hp: 9, speed: 82, damage: 8, radius: 6, xp: 1, coinChance: 0.2, mass: 0.05, color: 0xff8a3d,
    lore: 'Born from the wax of ten thousand vigils. Burns fast, dies faster.',
  },
  choir_wraith: {
    id: 'choir_wraith', name: 'Choir Wraith', sprite: 'wraith', behavior: 'shooter',
    hp: 26, speed: 44, damage: 12, radius: 8, xp: 4, coinChance: 0.45, mass: 0.1, color: 0x9bcf4a, shots: 3, shotColor: 0xe4ff8a,
    lore: 'Still singing the last mass. Its notes are sharp enough to cut.',
  },
  thorn_horror: {
    id: 'thorn_horror', name: 'Thorn Horror', sprite: 'thorn', behavior: 'lunger',
    hp: 40, speed: 50, damage: 16, radius: 10, xp: 5, coinChance: 0.45, mass: 0.4, color: 0x9bcf4a,
    lore: 'The garden outgrew the walls, then outgrew its manners. It coils before it pounces.',
  },
  ossuary_brute: {
    id: 'ossuary_brute', name: 'Ossuary Brute', sprite: 'ossuary', behavior: 'chase',
    hp: 210, speed: 30, damage: 30, radius: 15, xp: 16, coinChance: 1, mass: 0.85, color: 0xd8d0b0, armor: 6,
    lore: 'Built from the crypt, one saint at a time. Swings the old bell like a hammer.',
  },

  scrap_crawler: {
    id: 'scrap_crawler',
    name: 'Scrap Crawler',
    sprite: 'crawler',
    behavior: 'chase',
    hp: 12,
    speed: 44,
    damage: 12,
    radius: 8,
    xp: 2,
    coinChance: 0.3,
    mass: 0.25,
    color: 0xff5a3d,
    lore: 'Hull plating that learned to walk. It wants the rest of the ship back.',
  },
  corrupted_drone: {
    id: 'corrupted_drone',
    name: 'Corrupted Drone',
    sprite: 'drone',
    behavior: 'flyer',
    hp: 7,
    speed: 72,
    damage: 9,
    radius: 6,
    xp: 1,
    coinChance: 0.22,
    mass: 0.05,
    color: 0x5cc8ff,
    lore: 'Maintenance drones still running their last order: “remove all intruders.”',
  },
  void_spawn: {
    id: 'void_spawn',
    name: 'Void Spawn',
    sprite: 'voidspawn',
    behavior: 'lunger',
    hp: 26,
    speed: 50,
    damage: 18,
    radius: 9,
    xp: 3,
    coinChance: 0.35,
    mass: 0.3,
    color: 0xff3df2,
    lore: 'What leaks out of a collapsed star. It coils, then it lunges.',
  },
  signal_drone: {
    id: 'signal_drone',
    name: 'Signal Drone',
    sprite: 'signal',
    behavior: 'shooter',
    hp: 18,
    speed: 46,
    damage: 11,
    radius: 7,
    xp: 3,
    coinChance: 0.4,
    mass: 0.1,
    color: 0xffa53d,
    lore: 'A corrupted relay drone. It hums before it fires — listen for it.',
  },
  volatile_cell: {
    id: 'volatile_cell',
    name: 'Volatile Cell',
    sprite: 'volatile',
    behavior: 'exploder',
    hp: 10,
    speed: 58,
    damage: 22,
    radius: 8,
    xp: 2,
    coinChance: 0.3,
    mass: 0.15,
    color: 0xb6ff4d,
    lore: 'A sac of unstable void. It swells when it gets close — and it takes its friends with it.',
  },
  mortar_husk: {
    id: 'mortar_husk',
    name: 'Mortar Husk',
    sprite: 'mortar',
    behavior: 'artillery',
    hp: 32,
    speed: 34,
    damage: 20,
    radius: 9,
    xp: 4,
    coinChance: 0.55,
    mass: 0.5,
    color: 0xffa53d,
    lore: 'A deck gun that crawled off its ship. It still remembers how to aim — watch the ground.',
  },
  scrap_hulk: {
    id: 'scrap_hulk',
    name: 'Scrap Hulk',
    sprite: 'hulk',
    behavior: 'chase',
    hp: 130,
    speed: 32,
    damage: 22,
    radius: 14,
    xp: 12,
    coinChance: 0.9,
    mass: 0.8,
    color: 0xff7a3d,
    lore: 'Several crawlers that agreed to become one very large opinion.',
  },
};

/** Elite modifiers (the "one twist"): also used by mini-bosses. */
export type EliteMod = 'shielded' | 'splits' | 'fast' | 'summoner' | 'regen';

export const ELITE_MODS: Record<EliteMod, { label: string; aura: number; desc: string }> = {
  shielded: { label: 'Shielded', aura: 0x6fb8ff, desc: 'Raises a barrier that blocks damage.' },
  splits: { label: 'Splitting', aura: 0xb6ff4d, desc: 'Splits into smaller copies when killed.' },
  fast: { label: 'Swift', aura: 0xffe24d, desc: 'Much faster than it has any right to be.' },
  summoner: { label: 'Summoner', aura: 0xd06bff, desc: 'Calls in reinforcements.' },
  regen: { label: 'Regenerating', aura: 0x4dff9d, desc: 'Heals over time.' },
};

export const ELITE_MOD_IDS = Object.keys(ELITE_MODS) as EliteMod[];

export interface MiniBossDef {
  id: string;
  name: string;
  sprite: string;
  twist: EliteMod;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  color: number;
  lore: string;
}

export const MINIBOSSES: Record<string, MiniBossDef> = {
  void_hound: {
    id: 'void_hound', name: 'The Twin-Headed Void Hound', sprite: 'hound', twist: 'fast',
    hp: 1000, speed: 82, damage: 18, radius: 19, color: 0xb36bff,
    lore: 'Two heads, one hunger. One breathes while the other bites. Dodge the second lunge — it always comes.',
  },
  crystal_colossus: {
    id: 'crystal_colossus', name: 'The Crystal Colossus', sprite: 'colossus', twist: 'splits',
    hp: 1100, speed: 30, damage: 20, radius: 22, color: 0x7ae0ff,
    lore: 'A mountain of frozen light. Break it in half and you have two problems.',
  },
  high_priest: {
    id: 'high_priest', name: 'The Rotted High Priest', sprite: 'priest', twist: 'summoner',
    hp: 1100, speed: 40, damage: 16, radius: 17, color: 0x9bcf4a,
    lore: 'He still leads the service. When his flock falls, he raises them again. Kill him first.',
  },
  gargoyle: {
    id: 'gargoyle', name: 'Cathedral Gargoyle', sprite: 'gargoyle', twist: 'fast',
    hp: 950, speed: 70, damage: 20, radius: 18, color: 0xffb330,
    lore: 'Carved to keep evil out. It has changed its mind about what evil is. Watch the ground when it rises.',
  },

  rogue_mech: {
    id: 'rogue_mech',
    name: 'Rogue Security Mech',
    sprite: 'mech',
    twist: 'shielded',
    hp: 950,
    speed: 46,
    damage: 18,
    radius: 18,
    color: 0xff4d4d,
    lore: 'Still guarding a bridge that no longer exists. Raises a barrier — wait it out.',
  },
  swarm_queen: {
    id: 'swarm_queen',
    name: 'Drone Swarm Queen',
    sprite: 'queen',
    twist: 'summoner',
    hp: 820,
    speed: 54,
    damage: 14,
    radius: 18,
    color: 0xffb330,
    lore: 'The hive-mind of every drone in the Graveyard. She is very busy and very rude.',
  },
};

export interface BossDef {
  id: string;
  name: string;
  sprite: string;
  hp: number;
  radius: number;
  damage: number;
  speed: number;
  /** HP fractions at which a new phase begins (descending) */
  phases: number[];
  color: number;
  lore: string;
  /** sprite anchor (feet) */
  anchorY?: number;
  /** music track while fighting it */
  music?: string;
}

export const BOSSES: Record<string, BossDef> = {
  star_titan: {
    id: 'star_titan',
    name: 'The Fallen Star-Titan',
    sprite: 'titan',
    hp: 21000,
    radius: 38,
    damage: 22,
    speed: 30,
    phases: [1, 0.66, 0.33],
    color: 0xff7a2a,
    lore: 'A war-machine built to carry a star. It dropped it. The core still burns.',
    music: 'boss_titan',
  },
  organ_beast: {
    id: 'organ_beast',
    name: 'The Organ-Beast',
    sprite: 'organ',
    hp: 21000,
    radius: 46,
    damage: 26,
    speed: 18,
    phases: [1, 0.66, 0.33],
    color: 0x9bcf4a,
    lore: 'The cathedral’s great organ, rotted alive. It plays one hymn, and the hymn is a weapon.',
    anchorY: 0.62,
    music: 'boss_organ',
  },
  heart_black_sun: {
    id: 'heart_black_sun',
    name: 'The Heart of the Black Sun',
    sprite: 'heart',
    hp: 21000,
    radius: 44,
    damage: 26,
    speed: 22,
    phases: [1, 0.66, 0.33],
    color: 0xb36bff,
    lore: 'Not a star that died, but a star that learned to want. Its shards orbit to shield it. Break them, then strike the heart.',
    anchorY: 0.5,
    music: 'boss_heart',
  },
};
