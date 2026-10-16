// Pantallas fuera de la partida: mapa del episodio, ficha de nivel y resultado.
import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { EPISODIO_1 } from '../datos/niveles.ts';
import type { Nivel } from '../motor/tipos.ts';
import { PERSONAJE } from '../datos/equipo.ts';
import { TEXTOS } from '../datos/frases.ts';
import type { Juego, Escena } from './app.ts';
import { estrella } from './dibujo.ts';
import { ease } from './tween.ts';
import { avatar, boton, cargarProgreso, DW, fmt, guardarResultado, panel, txt, txtBorde } from './ui.ts';

const NIVELES = EPISODIO_1.niveles;
const HITOS = ['giralda', 'torredeloro', 'setas', 'puente', 'mercado'];
const SEPARACION = 125;

/** Carga las imágenes de los hitos (si alguna falla, el mapa sigue sin ella). */
export async function cargarHitos(carga: (url: string) => Promise<Texture | null>): Promise<(Texture | null)[]> {
  return Promise.all(HITOS.map((h) => carga(`${import.meta.env.BASE_URL}hito-${h}.png`)));
}

// ------------------------------------------------------------------ mapa
export class EscenaMapa implements Escena {
  readonly container = new Container();
  private contenido = new Container();
  private juego: Juego;
  private altoContenido = NIVELES.length * SEPARACION + 320;
  private iniciado = false;
  private foco: Container | null = null;
  private arrastre: { y: number; s: number } | null = null;
  private movido = false;
  private actual: Container | null = null;
  private tickFn: (t: { deltaMS: number }) => void;
  private rueda: (e: WheelEvent) => void;
  private reloj = 0;
  private dh = 720;

  constructor(juego: Juego, hitos: (Texture | null)[]) {
    this.juego = juego;
    const prog = cargarProgreso();
    const cont = this.contenido;
    const nodoXY = (i: number) => ({ x: DW / 2 + Math.sin(i * 0.9) * 115, y: this.altoContenido - 150 - i * SEPARACION });

    // Camino: línea ancha translúcida con curvas entre nodos.
    const camino = new Graphics();
    NIVELES.forEach((_, i) => {
      const p = nodoXY(i);
      if (i === 0) camino.moveTo(p.x, p.y);
      else { const a = nodoXY(i - 1); camino.quadraticCurveTo(a.x + (p.x - a.x) * 0.1 + (i % 2 ? 60 : -60), (a.y + p.y) / 2, p.x, p.y); }
    });
    camino.stroke({ width: 22, color: 0xffffff, alpha: 0.14, cap: 'round', join: 'round' });
    cont.addChild(camino);
    const puntos = new Graphics();
    NIVELES.forEach((_, i) => {
      if (i === 0) return;
      const a = nodoXY(i - 1), b = nodoXY(i);
      for (let t = 0.2; t < 0.9; t += 0.2) puntos.circle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3).fill({ color: 0xffffff, alpha: 0.5 });
    });
    cont.addChild(puntos);

    // Hitos de Sevilla al lado del camino, en el lado contrario al nodo.
    hitos.forEach((tex, j) => {
      if (!tex) return;
      const i = 2 + 3 * j, p = nodoXY(Math.min(i, NIVELES.length - 1));
      const s = new Sprite(tex);
      s.anchor.set(0.5, 1);
      s.scale.set(Math.min(150 / tex.height, 120 / tex.width));
      s.position.set(p.x < DW / 2 ? DW - 70 : 70, p.y + 40);
      s.alpha = 0.95;
      cont.addChild(s);
    });

