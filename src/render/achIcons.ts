/**
 * Achievement badges (20x20): a dark medallion ringed in the achievement's
 * colour with a pixel glyph in the middle. Locked badges are drawn greyed by CSS.
 */
import type { AchIcon } from '../systems/achievements';
import { OUTLINE, Pix, blend, shade } from './pixel';

type Glyph = (p: Pix, c: number, hi: number, dk: number) => void;

const GLYPHS: Record<AchIcon, Glyph> = {
  skull: (p, c, hi, dk) => {
    p.ellipse(10, 9, 4.5, 4, c);
    p.rect(7, 11, 7, 3, c);
    p.rect(7, 8, 2, 2, dk);
    p.rect(11, 8, 2, 2, dk);
    p.set(10, 11, dk);
    p.set(8, 13, dk);
    p.set(10, 13, dk);
    p.set(12, 13, dk);
    p.set(8, 6, hi);
  },
  crown: (p, c, hi, dk) => {
    p.poly([[5, 14], [5, 7], [8, 10], [10, 5], [12, 10], [15, 7], [15, 14]], c);
    p.rect(5, 12, 11, 2, shade(c, 0.75));
    p.set(10, 5, hi);
    p.set(8, 12, dk);
    p.set(12, 12, dk);
  },
  star: (p, c, hi) => {
    p.poly([[10, 3], [12, 8], [17, 8], [13, 11], [15, 16], [10, 13], [5, 16], [7, 11], [3, 8], [8, 8]], c);
    p.set(10, 6, hi);
    p.set(9, 7, hi);
  },
  sword: (p, c, hi, dk) => {
    p.line(5, 15, 14, 6, c);
    p.line(6, 15, 15, 6, hi);
    p.line(4, 12, 8, 16, dk);
    p.rect(3, 15, 3, 2, shade(c, 0.6));
    p.set(15, 5, hi);
  },
  chest: (p, c, hi, dk) => {
    p.rect(4, 8, 12, 8, shade(c, 0.7));
    p.rect(4, 6, 12, 3, c);
    p.rect(4, 10, 12, 1, dk);
    p.rect(9, 9, 2, 3, hi);
  },
  clock: (p, c, hi, dk) => {
    p.circle(10, 10, 6, c);
    p.circle(10, 10, 4.6, dk);
    p.line(10, 10, 10, 6, hi);
    p.line(10, 10, 13, 11, hi);
  },
  flame: (p, c, hi) => {
    p.poly([[10, 3], [14, 9], [15, 13], [12, 17], [8, 17], [5, 13], [6, 9], [8, 11]], c);
    p.poly([[10, 9], [12, 13], [11, 16], [9, 16], [8, 13]], hi);
  },
  shield: (p, c, hi, dk) => {
    p.poly([[4, 5], [16, 5], [16, 11], [10, 17], [4, 11]], c);
    p.poly([[6, 7], [14, 7], [14, 11], [10, 15], [6, 11]], dk);
    p.line(10, 7, 10, 14, hi);
  },
  coin: (p, c, hi, dk) => {
    p.circle(10, 10, 6, c);
    p.circle(10, 10, 4, shade(c, 0.8));
    p.rect(9, 7, 2, 6, dk);
    p.set(7, 7, hi);
  },
  eye: (p, c, hi, dk) => {
    p.ellipse(10, 10, 7, 4, c);
    p.circle(10, 10, 3, dk);
    p.circle(10, 10, 1.5, hi);
  },
  medal: (p, c, hi, dk) => {
    p.poly([[6, 3], [9, 3], [11, 8], [8, 8]], shade(c, 0.6));
    p.poly([[14, 3], [11, 3], [9, 8], [12, 8]], shade(c, 0.5));
    p.circle(10, 12, 4.5, c);
    p.circle(10, 12, 2.5, dk);
    p.set(10, 12, hi);
  },
  bolt: (p, c, hi) => {
    p.poly([[11, 3], [6, 11], [10, 11], [8, 17], [14, 8], [10, 8], [12, 3]], c);
    p.line(11, 4, 8, 10, hi);
  },
  mask: (p, c, hi, dk) => {
    p.ellipse(10, 10, 6.5, 5, c);
    p.ellipse(7.5, 9, 1.8, 1.3, dk);
    p.ellipse(12.5, 9, 1.8, 1.3, dk);
    p.line(7, 13, 13, 13, dk);
    p.set(5, 7, hi);
  },
  gem: (p, c, hi, dk) => {
    p.poly([[6, 7], [8, 4], [12, 4], [14, 7], [10, 16]], c);
    p.poly([[6, 7], [14, 7], [10, 16]], shade(c, 0.75));
    p.line(8, 5, 9, 7, hi);
    p.set(10, 13, dk);
  },
};

export function achievementIcon(icon: AchIcon, color: number): Pix {
  const p = new Pix(20, 20);
  p.circle(10, 10, 9.5, shade(color, 0.35));
  p.circle(10, 10, 8.3, 0x10131d);
  GLYPHS[icon](p, color, blend(color, 0xffffff, 0.6), 0x10131d);
  p.outline(OUTLINE);
  return p;
}
