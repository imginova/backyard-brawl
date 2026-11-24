/* =====================================================================
   render.js: draws the battle screen from `B`.

   It only READS the battle state; it never changes the rules. render()
   is called after anything happens and simply rebuilds the HTML of the
   cards, the move buttons and the log.
   ===================================================================== */

// moveMeta(mv): the short line under a move's name, like
// "power 5x3 · blunt · contact · 50 sun · cd 2".
function moveMeta(mv) {
  const parts = [];
  if (mv.power) parts.push(`power ${mv.power}${mv.hits ? 'x' + mv.hits : ''}`);
  if (mv.type) parts.push(mv.type);
  if (mv.power) parts.push(mv.contact ? 'contact' : 'no contact');
  if (mv.pierce) parts.push('pierces armor');
  if (mv.chain) parts.push(`chain ${mv.chain}`);
  if (mv.target === 'allFoes') parts.push('every enemy');
  if (mv.target === 'randomFoes') parts.push('random enemies');
  parts.push(mv.sun ? `${mv.sun} sun` : 'free');
  if (mv.cd) parts.push(`cd ${mv.cd}`);
  if (mv.once) parts.push('once per battle');
  return parts.join(' · ');
}

// The little tags on a card: statuses plus a few special states.
function chipsHtml(u) {
  const chips = Object.keys(u.st).map(k => {
    const s = STATUS[k];
    const turns = k === 'stun' ? '' : ' ' + u.st[k];
    return `<span class="chip ${s.bad ? 'bad' : 'good'}" title="${esc(s.desc)}">${esc(s.name)}${turns}</span>`;
  });
  if (u.armed) chips.push('<span class="chip good" title="The first enemy to hit it takes an explosion">Armed</span>');
  if (u.airborne) chips.push('<span class="chip good">In the air</span>');
  if (u.charged) chips.push('<span class="chip good">Charged</span>');
  if (u.aftershock) chips.push('<span class="chip good">Aftershock</span>');
  if (u.skipNext) chips.push('<span class="chip bad">Tired</span>');
  if (u.chargeReady) chips.push('<span class="chip bad">Charge</span>');
  if (u.firstRounds > 0) chips.push('<span class="chip good">Goes first</span>');
  return chips.join('');
}

function unitCard(u, targets) {
  const color = u.blaze ? u.def.blaze.color : u.def.color;
  const pct = Math.max(0, u.hp) / u.maxHp * 100;
  const classes = ['unit', u.side];
  if (u === B.actor) classes.push('acting');
  if (u.down) classes.push('down');
  if (targets.includes(u)) classes.push('can-target');
  if (u.flash) classes.push('hurt');
  u.flash = false;
  const lvl = u.plant ? ` <span class="lvl">Lv${u.lvl}</span>` : u.boss ? ' <span class="lvl boss">BOSS</span>' : u.rogue ? ' <span class="lvl boss">ROGUE</span>' : '';
  const armor = u.armor > 0
    ? `<div class="bar armor"><i style="width:${Math.min(100, u.armor / Math.max(u.armorMax, 1) * 100)}%"></i><b>${u.plant ? 'shield' : armorName(u)} ${u.armor}</b></div>` : '';
  return `<div class="${classes.join(' ')}" data-uid="${u.uid}">
    <pre class="spr">${spriteHtml(spriteKey(u))}</pre>
    <div class="ubody">
      <div class="uname ${color}">${esc(u.name)}${lvl}</div>
      <div class="bar hp ${pct < 30 ? 'low' : ''}"><i style="width:${pct}%"></i><b>${Math.max(0, u.hp)}/${u.maxHp}</b></div>
      ${armor}
      <div class="chips">${u.down ? '<span class="chip bad">wilted</span>' : chipsHtml(u)}</div>
    </div>
  </div>`;
}

function render() {
  if (!B) return;
  const u = B.actor;
  const targets = B.phase === 'target' ? validTargets(u, moveFor(u, B.pick)) : [];
  $('b-title').textContent = `${B.def.name}`;
  $('b-wave').textContent = `Wave ${B.wave + 1}/${B.def.waves.length} · Round ${Math.max(1, B.round)}`;
  $('b-sun').textContent = `SUN ${B.sun}`;
  $('b-allies').innerHTML = B.allies.map(a => unitCard(a, targets)).join('');
  $('b-foes').innerHTML = B.foes.map(z => unitCard(z, targets)).join('');
  $('b-actions').innerHTML = actionsHtml(u);
  const log = $('b-log');
  log.innerHTML = B.log.slice(-40).map(l => `<div>${esc(l)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function actionsHtml(u) {
  const info = B.info ? `<div class="info">${esc(B.info)}</div>` : '';
  if (B.phase === 'over') return '<div class="turn">Battle over.</div>';
  if (!u || B.phase === 'busy') return `<div class="turn dim">${u ? esc(u.name) + '...' : '...'}</div>`;
  const ab = passiveOf(u);
  const head = `<div class="turn"><b class="${u.blaze ? u.def.blaze.color : u.def.color}">${esc(u.name)}'s turn</b>
    <span class="dim">Ability: ${esc(ab.name)}: ${esc(ab.desc)}</span></div>`;
  if (B.phase === 'target') {
    const mv = moveFor(u, B.pick);
    return `${head}<div class="hint">Pick a target for <b>${esc(mv.name)}</b>: click a glowing card.
      <button data-act="cancel">Cancel (Esc)</button></div>${info}`;
  }
  const buttons = u.moves.map((id, i) => {
    const mv = moveFor(u, id);
    const why = canUse(u, id);
    return `<button class="move ${why ? 'off' : ''}" data-move="${id}">
      <span class="mname">[${i + 1}] ${esc(mv.name)}${why ? ` <em>(${esc(why)})</em>` : ''}</span>
      <span class="mmeta">${esc(moveMeta(mv))}</span>
      <span class="mdesc">${esc(mv.desc)}</span>
    </button>`;
  }).join('');
  return `${head}<div class="moves">${buttons}
    <button class="move soak" data-act="soak"><span class="mname">[5] Soak up sun</span>
      <span class="mmeta">skip this turn · +${WAIT_SUN} sun</span></button></div>${info}`;
}
