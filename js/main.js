/* =====================================================================
   main.js: starts the game (loaded LAST, after everything else exists).

   It also adds `window.backyardBrawl`, a small "test hook": from the
   browser's developer console you can look at the battle
   (backyardBrawl.battle) or speed it up (backyardBrawl.speed = 20).
   It's harmless to leave in.
   ===================================================================== */

function boot() {
  loadProgress();
  renderMute();
  goTitle();
}

window.backyardBrawl = {
  get battle() { return B; },
  get progress() { return progress; },
  get speed() { return battleSpeed; },
  set speed(x) { battleSpeed = x; },
};

boot();
