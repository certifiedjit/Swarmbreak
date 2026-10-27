# Swarmbreak

A sci-fi dark fantasy horde-survival roguelite for the browser. Hundreds of void horrors pour out of a dead star system; your weapons fire on their own, you level up constantly, crack open chests, and break mini-bosses and titans. All art and sound are generated in code. Nothing in the game costs real money, ever.

**Current milestone:** the full story — Chapters 1–3 (The Starship Graveyard, The Cathedral Moon, The Black Sun) with an ending and credits — and Endless on every map, with six playable heroes.

## Play

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ (multi-file)
npm run build:single # dist-single/index.html (one self-contained file)
npm run build:page   # dist-single/swarmbreak.html (the same, without <html>/<head> wrappers, for hosting as a page)
npm test             # Vitest
npm run lint         # ESLint
```

### Controls

| | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | WASD / arrows (rebindable) | Left stick / d-pad | Drag anywhere (floating joystick) |
| Spell | Space | A / RB / RT | Round button, bottom right |
| Pause | Esc / P | Start | Pause button, top right |
| Menus | Arrows + Enter, Esc back, R reroll | D-pad + A, B back, X reroll | Tap |

Weapons fire automatically. Settings has music/effects volume, **Reduced effects** (fewer particles, softer flashes, no hit-stop), damage numbers, an FPS counter, key rebinding, and a testing toggle that unlocks Endless without clearing Chapter 1.

### How a run works

- **Story:** 5 rounds. Each round has a kill meter; fill it and a named mini-boss arrives. Beat it for a free chest and a 10-second breather (spawns stop, pickups fly to you), then the next round starts denser and tougher. Round 5 ends with the chapter boss (3 phases). Clearing a chapter unlocks the next one and Endless on that map; clearing Chapter 1 also unlocks the hidden **Sprout** skin. The chapter boss drops a **Victory Cache** instead of an item: coins (which become Star Shards), a Star Shard roll (×1 / ×2 / ×4, or a 3% ×10 jackpot) and mastery XP, doubled on a first clear. Then choose **See results** or **Overtime**: keep your build and keep fighting under Endless scaling that starts at the final round's difficulty, with a great boss every 2½ minutes. The clear is banked the moment you choose. Clearing Chapter 3 rolls the epilogue and credits.
- **Endless:** survive. Threat ticks up every 20 s; enemy HP, damage, speed and density rise; new enemy types phase in over the first minutes. Every 5 minutes: an elite wave, a curse (darkness or a frenzied swarm), or a chapter boss you've beaten returns stronger. A boss you outrun sinks away and re-emerges near you. Each milestone drops a chest. Best time per map and hero is saved.
- **Level-ups** pause the game and offer 3 rarity cards (Common → Legendary; rarer = bigger). Reroll, skip (+5 coins) and banish have limited uses. Every level also adds +2 max HP and +1.2% damage on its own.
- **Chests** cost coins earned in the run, and the price rises each time. Don't want the item? **Leave it** for half the price back (5 coins for a free chest). Odds are shown on the chest (luck raises them). After 3 Commons in a row the next chest is Rare or better.
- **Shrines:** stand inside to charge, then pick a relic. **Cursed shrines** make enemies stronger in exchange for coins, a better chest and an elite wave.
- **Evolutions:** a weapon at level 7 plus its matching passive turns into an evolved form (shown in the Codex once discovered).

### Heroes

Every hero is earned by playing; locked cards show your progress.

| Hero | Unlock | Start kit | Passive |
|---|---|---|---|
| **Warden** — Void-Forged Knight | From the start | Oathblade · Aegis Dash | **Bulwark:** high HP and armour; enemies that hit you take thorns (more with armour). |
| **Glint** — Cyber-Ninja Scout | Beat Chapter 1 | Plasma Glaive · Aegis Dash | **Afterimage:** every 3rd projectile you launch is a guaranteed crit. Fast, 12% dodge, long reach, low HP. |
| **Voidcaller** — Hooded Summoner | Kill 5,000 enemies | Void Spirits · Void Pact | **Binding:** kills have a 3% chance to raise a void spirit; summons last longer; Void Pact cools down 25% faster. 20% less damage to mini-bosses and bosses. |
| **Riven** — Techno-Engineer | Beat Chapter 2 | Sentry Turret · Nova Burst | **Overbuilt:** stand still for 1 s to deploy a field turret (up to 2); +25% damage to elites, mini-bosses and bosses. |
| **Fortune** — Cursed-Coin Rogue | Open 100 chests | Arc Chain · Gem Tempest | **Loaded Dice:** +40% luck, chests 25% cheaper, a free reroll on every level-up; coins you pick up sometimes burst. |
| **Pyre** — Plasma Sorcerer | Survive 15 minutes in Endless | Void Flame · Nova Burst | **Kindling:** a trail of burning ground while you move; up to +60% damage as HP falls. |

### Between runs

- **Mastery:** each hero levels up permanently from the XP you collect in runs, plus a bonus for clearing a chapter. Each mastery level is one skill point for that hero's 12-node **skill tree** (three branches: defence, offence, utility — e.g. the Warden's Bulwark / Oath / Salvage, Glint's Evasion / Edge / Scavenge). Every hero but the Warden has a signature offence capstone that strengthens their passive. Refunds are free and unlimited.
- **Star Shards:** coins you earned and didn't spend convert at the end of a run (10 coins = 1 shard), plus a little for kills and clears. Spend them in the **Armory** on upgrades that apply to every hero: max HP, damage, pickup range, starting coins, coin gain, cheaper chests and shops, and extra rerolls, banishes and skips.
- **Salvage Drone:** lands during every breather (and at each Endless milestone). Walk into it to open a shop: two Rare-or-better upgrades for your build, a full heal, a reroll pack and a sealed Epic-or-better cache. Prices rise each breather. A couple of fresh chests also spawn near you at the start of every round.

### Content in this milestone

- **Chapters:** I — The Starship Graveyard (Star-Titan). III — The Black Sun (Heart of the Black Sun), with blinking rift wraiths, crystal crawlers that shatter into hunting shards, eclipse seers, and star-eaters that drag you toward their maws; gravity wells, and a circle of light that shrinks as each kill meter fills. II — The Cathedral Moon (Organ-Beast), with armoured cultists, candle imps, choir wraiths that sing bullet fans, lunging thorn horrors and ossuary brutes; tolling bells that call the swarm to you, and drifting stained-glass light that heals you but slows you down.

- **Weapons (19, each evolves with a matching passive):** Oathblade → Oathbreaker (+Runeplate), Rune Halo → Rune Corona (+Star Lens), Arc Chain → Tempest Crown (+Conductor Coil), Plasma Glaive → Comet Glaive (+Void-Iron Boots), Seeker Swarm → Hive Barrage (+Twin Capacitor), Gravemaul Slam → Singularity Slam (+Grav Lodestone), Searing Mantle → Sunheart Mantle (+Phoenix Ember), Cryo Shards → Absolute Zero (+Frozen Hourglass), Corrosive Flask → Plague Font (+Blood Chalice), Sweep Laser → Judgement Ray (+Reaper Sigil), Gravity Bombs → Chaos Orbs (+Cursed Clover), Sentry Turret → Bastion Array (+Field Battery), Aegis Wheels → Bramble Bulwark (+Briar Crown), Soul Scythe → Reaper’s Harvest (+Leech Fang), Starfall → Starfall Requiem (+Archive Core), Ricochet Rounds → Phantom Volley (+Phase Veil), Pocket Singularity → Event Horizon (+Void Heart), Void Flame → Abyssal Breath (+Cinder Core), Void Spirits → Void Legion (+Soul Lantern). You can carry 6 weapons and 6 passives.
- **Passives (19)**, 12 stacking relics from chests and shrines, and 6 spells (Aegis Dash, Nova Burst, Chrono Hush, Mending Pulse, Gem Tempest, Void Pact).
- **Enemies:** Scrap Crawler, Corrupted Drone, Void Spawn (telegraphed lunge), Signal Drone (ranged), Volatile Cell (bursts and sets off chain reactions), Mortar Husk (artillery with ground warnings), Scrap Hulk. Any of them can spawn as a named elite: shielded, splitting, swift, summoner or regenerating.
- **Bosses:** Rogue Security Mech (shielded), Drone Swarm Queen (summoner), the Fallen Star-Titan; the Rotted High Priest (raises the dead), the Cathedral Gargoyle (dives), and the Organ-Beast (sound rings with a gap to slip through, pipe-beam chords, fugue spirals, requiems); the Twin-Headed Void Hound (double lunge, twin breath), the Crystal Colossus (splits in two at half health), and the Heart of the Black Sun (orbiting shield shards that must be broken before it takes full damage, flares, flowers, sweeping rays, and an eclipse that closes the light and pulls you in). A boss you outrun re-emerges near you. Every attack is telegraphed on the ground first.
- **Map hazards:** sparking power lines and venting steam (Graveyard), tolling bells and stained-glass light beams (Cathedral), gravity wells and the shrinking light (Black Sun).
- **Juice:** crits and mega-crits, merged damage numbers, hit-stop, multi-kill callouts ("×14 CLEAVE"), kill streaks, frenzy, edge pulses, layered synth SFX with pitch variation, a music track per map plus a boss track. No screen shake, ever.

## Project layout

```
src/
  core/      rng (seeded), spatial hash, math, save (localStorage)
  data/      all tunable content: weapons, passives, relics, spells, enemies, bosses, maps, characters, names
  systems/   pure, unit-tested rules: build/stat stacking, offers/chests/pity, round flow, endless scaling, xp
  game/      the simulation: game loop, enemies, bosses, weapons, pickups, hazards, chests/shrines, particles
  render/    procedural pixel art (heroes, enemies, icons, map tiles, story scenes) packed into atlases
  audio/     WebAudio synth SFX and music
  input/     keyboard, touch joystick, gamepad
  ui/        DOM menus, HUD, modals, styles
