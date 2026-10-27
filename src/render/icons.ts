/**
 * 16x16 icons for weapons, passives, relics, spells and UI. Keys:
 *   w_<weaponId>, p_<passiveId>, r_<relicId>, s_<spellId>, i_<misc>
 */
import { PASSIVES, RELICS } from '../data/passives';
import { SPELLS } from '../data/spells';
import { WEAPONS } from '../data/weapons';
import { OUTLINE, Pix, blend, shade } from './pixel';

type IconFn = (p: Pix, c: number) => void;

const hot = (c: number) => blend(c, 0xffffff, 0.55);

const W_ICONS: Record<string, IconFn> = {
  oathblade: (p, c) => {
    p.line(3, 13, 12, 2, c).line(4, 13, 13, 2, hot(c)).line(4, 12, 13, 3, c);
    p.line(2, 10, 6, 14, 0x9aa3b8).rect(1, 13, 3, 2, 0x4a556f);
  },
  rune_halo: (p, c) => {
    p.ring(8, 8, 6.5, 1, shade(c, 0.6));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const x = 8 + Math.cos(a) * 5.5, y = 8 + Math.sin(a) * 5.5;
      p.line(x - 2, y - 1, x + 2, y + 1, hot(c)).set(x, y, 0xffffff);
    }
    p.rect(7, 7, 2, 2, c);
  },
  arc_chain: (p, c) => {
    p.poly([[9, 1], [3, 9], [7, 9], [5, 15], [12, 6], [8, 6], [11, 1]], c);
    p.line(8, 3, 6, 8, hot(c));
  },
  plasma_glaive: (p, c) => {
    p.poly([[8, 1], [10, 6], [15, 8], [10, 10], [8, 15], [6, 10], [1, 8], [6, 6]], c);
    p.circle(8, 8, 2, hot(c));
  },
  seeker_swarm: (p, c) => {
    p.line(2, 12, 9, 5, 0x9aa3b8).line(3, 13, 10, 6, 0x9aa3b8).set(10, 4, c).set(11, 5, hot(c));
    p.line(6, 14, 12, 8, 0x9aa3b8).set(13, 7, c);
    p.set(1, 13, 0xff8a3d).set(5, 15, 0xff8a3d);
  },
  gravemaul: (p, c) => {
    p.rect(3, 2, 10, 5, 0x4a556f).rect(4, 3, 8, 2, 0x6f7d9c);
    p.rect(7, 7, 2, 6, 0x6b5545);
    p.line(1, 14, 15, 14, c).line(4, 13, 2, 11, c).line(12, 13, 14, 11, c);
  },
  searing_mantle: (p, c) => {
    p.ring(8, 8, 7, 2, shade(c, 0.7)).ring(8, 8, 6, 1, hot(c));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.set(8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7 - 1, 0xffe0a0);
    }
    p.circle(8, 8, 2.5, 0x323a50).set(8, 8, c);
  },
  sunheart_mantle: (p, c) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.line(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 8 + Math.cos(a) * 7.5, 8 + Math.sin(a) * 7.5, i % 2 ? c : hot(c));
    }
    p.circle(8, 8, 4, c).circle(8, 8, 2.5, hot(c)).set(8, 8, 0xffffff);
  },
  oathbreaker: (p, c) => {
    p.ring(8, 8, 7, 2, c);
    p.line(4, 12, 12, 4, hot(c)).line(4, 4, 12, 12, hot(c));
  },
  rune_corona: (p, c) => {
    p.ring(8, 8, 7, 1, c).ring(8, 8, 4, 1, shade(c, 0.7));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.set(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 0xffffff);
    }
  },
  tempest_crown: (p, c) => {
    p.poly([[2, 12], [2, 5], [5, 8], [8, 3], [11, 8], [14, 5], [14, 12]], 0xffc94d);
    p.line(8, 6, 6, 11, c).line(6, 11, 9, 11, c).line(9, 11, 7, 15, c);
  },
  comet_glaive: (p, c) => {
    p.line(1, 15, 8, 8, shade(c, 0.6)).line(2, 15, 9, 8, shade(c, 0.8));
    p.poly([[11, 2], [12, 6], [15, 7], [12, 8], [11, 12], [10, 8], [7, 7], [10, 6]], c);
    p.set(11, 7, 0xffffff);
  },
  hive_barrage: (p, c) => {
    for (let i = 0; i < 3; i++) p.line(2 + i * 4, 14, 6 + i * 4, 6, 0x9aa3b8).set(6 + i * 4, 5, c).set(7 + i * 4, 4, hot(c));
  },
  singularity_slam: (p, c) => {
    p.circle(8, 8, 3, 0x1a1028).ring(8, 8, 6, 1, c).ring(8, 8, 4, 1, hot(c));
    p.set(8, 8, 0xffffff);
  },
};

