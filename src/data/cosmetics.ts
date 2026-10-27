/**
 * Cosmetics: all earned by playing (achievements), never bought. Each hero has
 * a loadout of a skin, a weapon-trail colour, a kill-burst style, a damage-
 * number style and a results-screen title banner; the menu background is
 * shared. Which achievement grants what lives in systems/achievements.ts.
 */
import { CHARACTER_IDS } from './characters';

export type CosmeticKind = 'skin' | 'trail' | 'burst' | 'numbers' | 'banner' | 'menu';

export const COSMETIC_KINDS: { kind: CosmeticKind; name: string; perHero: boolean }[] = [
  { kind: 'skin', name: 'Skins', perHero: true },
  { kind: 'trail', name: 'Weapon trails', perHero: true },
  { kind: 'burst', name: 'Kill bursts', perHero: true },
  { kind: 'numbers', name: 'Damage numbers', perHero: true },
  { kind: 'banner', name: 'Title banners', perHero: true },
  { kind: 'menu', name: 'Menu backgrounds', perHero: false },
];

/** how a skin changes the hero's body */
export type SkinStyle = 'default' | 'sprout' | 'ember' | 'frost' | 'spectral';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** skins: the hero it belongs to ('*' = any hero) */
  hero?: string;
  /** one line for the collection card */
  desc: string;
  /** available from the start */
  starter?: boolean;
  skin?: SkinStyle;
  /** trail colour (0 = each weapon's own colour) */
  color?: number;
  /** kill-burst / number style key */
  style?: string;
  /** menu background: a story scene id */
  scene?: string;
}

const HERO_NAMES: Record<string, string> = { warden: 'Warden', glint: 'Glint', voidcaller: 'Voidcaller', riven: 'Riven', fortune: 'Fortune', pyre: 'Pyre' };

function heroSkins(): CosmeticDef[] {
  const out: CosmeticDef[] = [];
  for (const hero of CHARACTER_IDS) {
    const n = HERO_NAMES[hero] ?? hero;
    out.push(
      { id: `${hero}_default`, kind: 'skin', hero, name: 'Original', desc: `${n} as first seen.`, starter: true, skin: 'default' },
      hero === 'pyre'
        ? { id: `${hero}_ember`, kind: 'skin', hero, name: 'Witchfire', desc: `${n} burning a cold green.`, skin: 'ember' }
        : { id: `${hero}_ember`, kind: 'skin', hero, name: 'Emberforged', desc: `${n} in banked-fire reds.`, skin: 'ember' },
      { id: `${hero}_frost`, kind: 'skin', hero, name: 'Frostbound', desc: `${n} in rime-pale blues.`, skin: 'frost' },
      { id: `${hero}_spectral`, kind: 'skin', hero, name: 'Spectral', desc: `${n} as a translucent ghost of light. Special skin.`, skin: 'spectral' },
    );
  }
  return out;
}