tests/       Vitest specs for the systems
```

Performance: enemies, projectiles, particles and pickups are pooled and drawn through batched `ParticleContainer`s; collisions use a uniform spatial hash; the simulation runs on a fixed 60 Hz step; the particle budget shrinks automatically when FPS drops. In testing the simulation costs under 1 ms per frame with 400+ enemies.

## Adding content

**A weapon**
1. Add a `WeaponDef` in `src/data/weapons.ts` (numbers, 6 level deltas, `evolvesWith`/`evolvesInto`) and its evolved form (`evolved: true`, no levels). Add the id to `BASE_WEAPON_IDS`.
2. Reuse an existing `kind` (`arc`, `orbit`, `chain`, `boomerang`, `homing`, `shockwave`, `aura`, `cryo`, `puddle`, `laser`, `bouncer`, `turret`, `wheels`, `scythe`, `starfall`, `ricochet`, `blackhole`, `flame`, `spirits`) or add a new one: extend `WeaponKind`, then add a case in `Arsenal.fire` in `src/game/arsenal.ts` (and a projectile `step` or `update` branch if it needs one).
3. Draw a 16×16 icon in `W_ICONS` in `src/render/icons.ts`.

**An enemy**
1. Add an `EnemyDef` in `src/data/enemies.ts` (pick a `behavior`, or add one and handle it in the `switch` in `updateEnemies`, `src/game/enemies.ts`).
2. Draw it in `src/render/enemyArt.ts` and register it in `ENEMY_DRAW` (2 frames).
3. Give it a spawn weight in a map's round `mix` and/or `endlessMix`, and an unlock time in `ENDLESS_UNLOCK` (`src/systems/endless.ts`) if it should arrive later in Endless.

**A boss or mini-boss**
1. Add a `BossDef` (with `phases` HP thresholds) or `MiniBossDef` (with its `twist`) in `src/data/enemies.ts`.
2. Draw it in `src/render/enemyArt.ts`.
3. Write its attack pattern in `src/game/bosses.ts` (see `titanAI`, `mechAI`, `queenAI`). Use `strike()` and `g.telegraph()` so every attack is warned on the ground first, and `g.after()` for delays.
4. Reference it from a map (`boss`, `minibosses`).

**A map**
1. Add a `MapDef` in `src/data/maps.ts`: 5 `RoundSpec`s, mini-bosses, boss, hazards, chest and shrine counts, `endlessMix`, and story cards. Set `available: true`.
2. Floor art in `src/render/mapArt.ts` (wired in `assets.ts` under `floor`), a decor builder in `src/game/decor.ts`, enemy and boss art (see `src/render/cathedralArt.ts`), a music track in `src/audio/music.ts`, and story scenes in `src/render/storyArt.ts`.
3. New hazard kinds go in `src/game/hazards.ts`.

## Tuning knobs

- `ENEMY_DAMAGE_SCALE` in `src/data/enemies.ts` scales every enemy, mini-boss and boss hit (currently 1.1).
- Round specs per chapter in `src/data/maps.ts`; Endless curves in `src/systems/endless.ts`; Victory Cache odds in `CACHE_TIERS` (`src/systems/mastery.ts`).

## Play-testing

`npm run playtest -- --map=cathedral --mode=story --seed=777` drives a real run with a bot (start `npm run dev` first,
and run `npx playwright install chromium` once). See the header of `scripts/playtest/bot.cjs` for all flags.

## Next steps

See `PLAN.md`: the five other heroes, then unlocks / achievements / cosmetics / difficulty tiers, then Chapters IV–V,
then more animation and polish.
