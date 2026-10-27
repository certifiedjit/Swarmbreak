/**
 * Each hero's signature passive, applied to a live run. The numbers and pure
 * rules live in src/systems/heroes.ts; this wires them to the simulation.
 */
import { audio } from '../audio/audio';
import { WEAPONS } from '../data/weapons';
import {
  FORTUNE, PYRE, RIVEN, VOIDCALLER, fortuneBurstChance, fortuneBurstDamage, glintShotCrits, heroDamageMult, pyreTrailDamage,
  rivenMaxTurrets, rivenShouldDeploy, voidcallerRaiseChance, GLINT,
} from '../systems/heroes';
import type { Game } from './game';
import type { Enemy, Projectile } from './types';

/** projectiles that count as "launched" for Glint (not halo blades or spirits) */
const LAUNCHED = new Set<Projectile['kind']>(['glaive', 'missile', 'shard', 'bomb', 'round', 'bolt']);

export class HeroPassive {
  readonly id: string;
  /** rank of the hero's signature skill-tree node */
  readonly power: number;
  private g: Game;
  private shots = 0;
  private stillT = 0;
  private sinceDeploy = 0;
  private deployedThisStand = 0;
  private trailDist = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(g: Game, power: number) {
    this.g = g;
    this.id = g.opts.character;
    this.power = power;
    this.lastX = g.px;
    this.lastY = g.py;
  }

  /** damage multiplier for a hit on `e` (Pyre's rage, Riven's big-game bonus) */
  damageMult(e: Enemy): number {
    const g = this.g;
    return heroDamageMult(this.id, g.hp / g.stats.maxHp, e.kind);
  }

  /** extra crit damage on a guaranteed crit (Glint's signature node) */
  forcedCritBonus(): number {
    return this.id === 'glint' ? 1 + GLINT.critDamagePerPower * this.power : 1;
  }

  /** Glint: every 3rd launched projectile is a guaranteed crit */
  onLaunch(p: Projectile): void {
    p.crit = false;
    if (this.id !== 'glint' || !LAUNCHED.has(p.kind)) return;
    if (glintShotCrits(++this.shots)) {
      p.crit = true;
      p.p.tint = 0xffd6f6;
    }
  }

  /** Voidcaller: kills sometimes rise as void spirits */
  onKill(e: Enemy): void {
    if (this.id !== 'voidcaller' || e.boss) return;
    const g = this.g;
    if (g.rng.next() >= voidcallerRaiseChance(this.power)) return;
    let alive = 0;
    for (const p of g.projectiles) if (p.kind === 'spirit' && p.weapon === 'raised_spirit') alive++;
    if (alive >= VOIDCALLER.maxRaised) return;
    const p = g.weapons.arsenal.summon('raised_spirit', 0xb36bff, false, 8 + g.level * 0.5, VOIDCALLER.raisedLife * g.stats.duration, 1.1);
    p.x = e.x;
    p.y = e.y;
    g.fx.ring(e.x, e.y, 4, 22, 0xb36bff, 0.35);
  }

  /** Fortune: a picked-up coin sometimes bursts */
  onCoin(): void {
    if (this.id !== 'fortune') return;
    const g = this.g;
    if (g.rng.next() >= fortuneBurstChance(this.power)) return;
    const R = FORTUNE.burstRadius * g.stats.area;
    g.fx.ring(g.px, g.py, 6, R, 0xffb330, 0.3, 0.9, true);
    g.fx.sparks(g.px, g.py, 0xffd36a, g.reduced ? 3 : 8, 160, 0.3);
    audio.play('coin', { pitch: 0.6, vol: 0.7 });
    const kills = g.areaDamage(g.px, g.py, R, fortuneBurstDamage(g.level), 'coin_burst', 160);
    g.multiKill(kills, 'JACKPOT');
  }

  update(dt: number): void {
    if (this.id === 'riven') this.updateRiven(dt);
    else if (this.id === 'pyre') this.updatePyre();
  }

  private updateRiven(dt: number): void {
    const g = this.g;
    if (g.moving) {
      this.stillT = 0;
      this.deployedThisStand = 0;
      return;
    }
    this.stillT += dt;
    this.sinceDeploy += dt;
    if (!rivenShouldDeploy(this.stillT, this.deployedThisStand, this.sinceDeploy, this.power)) return;
    this.deployedThisStand++;
    this.sinceDeploy = 0;
    const ars = g.weapons.arsenal;
    ars.deployFieldTurret(g.px + g.faceX * 14, g.py + 6, RIVEN.turretLife * g.stats.duration, rivenMaxTurrets(this.power), WEAPONS.sentry_turret);
  }

  private updatePyre(): void {
    const g = this.g;
    const d = Math.hypot(g.px - this.lastX, g.py - this.lastY);
    this.lastX = g.px;
    this.lastY = g.py;
    if (!g.moving || d > 60) return; // ignore teleports
    this.trailDist += d;
    if (this.trailDist < PYRE.trailStep) return;
    this.trailDist = 0;
    const life = PYRE.trailLife * g.stats.duration;
    g.zones.push({ x: g.px, y: g.py + 8, r: PYRE.trailRadius * g.stats.area, life, tick: 0.1, dmg: pyreTrailDamage(g.level, this.power), weapon: 'pyre_trail', color: 0xff6a2a, fire: true, max: life });
    if (!g.reduced || Math.random() < 0.4) g.fx.embers(g.px, g.py + 8, 0xff8a3d, 2, 30, 0.6);
  }
}
