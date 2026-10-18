// Pantallas de enganche: regalo diario con racha, cofre del episodio y oferta de +5 movimientos.
import { Container, Graphics, Sprite } from 'pixi.js';
import type { Juego } from './app.ts';
import { ease } from './tween.ts';
import { boton, cargarProgreso, DW, moneda, NOMBRE_POT, panel, PRECIO, recogerRegalo, REGALO_MONEDAS, txt, txtBorde, usarPot } from './ui.ts';
import type { PotId } from './ui.ts';
import { EXTRA } from './textos-extra.ts';
import { iconoTex } from './iconos.ts';

/** Icono de un potenciador, de unos 56 px. Los tres previos usan la bola real del tablero. */
export function iconoPot(juego: Juego, id: PotId): Container {
  const c = new Container();
  if (id === 'sirope' || id === 'tarrina' || id === 'bolaBolas') {
    const esp = id === 'sirope' ? 'rayaH' : id;
    const s = new Sprite(juego.tx.bolaTex(id === 'bolaBolas' ? -1 : 0, esp));
    s.anchor.set(0.5); s.scale.set(0.45);
    c.addChild(s);
  } else if ((id === 'cuchara' || id === 'manoLibre') && iconoTex(id)) {
    const s = new Sprite(iconoTex(id)); s.anchor.set(0.5);
    s.scale.set((id === 'cuchara' ? 54 : 48) / (id === 'cuchara' ? s.texture.width : s.texture.height));
    c.addChild(s);
  } else if (id === 'cuchara') {
    const g = new Graphics();
    g.roundRect(-3.5, 2, 7, 26, 3.5).fill(0xc9d3e3).stroke({ width: 2, color: 0x5a6a8a });
    g.ellipse(0, -9, 13, 17).fill(0xe6ecf5).stroke({ width: 2.5, color: 0x5a6a8a });
    g.ellipse(-4, -13, 4, 7).fill({ color: 0xffffff, alpha: 0.7 });
    g.rotation = 0.5;
    c.addChild(g);
  } else if (id === 'manoLibre') {
    const g = new Graphics();
    const piel = 0xffc9a0, borde = 0x9a5b30;
    for (let i = 0; i < 4; i++) g.roundRect(-14 + i * 7.5, -26 + (i === 1 || i === 2 ? -4 : 0), 6.5, 26, 3).fill(piel).stroke({ width: 1.5, color: borde });
    g.roundRect(-17, -4, 34, 26, 11).fill(piel).stroke({ width: 2, color: borde });
    g.roundRect(-26, -2, 12, 7, 3.5).fill(piel).stroke({ width: 1.5, color: borde });
    c.addChild(g);
  } else if (iconoTex('mas5')) {
    const s = new Sprite(iconoTex('mas5')); s.anchor.set(0.5); s.scale.set(52 / s.texture.width);
    c.addChild(s, txtBorde('+5', 24, 0xffffff, 0x00112b));
  } else {
    c.addChild(new Graphics().circle(0, 0, 25).fill(0x2f6fde).stroke({ width: 3.5, color: 0xffffff }), txtBorde('+5', 24, 0xffffff, 0x00112b));
  }
  return c;
}

/** Velo oscuro que traga los toques + contenedor central. */
function modal(juego: Juego): { raiz: Container; c: Container } {
  const raiz = new Container();
  const velo = new Graphics().rect(-1000, -1000, DW + 2000, juego.dh + 2000).fill({ color: 0x000a1f, alpha: 0.78 });
  velo.eventMode = 'static';
  const c = new Container();
  const m = new Container(); // en apaisado (pantalla baja) la ventana encoge para caber entera
  m.position.set(DW / 2, juego.dh / 2);
  m.scale.set(Math.min(1, juego.dh / 580));
  m.addChild(c);
  raiz.addChild(velo, m);
  return { raiz, c };
}

const entrada = (juego: Juego, c: Container): void => {
  c.scale.set(0.6);
  void juego.tw.to(320, (v) => { c.scale.set(0.6 + 0.4 * ease.outBack(v)); c.alpha = Math.min(1, v * 3); });
};

