/**
 * All DOM UI: menus, story cards, in-run modals (level-up, chest reel, shrine,
 * pause), boss name cards, banners and the end-of-run breakdown. Implements
 * GameUI so the simulation can ask for UI without knowing about the DOM.
 */
import type { Application } from 'pixi.js';
import { audio } from '../audio/audio';
import { easeOutCubic, formatTime } from '../core/math';
import { seedToCode } from '../core/rng';
import { DEFAULT_KEYS, isEndlessUnlocked, resetSave, save, testingToolsAllowed, type Action } from '../core/save';
import { CHARACTERS, CHARACTER_IDS } from '../data/characters';
import { COSMETICS, COSMETIC_BY_ID, COSMETIC_KINDS, NUMBER_STYLES, cosmeticsFor, type CosmeticDef, type CosmeticKind } from '../data/cosmetics';
import { ACHIEVEMENTS, achievementProgress, rewardText, sourceOf, type AchievementDef } from '../systems/achievements';
import { BOSSES, ENEMIES, MINIBOSSES } from '../data/enemies';
import { MAPS, MAP_ORDER, type StoryCard } from '../data/maps';
import { PASSIVES, RELICS } from '../data/passives';
import { RARITIES, RARITY_INFO, rarityOf } from '../data/rarity';
import { SPELLS } from '../data/spells';
import { STAT_KEYS, STAT_LABELS, formatStat } from '../data/stats';
import { ALL_WEAPON_IDS, STARTER_WEAPON_IDS, WEAPONS } from '../data/weapons';
import { Game, type ChestOpenResult, type GameOptions, type GameUI, type RunResult, type VictoryCacheResult } from '../game/game';
import { keyLabel, type Input } from '../input/input';
import type { Assets } from '../render/assets';
import { storyScene } from '../render/storyArt';
import { allEvolutionRecipes } from '../systems/build';
import { describeOffer, type Offer } from '../systems/offers';
import { ARMORY, CACHE_TIERS, branchesFor, armoryCost, cacheTierWeights, availablePoints, buyArmory, canRankUp, isNodeUnlocked, masteryXpToNext, rankUp, refundAll, spentPoints, type Branch } from '../systems/mastery';
import type { ShopItem } from '../systems/shop';
import { achContext, achievementsDone, cosmeticUnlocked, equipCosmetic, getMastery, heroUnlockStats, isHeroUnlocked, loadoutFor, menuScene, metaBonusFor, syncAchievements, syncHeroUnlocks, treeFor, weaponPoolFor } from '../core/meta';
import { LOCKED_WEAPON_IDS, WEAPON_UNLOCKS, buyWeapon } from '../systems/weaponUnlocks';
import { unlockProgress } from '../systems/heroes';
import { CURSES, START_THREATS, TIERS, challengeLabel, challengeShardMult, parseChallengeKey, challengeKey, tierUnlocked, type Challenge, type TierId } from '../systems/difficulty';
import { FIELD_TURRET } from '../game/arsenal';
import { css, h } from './dom';
import { Hud } from './hud';
import { Nav } from './nav';

const SOURCE_NAMES: Record<string, string> = {
  thorns: 'Thorns (Bulwark)',
  hazard: 'Map hazards',
  bomb: 'Bombs',
  nova_burst: 'Nova Burst',
  aegis_dash: 'Aegis Dash',
  phoenix: 'Phoenix Ember',
  volatile: 'Chain reactions',
  mortar: 'Enemy mortar fire',
  wave: 'Clearing wave',
  [FIELD_TURRET]: 'Field turrets (Overbuilt)',
  pyre_trail: 'Burning trail (Kindling)',
  coin_burst: 'Coin bursts (Loaded Dice)',
  raised_spirit: 'Raised spirits (Binding)',
};

