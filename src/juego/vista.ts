// Vista del tablero: dibuja la partida, anima cada Paso del motor en orden y recoge los gestos.
import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import type { Ficha, Paso, Pos } from '../motor/tipos.ts';
import type { Partida } from '../motor/index.ts';
import { SABORES } from '../datos/sabores.ts';
import { CELDA as T, TEX } from './dibujo.ts';
import type { Texturas } from './dibujo.ts';
import { ease, Tweens } from './tween.ts';
import type { Sonido } from './audio.ts';

const ESC = 60 / TEX; // escala de la bola dentro de la casilla
const REDUCIDO = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lo que la vista pide a la escena (textos grandes, temblor, marcadores). */
export interface Ganchos {
  agitar(fuerza: number): void;
  jaleo(nivel: 1 | 2 | 3 | 4): void;
  bolazo(): Promise<void>;
  puntos(n: number): void;
  movimiento(): void;
  barajado(): void;
}

interface Vis { s: Sprite; key: string; p: Pos; sabor: number; id: number }

const xy = (p: Pos) => ({ x: p.c * T + T / 2, y: p.f * T + T / 2 });
const k = (p: Pos) => `${p.f},${p.c}`;
const colorSabor = (s: number): number => (s >= 0 ? parseInt(SABORES[s].color.slice(1), 16) : 0xffffff);
const claveFicha = (f: Ficha): string => (f.tipo === 'carapina' ? 'c' : `${f.sabor}:${f.especial}`);

export class VistaTablero extends Container {
  readonly ancho: number;
  readonly alto: number;
  bloqueado = false;
  alIntentar: (a: Pos, b: Pos) => void = () => {};
  alTocar: () => void = () => {};
  /** Modo cuchara: el siguiente toque sobre una bola se entrega a alCuchara en vez de seleccionarla. */
  modoCuchara = false;
  alCuchara: (p: Pos) => void = () => {};
  private desmarcar = false; // se tocó la bola ya seleccionada: si no se arrastra, se deselecciona al soltar
  private ticker: Ticker;
  private latidoFn: (t: { deltaMS: number }) => void;

  private partida: Partida;
  private tx: Texturas;
  private tw: Tweens;
  private au: Sonido;
  private gan: Ganchos;
  private filas: number;
  private cols: number;
  private capaManchas = new Container();
  private capaBolas = new Container();
  private capaEscarcha = new Container();
  private capaFx = new Container();
  private marco = new Graphics();
  private vis = new Map<number, Vis>();
  private manchas = new Map<string, Sprite>();
  private escarchas = new Map<string, Sprite>();
  private candados = new Map<string, Sprite>();
  private sel: Pos | null = null;
  private down: { p: Pos; x: number; y: number } | null = null;
  private pista: Vis[] = [];
  private reloj = 0;
  private enBolazo = false;

