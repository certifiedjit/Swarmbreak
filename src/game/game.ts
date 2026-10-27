/**
 * One run of Swarmbreak (story chapter or endless). Owns the world, the fixed
 * timestep simulation and all gameplay systems. UI is driven through GameUI.
 */
import { Container, Graphics, Sprite, Texture, TilingSprite, type Application } from 'pixi.js';
import { audio } from '../audio/audio';
import { clamp, damp } from '../core/math';
import { Rng } from '../core/rng';
import { save } from '../core/save';
import { SpatialHash } from '../core/spatialHash';
import { CHARACTERS } from '../data/characters';
import { MAPS, MAP_ORDER, type MapDef } from '../data/maps';
import { RARITY_INFO, rarityOf, type RarityIndex } from '../data/rarity';
import { SPELLS } from '../data/spells';
import { ALL_WEAPON_IDS } from '../data/weapons';
import type { StatBlock, StatMod } from '../data/stats';
import type { Input } from '../input/input';
import type { Assets } from '../render/assets';
import { vignetteCanvas } from '../render/assets';
import { buildStats, eligibleEvolutions, newBuild, type Build } from '../systems/build';
import { beatsRecord, endlessParams, milestonesBetween, type Milestone } from '../systems/endless';
import { applyOffer, upgradePool, chestPrice, newChestState, rollChestItem, rollChestRarity, rollLevelUpOffers, rollRarity, type ChestState, type Offer, type OfferResult } from '../systems/offers';
import { RoundFlow, type FlowEvent } from '../systems/roundFlow';
import { addMasteryXp, emptyBonus, rollCacheShards, runMasteryXp, shardsForRun, type MetaBonus } from '../systems/mastery';
import type { ShopItem } from '../systems/shop';
import { getMastery } from '../core/meta';
import { isFillerOnly, xpToNext } from '../systems/xp';
import { chestCostMult, freeRerollsPerLevel, spellCooldownMult } from '../systems/heroes';
import { CURSES, NO_CHALLENGE, THREAT_RAMP, challengeKey, recordTierClear, runMods, threatStartTime, tierDef, type Challenge, type RunMods, type TierId } from '../systems/difficulty';
import type { HeroBody } from '../render/heroArt';
import { spawnMainBoss, spawnMiniboss, updateBosses } from './bosses';
import { damageEnemy, killEnemy, spawnDirector, spawnEliteWave, updateEnemies, updateChains, cleanupEnemies, clearAllEnemies } from './enemies';
import { Fx } from './fx';
import { buildDecor, type Lamp } from './decor';
import { Hazards } from './hazards';
import { PLayer } from './layers';
import { WorldObjects } from './objects';
import { Pickups } from './pickups';
import type { Enemy, EnemyBullet, Projectile, Telegraph, Zone } from './types';
import { Weapons } from './weapons';
import { HeroPassive } from './heroPassive';

export const STEP = 1 / 60;

export type GameMode = 'story' | 'endless';
export type Modal = 'none' | 'levelup' | 'chest' | 'shrine' | 'shop' | 'pause' | 'intro' | 'ended';

export interface ChestOpenResult {
  rarity: RarityIndex;
  offer: Offer;
  odds: number[];
  free: boolean;
  legendary: boolean;
  /** coins paid to open it (half comes back if you leave the item) */
  paid: number;
}

export interface RunStats {
  kills: number;
  killsByType: Record<string, number>;
  damageByWeapon: Record<string, number>;
  biggestHit: { value: number; weapon: string };
  coinsEarned: number;
  coinsSpent: number;
  chestsByRarity: number[];
  bossTimes: { name: string; time: number }[];
  dpsSamples: number[];
  maxStreak: number;
}

export interface RunResult {
  mode: GameMode;
  map: string;
  character: string;
  won: boolean;
  time: number;
  level: number;
  stats: RunStats;
  newRecord: boolean;
  seed: number;
  build: Build;
  progress: RunProgress;
  /** seconds survived in Overtime after the chapter boss (0 = ended at victory) */
  overtime: number;
  overtimeBosses: number;
  /** tier and curses that applied (see Game.difficultyTags) */
  tags: string[];
}

/** permanent progress awarded at the end of a run */
export interface VictoryCacheResult {
  coins: number;
  shards: number;
  /** the shard roll's base, and which CACHE_TIERS entry it landed on */
  base: number;
  tier: number;
  masteryXp: number;
  first: boolean;
}

export interface RunProgress {
  masteryXp: number;
  levelBefore: number;
  levelAfter: number;
  shards: number;
  coinsLeft: number;
  /** what the Victory Cache added (story clears) */
  cache?: { shards: number; masteryXp: number; coins: number };
}

export interface GameUI {
  levelUp(offers: Offer[]): void;
  chest(result: ChestOpenResult): void;
  victoryCache(r: VictoryCacheResult): void;
  victoryChoice(): void;
  shrine(choices: Offer[]): void;
  bossIntro(name: string, title: string, main: boolean, color: number): void;
  banner(text: string, sub?: string, color?: string): void;
  edgePulse(color: string, strength: number): void;
  end(result: RunResult): void;
  toast(text: string, color?: string): void;
  pause(): void;
  shop(items: ShopItem[]): void;
  /** multi-kill callout, e.g. "×14 CLEAVE" */
  multi(n: number, label: string): void;
}

export interface GameOptions {
  mode: GameMode;
  map: string;
  character: string;
  skin: string;
  seed?: number;
  /** permanent bonuses (skill tree + Armory) */
  meta?: MetaBonus;
  /** weapons that can be offered this run (default: all) */
  weaponPool?: string[];
  /** Story difficulty tier (also scales Overtime) */
  tier?: TierId;
  /** Endless: starting Threat + curses. Story: what Overtime will use. */
  challenge?: Challenge;
}

export class Game {
  readonly app: Application;
  readonly a: Assets;
  readonly input: Input;
  readonly ui: GameUI;
  readonly opts: GameOptions;
  readonly map: MapDef;
  readonly rng: Rng;
  readonly lootRng: Rng;
  readonly seed: number;

  // scene graph
  readonly root = new Container();
  readonly world = new Container();
  readonly floor: TilingSprite;
  readonly decor = new Container();
  readonly hazardGfx = new Graphics();
  readonly groundGfx = new Graphics();
  readonly zoneGfx = new Graphics();
  readonly objectsLayer = new Container();
  readonly pickupLayer: PLayer;
  readonly enemyLayer: PLayer;
  readonly auraLayer: PLayer;
  readonly bigLayer = new Container();
  readonly playerLayer = new Container();
  readonly projLayer: PLayer;
  readonly boltGfx = new Graphics();
  readonly teleGfx = new Graphics();
  readonly labelLayer = new Container();
  readonly fx: Fx;
  private vignette: Sprite;
  private darkness: Sprite;
  private worldDark = new Sprite();
  private flashGfx = new Graphics();
  private flashA = 0;
  private flashColor = 0xffffff;

  // systems
  readonly hash: SpatialHash;
  readonly weapons: Weapons;
  /** the hero's signature passive */
  readonly passive: HeroPassive;
  /** weapons that can be offered this run */
  readonly weaponPool: readonly string[];
  readonly tier: TierId;
  readonly challenge: Challenge;
  /** difficulty multipliers for this run (tier, and curses in Endless / Overtime) */
  mods: RunMods;
  /** Endless starts its clock here so the HUD opens at the chosen Threat */
  private endlessOffset = 0;
  readonly pickups: Pickups;
  readonly hazards: Hazards;
  readonly objects: WorldObjects;
  flow: RoundFlow | null = null;

  // world state
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  bullets: EnemyBullet[] = [];
  telegraphs: Telegraph[] = [];
  zones: Zone[] = [];
  bolts: { pts: number[]; life: number; max: number; color: number; width: number }[] = [];
  uid = 1;

  // player
  build: Build;
  stats!: StatBlock;
  px = 0;
  py = 0;
  pvx = 0;
  pvy = 0;
  faceAng = 0;
  faceX = 1;
  hp = 100;
  invuln = 0;
  dashT = 0;
  dashVX = 0;
  dashVY = 0;
  hurtFlash = 0;
  level = 1;
  xp = 0;
  xpNext = xpToNext(1);
  pendingLevels = 0;
  coins = 0;
  spellCd = 0;
  revivesUsed = 0;
  healOverTime = 0;
  lifestealBudget = 0;
  private playerSprite: Sprite;
  private sigil: Sprite;
  private playerGlow: Sprite;
  private animT = 0;
  moving = false;
  playerDead = false;
  private deathT = 0;