const P_ICONS: Record<string, IconFn> = {
  void_boots: (p, c) => {
    p.rect(5, 2, 5, 9, 0x323a50).rect(5, 10, 9, 4, 0x323a50).rect(6, 3, 3, 7, 0x4a556f);
    p.line(4, 14, 14, 14, c).set(13, 11, c);
  },
  star_lens: (p, c) => {
    p.ring(8, 8, 6, 1.5, 0x9aa3b8).circle(8, 8, 4.5, shade(c, 0.4));
    p.line(8, 5, 8, 11, c).line(5, 8, 11, 8, c).set(8, 8, 0xffffff);
  },
  cursed_clover: (p, c) => {
    p.circle(5.5, 5.5, 3, c).circle(10.5, 5.5, 3, c).circle(5.5, 10.5, 3, c).circle(10.5, 10.5, 3, shade(c, 0.6));
    p.set(10, 10, 0xff3d3d).set(11, 10, 0xff3d3d);
    p.line(8, 8, 12, 15, 0x3f8f2c);
  },
  phoenix_ember: (p, c) => {
    p.poly([[8, 1], [12, 8], [11, 13], [8, 15], [5, 13], [4, 8]], c);
    p.poly([[8, 6], [10, 10], [8, 13], [6, 10]], 0xffe0a0);
  },
  conductor_coil: (p, c) => {
    for (let y = 3; y < 14; y += 2) p.line(4, y, 12, y + 1, y % 4 === 1 ? c : hot(c));
    p.rect(7, 1, 2, 2, 0x9aa3b8).rect(7, 14, 2, 2, 0x9aa3b8);
  },
  runeplate: (p, c) => {
    p.poly([[2, 3], [14, 3], [13, 12], [8, 15], [3, 12]], 0x4a556f);
    p.poly([[4, 4], [12, 4], [11, 11], [8, 13], [5, 11]], 0x323a50);
    p.line(8, 5, 8, 11, c).line(6, 7, 10, 7, c);
  },
  lodestone: (p, c) => {
    p.poly([[3, 6], [8, 2], [13, 5], [13, 11], [7, 14], [3, 11]], 0x3a3f4f);
    p.poly([[5, 6], [8, 4], [11, 6], [10, 9], [6, 9]], 0x50566a);
    p.ring(8, 8, 7.5, 1, c);
  },
  twin_capacitor: (p, c) => {
    p.rect(2, 4, 5, 10, 0x323a50).rect(9, 4, 5, 10, 0x323a50);
    p.rect(3, 7, 3, 6, c).rect(10, 5, 3, 8, c);
    p.rect(3, 2, 3, 2, 0x9aa3b8).rect(10, 2, 3, 2, 0x9aa3b8);
  },
};

P_ICONS.reaper_sigil = (p, c) => {
  // a crosshair sigil around a glowing weak point
  p.ring(8, 8, 6.5, 1.5, shade(c, 0.6));
  p.line(8, 1, 8, 4, c).line(8, 12, 8, 15, c).line(1, 8, 4, 8, c).line(12, 8, 15, 8, c);
  p.poly([[8, 5], [11, 8], [8, 11], [5, 8]], c);
  p.set(8, 8, 0xffffff).set(8, 7, hot(c));
};

