/* =====================================================================
   data.js: every plant, zombie, move and status effect.

   This is the owner's design sheet turned into code. To change what a
   move does, find it in MOVES below. To change a plant's stats or
   which level a move is learned at, find it in PLANTS.

   Words used a lot:
     power    how strong a move is. Damage = power x attack / 5.
     type     blunt, sharp, fire, explosion, electric or poison. Some
              abilities care about it (Wal-nut's Tough, Chomper's Iron jaw).
     contact  the attacker touches the target. Mines and Static field
              only go off on contact.
     pierce   goes straight through armor.
     chain N  also hits N more enemies (picked at random) at full power.
     cd       cooldown: how many of the plant's own turns it must wait
              before using that move again.
     debuff   a bad status: Weak, Slowed, Poison, Burn, Stunned, Provoked.
   ===================================================================== */

// ---- Status effects ----------------------------------------------------
// `bad: true` marks a debuff. Peashooter's Bold ignores those, and
// Garlic's moves count them. Each status lasts a number of the affected
// unit's OWN turns (it ticks down at the end of each of its turns).
const STATUS = {
  power:    { name: 'Power',     desc: '50% more damage' },
  rage:     { name: 'Fired up',  desc: 'double damage' },
  taunt:    { name: 'Taunt',     desc: 'zombies must attack it' },
  armed:    { name: 'Mine',      desc: 'the next enemy that touches it takes an explosion' },
  static:   { name: 'Static',    desc: 'enemies that touch any plant get zapped' },
  weak:     { name: 'Weak',      desc: '30% less damage', bad: true },
  slow:     { name: 'Slowed',    desc: 'half speed', bad: true },
  poison:   { name: 'Poison',    desc: 'loses 5% max HP each turn', bad: true },
  burn:     { name: 'Burn',      desc: 'loses 6% max HP each turn', bad: true },
  stun:     { name: 'Stunned',   desc: 'skips its next turn', bad: true },
  provoked: { name: 'Provoked',  desc: 'must attack Squash', bad: true },
};
const DEBUFFS = Object.keys(STATUS).filter(k => STATUS[k].bad);

