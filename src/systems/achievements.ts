/**
 * Achievements: pure definitions over a snapshot of your progress. Each one
 * grants something — cosmetics, a weapon unlock or Star Shards — and none is a
 * grind wall (the big kill counts unlock cosmetics, never power).
 */
import { CHARACTER_IDS } from '../data/characters';

export interface AchContext {
  totalKills: number;
  chestsOpened: number;
  bossesKilled: number;
  chaptersCleared: number;
  /** best tier index cleared per chapter map */
  tiers: Record<string, number>;
  /** best tier index cleared with each hero (any chapter) */
  heroTiers: Record<string, number>;
  /** chapters cleared on the Story tier */
  storyTierClears: number;
  evolutions: number;
  totalEvolutions: number;
  bestMulti: number;
  bestStreak: number;
  longestEndless: number;
  longestOvertime: number;
  overtimeBossKills: number;
  jackpots: number;
  hazardFreeClears: number;
  noDashBossKills: number;
  /** longest Endless run started at Threat 30 */
  longestThreat30: number;
  /** longest Endless run with all five curses on */
  longestAllCurses: number;
  heroesUnlocked: number;
  mastery: Record<string, number>;
}

export type AchIcon = 'skull' | 'crown' | 'star' | 'sword' | 'chest' | 'clock' | 'flame' | 'shield' | 'coin' | 'eye' | 'medal' | 'bolt' | 'mask' | 'gem';

export interface AchReward {
  cosmetics?: string[];
  weapon?: string;
  shards?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: AchIcon;
  color: number;
  need: number;
  value: (c: AchContext) => number;
  reward: AchReward;
  /** shown as "???" until done */
  secret?: boolean;
}

const A = (a: AchievementDef): AchievementDef => a;
const tierCount = (c: AchContext, min: number) => Object.values(c.tiers).filter((t) => t >= min).length;
const HERO_NAMES: Record<string, string> = { warden: 'Warden', glint: 'Glint', voidcaller: 'Voidcaller', riven: 'Riven', fortune: 'Fortune', pyre: 'Pyre' };

