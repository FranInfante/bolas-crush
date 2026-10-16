// Tween propio y mínimo sobre el ticker de Pixi: sin librerías, todo devuelve una promesa.
import type { Ticker } from 'pixi.js';

export type Ease = (t: number) => number;

const c1 = 1.70158;
export const ease = {
  lineal: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  // Pasa de largo y vuelve: el «rebote» de Candy Crush al aterrizar y en el swap inválido.
  outBack: (t: number) => 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
} satisfies Record<string, Ease>;

interface Tw { el: number; dur: number; fn: (v: number) => void; e: Ease; fin: () => void }

export class Tweens {
  private lista: Tw[] = [];
  /** Multiplicador de tiempo (×3 al tocar durante el BOLAZO). */
  velocidad = 1;

  constructor(ticker: Ticker) {
    ticker.add((t) => this.paso(Math.min(t.deltaMS, 64) * this.velocidad));
  }

  /** Llama a fn(0..1 suavizado) durante `dur` ms, tras `delay` ms. */
  to(dur: number, fn: (v: number) => void, e: Ease = ease.lineal, delay = 0): Promise<void> {
    return new Promise((fin) => this.lista.push({ el: -delay, dur, fn, e, fin }));
  }

  espera(ms: number): Promise<void> { return this.to(ms, () => {}); }

  private paso(dt: number): void {
    const vivos: Tw[] = [];
    for (const t of this.lista) {
      t.el += dt;
      if (t.el < 0) { vivos.push(t); continue; }
      const v = t.dur <= 0 ? 1 : Math.min(1, t.el / t.dur);
      try { t.fn(t.e(v)); } catch { t.fin(); continue; } // sprite destruido a mitad: se corta el tween
      if (v >= 1) t.fin(); else vivos.push(t);
    }
    this.lista = vivos;
  }
}
