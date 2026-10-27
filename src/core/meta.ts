/** Glue between the save file and the progression rules in systems/mastery. */
import { SKILL_TREES, armoryBonus, masteryBonus, newMastery, type MasteryState, type MetaBonus } from '../systems/mastery';
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
