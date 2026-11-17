// Every sound in Kunang is synthesized live with WebAudio: no audio files, no
// network, just oscillators, filtered noise and envelopes. Audio only starts
// after the player's first gesture, as browsers require.

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(context.destination);
    startPad();
    return true;
  }

  // A slow two-voice drone under everything: two detuned sines through a low
  // filter, their blend breathing on a long LFO.
  function startPad() {
    const padGain = context.createGain();
    padGain.gain.value = 0.05;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.connect(padGain);
    padGain.connect(master);
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    lfo.start();
    const voices = [110, 164.81].map((freq) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = 4;
      osc.connect(filter);
      osc.start();
      return osc;
    });
    padNodes = { padGain, voices, lfo };
  }

  function tone({ freq, type = 'sine', at = 0, dur = 0.25, vol = 0.2, slideTo = null }) {
    if (!context) return;
    const t0 = context.currentTime + at;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst({ at = 0, dur = 0.18, vol = 0.25, freq = 800 }) {
    if (!context) return;
    const t0 = context.currentTime + at;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    get muted() {
      return muted;
    },
    // A bright pluck that climbs the pentatonic ladder as the combo grows.
    orb(combo) {
      if (!ensure()) return;
      const step = Math.min(combo - 1, PENTATONIC.length - 1);
      tone({ freq: PENTATONIC[step], type: 'triangle', dur: 0.35, vol: 0.22 });
      tone({ freq: PENTATONIC[step] * 2, type: 'sine', dur: 0.22, vol: 0.07 });
    },
    powerup() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
        tone({ freq, type: 'sine', at: i * 0.06, dur: 0.4, vol: 0.14 }),
      );
    },
    hit() {
      if (!ensure()) return;
      tone({ freq: 160, type: 'sawtooth', dur: 0.3, vol: 0.2, slideTo: 55 });
      noiseBurst({ dur: 0.22, vol: 0.22, freq: 500 });
    },
    levelUp() {
      if (!ensure()) return;
      [392, 523.25, 659.25].forEach((freq, i) =>
        tone({ freq, type: 'triangle', at: i * 0.09, dur: 0.5, vol: 0.16 }),
      );
    },
    gameOver() {
      if (!ensure()) return;
      [392, 329.63, 261.63, 196].forEach((freq, i) =>
        tone({ freq, type: 'sine', at: i * 0.16, dur: 0.55, vol: 0.16 }),
      );
    },
    start() {
      if (!ensure()) return;
      [261.63, 392, 523.25].forEach((freq, i) =>
        tone({ freq, type: 'sine', at: i * 0.07, dur: 0.4, vol: 0.14 }),
      );
    },
  };
}
