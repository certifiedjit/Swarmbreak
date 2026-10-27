import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHARACTERS, CHARACTER_IDS } from '../src/data/characters';
import { SPELLS } from '../src/data/spells';
import { WEAPONS } from '../src/data/weapons';
import { loadSave } from '../src/core/save';
import {
  FORTUNE, HERO_UNLOCKS, PYRE, RIVEN, VOIDCALLER, chestCostMult, fortuneBurstChance, fortuneBurstDamage, freeRerollsPerLevel, glintShotCrits,
  heroDamageMult, newlyUnlocked, pyreRage, pyreTrailDamage, rivenMaxTurrets, rivenShouldDeploy, rivenStillDelay, spellCooldownMult,
  unlockProgress, voidcallerRaiseChance, type UnlockStats,
} from '../src/systems/heroes';
import { SKILL_TREES, branchesFor, masteryBonus, newMastery, rankUp } from '../src/systems/mastery';

describe('Glint — Afterimage', () => {
  it('every 3rd projectile is a guaranteed crit', () => {
    const crits = Array.from({ length: 12 }, (_, i) => i + 1).filter(glintShotCrits);
    expect(crits).toEqual([3, 6, 9, 12]);
    expect(glintShotCrits(0)).toBe(false);
  });
});

describe('Voidcaller — Binding', () => {
  it('raises spirits more often with the signature node', () => {
    expect(voidcallerRaiseChance(0)).toBeCloseTo(VOIDCALLER.raiseChance);
    expect(voidcallerRaiseChance(2)).toBeCloseTo(VOIDCALLER.raiseChance + 2 * VOIDCALLER.raisePerPower);
  });

  it('only Void Pact cools down faster, and only for the Voidcaller', () => {
    expect(spellCooldownMult('voidcaller', 'void_pact')).toBe(VOIDCALLER.pactCooldown);
    expect(spellCooldownMult('voidcaller', 'nova_burst')).toBe(1);
    expect(spellCooldownMult('warden', 'void_pact')).toBe(1);
  });
});

describe('Riven — Overbuilt', () => {
  it('deploys after standing still, then again every few seconds', () => {
    expect(rivenShouldDeploy(0.5, 0, 99, 0)).toBe(false);
    expect(rivenShouldDeploy(RIVEN.stillDelay, 0, 0, 0)).toBe(true);
    expect(rivenShouldDeploy(3, 1, 1, 0)).toBe(false);
    expect(rivenShouldDeploy(6, 1, RIVEN.redeploy, 0)).toBe(true);
  });

  it('the signature node deploys sooner and allows more turrets', () => {
    expect(rivenStillDelay(2)).toBeLessThan(rivenStillDelay(0));
    expect(rivenShouldDeploy(0.5, 0, 0, 2)).toBe(true);
    expect(rivenMaxTurrets(2)).toBe(RIVEN.maxTurrets + 2);
  });

  it('hits elites, minis and bosses harder', () => {
    expect(heroDamageMult('riven', 1, 'normal')).toBe(1);
    for (const k of ['elite', 'mini', 'boss'] as const) expect(heroDamageMult('riven', 1, k)).toBe(RIVEN.bigDamage);
  });
});

describe('Fortune — Loaded Dice', () => {
  it('cheaper chests and a free reroll per level, only for Fortune', () => {
    expect(chestCostMult('fortune')).toBe(FORTUNE.chestCost);
    expect(chestCostMult('warden')).toBe(1);
    expect(freeRerollsPerLevel('fortune')).toBe(1);
    expect(freeRerollsPerLevel('glint')).toBe(0);
  });

  it('coin bursts get likelier and stronger', () => {
    expect(fortuneBurstChance(1)).toBeGreaterThan(fortuneBurstChance(0));
    expect(fortuneBurstDamage(20)).toBeGreaterThan(fortuneBurstDamage(1));
  });
});

describe('Pyre — Kindling', () => {
  it('damage rises as HP falls', () => {
    expect(pyreRage(1)).toBe(1);
    expect(pyreRage(0.5)).toBeCloseTo(1 + PYRE.maxRage / 2);
    expect(pyreRage(0)).toBeCloseTo(1 + PYRE.maxRage);
    expect(pyreRage(1.5)).toBe(1);
    expect(heroDamageMult('pyre', 0.25, 'boss')).toBeCloseTo(pyreRage(0.25));
  });

  it('the trail scales with level and the signature node', () => {
    expect(pyreTrailDamage(10, 0)).toBeGreaterThan(pyreTrailDamage(1, 0));
    expect(pyreTrailDamage(1, 2)).toBeCloseTo(pyreTrailDamage(1, 0) * (1 + 2 * PYRE.trailPerPower));
  });

  it('other heroes get no damage multiplier', () => {
    expect(heroDamageMult('warden', 0.1, 'boss')).toBe(1);
    expect(heroDamageMult('glint', 0.1, 'elite')).toBe(1);
  });
});

