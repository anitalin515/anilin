const MUTE_STORAGE_KEY = 'patisserie_stack_muted_v1';

// Major pentatonic scale frequencies starting from C5 for pleasant ascending chimes
const PENTATONIC_NOTES = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
  1760.0, // A6
];

// 4-bar (64 16th-note steps) exciting Parisian rush progression: Am -> F -> Dm -> E7
const BASS_STEPS: Array<number | null> = [
  // Bar 1: Am (A2 = 110, A3 = 220, E3 = 164.81)
  110.0, null, 220.0, null, 110.0, null, 220.0, 164.81,
  110.0, null, 220.0, null, 110.0, 164.81, 220.0, null,
  // Bar 2: F (F2 = 87.31, F3 = 174.61, C3 = 130.81)
  87.31, null, 174.61, null, 87.31, null, 174.61, 130.81,
  87.31, null, 174.61, null, 87.31, 130.81, 174.61, null,
  // Bar 3: Dm (D2 = 73.42, D3 = 146.83, A2 = 110)
  73.42, null, 146.83, null, 73.42, null, 146.83, 110.0,
  73.42, null, 146.83, null, 73.42, 110.0, 146.83, null,
  // Bar 4: E7 (E2 = 82.41, G#2 = 103.83, B2 = 123.47, E3 = 164.81)
  82.41, null, 164.81, null, 103.83, null, 123.47, null,
  164.81, null, 123.47, 103.83, 82.41, null, 164.81, 123.47,
];

// Urgent, agile staccato melody (64 steps)
const LEAD_STEPS: Array<number | null> = [
  // Bar 1: Am (A4=440, C5=523.25, E5=659.25, A5=880)
  440.0, null, 523.25, 659.25, null, 523.25, 659.25, null,
  880.0, null, 659.25, null, 523.25, 587.33, 659.25, null,
  // Bar 2: F (F4=349.23, A4=440, C5=523.25, F5=698.46)
  523.25, null, 698.46, 523.25, null, 440.0, 523.25, null,
  698.46, null, 659.25, 587.33, 523.25, null, 440.0, null,
  // Bar 3: Dm (D5=587.33, F5=698.46, A5=880)
  587.33, null, 698.46, 880.0, null, 698.46, 587.33, null,
  698.46, 659.25, 587.33, null, 523.25, null, 440.0, null,
  // Bar 4: E7 (E5=659.25, G#5=830.61, B5=987.77, D5=587.33)
  493.88, null, 659.25, null, 830.61, null, 659.25, 587.33,
  659.25, 830.61, 987.77, null, 830.61, 659.25, 587.33, 493.88,
];

class PatisserieAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  // BGM sequencer state
  private bgmGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isBgmPlaying: boolean = false;
  private bgmTimerId: number | null = null;
  private nextStepTime: number = 0;
  private currentStep: number = 0;
  private bgmLayers: number = 0;
  private bgmCombo: number = 0;

  constructor() {
    try {
      const saved = localStorage.getItem(MUTE_STORAGE_KEY);
      this.muted = saved === 'true';
    } catch {
      this.muted = false;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx) {
      if (!this.bgmGain) {
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);
      }
      if (!this.noiseBuffer) {
        const length = Math.floor(this.ctx.sampleRate * 0.08);
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
      }
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(next: boolean) {
    this.muted = next;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage failures
    }
    if (next) {
      this.stopBgm();
    }
  }

  public setBgmIntensity(layers: number, combo: number) {
    this.bgmLayers = layers;
    this.bgmCombo = combo;
  }

  public startBgm() {
    if (this.muted || this.isBgmPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.bgmGain) return;

    this.isBgmPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime + 0.04;
    this.bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    this.bgmGain.gain.setValueAtTime(0.24, ctx.currentTime);

    this.bgmTimerId = window.setInterval(() => {
      this.scheduleBgmSteps();
    }, 25);
  }

  public stopBgm() {
    if (this.bgmTimerId !== null) {
      clearInterval(this.bgmTimerId);
      this.bgmTimerId = null;
    }
    this.isBgmPlaying = false;
    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(0.0001, now, 0.025);
    }
  }

  private getCurrentBpm(): number {
    // Starts brisk at 136 BPM and tightens up to 172 BPM with height & combo
    return Math.min(172, 136 + this.bgmLayers * 1.15 + Math.min(this.bgmCombo, 6) * 1.2);
  }

  private scheduleBgmSteps() {
    if (!this.isBgmPlaying || this.muted || !this.ctx || !this.bgmGain) return;
    const lookahead = 0.11;

    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      this.triggerBgmStep(this.currentStep, this.nextStepTime);
      const bpm = this.getCurrentBpm();
      const stepDuration = 60 / bpm / 4; // 16th-note duration
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 64;
    }
  }

  private triggerBgmStep(step: number, time: number) {
    const ctx = this.ctx;
    const dest = this.bgmGain;
    if (!ctx || !dest) return;

    const beatStep = step % 16;
    const isHighTension = this.bgmLayers >= 6;
    const isPeakTension = this.bgmLayers >= 12 || this.bgmCombo >= 3;

    // 1. Tight Kick Drum on quarter beats (+ syncopated kick when tower gets tall)
    if (beatStep % 4 === 0 || (isHighTension && (beatStep === 10 || beatStep === 14))) {
      const kick = ctx.createOscillator();
      const gain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(135, time);
      kick.frequency.exponentialRampToValueAtTime(44, time + 0.085);
      gain.gain.setValueAtTime(0.42, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      kick.connect(gain);
      gain.connect(dest);
      kick.start(time);
      kick.stop(time + 0.11);
    }

    // 2. Crisp Hi-Hat on offbeats (and driving 16ths when layers >= 4)
    if (this.noiseBuffer && (beatStep % 2 === 1 || (this.bgmLayers >= 4 && beatStep % 2 === 0))) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6800, time);
      const gain = ctx.createGain();
      const isAccented = beatStep % 4 === 2;
      const vol = isAccented ? 0.16 : beatStep % 2 === 1 ? 0.08 : 0.045;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccented ? 0.055 : 0.03));
      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(time);
      src.stop(time + 0.06);
    }

    // 3. Snappy Woodblock / Rim Backbeat on beats 2 & 4 (step 4, 12)
    if (beatStep === 4 || beatStep === 12) {
      const rim = ctx.createOscillator();
      const rimGain = ctx.createGain();
      rim.type = 'triangle';
      rim.frequency.setValueAtTime(920, time);
      rim.frequency.exponentialRampToValueAtTime(520, time + 0.04);
      rimGain.gain.setValueAtTime(0.14, time);
      rimGain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      rim.connect(rimGain);
      rimGain.connect(dest);
      rim.start(time);
      rim.stop(time + 0.05);
    }

    // 4. Driving Filtered Bassline
    const bassFreq = BASS_STEPS[step];
    if (bassFreq) {
      const bass = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassFreq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(580, time);
      filter.frequency.exponentialRampToValueAtTime(240, time + 0.11);

      gain.gain.setValueAtTime(0.24, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      bass.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      bass.start(time);
      bass.stop(time + 0.13);
    }

    // 5. Urgent Staccato Patisserie Lead Motif
    const leadFreq = LEAD_STEPS[step];
    if (leadFreq) {
      const lead = ctx.createOscillator();
      const leadGain = ctx.createGain();
      lead.type = 'triangle';
      lead.frequency.setValueAtTime(leadFreq, time);
      leadGain.gain.setValueAtTime(0.16, time);
      leadGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
      lead.connect(leadGain);
      leadGain.connect(dest);
      lead.start(time);
      lead.stop(time + 0.12);

      // Add bright octave shimmer on peak tension / high combo
      if (isPeakTension && step % 2 === 0) {
        const spark = ctx.createOscillator();
        const sparkGain = ctx.createGain();
        spark.type = 'sine';
        spark.frequency.setValueAtTime(leadFreq * 2, time);
        sparkGain.gain.setValueAtTime(0.045, time);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        spark.connect(sparkGain);
        sparkGain.connect(dest);
        spark.start(time);
        spark.stop(time + 0.09);
      }
    }
  }

  public playButton() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playRelease() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playLand(isPerfect: boolean, combo: number, widened: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Soft spongy landing thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(140, now);
    thump.frequency.exponentialRampToValueAtTime(58, now + 0.09);
    thumpGain.gain.setValueAtTime(0.2, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.11);

    if (isPerfect) {
      const noteIndex = Math.min(combo - 1, PENTATONIC_NOTES.length - 1);
      const freq = PENTATONIC_NOTES[Math.max(0, noteIndex)];

      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, now);
      chimeGain.gain.setValueAtTime(0.18, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chime.start(now);
      chime.stop(now + 0.36);

      // Subtle harmonic shimmer
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 1.5, now + 0.02);
      overGain.gain.setValueAtTime(0.06, now + 0.02);
      overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      overtone.connect(overGain);
      overGain.connect(ctx.destination);
      overtone.start(now + 0.02);
      overtone.stop(now + 0.28);

      if (widened) {
        // Celebratory rising triad for width bonus
        [1, 1.25, 1.5].forEach((mult, idx) => {
          const bonusOsc = ctx.createOscillator();
          const bonusGain = ctx.createGain();
          const t = now + 0.07 * (idx + 1);
          bonusOsc.type = 'sine';
          bonusOsc.frequency.setValueAtTime(523.25 * mult, t);
          bonusGain.gain.setValueAtTime(0.11, t);
          bonusGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          bonusOsc.connect(bonusGain);
          bonusGain.connect(ctx.destination);
          bonusOsc.start(t);
          bonusOsc.stop(t + 0.26);
        });
      }
    } else {
      // Gentle pastry slice sound + muted note
      const sliceOsc = ctx.createOscillator();
      const sliceGain = ctx.createGain();
      sliceOsc.type = 'triangle';
      sliceOsc.frequency.setValueAtTime(360, now);
      sliceOsc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
      sliceGain.gain.setValueAtTime(0.11, now);
      sliceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      sliceOsc.connect(sliceGain);
      sliceGain.connect(ctx.destination);
      sliceOsc.start(now);
      sliceOsc.stop(now + 0.14);
    }
  }

  public playPowerUp(kind: 'autoAlign' | 'widen' | 'shield') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs =
      kind === 'autoAlign'
        ? [587.33, 880, 1174.66]
        : kind === 'widen'
          ? [440, 554.37, 659.25]
          : [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.045;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playKnifeWarning() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.14].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + offset;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  public playKnifeSlice() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Blade whoosh + crisp cut transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.14);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playKnifeDeflect() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [1174.66, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.04;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playShieldSave() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.055;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playMiss() {
    this.stopBgm();
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [349.23, 293.66, 220.0];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.11;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}

export const patisserieAudio = new PatisserieAudioEngine();
