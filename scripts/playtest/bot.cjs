/**
 * Play-test bot: drives a real run in headless Chromium at accelerated sim speed
 * and logs progress every 15 sim-seconds (phase, round, kills, level, HP, boss HP,
 * damage taken by source, damage split by weapon, sim cost per frame).
 *
 * Needs the dev server running (`npm run dev`) and Playwright's Chromium
 * (`npx playwright install chromium`, once).
 *
 *   npm run playtest -- --map=cathedral --mode=story --seconds=900 --seed=777
 *   npm run playtest -- --map=black_sun --boss            (jump to the final boss with a round-5 build)
 *   npm run playtest -- --map=graveyard --boss --overtime (then choose Overtime)
 *   npm run playtest -- --mode=endless --shots=60,300     (screenshots at those sim times)
 *
 * Flags: --map (graveyard|cathedral|black_sun), --mode (story|endless), --seconds (max sim time),
 * --seed, --boss, --overtime, --shots (comma list), --out (screenshot folder, default playtest-out),
 * --url (default http://localhost:5173/?debug), --character (default warden), --tier (story|normal|veteran|nightmare),
 * --threat (Endless / Overtime starting Threat: 1|10|20|30), --curses (comma list: elites,nohealing,bosses,fast,norerolls).
 * Ends with "ERRORS:" followed by any page errors (none = good).
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? 'true'] : [a, 'true']; }));
const out = args.out || 'playtest-out';
fs.mkdirSync(out, { recursive: true });
const mode = args.mode || 'story';
const maxSim = Number(args.seconds || 900);
const CFG = { seed: Number(args.seed || 12345), map: args.map || 'graveyard', boss: !!args.boss, overtime: !!args.overtime, character: args.character || 'warden', tier: args.tier || 'normal', challenge: { threat: Number(args.threat || 1), curses: (args.curses || '').split(',').filter(Boolean) } };
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (m.text().startsWith('[bot]')) console.log(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
  await page.goto(args.url || 'http://localhost:5173/?debug');
  await page.evaluate((c) => { window.__seed = c.seed; window.__map = c.map; window.__bossTest = c.boss; window.__overtime = c.overtime; window.__character = c.character; window.__tier = c.tier; window.__challenge = c.challenge; }, CFG);
  await page.waitForFunction(() => window.swarmbreak, null, { timeout: 30000 });
  await page.evaluate((mode) => {
    const { ui, save } = window.swarmbreak;
    save.data.settings.unlockAll = true;
    ui.startRun({ mode, map: (window.__map||'graveyard'), character: window.__character || 'warden', skin: 'default', seed: Number(window.__seed || 12345), tier: window.__tier, challenge: window.__challenge });
    const g = ui.game;
    g.input.poll = () => {};
    if (window.__bossTest) {
      // a typical round-5 build, then straight to the final round's last kill
      const ws = ['oathblade', 'arc_chain', 'seeker_swarm', 'cryo_shards', 'rune_halo', 'plasma_glaive'];
      const ps = ['runeplate', 'star_lens', 'conductor_coil', 'void_boots', 'twin_capacitor', 'phoenix_ember'];
      g.build.weapons.length = 0;
      for (const id of ws) { g.applyOffer({ kind: 'newWeapon', id, rarity: 1 }); for (let k = 0; k < 5; k++) g.applyOffer({ kind: 'weaponUp', id, rarity: 1 }); }
      for (const id of ps) { g.applyOffer({ kind: 'newPassive', id, rarity: 1 }); for (let k = 0; k < 3; k++) g.applyOffer({ kind: 'passiveUp', id, rarity: 1 }); }
      g.level = 34; g.refreshStats(); g.hp = g.stats.maxHp; g.weapons.sync();
      g.flow.round = 5; g.flow.kills = g.flow.target - 1;
    }
    window.__bot = { shots: [], lastLog: 0, simCost: 0, ticks: 0, deaths: 0, dmg: {} };
    const orig = g.hurt.bind(g);
    g.hurt = (raw, src) => {
      const hp0 = g.hp; const ok = orig(raw, src);
      if (ok) { let k = src && src.def ? src.def.id : src ? src.kind : ''; if (!k) { const st = new Error().stack.split('\n')[2] || ''; k = (st.match(/at (?:Object\.)?([\w.$]+)/) || [])[1] || 'unknown'; } window.__bot.dmg[k] = (window.__bot.dmg[k] || 0) + (hp0 - g.hp); }
      return ok;
    };
  }, mode);
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal button')].find(x => /Begin/.test(x.textContent)); b && b.click(); });
  let shotAt = (args.shots || "").split(",").filter(Boolean).map(Number);
  let done = false;
  while (!done) {
    const r = await page.evaluate(() => {
      const { ui } = window.swarmbreak;
      const g = ui.game; const B = window.__bot;
      const step = () => {
        // ---- modals
        const modal = document.querySelector('.modals .modal');
        if (modal) {
          if (modal.classList.contains('victory-choice')) { (window.__overtime ? modal.querySelector('.vchoice.ot') : modal.querySelector('.vchoice.end')).click(); console.log('[bot] victory choice: ' + (window.__overtime ? 'OVERTIME' : 'end') + ' at t=' + g.time.toFixed(0)); }
          else if (modal.classList.contains('levelup')) {
            const offers = g.currentOffers || [];
            const pri = (o) => o.kind === 'evolution' ? 100 : o.kind === 'newWeapon' ? 50 + o.rarity : o.kind === 'weaponUp' ? 40 + o.rarity : o.kind === 'newPassive' ? 30 + o.rarity : 20 + o.rarity;
            const cards = [...modal.querySelectorAll('.card')];
            let best = 0; offers.forEach((o, i) => { if (pri(o) > pri(offers[best])) best = i; });
            (cards[best] || cards[0])?.click();
          } else if (modal.classList.contains('chest')) {
            const skip = modal.querySelector('.skip-row button'); if (skip && !modal.classList.contains('revealed')) skip.click();
            const take = [...modal.querySelectorAll('button')].find(b => /Take|Evolve|Claim/.test(b.textContent)); take && take.click();
          } else if (modal.classList.contains('shrine')) modal.querySelector('.card')?.click();
          else if (modal.classList.contains('shop')) {
            // buy the first affordable thing, upgrades first; leave when broke
            const cards = [...modal.querySelectorAll('.shop-grid .card:not(.sold):not(.poor)')];
            if (cards.length && (B.shopBuys = (B.shopBuys || 0) + 1) % 8) cards[0].click();
            else [...modal.querySelectorAll('button')].find(b => /Leave/.test(b.textContent))?.click();
          }
          else if (modal.classList.contains('pause')) [...modal.querySelectorAll('button')].find(b => /Resume/.test(b.textContent))?.click();
          else if (modal.classList.contains('story')) { const bt = [...modal.querySelectorAll('button')].find(b => /See results|Begin|Continue/.test(b.textContent)); if (bt) { console.log('[bot] story card: ' + (modal.querySelector('h2')?.textContent || '')); bt.click(); } }
          else if (modal.classList.contains('credits')) { console.log('[bot] credits'); modal.querySelector('button')?.click(); }
          else if (modal.classList.contains('results')) return 'ended';
        }
        if (!ui.game) return 'ended';
        // ---- movement: flee crowds, dodge shots & telegraphs, seek chests/shrines/gems
        let mx = 0, my = 0;
        for (const e of g.enemies) {
          if (e.dead) continue;
          const dx = g.px - e.x, dy = g.py - e.y; const d2 = dx * dx + dy * dy;
          const R = e.kind === 'boss' ? 120 : e.kind === 'mini' ? 85 : 42;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1; const w = (R - d) / R * (e.kind === 'normal' ? 1 : 4); mx += dx / d * w; my += dy / d * w; }
        }
        for (const b of g.bullets) { const dx = g.px - b.x, dy = g.py - b.y; const d = Math.hypot(dx, dy); if (d < 70) { mx += dx / d * 3 * (70 - d) / 70; my += dy / d * 3 * (70 - d) / 70; } }
        for (const t of g.telegraphs) { if (t.kind !== 'circle') continue; const dx = g.px - t.x, dy = g.py - t.y; const d = Math.hypot(dx, dy); if (d < t.r + 14) { mx += dx / (d || 1) * 6; my += dy / (d || 1) * 6; } }
        // goal
        let goal = null, gd = 1e9;
        for (const c of g.objects.chests) { if (c.opened) continue; if (!(c.free || c.legendary || g.coins >= g.chestCost())) continue; const d = Math.hypot(c.x - g.px, c.y - g.py); if (d < gd) { gd = d; goal = c; } }
        for (const d of g.objects.drones) { if (d.leaving || d.items && d.inside) continue; if (d.items && d.items.every(i => i.sold || i.price > g.coins)) continue; const dd = Math.hypot(d.x - g.px, d.y - g.py); if (dd < gd) { gd = dd; goal = d; } }
        if (false) for (const s of g.objects.shrines) { if (s.spent || s.cursed) continue; const d = Math.hypot(s.x - g.px, s.y - g.py); if (d < gd && d < 900) { gd = d; goal = s; } }
        if (goal) { const dx = goal.x - g.px, dy = goal.y - g.py; const d = Math.hypot(dx, dy) || 1; mx += dx / d * 1.2; my += dy / d * 1.2; }
        const boss = g.enemies.find(e => !e.dead && (e.kind === 'boss' || e.kind === 'mini'));
        if (!goal && boss) { const dx = boss.x - g.px, dy = boss.y - g.py; const d = Math.hypot(dx, dy) || 1; const want = boss.kind === 'boss' ? 150 : 100; const k = d > want ? 1.1 : -0.4; mx += dx / d * k - dy / d * 0.5; my += dy / d * k + dx / d * 0.5; }
        else if (true) { // engage: head for the nearest enemies like a player would
          let ne = null, nd = 1e9;
          for (const e of g.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - g.px, e.y - g.py); if (d < nd) { nd = d; ne = e; } }
          if (ne && nd > 70) { mx += (ne.x - g.px) / nd * 1.0; my += (ne.y - g.py) / nd * 1.0; }
          else { mx += Math.cos(g.time * 0.7) * 0.4; my += Math.sin(g.time * 0.7) * 0.4; }
        }
        else { // circle the map centre so the swarm follows
          const cx = g.map.width / 2, cy = g.map.height / 2; const dx = g.px - cx, dy = g.py - cy; const d = Math.hypot(dx, dy) || 1;
          mx += -dy / d * 0.8 + (d > 500 ? -dx / d * 0.5 : 0); my += dx / d * 0.8 + (d > 500 ? -dy / d * 0.5 : 0);
        }
        const m = Math.hypot(mx, my); g.input.move.x = m > 0.05 ? mx / m : 0; g.input.move.y = m > 0.05 ? my / m : 0;
        if (g.spellCd <= 0 && g.enemies.some(e => !e.dead && Math.hypot(e.x - g.px, e.y - g.py) < 30)) g.input.press('spell');
        const t0 = performance.now();
        ui.frame(1000 / 60);
        B.simCost += performance.now() - t0; B.ticks++; if (ui.game) B.minHp = Math.min(B.minHp ?? 1, ui.game.hp / ui.game.stats.maxHp); if (ui.game && ui.game.revivesUsed > (B.rev||0)) { B.rev = ui.game.revivesUsed; console.log('[bot] REVIVE used at t=' + ui.game.time.toFixed(0)); }
        return null;
      };
      let res = null;
      for (let i = 0; i < 60 * 15 && !res; i++) res = step();
      const g2 = ui.game;
      return { res, t: g2 ? g2.time : -1, info: g2 ? { phase: g2.flow ? g2.flow.phase : 'endless', round: g2.flow ? g2.flow.round : 0, kills: g2.stats_.kills, lvl: g2.level, hp: Math.round(g2.hp), maxHp: Math.round(g2.stats.maxHp), enemies: g2.enemies.length, fx: g2.fx.count, budget: Math.round(g2.fx.budget), pickups: g2.pickups.list.length, coins: g2.coins, chests: g2.stats_.chestsByRarity.join('/'), weapons: g2.build.weapons.map(w => w.id + ':' + w.level).join(','), passives: g2.build.passives.map(p => p.id + ':' + p.level).join(','), boss: g2.bossActive ? Math.round(g2.bossActive.hp) + '/' + Math.round(g2.bossActive.maxHp) + ' p' + g2.bossActive.boss.phase : '-', dmgTaken: Object.entries(window.__bot.dmg).map(([k,v])=>k+':'+Math.round(v)).join(' '), spent: g2.stats_.coinsSpent, earned: g2.stats_.coinsEarned, split: (() => { const d = g2.stats_.damageByWeapon; const t = Object.values(d).reduce((a, b) => a + b, 0) || 1; return Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + ' ' + (v / t * 100).toFixed(0) + '%').join(', '); })(), msPerFrame: (window.__bot.simCost / window.__bot.ticks).toFixed(2), minHp: (window.__bot.minHp ?? 1).toFixed(2), modal: g2.modal, pos: Math.round(g2.px) + "," + Math.round(g2.py), shrines: g2.objects.shrines.map(s => s.spent ? "x" : (s.charge.toFixed(1))).join(" "), boss2: g2.enemies.filter(e => e.kind !== "normal").length, near: Math.round(Math.min(9999, ...g2.enemies.filter(e => !e.dead).map(e => Math.hypot(e.x - g2.px, e.y - g2.py)))), frozen: g2.enemies.filter(e => e.frozen > 0).length, sample: g2.enemies.slice(0, 3).map(e => (e.def ? e.def.id : e.kind) + "@" + Math.round(e.x) + "," + Math.round(e.y) + " sp" + Math.round(e.speed) + " st" + e.state).join(" "), mv: g2.input.move.x.toFixed(2) + "," + g2.input.move.y.toFixed(2), chests: g2.objects.chests.filter(c => !c.opened).map(c => Math.round(Math.hypot(c.x - g2.px, c.y - g2.py)) + (c.free ? "f" : "")).join(" ") } : null };
    });
    if (r.info) console.log(`[t=${r.t.toFixed(0)}] ` + JSON.stringify(r.info));
    await page.evaluate(() => { window.__bot.simCost = 0; window.__bot.ticks = 0; });
    if (shotAt.length && r.t >= shotAt[0]) { shotAt.shift(); await page.evaluate(() => { const g = window.swarmbreak.ui.game; if (g) { g.input.move.x = 0; g.input.move.y = 0; } }); await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/${mode}-t${Math.round(r.t)}.png` }); }
    if (r.res === 'ended' || r.t < 0 || r.t > maxSim || (r.info && r.info.modal === 'ended')) done = true;
  }
  await page.waitForTimeout(2500);
  // click through story-after card if present
  await page.evaluate(() => { [...document.querySelectorAll('.modal button')].find(b => /See results/.test(b.textContent))?.click(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${mode}-end.png` });
  console.log('ERRORS:\n' + errors.slice(0, 15).join('\n'));
  await browser.close();
})();