const S_ICONS: Record<string, IconFn> = {
  aegis_dash: (p, c) => {
    p.poly([[2, 5], [10, 5], [10, 2], [15, 8], [10, 14], [10, 11], [2, 11]], c);
    p.line(3, 8, 11, 8, hot(c));
  },
  nova_burst: (p, c) => {
    p.ring(8, 8, 7, 1.5, c).circle(8, 8, 3, hot(c));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.set(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, c);
    }
  },
  chrono_hush: (p, c) => {
    p.rect(3, 1, 10, 2, 0x9aa3b8).rect(3, 13, 10, 2, 0x9aa3b8);
    p.poly([[4, 3], [12, 3], [8, 8]], c).poly([[8, 8], [12, 13], [4, 13]], shade(c, 0.6));
  },
  mending_pulse: (p, c) => {
    p.rect(6, 2, 4, 12, c).rect(2, 6, 12, 4, c).rect(7, 3, 2, 10, hot(c));
  },
  gem_tempest: (p, c) => {
    p.ring(8, 8, 7, 1, shade(c, 0.6));
    p.poly([[8, 3], [12, 7], [8, 13], [4, 7]], c).poly([[8, 3], [8, 13], [4, 7]], hot(c));
  },
};

function relicIcon(p: Pix, c: number, stat: string): void {
  switch (stat) {
    case 'damage':
      p.poly([[8, 1], [12, 8], [8, 15], [4, 8]], c).line(8, 3, 8, 12, hot(c));
      break;
    case 'critChance':
      p.ring(8, 8, 6, 1.5, c).circle(8, 8, 2, hot(c));
      break;
    case 'critDamage':
      p.line(2, 14, 13, 3, c).line(3, 14, 14, 3, hot(c)).line(10, 3, 14, 7, c);
      break;
    case 'regen':
    case 'maxHp':
      p.circle(5.5, 6, 3.5, c).circle(10.5, 6, 3.5, c).poly([[2, 7], [14, 7], [8, 14]], c).set(5, 5, hot(c));
      break;
    case 'lifesteal':
      p.poly([[8, 2], [12, 9], [8, 14], [4, 9]], c).set(7, 6, hot(c));
      break;
    case 'xpGain':
      p.rect(3, 3, 10, 10, 0x323a50).rect(5, 5, 6, 6, c).rect(6, 6, 2, 2, hot(c));
      break;
    case 'coinGain':
      p.circle(8, 8, 6, 0xc98a1e).circle(8, 8, 4.5, c).set(7, 6, hot(c));
      break;
    case 'dodge':
      p.poly([[3, 2], [13, 2], [12, 14], [8, 11], [4, 14]], shade(c, 0.6)).poly([[5, 3], [11, 3], [10, 11], [8, 9], [6, 11]], c);
      break;
    case 'duration':
    case 'attackSpeed':
      for (let y = 3; y < 14; y += 2) p.line(4, y, 12, y + 1, c);
      break;
    default:
      p.poly([[8, 1], [15, 8], [8, 15], [1, 8]], c).circle(8, 8, 2, hot(c));
  }
}

