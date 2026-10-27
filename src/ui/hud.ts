/**
 * In-run HUD. Built once per run; `update` runs every frame and only touches
 * the DOM when a value changes.
 */
import { formatTime } from '../core/math';
import { save } from '../core/save';
import { PASSIVES, PASSIVE_MAX_LEVEL } from '../data/passives';
import { RARITY_INFO, RARITIES } from '../data/rarity';
import { SPELLS } from '../data/spells';
import { WEAPONS, WEAPON_MAX_LEVEL } from '../data/weapons';
import type { Game } from '../game/game';
import { keyLabel } from '../input/input';
import type { Assets } from '../render/assets';
import { endlessParams } from '../systems/endless';
import { MAX_PASSIVES, MAX_WEAPONS } from '../systems/build';
import { h, setStyle, setText } from './dom';

export class Hud {
  readonly el: HTMLElement;
  private a: Assets;
  private xpFill: HTMLElement;
  private lvl: HTMLElement;
  private hpFill: HTMLElement;
  private hpLag: HTMLElement;
  private hpText: HTMLElement;
  private coins: HTMLElement;
  private kills: HTMLElement;
  private time: HTMLElement;
  private modeLabel: HTMLElement;
  /** tier + active curses */
  private tags: HTMLElement;
  private tagSig = '';
  private meterFill: HTMLElement;
  private meterText: HTMLElement;
  private meterWrap: HTMLElement;
  private threat: HTMLElement;
  private best: HTMLElement;
  private bossWrap: HTMLElement;
  private bossName: HTMLElement;
  private bossTitle: HTMLElement;
  private bossFill: HTMLElement;
  private bossLag: HTMLElement;
  private bossPhase: HTMLElement;
  private slots: HTMLElement;
  private spellBtn: HTMLElement;
  private spellIcon: HTMLImageElement;
  private spellCd: HTMLElement;
  private spellKey: HTMLElement;
  private streak: HTMLElement;
  private streakN: HTMLElement;
  private frenzy: HTMLElement;
  private fps: HTMLElement;
  private chestTip: HTMLElement;
  private buildSig = '';
  private spellId = '';
  private lastStreak = 0;
  private hpLagV = 1;
  private bossLagV = 1;
  private lastThreat = 0;
  private fpsAcc = 0;
  private fpsN = 0;
  fpsValue = 60;

