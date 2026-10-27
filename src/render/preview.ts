// Dev-only: gathers art for scripts/sheet.ts (not imported by the game).
import * as fx from './fxArt';
import { buildIcons } from './icons';
import { graveyardFloor, wreck, debris, lamp, girder } from './mapArt';
import type { Pix } from './pixel';

export function previewSheet(): { items: Pix[]; scale: number; bg: number } {
  const items: Pix[] = [];
  items.push(...Object.values(buildIcons()));
  items.push(...fx.DIGIT_CHARS.map(fx.glyph));
  items.push(fx.gem(0), fx.gem(1), fx.gem(2), fx.gem(3), fx.coin(0), fx.coin(1), fx.coin(2), fx.food(), fx.magnet(), fx.bomb());
  items.push(fx.glaive(), fx.missile(), fx.enemyOrb(false), fx.enemyOrb(true), fx.runeBlade(), fx.chest(false, false), fx.chest(true, false), fx.chest(false, true));
  items.push(fx.shrine(false, false), fx.shrine(true, false), fx.shrine(false, true), fx.pylon(), fx.vent(), fx.sigil(0x59f3ff), lamp(0xff3d3d));
  items.push(graveyardFloor(), wreck(0), wreck(1), wreck(2), wreck(3), debris(0), debris(1), girder());
  return { items, scale: 3, bg: 0x2a2f3a };
}