const MISC: Record<string, IconFn> = {
  coin: (p) => {
    p.circle(8, 8, 6, 0xc98a1e).circle(8, 7.5, 4.6, 0xffc94d).rect(7, 5, 2, 5, 0xc98a1e).set(6, 5, 0xfff1b8);
  },
  food: (p) => {
    p.rect(4, 4, 8, 9, 0x2a5a32).rect(5, 5, 6, 7, 0x7dff8a).rect(3, 3, 10, 2, 0x4a556f).rect(3, 12, 10, 2, 0x4a556f);
  },
  gem: (p) => {
    p.poly([[8, 1], [14, 6], [8, 15], [2, 6]], 0x2a9fb3).poly([[8, 1], [14, 6], [8, 9]], 0x59f3ff).poly([[8, 1], [8, 9], [2, 6]], 0xb8faff);
  },
  skull: (p) => {
    p.circle(8, 7, 6, 0xd8d2c4).rect(5, 11, 6, 4, 0xd8d2c4).rect(4, 6, 3, 3, 0x1a1420).rect(9, 6, 3, 3, 0x1a1420).rect(7, 13, 1, 2, 0x1a1420);
  },
  clock: (p) => {
    p.circle(8, 8, 6.5, 0x9aa3b8).circle(8, 8, 5, 0x1a1e2a).line(8, 8, 8, 4, 0x59f3ff).line(8, 8, 11, 9, 0x59f3ff);
  },
  chest: (p) => {
    p.rect(1, 6, 14, 8, 0x262c3c).rect(1, 3, 14, 4, 0x3a4152).rect(1, 7, 14, 1, 0x4a556f).rect(7, 6, 2, 4, 0x59f3ff);
  },
  threat: (p) => {
    p.poly([[8, 1], [15, 14], [1, 14]], 0xff4d4d).rect(7, 5, 2, 5, 0x1a1420).rect(7, 11, 2, 2, 0x1a1420);
  },
  lock: (p) => {
    p.ring(8, 6, 4, 1.5, 0x9aa3b8).rect(3, 7, 10, 8, 0x4a556f).rect(7, 9, 2, 3, 0x1a1420);
  },
  star: (p) => {
    p.poly([[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], 0xffc94d);
  },
};


// ---------- arsenal expansion
const ring8 = (p: Pix, cx: number, cy: number, r: number, c: number, n = 8) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
  }
};
Object.assign(W_ICONS, {
  cryo_shards: (p: Pix, c: number) => {
    for (const [x, y] of [[4, 11], [8, 9], [12, 11]]) p.poly([[x, y - 7], [x + 2, y], [x, y + 3], [x - 2, y]], c);
    p.line(8, 2, 8, 9, hot(c));
  },
  absolute_zero: (p: Pix, c: number) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.line(8, 8, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, i % 2 ? c : hot(c));
    }
    p.circle(8, 8, 2, 0xffffff);
  },
  corrosive_flask: (p: Pix, c: number) => {
    p.rect(6, 2, 4, 3, 0x9aa3b8).poly([[5, 5], [11, 5], [13, 13], [3, 13]], 0x2b3a20);
    p.poly([[4, 9], [12, 9], [13, 13], [3, 13]], c).set(6, 11, hot(c)).set(9, 10, hot(c));
  },
  plague_font: (p: Pix, c: number) => {
    p.ellipse(8, 11, 7, 3.5, shade(c, 0.6)).ellipse(8, 10, 5, 2.5, c);
    p.circle(5, 6, 1.5, hot(c)).circle(10, 4, 1.2, hot(c)).circle(12, 7, 1, c);
  },
  sweep_laser: (p: Pix, c: number) => {
    p.rect(1, 9, 5, 4, 0x4a556f).rect(2, 10, 3, 2, 0x6f7d9c);
    p.line(6, 10, 15, 4, c).line(6, 11, 15, 5, hot(c)).set(15, 4, 0xffffff);
  },
  judgement_ray: (p: Pix, c: number) => {
    p.line(1, 8, 15, 8, c).line(8, 1, 8, 15, c).line(3, 3, 13, 13, hot(c)).line(13, 3, 3, 13, hot(c));
    p.circle(8, 8, 2.5, 0xffffff);
  },
  gravity_bombs: (p: Pix, c: number) => {
    p.circle(8, 9, 5.5, 0x2a1f40).ring(8, 9, 5.5, 1, c).circle(8, 9, 2, hot(c));
    p.line(11, 4, 13, 2, 0x9aa3b8).set(14, 1, 0xffd34d);
  },
  chaos_orbs: (p: Pix, c: number) => {
    p.circle(6, 9, 4, 0x2a1f40).ring(6, 9, 4, 1, c).circle(11, 5, 3, 0x2a1f40).ring(11, 5, 3, 1, hot(c)).circle(12, 12, 2, c);
  },
  sentry_turret: (p: Pix, c: number) => {
    p.rect(4, 9, 8, 4, 0x3a404c).line(5, 13, 3, 15, 0x262a33).line(11, 13, 13, 15, 0x262a33);
    p.rect(6, 6, 5, 4, 0x55606f).rect(10, 7, 5, 2, 0x55606f).set(14, 7, c).set(7, 7, c);
  },
  bastion_array: (p: Pix, c: number) => {
    for (const [x, y] of [[4, 11], [12, 11], [8, 4]]) p.rect(x - 2, y - 1, 4, 3, 0x55606f).set(x, y - 1, c);
    p.line(4, 10, 8, 4, hot(c)).line(12, 10, 8, 4, hot(c)).line(4, 11, 12, 11, hot(c));
  },
  aegis_wheels: (p: Pix, c: number) => {
    p.ring(8, 8, 6.5, 1, shade(c, 0.5));
    p.circle(3, 8, 2.5, c).circle(13, 8, 2.5, c).set(3, 8, 0xffffff).set(13, 8, 0xffffff);
  },
  bramble_bulwark: (p: Pix, c: number) => {
    p.ring(8, 8, 6.5, 1, shade(c, 0.5));
    for (const [x, y] of [[3, 8], [13, 8], [8, 3], [8, 13]]) p.circle(x, y, 2, c).set(x, y, hot(c));
    ring8(p, 8, 8, 4, 0x6a8a3a);
  },
  soul_scythe: (p: Pix, c: number) => {
    p.line(3, 14, 10, 3, 0x6b5545).line(4, 14, 11, 3, 0x7a6248);
    p.poly([[10, 2], [15, 4], [14, 8], [12, 5]], c).set(14, 4, hot(c));
  },
  reapers_harvest: (p: Pix, c: number) => {
    p.ring(8, 8, 6.5, 1.5, c).ring(8, 8, 3.5, 1, hot(c));
    p.poly([[8, 0], [11, 2], [8, 3]], 0xffffff);
  },
  starfall: (p: Pix, c: number) => {
    p.line(2, 2, 9, 9, shade(c, 0.5)).line(3, 2, 10, 9, shade(c, 0.7));
    p.circle(11, 11, 3, c).circle(11, 11, 1.5, 0xffffff);
  },
  starfall_requiem: (p: Pix, c: number) => {
    for (const [x, y] of [[4, 5], [11, 4], [8, 11]]) {
      p.line(x - 3, y - 3, x, y, shade(c, 0.6));
      p.circle(x, y, 2, c).set(x, y, 0xffffff);
    }
  },
  ricochet: (p: Pix, c: number) => {
    p.line(1, 13, 6, 4, shade(c, 0.6)).line(6, 4, 11, 12, shade(c, 0.8)).line(11, 12, 15, 5, c);
    p.rect(14, 4, 2, 2, 0xffffff);
  },
  phantom_volley: (p: Pix, c: number) => {
    for (let k = 0; k < 3; k++) p.line(1, 12 - k * 3, 14, 6 - k * 2, k === 1 ? hot(c) : shade(c, 0.7));
    p.rect(13, 5, 2, 2, 0xffffff);
  },
  black_hole: (p: Pix, c: number) => {
    p.ring(8, 8, 6.5, 1.5, c).ring(8, 8, 4.5, 1, shade(c, 0.6)).circle(8, 8, 3, 0x05040a);
  },
  event_horizon: (p: Pix, c: number) => {
    p.ellipse(8, 8, 7.5, 3, shade(c, 0.7)).ellipse(8, 8, 5, 1.6, hot(c)).circle(8, 8, 3.2, 0x05040a).ring(8, 8, 3.6, 1, 0xffffff);
  },
  void_flame: (p: Pix, c: number) => {
    p.poly([[2, 8], [14, 2], [12, 8], [14, 14]], shade(c, 0.6)).poly([[2, 8], [11, 5], [10, 8], [11, 11]], c).poly([[2, 8], [7, 7], [7, 9]], hot(c));
  },
  abyssal_breath: (p: Pix, c: number) => {
    p.poly([[8, 8], [1, 2], [3, 8], [1, 14]], c).poly([[8, 8], [15, 2], [13, 8], [15, 14]], c).circle(8, 8, 2, hot(c));
  },
  void_spirits: (p: Pix, c: number) => {
    p.circle(6, 7, 3.5, c).poly([[3, 8], [9, 8], [8, 14], [6, 11], [4, 14]], c).set(5, 6, 0xffffff).set(7, 6, 0xffffff);
    p.circle(12, 5, 2, shade(c, 0.7));
  },
  void_legion: (p: Pix, c: number) => {
    for (const [x, y] of [[4, 6], [11, 5], [8, 11]]) p.circle(x, y, 2.5, c).set(x - 1, y - 1, 0xffffff).set(x + 1, y - 1, 0xffffff);
  },
});