function sourceName(id: string): string {
  return WEAPONS[id]?.name ?? SOURCE_NAMES[id] ?? id;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const EPILOGUE: StoryCard = {
  title: 'Epilogue',
  art: 'ending',
  lines: [
    'The new sun rises over every world the dark had swallowed.',
    'In the Graveyard the wrecks warm. On the Cathedral Moon, someone rings a bell — just once, on purpose. In the Archive, the snow melts off the shelves, and the books begin to be read again.',
    'The Warden walks on. The Hive is quiet. Endless is waiting, on every world.',
  ],
};

export class UI implements GameUI {
  private app: Application;
  private a: Assets;
  private input: Input;
  private screenEl: HTMLElement;
  private overlayEl: HTMLElement;
  private modalEl: HTMLElement;
  private nav = new Nav();
  game: Game | null = null;
  private hud: Hud | null = null;
  private inputLock = 0;
  private bannerEl: HTMLElement;
  private toastEl: HTMLElement;
  /** achievement pop-ups, shown one after another */
  private achEl: HTMLElement;
  private achQueue: AchievementDef[] = [];
  private achShowing = false;
  private edgeEl: HTMLElement;
  private multiEl: HTMLElement;
  private multiBest = 0;
  private multiT = 0;
  private lastOpts: GameOptions | null = null;
  private clearedBefore = 0;
  private adaptT = 0;
  private sel: { character: string; skin: string; endlessMap: string; tier: TierId; challenge: Challenge } = { character: 'warden', skin: 'default', endlessMap: 'graveyard', tier: 'normal', challenge: { threat: 1, curses: [] } };
  private onScreenBack: (() => void) | null = null;

  constructor(app: Application, assets: Assets, input: Input, root: HTMLElement) {
    this.app = app;
    this.a = assets;
    this.input = input;
    this.screenEl = h('div', { class: 'screens' });
    this.overlayEl = h('div', { class: 'overlay' });
    this.modalEl = h('div', { class: 'modals' });
    this.bannerEl = h('div', { class: 'banner hidden' });
    this.toastEl = h('div', { class: 'toasts' });
    this.edgeEl = h('div', { class: 'edge' });
    this.multiEl = h('div', { class: 'multi hidden' });
    root.append(this.screenEl, this.overlayEl, this.modalEl);
    this.overlayEl.append(this.edgeEl, this.bannerEl, this.toastEl, this.multiEl);
    this.achEl = h('div', { class: 'ach-toasts' });
    this.overlayEl.append(this.achEl);
    app.renderer.on('resize', (w: number, hgt: number) => this.game?.resize(w, hgt));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.game && this.game.modal === 'none') this.game.setModal('pause');
    });
    window.addEventListener('keydown', (e) => {
      const m = /^(?:Digit|Numpad)([1-3])$/.exec(e.code);
      if (!m || this.inputLock > 0 || this.input.captureKey) return;
      const modal = this.modalEl.querySelector('.modal.levelup');
      const card = modal?.querySelectorAll<HTMLElement>('.cards .card')[Number(m[1]) - 1];
      if (card) {
        e.preventDefault();
        card.click();
      }
    });
    window.addEventListener('blur', () => {
      if (this.game && this.game.modal === 'none') this.game.setModal('pause');
    });
  }

  // ================================================================ frame
  frame(dtMs: number): void {
    const dt = dtMs / 1000;
    const g = this.game;
    if (g) {
      g.frame(dtMs);
      if (this.hud) {
        this.hud.update(g, dt);
        this.adaptT += dt;
        if (this.adaptT > 0.5) {
          this.adaptT = 0;
          g.fx.adapt(this.hud.fpsValue);
        }
      }
    }
    const events = this.input.takeNav();
    if (this.inputLock > 0) {
      this.inputLock -= dt;
      return;
    }
    if (this.nav.layer) this.nav.handle(events);
  }

  // ================================================================ layers
  private showScreen(el: HTMLElement, onBack: (() => void) | null): void {
    this.screenEl.replaceChildren(el);
    this.onScreenBack = onBack;
    this.nav.set(el, onBack);
    requestAnimationFrame(() => this.nav.focusFirst());
  }

  private openModal(el: HTMLElement, onBack: (() => void) | null = null, onAlt: (() => void) | null = null, lock = 0.3): void {
    this.modalEl.replaceChildren(el);
    this.nav.set(el, onBack, onAlt);
    this.inputLock = lock;
    this.input.clearEdges();
    requestAnimationFrame(() => this.nav.focusFirst());
  }

  private closeModal(): void {
    const el = this.modalEl.firstElementChild as HTMLElement | null;
    if (el) this.nav.release(el);
    this.modalEl.replaceChildren();
    // back to the menu screen's navigation if no run is active
    if (!this.game && this.screenEl.firstElementChild) this.nav.set(this.screenEl.firstElementChild as HTMLElement, this.onScreenBack);
  }

  private btn(label: string, onClick: () => void, cls = '', attrs: Record<string, string | boolean> = {}): HTMLButtonElement {
    return h('button', { class: `btn ${cls}`, 'data-nav': true, onclick: () => {
      audio.play('click');
      onClick();
    }, ...attrs }, label);
  }

  private icon(key: string, cls = ''): HTMLImageElement {
    return h('img', { class: `px ${cls}`, src: this.a.icons[key] ?? this.a.icons.i_star, alt: '' });
  }

  // ================================================================ menus
  showMenu(): void {
    this.destroyGame();
    audio.playMusic('menu');
    const endless = isEndlessUnlocked();
    const art = storyScene(menuScene()).toCanvas();
    art.className = 'menu-art';
    const el = h(
      'div',
      { class: 'screen menu' },
      art,
      h('div', { class: 'menu-shade' }),
      h(
        'div',
        { class: 'menu-inner' },
        h('h1', { class: 'logo' }, 'SWARM', h('span', null, 'BREAK')),
        h('div', { class: 'tagline' }, 'Break the swarm. Outlive the dark.'),
        h(
          'div',
          { class: 'menu-buttons' },
          this.btn('Story', () => this.showStorySelect(), 'primary', { 'data-autofocus': true }),
          this.btn(endless ? 'Endless' : 'Endless  ·  beat Chapter 1', () => this.showEndlessSelect(), '', endless ? {} : { disabled: true }),
          this.btn(`Armory · ${save.data.meta.shards} shards`, () => this.showArmory()),
          this.btn('Collection', () => this.showCollection()),
          this.btn(`Achievements · ${achievementsDone()} / ${ACHIEVEMENTS.length}`, () => this.showAchievements()),
          this.btn('Codex', () => this.showCodex()),
          this.btn('Records', () => this.showRecords()),
          this.btn('Settings', () => this.showSettingsScreen()),
        ),
        h('div', { class: 'menu-foot' }, 'WASD / arrows to move · weapons fire on their own · Space casts your spell · Esc pauses'),
        h('div', { class: 'menu-foot dim' }, 'Nothing in Swarmbreak costs real money. Ever.'),
      ),
    );
    this.showScreen(el, null);
    for (const a of syncAchievements()) this.achievement(a);
    const fresh = syncHeroUnlocks();
    if (fresh.length) this.celebrateHeroes(fresh);
  }

  /** the big "new hero" moment, one card per hero */
  private celebrateHeroes(ids: string[]): void {
    const [id, ...rest] = ids;
    const c = CHARACTERS[id];
    const next = () => {
      this.closeModal();
      if (rest.length) this.celebrateHeroes(rest);
    };
    audio.play('record');
    const el = h(
      'div',
      { class: 'modal hero-unlock', style: `--c:${css(c.glow)}` },
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'hu-kicker' }, 'NEW HERO UNLOCKED'),
        h('div', { class: 'hu-art' }, this.icon(`hero_${id}`)),
        h('div', { class: 'hu-name' }, c.name),
        h('div', { class: 'hu-title' }, c.title),
        h('div', { class: 'ci-pass' }, h('b', null, c.passiveName + ': '), c.passiveDesc),
        h('div', { class: 'row center' }, this.btn(rest.length ? 'Next' : 'Nice!', next, 'primary', { 'data-autofocus': true })),
      ),
    );
    this.openModal(el, next, null, 0.6);
  }

  private charPicker(onChange: () => void, back: () => void = () => this.showMenu()): HTMLElement {
    const wrap = h('div', { class: 'pick-chars' });
    const render = () => {
      if (!isHeroUnlocked(this.sel.character)) this.sel.character = 'warden';
      wrap.replaceChildren(
        h('div', { class: 'pick-label' }, 'Hero'),
        h(
          'div',
          { class: 'char-row' },
          CHARACTER_IDS.map((id) => {
            const c = CHARACTERS[id];
            const ok = isHeroUnlocked(id);
            const prog = unlockProgress(id, heroUnlockStats());
            const selected = this.sel.character === id;
            const card = h(
              'button',
              {
                class: `char ${selected ? 'sel' : ''} ${ok ? '' : 'locked'}`,
                'data-nav': true,
                style: `--c:${css(c.glow)}`,
                onclick: () => {
                  if (!ok) {
                    this.toast(`${c.name}: ${c.unlock} — ${prog.text}`, css(c.glow));
                    return;
                  }
                  audio.play('click');
                  this.sel.character = id;
                  render();
                  onChange();
                },
              },
              ok ? this.icon(`skin_${loadoutFor(id).skin}`, 'char-art') : h('div', { class: 'char-art lockart' }, this.icon(`hero_${id}`, 'shadow'), this.icon('i_lock', 'lock')),
              h('div', { class: 'char-name' }, c.name),
              h('div', { class: 'char-title' }, ok ? c.title : c.unlock),
              ok ? null : h('div', { class: 'char-prog' }, h('div', { class: 'cp-bar' }, h('i', { style: `width:${prog.need ? Math.min(100, (prog.have / prog.need) * 100).toFixed(1) : 0}%` })), h('span', null, prog.text)),
            );
            return card;
          }),
        ),
      );
      const c = CHARACTERS[this.sel.character];
      wrap.appendChild(
        h(
          'div',
          { class: 'char-info' },
          h('div', { class: 'ci-name' }, `${c.name} — ${c.title}`),
          h('div', { class: 'ci-desc' }, c.desc),
          h('div', { class: 'ci-pass' }, h('b', null, c.passiveName + ': '), c.passiveDesc),
          h('div', { class: 'ci-start' }, this.icon(`w_${c.startWeapon}`), WEAPONS[c.startWeapon].name, h('span', { class: 'sep' }, '·'), this.icon(`s_${c.startSpell}`), SPELLS[c.startSpell].name),
          c.available ? this.masteryRow(this.sel.character, () => this.showSkillTree(this.sel.character, back)) : null,
        ),
      );
      // skins
      const hero = this.sel.character;
      const worn = loadoutFor(hero).skin;
      wrap.appendChild(
        h(
          'div',
          { class: 'skin-row' },
          h('div', { class: 'pick-label' }, 'Skin'),
          cosmeticsFor('skin', hero).map((s) => {
            const ok = cosmeticUnlocked(s.id);
            return h(
              'button',
              {
                class: `skin ${worn === s.id ? 'sel' : ''} ${ok ? '' : 'locked'}`,
                'data-nav': true,
                onclick: () => {
                  if (!ok) return this.toast(`${s.name} — ${this.earnText(s.id)}`, '#8dff6a');
                  audio.play('click');
                  equipCosmetic(hero, s.id);
                  render();
                  onChange();
                },
              },
              ok ? this.icon(`skin_${s.id}`) : this.icon('i_lock'),
              h('span', null, ok ? s.name : '???'),
            );
          }),
          this.btn('Collection', () => this.showCollection(hero, 'skin', back), 'small'),
        ),
      );
    };
    render();
    return wrap;
  }

  /** how a cosmetic is earned */
  private earnText(id: string): string {
    const a = sourceOf(id);
    return a ? `earn “${a.name}”: ${a.desc}` : 'Available from the start';
  }

  achievement(a: AchievementDef): void {
    this.achQueue.push(a);
    if (!this.achShowing) this.nextAchievement();
  }

  private nextAchievement(): void {
    const a = this.achQueue.shift();
    if (!a) {
      this.achShowing = false;
      return;
    }
    this.achShowing = true;
    audio.play('record', { vol: 0.7 });
    const reward = rewardText(a.reward, (id) => WEAPONS[id]?.name ?? COSMETIC_BY_ID[id]?.name ?? id);
    const el = h('div', { class: 'ach-toast', style: `--c:${css(a.color)}` }, this.icon(`ach_${a.id}`), h('div', null, h('span', null, 'ACHIEVEMENT'), h('b', null, a.name), reward ? h('em', null, reward) : null));
    this.achEl.replaceChildren(el);
    setTimeout(() => {
      el.remove();
      this.nextAchievement();
    }, 3400);
  }

  private showAchievements(): void {
    const c = achContext();
    const done = save.data.achievements;
    const names = (id: string) => WEAPONS[id]?.name ?? COSMETIC_BY_ID[id]?.name ?? id;
    const sorted = [...ACHIEVEMENTS].sort((x, y) => Number(!!done[y.id]) - Number(!!done[x.id]));
    const grid = h(
      'div',
      { class: 'ach-grid' },
      sorted.map((a) => {
        const p = achievementProgress(a, c);
        const got = !!done[a.id];
        return h(
          'div',
          { class: `ach ${got ? 'got' : ''}`, style: `--c:${css(a.color)}` },
          this.icon(`ach_${a.id}`, 'ach-icon'),
          h(
            'div',
            { class: 'ach-text' },
            h('b', null, a.name),
            h('span', null, a.desc),
            h('div', { class: 'ach-bar' }, h('i', { style: `width:${((p.have / p.need) * 100).toFixed(1)}%` }), h('span', null, got ? 'Done' : `${Math.floor(p.have).toLocaleString('en-US')} / ${p.need.toLocaleString('en-US')}`)),
            h('em', null, `Reward: ${rewardText(a.reward, names)}`),
          ),
        );
      }),
    );
    const el = h(
      'div',
      { class: 'screen select' },
      h('div', { class: 'panel wide tall' }, h('h2', null, 'Achievements'), h('div', { class: 'hint left' }, `${achievementsDone()} of ${ACHIEVEMENTS.length} earned. Every one pays out a cosmetic, a weapon unlock or Star Shards.`), h('div', { class: 'scroll' }, grid), h('div', { class: 'row end' }, this.btn('Back', () => this.showMenu(), 'primary'))),
    );
    this.showScreen(el, () => this.showMenu());
  }

  /** a small picture of what a cosmetic looks like */
  private cosmeticPreview(c: CosmeticDef): HTMLElement {
    switch (c.kind) {
      case 'skin':
        return h('div', { class: 'cp skin' }, this.icon(`skin_${c.id}`));
      case 'trail': {
        const col = c.color ? css(c.color) : 'linear-gradient(90deg, #6ff3ff, #ff8a3d, #c46dff, #7dff8a)';
        return h('div', { class: 'cp trail', style: `--t:${col}` }, h('i'), h('i'), h('i'));
      }
      case 'burst':
        return h('div', { class: `cp burst ${c.style}` }, Array.from({ length: 7 }, () => h('i')));
      case 'numbers': {
        const st = NUMBER_STYLES[c.style ?? 'default'];
        return h('div', { class: 'cp numbers' }, h('span', { style: `color:${css(st.hit)}` }, '24'), h('span', { class: 'crit', style: `color:${css(st.crit)}` }, '137!'), h('span', { class: 'mega', style: `color:${css(st.mega)}` }, '612!!'));
      }
      case 'banner':
        return h('div', { class: 'cp banner' }, h('span', null, c.id === 'banner_none' ? '—' : c.name), h('b', null, 'VICTORY'));
      case 'menu': {
        const cv = storyScene(c.scene ?? 'graveyard_before').toCanvas();
        cv.className = 'cp-scene';
        return h('div', { class: 'cp menu' }, cv);
      }
    }
  }

  private showCollection(hero = this.sel.character, kind: CosmeticKind = 'skin', back: () => void = () => this.showMenu()): void {
    if (!isHeroUnlocked(hero)) hero = 'warden';
    const info = COSMETIC_KINDS.find((k) => k.kind === kind)!;
    const lo = loadoutFor(hero);
    const equipped = (c: CosmeticDef) => (c.kind === 'menu' ? menuScene() === c.scene : lo[c.kind as Exclude<CosmeticKind, 'menu'>] === c.id);
    const items = kind === 'skin' ? cosmeticsFor('skin', hero) : COSMETICS.filter((c) => c.kind === kind);
    const owned = COSMETICS.filter((c) => cosmeticUnlocked(c.id)).length;
    const tabs = h('div', { class: 'tabs' }, COSMETIC_KINDS.map((k) => this.btn(k.name, () => this.showCollection(hero, k.kind, back), k.kind === kind ? 'tab sel' : 'tab')));
    const heroes = info.perHero
      ? h('div', { class: 'col-heroes' }, h('span', { class: 'pick-label' }, 'Loadout for'), CHARACTER_IDS.filter(isHeroUnlocked).map((id) => h('button', { class: `col-hero ${id === hero ? 'sel' : ''}`, 'data-nav': true, style: `--c:${css(CHARACTERS[id].glow)}`, onclick: () => this.showCollection(id, kind, back) }, this.icon(`skin_${loadoutFor(id).skin}`), h('span', null, CHARACTERS[id].name))))
      : h('div', { class: 'hint left' }, 'The menu background is shared by every hero.');
    const grid = h(
      'div',
      { class: 'col-grid' },
      items.map((c) => {
        const ok = cosmeticUnlocked(c.id);
        const on = ok && equipped(c);
        return h(
          'button',
          {
            class: `col-card ${ok ? '' : 'locked'} ${on ? 'on' : ''}`,
            'data-nav': true,
            onclick: () => {
              if (!ok) return this.toast(`${c.name}: ${this.earnText(c.id)}`, '#ffc94d');
              audio.play('click');
              equipCosmetic(hero, c.id);
              this.showCollection(hero, kind, back);
            },
          },
          this.cosmeticPreview(c),
          h('b', null, c.name),
          h('span', null, ok ? c.desc : this.earnText(c.id)),
          h('em', null, on ? 'EQUIPPED' : ok ? 'Equip' : 'LOCKED'),
        );
      }),
    );
    const el = h(
      'div',
      { class: 'screen select' },
      h('div', { class: 'panel wide tall' }, h('h2', null, 'Collection'), h('div', { class: 'hint left' }, `${owned} of ${COSMETICS.length} cosmetics earned. All of them come from achievements — nothing is for sale.`), tabs, heroes, h('div', { class: 'scroll' }, grid), h('div', { class: 'row end' }, this.btn('Back', back, 'primary'))),
    );
    this.showScreen(el, back);
  }

  private showStorySelect(): void {
    const cleared = save.data.progress.chaptersCleared;
    let chosen = 'graveyard';
    const chapters = h('div', { class: 'chapters' });
    const renderCh = () => {
      chapters.replaceChildren(
        ...MAP_ORDER.map((id) => {
          const m = MAPS[id];
          const unlocked = m.available && (save.data.settings.unlockAll || m.chapter <= cleared + 1);
          const done = cleared >= m.chapter;
          const best = save.data.progress.tiers[id] ?? -1;
          return h(
            'button',
            {
              class: `chapter ${chosen === id ? 'sel' : ''} ${unlocked ? '' : 'locked'}`,
              'data-nav': true,
              style: `--c:${m.accent}`,
              onclick: () => {
                if (!unlocked) {
                  this.toast(m.available ? `Beat Chapter ${m.chapter - 1} first` : `${m.name} arrives in a later update`, m.accent);
                  return;
                }
                audio.play('click');
                chosen = id;
                renderCh();
              },
            },
            h('div', { class: 'ch-num' }, `CHAPTER ${ROMAN[m.chapter - 1]}`),
            h('div', { class: 'ch-name' }, m.name),
            h('div', { class: 'ch-state' }, !m.available ? 'Coming in a later update' : done ? `✓ Cleared${best >= 0 ? ` on ${TIERS[best].name}` : ''}` : unlocked ? `5 rounds · mini-bosses · ${BOSSES[m.boss]?.name ?? 'a boss'}` : `Beat Chapter ${m.chapter - 1}`),
            m.available ? this.medals(best) : null,
          );
        }),
      );
      tierRow.replaceChildren(this.tierPicker(chosen, () => renderCh()));
    };
    const tierRow = h('div', { class: 'tier-row' });
    renderCh();
    const el = h(
      'div',
      { class: 'screen select' },
      h('div', { class: 'panel wide' }, h('h2', null, 'Story'), chapters, tierRow, this.charPicker(() => undefined, () => this.showStorySelect()), h('div', { class: 'row end' }, this.btn('Back', () => this.showMenu()), this.btn(`Overtime: ${challengeLabel(this.sel.challenge)}`, () => this.overtimeSettings(() => this.showStorySelect()), 'small'), this.btn('Start chapter', () => this.startRun({ mode: 'story', map: chosen, character: this.sel.character, skin: this.sel.skin, tier: this.sel.tier, challenge: { ...this.sel.challenge } }), 'primary', { 'data-autofocus': true }))),
    );
    this.showScreen(el, () => this.showMenu());
  }

  /** five pips, lit up to the best tier cleared */
  private medals(best: number): HTMLElement {
    return h('div', { class: 'medals', title: best >= 0 ? `Best clear: ${TIERS[best].name}` : 'Not cleared yet' }, TIERS.map((t, i) => h('i', { class: i <= best ? 'on' : '', style: `--c:${t.color}` })));
  }

  private tierPicker(map: string, onChange: () => void): HTMLElement {
    const best = save.data.progress.tiers[map] ?? -1;
    const ok = (id: TierId) => save.data.settings.unlockAll || tierUnlocked(id, best);
    if (!ok(this.sel.tier)) this.sel.tier = 'normal';
    const cur = TIERS.find((t) => t.id === this.sel.tier)!;
    return h(
      'div',
      { class: 'tiers' },
      h('div', { class: 'pick-label' }, 'Difficulty'),
      h(
        'div',
        { class: 'tier-btns' },
        TIERS.map((t, i) =>
          h('button', {
            class: `tier ${t.id === this.sel.tier ? 'sel' : ''} ${ok(t.id) ? '' : 'locked'}`,
            'data-nav': true,
            style: `--c:${t.color}`,
            onclick: () => {
              if (!ok(t.id)) return this.toast(`Clear this chapter on ${TIERS[i - 1].name} to unlock ${t.name}`, t.color);
              audio.play('click');
              this.sel.tier = t.id;
              onChange();
            },
          }, h('b', null, t.name), h('span', null, ok(t.id) ? `Shards ×${t.shards}` : `Clear on ${TIERS[i - 1].name}`)),
        ),
      ),
      h('div', { class: 'tier-desc', style: `--c:${cur.color}` }, h('b', null, `${cur.name}: `), cur.desc, cur.twist ? h('em', null, ` ${cur.twist}`) : null),
    );
  }

  /** starting Threat + curse toggles (Endless, and Overtime after a chapter) */
  private challengePicker(onChange: () => void): HTMLElement {
    const wrap = h('div', { class: 'challenge' });
    const c = this.sel.challenge;
    const render = () => {
      const bonus = Math.round((challengeShardMult(c) - 1) * 100);
      wrap.replaceChildren(
        h('div', { class: 'pick-label' }, 'Starting Threat'),
        h('div', { class: 'threat-btns' }, START_THREATS.map((t) => h('button', { class: `thr ${c.threat === t ? 'sel' : ''}`, 'data-nav': true, onclick: () => {
          audio.play('click');
          c.threat = t;
          render();
          onChange();
        } }, String(t)))),
        h('div', { class: 'pick-label' }, 'Curses'),
        h('div', { class: 'curse-btns' }, CURSES.map((cu) => {
          const on = c.curses.includes(cu.id);
          return h('button', { class: `curse ${on ? 'on' : ''}`, 'data-nav': true, style: `--c:${cu.color}`, onclick: () => {
            audio.play(on ? 'click' : 'curse', { vol: 0.5 });
            c.curses = on ? c.curses.filter((x) => x !== cu.id) : [...c.curses, cu.id];
            render();
            onChange();
          } }, h('i', null, on ? '✓' : ''), h('div', null, h('b', null, cu.name), h('span', null, `${cu.desc} +${Math.round(cu.shards * 100)}% shards`)));
        })),
        h('div', { class: 'challenge-bonus' }, bonus > 0 ? `Star Shard bonus +${bonus}% · records are kept separately for this setup` : 'No bonus: the standard run.'),
      );
    };
    render();
    return wrap;
  }

  /** a small modal to set the challenge Overtime will use */
  private overtimeSettings(back: () => void): void {
    const done = () => {
      this.closeModal();
      back();
    };
    const el = h('div', { class: 'modal' }, h('div', { class: 'panel' }, h('h2', null, 'Overtime challenge'), h('div', { class: 'hint left' }, 'If you choose Overtime after the chapter boss, it starts at this Threat (or the final round’s, if higher) with these curses on. Your chapter’s difficulty tier keeps scaling it.'), this.challengePicker(() => undefined), h('div', { class: 'row end' }, this.btn('Done', done, 'primary', { 'data-autofocus': true }))));
    this.openModal(el, done);
  }

  private showEndlessSelect(): void {
    // a chapter's Endless opens once that chapter is cleared in Story
    const reached = Math.max(1, save.data.progress.chaptersCleared);
    const maps = MAP_ORDER.filter((id) => MAPS[id].available && (save.data.settings.unlockAll || MAPS[id].chapter <= reached));
    if (!maps.includes(this.sel.endlessMap)) this.sel.endlessMap = maps[0];
    const bestEl = h('div', { class: 'best-line' });
    const renderBest = () => {
      const k = challengeKey(this.sel.challenge);
      const rec = save.data.bests[k ? `${this.sel.endlessMap}|${k}` : this.sel.endlessMap]?.[this.sel.character];
      bestEl.textContent = rec ? `Best with ${CHARACTERS[this.sel.character].name} (${challengeLabel(this.sel.challenge)}): ${formatTime(rec.time)} · ${rec.kills} kills` : `No record yet on this map at ${challengeLabel(this.sel.challenge)}.`;
    };
    const list = h('div', { class: 'chapters' });
    const render = () => {
      list.replaceChildren(
        ...MAP_ORDER.map((id) => {
          const m = MAPS[id];
          const ok = maps.includes(id);
          return h(
            'button',
            {
              class: `chapter ${this.sel.endlessMap === id ? 'sel' : ''} ${ok ? '' : 'locked'}`,
              'data-nav': true,
              style: `--c:${m.accent}`,
              onclick: () => {
                if (!ok) return this.toast(m.available ? 'Clear this chapter in Story mode first' : `${m.name} arrives in a later update`, m.accent);
                audio.play('click');
                this.sel.endlessMap = id;
                render();
                renderBest();
              },
            },
            h('div', { class: 'ch-num' }, 'ENDLESS'),
            h('div', { class: 'ch-name' }, m.name),
            h('div', { class: 'ch-state' }, ok ? 'Threat rises every 20s · milestones every 5 min' : m.available ? 'Clear it in Story first' : 'Coming in a later update'),
          );
        }),
      );
    };
    render();
    renderBest();
    const el = h(
      'div',
      { class: 'screen select' },
      h(
        'div',
        { class: 'panel wide' },
        h('h2', null, 'Endless'),
        list,
        this.charPicker(renderBest, () => this.showEndlessSelect()),
        this.challengePicker(renderBest),
        bestEl,
        h('div', { class: 'row end' }, this.btn('Back', () => this.showMenu()), this.btn('Survive', () => this.startRun({ mode: 'endless', map: this.sel.endlessMap, character: this.sel.character, skin: this.sel.skin, challenge: { ...this.sel.challenge } }), 'primary', { 'data-autofocus': true })),
      ),
    );
    this.showScreen(el, () => this.showMenu());
  }

  // ---------------------------------------------------------------- settings
  private settingsPanel(onBack: () => void, inRun: boolean): HTMLElement {
    const s = save.data.settings;
    const slider = (label: string, get: () => number, set: (v: number) => void) => {
      const val = h('span', { class: 'val' }, `${Math.round(get() * 100)}%`);
      const input = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: get(), 'data-nav': true }) as HTMLInputElement;
      input.addEventListener('input', () => {
        set(Number(input.value));
        val.textContent = `${Math.round(Number(input.value) * 100)}%`;
        audio.setVolumes(s.music, s.sfx);
        save.write();
      });
      input.addEventListener('change', () => audio.play('coin'));
      return h('label', { class: 'set-row' }, h('span', null, label), input, val);
    };
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void, hint = '') => {
      const b = h('button', { class: `toggle ${get() ? 'on' : ''}`, 'data-nav': true }, get() ? 'On' : 'Off');
      b.addEventListener('click', () => {
        set(!get());
        b.classList.toggle('on', get());
        b.textContent = get() ? 'On' : 'Off';
        audio.play('click');
        save.write();
      });
      return h('div', { class: 'set-row' }, h('span', null, label, hint ? h('small', null, hint) : null), b);
    };
    const keys = h('div', { class: 'keys' });
    const renderKeys = () => {
      keys.replaceChildren(
        ...(Object.keys(DEFAULT_KEYS) as Action[]).map((act) => {
          const b = h('button', { class: 'keybtn', 'data-nav': true }, s.keys[act].map(keyLabel).join(' / ') || '—');
          b.addEventListener('click', () => {
            b.textContent = 'Press a key…';
            b.classList.add('waiting');
            this.input.captureKey = (code) => {
              if (code !== 'Escape') {
                // a key can only do one thing
                for (const other of Object.keys(s.keys) as Action[]) s.keys[other] = s.keys[other].filter((c) => c !== code);
                s.keys[act] = [code, ...s.keys[act].filter((c) => c !== code)].slice(0, 2);
                save.write();
              }
              this.inputLock = 0.15;
              renderKeys();
            };
          });
          return h('div', { class: 'set-row' }, h('span', null, act === 'spell' ? 'Cast spell' : act[0].toUpperCase() + act.slice(1)), b);
        }),
        h('div', { class: 'row' }, this.btn('Reset keys', () => {
          s.keys = structuredClone(DEFAULT_KEYS);
          save.write();
          renderKeys();
        }, 'small')),
      );
    };
    renderKeys();
    let resetArmed = false;
    const resetBtn = this.btn('Erase save data', () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = 'Press again to erase everything';
        resetBtn.classList.add('danger');
        return;
      }
      save.data = resetSave();
      audio.setVolumes(save.data.settings.music, save.data.settings.sfx);
      this.toast('Save data erased', '#ff4d6d');
      this.showMenu();
    }, 'small');
    return h(
      'div',
      { class: 'panel settings' },
      h('h2', null, 'Settings'),
      h('div', { class: 'set-group' }, h('h3', null, 'Sound'), slider('Music', () => s.music, (v) => (s.music = v)), slider('Effects', () => s.sfx, (v) => (s.sfx = v))),
      h(
        'div',
        { class: 'set-group' },
        h('h3', null, 'Visuals'),
        toggle('Reduced effects', () => s.effects === 'reduced', (v) => {
          s.effects = v ? 'reduced' : 'full';
          this.game?.setReduced(v);
        }, 'Fewer particles, softer flashes, no hit-stop'),
        toggle('Damage numbers', () => s.damageNumbers, (v) => {
          s.damageNumbers = v;
          if (this.game) this.game.fx.numbersOn = v;
        }),
        toggle('Show FPS', () => s.showFps, (v) => (s.showFps = v)),
      ),
      h('div', { class: 'set-group' }, h('h3', null, 'Keys'), keys, h('div', { class: 'hint' }, 'Gamepads use the standard layout: left stick moves, A / RB / RT casts, Start pauses.')),
      inRun
        ? null
        : h(
            'div',
            { class: 'set-group' },
            h('h3', null, 'Testing'),
            testingToolsAllowed() ? toggle('Unlock everything', () => s.unlockAll, (v) => (s.unlockAll = v), 'Testing only: opens every map, hero, tier, weapon and cosmetic without earning them') : null,
            h('div', { class: 'row' }, resetBtn),
          ),
      h('div', { class: 'row end' }, this.btn('Back', onBack, 'primary')),
    );
  }

  private showSettingsScreen(): void {
    const el = h('div', { class: 'screen select' }, this.settingsPanel(() => this.showMenu(), false));
    this.showScreen(el, () => this.showMenu());
  }

  // ---------------------------------------------------------------- codex & records
  /** how a locked weapon is earned, for the Armory and Codex */
  private weaponEarnText(id: string): string {
    const u = WEAPON_UNLOCKS[id];
    const a = sourceOf(id);
    return u ? `Unlock: ${u.shards} Star Shards in the Armory${a ? `, or free with the achievement “${a.name}”` : ''}.` : '';
  }

  private showCodex(tab: 'weapons' | 'enemies' | 'bosses' | 'evolutions' = 'weapons'): void {
    const seen = new Set(save.data.codex.enemies);
    const tabs = h(
      'div',
      { class: 'tabs' },
      (['weapons', 'enemies', 'bosses', 'evolutions'] as const).map((t) => this.btn(t[0].toUpperCase() + t.slice(1), () => this.showCodex(t), tab === t ? 'tab sel' : 'tab')),
    );
    let body: HTMLElement;
    if (tab === 'weapons') {
      const pool = new Set(weaponPoolFor(this.sel.character));
      body = h(
        'div',
        { class: 'codex-grid' },
        ALL_WEAPON_IDS.map((id) => {
          const w = WEAPONS[id];
          const open = pool.has(id) || save.data.meta.weapons.includes(id) || STARTER_WEAPON_IDS.includes(id);
          return h('div', { class: `entry ${open ? '' : 'unknown locked-weapon'}` }, h('div', { class: 'entry-art' }, this.icon(`w_${id}`)), h('div', null, h('div', { class: 'entry-tag' }, open ? (STARTER_WEAPON_IDS.includes(id) ? 'Starter' : 'Unlocked') : 'Locked'), h('div', { class: 'entry-name' }, w.name), h('div', { class: 'entry-lore' }, open ? w.desc : `${w.desc} ${this.weaponEarnText(id)}`)));
        }),
      );
    } else if (tab === 'enemies') {
      body = h(
        'div',
        { class: 'codex-grid' },
        Object.values(ENEMIES).map((e) => {
          const known = seen.has(e.id);
          return h('div', { class: `entry ${known ? '' : 'unknown'}` }, h('div', { class: 'entry-art' }, known ? this.icon(`enemy_${e.sprite}`) : this.icon('i_lock')), h('div', null, h('div', { class: 'entry-name' }, known ? e.name : '???'), h('div', { class: 'entry-lore' }, known ? e.lore : 'Not yet encountered.')));
        }),
      );
    } else if (tab === 'bosses') {
      const all = [...Object.values(MINIBOSSES).map((m) => ({ id: m.id, name: m.name, sprite: m.sprite, lore: m.lore, tag: 'Mini-boss' })), ...Object.values(BOSSES).map((b) => ({ id: b.id, name: b.name, sprite: b.sprite, lore: b.lore, tag: 'Main boss' }))];
      body = h(
        'div',
        { class: 'codex-grid' },
        all.map((e) => {
          const known = seen.has(e.id);
          return h('div', { class: `entry big ${known ? '' : 'unknown'}` }, h('div', { class: 'entry-art' }, known ? this.icon(`enemy_${e.sprite}`) : this.icon('i_lock')), h('div', null, h('div', { class: 'entry-tag' }, e.tag), h('div', { class: 'entry-name' }, known ? e.name : '???'), h('div', { class: 'entry-lore' }, known ? e.lore : 'Not yet encountered.')));
        }),
      );
    } else {
      const found = new Set(save.data.codex.evolutions);
      body = h(
        'div',
        { class: 'codex-grid' },
        allEvolutionRecipes().map((r) => {
          const known = found.has(r.into);
          const w = WEAPONS[r.weapon], into = WEAPONS[r.into], p = PASSIVES[r.passive];
          return h(
            'div',
            { class: `entry ${known ? '' : 'unknown'}` },
            h('div', { class: 'entry-art' }, this.icon(known ? `w_${r.into}` : 'i_lock')),
            h('div', null, h('div', { class: 'entry-name' }, known ? into.name : '??? Evolution'), h('div', { class: 'entry-lore' }, known ? `${w.name} (max level) + ${p.name}. ${into.desc}` : `Max out ${w.name} while holding the right passive.`)),
          );
        }),
      );
    }
    const el = h('div', { class: 'screen select' }, h('div', { class: 'panel wide tall' }, h('h2', null, 'Codex'), tabs, h('div', { class: 'scroll' }, body), h('div', { class: 'row end' }, this.btn('Back', () => this.showMenu(), 'primary'))));
    this.showScreen(el, () => this.showMenu());
  }

  private showRecords(): void {
    const st = save.data.stats;
    const bests: HTMLElement[] = [];
    for (const [key, byChar] of Object.entries(save.data.bests)) {
      const [map, ck] = key.split('|');
      const setup = ck ? ` · ${challengeLabel(parseChallengeKey(ck))}` : '';
      for (const [ch, r] of Object.entries(byChar)) bests.push(h('div', { class: 'rec-row' }, h('span', null, `${MAPS[map]?.name ?? map} · ${CHARACTERS[ch]?.name ?? ch}${setup}`), h('b', null, `${formatTime(r.time)} · ${r.kills} kills`)));
    }
    const el = h(
      'div',
      { class: 'screen select' },
      h(
        'div',
        { class: 'panel wide tall' },
        h('h2', null, 'Records'),
        h(
          'div',
          { class: 'scroll' },
          h(
            'div',
            { class: 'stat-grid' },
            [
              ['Chapters cleared', `${save.data.progress.chaptersCleared} / 3`],
              ['Total kills', st.totalKills.toLocaleString()],
              ['Runs', String(st.runs)],
              ['Chests opened', String(st.chestsOpened)],
              ['Bosses defeated', String(st.bossesKilled)],
              ['Best kill streak', String(st.bestStreak)],
              ['Time played', formatTime(st.playTime)],
            ].map(([k, v]) => h('div', { class: 'stat' }, h('span', null, k), h('b', null, v))),
          ),
          h('h3', null, 'Best Endless times'),
          bests.length ? bests : h('div', { class: 'dim' }, 'None yet.'),
          h('h3', null, 'Recent runs'),
          save.data.history.length
            ? save.data.history.map((r) => h('div', { class: `rec-row ${r.won ? 'won' : ''}` }, h('span', null, `${r.mode === 'story' ? 'Story' : 'Endless'} · ${MAPS[r.map]?.name ?? r.map}`), h('b', null, `${r.won ? 'Victory' : r.mode === 'endless' ? formatTime(r.time) : 'Fell'} · ${r.kills} kills · LV ${r.level}`)))
            : h('div', { class: 'dim' }, 'No runs yet.'),
        ),
        h('div', { class: 'row end' }, this.btn('Back', () => this.showMenu(), 'primary')),
      ),
    );
    this.showScreen(el, () => this.showMenu());
  }

  // ================================================================ runs
  startRun(opts: GameOptions): void {
    this.destroyGame();
    this.screenEl.replaceChildren();
    this.nav.layer = null;
    this.lastOpts = opts;
    this.clearedBefore = save.data.progress.chaptersCleared;
    const g = new Game(this.app, this.a, this.input, this, { ...opts, meta: metaBonusFor(opts.character), weaponPool: weaponPoolFor(opts.character), loadout: loadoutFor(opts.character), skin: loadoutFor(opts.character).skin });
    this.game = g;
    this.app.stage.addChild(g.root);
    this.hud = new Hud(this.a, () => g.modal === 'none' && g.setModal('pause'), () => this.input.press('spell'));
    this.overlayEl.prepend(this.hud.el);
    this.input.setTouchEnabled(true);
    if (opts.mode === 'story') this.storyCard(g.map.storyBefore, 'Begin', () => g.begin());
    else g.begin();
  }

  private destroyGame(): void {
    this.closeModal();
    if (this.game) {
      this.app.stage.removeChild(this.game.root);
      this.game.destroy();
      this.game = null;
    }
    this.hud?.el.remove();
    this.hud = null;
    this.overlayEl.querySelectorAll('.boss-intro').forEach((e) => e.remove());
    this.bannerEl.classList.add('hidden');
    this.input.setTouchEnabled(false);
  }

  /** the closing credits roll, shown after the final chapter */
  private credits(onDone: () => void): void {
    const sections: [string, string[]][] = [
      ['SWARMBREAK', ['A sci-fi dark fantasy horde-survival roguelite']],
      ['Design & Direction', ['The Swarmbreak team']],
      ['Code, Pixel Art, Sound & Music', ['Generated entirely in code', 'with Claude']],
      ['Play-testing', ['You', 'Your buddy, who survived the pre-arsenal days', 'A very determined bot that kited one boss for ten minutes']],
      ['Heroes of the Swarm', ['The Warden, Void-Forged Knight', 'Glint, Cyber-Ninja Scout', 'The Voidcaller, Hooded Summoner', 'Riven, Techno-Engineer', 'Fortune, Cursed-Coin Rogue', 'Pyre, Plasma Sorcerer']],
      ['Defeated', ['The Fallen Star-Titan', 'The Organ-Beast', 'The Heart of the Black Sun', 'The Librarian of Silence', 'The Swarm Mind']],
      ['Nothing in this game costs real money.', ['Ever.']],
      ['Thank you for playing', ['The light is back. Endless mode is waiting on every world.']],
    ];
    const roll = h('div', { class: 'credits-roll' }, sections.map(([head, lines]) => h('div', { class: 'credits-sec' }, h('h3', null, head), lines.map((l) => h('p', null, l)))));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      this.closeModal();
      onDone();
    };
    const el = h('div', { class: 'modal credits' }, h('div', { class: 'credits-view' }, roll), h('div', { class: 'row center credits-skip' }, this.btn('See results', close, 'primary', { 'data-autofocus': true })));
    this.openModal(el, null, null, 0.6);
    audio.playMusic('ending');
    roll.addEventListener('animationend', () => setTimeout(close, 2500));
  }

  private storyCard(card: StoryCard, button: string, onDone: () => void, extra: HTMLElement | null = null): void {
    const art = storyScene(card.art).toCanvas();
    art.className = 'story-art';
    const el = h(
      'div',
      { class: 'modal story' },
      h('div', { class: 'story-card' }, art, h('h2', null, card.title), h('div', { class: 'story-lines' }, card.lines.map((l, i) => h('p', { style: `animation-delay:${0.35 + i * 0.9}s` }, l))), extra, h('div', { class: 'row center' }, this.btn(button, () => {
        this.closeModal();
        onDone();
      }, 'primary', { 'data-autofocus': true }))),
    );
    this.openModal(el, null, null, 0.6);
  }

  // ================================================================ GameUI
  levelUp(offers: Offer[]): void {
    const g = this.game!;
    let banish = false;
    const el = h('div', { class: 'modal levelup' });
    const render = (list: Offer[]) => {
      el.replaceChildren(
        h('div', { class: 'lu-head' }, h('div', { class: 'lu-title' }, 'LEVEL UP'), h('div', { class: 'lu-sub' }, banish ? 'Choose a card to banish from this run' : `Level ${g.level - g.pendingLevels} — choose one`)),
        h(
          'div',
          { class: 'cards' },
          list.map((o, i) =>
            this.offerCard(o, () => {
              if (banish) {
                const next = g.banishOffer(i);
                if (next) {
                  banish = false;
                  audio.play('curse', { vol: 0.5 });
                  render(next);
                  this.nav.focusFirst();
                }
                return;
              }
              this.closeModal();
              g.chooseLevelUp(i);
            }, i === 0, String(i + 1)),
          ),
        ),
        h(
          'div',
          { class: 'row center lu-actions' },
          this.btn(g.mods.noRerolls ? 'Reroll (cursed)' : g.freeRerolls > 0 ? `Reroll (free)` : `Reroll (${g.rerolls})`, () => {
            const next = g.rerollLevelUp();
            if (next) {
              render(next);
              this.nav.focusFirst();
            }
          }, g.freeRerolls > 0 && !g.mods.noRerolls ? 'small glow' : 'small', !g.mods.noRerolls && (g.rerolls > 0 || g.freeRerolls > 0) ? {} : { disabled: true }),
          this.btn(banish ? 'Cancel banish' : `Banish (${g.banishes})`, () => {
            banish = !banish;
            render(list);
            this.nav.focusFirst();
          }, `small ${banish ? 'danger' : ''}`, g.banishes > 0 || banish ? {} : { disabled: true }),
          this.btn(`Skip +5 coins (${g.skips})`, () => {
            this.closeModal();
            g.skipLevelUp();
          }, 'small', g.skips > 0 ? {} : { disabled: true }),
        ),
        h('div', { class: 'hint' }, '1 · 2 · 3 to pick · R / X to reroll'),
      );
      el.classList.toggle('banishing', banish);
    };
    render(offers);
    this.openModal(el, null, () => {
      const next = g.rerollLevelUp();
      if (next) {
        audio.play('click');
        render(next);
        this.nav.focusFirst();
      }
    }, 0.22);
  }

  private offerCard(o: Offer, onPick: () => void, autofocus = false, keyHint = ''): HTMLElement {
    const g = this.game!;
    const v = describeOffer(g.build, o);
    const r = RARITY_INFO[rarityOf(o.rarity)];
    return h(
      'button',
      { class: `card r-${rarityOf(o.rarity)} ${o.kind === 'evolution' ? 'evo' : ''}`, 'data-nav': true, 'data-autofocus': autofocus, style: `--rc:${r.css};--ic:${css(v.color)}`, onclick: () => {
        audio.play('click');
        onPick();
      } },
      keyHint ? h('div', { class: 'card-key' }, keyHint) : null,
      h('div', { class: 'card-rarity' }, r.label),
      h('div', { class: 'card-icon' }, this.icon(v.icon)),
      h('div', { class: 'card-tag' }, v.tag),
      h('div', { class: 'card-name' }, v.name),
      h('div', { class: 'card-lines' }, v.lines.map((l) => h('p', null, l))),
    );
  }

  chest(res: ChestOpenResult): void {
    const g = this.game!;
    const rar = rarityOf(res.rarity);
    const info = RARITY_INFO[rar];
    const view = describeOffer(g.build, res.offer);
    // the reel: random icons, landing on the real one
    const pool = [...Object.keys(WEAPONS).filter((k) => !WEAPONS[k].evolved).map((k) => `w_${k}`), ...Object.keys(PASSIVES).map((k) => `p_${k}`), ...Object.keys(RELICS).map((k) => `r_${k}`)];
    const N = 36, LAND = 30, TILE = 76;
    const tiles: HTMLElement[] = [];
    for (let i = 0; i < N; i++) {
      const isLand = i === LAND;
      const rr = isLand ? res.rarity : Math.min(4, Math.floor(Math.pow(Math.random(), 2.2) * 5));
      const key = isLand ? view.icon : pool[(Math.random() * pool.length) | 0];
      tiles.push(h('div', { class: `tile r-${rarityOf(rr)} ${isLand ? 'land' : ''}`, style: `--rc:${RARITY_INFO[rarityOf(rr)].css}` }, this.icon(key)));
    }
    const strip = h('div', { class: 'reel-strip' }, tiles);
    const reel = h('div', { class: 'reel' }, strip, h('div', { class: 'reel-marker' }));
    const odds = h('div', { class: 'odds' }, RARITIES.map((r, i) => h('div', { class: 'odd', style: `--c:${RARITY_INFO[r].css}` }, h('i', { style: `height:${Math.max(3, res.odds[i] * 100)}%` }), h('span', null, `${(res.odds[i] * 100).toFixed(res.odds[i] < 0.1 ? 1 : 0)}%`))));
    const result = h('div', { class: 'chest-result hidden' });
    const el = h('div', { class: 'modal chest', style: `--rc:${info.css}` }, h('div', { class: 'chest-title' }, res.legendary ? 'LEGENDARY CHEST' : res.free ? 'FREE CHEST' : 'CHEST'), odds, reel, result);
    const dur = g.reduced ? 0.9 : res.rarity >= 3 ? 2.7 : 2.0;
    let t0 = -1;
    let done = false;
    let lastIdx = -1;
    const finish = () => {
      if (done) return;
      done = true;
      strip.style.transform = `translateX(${-(LAND * TILE) + reel.clientWidth / 2 - TILE / 2}px)`;
      el.classList.add('revealed', `r-${rar}`);
      audio.reveal(rar);
      this.edgePulse(info.css, 0.4 + res.rarity * 0.15);
      if (res.rarity >= 3) g.flash(info.color, 0.2);
      const take = this.btn(res.offer.kind === 'evolution' ? 'Evolve!' : 'Take it', () => {
        this.closeModal();
        g.takeChest(res);
      }, 'primary', { 'data-autofocus': true });
      const leave = this.btn(`Leave it (+${g.chestLeaveRefund(res)} coins)`, () => {
        this.closeModal();
        g.leaveChest(res);
      }, 'ghost');
      result.replaceChildren(h('div', { class: 'burst' }), h('div', { class: 'reveal-label' }, `${info.label.toUpperCase()}!`), h('div', { class: 'card-wrap' }, this.offerCard(res.offer, () => take.click())), h('div', { class: 'row center' }, take, leave));
      result.classList.remove('hidden');
      this.nav.set(el, null, null);
      this.nav.focus(take, false);
      this.inputLock = 0.35;
    };
    const step = (now: number) => {
      if (done || !el.isConnected) return;
      if (t0 < 0) t0 = now;
      const t = Math.min(1, (now - t0) / 1000 / dur);
      const target = LAND * TILE - reel.clientWidth / 2 + TILE / 2;
      const x = easeOutCubic(t) * target;
      strip.style.transform = `translateX(${-x}px)`;
      const idx = Math.floor((x + reel.clientWidth / 2) / TILE);
      if (idx !== lastIdx) {
        lastIdx = idx;
        audio.play('reelTick', { pitch: 0.8 + t * 0.6 });
      }
      if (t >= 1) finish();
      else requestAnimationFrame(step);
    };
    // confirm during the spin skips straight to the result
    const skip = h('button', { class: 'btn small ghost', 'data-nav': true, 'data-autofocus': true, onclick: () => finish() }, 'Skip');
    el.appendChild(h('div', { class: 'row center skip-row' }, skip));
    this.openModal(el, null, null, 0.25);
    requestAnimationFrame(step);
  }

  victoryCache(r: VictoryCacheResult): void {
    const g = this.game!;
    const tile = (icon: string, value: HTMLElement | string, label: string, note: HTMLElement | string, delay: number, cls = '') =>
      h('div', { class: `vc-tile ${cls}`, style: `animation-delay:${delay}s` }, this.icon(icon, 'vc-ic'), typeof value === 'string' ? h('b', null, value) : value, h('span', null, label), typeof note === 'string' ? h('em', null, note) : note);
    // the shard roll: numbers spin through the tiers, then land
    const shardVal = h('b', null, `+${r.base}`);
    const shardNote = h('em', null, 'Rolling…');
    const tierEl = h('div', { class: 'vc-tier hidden' });
    const shardTile = tile('i_star', shardVal, 'Star Shards', shardNote, 0.3, 'vc-roll');
    shardTile.appendChild(tierEl);
    const odds = cacheTierWeights(g.stats.luck);
    const tot = odds.reduce((a, b) => a + b, 0);
    const oddsLine = h('div', { class: 'vc-odds' }, CACHE_TIERS.map((t, i) => h('span', { class: `t${i}` }, `×${t.mult} ${((odds[i] / tot) * 100).toFixed(0)}%`)));
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      const tier = CACHE_TIERS[r.tier];
      shardVal.textContent = `+${r.shards}`;
      shardNote.textContent = 'Spend them in the Armory';
      shardTile.classList.add(`land`, `t${r.tier}`);
      if (tier.label) {
        tierEl.textContent = `${tier.label} ×${tier.mult}`;
        tierEl.classList.remove('hidden');
      }
      if (r.tier >= 3) {
        audio.reveal('legendary');
        g.flash(0xffe08a, 0.35);
        this.edgePulse('#ffe08a', 1);
        this.banner('JACKPOT!', `+${r.shards} Star Shards`, '#ffe08a');
      } else if (r.tier >= 1) audio.reveal(r.tier === 2 ? 'epic' : 'rare');
      else audio.play('coin');
      claim.textContent = 'Claim';
    };
    const t0 = performance.now();
    const spin = () => {
      if (landed || !el.isConnected) return;
      const t = (performance.now() - t0) / 1000;
      if (t > (g.reduced ? 0.5 : 1.6)) return land();
      const m = CACHE_TIERS[Math.floor(Math.random() * CACHE_TIERS.length)].mult;
      shardVal.textContent = `+${r.base * m}`;
      if (Math.random() < 0.5) audio.play('reelTick', { pitch: 0.8 + t * 0.4 });
      setTimeout(spin, 60 + t * 60);
    };
    const claim = this.btn('Skip roll', () => {
      if (!landed) return land();
      this.closeModal();
      g.claimVictoryCache();
    }, 'primary', { 'data-autofocus': true });
    const el = h(
      'div',
      { class: 'modal chest victory-cache revealed r-legendary', style: `--rc:${RARITY_INFO.legendary.css}` },
      h('div', { class: 'chest-title' }, 'VICTORY CACHE'),
      h('div', { class: 'lu-sub' }, r.first ? 'First clear — double rewards!' : 'The run is won. These rewards stay with you.'),
      h(
        'div',
        { class: 'vc-tiles' },
        tile('i_coin', `+${r.coins}`, 'Coins', `→ ${Math.floor(r.coins / 10)} Star Shards at the end`, 0.1),
        shardTile,
        tile(`hero_${g.opts.character}`, `+${r.masteryXp}`, 'Mastery XP', `${CHARACTERS[g.opts.character]?.name ?? 'Hero'} skill points`, 0.5),
      ),
      oddsLine,
      h('div', { class: 'row center' }, claim),
    );
    this.openModal(el, null, null, 0.4);
    this.edgePulse(RARITY_INFO.legendary.css, 1);
    setTimeout(spin, 500);
  }

  /** the chapter is won: see results, or keep fighting in Overtime */
  victoryChoice(): void {
    const g = this.game!;
    const card = (cls: string, icon: string, title: string, lines: string[], onPick: () => void, auto = false) =>
      h('button', { class: `card vchoice ${cls}`, 'data-nav': true, ...(auto ? { 'data-autofocus': true } : {}), onclick: () => {
        this.closeModal();
        onPick();
      } }, this.icon(icon, 'card-icon'), h('div', { class: 'card-name' }, title), ...lines.map((l) => h('div', { class: 'card-desc' }, l)));
    const el = h(
      'div',
      { class: 'modal levelup victory-choice' },
      h('div', { class: 'lu-head' }, h('div', { class: 'lu-title' }, 'CHAPTER CLEARED'), h('div', { class: 'lu-sub' }, 'Your clear and rewards are safe either way.')),
      h(
        'div',
        { class: 'cards' },
        card('end', 'i_chest', 'See results', ['End the run here.', 'Story and rewards first.'], () => g.endVictory(), true),
        card('ot', 'i_skull', 'Overtime', ['Keep this build and keep fighting.', `The swarm scales on from here, and a great boss arrives every ${g.challenge.curses.includes('bosses') ? '75 seconds' : '2½ minutes'}.`, 'Overtime kills and XP still count.', ...(challengeKey(g.challenge) ? [`Challenge: ${challengeLabel(g.challenge)}`] : [])], () => g.startOvertime()),
      ),
    );
    this.openModal(el, null, null, 0.4);
  }

  shrine(choices: Offer[]): void {
    const g = this.game!;
    const el = h(
      'div',
      { class: 'modal levelup shrine' },
      h('div', { class: 'lu-head' }, h('div', { class: 'lu-title' }, 'SHRINE'), h('div', { class: 'lu-sub' }, 'The old light offers a blessing. Choose one.')),
      h('div', { class: 'cards' }, choices.map((o, i) => this.offerCard(o, () => {
        this.closeModal();
        g.chooseShrine(o);
      }, i === 0, String(i + 1)))),
    );
    this.openModal(el, null, null, 0.35);
  }

  bossIntro(name: string, title: string, main: boolean, color: number): void {
    const el = h('div', { class: `boss-intro ${main ? 'main' : ''}`, style: `--c:${css(color)}` }, h('div', { class: 'bi-band' }, h('div', { class: 'bi-kicker' }, main ? 'MAIN BOSS' : 'MINI-BOSS'), h('div', { class: 'bi-name' }, name), h('div', { class: 'bi-title' }, title)));
    this.overlayEl.appendChild(el);
    setTimeout(() => el.remove(), main ? 3200 : 2600);
  }

  banner(text: string, sub = '', color = '#59f3ff'): void {
    const b = this.bannerEl;
    b.replaceChildren(h('div', { class: 'banner-text' }, text), ...(sub ? [h('div', { class: 'banner-sub' }, sub)] : []));
    b.style.setProperty('--c', color);
    b.classList.remove('hidden', 'show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  edgePulse(color: string, strength: number): void {
    const s = save.data.settings.effects === 'reduced' ? strength * 0.5 : strength;
    this.edgeEl.style.setProperty('--c', color);
    this.edgeEl.animate([{ opacity: Math.min(1, s) }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
  }

  multi(n: number, label: string): void {
    // keep the bigger number on screen if several land at once
    const now = performance.now();
    if (now - this.multiT < 350 && n < this.multiBest) return;
    this.multiBest = n;
    this.multiT = now;
    const el = this.multiEl;
    el.className = `multi ${n >= 25 ? 'huge' : n >= 15 ? 'big' : ''}`;
    el.replaceChildren(h('b', null, `×${n}`), h('span', null, label));
    void el.offsetWidth;
    el.classList.add('show');
  }

  toast(text: string, color = '#c3ccd6'): void {
    if (!text) return;
    const last = this.toastEl.lastElementChild as HTMLElement | null;
    if (last && last.textContent === text) return;
    const t = h('div', { class: 'toast', style: `--c:${color}` }, text);
    this.toastEl.appendChild(t);
    while (this.toastEl.children.length > 3) this.toastEl.firstElementChild!.remove();
    setTimeout(() => t.remove(), 2200);
  }

  pause(): void {
    const g = this.game!;
    this.input.clearEdges();
    const resume = () => {
      this.closeModal();
      g.resume();
    };
    const statsList = h(
      'div',
      { class: 'stat-grid small' },
      STAT_KEYS.map((k) => h('div', { class: 'stat' }, h('span', null, STAT_LABELS[k]), h('b', null, formatStat(k, g.stats[k])))),
    );
    const build = h(
      'div',
      { class: 'build-list' },
      g.build.weapons.map((w) => h('div', { class: 'bl' }, this.icon(`w_${w.id}`), h('span', null, WEAPONS[w.id].name), h('b', null, WEAPONS[w.id].evolved ? '★' : `LV ${w.level}`))),
      g.build.passives.map((p) => h('div', { class: 'bl' }, this.icon(`p_${p.id}`), h('span', null, PASSIVES[p.id].name), h('b', null, `LV ${p.level}`))),
      h('div', { class: 'bl' }, this.icon(`s_${g.build.spell}`), h('span', null, SPELLS[g.build.spell].name), h('b', null, 'SPELL')),
    );
    const showMain = () => {
      const el = h(
        'div',
        { class: 'modal pause' },
        h(
          'div',
          { class: 'panel' },
          h('h2', null, 'Paused'),
          h('div', { class: 'pause-cols' }, h('div', null, h('h3', null, 'Build'), build), h('div', null, h('h3', null, 'Stats'), statsList)),
          h('div', { class: 'row center' }, this.btn('Resume', resume, 'primary', { 'data-autofocus': true }), this.btn('Settings', () => showSettings()), this.btn('Quit run', () => {
            this.closeModal();
            g.quit();
          }, 'danger')),
        ),
      );
      this.openModal(el, resume, null, 0.2);
    };
    const showSettings = () => {
      const el = h('div', { class: 'modal pause' }, this.settingsPanel(showMain, true));
      this.openModal(el, showMain, null, 0.2);
    };
    showMain();
  }

  /** what a first story clear of a chapter opens up */
  private unlockNotes(chapter: number): HTMLElement[] {
    const notes: HTMLElement[] = [];
    if (chapter === 1) notes.push(h('div', { class: 'unlock' }, '★ Endless mode unlocked'), h('div', { class: 'unlock green' }, '★ Hidden skin unlocked: Sprout'));
    else notes.push(h('div', { class: 'unlock' }, `★ Endless unlocked on ${MAPS[MAP_ORDER[chapter - 1]].name}`));
    const next = MAP_ORDER.map((id) => MAPS[id]).find((m) => m.chapter === chapter + 1);
    if (next) {
      const roman = ROMAN[next.chapter - 1];
      notes.push(next.available ? h('div', { class: 'unlock' }, `★ Chapter ${roman} unlocked — ${next.name}`) : h('div', { class: 'unlock dim' }, `Chapter ${roman} — ${next.name} — arrives in a later update`));
    } else notes.push(h('div', { class: 'unlock green' }, '★ The swarm is broken. You finished the story!'));
    return notes;
  }

  end(r: RunResult): void {
    const firstClear = r.won && r.mode === 'story' && this.clearedBefore < MAPS[r.map].chapter;
    const show = () => this.results(r, firstClear);
    if (r.won && r.mode === 'story') {
      const notes = firstClear
        ? h('div', { class: 'unlocks' }, this.unlockNotes(MAPS[r.map].chapter))
        : null;
      const finale = MAPS[r.map].chapter === MAP_ORDER.length;
      const afterStory = finale ? () => this.storyCard(EPILOGUE, 'Continue', () => this.credits(show)) : show;
      setTimeout(() => this.storyCard(MAPS[r.map].storyAfter, finale ? 'Continue' : 'See results', afterStory, notes), 1400);
    } else setTimeout(show, r.won ? 600 : 1200);
  }

  // ================================================================ progression UI
  private masteryRow(character: string, openTree: () => void): HTMLElement {
    const m = getMastery(character);
    const pts = availablePoints(m, treeFor(character));
    const need = masteryXpToNext(m.level);
    return h(
      'div',
      { class: 'mastery-row' },
      h('div', { class: 'mr-lv' }, h('span', null, 'Mastery'), h('b', null, `LV ${m.level}`)),
      h('div', { class: 'mr-bar' }, h('i', { style: `width:${Math.min(100, (m.xp / need) * 100).toFixed(1)}%` }), h('span', null, `${Math.floor(m.xp)} / ${need} XP`)),
      this.btn(pts > 0 ? `Skill tree · ${pts} point${pts === 1 ? '' : 's'}` : 'Skill tree', openTree, pts > 0 ? 'small glow' : 'small'),
    );
  }

  private showSkillTree(character: string, back: () => void): void {
    const tree = treeFor(character);
    const m = getMastery(character);
    const c = CHARACTERS[character];
    const body = h('div', { class: 'tree' });
    const head = h('div', { class: 'tree-head' });
    const render = () => {
      const pts = availablePoints(m, tree);
      const need = masteryXpToNext(m.level);
      head.replaceChildren(
        h('div', { class: 'th-lv' }, h('span', null, `${c.name} mastery`), h('b', null, `LV ${m.level}`)),
        h('div', { class: 'mr-bar wide' }, h('i', { style: `width:${Math.min(100, (m.xp / need) * 100).toFixed(1)}%` }), h('span', null, `${Math.floor(m.xp)} / ${need} XP to next level`)),
        h('div', { class: `th-pts ${pts > 0 ? 'has' : ''}` }, h('b', null, String(pts)), h('span', null, pts === 1 ? 'point to spend' : 'points to spend')),
      );
      body.replaceChildren(
        ...(Object.keys(branchesFor(character)) as Branch[]).map((br) => {
          const info = branchesFor(character)[br];
          return h(
            'div',
            { class: 'branch', style: `--c:${info.color}` },
            h('div', { class: 'br-head' }, h('b', null, info.name), h('span', null, info.desc)),
            tree.filter((n) => n.branch === br).map((n) => {
              const rank = m.ranks[n.id] ?? 0;
              const unlocked = isNodeUnlocked(m, n);
              const maxed = rank >= n.maxRank;
              const can = canRankUp(m, tree, n.id);
              const req = n.requires ? tree.find((x) => x.id === n.requires!.id) : null;
              return h(
                'button',
                {
                  class: `node ${maxed ? 'maxed' : ''} ${unlocked ? '' : 'locked'} ${can ? 'can' : ''} ${rank > 0 ? 'some' : ''}`,
                  'data-nav': true,
                  onclick: () => {
                    if (rankUp(m, tree, n.id)) {
                      audio.play('levelup', { vol: 0.5 });
                      save.write();
                      render();
                    } else {
                      audio.play('click');
                      this.toast(maxed ? `${n.name} is maxed` : !unlocked && req ? `Needs ${req.name} rank ${n.requires!.rank}` : `Needs ${n.cost} point${n.cost === 1 ? '' : 's'}`, info.color);
                    }
                  },
                },
                h('div', { class: 'nd-top' }, h('b', null, n.name), h('span', { class: 'nd-rank' }, `${rank} / ${n.maxRank}`)),
                h('div', { class: 'nd-desc' }, `${n.desc} per rank`),
                h('div', { class: 'nd-pips' }, Array.from({ length: n.maxRank }, (_, i) => h('i', { class: i < rank ? 'on' : '' }))),
                h('div', { class: 'nd-foot' }, maxed ? 'MAXED' : !unlocked && req ? `Needs ${req.name} ${n.requires!.rank}` : `${n.cost} point${n.cost === 1 ? '' : 's'}`),
              );
            }),
          );
        }),
      );
    };
    render();
    const refund = this.btn('Refund all points (free)', () => {
      if (!spentPoints(m, tree)) return;
      refundAll(m);
      save.write();
      audio.play('coin');
      this.toast('All points refunded', '#59f3ff');
      render();
    }, 'small');
    const el = h(
      'div',
      { class: 'screen select' },
      h('div', { class: 'panel wide tall' }, h('h2', null, 'Skill tree'), head, h('div', { class: 'scroll' }, body, h('div', { class: 'hint' }, 'Mastery XP comes from the XP you collect in runs, with a bonus for clearing a chapter. Each level is one point. Refunds are free.')), h('div', { class: 'row end' }, refund, this.btn('Back', back, 'primary'))),
    );
    this.showScreen(el, back);
  }

  private showArmory(): void {
    const list = h('div', { class: 'armory' });
    const weapons = h('div', { class: 'armory weapons' });
    const bal = h('div', { class: 'shards' });
    const render = () => {
      const owned = save.data.meta.weapons;
      weapons.replaceChildren(
        ...LOCKED_WEAPON_IDS.map((id) => {
          const w = WEAPONS[id];
          const u = WEAPON_UNLOCKS[id];
          const has = owned.includes(id);
          const afford = save.data.meta.shards >= u.shards;
          return h(
            'div',
            { class: `arm weapon ${has ? 'maxed' : 'locked'}` },
            this.icon(`w_${id}`, 'arm-icon'),
            h('div', { class: 'arm-text' }, h('b', null, w.name), h('span', null, has ? w.desc : `${w.desc} ${sourceOf(id) ? `Free with “${sourceOf(id)!.name}”.` : ''}`)),
            this.btn(has ? 'Unlocked' : `${u.shards} shards`, () => {
              const next = buyWeapon(owned, save.data.meta.shards, id);
              if (next === null) {
                this.toast(has ? 'Already unlocked' : `Need ${u.shards - save.data.meta.shards} more shards`, '#ffc94d');
                return;
              }
              save.data.meta.shards = next;
              save.write();
              audio.play('evolve', { vol: 0.5 });
              this.toast(`${w.name} joins the weapon pool`, css(w.color));
              render();
            }, afford && !has ? 'small primary' : 'small', has ? { disabled: true } : {}),
          );
        }),
      );
      bal.replaceChildren(h('img', { class: 'px', src: this.a.icons.i_star, alt: '' }), h('b', null, String(save.data.meta.shards)), h('span', null, 'Star Shards'));
      list.replaceChildren(
        ...ARMORY.map((it) => {
          const r = save.data.meta.armory[it.id] ?? 0;
          const maxed = r >= it.maxRank;
          const cost = armoryCost(it, r);
          const afford = save.data.meta.shards >= cost;
          return h(
            'div',
            { class: `arm ${maxed ? 'maxed' : ''}` },
            h('div', { class: 'arm-text' }, h('b', null, it.name), h('span', null, `${it.desc} per rank`), h('div', { class: 'nd-pips' }, Array.from({ length: it.maxRank }, (_, i) => h('i', { class: i < r ? 'on' : '' })))),
            this.btn(maxed ? 'Maxed' : `${cost} shards`, () => {
              const next = buyArmory(save.data.meta.armory, save.data.meta.shards, it.id);
              if (next === null) {
                this.toast(maxed ? 'Already maxed' : `Need ${cost - save.data.meta.shards} more shards`, '#ffc94d');
                return;
              }
              save.data.meta.shards = next;
              save.write();
              audio.play('levelup', { vol: 0.5 });
              render();
            }, afford && !maxed ? 'small primary' : 'small', maxed ? { disabled: true } : {}),
          );
        }),
      );
    };
    render();
    const el = h(
      'div',
      { class: 'screen select' },
      h('div', { class: 'panel wide tall' }, h('h2', null, 'Armory'), bal, h('div', { class: 'hint left' }, 'Upgrades here apply to every hero. Earn Star Shards from coins you have left at the end of a run (10 coins = 1 shard), from kills, and from clearing chapters.'), h('div', { class: 'scroll' }, h('h3', null, 'Upgrades'), list, h('h3', null, 'Weapons'), h('div', { class: 'hint left' }, 'Only the starter weapons (and your hero’s own) can turn up in runs at first. Unlock the rest here, or for free with the achievement named on each.'), weapons), h('div', { class: 'row end' }, this.btn('Back', () => this.showMenu(), 'primary'))),
    );
    this.showScreen(el, () => this.showMenu());
  }

  private progressBlock(r: RunResult): HTMLElement {
    const p = r.progress;
    const ups = p.levelAfter - p.levelBefore;
    return h(
      'div',
      { class: 'progress' },
      h('div', { class: 'pg' }, h('span', null, `${CHARACTERS[r.character].name} mastery`), h('b', null, `+${p.masteryXp} XP`), h('em', null, ups > 0 ? `LV ${p.levelBefore} → ${p.levelAfter} · +${ups} skill point${ups === 1 ? '' : 's'}` : `LV ${p.levelAfter}`)),
      h('div', { class: 'pg' }, h('span', null, 'Star Shards'), h('b', null, `+${p.shards}`), h('em', null, `${p.coinsLeft} leftover coins converted${p.cache ? ` · +${p.cache.shards} from the Victory Cache` : ''}`)),
    );
  }

  shop(items: ShopItem[]): void {
    const g = this.game!;
    const el = h('div', { class: 'modal shop' });
    const leave = () => {
      this.closeModal();
      g.closeShop();
    };
    const render = () => {
      el.replaceChildren(
        h('div', { class: 'lu-head' }, h('div', { class: 'lu-title shop-title' }, 'SALVAGE SHOP'), h('div', { class: 'lu-sub coins-line' }, this.icon('i_coin'), `${g.coins} coins`)),
        h(
          'div',
          { class: 'shop-grid' },
          items.map((it, i) => {
            // the build may have changed since the drone rolled its stock
            if (it.kind === 'upgrade' && it.offer && !it.sold && !g.offerStillValid(it.offer)) it.sold = true;
            const afford = g.coins >= it.price;
            let card: HTMLElement;
            if (it.kind === 'upgrade' && it.offer) card = this.offerCard(it.offer, () => buy(i));
            else {
              const info = it.kind === 'heal' ? { icon: 'i_food', name: 'Field Kit', tag: 'HEAL', line: 'Restore all your HP', c: '#7dff8a' } : it.kind === 'rerolls' ? { icon: 'i_star', name: 'Fate Pack', tag: 'REROLLS', line: '+2 rerolls and +1 banish', c: '#59f3ff' } : { icon: 'i_chest', name: 'Sealed Cache', tag: 'CHEST', line: 'An Epic-or-better chest (opens when you leave)', c: '#c46dff' };
              card = h(
                'button',
                { class: 'card shop-card', 'data-nav': true, style: `--rc:${info.c};--ic:${info.c}`, onclick: () => buy(i) },
                h('div', { class: 'card-rarity' }, info.tag),
                h('div', { class: 'card-icon' }, this.icon(info.icon)),
                h('div', { class: 'card-name' }, info.name),
                h('div', { class: 'card-lines' }, h('p', null, info.line)),
              );
            }
            card.classList.toggle('sold', it.sold);
            card.classList.toggle('poor', !afford && !it.sold);
            card.appendChild(h('div', { class: `price ${afford ? 'ok' : 'no'}` }, it.sold ? 'SOLD' : `${it.price} coins`));
            return card;
          }),
        ),
        h('div', { class: 'row center' }, this.btn('Leave shop', leave, 'primary')),
        h('div', { class: 'hint' }, 'The game is paused while you shop · prices rise each breather'),
      );
    };
    const buy = (i: number) => {
      const it = items[i];
      if (it.sold) return;
      if (!g.buyShop(i)) {
        audio.play('click');
        this.toast(`Need ${it.price - g.coins} more coins`, '#ffc94d');
        return;
      }
      this.edgePulse('#7dff8a', 0.35);
      render();
      this.nav.focusFirst();
    };
    render();
    this.openModal(el, leave, null, 0.3);
  }

  private results(r: RunResult, firstClear: boolean): void {
    const s = r.stats;
    const totalDmg = Object.values(s.damageByWeapon).reduce((a, b) => a + b, 0) || 1;
    const dmgRows = Object.entries(s.damageByWeapon).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, v]) => {
      const col = WEAPONS[id] ? css(WEAPONS[id].color) : '#8a93a8';
      return h('div', { class: 'dmg-row', style: `--c:${col}` }, WEAPONS[id] ? this.icon(`w_${id}`) : h('span', { class: 'noicon' }), h('span', { class: 'dn' }, sourceName(id)), h('div', { class: 'dbar' }, h('i', { style: `width:${((v / totalDmg) * 100).toFixed(1)}%` })), h('b', null, `${((v / totalDmg) * 100).toFixed(1)}%`));
    });
    // DPS sparkline
    const pts = s.dpsSamples.length ? s.dpsSamples : [0];
    const maxD = Math.max(1, ...pts);
    const W = 300, H = 70;
    const poly = pts.map((v, i) => `${pts.length === 1 ? 0 : (i / (pts.length - 1)) * W},${H - (v / maxD) * (H - 6) - 3}`).join(' ');
    const spark = h('div', { class: 'spark', html: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${poly}" fill="none" stroke="#59f3ff" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>` });
    const kills = Object.entries(s.killsByType).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([n, v]) => h('div', { class: 'rec-row' }, h('span', null, n), h('b', null, String(v))));
    const fresh = syncHeroUnlocks();
    if (fresh.length) {
      audio.play('record');
      this.banner('NEW HERO UNLOCKED', fresh.map((id) => CHARACTERS[id].name).join(' · '), css(CHARACTERS[fresh[0]].glow));
    }
    const heroNotes = fresh.map((id) => h('div', { class: 'res-hero', style: `--c:${css(CHARACTERS[id].glow)}` }, this.icon(`hero_${id}`), h('div', null, h('b', null, `New hero: ${CHARACTERS[id].name}`), h('span', null, `${CHARACTERS[id].title} · ${CHARACTERS[id].passiveName}`))));
    const title = r.mode === 'story' ? (r.won ? 'VICTORY' : 'FALLEN') : 'SURVIVED';
    const sub = r.mode === 'story' ? (r.overtime > 0 ? `${MAPS[r.map].name} · Overtime ${formatTime(r.overtime)} · ${r.overtimeBosses} great boss${r.overtimeBosses === 1 ? '' : 'es'}` : MAPS[r.map].name) : `${formatTime(r.time)} on ${MAPS[r.map].name}`;
    const el = h(
      'div',
      { class: `modal results ${r.won ? 'won' : ''}` },
      h(
        'div',
        { class: 'panel wide tall' },
        h('div', { class: 'res-head' }, COSMETIC_BY_ID[r.banner] && r.banner !== 'banner_none' ? h('div', { class: 'res-banner' }, COSMETIC_BY_ID[r.banner].name) : null, h('div', { class: 'res-title' }, title), h('div', { class: 'res-sub' }, sub), r.tags.length ? h('div', { class: 'res-tags' }, r.tags.map((t) => h('span', null, t))) : null, r.newRecord ? h('div', { class: 'res-record' }, 'NEW RECORD!') : null, firstClear ? h('div', { class: 'res-record green' }, 'CHAPTER CLEARED') : null, ...heroNotes),
        h(
          'div',
          { class: 'scroll' },
          h(
            'div',
            { class: 'stat-grid' },
            [
              ['Time', formatTime(r.time)],
              ['Kills', String(s.kills)],
              ['Level', String(r.level)],
              ['Best streak', String(s.maxStreak)],
              ['Biggest hit', s.biggestHit.value > 0 ? `${Math.round(s.biggestHit.value)} · ${sourceName(s.biggestHit.weapon)}` : '—'],
              ['Coins', `${s.coinsEarned} earned · ${s.coinsSpent} spent`],
            ].map(([k, v]) => h('div', { class: 'stat' }, h('span', null, k), h('b', null, v))),
          ),
          this.progressBlock(r),
          h('div', { class: 'res-cols' }, h('div', null, h('h3', null, 'Damage by weapon'), dmgRows), h('div', null, h('h3', null, 'DPS over time'), spark, h('div', { class: 'dim small' }, `Peak ${Math.round(maxD)} DPS · sampled every 5s`))),
          h(
            'div',
            { class: 'res-cols' },
            h('div', null, h('h3', null, 'Kills by enemy'), kills.length ? kills : h('div', { class: 'dim' }, 'None')),
            h(
              'div',
              null,
              h('h3', null, 'Chests by rarity'),
              h('div', { class: 'chest-pips' }, RARITIES.map((rr, i) => h('div', { class: 'pip', style: `--c:${RARITY_INFO[rr].css}` }, h('b', null, String(s.chestsByRarity[i])), h('span', null, RARITY_INFO[rr].label)))),
              h('h3', null, 'Boss kill times'),
              s.bossTimes.length ? s.bossTimes.map((b) => h('div', { class: 'rec-row' }, h('span', null, b.name), h('b', null, formatTime(b.time)))) : h('div', { class: 'dim' }, 'No bosses defeated'),
            ),
          ),
          h('div', { class: 'seed' }, `Seed ${seedToCode(r.seed)}`),
        ),
        h('div', { class: 'row end' }, this.btn('Main menu', () => this.showMenu()), this.btn(r.mode === 'story' && r.won ? 'Play again' : 'Try again', () => this.lastOpts && this.startRun({ ...this.lastOpts, seed: undefined }), 'primary', { 'data-autofocus': true })),
      ),
    );
    this.openModal(el, () => this.showMenu(), null, 0.8);
  }
}
