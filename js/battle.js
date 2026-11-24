/* =====================================================================
   battle.js: the battle state `B` and every battle rule.

   How a battle runs:
     1. startBattle() builds your plants and the first wave of zombies.
     2. Each ROUND, every unit acts once, fastest first (nextRound).
        A unit's go is its TURN: startTurn -> (you pick a move, or the
        zombie AI picks one) -> doMove -> endTurn.
     3. At the end of each of its turns a unit takes poison and burn
        damage, its statuses tick down by 1, and so do its cooldowns.
     4. When a wave is beaten the next one comes in; when the last one
        is beaten you win. If every plant wilts, you lose.

   This file only changes `B` and the save. render.js draws it.
   ===================================================================== */

let B = null;
let uidCount = 0;     // gives every unit a unique number (used by clicks)
let battleSpeed = 1;  // tests set this higher to skip the waiting

// ---- Making units ---------------------------------------------------------
function baseUnit(o) {
  return Object.assign({
    uid: ++uidCount, maxHp: o.hp, armorMax: o.armor, st: {}, cd: {}, used: {}, down: false,
    armed: false, blaze: false, airborne: false, leapAt: null, aftershock: false, charged: false,
    skipNext: false, firstRounds: 0, chargeReady: false, mineBy: null, provokedBy: null,
    lingered: false, armorBroken: false, flash: false,
  }, o);
}

function makePlant(id) {
  const d = PLANTS[id];
  const own = progress.owned[id];
  return baseUnit({ id, side: 'ally', plant: true, def: d, name: d.name, lvl: own ? own.lvl : 1,
    hp: d.hp, atk: d.atk, spd: d.spd, armor: 0, moves: equipped(id) });
}

function makeZombie(id) {
  const d = ZOMBIES[id];
  return baseUnit({ id, side: 'foe', plant: false, def: d, name: d.name,
    hp: d.hp * (d.rogue ? ROGUE_HP : 1), atk: d.atk, spd: d.spd, armor: d.armor || 0, moves: d.moves.slice(),
    boss: !!d.boss, rogue: !!d.rogue });
}

// ---- Small lookups ------------------------------------------------------
// A unit's ability. Sunflower's changes in Solar Blaze form.
const passiveOf = u => (u.blaze ? u.def.blaze.passive : u.def.passive) || {};
const has = (u, flag) => !!passiveOf(u)[flag];
const isBig = t => t.boss || t.rogue;   // bosses and rogue plants
// alliesOf: the unit's own side (living only, unless withDown is true).
const alliesOf = (u, withDown) => (u.side === 'ally' ? B.allies : B.foes).filter(a => withDown || !a.down);
// livingFoes: the other side, minus anyone who can't be targeted right
// now (a Squash in the air).
const livingFoes = u => (u.side === 'ally' ? B.foes : B.allies).filter(t => !t.down && !t.airborne);
const speedOf = u => u.spd * (u.st.slow ? SLOW_MULT : 1);
const debuffCount = t => DEBUFFS.filter(k => t.st[k]).length;
const armorName = t => ({ cone: 'cone', bucket: 'bucket', football: 'helmet' }[t.id] || 'shield');
// The move a unit really uses (Revival blessing is Smite in Solar Blaze form).
function moveFor(u, id) {
  const mv = MOVES[id];
  return u.blaze && mv.blazeMove ? MOVES[mv.blazeMove] : mv;
}
const needsTarget = mv => ['foe', 'ally', 'otherAlly', 'deadAlly'].includes(mv.target);

function say(text) {
  B.log.push(text);
  if (B.log.length > 80) B.log.shift();
}

function addSun(n) {
  B.sun = Math.min(SUN_MAX, B.sun + n);
  sfx.sun();
}

// later(fn, ms) runs fn after a pause, but only if we're still in the
// SAME battle (the player might have given up in the meantime).
function later(fn, ms) {
  const token = B.token;
  setTimeout(() => { if (B && B.token === token && !B.over) fn(); }, ms / battleSpeed);
}

