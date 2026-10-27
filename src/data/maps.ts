/**
 * Map definitions. To add a map: add an entry here, give it floor/decor art in
 * src/render/mapArt.ts (keyed by `art`), a music track in src/audio/music.ts
 * (keyed by `music`) and, if it has a new hazard, a hazard kind in src/game/hazards.ts.
 */

export interface StoryCard {
  title: string;
  lines: string[];
  /** art scene id drawn by src/render/storyArt.ts */
  art: string;
}

export interface RoundSpec {
  /** kills to fill this round's meter */
  kills: number;
  /** how many enemies the director keeps alive (rises within the round) */
  density: number;
  /** enemy stat multipliers for this round */
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  /** relative spawn weights by enemy id */
  mix: Record<string, number>;
  /** chance that a spawn wave includes a named elite */
  eliteChance: number;
}

export interface HazardSpec {
  kind: 'powerline' | 'steamvent' | 'bell' | 'lightbeam' | 'gravitywell';
  count: number;
}

export interface MapDef {
  id: string;
  name: string;
  chapter: number;
  available: boolean;
  width: number;
  height: number;
  art: string;
  music: string;
  bossMusic: string;
  /** css colour for UI tinting */
  accent: string;
  rounds: RoundSpec[];
  /** mini-boss ids, one per gap between rounds (4 for 5 rounds) */
  minibosses: string[];
  boss: string;
  hazards: HazardSpec[];
  /** a shrinking circle of light: radius (px) at the start of a round and once its kill meter fills */
  darkness?: { from: number; to: number };
  chests: number;
  shrines: number;
  cursedShrines: number;
  /** endless mode enemy mix */
  endlessMix: Record<string, number>;
  storyBefore: StoryCard;
  storyAfter: StoryCard;
}

export const ROUND_COUNT = 5;