    NIVELES.forEach((n, i) => {
      const p = nodoXY(i);
      const hecho = (prog.estrellas[i] ?? 0) > 0;
      const jugable = n.id <= prog.desbloqueado;
      const esActual = jugable && !hecho && n.id === prog.desbloqueado;
      const c = new Container();
      c.position.set(p.x, p.y);
      const color = hecho ? 0xffc83d : esActual ? 0xff5a6e : jugable ? 0x2f6fde : 0x4a5a7a;
      c.addChild(
        new Graphics().circle(0, 5, 32).fill({ color: 0x000000, alpha: 0.4 }).circle(0, 0, 32).fill(color).stroke({ width: 4, color: 0xffffff, alpha: jugable ? 1 : 0.4 }),
        new Graphics().ellipse(-9, -16, 14, 7).fill({ color: 0xffffff, alpha: 0.3 }),
        txtBorde(String(n.id), 30, jugable ? 0xffffff : 0xaab4c8),
      );
      if (jugable) {
        const g = new Graphics();
        for (let k = 0; k < 3; k++) estrella(g, (k - 1) * 24, 50 - (k === 1 ? 4 : 0), 11, k < (prog.estrellas[i] ?? 0) ? 0xffd92e : 0x33466b, k < (prog.estrellas[i] ?? 0) ? 0x9a5b00 : 0x1a2a4a);
        c.addChild(g);
        c.eventMode = 'static';
        c.cursor = 'pointer';
        c.hitArea = new Rectangle(-38, -38, 76, 76);
        c.on('pointertap', () => { if (!this.movido) { juego.au.clic(); juego.irFicha(n.id); } });
      } else {
        c.addChild(new Graphics().arc(0, 45, 5, Math.PI, 0).stroke({ width: 3, color: 0x8a96a8 }), new Graphics().roundRect(-8, 44, 16, 12, 3).fill(0x8a96a8));
      }
      if (esActual) this.actual = c;
      if (jugable) this.foco = c;
      cont.addChild(c);
    });

    // Cabecera fija.
    const cab = new Container();
    const fondoCab = new Graphics().rect(-20, 0, DW + 40, 62).fill({ color: 0x001b41, alpha: 0.85 });
    const t = txtBorde(EPISODIO_1.nombre, 28, 0xffd92e);
    t.position.set(DW / 2, 26);
    const sub = txt(EPISODIO_1.tienda, 13, 0xffffff);
    sub.position.set(DW / 2, 50);
    cab.addChild(fondoCab, t, sub);

    // Arrastre vertical con dedo/ratón.
    const zona = new Graphics().rect(0, -3000, DW, 9000).fill({ color: 0xffffff, alpha: 0.001 });
    zona.eventMode = 'static';
    cont.addChildAt(zona, 0);
    this.container.eventMode = 'static';
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
      if (this.actual) this.actual.scale.set(1 + Math.sin(this.reloj * 5) * 0.07); // el siguiente nivel late
    };
    juego.app.ticker.add(this.tickFn);
  }

  /** contenido.y va de (dh - alto) a 0; así el scroll nunca deja huecos. */
  private fijar(y: number): void {
    this.contenido.y = Math.min(0, Math.max(this.dh - this.altoContenido, y));
  }

  layout(dh: number): void {
    this.dh = dh;
    if (!this.iniciado) { // primera vez: el nivel actual queda hacia abajo-medio de la pantalla
      this.iniciado = true;
      this.fijar(dh * 0.62 - (this.foco?.y ?? this.altoContenido));
    } else this.fijar(this.contenido.y);
  }

  destroy(): void {
    this.juego.app.ticker.remove(this.tickFn);
    this.juego.app.canvas.removeEventListener('wheel', this.rueda);
    this.container.destroy({ children: true });
  }
}

// ------------------------------------------------------------------ ficha de nivel
export class EscenaFicha implements Escena {
  readonly container = new Container();
  private tarjeta = new Container();

