export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
  }

  async ensureContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  async startMicrophone() {
    await this.ensureContext();
    if (this.stream) return this.analyser;

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.82;
    this.source.connect(this.analyser);
    return this.analyser;
  }

  stopMicrophone() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
    }
    this.stream = null;
    this.source = null;
    this.analyser = null;
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0);
    const arr = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(arr);
    return arr;
  }

  async playTone(frequency, duration = 0.35) {
    await this.ensureContext();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    const now = this.audioCtx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }
}
