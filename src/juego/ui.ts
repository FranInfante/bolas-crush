// Piezas de interfaz reutilizables: textos con borde, botones, avatares y progreso guardado.
import { Container, Graphics, Text } from 'pixi.js';
import type { TextStyleOptions } from 'pixi.js';
import { EPISODIO_1 } from '../datos/niveles.ts';
import type { Personaje } from '../datos/equipo.ts';

export const DW = 450; // ancho lógico de todas las pantallas
export const FUENTE = 'Fredoka, "Trebuchet MS", sans-serif';

export function txt(s: string, size: number, fill: number | string = 0xffffff, extra: TextStyleOptions = {}): Text {
  const t = new Text({ text: s, style: { fontFamily: FUENTE, fontSize: size, fontWeight: '600', fill, align: 'center', ...extra } });
  t.anchor.set(0.5);
  return t;
}

/** Texto grande con borde oscuro (jaleos, títulos). */
export function txtBorde(s: string, size: number, fill: number | string = 0xffd92e, borde = 0x001b41): Text {
  return txt(s, size, fill, { fontWeight: '700', stroke: { color: borde, width: Math.max(4, size / 6), join: 'round' }, dropShadow: { color: 0x000000, alpha: 0.35, distance: 4, blur: 2, angle: Math.PI / 2 } });
}

export function boton(texto: string, w: number, h: number, color: number, alPulsar: () => void, size = 26): Container {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(-w / 2, -h / 2 + 5, w, h, h / 2).fill({ color: 0x000000, alpha: 0.35 });
  g.roundRect(-w / 2, -h / 2, w, h, h / 2).fill(color).stroke({ width: 3, color: 0xffffff, alpha: 0.85 });
  g.roundRect(-w / 2 + 10, -h / 2 + 5, w - 20, h / 3, h / 6).fill({ color: 0xffffff, alpha: 0.28 });
  c.addChild(g, txtBorde(texto, size, 0xffffff, 0x00112b));
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.on('pointerdown', () => c.scale.set(0.94));
  c.on('pointerupoutside', () => c.scale.set(1));
  c.on('pointerup', () => c.scale.set(1));
  c.on('pointertap', alPulsar);
  return c;
}

/** Avatar del equipo: círculo de su color con la inicial (no hay retratos). */
export function avatar(p: Personaje, r: number): Container {
  const c = new Container();
  c.addChild(
    new Graphics().circle(0, 3, r).fill({ color: 0x000000, alpha: 0.3 }).circle(0, 0, r).fill(parseInt(p.color.slice(1), 16)).stroke({ width: 4, color: 0xffffff }),
    new Graphics().ellipse(-r * 0.3, -r * 0.45, r * 0.3, r * 0.15).fill({ color: 0xffffff, alpha: 0.35 }),
    txtBorde(p.nombre[0], r * 1.1, 0xffffff, 0x1a1a2e),
  );
  return c;
}

export function panel(w: number, h: number, alfa = 0.55): Graphics {
  return new Graphics().roundRect(-w / 2, -h / 2, w, h, 22).fill({ color: 0x001b41, alpha: alfa }).stroke({ width: 3, color: 0xffffff, alpha: 0.35 });
}

export const fmt = (n: number): string => Math.round(n).toLocaleString('es-ES');

// ---------------------------------------------------------------- progreso guardado
// ponytail: localStorage del navegador. Las monedas y recompensas irán a la cuenta común de Bolas (mismo email en
// Crush, Imperio y Overcooked, app de cliente): cuando exista, solo cambia esta sección.
const CLAVE = 'bolas-crush-progreso-v1';
export interface Guardado { estrellas: number[]; desbloqueado: number; monedas: number }
const total = EPISODIO_1.niveles.length;
const MONEDAS_INICIO = 60; // regalo de bienvenida para poder probar la tienda

export function cargarProgreso(): Guardado {
  try {
    const j = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    if (j && Array.isArray(j.estrellas) && typeof j.desbloqueado === 'number') {
      return { estrellas: j.estrellas, desbloqueado: Math.min(total, Math.max(1, j.desbloqueado)), monedas: typeof j.monedas === 'number' ? j.monedas : MONEDAS_INICIO };
    }
  } catch { /* sin almacenamiento o datos rotos */ }
  return { estrellas: [], desbloqueado: 1, monedas: MONEDAS_INICIO };
}

function guardar(g: Guardado): void {
  try { localStorage.setItem(CLAVE, JSON.stringify(g)); } catch { /* ignorar */ }
}

/** Monedas por ganar un nivel: 10 + 10 por estrella. */
export const monedasPorGanar = (estrellas: number): number => 10 + 10 * estrellas;

/** Guarda el mejor resultado, suma las monedas y desbloquea el siguiente nivel. */
export function guardarResultado(nivelId: number, estrellas: number): Guardado {
  const g = cargarProgreso();
  g.estrellas[nivelId - 1] = Math.max(g.estrellas[nivelId - 1] ?? 0, estrellas);
  g.desbloqueado = Math.max(g.desbloqueado, Math.min(total, nivelId + 1));
  g.monedas += monedasPorGanar(estrellas);
  guardar(g);
  return g;
}

/** Resta monedas si llegan; devuelve si se pudo pagar. */
export function gastarMonedas(n: number): boolean {
  const g = cargarProgreso();
  if (g.monedas < n) return false;
  g.monedas -= n;
  guardar(g);
  return true;
}

/** Moneda dibujada (dorada con la B de Bolas). */
export function moneda(r: number): Container {
  const c = new Container();
  c.addChild(new Graphics().circle(0, 0, r).fill(0xffc21a).stroke({ width: Math.max(2, r * 0.18), color: 0x9a5b00 }));
  const b = txt('B', r * 1.2, 0x9a5b00, { fontWeight: '900' });
  c.addChild(b);
  return c;
}
