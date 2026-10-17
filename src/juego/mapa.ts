// Mapa infinito: camino que sube sin fin, fondos de Sevilla en ciclo, cartel entre episodios y nodos virtualizados.
import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { episodioDe, esDificil, NIVELES_POR_EPISODIO as POR_EP } from '../datos/episodios.ts';
import { PERSONAJE } from '../datos/equipo.ts';
import type { Juego, Escena } from './app.ts';
import { estrella } from './dibujo.ts';
import { busto, cargarProgreso, DW, fmt, moneda, panel, totalEstrellas, txt, txtBorde } from './ui.ts';
import type { Guardado } from './ui.ts';
import { EXTRA } from './textos-extra.ts';

const TRAMOS = ['tramo-1', 'tramo-2', 'tramo-3']; // Giralda, Torre del Oro, Setas (de abajo arriba, en ciclo)
const SEP = 125;       // separación vertical entre niveles
const HUECO_EP = 80;   // hueco extra en cada cambio de episodio, para el cartel
const TILE_H = Math.round((DW * 1120) / 640); // los tres fondos miden 640x1120
const FONDO_BASE = 200; // el fondo empieza 200 px por debajo del nivel 1
const MARGEN = 140;

/** Carga los fondos del mapa (si alguno falla, ese tramo queda en azul noche). */
export async function cargarHitos(carga: (url: string) => Promise<Texture | null>): Promise<(Texture | null)[]> {
  return Promise.all(TRAMOS.map((h) => carga(`${import.meta.env.BASE_URL}arte/${h}.webp`)));
}

/** Posición en el mundo del nivel i (0 = nivel 1). El mundo crece hacia arriba (y negativa). */
const mundoY = (i: number): number => -(i * SEP + Math.floor(i / POR_EP) * HUECO_EP);
const mundoX = (i: number): number => DW / 2 + Math.sin(i * 0.9) * 115;

export class EscenaMapa implements Escena {
  readonly container = new Container();
  private contenido = new Container();
  private capaFondo = new Container();
  private capaCartel = new Container();
  private capaNodos = new Container();
  private camino = new Graphics();
  private juego: Juego;
  private hitos: (Texture | null)[];
  private prog: Guardado;
  private maxN: number;  // número de niveles mostrados (hasta el final del episodio siguiente al desbloqueado)
  private tiles = new Map<number, Container>();
  private nodos = new Map<number, Container>();
  private carteles = new Map<number, Container>();
  private rango = '';
  private iniciado = false;
  private arrastre: { y: number; s: number } | null = null;
  private movido = false;
  private actual: Container | null = null;
  private tickFn: (t: { deltaMS: number }) => void;
  private rueda: (e: WheelEvent) => void;
  private reloj = 0;
  private dh = 720;
  private titulo: Text;
  private sub: Text;
  private epMostrado = 0;

  constructor(juego: Juego, hitos: (Texture | null)[]) {
    this.juego = juego;
    this.hitos = hitos;
    this.prog = cargarProgreso();
    const prog = this.prog;
    this.maxN = (Math.ceil(prog.desbloqueado / POR_EP) + 1) * POR_EP;
    const cont = this.contenido;
    cont.addChild(this.capaFondo, this.camino, this.capaCartel, this.capaNodos);

    // Cabecera fija: monedas y estrellas a la izquierda, episodio actual en el centro (el sonido va a la derecha).
    const cab = new Container();
    const fondoCab = new Graphics().rect(-20, 0, DW + 40, 62).fill({ color: 0x001b41, alpha: 0.88 });
    this.titulo = txtBorde('', 26, 0xffd92e);
    this.titulo.position.set(DW / 2, 24);
    this.sub = txt('', 13, 0xffffff);
    this.sub.position.set(DW / 2, 48);
    const mon = moneda(10); mon.position.set(22, 20);
    const mt = txtBorde(fmt(prog.monedas), 17, 0xffd92e); mt.anchor.set(0, 0.5); mt.position.set(38, 20);
    const est = new Graphics(); estrella(est, 22, 44, 10, 0xffd92e, 0x9a5b00);
    const et = txtBorde(fmt(totalEstrellas(prog)), 17, 0xffffff); et.anchor.set(0, 0.5); et.position.set(38, 44);
    cab.addChild(fondoCab, this.titulo, this.sub, mon, mt, est, et);

    // Arrastre vertical con dedo/ratón (todo el lienzo recoge el gesto).
    this.container.eventMode = 'static';
    this.container.hitArea = new Rectangle(-2000, -2000, DW + 4000, 8000);
    this.container.on('pointerdown', (e) => { this.arrastre = { y: e.global.y, s: this.contenido.y }; this.movido = false; });
    this.container.on('pointermove', (e) => {
      if (!this.arrastre) return;
      const dy = (e.global.y - this.arrastre.y) / this.juego.root.scale.y;
      if (Math.abs(dy) > 8) this.movido = true;
      this.fijar(this.arrastre.s + dy);
    });
    const suelta = () => { this.arrastre = null; };
    this.container.on('pointerup', suelta);
    this.container.on('pointerupoutside', suelta);
    this.rueda = (e) => this.fijar(this.contenido.y - e.deltaY / this.juego.root.scale.y);
    juego.app.canvas.addEventListener('wheel', this.rueda, { passive: true });

    this.container.addChild(cont, cab);
    this.tickFn = (tk) => {
      this.reloj += tk.deltaMS / 1000;
      if (this.actual && !this.actual.destroyed) this.actual.scale.set(1 + Math.sin(this.reloj * 5) * 0.07); // el siguiente nivel late
    };
    juego.app.ticker.add(this.tickFn);
    this.refrescar();
  }

