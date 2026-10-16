// Escena de partida: HUD (movimientos, objetivo, puntos), tablero, jaleos y paso al resultado.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Partida } from '../motor/index.ts';
import type { Pos } from '../motor/tipos.ts';
import type { Nivel } from '../motor/tipos.ts';
import { BOLAZO, JALEO, TEXTOS } from '../datos/frases.ts';
import type { Juego, Escena } from './app.ts';
import { VistaTablero } from './vista.ts';
import { ease } from './tween.ts';
import { estrella } from './dibujo.ts';
import { boton, DW, fmt, panel, txt, txtBorde } from './ui.ts';
import { crearResultado } from './pantallas.ts';

const ALTO_HUD = 232;

export class EscenaPartida implements Escena {
  readonly container = new Container();
  readonly partida: Partida;
  private juego: Juego;
  private nivel: Nivel;
  private vista: VistaTablero;
  private tablero = new Container();   // vista + temblor
  private hud = new Container();
  private capaTextos = new Container();
  private movs: number;
  private puntosMostrados = 0;
  private ocupado = false;
  private terminado = false;
  private ocioMs = 0;
  private pistaPuesta = false;
  private temblor = 0;
  private tickFn: (t: { deltaMS: number }) => void;
  // HUD
  private txtMovs!: Text;
  private txtPuntos!: Text;
  private barra = new Graphics();
  private objetivo = new Container();
  private estrellasHud: Graphics[] = [];
  private estrellasOn = [false, false, false];
  private maxPuntos: number;
  private objetivoTxt: Text[] = [];

  constructor(juego: Juego, nivel: Nivel) {
    this.juego = juego;
    this.nivel = nivel;
    this.partida = new Partida(nivel);
    this.partida.asegurarJugada(); // por si el tablero inicial no tuviera jugada
    this.movs = this.partida.movimientosRestantes;
    this.maxPuntos = nivel.estrellas[2] * 1.12;

    this.vista = new VistaTablero(this.partida, juego.tx, juego.tw, juego.au, {
      agitar: (f) => { if (!juego.reducido) this.temblor = Math.max(this.temblor, f * 2.2); },
      jaleo: (n) => this.jaleo(n),
      bolazo: () => this.letreroBolazo(),
      puntos: (n) => { this.sumarPuntos(n); },
      movimiento: () => { this.movs = Math.max(0, this.movs - 1); this.txtMovs.text = String(this.movs); },
    }, juego.app.ticker);
    this.vista.alIntentar = (a, b) => void this.jugada(a, b);
    this.vista.alTocar = () => { juego.au.arrancar(); this.ocioMs = 0; this.quitarPista(); };

    this.tablero.addChild(this.vista);
    this.container.addChild(this.tablero, this.hud, this.capaTextos);
    this.construirHud();
    this.actualizar();

    this.tickFn = (t) => this.latido(t.deltaMS);
    juego.app.ticker.add(this.tickFn);
    window.bolas.partida = this.partida;
  }

  // ------------------------------------------------------------------ HUD
  private construirHud(): void {
    const n = this.nivel;
    const h = this.hud;
    const atras = boton('‹ Mapa', 104, 38, 0x2f6fde, () => this.juego.irMapa(), 18);
    atras.position.set(16 + 52, 28);
    const titulo = txt(`Nivel ${n.id} · ${n.nombre}`, 18, 0xffffff);
    titulo.position.set(DW / 2 + 20, 28);
    titulo.scale.set(Math.min(1, 200 / titulo.width));

    const cajaM = panel(130, 92);
    cajaM.position.set(16 + 65, 56 + 46 + 4);
    const capM = txt('MOVIMIENTOS', 12, 0xffd92e);
    capM.position.set(cajaM.x, 74);
    this.txtMovs = txtBorde(String(this.movs), 58, 0xffffff);
    this.txtMovs.position.set(cajaM.x, 112);

    const cajaO = panel(276, 92);
    cajaO.position.set(158 + 138, 106);
    this.objetivo.position.set(cajaO.x, cajaO.y);

    this.txtPuntos = txtBorde('0', 28, 0xffffff);
    this.txtPuntos.anchor.set(0, 0.5);
    this.txtPuntos.position.set(20, 166);
    const lbl = txt(TEXTOS.puntos.toUpperCase(), 11, 0xffd92e);
    lbl.anchor.set(1, 0.5);
    lbl.position.set(DW - 20, 166);

    h.addChild(atras, titulo, cajaM, capM, this.txtMovs, cajaO, this.objetivo, this.txtPuntos, lbl, this.barra);
    this.construirObjetivo();
    this.dibujarBarra();
  }

  private construirObjetivo(): void {
    const o = this.nivel.objetivo;
    const ob = this.objetivo;
    const tx = this.juego.tx;
    const cap = (s: string) => { const t = txt(s, 14, 0xffd92e); t.position.set(0, -34); ob.addChild(t); };
    if (o.tipo === 'puntos') {
      cap('CONSIGUE');
      const t = txtBorde(fmt(this.nivel.estrellas[0]), 40, 0xffffff); t.position.set(0, 4); ob.addChild(t);
      const u = txt('puntos', 14, 0xffffff); u.position.set(0, 34); ob.addChild(u);
    } else if (o.tipo === 'pedido') {
      cap('PEDIDO DE LA CLIENTA');
      const w = 252 / o.pedido.length;
      o.pedido.forEach((x, i) => {
        const cx = -126 + w * (i + 0.5);
        const s = new Sprite(tx.bolaTex(x.sabor, 'ninguno')); s.anchor.set(0.5); s.scale.set(0.5); s.position.set(cx, 4);
        const t = txtBorde('', 22, 0xffffff); t.position.set(cx, 36);
        ob.addChild(s, t);
        this.objetivoTxt.push(t);
      });
    } else {
      cap(o.tipo === 'manchas' ? 'LIMPIA LAS MANCHAS' : 'BAJA LAS CARAPINAS');
      const s = new Sprite(o.tipo === 'manchas' ? tx.mancha() : tx.carapina());
      s.anchor.set(0.5); s.scale.set(o.tipo === 'manchas' ? 0.8 : 0.6); s.position.set(-50, 8);
      const t = txtBorde('', 46, 0xffffff); t.position.set(30, 8);
      ob.addChild(s, t);
      this.objetivoTxt.push(t);
    }
  }

  private dibujarBarra(): void {
    const b = this.barra, x0 = 22, w = DW - 44, y = 198;
    b.clear();
    b.roundRect(x0, y - 7, w, 14, 7).fill({ color: 0x000000, alpha: 0.4 }).stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    const f = Math.min(1, this.puntosMostrados / this.maxPuntos);
    if (f > 0) b.roundRect(x0, y - 7, Math.max(14, w * f), 14, 7).fill(0xffb02e);
    this.nivel.estrellas.forEach((e, i) => {
      const x = x0 + (w * e) / this.maxPuntos;
      const on = this.puntosMostrados >= e;
      if (on && !this.estrellasOn[i]) { this.estrellasOn[i] = true; this.juego.au.campanita(i); this.hud.addChild(this.estrellaHud(i, x, y)); }
      estrella(b, x, y - 2, 13, on ? 0xffd92e : 0x5a6a8a, on ? 0x9a5b00 : 0x2a3a5a);
    });
  }

  private estrellaHud(i: number, x: number, y: number): Graphics {
    const g = estrella(new Graphics(), 0, 0, 13, 0xffffff, 0xffffff);
    g.position.set(x, y - 2);
    void this.juego.tw.to(500, (t) => { g.scale.set(1 + 1.4 * t); g.alpha = 1 - t; }, ease.outQuad).then(() => g.destroy());
    this.estrellasHud[i] = g;
    return g;
  }

  private sumarPuntos(n: number): void {
    const desde = this.puntosMostrados, hasta = desde + n;
    void this.juego.tw.to(350, (t) => {
      this.puntosMostrados = desde + (hasta - desde) * t;
      this.txtPuntos.text = fmt(this.puntosMostrados);
      this.dibujarBarra();
    }, ease.outQuad);
  }

  /** Pone los marcadores al valor real del motor (al acabar cada jugada). */
  private actualizar(): void {
    const p = this.partida;
    this.movs = p.movimientosRestantes;
    this.txtMovs.text = String(this.movs);
    this.puntosMostrados = p.puntos;
    this.txtPuntos.text = fmt(p.puntos);
    this.dibujarBarra();
    const o = this.nivel.objetivo, pr = p.progreso;
    if (o.tipo === 'manchas') this.objetivoTxt[0].text = String(pr.manchas);
    else if (o.tipo === 'carapinas') this.objetivoTxt[0].text = String(pr.carapinas);
    else if (o.tipo === 'pedido') pr.pedido.forEach((x, i) => { this.objetivoTxt[i].text = x.n > 0 ? `${x.n}` : '✓'; });
  }

