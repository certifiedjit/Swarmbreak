import type { StatMod } from './stats';

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  color: number;
  /** stat mods granted at each level, index 0 = level 1 */
  levels: StatMod[][];
  /** extra stat granted per rarity tier above Common (used when a level only grants whole numbers) */
  rarityBonus?: StatMod;
  lore?: string;
}

export const PASSIVE_MAX_LEVEL = 5;

const each = (mod: StatMod): StatMod[][] => [[mod], [mod], [mod], [mod], [mod]];

export const PASSIVES: Record<string, PassiveDef> = {
  void_boots: {
    id: 'void_boots',
    name: 'Void-Iron Boots',
    desc: 'Move faster.',
    color: 0x7aa2ff,
    levels: each({ stat: 'moveSpeed', add: 0.08 }),
    lore: 'They walk on nothing, so you don’t have to.',
  },
  star_lens: {
    id: 'star_lens',
    name: 'Star Lens',
    desc: 'Bigger weapon effects.',
    color: 0xffe28a,
    levels: each({ stat: 'area', add: 0.08 }),
    lore: 'Ground from the eye of a burnt-out sun.',
  },
  cursed_clover: {
    id: 'cursed_clover',
    name: 'Cursed Clover',
    desc: 'More luck: rarer cards, chests and drops.',
    color: 0x7dff8a,
    levels: each({ stat: 'luck', add: 0.12 }),
    lore: 'Four leaves. One of them is watching you.',
  },
  phoenix_ember: {
    id: 'phoenix_ember',
    name: 'Phoenix Ember',
    desc: 'Cheat death. More max HP.',
    color: 0xff7a3d,
    levels: [
      [{ stat: 'revives', add: 1 }],
      [{ stat: 'maxHp', add: 10 }],
      [{ stat: 'maxHp', add: 10 }],
      [{ stat: 'maxHp', add: 10 }],
      [{ stat: 'revives', add: 1 }],
    ],
    rarityBonus: { stat: 'maxHp', add: 6 },
    lore: 'Still warm. Always warm.',
  },
  conductor_coil: {
    id: 'conductor_coil',
    name: 'Conductor Coil',
    desc: 'Weapons fire faster.',
    color: 0x7fd8ff,
    levels: each({ stat: 'attackSpeed', add: 0.07 }),
    lore: 'Hums at a frequency only lightning respects.',
  },
  runeplate: {
    id: 'runeplate',
    name: 'Runeplate',
    desc: 'More armour and max HP.',
    color: 0x9fb4d8,
    levels: each({ stat: 'armor', add: 1 }).map((l) => [...l, { stat: 'maxHp', add: 6 }]),
    lore: 'Every dent is a rune. Every rune is a dent.',
  },
  lodestone: {
    id: 'lodestone',
    name: 'Grav Lodestone',
    desc: 'Pick up gems and coins from further away.',
    color: 0x5effc8,
    levels: each({ stat: 'pickupRange', add: 22 }),
    lore: 'Heavy in the pocket. Heavier in the soul.',
  },
  twin_capacitor: {
    id: 'twin_capacitor',
    name: 'Twin Capacitor',
    desc: 'Every weapon fires one more: an extra slash, blade, beam, bolt or cone. Auras burn wider.',
    color: 0xffd34d,
    levels: [
      [{ stat: 'projectiles', add: 1 }],
      [{ stat: 'damage', add: 0.05 }],
      [{ stat: 'projectiles', add: 1 }],
      [{ stat: 'damage', add: 0.05 }],
      [{ stat: 'projectiles', add: 1 }],
    ],
    rarityBonus: { stat: 'damage', add: 0.03 },
    lore: 'Two of everything. Including problems.',
  },
  reaper_sigil: {
    id: 'reaper_sigil',
    name: 'Reaper Sigil',
    desc: 'Crit more often, and crit harder.',
    color: 0xff4d6d,
    levels: each({ stat: 'critChance', add: 0.04 }).map((l) => [...l, { stat: 'critDamage', add: 0.2 }]),
    lore: 'It marks the weak point. You do the rest.',
  },
  hourglass: {
    id: 'hourglass', name: 'Frozen Hourglass', desc: 'Effects last longer.', color: 0x9fe8ff,
    levels: each({ stat: 'duration', add: 0.1 }), lore: 'The sand stopped falling a long time ago.',
  },
  blood_chalice: {
    id: 'blood_chalice', name: 'Blood Chalice', desc: 'Regenerate health over time.', color: 0xff5a6e,
    levels: each({ stat: 'regen', add: 0.5 }), lore: 'It refills itself. Don’t ask from where.',
  },
  leech_fang: {
    id: 'leech_fang', name: 'Leech Fang', desc: 'Heal for a little of the damage you deal.', color: 0xff3d6e,
    levels: each({ stat: 'lifesteal', add: 0.006 }).map((l) => [...l, { stat: 'maxHp', add: 4 }]), lore: 'Hungry, but polite about it.',
  },
  phase_veil: {
    id: 'phase_veil', name: 'Phase Veil', desc: 'A chance to slip through hits entirely.', color: 0xb6c3ff,
    levels: each({ stat: 'dodge', add: 0.04 }), lore: 'You are only mostly here.',
  },
  void_heart: {
    id: 'void_heart', name: 'Void Heart', desc: 'Raw damage for everything.', color: 0x8a5cff,
    levels: each({ stat: 'damage', add: 0.07 }), lore: 'It beats once every hundred years. You felt it.',
  },
  archive_core: {
    id: 'archive_core', name: 'Archive Core', desc: 'Gain more experience.', color: 0x59f3ff,
    levels: each({ stat: 'xpGain', add: 0.08 }), lore: 'Every ship’s log, every lesson, compressed.',
  },
  briar_crown: {
    id: 'briar_crown', name: 'Briar Crown', desc: 'Enemies that touch you take thorn damage. More armour.', color: 0xb0ff6a,
    levels: each({ stat: 'thorns', add: 10 }).map((l) => [...l, { stat: 'armor', add: 0.5 }]), lore: 'Uncomfortable to wear. More uncomfortable to hug.',
  },
  field_battery: {
    id: 'field_battery', name: 'Field Battery', desc: 'Faster weapons and longer-lasting effects.', color: 0xffd34d,
    levels: each({ stat: 'attackSpeed', add: 0.04 }).map((l) => [...l, { stat: 'duration', add: 0.05 }]), lore: 'Fully charged. Mostly.',
  },
  cinder_core: {
    id: 'cinder_core', name: 'Cinder Core', desc: 'Bigger and longer-lasting effects.', color: 0xd06bff,
    levels: each({ stat: 'area', add: 0.05 }).map((l) => [...l, { stat: 'duration', add: 0.05 }]), lore: 'What is left when a star burns out. Still warm.',
  },
  soul_lantern: {
    id: 'soul_lantern', name: 'Soul Lantern', desc: 'Summons and effects last longer. More XP.', color: 0xc46dff,
    levels: each({ stat: 'duration', add: 0.07 }).map((l) => [...l, { stat: 'xpGain', add: 0.03 }]), lore: 'A light for the lost. They follow it.',
  },
};

