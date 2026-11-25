import type { AudioSettings } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private settings: AudioSettings = {
    muted: false,
    bgmEnabled: true,
    masterVolume: 0.72,
    sfxVolume: 0.85,
    bgmVolume: 0.52,
  };

  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmIntensity = 1; // 1 normal, 2 boss/awakened
  private bgmPlaying = false;

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>): AudioSettings {
    this.settings = { ...this.settings, ...partial };
    this.applyVolumes();
    if (!this.settings.bgmEnabled || this.settings.muted) {
      this.stopBgmLoop();
    } else if (this.bgmPlaying) {
      this.startBgmLoop();
    }
    return this.getSettings();
  }

  public toggleMute(): AudioSettings {
    return this.updateSettings({ muted: !this.settings.muted });
  }

  public toggleBgm(): AudioSettings {
    return this.updateSettings({ bgmEnabled: !this.settings.bgmEnabled });
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.createNoiseBuffer();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const length = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.02);
    this.bgmGain.gain.setTargetAtTime(this.settings.bgmEnabled ? this.settings.bgmVolume : 0, now, 0.04);
  }

  public setBgmActive(active: boolean, intensity = 1): void {
    this.bgmPlaying = active;
    this.bgmIntensity = intensity;
    if (active && this.settings.bgmEnabled && !this.settings.muted) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
  }

  public setBgmIntensity(intensity: number): void {
    this.bgmIntensity = intensity;
  }

  private startBgmLoop(): void {
    if (this.bgmTimer !== null || typeof window === 'undefined') return;
    // 136 BPM -> 16th note = 60 / 136 / 4 = 0.1103s (~110ms)
    const stepMs = 110;
    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx || !this.bgmGain || this.ctx.state !== 'running') return;
      if (this.settings.muted || !this.settings.bgmEnabled || !this.bgmPlaying) return;
      this.playBgmStep(this.bgmStep);
      this.bgmStep = (this.bgmStep + 1) % 32;
    }, stepMs);
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playBgmStep(step: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const barStep = step % 16;

    // Punchy Phonk 808 Kick on beats 0, 6, 8, 10, 14
    if (barStep === 0 || barStep === 6 || barStep === 8 || barStep === 14 || (this.bgmIntensity >= 2 && barStep === 10)) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);
      g.gain.setValueAtTime(0.42, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.17);
    }

    // Crisp Snare / Clap on 4 & 12
    if (barStep === 4 || barStep === 12) {
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1900, now);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.24, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.bgmGain);
        src.start(now);
        src.stop(now + 0.12);
      }
    }

    // Driving Hi-Hat every 2 steps (or every step in boss/awakened)
    if (barStep % 2 === 0 || (this.bgmIntensity >= 2 && barStep % 2 === 1)) {
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(7500, now);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(barStep % 2 === 0 ? 0.08 : 0.04, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.bgmGain);
        src.start(now);
        src.stop(now + 0.05);
      }
    }

    // Dark Phonk / Cyber Bassline (F minor pentatonic)
    const bassNotes = [
      43.65, 0, 43.65, 51.91, 0, 43.65, 58.27, 0,
      43.65, 0, 65.41, 58.27, 0, 51.91, 49.0, 0,
      43.65, 0, 43.65, 51.91, 0, 58.27, 65.41, 0,
      77.78, 0, 65.41, 58.27, 51.91, 0, 43.65, 0,
    ];
    const bassFreq = bassNotes[step];
    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const flt = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, now);
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(this.bgmIntensity >= 2 ? 420 : 280, now);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(flt);
      flt.connect(g);
      g.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    // Phonk Cowbell / Cyber Lead Melody
    const melody = [
      349.23, 0, 415.3, 0, 466.16, 0, 523.25, 466.16,
      0, 415.3, 349.23, 0, 311.13, 0, 349.23, 0,
      349.23, 0, 466.16, 0, 523.25, 0, 622.25, 523.25,
      0, 466.16, 415.3, 349.23, 0, 311.13, 349.23, 0,
    ];
    const note = melody[step];
    if (note > 0 && (this.bgmIntensity >= 2 || step < 16 || step % 2 === 0)) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const bp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc1.type = 'square';
      osc2.type = 'triangle';
      const mult = this.bgmIntensity >= 2 ? 1.5 : 1;
      osc1.frequency.setValueAtTime(note * mult, now);
      osc2.frequency.setValueAtTime(note * mult * 1.498, now);
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400, now);
      bp.Q.setValueAtTime(1.8, now);
      g.gain.setValueAtTime(0.065, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(bp);
      osc2.connect(bp);
      bp.connect(g);
      g.connect(this.bgmGain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.11);
      osc2.stop(now + 0.11);
    }
  }

  private ready(): boolean {
    if (this.settings.muted || !this.ctx || !this.sfxGain) return false;
    return this.ctx.state === 'running';
  }

  private pitchJitter(base: number, pct = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  public playSlash(comboIndex: number, awakened = false): void {
    if (!this.ready() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const startFreq = this.pitchJitter(awakened ? 1600 : 2400 + comboIndex * 320);
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(awakened ? 220 : 420, now + 0.13);
    filter.Q.setValueAtTime(awakened ? 2.6 : 1.8, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(awakened ? 0.36 : 0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.15);

    if (awakened) {
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(190, now);
      sub.frequency.exponentialRampToValueAtTime(52, now + 0.18);
      sg.gain.setValueAtTime(0.18, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      sub.connect(sg);
      sg.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.2);
    }
  }

  public playHit(heavy = false): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = heavy ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(heavy ? 185 : 240), now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 36 : 62, now + (heavy ? 0.14 : 0.08));
    g.gain.setValueAtTime(heavy ? 0.42 : 0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.15 : 0.09));
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (heavy ? 0.16 : 0.1));

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(heavy ? 1800 : 1200, now);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(heavy ? 0.24 : 0.14, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.08);
    }
  }

  public playParry(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // High-frequency metallic FM "KENG!" chime
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const g = this.ctx.createGain();

    carrier.type = 'sine';
    mod.type = 'square';
    const base = this.pitchJitter(1480, 0.04);
    carrier.frequency.setValueAtTime(base, now);
    carrier.frequency.exponentialRampToValueAtTime(base * 1.15, now + 0.04);
    mod.frequency.setValueAtTime(base * 2.71, now);
    modGain.gain.setValueAtTime(1600, now);
    modGain.gain.exponentialRampToValueAtTime(90, now + 0.42);

    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(g);
    g.connect(this.sfxGain);
    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 0.48);
    mod.stop(now + 0.48);

    // Bright harmonic overtone ring
    const ring = this.ctx.createOscillator();
    const rg = this.ctx.createGain();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(base * 2.0, now);
    rg.gain.setValueAtTime(0.22, now);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    ring.connect(rg);
    rg.connect(this.sfxGain);
    ring.start(now);
    ring.stop(now + 0.34);
  }

  public playShieldClang(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.14);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playCryoSummon(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freqs = [880, 1174.66, 1567.98, 2093];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.032);
      g.gain.setValueAtTime(0.18, now + idx * 0.032);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.032 + 0.24);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.032);
      osc.stop(now + idx * 0.032 + 0.25);
    });
  }

  public playCryoShatter(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playHit(true);
    const chimes = [2349, 1760, 2793, 1396, 3136];
    chimes.forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.pitchJitter(f, 0.06), now + i * 0.02);
      g.gain.setValueAtTime(0.14, now + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.02);
      osc.stop(now + i * 0.02 + 0.19);
    });
  }

  public playGunshot(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(this.pitchJitter(1400), now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.1);
  }

  public playLaser(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSheathClick(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Crisp metallic "CẠCH!"
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.055);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);

    const ping = this.ctx.createOscillator();
    const pg = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(2480, now + 0.015);
    pg.gain.setValueAtTime(0.25, now + 0.015);
    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    ping.connect(pg);
    pg.connect(this.sfxGain);
    ping.start(now + 0.015);
    ping.stop(now + 0.28);
  }

  public playKanjiDrop(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Massive anime sub-bass drop for 断
    const sub = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.65);
    g.gain.setValueAtTime(0.75, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    sub.connect(g);
    g.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.75);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, now);
      lp.frequency.exponentialRampToValueAtTime(120, now + 0.55);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.4, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.6);
    }
  }

  public playAwaken(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [220, 329.63, 440, 659.25, 880];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(f * 1.05, now + idx * 0.06 + 0.45);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2200, now);
      g.gain.setValueAtTime(0.16, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.52);
    });
    this.playKanjiDrop();
  }

  public playDash(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2200, now);
    hp.frequency.exponentialRampToValueAtTime(600, now + 0.11);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.13);
  }

  public playJump(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(180), now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playChairKick(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBossIntro(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.55);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(550, now);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  public playTelegraph(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1240, now + 0.16);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playVictory(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      g.gain.setValueAtTime(0.2, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.65);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.68);
    });
  }

  public playDefeat(): void {
    if (!this.ready() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 261.63, 220, 146.83];
    notes.forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(700, now);
      osc.frequency.setValueAtTime(f, now + i * 0.11);
      g.gain.setValueAtTime(0.18, now + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.4);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.42);
    });
  }

  public destroy(): void {
    this.stopBgmLoop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