// ---- Starting a battle ----------------------------------------------------
function startBattle(key) {
  const def = BATTLES[key];
  B = {
    key, def, wave: 0, round: 0, sun: SUN_START, token: Math.random(),
    allies: teamIds().map(makePlant), foes: [], queue: [], actor: null,
    phase: 'busy', pick: null, log: [], over: false, xp: 0, tally: new Map(), info: '',
  };
  say(`${def.name}! Wave 1 of ${def.waves.length}.`);
  spawnWave(0);
  show('battle');
  render();
  later(nextRound, DELAY_NEXT * 2);
}

function spawnWave(i) {
  B.foes = B.def.waves[i].map(makeZombie);
  // Football Zombie's Charge: it goes first in its first round.
  B.foes.forEach(z => { if (has(z, 'charge')) { z.chargeReady = true; z.firstRounds = 1; } });
  // Potato Mine's Armed: armed again at the start of every wave.
  B.allies.forEach(a => { if (!a.down && has(a, 'mine')) a.armed = true; });
}

function nextWave() {
  B.wave++;
  B.allies.forEach(a => { if (!a.down) heal(a, a.maxHp * WAVE_HEAL, true); });
  say(`Wave ${B.wave + 1} of ${B.def.waves.length}! Your plants heal a little.`);
  spawnWave(B.wave);
  B.queue = [];
  render();
  later(nextRound, DELAY_NEXT * 2);
}

// ---- Rounds and turns -----------------------------------------------------
function nextRound() {
  B.round++;
  // Say it in the log, so the round's sun isn't mistaken for Sunflower's Sunny.
  if (B.round > 1) { addSun(SUN_INCOME); say(`Round ${B.round}: +${SUN_INCOME} sun.`); }
  const living = [...B.allies, ...B.foes].filter(u => !u.down);
  // Units with `firstRounds` (Snap, Charge) go before everyone else.
  const firsts = living.filter(u => u.firstRounds > 0);
  firsts.forEach(u => u.firstRounds--);
  // Shuffling first means units with the SAME speed go in a random order.
  const bySpeed = list => shuffle(list).sort((a, b) => speedOf(b) - speedOf(a));
  B.queue = [...bySpeed(firsts), ...bySpeed(living.filter(u => !firsts.includes(u)))];
  advance();
}

function advance() {
  if (B.over) return;
  while (B.queue.length && B.queue[0].down) B.queue.shift();
  if (!B.queue.length) return nextRound();
  startTurn(B.queue.shift());
}

function startTurn(u) {
  B.actor = u;
  B.phase = 'busy';
  B.pick = null;
  if (has(u, 'sunny')) { addSun(SUNNY_SUN); say(`${u.name} makes ${SUNNY_SUN} sun.`); }
  // Squash's Leap: landing is its whole turn.
  if (u.airborne) { land(u); return afterAction(u); }
  if (u.skipNext) { u.skipNext = false; say(`${u.name} is catching its breath.`); return endTurn(u); }
  if (u.st.stun) { delete u.st.stun; say(`${u.name} is stunned and skips its turn!`); return endTurn(u); }
  if (u.aftershock) {
    u.aftershock = false;
    say('Aftershock!');
    livingFoes(u).forEach(t => hit(u, t, 5, { type: 'blunt' }));
    flushTally();
    if (resolveEnd()) return;
  }
  if (u.side === 'ally') {
    B.phase = 'pick';   // now we wait for the player (input.js)
    render();
  } else {
    render();
    later(() => aiAct(u), DELAY_FOE);
  }
}

// After a move: did the battle (or the wave) just end? If not, end the turn.
function afterAction(u) {
  if (resolveEnd()) return;
  endTurn(u);
}

function resolveEnd() {
  if (B.over) return true;
  if (B.allies.every(a => a.down)) { loseBattle(); return true; }
  if (B.foes.every(z => z.down)) {
    if (B.wave < B.def.waves.length - 1) nextWave();
    else winBattle();
    return true;
  }
  return false;
}

