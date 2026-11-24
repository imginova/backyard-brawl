/* =====================================================================
   screens.js: every screen except the battle itself.

     title     the title screen
     map       the Lawn you walk around (plus its message box, which
               also asks "ready to fight?")
     team      pick your team and each plant's moves
     battle    drawn by render.js
   Plus two overlays that cover the screen: the battle result and
   How to play.
   ===================================================================== */

let currentScreen = 'title';   // not called `screen`: that name is taken by the browser

function show(name) {
  currentScreen = name;
  ['title', 'map', 'team', 'battle'].forEach(s => { $('scr-' + s).hidden = s !== name; });
}

// ---- Title ------------------------------------------------------------------
let newGameArmed = false;   // "New game" needs a second click if a save exists

function goTitle() {
  show('title');
  newGameArmed = false;
  $('titleArt').textContent = TITLE_ART.join('\n');
  $('btnContinue').hidden = !hasSave();
  $('btnNew').textContent = 'New game';
}

function newGame() {
  if (hasSave() && !newGameArmed) {
    newGameArmed = true;
    $('btnNew').textContent = 'Erase your save and start over? Click again';
    return;
  }
  progress = newProgress();
  saveProgress();
  goMap();
}

// ---- The map ------------------------------------------------------------------
// mapMsg is the message box under the map: { text, battle } where
// `battle` is the key of a battle waiting for "Fight!".
let mapMsg = null;

const BATTLE_CLASS = { B: 't-boss', R: 't-rogue', S: 't-secret' };

function tileAt(x, y) {
  return (LAWN_MAP[y] || '')[x] || '#';
}

function isBattleTile(ch) {
  return !!BATTLES[ch];
}

function canWalk(x, y) {
  const ch = tileAt(x, y);
  return WALKABLE.includes(ch) || (isBattleTile(ch) && progress.beaten[ch]);
}

// How one tile is drawn: [character, CSS class].
function tileLook(ch) {
  if (isBattleTile(ch)) {
    if (progress.beaten[ch]) return [':', 't-path'];
    return [ch, BATTLE_CLASS[ch] || 't-battle'];
  }
  return {
    '#': ['#', 't-fence'], '"': ['"', 't-grass'], 'T': ['T', 't-tree'], '~': ['~', 't-pond'],
    'H': ['H', 't-house'], '%': ['%', 't-hedge'], '$': ['%', 't-hedge t-sus'], ':': [':', 't-path'],
    '.': ['.', 't-short'], '@': [':', 't-path'], '?': ['?', 't-sign'], 'G': ['G', 't-gate'],
  }[ch] || [ch, ''];
}

function renderMap() {
  const { x: px, y: py } = progress.pos;
  $('m-map').innerHTML = LAWN_MAP.map((row, y) => [...row].map((ch, x) => {
    if (x === px && y === py) return '<span class="t-player">@</span>';
    const [c, cls] = tileLook(ch);
    return `<span class="${cls}">${esc(c)}</span>`;
  }).join('')).join('\n');
  const box = $('m-msg');
  if (!mapMsg) {
    box.innerHTML = '<span class="dim">Arrow keys / WASD or the pad to walk. Bump into a red number to fight.</span>';
    return;
  }
  const buttons = mapMsg.battle
    ? `<div class="row"><button data-act="fight">Fight! (Enter)</button> <button data-act="notyet">Not yet (Esc)</button></div>`
    : '<div class="row"><button data-act="ok">OK</button></div>';
  box.innerHTML = `<div>${mapMsg.text}</div>${buttons}`;
}

function goMap() {
  B = null;
  show('map');
  if (!progress.introSeen) {
    progress.introSeen = true;
    saveProgress();
    mapMsg = { text: 'Zombies are shambling across the Lawn! You start with <b>Peashooter</b>, <b>Sunflower</b> and <b>Wal-nut</b>. Walk east along the path and bump into the red <b>1</b> to fight. More plants join as you win.' };
  }
  renderMap();
}

function moveMap(dx, dy) {
  if (mapMsg) { mapMsg = null; }
  const x = progress.pos.x + dx;
  const y = progress.pos.y + dy;
  const ch = tileAt(x, y);
  if (canWalk(x, y)) {
    progress.pos = { x, y };
    saveProgress();
    sfx.step();
  } else if (isBattleTile(ch)) {
    openPrebattle(ch);
  } else if (ch === '?') {
    mapMsg = { text: esc(SIGNS[`${y},${x}`] || 'The sign is too faded to read.') };
  } else if (ch === 'G') {
    mapMsg = { text: progress.beaten.B ? esc(GATE_TEXT) : 'The gate is locked. Something big is guarding the Lawn...' };
  }
  renderMap();
}

const zombieList = wave => wave.map(id => ZOMBIES[id].name).join(', ');

function openPrebattle(key) {
  const def = BATTLES[key];
  const waves = def.waves.map((w, i) => `${i + 1}) ${esc(zombieList(w))}`).join('<br>');
  const reward = def.unlock && !progress.owned[def.unlock] ? `<br>Reward: <b>${esc(PLANTS[def.unlock].name)}</b> joins your garden.` : '';
  const tag = def.boss ? ' <span class="t-boss">BOSS</span>' : def.rogue ? ' <span class="t-rogue">ROGUE (optional, tougher than the boss)</span>' : def.secret ? ' <span class="t-secret">SECRET</span>' : '';
  mapMsg = { battle: key, text: `<b>${esc(def.name)}</b>${tag}<br>${waves}${reward}` };
  sfx.click();
}

