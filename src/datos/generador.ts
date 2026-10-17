// Generador de niveles infinitos (ids > 15). Determinista: mismo id = mismo nivel, siempre.
// Forma (biblioteca de plantillas simétricas + espejo) → bloqueadores → objetivo → movimientos y estrellas.
// Los números de FORMULA salen de scripts/calibrar.ts (bot voraz): ver la tabla al final de este fichero.
import type { Nivel, Objetivo } from '../motor/tipos.ts';
import { crearAzar } from '../motor/azar.ts';
import type { Azar } from '../motor/azar.ts';
import { EQUIPO } from './equipo.ts';
import { SABORES } from './sabores.ts';
import type { Episodio } from './episodios.ts';

export const NIVELES_POR_EPISODIO = 15;
/** Primer nivel generado que puede traer palas de helado. */
export const PALAS_DESDE = 40;

/** Posición dentro del episodio (1-15). Las 5, 10 y 15 son las difíciles (dientes de sierra de Candy Crush). */
export const posicionDe = (id: number): number => ((id - 1) % NIVELES_POR_EPISODIO) + 1;
export const esDificilPos = (pos: number): boolean => pos % 5 === 0;

/** Tasa de victoria que debe tener el bot en este nivel: dientes de sierra, bajando ~1 punto por episodio (mínimo 35 %). */
export function tasaMeta(id: number): number {
  const pos = posicionDe(id), ep = Math.floor((id - 1) / NIVELES_POR_EPISODIO);
  const base = pos <= 4 ? 0.80 : pos === 5 ? 0.55 : pos <= 9 ? 0.72 : pos === 10 ? 0.50 : pos <= 14 ? 0.66 : 0.42;
  return Math.max(0.35, base - 0.01 * ep);
}