function endTurn(u) {
  if (!u.down) {
    // Poison and burn hurt at the end of the unit's own turn.
    if (u.st.poison) {
      const n = Math.max(1, Math.round(u.maxHp * POISON_PART));
      loseHp(u, n, 'from poison');
      lingerHeal(u, n);
    }
    if (u.st.burn && !u.down) loseHp(u, Math.max(1, Math.round(u.maxHp * BURN_PART)), 'from burning');
    // Statuses tick down (Stunned is used up by startTurn instead).
    Object.keys(u.st).forEach(k => {
      if (k === 'stun') return;
      if (--u.st[k] <= 0) {
        delete u.st[k];
        if (k === 'poison') u.lingered = false;
        if (k === 'armed') u.mineBy = null;
        if (k === 'provoked') u.provokedBy = null;
      }
    });
    Object.keys(u.cd).forEach(m => { if (--u.cd[m] <= 0) delete u.cd[m]; });
  }
  B.actor = null;
  render();
  if (resolveEnd()) return;
  later(advance, DELAY_NEXT);
}

// ---- Damage, healing and statuses -------------------------------------------
// hit(): the damage pipeline. `o` can have: type, contact, pierce, mult
// (an extra multiplier) and reaction (true for mine blasts and static
// zaps, so they can't set off more reactions). Returns the damage done.
function hit(src, t, power, o = {}) {
  if (!t || t.down) return 0;
  const type = o.type || 'blunt';
  let d = power * src.atk / DAMAGE_DIV;
  if (src.st.power) d *= POWER_MULT;
  if (src.st.rage) d *= RAGE_MULT;
  if (src.st.weak) d *= WEAK_MULT;
  if (has(src, 'strongWill')) d *= 2 - src.hp / src.maxHp;   // x1 at full health, up to x2
  if (o.mult) d *= o.mult;
  if (has(t, 'tough') && !['sharp', 'fire', 'explosion'].includes(type)) d *= TOUGH_MULT;
  d = Math.max(1, Math.round(d));

  // Remember mines before the damage: if the target wilts, they still go off.
  const ownMine = t.armed && has(t, 'mine');
  const lentMine = o.contact && t.st.armed ? t.mineBy : null;

  // Armor soaks damage first, unless the attack pierces.
  //   Heavy (Squash): only half of a blunt hit goes into the armor.
  //   Iron jaw (Chomper): sharp hits count double against armor.
  let toHp = d, soaked = 0;
  if (t.armor > 0 && !o.pierce) {
    const part = has(src, 'heavy') && type === 'blunt' ? d / 2 : d;
    const f = has(src, 'ironJaw') && type === 'sharp' ? 2 : 1;
    soaked = Math.min(t.armor, Math.round(part * f));
    t.armor -= soaked;
    toHp = Math.max(0, Math.round(d - soaked / f));
  }
  t.hp -= toHp;
  t.flash = true;
  const row = B.tally.get(t) || { hp: 0, armor: 0 };
  row.hp += toHp; row.armor += soaked;
  B.tally.set(t, row);
  (type === 'explosion' ? sfx.boom : type === 'electric' ? sfx.zap : sfx.hit)();
  armorCheck(t);
  if (t.hp <= 0) wilt(t);

  // Blaze: every attack burns.
  if (has(src, 'blaze') && !t.down) addStatus(t, 'burn', 2);
  if (!o.reaction && src.side !== t.side) {
    if (ownMine) {
      t.armed = false;
      say(`${t.name}'s mine goes off!`);
      hit(t, src, ARMED_POWER, { type: 'explosion', reaction: true });
    }
    if (lentMine) {
      delete t.st.armed; t.mineBy = null;
      say(`The mine on ${t.name} goes off!`);
      hit(lentMine, src, MINE_POWER, { type: 'explosion', reaction: true });
    }
    if (o.contact && !src.down) {
      const reed = alliesOf(t).find(a => a.st.static);
      if (reed) hit(reed, src, STATIC_POWER, { type: 'electric', reaction: true });
    }
  }
  return toHp + soaked;
}

// Hits are added up per target and written to the log once per move,
// so Gatling burst says "Zombie takes 48" instead of 8 separate lines.
function flushTally(only) {
  for (const [t, row] of B.tally) {
    if (only && t !== only) continue;
    say(`${t.name} takes ${row.hp}${row.armor ? ` (+${row.armor} to its ${armorName(t)})` : ''}.`);
    B.tally.delete(t);
  }
}

function loseHp(u, n, why) {
  if (u.down || n <= 0) return;
  u.hp -= n;
  u.flash = true;
  say(`${u.name} loses ${n} HP ${why}.`);
  if (u.hp <= 0) wilt(u);
}