  // ------------------------------------------------------------------ piezas
  private tile(j: number): Container {
    const c = new Container();
    c.y = FONDO_BASE - (j + 1) * TILE_H;
    const tex = this.hitos[j % TRAMOS.length];
    if (tex) { const sp = new Sprite(tex); sp.width = DW; sp.height = TILE_H; c.addChild(sp); }
    c.addChild(new Graphics().rect(0, 0, DW, TILE_H).fill({ color: 0x001b41, alpha: tex ? 0.28 : 0.0 })); // velo para que se lean los nodos
    return c;
  }

  private cartel(e: number): Container { // e = episodio (1, 2, …)
    const ep = episodioDe((e - 1) * POR_EP + 1);
    const c = new Container();
    c.position.set(DW / 2, e === 1 ? 112 : (mundoY(e * POR_EP - POR_EP - 1) + mundoY((e - 1) * POR_EP)) / 2);
    const p = ep.quien === 'rocio' ? PERSONAJE.rocio : undefined; // solo Rocío tiene retrato: el resto, sin bola con letra
    c.addChild(panel(390, 66, 0.9));
    const t = txtBorde(`${EXTRA.episodio(ep.n)} · ${ep.nombre}`, 21, 0xffd92e);
    t.scale.set(Math.min(1, (p ? 280 : 350) / t.width));
    const s = txt(ep.tienda, 14, 0xffffff);
    s.scale.set(Math.min(1, (p ? 280 : 350) / s.width));
    const x = p ? 26 : 0;
    t.position.set(x, -11); s.position.set(x, 14);
    c.addChild(t, s);
    if (p) { const a = busto(p, 20, 22, 0); a.position.set(-165, 2); c.addChild(a); }
    return c;
  }

  private nodo(i: number): Container {
    const prog = this.prog, id = i + 1;
    const hecho = (prog.estrellas[i] ?? 0) > 0;
    const jugable = id <= prog.desbloqueado;
    const esActual = jugable && !hecho && id === prog.desbloqueado;
    const dificil = esDificil(id);
    const c = new Container();
    c.position.set(mundoX(i), mundoY(i));
    const color = dificil ? (jugable ? 0xc0243e : 0x6a3a58) : hecho ? 0xffc83d : esActual ? 0xff5a6e : jugable ? 0x2f6fde : 0x4a5a7a;
    const borde = dificil ? 0xb06ae0 : 0xffffff;
    c.addChild(
      new Graphics().circle(0, 5, 32).fill({ color: 0x000000, alpha: 0.4 }).circle(0, 0, 32).fill(color).stroke({ width: 4, color: borde, alpha: jugable ? 1 : 0.5 }),
      new Graphics().ellipse(-9, -16, 14, 7).fill({ color: 0xffffff, alpha: 0.3 }),
      txtBorde(String(id), 30, jugable ? 0xffffff : 0xaab4c8),
    );
    if (dificil) { // etiqueta morada «Difícil» sobre el nodo
      const g = new Graphics().roundRect(-34, -58, 68, 20, 10).fill(0x6a1fa8).stroke({ width: 2, color: 0xff7f9a });
      const t = txt(EXTRA.dificil, 13, 0xffffff, { fontWeight: '700' }); t.position.set(0, -48);
      c.addChild(g, t);
    }
    if (jugable) {
      const g = new Graphics();
      const e = prog.estrellas[i] ?? 0;
      for (let k = 0; k < 3; k++) estrella(g, (k - 1) * 24, 50 - (k === 1 ? 4 : 0), 11, k < e ? 0xffd92e : 0x33466b, k < e ? 0x9a5b00 : 0x1a2a4a);
      c.addChild(g);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.hitArea = new Rectangle(-38, -38, 76, 76);
      c.on('pointertap', () => { if (!this.movido) { this.juego.au.clic(); this.juego.irFicha(id); } });
    } else {
      c.addChild(new Graphics().arc(0, 45, 5, Math.PI, 0).stroke({ width: 3, color: 0x8a96a8 }), new Graphics().roundRect(-8, 44, 16, 12, 3).fill(0x8a96a8));
    }
    if (esActual) this.actual = c;
    return c;
  }