function heroAchievements(): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const hero of CHARACTER_IDS) {
    const n = HERO_NAMES[hero] ?? hero;
    out.push(
      A({ id: `m5_${hero}`, name: `${n}: Apprentice`, desc: `Raise ${n} to mastery 5.`, icon: 'star', color: 0x9fe8ff, need: 5, value: (c) => c.mastery[hero] ?? 1, reward: { cosmetics: [`${hero}_frost`] } }),
      A({ id: `m10_${hero}`, name: `${n}: Master`, desc: `Raise ${n} to mastery 10.`, icon: 'crown', color: 0xff8a4d, need: 10, value: (c) => c.mastery[hero] ?? 1, reward: { cosmetics: [`${hero}_ember`] } }),
      A({ id: `vet_${hero}`, name: `${n}: Veteran`, desc: `Clear any chapter on Veteran or harder with ${n}.`, icon: 'medal', color: 0xc8f0ff, need: 1, value: (c) => ((c.heroTiers[hero] ?? -1) >= 2 ? 1 : 0), reward: { cosmetics: [`${hero}_spectral`] } }),
    );
  }
  return out;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  A({ id: 'first_blood', name: 'First Blood', desc: 'Kill 100 enemies.', icon: 'skull', color: 0xc3ccd6, need: 100, value: (c) => c.totalKills, reward: { weapon: 'cryo_shards' } }),
  A({ id: 'kills_1k', name: 'Thinning the Swarm', desc: 'Kill 1,000 enemies.', icon: 'skull', color: 0x7dff8a, need: 1000, value: (c) => c.totalKills, reward: { cosmetics: ['burst_sparks'] } }),
  A({ id: 'kills_10k', name: 'Swarmbreaker', desc: 'Kill 10,000 enemies.', icon: 'skull', color: 0x59f3ff, need: 10000, value: (c) => c.totalKills, reward: { weapon: 'void_spirits', cosmetics: ['banner_swarmbreaker'] } }),
  A({ id: 'kills_100k', name: 'Extinction Event', desc: 'Kill 100,000 enemies.', icon: 'skull', color: 0xff4d6d, need: 100000, value: (c) => c.totalKills, reward: { cosmetics: ['banner_reaper', 'burst_void'] } }),

  A({ id: 'clear_graveyard', name: 'Titanfall', desc: 'Clear Chapter I: The Starship Graveyard.', icon: 'medal', color: 0x59f3ff, need: 1, value: (c) => Math.min(1, c.chaptersCleared), reward: { cosmetics: ['sprout', 'menu_graveyard_after'] } }),
  A({ id: 'clear_cathedral', name: 'Last Toll', desc: 'Clear Chapter II: The Cathedral Moon.', icon: 'medal', color: 0xffc94d, need: 1, value: (c) => (c.chaptersCleared >= 2 ? 1 : 0), reward: { weapon: 'sweep_laser', cosmetics: ['menu_cathedral'] } }),
  A({ id: 'clear_black_sun', name: 'Dawn', desc: 'Clear Chapter III: The Black Sun.', icon: 'medal', color: 0xc46dff, need: 1, value: (c) => (c.chaptersCleared >= 3 ? 1 : 0), reward: { weapon: 'starfall', cosmetics: ['menu_blacksun', 'menu_ending'] } }),
  A({ id: 'story_tier', name: 'Scenic Route', desc: 'Clear a chapter on the Story tier.', icon: 'eye', color: 0x7dff8a, need: 1, value: (c) => c.storyTierClears, reward: { cosmetics: ['numbers_mono'] } }),
  A({ id: 'veteran_any', name: 'Battle-Scarred', desc: 'Clear a chapter on Veteran.', icon: 'shield', color: 0xffc94d, need: 1, value: (c) => tierCount(c, 2), reward: { cosmetics: ['trail_gold'], shards: 40 } }),
  A({ id: 'nightmare_any', name: 'Nightwalker', desc: 'Clear a chapter on Nightmare.', icon: 'mask', color: 0xff4d6d, need: 1, value: (c) => tierCount(c, 3), reward: { cosmetics: ['banner_nightwalker', 'trail_blood'], shards: 80 } }),
  A({ id: 'nightmare_all', name: 'Waking Nightmare', desc: 'Clear all three chapters on Nightmare.', icon: 'mask', color: 0xff2a4d, need: 3, value: (c) => tierCount(c, 3), reward: { shards: 250 } }),

  A({ id: 'hazard_free', name: 'Light on Your Feet', desc: 'Clear a chapter without taking any hazard damage.', icon: 'bolt', color: 0x59f3ff, need: 1, value: (c) => c.hazardFreeClears, reward: { weapon: 'aegis_wheels' } }),
  A({ id: 'no_dash_boss', name: 'Stand Your Ground', desc: 'Defeat a chapter boss without dashing during the fight.', icon: 'shield', color: 0x9aa3b8, need: 1, value: (c) => c.noDashBossKills, reward: { weapon: 'soul_scythe', cosmetics: ['banner_untouchable'] } }),
  A({ id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat 10 bosses or mini-bosses.', icon: 'sword', color: 0xff7a5c, need: 10, value: (c) => c.bossesKilled, reward: { weapon: 'sentry_turret' } }),
  A({ id: 'cleave_25', name: 'Wide Swing', desc: 'Kill 25 enemies at once (a ×25 multi-kill).', icon: 'sword', color: 0xffa04d, need: 25, value: (c) => c.bestMulti, reward: { cosmetics: ['numbers_ember'] } }),
  A({ id: 'cleave_50', name: 'Harvest', desc: 'Kill 50 enemies at once (a ×50 cleave).', icon: 'sword', color: 0xff4dd2, need: 50, value: (c) => c.bestMulti, reward: { weapon: 'ricochet', cosmetics: ['numbers_neon'] } }),
  A({ id: 'streak_500', name: 'Unbroken Chain', desc: 'Reach a 500-kill streak.', icon: 'bolt', color: 0xffe24d, need: 500, value: (c) => c.bestStreak, reward: { cosmetics: ['burst_confetti'] } }),

  A({ id: 'overtime_10', name: 'Overtime Shift', desc: 'Survive 10 minutes of Overtime.', icon: 'clock', color: 0xff4d9a, need: 600, value: (c) => c.longestOvertime, reward: { weapon: 'void_flame' } }),
  A({ id: 'overtime_boss', name: 'Encore', desc: 'Defeat a great boss in Overtime.', icon: 'crown', color: 0xff4d9a, need: 1, value: (c) => c.overtimeBossKills, reward: { shards: 30 } }),
  A({ id: 'endless_10', name: 'Survivor', desc: 'Survive 10 minutes in Endless.', icon: 'clock', color: 0x59f3ff, need: 600, value: (c) => c.longestEndless, reward: { cosmetics: ['banner_survivor'] } }),
  A({ id: 'endless_20', name: 'Long Night', desc: 'Survive 20 minutes in Endless.', icon: 'clock', color: 0xa060ff, need: 1200, value: (c) => c.longestEndless, reward: { cosmetics: ['trail_void'], shards: 60 } }),
  A({ id: 'threat_30', name: 'Deep End', desc: 'Survive 5 minutes in Endless starting at Threat 30.', icon: 'flame', color: 0xff6a4d, need: 300, value: (c) => c.longestThreat30, reward: { shards: 80 } }),
  A({ id: 'cursed_all', name: 'All the Curses', desc: 'Survive 5 minutes in Endless with all five curses on.', icon: 'eye', color: 0xc46dff, need: 300, value: (c) => c.longestAllCurses, reward: { shards: 100 } }),

  A({ id: 'chests_25', name: 'Treasure Hunter', desc: 'Open 25 chests.', icon: 'chest', color: 0xffc94d, need: 25, value: (c) => c.chestsOpened, reward: { weapon: 'corrosive_flask' } }),
  A({ id: 'chests_250', name: 'Hoarder', desc: 'Open 250 chests.', icon: 'chest', color: 0xb8f4ff, need: 250, value: (c) => c.chestsOpened, reward: { cosmetics: ['trail_ice'] } }),
  A({ id: 'jackpot', name: 'Jackpot!', desc: 'Roll a ×10 jackpot from a Victory Cache.', icon: 'coin', color: 0xffe08a, need: 1, value: (c) => c.jackpots, reward: { weapon: 'gravity_bombs', cosmetics: ['banner_baron'] } }),

  A({ id: 'evolve_1', name: 'Evolution', desc: 'Discover a weapon evolution.', icon: 'gem', color: 0xc46dff, need: 1, value: (c) => c.evolutions, reward: { shards: 15 } }),
  A({ id: 'evolve_10', name: 'Natural Selection', desc: 'Discover 10 weapon evolutions.', icon: 'gem', color: 0x45a9ff, need: 10, value: (c) => c.evolutions, reward: { weapon: 'black_hole' } }),
  A({ id: 'evolve_all', name: 'Apex Arsenal', desc: 'Discover every weapon evolution.', icon: 'gem', color: 0xffb330, need: 19, value: (c) => c.evolutions, reward: { cosmetics: ['burst_pixels'], shards: 100 } }),

  A({ id: 'heroes_all', name: 'Full Roster', desc: 'Unlock all six heroes.', icon: 'crown', color: 0x7dff8a, need: 6, value: (c) => c.heroesUnlocked, reward: { shards: 50 } }),
  ...heroAchievements(),
  A({ id: 'master_all', name: 'Grand Master', desc: 'Raise every hero to mastery 10.', icon: 'crown', color: 0xffc94d, need: CHARACTER_IDS.length, value: (c) => CHARACTER_IDS.filter((h) => (c.mastery[h] ?? 1) >= 10).length, reward: { cosmetics: ['banner_master'] } }),
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementProgress(a: AchievementDef, c: AchContext): { have: number; need: number; done: boolean } {
  const v = Math.max(0, a.value(c));
  return { have: Math.min(v, a.need), need: a.need, done: v >= a.need };
}

/** achievements whose condition is met but aren't recorded yet */
export function newlyDone(c: AchContext, done: Readonly<Record<string, number>>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !done[a.id] && achievementProgress(a, c).done);
}

/** the achievement that grants a cosmetic or a weapon */
export function sourceOf(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.reward.weapon === id || a.reward.cosmetics?.includes(id));
}

export function rewardText(r: AchReward, names: (id: string) => string): string {
  const parts: string[] = [];
  if (r.weapon) parts.push(`Weapon: ${names(r.weapon)}`);
  for (const c of r.cosmetics ?? []) parts.push(names(c));
  if (r.shards) parts.push(`${r.shards} Star Shards`);
  return parts.join(' · ');
}