  // run state
  time = 0;
  modal: Modal = 'intro';
  hitstop = 0;
  private acc = 0;
  zoom = 2;
  camX = 0;
  camY = 0;
  chestState: ChestState = newChestState();
  paidChests = 0;
  stats_: RunStats = {
    kills: 0, killsByType: {}, damageByWeapon: {}, biggestHit: { value: 0, weapon: '' }, coinsEarned: 0, coinsSpent: 0,
    chestsByRarity: [0, 0, 0, 0, 0], bossTimes: [], dpsSamples: [], maxStreak: 0,
  };
  private dpsWindow = 0;
  private dpsT = 0;
  streak = 0;
  streakT = 0;
  private killTimes: number[] = [];
  frenzy = 0;
  timeSlow = 0;
  curseLevel = 0;
  /** endless cursed events */
  darknessT = 0;
  doubleSpeedT = 0;
  bossActive: Enemy | null = null;
  victoryT = -1;
  /** Overtime: a cleared story run that keeps going with Endless rules (-1 = not in overtime) */
  overtimeAt = -1;
  /** the Endless clock Overtime starts from, so it opens as hard as the final round */
  private overtimeOffset = 0;
  overtimeBossIn = 0;
  private overtimeBosses = 0;
  private overtimeEliteDone = false;

  /** the clock Endless scaling reads: run time, or Overtime's shifted clock */
  get endlessT(): number {
    // a raised starting Threat is reached over the first THREAT_RAMP seconds, so there is time to build
    return this.overtimeAt >= 0 ? this.time - this.overtimeAt + this.overtimeOffset : this.time + this.endlessOffset * Math.min(1, this.time / THREAT_RAMP);
  }

  /** what is making this run harder, for the HUD and results: the tier, then active curses */
  difficultyTags(): string[] {
    const tags: string[] = [];
    if (this.tier !== 'normal') tags.push(tierDef(this.tier).name);
    const cursesOn = this.opts.mode === 'endless' || this.overtimeAt >= 0;
    if (cursesOn && this.challenge.threat > 1) tags.push(this.opts.mode === 'endless' && this.time < THREAT_RAMP ? `Climbing to Threat ${this.challenge.threat}` : `Started at Threat ${this.challenge.threat}`);
    if (cursesOn) for (const id of this.challenge.curses) tags.push(CURSES.find((c) => c.id === id)!.name);
    return tags;
  }

  /** where this run's Endless best is kept: per map, and per starting Threat + curses */
  recordKey(): string {
    const k = challengeKey(this.challenge);
    return k ? `${this.map.id}|${k}` : this.map.id;
  }
  private bestRecord: { time: number; kills: number } | undefined;
  private recordAnnounced = false;
  newRecord = false;
  rerolls = 2;
  skips = 2;
  banishes = 1;
  private currentOffers: Offer[] = [];
  private pendingChest: ChestOpenResult | null = null;
  private pendingShrine: Offer[] | null = null;
  private lastTrackIntensity = 0;
  reduced: boolean;
  private destroyed = false;

  constructor(app: Application, assets: Assets, input: Input, ui: GameUI, opts: GameOptions) {
    this.app = app;
    this.a = assets;
    this.input = input;
    this.ui = ui;
    this.opts = opts;
    this.map = MAPS[opts.map];
    this.seed = opts.seed ?? (Math.random() * 0xffffffff) >>> 0;
    this.rng = new Rng(this.seed);
    this.lootRng = this.rng.fork(7);
    this.reduced = save.data.settings.effects === 'reduced';

    this.build = newBuild(opts.character);
    this.weaponPool = opts.weaponPool ?? ALL_WEAPON_IDS;
    this.tier = opts.mode === 'story' ? (opts.tier ?? 'normal') : 'normal';
    this.challenge = opts.challenge ?? NO_CHALLENGE;
    this.mods = runMods(this.tier, opts.mode === 'endless' ? this.challenge : undefined);
    if (opts.mode === 'endless') this.endlessOffset = threatStartTime(this.challenge.threat);
    const meta = opts.meta ?? emptyBonus();
    this.metaMods = meta.mods;
    this.rerolls += meta.rerolls;
    this.banishes += meta.banishes;
    this.skips += meta.skips;
    this.coins = meta.startCoins;
    if (this.mods.noRerolls) this.rerolls = 0;
    this.priceMult = meta.priceMult;
    this.refreshStats();
    this.hp = this.stats.maxHp;
    this.px = this.map.width / 2;
    this.py = this.map.height / 2;
    this.camX = this.px;
    this.camY = this.py;

    // ---- layers
    this.floor = new TilingSprite({ texture: assets.floor[this.map.art] ?? assets.floor.graveyard, width: this.map.width + 512, height: this.map.height + 512 });
    this.floor.position.set(-256, -256);
    this.pickupLayer = new PLayer(assets.px.gem0);
    this.enemyLayer = new PLayer(assets.px.px);
    this.auraLayer = new PLayer(assets.soft.glow, { blend: 'add' });
    this.projLayer = new PLayer(assets.px.glaive);
    this.fx = new Fx(assets);
    this.fx.setReduced(this.reduced);
    this.fx.numbersOn = save.data.settings.damageNumbers;
    this.hash = new SpatialHash(this.map.width, this.map.height, 48, 16384, 8192);

    this.world.addChild(
      this.floor, this.decor, this.hazardGfx, this.groundGfx, this.zoneGfx, this.objectsLayer, this.pickupLayer.pc, this.auraLayer.pc,
      this.enemyLayer.pc, this.bigLayer, this.playerLayer, this.worldDark, this.teleGfx, this.projLayer.pc, this.fx.soft.pc, this.boltGfx,
      this.fx.px.pc, this.fx.pxNormal.pc, this.labelLayer, this.fx.digits.pc,
    );

    // player visuals
    const hero = this.heroTex();
    this.sigil = new Sprite(assets.px.sigil);
    this.sigil.anchor.set(0.5);
    this.sigil.blendMode = 'add';
    this.sigil.tint = CHARACTERS[opts.character].glow;
    this.playerGlow = new Sprite(assets.soft.glow);
    this.playerGlow.anchor.set(0.5);
    this.playerGlow.blendMode = 'add';
    this.playerGlow.tint = CHARACTERS[opts.character].glow;
    this.playerGlow.alpha = 0.22;
    this.playerGlow.scale.set(1.3);
    this.playerSprite = new Sprite(hero.idle[0]);
    this.playerSprite.anchor.set(0.5, 0.62);
    this.playerLayer.addChild(this.sigil, this.playerGlow, this.playerSprite);

    // screen overlays
    this.vignette = new Sprite(Texture.from(vignetteCanvas()));
    this.darkness = new Sprite(Texture.from(darkHoleCanvas()));
    // the Black Sun's shrinking light lives in the world, under bullets and warnings so those always show
    this.worldDark.texture = this.darkness.texture;
    this.worldDark.anchor.set(0.5);
    this.worldDark.visible = false;
    this.darkness.anchor.set(0.5);
    this.darkness.visible = false;
    this.root.addChild(this.world, this.darkness, this.vignette, this.flashGfx);

    // systems
    this.passive = new HeroPassive(this, meta.passive);
    this.weapons = new Weapons(this);
    this.pickups = new Pickups(this);
    this.hazards = new Hazards(this);
    this.objects = new WorldObjects(this);
    this.buildDecor();
    this.hazards.place();
    this.objects.place();

    if (opts.mode === 'story') this.flow = new RoundFlow(this.map.rounds);
    else this.bestRecord = save.data.bests[this.recordKey()]?.[opts.character];

    this.weapons.sync();
    this.resize(app.screen.width, app.screen.height);
    audio.playMusic(this.map.music);
  }

  // ------------------------------------------------------------------ setup
  heroTex() {
    return this.a.heroes[this.opts.skin === 'sprout' ? 'sprout' : (this.opts.character as HeroBody)] ?? this.a.heroes.warden;
  }

  private buildDecor(): void {
    this.lamps = buildDecor(this.map.art, this.a, this.decor, this.rng.fork(99), this.map.width, this.map.height);
  }

  private lamps: Lamp[] = [];

  /** permanent bonuses from the character's mastery skill tree */
  metaMods: StatMod[] = [];

  refreshStats(): void {
    const prevMax = this.stats?.maxHp ?? 0;
    this.stats = buildStats(this.build, this.level, this.metaMods);
    if (prevMax && this.stats.maxHp > prevMax) this.hp += this.stats.maxHp - prevMax;
    this.hp = Math.min(this.hp, this.stats.maxHp);
  }

  resize(w: number, h: number): void {
    // phones keep the hero at 1.35x or more so the art stays readable; big screens show ~400 world px
    this.zoom = clamp(Math.min(w, h) / 400, 1.35, 3.2);
    this.world.scale.set(this.zoom);
    this.vignette.width = w;
    this.vignette.height = h;
    this.flashGfx.clear().rect(0, 0, w, h).fill(0xffffff);
    this.flashGfx.alpha = 0;
  }

