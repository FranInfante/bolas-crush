// Pantallas fuera de la partida: ficha de nivel y resultado (el mapa está en mapa.ts).
import { Container, Graphics, Sprite } from 'pixi.js';
import { esDificil, nivel as nivelDe } from '../datos/episodios.ts';
import type { Nivel } from '../motor/tipos.ts';
import { PERSONAJE } from '../datos/equipo.ts';
import { TEXTOS } from '../datos/frases.ts';
import type { Juego, Escena } from './app.ts';
import { estrella } from './dibujo.ts';
import { ease } from './tween.ts';
import { boton, busto, cargarProgreso, cofrePara, abrirCofre, DW, fmt, guardarResultado, moneda, panel, PRECIO, txt, txtBorde, usarPot } from './ui.ts';
import type { PotId } from './ui.ts';
import { mostrarCofre } from './enganche.ts';
import { EXTRA } from './textos-extra.ts';
import type { Especial } from '../motor/tipos.ts';

/** Potenciadores previos al nivel (los de Candy Crush: rayado, envuelto y bomba de color), pagados con monedas. */
const POTENCIADORES: { id: PotId; esp: Especial; nombre: string; precio: number }[] = [
  { id: 'sirope', esp: 'rayaH', nombre: 'Sirope', precio: PRECIO.sirope },
  { id: 'tarrina', esp: 'tarrina', nombre: 'Tarrina', precio: PRECIO.tarrina },
  { id: 'bolaBolas', esp: 'bolaBolas', nombre: 'Bola Bolas', precio: PRECIO.bolaBolas },
];

// ------------------------------------------------------------------ ficha de nivel
export class EscenaFicha implements Escena {
  readonly container = new Container();
  private tarjeta = new Container();
  private marco = new Container();

  constructor(juego: Juego, nivel: Nivel) {
    const n = nivel;
    const w = 400;
    const t = this.tarjeta;
    const dificil = esDificil(n.id);
    const tit = txtBorde(`Nivel ${n.id}`, 44, dificil ? 0xff7f9a : 0xffd92e); tit.position.set(0, -250);
    if (dificil) {
      const ch = new Graphics().roundRect(-80, -298, 160, 26, 13).fill(0x6a1fa8).stroke({ width: 2, color: 0xff7f9a });
      const ct = txt(EXTRA.nivelDificil.toUpperCase(), 14, 0xffffff, { fontWeight: '700' }); ct.position.set(0, -285);
      t.addChild(ch, ct);
    }
    const nom = txt(n.nombre, 24, 0xffffff); nom.position.set(0, -205);
    nom.scale.set(Math.min(1, 340 / nom.width));
    const fondoT = panel(w, 770, 0.78); fondoT.y = 65;
    t.addChild(fondoT, tit, nom);

    // Monedas del jugador (arriba a la derecha de la tarjeta).
    let monedas = cargarProgreso().monedas;
    const mon = new Container(); mon.position.set(w / 2 - 70, -300);
    const mi = moneda(13); mi.position.set(-20, 0);
    const mt = txtBorde(fmt(monedas), 22, 0xffd92e); mt.anchor.set(0, 0.5); mt.position.set(-2, 0);
    mon.addChild(mi, mt); t.addChild(mon);

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
    const pers = PERSONAJE.rocio; // Fran 17-10: de momento solo habla Rocío (el resto no tiene retrato)
    const av = busto(pers, 42, 84); av.position.set(-w / 2 + 66, 66); // de pie sobre el borde de abajo del bocadillo
    const burbuja = new Graphics().roundRect(-w / 2 + 140, 38, w - 166, 112, 18).fill(0xffffff).poly([-w / 2 + 142, 62, -w / 2 + 124, 80, -w / 2 + 142, 88]).fill(0xffffff); // con pico hacia Rocío y aire entre los dos
    const nombre = txt(pers.nombre, 14, 0x2f6fde, { fontWeight: '700' }); nombre.anchor.set(0, 0.5); nombre.position.set(-w / 2 + 154, 54);
    const frase = txt(n.presenta?.texto ?? '¡A por ello, mi arma!', 16, 0x001b41, { wordWrap: true, wordWrapWidth: w - 200, align: 'left' });
    frase.anchor.set(0, 0.5); frase.position.set(-w / 2 + 154, 100);
    t.addChild(burbuja, nombre, frase, av);

    const repintar: (() => void)[] = [];
    // Tienda de potenciadores: tocar marca/desmarca; se paga al pulsar Jugar.
    const capP = txt(TEXTOS.potenciadores, 13, 0xffd92e); capP.position.set(0, 164);
    t.addChild(capP);
    const elegidos = new Set<number>();
    const inv = cargarProgreso().inv;
    // Los que tienes en el inventario no cuestan monedas.
    const coste = () => [...elegidos].reduce((s, i) => s + (inv[POTENCIADORES[i].id] > 0 ? 0 : POTENCIADORES[i].precio), 0);
    POTENCIADORES.forEach((pt, i) => {
      const c = new Container(); c.position.set((i - 1) * 118, 214);
      const fondo = new Graphics();
      const pintar = () => {
        const on = elegidos.has(i), llega = on || inv[pt.id] > 0 || monedas - coste() >= pt.precio;
        fondo.clear().roundRect(-52, -36, 104, 86, 14).fill({ color: on ? 0x3cb44b : 0x001b41, alpha: on ? 0.9 : 0.6 }).stroke({ width: 3, color: on ? 0xffffff : 0x2f6fde });
        c.alpha = llega ? 1 : 0.45;
      };
      const s = new Sprite(juego.tx.bolaTex(pt.esp === 'bolaBolas' ? -1 : 0, pt.esp)); s.anchor.set(0.5); s.scale.set(0.45); s.position.set(0, -10);
      const nm = txt(pt.nombre, 12, 0xffffff); nm.position.set(0, 22);
      const pm = moneda(8); pm.position.set(-14, 39);
      const pr = txt(String(pt.precio), 13, 0xffd92e, { fontWeight: '700' }); pr.anchor.set(0, 0.5); pr.position.set(-3, 39);
      c.addChild(fondo, s, nm);
      if (inv[pt.id] > 0) { const tn = txtBorde(`×${inv[pt.id]}`, 16, 0xffffff); tn.position.set(0, 39); c.addChild(tn); } else c.addChild(pm, pr);
      pintar();
      c.eventMode = 'static'; c.cursor = 'pointer';
      c.on('pointertap', () => {
        if (elegidos.has(i)) elegidos.delete(i);
        else if (inv[pt.id] > 0 || monedas - coste() >= pt.precio) elegidos.add(i);
        else return;
        juego.au.clic();
        repintar.forEach((f) => f());
      });
      repintar.push(pintar);
      t.addChild(c);
    });

    const jugar = boton(TEXTOS.jugar, 240, 64, 0x3cb44b, () => {
      juego.au.clic();
      const esp: Especial[] = [];
      for (const i of elegidos) {
        if (usarPot(POTENCIADORES[i].id)) esp.push(POTENCIADORES[i].esp);
        else { aviso.text = '¡No te llegan las monedas, mi arma!'; aviso.alpha = 1; return; } // no se entra sin ellos en silencio
      }
      juego.irPartida(n.id, esp);
    }, 32);
    jugar.position.set(0, 318);
    const aviso = txt('', 14, 0xff8a9b); aviso.position.set(0, 276); aviso.alpha = 0; t.addChild(aviso);
    const volver = boton('‹ Mapa', 130, 44, 0x2f6fde, () => { juego.au.clic(); juego.irMapa(); }, 20);
    volver.position.set(0, 402);
    t.addChild(jugar, volver);
    this.marco.addChild(t);
    this.container.addChild(this.marco);
    // Entra con rebote.
    t.scale.set(0.6);
    void juego.tw.to(320, (v) => { t.scale.set(0.6 + 0.4 * ease.outBack(v)); t.alpha = Math.min(1, v * 3); }, ease.lineal);
  }

