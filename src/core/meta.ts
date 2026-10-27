/** Glue between the save file and the progression rules in systems/mastery. */
import { SKILL_TREES, armoryBonus, masteryBonus, newMastery, type MasteryState, type MetaBonus } from '../systems/mastery';
import { CHARACTERS, CHARACTER_IDS } from '../data/characters';
import { HERO_UNLOCKS, newlyUnlocked, type UnlockStats } from '../systems/heroes';
import { weaponPool } from '../systems/weaponUnlocks';
import { COSMETIC_BY_ID, defaultLoadout, type CosmeticKind, type Loadout } from '../data/cosmetics';
import { WEAPONS } from '../data/weapons';
import { ACHIEVEMENTS, newlyDone, type AchContext, type AchievementDef } from '../systems/achievements';
import { save } from './save';

export function getMastery(character: string): MasteryState {
  const all = save.data.meta.mastery;
  return (all[character] ??= newMastery());
}

export function treeFor(character: string) {
  return SKILL_TREES[character] ?? [];
}

/** everything permanent a hero brings into a run: their skill tree plus the shared Armory */
export function metaBonusFor(character: string): MetaBonus {
  const b = armoryBonus(save.data.meta.armory);
  return masteryBonus(getMastery(character), treeFor(character), b);
}

/** the weapons that can be offered in a run with this hero */
export function weaponPoolFor(character: string): string[] {
  return weaponPool(save.data.meta.weapons, CHARACTERS[character]?.startWeapon ?? '', save.data.settings.unlockAll);
}

// ---------------------------------------------------------------- hero unlocks

export function heroUnlockStats(): UnlockStats {
  const d = save.data;
  return { chaptersCleared: d.progress.chaptersCleared, totalKills: d.stats.totalKills, chestsOpened: d.stats.chestsOpened, longestEndless: d.stats.longestEndless };
}

export function isHeroUnlocked(id: string): boolean {
  const c = CHARACTERS[id];
  if (!c?.available) return false;
  return save.data.settings.unlockAll || HERO_UNLOCKS[id]?.kind === 'start' || save.data.heroes.unlocked.includes(id);
}

/** record heroes whose condition is now met; returns the new ones (each is celebrated once) */
export function syncHeroUnlocks(): string[] {
  const fresh = newlyUnlocked(CHARACTER_IDS.filter((id) => CHARACTERS[id].available), heroUnlockStats(), save.data.heroes.unlocked);
  if (fresh.length) {
    save.data.heroes.unlocked.push(...fresh);
    save.write();
  }
  return fresh;
}

// ---------------------------------------------------------------- cosmetics

export function cosmeticUnlocked(id: string): boolean {
  const c = COSMETIC_BY_ID[id];
  if (!c) return false;
  return !!c.starter || save.data.settings.unlockAll || save.data.cosmetics.unlocked.includes(id);
}

/** a hero's loadout, with anything missing or no longer unlocked back on its default */
export function loadoutFor(hero: string): Loadout {
  const def = defaultLoadout(hero);
  const saved = save.data.cosmetics.loadout[hero] ?? {};
  const out = { ...def };
  for (const k of Object.keys(def) as (keyof Loadout)[]) {
    const id = saved[k];
    if (id && cosmeticUnlocked(id) && COSMETIC_BY_ID[id].kind === k && (k !== 'skin' || [hero, '*'].includes(COSMETIC_BY_ID[id].hero ?? ''))) out[k] = id;
  }
  return out;
}

export function equipCosmetic(hero: string, id: string): boolean {
  const c = COSMETIC_BY_ID[id];
  if (!c || !cosmeticUnlocked(id)) return false;
  if (c.kind === 'menu') save.data.cosmetics.menu = id;
  else (save.data.cosmetics.loadout[hero] ??= {})[c.kind as Exclude<CosmeticKind, 'menu'>] = id;
  save.write();
  return true;
}

export function menuScene(): string {
  const id = save.data.cosmetics.menu;
  return (cosmeticUnlocked(id) && COSMETIC_BY_ID[id]?.scene) || 'graveyard_before';
}

// ---------------------------------------------------------------- achievements

/** what the current run adds on top of the save, so achievements can pop mid-run */
export interface RunOverlay {
  kills: number;
  maxStreak: number;
  endless: number;
  overtime: number;
  threat30: number;
  allCurses: number;
}

export function achContext(run?: RunOverlay): AchContext {
  const d = save.data;
  const s = d.stats;
  const mastery: Record<string, number> = {};
  for (const id of CHARACTER_IDS) mastery[id] = d.meta.mastery[id]?.level ?? 1;
  return {
    totalKills: s.totalKills + (run?.kills ?? 0),
    chestsOpened: s.chestsOpened,
    bossesKilled: s.bossesKilled,
    chaptersCleared: d.progress.chaptersCleared,
    tiers: d.progress.tiers,
    heroTiers: d.progress.heroTiers,
    storyTierClears: s.storyTierClears,
    evolutions: d.codex.evolutions.length,
    totalEvolutions: Object.values(WEAPONS).filter((w) => w.evolved).length,
    bestMulti: s.bestMulti,
    bestStreak: Math.max(s.bestStreak, run?.maxStreak ?? 0),
    longestEndless: Math.max(s.longestEndless, run?.endless ?? 0),
    longestOvertime: Math.max(s.longestOvertime, run?.overtime ?? 0),
    overtimeBossKills: s.overtimeBossKills,
    jackpots: s.jackpots,
    hazardFreeClears: s.hazardFreeClears,
    noDashBossKills: s.noDashBossKills,
    longestThreat30: Math.max(s.longestThreat30, run?.threat30 ?? 0),
    longestAllCurses: Math.max(s.longestAllCurses, run?.allCurses ?? 0),
    heroesUnlocked: CHARACTER_IDS.filter((id) => HERO_UNLOCKS[id]?.kind === 'start' || d.heroes.unlocked.includes(id)).length,
    mastery,
  };
}

/** record and pay out every achievement that is now done; returns them (each pops once) */
export function syncAchievements(run?: RunOverlay): AchievementDef[] {
  const d = save.data;
  const fresh = newlyDone(achContext(run), d.achievements);
  for (const a of fresh) {
    d.achievements[a.id] = Date.now();
    for (const c of a.reward.cosmetics ?? []) if (!d.cosmetics.unlocked.includes(c)) d.cosmetics.unlocked.push(c);
    if (a.reward.weapon && !d.meta.weapons.includes(a.reward.weapon)) d.meta.weapons.push(a.reward.weapon);
    if (a.reward.shards) {
      d.meta.shards += a.reward.shards;
      d.meta.shardsEarned += a.reward.shards;
    }
  }
  if (fresh.length) save.write();
  return fresh;
}

export function achievementsDone(): number {
  return ACHIEVEMENTS.filter((a) => save.data.achievements[a.id]).length;
}
