import { describe, expect, it } from 'vitest';
import { ENDLESS_UNLOCK, MAX_DENSITY, MILESTONE_INTERVAL, THREAT_STEP, beatsRecord, endlessMixWeights, endlessParams, milestoneAt, milestonesBetween } from '../src/systems/endless';

describe('Endless scaling over time', () => {
  it('starts gentle', () => {
    const p = endlessParams(0);
    expect(p.threat).toBe(1);
    expect(p.hpMult).toBe(1);
    expect(p.dmgMult).toBe(1);
    expect(p.speedMult).toBe(1);
  });

  it('HP, damage, speed and density never decrease over time', () => {
    let prev = endlessParams(0);
    for (let t = 5; t <= 3600; t += 5) {
      const p = endlessParams(t);
      expect(p.hpMult).toBeGreaterThanOrEqual(prev.hpMult);
      expect(p.dmgMult).toBeGreaterThanOrEqual(prev.dmgMult);
      expect(p.speedMult).toBeGreaterThanOrEqual(prev.speedMult);
      expect(p.density).toBeGreaterThanOrEqual(prev.density);
      expect(p.threat).toBeGreaterThanOrEqual(prev.threat);
      prev = p;
    }
  });

  it('rises steadily: clearly harder at 10 and 20 minutes', () => {
    expect(endlessParams(600).hpMult).toBeGreaterThan(5);
    expect(endlessParams(1200).hpMult).toBeGreaterThan(endlessParams(600).hpMult * 2);
    expect(endlessParams(600).dmgMult).toBeGreaterThan(2.5);
  });

  it('threat level ticks up every step', () => {
    expect(endlessParams(THREAT_STEP - 0.01).threat).toBe(1);
    expect(endlessParams(THREAT_STEP).threat).toBe(2);
    expect(endlessParams(THREAT_STEP * 10).threat).toBe(11);
  });

  it('caps density and speed so it stays playable and performant', () => {
    expect(endlessParams(99999).density).toBe(MAX_DENSITY);
    expect(endlessParams(99999).speedMult).toBeLessThanOrEqual(1.5);
  });

  it('fires a milestone every 5 minutes, cycling elite wave → cursed event → boss return', () => {
    expect(MILESTONE_INTERVAL).toBe(300);
    expect(milestonesBetween(0, 299)).toEqual([]);
    const m1 = milestonesBetween(299, 300);
    expect(m1.map((m) => m.kind)).toEqual(['eliteWave']);
    expect(milestoneAt(2).kind).toBe('cursedEvent');
    expect(milestoneAt(2).cursed).toBe('darkness');
    expect(milestoneAt(3).kind).toBe('bossReturn');
    expect(milestoneAt(5).cursed).toBe('doubleSpeed');
    expect(milestoneAt(6).power).toBeGreaterThan(milestoneAt(3).power);
    // a big frame step never skips a milestone
    expect(milestonesBetween(250, 950).map((m) => m.index)).toEqual([1, 2, 3]);
  });

  it('records compare by time, then kills', () => {
    expect(beatsRecord({ time: 100, kills: 1 }, undefined)).toBe(true);
    expect(beatsRecord({ time: 101, kills: 1 }, { time: 100, kills: 500 })).toBe(true);
    expect(beatsRecord({ time: 100.2, kills: 10 }, { time: 100.7, kills: 5 })).toBe(true);
    expect(beatsRecord({ time: 100, kills: 4 }, { time: 100, kills: 5 })).toBe(false);
  });
});

describe('Endless enemy mix', () => {
  const mix = { scrap_crawler: 5, corrupted_drone: 6, void_spawn: 4, scrap_hulk: 1 };
  it('opens with fodder only', () => {
    expect(Object.keys(endlessMixWeights(mix, 0)).sort()).toEqual(['corrupted_drone', 'scrap_crawler']);
  });
  it('fades each type in after it unlocks, up to its full weight', () => {
    const at = ENDLESS_UNLOCK.scrap_hulk;
    expect(endlessMixWeights(mix, at).scrap_hulk).toBeUndefined();
    const mid = endlessMixWeights(mix, at + 20).scrap_hulk;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(endlessMixWeights(mix, at + 60).scrap_hulk).toBe(1);
    expect(endlessMixWeights(mix, 9999)).toEqual(mix);
  });
});