export const COSMETICS: CosmeticDef[] = [
  ...heroSkins(),
  { id: 'sprout', kind: 'skin', hero: '*', name: 'Sprout', desc: 'A seedling with ideas above its station. Special skin, any hero.', skin: 'sprout' },

  { id: 'trail_default', kind: 'trail', name: 'Armoury colours', desc: 'Every weapon in its own colour.', starter: true, color: 0 },
  { id: 'trail_gold', kind: 'trail', name: 'Gilt Edge', desc: 'Slashes and trails in molten gold.', color: 0xffc94d },
  { id: 'trail_void', kind: 'trail', name: 'Void Ink', desc: 'Slashes and trails in deep violet.', color: 0xa060ff },
  { id: 'trail_blood', kind: 'trail', name: 'Red Moon', desc: 'Slashes and trails in crimson.', color: 0xff3b4f },
  { id: 'trail_ice', kind: 'trail', name: 'Rimelight', desc: 'Slashes and trails in pale ice.', color: 0xb8f4ff },

  { id: 'burst_default', kind: 'burst', name: 'Embers', desc: 'Foes go out in a puff of their own colour.', starter: true, style: 'default' },
  { id: 'burst_sparks', kind: 'burst', name: 'Arc Sparks', desc: 'White-hot sparks on every kill.', style: 'sparks' },
  { id: 'burst_void', kind: 'burst', name: 'Unmaking', desc: 'Kills implode into violet motes.', style: 'void' },
  { id: 'burst_confetti', kind: 'burst', name: 'Festival', desc: 'Every kill is a small celebration.', style: 'confetti' },
  { id: 'burst_pixels', kind: 'burst', name: 'Defrag', desc: 'Foes break apart into square shards.', style: 'pixels' },

  { id: 'numbers_default', kind: 'numbers', name: 'Classic', desc: 'White hits, gold crits, pink mega-crits.', starter: true, style: 'default' },
  { id: 'numbers_neon', kind: 'numbers', name: 'Neon', desc: 'Cyan hits, magenta crits.', style: 'neon' },
  { id: 'numbers_ember', kind: 'numbers', name: 'Ember', desc: 'Orange hits, white-hot crits.', style: 'ember' },
  { id: 'numbers_mono', kind: 'numbers', name: 'Monochrome', desc: 'Quiet grey hits, bright white crits.', style: 'mono' },

  { id: 'banner_none', kind: 'banner', name: 'No title', desc: 'Let the numbers speak.', starter: true },
  { id: 'banner_survivor', kind: 'banner', name: 'Survivor', desc: 'Shown on your results screen.' },
  { id: 'banner_swarmbreaker', kind: 'banner', name: 'Swarmbreaker', desc: 'Shown on your results screen.' },
  { id: 'banner_baron', kind: 'banner', name: 'Coin Baron', desc: 'Shown on your results screen.' },
  { id: 'banner_untouchable', kind: 'banner', name: 'Untouchable', desc: 'Shown on your results screen.' },
  { id: 'banner_nightwalker', kind: 'banner', name: 'Nightwalker', desc: 'Shown on your results screen.' },
  { id: 'banner_reaper', kind: 'banner', name: 'The Reaper', desc: 'Shown on your results screen.' },
  { id: 'banner_master', kind: 'banner', name: 'Grand Master', desc: 'Shown on your results screen.' },

  { id: 'menu_graveyard', kind: 'menu', name: 'The Dying Star', desc: 'The Starship Graveyard before the fall.', starter: true, scene: 'graveyard_before' },
  { id: 'menu_graveyard_after', kind: 'menu', name: 'Titanfall', desc: 'The Graveyard, after the Star-Titan.', scene: 'graveyard_after' },
  { id: 'menu_cathedral', kind: 'menu', name: 'Cathedral Moon', desc: 'The moon of bells and glass.', scene: 'cathedral_before' },
  { id: 'menu_blacksun', kind: 'menu', name: 'The Black Sun', desc: 'The dark at the heart of it all.', scene: 'blacksun_before' },
  { id: 'menu_ending', kind: 'menu', name: 'Dawn', desc: 'After the swarm.', scene: 'ending' },
];

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export interface Loadout {
  skin: string;
  trail: string;
  burst: string;
  numbers: string;
  banner: string;
}

export function defaultLoadout(hero: string): Loadout {
  return { skin: `${hero}_default`, trail: 'trail_default', burst: 'burst_default', numbers: 'numbers_default', banner: 'banner_none' };
}

/** cosmetics of a kind a hero can equip */
export function cosmeticsFor(kind: CosmeticKind, hero: string): CosmeticDef[] {
  return COSMETICS.filter((c) => c.kind === kind && (kind !== 'skin' || c.hero === hero || c.hero === '*'));
}

/** damage number colours per style: normal hit, crit, mega-crit */
export const NUMBER_STYLES: Record<string, { hit: number; crit: number; mega: number }> = {
  default: { hit: 0xf2f2f2, crit: 0xffc94d, mega: 0xff4d9a },
  neon: { hit: 0x6ff3ff, crit: 0xff4dd2, mega: 0xffffff },
  ember: { hit: 0xffa04d, crit: 0xfff0c0, mega: 0xff4d4d },
  mono: { hit: 0x9aa3b8, crit: 0xffffff, mega: 0xfff3a0 },
};
