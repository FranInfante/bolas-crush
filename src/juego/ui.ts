// Piezas de interfaz reutilizables: textos con borde, botones, avatares y progreso guardado.
import { Container, Graphics, Text } from 'pixi.js';
import type { TextStyleOptions } from 'pixi.js';
import { NIVELES_POR_EPISODIO, nivel } from '../datos/episodios.ts';
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
// ponytail: localStorage del navegador. Las monedas, potenciadores y recompensas irán a la cuenta común de Bolas (mismo
// email en Crush, Imperio y Overcooked, app de cliente): cuando exista, solo cambia esta sección.
const CLAVE = 'bolas-crush-progreso-v2';
const CLAVE_V1 = 'bolas-crush-progreso-v1'; // {estrellas, desbloqueado, monedas}: se migra y se deja intacto
const MONEDAS_INICIO = 60; // regalo de bienvenida para poder probar la tienda

export type PotId = 'sirope' | 'tarrina' | 'bolaBolas' | 'cuchara' | 'manoLibre' | 'mas5';
export const POT_IDS: PotId[] = ['sirope', 'tarrina', 'bolaBolas', 'cuchara', 'manoLibre', 'mas5'];
export type Inventario = Record<PotId, number>;
export const PRECIO: Record<PotId, number> = { sirope: 30, tarrina: 45, bolaBolas: 70, cuchara: 40, manoLibre: 50, mas5: 60 };
export const NOMBRE_POT: Record<PotId, string> = { sirope: 'Sirope', tarrina: 'Tarrina', bolaBolas: 'Bola Bolas', cuchara: 'Cuchara', manoLibre: 'Mano libre', mas5: '+5 movs' };

export interface Guardado {
  estrellas: number[];
  desbloqueado: number;
  monedas: number;
  inv: Inventario;
  regalo: { ultimo: string; dia: number }; // último día recogido (AAAA-MM-DD) y su puesto en la racha (1-7)
  cofres: number[];                         // episodios cuyo cofre ya se abrió
}

const invVacio = (): Inventario => ({ sirope: 0, tarrina: 0, bolaBolas: 0, cuchara: 0, manoLibre: 0, mas5: 0 });
const num = (x: unknown, def: number): number => (typeof x === 'number' && isFinite(x) ? x : def);

function leer(clave: string): Record<string, unknown> | null {
  try { const j = JSON.parse(localStorage.getItem(clave) ?? 'null'); return j && typeof j === 'object' ? j : null; } catch { return null; }
}

export function cargarProgreso(): Guardado {
  const v2 = leer(CLAVE);
  const j = v2 ?? leer(CLAVE_V1);
  if (!j || !Array.isArray(j.estrellas)) return { estrellas: [], desbloqueado: 1, monedas: MONEDAS_INICIO, inv: invVacio(), regalo: { ultimo: '', dia: 0 }, cofres: [] };
  const est = (j.estrellas as unknown[]).map((x) => num(x, 0));
  // Fran 17-10: cumplir el objetivo (manchas, pedido, carapinas) son 3 estrellas; sube las victorias antiguas de 1-2.
  est.forEach((e, i) => { if (e > 0 && e < 3 && nivel(i + 1).objetivo.tipo !== 'puntos') est[i] = 3; });
  let desbloqueado = Math.max(1, Math.floor(num(j.desbloqueado, 1)));
  // El v1 topaba en 15: quien había superado el último nivel ahora tiene desbloqueado el siguiente.
  if (!v2 && (est[desbloqueado - 1] ?? 0) > 0) desbloqueado++;
  const inv = invVacio();
  const ji = (j.inv ?? {}) as Record<string, unknown>;
  for (const id of POT_IDS) inv[id] = Math.max(0, num(ji[id], 0));
  const jr = (j.regalo ?? {}) as Record<string, unknown>;
  const g: Guardado = {
    estrellas: est, desbloqueado, monedas: num(j.monedas, MONEDAS_INICIO), inv,
    regalo: { ultimo: typeof jr.ultimo === 'string' ? jr.ultimo : '', dia: num(jr.dia, 0) },
    cofres: Array.isArray(j.cofres) ? (j.cofres as unknown[]).map((x) => num(x, 0)) : [],
  };
  if (!v2) guardar(g); // migración: el v1 se queda como estaba
  return g;
}

function guardar(g: Guardado): void {
  try { localStorage.setItem(CLAVE, JSON.stringify(g)); } catch { /* ignorar */ }
}


/** Primera victoria: 10 + 10 por estrella. Repetir: 5 + 10 por cada estrella que mejora el récord (sin farmeo). */
export function monedasPorGanar(estrellas: number, previas = 0): number {
  return previas <= 0 ? 10 + 10 * estrellas : 5 + 10 * Math.max(0, estrellas - previas);
}

