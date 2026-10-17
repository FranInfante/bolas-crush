// Todo el arte se dibuja por código y se hornea una sola vez en texturas (generateTexture).
import { Container, Graphics, Rectangle, Sprite } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';
import type { Ficha, Especial } from '../motor/tipos.ts';
import { iconoTex } from './iconos.ts';
import { SABORES } from '../datos/sabores.ts';

export const TEX = 96;      // lado de las texturas de bola
export const CELDA = 64;    // lado lógico de una casilla
const R = 36;
const hex = (s: string): number => parseInt(s.slice(1), 16);

function azarFijo(semilla: number): () => number {
  let a = (semilla * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arco suelto: sin el moveTo, Pixi lo une con una línea al punto anterior. */
function arco(g: Graphics, x: number, y: number, r: number, a0: number, a1: number, estilo: { width: number; color: number; alpha?: number }): void {
  g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r).arc(x, y, r, a0, a1).stroke(estilo);
}

/** Rectángulo girado (para virutas, trocitos y chispas). */
function rect(g: Graphics, x: number, y: number, w: number, h: number, ang: number, color: number, alpha = 1): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const p = [[-w, -h], [w, -h], [w, h], [-w, h]].flatMap(([px, py]) => [x + px * ca - py * sa, y + px * sa + py * ca]);
  g.poly(p).fill({ color, alpha });
}

function hsv(h: number, s: number, v: number): number {
  const f = (n: number) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return (Math.round(f(5) * 255) << 16) | (Math.round(f(3) * 255) << 8) | Math.round(f(1) * 255);
}

function sombra(c: Container, cx: number, cy: number, r: number): void {
  const g = new Graphics();
  for (let i = 0; i < 4; i++) g.ellipse(cx, cy + r * 0.9, r * (1 - i * 0.1), r * (0.26 - i * 0.04)).fill({ color: 0x000000, alpha: 0.1 });
  c.addChild(g);
}

function brillo(g: Graphics, cx: number, cy: number, r: number): void {
  g.ellipse(cx - r * 0.36, cy - r * 0.46, r * 0.3, r * 0.17).fill({ color: 0xffffff, alpha: 0.75 });
  g.circle(cx - r * 0.62, cy - r * 0.16, r * 0.06).fill({ color: 0xffffff, alpha: 0.6 });
  g.circle(cx + r * 0.38, cy + r * 0.52, r * 0.07).fill({ color: 0xffffff, alpha: 0.28 });
}

/** Bola de helado con textura propia por sabor. */
function bola(g: Graphics, cx: number, cy: number, r: number, sabor: number): void {
  const s = SABORES[sabor];
  const col = hex(s.color), cl = hex(s.colorClaro), co = hex(s.colorOscuro);
  g.circle(cx, cy, r).fill(co);
  g.circle(cx - r * 0.04, cy - r * 0.07, r * 0.93).fill(col);
  g.circle(cx - r * 0.2, cy - r * 0.26, r * 0.6).fill({ color: cl, alpha: 0.4 });
  const az = azarFijo(sabor + 11);
  const dentro = (m: number): [number, number] => {
    for (;;) {
      const x = (az() * 2 - 1) * r * m, y = (az() * 2 - 1) * r * m;
      if (x * x + y * y < (r * m) ** 2) return [cx + x, cy + y];
    }
  };
  switch (sabor) {
    case 0: // fresa: pepitas
      for (let i = 0; i < 16; i++) {
        const [x, y] = dentro(0.82);
        g.ellipse(x, y, 1.6, 2.4).fill({ color: 0xffe9a8, alpha: 0.9 });
        g.circle(x + 0.5, y + 0.5, 0.7).fill({ color: co, alpha: 0.5 });
      }
      break;
    case 1: // mango: remolinos y tropezones
      for (let i = 0; i < 4; i++) { const [x, y] = dentro(0.55); arco(g, x, y, 6 + az() * 5, az() * 6, az() * 6 + 2.4, { width: 2.6, color: cl, alpha: 0.55 }); }
      for (let i = 0; i < 7; i++) { const [x, y] = dentro(0.8); g.circle(x, y, 2.4).fill({ color: co, alpha: 0.35 }); }
      break;
    case 2: // limón: tiras de piel y rocío
      for (let i = 0; i < 5; i++) { const [x, y] = dentro(0.7); arco(g, x, y, 5 + az() * 4, az() * 6, az() * 6 + 1.8, { width: 2, color: 0xfff7b8, alpha: 0.7 }); }
      for (let i = 0; i < 6; i++) { const [x, y] = dentro(0.8); g.circle(x, y, 1.3).fill({ color: 0xffffff, alpha: 0.6 }); }
      break;
    case 3: // pistacho: trocitos
      for (let i = 0; i < 14; i++) { const [x, y] = dentro(0.82); rect(g, x, y, 2.6, 1.7, az() * 3, i % 3 ? co : 0xd8c98a, 0.9); }
      break;
    case 4: // chocolate: virutas
      for (let i = 0; i < 12; i++) { const [x, y] = dentro(0.82); rect(g, x, y, 4, 1.3, az() * 3, i % 2 ? cl : 0x2e1709, 0.85); }
      break;
    default: // mora: bolitas de fruto
      for (let i = 0; i < 9; i++) {
        const [x, y] = dentro(0.78);
        g.circle(x, y, 3.6).fill({ color: co, alpha: 0.55 });
        g.circle(x - 1, y - 1, 1.2).fill({ color: cl, alpha: 0.8 });
      }
  }
  brillo(g, cx, cy, r);
}

