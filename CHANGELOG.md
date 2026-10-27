# Changelog

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
