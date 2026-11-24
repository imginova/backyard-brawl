# Backyard Brawl: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this project. Claude Code reads `CLAUDE.md` automatically when it starts in this folder. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**Backyard Brawl** is a free, turn-based **Plants vs. Zombies fan game** in ASCII art, made on 2026-11-23 from the owner's own design sheet: their plants, movesets, abilities, stats and zombies. You walk a map, fight waves of zombies with a team of up to 5 plants, level up and pick 4 moves per plant.

- **Owner:** the `imginova` GitHub account (Jake Harris's son), who also makes *Bare Bones Custom Night* (`C:\git\bbcn`) and *Lawn Legends* (`C:\git\pvz-rpg`, a different PvZ RPG). They're new to programming: explain changes in plain language and avoid jargon.
- **Where it lives:** its own folder, `C:\git\backyard-brawl` (owner's choice: "new game", not part of Lawn Legends). Public GitHub repository https://github.com/imginova/backyard-brawl (created by the owner on 2026-11-24); website https://imginova.github.io/backyard-brawl/ (see "Hosting").
- **Private Artifact link:** https://claude.ai/artifact/RptZCtsoUmiALyKRDiVrbR (only the owner and people they share it with through the page's Share menu can open it).
- **No build step, no dependencies, no sound files.** `index.html` works when double-clicked.

## Fan game rules (keep these)

- **It stays free.** No price, ads or donations.
- **It must say it's a fan game.** The title screen says "Free fan game. Not affiliated with PopCap Games or Electronic Arts."
- **Only the names are borrowed.** Every drawing, sound and number is original.

## Working agreements with the owner

- **Make a plan before big features**, and ask about genuinely ambiguous design choices (the owner answers well through multiple-choice questions). Small requests can be done directly.
- **Commit only when asked, and land changes with a pull request.** Work on a new branch from the latest `origin/main` (`git fetch` first: the owner may commit in the browser), commit as `imginova <107283216+imginova@users.noreply.github.com>` (set in this repo's local git config), push the branch and give the owner the compare link (`https://github.com/imginova/backyard-brawl/compare/main...<branch>?expand=1`) to click **Create pull request**, then **Merge**. This computer has no `gh` CLI. Never push straight to `main` (the only exception was the very first push into the empty repo). No work email may appear in files or commits.
- **Never wipe saved progress.** `loadProgress` in `save.js` keeps every saved key, even unknown ones; plants or moves the game doesn't know are skipped when used, never deleted. Test any save change with a fake old save.
- **After every change, republish the private Artifact link** (see Publishing).
- **Keep the split by job and keep the comments**, in the same beginner-friendly style.
- **The design sheet is the owner's.** Keep their stats, costs and wording. When a number has to change for balance, say so and write why next to it in the code (see "Changes from the sheet").

## How the game works

- **Map:** `LAWN_MAP` in `world.js`, a walkable ASCII map (owner's choice over a level path or a menu). Battles (`1`–`8`, `B`) sit on the only path, so they go in order. `R` (Rogue Bonk Choy) is an optional side battle. The secret Garlic battle `S` is behind a **suspicious bush** (`$`, drawn as a hedge `%` in a slightly lighter green) in the bottom hedge row (owner's choice: "hidden spot"). A sign near it hints at the thin hedge. Gate `G` only says "coming in a future update" once the boss is beaten.
- **Unlocks** (owner's choice: from story battles): battle 2 → Potato Mine, 4 → Chomper, 6 → Squash, 8 → Lightning Reed, Rogue → Bonk Choy, secret → Garlic. You start with Peashooter, Sunflower and Wal-nut. A new plant joins one level below your best (`JOIN_BELOW_BEST`) and goes straight into the team if there's room.
- **Battles** (`battle.js`): up to 5 plants against waves of up to 5 zombies. Each round everyone acts once, fastest first (ties random). **Damage = power × attack ÷ 5** (`DAMAGE_DIV`), with no random critical hits. **Sun** is one shared bank (owner's choice): start 50, +15 every round after the first (`SUN_INCOME`; it was 25 until the owner lowered it on 2026-11-24 so Sunflower matters more: at 10 the smart bot beat the boss only 10-17% of the time, so the owner picked 15), Sunflower's Sunny gives +25 on its own turn only, and "Soak up sun" skips a turn for +15. Plants heal 20% between waves and fully after a battle. Only a win gives XP: losing and giving up give none (owner, 2026-11-24; losing used to give half "for trying").
- **Statuses** last a number of the affected unit's own turns and tick down at the end of each of its turns. A unit buffing itself gets +1, so "Power for 2 turns" covers its next 2 turns. Poison 5% and Burn 6% of max HP at the end of its turn. Cooldowns are stored as cd + 1, because they also tick at the end of the turn they're used.
- **Damage types:** blunt, sharp, fire, explosion, electric and poison, plus contact / no contact and pierce. **Bite is sharp**, so Wal-nut's Tough (×0.75 unless sharp, fire or explosion) does **not** soften it. (It was blunt at first, the owner's choice, so Tough would work on it; on 2026-11-24 the owner asked "make bite sharp again".) Zombies' other moves (Bound, Tackle, Ball toss, Wind-up punch) are still blunt. Armor (zombies) and shields (plants) are the same bar and soak damage first. Heavy (Squash) sends half of a blunt hit past armor; Iron jaw (Chomper) makes sharp hits count double against armor.
- **Levels:** max 10, and stats never change. Moves are learned at 3, 6, 8 and 10 (Wal-nut has no level 8 move, on purpose). Each plant equips 4 (owner's choice). XP: `xpToNext = 20 + 15 × level`; every plant you own gets the full XP of a won battle, bench included (owner, 2026-11-24; the bench used to get 40%, `BENCH_XP`), so nobody falls behind.
- **Future worlds: 5 levels each** (owner, 2026-11-24: "for the foreseeable future"). Each new world raises `MAX_LEVEL` by 5 (world 2 → 15, world 3 → 20) and its battles' XP is tuned so beating every battle once gains about those 5 levels (every owned plant gets the same XP, and lost battles give none). The cap stops anyone going further, so the XP only has to be enough. Numbers to aim for: levels 10 → 15 need **1,000 XP** (170 + 185 + 200 + 215 + 230); 15 → 20 need **1,375 XP**. Add up each battle's XP (the `xp` of every zombie in its waves) and adjust the zombies' `xp` or the waves until the world's total matches. World 1 for comparison: the story path (1–8 and B) gives 668 XP, about level 8 from level 1; with the Rogue and secret battles it's 950, enough for level 10. The new levels will need new moves to learn: ask the owner for them.
- **Lineup** (owner's request "add changing your lineup", then "reorder the team"): the Team screen lists the team in battle order with ^ / v buttons (`moveInTeam` in `save.js`); the battlefield shows plants in that order. It's only visual: zombies pick targets at random.
- **Zombie AI** (`aiAct`): uses a cooldown move when it's ready, otherwise a random move. Targets: Provoked → its Squash; else a taunting plant; else anyone. Pole Vaulter's Vault ignores both. Football Zombie's Charge: goes first in its first round, first attack ×1.25. Rogue Bonk Choy trains first, then throws its Wind-up punch.

## Choices made while turning the sheet into code

These weren't on the sheet. They're in the plan the owner approved on 2026-11-23:
- Chain N = N more random enemies at full power. Conductor's extra chain is half power (`CONDUCTOR_PART`).
- Strong will = up to ×2 damage near 0 HP (`2 − hp/maxHp`).
- Drag down only lowers; on bosses and rogues it goes halfway.
- Explode's "removes 30%" = 30% of current HP (`EXPLODE_TAKE`), and Explode needs Potato Mine to be armed.
- Potato Mine's Armed (like Lawn Legends' Buried): armed at the start of each wave; the first enemy to hit it takes a 15-power explosion (`ARMED_POWER`). Lent mines (Lend a mine, Minefield) only go off on contact (12 power).
- **Snap** "always goes first this round" became "goes first NEXT round", because moves are picked after the round's order is set.
- **Triple shot** got a 2-turn cooldown (the sheet had only 50 sun), so it isn't simply a better Quick shot.
- Filled-in costs the owner OK'd: Gatling 100 sun / cd 4, Broad heal 50 / cd 3, Slam 25, Shell donate 25, Come at me 25, Piercing punch 50 / cd 2.
- Garlic's Lingering stench: poison gets +1 turn once per poisoning, as soon as the enemy has poison and another debuff.

## Changes from the sheet (balance, after bot tests)

- **Rogue Bonk Choy has 3× its sheet HP** (`ROGUE_HP` 3, so 450). With 150 HP the smart test bot beat it 84–100% of the time, against about 70% for Football Zombie, but rogues are meant to be stronger than the boss. At 3× it won about 42% (Football 68%) with level-7 teams.
- **The secret battle got a third wave** (`bucket, bucket, cone, pole`): with two waves the bot won 100%. Now about 64% at level 5 and 80% at level 7.

## Balance as tested (2026-11-23)

Two bots, both playing from the game's real rules and running battles synchronously in the browser pane: a **random** bot (random usable move and target) and a **smart** bot (scores moves by damage, heals when hurt, revives when plants are down). A fresh-save playthrough with the smart bot lost no battles before the boss, reached the boss at about level 6–8, and needed 0–9 tries for Football Zombie. Error sweeps (random teams at levels 1–10, random move sets, every battle, about 800 battles) found no errors and no stuck battles, and every move was used at least once. Smite and Flame shift were checked by hand. Plants only reach level 10 after the boss or side battles, so the level 10 moves are late-game.

**Sun income lowered to 15 (2026-11-24):** those numbers were measured at +25 a round. With +15, level-7 random teams and the smart bot: Football Zombie ~34%, Rogue ~29%, secret ~41% (at +25 it was 91% / 42% / 89%). So the Rogue is now about as hard as the boss, not clearly harder.

**Basic zombies down to 65 HP (2026-11-24, owner's request):** Zombie, Conehead and Buckethead went from 80 to 65 HP (armor unchanged). Same test, side by side: boss 41% → 51%, secret 45% → 58%, Rogue about 24% either way, so the Rogue is clearly harder than the boss again. A smart-bot playthrough loses only to the boss (0-5 tries).

**Not checked by a person yet:** how it feels, the sounds, and whether the early battles are too easy (the smart bot never lost one).

## How the code is organized

Plain classic scripts (not modules), loaded in this order by `index.html`. Top-level names are shared, so **names must be unique across files**:

1. `helpers.js`: `$`, `store` (localStorage with try/catch, prefix `backyardbrawl:`), `pick`, `rand`, `chance`, `clamp`, `esc`, `shuffle`.
2. `config.js`: every tuning number.
3. `data.js`: `STATUS`, `DEBUFFS`, `MOVES` (fields explained at the top: `target`, `power`, `hits`, `type`, `contact`, `pierce`, `chain`, `sun`, `cd`, `once`, `heal`, `can`, `ok`, `after`, `use`, `blazeMove`), `PLANTS` (with `passive` flags and `learn` lists; Sunflower has a `blaze` form), `PLANT_ORDER`, `STARTERS`, `ZOMBIES`.
4. `world.js`: `LAWN_MAP`, `WALKABLE`, `SIGNS`, `BATTLES`, `GATE_TEXT`.
5. `art.js`: `DRAWINGS` (art + ink color map + palette, like Lawn Legends), `BARE`, `spriteKey(u)`, `spriteHtml(id)`, `TITLE_ART`.
6. `sound.js`: `tone`, `sfx`, `setMuted`.
7. `save.js`: `progress`, `newProgress`/`loadProgress`/`saveProgress`, `teamIds`, `knownMoves`, `equipped`, `toggleMove`, `toggleTeam`, `moveInTeam`, `giveXp`, `unlockPlant`.
8. `battle.js`: `B`, units (`makePlant`, `makeZombie`), rounds and turns (`nextRound`, `startTurn`, `endTurn`), `hit` (the damage pipeline, with mines and Static field as reactions), `addStatus`, special move helpers, `canUse`, `doMove`, the player's choices, the zombie AI, `winBattle`/`loseBattle`/`giveUp`.
9. `render.js`: `moveMeta`, `render()` for the battle.
10. `screens.js`: `show`, title, map (`renderMap`, `moveMap`, `openPrebattle`), Team screen, result overlay, How to play.
11. `input.js`: every click and key.
12. `main.js`: `boot()` and the `window.backyardBrawl` test hook (`.battle`, `.progress`, `.speed`).

### Gotchas

- `index.html` is a **page fragment** (no doctype/html/head/body) because the Artifact publisher wraps it. It keeps `<meta charset="utf-8">`, and `style.css` keeps the `[hidden]` rule, so double-clicking still works.
- Map rows must all be the same length (40).
- Drawings use `art\`...\`` (String.raw) and must end with a space; the ink must line up character by character with the art.
- `later()` in `battle.js` checks a battle token, so old timers never act on a new battle.

## Testing

No Node.js or Python on this Windows computer. What worked:
- Build one all-in-one HTML file with Perl (inline `style.css` and the scripts), serve it with a small PowerShell `HttpListener` on `127.0.0.1`, and open it in the Claude app's browser pane.
- **Background tabs barely run timers**, so tests replace `later` with a queue and drain it in a loop (`runSync`), with `render = () => {}`. That runs about 400 battles a second.
- Use `store.set = () => {}` in test tabs so the owner's save in the same origin isn't overwritten.

## Hosting (the public website)

- GitHub Pages at https://imginova.github.io/backyard-brawl/. One-time setting on github.com: repo **Settings → Pages → Source = GitHub Actions**. The first merge (pull request #1) ran before that was set, so its deploy step failed; any later merge (or "Run workflow" on the Actions tab) deploys.
- `.github/workflows/deploy.yml` (copied from Lawn Legends) checks every script on every pull request and push, runs `tools/build.js`, and on a push to `main` deploys `dist/` (gitignored).
- `tools/build.js` wraps the `index.html` fragment in a real page, splitting it at `<main` (head material before, body after). It was not run locally (no Node.js on this computer); GitHub runs it.

## Publishing (the private Artifact link)

The Artifact tool only publishes files under the session's working folder or its scratchpad. From a session started in `C:\git\backyard-brawl`, publish `index.html` with `files` mapping `style.css` and all 12 `js/*.js` to the same paths, and `url: https://claude.ai/artifact/RptZCtsoUmiALyKRDiVrbR` (read it first from a new session). The first publish came from a session in `C:\git\bbcn`, which copied the files into its scratchpad first.

## Not done yet

- Only one area (the Lawn); the gate promises more.
- No refights after a battle is won, no shop, no Almanac.
