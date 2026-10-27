import type { Rng } from '../core/rng';

/** Random, confident, family-friendly names for elites and bosses. All invented. */

const FIRST = [
  'Gary', 'Brenda', 'Dennis', 'Marjorie', 'Clive', 'Wendell', 'Bartholomew', 'Philippa', 'Gus', 'Norbert',
  'Agnes', 'Reginald', 'Bev', 'Tobias', 'Mildred', 'Lorenzo', 'Doug', 'Prudence', 'Grumbo', 'Snibbet',
  'Hortense', 'Vlorp', 'Desmond', 'Ingrid', 'Barnaby', 'Cornelius', 'Dolores', 'Fennick', 'Gertrude', 'Humphrey',
  'Kevin', 'Linda', 'Murgatroyd', 'Nigel', 'Ottoline', 'Percival', 'Quentin', 'Rosalind', 'Sprocket', 'Thaddeus',
  'Ulf', 'Velma', 'Winifred', 'Xandor', 'Yolanda', 'Zebulon', 'Crumb', 'Pip', 'Bort', 'Glimmer',
];

const EPITHET = [
  'the Unbothered', 'the Mildly Concerned', 'Who Paid Full Price', 'the Overdue', 'the Slightly Damp',
  'of Questionable Taste', 'the Fashionably Late', 'the Unsubscribed', 'the Reasonably Confident',
  'Who Read the Manual', 'the Absolutely Fine', 'the Extremely Online', 'the Loud', 'the Well-Rested',
  'the Rust-Kissed', 'of the Tuesday Shift', 'the Never Wrong', 'the Recently Promoted', 'the Unstoppable (Mostly)',
  'the Snack Hoarder', 'Who Did Their Homework', 'the Hardly Trying', 'the Self-Appointed', 'the Very Shiny',
  'the Undefeated at Tag', 'Who Knows a Guy', 'the Slightly Haunted', 'the Moist', 'of Many Opinions', 'the Bold',
];

const RANK = ['KING', 'QUEEN', 'BARON', 'DUCHESS', 'GRAND VIZIER', 'ARCHDUKE', 'LADY', 'LORD', 'CAPTAIN', 'HIGH ABBOT'];
const BIGNAME = [
  'THORNWALLOW', 'RIVETSNOUT', 'GLOOMBUCKET', 'SPANNERGRIN', 'CRANKSHAW', 'BOLTWHISKER', 'MOPEFANG',
  'SCRAPPINGTON', 'HULLSWORTH', 'DRIZZLEGRIP', 'COGSWALLOP', 'GRIMBLEDOWN',
];
const ROLE = ['Mayor', 'Keeper', 'Sovereign', 'Treasurer', 'Head Chef', 'Chief Inspector', 'Lifeguard', 'Librarian'];
const DOMAIN = [
  'the Compost', 'Spare Parts', 'the Lost Socks', 'the Leaky Airlock', 'Loose Screws', 'the Breakroom',
  'the Last Biscuit', 'Wet Cardboard', 'the Emergency Exit', 'Very Old Soup', 'the Lint Trap', 'Bad Wi-Fi',
];

/** e.g. "Gary the Unbothered" or "KING THORNWALLOW, Mayor of the Compost" */
export function eliteName(rng: Rng): string {
  if (rng.chance(0.25)) return `${rng.pick(RANK)} ${rng.pick(BIGNAME)}, ${rng.pick(ROLE)} of ${rng.pick(DOMAIN)}`;
  return `${rng.pick(FIRST)} ${rng.pick(EPITHET)}`;
}

const BOSS_TITLES = [
  'Duke of Spare Parts', 'Undefeated at Hide-and-Seek', 'Keeper of the Last Biscuit', 'Who Was Here First',
  'Collector of Unpaid Debts', 'Lord of the Leaky Airlock', 'Champion of Staying Up Late',
  'Destroyer of Group Chats', 'Chief Executive of Doom', 'Holder of Several Grudges', 'the Uninvited',
  'Patron Saint of Loud Noises', 'Who Never Returns Borrowed Tools', 'Sovereign of the Lint Trap',
];

/** Main bosses keep their fixed name and get a random title. */
export function bossTitle(rng: Rng): string {
  return rng.pick(BOSS_TITLES);
}
