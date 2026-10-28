/**
 * Enemy, elite, mini-boss and boss definitions. Sprites are drawn in
 * src/render/enemyArt.ts keyed by `sprite`; behaviours in src/game/enemyAI.ts.
 */

export type EnemyBehavior = 'chase' | 'flyer' | 'lunger' | 'shooter' | 'exploder' | 'artillery' | 'blinker' | 'eater' | 'orbiter' | 'diver' | 'scribe' | 'spitter' | 'charger' | 'egg' | 'node';

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
  // ---------------- Chapter 4: the Frozen Archive (dark shapes, so they read against the snow)
  page_wraith: {
    id: 'page_wraith', name: 'Page Wraith', sprite: 'pagewraith', behavior: 'diver',
    hp: 14, speed: 70, damage: 8, radius: 7, xp: 2, coinChance: 0.25, mass: 0.05, color: 0x6a5acd,
    lore: 'Torn-out chapters that refuse to be forgotten. They circle in flocks, then dive along a line of ink.',
  },
  ink_hound: {
    id: 'ink_hound', name: 'Ink Hound', sprite: 'inkhound', behavior: 'lunger',
    hp: 30, speed: 56, damage: 9, radius: 9, xp: 3, coinChance: 0.35, mass: 0.35, color: 0x3a4a8a,
    lore: 'A spilled inkwell that learned to hunt. It crouches before it springs.',
  },
  frost_scribe: {
    id: 'frost_scribe', name: 'Frost Scribe', sprite: 'scribe', behavior: 'scribe',
    hp: 34, speed: 36, damage: 10, radius: 9, xp: 5, coinChance: 0.45, mass: 0.2, color: 0x4fb8ff,
    lore: 'Still copying the last book. Every glyph it writes on the floor freezes whoever stands on it.',
  },
  tome_golem: {
    id: 'tome_golem', name: 'Tome Golem', sprite: 'tomegolem', behavior: 'chase',
    hp: 200, speed: 26, damage: 20, radius: 15, xp: 16, coinChance: 1, mass: 0.85, color: 0x8a5a3a, armor: 6,
    lore: 'An encyclopedia bound in iron. Small hits bounce off the cover.',
  },
  echo_moth: {
    id: 'echo_moth', name: 'Echo Moth', sprite: 'moth', behavior: 'flyer',
    hp: 10, speed: 86, damage: 6, radius: 6, xp: 1, coinChance: 0.15, mass: 0.05, color: 0x8a6ad0,
    splitInto: 'moth_echo', splitCount: 1,
    lore: 'It eats silence. Kill one and its echo flutters on a moment longer.',
  },
  moth_echo: {
    id: 'moth_echo', name: 'Moth Echo', sprite: 'mothecho', behavior: 'flyer',
    hp: 4, speed: 104, damage: 5, radius: 5, xp: 1, coinChance: 0.05, mass: 0.05, color: 0xb8a0ff,
    lore: 'The last flutter of an Echo Moth. Gone the moment it is touched.',
  },
  // ---------------- Chapter 5: the Hive Below
  broodling: {
    id: 'broodling', name: 'Broodling', sprite: 'broodling', behavior: 'chase',
    hp: 5, speed: 66, damage: 5, radius: 5, xp: 1, coinChance: 0.08, mass: 0.05, color: 0xa0d040,
    lore: 'The swarm in its smallest form. There are always, always more.',
  },
  acid_spitter: {
    id: 'acid_spitter', name: 'Acid Spitter', sprite: 'spitter', behavior: 'spitter',
    hp: 32, speed: 38, damage: 11, radius: 9, xp: 4, coinChance: 0.45, mass: 0.2, color: 0x9aff3d,
    lore: 'It lobs a glob where you are going to be. The glob stays there. Do not stay there.',
  },
  carapace_charger: {
    id: 'carapace_charger', name: 'Carapace Charger', sprite: 'charger', behavior: 'charger',
    hp: 80, speed: 40, damage: 15, radius: 12, xp: 8, coinChance: 0.7, mass: 0.7, color: 0xd08a3d, armor: 4,
    lore: 'A battering ram with legs. It lowers its horn, marks a line, and goes.',
  },
  egg_sac: {
    id: 'egg_sac', name: 'Egg Sac', sprite: 'eggsac', behavior: 'egg',
    hp: 46, speed: 0, damage: 0, radius: 10, xp: 3, coinChance: 0.3, mass: 1, color: 0xe8c850,
    lore: 'Leave it and it hatches. Pop it before the shell splits.',
  },
  hive_drone: {
    id: 'hive_drone', name: 'Hive Drone', sprite: 'hivedrone', behavior: 'flyer',
    hp: 16, speed: 80, damage: 7, radius: 7, xp: 2, coinChance: 0.25, mass: 0.1, color: 0xffb33d,
    lore: 'The swarm’s scouts. Where one goes, the rest follow.',
  },
  hive_node: {
    id: 'hive_node', name: 'Armoured Node', sprite: 'hivenode', behavior: 'node',
    hp: 300, speed: 0, damage: 16, radius: 12, xp: 3, coinChance: 0.6, mass: 1, color: 0xff6a8a, armor: 3,
    lore: 'A knot of the Swarm Mind’s nerves, wrapped in carapace. While any node beats, the Mind barely feels your blows.',
  },
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
  archivist: {
    id: 'archivist', name: 'The Archivist', sprite: 'archivist', twist: 'regen',
    hp: 1100, speed: 42, damage: 16, radius: 18, color: 0x7ab8ff,
    lore: 'Keeper of every book ever written, including the one about you. It reads your last spell back at you.',
  },
  ice_wyrm: {
    id: 'ice_wyrm', name: 'The Ice Wyrm', sprite: 'wyrm', twist: 'fast',
    hp: 1050, speed: 62, damage: 17, radius: 20, color: 0x9fe8ff,
    lore: 'It swims through snow like water. When the ground starts to bulge, move.',
  },
  hive_knight: {
    id: 'hive_knight', name: 'The Hive Knight', sprite: 'hiveknight', twist: 'shielded',
    hp: 1150, speed: 46, damage: 18, radius: 19, color: 0xd08a3d,
    lore: 'The swarm grew itself a champion and armoured it in its own shell. Wait out the carapace, then strike.',
  },
  twin_larva: {
    id: 'twin_larva', name: 'The Twin Larvae', sprite: 'larva', twist: 'splits',
    hp: 700, speed: 44, damage: 18, radius: 17, color: 0xa0d040,
    lore: 'Two halves of one hunger. Kill one and the other grows frantic.',
  },
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
  librarian: {
    id: 'librarian',
    name: 'The Librarian of Silence',
    sprite: 'librarian',
    hp: 23000,
    radius: 42,
    damage: 27,
    speed: 22,
    phases: [1, 0.66, 0.33],
    color: 0x7ab8ff,
    lore: 'It catalogued every sound until there were none left. Inside its circles of silence, your weapons fall quiet.',
    anchorY: 0.62,
    music: 'boss_librarian',
  },
  swarm_mind: {
    id: 'swarm_mind',
    name: 'The Swarm Mind',
    sprite: 'swarmmind',
    hp: 25000,
    radius: 48,
    damage: 28,
    speed: 16,
    phases: [1, 0.66, 0.33],
    color: 0xff6a8a,
    lore: 'Every crawler, drone and wraith was a thought it had. Break its nodes, then break the mind.',
    anchorY: 0.58,
    music: 'boss_mind',
  },
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