// ------------------------------------------------------------------ plantillas (simétricas de izquierda a derecha)
export const PLANTILLAS: string[][] = [
  ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'], // cuadrado sin esquinas
  ['....o....', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '....o....'], // diamante
  ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'], // mostrador ancho
  ['ooo...ooo', 'ooo...ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.ooooooo.'], // dos torres
  ['..oooo..', '.oooooo.', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', '.oooooo.', '..oooo..'], // octógono
  ['..ooooo..', '..ooooo..', 'ooooooooo', 'ooooooooo', 'ooooooooo', '..ooooo..', '..ooooo..'], // cruz gruesa
  ['ooooooooo', '.ooooooo.', '..ooooo..', '..ooooo..', '..ooooo..', '.ooooooo.', 'ooooooooo'], // reloj de arena
  ['ooooooooo', 'ooooooooo', 'oo.....oo', 'oo.....oo', 'oo.....oo', 'ooooooooo', 'ooooooooo'], // marco
  ['ooooooooo', 'ooooooooo', 'ooo.o.ooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'], // ventanitas
  ['....o....', '...ooo...', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo'], // pirámide
  ['ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo'], // cuadrado 7x7
  ['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'], // cuadrado 8x8
  ['.oo...oo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '...ooo...'], // corazón
  ['ooooooooo', 'oo.ooo.oo', 'ooooooooo', 'oo.ooo.oo', 'ooooooooo', 'ooooooooo'], // dos huecos
  ['ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'], // barco
  ['ooooooooo', 'ooooooooo', '..ooooo..', '..ooooo..', '..ooooo..', '..ooooo..'], // T
  ['..ooo..', '.ooooo.', 'ooooooo', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..'], // hexágono
  ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'], // cuadrado 9x7 sin esquinas
];

// ------------------------------------------------------------------ utilidades de tablero
type Rejilla = string[][];
const aFilas = (g: Rejilla): string[] => g.map((f) => f.join(''));
const existe = (g: Rejilla, f: number, c: number): boolean => (g[f]?.[c] ?? '.') !== '.';
/** Última fila existente de la columna c (-1 si no hay). */
const fondo = (g: Rejilla, c: number): number => { for (let f = g.length - 1; f >= 0; f--) if (existe(g, f, c)) return f; return -1; };
const celdasDe = (g: Rejilla, c: number): number => g.filter((_, f) => existe(g, f, c)).length;

/** Columnas elegidas de la mitad izquierda y su espejo. */
function columnasSimetricas(g: Rejilla, azar: Azar, pares: number, valida: (c: number) => boolean): number[] {
  const ancho = g[0].length;
  const mitad = Array.from({ length: Math.floor(ancho / 2) }, (_, c) => c).filter(valida);
  const elegidas = azar.barajar(mitad).slice(0, pares);
  return [...new Set(elegidas.flatMap((c) => [c, ancho - 1 - c]))];
}

/** Fracción de celdas con las 4 vecinas dentro del tablero (los marcos y los tableros con huecos tienen poca). */
const compacidad = (g: Rejilla): number => {
  let todas = 0, dentro = 0;
  g.forEach((fila, f) => fila.forEach((_, c) => { if (!existe(g, f, c)) return; todas++; if ([[-1, 0], [1, 0], [0, -1], [0, 1]].every(([a, b]) => existe(g, f + a, c + b))) dentro++; }));
  return dentro / todas;
};

// ------------------------------------------------------------------ características (también las usa el calibrador)
export interface Caracteristicas {
  celdas: number;
  /** Capas de mancha. */
  capas: number;
  /** Capas de escarcha. */
  escarcha: number;
  candados: number;
  carapinas: number;
  /** Palas de helado: cada una aporta una carapina más (y la fila de arriba no cae). */
  palas: number;
  porSalir: number;
  /** Carapinas iniciales: suma de las celdas que tienen debajo en su columna. */
  prof: number;
  /** Bolas del pedido (suma). */
  pedido: number;
  sabores: number;
  filas: number;
}

export function caracteristicas(n: Pick<Nivel, 'forma' | 'sabores' | 'objetivo' | 'carapinasPorSalir'>): Caracteristicas {
  const todo = n.forma.join('');
  const cuenta = (re: RegExp) => (todo.match(re) ?? []).length;
  return {
    celdas: cuenta(/[^.]/g),
    capas: cuenta(/[mK]/g) + 2 * cuenta(/M/g),
    escarcha: cuenta(/e/g) + 2 * cuenta(/E/g),
    candados: cuenta(/[kK]/g),
    carapinas: cuenta(/c/g),
    palas: cuenta(/p/g),
    porSalir: n.carapinasPorSalir ?? 0,
    prof: n.forma.reduce((s, fila, f) => s + [...fila].reduce((t, ch, c) => t + (ch === 'c' ? n.forma.filter((x, g) => g > f && x[c] !== '.').length : 0), 0), 0),
    pedido: n.objetivo.tipo === 'pedido' ? n.objetivo.pedido.reduce((s, x) => s + x.n, 0) : 0,
    sabores: n.sabores,
    filas: n.forma.length,
  };
}

// ------------------------------------------------------------------ FORMULA (ajustada con el bot; ver la tabla al final del fichero)
export const FORMULA = {
  /**
   * Movimientos con los que el bot gana el 80 % (mínimos cuadrados sobre ~100 niveles generados, n = 30 partidas por punto):
   *  manchas   = a + b·capas + c·capas·(6 sabores)
   *  pedido    = a + b·bolas + c·(6 sabores) + d·celdas
   *  carapinas = a + b·(carapinas + por salir) + c·(6 sabores)
   */
  manchas: { a: 9, b: 0.076, c: 0.231 },
  pedido: { a: 15.8, b: 0.113, c: 8.5, d: -0.184 },
  carapinas: { a: 13, b: 3.9, c: 16 },
  /** Extra de movimientos por capa de escarcha y por candado. */
  escarcha: 0.5,
  candado: 0.5,
  /** Movimientos / movimientos al 80 % según la tasa: puntos (tasa, factor) por tipo, interpolados. */
  factor: {
    manchas: [[0.5, 0.68], [0.65, 0.8], [0.8, 1]],
    pedido: [[0.5, 0.74], [0.65, 0.87], [0.8, 1]],
    carapinas: [[0.5, 0.625], [0.65, 0.81], [0.8, 1]],
  } as Record<string, [number, number][]>,
  /** Niveles de puntos: p50 ≈ a·M^0,9·e^(0,03·(celdas-49)); a por nº de sabores. */
  puntosA: { 5: 2137, 6: 904 } as Record<number, number>,
  /** z = Φ⁻¹(1 - tasa) de la normal: puntos (tasa, z). La dispersión de los puntos del bot es σ ≈ 0,33 en log. */
  z: [[0.2, 0.84], [0.28, 0.58], [0.42, 0.2], [0.5, 0], [0.65, -0.385], [0.8, -0.84]] as [number, number][],
  sigma: 0.33,
  /** Puntos por movimiento en niveles de objetivo (solo informativo: cumplir el objetivo da 3 estrellas). */
  ppm: { 5: 1400, 6: 800 } as Record<number, number>,
};

const redondea = (x: number, paso: number): number => Math.max(paso, Math.round(x / paso) * paso);
/** Interpolación lineal por una tabla (x, y) ordenada por x; fuera del rango se prolonga la pendiente del extremo. */
function interpola(tabla: [number, number][], x: number): number {
  let i = tabla.findIndex(([tx]) => tx >= x);
  if (i < 1) i = i === 0 ? 1 : tabla.length - 1;
  const [x0, y0] = tabla[i - 1], [x1, y1] = tabla[i];
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

/** Movimientos y estrellas a partir de las características: con la FORMULA ajustada, la tasa del bot ronda `meta`. */
export function ajustar(c: Caracteristicas, tipo: Objetivo['tipo'], meta: number, id = 0): { movimientos: number; estrellas: [number, number, number] } {
  const F = FORMULA;
  const extra = F.escarcha * c.escarcha + F.candado * c.candados;
  const seis = c.sabores === 6 ? 1 : 0;
  let movimientos: number;
  if (tipo === 'puntos') {
    // Los niveles de puntos se juegan enteros: M fijo (18, 20 o 22) y la estrella 1 sale del cuantil de los puntos del bot.
    movimientos = 18 + 2 * (id % 3);
    const p50 = (F.puntosA[c.sabores] ?? F.puntosA[5]) * movimientos ** 0.9 * Math.exp(0.03 * (c.celdas - 49));
    const e0 = p50 * Math.exp(F.sigma * interpola(F.z, meta));
    const est: [number, number, number] = [redondea(e0, 100), redondea(Math.max(p50 * 1.3, e0 * 1.15), 100), redondea(Math.max(p50 * 1.7, e0 * 1.4), 100)];
    return { movimientos, estrellas: est };
  }
  let m80: number;
  if (tipo === 'manchas') m80 = F.manchas.a + F.manchas.b * c.capas + F.manchas.c * c.capas * seis + extra;
  else if (tipo === 'pedido') m80 = F.pedido.a + F.pedido.b * c.pedido + F.pedido.c * seis + F.pedido.d * c.celdas + extra;
  else m80 = F.carapinas.a + F.carapinas.b * (c.carapinas + c.porSalir + 1.8 * c.palas) + F.carapinas.c * seis + extra;
  movimientos = Math.max(6, Math.round(m80 * Math.max(0.3, interpola(F.factor[tipo], meta))));
  // Tope de dureza en pedidos (nivel 50: 66 bolas en 46 celdas y 11 movimientos → bot 13 %): el bot junta ~0,1·celdas bolas por movimiento, y la escarcha le cuesta ~un movimiento por capa.
  // Manchas: nunca menos de 10 movimientos (nivel 87: 15 capas en 8 → bot 20 %).
  if (tipo === 'manchas') movimientos = Math.max(movimientos, 10);
  if (tipo === 'pedido') movimientos = Math.max(movimientos, Math.ceil(c.pedido / (0.1 * c.celdas) + c.escarcha));
  const esperado = (F.ppm[c.sabores] ?? F.ppm[5]) * movimientos;
  const est: [number, number, number] = [redondea(esperado * 0.4, 100), redondea(esperado * 0.95, 100), redondea(esperado * 1.4, 100)];
  return { movimientos, estrellas: est };
}

// ------------------------------------------------------------------ textos
const NOMBRES: Record<Objetivo['tipo'], string[]> = {
  puntos: ['Hora punta', 'Cola hasta la puerta', 'Tarde de calor', 'Día de reparto', 'Sábado de locos', 'Terraza llena'],
  manchas: ['Mostrador pringao', 'A fregar el mostrador', 'Manchas de la tarde', 'Limpieza a fondo', 'Mostrador de rayas', 'Se ha caído un cucurucho'],
  pedido: ['Pedido grande', 'La clienta exigente', 'Encargo para una boda', 'Pedido de la terraza', 'Cumpleaños en la tienda', 'Pedido del hotel'],
  carapinas: ['Carapinas al congelador', 'Lluvia de carapinas', 'Hay que guardar las carapinas', 'Carapinas por bajar', 'Fin de caja', 'Reposición de carapinas'],
};

const lista = (xs: string[]): string => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

function texto(azar: Azar, obj: Objetivo, c: Caracteristicas, e0: number): string {
  let t: string;
  if (obj.tipo === 'puntos') {
    const p = e0.toLocaleString('es-ES');
    t = azar.elegir([
      `Hoy hay cola hasta la puerta: junta ${p} puntos, mi arma.`,
      `Que no pare el mostrador, quillo. Hasta ${p} puntos.`,
      `Venga, ${p} puntos y nos vamos a casa.`,
    ]);
  } else if (obj.tipo === 'manchas') {
    t = azar.elegir([
      'Mira cómo ha quedao el mostrador. A limpiar las manchas, todas.',
      'Illo, que esto está pringao. Elimina las bolas de encima y se limpia.',
      'Ni una mancha, que viene la inspección.',
    ]);
  } else if (obj.tipo === 'pedido') {
    const partes = obj.pedido.map((x) => `${x.n} de ${SABORES[x.sabor].nombre.toLowerCase()}`);
    t = azar.elegir([
      `Pedido para una clienta: ${lista(partes)}. Pa'lante.`,
      `Mi arma, hay un encargo: ${lista(partes)}.`,
      `Hoy toca servir ${lista(partes)}, sin fallar.`,
    ]);
  } else {
    const n = obj.n;
    const cuantas = `${n} carapina${n === 1 ? '' : 's'}`;
    t = azar.elegir([
      `Baja ${cuantas} al congelador, quillo.`,
      `Hay que guardar ${cuantas}: limpia lo que tengan debajo.`,
      `A por ${cuantas} para el congelador y a otra cosa.`,
    ]);
  }
  if (c.escarcha > 0) t += ' Ojo con la escarcha de abajo.';
  else if (c.candados > 0) t += ' Los candaos se abren con un match.';
  return t;
}

// ------------------------------------------------------------------ generador
const TIPOS: Objetivo['tipo'][] = ['manchas', 'pedido', 'puntos', 'carapinas'];

/** Nivel generado para el id (>15). `ep` es el episodio al que pertenece (decide el presentador de los difíciles). */
export function generarNivel(id: number, ep: Episodio): Nivel {
  const azar = crearAzar((Math.imul(id, 2654435761) ^ 0x9e3779b9) >>> 0);
  const pos = posicionDe(id), episodio = Math.floor((id - 1) / NIVELES_POR_EPISODIO);
  const meta = tasaMeta(id);
  const dificil = esDificilPos(pos);
  // Dureza 0..1: sube despacio con el id y da un salto en los niveles difíciles.
  const h = Math.min(1, Math.min(1, (id - 15) / 300) + (dificil ? 0.25 : 0));
  const tipo = TIPOS[(id + episodio) % TIPOS.length];
  // Con 6 sabores el bot sufre mucho en carapinas: ahí salen menos.
  const sabores = azar.siguiente() < (tipo === 'carapinas' ? 0.05 + 0.2 * h : 0.2 + 0.5 * h) ? 6 : 5;

  // --- forma
  // Carapinas: tablero alto y con la fila de abajo ancha (≥ 5 celdas), si no, las salidas son casi imposibles de limpiar.
  const variantes = PLANTILLAS.flatMap((p) => [p, [...p].reverse()]);
  // Puntos: sin marcos ni tableros con huecos (compacidad < 0,3): el bot saca la mitad de puntos de lo que dice la fórmula (nivel 74: 3 %).
  const posibles = tipo === 'carapinas' ? variantes.filter((p) => p.length >= 6 && [...p[p.length - 1]].filter((x) => x === 'o').length >= 5)
    : tipo === 'puntos' ? variantes.filter((p) => compacidad(p.map((f) => [...f])) >= 0.3) : variantes;
  const plantilla = azar.elegir(posibles);
  const g: Rejilla = plantilla.map((f) => [...f]);
  const ancho = g[0].length, alto = g.length;

  let carapinasPorSalir = 0, palas = 0;
  let objetivo: Objetivo = { tipo: 'puntos' };

  if (tipo === 'carapinas') {
    // Palas de helado (desde el nivel ~40, la mitad de los niveles): las carapinas vienen de ellas, así que hay menos iniciales.
    const conPalas = id >= PALAS_DESDE && ancho >= 8 && azar.siguiente() < 0.5;
    const nIni = conPalas ? 1 + (azar.siguiente() < 0.4 ? 1 : 0) : 2 + (azar.siguiente() < 0.3 + 0.5 * h ? 1 : 0);
    carapinasPorSalir = !conPalas && h > 0.35 ? azar.entero(1 + Math.round(2 * h)) : 0;
    const cols = columnasSimetricas(g, azar, Math.ceil(nIni / 2), (c) => celdasDe(g, c) >= 5 && c >= 2).slice(0, nIni);
    if (!cols.length) cols.push(Math.floor(ancho / 2));
    for (const c of cols) {
      const filas = g.map((_, f) => f).filter((f) => existe(g, f, c));
      g[filas[1 + azar.entero(2)]][c] = 'c';
    }
    if (conPalas) {
      // Pala en la primera casilla de la columna (nada encima), con una casilla normal debajo y un vecino al lado donde dar el match.
      const aptas = (c: number) => { const f = g.findIndex((_, i) => existe(g, i, c)); return !cols.includes(c) && celdasDe(g, c) >= 5 && g[f][c] === 'o' && g[f + 1]?.[c] === 'o' && (existe(g, f, c - 1) || existe(g, f, c + 1)); };
      const pc = columnasSimetricas(g, azar, 1, aptas).filter(aptas).slice(0, 1 + azar.entero(2));
      for (const c of pc) g[g.findIndex((_, i) => existe(g, i, c))][c] = 'p';
      palas = pc.length;
    }
    const colsS = carapinasPorSalir || palas ? Array.from({ length: ancho }, (_, c) => c) : cols;
    for (const c of colsS) { const f = fondo(g, c); if (f >= 0 && g[f][c] === 'o') g[f][c] = 's'; }
    objetivo = { tipo: 'carapinas', n: cols.length + carapinasPorSalir + palas };
  } else {
    // Escarcha: abajo del todo de la columna.
    if (azar.siguiente() < 0.2 + 0.4 * h) {
      const pares = 1 + azar.entero(1 + Math.round(2 * h));
      for (const c of columnasSimetricas(g, azar, pares, (c2) => celdasDe(g, c2) >= 5)) g[fondo(g, c)][c] = azar.siguiente() < 0.8 * h ? 'E' : 'e';
    }
    // Candados: en la celda de más abajo de la columna.
    if (azar.siguiente() < 0.2 + 0.3 * h) {
      const pares = 1 + azar.entero(1 + Math.round(2 * h));
      for (const c of columnasSimetricas(g, azar, pares, (c2) => g[fondo(g, c2)]?.[c2] === 'o' && celdasDe(g, c2) >= 5)) g[fondo(g, c)][c] = 'k';
    }
    if (tipo === 'manchas') {
      // Se manchan las celdas de menor «puntuación»: bloque central, anillo, franjas o mitad de arriba.
      const cx = (ancho - 1) / 2, cy = (alto - 1) / 2;
      const patron = azar.entero(4);
      const R = (0.35 + 0.25 * azar.siguiente()) * Math.min(ancho, alto);
      const cand: { f: number; c: number; s: number }[] = [];
      for (let f = 0; f < alto; f++) for (let c = 0; c < ancho; c++) {
        if (g[f][c] !== 'o' && g[f][c] !== 'k') continue;
        // Solo celdas con las 4 vecinas dentro del tablero: las manchas del borde son muy duras para el bot (y para casi todos).
        if (![[-1, 0], [1, 0], [0, -1], [0, 1]].every(([df, dc]) => existe(g, f + df, c + dc))) continue;
        const d = Math.hypot(c - cx, f - cy);
        const s = patron === 0 ? Math.max(Math.abs(c - cx) / ancho, Math.abs(f - cy) / alto) * 10
          : patron === 1 ? Math.abs(d - R)
          : patron === 2 ? (f % 2) * 100 + d
          : f + 0.2 * d; // mitad de arriba
        cand.push({ f, c, s: s + azar.siguiente() * 0.8 });
      }
      cand.sort((a, b) => a.s - b.s);
      const cobertura = 0.5 + 0.4 * h + 0.1 * azar.siguiente();
      const k = Math.min(cand.length, Math.max(6, Math.round(cobertura * (cand.length + 14))));
      const dobles = Math.round((0.1 + 0.5 * h) * k);
      cand.slice(0, k).forEach((x, i) => {
        g[x.f][x.c] = g[x.f][x.c] === 'k' ? 'K' : i < dobles && patron !== 2 ? 'M' : 'm';
      });
      objetivo = { tipo: 'manchas' };
    } else if (tipo === 'pedido') {
      const k = 2 + (h > 0.35 && azar.siguiente() < 0.6 ? 1 : 0) + (h > 0.7 && azar.siguiente() < 0.5 ? 1 : 0);
      const elegidos = azar.barajar(Array.from({ length: sabores }, (_, i) => i)).slice(0, k).sort((a, b) => a - b);
      // Bolas por sabor: las que hacen falta para que, con la FORMULA, el nivel pida ~11-20 movimientos al 80 % (más tablero = más bolas).
      const objetivoM80 = 11 + 7 * h + 2 * azar.siguiente();
      const F = FORMULA, celdas = g.join('').replace(/[,.]/g, '').length, seis = sabores === 6 ? 1 : 0;
      const total = (objetivoM80 - F.pedido.a - F.pedido.c * seis - F.pedido.d * celdas) / F.pedido.b;
      const n = Math.max(10, Math.min(40, Math.round(total / k)));
      objetivo = { tipo: 'pedido', pedido: elegidos.map((s) => ({ sabor: s, n })) };
    }
  }

  const forma = aFilas(g);
  const car = caracteristicas({ forma, sabores, objetivo, carapinasPorSalir });
  const { movimientos, estrellas } = ajustar(car, tipo, meta, id);
  const nivel: Nivel = {
    id,
    nombre: NOMBRES[tipo][(id + azar.entero(3)) % NOMBRES[tipo].length],
    forma, sabores, movimientos, objetivo, estrellas,
    semilla: 1000 + id,
  };
  if (carapinasPorSalir) nivel.carapinasPorSalir = carapinasPorSalir;
  // Presentador: el del episodio en los difíciles y cada tercer nivel; el resto rota por el equipo.
  const quien = dificil || id % 3 === 0 ? ep.quien : EQUIPO[(id + episodio) % EQUIPO.length].id;
  nivel.presenta = { quien, texto: texto(azar, objetivo, car, estrellas[0]) };
  return nivel;
}

// ------------------------------------------------------------------ validación con el bot (node scripts/calibrar.ts --desde=16 --hasta=75 --n=60)
// Resultado final: ~16 de 30 niveles dentro de ±12 puntos de su meta en los ids 46-75 (13-21 de 30 en el 16-45 según la pasada).
// Flojos: pedido (curva muy empinada: 1 movimiento = ~10 puntos) y manchas (manda dónde caen, no cuántas son); carapinas con 6 sabores.
// id | tipo      | mov | meta | bot
// 46 | pedido    |  13 | 77 % | 53 %
// 51 | puntos    |  18 | 69 % | 60 %
// 52 | carapinas |  21 | 69 % | 77 %
// 53 | manchas   |  14 | 69 % | 58 %
// 55 | puntos    |  20 | 47 % | 35 %
// 62 | puntos    |  22 | 76 % | 83 %
// 63 | carapinas |  20 | 76 % | 78 %
// 65 | pedido    |  15 | 51 % | 60 %
// 67 | carapinas |  18 | 68 % | 70 %
// 75 | carapinas |  14 | 38 % | 37 %
// Fuera de ±12: 50 (pedido 52 % → 7 %), 57 (manchas 63 % → 33 %), 60 (carapinas 39 % → 8 %), 74 (puntos 62 % → 2 %, 6 sabores y pocas celdas).
//
// Segunda pasada (17-10, con sacabolas y palas; ids 40-100, n = 60 partidas): peor nivel 42 % (antes 50: 7-13 %, 74: 2 %, 57: 33 %, 60: 8 %).
// Antes → después (peores): 50 pedido 13 % → 50 % (tope: bolas ≤ 0,1·celdas por movimiento + 1 por capa de escarcha) · 74 puntos 3 % → fuera
// (sin plantillas con compacidad < 0,3: marco y «dos huecos») · 87 manchas 20 % → 50 % (mínimo 10 movimientos) · 99 pedido 20 % → 42 % ·
// 45 carapinas con 2 palas en tablero de 7 de ancho 17-28 % → sin palas (solo en tableros de 8+ de ancho). Ningún nivel de 40-100 bajo 40 %.
// Palas: desde el nivel 40, la mitad de los de carapinas (1 pala, a veces 2, en la fila de arriba) y menos 'c' iniciales; objetivo.n = c + palas + por salir.
