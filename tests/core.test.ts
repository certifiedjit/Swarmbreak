import { describe, expect, it } from 'vitest';
import { Rng, codeToSeed, seedToCode } from '../src/core/rng';
import { SpatialHash } from '../src/core/spatialHash';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(5);
    const b = new Rng(5);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('seed codes round-trip', () => {
    for (const s of [0, 1, 123456789, 0xffffffff, 42424242]) expect(codeToSeed(seedToCode(s))).toBe(s >>> 0);
    expect(codeToSeed('nope')).toBeNull();
  });
});

describe('SpatialHash', () => {
  it('finds nearby ids and not far ones', () => {
    const h = new SpatialHash(1000, 1000, 50);
    h.insert(0, 100, 100);
    h.insert(1, 120, 110);
    h.insert(2, 900, 900);
    const out: number[] = [];
    h.query(110, 105, 30, out);
    expect(out.sort()).toEqual([0, 1]);
  });

  it('big entities are found from any overlapping cell, without duplicates', () => {
    const h = new SpatialHash(1000, 1000, 40);
    h.insert(7, 500, 500, 120);
    const out: number[] = [];
    h.query(610, 500, 5, out);
    expect(out).toEqual([7]);
    h.query(500, 500, 200, out);
    expect(out).toEqual([7]);
  });
});
