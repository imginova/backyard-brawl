/* =====================================================================
   config.js: the tuning numbers. MOST BALANCE CHANGES HAPPEN HERE.

   If battles feel too long, too short, too easy or too hard, change a
   number in this file first. Every other file reads these names.
   ===================================================================== */

// ---- Sun: the team's shared resource ---------------------------------
// The whole team spends from ONE sun counter (owner's choice). Basic
// attacks are free; stronger moves cost sun.
const SUN_START = 50;    // sun at the start of a battle
// Sun added at the start of every round after the first. It was 25; the
// owner lowered it on 2026-11-24 so Sunflower's Sunny matters more. At 10
// a test bot beat Football Zombie only about 10-17% of the time (90% at
// 25), so the owner picked 15 (about 34%).
const SUN_INCOME = 15;
const SUNNY_SUN = 25;    // Sunflower's "Sunny" ability: extra sun on each of its turns
const WAIT_SUN = 15;     // "Soak up sun" (skipping a turn) gives this much
const SUN_MAX = 999;     // the counter never goes above this

// ---- Team, moves and levels -------------------------------------------
const MAX_TEAM = 5;      // plants you can bring into a battle
const MAX_MOVES = 4;     // moves a plant can have equipped at once
// The highest level a plant can reach. World 1 (the Lawn) stops at 6
// (owner, 2026-11-24). Each new world raises it: world 2 to 10, world 3 to
// 15, then 5 more per world, and its battles give about enough XP to get
// there. See "Future worlds" in CLAUDE.md for the numbers.
const MAX_LEVEL = 6;
// Levels DON'T raise stats: every plant always has the stats from its
// sheet in data.js. Levels unlock moves (at levels 3, 6, 8 and 10), so the
// level 8 and 10 moves come in world 2.

// XP needed to go from `lvl` to `lvl + 1`.
const xpToNext = lvl => 20 + 15 * lvl;
// Only WINNING gives XP, and every plant you own gets all of it, even the
// ones on the bench (owner, 2026-11-24). Before that, losing gave half the
// XP "for trying" and the bench got 40%.
// The plants that fought (the team) also get this much extra on top, as a
// bonus: 0.25 = 25% more (owner, 2026-11-24: "bonus exp to everyone in the
// battle").
const TEAM_BONUS_XP = 0.25;
// A newly unlocked plant joins this many levels below your best plant,
// so it isn't stuck at level 1 while everyone else is level 5. It was 1;
// it's 0 since 2026-11-24, so plants found late still reach the level cap
// by the end of the world, like everyone else.
const JOIN_BELOW_BEST = 0;

// ---- Damage -----------------------------------------------------------
// damage = power x attack / DAMAGE_DIV, then the bonuses below.
// Example: Peashooter (attack 12) uses Pea shot (power 5):
//   5 x 12 / 5 = 12 damage. A Basic Zombie's Bite does the same.
// There are no random critical hits, so a plan works the way you expect.
const DAMAGE_DIV = 5;

// ---- Status effects (how strong each one is) --------------------------
const POWER_MULT = 1.5;    // "Power": 50% more damage
const RAGE_MULT = 2;       // Bonk Choy's "Come at me": double damage
const WEAK_MULT = 0.7;     // "Weak" (loses power): 30% less damage
const SLOW_MULT = 0.5;     // "Slowed": half speed
const BRITTLE_MULT = 1.5;  // "Brittle" (Chomper's Slobber): takes 50% more damage
const TASTE_STEP = 0.25;   // Chomper's Taste test: +25% damage on an enemy per earlier Chomper hit on it
const SPIKE_POWER = 4;     // Chomper's Spike weed: the hit at the end of each of the enemy's turns
const POISON_PART = 0.05;  // "Poison": loses 5% of max HP at the end of each of its turns
const BURN_PART = 0.06;    // "Burn": loses 6% of max HP at the end of each of its turns
const TOUGH_MULT = 0.75;   // Wal-nut's Tough: takes 3/4 damage (except sharp, fire, explosion)
const CHARGE_MULT = 1.25;  // Football Zombie's Charge: its first attack does 25% more
const CONDUCTOR_PART = 0.5;// Lightning Reed's Conductor: the extra chain does half power
const ARMED_POWER = 15;    // Potato Mine's Armed blast (explosion)
const MINE_POWER = 12;     // the blast of a mine lent to an ally (Lend a mine)
const DETONATE_POWER = 10; // each mine set off by Detonate
const STATIC_POWER = 4;    // Static field's zap on enemies that make contact
const EXPLODE_TAKE = 0.3;  // Explode also takes 30% of each enemy's current HP

// ---- Rogue plants --------------------------------------------------------
// Rogue plants are meant to be tougher than their area's boss (owner).
// With the sheet's 150 HP, a test bot beat Rogue Bonk Choy more often
// than Football Zombie (about 84-100% against 70%), so rogues get 3x the
// HP on their sheet (like Lawn Legends). Then the bot won about 42%.
const ROGUE_HP = 3;

// ---- Between waves -----------------------------------------------------
const WAVE_HEAL = 0.2;     // plants heal 20% of max HP between waves
// After a battle (won or lost) every plant is back to full health.

// ---- Speed of the battle animation (milliseconds) ---------------------
const DELAY_FOE = 650;     // pause before an enemy acts
const DELAY_NEXT = 250;    // pause between turns