function fight() {
  if (!mapMsg || !mapMsg.battle) return;
  const key = mapMsg.battle;
  mapMsg = null;
  startBattle(key);
}

// ---- Team screen ------------------------------------------------------------------
let teamSel = 'peashooter';
let teamMsg = '';

function goTeam() {
  show('team');
  if (!progress.owned[teamSel]) teamSel = Object.keys(progress.owned)[0];
  teamMsg = '';
  renderTeam();
}

function renderTeam() {
  const ownedCount = PLANT_ORDER.filter(id => progress.owned[id]).length;
  $('t-count').textContent = `Team ${teamIds().length}/${MAX_TEAM} · Plants found ${ownedCount}/${PLANT_ORDER.length}`;
  // The lineup comes first, in battle order, with ^ and v to reorder it.
  // Then the plants on the bench, then the ones not found yet.
  const team = teamIds();
  const row = (id, i) => {
    const own = progress.owned[id];
    const inTeam = i >= 0;
    const order = inTeam
      ? `<span class="tpos">${i + 1}</span>
         <button class="tarrow" data-up="${id}" ${i === 0 ? 'disabled' : ''} title="Move up">^</button>
         <button class="tarrow" data-down="${id}" ${i === team.length - 1 ? 'disabled' : ''} title="Move down">v</button>`
      : '';
    return `<div class="trow ${id === teamSel ? 'sel' : ''}">${order}
      <button class="tname ${PLANTS[id].color}" data-plant="${id}">${esc(PLANTS[id].name)} <span class="lvl">Lv${own.lvl}</span></button>
      <button class="ttoggle ${inTeam ? 'on' : ''}" data-team="${id}">${inTeam ? 'In team' : 'Bench'}</button>
    </div>`;
  };
  const bench = PLANT_ORDER.filter(id => progress.owned[id] && !team.includes(id));
  const missing = PLANT_ORDER.filter(id => !progress.owned[id]);
  $('t-list').innerHTML = '<div class="thead">Lineup (battle order)</div>'
    + team.map((id, i) => row(id, i)).join('')
    + (bench.length ? '<div class="thead">Bench</div>' + bench.map(id => row(id, -1)).join('') : '')
    + missing.map(() => '<div class="trow dim">??? <span class="dim">(not found yet)</span></div>').join('');
  $('t-msg').textContent = teamMsg;
  $('t-detail').innerHTML = plantDetail(teamSel);
}

function plantDetail(id) {
  const p = PLANTS[id];
  const own = progress.owned[id];
  const eq = equipped(id);
  const xpLine = own.lvl >= MAX_LEVEL ? 'Max level' : `XP ${own.xp}/${xpToNext(own.lvl)}`;
  const blaze = p.blaze ? `<div class="dim">Solar Blaze form: HP ${p.blaze.hp} · Attack ${p.blaze.atk} · Speed ${p.blaze.spd} · ${esc(p.blaze.passive.name)}: ${esc(p.blaze.passive.desc)}</div>` : '';
  const moves = p.learn.map(([at, m]) => {
    const mv = MOVES[m];
    if (own.lvl < at) {
      return `<div class="tmove locked"><span class="mname">Lv${at}: ${esc(mv.name)}</span>
        <span class="mmeta">${esc(moveMeta(mv))}</span><span class="mdesc">${esc(mv.desc)}</span></div>`;
    }
    const on = eq.includes(m);
    return `<button class="tmove ${on ? 'on' : ''}" data-move="${m}">
      <span class="mname">[${on ? 'x' : ' '}] ${esc(mv.name)} <span class="dim">Lv${at}</span></span>
      <span class="mmeta">${esc(moveMeta(mv))}</span><span class="mdesc">${esc(mv.desc)}</span></button>`;
  }).join('');
  return `<div class="dhead">
      <pre class="spr">${spriteHtml(id)}</pre>
      <div><div class="uname ${p.color}">${esc(p.name)} <span class="lvl">Lv${own.lvl}</span></div>
        <div>HP ${p.hp} · Attack ${p.atk} · Speed ${p.spd}</div>
        <div class="dim">${xpLine}</div>
        <div><b>${esc(p.passive.name)}:</b> ${esc(p.passive.desc)}</div>${blaze}</div>
    </div>
    <div class="dim">Moves equipped: ${eq.length}/${MAX_MOVES}. Click a move to turn it on or off.</div>
    <div class="tmoves">${moves}</div>`;
}

// ---- Result overlay -----------------------------------------------------------------
function showResult(win, lines) {
  const box = $('overlayBox');
  const title = win ? '<h2 class="good">Victory!</h2>' : '<h2 class="bad">Your plants wilted...</h2>';
  const list = lines.map(l => `<div>${esc(l)}</div>`).join('');
  const buttons = win
    ? '<button data-act="tomap">Back to the Lawn</button>'
    : '<button data-act="retry">Try again</button> <button data-act="tomap">Back to the Lawn</button>';
  box.innerHTML = `${title}<div class="lines">${list}</div><div class="row">${buttons}</div>`;
  setTimeout(() => { $('overlay').hidden = false; }, 500 / battleSpeed);
}

function hideResult() {
  $('overlay').hidden = true;
}

function retryBattle() {
  const key = B && B.key;
  hideResult();
  if (key) startBattle(key);
}

// ---- How to play and sound ------------------------------------------------------------
function showHowto(on) {
  $('howto').hidden = !on;
}

function renderMute() {
  document.querySelectorAll('.btnMute').forEach(b => { b.textContent = muted ? 'Sound: off' : 'Sound: on'; });
}