export const BASE_PASSIVE_IDS = Object.keys(PASSIVES);

/** Relics: stat boosts that only come from chests and shrines; they stack without limit. */
export interface RelicDef {
  id: string;
  name: string;
  mod: StatMod;
  color: number;
}

export const RELICS: Record<string, RelicDef> = {
  ember_shard: { id: 'ember_shard', name: 'Ember Shard', mod: { stat: 'damage', add: 0.06 }, color: 0xff7a3d },
  seer_lens: { id: 'seer_lens', name: 'Seer’s Lens', mod: { stat: 'critChance', add: 0.03 }, color: 0xffe28a },
  gravecutter: { id: 'gravecutter', name: 'Gravecutter Edge', mod: { stat: 'critDamage', add: 0.15 }, color: 0xff4d6d },
  mending_rune: { id: 'mending_rune', name: 'Mending Rune', mod: { stat: 'regen', add: 0.35 }, color: 0x7dff8a },
  leech_glyph: { id: 'leech_glyph', name: 'Leech Glyph', mod: { stat: 'lifesteal', add: 0.008 }, color: 0xff3d6e },
  archive_chip: { id: 'archive_chip', name: 'Archive Chip', mod: { stat: 'xpGain', add: 0.08 }, color: 0x59f3ff },
  tithe_coin: { id: 'tithe_coin', name: 'Tithe Coin', mod: { stat: 'coinGain', add: 0.1 }, color: 0xffc94d },
  heartcore: { id: 'heartcore', name: 'Heartcore', mod: { stat: 'maxHp', add: 14 }, color: 0xff5a5a },
  phase_cloak: { id: 'phase_cloak', name: 'Phase Cloak', mod: { stat: 'dodge', add: 0.025 }, color: 0xb6c3ff },
  stasis_coil: { id: 'stasis_coil', name: 'Stasis Coil', mod: { stat: 'duration', add: 0.08 }, color: 0x9b7bff },
  overdrive_chip: { id: 'overdrive_chip', name: 'Overdrive Chip', mod: { stat: 'attackSpeed', add: 0.04 }, color: 0x7fd8ff },
  thorn_sigil: { id: 'thorn_sigil', name: 'Thorn Sigil', mod: { stat: 'thorns', add: 6 }, color: 0xb0ff6a },
};

export const RELIC_IDS = Object.keys(RELICS);
