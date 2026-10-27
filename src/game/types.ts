import type { Container, Sprite, Text } from 'pixi.js';
import type { EliteMod, EnemyDef } from '../data/enemies';
import type { PP } from './layers';

export type EnemyKind = 'normal' | 'elite' | 'mini' | 'boss';

export interface EliteInfo {
  name: string;
  mod: EliteMod;
  aura: PP | null;
  label: Text | null;
  timer: number;
}

export interface Enemy {
  uid: number;
  kind: EnemyKind;
  def: EnemyDef | null;
  /** art key for normal/elite enemies */
  sprite: string;
  x: number;
  y: number;
  /** knockback velocity */
  kx: number;
  ky: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  coinChance: number;
  mass: number;
  /** flat damage reduction per hit */
  armor: number;
  color: number;
  p: PP | null;
  view: Container | null;
  scale: number;
  flash: number;
  anim: number;
  facing: number;
  /** AI state */
  state: number;
  stateT: number;
  aux: number;
  ax: number;
  ay: number;
  orbitHitAt: number;
  wheelHitAt: number;
  /** seconds left frozen in place (cryo) */
  frozen: number;
  hazardHitAt: number;
  dashHitAt: number;
  /** accumulated damage waiting to be shown as one number */
  dmgAccum: number;
  dmgTimer: number;
  shield: number;
  dead: boolean;
  elite: EliteInfo | null;
  boss: BossState | null;
  /** counts toward the story kill meter */
  countsForMeter: boolean;
}

export interface BossState {
  id: string;
  name: string;
  title: string;
  isMain: boolean;
  phase: number;
  attackT: number;
  attackIdx: number;
  addsT: number;
  spiralT: number;
  spiralAng: number;
  spiralArms: number;
  sprite: Sprite;
  glow: Sprite | null;
  shadow: Sprite;
  shieldGfx: Sprite | null;
  power: number;
  spawnedAt: number;
  miniIndex: number;
  /** seconds spent far from the player; triggers a catch-up relocation */
  farT?: number;
  /** mid-relocation: hidden and untouchable until it re-emerges */
  moving?: boolean;
  /** Crystal Colossus: already split in two */
  split?: boolean;
  /** Heart of the Black Sun: its orbiting shield shards */
  minions?: Enemy[];
  /** damage taken multiplier while guarded (1 = unguarded) */
  guard?: number;
}

export type ProjKind = 'glaive' | 'missile' | 'orbBlade' | 'shard' | 'bomb' | 'round' | 'bolt' | 'spirit';

export interface Projectile {
  kind: ProjKind;
  weapon: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  dmg: number;
  r: number;
  knock: number;
  pierce: number;
  hits: Set<number>;
  p: PP;
  glow: PP | null;
  /** boomerang phase / missile target uid */
  phase: number;
  target: number;
  /** missile target (checked against `target` uid because enemies are pooled) */
  tgt: Enemy | null;
  mini: boolean;
  spin: number;
  trailT: number;
  /** evolved behaviour flag (comet trails, hive splits) */
  evolved: boolean;
  /** splash radius for missiles */
  splash: number;
  color: number;
  /** remaining bounces (ricochet, gravity bombs) */
  n: number;
  /** freeze seconds applied on hit (cryo) */
  freeze: number;
  /** spirit: per-hit cooldown */
  cd: number;
}

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  p: PP;
  glow: PP | null;
}

export type PickupKind = 'gem' | 'coin' | 'food' | 'magnet' | 'bomb';

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  attracted: boolean;
  speed: number;
  p: PP;
  t: number;
}

export interface Telegraph {
  kind: 'circle' | 'line' | 'ring';
  x: number;
  y: number;
  r: number;
  ang: number;
  len: number;
  w: number;
  t: number;
  dur: number;
  color: number;
  /** optional: follows an enemy */
  onDone?: () => void;
}

export interface Zone {
  x: number;
  y: number;
  r: number;
  life: number;
  tick: number;
  dmg: number;
  weapon: string;
  color: number;
  /** drawn as a visible pool (acid, craters) */
  pool?: boolean;
  /** heals the player per tick while they stand in it */
  heal?: number;
  max?: number;
}
