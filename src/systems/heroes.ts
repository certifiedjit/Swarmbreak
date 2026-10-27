/**
 * Hero passives and hero unlocks: the numbers and pure rules behind each
 * hero's signature behaviour, and the conditions that unlock them. The game
 * (src/game/heroPassive.ts) applies these; tests cover them directly.
 *
 * `power` is the rank of the hero's signature skill-tree node (0..2), which
 * strengthens the passive.
 */
import type { EnemyKind } from '../game/types';

// ---------------------------------------------------------------- Glint: Afterimage

export const GLINT = {
  /** every Nth projectile launched is a guaranteed crit */
  critEvery: 3,
  /** extra crit damage on those guaranteed crits, per power rank */
  critDamagePerPower: 0.25,
};

/** `shot` counts from 1: is this projectile one of the guaranteed crits? */
export function glintShotCrits(shot: number): boolean {
  return shot > 0 && shot % GLINT.critEvery === 0;
}

// ---------------------------------------------------------------- Voidcaller: Binding

export const VOIDCALLER = {
  /** chance a kill raises a void spirit */
  raiseChance: 0.03,
  raisePerPower: 0.02,
  /** raised spirits alive at once */
  maxRaised: 10,
  /** seconds a raised spirit lasts (before Duration) */
  raisedLife: 5,
  /** Void Pact cooldown multiplier */
  pactCooldown: 0.75,
  /** damage multiplier against mini-bosses and bosses (her spirits feed on the small) */
  bigDamage: 0.8,
};

export function voidcallerRaiseChance(power: number): number {
  return VOIDCALLER.raiseChance + VOIDCALLER.raisePerPower * Math.max(0, power);
}

export function spellCooldownMult(character: string, spell: string): number {
  return character === 'voidcaller' && spell === 'void_pact' ? VOIDCALLER.pactCooldown : 1;
}

// ---------------------------------------------------------------- Riven: Overbuilt

export const RIVEN = {
  /** seconds standing still before a turret deploys */
  stillDelay: 1,
  stillDelayPerPower: -0.3,
  /** seconds between further deploys while you keep still */
  redeploy: 4,
  /** passive turrets alive at once */
  maxTurrets: 2,
  /** seconds a passive turret lasts (before Duration) */
  turretLife: 10,
  /** damage multiplier against elites, mini-bosses and bosses */
  bigDamage: 1.25,
};

export function rivenStillDelay(power: number): number {
  return Math.max(0.3, RIVEN.stillDelay + RIVEN.stillDelayPerPower * Math.max(0, power));
}

export function rivenMaxTurrets(power: number): number {
  return RIVEN.maxTurrets + Math.max(0, power);
}

/**
 * Should a turret deploy now? `stillT` is how long you've stood still,
 * `sinceDeploy` the seconds since the last passive deploy in this stand.
 */
export function rivenShouldDeploy(stillT: number, deployedThisStand: number, sinceDeploy: number, power: number): boolean {
  if (stillT < rivenStillDelay(power)) return false;
  return deployedThisStand === 0 || sinceDeploy >= RIVEN.redeploy;
}

// ---------------------------------------------------------------- Fortune: Loaded Dice

export const FORTUNE = {
  /** chest price multiplier */
  chestCost: 0.75,
  /** free rerolls on every level-up screen */
  freeRerolls: 1,
  /** chance a picked-up coin bursts */
  burstChance: 0.1,
  burstPerPower: 0.05,
  burstRadius: 52,
  /** burst damage, before your Damage stat */
  burstDamage: 22,
  burstPerLevel: 1.5,
};

export function chestCostMult(character: string): number {
  return character === 'fortune' ? FORTUNE.chestCost : 1;
}

export function freeRerollsPerLevel(character: string): number {
  return character === 'fortune' ? FORTUNE.freeRerolls : 0;
}

export function fortuneBurstChance(power: number): number {
  return FORTUNE.burstChance + FORTUNE.burstPerPower * Math.max(0, power);
}

export function fortuneBurstDamage(level: number): number {
  return FORTUNE.burstDamage + FORTUNE.burstPerLevel * Math.max(0, level - 1);
}

// ---------------------------------------------------------------- Pyre: Kindling