// ---- Moves -------------------------------------------------------------
// Fields (all optional except name and desc):
//   target   'foe' (one enemy), 'allFoes', 'randomFoes' (`hits` shots at
//            random enemies), 'self', 'ally' (any living plant),
//            'otherAlly' (not itself), 'team' (every plant), 'deadAlly'
//            (a wilted plant) or 'none'.
//   power, hits, type, contact, pierce, chain   (see the top of the file)
//   sun, cd  cost and cooldown. once: true = once per battle.
//   heal     true for healing moves (Solar Blaze can't use them).
//   can(u)   returns a reason the move can't be used right now, or ''.
//   ok(u,t)  is t a good target? (false = greyed out)
//   after(u, t)  extra effect after the damage.
//   use(u, t)    for moves that do something other than plain damage.
// `u` is the unit using the move and `t` the target. The helpers they
// call (hit, heal, addStatus, say, ...) live in battle.js.
const MOVES = {
  // ===== Peashooter =====
  pea_shot:    { name: 'Pea shot', desc: 'A quick pea.', target: 'foe', power: 5, type: 'blunt' },
  focus:       { name: 'Focus', desc: 'Power for 2 turns.', target: 'self', sun: 25, cd: 3,
                 use: u => addStatus(u, 'power', 2) },
  spread_shot: { name: 'Spread shot', desc: 'Hits every enemy.', target: 'allFoes', power: 4, type: 'blunt', sun: 25, cd: 2 },
  quick_shot:  { name: 'Quick shot', desc: 'A stronger pea with no cooldown.', target: 'foe', power: 7, type: 'blunt', sun: 50 },
  pep_talk:    { name: 'Pep talk', desc: 'An ally gets Power for 1 turn and goes right now.', target: 'otherAlly', sun: 50, cd: 2,
                 use: (u, t) => { addStatus(t, 'power', 1); B.queue.unshift(t); say(`${t.name} is pumped up and goes next!`); } },
  // Triple shot got a 2-turn cooldown (not on the sheet) so it isn't
  // simply a better Quick shot: same cost, but 15 damage instead of 7.
  triple_shot: { name: 'Triple shot', desc: '3 shots on one enemy.', target: 'foe', power: 5, hits: 3, type: 'blunt', sun: 50, cd: 2 },
  gatling:     { name: 'Gatling burst', desc: 'Eight shots at random enemies.', target: 'randomFoes', power: 5, hits: 8, type: 'blunt', sun: 100, cd: 4 },

  // ===== Sunflower =====
  petal_toss:  { name: 'Petal toss', desc: 'A flick of petals.', target: 'foe', power: 5, type: 'blunt' },
  make_sun:    { name: 'Make sun', desc: 'Gain 30 sun.', target: 'none', cd: 2,
                 use: () => { addSun(30); say('+30 sun!'); } },
  soothing_ray:{ name: 'Soothing ray', desc: 'Heal one plant 25% of its max HP.', target: 'ally', sun: 25, cd: 2, heal: true,
                 use: (u, t) => heal(t, t.maxHp * 0.25) },
  seed_shot:   { name: 'Seed shot', desc: 'Fifteen weak seeds at random enemies.', target: 'randomFoes', power: 1, hits: 15, type: 'sharp', sun: 25 },
  broad_heal:  { name: 'Broad heal', desc: 'Heal the whole team 15%.', target: 'team', sun: 50, cd: 3, heal: true,
                 use: u => alliesOf(u).forEach(a => heal(a, a.maxHp * 0.15)) },
  // In Solar Blaze form this move turns into Smite (see `blazeMove`).
  revival:     { name: 'Revival blessing', desc: 'Revive every wilted plant at full HP and heal everyone to full. Plants already full get Power for 2 turns. In Solar Blaze form this is Smite instead.',
                 target: 'team', sun: 200, once: true, heal: true, blazeMove: 'smite',
                 use: u => alliesOf(u, true).forEach(a => {
                   if (a.down) revive(a, 1);
                   else if (a.hp < a.maxHp) heal(a, a.maxHp);
                   else addStatus(a, 'power', 2);
                 }) },
  smite:       { name: 'Smite', desc: 'Removes one enemy, whatever its health. Bosses and rogue plants are immune.', target: 'foe', sun: 200, once: true,
                 ok: (u, t) => !isBig(t),
                 use: (u, t) => { say(`${t.name} is smitten by the sun!`); t.hp = 0; wilt(t); } },
  flame_shift: { name: 'Flame shift', desc: 'Turn into Solar Blaze (40 HP, 18 attack, 15 speed): can\'t heal, but every attack burns for 2 turns. Use it again to shift back.',
                 target: 'none', sun: 50, use: u => flameShift(u) },

  // ===== Wal-nut =====
  roll:        { name: 'Roll', desc: 'Rolls into an enemy.', target: 'foe', power: 5, type: 'blunt', contact: true },
  shell_up:    { name: 'Shell up', desc: 'Gain 30 shield.', target: 'self', sun: 25, cd: 2,
                 use: u => addArmor(u, 30) },
  follow_me:   { name: 'Follow me', desc: 'Taunts every enemy for 2 turns.', target: 'self', sun: 25, cd: 3,
                 use: u => addStatus(u, 'taunt', 2) },
  slam:        { name: 'Slam', desc: 'A heavy body slam.', target: 'foe', power: 8, type: 'blunt', contact: true, sun: 25, cd: 2 },
  shell_donate:{ name: 'Shell donate', desc: 'Give another plant 20 armor.', target: 'otherAlly', sun: 25, cd: 2,
                 use: (u, t) => addArmor(t, 20) },
  nut_bowl:    { name: 'Wal-nut bowl', desc: 'Bowls into an enemy and bounces into 2 more.', target: 'foe', power: 10, type: 'blunt', contact: true, chain: 2, sun: 75, cd: 3 },

  // ===== Potato Mine =====
  dig:         { name: 'Dig', desc: 'Pops up and bonks an enemy.', target: 'foe', power: 6, type: 'blunt', contact: true },
  rearm:       { name: 'Re-arm', desc: 'Arm again.', target: 'none', sun: 25,
                 can: u => (u.armed ? 'already armed' : ''),
                 use: u => { u.armed = true; say(`${u.name} is armed again!`); } },
  explode:     { name: 'Explode', desc: 'Disarms with an explosion that hits every enemy and takes 30% of their health.', target: 'allFoes', sun: 50,
                 can: u => (u.armed ? '' : 'not armed'),
                 use: u => {
                   u.armed = false;
                   livingFoes(u).forEach(t => {
                     hit(u, t, 15, { type: 'explosion' });
                     if (!t.down) loseHp(t, Math.round(t.hp * EXPLODE_TAKE), 'from the blast');
                   });
                 } },
  spudow:      { name: 'Spudow', desc: 'An explosion that goes through armor.', target: 'foe', power: 10, type: 'explosion', pierce: true, sun: 75, cd: 2 },
  lend_mine:   { name: 'Lend a mine', desc: 'Another plant is mined for 2 turns: the next enemy that touches it takes a 12-power explosion.', target: 'otherAlly', sun: 50, cd: 3,
                 use: (u, t) => { addStatus(t, 'armed', 2); t.mineBy = u; } },
  minefield:   { name: 'Minefield', desc: 'Every other plant is mined for 1 turn.', target: 'team', sun: 75, cd: 4,
                 use: u => alliesOf(u).filter(a => a !== u).forEach(a => { addStatus(a, 'armed', 1); a.mineBy = u; }) },
  detonate:    { name: 'Detonate', desc: 'Every mine on your team blows up for 10 explosion damage to every enemy.', target: 'allFoes', sun: 100, cd: 4,
                 can: u => (countMines(u) ? '' : 'no mines out'),
                 use: u => detonate(u) },

  // ===== Chomper =====
  crunch:      { name: 'Crunch', desc: 'A big bite.', target: 'foe', power: 5, type: 'sharp', contact: true },
  tear_off:    { name: 'Tear off', desc: 'Rips 40 armor off one enemy.', target: 'foe', sun: 25, cd: 2,
                 ok: (u, t) => t.armor > 0,
                 use: (u, t) => { const took = Math.min(40, t.armor); t.armor -= took; say(`${u.name} rips ${took} armor off ${t.name}!`); armorCheck(t); } },
  thrash:      { name: 'Thrash', desc: 'Bites at every enemy.', target: 'allFoes', power: 4, type: 'sharp', contact: true, sun: 25, cd: 2 },
  // The sheet says "always goes first this round". A move is picked on
  // the plant's own turn, after the round's order is set, so Snap makes
  // Chomper go first NEXT round instead.
  snap:        { name: 'Snap', desc: 'A fast snap. Chomper goes first next round.', target: 'foe', power: 8, type: 'sharp', contact: true, sun: 50, cd: 2,
                 after: u => { u.firstRounds = Math.max(u.firstRounds, 1); } },
  hungry:      { name: 'Hungry', desc: 'Power for 2 turns and heal 10%.', target: 'self', sun: 35, cd: 3,
                 use: u => { addStatus(u, 'power', 2); heal(u, u.maxHp * 0.1); } },
  gulp_armor:  { name: 'Gulp armor', desc: 'Eats ALL of one enemy\'s armor and keeps it as shield (up to 60).', target: 'foe', sun: 75, cd: 4,
                 ok: (u, t) => t.armor > 0,
                 use: (u, t) => { const took = t.armor; t.armor = 0; say(`${u.name} gulps down ${t.name}'s armor!`); armorCheck(t); addArmor(u, Math.min(60, took)); } },
  jaws:        { name: 'Jaws of the lawn', desc: 'A huge chomp.', target: 'foe', power: 20, type: 'sharp', contact: true, sun: 100, cd: 3 },

  // ===== Squash =====
  plop:        { name: 'Plop', desc: 'Plops onto an enemy.', target: 'foe', power: 6, type: 'blunt', contact: true },
  glare:       { name: 'Hmm?', desc: 'Glares at one enemy: it must attack Squash for 2 turns. Squash gains 20 shield.', target: 'foe', sun: 25, cd: 2,
                 use: (u, t) => { if (addStatus(t, 'provoked', 2)) t.provokedBy = u; addArmor(u, 20); } },
  leap:        { name: 'Leap', desc: 'Jumps up (can\'t be targeted) and lands next turn on the enemy for 18 power.', target: 'foe', sun: 50, cd: 3,
                 use: (u, t) => { u.airborne = true; u.leapAt = t; say(`${u.name} leaps into the air!`); } },
  ground_pound:{ name: 'Ground pound', desc: 'Pounds every enemy.', target: 'allFoes', power: 6, type: 'blunt', contact: true, sun: 50, cd: 2 },
  flatten:     { name: 'Flatten', desc: 'The enemy is Weak for 2 turns.', target: 'foe', power: 12, type: 'blunt', contact: true, sun: 50, cd: 3,
                 after: (u, t) => addStatus(t, 'weak', 2) },
  aftershock:  { name: 'Aftershock', desc: '5 power to every enemy now, and again at the start of Squash\'s next turn.', target: 'allFoes', power: 5, type: 'blunt', sun: 75, cd: 3,
                 after: u => { u.aftershock = true; } },
  mega_squash: { name: 'Mega squash', desc: 'A massive squash. Squash skips its next turn.', target: 'foe', power: 30, type: 'blunt', contact: true, sun: 100, cd: 4,
                 after: u => { u.skipNext = true; } },

  // ===== Lightning Reed =====
  zap:         { name: 'Zap', desc: 'A small zap.', target: 'foe', power: 4, type: 'electric' },
  charge_up:   { name: 'Charge up', desc: 'Lightning Reed\'s next attack chains 2 more times.', target: 'self', sun: 25, cd: 2,
                 use: u => { u.charged = true; say(`${u.name} crackles with charge!`); } },
  arc:         { name: 'Arc', desc: 'Lightning that jumps to 2 more enemies.', target: 'foe', power: 6, type: 'electric', chain: 2, sun: 25, cd: 2 },
  thunderbolt: { name: 'Thunderbolt', desc: 'A big bolt.', target: 'foe', power: 10, type: 'electric', sun: 50, cd: 2 },
  defib:       { name: 'Defibrillator', desc: 'Brings a wilted plant back at 30% HP.', target: 'deadAlly', sun: 100, once: true,
                 use: (u, t) => revive(t, 0.3) },
  static_field:{ name: 'Static field', desc: 'For 3 turns, enemies that touch any plant take 4 electric.', target: 'self', sun: 50, cd: 4,
                 use: u => addStatus(u, 'static', 3) },
  thunderstorm:{ name: 'Thunderstorm', desc: 'Hits every enemy 3 times.', target: 'allFoes', power: 5, hits: 3, type: 'electric', sun: 100, cd: 3 },

  // ===== Bonk Choy =====
  rapid_jab:   { name: 'Rapid jab', desc: 'Four quick jabs.', target: 'foe', power: 2, hits: 4, type: 'blunt', contact: true },
  training:    { name: 'Training', desc: 'Power for 2 turns.', target: 'self', sun: 35, cd: 2,
                 use: u => addStatus(u, 'power', 2) },
  wind_up:     { name: 'Wind-up punch', desc: 'A huge punch.', target: 'foe', power: 20, type: 'blunt', contact: true, sun: 50, cd: 3 },
  come_at_me:  { name: 'Come at me', desc: 'Double damage for 1 turn, but Bonk Choy taunts.', target: 'self', sun: 25, cd: 3,
                 use: u => { addStatus(u, 'rage', 1); addStatus(u, 'taunt', 1); } },
  drag_down:   { name: 'Drag down', desc: 'Drops an enemy\'s health to the same percent as Bonk Choy\'s (bosses and rogues: halfway there).', target: 'foe', sun: 50, cd: 4,
                 use: (u, t) => dragDown(u, t) },
  pierce_punch:{ name: 'Piercing punch', desc: 'Goes through armor.', target: 'foe', power: 10, type: 'blunt', contact: true, pierce: true, sun: 50, cd: 2 },
  beat_up:     { name: 'Full beat up', desc: 'Punches every enemy.', target: 'allFoes', power: 15, type: 'blunt', contact: true, sun: 100, cd: 3 },

  // ===== Garlic =====
  breath:      { name: 'Garlic breath', desc: 'Poison for 2 turns.', target: 'foe', power: 3, type: 'poison',
                 after: (u, t) => addStatus(t, 'poison', 2) },
  stink_cloud: { name: 'Stink cloud', desc: 'Every enemy is Weak for 2 turns.', target: 'allFoes', sun: 25, cd: 3,
                 use: u => livingFoes(u).forEach(t => addStatus(t, 'weak', 2)) },
  clove_wall:  { name: 'Clove wall', desc: 'Gain 30 shield and taunt for 1 turn.', target: 'self', sun: 25, cd: 3,
                 use: u => { addArmor(u, 30); addStatus(u, 'taunt', 1); } },
  sicken:      { name: 'Sicken', desc: 'A Poisoned enemy is also Slowed for 2 turns.', target: 'foe', sun: 25, cd: 2,
                 ok: (u, t) => !!t.st.poison,
                 use: (u, t) => addStatus(t, 'slow', 2) },
  choke:       { name: 'Choke', desc: 'An enemy with 2 or more debuffs skips its next turn (bosses and rogues are Slowed instead).', target: 'foe', sun: 50, cd: 4,
                 ok: (u, t) => debuffCount(t) >= 2,
                 use: (u, t) => addStatus(t, isBig(t) ? 'slow' : 'stun', isBig(t) ? 2 : 1) },
  fester:      { name: 'Fester', desc: 'Every debuff on one enemy lasts 2 more turns.', target: 'foe', sun: 50, cd: 3,
                 ok: (u, t) => debuffCount(t) > 0,
                 use: (u, t) => { DEBUFFS.forEach(k => { if (t.st[k] && k !== 'stun') t.st[k] += 2; }); say(`${t.name}'s debuffs fester!`); } },
  plague:      { name: 'Plague', desc: 'Copies every debuff on one enemy onto all enemies.', target: 'foe', sun: 100, cd: 4,
                 ok: (u, t) => debuffCount(t) > 0,
                 use: (u, t) => plague(u, t) },

  // ===== Zombie moves (zombies never pay sun) =====
  // Bite is blunt (owner's choice), so Wal-nut's Tough works on it.
  bite:        { name: 'Bite', desc: 'Chomp.', target: 'foe', power: 5, type: 'blunt', contact: true },
  bound:       { name: 'Bound', desc: 'Vaults onto a plant.', target: 'foe', power: 8, type: 'blunt', contact: true, cd: 2 },
  tackle:      { name: 'Tackle', desc: 'A full-speed tackle.', target: 'foe', power: 8, type: 'blunt', contact: true },
  ball_toss:   { name: 'Ball toss', desc: 'Throws a ball that bounces to a second plant.', target: 'foe', power: 5, type: 'blunt', chain: 1 },
  // The rogue's punch is 15 power on the sheet (the plant's is 20).
  r_wind_up:   { name: 'Wind-up punch', desc: 'A huge punch.', target: 'foe', power: 15, type: 'blunt', contact: true, cd: 3 },
};