const P_ICONS_MORE: Record<string, IconFn> = {
  hourglass: (p, c) => {
    p.rect(3, 1, 10, 2, 0x9aa3b8).rect(3, 13, 10, 2, 0x9aa3b8);
    p.poly([[4, 3], [12, 3], [8, 8]], c).poly([[8, 8], [12, 13], [4, 13]], shade(c, 0.5));
  },
  blood_chalice: (p, c) => {
    p.poly([[3, 2], [13, 2], [11, 8], [5, 8]], 0x9aa3b8).poly([[4, 3], [12, 3], [10.5, 7], [5.5, 7]], c);
    p.rect(7, 8, 2, 4, 0x9aa3b8).rect(5, 12, 6, 2, 0x9aa3b8);
  },
  leech_fang: (p, c) => {
    p.poly([[4, 2], [8, 2], [6, 14]], 0xe8e0d0).poly([[9, 2], [13, 2], [11, 11]], 0xd8d0c0).set(6, 13, c).set(11, 10, c).set(6, 14, c);
  },
  phase_veil: (p, c) => {
    p.poly([[3, 2], [13, 2], [14, 14], [8, 11], [2, 14]], shade(c, 0.5)).poly([[5, 3], [11, 3], [12, 12], [8, 9], [4, 12]], c);
  },
  void_heart: (p, c) => {
    p.circle(5.5, 6, 3.5, c).circle(10.5, 6, 3.5, c).poly([[2, 7], [14, 7], [8, 14]], c).circle(8, 8, 2, 0x05040a);
  },
  archive_core: (p, c) => {
    p.rect(3, 3, 10, 10, 0x262d40).rect(4, 4, 8, 8, shade(c, 0.4));
    for (let y = 5; y < 12; y += 2) p.line(5, y, 10, y, c);
  },
  briar_crown: (p, c) => {
    p.ring(8, 9, 5.5, 1.5, shade(c, 0.6));
    for (const [x, y] of [[3, 5], [8, 2], [13, 5]]) p.poly([[x - 1, y + 3], [x, y], [x + 1, y + 3]], c);
  },
  field_battery: (p, c) => {
    p.rect(4, 3, 8, 11, 0x323a50).rect(6, 1, 4, 2, 0x9aa3b8).rect(5, 8, 6, 5, c).rect(5, 5, 6, 2, shade(c, 0.4));
  },
  cinder_core: (p, c) => {
    p.circle(8, 8, 5.5, shade(c, 0.5)).circle(8, 8, 3.5, c).circle(8, 8, 1.5, 0xffffff);
    ring8(p, 8, 8, 7, hot(c), 6);
  },
  soul_lantern: (p, c) => {
    p.rect(7, 1, 2, 2, 0x9aa3b8).rect(4, 3, 8, 11, 0x323a50).rect(5, 4, 6, 9, shade(c, 0.5)).circle(8, 8.5, 2.5, c).set(8, 8, 0xffffff);
  },
};
Object.assign(P_ICONS, P_ICONS_MORE);
S_ICONS.void_pact = (p, c) => {
  for (const [x, y] of [[4, 5], [12, 5], [8, 11]]) p.circle(x, y, 2.5, c).set(x, y - 1, 0xffffff);
  p.ring(8, 7, 7, 1, shade(c, 0.6));
};

function make(fn: IconFn, c: number): Pix {
  const p = new Pix(16, 16);
  fn(p, c);
  p.outline(OUTLINE);
  return p;
}

export function buildIcons(): Record<string, Pix> {
  const out: Record<string, Pix> = {};
  for (const [id, def] of Object.entries(WEAPONS)) out[`w_${id}`] = make(W_ICONS[id] ?? W_ICONS.oathblade, def.color);
  for (const [id, def] of Object.entries(PASSIVES)) out[`p_${id}`] = make(P_ICONS[id], def.color);
  for (const [id, def] of Object.entries(SPELLS)) out[`s_${id}`] = make(S_ICONS[id], def.color);
  for (const [id, def] of Object.entries(RELICS)) out[`r_${id}`] = make((p, c) => relicIcon(p, c, def.mod.stat), def.color);
  for (const [id, fn] of Object.entries(MISC)) out[`i_${id}`] = make(fn, 0xffffff);
  return out;
}
