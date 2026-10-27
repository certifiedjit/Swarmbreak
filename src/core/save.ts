import type { MasteryState } from '../systems/mastery';

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
  progress: { chaptersCleared: number };
  bests: Record<string, Record<string, BestRecord>>;
  stats: { totalKills: number; chestsOpened: number; runs: number; bossesKilled: number; playTime: number; bestStreak: number };
  codex: { evolutions: string[]; enemies: string[] };
  skins: { unlocked: string[]; equipped: Record<string, string> };
  history: RunSummary[];
  /** permanent progression: Star Shards, Armory ranks, per-hero mastery */
  meta: { shards: number; shardsEarned: number; armory: Record<string, number>; mastery: Record<string, MasteryState> };
}

const KEY = 'swarmbreak.save.v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: { music: 0.6, sfx: 0.8, effects: 'full', damageNumbers: true, showFps: false, keys: structuredClone(DEFAULT_KEYS), unlockAll: false },
    progress: { chaptersCleared: 0 },
    bests: {},
    stats: { totalKills: 0, chestsOpened: 0, runs: 0, bossesKilled: 0, playTime: 0, bestStreak: 0 },
    codex: { evolutions: [], enemies: [] },
    skins: { unlocked: ['default'], equipped: {} },
    history: [],
    meta: { shards: 0, shardsEarned: 0, armory: {}, mastery: {} },
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

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return merge(defaultSave(), JSON.parse(raw));
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

export function skinUnlocked(id: string): boolean {
  return save.data.settings.unlockAll || save.data.skins.unlocked.includes(id);
}