// ---- Plants ------------------------------------------------------------
// hp / atk / spd are the owner's numbers. `learn` lists [level, move id]:
// a plant knows every move whose level it has reached. `color` is the
// CSS class its drawing and name use (see style.css).
const PLANTS = {
  peashooter: {
    name: 'Peashooter', color: 'c-pea', hp: 70, atk: 12, spd: 10,
    passive: { name: 'Bold', desc: 'Can\'t be debuffed.', bold: true },
    learn: [[1, 'pea_shot'], [1, 'focus'], [1, 'spread_shot'], [3, 'quick_shot'], [6, 'pep_talk'], [8, 'triple_shot'], [10, 'gatling']],
  },
  sunflower: {
    name: 'Sunflower', color: 'c-sun', hp: 75, atk: 6, spd: 8,
    passive: { name: 'Sunny', desc: '+25 sun on each of its turns.', sunny: true },
    // Flame shift turns it into this form (Solar Blaze).
    blaze: { name: 'Solar Blaze', color: 'c-blaze', hp: 40, atk: 18, spd: 15,
             passive: { name: 'Blaze', desc: 'Can\'t heal, but every attack burns for 2 turns.', blaze: true } },
    learn: [[1, 'petal_toss'], [1, 'make_sun'], [1, 'soothing_ray'], [3, 'seed_shot'], [6, 'broad_heal'], [8, 'revival'], [10, 'flame_shift']],
  },
  walnut: {
    name: 'Wal-nut', color: 'c-nut', hp: 160, atk: 7, spd: 4,
    passive: { name: 'Tough', desc: 'Takes 3/4 damage from everything that isn\'t sharp, fire or explosion.', tough: true },
    // No level 8 move: that's on purpose (owner).
    learn: [[1, 'roll'], [1, 'shell_up'], [1, 'follow_me'], [3, 'slam'], [6, 'shell_donate'], [10, 'nut_bowl']],
  },
  potatomine: {
    name: 'Potato Mine', color: 'c-spud', hp: 40, atk: 13, spd: 16,
    passive: { name: 'Armed', desc: 'Armed at the start of each wave. The first enemy to hit it takes a 15-power explosion.', mine: true },
    learn: [[1, 'dig'], [1, 'rearm'], [1, 'explode'], [3, 'spudow'], [6, 'lend_mine'], [8, 'minefield'], [10, 'detonate']],
  },
  chomper: {
    name: 'Chomper', color: 'c-chomp', hp: 70, atk: 17, spd: 9,
    passive: { name: 'Iron jaw', desc: 'Sharp attacks do double damage to armor.', ironJaw: true },
    learn: [[1, 'crunch'], [1, 'tear_off'], [1, 'thrash'], [3, 'snap'], [6, 'hungry'], [8, 'gulp_armor'], [10, 'jaws']],
  },
  squash: {
    name: 'Squash', color: 'c-squash', hp: 100, atk: 20, spd: 5,
    passive: { name: 'Heavy', desc: 'Blunt attacks ignore half of an enemy\'s armor.', heavy: true },
    learn: [[1, 'plop'], [1, 'glare'], [1, 'leap'], [3, 'ground_pound'], [6, 'flatten'], [8, 'aftershock'], [10, 'mega_squash']],
  },
  lightningreed: {
    name: 'Lightning Reed', color: 'c-reed', hp: 60, atk: 15, spd: 13,
    passive: { name: 'Conductor', desc: 'Every electric attack on one enemy also chains to 1 more enemy at half power.', conductor: true },
    learn: [[1, 'zap'], [1, 'charge_up'], [1, 'arc'], [3, 'thunderbolt'], [6, 'defib'], [8, 'static_field'], [10, 'thunderstorm']],
  },
  bonkchoy: {
    name: 'Bonk Choy', color: 'c-bonk', hp: 60, atk: 16, spd: 9,
    passive: { name: 'Strong will', desc: 'Gets stronger the lower its health (up to double damage).', strongWill: true },
    learn: [[1, 'rapid_jab'], [1, 'training'], [1, 'wind_up'], [3, 'come_at_me'], [6, 'drag_down'], [8, 'pierce_punch'], [10, 'beat_up']],
  },
  garlic: {
    name: 'Garlic', color: 'c-garlic', hp: 130, atk: 6, spd: 5,
    passive: { name: 'Lingering stench', desc: 'Poison lasts 1 extra turn on enemies that have another debuff. Garlic heals for half of all poison damage.', lingering: true },
    learn: [[1, 'breath'], [1, 'stink_cloud'], [1, 'clove_wall'], [3, 'sicken'], [6, 'choke'], [8, 'fester'], [10, 'plague']],
  },
};
const PLANT_ORDER = Object.keys(PLANTS);
const STARTERS = ['peashooter', 'sunflower', 'walnut'];

