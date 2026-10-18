// Sonido sintetizado con WebAudio: nada de archivos. El contexto se crea tras el primer toque.
const CLAVE = 'bolas-crush-silencio';

export class Sonido {
  private ctx: AudioContext | null = null;
  private ruido: AudioBuffer | null = null;
  silenciado = false;

  constructor() {
    try { this.silenciado = localStorage.getItem(CLAVE) === '1'; } catch { /* sin almacenamiento */ }
  }

  /** Llamar desde un gesto del usuario (los navegadores no dejan sonar antes). */
  arrancar(): void {
    try {
      if (!this.ctx) {
        // iPhone: sin esto, con el botón de silencio puesto Web Audio no suena (Safari 16.4+).
        const nav = navigator as Navigator & { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'playback';
        this.ctx = new AudioContext();
        const n = this.ctx.sampleRate;
        this.ruido = this.ctx.createBuffer(1, n, n);
        const d = this.ruido.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state !== 'running') void this.ctx.resume(); // también 'interrupted' (iPhone tras bloquear o una llamada)
    } catch { /* sin audio */ }
  }

  alternarSilencio(): boolean {
    this.silenciado = !this.silenciado;
    try { localStorage.setItem(CLAVE, this.silenciado ? '1' : '0'); } catch { /* ignorar */ }
    return this.silenciado;
  }

  private tono(f: number, dur: number, tipo: OscillatorType, vol: number, hasta = f, retardo = 0): void {
    const c = this.ctx;
    if (!c || this.silenciado) return;
    const t0 = c.currentTime + retardo;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t0);
    if (hasta !== f) o.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private soplido(dur: number, vol: number, desde: number, hasta: number, retardo = 0): void {
    const c = this.ctx;
    if (!c || !this.ruido || this.silenciado) return;
    const t0 = c.currentTime + retardo;
    const s = c.createBufferSource();
    s.buffer = this.ruido;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(desde, t0);
    f.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  // Escala pentatónica: cada cascada sube un escalón, como el pop de Candy Crush.
  pop(cascada: number): void {
    const pasos = [0, 2, 4, 7, 9, 12, 14, 16, 19];
    const st = pasos[Math.min(Math.max(cascada - 1, 0), pasos.length - 1)];
    const f = 520 * Math.pow(2, st / 12);
    this.tono(f, 0.14, 'sine', 0.22, f * 1.5);
    this.tono(f * 2, 0.08, 'triangle', 0.06);
  }
  swoosh(): void { this.soplido(0.14, 0.18, 500, 2200); }
  golpe(): void { this.tono(160, 0.16, 'square', 0.12, 70); }
  raya(): void { this.soplido(0.4, 0.3, 300, 4000); this.tono(220, 0.35, 'sawtooth', 0.08, 880); }
  boom(): void { this.tono(110, 0.45, 'sine', 0.5, 35); this.soplido(0.35, 0.35, 900, 120); }
  rayos(): void { this.soplido(0.35, 0.25, 3000, 600); this.tono(1200, 0.3, 'sawtooth', 0.06, 200); }
  crear(): void { this.tono(660, 0.12, 'triangle', 0.15, 990); this.tono(990, 0.18, 'sine', 0.1, 1320, 0.08); }
  toc(): void { this.tono(200, 0.07, 'sine', 0.12, 120); }
  campanita(i: number): void {
    const f = [880, 1108, 1318][i] ?? 1318;
    this.tono(f, 0.7, 'sine', 0.2);
    this.tono(f * 2.01, 0.5, 'sine', 0.06);
  }
  fanfarria(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tono(f, 0.28, 'triangle', 0.18, f, i * 0.13));
    [784, 988, 1175, 1568].forEach((f, i) => this.tono(f, 0.7, 'triangle', 0.14, f, 0.55 + i * 0.01));
  }
  derrota(): void { [392, 330, 262].forEach((f, i) => this.tono(f, 0.35, 'triangle', 0.16, f * 0.97, i * 0.2)); }
  clic(): void { this.tono(700, 0.06, 'sine', 0.1, 900); }
}
