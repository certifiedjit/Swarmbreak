import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTER_IDS } from '../src/data/characters';
import { COSMETICS, COSMETIC_BY_ID, COSMETIC_KINDS, cosmeticsFor, defaultLoadout } from '../src/data/cosmetics';
import { WEAPONS } from '../src/data/weapons';
import { defaultSave, loadSave, save } from '../src/core/save';
import { achContext, cosmeticUnlocked, equipCosmetic, loadoutFor, syncAchievements } from '../src/core/meta';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, achievementProgress, newlyDone, sourceOf, type AchContext } from '../src/systems/achievements';
import { LOCKED_WEAPON_IDS, WEAPON_UNLOCKS } from '../src/systems/weaponUnlocks';

const blank = (): AchContext => achContext();

describe('achievement data', () => {
  it('has 30+ achievements with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('every achievement pays out something real', () => {
    for (const a of ACHIEVEMENTS) {
      const r = a.reward;
      expect(!!(r.weapon || r.shards || r.cosmetics?.length), a.id).toBe(true);
      if (r.weapon) expect(WEAPONS[r.weapon], `${a.id} -> ${r.weapon}`).toBeDefined();
      for (const c of r.cosmetics ?? []) expect(COSMETIC_BY_ID[c], `${a.id} -> ${c}`).toBeDefined();
    }
  });

  it('every non-starter cosmetic can be earned', () => {
    for (const c of COSMETICS) if (!c.starter) expect(sourceOf(c.id), c.id).toBeDefined();
  });

  it('every locked weapon can be earned free, and the Armory names the right achievement', () => {
    for (const id of LOCKED_WEAPON_IDS) {
      const a = sourceOf(id);
      expect(a, id).toBeDefined();
      expect(WEAPON_UNLOCKS[id].achievement).toBe(a!.id);
    }
  });

  it('every hero has three skins plus Sprout, and a starter of every kind', () => {
    for (const hero of CHARACTER_IDS) {
      const skins = cosmeticsFor('skin', hero).map((c) => c.id);
      expect(skins).toEqual([`${hero}_default`, `${hero}_ember`, `${hero}_frost`, `${hero}_spectral`, 'sprout']);
      for (const k of Object.values(defaultLoadout(hero))) expect(COSMETIC_BY_ID[k]?.starter, k).toBe(true);
    }
    for (const k of COSMETIC_KINDS) expect(COSMETICS.some((c) => c.kind === k.kind && c.starter), k.kind).toBe(true);
  });

  it('hero mastery 10 is an achievement for every hero', () => {
    for (const hero of CHARACTER_IDS) expect(ACHIEVEMENT_BY_ID[`m10_${hero}`]).toBeDefined();
  });
});

describe('achievement rules', () => {
  beforeEach(() => {
    save.data = defaultSave();
  });

  it('progress caps at the goal', () => {
    const c = { ...blank(), totalKills: 250 };
    expect(achievementProgress(ACHIEVEMENT_BY_ID.first_blood, c)).toEqual({ have: 100, need: 100, done: true });
    expect(achievementProgress(ACHIEVEMENT_BY_ID.kills_1k, c)).toEqual({ have: 250, need: 1000, done: false });
  });

  it('a fresh save has nothing done', () => {
    expect(newlyDone(blank(), {})).toEqual([]);
  });

  it('example conditions', () => {
    const ids = (c: AchContext) => newlyDone(c, {}).map((a) => a.id);
    expect(ids({ ...blank(), bestMulti: 50 })).toEqual(expect.arrayContaining(['cleave_25', 'cleave_50']));
    expect(ids({ ...blank(), tiers: { graveyard: 3, cathedral: 3 } })).toEqual(expect.arrayContaining(['veteran_any', 'nightmare_any']));
    expect(ids({ ...blank(), tiers: { graveyard: 3, cathedral: 3 } })).not.toContain('nightmare_all');
    expect(ids({ ...blank(), longestOvertime: 600 })).toContain('overtime_10');
    expect(ids({ ...blank(), jackpots: 1 })).toContain('jackpot');
    expect(ids({ ...blank(), mastery: { ...blank().mastery, pyre: 10 } })).toEqual(expect.arrayContaining(['m5_pyre', 'm10_pyre']));
    expect(ids({ ...blank(), heroTiers: { glint: 2 } })).toContain('vet_glint');
  });

  it('a mid-run overlay counts this run\'s kills and time', () => {
    const c = achContext({ kills: 120, maxStreak: 0, endless: 610, overtime: 0, threat30: 0, allCurses: 0 });
    expect(c.totalKills).toBe(120);
    expect(c.longestEndless).toBe(610);
  });

  it('syncing pays out once: cosmetics, weapons and shards', () => {
    save.data.stats.totalKills = 12000;
    save.data.stats.chestsOpened = 30;
    const first = syncAchievements().map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['first_blood', 'kills_1k', 'kills_10k', 'chests_25']));
    expect(save.data.meta.weapons).toEqual(expect.arrayContaining(['cryo_shards', 'void_spirits', 'corrosive_flask']));
    expect(save.data.cosmetics.unlocked).toEqual(expect.arrayContaining(['burst_sparks', 'banner_swarmbreaker']));
    expect(syncAchievements()).toEqual([]);
    save.data.codex.evolutions = ['oathbreaker'];
    const shards = save.data.meta.shards;
    expect(syncAchievements().map((a) => a.id)).toEqual(['evolve_1']);
    expect(save.data.meta.shards).toBe(shards + 15);
  });
});

describe('loadouts', () => {
  beforeEach(() => {
    save.data = defaultSave();
  });

  it('locked cosmetics cannot be equipped and fall back to defaults', () => {
    expect(cosmeticUnlocked('warden_ember')).toBe(false);
    expect(equipCosmetic('warden', 'warden_ember')).toBe(false);
    save.data.cosmetics.loadout.warden = { skin: 'warden_ember', trail: 'trail_gold' };
    expect(loadoutFor('warden')).toEqual(defaultLoadout('warden'));
  });

  it('equips per hero, and a hero cannot wear another hero\'s skin', () => {
    save.data.cosmetics.unlocked.push('glint_frost', 'trail_void', 'sprout');
    expect(equipCosmetic('glint', 'glint_frost')).toBe(true);
    expect(equipCosmetic('glint', 'trail_void')).toBe(true);
    expect(loadoutFor('glint')).toMatchObject({ skin: 'glint_frost', trail: 'trail_void' });
    expect(loadoutFor('warden').trail).toBe('trail_default');
    save.data.cosmetics.loadout.warden = { skin: 'glint_frost' };
    expect(loadoutFor('warden').skin).toBe('warden_default');
    expect(equipCosmetic('pyre', 'sprout')).toBe(true);
    expect(loadoutFor('pyre').skin).toBe('sprout');
  });
});

describe('old saves and cosmetics', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('the old Sprout skin carries over, and new stats start at zero', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ skins: { unlocked: ['default', 'sprout'], equipped: { warden: 'sprout' } }, stats: { totalKills: 9 } }), setItem: () => undefined, removeItem: () => undefined });
    const d = loadSave();
    expect(d.cosmetics.unlocked).toContain('sprout');
    expect(d.cosmetics.loadout.warden?.skin).toBe('sprout');
    expect(d.achievements).toEqual({});
    expect(d.stats).toMatchObject({ totalKills: 9, bestMulti: 0, jackpots: 0, longestOvertime: 0 });
    expect(d.progress.heroTiers).toEqual({});
  });
});
