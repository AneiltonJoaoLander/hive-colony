'use strict';
/* Sons sintetizados com Web Audio (sem arquivos de áudio). */

const Sound = {
  ctx: null, master: null, noiseBuf: null,
  on: true, vol: 0.7, BOOST: 2.4,

  load() {
    try {
      const o = JSON.parse(localStorage.getItem('hive-sound') || 'null');
      if (o) { this.on = o.on !== false; if (typeof o.vol === 'number') this.vol = Math.max(0, Math.min(1, o.vol)); }
    } catch (e) { /* ignore */ }
  },
  save() {
    try { localStorage.setItem('hive-sound', JSON.stringify({ on: this.on, vol: this.vol })); } catch (e) { /* ignore */ }
  },

  /* cria o contexto de áudio (precisa de um gesto do usuário no celular) */
  init(ctxOverride) {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctxOverride && !AC) return false;
    try { this.ctx = ctxOverride || new AC(); } catch (e) { return false; }
    const comp = this.ctx.createDynamicsCompressor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol * this.BOOST;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  },
  unlock() {
    if (!this.init()) return;
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* ignore */ } }
  },
  setVolume(v) {
    this.vol = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.vol * this.BOOST;
    this.save();
  },
  setOn(v) { this.on = !!v; this.save(); },

  /* ---- blocos básicos ---- */
  tone({ f = 440, f2 = null, t = 0.1, type = 'sine', v = 0.25, at = 0, a = 0.004 }) {
    const c = this.ctx, t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + t + 0.05);
  },
  noise({ f = 1000, f2 = null, q = 1, t = 0.1, v = 0.25, at = 0, type = 'bandpass', a = 0.004 }) {
    const c = this.ctx, t0 = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const flt = c.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t0);
    if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(flt); flt.connect(g); g.connect(this.master);
    s.start(t0, Math.random() * 0.2); s.stop(t0 + t + 0.05);
  },
  notes(list, o = {}) {
    list.forEach((f, i) => this.tone(Object.assign({ f, t: 0.14, type: 'triangle', v: 0.22, at: (o.at || 0) + i * (o.gap || 0.11) }, o.last && i === list.length - 1 ? o.last : {})));
  },

  /* ---- receitas ---- */
  RECIPES: {
    place() { this.tone({ f: 230, f2: 85, t: 0.13, v: 0.55 }); this.noise({ f: 1900, q: 1.3, t: 0.05, v: 0.35 }); this.tone({ f: 700, f2: 340, t: 0.06, type: 'triangle', v: 0.12 }); },
    move() { this.noise({ f: 450, f2: 1500, q: 0.9, t: 0.17, v: 0.26 }); this.tone({ f: 320, f2: 190, t: 0.08, type: 'triangle', v: 0.18, at: 0.11 }); this.noise({ f: 1700, q: 1.3, t: 0.04, v: 0.2, at: 0.15 }); },
    select() { this.tone({ f: 1500, t: 0.035, type: 'square', v: 0.16 }); this.tone({ f: 2200, t: 0.02, v: 0.1 }); },
    mark() { this.tone({ f: 800, f2: 1150, t: 0.08, v: 0.3 }); },
    capture() { this.noise({ f: 1000, f2: 180, q: 0.7, t: 0.28, v: 0.5 }); this.tone({ f: 210, f2: 50, t: 0.34, type: 'sawtooth', v: 0.32 }); },
    sting() { this.tone({ f: 1500, f2: 320, t: 0.13, type: 'sawtooth', v: 0.18 }); this.tone({ f: 95, t: 0.09, v: 0.3, at: 0.02 }); },
    flip() { this.tone({ f: 700, t: 0.045, type: 'square', v: 0.09 }); this.tone({ f: 990, t: 0.05, type: 'square', v: 0.09, at: 0.07 }); this.noise({ f: 2500, q: 0.6, t: 0.05, v: 0.12, at: 0.07 }); },
    throw() { this.noise({ f: 300, f2: 2600, q: 1.3, t: 0.3, v: 0.34 }); this.tone({ f: 260, f2: 520, t: 0.18, type: 'triangle', v: 0.12 }); this.tone({ f: 180, f2: 70, t: 0.1, v: 0.3, at: 0.3 }); },
    control() { this.tone({ f: 330, f2: 300, t: 0.38, v: 0.25 }); this.tone({ f: 337, f2: 310, t: 0.38, v: 0.22 }); this.tone({ f: 495, t: 0.3, v: 0.14, at: 0.1, type: 'triangle' }); },
    swap() { this.tone({ f: 520, t: 0.08, type: 'triangle', v: 0.22 }); this.tone({ f: 390, t: 0.11, type: 'triangle', v: 0.22, at: 0.09 }); this.noise({ f: 1200, q: 0.8, t: 0.06, v: 0.15 }); },
    draw() { this.noise({ f: 3200, q: 0.5, t: 0.08, v: 0.28 }); this.noise({ f: 2800, q: 0.5, t: 0.09, v: 0.28, at: 0.11 }); this.tone({ f: 480, t: 0.06, type: 'triangle', v: 0.14, at: 0.2 }); },
    combo() { [880, 1318, 1760].forEach((f, i) => this.tone({ f, t: 0.9, v: 0.2 / (i + 1) + 0.04, a: 0.006 })); this.noise({ f: 5000, q: 2, t: 0.1, v: 0.1 }); },
    yourturn() { this.tone({ f: 660, t: 0.13, v: 0.14 }); this.tone({ f: 880, t: 0.22, v: 0.14, at: 0.1 }); },
    tick() { this.tone({ f: 1050, t: 0.05, type: 'square', v: 0.2 }); },
    danger() { this.tone({ f: 520, t: 0.1, type: 'triangle', v: 0.28 }); this.tone({ f: 520, t: 0.12, type: 'triangle', v: 0.28, at: 0.15 }); },
    timeout() { this.notes([440, 349, 262], { gap: 0.16, last: { t: 0.5 } }); this.noise({ f: 400, q: 0.5, t: 0.3, v: 0.2 }); },
    win() { this.notes([523, 659, 784, 1047], { gap: 0.12, last: { t: 0.7, v: 0.28 } }); this.tone({ f: 1318, t: 0.9, v: 0.12, at: 0.36 }); },
    lose() { this.notes([392, 349, 294, 233], { gap: 0.17, last: { t: 0.8 } }); },
    draw_game() { this.notes([440, 440], { gap: 0.2, last: { t: 0.5 } }); },
    error() { this.tone({ f: 150, f2: 110, t: 0.18, type: 'square', v: 0.3 }); },
    connect() { this.notes([600, 900], { gap: 0.1 }); },
    disconnect() { this.notes([520, 330], { gap: 0.12 }); },
    start() { this.notes([392, 523], { gap: 0.1 }); this.noise({ f: 1800, q: 1.2, t: 0.05, v: 0.2 }); }
  },

  play(name, delay) {
    if (!this.on || this.vol <= 0) return;
    const go = () => {
      if (!this.init() || !this.ctx) return;
      if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* ignore */ } }
      const r = this.RECIPES[name];
      if (r) { try { r.call(this); } catch (e) { /* ignore */ } }
    };
    if (delay) setTimeout(go, delay * 1000); else go();
  },

  /* som correspondente a uma ação do jogo */
  forAction(a) {
    if (a.type === 'control') return 'control';
    const x = a;
    switch (x.type) {
      case 'place': return 'place';
      case 'move': return x.swap ? 'swap' : 'move';
      case 'throw': return 'throw';
      case 'sting': return 'sting';
      case 'remove': return 'capture';
      case 'flip': return 'flip';
      case 'flipcombo': return 'combo';
      case 'draw': case 'steal': return 'draw';
    }
    return null;
  }
};
Sound.load();