/** Guarda el mejor resultado, suma las monedas y desbloquea el siguiente nivel (sin tope: la aventura no acaba). */
export function guardarResultado(nivelId: number, estrellas: number): { g: Guardado; monedas: number } {
  const g = cargarProgreso();
  const previas = g.estrellas[nivelId - 1] ?? 0;
  const monedas = monedasPorGanar(estrellas, previas);
  g.estrellas[nivelId - 1] = Math.max(previas, estrellas);
  g.desbloqueado = Math.max(g.desbloqueado, nivelId + 1);
  g.monedas += monedas;
  guardar(g);
  return { g, monedas };
}

export const totalEstrellas = (g: Guardado): number => g.estrellas.reduce((s, x) => s + (x || 0), 0);

/** Resta monedas si llegan; devuelve si se pudo pagar. */
export function gastarMonedas(n: number): boolean {
  const g = cargarProgreso();
  if (g.monedas < n) return false;
  g.monedas -= n;
  guardar(g);
  return true;
}

/** ¿Se puede usar este potenciador? (hay en el inventario o llegan las monedas) */
export function puedePot(id: PotId): boolean {
  const g = cargarProgreso();
  return g.inv[id] > 0 || g.monedas >= PRECIO[id];
}

/** Gasta uno del inventario o, si no hay, lo paga con monedas. Devuelve de dónde salió o null si no pudo. */
export function usarPot(id: PotId): 'inventario' | 'monedas' | null {
  const g = cargarProgreso();
  if (g.inv[id] > 0) { g.inv[id]--; guardar(g); return 'inventario'; }
  if (g.monedas >= PRECIO[id]) { g.monedas -= PRECIO[id]; guardar(g); return 'monedas'; }
  return null;
}

function premiar(monedas: number, pots: PotId[]): void {
  const g = cargarProgreso();
  g.monedas += monedas;
  for (const p of pots) g.inv[p]++;
  guardar(g);
}

// ---- regalo diario con racha
export const REGALO_MONEDAS = [20, 30, 40, 50, 60, 80, 100];
const hoyStr = (): string => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD en hora local
const diaN = (s: string): number => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };

/** Día de la racha (1-7) que toca recoger hoy, o null si ya se recogió. Saltarse un día reinicia a 1. */
export function regaloPendiente(): number | null {
  const { ultimo, dia } = cargarProgreso().regalo;
  const hoy = hoyStr();
  if (ultimo === hoy) return null;
  return ultimo && diaN(hoy) - diaN(ultimo) === 1 ? (dia % 7) + 1 : 1;
}

/** Recoge el regalo de hoy: el día 7 trae además 1 de cada potenciador. */
export function recogerRegalo(): { dia: number; monedas: number; pots: PotId[] } | null {
  const dia = regaloPendiente();
  if (dia === null) return null;
  const monedas = REGALO_MONEDAS[dia - 1];
  const pots = dia === 7 ? [...POT_IDS] : [];
  premiar(monedas, pots);
  const g = cargarProgreso();
  g.regalo = { ultimo: hoyStr(), dia };
  guardar(g);
  return { dia, monedas, pots };
}

// ---- cofre al completar cada episodio
export const COFRE_MONEDAS = 150;

/** Episodio (1, 2…) cuyo cofre toca al ganar este nivel, o null (no es el último del episodio o ya se abrió). */
export function cofrePara(nivelId: number): number | null {
  if (nivelId % NIVELES_POR_EPISODIO !== 0) return null;
  const ep = nivelId / NIVELES_POR_EPISODIO;
  return cargarProgreso().cofres.includes(ep) ? null : ep;
}

/** Abre el cofre del episodio (una sola vez): 150 monedas + 2 potenciadores al azar. */
export function abrirCofre(ep: number): { monedas: number; pots: PotId[] } | null {
  if (cargarProgreso().cofres.includes(ep)) return null;
  const pots: PotId[] = [0, 1].map(() => POT_IDS[Math.floor(Math.random() * POT_IDS.length)]);
  premiar(COFRE_MONEDAS, pots);
  const g = cargarProgreso();
  g.cofres.push(ep);
  guardar(g);
  return { monedas: COFRE_MONEDAS, pots };
}

/** Moneda dibujada (dorada con la B de Bolas). */
export function moneda(r: number): Container {
  const c = new Container();
  c.addChild(new Graphics().circle(0, 0, r).fill(0xffc21a).stroke({ width: Math.max(2, r * 0.18), color: 0x9a5b00 }));
  const b = txt('B', r * 1.2, 0x9a5b00, { fontWeight: '900' });
  c.addChild(b);
  return c;
}
