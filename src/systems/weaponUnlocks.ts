/**
 * Weapon unlocks. Only STARTER_WEAPON_IDS (plus the hero's own start weapon)
 * are in the level-up / chest / shop pool at first. Every other weapon can be
 * bought in the Armory for Star Shards, and most are also granted for free by
 * an achievement — so there is never a grind wall. Pure logic.
 */
import { ALL_WEAPON_IDS, STARTER_WEAPON_IDS } from '../data/weapons';

export interface WeaponUnlock {
  /** Armory price in Star Shards */
  shards: number;
  /** achievement that also unlocks it for free (see systems/achievements.ts) */
  achievement?: string;
}

export const WEAPON_UNLOCKS: Record<string, WeaponUnlock> = {
  cryo_shards: { shards: 40, achievement: 'first_blood' },
  corrosive_flask: { shards: 40, achievement: 'chests_25' },
  sentry_turret: { shards: 50, achievement: 'boss_slayer' },
  void_spirits: { shards: 50, achievement: 'kills_10k' },
  aegis_wheels: { shards: 60, achievement: 'hazard_free' },
  ricochet: { shards: 60, achievement: 'cleave_50' },
  void_flame: { shards: 70, achievement: 'overtime_10' },
  sweep_laser: { shards: 80, achievement: 'clear_cathedral' },
  gravity_bombs: { shards: 80, achievement: 'jackpot' },
  soul_scythe: { shards: 90, achievement: 'no_dash_boss' },
  starfall: { shards: 100, achievement: 'clear_black_sun' },
  black_hole: { shards: 120, achievement: 'evolve_10' },
};

/** weapons that must be unlocked (everything that isn't a starter) */
export const LOCKED_WEAPON_IDS = ALL_WEAPON_IDS.filter((id) => !STARTER_WEAPON_IDS.includes(id));

/** the weapon pool for a run: starters, the hero's own weapon, and everything unlocked */
export function weaponPool(unlocked: readonly string[], startWeapon: string, unlockAll = false): string[] {
  if (unlockAll) return [...ALL_WEAPON_IDS];
  return ALL_WEAPON_IDS.filter((id) => STARTER_WEAPON_IDS.includes(id) || id === startWeapon || unlocked.includes(id));
}

/** try to buy a weapon; returns the new shard balance or null */
export function buyWeapon(unlocked: string[], shards: number, id: string): number | null {
  const u = WEAPON_UNLOCKS[id];
  if (!u || unlocked.includes(id) || shards < u.shards) return null;
  unlocked.push(id);
  return shards - u.shards;
}
