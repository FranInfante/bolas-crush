// Aplicación: arranque de Pixi, fondo, escalado a cualquier pantalla, cambio de escena y depuración.
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Especial, Partida } from '../motor/index.ts';
import { nivel as nivelDe } from '../datos/episodios.ts';
import { Sonido } from './audio.ts';
import { Texturas } from './dibujo.ts';
import { Tweens } from './tween.ts';
import { EscenaPartida } from './partida.ts';
import { EscenaFicha } from './pantallas.ts';
import { cargarHitos, EscenaMapa } from './mapa.ts';
import { ventanaRegalo } from './enganche.ts';
import { DW, regaloPendiente } from './ui.ts';

export interface Escena { container: Container; layout(dh: number): void; destroy(): void }

declare global {
  interface Window {
    bolas: { nivel(n: number): void; ganar(): void; perder(): void; partida: Partida | null; juego: Juego };
  }
}

const ALTO_MIN = 720; // alto lógico mínimo: en pantallas más altas hay más sitio, no más escala

export class Juego {
  app!: Application;
  tx!: Texturas;
  tw!: Tweens;
  au = new Sonido();
  root = new Container();
  dh = ALTO_MIN;
  reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private escena: Escena | null = null;
  private hitos: (Texture | null)[] = [];
  private bg!: Sprite;
  private manchas: { s: Sprite; vx: number; vy: number }[] = [];
  private sonidoBtn = new Container();
  private nivelActual = 1;

