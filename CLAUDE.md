# Swarmbreak — notes for Claude

A sci-fi dark fantasy horde-survival roguelite (Vite + TypeScript + PixiJS v8). Read `README.md` first: it has the
controls, every system, the project layout, and step-by-step recipes for adding a weapon, enemy, boss or map.

## Hard rules (from the owner)

- **Nothing costs real money. No battle pass, no premium currency, no ads, no timers that nag.** Every unlock is earned by playing.
- **No screen shake, ever.** Juice comes from hit-stop, flashes, particles, numbers, sound. Respect `g.reduced` (Reduced effects).
- **All names and art are original** and generated in code (no image files, no copied characters or logos).
- The player should feel strong — "main character, but not *too* overpowered". Lots of enemies, big AoE cleave, punchy crits.
- Every boss/hazard attack is **telegraphed on the ground first** (`g.telegraph()` / `strike()` in `src/game/bosses.ts`).
- Readability matters: numbers use the "Jersey UI" font (unambiguous digits), headings Silkscreen. Decor must never look like an enemy.
- Keep the level-up cadence snappy (the owner disliked "clicking upgrades longer than playing").

## Checks before you call anything done

Run all of these and fix what fails:

```
npx tsc --noEmit
npx eslint .
npm test
npm run build:page          # single-file build -> dist-single/swarmbreak.html
```

Then play-test with the bot (needs `npm run dev` running in another terminal, and `npx playwright install chromium` once):

```
npm run playtest -- --map=graveyard --mode=story --seconds=900 --seed=777
npm run playtest -- --map=black_sun --boss                 # straight to a final boss with a round-5 build
npm run playtest -- --map=cathedral --mode=endless --seconds=900
npm run playtest -- --map=graveyard --boss --overtime      # Victory Cache -> Overtime
```

The last line of output must be `ERRORS:` with nothing after it. Use `--shots=60,300` for screenshots (saved to
`playtest-out/`) and look at them. The bot is a pessimistic, dumb player (it walks into crowds and has no meta upgrades):
a chapter it clears on 1–2 seeds out of 3 is about right; humans find the game easier than the bot does.

Visual checks: render sprites to a PNG and look at them before wiring them in (see `scripts/sheet.ts` for how to draw
`Pix` art to a PNG with pngjs via `npx tsx`). Delete temporary scripts before committing.

Commit as you go, one feature per commit.

## Debug hooks

Open `http://localhost:5173/?debug`: `window.swarmbreak = { ui, app, save }`. `ui.game` is the live `Game`.
In dev you can `await import('/src/game/bosses.ts')` from the page to call `spawnMainBoss(g, id, power, true)` etc.
Settings has a testing toggle that unlocks everything.

## Where things live (quick map)

- Content data: `src/data/*` (characters, weapons, passives/relics, spells, enemies/minis/bosses, maps/rounds/story).
- Rules (pure, unit-tested): `src/systems/*` — build/stat stacking, offers, chest odds + pity, round flow, Endless
  scaling + phase-in (`ENDLESS_UNLOCK`), mastery skill trees + Armory + shard rewards + Victory Cache roll, shop.
- Simulation: `src/game/game.ts` (loop, modals, victory, Overtime, light/darkness), `enemies.ts` (AI behaviours,
  damage, kills, splitting), `bosses.ts` (mini/main boss AI, phases, catch-up relocation), `weapons.ts` + `arsenal.ts`
  (all weapon kinds), `hazards.ts`, `objects.ts` (chests, shrines, Salvage Drone), `decor.ts` (map dressing).
- Art: `src/render/pixel.ts` (`Pix` canvas), `heroArt.ts` (layered hero bodies), `enemyArt.ts`, `cathedralArt.ts`,
  `blackSunArt.ts`, `icons.ts`, `storyArt.ts` (192x108 story scenes), `assets.ts` (packs everything into atlases).
- Audio: `src/audio/audio.ts` (synth SFX), `music.ts` (`TRACKS`: step-sequencer songs, styles ambient/drive/boss/hymn/void).
- UI: `src/ui/ui.ts` (all screens/modals), `hud.ts`, `nav.ts` (keyboard/gamepad focus), `style.css`.
- Saves: `src/core/save.ts` — `SaveData` + `defaultSave()` + a merge for old saves. **Any new save field needs a default
  and must survive loading an older save** (add to the merge and a test).
- Global tuning: `ENEMY_DAMAGE_SCALE` (enemies.ts), round specs (maps.ts), Endless curves (endless.ts), `CACHE_TIERS`.

## State of the game

- Story: 3 chapters (Starship Graveyard → Cathedral Moon → Black Sun), 5 rounds each, kill meters, 2 alternating minis,
  a 3-phase boss, story cards; epilogue + credits after Chapter 3. The boss drops a Victory Cache (coins, a Star Shard
  roll with a jackpot, mastery XP); then See results or Overtime (Endless scaling from the final round, a great boss
  every 150 s). `MAP_ORDER` in maps.ts is the chapter order; the finale logic keys off the last entry.
- Endless on every cleared chapter's map.
- Heroes: all six are playable — Warden (from the start), Glint, Voidcaller, Riven, Fortune, Pyre (unlocked by
  `HERO_UNLOCKS` in `src/systems/heroes.ts`; `isHeroUnlocked` / `syncHeroUnlocks` in `src/core/meta.ts`; celebrated
  heroes are recorded in `save.data.heroes.unlocked`). Passive numbers + pure rules: `src/systems/heroes.ts`; wired
  into the sim by `src/game/heroPassive.ts` (`g.passive`). Bodies: `heroArt.ts` (Warden, Sprout) + `heroBodies.ts`
  (the other five); `HERO_PALETTES`, `HERO_BODIES`. Skill trees: `SKILL_TREES` + per-hero branch names in
  `TREE_BRANCHES` (`src/systems/mastery.ts`); each non-Warden tree's offence capstone has the `passive` perk that
  strengthens the hero's passive. The Sprout skin works on every hero.
- Balance note: the bot keeps ~100 px from mini-bosses, so the melee Warden fights them slower than ranged heroes do;
  compare hero clear times with that in mind.
- 19 weapons + 19 evolutions, 19 passives, 12 relics, 6 spells, 6 weapon + 6 passive slots.
- Meta: hero mastery + free-refund skill trees, Star Shards + Armory, codex, records, run history, stats.
  Not built yet: weapon unlocks (`STARTER_WEAPON_IDS` vs the rest), achievements, cosmetics + collection screen,
  Story difficulty tiers.
- Held for later (don't build unless asked): daily seeded run, play-by-seed codes, build codes, share card, clips.

## Gotchas

- `g.flow` is the story round flow; it is `null` in Endless **and in Overtime**. Use `g.endlessT` (not `g.time`) for
  anything that reads Endless scaling.
- Bosses are `kind: 'boss' | 'mini'` with an `e.boss` state and a `Container` view in `g.bigLayer`; normal enemies are
  pooled particles. A split mini (Crystal Colossus) is two minis with the same `boss.id` — the flow only advances when
  the last one dies (`onBossKilled`).
- Enemy bullets/telegraphs draw above the Black Sun darkness (`worldDark`) on purpose.
- The artifact build is one self-contained HTML file; no external URLs, no `fetch` of assets.
