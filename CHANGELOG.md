# Changelog

## Phase 3 — two new chapters

**What changed**

- **Chapter IV — The Frozen Archive.** A library buried in snow: snow-covered floor with drifts, half-buried shelves,
  frozen pillars, ice spikes and lost books; **snow falls all the time** (drifting with the wind, thinner with Reduced
  effects), **your footprints** trail behind you, and every 2½–3½ minutes a **whiteout** blows through (heavier snow, a
  steady side-wind, white fog closing in at the edges — bullets and warnings stay drawn on top).
  - Enemies: Page Wraiths (circle in flocks, then dive along a marked line), Ink Hounds (lunge), Frost Scribes (write
    slowing glyphs where you stand), Tome Golems (armoured), Echo Moths (leave a fluttering echo when killed).
  - Hazards: blizzard gusts (chevrons on the ground show the wind, then it shoves everyone) and freezing floor patches.
  - Minis: **the Archivist** (reads your last spell back at you — a dash becomes a charge, Nova a blast, Chrono Hush a
    chill…) and **the Ice Wyrm** (dives under the snow; the ground bulges, then it erupts under you).
  - Boss: **the Librarian of Silence** — circles of silence where your weapons stop firing, page-storm spirals, and
    shelves that fall along marked lines (a grid in later phases).
- **Chapter V — The Hive Below.** Living tunnels lit by glowing nodules.
  - Enemies: Broodlings (huge numbers), Acid Spitters (lob globs that leave acid), Carapace Chargers (long marked
    charges), Egg Sacs (hatch into broodlings if you don't pop them), Hive Drones.
  - Hazards: egg fields (nests that pulse, then spill broodlings) and acid pools.
  - Minis: **the Hive Knight** (carapace shield, charges, spear sweeps) and **the Twin Larvae** (always two; the
    survivor goes frantic).
  - Boss: **the Swarm Mind** — calls swarm waves around you, guarded by armoured nodes you must break, and in its last
    phase the **arena shrinks** (outside the ring hurts).
- Story: Chapter 3 now ends on a cliffhanger card; new story cards and scenes for IV and V; the epilogue and credits
  (now listing all six heroes and five bosses) follow Chapter V. Music and a boss track for each chapter.
- Endless on both new maps, with their enemies phasing in. New achievements (clear IV, clear V) with menu backgrounds;
  "Waking Nightmare" now means every chapter.

**Balance (bot, Warden, no meta):** Black Sun 1/3 (414 s); Frozen Archive 1/5 cleared (+1 reached the boss); Hive
Below 1/5 cleared (+1 reached the boss). Each chapter's round HP and kill counts are above the last (a test checks
this). The early tuning showed the new swarmers and slows stacked up on the slow Warden, so the Archive's slows are
milder than they first were. With a round-5 build the bot beats the Librarian in ~60 s and the Swarm Mind in ~130 s.
Endless and Overtime on both maps run clean; sim cost stays under 0.6 ms/frame with 400+ enemies.

**What to try**

1. Settings → "Unlock everything", then Story → Chapter IV. Watch the snow and your footprints; wait for a whiteout
   (or a gust: brace when the chevrons appear).
2. Let a Frost Scribe write under you (you slow down), and fight the Archivist after casting your spell a few times.
3. In the Librarian fight, stand in a circle of silence once to feel it, then learn to step out.
4. Chapter V: pop Egg Sacs before they hatch, break the Swarm Mind's nodes, and stay inside the ring in phase 3.
5. Beat Chapter III to see the new cliffhanger, and Chapter V for the epilogue and credits.
6. Tell me if either chapter feels too punishing for a human — the bot thinks they are hard, but it walks into crowds.

## Phase 2 — unlocks, achievements, cosmetics, difficulty

**What changed**