/** Franja de sirope recortada al círculo: un trapecio con el ancho de la cuerda en cada borde. */
function banda(g: Graphics, cx: number, cy: number, r: number, d: number, h: number, horizontal: boolean): void {
  const w = (o: number) => Math.sqrt(Math.max(0, r * r - o * o)) * 0.96;
  const a = d - h / 2, b = d + h / 2;
  const pts = horizontal
    ? [cx - w(a), cy + a, cx + w(a), cy + a, cx + w(b), cy + b, cx - w(b), cy + b]
    : [cx + a, cy - w(a), cx + b, cy - w(b), cx + b, cy + w(b), cx + a, cy + w(a)];
  g.poly(pts).fill({ color: 0xffffff, alpha: 0.92 });
}

export class Texturas {
  private cache = new Map<string, Texture>();
  readonly blanca: Texture;
  private renderer: Renderer;
  private logo: Texture | null;

  constructor(renderer: Renderer, logo: Texture | null) {
    this.renderer = renderer;
    this.logo = logo;
    this.blanca = this.gen('blanca', 32, (c) => { c.addChild(new Graphics().circle(16, 16, 15).fill(0xffffff)); });
  }

  private gen(clave: string, lado: number, dibujar: (c: Container) => void): Texture {
    let t = this.cache.get(clave);
    if (!t) {
      const c = new Container();
      dibujar(c);
      t = this.renderer.generateTexture({ target: c, frame: new Rectangle(0, 0, lado, lado), resolution: 2, antialias: true });
      c.destroy({ children: true });
      this.cache.set(clave, t);
    }
    return t;
  }

  ficha(f: Pick<Ficha, 'tipo' | 'sabor' | 'especial'>): Texture {
    return f.tipo === 'carapina' ? this.carapina() : this.bolaTex(f.sabor, f.especial);
  }

  bolaTex(sabor: number, esp: Especial): Texture {
    if (esp === 'bolaBolas') return this.bolaBolas();
    if (esp === 'sacabolas') return this.gen(`b${sabor}sacabolas`, TEX, (c) => this.dibujarSacabolas(c, sabor));
    return this.gen(`b${sabor}${esp}`, TEX, (c) => {
      const cx = TEX / 2;
      if (esp === 'tarrina') {
        sombra(c, cx, 62, 30);
        const g = new Graphics();
        bola(g, cx, 36, 28, sabor);
        const s = SABORES[sabor], co = hex(s.colorOscuro), cl = hex(s.colorClaro);
        g.poly([15, 54, 81, 54, 70, 90, 26, 90]).fill(0xfff3dc).stroke({ width: 3, color: co, join: 'round' });
        for (const x of [30, 39, 48, 57, 66]) g.moveTo(15 + (x - 15) * 0.9 + 3, 58).lineTo(26 + (x - 26) * 0.95 + 1, 88).stroke({ width: 1.2, color: co, alpha: 0.25 });
        g.roundRect(12, 50, 72, 9, 4).fill(cl).stroke({ width: 2.5, color: co });
        c.addChild(g);
        return;
      }
      sombra(c, cx, 46, R);
      const g = new Graphics();
      bola(g, cx, 46, R, sabor);
      if (esp === 'rayaH' || esp === 'rayaV') for (const d of [-R * 0.5, 0, R * 0.5]) banda(g, cx, 46, R, d, 8, esp === 'rayaH');
      c.addChild(g);
    });
  }

