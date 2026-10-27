/**
 * Procedural music: a 16th-note step sequencer with a lookahead scheduler.
 * Each track has a chord progression and layers (pad, bass, drums, arp) that
 * fade in with `intensity` (rises with combat density and frenzy).
 * To add a track, add an entry to TRACKS.
 */

interface TrackDef {
  bpm: number;
  /** MIDI note of the key root */
  root: number;
  /** [semitone offset from root, 'm' | 'M'] per bar */
  chords: [number, 'm' | 'M'][];
  style: 'ambient' | 'drive' | 'boss' | 'hymn' | 'void';
  /** baseline intensity */
  base: number;
  /** lead voice for boss tracks */
  lead?: 'organ' | 'bell';
}

export const TRACKS: Record<string, TrackDef> = {
  menu: { bpm: 72, root: 50, chords: [[0, 'm'], [-4, 'M'], [-7, 'm'], [-2, 'M']], style: 'ambient', base: 0 },
  graveyard: { bpm: 100, root: 50, chords: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']], style: 'drive', base: 0.25 },
  boss_titan: { bpm: 138, root: 50, chords: [[0, 'm'], [1, 'M'], [0, 'm'], [-2, 'M']], style: 'boss', base: 0.8 },
  victory: { bpm: 90, root: 50, chords: [[3, 'M'], [-2, 'M'], [-4, 'M'], [5, 'M']], style: 'ambient', base: 0.2 },
  cathedral: { bpm: 84, root: 48, chords: [[0, 'm'], [5, 'm'], [-4, 'M'], [-5, 'M']], style: 'hymn', base: 0.25 },
  boss_organ: { bpm: 132, root: 48, chords: [[0, 'm'], [-4, 'M'], [1, 'M'], [-5, 'M']], style: 'boss', base: 0.8, lead: 'organ' },
  blacksun: { bpm: 92, root: 45, chords: [[0, 'm'], [1, 'M'], [-2, 'm'], [-1, 'M']], style: 'void', base: 0.3 },
  boss_heart: { bpm: 146, root: 45, chords: [[0, 'm'], [1, 'M'], [6, 'M'], [1, 'M']], style: 'boss', base: 0.85, lead: 'bell' },
  ending: { bpm: 70, root: 52, chords: [[0, 'M'], [-3, 'm'], [5, 'M'], [-5, 'M']], style: 'ambient', base: 0.15 },
};

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

export class MusicPlayer {
  private ctx: AudioContext;
  private out: GainNode;
  private trackGain: GainNode | null = null;
  private delay: DelayNode;
  private noise: AudioBuffer;
  private track: TrackDef | null = null;
  private trackId = '';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private intensity = 0;
  private targetIntensity = 0;

  constructor(ctx: AudioContext, out: GainNode) {
    this.ctx = ctx;
    this.out = out;
    this.delay = ctx.createDelay(1);
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    const dg = ctx.createGain();
    dg.gain.value = 0.4;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(dg).connect(out);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setIntensity(v: number): void {
    this.targetIntensity = Math.max(0, Math.min(1, v));
  }

  play(id: string): void {
    if (id === this.trackId) return;
    const def = TRACKS[id];
    if (!def) return;
    const t = this.ctx.currentTime;
    if (this.trackGain) {
      const old = this.trackGain;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => old.disconnect(), 1500);
    }
    this.trackGain = this.ctx.createGain();
    this.trackGain.gain.setValueAtTime(0, t);
    this.trackGain.gain.linearRampToValueAtTime(1, t + 1.0);
    this.trackGain.connect(this.out);
    this.delay.delayTime.value = (60 / def.bpm) * 0.75;
    this.track = def;
    this.trackId = id;
    this.step = 0;
    this.nextTime = t + 0.1;
    this.intensity = def.base;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.trackGain?.disconnect();
    this.trackGain = null;
    this.trackId = '';
  }

  private schedule(): void {
    if (!this.track || !this.trackGain) return;
    const stepDur = 60 / this.track.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.intensity += (Math.max(this.track.base, this.targetIntensity) - this.intensity) * 0.02;
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private playStep(step: number, t: number, sd: number): void {
    const tr = this.track!;
    const bar = Math.floor(step / 16) % tr.chords.length;
    const s = step % 16;
    const [off, q] = tr.chords[bar];
    const root = tr.root + off;
    const tones = q === 'm' ? [0, 3, 7] : [0, 4, 7];
    const I = this.intensity;

    if (s === 0) this.pad(t, tones.map((x) => midi(root + x + 12)), sd * 16, tr.style === 'boss' ? 0.05 : 0.07);

    if (tr.style === 'ambient') {
      if (s % 4 === 0 && pseudo(step) > 0.55) this.bell(t, midi(root + 24 + tones[Math.floor(pseudo(step + 3) * 3)] + (pseudo(step + 7) > 0.7 ? 12 : 0)), 0.05);
      if (s === 0) this.bass(t, midi(root - 12), sd * 14, 0.08, 300);
      return;
    }

    if (tr.style === 'drive') {
      if (s % 2 === 0) this.bass(t, midi(root - 12 + (s === 6 || s === 14 ? 12 : 0)), sd * 1.8, 0.1, 380 + I * 900);
      if (I > 0.2 && (s === 0 || s === 8 || (I > 0.6 && s === 10))) this.kick(t, 0.45);
      if (I > 0.5 && (s === 4 || s === 12)) this.snare(t, 0.16);
      if (I > 0.3 && s % 4 === 2) this.hat(t, 0.05);
      if (I > 0.75 && s % 2 === 1) this.hat(t, 0.025);
      if (I > 0.4 && s % 2 === 0) this.arp(t, midi(root + 12 + [0, 7, 12, 7, 3, 7, 12, 15][(s / 2) % 8] + (tones[1] === 4 && (s / 2) % 8 === 4 ? 1 : 0)), 0.035 + I * 0.02);
      return;
    }

    if (tr.style === 'hymn') {
      // a rotting cathedral: organ chords, pedal bass, half-time timpani
      if (s === 0) this.organ(t, tones.map((x) => midi(root + x + 12)), sd * 15, 0.035);
      if (s === 0 || s === 8) this.organ(t, [midi(root - 12)], sd * 7, 0.05);
      if (s % 4 === 0) this.organ(t, [midi(root + 24 + [0, 7, 3, 12, 7, 3, 0, -5][(step / 4) % 8] + (q === 'M' && (step / 4) % 8 === 2 ? 1 : 0))], sd * 3.5, 0.018 + I * 0.012);
      if (I > 0.3 && (s === 0 || s === 8)) this.kick(t, 0.38);
      if (I > 0.5 && s === 8) this.snare(t, 0.12);
      if (I > 0.6 && s % 4 === 2) this.hat(t, 0.03);
      if (I > 0.8 && s % 2 === 1) this.hat(t, 0.02);
      if (s === 0 && bar % 2 === 0) this.bell(t, midi(root + 36), 0.03);
      return;
    }

    if (tr.style === 'void') {
      // the black sun: a detuned drone, a slow pulse and glassy glitches
      if (s === 0) this.pad(t, tones.map((x) => midi(root + x)), sd * 16, 0.06);
      if (s === 0 || s === 6 || s === 10) this.bass(t, midi(root - 24), sd * 3, 0.12, 200 + I * 400, 'sine');
      if (I > 0.35 && s % 2 === 0) this.hat(t, 0.025 + I * 0.02);
      if (I > 0.45 && (s === 0 || s === 8)) this.kick(t, 0.45);
      if (I > 0.6 && s === 12) this.snare(t, 0.14);
      if (pseudo(step * 1.7) > 0.86) this.bell(t, midi(root + 36 + tones[Math.floor(pseudo(step) * 3)] + (pseudo(step + 2) > 0.5 ? 12 : 0)), 0.025);
      if (I > 0.55 && s % 2 === 1) this.arp(t, midi(root + 12 + [0, 12, 1, 13, 7, 6][s % 6]), 0.02 + I * 0.015, 'sine');
      return;
    }

    // boss
    this.bass(t, midi(root - 12 + (s % 8 === 7 ? 1 : 0)), sd * 0.9, 0.11, 500 + I * 1200, 'sawtooth');
    if (s % 4 === 0) this.kick(t, 0.55);
    if (s === 4 || s === 12) this.snare(t, 0.2);
    if (s % 2 === 1) this.hat(t, 0.04);
    const leadNote = midi(root + 24 + [0, 3, 7, 1, 0, 10][s % 6]);
    if (tr.lead === 'organ') {
      if (s % 3 === 0) this.organ(t, [leadNote], sd * 2.5, 0.03);
      if (s === 0) this.organ(t, tones.map((x) => midi(root + x + 12)), sd * 15, 0.025);
    } else if (tr.lead === 'bell') {
      if (s % 3 === 0) this.bell(t, leadNote * 2, 0.035);
      if (s % 2 === 0) this.arp(t, midi(root + 12 + [0, 1, 6, 1][(s / 2) % 4]), 0.035, 'square');
    } else if (s % 3 === 0) this.arp(t, leadNote, 0.04, 'sawtooth');
  }

  // ---------------------------------------------------------------- instruments
  private env(t: number, a: number, d: number, vol: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(this.trackGain!);
    return g;
  }

  private pad(t: number, freqs: number[], dur: number, vol: number): void {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    g.connect(lp).connect(this.trackGain!);
    for (const f of freqs)
      for (const det of [-6, 6]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        o.stop(t + dur * 1.1);
      }
  }

  private bass(t: number, f: number, dur: number, vol: number, cutoff: number, type: OscillatorType = 'square'): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff * 2, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.5), t + dur);
    o.connect(lp).connect(this.env(t, 0.005, dur, vol));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private arp(t: number, f: number, vol: number, type: OscillatorType = 'triangle'): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = this.env(t, 0.003, 0.18, vol);
    o.connect(g);
    g.connect(this.delay);
    o.start(t);
    o.stop(t + 0.25);
  }

  /** a pipe organ: octave-stacked square and sine through a soft lowpass */
  private organ(t: number, freqs: number[], dur: number, vol: number): void {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.04);
    g.gain.setValueAtTime(vol, t + dur * 0.85);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    g.connect(lp).connect(this.trackGain!);
    for (const f of freqs)
      for (const [m, type] of [[1, 'square'], [2, 'sine'], [0.5, 'sine']] as const) {
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.value = f * m;
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
  }

  private bell(t: number, f: number, vol: number): void {
    for (const [m, v] of [[1, 1], [2.76, 0.3], [5.4, 0.12]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const g = this.env(t, 0.004, 1.6 / m, vol * v);
      g.connect(this.delay);
      o.connect(g);
      o.start(t);
      o.stop(t + 1.8);
    }
  }

  private kick(t: number, vol: number): void {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    o.connect(this.env(t, 0.002, 0.2, vol));
    o.start(t);
    o.stop(t + 0.25);
  }

  private noiseHit(t: number, vol: number, dur: number, type: BiquadFilterType, f: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const bq = this.ctx.createBiquadFilter();
    bq.type = type;
    bq.frequency.value = f;
    s.connect(bq).connect(this.env(t, 0.001, dur, vol));
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  private snare(t: number, vol: number): void {
    this.noiseHit(t, vol, 0.14, 'bandpass', 1900);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    o.connect(this.env(t, 0.001, 0.08, vol * 0.6));
    o.start(t);
    o.stop(t + 0.1);
  }

  private hat(t: number, vol: number): void {
    this.noiseHit(t, vol, 0.035, 'highpass', 7500);
  }
}

function pseudo(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
