# Backyard Brawl

A free, turn-based **Plants vs. Zombies fan game** drawn in ASCII art. Walk across the Lawn, fight waves of zombies with a team of up to 5 plants, level them up and pick their moves.

*Not affiliated with PopCap Games or Electronic Arts. Plants vs. Zombies and its characters belong to them. The drawings, sounds and move numbers here are original.*

## How to play it

Double-click `index.html`. It opens in your browser; no install needed. Your progress saves in that browser by itself.

## What's in the folder

Every file has one job, and every file starts with a comment explaining it.

| File | Its job |
|---|---|
| `index.html` | The structure: the screens, buttons and boxes. It loads everything else. |
| `style.css` | How it looks: colors, fonts, layout. Colors are named at the top. |
| `js/helpers.js` | Tiny tools every file uses (`$`, `store` for saving, `pick`, `shuffle`...). |
| `js/config.js` | **The tuning numbers.** Sun, damage, statuses, XP. Most balance changes go here. |
| `js/data.js` | Every plant, zombie, move and status effect: your design sheet, as code. |
| `js/world.js` | The Lawn's map, the signs and the battles (their waves and unlocks). |
| `js/art.js` | The colored ASCII drawings of every character. |
| `js/sound.js` | The beeps and booms (made in code, no sound files). |
| `js/save.js` | Your progress, leveling up, learning moves, unlocking plants, the lineup. |
| `js/battle.js` | The battle rules: turns, damage, statuses, the zombie AI, winning and losing. |
| `js/render.js` | Draws the battle screen. |
| `js/screens.js` | The title, the map, the Team screen and the result box. |
| `js/input.js` | Every click and key press. |
| `js/main.js` | Starts the game. |

## Changing things

- **A plant's stats or when it learns a move:** `PLANTS` in `js/data.js`.
- **What a move does:** `MOVES` in `js/data.js`. Each move lists its power, type, sun cost and cooldown.
- **A battle's zombies:** `BATTLES` in `js/world.js`.
- **The map:** `LAWN_MAP` in `js/world.js`. Every row must be the same length.
- **Balance (sun, damage, poison...):** `js/config.js`.