  get viewW(): number {
    return this.app.screen.width / this.zoom;
  }

  get viewH(): number {
    return this.app.screen.height / this.zoom;
  }

  /** start gameplay after the story card / intro */
  begin(): void {
    this.modal = 'none';
    this.input.clearEdges();
    this.objects.spawnNearbyChests(1);
    if (this.opts.mode === 'story') this.ui.banner('ROUND 1', 'Fill the kill meter', this.map.accent);
    else this.ui.banner('ENDLESS', 'Survive. It only gets worse.', '#ff6a4d');
  }

  // ------------------------------------------------------------------ frame loop
  frame(dtMs: number): void {
    if (this.destroyed) return;
    this.input.poll();
    const dt = Math.min(0.1, dtMs / 1000);
    if (this.modal === 'none') {
      if (this.input.consume('pause')) {
        this.setModal('pause');
      } else {
        this.acc += dt;
        let steps = 0;
        while (this.acc >= STEP && steps < 5 && this.modal === 'none') {
          this.acc -= STEP;
          steps++;
          if (this.hitstop > 0) {
            this.hitstop -= STEP;
            continue;
          }
          this.tick(STEP);
        }
        if (steps >= 5) this.acc = 0;
        if (this.hitstop <= 0) this.fx.update(dt);
      }
    } else if (this.modal === 'ended') {
      this.fx.update(dt);
    } else {
      this.acc = 0;
    }
    this.render(dt);
  }

  setModal(m: Modal): void {
    if (this.modal !== 'none' && m === 'pause') return;
    this.modal = m;
    if (m === 'pause') this.ui.pause();
  }

  resume(): void {
    if (this.modal === 'ended') return;
    this.modal = 'none';
    this.input.clearEdges();
    this.maybeOpenLevelUp();
  }

  // ------------------------------------------------------------------ shrinking light (Black Sun)
  /** radius of the circle of light around you (0 = full light) */
  lightR = 0;
  /** a boss can force the dark closer (0 = no override) */
  eclipseR = 0;
  private lightCycle = 0;

  private updateLight(dt: number): void {
    const dk = this.map.darkness;
    if (!dk) {
      this.lightR = 0;
      return;
    }
    let want: number;
    if (this.flow) {
      // the dark closes in as the kill meter fills, and the breather lets the light back
      const f = this.flow;
      want = f.phase === 'round' ? dk.from + (dk.to - dk.from) * f.progress : f.phase === 'breather' || f.phase === 'victory' ? dk.from * 1.25 : dk.to;
    } else {
      // Endless: the sun dims for 80s, then flares
      this.lightCycle += dt;
      if (this.lightCycle > 90) {
        this.lightCycle = 0;
        this.ui.toast('The black sun flares — light returns', '#ffb36b');
        this.flash(0xffe0b0, 0.2);
      }
      want = dk.from + (dk.to - dk.from) * Math.min(1, this.lightCycle / 80);
    }
    if (this.eclipseR > 0) want = Math.min(want, this.eclipseR);
    if (this.victoryT >= 0) want = 2000;
    if (!this.lightR) this.lightR = want;
    this.lightR += (want - this.lightR) * Math.min(1, dt * 1.5);
  }

