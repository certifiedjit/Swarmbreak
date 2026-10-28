/**
 * Endless-mode scaling. Everything is a pure function of seconds survived so
 * it's deterministic and easy to test/tune.
 */

export interface EndlessParams {
  /** shown on the HUD, ticks up every THREAT_STEP seconds */
  threat: number;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  /** enemies kept alive */
  density: number;
  /** chance a spawn wave includes a named elite */
  eliteChance: number;
  /** max enemies spawned per second */
  spawnCap: number;
}

export const THREAT_STEP = 20;
export const MILESTONE_INTERVAL = 300;
export const MAX_DENSITY = 520;

export function endlessParams(t: number): EndlessParams {
  const m = Math.max(0, t) / 60;
  return {
    threat: 1 + Math.floor(Math.max(0, t) / THREAT_STEP),
    // a cubic tail past ~10 minutes so a maxed build is eventually overwhelmed
    hpMult: 1 + 0.3 * m + 0.05 * m * m + 0.002 * m * m * m,
    dmgMult: 1 + 0.1 * m + 0.01 * m * m,
    speedMult: Math.min(1.5, 1 + 0.03 * m),
    density: Math.min(MAX_DENSITY, Math.round(80 + 35 * m)),
    eliteChance: Math.min(0.2, 0.02 + 0.01 * m),
    spawnCap: Math.min(170, 70 + 6 * m),
  };
}

/**
 * When each enemy type starts showing up in Endless (seconds), so the run
 * opens with fodder and the nastier types fade in over the first minutes.
 * Types not listed are available from the start.
 */
export const ENDLESS_UNLOCK: Record<string, number> = {
  void_spawn: 45,
  volatile_cell: 90,
  signal_drone: 140,
  mortar_husk: 200,
  scrap_hulk: 260,
  // Cathedral Moon
  thorn_horror: 80,
  choir_wraith: 120,
  ossuary_brute: 250,
  // Black Sun
  rift_wraith: 60,
  eclipse_seer: 120,
  star_eater: 240,
  // Frozen Archive
  frost_scribe: 70,
  ink_hound: 110,
  tome_golem: 250,
  // Hive Below
  acid_spitter: 60,
  egg_sac: 100,
  carapace_charger: 160,
};

/** spawn weights at time t: a type fades in over 45s after it unlocks */
export function endlessMixWeights(mix: Record<string, number>, t: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, w] of Object.entries(mix)) {
    const at = ENDLESS_UNLOCK[id] ?? 0;
    const k = at <= 0 ? 1 : Math.max(0, Math.min(1, (t - at) / 45));
    if (k > 0) out[id] = w * k;
  }
  return out;
}

export type MilestoneKind = 'eliteWave' | 'cursedEvent' | 'bossReturn';
export type CursedEvent = 'darkness' | 'doubleSpeed';

export interface Milestone {
  /** 1-based milestone number */
  index: number;
  time: number;
  kind: MilestoneKind;
  /** how much stronger than the base version (bosses, elites) */
  power: number;
  cursed?: CursedEvent;
}

const ORDER: MilestoneKind[] = ['eliteWave', 'cursedEvent', 'bossReturn'];

export function milestoneAt(index: number): Milestone {
  const kind = ORDER[(index - 1) % ORDER.length];
  return {
    index,
    time: index * MILESTONE_INTERVAL,
    kind,
    power: 1 + 0.6 * (index - 1),
    cursed: kind === 'cursedEvent' ? (Math.floor((index - 1) / ORDER.length) % 2 === 0 ? 'darkness' : 'doubleSpeed') : undefined,
  };
}

/** Milestones whose time falls in (prevT, t]. */
export function milestonesBetween(prevT: number, t: number): Milestone[] {
  const out: Milestone[] = [];
  const first = Math.floor(prevT / MILESTONE_INTERVAL) + 1;
  const last = Math.floor(t / MILESTONE_INTERVAL);
  for (let i = Math.max(1, first); i <= last; i++) out.push(milestoneAt(i));
  return out;
}

/** Score: time survived first, kills break ties. Returns true if a beats b. */
export function beatsRecord(a: { time: number; kills: number }, b: { time: number; kills: number } | undefined): boolean {
  if (!b) return true;
  if (Math.floor(a.time) !== Math.floor(b.time)) return a.time > b.time;
  return a.kills > b.kills;
}