describe('hero unlocks', () => {
  const none: UnlockStats = { chaptersCleared: 0, totalKills: 0, chestsOpened: 0, longestEndless: 0 };

  it('every hero has an unlock rule and only the Warden starts unlocked', () => {
    for (const id of CHARACTER_IDS) expect(HERO_UNLOCKS[id], id).toBeDefined();
    expect(CHARACTER_IDS.filter((id) => unlockProgress(id, none).done)).toEqual(['warden']);
  });

  it('shows progress like "3,120 / 5,000 kills"', () => {
    expect(unlockProgress('voidcaller', { ...none, totalKills: 3120 }).text).toBe('3,120 / 5,000 kills');
    expect(unlockProgress('fortune', { ...none, chestsOpened: 37 }).text).toBe('37 / 100 chests');
    expect(unlockProgress('pyre', { ...none, longestEndless: 380 }).text).toBe('Best 6:20 / 15:00 in Endless');
    expect(unlockProgress('glint', none).text).toBe('Chapter 1 not cleared yet');
  });

  it('progress caps at the goal', () => {
    const p = unlockProgress('voidcaller', { ...none, totalKills: 99999 });
    expect(p).toMatchObject({ have: 5000, need: 5000, done: true });
  });

  it('each condition unlocks its hero', () => {
    expect(unlockProgress('glint', { ...none, chaptersCleared: 1 }).done).toBe(true);
    expect(unlockProgress('riven', { ...none, chaptersCleared: 1 }).done).toBe(false);
    expect(unlockProgress('riven', { ...none, chaptersCleared: 2 }).done).toBe(true);
    expect(unlockProgress('voidcaller', { ...none, totalKills: 4999 }).done).toBe(false);
    expect(unlockProgress('voidcaller', { ...none, totalKills: 5000 }).done).toBe(true);
    expect(unlockProgress('fortune', { ...none, chestsOpened: 100 }).done).toBe(true);
    expect(unlockProgress('pyre', { ...none, longestEndless: 899 }).done).toBe(false);
    expect(unlockProgress('pyre', { ...none, longestEndless: 900 }).done).toBe(true);
  });

  it('newlyUnlocked only reports heroes not yet celebrated', () => {
    const s = { ...none, chaptersCleared: 2, totalKills: 6000 };
    expect(newlyUnlocked(CHARACTER_IDS, s, [])).toEqual(['glint', 'voidcaller', 'riven']);
    expect(newlyUnlocked(CHARACTER_IDS, s, ['glint', 'voidcaller'])).toEqual(['riven']);
  });
});

describe('hero roster', () => {
  it('all six heroes are playable with a real start weapon and spell', () => {
    for (const id of CHARACTER_IDS) {
      const c = CHARACTERS[id];
      expect(c.available, id).toBe(true);
      expect(WEAPONS[c.startWeapon], c.startWeapon).toBeDefined();
      expect(WEAPONS[c.startWeapon].evolved, c.startWeapon).toBeFalsy();
      expect(SPELLS[c.startSpell], c.startSpell).toBeDefined();
    }
  });
});

describe('skill trees', () => {
  const shape = (id: string) => SKILL_TREES[id].map((n) => `${n.branch}:${n.maxRank}x${n.cost}:${n.requires ? n.requires.rank : '-'}`);

  for (const id of CHARACTER_IDS) {
    describe(id, () => {
      const tree = SKILL_TREES[id];

      it('has 12 nodes in the same shape and costs as the Warden', () => {
        expect(tree).toHaveLength(12);
        expect(shape(id)).toEqual(shape('warden'));
      });

      it('has unique ids and requirements inside its own branch', () => {
        expect(new Set(tree.map((n) => n.id)).size).toBe(12);
        for (const n of tree) {
          if (!n.requires) continue;
          const req = tree.find((x) => x.id === n.requires!.id);
          expect(req, `${n.id} requires ${n.requires.id}`).toBeDefined();
          expect(req!.branch).toBe(n.branch);
        }
      });

      it('names its three branches', () => {
        const b = branchesFor(id);
        expect(Object.keys(b).sort()).toEqual(['bulwark', 'oath', 'salvage']);
      });

      if (id !== 'warden') {
        it('has one signature node that strengthens the passive', () => {
          const sig = tree.filter((n) => n.perRank.perks?.passive);
          expect(sig).toHaveLength(1);
          const m = newMastery();
          m.level = 40;
          for (const n of tree) while (rankUp(m, tree, n.id)) { /* max everything */ }
          expect(masteryBonus(m, tree).passive).toBe(sig[0].maxRank);
        });
      }
    });
  }
});

describe('old saves', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a save from before the hero update loads, with unlock stats filled in', () => {
    const old = {
      version: 1,
      progress: { chaptersCleared: 1 },
      stats: { totalKills: 4200, chestsOpened: 12, runs: 9, bossesKilled: 3, playTime: 5000, bestStreak: 80 },
      bests: { graveyard: { warden: { time: 640, kills: 900, date: 1 } }, cathedral: { warden: { time: 410, kills: 500, date: 2 } } },
      skins: { unlocked: ['default', 'sprout'], equipped: {} },
    };
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(old), setItem: () => undefined, removeItem: () => undefined });
    const d = loadSave();
    expect(d.heroes.unlocked).toEqual([]);
    expect(d.stats.longestEndless).toBe(640);
    expect(d.stats.totalKills).toBe(4200);
    expect(d.progress.chaptersCleared).toBe(1);
    expect(d.meta.mastery).toEqual({});
  });

  it('keeps a recorded longestEndless', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ stats: { longestEndless: 1000 }, heroes: { unlocked: ['glint'] } }), setItem: () => undefined, removeItem: () => undefined });
    const d = loadSave();
    expect(d.stats.longestEndless).toBe(1000);
    expect(d.heroes.unlocked).toEqual(['glint']);
  });
});