function armorCheck(t) {
  if (t.armor <= 0 && t.armorMax > 0 && !t.armorBroken) {
    t.armor = 0;
    t.armorBroken = true;
    flushTally(t);
    say(t.plant ? `${t.name}'s shield is gone.` : `${t.name}'s ${armorName(t)} breaks!`);
  }
}

function addArmor(u, n) {
  u.armor += n;
  u.armorMax = Math.max(u.armorMax, u.armor);
  u.armorBroken = false;
  say(`${u.name} gains ${n} ${u.plant ? 'shield' : 'armor'}.`);
}

function wilt(u) {
  if (u.down) return;
  flushTally(u);
  u.hp = 0; u.down = true; u.st = {};
  u.armed = false; u.airborne = false; u.aftershock = false; u.charged = false; u.skipNext = false;
  say(u.plant ? `${u.name} wilted!` : `${u.name} is defeated!`);
  sfx.wilt();
  if (u.side === 'foe') B.xp += u.def.xp;
}

function heal(u, amount, quiet) {
  if (u.down) return 0;
  const n = Math.min(u.maxHp - u.hp, Math.round(amount));
  u.hp += n;
  if (n > 0 && !quiet) { say(`${u.name} heals ${n} HP.`); sfx.heal(); }
  return n;
}

function revive(u, part) {
  u.down = false;
  u.st = {};
  u.hp = Math.max(1, Math.round(u.maxHp * part));
  say(`${u.name} is back in the fight!`);
  sfx.heal();
}

// addStatus(): give a unit a status for some turns. Returns false if it
// didn't stick (wilted, or Bold against a debuff).
// A unit buffing ITSELF gets 1 extra turn, because its statuses tick
// down at the end of this very turn: Focus "for 2 turns" then really
// covers its next 2 turns.
function addStatus(t, key, turns) {
  if (t.down) return false;
  const bad = STATUS[key].bad;
  if (bad && has(t, 'bold')) { say(`${t.name} is Bold and shrugs it off!`); return false; }
  if (t === B.actor) turns += 1;
  t.st[key] = Math.max(t.st[key] || 0, turns);
  if (key === 'poison') t.lingered = false;
  // Garlic's Lingering stench: Poison lasts 1 extra turn on an enemy
  // that also has another debuff (once per Poison).
  if (bad && lingeringAgainst(t) && t.st.poison && !t.lingered && debuffCount(t) >= 2) {
    t.st.poison += 1;
    t.lingered = true;
  }
  say(`${t.name} gets ${STATUS[key].name}.`);
  return true;
}

// Is there a living Garlic (with Lingering stench) on the other side?
function lingeringFoe(t) {
  return (t.side === 'foe' ? B.allies : B.foes).find(g => !g.down && has(g, 'lingering'));
}
const lingeringAgainst = t => !!lingeringFoe(t);

// Garlic heals for half of all poison damage.
function lingerHeal(t, n) {
  const g = lingeringFoe(t);
  if (g) heal(g, n / 2, true);
}

// ---- Special move helpers (used by MOVES in data.js) ------------------------
function land(u) {
  u.airborne = false;
  let t = u.leapAt;
  if (!t || t.down) t = pick(livingFoes(u));
  u.leapAt = null;
  say(`${u.name} comes crashing down!`);
  if (t) hit(u, t, 18, { type: 'blunt', contact: true });
  flushTally();
  render();
}

function dragDown(u, t) {
  const mine = u.hp / u.maxHp;
  const theirs = t.hp / t.maxHp;
  if (mine >= theirs) { say(`${t.name} is already lower than ${u.name}. No effect!`); return; }
  const goal = isBig(t) ? (mine + theirs) / 2 : mine;
  const newHp = Math.max(1, Math.round(t.maxHp * goal));
  say(`${u.name} drags ${t.name} down ${t.hp - newHp} HP!`);
  t.hp = newHp;
  t.flash = true;
}

function countMines(u) {
  return alliesOf(u).filter(a => a.st.armed).length + (u.armed ? 1 : 0);
}

