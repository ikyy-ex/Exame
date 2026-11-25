/* ==========================================================================
   SKY WARRIORS 3D — PROCEDURAL WEB AUDIO ENGINE (JET, WIND, COMBAT & MUSIC)
   Zero external audio files required — works 100% offline on Android & PC
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicVol = 0.65;
    this.sfxVol = 0.85;
    this.initialized = false;

    this.engineGain = null;
    this.engineFilter = null;
    this.engineOsc = null;
    this.windGain = null;
    this.windFilter = null;

    this.musicTimer = null;
    this.musicStep = 0;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.initialized = true;
    this._setupContinuousLoops();
    this.startMusic();
  }

  setVolumes(musicPct, sfxPct) {
    this.musicVol = Math.max(0, Math.min(1, musicPct / 100));
    this.sfxVol = Math.max(0, Math.min(1, sfxPct / 100));
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      if (this.windGain) this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  _createNoiseBuffer(seconds = 2) {
    const sampleRate = this.ctx.sampleRate;
    const len = sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, len, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }
    return buffer;
  }

  _setupContinuousLoops() {
    if (!this.ctx) return;
    const noiseBuf = this._createNoiseBuffer(3);

    // Jet roar noise
    const jetNoise = this.ctx.createBufferSource();
    jetNoise.buffer = noiseBuf;
    jetNoise.loop = true;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 180;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    // Turbine whine oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 68;
    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.18;

    this.engineOsc.connect(oscGain);
    oscGain.connect(this.engineFilter);
    jetNoise.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    jetNoise.start();
    this.engineOsc.start();

    // High-speed wind rush
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuf;
    windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 650;
    this.windFilter.Q.value = 1.4;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    windNoise.start();
  }

  updateFlightAudio(throttleRatio, isAfterburner, active) {
    if (!this.initialized || !this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (!active || this.muted || this.sfxVol <= 0.01) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.windGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const baseGain = (0.09 + throttleRatio * 0.16 + (isAfterburner ? 0.09 : 0)) * this.sfxVol;
    const cutoff = 160 + throttleRatio * 420 + (isAfterburner ? 360 : 0);
    const pitch = 58 + throttleRatio * 55 + (isAfterburner ? 24 : 0);

    this.engineGain.gain.setTargetAtTime(baseGain, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    this.engineOsc.frequency.setTargetAtTime(pitch, now, 0.08);

    const wGain = Math.max(0, (throttleRatio - 0.35) * 0.14) * this.sfxVol;
    this.windGain.gain.setTargetAtTime(wGain, now, 0.1);
    this.windFilter.frequency.setTargetAtTime(520 + throttleRatio * 750, now, 0.1);
  }

  startMusic() {
    if (this.musicTimer) return;
    const notes = [73.42, 73.42, 87.31, 65.41, 73.42, 73.42, 98.00, 82.41]; // D2 tactical bassline
    this.musicTimer = setInterval(() => {
      if (!this.initialized || !this.ctx || this.muted || this.musicVol <= 0.01) return;
      if (this.ctx.state === "suspended") return;
      const now = this.ctx.currentTime;
      const freq = notes[this.musicStep % notes.length];

      // Deep tactical synth pulse
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(240, now);

      const vol = 0.085 * this.musicVol;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.58);

      // Subtle military snare tick on off-beats
      if (this.musicStep % 2 === 1) {
        const pOsc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        pOsc.type = "sine";
        pOsc.frequency.setValueAtTime(140, now);
        pOsc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
        pGain.gain.setValueAtTime(0.04 * this.musicVol, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        pOsc.connect(pGain);
        pGain.connect(this.ctx.destination);
        pOsc.start(now);
        pOsc.stop(now + 0.11);
      }

      this.musicStep++;
    }, 620);
  }

  playSfx(type) {
    if (!this.initialized) this.init();
    if (!this.ctx || this.muted || this.sfxVol <= 0.01) return;
    const now = this.ctx.currentTime;
    const v = this.sfxVol;

    if (type === "click") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
      g.gain.setValueAtTime(0.12 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.055);
    } else if (type === "gun") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(190 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.06);
      g.gain.setValueAtTime(0.16 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.07);
    } else if (type === "missile") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.65);
      g.gain.setValueAtTime(0.22 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.7);
    } else if (type === "flare") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      g.gain.setValueAtTime(0.16 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.19);
    } else if (type === "explosion") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.85);
      g.gain.setValueAtTime(0.36 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.92);
    } else if (type === "hit") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      g.gain.setValueAtTime(0.28 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === "maneuver") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.36);
      g.gain.setValueAtTime(0.15 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === "lock") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1180, now);
      g.gain.setValueAtTime(0.11 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === "warning") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.1);
      g.gain.setValueAtTime(0.13 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.24);
    } else if (type === "ring") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.09);
      g.gain.setValueAtTime(0.18 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.3);
    }
  }
}

window.soundEngine = new SoundEngine();
