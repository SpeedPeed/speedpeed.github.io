'use strict';
// ============================================================
//  Synthetischer Sound (WebAudio, keine Dateien nötig)
// ============================================================
const Sfx = {
  ctx: null, eng: null, engGain: null, filt: null, master: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  on() { return this.ctx && save.settings.sound; },
  engineStart() {
    if (!this.on() || this.eng) return;
    const c = this.ctx;
    this.eng = c.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 50;
    this.eng2 = c.createOscillator(); this.eng2.type = 'square'; this.eng2.frequency.value = 25;
    this.filt = c.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 500;
    this.engGain = c.createGain(); this.engGain.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = 0.4;
    this.eng.connect(this.filt); this.eng2.connect(g2); g2.connect(this.filt);
    this.filt.connect(this.engGain); this.engGain.connect(this.master);
    this.eng.start(); this.eng2.start();
  },
  engineUpdate(speed, gas, nitro) {
    if (!this.eng) return;
    const t = this.ctx.currentTime;
    const f = 45 + Math.min(speed, 2500) * 0.07 + gas * 25 + (nitro ? 40 : 0);
    this.eng.frequency.setTargetAtTime(f, t, 0.05);
    this.eng2.frequency.setTargetAtTime(f / 2, t, 0.05);
    this.filt.frequency.setTargetAtTime(350 + gas * 700 + (nitro ? 800 : 0), t, 0.05);
    this.engGain.gain.setTargetAtTime(save.settings.sound ? 0.09 + gas * 0.07 : 0, t, 0.08);
  },
  engineStop() {
    if (!this.eng) return;
    try { this.eng.stop(); this.eng2.stop(); } catch (e) { }
    this.eng = null; this.eng2 = null;
  },
  tone(freq, dur, type, vol, slide) {
    if (!this.on()) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    if (!this.on()) return;
    const c = this.ctx, n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(); g.gain.value = vol || 0.3;
    s.buffer = b; s.connect(g); g.connect(this.master); s.start();
  },
  lastCoin: 0,
  play(e) {
    switch (e) {
      case 'coin': { const now = performance.now(); if (now - this.lastCoin < 40) return; this.lastCoin = now; this.tone(1200 + Math.random() * 300, 0.08, 'square', 0.06); break; }
      case 'fuel': this.tone(400, 0.25, 'triangle', 0.2, 900); break;
      case 'gem': this.tone(900, 0.12, 'sine', 0.2); setTimeout(() => this.tone(1400, 0.2, 'sine', 0.2), 90); break;
      case 'flip': [500, 700, 900].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'square', 0.08), i * 70)); break;
      case 'nitro': this.noise(0.6, 0.25); this.tone(200, 0.6, 'sawtooth', 0.08, 800); break;
      case 'pad': this.tone(300, 0.3, 'sawtooth', 0.08, 1200); break;
      case 'crash': this.noise(0.5, 0.5); this.tone(120, 0.4, 'square', 0.15, 40); break;
      case 'nofuel': this.tone(400, 0.6, 'triangle', 0.2, 100); break;
      case 'helmet': this.tone(300, 0.2, 'square', 0.15, 600); break;
      case 'milestone': case 'record': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'triangle', 0.15), i * 90)); break;
      case 'buy': this.tone(700, 0.08, 'square', 0.1); setTimeout(() => this.tone(1050, 0.12, 'square', 0.1), 60); break;
      case 'evo': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.15), i * 110)); break;
      case 'click': this.tone(600, 0.04, 'square', 0.05); break;
      case 'error': this.tone(180, 0.15, 'square', 0.1); break;
    }
  },
};
function vibrate(ms) { if (save.settings.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }
