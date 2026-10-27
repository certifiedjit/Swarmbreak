/**
 * Story difficulty tiers, and the Endless / Overtime challenge (starting
 * Threat + optional curses). Pure rules: the game reads `runMods` once at the
 * start of a run and multiplies its spawns by it.
 */
import { THREAT_STEP } from './endless';

// ---------------------------------------------------------------- tiers

export type TierId = 'story' | 'normal' | 'veteran' | 'nightmare';

export interface TierDef {
  id: TierId;
  name: string;
  /** one line for the chapter card */
  desc: string;
  /** the twist this tier adds, if any */
  twist?: string;
  hp: number;
  dmg: number;
  density: number;
  /** multiplier on the chance a spawn wave brings an elite */
  elites: number;
  /** Star Shards multiplier for the run */
  shards: number;
  /** main bosses get an extra telegraphed barrage */
  bossBarrage: boolean;
  color: string;
}

export const TIERS: TierDef[] = [
  { id: 'story', name: 'Story', desc: 'Relaxed: enemies are softer and hit lighter. For the story.', hp: 0.65, dmg: 0.55, density: 0.85, elites: 0.5, shards: 0.6, bossBarrage: false, color: '#7dff8a' },
  { id: 'normal', name: 'Normal', desc: 'The chapter as designed.', hp: 1, dmg: 1, density: 1, elites: 1, shards: 1, bossBarrage: false, color: '#59f3ff' },
  { id: 'veteran', name: 'Veteran', desc: 'Tougher, harder-hitting and denser.', twist: 'Elites turn up three times as often.', hp: 1.4, dmg: 1.3, density: 1.15, elites: 3, shards: 1.6, bossBarrage: false, color: '#ffc94d' },
  { id: 'nightmare', name: 'Nightmare', desc: 'For maxed builds.', twist: 'Elites everywhere, and main bosses add a barrage of ground strikes.', hp: 1.9, dmg: 1.6, density: 1.3, elites: 8, shards: 2.5, bossBarrage: true, color: '#ff4d6d' },
];

export const TIER_IDS = TIERS.map((t) => t.id);

export function tierDef(id: TierId | undefined): TierDef {
  return TIERS.find((t) => t.id === id) ?? TIERS[1];
}

export function tierIndex(id: TierId): number {
  return Math.max(0, TIER_IDS.indexOf(id));
}

/**
 * Which tiers can be picked for a chapter: Story and Normal always; each
 * clear on Normal or above opens the next one. `best` is the highest tier
 * index cleared on that chapter (-1 = none).
 */
export function tierUnlocked(id: TierId, best: number): boolean {
  const i = tierIndex(id);
  return i <= 1 || best >= i - 1;
}

/** the best tier cleared after a clear on `tier` */
export function recordTierClear(best: number | undefined, tier: TierId): number {
  return Math.max(best ?? -1, tierIndex(tier));
}

// ---------------------------------------------------------------- Endless / Overtime challenge

export const START_THREATS = [1, 10, 20, 30] as const;

/** seconds over which Endless climbs to a raised starting Threat (a dead-on-arrival start is no fun) */
export const THREAT_RAMP = 120;

export type CurseId = 'elites' | 'nohealing' | 'bosses' | 'fast' | 'norerolls';

export interface CurseDef {
  id: CurseId;
  name: string;
  desc: string;
  /** extra Star Shards, as a fraction */
  shards: number;
  color: string;
}

export const CURSES: CurseDef[] = [
  { id: 'elites', name: 'Elites everywhere', desc: 'Every spawn wave can bring an elite.', shards: 0.25, color: '#ffe24d' },
  { id: 'nohealing', name: 'No healing pickups', desc: 'Enemies and bosses drop no food.', shards: 0.2, color: '#7dff8a' },
  { id: 'bosses', name: 'Bosses twice as often', desc: 'Great bosses return twice as often.', shards: 0.3, color: '#ff4d6d' },
  { id: 'fast', name: 'Enemies faster', desc: 'Everything moves 25% faster.', shards: 0.2, color: '#59f3ff' },
  { id: 'norerolls', name: 'No rerolls', desc: 'No rerolls on level-ups, from any source.', shards: 0.15, color: '#c46dff' },
];

export const CURSE_IDS = CURSES.map((c) => c.id);

export interface Challenge {
  threat: number;
  curses: CurseId[];
}

export const NO_CHALLENGE: Challenge = { threat: 1, curses: [] };

/** the Endless clock to start from so the HUD shows `threat` */
export function threatStartTime(threat: number): number {
  return Math.max(0, threat - 1) * THREAT_STEP;
}

/** Star Shard multiplier for a challenge: higher starting Threat and each curse pay more */
export function challengeShardMult(c: Challenge): number {
  const t = Math.max(1, c.threat);
  const threatBonus = t >= 30 ? 0.9 : t >= 20 ? 0.55 : t >= 10 ? 0.25 : 0;
  return 1 + threatBonus + c.curses.reduce((a, id) => a + (CURSES.find((x) => x.id === id)?.shards ?? 0), 0);
}

/**
 * Key for a best record: '' for the plain run (so old records keep working),
 * otherwise e.g. "t10+elites+fast" with curses in a fixed order.
 */
export function challengeKey(c: Challenge): string {
  const curses = CURSE_IDS.filter((id) => c.curses.includes(id));
  if (c.threat <= 1 && !curses.length) return '';
  return [`t${Math.max(1, c.threat)}`, ...curses].join('+');
}

export function parseChallengeKey(key: string): Challenge {
  if (!key) return { ...NO_CHALLENGE, curses: [] };
  const parts = key.split('+');
  const threat = Number(parts[0]?.replace(/^t/, '')) || 1;
  return { threat, curses: parts.slice(1).filter((p): p is CurseId => (CURSE_IDS as string[]).includes(p)) };
}

export function challengeLabel(c: Challenge): string {
  const names = CURSE_IDS.filter((id) => c.curses.includes(id)).map((id) => CURSES.find((x) => x.id === id)!.name);
  return [`Threat ${Math.max(1, c.threat)}`, ...names].join(' · ');
}

// ---------------------------------------------------------------- what a run multiplies by

export interface RunMods {
  hp: number;
  dmg: number;
  density: number;
  speed: number;
  elites: number;
  /** every spawn wave can bring an elite (minimum chance) */
  eliteFloor: number;
  noFood: boolean;
  noRerolls: boolean;
  doubleBosses: boolean;
  bossBarrage: boolean;
  shards: number;
}

/**
 * Story runs use their tier. Endless uses its challenge. Overtime uses both:
 * the chapter's tier keeps scaling enemies, and the challenge's curses apply.
 */
export function runMods(tier: TierId | undefined, challenge: Challenge | undefined): RunMods {
  const t = tierDef(tier);
  const c = challenge ?? NO_CHALLENGE;
  const has = (id: CurseId) => c.curses.includes(id);
  return {
    hp: t.hp,
    dmg: t.dmg,
    density: t.density,
    speed: has('fast') ? 1.25 : 1,
    elites: t.elites,
    eliteFloor: has('elites') ? 0.35 : 0,
    noFood: has('nohealing'),
    noRerolls: has('norerolls'),
    doubleBosses: has('bosses'),
    bossBarrage: t.bossBarrage,
    shards: t.shards * challengeShardMult(c),
  };
}