/** Lluvia de monedas desde (x0,y0) hasta (x1,y1), en coordenadas de `capa`. */
function volarMonedas(juego: Juego, capa: Container, n: number, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  const hechos: Promise<void>[] = [];
  for (let i = 0; i < n; i++) {
    const m = moneda(11);
    m.position.set(x0, y0);
    capa.addChild(m);
    const dx = (Math.random() - 0.5) * 120, dy = -40 - Math.random() * 60;
    hechos.push(juego.tw.to(650, (t) => {
      const u = ease.inOutQuad(t);
      m.x = x0 + dx * Math.sin(t * Math.PI) + (x1 - x0) * u;
      m.y = y0 + dy * Math.sin(t * Math.PI) + (y1 - y0) * u;
      m.scale.set(1 - 0.35 * t);
    }, ease.lineal, i * 55).then(() => { juego.au.campanita(i % 3); m.destroy(); }));
  }
  return Promise.all(hechos).then(() => undefined);
}

// ------------------------------------------------------------------ regalo diario
export function ventanaRegalo(juego: Juego, dia: number, alCerrar: () => void): Container {
  const { raiz, c } = modal(juego);
  c.addChild(panel(400, 450, 0.9));
  const tit = txtBorde(EXTRA.regaloTitulo, 36, 0xffd92e); tit.position.set(0, -190);
  const sub = txt(EXTRA.regaloSub, 14, 0xffffff, { wordWrap: true, wordWrapWidth: 340 }); sub.position.set(0, -150);
  c.addChild(tit, sub);

  const casillas: { x: number; y: number; w: number }[] = [];
  for (let i = 0; i < 4; i++) casillas.push({ x: (i - 1.5) * 92, y: -78, w: 84 });
  casillas.push({ x: -138, y: 30, w: 84 }, { x: -46, y: 30, w: 84 }, { x: 92, y: 30, w: 176 });
  let hoyG: Graphics | null = null;
  casillas.forEach((p, i) => {
    const d = i + 1;
    const t = new Container(); t.position.set(p.x, p.y);
    const es7 = d === 7;
    const g = new Graphics();
    const hoy = d === dia, pasado = d < dia;
    g.roundRect(-p.w / 2, -48, p.w, 96, 14).fill({ color: hoy ? 0x3a2a00 : 0x001b41, alpha: 0.85 }).stroke({ width: hoy ? 5 : 2.5, color: hoy ? 0xffd92e : es7 ? 0xff8a1f : 0x2f6fde });
    t.addChild(g);
    const n = txt(EXTRA.dia(d), 13, hoy ? 0xffd92e : 0xffffff, { fontWeight: '700' }); n.position.set(0, -32);
    const m = moneda(es7 ? 17 : 15); m.position.set(es7 ? -34 : 0, es7 ? 2 : 0);
    const q = txtBorde(String(REGALO_MONEDAS[i]), es7 ? 28 : 22, 0xffffff); q.position.set(es7 ? 14 : 0, es7 ? 2 : 32);
    t.addChild(n, m, q);
    if (es7) { const x = txt(EXTRA.racha7, 13, 0xff8a1f, { fontWeight: '700' }); x.position.set(0, 32); t.addChild(x); }
    if (pasado) { t.alpha = 0.55; t.addChild(new Graphics().poly([-13, 2, -4, 11, 14, -10]).stroke({ width: 6, color: 0x5bd35b, cap: 'round', join: 'round' })); }
    if (hoy) hoyG = g;
    c.addChild(t);
  });

  let usado = false;
  const rec = boton(EXTRA.recoger, 250, 66, 0x3cb44b, () => {
    if (usado) return;
    usado = true;
    juego.au.clic();
    const r = recogerRegalo();
    rec.eventMode = 'none';
    void (async () => {
      if (r) await volarMonedas(juego, raiz, Math.min(14, 6 + r.dia * 2), DW / 2, juego.dh / 2 + 150, 24, 31);
      await juego.tw.espera(250);
      raiz.destroy({ children: true });
      alCerrar();
    })();
  }, 32);
  rec.position.set(0, 160);
  c.addChild(rec);
  entrada(juego, c);
  juego.app.ticker.add(function latido() {
    if (raiz.destroyed) { juego.app.ticker.remove(latido); return; }
    if (hoyG) hoyG.alpha = 0.7 + Math.sin(performance.now() / 160) * 0.3;
  });
  return raiz;
}

