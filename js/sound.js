/* =====================================================================
   sound.js: every sound, made on the spot with the Web Audio API.

   There are no sound files. tone() plays one beep: a "wave" shape
   (square sounds buzzy, sine sounds soft) at a pitch in hertz (Hz:
   vibrations per second, higher = higher pitch) that fades out.
   Browsers only allow sound after the player clicks or presses a key,
   so the audio engine is created on the first sound.
   ===================================================================== */

let audio = null;
let muted = store.get('mute', false);

function tone(freq, time = 0.12, wave = 'square', vol = 0.06, slideTo = 0) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + time);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + time);
  } catch {}
}

const sfx = {
  click: () => tone(660, 0.05, 'square', 0.03),
  step:  () => tone(180, 0.03, 'triangle', 0.03),
  hit:   () => tone(140, 0.12, 'square', 0.06, 60),
  boom:  () => tone(90, 0.35, 'sawtooth', 0.08, 30),
  zap:   () => tone(900, 0.15, 'sawtooth', 0.04, 1800),
  heal:  () => { tone(520, 0.12, 'sine', 0.06); setTimeout(() => tone(780, 0.15, 'sine', 0.06), 90); },
  sun:   () => tone(880, 0.1, 'sine', 0.05, 1320),
  wilt:  () => tone(300, 0.4, 'triangle', 0.07, 80),
  win:   () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.05), i * 120)),
  lose:  () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.07), i * 160)),
  unlock:() => [659, 784, 988, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.06), i * 100)),
};

function setMuted(on) {
  muted = on;
  store.set('mute', on);
}