  layout(dh: number): void {
    this.marco.scale.set(Math.min(1, dh / 830)); // en pantallas bajas la tarjeta encoge para caber entera
    this.marco.position.set(DW / 2, dh / 2 - 30 * this.marco.scale.y);
  }
  destroy(): void { this.container.destroy({ children: true }); }
}

// ------------------------------------------------------------------ resultado (se superpone a la partida)
export function crearResultado(juego: Juego, nivel: Nivel, estado: 'ganado' | 'perdido', estrellas: number, puntos: number): Container {
  const ganado = estado === 'ganado';
  const premio = ganado ? guardarResultado(nivel.id, estrellas).monedas : 0;
  const ep = ganado ? cofrePara(nivel.id) : null;
  const raiz = new Container();
  const velo = new Graphics().rect(-1000, -1000, DW + 2000, juego.dh + 2000).fill({ color: 0x000a1f, alpha: 0.7 });
  velo.eventMode = 'static'; // traga los toques de debajo
  const c = new Container();
  const m = new Container(); // en apaisado (pantalla baja) la ventana encoge para caber entera
  m.position.set(DW / 2, juego.dh / 2);
  m.scale.set(Math.min(1, juego.dh / 580));
  m.addChild(c);
  raiz.addChild(velo, m);
  const pers = PERSONAJE.rocio; // de momento solo habla Rocío
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

  const pts = txtBorde(fmt(puntos), 40, 0xffffff); pts.position.set(0, -14);
  if (ganado) {
    const gm = new Container(); gm.position.set(0, 16);
    const mt = txtBorde(TEXTOS.monedasGanadas(premio), 16, 0xffd92e); mt.anchor.set(0, 0.5);
    const mi = moneda(9); mi.position.set(-mt.width / 2 - 4, 0); mt.position.set(-mt.width / 2 + 9, 0);
    gm.addChild(mi, mt); c.addChild(gm);
  }
  const pl = txt(TEXTOS.puntos, 14, 0xffd92e); pl.position.set(0, -44);
  c.addChild(pl, pts);

  const av = busto(pers, 30, 36); av.position.set(-140, 62); // de cuerpo, sin círculo
  const burbuja = new Graphics().roundRect(-92, 28, 254, 70, 16).fill(0xffffff).poly([-90, 48, -108, 62, -90, 70]).fill(0xffffff);
  const ft = txt(frase, 16, 0x001b41, { wordWrap: true, wordWrapWidth: 230 }); ft.position.set(35, 63);
  c.addChild(burbuja, ft, av);
  if (!ganado) {
    const sm = txt(TEXTOS.sinMovimientos, 14, 0xffffff, { wordWrap: true, wordWrapWidth: 340 }); sm.position.set(0, 120);
    c.addChild(sm);
  }

  const botones = new Container();
  botones.alpha = 0;
  const sig = nivelDe(nivel.id + 1);
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
    if (ep !== null && !raiz.destroyed) { // cofre al completar el episodio (una sola vez)
      const premioCofre = abrirCofre(ep);
      if (premioCofre) {
        c.visible = false; // que no se transparente «Nivel superado» detrás del cofre
        await mostrarCofre(juego, raiz, ep, premioCofre);
        c.visible = true;
      }
    }
    if (raiz.destroyed) return;
    await tw.to(250, (v) => { botones.alpha = v; });
  })();
  return raiz;
}
