// 程序化环境音：舰体嗡鸣、通风、门、电梯、脚步、舰桥提示音
const ZONES = {
  exterior: { hum: 0.0, rumble: 0.0, air: 0.0, pitch: 1.0 },
  ship: { hum: 0.16, rumble: 0.10, air: 0.05, pitch: 1.0 },
  bridge: { hum: 0.10, rumble: 0.06, air: 0.03, pitch: 1.3 },
  engineering: { hum: 0.24, rumble: 0.32, air: 0.06, pitch: 0.8 },
  nacelle: { hum: 0.26, rumble: 0.24, air: 0.10, pitch: 1.6 },
  bay: { hum: 0.12, rumble: 0.14, air: 0.12, pitch: 0.7 },
};

export class ShipAudio {
  constructor() { this.ctx = null; this.muted = false; this.zone = 'exterior'; this.cur = { ...ZONES.exterior }; this.beepT = 3; }

  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ctx.destination);

    const mkNoise = () => {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 + w * 0.15; }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      return src;
    };
    // 嗡鸣
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth'; this.o1.frequency.value = 46;
    this.o2 = ctx.createOscillator(); this.o2.type = 'sine'; this.o2.frequency.value = 92.7;
    this.o3 = ctx.createOscillator(); this.o3.type = 'triangle'; this.o3.frequency.value = 138.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
    this.o1.connect(lp); this.o3.connect(lp); lp.connect(this.humGain); this.o2.connect(this.humGain);
    this.humGain.connect(this.master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(this.humGain.gain);
    // 轰鸣
    this.rumbleSrc = mkNoise();
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 260;
    this.rumbleGain = ctx.createGain(); this.rumbleGain.gain.value = 0;
    this.rumbleSrc.connect(rl); rl.connect(this.rumbleGain); this.rumbleGain.connect(this.master);
    // 通风
    this.airSrc = mkNoise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
    this.airGain = ctx.createGain(); this.airGain.gain.value = 0;
    this.airSrc.connect(hp); hp.connect(this.airGain); this.airGain.connect(this.master);
    this.noiseBuf = this.rumbleSrc.buffer;
    [this.o1, this.o2, this.o3, lfo, this.rumbleSrc, this.airSrc].forEach((n) => n.start());
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.55; }

  setZone(kind) { this.zone = ZONES[kind] ? kind : 'ship'; }

  update(dt) {
    if (!this.ctx) return;
    const z = ZONES[this.zone], k = Math.min(1, dt * 1.6);
    for (const key of ['hum', 'rumble', 'air', 'pitch']) this.cur[key] += (z[key] - this.cur[key]) * k;
    const t = this.ctx.currentTime;
    this.humGain.gain.setTargetAtTime(this.cur.hum * 0.5, t, 0.1);
    this.rumbleGain.gain.setTargetAtTime(this.cur.rumble, t, 0.1);
    this.airGain.gain.setTargetAtTime(this.cur.air * 0.4, t, 0.1);
    this.o1.frequency.setTargetAtTime(46 * this.cur.pitch, t, 0.2);
    this.o2.frequency.setTargetAtTime(92.7 * this.cur.pitch, t, 0.2);
    this.o3.frequency.setTargetAtTime(138.5 * this.cur.pitch, t, 0.2);
    if (this.zone === 'bridge') {
      this.beepT -= dt;
      if (this.beepT < 0) { this.beep(); this.beepT = 1.2 + Math.random() * 4; }
    }
  }

  tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slide = 0) {
    if (!this.ctx || this.muted) return;
    vol = Math.max(0.0002, vol);
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noiseBurst(dur, f0, f1, vol = 0.2, q = 1.2) {
    if (!this.ctx || this.muted || vol < 0.003) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  door(open, gain = 1) { this.noiseBurst(open ? 0.42 : 0.5, open ? 500 : 2200, open ? 2600 : 420, 0.55 * gain, 1.4); this.tone(open ? 660 : 440, 0.09, 'square', 0.02 * gain); }
  lift() { this.tone(110, 0.9, 'sawtooth', 0.045, 0, 1.8); this.noiseBurst(0.8, 200, 800, 0.22, 0.8); }
  step() { this.noiseBurst(0.07, 380 + Math.random() * 120, 160, 0.16, 2.4); }
  beep() { const b = [880, 1046, 1318, 988][Math.floor(Math.random() * 4)]; this.tone(b, 0.07, 'sine', 0.05); if (Math.random() < 0.6) this.tone(b * 1.5, 0.06, 'sine', 0.04, 0.09); }
  chime() { this.tone(1046, 0.4, 'sine', 0.06); this.tone(1568, 0.5, 'sine', 0.05, 0.12); }
}
