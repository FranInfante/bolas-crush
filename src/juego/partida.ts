// Escena de partida: HUD (movimientos, objetivo, puntos), tablero, jaleos y paso al resultado.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Partida } from '../motor/index.ts';
import type { Paso, Pos } from '../motor/tipos.ts';
import type { Especial, Nivel } from '../motor/tipos.ts';
import { BOLAZO, JALEO, TEXTOS } from '../datos/frases.ts';
import type { Juego, Escena } from './app.ts';
import { VistaTablero } from './vista.ts';
import { ease } from './tween.ts';
import { estrella } from './dibujo.ts';
import { boton, cargarProgreso, DW, fmt, moneda, panel, PRECIO, puedePot, txt, txtBorde, usarPot } from './ui.ts';
import type { PotId } from './ui.ts';
import { crearResultado } from './pantallas.ts';
import { iconoPot, ofertaMas5 } from './enganche.ts';
import { EXTRA } from './textos-extra.ts';

const ALTO_HUD = 232;
const ALTO_BARRA = 84; // barra de potenciadores abajo

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
  private destruida = false;
  private libre = false;                       // la jugada en curso no gasta movimiento (cuchara, mano libre)
  private modo: 'cuchara' | 'mano' | null = null;
  private barra2 = new Container();            // barra de potenciadores
  private avisoModo = new Container();         // aviso + cancelar mientras hay un modo activo
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

  constructor(juego: Juego, nivel: Nivel, potenciadores: Especial[] = []) {
    this.juego = juego;
    this.nivel = nivel;
    this.partida = new Partida(nivel);
    this.partida.asegurarJugada(); // por si el tablero inicial no tuviera jugada
    this.partida.ponerPotenciadores(potenciadores);
    this.movs = this.partida.movimientosRestantes;
    this.maxPuntos = nivel.estrellas[2] * 1.12;

    this.vista = new VistaTablero(this.partida, juego.tx, juego.tw, juego.au, {
      agitar: (f) => { if (!juego.reducido) this.temblor = Math.max(this.temblor, f * 2.2); },
      jaleo: (n) => this.jaleo(n),
      bolazo: () => this.letreroBolazo(),
      puntos: (n) => { this.sumarPuntos(n); },
      movimiento: () => { if (this.libre) return; this.movs = Math.max(0, this.movs - 1); this.txtMovs.text = String(this.movs); },
      barajado: () => { void this.grande(TEXTOS.sinJugadas, 38, 0xffffff, 1500, 0); },
    }, juego.app.ticker);
    this.vista.alIntentar = (a, b) => void this.jugada(a, b);
    this.vista.alCuchara = (p) => void this.cuchara(p);
    this.vista.alTocar = () => { juego.au.arrancar(); this.ocioMs = 0; this.quitarPista(); };

    this.tablero.addChild(this.vista);
    this.container.addChild(this.tablero, this.hud, this.barra2, this.avisoModo, this.capaTextos);
    this.avisoModo.visible = false;
    this.construirHud();
    this.refrescarBarra();
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
  private liberar(): void {
    if (this.destruida || this.terminado) return;
    this.ocupado = false;
    this.vista.bloqueado = false;
  }

  private async jugada(a: Pos, b: Pos): Promise<void> {
    if (this.ocupado || this.terminado) return;
    this.ocupado = true;
    this.vista.bloqueado = true;
    this.quitarPista();
    let pasos: Paso[];
    let libre = false;
    try {
      if (this.modo === 'mano') {
        pasos = this.partida.intercambioLibre(a, b);
        if (pasos[0]?.tipo !== 'invalido') { usarPot('manoLibre'); libre = true; this.salirModo(); }
      } else pasos = this.partida.intercambiar(a, b);
    } catch (e) { this.liberar(); throw e; }
    await this.correr(pasos, libre);
  }

  /** Cuchara: rompe la bola tocada sin gastar movimiento. Se cobra solo si había algo que romper. */
  private async cuchara(p: Pos): Promise<void> {
    if (this.ocupado || this.terminado || this.modo !== 'cuchara') return;
    this.ocupado = true;
    this.vista.bloqueado = true;
    this.quitarPista();
    let pasos: Paso[] = [];
    try { pasos = this.partida.usarCuchara(p); } catch (e) { this.liberar(); throw e; }
    if (!pasos.length) { this.liberar(); return; }
    usarPot('cuchara');
    this.salirModo();
    await this.correr(pasos, true);
  }

  /** Anima los pasos del motor con la misma tubería para cualquier jugada y desbloquea el tablero pase lo que pase. */
  private async correr(pasos: Paso[], libre: boolean): Promise<void> {
    this.libre = libre;
    try {
      await this.vista.animar(pasos);
      if (this.destruida) return;
      this.vista.sync();
      this.actualizar();
      this.ocioMs = 0;
      const fin = pasos.find((p) => p.tipo === 'fin');
      if (fin && fin.tipo === 'fin') {
        this.terminado = true;
        await this.juego.tw.espera(fin.estado === 'ganado' ? 500 : 700);
        if (this.destruida) return; // salió al mapa durante la animación: no hay resultado
        this.mostrarResultado(fin.estado, fin.estrellas);
      }
    } finally {
      this.libre = false;
      this.liberar();
      this.refrescarBarra();
    }
  }

  mostrarResultado(estado: 'ganado' | 'perdido', estrellas: 0 | 1 | 2 | 3): void {
    this.terminado = true;
    this.vista.bloqueado = true;
    this.salirModo();
    if (estado === 'perdido') { void this.ofrecerMas5(); return; }
    this.container.addChild(crearResultado(this.juego, this.nivel, estado, estrellas, this.partida.puntos));
  }

  /** Antes de la derrota: «¿5 movimientos más?» (un +5 del inventario o monedas). */
  private async ofrecerMas5(): Promise<void> {
    const si = await ofertaMas5(this.juego, this.container);
    if (this.destruida) return;
    if (!si) { this.container.addChild(crearResultado(this.juego, this.nivel, 'perdido', 0, this.partida.puntos)); return; }
    this.partida.sumarMovimientos(5);
    const pasos = this.partida.asegurarJugada();
    this.terminado = false;
    this.ocupado = true;
    try { if (pasos.length) await this.vista.animar(pasos); } finally {
      this.vista.sync();
      this.actualizar();
      this.ocioMs = 0;
      this.liberar();
      this.refrescarBarra();
    }
  }

  // ------------------------------------------------------------------ barra de potenciadores
  private refrescarBarra(): void {
    if (this.destruida) return;
    const b = this.barra2;
    b.removeChildren().forEach((c) => c.destroy({ children: true }));
    const inv = cargarProgreso().inv;
    const lista: { id: PotId; nombre: string }[] = [
      { id: 'cuchara', nombre: 'Cuchara' }, { id: 'manoLibre', nombre: 'Mano libre' }, { id: 'mas5', nombre: '+5 movs' },
    ];
    lista.forEach((pt, i) => {
      const c = new Container();
      c.position.set(75 + i * 150, 0);
      const ok = puedePot(pt.id) && !this.terminado;
      c.addChild(new Graphics().roundRect(-68, -33, 136, 66, 16).fill({ color: ok ? 0x001b41 : 0x1a2540, alpha: 0.8 }).stroke({ width: 3, color: ok ? 0xffd92e : 0x4a5a7a, alpha: ok ? 0.9 : 0.6 }));
      const ic = iconoPot(this.juego, pt.id); ic.scale.set(0.85); ic.position.set(-38, 0);
      const nm = txt(pt.nombre, 13, 0xffffff); nm.position.set(20, -13);
      nm.scale.set(Math.min(1, 66 / nm.width));
      c.addChild(ic, nm);
      if (inv[pt.id] > 0) { const t = txtBorde(`×${inv[pt.id]}`, 18, 0xffffff); t.position.set(20, 14); c.addChild(t); }
      else {
        const m = moneda(8); m.position.set(6, 14);
        const pr = txt(String(PRECIO[pt.id]), 15, ok ? 0xffd92e : 0x8a96a8, { fontWeight: '700' }); pr.anchor.set(0, 0.5); pr.position.set(17, 14);
        c.addChild(m, pr);
      }
      c.alpha = ok ? 1 : 0.45;
      if (ok) { c.eventMode = 'static'; c.cursor = 'pointer'; c.on('pointertap', () => this.pulsarPot(pt.id)); }
      b.addChild(c);
    });
  }

  private pulsarPot(id: PotId): void {
    if (this.ocupado || this.terminado || this.modo) return;
    this.juego.au.clic();
    this.quitarPista();
    if (id === 'mas5') {
      if (!usarPot('mas5')) return;
      this.partida.sumarMovimientos(5);
      this.actualizar();
      this.refrescarBarra();
      void this.grande('¡+5 movimientos!', 52, 0x7be0ff, 900, -0.04);
      return;
    }
    this.modo = id === 'cuchara' ? 'cuchara' : 'mano';
    this.vista.modoCuchara = id === 'cuchara';
    this.barra2.visible = false;
    const av = this.avisoModo;
    av.removeChildren().forEach((c) => c.destroy({ children: true }));
    const t = txtBorde(id === 'cuchara' ? EXTRA.avisoCuchara : EXTRA.avisoMano, 20, 0xffd92e);
    t.scale.set(Math.min(1, 250 / t.width)); t.position.set(-80, 0);
    const x = boton(EXTRA.cancelar, 120, 44, 0xe8344e, () => { this.juego.au.clic(); this.salirModo(); }, 18);
    x.position.set(150, 0);
    av.addChild(panel(420, 62, 0.8), t, x);
    av.visible = true;
  }

  private salirModo(): void {
    this.modo = null;
    this.vista.modoCuchara = false;
    this.avisoModo.visible = false;
    this.barra2.visible = true;
    this.refrescarBarra();
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
    t.position.set(this.base.x + (this.vista.ancho * this.vista.scale.x) / 2, this.base.y + (this.vista.alto * this.vista.scale.y) / 2);
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
    if (this.juego.apaisado) { this.layoutApaisado(dh); return; }
    this.hud.position.set(0, 0);
    const libreAlto = dh - ALTO_HUD - 16 - ALTO_BARRA, libreAncho = DW - 20;
    const yBarra = dh - ALTO_BARRA / 2 - 6;
    this.barra2.position.set(0, yBarra);
    this.avisoModo.position.set(DW / 2, yBarra);
    const s = Math.min(libreAncho / this.vista.ancho, libreAlto / this.vista.alto, 1.1);
    this.vista.scale.set(s);
    this.base.x = (DW - this.vista.ancho * s) / 2;
    this.base.y = ALTO_HUD + (libreAlto - this.vista.alto * s) / 2;
    this.vista.position.set(this.base.x, this.base.y);
  }

  /** Como Candy Crush en horizontal: marcador y ayudas en una columna a la izquierda, tablero a la derecha. */
  private layoutApaisado(dh: number): void {
    const izq = DW / 2 - this.juego.dw / 2; // borde izquierdo de la pantalla en coordenadas lógicas
    const x0 = izq + 8, y0 = Math.max(0, (dh - ALTO_HUD - ALTO_BARRA) / 2);
    this.hud.position.set(x0, y0);
    const yBarra = y0 + ALTO_HUD + ALTO_BARRA / 2 - 6;
    this.barra2.position.set(x0, yBarra);
    this.avisoModo.position.set(x0 + DW / 2, yBarra);
    const der = izq + this.juego.dw;
    this.juego.sonidoBtn.position.set(der - 28, 30); // en la esquina, fuera del tablero y de las ventanas
    const ax = x0 + DW + 8, aw = der - 56 - ax, ah = dh - 20;
    const s = Math.min(aw / this.vista.ancho, ah / this.vista.alto, 1.1);
    this.vista.scale.set(s);
    this.base.x = ax + (aw - this.vista.ancho * s) / 2;
    this.base.y = 10 + (ah - this.vista.alto * s) / 2;
    this.vista.position.set(this.base.x, this.base.y);
  }

  destroy(): void {
    this.destruida = true;
    this.juego.app.ticker.remove(this.tickFn);
    this.container.destroy({ children: true });
  }
}