  constructor(partida: Partida, tx: Texturas, tw: Tweens, au: Sonido, gan: Ganchos, ticker: Ticker) {
    super();
    this.partida = partida;
    this.tx = tx; this.tw = tw; this.au = au; this.gan = gan;
    this.filas = partida.tablero.length;
    this.cols = partida.tablero[0].length;
    this.ancho = this.cols * T;
    this.alto = this.filas * T;

    // Casillas semitransparentes (las inexistentes no se dibujan) y máscara con la misma forma.
    const fondo = new Graphics();
    const mascara = new Graphics();
    this.forEachCelda((p, ce) => {
      if (!ce.existe) return;
      fondo.roundRect(p.c * T + 2, p.f * T + 2, T - 4, T - 4, 10).fill({ color: 0xffffff, alpha: (p.f + p.c) % 2 ? 0.1 : 0.17 });
      mascara.rect(p.c * T, p.f * T, T, T).fill(0xffffff);
    });
    this.capaBolas.mask = mascara;
    this.marco.roundRect(3, 3, T - 6, T - 6, 11).stroke({ width: 4, color: 0xffffff }).visible = false;
    this.addChild(fondo, this.capaManchas, this.capaBolas, mascara, this.capaEscarcha, this.marco, this.capaFx);
    this.sync();

    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, this.ancho, this.alto);
    this.on('pointerdown', (e) => this.alBajar(e.getLocalPosition(this)));
    this.on('pointermove', (e) => this.alMover(e.getLocalPosition(this)));
    const suelta = () => { if (this.down && this.desmarcar) this.seleccionar(null); this.desmarcar = false; this.down = null; };
    this.on('pointerup', suelta);
    this.on('pointerupoutside', suelta);
    this.ticker = ticker;
    this.latidoFn = (t) => this.latido(t.deltaMS);
    ticker.add(this.latidoFn);
  }

  /** Quita el latido del ticker (si no, cada partida dejaría uno vivo). */
  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.ticker.remove(this.latidoFn);
    super.destroy(options);
  }

  private forEachCelda(fn: (p: Pos, c: Partida['tablero'][0][0]) => void): void {
    this.partida.tablero.forEach((fila, f) => fila.forEach((ce, c) => fn({ f, c }, ce)));
  }

  // ------------------------------------------------------------------ estado visual

  private sprite(tex: Sprite['texture'], x: number, y: number, escala: number): Sprite {
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.scale.set(escala);
    return s;
  }

  private crear(f: Ficha, p: Pos, y?: number): Vis {
    const q = xy(p);
    const s = this.sprite(this.tx.ficha(f), q.x, y ?? q.y, ESC);
    this.capaBolas.addChild(s);
    const v = { s, key: claveFicha(f), p, sabor: f.sabor, id: f.id };
    this.vis.set(f.id, v);
    return v;
  }

  private quitar(v: Vis): void {
    v.s.destroy();
    this.vis.delete(v.id);
  }

  private enPos(p: Pos): Vis | undefined {
    for (const v of this.vis.values()) if (v.p.f === p.f && v.p.c === p.c) return v;
    return undefined;
  }

  /** Deja la vista idéntica al tablero del motor (se llama al acabar cada jugada: red de seguridad). */
  sync(): void {
    const ids = new Set<number>();
    this.forEachCelda((p, ce) => {
      const q = xy(p), kk = k(p);
      if (ce.ficha) {
        ids.add(ce.ficha.id);
        let v = this.vis.get(ce.ficha.id);
        if (!v) v = this.crear(ce.ficha, p);
        else if (v.key !== claveFicha(ce.ficha)) { v.s.texture = this.tx.ficha(ce.ficha); v.key = claveFicha(ce.ficha); }
        v.p = p; v.s.position.set(q.x, q.y); v.s.scale.set(ESC); v.s.rotation = 0; v.s.alpha = 1;
      }
      this.ajustar(this.manchas, this.capaManchas, kk, ce.mancha, (n) => this.tx.mancha(n as 1 | 2), q, () => 1, 1);
      this.ajustar(this.escarchas, this.capaEscarcha, kk, ce.escarcha, (n) => this.tx.escarcha(n as 1 | 2), q, () => 1, 1);
      this.ajustar(this.candados, this.capaEscarcha, kk, ce.candado ? 1 : 0, () => this.tx.candado(), { x: q.x + 18, y: q.y - 16 }, () => 1, 0.7);
    });
    for (const v of [...this.vis.values()]) if (!ids.has(v.id)) this.quitar(v);
  }

  private ajustar(mapa: Map<string, Sprite>, capa: Container, kk: string, n: number, tex: (n: number) => Sprite['texture'], q: { x: number; y: number }, alfa: (n: number) => number, esc: number): void {
    let s = mapa.get(kk);
    if (n <= 0) { if (s) { s.destroy(); mapa.delete(kk); } return; }
    if (!s) { s = this.sprite(tex(n), q.x, q.y, esc); capa.addChild(s); mapa.set(kk, s); }
    s.texture = tex(n);
    s.alpha = alfa(n);
  }

  // ------------------------------------------------------------------ entrada

  private celdaEn(l: { x: number; y: number }): Pos | null {
    const p = { f: Math.floor(l.y / T), c: Math.floor(l.x / T) };
    return this.enPos(p) ? p : null;
  }

  private alBajar(l: { x: number; y: number }): void {
    this.alTocar();
    if (this.enBolazo) this.tw.velocidad = 3; // un toque acelera el BOLAZO ×3
    if (this.bloqueado) return;
    const p = this.celdaEn(l);
    if (this.modoCuchara) { if (p) this.alCuchara(p); return; }
    if (!p) { this.seleccionar(null); return; }
    const s = this.sel;
    if (s && Math.abs(s.f - p.f) + Math.abs(s.c - p.c) === 1) { // toque-toque
      this.seleccionar(null);
      this.alIntentar(s, p);
      return;
    }
    if (s && s.f === p.f && s.c === p.c) { this.down = { p, x: l.x, y: l.y }; this.desmarcar = true; return; } // arrastrar la ya seleccionada sí mueve
    this.desmarcar = false;
    this.seleccionar(p);
    this.down = { p, x: l.x, y: l.y };
  }

  private alMover(l: { x: number; y: number }): void {
    const d = this.down;
    if (!d || this.bloqueado) return;
    const dx = l.x - d.x, dy = l.y - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < T * 0.4) return;
    const b = Math.abs(dx) > Math.abs(dy) ? { f: d.p.f, c: d.p.c + Math.sign(dx) } : { f: d.p.f + Math.sign(dy), c: d.p.c };
    this.down = null;
    this.seleccionar(null);
    this.alIntentar(d.p, b);
  }

  seleccionar(p: Pos | null): void {
    this.sel = p;
    this.marco.visible = !!p;
    if (p) { const q = xy(p); this.marco.position.set(q.x - T / 2, q.y - T / 2); }
    for (const v of this.vis.values()) if (!this.pista.includes(v)) v.s.scale.set(ESC);
  }

  mostrarPista(par: [Pos, Pos]): void {
    this.pista = par.map((p) => this.enPos(p)).filter((v): v is Vis => !!v);
  }

  quitarPista(): void {
    for (const v of this.pista) { if (!v.s.destroyed) { v.s.rotation = 0; v.s.scale.set(ESC); } }
    this.pista = [];
  }

  private latido(dt: number): void {
    this.reloj += dt / 1000;
    if (this.sel) {
      const v = this.enPos(this.sel);
      if (v && !v.s.destroyed) v.s.scale.set(ESC * (1.08 + Math.sin(this.reloj * 9) * 0.05));
      this.marco.alpha = 0.6 + Math.sin(this.reloj * 9) * 0.3;
    }
    for (const v of this.pista) {
      if (v.s.destroyed) continue;
      v.s.rotation = Math.sin(this.reloj * 10) * 0.2;
      v.s.scale.set(ESC * (1.06 + Math.sin(this.reloj * 10) * 0.05));
    }
  }

  // ------------------------------------------------------------------ animación

  /**
   * Anima los pasos en orden, pero lo que ocurre entre dos caídas va en un «lote»: las detonaciones
   * arrancan escalonadas (70 ms) y se solapan, y cada eliminación sigue a su detonación.
   */
  async animar(pasos: Paso[]): Promise<void> {
    let ESCALON = 70;
    let lote: Promise<void>[] = [];
    let sig = 0, crear = 0, ultimo = 0, nDet = 0;
    const soltar = async () => { await Promise.all(lote); lote = []; sig = crear = ultimo = nDet = 0; };
    const lanzar = (ms: number, p: Paso) => { lote.push(ms <= 0 ? this.paso(p) : this.tw.espera(ms).then(() => this.paso(p))); };
    try {
      for (const p of pasos) {
        switch (p.tipo) {
          case 'detonar': {
            ultimo = Math.max(nDet ? sig + ESCALON : sig, crear);
            sig = ultimo; nDet++; crear = 0;
            lanzar(ultimo, p);
            break;
          }
          case 'eliminar': lanzar(nDet ? ultimo + 120 : sig, p); break;
          case 'crearEspecial': lanzar(sig, p); crear = Math.max(crear, sig + 230); break;
          case 'mancha': case 'escarcha': case 'candado': case 'carapinaFuera': lanzar(nDet ? ultimo + 120 : sig, p); break;
          case 'bolazo': void this.paso(p); sig = 300; ESCALON = 45; break; // el letrero corre aparte
          case 'jaleo': void this.paso(p); break;
          default: await soltar(); await this.paso(p); // intercambio, invalido, caer, barajar, fin
        }
      }
      await soltar();
    } finally { this.tw.velocidad = 1; this.enBolazo = false; }
  }

  private async paso(p: Paso): Promise<void> {
    switch (p.tipo) {
      case 'intercambio': return this.intercambio(p.a, p.b);
      case 'invalido': return this.invalido(p.a, p.b);
      case 'eliminar': return this.eliminar(p);
      case 'crearEspecial': return this.crearEspecial(p.pos, p.ficha);
      case 'detonar': return this.detonar(p);
      case 'mancha': this.quitarCapa(this.manchas, p.pos, p.quedan, 0xff7fa8, () => 1, (n) => this.tx.mancha(n as 1 | 2)); return;
      case 'escarcha': this.quitarCapa(this.escarchas, p.pos, p.quedan, 0xbfe9ff, () => 1, (n) => this.tx.escarcha(n as 1 | 2)); return;
      case 'candado': this.quitarCapa(this.candados, p.pos, 0, 0xffc83d, () => 1); this.au.crear(); return;
      case 'carapinaFuera': return this.carapinaFuera(p.id);
      case 'caer': return this.caer(p);
      case 'barajar': this.gan.barajado(); return this.barajar(p.movimientos);
      case 'jaleo': this.gan.jaleo(p.nivel); if (p.nivel >= 3) this.gan.agitar(p.nivel * 2); return;
      case 'bolazo': return this.bolazo();
      case 'fin': return;
    }
  }

  private async intercambio(a: Pos, b: Pos): Promise<void> {
    this.gan.movimiento();
    this.au.swoosh();
    const va = this.enPos(a), vb = this.enPos(b);
    const qa = xy(a), qb = xy(b);
    if (va) va.p = b;
    if (vb) vb.p = a;
    await this.tw.to(180, (t) => {
      if (va) va.s.position.set(qa.x + (qb.x - qa.x) * t, qa.y + (qb.y - qa.y) * t);
      if (vb) vb.s.position.set(qb.x + (qa.x - qb.x) * t, qb.y + (qa.y - qb.y) * t);
    }, ease.inOutQuad);
  }

  private async invalido(a: Pos, b: Pos): Promise<void> {
    this.au.golpe();
    const va = this.enPos(a), vb = this.enPos(b);
    const qa = xy(a), qb = xy(b);
    // Va hasta mitad de camino rápido y vuelve pasándose un poco (easeOutBack): ~250 ms.
    const medio = (t: number) => (t < 0.5 ? ease.outQuad(t * 2) * 0.7 : 0.7 * (1 - ease.outBack((t - 0.5) * 2)));
    await this.tw.to(250, (t) => {
      const m = medio(t);
      if (va) va.s.position.set(qa.x + (qb.x - qa.x) * m, qa.y + (qb.y - qa.y) * m);
      if (vb) vb.s.position.set(qb.x + (qa.x - qb.x) * m, qb.y + (qa.y - qb.y) * m);
    });
    if (va) va.s.position.set(qa.x, qa.y);
    if (vb) vb.s.position.set(qb.x, qb.y);
  }

  private async eliminar(p: Extract<Paso, { tipo: 'eliminar' }>): Promise<void> {
    this.au.pop(p.cascada);
    if (p.cascada >= 3) this.gan.agitar(1.5);
    const quitando = p.ids.map((id) => this.vis.get(id)).filter((v): v is Vis => !!v);
    let cx = 0, cy = 0;
    for (const v of quitando) {
      cx += v.s.x; cy += v.s.y;
      this.destello(v.s.x, v.s.y);
      this.chispas(v.s.x, v.s.y, colorSabor(v.sabor), 10);
    }
    if (quitando.length) { cx /= quitando.length; cy /= quitando.length; this.puntosFlotantes(cx, cy, p.puntos); }
    this.gan.puntos(p.puntos);
    // Se hincha un 10% y se encoge a 0.
    await this.tw.to(200, (t) => {
      const e = t < 0.3 ? 1 + 0.1 * (t / 0.3) : 1.1 * (1 - (t - 0.3) / 0.7);
      for (const v of quitando) v.s.scale.set(ESC * Math.max(0, e));
    });
    for (const v of quitando) this.quitar(v);
  }

  private destello(x: number, y: number): void {
    const s = this.sprite(this.tx.blanca, x, y, 1.6);
    this.capaFx.addChild(s);
    void this.tw.to(220, (t) => { s.alpha = 0.9 * (1 - t); s.scale.set(1.6 + t * 1.2); }, ease.outQuad).then(() => s.destroy());
  }

  private chispas(x: number, y: number, color: number, n: number): void {
    if (REDUCIDO) n = Math.min(n, 3);
    const ps = Array.from({ length: n }, () => {
      const ang = Math.random() * Math.PI * 2, v = 90 + Math.random() * 190;
      const s = this.sprite(this.tx.blanca, x, y, 0.1 + Math.random() * 0.12);
      s.tint = color;
      this.capaFx.addChild(s);
      return { s, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 120, e: s.scale.x };
    });
    void this.tw.to(650, (t) => {
      const sg = t * 0.65;
      for (const q of ps) {
        q.s.position.set(x + q.vx * sg, y + q.vy * sg + 900 * sg * sg);
        q.s.alpha = 1 - t * t;
        q.s.scale.set(q.e * (1 - t * 0.6));
      }
    }).then(() => ps.forEach((q) => q.s.destroy()));
  }

  private puntosFlotantes(x: number, y: number, n: number): void {
    const t = new Text({ text: `+${n}`, style: { fontFamily: 'Fredoka, sans-serif', fontSize: 30, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x001b41, width: 6, join: 'round' } } });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.capaFx.addChild(t);
    void this.tw.to(800, (v) => { t.y = y - 36 * v; t.alpha = v < 0.6 ? 1 : 1 - (v - 0.6) / 0.4; t.scale.set(v < 0.15 ? 0.6 + (v / 0.15) * 0.6 : 1.2 - v * 0.2); }, ease.outQuad).then(() => t.destroy());
  }

  private async crearEspecial(pos: Pos, f: Ficha): Promise<void> {
    this.au.crear();
    let v = this.vis.get(f.id);
    if (v && !v.s.destroyed) { v.s.texture = this.tx.ficha(f); v.key = claveFicha(f); v.sabor = f.sabor; v.p = pos; }
    else v = this.crear(f, pos);
    const s = v.s;
    this.destello(s.x, s.y);
    await this.tw.to(220, (t) => s.scale.set(ESC * (0.6 + 0.4 * ease.outBack(t))));
  }

  private async detonar(p: Extract<Paso, { tipo: 'detonar' }>): Promise<void> {
    const q = xy(p.pos);
    const esp = p.especial;
    this.gan.agitar(3);
    const haz = new Graphics();
    this.capaFx.addChild(haz);
    let dur = 280;
    const horizontal = esp === 'rayaH' || (!!p.combo && (esp === 'rayaV'));
    const vertical = esp === 'rayaV' || (!!p.combo && esp === 'rayaH');
    if (esp === 'rayaH' || esp === 'rayaV') {
      this.au.raya();
      void this.tw.to(dur, (t) => {
        haz.clear();
        const h = 34 * (1 - t) + 6;
        if (horizontal) haz.rect(-10, q.y - h / 2, this.ancho + 20, h).fill({ color: 0xffffff, alpha: 0.95 - t * 0.5 });
        if (vertical) haz.rect(q.x - h / 2, -10, h, this.alto + 20).fill({ color: 0xffffff, alpha: 0.95 - t * 0.5 });
      }, ease.outQuad);
    } else if (esp === 'tarrina') {
      this.au.boom();
      const r = Math.max(...p.celdas.map((c) => Math.hypot(c.c - p.pos.c, c.f - p.pos.f)), 1.5) * T + T * 0.6;
      void this.tw.to(dur, (t) => {
        haz.clear();
        haz.circle(q.x, q.y, r * ease.outCubic(t)).stroke({ width: 14 * (1 - t) + 2, color: 0xffffff, alpha: 1 - t });
        haz.circle(q.x, q.y, r * 0.6 * ease.outCubic(t)).fill({ color: 0xfff3c0, alpha: 0.5 * (1 - t) });
      });
    } else {
      this.au.rayos();
      dur = 380;
      const objetivos = p.celdas.map(xy);
      void this.tw.to(dur, (t) => {
        haz.clear();
        for (const o of objetivos) {
          const mx = (q.x + o.x) / 2 + (Math.random() - 0.5) * 22, my = (q.y + o.y) / 2 + (Math.random() - 0.5) * 22;
          haz.moveTo(q.x, q.y).lineTo(mx, my).lineTo(o.x, o.y).stroke({ width: 5 * (1 - t) + 1, color: 0xffffff, alpha: 1 - t * 0.7, join: 'round' });
          haz.circle(o.x, o.y, 10 * (1 - t)).fill({ color: 0xffffff, alpha: 1 - t });
        }
      });
    }
    this.chispas(q.x, q.y, 0xffffff, 12);
    await this.tw.espera(dur * 0.8);
    void this.tw.espera(dur * 0.3).then(() => haz.destroy());
  }

  /** Cambia la capa de una casilla: si quedan 0 se rompe con trocitos, si no se actualiza. */
  private quitarCapa(mapa: Map<string, Sprite>, pos: Pos, quedan: number, color: number, alfa: () => number, tex?: (n: number) => Sprite['texture']): void {
    const s = mapa.get(k(pos));
    if (!s) return;
    const q = xy(pos);
    if (quedan > 0) {
      if (tex) s.texture = tex(quedan);
      s.alpha = alfa();
      this.chispas(q.x, q.y, color, 5);
      return;
    }
    mapa.delete(k(pos));
    this.chispas(q.x, q.y, color, 12);
    void this.tw.to(220, (t) => { s.alpha = 1 - t; s.scale.set(s.scale.x * (1 + 0.02)); }).then(() => s.destroy());
  }

  private async carapinaFuera(id: number): Promise<void> {
    const v = this.vis.get(id);
    this.au.campanita(2);
    if (!v) return;
    const y0 = v.s.y;
    this.chispas(v.s.x, y0, 0xffd92e, 14);
    await this.tw.to(320, (t) => { v.s.y = y0 + T * 0.7 * t; v.s.alpha = 1 - t; v.s.scale.set(ESC * (1 + 0.3 * t)); }, ease.inQuad);
    this.quitar(v);
  }

  private async caer(p: Extract<Paso, { tipo: 'caer' }>): Promise<void> {
    const trabajos: Promise<void>[] = [];
    const caida = (v: Vis, desdeF: number, hasta: Pos, desdeC = hasta.c) => {
      const y0 = desdeF * T + T / 2, y1 = xy(hasta).y;
      const x0 = xy({ f: hasta.f, c: desdeC }).x, x1 = xy(hasta).x; // caída diagonal: también cambia de columna
      const filas = Math.max(0.5, hasta.f - desdeF);
      const dur = 120 + 85 * Math.sqrt(filas); // más lejos, más tarda, pero acelerando
      v.p = hasta;
      v.s.x = x0;
      trabajos.push((async () => {
        await this.tw.to(dur, (t) => { v.s.y = y0 + (y1 - y0) * t; v.s.x = x0 + (x1 - x0) * t; }, ease.inQuad, hasta.c * 22);
        // Rebote al aterrizar: se aplasta un poco y recupera.
        await this.tw.to(130, (t) => {
          const e = ease.outBack(t);
          v.s.scale.set(ESC * (1 + 0.1 * (1 - e)), ESC * (1 - 0.12 * (1 - e)));
        });
        v.s.scale.set(ESC);
      })());
    };
    for (const m of p.movimientos) { const v = this.vis.get(m.id); if (v) caida(v, m.desde.f, m.hasta, m.desde.c); }
    // Las nuevas entran por arriba apiladas: la de más arriba parte de más lejos.
    const porCol = new Map<number, typeof p.nuevas>();
    for (const n of p.nuevas) porCol.set(n.hasta.c, [...(porCol.get(n.hasta.c) ?? []), n]);
    for (const lista of porCol.values()) {
      lista.sort((a, b) => a.hasta.f - b.hasta.f);
      lista.forEach((n, i) => {
        const desde = -(lista.length - i);
        const v = this.crear(n.ficha, n.hasta, desde * T + T / 2);
        caida(v, desde, n.hasta);
      });
    }
    await Promise.all(trabajos);
    this.au.toc();
  }

  private async barajar(movs: Extract<Paso, { tipo: 'barajar' }>['movimientos']): Promise<void> {
    this.au.swoosh();
    const items = movs.map((m) => ({ v: this.vis.get(m.id), a: xy(m.desde), b: xy(m.hasta), h: m.hasta })).filter((i) => i.v);
    await this.tw.to(550, (t) => {
      for (const i of items) {
        const v = i.v!;
        v.s.position.set(i.a.x + (i.b.x - i.a.x) * t, i.a.y + (i.b.y - i.a.y) * t);
        v.s.rotation = Math.PI * 2 * t;
        v.s.scale.set(ESC * (1 + Math.sin(t * Math.PI) * 0.15));
      }
    }, ease.inOutQuad);
    for (const i of items) { i.v!.s.rotation = 0; i.v!.p = i.h; }
  }

  /** Letrero lo pone la escena; aquí cae la lluvia de rayas. */
  private async bolazo(): Promise<void> {
    this.enBolazo = true;
    this.au.fanfarria();
    this.gan.agitar(6);
    const cols = [0xe8344e, 0xff8a1f, 0xffd92e, 0x5bbf3b, 0x2f6fde, 0x7b3fb5];
    const n = REDUCIDO ? 0 : 22;
    for (let i = 0; i < n; i++) {
      const g = new Graphics().roundRect(-4, -26, 8, 52, 4).fill(cols[i % cols.length]);
      const x = Math.random() * this.ancho;
      g.position.set(x, -40);
      this.capaFx.addChild(g);
      void this.tw.to(900, (t) => { g.y = -40 + (this.alto + 80) * t; g.alpha = 1 - t * 0.4; }, ease.inQuad, i * 35).then(() => g.destroy());
    }
    await this.gan.bolazo();
  }
}