  constructor(a: Assets, onPause: () => void, onSpell: () => void) {
    this.a = a;
    this.xpFill = h('div', { class: 'xp-fill' });
    this.lvl = h('div', { class: 'xp-lvl' }, 'LV 1');
    this.hpFill = h('div', { class: 'hp-fill' });
    this.hpLag = h('div', { class: 'hp-lag' });
    this.hpText = h('div', { class: 'hp-text' });
    this.coins = h('span', null, '0');
    this.kills = h('span', null, '0');
    this.time = h('div', { class: 'hud-time' }, '0:00');
    this.modeLabel = h('div', { class: 'meter-label' });
    this.meterFill = h('div', { class: 'meter-fill' });
    this.meterText = h('div', { class: 'meter-text' });
    this.meterWrap = h('div', { class: 'meter' }, this.meterFill, this.meterText);
    this.threat = h('div', { class: 'threat' });
    this.tags = h('div', { class: 'hud-tags' });
    this.best = h('div', { class: 'best' });
    this.bossName = h('div', { class: 'boss-name' });
    this.bossTitle = h('div', { class: 'boss-title' });
    this.bossFill = h('div', { class: 'boss-fill' });
    this.bossLag = h('div', { class: 'boss-lag' });
    this.bossPhase = h('div', { class: 'boss-phase' });
    this.bossWrap = h('div', { class: 'boss-bar hidden' }, h('div', { class: 'boss-head' }, this.bossName, this.bossPhase), h('div', { class: 'boss-track' }, this.bossLag, this.bossFill), this.bossTitle);
    this.slots = h('div', { class: 'slots' });
    this.spellIcon = h('img', { class: 'px', alt: '' });
    this.spellCd = h('div', { class: 'spell-cd' });
    this.spellKey = h('div', { class: 'spell-key' });
    this.spellBtn = h('button', { class: 'spell-btn no-joy', 'aria-label': 'Cast spell' }, this.spellIcon, this.spellCd, this.spellKey);
    this.spellBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onSpell();
    });
    this.streakN = h('div', { class: 'streak-n' });
    this.streak = h('div', { class: 'streak hidden' }, this.streakN, h('div', { class: 'streak-l' }, 'STREAK'));
    this.frenzy = h('div', { class: 'frenzy hidden' }, 'FRENZY');
    this.fps = h('div', { class: 'fps hidden' });
    this.chestTip = h('div', { class: 'chest-tip hidden' });
    const pause = h('button', { class: 'pause-btn no-joy', 'aria-label': 'Pause', onclick: () => onPause() }, h('span'), h('span'));

    this.el = h(
      'div',
      { class: 'hud' },
      h('div', { class: 'xp' }, this.xpFill),
      h(
        'div',
        { class: 'hud-top' },
        h(
          'div',
          { class: 'hud-left' },
          h('div', { class: 'hp' }, this.hpLag, this.hpFill, this.hpText),
          h('div', { class: 'hud-counts' }, this.lvl, h('span', { class: 'cnt coin' }, h('img', { class: 'px', src: a.icons.i_coin, alt: '' }), this.coins), h('span', { class: 'cnt' }, h('img', { class: 'px', src: a.icons.i_skull, alt: '' }), this.kills)),
        ),
        h('div', { class: 'hud-center' }, this.modeLabel, this.meterWrap, this.threat, this.tags),
        h('div', { class: 'hud-right' }, this.time, this.best, pause),
      ),
      this.bossWrap,
      this.slots,
      this.spellBtn,
      this.streak,
      this.frenzy,
      this.fps,
      this.chestTip,
    );
  }

  private renderSlots(g: Game): void {
    const b = g.build;
    const sig = b.weapons.map((w) => `${w.id}:${w.level}`).join(',') + '|' + b.passives.map((p) => `${p.id}:${p.level}`).join(',');
    if (sig === this.buildSig) return;
    this.buildSig = sig;
    this.slots.replaceChildren();
    const row = (kind: 'w' | 'p') => {
      const r = h('div', { class: 'slot-row' });
      const max = kind === 'w' ? MAX_WEAPONS : MAX_PASSIVES;
      for (let i = 0; i < max; i++) {
        const item = kind === 'w' ? b.weapons[i] : b.passives[i];
        if (!item) {
          r.appendChild(h('div', { class: 'slot empty' }));
          continue;
        }
        const def = kind === 'w' ? WEAPONS[item.id] : PASSIVES[item.id];
        const maxL = kind === 'w' ? (WEAPONS[item.id].evolved ? 1 : WEAPON_MAX_LEVEL) : PASSIVE_MAX_LEVEL;
        const evolved = kind === 'w' && WEAPONS[item.id].evolved;
        r.appendChild(
          h(
            'div',
            { class: `slot ${evolved ? 'evolved' : ''}`, title: def.name, style: `--c:#${def.color.toString(16).padStart(6, '0')}` },
            h('img', { class: 'px', src: this.a.icons[`${kind}_${item.id}`], alt: def.name }),
            h('div', { class: 'slot-lv' }, evolved ? '★' : item.level >= maxL ? 'MAX' : String(item.level)),
          ),
        );
      }
      return r;
    };
    this.slots.append(row('w'), row('p'));
  }

  update(g: Game, dt: number): void {
    const tags = g.difficultyTags();
    const sig = tags.join('|');
    if (sig !== this.tagSig) {
      this.tagSig = sig;
      this.tags.replaceChildren(...tags.map((t) => h('span', null, t)));
    }
    // fps
    this.fpsAcc += dt;
    this.fpsN++;
    if (this.fpsAcc >= 0.5) {
      this.fpsValue = this.fpsN / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsN = 0;
      const show = save.data.settings.showFps;
      this.fps.classList.toggle('hidden', !show);
      if (show) setText(this.fps, `${Math.round(this.fpsValue)} FPS · ${g.enemies.length} foes · ${g.fx.count} fx`);
    }
    // xp + level
    setStyle(this.xpFill, 'transform', `scaleX(${Math.min(1, g.xp / g.xpNext).toFixed(3)})`);
    setText(this.lvl, `LV ${g.level}`);
    // hp
    const hpf = Math.max(0, g.hp / g.stats.maxHp);
    this.hpLagV = hpf > this.hpLagV ? hpf : this.hpLagV + (hpf - this.hpLagV) * Math.min(1, dt * 3);
    setStyle(this.hpFill, 'transform', `scaleX(${hpf.toFixed(3)})`);
    setStyle(this.hpLag, 'transform', `scaleX(${this.hpLagV.toFixed(3)})`);
    setText(this.hpText, `${Math.ceil(g.hp)} / ${Math.round(g.stats.maxHp)}`);
    this.hpFill.classList.toggle('low', hpf < 0.3);
    setText(this.coins, String(g.coins));
    setText(this.kills, String(g.stats_.kills));
    setText(this.time, formatTime(g.time));

    // mode: story meter or endless threat
    if (g.flow) {
      const f = g.flow;
      this.threat.classList.add('hidden');
      this.best.classList.add('hidden');
      this.meterWrap.classList.remove('hidden');
      let label = `ROUND ${f.round} / ${f.totalRounds}`;
      let text = `${f.kills} / ${f.target}`;
      let fill = f.progress;
      let cls = '';
      if (f.phase === 'miniboss') {
        label = `ROUND ${f.round} · MINI-BOSS`;
        text = 'Defeat the elite';
        cls = 'mini';
      } else if (f.phase === 'breather') {
        label = 'BREATHER';
        text = `${Math.ceil(f.breatherLeft)}s`;
        fill = f.breatherLeft / 10;
        cls = 'breather';
      } else if (f.phase === 'boss') {
        label = 'FINAL BOSS';
        text = '';
        cls = 'boss';
      } else if (f.phase === 'victory') {
        label = 'VICTORY';
        text = '';
        cls = 'breather';
      }
      setText(this.modeLabel, label);
      setText(this.meterText, text);
      setStyle(this.meterFill, 'transform', `scaleX(${fill.toFixed(3)})`);
      if (this.meterWrap.dataset.cls !== cls) {
        this.meterWrap.dataset.cls = cls;
        this.meterWrap.className = `meter ${cls}`;
      }
    } else {
      this.meterWrap.classList.add('hidden');
      const p = endlessParams(g.endlessT);
      const ot = g.overtimeAt >= 0;
      setText(this.modeLabel, g.darknessT > 0 ? 'CURSE: DARKNESS' : g.doubleSpeedT > 0 ? 'CURSE: FRENZIED SWARM' : ot ? `OVERTIME · ${formatTime(g.time - g.overtimeAt)} · BOSS IN ${Math.ceil(g.overtimeBossIn)}s` : 'ENDLESS');
      this.threat.classList.remove('hidden');
      setText(this.threat, `THREAT ${p.threat}`);
      if (p.threat !== this.lastThreat) {
        this.lastThreat = p.threat;
        this.threat.classList.remove('tick');
        void this.threat.offsetWidth;
        this.threat.classList.add('tick');
      }
      const rec = ot ? undefined : save.data.bests[g.recordKey()]?.[g.opts.character];
      this.best.classList.toggle('hidden', !rec);
      if (rec) setText(this.best, g.newRecord ? 'NEW RECORD' : `Best ${formatTime(rec.time)}`);
      this.best.classList.toggle('record', g.newRecord);
    }

    // boss bar
    const boss = g.bossActive;
    if (boss && !boss.dead && boss.boss) {
      this.bossWrap.classList.remove('hidden');
      const bf = Math.max(0, boss.hp / boss.maxHp);
      this.bossLagV = bf > this.bossLagV ? bf : this.bossLagV + (bf - this.bossLagV) * Math.min(1, dt * 2.5);
      setStyle(this.bossFill, 'transform', `scaleX(${bf.toFixed(4)})`);
      setStyle(this.bossLag, 'transform', `scaleX(${this.bossLagV.toFixed(4)})`);
      setText(this.bossName, boss.boss.name);
      setText(this.bossTitle, boss.boss.title);
      setText(this.bossPhase, boss.boss.isMain ? `PHASE ${boss.boss.phase + 1}` : boss.shield > 0.2 ? 'SHIELDED' : '');
      this.bossWrap.classList.toggle('main', boss.boss.isMain);
      this.bossWrap.classList.toggle('shielded', boss.shield > 0.2);
    } else {
      this.bossWrap.classList.add('hidden');
      this.bossLagV = 1;
    }

    this.renderSlots(g);

    // spell
    const sp = SPELLS[g.build.spell];
    if (this.spellId !== sp.id) {
      this.spellId = sp.id;
      this.spellIcon.src = this.a.icons[`s_${sp.id}`];
      this.spellBtn.title = `${sp.name}: ${sp.desc}`;
      this.spellBtn.style.setProperty('--c', '#' + sp.color.toString(16).padStart(6, '0'));
    }
    const cdMax = sp.cooldown / Math.min(2, g.stats.attackSpeed * 0.5 + 0.5);
    const cdf = Math.max(0, g.spellCd / cdMax);
    setStyle(this.spellCd, 'background', cdf > 0 ? `conic-gradient(rgba(5,6,10,0.78) ${(cdf * 360).toFixed(1)}deg, transparent 0)` : 'transparent');
    this.spellBtn.classList.toggle('ready', cdf <= 0);
    setText(this.spellKey, document.body.classList.contains('touch') ? '' : keyLabel(save.data.settings.keys.spell[0] ?? 'Space'));

    // streak + frenzy
    const s = g.streak;
    this.streak.classList.toggle('hidden', s < 10);
    if (s !== this.lastStreak) {
      setText(this.streakN, `×${s}`);
      if (Math.floor(s / 25) > Math.floor(this.lastStreak / 25) && s >= 25) {
        this.streak.classList.remove('pop');
        void this.streak.offsetWidth;
        this.streak.classList.add('pop');
      }
      this.lastStreak = s;
    }
    this.frenzy.classList.toggle('hidden', g.frenzy <= 0);

    // chest tooltip
    const f = g.objects.focus;
    if (f && g.modal === 'none') {
      this.chestTip.classList.remove('hidden');
      setStyle(this.chestTip, 'transform', `translate(${Math.round(f.sx)}px, ${Math.round(f.sy)}px) translate(-50%, -100%)`);
      const key = `${f.price}|${f.affordable}|${f.free}|${f.legendary}|${f.victory}|${f.odds.map((o) => o.toFixed(3)).join(',')}`;
      if (this.chestTip.dataset.key !== key) {
        this.chestTip.dataset.key = key;
        this.chestTip.replaceChildren(
          h('div', { class: `ct-price ${f.affordable || f.free ? 'ok' : 'no'}` }, f.victory ? 'VICTORY CACHE' : f.legendary ? 'LEGENDARY CHEST' : f.free ? 'FREE CHEST' : `${f.price} COINS`),
          h('div', { class: `ct-note ${f.victory ? '' : 'hidden'}` }, 'Coins, Star Shards & mastery XP'),
          h(
            'div',
            { class: 'ct-odds' },
            RARITIES.map((r, i) =>
              f.odds[i] > 0.0005 ? h('div', { class: 'ct-row', style: `--c:${RARITY_INFO[r].css}` }, h('span', null, RARITY_INFO[r].label), h('i', { style: `width:${Math.max(2, f.odds[i] * 100)}%` }), h('b', null, `${(f.odds[i] * 100).toFixed(f.odds[i] < 0.1 ? 1 : 0)}%`)) : null,
            ),
          ),
        );
      }
    } else this.chestTip.classList.add('hidden');
  }
}
