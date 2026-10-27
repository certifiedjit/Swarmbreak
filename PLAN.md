# Swarmbreak — build plan

Work through the phases **in order**. Finish one phase completely (code, art, tests, the full check list in
`CLAUDE.md`, bot play-tests, screenshots you have looked at) and commit before starting the next. After each phase,
write a short summary of what changed and what to try at the top of `CHANGELOG.md`.

Not in scope (do not build): battle pass, premium currency, anything that costs money, daily seeded run, seed codes,
build codes, share card, video clips.

---

## Phase 1 — the five heroes

Make Glint, Voidcaller, Riven, Fortune and Pyre playable (`available: true` in `src/data/characters.ts`). For each:

1. **Art** — a distinct body in `src/render/heroArt.ts` (idle, run and victory frames + flash, like the Warden): a
   silhouette that reads at a glance and a clearly visible weapon in hand. Render them to a PNG and look before wiring in.
   Each gets a menu portrait icon (`icons.hero_<id>`).
2. **Unique passive** — implement the `passiveName`/`passiveDesc` as real behaviour (rewrite the text if needed so it
   matches what it does). Ideas that fit the existing start weapons:
   - Glint (plasma glaive): every 3rd projectile is a guaranteed crit; moves fast, low HP.
   - Voidcaller (rune halo / void spirits): kills have a chance to raise a void spirit ally; Void Pact cools down faster.
   - Riven (seeker swarm / sentry turret): standing still for 1 s deploys an extra turret; bonus damage to elites.
   - Fortune (arc chain): +luck, chests cost less, a free reroll each level; coins sometimes explode for damage.
   - Pyre (gravemaul / void flame): burning ground trail while moving; damage rises as HP falls.
3. **Starting kit** — start weapon and start spell that suit the passive.
4. **Skill tree** — a 12-node, 3-branch tree in `SKILL_TREES` (`src/systems/mastery.ts`), same shape and cost rules as
   the Warden's, themed to the hero. Free unlimited refunds stay.
5. **Unlocks** — make the `unlock` conditions real (track the stats in the save; show progress like "3,120 / 5,000
   kills" on the locked card; a celebratory unlock banner the first time).
6. **Balance** — run the bot with `--character=<id>` on Chapter 1 story and Endless; each hero should clear Chapter 1
   on at least 1 of 3 seeds with no meta, and none should be more than ~30% faster than the Warden.
7. Tests for every new passive rule and unlock condition. Old saves must still load.

## Phase 2 — unlocks, achievements, cosmetics, difficulty

1. **Weapon unlocks** — only `STARTER_WEAPON_IDS` are in the pool at first. The rest unlock in the Armory for Star
   Shards or by achievements. Pass the unlocked set into `upgradePool` / `rollLevelUpOffers` / `rollChestItem` /
   `rollShop`. Show locked weapons greyed out (with how to unlock) in the Codex.
2. **Achievements** — 30+ with original pixel icons, e.g. clear each chapter, clear without taking hazard damage,
   kill 10,000 / 100,000 enemies, evolve every weapon, a ×50 cleave, survive 10 minutes of Overtime, a Victory Cache
   jackpot, beat a boss without dashing, each hero to mastery 10. An achievements screen with progress bars; a toast
   when one pops. Achievements grant cosmetics, weapon unlocks or shards. No grind walls.
3. **Cosmetics + Collection screen** — all earned, never bought:
   - hero skins (palette sets per hero, plus 1–2 special skins each, like Sprout),
   - weapon trails / slash colours, kill-burst styles, damage-number styles,
   - menu backgrounds (a scene per cleared chapter), title banners for the results screen.
   A Collection screen (grid, locked items show how to earn them) and an equip loadout per hero.
4. **Story difficulty tiers** — Normal / Veteran / Nightmare (and a relaxed "Story" tier below Normal). Each tier
   changes enemy HP/damage/density and adds a twist (Nightmare: elites everywhere, bosses get an extra phase attack),
   and pays more shards. Clearing a chapter on a tier unlocks the next tier for that chapter. Show tier medals on
   the chapter cards.
5. **Endless / Overtime Threat + curses** — Endless and Overtime get a starting Threat selector (1, 10, 20, 30) and
   optional curse toggles: elites everywhere, no healing pickups, bosses twice as often, enemies faster, no rerolls.
   Each raised Threat step and each curse adds a Star Shard bonus. Keep separate best records per starting Threat +
   curse combination. Show the active curses on the HUD and the results screen. Overtime uses the chapter's
   difficulty tier (from item 4) for its scaling.

## Phase 3 — two new chapters

Insert after the Black Sun as a second arc (the epilogue already hints "the swarm still stirs"): move the credits to
after the new finale and make Chapter 3's ending a cliffhanger card instead. Follow the "A map" recipe in the README
for each: 5 rounds, 2 minis, a 3-phase boss with telegraphed patterns, 4–5 new enemy types (mix of melee, ranged and
something new), 1–2 hazards, floor + decor art, music + boss track, story cards, Endless mix with phase-in times.

- **Chapter IV — The Frozen Archive**: a library world buried under snow. It must *look snowed in*: a snow-covered
  floor with drifts and half-buried bookshelves, frozen pillars, icicles, your footprints left in the snow, and
  **snow falling all the time** (a light, cheap particle layer drawn above the world that drifts with the wind;
  thinner with Reduced effects). Every few minutes a **whiteout** blows through: heavier snow, gusts, lower visibility,
  but bullets and telegraphs always stay visible. Enemies: page wraiths (flock and dive), ink
  hounds, frost scribes (lay slowing glyphs), tome golems (armoured), echo moths. Hazards: blizzard gusts that push
  everyone, freezing floor patches. Minis: the Archivist (copies your last spell), the Ice Wyrm (burrows). Boss: the
  Librarian of Silence (mutes your weapons in zones, page storms, shelves that fall in telegraphed lines).
- **Chapter V — The Hive Below**: the swarm's origin, living tunnels. Enemies: broodlings (huge numbers, tiny),
  acid spitters, carapace chargers, egg sacs (hatch if not killed), hive drones. Hazards: hatching egg fields, acid
  pools. Minis: the Hive Knight, the Twin Larvae. Boss: the Swarm Mind (summons waves, spawns armoured nodes you must
  break, final phase shrinks the arena). New epilogue + credits after this.

Balance each chapter so it is a step up from the last (the bot clears it on 1 of 3 seeds without meta).

## Phase 4 — more animation and polish

- Hero attack poses (a swing/throw frame when weapons fire), hit reactions, a dash smear, idle breathing.
- Enemy spawn-in animations (rise from a portal / crawl out of the ground), per-type death animations.
- Boss intros: a short camera-safe (no shake) zoom-and-title card; boss death slow-mo.
- UI: level-up cards flip in, chest lid opens, menu screen transitions, results counting up.
- All of it must respect Reduced effects and keep the sim under ~2 ms/frame with 400 enemies (check `msPerFrame` in
  the bot output).
