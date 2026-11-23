// Web Audio + HTML5 Streaming Audio Engine for LaLaLisa Native Web Edition
// Plays atmospheric low-passed Rockstar (Tokyo Drift Remix) from street speakers +
// layered Bangkok street ambience, and crisp synced diva.mp3 + cheer.wav on stage.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;

    // Street layers (HTMLAudioElement so iOS Safari streams MP3s cleanly without huge RAM decode)
    this.rockstar = this._makeAudio('./assets/sound/rockstar_ambient.mp3', true, 0.28);
    this.street = this._makeAudio('./assets/sound/noisy_street.mp3', true, 0.46);
    this.central = this._makeAudio('./assets/sound/central_market.mp3', true, 0.42);
    this.restaurant = this._makeAudio('./assets/sound/market_restaurant.mp3', true, 0.34);

    // Stage track + crowd cheer
    this.diva = this._makeAudio('./assets/sound/diva.mp3', false, 0.62);
    this.cheer = this._makeAudio('./assets/sound/cheer.wav', false, 0.50);

    this.speakerGain = null;
    this.cityPlaying = false;
    this.stagePlaying = false;
  }

  _makeAudio(src, loop, vol) {
    const el = new Audio();
    el.src = src;
    el.loop = loop;
    el.volume = vol;
    el.preload = src.includes('diva') ? 'auto' : 'metadata';
    el.playsInline = true;
    el.crossOrigin = 'anonymous';
    return el;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !this.ctx) {
        this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // Route Rockstar through a warm outdoor street-speaker low-pass filter!
        const src = this.ctx.createMediaElementSource(this.rockstar);
        const lpf = this.ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 2400;
        lpf.Q.value = 0.7;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.36;
        src.connect(lpf);
        lpf.connect(gain);
        gain.connect(this.ctx.destination);
        this.speakerGain = gain;
      }
    } catch {
      // Fallback: plain HTMLAudioElement playback without WebAudio filter
    }
  }

  setMuted(m) {
    this.muted = m;
    for (const a of [this.rockstar, this.street, this.central, this.restaurant, this.diva, this.cheer]) {
      a.muted = m;
    }
  }

  startCity() {
    this.unlock();
    this.cityPlaying = true;
    for (const a of [this.rockstar, this.street, this.central, this.restaurant]) {
      a.muted = this.muted;
      if (a.paused) a.play().catch(() => {});
    }
  }

  stopCity() {
    this.cityPlaying = false;
    for (const a of [this.rockstar, this.street, this.central, this.restaurant]) {
      a.pause();
    }
  }

  updateCitySpatial(lisaPos, speakerPositions) {
    if (!this.cityPlaying) return;
    let nearest = 99.0;
    for (const sp of speakerPositions) {
      const dx = lisaPos.x - sp.x;
      const dz = lisaPos.z - sp.z;
      const d = Math.hypot(dx, dz);
      if (d < nearest) nearest = d;
    }
    const proximity = Math.max(0, Math.min(1, 1.0 - (nearest - 2.0) / 14.0));
    const vol = 0.16 + proximity * 0.32;
    if (this.speakerGain) {
      this.speakerGain.gain.value = vol;
    } else {
      this.rockstar.volume = vol;
    }
  }

  prepareStage() {
    this.unlock();
    this.stopCity();
    this.diva.pause();
    try { this.diva.currentTime = 0; } catch {}
    this.stagePlaying = false;
  }

  playStage() {
    this.unlock();
    this.diva.muted = this.muted;
    this.diva.play().catch(() => {});
    this.stagePlaying = true;
  }

  stopStage() {
    this.diva.pause();
    this.stagePlaying = false;
  }

  playCheer() {
    if (this.muted) return;
    try {
      this.cheer.currentTime = 0;
      this.cheer.play().catch(() => {});
    } catch {}
  }

  get trackTime() {
    return this.diva.currentTime || 0;
  }

  get trackPlaying() {
    return this.stagePlaying && !this.diva.paused && !this.diva.ended;
  }
}