  /** Bola con dos alas de barquillo (waffle) y una cucharita de helado delante: el «avioncito» de Bolas. */
  private dibujarSacabolas(c: Container, sabor: number): void {
    const ut = iconoTex('sacabolas');
    if (ut) { // bola del sabor con el sacabolas 3D delante
      sombra(c, TEX / 2, 46, R);
      const g = new Graphics(); bola(g, TEX / 2, 46, R, sabor); c.addChild(g);
      const s = new Sprite(ut); s.anchor.set(0.5); s.scale.set(84 / Math.max(ut.width, ut.height)); s.position.set(TEX / 2 + 6, 52); // grande: se tiene que ver de un vistazo
      c.addChild(s);
      return;
    }
    const cx = TEX / 2, cy = 50, r = 25;
    sombra(c, cx, cy, r + 6);
    const g = new Graphics();
    const ala = (d: number) => { // d = -1 izquierda, +1 derecha
      const X = (x: number) => cx + d * x;
      g.poly([X(18), cy - 6, X(46), cy - 30, X(47), cy + 4, X(20), cy + 12]).fill(0xe9b765).stroke({ width: 2.5, color: 0x9c6a24, join: 'round' });
      for (const t of [0.3, 0.6]) g.moveTo(X(18 + 28 * t), cy - 6 - 24 * t).lineTo(X(20 + 27 * t), cy + 12 - 8 * t).stroke({ width: 1.5, color: 0x9c6a24, alpha: 0.7 });
      for (const t of [0.25, 0.5, 0.75]) g.moveTo(X(18 + 5 * t), cy - 6 + 18 * t).lineTo(X(46 + t), cy - 30 + 34 * t).stroke({ width: 1.5, color: 0x9c6a24, alpha: 0.5 });
    };
    ala(-1); ala(1);
    bola(g, cx, cy, r, sabor);
    // Cucharita de helado plateada cruzando la bola en diagonal.
    const el = (x: number, y: number, rx: number, ry: number, ang: number): number[] => Array.from({ length: 24 }, (_, i) => {
      const t = (i / 24) * Math.PI * 2, px = Math.cos(t) * rx, py = Math.sin(t) * ry;
      return [x + px * Math.cos(ang) - py * Math.sin(ang), y + px * Math.sin(ang) + py * Math.cos(ang)];
    }).flat();
    g.moveTo(cx - 26, cy + 30).lineTo(cx + 12, cy - 8).stroke({ width: 9, color: 0x3d4753, cap: 'round' });
    g.moveTo(cx - 26, cy + 30).lineTo(cx + 12, cy - 8).stroke({ width: 5, color: 0xdfe5eb, cap: 'round' });
    g.poly(el(cx + 19, cy - 15, 15, 10.5, -Math.PI / 4)).fill(0xe3e9ef).stroke({ width: 2.8, color: 0x3d4753, join: 'round' });
    g.poly(el(cx + 17, cy - 17, 8, 4.5, -Math.PI / 4)).fill({ color: 0xffffff, alpha: 0.85 });
    c.addChild(g);
  }