// ---- Zombies -----------------------------------------------------------
// armor soaks damage before HP (cones, buckets, helmets). `bare` is the
// zombie whose drawing to use once the armor is gone. `xp` is what
// beating it is worth. `boss` and `rogue` make them immune to Smite and
// resist Choke and Drag down.
// The three basic zombies (Zombie, Conehead, Buckethead) went from 80 to
// 65 HP on 2026-11-24 (owner's request).
const ZOMBIES = {
  basic:    { name: 'Zombie', color: 'c-zom', hp: 65, atk: 12, spd: 8, moves: ['bite'], xp: 10,
              desc: 'Shambles up and bites.' },
  cone:     { name: 'Conehead', color: 'c-cone', hp: 65, armor: 80, atk: 12, spd: 8, moves: ['bite'], xp: 14, bare: 'basic',
              desc: 'A traffic cone soaks 80 damage first. Chomper and piercing attacks get through it fast.' },
  bucket:   { name: 'Buckethead', color: 'c-bucket', hp: 65, armor: 120, atk: 13, spd: 8, moves: ['bite'], xp: 18, bare: 'basic',
              desc: 'A bucket soaks 120 damage first. Tear it off or go straight through it.' },
  pole:     { name: 'Pole Vaulter', color: 'c-pole', hp: 65, atk: 12, spd: 12, moves: ['bite', 'bound'], xp: 14,
              passive: { name: 'Vault', desc: 'Ignores Taunt and Provoked: it attacks whoever it likes.', vault: true },
              desc: 'Fast, and taunts don\'t work on it. Low health, so hit it hard.' },
  football: { name: 'Football Zombie', color: 'c-foot', hp: 100, armor: 200, atk: 20, spd: 18, moves: ['tackle', 'ball_toss'], xp: 60, boss: true, bare: 'basic',
              passive: { name: 'Charge', desc: 'Its first attack always goes first and does 1.25x damage.', charge: true },
              desc: 'The Lawn\'s boss. A 200-armor helmet: rip it off or pierce it.' },
  // Rogue plants get ROGUE_HP (3x) this HP in battle (see config.js).
  roguebonk:{ name: 'Rogue Bonk Choy', color: 'c-rogue', hp: 150, atk: 30, spd: 15, moves: ['rapid_jab', 'training', 'r_wind_up'], xp: 80, rogue: true,
              passive: { name: 'Strong will', desc: 'Gets stronger the lower its health.', strongWill: true },
              desc: 'A wild Bonk Choy, stronger than the boss. Beat it to have it join you.' },
};
