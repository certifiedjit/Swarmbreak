import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSave } from '../src/core/save';
import { THREAT_STEP, endlessParams } from '../src/systems/endless';
import {
  CURSES, CURSE_IDS, START_THREATS, TIERS, challengeKey, challengeLabel, challengeShardMult, parseChallengeKey, recordTierClear, runMods,
  threatStartTime, tierDef, tierUnlocked,
} from '../src/systems/difficulty';

describe('difficulty tiers', () => {
  it('get harder and pay more in order', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].hp).toBeGreaterThan(TIERS[i - 1].hp);
      expect(TIERS[i].dmg).toBeGreaterThan(TIERS[i - 1].dmg);
      expect(TIERS[i].density).toBeGreaterThan(TIERS[i - 1].density);
      expect(TIERS[i].shards).toBeGreaterThan(TIERS[i - 1].shards);
    }
    expect(tierDef('normal')).toMatchObject({ hp: 1, dmg: 1, density: 1, shards: 1 });
    expect(tierDef(undefined).id).toBe('normal');
  });

  it('Story and Normal are open; each clear opens the next tier', () => {
    expect(tierUnlocked('story', -1)).toBe(true);
    expect(tierUnlocked('normal', -1)).toBe(true);
    expect(tierUnlocked('veteran', -1)).toBe(false);
    expect(tierUnlocked('veteran', 0)).toBe(false);
    expect(tierUnlocked('veteran', 1)).toBe(true);
    expect(tierUnlocked('nightmare', 1)).toBe(false);
    expect(tierUnlocked('nightmare', 2)).toBe(true);
  });

  it('keeps the best tier cleared', () => {
    expect(recordTierClear(undefined, 'story')).toBe(0);
    expect(recordTierClear(2, 'normal')).toBe(2);
    expect(recordTierClear(2, 'nightmare')).toBe(3);
  });

  it('Nightmare brings elites and boss barrages', () => {
    const m = runMods('nightmare', undefined);
    expect(m.elites).toBeGreaterThan(runMods('veteran', undefined).elites);
    expect(m.bossBarrage).toBe(true);
    expect(runMods('normal', undefined).bossBarrage).toBe(false);
  });
});

describe('Endless / Overtime challenge', () => {
  it('a starting Threat starts the Endless clock there', () => {
    for (const t of START_THREATS) expect(endlessParams(threatStartTime(t)).threat).toBe(t);
    expect(threatStartTime(1)).toBe(0);
    expect(threatStartTime(10)).toBe(9 * THREAT_STEP);
  });

  it('each raised Threat step and each curse pays more shards', () => {
    let last = 0;
    for (const t of START_THREATS) {
      const m = challengeShardMult({ threat: t, curses: [] });
      expect(m).toBeGreaterThan(last);
      last = m;
    }
    expect(challengeShardMult({ threat: 1, curses: [] })).toBe(1);
    for (const c of CURSES) expect(challengeShardMult({ threat: 1, curses: [c.id] })).toBeCloseTo(1 + c.shards);
    const all = challengeShardMult({ threat: 1, curses: [...CURSE_IDS] });
    expect(all).toBeCloseTo(1 + CURSES.reduce((a, c) => a + c.shards, 0));
  });

  it('record keys are stable, order-free and round-trip', () => {
    expect(challengeKey({ threat: 1, curses: [] })).toBe('');
    expect(challengeKey({ threat: 10, curses: ['fast', 'elites'] })).toBe('t10+elites+fast');
    expect(challengeKey({ threat: 10, curses: ['elites', 'fast'] })).toBe('t10+elites+fast');
    expect(challengeKey({ threat: 1, curses: ['norerolls'] })).toBe('t1+norerolls');
    const c = parseChallengeKey('t20+bosses+nohealing');
    expect(c).toEqual({ threat: 20, curses: ['bosses', 'nohealing'] });
    expect(challengeKey(c)).toBe('t20+nohealing+bosses');
    expect(challengeLabel(c)).toBe('Threat 20 · No healing pickups · Bosses twice as often');
  });

  it('curses turn into run modifiers', () => {
    const m = runMods(undefined, { threat: 1, curses: [...CURSE_IDS] });
    expect(m).toMatchObject({ noFood: true, noRerolls: true, doubleBosses: true, speed: 1.25 });
    expect(m.eliteFloor).toBeGreaterThan(0);
    const plain = runMods(undefined, undefined);
    expect(plain).toMatchObject({ noFood: false, noRerolls: false, doubleBosses: false, speed: 1, eliteFloor: 0, shards: 1 });
  });

  it('Overtime uses the chapter tier together with the curses', () => {
    const m = runMods('veteran', { threat: 10, curses: ['fast'] });
    expect(m.hp).toBe(tierDef('veteran').hp);
    expect(m.speed).toBe(1.25);
    expect(m.shards).toBeCloseTo(tierDef('veteran').shards * challengeShardMult({ threat: 10, curses: ['fast'] }));
  });
});

describe('old saves and tiers', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('chapters cleared before tiers existed count as Normal clears', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ progress: { chaptersCleared: 2 } }), setItem: () => undefined, removeItem: () => undefined });
    const d = loadSave();
    expect(d.progress.tiers).toEqual({ graveyard: 1, cathedral: 1 });
    expect(d.meta.weapons).toEqual([]);
  });
});