  async iniciar(contenedor: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({ resizeTo: window, background: '#001B41', antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    contenedor.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = 'none';
    this.tw = new Tweens(this.app.ticker);

    // La fuente Fredoka llega de Google Fonts: se espera un poco para que el primer texto ya salga bien.
    try { await Promise.race([document.fonts.load('700 24px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* sin fuente: cae a sans-serif */ }

    const logo = await this.cargar(`${import.meta.env.BASE_URL}heladeria-bolas-sevilla-logo.png`);
    this.hitos = await cargarHitos((u) => this.cargar(u));
    this.tx = new Texturas(this.app.renderer, logo);

    this.crearFondo();
    this.app.stage.addChild(this.root);
    this.crearBotonSonido();
    window.bolas = { nivel: (n) => this.irPartida(n), ganar: () => this.forzar('ganado'), perder: () => this.forzar('perdido'), partida: null, juego: this };
    this.app.renderer.on('resize', () => this.ajustar()); // tras el ajuste de Pixi, no antes
    // El audio solo puede arrancar tras un gesto.
    window.addEventListener('pointerdown', () => this.au.arrancar(), { capture: true });
    this.irMapa();
    this.ajustar();
    this.regaloSiToca();
  }

  private async cargar(url: string): Promise<Texture | null> {
    try { return await Assets.load<Texture>(url); } catch { return null; }
  }

  // ------------------------------------------------------------------ fondo: azul noche con bolitas desenfocadas
  private crearFondo(): void {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#0b3d8c'); g.addColorStop(0.45, '#062a66'); g.addColorStop(1, '#001B41');
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    this.bg = new Sprite(Texture.from(c));
    this.app.stage.addChildAt(this.bg, 0);

    const r = document.createElement('canvas');
    r.width = r.height = 128;
    const y = r.getContext('2d')!;
    const rg = y.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    y.fillStyle = rg; y.fillRect(0, 0, 128, 128);
    const tex = Texture.from(r);
    const colores = [0xff5a6e, 0xffd92e, 0x5bbf3b, 0x7b3fb5, 0xff8a1f, 0x4aa8ff, 0xffffff];
    for (let i = 0; i < 12; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.tint = colores[i % colores.length];
      s.alpha = 0.12 + Math.random() * 0.1;
      s.scale.set(0.8 + Math.random() * 1.6);
      s.position.set(Math.random() * 600, Math.random() * 1000);
      this.app.stage.addChildAt(s, 1);
      this.manchas.push({ s, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 });
    }
    this.app.ticker.add((t) => {
      if (this.reducido) return;
      const W = this.app.screen.width, H = this.app.screen.height;
      for (const m of this.manchas) {
        m.s.x += (m.vx * t.deltaMS) / 1000; m.s.y += (m.vy * t.deltaMS) / 1000;
        if (m.s.x < -80) m.s.x = W + 80; else if (m.s.x > W + 80) m.s.x = -80;
        if (m.s.y < -80) m.s.y = H + 80; else if (m.s.y > H + 80) m.s.y = -80;
      }
    });
  }

  private crearBotonSonido(): void {
    const b = this.sonidoBtn;
    const dibujar = () => {
      b.removeChildren().forEach((h) => h.destroy());
      const g = new Graphics().circle(0, 0, 20).fill({ color: 0x001b41, alpha: 0.7 }).stroke({ width: 2.5, color: 0xffffff, alpha: 0.7 });
      g.poly([-10, -4, -5, -4, 1, -10, 1, 10, -5, 4, -10, 4]).fill(0xffffff);
      if (this.au.silenciado) g.moveTo(5, -6).lineTo(13, 6).moveTo(13, -6).lineTo(5, 6).stroke({ width: 3, color: 0xff5a6e, cap: 'round' });
      else g.arc(2, 0, 7, -0.9, 0.9).stroke({ width: 2.5, color: 0xffffff, cap: 'round' }).arc(2, 0, 12, -0.9, 0.9).stroke({ width: 2.5, color: 0xffffff, cap: 'round' });
      b.addChild(g);
    };
    dibujar();
    b.eventMode = 'static';
    b.cursor = 'pointer';
    b.on('pointertap', () => { this.au.arrancar(); this.au.alternarSilencio(); dibujar(); this.au.clic(); });
    b.position.set(DW - 28, 30);
  }

  // ------------------------------------------------------------------ escenas
  private poner(e: Escena): void {
    this.escena?.destroy();
    this.root.removeChildren();
    this.escena = e;
    this.root.addChild(e.container, this.sonidoBtn);
    e.layout(this.dh);
    window.bolas.partida = null;
  }

  irMapa(): void { this.poner(new EscenaMapa(this, this.hitos)); }

  /** Al arrancar: si toca el regalo diario, ventana con la racha; al cerrarla el mapa se repinta con las monedas nuevas. */
  private regaloSiToca(): void {
    const dia = regaloPendiente();
    if (dia === null) return;
    this.root.addChild(ventanaRegalo(this, dia, () => this.irMapa()));
  }

  irFicha(id: number): void {
    this.poner(new EscenaFicha(this, nivelDe(id)));
  }

  irPartida(id: number, potenciadores: Especial[] = []): void {
    // Fran 17-10: cada partida empieza con las bolas en otro sitio, aunque sea el mismo nivel (la semilla del nivel es solo para tests y calibración).
    const n = { ...nivelDe(id), semilla: (Math.random() * 2 ** 31) | 0 };
    this.nivelActual = id;
    const e = new EscenaPartida(this, n, potenciadores);
    this.escena?.destroy();
    this.root.removeChildren();
    this.escena = e;
    this.root.addChild(e.container, this.sonidoBtn);
    e.layout(this.dh);
    window.bolas.partida = e.partida;
  }

  private forzar(estado: 'ganado' | 'perdido'): void {
    if (!(this.escena instanceof EscenaPartida)) this.irPartida(this.nivelActual);
    (this.escena as EscenaPartida).mostrarResultado(estado, estado === 'ganado' ? 3 : 0);
  }

  // ------------------------------------------------------------------ tamaño
  private ajustar(): void {
    const W = this.app.screen.width, H = this.app.screen.height;
    const k = Math.min(W / DW, H / ALTO_MIN);
    this.dh = H / k;
    this.root.scale.set(k);
    this.root.position.set((W - DW * k) / 2, 0);
    this.bg.width = W; this.bg.height = H;
    this.escena?.layout(this.dh);
  }
}