  constructor(juego: Juego, nivel: Nivel) {
    const n = nivel;
    const w = 400;
    const t = this.tarjeta;
    const tit = txtBorde(`Nivel ${n.id}`, 44, 0xffd92e); tit.position.set(0, -250);
    const nom = txt(n.nombre, 24, 0xffffff); nom.position.set(0, -205);
    nom.scale.set(Math.min(1, 340 / nom.width));
    t.addChild(panel(w, 560, 0.78), tit, nom);

    // Objetivo
    const ob = n.objetivo;
    const textoObj = ob.tipo === 'puntos' ? TEXTOS.objetivoPuntos(n.estrellas[0]) : ob.tipo === 'manchas' ? TEXTOS.objetivoManchas : ob.tipo === 'carapinas' ? TEXTOS.objetivoCarapinas(ob.n) : TEXTOS.objetivoPedido;
    const cap = txt('OBJETIVO', 13, 0xffd92e); cap.position.set(0, -176);
    const to = txt(textoObj, 20, 0xffffff, { wordWrap: true, wordWrapWidth: 340 }); to.position.set(0, -140);
    t.addChild(cap, to);
    if (ob.tipo === 'pedido') {
      ob.pedido.forEach((x, i) => {
        const cx = (i - (ob.pedido.length - 1) / 2) * 80;
        const s = new Sprite(juego.tx.bolaTex(x.sabor, 'ninguno')); s.anchor.set(0.5); s.scale.set(0.55); s.position.set(cx, -88);
        const q = txtBorde(`×${x.n}`, 22); q.position.set(cx, -52);
        t.addChild(s, q);
      });
    } else if (ob.tipo !== 'puntos') {
      const s = new Sprite(ob.tipo === 'manchas' ? juego.tx.mancha() : juego.tx.carapina()); s.anchor.set(0.5); s.scale.set(ob.tipo === 'manchas' ? 0.9 : 0.7); s.position.set(0, -82);
      t.addChild(s);
    }
    const mv = txt(`${TEXTOS.movimientos}: `, 20, 0xffffff); mv.anchor.set(1, 0.5); mv.position.set(8, -14);
    const mn = txtBorde(String(n.movimientos), 38, 0xffffff); mn.anchor.set(0, 0.5); mn.position.set(14, -16);
    t.addChild(mv, mn);

    // Presentador
    const pers = PERSONAJE[n.presenta?.quien ?? 'rocio'];
    const av = avatar(pers, 38); av.position.set(-w / 2 + 62, 82);
    const burbuja = new Graphics().roundRect(-w / 2 + 112, 38, w - 140, 112, 18).fill(0xffffff).poly([-w / 2 + 112, 70, -w / 2 + 98, 84, -w / 2 + 112, 98]).fill(0xffffff);
    const nombre = txt(pers.nombre, 14, 0x2f6fde, { fontWeight: '700' }); nombre.anchor.set(0, 0.5); nombre.position.set(-w / 2 + 126, 54);
    const frase = txt(n.presenta?.texto ?? '¡A por ello, mi arma!', 16, 0x001b41, { wordWrap: true, wordWrapWidth: w - 175, align: 'left' });
    frase.anchor.set(0, 0.5); frase.position.set(-w / 2 + 126, 100);
    t.addChild(burbuja, nombre, frase, av);

    const jugar = boton(TEXTOS.jugar, 240, 64, 0x3cb44b, () => { juego.au.clic(); juego.irPartida(n.id); }, 32);
    jugar.position.set(0, 196);
    const volver = boton('‹ Mapa', 130, 44, 0x2f6fde, () => { juego.au.clic(); juego.irMapa(); }, 20);
    volver.position.set(0, 252);
    t.addChild(jugar, volver);
    this.container.addChild(t);
    // Entra con rebote.
    t.scale.set(0.6);
    void juego.tw.to(320, (v) => { t.scale.set(0.6 + 0.4 * ease.outBack(v)); t.alpha = Math.min(1, v * 3); }, ease.lineal);
  }

  layout(dh: number): void { this.tarjeta.position.set(DW / 2, dh / 2); }
  destroy(): void { this.container.destroy({ children: true }); }
}