  // ------------------------------------------------------------------ jugada
  private async jugada(a: Pos, b: Pos): Promise<void> {
    if (this.ocupado || this.terminado) return;
    this.ocupado = true;
    this.vista.bloqueado = true;
    this.quitarPista();
    const pasos = this.partida.intercambiar(a, b);
    await this.vista.animar(pasos);
    this.vista.sync();
    this.actualizar();
    this.ocioMs = 0;
    const fin = pasos.find((p) => p.tipo === 'fin');
    if (fin && fin.tipo === 'fin') {
      this.terminado = true;
      await this.juego.tw.espera(fin.estado === 'ganado' ? 500 : 700);
      this.mostrarResultado(fin.estado, fin.estrellas);
      return;
    }
    this.ocupado = false;
    this.vista.bloqueado = false;
  }

  mostrarResultado(estado: 'ganado' | 'perdido', estrellas: 0 | 1 | 2 | 3): void {
    this.terminado = true;
    this.vista.bloqueado = true;
    this.container.addChild(crearResultado(this.juego, this.nivel, estado, estrellas, this.partida.puntos));
  }

  // ------------------------------------------------------------------ pista, temblor, textos
  private quitarPista(): void {
    this.pistaPuesta = false;
    this.vista.quitarPista();
  }

  private latido(dt: number): void {
    if (!this.ocupado && !this.terminado && !this.pistaPuesta) {
      this.ocioMs += dt;
      if (this.ocioMs > 5000) {
        const par = this.partida.pista();
        if (par) { this.vista.mostrarPista(par); this.pistaPuesta = true; }
      }
    }
    if (this.temblor > 0.2) {
      this.vista.position.set((Math.random() - 0.5) * this.temblor + this.base.x, (Math.random() - 0.5) * this.temblor + this.base.y);
      this.temblor *= 0.88;
    } else if (this.temblor > 0) { this.temblor = 0; this.vista.position.set(this.base.x, this.base.y); }
  }

  private base = { x: 0, y: 0 };

  private jaleo(n: 1 | 2 | 3 | 4): void {
    const lista = JALEO[n];
    this.grande(lista[Math.floor(Math.random() * lista.length)], 54 + n * 6, 0xffd92e, 1000, -0.04);
  }

  private async letreroBolazo(): Promise<void> {
    await this.grande(BOLAZO, 110, 0xff5a6e, 1000, -0.1);
  }

  private grande(texto: string, size: number, color: number, dur: number, rot: number): Promise<void> {
    const t = txtBorde(texto, size, color);
    const fit = Math.min(1, 410 / t.width);
    t.rotation = rot;
    t.position.set(DW / 2, this.base.y + (this.vista.alto * this.vista.scale.y) / 2);
    this.capaTextos.addChild(t);
    const ent = 260, sal = 280;
    return this.juego.tw.to(dur, (v) => {
      const ms = v * dur;
      let e: number, a = 1;
      if (ms < ent) e = ease.outBack(ms / ent) * 1.0;
      else if (ms > dur - sal) { const q = (ms - (dur - sal)) / sal; e = 1 + q * 0.3; a = 1 - q; } else e = 1;
      t.scale.set(fit * Math.max(0.01, e));
      t.alpha = a;
    }).then(() => t.destroy());
  }

  // ------------------------------------------------------------------ Escena
  layout(dh: number): void {
    const libreAlto = dh - ALTO_HUD - 16, libreAncho = DW - 20;
    const s = Math.min(libreAncho / this.vista.ancho, libreAlto / this.vista.alto, 1.1);
    this.vista.scale.set(s);
    this.base.x = (DW - this.vista.ancho * s) / 2;
    this.base.y = ALTO_HUD + (libreAlto - this.vista.alto * s) / 2;
    this.vista.position.set(this.base.x, this.base.y);
  }

  destroy(): void {
    this.juego.app.ticker.remove(this.tickFn);
    this.container.destroy({ children: true });
  }
}