  // ------------------------------------------------------------------ simulation tick
  private tick(dt: number): void {
    this.time += dt;
    this.updatePlayer(dt);
    if (this.playerDead) {
      this.deathT += dt;
      updateEnemies(this, dt);
      if (this.deathT > 1.6) this.finish(this.overtimeAt >= 0);
      return;
    }
    this.updateMode(dt);
    this.passive.update(dt);
    spawnDirector(this, dt);
    // rebuild spatial hash
    this.hash.clear();
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (!e.dead) this.hash.insert(i, e.x, e.y, e.r);
    }
    updateEnemies(this, dt);
    updateBosses(this, dt);
    this.weapons.update(dt);
    this.updateBullets(dt);
    this.updateZones(dt);
    this.hazards.update(dt);
    this.updateLight(dt);
    this.objects.update(dt);
    this.pickups.update(dt);
    this.contactDamage();
    this.updateTelegraphs(dt);
    this.updateTimers(dt);
    updateChains(this, dt);
    cleanupEnemies(this);
    this.updateStreak(dt);
    // dps samples every 5s
    this.dpsT += dt;
    if (this.dpsT >= 5) {
      this.stats_.dpsSamples.push(Math.round(this.dpsWindow / this.dpsT));
      this.dpsT = 0;
      this.dpsWindow = 0;
    }
    if (this.victoryT >= 0) {
      this.victoryT += dt;
      if (this.victoryT > 30) this.finish(true);
    }
    this.maybeOpenLevelUp();
  }

  private updateMode(dt: number): void {
    if (this.flow) {
      this.handleFlow(this.flow.update(dt));
      return;
    }
    // endless (or overtime)
    const t = this.endlessT;
    const prev = t - dt;
    const p = endlessParams(t);
    const pp = endlessParams(prev);
    if (p.threat !== pp.threat) this.ui.edgePulse('#ff4d4d', 0.35);
    if (this.overtimeAt >= 0) this.updateOvertime(dt);
    else for (const m of milestonesBetween(prev, t)) this.milestone(m);
    if (this.darknessT > 0) {
      this.darknessT -= dt;
      if (this.darknessT <= 0) this.ui.toast('The light returns.');
    }
    if (this.doubleSpeedT > 0) this.doubleSpeedT -= dt;
    this.nearbyChestT -= dt;
    if (this.nearbyChestT <= 0) {
      this.nearbyChestT = 75;
      this.objects.spawnNearbyChests(1);
    }
    if (!this.recordAnnounced && this.bestRecord && this.time > this.bestRecord.time) {
      this.recordAnnounced = true;
      this.newRecord = true;
      this.ui.banner('NEW RECORD!', `Beat ${Math.floor(this.bestRecord.time)}s`, '#ffc94d');
      audio.play('record');
      this.fx.ring(this.px, this.py, 10, 160, 0xffc94d, 0.8);
    }
  }

  private milestone(m: Milestone): void {
    this.ui.edgePulse('#c46dff', 0.8);
    this.objects.spawnDrone(m.index, 40);
    if (m.kind === 'eliteWave') {
      this.ui.banner('ELITE WAVE', `Milestone ${m.index}`, '#ffe24d');
      spawnEliteWave(this, 4 + m.index, m.power);
      if (this.mods.doubleBosses) this.spawnPastBoss(m.power);
      this.objects.spawnChest(this.px + 80, this.py, { free: true, minRarity: 1 });
    } else if (m.kind === 'cursedEvent') {
      if (m.cursed === 'darkness') {
        this.darknessT = 30;
        this.ui.banner('CURSE: DARKNESS', 'The light fails for 30 seconds', '#c46dff');
      } else {
        this.doubleSpeedT = 30;
        this.ui.banner('CURSE: FRENZIED SWARM', 'Enemies move twice as fast for 30 seconds', '#c46dff');
      }
      audio.play('curse');
      this.objects.spawnChest(this.px - 80, this.py, { free: true, minRarity: 1 });
    } else {
      // a past main boss returns, stronger: any boss from a chapter you have reached
      this.spawnPastBoss(m.power);
    }
  }

  /** a past main boss returns, stronger: any boss from a chapter you have reached */
  private spawnPastBoss(power: number): void {
    const reached = MAP_ORDER.map((id) => MAPS[id]).filter((mp) => mp.available && mp.chapter <= Math.max(this.map.chapter, save.data.progress.chaptersCleared));
    spawnMainBoss(this, this.rng.pick(reached).boss, power, false);
  }

  /** seconds between Overtime's great bosses */
  private get overtimeBossEvery(): number {
    return this.mods.doubleBosses ? OVERTIME_BOSS_EVERY / 2 : OVERTIME_BOSS_EVERY;
  }

  // ------------------------------------------------------------------ overtime
  /** keep playing after the chapter boss: Endless scaling from the final round's difficulty, a big boss every so often */
  startOvertime(): void {
    const last = this.map.rounds[this.map.rounds.length - 1];
    // find the Endless clock whose enemy HP matches the final round
    let t = 0;
    while (t < 3600 && endlessParams(t).hpMult < last.hpMult) t += 5;
    // a higher starting Threat picked for Overtime starts it further on
    this.overtimeOffset = Math.max(t, threatStartTime(this.challenge.threat));
    // the chapter's tier keeps scaling enemies; the Overtime curses switch on now
    this.mods = runMods(this.tier, this.challenge);
    if (this.mods.noRerolls) this.rerolls = 0;
    this.overtimeAt = this.time;
    this.overtimeBossIn = this.overtimeBossEvery * 0.6;
    this.overtimeEliteDone = false;
    this.flow = null;
    this.victoryT = -1;
    this.nearbyChestT = 20;
    // the clear counts now, whatever happens next
    const sd = save.data;
    sd.progress.chaptersCleared = Math.max(sd.progress.chaptersCleared, this.map.chapter);
    sd.progress.tiers[this.map.id] = recordTierClear(sd.progress.tiers[this.map.id], this.tier);
    if (!sd.skins.unlocked.includes('sprout')) sd.skins.unlocked.push('sprout');
    save.write();
    audio.playMusic(this.map.music);
    audio.setIntensity(0.7);
    this.ui.banner('OVERTIME', 'The swarm returns — a great boss every few minutes', '#ff4d9a');
    this.ui.edgePulse('#ff4d9a', 1);
    this.objects.spawnDrone(5, 30);
    this.afterModal();
  }

  private updateOvertime(dt: number): void {
    if (this.bossActive && !this.bossActive.dead && this.bossActive.kind === 'boss') return; // one at a time
    this.overtimeBossIn -= dt;
    if (!this.overtimeEliteDone && this.overtimeBossIn < this.overtimeBossEvery / 2) {
      this.overtimeEliteDone = true;
      const power = 1 + 0.5 * this.overtimeBosses;
      this.ui.banner('ELITE WAVE', 'Overtime', '#ffe24d');
      spawnEliteWave(this, 5 + this.overtimeBosses * 2, power);
    }
    if (this.overtimeBossIn > 0) return;
    this.overtimeBosses++;
    this.overtimeBossIn = this.overtimeBossEvery;
    this.overtimeEliteDone = false;
    // this chapter's boss first, then any you've beaten, each one stronger
    const pool = MAP_ORDER.map((id) => MAPS[id]).filter((mp) => mp.available && mp.chapter <= Math.max(this.map.chapter, save.data.progress.chaptersCleared));
    const id = this.overtimeBosses === 1 ? this.map.boss : this.rng.pick(pool).boss;
    spawnMainBoss(this, id, 1.6 + 0.6 * this.overtimeBosses, false);
    this.objects.spawnDrone(5 + this.overtimeBosses, 40);
  }

  handleFlow(events: FlowEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'spawnMiniboss':
          spawnMiniboss(this, this.map.minibosses[ev.index], ev.index);
          break;
        case 'breatherStart':
          this.ui.banner('BREATHER', `${ev.seconds}s · the Salvage Drone is open`, '#7dff8a');
          this.pickups.attractAll();
          audio.setIntensity(0.1);
          this.objects.spawnDrone(this.flow ? this.flow.round - 1 : 0);
          break;
        case 'roundStart':
          this.objects.departDrones();
          this.objects.spawnNearbyChests(2);
          this.ui.banner(`ROUND ${ev.round}`, ev.round === 5 ? 'Final round — something huge is waking' : 'Denser. Tougher.', this.map.accent);
          this.ui.edgePulse(this.map.accent, 0.6);
          audio.play('miniIntro', { vol: 0.5 });
          break;
        case 'spawnBoss':
          spawnMainBoss(this, this.map.boss, 1, true);
          break;
        case 'victory':
          break;
      }
    }
  }

  /** a kill happened: kill meter, streak, frenzy */
  /** where things died recently (the High Priest raises them) */
  recentDeaths: { x: number; y: number }[] = [];

  onKill(e: Enemy): void {
    this.stats_.kills++;
    if (e.kind === 'normal') {
      this.recentDeaths.push({ x: e.x, y: e.y });
      if (this.recentDeaths.length > 40) this.recentDeaths.shift();
    }
    const name = e.def?.name ?? (e.boss ? e.boss.name : 'Unknown');
    this.stats_.killsByType[name] = (this.stats_.killsByType[name] ?? 0) + 1;
    if (this.flow && e.countsForMeter) this.handleFlow(this.flow.onKill());
    this.passive.onKill(e);
    this.streak++;
    this.streakT = 2.5;
    if (this.streak > this.stats_.maxStreak) this.stats_.maxStreak = this.streak;
    this.killTimes.push(this.time);
    if (this.killTimes.length > 64) this.killTimes.splice(0, this.killTimes.length - 64);
  }

  private updateStreak(dt: number): void {
    if (this.streakT > 0) {
      this.streakT -= dt;
      if (this.streakT <= 0) this.streak = 0;
    }
    // frenzy: 18+ kills in the last 2 seconds
    let n = 0;
    for (let i = this.killTimes.length - 1; i >= 0 && this.time - this.killTimes[i] < 2; i--) n++;
    if (n >= 18) {
      if (this.frenzy <= 0) {
        audio.play('frenzy');
        this.ui.edgePulse('#ff8a3d', 0.8);
        this.fx.ring(this.px, this.py, 10, 90, 0xff8a3d, 0.4);
      }
      this.frenzy = 4;
    } else if (this.frenzy > 0) this.frenzy -= dt;
    if (this.frenzy > 0 && !this.reduced && Math.random() < 0.5) this.fx.embers(this.px, this.py + 6, 0xff8a3d, 1, 30, 0.5);
    const busy = Math.min(1, this.enemies.length / 260);
    const intensity = this.frenzy > 0 ? 1 : this.bossActive ? 0.9 : this.flow?.phase === 'breather' ? 0.15 : 0.3 + busy * 0.6;
    if (Math.abs(intensity - this.lastTrackIntensity) > 0.05) {
      this.lastTrackIntensity = intensity;
      audio.setIntensity(intensity);
    }
  }

  // ------------------------------------------------------------------ player
  /** set each tick by hazards (stained-glass light slows you) */
  hazardSlow = 1;

  get speedMult(): number {
    return (this.frenzy > 0 ? 1.1 : 1) * this.hazardSlow;
  }

  get enemyTimeScale(): number {
    return (this.timeSlow > 0 ? 0.3 : 1) * (this.doubleSpeedT > 0 ? 2 : 1);
  }

  private updatePlayer(dt: number): void {
    if (this.playerDead) return;
    const ch = CHARACTERS[this.opts.character];
    const mv = this.input.move;
    this.moving = Math.hypot(mv.x, mv.y) > 0.1;
    const sp = ch.baseSpeed * this.stats.moveSpeed * this.speedMult;
    if (this.input.consume('spell')) this.castSpell();
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.pvx = this.dashVX;
      this.pvy = this.dashVY;
      if (!this.reduced || Math.random() < 0.4) this.fx.spawn('pxNormal', this.playerSprite.texture, this.px, this.py, { life: 0.25, alpha: 0.5, tint: ch.glow, s0: this.faceX, scaleY: 1 });
      this.weapons.dashHits();
    } else {
      this.pvx = damp(this.pvx, mv.x * sp, 18, dt);
      this.pvy = damp(this.pvy, mv.y * sp, 18, dt);
    }
    if (this.moving) {
      this.faceAng = Math.atan2(mv.y, mv.x);
      if (Math.abs(mv.x) > 0.15) this.faceX = mv.x > 0 ? 1 : -1;
    }
    this.px = clamp(this.px + this.pvx * dt, 16, this.map.width - 16);
    this.py = clamp(this.py + this.pvy * dt, 16, this.map.height - 16);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.spellCd > 0) this.spellCd -= dt;
    if (this.timeSlow > 0) this.timeSlow -= dt;
    // regen + heal over time
    let heal = this.stats.regen * dt;
    if (this.healOverTime > 0) {
      const h = Math.min(this.healOverTime, this.stats.maxHp * 0.18 * dt);
      heal += h;
      this.healOverTime -= h;
    }
    this.hp = Math.min(this.stats.maxHp, this.hp + heal);
    this.lifestealBudget = Math.min(this.stats.maxHp * 0.03, this.lifestealBudget + this.stats.maxHp * 0.03 * dt);
    this.animT += dt;
  }

  castSpell(): void {
    if (this.spellCd > 0 || this.playerDead) return;
    const def = SPELLS[this.build.spell];
    this.spellCd = (def.cooldown * spellCooldownMult(this.opts.character, def.id)) / Math.min(2, this.stats.attackSpeed * 0.5 + 0.5);
    const s = this.stats;
    switch (def.kind) {
      case 'dash': {
        let dx = this.input.move.x, dy = this.input.move.y;
        if (Math.hypot(dx, dy) < 0.1) {
          dx = Math.cos(this.faceAng);
          dy = Math.sin(this.faceAng);
        }
        const m = Math.hypot(dx, dy);
        this.dashT = 0.18;
        this.dashVX = (dx / m) * 760;
        this.dashVY = (dy / m) * 760;
        this.invuln = Math.max(this.invuln, 0.45);
        this.weapons.dashHitSet.clear();
        audio.play('dash');
        this.fx.ring(this.px, this.py, 6, 40, def.color, 0.25);
        break;
      }
      case 'nova': {
        const R = 150 * s.area;
        this.fx.ring(this.px, this.py, 10, R, def.color, 0.45, 0.95, true);
        this.fx.glow(this.px, this.py, def.color, R * 1.2, 0.3, 0.6, true);
        this.flash(def.color, 0.18);
        audio.play('nova');
        this.areaDamage(this.px, this.py, R, 60, 'nova_burst', 300);
        break;
      }
      case 'timeSlow':
        this.timeSlow = 4 * s.duration;
        audio.play('slow');
        this.ui.edgePulse('#9b7bff', 1);
        this.fx.ring(this.px, this.py, 400, 10, def.color, 0.6);
        break;
      case 'heal':
        this.healOverTime += s.maxHp * 0.35;
        audio.play('heal');
        this.fx.ring(this.px, this.py, 10, 60, def.color, 0.5);
        this.fx.embers(this.px, this.py, def.color, 16, 60, 1);
        break;
      case 'magnet':
        this.pickups.attractAll();
        audio.play('magnet');
        this.fx.ring(this.px, this.py, 600, 10, def.color, 0.6);
        break;
      case 'summon': {
        const n = 6 + (this.opts.character === 'voidcaller' ? 2 : 0);
        for (let k = 0; k < n; k++) this.weapons.arsenal.summon('void_pact', def.color, false, 14, 8 * s.duration, 1.1);
        audio.play('shrineDone');
        this.fx.ring(this.px, this.py, 10, 80, def.color, 0.5, 1, true);
        break;
      }
    }
  }

  /** damage all enemies in a circle, with outward knockback */
  areaDamage(x: number, y: number, R: number, dmg: number, src: string, knock: number, o: { raw?: boolean; bossCap?: number } = {}): number {
    const ids: number[] = [];
    this.hash.query(x, y, R + 40, ids);
    let kills = 0;
    for (const i of ids) {
      const e = this.enemies[i];
      if (!e || e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > R + e.r) continue;
      // screen-clearing effects (bombs) only chip bosses
      const amount = o.bossCap !== undefined && e.boss ? Math.min(dmg, e.maxHp * o.bossCap) : dmg;
      damageEnemy(this, e, amount, src, { kx: (e.x - x) / (d || 1), ky: (e.y - y) / (d || 1), knock, raw: o.raw, noCrit: o.raw });
      if (e.dead) kills++;
    }
    return kills;
  }

  heal(amount: number, show = true): void {
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
    if (show && this.hp - before >= 1) this.fx.number(this.px, this.py - 26, this.hp - before, 0x7dff8a, false);
  }

  lifesteal(dealt: number): void {
    if (this.stats.lifesteal <= 0 || this.hp >= this.stats.maxHp) return;
    const h = Math.min(this.lifestealBudget, dealt * this.stats.lifesteal);
    this.lifestealBudget -= h;
    this.hp = Math.min(this.stats.maxHp, this.hp + h);
  }

  /** apply damage to the player. returns true if it landed */
  hurt(raw: number, source: Enemy | null): boolean {
    if (this.invuln > 0 || this.playerDead || this.dashT > 0 || this.victoryT >= 0) return false;
    if (this.rng.next() < this.stats.dodge) {
      this.invuln = 0.25;
      this.fx.number(this.px, this.py - 26, 0, 0x9aa3b8, false);
      this.ui.toast('Dodged!', '#b6c3ff');
      return false;
    }
    const dmg = Math.max(raw * 0.25, raw - this.stats.armor);
    this.hp -= dmg;
    this.invuln = 0.7;
    this.hurtFlash = 0.12;
    audio.play('hurt');
    this.ui.edgePulse('#ff2a2a', Math.min(1, 0.35 + dmg / this.stats.maxHp * 3));
    this.fx.sparks(this.px, this.py, 0xff4d4d, 6, 120);
    if (source && this.stats.thorns > 0 && !source.dead) damageEnemy(this, source, this.stats.thorns, 'thorns', { knock: 120, kx: Math.sign(source.x - this.px), ky: Math.sign(source.y - this.py), noCrit: true });
    if (this.hp <= 0) this.onLethal();
    return true;
  }

  private onLethal(): void {
    if (this.revivesUsed < Math.floor(this.stats.revives)) {
      this.revivesUsed++;
      this.hp = this.stats.maxHp * 0.5;
      this.invuln = 2;
      this.hitstop = this.reduced ? 0 : 0.2;
      this.flash(0xff7a3d, 0.5);
      this.fx.ring(this.px, this.py, 10, 220, 0xff7a3d, 0.6, 1, true);
      this.fx.embers(this.px, this.py, 0xffb36b, 40, 160, 1.2);
      this.areaDamage(this.px, this.py, 220, 200, 'phoenix', 400);
      this.ui.banner('REVIVED', 'The Phoenix Ember flares', '#ff7a3d');
      audio.play('nova');
      return;
    }
    this.hp = 0;
    this.playerDead = true;
    this.playerSprite.visible = false;
    this.sigil.visible = false;
    this.playerGlow.visible = false;
    this.fx.dissolve(this.px, this.py, this.heroTex().shape, CHARACTERS[this.opts.character].glow, this.faceX, 1, 220, 1.6);
    this.fx.embers(this.px, this.py, 0xff8a3d, 30, 80, 1.5);
    audio.play('death');
    this.ui.edgePulse('#ff2a2a', 1);
  }

  private contactDamage(): void {
    if (this.invuln > 0 || this.dashT > 0) return;
    const ids: number[] = [];
    this.hash.query(this.px, this.py, 60, ids);
    let worst: Enemy | null = null;
    for (const i of ids) {
      const e = this.enemies[i];
      if (!e || e.dead) continue;
      const rr = e.r + 9;
      if ((e.x - this.px) ** 2 + (e.y - this.py) ** 2 > rr * rr) continue;
      if (!worst || e.dmg > worst.dmg) worst = e;
    }
    if (worst) this.hurt(worst.dmg, worst);
  }

  // ------------------------------------------------------------------ bullets, zones, telegraphs
  fireBullet(x: number, y: number, ang: number, speed: number, dmg: number, big = false, tint?: number): void {
    if (this.bullets.length > 900) return;
    const p = this.projLayer.acquire(tint !== undefined ? (big ? this.a.px.orb_big_w : this.a.px.orb_w) : big ? this.a.px.orb_big : this.a.px.orb, x, y);
    if (tint !== undefined) p.tint = tint;
    this.bullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: big ? 6 : 4, dmg, life: 7, p, glow: null });
  }

  private updateBullets(dt: number): void {
    const ts = this.timeSlow > 0 ? 0.3 : 1;
    const arr = this.bullets;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.life -= dt;
      b.x += b.vx * dt * ts;
      b.y += b.vy * dt * ts;
      b.p.x = b.x;
      b.p.y = b.y;
      const rr = b.r + 7;
      let gone = b.life <= 0 || b.x < -50 || b.y < -50 || b.x > this.map.width + 50 || b.y > this.map.height + 50;
      if (!gone && (b.x - this.px) ** 2 + (b.y - this.py) ** 2 < rr * rr) {
        if (this.hurt(b.dmg, null)) gone = true;
      }
      if (gone) {
        this.projLayer.release(b.p);
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }
  }

  private updateZones(dt: number): void {
    const arr = this.zones;
    for (let i = arr.length - 1; i >= 0; i--) {
      const z = arr[i];
      z.life -= dt;
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.4;
        const ids: number[] = [];
        this.hash.query(z.x, z.y, z.r + 20, ids);
        for (const k of ids) {
          const e = this.enemies[k];
          if (!e || e.dead) continue;
          if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + e.r) ** 2) damageEnemy(this, e, z.dmg, z.weapon, { noNumberIfSmall: true });
        }
        // Plague Font pools mend you while you stand in them
        if (z.heal && (this.px - z.x) ** 2 + (this.py - z.y) ** 2 < z.r * z.r) this.heal(z.heal, false);
      }
      if (z.life <= 0) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }
  }

  private timers: { t: number; fn: () => void }[] = [];

  /** run fn after `delay` seconds of simulation time (pauses with the game) */
  after(delay: number, fn: () => void): void {
    this.timers.push({ t: delay, fn });
  }

  private updateTimers(dt: number): void {
    const arr = this.timers;
    for (let i = arr.length - 1; i >= 0; i--) {
      arr[i].t -= dt;
      if (arr[i].t <= 0) {
        const fn = arr[i].fn;
        arr.splice(i, 1);
        fn();
      }
    }
  }

  telegraph(t: Omit<Telegraph, 't'>): Telegraph {
    const tg: Telegraph = { ...t, t: 0 };
    this.telegraphs.push(tg);
    return tg;
  }

  private updateTelegraphs(dt: number): void {
    const arr = this.telegraphs;
    for (let i = arr.length - 1; i >= 0; i--) {
      const t = arr[i];
      t.t += dt;
      if (t.t >= t.dur) {
        arr.splice(i, 1);
        t.onDone?.();
      }
    }
  }

  // ------------------------------------------------------------------ xp, coins, level ups
  addXp(v: number): void {
    this.xp += v * this.stats.xpGain;
    this.xpCollected += v * this.stats.xpGain;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpToNext(this.level);
      this.pendingLevels++;
      this.refreshStats();
    }
  }

  addCoins(v: number): void {
    const c = Math.max(1, Math.round(v * this.stats.coinGain));
    this.coins += c;
    this.stats_.coinsEarned += c;
  }

  private maybeOpenLevelUp(): void {
    if (this.modal !== 'none' || this.playerDead) return;
    if (this.pendingChest) {
      const c = this.pendingChest;
      this.pendingChest = null;
      this.modal = 'chest';
      this.ui.chest(c);
      return;
    }
    if (this.pendingShrine) {
      const s = this.pendingShrine;
      this.pendingShrine = null;
      this.modal = 'shrine';
      this.ui.shrine(s);
      return;
    }
    if (this.pendingLevels <= 0) return;
    let offers: Offer[] | null = null;
    while (this.pendingLevels > 0) {
      this.pendingLevels--;
      const rolled = rollLevelUpOffers(this.lootRng, this.build, this.stats.luck, 3, this.weaponPool);
      if (!isFillerOnly(rolled.map((o) => o.kind))) {
        offers = rolled;
        break;
      }
      // build is maxed: no choice to make, so don't pause the game
      const pick = rolled.find((o) => o.kind === (this.hp < this.stats.maxHp * 0.7 ? 'heal' : 'coins')) ?? rolled[0];
      const res = this.applyOffer(pick);
      audio.play('levelup', { vol: 0.5 });
      this.fx.ring(this.px, this.py, 8, 60, 0xffe6a0, 0.4);
      this.ui.toast(`Level ${this.level - this.pendingLevels} · ${res.coins ? `+${res.coins} coins` : 'healed'}`, '#ffe6a0');
    }
    if (!offers) return;
    this.currentOffers = offers;
    this.freeRerolls = freeRerollsPerLevel(this.opts.character);
    this.modal = 'levelup';
    audio.play('levelup');
    this.flash(0xffe6a0, 0.25);
    this.fx.ring(this.px, this.py, 8, 80, 0xffe6a0, 0.5);
    this.ui.levelUp(this.currentOffers);
  }

  /** apply an offer from level-up / chest / shrine */
  applyOffer(o: Offer): OfferResult {
    const res = applyOffer(this.build, o);
    if (res.coins) this.addCoins(res.coins);
    if (res.heal) this.heal(this.stats.maxHp * res.heal);
    if (res.evolvedInto) {
      if (!save.data.codex.evolutions.includes(res.evolvedInto)) {
        save.data.codex.evolutions.push(res.evolvedInto);
        save.write();
      }
      audio.play('evolve');
      this.flash(0xffffff, 0.4);
      this.fx.ring(this.px, this.py, 10, 200, 0xffe6a0, 0.8, 1, true);
    }
    this.refreshStats();
    this.weapons.sync();
    return res;
  }

  chooseLevelUp(i: number): void {
    const o = this.currentOffers[i];
    if (!o) return;
    this.currentOffers = [];
    this.applyOffer(o);
    this.afterModal();
  }

  /** free rerolls left on the current level-up (Fortune's Loaded Dice) */
  freeRerolls = 0;

  rerollLevelUp(): Offer[] | null {
    if (this.mods.noRerolls) return null;
    if (this.freeRerolls > 0) this.freeRerolls--;
    else if (this.rerolls > 0) this.rerolls--;
    else return null;
    this.currentOffers = rollLevelUpOffers(this.lootRng, this.build, this.stats.luck, 3, this.weaponPool);
    return this.currentOffers;
  }

  skipLevelUp(): void {
    if (this.skips <= 0) return;
    this.skips--;
    this.addCoins(5);
    this.afterModal();
  }

  banishOffer(i: number): Offer[] | null {
    if (this.banishes <= 0) return null;
    const o = this.currentOffers[i];
    if (!o || o.kind === 'evolution' || o.kind === 'heal' || o.kind === 'coins') return null;
    this.banishes--;
    this.build.banished.push(o.id);
    this.currentOffers = rollLevelUpOffers(this.lootRng, this.build, this.stats.luck, 3, this.weaponPool);
    return this.currentOffers;
  }

  afterModal(): void {
    this.modal = 'none';
    this.input.clearEdges();
    this.maybeOpenLevelUp();
  }

  // ------------------------------------------------------------------ chests & shrines
  /** chest and shop price multiplier from the Armory */
  priceMult = 1;
  /** all XP collected this run (becomes mastery XP) */
  xpCollected = 0;
  private shopItems: ShopItem[] | null = null;
  private nearbyChestT = 75;

  chestCost(): number {
    return chestPrice(this.paidChests, this.priceMult * chestCostMult(this.opts.character));
  }

  // ------------------------------------------------------------------ salvage shop
  openShop(items: ShopItem[]): void {
    if (this.modal !== 'none' || this.playerDead) return;
    this.shopItems = items;
    this.modal = 'shop';
    audio.play('shrineDone', { vol: 0.5 });
    this.ui.shop(items);
  }

  /** returns true if bought */
  buyShop(i: number): boolean {
    const it = this.shopItems?.[i];
    if (!it || it.sold || this.coins < it.price) return false;
    if (it.kind === 'upgrade' && it.offer && !this.offerStillValid(it.offer)) {
      it.sold = true;
      this.ui.toast('Your build changed — that upgrade no longer fits', '#ffc94d');
      return false;
    }
    it.sold = true;
    this.coins -= it.price;
    this.stats_.coinsSpent += it.price;
    audio.play('coin');
    switch (it.kind) {
      case 'upgrade':
        this.applyOffer(it.offer!);
        audio.play('levelup', { vol: 0.6 });
        break;
      case 'heal':
        this.heal(this.stats.maxHp);
        audio.play('heal');
        break;
      case 'rerolls':
        this.rerolls += 2;
        this.banishes += 1;
        break;
      case 'cache':
        this.openChest(true, 3);
        break;
    }
    return true;
  }

  offerStillValid(o: Offer): boolean {
    if (o.kind === 'evolution') return eligibleEvolutions(this.build).some((e) => e.weapon === o.id);
    return upgradePool(this.build, this.weaponPool).some((p) => p.kind === o.kind && p.id === o.id);
  }

  closeShop(): void {
    this.shopItems = null;
    this.afterModal();
  }

  openChest(free: boolean, minRarity = 0, legendary = false): void {
    const odds = this.objects.oddsFor(minRarity);
    const rarity = legendary ? (4 as RarityIndex) : rollChestRarity(this.lootRng, this.chestState, this.stats.luck, minRarity);
    if (legendary) {
      this.chestState.opened++;
      this.chestState.byRarity[4]++;
    }
    let paid = 0;
    if (!free) {
      paid = this.chestCost();
      this.coins -= paid;
      this.stats_.coinsSpent += paid;
      this.paidChests++;
    }
    this.stats_.chestsByRarity[rarity]++;
    save.data.stats.chestsOpened++;
    const offer = rollChestItem(this.lootRng, this.build, rarity, this.weaponPool);
    const res: ChestOpenResult = { rarity, offer, odds, free, legendary, paid };
    audio.play('chestOpen');
    if (this.modal === 'none') {
      this.modal = 'chest';
      this.ui.chest(res);
    } else this.pendingChest = res;
  }

  takeChest(res: ChestOpenResult): void {
    this.applyOffer(res.offer);
    if (res.legendary && this.victoryT >= 0) this.victoryT = 27; // victory follows shortly
    this.afterModal();
  }

  /** permanent rewards banked from the Victory Cache, added when the run ends */
  victoryBonus = { shards: 0, masteryXp: 0, coins: 0 };

  /** the end-of-story cache: the run is over, so it pays out in things that last */
  openVictoryCache(): void {
    const ch = this.map.chapter;
    const first = save.data.progress.chaptersCleared < ch;
    const k = first ? 2 : 1;
    // the shards are a roll: usually the base, sometimes a lot more
    const base = 8 * ch * k;
    const roll = rollCacheShards(this.lootRng.next(), base, this.stats.luck);
    const r = { coins: (100 + 60 * ch) * k, shards: roll.shards, base, tier: roll.tier, masteryXp: 250 * ch * k, first };
    this.victoryBonus = { shards: r.shards, masteryXp: r.masteryXp, coins: r.coins };
    this.addCoins(r.coins);
    audio.play('chestOpen');
    audio.reveal('legendary');
    this.modal = 'chest';
    this.ui.victoryCache(r);
  }

  claimVictoryCache(): void {
    // the chapter is won: end here, or keep going in Overtime
    if (this.victoryT >= 0 && this.flow) {
      this.modal = 'chest';
      this.ui.victoryChoice();
      return;
    }
    if (this.victoryT >= 0) this.victoryT = 27;
    this.afterModal();
  }

  endVictory(): void {
    this.victoryT = 27; // victory follows shortly
    this.afterModal();
  }

  /** coins you get back for leaving a chest's item behind */
  chestLeaveRefund(res: ChestOpenResult): number {
    return res.paid > 0 ? Math.ceil(res.paid / 2) : 5;
  }

  /** leave the item in the chest: half the price back (or a few coins for a free one) */
  leaveChest(res: ChestOpenResult): void {
    this.addCoins(this.chestLeaveRefund(res));
    audio.play('coin');
    if (res.legendary && this.victoryT >= 0) this.victoryT = 27;
    this.afterModal();
  }

  shrineCharged(cursed: boolean): void {
    if (cursed) {
      this.curseLevel++;
      audio.play('curse');
      this.ui.banner('CURSE ACCEPTED', 'Enemies grow stronger — the rewards do too', '#ff3d7a');
      this.ui.edgePulse('#ff3d7a', 1);
      this.addCoins(30);
      this.objects.spawnChest(this.px + 30, this.py - 30, { free: true, minRarity: 2 });
      spawnEliteWave(this, 3, 1 + this.curseLevel * 0.3);
      return;
    }
    audio.play('shrineDone');
    const choices: Offer[] = [];
    const ids = this.lootRng.shuffle(['ember_shard', 'seer_lens', 'gravecutter', 'mending_rune', 'leech_glyph', 'archive_chip', 'tithe_coin', 'heartcore', 'phase_cloak', 'stasis_coil', 'overdrive_chip', 'thorn_sigil']);
    for (let i = 0; i < 3; i++) choices.push({ kind: 'relic', id: ids[i], rarity: rollRarity(this.lootRng, [0, 60, 28, 10, 2], this.stats.luck, 1) });
    if (this.modal === 'none') {
      this.modal = 'shrine';
      this.ui.shrine(choices);
    } else this.pendingShrine = choices;
  }

  chooseShrine(o: Offer): void {
    this.applyOffer(o);
    this.afterModal();
  }

  // ------------------------------------------------------------------ boss hooks
  onBossKilled(e: Enemy): void {
    const b = e.boss!;
    this.stats_.bossTimes.push({ name: b.isMain ? b.name : b.name, time: this.time - b.spawnedAt });
    save.data.stats.bossesKilled++;
    if (this.bossActive === e) this.bossActive = null;
    if (b.isMain && this.flow) {
      this.handleFlow(this.flow.onBossDefeated());
      this.victoryT = 0;
      // wipe the remaining swarm
      clearAllEnemies(this, true);
      this.objects.spawnChest(e.x, e.y + 30, { free: true, legendary: true, victory: true });
      this.pickups.attractAll();
      this.ui.banner(`${b.name.replace(/^The /, '').toUpperCase()} DESTROYED`, 'Claim your Victory Cache', '#ffb330');
      audio.playMusic('victory');
    } else if (b.isMain) {
      this.objects.spawnChest(e.x, e.y + 30, { free: true, minRarity: 2 });
      audio.playMusic(this.map.music);
      this.ui.banner(`${b.name.replace(/^The /, '').toUpperCase()} FALLS AGAIN`, 'Chest dropped', '#ffb330');
    } else if (this.enemies.some((o) => !o.dead && o !== e && o.boss && o.boss.id === b.id)) {
      // one half of a split mini-boss: the other still stands
      this.bossActive = this.enemies.find((o) => !o.dead && o !== e && o.boss && o.boss.id === b.id) ?? null;
      this.ui.toast('One half shatters — finish the other!', '#7ae0ff');
      this.pickups.drop('food', e.x, e.y, 1);
    } else {
      // mini-boss: free chest + breather (story)
      this.objects.spawnChest(e.x, e.y, { free: true, minRarity: 1 });
      if (this.flow) {
        clearAllEnemies(this, false, e.x, e.y);
        this.handleFlow(this.flow.onMinibossDefeated());
      }
    }
  }

  // ------------------------------------------------------------------ juice
  flash(color: number, alpha: number): void {
    const a = this.reduced ? Math.min(alpha, 0.12) : alpha;
    if (a > this.flashA) {
      this.flashA = a;
      this.flashColor = color;
    }
  }

  setReduced(on: boolean): void {
    this.reduced = on;
    this.fx.setReduced(on);
  }

  /** many kills from one swing / wave / blast: hit-stop, burst and a callout */
  multiKill(n: number, label: string): void {
    if (n < 6) return;
    const big = n >= 15;
    this.hitStop(big ? 0.06 : 0.035);
    this.fx.ring(this.px, this.py, 12, 70 + n * 3, big ? 0xffd27a : 0xeaffff, 0.3, 0.7);
    if (big) this.ui.edgePulse('#ffd27a', Math.min(0.6, 0.2 + n / 60));
    if (n >= 8) this.ui.multi(n, label);
  }

  private lastHitStop = -1;

  /** tiny freeze-frame on big hits; small ones are rate-limited so dense fights don't stutter */
  hitStop(s: number): void {
    if (this.reduced) return;
    if (s < 0.08 && this.time - this.lastHitStop < 0.3) return;
    this.lastHitStop = this.time;
    this.hitstop = Math.max(this.hitstop, s);
  }

  // ------------------------------------------------------------------ end of run
  finish(won: boolean): void {
    if (this.modal === 'ended') return;
    this.modal = 'ended';
    const sd = save.data;
    sd.stats.totalKills += this.stats_.kills;
    sd.stats.runs++;
    sd.stats.playTime += this.time;
    sd.stats.bestStreak = Math.max(sd.stats.bestStreak, this.stats_.maxStreak);
    let newRecord = false;
    if (this.opts.mode === 'endless') {
      sd.stats.longestEndless = Math.max(sd.stats.longestEndless, this.time);
      const rec = { time: this.time, kills: this.stats_.kills, date: Date.now() };
      const bests = (sd.bests[this.recordKey()] ??= {});
      if (beatsRecord(rec, bests[this.opts.character])) {
        newRecord = !!bests[this.opts.character] || this.time > 30;
        bests[this.opts.character] = rec;
      }
    }
    if (won && this.opts.mode === 'story') {
      sd.progress.chaptersCleared = Math.max(sd.progress.chaptersCleared, this.map.chapter);
      sd.progress.tiers[this.map.id] = recordTierClear(sd.progress.tiers[this.map.id], this.tier);
      if (this.map.chapter >= 1 && !sd.skins.unlocked.includes('sprout')) sd.skins.unlocked.push('sprout');
    }
    // permanent progress: mastery XP for this hero, and Star Shards from leftover coins
    const storyWin = won && this.opts.mode === 'story';
    const mastery = getMastery(this.opts.character);
    const levelBefore = mastery.level;
    const masteryXp = runMasteryXp(this.xpCollected, storyWin) + this.victoryBonus.masteryXp;
    addMasteryXp(mastery, masteryXp);
    // only coins earned this run convert (starting coins from upgrades don't), so quitting early can't farm shards
    const coinsLeft = Math.max(0, Math.min(this.coins, this.stats_.coinsEarned));
    // harder tiers, a higher starting Threat and curses all pay more
    const shards = Math.round((shardsForRun({ coinsLeft, kills: this.stats_.kills, won: storyWin }) + this.victoryBonus.shards) * this.mods.shards);
    sd.meta.shards += shards;
    sd.meta.shardsEarned += shards;
    const progress: RunProgress = { masteryXp, levelBefore, levelAfter: mastery.level, shards, coinsLeft, cache: this.victoryBonus.shards ? { ...this.victoryBonus } : undefined };
    sd.history.unshift({ mode: this.opts.mode, map: this.map.id, character: this.opts.character, won, time: this.time, kills: this.stats_.kills, level: this.level, date: Date.now() });
    sd.history = sd.history.slice(0, 20);
    save.write();
    if (won) {
      this.playerSprite.texture = this.heroTex().victory;
      audio.playMusic('victory');
    }
    this.ui.end({ mode: this.opts.mode, map: this.map.id, character: this.opts.character, won, time: this.time, level: this.level, stats: this.stats_, newRecord, seed: this.seed, build: this.build, progress, overtime: this.overtimeAt >= 0 ? this.time - this.overtimeAt : 0, overtimeBosses: this.overtimeBosses, tags: this.difficultyTags() });
  }

  quit(): void {
    this.finish(this.overtimeAt >= 0);
  }

  recordDamage(src: string, dmg: number): void {
    this.stats_.damageByWeapon[src] = (this.stats_.damageByWeapon[src] ?? 0) + dmg;
    this.dpsWindow += dmg;
    if (dmg > this.stats_.biggestHit.value) this.stats_.biggestHit = { value: dmg, weapon: src };
  }

  // ------------------------------------------------------------------ render
  private render(dt: number): void {
    // camera (smooth follow, no shake, no zoom jolts)
    this.camX = damp(this.camX, this.px, 10, dt);
    this.camY = damp(this.camY, this.py, 10, dt);
    const sw = this.app.screen.width, sh = this.app.screen.height;
    this.world.position.set(Math.round(sw / 2 - this.camX * this.zoom), Math.round(sh / 2 - this.camY * this.zoom));

    // player
    const hero = this.heroTex();
    if (!this.playerDead) {
      const s = this.playerSprite;
      if (this.victoryT >= 0 && this.modal === 'ended') s.texture = hero.victory;
      else if (this.hurtFlash > 0) s.texture = hero.flash;
      else if (this.moving) s.texture = hero.run[Math.floor(this.animT * 11) % hero.run.length];
      else s.texture = hero.idle[Math.floor(this.animT * 4) % hero.idle.length];
      s.scale.x = this.faceX;
      s.position.set(this.px, this.py);
      s.alpha = this.invuln > 0 && this.dashT <= 0 && this.hurtFlash <= 0 ? 0.65 + 0.35 * Math.sin(this.animT * 40) : 1;
      this.sigil.position.set(this.px, this.py + 11);
      this.sigil.alpha = 0.55 + 0.25 * Math.sin(this.animT * 3);
      this.playerGlow.position.set(this.px, this.py);
      this.playerGlow.alpha = this.frenzy > 0 ? 0.4 : 0.22;
    }

    // lamps flicker
    for (const l of this.lamps) {
      l.s.alpha = l.flicker ? (Math.sin(this.time * 13 + l.seed) > 0.75 && Math.sin(this.time * 3.1 + l.seed) > 0 ? 0.05 : l.base) : l.base * (0.85 + 0.15 * Math.sin(this.time * 2 + l.seed));
    }

    this.drawTelegraphs();
    this.drawZones();
    this.drawBolts(dt);
    this.hazards.draw();
    this.objects.draw();

    // darkness curse
    if (this.darknessT > 0) {
      this.darkness.visible = true;
      this.darkness.position.set(sw / 2 + (this.px - this.camX) * this.zoom, sh / 2 + (this.py - this.camY) * this.zoom);
      this.darkness.scale.set((150 * this.zoom) / 48);
      this.darkness.alpha = Math.min(1, this.darknessT, 30 - this.darknessT + 0.01);
    } else this.darkness.visible = false;
    if (this.lightR > 0 && this.lightR < 1500 && !this.darkness.visible) {
      this.worldDark.visible = true;
      this.worldDark.position.set(this.px, this.py);
      this.worldDark.scale.set(this.lightR / 48);
      this.worldDark.alpha = (this.reduced ? 0.62 : 0.8) * Math.min(1, (1500 - this.lightR) / 400);
    } else this.worldDark.visible = false;

    // flash overlay
    if (this.flashA > 0) {
      this.flashGfx.tint = this.flashColor;
      this.flashGfx.alpha = this.flashA;
      this.flashA = Math.max(0, this.flashA - dt * 2.5);
    } else this.flashGfx.alpha = 0;
  }

  /** acid pools and burning craters */
  private drawZones(): void {
    const g = this.zoneGfx;
    g.clear();
    const hw = this.viewW / 2 + 60, hh = this.viewH / 2 + 60;
    for (const z of this.zones) {
      if (!(z.pool || z.fire) || Math.abs(z.x - this.camX) > hw || Math.abs(z.y - this.camY) > hh) continue;
      const k = z.max ? Math.min(1, z.life / Math.min(0.5, z.max)) : 1;
      if (z.fire) {
        const f = 0.85 + 0.15 * Math.sin(this.time * 17 + z.x * 0.7);
        g.circle(z.x, z.y, z.r * f).fill({ color: z.color, alpha: 0.13 * k });
        g.circle(z.x, z.y, z.r * 0.5 * f).fill({ color: 0xffc36b, alpha: 0.12 * k });
        if (Math.random() < (this.reduced ? 0.04 : 0.14)) this.fx.spawn('px', this.a.px.ember, z.x + (Math.random() - 0.5) * z.r * 1.2, z.y + (Math.random() - 0.5) * z.r, { vy: -34, life: 0.45, tint: Math.random() < 0.5 ? 0xffb36b : z.color, s0: 1.2, s1: 0.2 });
        continue;
      }
      const wob = 1 + 0.04 * Math.sin(this.time * 6 + z.x);
      // kept faint so enemies standing in pools stay readable
      g.circle(z.x, z.y, z.r * wob).fill({ color: z.color, alpha: 0.09 * k });
      g.circle(z.x, z.y, z.r * 0.55 * wob).fill({ color: z.color, alpha: 0.07 * k });
      g.circle(z.x, z.y, z.r * wob).stroke({ color: z.color, width: 1.5, alpha: 0.55 * k });
      if (!this.reduced && Math.random() < 0.08) this.fx.spawn('px', this.a.px.px, z.x + (Math.random() - 0.5) * z.r * 1.4, z.y + (Math.random() - 0.5) * z.r * 1.4, { vy: -20, life: 0.4, tint: z.color, s0: 1.3, s1: 0.3 });
    }
  }

  private drawTelegraphs(): void {
    const g = this.teleGfx;
    g.clear();
    for (const t of this.telegraphs) {
      const k = t.t / t.dur;
      const pulse = 0.5 + 0.5 * Math.sin(t.t * 18);
      const fillA = 0.1 + 0.22 * k + (k > 0.85 ? 0.25 : 0);
      if (t.kind === 'circle') {
        g.circle(t.x, t.y, t.r).fill({ color: t.color, alpha: fillA });
        g.circle(t.x, t.y, t.r * k).fill({ color: t.color, alpha: 0.18 });
        g.circle(t.x, t.y, t.r).stroke({ color: t.color, width: 2, alpha: 0.5 + 0.5 * pulse });
      } else if (t.kind === 'ring') {
        g.circle(t.x, t.y, t.r * (0.3 + 0.7 * k)).stroke({ color: t.color, width: 3, alpha: 0.4 + 0.5 * pulse });
      } else {
        const c = Math.cos(t.ang), s = Math.sin(t.ang);
        const nx = -s * t.w * 0.5, ny = c * t.w * 0.5;
        const ex = t.x + c * t.len, ey = t.y + s * t.len;
        g.poly([t.x + nx, t.y + ny, ex + nx, ey + ny, ex - nx, ey - ny, t.x - nx, t.y - ny]).fill({ color: t.color, alpha: fillA * 0.9 });
        g.poly([t.x + nx, t.y + ny, ex + nx, ey + ny, ex - nx, ey - ny, t.x - nx, t.y - ny]).stroke({ color: t.color, width: 1.5, alpha: 0.4 + 0.5 * pulse });
      }
    }
  }

  bolt(pts: number[], color: number, life = 0.14, width = 2): void {
    this.bolts.push({ pts, life, max: life, color, width });
  }

  private drawBolts(dt: number): void {
    const g = this.boltGfx;
    g.clear();
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.bolts.splice(i, 1);
        continue;
      }
      const a = b.life / b.max;
      g.moveTo(b.pts[0], b.pts[1]);
      for (let k = 2; k < b.pts.length; k += 2) g.lineTo(b.pts[k], b.pts[k + 1]);
      g.stroke({ color: b.color, width: b.width * 2.5, alpha: 0.35 * a });
      g.moveTo(b.pts[0], b.pts[1]);
      for (let k = 2; k < b.pts.length; k += 2) g.lineTo(b.pts[k], b.pts[k + 1]);
      g.stroke({ color: 0xffffff, width: b.width * 0.8, alpha: a });
    }
  }

  // ------------------------------------------------------------------ misc
  rarityColor(r: number): number {
    return RARITY_INFO[rarityOf(r)].color;
  }

  killEnemy(e: Enemy, src: string): void {
    killEnemy(this, e, src);
  }

  destroy(): void {
    this.destroyed = true;
    this.root.destroy({ children: true });
  }
}

/** seconds between Overtime's great bosses */
const OVERTIME_BOSS_EVERY = 150;

function darkHoleCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0.96)';
  g.fillRect(0, 0, 1024, 1024);
  g.globalCompositeOperation = 'destination-out';
  const grad = g.createRadialGradient(512, 512, 10, 512, 512, 48);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(512, 512, 48, 0, Math.PI * 2);
  g.fill();
  return c;
}