// ------------------------------------------------------------------ resultado (se superpone a la partida)
export function crearResultado(juego: Juego, nivel: Nivel, estado: 'ganado' | 'perdido', estrellas: number, puntos: number): Container {
  const ganado = estado === 'ganado';
  if (ganado) guardarResultado(nivel.id, estrellas);
  const raiz = new Container();
  const velo = new Graphics().rect(-1000, -1000, DW + 2000, juego.dh + 2000).fill({ color: 0x000a1f, alpha: 0.7 });
  velo.eventMode = 'static'; // traga los toques de debajo
  const c = new Container();
  c.position.set(DW / 2, juego.dh / 2);
  raiz.addChild(velo, c);
  const pers = PERSONAJE[nivel.presenta?.quien ?? 'rocio'];
  const frases = ganado ? pers.frasesGanar : pers.frasesPerder;
  const frase = frases[Math.floor(Math.random() * frases.length)];

  const fondo = panel(390, 520, 0.88);
  fondo.y = 22;
  c.addChild(fondo);
  const tit = txtBorde(ganado ? TEXTOS.nivelSuperado : TEXTOS.nivelFallido, ganado ? 34 : 30, ganado ? 0xffd92e : 0xff8a9b);
  tit.position.set(0, -190);
  tit.scale.set(Math.min(1, 350 / tit.width));
  c.addChild(tit);

  const estr: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 100, y = i === 1 ? -100 : -80;
    const gris = estrella(new Graphics(), 0, 0, 42, 0x33466b, 0x1a2a4a);
    const oro = estrella(new Graphics(), 0, 0, 42, 0xffd92e, 0x9a5b00);
    gris.position.set(x, y);
    oro.position.set(x, y);
    oro.visible = false;
    c.addChild(gris, oro);
    estr.push(oro);
  }

  const pts = txtBorde(fmt(puntos), 40, 0xffffff); pts.position.set(0, -4);
  const pl = txt(TEXTOS.puntos, 14, 0xffd92e); pl.position.set(0, -34);
  c.addChild(pl, pts);

  const av = avatar(pers, 30); av.position.set(-150, 62);
  const burbuja = new Graphics().roundRect(-108, 28, 270, 70, 16).fill(0xffffff).poly([-108, 52, -120, 64, -108, 76]).fill(0xffffff);
  const ft = txt(frase, 16, 0x001b41, { wordWrap: true, wordWrapWidth: 245 }); ft.position.set(27, 63);
  c.addChild(burbuja, ft, av);
  if (!ganado) {
    const sm = txt(TEXTOS.sinMovimientos, 14, 0xffffff, { wordWrap: true, wordWrapWidth: 340 }); sm.position.set(0, 120);
    c.addChild(sm);
  }

  const botones = new Container();
  botones.alpha = 0;
  const sig = NIVELES.find((n) => n.id === nivel.id + 1);
  let y = 160;
  if (ganado && sig) {
    const b = boton(TEXTOS.siguiente, 230, 56, 0x3cb44b, () => { juego.au.clic(); juego.irFicha(sig.id); }, 28);
    b.position.set(0, y); botones.addChild(b); y += 62;
  }
  const rep = boton(TEXTOS.repetir, ganado ? 150 : 230, ganado ? 44 : 56, ganado ? 0xff8a1f : 0x3cb44b, () => { juego.au.clic(); juego.irPartida(nivel.id); }, ganado ? 20 : 28);
  const mapa = boton('Mapa', ganado ? 110 : 230, ganado ? 44 : 56, 0x2f6fde, () => { juego.au.clic(); juego.irMapa(); }, 20);
  if (ganado) { rep.position.set(-65, y); mapa.position.set(95, y); } else { rep.position.set(0, y); mapa.position.set(0, y + 62); }
  botones.addChild(rep, mapa);
  c.addChild(botones);

  // Entrada, estrellas una a una y botones.
  c.scale.set(0.6);
  void (async () => {
    const tw = juego.tw;
    void tw.to(320, (v) => { c.scale.set(0.6 + 0.4 * ease.outBack(v)); });
    if (ganado) juego.au.fanfarria(); else juego.au.derrota();
    await tw.espera(450);
    for (let i = 0; i < estrellas; i++) {
      const s = estr[i];
      s.visible = true;
      juego.au.campanita(i);
      void tw.to(380, (v) => { s.scale.set(2.2 - 1.2 * ease.outBack(v)); s.rotation = (1 - v) * 0.8; });
      await tw.espera(420);
    }
    await tw.to(250, (v) => { botones.alpha = v; });
  })();
  return raiz;
}
