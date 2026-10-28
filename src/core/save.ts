import type { MasteryState } from '../systems/mastery';
import type { Loadout } from '../data/cosmetics';

/**
 * Persistent save in localStorage. Every access is wrapped in try/catch
 * (private windows, blocked storage) and falls back to in-memory.
 */
export type Action = 'up' | 'down' | 'left' | 'right' | 'spell' | 'pause';

export const DEFAULT_KEYS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  spell: ['Space'],
  pause: ['Escape', 'KeyP'],
};

export interface Settings {
  music: number;
  sfx: number;
  effects: 'full' | 'reduced';
  damageNumbers: boolean;
  showFps: boolean;
  keys: Record<Action, string[]>;
  unlockAll: boolean;
}

export interface BestRecord {
  time: number;
  kills: number;
  date: number;
}

export interface RunSummary {
  mode: 'story' | 'endless';
  map: string;
  character: string;
  won: boolean;
  time: number;
  kills: number;
  level: number;
  date: number;
}

export interface SaveData {
  version: 1;
  settings: Settings;
  progress: {
    chaptersCleared: number;
    /** best difficulty tier index cleared per chapter map (missing = none) */
    tiers: Record<string, number>;
    /** best difficulty tier index cleared with each hero */
    heroTiers: Record<string, number>;
  };
  bests: Record<string, Record<string, BestRecord>>;
  stats: {
    totalKills: number;
    chestsOpened: number;
    runs: number;
    bossesKilled: number;
    playTime: number;
    bestStreak: number;
    longestEndless: number;
    /** biggest single multi-kill */
    bestMulti: number;
    longestOvertime: number;
    overtimeBossKills: number;
    jackpots: number;
    hazardFreeClears: number;
    noDashBossKills: number;
    storyTierClears: number;
    /** longest Endless run started at Threat 30, and with all five curses */
    longestThreat30: number;
    longestAllCurses: number;
  };
  /** achievement id -> when it was earned */
  achievements: Record<string, number>;
  /** earned cosmetics, each hero's loadout, and the menu background */
  cosmetics: { unlocked: string[]; loadout: Record<string, Partial<Loadout>>; menu: string };
  /** heroes unlocked by their condition (the unlock banner has been shown) */
  heroes: { unlocked: string[] };
  codex: { evolutions: string[]; enemies: string[] };
  skins: { unlocked: string[]; equipped: Record<string, string> };
  history: RunSummary[];
  /** permanent progression: Star Shards, Armory ranks, per-hero mastery */
  meta: { shards: number; shardsEarned: number; armory: Record<string, number>; mastery: Record<string, MasteryState>; weapons: string[] };
}

const KEY = 'swarmbreak.save.v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: { music: 0.6, sfx: 0.8, effects: 'full', damageNumbers: true, showFps: false, keys: structuredClone(DEFAULT_KEYS), unlockAll: false },
    progress: { chaptersCleared: 0, tiers: {}, heroTiers: {} },
    bests: {},
    stats: { totalKills: 0, chestsOpened: 0, runs: 0, bossesKilled: 0, playTime: 0, bestStreak: 0, longestEndless: 0, bestMulti: 0, longestOvertime: 0, overtimeBossKills: 0, jackpots: 0, hazardFreeClears: 0, noDashBossKills: 0, storyTierClears: 0, longestThreat30: 0, longestAllCurses: 0 },
    achievements: {},
    cosmetics: { unlocked: [], loadout: {}, menu: 'menu_graveyard' },
    heroes: { unlocked: [] },
    codex: { evolutions: [], enemies: [] },
    skins: { unlocked: ['default'], equipped: {} },
    history: [],
    meta: { shards: 0, shardsEarned: 0, armory: {}, mastery: {}, weapons: [] },
  };
}

function merge<T>(base: T, over: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return (over ?? base) as T;
  if (typeof over !== 'object' || over === null) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const k of Object.keys(over as object)) {
    const bv = (base as Record<string, unknown>)[k];
    const ov = (over as Record<string, unknown>)[k];
    out[k] = bv !== undefined && typeof bv === 'object' && bv !== null && !Array.isArray(bv) ? merge(bv, ov) : ov;
  }
  return out as T;
}

/** fill fields an older save could not have recorded */
export function upgradeSave(d: SaveData): SaveData {
  // longestEndless arrived with the hero unlocks: recover it from Endless best times
  if (!d.stats.longestEndless) {
    let best = 0;
    for (const byChar of Object.values(d.bests ?? {})) for (const r of Object.values(byChar ?? {})) best = Math.max(best, r?.time ?? 0);
    d.stats.longestEndless = best;
  }
  if (!Array.isArray(d.heroes.unlocked)) d.heroes.unlocked = [];
  if (!Array.isArray(d.meta.weapons)) d.meta.weapons = [];
  if (!Array.isArray(d.cosmetics.unlocked)) d.cosmetics.unlocked = [];
  // the old skin list: Sprout moves into cosmetics, and so does any hero wearing it
  if (d.skins?.unlocked?.includes('sprout') && !d.cosmetics.unlocked.includes('sprout')) d.cosmetics.unlocked.push('sprout');
  for (const [hero, skin] of Object.entries(d.skins?.equipped ?? {})) if (skin === 'sprout') (d.cosmetics.loadout[hero] ??= {}).skin = 'sprout';
  // tiers arrived with difficulty: a chapter cleared before then counts as cleared on Normal
  for (const [i, id] of ['graveyard', 'cathedral', 'black_sun'].entries()) if (d.progress.chaptersCleared > i && d.progress.tiers[id] === undefined) d.progress.tiers[id] = 1;
  return d;
}

/** the "Unlock everything" testing toggle exists in dev builds, or with ?debug in the URL */
export function testingToolsAllowed(): boolean {
  try {
    return import.meta.env.DEV || location.search.includes('debug');
  } catch {
    return false;
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const d = upgradeSave(merge(defaultSave(), JSON.parse(raw)));
    // a public build never honours a testing toggle left on from a dev session
    if (!testingToolsAllowed()) d.settings.unlockAll = false;
    return d;
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: keep playing in memory */
  }
}

export function resetSave(): SaveData {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return defaultSave();
}

export const save = { data: loadSave(), write(): void { writeSave(this.data); } };

export function isEndlessUnlocked(): boolean {
  return save.data.settings.unlockAll || save.data.progress.chaptersCleared >= 1;
}