- **Weapon unlocks:** only the 7 starter weapons (plus your hero's own) appear in level-ups, chests and the Salvage
  shop at first. The other 12 unlock in the **Armory** for 40–120 Star Shards, or for free from a named achievement.
  The **Codex** has a new Weapons tab with locked ones greyed out and how to get them.
- **Difficulty tiers** on every chapter: Story (relaxed, ×0.6 shards), Normal, Veteran (×1.6, elites ×3) and
  Nightmare (×2.5, elites everywhere, and main bosses add a telegraphed barrage with one gap to step through). Clearing
  a tier opens the next for that chapter; medals on the chapter cards show your best. Chapters you cleared before this
  update count as Normal clears.
- **Endless / Overtime challenge:** a starting Threat (1 / 10 / 20 / 30) and five curses (elites everywhere, no
  healing pickups, bosses twice as often, enemies faster, no rerolls), each adding a Star Shard bonus (up to +200%).
  The raised Threat is reached over the first two minutes, because starting cold at Threat 30 killed the bot in
  12 seconds. Records are kept separately per setup. Active tier and curses show as tags on the HUD and the results
  screen. Overtime uses the challenge set on the Story screen ("Overtime: …" button) and keeps the chapter's tier.
- **49 achievements** with pixel badges, an Achievements screen with progress bars, and a pop-up when one lands
  (mid-run too). Each pays out a cosmetic, a weapon unlock or Star Shards. Your existing progress counts: on the
  first visit to the menu, everything you've already done pops.
- **Cosmetics + Collection screen**, all earned by achievements: per-hero skins (Emberforged — Witchfire for Pyre —,
  Frostbound, and the translucent Spectral special; Sprout now works on any hero), weapon trail colours, kill-burst
  styles, damage-number styles, title banners shown on the results screen, and menu backgrounds. Every hero has their
  own loadout; skins can also be picked on the hero picker.
- Bot: `--tier`, `--threat`, `--curses`.

**Checks:** tsc, eslint, 147 tests, single-file build, and bot runs (the four standard ones plus Veteran and Story
tier Chapter 1, Nightmare boss with Glint, Endless at Threat 10/20/30 with curses, Overtime on Veteran with curses)
all pass with no page errors; sim cost stays under 0.6 ms/frame. The bot cleared Chapter 1 on Story (343 s) and on
Veteran (405 s) on seed 777.

**What to try**

1. Story screen: switch tiers on Chapter I, look at the medals, and set an Overtime challenge with the "Overtime"
   button. Try a Veteran clear, then check that Nightmare opened.
2. Endless: pick Threat 10 and a curse or two, note the shard bonus line, and watch the HUD tags and the results.
3. Menu → Achievements: your existing progress should already have popped some. Menu → Collection: equip a skin,
   trail, kill burst and number style on one hero, play a minute, and check the results banner.
4. Armory: buy a weapon and see it start turning up in level-ups (the Codex Weapons tab shows what is locked).
5. With "Unlock everything" off, a new save only offers starter weapons, so tell me if early runs feel too samey.
   Starter list: `STARTER_WEAPON_IDS` in `src/data/weapons.ts`.

## Phase 1 — the five heroes

**What changed**

- **Glint, Voidcaller, Riven, Fortune and Pyre are playable.** Each has an original pixel body (idle, run, victory
  and hit-flash frames) with their weapon clearly in hand, and a menu portrait.
- **Real passives** (`src/systems/heroes.ts`, applied by `src/game/heroPassive.ts`):
  - **Glint — Afterimage:** every 3rd projectile is a guaranteed crit (it glows pale pink in flight).
  - **Voidcaller — Binding:** kills can rise as void spirits; summons last longer; Void Pact cools down 25% faster.
    Her spirits deal 20% less to mini-bosses and bosses.
  - **Riven — Overbuilt:** stand still for 1 s and she drops a field turret (up to 2, the oldest is replaced);
    +25% damage to elites, mini-bosses and bosses.
  - **Fortune — Loaded Dice:** +40% luck, chests 25% cheaper, one free reroll on every level-up, and coins sometimes
    burst for area damage ("×N JACKPOT").
  - **Pyre — Kindling:** leaves smouldering ground behind while moving; up to +60% damage as HP falls.
- **Starting kits** to match: Plasma Glaive + Aegis Dash, Void Spirits + Void Pact, Sentry Turret + Nova Burst,
  Arc Chain + Gem Tempest, Void Flame + Nova Burst.
- **Five new skill trees:** 12 nodes, 3 themed branches each, the same shape and costs as the Warden's, free refunds.
  Each offence capstone strengthens the hero's passive (Third Eye, Grave Calling, Rapid Deploy, Jackpot, Wildfire).
- **Unlocks are real:** Beat Chapter 1 (Glint), 5,000 kills (Voidcaller), Beat Chapter 2 (Riven), 100 chests opened
  (Fortune), a 15-minute Endless run (Pyre). Locked cards show a silhouette and progress ("3,120 / 5,000 kills"). The
  first time a hero unlocks you get a "New hero unlocked" card (on the menu) or a banner and note on the results
  screen. Old saves load; their longest Endless run is recovered from their Endless records, so a qualifying old save
  unlocks heroes on the next visit to the menu.
- The **Sprout** skin works on every hero.
- Results screen names the new damage sources (field turrets, burning trail, coin bursts, raised spirits).

**Balance (bot, Chapter 1 Story, no meta):** Warden 4/8 seeds (290–441 s); Glint 1/3 (387 s); Voidcaller 2/6
(219–224 s); Riven 2/3 (281–353 s); Fortune 1/3 (295 s); Pyre 1/3 (338 s). The bot keeps its distance from
mini-bosses, which slows the melee Warden much more than the ranged heroes, so the Voidcaller's clear times look
quicker than a human would see. Endless (seed 777): Warden, Voidcaller and Pyre reached 15:00; Glint 7:54,
Fortune 6:29, Riven 5:17 (the bot never stands still, so Riven's turrets rarely deploy for it).

**What to try**

1. Settings → "Unlock everything" off, then open Story: the five locked cards should show silhouettes and progress bars.
2. Turn "Unlock everything" on and play each hero for a few minutes:
   - Glint: watch for pale-pink glaives, every third one crits.
   - Voidcaller: purple spirits rise from kills; cast Void Pact often.
   - Riven: stop moving for a second, a turret drops beside you; stand still longer for a second one.
   - Fortune: the level-up screen shows "Reroll (free)"; coins sometimes burst ("JACKPOT").
   - Pyre: walk in circles through a crowd; let your HP drop and see damage numbers grow.
3. Open each hero's skill tree (branch names and capstones differ per hero) and try a free refund.
4. Turn "Unlock everything" off and earn an unlock (beating Chapter 1 unlocks Glint) to see the celebration.
5. Tell me which heroes feel too strong or too weak; numbers live at the top of `src/systems/heroes.ts` and in
   `src/data/characters.ts`.