function detonate(u) {
  const mines = alliesOf(u).filter(a => a.st.armed);
  let count = mines.length;
  mines.forEach(a => { delete a.st.armed; a.mineBy = null; });
  if (u.armed) { u.armed = false; count++; }
  say(`${count} mine${count > 1 ? 's' : ''} go off!`);
  for (let i = 0; i < count; i++) livingFoes(u).forEach(t => hit(u, t, DETONATE_POWER, { type: 'explosion' }));
}

function plague(u, t) {
  DEBUFFS.forEach(k => {
    if (!t.st[k]) return;
    livingFoes(u).filter(x => x !== t).forEach(x => {
      if (k === 'stun' && isBig(x)) return;
      if (addStatus(x, k, t.st[k]) && k === 'provoked') x.provokedBy = t.provokedBy;
    });
  });
}

function flameShift(u) {
  const part = u.hp / u.maxHp;
  u.blaze = !u.blaze;
  const s = u.blaze ? u.def.blaze : u.def;
  u.name = s.name; u.maxHp = s.hp; u.atk = s.atk; u.spd = s.spd;
  u.hp = Math.max(1, Math.round(u.maxHp * part));
  say(u.blaze ? 'Sunflower bursts into Solar Blaze!' : 'Solar Blaze cools back into Sunflower.');
}

// ---- Using a move -------------------------------------------------------
// canUse(): '' if the move can be used now, otherwise the reason.
function canUse(u, id) {
  const mv = moveFor(u, id);
  if (u.used[id]) return 'used';
  if (u.cd[id]) return `wait ${u.cd[id]}`;
  if (u.plant && (mv.sun || 0) > B.sun) return `${mv.sun} sun`;
  if (mv.heal && u.blaze) return 'can\'t heal';
  if (mv.can) { const why = mv.can(u); if (why) return why; }
  if (needsTarget(mv) && !validTargets(u, mv).length) return 'no target';
  return '';
}

function validTargets(u, mv) {
  const ok = t => !mv.ok || mv.ok(u, t);
  if (mv.target === 'foe') return livingFoes(u).filter(ok);
  if (mv.target === 'ally') return alliesOf(u).filter(ok);
  if (mv.target === 'otherAlly') return alliesOf(u).filter(t => t !== u && ok(t));
  if (mv.target === 'deadAlly') return alliesOf(u, true).filter(t => t.down);
  return [];
}

function doMove(u, id, t) {
  const mv = moveFor(u, id);
  B.phase = 'busy';
  if (u.plant) B.sun -= mv.sun || 0;
  if (mv.cd) u.cd[id] = mv.cd + 1;   // +1: it also ticks at the end of THIS turn
  if (mv.once) u.used[id] = true;
  const on = t && t !== u && needsTarget(mv) ? ` on ${t.name}` : '';
  say(`${u.name} uses ${mv.name}${on}!`);
  const o = { type: mv.type, contact: mv.contact, pierce: mv.pierce };
  if (u.chargeReady && mv.power) { o.mult = CHARGE_MULT; u.chargeReady = false; }
  if (mv.use) mv.use(u, t);
  else attackWith(u, mv, t, o);
  if (mv.after && !u.down) mv.after(u, t);
  flushTally();
  render();
  afterAction(u);
}

function attackWith(u, mv, t, o) {
  const n = mv.hits || 1;
  if (mv.target === 'allFoes') {
    livingFoes(u).forEach(x => { for (let i = 0; i < n && !u.down; i++) hit(u, x, mv.power, o); });
    return;
  }
  if (mv.target === 'randomFoes') {
    for (let i = 0; i < n && !u.down; i++) {
      const list = livingFoes(u);
      if (!list.length) break;
      hit(u, pick(list), mv.power, o);
    }
    return;
  }
  for (let i = 0; i < n && !u.down && !t.down; i++) hit(u, t, mv.power, o);
  // Chains: extra enemies, picked at random.
  const electric = o.type === 'electric';
  const chains = (mv.chain || 0) + (electric && u.charged ? 2 : 0);
  if (electric) u.charged = false;
  const others = shuffle(livingFoes(u).filter(x => x !== t));
  others.slice(0, chains).forEach(x => { if (!u.down) hit(u, x, mv.power, o); });
  // Lightning Reed's Conductor: one more enemy at half power.
  const extra = others[chains];
  if (electric && extra && has(u, 'conductor') && !u.down) hit(u, extra, mv.power, Object.assign({}, o, { mult: (o.mult || 1) * CONDUCTOR_PART }));
}