  /** Pala (cuchara) de heladero de lado, con el cuenco lleno a `nivel` de 0 a 3. */
  pala(nivel: number): Texture {
    const n = Math.max(0, Math.min(3, Math.round(nivel)));
    return this.gen(`pala${n}`, CELDA, (c) => {
      const g = new Graphics();
      const metal = 0xc3ccd6, borde = 0x56636f, cx = 29, cy = 33, r = 19;
      g.moveTo(42, 46).lineTo(57, 58).stroke({ width: 9, color: borde, cap: 'round' }); // mango corto inclinado
      g.moveTo(42, 46).lineTo(57, 58).stroke({ width: 5.5, color: 0xe8edf2, cap: 'round' });
      g.ellipse(cx, cy, r, 6).fill(0x3d4753); // interior del cuenco
      const rosa = 0xffb3d1, claro = 0xffd3e4;
      if (n === 1) g.ellipse(cx, cy + 1, r - 2, 4.5).fill(rosa);
      if (n === 2) { g.ellipse(cx, cy, r - 1, 6).fill(rosa); g.ellipse(cx, cy - 3, r - 4, 6).fill(claro); }
      if (n === 3) { g.circle(cx, cy - 3, 16).fill(rosa); g.circle(cx - 2, cy - 5, 13).fill(claro); }
      // Frente del cuenco: media esfera metálica.
      const pts: number[] = [];
      for (let i = 0; i <= 16; i++) { const t = (i / 16) * Math.PI; pts.push(cx + Math.cos(t) * r, cy + Math.sin(t) * (r - 1)); }
      g.poly(pts).fill(metal).stroke({ width: 2.4, color: borde, join: 'round' });
      g.ellipse(cx - 8, cy + 8, 6, 3.2).fill({ color: 0xffffff, alpha: 0.75 });
      g.ellipse(cx + 8, cy + 12, 5, 2).fill({ color: 0x56636f, alpha: 0.25 });
      if (n === 3) {
        g.ellipse(cx - 7, cy - 12, 5, 2.8).fill({ color: 0xffffff, alpha: 0.85 });
        g.roundRect(cx + 8, cy - 2, 5, 11, 2.5).fill(rosa); g.circle(cx + 10.5, cy + 9, 3.2).fill(rosa); // goterones por el borde
        g.roundRect(cx - 14, cy - 2, 4, 7, 2).fill(rosa); g.circle(cx - 12, cy + 5, 2.4).fill(rosa);
      }
      for (let i = 0; i < 3; i++) g.circle(10 + i * 9, 59, 2.6).fill(i < n ? 0xff4f8b : 0x3d4753).stroke({ width: 1, color: 0xffffff, alpha: 0.8 }); // contador
      c.addChild(g);
    });
  }

  bolaBolas(): Texture {
    return this.gen('bb', TEX, (c) => {
      const cx = TEX / 2, cy = 46;
      sombra(c, cx, cy, R);
      const g = new Graphics();
      g.circle(cx, cy, R).fill(0x1b2a6b);
      // Facetas de bola de discoteca, de colores del arcoíris.
      for (let y = -R; y < R; y += 8) for (let x = -R; x < R; x += 8) {
        if (Math.hypot(x + 4, y + 4) > R - 2) continue;
        g.roundRect(cx + x + 0.6, cy + y + 0.6, 6.8, 6.8, 1.5).fill(hsv(((x + y + 100) / 90) % 1, 0.55, 1));
      }
      g.circle(cx, cy, R).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
      c.addChild(g);
      if (this.logo) {
        const fondo = new Graphics().circle(cx, cy, 19).fill({ color: 0xffffff, alpha: 0.95 }).stroke({ width: 2, color: 0x001b41 });
        const l = new Sprite(this.logo);
        l.anchor.set(0.5);
        l.scale.set(Math.min(30 / l.texture.width, 30 / l.texture.height));
        l.position.set(cx, cy);
        c.addChild(fondo, l);
      }
      const b = new Graphics();
      brillo(b, cx, cy, R);
      for (const [x, y] of [[62, 28], [30, 66], [66, 60]]) b.poly([x, y - 5, x + 1.5, y - 1.5, x + 5, y, x + 1.5, y + 1.5, x, y + 5, x - 1.5, y + 1.5, x - 5, y, x - 1.5, y - 1.5]).fill(0xffffff);
      c.addChild(b);
    });
  }

