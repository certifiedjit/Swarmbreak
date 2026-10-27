/**
 * All sound is synthesised with WebAudio (no audio files). Separate gain
 * buses for music and effects. Every effect varies its pitch a little and is
 * rate-limited per kind so dense combat never turns into a wall of noise.
 */
import type { Rarity } from '../data/rarity';
import { MusicPlayer } from './music';

type SfxKind =
  | 'hit' | 'crit' | 'kill' | 'gem' | 'coin' | 'levelup' | 'reelTick' | 'chestOpen' | 'hurt' | 'explosion'
  | 'bossIntro' | 'miniIntro' | 'shrine' | 'shrineDone' | 'dash' | 'nova' | 'slow' | 'heal' | 'magnet'
  | 'click' | 'hover' | 'frenzy' | 'warn' | 'zap' | 'slam' | 'swing' | 'record' | 'death' | 'bomb' | 'curse' | 'evolve' | 'bell';

const MIN_GAP: Partial<Record<SfxKind, number>> = {
  hit: 0.035, crit: 0.05, kill: 0.03, gem: 0.028, coin: 0.05, reelTick: 0.03, explosion: 0.08, zap: 0.06, swing: 0.06, slam: 0.1, warn: 0.15, hover: 0.04,
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last: Partial<Record<SfxKind, number>> = {};
  private gemChain = 0;
  private gemChainT = 0;
  music: MusicPlayer | null = null;
  private sfxVol = 0.8;
  private musicVol = 0.6;
  private pendingTrack: string | null = null;

  /** must be called from a user gesture */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.setVolumes(this.musicVol, this.sfxVol);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.music = new MusicPlayer(ctx, this.musicBus);
    if (this.pendingTrack) this.music.play(this.pendingTrack);
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    this.musicBus.gain.value = music * music * 0.5;
    this.sfxBus.gain.value = sfx * sfx * 0.7;
  }

  playMusic(track: string): void {
    this.pendingTrack = track;
    this.music?.play(track);
  }

  setIntensity(v: number): void {
    this.music?.setIntensity(v);
  }

  // ------------------------------------------------------------ primitives
  private now(): number {
    return this.ctx!.currentTime;
  }

  private osc(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, dest: AudioNode = this.sfxBus): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(t0: number, dur: number, vol: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1): void {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(bq).connect(g).connect(this.sfxBus);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.02);
  }

  private notes(freqs: number[], step: number, type: OscillatorType, dur: number, vol: number, t0 = this.now()): void {
    freqs.forEach((f, i) => this.osc(type, f, f, t0 + i * step, dur, vol));
  }

  // ------------------------------------------------------------ effects
  play(kind: SfxKind, opt: { pitch?: number; vol?: number } = {}): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    const gap = MIN_GAP[kind];
    if (gap !== undefined) {
      if (t - (this.last[kind] ?? -1) < gap) return;
    }
    this.last[kind] = t;
    const v = opt.vol ?? 1;
    const p = (opt.pitch ?? 1) * (0.92 + Math.random() * 0.16);
    switch (kind) {
      case 'hit':
        this.osc('sine', 220 * p, 90 * p, t, 0.07, 0.18 * v);
        this.noise(t, 0.04, 0.12 * v, 'bandpass', 2400 * p, 1200, 1.2);
        break;
      case 'crit':
        this.osc('sine', 260 * p, 80, t, 0.1, 0.25 * v);
        this.osc('triangle', 1500 * p, 1900 * p, t, 0.09, 0.08 * v);
        this.noise(t, 0.06, 0.16 * v, 'highpass', 3000);
        break;
      case 'kill':
        this.noise(t, 0.07, 0.09 * v, 'bandpass', 900 * p, 400, 2);
        this.osc('square', 520 * p, 260 * p, t, 0.05, 0.03 * v);
        break;
      case 'gem': {
        if (t - this.gemChainT > 0.6) this.gemChain = 0;
        this.gemChainT = t;
        const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
        const n = scale[Math.min(scale.length - 1, this.gemChain++ >> 1)];
        const f = 880 * Math.pow(2, n / 12);
        this.osc('sine', f, f * 1.01, t, 0.07, 0.07 * v);
        break;
      }
      case 'coin':
        this.osc('triangle', 1318 * p, 1318 * p, t, 0.05, 0.07 * v);
        this.osc('triangle', 1976 * p, 1976 * p, t + 0.045, 0.12, 0.07 * v);
        break;
      case 'levelup':
        this.notes([523, 659, 784, 1047, 1319], 0.055, 'square', 0.16, 0.06 * v);
        this.notes([523, 659, 784, 1047, 1319], 0.055, 'triangle', 0.3, 0.08 * v);
        this.noise(t + 0.2, 0.5, 0.05 * v, 'highpass', 6000);
        break;
      case 'reelTick':
        this.osc('square', 1800 * p, 1200, t, 0.025, 0.04 * v);
        break;
      case 'chestOpen':
        this.osc('sawtooth', 120, 60, t, 0.25, 0.08 * v);
        this.noise(t, 0.2, 0.1 * v, 'lowpass', 1200, 200);
        break;
      case 'hurt':
        this.osc('square', 180, 70, t, 0.14, 0.1 * v);
        this.noise(t, 0.1, 0.15 * v, 'lowpass', 1500, 300);
        break;
      case 'explosion':
        this.noise(t, 0.45, 0.28 * v, 'lowpass', 1800 * p, 120);
        this.osc('sine', 120 * p, 35, t, 0.4, 0.3 * v);
        break;
      case 'bomb':
        this.noise(t, 0.8, 0.35 * v, 'lowpass', 2500, 80);
        this.osc('sine', 90, 30, t, 0.7, 0.4 * v);
        break;
      case 'bossIntro':
        this.osc('sawtooth', 55, 52, t, 2.4, 0.12 * v);
        this.osc('sawtooth', 55.6, 51, t, 2.4, 0.12 * v);
        this.osc('sine', 110, 40, t + 1.6, 1.2, 0.35 * v);
        this.noise(t + 1.6, 1.4, 0.3 * v, 'lowpass', 900, 60);
        break;
      case 'miniIntro':
        this.osc('sawtooth', 82, 70, t, 0.5, 0.12 * v);
        this.osc('sine', 98, 40, t + 0.25, 0.6, 0.3 * v);
        this.noise(t + 0.25, 0.5, 0.2 * v, 'lowpass', 700, 80);
        break;
      case 'shrine':
        this.osc('sine', 300 + 600 * (opt.pitch ?? 0), 300 + 620 * (opt.pitch ?? 0), t, 0.08, 0.04 * v);
        break;
      case 'shrineDone':
        this.notes([392, 523, 784], 0.08, 'triangle', 0.4, 0.09 * v);
        break;
      case 'curse':
        this.notes([311, 294, 233], 0.12, 'sawtooth', 0.4, 0.06 * v);
        this.noise(t, 0.6, 0.08 * v, 'bandpass', 400, 200, 3);
        break;
      case 'dash':
        this.noise(t, 0.2, 0.15 * v, 'bandpass', 800, 4000, 1.5);
        this.osc('sine', 300, 900, t, 0.12, 0.06 * v);
        break;
      case 'nova':
        this.osc('sine', 600, 80, t, 0.5, 0.25 * v);
        this.noise(t, 0.5, 0.2 * v, 'lowpass', 4000, 200);
        break;
      case 'slow':
        this.osc('sine', 800, 200, t, 0.9, 0.12 * v);
        this.osc('triangle', 400, 100, t, 0.9, 0.06 * v);
        break;
      case 'heal':
        this.notes([523, 659, 784, 988], 0.07, 'sine', 0.5, 0.08 * v);
        break;
      case 'magnet':
        this.osc('sawtooth', 100, 900, t, 0.6, 0.05 * v);
        this.noise(t, 0.6, 0.06 * v, 'bandpass', 500, 4000, 2);
        break;
      case 'click':
        this.osc('square', 900, 700, t, 0.04, 0.04 * v);
        break;
      case 'hover':
        this.osc('sine', 1200, 1200, t, 0.03, 0.02 * v);
        break;
      case 'frenzy':
        this.noise(t, 0.6, 0.12 * v, 'bandpass', 300, 5000, 1.5);
        this.notes([440, 554, 659, 880], 0.04, 'square', 0.12, 0.05 * v);
        break;
      case 'warn':
        this.osc('square', 660, 660, t, 0.07, 0.03 * v);
        this.osc('square', 660, 660, t + 0.12, 0.07, 0.03 * v);
        break;
      case 'zap':
        this.noise(t, 0.12, 0.12 * v, 'highpass', 2500);
        this.osc('sawtooth', 1400 * p, 300, t, 0.1, 0.04 * v);
        break;
      case 'slam':
        this.osc('sine', 140 * p, 40, t, 0.3, 0.32 * v);
        this.noise(t, 0.25, 0.18 * v, 'lowpass', 1200, 100);
        break;
      case 'swing':
        this.noise(t, 0.12, 0.1 * v, 'bandpass', 1200 * p, 3500 * p, 2);
        break;
      case 'record':
        this.notes([784, 988, 1175, 1568], 0.09, 'triangle', 0.35, 0.1 * v);
        break;
      case 'death':
        this.osc('sawtooth', 220, 40, t, 1.4, 0.12 * v);
        this.noise(t, 1.2, 0.15 * v, 'lowpass', 2000, 60);
        break;
      case 'bell': {
        // a big church bell: inharmonic partials with a long decay
        const f = 130 * p;
        for (const [m, amp, d] of [[1, 0.22, 2.6], [2.0, 0.12, 2], [2.4, 0.1, 1.6], [3.0, 0.08, 1.2], [4.2, 0.05, 0.9], [5.4, 0.03, 0.7]] as const) this.osc('sine', f * m, f * m * 0.998, t, d, amp * v);
        this.noise(t, 0.08, 0.15 * v, 'bandpass', 2400, 1200, 2);
        break;
      }
      case 'evolve':
        this.notes([392, 523, 659, 784, 1047, 1319, 1568], 0.06, 'square', 0.25, 0.06 * v);
        this.noise(t, 1, 0.08 * v, 'highpass', 5000);
        break;
    }
  }

  /** chest reveal: more notes and sparkle for rarer results */
  reveal(r: Rarity): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now();
    switch (r) {
      case 'common':
        this.notes([523, 659], 0.08, 'triangle', 0.3, 0.08);
        break;
      case 'uncommon':
        this.notes([523, 659, 784], 0.07, 'triangle', 0.35, 0.09);
        break;
      case 'rare':
        this.notes([587, 740, 880, 1175], 0.07, 'square', 0.3, 0.06);
        this.noise(t + 0.2, 0.4, 0.05, 'highpass', 6000);
        break;
      case 'epic':
        this.notes([523, 659, 784, 1047, 1319], 0.065, 'square', 0.35, 0.07);
        this.osc('sine', 130, 65, t, 0.6, 0.2);
        this.noise(t + 0.2, 0.7, 0.07, 'highpass', 5000);
        break;
      case 'legendary':
        this.notes([392, 523, 659, 784, 1047, 1319, 1568, 2093], 0.06, 'square', 0.5, 0.07);
        this.notes([196, 262, 330], 0, 'sawtooth', 1.4, 0.06, t + 0.45);
        this.osc('sine', 110, 40, t, 1, 0.35);
        this.noise(t, 1.4, 0.1, 'bandpass', 400, 8000, 0.8);
        break;
    }
  }
}

export const audio = new AudioEngine();