// ---- The player's choices (called from input.js) ---------------------------
function playerMove(id) {
  if (!B || B.phase !== 'pick' && B.phase !== 'target') return;
  const u = B.actor;
  const why = canUse(u, id);
  if (why) { B.info = `Can't use that now (${why}).`; return render(); }
  const mv = moveFor(u, id);
  B.info = '';
  if (needsTarget(mv)) {
    B.phase = 'target';
    B.pick = id;
    render();
  } else doMove(u, id, u);
}

function playerTarget(uid) {
  if (!B || B.phase !== 'target') return false;
  const u = B.actor;
  const mv = moveFor(u, B.pick);
  const t = validTargets(u, mv).find(x => x.uid === uid);
  if (!t) return false;
  doMove(u, B.pick, t);
  return true;
}

function cancelPick() {
  if (B && B.phase === 'target') { B.phase = 'pick'; B.pick = null; render(); }
}

function soakSun() {
  if (!B || B.phase !== 'pick' && B.phase !== 'target') return;
  B.phase = 'busy';
  addSun(WAIT_SUN);
  say(`${B.actor.name} soaks up ${WAIT_SUN} sun.`);
  afterAction(B.actor);
}

// ---- The zombie AI -----------------------------------------------------------
// Who a zombie attacks: a Provoked zombie goes for its Squash, otherwise
// a taunting plant, otherwise anyone. Pole Vaulters ignore all of that.
function aiTarget(u) {
  const plants = livingFoes(u);
  if (!plants.length) return null;
  if (!has(u, 'vault')) {
    if (u.st.provoked && plants.includes(u.provokedBy)) return u.provokedBy;
    const taunters = plants.filter(p => p.st.taunt);
    if (taunters.length) return pick(taunters);
  }
  return pick(plants);
}

function aiAct(u) {
  const ready = u.moves.filter(m => !u.cd[m]);
  let id;
  if (u.rogue) {
    // Rogue Bonk Choy trains, then throws its Wind-up punch.
    if (!u.st.power && ready.includes('training')) id = 'training';
    else if (ready.includes('r_wind_up')) id = 'r_wind_up';
    else id = 'rapid_jab';
  } else {
    // Moves with a cooldown are the special ones: use them when ready.
    const specials = ready.filter(m => MOVES[m].cd);
    id = specials.length ? pick(specials) : pick(ready);
  }
  const mv = MOVES[id];
  const t = mv.target === 'foe' ? aiTarget(u) : u;
  if (!t) { say(`${u.name} can't reach anyone!`); return afterAction(u); }
  doMove(u, id, t);
}

// ---- Ending a battle -----------------------------------------------------------
// Every plant you own gets all the XP, in the team or on the bench. The
// plants that fought in the battle (the team) get TEAM_BONUS_XP more.
function shareXp(amount, bonus) {
  const lines = [];
  if (amount <= 0) return lines;
  const team = teamIds();
  Object.keys(progress.owned).forEach(id => {
    if (!PLANTS[id]) return;
    lines.push(...giveXp(id, team.includes(id) ? amount + bonus : amount));
  });
  return lines;
}

function winBattle() {
  B.over = true;
  B.phase = 'over';
  const first = !progress.beaten[B.key];
  progress.beaten[B.key] = true;
  const bonus = Math.round(B.xp * TEAM_BONUS_XP);
  const lines = [`+${B.xp} XP for every plant.`, `+${bonus} bonus XP for the plants that fought.`, ...shareXp(B.xp, bonus)];
  if (first && B.def.unlock && unlockPlant(B.def.unlock)) {
    lines.push(`${PLANTS[B.def.unlock].name} joined your garden!`);
    sfx.unlock();
  } else sfx.win();
  saveProgress();
  render();
  showResult(true, lines);
}

function loseBattle() {
  B.over = true;
  B.phase = 'over';
  // Losing gives no XP: only beaten battles count.
  const lines = [];
  saveProgress();
  sfx.lose();
  render();
  showResult(false, lines);
}

function giveUp() {
  if (!B || B.over) return;
  B.over = true;
  goMap();
}