  carapina(): Texture {
    return this.gen('carapina', TEX, (c) => {
      sombra(c, 48, 62, 30);
      const g = new Graphics();
      arco(g, 48, 36, 29, Math.PI * 1.08, Math.PI * 1.92, { width: 3.5, color: 0x8a96a3 });
      g.poly([20, 38, 76, 38, 68, 86, 28, 86]).fill(0xa9b5c1).stroke({ width: 2, color: 0x5d6b7a, join: 'round' });
      g.poly([24, 40, 36, 40, 34, 85, 30, 85]).fill({ color: 0xffffff, alpha: 0.45 });
      g.poly([62, 40, 74, 40, 67, 85, 61, 85]).fill({ color: 0x5d6b7a, alpha: 0.35 });
      for (const y of [52, 68]) g.moveTo(22 + (y - 38) * 0.17, y).lineTo(74 - (y - 38) * 0.17, y).stroke({ width: 1.5, color: 0x5d6b7a, alpha: 0.6 });
      g.ellipse(48, 38, 28, 7).fill(0x6b7886).stroke({ width: 2, color: 0x5d6b7a });
      // Montoncito de carapinas de colores asomando.
      const az = azarFijo(5);
      const cols = [0xe8344e, 0xffd92e, 0x5bbf3b, 0x2f6fde, 0xff8a1f, 0xffffff];
      for (let i = 0; i < 26; i++) {
        const x = 26 + az() * 44, y = 38 - az() * 8 - (1 - Math.abs(x - 48) / 22) * 6;
        rect(g, x, y, 3.2, 1.2, az() * 3.14, cols[i % cols.length]);
      }
      c.addChild(g);
    });
  }

  candado(): Texture {
    return this.gen('candado', 40, (c) => {
      const g = new Graphics();
      arco(g, 20, 17, 8, Math.PI, 0, { width: 4, color: 0xb8860b });
      g.roundRect(7, 16, 26, 20, 5).fill(0xffc83d).stroke({ width: 2, color: 0xb8860b });
      g.roundRect(10, 18, 8, 14, 3).fill({ color: 0xffffff, alpha: 0.35 });
      g.circle(20, 24, 3).fill(0x6b4a00);
      g.poly([18.5, 25, 21.5, 25, 22.5, 31, 17.5, 31]).fill(0x6b4a00);
      c.addChild(g);
    });
  }

  /** Gelatina rosa que cubre toda la casilla: 2 capas = más opaca y con borde más marcado. */
  mancha(capas: 1 | 2 = 1): Texture {
    return this.gen(`man${capas}`, CELDA, (c) => {
      const g = new Graphics();
      const dos = capas === 2;
      g.roundRect(1, 1, 62, 62, 12).fill({ color: 0xff4f8b, alpha: dos ? 0.78 : 0.5 }).stroke({ width: dos ? 4 : 2, color: dos ? 0xd81b60 : 0xff9ec1, alpha: dos ? 1 : 0.9 });
      g.roundRect(7, 7, 50, 50, 9).fill({ color: 0xff8fb5, alpha: dos ? 0.45 : 0.25 });
      g.ellipse(20, 15, 12, 5).fill({ color: 0xffffff, alpha: 0.55 });
      g.circle(51, 50, 3).fill({ color: 0xffffff, alpha: 0.4 });
      c.addChild(g);
    });
  }

  escarcha(capas: 1 | 2): Texture {
    return this.gen(`esc${capas}`, CELDA, (c) => {
      const g = new Graphics();
      g.roundRect(2, 2, 60, 60, 11).fill({ color: capas === 2 ? 0x7cc6f2 : 0xbfe9ff, alpha: capas === 2 ? 0.97 : 0.85 }).stroke({ width: capas === 2 ? 5 : 2.5, color: 0xffffff, alpha: 0.9 });
      if (capas === 2) g.roundRect(10, 10, 44, 44, 8).fill({ color: 0xa6dcfa, alpha: 0.9 });
      g.poly([6, 14, 22, 6, 12, 22]).fill({ color: 0xffffff, alpha: 0.5 });
      g.moveTo(34, 8).lineTo(28, 26).lineTo(40, 36).lineTo(32, 56).stroke({ width: 1.8, color: 0xffffff, alpha: 0.85, join: 'round' });
      g.moveTo(28, 26).lineTo(12, 34).stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
      g.moveTo(40, 36).lineTo(54, 30).stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
      c.addChild(g);
    });
  }
}

/** Estrella de 5 puntas (para la barra, el resultado y el mapa). */
export function estrella(g: Graphics, x: number, y: number, r: number, color: number, borde = 0x7a4a00): Graphics {
  const p: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.47 : r;
    p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return g.poly(p).fill(color).stroke({ width: Math.max(1.5, r * 0.1), color: borde, join: 'round' });
}
