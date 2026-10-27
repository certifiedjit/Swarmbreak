import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { BREATHER_SECONDS, RoundFlow, type FlowEvent } from '../src/systems/roundFlow';

const rounds = MAPS.graveyard.rounds;

function fillMeter(flow: RoundFlow): FlowEvent[] {
  let ev: FlowEvent[] = [];
  for (let i = 0; i < flow.target; i++) ev = ev.concat(flow.onKill());
  return ev;
}

describe('RoundFlow (story rounds + kill meter)', () => {
  it('starts in round 1 with an empty kill meter', () => {
    const f = new RoundFlow(rounds);
    expect(f.round).toBe(1);
    expect(f.phase).toBe('round');
    expect(f.kills).toBe(0);
    expect(f.progress).toBe(0);
    expect(f.target).toBe(rounds[0].kills);
  });

  it('fills the meter and summons a mini-boss exactly when the target is reached', () => {
    const f = new RoundFlow(rounds);
    for (let i = 0; i < f.target - 1; i++) expect(f.onKill()).toEqual([]);
    expect(f.progress).toBeCloseTo((f.target - 1) / f.target);
    const ev = f.onKill();
    expect(ev).toEqual([{ type: 'spawnMiniboss', round: 1, index: 0 }]);
    expect(f.phase).toBe('miniboss');
  });

  it('ignores kills outside the round phase', () => {
    const f = new RoundFlow(rounds);
    fillMeter(f);
    expect(f.onKill(50)).toEqual([]);
    expect(f.kills).toBe(f.target);
  });

  it('runs a 10 second breather after the mini-boss, then the next round starts', () => {
    const f = new RoundFlow(rounds);
    fillMeter(f);
    expect(f.onMinibossDefeated()).toEqual([{ type: 'breatherStart', seconds: BREATHER_SECONDS }]);
    expect(f.phase).toBe('breather');
    expect(f.spawnRate).toBe(0);
    expect(f.update(BREATHER_SECONDS - 0.5)).toEqual([]);
    expect(f.update(0.6)).toEqual([{ type: 'roundStart', round: 2 }]);
    expect(f.round).toBe(2);
    expect(f.kills).toBe(0);
    expect(f.target).toBe(rounds[1].kills);
  });

  it('later rounds are denser and tougher', () => {
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i].density).toBeGreaterThan(rounds[i - 1].density);
      expect(rounds[i].hpMult).toBeGreaterThan(rounds[i - 1].hpMult);
      expect(rounds[i].kills).toBeGreaterThan(rounds[i - 1].kills);
    }
  });

  it('round 5 ends with the main boss, and beating it is victory', () => {
    const f = new RoundFlow(rounds);
    const events: FlowEvent[] = [];
    for (let r = 1; r <= 4; r++) {
      events.push(...fillMeter(f));
      events.push(...f.onMinibossDefeated());
      events.push(...f.update(BREATHER_SECONDS + 0.01));
    }
    expect(f.round).toBe(5);
    expect(events.filter((e) => e.type === 'spawnMiniboss').length).toBe(4);
    expect(fillMeter(f)).toEqual([{ type: 'spawnBoss' }]);
    expect(f.phase).toBe('boss');
    expect(f.onMinibossDefeated()).toEqual([]); // wrong phase does nothing
    expect(f.onBossDefeated()).toEqual([{ type: 'victory' }]);
    expect(f.phase).toBe('victory');
  });

  it('density ramps up within a round', () => {
    const f = new RoundFlow(rounds);
    const start = f.targetDensity();
    for (let i = 0; i < f.target - 1; i++) f.onKill();
    expect(f.targetDensity()).toBeGreaterThan(start);
    expect(f.targetDensity()).toBeLessThanOrEqual(rounds[0].density);
  });
});