export const PYRE = {
  /** world px walked between trail flames */
  trailStep: 16,
  trailRadius: 13,
  /** seconds a trail flame burns (before Duration) */
  trailLife: 1.8,
  /** damage per 0.4 s tick, before your Damage stat */
  trailDamage: 8,
  trailPerLevel: 0.6,
  trailPerPower: 0.3,
  /** extra damage at 0 HP; scales linearly with missing HP */
  maxRage: 0.6,
};

export function pyreTrailDamage(level: number, power: number): number {
  return (PYRE.trailDamage + PYRE.trailPerLevel * Math.max(0, level - 1)) * (1 + PYRE.trailPerPower * Math.max(0, power));
}

/** Pyre's damage multiplier from missing HP: 1 at full HP, 1 + maxRage at 0 HP */
export function pyreRage(hpFrac: number): number {
  return 1 + PYRE.maxRage * Math.min(1, Math.max(0, 1 - hpFrac));
}

// ---------------------------------------------------------------- shared damage hook

/** every hero damage multiplier that depends on the target or your state */
export function heroDamageMult(character: string, hpFrac: number, target: EnemyKind): number {
  if (character === 'pyre') return pyreRage(hpFrac);
  if (character === 'riven' && target !== 'normal') return RIVEN.bigDamage;
  if (character === 'voidcaller' && (target === 'mini' || target === 'boss')) return VOIDCALLER.bigDamage;
  return 1;
}

// ---------------------------------------------------------------- unlocks

export interface UnlockStats {
  chaptersCleared: number;
  totalKills: number;
  chestsOpened: number;
  /** longest single Endless run, seconds */
  longestEndless: number;
}

export type UnlockKind = 'start' | 'chapter' | 'kills' | 'chests' | 'endless';

export interface HeroUnlock {
  kind: UnlockKind;
  need: number;
}

export const HERO_UNLOCKS: Record<string, HeroUnlock> = {
  warden: { kind: 'start', need: 0 },
  glint: { kind: 'chapter', need: 1 },
  voidcaller: { kind: 'kills', need: 5000 },
  riven: { kind: 'chapter', need: 2 },
  fortune: { kind: 'chests', need: 100 },
  pyre: { kind: 'endless', need: 15 * 60 },
};

export interface UnlockProgress {
  have: number;
  need: number;
  done: boolean;
  /** e.g. "3,120 / 5,000 kills" */
  text: string;
}

const num = (n: number): string => Math.floor(n).toLocaleString('en-US');
const clock = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function unlockProgress(id: string, s: UnlockStats): UnlockProgress {
  const u = HERO_UNLOCKS[id] ?? { kind: 'start', need: 0 };
  switch (u.kind) {
    case 'start':
      return { have: 0, need: 0, done: true, text: 'Available from the start' };
    case 'chapter': {
      const have = Math.min(s.chaptersCleared, u.need);
      return { have, need: u.need, done: s.chaptersCleared >= u.need, text: s.chaptersCleared >= u.need ? `Chapter ${u.need} cleared` : `Chapter ${u.need} not cleared yet` };
    }
    case 'kills':
      return { have: Math.min(s.totalKills, u.need), need: u.need, done: s.totalKills >= u.need, text: `${num(Math.min(s.totalKills, u.need))} / ${num(u.need)} kills` };
    case 'chests':
      return { have: Math.min(s.chestsOpened, u.need), need: u.need, done: s.chestsOpened >= u.need, text: `${num(Math.min(s.chestsOpened, u.need))} / ${num(u.need)} chests` };
    case 'endless':
      return { have: Math.min(s.longestEndless, u.need), need: u.need, done: s.longestEndless >= u.need, text: `Best ${clock(Math.min(s.longestEndless, u.need))} / ${clock(u.need)} in Endless` };
  }
}

/** heroes whose condition is met but aren't in `unlocked` yet (in roster order) */
export function newlyUnlocked(ids: readonly string[], s: UnlockStats, unlocked: readonly string[]): string[] {
  return ids.filter((id) => HERO_UNLOCKS[id]?.kind !== 'start' && !unlocked.includes(id) && unlockProgress(id, s).done);
}
