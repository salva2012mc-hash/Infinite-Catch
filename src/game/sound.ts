class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public musicMuted = false;
  public musicVolume = 0.55;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playCast(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playBite(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.18, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.19);
    });
  }

  public playCatch(world?: 'river' | 'underworld'): void {
    if (world === 'underworld') {
      this.playUnderworldCatch();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.16, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.26);
    });
  }

  public playUnderworldCatch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass demonic rumble sweeping down
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subFilter = ctx.createBiquadFilter();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.38);

    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(360, now);
    subFilter.frequency.exponentialRampToValueAtTime(140, now + 0.38);

    subGain.gain.setValueAtTime(0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.44);

    // Deep, dark minor & diminished chord progression (D minor / Phrygian)
    const darkNotes = [73.42, 110.0, 146.83, 174.61, 207.65];
    darkNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteFilter = ctx.createBiquadFilter();

      osc.type = i % 2 === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(620, now + i * 0.06);
      noteFilter.frequency.exponentialRampToValueAtTime(220, now + i * 0.06 + 0.36);

      gain.gain.setValueAtTime(0.18, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.38);

      osc.connect(noteFilter);
      noteFilter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.4);
    });
  }

  public playMiss(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playEpicIntro() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [220, 277.18, 329.63, 440];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.14 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.72);
    });
  }

  public playCelebration(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Fanfarria ascendente alegre (C5 -> E5 -> G5 -> C6 -> E6)
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    fanfareNotes.forEach((freq, i) => {
      const start = now + i * 0.06;
      const dur = i === fanfareNotes.length - 1 ? 0.42 : 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });

    // Acorde brillante final (C6 + E6 + G6)
    const chordStart = now + 0.24;
    [1046.5, 1318.51, 1567.98].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordStart);
      gain.gain.setValueAtTime(0.001, chordStart);
      gain.gain.linearRampToValueAtTime(0.09, chordStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(chordStart);
      osc.stop(chordStart + 0.57);
    });
  }

  public playTravel(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.85);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.92);
  }

  public playWizardRay(intensity: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const clamped = Math.max(1, Math.min(7, intensity));

    // Upward arcane beam sweep
    const beamOsc = ctx.createOscillator();
    const beamGain = ctx.createGain();
    beamOsc.type = clamped >= 5 ? 'sawtooth' : 'triangle';
    const baseFreq = 240 + clamped * 45;
    beamOsc.frequency.setValueAtTime(baseFreq, now);
    beamOsc.frequency.exponentialRampToValueAtTime(baseFreq * (2.1 + clamped * 0.18), now + 0.32);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400 + clamped * 450, now);

    const peakGain = 0.08 + clamped * 0.02;
    beamGain.gain.setValueAtTime(0.001, now);
    beamGain.gain.linearRampToValueAtTime(peakGain, now + 0.04);
    beamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38 + clamped * 0.04);

    beamOsc.connect(filter);
    filter.connect(beamGain);
    beamGain.connect(ctx.destination);
    beamOsc.start(now);
    beamOsc.stop(now + 0.44 + clamped * 0.04);

    // Extra harmonic shimmer for higher rarities
    if (clamped >= 3) {
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(660 + clamped * 90, now + 0.04);
      shimmerOsc.frequency.exponentialRampToValueAtTime(1320 + clamped * 140, now + 0.42);
      shimmerGain.gain.setValueAtTime(0.001, now + 0.04);
      shimmerGain.gain.linearRampToValueAtTime(0.05 + clamped * 0.012, now + 0.1);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46 + clamped * 0.04);
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmerOsc.start(now + 0.04);
      shimmerOsc.stop(now + 0.5 + clamped * 0.04);
    }
  }

  public playCashRegister(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Clásico "cha-ching": golpe mecánico breve + doble campana brillante E6 -> B6
    [1318.51, 1975.53].forEach((freq, i) => {
      const start = now + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });

    // Armónico cristalino extra
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(2637.02, now + 0.09);
    sGain.gain.setValueAtTime(0.001, now + 0.09);
    sGain.gain.linearRampToValueAtTime(0.07, now + 0.11);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    shimmer.connect(sGain);
    sGain.connect(ctx.destination);
    shimmer.start(now + 0.09);
    shimmer.stop(now + 0.44);
  }

  public playMagmaEruption(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Estruendo grave volcánico descendente
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.52);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.52);

    subGain.gain.setValueAtTime(0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    sub.connect(filter);
    filter.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.56);

    // Chisporroteo breve de lava
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(1100, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(band);
    band.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  }

  public playArcanePortal(isCritical = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chord = isCritical ? [392.0, 587.33, 783.99, 1174.66] : [329.63, 493.88, 659.25];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * 0.92, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, now + 0.42 + i * 0.04);
      gain.gain.setValueAtTime(0.001, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.04 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55 + i * 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.62 + i * 0.05);
    });
  }

  public playLineSnap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sharp snap transient noise
    const bufLen = Math.floor(ctx.sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.028));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(950, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.24, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // Downward twang/whip tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.24);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playReelTug(tension = 0.4): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 260 + Math.min(1, Math.max(0, tension)) * 220;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.045);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public isMusicPlaying(): boolean {
    return this.musicTimer !== null;
  }

  public setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (muted) {
      this.stopBackgroundMusic();
    } else if (!this.muted) {
      this.startBackgroundMusic();
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  private playCalmMusicStep(): void {
    if (this.muted || this.musicMuted || this.musicVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Gentle 8-step pentatonic / major7 riverside progression (100% original procedural synthesis)
    const chords: readonly (readonly number[])[] = [
      [130.81, 196.0, 246.94, 329.63], // Cmaj7
      [110.0, 164.81, 220.0, 261.63], // Am7
      [87.31, 130.81, 174.61, 220.0], // Fmaj7
      [98.0, 146.83, 196.0, 293.66], // G6
      [130.81, 164.81, 196.0, 293.66], // Cadd9
      [110.0, 146.83, 196.0, 261.63], // Em7/A
      [87.31, 130.81, 164.81, 246.94], // Fmaj9
      [98.0, 146.83, 220.0, 246.94], // Gadd6
    ];
    const melodies: readonly number[] = [
      523.25, 659.25, 587.33, 493.88, 523.25, 440.0, 392.0, 440.0,
    ];

    const stepIndex = this.musicStep % chords.length;
    this.musicStep += 1;
    const chord = chords[stepIndex];
    const vol = this.musicVolume * 0.032;

    // Warm low-pass pad chord
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol * (idx === 0 ? 1.15 : 0.75), now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.8);
    });

    // Soft acoustic marimba / kalimba water drop note
    const melodyFreq = melodies[stepIndex];
    const pluck = ctx.createOscillator();
    const pluckGain = ctx.createGain();
    pluck.type = 'sine';
    pluck.frequency.setValueAtTime(melodyFreq, now + 0.32);

    pluckGain.gain.setValueAtTime(0.0001, now + 0.32);
    pluckGain.gain.linearRampToValueAtTime(vol * 0.95, now + 0.36);
    pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

    pluck.connect(pluckGain);
    pluckGain.connect(ctx.destination);
    pluck.start(now + 0.32);
    pluck.stop(now + 1.7);
  }

  public startBackgroundMusic(): void {
    if (this.muted || this.musicMuted) return;
    if (this.musicTimer !== null) return;
    this.playCalmMusicStep();
    if (typeof window !== 'undefined') {
      this.musicTimer = setInterval(() => {
        if (this.muted || this.musicMuted) {
          this.stopBackgroundMusic();
          return;
        }
        this.playCalmMusicStep();
      }, 2600);
    }
  }

  public stopBackgroundMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const sound = new SoundEngine();

