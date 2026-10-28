import { describe, expect, it } from 'vitest';
import { TRACKS } from '../src/audio/music';
import { BOSSES, ENEMIES, MINIBOSSES } from '../src/data/enemies';
import { MAPS, MAP_ORDER } from '../src/data/maps';
import { ENDLESS_UNLOCK, endlessMixWeights } from '../src/systems/endless';

const playable = MAP_ORDER.map((id) => MAPS[id]).filter((m) => m.available);

describe('chapter content', () => {
  it('chapters are numbered in order', () => {
    MAP_ORDER.forEach((id, i) => expect(MAPS[id].chapter).toBe(i + 1));
  });

  for (const m of playable) {
    describe(m.name, () => {
      it('references enemies, bosses and music that exist', () => {
        for (const r of m.rounds) for (const id of Object.keys(r.mix)) expect(ENEMIES[id], id).toBeDefined();
        for (const id of Object.keys(m.endlessMix)) expect(ENEMIES[id], id).toBeDefined();
        for (const id of m.minibosses) expect(MINIBOSSES[id], id).toBeDefined();
        expect(BOSSES[m.boss]).toBeDefined();
        expect(TRACKS[m.music], m.music).toBeDefined();
        expect(TRACKS[m.bossMusic], m.bossMusic).toBeDefined();
      });

      it('has five rounds that get harder', () => {
        expect(m.rounds).toHaveLength(5);
        expect(m.minibosses.length).toBeGreaterThanOrEqual(4);
        for (let i = 1; i < m.rounds.length; i++) {
          expect(m.rounds[i].kills).toBeGreaterThan(m.rounds[i - 1].kills);
          expect(m.rounds[i].hpMult).toBeGreaterThan(m.rounds[i - 1].hpMult);
          expect(m.rounds[i].density).toBeGreaterThan(m.rounds[i - 1].density);
        }
      });

      it('has story cards before and after', () => {
        expect(m.storyBefore.lines.length).toBeGreaterThan(0);
        expect(m.storyAfter.lines.length).toBeGreaterThan(0);
      });

      it('opens Endless with fodder only, and every type arrives within 5 minutes', () => {
        const start = endlessMixWeights(m.endlessMix, 0);
        expect(Object.keys(start).length).toBeGreaterThan(0);
        for (const id of Object.keys(start)) expect(ENDLESS_UNLOCK[id] ?? 0).toBe(0);
        const later = endlessMixWeights(m.endlessMix, 300 + 45);
        expect(Object.keys(later).sort()).toEqual(Object.keys(m.endlessMix).sort());
      });
    });
  }
});

describe('art and the chapter arc', () => {
  it('every enemy, mini-boss and boss has art', async () => {
    const { BOSS_DRAW, ENEMY_DRAW } = await import('../src/render/enemyArt');
    for (const e of Object.values(ENEMIES)) expect(ENEMY_DRAW[e.sprite], e.id).toBeDefined();
    for (const m of Object.values(MINIBOSSES)) expect(ENEMY_DRAW[m.sprite], m.id).toBeDefined();
    for (const b of Object.values(BOSSES)) expect(BOSS_DRAW[b.sprite], b.id).toBeDefined();
  });

  it('each chapter is a step up from the last', () => {
    for (let i = 1; i < playable.length; i++) {
      const a = playable[i - 1].rounds, b = playable[i].rounds;
      expect(b[0].hpMult, playable[i].id).toBeGreaterThan(a[0].hpMult);
      expect(b[4].hpMult, playable[i].id).toBeGreaterThan(a[4].hpMult);
      expect(b[4].kills, playable[i].id).toBeGreaterThan(a[4].kills);
    }
  });

  it('the Hive is the finale; only the Frozen Archive has snow', () => {
    expect(MAP_ORDER[MAP_ORDER.length - 1]).toBe('hive');
    expect(playable.filter((m) => m.snow).map((m) => m.id)).toEqual(['archive']);
  });
});
