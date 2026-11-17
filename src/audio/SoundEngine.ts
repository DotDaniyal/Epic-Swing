import type { UserPreferences } from '@/types/game';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private sfxEnabled = true;
  private sfxVolume = 0.8;
  private musicEnabled = true;
  private musicVolume = 0.35;
  private muteAll = false;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private unlocked = false;

  public applyPreferences(prefs: UserPreferences): void {
    this.sfxEnabled = prefs.sfxEnabled;
    this.sfxVolume = prefs.sfxVolume;
    this.musicEnabled = prefs.musicEnabled;
    this.musicVolume = prefs.musicVolume;
    this.muteAll = prefs.muteAll;
    this.syncGains();
    this.syncMusicLoop();
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.syncGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    this.syncMusicLoop();
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private syncGains(): void {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const sfx = this.muteAll || !this.sfxEnabled ? 0 : this.sfxVolume;
    const mus = this.muteAll || !this.musicEnabled ? 0 : this.musicVolume * 0.32;
    this.sfxGain.gain.setTargetAtTime(sfx, now, 0.02);
    this.musicGain.gain.setTargetAtTime(mus, now, 0.06);
  }

  private syncMusicLoop(): void {
    const shouldPlay =
      this.unlocked &&
      !!this.ctx &&
      !this.muteAll &&
      this.musicEnabled &&
      this.musicVolume > 0.01;

    if (shouldPlay && this.musicTimer === null) {
      this.musicTimer = window.setInterval(() => {
        this.playMusicPulse();
      }, 420);
    } else if (!shouldPlay && this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playMusicPulse(): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const bassNotes = [73.42, 73.42, 87.31, 98.0, 73.42, 73.42, 110.0, 98.0];
    const padNotes = [293.66, 349.23, 392.0, 440.0];
    const freq = bassNotes[this.musicStep % bassNotes.length];

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.24, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.4);

    if (this.musicStep % 4 === 0) {
      const padFreq = padNotes[Math.floor(this.musicStep / 4) % padNotes.length];
      const pad = this.ctx.createOscillator();
      const padEnv = this.ctx.createGain();
      pad.type = 'sine';
      pad.frequency.setValueAtTime(padFreq, now);
      padEnv.gain.setValueAtTime(0.001, now);
      padEnv.gain.exponentialRampToValueAtTime(0.09, now + 0.25);
      padEnv.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
      pad.connect(padEnv);
      padEnv.connect(this.musicGain);
      pad.start(now);
      pad.stop(now + 1.6);
    }

    this.musicStep++;
  }

  public playPaddleHit(impactSpeed: number): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const intensity = Math.min(1, Math.max(0.18, impactSpeed / 5.0));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 + intensity * 140, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.065);
    gain.gain.setValueAtTime(0.38 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.075);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400 + intensity * 900, now);
      bp.Q.setValueAtTime(2.2, now);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.26 * intensity, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      noise.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.sfxGain!);
      noise.start(now);
      noise.stop(now + 0.05);
    }
  }

  public playWallHit(impactSpeed: number): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const intensity = Math.min(1, Math.max(0.14, impactSpeed / 5.2));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 + intensity * 260, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
    gain.gain.setValueAtTime(0.24 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playGoal(isPlayerOne: boolean): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const root = isPlayerOne ? 220 : 196;
    const freqs = [root, root * 1.25, root * 1.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16 / (idx + 1), now + 0.04);
      gain.gain.setValueAtTime(0.14 / (idx + 1), now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.92);
    });
  }

  public playCountdown(isGo: boolean): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.28 : 0.14));
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + (isGo ? 0.3 : 0.16));
  }

  public playVictory(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const start = now + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  public playDefeat(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [392.0, 349.23, 293.66, 220.0];
    notes.forEach((freq, i) => {
      const start = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, start);
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.52);
    });
  }

  public playMatchStart(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    [660, 990].forEach((freq, idx) => {
      const start = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  public playPowerUp(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playShieldBounce(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playClick(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playIntroSweep(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 1.3);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 1.3);
    filter.Q.setValueAtTime(3.0, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  public playIntroImpact(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(135, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.55);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    sub.connect(subGain);
    subGain.connect(this.sfxGain!);
    sub.start(now);
    sub.stop(now + 0.68);

    [440, 659.25, 880].forEach((freq) => {
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(freq, now);
      cGain.gain.setValueAtTime(0.001, now);
      cGain.gain.linearRampToValueAtTime(0.11, now + 0.02);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      chime.connect(cGain);
      cGain.connect(this.sfxGain!);
      chime.start(now);
      chime.stop(now + 0.8);
    });
  }

  public playCoinEarned(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  public playPurchaseSuccess(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  private canPlaySfx(): boolean {
    if (!this.unlocked || !this.ctx || !this.sfxGain) return false;
    if (this.muteAll || !this.sfxEnabled || this.sfxVolume <= 0.01) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx.state === 'running';
  }

  public dispose(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