// ------------------------------------------------------------------ cofre del episodio
/** Muestra el cofre sobre `padre`; se resuelve cuando el jugador pulsa «¡Genial!». El premio ya está guardado. */
export function mostrarCofre(juego: Juego, padre: Container, ep: number, premio: { monedas: number; pots: PotId[] }): Promise<void> {
  return new Promise((fin) => {
    const { raiz, c } = modal(juego);
    padre.addChild(raiz);
    const tit = txtBorde(EXTRA.cofreTitulo, 34, 0xffd92e); tit.position.set(0, -230);
    tit.scale.set(Math.min(1, 380 / tit.width));
    const sub = txt(EXTRA.episodio(ep), 18, 0xffffff); sub.position.set(0, -192);
    const rayos = new Graphics();
    rayos.alpha = 0;
    for (let i = 0; i < 12; i++) rayos.poly([0, 0, Math.cos(i * 0.5236 - 0.12) * 260, Math.sin(i * 0.5236 - 0.12) * 260, Math.cos(i * 0.5236 + 0.12) * 260, Math.sin(i * 0.5236 + 0.12) * 260]).fill({ color: 0xffe9a0, alpha: 0.22 });
    rayos.position.set(0, -20);

    const cofre = new Container(); cofre.position.set(0, 10);
    const cuerpo = new Graphics();
    cuerpo.roundRect(-75, -10, 150, 100, 12).fill(0x9a5a28).stroke({ width: 5, color: 0x4a2a10 });
    cuerpo.rect(-75, 20, 150, 10).fill({ color: 0x000000, alpha: 0.18 });
    cuerpo.roundRect(-14, -10, 28, 100, 3).fill(0xffc21a).stroke({ width: 3, color: 0x9a5b00 });
    const tapa = new Container(); tapa.position.set(-75, -10);
    tapa.addChild(new Graphics().roundRect(0, -52, 150, 52, 20).fill(0xb06a30).stroke({ width: 5, color: 0x4a2a10 }).roundRect(62, -52, 26, 52, 3).fill(0xffc21a).stroke({ width: 3, color: 0x9a5b00 }));
    const cerradura = new Graphics().circle(75, -2, 14).fill(0xffd92e).stroke({ width: 4, color: 0x9a5b00 }).roundRect(72, -4, 6, 12, 2).fill(0x4a2a10);
    cofre.addChild(rayos, cuerpo, tapa, cerradura);
    const aviso = txt(EXTRA.cofreAbrir, 20, 0xffffff); aviso.position.set(0, 140);

    c.addChild(tit, sub, cofre, aviso);
    entrada(juego, c);
    // Se menea hasta que se toca.
    let abierto = false;
    const meneo = (t: { deltaMS: number }) => {
      if (abierto || cofre.destroyed) { juego.app.ticker.remove(meneo); return; }
      cofre.rotation = Math.sin(performance.now() / 110) * 0.05;
      aviso.alpha = 0.6 + Math.sin(performance.now() / 200) * 0.4;
      void t;
    };
    juego.app.ticker.add(meneo);
    cofre.eventMode = 'static'; cofre.cursor = 'pointer';
    cofre.hitArea = { contains: (x: number, y: number) => Math.abs(x) < 90 && y > -70 && y < 100 };
    cofre.on('pointertap', () => {
      if (abierto) return;
      abierto = true;
      cofre.rotation = 0;
      aviso.visible = false;
      juego.au.fanfarria();
      void (async () => {
        await juego.tw.to(380, (v) => { tapa.rotation = -0.85 * ease.outBack(v); cerradura.alpha = 1 - v; });
        void juego.tw.to(300, (v) => { rayos.alpha = v; });
        juego.app.ticker.add(function gira(t) { if (rayos.destroyed) { juego.app.ticker.remove(gira); return; } rayos.rotation += t.deltaMS / 2500; });
        await volarMonedas(juego, c, 10, 0, -10, 0, -130);
        // Premio: monedas y los dos potenciadores.
        const fila = new Container(); fila.position.set(0, 150); c.addChild(fila);
        const mt = new Container(); const mi = moneda(15); const mq = txtBorde(`+${premio.monedas}`, 34, 0xffd92e); mq.anchor.set(0, 0.5);
        mq.position.set(18, 0); mi.position.set(-6, 0); mt.addChild(mi, mq); mt.position.set(-mq.width / 2 + 6, -32); fila.addChild(mt);
        premio.pots.forEach((id, i) => {
          const x = (i - 0.5) * 130;
          const ic = iconoPot(juego, id); ic.position.set(x, 24);
          const nm = txt(NOMBRE_POT[id], 13, 0xffffff); nm.position.set(x, 62);
          fila.addChild(ic, nm);
          ic.scale.set(0.01); void juego.tw.to(380, (v) => ic.scale.set(Math.max(0.01, ease.outBack(v))), ease.lineal, 150 + i * 200);
        });
        juego.au.campanita(1);
        await juego.tw.espera(700);
        const ok = boton(EXTRA.genial, 220, 58, 0x3cb44b, () => { juego.au.clic(); raiz.destroy({ children: true }); fin(); }, 28);
        ok.position.set(0, 255); c.addChild(ok);
      })();
    });
  });
}

