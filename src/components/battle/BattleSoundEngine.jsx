// Web Audio API sound engine for Battle Mode
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.3, delay = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {}
}

export const BattleSound = {
  correct() {
    playTone(523, 'sine', 0.15, 0.4);
    playTone(659, 'sine', 0.15, 0.4, 0.15);
    playTone(784, 'sine', 0.25, 0.4, 0.30);
  },
  wrong() {
    playTone(220, 'sawtooth', 0.1, 0.3);
    playTone(180, 'sawtooth', 0.25, 0.3, 0.12);
  },
  tick() {
    playTone(880, 'square', 0.05, 0.1);
  },
  countdown() {
    playTone(440, 'square', 0.08, 0.15);
  },
  go() {
    playTone(523, 'sine', 0.1, 0.5);
    playTone(659, 'sine', 0.1, 0.5, 0.1);
    playTone(784, 'sine', 0.1, 0.5, 0.2);
    playTone(1047, 'sine', 0.3, 0.5, 0.3);
  },
  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((n, i) => playTone(n, 'sine', 0.2, 0.4, i * 0.12));
  },
  defeat() {
    playTone(330, 'sawtooth', 0.15, 0.3);
    playTone(277, 'sawtooth', 0.15, 0.3, 0.18);
    playTone(220, 'sawtooth', 0.4, 0.3, 0.36);
  },
  invite() {
    playTone(659, 'sine', 0.12, 0.3);
    playTone(784, 'sine', 0.2, 0.3, 0.15);
  }
};