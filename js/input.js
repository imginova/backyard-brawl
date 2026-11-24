/* =====================================================================
   input.js: every click and key press.

   Many buttons are redrawn all the time (the move buttons, the cards),
   so instead of giving each one its own listener we listen on the box
   around them and look at which button was clicked. That trick is
   called "event delegation": e.target.closest('[data-move]') finds the
   button (or the thing inside it) that was clicked.
   ===================================================================== */

// ---- Title ----
$('btnContinue').onclick = () => { sfx.click(); goMap(); };
$('btnNew').onclick = () => { sfx.click(); newGame(); };
document.querySelectorAll('.btnHelp').forEach(b => { b.onclick = () => showHowto(true); });
$('btnHowtoClose').onclick = () => showHowto(false);
document.querySelectorAll('.btnMute').forEach(b => {
  b.onclick = () => { setMuted(!muted); renderMute(); sfx.click(); };
});

// ---- Map ----
$('btnTeam').onclick = () => { sfx.click(); goTeam(); };
$('btnTitle').onclick = () => goTitle();
document.querySelectorAll('[data-dir]').forEach(b => {
  b.onclick = () => {
    const [dx, dy] = b.dataset.dir.split(',').map(Number);
    moveMap(dx, dy);
  };
});
$('m-msg').onclick = e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act === 'fight') fight();
  else { mapMsg = null; renderMap(); }
};

// ---- Team ----
$('btnTeamBack').onclick = () => { sfx.click(); goMap(); };
$('t-list').onclick = e => {
  const sel = e.target.closest('[data-plant]');
  const tog = e.target.closest('[data-team]');
  const up = e.target.closest('[data-up]');
  const down = e.target.closest('[data-down]');
  if (sel) { teamSel = sel.dataset.plant; teamMsg = ''; }
  if (tog) teamMsg = toggleTeam(tog.dataset.team);
  if (up) moveInTeam(up.dataset.up, -1);
  if (down) moveInTeam(down.dataset.down, 1);
  sfx.click();
  renderTeam();
};
$('t-detail').onclick = e => {
  const b = e.target.closest('[data-move]');
  if (!b) return;
  teamMsg = toggleMove(teamSel, b.dataset.move);
  sfx.click();
  renderTeam();
};

// ---- Battle ----
$('b-actions').onclick = e => {
  const mv = e.target.closest('[data-move]');
  const act = e.target.closest('[data-act]');
  if (mv) { sfx.click(); playerMove(mv.dataset.move); }
  else if (act && act.dataset.act === 'soak') soakSun();
  else if (act && act.dataset.act === 'cancel') cancelPick();
};

// Clicking a card picks it as the target, or else shows what it is.
function cardClick(e) {
  const card = e.target.closest('[data-uid]');
  if (!card || !B) return;
  const uid = Number(card.dataset.uid);
  if (playerTarget(uid)) return;
  const u = [...B.allies, ...B.foes].find(x => x.uid === uid);
  if (!u) return;
  const ab = passiveOf(u);
  const extra = u.plant ? '' : ` ${u.def.desc}`;
  B.info = `${u.name}: HP ${Math.max(0, u.hp)}/${u.maxHp} · Attack ${u.atk} · Speed ${u.spd}.${ab.name ? ` ${ab.name}: ${ab.desc}` : ''}${extra}`;
  render();
}
$('b-allies').onclick = cardClick;
$('b-foes').onclick = cardClick;

let giveUpArmed = false;
$('btnGiveUp').onclick = () => {
  if (!giveUpArmed) {
    giveUpArmed = true;
    $('btnGiveUp').textContent = 'Really give up? (no XP)';
    setTimeout(() => { giveUpArmed = false; $('btnGiveUp').textContent = 'Give up'; }, 3000);
    return;
  }
  giveUpArmed = false;
  $('btnGiveUp').textContent = 'Give up';
  giveUp();
};

// ---- Result overlay ----
$('overlay').onclick = e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  sfx.click();
  if (b.dataset.act === 'retry') retryBattle();
  else { hideResult(); goMap(); }
};

// ---- Keyboard ----
const DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};

document.addEventListener('keydown', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!$('howto').hidden) {
    if (key === 'Escape' || key === 'Enter') showHowto(false);
    return;
  }
  if (!$('overlay').hidden) {
    if (key === 'Enter') $('overlayBox').querySelector('button').click();
    return;
  }
  if (currentScreen === 'map') {
    if (DIRS[key]) { e.preventDefault(); moveMap(...DIRS[key]); }
    else if (key === 'Enter' && mapMsg) { if (mapMsg.battle) fight(); else { mapMsg = null; renderMap(); } }
    else if (key === 'Escape' && mapMsg) { mapMsg = null; renderMap(); }
    else if (key === 't') goTeam();
  } else if (currentScreen === 'team') {
    if (key === 'Escape' || key === 't') goMap();
  } else if (currentScreen === 'battle' && B) {
    if (key >= '1' && key <= '4' && B.actor && B.actor.moves[key - 1]) playerMove(B.actor.moves[key - 1]);
    else if (key === '5') soakSun();
    else if (key === 'Escape') cancelPick();
  }
});
