/**
 * Sound. iPhone blocks all sound until the first tap, so nothing here runs
 * until the player taps "Tap to enter". Every sound is made on the phone from
 * simple tones and noise: there are no audio files, and nothing is borrowed
 * from any game.
 */

let context: AudioContext | undefined;

export function soundIsOn(): boolean {
  try {
    return localStorage.getItem('tcl.sound') !== 'off';
  } catch {
    return true;
  }
}

function audio(): AudioContext | undefined {
  if (context) return context;
  const Maker =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Maker) return undefined;
  context = new Maker();
  // Lets a test see that sound has started, and only after a tap.
  document.documentElement.dataset.sound = 'on';
  return context;
}

/** A boost whoosh that lands on a low thump. Call it only from a tap. */
export function playEnterSound(): void {
  if (!soundIsOn()) return;
  const ctx = audio();
  if (!ctx) return;
  void ctx.resume();
  const start = ctx.currentTime;

  // The whoosh: a burst of noise swept upward through a filter.
  const length = Math.floor(ctx.sampleRate * 0.45);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const sweep = ctx.createBiquadFilter();
  sweep.type = 'bandpass';
  sweep.Q.value = 1.4;
  sweep.frequency.setValueAtTime(300, start);
  sweep.frequency.exponentialRampToValueAtTime(3600, start + 0.38);
  const whoosh = ctx.createGain();
  whoosh.gain.setValueAtTime(0.0001, start);
  whoosh.gain.exponentialRampToValueAtTime(0.5, start + 0.2);
  whoosh.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
  noise.connect(sweep).connect(whoosh).connect(ctx.destination);
  noise.start(start);

  // The thump: a tone that drops fast.
  const tone = ctx.createOscillator();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(150, start + 0.3);
  tone.frequency.exponentialRampToValueAtTime(42, start + 0.6);
  const thump = ctx.createGain();
  thump.gain.setValueAtTime(0.0001, start + 0.3);
  thump.gain.exponentialRampToValueAtTime(0.8, start + 0.33);
  thump.gain.exponentialRampToValueAtTime(0.0001, start + 0.75);
  tone.connect(thump).connect(ctx.destination);
  tone.start(start + 0.3);
  tone.stop(start + 0.8);
}
