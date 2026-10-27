/**
 * Story-mode round flow for one chapter, as a small state machine:
 *
 *   round(1) --kill meter full--> miniboss --defeated--> breather(10s) --> round(2) ...
 *   round(5) --kill meter full--> boss --defeated--> victory
 *
 * Kills only count toward the meter during the `round` phase. The game reacts
 * to the returned events (spawn the mini-boss, start the breather, etc.).
 */
import type { RoundSpec } from '../data/maps';

export type FlowPhase = 'round' | 'miniboss' | 'breather' | 'boss' | 'victory';

export type FlowEvent =
  | { type: 'roundStart'; round: number }
  | { type: 'spawnMiniboss'; round: number; index: number }
  | { type: 'breatherStart'; seconds: number }
  | { type: 'spawnBoss' }
  | { type: 'victory' };

export const BREATHER_SECONDS = 10;

export class RoundFlow {
  phase: FlowPhase = 'round';
  /** 1-based */
  round = 1;
  kills = 0;
  breatherLeft = 0;
  /** seconds spent in the current round (for density ramp) */
  roundTime = 0;
  readonly rounds: RoundSpec[];

  constructor(rounds: RoundSpec[]) {
    if (rounds.length < 1) throw new Error('RoundFlow needs at least one round');
    this.rounds = rounds;
  }

  get totalRounds(): number {
    return this.rounds.length;
  }

  get spec(): RoundSpec {
    return this.rounds[this.round - 1];
  }

  get target(): number {
    return this.spec.kills;
  }

  /** 0..1 kill-meter fill */
  get progress(): number {
    if (this.phase !== 'round') return this.phase === 'breather' || this.phase === 'miniboss' || this.phase === 'boss' || this.phase === 'victory' ? 1 : 0;
    return Math.min(1, this.kills / this.target);
  }

  /** Regular enemy spawning: full during rounds, a trickle during the mini-boss, none otherwise. */
  get spawnRate(): number {
    switch (this.phase) {
      case 'round':
        return 1;
      case 'miniboss':
        return 0.25;
      case 'boss':
        return 0.15;
      default:
        return 0;
    }
  }

  onKill(count = 1): FlowEvent[] {
    if (this.phase !== 'round') return [];
    this.kills += count;
    if (this.kills < this.target) return [];
    this.kills = this.target;
    if (this.round < this.totalRounds) {
      this.phase = 'miniboss';
      return [{ type: 'spawnMiniboss', round: this.round, index: this.round - 1 }];
    }
    this.phase = 'boss';
    return [{ type: 'spawnBoss' }];
  }

  onMinibossDefeated(): FlowEvent[] {
    if (this.phase !== 'miniboss') return [];
    this.phase = 'breather';
    this.breatherLeft = BREATHER_SECONDS;
    return [{ type: 'breatherStart', seconds: BREATHER_SECONDS }];
  }

  onBossDefeated(): FlowEvent[] {
    if (this.phase !== 'boss') return [];
    this.phase = 'victory';
    return [{ type: 'victory' }];
  }

  update(dt: number): FlowEvent[] {
    if (this.phase === 'round') this.roundTime += dt;
    if (this.phase !== 'breather') return [];
    this.breatherLeft -= dt;
    if (this.breatherLeft > 0) return [];
    this.breatherLeft = 0;
    this.round++;
    this.kills = 0;
    this.roundTime = 0;
    this.phase = 'round';
    return [{ type: 'roundStart', round: this.round }];
  }

  /** How many enemies the director keeps alive right now: ramps from 70% to 100% across the round. */
  targetDensity(): number {
    const s = this.spec;
    const ramp = 0.7 + 0.3 * Math.min(1, this.kills / s.kills);
    return Math.round(s.density * ramp);
  }
}
