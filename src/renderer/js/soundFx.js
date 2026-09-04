// Sintetizador de efectos de sonido procedurales retro con Web Audio API - v1.2.0
class SoundFxManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  // Sonido de clic mecánico para abrir pestañas
  playClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Sonido de compra de mejora / Overclock
  playUpgrade() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1280, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Activación de multiplicador pesado (Power Up)
  playPower(isActive) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    if (isActive) {
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);
    }

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.17);
  }

  // Beep de advertencia cuando se entra en zona de peligro
  playWarning() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Sirena y fallo crítico / Glitch BSOD
  playGameOver() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Tono oscilador con caída y distorsión
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.25);
    osc.frequency.linearRampToValueAtTime(600, now + 0.5);
    osc.frequency.linearRampToValueAtTime(60, now + 0.9);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.15);

    // Ráfaga corta de ruido blanco / glitch
    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) {
      // Audio buffer fallback
    }
  }

  // Tono de booteo/reinicio del sistema
  playReset() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

window.SoundFxManager = SoundFxManager;