export const MAPS: Record<string, MapDef> = {
  graveyard: {
    id: 'graveyard',
    name: 'The Starship Graveyard',
    chapter: 1,
    available: true,
    width: 3200,
    height: 3200,
    art: 'graveyard',
    music: 'graveyard',
    bossMusic: 'boss_titan',
    accent: '#59f3ff',
    rounds: [
      { kills: 210, density: 105, hpMult: 1, dmgMult: 1, speedMult: 1, eliteChance: 0.02, mix: { scrap_crawler: 6, corrupted_drone: 4 } },
      { kills: 390, density: 180, hpMult: 1.7, dmgMult: 1.25, speedMult: 1.05, eliteChance: 0.05, mix: { scrap_crawler: 5, corrupted_drone: 5, void_spawn: 2, volatile_cell: 1.2 } },
      { kills: 570, density: 270, hpMult: 2.6, dmgMult: 1.55, speedMult: 1.08, eliteChance: 0.07, mix: { scrap_crawler: 5, corrupted_drone: 5, void_spawn: 3, signal_drone: 1.4, volatile_cell: 1.8, mortar_husk: 0.7 } },
      { kills: 750, density: 370, hpMult: 3.7, dmgMult: 1.85, speedMult: 1.11, eliteChance: 0.09, mix: { scrap_crawler: 5, corrupted_drone: 6, void_spawn: 4, signal_drone: 1.8, volatile_cell: 2.2, mortar_husk: 1, scrap_hulk: 0.6 } },
      { kills: 960, density: 480, hpMult: 5, dmgMult: 2.2, speedMult: 1.14, eliteChance: 0.11, mix: { scrap_crawler: 5, corrupted_drone: 7, void_spawn: 5, signal_drone: 2.2, volatile_cell: 2.6, mortar_husk: 1.3, scrap_hulk: 1 } },
    ],
    minibosses: ['rogue_mech', 'swarm_queen', 'rogue_mech', 'swarm_queen'],
    boss: 'star_titan',
    hazards: [
      { kind: 'powerline', count: 11 },
      { kind: 'steamvent', count: 14 },
    ],
    chests: 9,
    shrines: 5,
    cursedShrines: 2,
    endlessMix: { scrap_crawler: 5, corrupted_drone: 6, void_spawn: 4, signal_drone: 1.7, volatile_cell: 2.2, mortar_husk: 0.6, scrap_hulk: 0.7 },
    storyBefore: {
      title: 'Chapter I — The Starship Graveyard',
      art: 'graveyard_before',
      lines: [
        'The star Vesh collapsed nine hundred years ago. Its fleets never left.',
        'Now the void pours through the wrecks, and something old still burns in the dark.',
        'Warden — take up the shield. Break the swarm.',
      ],
    },
    storyAfter: {
      title: 'The Core Goes Dark',
      art: 'graveyard_after',
      lines: [
        'The Star-Titan’s core gutters out, and for one breath the Graveyard is silent.',
        'Far beyond the wrecks, on a dead moon, a cathedral bell begins to toll.',
      ],
    },
  },
  cathedral: {
    id: 'cathedral',
    name: 'The Cathedral Moon',
    chapter: 2,
    available: true,
    width: 3200,
    height: 3200,
    art: 'cathedral',
    music: 'cathedral',
    bossMusic: 'boss_organ',
    accent: '#d6c25a',
    rounds: [
      { kills: 230, density: 115, hpMult: 1.3, dmgMult: 1.2, speedMult: 1, eliteChance: 0.03, mix: { bone_cultist: 5, candle_imp: 5 } },
      { kills: 420, density: 195, hpMult: 2.2, dmgMult: 1.5, speedMult: 1.05, eliteChance: 0.06, mix: { bone_cultist: 5, candle_imp: 5, thorn_horror: 2, choir_wraith: 1 } },
      { kills: 610, density: 285, hpMult: 3.3, dmgMult: 1.85, speedMult: 1.08, eliteChance: 0.08, mix: { bone_cultist: 5, candle_imp: 6, thorn_horror: 3, choir_wraith: 1.6, volatile_cell: 1 } },
      { kills: 800, density: 385, hpMult: 4.4, dmgMult: 2.0, speedMult: 1.11, eliteChance: 0.1, mix: { bone_cultist: 5, candle_imp: 6, thorn_horror: 4, choir_wraith: 2, volatile_cell: 1.4, ossuary_brute: 0.6 } },
      { kills: 1000, density: 470, hpMult: 5.7, dmgMult: 2.3, speedMult: 1.12, eliteChance: 0.12, mix: { bone_cultist: 5, candle_imp: 7, thorn_horror: 3.5, choir_wraith: 2.4, volatile_cell: 1.8, ossuary_brute: 1 } },
    ],
    minibosses: ['high_priest', 'gargoyle', 'high_priest', 'gargoyle'],
    boss: 'organ_beast',
    hazards: [
      { kind: 'bell', count: 6 },
      { kind: 'lightbeam', count: 9 },
    ],
    chests: 9,
    shrines: 5,
    cursedShrines: 2,
    endlessMix: { bone_cultist: 5, candle_imp: 6, thorn_horror: 3, choir_wraith: 2, volatile_cell: 1.4, ossuary_brute: 0.8 },
    storyBefore: {
      title: 'Chapter II — The Cathedral Moon',
      art: 'cathedral_before',
      lines: [
        'The moon of Ilm was a monastery once. The monks prayed the void away for six hundred years.',
        'Then the prayers changed. Now the bells ring on their own, and the organ never stops.',
        'Silence the hymn, Warden.',
      ],
    },
    storyAfter: {
      title: 'The Last Note',
      art: 'cathedral_after',
      lines: [
        'The Organ-Beast exhales one final chord, and the bells fall still.',
        'Through the shattered rose window, the black sun at the heart of the system opens its eye.',
      ],
    },
  },
  black_sun: {
    id: 'black_sun',
    name: 'The Black Sun',
    chapter: 3,
    available: true,
    width: 3200,
    height: 3200,
    art: 'blacksun',
    music: 'blacksun',
    bossMusic: 'boss_heart',
    accent: '#b36bff',
    rounds: [
      { kills: 250, density: 120, hpMult: 1.45, dmgMult: 1.25, speedMult: 1, eliteChance: 0.04, mix: { crystal_crawler: 5, rift_wraith: 2, void_spawn: 2 } },
      { kills: 450, density: 200, hpMult: 2.4, dmgMult: 1.5, speedMult: 1.05, eliteChance: 0.07, mix: { crystal_crawler: 4, rift_wraith: 3, void_spawn: 2, eclipse_seer: 1.2 } },
      { kills: 650, density: 290, hpMult: 3.6, dmgMult: 1.8, speedMult: 1.08, eliteChance: 0.09, mix: { crystal_crawler: 4, rift_wraith: 3.5, void_spawn: 2, eclipse_seer: 1.2, volatile_cell: 1.2, star_eater: 0.35 } },
      { kills: 850, density: 390, hpMult: 4.9, dmgMult: 2.05, speedMult: 1.11, eliteChance: 0.11, mix: { crystal_crawler: 4, rift_wraith: 4, void_spawn: 2, eclipse_seer: 2, volatile_cell: 1.5, star_eater: 0.5 } },
      { kills: 1050, density: 470, hpMult: 6.3, dmgMult: 2.3, speedMult: 1.13, eliteChance: 0.13, mix: { crystal_crawler: 4, rift_wraith: 4, void_spawn: 2, eclipse_seer: 2.2, volatile_cell: 1.8, star_eater: 0.6 } },
    ],
    minibosses: ['void_hound', 'crystal_colossus', 'void_hound', 'crystal_colossus'],
    boss: 'heart_black_sun',
    hazards: [{ kind: 'gravitywell', count: 7 }],
    darkness: { from: 430, to: 220 },
    chests: 9,
    shrines: 5,
    cursedShrines: 2,
    endlessMix: { crystal_crawler: 4, rift_wraith: 3.5, void_spawn: 2, eclipse_seer: 2, volatile_cell: 1.5, star_eater: 0.5 },
    storyBefore: {
      title: 'Chapter III — The Black Sun',
      art: 'blacksun_before',
      lines: [
        'At the centre of the system hangs a sun that gives no light. It drinks it.',
        'Everything you fought came from here: the swarm, the rot, the hymn. Every one of them was a hunger with a shape.',
        'The light shrinks as you go deeper. Keep moving, Warden. Break the heart.',
      ],
    },
    storyAfter: {
      title: 'Dawn',
      art: 'blacksun_after',
      lines: [
        'The Heart of the Black Sun cracks, and for the first time in a thousand years, it shines.',
        'Light floods the Graveyard, the Cathedral, every dead world it swallowed.',
        'The Warden lowers the blade. The swarm is broken.',
      ],
    },
  },
};

export const MAP_ORDER = ['graveyard', 'cathedral', 'black_sun'];
