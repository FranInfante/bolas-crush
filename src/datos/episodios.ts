// Episodios y niveles infinitos. Episodio = 15 niveles = una tienda real de Bolas (CONTEXTO-BOLAS-REAL.md §1).
// Los niveles 1-15 son EPISODIO_1 (a mano); del 16 en adelante los genera datos/generador.ts, siempre igual para el mismo id.
import type { Nivel } from '../motor/tipos.ts';
import { EQUIPO } from './equipo.ts';
import { EPISODIO_1 } from './niveles.ts';
import { esDificilPos, generarNivel, NIVELES_POR_EPISODIO, posicionDe } from './generador.ts';

export interface Episodio { n: number; nombre: string; tienda: string; quien: string } // quien = id de personaje de datos/equipo.ts

export { NIVELES_POR_EPISODIO };

const TIENDAS: { nombre: string; tienda: string }[] = [
  { nombre: EPISODIO_1.nombre, tienda: EPISODIO_1.tienda },
  { nombre: 'Orfila', tienda: 'Orfila, 1' },
  { nombre: 'Feria', tienda: 'Feria, 39' },
  { nombre: 'Triana', tienda: 'Castilla, 4' },
  { nombre: 'Jimios', tienda: 'Jimios, 2' },
  { nombre: 'Mojarra', tienda: 'Avenida de la Mojarra (solo verano)' },
  { nombre: 'Obrador', tienda: 'Obrador' },
  { nombre: 'Eventos', tienda: 'Eventos' },
];

/** Episodio al que pertenece un nivel (id ≥ 1). Pasadas las 8 tiendas se repiten como «Temporada 2», «Temporada 3»… */
export function episodioDe(id: number): Episodio {
  const n = Math.floor((Math.max(1, id) - 1) / NIVELES_POR_EPISODIO) + 1;
  const t = TIENDAS[(n - 1) % TIENDAS.length], temporada = Math.floor((n - 1) / TIENDAS.length) + 1;
  return {
    n,
    nombre: temporada === 1 ? t.nombre : `${t.nombre} (Temporada ${temporada})`,
    tienda: t.tienda,
    quien: EQUIPO[(n - 1) % EQUIPO.length].id,
  };
}

const cache = new Map<number, Nivel>();

/** Nivel por id (≥ 1). 1-15 = EPISODIO_1 tal cual; >15 generado y determinista. */
export function nivel(id: number): Nivel {
  if (id >= 1 && id <= EPISODIO_1.niveles.length) return EPISODIO_1.niveles[id - 1];
  let n = cache.get(id);
  if (!n) { n = generarNivel(id, episodioDe(id)); cache.set(id, n); }
  return n;
}

/** Niveles difíciles: posiciones 5, 10 y 15 de cada episodio (dientes de sierra de Candy Crush). */
export const esDificil = (id: number): boolean => esDificilPos(posicionDe(id));
