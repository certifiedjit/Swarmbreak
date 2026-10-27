/** Glue between the save file and the progression rules in systems/mastery. */
import { SKILL_TREES, armoryBonus, masteryBonus, newMastery, type MasteryState, type MetaBonus } from '../systems/mastery';
import { CHARACTERS, CHARACTER_IDS } from '../data/characters';
import { HERO_UNLOCKS, newlyUnlocked, type UnlockStats } from '../systems/heroes';
import { weaponPool } from '../systems/weaponUnlocks';
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