// ------------------------------------------------------------------ oferta «¿5 movimientos más?»
/** Resuelve true si acepta y paga (con un +5 del inventario o con monedas). */
export function ofertaMas5(juego: Juego, padre: Container): Promise<boolean> {
  return new Promise((fin) => {
    const { raiz, c } = modal(juego);
    padre.addChild(raiz);
    c.addChild(panel(380, 360, 0.9));
    const tit = txtBorde(EXTRA.ofertaTitulo, 34, 0xffd92e); tit.position.set(0, -130);
    tit.scale.set(Math.min(1, 340 / tit.width));
    const ic = iconoPot(juego, 'mas5'); ic.scale.set(1.5); ic.position.set(0, -52);
    const tx = txt(EXTRA.ofertaTexto, 16, 0xffffff, { wordWrap: true, wordWrapWidth: 320 }); tx.position.set(0, 10);
    c.addChild(tit, ic, tx);

    const g = cargarProgreso();
    const gratis = g.inv.mas5 > 0, llega = gratis || g.monedas >= PRECIO.mas5;
    const si = boton(EXTRA.ofertaSi(gratis, PRECIO.mas5), 280, 60, 0x3cb44b, () => {
      if (!llega) return;
      if (usarPot('mas5')) { juego.au.clic(); raiz.destroy({ children: true }); fin(true); }
    }, 24);
    si.position.set(0, 76);
    if (!gratis) { // moneda junto al precio
      const m = moneda(11); m.position.set(70, 76 - 1); si.addChild(m);
    }
    if (!llega) { si.alpha = 0.4; si.eventMode = 'none'; }
    const no = boton(EXTRA.ofertaNo, 200, 46, 0x2f6fde, () => { juego.au.clic(); raiz.destroy({ children: true }); fin(false); }, 20);
    no.position.set(0, 140);
    c.addChild(si, no);
    if (gratis) { const t = txt(`Tienes ${g.inv.mas5}`, 12, 0xffd92e); t.position.set(0, 108); c.addChild(t); }
    else if (!llega) { const t = txt(`Te faltan ${PRECIO.mas5 - g.monedas} monedas`, 12, 0xff8a9b); t.position.set(0, 108); c.addChild(t); }
    entrada(juego, c);
  });
}