  // ------------------------------------------------------------------ virtualización
  /** Crea los sprites de lo que está cerca de la vista y destruye el resto. */
  private refrescar(): void {
    const sy = this.contenido.y;
    const wMin = -sy - MARGEN, wMax = -sy + this.dh + MARGEN;
    // Fondos
    const j0 = Math.max(0, Math.floor((FONDO_BASE - wMax) / TILE_H)), j1 = Math.max(0, Math.floor((FONDO_BASE - wMin) / TILE_H));
    this.sincronizar(this.tiles, this.capaFondo, j0, j1, (j) => this.tile(j));
    // Nodos: wy es monótono, así que basta un barrido barato
    let i0 = this.maxN, i1 = -1;
    for (let i = 0; i < this.maxN; i++) { const y = mundoY(i); if (y >= wMin - 60 && y <= wMax + 60) { if (i < i0) i0 = i; i1 = i; } }
    if (i1 < 0) { i0 = 0; i1 = -1; }
    this.sincronizar(this.nodos, this.capaNodos, i0, i1, (i) => this.nodo(i));
    // Carteles (uno por episodio mostrado)
    const e0 = Math.floor(i0 / POR_EP) + 1, e1 = Math.floor(Math.max(i1, 0) / POR_EP) + 2;
    this.sincronizar(this.carteles, this.capaCartel, i1 < 0 ? 1 : e0, i1 < 0 ? 0 : Math.min(e1, this.maxN / POR_EP), (e) => this.cartel(e));
    // Camino: se redibuja solo cuando cambia el rango de nodos
    const r = `${i0}-${i1}`;
    if (r !== this.rango) { this.rango = r; this.dibujarCamino(Math.max(0, i0 - 1), Math.min(this.maxN - 1, i1 + 1)); }
    this.actualizarCabecera();
    if (this.actual?.destroyed) this.actual = null;
  }

  private sincronizar(mapa: Map<number, Container>, capa: Container, a: number, b: number, crear: (k: number) => Container): void {
    for (const [k, c] of mapa) if (k < a || k > b) { if (c === this.actual) this.actual = null; c.destroy({ children: true }); mapa.delete(k); }
    for (let k = a; k <= b; k++) if (!mapa.has(k)) { const c = crear(k); mapa.set(k, c); capa.addChild(c); }
  }

  private dibujarCamino(a: number, b: number): void {
    const g = this.camino;
    g.clear();
    if (b <= a) return;
    for (let i = a; i <= b; i++) {
      const p = { x: mundoX(i), y: mundoY(i) };
      if (i === a) g.moveTo(p.x, p.y);
      else { const q = { x: mundoX(i - 1), y: mundoY(i - 1) }; g.quadraticCurveTo(q.x + (p.x - q.x) * 0.1 + (i % 2 ? 60 : -60), (q.y + p.y) / 2, p.x, p.y); }
    }
    g.stroke({ width: 22, color: 0xffffff, alpha: 0.14, cap: 'round', join: 'round' });
    for (let i = a + 1; i <= b; i++) {
      const p = { x: mundoX(i - 1), y: mundoY(i - 1) }, q = { x: mundoX(i), y: mundoY(i) };
      for (let t = 0.2; t < 0.9; t += 0.2) g.circle(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, 3).fill({ color: 0xffffff, alpha: 0.5 });
    }
  }

  /** El episodio de la cabecera es el del nivel que está en el centro de la pantalla. */
  private actualizarCabecera(): void {
    const w = -this.contenido.y + this.dh * 0.5;
    let i = 0;
    for (let k = 0; k < this.maxN; k++) { if (mundoY(k) >= w) i = k; else break; }
    const ep = episodioDe(i + 1);
    if (ep.n === this.epMostrado) return;
    this.epMostrado = ep.n;
    this.titulo.text = ep.nombre;
    this.titulo.scale.set(Math.min(1, 230 / (this.titulo.width / this.titulo.scale.x)));
    this.sub.text = `${EXTRA.episodio(ep.n)} · ${ep.tienda}`;
    this.sub.scale.set(Math.min(1, 230 / (this.sub.width / this.sub.scale.x)));
  }

  /** Limita el desplazamiento: del nivel 1 (abajo, con su cartel) al último mostrado (arriba). */
  private fijar(y: number): void {
    const min = this.dh - 175, max = 150 - mundoY(this.maxN - 1); // sy mayor = se ven niveles más altos
    this.contenido.y = Math.min(max, Math.max(min, y));
    this.refrescar();
  }

  layout(dh: number): void {
    this.dh = dh;
    if (!this.iniciado) { // primera vez: el nivel desbloqueado queda hacia abajo-medio de la pantalla
      this.iniciado = true;
      this.fijar(dh * 0.62 - mundoY(this.prog.desbloqueado - 1));
    } else this.fijar(this.contenido.y);
  }

  destroy(): void {
    this.juego.app.ticker.remove(this.tickFn);
    this.juego.app.canvas.removeEventListener('wheel', this.rueda);
    this.container.destroy({ children: true });
  }
}
