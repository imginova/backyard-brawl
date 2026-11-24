/* =====================================================================
   save.js: your progress (plants, team, beaten battles, where you are)
   and the rules for leveling up and unlocking plants.

   Progress is saved in the browser under the key "backyardbrawl:save2".
   loadProgress() keeps EVERY key it finds in an old save, even ones it
   doesn't know, so a newer or older version of the game never throws
   anything away.
   ===================================================================== */

// Which saved key holds your progress. It was 'save' until 2026-11-24,
// when world 1's levels were redone and the owner asked to reset
// everyone's progress once. Moving to a new key starts everyone fresh,
// but the old save is NOT deleted: it's still in the browser under
// "backyardbrawl:save" in case it's ever wanted back.
const SAVE_KEY = 'save2';

function newProgress() {
  const owned = {};
  STARTERS.forEach(id => { owned[id] = { lvl: 1, xp: 0, equip: startingMoves(id, 1) }; });
  return {
    owned,                       // { plant id: { lvl, xp, equip: [move ids] } }
    team: STARTERS.slice(),      // the plants you bring into battle (up to 5)
    beaten: {},                  // { battle key: true }
    pos: findStart(),            // { x, y } on the map
    introSeen: false,
  };
}

// Where the "@" is on the map.
function findStart() {
  for (let y = 0; y < LAWN_MAP.length; y++) {
    const x = LAWN_MAP[y].indexOf('@');
    if (x >= 0) return { x, y };
  }
  return { x: 1, y: 1 };
}

let progress = newProgress();

function hasSave() {
  return store.get(SAVE_KEY, null) != null;
}

function loadProgress() {
  const saved = store.get(SAVE_KEY, null);
  progress = newProgress();
  if (saved && typeof saved === 'object') {
    // Copy every saved key over the fresh defaults (unknown keys too).
    Object.assign(progress, saved);
    progress.owned = Object.assign({}, saved.owned || {});
    progress.beaten = Object.assign({}, saved.beaten || {});
  }
  // A team with no usable plants in it (shouldn't happen) gets the plants you own.
  if (!teamIds().length) progress.team = Object.keys(progress.owned).filter(id => PLANTS[id]).slice(0, MAX_TEAM);
}

// The team's plants that this version of the game knows. A plant from a
// newer version stays in the saved team, it just doesn't fight here.
function teamIds() {
  return (progress.team || []).filter(id => progress.owned[id] && PLANTS[id]);
}

function saveProgress() {
  store.set(SAVE_KEY, progress);
}

// ---- Moves --------------------------------------------------------------
// The moves a plant knows at a level (in the order it learns them).
function knownMoves(id, lvl) {
  return PLANTS[id].learn.filter(([at]) => lvl >= at).map(([, m]) => m);
}

// A new plant starts with its first 4 known moves equipped.
function startingMoves(id, lvl) {
  return knownMoves(id, lvl).slice(0, MAX_MOVES);
}

// The moves a plant brings into battle. A saved move that no longer
// exists is skipped here (not deleted from the save).
function equipped(id) {
  const own = progress.owned[id];
  const list = (own && own.equip || []).filter(m => MOVES[m]);
  return list.length ? list : startingMoves(id, own ? own.lvl : 1);
}

// Team screen: turn a move on or off. Returns a message if it can't.
function toggleMove(id, move) {
  const own = progress.owned[id];
  const list = equipped(id).slice();
  const i = list.indexOf(move);
  if (i >= 0) {
    if (list.length === 1) return 'A plant needs at least one move.';
    list.splice(i, 1);
  } else {
    if (list.length >= MAX_MOVES) return `Only ${MAX_MOVES} moves at once: turn one off first.`;
    list.push(move);
  }
  own.equip = list;
  saveProgress();
  return '';
}

// Team screen: put a plant in or out of the team.
function toggleTeam(id) {
  const i = progress.team.indexOf(id);
  if (i >= 0) {
    if (teamIds().length === 1) return 'You need at least one plant.';
    progress.team.splice(i, 1);
  } else {
    if (teamIds().length >= MAX_TEAM) return `Only ${MAX_TEAM} plants fit in a team.`;
    progress.team.push(id);
  }
  saveProgress();
  return '';
}

// Team screen: move a plant up (dir -1) or down (dir +1) in the lineup,
// the order your plants stand in on the battlefield.
function moveInTeam(id, dir) {
  const t = progress.team;
  const i = t.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= t.length) return;
  [t[i], t[j]] = [t[j], t[i]];   // swap the two places
  saveProgress();
}

// ---- XP and unlocks ------------------------------------------------------
// giveXp adds XP to one plant and returns lines like "Peashooter reached
// level 3!" and "...learned Quick shot!". A newly learned move is put
// straight into a free move slot, if there is one.
function giveXp(id, amount) {
  const own = progress.owned[id];
  const lines = [];
  if (!own || own.lvl >= MAX_LEVEL) return lines;
  own.xp += Math.round(amount);
  while (own.lvl < MAX_LEVEL && own.xp >= xpToNext(own.lvl)) {
    own.xp -= xpToNext(own.lvl);
    own.lvl++;
    lines.push(`${PLANTS[id].name} reached level ${own.lvl}!`);
    PLANTS[id].learn.filter(([at]) => at === own.lvl).forEach(([, m]) => {
      lines.push(`${PLANTS[id].name} learned ${MOVES[m].name}!`);
      const list = equipped(id);
      if (list.length < MAX_MOVES && !list.includes(m)) own.equip = list.concat(m);
    });
  }
  if (own.lvl >= MAX_LEVEL) own.xp = 0;
  return lines;
}

// unlockPlant gives you a new plant, one level below your best plant
// (JOIN_BELOW_BEST), and puts it in the team if there's room.
function unlockPlant(id) {
  if (progress.owned[id]) return false;
  const best = Math.max(1, ...Object.values(progress.owned).map(o => o.lvl));
  const lvl = Math.max(1, best - JOIN_BELOW_BEST);
  progress.owned[id] = { lvl, xp: 0, equip: startingMoves(id, lvl) };
  if (teamIds().length < MAX_TEAM) progress.team.push(id);
  saveProgress();
  return true;
}
